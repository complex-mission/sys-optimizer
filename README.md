# SysOptimizer(系统优化助手)

> 看清磁盘去了哪,清得放心。

用 Rust 打造的开源 Windows 清理与系统洞察工具。Tauri 2(Rust)+ React,安装包约 1.5 MB。

- 官网与下载:<https://sys-optimizer.complexmission.com>
- 完整功能说明书:[USER_GUIDE.md](USER_GUIDE.md) —— 每个模块能扫到什么、有意不碰什么、清理后会怎样
- 支持系统:Windows 10(1809+)/ Windows 11,64 位

## 功能一览

| 模块 | 作用 | 会删东西吗 |
|---|---|---|
| 智能扫描 | 三挡(快速/标准/深度)一键清理缓存与临时文件 | 会(经确认) |
| 软件专项清理 | 66 条规则识别 56 款软件的缓存位置 | 会(经确认) |
| 空间分析 | treemap 逐层看磁盘被谁占了 | 不会(纯查看) |
| 大文件 | 按阈值找出大文件 | 会(进回收站) |
| 重复文件 | 逐字节确认的重复检测,每组强制保留一个 | 会(进回收站) |
| 启动项 | 管理开机自启 | 不删,只禁用/启用 |
| 卸载残留 | 启发式发现疑似残留 | **不删,只报告** |
| 系统级空间 | 休眠文件 / 还原点 / Windows.old / WinSxS,调用官方工具回收 | 会(逐项确认) |
| 系统信息 | 硬件配置,重点是内存插槽 | 不会(纯查看) |

## 核心设计

- **风险三级体系**:蓝色缓存默认勾选、放心清;琥珀色重建耗时项默认不勾并行内警告;灰色"仅报告"项前后端都不提供删除(双保险)。
- **谨慎删除模式**(默认开启):琥珀色项删除时先进回收站,可反悔。
- **危险目录安全闸**(`src-tauri/src/scan/engine.rs`):规则或手动路径指向盘符根、系统目录、个人文件夹或 AppData 根时,引擎拒绝递归清理。
- **路径三级解析**:手动覆盖 > 自动探测 > 默认位置;扫出 0 时行内提示"指定路径",自定义缓存位置不漏扫。
- **本地优先**:不联网、不上传、无埋点;操作写本地日志,"关于"页可看累计释放量。
- 不跟随符号链接、被占用文件自动跳过、清理前二次确认、重复文件每组至少保留一个。

## 环境要求(在 Windows 上开发)

- [Rust](https://rustup.rs/)(stable)
- [Node.js](https://nodejs.org/) 18+
- WebView2 运行时(Win11 及多数 Win10 已内置)
- Tauri 依赖见官方 prerequisites(MSVC 生成工具等)

## 运行

```bash
npm install
npm run tauri dev
```

> 首次启动会弹使用条款(需同意),之后主页顶部出现风险提示横幅(收起后 30 天再现)。
> 应用清单声明了 `requireAdministrator`,启动会弹一次 UAC。

## 测试

```bash
cd src-tauri && cargo test --lib
```

## 打包(NSIS 安装程序)

```bash
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/nsis/`。

## 规则库(rules.json)

清理规则全部外置到 `src-tauri/rules/rules.json`(编译时 include)。**新增一款软件 = 加一段 JSON + 两个 i18n 键**,无需改 Rust:

```json
{
  "apps": [
    {
      "app": "davinci", "group": "video", "name": "DaVinci Resolve",
      "detect_installed": ["%APPDATA%/Blackmagic Design/DaVinci Resolve"],
      "targets": [
        {
          "id": "davinci-proxy",
          "paths": ["%APPDATA%/Blackmagic Design/DaVinci Resolve/Support/ProxyMedia"],
          "risk": "expensive", "tier": "standard",
          "detect": "davinci", "subdir": "ProxyMedia", "supports_override": true
        }
      ]
    }
  ]
}
```

- 路径支持 `%APPDATA%` `%LOCALAPPDATA%` `%WINDIR%` `%TEMP%` `%USERPROFILE%` 占位符。
- `risk` 取 `cache`(蓝,默认勾)/ `expensive`(琥珀,默认不勾)/ `report`(灰,仅报告)。
- `detect` 按名引用 Rust 探测函数;仅当需要新的探测逻辑或文件名过滤时才动 Rust。
- 每个 target 需在 `src/i18n/index.tsx` 补 `cat.<id>.name` / `cat.<id>.desc` 两个键(中英各一)。

## 目录

```
src/                 前端(React + TS)
  styles/tokens.css  MD3E 设计令牌(种子色 #378ADD)
  i18n/              中英双语语言包
  pages/             九大模块页面 + 设置 + 关于
  components/        CategoryRow(三级风险行)/ Banner / TermsGate / Icon 等
  lib/api.ts         与 Rust 的桥接层
src-tauri/
  rules/rules.json   JSON 规则库(编译时 include)
  src/scan/          扫描/清理引擎(类别、规则解析、探测、回收站、安全闸)
  src/commands.rs    Tauri 命令层
  src/config.rs      本地配置(条款/横幅/覆盖路径/统计)
  src/hardware.rs    硬件检测(WMI)
website/             官网(Next.js):产品页、下载分发(OSS 签名直链)、管理后台
  scripts/gen-apps.js  从规则库生成官网"支持软件清单",规则更新后运行
```

## 许可

本项目以 [GPL-3.0](LICENSE) 协议开源:你可以自由使用、学习、修改和再分发,但任何基于本项目的衍生作品必须以同样的协议开源。

© 2026 沈阳信商科技 · 技术支持：解构者
