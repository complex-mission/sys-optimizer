import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ali-oss 与 pop-core 为 CJS 包,交给 Node 直接 require,不参与打包
  serverExternalPackages: ["ali-oss", "@alicloud/pop-core"],
  // 上层仓库另有 package-lock.json,显式指定工作区根目录避免误判
  turbopack: { root: __dirname },
};

export default nextConfig;
