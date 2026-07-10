import { useEffect, useState, type ReactElement } from "react";
import { useI18n } from "./i18n";
import { api } from "./lib/api";
import { Icon, IconName } from "./components/Icon";
import { TermsGate } from "./components/TermsGate";
import { Banner } from "./components/Banner";
import { ScanPage } from "./pages/ScanPage";
import { AppsPage } from "./pages/AppsPage";
import { SpacePage } from "./pages/SpacePage";
import { SystemPage } from "./pages/SystemPage";
import { LargePage } from "./pages/LargePage";
import { DupPage } from "./pages/DupPage";
import { StartupPage } from "./pages/StartupPage";
import { LeftoverPage } from "./pages/LeftoverPage";
import { HardwarePage } from "./pages/HardwarePage";
import { SettingsPage } from "./pages/SettingsPage";
import { AboutPage } from "./pages/AboutPage";
import logoCn from "./assets/logo-horizontal-cn.svg?raw";
import logoEn from "./assets/logo-horizontal-en.svg?raw";
import "./App.css";

type Route =
  | "scan"
  | "apps"
  | "system"
  | "space"
  | "large"
  | "dup"
  | "hardware"
  | "startup"
  | "uninstall"
  | "settings"
  | "about";

interface NavItem {
  id: Route;
  icon: IconName;
  labelKey: string;
}

const NAV_GROUPS: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "nav.group.clean",
    items: [
      { id: "scan", icon: "sparkles", labelKey: "nav.scan" },
      { id: "apps", icon: "apps", labelKey: "nav.apps" },
      { id: "system", icon: "tune", labelKey: "nav.system" },
    ],
  },
  {
    titleKey: "nav.group.analyze",
    items: [
      { id: "space", icon: "chart-donut", labelKey: "nav.space" },
      { id: "large", icon: "file-zip", labelKey: "nav.large" },
      { id: "dup", icon: "copy", labelKey: "nav.dup" },
      { id: "hardware", icon: "memory", labelKey: "nav.hardware" },
    ],
  },
  {
    titleKey: "nav.group.manage",
    items: [
      { id: "startup", icon: "play", labelKey: "nav.startup" },
      { id: "uninstall", icon: "package", labelKey: "nav.uninstall" },
    ],
  },
];

const PAGES: Record<Route, () => ReactElement> = {
  scan: () => <ScanPage />,
  apps: () => <AppsPage />,
  system: () => <SystemPage />,
  space: () => <SpacePage />,
  large: () => <LargePage />,
  dup: () => <DupPage />,
  hardware: () => <HardwarePage />,
  startup: () => <StartupPage />,
  uninstall: () => <LeftoverPage />,
  settings: () => <SettingsPage />,
  about: () => <AboutPage />,
};

export function App() {
  const { t, lang, setLang } = useI18n();
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [route, setRoute] = useState<Route>("scan");
  // 已访问过的页面:一旦挂载就保持存活(仅切换显隐),
  // 这样离开再回来时状态(扫描进度、检测结果)不丢失,也不会重复触发自动检测。
  const [mounted, setMounted] = useState<Set<Route>>(new Set(["scan"]));

  const go = (r: Route) => {
    setMounted((prev) => (prev.has(r) ? prev : new Set(prev).add(r)));
    setRoute(r);
  };

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.getConfig();
        // 应用持久化的语言设置(system 则跟随浏览器,保持默认)
        if (cfg.language === "zh-CN" || cfg.language === "en-US") {
          setLang(cfg.language);
        }
        setAccepted(cfg.terms_accepted);
        if (cfg.terms_accepted) {
          setShowBanner(await api.shouldShowBanner());
        }
      } catch {
        // 浏览器预览(无 Tauri)时降级:直接放行,便于纯前端调试
        setAccepted(true);
        setShowBanner(true);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const handleAccept = async () => {
    try {
      await api.acceptTerms();
      setShowBanner(await api.shouldShowBanner());
    } catch {
      setShowBanner(true);
    }
    setAccepted(true);
  };

  const handleDismissBanner = async () => {
    try {
      await api.dismissBanner();
    } catch {
      /* 忽略 */
    }
    setShowBanner(false);
  };

  if (!ready) return null;
  if (!accepted) return <TermsGate onAccept={handleAccept} />;

  return (
    <div className="shell">
      <nav className="sidebar">
        {/* 横版 logo 按语言切换;字标部分是 currentColor,跟随主题深浅 */}
        <div
          className="brand"
          role="img"
          aria-label={t("app.name")}
          dangerouslySetInnerHTML={{ __html: lang === "zh-CN" ? logoCn : logoEn }}
        />

        {NAV_GROUPS.map((g) => (
          <div key={g.titleKey} className="nav-group">
            <div className="nav-group-title">{t(g.titleKey)}</div>
            {g.items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${route === item.id ? "active" : ""}`}
                onClick={() => go(item.id)}
              >
                <Icon name={item.icon} size={18} />
                <span>{t(item.labelKey)}</span>
              </button>
            ))}
          </div>
        ))}

        <div className="nav-spacer" />
        <div className="nav-group">
          <button
            className={`nav-item ${route === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <Icon name="settings" size={18} />
            <span>{t("nav.settings")}</span>
          </button>
          <button
            className={`nav-item ${route === "about" ? "active" : ""}`}
            onClick={() => go("about")}
          >
            <Icon name="info" size={18} />
            <span>{t("nav.about")}</span>
          </button>
        </div>
      </nav>

      <main className="content">
        {showBanner && <Banner onDismiss={handleDismissBanner} />}
        {/* 已访问的页面保持挂载,仅用 display 切换显隐,离开再回来状态不丢失 */}
        {(Object.keys(PAGES) as Route[])
          .filter((r) => mounted.has(r))
          .map((r) => (
            <div
              key={r}
              className="page"
              style={r === route ? undefined : { display: "none" }}
            >
              {PAGES[r]()}
            </div>
          ))}
      </main>
    </div>
  );
}
