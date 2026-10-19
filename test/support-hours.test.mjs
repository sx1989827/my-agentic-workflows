import assert from 'node:assert/strict';
import test from 'node:test';
import { isSupportOpen } from '../src/support-hours.mjs';

const cases = [
  { name: 'closed just before opening', timestamp: '2026-10-19T07:59:59.999Z', expected: false },
  { name: 'open exactly at 08:00 UTC', timestamp: '2026-10-19T08:00:00.000Z', expected: true },
  { name: 'open just after opening', timestamp: '2026-10-19T08:00:00.001Z', expected: true },
  { name: 'open during a weekday', timestamp: '2026-10-21T12:00:00.000Z', expected: true },
  { name: 'open just before closing on Friday', timestamp: '2026-10-23T17:59:59.999Z', expected: true },
  { name: 'closed exactly at 18:00 UTC', timestamp: '2026-10-19T18:00:00.000Z', expected: false },
  { name: 'closed after hours', timestamp: '2026-10-19T20:00:00.000Z', expected: false },
  { name: 'closed on Saturday', timestamp: '2026-10-24T12:00:00.000Z', expected: false },
  { name: 'closed on Sunday', timestamp: '2026-10-25T12:00:00.000Z', expected: false },
  { name: 'closed on a public holiday', timestamp: '2026-10-19T12:00:00.000Z', holiday: true, expected: false },
  { name: 'uses UTC rather than the supplied offset', timestamp: '2026-10-19T09:00:00.000+02:00', expected: false },
  { name: 'uses the UTC weekday across a date boundary', timestamp: '2026-10-24T01:00:00.000+10:00', expected: true },
];

for (const { name, timestamp, holiday, expected } of cases) {
  test(name, () => {
    assert.equal(isSupportOpen(new Date(timestamp), holiday), expected);
  });
}