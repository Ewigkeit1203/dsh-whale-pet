# Contributing / 贡献指南

[中文](#chinese) | [English](#english) | [美术授权 / Artwork permissions](ASSETS_LICENSE.md)

<a id="chinese"></a>
## 中文

欢迎一起把大肥鱼做得更好！不必会写代码：复现问题、测试不同 DSH 版本、提供交互建议和角色素材都很有帮助。项目发起人 **Ewigkeit1203** 决定功能方向、合并与最终发布。投稿会经过审查，不会直接进入正式版本。

### 如何参与

1. 先查 Issues，报告问题时写明插件版本、DSH 版本、系统、复现步骤、预期和实际表现。截图与 Doctor 输出请去除私人聊天、账户信息和凭据。
2. 小修复可以直接发 PR；大功能、依赖变更、角色设定或架构重做，请先开 Issue 讨论方向，避免白做。
3. Fork 仓库，在独立分支完成改动，通过 Pull Request 提交到主分支。一个 PR 尽量解决一个问题；说明改了什么、为什么、怎么测，以及还没验证的地方。
4. AI 辅助开发可以，但提交者仍需读懂并检查改动，对行为与测试负责。不要提交未经检查的大批生成代码，不把测试通过等同于所有场景都正确。

### 合并与发布门槛

- 合并前必须完成代码审查、相关回归检查和必要的实际 DSH 验证。问题未解决、检查失败或存在明显功能回归的 PR 不合并；重大功能变化需先获项目负责人同意。
- 修改行为时补有意义的回归测试，至少运行下面四项检查。界面变化附窗口/全屏、明暗主题或相应场景的证据；音效变化应实际试听；宿主接入变化应注明测试的 DSH 版本和降级表现。
- **任何正式发布或已有下载附件替换，都要先完成审查、检查、测试和候选包，再由 Ewigkeit1203 明确同意后执行。** 自动检查通过或 PR 合并不等于发布授权。未经确认不创建正式 Release、不替换安装包、不移动已有版本标签。
- 安装包必须与审查的源码对应，带版本说明与 SHA-256；构建后核对实际文件，不能只验证源码。
- 本指南描述项目流程；它不代表 GitHub 分支保护或强制审批已在仓库设置中启用。仓库维护者应只向信任的协作者授予写入及发布权限。

本地检查（Node.js 22.18+ 或 24+）：

~~~sh
npm run build
npm run typecheck
npm test
node --check lib/client.js
~~~

修改源码后重新构建并提交对应的 lib/ 产物，不能只修改生成包。保持素材 Base64 内嵌、无额外运行时依赖；不得无意修改 DSH 主题、抢占宿主按钮、丢失用户草稿。保留默认静音、通知默认关闭、偏好本地保存、不持久化或外发聊天记录的约定。

### 角色与美术投稿

- **接受 AI 制作或 AI 辅助素材**，须如实标注。AI 生成不意味着可以省略来源和授权说明。
- 以仓库现有大肥鱼立绘为参考，保持脸型、发色、服装、鲸鱼元素、画风和角色气质一致。新表情可以有创意，但更换形象、服装体系或美术方向应先讨论。
- 提交预览及原始素材，说明用途、尺寸、透明背景、姿态/表情；对照默认立绘检查头部尺寸、身体比例和脚底基线，避免切图突然变大变小。
- 说明作者/权利人、素材来源、AI 辅助情况、采用的许可，以及是否允许本项目修改和随插件再分发；有第三方素材时给出授权依据。
- **不得使用第三方未经授权的图片、角色素材或他人作品。** 不要把网络图片、水印图或无法说明权利来源的素材当成可随意使用；无权授权的投稿不会合入。
- 美术通过形象与权利审查后才会进入项目。代码 MIT 许可不自动适用于角色美术，具体范围见 ASSETS_LICENSE.md；本指南不扩大现有素材的授权。

### 贡献记录

完成并合入的贡献可记录在 README 或更新日志中，说明实际工作。产品建议、代码、美术和测试都可以得到致谢；不把计划中的工作写成已完成。

<a id="english"></a>
## English

Contributions are welcome: reproducible bug reports, testing, UX suggestions, code and character artwork all help. **Ewigkeit1203** owns product direction, merges and final releases. Submissions are reviewed before entering an official version.

### Workflow and quality

- Check existing issues. Include plugin/DSH versions, OS, reproduction steps and expected/actual behavior. Remove private conversations, account information and credentials from screenshots and diagnostics.
- Small fixes may go straight to a PR. Discuss major features, dependencies, architecture or character changes in an issue first. Fork, work on a separate branch and keep each PR focused; explain its behavior, motivation, validation and limitations.
- AI-assisted code is welcome, but contributors must understand, review and test it. Review, relevant regression tests and applicable real-DSH checks are required before merging. Resolve failures and regressions first; product changes require maintainer agreement.
- Run build, type checking, tests and bundle syntax checks listed above. Include visual evidence for UI changes, listen to sound changes, and state the DSH version tested for integration changes.
- **Before publishing a release or replacing downloadable assets, complete review, checks, tests and the candidate package, then obtain explicit approval from Ewigkeit1203.** A green check or merged PR is not release permission. Do not move existing version tags.
- Match release assets to the reviewed source, verify the package and include release notes and a SHA-256 checksum. This policy does not itself enable GitHub branch protection; write/release access should be granted only to trusted collaborators.
- Edit source and rebuild tracked lib/ files. Preserve embedded artwork, no extra runtime dependencies, independent pet themes, native composer controls, draft safety, default mute/notifications off, local preferences and no persisted or externally shared chat history.

### Artwork

AI-created and AI-assisted artwork is accepted when disclosed. Keep the established face, hair, costume, whale motifs, style and personality consistent with existing illustrations. Discuss major redesigns first. Provide a preview, original asset, intended pose/use, dimensions and transparency; check head size and foot alignment against the default portrait.

Identify the creator/rights holder, source, AI involvement, license, and permission for project modifications and redistribution. Provide authorization for any third-party material. **Unauthorized third-party images or artwork are not accepted.** AI generation does not replace provenance or permission review. Artwork requires both visual-consistency and rights review. The code's MIT license does not automatically license character art; see ASSETS_LICENSE.md.

Credit completed, merged contributions accurately in the README or changelog, including advisory, artwork and testing contributions where applicable.
