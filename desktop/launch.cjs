/**
 * Starts the desktop companion on its own, so closing the terminal does not take her away.
 * `npm run desktop` uses this; `npm run desktop:dev` keeps her attached to the terminal (logs, Ctrl+C).
 * She is quit from her tray menu.
 */
const { spawn } = require('node:child_process')
const path = require('node:path')

let electron
try { electron = require('electron') } catch { electron = null }
if (typeof electron !== 'string') {
  console.error('没有找到 Electron。请在插件目录运行：node node_modules\\electron\\install.js')
  process.exit(1)
}
const child = spawn(electron, [path.join(__dirname, 'main.cjs')], { detached: true, stdio: 'ignore', windowsHide: false, cwd: path.join(__dirname, '..') })
child.unref()
console.log('大肥鱼已经在桌面上了，可以关掉这个窗口。退出：右键托盘里的蓝色小图标 → 退出桌面模式。')
