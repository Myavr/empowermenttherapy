const assert = require('node:assert/strict');
const { test } = require('node:test');
const { registrationDays, appendAvailability, sendRegistration } = require('../registration.js');

function captureEmail(instants) {
  const email = new FormData();
  appendAvailability(email, new Set(instants));
  return [
    email.get('Availability (Central Time, Chicago)'),
    email.get('Availability (India Standard Time, IST)'),
    email.get('Availability (Colombia Time, COT)')
  ];
}

test('India selections preserve half-hours and date rollover in every email row', () => {
  const days = registrationDays(Date.parse('2026-12-31T22:00:00Z'), 'Asia/Kolkata');
  const { hours } = days.find(day => day.date === '1/1');
  assert.ok(days.every(day => day.date !== '12/31'));
  assert.deepEqual(captureEmail([...hours[9], ...hours[10]]), [
    '12/31: 9:30 PM \u2013 10:30 PM', '1/1: 9:00 AM \u2013 10:00 AM', '12/31: 10:30 PM \u2013 11:30 PM'
  ]);
});

test('summer Chicago uses daylight time independently of the device timezone', () => {
  const days = registrationDays(Date.parse('2026-07-07T12:00:00Z'), 'America/Chicago');
  const { hours } = days.find(day => day.date === '7/7');
  assert.equal(new Date(hours[20][0]).toISOString(), '2026-07-08T01:00:00.000Z');
  assert.deepEqual(captureEmail([...hours[20], ...hours[22]]), [
    '7/7: 8:00 PM, 10:00 PM', '7/8: 6:30 AM, 8:30 AM', '7/7: 8:00 PM, 10:00 PM'
  ]);
});

test('spring clock gap has no slot and repeated fall slots have separate identities and labels', () => {
  const spring = registrationDays(Date.parse('2027-03-13T14:00:00Z'), 'America/Chicago');
  assert.deepEqual(spring.find(day => day.date === '3/14').hours[2], []);
  const fall = registrationDays(Date.parse('2026-10-31T14:00:00Z'), 'America/Chicago');
  const repeated = fall.find(day => day.date === '11/1').hours[1];
  assert.deepEqual(repeated.map(ms => new Date(ms).toISOString()),
    ['2026-11-01T06:00:00.000Z', '2026-11-01T07:00:00.000Z']);
  assert.deepEqual(captureEmail(repeated), [
    '11/1: 1:00 AM CDT, 1:00 AM CST', '11/1: 11:30 AM \u2013 12:30 PM', '11/1: 1:00 AM \u2013 2:00 AM'
  ]);
});

test('all three email rows allow the applicant to leave availability open', () => {
  const fallback = 'No specific times selected \u2014 please reach out to coordinate.';
  assert.deepEqual(captureEmail([]), [fallback, fallback, fallback]);
});

test('confirmation requires HTTP success and an explicit positive service result', async () => {
  const response = (ok, success) => async () => ({ ok, json: async () => ({ success }) });
  for (const accepted of [true, 'true']) await sendRegistration(new FormData(), response(true, accepted));
  for (const denied of [false, 'false', null, undefined]) {
    await assert.rejects(sendRegistration(new FormData(), response(true, denied)));
  }
  await assert.rejects(sendRegistration(new FormData(), response(false, true)));
});
