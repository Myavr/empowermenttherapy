const test = require('node:test');
const assert = require('node:assert/strict');
const { nextFoundationSession, formatFoundationSession, foundationTimezones } = require('../programs-schedule.js');

test('Foundation follows Chicago daylight saving for upcoming sessions', () => {
  for (const [now, expected] of [
    ['2026-01-06T12:00:00Z', '2026-01-07T02:00:00.000Z'],
    ['2026-03-04T12:00:00Z', '2026-03-11T01:00:00.000Z'],
    ['2026-10-28T12:00:00Z', '2026-11-04T02:00:00.000Z'],
    ['2026-10-14T00:30:00Z', '2026-10-14T01:00:00.000Z'],
    ['2026-10-14T02:00:00Z', '2026-10-21T01:00:00.000Z']
  ]) {
    assert.equal(nextFoundationSession(new Date(now)).toISOString(), expected);
  }
});

test('Foundation converts both weekday and time for the selected city', () => {
  const start = nextFoundationSession(new Date('2026-10-13T12:00:00Z'));
  const toronto = formatFoundationSession(start, 'America/Toronto');
  assert.match(toronto, /^Tuesdays/);
  assert.match(toronto, /9:00.*10:30.*PM.*EDT/);
  const mumbai = formatFoundationSession(start, 'Asia/Kolkata');
  assert.match(mumbai, /^Wednesdays/);
  assert.match(mumbai, /6:30.*8:00.*AM/);
});

test('a session crossing local midnight shows both weekdays', () => {
  const text = formatFoundationSession(new Date('2026-01-07T02:00:00Z'), 'America/Sao_Paulo');
  assert.match(text, /^Tuesdays.*11:00.*PM.*Wednesdays.*12:30.*AM/);
});

test('worldwide choices have one city per UTC offset, with the local choice first', () => {
  const choices = foundationTimezones(new Date('2026-10-14T01:00:00Z'), 'America/Toronto');
  assert.equal(choices[0].value, 'America/Toronto');
  assert.match(choices[0].label, /^UTC-04:00 \u2014 Toronto \(your timezone\)$/);
  assert.equal(new Set(choices.map(zone => zone.value)).size, choices.length);
  assert.equal(choices.filter(zone => zone.isLocal).length, 1);
  assert.equal(new Set(choices.map(zone => zone.minutes)).size, choices.length);
  assert.ok(choices.length < 40);
  assert.equal(choices.filter(zone => zone.minutes === -240).length, 1);
  assert.ok(choices.every(zone => !zone.city.includes(' / ')));
  for (const choice of choices) assert.match(choice.label, /^UTC[+-]\d{2}:\d{2} \u2014 .+/);
  const sorted = choices.slice(1).map(zone => zone.minutes);
  assert.deepEqual(sorted, [...sorted].sort((a, b) => a - b));
  assert.equal(sorted[0], -12 * 60);
  assert.equal(sorted.at(-1), 14 * 60);
});

test('fractional offsets and city daylight saving changes use the session date', () => {
  const summer = foundationTimezones(new Date('2026-07-08T01:00:00Z'), 'America/Toronto');
  const winter = foundationTimezones(new Date('2026-01-07T02:00:00Z'), 'America/Toronto');
  assert.match(summer.find(zone => zone.city === 'New Delhi').label, /^UTC\+05:30/);
  assert.match(summer.find(zone => zone.city === 'Kathmandu').label, /^UTC\+05:45/);
  assert.match(summer.find(zone => zone.city === 'Eucla').label, /^UTC\+08:45/);
  assert.match(summer.find(zone => zone.city === 'Waitangi, Chatham Islands').label, /^UTC\+12:45/);
  assert.match(winter.find(zone => zone.city === 'Waitangi, Chatham Islands').label, /^UTC\+13:45/);
  assert.match(summer.find(zone => zone.city === 'Lagos').label, /^UTC\+01:00/);
  assert.match(winter.find(zone => zone.city === 'London').label, /^UTC\+00:00/);
});

test('detected cities outside the representative list replace their offset choice', () => {
  const choices = foundationTimezones(new Date('2026-10-14T01:00:00Z'), 'Pacific/Majuro');
  assert.equal(choices[0].value, 'Pacific/Majuro');
  assert.equal(choices.filter(zone => zone.minutes === 720).length, 1);
  assert.ok(choices.length < 40);
  assert.equal(new Set(choices.map(zone => zone.minutes)).size, choices.length);
  assert.ok(choices.some(zone => zone.city === 'New Delhi'));
  assert.ok(choices.some(zone => zone.minutes === -720));
  assert.ok(choices.some(zone => zone.minutes === 840));
});
