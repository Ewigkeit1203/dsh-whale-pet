# PM review implementation / PM 评审落地记录

[English](#english) | [中文](#chinese)

## English

This batch implements the first v0.4 usability pass against the supplied eight-page review. It does not claim completion of the v0.5 or v1.0 roadmap and does not alter the existing v0.3.0 GitHub release/tag.

Implemented: grouped/scrollable settings above the composer; audio/volume adjacency and disable state; reversible quiet preset; size/opacity labels; theme labels; reset; native-currency balance display and configurable bowls only for compatible currencies. Compact theatre geometry, shorter lines, capacity-based pagination, one page count, triangle progression, emphasis/headings, explicit Auto state, long/code response reveal bypass, speed and punctuation pauses, keyboard navigation. Alpha-envelope hit regions from existing assets, reading fade, docked peek, reduced-motion/visibility handling and text size. Names, opt-in completion notification, introductory tips, local selector-only Doctor, unofficial declaration and community contribution templates.

Partial or deferred: pagination uses conservative capacity estimation rather than pixel-exact rich-content measurement; tables remain plain text. Alpha envelopes are an approximation, not per-pixel alpha testing. Differential blink/mouth artwork is absent, so existing transforms remain. Today's rice usage has no verified host source and is not invented. Error-specific mood mapping, long-idle sleep/welcome, actual notifications under every host/OS, 3:1 contrast measurement and full 720px/light/dark combination checks require follow-up. Artwork rights/provenance need the maintainer's decision. Existing root-level installation aliases and historical notes are retained to avoid breaking release links.

Future: choice branches, accessories, photos, fortune/anniversaries, games and JSON dialogues (v0.5); validated character packs, imports, translations and opt-in TTS (v1.0). External WebP/lazy-loading is deferred because DSH currently provides no verified plugin asset route; retain the self-contained 11-image bundle.

## 中文

本批按 8 页评审落实 v0.4 首轮可用性改进，不代表完成 v0.5/v1.0 路线图，也未修改 GitHub 上已有 v0.3.0 发布和标签。

已实现：设置分组、内部滚动并避开输入框；音效与音量相邻、关闭时禁用；可恢复的安静预设；档位/透明度提示、主题文字、恢复默认；保留原生币种，币种相容时按可配置规则显示剩余饭量。剧场收窄缩矮、按容量分页、单页码、小三角、标题与粗体、明确自动状态、长文/代码跳过逐字、速度与标点停顿、快捷键。基于现有图片透明轮廓的点击区域、阅读淡化、贴边探头、减少动画/可见性处理、文字字号。称呼、默认关闭的完成通知、首次提示、仅含选择器的本地 Doctor、非官方声明和社区模板。

部分完成或待后续：分页使用保守容量估计，并非富文本逐像素测量；表格仍按文本显示。点击轮廓是近似而非逐像素 alpha 测试。缺少眨眼/嘴型差分，继续回退现有变换。没有核实今日用量来源，不虚构“今天吃了几碗”。错误情绪映射、久置睡眠/欢迎回来、跨系统通知实测、3:1 对比度测量和完整 720px/明暗组合验收待后续。美术权利/来源由维护者确认。保留根目录安装别名和历史说明，避免破坏已有下载说明和链接。

后续：选择支、饰品、拍照、抽签/纪念日、小游戏与 JSON 台词放入 v0.5；角色包、导入、翻译和明确同意的 TTS 放入 v1.0。DSH 没有已验证的插件资源路由，因此暂不采用外置 WebP 懒加载，保留现役 11 图自包含包。
