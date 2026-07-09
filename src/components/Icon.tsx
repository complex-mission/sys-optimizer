// 内联 SVG 图标(Material Symbols 风格轮廓线)。无 emoji。
// 统一 24x24 viewBox,继承 currentColor 与父级 font-size。

import { CSSProperties } from "react";

interface IconProps {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}

export type IconName =
  | "scan"
  | "bolt"
  | "radar"
  | "apps"
  | "tune"
  | "chart-donut"
  | "file-zip"
  | "copy"
  | "memory"
  | "play"
  | "package"
  | "settings"
  | "info"
  | "chevron-down"
  | "chevron-up"
  | "close"
  | "folder-open"
  | "movie"
  | "video"
  | "sparkles"
  | "check";

const paths: Record<IconName, string> = {
  scan: "M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M3 12h18",
  bolt: "M13 3 4 14h7l-1 7 9-11h-7l1-7Z",
  radar: "M12 12 2.5 5.5M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5",
  apps: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  tune: "M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4M14 4v4M6 10v4M12 16v4",
  "chart-donut": "M12 3a9 9 0 1 0 9 9h-9V3Z M12 7a5 5 0 1 0 5 5",
  "file-zip": "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6ZM14 3v6h6M10 12h2M10 15h2M10 18h2",
  copy: "M8 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2ZM4 16V4a2 2 0 0 1 2-2h10",
  memory: "M6 6h12v12H6zM9 9h6v6H9M3 9h3M3 15h3M18 9h3M18 15h3M9 3v3M15 3v3M9 18v3M15 18v3",
  play: "M8 5v14l11-7L8 5Z",
  package: "M21 8 12 3 3 8m18 0v8l-9 5-9-5V8m18 0-9 5m0 0L3 8m9 5v8",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-up": "m6 15 6-6 6 6",
  close: "M18 6 6 18M6 6l12 12",
  "folder-open":
    "M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2M2 11h20l-2 8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1l-2-8Z",
  movie: "M4 4h16v16H4zM4 9h16M9 4v5M15 4v5M4 15h16M9 15v5M15 15v5",
  video: "M15 10l5-3v10l-5-3M3 6h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  sparkles: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z",
  check: "M20 6 9 17l-5-5",
};

export function Icon({ name, size = 20, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
