/**
 * Builds the click-to-run desktop companion: a portable Windows folder with Electron built in, so users only
 * double-click DaFeiYu.exe (no Node.js, no npm). Run `npm run build` first, then `npm run package:desktop`.
 *
 * Output: dist/DaFeiYu-win32-x64/ (the release workflow zips it as dsh-whale-pet-desktop-vX.Y.Z-win-x64.zip).
 * This is a large binary download (~100 MB): it is attached to releases, never committed to git.
 * No Live2D model is ever included; users import it in her settings, as in DSH.
 */
import { packager } from '@electron/packager'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const electronVersion = JSON.parse(readFileSync(join(root, 'node_modules', 'electron', 'package.json'), 'utf8')).version
const dist = join(root, 'dist')
const stage = join(dist, 'desktop-app')

// Exactly the files the companion loads at run time: her window, the shared pet bundle and React.
const files = [
  'desktop/main.cjs', 'desktop/preload.cjs', 'desktop/link-server.cjs',
  'desktop/index.html', 'desktop/shell.js', 'desktop/mount.js', 'desktop/vendor/react.js',
  'lib/client.js',
]
for (const file of files) {
  if (!existsSync(join(root, file))) throw new Error(`${file} is missing: run npm run build first`)
}

rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })
for (const file of files) {
  mkdirSync(dirname(join(stage, file)), { recursive: true })
  cpSync(join(root, file), join(stage, file))
}
writeFileSync(join(stage, 'package.json'), JSON.stringify({
  name: 'dsh-whale-pet-desktop',
  productName: '大肥鱼桌面',
  version: pkg.version,
  description: '大肥鱼 desktop companion for DeepSeek Harness (unofficial community plugin)',
  license: pkg.license,
  author: 'dsh-whale-pet contributors',
  main: 'desktop/main.cjs',
}, null, 2))

const [appPath] = await packager({
  dir: stage,
  out: dist,
  name: 'DaFeiYu',
  executableName: 'DaFeiYu',
  appVersion: pkg.version,
  electronVersion,
  // DESKTOP_PLATFORM only for checking the packaged layout on another system (tests); releases are Windows.
  platform: process.env.DESKTOP_PLATFORM || 'win32',
  arch: 'x64',
  asar: true,
  overwrite: true,
  prune: false,
  // Windows file details (needs rcedit, i.e. Wine elsewhere): only when building on Windows.
  ...(process.platform === 'win32' ? { win32metadata: { ProductName: '大肥鱼桌面', FileDescription: '大肥鱼桌面 (dsh-whale-pet)', CompanyName: 'dsh-whale-pet contributors' } } : {}),
})

const guide = `大肥鱼桌面 ${pkg.version}（预览）

双击 DaFeiYu.exe，她就会出现在桌面上。
- 退出 / 隐藏：右键屏幕右下角托盘里的蓝色小圆图标；Alt+Shift+H 隐藏或显示。
- 想让她跟着 DSH 动：同时打开 DSH（需要安装 dsh-whale-pet 插件），会自动连接。
- Live2D 模型不随附，请在她的设置 › 角色模型里导入一次。
- Windows 可能提示“未知发布者”：点“更多信息” › “仍要运行”。
- 这个文件夹可以放在任何地方；删除文件夹即可卸载。
操作说明：https://github.com/Ewigkeit1203/dsh-whale-pet/blob/main/docs/USER_GUIDE.zh-CN.md

DaFeiYu desktop ${pkg.version} (preview)

Double-click DaFeiYu.exe and she appears on your desktop.
- Quit / hide: right-click the small blue round icon in the system tray; Alt+Shift+H hides or shows her.
- To follow DSH: keep DSH open with the dsh-whale-pet plugin installed; they connect automatically.
- The Live2D model is not included; import it once in her Settings › Character model.
- Windows may say "Unknown publisher": choose More info › Run anyway.
- Keep the folder anywhere; delete the folder to uninstall.
User guide: https://github.com/Ewigkeit1203/dsh-whale-pet/blob/main/docs/USER_GUIDE.md

Unofficial community plugin; not affiliated with or endorsed by DeepSeek.
`
// UTF-8 with BOM so Notepad shows the Chinese correctly.
writeFileSync(join(appPath, '使用说明.txt'), '﻿' + guide.replace(/\n/g, '\r\n'))
rmSync(stage, { recursive: true, force: true })
console.log(`[package-desktop] ${appPath}`)
