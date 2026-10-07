/* Resources accordion, including cards refreshed from CMS data. */
(function () {
  var grid = document.querySelector('.resource-grid');
  if (!grid) return;

  function setOpen(card, open) {
    card.classList.toggle('is-open', open);
    card.querySelector('.resource-card-header').setAttribute('aria-expanded', String(open));
    card.querySelector('.resource-card-body').inert = !open;
  }

  function prepareCards() {
    var foundOpen = false;
    grid.querySelectorAll('.resource-card').forEach(function (card, index) {
      var header = card.querySelector('.resource-card-header');
      var body = card.querySelector('.resource-card-body');
      card.removeAttribute('tabindex');
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      body.id = 'resource-panel-' + (index + 1);
      header.setAttribute('aria-controls', body.id);
      var open = card.classList.contains('is-open') && !foundOpen;
      foundOpen = foundOpen || open;
      setOpen(card, open);
    });
  }

  function toggle(header) {
    var selected = header.closest('.resource-card');
    var open = !selected.classList.contains('is-open');
    grid.querySelectorAll('.resource-card').forEach(function (card) {
      setOpen(card, card === selected && open);
    });
  }

  grid.addEventListener('click', function (event) {
    var header = event.target.closest('.resource-card-header');
    if (header && grid.contains(header)) toggle(header);
  });
  grid.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var header = event.target.closest('.resource-card-header');
    if (!header || !grid.contains(header)) return;
    event.preventDefault();
    toggle(header);
  });

  prepareCards();
  new MutationObserver(prepareCards).observe(grid, { childList: true, subtree: true });
})();
