import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const panels = read('src/components/template-builder/StudioPanels.tsx');
const builder = read('src/components/template-builder/TemplateBuilder.tsx');
const canvas = read('src/components/template-builder/BuilderCanvas.tsx');
const section = read('src/components/template-builder/BuilderSection.tsx');

assert.match(panels, /Document Outline/);
assert.match(panels, /expandedSections/);
assert.match(panels, /aria-expanded/);
assert.match(panels, /Search sections and fields/);
assert.match(panels, /onSelectComponent\?\./);
assert.match(panels, /onDuplicateSection/);
assert.match(panels, /onDeleteSection/);
assert.match(builder, /handleDuplicateSection/);
assert.match(builder, /generateStableFieldKey/);
assert.match(builder, /selectedSectionId=\{selectedSectionId\}/);
assert.match(builder, /componentIssuesMap=\{componentIssuesMap\}/);
assert.match(builder, /templateState\.status === 'Approved' \|\| templateState\.status === 'Pending Approval'/);
assert.match(canvas, /onSelectSection/);
assert.match(canvas, /selectedSectionId/);
assert.match(section, /onSelectSection\(section\.id\)/);
assert.match(section, /onSelectSection\(section\.id\); onSelectComponent/);

// Outline actions remain navigation/editing affordances only; pack persistence is not exposed.
assert.doesNotMatch(panels, /Save as Pack/);

console.log('phase1dOutlineCheck: PASS');
