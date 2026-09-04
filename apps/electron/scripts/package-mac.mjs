import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { createPackagePlan } from './package-plan.mjs'

const arch = process.argv[2] ?? process.arch
const plan = createPackagePlan('darwin', arch)

const electronDirectory = join(import.meta.dirname, '..')

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: electronDirectory, env, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with status ${code}`)))
  })
}

await run(process.execPath, plan.stageArguments)

// Public DMGs are intentionally unsigned. Disable keychain discovery so a
// developer's unrelated local certificate never changes a release artifact.
const releaseEnvironment = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
await run(
  join(electronDirectory, 'node_modules', '.bin', 'electron-builder'),
  plan.builderArguments,
  releaseEnvironment,
)
