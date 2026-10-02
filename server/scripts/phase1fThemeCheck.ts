import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_THEME_TOKENS, resolveComponentStyle, resolveDocumentSpacing, resolveEffectiveTheme, resolveFormStyle, resolveTableStyle } from '../../src/shared/themeResolver.js';

const themePanel = fs.readFileSync('src/components/template-builder/StudioThemePanel.tsx', 'utf8');
const dynamicRenderer = fs.readFileSync('src/components/dynamic-template/DynamicTemplateRenderer.tsx', 'utf8');
const canvas = fs.readFileSync('src/components/template-builder/BuilderCanvas.tsx', 'utf8');
const themeResolver = fs.readFileSync('src/shared/themeResolver.ts', 'utf8');

assert.match(themePanel, /Baseline Theme Presets/);
assert.match(themePanel, /Field Background/);
assert.match(themePanel, /Table Density/);
assert.match(themePanel, /Page Padding/);
assert.match(dynamicRenderer, /resolveDocumentSpacing/);
assert.match(dynamicRenderer, /resolveSectionStyle/);
assert.match(dynamicRenderer, /resolveEffectiveTheme/);
assert.match(canvas, /resolveDocumentSpacing/);
assert.match(themeResolver, /componentLocalOverride/);

const clean = resolveEffectiveTheme(DEFAULT_THEME_TOKENS.clean);
const corporate = resolveEffectiveTheme(DEFAULT_THEME_TOKENS.corporate);
assert.notEqual(clean.primaryColor, corporate.primaryColor);
assert.notEqual(resolveDocumentSpacing(DEFAULT_THEME_TOKENS.clean).pagePadding, resolveDocumentSpacing(DEFAULT_THEME_TOKENS.executive).pagePadding);

const heading = resolveComponentStyle({ id: 'h', type: 'heading', key: 'heading', label: 'Heading', appearance: { backgroundColor: '#123456' }, headingConfig: { headingLevel: 'h2', fontColor: 'theme' } } as any, DEFAULT_THEME_TOKENS.clean);
const headingOverride = resolveComponentStyle({ id: 'h', type: 'heading', key: 'heading', label: 'Heading', headingConfig: { headingLevel: 'h2', fontColor: '#ff0000' } } as any, DEFAULT_THEME_TOKENS.clean);
assert.equal(heading.color, clean.typography.h2?.fontColor);
assert.equal(headingOverride.color, '#ff0000');
assert.notEqual(resolveFormStyle({ id: 'field', type: 'text', key: 'field', label: 'Field' } as any, DEFAULT_THEME_TOKENS.clean).fieldBg, '');
assert.equal(resolveTableStyle({ id: 'table', type: 'table', key: 'table', label: 'Table' } as any, DEFAULT_THEME_TOKENS.corporate).headerBg, corporate.tableStyles.headerBg);

console.log('phase1fThemeCheck: PASS');
