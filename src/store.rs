//! Comptes, sessions et données par utilisateur, stockés dans des fichiers JSON locaux.

use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    sync::Mutex,
    time::{Instant, SystemTime, UNIX_EPOCH},
};

const SESSION_SECS: u64 = 30 * 24 * 3600;
const MAX_FAILS: u32 = 5;
const LOCK_SECS: u64 = 60;

pub fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct User {
    pub username: String,
    pub display: String,
    pub hash: String,
    pub created: u64,
    #[serde(default)]
    pub avatar: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct Session {
    user: String,
    expires: u64,
}

#[derive(Default, Serialize, Deserialize)]
struct Disk {
    users: HashMap<String, User>,
    sessions: HashMap<String, Session>,
}

struct Inner {
    disk: Disk,
    fails: HashMap<String, (u32, Instant)>,
}

pub struct Store {
    dir: PathBuf,
    inner: Mutex<Inner>,
}

/// Nom d'utilisateur valide : 3 à 24 caractères parmi lettres, chiffres, `_`, `.` et `-`.
pub fn valid_username(s: &str) -> bool {
    (3..=24).contains(&s.len()) && s.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-'))
}

fn write_atomic(path: &PathBuf, data: &[u8]) -> std::io::Result<()> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, data)?;
    fs::rename(&tmp, path)
}

impl Store {
    pub fn open(dir: PathBuf) -> std::io::Result<Store> {
        fs::create_dir_all(dir.join("data"))?;
        let disk = fs::read_to_string(dir.join("accounts.json"))
            .ok()
            .and_then(|s| serde_json::from_str::<Disk>(&s).ok())
            .unwrap_or_default();
        Ok(Store { dir, inner: Mutex::new(Inner { disk, fails: HashMap::new() }) })
    }

    fn persist(&self, inner: &mut Inner) {
        let t = now();
        inner.disk.sessions.retain(|_, s| s.expires > t);
        if let Ok(bytes) = serde_json::to_vec_pretty(&inner.disk) {
            let _ = write_atomic(&self.dir.join("accounts.json"), &bytes);
        }
    }

    pub fn find(&self, username: &str) -> Option<User> {
        self.inner.lock().unwrap().disk.users.get(&username.to_lowercase()).cloned()
    }

    pub fn register(&self, username: &str, display: &str, hash: String) -> Result<User, &'static str> {
        let key = username.to_lowercase();
        let mut g = self.inner.lock().unwrap();
        if g.disk.users.contains_key(&key) {
            return Err("Ce nom d'utilisateur est déjà pris");
        }
        let user = User { username: username.to_string(), display: display.to_string(), hash, created: now(), avatar: String::new() };
        g.disk.users.insert(key, user.clone());
        self.persist(&mut g);
        Ok(user)
    }

    /// Secondes restantes avant de pouvoir réessayer, si l'identifiant est bloqué.
    pub fn locked_for(&self, key: &str) -> Option<u64> {
        let g = self.inner.lock().unwrap();
        let (n, at) = g.fails.get(&key.to_lowercase())?;
        if *n >= MAX_FAILS {
            let elapsed = at.elapsed().as_secs();
            if elapsed < LOCK_SECS {
                return Some(LOCK_SECS - elapsed);
            }
        }
        None
    }

    pub fn note_failure(&self, key: &str) {
        let mut g = self.inner.lock().unwrap();
        let e = g.fails.entry(key.to_lowercase()).or_insert((0, Instant::now()));
        if e.0 >= MAX_FAILS && e.1.elapsed().as_secs() >= LOCK_SECS {
            *e = (0, Instant::now());
        }
        e.0 += 1;
        e.1 = Instant::now();
    }

    pub fn clear_failures(&self, key: &str) {
        self.inner.lock().unwrap().fails.remove(&key.to_lowercase());
    }

    pub fn new_session(&self, username: &str) -> String {
        let mut buf = [0u8; 32];
        getrandom::fill(&mut buf).expect("générateur aléatoire indisponible");
        let token: String = buf.iter().map(|b| format!("{b:02x}")).collect();
        let mut g = self.inner.lock().unwrap();
        g.disk.sessions.insert(token.clone(), Session { user: username.to_lowercase(), expires: now() + SESSION_SECS });
        self.persist(&mut g);
        token
    }

    pub fn session_user(&self, token: &str) -> Option<User> {
        let g = self.inner.lock().unwrap();
        let s = g.disk.sessions.get(token)?;
        if s.expires <= now() {
            return None;
        }
        g.disk.users.get(&s.user).cloned()
    }

    pub fn end_session(&self, token: &str) {
        let mut g = self.inner.lock().unwrap();
        if g.disk.sessions.remove(token).is_some() {
            self.persist(&mut g);
        }
    }

    pub fn update_profile(&self, username: &str, display: Option<String>, avatar: Option<String>) -> Option<User> {
        let mut g = self.inner.lock().unwrap();
        let u = g.disk.users.get_mut(&username.to_lowercase())?;
        if let Some(d) = display {
            u.display = d;
        }
        if let Some(a) = avatar {
            u.avatar = a;
        }
        let out = u.clone();
        self.persist(&mut g);
        Some(out)
    }

    pub fn all_users(&self) -> Vec<User> {
        self.inner.lock().unwrap().disk.users.values().cloned().collect()
    }

    pub fn data_path(&self, username: &str) -> PathBuf {
        self.dir.join("data").join(format!("{}.json", username.to_lowercase()))
    }

    pub fn read_data(&self, username: &str) -> String {
        fs::read_to_string(self.data_path(username)).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn write_data(&self, username: &str, json: &str) -> std::io::Result<()> {
        // Verrou partagé pour éviter deux écritures simultanées sur le même fichier.
        let _g = self.inner.lock().unwrap();
        write_atomic(&self.data_path(username), json.as_bytes())
    }
}
