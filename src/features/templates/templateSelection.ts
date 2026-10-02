/** Route a selectable template through the existing Use flow, otherwise preview it. */
export function selectTemplateFromLibrary<T extends { isPaused?: boolean }>(
  template: T,
  canUseTemplate: boolean,
  onUse: (template: T) => void,
  onPreview: (template: T) => void,
): void {
  if (canUseTemplate && !template.isPaused) {
    onUse(template);
    return;
  }
  onPreview(template);
}
