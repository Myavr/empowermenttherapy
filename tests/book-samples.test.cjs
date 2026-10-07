const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { renderBookSamples } = require('../book-samples-render.js');
const { buildSite } = require('../scripts/build-site.cjs');
const root = join(__dirname, '..');
const read = file => readFileSync(join(root, file), 'utf8');
const data = () => JSON.parse(read('data/book-samples.json'));

test('chapter samples use their CMS labels and PDFs in order, opening in new tabs', () => {
  const edited = { chapters: [
    { title: 'Chapter 2', pdf: 'pdfs/chapter 2.pdf' },
    { title: 'Sample 1', pdf: 'pdfs/ETbooksample1.pdf' }
  ] };
  const html = renderBookSamples(edited);
  assert.ok(html.indexOf('Chapter 2') < html.indexOf('Sample 1'));
  assert.equal((html.match(/target="_blank" rel="noopener"/g) || []).length, 2);
  assert.match(html, /href="pdfs\/ETbooksample1.pdf"/);
  assert.match(html, /<summary[^>]*>Chapter samples/);
  assert.match(html, /href="pdfs\/chapter 2.pdf"/);
  assert.equal(renderBookSamples({ chapters: [] }), '');
});

test('chapter labels are escaped and PDF destinations cannot execute code or leave the PDF folder', () => {
  const html = renderBookSamples({ label: '<script>Book</script>', chapters: [{ title: '<img onerror="evil()">', pdf: 'pdfs/sample.pdf' }] });
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;/);
  for (const pdf of ['javascript:alert(1)', '//example.com/sample.pdf', 'pdfs/../private.pdf', 'images/book.png']) {
    assert.throws(() => renderBookSamples({ chapters: [{ title: 'Sample', pdf }] }), /PDF in pdfs/);
  }
  assert.throws(() => renderBookSamples({ chapters: [{ pdf: 'pdfs/sample.pdf' }] }), /need a title/);
});

function dropdown() {
  const handlers = {}, documentHandlers = {};
  const summary = { focus() { document.activeElement = summary; } };
  const group = {
    open: false,
    addEventListener(name, handler) { handlers[name] = handler; },
    contains(element) { return element === summary; },
    querySelector() { return summary; }
  };
  const host = { dataset: { published: 'true' }, querySelector: () => group, contains: element => element === summary };
  const document = { activeElement: null, getElementById: () => host, addEventListener(name, handler) { documentHandlers[name] = handler; } };
  vm.runInNewContext(read('book-samples.js'), { document, fetch() { throw new Error('Published samples should not refetch'); } });
  return { handlers, documentHandlers, group, summary, document };
}

test('hover opens the samples, touch leaves native tapping intact, and Escape or outside input closes them', () => {
  const ui = dropdown();
  ui.handlers.pointerenter({ pointerType: 'touch' });
  assert.equal(ui.group.open, false);
  ui.handlers.pointerenter({ pointerType: 'mouse' });
  assert.equal(ui.group.open, true);
  ui.handlers.pointerleave({ pointerType: 'mouse' });
  assert.equal(ui.group.open, false);
  ui.group.open = true;
  ui.document.activeElement = ui.summary;
  ui.handlers.pointerleave({ pointerType: 'mouse' });
  assert.equal(ui.group.open, true);
  let prevented = false;
  ui.handlers.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(ui.group.open, false);
  assert.equal(ui.document.activeElement, ui.summary);
  ui.group.open = true;
  ui.documentHandlers.pointerdown({ target: {} });
  assert.equal(ui.group.open, false);
  ui.group.open = true;
  ui.handlers.focusout({ relatedTarget: {} });
  assert.equal(ui.group.open, false);
});

test('source previews fetch current CMS samples and render with the publishing renderer', async () => {
  const edited = { label: 'Read a chapter', chapters: [{ title: 'New chapter', pdf: 'pdfs/new.pdf' }] };
  const host = { dataset: {}, innerHTML: '', querySelector: () => null };
  const calls = [];
  const context = vm.createContext({ window: { etRenderBookSamples: renderBookSamples }, document: { getElementById: () => host, addEventListener() {} }, console,
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => edited }; }
  });
  vm.runInContext(read('book-samples.js'), context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(host.innerHTML, renderBookSamples(edited));
  assert.equal(calls[0].url, 'data/book-samples.json');
  assert.equal(calls[0].options.cache, 'no-cache');
});

test('publishing embeds the CMS samples between endorsements and Purchase and includes the PDF', () => {
  const output = buildSite();
  const html = readFileSync(join(output, 'resources.html'), 'utf8');
  const book = html.match(/<aside class="resource-book"[\s\S]*?<\/aside>/)[0];
  assert.ok(book.indexOf('resource-book-endorsements') < book.indexOf('book-chapter-samples'));
  assert.ok(book.indexOf('book-chapter-samples') < book.indexOf('>Purchase</a>'));
  assert.ok(book.includes(renderBookSamples(data())));
  assert.match(book, /data-published="true"/);
  assert.doesNotMatch(book, /book-samples:start/);
  assert.ok(existsSync(join(output, 'pdfs/ETbooksample1.pdf')));
  assert.match(read('.pages.yml'), /name: book_samples[\s\S]*?path: data\/book-samples.json/);
  assert.match(read('.pages.yml'), /label: Sample PDF[\s\S]*?type: file[\s\S]*?media: pdfs/);
});
