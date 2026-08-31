# Agent Note: Electron distribution ships native macOS and Fedora installers

Status: implemented

English | [中文](2026-08-31-fedora-electron-rpm-distribution.zh.md)

## Problem

The self-contained Electron distribution supported only macOS. Fedora users could develop the web application from source but had no native desktop installer, application-launcher entry, or release asset containing the production Harness runtime.

The existing staging and packaging scripts also encoded Darwin paths and native dependency names. Reusing those assumptions for Linux could place the Harness outside Electron's Linux resources directory or ship native binaries for the wrong operating system or CPU architecture.

## Decision

The self-contained Electron channel supports macOS and Fedora. macOS releases contain architecture-specific DMG and ZIP assets; Fedora releases contain architecture-specific RPM assets. Both platforms support arm64 and x64, and every package is built on a runner with the same operating system and CPU architecture as its target.

Packaging resolves a target plan before staging. The plan selects the electron-builder target, passes the target operating system and architecture to runtime staging, rejects unsupported or cross-native combinations, and prunes `node-pty` to the matching prebuild. The after-pack hook derives Electron's resources directory from the packager context, so the production Harness is copied to the correct macOS or Linux location.

The Linux application keeps the desktop environment's managed title bar and uses Fedora-specific update instructions. Its RPM declares the standard Electron desktop dependencies plus `alsa-lib` and `mesa-libgbm`, installs a synchronized desktop entry, and remains an unsigned manual installer.

An `electron-v<version>` tag starts one release workflow for both platforms. The workflow builds native arm64 and x64 packages, installs each RPM without weak dependencies in a Fedora 44 container, verifies the desktop entry and packaged Harness CLI, and creates a draft GitHub Release only after every macOS and Fedora job succeeds.

## Alternatives considered

**Ship an AppImage instead of an RPM.** AppImage would cover more Linux distributions with one asset, but it would not provide Fedora's requested `dnf` installation and package-managed desktop integration. It can be added later as a separate target without weakening the RPM validation.

**Cross-build Fedora packages on macOS.** electron-builder can assemble some Linux targets from other hosts, but the Harness contains operating-system- and architecture-specific dependencies. Native runners keep those dependencies and smoke-test results representative of the installed application.

**Publish only x64 Fedora packages.** Limiting the matrix would be cheaper, but would exclude Fedora installations on ARM hardware while the dependency graph already supplies Linux arm64 binaries.

**Replace the [source-installed Swift application](2026-08-14-desktop-source-installation.md).** Removing that channel would reduce duplication, but it would also remove the smaller source-based option for macOS users who build and inspect the repository. The source and self-contained channels retain separate installation tradeoffs.

## Consequences

- The release workflow and draft release wait for four native platform-and-architecture jobs instead of two macOS jobs.
- Fedora downloads are larger than the source-installed macOS shell because each RPM embeds Electron and the production Harness dependency closure.
- Fedora 44 is the validated RPM installation environment; other RPM-based distributions are not claimed as tested targets.
- Updates remain manual and release packages remain unsigned. The application opens GitHub Releases with installer instructions appropriate to its operating system.
