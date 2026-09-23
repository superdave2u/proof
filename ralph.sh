#!/usr/bin/env bash
# Ralph Wiggum loop — build mode.
# Usage: ./ralph.sh
# Config: .env (defaults) overridden by real env vars:
#   MAX_ITERATIONS=25 RALPH_SLEEP=5 RALPH_MODEL=... RALPH_THINKING=1
#   RALPH_PRINT_LOGS=1 RALPH_LOG_LEVEL=INFO RALPH_IDLE_SECONDS=30
set -uo pipefail
cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
source lib/ralph-common.sh
ralph_load_env

MAX_ITERATIONS="${MAX_ITERATIONS:-25}"
RALPH_SLEEP="${RALPH_SLEEP:-5}"
PROMPT_FILE="${PROMPT_FILE:-PROMPT.md}"
LOG_DIR="${LOG_DIR:-logs}"
mkdir -p "$LOG_DIR"
ralph_guards "$PROMPT_FILE"

i=1
while :; do
  if [ "$i" -gt "$MAX_ITERATIONS" ]; then
    echo "[ralph] max iterations ($MAX_ITERATIONS) reached — Ralph goes home bruised but alive"
    break
  fi
  log="$LOG_DIR/ralph-$(date +%Y%m%d-%H%M%S)-iter$i.log"
  ralph_banner "BUILD" "$i" "$MAX_ITERATIONS" "$PROMPT_FILE"
  if ralph_exec "$PROMPT_FILE" "$log" "ralph-iter-$i"; then
    rc=0
  else
    rc=$?
    echo "[ralph] iteration $i exited nonzero ($rc) — looping anyway (eventual consistency)"
  fi
  i=$((i + 1))
  sleep "$RALPH_SLEEP"
done