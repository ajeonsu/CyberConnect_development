import { createServiceRoleClient } from '@/lib/supabase-admin'
import type { AiDevRunRow } from './types'

export type AiDevEventClaim = 'claimed' | 'duplicate'

export async function claimAiDevEvent(input: {
  run: Pick<AiDevRunRow, 'id' | 'team_id'>
  eventType: string
  idempotencyKey: string
  actorProfileId?: string | null
  payload?: Record<string, unknown>
}): Promise<AiDevEventClaim> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ai_dev_events').insert({
    run_id: input.run.id,
    team_id: input.run.team_id,
    event_type: input.eventType,
    actor_profile_id: input.actorProfileId ?? null,
    idempotency_key: input.idempotencyKey,
    payload: input.payload ?? {},
  })
  if (error) {
    if (error.code === '23505') return 'duplicate'
    throw new Error(error.message)
  }
  return 'claimed'
}

export async function appendAiDevEvent(input: {
  run: Pick<AiDevRunRow, 'id' | 'team_id'>
  eventType: string
  idempotencyKey: string
  actorProfileId?: string | null
  payload?: Record<string, unknown>
}): Promise<void> {
  await claimAiDevEvent(input)
}
