import Core from "@alicloud/pop-core";
import { env } from "./env";

export interface StsCredentials {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  /** 毫秒时间戳 */
  expiration: number;
}

interface AssumeRoleResponse {
  Credentials: {
    AccessKeyId: string;
    AccessKeySecret: string;
    SecurityToken: string;
    Expiration: string;
  };
}

let cached: StsCredentials | null = null;

/** AssumeRole 换取临时凭证,进程内缓存,到期前 60s 自动刷新 */
export async function getStsCredentials(): Promise<StsCredentials> {
  if (cached && Date.now() < cached.expiration - 60_000) return cached;

  const client = new Core({
    accessKeyId: env.accessKeyId,
    accessKeySecret: env.accessKeySecret,
    endpoint: "https://sts.aliyuncs.com",
    apiVersion: "2015-04-01",
  });

  const res = await client.request<AssumeRoleResponse>(
    "AssumeRole",
    {
      RoleArn: env.roleArn,
      RoleSessionName: env.roleSessionName,
      DurationSeconds: env.stsDurationSeconds,
    },
    { method: "POST", timeout: 10_000 },
  );

  cached = {
    accessKeyId: res.Credentials.AccessKeyId,
    accessKeySecret: res.Credentials.AccessKeySecret,
    securityToken: res.Credentials.SecurityToken,
    expiration: new Date(res.Credentials.Expiration).getTime(),
  };
  return cached;
}
