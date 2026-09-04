# macOS 与 Fedora Electron 发布

[English](README.md) | 中文

本目录用于构建自包含的 macOS 与 Fedora 桌面应用。每个应用都把生产环境 Harness 的完整依赖闭包嵌入 Electron shell，因此用户无需克隆仓库、安装 Node.js 或执行本地构建即可安装。暂存流程通过持续维护的 `dsh-python-runtime-closure` 清单提供 CLI 动态加载的插件及其必需的 peer 依赖。

## 本地验证

在 macOS 的仓库根目录运行：

```bash
pnpm install --frozen-lockfile
DSH_CLIENT_TITLE='DSH Desktop' pnpm run build
node apps/electron/scripts/package-mac.mjs
```

在 Fedora 的仓库根目录运行：

```bash
sudo dnf install rpm-build libxcrypt-compat
pnpm install --frozen-lockfile
DSH_CLIENT_TITLE='DSH Desktop' pnpm run build
node apps/electron/scripts/package-linux.mjs
```

每条命令都会为当前机器架构创建安装包。显式传入 `arm64` 或 `x64` 可构建对应架构；安装包必须在操作系统与 CPU 架构均相同的机器上构建，以匹配 Harness 的原生依赖。输出位于 `apps/electron/dist/release/`，并且有意由 Git 忽略。

构建机器需要 Node.js 24 或更高版本以及 Corepack。仓库固定使用 pnpm 11.7.0，因此可通过 `corepack enable` 准备全新的检出目录。Fedora 打包还需要 `rpm-build` 和 `libxcrypt-compat`，供 electron-builder 的 RPM 工具使用。

## 窗口生命周期

在 macOS 和 Linux 上，窗口关闭按钮和 **File → Close Window** 只隐藏窗口，不退出应用。正在运行的任务、本地 Host 和未发送的输入都会保留。在 macOS 上点击 Dock 图标，或在 Linux 上再次启动应用，即可恢复同一个窗口，无需系统托盘。Close Window 的快捷键在 macOS 上是 `⌘W`，在 Linux 上是 `Ctrl+W`；**Quit**（`⌘Q` / `Ctrl+Q`）才会退出应用并停止 Host。

完成打包或暂存运行时后，在图形会话中运行 `node apps/electron/tests/window-lifecycle.mjs`，即可重放无需模型密钥的原生生命周期快照。它使用隔离的应用数据和真实的暂存 Host。桌面应用的分支与发布 CI 都会在 macOS 和 Linux 的两种架构上运行快照，Linux 使用 Xvfb。这不能替代 Fedora 桌面合成器下的手动检查。

## 开发

在 macOS 或 Linux 的仓库根目录运行：

```bash
pnpm run dev:electron
```

该命令会先构建一次 Web shell，监视所有客户端插件，启动 Electron 窗口，并直接从 worktree 运行 Harness Host。客户端改动会在已打开的窗口中热更新。Electron 主进程或 Host／运行时源码改动会重启开发窗口；Web shell 改动会先重新构建，再重启窗口。在终端按 `Ctrl+C` 可停止 Electron 及其所有监视进程。嵌入式 Host 会传入 `--no-open`，因此环回 Web URL 只会载入 Electron，不会交给系统浏览器。桌面壳保留包含 token 的完整 URL，由 Web 应用将该 token 换取为已认证会话。

## 发布约定

私有暂存工作区不参与上游 npm 发布族；桌面版本与 `electron-v` 标签独立于内嵌的 Harness 版本。

推送名为 `electron-v<version>` 的标签会启动 `.github/workflows/electron-release.yml`。工作流分别构建 Apple Silicon 与 Intel macOS 应用，以及 arm64 与 x64 Fedora RPM。每个 RPM 都会先在 Fedora 44 容器中完成安装与运行验证，随后工作流创建包含 DMG、ZIP 和 RPM 产物的 GitHub Release 草稿。

创建标签前，请把 `apps/electron/app/package.json` 设为与标签相同的语义版本；例如，版本 `0.0.4` 使用 `electron-v0.0.4` 发布。工作流会拒绝版本不匹配，确保发布标签始终标识其安装包内容。macOS DMG 与 Fedora RPM 都是未签名的手动安装包。用户可选择 **Check for Updates…**，从 GitHub Releases 下载架构匹配的新安装包，并替换或升级已安装的应用。该流程不需要 GitHub Actions 机密或 Apple Developer 账户；macOS 安装包出现 Gatekeeper 警告属于正常现象。
