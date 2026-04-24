import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * API Route for fetching projects. 
 * This can be consumed by the separate Vite app or other clients.
 * It uses the same server-side Supabase client as the Server Actions.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // In production, replace with specific origins
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_members(profile_id)')
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS })
  }
  
  const mapped = (data as Record<string, unknown>[]).map(p => ({
    ...p,
    assignedDevIds: (p.project_members as { profile_id: string }[])?.map((m) => m.profile_id) || []
  }))

  return NextResponse.json(mapped, { headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS })
}
