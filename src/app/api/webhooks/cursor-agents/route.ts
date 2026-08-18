import { handleCursorAgentsWebhook } from '@/server/ai-dev/webhooks/handlers'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handleCursorAgentsWebhook(request)
}
