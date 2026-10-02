import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_LEFT_PANEL_WIDTH,
  DEFAULT_RIGHT_PANEL_WIDTH,
  DEFAULT_STUDIO_WORKSPACE_PREFERENCES,
  MAX_LEFT_PANEL_WIDTH,
  MAX_RIGHT_PANEL_WIDTH,
  MIN_LEFT_PANEL_WIDTH,
  MIN_RIGHT_PANEL_WIDTH,
  MIN_CANVAS_WIDTH,
  STUDIO_WORKSPACE_STORAGE_KEY,
  readStudioWorkspacePreferences,
  resolveStudioWorkspaceLayout,
  writeStudioWorkspacePreferences,
} from '../../src/components/template-builder/studioWorkspace';

const memoryStorage = (initial?: string) => {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => { value = next; },
    value: () => value,
  };
};

assert.equal(DEFAULT_LEFT_PANEL_WIDTH >= MIN_LEFT_PANEL_WIDTH && DEFAULT_LEFT_PANEL_WIDTH <= MAX_LEFT_PANEL_WIDTH, true, 'default left width is valid');
assert.equal(DEFAULT_RIGHT_PANEL_WIDTH >= MIN_RIGHT_PANEL_WIDTH && DEFAULT_RIGHT_PANEL_WIDTH <= MAX_RIGHT_PANEL_WIDTH, true, 'default right width is valid');

const preferences = { ...DEFAULT_STUDIO_WORKSPACE_PREFERENCES };
assert.equal(resolveStudioWorkspaceLayout({ ...preferences, leftWidth: 1 }, 1440).leftWidth, MIN_LEFT_PANEL_WIDTH, 'left clamps to minimum');
assert.equal(resolveStudioWorkspaceLayout({ ...preferences, leftWidth: 9999 }, 1440).leftWidth, MAX_LEFT_PANEL_WIDTH, 'left clamps to maximum');
assert.equal(resolveStudioWorkspaceLayout({ ...preferences, rightWidth: 1 }, 1440).rightWidth, MIN_RIGHT_PANEL_WIDTH, 'right clamps to minimum');
assert.equal(resolveStudioWorkspaceLayout({ ...preferences, rightWidth: 9999 }, 1440).rightWidth, MAX_RIGHT_PANEL_WIDTH, 'right clamps to maximum');

const normalLayout = resolveStudioWorkspaceLayout(preferences, 1440);
assert.ok(normalLayout.canvasWidth >= MIN_CANVAS_WIDTH, 'minimum canvas width is preserved on desktop');
const laptopLayout = resolveStudioWorkspaceLayout(preferences, 1024);
assert.ok(laptopLayout.canvasWidth >= MIN_CANVAS_WIDTH, 'canvas minimum is preserved at narrower desktop widths');
assert.ok(laptopLayout.leftWidth >= MIN_LEFT_PANEL_WIDTH && laptopLayout.rightWidth >= MIN_RIGHT_PANEL_WIDTH, 'panel minimums are retained when they fit alongside the canvas');
const compactLayout = resolveStudioWorkspaceLayout(preferences, 760);
assert.ok(compactLayout.canvasWidth >= 240, 'compact viewport retains a minimum usable canvas');
const leftCollapsed = resolveStudioWorkspaceLayout({ ...preferences, leftCollapsed: true }, 1440);
const rightCollapsed = resolveStudioWorkspaceLayout({ ...preferences, rightCollapsed: true }, 1440);
const bothCollapsed = resolveStudioWorkspaceLayout({ ...preferences, leftCollapsed: true, rightCollapsed: true }, 1440);
assert.equal(leftCollapsed.leftWidth, 0, 'collapsed left contributes no workspace width');
assert.equal(rightCollapsed.rightWidth, 0, 'collapsed right contributes no workspace width');
assert.equal(bothCollapsed.canvasWidth, 1440, 'both collapsed gives all workspace width to the canvas');
assert.ok(leftCollapsed.canvasWidth > normalLayout.canvasWidth, 'left collapse expands canvas');
assert.ok(rightCollapsed.canvasWidth > normalLayout.canvasWidth, 'right collapse expands canvas');

const invalidPrefs = readStudioWorkspacePreferences(memoryStorage('{"leftWidth":-5,"rightWidth":"wide","leftCollapsed":true}'));
assert.equal(invalidPrefs.leftWidth, DEFAULT_LEFT_PANEL_WIDTH, 'invalid stored left width falls back');
assert.equal(invalidPrefs.rightWidth, DEFAULT_RIGHT_PANEL_WIDTH, 'invalid stored right width falls back');
assert.equal(invalidPrefs.leftCollapsed, true, 'valid collapsed preference is restored');
assert.deepEqual(readStudioWorkspacePreferences(memoryStorage('{broken')), DEFAULT_STUDIO_WORKSPACE_PREFERENCES, 'malformed JSON falls back');
const saved = memoryStorage();
writeStudioWorkspacePreferences({ ...preferences, leftWidth: 9000 }, saved);
assert.equal(JSON.parse(saved.value()!).leftWidth, MAX_LEFT_PANEL_WIDTH, 'persisted writes remain clamped');
assert.equal(STUDIO_WORKSPACE_STORAGE_KEY.includes('studio.workspace'), true, 'preferences use a workspace-only key');

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const templateBuilder = read('../../src/components/template-builder/TemplateBuilder.tsx');
const builderCanvas = read('../../src/components/template-builder/BuilderCanvas.tsx');
const studioPanels = read('../../src/components/template-builder/StudioPanels.tsx');
const propertiesPanel = read('../../src/components/template-builder/PropertiesPanel.tsx');
const serializer = read('../../src/features/templates/mappers/templateSerializer.ts');
const dragLogic = templateBuilder.slice(templateBuilder.indexOf('const handleDragEnd'), templateBuilder.indexOf('// Real-time Builder Validation Issues'));

assert.match(templateBuilder, /DndContext[\s\S]*closestCorners[\s\S]*MeasuringStrategy\.Always/, 'canonical DnD context and live measuring remain');
assert.match(templateBuilder, /builder-canvas-droppable|BuilderCanvas/, 'canvas drop surface remains present');
assert.match(templateBuilder, /calculateInsertionIndex[\s\S]*insertItem[\s\S]*moveItem/, 'canonical insertion and ordering helpers remain wired');
assert.doesNotMatch(dragLogic, /leftWidth|rightWidth|320px|400px/, 'drag/drop logic does not depend on sidebar width constants');
assert.match(templateBuilder, /activeStudioTab,\s*setActiveStudioTab/, 'resource tab is workspace state');
assert.match(templateBuilder, /aria-hidden=\{workspacePreferences\.leftCollapsed\}[\s\S]*StudioRail[\s\S]*StudioPanels/, 'left pane stays mounted while hidden');
assert.match(templateBuilder, /aria-hidden=\{workspacePreferences\.rightCollapsed\}[\s\S]*<PropertiesPanel/, 'properties stay mounted while hidden');
assert.doesNotMatch(templateBuilder, /pushState\(\{[^}]*workspacePreferences/s, 'workspace preferences are not sent into template history');
assert.doesNotMatch(templateBuilder, /setSelectedComponentId\(null\)[\s\S]{0,100}rightCollapsed/, 'right collapse does not clear selection');
assert.doesNotMatch(serializer, /workspacePreferences|leftCollapsed|rightCollapsed|leftWidth|rightWidth/, 'workspace fields are not serialized');
assert.match(builderCanvas, /w-full max-w-none min-w-0/, 'canvas document is not constrained by a fixed max width');
assert.match(studioPanels, /useDraggable/, 'resource drag source remains mounted');
assert.match(propertiesPanel, /onDeselect=|onUpdateComponent/, 'properties actions remain available');

console.log('Phase 4A Studio workspace checks passed');
