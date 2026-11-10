//! Recherche YouTube sans clé API : lecture des pages publiques côté serveur.

use serde::Serialize;
use serde_json::Value;
use std::collections::HashSet;

pub const UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/// Filtres de recherche YouTube (paramètre `sp`).
pub const SP_VIDEO: &str = "EgIQAQ%253D%253D";
pub const SP_CHANNEL: &str = "EgIQAg%253D%253D";
pub const SP_SHORT: &str = "EgQQARgB"; // vidéos de moins de 4 minutes
pub const SP_WEEK: &str = "EgQIAxAB"; // vidéos de la semaine
pub const SP_MONTH: &str = "EgQIBBAB"; // vidéos du mois

#[derive(Serialize, Clone, Debug)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub channel: String,
    #[serde(rename = "channelId")]
    pub channel_id: String,
    pub thumb: String,
    pub duration: Option<u32>,
    pub published: String,
    #[serde(rename = "ageMin")]
    pub age_min: Option<u64>,
    pub views: u64,
}

#[derive(Serialize, Clone, Debug)]
pub struct Artist {
    pub id: String,
    pub name: String,
    pub thumb: String,
    #[serde(rename = "subsText")]
    pub subs_text: String,
}

pub fn thumb(id: &str) -> String {
    format!("https://i.ytimg.com/vi/{id}/mqdefault.jpg")
}

/// Moment (secondes depuis 1970) jusqu'auquel on évite d'interroger YouTube après un blocage anti-robot.
static BLOCKED_UNTIL: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
const BLOCK_PAUSE_SECS: u64 = 180;
pub const BLOCKED_MSG: &str = "YouTube limite temporairement les recherches depuis cet ordinateur (trop de requêtes). Patiente quelques minutes puis réessaie.";

pub fn unix_now() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

pub async fn get(client: &reqwest::Client, url: &str) -> Result<String, String> {
    use std::sync::atomic::Ordering;
    if unix_now() < BLOCKED_UNTIL.load(Ordering::Relaxed) {
        return Err(BLOCKED_MSG.to_string());
    }
    let resp = client.get(url).send().await.map_err(|e| format!("Connexion à YouTube impossible ({e})"))?;
    let status = resp.status();
    let to_sorry = resp.headers().get(reqwest::header::LOCATION).and_then(|l| l.to_str().ok()).is_some_and(|l| l.contains("/sorry"));
    if to_sorry || status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        BLOCKED_UNTIL.store(unix_now() + BLOCK_PAUSE_SECS, Ordering::Relaxed);
        return Err(BLOCKED_MSG.to_string());
    }
    if !status.is_success() {
        return Err(format!("YouTube a répondu {status}"));
    }
    resp.text().await.map_err(|e| e.to_string())
}

pub fn initial_data(html: &str) -> Result<Value, String> {
    let key = "var ytInitialData = ";
    let start = html.find(key).ok_or("Réponse YouTube inattendue")? + key.len();
    let rest = &html[start..];
    let end = rest.find(";</script>").ok_or("Réponse YouTube inattendue")?;
    serde_json::from_str(&rest[..end]).map_err(|e| format!("Réponse YouTube illisible ({e})"))
}

pub fn walk<'a>(v: &'a Value, f: &mut dyn FnMut(&'a Value)) {
    f(v);
    match v {
        Value::Object(m) => m.values().for_each(|x| walk(x, f)),
        Value::Array(a) => a.iter().for_each(|x| walk(x, f)),
        _ => {}
    }
}

fn text_of(v: Option<&Value>) -> String {
    let Some(v) = v else { return String::new() };
    if let Some(s) = v.get("simpleText").and_then(Value::as_str) {
        return s.to_string();
    }
    v.get("runs")
        .and_then(Value::as_array)
        .map(|a| a.iter().filter_map(|r| r.get("text").and_then(Value::as_str)).collect::<String>())
        .unwrap_or_default()
}

pub fn parse_dur(s: &str) -> Option<u32> {
    let mut total = 0u32;
    for part in s.trim().split(':') {
        total = total.checked_mul(60)?.checked_add(part.trim().parse::<u32>().ok()?)?;
    }
    Some(total)
}

/// « il y a 4 j », « il y a 3 sem. », « 2 hours ago »… converti en minutes.
pub fn parse_age_minutes(text: &str) -> Option<u64> {
    let t = text.to_lowercase();
    let digits_start = t.find(|c: char| c.is_ascii_digit())?;
    let rest = &t[digits_start..];
    let n: u64 = rest.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().ok()?;
    let unit: String = rest.chars().skip_while(|c| c.is_ascii_digit() || c.is_whitespace()).take_while(|c| c.is_alphabetic()).collect();
    let mult = if unit.starts_with("min") {
        1
    } else if unit.starts_with('h') {
        60
    } else if unit.starts_with('j') || unit.starts_with("day") || unit.starts_with("d") {
        1440
    } else if unit.starts_with("sem") || unit.starts_with("week") || unit.starts_with('w') {
        10_080
    } else if unit == "m" || unit.starts_with("mois") || unit.starts_with("month") {
        43_200
    } else if unit.starts_with('a') || unit.starts_with("year") || unit.starts_with('y') {
        525_600
    } else {
        return None;
    };
    Some(n * mult)
}

fn parse_views(text: &str) -> u64 {
    text.chars().take_while(|c| !c.is_alphabetic() || c.is_ascii_digit()).filter(|c| c.is_ascii_digit()).collect::<String>().parse().unwrap_or(0)
}

fn big_avatar(url: &str) -> String {
    let mut u = url.to_string();
    if u.starts_with("//") {
        u = format!("https:{u}");
    }
    // …=s88-c-k… → …=s240-c-k…
    if let Some(i) = u.find("=s") {
        let digits: usize = u[i + 2..].chars().take_while(|c| c.is_ascii_digit()).count();
        if digits > 0 {
            u = format!("{}=s240{}", &u[..i], &u[i + 2 + digits..]);
        }
    }
    u
}

fn is_subs(t: &str) -> bool {
    let l = t.to_lowercase();
    ["abonn", "subscri", "suscri", "abbonat"].iter().any(|k| l.contains(k))
}

pub fn search_videos(html: &str) -> Result<Vec<Track>, String> {
    Ok(tracks_in(&initial_data(html)?))
}

/// Titres (`videoRenderer`) d'une page de résultats ou de la suite d'une liste.
pub fn tracks_in(data: &Value) -> Vec<Track> {
    let mut out = Vec::new();
    walk(data, &mut |o| {
        let Some(v) = o.get("videoRenderer") else { return };
        let (Some(id), Some(len)) = (v.get("videoId").and_then(Value::as_str), v.get("lengthText")) else { return };
        let owner = v.get("ownerText").and_then(|x| x.get("runs")).and_then(|r| r.get(0));
        let published = text_of(v.get("publishedTimeText"));
        out.push(Track {
            id: id.to_string(),
            title: text_of(v.get("title")),
            channel: owner.and_then(|r| r.get("text")).and_then(Value::as_str).unwrap_or("").trim_end_matches(" - Topic").to_string(),
            channel_id: owner
                .and_then(|r| r.pointer("/navigationEndpoint/browseEndpoint/browseId"))
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
            thumb: thumb(id),
            duration: parse_dur(&text_of(Some(len))),
            age_min: parse_age_minutes(&published),
            published,
            views: parse_views(&text_of(v.get("viewCountText"))),
        });
    });
    out
}

pub fn search_channels(html: &str) -> Result<Vec<Artist>, String> {
    let data = initial_data(html)?;
    let mut out = Vec::new();
    walk(&data, &mut |o| {
        let Some(c) = o.get("channelRenderer") else { return };
        let Some(id) = c.get("channelId").and_then(Value::as_str) else { return };
        let thumbs = c.pointer("/thumbnail/thumbnails").and_then(Value::as_array);
        let url = thumbs.and_then(|t| t.last()).and_then(|t| t.get("url")).and_then(Value::as_str).unwrap_or("");
        let subs = ["videoCountText", "subscriberCountText"].iter().map(|k| text_of(c.get(*k))).find(|t| is_subs(t)).unwrap_or_default();
        out.push(Artist { id: id.to_string(), name: text_of(c.get("title")), thumb: big_avatar(url), subs_text: subs });
    });
    Ok(out)
}

pub struct ChannelPage {
    pub info: Value,
    pub tracks: Vec<Track>,
}

fn is_song(d: Option<u32>) -> bool {
    matches!(d, Some(s) if (60..=900).contains(&s))
}

pub fn channel_page(html: &str) -> Result<ChannelPage, String> {
    let d = initial_data(html)?;
    let meta = d.pointer("/metadata/channelMetadataRenderer");
    let s = |k: &str| meta.and_then(|m| m.get(k)).and_then(Value::as_str).unwrap_or("").to_string();
    let (id, name) = (s("externalId"), s("title"));
    let avatar = meta.and_then(|m| m.pointer("/avatar/thumbnails/0/url")).and_then(Value::as_str).map(big_avatar).unwrap_or_default();
    let mut subs = String::new();
    let mut banner = String::new();
    if let Some(h) = d.get("header") {
        walk(h, &mut |o| {
            if subs.is_empty() {
                if let Some(c) = o.get("content").and_then(Value::as_str) {
                    if is_subs(c) {
                        subs = c.to_string();
                    }
                }
            }
            if let Some(src) = o.pointer("/imageBannerViewModel/image/sources").and_then(Value::as_array) {
                if let Some(u) = src.last().and_then(|x| x.get("url")).and_then(Value::as_str) {
                    banner = u.to_string();
                }
            }
        });
    }
    let mut tracks: Vec<Track> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    walk(&d, &mut |o| {
        if let Some(l) = o.get("lockupViewModel") {
            let Some(vid) = l.get("contentId").and_then(Value::as_str) else { return };
            if vid.len() != 11 || seen.contains(vid) {
                return;
            }
            let mut dur = None;
            walk(l, &mut |x| {
                if dur.is_none() {
                    if let Some(t) = x.pointer("/thumbnailBadgeViewModel/text").and_then(Value::as_str) {
                        if t.contains(':') {
                            dur = parse_dur(t);
                        }
                    }
                }
            });
            let title = l.pointer("/metadata/lockupMetadataViewModel/title/content").and_then(Value::as_str);
            if let (Some(title), true) = (title, is_song(dur)) {
                seen.insert(vid.to_string());
                tracks.push(Track { id: vid.to_string(), title: title.to_string(), channel: name.clone(), channel_id: id.clone(), thumb: thumb(vid), duration: dur, published: String::new(), age_min: None, views: 0 });
            }
        }
        if let Some(v) = o.get("videoRenderer") {
            let (Some(vid), Some(len)) = (v.get("videoId").and_then(Value::as_str), v.get("lengthText")) else { return };
            let dur = parse_dur(&text_of(Some(len)));
            if !seen.contains(vid) && is_song(dur) {
                seen.insert(vid.to_string());
                tracks.push(Track { id: vid.to_string(), title: text_of(v.get("title")), channel: name.clone(), channel_id: id.clone(), thumb: thumb(vid), duration: dur, published: String::new(), age_min: None, views: 0 });
            }
        }
    });
    Ok(ChannelPage { info: serde_json::json!({"id": id, "name": name, "thumb": avatar, "banner": banner, "subsText": subs}), tracks })
}

/// Re-uploads et contenus dérivés qu'on ne veut pas voir parmi les nouveautés.
pub fn is_junk_title(title: &str) -> bool {
    let t = title.to_lowercase();
    ["lyric", "가사", "reaction", "cover", "karaoke", "nightcore", "slowed", "sped up", "8d audio", "tutorial", "dance practice", "歌ってみた", "弾いてみた"].iter().any(|k| t.contains(k))
}

/// Vrai s'il y a des caractères japonais (hiragana, katakana ou kanji).
pub fn has_japanese(s: &str) -> bool {
    s.chars().any(|c| matches!(c as u32, 0x3040..=0x30FF | 0x4E00..=0x9FFF | 0xFF66..=0xFF9F))
}

/// Retire les parties entre parenthèses ou crochets (« Official Video », « 【MV】 »…) pour chercher une autre version du même titre.
pub fn clean_title(title: &str) -> String {
    let mut out = String::new();
    let mut depth = 0u32;
    for c in title.chars() {
        match c {
            '(' | '[' | '【' | '（' | '［' => depth += 1,
            ')' | ']' | '】' | '）' | '］' => depth = depth.saturating_sub(1),
            _ if depth == 0 => out.push(c),
            _ => {}
        }
    }
    let cleaned = out.split_whitespace().collect::<Vec<_>>().join(" ");
    if cleaned.chars().count() < 2 { title.trim().to_string() } else { cleaned }
}

fn title_tokens(t: &str) -> Vec<String> {
    const NOISE: [&str; 14] = ["official", "music", "video", "mv", "audio", "lyrics", "lyric", "hd", "ft", "feat", "the", "version", "live", "m"];
    t.to_lowercase().split(|c: char| !c.is_alphanumeric()).filter(|w| !w.is_empty() && !NOISE.contains(w)).map(str::to_string).collect()
}

/// Vrai si `cand` semble être le même morceau que `orig` (au moins 60 % des mots du titre d'origine se retrouvent).
pub fn same_song(orig: &str, cand: &str) -> bool {
    let (a, b) = (title_tokens(&clean_title(orig)), title_tokens(cand));
    if a.is_empty() {
        return true;
    }
    a.iter().filter(|w| b.iter().any(|x| x == *w || x.contains(w.as_str()))).count() * 10 >= a.len() * 6
}

/// Garde les vraies chansons ; si il y en a peu (lo-fi, jazz…), complète avec des mixes jusqu'à 4 h.
pub fn songs_or_mixes(all: Vec<Track>) -> Vec<Track> {
    let mut seen = HashSet::new();
    let every: Vec<Track> = all.into_iter().filter(|t| t.duration.is_some() && seen.insert(t.id.clone())).collect();
    let songs: Vec<Track> = every.iter().filter(|t| is_song(t.duration)).cloned().collect();
    if songs.len() >= 8 {
        return songs;
    }
    let mixes = every.into_iter().filter(|t| matches!(t.duration, Some(d) if d > 900 && d <= 4 * 3600));
    songs.into_iter().chain(mixes).take(24).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn age() {
        assert_eq!(parse_age_minutes("il y a 4 j"), Some(4 * 1440));
        assert_eq!(parse_age_minutes("il y a 3 sem."), Some(3 * 10_080));
        assert_eq!(parse_age_minutes("il y a 2 h"), Some(120));
        assert_eq!(parse_age_minutes("il y a 5 min"), Some(5));
        assert_eq!(parse_age_minutes("il y a 3 m."), Some(3 * 43_200));
        assert_eq!(parse_age_minutes("2 days ago"), Some(2 * 1440));
        assert_eq!(parse_age_minutes("En direct"), None);
    }

    #[test]
    fn durations_and_views() {
        assert_eq!(parse_dur("3:34"), Some(214));
        assert_eq!(parse_dur("2:22:47"), Some(8567));
        assert_eq!(parse_dur("abc"), None);
        assert_eq!(parse_views("5\u{202f}093\u{202f}918 vues"), 5_093_918);
        assert_eq!(parse_views("114 281 vues"), 114_281);
    }

    #[test]
    fn filters() {
        assert!(is_junk_title("Stray Kids 'SUIATSU' Lyrics (스트레이 키즈 SUIATSU 가사)"));
        assert!(!is_junk_title("YOASOBI - アイドル (Official Music Video)"));
        assert!(has_japanese("ラヴ・モンスター -MV-"));
        assert!(has_japanese("ヨルシカ - あぶく"));
        assert!(!has_japanese("PLAVE 'Star Trace' M/V"));
    }

    #[test]
    fn cleaning_titles() {
        assert_eq!(clean_title("【Ado】うっせぇわ (Usseewa)"), "うっせぇわ");
        assert_eq!(clean_title("YOASOBI「アイドル」 Official Music Video [4K]"), "YOASOBI「アイドル」 Official Music Video");
        assert_eq!(clean_title("(MV)"), "(MV)");
        assert_eq!(clean_title("Plain title"), "Plain title");
    }

    #[test]
    fn avatar_size() {
        assert_eq!(big_avatar("//yt3.ggpht.com/abc=s88-c-k-c0x00ffffff-no-rj"), "https://yt3.ggpht.com/abc=s240-c-k-c0x00ffffff-no-rj");
    }
    #[test]
    fn same_song_check() {
        assert!(same_song("YOASOBI「UNDEAD」 Official Music Video", "YOASOBI「UNDEAD」Lyrics"));
        assert!(!same_song("YOASOBI「UNDEAD」 Official Music Video", "YOASOBI「三原色」Official Music Video"));
    }
}
