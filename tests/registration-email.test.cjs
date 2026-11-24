const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'shared.js'), 'utf8');
const start = source.indexOf('  function formatAvailability(');
const submission = source.slice(start, source.indexOf('})();', start));

function captureEmail(date, timezone, desktopSlots, mobileSlots = []) {
  let submit;
  let email;
  const fields = { regName: 'Test', regEmail: 'test@example.com', regTimezone: timezone,
    regProgram: '', regMessage: '' };
  const cells = slots => slots.map(key => ({ getAttribute: () => key }));
  vm.runInNewContext(submission, {
    form: {
      addEventListener: (_, listener) => { submit = listener; },
      querySelector: () => ({})
    },
    document: {
      getElementById: id => ({ value: fields[id] }),
      querySelectorAll: () => cells(mobileSlots)
    },
    grid: { querySelectorAll: () => cells(desktopSlots) },
    orderedDays: [date], detectedTimezoneValue: 'detected', Date, Intl, FormData,
    fetch: async (_, { body }) => {
      email = body;
      return { json: async () => ({ success: true }) };
    }
  });
  submit({ preventDefault() {} });
  return [
    email.get('Availability (Central Time, Chicago)'),
    email.get('Availability (India Standard Time, IST)'),
    email.get('Availability (Colombia Time, COT)')
  ];
}

test('India selections preserve half-hours, dates and ranges in the registration email', () => {
  assert.deepEqual(captureEmail(new Date(2027, 0, 1), 'UTC+5:30 (IST)', ['0:9', '0:10'], ['0:9']), [
    '12/31: 9:30 PM – 10:30 PM', '1/1: 9:00 AM – 10:00 AM', '12/31: 10:30 PM – 11:30 PM'
  ]);
});

test('Chicago summer evening mobile selections appear the following morning in India', () => {
  assert.deepEqual(captureEmail(new Date(2026, 6, 7), 'UTC-7 (MST)', [], ['0:18', '0:20']), [
    '7/7: 8:00 PM, 10:00 PM', '7/8: 6:30 AM, 8:30 AM', '7/7: 8:00 PM, 10:00 PM'
  ]);
});

test('all three email rows allow the applicant to leave availability open', () => {
  const fallback = 'No specific times selected — please reach out to coordinate.';
  assert.deepEqual(captureEmail(new Date(), 'detected', []), [fallback, fallback, fallback]);
});
