//! 进程探测:清理前检查目标软件是否正在运行。
//!
//! 浏览器等软件运行期间删除其缓存文件,会让其内存中的缓存索引指向
//! 已不存在的磁盘条目,导致已打开页面刷新后资源加载残缺/异常。
//! 规则里声明了 `skip_if_running` 的类别,命中运行中的进程则整类跳过。

use std::collections::HashSet;

/// 列出当前全部运行中的进程映像名(小写,如 "chrome.exe")。
/// 快照失败返回空集(视为无阻塞,退回"占用文件逐个跳过"的兜底行为)。
#[cfg(windows)]
pub fn running_process_names() -> HashSet<String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };

    let mut names = HashSet::new();
    unsafe {
        let Ok(snap) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return names;
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        if Process32FirstW(snap, &mut entry).is_ok() {
            loop {
                let len = entry
                    .szExeFile
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(entry.szExeFile.len());
                names.insert(
                    String::from_utf16_lossy(&entry.szExeFile[..len]).to_ascii_lowercase(),
                );
                if Process32NextW(snap, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snap);
    }
    names
}

#[cfg(not(windows))]
pub fn running_process_names() -> HashSet<String> {
    HashSet::new()
}

/// `names` 中第一个正在运行的进程名(按规则里的原始写法返回)。
pub fn first_running(names: &[String]) -> Option<String> {
    if names.is_empty() {
        return None;
    }
    let running = running_process_names();
    names
        .iter()
        .find(|n| running.contains(&n.to_ascii_lowercase()))
        .cloned()
}

#[cfg(all(test, windows))]
mod tests {
    /// 快照应至少能看到当前测试进程自身。
    #[test]
    fn detects_own_process() {
        let me = std::env::current_exe()
            .ok()
            .and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()))
            .expect("current_exe");
        assert_eq!(super::first_running(&[me.clone()]), Some(me));
        assert_eq!(super::first_running(&["no-such-process-xyz.exe".into()]), None);
    }
}
