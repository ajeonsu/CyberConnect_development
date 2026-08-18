function truthyFlag(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'on'
}

/** Server-side gate. Default OFF so production deploys stay inert. */
export function isAiDevFeatureEnabled(): boolean {
  return truthyFlag(process.env.AI_DEV_ENABLED)
}

/** Client UI gate (build-time). Must also be on for the panel to fetch. */
export function isAiDevUiEnabled(): boolean {
  return truthyFlag(process.env.NEXT_PUBLIC_AI_DEV_ENABLED)
}
