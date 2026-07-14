// 从 src-tauri/rules/rules.json + src/i18n/index.tsx 生成官网的支持软件清单数据。
// 规则库或应用语言包更新后运行:node website/scripts/gen-apps.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const rules = JSON.parse(fs.readFileSync(path.join(root, "src-tauri/rules/rules.json"), "utf8"));
const i18nSrc = fs.readFileSync(path.join(root, "src/i18n/index.tsx"), "utf8");

// 解析应用语言包里的 cat.<id>.name / cat.<id>.desc(zh-CN 与 en-US 两段)
function parseDict(src, lang) {
  const start = src.indexOf(`"${lang}": {`);
  const next = lang === "zh-CN" ? src.indexOf(`"en-US": {`) : src.length;
  const seg = src.slice(start, next);
  const out = {};
  const re = /"(cat\.[^"]+|group\.[^"]+)":\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(seg))) out[m[1]] = JSON.parse(`"${m[2]}"`);
  return out;
}
const zh = parseDict(i18nSrc, "zh-CN");
const en = parseDict(i18nSrc, "en-US");

// 应用语言包用半角标点;官网按中文排版规范转为全角(仅紧邻中文时转换,路径等不受影响)
const CJK = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯「」『』——…·]/;
const PUNCT = { ",": "，", ";": "；", ":": "：", "!": "！", "?": "？" };
function toFullwidth(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") {
      const close = text.indexOf(")", i + 1);
      const nested = text.indexOf("(", i + 1);
      if (close !== -1 && (nested === -1 || nested > close)) {
        const inner = text.slice(i + 1, close);
        if (CJK.test(inner) || CJK.test(out[out.length - 1] || "")) {
          out += "（" + inner + "）";
          i = close;
          continue;
        }
      }
    }
    out += text[i];
  }
  for (let pass = 0; pass < 2; pass++) {
    let res = "";
    for (let j = 0; j < out.length; j++) {
      const c = out[j];
      if (PUNCT[c] && (CJK.test(out[j - 1] || "") || CJK.test(out[j + 1] || ""))) res += PUNCT[c];
      else res += c;
    }
    out = res;
  }
  return out;
}
for (const k of Object.keys(zh)) zh[k] = toFullwidth(zh[k]);

const groupOrder = ["video", "3d", "browser", "dev", "media", "game", "office", "tools", "comm"];
// 应用内浏览器缓存归在智能扫描类别里,语言包没有 group.browser,补上
zh["group.browser"] = zh["group.browser"] || "浏览器";
en["group.browser"] = en["group.browser"] || "Browsers";
const groups = [];
for (const g of groupOrder) {
  const apps = rules.apps.filter((a) => a.group === g);
  if (!apps.length) continue;
  groups.push({
    key: g,
    title: { zh: zh[`group.${g}`] || g, en: en[`group.${g}`] || g },
    apps: apps.map((a) => ({
      name: a.name,
      targets: a.targets.map((t) => ({
        risk: t.risk,
        name: {
          zh: zh[`cat.${t.id}.name`] || t.id,
          en: en[`cat.${t.id}.name`] || t.id,
        },
        desc: {
          zh: zh[`cat.${t.id}.desc`] || "",
          en: en[`cat.${t.id}.desc`] || "",
        },
      })),
    })),
  });
}

// 浏览器组在语言包中没有 group.browser?检查
const missing = groups.filter((g) => g.title.zh === g.key).map((g) => g.key);
if (missing.length) console.error("missing group titles:", missing);

const appCount = groups.reduce((n, g) => n + g.apps.length, 0);
const targetCount = groups.reduce((n, g) => n + g.apps.reduce((m, a) => m + a.targets.length, 0), 0);
const sysTargets = rules.apps.filter((a) => a.group === "system").reduce((n, a) => n + a.targets.length, 0);
console.log(`apps: ${appCount}, app targets: ${targetCount}, system targets: ${sysTargets}, total rules: ${targetCount + sysTargets}`);

const banner = `// 本文件由脚本从 src-tauri/rules/rules.json + src/i18n/index.tsx 生成,请勿手改。
// 重新生成:node website/scripts/gen-apps.js
// 统计:${appCount} 款软件 / ${targetCount} 个软件清理目标 / 系统规则 ${sysTargets} 条 / 共 ${targetCount + sysTargets} 条规则。

export type Risk = "cache" | "expensive" | "report";

export interface AppTarget {
  risk: Risk;
  name: { zh: string; en: string };
  desc: { zh: string; en: string };
}

export interface AppEntry {
  name: string;
  targets: AppTarget[];
}

export interface AppGroup {
  key: string;
  title: { zh: string; en: string };
  apps: AppEntry[];
}

export const appStats = { apps: ${appCount}, appTargets: ${targetCount}, systemRules: ${sysTargets}, totalRules: ${targetCount + sysTargets} };

export const appGroups: AppGroup[] = ${JSON.stringify(groups, null, 2)};
`;

fs.writeFileSync(path.join(root, "website/src/content/apps.ts"), banner, "utf8");
console.log("written website/src/content/apps.ts");
