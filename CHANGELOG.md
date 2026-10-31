# Changelog / 更新日志

[English Version](#english) | [中文版本](#chinese)

---

<a name="english"></a>
## English

### Unreleased

- Second frontend pass by Claude Opus 5.5 (not released):
  - Balance without opening settings: when DSH offers its account service, the companion calls the same `remote.account.getBalance` the built-in account card uses, under the `account/watch` access grant. It reads on start, every 60s, on returning to the window and after each answer, backs off on failure, and clears the balance when access is withdrawn or you sign out. No credentials or Platform requests on our side. The DOM reader is now only a fallback; it no longer pads missing values with ¥0.00 or guesses amounts across the page.
  - 梁文峰 / 梁文谷 time: a chip above her head shows the current DeepSeek API pricing period and when it ends (in your local time). She announces “现在是梁文峰时间！” / “现在是梁文谷时间！” on load and at every switch. Rules follow the official pricing page: Beijing weekdays 09:00–12:00 and 14:00–18:00 are peak; weekends and Chinese public holidays are off-peak (2026 holiday table). Toggle: Settings › Companionship.
  - Your chosen name is now used in her lines (several lines said “你” directly), including the theatre's idle line.
  - Smoother drag: gaze now moves through CSS variables, status updates render at most once per frame and only when something visible changes, drag positions are applied once per frame, the settings panel is memoised during drags, and the panel slides instead of jumping when it switches sides. Measured render work: about 6× less while dragging, 16× less while moving the pointer and 4.5× less while streaming.
  - Tests: 75 → 84.
- Frontend rework by Claude Opus 5.5 (not released; version unchanged):
  - Settings and pet now lay out as one group: the panel stays beside the pet with a 16px gap, switches sides only when the current side runs out of room, and moves the pet to the nearest spot where both fit. Windows too small for the pair open settings as a labelled separate panel. Wandering pauses while settings are open.
  - Settings rebuilt with a fixed header, a scrolling body and a one-row footer (12px between note and button, 16px bottom margin). The chibi form switch is gone from the toolbar and settings; a stored `chibi` preference renders the maiden portrait while the feature is paused. All artwork is kept.
  - Every pose renders in one shared stage anchored at the feet, with per-pose scale calibrated by head size. sajiao no longer looks smaller, and switching poses no longer moves the pet. Sizing replaces CSS zoom, so hit areas follow the drawn image.
  - Balance has a fixed home: a card in settings and a small chip above the head. Unread values show as —, never ¥0.00. Old snapshots are marked as not live. Bowls and low-balance hints only run on fresh CNY data. Reading the balance at startup is still pending (Codex).
  - Theatre reorganised: primary header actions, the head stays visible in expanded reading, more opaque reading surfaces, full-reading mode only follows new text while you are at the bottom, and narrow windows switch the header to icon buttons.
  - New character voice (`voice.ts`): soft mid-range speech blips that follow text as it appears, with breaths and falling sentence ends. Scheduling is capped, so a stalled stream goes quiet within about half a second and never replays a backlog. Code is not voiced. Sound is still muted by default.
  - Stylesheets rewritten around theme tokens without override layers. Remaining “Little Whale” wording replaced with 大肥鱼.
  - Tests: 39 → 75, adding edge and corner layout, old chibi preference, pose calibration, balance states and voice lifecycle.
- Standardized the project name as 大肥鱼, placed the creator first in both contributor lists, and clarified the current balance-reading limitation.
- Added the Opus 5.5 frontend handoff and Codex balance integration plan, with ownership, priorities and acceptance criteria. These documents describe pending work; no UI fix, chibi disablement or startup balance integration is included in this entry.

### [v0.4.0] - 2026-10-31

- Restored borderless size dots, added a live-value continuous text-size slider, roomier settings and clearer light-theme selections.
- Repositioned the portrait in expanded reading and removed the rectangular stage halo. Added the original Dizzy.png as the twelfth embedded illustration for shake reactions.

- Fixed faded pet interaction and tethered settings during dragging; added explicit Alt click-through and Alt+W/T shortcuts.
- Expanded/full-width theatre, measured line wrapping, upward More menu, separate settings scrolling, themed scrollbars, clickable size dots and inline code.
- Moved guides, release notes and handover under docs/, removed duplicate installers and unused source artwork, and updated packaging and contributor credits.

- Grouped settings, reversible quiet mode, text/size labels, names, optional completion notifications and local Doctor diagnostics.
- Compact theatre, single page count, keyboard controls, adaptive page capacity, emphasis, reveal speed and punctuation pauses.
- Approximate alpha hit regions, reading fade, docked peek and reduced-motion/visibility handling.
- Added unofficial declaration, artwork-permission clarification and contribution templates. See docs/PM_REVIEW_IMPLEMENTATION.md for partial items and remaining roadmap.

### [v0.3.0] - 2026-10-30

#### Added
- Chinese/English menus and companion prompts; independent light/dark glass themes with sun/moon controls. The host DSH theme is unaffected.
- Persistent language, theme, form, position, wandering, reading and sound preferences; character opacity and a five-stop snapping size slider with circular marks and a stronger default mark.
- Native Web Audio character voice during response output and text reveal, plus inspiration, touch and rice-break sounds. Audio is opt-in, with mute, volume, soft envelopes, low-pass filtering and short phrase pauses; no audio downloads.
- Typewriter reveal: click once to finish the current page and again to advance. Previous-page navigation, full-text reading, automatic progression, loaded-message history and Hide/restore mode.
- Safe text/code cards, preserved code fences and one-click copying in the theatre and pet toolbar.
- Head-pat hearts, fast-drag dizziness, bounded release inertia and buoyancy using the existing 11 illustrations.
- Optional lunch and late-night reminders, verified low-balance hints and elapsed generation time. Token speed appears only when explicitly exposed by DSH.

#### Improved
- Simplified theatre controls to Log, Auto, More and Exit; moved less-used options into a readable glass menu.
- Kept settings fixed while resizing the character; moved speech closer and switched its side near the left edge. Added outside-click/Escape dismissal and reduced-motion support.
- Compiled React views, state and host integration directly into the self-contained browser template; skipped unchanged compiler outputs and atomically replaced the browser bundle.

#### Fixed
- Delayed wandering callbacks interrupting reasoning/output, stale idle debounce, inactive-user timing and blink callbacks surviving unload.
- Repeated page scans caused by the pet's own animations, reasoning leaking into response extraction and nested-markdown duplication.
- Chinese IME Enter accidentally sending, drafts disappearing without a valid send button, controlled-input synchronization, drag cancellation on blur and false clicks after a drag returns to its start.
- Thought scrolling pulling users away from older content they are reading.

#### Validation and limits
- Build, type checking, bundle syntax and 30 automated tests passed; theatre controls, More menu and fixed-panel resizing checked in DSH.
- History contains only messages already loaded on the current page. Preferences stay in local storage; history is not persisted by this plugin.
- DOM integration depends on DSH markup; elapsed time begins when generation is detected. No token-rate estimate is fabricated when host metrics are missing.
- Subjective sound quality and complete end-to-end model streaming still need broader real-use feedback.

### [v0.2.0] - 2026-10-30

#### Added
- **Modular Expression & Pose Architecture**:
  - `Maid.png`: High-definition full standing portrait of the Whale Maid.
  - `DaFeiYu.png`: Chibi miniature badge form.
  - `Answering.png`: Dedicated active answering pose during model response generation (`isStreaming = true`), accompanied by respiratory animation and lip-sync oscillation.
  - `baifan.png`: White rice eating pose. Plays for ~4.5 seconds after content output finishes (`isStreaming: true -> false`), and plays for ~3.5 seconds after wandering movement stops. Strictly never displayed during active response streaming.
  - `getit.png`: Inspiration lightbulb pose. Spliced into the later stage of reasoning and occasionally during thinking cycles.
  - `sajiao.png`: Pouting and sajiao expression. Triggered for 2 seconds on click without breaking ongoing reasoning or output; triggered for an extended duration (9 seconds) with lonely dialogue lines after 60 seconds of user inactivity.
  - `Think1.png` to `Think5.png`: Five distinct thinking poses randomly cycled with non-fixed variable durations (2.0s - 3.8s) and non-fixed sequences during Chain-of-Thought reasoning.
- **Inactivity Detection & Interaction Reset**:
  - Automatically triggers a longer sajiao routine if left unattended for 60 seconds.
  - Any mouse click, drag, or composer typing immediately wakes up the character and returns to normal state.

#### Changed
- **Response Generation Flow**: Clean separation between reasoning, answering, and post-output rice eating phases.
- **Build System**: Automatically synchronizes expressions from local asset folders and inlines all 11 poses into self-contained Base64 Data URIs.
- **Documentation**: Clean bilingual documentation with no emojis across README, release notes, and user guides.

#### Fixed
- Fixed state machine transition edge cases during quick interruptions.
- Fixed wandering completion behavior to ensure peaceful eating pause upon arrival.

---

### [v0.1.0] - 2026-10-29

#### Added
- Initial release of DeepSeek Little Whale Maid for DeepSeek Harness (DSH).
- Dual character forms: Maiden standing portrait and Chibi form.
- Independent comic thought bubble for Chain-of-Thought streaming with scrolling support.
- Real-time dual balance toolbar (Topped-up balance and Granted balance).
- GalGame dialogue theater mode with sentence/paragraph pagination and click-to-advance progression.
- One-click install and uninstall batch scripts (`install.bat`, `uninstall.bat`).

---

<a name="chinese"></a>
## 中文版本

### 尚未发布

- Claude Opus 5.5 第二轮前端更新（未发布）：
  - 不用打开设置也能显示余额：DSH 提供账户服务时，大肥鱼调用 DSH 自带账户卡片使用的同一个 `remote.account.getBalance`，并遵循 `account/watch` 访问授权。启动时读取一次，之后每 60 秒、回到窗口时和每次回答结束后刷新，失败时逐步延长重试间隔；访问被撤销或退出登录时立即清空。插件不接触凭据，也不请求 DeepSeek 平台。读取页面只作后备，不再把缺失项补成 ¥0.00，也不再在整个页面里猜金额。
  - 梁文峰 / 梁文谷时间：头顶小标签显示当前 DeepSeek API 计费时段和结束时间（本机时间）。启动和每次切换时，她会说“现在是梁文峰时间！”或“现在是梁文谷时间！”。规则按官方价格页：北京时间工作日 9:00–12:00、14:00–18:00 为高峰，周末和法定节假日为空闲（含 2026 年节假日表）。可在 设置 › 陪伴行为 中关闭。
  - 台词会使用你设置的称呼（之前有几句直接写成了“你”），剧场里的待机台词也一样。
  - 拖动更流畅：视线跟随改用 CSS 变量；状态更新每帧最多渲染一次，且只在可见内容变化时渲染；拖动位置每帧只更新一次；拖动时不重建设置面板；面板换侧时平滑滑过去，不再瞬移。实测渲染量：拖动时约降为 1/6，移动鼠标时约 1/16，流式输出时约 1/4.5。
  - 测试由 75 项增至 84 项。
- Claude Opus 5.5 前端重做（未发布，版本号不变）：
  - 设置面板与角色作为整体布局：面板贴在角色旁并保持 16px 间距，只在当前侧放不下时才换侧，必要时把角色移到两者都能放下的最近位置。窗口放不下这一组时，设置改为带标识的独立面板。设置打开期间暂停游荡。
  - 设置面板重做为固定标题、可滚动正文和单行底部区域（说明与按钮间距 12px，距底 16px）。工具栏与设置中移除 Q 版切换；旧的 `chibi` 偏好在暂停期间按普通立绘显示，全部素材保留。
  - 所有姿态在同一舞台框内按脚底对齐显示，并按头部尺寸逐姿态校准缩放。撒娇不再显小，切换姿态也不会挪动角色。用尺寸代替 CSS zoom，命中区域随实际图像变化。
  - 余额有了固定位置：设置中的余额卡片和头顶的小标签。未读取显示 —，绝不显示 ¥0.00；旧数据标注“非实时”；“还能吃几碗”和低余额提醒只用最新的人民币数据。启动时读取余额仍待 Codex 接入。
  - 剧场重新整理：顶部主要操作分组；大屏阅读完整露头；阅读区域更不透明；完整阅读模式只在停留底部时跟随新文字；窄窗口顶部改为图标按钮。
  - 新人物音效（`voice.ts`）：随文字出现发出轻柔的中频说话音，带换气停顿和句末下行音。播放调度有上限，网络停顿约半秒内静音，不补播积压内容；代码不发声；仍默认静音。
  - 样式基于主题变量重写，去掉层层覆盖；剩余的“Little Whale”称呼统一为大肥鱼。
  - 测试由 39 项增至 75 项，新增四角与贴边布局、旧 chibi 偏好、立绘校准、余额状态和音效生命周期。
- 产品名统一为“大肥鱼”，中英文贡献者均将发起人列在首位，并说明当前余额读取限制。
- 新增 Opus 5.5 前端交接及 Codex 余额接入计划，明确分工、优先级和验收条件。文档内容为待办，本条不包含 UI 修复、Q 版禁用或启动余额接入。

### [v0.4.0] - 2026-10-31

- 恢复无框大小圆点，字号改为带实时数值的连续滑条，放宽设置间距并加强浅色选中态。
- 大屏模式重新布置立绘，移除矩形分层光晕；加入原始 Dizzy.png，成为第 12 张内嵌角色图，用于摇晃眩晕反馈。

- 修复淡化后无法操作和拖拽时菜单分离；增加明确的 Alt 穿透与 Alt+W/T 快捷键。
- 扩容/全宽剧场、按测量行宽分页、向上更多菜单、独立设置滚动、主题滚动条、可点击档位圆点与行内代码。
- 指南、发布说明、交接迁入 docs/，移除重复安装脚本与未引用旧图，同步打包与贡献者。

- 设置分组、安静模式恢复、字号、称呼、完成通知和本地 Doctor。
- 缩矮剧场、单页码、快捷键、按容量分页、粗体、速度与标点停顿。
- 近似透明轮廓、阅读淡化、贴边探头与减少动画。
- 非官方声明、授权说明与投稿模板；剩余事项参见 docs/PM_REVIEW_IMPLEMENTATION.md。

### [v0.3.0] - 2026-10-30

#### 新增
- 中英文菜单和陪伴提示；太阳/月亮切换的独立明暗毛玻璃主题，不影响 DSH 主题。
- 保存语言、主题、角色、位置、游荡、阅读及音效设置；支持透明度和五档吸附大小滑条，圆点刻度、中间默认档加粗。
- 回答输出及逐字显示期间持续的人物说话音，以及顿悟、点击和干饭短音。原生 Web Audio 合成，默认静音，可调音量，使用低通滤波、柔和包络与短句停顿，无需下载音频。
- 逐字显示：第一次点击补全当前段，第二次点击推进；上一段、完整阅读、读完自动显示下一段、已加载问答回顾，以及隐藏/恢复界面。
- 安全文本与代码卡片、保留代码围栏，剧场和桌宠工具栏支持一键复制代码。
- 摸头爱心、高速拖拽眩晕、有限惯性与浮力回弹，复用现役 11 张插画。
- 可关闭的午饭/熬夜提醒、读取到真实余额后的不足提示、生成耗时；仅在 DSH 明确提供时显示 token 速度。

#### 优化
- 剧场顶部收简为回顾、自动、更多、退出；低频操作收进清晰的毛玻璃菜单。
- 缩放角色时设置面板大小与位置固定；台词气泡靠近角色并按位置换边。支持点击外部/Escape 关闭设置及减少动态效果偏好。
- 界面、状态机和宿主适配器从源码直接编译到自包含运行模板；跳过未变更编译输出，原子替换浏览器运行包。

#### 修复
- 散步延迟回调抢占思考/回答、过期待机防抖、闲置计时失效，以及卸载后眨眼回调残留。
- 桌宠自身动画引发页面重复扫描、推理内容混入回复及嵌套 Markdown 重复提取。
- 中文输入法回车误发送、发送按钮不可用时草稿丢失、受控输入框同步、失焦拖拽不释放及拖回原点误触点击。
- 查看较早思考内容时被自动滚动强制拉回底部。

#### 验证与边界
- 构建、类型、运行包语法和 30 项自动测试通过；已在 DSH 检查剧场顶部、更多菜单和固定面板缩放。
- 历史回顾仅包含当前页面已加载消息；偏好保存在本地，插件不持久化聊天历史。
- 页面适配依赖 DSH 的 DOM 标记；耗时从检测到生成开始计算，缺少宿主指标时不伪造 token 速度。
- 音色主观听感和完整模型流式链路仍需要更广泛的实际使用反馈。

### [v0.2.0] - 2026-10-30

#### 新增特性
- **模块化动作与表情体系（收录于 assets 与本地素材目录）**：
  - `Maid.png`：高清少女女仆全身立绘。
  - `DaFeiYu.png`：可爱迷你 Q 版形态。
  - `Answering.png`：专属回答姿态，在模型正式输出回答时播放（`isStreaming = true`），伴随口型张合与呼吸律动。
  - `baifan.png`：大铁盆大口吃白米饭插画。在回答输出完毕后播放约 4.5 秒补充能量，游荡停下后也会停下来吃两口（输出过程中严格不播放干饭图）。
  - `getit.png`：灵光一闪灯泡顿悟动作，在思考末期及思考过程中以约 20% 概率短暂穿插。
  - `sajiao.png`：托腮鼓腮撒娇动作。点击大肥鱼触发短撒娇（2秒后自动恢复原状态，不干扰思考或回答）；60秒长时间未互动触发长撒娇并呼唤主人陪陪她，任何交互均可立即解除唤醒。
  - `Think1.png` 至 `Think5.png`：五套专属思考动作，在思考推理全过程中以不固定随机时间（2.0秒 - 3.8秒）和不固定随机顺序轮换。
- **长时间未互动陪伴机制**：
  - 待机 60 秒未操作时自动触发孤单撒娇台词与动作。
  - 用户进行任何鼠标点击、拖拽或输入框输入均可即刻重置计时器并唤醒复原。

#### 优化调整
- **回复流程规范化**：严格分离推理中、回答生成中、输出完毕干饭三阶段，状态层次分明。
- **编译打包自动化**：一键脚本自动同步本地素材，并将全部 11 种姿态编译为 Base64 内嵌于单文件客户端中。
- **文档规范化**：全套中英文双语对照说明，去除所有冗余 Emoji 表情。

#### 缺陷修复
- 修复状态切换时的抖动与打断问题，确保点击交互不会冲掉推理和回答状态。
- 修复游荡停靠结束时的动作衔接，漫步完成后平滑停下吃米饭补充能量。

---

### [v0.1.0] - 2026-10-29

#### 新增特性
- 专为 DeepSeek Harness (DSH) 客户端打造的深海小鲸女（大肥鱼）首发版本。
- 少女立绘与迷你 Q 版双形态自由切换。
- 独立漫画思考气泡，支持上下滚动回看完整深度思考全过程（CoT）。
- 头顶常驻显示当前账号真实的充值余额与赠金余额。
- GalGame 对话模式：底部大剧场对话框，智能段落分页排版，点击逐段翻页推进。
- 提供一键自动安装脚本（`install.bat`）与卸载脚本（`uninstall.bat`）。
