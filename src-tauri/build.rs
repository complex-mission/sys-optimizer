fn main() {
    // 编译时注入构建日期(用于关于页与页脚:v1.0.0 / 2026-07-09)
    let build_date = chrono_like_date();
    println!("cargo:rustc-env=BUILD_DATE={build_date}");

    // Windows: 绑定 requireAdministrator 清单
    #[cfg(windows)]
    {
        let mut windows = tauri_build::WindowsAttributes::new();
        windows = windows.app_manifest(include_str!("cache-insight.manifest"));
        tauri_build::try_build(
            tauri_build::Attributes::new().windows_attributes(windows),
        )
        .expect("failed to run tauri-build");
    }

    #[cfg(not(windows))]
    tauri_build::build();
}

// 不额外拉 chrono 到 build 依赖,用系统时间简单格式化 YYYY-MM-DD
fn chrono_like_date() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // 天数 -> 民用日期(简化的 civil_from_days 算法)
    let days = (secs / 86_400) as i64;
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

// Howard Hinnant 的 days->civil 算法
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as i64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}
