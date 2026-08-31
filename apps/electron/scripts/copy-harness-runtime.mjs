import { cp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/**
 * Locate the platform-native Electron resources directory.
 *
 * @param {{ appOutDir: string, packager: { getResourcesDir(appOutDir: string): string } }} context electron-builder pack context.
 * @returns {string} Destination for the staged Harness runtime.
 */
export function harnessDestination(context) {
  return join(context.packager.getResourcesDir(context.appOutDir), 'harness')
}

export default async function copyHarnessRuntime(context) {
  const source = resolve(import.meta.dirname, '..', 'dist', 'harness')
  const destination = harnessDestination(context)

  await rm(destination, { recursive: true, force: true })
  // The production deployment contains pnpm links. A release app must be
  // relocatable, so copy their contents instead of preserving their paths.
  await cp(source, destination, { recursive: true, dereference: true })
}
