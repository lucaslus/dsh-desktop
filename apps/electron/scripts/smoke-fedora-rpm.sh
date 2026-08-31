#!/usr/bin/env bash
set -euo pipefail

release_dir=${1:?usage: smoke-fedora-rpm.sh RELEASE_DIRECTORY}
shopt -s nullglob
rpm_files=("$release_dir"/*.rpm)
if (( ${#rpm_files[@]} != 1 )); then
  echo "expected exactly one RPM in $release_dir, found ${#rpm_files[@]}" >&2
  exit 1
fi
rpm_file=${rpm_files[0]}

case "$(uname -m)" in
  x86_64) expected_arch=x86_64 ;;
  aarch64) expected_arch=aarch64 ;;
  *) echo "unsupported Fedora smoke architecture: $(uname -m)" >&2; exit 1 ;;
esac
actual_arch=$(rpm -qp --queryformat '%{ARCH}' "$rpm_file")
if [[ $actual_arch != "$expected_arch" ]]; then
  echo "RPM architecture $actual_arch does not match Fedora host $expected_arch" >&2
  exit 1
fi

dnf install -y --setopt=install_weak_deps=False "$rpm_file"
package_name=$(rpm -qp --queryformat '%{NAME}' "$rpm_file")
mapfile -t entries < <(rpm -ql "$package_name" | grep '/resources/harness/node_modules/@deepseek-ai/dsh/lib/bin.js$')
if (( ${#entries[@]} != 1 )); then
  echo "expected one packaged Harness entry, found ${#entries[@]}" >&2
  exit 1
fi
entry=${entries[0]}
runtime_suffix=/resources/harness/node_modules/@deepseek-ai/dsh/lib/bin.js
application_dir=${entry%$runtime_suffix}
executable=$application_dir/dsh-desktop
test -x "$executable"
rpm -ql "$package_name" | grep -q '/usr/share/applications/.*\.desktop$'
version_output=$(ELECTRON_RUN_AS_NODE=1 "$executable" "$entry" --version)
grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+' <<<"$version_output"
