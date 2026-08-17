import { apiError, apiJson, errorMessage } from '@/lib/api/response'
import { isAiDevFeatureEnabled } from '@/server/ai-dev/flag'
import { verifyHmacSha256Hex } from '@/server/ai-dev/webhooks/verify'
import { applyCursorWebhook } from '@/server/ai-dev/runs'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isAiDevFeatureEnabled()) {
    return apiJson({ ok: true, ignored: 'feature_disabled' })
  }
  const secret = process.env.CURSOR_AGENT_WEBHOOK_SECRET?.trim() ?? ''
  const rawBody = await request.text()
  const signature = request.headers.get('x-webhook-signature')
  if (!verifyHmacSha256Hex(rawBody, signature, secret)) {
    return apiError('Invalid Cursor webhook signature', 401)
  }

  const deliveryId = request.headers.get('x-webhook-id')?.trim()
  if (!deliveryId) return apiError('Missing X-Webhook-ID', 400)

  let payload: {
    event?: string
    id?: string
    status?: string
    source?: { repository?: string }
    target?: { prUrl?: string; branchName?: string }
  }
  try {
    payload = JSON.parse(rawBody) as typeof payload
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (payload.event && payload.event !== 'statusChange') {
    return apiJson({ ok: true, ignored: `event:${payload.event}` })
  }
  if (!payload.id) return apiJson({ ok: true, ignored: 'no_agent_id' })

  try {
    const result = await applyCursorWebhook({
      deliveryId,
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
