# Cache Insight(智缓)

Windows 10/11 垃圾清理与系统洞察工具 · Tauri 2(Rust)+ React。

当前为**工程骨架**:纵向打通了「快速扫描 → 三级风险结果 → 文件预览/反选 → 清理 → 日志/累计统计」这条主路径,作为后续所有模块的样板。

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

## 打包(NSIS 安装程序)

```bash
# 先放好图标:src-tauri/icons/{32x32.png,128x128.png,icon.ico}
# 或一键生成:npm run tauri icon path/to/logo.png
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/nsis/`。

## 已实现(骨架)

- 三挡扫描(快速/标准/深度)= 类别预设,底层共用类别系统
- **风险三级体系**:cache 默认勾 / expensive 默认不勾+行内警告 / report 无删除按钮(前后端双保险)
- 文件级预览(按大小排序、反选保留)
- **路径三级解析:手动覆盖 > 自动探测 > 默认写死**
  - 达芬奇作为样例:探测其配置解析自定义缓存根;扫出 0 时行内提示「指定路径」让用户手动指定(解决自定义 proxy 路径的漏扫)
- **软件专项页 + JSON 规则库**
  - 规则全部外置到 `src-tauri/rules/rules.json`(编译时 include),新增一款软件 = 加一段 JSON,无需改 Rust
  - 专项页按软件分组展示,自动检测安装状态,可为每个类别手动指定/清除路径,实时显示当前解析到的路径
  - 首批 13 款软件 / 19 个清理目标(达芬奇、Premiere、AE、Blender、Unreal、JetBrains、npm、Spotify、Docker、Zoom 等)
- 使用条款门禁、启动横幅(30 天再现)、关于页(版权/构建日期/累计统计/开源许可)
- 中英双语(跟随系统,可切换)
- MD3 Expressive 令牌系统(种子色 #378ADD)、内联 SVG 图标、无 emoji
- 本地操作日志、崩溃 panic 落盘、release 体积优化

## 规则库(rules.json)结构

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

路径支持 `%APPDATA%` `%LOCALAPPDATA%` `%WINDIR%` `%TEMP%` `%USERPROFILE%` 占位符。
`detect` 按名引用 Rust 探测函数(当前:`davinci` / `chromium`);`name_filter` 同理(`thumbcache` / `blender-temp`)。
新增软件只需加 JSON;仅当需要新的探测逻辑或文件名过滤时才动 Rust。

## 目录

```
src/                 前端(React + TS)
  styles/tokens.css  MD3E 设计令牌(种子色派生)
  i18n/              中英双语语言包
  pages/ScanPage     扫描主流程(样板)
  components/        CategoryRow(三级风险行)/ Banner / TermsGate / Icon
  lib/api.ts         与 Rust 的桥接层
src-tauri/
  rules/rules.json   JSON 规则库(编译时 include)
  src/scan/
    categories.rs    从规则库构建类别 + 三级路径解析
    rules.rs         规则库加载/解析 + 专项页视图构建
    detect.rs        软件配置路径探测(达芬奇)
    engine.rs        扫描/清理引擎(白名单、跳过占用、不跟随符号链接)
    recycle.rs       回收站(PowerShell)
  src/commands.rs    Tauri 命令层
  src/config.rs      本地配置(条款/横幅/覆盖路径/统计)
  src/hardware.rs    模块 I 硬件检测(结构就绪,WMI 待接入)
```

## 后续扩展

- 软件专项页:规则库 JSON 化 + 手动指定路径的管理 UI(当前覆盖能力后端已就绪)
- 空间分析(treemap)、大文件、重复文件(worker/rayon)、启动项、卸载残留
- 硬件检测接入 `wmi` crate(hardware.rs 已留接口与 TODO)
- 单实例插件(lib.rs 已注释说明接入位置)

© 2026 沈阳信商科技 版权所有 · 技术支持:解构者
