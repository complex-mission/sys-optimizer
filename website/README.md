# SysOptimizer 产品官网

Next.js(App Router)实现的双语官网 + 下载/上传后端,文件存储于阿里云 OSS **私有桶**,通过 **STS AssumeRole** 临时凭证读写。

## 功能

- **中英双语**:`/zh` `/en` 路由,首次访问按浏览器语言自动跳转,右上角可切换
- **下载页**:实时列出桶内(配置前缀下)的文件;点击下载 → 服务端限流 → 记日志 → 302 跳转到带有效期的 STS 签名 URL
- **下载限流**:每 IP 每小时次数限制(进程内滑动窗口)+ OSS 单连接限速(`x-oss-traffic-limit`),均可在 `.env` 配置
- **下载日志**:JSONL 追加写入 `LOG_DIR/download-log.jsonl`(时间/IP/文件/UA/Referer/语言),管理后台可查看
- **管理后台** `/zh/<ADMIN_PATH>`(隐藏入口,路径段由 env 配置,猜错一律 404,页面不出现在任何导航中):单密码登录(HMAC 签名 Cookie 会话,7 天有效);上传文件(带进度条)、文件管理(刷新/删除)、下载日志查看;登录接口有防爆破限制(每 IP 10 分钟 10 次失败)

## 快速开始

```bash
cd website
npm install
cp .env.example .env   # 填入真实配置
npm run dev            # http://localhost:3000
```

生产部署:

```bash
npm run build
npm run start          # 或用 pm2 / systemd 托管
```

## 环境变量(见 `.env.example`)

| 变量 | 说明 |
| --- | --- |
| `PORT` | 监听端口(默认 3000;由 `scripts/start.js` 读取,shell 里的 `PORT` 优先) |
| `ALIYUN_ACCESS_KEY_ID` / `ALIYUN_ACCESS_KEY_SECRET` | RAM 用户 AK,只需 `sts:AssumeRole` 权限 |
| `ALIYUN_ROLE_ARN` | 被扮演的 RAM 角色,授权策略见下 |
| `STS_DURATION_SECONDS` | STS 凭证有效期(服务端缓存,到期前 60s 刷新) |
| `OSS_REGION` / `OSS_BUCKET` / `OSS_PREFIX` | 私有桶位置;所有文件读写都限制在前缀下 |
| `ADMIN_PASSWORD` | 管理后台密码(明文) |
| `ADMIN_PATH` | 后台隐藏入口路径段(随机字符串);后台地址 = `/zh/<ADMIN_PATH>`;留空禁用后台页面 |
| `DOWNLOAD_URL_TTL_SECONDS` | 签名下载链接有效期 |
| `DOWNLOAD_RATE_LIMIT_PER_HOUR` | 每 IP 每小时下载次数上限 |
| `DOWNLOAD_SPEED_LIMIT_KBPS` | 单连接限速 KB/s,留空/0 不限,最低 30 |
| `LOG_DIR` | 下载日志目录 |

## 阿里云 RAM 配置

1. 创建 RAM 用户,只授予 `sts:AssumeRole`,生成 AK 填入 env。
2. 创建 RAM 角色(可信实体 = 当前云账号,信任该 RAM 用户),授权策略限定到桶与前缀:

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["oss:GetObject", "oss:PutObject", "oss:DeleteObject"],
      "Resource": "acs:oss:*:*:sysoptimizer-releases/releases/*"
    },
    {
      "Effect": "Allow",
      "Action": "oss:ListObjects",
      "Resource": "acs:oss:*:*:sysoptimizer-releases"
    }
  ]
}
```

## 部署注意

- **限流是进程内实现**,适用单实例部署;若上多实例,需换 Redis 等共享存储。
- 上传经服务端中转(内存缓冲)后写入 OSS;大安装包(数百 MB)会产生等量内存峰值。若走 Nginx 反代,记得调大 `client_max_body_size`(以及 `proxy_read_timeout`)。
- Nginx 反代需传递真实 IP:`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,否则限流与日志记到的都是内网地址。
- `ADMIN_PASSWORD` 为明文保存,请确保 `.env` 不进 git(已在 `.gitignore`)且服务器文件权限收紧;会话签名密钥由该密码派生,改密码即全部下线。
