import type { BrowserWindowConstructorOptions, MenuItemConstructorOptions } from 'electron'

/**
 * Return platform-specific BrowserWindow chrome options.
 * @param platform - Host platform.
 * @returns BrowserWindow options for native chrome.
 */
export function nativeWindowOptions(
  platform: NodeJS.Platform | string,
): Pick<BrowserWindowConstructorOptions, 'titleBarStyle'> | Record<string, never>

/**
 * Decide whether the Web contents must provide the draggable title-bar region.
 * @param platform - Host platform.
 * @returns Whether the macOS inset title bar needs the injected region.
 */
export function needsInsetDragRegion(platform: NodeJS.Platform | string): boolean

/**
 * Describe manual update installation for the host platform.
 * @param platform - Host platform.
 * @returns Dialog message shown before opening GitHub Releases.
 */
export function updateInstallMessage(platform: NodeJS.Platform | string): string

/**
 * Build the native menu for one supported desktop platform.
 * @param platform - Host platform.
 * @param openReleases - Opens the release page after confirmation.
 * @returns Electron menu template.
 */
export function applicationMenuTemplate(
  platform: NodeJS.Platform | string,
  openReleases: () => void,
): MenuItemConstructorOptions[]
