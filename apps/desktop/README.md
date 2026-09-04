# desktop/ — native macOS shell (MVP)

English | [中文](README.zh.md)

A direction-validation prototype for the desktop form of the GUI: a thin native AppKit window (`WKWebView`) around the existing Web host. It implements the "thin native shell + `dsh web` subprocess" option without changing the [Web client protocol](../../docs/subsystems/web-client.md).

The shell deliberately embeds **no Node runtime in `DSH.app`**. The installer first reuses an existing Node.js 24.15.0 runtime, otherwise downloads the verified archive into `apps/desktop/.runtime/node`; Finder and Dock launches prefer that managed runtime, then fall back to a compatible user-installed Node (`^22.19.0 || >=24.0.0`).

## Behavior

Closing the window, including `⌘W`, keeps the application and local host running. Clicking the Dock icon reopens the retained window and Web view. **Quit** or `⌘Q` exits the application and stops the host.

1. Resolves the repository root (`DSH_REPO` env override, else the in-tree bundle location).
2. Prefers the installer-managed Node runtime, then searches the env PATH, the user's login-shell PATH (covers Homebrew/nvm), and common prefixes; rejects unsatisfied versions with an install prompt.
3. Spawns the built in-tree host, or a user-installed `dsh` command when no checkout is available.
4. Waits for the `dsh web: http://127.0.0.1:<port>/?token=...` readiness line, which prints only after the full plugin tree settles, then loads the complete authenticated URL in the `WKWebView`.
5. Mirrors the Web theme into the native chrome (`ThemeBridge`): a transparent title bar painted with the sidebar fill token and a window appearance that follows the resolved light/dark theme, so the left edge reads as one continuous surface.
6. Places a native interaction strip across the transparent title bar for window dragging and the system-configured double-click action (zoom by default).
7. Lets a source checkout update itself through **Update and Restart…**: `git pull --ff-only`, dependency install, Web build, app rebuild, and relaunch.

## Build and run

```sh
git clone https://github.com/lucaslus/deepseek-harness-desktop.git
cd deepseek-harness-desktop
bash apps/desktop/install.sh
```

The bootstrap baseline is **Node.js 24.15.0** and **pnpm 11.7.0**. `install.sh` reuses an exact existing Node runtime when it includes Corepack; otherwise it verifies the official Node.js checksum and downloads a managed runtime into `apps/desktop/.runtime`. Its terminal UI reports only animated high-level stages; each command's full output is written to `~/Library/Logs/DeepSeek Harness Desktop/` and is surfaced on failure. It uses Corepack to run the pinned pnpm release before installing, building, and opening the app. It also asks whether to add a Finder-visible `/Applications/DeepSeek Harness.app` copy. The copy contains only the small native shell and records its source checkout; each app update rebuilds and refreshes it. The bundle is ad-hoc signed and includes `Resources/icon.icns`; no release runtime or Node bundle is published. The host listens on loopback only.

## Known MVP limits

- Web content extends beneath the transparent, theme-following title bar; the native title-bar region owns window dragging and double-clicks, and there is no vibrancy yet.
- Updating requires a clean Git checkout with a reachable `origin`; conflicts or uncommitted changes are surfaced instead of overwritten.
- Host crash shows a retry surface but no automatic restart.
- macOS only; Windows/Linux shells are separate work.
