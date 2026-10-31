<a id="top"></a>
# 大肥鱼 — dsh-whale-pet

[English](#english) | [中文说明](#chinese) | [Releases / 下载](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) | [Changelog / 更新日志](CHANGELOG.md) | [v0.4.0 notes / 发布说明](docs/releases/v0.4.0.md) | [Docs / 文档](docs/README.md)

<a id="english"></a>
## English

**Unofficial community plugin. Not affiliated with or endorsed by DeepSeek.**

An interactive desktop/web companion and visual-novel (GalGame) conversation theatre for the official [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness). 大肥鱼 lives inside DSH, reacts to reasoning and answers, and keeps you company while you work.

The product name is **大肥鱼** in both languages; `dsh-whale-pet` remains the repository and package identifier.

### New in v0.4.0

- **New dizzy illustration:** original Dizzy.png is embedded for shake reactions, with no external image requests.
- **Personal appearance:** Chinese/English menus, independent light/dark glass themes, opacity and a five-stop snapping size slider. Menus stay fixed while the character changes size; preferences and position are saved locally.
- **Synthesized character sounds:** soft speech-like syllables throughout answer output and text reveal, plus inspiration and interaction tones. Native Web Audio, no audio downloads. Sound starts muted, with separate sound and volume controls.
- **A calmer theatre:** typewriter reveal, previous-page and full-text reading, automatic progression, loaded-message history, Hide/restore and copyable code cards. Top controls stay compact: Log, Auto, More and Exit.
- **Companion interactions:** head-pat hearts, shake reactions, bounded drag inertia, floating rebound and optional lunch/late-night reminders.
- **Reliability:** safer state transitions, Chinese IME input, draft preservation, viewport fitting, timer cleanup and host-page observation.

Two character forms and the 12 illustrations remain: five randomized thinking poses, inspiration, answering, affectionate reactions and rice breaks. Reasoning stays in its own scrollable bubble. Active answers use the answering illustration; rice breaks follow output or wandering.

### Install or upgrade

1. Download **dsh-whale-pet-v0.4.0.zip** from [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases).
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

- Hover for the toolbar; click to interact and open Settings; drag to reposition. Wandering pauses during menu interaction.
- Move the pointer back and forth over the head for a head-pat reaction. Fast, long-distance dragging triggers a brief dizzy reaction.
- Click the native composer or Dialogue to enter the theatre. Click blank background or use Escape to leave.
- Click dialogue once to complete its reveal, then again to advance. Previous goes back; More switches reading mode.
- Log shows messages already loaded on the page. Auto waits after a page is revealed. Hide shows the illustration; click the background or restore button to return.
- Settings offers Character sounds, volume, lunch/late-night reminders and an option to hide chatter and mute sounds. The stronger middle dot on the size slider is the default.

### Compatibility and privacy

Preferences use local storage. Optional completion notifications are disabled by default and request OS permission only when explicitly enabled. Doctor reads selector counts locally and does not copy message content. This plugin does not persist conversation history or send chat content to an extra service. Log reads currently loaded messages. Changing interface language does not translate questions, answers or reasoning.

Balances and response detection depend on DSH's markup. The current balance reader needs DSH's account settings to be opened first; it does not fetch startup balances independently, and retained values are not guaranteed to be live. Low-balance hints require an observed balance. Elapsed time starts when generation is detected; token speed appears only when DSH explicitly exposes it. Character counts are never presented as tokens/s.

Code blocks and lists have dedicated presentation, but this is not a complete Markdown renderer. The 12 illustrations animate through transforms and pose changes rather than rigged facial lip-sync. Subjective sound tuning and broader end-to-end streaming compatibility welcome feedback.

### Development

Use Node.js 22.18+ or 24+ for the TypeScript test runner. Install dependencies with `npm install` or `pnpm install`, then run:

```sh
npm run build
npm run typecheck
npm test
node --check lib/client.js
```

The build compiles the views, state, host adapter, CSS and all 12 PNGs into `lib/client.js` for DSH's `__ModuleLoader__`. Edit source and rebuild; no second manual UI implementation is needed. Current development automated suite: **39 tests**. See [PM review implementation](docs/PM_REVIEW_IMPLEMENTATION.md) and [Gemini follow-up](docs/GEMINI_REVIEW_IMPLEMENTATION.md) for the v0.4 usability work and its remaining checks.

The next iteration assigns frontend work to Claude Opus 5.5 and host/data integration to Codex. The [frontend handoff](docs/handover/OPUS_FRONTEND_HANDOFF.md) and [balance integration plan](docs/handover/BALANCE_INTEGRATION.md) describe pending work, including temporarily disabling chibi switching while retaining its artwork. These plans are not shipped fixes.

### Contributors and acknowledgements

- **[Ewigkeit1203](https://github.com/Ewigkeit1203)** — creator, character concept, product direction and acceptance testing.
- **Antigravity (Google DeepMind)** — AI-assisted architecture and initial implementation.
- **GPT 6.1Sol / Codex (OpenAI)** — AI-assisted v0.4.0 engineering, interaction design, stability work, tests and release documentation.
- **Claude Sonnet 5.5 (Anthropic)** — AI-assisted product review and UI/UX recommendations; advisory contribution.
- **Gemini 4 Argon (Google)** — AI-assisted product review, theatre layout and visual interaction proposals; advisory contribution.

Claude Opus 5.5 is assigned the upcoming frontend iteration; implementation credit will be added for completed work.

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

### v0.4.0 新体验

- **专属眩晕立绘**：新增原始 Dizzy.png，摇晃反馈直接使用新图，无需外部请求。
- **外观随你设置**：中英文菜单、独立明暗毛玻璃主题、透明度和五档吸附大小滑条。只缩放角色，菜单大小固定；设置和位置自动保存在本地。
- **人物合成音效**：回答输出和逐字显示期间持续发出轻柔短音，搭配顿悟、点击和干饭音效。原生 Web Audio，无需下载音频；默认静音，可单独开启并调节音量。
- **更舒服的剧场阅读**：逐字显示、上一段、完整阅读、读完后自动显示下一段、已加载问答回顾、隐藏界面及代码卡片复制。顶部收简为回顾、自动、更多、退出。
- **更多陪伴互动**：摸头爱心、晃动眩晕、有限惯性、浮力回弹，以及可关闭的午饭和熬夜提醒。
- **更可靠的操作**：完善状态衔接、中文输入法、草稿保留、窗口边界、计时器清理和宿主页面监听。

保留两种角色形态与现役 12 张插画：五套随机思考姿态、顿悟、回答、撒娇和干饭。推理过程独立显示在可滚动气泡中；回答期间使用回答图，输出完毕或散步结束后再吃饭。

### 安装或升级

1. 从 [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) 下载 **dsh-whale-pet-v0.4.0.zip**。
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

- 悬停显示工具栏；点击角色可互动和打开设置；拖拽可移动。操作菜单时暂停游荡。
- 在角色头部来回移动鼠标会触发摸头反应；快速、大幅拖动会短暂眩晕。
- 点击原生聊天输入框或“对话模式”进入剧场；点击空白处或按 Escape 退出。
- 文字未显示完时，第一次点击补全当前段，第二次点击才翻页。“上一段”可回看，“更多”里可切换完整阅读。
- “回顾”显示页面已加载问答；“自动”等待后推进；“隐藏界面”可欣赏立绘，点击背景或恢复按钮返回。
- 设置中可开启人物音效并调节音量，选择午饭和熬夜提醒，或隐藏闲聊并关闭音效。大小滑条中间加粗圆点是默认档。

### 兼容性与隐私

偏好保存在本地。后台完成通知默认关闭，仅在主动开启时申请系统权限；Doctor 在本地读取选择器数量，不复制消息内容。插件不持久化聊天历史，也不会把聊天内容发送给额外服务；回顾只读取当前页面已加载消息。界面语言不会翻译问题、回答或推理原文。

余额读取和输出识别依赖 DSH 页面结构。当前需要先打开 DSH 账户设置才能读取余额，尚未支持独立的启动查询；保留的金额不保证实时。低余额提醒只在读取到账户余额后启用。耗时从检测到生成开始计算；仅在 DSH 明确提供时显示 token 速度，不会用字符数冒充 tokens/s。

代码块和列表有专用排版，但并非完整 Markdown 渲染器。动画由 12 张插画、姿态切换与变换实现，没有骨骼绑定的真实口型。欢迎反馈音色和更广泛的完整流式兼容性。

### 本地开发

运行 TypeScript 测试建议使用 Node.js 22.18+ 或 24+。通过 `npm install` 或 `pnpm install` 安装开发依赖，然后执行：

```sh
npm run build
npm run typecheck
npm test
node --check lib/client.js
```

构建会把界面、状态机、宿主适配器、CSS 和 12 张 PNG 编入 DSH `__ModuleLoader__` 使用的 `lib/client.js`。修改源码后重新构建即可，无需再手工维护第二份界面。当前开发版本共有 **39 项自动测试**。v0.4 改进与待验收内容见 [PM 评审落地记录](docs/PM_REVIEW_IMPLEMENTATION.md)和[Gemini 跟进](docs/GEMINI_REVIEW_IMPLEMENTATION.md)。

下一轮由 Claude Opus 5.5 负责前端，Codex 负责宿主与数据集成。[前端交接需求](docs/handover/OPUS_FRONTEND_HANDOFF.md)与[余额接入计划](docs/handover/BALANCE_INTEGRATION.md)列出了待办，包括保留素材并暂时禁用 Q 版切换；这些计划不代表功能已完成或发布。

### 贡献者与致谢

- **[Ewigkeit1203](https://github.com/Ewigkeit1203)**：项目发起人、人设原案、产品方向与体验验收。
- **Antigravity (Google DeepMind)**：AI 辅助架构设计与初期实现。
- **GPT 6.1Sol / Codex (OpenAI)**：AI 辅助 v0.4.0 工程、交互设计、稳定性修复、测试与发布文档。
- **Claude Sonnet 5.5（Anthropic）**：AI 辅助产品评审、界面审查及路线图建议；提供产品建议。
- **Gemini 4 Argon（Google）**：AI 辅助产品评审、剧场布局与视觉交互方案；提供产品建议。

Claude Opus 5.5 将负责下一轮前端，完成后按实际工作补充贡献记录。

欢迎通过 [Issues](https://github.com/Ewigkeit1203/dsh-whale-pet/issues) 和 Pull Request 反馈问题或贡献代码。请提供 DSH 版本和复现步骤，避免上传私人对话与账户凭据。

### 开源许可证

代码采用 [MIT License](LICENSE)。美术权限见[授权说明](ASSETS_LICENSE.md)，投稿见[贡献指南](CONTRIBUTING.md)。

[返回顶部](#top) | [English](#english)
