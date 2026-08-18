export const AI_DEV_PROMPT_VERSION = 'phase1a-v1'

export type AiDevRunStatus =
  | 'starting'
  | 'running'
  | 'awaiting_review'
  | 'merged'
  | 'failed'
  | 'cancelled'

export type AiDevPrState = 'unknown' | 'draft' | 'open' | 'merged' | 'closed'

export type AiDevCiStatus = 'unknown' | 'none' | 'pending' | 'success' | 'failure'

export type AiDevRepoRow = {
  id: string
  team_id: string
  project_id: string
  github_owner: string
  github_repo: string
  installation_id: number
  default_base_branch: string
  allowed_base_branches: string[]
  denied_branches: string[]
  enabled: boolean
  cursor_enabled: boolean
}

export type AiDevRunRow = {
  id: string
  team_id: string
  project_id: string
  task_id: string
  ai_dev_repo_id: string
  github_owner: string
  github_repo: string
  base_branch: string
  base_sha: string
  cursor_agent_id: string | null
  cursor_agent_url: string | null
  cursor_branch_name: string | null
  status: AiDevRunStatus
  pr_number: number | null
  pr_url: string | null
  pr_state: AiDevPrState
  pr_head_sha: string | null
  ci_status: AiDevCiStatus
  ci_summary: Record<string, unknown>
  error_code: string | null
  error_message: string | null
  prompt_version: string
  prompt_hash: string | null
  started_by: string
  started_at: string
  completed_at: string | null
  last_reconciled_at: string | null
  created_at: string
  updated_at: string
}

export type AiDevRunPublic = {
  id: string
  projectId: string
  taskId: string
  githubOwner: string
  githubRepo: string
  baseBranch: string
  baseSha: string
  cursorAgentId: string | null
  cursorAgentUrl: string | null
  cursorBranchName: string | null
  status: AiDevRunStatus
  prNumber: number | null
  prUrl: string | null
  prState: AiDevPrState
  prHeadSha: string | null
  ciStatus: AiDevCiStatus
  ciSummary: Record<string, unknown>
  errorCode: string | null
  errorMessage: string | null
  promptVersion: string
  startedBy: string
  startedAt: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AiDevRepoPublic = {
  id: string
  githubOwner: string
  githubRepo: string
  defaultBaseBranch: string
}

export const ACTIVE_RUN_STATUSES: AiDevRunStatus[] = [
  'starting',
  'running',
  'awaiting_review',
]

export function isActiveRunStatus(status: string): boolean {
  return ACTIVE_RUN_STATUSES.includes(status as AiDevRunStatus)
}

export function toPublicRun(row: AiDevRunRow): AiDevRunPublic {
  return {
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    githubOwner: row.github_owner,
    githubRepo: row.github_repo,
    baseBranch: row.base_branch,
    baseSha: row.base_sha,
    cursorAgentId: row.cursor_agent_id,
    cursorAgentUrl: row.cursor_agent_url,
    cursorBranchName: row.cursor_branch_name,
    status: row.status,
    prNumber: row.pr_number,
    prState: row.pr_state,
    prUrl: row.pr_url,
    prHeadSha: row.pr_head_sha,
    ciStatus: row.ci_status,
    ciSummary: row.ci_summary ?? {},
    errorCode: row.error_code,
    errorMessage: row.error_message,
    promptVersion: row.prompt_version,
    startedBy: row.started_by,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toPublicRepo(row: AiDevRepoRow): AiDevRepoPublic {
  return {
    id: row.id,
    githubOwner: row.github_owner,
    githubRepo: row.github_repo,
    defaultBaseBranch: row.default_base_branch,
  }
}
