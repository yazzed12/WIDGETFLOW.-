export function calculateInsertionIndex(
  hoveredIndex: number,
  itemCount: number,
  insertBefore: boolean,
): number {
  const boundedHover = Math.max(0, Math.min(hoveredIndex, itemCount));
  return Math.max(0, Math.min(boundedHover + (insertBefore ? 0 : 1), itemCount));
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function insertItem<T>(items: T[], item: T, index: number): T[] {
  const boundedIndex = Math.max(0, Math.min(index, items.length));
  return [...items.slice(0, boundedIndex), item, ...items.slice(boundedIndex)];
}
