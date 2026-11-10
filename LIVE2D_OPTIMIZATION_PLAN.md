# 大肥鱼 Live2D 互动优化方案 / Live2D interaction plan

整理日期：2026-11-09（America/Los_Angeles）。状态：研究与交接方案，尚未实施。

本轮用户要求：参考演示视频和 jingyu-live2d-agent，让大肥鱼更灵巧、有互动感，判断前端／宿主集成分工，并只创建专门文档。本轮不修改业务代码，不安装或运行参考项目，不接通外部 Agent，不发布版本。下文的参数、时间、接口与验收阈值中，明确标为“建议”的内容不是现有功能。

## 1. 先做什么、由谁做

**建议 Claude 主导下一轮动作表现，我负责模型能力与动作控制契约、DSH/Agent 接入和性能可靠性。** 当前最影响观感的是模型输入映射和动作编排，不适合继续只增加正弦摆动幅度。

优先顺序：模型输入与物理归属校准 → 自然待机与鼠标注意力 → 原生手势及互动反馈 → 动作调度稳定后，再接 Agent。并行分工只是建议，本轮没有联系 Claude，也没有向任何其他 Agent 派发任务。

| 工作 | 建议负责人 | 可交付结果 |
| --- | --- | --- |
| 视频观感拆解、头眼时差、身体配合、表情节奏、手势与镜头构图 | Claude | 可在实际 DSH 中观看的动作预览、参数表及前后对照 |
| 模型参数归属、原生动作导入契约、通道互斥、生命周期和取消回正 | Codex | 能力目录、动作协议、调度契约及自动回归 |
| Cubism 每帧混合与动作播放 | Claude 实现，Codex 检查时序和性能 | 不争抢参数、不漂移、不重复创建模型的渲染层 |
| DSH 能否注册工具、读取允许的任务事件、模型规划结果处理 | Codex | 先做能力调查，再接最小闭环；不假定宿主已有工具注册 API |
| 整体大小、头部比例、明暗主题、桌宠／剧场交互 | Claude | 两种模式、窄窗口、缩放与触摸／拖动验收 |
| 角色性格、动作是否合适、是否接入 Agent | Ewigkeit1203 | 产品方向与最终体验验收 |

## 2. 已查看的依据及边界

### 2.1 用户提供的视频

本地文件：`C:\Users\etern\Downloads\43168695496-1-192.mp4`。

解码信息：约 64.48 秒，1280 × 720，约 30 fps，含音轨。本次查看了覆盖全片的 16 张抽帧，以及 46–49.5 秒、57–60.5 秒各 0.5 秒间隔的连续样本；没有完成逐帧全片或音轨分析。视频时间点为近似参考，不作为精确反应延迟或帧率证据。

| 时间段 | 样本中可见内容 | 对大肥鱼的启发 |
| --- | --- | --- |
| 约 8–13 秒 | 近景人物、手势、眨眼、表情与配饰切换 | 互动要有可识别的“反应”，不只身体呼吸 |
| 约 21 秒 | 普通立绘与 Q 版等展示 | 仅参考表现差异，不据此恢复本项目已暂停的 Q 版入口 |
| 约 30–43 秒 | 侧头、闭眼、面部表情及近景展示 | 头、眼、嘴和面部表情需要有配合和停留 |
| 46–49.5 秒 | 连续样本可见头部朝向、倾斜、眼睛开合和身体姿态变化 | 细动作应有前后过程，不是一帧切到目标参数 |
| 57–60.5 秒 | 眼镜、闭眼、侧头和举手姿态等组合 | 优先使用作者已有的动作及开关，加入进入／保持／退出 |

视频也包含快速剪辑、叠加图形、缩放与转场。不能把剪辑带来的活泼感全部归因于模型骨骼能力，更不应把视频中的每种服装、Q 版或特效都加入插件。提取的是动作节奏和联动原则，不复制画面、音频或素材。

### 2.2 开源参考

项目：[InariNGT-Ofiicial/jingyu-live2d-agent](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent)。本次读取快照：`b5a64a1ab5c6d3f6806795c353158dc006dd1be7`。下文链接固定到该提交，避免未来 main 更新后误认为描述仍适用。

已读取 README、Agent 工具 schema、API 文档、编译器、能力目录、动作引擎、待机／视线／点击模块、手臂约束及相关测试。代码已下载至本聊天 C 盘工作区的 `reference/jingyu-live2d-agent/`，仅阅读，未运行其启动器、服务、模型控制或测试。

主要参考：

- [动作引擎 engine.mjs](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/web/engine.mjs)：分层处理待机、注视、讲话、显式动作、眨眼和表情，再统一提交参数。
- [待机事件 idle-events.mjs](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/web/idle-events.mjs)：多种短事件、事件间休息、避免紧接重复、首尾淡入淡出。
- [语义编译器 compiler.py](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/compiler.py)：先检查动作数量、数值、时长和参数冲突，再生成有界轨道；禁止直接写作者物理输出。
- [模型能力 model_profile.py](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/model_profile.py)：模型专用语义输入、原生手势和进入／退出动作映射，不是任意模型通用方案。
- [Agent 工具 agent-tools.json](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/agent-tools.json)、[调度器 agent_tool.py](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/agent_tool.py)：capabilities / state / compile / execute / stop 五类操作，执行有回执。
- [手臂约束 arm_binding.py](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/arm_binding.py)：相对作者手势姿态约束大臂、小臂、手腕；它不是完整骨骼 IK。
- [桌面视线 desktop-gaze.mjs](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/web/desktop-gaze.mjs)：全桌面坐标来自 Electron 原生接口。大肥鱼当前只在 DSH 窗口内追随，不能只复制这段网页代码就获得全桌面追踪。
- [代码许可证 LICENSE.txt](https://github.com/InariNGT-Ofiicial/jingyu-live2d-agent/blob/b5a64a1ab5c6d3f6806795c353158dc006dd1be7/LICENSE.txt)：根代码为 MIT；若迁入代码，保留相应版权和许可证，并逐项核对第三方文件声明。代码许可不代表模型、美术、音轨或派生贴图的分发许可。

不是本轮目标：整套 Python 工作台、VTube Studio/Spout、独立透明窗口、直播/OBS、语音生成、Minecraft、录制导出及服装分区交互。用户提供仓库是参考，不构成上述功能的实施授权。

## 3. 当前实现及一个需要先纠正的技术点

### 3.1 已有基础

当前本地代码已加入可选 Live2D、原图回退、本机模型导入、姿态与 Exp3 开关映射、头眼追随、简单待机微动、巡游摆腿／重心、桌宠及剧场独立大小、画布短期复用与后台限制。此前构建、类型和 119 项自动测试通过；不等于所有动作已在真实模型上完成视觉验收。

最近实机确认过：导入文件夹可用，Core 回调表错误修复后能显示“正在使用 Live2D：大肥鱼（21.8 MB）”。尚缺完整的新步态、模型放大、剧场来回切换与 CPU/GPU 体验验收。

### 3.2 必须先审查参数映射

本次只读核对用户的 `大肥鱼.vtube.json`、`大肥鱼.physics3.json` 与参考项目能力目录，发现：

| 参数组 | 作者配置／物理中的角色 | 本项目当前写法的风险 |
| --- | --- | --- |
| AngleX / AngleY / AngleZ | 作者 VTS 将 FaceAngleX/Y/Z 映射至这些输入；为物理输入，未列为物理输出 | 应优先作为头部语义驱动候选，并验证作者实际变形链 |
| PositionX / PositionY / PositionZ | 作者将 FaceAngleX/Y/Z 另映射到身体位移；为物理输入，未列为输出 | 只转头而未加入身体联动，会削弱整体动作感 |
| LeanInput | 物理输入，未列为输出 | 可作为轻前倾候选，幅度须按当前模型实测 |
| ParamAngleX/Y/Z、ParamBodyAngleX | 同时出现在物理输入与输出中，属于链式计算的一部分 | 当前 runtime 直接赋值可能被后续物理覆盖，不能把“字段存在”当作正确控制入口 |
| LEGAngleZ2 及多个 Hip/Arm 参数 | 本模型中是作者物理输出 | 上轮在物理后叠加小幅步态只是暂行方案，不能扩展成 Agent 可任意写入的接口 |

这是前几轮实现需要补做的映射校准，不能把责任归于模型“不够灵活”。**静态配置证明了归属冲突风险，但尚未证明每个参数对最终画面的因果贡献；必须逐通道观察和对照。** 本轮遵守“只写文档”，没有修改这些驱动。

建议先建立模型能力表：参数 ID、显示名、实际 min/max/default、输入／输出归属、允许的软幅度、关联通道、对应原生动作。范围从已导入模型的 Core 实例读取；作者文件只读。不要照搬别人 core-inventory.json 的数值作为我们模型的永久事实。

### 3.3 现有导入器还不保存完整原生手势

`live2d-package.ts` 当前会保留 Exp3 与 `IDLE.motion3.json`，不会保留其他动作。用户本机 Animation 目录有：

- 默认手切举手／举手切默认手；
- 竖手指切出来动画／竖手指切回默认；
- 狗尾草切换出来／狗尾草切回默认手。

这些是优先调查的原生手势，不需要凭空把所有关节从零拼起来。但它们目前不在已存 IndexedDB 模型记录里。若后续决定支持，需先扩展导入白名单、动作元数据和记录兼容，再提示用户补充导入；不能让旧记录因缺新动作而无法启动。无需重新上传／分发整个模型，也不能从本地文件夹悄悄读回文件。

## 4. 互动目标：更灵巧，而非更忙碌

### 4.1 自然待机

保留轻呼吸，新增少量可辨识事件，例如：换重心、轻侧头看一眼、点头回正、稍前倾、手臂放松。事件应该有准备、执行、短暂停留、回位；之间留空，不让所有轴一直同频正弦运动。

建议初始调参：事件间休息约 6–15 秒，事件约 2–5 秒；同一事件不紧邻重复。思考、讲话、拖动、用户互动或执行显式动作时，暂停低优先级待机事件。数值均为待视觉确认的起点，不是验收事实。

### 4.2 鼠标注意力

眼睛先追，头随后，肩身再轻微配合；推荐先试眼部约 80–120 ms、头部约 250–400 ms 的平滑时间常数，再实机调节。光标离开窗口、失焦、页面隐藏或关闭功能后平滑回到中性。

显式“向左看／低头”的动作应暂时接管有关轴，不能被鼠标立即拉回。拖动角色时区分“窗口位置在变”和“人物主动看向目标”，不要让模型因坐标变化来回甩头。当前不承诺跨应用／多显示器追踪；那需要单独确认宿主原生能力与范围。

### 4.3 触摸与动作反馈

在既有点击、摸头、连续戳、晃动等入口上增强反馈，不必新增一排按钮。候选：摸头时略闭眼抬头并微笑；普通点击先看向点击处再点头；连续戳先疑惑再短暂退让；晃动后平滑恢复视线。

保留输入焦点、拖拽阈值和中文输入法保护，尤其不要把拖动结束当成点击。连续输入应合并或限流，不能排出一分钟都播不完的队列。建议先试同类动作 1.5–3 秒冷却；忙碌时缩小反应，不能丢失模型回答状态。

### 4.4 讲话与表情

从“输出=固定 Answering 表情”逐步变成短句开始时的轻点头／强调、停顿时收嘴、句末轻回正。现有字符到达事件只用于节奏，不声称真实语音唇形。

表情维持一段合理时间，并在语义切换或动作结束后淡出。优先避免重复手势、表情反复跳变和轻微文本变化每次重新开始动作。现有输出中不吃饭、不被闲置回调抢占的约定继续有效。

### 4.5 巡游

目标是减少漂移感：先把重心、躯干方向与实际位移衔接，再考虑小幅腿动和摆臂。起步、匀速、停止有不同权重；停止后回位，不遗留歪身。读到真实移动速度再驱动节奏，不能只看 WANDERING 标志就原地一直踩步。

该模型未见完整左右脚独立步行、跑步或转身动画；不能承诺真正走路。若驱动作者输入仍无法自然迈步，采用小幅踏步／重心提示，并把完整步行列为需要模型师补动作的工作，不继续放大物理输出伪装成完整步态。

## 5. 建议架构

```text
鼠标／既有互动／DSH 生成事件／可选 Agent 动作计划
                         ↓
         模型能力表 + 验证器 + 动作调度器
                         ↓
  语义通道仲裁：注视、头身、手势、表情、嘴、位置
                         ↓
  作者原生动作／受控输入 → 表情混合 → 作者物理 → 绘制
                         ↓
       状态回执与低频诊断（不驱动 React 逐帧渲染）
```

上图是建议，不是当前导出 API。具体帧阶段需按 Cubism 当前实现确认，不能单凭上述概念顺序直接搬动眼眨／表情／物理的代码。

同一帧每个参数有明确拥有者；对同一输入轴互斥，对确实不冲突的通道允许组合。建议优先级：直接操纵／取消 > 用户显式动作 > 已验证的 Agent 短计划 > 正常状态反应 > 鼠标注视 > 待机。模型生成状态用于决定动作许可，不允许视觉动作修改实际生成状态。

不要把所有动作简单全局独占：微笑和点头可以合理叠加；两个抢占同一手臂的动作不可以。每个动作记录预留通道、开始、保持、退出与终止行为；被打断后从当前姿态平滑退出，不在下一帧突然跳回默认。

## 6. Agent 如何操作 Live2D

### 6.1 推荐先做本地动作引擎，再给 Agent 一个窄接口

参考鲸语的“能力查询 → 计划 → 校验 → 执行 → 回执”，而不是让 LLM 每帧输出参数。实时逐帧动作由本地引擎完成；Agent 只选择短动作、目标、强度、时序。

第一版优先把纯 TypeScript 的能力表／验证器／调度器接进已有 DSH 插件，不默认新增 Python 服务或另一个 Electron 窗口。是否支持宿主工具注册需要调查。若确实必须用独立桥，再单独评估安装与生命周期；本轮不引入。

### 6.2 候选契约（拟议，未实现）

| 操作 | 内容 |
| --- | --- |
| capabilities | 当前导入模型支持的语义动作、软／硬范围、通道和限制；缺失动作不可伪报支持 |
| compile | 检查 schema、版本、有限数字、动作长度、并发冲突，返回可执行计划或明确错误；不播放 |
| execute | 执行已校验计划，携带 requestId / modelRevision / sessionGeneration，返回 jobId |
| state | 返回该任务 queued / playing / completed / error / interrupted / cancelled，不以入队代表完成 |
| stop | 取消当前动作并平滑释放通道；停止模型动作与停止 DSH 生成是两件独立操作 |

候选语义动作先限制为 look、nod、tilt、smile、blink，以及实际具备完整进入／退出的 gesture。时间线可晚于这些基础动作落地；先确定小而可验收的集合。

建议把第一阶段计划限制到约 10 秒、8 个动作以内，而非直接开放参考项目的完整上限；具体按实际响应和性能决定。拒绝未知动作、NaN/Infinity、越界数值、模型版本不符、过长计划和冲突轨道。Agent 不获得任意参数写入、脚本执行、文件读取或宿主 UI 操作权限。

超时、切会话、卸载、换模型后丢弃旧任务／迟到结果。相同 requestId 不重复播放。窗口隐藏期间的策略要明确：暂停时间线并恢复，或终止并回正；不要恢复时一口气补播积压动作。

### 6.3 与现有产品约定的关系

不额外发送完整聊天记录；优先消费允许的状态／用户明确给出的动作要求。本地预设可复用，不为每个眨眼或待机事件调用模型。保留默认静音、通知关闭、本机存储和原图回退。用户模型始终只在本机，不随源码、日志或安装包发出。

工具 schema 文件存在不等于 DSH 已把这些工具注册给运行中的 Agent。我们现在也没有连到鲸语服务；不能在交接中写成“Agent 已能自主控制”。

## 7. 分阶段交付

| 阶段 | 内容 | 建议负责人 | 完成条件 |
| --- | --- | --- | --- |
| P0 校准 | Core 真实范围、VTS 映射与物理归属；排查输入被物理覆盖 | Codex 定契约，Claude 做视觉探针 | 头左右／上下、身体位移逐项对照，证明有效且回正正常 |
| P1 动作观感 | 多样待机、眼先头后、身体跟随，既有触摸反馈 | Claude 主导 | 在真实 DSH 连续观察 3 分钟，不罚站、不机械循环、不持续晃头 |
| P1 原生手势 | 扩展必要动作导入、进入／保持／退出、表情持续和通道调度 | 共同完成 | 旧模型记录可用；新手势有完整收回、可取消、不穿帮 |
| P2 Agent | 宿主能力调查、窄工具接口、短计划、校验／回执／会话隔离 | Codex 主导 | 一个请求能查能力、播放并确认完成；重复、错误、停止均可验证 |
| P3 打磨 | 组合动作去重、巡游节奏、窗口和缩放、性能回归 | Claude 调观感，Codex 查性能 | 产品负责人看过实机证据后验收，再决定是否发布 |

每阶段先做少量能比较的成果，避免重新整体推翻已经可运行的导入、回退和大小系统。不在本轮自动实施任何阶段。

## 8. 验收与性能建议

以下是下一阶段的验收清单，不是本次测试结果：

- 视觉对照：同一模型、相同大小和背景，在桌宠／剧场各录制“旧版／新版”短片；检查头眼先后、身体联动、手势收回、自然停顿，不能只交参数日志。
- 输入映射：分别测试 AngleX 与 ParamAngleX 一类输入／输出关系；读取结果和最终画面共同验证。不得仅通过字段变化断言模型动对了。
- 交互：左右／上下移动鼠标，移出窗口，摸头、单击、连戳、拖动再松手，输出中触摸；无草稿丢失、误发送或焦点抢占。
- 状态：思考 → 输出 → 结束，巡游开始／停止，切会话、后台恢复、换模型，均不保留旧表情／旧任务。输出期间不吃饭，不因动画把生成状态改为闲置。
- 大小：60%、默认、200%，普通窗口与窄窗口；两种模式分别记忆，头部不突然消失，命中区域与实际画面相符。
- 稳定性：至少连续 20 次桌宠／剧场切换与多次重新导入，不叠人、不重复启动 Core、不增长订阅或 WebGL 上下文；缓存过期确实释放。
- 动作：用可注入随机种子验证不紧邻重复及打断回正，用实际模型验证正常幅度；无原生动作时诚实返回不支持，不偷偷播放无关动作替代。
- Agent：无效输入不执行；重复 requestId 不重播；停止、超时、切会话都能终止旧计划；只在本地调度器报告完成后返回 completed。
- 性能：复用同一模型实例、已解码贴图和预编译轨道；不把逐帧数据放入 React 状态；不每帧调用 Agent、不频繁同步 GPU 读回、不对每个 token 重编译完整动作。
- 测量：先记录本机旧版基线（CPU 脚本时间、实际帧率、帧间隔、内存、模型实例数），再比较 60 秒待机、10 秒流式输出、连续互动和剧场切换。建议新增调度的脚本开销控制在同场景基线约 +10% 内；这是目标而非结果，若视觉改进需要更高预算，应给出实测后再决定。
- 30 fps 是当前渲染上限策略，不代表已经稳定达到 30 fps。至少报告平均和 p95 帧间隔，并说明前后台、窗口尺寸、DPI、GPU 和是否减弱动效。保持重模型自适应降频与后台停止策略。

## 9. 给 Claude 的具体交接

先读本文件第 3 节，不要直接继续放大 runtime.ts 里的 ParamAngleX/Y/Z 正弦项。与 Codex 先确定作者语义输入映射及共享接口，再做以下小批次：

1. 校准眼先头后与轻身体跟随，提供左右、上下及离窗回正的实际 DSH 对照。
2. 做少量有间歇、首尾自然的待机事件，至少包含侧看、点头或前倾、放松换重心，避免相邻重复。
3. 在已有摸头／点击／连戳入口加入少量可识别反馈，保护拖动和模型输出状态。
4. 待原生动作导入契约完成，再接抚胸／竖指等进入、保持、退出；不要靠随机写关节伪造所有手势。
5. 将动作强度与节奏放在集中可调配置；需要用户设置时先提供最小入口，不重做整个设置页。
6. 提供视觉证据和未完成项。不能用“测试全绿”替代动作好看、耐看及实机流畅的结论。

共享文件：live2d/runtime.ts、live2d-types.ts、live2d-look.ts、live2d-package.ts、media-store.ts、preferences.ts、LivingPuppet.tsx、PetOverlay.tsx、TheatreView.tsx、build.js。若由两人同时工作，先约定文件与契约，避免彼此覆盖未提交内容。

## 10. English handoff summary

This is a planning document only. No application code, agent registration, external service or release was changed for this request.

The goal is expressive, responsive movement, not constant larger oscillations. Sampled video frames show coordinated head/eye/body poses, held expressions and recognizable gestures; edited zooms and transitions are not evidence of model capabilities or latency.

Claude should lead movement design, cursor/interaction feel and real-DSH visual checks. Codex should own the model capability contract, channel arbitration, cancellation/lifecycle, host tool investigation and performance regressions. They should review the frame pipeline together.

First audit the actual model. Its author configuration maps face angles to AngleX/Y/Z and PositionX/Y/Z. Current code drives ParamAngleX/Y/Z, which also participate in the physics-output chain. Earlier post-physics leg/hip offsets are provisional; they should not become unrestricted agent-writable channels. Validate real input mappings before adding stronger motion.

Borrow Jingyu's semantic plans, bounded validation, driver ownership, non-repeating idle events and explicit execution receipts. Keep the existing renderer; do not transplant its Python/VTS/Electron workstation. Preserve author physics and native gesture entry/exit. Our importer currently retains only IDLE motion, so native gestures require an explicit compatible import/storage extension.

An optional future agent interface should expose capabilities, compile, execute, state and stop. The agent selects short semantic actions; the local engine animates frames. Host registration support remains unverified. No raw model assets, full conversations or credentials should be added to that interface.

Acceptance requires visible before/after recordings, working interruptions, independent desktop/theatre sizes and measured performance. Existing 119 passing tests are a prior baseline, not proof of this proposal's implementation.

## 11. 进度（Claude Opus，2026-11-09 夜，未提交）

§9 的 1–4 已完成：语义输入校准（不再写物理输出）、眼先头后与身体跟随、待机事件、触摸反馈、原生手势（导入契约已扩展，旧记录兼容）。细节、验证与共享文件清单见 `docs/handover/LIVE2D_HANDOFF.md` §8。Agent 接口（§6）仍待 Codex。


## 12. 今日交互收尾（Codex，2026-11-10，未提交）

已按用户最新反馈将正面踏步改为轻移，拎起去蹬腿、改用模型原有的双肩／肘／腕动画输入；加入可见胸部点击的害羞遮挡与劝阻（不把拖动当点击），修正快速再抓取的缓动／旧帧／旋转中心衔接，并缓存命中数据、减轻拖动阴影。未新增常驻计时器或导入要求，原物理输出不覆盖。

142 项回归、构建与严格类型检查通过；实机确认胸部反应。快速拖动和长期运行的真实 GPU 帧耗时仍需定量验证，不能由模拟计时或单元测试推断。最新文件、接口与限制见 docs/handover/LIVE2D_HANDOFF.md §13、PROJECT_CONTEXT.md §17。Agent 接口仍未接入。


## 13. 手臂轨迹与四阶段重修（Codex，2026-11-10，未提交）

用户视频反馈的是过程方向，不只是末帧。已用原模型 Core 网格校准 carryArmPose 的正向短弧；左侧顺时针／右侧逆时针抬起，放下各自原路反向，手部不再穿过身体中线。四阶段控制移入纯 CarryController，后领实际对齐光标，加入可缩放地面提示与完整旋转／缩放再抓取补偿，移除旧挂点 helper；不添加新常驻循环。保留不额外蹬腿与只左手抚胸。

147 项测试、构建和严格类型检查通过，原模型正反路径校准通过。窗口控制工具初始化失败（kernel assets/path missing），因此 DSH 的视觉手感与 GPU 帧耗时仍未实测。完整接口、配置、校准方式及限制见 docs/handover/LIVE2D_HANDOFF.md §15、PROJECT_CONTEXT.md §18。BACKEND_ROADMAP 已读，其发布与 Agent 等工作未自动展开。


## 14. 点击阈值与局部膝盖缓冲（Codex，2026-11-10，未提交）

按最新用户要求恢复有限腿部联动：悬空膝盖内并、小腿略展开；落地双膝轻弯、身体下沉，脚底局部反向补偿，不做宽分腿蹲或反复蹬腿。新增纯 LegPoseLayer，加载时计算权重并分配固定缓冲，每帧 Core 更新前还原、更新后施加，正确标记裁剪蒙版变化，待机无重复变形工作；未改 SDK／模型。删除上一轮强制后领吸附光标的 carryPosition，这是点身体后整个人下移的来源；10 px 点击抖动阈值、真实拖动保留原始偏移。下落回正并取消额外滑动／旧落地脉冲／Live2D 整图挤压。

155 项测试、构建与严格类型检查通过。原模型 42 块腿网格／3670 顶点无三角翻转，落地脚底抵消误差约 1.07e-8 模型单位。局部 JS 位移约 0.010 ms，仅为微基准。静态腿姿已检查；窗口控制工具仍无法初始化，DSH 动态手感与完整 GPU 帧耗时尚未验收。完整接口和限制见 docs/handover/LIVE2D_HANDOFF.md §16、PROJECT_CONTEXT.md §19。无需重新导入，不含用户模型资产，未提交／推送。
