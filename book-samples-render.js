/* Shared CMS chapter-sample rendering for publishing and local previews. */
(function (root) {
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function pdfURL(value) {
    const path = String(value || '').trim().replace(/^\//, '');
    if (!/^pdfs\/.+\.pdf$/i.test(path) || /[\\\x00-\x1f\x7f]/.test(path) ||
        path.split('/').some(part => part === '..' || part === '.')) {
      throw new Error('Chapter samples must link to a PDF in pdfs/');
    }
    return esc(path);
  }

  function renderBookSamples(data) {
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    if (!chapters.length) return '';
    const links = chapters.map(chapter => {
      if (!chapter || !String(chapter.title || '').trim()) throw new Error('Chapter samples need a title');
      return '<a class="book-sample-link" href="' + pdfURL(chapter.pdf) + '" target="_blank" rel="noopener">' + esc(chapter.title) + '</a>';
    }).join('\n');
    return '<details class="book-samples">' +
      '<summary class="btn btn--filled">' + esc(data.label || 'Chapter samples') + '<span class="book-samples-caret" aria-hidden="true">&#9662;</span></summary>' +
      '<div class="book-samples-menu">' + links + '</div></details>';
  }

  if (typeof module === 'object' && module.exports) module.exports = { renderBookSamples };
  else root.etRenderBookSamples = renderBookSamples;
})(typeof window !== 'undefined' ? window : globalThis);
