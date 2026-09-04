# Agent Note: Desktop extensions follow the upstream controller ownership

Status: implemented

English | [中文](2026-09-04-desktop-upstream-controller-integration.zh.md)

## Problem

Desktop extensions share the upstream API and client packages. Retaining a deleted API proxy or dependency-only example after a controller reorganization would give the desktop a second implementation to maintain and could omit plugins from installers.

## Decision

The session controller projects provider brand icons into model catalogs. The Models settings store preserves those icons while joining the live provider registry with configurable providers. Generated Remote validators derive from these owning types rather than a desktop-only schema. The plugin inventory retains upstream preset groups and the desktop profile-removal and CLI-install operations.

Electron stages the shipped CLI with the maintained `dsh-python-runtime-closure` manifest, which supplies dynamically loaded profile plugins and their required peers. Both desktop shells preserve the complete authenticated loopback URL printed by the Host. Desktop CI and development set `DSH_CLIENT_TITLE`; layout and sidebar consume that public build value while preserving the upstream version badge and localized generic fallback. Native close, reopen, single-instance, and explicit-quit behavior stays owned by the Electron main process.

The unused directory-flow package is absent: the workspace UI owns the active directory-picker slots. A separate package must not redeclare those same slots without consumers.

The private Electron staging manifest belongs to the desktop installer sequence, not the upstream npm release family. It must remain private and cannot depend on experimental plugins. Models settings owns the brand-choice labels in its locale module; the shared icon primitive owns only asset rendering. Plugin installation copy also comes from the settings locale dictionaries.

## Alternatives considered

Keeping the deleted API proxy and example manifest would preserve file locations but duplicate upstream ownership and permit dependency drift. Replacing every conflict with upstream content would discard desktop metadata and management operations. The integration instead keeps the current upstream owners and ports the desktop additions into them.

## Consequences

Upstream merges require behavioral checks beyond conflict-marker removal. Catalog, settings, and inventory tests cover retained metadata and actions; the assembled browser and isolated native-window tests cover the installed entry paths. Runtime smoke tests use temporary `DSH_HOME` directories and do not assert compatibility with older user data formats. Linux and both macOS architectures remain separate CI responsibilities.
