export class AiDevError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status = 400) {
    super(message)
    this.name = 'AiDevError'
    this.code = code
    this.status = status
  }
}

export function userErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case 'feature_disabled':
      return 'AI implementation is not enabled.'
    case 'forbidden':
      return 'You do not have permission to start AI implementation.'
    case 'personal_workspace':
      return 'AI implementation is only available on team projects.'
    case 'duplicate_active_run':
      return 'This task already has an AI implementation in progress.'
    case 'repo_not_allowed':
      return 'This repository is not allowed for AI implementation on this project.'
    case 'base_not_allowed':
      return 'This base branch is not allowed for AI implementation.'
    case 'base_branch_missing':
      return 'The allowed base branch does not exist on GitHub.'
    case 'github_app_not_installed':
      return 'The GitHub App is not installed on this repository.'
    case 'github_repo_inaccessible':
      return 'GitHub repository access could not be confirmed.'
    case 'installation_mismatch':
      return 'GitHub App installation does not match this repository.'
    case 'cursor_auth':
      return 'Cursor authentication failed.'
    case 'cursor_rate_limit':
      return 'Cursor is rate-limited. Try again later.'
    case 'cursor_repo_access':
      return 'Cursor cannot access this repository. Check the Cursor GitHub App install.'
    case 'cursor_launch_failed':
      return 'Failed to start the Cursor Cloud Agent.'
    case 'cursor_agent_failed':
      return 'The Cursor Cloud Agent did not complete successfully.'
    case 'pr_not_created':
      return 'The agent finished without creating a pull request.'
    case 'github_rate_limit':
      return 'GitHub API rate limit reached. Reopen this task in a moment.'
    case 'task_not_found':
      return 'Task not found.'
    case 'project_not_found':
      return 'Project not found.'
    default:
      return fallback
  }
}
