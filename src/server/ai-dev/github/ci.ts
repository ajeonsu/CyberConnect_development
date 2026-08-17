import type { AiDevCiStatus } from '../types'

export type CheckRunLike = {
  name?: string
  status?: string
  conclusion?: string | null
}

export type CombinedStatusLike = {
  state?: string
  statuses?: Array<{ context?: string; state?: string }>
}

export type NormalizedCi = {
  status: AiDevCiStatus
  summary: {
    checks: Array<{ name: string; status: string; conclusion: string | null }>
    statuses: Array<{ context: string; state: string }>
  }
}

const FAILURE_CONCLUSIONS = new Set([
  'failure',
  'timed_out',
  'cancelled',
  'startup_failure',
  'action_required',
])

const PENDING_CHECK_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested'])

/**
 * Display-only aggregation. `success` means detected checks/statuses completed
 * without failure — not "safe to merge" and not "required checks passed".
 */
export function normalizeCiStatus(
  checkRuns: CheckRunLike[],
  combined: CombinedStatusLike | null
): NormalizedCi {
  const checks = (checkRuns ?? []).map((run) => ({
    name: String(run.name ?? '').trim() || '(unnamed check)',
    status: String(run.status ?? '').trim().toLowerCase(),
    conclusion: run.conclusion == null || run.conclusion === ''
      ? null
      : String(run.conclusion).trim().toLowerCase(),
  }))
  const statuses = (combined?.statuses ?? []).map((item) => ({
    context: String(item.context ?? '').trim() || '(unnamed status)',
    state: String(item.state ?? '').trim().toLowerCase(),
  }))
  const summary = { checks, statuses }

  if (checks.length === 0 && statuses.length === 0) {
    return { status: 'none', summary }
  }

  const failed =
    checks.some((c) => c.conclusion != null && FAILURE_CONCLUSIONS.has(c.conclusion)) ||
    statuses.some((s) => s.state === 'failure' || s.state === 'error') ||
    combined?.state === 'failure'
  if (failed) return { status: 'failure', summary }

  const pending =
    checks.some((c) => PENDING_CHECK_STATUSES.has(c.status) || (c.status !== 'completed' && c.conclusion == null)) ||
    statuses.some((s) => s.state === 'pending') ||
    combined?.state === 'pending'
  if (pending) return { status: 'pending', summary }

  const hasPositive =
    checks.some((c) => c.conclusion === 'success') ||
    statuses.some((s) => s.state === 'success') ||
    combined?.state === 'success'
  if (hasPositive) return { status: 'success', summary }

  const onlyNeutral =
    checks.length > 0 &&
    checks.every((c) => c.conclusion === 'skipped' || c.conclusion === 'neutral') &&
    statuses.length === 0
  if (onlyNeutral) return { status: 'none', summary }

  return { status: 'pending', summary }
}
