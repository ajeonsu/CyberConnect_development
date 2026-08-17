import { AiDevError } from '../errors'

const CURSOR_AGENTS_URL = 'https://api.cursor.com/v0/agents'

export type CursorLaunchInput = {
  prompt: string
  repositoryUrl: string
  ref: string
  webhookUrl: string
  webhookSecret: string
}

export type CursorLaunchResult = {
  agentId: string
  agentUrl: string
  branchName: string | null
  prUrl: string | null
  status: string
}

export type CursorAgentStatus = {
  id: string
  status: string
  branchName: string | null
  prUrl: string | null
  agentUrl: string | null
}

function cursorApiKey(): string {
  const key = process.env.CURSOR_API_KEY?.trim()
  if (!key) {
    throw new AiDevError('Cursor authentication failed.', 'cursor_auth', 500)
  }
  return key
}

function mapCursorHttpError(httpStatus: number, bodyText: string): AiDevError {
  const lower = bodyText.toLowerCase()
  if (httpStatus === 401 || httpStatus === 403) {
    return new AiDevError('Cursor authentication failed.', 'cursor_auth', 401)
  }
  if (httpStatus === 429) {
    return new AiDevError('Cursor is rate-limited. Try again later.', 'cursor_rate_limit', 429)
  }
  if (
    lower.includes('cannot access') ||
    lower.includes('not have access') ||
    lower.includes('github app') ||
    lower.includes('repository') && lower.includes('access')
  ) {
    return new AiDevError(
      'Cursor cannot access this repository. Check the Cursor GitHub App install.',
      'cursor_repo_access',
      400
    )
  }
  return new AiDevError('Failed to start the Cursor Cloud Agent.', 'cursor_launch_failed', 502)
}

function parseAgent(data: Record<string, unknown>): CursorLaunchResult {
  const agentId = String(data.id ?? data.agentId ?? '').trim()
  if (!agentId) {
    throw new AiDevError('Failed to start the Cursor Cloud Agent.', 'cursor_launch_failed', 502)
  }
  const target = (data.target ?? {}) as Record<string, unknown>
  const agentUrl =
    String(data.url ?? data.agentUrl ?? target.url ?? '').trim() ||
    `https://cursor.com/agents/${agentId}`
  return {
    agentId,
    agentUrl,
    branchName: String(target.branchName ?? '').trim() || null,
    prUrl: String(target.prUrl ?? '').trim() || null,
    status: String(data.status ?? '').trim() || 'CREATING',
  }
}

export async function launchCursorAgent(input: CursorLaunchInput): Promise<CursorLaunchResult> {
  const payload = {
    prompt: { text: input.prompt },
    source: {
      repository: input.repositoryUrl,
      ref: input.ref,
    },
    target: {
      autoCreatePr: true,
      openAsCursorGithubApp: true,
    },
    webhook: {
      url: input.webhookUrl,
      secret: input.webhookSecret,
    },
  }

  const response = await fetch(CURSOR_AGENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cursorApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const text = await response.text()
  if (!response.ok) {
    throw mapCursorHttpError(response.status, text)
  }
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new AiDevError('Failed to start the Cursor Cloud Agent.', 'cursor_launch_failed', 502)
  }
  return parseAgent(data)
}

export async function getCursorAgent(agentId: string): Promise<CursorAgentStatus> {
  const response = await fetch(`${CURSOR_AGENTS_URL}/${encodeURIComponent(agentId)}`, {
    headers: {
      Authorization: `Bearer ${cursorApiKey()}`,
    },
  })
  const text = await response.text()
  if (!response.ok) {
    throw mapCursorHttpError(response.status, text)
  }
  const data = JSON.parse(text) as Record<string, unknown>
  const parsed = parseAgent(data)
  return {
    id: parsed.agentId,
    status: parsed.status,
    branchName: parsed.branchName,
    prUrl: parsed.prUrl,
    agentUrl: parsed.agentUrl,
  }
}
