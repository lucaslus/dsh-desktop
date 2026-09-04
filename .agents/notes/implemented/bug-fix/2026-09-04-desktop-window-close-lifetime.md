# Agent Note: Desktop window close is separate from application quit

Status: implemented

English | [中文](2026-09-04-desktop-window-close-lifetime.zh.md)

## Problem

Closing the desktop window terminates its application-owned Harness host, interrupting work when the user only wants to dismiss the window. Keeping a background application without a reopening path also leaves users unable to return to their work.

## Decision

The [Electron application](../../../../apps/electron/README.md) hides its window on ordinary close and retains the renderer and host. Dock activation and a second launch show and focus that window, restoring it if minimized. A single-instance lock prevents a second launch from starting a duplicate host. Explicit Quit allows window destruction and runs host cleanup. Readiness remains application-owned so a replacement window can load the existing host even if readiness arrived without a window.

The [native macOS shell](../../../../apps/desktop/README.md) retains its AppKit window and Web view after closing, reopens them through the application delegate, and terminates its host only during application termination. Both shells expose Close Window separately from Quit.

This decision concerns window lifetime, not the separate [source installation](../feature/2026-08-14-desktop-source-installation.md) and [Electron distribution](../feature/2026-08-31-fedora-electron-rpm-distribution.md) decisions; those records retain their installation and packaging rationale.

## Alternatives considered

**Destroy the renderer on every close.** Keeping only the host reduces idle memory use, but discards unsent input and renderer-local state. Retaining the window preserves both without adding state serialization.

**Keep the application alive without handling activation.** Removing automatic Quit alone leaves hidden applications difficult to reopen and permits duplicate hosts when launched again, particularly outside macOS.

## Consequences

Window dismissal does not cancel running tasks. The retained renderer consumes memory until explicit Quit, and Linux users without a visible window reopen it through the application launcher. This change does not introduce a system tray or a background scheduling service.

Focused macOS and Linux unit tests cover startup close, host readiness without a window, activation, minimized restoration, single-instance rejection, and explicit Quit. The native Electron snapshot uses the shipping entry and real staged host to verify hidden startup, the Close Window menu, second-process reopening, and host shutdown without a model key. CI runs the native snapshot on both macOS and Linux architectures, using Xvfb for Linux. Native Swift compilation checks the delegate API; macOS Dock interaction for the Swift shell and Fedora window-manager behavior remain manual verification gaps.
