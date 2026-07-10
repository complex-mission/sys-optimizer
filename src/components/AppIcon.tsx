import { appInitial, brandIconUrl } from "../lib/appVisual";
import "./AppIcon.css";

interface Props {
  appId: string;
  name: string;
  size?: number;
}

/// 应用图标:透明底 + 主题色描边(深色主题浅边、浅色主题深边),
/// logo 用 mask 染成主题前景色;没有 logo 的应用显示首字。
/// 不用品牌色块:页面上已有风险彩色圆点,底色再五颜六色会打架。
export function AppIcon({ appId, name, size = 34 }: Props) {
  const url = brandIconUrl(appId);

  return (
    <div
      className="app-icon"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      aria-hidden="true"
    >
      {url ? (
        <span
          className="app-icon-glyph"
          style={{
            width: size * 0.62,
            height: size * 0.62,
            // 引号必须有:小于 4KB 的 SVG 会被 Vite 内联成 data: URL,
            // 不带引号的 CSS url() 遇到其中的特殊字符会解析失败(mask 整个失效)
            WebkitMaskImage: `url("${url}")`,
            maskImage: `url("${url}")`,
          }}
        />
      ) : (
        <span className="app-icon-letter" style={{ fontSize: size * 0.44 }}>
          {appInitial(name, appId)}
        </span>
      )}
    </div>
  );
}
