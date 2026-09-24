#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
export PROMPT_FILE="${PROMPT_FILE:-PROMPT-ART.md}"
export RALPH_MODEL="${RALPH_MODEL:-openrouter/~openai/gpt-luna-latest}"
export IMAGE_PROVIDER=openrouter
export IMAGE_MODEL="${IMAGE_MODEL:-inclusionai/ming-image-0.1-design}"
export MAX_ITERATIONS="${MAX_ITERATIONS:-52}"
stop_file=".ralph-art.stop"
done_file=".ralph-art.done"

for ((iteration = 1; iteration <= MAX_ITERATIONS; iteration += 1)); do
  if [[ -e "$done_file" ]]; then
    printf '[ralph-art] all card images are complete\n'
    exit 0
  fi
  if [[ -e "$stop_file" ]]; then
    printf '[ralph-art] stopped by %s; remove it to resume\n' "$stop_file"
    exit 0
  fi
  printf '[ralph-art] image iteration %s/%s\n' "$iteration" "$MAX_ITERATIONS"
  PROMPT_FILE="$PROMPT_FILE" RALPH_MODEL="$RALPH_MODEL" IMAGE_PROVIDER="$IMAGE_PROVIDER" \
    IMAGE_MODEL="$IMAGE_MODEL" MAX_ITERATIONS=1 RALPH_SLEEP=0 ./ralph.sh
  if [[ -e "$stop_file" ]]; then
    printf '[ralph-art] paused by the art prompt after iteration %s\n' "$iteration"
    exit 0
  fi
  if [[ -e "$done_file" ]]; then
    printf '[ralph-art] all card images are complete\n'
    exit 0
  fi
done
