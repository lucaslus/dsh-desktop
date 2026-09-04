/** One validated native Electron release target. */
export interface ElectronReleaseTarget {
  /** Node platform name. */
  readonly platform: 'darwin' | 'linux'
  /** Node CPU architecture name. */
  readonly arch: 'arm64' | 'x64'
  /** Human-readable operating-system name. */
  readonly displayName: string
  /** Platform and artifact arguments passed to electron-builder. */
  readonly builderArguments: readonly string[]
  /** Exact node-pty prebuild directory retained in the package. */
  readonly nodePtyPrebuild: string
}

/** Build-host facts used to enforce native dependency selection. */
export interface ElectronReleaseHost {
  /** Node platform name; defaults to the current process. */
  readonly platform?: string
  /** Node CPU architecture name; defaults to the current process. */
  readonly arch?: string
}

/**
 * Resolve one supported Electron release target and require a matching build host.
 * @param platform - Node platform name for the package.
 * @param arch - Node architecture name for the package.
 * @param host - Optional build-host facts used by tests.
 * @returns The validated target and its electron-builder arguments.
 */
export function resolveReleaseTarget(
  platform: string,
  arch: string,
  host?: ElectronReleaseHost,
): ElectronReleaseTarget

/** electron-builder facts used to locate the unpacked application resources. */
export interface ElectronAfterPackContext {
  /** Unpacked application output directory. */
  readonly appOutDir: string
  /** Electron platform name for the current build. */
  readonly electronPlatformName: string
  /** Minimal packager metadata used by the macOS bundle path. */
  readonly packager: { readonly appInfo: { readonly productFilename: string } }
}

/**
 * Locate the packaged Harness runtime for an electron-builder output directory.
 * @param context - electron-builder afterPack facts.
 * @returns Absolute destination inside the unpacked Electron application.
 */
export function harnessRuntimeDestination(context: ElectronAfterPackContext): string
