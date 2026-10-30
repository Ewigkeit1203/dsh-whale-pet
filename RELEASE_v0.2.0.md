# Release Notes - v0.2.0 / 发布日志

[English Version](#english) | [中文版本](#chinese)

---

<a name="english"></a>
## English

### What's New in v0.2.0

1. **Modular Expression & Gesture Architecture (`assets/` / `大肥鱼表情`)**:
   - `Maid.png`: High-definition full standing portrait of the Whale Maid.
   - `DaFeiYu.png`: Chibi miniature badge form.
   - `Answering.png`: Dedicated active answering pose during model response generation (`isStreaming = true`), accompanied by live respiratory sway and lip-sync oscillation.
   - `baifan.png`: White rice eating pose. Plays for ~4.5 seconds after content output finishes (`isStreaming: true -> false`), and plays after wandering stops. Strictly never displayed during active response streaming.
   - `getit.png`: Inspiration / "got it" lightbulb pose. Spliced into the later stage of reasoning and occasionally during thinking cycles.
   - `sajiao.png`: Pouting and sajiao expression. Triggered for 2 seconds on click without breaking ongoing reasoning or output; triggered for an extended duration (9 seconds) with lonely dialogue lines after 60 seconds of user inactivity.
   - `Think1.png` to `Think5.png`: Five distinct thinking poses randomly cycled with non-fixed variable durations (2.0s - 3.8s) and non-fixed sequences during Chain-of-Thought reasoning.

2. **Refined State Transitions & Timers**:
   - Resolved all state conflicts between thinking, answering, post-output eating, and wandering completion.
   - Inactivity detection resets immediately upon any user click, drag, or composer typing.
   - 100% automated test coverage across all assets and state machine behaviors.

---

<a name="chinese"></a>
## 中文版本

### v0.2.0 更新内容

1. **全新模块化表情与动作体系（收录于 `大肥鱼表情` / `assets/`）**：
   - `Maid.png`：高清少女女仆立绘形态。
   - `DaFeiYu.png`：迷你 Q 版形态。
   - `Answering.png`：专属回答姿态，在模型生成回复时播放，伴随活体呼吸与口型律动。
   - `baifan.png`：大铁盆大口吃白米饭插画。输出完毕后播放约 4.5 秒补充能量，游荡停下后也会停下来吃两口（输出过程中严格不播放干饭图）。
   - `getit.png`：灵光一闪灯泡顿悟动作，在思考末期以及思考过程中偶尔短暂穿插呈现。
   - `sajiao.png`：托腮鼓腮撒娇动作。点击触发短撒娇（2秒后自动恢复原状态，不干扰思考或回答）；60秒长时间未互动时触发长撒娇并呼唤主人陪陪她，任何交互均可立即解除唤醒。
   - `Think1.png` 至 `Think5.png`：五套思考动作，在思考推理全过程中以不固定随机时间（2.0秒 - 3.8秒）和不固定随机顺序轮换。

2. **状态流转与交互保护机制**：
   - 完善推理、回答输出、干饭补充、闲置撒娇各状态之间的无缝平滑切换。
   - 用户进行任何点击、拖拽或输入框输入均可即刻重置闲置计时器。
   - 完整的自动化单元测试，覆盖全部 11 种姿态素材完整性与状态机全场景流转。
