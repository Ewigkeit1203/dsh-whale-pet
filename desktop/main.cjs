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

if (!app.requestSingleInstanceLock()) { app.quit() }
app.on('second-instance', () => showCompanion())

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
  win.once('ready-to-show', () => { if (wanted) showCompanion() })
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
  win.on('closed', () => { win = null })
}

/** Shows or hides her; the page stops every frame while hidden (see shell.js). */
function showCompanion() {
  wanted = true
  if (!win) return
  win.showInactive()
  win.webContents.send('whale-desktop:command', 'shown')
  refreshTray()
}
function hideCompanion() {
  wanted = false
  if (!win) return
  win.hide()
  win.webContents.send('whale-desktop:command', 'hidden')
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
  createWindow()
  tray = new Tray(trayIcon())
  tray.on('click', toggleVisible)
  refreshTray()
  globalShortcut.register(HIDE_SHORTCUT, toggleVisible)

  // The page reports whether the pointer is over her (or one of her panels).
  ipcMain.on('whale-desktop:interactive', (event, interactive) => {
    if (!win || event.sender !== win.webContents) return
    if (interactive) win.setIgnoreMouseEvents(false)
    else win.setIgnoreMouseEvents(true, { forward: true })
  })
  // Typing in her settings needs keyboard focus; she never takes it on her own.
  ipcMain.on('whale-desktop:focus', (event, focus) => {
    if (!win || event.sender !== win.webContents) return
    if (focus) win.focus(); else win.blur()
  })

  link = createLinkServer({
    onSnapshot: snapshot => sendLink({ type: 'snapshot', snapshot }),
    onState: state => { sendLink({ type: 'state', connected: state.connected }); refreshTray() },
  })
  void link.start()

  const refit = () => { if (win) { const area = workArea(); win.setBounds(area) } }
  screen.on('display-metrics-changed', refit)
  screen.on('display-added', refit)
  screen.on('display-removed', refit)
})

// Any quit (tray, Windows shutdown or log-off, an update) really closes the window instead of hiding it;
// without this the hidden-on-close window would hold up a Windows shutdown.
app.on('before-quit', () => { quitting = true })
app.on('will-quit', () => { globalShortcut.unregisterAll(); if (link) link.close() })
// The tray keeps the companion alive while the window is hidden.
app.on('window-all-closed', () => { if (quitting) app.quit() })
