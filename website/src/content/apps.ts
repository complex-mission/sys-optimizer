// 本文件由脚本从 src-tauri/rules/rules.json + src/i18n/index.tsx 生成,请勿手改。
// 重新生成:node website/scripts/gen-apps.js
// 统计:56 款软件 / 57 个软件清理目标 / 系统规则 9 条 / 共 66 条规则。

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

export const appStats = { apps: 56, appTargets: 57, systemRules: 9, totalRules: 66 };

export const appGroups: AppGroup[] = [
  {
    "key": "video",
    "title": {
      "zh": "视频剪辑",
      "en": "Video editing"
    },
    "apps": [
      {
        "name": "DaVinci Resolve",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "DaVinci Resolve 渲染缓存",
              "en": "DaVinci Resolve render cache"
            },
            "desc": {
              "zh": "达芬奇渲染缓存，可自动重建",
              "en": "Render cache, rebuilt automatically"
            }
          },
          {
            "risk": "expensive",
            "name": {
              "zh": "DaVinci Resolve 代理文件",
              "en": "DaVinci Resolve proxy media"
            },
            "desc": {
              "zh": "达芬奇代理媒体，重新生成可能需要数小时",
              "en": "Proxy media — regenerating may take hours"
            }
          }
        ]
      },
      {
        "name": "Adobe Premiere Pro",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Premiere 媒体缓存",
              "en": "Premiere media cache"
            },
            "desc": {
              "zh": "媒体加速缓存（peak/cfa 等），软件会自动重建",
              "en": "Accelerator media cache (peak/cfa files); rebuilt automatically"
            }
          }
        ]
      },
      {
        "name": "Adobe After Effects",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "After Effects 磁盘缓存",
              "en": "After Effects disk cache"
            },
            "desc": {
              "zh": "预览渲染的磁盘缓存，软件会自动重建",
              "en": "Preview render disk cache; rebuilt automatically"
            }
          }
        ]
      },
      {
        "name": "剪映专业版",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "剪映专业版缓存",
              "en": "JianYing (CapCut CN) cache"
            },
            "desc": {
              "zh": "剪映的预览/解码缓存，不含草稿工程；重新生成需要时间",
              "en": "Preview/decode cache — not your drafts; regenerating takes time"
            }
          }
        ]
      },
      {
        "name": "CapCut",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "CapCut 缓存",
              "en": "CapCut cache"
            },
            "desc": {
              "zh": "CapCut 的预览/解码缓存，不含草稿工程；重新生成需要时间",
              "en": "Preview/decode cache — not your drafts; regenerating takes time"
            }
          }
        ]
      }
    ]
  },
  {
    "key": "3d",
    "title": {
      "zh": "3D 与游戏引擎",
      "en": "3D & game engines"
    },
    "apps": [
      {
        "name": "Blender",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Blender 临时文件",
              "en": "Blender temp files"
            },
            "desc": {
              "zh": "临时目录中的 blender_* 文件与 .blend1/.blend2 备份",
              "en": "blender_* files in the temp folder plus .blend1/.blend2 backups"
            }
          }
        ]
      },
      {
        "name": "Unreal Engine",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Unreal 派生数据缓存",
              "en": "Unreal derived data cache"
            },
            "desc": {
              "zh": "引擎派生数据缓存（DDC），清理后重新编译着色器耗时较长",
              "en": "Derived data cache (DDC); shaders take a while to recompile after cleaning"
            }
          }
        ]
      },
      {
        "name": "Unity",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Unity 缓存",
              "en": "Unity cache"
            },
            "desc": {
              "zh": "Asset Store 下载与全局缓存，不含你的工程 Library",
              "en": "Asset Store downloads and global cache; not your project Library"
            }
          }
        ]
      }
    ]
  },
  {
    "key": "browser",
    "title": {
      "zh": "浏览器",
      "en": "Browsers"
    },
    "apps": [
      {
        "name": "Google Chrome",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Chrome 浏览器缓存",
              "en": "Chrome cache"
            },
            "desc": {
              "zh": "各 Profile 的网页缓存，不含书签密码历史",
              "en": "Per-profile web cache — no bookmarks, passwords, history"
            }
          }
        ]
      },
      {
        "name": "Microsoft Edge",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Edge 浏览器缓存",
              "en": "Edge cache"
            },
            "desc": {
              "zh": "各 Profile 的网页缓存，不含书签密码历史",
              "en": "Per-profile web cache — no bookmarks, passwords, history"
            }
          }
        ]
      },
      {
        "name": "Mozilla Firefox",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Firefox 浏览器缓存",
              "en": "Firefox browser cache"
            },
            "desc": {
              "zh": "各配置的磁盘缓存，不含书签、密码、历史与 Cookie",
              "en": "Per-profile disk cache — no bookmarks, passwords, history, or cookies"
            }
          }
        ]
      }
    ]
  },
  {
    "key": "dev",
    "title": {
      "zh": "开发者工具",
      "en": "Developer tools"
    },
    "apps": [
      {
        "name": "JetBrains IDEs",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "JetBrains 缓存与索引",
              "en": "JetBrains caches & indexes"
            },
            "desc": {
              "zh": "各 IDE 的缓存/索引/日志/临时目录，不含配置、插件与 Toolbox 安装的 IDE 本体",
              "en": "Per-IDE caches/index/log/tmp only — never settings, plugins, or Toolbox-installed IDEs"
            }
          }
        ]
      },
      {
        "name": "Android Studio",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Android Studio 缓存与索引",
              "en": "Android Studio caches & indexes"
            },
            "desc": {
              "zh": "缓存/索引/日志/临时目录，IDE 会自动重建，不含你的设置与项目",
              "en": "caches/index/log/tmp only; rebuilt automatically, never your settings or projects"
            }
          }
        ]
      },
      {
        "name": "Gradle",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Gradle 构建缓存",
              "en": "Gradle build cache"
            },
            "desc": {
              "zh": "已下载的依赖与构建产物，下次构建会重新下载/编译",
              "en": "Downloaded dependencies and build outputs; re-fetched on next build"
            }
          }
        ]
      },
      {
        "name": "Flutter / Dart",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Flutter / Dart 包缓存",
              "en": "Flutter / Dart package cache"
            },
            "desc": {
              "zh": "已下载的 Dart/Flutter 依赖包，下次 pub get 会重新下载",
              "en": "Downloaded Dart/Flutter packages; re-fetched on next pub get"
            }
          }
        ]
      },
      {
        "name": "npm",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "npm 缓存",
              "en": "npm cache"
            },
            "desc": {
              "zh": "npm 下载缓存，按需自动重建",
              "en": "npm download cache, rebuilt on demand"
            }
          }
        ]
      },
      {
        "name": "Yarn",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Yarn 包缓存",
              "en": "Yarn package cache"
            },
            "desc": {
              "zh": "Yarn 下载缓存（v1 / Berry），按需自动重建",
              "en": "Yarn download cache (v1 / Berry), rebuilt on demand"
            }
          }
        ]
      },
      {
        "name": "pnpm",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "pnpm 内容存储",
              "en": "pnpm content store"
            },
            "desc": {
              "zh": "pnpm 全局内容寻址存储，清理后现有 node_modules 需重新安装",
              "en": "pnpm global content-addressable store; existing node_modules need reinstall after clearing"
            }
          }
        ]
      },
      {
        "name": "Electron",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Electron 下载缓存",
              "en": "Electron download cache"
            },
            "desc": {
              "zh": "Electron / electron-builder 下载的运行时与构建缓存",
              "en": "Electron / electron-builder downloaded runtimes and build cache"
            }
          }
        ]
      },
      {
        "name": "node-gyp",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "node-gyp 缓存",
              "en": "node-gyp cache"
            },
            "desc": {
              "zh": "node-gyp 下载的 Node 头文件缓存，按需重建",
              "en": "Downloaded Node headers cache, rebuilt on demand"
            }
          }
        ]
      },
      {
        "name": "Rust / Cargo",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Cargo 注册表缓存（Rust）",
              "en": "Cargo registry cache (Rust)"
            },
            "desc": {
              "zh": "已下载的 crate 源码与索引，下次构建会重新下载",
              "en": "Downloaded crate sources and index; re-fetched on next build"
            }
          }
        ]
      },
      {
        "name": "Go",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Go 模块缓存",
              "en": "Go module cache"
            },
            "desc": {
              "zh": "已下载的 Go 模块；文件默认只读，建议开启谨慎模式或用 go clean -modcache",
              "en": "Downloaded Go modules; files are read-only — use cautious mode or go clean -modcache"
            }
          }
        ]
      },
      {
        "name": "Maven",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Maven 本地仓库",
              "en": "Maven local repository"
            },
            "desc": {
              "zh": "已下载的依赖 jar；下次构建会重新下载",
              "en": "Downloaded dependency jars; re-fetched on next build"
            }
          }
        ]
      },
      {
        "name": "NuGet",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "NuGet 全局包缓存",
              "en": "NuGet global packages"
            },
            "desc": {
              "zh": "已下载的 NuGet 包；下次还原会重新下载",
              "en": "Downloaded NuGet packages; re-fetched on next restore"
            }
          }
        ]
      },
      {
        "name": "Composer",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Composer 缓存（PHP）",
              "en": "Composer cache (PHP)"
            },
            "desc": {
              "zh": "Composer 下载缓存，按需自动重建",
              "en": "Composer download cache, rebuilt on demand"
            }
          }
        ]
      },
      {
        "name": "pip (Python)",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "pip 缓存（Python）",
              "en": "pip cache (Python)"
            },
            "desc": {
              "zh": "pip 下载的 wheel 缓存，按需自动重建",
              "en": "pip downloaded wheel cache, rebuilt on demand"
            }
          }
        ]
      },
      {
        "name": "Visual Studio Code",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "VS Code 缓存与工作区存储",
              "en": "VS Code cache & workspace storage"
            },
            "desc": {
              "zh": "缓存与工作区存储（含 C/C++ 索引），不含你的设置与扩展",
              "en": "Cache and workspace storage (incl. C/C++ index); not your settings or extensions"
            }
          }
        ]
      },
      {
        "name": "Conda / Miniconda",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Conda 包缓存",
              "en": "Conda package cache"
            },
            "desc": {
              "zh": "已下载的 conda 包，按需重新下载（相当于 conda clean）",
              "en": "Downloaded conda packages, re-fetched on demand (like conda clean)"
            }
          }
        ]
      },
      {
        "name": "Android Emulator / SDK",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Android 模拟器/SDK 缓存",
              "en": "Android Emulator / SDK cache"
            },
            "desc": {
              "zh": "`.android\\cache` 下的缓存，不含模拟器镜像与用户数据",
              "en": "Cache under .android\\cache; not emulator images or user data"
            }
          }
        ]
      },
      {
        "name": "Docker Desktop",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "Docker 数据",
              "en": "Docker data"
            },
            "desc": {
              "zh": "WSL 虚拟磁盘占用，仅报告体积；请用 Docker 自带命令清理",
              "en": "WSL virtual disk usage, reported only — clean via Docker's own tools"
            }
          }
        ]
      }
    ]
  },
  {
    "key": "media",
    "title": {
      "zh": "创意与媒体",
      "en": "Creative & media"
    },
    "apps": [
      {
        "name": "Spotify",
        "targets": [
          {
            "risk": "expensive",
            "name": {
              "zh": "Spotify 离线缓存",
              "en": "Spotify offline cache"
            },
            "desc": {
              "zh": "已缓存的音频数据，清理后重新播放时需再次下载",
              "en": "Cached audio data; tracks re-download on next playback"
            }
          }
        ]
      },
      {
        "name": "Adobe Photoshop",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Photoshop Camera Raw 缓存",
              "en": "Photoshop Camera Raw cache"
            },
            "desc": {
              "zh": "Adobe Camera Raw 预览缓存，可自动重建",
              "en": "Adobe Camera Raw preview cache, rebuilt automatically"
            }
          }
        ]
      },
      {
        "name": "Adobe Creative Cloud",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Adobe 崩溃转储与日志",
              "en": "Adobe crash dumps & logs"
            },
            "desc": {
              "zh": "崩溃报告器留下的 dump 和日志，单个文件可达数 GB，可安全删除",
              "en": "Dumps and logs left by the Crash Reporter; single files can reach several GB, safe to delete"
            }
          }
        ]
      },
      {
        "name": "Figma",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Figma 桌面端缓存",
              "en": "Figma desktop cache"
            },
            "desc": {
              "zh": "Figma 桌面应用的网页/GPU 缓存，不含你的文件",
              "en": "Figma desktop web/GPU cache; not your files"
            }
          }
        ]
      },
      {
        "name": "抖音",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "抖音文件与缓存",
              "en": "Douyin files & cache"
            },
            "desc": {
              "zh": "抖音下载/缓存的视频与图片，可能含你保存的内容，仅报告体积不自动删除",
              "en": "Downloaded/cached videos and images, may include saved content — size only, never auto-deleted"
            }
          }
        ]
      },
      {
        "name": "PotPlayer",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "PotPlayer",
              "en": "PotPlayer"
            },
            "desc": {
              "zh": "播放历史与缩略图/解码缓存，仅报告体积不自动删除",
              "en": "Play history and thumbnail/decode cache — size only, never auto-deleted"
            }
          }
        ]
      },
      {
        "name": "VLC",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "VLC",
              "en": "VLC"
            },
            "desc": {
              "zh": "VLC 缩略图与插件缓存，仅报告体积不自动删除",
              "en": "VLC thumbnail and plugin cache — size only, never auto-deleted"
            }
          }
        ]
      },
      {
        "name": "QQ 音乐",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "QQ 音乐",
              "en": "QQ Music"
            },
            "desc": {
              "zh": "在线播放缓存与封面，不含已下载歌曲；仅报告体积不自动删除",
              "en": "Streaming cache and covers, not downloaded songs — size only, never auto-deleted"
            }
          }
        ]
      },
      {
        "name": "网易云音乐",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "网易云音乐",
              "en": "NetEase Cloud Music"
            },
            "desc": {
              "zh": "在线播放缓存与封面，不含已下载歌曲；仅报告体积不自动删除",
              "en": "Streaming cache and covers, not downloaded songs — size only, never auto-deleted"
            }
          }
        ]
      }
    ]
  },
  {
    "key": "game",
    "title": {
      "zh": "游戏平台",
      "en": "Game platforms"
    },
    "apps": [
      {
        "name": "Epic Games Launcher",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Epic 启动器网页缓存",
              "en": "Epic Launcher web cache"
            },
            "desc": {
              "zh": "Epic Games 启动器的网页缓存，可安全清理",
              "en": "Epic Games launcher web cache, safe to clear"
            }
          }
        ]
      },
      {
        "name": "Battle.net",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Battle.net 缓存",
              "en": "Battle.net cache"
            },
            "desc": {
              "zh": "暴雪战网客户端缓存，可安全清理",
              "en": "Blizzard Battle.net client cache, safe to clear"
            }
          }
        ]
      },
      {
        "name": "Steam",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Steam 下载与着色器缓存",
              "en": "Steam download & shader cache"
            },
            "desc": {
              "zh": "下载临时块、着色器预缓存、网页缓存，不含游戏本体",
              "en": "Download temp, shader precache, web cache; not your games"
            }
          }
        ]
      },
      {
        "name": "Ubisoft Connect",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Ubisoft Connect 缓存",
              "en": "Ubisoft Connect cache"
            },
            "desc": {
              "zh": "育碧启动器网页/下载缓存，可安全清理",
              "en": "Ubisoft launcher web/download cache, safe to clear"
            }
          }
        ]
      }
    ]
  },
  {
    "key": "office",
    "title": {
      "zh": "办公与效率",
      "en": "Office & productivity"
    },
    "apps": [
      {
        "name": "WPS Office",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "WPS Office 缓存",
              "en": "WPS Office cache"
            },
            "desc": {
              "zh": "WPS 缓存目录，不含你的文档；路径随版本不同，可手动指定",
              "en": "WPS cache dir; not your documents; path varies by version, set manually if needed"
            }
          }
        ]
      },
      {
        "name": "Notion",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Notion 桌面端缓存",
              "en": "Notion desktop cache"
            },
            "desc": {
              "zh": "Notion 离线/网页缓存，不含笔记内容",
              "en": "Notion offline/web cache; not your notes"
            }
          }
        ]
      },
      {
        "name": "Obsidian",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Obsidian 缓存",
              "en": "Obsidian cache"
            },
            "desc": {
              "zh": "Obsidian 桌面端网页缓存，不含你的笔记库",
              "en": "Obsidian desktop web cache; not your vault"
            }
          }
        ]
      }
    ]
  },
  {
    "key": "tools",
    "title": {
      "zh": "工具与其他",
      "en": "Tools & others"
    },
    "apps": [
      {
        "name": "搜狗输入法",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "搜狗输入法",
              "en": "Sogou Input"
            },
            "desc": {
              "zh": "词库/皮肤/表情等缓存与数据，仅报告体积不自动删除",
              "en": "Dictionary/skin/emoji cache and data — size only, never auto-deleted"
            }
          }
        ]
      },
      {
        "name": "百度网盘",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "百度网盘",
              "en": "Baidu Netdisk"
            },
            "desc": {
              "zh": "客户端缓存、缩略图与日志，不含已下载文件；仅报告体积不自动删除",
              "en": "Client cache, thumbnails and logs, not downloaded files — size only, never auto-deleted"
            }
          }
        ]
      },
      {
        "name": "迅雷",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "迅雷",
              "en": "Xunlei / Thunder"
            },
            "desc": {
              "zh": "下载缓存、缩略图与素材，不含已下载文件；仅报告体积不自动删除",
              "en": "Download cache, thumbnails and assets, not downloaded files — size only, never auto-deleted"
            }
          }
        ]
      },
      {
        "name": "IDM 下载器",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "IDM 下载器",
              "en": "IDM"
            },
            "desc": {
              "zh": "临时分段文件与日志，不含已完成下载；仅报告体积不自动删除",
              "en": "Temp segment files and logs, not completed downloads — size only, never auto-deleted"
            }
          }
        ]
      }
    ]
  },
  {
    "key": "comm",
    "title": {
      "zh": "通讯与协作",
      "en": "Communication"
    },
    "apps": [
      {
        "name": "Zoom",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "Zoom 录制文件",
              "en": "Zoom recordings"
            },
            "desc": {
              "zh": "本地会议录制文件，仅报告体积；删除前请自行确认",
              "en": "Local meeting recordings, reported only — review before deleting"
            }
          }
        ]
      },
      {
        "name": "Microsoft Teams",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Microsoft Teams 缓存",
              "en": "Microsoft Teams cache"
            },
            "desc": {
              "zh": "网页/GPU/临时缓存，不含聊天记录与文件",
              "en": "Web/GPU/temp cache — no chats or files"
            }
          }
        ]
      },
      {
        "name": "Slack",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Slack 缓存",
              "en": "Slack cache"
            },
            "desc": {
              "zh": "网页/GPU/临时缓存，不含消息与文件",
              "en": "Web/GPU/temp cache — no messages or files"
            }
          }
        ]
      },
      {
        "name": "Discord",
        "targets": [
          {
            "risk": "cache",
            "name": {
              "zh": "Discord 缓存",
              "en": "Discord cache"
            },
            "desc": {
              "zh": "网页/GPU/临时缓存，不含消息",
              "en": "Web/GPU/temp cache — no messages"
            }
          }
        ]
      },
      {
        "name": "WeChat 微信",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "微信文件与缓存",
              "en": "WeChat files & cache"
            },
            "desc": {
              "zh": "微信接收的图片/视频/文件及缓存混在一起，仅报告体积不自动删除",
              "en": "Received images/videos/files mixed with cache — size only, never auto-deleted"
            }
          }
        ]
      },
      {
        "name": "QQ / Tencent",
        "targets": [
          {
            "risk": "report",
            "name": {
              "zh": "QQ / 腾讯文件",
              "en": "QQ / Tencent files"
            },
            "desc": {
              "zh": "QQ 接收的文件与缓存，仅报告体积不自动删除",
              "en": "QQ received files and cache — size only, never auto-deleted"
            }
          }
        ]
      }
    ]
  }
];
