# Gemini review follow-up / Gemini 评审跟进

[English](#english) | [中文](#chinese)

## English

Implemented against the provided PRD: visual fading remains interactive; Alt alone temporarily enables click-through, Alt+W toggles pet visibility and Alt+T toggles theatre. Settings follow drag/release movement while remaining stable during size changes. The toolbar is hidden while Settings is open. Settings have a fixed header and separately scrolling body, language-consistent labels, segmented choices and clickable size dots alongside the snapping slider.

Theatre uses the full body width, an expanded reading toggle, measured-width line wrapping, a consistent inset, upward-opening More menu and unified theme scrollbars. Stage feet fade behind the panel. Inline code, emphasis and paragraphs are rendered safely. Chatter can be closed or clicked to enter theatre. History entries can be copied.

Repository release notes, plain-text guides and handover now live under docs/. Duplicate installer aliases and unused legacy source artwork were removed. Packaging follows the new paths and excludes handover notes. Existing v0.3.0 tags/drafts have not been overwritten.

Deferred: recorded/natural voice replay is unavailable because audio is synthesized syllables, not TTS. No fabricated voice recording or new external service was added. New gesture/notification/formatting combinations still benefit from broader DSH testing. No new artwork or claims about ownership were introduced.

## 中文

依据本次 PRD 已实现：普通淡化仍可点击和拖拽；单独按住 Alt 临时穿透，Alt+W 显隐桌宠，Alt+T 切换剧场。设置跟随拖拽与松手滑行，调整大小时保持稳定；设置打开时隐藏工具栏。设置改为固定标题和独立滚动正文，文案统一语言，采用分段选择和可点击圆点，同时保留吸附滑条。

剧场释放正文宽度，增加大屏阅读，按测量行宽分页，统一边距；更多菜单向上展开，滚动条统一主题。立绘脚部在面板后渐隐。安全显示行内代码、粗体和段落。闲聊气泡可关闭或点击进剧场，历史条目可复制。

发布说明、纯文本指南和交接迁入 docs/；删除重复安装别名和未引用的旧素材。打包路径已同步，并排除工程交接。未覆盖既有 v0.3.0 标签或草稿。

待后续：当前声音是合成音节，不是 TTS，不能声称支持自然语音/录音重播；未伪造语音或接入额外服务。新增手势、通知和富文本组合仍需更广泛 DSH 验证。未增加素材或擅自扩大美术授权。
