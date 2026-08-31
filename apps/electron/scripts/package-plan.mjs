const platformPlans = {
  darwin: {
    displayName: 'macOS',
    builderArguments: ['--mac', 'dmg', 'zip'],
  },
  linux: {
    displayName: 'Fedora Linux',
    builderArguments: ['--linux', 'rpm'],
  },
}

const supportedArchitectures = new Set(['arm64', 'x64'])

/**
 * Resolve one native desktop package invocation.
 *
 * @param {string} targetPlatform Target Node.js platform name.
 * @param {string} targetArch Target Node.js architecture name.
 * @param {string} [hostPlatform] Build-host Node.js platform name.
 * @param {string} [hostArch] Build-host Node.js architecture name.
 * @returns {{ builderArguments: string[], stageArguments: string[] }} Commands for staging and electron-builder.
 */
export function createPackagePlan(
  targetPlatform,
  targetArch,
  hostPlatform = process.platform,
  hostArch = process.arch,
) {
  const platformPlan = platformPlans[targetPlatform]
  if (platformPlan === undefined) throw new Error(`Unsupported desktop platform: ${targetPlatform}`)
  if (!supportedArchitectures.has(targetArch)) {
    throw new Error(`Unsupported ${platformPlan.displayName} architecture: ${targetArch}`)
  }
  if (hostPlatform !== targetPlatform) {
    throw new Error(`Build the ${platformPlan.displayName} package on a ${targetPlatform} host so native dependencies match.`)
  }
  if (hostArch !== targetArch) {
    throw new Error(`Build the ${targetArch} ${platformPlan.displayName} package on a matching ${targetArch} host so native dependencies match.`)
  }

  return {
    builderArguments: [
      '--config', 'electron-builder.yml',
      ...platformPlan.builderArguments,
      `--${targetArch}`, '--publish', 'never',
    ],
    stageArguments: ['scripts/stage-runtime.mjs', targetPlatform, targetArch],
  }
}
