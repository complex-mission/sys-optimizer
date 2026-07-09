// 应用视觉:品牌色方块 + 真实单色 logo(自动加载) + 首字兜底。
//
// 真实 logo:把 SVG 放到 src/assets/brand-icons/<应用id>.svg,构建时自动发现,
// 用 CSS mask 染成前景色贴在品牌色块上(任何单色 SVG 均可,推荐 Simple Icons)。
// 没有对应文件的应用,自动回退到"品牌色块 + 首字"。要新增只需丢文件、无需改代码。

// 构建时收集 brand-icons 目录下的所有 svg -> { 应用id: 资源URL }
const files = import.meta.glob("../assets/brand-icons/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const ICONS: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const id = path.split("/").pop()?.replace(/\.svg$/i, "");
  if (id) ICONS[id] = url;
}

/// 应用的真实 logo 资源 URL(没有则 undefined,交给首字兜底)。
export function brandIconUrl(appId: string): string | undefined {
  return ICONS[appId];
}

// 品牌主色(应用 id -> hex)。仅用于色块背景与首字底色;找不到则按 id 稳定散列取色。
const COLORS: Record<string, string> = {
  windows: "#0078D4",
  chrome: "#4285F4",
  edge: "#0E7FC1",
  firefox: "#FF7139",
  davinci: "#009BCE",
  premiere: "#9999FF",
  aftereffects: "#9999FF",
  jianying: "#000000",
  capcut: "#000000",
  blender: "#E87D0D",
  unreal: "#313131",
  unity: "#000000",
  jetbrains: "#000000",
  androidstudio: "#3DDC84",
  gradle: "#02303A",
  flutter: "#027DFD",
  npm: "#CB3837",
  yarn: "#2C8EBB",
  pnpm: "#F69220",
  electron: "#47848F",
  "node-gyp": "#539E43",
  cargo: "#C56A2E",
  go: "#00ADD8",
  maven: "#C71A36",
  nuget: "#004880",
  composer: "#885630",
  pip: "#3776AB",
  vscode: "#007ACC",
  conda: "#44A833",
  "android-emulator": "#3DDC84",
  spotify: "#1DB954",
  photoshop: "#31A8FF",
  figma: "#A259FF",
  douyin: "#000000",
  potplayer: "#FFE000",
  vlc: "#FF8800",
  qqmusic: "#31C27C",
  "netease-music": "#C20C0C",
  docker: "#2496ED",
  zoom: "#2D8CFF",
  teams: "#6264A7",
  slack: "#4A154B",
  discord: "#5865F2",
  wechat: "#07C160",
  qq: "#12B7F5",
  epic: "#313131",
  battlenet: "#00AEFF",
  steam: "#1B2838",
  ubisoft: "#0070FF",
  wps: "#F9690E",
  notion: "#111111",
  obsidian: "#7C3AED",
  sogou: "#FF6600",
  baidudisk: "#06A7FF",
  xunlei: "#00AEEF",
  idm: "#1C5FAF",
};

function hashHue(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 360;
}

/// 应用品牌色(找不到时用 id 稳定散列出的中饱和度色,保证同一应用永远同色)。
export function brandColor(appId: string): string {
  return COLORS[appId] ?? `hsl(${hashHue(appId)}, 42%, 46%)`;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0.4;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/// 贴在品牌色块上的前景色(logo 着色 / 首字颜色):浅底用深色,深底用白色。
export function onColor(appId: string): string {
  const c = brandColor(appId);
  return c.startsWith("#") && luminance(c) > 0.62 ? "#1c1c1e" : "#ffffff";
}

/// 兜底首字:中文取首字,拉丁字母取首字母大写。
export function appInitial(name: string, appId: string): string {
  const n = (name || appId).trim();
  const first = Array.from(n)[0] ?? "?";
  return /[a-z]/i.test(first) ? first.toUpperCase() : first;
}
