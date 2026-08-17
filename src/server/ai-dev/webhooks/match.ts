import { githubRepoKey, parseGithubRepoFromUrl } from '../policy'

export function webhookTargetsSameRepo(input: {
  runOwner: string
  runRepo: string
  payloadOwner: string
  payloadRepo: string
}): boolean {
  return (
    githubRepoKey(input.runOwner, input.runRepo) ===
    githubRepoKey(input.payloadOwner, input.payloadRepo)
  )
}

export function cursorSourceMatchesRun(input: {
  runOwner: string
  runRepo: string
  sourceRepository: string | undefined
}): boolean {
  if (!input.sourceRepository) return false
  const parsed = parseGithubRepoFromUrl(input.sourceRepository)
  if (!parsed) return false
  return webhookTargetsSameRepo({
    runOwner: input.runOwner,
    runRepo: input.runRepo,
    payloadOwner: parsed.owner,
    payloadRepo: parsed.repo,
  })
}

export function installationMatches(stored: number, payload: number | undefined): boolean {
  return typeof payload === 'number' && payload === stored
}
