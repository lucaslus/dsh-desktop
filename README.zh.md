# DeepSeek Harness Desktop

[English](README.md) | 中文

DeepSeek Harness Desktop 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 面向 macOS 与 Fedora Linux 的桌面应用。它将上游 Web UI 和所需的 Node 运行时打包进原生应用，用户无需 clone 源码或自行配置 Node.js。

![DeepSeek Harness Desktop](docs/images/deepseek-harness-desktop-hero.png)

## 核心新增能力

DeepSeek Harness Desktop 在保持与官方 DeepSeek Harness 100% 架构兼容的同时，针对桌面端交互与易用性做了全方位增强：

- 🖥️ **原生桌面应用与零配置开箱即用**：macOS 使用 DMG 安装，Fedora Linux 使用 RPM 安装，两种包都内置完整运行时。
- 🔍 **模型搜索与实时快速过滤**：在聊天输入框的模型下拉选择面板中内置无边框搜索框与 10px 柔和圆角，轻松在数十个 Provider 和大量模型中秒级过滤与切换。
- 🎨 **内置精选 Provider 品牌图标**：内置离线矢量品牌图标（DeepSeek、OpenAI、Anthropic、Kimi / 月之暗面、通义千问、MiniMax、Groq、Mistral 等），在设置页、输入框和 `/model` 统一提供清晰的视觉识别。
- ⚡ **一键安装 CLI 到系统 PATH**：在通用设置中提供一键将 `dsh` 命令行工具软链接至 `~/.local/bin` 的能力，方便在独立终端中随时唤起命令行。
- 🧩 **生态插件开箱即用与余额监控**：完美支持 Cordis 插件体系，可无缝配合配套开发的 [dsh-balance-plugin](https://github.com/lucaslus/dsh-balance-plugin) 插件，在桌面端实时查看各模型提供方的 API 额度、Token 余额与调用消耗。

## 安装

### macOS

从 [GitHub Releases](https://github.com/lucaslus/dsh-desktop/releases) 下载对应架构的 **DMG**：Apple Silicon（M 系列）选择 **arm64**，Intel Mac 选择 **x64**。打开后将 **DeepSeek Harness** 拖进 **Applications**。项目不使用 Apple Developer 证书，因此 macOS 首次打开可能需要 Control-click → **打开** 确认；之后可通过 Finder、Spotlight 和 Dock 正常使用。

应用菜单中的 **Check for Updates…** 会打开 GitHub Releases；下载对应的新 DMG 并替换 Applications 中的应用即可更新。

### Fedora Linux x86_64

从包含 Fedora 产物的 [GitHub Release](https://github.com/lucaslus/dsh-desktop/releases) 下载 **RPM**，然后通过图形软件管理器或终端安装：

```sh
sudo dnf install ./DeepSeek\ Harness-*.rpm
```

RPM 会安装桌面入口、应用图标、Electron 外壳和内嵌 Harness 运行时，无需另行安装 Node.js。

应用直接运行在 Fedora 主机上，因此可以通过 `http://127.0.0.1:PORT/v1` 之类的回环地址访问本地 OpenAI 兼容模型服务。在**设置 → 模型**中选择**添加自定义提供方**，填写端点和模型 id；只有服务端允许无认证请求时才省略 API Key。详细步骤见[模型配置指南](docs/user/guide/providers.zh.md)。

## 模型提供方品牌图标

通过品牌图标可以更快辨认模型来自哪个提供方。DeepSeek Harness Desktop 会在设置页、聊天输入框的模型选择器和 `/model` 命令中展示同一套提供方图标，让同一模型路由在所有入口都有一致的视觉标识。

![模型设置中的提供方品牌图标](docs/images/model-provider-brand-icons.png)

自定义 Provider 不必再使用通用网关图标。在 **自定义设置** 中可选择内置品牌，例如 Kimi / Moonshot AI、Qwen、MiniMax、OpenAI、Anthropic 等。选择会与 Provider 配置一同保存，并在所有模型选择入口生效。图标目录随应用内置、离线可用，且不会加载任意远程图片 URL。

![自定义 Provider 品牌图标选择器](docs/images/custom-provider-brand-picker.png)

## 自行构建安装包

### macOS

在安装 Node.js 24+ 的 macOS 上运行：

```sh
git clone https://github.com/lucaslus/dsh-desktop.git
cd dsh-desktop
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter deepseek-harness-desktop-electron run package:mac
```

产物在 `apps/electron/dist/release/` 中。DMG 用于手动安装，ZIP 是备用压缩包。所有构建均不签名，Gatekeeper 提示及首次 Control-click → **打开** 确认属于正常现象。

### Fedora Linux x86_64

在装有 Node.js 24 或更高版本、Corepack 和 RPM 构建工具的 Fedora x86_64 上运行：

```sh
git clone https://github.com/lucaslus/dsh-desktop.git
cd dsh-desktop
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter deepseek-harness-desktop-electron run package:linux:x64
```

RPM 会写入 `apps/electron/dist/release/`。打包必须在 Linux x86_64 上运行，确保每个内嵌原生依赖都与目标系统匹配。

## 发布流程

发布工作流会构建未签名的 Apple Silicon 与 Intel macOS 安装包，以及 Fedora Linux x86_64 RPM。先将 `apps/electron/app/package.json` 的版本更新为目标版本，再推送对应的 `electron-v<version>` tag。GitHub Actions 会创建包含所有安装包的**草稿** GitHub Release。在真实目标桌面确认产物后手动发布；不需要 GitHub Actions Secret 或 Apple Developer 账号。

## Upstream

本项目是面向桌面端的 DeepSeek Harness fork。upstream 项目提供 harness、Web UI 和插件架构；本 fork 维护原生桌面外壳和发布工作流。upstream 源码：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。

## 开发

请阅读[开发指南](docs/development.zh.md)和[架构文档](docs/architecture.zh.md)。面向 agent，请遵循 [AGENTS.md](AGENTS.md)。

开发 Electron 桌面端可在仓库根目录运行 `pnpm run dev:electron`。客户端改动会热更新；Electron、Host 与 Web shell 的源码改动会自动重启开发窗口。

## 许可证

[MIT](LICENSE)。第三方许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
