/* Fill source-page previews using the same content and renderer as publishing. */
(function () {
  var placeholder = document.getElementById('site-footer');
  if (!placeholder) return; // Published pages already contain the complete footer.

  function read(path, json) {
    return fetch(path, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('Could not load ' + path);
      return json ? response.json() : response.text();
    });
  }

  window.siteFooterReady = Promise.all([
    read('data/footer.json', true),
    read('templates/footer.html', false)
  ]).then(function (results) {
    var data = results[0];
    placeholder.outerHTML = window.etRenderFooter(data, results[1]);
    // Source previews do not use the build-generated data/pages.json email.
    var mailCard = document.querySelector('a.contact-info-card[href^="mailto:"]');
    if (mailCard && data.contact.email) {
      mailCard.setAttribute('href', 'mailto:' + data.contact.email);
      var value = mailCard.querySelector('.contact-info-value');
      if (value) value.textContent = data.contact.email;
    }
  }).catch(function (error) {
    console.error('Footer preview failed:', error);
    placeholder.textContent = 'The footer could not load. Please refresh the preview.';
  });
})();
