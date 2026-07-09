//! 重复文件扫描(模块 C)。
//!
//! 三级比对策略(需求文档),避免对每个大文件做全量哈希:
//!   1. 按文件大小分组 —— 大小不同必然不重复,先排除绝大多数;
//!   2. 同组文件比对首尾各 64KB 的采样哈希 —— 快速再筛一层;
//!   3. 采样哈希相同的才做全文件哈希确认 —— 全量哈希只发生在高度疑似的少数文件上。
//!
//! 哈希用 rayon 并行。安全:不跟随符号链接;读不到的文件跳过;
//! 删除走回收站(复用大文件模块思路,用户自有文件必须可反悔)。

use crate::types::{DuplicateFile, DuplicateGroup};
use rayon::prelude::*;
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

const SAMPLE: usize = 64 * 1024; // 首尾采样各 64KB
const MIN_SIZE: u64 = 4 * 1024; // 忽略 4KB 以下的小文件(重复价值低,数量却极多)

pub struct DupCounter {
    /// 采样阶段处理数
    pub sampled: AtomicU64,
    /// 全量哈希阶段处理数
    pub hashed: AtomicU64,
    /// 遍历阶段收集的候选文件数
    pub scanned: AtomicU64,
}
impl DupCounter {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            sampled: AtomicU64::new(0),
            hashed: AtomicU64::new(0),
            scanned: AtomicU64::new(0),
        })
    }
}

fn is_symlink(path: &Path) -> bool {
    match std::fs::symlink_metadata(path) {
        Ok(md) => md.file_type().is_symlink(),
        Err(_) => true,
    }
}

fn is_excluded(path: &Path) -> bool {
    let lower = path.to_string_lossy().to_ascii_lowercase().replace('/', "\\");
    const BLOCK: [&str; 6] = [
        "\\windows\\",
        "\\program files\\",
        "\\program files (x86)\\",
        "\\programdata\\",
        "\\$recycle.bin\\",
        "\\system volume information\\",
    ];
    BLOCK.iter().any(|b| lower.contains(b))
}

/// 一个候选文件(遍历阶段收集)。
struct Candidate {
    path: PathBuf,
    size: u64,
    mtime: i64,
}

/// 遍历目录树,收集 ≥ MIN_SIZE 的文件。
fn collect_files(root: &Path, counter: &DupCounter) -> Vec<Candidate> {
    let mut out = Vec::new();
    if !root.exists() {
        return out;
    }
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        if is_excluded(&dir) {
            continue;
        }
        let rd = match std::fs::read_dir(&dir) {
            Ok(rd) => rd,
            Err(_) => continue,
        };
        for entry in rd.flatten() {
            let p = entry.path();
            if is_symlink(&p) {
                continue;
            }
            let md = match entry.metadata() {
                Ok(md) => md,
                Err(_) => continue,
            };
            if md.is_dir() {
                stack.push(p);
            } else if md.is_file() && md.len() >= MIN_SIZE {
                let mtime = md
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                out.push(Candidate { path: p, size: md.len(), mtime });
                counter.scanned.fetch_add(1, Ordering::Relaxed);
            }
        }
    }
    out
}

/// 采样哈希:首尾各 SAMPLE 字节 + 文件大小,混合成一个 u64 指纹。
/// 文件小于 2*SAMPLE 时直接读全文件参与采样。
fn sample_hash(path: &Path, size: u64) -> Option<u64> {
    let mut f = File::open(path).ok()?;
    let mut hasher = Fnv::new();
    hasher.write_u64(size);

    if size <= (2 * SAMPLE) as u64 {
        let mut buf = Vec::new();
        f.read_to_end(&mut buf).ok()?;
        hasher.write(&buf);
    } else {
        let mut head = vec![0u8; SAMPLE];
        f.read_exact(&mut head).ok()?;
        hasher.write(&head);

        let mut tail = vec![0u8; SAMPLE];
        f.seek(SeekFrom::End(-(SAMPLE as i64))).ok()?;
        f.read_exact(&mut tail).ok()?;
        hasher.write(&tail);
    }
    Some(hasher.finish())
}

/// 全文件哈希(流式,避免一次性读入大文件)。
fn full_hash(path: &Path) -> Option<u64> {
    let mut f = File::open(path).ok()?;
    let mut hasher = Fnv::new();
    let mut buf = vec![0u8; 256 * 1024];
    loop {
        let n = f.read(&mut buf).ok()?;
        if n == 0 {
            break;
        }
        hasher.write(&buf[..n]);
    }
    Some(hasher.finish())
}

/// 主流程:三级比对,返回重复组(按可回收空间降序)。
pub fn find_duplicates(root: &Path, counter: &DupCounter) -> Vec<DuplicateGroup> {
    // ---- 遍历 ----
    let files = collect_files(root, counter);

    // ---- 1. 按大小分组 ----
    let mut by_size: HashMap<u64, Vec<Candidate>> = HashMap::new();
    for c in files {
        by_size.entry(c.size).or_default().push(c);
    }
    // 只保留同大小 ≥2 的组
    let size_groups: Vec<Vec<Candidate>> =
        by_size.into_values().filter(|v| v.len() >= 2).collect();

    // ---- 2. 采样哈希(并行) ----
    // 对每个大小组内的文件算采样哈希,再按 (size, sample) 二次分组
    let mut sample_groups: Vec<Vec<Candidate>> = Vec::new();
    for group in size_groups {
        let size = group[0].size;
        let hashed: Vec<(Option<u64>, Candidate)> = group
            .into_par_iter()
            .map(|c| {
                let h = sample_hash(&c.path, size);
                counter.sampled.fetch_add(1, Ordering::Relaxed);
                (h, c)
            })
            .collect();

        let mut by_sample: HashMap<u64, Vec<Candidate>> = HashMap::new();
        for (h, c) in hashed {
            if let Some(h) = h {
                by_sample.entry(h).or_default().push(c);
            }
        }
        for v in by_sample.into_values() {
            if v.len() >= 2 {
                sample_groups.push(v);
            }
        }
    }

    // ---- 3. 全文件哈希确认(并行) ----
    let mut result: Vec<DuplicateGroup> = Vec::new();
    for group in sample_groups {
        let size = group[0].size;
        let hashed: Vec<(Option<u64>, Candidate)> = group
            .into_par_iter()
            .map(|c| {
                let h = full_hash(&c.path);
                counter.hashed.fetch_add(1, Ordering::Relaxed);
                (h, c)
            })
            .collect();

        let mut by_full: HashMap<u64, Vec<Candidate>> = HashMap::new();
        for (h, c) in hashed {
            if let Some(h) = h {
                by_full.entry(h).or_default().push(c);
            }
        }
        for v in by_full.into_values() {
            if v.len() >= 2 {
                let files: Vec<DuplicateFile> = v
                    .iter()
                    .map(|c| DuplicateFile {
                        path: c.path.to_string_lossy().into_owned(),
                        name: c
                            .path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("")
                            .to_string(),
                        mtime: c.mtime,
                    })
                    .collect();
                let reclaimable = size * (v.len() as u64 - 1);
                result.push(DuplicateGroup { bytes: size, files, reclaimable });
            }
        }
    }

    result.sort_by(|a, b| b.reclaimable.cmp(&a.reclaimable));
    result
}

/// 删除选中的重复文件(移入回收站)。返回 (成功, 释放字节, 跳过)。
pub fn delete_to_trash(paths: &[String]) -> (u64, u64, u64) {
    let mut ok = 0u64;
    let mut freed = 0u64;
    let mut skipped = 0u64;
    for p in paths {
        let path = Path::new(p);
        if is_excluded(path) {
            skipped += 1;
            continue;
        }
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        match trash::delete(path) {
            Ok(_) => {
                ok += 1;
                freed += size;
            }
            Err(_) => skipped += 1,
        }
    }
    (ok, freed, skipped)
}

/// 轻量 FNV-1a 64 位哈希。内部工具够用,追求速度可换 xxhash-addon 类库。
struct Fnv(u64);
impl Fnv {
    fn new() -> Self {
        Fnv(0xcbf2_9ce4_8422_2325)
    }
    fn write(&mut self, bytes: &[u8]) {
        for &b in bytes {
            self.0 ^= b as u64;
            self.0 = self.0.wrapping_mul(0x0000_0100_0000_01b3);
        }
    }
    fn write_u64(&mut self, v: u64) {
        self.write(&v.to_le_bytes());
    }
    fn finish(&self) -> u64 {
        self.0
    }
}
