/**
 * 大肥鱼 desktop companion (PM v0.9 4A, milestone 1): one transparent, always-on-top, click-through window
 * covering the work area of a display, with the same pet bundle (lib/client.js) that runs inside DSH.
 *
 * Run with `npm run desktop`. Nothing here ships a model: she is imported in her own settings, as in DSH.
 */
const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, screen, shell } = require('electron')
const path = require('node:path')
const { createLinkServer } = require('./link-server.cjs')

const HIDE_SHORTCUT = 'Alt+Shift+H'
const THEATRE_SHORTCUT = 'Alt+Shift+T'
const DESKTOP_PROTOCOL = 'dsh-whale-pet'
const requestedFromDsh = argv => argv.some(arg => /^dsh-whale-pet:\/\/show\/?$/i.test(arg))
const registerProtocolOnly = process.argv.includes('--register-whale-protocol')
/** Tray and global shortcut: open (or close) her theatre, so a question can be asked without opening DSH. */
function openTheatre() {
  if (!win) return
  showCompanion()
  win.webContents.send('whale-desktop:command', 'theatre')
}
let win = null
let tray = null
let quitting = false
/** Whether she should be on screen; the page is always told this, never the window's momentary state. */
let wanted = true
/** The DSH link (roadmap step 2): DSH's page posts her status here. */
let link = null
function sendLink(message) { if (win) win.webContents.send('whale-desktop:link', message) }
function linkLine() {
  const s = link ? link.state : null
  if (!s || !s.started) return 'DSH：正在准备连接… / Starting'
  if (s.port === null) return 'DSH：本机端口都被占用，连不上 / Link unavailable'
  if (s.connected) return `DSH：已连接（端口 ${s.port}）/ Connected`
  return `DSH：未连接（等待中，端口 ${s.port}）/ Waiting` + (s.rejected ? `  · 上次拒绝 ${s.rejected}` : '')
}

if (!registerProtocolOnly && !app.requestSingleInstanceLock()) { app.quit() }
app.on('second-instance', (_event, argv) => showCompanion(requestedFromDsh(argv)))

/** A small round blue icon, drawn here so the companion needs no image file of its own. */
function trayIcon() {
  const size = 32, pixels = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5), i = (y * size + x) * 4
    const alpha = d < 13 ? 255 : d < 14.5 ? Math.round(255 * (14.5 - d) / 1.5) : 0
    const light = d < 13 && y > 17 && Math.hypot(x - 15.5, y - 30) < 13
    // BGRA
    pixels[i] = light ? 0xf4 : 0xe0; pixels[i + 1] = light ? 0xe8 : 0x8c; pixels[i + 2] = light ? 0xd8 : 0x3a; pixels[i + 3] = alpha
  }
  return nativeImage.createFromBitmap(pixels, { width: size, height: size })
}

function workArea() {
  return screen.getPrimaryDisplay().workArea
}

function createWindow() {
  const area = workArea()
  win = new BrowserWindow({
    x: area.x, y: area.y, width: area.width, height: area.height,
    transparent: true, frame: false, hasShadow: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, show: false, backgroundColor: '#00000000', title: '大肥鱼',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  })
  win.setAlwaysOnTop(true, 'floating')
  win.setMenuBarVisibility(false)
  // Clicks fall through to whatever is underneath; the page turns this off while the pointer is on her.
  win.setIgnoreMouseEvents(true, { forward: true })
  win.loadFile(path.join(__dirname, 'index.html'))
  win.once('ready-to-show', () => { if (wanted) showCompanion(requestedFromDsh(process.argv)) })
  // The page may finish loading before or after the window is first shown (it differs by platform):
  // tell it whether she is meant to be shown, never whether the window happens to be visible yet.
  win.webContents.on('did-finish-load', () => {
    if (!win) return
    win.webContents.send('whale-desktop:command', wanted ? 'shown' : 'hidden')
    if (link) sendLink({ type: 'state', connected: link.state.connected })
  })
  // Links (the model author's page) open in the user's browser, never in this window.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (event, url) => { if (url !== win.webContents.getURL()) { event.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url) } })
  win.on('close', event => { if (!quitting) { event.preventDefault(); hideCompanion() } })
  // Only one of her (roadmap step 4): DSH's page hides its own copy while this window is really on screen.
  win.on('show', () => { if (link) link.setShown(true) })
  win.on('hide', () => { if (link) link.setShown(false) })
  win.on('closed', () => { win = null; if (link) link.setShown(false) })
}

/** Shows or hides her; the page stops every frame while hidden (see shell.js). */
function showCompanion(arriving = false) {
  wanted = true
  if (!win) return
  win.showInactive()
  win.webContents.send('whale-desktop:command', 'shown')
  if (arriving) win.webContents.send('whale-desktop:command', 'arrive')
  if (link) link.setShown(win.isVisible())
  refreshTray()
}
function hideCompanion() {
  wanted = false
  if (!win) return
  win.hide()
  win.webContents.send('whale-desktop:command', 'hidden')
  if (link) link.setShown(false)
  refreshTray()
}
function toggleVisible() {
  if (!win) return
  if (win.isVisible()) hideCompanion(); else showCompanion()
}

// ---- diagnostics (step 1 of the roadmap: measure before changing anything big) ------------------
let gpuWindow = null
function openDevTools() { if (win) win.webContents.openDevTools({ mode: 'detach' }) }
function openGpuInfo() {
  if (gpuWindow) { gpuWindow.focus(); return }
  gpuWindow = new BrowserWindow({ width: 900, height: 760, title: '大肥鱼 · GPU', autoHideMenuBar: true })
  gpuWindow.loadURL('chrome://gpu')
  gpuWindow.on('closed', () => { gpuWindow = null })
}

function refreshTray() {
  if (!tray) return
  const shown = Boolean(win && win.isVisible())
  tray.setToolTip(`大肥鱼 · 桌面模式\n${linkLine()}`)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: linkLine(), enabled: false },
    { type: 'separator' },
    { label: shown ? `隐藏 / Hide (${HIDE_SHORTCUT})` : `显示 / Show (${HIDE_SHORTCUT})`, click: toggleVisible },
    { label: `剧场 / Theatre (${THEATRE_SHORTCUT})`, click: openTheatre },
    { label: '设置 / Settings', click: () => { if (win) { showCompanion(); win.webContents.send('whale-desktop:command', 'settings') } } },
    { label: '重新加载 / Reload', click: () => { if (win) win.webContents.reload() } },
    { label: '性能诊断 / Diagnostics', submenu: [
      { label: '开发者工具（Performance 录制）/ DevTools', click: openDevTools },
      { label: 'GPU 状态 / chrome://gpu', click: openGpuInfo },
    ] },
    { type: 'separator' },
    { label: '退出桌面模式 / Quit', click: () => { quitting = true; if (gpuWindow) gpuWindow.destroy(); app.quit() } },
  ]))
}

app.whenReady().then(() => {
  const registered = process.platform === 'win32' && app.isPackaged && app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL)
  if (registerProtocolOnly) { app.exit(registered ? 0 : 1); return }
  createWindow()
  tray = new Tray(trayIcon())
  tray.on('click', toggleVisible)
  refreshTray()
  globalShortcut.register(HIDE_SHORTCUT, toggleVisible)
  // Alt+T works while her window has the keyboard; this one works from any app (Alt+Space is Windows' own).
  globalShortcut.register(THEATRE_SHORTCUT, openTheatre)

  // The page reports whether the pointer is over her (or one of her panels).
  ipcMain.on('whale-desktop:interactive', (event, interactive) => {
    if (!win || event.sender !== win.webContents) return
    if (interactive) win.setIgnoreMouseEvents(false)
    else win.setIgnoreMouseEvents(true, { forward: true })
  })
  // Typing in her settings needs keyboard focus; she never takes it on her own.
  ipcMain.on('whale-desktop:send', (event, message) => {
    if (!win || event.sender !== win.webContents || !message || typeof message !== 'object') return
    const id = String(message.id || '').slice(0, 64)
    if (!id) return
    if (!link || !link.enqueue(id, String(message.text || ''))) sendLink({ type: 'ack', id, result: 'failed' })
  })
  // Her theatre's Log: DSH reads the messages loaded in its current conversation and posts them back.
  // Read-only: the request carries nothing but its id. No link (or an older one) answers at once with no log.
  ipcMain.on('whale-desktop:history', (event, message) => {
    if (!win || event.sender !== win.webContents || !message || typeof message !== 'object') return
    const id = String(message.id || '').slice(0, 64)
    if (!id) return
    if (!link || typeof link.enqueueHistory !== 'function' || !link.enqueueHistory(id)) sendLink({ type: 'history', id, log: null })
  })
  // Her settings: "back to DSH" hides this window; DSH's page then shows her there again.
  ipcMain.on('whale-desktop:hide', event => {
    if (!win || event.sender !== win.webContents) return
    hideCompanion()
  })
  ipcMain.on('whale-desktop:focus', (event, focus) => {
    if (!win || event.sender !== win.webContents) return
    if (focus) win.focus(); else win.blur()
  })

  link = createLinkServer({
    onSnapshot: snapshot => sendLink({ type: 'snapshot', snapshot }),
    onAck: (id, result) => sendLink({ type: 'ack', id, result }),
    // The page checks the log (readLog) before showing it; null when DSH did not answer in time.
    onHistory: (id, log) => sendLink({ type: 'history', id, log: log === undefined ? null : log }),
    onState: state => { sendLink({ type: 'state', connected: state.connected }); refreshTray() },
    // From DSH's settings ("keep me company on the desktop"): only these two, nothing else.
    // False (refused) when her window is gone or the companion is quitting.
    onRequest: action => {
      if (!win || win.isDestroyed() || quitting) return false
      if (action === 'theatre') openTheatre(); else showCompanion(true)
      return true
    },
  })
  // The window may already be on screen (ready-to-show can come first).
  link.setShown(Boolean(win && win.isVisible()))
  void link.start()

  const refit = () => { if (win) { const area = workArea(); win.setBounds(area) } }
  screen.on('display-metrics-changed', refit)
  screen.on('display-added', refit)
  screen.on('display-removed', refit)
})

// Any quit (tray, Windows shutdown or log-off, an update) really closes the window instead of hiding it;
// without this the hidden-on-close window would hold up a Windows shutdown.
app.on('before-quit', () => { quitting = true; if (link) link.leaving() })
app.on('will-quit', () => { globalShortcut.unregisterAll(); if (link) link.close() })
// The tray keeps the companion alive while the window is hidden.
app.on('window-all-closed', () => { if (quitting) app.quit() })
