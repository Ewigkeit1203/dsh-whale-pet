# Changelog / 更新日志

[English Version](#english) | [中文版本](#chinese)

---

<a name="english"></a>
## English

### [v0.8.1] - 2026-11-12

- **Balance and reminders:** five clear balance states, refresh/retry details, configurable head chips and a daily low-balance reminder. Answers completed while DSH is in the background can mark the title and greet you once when you return; reminders can be disabled.
- **Getting started:** a three-step guide beside her, a local interaction gallery and a clearer Live2D import card with the model download link, progress and folder drop support.
- **Installer layout:** double-click the root install.bat or uninstall.bat. Their required PowerShell helper is in installer/; keep that folder with the package. Legacy root-level helper layouts remain supported.


- **Account and interaction fixes.** Invalidate both balance sources and late replies on account changes; retry a silent account stream and clear cancelled-read timers. Quota notices now require an explicit error row from an observed current turn. Repeated tail strokes stay shy with a tail-specific request for a break; actual pokes retain their own reaction. Reject invalid discovery dates and cancel pending answer greetings when reminders are off. Restore the referenced tail screenshot and remove unused compiled tail experiments.

- **Balance reads recover from failed replies.** A fulfilled DSH call can contain a failure result. Handle those failures as well as rejected requests, leave loading, retain earlier amounts as stale and retry with backoff. Reset backoff only after a valid reply.

### [v0.8.0] - 2026-11-11

- **Peek from the right edge.** Peek in the hover menu (beside Quiet mode, with its shortcut shown) or **Alt+P**, which can be re-recorded in Settings, sends her behind the right edge of the window, half out of sight and clear of the conversation and the composer; press again and she returns to her previous spot. Peeking pauses wandering and chatter. Bottom peeking, automatic edge selection and their settings are gone; retired saved values are ignored. Pointer motion and scrolling no longer fade her.
- **The peeking arm stays in one piece (Live2D).** The upper arm stays nearly straight and only the elbow bends; the forearm tucks in under the upper arm, which is drawn over its top end, so no block sticks out at the elbow and the upper arm is never bent. The reaching arm is drawn in front of her hair and torso, with its puff sleeve and shoulder ruffle over the upper arm. Leaving the edge, the arm returns first and every mesh offset and draw-order change is undone exactly.
- **New illustrations without Live2D.** Being picked up (arms up, feet off the ground) and peeking around the right edge. The illustration walks to the edge first and only then turns into the peeking picture, upright and flush with the window edge, clear of the corner toolbar.
- **Chips always visible.** The pricing period and your balance stay above her head; an unreadable balance shows “Balance —” instead of an empty chip.
- **Too dizzy to move.** While she is dizzy from shaking, Peek shows a short notice instead.
- **Fix: choppy after a long idle (Live2D).** The frame budget measured whole frames while physics catches up in fixed 60 Hz steps, so slow background frames looked expensive and kept her at 15 fps even after you came back. Frame cost is now measured per step and re-measured when DSH regains focus.
- **Power saving** (Settings › Companionship): the Live2D model draws at most 30 fps, 20 while idle and 10 while DSH is in the background.
- **No more hand on the hip.** The hand-on-hip idle moment and the hand on her hip while thinking are removed; the hand swung round from behind her.
- **She swims across instead of sliding (Live2D).** When wandering she lifts off, keeps her legs together, and leans her whole figure into the direction of travel in proportion to her speed, head first and feet trailing, with her head and body turned the same way and a slow bob; hair, skirt and tail trail through the physics. On arrival she lands with a soft knee bend. No front-facing marching; no change to how the widget moves on screen.
- **Less like a puppet (Live2D).** Head, body and arms now follow their targets as damped springs: every move starts from rest and eases in instead of starting at full speed, the head settles with a small overshoot, and the arms ease without overshooting. In conversation, arm moves and nods are drawn at up to 60 fps when frames are cheap on the machine; idling alone keeps the ambient frame budget.
- **Fix: long idle pieces went still after two seconds.** A fade helper dropped to zero in the middle of a piece, so playing with the foxtail, humming, looking around and the others only moved at their start and end. They now hold for their whole length.
- **Idling with more life (Live2D).** New small moments: a longer look out of the window, a shake of her hair, a look down at her skirt with a little turn. Two longer pieces: gazing out of the window with a sigh, and nodding off three times before shaking herself awake. Pieces follow the time of day (sleepy ones at night, a yawn in the morning, window gazing in the afternoon, humming in the evening) and never repeat within two. Left alone for minutes (sooner at night) she gets drowsy; moving the pointer, typing or touching her wakes her with a start. Quiet with reduced motion; no extra timers.
- **She stops standing at attention during a chat (Live2D).** While you type she listens: looks at the input box, leans in and nods when you pause. While the model reasons she perks up, then looks aside, changes sides and hums to herself. While it answers she talks in phrases, with a nod or a tilt at the end of each and her weight moving from side to side, and she rounds the answer off with a nod and a smile. Widget and theatre; semantic inputs only; quiet with reduced motion; no extra timers and no higher ambient frame rate. Typing is detected by time and position only: the text is never read, focus is not touched and Enter is not intercepted.

### [v0.7.0] - 2026-11-10

- **Installer recovery and checked downloads.** Audit all eight historical ZIPs; add an installer-only repair archive, preserve old runtime files, and run Windows build, launcher and archive smoke checks before publishing the exact verified downloads. Explain optional Live2D import and storage across upgrades.

- **Stable clicks and leg cushioning.** Ignore drag jitter below 10 CSS px and preserve the original grab offset instead of snapping a body click to the collar. Suspended knees move inward with slightly relaxed lower legs; landing uses a small knee bend with planted soles, replacing Live2D whole-image squash. Remove the extra landing pulse and release slide. Local mesh offsets restore exactly before every Core update, use fixed buffers and keep clipping masks synchronized; no model reimport is needed. 155 tests, build and strict type checks pass. Real-model geometry and static poses were checked; interactive DSH/GPU acceptance remains pending because window-control initialization still fails.

- **Correct arm arcs and collar pickup.** Calibrate the full hand path on the original model: screen-left raises clockwise, screen-right counterclockwise, and lowering retraces the same outward arc. Replace the inner long turn with the short positive forearm range. Four stages now share a pure carry controller: lift/stretch, short struggle, relaxed hanging and drop/landing compression. The collar remains the rotation pivot, a small ground cue fades/shrinks, and fast re-grabs preserve the full rotated/scaled image. Long-hold release no longer raises the arms again. 147 tests and strict type checks pass; real-model geometry was checked, but interactive visual/GPU acceptance is pending because the local window-control tools failed to initialize.

- **Gentler travel and expressive hands.** Wandering uses a small lateral glide instead of front-facing marching. Carrying bends both elbows with soft hand motion and head counterbalance; it no longer kicks or pumps the hips. Rapid re-grabs use the visible position, preserve the image when the pivot changes, and discard stale queued drag frames. Dragging overrides landing/wandering transitions and temporarily skips the blurred shadow; hit-test bounds/order are reused.
- **Respect her space.** Clicking the visible Live2D chest makes her blush, cover up and ask the player to stop. Works in the widget and theatre, has a cooldown, and never treats a drag as a chest click or advances dialogue. Hands covering the chest intercept the hit normally. No additional model files or imports are needed. Current validation: 147 passing tests, build and strict type checks; hardware frame-time profiling is still outstanding.

- **Stable size controls and carrying.** Size changes keep the settings panel fixed and grow the character beside it from her feet. Carrying uses calibrated arm animation inputs and head counterbalance, with a soft release and no extra kicking.
- **Desktop idle budget.** Long idle performances stay at the ambient 30 fps budget; brief gesture transitions, reactions and dragging can still use 60. Separate the pacing clock from elapsed animation time to avoid double-counting frame remainder on high-refresh screens. Index motion curves once instead of rescanning/allocating per frame; remove a redundant framebuffer query. Validation: 147 tests, including a three-minute runtime simulation and five-minute timing simulations; real GPU frame-time profiling remains outstanding.

- **Reliability and idle cost.** Stop animation-frame requests while hidden or detached, release expired decoded bitmaps, and rebuild lost WebGL contexts instead of reusing a failed model. Older imports now explain how to enable missing gestures. Fix the pnpm build-policy placeholder and make uninstall back up the profile while preserving neighbouring plugin entries. Validation: 131 Node tests plus isolated installation/package checks.
- **Live2D size and movement.** Separate saved desktop/theatre model size sliders (60–200%, default 120%/115%); theatre size is also adjustable from its settings. Desktop geometry fits the viewport.
- **Live2D motion that reads as alive.** Head, body, hips, legs, hair and skirt are now moved by the model's own physics (the tracking inputs VTube Studio would send), so turns and sways are actually visible. Her eyes reach the pointer first, the head follows and the body follows the head; after a few still seconds she goes back to her own business. While idle she occasionally shifts her weight, leans in, stretches, glances aside, tilts her head or takes a deep breath, with 6–15 s rests and never the same thing twice in a row. Touch reactions: a small startle when poked, a dip into a head pat, a huff when frustrated, a nod for an idea. The author's own hand gestures play in and out and hold while needed: hand on chest after an answer, a raised finger for an idea, the foxtail when smug. Models imported earlier keep working and use the old finger toggle; import the folder again to get the gestures. Reduced motion keeps her still.
- **She keeps herself busy.** After about 45 s of quiet idling with nobody moving the pointer, she plays a longer piece every minute or so: the author's own idle animation for the model (the one VTube Studio plays when tracking is lost), playing with the foxtail, looking around, dozing off and jerking awake, a big stretch and yawn, humming and swaying, or a hand on her chest and a smile. Moving the pointer or touching her stops it at once. The author's animation needs the model folder imported again.
- **Her tail is sensitive.** Stroke her tail (Live2D model) and she blushes, squeezes her eyes shut and dodges away from your hand, looking back at it; keep doing it and she gets cross. Only the visible tail counts, not the parts hidden behind her legs or skirt.
- **Touch in the theatre.** Head pats, tail touches and pokes now work in the theatre too, with her mood mark above her head. Clicking her is a poke and does not turn the page; the dialogue box, the backdrop and the keyboard still do.
- **Touch polish.** A head pat no longer makes her raise a hand to her chest; carried, she hangs from her collar, flaps her paws for a moment, then gives up and dangles, swinging behind your hand; let go and she drops, squashes on landing and complains she is dizzy (no more hands folding back); a chest touch covers with one hand only.
- **Pick her up.** Dragging her lifts her a little and she swings around her collar pivot, swinging behind your hand and settling after you let go. She is startled at first and flustered if you hold on (“P-put me down!”); with the Live2D model her head tries to stay upright, both elbows bend and her hands lift, and she lands with a small squash. Works with the illustrations too; reduced motion turns the swing off.
- **Smoother animation.** While a hand gesture, a touch reaction or a drag is moving, or while she is following the pointer, the model draws at up to 60 fps when this computer can afford it; slow idling stays at 30. The theatre draws at up to 60. Frames are now paced evenly on 120/144 Hz screens.
- **Release ZIP cleanup.** Remove the 18 obsolete lib/assets PNG copies and omit duplicate source assets from release archives; development originals, npm asset exports and all embedded fallback illustrations are retained. Added checksum, archive-content and isolated-install smoke checks.
- **Live2D model (optional).** Import the free DeepSeek-chan (大肥鱼) Live2D model in Settings › Character model and she moves for real: breathing, blinking, hair and tail physics, and a mouth that moves while text appears. Her states use the model's own switches: a loading spinner while thinking, a raised finger for an idea, the steel bowl for a rice break, swirly eyes when dizzy, blushing, a dark face when frustrated, and more. It works on the desktop and in the theatre. The original illustrations stay the default until a model is imported, return whenever the switch is off, and are used if WebGL or the runtime is unavailable.
- **The model is not included.** Its terms do not allow redistributing the files, so download it from the author (神宫凉子) and pick its folder. Only the files she needs are kept, in this device's browser storage; 4096 px textures are scaled to 2048 px on import. Only this model is accepted, because her expressions are made for it. Credits: art and parts 神宫凉子, Live2D rigging 霓虹猫_NeonNeko.
- **Runtime.** The official Live2D Cubism Web Framework 5-r.5 and Cubism Core 6.0.1 are embedded and only start once a model is shown (about 450 KB). To stay light on the CPU the model renders at 30 fps on the desktop, 60 fps in the theatre, 15 fps while DSH is in the background and not at all while hidden. Clicks follow her outline, so the empty corners of her box reach DSH.
- **Lighter while streaming.** Theatre pages are measured once per character instead of re-measuring every line for every new piece of text, and only while the theatre is open. In a 10-second streamed answer the plugin's script time fell from about 880 ms to about 110 ms.
- **Lighter while idle.** The overlay no longer re-renders every second (only while a model is working, otherwise every 15 s and exactly when a pricing period or announcement changes); the pricing period and its label are computed once per minute; the host page is re-read only after it changes. Pointer moves anywhere in DSH no longer wake the companion.
- **Swaying clothes at 30 fps** (15 fps while DSH is in the background, and not redrawn at all when reduced motion keeps her still): about 45% less drawing, with the same look.
- **Cleanup.** Removed the unused blink, gaze and mouth-oscillation timers from the state machine, the old `mad` pose alias and other unused functions, a duplicated animation and an unused style, the build's copy of the artwork into `lib/assets` (about 25 MB nobody read), the build's sync from the author's old desktop folder, and 7.7 MB of image data from the generated type declarations. Scene and music validation now share one list with the preferences.
- Tests: 155 pass (cleanup removed three tests of deleted code and added an idle-notification check; Live2D motion adds gaze, idle-event, performance, gait, pulse, dodge, gesture, touch, carry and import checks).

### [v0.6.0] - 2026-11-01

- **Swaying clothes.** Each illustration is drawn as a WebGL mesh whose skirt, hair ends and tail sway gently below the waist; the face and upper body are never deformed and the portrait does not follow the pointer. Hair is found by colour and the weights are blurred so the mesh bends like cloth. Turn it off in Settings › Companionship; without WebGL or with reduced motion she falls back to the still image.
- **Six new expressions** (smug, shy, frustrated, surprised, proud, happy). In the theatre each page sets her expression like a visual novel, with a small hop and a mood mark above her head (♥ ✦ ♪ 💧 ! ? 💢). Daily life uses them too: head pats (proud or shy), finished answers, pricing-period announcements, low balance and occasional idle glances.
- **Easter egg.** Poke her a few times in a row and she gets puzzled; keep going and she gets frustrated.
- **Visual-novel polish (Senren＊Banka-inspired).** Characters fade in one by one; a whale-tail click-wait mark ends each line; expressions crossfade; backgrounds can follow the time of day (café by day, seaside at dusk, the study at night; now the default).
- **Smaller download.** Artwork is embedded as WebP when it matches the current PNG (scripts/optimize-assets.py), so the browser bundle shrinks from 18.9 MB to about 7.6 MB despite six more illustrations.
- **Theatre chips no longer cover the DSH title bar** (Application / Edit menu); expanded reading keeps clear of the window controls.
- **Theatre scenes (Background Switcher).** Four backgrounds painted in code (study at night, server room, afternoon café, seaside dusk), Transparent (shows DSH) and your own picture. The next picture is decoded before two layers crossfade over 0.7 s on a scene-coloured base, so switching never flashes white. Optional shuffle on every visit; ambient particles and a slow camera drift per scene.
- **Background music (Audio Manager).** Three tracks performed live with Web Audio by a look-ahead sequencer (Everyday Breeze · F major 104 BPM, Quiet Chat · C major 80 BPM, Late-night Comfort · lo-fi 70 BPM), so they loop seamlessly and add nothing to the download. Your own audio file is decoded once and looped sample-accurately. Play/pause, previous/next, a perceptual volume slider and crossfades between tracks; music fades in on entry and fades out on exit or when the page is hidden, then the audio device is suspended. Page hide/unload closes it immediately.
- **Visual-novel dialogue.** Deep-blue glass box with a gradient name tag and glossy edge; larger centred portrait with a fade-in, breathing and scene-tinted floor light. A bottom system bar holds the input and Log, Auto, Skip, Hide, Expand, ⋯ and Exit. Skip (or hold Ctrl) finishes the page and races to the last one.
- **Theatre HUD.** Music, background and settings chips at the top left with panels for tracks, volume, scene cards, uploads, text speed, text size and toggles. Escape closes an open menu first and now works from any focused control.
- **Persistence.** Scene, shuffle, music on/off, track and volume are saved with the other preferences; your picture and music are kept in IndexedDB on this device and restored on the next visit.
- **Performance.** Painted scenes become short blob URLs once; under an opaque scene the host chat's blur filter is dropped.
- Tests: 107 pass (cloth-sway weights, poke easter egg, expressions, scenes, sequencer scheduling and fades, media validation, preferences, theatre panels, Skip and background-click behaviour).

### [v0.5.2] - 2026-10-31

- Stabilize settings height and placement across window/fullscreen changes; randomize stroll waits (8–20s) and destinations across the host viewport; only occasionally eat after a stroll.
- Clarify contribution review, owner-approved releases, consistent AI artwork and authorized sources.

### [v0.5.1] - 2026-10-31

- Follow-up: restore visible wandering travel with frame-synchronized movement and destinations relative to the current position.

- Limit automatic theatre entry to the composer text editor; attachment, permission, model and other composer controls keep their native actions.
- Give theatre and widget distinct React root identities so exiting restores the pet in place rather than animating the backdrop into the widget.
- Added regression coverage for composer controls, mode restoration, wandering routes and frame scheduling; 88 tests pass.

### [v0.5.0] - 2026-10-31

- Added real DSH screenshots of the companion and independent light/dark settings to the bilingual README.

- **Balance without opening settings.** When DSH provides its account service, 大肥鱼 reads the balance the same way DSH's own account card does: on start, every minute, when you return to the window and after each answer. It clears at once when you sign out. The plugin never touches credentials. Unread amounts show as —, never ¥0.00, and older values are marked “not live”.
- **梁文峰 / 梁文谷 time.** A chip above her head shows the current DeepSeek API pricing period and when it ends, in your local time. She tells you “现在是梁文峰时间！” or “现在是梁文谷时间！” when DSH opens and at every switch. Peak: Beijing time, weekdays 09:00–12:00 and 14:00–18:00; weekends and Chinese public holidays are off-peak at half price. You can turn this off in Settings › Companionship.
- **Settings never cover her.** The panel stays beside the character with a fixed gap, switches sides smoothly at screen edges, and opens as a separate panel in very narrow windows. Wandering pauses while it is open.
- **Rebuilt settings.** A fixed header and scrolling body, a balance card, a pricing-period card and a roomy footer. The footer note no longer crowds the buttons.
- **Consistent portraits.** Every pose is calibrated to the same head size and foot line, so 撒娇 no longer looks smaller and changing pose no longer moves her.
- **Your name, everywhere.** Her lines now use the name you set instead of “你”.
- **Smoother.** Dragging, hovering and streaming do far less work, so fast drags with settings open no longer stutter.
- **New character voice.** Soft speech blips follow the text as it appears, with pauses at punctuation. It stops promptly when output stops, never replays missed text and skips code. Still muted by default.
- **Theatre.** The header is regrouped, expanded reading keeps her face visible, reading surfaces are clearer, and full reading only scrolls with new text while you are at the bottom.
- **Fresh look.** Light and dark themes were rebuilt. Keyboard access to the character and visible focus states were added.
- Chibi form switching is paused for now; its artwork is kept. If you were using the chibi form, the portrait is shown instead.

### [v0.4.0] - 2026-10-31

- Restored borderless size dots, added a live-value continuous text-size slider, roomier settings and clearer light-theme selections.
- Repositioned the portrait in expanded reading and removed the rectangular stage halo. Added the original Dizzy.png as the twelfth embedded illustration for shake reactions.

- Fixed faded pet interaction and tethered settings during dragging; added explicit Alt click-through and Alt+W/T shortcuts.
- Expanded/full-width theatre, measured line wrapping, upward More menu, separate settings scrolling, themed scrollbars, clickable size dots and inline code.
- Moved guides, release notes and handover under docs/, removed duplicate installers and unused source artwork, and updated packaging and contributor credits.

- Grouped settings, reversible quiet mode, text/size labels, names, optional completion notifications and local Doctor diagnostics.
- Compact theatre, single page count, keyboard controls, adaptive page capacity, emphasis, reveal speed and punctuation pauses.
- Approximate alpha hit regions, reading fade, docked peek and reduced-motion/visibility handling.
- Added unofficial declaration, artwork-permission clarification and contribution templates.

### [v0.3.0] - 2026-10-30

#### Added
- Chinese/English menus and companion prompts; independent light/dark glass themes with sun/moon controls. The host DSH theme is unaffected.
- Persistent language, theme, form, position, wandering, reading and sound preferences; character opacity and a five-stop snapping size slider with circular marks and a stronger default mark.
- Native Web Audio character voice during response output and text reveal, plus inspiration, touch and rice-break sounds. Audio is opt-in, with mute, volume, soft envelopes, low-pass filtering and short phrase pauses; no audio downloads.
- Typewriter reveal: click once to finish the current page and again to advance. Previous-page navigation, full-text reading, automatic progression, loaded-message history and Hide/restore mode.
- Safe text/code cards, preserved code fences and one-click copying in the theatre and pet toolbar.
- Head-pat hearts, fast-drag dizziness, bounded release inertia and buoyancy using the existing 11 illustrations.
- Optional lunch and late-night reminders, verified low-balance hints and elapsed generation time. Token speed appears only when explicitly exposed by DSH.

#### Improved
- Simplified theatre controls to Log, Auto, More and Exit; moved less-used options into a readable glass menu.
- Kept settings fixed while resizing the character; moved speech closer and switched its side near the left edge. Added outside-click/Escape dismissal and reduced-motion support.
- Compiled React views, state and host integration directly into the self-contained browser template; skipped unchanged compiler outputs and atomically replaced the browser bundle.

#### Fixed
- Delayed wandering callbacks interrupting reasoning/output, stale idle debounce, inactive-user timing and blink callbacks surviving unload.
- Repeated page scans caused by the pet's own animations, reasoning leaking into response extraction and nested-markdown duplication.
- Chinese IME Enter accidentally sending, drafts disappearing without a valid send button, controlled-input synchronization, drag cancellation on blur and false clicks after a drag returns to its start.
- Thought scrolling pulling users away from older content they are reading.

#### Validation and limits
- Build, type checking, bundle syntax and 30 automated tests passed; theatre controls, More menu and fixed-panel resizing checked in DSH.
- History contains only messages already loaded on the current page. Preferences stay in local storage; history is not persisted by this plugin.
- DOM integration depends on DSH markup; elapsed time begins when generation is detected. No token-rate estimate is fabricated when host metrics are missing.
- Subjective sound quality and complete end-to-end model streaming still need broader real-use feedback.

### [v0.2.0] - 2026-10-30

#### Added
- **Modular Expression & Pose Architecture**:
  - `Maid.png`: High-definition full standing portrait of the Whale Maid.
  - `DaFeiYu.png`: Chibi miniature badge form.
  - `Answering.png`: Dedicated active answering pose during model response generation (`isStreaming = true`), accompanied by respiratory animation and lip-sync oscillation.
  - `baifan.png`: White rice eating pose. Plays for ~4.5 seconds after content output finishes (`isStreaming: true -> false`), and plays for ~3.5 seconds after wandering movement stops. Strictly never displayed during active response streaming.
  - `getit.png`: Inspiration lightbulb pose. Spliced into the later stage of reasoning and occasionally during thinking cycles.
  - `sajiao.png`: Pouting and sajiao expression. Triggered for 2 seconds on click without breaking ongoing reasoning or output; triggered for an extended duration (9 seconds) with lonely dialogue lines after 60 seconds of user inactivity.
  - `Think1.png` to `Think5.png`: Five distinct thinking poses randomly cycled with non-fixed variable durations (2.0s - 3.8s) and non-fixed sequences during Chain-of-Thought reasoning.
- **Inactivity Detection & Interaction Reset**:
  - Automatically triggers a longer sajiao routine if left unattended for 60 seconds.
  - Any mouse click, drag, or composer typing immediately wakes up the character and returns to normal state.

#### Changed
- **Response Generation Flow**: Clean separation between reasoning, answering, and post-output rice eating phases.
- **Build System**: Automatically synchronizes expressions from local asset folders and inlines all 11 poses into self-contained Base64 Data URIs.
- **Documentation**: Clean bilingual documentation with no emojis across README, release notes, and user guides.

#### Fixed
- Fixed state machine transition edge cases during quick interruptions.
- Fixed wandering completion behavior to ensure peaceful eating pause upon arrival.

---

### [v0.1.0] - 2026-10-29

#### Added
- Initial release of DeepSeek Little Whale Maid for DeepSeek Harness (DSH).
- Dual character forms: Maiden standing portrait and Chibi form.
- Independent comic thought bubble for Chain-of-Thought streaming with scrolling support.
- Real-time dual balance toolbar (Topped-up balance and Granted balance).
- GalGame dialogue theater mode with sentence/paragraph pagination and click-to-advance progression.
- One-click install and uninstall batch scripts (`install.bat`, `uninstall.bat`).

---

<a name="chinese"></a>
## 中文版本

### [v0.8.1] - 2026-11-12

- **余额与提醒：** 五种明确的余额状态、详情与刷新/重试入口、可配置头顶标签和每日低余额提醒。后台完成回答后可标记标题，回来时提醒一次，也可关闭。
- **上手与导入：** 三步引导移到角色身旁，新增本机互动图鉴；Live2D 导入卡提供获取链接、进度和文件夹拖放。
- **安装目录整理：** 只需双击根目录 install.bat 或 uninstall.bat；必需的 PowerShell 辅助脚本放在 installer/，请保留该文件夹。启动器仍兼容旧版根目录脚本布局。


- **账户与互动修复。** 账户变化时清理两种余额来源并丢弃旧回复；账户通知无响应时超时重试，取消读取时清理计时器。余额不足提示只响应当前任务的明确错误节点。连续摸尾巴保持害羞、单独提示休息，真实戳人的反馈保留。过滤异常图鉴日期，关闭提醒时取消待提醒。补回引用的尾巴截图并清理已撤回的摆尾编译文件。

- **修复余额一直加载。** DSH 请求正常返回但内容是失败结果时，也会结束加载、保留上次余额并标注非实时，按退避间隔重试；只有解析成功才重置重试间隔。

### [v0.8.0] - 2026-11-11

- **从右边探头。** 点悬停菜单里的「探头」（在安静模式旁边，显示快捷键）或按 **Alt+P**（可在设置里重新录制），她会躲到窗口右边，只探出半个身子，不挡对话和输入框；再按一次回到原来的位置。探头时不散步、不闲聊。底部探头、自动选边及对应设置已移除，旧偏好值会被忽略。鼠标移动、滚动不再让她变透明。
- **探头的手臂连成一体（Live2D）。** 大臂几乎保持笔直，只在手肘弯；小臂收进大臂下面，由大臂盖住小臂顶端，手肘不再凸出一块，大臂本身也不会被拉弯。伸出的手臂画在头发和身体前面，泡泡袖和肩膀荷叶边盖在大臂上方。离开边缘时手臂先复原，所有顶点偏移和绘制顺序都会完全还原。
- **没有 Live2D 时的新插图。** 被拎起来（双手举高、脚够不着地）和从右边框探头。插图模式下她先走到边上，再换成探头插图，正立贴齐窗口边缘，不挡右下角工具条。
- **头顶常显**计费时段和余额；读不到余额时显示“余额 —”，不再是空白小框。
- **晕了没法动。** 被晃晕时点探头，会提示“大肥鱼现在晕了，没法动呢……”。
- **修复：挂机久了一直卡（Live2D）。** 帧预算按整帧耗时计算，而物理按 60 Hz 固定步长追赶，后台低帧率时每帧显得很贵，回到 DSH 后仍被压在 15 帧。现在按每步耗时计算，并在 DSH 重新获得焦点时重新测量。
- **省电模式**（设置 › 陪伴）：Live2D 模型最高 30 帧，待机 20 帧，DSH 在后台时 10 帧。
- **去掉叉腰。** 删除待机时的叉腰和推理时的叉腰，原来手会从背后绕过来，很别扭。
- **游荡改成“游过去”，不再平移滑行（Live2D）。** 游荡时她轻轻离地、双腿并拢，整个人按移动速度朝前进方向倾斜（头在前、脚拖后），头和身体也转向那边，带缓慢起伏；头发、裙摆、尾巴由物理拖尾。到位后屈膝轻落地。没有朝屏幕的踏步；桌宠在屏幕上的移动方式不变。
- **不再像木偶（Live2D）。** 头、身体、手臂改用带阻尼的弹簧跟随目标：每个动作从静止缓缓起步，不再一上来就是最大速度；头部到位时有很小的回弹，手臂缓动但不过冲。聊天时手臂移动和点头在机器负担低的情况下最高 60 帧；独自待机仍保持原有帧率预算。
- **修复：长待机表演两秒后就不动了。** 一个淡入淡出函数在表演中段掉到零，导致玩狗尾草、哼歌、东张西望等只在开头和结尾动一下。现在整段都保持。
- **待机更有生活感（Live2D）。** 新的小动作：看一会儿窗外、甩甩头发、低头看裙摆并轻轻转身。两段更长的表演：望着窗外发呆叹气、困得连点三次头再甩头清醒。表演跟着时段走（深夜犯困、早上打哈欠、下午看窗外、晚上哼歌），最近两段不重复。长时间没人理（深夜更快）会慢慢犯困；动鼠标、打字或摸她会让她一下子醒过来。减弱动效时安静；不增加计时器。
- **聊天时不再“罚站”（Live2D）。** 你打字时她在听：看向输入框、身体前倾，停顿时点头。推理时先回神，再看向一旁、隔几秒换边、自己轻轻点头。回答时按句子节奏说话：每句末尾点头或歪头，重心左右转换；回答完点头微笑收尾。桌宠和剧场都有；只写语义输入；减弱动效时安静；不增加计时器，也不提高平时帧率。打字只记录时间和输入框位置：不读内容、不碰焦点、不拦回车。

### [v0.7.0] - 2026-11-10

- **安装修复与发布检查。** 核对八个历史 ZIP，新增仅替换安装工具的修复小包，保留旧版运行文件；发布前在 Windows 构建并验证启动器、实际压缩包和解压后安装，只上传已检查的包。说明 Live2D 可选导入及正常升级保留本机模型。

- **点击稳定与腿部缓冲。** 10 CSS px 内的拖动抖动不触发拎起，真实拖动保留原抓取偏移，取消点身体后强制归拢光标造成的下移。悬空时膝盖内并、小腿稍展开；落地轻微屈膝、脚底留在地面，替代 Live2D 整图挤压，并取消额外落地脉冲和松手滑动。局部网格每次 Core 更新前精确还原，复用固定缓冲并同步裁剪蒙版，无需重新导入模型。155 项测试、构建和严格类型检查通过；真实模型几何与静态姿态已检查，窗口工具仍无法初始化，DSH 动态观感及 GPU 帧耗时待验收。

- **手臂轨迹与后领悬挂。** 用原模型网格校准完整路径：屏幕左臂顺时针抬起、右臂逆时针，放下各自反向沿同一侧回落；正向小臂短弧替代绕身体内侧的负向长弧。四阶段统一到纯悬挂控制器：上提拉伸、短暂挣扎、放松垂挂、下落触地压缩；后领作为旋转支点，地面提示缩小变淡，快速再抓取保留旋转／缩放后的完整画面。修复长时间悬挂后松手反而再次抬臂。147 项测试与严格类型检查通过；真实模型网格已校准，窗口控制工具启动失败，交互观感和 GPU 帧耗时尚未验收。

- **轻移与手部表现。** 游荡改为轻微侧向漂移，去掉正面踏步；拎起时双肘弯曲抬手，保留上身反应，不再蹬腿或大幅晃动骨盆。快速再抓取从可见位置接手、补偿旋转中心变化、不消费上一轮拖动的排队帧；拖动优先于游荡／落地缓动，暂时停用模糊阴影，复用命中检测数据。
- **胸部点击反应。** 点击 Live2D 可见胸部时脸红、抬手遮挡并提醒“请不要碰这里”。桌宠与剧场均可触发，有冷却；从胸部拖动不会误触，剧场不会翻页，遮住胸部的手正常拦截命中。无需新增模型文件或重新导入。当前 147 项测试、构建和严格类型检查通过；仍未完成真实硬件帧耗时对比。

- **缩放与拎起修正。** 调节大小时固定设置面板，角色在面板旁以脚部附近为锚点缩放；拎起使用校准后的手臂动画输入和头部反向补偿，不额外蹬腿，松手平滑回落。
- **桌宠待机负载。** 长待机表演保持桌宠 30 帧预算，短手势过渡、触摸和拖拽仍可到 60 帧。动画时间与帧率调度分开，修正高刷新率下时间余量重复计入；动作曲线一次建立索引，避免逐帧扫描和临时数组，移除冗余帧缓冲查询。147 项测试通过，含 3 分钟运行循环与 5 分钟计时模拟；尚未完成真实 GPU 帧耗时分析。

- **稳定性与闲置开销。** 隐藏／离开视图时停止动画帧请求，解码缓存到期显式释放位图，丢失 WebGL 上下文后重新创建模型。旧导入缺少手势时提示重新导入；修复 pnpm 构建策略占位配置，卸载前备份并保留同组其他插件。验证：131 项 Node 测试及隔离安装／打包检查。
- **Live2D 大小与动作。** 桌宠／剧场各自保存模型大小（60–200%，默认 120%／115%），剧场设置可直接调整；桌宠放大后仍限制在窗口内。
- **Live2D 动得更像活的。** 头、身体、胯、腿、头发和裙摆改由模型自带的物理驱动（相当于 VTube Studio 送进去的追踪输入），转头和摆动终于看得出来了。看鼠标时眼睛先到、头随后、身体再跟着头转；鼠标停住几秒后她就回去做自己的事。待机时偶尔换脚调整重心、往前探、伸个懒腰、往旁边瞄一眼、歪头或深呼吸，每次间隔 6–15 秒，不会连续重复同一个。触摸反馈：被戳时吓一小跳，摸头时把头低下来蹭，抓狂时哼一声别过脸，想到点子时点头。作者做的原生手势会完整地进入、保持、退出：回答完抚胸，灵光一闪竖手指，得意时拿出狗尾草。以前导入的模型照常可用，仍用旧的竖指开关；重新导入一次文件夹即可启用原生手势。减弱动效时保持静止。
- **待机久了会自己找事做。** 安静待机约 45 秒、也没人动鼠标后，她大约每一分钟演一段：作者为模型做的待机动画（VTube Studio 丢失追踪时播放的那段）、摆弄狗尾草、东张西望、打瞌睡后猛然惊醒、伸懒腰打哈欠、闭眼哼歌摇摆，或抚胸微笑。一动鼠标或碰她就立刻停下。作者的待机动画需要重新导入一次模型文件夹。
- **尾巴很敏感。** 摸她的尾巴（Live2D 模型），她会脸红、闭紧眼睛，从你的手边躲开并回头看；一直摸她会生气。只算看得见的尾巴，藏在腿和裙子后面的部分不算。
- **剧场里也能互动。** 剧场中同样可以摸头、摸尾巴和戳她，头顶会出现情绪符号。点她算戳，不会翻页；对话框、背景和键盘照常翻页。
- **触摸细节修正。** 摸头不再抬手抚胸；拎起时从后领吊起，先举着小爪子扑腾，过一会儿放弃挣扎垂下来、跟着你的手摆；松手后先落下、触地一蹲，再抱怨头晕（不再像手折到背后）；点胸只用一只手捂住。
- **可以把她拎起来。** 拖动时她会被轻轻提起，围绕后领挂点、跟在手后面摆动，松手后慢慢停稳。一开始是吓一跳，拎久了会害羞着急（“放、放我下来啦！”）；Live2D 模型下头会努力保持正，双肘弯曲、抬手轻动，落地时轻轻一蹲。插图模式同样会摆动；减弱动效时不摆。
- **动画更顺滑。** 手势过渡、触摸反应、拖动进行时，或她正跟着鼠标看时，只要这台电脑负担得起，模型最高 60 帧；平静待机仍是 30 帧。剧场最高 60 帧。120/144 Hz 屏幕上的帧间隔也更均匀了。
- **安装包精简。** 清除 lib/assets 的 18 份废弃 PNG 副本，发布 ZIP 不再重复打包源码 assets；开发原图、npm 素材导出和全部内嵌插图回退保留。新增校验和、包内容和隔离安装检查。
- **Live2D 模型（可选）。** 在 设置 › 角色模型 中导入免费的 DeepSeek-chan（大肥鱼）Live2D 模型后，她会真正动起来：呼吸、眨眼、头发和尾巴的物理摆动，文字出现时嘴巴跟着动。各种状态使用模型自带的开关：思考时头上转加载圈，灵光一闪竖起食指，吃饭时顶上大钢盆，眩晕是圈圈眼，还有脸红、抓狂黑脸等。桌宠和剧场都生效。未导入模型时仍默认使用原版插图；关闭开关、或 WebGL / 运行库不可用时也会自动回到插图。
- **插件不附带模型。** 模型的使用须知不允许重新分发文件，请从作者（神宫凉子）的发布页下载，然后选择模型文件夹。插件只保留需要的文件，存在本机浏览器存储里；导入时把 4096 像素的贴图缩小到 2048。只接受这个模型，因为她的表情是按它设计的。署名：原画及拆分 神宫凉子，Live2D 建模 霓虹猫_NeonNeko。
- **运行库。** 内嵌官方 Live2D Cubism Web Framework 5-r.5 与 Cubism Core 6.0.1（约 450 KB），显示模型时才启动。为了不占太多 CPU，桌宠 30 帧、剧场 60 帧，DSH 在后台时 15 帧，页面隐藏时停止。点击范围跟随她的轮廓，外框里的空白处仍可以点到 DSH。
- **流式输出更省。** 剧场分页改为每个字符只测量一次宽度，不再每来一段文字就把每一行重新测一遍；而且只在剧场打开时才分页。一段 10 秒的流式回答，插件脚本耗时从约 880 毫秒降到约 110 毫秒。
- **空闲更省。** 界面不再每秒整体重绘（只在模型工作时每秒更新，平时每 15 秒一次，并在计费时段或播报到点时准时更新）；计费时段与标签每分钟只计算一次；宿主页面只在变化后才重新读取。在 DSH 任意位置移动鼠标不再唤醒桌宠。
- **裙摆飘动改为 30 帧**（DSH 在后台时 15 帧，减弱动效时静止不重绘）：绘制量减少约 45%，观感不变。
- **代码清理。** 删除状态机里已不再使用的眨眼、视线与嘴型振荡计时器，旧的 `mad` 姿态别名和其他无人调用的函数，一处重复定义的动画和一个无用样式；构建不再把插图复制进 `lib/assets`（约 25 MB，没有任何地方读取），不再从作者旧桌面目录同步原图，生成的类型声明去掉 7.7 MB 图片数据。场景和曲目校验与偏好设置共用同一份列表。
- 测试：155 项通过（清理时删除了 3 个只测已删代码的测试，新增空闲通知检查；Live2D 动作新增注视、待机事件、待机表演、步态、触摸反馈、躲闪、原生手势、触摸识别、拎起与导入检查）。

### [v0.6.0] - 2026-11-01

- **裙摆飘动。** 每张立绘以 WebGL 网格绘制，腰部以下的裙摆、发梢和尾巴轻轻摆动；脸和上半身不会变形，也不跟随鼠标。头发按颜色识别，权重经过模糊，像布料一样弯曲而不撕裂。可在 设置 › 陪伴 中关闭；不支持 WebGL 或开启减弱动效时自动使用静态图。
- **六个新表情**（得意、害羞、抓狂、惊讶、满足、开心）。剧场里像 GalGame 一样逐页换表情，伴随小跳和头顶情绪符号（♥ ✦ ♪ 💧 ! ? 💢）。日常也会用到：摸头（满足或害羞）、回答完成、峰谷播报、余额偏低以及偶尔的闲置小表情。
- **小彩蛋。** 连续戳她几下她会疑惑，一直戳下去她就会抓狂。
- **GalGame 打磨（参考千恋＊万花）。** 文字逐字淡入；每句结尾有鲸尾点击提示；表情切换交叉淡入；背景可跟随时间（白天咖啡厅、黄昏海边、夜晚书房，现为默认）。
- **体积更小。** 立绘在与当前 PNG 一致时以 WebP 内嵌（scripts/optimize-assets.py），即使多了六张图，运行包仍从 18.9 MB 降到约 7.6 MB。
- **剧场按钮不再遮挡 DSH 标题栏**（Application / Edit 菜单）；大屏阅读避开窗口按钮。
- **剧场场景（背景切换）。** 四套由代码绘制的背景（和室书房·夜、科技机房、午后咖啡厅、海边黄昏）、「透明」（显示 DSH）和「我的背景」。下一张图先解码，再在场景底色上用两层 0.7 秒交叉淡入，切换不会闪白。可设为每次进入随机换一张；每个场景带环境粒子与缓慢的镜头漂移。
- **背景音乐（音频管理）。** 三首曲目由 Web Audio 前瞻调度器实时演奏（日常轻快 · F 大调 104 BPM、宁静闲聊 · C 大调 80 BPM、深夜治愈 · Lo-fi 70 BPM），天然无缝循环，也不增加下载体积。本地音乐只解码一次，按采样精确循环。支持播放/暂停、上一首/下一首、符合听感的音量条以及曲目间交叉淡化；进入剧场淡入，退出或页面隐藏时淡出，随后挂起音频设备；页面隐藏/卸载时立即关闭。
- **GalGame 对话框。** 深蓝毛玻璃、渐变名字标签与高光描边；立绘更大并居中，带淡入、呼吸和随场景着色的脚下光晕。底部系统栏包含输入框以及回顾、自动、快进、隐藏、大屏、⋯ 与退出。「快进」（或按住 Ctrl）会立即显示完当前段并快速翻到最后一段。
- **剧场 HUD。** 左上角的音乐、背景、设置小按钮，面板内有曲目、音量、场景卡片、上传、文字速度、字号与开关。Escape 优先关闭打开的菜单，并且在任何控件获得焦点时都能使用。
- **自动保存。** 场景、随机、音乐开关、曲目和音量与其他偏好一起保存；你的图片和音乐保存在本机 IndexedDB，下次打开自动恢复。
- **性能。** 绘制场景只生成一次短 blob 地址；不透明场景下去掉宿主聊天区的模糊滤镜。
- 测试：107 项通过（裙摆飘动权重、戳戳彩蛋、表情、场景、调度与淡入淡出、文件校验、偏好、剧场面板、快进与背景点击行为）。

### [v0.5.2] - 2026-10-31

-稳定设置面板在窗口/全屏间的高度与位置；散步等待 8～20 秒随机、目的地覆盖宿主窗口可用区域，结束后仅偶尔吃饭。
- 明确贡献审查、负责人确认发布、AI 美术形象统一与素材授权要求。

_暂无。_

### [v0.5.1] - 2026-10-31

- 自动进入剧场仅响应文字输入区；添加文件、权限、模型等控件保留原生操作。
- 剧场与桌宠使用独立 React 根节点标识，退出时原地恢复，不再从屏幕中央滑回。
- 新增控件触发、模式恢复、散步路线与分帧调度回归检查，共 88 项测试通过。

### [v0.5.0] - 2026-10-31

- 双语 README 新增桌宠与独立明暗设置的 DSH 实拍截图。

- **不用打开设置也能看到余额。** DSH 提供账户服务时，大肥鱼按 DSH 自带账户卡片的方式读取余额：启动时一次，之后每分钟、回到窗口时和每次回答结束后各刷新一次；退出登录后立即清空。插件不接触任何凭据。未读取显示 —，不会显示成 ¥0.00；旧数据会标注“非实时”。
- **梁文峰 / 梁文谷时间。** 头顶小标签显示当前 DeepSeek API 计费时段和结束时间（按本机时间）。打开 DSH 时和每次时段切换时，她会告诉你“现在是梁文峰时间！”或“现在是梁文谷时间！”。高峰：北京时间工作日 9:00–12:00、14:00–18:00；周末和法定节假日为空闲时段，价格减半。可在 设置 › 陪伴行为 中关闭。
- **设置面板不再挡住她。** 面板始终贴在角色旁边并保持间距；到屏幕边缘会平滑换到另一侧；窗口太窄时改为独立面板。设置打开期间暂停游荡。
- **设置面板重做。** 固定标题和可滚动正文，新增余额卡片和计费时段卡片；底部说明与按钮不再挤在一起。
- **立绘大小一致。** 每个姿态都按同样的头部大小和脚底位置校准，撒娇不再显小，切换姿态时她也不会移位。
- **处处使用你的称呼。** 台词里原本直接写“你”的地方，现在都用你设置的称呼。
- **更流畅。** 拖动、移动鼠标和流式输出时的计算量大幅减少，打开设置时快速拖动不再卡顿。
- **新的人物音效。** 随文字出现发出轻柔的说话音，遇到标点会停顿；输出停止后很快安静，不补播漏掉的内容，代码不发声。仍默认静音。
- **剧场。** 顶部按钮重新分组，大屏阅读时能看到她的脸，阅读区域更清晰；完整阅读模式只在你停留在底部时才跟随新文字滚动。
- **全新外观。** 明暗主题重新设计；角色支持键盘操作，并有清晰的焦点提示。
- Q 版切换暂时关闭，素材保留；之前使用 Q 版的用户会显示普通立绘。

### [v0.4.0] - 2026-10-31

- 恢复无框大小圆点，字号改为带实时数值的连续滑条，放宽设置间距并加强浅色选中态。
- 大屏模式重新布置立绘，移除矩形分层光晕；加入原始 Dizzy.png，成为第 12 张内嵌角色图，用于摇晃眩晕反馈。

- 修复淡化后无法操作和拖拽时菜单分离；增加明确的 Alt 穿透与 Alt+W/T 快捷键。
- 扩容/全宽剧场、按测量行宽分页、向上更多菜单、独立设置滚动、主题滚动条、可点击档位圆点与行内代码。
- 指南、发布说明、交接迁入 docs/，移除重复安装脚本与未引用旧图，同步打包与贡献者。

- 设置分组、安静模式恢复、字号、称呼、完成通知和本地 Doctor。
- 缩矮剧场、单页码、快捷键、按容量分页、粗体、速度与标点停顿。
- 近似透明轮廓、阅读淡化、贴边探头与减少动画。
- 非官方声明、授权说明与投稿模板。

### [v0.3.0] - 2026-10-30

#### 新增
- 中英文菜单和陪伴提示；太阳/月亮切换的独立明暗毛玻璃主题，不影响 DSH 主题。
- 保存语言、主题、角色、位置、游荡、阅读及音效设置；支持透明度和五档吸附大小滑条，圆点刻度、中间默认档加粗。
- 回答输出及逐字显示期间持续的人物说话音，以及顿悟、点击和干饭短音。原生 Web Audio 合成，默认静音，可调音量，使用低通滤波、柔和包络与短句停顿，无需下载音频。
- 逐字显示：第一次点击补全当前段，第二次点击推进；上一段、完整阅读、读完自动显示下一段、已加载问答回顾，以及隐藏/恢复界面。
- 安全文本与代码卡片、保留代码围栏，剧场和桌宠工具栏支持一键复制代码。
- 摸头爱心、高速拖拽眩晕、有限惯性与浮力回弹，复用现役 11 张插画。
- 可关闭的午饭/熬夜提醒、读取到真实余额后的不足提示、生成耗时；仅在 DSH 明确提供时显示 token 速度。

#### 优化
- 剧场顶部收简为回顾、自动、更多、退出；低频操作收进清晰的毛玻璃菜单。
- 缩放角色时设置面板大小与位置固定；台词气泡靠近角色并按位置换边。支持点击外部/Escape 关闭设置及减少动态效果偏好。
- 界面、状态机和宿主适配器从源码直接编译到自包含运行模板；跳过未变更编译输出，原子替换浏览器运行包。

#### 修复
- 散步延迟回调抢占思考/回答、过期待机防抖、闲置计时失效，以及卸载后眨眼回调残留。
- 桌宠自身动画引发页面重复扫描、推理内容混入回复及嵌套 Markdown 重复提取。
- 中文输入法回车误发送、发送按钮不可用时草稿丢失、受控输入框同步、失焦拖拽不释放及拖回原点误触点击。
- 查看较早思考内容时被自动滚动强制拉回底部。

#### 验证与边界
- 构建、类型、运行包语法和 30 项自动测试通过；已在 DSH 检查剧场顶部、更多菜单和固定面板缩放。
- 历史回顾仅包含当前页面已加载消息；偏好保存在本地，插件不持久化聊天历史。
- 页面适配依赖 DSH 的 DOM 标记；耗时从检测到生成开始计算，缺少宿主指标时不伪造 token 速度。
- 音色主观听感和完整模型流式链路仍需要更广泛的实际使用反馈。

### [v0.2.0] - 2026-10-30

#### 新增特性
- **模块化动作与表情体系（收录于 assets 与本地素材目录）**：
  - `Maid.png`：高清少女女仆全身立绘。
  - `DaFeiYu.png`：可爱迷你 Q 版形态。
  - `Answering.png`：专属回答姿态，在模型正式输出回答时播放（`isStreaming = true`），伴随口型张合与呼吸律动。
  - `baifan.png`：大铁盆大口吃白米饭插画。在回答输出完毕后播放约 4.5 秒补充能量，游荡停下后也会停下来吃两口（输出过程中严格不播放干饭图）。
  - `getit.png`：灵光一闪灯泡顿悟动作，在思考末期及思考过程中以约 20% 概率短暂穿插。
  - `sajiao.png`：托腮鼓腮撒娇动作。点击大肥鱼触发短撒娇（2秒后自动恢复原状态，不干扰思考或回答）；60秒长时间未互动触发长撒娇并呼唤主人陪陪她，任何交互均可立即解除唤醒。
  - `Think1.png` 至 `Think5.png`：五套专属思考动作，在思考推理全过程中以不固定随机时间（2.0秒 - 3.8秒）和不固定随机顺序轮换。
- **长时间未互动陪伴机制**：
  - 待机 60 秒未操作时自动触发孤单撒娇台词与动作。
  - 用户进行任何鼠标点击、拖拽或输入框输入均可即刻重置计时器并唤醒复原。

#### 优化调整
- **回复流程规范化**：严格分离推理中、回答生成中、输出完毕干饭三阶段，状态层次分明。
- **编译打包自动化**：一键脚本自动同步本地素材，并将全部 11 种姿态编译为 Base64 内嵌于单文件客户端中。
- **文档规范化**：全套中英文双语对照说明，去除所有冗余 Emoji 表情。

#### 缺陷修复
- 修复状态切换时的抖动与打断问题，确保点击交互不会冲掉推理和回答状态。
- 修复游荡停靠结束时的动作衔接，漫步完成后平滑停下吃米饭补充能量。

---

### [v0.1.0] - 2026-10-29

#### 新增特性
- 专为 DeepSeek Harness (DSH) 客户端打造的深海小鲸女（大肥鱼）首发版本。
- 少女立绘与迷你 Q 版双形态自由切换。
- 独立漫画思考气泡，支持上下滚动回看完整深度思考全过程（CoT）。
- 头顶常驻显示当前账号真实的充值余额与赠金余额。
- GalGame 对话模式：底部大剧场对话框，智能段落分页排版，点击逐段翻页推进。
- 提供一键自动安装脚本（`install.bat`）与卸载脚本（`uninstall.bat`）。
