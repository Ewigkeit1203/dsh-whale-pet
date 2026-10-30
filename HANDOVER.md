# DeepSeek Little Whale Maid ('大肥鱼') Plugin - Agent Handover Guide

> **项目名称**: `dsh-whale-pet`  
> **项目定位**: DeepSeek Harness (DSH) 客户端全功能交互桌宠 & GalGame 视觉小说剧场模式插件  
> **项目绝对路径**: `C:/Users/etern/.gemini/antigravity/scratch/dsh-whale-pet`

---

## 1. 核心架构与技术栈

- **宿主环境**: DeepSeek Harness (基于 Cordis + Electron/Web + React 19)
- **开发语言**: TypeScript (ESNext / Node 20+)
- **插槽注入**: `slots.inject('shell.overlay', ...)` 全局顶层透明浮动图层
- **状态驱动**: `PetStateMachine` 集中式事件驱动状态机
- **视觉架构**:
  - **悬浮桌宠形态**: 视口边缘自然巡逻、拖拽停靠、注视视差跟踪、侧边设置抽屉。
  - **GalGame 剧场模式**: 全屏聚焦舞台、漫画式头部悬浮思考气泡（CoT 长文本上下滚动）、底部大剧场对话框（完整句意智能分段、点击下一段翻页）。

---

## 2. 关键设计约定与防踩坑必读

1. **静态资源内嵌要求（严禁改用相对 URL）**：
   - DSH 宿主环境的 Web/Electron 客户端**不会**为第三方插件提供静态路由托管 `/plugins/<id>/assets/`，直接引用图片 URL 会导致 404。
   - 所有插画（少女立绘、Q版、思考、苦思、撒娇、米饭）必须由 `build.js` 统一 Base64 编码为 Data URI 并注入到 `src/client/assets-data.ts` 与 `lib/client.js`。
2. **构建产物双重打包规范**：
   - 本项目通过 `build.js` 将所有 CSS（`PetOverlay.module.css`, `galgame.css`, `LivingPuppet.module.css`）与前端逻辑打包成自包含脚本 `lib/client.js`，供 DSH 的 `window.__ModuleLoader__` 加载。
   - **⚠️ 关键坑（2026-10-28 确认）**：`build.js` 第 5 步打包 `lib/client.js` 时用的是**硬编码在 build.js 内的完整内联 JS 模板**（约 258~1463 行），**并不是** `src/client/*.tsx` 的编译产物！CSS 与图片 Data URI 会从文件实时读取，但 TS/TSX 逻辑改动若不同步修改 build.js 内联模板，就**不会进入最终产物**。修改前端逻辑时必须同时改 `src/`（类型检查与测试用）和 `build.js` 内联模板（真正生效），或将来重构 build.js 改为从编译产物打包。
   - 修改前端代码后，**必须运行 `node build.js`**，确保 `lib/client.js` 同步更新；可用 `node --check lib/client.js` 快速校验语法。
3. **输入框与启动逻辑约定**：
   - 严禁在页面初次加载或输入框自动聚焦（`autofocus`）时强制打开 GalGame 对话模式。
   - 只有用户用鼠标主动点击 DSH 聊天输入框（或点击桌宠工具栏「对话模式」）时才允许进入 GalGame 对话模式。
4. **DSH 核心保护原则**：
   - 严禁修改 `C:/Users/etern/.gemini/antigravity/scratch/deepseek-harness/` 核心源码。所有功能必须通过 `dsh-whale-pet` 自身独立插件实现。

---

## 3. 核心目录与文件索引

```
dsh-whale-pet/
├── assets/                  # 角色原始与透明化 PNG 图片资源
│   ├── Pastel Blue Sea Maid Character.png  # 默认站姿少女立绘
│   ├── Chibi Whale Maid in Blue.png        # Q版形态
│   ├── Pondering Whale Maid Character.png  # 思考动作（托腮）
│   ├── Puzzled Whale Maid in Thought.png   # 深度苦思动作（挠头）
│   ├── DS_mad+sajiao.png                   # 生气与撒娇动作（气鼓鼓）
│   ├── baifan.png                          # 干饭大口吃白米饭形象（正式输出时切换）
│   ├── bubble-tail-left.png                # 左下拖尾漫画思考气泡（用于余额显示）
│   ├── bubble-tail-right.png               # 右下拖尾漫画思考气泡（用于余额显示）
│   └── rice-bowl.svg                       # 旧版米饭备用资源
├── src/client/
│   ├── types.ts             # 状态、姿态、图层与数据接口定义
│   ├── state-machine.ts     # 核心状态机（姿态流转、呼吸/眨眼循环、语音池）
│   ├── LivingPuppet.tsx     # 2.5D 人物渲染器（注视视差倾斜与对话动效）
│   ├── PetOverlay.tsx       # 桌宠主界面（剧场模式、漫画思考气泡、点击翻页、设置抽屉）
│   ├── galgame.css          # GalGame 对话框、漫画气泡与拖尾样式
│   ├── PetOverlay.module.css# 桌宠浮动层与设置抽屉样式
│   ├── index.ts             # Cordis 客户端插件入口、DOM 监听器（思维流/回复流检测）
│   └── assets-data.ts       # 自动生成的 Base64 Data URI
├── tests/
│   └── whale-pet.test.ts    # 完整单元测试（13 项测试全部通过）
├── build.js                 # 自动化构建脚本（抠图、Base64内嵌、TS编译、自包含打包）
└── package.json
```

---

## 4. 全局挂载与配置路径

- **DSH Desktop 配置文件**: `C:/Users/etern/.dsh/profiles/desktop/cordis.patch.yml`
- **DSH Web 配置文件**: `C:/Users/etern/.dsh/profiles/web/cordis.patch.yml`
- 配置项中通过 `insert` 指向 `file:///C:/Users/etern/.gemini/antigravity/scratch/dsh-whale-pet/lib/index.js`。

---

## 5. 常用开发与验证命令

在 `C:/Users/etern/.gemini/antigravity/scratch/dsh-whale-pet` 目录下执行：

```bash
# 1. 运行完整构建（同步资源、生成Base64、编译TS并打包 lib/client.js）
node build.js

# 2. 检查 TypeScript 类型
npx tsc --noEmit

# 3. 运行自动化单元测试
node --test tests/whale-pet.test.ts
```
