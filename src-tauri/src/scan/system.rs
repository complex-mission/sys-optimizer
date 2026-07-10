//! 系统级空间回收(模块 H)。
//!
//! 高风险高收益项,每项独立代价(前端展示),默认全不勾。所有操作需管理员权限
//! (应用已以管理员启动)。命令调用 powercfg / vssadmin / DISM。
//!
//! ⚠️ 这些操作真正改变系统状态,务必在测试机验证后再交付使用。
//! 非 Windows 下探测返回不可用、执行返回失败(便于跨平台编译)。

use crate::types::{SystemSpaceItem, SystemSpaceResult};

#[cfg(windows)]
mod win {
    use super::*;
    use std::os::windows::process::CommandExt;
    use std::path::Path;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    fn windir() -> String {
        std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".into())
    }
    fn system_drive() -> String {
        std::env::var("SystemDrive").unwrap_or_else(|_| "C:".into())
    }

    fn run(cmd: &str, args: &[&str]) -> (bool, String) {
        match Command::new(cmd)
            .args(args)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
                let stderr = String::from_utf8_lossy(&out.stderr).into_owned();
                (out.status.success(), if stdout.trim().is_empty() { stderr } else { stdout })
            }
            Err(e) => (false, e.to_string()),
        }
    }

    /* ---------------- 休眠文件 ---------------- */

    fn hibernation() -> SystemSpaceItem {
        let hiberfil = format!("{}\\hiberfil.sys", system_drive());
        let size = std::fs::metadata(&hiberfil).map(|m| m.len()).unwrap_or(0);
        // 存在且非空即视为休眠已启用、可关闭
        let enabled = size > 0;
        SystemSpaceItem {
            id: "hibernation".into(),
            bytes: size,
            available: enabled,
            status: if enabled { "enabled".into() } else { "disabled".into() },
        }
    }

    fn disable_hibernation() -> SystemSpaceResult {
        let (ok, msg) = run("powercfg.exe", &["/hibernate", "off"]);
        SystemSpaceResult {
            id: "hibernation".into(),
            success: ok,
            message: if ok { "已关闭休眠,hiberfil.sys 将被移除".into() } else { msg },
        }
    }

    /* ---------------- 系统还原点 ---------------- */

    fn restore_points() -> SystemSpaceItem {
        // vssadmin 输出随系统语言本地化,文本解析不可靠;改查 WMI:
        // Win32_ShadowCopy 行数 = 还原点(卷影副本)个数,
        // Win32_ShadowStorage.UsedSpace = 实际占用空间。
        use std::collections::HashMap;
        use wmi::{Variant, WMIConnection};

        let mut bytes = 0u64;
        let mut count = 0usize;
        if let Ok(wmi) = WMIConnection::new() {
            if let Ok(rows) =
                wmi.raw_query::<HashMap<String, Variant>>("SELECT ID FROM Win32_ShadowCopy")
            {
                count = rows.len();
            }
            if let Ok(rows) = wmi
                .raw_query::<HashMap<String, Variant>>("SELECT UsedSpace FROM Win32_ShadowStorage")
            {
                bytes = rows.iter().map(|r| variant_u64(r.get("UsedSpace"))).sum();
            }
        }
        // 没有任何还原点时显示"当前无需处理",不再总是可执行
        let available = count > 0;
        SystemSpaceItem {
            id: "restore-points".into(),
            bytes,
            available,
            status: if available { "has-data".into() } else { "empty".into() },
        }
    }

    fn variant_u64(v: Option<&wmi::Variant>) -> u64 {
        use wmi::Variant as V;
        match v {
            Some(V::UI8(n)) => *n,
            Some(V::UI4(n)) => *n as u64,
            Some(V::I8(n)) if *n >= 0 => *n as u64,
            Some(V::I4(n)) if *n >= 0 => *n as u64,
            Some(V::String(s)) => s.parse().unwrap_or(0),
            _ => 0,
        }
    }

    /// 取冒号(半角/全角)之后的文本;没有冒号返回 None。
    fn after_colon(line: &str) -> Option<&str> {
        line.rfind(':')
            .map(|i| i + 1)
            .or_else(|| line.rfind(':').map(|i| i + ':'.len_utf8()))
            .map(|i| line[i..].trim())
    }

    fn parse_size(s: &str) -> u64 {
        // "3.50 GB (2%)" -> 字节
        let s = s.trim();
        let mut num = String::new();
        let mut rest = s;
        for (i, ch) in s.char_indices() {
            if ch.is_ascii_digit() || ch == '.' {
                num.push(ch);
            } else {
                rest = s[i..].trim_start();
                break;
            }
        }
        let val: f64 = num.parse().unwrap_or(0.0);
        let unit = rest.split_whitespace().next().unwrap_or("").to_ascii_uppercase();
        let mult = match unit.as_str() {
            "KB" => 1024.0,
            "MB" => 1024.0 * 1024.0,
            "GB" => 1024.0 * 1024.0 * 1024.0,
            "TB" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
            _ => 1.0,
        };
        (val * mult) as u64
    }

    fn shrink_restore_points() -> SystemSpaceResult {
        // 将卷影存储上限收缩到 1GB(保留最近还原点但释放大部分空间)。
        // 直接删所有还原点风险更高,这里选择更温和的"限制上限"。
        let drive = system_drive();
        let for_arg = format!("/for={}", drive);
        let on_arg = format!("/on={}", drive);
        let (ok, msg) = run(
            "vssadmin.exe",
            &["resize", "shadowstorage", &for_arg, &on_arg, "/maxsize=1GB"],
        );
        SystemSpaceResult {
            id: "restore-points".into(),
            success: ok,
            message: if ok {
                "已将还原点存储上限收缩至 1GB".into()
            } else {
                msg
            },
        }
    }

    /* ---------------- Windows.old ---------------- */

    fn windows_old() -> SystemSpaceItem {
        let path = format!("{}\\Windows.old", system_drive());
        let exists = Path::new(&path).exists();
        let bytes = if exists { dir_size(Path::new(&path)) } else { 0 };
        SystemSpaceItem {
            id: "windows-old".into(),
            bytes,
            available: exists,
            status: if exists { "present".into() } else { "absent".into() },
        }
    }

    fn dir_size(path: &Path) -> u64 {
        let mut total = 0u64;
        let mut stack = vec![path.to_path_buf()];
        while let Some(d) = stack.pop() {
            let Ok(rd) = std::fs::read_dir(&d) else { continue };
            for e in rd.flatten() {
                let p = e.path();
                if std::fs::symlink_metadata(&p).map(|m| m.file_type().is_symlink()).unwrap_or(true) {
                    continue;
                }
                match e.metadata() {
                    Ok(md) if md.is_dir() => stack.push(p),
                    Ok(md) if md.is_file() => total += md.len(),
                    _ => {}
                }
            }
        }
        total
    }

    fn cleanup_windows_old() -> SystemSpaceResult {
        // 用 DISM 移除旧版本(比手工删 Windows.old 更安全规范)
        let (ok, msg) = run(
            "dism.exe",
            &["/online", "/Cleanup-Image", "/StartComponentCleanup", "/ResetBase"],
        );
        SystemSpaceResult {
            id: "windows-old".into(),
            success: ok,
            message: if ok {
                "已请求清理旧系统组件(Windows.old 可能需重启后完全移除)".into()
            } else {
                msg
            },
        }
    }

    /* ---------------- WinSxS 组件存储 ---------------- */

    fn winsxs() -> SystemSpaceItem {
        // DISM /AnalyzeComponentStore 给出"可回收"估计
        let (ok, out) = run(
            "dism.exe",
            &["/online", "/Cleanup-Image", "/AnalyzeComponentStore"],
        );
        let mut bytes = 0u64;
        if ok {
            // StartComponentCleanup 能回收的大致是"备份和已禁用的功能"+"缓存和临时数据"。
            // 不能匹配所有含 "reclaimable" 的行:"Number of Reclaimable Packages : 2"
            // 会被误当 2 字节(用户实测显示 2B 的根因)。兼容中英文输出。
            const KEYS: [&str; 4] = [
                "backups and disabled features",
                "cache and temporary data",
                "备份和已禁用的功能",
                "缓存和临时数据",
            ];
            for line in out.lines() {
                let l = line.to_ascii_lowercase();
                if KEYS.iter().any(|k| l.contains(k)) {
                    if let Some(v) = after_colon(line) {
                        bytes += parse_size(v);
                    }
                }
            }
        }
        SystemSpaceItem {
            id: "winsxs".into(),
            bytes,
            available: true,
            status: "analyzable".into(),
        }
    }

    fn cleanup_winsxs() -> SystemSpaceResult {
        let (ok, msg) = run(
            "dism.exe",
            &["/online", "/Cleanup-Image", "/StartComponentCleanup"],
        );
        SystemSpaceResult {
            id: "winsxs".into(),
            success: ok,
            message: if ok { "已清理 WinSxS 组件存储".into() } else { msg },
        }
    }

    /* ---------------- 汇总 ---------------- */

    pub fn list() -> Vec<SystemSpaceItem> {
        vec![hibernation(), restore_points(), windows_old(), winsxs()]
    }

    pub fn execute(id: &str) -> SystemSpaceResult {
        match id {
            "hibernation" => disable_hibernation(),
            "restore-points" => shrink_restore_points(),
            "windows-old" => cleanup_windows_old(),
            "winsxs" => cleanup_winsxs(),
            _ => SystemSpaceResult {
                id: id.into(),
                success: false,
                message: "未知项".into(),
            },
        }
    }

    #[allow(dead_code)]
    fn _windir_ref() -> String {
        windir()
    }
}

/// 列出系统级空间项及其状态。
pub fn list() -> Vec<SystemSpaceItem> {
    #[cfg(windows)]
    {
        win::list()
    }
    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

/// 执行某系统级空间操作。
pub fn execute(id: &str) -> SystemSpaceResult {
    #[cfg(windows)]
    {
        win::execute(id)
    }
    #[cfg(not(windows))]
    {
        SystemSpaceResult {
            id: id.into(),
            success: false,
            message: "仅 Windows 支持".into(),
        }
    }
}
