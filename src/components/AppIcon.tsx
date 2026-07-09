import { brandColor, onColor, appInitial, brandIconUrl } from "../lib/appVisual";
import "./AppIcon.css";

interface Props {
  appId: string;
  name: string;
  size?: number;
}

/// 应用图标:品牌色圆角块 + 真实单色 logo(有则用 mask 染色显示),否则显示首字。
export function AppIcon({ appId, name, size = 34 }: Props) {
  const bg = brandColor(appId);
  const fg = onColor(appId);
  const url = brandIconUrl(appId);

  return (
    <div
      className="app-icon"
      style={{ width: size, height: size, background: bg, borderRadius: size * 0.28 }}
      aria-hidden="true"
    >
      {url ? (
        <span
          className="app-icon-glyph"
          style={{
            width: size * 0.62,
            height: size * 0.62,
            backgroundColor: fg,
            WebkitMaskImage: `url(${url})`,
            maskImage: `url(${url})`,
          }}
        />
      ) : (
        <span className="app-icon-letter" style={{ color: fg, fontSize: size * 0.44 }}>
          {appInitial(name, appId)}
        </span>
      )}
    </div>
  );
}
