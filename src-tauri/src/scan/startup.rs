//! 启动项管理(模块 D)。
//!
//! 来源:注册表 Run/RunOnce + 启动文件夹 + 计划任务。
//! 操作只做**禁用/启用,不删除**(仿 Windows 任务管理器):
//!   - 注册表/启动文件夹项:通过 `StartupApproved` 键标记启用/禁用状态,原项保留;
//!   - 计划任务:schtasks /Change /Disable|/Enable。
//! 全部可随时恢复。HKLM / 公共启动文件夹 / 系统任务的修改需管理员权限。
//!
//! 本文件的 Windows 实现依赖 winreg;非 Windows 下返回空列表(便于跨平台编译与前端预览)。

use crate::types::{StartupItem, StartupScope, StartupSource};

#[cfg(windows)]
mod win {
    use super::*;
    use std::os::windows::process::CommandExt;
    use std::path::PathBuf;
    use std::process::Command;
    use winreg::enums::*;
    use winreg::RegKey;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    // StartupApproved 中"已启用"的标记字节(任务管理器约定):
    // 前 4 字节为状态(02 00 00 00 = 启用),其余为时间戳(禁用时非零)。
    // 启用: 02 00 ...(全 0 尾);禁用: 03 00 ...(带时间戳)。
    const APPROVED_ENABLED: [u8; 12] = [0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const APPROVED_DISABLED: [u8; 12] = [0x03, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];

    fn run_path(scope: StartupScope) -> (RegKey, &'static str) {
        match scope {
            StartupScope::User => (
                RegKey::predef(HKEY_CURRENT_USER),
                r"Software\Microsoft\Windows\CurrentVersion\Run",
            ),
            StartupScope::Machine => (
                RegKey::predef(HKEY_LOCAL_MACHINE),
                r"Software\Microsoft\Windows\CurrentVersion\Run",
            ),
        }
    }

    fn approved_path(scope: StartupScope) -> (RegKey, &'static str) {
        match scope {
            StartupScope::User => (
                RegKey::predef(HKEY_CURRENT_USER),
                r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run",
            ),
            StartupScope::Machine => (
                RegKey::predef(HKEY_LOCAL_MACHINE),
                r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run",
            ),
        }
    }

    /// 读某作用域下 StartupApproved\Run 中各项的启用状态。
    /// 返回 name -> enabled。缺失视为启用(默认启用)。
    fn approved_states(scope: StartupScope) -> std::collections::HashMap<String, bool> {
        let mut map = std::collections::HashMap::new();
        let (root, path) = approved_path(scope);
        if let Ok(key) = root.open_subkey(path) {
            for name in key.enum_values().flatten() {
                let (vname, val) = name;
                // 第一个字节为奇数(如 0x03)表示禁用,偶数(0x02)表示启用
                let disabled = val.bytes.first().map(|b| b % 2 == 1).unwrap_or(false);
                map.insert(vname, !disabled);
            }
        }
        map
    }

    /// 读注册表 Run 启动项。
    fn read_registry(scope: StartupScope) -> Vec<StartupItem> {
        let mut items = Vec::new();
        let states = approved_states(scope);
        let (root, path) = run_path(scope);
        if let Ok(key) = root.open_subkey(path) {
            for entry in key.enum_values().flatten() {
                let (name, val) = entry;
                let command = val.to_string();
                let enabled = *states.get(&name).unwrap_or(&true);
                items.push(StartupItem {
                    id: format!("registry|{}|{}", scope_str(scope), name),
                    name,
                    command,
                    source: StartupSource::Registry,
                    scope,
                    enabled,
                });
            }
        }
        items
    }

    /// 读启动文件夹中的快捷方式。
    fn read_folder(scope: StartupScope) -> Vec<StartupItem> {
        let dir = match scope {
            StartupScope::User => std::env::var_os("APPDATA").map(|a| {
                PathBuf::from(a).join(r"Microsoft\Windows\Start Menu\Programs\Startup")
            }),
            StartupScope::Machine => std::env::var_os("ProgramData").map(|a| {
                PathBuf::from(a).join(r"Microsoft\Windows\Start Menu\Programs\Startup")
            }),
        };
        let Some(dir) = dir else {
            return Vec::new();
        };
        let states = approved_states_folder(scope);
        let mut items = Vec::new();
        if let Ok(rd) = std::fs::read_dir(&dir) {
            for e in rd.flatten() {
                let p = e.path();
                let name = p
                    .file_stem()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                if name.is_empty() {
                    continue;
                }
                let full = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
                let enabled = *states.get(&full).unwrap_or(&true);
                items.push(StartupItem {
                    id: format!("folder|{}|{}", scope_str(scope), full),
                    name,
                    command: p.to_string_lossy().into_owned(),
                    source: StartupSource::Folder,
                    scope,
                    enabled,
                });
            }
        }
        items
    }

    fn approved_states_folder(scope: StartupScope) -> std::collections::HashMap<String, bool> {
        let mut map = std::collections::HashMap::new();
        let (root, base) = match scope {
            StartupScope::User => (
                RegKey::predef(HKEY_CURRENT_USER),
                r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder",
            ),
            StartupScope::Machine => (
                RegKey::predef(HKEY_LOCAL_MACHINE),
                r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder",
            ),
        };
        if let Ok(key) = root.open_subkey(base) {
            for entry in key.enum_values().flatten() {
                let (name, val) = entry;
                let disabled = val.bytes.first().map(|b| b % 2 == 1).unwrap_or(false);
                map.insert(name, !disabled);
            }
        }
        map
    }

    /// 读计划任务中"登录时触发"的任务(通过 schtasks CSV 输出粗略解析)。
    fn read_tasks() -> Vec<StartupItem> {
        let out = Command::new("schtasks.exe")
            .args(["/query", "/fo", "csv", "/v"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        let Ok(out) = out else {
            return Vec::new();
        };
        if !out.status.success() {
            return Vec::new();
        }
        let text = String::from_utf8_lossy(&out.stdout);
        let mut items = Vec::new();
        // CSV 首行是表头,定位 TaskName / Status / Task To Run / Schedule Type 列
        let mut lines = text.lines();
        let header = lines.next().unwrap_or("");
        let cols: Vec<&str> = header.split(',').map(|c| c.trim_matches('"')).collect();
        let idx = |name: &str| cols.iter().position(|c| c.eq_ignore_ascii_case(name));
        let (i_name, i_status, i_run, i_trigger) = (
            idx("TaskName"),
            idx("Status"),
            idx("Task To Run"),
            idx("Schedule Type"),
        );
        for line in lines {
            let fields = split_csv(line);
            let get = |i: Option<usize>| i.and_then(|i| fields.get(i)).cloned().unwrap_or_default();
            let trigger = get(i_trigger).to_ascii_lowercase();
            // 只收登录/启动触发的任务
            if !(trigger.contains("logon") || trigger.contains("startup") || trigger.contains("boot")) {
                continue;
            }
            let name = get(i_name);
            if name.is_empty() {
                continue;
            }
            let status = get(i_status);
            let enabled = !status.eq_ignore_ascii_case("Disabled");
            items.push(StartupItem {
                id: format!("task||{}", name),
                name: name.trim_start_matches('\\').to_string(),
                command: get(i_run),
                source: StartupSource::Task,
                scope: StartupScope::Machine,
                enabled,
            });
        }
        items
    }

    fn split_csv(line: &str) -> Vec<String> {
        // schtasks CSV:字段用双引号包裹,逗号分隔
        let mut out = Vec::new();
        let mut cur = String::new();
        let mut in_quote = false;
        for ch in line.chars() {
            match ch {
                '"' => in_quote = !in_quote,
                ',' if !in_quote => {
                    out.push(cur.clone());
                    cur.clear();
                }
                _ => cur.push(ch),
            }
        }
        out.push(cur);
        out
    }

    fn scope_str(scope: StartupScope) -> &'static str {
        match scope {
            StartupScope::User => "user",
            StartupScope::Machine => "machine",
        }
    }

    pub fn list_all() -> Vec<StartupItem> {
        let mut all = Vec::new();
        all.extend(read_registry(StartupScope::User));
        all.extend(read_registry(StartupScope::Machine));
        all.extend(read_folder(StartupScope::User));
        all.extend(read_folder(StartupScope::Machine));
        all.extend(read_tasks());
        all
    }

    /// 写 StartupApproved 标记以启用/禁用注册表或文件夹项。
    fn set_approved(scope: StartupScope, is_folder: bool, name: &str, enable: bool) -> Result<(), String> {
        let (root, base) = if is_folder {
            match scope {
                StartupScope::User => (HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder"),
                StartupScope::Machine => (HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder"),
            }
        } else {
            match scope {
                StartupScope::User => (HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"),
                StartupScope::Machine => (HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"),
            }
        };
        let hive = RegKey::predef(root);
        let (key, _) = hive
            .create_subkey(base)
            .map_err(|e| format!("打开 StartupApproved 失败: {e}"))?;
        let bytes = if enable { APPROVED_ENABLED } else { APPROVED_DISABLED };
        let val = winreg::RegValue {
            bytes: bytes.to_vec(),
            vtype: REG_BINARY,
        };
        key.set_raw_value(name, &val)
            .map_err(|e| format!("写入启用状态失败: {e}"))
    }

    fn set_task(name: &str, enable: bool) -> Result<(), String> {
        let flag = if enable { "/Enable" } else { "/Disable" };
        let out = Command::new("schtasks.exe")
            .args(["/Change", "/TN", name, flag])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("schtasks 执行失败: {e}"))?;
        if out.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&out.stderr).into_owned())
        }
    }

    /// 按 id 启用/禁用启动项。id 格式:source|scope|name。
    pub fn set_enabled(id: &str, enable: bool) -> Result<(), String> {
        let parts: Vec<&str> = id.splitn(3, '|').collect();
        if parts.len() != 3 {
            return Err("无效的启动项标识".into());
        }
        let (source, scope_s, name) = (parts[0], parts[1], parts[2]);
        let scope = if scope_s == "machine" {
            StartupScope::Machine
        } else {
            StartupScope::User
        };
        match source {
            "registry" => set_approved(scope, false, name, enable),
            "folder" => set_approved(scope, true, name, enable),
            "task" => set_task(name, enable),
            _ => Err("未知来源".into()),
        }
    }
}

/// 列出全部启动项。
pub fn list_all() -> Vec<StartupItem> {
    #[cfg(windows)]
    {
        win::list_all()
    }
    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

/// 启用/禁用某启动项。
pub fn set_enabled(id: &str, enable: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        win::set_enabled(id, enable)
    }
    #[cfg(not(windows))]
    {
        let _ = (id, enable);
        Err("仅 Windows 支持".into())
    }
}
