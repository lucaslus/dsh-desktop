import { spawn } from 'node:child_process'
import { cp, lstat, mkdir, readdir, realpath, rm, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { createPackagePlan } from './package-plan.mjs'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const electronDirectory = resolve(import.meta.dirname, '..')
const stagingDirectory = join(electronDirectory, 'dist', 'harness')
const platform = process.argv[2] ?? process.platform
const arch = process.argv[3] ?? process.arch

createPackagePlan(platform, arch)

await rm(stagingDirectory, { recursive: true, force: true })
await mkdir(dirname(stagingDirectory), { recursive: true })
await run('pnpm', [
  // The maintained executable closure supplies the CLI's dynamically loaded
  // plugins and required peers, which production-only deployment omits otherwise.
  '--filter', 'deepseek-harness-desktop-electron', 'deploy', '--legacy', '--prod',
  '--config.node-linker=hoisted', '--config.auto-install-peers=false',
  '--config.link-workspace-packages=true',
  // The staged deployment is hoisted, while the verified source install is
  // isolated. That intentional difference must not rewrite source node_modules.
  stagingDirectory,
])
// pnpm deploy does not materialize workspace packages supplied through the
// root `link:` overrides. They are runtime dependencies of Cordis, so place
// their already-built production files in the portable closure explicitly.
for (const packageName of ['@deepseek-ai/cosmokit', '@deepseek-ai/schemastery']) {
  const destination = join(stagingDirectory, 'node_modules', packageName)
  await rm(destination, { recursive: true, force: true })
  await cp(
    join(repositoryRoot, 'vendor', packageName.slice('@deepseek-ai/'.length)),
    destination,
    { recursive: true, dereference: true },
  )
}
await materializeLinks(stagingDirectory)
await prunePlatformBinaries(stagingDirectory, platform, arch)

async function run(command, arguments_) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        npm_config_verify_deps_before_run: 'warn',
      },
      stdio: 'inherit',
    })
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

async function prunePlatformBinaries(directory, targetPlatform, targetArch) {
  // node-pty ships native binaries for every supported operating system and
  // CPU. A native release only needs the slice for its target host.
  const prebuilds = join(directory, 'node_modules', 'node-pty', 'prebuilds')
  for (const entry of await readdir(prebuilds, { withFileTypes: true })) {
    if (entry.name === `${targetPlatform}-${targetArch}`) continue
    await rm(join(prebuilds, entry.name), { recursive: true, force: true })
  }
}
