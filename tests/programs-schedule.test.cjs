const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { nextProgramSession, formatProgramSession, programTimezones } = require('../programs-schedule.js');

test('Foundation follows Chicago daylight saving for upcoming sessions', () => {
  for (const [now, expected] of [
    ['2026-01-06T12:00:00Z', '2026-01-07T02:00:00.000Z'],
    ['2026-03-04T12:00:00Z', '2026-03-11T01:00:00.000Z'],
    ['2026-10-28T12:00:00Z', '2026-11-04T02:00:00.000Z'],
    ['2026-10-14T00:30:00Z', '2026-10-14T01:00:00.000Z'],
    ['2026-10-14T02:00:00Z', '2026-10-21T01:00:00.000Z']
  ]) {
    assert.equal(nextProgramSession(new Date(now), 1).toISOString(), expected);
  }
});

test('Foundation converts both weekday and time for the selected city', () => {
  const start = nextProgramSession(new Date('2026-10-13T12:00:00Z'), 1);
  const toronto = formatProgramSession(start, 'America/Toronto');
  assert.match(toronto, /^Tuesdays/);
  assert.match(toronto, /9:00.*10:30.*PM.*EDT/);
  const mumbai = formatProgramSession(start, 'Asia/Kolkata');
  assert.match(mumbai, /^Wednesdays/);
  assert.match(mumbai, /6:30.*8:00.*AM/);
});

test('a session crossing local midnight shows both weekdays', () => {
  const text = formatProgramSession(new Date('2026-01-07T02:00:00Z'), 'America/Sao_Paulo');
  assert.match(text, /^Tuesdays.*11:00.*PM.*Wednesdays.*12:30.*AM/);
});

test('worldwide choices have one city per UTC offset, with the local choice first', () => {
  const choices = programTimezones(new Date('2026-10-14T01:00:00Z'), 'America/Toronto');
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
  const summer = programTimezones(new Date('2026-07-08T01:00:00Z'), 'America/Toronto');
  const winter = programTimezones(new Date('2026-01-07T02:00:00Z'), 'America/Toronto');
  assert.match(summer.find(zone => zone.city === 'New Delhi').label, /^UTC\+05:30/);
  assert.match(summer.find(zone => zone.city === 'Kathmandu').label, /^UTC\+05:45/);
  assert.match(summer.find(zone => zone.city === 'Eucla').label, /^UTC\+08:45/);
  assert.match(summer.find(zone => zone.city === 'Waitangi, Chatham Islands').label, /^UTC\+12:45/);
  assert.match(winter.find(zone => zone.city === 'Waitangi, Chatham Islands').label, /^UTC\+13:45/);
  assert.match(summer.find(zone => zone.city === 'Lagos').label, /^UTC\+01:00/);
  assert.match(winter.find(zone => zone.city === 'London').label, /^UTC\+00:00/);
});

test('detected cities outside the representative list replace their offset choice', () => {
  const choices = programTimezones(new Date('2026-10-14T01:00:00Z'), 'Pacific/Majuro');
  assert.equal(choices[0].value, 'Pacific/Majuro');
  assert.equal(choices.filter(zone => zone.minutes === 720).length, 1);
  assert.ok(choices.length < 40);
  assert.equal(new Set(choices.map(zone => zone.minutes)).size, choices.length);
  assert.ok(choices.some(zone => zone.city === 'New Delhi'));
  assert.ok(choices.some(zone => zone.minutes === -720));
  assert.ok(choices.some(zone => zone.minutes === 840));
});

test('Levels 2 and 3 keep their Chicago schedules across daylight saving and weekly rollover', () => {
  for (const [now, level2, level3] of [
    ['2026-01-06T12:00:00Z', '2026-01-08T15:00:00.000Z', '2026-01-09T15:30:00.000Z'],
    ['2026-03-04T16:00:00Z', '2026-03-05T15:00:00.000Z', '2026-03-06T15:30:00.000Z'],
    ['2026-03-06T16:00:00Z', '2026-03-12T14:00:00.000Z', '2026-03-13T14:30:00.000Z'],
    ['2026-10-30T16:00:00Z', '2026-11-05T15:00:00.000Z', '2026-11-06T15:30:00.000Z'],
    ['2026-10-15T14:00:01Z', '2026-10-22T14:00:00.000Z', '2026-10-16T14:30:00.000Z']
  ]) {
    assert.equal(nextProgramSession(new Date(now), 2).toISOString(), level2);
    assert.equal(nextProgramSession(new Date(now), 3).toISOString(), level3);
  }
  const now = new Date('2026-10-13T12:00:00Z');
  assert.match(formatProgramSession(nextProgramSession(now, 2), 'Asia/Kolkata'), /^Thursdays.*7:30.*9:00.*PM/);
  assert.match(formatProgramSession(nextProgramSession(now, 3), 'Asia/Kolkata'), /^Fridays.*8:00.*9:30.*PM/);
  assert.match(formatProgramSession(nextProgramSession(now, 3), 'Pacific/Kiritimati'), /^Saturdays.*4:30.*6:00.*AM/);
});

test('all three selectors initialize independently and preserve the Foundation CMS meeting node', () => {
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.listeners = {}; this.textContent = ''; this.hidden = true; }
    replaceChildren() { this.children = []; }
    appendChild(child) { this.children.push(child); }
    append(...children) { this.children.push(...children); }
    get selectedOptions() { return this.children.filter(child => child.value === this.value); }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    focus() { this.focused = true; }
  }
  const roots = [1, 2, 3].map(level => {
    const time = new Element(), select = new Element(), button = new Element();
    const label = new Element(), controls = new Element(), picker = new Element();
    const detail = level === 1 ? new Element() : null;
    controls.querySelector = selector => selector === 'button' ? button : label;
    return { dataset: { programLevel: String(level) }, time, select, button, label, controls, picker, detail,
      querySelector: selector => ({ '.program-schedule-time': time, select, '.program-timezone': controls, '.program-timezone-picker': picker })[selector],
      closest: () => ({ querySelector: () => detail }) };
  });
  const document = {
    querySelectorAll: () => roots,
    createElement: () => new Element(),
    createTextNode: textContent => ({ textContent })
  };
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-13T12:00:00Z'])); } }
  function TorontoDateTimeFormat(locale, options) {
    return new Intl.DateTimeFormat(locale, { timeZone: 'America/Toronto', ...options });
  }
  vm.runInNewContext(readFileSync(require.resolve('../programs-schedule.js'), 'utf8'), {
    document, Intl: { DateTimeFormat: TorontoDateTimeFormat }, Date: FixedDate
  });
  for (const root of roots) {
    assert.equal(root.controls.hidden, false);
    assert.ok(root.select.children.length < 40);
    assert.equal(new Set(root.select.children.map(option => option.textContent.slice(0, 9))).size, root.select.children.length);
  }
  assert.match(roots[0].time.textContent, /^Tuesdays/);
  assert.match(roots[1].time.textContent, /^Thursdays/);
  assert.match(roots[2].time.textContent, /^Fridays/);
  const before = roots.map(root => root.time.textContent);
  const foundationDetail = roots[0].detail;
  roots[1].button.listeners.click();
  assert.equal(roots[1].picker.hidden, false);
  assert.equal(roots[1].button['aria-expanded'], 'true');
  roots[1].select.value = roots[1].select.children.find(option => option.dataset.city === 'New Delhi').value;
  roots[1].select.listeners.change();
  assert.match(roots[1].time.textContent, /^Thursdays.*7:30.*9:00.*PM/);
  assert.equal(roots[1].picker.hidden, true);
  assert.equal(roots[1].button['aria-expanded'], 'false');
  assert.equal(roots[0].time.textContent, before[0]);
  assert.equal(roots[2].time.textContent, before[2]);
  assert.equal(roots[0].detail, foundationDetail);
  assert.equal(foundationDetail.children[1].textContent, before[0]);
});
