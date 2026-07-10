//! 模块 I:系统信息 / 硬件检测。数据来自 WMI/SMBIOS,不加载内核驱动。
//!
//! 明确不做(需内核驱动,风险不值):温度、风扇转速、电压、内存 SPD 直读(XMP/时序)。
//! 数据质量:SMBIOS 由 OEM 填表,可能出现 "To be filled by O.E.M." 等垃圾值,
//! 统一在 clean_str 中归一化为空,前端优雅降级显示"厂商未提供"。

use serde::Serialize;

#[derive(Debug, Clone, Serialize, Default)]
pub struct MemorySlot {
    pub locator: String, // DIMM_A1
    pub occupied: bool,
    pub capacity_bytes: u64,
    pub speed_mhz: u32,
    pub kind: String, // DDR4 / DDR5
    pub manufacturer: String,
    pub part_number: String,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct StorageDisk {
    pub model: String,
    pub bytes: u64,
    pub media_type: String, // SSD / HDD / 未知
    pub bus_type: String,   // NVMe / SATA / USB / 未知
}

/// 逻辑卷(盘符)容量与占用,用于系统信息里的使用率条与空间分析进度条。
#[derive(Debug, Clone, Serialize, Default)]
pub struct Volume {
    pub letter: String, // "C:"
    pub label: String,
    pub fs: String,     // NTFS / exFAT ...
    pub total_bytes: u64,
    pub free_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct DisplayInfo {
    pub name: String,
    pub width: u32,
    pub height: u32,
    /// 当前刷新率(Hz),0 表示未知
    pub refresh_hz: u32,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct BatteryInfo {
    pub present: bool,
    pub design_capacity: u32,
    pub full_charge_capacity: u32,
    /// 健康度百分比(满充/设计),0 表示无法获取
    pub health_percent: u32,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct HardwareReport {
    pub cpu_model: String,
    pub cpu_cores: u32,
    pub cpu_threads: u32,
    pub cpu_mhz: u32,
    pub board_vendor: String,
    pub board_model: String,
    pub bios_version: String,
    pub gpu_model: String,
    pub gpu_vram_bytes: u64,
    pub gpu_driver_version: String,
    /// 驱动日期,"YYYY-MM-DD",空表示未知
    pub gpu_driver_date: String,
    /// 内存插槽总数与明细(需求核心示例)
    pub memory_slots_total: u32,
    pub memory_slots_used: u32,
    pub memory_total_bytes: u64,
    pub memory_slots: Vec<MemorySlot>,
    pub disks: Vec<StorageDisk>,
    pub volumes: Vec<Volume>,
    pub displays: Vec<DisplayInfo>,
    pub battery: BatteryInfo,
    pub generated_at: i64,
    /// 数据是否可用(非 Windows / 查询失败为 false)
    pub available: bool,
}

/// 归一化字符串:去空白;OEM 占位垃圾值归为空。
#[allow(dead_code)]
fn clean_str(s: &str) -> String {
    let t = s.trim();
    let lower = t.to_ascii_lowercase();
    let junk = [
        "to be filled by o.e.m.",
        "to be filled by oem",
        "default string",
        "system manufacturer",
        "system product name",
        "not specified",
        "none",
        "o.e.m.",
        "unknown",
    ];
    if t.is_empty() || junk.contains(&lower.as_str()) {
        String::new()
    } else {
        t.to_string()
    }
}

#[cfg(windows)]
mod win {
    use super::*;
    use wmi::{Variant, WMIConnection};

    /// 内存类型码(SMBIOSMemoryType)映射到可读名。
    fn mem_type(code: u16) -> String {
        match code {
            20 => "DDR".into(),
            21 => "DDR2".into(),
            24 => "DDR3".into(),
            26 => "DDR4".into(),
            34 => "DDR5".into(),
            _ => String::new(),
        }
    }

    fn v_str(m: &std::collections::HashMap<String, Variant>, key: &str) -> String {
        match m.get(key) {
            Some(Variant::String(s)) => clean_str(s),
            _ => String::new(),
        }
    }
    fn v_u64(m: &std::collections::HashMap<String, Variant>, key: &str) -> u64 {
        match m.get(key) {
            Some(Variant::UI8(n)) => *n,
            Some(Variant::UI4(n)) => *n as u64,
            Some(Variant::UI2(n)) => *n as u64,
            Some(Variant::UI1(n)) => *n as u64,
            Some(Variant::I8(n)) if *n >= 0 => *n as u64,
            Some(Variant::I4(n)) if *n >= 0 => *n as u64,
            Some(Variant::I2(n)) if *n >= 0 => *n as u64,
            Some(Variant::String(s)) => s.parse().unwrap_or(0),
            _ => 0,
        }
    }
    fn v_u32(m: &std::collections::HashMap<String, Variant>, key: &str) -> u32 {
        v_u64(m, key) as u32
    }

    type Row = std::collections::HashMap<String, Variant>;

    pub fn collect(report: &mut HardwareReport) -> bool {
        // wmi 0.18 起 WMIConnection::new() 内部完成 COM 初始化,不再显式传入 COMLibrary
        let wmi = match WMIConnection::new() {
            Ok(w) => w,
            Err(_) => return false,
        };

        // CPU
        if let Ok(rows) = wmi.raw_query::<Row>(
            "SELECT Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed FROM Win32_Processor",
        ) {
            if let Some(r) = rows.first() {
                report.cpu_model = v_str(r, "Name");
                report.cpu_cores = v_u32(r, "NumberOfCores");
                report.cpu_threads = v_u32(r, "NumberOfLogicalProcessors");
                report.cpu_mhz = v_u32(r, "MaxClockSpeed");
            }
        }

        // 主板
        if let Ok(rows) =
            wmi.raw_query::<Row>("SELECT Manufacturer, Product FROM Win32_BaseBoard")
        {
            if let Some(r) = rows.first() {
                report.board_vendor = v_str(r, "Manufacturer");
                report.board_model = v_str(r, "Product");
            }
        }

        // BIOS
        if let Ok(rows) =
            wmi.raw_query::<Row>("SELECT SMBIOSBIOSVersion FROM Win32_BIOS")
        {
            if let Some(r) = rows.first() {
                report.bios_version = v_str(r, "SMBIOSBIOSVersion");
            }
        }

        // GPU(显存不用 AdapterRAM,它是 32 位、>4GB 会溢出;此处取型号,显存优先从注册表读)
        if let Ok(rows) = wmi.raw_query::<Row>(
            "SELECT Name, AdapterRAM, DriverVersion, DriverDate FROM Win32_VideoController",
        ) {
            // 选第一个有名字的
            if let Some(r) = rows.iter().find(|r| !v_str(r, "Name").is_empty()) {
                report.gpu_model = v_str(r, "Name");
                // AdapterRAM 仅作下限参考(可能因 32 位截断而偏小)
                report.gpu_vram_bytes = v_u64(r, "AdapterRAM");
                report.gpu_driver_version = v_str(r, "DriverVersion");
                report.gpu_driver_date = wmi_date(&v_str(r, "DriverDate"));
            }
        }
        // 显存精确值:注册表 qwMemorySize(64 位,不受 4GB 截断),取各适配器最大值
        if let Some(vram) = gpu_vram_from_registry() {
            if vram > report.gpu_vram_bytes {
                report.gpu_vram_bytes = vram;
            }
        }

        // 内存插槽总数(Win32_PhysicalMemoryArray.MemoryDevices)
        if let Ok(rows) =
            wmi.raw_query::<Row>("SELECT MemoryDevices FROM Win32_PhysicalMemoryArray")
        {
            report.memory_slots_total = rows.iter().map(|r| v_u32(r, "MemoryDevices")).sum();
        }

        // 每条内存明细(Win32_PhysicalMemory)
        if let Ok(rows) = wmi.raw_query::<Row>(
            "SELECT DeviceLocator, Capacity, Speed, SMBIOSMemoryType, Manufacturer, PartNumber FROM Win32_PhysicalMemory",
        ) {
            for r in &rows {
                let cap = v_u64(r, "Capacity");
                let slot = MemorySlot {
                    locator: v_str(r, "DeviceLocator"),
                    occupied: cap > 0,
                    capacity_bytes: cap,
                    speed_mhz: v_u32(r, "Speed"),
                    kind: mem_type(v_u32(r, "SMBIOSMemoryType") as u16),
                    manufacturer: v_str(r, "Manufacturer"),
                    part_number: v_str(r, "PartNumber"),
                };
                report.memory_total_bytes += cap;
                report.memory_slots.push(slot);
            }
            report.memory_slots_used = report.memory_slots.iter().filter(|s| s.occupied).count() as u32;
            // 若拿不到插槽总数,退而用已装条数
            if report.memory_slots_total == 0 {
                report.memory_slots_total = report.memory_slots.len() as u32;
            }
        }

        // 存储(优先 MSFT_PhysicalDisk 拿 SSD/HDD 与总线;失败退 Win32_DiskDrive)
        collect_storage(&wmi, report);

        // 逻辑卷占用(DriveType=3 本地磁盘),用于使用率显示
        if let Ok(rows) = wmi.raw_query::<Row>(
            "SELECT DeviceID, VolumeName, FileSystem, Size, FreeSpace FROM Win32_LogicalDisk WHERE DriveType = 3",
        ) {
            for r in &rows {
                let total = v_u64(r, "Size");
                if total == 0 {
                    continue;
                }
                report.volumes.push(Volume {
                    letter: v_str(r, "DeviceID"),
                    label: v_str(r, "VolumeName"),
                    fs: v_str(r, "FileSystem"),
                    total_bytes: total,
                    free_bytes: v_u64(r, "FreeSpace"),
                });
            }
            report.volumes.sort_by(|a, b| a.letter.cmp(&b.letter));
        }

        // 显示设备:逐台枚举活动显示器(多屏各自的分辨率/刷新率)
        collect_displays(report);
        // 回退:枚举失败时用 Win32_VideoController 当前模式(只反映主输出)
        if report.displays.is_empty() {
            if let Ok(rows) = wmi.raw_query::<Row>(
                "SELECT Name, CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate FROM Win32_VideoController",
            ) {
                for r in &rows {
                    let w = v_u32(r, "CurrentHorizontalResolution");
                    let h = v_u32(r, "CurrentVerticalResolution");
                    if w > 0 && h > 0 {
                        report.displays.push(DisplayInfo {
                            name: v_str(r, "Name"),
                            width: w,
                            height: h,
                            refresh_hz: v_u32(r, "CurrentRefreshRate"),
                        });
                    }
                }
            }
        }

        // 电池(笔记本)
        if let Ok(rows) = wmi.raw_query::<Row>(
            "SELECT DesignCapacity, FullChargeCapacity FROM Win32_Battery",
        ) {
            if let Some(r) = rows.first() {
                let design = v_u32(r, "DesignCapacity");
                let full = v_u32(r, "FullChargeCapacity");
                let health = if design > 0 {
                    ((full as f64 / design as f64) * 100.0).round() as u32
                } else {
                    0
                };
                report.battery = BatteryInfo {
                    present: true,
                    design_capacity: design,
                    full_charge_capacity: full,
                    health_percent: health.min(100),
                };
            }
        }

        true
    }

    /// CIM_DATETIME("yyyymmddHHMMSS.mmmmmm±UUU")→ "yyyy-mm-dd";解析不了返回空。
    fn wmi_date(s: &str) -> String {
        let d = s.trim();
        if d.len() >= 8 && d.as_bytes()[..8].iter().all(|b| b.is_ascii_digit()) {
            format!("{}-{}-{}", &d[..4], &d[4..6], &d[6..8])
        } else {
            String::new()
        }
    }

    fn collect_storage(wmi: &WMIConnection, report: &mut HardwareReport) {
        // 首选 MSFT_PhysicalDisk(root\Microsoft\Windows\Storage):
        // MediaType 能可靠区分 SSD/HDD,BusType 能识别 NVMe。
        if let Ok(storage) = WMIConnection::with_namespace_path(r"root\Microsoft\Windows\Storage")
        {
            if let Ok(rows) = storage.raw_query::<Row>(
                "SELECT FriendlyName, Size, MediaType, BusType FROM MSFT_PhysicalDisk",
            ) {
                for r in &rows {
                    let size = v_u64(r, "Size");
                    if size == 0 {
                        continue;
                    }
                    // MSFT_PhysicalDisk.MediaType: 3=HDD 4=SSD 5=SCM,0=未指定
                    let media_type = match v_u32(r, "MediaType") {
                        3 => "HDD".to_string(),
                        4 => "SSD".to_string(),
                        5 => "SCM".to_string(),
                        _ => String::new(),
                    };
                    // MSFT_PhysicalDisk.BusType(常见值)
                    let bus_type = match v_u32(r, "BusType") {
                        1 => "SCSI",
                        3 => "ATA",
                        7 => "USB",
                        8 => "RAID",
                        9 => "iSCSI",
                        10 => "SAS",
                        11 => "SATA",
                        12 => "SD",
                        13 => "MMC",
                        17 => "NVMe",
                        _ => "",
                    }
                    .to_string();
                    report.disks.push(StorageDisk {
                        model: v_str(r, "FriendlyName"),
                        bytes: size,
                        media_type,
                        bus_type,
                    });
                }
                if !report.disks.is_empty() {
                    report.disks.sort_by(|a, b| b.bytes.cmp(&a.bytes));
                    return;
                }
            }
        }

        // 回退:默认命名空间的 Win32_DiskDrive(MediaType 分不清 SSD/HDD)。
        if let Ok(rows) = wmi.raw_query::<Row>(
            "SELECT Model, Size, InterfaceType, MediaType FROM Win32_DiskDrive",
        ) {
            for r in &rows {
                let size = v_u64(r, "Size");
                if size == 0 {
                    continue;
                }
                let iface = v_str(r, "InterfaceType");
                let media = v_str(r, "MediaType").to_ascii_lowercase();
                let media_type = if media.contains("ssd") {
                    "SSD".to_string()
                } else if media.contains("fixed") {
                    // Win32 常把两者都标 "Fixed hard disk media",无法可靠区分
                    String::new()
                } else {
                    String::new()
                };
                let bus_type = if iface.eq_ignore_ascii_case("SCSI") || iface.is_empty() {
                    String::new()
                } else {
                    iface
                };
                report.disks.push(StorageDisk {
                    model: v_str(r, "Model"),
                    bytes: size,
                    media_type,
                    bus_type,
                });
            }
        }
    }

    /// 枚举活动显示器:GDI 取各输出的当前分辨率/刷新率,
    /// 名称优先用 root\wmi WmiMonitorID 的 EDID 友好名(如 "DELL U2723QE")。
    /// 两个来源的顺序在实践中一致(均按连接枚举),对不上时回退编号名。
    fn collect_displays(report: &mut HardwareReport) {
        use windows::core::PCWSTR;
        use windows::Win32::Graphics::Gdi::{
            EnumDisplayDevicesW, EnumDisplaySettingsW, DEVMODEW, DISPLAY_DEVICEW,
            ENUM_CURRENT_SETTINGS,
        };

        let names = monitor_names();

        const ATTACHED_TO_DESKTOP: u32 = 0x1;
        const MIRRORING_DRIVER: u32 = 0x8;
        let mut idx = 0u32;
        let mut mon_i = 0usize;
        loop {
            let mut dd = DISPLAY_DEVICEW {
                cb: std::mem::size_of::<DISPLAY_DEVICEW>() as u32,
                ..Default::default()
            };
            let ok = unsafe { EnumDisplayDevicesW(PCWSTR::null(), idx, &mut dd, 0) };
            if !ok.as_bool() {
                break;
            }
            idx += 1;
            let flags = dd.StateFlags.0;
            if flags & ATTACHED_TO_DESKTOP == 0 || flags & MIRRORING_DRIVER != 0 {
                continue;
            }
            let mut dm = DEVMODEW {
                dmSize: std::mem::size_of::<DEVMODEW>() as u16,
                ..Default::default()
            };
            let got = unsafe {
                EnumDisplaySettingsW(
                    PCWSTR(dd.DeviceName.as_ptr()),
                    ENUM_CURRENT_SETTINGS,
                    &mut dm,
                )
            };
            if !got.as_bool() || dm.dmPelsWidth == 0 {
                continue;
            }
            let name = names.get(mon_i).cloned().unwrap_or_default();
            mon_i += 1;
            report.displays.push(DisplayInfo {
                name: if name.is_empty() { format!("Display {mon_i}") } else { name },
                width: dm.dmPelsWidth,
                height: dm.dmPelsHeight,
                refresh_hz: dm.dmDisplayFrequency,
            });
        }
    }

    /// 各活动显示器的 EDID 友好名(root\wmi WmiMonitorID)。失败返回空列表。
    fn monitor_names() -> Vec<String> {
        let Ok(conn) = WMIConnection::with_namespace_path(r"root\wmi") else {
            return vec![];
        };
        let Ok(rows) = conn.raw_query::<Row>(
            "SELECT UserFriendlyName FROM WmiMonitorID WHERE Active = TRUE",
        ) else {
            return vec![];
        };
        rows.iter()
            .map(|r| decode_u16_name(r.get("UserFriendlyName")))
            .collect()
    }

    /// WmiMonitorID 的名字段是 uint16 数组(UTF-16 码点,0 结尾),解码为字符串。
    fn decode_u16_name(v: Option<&Variant>) -> String {
        let Some(Variant::Array(items)) = v else {
            return String::new();
        };
        let mut buf: Vec<u16> = Vec::with_capacity(items.len());
        for it in items {
            let c = match it {
                Variant::UI2(n) => *n,
                Variant::UI4(n) => *n as u16,
                Variant::I4(n) if *n >= 0 => *n as u16,
                Variant::UI1(n) => *n as u16,
                _ => 0,
            };
            if c == 0 {
                break;
            }
            buf.push(c);
        }
        clean_str(&String::from_utf16_lossy(&buf))
    }

    /// 从显示适配器注册表键读取精确显存(qwMemorySize,64 位)。取各适配器最大值。
    fn gpu_vram_from_registry() -> Option<u64> {
        use winreg::enums::HKEY_LOCAL_MACHINE;
        use winreg::RegKey;
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let class = hklm
            .open_subkey(
                r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}",
            )
            .ok()?;
        let mut best = 0u64;
        // 适配器子键形如 0000 / 0001 …
        for name in class.enum_keys().flatten() {
            if let Ok(sub) = class.open_subkey(&name) {
                // 先按 REG_QWORD 读;失败再按原始字节(REG_BINARY 8 字节小端)解析
                let v = sub
                    .get_value::<u64, _>("HardwareInformation.qwMemorySize")
                    .ok()
                    .or_else(|| {
                        sub.get_raw_value("HardwareInformation.qwMemorySize")
                            .ok()
                            .filter(|rv| rv.bytes.len() >= 8)
                            .map(|rv| {
                                let mut b = [0u8; 8];
                                b.copy_from_slice(&rv.bytes[..8]);
                                u64::from_le_bytes(b)
                            })
                    })
                    .unwrap_or(0);
                if v > best {
                    best = v;
                }
            }
        }
        if best > 0 {
            Some(best)
        } else {
            None
        }
    }

    /// 取路径所在卷的容量/可用空间。path 可为 "C:\\..." 或 "C:\\"。
    pub fn disk_usage(path: &str) -> crate::types::DiskUsage {
        use crate::types::DiskUsage;
        let letter = drive_letter(path);
        if letter.is_empty() {
            return DiskUsage::default();
        }
        let wmi = match WMIConnection::new() {
            Ok(w) => w,
            Err(_) => return DiskUsage::default(),
        };
        let q = format!(
            "SELECT Size, FreeSpace FROM Win32_LogicalDisk WHERE DeviceID = '{letter}'"
        );
        if let Ok(rows) = wmi.raw_query::<Row>(&q) {
            if let Some(r) = rows.first() {
                let total = v_u64(r, "Size");
                let free = v_u64(r, "FreeSpace");
                return DiskUsage {
                    total,
                    free,
                    used: total.saturating_sub(free),
                };
            }
        }
        DiskUsage::default()
    }

    /// 从路径提取盘符,如 "C:\\Windows" -> "C:"。
    fn drive_letter(path: &str) -> String {
        let b = path.as_bytes();
        if b.len() >= 2 && b[1] == b':' && b[0].is_ascii_alphabetic() {
            format!("{}:", (b[0] as char).to_ascii_uppercase())
        } else {
            String::new()
        }
    }
}

/// 取某路径所在卷的容量/占用(跨平台入口;非 Windows 返回空)。
pub fn disk_usage(path: &str) -> crate::types::DiskUsage {
    #[cfg(windows)]
    {
        win::disk_usage(path)
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        crate::types::DiskUsage::default()
    }
}

/// 采集硬件报告。
pub fn collect() -> HardwareReport {
    let mut r = HardwareReport {
        generated_at: crate::config::now_secs(),
        ..Default::default()
    };

    #[cfg(windows)]
    {
        r.available = win::collect(&mut r);
    }

    #[cfg(not(windows))]
    {
        r.available = false;
    }

    r
}
