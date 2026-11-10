//! Discord Rich Presence (« écoute X ») par le canal IPC local de Discord.
//! Nécessite l'identifiant d'une application Discord (créée sur discord.com/developers) saisi dans les réglages.
//! Sans Discord ouvert, tout échoue silencieusement.

use serde_json::{Value, json};
use std::{
    fs::{File, OpenOptions},
    io::{Read, Write},
    sync::mpsc,
};

pub enum Msg {
    Set { app_id: String, title: String, artist: String, start: Option<u64>, end: Option<u64> },
    Clear,
}

/// Une trame IPC : opération (4 octets), longueur (4 octets), JSON.
pub fn frame(op: u32, payload: &Value) -> Vec<u8> {
    let body = payload.to_string().into_bytes();
    let mut out = Vec::with_capacity(8 + body.len());
    out.extend_from_slice(&op.to_le_bytes());
    out.extend_from_slice(&(body.len() as u32).to_le_bytes());
    out.extend_from_slice(&body);
    out
}

pub fn activity(title: &str, artist: &str, start: Option<u64>, end: Option<u64>) -> Value {
    let mut a = json!({"type": 2, "details": title.chars().take(120).collect::<String>(), "state": format!("de {}", artist.chars().take(110).collect::<String>())});
    if let Some(s) = start {
        a["timestamps"] = json!({"start": s});
        if let Some(e) = end {
            a["timestamps"]["end"] = json!(e);
        }
    }
    a
}

fn read_reply(f: &mut File) -> std::io::Result<()> {
    let mut head = [0u8; 8];
    f.read_exact(&mut head)?;
    let len = u32::from_le_bytes([head[4], head[5], head[6], head[7]]) as usize;
    let mut body = vec![0u8; len.min(65536)];
    f.read_exact(&mut body)
}

fn connect(app_id: &str) -> Option<File> {
    for n in 0..10 {
        if let Ok(mut f) = OpenOptions::new().read(true).write(true).open(format!(r"\\.\pipe\discord-ipc-{n}")) {
            f.write_all(&frame(0, &json!({"v": 1, "client_id": app_id}))).ok()?;
            read_reply(&mut f).ok()?;
            return Some(f);
        }
    }
    None
}

fn send_activity(f: &mut File, act: Option<Value>) -> std::io::Result<()> {
    let nonce = format!("{:x}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0));
    f.write_all(&frame(1, &json!({"cmd": "SET_ACTIVITY", "args": {"pid": std::process::id(), "activity": act}, "nonce": nonce})))?;
    read_reply(f)
}

/// Lance le fil qui parle à Discord et renvoie l'émetteur de messages.
pub fn spawn() -> mpsc::Sender<Msg> {
    let (tx, rx) = mpsc::channel::<Msg>();
    std::thread::spawn(move || {
        let mut conn: Option<(String, File)> = None;
        while let Ok(msg) = rx.recv() {
            match msg {
                Msg::Set { app_id, title, artist, start, end } => {
                    if conn.as_ref().is_none_or(|(id, _)| *id != app_id) {
                        conn = connect(&app_id).map(|f| (app_id.clone(), f));
                    }
                    if let Some((_, f)) = conn.as_mut() {
                        if send_activity(f, Some(activity(&title, &artist, start, end))).is_err() {
                            conn = None; // Discord a été fermé : on se reconnectera au prochain message
                        }
                    }
                }
                Msg::Clear => {
                    if let Some((_, f)) = conn.as_mut() {
                        if send_activity(f, None).is_err() {
                            conn = None;
                        }
                    }
                }
            }
        }
    });
    tx
}

pub fn valid_app_id(s: &str) -> bool {
    (15..=22).contains(&s.len()) && s.chars().all(|c| c.is_ascii_digit())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frames() {
        let f = frame(1, &json!({"a": 1}));
        assert_eq!(&f[..4], &1u32.to_le_bytes());
        assert_eq!(u32::from_le_bytes([f[4], f[5], f[6], f[7]]) as usize, f.len() - 8);
        assert_eq!(&f[8..], br#"{"a":1}"#);
    }

    #[test]
    fn activities() {
        let a = activity("Titre", "Artiste", Some(100), Some(300));
        assert_eq!((a["type"].as_u64(), a["details"].as_str(), a["state"].as_str()), (Some(2), Some("Titre"), Some("de Artiste")));
        assert_eq!((a["timestamps"]["start"].as_u64(), a["timestamps"]["end"].as_u64()), (Some(100), Some(300)));
        assert!(activity("t", "a", None, None).get("timestamps").is_none());
        assert!(valid_app_id("123456789012345678") && !valid_app_id("abc") && !valid_app_id("12345"));
    }
}
