# macOS Electron 发布

[English](README.md) | 中文

本目录用于构建可分发的 macOS 应用。应用将生产环境 Harness 的完整依赖闭包嵌入 Electron 外壳，因此用户无需克隆仓库、安装 Node.js 或执行本地构建，即可通过 DMG 安装。

## 本地验证

在仓库根目录运行：

```bash
pnpm install --frozen-lockfile
pnpm run build
node apps/electron/scripts/package-mac.mjs
```

该命令会为当前 Mac 架构创建安装包。显式传入 `arm64` 或 `x64` 可构建对应架构；安装包必须在 CPU 架构相同的 Mac 上构建，以匹配 Harness 的原生依赖。输出位于 `apps/electron/dist/release/`，并且有意由 Git 忽略。

构建机器需要 macOS、Node.js 24 或更高版本以及 Corepack。仓库固定使用 pnpm 11.7.0，因此可通过 `corepack enable` 准备全新的检出目录。

## 开发

在仓库根目录运行：

```bash
pnpm run dev:electron
```

该命令会先构建一次 Web 外壳，监视所有客户端插件，启动 Electron 窗口，并直接从 worktree 运行 Harness Host。客户端改动会在已打开的窗口中热更新。Electron 主进程或 Host／运行时源码改动会重启开发窗口；Web 外壳改动会先重新构建，再重启窗口。在终端按 `Ctrl+C` 可停止 Electron 及其所有监视进程。嵌入式 Host 会传入 `--no-open`，因此环回 Web URL 只会载入 Electron，不会交给系统浏览器。

## 发布约定

推送名为 `electron-v<version>` 的标签会启动 `.github/workflows/electron-release.yml`。工作流分别构建未签名的 Apple Silicon 和 Intel macOS 应用，然后创建一个同时包含 DMG 与 ZIP 产物的 GitHub Release 草稿。DMG 是手动安装包；用户下载架构匹配的新 DMG，并替换 Applications 中的应用即可更新。

创建标签前，请把 `apps/electron/app/package.json` 设为与标签相同的语义版本；例如，版本 `0.0.4` 使用 `electron-v0.0.4` 发布。工作流会拒绝版本不匹配，确保发布标签始终标识其安装包内容。该流程不需要 GitHub Actions 机密或 Apple Developer 账户。每个安装包都可能出现 Gatekeeper 警告。
