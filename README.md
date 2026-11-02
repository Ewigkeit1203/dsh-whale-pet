<a id="top"></a>
# 大肥鱼 — dsh-whale-pet

[使用截图 / Screenshots](#screenshots) | [English](#english) | [中文说明](#chinese) | [Releases / 下载](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) | [Changelog / 更新日志](CHANGELOG.md) | [v0.6.0 notes / 发布说明](docs/releases/v0.6.0.md) | [Docs / 文档](docs/README.md)

<a id="screenshots"></a>
## 使用截图 / Screenshots

**她就住在 DSH 里，而且会动。** 呼吸、眨眼、头发飘动，视线跟着鼠标（Live2D 风格）。头顶小标签显示梁文峰 / 梁文谷时段和账户余额；时段切换时她会换个表情告诉你。<br>
**She lives inside DSH, and she moves.** She breathes, blinks, her hair sways and her gaze follows the pointer (Live2D-style). Chips above her head show the DeepSeek pricing period (梁文峰 = peak, 梁文谷 = off-peak) and your balance; she announces each period switch with a new expression.

![大肥鱼在 DSH 中：计费时段、余额与快捷操作 / The companion in DSH with pricing period, balance and quick actions](docs/screenshots/companion.jpg)

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/settings-dark.jpg" alt="深色设置：余额与梁文峰时间 / Dark settings with balance and peak period"></td>
    <td width="50%"><img src="docs/screenshots/settings-light.jpg" alt="浅色设置：周末全天梁文谷 / Light settings, off-peak all weekend"></td>
  </tr>
  <tr>
    <td>设置面板贴在她身旁，不会挡住她：余额卡片、计费时段，以及到几点结束。<br>Settings sit beside her, never on top: balance, pricing period and when it ends.</td>
    <td>浅色主题，周末全天梁文谷（半价）。主题只影响插件本身。<br>Light theme; weekends are off-peak all day. Themes affect only the companion.</td>
  </tr>
</table>

**GalGame 对话剧场：** 点击输入框即可进入。全屏场景、居中的动态立绘、深蓝毛玻璃对话框和名字标签；她的表情会随每一页台词变化，头顶冒出情绪符号；文字逐字淡入，可以快进，代码有专门的卡片。<br>
**Visual-novel theatre:** click the chat box to enter. A full-screen scene, a centred live portrait and a deep-blue glass dialogue box with a name tag; her expression changes with each page, with a mood mark above her head; text fades in character by character, with Skip, and code gets copyable cards.

![剧场：场景、思考气泡与回答 / Theatre with a scene, reasoning bubble and answer](docs/screenshots/theatre.jpg)

**四套背景，也能用你自己的图：** 和室书房·夜、科技机房、午后咖啡厅、海边黄昏，默认跟随时间切换，切换时 0.7 秒交叉淡入；也可以保留「透明」显示 DSH。<br>
**Four backgrounds, or your own picture:** a study at night, a server room, an afternoon café and a seaside dusk, following the time of day by default, with a 0.7 s crossfade; “Transparent” keeps DSH visible.

![四套剧场背景 / The four theatre backgrounds](docs/screenshots/theatre-scenes.jpg)

**背景音乐与背景切换：** 左上角的小按钮打开音乐、背景和剧场设置。三首内置曲目「日常轻快 / 宁静闲聊 / 深夜治愈」由插件实时演奏、无缝循环，也可以添加本地音乐；音量和选择会自动记住。<br>
**Music and backgrounds:** the chips at the top left open music, backgrounds and theatre settings. Three built-in tracks (Everyday Breeze, Quiet Chat, Late-night Comfort) are performed live and loop seamlessly, or add your own file; volume and choices are remembered.

![音乐与背景面板 / Music and background panels](docs/screenshots/theatre-panels.jpg)

**六个新表情：** 得意、害羞、抓狂、惊讶、满足、开心，剧场和日常互动都会用到。<br>
**Six new expressions:** smug, shy, frustrated, surprised, proud and happy, used in the theatre and in everyday moments.

![六个新表情 / Six new expressions](docs/screenshots/expressions.jpg)

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/head-pat.jpg" alt="摸摸头 / Head pat"></td>
    <td width="50%"><img src="docs/screenshots/dizzy.jpg" alt="晃晕了 / Dizzy after shaking"></td>
  </tr>
  <tr>
    <td>在她头上来回移动鼠标：摸摸头，她会开心或害羞，并叫出你设置的称呼。<br>Move the pointer over her head for a head pat; she looks happy or shy and uses the name you set.</td>
    <td>拖着她快速晃一晃，她就晕了。<br>Shake her quickly while dragging and she gets dizzy.</td>
  </tr>
</table>

<details>
<summary>代码卡片与回答结束后的干饭时间 / Code card and rice break after the answer</summary>

![剧场代码页 / Theatre code page](docs/screenshots/theatre-code.jpg)

</details>

<sub>截图使用模拟的 DSH 页面和演示余额，插件界面是真实的 v0.6.0 代码。 / Screenshots use a simulated DSH page and sample balance; the plugin UI is the actual v0.6.0 build.</sub>

<a id="english"></a>
## English

**Unofficial community plugin. Not affiliated with or endorsed by DeepSeek.**

An interactive desktop/web companion and visual-novel (GalGame) conversation theatre for the official [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness). 大肥鱼 lives inside DSH, reacts to reasoning and answers, and keeps you company while you work.

The product name is **大肥鱼** in both languages; `dsh-whale-pet` remains the repository and package identifier.

### New in v0.6.0

- **Live portrait (Live2D-style).** Breathing, blinking, swaying hair, tail and skirt, and a head that tilts toward the pointer, on the desktop and in the theatre. Settings › Companionship › Live portrait turns it off.
- **Six new expressions** that follow the dialogue page by page, with a little hop and a mood mark (♥ ✦ ♪ 💧 ! ? 💢); also used for head pats, finished answers, announcements and idle moments.
- **Visual-novel touches:** characters fade in one by one, a whale-tail click-wait mark, and backgrounds that follow the time of day.
- The bundle is now about 7.6 MB (was 18.9 MB), and the theatre chips sit below the DSH title bar.

- **Scenes.** Four illustrated backgrounds (study at night, server room, afternoon café, seaside dusk), your own picture, or Transparent to keep DSH visible. Switching crossfades in 0.7 s without flashing; optionally pick a random one on every visit.
- **Background music.** Everyday Breeze, Quiet Chat and Late-night Comfort, performed live by the plugin with seamless loops, or your own audio file. Play/pause, previous/next, a smooth volume slider; music fades out when you leave the theatre or hide the page.
- **A proper visual-novel stage.** Larger centred portrait with a soft entrance, breathing and light pooled at her feet; a deep-blue glass dialogue box with a name tag; Skip (or hold Ctrl) races to the last page.
- **Remembered.** Background, music on/off, track and volume are saved; your picture and music stay in this browser (IndexedDB) and come back next time.

Full notes: [v0.6.0](docs/releases/v0.6.0.md).

### v0.5.2 Hotfix

- Settings retain a readable height when switching between windowed and maximized views.
- Strolls cover the available DSH viewport, wait a random 8–20 seconds, and only occasionally end with a rice break.
- Contributions require review and testing; releases require the creator’s approval. AI artwork must match the character and have clear provenance and permissions.

### v0.5.1 hotfix

- Wandering now travels visibly from the current position with the intended slow transition.

- Composer attachment, permission and model buttons no longer trigger theatre mode. Only clicking the text editor opens it automatically.
- Leaving theatre restores the companion at its saved position without sliding across the screen.

### New in v0.5.0

- **Balance at a glance.** On compatible hosts with the account service, when you are signed in to a DeepSeek account, your balance appears above her head and in Settings without opening DSH's account page. It refreshes every minute and after each answer. The plugin never touches credentials.
- **梁文峰 / 梁文谷 time.** A chip shows the current DeepSeek API pricing period and when it ends. She tells you “现在是梁文峰时间！” (peak) or “现在是梁文谷时间！” (off-peak, half price) when DSH opens and whenever it switches.
- **Settings never cover her.** The panel stays beside the character, slides to the other side at screen edges and becomes a separate panel in very narrow windows.
- **Consistent portraits.** All poses share one head size and foot line; 撒娇 no longer looks smaller.
- **Your name in her lines**, a smoother drag, a new soft character voice, a regrouped theatre and rebuilt light/dark themes.

Eighteen illustrations are embedded: five random thinking poses, inspiration, answering, 撒娇, dizzy, rice breaks, and the six v0.6.0 expressions. Reasoning has its own scrollable bubble; she uses the answering pose while output streams and eats rice afterwards. Chibi form switching is paused for now (its artwork is kept).

### Install or upgrade

1. Download **dsh-whale-pet-v0.6.0.zip** from [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases).
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
- She moves on her own (Live2D-style) and looks toward your pointer; turn this off in Settings › Companionship › Live portrait.
- **Click** her to open Settings; **drag** to move her. With Settings open, she and the panel move together.
- **Chips above her head:** the pricing period (click to hear it again) and your balance (click for details).
- Move the pointer back and forth over her head for a head pat. Shaking her quickly makes her dizzy.
- Click the DSH chat box to enter the **theatre**; press Escape or **Exit** to leave. Click the text (or the scene) once to finish revealing it, again for the next page; with Transparent selected, clicking the background leaves. The bar under the text has Log, Auto, Skip, Hide, Expand and the ⋯ menu (sounds, reading mode, theme, language).
- **Theatre chips (top left):** music (tracks, play/pause, volume, your own file), background (time of day, four scenes, Transparent, your picture, shuffle) and theatre settings (text speed, size, typewriter, auto, sounds).
- Shortcuts: hold **Alt** to click through her, **Alt+W** hides or shows her, **Alt+T** toggles the theatre. In the theatre: ←/→, Enter, hold **Ctrl** to skip, **L** log, **A** auto, **H** hide, **M** sound, **Esc** closes menus first.
- Keyboard: Tab to her and press Enter to open Settings.

### Compatibility and privacy

Preferences stay in local storage. A theatre picture or music file you add is kept in this browser's IndexedDB and never uploaded; Remove deletes it. Chat history is never stored or sent to any extra service; Log only reads messages already loaded on the page. Completion notifications are off by default and ask for system permission only when you turn them on. Doctor counts page selectors locally and copies no message content. Changing the interface language does not translate questions or answers.

**Balance:** read through DSH's own account service, the same one its account card uses. It needs a signed-in DeepSeek account; with an API key only, DSH has no balance to show. On DSH versions without that service, opening DSH's account settings still lets her read it from the page. Unread values show as —, and values that have not refreshed recently are marked “not live”. “Bowls left” and low-balance hints use fresh CNY data only.

**Pricing period:** follows [DeepSeek's official rule](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/). Peak is Beijing time, weekdays 09:00–12:00 and 14:00–18:00; other hours, weekends and Chinese public holidays are off-peak at half price. The holiday table covers 2026 and is updated yearly.

**Live portrait:** the motion is produced by deforming the illustration with WebGL (no separate Live2D model or Cubism runtime). Without WebGL, if the context is lost, or with reduced motion, the still image is shown.

Response detection depends on DSH's page structure. Token speed appears only when DSH exposes it; character counts are never shown as tokens/s. Code blocks and lists get dedicated formatting, but this is not a full Markdown renderer. Expressions change by switching artwork; there is no lip-sync.

### Development

Use Node.js 22.18+ or 24+ for the TypeScript test runner. Install dependencies with `npm install` or `pnpm install`, then run:

```sh
npm run build
npm run typecheck
npm test
node --check lib/client.js
```

The build compiles the views, state, host adapter, CSS and all 12 PNGs into `lib/client.js` for DSH's `__ModuleLoader__`. Edit the source and rebuild; do not edit `lib/client.js` by hand. Current automated suite: **94 tests**.

### Contributors and acknowledgements

- **[Ewigkeit1203](https://github.com/Ewigkeit1203)** — creator, character concept, product direction and acceptance testing.
- **Antigravity (Google DeepMind)** — AI-assisted architecture and initial implementation.
- **GPT 6.1Sol / Codex (OpenAI)** — AI-assisted v0.4.0 engineering, interaction design, stability work, tests and release documentation.
- **Claude Sonnet 5.5 (Anthropic)** — AI-assisted product review and UI/UX recommendations; advisory contribution.
- **Gemini 4 Argon (Google)** — AI-assisted product review, theatre layout and visual interaction proposals; advisory contribution.
- **Claude Opus 5.5 (Anthropic)** — AI-assisted v0.5.0 frontend: pet and settings group layout with edge handling, rebuilt settings panel and footer, per-pose portrait calibration, balance through DSH's account service with honest states, the 梁文峰 / 梁文谷 pricing-period announcements, render-performance work, theatre layout, a new Web Audio character voice, the design-token stylesheet rewrite and the related regression tests; the theatre update: illustrated scenes with crossfades, live-performed seamless background music, the visual-novel dialogue box, Skip and local picture/music storage; v0.6.0: the WebGL live portrait (Live2D-style mesh rig with hand-calibrated eyes), dialogue-driven expressions and mood marks, Senren＊Banka-style text and click-wait polish, and WebP asset embedding.

See the [contribution guide](CONTRIBUTING.md) for PR review, release approval and AI-art requirements. Contributions and reports are welcome through [Issues](https://github.com/Ewigkeit1203/dsh-whale-pet/issues) and pull requests. Include your DSH version and reproduction steps; omit private conversations and credentials.

### License

[MIT](LICENSE) for code. See [artwork permissions](ASSETS_LICENSE.md) and [contribution rules](CONTRIBUTING.md).

[Back to top](#top) | [中文说明](#chinese)

---

<a id="chinese"></a>
## 中文说明

**非官方社区插件，与 DeepSeek 官方无隶属或背书关系。**

大肥鱼是专为官方 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 开发的桌宠与 GalGame 对话剧场。她生活在 DSH 界面内，会随着思考与回答切换动作，陪你一起工作。

中英文统一使用产品名 **大肥鱼**；仓库与包标识继续使用 `dsh-whale-pet`。

### v0.6.0 新体验

- **动态立绘（Live2D 风格）。** 呼吸、眨眼、头发 / 尾巴 / 裙摆摆动，头部跟着鼠标倾斜转动；桌宠和剧场都生效。可在 设置 › 陪伴 › 动态立绘 中关闭。
- **六个新表情**，剧场里逐页跟随台词变化，小跳一下并冒出情绪符号（♥ ✦ ♪ 💧 ! ? 💢）；摸头、回答完成、峰谷播报和闲置时也会用到。
- **GalGame 细节：** 文字逐字淡入、鲸尾点击提示，背景跟随时间切换。
- 运行包缩小到约 7.6 MB（原 18.9 MB）；剧场按钮移到 DSH 标题栏下方。

- **场景。** 四套插画背景（和室书房·夜、科技机房、午后咖啡厅、海边黄昏）、你自己的图片，或者「透明」继续显示 DSH。切换时 0.7 秒交叉淡入，不闪白；可以设为每次进入随机换一张。
- **背景音乐。** 「日常轻快」「宁静闲聊」「深夜治愈」由插件实时演奏、无缝循环，也可以添加本地音乐。播放/暂停、上一首/下一首、平滑音量条；离开剧场或页面隐藏时自动淡出。
- **真正的 GalGame 舞台。** 立绘更大、居中，带淡入、呼吸和脚下的场景光；深蓝毛玻璃对话框配名字标签；「快进」（或按住 Ctrl）直接跳到最后一段。
- **自动记住。** 背景、音乐开关、曲目和音量都会保存；你的图片和音乐只保存在本机浏览器（IndexedDB），下次打开自动恢复。

完整说明见 [v0.6.0 发布说明](docs/releases/v0.6.0.md)。

### v0.5.2 快速更新

- 设置在窗口与全屏间保持可读高度，内容内部滚动。
- 散步目的地覆盖 DSH 可用区域，每次随机等待 8～20 秒，结束后仅偶尔吃饭。
- 完善贡献审查及发布确认流程；接受形象统一、来源及授权清楚的 AI 美术。

### v0.5.1 快速修复

- 散步恢复真实位移，按当前位置选择路线，并使用慢速过渡。

- 添加文件、权限及模型按钮不再误触剧场；仅点击文字输入区自动进入。
- 退出剧场直接在保存的位置恢复桌宠，消除横穿屏幕的滑动。

### v0.5.0 新体验

- **余额一眼可见。** 在 DSH 中登录 DeepSeek 账号后，余额会显示在她头顶和设置里，不用再打开 DSH 账户页；每分钟和每次回答结束后自动刷新。插件不接触任何凭据。
- **梁文峰 / 梁文谷时间。** 小标签显示当前 DeepSeek API 计费时段和结束时间。打开 DSH 时和每次切换时，她会告诉你“现在是梁文峰时间！”（高峰）或“现在是梁文谷时间！”（空闲，半价）。
- **设置面板不再挡住她。** 面板始终贴在角色旁边，到屏幕边缘会平滑换到另一侧，窗口太窄时改为独立面板。
- **立绘大小一致。** 所有姿态的头部大小和脚底位置统一，撒娇不再显小。
- **台词使用你的称呼**；另外拖动更流畅，人物音效更柔和，剧场重新整理，明暗主题重新设计。

内嵌 18 张插画：五套随机思考姿态、顿悟、回答、撒娇、眩晕、干饭，以及 v0.6.0 的六个新表情。推理过程显示在独立的可滚动气泡里；输出期间用回答姿态，输出结束后吃饭。Q 版切换暂时关闭，素材保留。

### 安装或升级

1. 从 [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) 下载 **dsh-whale-pet-v0.6.0.zip**。
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
- 她会自己动起来（Live2D 风格），视线跟着鼠标；可在 设置 › 陪伴 › 动态立绘 中关闭。
- **点击**她打开设置，**拖动**可以移动她。设置打开时，她和面板会一起移动。
- **头顶小标签**：计费时段（点击再播报一次）和余额（点击查看详情）。
- 在她头上来回移动鼠标可以摸头；快速晃动她会头晕。
- 点击 DSH 聊天输入框进入**剧场**；按 Escape 或「退出」离开。第一次点击文字（或场景）会显示完当前段，再点一次翻页；选择「透明」背景时，点击背景会退出。文字下方的按钮栏有回顾、自动、快进、隐藏、大屏和“⋯”菜单（音效、阅读方式、主题、语言）。
- **剧场左上角小按钮**：音乐（曲目、播放/暂停、音量、本地音乐）、背景（跟随时间、四套场景、透明、我的背景、随机）和剧场设置（文字速度、字号、打字机、自动翻页、音效）。
- 快捷键：按住 **Alt** 可点穿她，**Alt+W** 隐藏或显示她，**Alt+T** 开关剧场。剧场里：←/→、Enter，按住 **Ctrl** 快进，**L** 回顾，**A** 自动，**H** 隐藏界面，**M** 音效，**Esc** 先关闭菜单。
- 键盘：用 Tab 聚焦到她，按 Enter 打开设置。

### 兼容性与隐私

偏好只保存在本地。你添加的剧场图片和音乐只保存在本机浏览器的 IndexedDB 中，不会上传，点「移除」即可删除。聊天记录不会被保存，也不会发送给任何额外服务；“回顾”只读取页面上已加载的消息。完成通知默认关闭，只有你主动开启时才会申请系统权限。Doctor 只在本地统计页面选择器数量，不复制消息内容。切换界面语言不会翻译提问或回答。

**余额**：通过 DSH 自带账户卡片使用的同一个账户服务读取，需要登录 DeepSeek 账号；只使用 API Key 时 DSH 没有余额可显示。在没有该服务的 DSH 版本上，打开 DSH 账户设置后她仍能从页面读取。未读取显示 —，一段时间没刷新的数据会标注“非实时”。“还能吃几碗”和低余额提醒只使用最新的人民币数据。

**计费时段**：按 DeepSeek 官方规则。北京时间工作日 9:00–12:00、14:00–18:00 为高峰，其余时间以及周末、法定节假日为空闲时段，价格减半。节假日表目前覆盖 2026 年，每年更新。

**动态立绘**：动作由 WebGL 对立绘进行网格形变实现（不需要单独的 Live2D 模型或 Cubism 运行库）。不支持 WebGL、上下文丢失或开启减弱动效时显示静态立绘。

回答识别依赖 DSH 页面结构。只在 DSH 提供时显示 token 速度，不会用字符数冒充 tokens/s。代码块和列表有专门排版，但不是完整的 Markdown 渲染器。表情靠切换立绘实现，没有真实口型。

### 本地开发

运行 TypeScript 测试建议使用 Node.js 22.18+ 或 24+。通过 `npm install` 或 `pnpm install` 安装开发依赖，然后执行：

```sh
npm run build
npm run typecheck
npm test
node --check lib/client.js
```

构建会把界面、状态机、宿主适配器、CSS 和 12 张 PNG 编入 DSH `__ModuleLoader__` 使用的 `lib/client.js`。请修改源码后重新构建，不要手动编辑 `lib/client.js`。当前共有 **94 项自动测试**。

### 贡献者与致谢

- **[Ewigkeit1203](https://github.com/Ewigkeit1203)**：项目发起人、人设原案、产品方向与体验验收。
- **Antigravity (Google DeepMind)**：AI 辅助架构设计与初期实现。
- **GPT 6.1Sol / Codex (OpenAI)**：AI 辅助 v0.4.0 工程、交互设计、稳定性修复、测试与发布文档。
- **Claude Sonnet 5.5（Anthropic）**：AI 辅助产品评审、界面审查及路线图建议；提供产品建议。
- **Gemini 4 Argon（Google）**：AI 辅助产品评审、剧场布局与视觉交互方案；提供产品建议。
- **Claude Opus 5.5（Anthropic）**：AI 辅助 v0.5.0 前端：角色与设置面板整体布局及贴边处理、设置面板与底部区域重做、逐姿态立绘校准、通过 DSH 账户服务读取余额并如实显示状态、梁文峰 / 梁文谷时段播报、渲染性能优化、剧场布局、新的 Web Audio 人物音效、基于设计变量的样式重写及相应回归测试；剧场更新：插画场景与交叉淡入、实时演奏的无缝背景音乐、GalGame 对话框、快进以及本地图片 / 音乐存储；v0.6.0：WebGL 动态立绘（Live2D 风格网格绑定与手工校准的眼睛）、随台词变化的表情与情绪符号、千恋＊万花风格的文字与点击提示打磨，以及 WebP 立绘内嵌。

欢迎阅读[贡献指南](CONTRIBUTING.md)：代码经 PR 审查与测试后才可合并，发布须由项目负责人确认；接受形象统一、来源与授权清楚的 AI 美术。

欢迎通过 [Issues](https://github.com/Ewigkeit1203/dsh-whale-pet/issues) 和 Pull Request 反馈问题或贡献代码。请提供 DSH 版本和复现步骤，避免上传私人对话与账户凭据。

### 开源许可证

代码采用 [MIT License](LICENSE)。美术权限见[授权说明](ASSETS_LICENSE.md)，投稿见[贡献指南](CONTRIBUTING.md)。

[返回顶部](#top) | [English](#english)
