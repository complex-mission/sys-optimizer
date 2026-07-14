import { Icon, IconName } from "./Icon";
import "./Notice.css";

interface Props {
  text: string;
  /// 免责/风险类提示用 "warning",一般说明用默认的 "info"
  icon?: IconName;
}

/// 页面级提示条:琥珀底、无边框,全站所有页面顶部的免责/风险提示统一用它。
/// 不可关闭——这类提示每次进入页面都应该看到,而不是关一次永久消失。
export function Notice({ text, icon = "info" }: Props) {
  return (
    <div className="page-notice" role="note">
      <Icon name={icon} size={18} style={{ flexShrink: 0 }} />
      <p className="page-notice-text">{text}</p>
    </div>
  );
}
