import { spawn } from 'node:child_process'
import { cp, lstat, mkdir, readdir, realpath, rm, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { resolveReleaseTarget } from './release-target.mjs'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const electronDirectory = resolve(import.meta.dirname, '..')
const stagingDirectory = join(electronDirectory, 'dist', 'harness')
const platform = process.argv[2] ?? process.platform
const arch = process.argv[3] ?? process.arch
const target = resolveReleaseTarget(platform, arch)

await rm(stagingDirectory, { recursive: true, force: true })
await mkdir(dirname(stagingDirectory), { recursive: true })
await run('pnpm', [
  // The Electron package depends on both the CLI and the project's maintained
  // dependency-only runtime manifest. Together they include the CLI's direct
  // dependencies and its dynamically-loaded plugins.
  '--config.inject-workspace-packages=true',
  '--filter', 'deepseek-harness-desktop-electron', 'deploy', '--prod',
  '--config.node-linker=hoisted', '--config.strict-dep-builds=false',
  '--config.link-workspace-packages=true', stagingDirectory,
])
// The deployed workspace package has an absolute file locator that pnpm's
// isolated lockfile cannot match against the repository allowBuilds entry.
// Run its reviewed permission repair explicitly after the other allowed
// dependency scripts finish.
await run(process.execPath, [
  join(
    stagingDirectory,
    'node_modules',
    '@deepseek-ai',
    'dsh-subprocess-local',
    'scripts',
    'ensure-spawn-helper.mjs',
  ),
])
await materializeLinks(stagingDirectory)
await prunePlatformBinaries(stagingDirectory, target.nodePtyPrebuild)

async function run(command, arguments_) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, { cwd: repositoryRoot, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', code => code === 0
      ? resolvePromise()
      : reject(new Error(`${command} exited with status ${code ?? 'unknown'}`)))
  })
}

async function materializeLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    const metadata = await lstat(path)
    if (metadata.isSymbolicLink()) {
      const target = await realpath(path)
      await unlink(path)
      await cp(target, path, { recursive: true, dereference: true })
      if ((await lstat(path)).isDirectory()) await materializeLinks(path)
      continue
    }
    if (metadata.isDirectory()) await materializeLinks(path)
  }
}

async function prunePlatformBinaries(directory, targetPrebuild) {
  // node-pty ships native binaries for every supported operating system and
  // CPU. A release contains only the slice executable on its target host.
  const prebuilds = join(directory, 'node_modules', 'node-pty', 'prebuilds')
  const entries = await readdir(prebuilds, { withFileTypes: true })
  if (!entries.some(entry => entry.isDirectory() && entry.name === targetPrebuild)) {
    throw new Error(`node-pty does not contain the required ${targetPrebuild} prebuild.`)
  }
  for (const entry of entries) {
    if (entry.name === targetPrebuild) continue
    await rm(join(prebuilds, entry.name), { recursive: true, force: true })
  }
}
