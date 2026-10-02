export const ASSET_GATEWAY_MAX_BYTES = 10 * 1024 * 1024;

export const UPLOADED_REPORT_FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function resolveUploadedReportMime(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const expectedMime = UPLOADED_REPORT_FILE_TYPES[extension];
  if (!expectedMime) return null;
  const declaredMime = file.type.toLowerCase();
  if (declaredMime && declaredMime !== expectedMime && !(extension === 'jpg' && declaredMime === 'image/jpg')) return null;
  return expectedMime;
}

export function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('FILE_READ_FAILED'));
    reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
    reader.readAsDataURL(file);
  });
}
