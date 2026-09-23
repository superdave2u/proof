#!/usr/bin/env bash
# Shared Ralph loop plumbing. Sourced by ralph.sh and ralph-plan.sh.
# Requires: bash, GNU tail (uses tail --pid), stat.

# Load .env into the environment — never overrides variables already set.
ralph_load_env() {
  [ -f .env ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    local key="${line%%=*}"
    local val="${line#*=}"
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    if [ -n "$key" ] && [ -z "${!key:-}" ]; then
      export "$key=$val"
    fi
  done < .env
}

# Per-iteration banner: iteration, time, prompt, HEAD, tag.
ralph_banner() {
  local label="$1" iter="$2" max="$3" prompt_file="$4"
  local head tag
  head="$(git log --oneline -1 2>/dev/null | cut -c1-72)"
  tag="$(git describe --tags --abbrev=0 2>/dev/null || echo 'no tags')"
  echo "───────────────────────────────────────────────────────────────"
  echo "[ralph] $label iteration $iter/$max · $(date '+%Y-%m-%d %H:%M:%S')"
  echo "[ralph] prompt=$prompt_file HEAD=${head:-none} tag=${tag}"
}

# Strip ANSI escape sequences (colors, cursors, OSC titles) from a stream.
ralph_strip_ansi() {
  sed -u \
    -e 's/\x1B\[[0-9;?]*[ -\/]*[@-~]//g' \
    -e 's/\x1B\][^\x07\x1B]*(\x07|\x1B\\)//g' \
    -e 's/\x1B[@-_]//g'
}

# Run one opencode iteration with full streaming visibility.
# Usage: ralph_exec <prompt_file> <log_file> <session_title>
# Streams opencode stdout+stderr (incl. thinking blocks and harness logs)
# to the console live, tees everything to <log_file>, and prints a
# heartbeat whenever opencode goes quiet for $RALPH_IDLE_SECONDS.
ralph_exec() {
  local prompt_file="$1" log="$2" title="$3"
  local start; start="$(date +%s)"

  local model_args=() think_args=() log_args=() auto_args=()
  [ -n "${RALPH_MODEL:-}" ] && model_args=(--model "$RALPH_MODEL")
  [ "${RALPH_THINKING:-1}" = "1" ] && think_args=(--thinking)
  if [ "${RALPH_PRINT_LOGS:-1}" = "1" ]; then
    log_args=(--print-logs --log-level "${RALPH_LOG_LEVEL:-INFO}")
  fi
  [ "${RALPH_AUTO:-0}" = "1" ] && auto_args=(--auto)

  echo "[ralph] ▶ $(date '+%H:%M:%S') opencode starting (model=${RALPH_MODEL:-default} thinking=${RALPH_THINKING:-1} logs=${RALPH_LOG_LEVEL:-INFO})"

  # No ANSI color in logs or streamed output.
  export NO_COLOR=1
  export CLICOLOR=0
  export CLICOLOR_FORCE=0
  export FORCE_COLOR=0

  # opencode writes (color-stripped) to the log; tail streams it to the
  # console and exits automatically when the writer is gone.
  local rc_file="$log.rc"
  { cat "$prompt_file" | opencode run "${model_args[@]}" "${think_args[@]}" "${log_args[@]}" "${auto_args[@]}" --title "$title" 2>&1; echo "$?" > "$rc_file"; } | ralph_strip_ansi > "$log" &
  local pid=$!
  tail -n +1 -f --pid="$pid" "$log" &
  local tail_pid=$!

  # Idle watchdog: heartbeat when the log stops growing.
  local last_size=0 last_change idle max_idle="${RALPH_IDLE_SECONDS:-30}"
  last_change="$(date +%s)"
  while kill -0 "$pid" 2>/dev/null; do
    sleep 2
    local size; size="$(stat -c%s "$log" 2>/dev/null || echo 0)"
    if [ "$size" -ne "$last_size" ]; then
      last_size="$size"
      last_change="$(date +%s)"
    else
      idle=$(( $(date +%s) - last_change ))
      if [ "$idle" -ge "$max_idle" ]; then
        echo "[ralph] ⏳ no output for ${idle}s — thinking, or blocked on permissions (pid $pid)"
        last_change="$(date +%s)"
      fi
    fi
  done

  wait "$pid" 2>/dev/null
  local rc; rc="$(cat "$rc_file" 2>/dev/null || echo 1)"
  rm -f "$rc_file"
  kill "$tail_pid" 2>/dev/null
  wait "$tail_pid" 2>/dev/null
  local secs=$(( $(date +%s) - start ))
  echo "[ralph] ■ iteration finished in ${secs}s (exit $rc) — log: $log"
  return "$rc"
}

# Pre-loop guards.
ralph_guards() {
  local prompt_file="$1"
  if [ ! -f "$prompt_file" ]; then
    echo "[ralph] FATAL: $prompt_file not found" >&2
    exit 1
  fi
  if [ -f .git/MERGE_HEAD ] || [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
    echo "[ralph] FATAL: git is mid-merge/rebase — resolve first" >&2
    exit 1
  fi
  if ! command -v opencode >/dev/null 2>&1; then
    echo "[ralph] FATAL: opencode not found on PATH" >&2
    exit 1
  fi
}