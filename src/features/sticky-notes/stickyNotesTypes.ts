export type StickyNoteColor = 'yellow' | 'blue' | 'green' | 'rose' | 'purple';
export interface StickyNote { id: string; userId: string; title: string; content: string; colorKey: StickyNoteColor; isPinned: boolean; createdAt: string; updatedAt: string; archivedAt: string | null; }
export type StickyNoteInput = Pick<StickyNote, 'title' | 'content' | 'colorKey' | 'isPinned'>;
