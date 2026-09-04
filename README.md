# DeepSeek Harness Desktop

English | [中文](README.zh.md)

DeepSeek Harness Desktop is a desktop app for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) on macOS and Fedora Linux. It packages the upstream Web UI and its required Node runtime inside a native app, so end users can install it normally without cloning source code or configuring Node.js.

![DeepSeek Harness Desktop](docs/images/deepseek-harness-desktop-hero.png)

## Key enhancements

DeepSeek Harness Desktop brings native desktop ergonomics and usability improvements while maintaining 100% compatibility with upstream DeepSeek Harness:

- 🖥️ **Native desktop app & zero-config setup**: DMG installation on macOS and RPM installation on Fedora Linux, with the complete runtime bundled in either package.
- 🔍 **Model search & instant filtering**: Real-time search with smooth 10px rounded corners directly inside the Model Selector dropdown, making it effortless to find and switch models across dozens of configured providers.
- 🎨 **Curated provider brand icons**: Bundled, offline vector brand icons (DeepSeek, OpenAI, Anthropic, Kimi / Moonshot AI, Qwen, MiniMax, Groq, Mistral, etc.) displayed consistently in Settings, the composer model picker, and `/model`.
- ⚡ **CLI to PATH installation**: One-click setup in General Settings to link the `dsh` CLI directly to `~/.local/bin` for system-wide terminal usage.
- 🧩 **Plugin ecosystem & balance monitoring**: Seamlessly supports custom Cordis plugins, including the companion [dsh-balance-plugin](https://github.com/lucaslus/dsh-balance-plugin) to monitor API quotas, token balances, and costs in the desktop UI.

## Install

### macOS

Download the matching **DMG** from [GitHub Releases](https://github.com/lucaslus/dsh-desktop/releases): choose **arm64** for Apple Silicon (M-series) Macs or **x64** for Intel Macs. Open it, then drag **DeepSeek Harness** into **Applications**. Because this project does not use an Apple Developer certificate, macOS may require a first-time Control-click → **Open** confirmation. Once installed, Spotlight, Finder, and the Dock can find it normally.

Use **Check for Updates…** in the app menu to open GitHub Releases, download the matching newer DMG, and replace the copy in Applications.

### Fedora Linux x86_64

Download the **RPM** from a [GitHub Release](https://github.com/lucaslus/dsh-desktop/releases) that includes the Fedora asset, then install it with the graphical software manager or from a terminal:

```sh
sudo dnf install ./DeepSeek\ Harness-*.rpm
```

The RPM installs the desktop entry, application icon, Electron shell, and embedded Harness runtime. No separate Node.js installation is required.

The application runs directly on the Fedora host, so a local OpenAI-compatible model server is reachable through a loopback URL such as `http://127.0.0.1:PORT/v1`. In **Settings → Models**, choose **Add a custom provider**, enter the endpoint and model id, and omit the API key only when the server accepts unauthenticated requests; see the [model configuration guide](docs/user/guide/providers.md).

## Provider brand icons

Models are easier to scan when each provider carries its recognizable brand mark. DeepSeek Harness Desktop displays bundled provider icons in Settings, the composer model selector, and the `/model` command, so the same model route has a consistent visual identity everywhere.

![Model settings with provider brand icons](docs/images/model-provider-brand-icons.png)

Custom providers are not limited to a generic gateway icon. In **Customized settings**, choose a bundled brand such as Kimi / Moonshot AI, Qwen, MiniMax, OpenAI, Anthropic, or another supported provider. The selection is stored with the provider configuration and is shown everywhere that provider's models can be selected. The bundled catalog works offline and never loads arbitrary remote image URLs.

![Custom provider brand picker](docs/images/custom-provider-brand-picker.png)

## Build an installer yourself

### macOS

On macOS with Node.js 24+:

```sh
git clone https://github.com/lucaslus/dsh-desktop.git
cd dsh-desktop
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter deepseek-harness-desktop-electron run package:mac
```

The output folder also contains a ZIP archive. All builds are unsigned; Gatekeeper warnings and the first-time Control-click → **Open** confirmation are expected.

### Fedora Linux x86_64

On Fedora x86_64 with Node.js 24 or later, Corepack, and RPM build tools:

```sh
git clone https://github.com/lucaslus/dsh-desktop.git
cd dsh-desktop
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter deepseek-harness-desktop-electron run package:linux:x64
```

The RPM is written to `apps/electron/dist/release/`. Packaging must run on Linux x86_64 so every embedded native dependency matches the target system.

## Release process

The release workflow builds unsigned Apple Silicon and Intel macOS installers plus a Fedora Linux x86_64 RPM. Update `apps/electron/app/package.json` to the release version, then push a matching `electron-v<version>` tag. GitHub Actions creates a **draft** GitHub Release containing every installer. Review the draft on real target desktops before publishing it. No GitHub Actions secrets or Apple Developer account are required.

## Upstream

This project is a desktop-oriented fork of DeepSeek Harness. The upstream project supplies the harness, Web UI, and plugin architecture; this fork carries the native desktop shell and release workflow. Upstream source: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).

## Development

Read the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md). For agents, follow [AGENTS.md](AGENTS.md).

For the Electron desktop app, run `pnpm run dev:electron` from the repository root. Client changes hot-reload; Electron, Host, and Web shell source changes restart the development window automatically.

## License

[MIT](LICENSE). Third-party licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
