// 进程内滑动窗口限流(单实例部署适用;多实例需换 Redis 等共享存储)

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

export interface RateResult {
  allowed: boolean;
  /** 若被限流,建议等待的秒数 */
  retryAfterSeconds: number;
}

export function checkDownloadLimit(ip: string, limitPerHour: number): RateResult {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (list.length >= limitPerHour) {
    hits.set(ip, list);
    const oldest = list[0];
    return { allowed: false, retryAfterSeconds: Math.ceil((oldest + WINDOW_MS - now) / 1000) };
  }

  list.push(now);
  hits.set(ip, list);

  // 防止 Map 无限增长:超过 5000 个 IP 时清一次过期条目
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      const alive = v.filter((t) => now - t < WINDOW_MS);
      if (alive.length === 0) hits.delete(k);
      else hits.set(k, alive);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
