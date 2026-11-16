import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { verifyDesktopPackage, runtimeFiles, asarTools } = require('../scripts/verify-desktop-package.cjs')

async function fixture(t: any, change?: (stage: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'whale-desktop-package-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const source = join(root, 'source'), stage = join(root, 'stage'), app = join(root, 'app')
  for (const file of runtimeFiles) {
    for (const dir of [source, stage]) {
      mkdirSync(dirname(join(dir, file)), { recursive: true })
      writeFileSync(join(dir, file), `runtime: ${file}\n`)
    }
  }
  writeFileSync(join(source, 'package.json'), JSON.stringify({ version: '0.8.2' }))
  writeFileSync(join(stage, 'package.json'), JSON.stringify({ name: 'dsh-whale-pet-desktop', version: '0.8.2', main: 'desktop/main.cjs' }))
  change?.(stage)
  mkdirSync(join(app, 'resources'), { recursive: true })
  writeFileSync(join(app, 'DaFeiYu.exe'), 'fixture (not a runnable Electron binary)')
  await asarTools().createPackage(stage, join(app, 'resources', 'app.asar'))
  return { app, source }
}

test('Desktop package: real ASAR inventory, entry point, version and runtime bytes match the build', async t => {
  const { app, source } = await fixture(t)
  assert.equal(verifyDesktopPackage(app, source), 9)
})

test('Desktop package: a model hidden inside ASAR is rejected', async t => {
  const { app, source } = await fixture(t, stage => writeFileSync(join(stage, 'user-model.moc3'), 'private model'))
  assert.throws(() => verifyDesktopPackage(app, source), /Unexpected or missing ASAR files/)
})

test('Desktop package: a stale runtime bundle is rejected even when the file inventory matches', async t => {
  const { app, source } = await fixture(t, stage => writeFileSync(join(stage, 'lib/client.js'), 'old build'))
  assert.throws(() => verifyDesktopPackage(app, source), /Packaged runtime differs from this build/)
})
