import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  harnessRuntimeDestination,
  resolveReleaseTarget,
} from '../scripts/release-target.mjs'
import {
  applicationMenuTemplate,
  nativeWindowOptions,
  needsInsetDragRegion,
  updateInstallMessage,
} from '../app/platform.mjs'

describe('Electron release targets', () => {
  it('builds both macOS architectures on matching hosts', () => {
    expect(resolveReleaseTarget('darwin', 'arm64', { platform: 'darwin', arch: 'arm64' })).toMatchObject({
      builderArguments: ['--mac', 'dmg', 'zip', '--arm64'],
      nodePtyPrebuild: 'darwin-arm64',
    })
    expect(resolveReleaseTarget('darwin', 'x64', { platform: 'darwin', arch: 'x64' })).toMatchObject({
      builderArguments: ['--mac', 'dmg', 'zip', '--x64'],
      nodePtyPrebuild: 'darwin-x64',
    })
  })

  it('builds a Fedora-compatible RPM on a matching Linux x64 host', () => {
    expect(resolveReleaseTarget('linux', 'x64', { platform: 'linux', arch: 'x64' })).toMatchObject({
      builderArguments: ['--linux', 'rpm', '--x64'],
      nodePtyPrebuild: 'linux-x64',
    })
  })

  it('rejects unsupported and cross-built native targets', () => {
    expect(() => resolveReleaseTarget('linux', 'arm64', { platform: 'linux', arch: 'arm64' }))
      .toThrow('Unsupported Linux architecture: arm64')
    expect(() => resolveReleaseTarget('win32', 'x64', { platform: 'win32', arch: 'x64' }))
      .toThrow('Unsupported Electron release platform: win32')
    expect(() => resolveReleaseTarget('linux', 'x64', { platform: 'darwin', arch: 'x64' }))
      .toThrow('Build linux-x64 on a matching linux-x64 host')
  })

  it('copies the runtime into each platform resources directory', () => {
    const base = {
      appOutDir: '/release/app',
      packager: { appInfo: { productFilename: 'DeepSeek Harness' } },
    }
    expect(harnessRuntimeDestination({ ...base, electronPlatformName: 'darwin' })).toBe(join(
      '/release/app', 'DeepSeek Harness.app', 'Contents', 'Resources', 'harness',
    ))
    expect(harnessRuntimeDestination({ ...base, electronPlatformName: 'linux' })).toBe(join(
      '/release/app', 'resources', 'harness',
    ))
    expect(() => harnessRuntimeDestination({ ...base, electronPlatformName: 'win32' }))
      .toThrow('Unsupported Electron release platform: win32')
  })
})

describe('Electron native presentation', () => {
  it('uses inset chrome only on macOS', () => {
    expect(nativeWindowOptions('darwin')).toEqual({ titleBarStyle: 'hiddenInset' })
    expect(needsInsetDragRegion('darwin')).toBe(true)
    expect(nativeWindowOptions('linux')).toEqual({})
    expect(needsInsetDragRegion('linux')).toBe(false)
  })

  it('names the package format in update instructions', () => {
    expect(updateInstallMessage('darwin')).toContain('DMG')
    expect(updateInstallMessage('linux')).toContain('RPM')
  })

  it('uses native application and file menu layouts', () => {
    const openReleases = vi.fn()
    const macMenu = applicationMenuTemplate('darwin', openReleases)
    const linuxMenu = applicationMenuTemplate('linux', openReleases)
    const macApplicationMenu = macMenu[0]
    const linuxFileMenu = linuxMenu[0]
    if (macApplicationMenu === undefined || linuxFileMenu === undefined) {
      throw new Error('Desktop menu templates must contain a leading application or File menu')
    }

    expect(macApplicationMenu.label).toBe('DeepSeek Harness')
    expect(linuxFileMenu.label).toBe('File')
    expect(macMenu[1]).toEqual({ label: 'File', submenu: [{ role: 'close' }] })
    const submenu = linuxFileMenu.submenu
    expect(Array.isArray(submenu)).toBe(true)
    if (!Array.isArray(submenu)) throw new Error('Linux File menu must carry an inline submenu')
    expect(submenu).toContainEqual({ role: 'close' })
    expect(submenu).toContainEqual({ role: 'quit' })
    const updateItem = submenu.find(item => item.label === 'Check for Updates…')
    expect(updateItem?.click).toBe(openReleases)
  })
})
