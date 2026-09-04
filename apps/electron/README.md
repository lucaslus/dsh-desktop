# macOS and Fedora Electron distribution

English | [中文](README.zh.md)

This directory builds self-contained macOS and Fedora desktop applications. Each application embeds the production Harness dependency closure in an Electron shell, so a person can install it without cloning the repository, installing Node.js, or running a local build.

## Local verification

From the repository root on macOS:

```bash
pnpm install --frozen-lockfile
pnpm run build
node apps/electron/scripts/package-mac.mjs
```

From the repository root on Fedora:

```bash
sudo dnf install rpm-build libxcrypt-compat
pnpm install --frozen-lockfile
pnpm run build
node apps/electron/scripts/package-linux.mjs
```

Each command creates an installer for the current machine architecture. Pass `arm64` or `x64` explicitly to build that architecture; a package must be built on the same operating system and CPU architecture so its native Harness dependencies match. The output is in `apps/electron/dist/release/` and is intentionally ignored by Git.

The build machine needs Node.js 24 or later and Corepack. The repository pins pnpm 11.7.0, so a fresh checkout can be prepared with `corepack enable`. Fedora packaging additionally needs `rpm-build` and `libxcrypt-compat` for electron-builder's RPM tooling.

## Window lifetime

On macOS and Linux, the window close button and **File → Close Window** hide the window without quitting the application. Running tasks, the local Host, and unsent input stay alive. Click the Dock icon on macOS or launch the application again on Linux to restore the same window. No system tray is required. Close Window uses `⌘W` on macOS and `Ctrl+W` on Linux; **Quit** (`⌘Q` / `Ctrl+Q`) exits the application and stops its Host.

After packaging or staging the runtime, run `node apps/electron/tests/window-lifecycle.mjs` in a graphical session to replay the keyless native lifecycle snapshot. It uses isolated application data and the real staged Host. Desktop branch and release CI run the snapshot on both macOS and Linux architectures, using Xvfb on Linux. This does not replace manual checks under Fedora desktop compositors.

## Development

Run this on macOS or Linux from the repository root:

```bash
pnpm run dev:electron
```

The command builds the web shell once, watches all client plugins, starts an Electron window, and runs the Harness host directly from the workspace. Client changes hot-reload in the open window. Changes to the Electron main process or host/runtime sources restart the development window automatically; changes to the web shell rebuild it and then restart the window. Press `Ctrl+C` in the terminal to stop both Electron and its watchers. The embedded Host passes `--no-open`, so the loopback Web URL loads only inside Electron and is never handed to the system browser.

## Release contract

Pushing a tag named `electron-v<version>` starts `.github/workflows/electron-release.yml`. It builds separate Apple Silicon and Intel macOS applications plus arm64 and x64 Fedora RPMs. Each RPM is installed and exercised in a Fedora 44 container before the workflow creates a draft GitHub Release containing the DMG, ZIP, and RPM assets.

Before tagging, set `apps/electron/app/package.json` to the same semantic version as the tag; for example, version `0.0.4` is released with `electron-v0.0.4`. The workflow rejects mismatches so a release tag always identifies its package contents. macOS DMGs and Fedora RPMs are unsigned manual installers. Users update by choosing **Check for Updates…**, downloading the matching newer installer from GitHub Releases, and replacing or upgrading the installed application. No GitHub Actions secrets or Apple Developer account are required; Gatekeeper warnings are expected for the macOS installers.
