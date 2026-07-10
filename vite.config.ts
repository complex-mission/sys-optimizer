import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri 期望前端固定端口,且不在错误时清屏
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 不监听 Rust 侧,避免无谓重载
      ignored: ["**/src-tauri/**"],
    },
  },
  // Tauri 使用 Chromium(Windows 上为 WebView2/Edge),可用较新的构建目标
  build: {
    target: "chrome105",
    minify: "oxc",
    sourcemap: false,
  },
});
