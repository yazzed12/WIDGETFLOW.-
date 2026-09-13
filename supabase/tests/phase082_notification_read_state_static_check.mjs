import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync('supabase/migrations/074_notification_read_state_rpc.sql', 'utf8');
const repo = fs.readFileSync('src/features/reports/reportRepository.ts', 'utf8');
const context = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

assert.match(sql, /mark_my_notification_read\(p_notification_id uuid\)/);
assert.match(sql, /mark_my_notifications_read\(\)/);
assert.match(sql, /recipient_user_id = auth\.uid\(\)/);
assert.match(sql, /revoke all on function public\.mark_my_notification_read/);
assert.match(sql, /grant execute on function public\.mark_my_notification_read\(uuid\) to authenticated/);
assert.doesNotMatch(sql, /grant update on table public\.notifications/i);
assert.match(repo, /rpc\('mark_my_notification_read'/);
assert.match(repo, /rpc\('mark_my_notifications_read'/);
assert.doesNotMatch(context, /Migration 042 grants SELECT only/);
console.log('phase082 notification read-state static checks passed');
