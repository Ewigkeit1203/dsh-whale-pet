# DeepSeek Little Whale Maid (dsh-whale-pet)

[English](#english) | [中文说明](#chinese)

---

<a name="english"></a>
## English

DeepSeek Little Whale Maid (`dsh-whale-pet`) is an interactive desktop pet and Visual Novel (GalGame) conversational stage plugin developed for the official [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) desktop and web clients.

### Key Features

- **Dual Character Forms**: Seamlessly toggle between the full-height Maiden Standing Portrait and the compact Chibi badge.
- **Independent Comic Thought Bubble**: Chain-of-Thought (CoT) reasoning is loaded into a dedicated, scrollable thought bubble positioned beside the character's head, preserving visibility of both the character and dialogue box.
- **Dynamic 4-Pose Thinking Rotation**: During model inference, the character smoothly cycles through 4 distinct poses every 3.2 seconds: Pondering, Cheeks Puffed, Puzzled in Thought, and Idea Inspiration (Lightbulb).
- **Joyful Rice Eating Animation**: When the model begins outputting its response, the character automatically switches to the festive white rice eating illustration (`baifan2.png`).
- **Visual Novel (GalGame) Dialogue Progression**: A wide dialogue theater at the bottom formats and paginates long responses, allowing readers to advance through text sentence-by-sentence with a single click.
- **Real-Time Dual Balance Display**: Directly reads and displays live account balances across the top toolbar, showing both Topped-up balance and Granted balance.
- **Interactive Touch Reaction with Animation Safeguard**: Clicking or poking the character triggers a gelatin bounce animation and a temporary pouting expression, automatically resuming ongoing thinking or eating animations after 2 seconds without interruption.
- **Zero-Dependency One-Click Installation**: Packaged with automated install and uninstall scripts (`install.bat`, `uninstall.bat`). All character graphics are Base64-inlined into the bundle, ensuring offline reliability without network latency or 404 errors.

### Quick Start & Installation

#### Method 1: One-Click Automated Script (Recommended)
1. Download `dsh-whale-pet.zip` from [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) and extract all files to a local directory (e.g. `D:\dsh-whale-pet`).
2. Run `install.bat`.
3. Open DeepSeek Harness, or press `Ctrl + R` in an existing DSH window to refresh. The pet will appear in the bottom-right corner.

#### Method 2: Manual Profile Configuration
Add the following lines to `~/.dsh/profiles/desktop/cordis.patch.yml`:
```yaml
- insert:
    - id: dsh-whale-pet
      name: "file:///D:/your/path/dsh-whale-pet/lib/index.js"
```
Save the file and refresh DeepSeek Harness via `Ctrl + R`.

#### Uninstallation
Run `uninstall.bat` to cleanly remove the plugin configuration, then refresh DSH with `Ctrl + R`.

### Interaction Reference

| User Action | Triggered Behavior | Notes |
| :--- | :--- | :--- |
| **Mouse Hover** | Reveal Toolbar | Displays live Topped-up and Granted balances; provides form toggle and dialogue stage buttons. |
| **Click / Poke** | Pouting Reaction | Plays a 2-second playful reaction, then returns to the active animation cycle. |
| **Mouse Drag** | Free Repositioning | Move the pet anywhere on screen. Wandering timers are locked during drags to prevent positional jumps. |
| **Click Composer / Dialogue Button** | Enter GalGame Mode | Center stage layout with comic thought bubble, paginated text box, and backdrop dismiss. |

### Development & Build

```bash
# Install development dependencies
npm install

# Compile TypeScript and inline assets into lib/client.js
node build.js

# Run test suite
node --test tests/whale-pet.test.ts

# Type checking
npx tsc --noEmit
```

### Contributors

- **Ewigkeit1203** - Project Creator, Character Design & Direction
- **Antigravity (Google DeepMind)** - AI Pair Programmer, Architecture & Engineering

### License

This project is licensed under the [MIT License](LICENSE). Character illustrations copyright belongs to their respective creator.

---

<a name="chinese"></a>
## 中文说明

DeepSeek 小鲸女（"大肥鱼"）是专为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 官方客户端打造的高互动性活体桌宠与 Visual Novel / GalGame 沉浸式对话插件。

### 核心特性

- **双形态自由切换**：支持「少女女仆立绘」与「迷你Q版」双形态，在悬停工具栏中一键切换。
- **独立漫画思考气泡**：深度推理全过程（Chain-of-Thought）装载于角色头旁的独立漫画气泡中，支持上下平滑滚动回看完整思路，绝不遮挡角色与对话框。
- **4姿态动态思考轮播**：推理期间每隔 3.2 秒自动轮换托腮思考、鼓起腮帮、苦思混乱云、灯泡顿悟四大动作，活灵活现。
- **干饭动画联动**：大模型正式输出回复时，角色自动切换为大口吃白米饭插画（`baifan2.png`）。
- **GalGame 剧场文字分页推进**：底部大对话框装载正式回复文本，智能分页排版，点击文本框即可如视觉小说一般逐段翻页推进。
- **实时双额度常驻展示**：头顶横条常驻读取并显示当前账号真实的【充值余额（Topped-up balance）】与【赠金余额（Granted balance）】。
- **点击撒娇互动与状态保护**：点击角色触发果冻跳动与眨眼托腮撒娇表情（2秒后自动恢复原状态，绝不打断思考或干饭）。
- **零依赖一键安装**：随包提供 `install.bat` 与 `uninstall.bat`，所有素材 Base64 本地内嵌编译，不依赖外部网络与独立环境。

### 快速安装与使用

#### 方式一：一键自动安装（推荐）
1. 从 [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) 下载 `dsh-whale-pet.zip` 并完整解压到本地文件夹（例如 `D:\dsh-whale-pet`）。
2. 双击运行文件夹内的 `install.bat`（或 `一键安装.bat`）。
3. 打开 DeepSeek Harness 客户端（若已打开，在软件内按 `Ctrl + R` 刷新），桌宠即可就绪。

#### 方式二：手动配置
用记事本打开 `C:\Users\<你的用户名>\.dsh\profiles\desktop\cordis.patch.yml`，在文件末尾追加：
```yaml
- insert:
    - id: dsh-whale-pet
      name: "file:///D:/你的实际路径/dsh-whale-pet/lib/index.js"
```
保存后在 DSH 中按下 `Ctrl + R` 刷新生效。

#### 卸载方式
运行文件夹内的 `uninstall.bat`（或 `一键卸载.bat`），在 DSH 中按 `Ctrl + R` 刷新即可无残留恢复原版。

### 交互操作速查

| 操作 | 触发效果 | 说明 |
| :--- | :--- | :--- |
| **鼠标悬停** | 展开状态工具条 | 显示当前实时充值余额、赠金余额，呼出形态切换与对话模式入口 |
| **鼠标点击/戳戳** | 撒娇互动 | 触发 Q 弹果冻动效与托腮眨眼表情，2秒后自动恢复当前进行中的状态 |
| **鼠标按住拖拽** | 自由移动位置 | 随心停靠在屏幕边缘任意角落，拖拽期间锁定游荡定时器防止瞬移冲突 |
| **点击输入框 / 对话模式** | 进入 GalGame 剧场模式 | 角色舞台居中，展开独立思考气泡与大容量剧场对话框，点击空白处即可退出 |

### 本地开发与编译

```bash
# 安装开发依赖
npm install

# 编译 TypeScript 并将 assets/ 转换为 Base64 内嵌至 lib/client.js
node build.js

# 运行自动化测试套件
node --test tests/whale-pet.test.ts

# 类型检查
npx tsc --noEmit
```

### 贡献者与致谢

- **Ewigkeit1203** - 项目发起人、人设原案与产品设计
- **Antigravity (Google DeepMind)** - AI 结对编程、架构实现与工程调优

### 开源许可证

本项目基于 [MIT License](LICENSE) 开源。插画版权归原作者所有。
