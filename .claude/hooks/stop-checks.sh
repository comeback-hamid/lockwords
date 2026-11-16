#!/usr/bin/env bash
# Stop: run tests, typecheck and lint for each app with uncommitted or branch changes. Red = keep working.
set -uo pipefail
input=$(cat)
# shortcut: after one blocked stop we let the agent stop, to avoid an endless loop; it must report the red checks.
if printf '%s' "$input" | grep -q '"stop_hook_active":[[:space:]]*true'; then exit 0; fi
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
cd "$root"
base=$(git merge-base HEAD origin/main 2>/dev/null || git rev-list --max-parents=0 HEAD 2>/dev/null | tail -1)
changed=$( { git diff --name-only ${base:+"$base"}; git diff --name-only; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u)
fail=""
for app in mobile server; do
  grep -q "^apps/$app/" <<<"$changed" || continue
  for s in test typecheck lint; do
    out=$(npm run "$s" -w "@lockwords/$app" 2>&1) || fail+=$'\n'"--- $app: npm run $s failed ---"$'\n'"$(tail -30 <<<"$out")"
  done
done
if [[ -n "$fail" ]]; then
  echo "Checks are red. Fix them before you stop:$fail" >&2
  exit 2
fi
exit 0
