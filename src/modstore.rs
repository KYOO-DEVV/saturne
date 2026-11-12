//! Store : thèmes et Apps de la communauté.
//!
//! Un paquet = un dossier (`manifest.json` + fichiers). Les paquets du catalogue sont vérifiés (sha256 de chaque fichier,
//! extensions et tailles limitées, CSS filtré) avant d'être écrits dans `%APPDATA%\Saturne\mods\<id>\`.
//! Les thèmes ne peuvent changer que l'apparence ; les Apps tournent dans une iframe isolée (voir `web/js/60-store.js`).

use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

pub const DEFAULT_REGISTRY: &str = "https://raw.githubusercontent.com/KYOO-DEVV/saturne-store/main";
/// Droits qu'une App peut demander ; l'utilisateur les valide à l'installation.
pub const PERMISSIONS: [&str; 5] = ["player.read", "player.control", "queue.add", "search", "storage"];
const MAX_FILES: usize = 40;
const MAX_TEXT: usize = 256 * 1024;
const MAX_IMAGE: usize = 4 * 1024 * 1024;
const MAX_TOTAL: usize = 8 * 1024 * 1024;
pub const MAX_MEDIA: usize = 8 * 1024 * 1024;

/// Mode sans mods (`--safe`) : ni thème ni App n'est chargé.
pub static SAFE: AtomicBool = AtomicBool::new(false);
pub fn safe() -> bool {
    SAFE.load(Ordering::Relaxed)
}

/// Dossier des créations intégrées à l'application (aussi le contenu de départ du dépôt `saturne-store`).
pub struct Pack {
    pub files: &'static [(&'static str, &'static [u8])],
}
macro_rules! pack {
    ($id:literal, [$($f:literal),*]) => {
        Pack { files: &[$(($f, include_bytes!(concat!("../store/packages/", $id, "/", $f)))),*] }
    };
}
pub const BUILTIN: &[Pack] = &[
    pack!("neon-oled", ["manifest.json", "settings.json", "theme.css"]),
    pack!("soft-light", ["manifest.json", "settings.json", "theme.css"]),
    pack!("sunset-glass", ["manifest.json", "settings.json", "theme.css", "sunset.png"]),
    pack!("pomodoro", ["manifest.json", "app.js", "app.css", "icon.png", "thumb.png"]),
    pack!("runner-bar", ["manifest.json", "theme.css", "run.gif", "thumb.png"]),
    pack!("album-glow", ["manifest.json", "theme.css", "thumb.png"]),
    pack!("aurora", ["manifest.json", "settings.json", "theme.css", "aurora.gif", "thumb.png"]),
];
pub const SDK_JS: &str = include_str!("../store/sdk.js");

pub fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
pub fn sha256_hex(bytes: &[u8]) -> String {
    hex(&Sha256::digest(bytes))
}

/* ---------- Validation ---------- */
pub fn valid_id(id: &str) -> bool {
    (2..=40).contains(&id.len()) && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-') && !id.starts_with('-') && !id.ends_with('-')
}

pub fn valid_path(p: &str) -> bool {
    !p.is_empty()
        && p.len() <= 80
        && !p.starts_with('/')
        && p.split('/').count() <= 3
        && p.split('/').all(|s| !s.is_empty() && s != "." && s != ".." && s.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-')))
}

fn ext(p: &str) -> String {
    p.rsplit('.').next().unwrap_or("").to_ascii_lowercase()
}

fn is_image_ext(e: &str) -> bool {
    matches!(e, "png" | "jpg" | "jpeg" | "gif" | "webp")
}

pub fn content_type(p: &str) -> &'static str {
    match ext(p).as_str() {
        "css" => "text/css; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "json" => "application/json",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

fn allowed_file(kind: &str, p: &str) -> bool {
    let e = ext(p);
    match kind {
        "theme" | "extension" => matches!(e.as_str(), "css" | "json" | "woff2") || is_image_ext(&e),
        "app" => matches!(e.as_str(), "css" | "js" | "json") || is_image_ext(&e),
        _ => false,
    }
}

/// Filtre le CSS d'un thème : pas d'import, pas d'adresse externe, pas de script déguisé.
/// Seules les images du paquet (adresses relatives) et les images `data:` (hors SVG) sont permises.
pub fn check_css(css: &str) -> Result<(), String> {
    if css.len() > MAX_TEXT {
        return Err("CSS trop volumineux".into());
    }
    if css.contains('\\') {
        return Err("Le caractère « \\ » n'est pas autorisé dans le CSS".into());
    }
    let mut clean = String::with_capacity(css.len());
    let mut rest = css;
    while let Some(i) = rest.find("/*") {
        clean.push_str(&rest[..i]);
        match rest[i + 2..].find("*/") {
            Some(j) => rest = &rest[i + 2 + j + 2..],
            None => {
                rest = "";
                break;
            }
        }
    }
    clean.push_str(rest);
    let l = clean.to_lowercase();
    for bad in ["@import", "expression(", "javascript:", "vbscript:", "behavior:", "-moz-binding", "<", "image-set(", "src(", "image(", "element(", "paint(", "@charset"] {
        if l.contains(bad) {
            return Err(format!("« {bad} » n'est pas autorisé dans le CSS"));
        }
    }
    let mut rest = l.as_str();
    while let Some(i) = rest.find("url(") {
        let after = &rest[i + 4..];
        let end = after.find(')').ok_or("url( sans parenthèse fermante")?;
        let arg = after[..end].trim().trim_matches(|c| c == '"' || c == '\'').trim();
        let ok = if let Some(d) = arg.strip_prefix("data:image/") {
            ["png", "jpeg", "jpg", "gif", "webp"].iter().any(|t| d.starts_with(&format!("{t};")))
        } else {
            arg.starts_with('#') || (!arg.is_empty() && !arg.contains(':') && !arg.starts_with('/') && !arg.contains("..") && !arg.contains("//"))
        };
        if !ok {
            return Err("Les adresses externes (url(…)) ne sont pas autorisées : seules les images du paquet le sont".into());
        }
        rest = &after[end + 1..];
    }
    Ok(())
}

pub struct Meta {
    pub id: String,
    pub kind: String,
    pub version: String,
    pub perms: Vec<String>,
}

fn s_field<'a>(m: &'a Value, k: &str, min: usize, max: usize) -> Result<&'a str, String> {
    let s = m.get(k).and_then(Value::as_str).ok_or(format!("Champ « {k} » manquant"))?.trim();
    if s.chars().count() < min || s.chars().count() > max {
        return Err(format!("Champ « {k} » invalide (longueur)"));
    }
    if s.chars().any(|c| c.is_control()) {
        return Err(format!("Champ « {k} » invalide"));
    }
    Ok(s)
}

pub fn check_manifest(m: &Value) -> Result<Meta, String> {
    let id = s_field(m, "id", 2, 40)?;
    if !valid_id(id) {
        return Err("Identifiant invalide (a-z, 0-9 et tirets)".into());
    }
    s_field(m, "name", 1, 60)?;
    s_field(m, "author", 1, 40)?;
    if let Some(d) = m.get("description") {
        if d.as_str().is_none_or(|s| s.chars().count() > 300) {
            return Err("Description invalide (300 caractères au plus)".into());
        }
    }
    let version = s_field(m, "version", 5, 20)?;
    if version.split('.').count() != 3 || !version.split('.').all(|n| !n.is_empty() && n.len() <= 5 && n.chars().all(|c| c.is_ascii_digit())) {
        return Err("Version invalide (attendu : 1.2.3)".into());
    }
    let kind = s_field(m, "type", 3, 9)?;
    if kind != "theme" && kind != "app" && kind != "extension" {
        return Err("Type inconnu (theme, extension ou app)".into());
    }
    let mut perms = Vec::new();
    if let Some(p) = m.get("permissions") {
        for x in p.as_array().ok_or("« permissions » doit être une liste")? {
            let x = x.as_str().ok_or("Permission invalide")?;
            if !PERMISSIONS.contains(&x) {
                return Err(format!("Permission inconnue : {x}"));
            }
            if !perms.iter().any(|q| q == x) {
                perms.push(x.to_string());
            }
        }
        if kind != "app" && !perms.is_empty() {
            return Err("Seule une App peut demander des permissions".into());
        }
    }
    if let Some(pv) = m.get("preview") {
        let ok = pv.as_array().is_some_and(|a| a.len() <= 4 && a.iter().all(|c| c.as_str().is_some_and(|s| s.len() == 7 && s.starts_with('#') && s[1..].chars().all(|h| h.is_ascii_hexdigit()))));
        if !ok {
            return Err("« preview » : jusqu'à 4 couleurs #rrggbb".into());
        }
    }
    check_extras(m, kind)?;
    Ok(Meta { id: id.to_string(), kind: kind.to_string(), version: version.to_string(), perms })
}

fn ident(s: &str, max: usize) -> bool {
    !s.is_empty() && s.len() <= max && s.chars().next().is_some_and(|c| c.is_ascii_lowercase()) && s.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}
fn num(v: &Value, lo: f64, hi: f64) -> Option<f64> {
    v.as_f64().filter(|n| n.is_finite() && *n >= lo && *n <= hi)
}
fn image_path(p: &str) -> bool {
    valid_path(p) && is_image_ext(&ext(p))
}

pub const ANCHORS: [&str; 6] = ["seekbar", "playbtn", "cover", "bar", "side", "corner"];
pub const BEHAVIORS: [&str; 6] = ["none", "follow", "spin", "bounce", "float", "pulse"];

/// Champs « riches » du manifest : icône, vignette, options réglables par l'utilisateur, décors animés (images/GIF posés sur l'interface).
fn check_extras(m: &Value, kind: &str) -> Result<(), String> {
    for k in ["icon", "thumb"] {
        if let Some(v) = m.get(k) {
            if !v.as_str().is_some_and(image_path) {
                return Err(format!("« {k} » : nom d'une image du paquet (png, jpg, gif, webp)"));
            }
        }
    }
    let mut option_ids: Vec<(String, String)> = Vec::new();
    if let Some(o) = m.get("options") {
        let list = o.as_array().ok_or("« options » doit être une liste")?;
        if list.len() > 12 || (kind == "app" && !list.is_empty()) {
            return Err("« options » : 12 au plus, et réservées aux thèmes et extensions".into());
        }
        for it in list {
            let id = it["id"].as_str().unwrap_or("");
            if !ident(id, 20) || option_ids.iter().any(|(i, _)| i == id) {
                return Err(format!("Option « {id} » : identifiant invalide ou en double (a-z, 0-9, tirets)"));
            }
            let label = it["label"].as_str().unwrap_or("");
            if label.is_empty() || label.chars().count() > 40 || label.chars().any(|c| c.is_control()) {
                return Err(format!("Option « {id} » : libellé de 1 à 40 caractères"));
            }
            let t = it["type"].as_str().unwrap_or("");
            let d = &it["default"];
            let ok = match t {
                "toggle" => d.is_boolean(),
                "range" => {
                    let (lo, hi, st) = (num(&it["min"], -10000.0, 10000.0), num(&it["max"], -10000.0, 10000.0), num(&it["step"], 0.001, 10000.0));
                    let unit_ok = it.get("unit").is_none_or(|u| u.as_str().is_some_and(|u| ["", "px", "%", "s", "ms", "deg", "em"].contains(&u)));
                    matches!((lo, hi, st), (Some(a), Some(b), Some(_)) if a < b) && unit_ok && matches!((num(d, -10000.0, 10000.0), lo, hi), (Some(x), Some(a), Some(b)) if x >= a && x <= b)
                }
                "color" => d.as_str().is_some_and(|s| s.len() == 7 && s.starts_with('#') && s[1..].chars().all(|h| h.is_ascii_hexdigit())),
                "choice" => it["choices"].as_array().is_some_and(|c| {
                    (2..=8).contains(&c.len())
                        && c.iter().all(|x| x["value"].as_str().is_some_and(|v| ident(v, 20)) && x["label"].as_str().is_some_and(|l| !l.is_empty() && l.chars().count() <= 40))
                        && c.iter().any(|x| x["value"] == *d)
                }),
                "image" => d.is_null() || d.as_str() == Some(""),
                _ => false,
            };
            if !ok {
                return Err(format!("Option « {id} » : type ou valeurs invalides (toggle, range, color, choice, image)"));
            }
            option_ids.push((id.to_string(), t.to_string()));
        }
    }
    if let Some(dv) = m.get("decor") {
        let list = dv.as_array().ok_or("« decor » doit être une liste")?;
        if list.len() > 6 || (kind == "app" && !list.is_empty()) {
            return Err("« decor » : 6 au plus, réservé aux thèmes et extensions".into());
        }
        let opt = |s: &str, want: &str| s.strip_prefix("option:").is_some_and(|o| option_ids.iter().any(|(i, t)| i == o && t == want));
        for it in list {
            let anchor = it["anchor"].as_str().unwrap_or("");
            if !ANCHORS.contains(&anchor) {
                return Err(format!("Décor : ancre inconnue « {anchor} » ({})", ANCHORS.join(", ")));
            }
            let img = it["image"].as_str().unwrap_or("");
            if !(image_path(img) || opt(img, "image")) {
                return Err("Décor : « image » = une image du paquet ou option:<id d'une option image>".into());
            }
            match &it["size"] {
                Value::Null => {}
                v if num(v, 8.0, 256.0).is_some() => {}
                Value::String(s) if opt(s, "range") => {}
                _ => return Err("Décor : « size » = 8 à 256, ou option:<id d'une option range>".into()),
            }
            let beh = it.get("behavior").and_then(Value::as_str).unwrap_or("none");
            if !BEHAVIORS.contains(&beh) || (beh == "follow" && anchor != "seekbar") {
                return Err("Décor : comportement inconnu (« follow » seulement sur la barre de progression)".into());
            }
            for k in ["x", "y"] {
                if it.get(k).is_some_and(|v| num(v, -400.0, 400.0).is_none()) {
                    return Err(format!("Décor : « {k} » entre -400 et 400"));
                }
            }
            if it.get("opacity").is_some_and(|v| num(v, 0.0, 1.0).is_none()) || it.get("when").is_some_and(|v| !matches!(v.as_str(), Some("always" | "playing"))) || it.get("layer").is_some_and(|v| !matches!(v.as_str(), Some("above" | "below"))) || it.get("flip").is_some_and(|v| !v.is_boolean()) {
                return Err("Décor : opacity 0 à 1, when always|playing, layer above|below, flip vrai/faux".into());
            }
        }
    }
    Ok(())
}

/// Fichiers cités par le manifest (icône, vignette, images des décors) : ils doivent exister dans le paquet.
fn referenced_files(m: &Value) -> Vec<String> {
    let mut v: Vec<String> = ["icon", "thumb"].iter().filter_map(|k| m[*k].as_str().map(str::to_string)).collect();
    v.extend(m["decor"].as_array().into_iter().flatten().filter_map(|d| d["image"].as_str()).filter(|i| !i.starts_with("option:")).map(str::to_string));
    v
}

/// Vérifie l'ensemble d'un paquet : manifest, nombre/type/taille des fichiers, CSS, réglages.
pub fn check_package(files: &[(String, Vec<u8>)]) -> Result<Meta, String> {
    if files.len() > MAX_FILES {
        return Err("Trop de fichiers dans le paquet".into());
    }
    let mut total = 0usize;
    let mut seen = std::collections::HashSet::new();
    let manifest_bytes = &files.iter().find(|(p, _)| p == "manifest.json").ok_or("manifest.json manquant")?.1;
    let manifest: Value = serde_json::from_slice(manifest_bytes).map_err(|e| format!("manifest.json illisible ({e})"))?;
    let meta = check_manifest(&manifest)?;
    for (p, data) in files {
        if !valid_path(p) || !seen.insert(p.clone()) {
            return Err(format!("Nom de fichier refusé : {p}"));
        }
        if p != "manifest.json" && !allowed_file(&meta.kind, p) {
            return Err(format!("Type de fichier non autorisé : {p}"));
        }
        let limit = if is_image_ext(&ext(p)) || ext(p) == "woff2" { MAX_IMAGE } else { MAX_TEXT };
        if data.len() > limit {
            return Err(format!("Fichier trop volumineux : {p}"));
        }
        total += data.len();
        match ext(p).as_str() {
            "css" => check_css(std::str::from_utf8(data).map_err(|_| format!("{p} n'est pas en UTF-8"))?).map_err(|e| format!("{p} : {e}"))?,
            "json" => {
                let v: Value = serde_json::from_slice(data).map_err(|e| format!("{p} illisible ({e})"))?;
                if p == "settings.json" && !v.is_object() {
                    return Err("settings.json doit être un objet".into());
                }
            }
            "js" if std::str::from_utf8(data).is_err() => return Err(format!("{p} n'est pas en UTF-8")),
            "png" | "jpg" | "jpeg" | "gif" | "webp" if media_ext(data).is_none() => return Err(format!("{p} n'est pas une image valide")),
            _ => {}
        }
    }
    if total > MAX_TOTAL {
        return Err("Paquet trop volumineux (8 Mo au plus)".into());
    }
    let has = |n: &str| files.iter().any(|(p, _)| p == n);
    for r in referenced_files(&manifest) {
        if !has(&r) {
            return Err(format!("Le manifest cite {r}, absent du paquet"));
        }
    }
    match meta.kind.as_str() {
        "extension" if !has("theme.css") && manifest["decor"].as_array().is_none_or(|d| d.is_empty()) => return Err("Une extension contient theme.css et/ou des décors".into()),
        "theme" if !has("theme.css") && !has("settings.json") => return Err("Un thème contient theme.css et/ou settings.json".into()),
        "app" if !has("app.js") => return Err("Une App contient app.js".into()),
        _ => {}
    }
    Ok(meta)
}

/* ---------- Disque ---------- */
pub fn mods_dir(data: &Path) -> PathBuf {
    data.join("mods")
}

/// Écrit un paquet déjà vérifié : d'abord dans un dossier temporaire, puis renommé (pas de paquet à moitié écrit).
pub fn write_package(data: &Path, id: &str, files: &[(String, Vec<u8>)]) -> Result<(), String> {
    if !valid_id(id) {
        return Err("Identifiant invalide".into());
    }
    let root = mods_dir(data);
    let (tmp, dest) = (root.join(format!(".tmp-{id}")), root.join(id));
    let _ = std::fs::remove_dir_all(&tmp);
    std::fs::create_dir_all(&tmp).map_err(|e| format!("Écriture impossible ({e})"))?;
    for (p, bytes) in files {
        let path = tmp.join(p);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&path, bytes).map_err(|e| format!("Écriture impossible ({e})"))?;
    }
    let _ = std::fs::remove_dir_all(&dest);
    std::fs::rename(&tmp, &dest).map_err(|e| format!("Installation impossible ({e})"))
}

pub fn remove(data: &Path, id: &str) -> bool {
    valid_id(id) && std::fs::remove_dir_all(mods_dir(data).join(id)).is_ok()
}

pub fn installed(data: &Path) -> Vec<Value> {
    let mut out = Vec::new();
    let Ok(rd) = std::fs::read_dir(mods_dir(data)) else { return out };
    for e in rd.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if !valid_id(&name) {
            continue;
        }
        let Ok(text) = std::fs::read_to_string(e.path().join("manifest.json")) else { continue };
        let Ok(m) = serde_json::from_str::<Value>(&text) else { continue };
        if check_manifest(&m).is_err() || m["id"] != name {
            continue;
        }
        let has = |f: &str| e.path().join(f).is_file();
        out.push(json!({
            "id": m["id"], "name": m["name"], "author": m["author"], "type": m["type"], "version": m["version"],
            "description": m.get("description").cloned().unwrap_or(json!("")), "permissions": m.get("permissions").cloned().unwrap_or(json!([])),
            "preview": m.get("preview").cloned().unwrap_or(json!([])), "icon": m.get("icon").cloned().unwrap_or(Value::Null), "thumb": m.get("thumb").cloned().unwrap_or(Value::Null),
            "options": m.get("options").cloned().unwrap_or(json!([])), "decor": m.get("decor").cloned().unwrap_or(json!([])),
            "hasCss": has("theme.css"), "hasSettings": has("settings.json"),
        }));
    }
    out.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
    out
}

/// Fichier d'un mod installé (chemin vérifié : jamais en dehors du dossier du mod).
pub fn read_file(data: &Path, id: &str, path: &str) -> Option<Vec<u8>> {
    if !valid_id(id) || !valid_path(path) {
        return None;
    }
    std::fs::read(mods_dir(data).join(id).join(path)).ok()
}

/* ---------- Catalogue ---------- */
fn files_of(pack: &Pack) -> Vec<(String, Vec<u8>)> {
    pack.files.iter().map(|(p, b)| (p.to_string(), b.to_vec())).collect()
}

/// Entrée d'index (celle que voit l'interface) à partir du manifest et de la liste de fichiers.
pub fn entry(manifest: &Value, files: &[(String, usize, String)], builtin: bool) -> Value {
    json!({
        "id": manifest["id"], "name": manifest["name"], "author": manifest["author"], "type": manifest["type"], "version": manifest["version"],
        "description": manifest.get("description").cloned().unwrap_or(json!("")), "tags": manifest.get("tags").cloned().unwrap_or(json!([])),
        "preview": manifest.get("preview").cloned().unwrap_or(json!([])), "permissions": manifest.get("permissions").cloned().unwrap_or(json!([])),
        "icon": manifest.get("icon").cloned().unwrap_or(Value::Null), "thumb": manifest.get("thumb").cloned().unwrap_or(Value::Null),
        "files": files.iter().map(|(p, s, h)| json!({"path": p, "size": s, "sha256": h})).collect::<Vec<_>>(), "builtin": builtin,
    })
}

pub fn builtin_entries() -> Vec<Value> {
    BUILTIN
        .iter()
        .filter_map(|p| {
            let files = files_of(p);
            check_package(&files).ok()?;
            let m: Value = serde_json::from_slice(&files.iter().find(|(n, _)| n == "manifest.json")?.1).ok()?;
            let list: Vec<_> = files.iter().map(|(n, b)| (n.clone(), b.len(), sha256_hex(b))).collect();
            Some(entry(&m, &list, true))
        })
        .collect()
}

pub fn builtin_files(id: &str) -> Option<Vec<(String, Vec<u8>)>> {
    BUILTIN.iter().map(files_of).find(|f| f.iter().any(|(n, b)| n == "manifest.json" && serde_json::from_slice::<Value>(b).is_ok_and(|m| m["id"] == id)))
}

fn remote_entry_ok(e: &Value) -> bool {
    let Some(files) = e["files"].as_array() else { return false };
    if files.is_empty() || files.len() > MAX_FILES || !files.iter().all(|f| f["path"].as_str().is_some_and(valid_path) && f["size"].as_u64().is_some_and(|s| s <= MAX_IMAGE as u64) && f["sha256"].as_str().is_some_and(|h| h.len() == 64 && h.chars().all(|c| c.is_ascii_hexdigit()))) {
        return false;
    }
    check_manifest(e).is_ok()
}

/// Index distant : on ne garde que les entrées bien formées.
pub fn parse_remote_index(v: &Value) -> Vec<Value> {
    v["items"].as_array().into_iter().flatten().filter(|e| remote_entry_ok(e)).take(500).map(|e| {
        let mut e = e.clone();
        e["builtin"] = json!(false);
        e
    }).collect()
}

/// Adresse du dépôt du Store. `SATURNE_STORE_URL` ne sert que pour les tests (serveur local).
pub fn registry() -> String {
    if let Ok(u) = std::env::var("SATURNE_STORE_URL") {
        let u = u.trim_end_matches('/').to_string();
        if u.starts_with("http://127.0.0.1") || u.starts_with("http://localhost") {
            return u;
        }
    }
    DEFAULT_REGISTRY.to_string()
}

pub async fn fetch_index(client: &reqwest::Client) -> Result<Vec<Value>, String> {
    let resp = client.get(format!("{}/index.json", registry())).send().await.map_err(|e| format!("Catalogue injoignable ({e})"))?;
    if !resp.status().is_success() {
        return Err(format!("Catalogue indisponible (HTTP {})", resp.status()));
    }
    if resp.content_length().is_some_and(|n| n > 2_000_000) {
        return Err("Catalogue trop volumineux".into());
    }
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if text.len() > 2_000_000 {
        return Err("Catalogue trop volumineux".into());
    }
    let v: Value = serde_json::from_str(&text).map_err(|e| format!("Catalogue illisible ({e})"))?;
    Ok(parse_remote_index(&v))
}

/// Télécharge UN fichier d'une entrée du catalogue et vérifie sa taille et son sha256.
pub async fn fetch_verified(client: &reqwest::Client, e: &Value, path: &str) -> Result<Vec<u8>, String> {
    let id = e["id"].as_str().unwrap_or("");
    let f = e["files"].as_array().into_iter().flatten().find(|f| f["path"] == path).ok_or("Fichier absent de l'index")?;
    let (size, sha) = (f["size"].as_u64().unwrap_or(0) as usize, f["sha256"].as_str().unwrap_or(""));
    let resp = client.get(format!("{}/packages/{id}/{path}", registry())).send().await.map_err(|er| format!("Téléchargement impossible ({er})"))?;
    if !resp.status().is_success() {
        return Err(format!("{path} : HTTP {}", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|er| format!("Téléchargement interrompu ({er})"))?;
    if bytes.len() != size || sha256_hex(&bytes) != sha.to_lowercase() {
        return Err(format!("{path} ne correspond pas au catalogue (somme de contrôle) : refusé"));
    }
    Ok(bytes.to_vec())
}

/// Télécharge un paquet du catalogue et vérifie chaque fichier (taille et sha256) avant de le rendre.
pub async fn download(client: &reqwest::Client, e: &Value) -> Result<Vec<(String, Vec<u8>)>, String> {
    let mut out = Vec::new();
    for f in e["files"].as_array().ok_or("Paquet sans fichiers")? {
        let path = f["path"].as_str().unwrap_or("");
        out.push((path.to_string(), fetch_verified(client, e, path).await?));
    }
    let meta = check_package(&out)?;
    let same = |a: &Value, b: &str| a.as_str() == Some(b);
    let perms_index: Vec<String> = e["permissions"].as_array().map(|a| a.iter().filter_map(|x| x.as_str().map(str::to_string)).collect()).unwrap_or_default();
    if !same(&e["id"], &meta.id) || !same(&e["type"], &meta.kind) || !same(&e["version"], &meta.version) || perms_index != meta.perms {
        return Err("Le manifest du paquet ne correspond pas au catalogue".into());
    }
    Ok(out)
}

/* ---------- Médias de l'utilisateur (GIF de fond, bannières…) ---------- */
/// Extension d'une image d'après ses premiers octets (jamais d'après son nom).
pub fn media_ext(b: &[u8]) -> Option<&'static str> {
    if b.starts_with(b"GIF87a") || b.starts_with(b"GIF89a") {
        Some("gif")
    } else if b.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some("png")
    } else if b.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("jpg")
    } else if b.len() > 12 && &b[0..4] == b"RIFF" && &b[8..12] == b"WEBP" {
        Some("webp")
    } else {
        None
    }
}

pub fn store_media(data: &Path, bytes: &[u8]) -> Result<String, String> {
    let e = media_ext(bytes).ok_or("Ce fichier n'est pas une image reconnue")?;
    if bytes.len() > MAX_MEDIA {
        return Err("Image trop volumineuse (8 Mo au plus)".into());
    }
    let name = format!("{}.{e}", &sha256_hex(bytes)[..24]);
    let dir = data.join("media");
    std::fs::create_dir_all(&dir).map_err(|er| format!("Écriture impossible ({er})"))?;
    let path = dir.join(&name);
    if !path.exists() {
        std::fs::write(&path, bytes).map_err(|er| format!("Écriture impossible ({er})"))?;
    }
    Ok(name)
}

pub fn read_media(data: &Path, name: &str) -> Option<Vec<u8>> {
    let ok = name.len() <= 40 && name.split('.').count() == 2 && name.chars().all(|c| c.is_ascii_hexdigit() || c == '.' || c.is_ascii_lowercase());
    if !ok {
        return None;
    }
    std::fs::read(data.join("media").join(name)).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn files(list: &[(&str, &str)]) -> Vec<(String, Vec<u8>)> {
        list.iter().map(|(p, t)| (p.to_string(), t.as_bytes().to_vec())).collect()
    }
    const THEME: &str = r##"{"id":"my-theme","name":"Mon thème","author":"moi","version":"1.0.0","type":"theme","preview":["#000000","#ff0000"]}"##;

    #[test]
    fn ids_and_paths() {
        assert!(valid_id("neon-oled") && valid_id("a1"));
        assert!(!valid_id("A1") && !valid_id("-a") && !valid_id("a") && !valid_id("a_b") && !valid_id("../x"));
        assert!(valid_path("theme.css") && valid_path("images/bg.png"));
        for bad in ["", "/etc/passwd", "../x", "a/../b", "a//b", "a\\b", "a/b/c/d", ".hidden/..", "C:/x", "x y"] {
            assert!(!valid_path(bad), "{bad}");
        }
    }

    #[test]
    fn css_filter() {
        assert!(check_css(":root{--accent:#f0f} .a{background:url(images/bg.png)} .b{background:url(\"data:image/png;base64,AAAA\")}").is_ok());
        for bad in [
            "@import url(x.css);", "@IMPORT 'x.css';", ".a{background:url(http://evil.test/a.png)}", ".a{background:url(//evil.test/a.png)}",
            ".a{background:url('https://evil.test/a')}", ".a{background:url(data:image/svg+xml;base64,AAAA)}", ".a{background:url(../x.png)}",
            ".a{background:\\75rl(http://x)}", ".a{width:expression(alert(1))}", ".a{background:image-set(\"http://evil.test/a.png\" 1x)}",
            ".a{background:url(/api/data)}", "</style><script>x</script>", ".a{background:url(javascript:alert(1))}", ".a{background:URL( HTTP://evil.test )}",
        ] {
            assert!(check_css(bad).is_err(), "devrait être refusé : {bad}");
        }
        assert!(check_css("/* url(http://x) */ .a{color:red}").is_ok(), "un commentaire n'est pas du code");
    }

    #[test]
    fn manifests() {
        assert!(check_manifest(&serde_json::from_str(THEME).unwrap()).is_ok());
        for bad in [
            r#"{"id":"x","name":"a","author":"b","version":"1.0.0","type":"theme"}"#,
            r#"{"id":"ok-id","name":"a","author":"b","version":"1.0","type":"theme"}"#,
            r#"{"id":"ok-id","name":"a","author":"b","version":"1.0.0","type":"plugin"}"#,
            r#"{"id":"ok-id","name":"a","author":"b","version":"1.0.0","type":"app","permissions":["fs.write"]}"#,
            r#"{"id":"ok-id","name":"a","author":"b","version":"1.0.0","type":"theme","permissions":["search"]}"#,
            r#"{"id":"ok-id","name":"a","author":"b","version":"1.0.0","type":"theme","preview":["red"]}"#,
        ] {
            assert!(check_manifest(&serde_json::from_str(bad).unwrap()).is_err(), "{bad}");
        }
    }

    #[test]
    fn packages() {
        let ok = files(&[("manifest.json", THEME), ("theme.css", ":root{--accent:#f0f}"), ("settings.json", "{\"bg\":\"oled\"}")]);
        assert!(check_package(&ok).is_ok());
        assert!(check_package(&files(&[("theme.css", "a{}")])).is_err(), "manifest manquant");
        assert!(check_package(&files(&[("manifest.json", THEME)])).is_err(), "thème vide");
        assert!(check_package(&files(&[("manifest.json", THEME), ("theme.css", "a{}"), ("run.js", "alert(1)")])).is_err(), "un thème n'a pas de JS");
        assert!(check_package(&files(&[("manifest.json", THEME), ("theme.css", "@import 'x';")])).is_err());
        assert!(check_package(&files(&[("manifest.json", THEME), ("theme.css", "a{}"), ("../evil.css", "a{}")])).is_err());
        assert!(check_package(&files(&[("manifest.json", THEME), ("theme.css", "a{}"), ("settings.json", "[1]")])).is_err());
        assert!(check_package(&files(&[("manifest.json", THEME), ("theme.css", "a{}"), ("bg.png", "pas une image")])).is_err());
        let app = r#"{"id":"my-app","name":"A","author":"b","version":"1.0.0","type":"app","permissions":["storage"]}"#;
        assert!(check_package(&files(&[("manifest.json", app)])).is_err(), "app.js manquant");
        assert!(check_package(&files(&[("manifest.json", app), ("app.js", "console.log(1)")])).is_ok());
        let big = "a".repeat(MAX_TEXT + 1);
        assert!(check_package(&files(&[("manifest.json", app), ("app.js", &big)])).is_err());
    }

    const EXT: &str = r##"{"id":"runner","name":"Runner","author":"moi","version":"1.0.0","type":"extension","icon":"icon.png","thumb":"thumb.png",
      "options":[{"id":"size","type":"range","label":"Taille","min":16,"max":64,"step":1,"unit":"px","default":28},{"id":"glow","type":"toggle","label":"Lueur","default":true},
                 {"id":"tint","type":"color","label":"Couleur","default":"#ff2e93"},{"id":"mode","type":"choice","label":"Style","choices":[{"value":"a","label":"A"},{"value":"b","label":"B"}],"default":"a"},
                 {"id":"sprite","type":"image","label":"Mon image"}],
      "decor":[{"id":"r","anchor":"seekbar","image":"run.gif","size":"option:size","behavior":"follow","y":-6,"when":"playing"},{"id":"s","anchor":"corner","image":"option:sprite","size":64,"behavior":"float","opacity":0.8}]}"##;
    const PNG: &[u8] = &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0];
    const GIF: &[u8] = b"GIF89a-test";

    fn bin(list: &[(&str, &[u8])]) -> Vec<(String, Vec<u8>)> {
        list.iter().map(|(p, b)| (p.to_string(), b.to_vec())).collect()
    }

    #[test]
    fn extensions_with_options_and_decor() {
        let ok = bin(&[("manifest.json", EXT.as_bytes()), ("icon.png", PNG), ("thumb.png", PNG), ("run.gif", GIF)]);
        assert_eq!(check_package(&ok).map(|m| m.kind), Ok("extension".to_string()));
        let without = |name: &str| ok.iter().filter(|(p, _)| p != name).cloned().collect::<Vec<_>>();
        assert!(check_package(&without("run.gif")).is_err(), "image de décor absente du paquet");
        assert!(check_package(&without("icon.png")).is_err(), "icône absente du paquet");
        let bad = |from: &str, to: &str| {
            let mut f = ok.clone();
            f[0].1 = EXT.replace(from, to).into_bytes();
            check_package(&f).is_err()
        };
        assert!(bad("\"anchor\":\"seekbar\"", "\"anchor\":\"ciel\""), "ancre inconnue");
        assert!(bad("\"behavior\":\"follow\"", "\"behavior\":\"teleport\""), "comportement inconnu");
        assert!(bad("\"size\":\"option:size\"", "\"size\":\"option:glow\""), "size doit citer une option range");
        assert!(bad("\"size\":64", "\"size\":4000"), "taille hors limites");
        assert!(bad("\"y\":-6", "\"y\":9999"), "décalage hors limites");
        assert!(bad("\"image\":\"option:sprite\"", "\"image\":\"option:glow\""), "image doit citer une option image");
        assert!(bad("\"default\":28", "\"default\":200"), "défaut hors de la plage");
        assert!(bad("\"default\":\"a\"", "\"default\":\"zzz\""), "défaut hors des choix");
        assert!(bad("\"icon\":\"icon.png\"", "\"icon\":\"../icon.png\""), "chemin d'icône dangereux");
        assert!(bad("\"icon\":\"icon.png\"", "\"icon\":\"icon.js\""), "l'icône est une image");
        assert!(bad("\"extension\"", "\"extension\",\"permissions\":[\"search\"]"), "une extension n'a pas de permission");
        assert!(bad("\"type\":\"extension\"", "\"type\":\"app\""), "une App n'a ni options ni décors");
        // « follow » n'a de sens que sur la barre de progression
        assert!(bad("\"behavior\":\"float\"", "\"behavior\":\"follow\""), "follow n'existe que sur la barre de progression");
        // une extension vide est refusée
        let empty = r##"{"id":"vide","name":"V","author":"a","version":"1.0.0","type":"extension"}"##;
        assert!(check_package(&bin(&[("manifest.json", empty.as_bytes())])).is_err());
        assert!(check_package(&bin(&[("manifest.json", empty.as_bytes()), ("theme.css", b"a{}")])).is_ok());
    }

    #[test]
    fn builtin_packages_are_valid_and_listed() {
        let list = builtin_entries();
        assert_eq!(list.len(), BUILTIN.len(), "chaque paquet intégré doit passer la validation");
        for e in &list {
            let id = e["id"].as_str().unwrap();
            assert!(builtin_files(id).is_some(), "{id}");
            assert!(e["files"].as_array().unwrap().iter().all(|f| f["sha256"].as_str().unwrap().len() == 64));
        }
    }

    #[test]
    fn install_list_read_remove() {
        let dir = std::env::temp_dir().join(format!("saturne-mods-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let f = files(&[("manifest.json", THEME), ("theme.css", ":root{--accent:#f0f}"), ("images/a.png", "x")]);
        assert!(check_package(&f).is_err(), "une fausse image est refusée");
        let f = files(&[("manifest.json", THEME), ("theme.css", ":root{--accent:#f0f}")]);
        write_package(&dir, "my-theme", &f).unwrap();
        let l = installed(&dir);
        assert_eq!((l.len(), l[0]["id"].as_str(), l[0]["hasCss"].as_bool()), (1, Some("my-theme"), Some(true)));
        assert!(read_file(&dir, "my-theme", "theme.css").is_some());
        assert!(read_file(&dir, "my-theme", "../../Saturne.exe").is_none());
        assert!(read_file(&dir, "..", "manifest.json").is_none());
        assert!(!remove(&dir, "../mods"));
        assert!(remove(&dir, "my-theme") && installed(&dir).is_empty());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn remote_index_keeps_only_well_formed_entries() {
        let good = json!({"id":"cool-theme","name":"Cool","author":"x","version":"1.0.0","type":"theme","files":[{"path":"theme.css","size":10,"sha256":"a".repeat(64)}]});
        let bad_sha = json!({"id":"cool-two","name":"Cool","author":"x","version":"1.0.0","type":"theme","files":[{"path":"theme.css","size":10,"sha256":"zz"}]});
        let bad_path = json!({"id":"cool-3","name":"Cool","author":"x","version":"1.0.0","type":"theme","files":[{"path":"../x.css","size":10,"sha256":"a".repeat(64)}]});
        let kept = parse_remote_index(&json!({"items":[good, bad_sha, bad_path, "nope", {"id":"x"}]}));
        assert_eq!(kept.len(), 1);
        assert_eq!(kept[0]["builtin"], json!(false));
    }

    #[test]
    fn media_is_recognised_by_content() {
        assert_eq!(media_ext(b"GIF89a....."), Some("gif"));
        assert_eq!(media_ext(&[0xFF, 0xD8, 0xFF, 0xE0, 0]), Some("jpg"));
        assert_eq!(media_ext(b"<svg onload=alert(1)>"), None);
        assert_eq!(media_ext(b"MZ\x90\x00"), None);
        let dir = std::env::temp_dir().join(format!("saturne-media-{}", std::process::id()));
        let name = store_media(&dir, b"GIF89a-test").unwrap();
        assert!(name.ends_with(".gif") && read_media(&dir, &name).is_some());
        assert!(read_media(&dir, "../x.gif").is_none() && read_media(&dir, "a.b.c").is_none());
        assert!(store_media(&dir, b"not an image").is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
