<a id="top"></a>
# v0.3.0 — A livelier Little Whale / 更有陪伴感的大肥鱼

[English](#english) | [中文](#chinese) | [Full changelog / 完整日志](https://github.com/Ewigkeit1203/dsh-whale-pet/blob/main/CHANGELOG.md)

<a id="english"></a>
## English

A bilingual desktop/web companion and visual-novel conversation theatre for DeepSeek Harness, now with independent glass themes, synthesized character sounds and more comfortable reading controls.

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


### Install or upgrade

Download **dsh-whale-pet-v0.3.0.zip**, extract it completely to a permanent folder, run **install.bat**, then refresh DSH with **Ctrl + R**. When upgrading, replace the plugin files in the same folder or rerun the installer from the new folder. DSH supplies React and Cordis; end users do not need Node.js or npm.

Sound starts muted. Enable **Character sounds** in Settings or **More** in the theatre. Size stops are 50%, 75%, 100%, 115% and 130%; the stronger middle dot is the default. Click the dialogue to finish its text reveal before advancing.

[Back to top](#top)

---

<a id="chinese"></a>
## 中文

为 DeepSeek Harness 打造的桌宠与 GalGame 对话剧场。本版加入独立毛玻璃主题、人物合成音效，以及更舒服的阅读与陪伴交互。

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


### 安装或升级

下载 **dsh-whale-pet-v0.3.0.zip**，完整解压到固定目录，运行 **install.bat**，再在 DSH 中按 **Ctrl + R** 刷新。升级时可覆盖同一目录中的插件文件，或在新目录重新运行安装脚本。React 与 Cordis 由 DSH 提供，普通用户无需安装 Node.js 或 npm。

人物音效默认关闭，可在设置中勾选，或从剧场“更多”菜单开启。大小共有 50%、75%、100%、115%、130% 五档，中间加粗圆点为默认档。文字未显示完时点击会先补全，再次点击才翻页。
