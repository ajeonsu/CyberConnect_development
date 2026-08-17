import { createClient } from '@/lib/supabase-server'
import { createServiceRoleClient } from '@/lib/supabase-admin'
import { canStartAiDev } from '@/lib/team-project-auth'
import { AiDevError, userErrorMessage } from './errors'
import { isAiDevFeatureEnabled } from './flag'
import { assertCanStartAiDev, assertCanViewAiDev } from './rbac'
import { resolveAiDevPolicy, cursorRepositoryUrl, parsePullRequestUrl } from './policy'
import { cursorSourceMatchesRun } from './webhooks/match'
import { buildAiDevPrompt, hashPrompt, PROMPT_VERSION } from './prompt'
import { launchCursorAgent, getCursorAgent } from './cursor/client'
import {
  getRepoInstallationId,
  createInstallationToken,
  getRepository,
  getBranchSha,
  getPullRequest,
  listPullsByHead,
  listCheckRuns,
  getCombinedStatus,
  mapPullToPrState,
  type GitHubPull,
} from './github/appAuth'
import { normalizeCiStatus } from './github/ci'
import { appendAiDevEvent, claimAiDevEvent, type AiDevEventClaim } from './events'
import {
  toPublicRepo,
  toPublicRun,
  type AiDevRepoRow,
  type AiDevRunPublic,
  type AiDevRunRow,
  type AiDevPrState,
} from './types'

const RECONCILE_MIN_MS = 10_000

function requireFeature() {
  if (!isAiDevFeatureEnabled()) {
    throw new AiDevError('AI implementation is not enabled.', 'feature_disabled', 404)
  }
}

function webhookPublicUrl(path: string): string {
  const base = (process.env.AI_DEV_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  if (!base) {
    throw new AiDevError('AI implementation is not enabled.', 'feature_disabled', 500)
  }
  return `${base}${path}`
}

function cursorWebhookSecret(): string {
  const secret = process.env.CURSOR_AGENT_WEBHOOK_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new AiDevError('Cursor authentication failed.', 'cursor_auth', 500)
  }
  return secret
}

async function loadTask(projectId: string, taskId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_rows')
    .select('id, project_id, task_code, task, task_ja, remark, remark_ja, epic, screen_code, function_code')
    .eq('id', taskId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw new AiDevError(error.message, 'task_not_found', 500)
  if (!data) throw new AiDevError('Task not found.', 'task_not_found', 404)
  return data
}

async function loadRepoForProject(projectId: string, repoId: string): Promise<AiDevRepoRow | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_dev_repos')
    .select('*')
    .eq('id', repoId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as AiDevRepoRow | null) ?? null
}

export async function listEnabledAiDevRepos(projectId: string) {
  requireFeature()
  const actor = await assertCanViewAiDev(projectId)
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_dev_repos')
    .select('*')
    .eq('project_id', projectId)
    .eq('team_id', actor.project.team_id)
    .eq('enabled', true)
    .eq('cursor_enabled', true)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  const repos = ((data ?? []) as AiDevRepoRow[]).map(toPublicRepo)
  return {
    enabled: repos.length > 0,
    canStart: canStartAiDev(actor.privilege),
    repos,
  }
}

async function verifyGithubOrThrow(repo: AiDevRepoRow, baseBranch: string) {
  const liveInstallationId = await getRepoInstallationId(repo.github_owner, repo.github_repo)
  if (liveInstallationId !== Number(repo.installation_id)) {
    throw new AiDevError(
      'GitHub App installation does not match this repository.',
      'installation_mismatch',
      400
    )
  }
  const token = await createInstallationToken(liveInstallationId)
  const remote = await getRepository(token, repo.github_owner, repo.github_repo)
  if (
    remote.owner.toLowerCase() !== repo.github_owner.toLowerCase() ||
    remote.name.toLowerCase() !== repo.github_repo.toLowerCase()
  ) {
    throw new AiDevError('GitHub repository access could not be confirmed.', 'github_repo_inaccessible', 400)
  }
  const baseSha = await getBranchSha(token, remote.owner, remote.name, baseBranch)
  return { token, owner: remote.owner, repo: remote.name, baseSha, installationId: liveInstallationId }
}

async function fetchCi(token: string, owner: string, repo: string, sha: string) {
  const [checks, combined] = await Promise.all([
    listCheckRuns(token, owner, repo, sha),
    getCombinedStatus(token, owner, repo, sha),
  ])
  return normalizeCiStatus(checks, combined)
}

function applyPullFields(pull: GitHubPull): Partial<AiDevRunRow> {
  return {
    pr_number: pull.number,
    pr_url: pull.htmlUrl,
    pr_state: mapPullToPrState(pull),
    pr_head_sha: pull.headSha || null,
  }
}

export async function startAiDevRun(input: {
  projectId: string
  taskId: string
  aiDevRepoId: string
}): Promise<AiDevRunPublic> {
  requireFeature()
  const actor = await assertCanStartAiDev(input.projectId)
  const task = await loadTask(input.projectId, input.taskId)
  const repoRow = await loadRepoForProject(input.projectId, input.aiDevRepoId)
  const resolved = resolveAiDevPolicy({
    repo: repoRow,
    taskProjectId: actor.project.id,
    taskTeamId: actor.project.team_id,
    requestedRepoId: input.aiDevRepoId,
  })

  const verified = await verifyGithubOrThrow(resolved.repo, resolved.baseBranch)

  const prompt = buildAiDevPrompt(
    {
      taskCode: String(task.task_code ?? ''),
      titleEn: String(task.task ?? ''),
      titleJa: String(task.task_ja ?? ''),
      remarkEn: String(task.remark ?? ''),
      remarkJa: String(task.remark_ja ?? ''),
      epic: String(task.epic ?? ''),
      screenCode: String(task.screen_code ?? ''),
      functionCode: String(task.function_code ?? ''),
    },
    {
      owner: verified.owner,
      repo: verified.repo,
      baseBranch: resolved.baseBranch,
    }
  )
  const promptHash = hashPrompt(prompt)

  const supabase = createServiceRoleClient()
  const insertPayload = {
    team_id: actor.project.team_id,
    project_id: actor.project.id,
    task_id: task.id,
    ai_dev_repo_id: resolved.repo.id,
    github_owner: verified.owner,
    github_repo: verified.repo,
    base_branch: resolved.baseBranch,
    base_sha: verified.baseSha,
    status: 'starting',
    prompt_version: PROMPT_VERSION,
    prompt_hash: promptHash,
    started_by: actor.profileId,
  }

  const { data: created, error: insertError } = await supabase
    .from('ai_dev_runs')
    .insert(insertPayload)
    .select('*')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      throw new AiDevError(
        'This task already has an AI implementation in progress.',
        'duplicate_active_run',
        409
      )
    }
    throw new Error(insertError.message)
  }

  const run = created as AiDevRunRow
  await appendAiDevEvent({
    run,
    eventType: 'run_started',
    idempotencyKey: `run:${run.id}:started`,
    actorProfileId: actor.profileId,
    payload: {
      task_id: task.id,
      repository: `${verified.owner}/${verified.repo}`,
      base_branch: resolved.baseBranch,
      base_sha: verified.baseSha,
    },
  })

  try {
    const launched = await launchCursorAgent({
      prompt,
      repositoryUrl: cursorRepositoryUrl(verified.owner, verified.repo),
      ref: resolved.baseBranch,
      webhookUrl: webhookPublicUrl('/api/webhooks/cursor-agents'),
      webhookSecret: cursorWebhookSecret(),
    })

    const { data: updated, error: updateError } = await supabase
      .from('ai_dev_runs')
      .update({
        status: 'running',
        cursor_agent_id: launched.agentId,
        cursor_agent_url: launched.agentUrl,
        cursor_branch_name: launched.branchName,
        pr_url: launched.prUrl,
        pr_number: launched.prUrl ? parsePullRequestUrl(launched.prUrl)?.number ?? null : null,
      })
      .eq('id', run.id)
      .select('*')
      .single()
    if (updateError) throw new Error(updateError.message)

    const next = updated as AiDevRunRow
    await appendAiDevEvent({
      run: next,
      eventType: 'cursor_agent_launched',
      idempotencyKey: `run:${next.id}:launched:${launched.agentId}`,
      actorProfileId: actor.profileId,
      payload: {
        cursor_agent_id: launched.agentId,
        repository: `${verified.owner}/${verified.repo}`,
        base_branch: resolved.baseBranch,
      },
    })
    if (next.pr_url) {
      await appendAiDevEvent({
        run: next,
        eventType: 'pr_linked',
        idempotencyKey: `run:${next.id}:pr:${next.pr_url}`,
        payload: { pr_url: next.pr_url, pr_number: next.pr_number },
      })
    }
    return toPublicRun(next)
  } catch (err) {
    const code = err instanceof AiDevError ? err.code : 'cursor_launch_failed'
    const message = userErrorMessage(code, err instanceof Error ? err.message : 'Failed to start the Cursor Cloud Agent.')
    await supabase
      .from('ai_dev_runs')
      .update({
        status: 'failed',
        error_code: code,
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)
    await appendAiDevEvent({
      run,
      eventType: 'run_failed',
      idempotencyKey: `run:${run.id}:failed:${code}:${Date.now()}`,
      actorProfileId: actor.profileId,
      payload: { error_code: code },
    })
    throw err instanceof AiDevError ? err : new AiDevError(message, code, 502)
  }
}

export async function listAiDevRuns(projectId: string, taskId: string) {
  requireFeature()
  await assertCanViewAiDev(projectId)
  await loadTask(projectId, taskId)
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_dev_runs')
    .select('*')
    .eq('project_id', projectId)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return ((data ?? []) as AiDevRunRow[]).map(toPublicRun)
}

export async function getAiDevRun(runId: string, projectId: string): Promise<AiDevRunPublic> {
  requireFeature()
  await assertCanViewAiDev(projectId)
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_dev_runs')
    .select('*')
    .eq('id', runId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new AiDevError('Run not found.', 'task_not_found', 404)
  const reconciled = await reconcileRun(data as AiDevRunRow)
  return toPublicRun(reconciled)
}

export async function reconcileRun(run: AiDevRunRow): Promise<AiDevRunRow> {
  if (run.status === 'merged' || run.status === 'failed' || run.status === 'cancelled') {
    return run
  }
  const last = run.last_reconciled_at ? Date.parse(run.last_reconciled_at) : 0
  if (Number.isFinite(last) && Date.now() - last < RECONCILE_MIN_MS) {
    return run
  }

  const supabase = createServiceRoleClient()
  const { data: repo } = await supabase
    .from('ai_dev_repos')
    .select('*')
    .eq('id', run.ai_dev_repo_id)
    .maybeSingle()
  if (!repo) return run

  const patch: Record<string, unknown> = {
    last_reconciled_at: new Date().toISOString(),
  }

  try {
    if (run.cursor_agent_id && (run.status === 'running' || !run.pr_url)) {
      const agent = await getCursorAgent(run.cursor_agent_id)
      if (agent.branchName && !run.cursor_branch_name) patch.cursor_branch_name = agent.branchName
      if (agent.agentUrl && !run.cursor_agent_url) patch.cursor_agent_url = agent.agentUrl
      if (agent.prUrl) {
        const parsed = parsePullRequestUrl(agent.prUrl)
        patch.pr_url = agent.prUrl
        if (parsed) patch.pr_number = parsed.number
        if (run.status === 'running') patch.status = 'awaiting_review'
      }
      const agentStatus = agent.status.toUpperCase()
      if (agentStatus === 'ERROR' || agentStatus === 'EXPIRED') {
        if (!agent.prUrl && !run.pr_url) {
          patch.status = 'failed'
          patch.error_code = 'cursor_agent_failed'
          patch.error_message = userErrorMessage('cursor_agent_failed', 'Agent failed')
          patch.completed_at = new Date().toISOString()
        }
      } else if (agentStatus === 'FINISHED' && !agent.prUrl && !run.pr_url) {
        patch.status = 'failed'
        patch.error_code = 'pr_not_created'
        patch.error_message = userErrorMessage('pr_not_created', 'No PR')
        patch.completed_at = new Date().toISOString()
      }
    }

    const token = await createInstallationToken(Number((repo as AiDevRepoRow).installation_id))
    let pull: GitHubPull | null = null
    const prNumber = (patch.pr_number as number | undefined) ?? run.pr_number
    const branchName = (patch.cursor_branch_name as string | undefined) ?? run.cursor_branch_name
    if (prNumber) {
      pull = await getPullRequest(token, run.github_owner, run.github_repo, prNumber)
    } else if (branchName) {
      pull = await listPullsByHead(token, run.github_owner, run.github_repo, branchName)
    }
    if (pull) {
      Object.assign(patch, applyPullFields(pull))
      if (run.status === 'running' || patch.status === 'running') {
        patch.status = 'awaiting_review'
      }
      if (pull.merged) {
        patch.status = 'merged'
        patch.pr_state = 'merged'
        patch.completed_at = new Date().toISOString()
      }
      if (pull.headSha) {
        const ci = await fetchCi(token, run.github_owner, run.github_repo, pull.headSha)
        patch.ci_status = ci.status
        patch.ci_summary = ci.summary
      }
    }

    const { data: updated, error } = await supabase
      .from('ai_dev_runs')
      .update(patch)
      .eq('id', run.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    const next = updated as AiDevRunRow

    if (next.pr_url && next.pr_url !== run.pr_url) {
      await appendAiDevEvent({
        run: next,
        eventType: 'pr_linked',
        idempotencyKey: `run:${next.id}:pr:${next.pr_url}`,
        payload: { pr_url: next.pr_url, pr_number: next.pr_number },
      })
    }
    if (next.ci_status !== run.ci_status) {
      await appendAiDevEvent({
        run: next,
        eventType: 'ci_updated',
        idempotencyKey: `run:${next.id}:ci:${next.pr_head_sha ?? ''}:${next.ci_status}`,
        payload: { ci_status: next.ci_status, pr_head_sha: next.pr_head_sha },
      })
    }
    if (next.status === 'merged') {
      await appendAiDevEvent({
        run: next,
        eventType: 'merged_detected',
        idempotencyKey: `run:${next.id}:merged:${next.pr_number}`,
        payload: { pr_number: next.pr_number, pr_url: next.pr_url },
      })
    }
    if (next.status === 'failed') {
      await appendAiDevEvent({
        run: next,
        eventType: 'run_failed',
        idempotencyKey: `run:${next.id}:failed:${next.error_code ?? 'unknown'}`,
        payload: { error_code: next.error_code },
      })
    }
    return next
  } catch (err) {
    if (err instanceof AiDevError && err.code === 'github_rate_limit') {
      await supabase.from('ai_dev_runs').update({ last_reconciled_at: new Date().toISOString() }).eq('id', run.id)
      return run
    }
    await supabase.from('ai_dev_runs').update({ last_reconciled_at: new Date().toISOString() }).eq('id', run.id)
    return run
  }
}

export type CursorWebhookDeps = {
  loadRunByAgentId: (agentId: string) => Promise<AiDevRunRow | null>
  loadRepoById: (id: string) => Promise<AiDevRepoRow | null>
  claimEvent: (input: {
    run: Pick<AiDevRunRow, 'id' | 'team_id'>
    eventType: string
    idempotencyKey: string
    payload?: Record<string, unknown>
  }) => Promise<AiDevEventClaim>
  reconcileRun: (run: AiDevRunRow) => Promise<AiDevRunRow>
}

export type GitHubWebhookDeps = {
  loadReposByInstallation: (installationId: number) => Promise<AiDevRepoRow[]>
  loadActiveRunsByRepoIds: (repoIds: string[]) => Promise<AiDevRunRow[]>
  claimEvent: CursorWebhookDeps['claimEvent']
  reconcileRun: (run: AiDevRunRow) => Promise<AiDevRunRow>
}

async function defaultLoadRunByAgentId(agentId: string): Promise<AiDevRunRow | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_dev_runs')
    .select('*')
    .eq('cursor_agent_id', agentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as AiDevRunRow | null) ?? null
}

async function defaultLoadRepoById(id: string): Promise<AiDevRepoRow | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('ai_dev_repos').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as AiDevRepoRow | null) ?? null
}

async function defaultLoadReposByInstallation(installationId: number): Promise<AiDevRepoRow[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_dev_repos')
    .select('*')
    .eq('installation_id', installationId)
  if (error) throw new Error(error.message)
  return (data ?? []) as AiDevRepoRow[]
}

async function defaultLoadActiveRunsByRepoIds(repoIds: string[]): Promise<AiDevRunRow[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_dev_runs')
    .select('*')
    .in('ai_dev_repo_id', repoIds)
    .in('status', ['starting', 'running', 'awaiting_review'])
  if (error) throw new Error(error.message)
  return (data ?? []) as AiDevRunRow[]
}

export async function applyCursorWebhook(
  input: {
    deliveryId: string
    agentId: string
    status: string
    sourceRepository?: string
    prUrl?: string
    branchName?: string
  },
  deps: Partial<CursorWebhookDeps> = {}
) {
  const loadRun = deps.loadRunByAgentId ?? defaultLoadRunByAgentId
  const loadRepo = deps.loadRepoById ?? defaultLoadRepoById
  const claim = deps.claimEvent ?? claimAiDevEvent
  const reconcile = deps.reconcileRun ?? reconcileRun

  const run = await loadRun(input.agentId)
  if (!run) return { ok: true, ignored: 'no_matching_run' as const }

  if (
    !cursorSourceMatchesRun({
      runOwner: run.github_owner,
      runRepo: run.github_repo,
      sourceRepository: input.sourceRepository,
    })
  ) {
    return { ok: true, ignored: 'repo_mismatch' as const }
  }

  const repo = await loadRepo(run.ai_dev_repo_id)
  if (!repo || repo.team_id !== run.team_id || repo.project_id !== run.project_id) {
    return { ok: true, ignored: 'repo_mismatch' as const }
  }

  const claimed = await claim({
    run,
    eventType: 'cursor_status',
    idempotencyKey: `cursor:${input.deliveryId}`,
    payload: { cursor_status: input.status, cursor_agent_id: input.agentId },
  })
  if (claimed === 'duplicate') {
    return { ok: true, ignored: 'duplicate' as const }
  }

  return { ok: true, run: toPublicRun(await reconcile({ ...run, last_reconciled_at: null })) }
}

export async function applyGitHubAppWebhook(
  input: {
    deliveryId: string
    eventName: string
    installationId: number | undefined
    owner: string
    repo: string
    pull?: GitHubPull | null
    headSha?: string | null
    headRef?: string | null
  },
  deps: Partial<GitHubWebhookDeps> = {}
) {
  if (!input.installationId) return { ok: true, ignored: 'no_installation' as const }
  const loadRepos = deps.loadReposByInstallation ?? defaultLoadReposByInstallation
  const loadRuns = deps.loadActiveRunsByRepoIds ?? defaultLoadActiveRunsByRepoIds
  const claim = deps.claimEvent ?? claimAiDevEvent
  const reconcile = deps.reconcileRun ?? reconcileRun

  const repos = await loadRepos(input.installationId)
  const repoRows = repos.filter(
    (row) =>
      row.github_owner.toLowerCase() === input.owner.toLowerCase() &&
      row.github_repo.toLowerCase() === input.repo.toLowerCase()
  )
  if (repoRows.length === 0) return { ok: true, ignored: 'no_matching_repo' as const }

  const repoIds = repoRows.map((r) => r.id)
  const runs = await loadRuns(repoIds)

  const matched = runs.filter((run) => {
    const repo = repoRows.find((r) => r.id === run.ai_dev_repo_id)
    if (!repo) return false
    if (Number(repo.installation_id) !== input.installationId) return false
    if (repo.team_id !== run.team_id || repo.project_id !== run.project_id) return false
    if (
      run.github_owner.toLowerCase() !== input.owner.toLowerCase() ||
      run.github_repo.toLowerCase() !== input.repo.toLowerCase()
    ) {
      return false
    }
    if (input.pull && run.pr_number && run.pr_number === input.pull.number) return true
    if (input.headRef && run.cursor_branch_name && run.cursor_branch_name === input.headRef) return true
    if (input.headSha && run.pr_head_sha && run.pr_head_sha === input.headSha) return true
    return false
  })

  if (matched.length === 0) return { ok: true, ignored: 'no_matching_run' as const }

  const claimed = await claim({
    run: matched[0]!,
    eventType: `github:${input.eventName}`,
    idempotencyKey: `github:${input.deliveryId}`,
    payload: {
      event: input.eventName,
      repository: `${input.owner}/${input.repo}`,
      pr_number: input.pull?.number ?? null,
    },
  })
  if (claimed === 'duplicate') {
    return { ok: true, ignored: 'duplicate' as const }
  }

  const updated = []
  for (const run of matched) {
    updated.push(await reconcile({ ...run, last_reconciled_at: null }))
  }
  return { ok: true, updated: updated.length }
}

export { userErrorMessage }
export type { AiDevPrState }
