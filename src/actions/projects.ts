'use server'

import { createClient } from '@/lib/supabase-server'
import { getSession } from './auth'
import { Project } from '@/types'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side actions for managing Projects.
 * These actions enforce ownership and workspace isolation.
 */

async function getProfileByEmail(supabase: SupabaseClient, email: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()
  return data
}

async function getTeamIdBySlug(supabase: SupabaseClient, slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (error || !data) return null;
  return data.id;
}

/** Resolve team UUID from URL slug (e.g. when the user has no projects yet but needs the team roster). */
export async function getTeamIdBySlugAction(slug: string): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  const supabase = await createClient()
  return getTeamIdBySlug(supabase, slug)
}

export async function getProjectsAction(workspaceType?: 'personal' | 'team', teamId?: string, teamSlug?: string): Promise<Project[]> {
  const session = await getSession()
  if (!session) return []
  
  const supabase = await createClient()
  const profile = await getProfileByEmail(supabase, session.email)
  if (!profile) return []

  const activeRole = session.activeWorkspaceRole || session.role;
  
  // Strict Context Resolution
  const targetType = workspaceType || (activeRole === 'personal' ? 'personal' : 'team');
  let targetTeamId = teamId;
  
  if (targetType === 'team' && !targetTeamId) {
    const slug = teamSlug || session.activeTeamSlug;
    if (slug) {
      targetTeamId = await getTeamIdBySlug(supabase, slug) || undefined;
    }
  }

  let query = supabase.from('projects')
    .select('*, project_members(profile_id, workspace_role)');

  if (targetType === 'personal') {
    // Scenario C: Personal Space - Strictly isolated to creator
    query = query.eq('workspace_type', 'personal')
      .is('team_id', null)
      .eq('owner_id', profile.id);
  } else if (targetType === 'team' && targetTeamId) {
    // TEAM SCOPE: Must filter by the specific team ID
    query = query.eq('workspace_type', 'team')
      .eq('team_id', targetTeamId);

    // Platform admin OR company admin on this team sees every team project (e.g. executive dashboard).
    // Otherwise active_workspace_role is often pm/dev while assigning others, which wrongly hid projects.
    let skipMemberFilter = activeRole === 'admin' || session.role === 'admin';
    if (!skipMemberFilter) {
      const { data: teamRow } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', targetTeamId)
        .eq('profile_id', profile.id)
        .maybeSingle();
      skipMemberFilter = teamRow?.role === 'admin';
    }

    if (!skipMemberFilter) {
      // Scenario B: Role-Based Filter (PM, Dev, Client) for THIS specific company
      const dbRole = activeRole === 'dev' ? 'dev' : activeRole;
      
      const { data: memberEntries } = await supabase.from('project_members')
        .select('project_id')
        .eq('profile_id', profile.id)
        .eq('workspace_role', dbRole);
      
      const assignedProjectIds = (memberEntries || []).map(m => m.project_id);

      if (activeRole === 'pm') {
        const filterParts = [`pm_id.eq.${profile.id}`];
        if (assignedProjectIds.length > 0) {
          filterParts.push(`id.in.(${assignedProjectIds.join(',')})`);
        }
        query = query.or(filterParts.join(','));
      } else {
        if (assignedProjectIds.length === 0) return [];
        query = query.in('id', assignedProjectIds);
      }
    }
  } else {
    // No valid context found
    return [];
  }

  const { data, error } = await query;
  if (error) {
    console.error('getProjectsAction error:', error);
    return [];
  }

  const rows = (data ?? []) as any[]
  return rows.map(p => {
    const members = (p.project_members || []) as { profile_id: string; workspace_role: string }[]
    return {
      ...p,
      projectMemberEntries: members.map(m => ({ profile_id: m.profile_id, workspace_role: m.workspace_role })),
      assignedDevIds: members.filter(m => m.workspace_role === 'dev').map(m => m.profile_id),
    }
  }) as Project[];
}

export async function getProjectByIdAction(id: string): Promise<Project | null> {
  const session = await getSession()
  if (!session) return null
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members (
        profile_id,
        workspace_role
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('getProjectByIdAction error:', error)
    return null
  }
  
  const p = data as Record<string, unknown>
  const members = (p.project_members || []) as { profile_id: string; workspace_role: string }[]
  return {
    ...p,
    projectMemberEntries: members.map(m => ({ profile_id: m.profile_id, workspace_role: m.workspace_role })),
    assignedDevIds: members.filter(m => m.workspace_role === 'dev').map(m => m.profile_id),
  } as Project
}

export async function assignProjectMemberAction(projectId: string, profileId: string, role: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  
  // Mapping 'dev' UI role to 'dev' SQL ENUM
  const dbRole = role === 'dev' ? 'dev' : role;

  const { error } = await supabase
    .from('project_members')
    .upsert({ 
      project_id: projectId, 
      profile_id: profileId, 
      workspace_role: dbRole 
    }, { onConflict: 'project_id,profile_id' });

  if (error) throw error;
  
  // If assigning as PM, also update the main pm_id on the projects table for quick lookup
  if (role === 'pm') {
    await supabase.from('projects').update({ pm_id: profileId }).eq('id', projectId);
  }

  revalidatePath('/', 'layout')
  revalidatePath('/', 'layout')
}

export async function removeProjectMemberAction(projectId: string, profileId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('profile_id', profileId);

  if (error) throw error;
  
  // If this user was the primary PM, also clear it from the projects table
  const { data: project } = await supabase.from('projects').select('pm_id').eq('id', projectId).single();
  if (project?.pm_id === profileId) {
    await supabase.from('projects').update({ pm_id: null }).eq('id', projectId);
  }

  revalidatePath('/', 'layout')
  revalidatePath('/', 'layout')
}

export async function createProjectAction(project: Partial<Project>): Promise<{ success: boolean; data?: Project; error?: string }> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    
    const supabase = await createClient()
    
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', session.email)
      .single()

    if (!profile) return { success: false, error: 'User profile not found' }
    
    const activeRole = session.activeWorkspaceRole || session.role
    const isPersonal = project.workspace_type === 'personal' || activeRole === 'personal'
    
    // Resolve Team ID from context
    let teamId: string | null = null;
    if (!isPersonal) {
      // Priority: 1. team_id passed in project, 2. Resolve from activeTeamSlug
      if (project.team_id) {
        teamId = project.team_id;
      } else if (session.activeTeamSlug) {
        teamId = await getTeamIdBySlug(supabase, session.activeTeamSlug);
      }
      
      if (!teamId) {
        return { success: false, error: 'No active team context found. Please ensure you are in a team workspace.' }
      }
    }

    // Build payload dynamically based on active space
    const payload: Record<string, any> = {
      ...project,
      status: project.status || 'active',
      workspace_type: isPersonal ? 'personal' : 'team',
      owner_id: profile.id,
      team_id: isPersonal ? null : teamId,
    }

    // Security check: Only Admins or PMs can create Team projects
    if (!isPersonal && activeRole !== 'admin' && activeRole !== 'pm') {
      return { success: false, error: 'Forbidden: Only Administrators or Project Managers can create team projects' }
    }

    // Clean up UI-only or temp fields
    delete payload.assignedDevIds
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (payload.id && !uuidRegex.test(String(payload.id))) delete payload.id
    
    const uuidFields = ['pm_id', 'client_id']
    uuidFields.forEach(f => {
      if (payload[f] === '' || (payload[f] && !uuidRegex.test(String(payload[f])))) {
        payload[f] = null
      }
    })

    const { data, error } = await supabase
      .from('projects')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/', 'layout')
    return { success: true, data: { ...(data as Project), assignedDevIds: [] } }
  } catch (err: any) {
    console.error('Unexpected error in createProjectAction:', err)
    return { success: false, error: err.message || 'An unexpected error occurred' }
  }
}

export async function updateProjectAction(id: string, updates: Partial<Project>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  
  const supabase = await createClient()
  
  // Security check: ensure user owns this project if personal
  if (session.accountKind === 'personal') {
    const profile = await getProfileByEmail(supabase, session.email)
    const { data: existing } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', id)
      .single()
    
    if (existing?.owner_id !== profile?.id) throw new Error('Forbidden')
  }

  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)

  if (error) throw error
  revalidatePath('/')
}

export async function deleteProjectAction(id: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  
  const supabase = await createClient()
  
  // Security check same as update
  if (session.accountKind === 'personal') {
    const profile = await getProfileByEmail(supabase, session.email)
    const { data: existing } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', id)
      .single()
    
    if (existing?.owner_id !== profile?.id) throw new Error('Forbidden')
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
  revalidatePath('/')
}
