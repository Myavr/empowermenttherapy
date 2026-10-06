const assert = require('node:assert/strict');
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { buildSite, renderFooter, renderPage } = require('../scripts/build-site.cjs');

const root = join(__dirname, '..');
const read = name => readFileSync(join(root, name), 'utf8');
const data = () => JSON.parse(read('data/footer.json'));
const pages = readdirSync(root).filter(name => name.endsWith('.html') && name !== 'our-values.html');

test('one CMS edit updates every page, including additions, removals and reordering', () => {
  const edited = data();
  edited.contact.email = 'hello@example.com';
  edited.contact.heading = 'Contact our team';
  edited.contact.people = [{ name: 'New person', image: 'images/new.jpg' }, edited.contact.people[0]];
  edited.navigation.links = [{ label: 'New resource', url: 'resources.html#new' }];
  edited.social.instagram_url = '';
  edited.book.label = 'Read our book';
  edited.support.subscribe_link_label = 'Contribute';
  edited.copyright = 'Updated copyright';
  const footer = renderFooter(edited);
  for (const page of pages) {
    const source = read(page);
    assert.doesNotMatch(source, /<footer>/);
    const html = renderPage(source, footer);
    assert.equal((html.match(/<footer>/g) || []).length, 1);
    assert.ok(html.includes(footer));
    assert.match(html, /href="mailto:hello@example.com"/);
    assert.doesNotMatch(footer, /aria-label="Instagram"|<figcaption>Myra<\/figcaption>/);
    for (const text of ['Contact our team', 'New resource', 'Read our book', 'Contribute', 'Updated copyright']) {
      assert.ok(footer.includes(text), text);
    }
    assert.ok(footer.indexOf('<figcaption>New person') < footer.indexOf('<figcaption>Aparna'));
  }
});

test('CMS content is escaped and unsafe links fail the build', () => {
  const edited = data();
  edited.copyright = '<script>alert("x")</script> & {{email}}';
  edited.contact.people[0].image_alt = '" onerror="alert(1)';
  edited.navigation.links[0].label = '<img src=x onerror=alert(1)>';
  const html = renderFooter(edited);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&amp; {{email}}/);
  assert.match(html, /alt="&quot; onerror=&quot;alert\(1\)"/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//example.com', 'java\nscript:alert(1)', '\\example.com']) {
    edited.navigation.links[0].url = url;
    assert.throws(() => renderFooter(edited), /Invalid footer URL/);
  }
});

test('optional empty lists and links do not leave broken images or empty destinations', () => {
  const edited = data();
  edited.social = {};
  edited.navigation.links = null;
  edited.contact.people = null;
  edited.book.url = '';
  edited.book.endorsements_url = '';
  const html = renderFooter(edited);
  assert.doesNotMatch(html, /href=""|src=""|<figure>|class="footer-book"|class="footer-paypal"|{{\w+}}/);
  assert.match(html, /class="footer-subscribe-direct"/);
});

test('publishing builds all pages and assets with the shared contact email', () => {
  const output = buildSite();
  const footer = renderFooter(data());
  for (const page of pages) {
    const html = readFileSync(join(output, page), 'utf8');
    assert.ok(html.includes(footer), page);
    assert.doesNotMatch(html, /id="site-footer"|{{\w+}}/);
  }
  const contact = JSON.parse(readFileSync(join(output, 'data/pages.json'), 'utf8')).contact;
  const contributions = readFileSync(join(output, 'contributions.html'), 'utf8');
  assert.match(contributions, /class="contribution-grid"/);
  assert.match(contributions, /plan_id=P-5LD29664S0650621GNK4OZVQ/);
  assert.doesNotMatch(contributions, /Loading monthly|contributions:start/);
  assert.equal(contact.email, data().contact.email);
  assert.equal(contact.phone, JSON.parse(read('data/pages.json')).contact.phone);
  assert.equal(readFileSync(join(output, 'our-values.html'), 'utf8'), read('our-values.html'));
  for (const file of ['style.css', 'shared.js', 'paypal-subscribe.js', 'CNAME', 'data/footer.json', 'images/book-cover.png', 'pdfs/What-is-NVC-FINAL-PDF.pdf']) {
    assert.ok(existsSync(join(output, file)), file);
  }
  for (const file of ['.git', '.github', '.pages.yml', 'tests', 'scripts', 'templates']) {
    assert.equal(existsSync(join(output, file)), false, file);
  }
});

test('missing or duplicated footer placeholders fail publishing instead of silently dropping content', () => {
  assert.throws(() => renderPage('<html></html>', 'footer'), /missing/);
  assert.throws(() => renderPage('<div id="site-footer"></div><div id="site-footer"></div>', 'footer'), /Duplicate/);
});
