//! Saturne — application de streaming musical (Rust).
//!
//! Un serveur local (axum) gère les comptes, les données de chaque utilisateur et la recherche YouTube sans clé.
//! Une fenêtre native (wry/tao, WebView2) affiche l'interface. `--serve` lance seulement le serveur (pour un navigateur).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod icon;
mod public;
mod store;
mod update;
mod yt;

use axum::{
    Json, Router,
    body::Body,
    extract::{DefaultBodyLimit, Query, State},
    http::{HeaderMap, HeaderValue, Request, StatusCode, header},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
};
use serde_json::{Value, json};
use std::{
    collections::{HashMap, HashSet},
    future::Future,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use store::{Store, User};

const INDEX_HTML: &str = include_str!("../web/index.html");
const FONT_LATIN: &[u8] = include_bytes!("../assets/jakarta-latin.woff2");
const FONT_LATIN_EXT: &[u8] = include_bytes!("../assets/jakarta-latin-ext.woff2");
const COOKIE: &str = "saturne_session";

#[derive(Clone)]
struct App {
    store: Arc<Store>,
    http: reqwest::Client,
    gh: reqwest::Client,
    data_dir: PathBuf,
    /// Titres dont on sait s'ils peuvent être lus dans un lecteur intégré (true) ou non (false).
    emb: Arc<Mutex<HashMap<String, bool>>>,
    /// Limite les vérifications simultanées auprès de YouTube.
    sem: Arc<tokio::sync::Semaphore>,
    cache: Arc<Mutex<HashMap<String, (Instant, Value)>>>,
    port: u16,
    dev_html: Option<PathBuf>,
}

fn err(code: StatusCode, msg: &str) -> Response {
    (code, Json(json!({ "error": msg }))).into_response()
}

fn user_json(u: &User) -> Value {
    json!({ "username": u.username, "display": u.display, "avatar": u.avatar })
}

fn session_token(h: &HeaderMap) -> Option<String> {
    let raw = h.get(header::COOKIE)?.to_str().ok()?;
    raw.split(';').filter_map(|p| p.trim().strip_prefix(&format!("{COOKIE}="))).next().map(str::to_string)
}

impl App {
    fn user(&self, h: &HeaderMap) -> Option<User> {
        self.store.session_user(&session_token(h)?)
    }

    async fn cached<F, Fut>(&self, key: String, ttl: Duration, make: F) -> Result<Value, String>
    where
        F: FnOnce() -> Fut,
        Fut: Future<Output = Result<Value, String>>,
    {
        if let Some((at, v)) = self.cache.lock().unwrap().get(&key) {
            if at.elapsed() < ttl {
                return Ok(v.clone());
            }
        }
        let v = make().await?;
        let mut c = self.cache.lock().unwrap();
        if c.len() > 400 {
            c.clear();
        }
        c.insert(key, (Instant::now(), v.clone()));
        Ok(v)
    }
}

fn login_cookie(token: &str) -> String {
    format!("{COOKIE}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000")
}

/* ---------- Sécurité : le serveur n'accepte que des requêtes venant de l'application elle-même ---------- */
async fn guard(State(app): State<App>, req: Request<Body>, next: Next) -> Response {
    let allowed = [format!("127.0.0.1:{}", app.port), format!("localhost:{}", app.port)];
    let host_ok = req.headers().get(header::HOST).and_then(|h| h.to_str().ok()).is_some_and(|h| allowed.iter().any(|a| a == h));
    let origin_ok = match req.headers().get(header::ORIGIN).and_then(|o| o.to_str().ok()) {
        None => true,
        Some(o) => allowed.iter().any(|a| o == format!("http://{a}")),
    };
    if !host_ok || !origin_ok {
        return err(StatusCode::FORBIDDEN, "Requête refusée");
    }
    next.run(req).await
}

/* ---------- Pages ---------- */
async fn index(State(app): State<App>) -> Response {
    let html = match &app.dev_html {
        Some(p) => std::fs::read_to_string(p).unwrap_or_else(|e| format!("Impossible de lire {}: {e}", p.display())),
        None => INDEX_HTML.to_string(),
    };
    ([(header::CACHE_CONTROL, "no-store")], Html(html)).into_response()
}

/* ---------- Comptes ---------- */
async fn me(State(app): State<App>, h: HeaderMap) -> Response {
    Json(json!({ "user": app.user(&h).as_ref().map(user_json) })).into_response()
}

fn creds(body: &Value) -> (String, String) {
    let s = |k: &str| body.get(k).and_then(Value::as_str).unwrap_or("").to_string();
    (s("username").trim().to_string(), s("password"))
}

async fn register(State(app): State<App>, Json(body): Json<Value>) -> Response {
    let (username, password) = creds(&body);
    if !store::valid_username(&username) {
        return err(StatusCode::BAD_REQUEST, "Nom d'utilisateur : 3 à 24 caractères (lettres, chiffres, _ . -)");
    }
    if password.chars().count() < 8 || password.len() > 200 {
        return err(StatusCode::BAD_REQUEST, "Le mot de passe doit faire au moins 8 caractères");
    }
    let display = body.get("display").and_then(Value::as_str).map(str::trim).filter(|d| !d.is_empty()).unwrap_or(&username).chars().take(40).collect::<String>();
    if app.store.find(&username).is_some() {
        return err(StatusCode::CONFLICT, "Ce nom d'utilisateur est déjà pris");
    }
    let hash = match tokio::task::spawn_blocking(move || {
        use argon2::{Argon2, password_hash::PasswordHasher};
        Argon2::default().hash_password(password.as_bytes()).map(|h| h.to_string()).map_err(|e| e.to_string())
    })
    .await
    {
        Ok(Ok(h)) => h,
        _ => return err(StatusCode::INTERNAL_SERVER_ERROR, "Impossible de protéger le mot de passe"),
    };
    match app.store.register(&username, &display, hash) {
        Ok(user) => {
            let token = app.store.new_session(&user.username);
            ([(header::SET_COOKIE, login_cookie(&token))], Json(json!({ "user": user_json(&user) }))).into_response()
        }
        Err(m) => err(StatusCode::CONFLICT, m),
    }
}

/// Vérifie un mot de passe (Argon2id, hors du thread asynchrone).
async fn password_ok(user: &User, password: String) -> bool {
    let hash = user.hash.clone();
    tokio::task::spawn_blocking(move || {
        use argon2::{
            Argon2,
            password_hash::{PasswordVerifier, phc::PasswordHash},
        };
        PasswordHash::new(&hash).map(|p| Argon2::default().verify_password(password.as_bytes(), &p).is_ok()).unwrap_or(false)
    })
    .await
    .unwrap_or(false)
}

async fn hash_password(password: String) -> Result<String, ()> {
    tokio::task::spawn_blocking(move || {
        use argon2::{Argon2, password_hash::PasswordHasher};
        Argon2::default().hash_password(password.as_bytes()).map(|h| h.to_string()).map_err(|_| ())
    })
    .await
    .map_err(|_| ())?
}

/// Contrôle commun aux actions sensibles : session valide, essais limités, mot de passe correct.
async fn confirm(app: &App, h: &HeaderMap, password: &str) -> Result<User, Response> {
    let Some(user) = app.user(h) else { return Err(err(StatusCode::UNAUTHORIZED, "Connexion requise")) };
    if let Some(wait) = app.store.locked_for(&user.username) {
        return Err(err(StatusCode::TOO_MANY_REQUESTS, &format!("Trop d'essais. Réessaie dans {wait} s.")));
    }
    if !password_ok(&user, password.to_string()).await {
        app.store.note_failure(&user.username);
        return Err(err(StatusCode::FORBIDDEN, "Mot de passe incorrect"));
    }
    app.store.clear_failures(&user.username);
    Ok(user)
}

async fn change_password(State(app): State<App>, h: HeaderMap, Json(body): Json<Value>) -> Response {
    let (current, new) = (body["current"].as_str().unwrap_or(""), body["new"].as_str().unwrap_or("").to_string());
    if new.chars().count() < 8 || new.len() > 200 {
        return err(StatusCode::BAD_REQUEST, "Le nouveau mot de passe doit faire au moins 8 caractères");
    }
    let user = match confirm(&app, &h, current).await {
        Ok(u) => u,
        Err(r) => return r,
    };
    let Ok(hash) = hash_password(new).await else { return err(StatusCode::INTERNAL_SERVER_ERROR, "Impossible de protéger le mot de passe") };
    app.store.set_password(&user.username, hash, &session_token(&h).unwrap_or_default());
    Json(json!({ "ok": true })).into_response()
}

async fn change_username(State(app): State<App>, h: HeaderMap, Json(body): Json<Value>) -> Response {
    let (new, password) = (body["username"].as_str().unwrap_or("").trim().to_string(), body["password"].as_str().unwrap_or(""));
    let user = match confirm(&app, &h, password).await {
        Ok(u) => u,
        Err(r) => return r,
    };
    match app.store.rename_user(&user.username, &new) {
        Ok(u) => Json(json!({ "user": user_json(&u) })).into_response(),
        Err(m) => err(StatusCode::CONFLICT, m),
    }
}

async fn delete_account(State(app): State<App>, h: HeaderMap, Json(body): Json<Value>) -> Response {
    let user = match confirm(&app, &h, body["password"].as_str().unwrap_or("")).await {
        Ok(u) => u,
        Err(r) => return r,
    };
    app.store.delete_user(&user.username);
    ([(header::SET_COOKIE, format!("{COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"))], Json(json!({ "ok": true }))).into_response()
}

async fn about(State(app): State<App>, h: HeaderMap) -> Response {
    if app.user(&h).is_none() {
        return err(StatusCode::UNAUTHORIZED, "Connexion requise");
    }
    let (_, repo) = update::config();
    Json(json!({ "version": update::CURRENT, "dataDir": app.data_dir.display().to_string(), "repo": repo })).into_response()
}

/* ---------- Mises à jour ---------- */
async fn update_check(State(app): State<App>, h: HeaderMap) -> Response {
    if app.user(&h).is_none() {
        return err(StatusCode::UNAUTHORIZED, "Connexion requise");
    }
    match update::latest(&app.gh).await {
        Ok(r) => Json(json!({
            "current": update::CURRENT, "latest": r.version(), "available": update::is_newer(r.version(), update::CURRENT),
            "notes": r.notes, "url": r.page, "canInstall": r.can_install(), "size": r.asset_size
        }))
        .into_response(),
        Err(e) => err(StatusCode::BAD_GATEWAY, &e),
    }
}

async fn update_install(State(app): State<App>, h: HeaderMap) -> Response {
    if app.user(&h).is_none() {
        return err(StatusCode::UNAUTHORIZED, "Connexion requise");
    }
    let rel = match update::latest(&app.gh).await {
        Ok(r) => r,
        Err(e) => return err(StatusCode::BAD_GATEWAY, &e),
    };
    if !update::is_newer(rel.version(), update::CURRENT) {
        return err(StatusCode::CONFLICT, "Saturne est déjà à jour");
    }
    let bytes = match update::download(&app.gh, &rel).await {
        Ok(b) => b,
        Err(e) => return err(StatusCode::BAD_GATEWAY, &e),
    };
    let exe = match tokio::task::spawn_blocking(move || update::apply(&bytes)).await {
        Ok(Ok(p)) => p,
        Ok(Err(e)) => return err(StatusCode::INTERNAL_SERVER_ERROR, &e),
        Err(_) => return err(StatusCode::INTERNAL_SERVER_ERROR, "Mise à jour interrompue"),
    };
    // On laisse le temps à la réponse de partir, puis on relance la nouvelle version.
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(700));
        update::restart(&exe)
    });
    Json(json!({ "ok": true, "version": rel.version() })).into_response()
}

async fn login(State(app): State<App>, Json(body): Json<Value>) -> Response {
    let (username, password) = creds(&body);
    if let Some(wait) = app.store.locked_for(&username) {
        return err(StatusCode::TOO_MANY_REQUESTS, &format!("Trop d'essais. Réessaie dans {wait} s."));
    }
    let bad = || err(StatusCode::UNAUTHORIZED, "Nom d'utilisateur ou mot de passe incorrect");
    let Some(user) = app.store.find(&username) else {
        app.store.note_failure(&username);
        return bad();
    };
    let hash = user.hash.clone();
    let ok = tokio::task::spawn_blocking(move || {
        use argon2::{
            Argon2,
            password_hash::{PasswordVerifier, phc::PasswordHash},
        };
        PasswordHash::new(&hash).map(|p| Argon2::default().verify_password(password.as_bytes(), &p).is_ok()).unwrap_or(false)
    })
    .await
    .unwrap_or(false);
    if !ok {
        app.store.note_failure(&username);
        return bad();
    }
    app.store.clear_failures(&username);
    let token = app.store.new_session(&user.username);
    ([(header::SET_COOKIE, login_cookie(&token))], Json(json!({ "user": user_json(&user) }))).into_response()
}

async fn logout(State(app): State<App>, h: HeaderMap) -> Response {
    if let Some(t) = session_token(&h) {
        app.store.end_session(&t);
    }
    ([(header::SET_COOKIE, format!("{COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"))], Json(json!({ "ok": true }))).into_response()
}

async fn update_me(State(app): State<App>, h: HeaderMap, Json(body): Json<Value>) -> Response {
    let Some(user) = app.user(&h) else { return err(StatusCode::UNAUTHORIZED, "Connexion requise") };
    let display = match body.get("display").and_then(Value::as_str).map(str::trim) {
        Some("") => return err(StatusCode::BAD_REQUEST, "Le nom affiché ne peut pas être vide"),
        Some(d) => Some(d.chars().take(40).collect::<String>()),
        None => None,
    };
    let avatar = match body.get("avatar").and_then(Value::as_str) {
        Some(a) if a.is_empty() => Some(String::new()),
        Some(a) if a.starts_with("data:image/") && a.len() <= 600_000 => Some(a.to_string()),
        Some(_) => return err(StatusCode::BAD_REQUEST, "Image de profil invalide ou trop lourde"),
        None => None,
    };
    match app.store.update_profile(&user.username, display, avatar) {
        Some(u) => Json(json!({ "user": user_json(&u) })).into_response(),
        None => err(StatusCode::NOT_FOUND, "Compte introuvable"),
    }
}

async fn get_data(State(app): State<App>, h: HeaderMap) -> Response {
    let Some(user) = app.user(&h) else { return err(StatusCode::UNAUTHORIZED, "Connexion requise") };
    ([(header::CONTENT_TYPE, "application/json")], app.store.read_data(&user.username)).into_response()
}

async fn put_data(State(app): State<App>, h: HeaderMap, body: String) -> Response {
    let Some(user) = app.user(&h) else { return err(StatusCode::UNAUTHORIZED, "Connexion requise") };
    if !serde_json::from_str::<Value>(&body).is_ok_and(|v| v.is_object()) {
        return err(StatusCode::BAD_REQUEST, "Données invalides");
    }
    match app.store.write_data(&user.username, &body) {
        Ok(()) => Json(json!({ "ok": true })).into_response(),
        Err(e) => err(StatusCode::INTERNAL_SERVER_ERROR, &format!("Écriture impossible : {e}")),
    }
}

/* ---------- Polices embarquées ---------- */
async fn font(axum::extract::Path(name): axum::extract::Path<String>) -> Response {
    let bytes = match name.as_str() {
        "jakarta-latin.woff2" => FONT_LATIN,
        "jakarta-latin-ext.woff2" => FONT_LATIN_EXT,
        _ => return StatusCode::NOT_FOUND.into_response(),
    };
    ([(header::CONTENT_TYPE, "font/woff2"), (header::CACHE_CONTROL, "public, max-age=31536000, immutable")], bytes).into_response()
}

/* ---------- Lisibilité des titres ---------- */
/// Un titre est « lisible » si YouTube autorise son intégration (oEmbed ≠ 401/403/404). Résultat gardé 24 h.
async fn embeddable(app: &App, id: &str) -> bool {
    if let Some(v) = app.emb.lock().unwrap().get(id) {
        return *v;
    }
    let ok = {
        let _permit = app.sem.acquire().await.ok();
        let url = format!("https://www.youtube.com/oembed?format=json&url={}", urlenc(&format!("https://www.youtube.com/watch?v={id}")));
        match app.http.get(&url).send().await {
            Ok(r) => !matches!(r.status().as_u16(), 401 | 403 | 404),
            Err(_) => true, // réseau incertain : on ne bloque pas le titre
        }
    };
    let mut c = app.emb.lock().unwrap();
    if c.len() > 5000 {
        c.clear();
    }
    c.insert(id.to_string(), ok);
    ok
}

async fn filter_embeddable(app: &App, tracks: Vec<yt::Track>) -> Vec<yt::Track> {
    let mut set = tokio::task::JoinSet::new();
    for (i, t) in tracks.iter().enumerate() {
        let (a, id) = (app.clone(), t.id.clone());
        set.spawn(async move { (i, embeddable(&a, &id).await) });
    }
    let mut ok = vec![true; tracks.len()];
    while let Some(Ok((i, v))) = set.join_next().await {
        ok[i] = v;
    }
    tracks.into_iter().zip(ok).filter(|(_, v)| *v).map(|(t, _)| t).collect()
}

/// Autre version lisible d'un titre qui ne se lance pas (autre mise en ligne du même morceau).
async fn api_alt(State(app): State<App>, Query(q): Q) -> Response {
    let valid = |s: &str| s.len() == 11 && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');
    let id = q.get("id").cloned().unwrap_or_default();
    if !valid(&id) {
        return err(StatusCode::BAD_REQUEST, "Identifiant de vidéo invalide");
    }
    let clip = |k: &str| q.get(k).map(|s| s.trim().chars().take(200).collect::<String>()).unwrap_or_default();
    let (title, channel) = (clip("title"), clip("channel"));
    if title.is_empty() {
        return err(StatusCode::BAD_REQUEST, "Titre manquant");
    }
    let dur: u32 = q.get("dur").and_then(|d| d.parse().ok()).unwrap_or(0);
    let skip: HashSet<String> = q.get("skip").map(|s| s.split(',').filter(|x| valid(x)).map(str::to_string).collect()).unwrap_or_default();
    let query = format!("{} {}", yt::clean_title(&title), channel).trim().to_string();
    let list = match search_videos(&app, &query, "").await {
        Ok(v) => v,
        Err(e) => return fail(e),
    };
    for t in list.as_array().into_iter().flatten().filter_map(track_from).take(10) {
        if t.id == id || skip.contains(&t.id) {
            continue;
        }
        if let (true, Some(d)) = (dur > 0, t.duration) {
            if d.abs_diff(dur) > (dur / 5).max(25) {
                continue; // durée trop différente : probablement un autre morceau
            }
        }
        if embeddable(&app, &t.id).await {
            return Json(json!(t)).into_response();
        }
    }
    err(StatusCode::NOT_FOUND, "Aucune autre version lisible trouvée")
}

/* ---------- Playlists publiques ---------- */
async fn api_public(State(app): State<App>, h: HeaderMap) -> Response {
    let Some(user) = app.user(&h) else { return err(StatusCode::UNAUTHORIZED, "Connexion requise") };
    Json(json!({ "items": public::list(&app.store, &user.username) })).into_response()
}

async fn api_public_playlist(State(app): State<App>, h: HeaderMap, Query(q): Q) -> Response {
    if app.user(&h).is_none() {
        return err(StatusCode::UNAUTHORIZED, "Connexion requise");
    }
    let (owner, id) = (q.get("owner").map(String::as_str).unwrap_or(""), q.get("id").map(String::as_str).unwrap_or(""));
    if !store::valid_username(owner) || id.len() > 64 {
        return err(StatusCode::BAD_REQUEST, "Playlist invalide");
    }
    match public::get(&app.store, owner, id) {
        Some(p) => Json(json!({ "playlist": p })).into_response(),
        None => err(StatusCode::NOT_FOUND, "Cette playlist n'existe pas ou n'est plus publique"),
    }
}

/* ---------- Recherche YouTube ---------- */
type Q = Query<HashMap<String, String>>;

fn region(q: &HashMap<String, String>) -> String {
    q.get("gl").filter(|g| g.len() == 2 && g.chars().all(|c| c.is_ascii_alphabetic())).map(|g| g.to_uppercase()).unwrap_or_default()
}

fn results_url(query: &str, sp: &str, gl: &str) -> String {
    let mut u = format!("https://www.youtube.com/results?search_query={}&sp={sp}&hl=fr", urlenc(query));
    if !gl.is_empty() {
        u.push_str(&format!("&gl={gl}"));
    }
    u
}

fn urlenc(s: &str) -> String {
    s.bytes().map(|b| if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'~') { (b as char).to_string() } else { format!("%{b:02X}") }).collect()
}

fn fail(e: String) -> Response {
    err(StatusCode::BAD_GATEWAY, &e)
}

async fn search_videos(app: &App, q: &str, gl: &str) -> Result<Value, String> {
    let (q, gl) = (q.to_string(), gl.to_string());
    app.cached(format!("sv|{gl}|{q}"), Duration::from_secs(1800), || async {
        // D'abord les vidéos de moins de 4 minutes (surtout des chansons). Si ça ne suffit pas (lo-fi, jazz…), on ajoute toutes les vidéos.
        let short = match yt::get(&app.http, &results_url(&q, yt::SP_SHORT, &gl)).await {
            Ok(h) => yt::search_videos(&h)?,
            Err(e) if e == yt::BLOCKED_MSG => return Err(e),
            Err(_) => vec![],
        };
        let enough = short.iter().filter(|t| matches!(t.duration, Some(d) if (60..=900).contains(&d))).count() >= 10;
        let mut list = short;
        if !enough {
            list.extend(yt::search_videos(&yt::get(&app.http, &results_url(&q, yt::SP_VIDEO, &gl)).await?)?);
        }
        Ok(json!(yt::songs_or_mixes(list)))
    })
    .await
}

async fn search_channels(app: &App, q: &str) -> Result<Value, String> {
    let q = q.to_string();
    app.cached(format!("sc|{q}"), Duration::from_secs(6 * 3600), || async { Ok(json!(yt::search_channels(&yt::get(&app.http, &results_url(&q, yt::SP_CHANNEL, "")).await?)?)) }).await
}

async fn api_search(State(app): State<App>, Query(q): Q) -> Response {
    let text = q.get("q").map(|s| s.trim().chars().take(200).collect::<String>()).unwrap_or_default();
    if text.is_empty() {
        return err(StatusCode::BAD_REQUEST, "Recherche vide");
    }
    let res = if q.get("type").is_some_and(|t| t == "channel") { search_channels(&app, &text).await } else { search_videos(&app, &text, &region(&q)).await };
    match res {
        Ok(items) => Json(json!({ "items": items })).into_response(),
        Err(e) => fail(e),
    }
}

async fn api_channel(State(app): State<App>, Query(q): Q) -> Response {
    let id = q.get("id").cloned().unwrap_or_default();
    if id.len() != 24 || !id.starts_with("UC") || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
        return err(StatusCode::BAD_REQUEST, "Identifiant de chaîne invalide");
    }
    let res = app
        .cached(format!("ch|{id}"), Duration::from_secs(3600), || async {
            let page = yt::channel_page(&yt::get(&app.http, &format!("https://www.youtube.com/channel/{id}/videos?hl=fr")).await?)?;
            let name = page.info["name"].as_str().unwrap_or("").to_string();
            // Les titres les plus pertinents de la chaîne passent devant les derniers envois.
            let top: Vec<yt::Track> = match search_videos(&app, &name, "").await {
                Ok(v) => serde_json::from_value::<Vec<Value>>(v).unwrap_or_default().into_iter().filter(|t| t["channelId"] == id.as_str()).filter_map(|t| track_from(&t)).collect(),
                Err(_) => vec![],
            };
            let mut seen = HashSet::new();
            let tracks: Vec<yt::Track> = top.into_iter().chain(page.tracks).filter(|t| seen.insert(t.id.clone())).take(40).collect();
            let tracks = filter_embeddable(&app, tracks).await;
            Ok(json!({ "info": page.info, "tracks": tracks }))
        })
        .await;
    match res {
        Ok(v) => Json(v).into_response(),
        Err(e) => fail(e),
    }
}

fn track_from(v: &Value) -> Option<yt::Track> {
    Some(yt::Track {
        id: v["id"].as_str()?.to_string(),
        title: v["title"].as_str()?.to_string(),
        channel: v["channel"].as_str().unwrap_or("").to_string(),
        channel_id: v["channelId"].as_str().unwrap_or("").to_string(),
        thumb: v["thumb"].as_str().unwrap_or("").to_string(),
        duration: v["duration"].as_u64().map(|d| d as u32),
        published: v["published"].as_str().unwrap_or("").to_string(),
        age_min: v["ageMin"].as_u64(),
        views: v["views"].as_u64().unwrap_or(0),
    })
}

async fn api_video(State(app): State<App>, Query(q): Q) -> Response {
    let id = q.get("id").cloned().unwrap_or_default();
    if id.len() != 11 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
        return err(StatusCode::BAD_REQUEST, "Identifiant de vidéo invalide");
    }
    let res = app
        .cached(format!("v|{id}"), Duration::from_secs(6 * 3600), || async {
            let url = format!("https://www.youtube.com/oembed?format=json&url={}", urlenc(&format!("https://www.youtube.com/watch?v={id}")));
            let body = yt::get(&app.http, &url).await.map_err(|_| "Vidéo introuvable ou privée".to_string())?;
            let j: Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
            Ok(json!({ "id": id, "title": j["title"], "channel": j["author_name"], "channelId": "", "thumb": yt::thumb(&id), "duration": null }))
        })
        .await;
    match res {
        Ok(v) => Json(v).into_response(),
        Err(e) => fail(e),
    }
}

/// Sorties récentes : vidéos de la semaine (puis du mois si besoin), triées de la plus récente à la plus ancienne.
async fn api_new(State(app): State<App>, Query(q): Q) -> Response {
    let gl = region(&q);
    let gl = if gl.is_empty() { "JP".to_string() } else { gl };
    let base = q.get("q").map(|s| s.trim().chars().take(100).collect::<String>()).filter(|s| !s.is_empty()).unwrap_or_else(|| "J-POP".into());
    let res = app
        .cached(format!("new|{gl}|{base}"), Duration::from_secs(1800), || async {
            let queries = [format!("{base} 新曲 MV"), format!("{base} new song official MV")];
            let fetch = |sp: &'static str| {
                let (app, queries, gl) = (&app, &queries, &gl);
                async move {
                    let (u0, u1) = (results_url(&queries[0], sp, gl), results_url(&queries[1], sp, gl));
                    let (a, b) = tokio::join!(yt::get(&app.http, &u0), yt::get(&app.http, &u1));
                    let mut all = Vec::new();
                    for html in [a, b].into_iter().flatten() {
                        all.extend(yt::search_videos(&html)?);
                    }
                    Ok::<_, String>(all)
                }
            };
            let mut all = fetch(yt::SP_WEEK).await?;
            let jp_only = base == "J-POP";
            let good = |t: &yt::Track| {
                matches!(t.duration, Some(d) if (90..=600).contains(&d))
                    && t.views >= 30_000
                    && t.age_min.is_some_and(|a| a <= 30 * 1440)
                    && !yt::is_junk_title(&t.title)
                    && (!jp_only || yt::has_japanese(&t.title) || yt::has_japanese(&t.channel))
            };
            if all.iter().filter(|t| good(t)).count() < 8 {
                all.extend(fetch(yt::SP_MONTH).await.unwrap_or_default());
            }
            let mut seen = HashSet::new();
            let mut fresh: Vec<yt::Track> = all.into_iter().filter(|t| good(t) && seen.insert(t.id.clone())).collect();
            fresh.sort_by_key(|t| (t.age_min.unwrap_or(u64::MAX), std::cmp::Reverse(t.views)));
            fresh.truncate(20);
            let fresh = filter_embeddable(&app, fresh).await;
            Ok(json!(fresh))
        })
        .await;
    match res {
        Ok(items) => Json(json!({ "items": items })).into_response(),
        Err(e) => fail(e),
    }
}

fn router(app: App) -> Router {
    Router::new()
        .route("/", get(index))
        .route("/favicon.ico", get(|| async { StatusCode::NO_CONTENT }))
        .route("/api/me", get(me).put(update_me))
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(login))
        .route("/api/auth/logout", post(logout))
        .route("/api/me/password", post(change_password))
        .route("/api/me/username", post(change_username))
        .route("/api/me/delete", post(delete_account))
        .route("/api/about", get(about))
        .route("/api/update/check", get(update_check))
        .route("/api/update/install", post(update_install))
        .route("/api/data", get(get_data).put(put_data))
        .route("/api/search", get(api_search))
        .route("/api/channel", get(api_channel))
        .route("/api/video", get(api_video))
        .route("/api/new", get(api_new))
        .route("/api/alt", get(api_alt))
        .route("/assets/{name}", get(font))
        .route("/api/public", get(api_public))
        .route("/api/public/playlist", get(api_public_playlist))
        .layer(DefaultBodyLimit::max(16 * 1024 * 1024))
        .layer(middleware::from_fn_with_state(app.clone(), guard))
        .with_state(app)
}

/* ---------- Démarrage ---------- */
fn data_dir() -> PathBuf {
    if let Ok(d) = std::env::var("SATURNE_DATA") {
        return PathBuf::from(d);
    }
    match std::env::var("APPDATA") {
        Ok(a) => {
            let (new, old) = (PathBuf::from(&a).join("Saturne"), PathBuf::from(&a).join("Onde"));
            // L'application s'appelait « Onde » : on reprend ses comptes et ses playlists.
            if !new.exists() && old.exists() {
                let _ = std::fs::rename(&old, &new);
            }
            new
        }
        Err(_) => PathBuf::from("saturne-data"),
    }
}

fn open_in_browser(url: &str) {
    if url.starts_with("http://") || url.starts_with("https://") {
        let _ = std::process::Command::new("rundll32").args(["url.dll,FileProtocolHandler", url]).spawn();
    }
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let serve_only = args.iter().any(|a| a == "--serve");
    let want_port: u16 = args.iter().position(|a| a == "--port").and_then(|i| args.get(i + 1)).and_then(|p| p.parse().ok()).unwrap_or(8787);

    // Après une mise à jour, l'ancienne instance a besoin d'un instant pour libérer le port.
    update::cleanup_old();
    if std::env::var("SATURNE_RESTART").is_ok() {
        std::thread::sleep(Duration::from_millis(1500));
    }

    let dir = data_dir();
    let store = Arc::new(Store::open(dir.clone()).expect("impossible de créer le dossier de données"));
    // Client pour GitHub : redirections limitées à GitHub, téléchargements plus longs que les recherches.
    let gh = reqwest::Client::builder()
        .user_agent(format!("Saturne/{}", update::CURRENT))
        .timeout(Duration::from_secs(180))
        .redirect(reqwest::redirect::Policy::custom(|a| if a.previous().len() < 5 && update::host_allowed(a.url().as_str()) { a.follow() } else { a.stop() }))
        .build()
        .expect("client HTTP GitHub");
    let http = reqwest::Client::builder()
        .user_agent(yt::UA)
        .timeout(Duration::from_secs(15))
        // On ne suit les redirections que vers YouTube : une redirection vers Google « /sorry » signale un blocage anti-robot.
        .redirect(reqwest::redirect::Policy::custom(|a| match a.url().host_str() {
            Some(h) if h.ends_with("youtube.com") => a.follow(),
            _ => a.stop(),
        }))
        .default_headers({
            let mut h = HeaderMap::new();
            h.insert(header::ACCEPT_LANGUAGE, HeaderValue::from_static("fr-FR,fr;q=0.9"));
            h.insert(header::COOKIE, HeaderValue::from_static("CONSENT=YES+cb; SOCS=CAI"));
            h
        })
        .build()
        .expect("client HTTP");

    // Port demandé, sinon un port libre choisi par le système.
    let listener = std::net::TcpListener::bind(("127.0.0.1", want_port)).or_else(|_| std::net::TcpListener::bind(("127.0.0.1", 0))).expect("aucun port disponible");
    listener.set_nonblocking(true).unwrap();
    let port = listener.local_addr().unwrap().port();
    let dev_html = std::env::var("SATURNE_WEB").ok().map(PathBuf::from);
    let app = App { store, http, gh, data_dir: dir.clone(), emb: Arc::new(Mutex::new(HashMap::new())), sem: Arc::new(tokio::sync::Semaphore::new(8)), cache: Arc::new(Mutex::new(HashMap::new())), port, dev_html };

    let server = std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_multi_thread().enable_all().build().expect("runtime");
        rt.block_on(async move {
            let listener = tokio::net::TcpListener::from_std(listener).expect("écoute locale");
            axum::serve(listener, router(app)).await.expect("serveur");
        });
    });

    let url = format!("http://127.0.0.1:{port}");
    if serve_only {
        println!("Saturne est ouvert sur {url}");
        let _ = server.join();
        return;
    }
    run_window(&url, &dir);
}

fn run_window(url: &str, dir: &std::path::Path) {
    use tao::{
        dpi::LogicalSize,
        event::{Event, WindowEvent},
        event_loop::{ControlFlow, EventLoop},
        window::{Theme, WindowBuilder},
    };
    use wry::{NewWindowResponse, WebContext, WebViewBuilder};

    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("Saturne")
        .with_theme(Some(Theme::Dark))
        .with_window_icon(tao::window::Icon::from_rgba(icon::render(64), 64, 64).ok())
        .with_inner_size(LogicalSize::new(1440.0, 880.0))
        .with_min_inner_size(LogicalSize::new(900.0, 600.0))
        .build(&event_loop)
        .expect("fenêtre");
    // Le dossier du navigateur intégré garde la session de connexion d'un lancement à l'autre.
    let mut ctx = WebContext::new(Some(dir.join("webview")));
    let base = url.to_string();
    let _webview = WebViewBuilder::new_with_web_context(&mut ctx)
        .with_url(url)
        // Fond noir dès l'ouverture (pas de flash blanc) ; lecture sans geste préalable, pour que le titre suivant démarre toujours.
        .with_background_color((0, 0, 0, 255))
        .with_autoplay(true)
        .with_new_window_req_handler(|u, _| {
            open_in_browser(&u);
            NewWindowResponse::Deny
        })
        .with_navigation_handler(move |u| {
            if u.starts_with(&base) || u.starts_with("about:") || u.starts_with("data:") || u.starts_with("blob:") {
                true
            } else {
                open_in_browser(&u);
                false
            }
        })
        .build(&window)
        .expect("navigateur intégré (WebView2)");

    event_loop.run(move |event, _, flow| {
        *flow = ControlFlow::Wait;
        if let Event::WindowEvent { event: WindowEvent::CloseRequested, .. } = event {
            *flow = ControlFlow::Exit;
        }
    });
}
