export interface TemplateAssetUploadPayload {
  filename?: string;
  mimeType?: string;
  base64Data: string;
  linkedTemplateId: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanonicalTemplateUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Build only the linked template-asset contract accepted by asset-gateway. */
export function buildTemplateAssetUploadBody(
  payload: TemplateAssetUploadPayload,
): TemplateAssetUploadPayload & { purpose: 'template_asset' } {
  if (!isCanonicalTemplateUuid(payload.linkedTemplateId)) {
    throw new Error('A saved template is required before uploading an image.');
  }

  return { ...payload, purpose: 'template_asset' };
}
