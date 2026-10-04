#!/usr/bin/env bash
# Launches the Playwright MCP server (stdio) for Claude Code.
#
# Claude Code on the web ships a pre-installed Chromium at /opt/pw-browsers
# whose revision may not match the one @playwright/mcp expects, so we point the
# server at it explicitly. Locally, set PLAYWRIGHT_MCP_EXECUTABLE_PATH yourself
# or run `npx playwright install chromium` once.
#
# Usage (from .mcp.json): playwright.sh <npm package spec> [extra server args...]
set -euo pipefail

pkg="${1:?usage: playwright.sh <package@version> [args...]}"
shift

if [[ -z "${PLAYWRIGHT_MCP_EXECUTABLE_PATH:-}" && -x /opt/pw-browsers/chromium ]]; then
  export PLAYWRIGHT_MCP_EXECUTABLE_PATH=/opt/pw-browsers/chromium
fi

args=(--headless --isolated)
# Chromium cannot start its sandbox as root (the cloud container runs as root).
if [[ "$(id -u)" == "0" ]]; then
  args+=(--no-sandbox)
fi

exec npx -y "$pkg" "${args[@]}" "$@"
