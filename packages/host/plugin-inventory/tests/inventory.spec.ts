import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context, FiberState, type Plugin } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import type { AgentPresets } from '@deepseek-ai/dsh-agent-presets'
import PluginInventoryGateway from '../src/index.ts'

const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

const activePlugin: Plugin.Function = () => {}
const pendingPlugin: Plugin.Object = {
  inject: ['neverReady'],
  apply() {},
}

async function harness(): Promise<{
  ctx: Context
  inventory: PluginInventoryGateway
}> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Loader)
  ctx.loader.builtins.active = activePlugin
  ctx.loader.builtins.pending = pendingPlugin
  await ctx.plugin(PluginInventoryGateway)
  const inventory = ctx.get('pluginInventory') as PluginInventoryGateway
  return { ctx, inventory }
}

describe('PluginInventoryGateway', () => {
  it('publishes direct list, install, and remove methods under the pluginInventory namespace', async () => {
    const { inventory } = await harness()
    expect(inventory.typertRemote).toMatchObject({
      serviceKey: 'pluginInventory',
      namespace: 'pluginInventory',
    })
    expect(remoteMethods(inventory)).toEqual([
      { method: 'list', invocation: { kind: 'direct' } },
      { method: 'install', invocation: { kind: 'direct' } },
      { method: 'remove', invocation: { kind: 'direct' } },
    ])
  })

  it('projects current non-group Loader entries without a second cache', async () => {
    const { ctx, inventory } = await harness()
    const activeId = await ctx.loader.create({ name: 'cordis:active' })
    const pendingId = await ctx.loader.create({ name: 'cordis:pending' })
    const disabledId = await ctx.loader.create({
      name: 'cordis:not-installed',
      disabled: true,
    })
    await ctx.loader.create({ name: 'cordis:active', group: true })

    const snapshot = await inventory.list()
    // No agent-preset roster is composed, so the snapshot carries no presets.
    expect(snapshot.agentPresets).toBeUndefined()
    expect(snapshot.entries).toHaveLength(3)
    expect(snapshot.entries).toEqual(expect.arrayContaining([
      {
        entryId: activeId,
        moduleName: 'cordis:active',
        enabled: true,
        fiberPhase: 'active',
      },
      {
        entryId: pendingId,
        moduleName: 'cordis:pending',
        enabled: true,
        fiberPhase: 'pending',
      },
      {
        entryId: disabledId,
        moduleName: 'cordis:not-installed',
        enabled: false,
        fiberPhase: null,
      },
    ]))

    await ctx.loader.update(activeId, { disabled: true })
    expect((await inventory.list()).entries.find(entry => entry.entryId === activeId)).toEqual({
      entryId: activeId,
      moduleName: 'cordis:active',
      enabled: false,
      fiberPhase: null,
    })

    await ctx.loader.remove(pendingId)
    expect((await inventory.list()).entries.some(entry => entry.entryId === pendingId)).toBe(false)
  })

  it('carries each composed preset with root-fiber states mapped to phases', async () => {
    const { ctx, inventory } = await harness()
    ctx.provide('agentPresets', {
      compositionInventory: async () => [
        {
          id: 'standard',
          trust: 'system',
          name: '标准模式',
          isDefault: true,
          rows: [
            { entryId: 'alpha', moduleName: 'pkg-alpha', enabled: true, fiberState: FiberState.ACTIVE },
            { entryId: null, moduleName: 'pkg-file', enabled: 'conditional', condition: 'x' },
          ],
        },
        { id: 'damaged', trust: 'user', isDefault: false, broken: 'the composition file is missing', rows: [] },
      ],
    } as Partial<AgentPresets> as never)

    const snapshot = await inventory.list()
    expect(snapshot.agentPresets).toEqual([
      {
        id: 'standard',
        trust: 'system',
        name: '标准模式',
        isDefault: true,
        rows: [
          { entryId: 'alpha', moduleName: 'pkg-alpha', enabled: true, fiberPhase: 'active' },
          { entryId: null, moduleName: 'pkg-file', enabled: 'conditional', condition: 'x', fiberPhase: null },
        ],
      },
      { id: 'damaged', trust: 'user', isDefault: false, broken: 'the composition file is missing', rows: [] },
    ])
  })

  it('installs a valid bundle from local directory into profile', async () => {
    const tmpHome = await mkdtemp(join(tmpdir(), 'dsh-home-test-'))
    const profileDir = join(tmpHome, 'profiles', 'web')
    await mkdir(profileDir, { recursive: true })
    const pluginDir = await mkdtemp(join(tmpdir(), 'dsh-bundle-test-'))
    process.env.DSH_HOME = tmpHome
    try {
      await writeFile(join(profileDir, 'package.json'), JSON.stringify({ name: 'profile-pkg' }, null, 2))
      await writeFile(join(pluginDir, 'package.json'), JSON.stringify({
        name: '@test/my-bundle',
        dsh: { bundle: true },
      }, null, 2))
      const { inventory } = await harness()
      const result = await inventory.install({ source: pluginDir })
      expect(result).toEqual({ ok: true, name: '@test/my-bundle', restartRequired: true })

      const updated = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8')) as {
        dependencies: Record<string, string>
        dsh: { profile: { bundles: string[] } }
      }
      expect(updated.dependencies['@test/my-bundle']).toBe(`link:${pluginDir}`)
      expect(updated.dsh.profile.bundles).toContain('@test/my-bundle')

      const removeResult = await inventory.remove({ name: '@test/my-bundle' })
      expect(removeResult).toEqual({ ok: true, name: '@test/my-bundle', restartRequired: true })

      const removedPkg = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>
        dsh?: { profile?: { bundles?: string[] } }
      }
      expect(removedPkg.dependencies?.['@test/my-bundle']).toBeUndefined()
      expect(removedPkg.dsh?.profile?.bundles).not.toContain('@test/my-bundle')
    } finally {
      delete process.env.DSH_HOME
      await rm(tmpHome, { recursive: true, force: true })
      await rm(pluginDir, { recursive: true, force: true })
    }
  })

  it('rejects invalid or non-bundle sources when installing', async () => {
    const tmpHome = await mkdtemp(join(tmpdir(), 'dsh-home-test-'))
    const profileDir = join(tmpHome, 'profiles', 'web')
    await mkdir(profileDir, { recursive: true })
    const pluginDir = await mkdtemp(join(tmpdir(), 'dsh-bundle-test-'))
    process.env.DSH_HOME = tmpHome
    try {
      await writeFile(join(profileDir, 'package.json'), JSON.stringify({ name: 'profile-pkg' }, null, 2))
      const { inventory } = await harness()

      const notFound = await inventory.install({ source: join(pluginDir, 'non-existent') })
      expect(notFound).toMatchObject({ ok: false, error: 'install-failed' })

      await writeFile(join(pluginDir, 'package.json'), JSON.stringify({ name: 'not-a-bundle' }, null, 2))
      const notBundle = await inventory.install({ source: pluginDir })
      expect(notBundle).toMatchObject({ ok: false, error: 'not-a-bundle' })

      await writeFile(join(pluginDir, 'package.json'), JSON.stringify({}, null, 2))
      const noName = await inventory.install({ source: pluginDir })
      expect(noName).toMatchObject({ ok: false, error: 'missing-manifest' })
    } finally {
      delete process.env.DSH_HOME
      await rm(tmpHome, { recursive: true, force: true })
      await rm(pluginDir, { recursive: true, force: true })
    }
  })
})
