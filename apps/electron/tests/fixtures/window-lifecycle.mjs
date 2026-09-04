/** Native lifecycle snapshot driver for the shipping Electron entry and staged Harness host. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { app, BrowserWindow, Menu } from 'electron'

app.setPath('userData', process.env.DSH_WINDOW_TEST_PROFILE)
const timeout = setTimeout(() => {
  console.error('Desktop window lifecycle timed out')
  app.once('will-quit', () => app.exit(1))
  app.quit()
}, 45_000)
timeout.unref()

async function run() {
  if (process.argv.includes('--secondary')) {
    await import('../../app/main.mjs')
    return
  }
  try {
    const created = once(app, 'browser-window-created')
    await import('../../app/main.mjs')
    const [, window] = await created
    const contents = window.webContents
    const ready = new Promise(resolve => {
      contents.on('did-finish-load', () => {
        if (contents.getURL().startsWith('http://127.0.0.1:')) resolve(contents.getURL())
      })
    })
    window.close()
    assert.equal(window.isDestroyed(), false)
    assert.equal(window.isVisible(), false)
    console.log('Close during startup: window hidden; application running.')

    const hostURL = await ready
    assert.equal((await fetch(hostURL)).ok, true)
    console.log(`HOST_URL ${hostURL}`)
    console.log('Hidden startup: local host ready; page loaded.')
    app.emit('activate')
    assert.equal(window.isVisible(), true)
    assert.equal(window.webContents, contents)
    console.log('Activate: original window and renderer restored.')

    const fileMenu = Menu.getApplicationMenu().items.find(item => item.label === 'File')
    const closeItem = fileMenu.submenu.items.find(item => item.role === 'close')
    assert.equal(closeItem.getDefaultRoleAccelerator(), 'CommandOrControl+W')
    const hidden = once(window, 'hide')
    if (process.platform === 'darwin') {
      // macOS executes native menu roles through AppKit, not MenuItem.click().
      app.focus({ steal: true })
      if (!window.isFocused()) await once(window, 'focus')
      Menu.sendActionToFirstResponder('performClose:')
    } else {
      closeItem.click(undefined, window, undefined)
    }
    await hidden
    assert.equal(window.isVisible(), false)
    assert.equal((await fetch(hostURL)).ok, true)
    console.log('Close Window menu: window hidden; local host still reachable.')

    const shown = once(window, 'show')
    const secondary = spawn(process.execPath, [import.meta.filename, '--secondary'], {
      env: process.env,
      stdio: 'ignore',
    })
    const secondaryExit = once(secondary, 'exit')
    try {
      await shown
      const [code] = await secondaryExit
      assert.equal(code, 0)
    } finally {
      if (secondary.exitCode === null && secondary.signalCode === null) {
        secondary.kill()
        await secondaryExit
      }
    }
    assert.equal(BrowserWindow.getAllWindows().length, 1)
    assert.equal(window.webContents, contents)
    assert.equal(contents.getURL(), hostURL)
    console.log('Launch again: original window restored; second process exited.')

    window.close()
    app.once('will-quit', () => {
      assert.equal(window.isDestroyed(), true)
      console.log('Quit while hidden: window destroyed; application exiting.')
    })
    app.quit()
  } catch (error) {
    console.error(error)
    app.once('will-quit', () => app.exit(1))
    app.quit()
  }
}

// Electron emits ready only after its ESM entry finishes evaluating.
void run()
