import assert from 'node:assert/strict';
import fs from 'node:fs';
import { clampLayoutWidthPercent, clampComponentLayoutWidthPercent, getLayoutWidthPercent, getMinimumLayoutWidthPercent, withLayoutWidthPercent } from '../../src/shared/layout';
import { calculateInsertionIndex, insertItem, moveItem } from '../../src/shared/canvasOrdering';

const legacy = (width: string) => ({ layoutWidth: width, layout: { width } });
assert.equal(getLayoutWidthPercent(legacy('full')), 100);
assert.equal(getLayoutWidthPercent(legacy('half')), 50);
assert.equal(getLayoutWidthPercent(legacy('third')), 33);
assert.equal(clampLayoutWidthPercent(7), 20);
assert.equal(clampLayoutWidthPercent(140), 100);
assert.equal(getMinimumLayoutWidthPercent({ type: 'table' }), 60);
assert.equal(getMinimumLayoutWidthPercent({ type: 'signature' }), 40);
assert.equal(clampComponentLayoutWidthPercent({ type: 'table' }, 20), 60);
assert.equal(clampComponentLayoutWidthPercent({ type: 'text' }, 20), 25);

const component: any = { id: 'component-1', type: 'text', key: 'field', order: 0, ...legacy('half') };
const resized = withLayoutWidthPercent(component, 67);
assert.equal(getLayoutWidthPercent(resized), 67);
assert.equal(resized.layoutWidth, 'half', 'legacy layout marker remains compatible');

assert.equal(calculateInsertionIndex(0, 3, true), 0, 'first insertion');
assert.equal(calculateInsertionIndex(1, 3, false), 2, 'middle insertion');
assert.equal(calculateInsertionIndex(2, 3, false), 3, 'final insertion');
assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
assert.deepEqual(insertItem(['a', 'c'], 'b', 1), ['a', 'b', 'c']);

const builder = fs.readFileSync('src/components/template-builder/BuilderComponent.tsx', 'utf8');
const renderer = fs.readFileSync('src/components/dynamic-template/DynamicTemplateRenderer.tsx', 'utf8');
const builderFile = fs.readFileSync('src/components/template-builder/TemplateBuilder.tsx', 'utf8');
const section = fs.readFileSync('src/components/template-builder/BuilderSection.tsx', 'utf8');
assert.match(builder, /Resize element width from left/);
assert.match(builder, /Resize element width from right/);
assert.match(builder, /onResize\(finalWidth\)/);
assert.match(renderer, /getLayoutWidthPercent/);
assert.match(renderer, /wf-layout-item/);
assert.match(builder, /canResize/);
assert.match(builderFile, /handleResizeComponent/);
assert.match(builderFile, /calculateInsertionIndex/);
assert.match(builderFile, /insertItem/);
assert.match(builder, /insertionSide/);
assert.match(builderFile, /closestCorners/);
assert.match(builderFile, /MeasuringStrategy\.Always/);
assert.match(section, /canResize=\{canResize\}/);

console.log('phase1a canvas layout checks passed');
