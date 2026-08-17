import { apiError, apiJson, errorMessage } from '@/lib/api/response'
import { isAiDevFeatureEnabled } from '@/server/ai-dev/flag'
import { verifyHmacSha256Hex } from '@/server/ai-dev/webhooks/verify'
import { applyGitHubAppWebhook } from '@/server/ai-dev/runs'
import type { GitHubPull } from '@/server/ai-dev/github/appAuth'

export const runtime = 'nodejs'

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

export async function POST(request: Request) {
  if (!isAiDevFeatureEnabled()) {
    return apiJson({ ok: true, ignored: 'feature_disabled' })
  }
  const secret = process.env.AI_DEV_GITHUB_APP_WEBHOOK_SECRET?.trim() ?? ''
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  if (!verifyHmacSha256Hex(rawBody, signature, secret)) {
    return apiError('Invalid GitHub webhook signature', 401)
  }

  const eventName = request.headers.get('x-github-event')?.trim() ?? ''
  const deliveryId = request.headers.get('x-github-delivery')?.trim()
  if (!deliveryId) return apiError('Missing X-GitHub-Delivery', 400)
  if (eventName === 'ping') return apiJson({ ok: true, ignored: 'ping' })

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
    const result = await applyGitHubAppWebhook({
      deliveryId,
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
