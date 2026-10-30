# DeepSeek Whale Maid ("大肥鱼") 🐋🍚

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: DeepSeek Harness](https://img.shields.io/badge/Platform-DeepSeek%20Harness-cyan.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![Version: v0.1.0](https://img.shields.io/badge/Release-v0.1.0-brightgreen.svg)](https://github.com/Ewigkeit1203/dsh-whale-pet/releases)

专为 **DeepSeek Harness (DSH)** 官方客户端打造的高互动性活体桌宠与 Visual Novel / GalGame 沉浸式对话插件。

---

## ✨ 核心特性

- 🐋 **双形态自由切换**：支持「精美少女女仆立绘」与「圆滚滚包子脸迷你Q版」双形态，悬停菜单一键切换。
- 💭 **漫画独立思考气泡**：深度推理全过程装载在角色头旁的独立漫画气泡中，支持上下平滑滚动回看完整思考脉络，绝不遮挡角色。
- 🎭 **4姿态动态思考轮播**：推理过程中每隔 3.2 秒自动在「托腮沉思」、「鼓起腮帮」、「苦思混乱云」、「灯泡顿悟」四大动作之间平滑轮换，活灵活现。
- 🍚 **爱心闪光干饭动画**：模型正式开始输出回复时，自动掏出大铁盆切换为开心地大口吃白米饭插画（`baifan2.png`）。
- 📖 **GalGame 剧场文字推进**：底部大对话框装载大模型正式回复，自动排版分页，点击文本框即可逐段推进阅读。
- 💰 **实时双额度常驻展示**：头顶横条常驻读取显示当前账户的真实【充值余额（Topped-up balance）】与【赠金余额（Granted balance）】。
- 💖 **灵动互动与动画保护**：戳戳角色触发 Q 弹果冻动画与眨眼托腮撒娇表情（2秒后自动恢复原动画状态，绝不打断思考或干饭）。
- 🚀 **零依赖一键安装**：包含 `install.bat` 与 `uninstall.bat`，所有素材 Base64 本地内嵌编译，不依赖网络与外部 Node.js 环境。

---

## 📦 快速安装使用

### 方法 1：一键安装（推荐，只需 5 秒）
1. 从 [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases) 下载 `dsh-whale-pet.zip` 并解压到电脑任意固定目录（如 `D:\dsh-whale-pet`）。
2. 双击运行文件夹内的 **`install.bat`**（或 `一键安装.bat`）。
3. 打开 DeepSeek Harness 客户端（若已打开，直接在软件窗口按 `Ctrl + R` 刷新），大肥鱼便会出现在屏幕右下角！

### 方法 2：手动配置
用记事本打开 `C:\Users\<你的用户名>\.dsh\profiles\desktop\cordis.patch.yml`，在末尾添加：
```yaml
- insert:
    - id: dsh-whale-pet
      name: "file:///D:/你的路径/dsh-whale-pet/lib/index.js"
```
保存后在 DSH 软件中按下 `Ctrl + R` 即可生效。

### 卸载说明
随时双击文件夹中的 **`uninstall.bat`**（或 `一键卸载.bat`），按 `Ctrl + R` 刷新即可 100% 无残留恢复原版界面。

---

## 🎮 操作指南

| 动作 | 触发行为 | 说明 |
| :--- | :--- | :--- |
| **鼠标悬停** | 展开状态工具条 | 显示当前实时充值余额、赠金余额，呼出形态切换与对话模式按钮 |
| **鼠标点击/戳戳** | 撒娇互动 | 触发 Q 弹果冻动效与托腮眨眼表情，2秒后自动恢复当前状态 |
| **鼠标按住拖拽** | 自由移动位置 | 随心所欲停靠在屏幕边缘任意角落，拖拽期间锁定游荡定时器防冲突 |
| **点击输入框 / 对话模式** | 进入 GalGame 剧场模式 | 舞台居中，展开漫画思考气泡与大容量剧场对话框，点击空白处即可退出 |

---

## 🛠️ 本地开发与二次构建

如果你希望自行修改插画或扩展逻辑：

```bash
# 安装依赖
npm install

# 编译 TypeScript 并重新将 assets/ 转换为 Base64 嵌入 lib/client.js
node build.js

# 运行自动化测试套件 (11 项单元测试)
node --test tests/whale-pet.test.ts

# 类型检查
npx tsc --noEmit
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。
插画版权归原作者所有。
