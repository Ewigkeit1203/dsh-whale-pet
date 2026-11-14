/**
 * Mounts the pet and keeps the window click-through except where she is. Loaded after lib/client.js.
 */
(function () {
  'use strict'
  var desktop = window.__whaleDesktopShell, vendor = window.__WhaleDesktopReact, bridge = window.whaleDesktop
  var root = document.getElementById('whale-desktop-root')
  function missing(text) {
    var note = document.createElement('div')
    note.id = 'whale-desktop-missing'
    note.textContent = text
    document.body.appendChild(note)
    if (bridge) bridge.setInteractive(true)
  }
  if (!vendor) { missing('缺少 desktop/vendor/react.js。请在插件目录运行 npm install，再运行 npm run build。'); return }
  if (!desktop.plugin) { missing('没有找到 lib/client.js。请先在插件目录运行 npm run build。'); return }
  document.documentElement.dataset.whaleDesktop = 'true'
  desktop.plugin.apply(desktop.context)
  if (!desktop.render) { missing('大肥鱼没有挂载成功（shell.overlay 没有注册）。'); return }
  var render = desktop.render
  function Overlay() { return render() }
  vendor.createRoot(root).render(vendor.React.createElement(Overlay))

  // ---- click-through --------------------------------------------------------------------------
  // The window ignores the mouse and only forwards moves. While the pointer is on something of hers
  // that takes pointer events (her body's hull, a chip, a panel), the window takes the mouse instead.
  var interactive = false, pressed = false, focused = false, theatreOpen = false
  // Her theatre is opened on purpose (tray, shortcut, menu), so it may take the keyboard: Enter, Esc and
  // typing a question work right away. Closing it gives the keyboard back to the user's own window.
  desktop.theatre = function (open) {
    theatreOpen = Boolean(open)
    if (theatreOpen !== focused) { focused = theatreOpen; if (bridge) bridge.setFocus(theatreOpen) }
    // The open theatre covers the screen and takes the whole mouse; closed, only she does again.
    setInteractive(theatreOpen)
  }
  function hers(x, y) {
    if (theatreOpen) return true
    var element = document.elementFromPoint(x, y)
    return Boolean(element && element !== document.documentElement && element !== document.body && element !== root)
  }
  function setInteractive(next) {
    if (next === interactive) return
    interactive = next
    if (bridge) bridge.setInteractive(next)
  }
  function typing(element) {
    return Boolean(element && element.closest && element.closest('input, textarea, select, [contenteditable="true"]'))
  }
  // Forwarded moves arrive for every pixel the mouse crosses anywhere on the desktop: hit-test at most
  // once per frame, on the latest position.
  var pending = null, scheduled = 0
  function hitTest() { scheduled = 0; var at = pending; pending = null; if (at && !pressed) setInteractive(hers(at.x, at.y)) }
  window.addEventListener('mousemove', function (event) {
    if (pressed) return
    pending = { x: event.clientX, y: event.clientY }
    if (!scheduled) scheduled = window.requestAnimationFrame(hitTest)
  }, true)
  window.addEventListener('pointerdown', function (event) {
    pressed = true
    // Keyboard focus only for fields she shows (settings) and while her theatre is open; otherwise the
    // user's own window keeps it.
    var wanted = theatreOpen || typing(event.target)
    if (wanted !== focused) { focused = wanted; if (bridge) bridge.setFocus(wanted) }
  }, true)
  function released(event) { pressed = false; pending = null; setInteractive(hers(event.clientX, event.clientY)) }
  window.addEventListener('pointerup', released, true)
  window.addEventListener('pointercancel', released, true)
  // The pointer left the window (another display): let clicks through again.
  document.addEventListener('mouseleave', function () { pending = null; if (!pressed) setInteractive(false) })
  window.addEventListener('blur', function () { focused = false })

  if (bridge) bridge.onCommand(function (command) {
    if (command === 'settings') window.dispatchEvent(new Event('dsh-whale-pet:open-settings'))
    else if (command === 'theatre') window.dispatchEvent(new Event('dsh-whale-pet:toggle-theatre'))
  })
})()
