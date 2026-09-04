/**
 * Return platform-specific BrowserWindow chrome options.
 * @param {NodeJS.Platform | string} platform - Host platform.
 * @returns {Record<string, string>} BrowserWindow options for native chrome.
 */
export function nativeWindowOptions(platform) {
  return platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}
}

/**
 * Decide whether the Web contents must provide the draggable title-bar region.
 * @param {NodeJS.Platform | string} platform - Host platform.
 * @returns {boolean} Whether the macOS inset title bar needs the injected region.
 */
export function needsInsetDragRegion(platform) {
  return platform === 'darwin'
}

/**
 * Describe manual update installation for the host platform.
 * @param {NodeJS.Platform | string} platform - Host platform.
 * @returns {string} Dialog message shown before opening GitHub Releases.
 */
export function updateInstallMessage(platform) {
  if (platform === 'linux') {
    return 'Download the x86_64 RPM from GitHub Releases, then install it with your package manager.'
  }
  return 'Download the matching DMG from GitHub Releases, then replace the app in Applications.'
}

/**
 * Build the native menu for one supported desktop platform.
 * @param {NodeJS.Platform | string} platform - Host platform.
 * @param {() => void} openReleases - Opens the release page after confirmation.
 * @returns {Electron.MenuItemConstructorOptions[]} Electron menu template.
 */
export function applicationMenuTemplate(platform, openReleases) {
  const updateItem = { label: 'Check for Updates…', click: openReleases }
  const sharedMenus = [{ role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]
  if (platform === 'darwin') {
    return [
      {
        label: 'DeepSeek Harness',
        submenu: [
          { role: 'about' }, { type: 'separator' },
          updateItem,
          { type: 'separator' }, { role: 'quit' },
        ],
      },
      { label: 'File', submenu: [{ role: 'close' }] },
      ...sharedMenus,
    ]
  }
  return [
    {
      label: 'File',
      submenu: [{ role: 'close' }, updateItem, { type: 'separator' }, { role: 'quit' }],
    },
    ...sharedMenus,
    { role: 'help', submenu: [{ role: 'about' }] },
  ]
}
