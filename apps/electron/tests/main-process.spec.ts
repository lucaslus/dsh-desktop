import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { URL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mainProcessSource = readFileSync(new URL('../app/main.mjs', import.meta.url), 'utf8')
const hostPlatform = process.platform

async function bootDesktop(hasLock = true) {
  vi.resetModules()
  const app = Object.assign(new EventEmitter(), {
    isPackaged: false,
    isReady: vi.fn(() => true),
    whenReady: vi.fn(() => Promise.resolve()),
    requestSingleInstanceLock: vi.fn(() => hasLock),
    quit: vi.fn(() => { app.emit('before-quit') }),
  })
  const host = Object.assign(new EventEmitter(), {
    stdout: Object.assign(new EventEmitter(), { setEncoding: vi.fn() }),
    stderr: Object.assign(new EventEmitter(), { setEncoding: vi.fn() }),
    killed: false,
    kill: vi.fn(),
  })
  const spawn = vi.fn(() => host)
  const windows: ReturnType<typeof makeWindow>[] = []
  function makeWindow() {
    return Object.assign(new EventEmitter(), {
      webContents: Object.assign(new EventEmitter(), { executeJavaScript: vi.fn().mockResolvedValue(undefined) }),
      hide: vi.fn(), show: vi.fn(), focus: vi.fn(), restore: vi.fn(),
      isMinimized: vi.fn(() => false), isDestroyed: vi.fn(() => false),
      loadFile: vi.fn().mockResolvedValue(undefined), loadURL: vi.fn().mockResolvedValue(undefined),
    })
  }
  vi.doMock('electron', () => ({
    app,
    BrowserWindow: vi.fn(function () {
      const window = makeWindow()
      windows.push(window)
      return window
    }),
    Menu: { buildFromTemplate: vi.fn(), setApplicationMenu: vi.fn() },
    dialog: { showMessageBox: vi.fn().mockResolvedValue({ response: 1 }) },
    shell: { openExternal: vi.fn() },
  }))
  vi.doMock('node:child_process', () => ({ spawn }))
  vi.doMock('node:fs', () => ({ existsSync: vi.fn(() => true) }))
  // The real entry owns listener registration and host startup; only native/process APIs are replaced.
  const entry = '../app/main.mjs'
  await import(entry)
  return { app, host, spawn, windows }
}

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: hostPlatform })
  vi.doUnmock('electron')
  vi.doUnmock('node:child_process')
  vi.doUnmock('node:fs')
  vi.resetModules()
})

describe('Electron embedded Host', () => {
  it('keeps the Web UI inside the desktop window', () => {
    // Importing the main process boots native Electron APIs, so pin its CLI
    // assembly without opening a window in the unit-test worker.
    expect(mainProcessSource).toContain("entry, 'web', '--no-open', '--port', '0'")
  })
})

describe.each(['darwin', 'linux'])('Electron %s window lifetime', (platform) => {
  beforeEach(() => {
    Object.defineProperty(process, 'platform', { value: platform })
  })

  it('keeps the host and renderer alive when closing during startup', async () => {
    const { app, host, windows } = await bootDesktop()
    const window = windows[0]!
    const event = { preventDefault: vi.fn() }
    window.emit('close', event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(window.hide).toHaveBeenCalledOnce()
    expect(host.kill).not.toHaveBeenCalled()
    expect(app.quit).not.toHaveBeenCalled()

    host.stdout.emit('data', 'dsh web: http://127.0.0.1:43210\n')
    expect(window.loadURL).toHaveBeenCalledWith('http://127.0.0.1:43210')
    app.emit('activate')
    expect(window.show).toHaveBeenCalledOnce()
    expect(windows).toHaveLength(1)
  })

  it('preserves the authentication URL across stdout chunks and ignores the LAN address', async () => {
    const { host, windows } = await bootDesktop()
    host.stdout.emit('data', 'dsh web: http://127.0.0.1:43210/?token=first')
    expect(windows[0]!.loadURL).not.toHaveBeenCalled()
    host.stdout.emit('data', '-second (LAN: http://192.168.1.2:43210/?token=first-second)\n')
    expect(windows[0]!.loadURL).toHaveBeenCalledWith('http://127.0.0.1:43210/?token=first-second')
  })

  it.each(['activate', 'second-instance'])('restores the same window on %s without restarting the host', async (event) => {
    const { app, host, spawn, windows } = await bootDesktop()
    const window = windows[0]!
    host.stdout.emit('data', 'dsh web: http://127.0.0.1:43210\n')
    window.emit('close', { preventDefault: vi.fn() })
    window.isMinimized.mockReturnValue(true)
    app.emit(event)
    expect(window.restore).toHaveBeenCalledOnce()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
    expect(window.loadURL).toHaveBeenCalledOnce()
    expect(spawn).toHaveBeenCalledOnce()
    expect(host.kill).not.toHaveBeenCalled()
    expect(windows).toHaveLength(1)
  })

  it.each([true, false])('recreates a destroyed window using the existing host (ready before destruction: %s)', async (readyFirst) => {
    const { app, host, spawn, windows } = await bootDesktop()
    if (readyFirst) host.stdout.emit('data', 'dsh web: http://127.0.0.1:43210\n')
    windows[0]!.emit('closed')
    app.emit('window-all-closed')
    if (!readyFirst) host.stdout.emit('data', 'dsh web: http://127.0.0.1:43210\n')
    expect(app.quit).not.toHaveBeenCalled()
    app.emit('activate')
    expect(windows).toHaveLength(2)
    expect(windows[1]!.loadURL).toHaveBeenCalledWith('http://127.0.0.1:43210')
    expect(windows[1]!.loadFile).not.toHaveBeenCalled()
    expect(spawn).toHaveBeenCalledOnce()
  })

  it('allows explicit quit to close a hidden window and stop its host', async () => {
    const { app, host, windows } = await bootDesktop()
    const window = windows[0]!
    window.emit('close', { preventDefault: vi.fn() })
    window.hide.mockClear()
    app.quit()
    const event = { preventDefault: vi.fn() }
    window.emit('close', event)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(window.hide).not.toHaveBeenCalled()
    expect(host.kill).toHaveBeenCalledOnce()
    window.emit('closed')
    app.emit('activate')
    expect(windows).toHaveLength(1)
  })

  it('exits a second process before starting another window or host', async () => {
    const { app, spawn, windows } = await bootDesktop(false)
    expect(app.quit).toHaveBeenCalledOnce()
    expect(app.whenReady).not.toHaveBeenCalled()
    expect(windows).toHaveLength(0)
    expect(spawn).not.toHaveBeenCalled()
  })
})
