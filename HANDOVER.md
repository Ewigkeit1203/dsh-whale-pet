# DeepSeek Little Whale Maid ('大肥鱼') Plugin - Agent Handover Guide (v0.2.0)

> **面向接手 Agent (GPT-6 Astra)**：这份文档是 `dsh-whale-pet` 项目的终极交接与架构全景指南。它详尽记录了项目背景、全套业务需求、状态流转逻辑、代码架构、构建打包机制、历史避坑经验及所有测试验证流程。请在开始任何修改前完整阅读本文档。

---

## 1. 项目基本信息与核心定位

- **项目名称**: `dsh-whale-pet`
- **当前版本**: `v0.2.0`
- **代码仓库绝对路径**: `C:/Users/etern/.gemini/antigravity/scratch/dsh-whale-pet`
- **表情素材源目录**: `C:/Users/etern/OneDrive/Desktop/大肥鱼表情`
- **发布产物路径**: `C:/Users/etern/OneDrive/Desktop/dsh-whale-pet-v0.2.0.zip`
- **Git 远程仓库**: `https://github.com/Ewigkeit1203/dsh-whale-pet.git`
- **提交者身份规范**: 必须且仅能为 `Ewigkeit1203 <etern1ty061203@gmail.com>`，**严禁添加任何 `Co-authored-by` 邮箱**。
- **项目定位**: 专为官方 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 客户端（基于 Cordis 框架、Electron/Web 与 React 19 构建）打造的**高互动性活体桌宠**与 **GalGame 视觉小说沉浸式对话插件**。

---

## 2. 完整业务需求与行为规则矩阵

桌宠插件主要由三大模式驱动：**悬浮桌宠挂件模式（Widget）**、**GalGame 视觉小说剧场模式（GalGame Stage）** 以及 **后台状态机驱动的活体动画系统（Living Puppet）**。

### 2.1 角色形态（Form）
1. **少女立绘形态（`Maid.png`）**：
   - 默认形态。高清全身海蓝色长发女仆立绘，具备活体呼吸倾斜、视差眼动跟随、口型张合。
2. **迷你 Q 版形态（`DaFeiYu.png`）**：
   - 圆滚滚包子脸的可爱 Q 版小鲸女形象。
   - 可在鼠标悬停工具栏、设置抽屉中一键来回切换。

---

### 2.2 动作与表情管理体系（共 11 张现役图片）
所有历史冗余素材（如旧版 `baifan2.png`、`Pondering...`、`Puzzled...`、`641.png`、`rice-bowl.svg` 等 14 个旧文件）已全部废弃并永久删除。当前系统**严格且仅由以下 11 张素材驱动**：

| 文件名 | 动作/表情定位 | 触发场景与业务规则 |
| :--- | :--- | :--- |
| **`Maid.png`** | 少女全身女仆立绘 | 默认站姿与待机闲置状态（`state === 'IDLE'`）。 |
| **`DaFeiYu.png`** | 迷你 Q 版形态 | 切换为 Q 版时的基础常驻图像。 |
| **`Answering.png`** | 专属回答输出姿态 | **模型正在生成回答时播放（`isStreaming = true`）**。伴随身体专注微倾、呼吸律动与口型张合（`mouthOpenRatio` 振荡）。**严格规则：在回答输出流生成过程中，绝对不播放吃白饭图片！** |
| **`baifan.png`** | 大口吃白米饭（大铁盆） | 1. **回答输出完毕庆祝**：当回答生成结束（`isStreaming` 从 `true` 转为 `false`）的一瞬间触发，播放约 4.5 秒（`triggerPostOutputEating(4500)`），补充体力。<br>2. **游荡停靠吃米饭**：闲置自然散步停下后触发，停下来吃两口白米饭约 3.5 秒（`finishWanderingWithEating(3500)`）。 |
| **`getit.png`** | 灵光一闪灯泡顿悟 | 1. 深度思考即将结束、快要开始输出答案前短暂播放。<br>2. 思考推理过程中以约 20% 的随机概率短暂穿插。 |
| **`sajiao.png`** | 托腮鼓腮撒娇姿态 | 1. **点击互动（短撒娇）**：鼠标点击或轻戳桌宠时触发 2 秒，伴随果冻 Q 弹动效与可爱台词。<br>2. **长时间闲置孤单撒娇**：用户超过 60 秒未互动（无点击/拖拽/打字）时触发 9 秒长撒娇，伴随呼唤主人陪伴台词（`triggerInactivitySajiao()`）。用户进行任何操作即刻唤醒并恢复默认。 |
| **`Think1.png`** | 思考姿态 1 | 推理过程中随机轮播。 |
| **`Think2.png`** | 思考姿态 2 | 推理过程中随机轮播。 |
| **`Think3.png`** | 思考姿态 3 | 推理过程中随机轮播。 |
| **`Think4.png`** | 思考姿态 4 | 推理过程中随机轮播。 |
| **`Think5.png`** | 思考姿态 5 | 推理过程中随机轮播。 |

> **思考动作随机轮播规则**：在模型处于深度推理（Chain-of-Thought, CoT）期间（`isReasoning = true`），五套思考动作 `Think1` ~ `Think5`（含 20% 几率的 `getit`）以**完全不固定的随机时长（2.0 秒 ~ 3.8 秒）**与**完全不固定的随机顺序**进行动态切换，营造生动的自主思考感。

---

### 2.3 状态保护与交互防打断机制
- **动画保护约定**：当大肥鱼正在**思考（Reasoning）**或**回答（Answering）**时，用户点击大肥鱼会触发短暂的撒娇表情（`sajiao`）与果冻跳动，**撒娇 2 秒结束后必须自动恢复正在进行中的思考动作或回答动作**，绝对不能强行中断或重置当前的思考/回答状态机！
- **闲置陪伴重置机制**：状态机内置 60 秒闲置检测（`INACTIVITY_DELAY = 60000`）。任何用户的鼠标按下（`onMouseDown`）、拖拽（`isDragging`）、输入框聚焦（`focusin`）、输入内容（`input`）均会调用 `stateMachine.resetActivity()`，立即解除孤单撒娇并重置 60 秒计时。

---

### 2.4 GalGame 剧场对话模式（Visual Novel Mode）
- **触发入口**：
  1. 点击桌宠悬浮工具栏中的「对话模式」按钮；
  2. 鼠标点击 DSH 官方聊天输入框区域（若设置中的 `autoGalGameOnChat` 为开启状态）；
  3. **防误触规范**：页面初次加载或输入框自动聚焦（`autofocus`）时，**绝对禁止**自动展开 GalGame 模式，必须等待用户真实鼠标点击。
- **舞台居中展示**：
  - 角色以大立绘舞台化居中渲染，背后带有半透明渐变遮罩层（`galgameBackdrop`），点击任意空白背景即可一键退出剧场模式返回悬浮桌宠。
- **独立漫画思考气泡（Comic Thought Bubble）**：
  - 深度思考推理内容（CoT）**绝不**与正式回答混在同一个框中！
  - 思考过程载入角色头部右侧/上侧的独立漫画思考气泡中；
  - 气泡大小固定、内容支持上下丝滑滚动，随着模型推理实时流式追加并自动滚到底部；
  - 带有漫画式三段小圆球拖尾（trail node），右上角带有关闭/折叠气泡按钮。
- **底部大剧场对话框与文字分页翻页（Visual Novel Progression）**：
  - 底部大容量对话框专门呈现模型的正式回答。
  - **段落智能分页算法（`paginateDialogue`）**：单页容量约为 260 字符，智能在中文句号（`。！？\n`）或逗号处切分断句，尽量放满每一屏文本。
  - **点击翻页推进**：用户点击文字框，即如 GalGame 推进剧情一般切换到下一段话，并带有页码角标（如 `第 1 / 3 段`）与「▼ 点击下一段」引导提示。
- **集成输入框**：
  - 剧场框底部自带输入组件，用户可直接在剧场模式中输入并发送新问题，无缝衔接。

---

### 2.5 实时账户双余额常驻读取
- 桌宠头顶悬浮工具栏中常驻读取并展示真实账户额度：
  `充值: ¥XX.XX | 赠金: ¥XX.XX`（`toppedUpBalance` 与 `grantedBalance`）。
- **读取逻辑**：由 `queryAccountBalances()` 周期性扫描 DSH 页面 DOM（包括 `[class*="balanceCard"]`、`[class*="amount"]` 等节点），直接提取真实金额，不显示冗余伪文案。

---

## 3. 架构与工程实现原理

### 3.1 核心架构概览
```
dsh-whale-pet/
├── assets/                  # 11 张现役角色 PNG 资源（无冗余废图）
│   ├── Maid.png             # 全身女仆立绘
│   ├── DaFeiYu.png          # 迷你 Q 版
│   ├── Answering.png        # 回答姿态
│   ├── baifan.png           # 干饭插画
│   ├── getit.png            # 灵光一闪灯泡
│   ├── sajiao.png           # 撒娇姿态
│   └── Think1.png~5.png     # 五套思考动作
├── src/client/              # TypeScript 源代码（用于类型校验与单元测试）
│   ├── types.ts             # 状态、姿态、事件接口定义
│   ├── state-machine.ts     # 集中式状态机核心逻辑
│   ├── LivingPuppet.tsx     # 2.5D 人物视差倾斜与口型呼吸渲染
│   ├── PetOverlay.tsx       # 主浮动层、GalGame 舞台、漫画气泡与剧场框
│   ├── PetOverlay.module.css# 桌宠样式、呼吸辉光动画
│   ├── galgame.css          # GalGame 剧场框、漫画气泡与拖尾样式
│   ├── index.ts             # Cordis 客户端插件装载与 DOM Observer 监听
│   └── assets-data.ts       # 自动生成的 Base64 Data URI 映射表
├── tests/
│   └── whale-pet.test.ts    # Node.js 原生自动化单元测试套件（10 项全通）
├── lib/                     # 编译输出目录
│   ├── assets/              # 随包导出的静态资源副本（与 assets 保持一致）
│   ├── client.js            # 自包含浏览器产物（供 DSH __ModuleLoader__ 注入）
│   └── index.js             # Cordis 后端入口（声明 client 注入）
├── build.js                 # 核心构建打包脚本（★ 核心关键，见下节）
├── package.json             # 依赖声明、导出规则与元数据
├── cordis.yml               # DSH/Cordis 插件配置文件
├── install.bat              # Windows 一键自动安装脚本
├── uninstall.bat            # Windows 一键卸载脚本
├── CHANGELOG.md             # 中英双语更新日志（带锚点跳转）
└── RELEASE_v0.2.0.md        # 发布说明
```

---

### 3.2 ⚠️ 最关键的工程陷阱：双重代码机制（Double Maintenance）

接手 Agent **必须牢记以下核心机制**：

1. **静态资源内联（Data URI）**：
   - DSH 宿主客户端**不会**为插件提供相对路径静态文件路由，直接通过相对路径 `assets/*.png` 请求必定触发 404！
   - 所有 11 张图片必须通过 `build.js` 使用 `readFileSync().toString('base64')` 转为 `data:image/png;base64,...`，内联嵌入到 `lib/client.js` 与 `src/client/assets-data.ts` 中。

2. **构建产物双重打包规范（核心大坑）**：
   - `build.js` 生成最终浏览器运行产物 `lib/client.js` 时，使用的是**硬编码在 `build.js` 内部的 `clientBundleSource` 模板字符串**（约第 115 行至第 1580 行）！
   - CSS 文件（`PetOverlay.module.css`, `galgame.css`, `LivingPuppet.module.css`）由 `build.js` 实时读取并内联注入。
   - **⚠️ 警告**：如果你仅仅修改了 `src/client/state-machine.ts` 或 `src/client/PetOverlay.tsx`，运行 `tsc` 只会更新 `lib/client/*.js`，**而不会改变 `lib/client.js`！**
   - **标准工作流**：
     - 修改 `src/client/` 下的 TypeScript 代码（保证 `npx tsc --noEmit` 与 `node --test` 通过）；
     - **必须同时同步更新 `build.js` 中对应的 `clientBundleSource` 内联模板代码**；
     - 运行 `node build.js` 重新生成自包含的 `lib/client.js`；
     - 运行 `node --check lib/client.js` 验证最终脚本语法正确无误。

---

### 3.3 DOM 监听与推理/回答识别机制
在 `build.js` 与 `src/client/index.ts` 中，插件通过 `MutationObserver` 周期性检测 DSH 的 DOM 状态：
- **检测推理与回答中**：
  - 检查 `document.querySelector('[data-chat-running]')`（是否在运行推理/回答）。
  - 通过 `extractReasoningText()` 读取思考过程：优先探测 React Fiber 内部属性（`memoizedProps.reasoning`、`memoizedProps.content` 等），后备探测 `.thinkBody`。
  - 通过 `extractResponseText(node)` 提取正式回复正文：主动过滤掉 `[data-variant="think"]`、`details.think`、`.thinkBody` 等思考块，获取纯净回答。
- **状态流转驱动**：
  - 若 `isRunning && !cleanResponse` $\rightarrow$ 判定为**推理中**：`setReasoning(true)`，展示漫画思考气泡与思考动作轮换；
  - 若 `isRunning && cleanResponse` $\rightarrow$ 判定为**回答输出中**：`setStreaming(true)`，展示回答姿态 `Answering.png`，剧场框同步打字；
  - 若 `!isRunning`（输出完成） $\rightarrow$ 判定为**结束**：`setStreaming(false)`，自动触发吃白饭插画（4.5秒）并恢复待机。

---

## 4. 日常开发、编译与测试验证命令

所有命令均在 `C:/Users/etern/.gemini/antigravity/scratch/dsh-whale-pet` 根目录下执行：

```bash
# 1. 执行完整自动化构建（同步素材、生成Base64、编译TS并打包 lib/client.js）
node build.js

# 2. 语法安全检查（确保打包后的自包含单文件 client.js 没有任何语法错误）
node --check lib/client.js

# 3. TypeScript 静态类型检查
npx tsc --noEmit

# 4. 运行全套自动化测试（包含 10 个测试用例，覆盖素材完整性与状态机全场景）
node --test tests/whale-pet.test.ts

# 5. 打包桌面发布 Zip 包（PowerShell 命令，输出至桌面）
powershell -Command "
$dist = Join-Path $env:TEMP 'dsh-whale-pet-dist'
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Path $dist | Out-Null
Copy-Item -Recurse 'lib', 'assets' $dist
Copy-Item 'package.json', 'cordis.yml', 'install.bat', 'uninstall.bat', 'README.md', 'README.txt', '使用说明.txt', 'CHANGELOG.md', 'RELEASE_v0.2.0.md', 'LICENSE' $dist
$zipDest = 'C:\Users\etern\OneDrive\Desktop\dsh-whale-pet-v0.2.0.zip'
if (Test-Path $zipDest) { Remove-Item -Force $zipDest }
Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zipDest -Force
Write-Host 'Zip packaging complete:' (Get-Item $zipDest).Length 'bytes'
Remove-Item -Recurse -Force $dist
"
```

---

## 5. DSH 客户端本地调试与生效路径

- **DSH 本地注入配置文件**:
  - `C:/Users/etern/.dsh/profiles/desktop/cordis.patch.yml`
- **生效机制**:
  - 该配置文件通过 `insert` 已经指向了本项目的编译入口：
    ```yaml
    - insert:
        - id: dsh-whale-pet
          name: "file:///C:/Users/etern/.gemini/antigravity/scratch/dsh-whale-pet/lib/index.js"
    ```
  - **刷新生效方式**：只要运行 `node build.js` 重新生成了 `lib/client.js`，在打开的 DeepSeek Harness 客户端窗口内直接按下快捷键 **`Ctrl + R`**，即可瞬间刷新并加载最新代码，无需重启软件。

---

## 6. Git 提交与版本发布注意事项

1. **提交者身份（Strict Author Identity）**：
   - 全局与本地 Git 必须配置为：
     `git config user.name "Ewigkeit1203"`
     `git config user.email "etern1ty061203@gmail.com"`
   - **严禁包含任何 `Co-authored-by` 尾标**，否则会被 GitHub 缓存解析为外人。
2. **大文件推送网络配置**：
   - 由于内联编译了 11 张图片，打包后的提交约十几兆，Git 推送时需要确保缓冲区充足：
     `git config http.postBuffer 524288000`
     `git config http.version HTTP/1.1`
3. **文档与 Emoji 约束**：
   - 遵从用户要求，除专属名称标示 `🐟 大肥鱼` 之外，`README.md`、`README.txt`、`使用说明.txt`、`CHANGELOG.md` 及发布日志中**一律不使用多余 Emoji**，保持专业、整洁的双语格式。
