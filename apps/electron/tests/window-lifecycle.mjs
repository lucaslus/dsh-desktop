/** Run the keyless native snapshot with isolated Electron and Harness data directories. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import electron from 'electron'

const directory = await mkdtemp(join(tmpdir(), 'dsh-window-lifecycle-'))
const env = {
  ...process.env,
  DSH_HOME: join(directory, 'harness'),
  DSH_WINDOW_TEST_PROFILE: join(directory, 'electron'),
}
delete env.ELECTRON_RUN_AS_NODE
delete env.DSH_ELECTRON_DEV
const child = spawn(electron, [join(import.meta.dirname, 'fixtures', 'window-lifecycle.mjs')], {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
})
const exited = once(child, 'exit')
let stdout = ''
let stderr = ''
child.stdout.on('data', chunk => { stdout += chunk })
child.stderr.on('data', chunk => { stderr += chunk })

try {
  const [code] = await exited
  assert.equal(code, 0, `${stdout}\n${stderr}`)
  const hostURL = /^HOST_URL (.+)$/m.exec(stdout)?.[1]
  assert.ok(hostURL, `Missing host URL: ${stdout}\n${stderr}`)
  let hostStopped = false
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(hostURL, { signal: AbortSignal.timeout(500) })
    } catch {
      hostStopped = true
      break
    }
    await setTimeout(50)
  }
  assert.ok(hostStopped, 'Local host remains reachable after Quit')
  const transcript = stdout.replace(/^HOST_URL .+\n/m, '') + 'After Quit: local host stopped.\n'
  const expectedURL = new URL('./snapshots/window-lifecycle.expected.txt', import.meta.url)
  if (process.env.DSH_SNAPSHOT === 'refresh') {
    await mkdir(new URL('./snapshots/', import.meta.url), { recursive: true })
    await writeFile(expectedURL, transcript)
  } else {
    const expected = await readFile(expectedURL, 'utf8')
    assert.equal(transcript, expected)
  }
  process.stdout.write(transcript)
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill()
    await exited
  }
  await rm(directory, { recursive: true, force: true })
}
