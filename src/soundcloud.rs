//! SoundCloud : résolution d'un lien de titre (oEmbed officiel, sans clé) et recherche (API officielle, avec TON « Client ID »).
//!
//! La lecture passe par le widget officiel de SoundCloud (voir `web/js/05-…`). Saturne n'extrait aucune clé du site de SoundCloud :
//! la recherche demande un Client ID obtenu auprès de SoundCloud (réglage « SoundCloud »). Sans lui, on peut quand même coller un lien de titre.

use serde_json::{Value, json};

pub fn enc(s: &str) -> String {
    s.bytes().map(|b| if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') { (b as char).to_string() } else { format!("%{b:02X}") }).collect()
}

/// Un lien SoundCloud acceptable : https, hôte soundcloud.com (ou m., on.), au moins un chemin ; sans paramètres ni ancre.
pub fn clean_url(u: &str) -> Option<String> {
    let u = u.trim();
    let rest = u.strip_prefix("https://")?;
    let (host, path) = rest.split_once('/')?;
    if !matches!(host, "soundcloud.com" | "www.soundcloud.com" | "m.soundcloud.com" | "on.soundcloud.com") {
        return None;
    }
    let path = path.split(['?', '#']).next().unwrap_or("").trim_end_matches('/');
    if path.is_empty() || u.len() > 300 || !path.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.' | '/' | '%')) {
        return None;
    }
    Some(format!("https://{}/{path}", if host == "m.soundcloud.com" || host == "www.soundcloud.com" { "soundcloud.com" } else { host }))
}

pub fn valid_cid(c: &str) -> bool {
    (16..=64).contains(&c.len()) && c.chars().all(|x| x.is_ascii_alphanumeric())
}

/// Titre SoundCloud pour l'application. `id` = « sc:<numéro> » ; `url` sert au lecteur.
fn track(id: u64, url: &str, title: &str, artist: &str, thumb: &str, duration_ms: Option<u64>) -> Value {
    json!({"id": format!("sc:{id}"), "src": "sc", "url": url, "title": title, "channel": artist, "channelId": "", "thumb": thumb, "duration": duration_ms.map(|d| d / 1000)})
}

/// Numéro de titre dans le code d'intégration d'oEmbed (`…url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123…`).
pub fn track_id_from_embed(html: &str) -> Option<u64> {
    let i = html.find("api.soundcloud.com%2Ftracks%2F").map(|i| i + "api.soundcloud.com%2Ftracks%2F".len()).or_else(|| html.find("api.soundcloud.com/tracks/").map(|i| i + "api.soundcloud.com/tracks/".len()))?;
    let digits: String = html[i..].chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse().ok().filter(|n| *n > 0)
}

pub async fn resolve(client: &reqwest::Client, url: &str) -> Result<Value, String> {
    let url = clean_url(url).ok_or("Ce n'est pas un lien SoundCloud (https://soundcloud.com/…)")?;
    let resp = client.get(format!("https://soundcloud.com/oembed?format=json&url={}", enc(&url))).send().await.map_err(|e| format!("SoundCloud injoignable ({e})"))?;
    if resp.status().as_u16() == 404 {
        return Err("Lien SoundCloud introuvable (titre privé ou supprimé ?)".into());
    }
    if !resp.status().is_success() {
        return Err(format!("SoundCloud a répondu {}", resp.status()));
    }
    let j: Value = serde_json::from_str(&resp.text().await.map_err(|e| e.to_string())?).map_err(|e| format!("Réponse SoundCloud illisible ({e})"))?;
    let html = j["html"].as_str().unwrap_or("");
    if html.contains("api.soundcloud.com%2Fplaylists%2F") || html.contains("api.soundcloud.com/playlists/") {
        return Err("Les playlists (sets) SoundCloud ne sont pas encore prises en charge : colle le lien d'un titre.".into());
    }
    let id = track_id_from_embed(html).ok_or("Ce lien n'est pas un titre SoundCloud (colle le lien d'un titre).")?;
    let artist = j["author_name"].as_str().unwrap_or("").trim();
    let mut title = j["title"].as_str().unwrap_or("").trim().to_string();
    if let Some(t) = title.strip_suffix(&format!(" by {artist}")) {
        title = t.trim().to_string();
    }
    if title.is_empty() {
        return Err("Titre SoundCloud sans nom".into());
    }
    Ok(track(id, &url, &title, artist, j["thumbnail_url"].as_str().unwrap_or(""), None))
}

pub fn parse_search(v: &Value) -> Vec<Value> {
    let list = v.as_array().cloned().or_else(|| v["collection"].as_array().cloned()).unwrap_or_default();
    list.iter()
        .filter_map(|t| {
            let (id, url) = (t["id"].as_u64()?, t["permalink_url"].as_str().and_then(clean_url)?);
            if t["streamable"] == false || t["access"] == "blocked" {
                return None;
            }
            let thumb = t["artwork_url"].as_str().or_else(|| t.pointer("/user/avatar_url").and_then(Value::as_str)).unwrap_or("").replace("-large.", "-t500x500.");
            Some(track(id, &url, t["title"].as_str()?, t.pointer("/user/username").and_then(Value::as_str).unwrap_or(""), &thumb, t["duration"].as_u64()))
        })
        .take(25)
        .collect()
}

pub async fn search(client: &reqwest::Client, q: &str, cid: &str) -> Result<Vec<Value>, String> {
    if !valid_cid(cid) {
        return Err("Client ID SoundCloud manquant ou invalide (Réglages › Général › SoundCloud).".into());
    }
    let resp = client.get(format!("https://api.soundcloud.com/tracks?q={}&limit=25&access=playable&client_id={cid}", enc(q))).header("Accept", "application/json; charset=utf-8").send().await.map_err(|e| format!("SoundCloud injoignable ({e})"))?;
    match resp.status().as_u16() {
        401 | 403 => return Err("SoundCloud refuse ce Client ID (vérifie-le dans Réglages › Général › SoundCloud).".into()),
        429 => return Err("SoundCloud limite les requêtes : réessaie dans un moment.".into()),
        s if !(200..300).contains(&s) => return Err(format!("SoundCloud a répondu {s}")),
        _ => {}
    }
    let v: Value = serde_json::from_str(&resp.text().await.map_err(|e| e.to_string())?).map_err(|e| format!("Réponse SoundCloud illisible ({e})"))?;
    Ok(parse_search(&v))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn links_are_checked() {
        assert_eq!(clean_url("https://soundcloud.com/odesza/say-my-name?si=abc#t=1").as_deref(), Some("https://soundcloud.com/odesza/say-my-name"));
        assert_eq!(clean_url("https://m.soundcloud.com/flume/").as_deref(), Some("https://soundcloud.com/flume"));
        for bad in ["http://soundcloud.com/a/b", "https://evil.test/soundcloud.com/a", "https://soundcloud.com.evil.test/a/b", "https://soundcloud.com/", "https://soundcloud.com/a b", "javascript:alert(1)", "https://soundcloud.com/a/b\"onload=x"] {
            assert!(clean_url(bad).is_none(), "{bad}");
        }
        assert!(valid_cid("AbCdEfGhIjKlMnOp12345678") && !valid_cid("short") && !valid_cid("with space with space 1234"));
    }

    #[test]
    fn embed_gives_the_track_number() {
        let html = r#"<iframe src="https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F1234567&show_artwork=true"></iframe>"#;
        assert_eq!(track_id_from_embed(html), Some(1234567));
        assert_eq!(track_id_from_embed("<iframe src=\"https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Fusers%2F2976616\">"), None);
    }

    #[test]
    fn search_answers_are_read() {
        let v = json!([
            {"id": 11, "title": "Song A", "permalink_url": "https://soundcloud.com/art/song-a", "artwork_url": "https://i1.sndcdn.com/artworks-x-large.jpg", "duration": 215000, "user": {"username": "Art"}, "streamable": true},
            {"id": 12, "title": "Bloqué", "permalink_url": "https://soundcloud.com/art/b", "streamable": false},
            {"id": 13, "title": "Lien douteux", "permalink_url": "https://evil.test/x/y"},
            {"title": "Sans id", "permalink_url": "https://soundcloud.com/art/z"}
        ]);
        let t = parse_search(&v);
        assert_eq!(t.len(), 1);
        assert_eq!((t[0]["id"].as_str(), t[0]["src"].as_str(), t[0]["duration"].as_u64(), t[0]["channel"].as_str()), (Some("sc:11"), Some("sc"), Some(215), Some("Art")));
        assert!(t[0]["thumb"].as_str().unwrap().contains("t500x500"));
    }
}
