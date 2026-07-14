// 首页的结构化文案(模块说明书 / 安全承诺 / 工程细节 / FAQ)。
// 所有描述均以应用源码与 src-tauri/rules/rules.json 为准,更新功能后请同步本文件。
import type { Locale } from "@/i18n/dict";

export interface ModuleDoc {
  key: string;
  name: string;
  tagline: string;
  points: string[];
}

export interface HomeContent {
  stats: { value: string; label: string }[];
  modulesTitle: string;
  modulesDesc: string;
  modules: ModuleDoc[];
  appsTitle: string;
  appsDesc: string;
  appsNote: string;
  notDoTitle: string;
  notDoDesc: string;
  notDo: string[];
  craftTitle: string;
  craftDesc: string;
  craft: { title: string; desc: string }[];
  techTitle: string;
  techDesc: string;
  tech: { title: string; desc: string; link?: { href: string; label: string } }[];
  faqTitle: string;
  faq: { q: string; a: string }[];
}

const zh: HomeContent = {
  stats: [
    { value: "≈1.5 MB", label: "安装包体积" },
    { value: "9", label: "大功能模块" },
    { value: "66", label: "条清理规则 · 56 款软件" },
    { value: "0", label: "数据上传,全程本地" },
  ],

  modulesTitle: "功能说明书",
  modulesDesc:
    "每个模块我们都说清楚三件事:能做什么、有意不碰什么、操作后会怎样。下面就是全部 9 个模块的完整说明。",
  modules: [
    {
      key: "scan",
      name: "智能扫描",
      tagline: "一键清理缓存与临时文件,三挡深度由你决定",
      points: [
        "快速挡(秒级):用户/系统临时文件、Chrome / Edge / Firefox 浏览器缓存、错误报告与崩溃转储、回收站。",
        "标准挡(约 1 分钟,推荐):快速挡全部 + 缩略图缓存、Windows 更新缓存、已安装专业软件的缓存。",
        "深度挡(数分钟):标准挡全部 + Prefetch、Windows 日志与内存转储、包管理器与构建缓存(npm / Gradle / Cargo / Go / Maven 等)。",
        "支持自定义扫描范围:按类别逐项勾选,已按当前挡位预选。",
        "只清缓存,绝不动浏览器书签、密码、历史记录和 Cookie 登录状态 —— 清理后你不会被登出。",
        "正在被占用的文件自动跳过,清理结果会告诉你跳过了几个;清理前还有一次确认。",
      ],
    },
    {
      key: "apps",
      name: "软件专项清理",
      tagline: "认识 56 款软件的缓存位置,清得比通用工具更准",
      points: [
        "内置 66 条清理规则,覆盖视频剪辑、3D 与游戏引擎、开发者工具、游戏平台、办公通讯等 9 类共 56 款软件。",
        "按软件分组展示,自动检测安装状态,未安装的不打扰。",
        "路径三级解析:手动指定 > 自动探测 > 默认位置。达芬奇等软件的自定义缓存目录能自动探测出来。",
        "扫出 0 时行内提示「指定路径」—— 你把缓存挪去别的盘也不会漏扫。",
        "手动指定路径如果指向系统目录或盘符根,程序会直接拒绝,防止误操作。",
      ],
    },
    {
      key: "space",
      name: "空间分析",
      tagline: "回答「我什么都没干,磁盘怎么就满了」",
      points: [
        "像 TreeSize 一样逐层画出空间占用,方块图与列表双视图,点击色块层层下钻。",
        "边扫边看:大磁盘扫描过程中实时显示进度,不用干等。",
        "纯查看,不删任何东西 —— 找到大目录后「打开位置」直接去处理。",
        "额外列出 Windows Installer、Office 安装缓存、字体缓存、搜索索引等「看得到但不该自动删」的已知位置,并解释为什么不该删。",
      ],
    },
    {
      key: "large",
      name: "大文件",
      tagline: "找出占地方的大文件,删除一律进回收站",
      points: [
        "阈值可选 50 MB / 100 MB / 500 MB / 1 GB,结果按大小排序。",
        "大文件是你自己的文件,不是垃圾 —— 所以删除一律移入回收站,后悔了随时找回。",
        "Windows、Program Files 等系统目录不扫描;即使手动指定,程序也会拒绝删除(双重保护)。",
      ],
    },
    {
      key: "dup",
      name: "重复文件",
      tagline: "逐字节确认的重复检测,每组强制保留一个",
      points: [
        "三步逐级筛查:先比大小,再快速比对文件首尾采样,最后完整校验 —— 只有内容真正逐字节相同才判为重复,不误判。",
        "每组默认保留一个,其余标记删除;你可以改选保留哪一个。",
        "界面从根本上阻止你把一组文件的所有副本全删光 —— 每组至少保留一个,这是硬性规则。",
        "删除移入回收站,可恢复。",
      ],
    },
    {
      key: "startup",
      name: "启动项",
      tagline: "只禁用,不删除,随时可恢复",
      points: [
        "汇总三个来源:注册表 Run 键(当前用户 + 所有用户)、启动文件夹、计划任务。",
        "关掉开关 = 禁用,不是删除 —— 与 Windows 任务管理器的做法一致,原始项完整保留,随时重新打开。",
      ],
    },
    {
      key: "leftover",
      name: "卸载残留",
      tagline: "启发式发现,只报告 —— 界面上连删除按钮都没有",
      points: [
        "对照已安装软件列表,在 Program Files、AppData 里找对不上号的疑似残留目录。",
        "这类判断天生是猜测,可能把还在用的绿色软件误认成残留 —— 所以我们只列出报告并标注参考置信度,不提供任何删除功能。",
        "「打开位置」交给你自己查看、自己判断。删不删,完全由你决定。",
      ],
    },
    {
      key: "system",
      name: "系统级空间",
      tagline: "休眠文件、还原点、Windows.old、WinSxS —— 全部用微软官方工具回收",
      points: [
        "休眠文件通常是内存的 40–75%(16 GB 内存约 6–12 GB);Windows.old 常有 10–30 GB。",
        "所有操作调用 Windows 官方工具(powercfg / DISM / vssadmin)完成,不是暴力删文件。",
        "风险最高的模块,所以默认全部关闭:每项都写明代价,操作前再次弹窗确认,已处于目标状态的项直接置灰。",
      ],
    },
    {
      key: "hardware",
      name: "系统信息",
      tagline: "看清硬件配置,重点是内存插槽",
      points: [
        "CPU、主板 / BIOS、显卡、硬盘、显示器、笔记本电池健康度(满充容量 / 设计容量)。",
        "内存插槽是重点:总共几个槽、用了几个、剩几个空位,每根内存的容量、频率、代际(DDR4/DDR5)、品牌型号 —— 想加内存一眼就有答案。",
        "一键复制整份报告,发给 IT 或朋友帮忙看配置。",
        "有意不加载内核驱动,所以不读温度 / 风扇 / 电压 —— 内核驱动有安全与稳定性风险,日常工具不值得冒。",
      ],
    },
  ],

  appsTitle: "支持的软件,一款一款列给你看",
  appsDesc:
    "以下清单直接生成自软件内置的规则库,与应用行为完全一致。每一项都标注了风险等级 —— 蓝色放心清,琥珀色想清楚再清,灰色只报告体积、绝不删除。",
  appsNote:
    "微信 / QQ / 网盘 / 播放器等软件把你的文件和缓存混在同一目录,难以自动、安全地只挑出缓存 —— 为避免误删,这些统一「仅报告」:显示体积、提供打开位置,删不删由你决定。",

  notDoTitle: "我们有意不做的事",
  notDoDesc: "克制比激进更难。为了让你放心,这里明确列出本工具永远不会做的事:",
  notDo: [
    "不删除你的个人文件 —— 文档、照片、视频、项目,缓存清理绝不触碰这些区域。",
    "不动浏览器书签、密码、历史记录、Cookie 登录状态 —— 清完缓存你不会被登出。",
    "不删除你的内容 —— 微信 / QQ 接收的文件、Zoom 会议录像、Docker 镜像、离线音乐等只报告体积,连删除按钮都不提供。",
    "不清 C:\\Windows\\Installer —— 网上流传的「省空间技巧」实为危险误区,删了会导致程序无法卸载、修复和更新。",
    "不做注册表「优化」「清理」 —— 收益极小、风险不低,业界已普遍不建议。",
    "不加载内核驱动 —— 因此不读温度风扇,也不会引来杀软报警和蓝屏风险。",
    "不联网上传任何数据 —— 扫描、清理、日志全部只在你的电脑上。",
  ],

  craftTitle: "细节,都替你想过了",
  craftDesc: "一款删文件的工具,值得用最谨慎的方式来做。这些是藏在代码里的安全设计:",
  craft: [
    {
      title: "危险目录安全闸",
      desc: "清理引擎内置保护:即使某条规则或手动指定的路径异常地指向了盘符根、Windows / Program Files、桌面 / 文档等个人文件夹或 AppData 根,引擎都会拒绝递归清理。前后端双保险。",
    },
    {
      title: "谨慎删除模式(默认开启)",
      desc: "重建耗时的琥珀色项删除时先进回收站,给你反悔的机会;无风险缓存才直接删除。设置里可随时切换。",
    },
    {
      title: "占用与运行检测",
      desc: "正在被占用的文件自动跳过并计数;检测到目标软件正在运行时,行内提醒你先关闭再清理,避免程序页面错乱。",
    },
    {
      title: "不跟随符号链接",
      desc: "扫描和清理都不跟随符号链接与快捷方式 —— 不会误删链接指向的真实内容,也不会重复计算体积。",
    },
    {
      title: "文件级预览与反选",
      desc: "清理前可逐文件预览,按大小排序,随手反选要保留的;每次清理前都有一次明确的确认弹窗。",
    },
    {
      title: "行内风险提示",
      desc: "回收站「清空后无法恢复」、达芬奇代理「重新生成可能需要数小时」、Go 模块缓存只读需特殊处理 —— 该提醒的话,写在每一行该出现的地方。",
    },
    {
      title: "本地操作日志",
      desc: "每次清理写入本地日志,设置页一键打开日志目录;「关于」页还能看到累计释放空间与清理次数。",
    },
    {
      title: "下载可校验",
      desc: "官网下载页提供每个安装包的 SHA-256 校验值,下载后可自行核对完整性。",
    },
  ],

  techTitle: "Rust 打造,开源可审计",
  techDesc: "工具的可信,来自技术选型与代码公开。",
  tech: [
    {
      title: "Rust + Tauri 2",
      desc: "扫描与清理引擎用 Rust 编写,原生性能、内存安全;界面基于系统自带的 WebView2,不捆绑浏览器内核。",
    },
    {
      title: "安装包约 1.5 MB",
      desc: "不到同类 Electron 工具的几十分之一。下载快、安装快、不占地方 —— 一个清理工具,自己先做到了轻。",
    },
    {
      title: "开源软件(GPL-3.0)",
      desc: "代码以 GPL-3.0 协议完全公开,每一条清理规则、每一道安全闸都可以被审计。「关于」页列出全部开源组件许可。",
      link: { href: "https://github.com/complex-mission/sys-optimizer", label: "GitHub 上查看源码 →" },
    },
    {
      title: "中英双语",
      desc: "界面与官网均提供中文 / English,默认跟随系统语言,设置里随时切换。",
    },
    {
      title: "信商科技出品",
      desc: "由沈阳信商科技开发,技术支持：解构者。规则库持续更新,新增一款软件的支持只需一段规则配置。",
    },
  ],

  faqTitle: "常见问题",
  faq: [
    {
      q: "第一次运行提示「Windows 已保护你的电脑」?",
      a: "因为本工具未购买代码签名证书,并非病毒。点「更多信息 → 仍要运行」即可。如有顾虑,可核对下载页提供的 SHA-256 校验值。",
    },
    {
      q: "为什么打开就要管理员权限?",
      a: "清理系统临时文件、Windows 更新缓存,以及回收系统级空间都需要管理员权限。为了功能完整,应用启动即请求提权(UAC 弹窗一次)。",
    },
    {
      q: "清理后能恢复吗?",
      a: "缓存类删了会自动重建,无需恢复;大文件、重复文件和琥珀色项(谨慎模式下)都进回收站,可随时找回;回收站清空和系统级空间不可恢复 —— 这些在界面上都有明确红字提示。",
    },
    {
      q: "会上传我的数据吗?",
      a: "不会。不收集、不上传任何数据,没有账号系统,没有统计埋点。所有扫描与清理都在本机完成,日志也只存在本机。",
    },
    {
      q: "会不会把我的文档、照片删掉?",
      a: "不会。缓存清理只进入明确的缓存 / 临时目录;引擎内置危险目录安全闸,规则或手动路径指向个人文件夹时直接拒绝。大文件、重复文件虽然扫你的目录,但需要你自己勾选,且删除全部进回收站。",
    },
    {
      q: "支持 Windows 7 吗?",
      a: "不支持。仅支持 Windows 10(1809 及以上)与 Windows 11,64 位。",
    },
  ],
};

const en: HomeContent = {
  stats: [
    { value: "≈1.5 MB", label: "installer size" },
    { value: "9", label: "feature modules" },
    { value: "66", label: "cleaning rules · 56 apps" },
    { value: "0", label: "data uploaded — 100% local" },
  ],

  modulesTitle: "The full manual",
  modulesDesc:
    "For every module we spell out three things: what it does, what it deliberately never touches, and what happens afterwards. Here are all nine.",
  modules: [
    {
      key: "scan",
      name: "Smart scan",
      tagline: "One-click cache & temp cleanup, three depths to choose from",
      points: [
        "Quick (seconds): user & system temp files, Chrome / Edge / Firefox caches, error reports & crash dumps, recycle bin.",
        "Standard (~1 min, recommended): everything in Quick + thumbnail cache, Windows Update cache, caches of installed pro apps.",
        "Deep (minutes): everything in Standard + Prefetch, Windows logs & memory dumps, package-manager and build caches (npm / Gradle / Cargo / Go / Maven and more).",
        "Custom scope: pick categories one by one, preselected by the current tier.",
        "Caches only — bookmarks, passwords, history and cookie logins are never touched. You won't be signed out.",
        "Files in use are skipped automatically and counted; there's always one more confirmation before cleaning.",
      ],
    },
    {
      key: "apps",
      name: "App-specific cleaning",
      tagline: "Knows the cache locations of 56 apps — more precise than generic cleaners",
      points: [
        "66 built-in rules covering 56 apps across 9 groups: video editing, 3D & game engines, developer tools, game launchers, office & communication and more.",
        "Grouped by app, with automatic install detection — apps you don't have stay out of the way.",
        "Three-level path resolution: manual override > auto detection > default. Custom cache folders (e.g. DaVinci Resolve) are detected from the app's own config.",
        "When a target scans as 0, an inline “Set path” hint appears — moving a cache to another drive won't hide it.",
        "Manually specified paths pointing at system folders or drive roots are rejected outright.",
      ],
    },
    {
      key: "space",
      name: "Disk map",
      tagline: "Answers “I did nothing — why is my disk full?”",
      points: [
        "Draws disk usage layer by layer, TreeSize-style: treemap and list views, click to drill down.",
        "Live results while scanning — no waiting on large disks.",
        "View-only: deletes nothing. Found the culprit? “Open location” takes you straight there.",
        "Also lists known locations you can see but shouldn't auto-delete — Windows Installer, Office install cache, font cache, search index — and explains why.",
      ],
    },
    {
      key: "large",
      name: "Large files",
      tagline: "Find space hogs — deletions always go to the Recycle Bin",
      points: [
        "Thresholds of 50 MB / 100 MB / 500 MB / 1 GB, results sorted by size.",
        "Large files are your files, not junk — so deletion always means the Recycle Bin, restorable anytime.",
        "System folders (Windows, Program Files…) are never scanned; even manually targeted system files are refused (double protection).",
      ],
    },
    {
      key: "dup",
      name: "Duplicate files",
      tagline: "Byte-for-byte verified duplicates; one copy per group is always kept",
      points: [
        "Three-stage detection: size comparison first, then fast head/tail sampling, then a full-content check — only true byte-identical files are flagged. No false positives.",
        "One file per group is kept by default; you choose which one.",
        "The UI makes it impossible to delete every copy in a group — at least one always survives. Hard rule.",
        "Deletions go to the Recycle Bin, restorable.",
      ],
    },
    {
      key: "startup",
      name: "Startup",
      tagline: "Disable only, never delete — always reversible",
      points: [
        "Aggregates three sources: registry Run keys (current user + all users), the Startup folder, and scheduled tasks.",
        "Toggling off means disabled, not deleted — same as Windows Task Manager. The original entry stays intact and can be re-enabled anytime.",
      ],
    },
    {
      key: "leftover",
      name: "Uninstall leftovers",
      tagline: "Heuristic discovery, report-only — there isn't even a delete button",
      points: [
        "Cross-checks the installed-programs list against Program Files and AppData to surface folders that match nothing.",
        "This kind of guess can be wrong — a portable app you still use might look like a leftover. So we only report, with a confidence label, and provide no delete function at all.",
        "“Open location” hands it over to you. Whether and how to delete is entirely your call.",
      ],
    },
    {
      key: "system",
      name: "System space",
      tagline: "Hibernation file, restore points, Windows.old, WinSxS — reclaimed via official Microsoft tools",
      points: [
        "The hibernation file is typically 40–75% of your RAM (6–12 GB on a 16 GB machine); Windows.old often holds 10–30 GB.",
        "Every operation calls official Windows tools (powercfg / DISM / vssadmin) — no brute-force file deletion.",
        "The riskiest module, so everything is off by default: each item states its cost, asks for confirmation again, and items already in the target state are greyed out.",
      ],
    },
    {
      key: "hardware",
      name: "System info",
      tagline: "Your hardware at a glance — RAM slots front and center",
      points: [
        "CPU, motherboard / BIOS, GPU, drives, displays, laptop battery health (full-charge vs design capacity).",
        "RAM slots are the highlight: total slots, used, free, plus each module's capacity, speed, generation (DDR4/DDR5), brand and model — planning an upgrade takes one glance.",
        "Copy the whole report with one click to share with IT or a friend.",
        "Deliberately loads no kernel driver, so no temperatures / fan speeds / voltages — kernel drivers carry security and stability risks a daily tool shouldn't take.",
      ],
    },
  ],

  appsTitle: "Supported apps, listed one by one",
  appsDesc:
    "This list is generated straight from the app's built-in rule library, so it matches actual behavior exactly. Every target carries a risk label — blue cleans safely, amber deserves a second thought, grey is reported only and never deleted.",
  appsNote:
    "WeChat / QQ / cloud drives / media players mix your files with their caches in the same folders, so caches can't be picked out automatically and safely. To avoid deleting your files, these are report-only: size shown, location openable, deletion left to you.",

  notDoTitle: "Things we deliberately don't do",
  notDoDesc: "Restraint is harder than aggression. For your peace of mind, here is what this tool will never do:",
  notDo: [
    "Never deletes your personal files — documents, photos, videos, projects. Cache cleaning never enters those areas.",
    "Never touches browser bookmarks, passwords, history or cookie logins — you won't be signed out after cleaning.",
    "Never deletes your content — files received in WeChat / QQ, Zoom recordings, Docker images, offline music are reported only; there isn't even a delete button.",
    "Never cleans C:\\Windows\\Installer — the “space-saving trick” you may have read about is a dangerous myth that breaks uninstall, repair and updates.",
    "No registry “optimization” or “cleaning” — minimal benefit, non-trivial risk; the industry has long advised against it.",
    "No kernel drivers — so no temperature readouts, but also no antivirus alarms and no blue-screen risk.",
    "Never connects or uploads anything — scanning, cleaning and logs all stay on your machine.",
  ],

  craftTitle: "The details are taken care of",
  craftDesc: "A tool that deletes files deserves to be built with maximum caution. These safeguards live in the code:",
  craft: [
    {
      title: "Dangerous-path safety gate",
      desc: "The cleaning engine refuses to recursively clean any path that resolves to a drive root, Windows / Program Files, personal folders like Desktop or Documents, or the AppData root — even if a rule or manual override points there. Enforced on both frontend and backend.",
    },
    {
      title: "Cautious delete mode (on by default)",
      desc: "Amber slow-to-rebuild items go to the Recycle Bin first, giving you a way back; only risk-free caches are deleted directly. Toggle it anytime in Settings.",
    },
    {
      title: "In-use and running-app detection",
      desc: "Locked files are skipped and counted; if the target app is running, an inline note asks you to close it first so its open pages don't break.",
    },
    {
      title: "Symlinks never followed",
      desc: "Neither scanning nor cleaning follows symbolic links or shortcuts — link targets are never deleted by mistake, and sizes are never double-counted.",
    },
    {
      title: "File-level preview & deselect",
      desc: "Preview every file before cleaning, sorted by size, and deselect anything you want to keep. Every cleanup ends with an explicit confirmation dialog.",
    },
    {
      title: "Inline risk notes",
      desc: "“Recycle bin — cannot be undone”, “DaVinci proxies — regenerating may take hours”, “Go module cache is read-only” — every warning appears exactly on the row where it matters.",
    },
    {
      title: "Local action log",
      desc: "Every cleanup is written to a local log, one click away in Settings; the About page tracks total space freed and cleanup count.",
    },
    {
      title: "Verifiable downloads",
      desc: "The download page publishes a SHA-256 checksum for every installer, so you can verify integrity yourself.",
    },
  ],

  techTitle: "Built with Rust. Open source, auditable.",
  techDesc: "Trust comes from the tech stack and from public code.",
  tech: [
    {
      title: "Rust + Tauri 2",
      desc: "The scan and cleanup engine is written in Rust — native performance, memory safety. The UI runs on the system's built-in WebView2; no bundled browser engine.",
    },
    {
      title: "≈1.5 MB installer",
      desc: "A fraction of the size of comparable Electron tools. Fast to download, fast to install — a cleaner that starts by being light itself.",
    },
    {
      title: "Open source (GPL-3.0)",
      desc: "The code is fully public under GPL-3.0 — every cleaning rule and every safety gate can be audited. The About page lists all open-source component licenses.",
      link: { href: "https://github.com/complex-mission/sys-optimizer", label: "View the source on GitHub →" },
    },
    {
      title: "Bilingual",
      desc: "Chinese and English in both the app and this site, following your system language by default, switchable anytime.",
    },
    {
      title: "By Xinshang Technology",
      desc: "Developed by Shenyang Xinshang Technology, technical support by Deconstructor. The rule library keeps growing — supporting a new app takes one rule entry.",
    },
  ],

  faqTitle: "FAQ",
  faq: [
    {
      q: "Windows says “Windows protected your PC” on first run?",
      a: "That's because the tool ships without a paid code-signing certificate — it is not a virus. Click “More info → Run anyway”. If in doubt, verify the SHA-256 checksum published on the download page.",
    },
    {
      q: "Why does it ask for administrator rights?",
      a: "Cleaning system temp files, the Windows Update cache, and reclaiming system-level space all require elevation. The app requests it once at startup (a single UAC prompt) so every feature works.",
    },
    {
      q: "Can I undo a cleanup?",
      a: "Caches rebuild automatically, so nothing to undo. Large files, duplicates and amber items (in cautious mode) go to the Recycle Bin and can be restored. Emptying the recycle bin and system-level space are irreversible — the UI marks these clearly.",
    },
    {
      q: "Does it upload my data?",
      a: "No. Nothing is collected or uploaded — no accounts, no analytics. All scanning and cleaning happen on your machine, and logs stay local too.",
    },
    {
      q: "Could it delete my documents or photos?",
      a: "No. Cache cleaning only enters explicit cache/temp folders, and the engine's safety gate rejects any rule or manual path that points at personal folders. Large-file and duplicate scans do look at your folders, but you tick every file yourself and deletions go to the Recycle Bin.",
    },
    {
      q: "Does it support Windows 7?",
      a: "No. Windows 10 (1809+) and Windows 11 only, 64-bit.",
    },
  ],
};

const content: Record<Locale, HomeContent> = { zh, en };

export function getHomeContent(locale: Locale): HomeContent {
  return content[locale];
}
