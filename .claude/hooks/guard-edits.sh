#!/usr/bin/env bash
# PreToolUse: block edits that AGENTS.md forbids. Exit 2 = blocked, the reason goes back to the agent.
set -uo pipefail
input=$(cat)
path=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=JSON.parse(s).tool_input||{};process.stdout.write(i.file_path||i.notebook_path||"")})')
[[ -z "$path" ]] && exit 0
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
rel="${path#"$root"/}"

block() { echo "Blocked by .claude/hooks/guard-edits.sh: $1 ($rel). See AGENTS.md." >&2; exit 2; }

case "$rel" in
  .env|.env.*|*/.env|*/.env.*) [[ "$rel" == *.env.example ]] || block "never edit .env files" ;;
esac
[[ "$rel" == *.p8 ]] && block "never touch *.p8 keys"
[[ "$rel" == openspec/changes/archive/* ]] && block "the OpenSpec archive is read-only"
[[ "$rel" == apps/mobile/ios/* || "$rel" == apps/mobile/android/* ]] && block "ios/ and android/ are generated; use app.json or a config plugin"

# Tests that already exist on origin/main belong to finished features: never edit them to make code pass.
# New tests on this branch stay editable while you write them.
if [[ "$rel" =~ (\.test\.|\.spec\.|__tests__/|^e2e/flows/) ]]; then
  if git -C "$root" cat-file -e "origin/main:$rel" 2>/dev/null; then
    block "this test exists on main; if it looks wrong, stop and ask Hamid"
  fi
fi
exit 0
