export function isUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export function resolveUserName(
  userId?: string | null,
  fallback?: string | null,
  usersList?: Array<{ id: string; name?: string; full_name?: string; email?: string }>
): string {
  if (fallback && !isUuid(fallback) && fallback.trim() !== '') {
    return fallback.trim();
  }
  if (userId && usersList && Array.isArray(usersList)) {
    const found = usersList.find((u) => u.id === userId);
    if (found) {
      return (found.full_name || found.name || found.email || 'Unknown user').trim();
    }
  }
  if (userId && isUuid(userId)) {
    return 'Unknown user';
  }
  if (fallback && fallback.trim() !== '') {
    return fallback.trim();
  }
  return '—';
}

export function resolveTemplateName(
  templateId?: string | null,
  fallback?: string | null,
  templatesList?: Array<{ id: string; name?: string; title?: string }>
): string {
  if (fallback && !isUuid(fallback) && fallback.trim() !== '') {
    return fallback.trim();
  }
  if (templateId && templatesList && Array.isArray(templatesList)) {
    const found = templatesList.find((t) => t.id === templateId);
    if (found) {
      return (found.name || found.title || 'Untitled Template').trim();
    }
  }
  if (templateId && isUuid(templateId)) {
    return 'Template record unavailable';
  }
  if (fallback && fallback.trim() !== '') {
    return fallback.trim();
  }
  return '—';
}

export function resolveCategoryName(
  categoryId?: string | null,
  fallback?: string | null,
  categoriesList?: Array<{ id: string; name?: string }>
): string {
  if (fallback && !isUuid(fallback) && fallback.trim() !== '') {
    return fallback.trim();
  }
  if (categoryId && categoriesList && Array.isArray(categoriesList)) {
    const found = categoriesList.find((c) => c.id === categoryId);
    if (found && found.name) {
      return found.name.trim();
    }
  }
  if (categoryId && isUuid(categoryId)) {
    return 'Standard Category';
  }
  if (fallback && fallback.trim() !== '') {
    return fallback.trim();
  }
  return 'General';
}

export function formatDate(dateVal: any, includeTime = false): string {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    if (includeTime) {
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
}

export function formatFileSize(bytes?: number | string | null): string {
  if (bytes === null || bytes === undefined || bytes === '') return '—';
  const num = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (isNaN(num)) return '—';
  if (num < 1024) return num + ' B';
  if (num < 1024 * 1024) return (num / 1024).toFixed(1) + ' KB';
  return (num / (1024 * 1024)).toFixed(1) + ' MB';
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
