/** Verify the packaged ASAR against the approved runtime files and the current build, without launching it. */
const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const { join, resolve, sep } = require('node:path')

const runtimeFiles = [
  'desktop/main.cjs', 'desktop/preload.cjs', 'desktop/link-server.cjs',
  'desktop/index.html', 'desktop/shell.js', 'desktop/mount.js', 'desktop/vendor/react.js',
  'lib/client.js',
]

function asarTools() {
  // ASAR is a dependency of the packager; resolve from there for pnpm's isolated dependency layout.
  return createRequire(require.resolve('@electron/packager'))('@electron/asar')
}

// @electron/asar looks entries up by the platform's separator (nested '/' paths are not found on Windows).
const inArchive = name => name.split('/').join(sep)

function verifyDesktopPackage(appDirectory, sourceRoot = resolve(__dirname, '..')) {
  const asar = asarTools()
  const archive = join(appDirectory, 'resources', 'app.asar')
  assert.ok(existsSync(join(appDirectory, 'DaFeiYu.exe')), 'DaFeiYu.exe missing')
  assert.ok(existsSync(archive), 'resources/app.asar missing')
  const names = asar.listPackage(archive).map(name => name.replace(/\\/g, '/').replace(/^\/+/, ''))
  const files = names.filter(name => !asar.statFile(archive, inArchive(name), false).files)
  assert.deepEqual(files.sort(), [...runtimeFiles, 'package.json'].sort(), 'Unexpected or missing ASAR files (models and development files must never ship)')
  for (const name of files) {
    const entry = asar.statFile(archive, inArchive(name), false)
    assert.ok(!entry.link && !entry.unpacked, `Unexpected linked or unpacked file: ${name}`)
  }
  for (const name of runtimeFiles) {
    assert.deepEqual(asar.extractFile(archive, inArchive(name), false), readFileSync(join(sourceRoot, name)), `Packaged runtime differs from this build: ${name}`)
  }
  const packaged = JSON.parse(asar.extractFile(archive, 'package.json', false).toString('utf8'))
  const source = JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8'))
  assert.equal(packaged.name, 'dsh-whale-pet-desktop')
  assert.equal(packaged.version, source.version, 'Packaged version differs from source')
  assert.equal(packaged.main, 'desktop/main.cjs')
  return files.length
}

module.exports = { verifyDesktopPackage, runtimeFiles, asarTools }
if (require.main === module) {
  const count = verifyDesktopPackage(resolve(process.argv[2] || 'dist/DaFeiYu-win32-x64'))
  console.log(`PASS: ${count} approved ASAR files; runtime bytes and version match the current build`)
}
