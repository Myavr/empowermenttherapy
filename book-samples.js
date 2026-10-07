/* Hover, keyboard and touch support; source previews use the publishing renderer. */
(function () {
  var host = document.getElementById('book-chapter-samples');
  if (!host) return;

  function bind() {
    var group = host.querySelector('.book-samples');
    if (!group) return;
    group.addEventListener('pointerenter', function (event) {
      if (event.pointerType !== 'touch') group.open = true;
    });
    group.addEventListener('pointerleave', function (event) {
      if (event.pointerType !== 'touch' && !group.contains(document.activeElement)) group.open = false;
    });
    group.addEventListener('focusout', function (event) {
      if (!group.contains(event.relatedTarget)) group.open = false;
    });
    group.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && group.open) {
        event.preventDefault();
        group.querySelector('summary').focus();
        group.open = false;
      }
    });
  }

  document.addEventListener('pointerdown', function (event) {
    var group = host.querySelector('.book-samples');
    if (group && !host.contains(event.target)) group.open = false;
  });
  bind();
  if (host.dataset.published === 'true') return;
  fetch('data/book-samples.json', { cache: 'no-cache' })
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load chapter samples');
      return response.json();
    })
    .then(function (data) {
      host.innerHTML = window.etRenderBookSamples(data);
      bind();
    })
    .catch(function (error) { console.error('Chapter samples preview failed:', error); });
})();
