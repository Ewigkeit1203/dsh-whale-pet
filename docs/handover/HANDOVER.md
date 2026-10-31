# Engineering handover / 工程交接 — v0.4.0

## Core rules / 核心约定

- Unofficial DSH community plugin. Runtime uses host React/Cordis and __ModuleLoader__.
- Twelve PNGs in assets/, including the creator's Dizzy.png, are embedded in lib/client.js and assets-data.ts. Never introduce relative asset requests without a verified host route.
- During streaming use the answering pose, never rice or dizzy. Rice follows output or wandering. Short interactions must not reset reasoning/output state.
- Source views, state, helpers and CSS compile directly into the browser template through build.js. Edit source, then run the build; do not edit generated lib/client.js manually.
- Preferences stay local, audio defaults muted, history is not persisted and no extra service receives chat content.
- 普通淡化不可禁用点击；只有 data-ghost（按住 Alt）允许临时穿透。设置跟随拖拽与松手惯性，单纯改变大小不重新定位。菜单控件不随角色缩放。
- Package metadata and release notes must match the version. Docs live in docs/releases and docs/install; handover is excluded from install archives. Root entry points: install.bat / uninstall.bat.

## Validation / 验证

Run npm run build, npm run typecheck, npm test, and node --check lib/client.js. Current suite: 39 tests. scripts/package-release.ps1 generates a ZIP and SHA-256 checksum. scripts/generate-hitareas.py is a development-only Pillow helper for alpha envelopes; regenerate after replacing artwork.

## Release / 发布

Git author and committer must be Ewigkeit1203 <etern1ty061203@gmail.com>. Do not add Co-authored-by trailers. Do not overwrite existing tags or published releases. Publish preparation uses versioned drafts and uploaded ZIP/checksum files. Current visual checks include settings, light theme and expanded portrait layout; subjective sound tuning and full notification/streaming compatibility remain open to feedback.

## Follow-up / 后续

See ../PM_REVIEW_IMPLEMENTATION.md and ../GEMINI_REVIEW_IMPLEMENTATION.md for review context. No verified data source exists for daily rice usage. New facial differential artwork, TTS, character packs and larger ecosystem features remain future work. Asset rights are described in ../../ASSETS_LICENSE.md; do not invent commercial or redistribution permissions.
