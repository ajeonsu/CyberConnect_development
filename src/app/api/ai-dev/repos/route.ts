import { apiError, apiJson, errorMessage } from '@/lib/api/response'
import { AiDevError } from '@/server/ai-dev/errors'
import { isAiDevFeatureEnabled } from '@/server/ai-dev/flag'
import { listEnabledAiDevRepos } from '@/server/ai-dev/runs'

export async function GET(request: Request) {
  if (!isAiDevFeatureEnabled()) {
    return apiJson({ enabled: false, canStart: false, repos: [] })
  }
  const projectId = new URL(request.url).searchParams.get('projectId')?.trim() ?? ''
  if (!projectId) return apiError('projectId is required', 400)
  try {
    const catalog = await listEnabledAiDevRepos(projectId)
    return apiJson(catalog)
  } catch (err) {
    if (err instanceof AiDevError) return apiError(err.message, err.status)
    return apiError(errorMessage(err), 500)
  }
}
