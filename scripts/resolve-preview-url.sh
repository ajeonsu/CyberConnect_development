#!/usr/bin/env bash
#
# Resolve the Vercel Preview URL for a commit via the GitHub Deployments API.
#
# Inputs (environment):
#   REPO           - "owner/name" (required)
#   HEAD_SHA       - commit SHA to look up deployments for (required)
#   TARGET_ENV     - substring the deployment `environment` must contain
#                    (default: cyberconnect_staging)
#   POLL_INTERVAL  - seconds between polls (default: 10)
#   MAX_WAIT       - max seconds to wait (default: 600)
#   GH_TOKEN       - token with `deployments: read` (required; used by gh)
#
# On success: prints the Preview URL to stdout and exits 0.
# On failure: prints a reason to stderr and exits non-zero.
#
# Notes:
# - Deployment statuses are returned newest-first, so `.[0]` is the latest.
# - The Preview URL is read from the matched deployment status only
#   (environment_url, falling back to target_url) and must be a *.vercel.app host.
set -euo pipefail

REPO="${REPO:?REPO is required}"
HEAD_SHA="${HEAD_SHA:?HEAD_SHA is required}"
TARGET_ENV="${TARGET_ENV:-cyberconnect_staging}"
POLL_INTERVAL="${POLL_INTERVAL:-10}"
MAX_WAIT="${MAX_WAIT:-600}"

log() { printf '%s\n' "$*" >&2; }

target_lc="$(printf '%s' "$TARGET_ENV" | tr '[:upper:]' '[:lower:]')"
elapsed=0

while : ; do
  # Deployments for this SHA (may be several: one per Vercel project).
  if ! gh api --paginate "repos/${REPO}/deployments?sha=${HEAD_SHA}&per_page=100" > /tmp/deployments.json 2>/dev/null; then
    printf '[]' > /tmp/deployments.json
  fi

  # IDs whose environment contains the target substring (case-insensitive).
  ids="$(jq -r --arg e "$target_lc" \
    '.[] | select(((.environment // "") | ascii_downcase) | contains($e)) | .id' \
    /tmp/deployments.json 2>/dev/null || true)"

  any_pending=false
  fail_state=""

  if [ -n "$ids" ]; then
    while IFS= read -r id; do
      [ -n "$id" ] || continue
      if ! gh api "repos/${REPO}/deployments/${id}/statuses?per_page=100" > /tmp/statuses.json 2>/dev/null; then
        printf '[]' > /tmp/statuses.json
      fi
      state="$(jq -r '.[0].state // ""' /tmp/statuses.json)"
      case "$state" in
        success)
          url="$(jq -r '.[0].environment_url // .[0].target_url // ""' /tmp/statuses.json)"
          if [ -z "$url" ] || [ "$url" = "null" ]; then
            log "matched deployment ${id} is success but has no environment_url"
            exit 3
          fi
          host="$(printf '%s' "$url" | sed -E 's#^[a-zA-Z]+://##; s#[/?#].*$##; s#:.*$##')"
          case "$host" in
            *.vercel.app) ;;
            *) log "resolved URL host is not *.vercel.app: ${host}"; exit 4 ;;
          esac
          printf '%s\n' "$url"
          exit 0
          ;;
        failure|error)
          fail_state="$state"
          ;;
        inactive)
          fail_state="inactive"
          ;;
        *)
          # pending, queued, in_progress, waiting, or empty -> still deploying
          any_pending=true
          ;;
      esac
    done <<< "$ids"
  fi

  if [ "$any_pending" = false ] && [ -n "$fail_state" ]; then
    log "target deployment finished with state=${fail_state}"
    exit 5
  fi

  if [ "$elapsed" -ge "$MAX_WAIT" ]; then
    if [ -z "$ids" ]; then
      log "timed out after ${MAX_WAIT}s: no deployment for env containing '${TARGET_ENV}' at ${HEAD_SHA}"
    else
      log "timed out after ${MAX_WAIT}s waiting for '${TARGET_ENV}' deployment to succeed"
    fi
    exit 2
  fi

  log "waiting ${POLL_INTERVAL}s for '${TARGET_ENV}' preview (elapsed ${elapsed}s)…"
  sleep "$POLL_INTERVAL"
  elapsed=$((elapsed + POLL_INTERVAL))
done
