import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

export interface DownloadLogEntry {
  time: string;
  ip: string;
  key: string;
  userAgent: string;
  referer: string;
  lang: string;
}

function logFile(): string {
  return path.join(env.logDir, "download-log.jsonl");
}

export async function appendDownloadLog(entry: DownloadLogEntry): Promise<void> {
  await fs.mkdir(env.logDir, { recursive: true });
  await fs.appendFile(logFile(), JSON.stringify(entry) + "\n", "utf-8");
}

/** 读取最近 limit 条日志,新的在前 */
export async function readDownloadLogs(limit = 200): Promise<{ total: number; entries: DownloadLogEntry[] }> {
  let raw: string;
  try {
    raw = await fs.readFile(logFile(), "utf-8");
  } catch {
    return { total: 0, entries: [] };
  }
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const entries: DownloadLogEntry[] = [];
  for (const line of lines.slice(-limit).reverse()) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // 跳过损坏行
    }
  }
  return { total: lines.length, entries };
}
