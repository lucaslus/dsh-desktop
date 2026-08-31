import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, Menu, dialog, shell } from 'electron'

const readinessPattern = /dsh web: (http:\/\/127\.0\.0\.1:\d+)/
const development = process.env.DSH_ELECTRON_DEV === '1'
const macOS = process.platform === 'darwin'
const macOSChromeScript = `
  (() => {
    document.documentElement.style.setProperty('--dsh-sidebar-logo-row-content-offset', '12px');
    const id = 'dsh-electron-titlebar-drag-region';
    if (document.getElementById(id) || !document.body) return;
    const dragRegion = document.createElement('div');
    dragRegion.id = id;
    dragRegion.setAttribute('aria-hidden', 'true');
    dragRegion.style.cssText = [
      'position:fixed', 'inset:0 0 auto 0', 'height:44px',
      'z-index:2147483647', '-webkit-app-region:drag',
    ].join(';');
    document.body.append(dragRegion);
  })();
`
let host
let mainWindow
let hostOutput = ''
let hostReady = false
let quitting = false
const releasesURL = 'https://github.com/lucaslus/dsh-desktop/releases'

function harnessDirectory() {
  return app.isPackaged
    ? join(process.resourcesPath, 'harness')
    : join(import.meta.dirname, '..', 'dist', 'harness')
}

function sourceHarnessEntry() {
  return join(import.meta.dirname, '..', '..', '..', 'apps', 'cli', 'src', 'bin.ts')
}

function sourceHarnessWorkingDirectory() {
  return join(import.meta.dirname, '..', '..', '..')
}

function harnessEntry() {
  return join(harnessDirectory(), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

function harnessWorkingDirectory() {
  return join(harnessDirectory(), 'node_modules', '@deepseek-ai', 'dsh')
}

function appendHostOutput(chunk) {
  hostOutput = `${hostOutput}${chunk}`.slice(-8_192)
}

function showHostFailure() {
  const detail = hostOutput.trim() || 'The local DeepSeek Harness host exited before it was ready.'
  void dialog.showMessageBox({
    type: 'error',
    title: 'DeepSeek Harness could not start',
    message: 'The local host exited before it was ready.',
    detail,
  })
}

function startHost() {
  const entry = development ? sourceHarnessEntry() : harnessEntry()
  if (!existsSync(entry)) throw new Error(`Missing ${development ? 'source' : 'packaged'} Harness runtime: ${entry}`)
  // Harness enables its HMR service in the default web profile.  Electron is
  // also the embedded Node runtime, so pass this Node flag directly to that
  // child process (NODE_OPTIONS deliberately rejects this diagnostic flag).
  host = spawn(process.execPath, [
    '--expose-internals',
    ...development ? ['--import', 'tsx/esm'] : [],
    entry, 'web', '--no-open', '--port', '0',
  ], {
    cwd: development ? sourceHarnessWorkingDirectory() : harnessWorkingDirectory(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: development ? 'development' : 'production',
      DSH_ELECTRON_BINARY: process.execPath,
      DSH_HARNESS_BIN_ENTRY: entry,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  host.stdout.setEncoding('utf8')
  host.stderr.setEncoding('utf8')
  host.stdout.on('data', chunk => {
    appendHostOutput(chunk)
    const ready = readinessPattern.exec(hostOutput)
    if (!hostReady && ready?.[1] && mainWindow !== undefined) {
      hostReady = true
      void mainWindow.loadURL(ready[1])
    }
  })
  host.stderr.on('data', appendHostOutput)
  host.once('exit', () => {
    host = undefined
    if (!quitting && !hostReady && mainWindow !== undefined && !mainWindow.isDestroyed()) showHostFailure()
  })
}

function stopHost() {
  if (host !== undefined && !host.killed) host.kill()
  host = undefined
}

async function openReleases() {
  const installer = process.platform === 'linux' ? 'RPM package' : 'DMG'
  const destination = process.platform === 'linux'
    ? 'install it with dnf'
    : 'replace the app in Applications'
  const { response } = await dialog.showMessageBox({
    type: 'info',
    buttons: ['Open GitHub Releases', 'Cancel'],
    defaultId: 0,
    title: 'Install updates manually',
    message: `Download the matching ${installer} from GitHub Releases, then ${destination}.`,
  })
  if (response === 0) await shell.openExternal(releasesURL)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240, height: 820, minWidth: 900, minHeight: 600,
    title: 'DeepSeek Harness', backgroundColor: '#1b1b1c',
    ...(macOS ? {
      // Content fills the transparent title bar while the native traffic
      // lights remain available. Linux retains its desktop-managed title bar.
      titleBarStyle: 'hiddenInset',
    } : {}),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  if (macOS) {
    mainWindow.webContents.on('dom-ready', () => {
      void mainWindow?.webContents.executeJavaScript(macOSChromeScript).catch(error => {
        console.error('Could not apply desktop window chrome:', error)
      })
    })
  }
  void mainWindow.loadFile(join(import.meta.dirname, 'splash.html'))
}

function applicationMenu() {
  const updateItem = { label: 'Check for Updates…', click: () => void openReleases() }
  const applicationItems = [
    { role: 'about' }, { type: 'separator' }, updateItem,
    { type: 'separator' }, { role: 'quit' },
  ]
  const fileItems = [updateItem, { type: 'separator' }, { role: 'quit' }]

  return [
    macOS
      ? { label: 'DeepSeek Harness', submenu: applicationItems }
      : { label: 'File', submenu: fileItems },
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
  ]
}

app.whenReady().then(() => {
  try {
    createWindow()
    startHost()
    Menu.setApplicationMenu(Menu.buildFromTemplate(applicationMenu()))
  } catch (error) {
    void dialog.showMessageBox({ type: 'error', title: 'DeepSeek Harness could not start', message: String(error) })
  }
})

app.on('before-quit', () => {
  quitting = true
  stopHost()
})
app.on('window-all-closed', () => app.quit())
