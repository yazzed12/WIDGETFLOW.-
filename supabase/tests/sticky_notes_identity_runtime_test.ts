import assert from 'node:assert/strict';
import { buildStickyNoteInsertPayload } from '../../src/features/sticky-notes/stickyNotesRepository';

const input = { title: ' QA note ', content: ' Keep this private ', colorKey: 'yellow' as const, isPinned: false };
const profileUuid = '11111111-1111-4111-8111-111111111111';
const payload = buildStickyNoteInsertPayload(input, profileUuid);

assert.equal(payload.user_id, profileUuid);
assert.match(payload.user_id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
assert.equal(Object.hasOwn(payload, 'profile_code'), false);
assert.throws(() => buildStickyNoteInsertPayload(input, 'MG-002-0926'), /profile UUID is required/);

console.log('sticky notes identity runtime test passed');
