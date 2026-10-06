const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { renderContributions, checkoutURL } = require('../contributions-render.js');

const root = join(__dirname, '..');
const read = path => readFileSync(join(root, path), 'utf8');
const data = () => JSON.parse(read('data/contributions.json'));

test('monthly options use the supplied plans and never substitute a plan for a missing tier', () => {
  const config = data();
  const html = renderContributions(config);
  assert.equal((html.match(/<article /g) || []).length, 3);
  const thirty = config.tiers.find(tier => tier.amount === 30);
  const fifty = config.tiers.find(tier => tier.amount === 50);
  assert.equal(thirty.paypal_plan_id, 'P-8CS01676DE0612907NHPQXBQ');
  assert.equal(fifty.paypal_plan_id, 'P-5LD29664S0650621GNK4OZVQ');
  for (const tier of config.tiers) {
    const card = html.match(new RegExp('<article[^>]*>[\\s\\S]*?<h3[^>]*>' + tier.name + '<\\/h3>[\\s\\S]*?<\\/article>'));
    assert.ok(card, tier.name);
    const ownCard = card[0].slice(card[0].lastIndexOf('<article'));
    if (tier.paypal_plan_id) {
      assert.ok(ownCard.includes('href="' + checkoutURL(tier.paypal_plan_id) + '"'));
      assert.ok(ownCard.includes(tier.amount + ' USD per month'));
    } else {
      assert.match(ownCard, /href="contact.html"/);
      assert.doesNotMatch(ownCard, /paypal.com/);
    }
  }
  assert.match(html, /recurring monthly subscriptions/);
  assert.doesNotMatch(html, /Annual subscription|friend credit|Pay one month|onclick=|target=/);
});

test('CMS edits, adding a plan and reordering tiers are reflected without editing HTML', () => {
  const edited = data();
  edited.tiers = [edited.tiers[1], edited.tiers[0]];
  edited.tiers[0].paypal_plan_id = 'P-TEST40';
  edited.tiers[0].description = 'Updated purpose';
  edited.title = 'Our contributions';
  edited.help.text = 'Please get in touch';
  const html = renderContributions(edited);
  for (const text of ['Our contributions', 'Updated purpose', 'Please get in touch']) assert.ok(html.includes(text));
  assert.ok(html.indexOf('Support</h3>') < html.indexOf('Sustain</h3>'));
  assert.match(html, /plan_id=P-TEST40/);
  assert.doesNotMatch(html, /Empower<\/h3>/);
});

test('accidentally assigning the same plan to two prices fails validation', () => {
  const edited = data();
  edited.tiers[1].paypal_plan_id = edited.tiers[2].paypal_plan_id;
  assert.throws(() => renderContributions(edited), /own PayPal plan/);
});

test('CMS content cannot inject markup or executable checkout destinations', () => {
  const edited = data();
  edited.title = '<script>alert(1)</script>';
  edited.tiers[0].name = '<img src=x onerror=alert(1)>';
  edited.tiers[0].color = '" onclick="alert(1)';
  let html = renderContributions(edited);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x|onclick=/);
  for (const plan of ['javascript:alert(1)', 'P-123" onclick="evil()', '<script>']) {
    assert.throws(() => checkoutURL(plan), /Invalid PayPal/);
  }
  for (const amount of [0, -1, 'NaN', Infinity]) {
    edited.tiers[0].amount = amount;
    assert.throws(() => renderContributions(edited), /amounts must be positive/);
  }
});

async function preview({ published = false, fail = false } = {}) {
  const requests = [];
  const container = { innerHTML: '', querySelector: () => published ? {} : null };
  const status = { textContent: '' };
  const document = { title: '', getElementById: id => id === 'contributions-content' ? container : status };
  const context = vm.createContext({
    window: {}, document, console: { error() {} },
    fetch: async (path, options) => {
      requests.push({ path, options });
      return { ok: !fail, json: async () => data() };
    }
  });
  vm.runInContext(read('contributions-render.js'), context);
  vm.runInContext(read('contributions.js'), context);
  await new Promise(resolve => setImmediate(resolve));
  return { container, document, requests, status };
}

test('VS Code source preview loads exactly the same page as the publishing renderer', async () => {
  const page = await preview();
  assert.equal(page.container.innerHTML, renderContributions(data()));
  assert.equal(page.requests[0].path, 'data/contributions.json');
  assert.equal(page.requests[0].options.cache, 'no-cache');
  assert.match(page.document.title, /^Contributions/);
});

test('published page does not overwrite static checkout links or refetch its content', async () => {
  const page = await preview({ published: true });
  assert.equal(page.requests.length, 0);
});

test('failed preview retains the contact fallback and offers refresh instructions', async () => {
  const page = await preview({ fail: true });
  assert.match(page.status.textContent, /refresh/);
  assert.match(read('contributions.html'), /href="contact.html">Contact our team/);
});

test('program pricing and CMS configuration point to the shared contribution page', () => {
  const programs = JSON.parse(read('data/programs.json'));
  for (const level of programs.levels.slice(0, 2)) {
    assert.match(JSON.stringify(level.blocks.find(block => block.heading === 'Investment')), /contributions.html/);
  }
  assert.equal((read('programs.html').match(/href="contributions.html"/g) || []).length, 2);
  assert.match(read('.pages.yml'), /name: contributions[\s\S]*?path: data\/contributions.json/);
});
