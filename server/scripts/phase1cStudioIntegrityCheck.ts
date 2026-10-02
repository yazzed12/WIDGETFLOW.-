import assert from 'node:assert/strict';
import fs from 'node:fs';

const rail = fs.readFileSync('src/components/template-builder/StudioRail.tsx', 'utf8');
const builder = fs.readFileSync('src/components/template-builder/TemplateBuilder.tsx', 'utf8');
const panels = fs.readFileSync('src/components/template-builder/StudioPanels.tsx', 'utf8');
const packs = fs.readFileSync('src/components/template-builder/PacksPanel.tsx', 'utf8');
const section = fs.readFileSync('src/components/template-builder/BuilderSection.tsx', 'utf8');

assert.match(rail, /HIDDEN_NORMAL_STUDIO_TABS/);
assert.match(rail, /!HIDDEN_NORMAL_STUDIO_TABS\.has\(item\.id\)/);
assert.doesNotMatch(builder, /hasPermission\('studio\.workflow\.use'\)/);
assert.match(builder, /HIDDEN_NORMAL_STUDIO_TABS\.has\(item\.id\)/);
assert.doesNotMatch(packs, /My Packs/);
assert.doesNotMatch(panels, /filterMode === 'firm'/);
assert.match(panels, /filterMode === 'favorites'/);
assert.match(panels, /onOpenPreview/);
assert.doesNotMatch(builder, /onSaveAsContentPack=\{.*setSavePackSection/);
assert.doesNotMatch(builder, /onAddToPack=\{.*setAddToPackTool/);
assert.match(section, /onSaveAsContentPack &&/);

console.log('phase1c Studio integrity checks passed');
