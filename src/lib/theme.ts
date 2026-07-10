// 主题管理:深色 / 浅色 / 跟随系统。偏好存本地(UI 级设置,无需后端)。
// 通过在 <html> 上写 data-theme 驱动 tokens.css 的浅/深色变量切换。

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
