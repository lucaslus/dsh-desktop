# Agent Note: Electron Fedora RPM distribution

Status: implemented

English | [中文](2026-08-27-electron-fedora-rpm-distribution.zh.md)

## Problem

The self-contained Electron release embeds the Harness runtime and native dependencies but produces only macOS DMG and ZIP files. Fedora users can run the Web application from source, yet they cannot install the desktop shell through the operating system package manager.

Native modules make a nominal cross-platform electron-builder target insufficient. A package staged on macOS retains Darwin binaries, and the macOS application-bundle resource directory does not exist in an unpacked Linux application.

## Decision

The Electron distribution supports macOS arm64, macOS x64, and Fedora Linux x86_64 as explicit release targets. Every target is built on a matching operating system and CPU architecture. The shared packaging script rejects cross-builds before staging because the deployed dependency closure must contain native binaries for the target host.

Runtime staging uses pnpm's injected-workspace deployment and an isolated deployment lockfile. Packaging therefore leaves the repository's development dependency installation intact. The deployed `dsh-subprocess-local` locator cannot match the repository-relative build-script approval, so staging runs its reviewed `node-pty` permission repair explicitly.

Runtime staging retains only the matching `node-pty` prebuild. The electron-builder `afterPack` hook copies the Harness closure into `Contents/Resources/harness` inside a macOS application and `resources/harness` inside a Linux application; `process.resourcesPath` locates either result at runtime.

The Linux target produces an unsigned RPM named as the `deepseek-harness-desktop` package. It uses the ordinary Linux window frame and application menu, while macOS retains its inset title bar and application menu. Update instructions name the installer format for the running platform.

The tag release matrix builds both macOS architectures and Linux x64, then attaches DMG, ZIP, and RPM files to one draft release. Pull-request validation builds the RPM on Linux, inspects the embedded Harness entry, and installs the package in a Fedora container. A real Fedora desktop remains the authority for graphics-session behavior.

The source-installed Swift application under `apps/desktop` remains a separate macOS distribution path governed by the [desktop source installation decision](2026-08-14-desktop-source-installation.md).

## Alternatives considered

**Cross-build the RPM on macOS.** electron-builder can assemble some Linux files from another operating system, but pnpm selects native optional dependencies for the build host. Rejecting cross-builds prevents a package that installs successfully and fails when the embedded Host loads a Darwin binary.

**Ship AppImage first.** AppImage reduces package-manager integration and avoids an RPM database entry. The first Linux user owns a Fedora machine, so an RPM provides the shortest path to native installation and dependency resolution.

**Support every RPM architecture.** The release runtime includes architecture-specific Electron, terminal, search, and sandbox binaries. Linux arm64 requires its own runner and verification evidence; accepting it without that evidence would weaken the matching-host rule.

**Use the source-installed desktop workflow on Fedora.** That workflow is a Swift and macOS application-bundle implementation. Reusing the Electron shell preserves one embedded Host and Web UI across the binary desktop releases.

## Consequences

Fedora x86_64 users install a self-contained desktop application without installing Node.js, while local model configuration remains the same custom-provider workflow used on macOS.

Release builds consume one additional Linux job and produce a larger cross-platform release. Fedora package installation is validated automatically, but window-manager, Wayland, X11, GPU, and local-model behavior still require a real Fedora desktop check before publishing a draft release.

Other Linux package formats and Linux arm64 remain unsupported. Adding either requires a matching native build job, package installation evidence, and an update to the explicit target table rather than bypassing its validation.
