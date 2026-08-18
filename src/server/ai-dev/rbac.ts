import { createClient } from '@/lib/supabase-server'
import { getSession } from '@/server/auth'
import {
  resolveTeamProjectPrivilege,
  canStartAiDev,
  type TeamProjectPrivilege,
} from '@/lib/team-project-auth'
import { AiDevError } from './errors'

/**
 * API writes use service role after RBAC. SELECT RLS uses existing
 * user_can_access_project(project_id), which allows any team member of the
 * project's team (not only project_members). Phase 1-A PoC assumes one
 * mock customer per independent team. Do not change that helper here;
 * production multi-customer-in-one-team would need project-scoped RLS.
 */
export type AiDevActor = {
  profileId: string
  email: string
  privilege: TeamProjectPrivilege
  project: {
    id: string
    team_id: string
    workspace_type: string
  }
}

async function loadActor(projectId: string): Promise<AiDevActor> {
  const session = await getSession()
  if (!session) throw new AiDevError('Unauthorized', 'forbidden', 401)

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', session.email)
    .maybeSingle()
  if (!profile) throw new AiDevError('Unauthorized', 'forbidden', 401)

  const { data: project } = await supabase
    .from('projects')
    .select('id, team_id, workspace_type, pm_id, client_id, owner_id')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) throw new AiDevError('Project not found.', 'project_not_found', 404)

  if (project.workspace_type !== 'team' || !project.team_id) {
    throw new AiDevError(
      'AI implementation is only available on team projects.',
      'personal_workspace',
      403
    )
  }

  const privilege = await resolveTeamProjectPrivilege(supabase, profile.id, {
    id: project.id,
    team_id: project.team_id,
    workspace_type: project.workspace_type,
    pm_id: project.pm_id,
    client_id: project.client_id,
  })

  return {
    profileId: profile.id,
    email: session.email,
    privilege,
    project: {
      id: project.id,
      team_id: project.team_id,
      workspace_type: project.workspace_type,
    },
  }
}

export async function assertCanViewAiDev(projectId: string): Promise<AiDevActor> {
  return loadActor(projectId)
}

export async function assertCanStartAiDev(projectId: string): Promise<AiDevActor> {
  const actor = await loadActor(projectId)
  if (!canStartAiDev(actor.privilege)) {
    throw new AiDevError('You do not have permission to start AI implementation.', 'forbidden', 403)
  }
  return actor
}
