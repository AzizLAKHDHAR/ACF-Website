#!/usr/bin/env bash
# SessionStart hook: make a fresh Claude Code cloud session ready to work.
#   1. install JS dependencies with the package manager matching the lockfile
#   2. export the pre-installed Chromium path for Playwright
#   3. pre-fetch the MCP server packages pinned in .mcp.json so they start fast
#
# Idempotent and non-interactive. Runs only in Claude Code on the web
# (CLAUDE_CODE_REMOTE=true); locally, install dependencies yourself.
set -euo pipefail

if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" ]]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

log() { echo "[session-start] $*" >&2; }

# 1. Dependencies. `install` (not `ci`) so the cached container state is reused;
#    lockfiles are never rewritten here (frozen / --no-save), so the tree stays clean.
if [[ -f package.json ]]; then
  if [[ -f pnpm-lock.yaml ]]; then
    log "installing dependencies with pnpm"
    corepack enable >/dev/null 2>&1 || true
    pnpm install --frozen-lockfile --prefer-offline
  elif [[ -f bun.lock ]]; then
    log "installing dependencies with bun"
    bun install --frozen-lockfile
  else
    log "installing dependencies with npm"
    npm install --no-save --no-audit --no-fund
  fi
fi

# 2. Point Playwright (tests, screenshots) at the container's pre-installed Chromium, whose
#    revision may differ from the one @playwright/test expects (see playwright.config.ts).
if [[ -x /opt/pw-browsers/chromium && -n "${CLAUDE_ENV_FILE:-}" ]]; then
  echo 'export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi

# 3. Warm the npx cache for every `package@version` spec in .mcp.json.
#    Best effort: a failure here must not block the session.
if [[ -f .mcp.json ]]; then
  specs=$(node -e '
    const cfg = require("./.mcp.json");
    const re = /^(@[\w.-]+\/)?[\w.-]+@\d[\w.-]*$/;
    const out = new Set();
    for (const s of Object.values(cfg.mcpServers ?? {}))
      for (const a of s.args ?? []) if (re.test(a)) out.add(a);
    console.log([...out].join("\n"));
  ' 2>/dev/null || true)
  for spec in $specs; do
    log "pre-fetching MCP server ${spec}"
    timeout 120 npx -y "$spec" --version </dev/null >/dev/null 2>&1 \
      || log "could not pre-fetch ${spec} (will be fetched on first use)"
  done
fi

log "done"
