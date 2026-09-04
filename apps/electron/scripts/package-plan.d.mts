/** Commands that stage one native runtime and invoke electron-builder. */
export interface PackagePlan {
  builderArguments: string[]
  stageArguments: string[]
}

/**
 * Resolve one native desktop package invocation.
 *
 * @param targetPlatform Target Node.js platform name.
 * @param targetArch Target Node.js architecture name.
 * @param hostPlatform Build-host Node.js platform name.
 * @param hostArch Build-host Node.js architecture name.
 * @returns Commands for staging and electron-builder.
 */
export function createPackagePlan(
  targetPlatform: string,
  targetArch: string,
  hostPlatform?: string,
  hostArch?: string,
): PackagePlan
