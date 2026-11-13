# Documentation / 文档导航

[English](#english) | [中文](#chinese) | [Project / 项目首页](../README.md)

<a id="english"></a>
## English

- [Installation recovery and older versions](INSTALLATION_RECOVERY.md)
- [User guide](install/README.txt)
- [Release history](../CHANGELOG.md): [v0.8.1](releases/v0.8.1.md) · [v0.8.0](releases/v0.8.0.md) · [v0.7.0](releases/v0.7.0.md) · [v0.6.0](releases/v0.6.0.md) · [v0.5.2](releases/v0.5.2.md), [v0.5.1](releases/v0.5.1.md), [v0.5.0](releases/v0.5.0.md), [v0.4.0](releases/v0.4.0.md), [v0.3.0](releases/v0.3.0.md), [v0.2.0](releases/v0.2.0.md), [v0.1.0](releases/v0.1.0.md)
- [Contributing](../CONTRIBUTING.md) and [artwork permissions](../ASSETS_LICENSE.md)

Use the root-level install.bat and uninstall.bat to install and remove the plugin. Maintainers can run `npm run package:release` to build the versioned archive. Pushing a version tag (for example `v0.7.0`) publishes the GitHub Release automatically with the same archive and the notes from `docs/releases/`.

<a id="chinese"></a>
## 中文

- [安装问题与旧版本修复](INSTALLATION_RECOVERY.md)
- [使用指南](install/使用说明.txt)
- [更新日志](../CHANGELOG.md)：[v0.8.1](releases/v0.8.1.md) · [v0.8.0](releases/v0.8.0.md) · [v0.7.0](releases/v0.7.0.md) · [v0.6.0](releases/v0.6.0.md) · [v0.5.2](releases/v0.5.2.md), [v0.5.1](releases/v0.5.1.md)、[v0.5.0](releases/v0.5.0.md)、[v0.4.0](releases/v0.4.0.md)、[v0.3.0](releases/v0.3.0.md)、[v0.2.0](releases/v0.2.0.md)、[v0.1.0](releases/v0.1.0.md)
- [贡献指南](../CONTRIBUTING.md)与[美术授权说明](../ASSETS_LICENSE.md)

安装和卸载请使用根目录的 install.bat 与 uninstall.bat。维护者可运行 `npm run package:release` 生成当前版本的安装包。推送版本标签（例如 `v0.7.0`）后，GitHub 会自动用同样的安装包和 `docs/releases/` 中的说明发布 Release。

Release ZIPs use the artwork embedded in lib/client.js and omit the duplicate source assets/ folder. Original PNG/WebP artwork remains in the source repository for development.

发布 ZIP 使用 lib/client.js 内嵌的立绘，不再重复包含源码 assets/ 目录；PNG/WebP 原图仍完整保留在源码仓库，供开发使用。

Release tags run a Windows build, source tests, launchers and extracted archive checks before publishing the exact checked ZIPs. A source push alone does not publish. The installer-fix ZIP contains only installers and recovery instructions, for an existing plugin folder.

版本标签发布前先在 Windows 构建并检查源码、启动器和解压后的安装包，只上传通过检查的原 ZIP。仅推送源码不会发布。安装器修复小包仅含安装卸载工具及修复说明，须放入已有插件目录使用。

The installer/ folder contains the required PowerShell helper; use install.bat and uninstall.bat at the root. Keep the folder intact.

installer/ 是安装、卸载入口需要的辅助脚本目录；只需使用根目录 install.bat 和 uninstall.bat，请保留完整目录。
