import { describe, expect, it, vi } from 'vitest'
import {
  applicationMenuTemplate,
  nativeWindowOptions,
  needsInsetDragRegion,
  updateInstallMessage,
} from '../app/platform.mjs'

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
