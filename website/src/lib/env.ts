// 全部配置集中于此,按需读取(getter),避免构建期因缺少 env 而失败。

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`缺少环境变量 ${name},请检查 .env`);
  return v;
}

function intOr(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  get accessKeyId() { return required("ALIYUN_ACCESS_KEY_ID"); },
  get accessKeySecret() { return required("ALIYUN_ACCESS_KEY_SECRET"); },
  get roleArn() { return required("ALIYUN_ROLE_ARN"); },
  get roleSessionName() { return process.env.ALIYUN_ROLE_SESSION_NAME || "sysoptimizer-site"; },
  get stsDurationSeconds() { return intOr("STS_DURATION_SECONDS", 3600); },

  get ossRegion() { return required("OSS_REGION"); },
  get ossBucket() { return required("OSS_BUCKET"); },
  get ossPrefix() { return process.env.OSS_PREFIX ?? ""; },

  get adminPassword() { return required("ADMIN_PASSWORD"); },
  /** 管理后台的隐藏路径段,如 2lwdkehdf66 → /zh/2lwdkehdf66;未配置则后台整体禁用 */
  get adminPath() { return process.env.ADMIN_PATH ?? ""; },
  get adminSessionTtlSeconds() { return intOr("ADMIN_SESSION_TTL_SECONDS", 7 * 86400); },

  get downloadUrlTtlSeconds() { return intOr("DOWNLOAD_URL_TTL_SECONDS", 300); },
  get downloadRateLimitPerHour() { return intOr("DOWNLOAD_RATE_LIMIT_PER_HOUR", 20); },
  /** KB/s;0 表示不限速 */
  get downloadSpeedLimitKbps() { return intOr("DOWNLOAD_SPEED_LIMIT_KBPS", 0); },

  get logDir() { return process.env.LOG_DIR || "./data"; },
};
