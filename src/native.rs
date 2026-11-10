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
