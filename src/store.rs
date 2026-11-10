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

    /// Change le mot de passe et ferme toutes les autres sessions de ce compte (sauf `keep`).
    pub fn set_password(&self, username: &str, hash: String, keep: &str) -> bool {
        let key = username.to_lowercase();
        let mut g = self.inner.lock().unwrap();
        let Some(u) = g.disk.users.get_mut(&key) else { return false };
        u.hash = hash;
        g.disk.sessions.retain(|t, s| s.user != key || t == keep);
        self.persist(&mut g);
        true
    }

    /// Change l'identifiant : déplace le fichier de données, le compte et ses sessions.
    pub fn rename_user(&self, old: &str, new: &str) -> Result<User, &'static str> {
        if !valid_username(new) {
            return Err("Identifiant : 3 à 24 caractères (lettres, chiffres, _ . -)");
        }
        let (old_key, new_key) = (old.to_lowercase(), new.to_lowercase());
        let mut g = self.inner.lock().unwrap();
        if old_key != new_key && g.disk.users.contains_key(&new_key) {
            return Err("Cet identifiant est déjà pris");
        }
        let mut user = g.disk.users.remove(&old_key).ok_or("Compte introuvable")?;
        if old_key != new_key {
            let (from, to) = (self.data_path(&old_key), self.data_path(&new_key));
            let _ = fs::rename(self.backup_dir(&old_key), self.backup_dir(&new_key));
            if from.exists() && fs::rename(&from, &to).is_err() {
                g.disk.users.insert(old_key, user);
                return Err("Impossible de déplacer les données du compte");
            }
        }
        user.username = new.to_string();
        g.disk.users.insert(new_key.clone(), user.clone());
        for s in g.disk.sessions.values_mut().filter(|s| s.user == old_key) {
            s.user = new_key.clone();
        }
        g.fails.remove(&old_key);
        self.persist(&mut g);
        Ok(user)
    }

    /// Supprime le compte, ses sessions et ses données.
    pub fn delete_user(&self, username: &str) {
        let key = username.to_lowercase();
        let mut g = self.inner.lock().unwrap();
        g.disk.users.remove(&key);
        g.disk.sessions.retain(|_, s| s.user != key);
        let _ = fs::remove_file(self.data_path(&key));
        let _ = fs::remove_dir_all(self.backup_dir(&key));
        self.persist(&mut g);
    }

    pub fn all_users(&self) -> Vec<User> {
        self.inner.lock().unwrap().disk.users.values().cloned().collect()
    }

    pub fn data_path(&self, username: &str) -> PathBuf {
        self.dir.join("data").join(format!("{}.json", username.to_lowercase()))
    }

    fn backup_dir(&self, username: &str) -> PathBuf {
        self.dir.join("data").join("backups").join(username.to_lowercase())
    }

    /// Sauvegardes disponibles (horodatage, taille), de la plus récente à la plus ancienne.
    pub fn list_backups(&self, username: &str) -> Vec<(u64, u64)> {
        let mut v: Vec<(u64, u64)> = fs::read_dir(self.backup_dir(username))
            .into_iter()
            .flatten()
            .flatten()
            .filter_map(|e| Some((e.path().file_stem()?.to_str()?.parse::<u64>().ok()?, e.metadata().ok()?.len())))
            .collect();
        v.sort_by(|a, b| b.0.cmp(&a.0));
        v
    }

    /// Copie les données actuelles dans les sauvegardes (au plus une par heure, sauf `force`) et garde les 10 dernières.
    fn snapshot(&self, username: &str, force: bool) {
        let src = self.data_path(username);
        if !src.exists() {
            return;
        }
        let existing = self.list_backups(username);
        if !force && existing.first().is_some_and(|(ts, _)| now().saturating_sub(*ts) < 3600) {
            return;
        }
        let dir = self.backup_dir(username);
        if fs::create_dir_all(&dir).is_err() {
            return;
        }
        let _ = fs::copy(&src, dir.join(format!("{}.json", now())));
        for (ts, _) in self.list_backups(username).into_iter().skip(10) {
            let _ = fs::remove_file(dir.join(format!("{ts}.json")));
        }
    }

    /// Remplace les données par une sauvegarde (après avoir sauvegardé l'état actuel) et renvoie son contenu.
    pub fn restore_backup(&self, username: &str, ts: u64) -> Option<String> {
        let content = fs::read_to_string(self.backup_dir(username).join(format!("{ts}.json"))).ok()?;
        serde_json::from_str::<serde_json::Value>(&content).ok().filter(|v| v.is_object())?;
        let _g = self.inner.lock().unwrap();
        self.snapshot(username, true);
        write_atomic(&self.data_path(username), content.as_bytes()).ok()?;
        Some(content)
    }

    pub fn read_data(&self, username: &str) -> String {
        fs::read_to_string(self.data_path(username)).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn write_data(&self, username: &str, json: &str) -> std::io::Result<()> {
        // Verrou partagé pour éviter deux écritures simultanées sur le même fichier.
        let _g = self.inner.lock().unwrap();
        self.snapshot(username, false);
        write_atomic(&self.data_path(username), json.as_bytes())
    }
}

#[cfg(test)]
mod backup_tests {
    use super::*;

    #[test]
    fn snapshots_and_restore() {
        let dir = std::env::temp_dir().join(format!("saturne-bk-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let s = Store::open(dir.clone()).unwrap();
        s.write_data("zaki", r#"{"v":1}"#).unwrap();
        assert!(s.list_backups("zaki").is_empty(), "rien à sauvegarder à la première écriture");
        s.write_data("zaki", r#"{"v":2}"#).unwrap();
        let b = s.list_backups("zaki");
        assert_eq!(b.len(), 1, "une sauvegarde de l'état précédent");
        s.write_data("zaki", r#"{"v":3}"#).unwrap();
        assert_eq!(s.list_backups("zaki").len(), 1, "au plus une par heure");
        assert_eq!(s.restore_backup("zaki", b[0].0).as_deref(), Some(r#"{"v":1}"#));
        assert_eq!(s.read_data("zaki"), r#"{"v":1}"#);
        assert!(s.restore_backup("zaki", 1).is_none());
        let _ = fs::remove_dir_all(&dir);
    }
}
