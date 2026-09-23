#!/usr/bin/env bash
# Ralph Wiggum loop — planning mode. Drafts/verifies specs, never implements.
# Usage: ./ralph-plan.sh
# Config: .env (defaults) overridden by real env vars.
#   MAX_ITERATIONS defaults to 3 here. PROMPT_FILE defaults to PROMPT-PLAN.md.
set -uo pipefail
cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
source lib/ralph-common.sh
ralph_load_env

MAX_ITERATIONS="${MAX_ITERATIONS:-3}"
RALPH_SLEEP="${RALPH_SLEEP:-5}"
PROMPT_FILE="${PROMPT_FILE:-PROMPT-PLAN.md}"
LOG_DIR="${LOG_DIR:-logs}"
mkdir -p "$LOG_DIR"
ralph_guards "$PROMPT_FILE"

i=1
while :; do
  if [ "$i" -gt "$MAX_ITERATIONS" ]; then
    echo "[ralph] planning complete ($MAX_ITERATIONS iterations) — specs await operator review"
    break
  fi
  log="$LOG_DIR/ralph-plan-$(date +%Y%m%d-%H%M%S)-iter$i.log"
  ralph_banner "PLAN" "$i" "$MAX_ITERATIONS" "$PROMPT_FILE"
  ralph_exec "$PROMPT_FILE" "$log" "ralph-plan-iter-$i" || true
  i=$((i + 1))
  sleep "$RALPH_SLEEP"
done