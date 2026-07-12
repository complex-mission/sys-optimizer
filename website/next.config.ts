import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ali-oss 与 pop-core 为 CJS 包,交给 Node 直接 require,不参与打包
  serverExternalPackages: ["ali-oss", "@alicloud/pop-core"],
};

export default nextConfig;
