//! YouTube Music : recherche de morceaux, comme le fait l'application web de music.youtube.com.
//!
//! Il n'existe pas d'API officielle : on lit la page d'accueil de YouTube Music (qui donne la clé et la version du client web), puis on pose
//! la même question de recherche que la page. Les résultats sont des identifiants YouTube ordinaires : le lecteur existant les joue tels quels.

use crate::{
    yt::{self, Track},
    ytmore,
};
use serde_json::{Value, json};
use std::sync::Mutex;

/// Filtre « Titres » de la recherche YouTube Music.
const SONGS_PARAMS: &str = "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D";
static CFG: Mutex<Option<(u64, String, String)>> = Mutex::new(None);

async fn config(client: &reqwest::Client) -> Result<(String, String), String> {
    if let Some((at, k, v)) = CFG.lock().unwrap().clone() {
        if yt::unix_now() < at + 6 * 3600 {
            return Ok((k, v));
        }
    }
    let html = yt::get(client, "https://music.youtube.com/").await?;
    let c = ytmore::cfg(&html).ok_or("YouTube Music a changé de format (configuration introuvable)")?;
    *CFG.lock().unwrap() = Some((yt::unix_now(), c.key.clone(), c.ver.clone()));
    Ok((c.key, c.ver))
}

pub async fn search_songs(client: &reqwest::Client, query: &str, gl: &str) -> Result<Vec<Track>, String> {
    if yt::is_paused() {
        return Err(yt::BLOCKED_MSG.to_string());
    }
    let (key, ver) = config(client).await?;
    let gl = if gl.len() == 2 { gl } else { "FR" };
    let body = json!({"context": {"client": {"clientName": "WEB_REMIX", "clientVersion": ver, "hl": "fr", "gl": gl}}, "query": query, "params": SONGS_PARAMS});
    let resp = client
        .post(format!("https://music.youtube.com/youtubei/v1/search?key={key}&prettyPrint=false"))
        .header("Content-Type", "application/json")
        .header("Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/")
        .header("X-YouTube-Client-Name", "67")
        .header("X-YouTube-Client-Version", &ver)
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| format!("Connexion à YouTube Music impossible ({e})"))?;
    let status = resp.status();
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        yt::mark_blocked();
        return Err(yt::BLOCKED_MSG.to_string());
    }
    if !status.is_success() {
        return Err(format!("YouTube Music a répondu {status}"));
    }
    let data: Value = serde_json::from_str(&resp.text().await.map_err(|e| e.to_string())?).map_err(|e| format!("Réponse YouTube Music illisible ({e})"))?;
    Ok(parse_songs(&data))
}

fn runs_text(col: &Value) -> Vec<&Value> {
    col.pointer("/musicResponsiveListItemFlexColumnRenderer/text/runs").and_then(Value::as_array).map(|a| a.iter().collect()).unwrap_or_default()
}

/// Pochette carrée plus grande que la vignette de la liste (…=w120-h120… → …=w400-h400…).
pub fn big_cover(url: &str) -> String {
    let Some(i) = url.rfind("=w") else { return url.to_string() };
    let rest = &url[i + 2..];
    let d1 = rest.chars().take_while(|c| c.is_ascii_digit()).count();
    let after = &rest[d1..];
    if d1 == 0 || !after.starts_with("-h") {
        return url.to_string();
    }
    let d2 = after[2..].chars().take_while(|c| c.is_ascii_digit()).count();
    if d2 == 0 {
        return url.to_string();
    }
    format!("{}=w400-h400{}", &url[..i], &after[2 + d2..])
}

/// Morceaux d'une réponse de recherche YouTube Music (`musicResponsiveListItemRenderer` ayant un `videoId`).
pub fn parse_songs(data: &Value) -> Vec<Track> {
    let mut out: Vec<Track> = Vec::new();
    yt::walk(data, &mut |o| {
        let Some(it) = o.get("musicResponsiveListItemRenderer") else { return };
        let Some(id) = it.pointer("/playlistItemData/videoId").and_then(Value::as_str).filter(|i| i.len() == 11) else { return };
        if out.iter().any(|t| t.id == id) {
            return;
        }
        let cols = it.get("flexColumns").and_then(Value::as_array).cloned().unwrap_or_default();
        let title: String = cols.first().map(|c| runs_text(c).iter().filter_map(|r| r["text"].as_str()).collect()).unwrap_or_default();
        if title.is_empty() {
            return;
        }
        let meta = cols.get(1).map(runs_text).unwrap_or_default();
        let artist_run = meta.iter().find(|r| r.pointer("/navigationEndpoint/browseEndpoint/browseEndpointContextSupportedConfigs/browseEndpointContextMusicConfig/pageType") == Some(&json!("MUSIC_PAGE_TYPE_ARTIST"))).or_else(|| meta.first());
        let channel = artist_run.and_then(|r| r["text"].as_str()).unwrap_or("").trim().to_string();
        let channel_id = artist_run.and_then(|r| r.pointer("/navigationEndpoint/browseEndpoint/browseId")).and_then(Value::as_str).unwrap_or("").to_string();
        let duration = meta.iter().rev().filter_map(|r| r["text"].as_str()).find(|t| t.contains(':') && t.chars().all(|c| c.is_ascii_digit() || c == ':')).and_then(yt::parse_dur);
        let thumb = it
            .pointer("/thumbnail/musicThumbnailRenderer/thumbnail/thumbnails")
            .and_then(Value::as_array)
            .and_then(|a| a.last())
            .and_then(|t| t["url"].as_str())
            .map(big_cover)
            .unwrap_or_else(|| yt::thumb(id));
        out.push(Track { id: id.to_string(), title, channel, channel_id, thumb, duration, published: String::new(), age_min: None, views: 0 });
    });
    out.truncate(25);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn covers_get_bigger() {
        assert_eq!(big_cover("https://yt3.googleusercontent.com/AbC=w120-h120-l90-rj"), "https://yt3.googleusercontent.com/AbC=w400-h400-l90-rj");
        assert_eq!(big_cover("https://x.test/a.jpg"), "https://x.test/a.jpg");
        assert_eq!(big_cover("https://x.test/a=w-h"), "https://x.test/a=w-h");
    }

    #[test]
    fn songs_are_read_from_a_search_answer() {
        let song = |vid: &str, title: &str| {
            json!({"musicResponsiveListItemRenderer": {
                "playlistItemData": {"videoId": vid},
                "thumbnail": {"musicThumbnailRenderer": {"thumbnail": {"thumbnails": [{"url": "https://yt3.googleusercontent.com/a=w60-h60-l90-rj"}, {"url": "https://yt3.googleusercontent.com/a=w120-h120-l90-rj"}]}}},
                "flexColumns": [
                    {"musicResponsiveListItemFlexColumnRenderer": {"text": {"runs": [{"text": title}]}}},
                    {"musicResponsiveListItemFlexColumnRenderer": {"text": {"runs": [
                        {"text": "YOASOBI", "navigationEndpoint": {"browseEndpoint": {"browseId": "UCI6B8NkZKqlFWoiC_xE-hzA", "browseEndpointContextSupportedConfigs": {"browseEndpointContextMusicConfig": {"pageType": "MUSIC_PAGE_TYPE_ARTIST"}}}}},
                        {"text": " • "}, {"text": "THE BOOK", "navigationEndpoint": {"browseEndpoint": {"browseId": "MPREb_x", "browseEndpointContextSupportedConfigs": {"browseEndpointContextMusicConfig": {"pageType": "MUSIC_PAGE_TYPE_ALBUM"}}}}},
                        {"text": " • "}, {"text": "3:34"}]}}}
                ]}})
        };
        let album = json!({"musicResponsiveListItemRenderer": {"flexColumns": [{"musicResponsiveListItemFlexColumnRenderer": {"text": {"runs": [{"text": "Un album"}]}}}]}});
        let data = json!({"contents": {"tabbed": [song("m9SMT5ipbxk", "アイドル"), album, song("m9SMT5ipbxk", "doublon"), song("abcdefghijk", "夜に駆ける")]}});
        let t = parse_songs(&data);
        assert_eq!(t.len(), 2, "l'album (sans videoId) et le doublon sont écartés");
        assert_eq!((t[0].id.as_str(), t[0].title.as_str(), t[0].channel.as_str(), t[0].channel_id.as_str(), t[0].duration), ("m9SMT5ipbxk", "アイドル", "YOASOBI", "UCI6B8NkZKqlFWoiC_xE-hzA", Some(214)));
        assert!(t[0].thumb.contains("=w400-h400"));
    }
}
