//! Mises à jour via les releases GitHub.
//!
//! 1. `latest` lit la dernière release du dépôt (API publique de GitHub, sans jeton).
//! 2. `download` télécharge `Saturne.exe` et vérifie sa taille et son empreinte SHA-256 (donnée par GitHub).
//! 3. `apply` remplace l'exécutable en cours (l'ancien devient `Saturne.exe.old`, supprimé au lancement suivant).
//! Sans empreinte SHA-256 dans la release, l'installation automatique est refusée.

use serde_json::Value;
use sha2::{Digest, Sha256};
use std::path::PathBuf;

pub const CURRENT: &str = env!("CARGO_PKG_VERSION");
const DEFAULT_REPO: &str = "KYOO-DEVV/saturne";
const DEFAULT_API: &str = "https://api.github.com";
const ASSET: &str = "Saturne.exe";
const MAX_SIZE: u64 = 100 * 1024 * 1024;

/// Dépôt et adresse de l'API (modifiables par variables d'environnement, utile pour les tests).
pub fn config() -> (String, String) {
    let api = std::env::var("SATURNE_UPDATE_API").unwrap_or_else(|_| DEFAULT_API.to_string());
    let repo = std::env::var("SATURNE_UPDATE_REPO").unwrap_or_else(|_| DEFAULT_REPO.to_string());
    (api.trim_end_matches('/').to_string(), repo)
}

#[derive(Debug, Clone)]
pub struct Release {
    pub tag: String,
    pub notes: String,
    pub page: String,
    pub asset_url: String,
    pub asset_size: u64,
    pub digest: Option<String>,
}

impl Release {
    pub fn version(&self) -> &str {
        self.tag.trim_start_matches(['v', 'V'])
    }
    pub fn can_install(&self) -> bool {
        !self.asset_url.is_empty() && self.digest.is_some()
    }
}

/// « v0.3.1 » ou « 0.3.1-beta » → (0, 3, 1).
pub fn parse_version(s: &str) -> Option<(u64, u64, u64)> {
    let core = s.trim().trim_start_matches(['v', 'V']).split(['-', '+']).next()?;
    let mut it = core.split('.').map(|p| p.parse::<u64>().ok());
    Some((it.next()??, it.next().unwrap_or(Some(0))?, it.next().unwrap_or(Some(0))?))
}

pub fn is_newer(latest: &str, current: &str) -> bool {
    matches!((parse_version(latest), parse_version(current)), (Some(l), Some(c)) if l > c)
}

pub fn parse_release(v: &Value) -> Result<Release, String> {
    let tag = v["tag_name"].as_str().filter(|t| !t.is_empty()).ok_or("Réponse GitHub inattendue")?.to_string();
    let asset = v["assets"].as_array().and_then(|a| a.iter().find(|x| x["name"] == ASSET));
    Ok(Release {
        tag,
        notes: v["body"].as_str().unwrap_or("").chars().take(4000).collect(),
        page: v["html_url"].as_str().unwrap_or("").to_string(),
        asset_url: asset.and_then(|a| a["browser_download_url"].as_str()).unwrap_or("").to_string(),
        asset_size: asset.and_then(|a| a["size"].as_u64()).unwrap_or(0),
        digest: asset.and_then(|a| a["digest"].as_str()).and_then(|d| d.strip_prefix("sha256:")).map(|d| d.to_lowercase()),
    })
}

fn host_of(url: &str) -> Option<&str> {
    url.strip_prefix("https://").or_else(|| url.strip_prefix("http://"))?.split(['/', ':', '?']).next()
}

/// Seuls GitHub (et l'adresse de test configurée) sont autorisés pour les téléchargements et les redirections.
pub fn host_allowed(url: &str) -> bool {
    let Some(host) = host_of(url) else { return false };
    let (api, _) = config();
    let test_host = host_of(&api).filter(|h| *h == "127.0.0.1" || *h == "localhost");
    let github = url.starts_with("https://") && (host == "github.com" || host.ends_with(".githubusercontent.com"));
    github || test_host == Some(host)
}

pub async fn latest(client: &reqwest::Client) -> Result<Release, String> {
    let (api, repo) = config();
    let resp = client
        .get(format!("{api}/repos/{repo}/releases/latest"))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("Impossible de joindre GitHub ({e})"))?;
    match resp.status().as_u16() {
        200 => {
            let text = resp.text().await.map_err(|e| e.to_string())?;
            parse_release(&serde_json::from_str::<Value>(&text).map_err(|e| format!("Réponse GitHub illisible ({e})"))?)
        }
        404 => Err("Aucune release publique trouvée. Le dépôt est peut-être privé ou n'a pas encore de release.".into()),
        403 | 429 => Err("GitHub limite temporairement les requêtes. Réessaie dans quelques minutes.".into()),
        s => Err(format!("GitHub a répondu {s}")),
    }
}

pub async fn download(client: &reqwest::Client, rel: &Release) -> Result<Vec<u8>, String> {
    let digest = rel.digest.as_deref().ok_or("Cette release n'a pas d'empreinte SHA-256 : installation automatique refusée.")?;
    if !host_allowed(&rel.asset_url) {
        return Err("Adresse de téléchargement non autorisée".into());
    }
    if rel.asset_size == 0 || rel.asset_size > MAX_SIZE {
        return Err("Taille du fichier de mise à jour invalide".into());
    }
    let resp = client.get(&rel.asset_url).send().await.map_err(|e| format!("Téléchargement impossible ({e})"))?;
    if !resp.status().is_success() {
        return Err(format!("Téléchargement refusé (HTTP {})", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|e| format!("Téléchargement interrompu ({e})"))?;
    verify(&bytes, rel.asset_size, digest)?;
    Ok(bytes.to_vec())
}

/// Taille, empreinte SHA-256 et signature « MZ » d'un exécutable Windows.
pub fn verify(bytes: &[u8], size: u64, digest: &str) -> Result<(), String> {
    if bytes.len() as u64 != size {
        return Err("Le fichier téléchargé est incomplet".into());
    }
    let got: String = Sha256::digest(bytes).iter().map(|b| format!("{b:02x}")).collect();
    if !got.eq_ignore_ascii_case(digest) {
        return Err("L'empreinte du fichier ne correspond pas : mise à jour annulée".into());
    }
    if !bytes.starts_with(b"MZ") {
        return Err("Le fichier téléchargé n'est pas un exécutable Windows".into());
    }
    Ok(())
}

fn old_path(exe: &std::path::Path) -> PathBuf {
    let mut s = exe.as_os_str().to_owned();
    s.push(".old");
    PathBuf::from(s)
}

/// Remplace l'exécutable en cours. Windows interdit de l'écraser mais autorise à le renommer.
pub fn apply(bytes: &[u8]) -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    apply_to(&exe, bytes)?;
    Ok(exe)
}

pub fn apply_to(exe: &std::path::Path, bytes: &[u8]) -> Result<(), String> {
    let (old, new) = (old_path(exe), exe.with_extension("exe.new"));
    std::fs::write(&new, bytes).map_err(|e| format!("Écriture impossible : {e}"))?;
    let _ = std::fs::remove_file(&old);
    if let Err(e) = std::fs::rename(exe, &old) {
        let _ = std::fs::remove_file(&new);
        return Err(format!("Impossible de remplacer l'application : {e}"));
    }
    if let Err(e) = std::fs::rename(&new, exe) {
        let _ = std::fs::rename(&old, exe); // on remet l'ancienne version
        return Err(format!("Impossible d'installer la nouvelle version : {e}"));
    }
    Ok(())
}

/// Supprime l'ancienne version laissée par une mise à jour précédente.
pub fn cleanup_old() {
    if let Ok(exe) = std::env::current_exe() {
        let _ = std::fs::remove_file(old_path(&exe));
    }
}

/// Relance l'application (mêmes arguments) puis quitte. Le nouveau processus attend un instant que le port se libère.
pub fn restart(exe: &std::path::Path) -> ! {
    let _ = std::process::Command::new(exe).args(std::env::args().skip(1)).env("SATURNE_RESTART", "1").spawn();
    std::process::exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn versions() {
        assert_eq!(parse_version("v0.3.1"), Some((0, 3, 1)));
        assert_eq!(parse_version("1.2"), Some((1, 2, 0)));
        assert_eq!(parse_version("2.0.0-beta.1"), Some((2, 0, 0)));
        assert_eq!(parse_version("pas une version"), None);
        assert!(is_newer("v0.4.0", "0.3.0"));
        assert!(is_newer("0.3.10", "0.3.9"));
        assert!(!is_newer("0.3.0", "0.3.0"));
        assert!(!is_newer("0.2.9", "0.3.0"));
        assert!(!is_newer("n'importe quoi", "0.3.0"));
    }

    #[test]
    fn release_parsing() {
        let v = json!({"tag_name": "v0.4.0", "body": "Notes", "html_url": "https://github.com/x/y/releases/tag/v0.4.0",
            "assets": [{"name": "install.bat", "size": 5}, {"name": "Saturne.exe", "size": 123, "browser_download_url": "https://github.com/x/y/releases/download/v0.4.0/Saturne.exe", "digest": "sha256:ABCDEF"}]});
        let r = parse_release(&v).unwrap();
        assert_eq!((r.version(), r.asset_size, r.can_install()), ("0.4.0", 123, true));
        assert_eq!(r.digest.as_deref(), Some("abcdef"));
        let sans = json!({"tag_name": "v0.4.0", "assets": [{"name": "Saturne.exe", "size": 1, "browser_download_url": "https://github.com/a"}]});
        assert!(!parse_release(&sans).unwrap().can_install(), "sans empreinte : pas d'installation automatique");
        assert!(parse_release(&json!({})).is_err());
    }

    #[test]
    fn allowed_hosts() {
        assert!(host_allowed("https://github.com/x/y/releases/download/v1/Saturne.exe"));
        assert!(host_allowed("https://objects.githubusercontent.com/abc"));
        assert!(host_allowed("https://release-assets.githubusercontent.com/abc"));
        assert!(!host_allowed("http://github.com/x"));
        assert!(!host_allowed("https://evilgithub.com/x"));
        assert!(!host_allowed("https://github.com.evil.com/x"));
        assert!(!host_allowed("https://127.0.0.1:9/x"), "le serveur local n'est autorisé que s'il est configuré comme API de test");
    }

    #[test]
    fn verification() {
        let data = b"MZ-fake-exe-contents";
        let digest: String = Sha256::digest(data).iter().map(|b| format!("{b:02x}")).collect();
        assert!(verify(data, data.len() as u64, &digest).is_ok());
        assert!(verify(data, data.len() as u64 + 1, &digest).is_err(), "taille");
        assert!(verify(data, data.len() as u64, &"0".repeat(64)).is_err(), "empreinte");
        let not_exe = b"hello world, not an exe";
        let d2: String = Sha256::digest(not_exe).iter().map(|b| format!("{b:02x}")).collect();
        assert!(verify(not_exe, not_exe.len() as u64, &d2).is_err(), "signature MZ");
    }

    #[test]
    fn replaces_the_running_file() {
        let dir = std::env::temp_dir().join(format!("saturne-upd-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let exe = dir.join("Saturne.exe");
        std::fs::write(&exe, b"MZ-old").unwrap();
        apply_to(&exe, b"MZ-new").unwrap();
        assert_eq!(std::fs::read(&exe).unwrap(), b"MZ-new");
        assert_eq!(std::fs::read(old_path(&exe)).unwrap(), b"MZ-old");
        apply_to(&exe, b"MZ-newer").unwrap();
        assert_eq!(std::fs::read(&exe).unwrap(), b"MZ-newer");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
