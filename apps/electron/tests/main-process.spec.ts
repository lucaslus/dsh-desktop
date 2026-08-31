import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { describe, expect, it } from 'vitest'

const mainProcessSource = readFileSync(new URL('../app/main.mjs', import.meta.url), 'utf8')

describe('Electron embedded Host', () => {
  it('keeps the Web UI inside the desktop window', () => {
    // Importing the main process boots native Electron APIs, so pin its CLI
    // assembly without opening a window in the unit-test worker.
    expect(mainProcessSource).toContain("entry, 'web', '--no-open', '--port', '0'")
  })

  it('keeps macOS window chrome out of Linux windows', () => {
    expect(mainProcessSource).toContain("const macOS = process.platform === 'darwin'")
    expect(mainProcessSource).toContain('if (macOS) {')
    expect(mainProcessSource).toContain("? 'install it with dnf'")
  })
})
