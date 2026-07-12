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
  const objects = res.objects ?? [];
  return objects
    .filter((o) => o.size > 0 && !o.name.endsWith("/"))
    .map((o) => ({
      key: o.name,
      name: o.name.slice(env.ossPrefix.length),
      size: o.size,
      lastModified: o.lastModified,
    }))
    .sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1));
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

export async function uploadFile(name: string, data: Buffer): Promise<string> {
  const oss = await client();
  const key = env.ossPrefix + name;
  await oss.put(key, data);
  return key;
}

export async function deleteFile(key: string): Promise<void> {
  const oss = await client();
  await oss.delete(key);
}
