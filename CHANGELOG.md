# Changelog / 更新日志

[English Version](#english) | [中文版本](#chinese)

---

<a name="english"></a>
## English

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
