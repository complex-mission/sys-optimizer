import React from "react";
import ReactDOM from "react-dom/client";
import { I18nProvider } from "./i18n";
import { App } from "./App";
import { getTheme, applyTheme, watchSystemTheme } from "./lib/theme";
import "./styles/global.css";

// 首屏前先套用已保存的主题,避免闪烁;并在跟随系统时监听切换
applyTheme(getTheme());
watchSystemTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
