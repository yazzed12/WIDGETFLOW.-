export interface StudioWorkspacePreferences {
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
}

export interface StudioWorkspaceLayout extends StudioWorkspacePreferences {
  canvasWidth: number;
}

export const STUDIO_WORKSPACE_STORAGE_KEY = 'widgetflow.studio.workspace.v1';
export const DEFAULT_LEFT_PANEL_WIDTH = 400;
export const DEFAULT_RIGHT_PANEL_WIDTH = 320;
export const MIN_LEFT_PANEL_WIDTH = 300;
export const MAX_LEFT_PANEL_WIDTH = 560;
export const MIN_RIGHT_PANEL_WIDTH = 280;
export const MAX_RIGHT_PANEL_WIDTH = 520;
export const MIN_CANVAS_WIDTH = 420;
export const STUDIO_RESIZE_HANDLE_WIDTH = 6;

export const DEFAULT_STUDIO_WORKSPACE_PREFERENCES: StudioWorkspacePreferences = {
  leftWidth: DEFAULT_LEFT_PANEL_WIDTH,
  rightWidth: DEFAULT_RIGHT_PANEL_WIDTH,
  leftCollapsed: false,
  rightCollapsed: false,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function getStudioWorkspaceConstraints(availableWidth: number) {
  const width = Math.max(0, Number.isFinite(availableWidth) ? availableWidth : 0);
  return {
    canvasMinimum: width >= 1024 ? MIN_CANVAS_WIDTH : Math.max(240, Math.floor(width * 0.36)),
    leftMinimum: width >= 1024 ? MIN_LEFT_PANEL_WIDTH : Math.max(150, Math.floor(width * 0.22)),
    rightMinimum: width >= 1024 ? MIN_RIGHT_PANEL_WIDTH : Math.max(150, Math.floor(width * 0.20)),
  };
}

function validWidth(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), min, max);
}

function validStoredWidth(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return fallback;
  return Math.round(value);
}

export function readStudioWorkspacePreferences(storage?: Pick<Storage, 'getItem'>): StudioWorkspacePreferences {
  try {
    const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    const raw = target?.getItem(STUDIO_WORKSPACE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STUDIO_WORKSPACE_PREFERENCES };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_STUDIO_WORKSPACE_PREFERENCES };
    const value = parsed as Partial<StudioWorkspacePreferences>;
    return {
      leftWidth: validStoredWidth(value.leftWidth, DEFAULT_LEFT_PANEL_WIDTH, MIN_LEFT_PANEL_WIDTH, MAX_LEFT_PANEL_WIDTH),
      rightWidth: validStoredWidth(value.rightWidth, DEFAULT_RIGHT_PANEL_WIDTH, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH),
      leftCollapsed: typeof value.leftCollapsed === 'boolean' ? value.leftCollapsed : false,
      rightCollapsed: typeof value.rightCollapsed === 'boolean' ? value.rightCollapsed : false,
    };
  } catch {
    return { ...DEFAULT_STUDIO_WORKSPACE_PREFERENCES };
  }
}

export function writeStudioWorkspacePreferences(
  preferences: StudioWorkspacePreferences,
  storage?: Pick<Storage, 'setItem'>,
): void {
  try {
    const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    target?.setItem(STUDIO_WORKSPACE_STORAGE_KEY, JSON.stringify({
      leftWidth: validWidth(preferences.leftWidth, DEFAULT_LEFT_PANEL_WIDTH, MIN_LEFT_PANEL_WIDTH, MAX_LEFT_PANEL_WIDTH),
      rightWidth: validWidth(preferences.rightWidth, DEFAULT_RIGHT_PANEL_WIDTH, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH),
      leftCollapsed: preferences.leftCollapsed,
      rightCollapsed: preferences.rightCollapsed,
    }));
  } catch {
    // Workspace preference persistence is best-effort; it never blocks editing.
  }
}

/** Resolves visible pane widths without mutating the persisted user preference. */
export function resolveStudioWorkspaceLayout(
  preferences: StudioWorkspacePreferences,
  availableWidth: number,
): StudioWorkspaceLayout {
  const width = Math.max(0, Number.isFinite(availableWidth) ? availableWidth : 0);
  const leftVisible = !preferences.leftCollapsed;
  const rightVisible = !preferences.rightCollapsed;
  const handleSpace = (Number(leftVisible) + Number(rightVisible)) * STUDIO_RESIZE_HANDLE_WIDTH;

  // At typical desktop sizes retain the existing 20rem drawers and a useful canvas.
  // For narrower supported windows, scale the minimums down rather than overflowing.
  const { canvasMinimum, leftMinimum, rightMinimum } = getStudioWorkspaceConstraints(width);
  let leftWidth = leftVisible
    ? clamp(preferences.leftWidth, Math.min(leftMinimum, MAX_LEFT_PANEL_WIDTH), MAX_LEFT_PANEL_WIDTH)
    : 0;
  let rightWidth = rightVisible
    ? clamp(preferences.rightWidth, Math.min(rightMinimum, MAX_RIGHT_PANEL_WIDTH), MAX_RIGHT_PANEL_WIDTH)
    : 0;

  const paneBudget = Math.max(0, width - canvasMinimum - handleSpace);
  const currentTotal = leftWidth + rightWidth;
  if (currentTotal > paneBudget && currentTotal > 0) {
    const minimumLeft = leftVisible ? Math.min(leftMinimum, MAX_LEFT_PANEL_WIDTH) : 0;
    const minimumRight = rightVisible ? Math.min(rightMinimum, MAX_RIGHT_PANEL_WIDTH) : 0;
    const minimumTotal = minimumLeft + minimumRight;
    if (paneBudget >= minimumTotal) {
      // Preserve both pane minimums when possible; trim only the user's extra width.
      const extraTotal = Math.max(1, currentTotal - minimumTotal);
      const extraBudget = paneBudget - minimumTotal;
      leftWidth = minimumLeft + Math.floor((leftWidth - minimumLeft) * extraBudget / extraTotal);
      rightWidth = minimumRight + Math.floor((rightWidth - minimumRight) * extraBudget / extraTotal);
    } else {
      // Below the supported desktop minimum, preserve the canvas first and scale panes.
      const scale = minimumTotal === 0 ? 0 : paneBudget / minimumTotal;
      leftWidth = Math.floor(minimumLeft * scale);
      rightWidth = Math.floor(minimumRight * scale);
    }
  }

  return {
    ...preferences,
    leftWidth,
    rightWidth,
    canvasWidth: Math.max(0, width - leftWidth - rightWidth - handleSpace),
  };
}
