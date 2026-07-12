//! 系统托盘:最小化后驻留右下角,左键单击或菜单"显示主界面"恢复窗口。

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

use crate::config;

const TRAY_ID: &str = "main-tray";

/// 托盘菜单文案是否用中文:显式设置优先,"system" 时看系统 UI 语言。
fn is_chinese() -> bool {
    match config::load().language.as_str() {
        "zh-CN" => true,
        "en-US" => false,
        _ => system_ui_is_chinese(),
    }
}

#[cfg(windows)]
fn system_ui_is_chinese() -> bool {
    use windows::Win32::Globalization::GetUserDefaultUILanguage;
    // 主语言 ID 低 10 位;0x04 = 中文
    (unsafe { GetUserDefaultUILanguage() } & 0x3FF) == 0x04
}

#[cfg(not(windows))]
fn system_ui_is_chinese() -> bool {
    true
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let zh = is_chinese();
    let show = MenuItem::with_id(
        app,
        "show",
        if zh { "显示主界面" } else { "Show Window" },
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(
        app,
        "quit",
        if zh { "退出" } else { "Quit" },
        true,
        None::<&str>,
    )?;
    Menu::with_items(app, &[&show, &quit])
}

/// 创建托盘图标。应用启动时调用一次。
pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("系统优化助手 SysOptimizer")
        .menu(&build_menu(app)?)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

/// 语言切换后重建托盘菜单,使文案跟随新语言。
pub fn refresh_language(app: &AppHandle) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        if let Ok(menu) = build_menu(app) {
            let _ = tray.set_menu(Some(menu));
        }
    }
}

/// 从托盘/二次启动恢复主窗口:显示、取消最小化并聚焦。
pub fn show_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}
