/** Minimal electron-builder context consumed by the Harness copy hook. */
export interface HarnessPackContext {
  appOutDir: string
  packager: {
    getResourcesDir(appOutDir: string): string
  }
}

/**
 * Locate the platform-native Electron resources directory.
 *
 * @param context electron-builder pack context.
 * @returns Destination for the staged Harness runtime.
 */
export function harnessDestination(context: HarnessPackContext): string

/**
 * Copy the staged production Harness into an Electron application.
 *
 * @param context electron-builder pack context.
 * @returns Completion after every relocatable runtime file is copied.
 */
export default function copyHarnessRuntime(context: HarnessPackContext): Promise<void>
