// 首次启动的使用条款门禁。未同意则铺满全屏,同意后写入配置并放行。
// viewOnly 模式用于"关于"页回看:仅展示,按钮变为"关闭"。

import { useI18n } from "../i18n";
import "./TermsGate.css";

interface Props {
  onAccept: () => void;
  viewOnly?: boolean;
}

export function TermsGate({ onAccept, viewOnly }: Props) {
  const { lang, setLang } = useI18n();
  const zh = lang === "zh-CN";

  return (
    <div className="terms-scrim" data-scroll-isolate>
      <div className="terms-card">
        <div className="terms-lang-seg">
          <button
            className={`terms-lang-btn ${zh ? "active" : ""}`}
            onClick={() => setLang("zh-CN")}
          >
            中文
          </button>
          <button
            className={`terms-lang-btn ${!zh ? "active" : ""}`}
            onClick={() => setLang("en-US")}
          >
            English
          </button>
        </div>
        <h1 className="terms-title">
          {zh ? "使用条款" : "Terms of Use"}
        </h1>
        <p className="terms-lead">
          {viewOnly
            ? zh
              ? "以下为本软件的使用条款与免责声明,首次启动时你已阅读并同意。"
              : "Below are the terms of use and disclaimer you accepted on first launch."
            : zh
              ? "在使用 Cache Insight(智缓)前,请阅读并同意以下条款。点击“同意并继续”即表示你已阅读、理解并接受全部内容。"
              : "Before using Cache Insight, please read and accept the terms below. Clicking “Agree and continue” means you have read, understood, and accepted them."}
        </p>
        <div className="terms-body">
          {(zh ? TERMS_ZH : TERMS_EN).map((s, i) => (
            <section key={i}>
              <h2>{s.h}</h2>
              <p>{s.p}</p>
            </section>
          ))}
        </div>
        <div className="terms-actions">
          <button className="btn-filled" onClick={onAccept}>
            {viewOnly
              ? zh ? "关闭" : "Close"
              : zh ? "同意并继续" : "Agree and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TERMS_ZH = [
  { h: "软件性质", p: "本软件为内部工具,由沈阳信商科技开发、免费提供给公司内部人员及受邀用户使用,非公开上架的商业产品,不提供商业级支持与服务承诺。" },
  { h: "按现状提供", p: "本软件按“现状”和“可用”状态提供,不对其适用性、可靠性、无错误运行或满足特定需求作出任何明示或默示的保证。" },
  { h: "清理操作与用户责任", p: "一切删除操作均需经你在界面中主动选择并确认后才会执行。你确认清理后,由此产生的文件删除后果由你自行承担。请留意界面中的风险标识:无风险缓存、重建耗时项与“仅报告”条目具有不同的处理方式。" },
  { h: "数据与隐私", p: "本软件不收集、不上传任何个人数据或文件内容。全部扫描与清理均在本机完成,操作日志仅保存在本机。" },
  { h: "责任限制", p: "在适用法律允许的最大范围内,沈阳信商科技及技术支持方(解构者)不对因使用或无法使用本软件导致的任何直接或间接损失承担责任,包括但不限于数据丢失、业务中断或系统故障。" },
  { h: "使用范围", p: "本软件仅供内部使用,未经许可不得对外分发、出售或用于其他商业用途。" },
  { h: "版权", p: "© 2026 沈阳信商科技 版权所有 · 技术支持 解构者。开源组件许可清单见“关于”页。" },
];

const TERMS_EN = [
  { h: "Nature of the software", p: "Cache Insight is an internal tool developed by Shenyang Xinshang Technology, provided free to internal staff and invited users. It is not a publicly listed commercial product and carries no commercial-grade support or service commitment." },
  { h: "Provided as-is", p: "The software is provided “as is” and “as available”, without any express or implied warranty of fitness, reliability, error-free operation, or suitability for a particular purpose." },
  { h: "Cleanup and your responsibility", p: "Every deletion runs only after you actively select and confirm it in the interface. Once you confirm, the consequences of deletion are your responsibility. Note the risk labels: safe cache, slow-to-rebuild items, and “report only” entries are handled differently." },
  { h: "Data and privacy", p: "The software collects and uploads no personal data or file content. All scanning and cleaning happen on your machine; logs are stored locally only." },
  { h: "Limitation of liability", p: "To the maximum extent permitted by law, Shenyang Xinshang Technology and its support provider (Deconstructor) are not liable for any direct or indirect loss arising from use or inability to use the software, including data loss, business interruption, or system failure." },
  { h: "Scope of use", p: "For internal use only. Redistribution, sale, or other commercial use is not permitted without authorization." },
  { h: "Copyright", p: "© 2026 Shenyang Xinshang Technology. Support: Deconstructor. Open-source license list is on the About page." },
];
