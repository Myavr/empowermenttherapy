const { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const footerMarker = '<div id="site-footer"></div>';

const render = require('../footer-render.js');
const { renderContributions } = require('../contributions-render.js');

function renderFooter(data) {
  return render(data, readFileSync(join(root, 'templates', 'footer.html'), 'utf8'));
}

function renderPage(html, footer) {
  if (!html.includes(footerMarker)) {
    if (/<meta\s+http-equiv="refresh"/i.test(html)) return html;
    throw new Error('Page is missing the shared footer marker');
  }
  if (html.split(footerMarker).length !== 2) throw new Error('Duplicate footer marker');
  return html.replace(footerMarker, () => footer);
}

function buildSite(output = join(root, '_site')) {
  const data = JSON.parse(readFileSync(join(root, 'data', 'footer.json'), 'utf8'));
  const footer = renderFooter(data);
  const contributions = JSON.parse(readFileSync(join(root, 'data', 'contributions.json'), 'utf8'));
  mkdirSync(output, { recursive: true });
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && /\.(html|css|js)$/.test(entry.name)) {
      let source = readFileSync(join(root, entry.name), 'utf8');
      if (entry.name === 'contributions.html') {
        source = source.replace(/<!-- contributions:start -->[\s\S]*?<!-- contributions:end -->/,
          () => renderContributions(contributions));
        const title = String(contributions.page_title).replace(/[&<>"']/g, c => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
        source = source.replace(/<title>[^<]*<\/title>/, () => '<title>' + title + ' | Empowerment Therapy Institute</title>');
      }
      writeFileSync(join(output, entry.name), entry.name.endsWith('.html') ? renderPage(source, footer) : source);
    }
  }
  for (const path of ['images', 'pdfs', 'data', 'CNAME']) {
    cpSync(join(root, path), join(output, path), { recursive: true });
  }
  // Preserve the shared contact-email behavior using the footer's single CMS field.
  const pages = JSON.parse(readFileSync(join(root, 'data', 'pages.json'), 'utf8'));
  pages.contact.email = data.contact.email;
  writeFileSync(join(output, 'data', 'pages.json'), JSON.stringify(pages, null, 2) + '\n');
  return output;
}

if (require.main === module) console.log('Built site: ' + buildSite());
module.exports = { buildSite, renderFooter, renderPage };
