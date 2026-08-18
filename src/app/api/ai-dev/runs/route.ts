import { apiError, apiJson, errorMessage, readJsonBody } from '@/lib/api/response'
import { AiDevError } from '@/server/ai-dev/errors'
import { isAiDevFeatureEnabled } from '@/server/ai-dev/flag'
import { listEnabledAiDevRepos, listAiDevRuns, startAiDevRun } from '@/server/ai-dev/runs'

function handleError(err: unknown) {
  if (err instanceof AiDevError) {
    return apiError(err.message, err.status)
  }
  return apiError(errorMessage(err), 500)
}

export async function GET(request: Request) {
  if (!isAiDevFeatureEnabled()) {
    return apiJson({ enabled: false, canStart: false, repos: [], runs: [] })
  }
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')?.trim() ?? ''
  const taskId = url.searchParams.get('taskId')?.trim() ?? ''
  if (!projectId) return apiError('projectId is required', 400)

  try {
    if (taskId) {
      const [catalog, runs] = await Promise.all([
        listEnabledAiDevRepos(projectId),
        listAiDevRuns(projectId, taskId),
      ])
      return apiJson({ ...catalog, runs })
    }
    const catalog = await listEnabledAiDevRepos(projectId)
    return apiJson({ ...catalog, runs: [] })
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  const body = await readJsonBody<{
    projectId?: string
    taskId?: string
    aiDevRepoId?: string
  }>(request)
  if (!body?.projectId || !body?.taskId || !body?.aiDevRepoId) {
    return apiError('projectId, taskId, and aiDevRepoId are required', 400)
  }
  try {
    const run = await startAiDevRun({
      projectId: body.projectId,
      taskId: body.taskId,
      aiDevRepoId: body.aiDevRepoId,
    })
    return apiJson({ run }, 201)
  } catch (err) {
    return handleError(err)
  }
}
