import { verifyHmacSha256Hex } from './verify'

export type WebhookAuthorizeResult =
  | { action: 'reject'; status: 401; error: string }
  | { action: 'reject'; status: 400; error: string }
  | { action: 'ignore'; reason: 'feature_disabled' }
  | { action: 'continue'; deliveryId: string }

/**
 * HMAC is verified before the feature flag. Flag-off is not a reason to
 * treat an unsigned webhook as success. Verification is local-only (no
 * Cursor/GitHub HTTP calls).
 */
export function authorizeAiDevWebhook(input: {
  rawBody: string
  signatureHeader: string | null
  secret: string
  featureEnabled: boolean
  deliveryId: string | null
  invalidSignatureMessage: string
  missingDeliveryMessage: string
}): WebhookAuthorizeResult {
  if (!verifyHmacSha256Hex(input.rawBody, input.signatureHeader, input.secret)) {
    return { action: 'reject', status: 401, error: input.invalidSignatureMessage }
  }
  if (!input.featureEnabled) {
    return { action: 'ignore', reason: 'feature_disabled' }
  }
  const deliveryId = input.deliveryId?.trim() ?? ''
  if (!deliveryId) {
    return { action: 'reject', status: 400, error: input.missingDeliveryMessage }
  }
  return { action: 'continue', deliveryId }
}
