import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { harnessDestination } from '../scripts/copy-harness-runtime.mjs'
import { createPackagePlan } from '../scripts/package-plan.mjs'

describe('Electron desktop packaging', () => {
  it('builds Fedora RPMs only on a matching native host', () => {
    expect(createPackagePlan('linux', 'x64', 'linux', 'x64')).toEqual({
      builderArguments: [
        '--config', 'electron-builder.yml',
        '--linux', 'rpm', '--x64', '--publish', 'never',
      ],
      stageArguments: ['scripts/stage-runtime.mjs', 'linux', 'x64'],
    })
    expect(() => createPackagePlan('linux', 'arm64', 'darwin', 'arm64')).toThrow(
      'Build the Fedora Linux package on a linux host so native dependencies match.',
    )
    expect(() => createPackagePlan('linux', 'arm64', 'linux', 'x64')).toThrow(
      'Build the arm64 Fedora Linux package on a matching arm64 host so native dependencies match.',
    )
  })

  it('retains the native macOS targets', () => {
    expect(createPackagePlan('darwin', 'arm64', 'darwin', 'arm64')).toEqual({
      builderArguments: [
        '--config', 'electron-builder.yml',
        '--mac', 'dmg', 'zip', '--arm64', '--publish', 'never',
      ],
      stageArguments: ['scripts/stage-runtime.mjs', 'darwin', 'arm64'],
    })
  })

  it('copies the Harness into the packager-owned resources directory', () => {
    const appOutDir = join('tmp', 'linux-unpacked')
    expect(harnessDestination({
      appOutDir,
      packager: { getResourcesDir: directory => join(directory, 'resources') },
    })).toBe(join(appOutDir, 'resources', 'harness'))
  })
})
