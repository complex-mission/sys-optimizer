// 主题管理:深色 / 浅色 / 跟随系统。偏好存本地(UI 级设置,无需后端)。
// 通过在 <html> 上写 data-theme 驱动 tokens.css 的浅/深色变量切换。
// 同时同步原生窗口主题(标题栏),不可强制窗口深色,
// 否则 WebView2 的 prefers-color-scheme 被钉死,"跟随系统"永远解析为深色。

import { getCurrentWindow } from "@tauri-apps/api/window";

export type Theme = "system" | "light" | "dark";

const KEY = "ci-theme";

export function getTheme(): Theme {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

/** 把主题解析为实际的 light/dark(system 时跟随操作系统)。 */
function resolve(theme: Theme): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", resolve(theme));
  // 原生标题栏跟随:显式主题传 light/dark,system 传 null 交还系统
  if (!("__TAURI_INTERNALS__" in window)) return;
  getCurrentWindow()
    .setTheme(theme === "system" ? null : theme)
    .catch(() => {});
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

/** 在 system 模式下,跟随操作系统主题变化实时切换。 */
export function watchSystemTheme(): void {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", () => {
    if (getTheme() === "system") applyTheme("system");
  });
}
