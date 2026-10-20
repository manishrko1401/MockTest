// Mock Test Hub for Windows: a native window around the live website.
//
// - The main window opens a small local start page (dist/index.html) that moves on to the
//   website as soon as it is reachable, or shows a "no internet" screen with Retry.
// - Links to other websites open in the user's normal browser; Google sign-in opens in an
//   in-app popup (it has to stay connected to the page that opened it).
// - The app always runs full screen. The website calls `set_exam_mode` when a test starts
//   and ends: the window is hidden from screenshots / screen recording, and browser keys
//   (refresh, back, zoom, find, print) are switched off so a test can't be lost by accident.
// - The website's "Exit App" buttons call `exit_app`.
// - Closing the window keeps the app in the system tray (for notifications); Quit is in
//   the tray menu. Only one copy runs at a time.

mod offline;

use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::webview::{NewWindowResponse, PageLoadEvent};
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartExt};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

const SITE_HOST: &str = "mocktesthub.vercel.app";
const MAIN: &str = "main";

static EXAM_MODE: AtomicBool = AtomicBool::new(false);
static TRAY_HINT_SHOWN: AtomicBool = AtomicBool::new(false);
static POPUP_COUNTER: AtomicUsize = AtomicUsize::new(0);
/// The "Mock Test Hub QA" test build (identifier ending in .qa, see tauri.qa.conf.json):
/// opens the website running on this PC instead of the live site.
static IS_QA: AtomicBool = AtomicBool::new(false);
const QA_SITE: &str = "http://localhost:3000/";

/// Pages that open inside the app: the website, the local start page, and (in debug builds)
/// the local dev server.
fn is_app_url(url: &Url) -> bool {
    match url.scheme() {
        "tauri" | "about" | "data" | "blob" => return true,
        _ => {}
    }
    match url.host_str() {
        Some(SITE_HOST) | Some("tauri.localhost") => true,
        Some("localhost") | Some("127.0.0.1") => cfg!(debug_assertions) || IS_QA.load(Ordering::SeqCst),
        _ => false,
    }
}

/// Google's sign-in / consent pages (used by "Continue with Google" and the Drive locker).
fn is_google_auth_url(url: &Url) -> bool {
    matches!(
        url.host_str(),
        Some("accounts.google.com") | Some("accounts.youtube.com") | Some("myaccount.google.com")
    )
}

fn open_in_browser(app: &AppHandle, url: &Url) {
    let _ = app.opener().open_url(url.as_str(), None::<&str>);
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_fullscreen(true);
        let _ = window.set_focus();
    }
}

/// WebView2's built-in browser shortcuts (F5 / Ctrl+R refresh, Alt+Left back, Ctrl+F find,
/// Ctrl+P print, Ctrl +/- zoom). Off during a test so it can't be reloaded or left by accident.
#[cfg(windows)]
fn set_browser_keys(window: &WebviewWindow, enabled: bool) {
    let _ = window.with_webview(move |webview| unsafe {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings3;
        use windows::core::Interface;
        if let Ok(core) = webview.controller().CoreWebView2() {
            if let Ok(settings) = core.Settings() {
                if let Ok(settings3) = settings.cast::<ICoreWebView2Settings3>() {
                    let _ = settings3.SetAreBrowserAcceleratorKeysEnabled(enabled);
                }
            }
        }
    });
}

#[cfg(not(windows))]
fn set_browser_keys(_window: &WebviewWindow, _enabled: bool) {}

/// Called by the website when a mock test / typing test starts (`on: true`) and ends.
#[tauri::command]
fn set_exam_mode(window: WebviewWindow, on: bool) -> Result<(), String> {
    EXAM_MODE.store(on, Ordering::SeqCst);
    window.set_content_protected(on).map_err(|e| e.to_string())?;
    set_browser_keys(&window, !on);
    Ok(())
}

/// The website's "Exit App" buttons: closes the app completely (not just to the tray).
#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

/// The app is full screen the whole time it is open (only Exit App ends it). Pages use the
/// browser's full-screen API during tests, and WebView2 turns leaving it (Esc, the page's own
/// button, the end of a test) into leaving the window's full screen. So in the app the page is
/// told it is always full screen, its enter / exit calls do nothing, and F11 is ignored.
const KEEP_FULLSCREEN_SCRIPT: &str = r#"(function () {
  try {
    var always = { get: function () { return document.documentElement; }, configurable: true };
    Object.defineProperty(Document.prototype, 'fullscreenElement', always);
    Object.defineProperty(Document.prototype, 'webkitFullscreenElement', always);
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: function () { return true; }, configurable: true });
    var done = function () { return Promise.resolve(); };
    Element.prototype.requestFullscreen = done;
    Element.prototype.webkitRequestFullscreen = done;
    Element.prototype.webkitRequestFullScreen = done;
    Element.prototype.msRequestFullscreen = done;
    Document.prototype.exitFullscreen = done;
    Document.prototype.webkitExitFullscreen = done;
    Document.prototype.msExitFullscreen = done;
  } catch (e) { /* keep the page working */ }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'F11') { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
})();"#;

/// Puts the main window back in full screen if anything took it out (snap, restore, a resize
/// from outside, a page). The window's own "full screen" flag can stay on while Windows has
/// moved or resized it, so the real size is compared with the monitor.
fn keep_fullscreen(window: &tauri::Window) {
    static FIXING: AtomicBool = AtomicBool::new(false);
    if FIXING.load(Ordering::SeqCst) {
        return;
    }
    if !window.is_visible().unwrap_or(false) || window.is_minimized().unwrap_or(false) {
        return;
    }
    let flag = window.is_fullscreen().unwrap_or(false);
    let covers = match (window.current_monitor(), window.outer_position(), window.outer_size()) {
        (Ok(Some(m)), Ok(pos), Ok(size)) => {
            let (mp, ms) = (m.position(), m.size());
            (pos.x - mp.x).abs() <= 2 && (pos.y - mp.y).abs() <= 2
                && (size.width as i64 - ms.width as i64).abs() <= 2
                && (size.height as i64 - ms.height as i64).abs() <= 2
        }
        _ => true,
    };
    if flag && covers {
        return;
    }
    FIXING.store(true, Ordering::SeqCst);
    if flag {
        let _ = window.set_fullscreen(false);
    }
    let _ = window.set_fullscreen(true);
    FIXING.store(false, Ordering::SeqCst);
}

fn build_main_window(app: &AppHandle, start_hidden: bool) -> tauri::Result<WebviewWindow> {
    let nav_app = app.clone();
    let popup_app = app.clone();

    // Debug builds can open a local dev server directly: set MTH_DEV_URL=http://localhost:3000
    let is_qa = IS_QA.load(Ordering::SeqCst);
    let dev_url = std::env::var("MTH_DEV_URL").ok().filter(|_| cfg!(debug_assertions));
    let start_url = match &dev_url {
        Some(dev) => WebviewUrl::External(dev.parse().expect("MTH_DEV_URL must be a URL")),
        None => WebviewUrl::App("index.html".into()),
    };
    // Tells the start page which website to open (the QA build: this PC's dev server)
    let site = if is_qa { std::env::var("MTH_QA_URL").unwrap_or_else(|_| QA_SITE.to_string()) } else { format!("https://{SITE_HOST}/") };
    let start_script = format!(
        "window.__MTH_SITE__ = {}; window.__MTH_QA__ = {};
{}",
        serde_json::to_string(&site).unwrap(),
        is_qa,
        KEEP_FULLSCREEN_SCRIPT
    );

    WebviewWindowBuilder::new(app, MAIN, start_url)
        .title(if is_qa { "Mock Test Hub QA (local website)" } else { "Mock Test Hub" })
        .initialization_script(&start_script)
        .inner_size(1280.0, 800.0)
        .min_inner_size(400.0, 500.0)
        .center()
        .fullscreen(true)
        // The website's page colour, so there is no white flash while it loads
        .background_color(tauri::window::Color(245, 247, 250, 255))
        .visible(!start_hidden)
        // Every new page starts outside exam mode; test pages switch it on themselves. (A full
        // page load skips the page's own clean-up, so this is what reliably switches it off.)
        .on_page_load(|window, payload| {
            if payload.event() == PageLoadEvent::Started && EXAM_MODE.load(Ordering::SeqCst) {
                let _ = set_exam_mode(window, false);
            }
        })
        // Other websites (official notice links, etc.) open in the normal browser
        .on_navigation(move |url| {
            if is_app_url(url) || is_google_auth_url(url) {
                true
            } else {
                open_in_browser(&nav_app, url);
                false
            }
        })
        // window.open(): Google sign-in stays in the app (it reports back to the page that
        // opened it); everything else goes to the normal browser
        .on_new_window(move |url, features| {
            let in_app_popup = is_google_auth_url(&url) || url.scheme() == "about" || is_app_url(&url);
            if !in_app_popup {
                open_in_browser(&popup_app, &url);
                return NewWindowResponse::Deny;
            }
            let label = format!("popup-{}", POPUP_COUNTER.fetch_add(1, Ordering::SeqCst));
            let nav_app = popup_app.clone();
            match WebviewWindowBuilder::new(&popup_app, label, WebviewUrl::External("about:blank".parse().unwrap()))
                .window_features(features)
                .title("Sign in - Mock Test Hub")
                .center()
                .on_navigation(move |u| {
                    if is_app_url(u) || is_google_auth_url(u) || u.host_str().map_or(false, |h| h.ends_with(".google.com") || h.ends_with(".gstatic.com")) {
                        true
                    } else {
                        open_in_browser(&nav_app, u);
                        false
                    }
                })
                .build()
            {
                Ok(window) => NewWindowResponse::Create { window },
                Err(_) => NewWindowResponse::Deny,
            }
        })
        .build()
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Mock Test Hub", true, None::<&str>)?;
    let reload = MenuItem::with_id(app, "reload", "Reload", true, None::<&str>)?;
    let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);
    let autostart = CheckMenuItem::with_id(app, "autostart", "Start with Windows", true, autostart_on, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &reload, &PredefinedMenuItem::separator(app)?, &autostart, &PredefinedMenuItem::separator(app)?, &quit])?;

    let autostart_item = autostart.clone();
    TrayIconBuilder::with_id("tray")
        .icon(app.default_window_icon().cloned().expect("app icon"))
        .tooltip("Mock Test Hub")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "reload" => {
                if let Some(window) = app.get_webview_window(MAIN) {
                    let _ = window.eval("window.location.reload()");
                }
                show_main(app);
            }
            "autostart" => {
                let launcher = app.autolaunch();
                let enable = !launcher.is_enabled().unwrap_or(false);
                let _ = if enable { launcher.enable() } else { launcher.disable() };
                let _ = autostart_item.set_checked(launcher.is_enabled().unwrap_or(enable));
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // A second launch just brings the open window to the front
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--minimized"])))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            set_exam_mode,
            exit_app,
            offline::offline_device_key,
            offline::offline_store,
            offline::offline_list,
            offline::offline_open,
            offline::offline_delete,
            offline::offline_add_attempt,
            offline::offline_attempts,
            offline::outbox_list,
            offline::outbox_remove,
        ])
        .setup(|app| {
            // Started with Windows: stay in the tray until opened
            let start_hidden = std::env::args().any(|a| a == "--minimized");
            IS_QA.store(app.config().identifier.contains(".qa"), Ordering::SeqCst);
            build_main_window(app.handle(), start_hidden)?;
            build_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != MAIN {
                return;
            }
            if matches!(event, WindowEvent::Resized(_) | WindowEvent::Moved(_) | WindowEvent::Focused(true)) {
                keep_fullscreen(window);
            }
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Keep running in the tray so notifications still arrive
                api.prevent_close();
                if EXAM_MODE.load(Ordering::SeqCst) {
                    if let Some(w) = window.app_handle().get_webview_window(MAIN) {
                        let _ = set_exam_mode(w, false);
                    }
                }
                let _ = window.hide();
                if !TRAY_HINT_SHOWN.swap(true, Ordering::SeqCst) {
                    let _ = window
                        .app_handle()
                        .notification()
                        .builder()
                        .title("Mock Test Hub is still running")
                        .body("It stays in the system tray so you get new notice alerts. Right-click the tray icon to quit.")
                        .show();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Mock Test Hub");
}
