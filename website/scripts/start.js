// Next.js 不支持从 .env 读取 PORT(HTTP 服务先于 env 加载启动),
// 此脚本先解析 .env 的 PORT 再拉起 next。shell 中已有的 PORT 优先。
// 用法:node scripts/start.js [dev|start]
const { readFileSync } = require("node:fs");
const { spawn } = require("node:child_process");
const path = require("node:path");

const mode = process.argv[2] === "dev" ? "dev" : "start";
const root = path.join(__dirname, "..");

let port = process.env.PORT || "";
if (!port) {
  try {
    const envFile = readFileSync(path.join(root, ".env"), "utf-8");
    const m = envFile.match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
    if (m) port = m[1];
  } catch {
    // 无 .env 时用默认端口
  }
}
if (!port) port = "3000";

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, mode, "-p", port], {
  cwd: root,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
