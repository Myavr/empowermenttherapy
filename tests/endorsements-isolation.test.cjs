const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const read = name => readFileSync(join(__dirname, '..', name), 'utf8');
const shared = read('shared.js');
const loader = shared.slice(shared.indexOf('/* ===== Testimonials (data/testimonials.json)'),
  shared.indexOf('/* ===== Hero headline'));

async function runLoader(html, script = loader) {
  const requests = [];
  const container = { children: [], appendChild(card) { this.children.push(card); } };
  vm.runInNewContext(script, {
    document: {
      querySelector(selector) {
        const hasGrid = [...html.matchAll(/class="([^"]*)"/g)]
          .some(match => match[1].split(/\s+/).includes('testimonials'));
        if (selector === '.testimonials') return hasGrid ? container : null;
        if (selector === '#testimonialsSection .testimonials') {
          return hasGrid && html.includes('id="testimonialsSection"') ? container : null;
        }
        throw new Error('Unexpected selector: ' + selector);
      },
      createElement: () => ({})
    },
    etEsc: value => String(value),
    fetch: async url => {
      requests.push(url);
      return { ok: true, json: async () => ({ items: [{ quote: 'Student testimonial', name: 'Student' }] }) };
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { requests, container };
}

test('endorsements never request or render student testimonials', async () => {
  const result = await runLoader(read('endorsements.html'));
  assert.deepEqual(result.requests, []);
  assert.equal(result.container.children.length, 0);
});

test('endorsements are also isolated from the previously cached testimonials loader', async () => {
  const legacyLoader = loader.replace('#testimonialsSection .testimonials', '.testimonials');
  const result = await runLoader(read('endorsements.html'), legacyLoader);
  assert.deepEqual(result.requests, []);
});

test('shared loader ignores reusable testimonial styling outside the testimonials section', async () => {
  const result = await runLoader('<div class="testimonials" id="endorsementsList"></div>');
  assert.deepEqual(result.requests, []);
});

for (const page of ['index.html', 'testimonials.html']) {
  test(page + ' still loads CMS student testimonials', async () => {
    const result = await runLoader(read(page));
    assert.deepEqual(result.requests, ['data/testimonials.json']);
    assert.equal(result.container.children.length, 1);
    assert.match(result.container.children[0].innerHTML, /Student testimonial/);
  });
}
