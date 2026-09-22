import assert from 'node:assert/strict';
import { matchesDateRange, dayRange } from '../../src/features/search/dateRangeFilter';
import { matchesSearch } from '../../src/features/search/searchMatcher';

type Fixture = {
  userId: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
};

const day = dayRange(new Date(2026, 8, 16));
const notifications: Fixture[] = [
  {
    userId: 'manager',
    type: 'template_approved',
    title: 'Template approved',
    message: 'Safety Inspection Template was approved.',
    timestamp: '2026-09-16T10:00:00',
    read: false,
  },
  {
    userId: 'manager',
    type: 'template_review_requested',
    title: 'Template requires your review',
    message: 'Monthly Operations was submitted for your review.',
    timestamp: '2026-09-16T09:00:00',
    read: false,
  },
  {
    userId: 'manager',
    type: 'report_received',
    title: 'Report received',
    message: 'Monthly Operations is ready for review.',
    timestamp: '2026-09-16T11:00:00',
    read: true,
  },
  {
    userId: 'employee',
    type: 'future_safe_event',
    title: 'Workflow update',
    message: 'A workflow changed.',
    timestamp: '2026-09-16T12:00:00',
    read: false,
  },
];

const managerNotifications = notifications.filter((notification) => notification.userId === 'manager');
assert.equal(managerNotifications.length, 3);
assert.equal(managerNotifications.some((notification) => notification.type === 'template_review_requested'), true);
assert.equal(managerNotifications.some((notification) => notification.type === 'template_approved'), true);
assert.equal(managerNotifications.some((notification) => notification.type === 'report_received'), true);

const unreadOnDay = managerNotifications.filter((notification) =>
  !notification.read &&
  matchesDateRange(notification.timestamp, day) &&
  matchesSearch('approved', [notification.title, notification.message, notification.type]),
);
assert.equal(unreadOnDay.length, 1);
assert.equal(unreadOnDay[0].title, 'Template approved');

assert.equal(matchesDateRange('2026-09-16T11:00:00', day), true);
assert.equal(matchesSearch('Monthly Operations', ['Report received', 'Monthly Operations is ready for review.']), true);
assert.equal(matchesSearch('future_safe_event', ['future_safe_event', 'Workflow update', 'A workflow changed.']), true);
assert.equal(matchesSearch('00000000-0000-0000-0000-000000000001', ['Workflow update', 'A workflow changed.']), false);

console.log('notification search runtime test passed');
