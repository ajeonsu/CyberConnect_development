'use server'

import { createClient } from '@/lib/supabase-server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

function generateInviteCode(): string {
  return `TEAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Row shape returned by public.join_team_by_invite_code (PostgREST RPC). */
type JoinTeamByInviteRpcRow = {
  success: boolean
  error?: string | null
  team_slug?: string | null
  team_name?: string | null
}

export async function isTeamOwnerAction(): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  
  const supabase = await createClient()
  
  // Get profile ID first
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', session.email)
    .single()

  if (!profile) return false

  // Call the DB function
  const { data, error } = await supabase
    .rpc('is_team_owner', { user_id: profile.id })

  if (error) {
    console.error('isTeamOwnerAction error:', error)
    return false
  }

  return !!data
}

export async function purchaseTeamPlanAction(teamName: string, teamSlug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    
    const supabase = await createClient()
    
    // 1. Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', session.email)
      .single()

    if (!profile) return { success: false, error: 'User profile not found' }

    // 2. Create the Team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        slug: teamSlug,
        owner_id: profile.id,
        invite_code: generateInviteCode()
      })
      .select()
      .single()

    if (teamError) {
      if (teamError.code === '23505') return { success: false, error: 'Team slug already exists' }
      throw teamError
    }

    // 3. Automatically add user as Admin in team_members
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        profile_id: profile.id,
        role: 'admin'
      })

    if (memberError) throw memberError

    // 4. Update cookies immediately so middleware allows the new route
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

    cookieStore.set('active_workspace_role', 'admin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE
    })

    cookieStore.set('active_team_slug', teamSlug, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE
    })

    cookieStore.set('cyberconnect_account_kind', 'team', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE
    })

    revalidatePath('/personal/dashboard')
    revalidatePath('/', 'layout')
    
    return { success: true }
  } catch (err: any) {
    console.error('purchaseTeamPlanAction unexpected error:', err)
    return { success: false, error: err.message || 'An unexpected error occurred' }
  }
}

export async function updateTeamAction(teamId: string, updates: { name?: string }): Promise<{ id: string; name: string; slug: string; invite_code: string | null }> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  const payload: Record<string, string> = {}
  if (typeof updates.name === 'string') payload.name = updates.name.trim()

  const { data, error } = await supabase
    .from('teams')
    .update(payload)
    .eq('id', teamId)
    .select('id, name, slug, invite_code')
    .single()

  if (error) throw error
  revalidatePath('/')
  return data
}

export async function regenerateTeamInviteCodeAction(teamId: string): Promise<string> {
  const nextCode = generateInviteCode()
  const supabase = await createClient()
  const { error } = await supabase
    .from('teams')
    .update({ invite_code: nextCode })
    .eq('id', teamId)

  if (error) throw error
  revalidatePath('/')
  return nextCode
}

export async function joinTeamByInviteCodeAction(code: string): Promise<{ success: boolean; teamSlug?: string; teamName?: string; error?: string }> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) return { success: false, error: 'Invite code is required' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('join_team_by_invite_code', { p_invite_code: normalizedCode })
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to join team' }
  }

  const row = data as JoinTeamByInviteRpcRow
  if (!row.success) {
    return { success: false, error: row.error || 'Failed to join team' }
  }

  revalidatePath('/')
  return {
    success: true,
    teamSlug: row.team_slug ?? undefined,
    teamName: row.team_name ?? undefined,
  }
}
