//! Intégration Windows : touches multimédia, icône de la zone de notification.
//! Tout passe par des événements envoyés à la boucle de la fenêtre (`UserEvent`).

use global_hotkey::{
    GlobalHotKeyEvent, GlobalHotKeyManager, HotKeyState,
    hotkey::{Code, HotKey},
};
use tao::event_loop::EventLoopProxy;
use tray_icon::{
    MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent,
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
};

#[derive(Debug, Clone)]
pub enum UserEvent {
    /// Commande de lecture (`playpause`, `next`, `prev`, `stop`) venue d'une touche multimédia ou du menu de l'icône.
    Media(&'static str),
    /// Message envoyé par la page (`window.ipc.postMessage`).
    Cmd(String),
    Show,
    Quit,
}

/// Touches multimédia du clavier (lecture/pause, suivant, précédent, stop), enregistrées à la demande.
pub struct MediaKeys {
    mgr: GlobalHotKeyManager,
    keys: Vec<HotKey>,
    on: bool,
}

impl MediaKeys {
    pub fn new(proxy: EventLoopProxy<UserEvent>) -> Option<Self> {
        let mgr = GlobalHotKeyManager::new().ok()?;
        let keys = vec![HotKey::new(None, Code::MediaPlayPause), HotKey::new(None, Code::MediaTrackNext), HotKey::new(None, Code::MediaTrackPrevious), HotKey::new(None, Code::MediaStop)];
        let map: Vec<(u32, &'static str)> = keys.iter().zip(["playpause", "next", "prev", "stop"]).map(|(k, c)| (k.id(), c)).collect();
        GlobalHotKeyEvent::set_event_handler(Some(move |e: GlobalHotKeyEvent| {
            if e.state == HotKeyState::Pressed {
                if let Some((_, cmd)) = map.iter().find(|(id, _)| *id == e.id) {
                    let _ = proxy.send_event(UserEvent::Media(cmd));
                }
            }
        }));
        Some(MediaKeys { mgr, keys, on: false })
    }

    pub fn set(&mut self, on: bool) {
        if on == self.on {
            return;
        }
        for k in &self.keys {
            let _ = if on { self.mgr.register(*k) } else { self.mgr.unregister(*k) };
        }
        self.on = on;
    }
}

/// Icône de la zone de notification avec son menu (Ouvrir, Lecture/Pause, Suivant, Précédent, Quitter).
pub fn tray(proxy: EventLoopProxy<UserEvent>, rgba: Vec<u8>, size: u32) -> Option<TrayIcon> {
    let (show, play, next, prev, quit) = (MenuItem::new("Ouvrir Saturne", true, None), MenuItem::new("Lecture / pause", true, None), MenuItem::new("Titre suivant", true, None), MenuItem::new("Titre précédent", true, None), MenuItem::new("Quitter", true, None));
    let menu = Menu::new();
    menu.append_items(&[&show, &PredefinedMenuItem::separator(), &play, &next, &prev, &PredefinedMenuItem::separator(), &quit]).ok()?;
    let ids = (show.id().clone(), play.id().clone(), next.id().clone(), prev.id().clone(), quit.id().clone());
    let p = proxy.clone();
    MenuEvent::set_event_handler(Some(move |e: MenuEvent| {
        let ev = if e.id == ids.0 {
            UserEvent::Show
        } else if e.id == ids.1 {
            UserEvent::Media("playpause")
        } else if e.id == ids.2 {
            UserEvent::Media("next")
        } else if e.id == ids.3 {
            UserEvent::Media("prev")
        } else if e.id == ids.4 {
            UserEvent::Quit
        } else {
            return;
        };
        let _ = p.send_event(ev);
    }));
    TrayIconEvent::set_event_handler(Some(move |e: TrayIconEvent| {
        if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
            let _ = proxy.send_event(UserEvent::Show);
        }
    }));
    TrayIconBuilder::new().with_menu(Box::new(menu)).with_menu_on_left_click(false).with_tooltip("Saturne").with_icon(tray_icon::Icon::from_rgba(rgba, size, size).ok()?).build().ok()
}

/// Barre de titre fondue dans l'application : couleur noire (celle du fond), sans icône ni titre ; les boutons de fenêtre restent.
#[cfg(windows)]
pub fn blend_title_bar(window: &tao::window::Window) {
    use tao::platform::windows::WindowExtWindows;
    #[repr(C)]
    struct Wta {
        flags: u32,
        mask: u32,
    }
    #[link(name = "dwmapi")]
    unsafe extern "system" {
        fn DwmSetWindowAttribute(hwnd: isize, attr: u32, value: *const u32, size: u32) -> i32;
    }
    #[link(name = "user32")]
    unsafe extern "system" {
        fn CreateIcon(inst: isize, w: i32, h: i32, planes: u8, bpp: u8, and_bits: *const u8, xor_bits: *const u8) -> isize;
        fn SendMessageW(hwnd: isize, msg: u32, wp: usize, lp: isize) -> isize;
    }
    #[link(name = "uxtheme")]
    unsafe extern "system" {
        fn SetWindowThemeAttribute(hwnd: isize, attr: i32, value: *const Wta, size: u32) -> i32;
    }
    let hwnd = window.hwnd() as isize;
    let black: u32 = 0x0000_0000; // COLORREF 0x00BBGGRR
    unsafe {
        DwmSetWindowAttribute(hwnd, 35, &black, 4); // DWMWA_CAPTION_COLOR
        DwmSetWindowAttribute(hwnd, 34, &black, 4); // DWMWA_BORDER_COLOR
        // WTNCA_NODRAWCAPTION | WTNCA_NODRAWICON
        let w = Wta { flags: 1 | 2, mask: 1 | 2 };
        SetWindowThemeAttribute(hwnd, 1, &w, 8);
        // Petite icône (celle de la barre de titre) transparente ; la grande, celle de la barre des tâches, reste le logo.
        let (and_bits, xor_bits) = ([0xFFu8; 32], [0u8; 32]);
        let blank = CreateIcon(0, 16, 16, 1, 1, and_bits.as_ptr(), xor_bits.as_ptr());
        if blank != 0 {
            SendMessageW(hwnd, 0x0080, 0, blank); // WM_SETICON, ICON_SMALL
        }
    }
}
#[cfg(not(windows))]
pub fn blend_title_bar(_: &tao::window::Window) {}

/// Couleur de la barre de titre (elle suit le thème choisi dans l'application). Sur fond clair, les boutons de fenêtre passent en sombre.
#[cfg(windows)]
pub fn title_bar_color(window: &tao::window::Window, r: u8, g: u8, b: u8) {
    use tao::platform::windows::WindowExtWindows;
    #[link(name = "dwmapi")]
    unsafe extern "system" {
        fn DwmSetWindowAttribute(hwnd: isize, attr: u32, value: *const u32, size: u32) -> i32;
    }
    let hwnd = window.hwnd() as isize;
    let color: u32 = (b as u32) << 16 | (g as u32) << 8 | r as u32; // COLORREF 0x00BBGGRR
    let dark: u32 = ((r as u32 * 299 + g as u32 * 587 + b as u32 * 114) / 1000 < 140) as u32;
    unsafe {
        DwmSetWindowAttribute(hwnd, 20, &dark, 4); // DWMWA_USE_IMMERSIVE_DARK_MODE
        DwmSetWindowAttribute(hwnd, 35, &color, 4);
        DwmSetWindowAttribute(hwnd, 34, &color, 4);
    }
}
#[cfg(not(windows))]
pub fn title_bar_color(_: &tao::window::Window, _: u8, _: u8, _: u8) {}

/// `rrggbb` -> (r, g, b).
pub fn parse_hex(s: &str) -> Option<(u8, u8, u8)> {
    let s = s.trim_start_matches('#');
    if s.len() != 6 || !s.is_ascii() {
        return None;
    }
    Some((u8::from_str_radix(&s[0..2], 16).ok()?, u8::from_str_radix(&s[2..4], 16).ok()?, u8::from_str_radix(&s[4..6], 16).ok()?))
}

/// Taille, position et options de la fenêtre, gardées d'un lancement à l'autre (`window.json`).
#[derive(serde::Serialize, serde::Deserialize, Clone, Copy, Debug, PartialEq)]
pub struct WinState {
    pub w: u32,
    pub h: u32,
    pub x: i32,
    pub y: i32,
    #[serde(default)]
    pub max: bool,
    /// Démarrer réduit dans la zone de notification.
    #[serde(default)]
    pub startmin: bool,
}

impl WinState {
    pub fn load(dir: &std::path::Path) -> Option<WinState> {
        let s: WinState = serde_json::from_str(&std::fs::read_to_string(dir.join("window.json")).ok()?).ok()?;
        // Une taille absurde (fichier abîmé, écran débranché) est ignorée.
        ((400..=10000).contains(&s.w) && (300..=10000).contains(&s.h)).then_some(s)
    }
    pub fn save(&self, dir: &std::path::Path) {
        if let Ok(j) = serde_json::to_string(self) {
            let _ = std::fs::write(dir.join("window.json"), j);
        }
    }
    /// Vrai si le coin de la fenêtre tombe dans un des écrans (rectangles x, y, largeur, hauteur).
    pub fn on_screen(&self, screens: &[(i32, i32, u32, u32)]) -> bool {
        screens.iter().any(|(sx, sy, sw, sh)| self.x + 80 > *sx && self.x + 80 < sx + *sw as i32 && self.y >= *sy - 10 && self.y + 40 < sy + *sh as i32)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn window_state() {
        assert_eq!(parse_hex("#0a0B0c"), Some((10, 11, 12)));
        assert_eq!(parse_hex("zzz"), None);
        let s = WinState { w: 1200, h: 800, x: 100, y: 50, max: false, startmin: false };
        assert!(s.on_screen(&[(0, 0, 1920, 1080)]));
        assert!(!WinState { x: 5000, ..s }.on_screen(&[(0, 0, 1920, 1080)]));
        assert!(WinState { x: -1800, ..s }.on_screen(&[(-1920, 0, 1920, 1080), (0, 0, 1920, 1080)]));
        let dir = std::env::temp_dir().join(format!("saturne-win-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        s.save(&dir);
        assert_eq!(WinState::load(&dir), Some(s));
        std::fs::write(dir.join("window.json"), r#"{"w":5,"h":5,"x":0,"y":0}"#).unwrap();
        assert_eq!(WinState::load(&dir), None);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
