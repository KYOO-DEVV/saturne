//! Playlists publiques : visibles par les autres comptes de cet ordinateur.
//! Une playlist n'est partagée que si son propriétaire l'a marquée `"visibility": "public"`.

use crate::store::{Store, User};
use serde_json::{Value, json};
use std::fs;

const MAX_COVER: usize = 200_000;
const MAX_BANNER: usize = 300_000;

fn small_image(v: &Value, max: usize) -> Value {
    match v.as_str() {
        Some(s) if s.len() <= max => json!(s),
        _ => Value::Null,
    }
}

/// Identifiant d'un titre SoundCloud : « sc:<numéro> ».
fn is_sc_id(i: &str) -> bool {
    i.strip_prefix("sc:").is_some_and(|n| (1..=14).contains(&n.len()) && n.chars().all(|c| c.is_ascii_digit()))
}

/// Ne garde que les champs connus d'un titre (le reste du JSON vient du client et n'est pas fiable).
fn clean_track(t: &Value) -> Option<Value> {
    let id = t["id"].as_str().filter(|i| i.len() == 11 || is_sc_id(i))?;
    let sc = t["src"] == "sc" && is_sc_id(id);
    Some(json!({
        "id": id,
        "src": if sc { json!("sc") } else { Value::Null },
        "url": if sc { json!(t["url"].as_str().and_then(crate::soundcloud::clean_url)) } else { Value::Null },
        "title": t["title"].as_str().unwrap_or(""),
        "channel": t["channel"].as_str().unwrap_or(""),
        "channelId": t["channelId"].as_str().unwrap_or(""),
        "thumb": t["thumb"].as_str().unwrap_or(""),
        "duration": t["duration"].as_u64()
    }))
}

fn is_public(p: &Value) -> bool {
    p["visibility"] == "public" && p["id"].is_string() && p["id"] != "favs"
}

fn read_json(store: &Store, username: &str) -> Option<Value> {
    serde_json::from_str(&fs::read_to_string(store.data_path(username)).ok()?).ok()
}

/// Playlists publiques des autres comptes (celles de `viewer` sont exclues).
pub fn list(store: &Store, viewer: &str) -> Vec<Value> {
    let me = viewer.to_lowercase();
    let mut out = Vec::new();
    for u in store.all_users().iter().filter(|u: &&User| u.username.to_lowercase() != me) {
        let Some(data) = read_json(store, &u.username) else { continue };
        for p in data["playlists"].as_array().into_iter().flatten().filter(|p| is_public(p)) {
            out.push(json!({
                "owner": u.username, "ownerDisplay": u.display, "id": p["id"], "name": p["name"],
                "description": p["description"], "cover": small_image(&p["cover"], MAX_COVER),
                "count": p["tracks"].as_array().map_or(0, Vec::len)
            }));
        }
    }
    out
}

/// Une playlist publique complète, ou `None` si elle n'existe pas ou n'est pas publique.
pub fn get(store: &Store, owner: &str, id: &str) -> Option<Value> {
    let user = store.find(owner)?;
    let data = read_json(store, &user.username)?;
    let p = data["playlists"].as_array()?.iter().find(|p| p["id"] == id && is_public(p))?;
    let tracks: Vec<Value> = p["tracks"].as_array().into_iter().flatten().filter_map(clean_track).take(500).collect();
    Some(json!({
        "owner": user.username, "ownerDisplay": user.display, "id": p["id"], "name": p["name"],
        "description": p["description"], "cover": small_image(&p["cover"], MAX_COVER),
        "banner": small_image(&p["banner"], MAX_BANNER), "bannerY": p["bannerY"], "tracks": tracks
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_store() -> Store {
        let n = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        Store::open(std::env::temp_dir().join(format!("saturne-test-{}-{n}", std::process::id()))).unwrap()
    }

    #[test]
    fn soundcloud_tracks_are_kept_with_a_checked_link() {
        let good = json!({"id": "sc:293", "src": "sc", "url": "https://soundcloud.com/forss/flickermood?si=x", "title": "F", "channel": "Forss", "thumb": "https://i1.sndcdn.com/a.jpg"});
        let c = clean_track(&good).unwrap();
        assert_eq!((c["id"].as_str(), c["src"].as_str(), c["url"].as_str()), (Some("sc:293"), Some("sc"), Some("https://soundcloud.com/forss/flickermood")));
        let evil = clean_track(&json!({"id": "sc:293", "src": "sc", "url": "https://evil.test/x/y", "title": "F"})).unwrap();
        assert!(evil["url"].is_null(), "un lien qui n'est pas SoundCloud est effacé");
        assert!(clean_track(&json!({"id": "sc:12abc", "src": "sc", "title": "F"})).is_none());
        assert!(clean_track(&json!({"id": "sc:", "title": "F"})).is_none());
        assert!(clean_track(&json!({"id": "dQw4w9WgXcQ", "title": "F"})).unwrap()["src"].is_null());
    }

    #[test]
    fn only_public_playlists_are_shared() {
        let s = temp_store();
        s.register("alice", "Alice", "x".into()).unwrap();
        s.register("bob", "Bob", "x".into()).unwrap();
        let track = json!({"id": "aqz-KE-bpKQ", "title": "T", "channel": "C", "secret": "nope"});
        let data = json!({"playlists": [
            {"id": "favs", "name": "Bookmarks", "visibility": "public", "tracks": []},
            {"id": "p1", "name": "Ouverte", "visibility": "public", "tracks": [track]},
            {"id": "p2", "name": "Secrète", "visibility": "private", "tracks": []},
            {"id": "p3", "name": "Sans réglage", "tracks": []}
        ]});
        s.write_data("alice", &data.to_string()).unwrap();

        let seen_by_bob = list(&s, "bob");
        assert_eq!(seen_by_bob.len(), 1);
        assert_eq!(seen_by_bob[0]["name"], "Ouverte");
        assert!(list(&s, "alice").is_empty(), "on ne voit pas ses propres playlists ici");

        let full = get(&s, "alice", "p1").unwrap();
        assert_eq!(full["tracks"][0]["id"], "aqz-KE-bpKQ");
        assert!(full["tracks"][0].get("secret").is_none(), "les champs inconnus sont retirés");
        assert!(get(&s, "alice", "p2").is_none(), "une playlist privée reste introuvable");
        assert!(get(&s, "alice", "favs").is_none(), "les Bookmarks ne sont jamais publics");
        assert!(get(&s, "alice", "p3").is_none(), "sans réglage = privée");
        assert!(get(&s, "nobody", "p1").is_none());
    }
}
