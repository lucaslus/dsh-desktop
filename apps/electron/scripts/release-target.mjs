import { join } from 'node:path'

const TARGETS = Object.freeze({
  darwin: Object.freeze({
    architectures: Object.freeze(['arm64', 'x64']),
    builderArguments: arch => ['--mac', 'dmg', 'zip', `--${arch}`],
    displayName: 'macOS',
  }),
  linux: Object.freeze({
    architectures: Object.freeze(['x64']),
    builderArguments: arch => ['--linux', 'rpm', `--${arch}`],
    displayName: 'Linux',
  }),
})

/**
 * Resolve one supported Electron release target and require a matching build host.
 * @param {string} platform - Node platform name for the package.
 * @param {string} arch - Node architecture name for the package.
 * @param {{ platform?: string, arch?: string }} [host] - Build-host facts used by tests.
 * @returns {{ platform: string, arch: string, displayName: string, builderArguments: readonly string[], nodePtyPrebuild: string }}
 */
export function resolveReleaseTarget(platform, arch, host = {}) {
  const specification = TARGETS[platform]
  if (specification === undefined) {
    throw new Error(`Unsupported Electron release platform: ${platform}`)
  }
  if (!specification.architectures.includes(arch)) {
    throw new Error(`Unsupported ${specification.displayName} architecture: ${arch}`)
  }

  const hostPlatform = host.platform ?? process.platform
  const hostArch = host.arch ?? process.arch
  if (platform !== hostPlatform || arch !== hostArch) {
    throw new Error(
      `Build ${platform}-${arch} on a matching ${platform}-${arch} host so native dependencies are correct.`,
    )
  }

  return {
    platform,
    arch,
    displayName: specification.displayName,
    builderArguments: specification.builderArguments(arch),
    nodePtyPrebuild: `${platform}-${arch}`,
  }
}

/**
 * Locate the packaged Harness runtime for an electron-builder output directory.
 * @param {{ appOutDir: string, electronPlatformName: string, packager: { appInfo: { productFilename: string } } }} context - afterPack context.
 * @returns {string} Absolute destination inside the unpacked Electron application.
 */
export function harnessRuntimeDestination(context) {
  if (context.electronPlatformName === 'darwin') {
    return join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      'Contents',
      'Resources',
      'harness',
    )
  }
  if (context.electronPlatformName === 'linux') {
    return join(context.appOutDir, 'resources', 'harness')
  }
  throw new Error(`Unsupported Electron release platform: ${context.electronPlatformName}`)
}
