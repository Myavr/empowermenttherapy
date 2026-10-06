/* Shared by static publishing and browser previews. */
(function (root) {
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

// CMS URLs may be local paths or web links, never executable URL schemes.
function safeURL(value) {
  const url = String(value ?? '').trim();
  if (!url || /[\s\x00-\x1f\x7f\\]/.test(url.replace(/ /g, '')) || url.startsWith('//') ||
      (/^[^/?#]*:/.test(url) && !/^https?:\/\//i.test(url))) {
    throw new Error('Invalid footer URL: ' + url);
  }
  return escapeHTML(url);
}

function renderFooter(data, template) {
  const { social, book, navigation, contact, support } = data;
  const image = (src, alt) => src ? `<img src="${safeURL(src)}" alt="${escapeHTML(alt)}">` : '';
  const link = (url, label, className, external = false) => url
    ? `<a href="${safeURL(url)}"${className ? ` class="${className}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>${escapeHTML(label)}</a>` : '';
  const values = {
    instagram_url: social.instagram_url ? safeURL(social.instagram_url) : '',
    facebook_url: social.facebook_url ? safeURL(social.facebook_url) : '',
    book_image: book.image && book.url ? `<a href="${safeURL(book.url)}" target="_blank" rel="noopener" class="footer-book">${image(book.image, book.image_alt)}</a>` : '',
    book_link: link(book.url, book.label, 'footer-book-link', true),
    endorsements_link: link(book.endorsements_url, book.endorsements_label, 'footer-book-endorsements'),
    navigation_heading: escapeHTML(navigation.heading),
    navigation_links: (navigation.links || []).map(item => link(item.url, item.label)).join('\n'),
    contact_heading: escapeHTML(contact.heading),
    people: (contact.people || []).map(person => `<figure>${image(person.image, person.image_alt || person.name)}<figcaption>${escapeHTML(person.name)}</figcaption></figure>`).join('\n'),
    email: escapeHTML(contact.email),
    support_heading: escapeHTML(support.heading),
    payment: support.payment_url ? `<a href="${safeURL(support.payment_url)}" target="_blank" rel="noopener" class="footer-paypal">${image(support.payment_image, support.payment_image_alt)}<span>${escapeHTML(support.payment_label)}</span></a>` : '',
    subscribe_label: escapeHTML(support.subscribe_label),
    subscribe_link_label: escapeHTML(support.subscribe_link_label),
    copyright: escapeHTML(data.copyright)
  };
  return template
    .replace(/<!-- if (\w+) -->([\s\S]*?)<!-- endif -->/g, (_, key, body) => values[key] ? body : '')
    .replace(/{{(\w+)}}/g, (_, key) => {
      if (!(key in values)) throw new Error('Unknown footer field: ' + key);
      return values[key];
    });
}

if (typeof module === 'object' && module.exports) module.exports = renderFooter;
else root.etRenderFooter = renderFooter;
})(typeof window !== 'undefined' ? window : globalThis);
