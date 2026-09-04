# Electron desktop distribution

English | [中文](README.zh.md)

This directory builds the self-contained Electron application for macOS arm64, macOS x64, and Fedora Linux x86_64. Each installer embeds the production Harness dependency closure, so a person can run the desktop application without cloning the repository or installing Node.js.

## Window and application lifetime

The window close button and **File → Close Window** hide the window without quitting the application. The renderer and local Harness host remain running, preserving unsent input and active tasks. Clicking the macOS Dock icon or launching the application again restores the existing window; a second launch does not start another host. **Quit** exits the application and stops its host. On macOS, `⌘W` closes the window and `⌘Q` quits.

## Local verification

Builds must run on a host with the target operating system and CPU architecture so pnpm selects the matching native dependencies. The output is written to `apps/electron/dist/release/` and is intentionally ignored by Git.

### macOS

From the repository root on a matching arm64 or x64 Mac:

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter deepseek-harness-desktop-electron run package:mac
```

This creates an unsigned DMG and ZIP for the current Mac architecture. Use `package:mac:arm64` or `package:mac:x64` when a build automation entry must name the architecture explicitly.

### Fedora Linux x86_64

From the repository root on Fedora Linux x86_64:

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter deepseek-harness-desktop-electron run package:linux:x64
```

This creates an unsigned RPM. The build machine needs Node.js 24 or later, Corepack, and RPM build tools; the repository pins pnpm 11.7.0.

## Development

Run this from the repository root:

```bash
pnpm run dev:electron
```

The command builds the web shell once, watches all client plugins, starts an Electron window, and runs the Harness host directly from the workspace. Client changes hot-reload in the open window. Changes to the Electron main process or host/runtime sources restart the development window automatically; changes to the web shell rebuild it and then restart the window. Press `Ctrl+C` in the terminal to stop both Electron and its watchers. The embedded Host passes `--no-open`, so the loopback Web URL loads only inside Electron and is never handed to the system browser.

After staging the runtime, run `pnpm --filter deepseek-harness-desktop-electron run test:window-lifecycle` in a desktop graphics session. This keyless native snapshot boots the shipping entry and staged host with isolated data directories, checks close/reopen/second-launch behavior, and verifies that Quit stops the host. Use `DSH_SNAPSHOT=refresh` to regenerate its expected transcript. Unit regressions run with `pnpm exec vitest run apps/electron/tests`.

## Release contract

Pushing a tag named `electron-v<version>` starts `.github/workflows/electron-release.yml`. It builds unsigned macOS arm64 and x64 applications plus the Fedora Linux x86_64 RPM, then creates one draft GitHub Release containing every DMG, ZIP, and RPM asset. Users update manually by installing the matching package from GitHub Releases.

Before tagging, set `apps/electron/app/package.json` to the same semantic version as the tag; for example, version `0.0.4` is released with `electron-v0.0.4`. The workflow rejects mismatches so a release tag always identifies its package contents. No GitHub Actions secrets or Apple Developer account are required. The installers and RPM are unsigned.

`.github/workflows/electron-fedora.yml` builds the RPM for Electron-related pull requests, verifies the embedded Harness entry, and installs the package in a Fedora container. Publishing still requires a real Fedora desktop check for the graphics session and local model endpoint.
