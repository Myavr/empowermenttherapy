/* Book endorsements content, managed through Pages CMS. */
(function () {
  var list = document.getElementById('endorsementsList');
  if (!list) return;

  fetch('data/endorsements.json', { cache: 'no-cache' })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      if (!data) return;
      var title = document.getElementById('endorsementsTitle');
      var intro = document.getElementById('endorsementsIntro');
      var empty = document.getElementById('endorsementsEmpty');
      if (typeof data.title === 'string' && data.title.trim()) {
        title.textContent = data.title;
        document.title = data.title + ' | Empowerment Therapy Institute';
      }
      if (typeof data.intro === 'string') intro.textContent = data.intro;
      if (typeof data.empty_message === 'string') empty.textContent = data.empty_message;

      var items = Array.isArray(data.items) ? data.items.filter(function (item) {
        return item && typeof item.quote === 'string' && item.quote.trim();
      }) : [];
      list.replaceChildren();
      items.forEach(function (item) {
        var card = document.createElement('article');
        card.className = 'testimonial-card';
        var quote = document.createElement('blockquote');
        quote.textContent = item.quote;
        card.appendChild(quote);
        if (typeof item.author === 'string' && item.author.trim()) {
          var author = document.createElement('p');
          author.className = 'author';
          author.textContent = item.author;
          card.appendChild(author);
        }
        list.appendChild(card);
      });
      empty.hidden = items.length > 0;
    })
    .catch(function () { /* Keep the page's default message if content cannot load. */ });
})();
