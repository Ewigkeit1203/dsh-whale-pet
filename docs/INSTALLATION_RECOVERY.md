# 安装问题与旧版本修复 / Installation recovery

2026-11-10 检查 GitHub 的实际下载附件，v0.1.0、v0.2.0、v0.3.0、v0.4.0、v0.5.0、v0.5.1、v0.5.2、v0.6.0 均使用旧安装／卸载脚本，BAT 只有 LF 换行。Windows 隔离测试中，v0.5.0–v0.6.0 安装返回 255；v0.1.0–v0.4.0 返回 0 但没有创建插件注册。普通路径或已手动配置的用户可能表现不同，不能据此断言插件功能本身全部失效。

旧脚本还有配置块内提前展开错误码、把路径插入 PowerShell 命令和按目录名替换旧路径的问题。新版使用 CRLF 的薄 BAT 启动器和独立 UTF-8 BOM PowerShell 脚本，校验运行文件、正确转换 file URI、精确定位插件 id，并在修改配置前备份。卸载保留其他插件和本机偏好。

## 推荐：更新完整插件

从 [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) 下载最新 `dsh-whale-pet-v*.zip`，完整解压到固定目录，运行 `install.bat`，然后在 DSH 按 Ctrl+R。不要从 ZIP 内直接运行。移动插件目录后重新安装以更新路径。无需先运行旧版卸载脚本。

## 需要保留旧版：只换安装工具

如新版 release 提供 `dsh-whale-pet-installer-fix-v*.zip`，将其中 `install.bat`、`uninstall.bat` 和整个 `installer` 文件夹复制到旧插件根目录，与旧版 `lib` 目录并排，再运行新的 `install.bat`。修复包没有 `lib`，不能独立安装插件，也不会改变旧版功能。需要卸载时运行新的 `uninstall.bat`，再刷新 DSH。

如果窗口显示错误，请保留原文。不要删除整个 `.dsh` 配置或手动覆盖其他插件。修改前的备份位于 `.dsh/profiles/desktop/cordis.patch.yml.backup-*`；需要恢复时先关闭 DSH，确认备份内容，再用对应备份替换配置。

## Live2D 模型与升级

Live2D 是可选项；未导入模型时仍能使用内嵌插画。运行库随插件提供，人物模型不随 release 再分发。请从[神宫凉子的原发布渠道](https://space.bilibili.com/13737731)获取模型，解压后在 设置 › 角色模型 导入含 `大肥鱼.model3.json` 的文件夹。

已导入模型保存在当前 DSH 的本机 IndexedDB；同一 DSH 环境的正常插件升级不清理它，无需每次重新导入。换电脑、切换 DSH 配置／存储环境或清理应用数据后，可能需要重新导入。请自己保留作者原始下载包。重新分发需取得作者的明确许可。

## English

The actual ZIP assets for v0.1.0 through v0.6.0 (including v0.5.1 and v0.5.2) contain legacy LF-only Windows launchers. Isolated Windows tests reproduced failure to register the plugin, sometimes despite exit code 0. This concerns installation, not every feature of an already configured plugin. The old scripts also expand an error code too early, interpolate paths into PowerShell and depend on a folder name when updating registrations.

Prefer the latest complete `dsh-whale-pet-v*.zip`: extract everything into a permanent folder, run `install.bat` and press Ctrl+R in DSH. Do not run inside the ZIP. Rerun after moving the folder; the old uninstaller is not required first.

To keep an older version, if an installer-fix ZIP is available in the latest release, copy its `install.bat`, `uninstall.bat` and complete `installer` directory beside the old plugin's existing `lib` directory, then run the new installer. The repair ZIP has no runtime and cannot install by itself. It preserves the old plugin code. The new uninstaller removes only this plugin registration and retains local preferences; changed profiles are backed up first.

Live2D is optional. Its runtime is included, while the model must be obtained from the author and imported once in Settings. Normal upgrades in the same DSH storage environment retain an imported model. Reinstalling DSH, clearing app data or moving to another machine may require importing again. Keep your own original model download; the author's terms prohibit redistribution without permission.

## v0.8.1 的安装文件 / Installer files in v0.8.1

只需运行 install.bat 或 uninstall.bat。installer/install.ps1 是它们调用的必需辅助脚本，负责校验、备份和更新配置，不是另一个需要双击的安装入口。请完整解压并保留 installer 文件夹；启动器优先使用此处脚本，也能兼容旧版根目录 install.ps1。

Run only install.bat or uninstall.bat. Their required helper installer/install.ps1 validates files, backs up and updates the profile. It is not a second installation entry point. Extract the complete archive and keep installer/; launchers prefer this helper while retaining compatibility with the legacy root-level script.
