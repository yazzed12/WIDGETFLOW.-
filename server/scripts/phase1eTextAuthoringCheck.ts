import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isSafeUrl, sanitizeParagraphHtml } from '../../src/shared/display-tools/paragraphSanitizer.js';

const panels = fs.readFileSync('src/components/template-builder/StudioPanels.tsx', 'utf8');
const builder = fs.readFileSync('src/components/template-builder/TemplateBuilder.tsx', 'utf8');
const properties = fs.readFileSync('src/components/template-builder/PropertiesPanel.tsx', 'utf8');
const editor = fs.readFileSync('src/components/template-builder/RichParagraphEditor.tsx', 'utf8');
const sanitizer = fs.readFileSync('src/shared/display-tools/paragraphSanitizer.ts', 'utf8');
const resolver = fs.readFileSync('src/shared/themeResolver.ts', 'utf8');
const renderer = fs.readFileSync('src/components/dynamic-template/TemplateComponentRenderer.tsx', 'utf8');

assert.match(panels, /Document Title/);
assert.match(panels, /Heading 1/);
assert.match(panels, /Body Text/);
assert.match(panels, /Caption/);
assert.match(builder, /headingConfig: item\.type === 'heading'/);
assert.match(builder, /paragraphConfig: item\.type === 'paragraph'/);
assert.match(properties, /RichParagraphEditor/);
assert.match(properties, /Reset Typography/);
assert.match(properties, /Line Spacing/);
assert.match(properties, /Letter Spacing/);
assert.match(editor, /<Underline/);
assert.match(sanitizer, /'U'/);
assert.match(sanitizer, /ALLOWED_PROTOCOLS/);
assert.match(resolver, /cfg\.alignment \|\| \(comp as any\)\.alignment/);
assert.match(resolver, /cfg\.letterSpacing/);
assert.match(renderer, /dangerouslySetInnerHTML=\{\{ __html: sanitizedHtml \}\}/);
assert.match(renderer, /letterSpacing: resolved\.letterSpacing/);
assert.equal(isSafeUrl('javascript:alert(1)'), false);
assert.equal(isSafeUrl('https://widgetflow.example/policy'), true);
assert.doesNotMatch(sanitizeParagraphHtml('<script>alert(1)</script><p><u>Safe</u></p>'), /script/i);
assert.match(sanitizeParagraphHtml('<script>alert(1)</script><p><u>Safe</u></p>'), /<u>Safe<\/u>/i);

console.log('phase1eTextAuthoringCheck: PASS');
