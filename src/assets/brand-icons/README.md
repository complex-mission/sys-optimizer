# 应用品牌图标(brand-icons)

把应用的 **SVG logo** 放进本目录即可,**文件名必须等于「应用 id」**(见下表),例如 `steam.svg`、`vscode.svg`、`netease-music.svg`。

## 规则

- 构建时**自动发现**本目录的 `*.svg`,无需改任何代码;放进去、重新构建就生效。
- 图标会被 CSS `mask` **染成单色**(浅底染深、深底染白)贴在品牌色块上,所以**首选单色 / 单路径 SVG**(彩色的会被压成同色剪影,通常也能用)。
- **没有对应文件的应用**自动回退到「品牌色块 + 首字」,不会缺图。
- 推荐来源:**[Simple Icons](https://simpleicons.org)**(CC0 授权、单色单路径,搜应用名下载即可)。中文 App 到官方品牌/媒体资源页找。

## 需要的文件清单(文件名 = 应用 id)

> 浏览器(chrome/edge/firefox)与 Windows 属"基础清理",当前不在"软件专项"页展示,图标可先不放。

### A. Simple Icons 一般都有(搜名字下载,单色最省事)

| 文件名 | 应用 | Simple Icons 搜索关键词 |
|---|---|---|
| `davinci.svg` | DaVinci Resolve | DaVinci Resolve |
| `premiere.svg` | Adobe Premiere Pro | Adobe Premiere Pro |
| `aftereffects.svg` | Adobe After Effects | Adobe After Effects |
| `capcut.svg` | CapCut | CapCut |
| `blender.svg` | Blender | Blender |
| `unreal.svg` | Unreal Engine | Unreal Engine |
| `unity.svg` | Unity | Unity |
| `jetbrains.svg` | JetBrains | JetBrains |
| `androidstudio.svg` | Android Studio | Android Studio |
| `gradle.svg` | Gradle | Gradle |
| `flutter.svg` | Flutter | Flutter |
| `npm.svg` | npm | npm |
| `yarn.svg` | Yarn | Yarn |
| `pnpm.svg` | pnpm | pnpm |
| `electron.svg` | Electron | Electron |
| `cargo.svg` | Rust / Cargo | Rust |
| `go.svg` | Go | Go |
| `maven.svg` | Maven | Apache Maven |
| `nuget.svg` | NuGet | NuGet |
| `composer.svg` | Composer | Composer |
| `pip.svg` | pip | PyPI(或 Python) |
| `vscode.svg` | VS Code | Visual Studio Code |
| `conda.svg` | Conda | Anaconda |
| `spotify.svg` | Spotify | Spotify |
| `photoshop.svg` | Photoshop | Adobe Photoshop |
| `figma.svg` | Figma | Figma |
| `docker.svg` | Docker | Docker |
| `zoom.svg` | Zoom | Zoom |
| `teams.svg` | Microsoft Teams | Microsoft Teams |
| `slack.svg` | Slack | Slack |
| `discord.svg` | Discord | Discord |
| `wechat.svg` | 微信 | WeChat |
| `qq.svg` | QQ | Tencent QQ |
| `douyin.svg` | 抖音 | Douyin |
| `netease-music.svg` | 网易云音乐 | NetEase Cloud Music |
| `steam.svg` | Steam | Steam |
| `epic.svg` | Epic Games | Epic Games |
| `battlenet.svg` | Battle.net | Battle.net |
| `ubisoft.svg` | Ubisoft Connect | Ubisoft |
| `notion.svg` | Notion | Notion |
| `obsidian.svg` | Obsidian | Obsidian |
| `vlc.svg` | VLC | VLC media player |
| `baidudisk.svg` | 百度网盘 | Baidu(通用百度标) |

### B. Simple Icons 多半没有,去官方/其他找

| 文件名 | 应用 | 建议 |
|---|---|---|
| `jianying.svg` | 剪映专业版 | 官方;或直接复制一份 `capcut.svg`(剪映=CapCut 国内版) |
| `node-gyp.svg` | node-gyp | 用 Node.js 图标(Simple Icons: Node.js) |
| `android-emulator.svg` | Android 模拟器 | 用 Android 图标(Simple Icons: Android) |
| `wps.svg` | WPS Office | WPS 官方品牌资源 |
| `qqmusic.svg` | QQ 音乐 | 官方(QQ 音乐品牌页) |
| `sogou.svg` | 搜狗输入法 | 官方 |
| `xunlei.svg` | 迅雷 | 官方 |
| `idm.svg` | IDM 下载器 | 官方(Internet Download Manager) |
| `potplayer.svg` | PotPlayer | 官方 |

放好后运行 `npm run build`(或 `npm run dev`)即可看到效果;缺的会继续显示品牌色首字,补一个亮一个。
