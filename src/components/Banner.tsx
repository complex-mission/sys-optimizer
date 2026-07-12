import { useI18n } from "../i18n";
import { Icon } from "./Icon";
import "./Banner.css";

interface Props {
  onDismiss: () => void;
}

export function Banner({ onDismiss }: Props) {
  const { t } = useI18n();
  return (
    <div className="banner" role="status">
      <span className="banner-dot dot-cache" />
      <span className="banner-dot dot-expensive" />
      <span className="banner-dot dot-report" />
      <p className="banner-text">{t("banner.text")}</p>
      <button className="banner-close btn-text" onClick={onDismiss}>
        {t("banner.dismiss")}
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
