<a id="top"></a>
# 大肥鱼 — dsh-whale-pet

[English](#english) | [中文说明](#chinese) | [Releases / 下载](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) | [Changelog / 更新日志](CHANGELOG.md) | [v0.5.1 notes / 发布说明](docs/releases/v0.5.1.md) | [Docs / 文档](docs/README.md)

<a id="english"></a>
## English

**Unofficial community plugin. Not affiliated with or endorsed by DeepSeek.**

An interactive desktop/web companion and visual-novel (GalGame) conversation theatre for the official [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness). 大肥鱼 lives inside DSH, reacts to reasoning and answers, and keeps you company while you work.

The product name is **大肥鱼** in both languages; `dsh-whale-pet` remains the repository and package identifier.

### v0.5.1 hotfix

- Composer attachment, permission and model buttons no longer trigger theatre mode. Only clicking the text editor opens it automatically.
- Leaving theatre restores the companion at its saved position without sliding across the screen.

### New in v0.5.0

- **Balance at a glance.** On compatible hosts with the account service, when you are signed in to a DeepSeek account, your balance appears above her head and in Settings without opening DSH's account page. It refreshes every minute and after each answer. The plugin never touches credentials.
- **梁文峰 / 梁文谷 time.** A chip shows the current DeepSeek API pricing period and when it ends. She tells you “现在是梁文峰时间！” (peak) or “现在是梁文谷时间！” (off-peak, half price) when DSH opens and whenever it switches.
- **Settings never cover her.** The panel stays beside the character, slides to the other side at screen edges and becomes a separate panel in very narrow windows.
- **Consistent portraits.** All poses share one head size and foot line; 撒娇 no longer looks smaller.
- **Your name in her lines**, a smoother drag, a new soft character voice, a regrouped theatre and rebuilt light/dark themes.

Full notes: [v0.5.1](docs/releases/v0.5.1.md). Twelve illustrations are embedded: five random thinking poses, inspiration, answering, 撒娇, dizzy, rice breaks and more. Reasoning has its own scrollable bubble; she uses the answering pose while output streams and eats rice afterwards. Chibi form switching is paused for now (its artwork is kept).

### Install or upgrade

1. Download **dsh-whale-pet-v0.5.1.zip** from [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases).
2. Extract the entire archive into a permanent folder, such as `D:\dsh-whale-pet`.
3. Run `install.bat`, then open DSH or press **Ctrl + R** in its window.
4. Upgrade in the same folder, or rerun the installer if you moved the plugin. Keep the extracted files in place.

DSH supplies React and Cordis. End users do not need Node.js, npm or extra assets. All images are embedded in the browser bundle. Windows one-click scripts target the desktop profile; a compatible DSH host configuration can also load the web client.

For manual configuration, append the following to `~/.dsh/profiles/desktop/cordis.patch.yml`, replacing the example path:

```yaml
- insert:
    - id: dsh-whale-pet
      name: "file:///D:/dsh-whale-pet/lib/index.js"
```

Run `uninstall.bat` and refresh DSH to remove the plugin from the profile. Saved local preferences are retained.

### Controls

- **Hover** for quick actions: Theatre, Settings, Quiet mode, Dock to the edge and, after an answer with code, Copy code.
- **Click** her to open Settings; **drag** to move her. With Settings open, she and the panel move together.
- **Chips above her head:** the pricing period (click to hear it again) and your balance (click for details).
- Move the pointer back and forth over her head for a head pat. Shaking her quickly makes her dizzy.
- Click the DSH chat box to enter the **theatre**; click the background or press Escape to leave. Click the text once to finish revealing it, again for the next page. Log, Auto, Expand and the ⋯ menu (Hide, sounds, reading mode, theme, language) sit at the top.
- Shortcuts: hold **Alt** to click through her, **Alt+W** hides or shows her, **Alt+T** toggles the theatre. In the theatre: ←/→, Enter, **L** log, **A** auto, **H** hide, **M** sound.
- Keyboard: Tab to her and press Enter to open Settings.

### Compatibility and privacy

Preferences stay in local storage. Chat history is never stored or sent to any extra service; Log only reads messages already loaded on the page. Completion notifications are off by default and ask for system permission only when you turn them on. Doctor counts page selectors locally and copies no message content. Changing the interface language does not translate questions or answers.

**Balance:** read through DSH's own account service, the same one its account card uses. It needs a signed-in DeepSeek account; with an API key only, DSH has no balance to show. On DSH versions without that service, opening DSH's account settings still lets her read it from the page. Unread values show as —, and values that have not refreshed recently are marked “not live”. “Bowls left” and low-balance hints use fresh CNY data only.

**Pricing period:** follows [DeepSeek's official rule](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/). Peak is Beijing time, weekdays 09:00–12:00 and 14:00–18:00; other hours, weekends and Chinese public holidays are off-peak at half price. The holiday table covers 2026 and is updated yearly.

Response detection depends on DSH's page structure. Token speed appears only when DSH exposes it; character counts are never shown as tokens/s. Code blocks and lists get dedicated formatting, but this is not a full Markdown renderer. The illustrations animate through pose changes rather than lip-sync.

### Development

Use Node.js 22.18+ or 24+ for the TypeScript test runner. Install dependencies with `npm install` or `pnpm install`, then run:

```sh
npm run build
npm run typecheck
npm test
node --check lib/client.js
```

The build compiles the views, state, host adapter, CSS and all 12 PNGs into `lib/client.js` for DSH's `__ModuleLoader__`. Edit the source and rebuild; do not edit `lib/client.js` by hand. Current automated suite: **86 tests**.

### Contributors and acknowledgements

- **[Ewigkeit1203](https://github.com/Ewigkeit1203)** — creator, character concept, product direction and acceptance testing.
- **Antigravity (Google DeepMind)** — AI-assisted architecture and initial implementation.
- **GPT 6.1Sol / Codex (OpenAI)** — AI-assisted v0.4.0 engineering, interaction design, stability work, tests and release documentation.
- **Claude Sonnet 5.5 (Anthropic)** — AI-assisted product review and UI/UX recommendations; advisory contribution.
- **Gemini 4 Argon (Google)** — AI-assisted product review, theatre layout and visual interaction proposals; advisory contribution.
- **Claude Opus 5.5 (Anthropic)** — AI-assisted v0.5.0 frontend: pet and settings group layout with edge handling, rebuilt settings panel and footer, per-pose portrait calibration, balance through DSH's account service with honest states, the 梁文峰 / 梁文谷 pricing-period announcements, render-performance work, theatre layout, a new Web Audio character voice, the design-token stylesheet rewrite and the related regression tests.

Contributions and reports are welcome through [Issues](https://github.com/Ewigkeit1203/dsh-whale-pet/issues) and pull requests. Include your DSH version and reproduction steps; omit private conversations and credentials.

### License

[MIT](LICENSE) for code. See [artwork permissions](ASSETS_LICENSE.md) and [contribution rules](CONTRIBUTING.md).

[Back to top](#top) | [中文说明](#chinese)

---

<a id="chinese"></a>
## 中文说明

**非官方社区插件，与 DeepSeek 官方无隶属或背书关系。**

大肥鱼是专为官方 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 开发的桌宠与 GalGame 对话剧场。她生活在 DSH 界面内，会随着思考与回答切换动作，陪你一起工作。

中英文统一使用产品名 **大肥鱼**；仓库与包标识继续使用 `dsh-whale-pet`。

### v0.5.1 快速修复

- 添加文件、权限及模型按钮不再误触剧场；仅点击文字输入区自动进入。
- 退出剧场直接在保存的位置恢复桌宠，消除横穿屏幕的滑动。

### v0.5.0 新体验

- **余额一眼可见。** 在 DSH 中登录 DeepSeek 账号后，余额会显示在她头顶和设置里，不用再打开 DSH 账户页；每分钟和每次回答结束后自动刷新。插件不接触任何凭据。
- **梁文峰 / 梁文谷时间。** 小标签显示当前 DeepSeek API 计费时段和结束时间。打开 DSH 时和每次切换时，她会告诉你“现在是梁文峰时间！”（高峰）或“现在是梁文谷时间！”（空闲，半价）。
- **设置面板不再挡住她。** 面板始终贴在角色旁边，到屏幕边缘会平滑换到另一侧，窗口太窄时改为独立面板。
- **立绘大小一致。** 所有姿态的头部大小和脚底位置统一，撒娇不再显小。
- **台词使用你的称呼**；另外拖动更流畅，人物音效更柔和，剧场重新整理，明暗主题重新设计。

完整说明见 [v0.5.1 发布说明](docs/releases/v0.5.1.md)。内嵌 12 张插画：五套随机思考姿态、顿悟、回答、撒娇、眩晕、干饭等。推理过程显示在独立的可滚动气泡里；输出期间用回答姿态，输出结束后吃饭。Q 版切换暂时关闭，素材保留。

### 安装或升级

1. 从 [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) 下载 **dsh-whale-pet-v0.5.1.zip**。
2. 完整解压到固定文件夹，例如 `D:\dsh-whale-pet`。
3. 双击 `install.bat`，再打开 DSH，或在已打开的窗口中按 **Ctrl + R** 刷新。
4. 升级时覆盖同一目录中的插件文件；若换了目录，请重新运行安装脚本。解压后的文件需要保留。

React 与 Cordis 由 DSH 提供，普通用户无需 Node.js、npm 或额外素材。所有角色图片都内嵌在运行包中。Windows 一键脚本适配 desktop 配置；兼容的 DSH 宿主配置也可加载网页客户端。

手动安装时，可在 `~/.dsh/profiles/desktop/cordis.patch.yml` 追加以下内容，替换为实际路径：

```yaml
- insert:
    - id: dsh-whale-pet
      name: "file:///D:/dsh-whale-pet/lib/index.js"
```

卸载时运行 `uninstall.bat` 并刷新 DSH。已保存的本地偏好会保留。

### 怎么操作

- **悬停**出现快捷操作：剧场、设置、安静模式、贴边；最近的回答里有代码时，还会出现“复制代码”。
- **点击**她打开设置，**拖动**可以移动她。设置打开时，她和面板会一起移动。
- **头顶小标签**：计费时段（点击再播报一次）和余额（点击查看详情）。
- 在她头上来回移动鼠标可以摸头；快速晃动她会头晕。
- 点击 DSH 聊天输入框进入**剧场**；点击背景或按 Escape 退出。第一次点击文字会显示完当前段，再点一次翻页。顶部有回顾、自动、大屏和“⋯”菜单（隐藏界面、音效、阅读方式、主题、语言）。
- 快捷键：按住 **Alt** 可点穿她，**Alt+W** 隐藏或显示她，**Alt+T** 开关剧场。剧场里：←/→、Enter，**L** 回顾，**A** 自动，**H** 隐藏界面，**M** 音效。
- 键盘：用 Tab 聚焦到她，按 Enter 打开设置。

### 兼容性与隐私

偏好只保存在本地。聊天记录不会被保存，也不会发送给任何额外服务；“回顾”只读取页面上已加载的消息。完成通知默认关闭，只有你主动开启时才会申请系统权限。Doctor 只在本地统计页面选择器数量，不复制消息内容。切换界面语言不会翻译提问或回答。

**余额**：通过 DSH 自带账户卡片使用的同一个账户服务读取，需要登录 DeepSeek 账号；只使用 API Key 时 DSH 没有余额可显示。在没有该服务的 DSH 版本上，打开 DSH 账户设置后她仍能从页面读取。未读取显示 —，一段时间没刷新的数据会标注“非实时”。“还能吃几碗”和低余额提醒只使用最新的人民币数据。

**计费时段**：按 DeepSeek 官方规则。北京时间工作日 9:00–12:00、14:00–18:00 为高峰，其余时间以及周末、法定节假日为空闲时段，价格减半。节假日表目前覆盖 2026 年，每年更新。

回答识别依赖 DSH 页面结构。只在 DSH 提供时显示 token 速度，不会用字符数冒充 tokens/s。代码块和列表有专门排版，但不是完整的 Markdown 渲染器。动画靠切换姿态实现，没有真实口型。

### 本地开发

运行 TypeScript 测试建议使用 Node.js 22.18+ 或 24+。通过 `npm install` 或 `pnpm install` 安装开发依赖，然后执行：

```sh
npm run build
npm run typecheck
npm test
node --check lib/client.js
```

构建会把界面、状态机、宿主适配器、CSS 和 12 张 PNG 编入 DSH `__ModuleLoader__` 使用的 `lib/client.js`。请修改源码后重新构建，不要手动编辑 `lib/client.js`。当前共有 **86 项自动测试**。

### 贡献者与致谢

- **[Ewigkeit1203](https://github.com/Ewigkeit1203)**：项目发起人、人设原案、产品方向与体验验收。
- **Antigravity (Google DeepMind)**：AI 辅助架构设计与初期实现。
- **GPT 6.1Sol / Codex (OpenAI)**：AI 辅助 v0.4.0 工程、交互设计、稳定性修复、测试与发布文档。
- **Claude Sonnet 5.5（Anthropic）**：AI 辅助产品评审、界面审查及路线图建议；提供产品建议。
- **Gemini 4 Argon（Google）**：AI 辅助产品评审、剧场布局与视觉交互方案；提供产品建议。
- **Claude Opus 5.5（Anthropic）**：AI 辅助 v0.5.0 前端：角色与设置面板整体布局及贴边处理、设置面板与底部区域重做、逐姿态立绘校准、通过 DSH 账户服务读取余额并如实显示状态、梁文峰 / 梁文谷时段播报、渲染性能优化、剧场布局、新的 Web Audio 人物音效、基于设计变量的样式重写及相应回归测试。

欢迎通过 [Issues](https://github.com/Ewigkeit1203/dsh-whale-pet/issues) 和 Pull Request 反馈问题或贡献代码。请提供 DSH 版本和复现步骤，避免上传私人对话与账户凭据。

### 开源许可证

代码采用 [MIT License](LICENSE)。美术权限见[授权说明](ASSETS_LICENSE.md)，投稿见[贡献指南](CONTRIBUTING.md)。

[返回顶部](#top) | [English](#english)
