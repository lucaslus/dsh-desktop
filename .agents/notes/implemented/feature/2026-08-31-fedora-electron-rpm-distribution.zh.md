# Agent Note: Electron 发布原生 macOS 与 Fedora 安装包

Status: implemented

[English](2026-08-31-fedora-electron-rpm-distribution.md) | 中文

## 问题

自包含 Electron 发布渠道原本只支持 macOS。Fedora 用户可以从源码开发 Web 应用，但没有原生桌面安装包、应用启动器入口，也没有包含生产环境 Harness 运行时的发布产物。

原有暂存和打包脚本还写死了 Darwin 路径与原生依赖名称。如果 Linux 复用这些假设，Harness 可能会被放到 Electron Linux resources 目录之外，也可能携带操作系统或 CPU 架构不匹配的原生二进制文件。

## 决策

自包含 Electron 渠道支持 macOS 与 Fedora。macOS Release 包含按架构区分的 DMG 和 ZIP 产物；Fedora Release 包含按架构区分的 RPM 产物。两个平台都支持 arm64 与 x64，每个安装包都在操作系统和 CPU 架构与目标相同的 runner 上构建。

打包流程会在暂存前解析目标计划。该计划选择 electron-builder 目标，把目标操作系统和架构传给运行时暂存，拒绝不受支持或跨原生环境的组合，并把 `node-pty` 裁剪为匹配的 prebuild。after-pack 钩子通过 packager 上下文解析 Electron resources 目录，因此生产环境 Harness 会复制到正确的 macOS 或 Linux 位置。

Linux 应用保留桌面环境管理的标题栏，并使用 Fedora 专用的更新说明。RPM 声明标准 Electron 桌面依赖以及 `alsa-lib` 和 `mesa-libgbm`，安装名称同步的桌面入口，并继续采用未签名的手动安装方式。

`electron-v<version>` 标签会为两个平台启动同一套发布工作流。工作流构建原生 arm64 与 x64 安装包，在 Fedora 44 容器中禁用弱依赖安装每个 RPM，验证桌面入口和包内 Harness CLI，并且仅在所有 macOS 与 Fedora job 成功后创建 GitHub Release 草稿。

## 考虑过的替代方案

**使用 AppImage 代替 RPM。** AppImage 可以用一个产物覆盖更多 Linux 发行版，但无法提供所需的 Fedora `dnf` 安装和包管理桌面集成。以后可以把它作为独立目标加入，而不降低 RPM 验证强度。

**在 macOS 上交叉构建 Fedora 安装包。** electron-builder 可以从其他 host 组装部分 Linux 目标，但 Harness 包含操作系统和架构相关依赖。原生 runner 可以确保这些依赖及冒烟测试结果能够代表实际安装的应用。

**只发布 x64 Fedora 安装包。** 缩小矩阵可以降低成本，但会排除 ARM 硬件上的 Fedora 安装，而当前依赖图已经提供 Linux arm64 二进制文件。

**替换[源码安装的 Swift 应用](2026-08-14-desktop-source-installation.zh.md)。** 移除该渠道可以减少重复，但也会移除供自行构建和检查仓库的 macOS 用户使用的较小源码方案。源码渠道与自包含渠道保留各自的安装取舍。

## 后果

- 发布工作流和 Release 草稿需要等待四个原生平台与架构 job，而不再只是两个 macOS job。
- Fedora 下载包大于源码安装的 macOS shell，因为每个 RPM 都内嵌 Electron 和生产环境 Harness 依赖闭包。
- Fedora 44 是经过验证的 RPM 安装环境；其他基于 RPM 的发行版不属于已测试目标。
- 更新仍需手动完成，发布包也仍未签名。应用会打开 GitHub Releases，并显示适合当前操作系统的安装说明。
