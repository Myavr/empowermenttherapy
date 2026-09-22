const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '..', 'paypal-subscribe.js'), 'utf8');

function load({ missingSDK = false, renderFailure = false, throwOnSetup = false } = {}) {
  const status = { hidden: true, textContent: '' };
  let callbacks;
  const context = {
    document: { getElementById: id => id === 'paypal-subscribe-status' ? status : {} },
    console: { error() {} },
    window: missingSDK ? {} : { paypal: { Buttons(options) {
      if (throwOnSetup) throw new Error('setup failed');
      callbacks = options;
      return { render: () => renderFailure ? Promise.reject(new Error('blocked')) : Promise.resolve() };
    } } }
  };
  vm.runInNewContext(source, context);
  return { status, callbacks };
}

test('blocked SDK gives visitors a direct checkout instruction', () => {
  const { status } = load({ missingSDK: true });
  assert.equal(status.hidden, false);
  assert.match(status.textContent, /link below/);
});

test('render and setup failures display recovery instructions', async () => {
  for (const options of [{ renderFailure: true }, { throwOnSetup: true }]) {
    const { status } = load(options);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(status.hidden, false);
    assert.match(status.textContent, /direct link below/);
  }
});

test('checkout failure, cancellation and retry update the visible status', () => {
  const { callbacks, status } = load();
  callbacks.onError(new Error('popup failed'));
  assert.match(status.textContent, /check your PayPal account/);
  callbacks.onCancel();
  assert.match(status.textContent, /closed/);
  callbacks.onClick();
  assert.equal(status.hidden, true);
  assert.equal(status.textContent, '');
});

test('subscription uses the existing plan and approval shows its reference', async () => {
  const { callbacks, status } = load();
  const id = await callbacks.createSubscription({}, { subscription: { create: async data => {
    assert.equal(data.plan_id, 'P-8CS01676DE0612907NHPQXBQ');
    return 'I-TEST';
  } } });
  assert.equal(id, 'I-TEST');
  callbacks.onApprove({ subscriptionID: id });
  assert.match(status.textContent, /Thank you.*I-TEST/);
  assert.equal(status.hidden, false);
});

test('all subscription pages provide a static same-tab link even without JavaScript', () => {
  for (const page of ['index', 'contact', 'events', 'programs', 'resources', 'team', 'testimonials', 'values']) {
    const html = readFileSync(join(__dirname, '..', page + '.html'), 'utf8');
    const link = html.match(/<a class="footer-subscribe-direct"[^>]*>/)[0];
    assert.match(link, /https:\/\/www.paypal.com\/webapps\/billing\/plans\/subscribe\?plan_id=P-8CS01676DE0612907NHPQXBQ/);
    assert.doesNotMatch(link, /target=|onclick=/);
    assert.equal((html.match(/src="paypal-subscribe.js\?v=1"/g) || []).length, 1);
    assert.ok(html.indexOf('paypal.com/sdk/js') < html.indexOf('src="paypal-subscribe.js'));
  }
});
