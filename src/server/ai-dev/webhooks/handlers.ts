import { apiError, apiJson, errorMessage } from '@/lib/api/response'
import { isAiDevFeatureEnabled } from '@/server/ai-dev/flag'
import { applyCursorWebhook, applyGitHubAppWebhook } from '@/server/ai-dev/runs'
import type { GitHubPull } from '@/server/ai-dev/github/appAuth'
import { authorizeAiDevWebhook } from './authorize'
import { classifyGitHubAppEvent } from './githubEvents'

export type CursorWebhookApply = typeof applyCursorWebhook
export type GitHubWebhookApply = typeof applyGitHubAppWebhook

type CursorPayload = {
  event?: string
  id?: string
  status?: string
  source?: { repository?: string }
  target?: { prUrl?: string; branchName?: string }
}

type GitHubAppPayload = {
  action?: string
  installation?: { id?: number }
  repository?: { name?: string; owner?: { login?: string } }
  pull_request?: {
    number?: number
    html_url?: string
    state?: string
    merged?: boolean
    draft?: boolean
    head?: { sha?: string; ref?: string }
    base?: { ref?: string }
  }
  check_run?: { head_sha?: string }
  check_suite?: { head_sha?: string; head_branch?: string }
  sha?: string
  state?: string
}

function toPull(pr: GitHubAppPayload['pull_request']): GitHubPull | null {
  if (!pr || typeof pr.number !== 'number' || !pr.html_url) return null
  return {
    number: pr.number,
    htmlUrl: pr.html_url,
    state: pr.state === 'closed' ? 'closed' : 'open',
    merged: Boolean(pr.merged),
    draft: Boolean(pr.draft),
    headSha: pr.head?.sha ?? '',
    headRef: pr.head?.ref ?? '',
    baseRef: pr.base?.ref ?? '',
  }
}

export async function handleCursorAgentsWebhook(
  request: Request,
  deps: {
    isEnabled?: () => boolean
    secret?: string
    apply?: CursorWebhookApply
  } = {}
) {
  const rawBody = await request.text()
  const gate = authorizeAiDevWebhook({
    rawBody,
    signatureHeader: request.headers.get('x-webhook-signature'),
    secret: deps.secret ?? process.env.CURSOR_AGENT_WEBHOOK_SECRET?.trim() ?? '',
    featureEnabled: (deps.isEnabled ?? isAiDevFeatureEnabled)(),
    deliveryId: request.headers.get('x-webhook-id'),
    invalidSignatureMessage: 'Invalid Cursor webhook signature',
    missingDeliveryMessage: 'Missing X-Webhook-ID',
  })
  if (gate.action === 'reject') return apiError(gate.error, gate.status)
  if (gate.action === 'ignore') return apiJson({ ok: true, ignored: gate.reason })

  let payload: CursorPayload
  try {
    payload = JSON.parse(rawBody) as CursorPayload
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (payload.event && payload.event !== 'statusChange') {
    return apiJson({ ok: true, ignored: `event:${payload.event}` })
  }
  if (!payload.id) return apiJson({ ok: true, ignored: 'no_agent_id' })

  try {
    const apply = deps.apply ?? applyCursorWebhook
    const result = await apply({
      deliveryId: gate.deliveryId,
      agentId: payload.id,
      status: payload.status ?? '',
      sourceRepository: payload.source?.repository,
      prUrl: payload.target?.prUrl,
      branchName: payload.target?.branchName,
    })
    return apiJson(result)
  } catch (err) {
    return apiError(errorMessage(err), 500)
  }
}

export async function handleGitHubAppWebhook(
  request: Request,
  deps: {
    isEnabled?: () => boolean
    secret?: string
    apply?: GitHubWebhookApply
  } = {}
) {
  const rawBody = await request.text()
  const gate = authorizeAiDevWebhook({
    rawBody,
    signatureHeader: request.headers.get('x-hub-signature-256'),
    secret: deps.secret ?? process.env.AI_DEV_GITHUB_APP_WEBHOOK_SECRET?.trim() ?? '',
    featureEnabled: (deps.isEnabled ?? isAiDevFeatureEnabled)(),
    deliveryId: request.headers.get('x-github-delivery'),
    invalidSignatureMessage: 'Invalid GitHub webhook signature',
    missingDeliveryMessage: 'Missing X-GitHub-Delivery',
  })
  if (gate.action === 'reject') return apiError(gate.error, gate.status)
  if (gate.action === 'ignore') return apiJson({ ok: true, ignored: gate.reason })

  const eventName = request.headers.get('x-github-event')?.trim() ?? ''
  const eventClass = classifyGitHubAppEvent(eventName)
  if (eventClass === 'ping') return apiJson({ ok: true, ignored: 'ping' })
  if (eventClass === 'ignored') {
    return apiJson({ ok: true, ignored: `event:${eventName || 'unknown'}` })
  }

  let payload: GitHubAppPayload
  try {
    payload = JSON.parse(rawBody) as GitHubAppPayload
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const owner = payload.repository?.owner?.login
  const repo = payload.repository?.name
  if (!owner || !repo) return apiJson({ ok: true, ignored: 'no_repository' })

  const pull = toPull(payload.pull_request)
  const headSha =
    pull?.headSha ||
    payload.check_run?.head_sha ||
    payload.check_suite?.head_sha ||
    payload.sha ||
    null
  const headRef = pull?.headRef || payload.check_suite?.head_branch || null

  try {
    const apply = deps.apply ?? applyGitHubAppWebhook
    const result = await apply({
      deliveryId: gate.deliveryId,
      eventName,
      installationId: payload.installation?.id,
      owner,
      repo,
      pull,
      headSha,
      headRef,
    })
    return apiJson(result)
  } catch (err) {
    return apiError(errorMessage(err), 500)
  }
}
