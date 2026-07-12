; 系统优化助手 SysOptimizer NSIS 安装钩子。
; 目的:安装目录/exe 保持纯英文(兼容性),快捷方式名跟随安装语言:
;   中文安装 → 桌面 "系统优化助手",开始菜单 "系统优化助手 SysOptimizer"
;             (混合名让开始菜单搜索 "系统"/"优化"/"sys"/"optimizer" 都能命中)
;   英文安装 → 一律 "SysOptimizer"
; 中文文本集中在本文件;安装模板(installer.nsi)保持纯 ASCII,只引用这里的定义。
; 本文件必须保存为 UTF-8 with BOM,否则中文会乱码。

; 桌面快捷方式的中文名(installer.nsi 的 .onInit 按 $LANGUAGE 选用)
!define SHORTCUTNAME_ZH "系统优化助手"
; 开始菜单快捷方式与卸载列表的中英混合显示名
!define DISPLAYNAME_ZH "系统优化助手 SysOptimizer"

!macro NSIS_HOOK_POSTINSTALL
  ${If} $LANGUAGE == 2052
    ; 开始菜单快捷方式重命名为混合名(仅在本次安装刚创建了英文名时,
    ; 避免 /UPDATE 模式下删了旧快捷方式又无源可改名)
    ${If} ${FileExists} "$SMPROGRAMS\${PRODUCTNAME}.lnk"
      Delete "$SMPROGRAMS\${DISPLAYNAME_ZH}.lnk"
      Rename "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$SMPROGRAMS\${DISPLAYNAME_ZH}.lnk"
    ${EndIf}
    ; 卸载列表(设置→应用)的显示名同步为中英混合
    WriteRegStr SHCTX "${UNINSTKEY}" "DisplayName" "${DISPLAYNAME_ZH}"
    ; 旧版本留下的英文名桌面快捷方式与中文名重复,确认指向本程序后清掉
    !insertmacro IsShortcutTarget "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Pop $0
    ${If} $0 = 1
      Delete "$DESKTOP\${PRODUCTNAME}.lnk"
    ${EndIf}
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; 本地化名字的快捷方式卸载器默认逻辑不认识,在这里补删
  Delete "$SMPROGRAMS\${DISPLAYNAME_ZH}.lnk"
  ${If} ${FileExists} "$DESKTOP\${SHORTCUTNAME_ZH}.lnk"
    !insertmacro UnpinShortcut "$DESKTOP\${SHORTCUTNAME_ZH}.lnk"
    Delete "$DESKTOP\${SHORTCUTNAME_ZH}.lnk"
  ${EndIf}
  ; 兼容旧版本钩子生成的桌面混合名
  Delete "$DESKTOP\${DISPLAYNAME_ZH}.lnk"
!macroend
