const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { renderFooter } = require('../scripts/build-site.cjs');

const root = join(__dirname, '..');
const read = path => readFileSync(join(root, path), 'utf8');

function preview({ published = false, failed = false } = {}) {
  const placeholder = { outerHTML: '', textContent: '' };
  const status = { hidden: true, textContent: '' };
  const emailValue = { textContent: '' };
  const mailCard = { setAttribute(key, value) { this[key] = value; }, querySelector: () => emailValue };
  const requests = [];
  const errors = [];
  let renders = 0;
  let resolveFetch;
  const gate = new Promise(resolve => { resolveFetch = resolve; });
  const data = JSON.parse(read('data/footer.json'));
  data.contact.email = 'preview@example.com';
  const context = vm.createContext({
    window: { paypal: { Buttons() {
      return { render() { renders++; return Promise.resolve(); } };
    } } },
    console: { error: (...args) => errors.push(args) },
    document: {
      getElementById(id) {
        if (id === 'site-footer') return published ? null : placeholder;
        if (!placeholder.outerHTML) return null;
        return id === 'paypal-subscribe-status' ? status : {};
      },
      querySelector: () => mailCard
    },
    fetch: async (path, options) => {
      requests.push({ path, options });
      await gate;
      return { ok: !failed, json: async () => data, text: async () => read(path) };
    }
  });
  vm.runInContext(read('footer-render.js'), context);
  vm.runInContext(read('footer-preview.js'), context);
  return { context, placeholder, emailValue, mailCard, requests, errors, data,
    finish: resolveFetch, renders: () => renders };
}

test('all source pages load the footer scripts before the PayPal initializer', () => {
  for (const page of readdirSync(root).filter(name => name.endsWith('.html') && name !== 'our-values.html')) {
    const html = read(page);
    assert.match(html, /<div id="site-footer"><\/div>/, page);
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match => match[1].split('?')[0]);
    for (const name of ['footer-render.js', 'footer-preview.js', 'paypal-subscribe.js']) {
      assert.equal(scripts.filter(script => script === name).length, 1, page + ': ' + name);
    }
    assert.ok(scripts.indexOf('footer-render.js') < scripts.indexOf('footer-preview.js'));
    assert.ok(scripts.indexOf('footer-preview.js') < scripts.indexOf('paypal-subscribe.js'));
  }
});

test('source preview matches the published footer and synchronizes the Contact email', async () => {
  const page = preview();
  page.finish();
  await page.context.window.siteFooterReady;
  assert.equal(page.placeholder.outerHTML, renderFooter(page.data));
  assert.equal(page.mailCard.href, 'mailto:preview@example.com');
  assert.equal(page.emailValue.textContent, 'preview@example.com');
  assert.equal(page.requests.length, 2);
  assert.ok(page.requests.every(request => request.options.cache === 'no-cache'));
  assert.equal(page.errors.length, 0);
});

test('PayPal initializes once whether the footer arrives before or after its script', async () => {
  for (const footerFirst of [true, false]) {
    const page = preview();
    if (footerFirst) {
      page.finish();
      await page.context.window.siteFooterReady;
    }
    vm.runInContext(read('paypal-subscribe.js'), page.context);
    if (!footerFirst) assert.equal(page.renders(), 0);
    page.finish();
    await page.context.window.siteFooterReady;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(page.renders(), 1);
  }
});

test('published pages keep their existing footer and do not fetch the template', () => {
  const page = preview({ published: true });
  assert.equal(page.requests.length, 0);
  assert.equal(page.context.window.siteFooterReady, undefined);
});

test('a failed preview request displays a useful message without starting PayPal', async () => {
  const page = preview({ failed: true });
  vm.runInContext(read('paypal-subscribe.js'), page.context);
  page.finish();
  await page.context.window.siteFooterReady;
  assert.match(page.placeholder.textContent, /refresh the preview/);
  assert.equal(page.renders(), 0);
  assert.equal(page.errors.length, 1);
});
