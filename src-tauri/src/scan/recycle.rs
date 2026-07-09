//! 回收站:通过 PowerShell 读取大小 / 清空。仅 Windows 有效。

#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::process::Command;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn run_ps(script: &str) -> Option<String> {
    #[allow(unused_mut)]
    let mut cmd = Command::new("powershell.exe");
    cmd.args(["-NoProfile", "-NonInteractive", "-Command", script]);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let out = cmd.output().ok()?;
    if out.status.success() {
        Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        None
    }
}

/// 返回 (bytes, files)。
pub fn recycle_bin_size() -> (u64, u64) {
    if !cfg!(windows) {
        return (0, 0);
    }
    let script = r#"
        $shell = New-Object -ComObject Shell.Application
        $rb = $shell.Namespace(0xA)
        $size = 0; $count = 0
        foreach ($i in $rb.Items()) { $size += $i.Size; $count += 1 }
        Write-Output "$size,$count"
    "#;
    if let Some(s) = run_ps(script) {
        let mut it = s.split(',');
        let b = it.next().and_then(|x| x.trim().parse().ok()).unwrap_or(0);
        let c = it.next().and_then(|x| x.trim().parse().ok()).unwrap_or(0);
        return (b, c);
    }
    (0, 0)
}

/// 清空回收站,返回释放的 (bytes, files)(前后差值)。
pub fn clear_recycle_bin() -> (u64, u64) {
    if !cfg!(windows) {
        return (0, 0);
    }
    let (before_b, before_c) = recycle_bin_size();
    let _ = run_ps("Clear-RecycleBin -Force -ErrorAction SilentlyContinue");
    let (after_b, after_c) = recycle_bin_size();
    (
        before_b.saturating_sub(after_b),
        before_c.saturating_sub(after_c),
    )
}
