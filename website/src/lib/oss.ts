import { createHash } from "node:crypto";
import OSS from "ali-oss";
import { env } from "./env";
import { getStsCredentials } from "./sts";

export interface OssFile {
  /** 完整对象 key(含前缀) */
  key: string;
  /** 去掉前缀后的展示名 */
  name: string;
  size: number;
  lastModified: string;
  /** 上传时计算的 SHA-256(hex),存于对象元数据;旧文件可能没有 */
  sha256?: string;
}

async function client(): Promise<OSS> {
  const c = await getStsCredentials();
  return new OSS({
    region: env.ossRegion,
    bucket: env.ossBucket,
    accessKeyId: c.accessKeyId,
    accessKeySecret: c.accessKeySecret,
    stsToken: c.securityToken,
    secure: true,
  });
}

/** 校验对象 key:必须位于配置前缀之下,禁止路径穿越 */
export function isValidKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.includes("..") || key.includes("\\") || key.startsWith("/")) return false;
  if (!key.startsWith(env.ossPrefix)) return false;
  return key.length > env.ossPrefix.length;
}

/** 清洗上传文件名:仅保留最终文件名,去掉控制字符与 Windows 保留字符 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "";
  let out = "";
  for (const ch of base) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || '"*:<>?|'.includes(ch)) continue;
    out += ch;
  }
  return out.trim();
}

export async function listFiles(): Promise<OssFile[]> {
  const oss = await client();
  const res = await oss.list({ prefix: env.ossPrefix, "max-keys": 200 }, {});
  const objects = (res.objects ?? []).filter((o) => o.size > 0 && !o.name.endsWith("/"));
  const files = await Promise.all(
    objects.map(async (o): Promise<OssFile> => ({
      key: o.name,
      name: o.name.slice(env.ossPrefix.length),
      size: o.size,
      lastModified: o.lastModified,
      sha256: await readSha256(oss, o.name),
    })),
  );
  return files.sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1));
}

/** 读取对象元数据中的 sha256;失败或不存在(旧文件)返回 undefined */
async function readSha256(oss: OSS, key: string): Promise<string | undefined> {
  try {
    const head = await oss.head(key);
    const meta = (head as { meta?: Record<string, string> }).meta;
    const v = meta?.sha256;
    return typeof v === "string" && /^[0-9a-f]{64}$/.test(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/** 生成带有效期的签名下载 URL,可选单连接限速 */
export async function signDownloadUrl(key: string): Promise<string> {
  const oss = await client();
  const options: Record<string, unknown> = {
    expires: env.downloadUrlTtlSeconds,
    response: {
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(key.slice(env.ossPrefix.length))}`,
    },
  };
  const kbps = env.downloadSpeedLimitKbps;
  if (kbps > 0) {
    // x-oss-traffic-limit 单位为 bit/s,OSS 允许范围 245760(30KB/s) ~ 838860800(100MB/s)
    options.trafficLimit = Math.min(Math.max(kbps * 1024 * 8, 245760), 838860800);
  }
  return oss.signatureUrl(key, options);
}

export async function uploadFile(name: string, data: Buffer): Promise<{ key: string; sha256: string }> {
  const oss = await client();
  const key = env.ossPrefix + name;
  const sha256 = createHash("sha256").update(data).digest("hex");
  // 哈希随对象一起存为 x-oss-meta-sha256,供下载页展示校验值。
  // @types/ali-oss 的 UserMeta 误将 uid/pid 设为必填,实际接口接受任意自定义键。
  await oss.put(key, data, { meta: { sha256 } as unknown as OSS.UserMeta });
  return { key, sha256 };
}

export async function deleteFile(key: string): Promise<void> {
  const oss = await client();
  await oss.delete(key);
}
