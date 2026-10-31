# Changelog / 更新日志

[English Version](#english) | [中文版本](#chinese)

---

<a name="english"></a>
## English

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
