const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'shared.js'), 'utf8');
const eventScript = source.slice(source.indexOf('/* ===== News & Events ====='),
  source.indexOf('/* ===== Editable-content helper:'));

class Element {
  constructor() { this.children = []; this.hidden = true; this.html = ''; }
  set textContent(value) {
    this.html = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html; }
  appendChild(child) { child.parent = this; this.children.push(child); }
  querySelectorAll() { return [...this.children]; }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
}

async function loadEvents(items, { home = false } = {}) {
  let now = new Date(2026, 8, 9, 12);
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
  }
  const upcoming = new Element();
  const past = new Element();
  const ids = Object.fromEntries((home
    ? ['newsEvents', 'eventsCol', 'eventsList', 'newsCol', 'newsList']
    : ['eventEmptyState', 'pastEventEmptyState']).map(id => [id, new Element()]));
  const timers = [];
  const listeners = {};
  const document = {
    hidden: false,
    getElementById: id => ids[id] || null,
    querySelector: selector => home ? null : selector.startsWith('#pastEvents') ? past : upcoming,
    createElement: () => new Element(),
    addEventListener: (name, handler) => { listeners[name] = handler; }
  };
  vm.runInNewContext(eventScript, {
    document, Date: ClockDate,
    fetch: async path => ({ ok: true, json: async () => ({ items: path.includes('events') ? items : [] }) }),
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { upcoming, past, ids, timers, listeners, setDate: date => { now = date; } };
}

function titles(element) {
  return element.children.map(child => child.innerHTML.match(/<h[34][^>]*>(.*?)<\/h[34]>/)[1]);
}

const fixtures = [
  { title: 'Older event', date: '2026-08-01', link: 'contact.html' },
  { title: 'Tomorrow', date: '2026-09-10' },
  { title: 'Yesterday', date: '2026-09-08', image: 'images/gift.webp', presenter: 'Myra', link: 'contact.html' },
  { title: 'Today', date: '2026-09-09', link: 'contact.html' },
  { title: 'Weekly group', schedule_type: 'Recurring', date: '2026-01-01', recurrence: 'Every Tuesday' }
];

test('past events are newest first; today and recurring events stay upcoming', async () => {
  const page = await loadEvents(fixtures);
  assert.deepEqual(titles(page.upcoming), ['Today', 'Tomorrow', 'Weekly group']);
  assert.deepEqual(titles(page.past), ['Yesterday', 'Older event']);
  assert.equal(page.ids.eventEmptyState.hidden, true);
  assert.equal(page.ids.pastEventEmptyState.hidden, true);
  assert.match(page.past.children[0].innerHTML, /images\/gift.webp/);
  assert.match(page.past.children[0].innerHTML, /Myra/);
  assert.doesNotMatch(page.past.children[0].innerHTML, /href="contact.html"/);
  assert.match(page.upcoming.children[0].innerHTML, /href="contact.html"/);
});

test('open pages move an event at midnight without duplicate cards', async () => {
  const page = await loadEvents([{ title: 'Today', date: '2026-09-09' }]);
  assert.equal(page.timers[0].delay, 12 * 60 * 60 * 1000);
  page.setDate(new Date(2026, 8, 10));
  page.timers[0].callback();
  assert.deepEqual(titles(page.upcoming), []);
  assert.deepEqual(titles(page.past), ['Today']);
  assert.equal(page.ids.eventEmptyState.hidden, false);
  page.listeners.visibilitychange();
  assert.deepEqual(titles(page.past), ['Today']);
});

test('home page shows only upcoming events and hides an expired-only list', async () => {
  const home = await loadEvents(fixtures, { home: true });
  assert.deepEqual(titles(home.ids.eventsList), ['Today', 'Tomorrow', 'Weekly group']);
  const expired = await loadEvents([{ title: 'Today', date: '2026-09-09' }], { home: true });
  expired.setDate(new Date(2026, 8, 10));
  expired.listeners.visibilitychange();
  assert.equal(expired.ids.eventsCol.hidden, true);
  assert.equal(expired.ids.newsEvents.hidden, true);
});

test('empty lists show empty messages; undated and legacy recurring events remain upcoming', async () => {
  const empty = await loadEvents([]);
  assert.equal(empty.ids.eventEmptyState.hidden, false);
  assert.equal(empty.ids.pastEventEmptyState.hidden, false);
  const page = await loadEvents([
    { title: 'Date to be announced' },
    { title: 'Invalid date', date: 'not-a-date' },
    { title: 'Legacy group', recurrence: 'Every Monday' },
    null, {}
  ]);
  assert.deepEqual(titles(page.upcoming), ['Date to be announced', 'Invalid date', 'Legacy group']);
  assert.deepEqual(titles(page.past), []);
});
