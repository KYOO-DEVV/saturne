//! Pages YouTube supplémentaires : suite des résultats (continuation), playlists, radio.

use crate::yt::{self, Track};
use serde_json::{Value, json};

/// Clé et version du client web de YouTube, lues dans la page (nécessaires pour demander la suite d'une liste).
pub struct Cfg {
    pub key: String,
    pub ver: String,
}

fn between(html: &str, start: &str) -> Option<String> {
    let i = html.find(start)? + start.len();
    let rest = &html[i..];
    Some(rest[..rest.find('"')?].to_string())
}

pub fn cfg(html: &str) -> Option<Cfg> {
    Some(Cfg { key: between(html, "\"INNERTUBE_API_KEY\":\"")?, ver: between(html, "\"INNERTUBE_CONTEXT_CLIENT_VERSION\":\"")? })
}

/// Jeton de la page suivante, s'il y en a une.
pub fn continuation_token(data: &Value) -> Option<String> {
    let mut token = None;
    yt::walk(data, &mut |o| {
        if token.is_some() {
            return;
        }
        if let Some(t) = o.get("continuationItemRenderer").and_then(|c| c.pointer("/continuationEndpoint/continuationCommand/token")).and_then(Value::as_str) {
            token = Some(t.to_string());
        } else if let Some(c) = o.get("continuationItemViewModel") {
            // Nouvelle mise en page des playlists : le jeton est quelque part sous « continuationCommand ».
            yt::walk(c, &mut |x| {
                if token.is_none() {
                    if let Some(t) = x.pointer("/continuationCommand/token").and_then(Value::as_str) {
                        token = Some(t.to_string());
                    }
                }
            });
        }
    });
    token
}

pub fn valid_key(k: &str) -> bool {
    (20..=60).contains(&k.len()) && k.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}
pub fn valid_ver(v: &str) -> bool {
    (3..=30).contains(&v.len()) && v.chars().all(|c| c.is_ascii_digit() || c == '.')
}
pub fn valid_token(t: &str) -> bool {
    (10..=4000).contains(&t.len()) && t.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '%' | '=' | '+' | '/' | '.' | '-'))
}

/// Demande la page suivante d'une recherche (`search`) ou d'une playlist (`browse`).
pub async fn next_page(client: &reqwest::Client, endpoint: &str, cfg: &Cfg, gl: &str, token: &str) -> Result<Value, String> {
    let body = json!({"context": {"client": {"clientName": "WEB", "clientVersion": cfg.ver, "hl": "fr", "gl": gl}}, "continuation": token});
    let url = format!("https://www.youtube.com/youtubei/v1/{endpoint}?key={}&prettyPrint=false", cfg.key);
    let resp = client.post(url).header("Content-Type", "application/json").body(body.to_string()).send().await.map_err(|e| format!("Connexion à YouTube impossible ({e})"))?;
    if !resp.status().is_success() {
        return Err(format!("YouTube a répondu {}", resp.status()));
    }
    let text = resp.text().await.map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| format!("Réponse YouTube illisible ({e})"))
}

fn text(v: Option<&Value>) -> String {
    let Some(v) = v else { return String::new() };
    if let Some(s) = v.get("simpleText").and_then(Value::as_str) {
        return s.to_string();
    }
    v.get("runs").and_then(Value::as_array).map(|a| a.iter().filter_map(|r| r.get("text").and_then(Value::as_str)).collect()).unwrap_or_default()
}

fn byline(v: Option<&Value>) -> (String, String) {
    let first = v.and_then(|b| b.get("runs")).and_then(|r| r.get(0));
    let name = first.and_then(|r| r.get("text")).and_then(Value::as_str).unwrap_or("").trim_end_matches(" - Topic").to_string();
    let id = first.and_then(|r| r.pointer("/navigationEndpoint/browseEndpoint/browseId")).and_then(Value::as_str).unwrap_or("").to_string();
    (name, id)
}

/// Titres d'une page de playlist (`playlistVideoRenderer`). Les vidéos supprimées ou privées (sans durée) sont ignorées.
pub fn playlist_tracks(data: &Value) -> Vec<Track> {
    let mut out = Vec::new();
    yt::walk(data, &mut |o| {
        if let Some(v) = o.get("playlistVideoRenderer") {
            let Some(id) = v.get("videoId").and_then(Value::as_str) else { return };
            let dur = v.get("lengthSeconds").and_then(Value::as_str).and_then(|s| s.parse::<u32>().ok()).or_else(|| yt::parse_dur(&text(v.get("lengthText"))));
            let Some(duration) = dur.filter(|d| *d >= 20) else { return };
            let (channel, channel_id) = byline(v.get("shortBylineText"));
            out.push(Track { id: id.to_string(), title: text(v.get("title")), channel, channel_id, thumb: yt::thumb(id), duration: Some(duration), published: String::new(), age_min: None, views: 0 });
        } else if let Some(l) = o.get("lockupViewModel") {
            // Nouvelle mise en page : une vidéo est un « lockup » (identifiant, titre, durée dans un badge de la miniature).
            if l.get("contentType").and_then(Value::as_str) != Some("LOCKUP_CONTENT_TYPE_VIDEO") {
                return;
            }
            let Some(id) = l.get("contentId").and_then(Value::as_str).filter(|i| i.len() == 11) else { return };
            let Some(title) = l.pointer("/metadata/lockupMetadataViewModel/title/content").and_then(Value::as_str) else { return };
            let (mut dur, mut channel_id) = (None, String::new());
            yt::walk(l, &mut |x| {
                if dur.is_none() {
                    if let Some(t) = x.pointer("/thumbnailBadgeViewModel/text").and_then(Value::as_str).filter(|t| t.contains(':')) {
                        dur = yt::parse_dur(t);
                    }
                }
                if channel_id.is_empty() {
                    if let Some(b) = x.pointer("/browseEndpoint/browseId").and_then(Value::as_str).filter(|b| b.starts_with("UC")) {
                        channel_id = b.to_string();
                    }
                }
            });
            let Some(duration) = dur.filter(|d| *d >= 20) else { return };
            let channel = l.pointer("/metadata/lockupMetadataViewModel/metadata/contentMetadataViewModel/metadataRows/0/metadataParts/0/text/content").and_then(Value::as_str).unwrap_or("").trim_end_matches(" - Topic").to_string();
            out.push(Track { id: id.to_string(), title: title.to_string(), channel, channel_id, thumb: yt::thumb(id), duration: Some(duration), published: String::new(), age_min: None, views: 0 });
        }
    });
    out
}

pub fn playlist_title(data: &Value) -> String {
    data.pointer("/metadata/playlistMetadataRenderer/title").and_then(Value::as_str).unwrap_or("").to_string()
}

pub fn playlist_owner(data: &Value) -> String {
    let mut owner = String::new();
    yt::walk(data, &mut |o| {
        if owner.is_empty() {
            if let Some(r) = o.pointer("/playlistHeaderRenderer/ownerText") {
                owner = text(Some(r));
            }
        }
    });
    owner
}

/// Titres du « mix » d'une vidéo (`playlistPanelVideoRenderer`).
pub fn radio_tracks(data: &Value) -> Vec<Track> {
    let mut out = Vec::new();
    yt::walk(data, &mut |o| {
        let Some(v) = o.get("playlistPanelVideoRenderer") else { return };
        let Some(id) = v.get("videoId").and_then(Value::as_str) else { return };
        let Some(duration) = yt::parse_dur(&text(v.get("lengthText"))) else { return };
        let (channel, channel_id) = byline(v.get("longBylineText"));
        out.push(Track { id: id.to_string(), title: text(v.get("title")), channel, channel_id, thumb: yt::thumb(id), duration: Some(duration), published: String::new(), age_min: None, views: 0 });
    });
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_and_tokens() {
        let html = r#"..."INNERTUBE_API_KEY":"AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8","x":1,"INNERTUBE_CONTEXT_CLIENT_VERSION":"2.20260101.00.00","y":2"#;
        let c = cfg(html).unwrap();
        assert_eq!((c.key.as_str(), c.ver.as_str()), ("AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", "2.20260101.00.00"));
        assert!(valid_key(&c.key) && valid_ver(&c.ver));
        assert!(!valid_key("a b") && !valid_ver("2.0; drop") && !valid_token("abc def") && valid_token("EqUCEgNmb28%3D"));
        let data = json!({"a": [{"continuationItemRenderer": {"continuationEndpoint": {"continuationCommand": {"token": "TOKEN123456"}}}}]});
        assert_eq!(continuation_token(&data).as_deref(), Some("TOKEN123456"));
        assert_eq!(continuation_token(&json!({})), None);
    }

    #[test]
    fn playlists_and_radio() {
        let data = json!({"metadata": {"playlistMetadataRenderer": {"title": "Ma liste"}}, "items": [
            {"playlistVideoRenderer": {"videoId": "aaaaaaaaaaa", "title": {"runs": [{"text": "Titre A"}]}, "lengthSeconds": "215", "shortBylineText": {"runs": [{"text": "Artiste - Topic", "navigationEndpoint": {"browseEndpoint": {"browseId": "UCx"}}}]}}},
            {"playlistVideoRenderer": {"videoId": "bbbbbbbbbbb", "title": {"runs": [{"text": "Supprimée"}]}}},
            {"playlistVideoRenderer": {"videoId": "ccccccccccc", "title": {"simpleText": "Titre C"}, "lengthText": {"simpleText": "3:05"}}}]});
        let t = playlist_tracks(&data);
        assert_eq!(playlist_title(&data), "Ma liste");
        assert_eq!(t.len(), 2, "la vidéo sans durée est ignorée");
        assert_eq!((t[0].channel.as_str(), t[0].duration, t[1].duration), ("Artiste", Some(215), Some(185)));
        let lockup = json!([{"lockupViewModel": {"contentId": "eeeeeeeeeee", "contentType": "LOCKUP_CONTENT_TYPE_VIDEO",
            "contentImage": {"thumbnailViewModel": {"overlays": [{"thumbnailBottomOverlayViewModel": {"badges": [{"thumbnailBadgeViewModel": {"text": "3:21"}}]}}]}},
            "metadata": {"lockupMetadataViewModel": {"title": {"content": "Titre lockup"}, "image": {"x": {"browseEndpoint": {"browseId": "UCabcdefghijklmnopqrstuv"}}},
                "metadata": {"contentMetadataViewModel": {"metadataRows": [{"metadataParts": [{"text": {"content": "Artiste lockup"}}]}]}}}}}},
            {"lockupViewModel": {"contentId": "fffffffffff", "contentType": "LOCKUP_CONTENT_TYPE_PLAYLIST", "metadata": {"lockupMetadataViewModel": {"title": {"content": "pas une vidéo"}}}}},
            {"continuationItemViewModel": {"trigger": {"x": {"continuationCommand": {"token": "NEXTTOKEN12345"}}}}}]);
        let t = playlist_tracks(&lockup);
        assert_eq!(t.len(), 1);
        assert_eq!((t[0].id.as_str(), t[0].title.as_str(), t[0].channel.as_str(), t[0].channel_id.as_str(), t[0].duration), ("eeeeeeeeeee", "Titre lockup", "Artiste lockup", "UCabcdefghijklmnopqrstuv", Some(201)));
        assert_eq!(continuation_token(&lockup).as_deref(), Some("NEXTTOKEN12345"));
        let mix = json!([{"playlistPanelVideoRenderer": {"videoId": "ddddddddddd", "title": {"simpleText": "Mix D"}, "lengthText": {"simpleText": "4:00"}, "longBylineText": {"runs": [{"text": "Chaîne"}]}}}]);
        assert_eq!(radio_tracks(&mix)[0].title, "Mix D");
    }
}
