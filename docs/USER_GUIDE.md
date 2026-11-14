# 大肥鱼 User Guide

[Back to the project](../README.md) | [中文](USER_GUIDE.zh-CN.md) | [Changelog](../CHANGELOG.md)

How to install 大肥鱼 and use her day to day. Items marked **[next release]** are already in the source and ship with the next release.

- [Install, upgrade and uninstall](#install-upgrade-and-uninstall)
- [What she does on her own](#what-she-does-on-her-own)
- [Playing with her](#playing-with-her)
- [Chips above her head](#chips-above-her-head)
- [Peeking](#peeking)
- [Theatre](#theatre)
- [Live2D model (optional)](#live2d-model-optional)
- [Settings at a glance](#settings-at-a-glance)
- [Shortcuts](#shortcuts)
- [Desktop mode (preview)](#desktop-mode-preview)
- [FAQ](#faq)
- [Privacy](#privacy)

---

## Install, upgrade and uninstall

1. Download the latest `dsh-whale-pet-vX.Y.Z.zip` from [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases).
2. Extract the **whole** archive into a permanent folder such as `D:\dsh-whale-pet`. Keep the files there: DSH loads her from this folder every time it starts.
3. Double-click `install.bat` in that folder, then open DSH, or press **Ctrl + R** in a DSH window that is already open.

- **Upgrade:** extract the new version over the same folder. Your settings and an imported Live2D model are kept. If you moved the folder, run `install.bat` again from the new place.
- **Uninstall:** double-click `uninstall.bat`, then refresh DSH. Settings saved on this device are kept.
- The `installer` folder is needed by the scripts; do not delete it.
- You do not need Node.js or anything else.
- Installers from v0.1.0–v0.6.0 can fail on some Windows systems; see [installation recovery](INSTALLATION_RECOVERY.md).

## What she does on her own

- She lives inside the DSH window. When you ask something she **thinks** (bubbles above her head), **answers** (talking while the reply streams) and has a **rice break** (a bowl of rice after the answer).
- When idle she strolls, stretches, looks around and now and then changes her expression.
- At noon she reminds you about lunch; between 1 and 5 a.m. she gets sleepy while idle (heavy eyelids, slightly dimmer) to nudge you to bed. Turn both off in Settings › Companionship › Lunch & late-night reminders.
- She stays put while you type in DSH.

## Playing with her

| Action | Result |
|---|---|
| Hover over her | A quick menu above her head: Theatre, Settings, Quiet mode, Peek; Copy code when the latest answer has code |
| Click her | Opens Settings |
| Drag her | Picks her up: she struggles, dangles and swings with the pointer, then lands. With Settings open, she and the panel move together |
| Move the pointer back and forth over her head | Head pat; she looks content or shy and uses the name you set |
| Stroke her tail (Live2D) | She blushes and dodges; keep at it and she gets cross |
| Shake her while carrying her | She gets dizzy for a moment |
| Keep poking her | An easter egg |

Hold **Alt** and she turns translucent so you can click through her.

## Chips above her head

- **Pricing period:** whether it is 梁文峰 (peak) or 梁文谷 (off-peak, half price) time and when it ends. Click the chip to hear it again. Follows DeepSeek's official rule: Beijing time, weekdays 09:00–12:00 and 14:00–18:00 are peak; other hours, weekends and Chinese public holidays are off-peak.
- **Balance:** shown automatically when you are signed in to a DeepSeek account in DSH; click it for the last update or to retry. It shows “Balance —” when it cannot be read; with an API key only, DSH has no balance to show.
- **Choose what is shown:** Settings › Companionship › Above her head: both, pricing period, balance or none.
- She reminds you when the balance drops below an amount you set (Settings › Companionship; 0 turns it off).

## Peeking

When she is in the way, send her behind the right edge of the window, half out of sight:

- Choose **Peek** in the hover menu or press **Alt+P** (record another shortcut in Settings › Appearance). Press again and she returns to her spot.
- While peeking she does not stroll or chat. She cannot go while she is dizzy.
- While peeking, a small menu above her head has just **Settings | Come back Alt+P**, with the pricing period and balance below it. The full menu returns when she comes back. **[next release]**
- Settings opened while peeking: she stays at the edge and the panel opens to her left. **[next release]**
- With the Live2D model she leans out, reaching towards the window edge; without it a dedicated peeking illustration is used.

## Theatre

A full-screen, visual-novel style conversation:

- **Enter:** click the DSH chat box (turn this off in Settings › Theatre reading), press **Alt+T**, or choose Theatre in the hover menu.
- **Turn pages:** the first click reveals the rest of the current page, the next click turns it. ←/→ and Enter work too.
- **Bottom bar:** Log (messages already loaded on the page), Auto, Skip (or hold Ctrl; jumps to the last page), Hide, Expand and the ⋯ menu (sounds, reading mode, theme, language).
- **Chips at the top left:**
  - Music: three built-in tracks (Everyday Breeze, Quiet Chat, Late-night Comfort) or your own audio file.
  - Background: follow the time of day, one of four scenes, Transparent (keep DSH visible), your own picture, or a random one each time.
  - Theatre settings: text speed, size, typewriter effect, auto-advance, sounds.
- Head pats, tail strokes and pokes work in the theatre too (clicking her is a poke and does not turn the page).
- **Leave:** press **Esc** or choose Exit. With Transparent selected, clicking the background also leaves.

## Live2D model (optional)

Without a model she uses the original illustrations. With the free **DeepSeek-chan (大肥鱼) Live2D model** imported she comes alive: her eyes and head follow the pointer, her hair and skirt move with the model's physics, and she has more motions and expressions.

1. Get the model from the author's [page](https://gf.bilibili.com/item/detail/1109618072?noTitleBar=1&from=mall-up_itemDetail&msource=cps_comments_13737731_cont-1-117527753588880&track_id=__BGMT__) (art and parts by 神宫凉子; Live2D rigging by 霓虹猫_NeonNeko).
2. Extract the **whole** archive.
3. Open Settings › Character model › **Import the model folder** and choose the folder that contains `大肥鱼.model3.json` (or drop the folder onto the import card).

- The model stays on this device; the plugin neither ships nor uploads it. Normal upgrades keep the imported model; clearing app data or moving to another computer means importing again.
- Settings › Character model also sets the model size for the companion and the theatre separately, switches back to the illustrations, or removes the model.
- Please credit the model's creators when you share content made with it.

## Settings at a glance

Click her to open Settings. The panel sits beside her, never on top of her.

| Section | What is there |
|---|---|
| Appearance | Light/dark theme, interface language (中文/English), size, opacity, text size, the peek shortcut, Peek |
| Character model | Import, re-import or remove the Live2D model; model size for the companion and the theatre; use Live2D or the illustrations |
| Sound | Character sounds (muted by default), volume |
| Companionship | Quiet mode (pauses chatter, sounds and strolls), Power saving, Swaying clothes, Wander when idle, Lunch & late-night reminders, pricing announcements, your name, her nickname, Above her head, low-balance reminder, credit per bowl |
| Theatre reading | Typewriter, text speed, auto-advance, enter the theatre from the chat box |
| Interaction gallery | The interactions you have found; replay the first-run guide |
| Advanced | Answer-finished greeting, background completion notifications (asks the system for permission), Doctor compatibility check, reset to defaults |

**Power saving:** the Live2D model draws at most 30 fps, 20 while idle and 10 while you use another app. Turn it on if your fan spins up or things feel slow.

## Shortcuts

| Shortcut | Action |
|---|---|
| Alt+P | Peek / Come back (changeable in Settings) |
| Alt+T | Open/close the theatre |
| Alt+W | Hide/show her |
| Hold Alt | Click through her |
| Tab to her, then Enter | Open Settings |

In the theatre: ←/→ or Enter turn pages, hold **Ctrl** to skip, **L** log, **A** auto, **H** hide the interface, **M** sound, **Esc** closes menus first, then leaves.

## Desktop mode (preview)

> A preview; still being polished.

大肥鱼 leaves the DSH window and sits on your desktop: transparent, always on top, not in the taskbar, and clicks go through to whatever is underneath unless the pointer is on her.

- **Download and run** **[next release]:** get `dsh-whale-pet-desktop-vX.Y.Z-win-x64.zip` from [Releases](https://github.com/Ewigkeit1203/dsh-whale-pet/releases), extract it anywhere and double-click `DaFeiYu.exe`. No Node.js needed. If Windows says “Unknown publisher”, choose More info › Run anyway. Delete the folder to uninstall.
- **From source (developers):** double-click `desktop\大肥鱼桌面.vbs` in the plugin folder (no terminal window), or run `npm.cmd run desktop` (you can close the terminal afterwards).
- **Quit / hide:** right-click the small blue round icon in the system tray and choose Quit; **Alt+Shift+H** hides or shows her.
- **With DSH:** when DSH and desktop mode are both running they connect automatically. Ask something in DSH and she thinks, answers and has her rice break on the desktop too, with your balance. The first line of the tray menu, and a line under “Above her head” in her settings, show the connection.
- The desktop companion has its own settings and model; import the Live2D model once more in her settings there.

## FAQ

**She does not appear in DSH.**
Check that the extracted folder is still there and that you ran `install.bat`, then press Ctrl + R in DSH. If that does not help, see [installation recovery](INSTALLATION_RECOVERY.md).

**The balance shows “—”.**
Sign in to your DeepSeek account in DSH; with an API key only there is no balance. Click the chip to see why or to retry.

**She looks tired and a little dim late at night.**
That is the late-night reminder: between 1 and 5 a.m. she gets sleepy while idle. Turn off Lunch & late-night reminders in Settings › Companionship. If it happens during the day, check your computer's clock (dual-booting Windows and Linux often shifts it by several hours).

**Things feel slow.**
Turn on Settings › Companionship › Power saving.

**She is in the way.**
Press Alt+P to peek, hold Alt to click through her, or press Alt+W to hide her for a while.

## Privacy

- Settings stay on this device. Theatre pictures, music and the Live2D model you add stay in this browser's storage and are never uploaded.
- Chat history is never stored or sent to any extra service. Log only reads messages already loaded on the page.
- The balance is read through DSH's own account service; the plugin never touches account credentials.
- The link between desktop mode and DSH stays inside your own computer and never goes over the network.
- Completion notifications are off by default and ask for system permission only when you turn them on.

---

Unofficial community plugin; not affiliated with or endorsed by DeepSeek. [Back to top](#大肥鱼-user-guide)
