# Electron 桌面分发

[English](README.md) | 中文

本目录用于构建面向 macOS arm64、macOS x64 和 Fedora Linux x86_64 的自包含 Electron 应用。每个安装包都嵌入生产环境 Harness 的依赖闭包，因此用户无需克隆仓库或安装 Node.js 即可运行桌面应用。

## 窗口与应用生命周期

窗口关闭按钮和 **File → Close Window** 只隐藏窗口，不退出应用。渲染进程与本地 Harness 宿主继续运行，保留未发送的输入和正在执行的任务。点击 macOS Dock 图标或再次启动应用会恢复原窗口；第二次启动不会再创建一个宿主。**Quit** 会退出应用并停止宿主。在 macOS 上，`⌘W` 关闭窗口，`⌘Q` 退出应用。

## 本地验证

构建必须在操作系统和 CPU 架构与目标匹配的主机上运行，确保 pnpm 选择匹配的原生依赖。产物会写入 `apps/electron/dist/release/`，并且有意由 Git 忽略。

### macOS

在架构匹配的 arm64 或 x64 Mac 上，从仓库根目录运行：

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter deepseek-harness-desktop-electron run package:mac
```

该命令会为当前 Mac 架构创建未签名的 DMG 和 ZIP。构建自动化入口需要显式指定架构时，使用 `package:mac:arm64` 或 `package:mac:x64`。

### Fedora Linux x86_64

在 Fedora Linux x86_64 上，从仓库根目录运行：

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter deepseek-harness-desktop-electron run package:linux:x64
```

该命令会创建未签名的 RPM。构建机器需要 Node.js 24 或更高版本、Corepack 和 RPM 构建工具；仓库固定使用 pnpm 11.7.0。

## 开发

在仓库根目录运行：

```bash
pnpm run dev:electron
```

该命令会先构建一次 Web 外壳，监视所有客户端插件，启动 Electron 窗口，并直接从 worktree 运行 Harness Host。客户端改动会在已打开的窗口中热更新。Electron 主进程或 Host／运行时源码改动会重启开发窗口；Web 外壳改动会先重新构建，再重启窗口。在终端按 `Ctrl+C` 可停止 Electron 及其所有监视进程。嵌入式 Host 会传入 `--no-open`，因此环回 Web URL 只会载入 Electron，不会交给系统浏览器。

准备好暂存运行时后，在桌面图形会话中运行 `pnpm --filter deepseek-harness-desktop-electron run test:window-lifecycle`。这个无需密钥的原生快照使用隔离的数据目录启动实际应用入口和暂存宿主，检查关闭、重新打开和再次启动的行为，并验证 Quit 会停止宿主。使用 `DSH_SNAPSHOT=refresh` 重新生成预期 transcript（文本记录）。单元回归测试通过 `pnpm exec vitest run apps/electron/tests` 运行。

## 发布约定

推送名为 `electron-v<version>` 的标签会启动 `.github/workflows/electron-release.yml`。工作流会构建未签名的 macOS arm64 与 x64 应用以及 Fedora Linux x86_64 RPM，然后创建一个包含所有 DMG、ZIP 和 RPM 产物的 GitHub Release 草稿。用户从 GitHub Releases 安装匹配的包即可手动更新。

创建标签前，请把 `apps/electron/app/package.json` 设为与标签相同的语义版本；例如，版本 `0.0.4` 使用 `electron-v0.0.4` 发布。工作流会拒绝版本不匹配，确保发布标签始终标识其安装包内容。该流程不需要 GitHub Actions 机密或 Apple Developer 账户。安装包和 RPM 均不签名。

`.github/workflows/electron-fedora.yml` 会为 Electron 相关 PR 构建 RPM、验证内嵌 Harness 入口，并在 Fedora 容器中安装该包。发布前仍需在真实 Fedora 桌面上检查图形会话和本地模型端点。
