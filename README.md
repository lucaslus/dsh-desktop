# DeepSeek Harness Desktop

English | [中文](README.zh.md)

DeepSeek Harness Desktop is a macOS and Fedora desktop app for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It packages the upstream Web UI and its required Node runtime inside a native app, so end users can install it normally without cloning source code or configuring Node.js.

![DeepSeek Harness Desktop](docs/images/deepseek-harness-desktop-hero.png)

## Key enhancements

DeepSeek Harness Desktop brings native desktop ergonomics and usability improvements while maintaining 100% compatibility with upstream DeepSeek Harness:

- 🖥️ **Native macOS and Fedora apps with zero-config setup**: DMG and RPM installers include the runtime—no git clone or Node.js environment configuration required.
- 🔍 **Model search & instant filtering**: Real-time search with smooth 10px rounded corners directly inside the Model Selector dropdown, making it effortless to find and switch models across dozens of configured providers.
- 🎨 **Curated provider brand icons**: Bundled, offline vector brand icons (DeepSeek, OpenAI, Anthropic, Kimi / Moonshot AI, Qwen, MiniMax, Groq, Mistral, etc.) displayed consistently in Settings, the composer model picker, and `/model`.
- ⚡ **CLI to PATH installation**: One-click setup in General Settings to link the `dsh` CLI directly to `~/.local/bin` for system-wide terminal usage.
- 🧩 **Plugin ecosystem & balance monitoring**: Seamlessly supports custom Cordis plugins, including the companion [dsh-balance-plugin](https://github.com/lucaslus/dsh-balance-plugin) to monitor API quotas, token balances, and costs in the desktop UI.

## Install on macOS

Download the matching **DMG** from [GitHub Releases](https://github.com/lucaslus/dsh-desktop/releases): choose **arm64** for Apple Silicon (M-series) Macs or **x64** for Intel Macs. Open it, then drag **DeepSeek Harness** into **Applications**. Because this project does not use an Apple Developer certificate, macOS may require a first-time Control-click → **Open** confirmation. Once installed, Spotlight, Finder, and the Dock can find it normally.

Use **Check for Updates…** in the app menu to open GitHub Releases, download the matching newer DMG, and replace the copy in Applications.

## Install on Fedora

Download the matching **RPM** from [GitHub Releases](https://github.com/lucaslus/dsh-desktop/releases): choose **aarch64** for ARM64 systems or **x86_64** for Intel and AMD systems. Install it with `sudo dnf install ./DeepSeek\ Harness-<version>-<architecture>.rpm`; the application then appears as **DeepSeek Harness** in the desktop application launcher.

Use **Check for Updates…** in the app menu to open GitHub Releases, download the matching newer RPM, and install it with `dnf` to upgrade the application.

For local models, add a custom provider in **Settings → Models** and point its base URL at your OpenAI-compatible endpoint, such as `http://127.0.0.1:PORT/v1`. Omit the API key only if the server allows unauthenticated requests. See the [provider guide](docs/user/guide/providers.md) for configuration details.

## Provider brand icons

Models are easier to scan when each provider carries its recognizable brand mark. DeepSeek Harness Desktop displays bundled provider icons in Settings, the composer model selector, and the `/model` command, so the same model route has a consistent visual identity everywhere.

![Model settings with provider brand icons](docs/images/model-provider-brand-icons.png)

Custom providers are not limited to a generic gateway icon. In **Customized settings**, choose a bundled brand such as Kimi / Moonshot AI, Qwen, MiniMax, OpenAI, Anthropic, or another supported provider. The selection is stored with the provider configuration and is shown everywhere that provider's models can be selected. The bundled catalog works offline and never loads arbitrary remote image URLs.

![Custom provider brand picker](docs/images/custom-provider-brand-picker.png)

## Build installers yourself

For a DMG, run this on macOS with Node.js 24+:

```sh
git clone https://github.com/lucaslus/dsh-desktop.git
cd dsh-desktop
corepack enable
pnpm install --frozen-lockfile
pnpm run build
node apps/electron/scripts/package-mac.mjs
open apps/electron/dist/release/*.dmg
```

For an RPM, run this on Fedora with Node.js 24+:

```sh
git clone https://github.com/lucaslus/dsh-desktop.git
cd dsh-desktop
sudo dnf install rpm-build libxcrypt-compat
corepack enable
pnpm install --frozen-lockfile
pnpm run build
node apps/electron/scripts/package-linux.mjs
sudo dnf install ./apps/electron/dist/release/*.rpm
```

The output folder also contains a ZIP archive for macOS. All builds are unsigned; Gatekeeper warnings and the first-time Control-click → **Open** confirmation are expected on macOS.

## Release process

The release workflow builds separate unsigned Apple Silicon and Intel DMGs and ZIPs plus arm64 and x64 Fedora RPMs. Update `apps/electron/app/package.json` to the release version, then push a matching `electron-v<version>` tag. GitHub Actions installs and exercises each RPM in Fedora 44 before creating a **draft** GitHub Release with every architecture-specific asset. Review the draft and publish it when it is ready. No GitHub Actions secrets or Apple Developer account are required.

## Upstream

This project is a desktop-oriented fork of DeepSeek Harness. The upstream project supplies the harness, Web UI, and plugin architecture; this fork carries the macOS and Fedora desktop shells and release workflow. Upstream source: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).

## Development

Read the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md). For agents, follow [AGENTS.md](AGENTS.md).

For the Electron desktop app on macOS or Linux, run `pnpm run dev:electron` from the repository root. Client changes hot-reload; Electron, Host, and Web shell source changes restart the development window automatically.

## License

[MIT](LICENSE). Third-party licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
