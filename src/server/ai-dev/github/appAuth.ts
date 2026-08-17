import { createPrivateKey, sign } from 'crypto'
import { AiDevError } from '../errors'

const GITHUB_API = 'https://api.github.com'
const GITHUB_API_VERSION = '2022-11-28'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value?.trim()) {
    throw new AiDevError(`Missing ${name}.`, 'github_app_not_installed', 500)
  }
  return value.trim()
}

function normalizePem(raw: string): string {
  let pem = raw.trim()
  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1)
  }
  pem = pem.replace(/\\n/g, '\n')
  return pem
}

export function createGitHubAppJwt(): string {
  const appId = requiredEnv('AI_DEV_GITHUB_APP_ID')
  const pem = normalizePem(requiredEnv('AI_DEV_GITHUB_APP_PRIVATE_KEY'))
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 8 * 60, iss: appId })
  ).toString('base64url')
  const unsigned = `${header}.${payload}`
  const key = createPrivateKey(pem)
  const signature = sign('RSA-SHA256', Buffer.from(unsigned), key).toString('base64url')
  return `${unsigned}.${signature}`
}

async function githubFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'CyberConnect-AI-Dev',
      ...(init?.headers ?? {}),
    },
  })
  const data = (await response.json().catch(() => ({}))) as T
  return { ok: response.ok, status: response.status, data }
}

export async function getRepoInstallationId(owner: string, repo: string): Promise<number> {
  const jwt = createGitHubAppJwt()
  const { ok, status, data } = await githubFetch<{ id?: number; message?: string }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/installation`,
    jwt
  )
  if (status === 404 || !ok || typeof data.id !== 'number') {
    throw new AiDevError(
      'The GitHub App is not installed on this repository.',
      'github_app_not_installed',
      400
    )
  }
  return data.id
}

export async function createInstallationToken(installationId: number): Promise<string> {
  const jwt = createGitHubAppJwt()
  const { ok, status, data } = await githubFetch<{ token?: string; message?: string }>(
    `/app/installations/${installationId}/access_tokens`,
    jwt,
    { method: 'POST' }
  )
  if (!ok || !data.token) {
    if (status === 404) {
      throw new AiDevError(
        'The GitHub App is not installed on this repository.',
        'github_app_not_installed',
        400
      )
    }
    throw new AiDevError('GitHub repository access could not be confirmed.', 'github_repo_inaccessible', 400)
  }
  return data.token
}

export async function getRepository(
  token: string,
  owner: string,
  repo: string
): Promise<{ owner: string; name: string; defaultBranch: string }> {
  const { ok, status, data } = await githubFetch<{
    name?: string
    owner?: { login?: string }
    default_branch?: string
    message?: string
  }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token)
  if (status === 404 || !ok) {
    throw new AiDevError('GitHub repository access could not be confirmed.', 'github_repo_inaccessible', 400)
  }
  const login = data.owner?.login
  const name = data.name
  if (!login || !name) {
    throw new AiDevError('GitHub repository access could not be confirmed.', 'github_repo_inaccessible', 400)
  }
  return { owner: login, name, defaultBranch: data.default_branch ?? '' }
}

export async function getBranchSha(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const { ok, status, data } = await githubFetch<{
    commit?: { sha?: string }
    message?: string
  }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`,
    token
  )
  if (status === 404 || !ok || !data.commit?.sha) {
    throw new AiDevError('The allowed base branch does not exist on GitHub.', 'base_branch_missing', 400)
  }
  return data.commit.sha
}

export type GitHubPull = {
  number: number
  htmlUrl: string
  state: 'open' | 'closed'
  merged: boolean
  draft: boolean
  headSha: string
  headRef: string
  baseRef: string
}

export async function getPullRequest(
  token: string,
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPull | null> {
  const { ok, status, data } = await githubFetch<{
    number?: number
    html_url?: string
    state?: string
    merged?: boolean
    draft?: boolean
    head?: { sha?: string; ref?: string }
    base?: { ref?: string }
  }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`, token)
  if (status === 404) return null
  if (!ok || typeof data.number !== 'number' || !data.html_url) return null
  return {
    number: data.number,
    htmlUrl: data.html_url,
    state: data.state === 'closed' ? 'closed' : 'open',
    merged: Boolean(data.merged),
    draft: Boolean(data.draft),
    headSha: data.head?.sha ?? '',
    headRef: data.head?.ref ?? '',
    baseRef: data.base?.ref ?? '',
  }
}

export async function listPullsByHead(
  token: string,
  owner: string,
  repo: string,
  headRef: string
): Promise<GitHubPull | null> {
  const head = `${owner}:${headRef}`
  const { ok, data } = await githubFetch<
    Array<{
      number?: number
      html_url?: string
      state?: string
      merged_at?: string | null
      draft?: boolean
      head?: { sha?: string; ref?: string }
      base?: { ref?: string }
    }>
  >(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=all&head=${encodeURIComponent(head)}&per_page=5`,
    token
  )
  if (!ok || !Array.isArray(data) || data.length === 0) return null
  const item = data[0]
  if (!item || typeof item.number !== 'number' || !item.html_url) return null
  return {
    number: item.number,
    htmlUrl: item.html_url,
    state: item.state === 'closed' ? 'closed' : 'open',
    merged: Boolean(item.merged_at),
    draft: Boolean(item.draft),
    headSha: item.head?.sha ?? '',
    headRef: item.head?.ref ?? '',
    baseRef: item.base?.ref ?? '',
  }
}

export async function listCheckRuns(
  token: string,
  owner: string,
  repo: string,
  sha: string
) {
  const { ok, status, data } = await githubFetch<{
    check_runs?: Array<{ name?: string; status?: string; conclusion?: string | null }>
    message?: string
  }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}/check-runs?per_page=100`,
    token
  )
  if (status === 403) {
    throw new AiDevError(
      'GitHub API rate limit reached. Reopen this task in a moment.',
      'github_rate_limit',
      429
    )
  }
  if (!ok) return []
  return data.check_runs ?? []
}

export async function getCombinedStatus(
  token: string,
  owner: string,
  repo: string,
  sha: string
) {
  const { ok, status, data } = await githubFetch<{
    state?: string
    statuses?: Array<{ context?: string; state?: string }>
  }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}/status`,
    token
  )
  if (status === 403) {
    throw new AiDevError(
      'GitHub API rate limit reached. Reopen this task in a moment.',
      'github_rate_limit',
      429
    )
  }
  if (!ok) return null
  return data
}

export function mapPullToPrState(pull: GitHubPull): 'draft' | 'open' | 'merged' | 'closed' {
  if (pull.merged) return 'merged'
  if (pull.state === 'closed') return 'closed'
  if (pull.draft) return 'draft'
  return 'open'
}
