'use server'

import { createClient } from '@/lib/supabase-server'
import { getSession } from './auth'
import { SheetRow } from '@/types'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side actions for managing Sheet Rows across all tables.
 * Centralizes data cleaning and security checks.
 */

const TABLE_MAP: Record<string, string> = {
  'purpose': 'purpose_rows',
  'tech_stack': 'tech_stack_rows',
  'screen_list': 'screen_list_rows',
  'function_list': 'function_list_rows',
  'tasks': 'task_rows',
  'test_case': 'test_case_rows',
  'backlog': 'backlog_rows',
  'process_chart': 'process_chart_rows',
  'non_func': 'non_func_rows',
  'app_list': 'api_list_rows'
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: unknown): uuid is string {
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

function sanitizeRowData(row: Record<string, unknown>, tableName: string, currentUserId?: string) {
  const clean: Record<string, unknown> = {}

  for (const key in row) {
    let val = row[key]
    
    // 0. Skip virtual/UI-only fields
    if (key === 'assignedDevIds' || key === 'project_name') continue

    // 1. Handle Primary Keys and Mandatory Foreign Keys (id, project_id)
    if (key === 'id' || key === 'project_id') {
      if (isValidUUID(val)) {
        clean[key] = val;
      }
      continue;
    }

    // 2. Map Frontend Column Names to DB UUID Foreign Keys
    // If we have 'assignee' (which now contains a UUID), we move it to 'assignee_id'
    if (key === 'assignee' || key === 'owner' || key === 'tester') {
      const idKey = `${key}_id`;
      if (isValidUUID(val)) {
        clean[idKey] = val;
      } else {
        clean[idKey] = null;
      }
      continue;
    }

    // 3. Handle explicit UUID Foreign Keys (owner_id, assignee_id, etc.)
    if (key === 'owner_id' || key === 'assignee_id' || key === 'tester_id' || key.endsWith('_id')) {
      if (isValidUUID(val)) {
        clean[key] = val;
      } else {
        clean[key] = null;
      }
      continue;
    }

    // 4. Handle Nullable Numeric Columns
    if (key === 'person_day' || key === 'person_days' || key === 'sort_order') {
      if (val === '' || val === null || val === undefined) {
        val = null;
      } else {
        const parsed = parseFloat(String(val))
        val = isNaN(parsed) ? null : parsed
      }
    }

    // 5. Handle Nullable Date Columns
    if (key === 'deadline' || key === 'completed_date' || key === 'created_at' || key === 'updated_at') {
      val = (val === '' || !val) ? null : val
    }

    // 6. Handle NOT NULL Text Columns (must be at least empty string, never null)
    const notNullTextFields = [
      'remark', 'remarks', 'remark_ja', 'remarks_ja', 'completion_pm', 'status', 'effort', 
      'epic', 'epic_ja', 'story', 'story_ja', 'task', 'task_ja', 'scenario_name', 'scenario_name_ja',
      'test_type', 'summary', 'summary_ja', 'test_steps', 'test_steps_ja', 'expected_results', 
      'expected_results_ja', 'tester', 'category', 'category_ja', 'service_name', 'service_name_ja',
      'api_name', 'api_name_ja', 'auth_method', 'auth_method_ja', 'data_handling', 'data_handling_ja',
      'screen_name', 'screen_name_ja', 'screen_code', 'function_name', 'function_name_ja', 
      'function_code', 'function_details', 'function_details_ja', 'main_category', 'main_category_ja',
      'subcategory', 'subcategory_ja', 'user_category', 'user_category_ja', 'task_code', 'sprint', 'code',
      'major_item', 'content', 'details'
    ];
    if (notNullTextFields.includes(key)) {
      val = (val === null || val === undefined) ? '' : String(val)
    }

    // 7. Handle ENUM Columns (Never send empty string if it's an enum and not in the type)
    const enumFields = ['phase', 'realtime', 'mvp_required', 'status', 'completion_pm', 'completion_dev', 'completion_client'];
    if (enumFields.includes(key) && val === '') {
      val = null;
    }

    // 8. Global Catch-all for UUID Columns (ending in _id)
    // If a key ends in _id and it's an empty string, it MUST be null or omitted.
    if (key.endsWith('_id') && val === '') {
      val = null;
    }

    clean[key] = val
  }

  /** Table-specific mapping fixes */

  if (tableName === 'task_rows') {
    // DB: assignee_id (UUID), frontend: assignee (UUID from select)
    // If it's still null and DB says NOT NULL, we fallback to current user
    if (!clean.assignee_id && currentUserId) {
      clean.assignee_id = currentUserId;
    }
    
    // Ensure status is never empty
    if (clean.status === null || clean.status === '') clean.status = 'Not started';
    
    // PM Check enum: ensure it maps correctly
    if (clean.completion_pm === null || clean.completion_pm === '') clean.completion_pm = ''; 
  }
  
  if (tableName === 'screen_list_rows') {
    if ('remark' in clean && !('remarks' in clean)) {
      clean.remarks = clean.remark;
      delete clean.remark;
    }
  }

  if (tableName === 'function_list_rows') {
    // Ensure enums aren't invalid empty strings
    // AND map 'Not started' (frontend) to 'Need to be checked' (DB enum default)
    if (clean.status === '' || clean.status === 'Not started') {
      clean.status = 'Need to be checked';
    }
    if (clean.completion_dev === '') clean.completion_dev = null;
    if (clean.completion_client === '') clean.completion_client = null;
  }

  if (tableName === 'backlog_rows') {
    // Sprint is an enum here
    if (clean.sprint === '') clean.sprint = 'Backlog';
  }

  if (tableName === 'purpose_rows') {
    for (const key of ['major_item_ja', 'content_ja', 'details_ja'] as const) {
      if (clean[key] === null || clean[key] === undefined) clean[key] = '';
    }
  }

  return clean;
}

async function verifyProjectAccess(supabase: SupabaseClient, projectId: string) {
  const session = await getSession()
  if (!session || !isValidUUID(projectId)) return false

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id, workspace_type, team_id')
    .eq('id', projectId)
    .single()

  if (!project) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', session.email)
    .single()

  if (!profile) return false

  if (project.workspace_type === 'personal') {
    return project.owner_id === profile.id && project.team_id === null
  }

  // Team space validation
  if (project.workspace_type === 'team') {
    if (!project.team_id) return false
    
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('profile_id', profile.id)
      .eq('team_id', project.team_id)
      .single()

    return !!membership
  }

  return false
}

export async function getSheetRowsAction(projectId: string, tabId: string): Promise<SheetRow[]> {
  const tableName = TABLE_MAP[tabId]
  if (!tableName) return []

  const supabase = await createClient()
  if (!(await verifyProjectAccess(supabase, projectId))) return []

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`getSheetRowsAction error (${tableName}):`, error)
    return []
  }
  
  return data as SheetRow[]
}

export async function upsertSheetRowAction(tabId: string, row: Partial<SheetRow> & { id: string; project_id: string }): Promise<SheetRow> {
  const tableName = TABLE_MAP[tabId]
  if (!tableName) throw new Error(`Unknown table for tab: ${tabId}`)

  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createClient()
  if (!(await verifyProjectAccess(supabase, row.project_id))) throw new Error('Forbidden')

  // Get current user profile ID for fallbacks
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', session.email).single();
  const currentUserId = profile?.id;

  const cleanedData = sanitizeRowData(row, tableName, currentUserId)

  const { data, error } = await supabase
    .from(tableName)
    .upsert(cleanedData)
    .select()
    .single()

  if (error) {
    console.error(`DB Error in ${tableName}:`, JSON.stringify(error, null, 2))
    throw error
  }
  
  revalidatePath('/')
  return data as SheetRow
}

export async function deleteSheetRowAction(tabId: string, projectId: string, rowId: string): Promise<void> {
  const tableName = TABLE_MAP[tabId]
  if (!tableName) throw new Error(`Unknown table for tab: ${tabId}`)

  const supabase = await createClient()
  if (!(await verifyProjectAccess(supabase, projectId))) throw new Error('Forbidden')

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', rowId)

  if (error) throw error
  revalidatePath('/')
}
