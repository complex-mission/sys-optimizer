; Cache Insight NSIS 安装钩子。
; 目的:安装目录/exe 保持纯英文(兼容性),但快捷方式带中文名,
; 让开始菜单搜索支持 "智" / "zhihuan" / "zh"(Windows 对中文名内置拼音匹配)/ "cache"。
; 本文件必须保存为 UTF-8 with BOM,否则中文会乱码。

!macro NSIS_HOOK_POSTINSTALL
  ; 重命名 Tauri 生成的快捷方式(先删同名目标,重装时 Rename 才能成功)
  Delete "$SMPROGRAMS\智缓 Cache Insight.lnk"
  Rename "$SMPROGRAMS\Cache Insight.lnk" "$SMPROGRAMS\智缓 Cache Insight.lnk"
  IfFileExists "$DESKTOP\Cache Insight.lnk" 0 +3
    Delete "$DESKTOP\智缓 Cache Insight.lnk"
    Rename "$DESKTOP\Cache Insight.lnk" "$DESKTOP\智缓 Cache Insight.lnk"
  ; 卸载列表(设置→应用)的显示名同步为中英混合
  WriteRegStr SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\Cache Insight" "DisplayName" "智缓 Cache Insight"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; 卸载器只认原名,重命名后的快捷方式要在这里清掉
  Delete "$SMPROGRAMS\智缓 Cache Insight.lnk"
  Delete "$DESKTOP\智缓 Cache Insight.lnk"
!macroend
