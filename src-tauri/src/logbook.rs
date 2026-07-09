//! 操作日志(需求文档:时间、类别、删除/跳过清单)。
//! 追加写入 %APPDATA%\cache-insight\logs\clean-YYYYMM.log(JSON Lines)。

use crate::types::CleanResult;
use serde::Serialize;
use std::io::Write;
use std::path::PathBuf;

#[derive(Serialize)]
struct LogRecord<'a> {
    ts: i64,
    action: &'a str,
    results: &'a [CleanResult],
    total_freed: u64,
    total_skipped: u64,
}

fn log_dir() -> PathBuf {
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("cache-insight/logs")
}

/// 记录一次清理。失败仅打印,不影响主流程。
pub fn record_clean(results: &[CleanResult]) {
    let ts = crate::config::now_secs();
    let total_freed: u64 = results.iter().map(|r| r.freed_bytes).sum();
    let total_skipped: u64 = results.iter().map(|r| r.skipped).sum();
    let rec = LogRecord {
        ts,
        action: "clean",
        results,
        total_freed,
        total_skipped,
    };

    let dir = log_dir();
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }
    let (y, m, _d) = ymd(ts);
    let file = dir.join(format!("clean-{y:04}{m:02}.log"));
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(file) {
        if let Ok(line) = serde_json::to_string(&rec) {
            let _ = writeln!(f, "{line}");
        }
    }
}

/// 打开日志目录(供设置页"打开日志目录")。
pub fn logs_path_string() -> String {
    log_dir().to_string_lossy().into_owned()
}

fn ymd(secs: i64) -> (i64, u32, u32) {
    let days = secs.div_euclid(86_400);
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let mo = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    (if mo <= 2 { y + 1 } else { y }, mo, d)
}
