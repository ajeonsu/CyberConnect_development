import { AiDevError } from './errors'
import type { AiDevRepoRow } from './types'

export type PolicyResolution = {
  repo: AiDevRepoRow
  baseBranch: string
}

function norm(value: string): string {
  return value.trim()
}

function includesBranch(list: string[], branch: string): boolean {
  const target = branch.toLowerCase()
  return list.some((item) => item.trim().toLowerCase() === target)
}

export function resolveAiDevPolicy(input: {
  repo: AiDevRepoRow | null
  taskProjectId: string
  taskTeamId: string
  requestedRepoId: string
}): PolicyResolution {
  const { repo, taskProjectId, taskTeamId, requestedRepoId } = input
  if (!repo || repo.id !== requestedRepoId) {
    throw new AiDevError(
      'This repository is not allowed for AI implementation on this project.',
      'repo_not_allowed',
      400
    )
  }
  if (repo.project_id !== taskProjectId || repo.team_id !== taskTeamId) {
    throw new AiDevError(
      'This repository is not allowed for AI implementation on this project.',
      'repo_not_allowed',
      400
    )
  }
  if (!repo.enabled || !repo.cursor_enabled) {
    throw new AiDevError(
      'This repository is not allowed for AI implementation on this project.',
      'repo_not_allowed',
      400
    )
  }

  const allowed = (repo.allowed_base_branches ?? []).map(norm).filter(Boolean)
  const denied = (repo.denied_branches ?? []).map(norm).filter(Boolean)
  const baseBranch = norm(repo.default_base_branch)

  if (!baseBranch || allowed.length === 0) {
    throw new AiDevError('This base branch is not allowed for AI implementation.', 'base_not_allowed', 400)
  }
  if (!includesBranch(allowed, baseBranch)) {
    throw new AiDevError('This base branch is not allowed for AI implementation.', 'base_not_allowed', 400)
  }
  if (includesBranch(denied, baseBranch)) {
    throw new AiDevError('This base branch is not allowed for AI implementation.', 'base_not_allowed', 400)
  }

  return { repo, baseBranch }
}

export function githubRepoKey(owner: string, repo: string): string {
  return `${owner.trim().toLowerCase()}/${repo.trim().toLowerCase()}`
}

export function parseGithubRepoFromUrl(url: string): { owner: string; repo: string } | null {
  const raw = url.trim()
  if (!raw) return null
  try {
    const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
    const parsed = new URL(withProto)
    if (!parsed.hostname.endsWith('github.com')) return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    const owner = parts[0] ?? ''
    const repo = (parts[1] ?? '').replace(/\.git$/i, '')
    if (!owner || !repo) return null
    return { owner, repo }
  } catch {
    return null
  }
}

export function parsePullRequestUrl(url: string): { owner: string; repo: string; number: number } | null {
  const raw = url.trim()
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    if (!parsed.hostname.endsWith('github.com')) return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 4 || parts[2] !== 'pull') return null
    const number = Number(parts[3])
    if (!Number.isInteger(number) || number <= 0) return null
    return { owner: parts[0]!, repo: parts[1]!, number }
  } catch {
    return null
  }
}

export function cursorRepositoryUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`
}
