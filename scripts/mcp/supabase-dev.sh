#!/usr/bin/env bash
# Launches the Supabase MCP server (stdio) scoped to the DEV project only.
#
# Required environment variables (never commit their values):
#   SUPABASE_ACCESS_TOKEN     personal access token (https://supabase.com/dashboard/account/tokens)
#   SUPABASE_DEV_PROJECT_REF  project ref of the *dev* Supabase project
# Optional:
#   SUPABASE_PROD_PROJECT_REF if set, the server refuses to start when it equals the dev ref
#   SUPABASE_MCP_READ_WRITE=1 drop --read-only (dev project only; schema changes still go through migrations)
#
# Without a project ref the upstream server would expose every project on the
# account, so this wrapper refuses to start instead.
#
# Usage (from .mcp.json): supabase-dev.sh <npm package spec> [extra server args...]
set -euo pipefail

pkg="${1:?usage: supabase-dev.sh <package@version> [args...]}"
shift

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "supabase-dev MCP: SUPABASE_ACCESS_TOKEN is not set; refusing to start." >&2
  exit 1
fi
if [[ -z "${SUPABASE_DEV_PROJECT_REF:-}" ]]; then
  echo "supabase-dev MCP: SUPABASE_DEV_PROJECT_REF is not set; refusing to start unscoped." >&2
  exit 1
fi
if [[ -n "${SUPABASE_PROD_PROJECT_REF:-}" && "${SUPABASE_PROD_PROJECT_REF}" == "${SUPABASE_DEV_PROJECT_REF}" ]]; then
  echo "supabase-dev MCP: dev project ref equals the production ref; refusing to start." >&2
  exit 1
fi

args=(--project-ref="${SUPABASE_DEV_PROJECT_REF}")
if [[ "${SUPABASE_MCP_READ_WRITE:-0}" != "1" ]]; then
  args+=(--read-only)
fi

exec npx -y "$pkg" "${args[@]}" "$@"
