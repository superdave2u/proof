#!/usr/bin/env bash
# Ralph Wiggum loop — build mode.
# Usage: ./ralph.sh            (drive PROMPT.md until MAX_ITERATIONS)
# Env:  MAX_ITERATIONS=25 RALPH_SLEEP=5 RALPH_MODEL=anthropic/claude-sonnet-4-5 PROMPT_FILE=PROMPT.md
set -uo pipefail

MAX_ITERATIONS="${MAX_ITERATIONS:-25}"
RALPH_SLEEP="${RALPH_SLEEP:-5}"
PROMPT_FILE="${PROMPT_FILE:-PROMPT.md}"
LOG_DIR="logs"
mkdir -p "$LOG_DIR"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "[ralph] FATAL: $PROMPT_FILE not found" >&2
  exit 1
fi
if [ -f .git/MERGE_HEAD ] || [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  echo "[ralph] FATAL: git is mid-merge/rebase — resolve first" >&2
  exit 1
fi

MODEL_ARGS=()
if [ -n "${RALPH_MODEL:-}" ]; then
  MODEL_ARGS=(--model "$RALPH_MODEL")
fi

i=1
while :; do
  if [ "$i" -gt "$MAX_ITERATIONS" ]; then
    echo "[ralph] max iterations ($MAX_ITERATIONS) reached — Ralph goes home bruised but alive"
    break
  fi
  log="$LOG_DIR/ralph-$(date +%Y%m%d-%H%M%S)-iter$i.log"
  echo "[ralph] iteration $i/$MAX_ITERATIONS -> $log"
  cat "$PROMPT_FILE" | opencode run "${MODEL_ARGS[@]}" 2>&1 | tee "$log"
  rc="${PIPESTATUS[0]}"
  if [ "$rc" -ne 0 ]; then
    echo "[ralph] iteration $i exited nonzero ($rc) — looping anyway (eventual consistency)"
  fi
  i=$((i + 1))
  sleep "$RALPH_SLEEP"
done