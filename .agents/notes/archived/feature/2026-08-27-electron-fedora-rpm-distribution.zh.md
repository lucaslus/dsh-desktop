# Agent Note: Electron Fedora RPM 分发

Status: implemented
Archived: 2026-09-04

[English](2026-08-27-electron-fedora-rpm-distribution.md) | 中文

## 问题

自包含 Electron release 嵌入 Harness 运行时和原生依赖，但只生成 macOS DMG 与 ZIP 文件。Fedora 用户可以从源码运行 Web 应用，却不能通过操作系统包管理器安装桌面外壳。

原生模块意味着仅添加一个名义上的跨平台 electron-builder 构建目标并不足够。在 macOS 上暂存的包会保留 Darwin 二进制文件，而且 macOS 应用包的资源目录不存在于解包后的 Linux 应用中。

## 决策

Electron 分发支持 macOS arm64、macOS x64 和 Fedora Linux x86_64 三个显式 release 目标。每个目标都在操作系统和 CPU 架构匹配的主机上构建。共享打包脚本会在暂存前拒绝交叉构建，因为部署后的依赖闭包必须包含目标主机的原生二进制文件。

运行时暂存使用 pnpm 注入工作区包的部署方式和隔离的部署锁文件，因此打包不会改变仓库的开发依赖安装状态。部署后的 `dsh-subprocess-local` 定位符无法匹配仓库相对路径形式的构建脚本许可，所以暂存过程会显式执行已经审查的 `node-pty` 权限修复。

运行时暂存只保留匹配的 `node-pty` 预构建文件。electron-builder `afterPack` 钩子将 Harness 闭包复制到 macOS 应用内的 `Contents/Resources/harness`，或者 Linux 应用内的 `resources/harness`；运行时通过 `process.resourcesPath` 定位两种结果。

Linux 目标生成包名为 `deepseek-harness-desktop` 的未签名 RPM。它使用常规 Linux 窗口边框和应用菜单，macOS 则保留内嵌标题栏与应用菜单。更新说明会根据运行平台写明安装包格式。

标签 release 矩阵构建两种 macOS 架构和 Linux x64，然后将 DMG、ZIP 和 RPM 文件附加到同一个 release 草稿。PR（Pull Request）验证会在 Linux 上构建 RPM、检查内嵌 Harness 入口，并在 Fedora 容器中安装该包。真实 Fedora 桌面仍是图形会话行为的权威验证环境。

`apps/desktop` 下从源码安装的 Swift 应用仍是独立的 macOS 分发路径，由[桌面源码安装决策](2026-08-14-desktop-source-installation.zh.md)约束。

## 考虑过的替代方案

**在 macOS 上交叉构建 RPM。** electron-builder 可以从其他操作系统组装部分 Linux 文件，但 pnpm 会为构建主机选择原生可选依赖。拒绝交叉构建可以避免安装成功、但内嵌 Host 加载 Darwin 二进制文件时失败的包。

**先发布 AppImage。** AppImage 会减少包管理器集成，且不会产生 RPM 数据库条目。首位 Linux 用户使用 Fedora，因此 RPM 是获得原生安装和依赖解析的最短路径。

**支持所有 RPM 架构。** release 运行时包含架构相关的 Electron、终端、搜索和沙箱二进制文件。Linux arm64 需要自己的 runner 和验证证据；在没有这些证据时接受它会削弱匹配主机规则。

**在 Fedora 上使用源码安装桌面工作流。** 该工作流是 Swift 与 macOS 应用包实现。复用 Electron 外壳可以让二进制桌面 release 在不同平台上共享同一个内嵌 Host 和 Web UI。

## 后果

Fedora x86_64 用户无需安装 Node.js 即可安装自包含桌面应用，本地模型配置仍使用与 macOS 相同的自定义提供方工作流。

release 构建会多占用一个 Linux job，并生成更大的跨平台 release。Fedora 包安装会自动验证，但窗口管理器、Wayland、X11、GPU 和本地模型行为仍需在发布 release 草稿前通过真实 Fedora 桌面检查。

其他 Linux 包格式和 Linux arm64 仍不受支持。添加其中任一项都需要匹配的原生构建 job、包安装证据，并更新显式目标表，而不是绕过其验证。
