import { apiError, apiJson, errorMessage } from '@/lib/api/response'
import { AiDevError } from '@/server/ai-dev/errors'
import { getAiDevRun } from '@/server/ai-dev/runs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const projectId = new URL(request.url).searchParams.get('projectId')?.trim() ?? ''
  if (!projectId) return apiError('projectId is required', 400)
  try {
    const run = await getAiDevRun(id, projectId)
    return apiJson({ run })
  } catch (err) {
    if (err instanceof AiDevError) return apiError(err.message, err.status)
    return apiError(errorMessage(err), 500)
  }
}
