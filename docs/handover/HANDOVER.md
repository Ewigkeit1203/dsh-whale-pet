# Engineering handover / 工程交接 — v0.4.0

## Current assignment / 当前分工（2026-10-31）

Ewigkeit1203 owns feature decisions. Claude Opus 5.5 owns frontend design and implementation, including interaction geometry, pose calibration and character sound. Codex owns backend/host integration, data contracts, state reliability and build tooling. No separate backend server is currently implemented.

请先读 [Opus 前端交接需求](OPUS_FRONTEND_HANDOFF.md)及[余额数据接入计划](BALANCE_INTEGRATION.md)。它们记录当前待办，不是已完成清单。用户已明确授权暂时禁用 Q 版切换并保留素材；入口已隐藏，旧 chibi 偏好在前端渲染为普通立绘（`features.ts`），正式偏好迁移由 Codex 确认。产品名称统一为“大肥鱼”，保留包名 `dsh-whale-pet`；不再使用 Little Whale 作为品牌，界面中的旧称呼由 Opus 一并替换。

Frontend F01–F08 are implemented but unreleased (see the status table in the frontend handoff). Settings and pet now share one group layout (`layout.ts`) with edge tests. Startup balance acquisition still depends on opening DSH account settings; no verified host account adapter exists yet.

## Core rules / 核心约定

- Unofficial DSH community plugin. Runtime uses host React/Cordis and __ModuleLoader__.
- Twelve PNGs in assets/, including the creator's Dizzy.png, are embedded in lib/client.js and assets-data.ts. Never introduce relative asset requests without a verified host route.
- During streaming use the answering pose, never rice or dizzy. Rice follows output or wandering. Short interactions must not reset reasoning/output state.
- Source views, state, helpers and CSS compile directly into the browser template through build.js. Edit source, then run the build; do not edit generated lib/client.js manually.
- Preferences stay local, audio defaults muted, history is not persisted and no extra service receives chat content.
- 普通淡化不可禁用点击；只有 data-ghost（按住 Alt）允许临时穿透。设置与角色需要整体边界约束，空间不足时使用独立面板并暂停游荡，详见前端 F02。菜单控件不随角色缩放；缩放后仍须检查碰撞。
- Package metadata and release notes must match the version. Docs live in docs/releases and docs/install; handover is excluded from install archives. Root entry points: install.bat / uninstall.bat.

## Validation / 验证

Run npm run build, npm run typecheck, npm test, and node --check lib/client.js. Current suite: 75 tests. scripts/package-release.ps1 generates a ZIP and SHA-256 checksum. scripts/generate-hitareas.py is a development-only Pillow helper for alpha envelopes; regenerate after replacing artwork.

## Release / 发布

Git author and committer must be Ewigkeit1203 <etern1ty061203@gmail.com>. Do not add Co-authored-by trailers. Do not overwrite existing tags or published releases. Publish preparation uses versioned drafts and uploaded ZIP/checksum files. Current visual checks include settings, light theme and expanded portrait layout; subjective sound tuning and full notification/streaming compatibility remain open to feedback.

## Follow-up / 后续

See ../PM_REVIEW_IMPLEMENTATION.md and ../GEMINI_REVIEW_IMPLEMENTATION.md for review context. No verified data source exists for daily rice usage. New facial differential artwork, TTS, character packs and larger ecosystem features remain future work. Asset rights are described in ../../ASSETS_LICENSE.md; do not invent commercial or redistribution permissions.
