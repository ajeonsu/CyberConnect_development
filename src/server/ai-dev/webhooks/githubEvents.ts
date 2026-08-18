export const GITHUB_APP_ALLOWED_EVENTS = [
  'ping',
  'pull_request',
  'check_run',
  'check_suite',
  'status',
] as const

export type GitHubAppEventClass = 'ping' | 'allowed' | 'ignored'

export function classifyGitHubAppEvent(eventName: string): GitHubAppEventClass {
  const name = eventName.trim().toLowerCase()
  if (name === 'ping') return 'ping'
  if (name === 'pull_request' || name === 'check_run' || name === 'check_suite' || name === 'status') {
    return 'allowed'
  }
  return 'ignored'
}
