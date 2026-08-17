export function isAiDevUiEnabled(): boolean {
  const v = (process.env.NEXT_PUBLIC_AI_DEV_ENABLED ?? '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'on'
}
