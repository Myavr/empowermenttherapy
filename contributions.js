/* Source previews load CMS content directly; published pages already contain it. */
(function () {
  var container = document.getElementById('contributions-content');
  if (!container || container.querySelector('.contribution-grid')) return;
  fetch('data/contributions.json', { cache: 'no-cache' })
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load contributions');
      return response.json();
    })
    .then(function (data) {
      container.innerHTML = window.etRenderContributions(data);
      document.title = data.page_title + ' | Empowerment Therapy Institute';
    })
    .catch(function (error) {
      console.error('Contributions preview failed:', error);
      var status = document.getElementById('contributions-status');
      if (status) status.textContent = 'Please refresh to see contribution options, or contact our team for help.';
    });
})();
