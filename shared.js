// ===== Shared scripts used across all pages =====
(function(){

  // Dynamic header-height measurement → sets --header-h on <html>
  // Lets the subpage spacer (and anything else) match the header exactly.
  function measureHeader() {
    var h = document.querySelector('header');
    if (!h) return;
    var px = Math.round(h.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', px + 'px');
  }
  measureHeader();
  window.addEventListener('load', measureHeader);
  window.addEventListener('resize', measureHeader);
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(measureHeader);
    var hdr = document.querySelector('header');
    if (hdr) ro.observe(hdr);
  }

  // Intersection Observer for fade-in animations
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('fade-in-group')) {
          entry.target.querySelectorAll(':scope > *').forEach(function(child){
            child.classList.add('visible');
          });
        }
      }
    });
  }, { threshold: 0.02, rootMargin: '0px 0px 50px 0px' });
  document.querySelectorAll('.fade-in, .fade-in-group, .slide-left, .slide-right, .scale-in').forEach(function(el){
    observer.observe(el);
  });

  // Header scroll behavior (only affects index.html, which has transparent-then-scrolled)
  window.addEventListener('scroll', function(){
    var header = document.querySelector('header');
    if (!header) return;
    var scrollY = window.scrollY;
    var threshold = 80;
    if (scrollY > threshold) {
      header.classList.add('scrolled');
    } else if (!document.body.classList.contains('subpage')) {
      header.classList.remove('scrolled');
    }
    var t = Math.min(scrollY / threshold, 1);
    header.style.setProperty('--header-opacity', t);
    var bar = document.getElementById('scrollProgress');
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (scrollY / h * 100) + '%';
    }
  });

  // Page loader dismiss
  window.addEventListener('load', function(){
    var loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.add('loaded');
      setTimeout(function(){ loader.style.display = 'none'; }, 800);
    }
  });

  // Close mobile nav on anchor click (except the About dropdown toggle, which
  // should expand its submenu inline without closing the whole mobile menu)
  document.querySelectorAll('nav a, .nav-register').forEach(function(a){
    if (a.classList.contains('nav-dropdown-toggle')) return;
    a.addEventListener('click', function(){
      var ns = document.querySelector('.nav-stack');
      if (ns) ns.classList.remove('active');
    });
  });

  // Highlight active nav link based on current page
  (function(){
    var path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!path || path === '') path = 'index.html';
    document.querySelectorAll('nav a').forEach(function(link){
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (href === path) {
        link.classList.add('active');
        // If this link is inside the About dropdown, mark the parent dropdown
        // as open & the toggle as active so users see the grouping
        var parentDropdown = link.closest('.nav-dropdown');
        if (parentDropdown) {
          parentDropdown.classList.add('open');
          var toggle = parentDropdown.querySelector('.nav-dropdown-toggle');
          if (toggle) toggle.classList.add('active');
        }
      }
    });
  })();

  // ===== Registration Modal =====
  var modal = document.getElementById('regModal');
  if (!modal) return;
  var closeBtn = document.getElementById('regModalClose');
  var form = document.getElementById('regForm');
  var grid = document.getElementById('regAvailGrid');

  // Auto-detect timezone
  (function(){
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var offset = new Date().getTimezoneOffset();
      var sign = offset <= 0 ? '+' : '-';
      var absH = Math.floor(Math.abs(offset) / 60);
      var absM = Math.abs(offset) % 60;
      var utcLabel = 'UTC' + sign + absH + (absM ? ':' + (absM < 10 ? '0' : '') + absM : '');
      var sel = document.getElementById('regTimezone');
      if (!sel) return;
      var matched = false;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value.indexOf(utcLabel) === 0) {
          sel.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && tz) {
        var opt = document.createElement('option');
        opt.value = utcLabel + ' (' + tz + ')';
        opt.textContent = utcLabel + ' (' + tz.replace(/_/g, ' ') + ')';
        opt.selected = true;
        sel.insertBefore(opt, sel.options[1]);
      }
    } catch(e) {}
  })();

  // Build availability grid for next 7 days
  var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var timeSlots = ['12:00 AM','1:00 AM','2:00 AM','3:00 AM','4:00 AM','5:00 AM','6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM','11:00 PM'];
  var today = new Date();

  var next7 = [];
  for (var d = 0; d < 7; d++) {
    var dt = new Date(today);
    dt.setDate(today.getDate() + d);
    next7.push(dt);
  }
  var weekdays = next7.filter(function(dt){ return dt.getDay() >= 1 && dt.getDay() <= 5; });
  var weekends = next7.filter(function(dt){ return dt.getDay() === 0 || dt.getDay() === 6; });
  var orderedDays = weekdays.concat(weekends);

  if (grid) {
    var headerEl = document.createElement('div');
    headerEl.className = 'reg-avail-header';
    headerEl.innerHTML = '<div class="reg-avail-corner"></div>';
    for (var d = 0; d < orderedDays.length; d++) {
      var date = orderedDays[d];
      var dayLabel = dayNames[date.getDay()];
      var dateStr = (date.getMonth()+1) + '/' + date.getDate();
      headerEl.innerHTML += '<div class="reg-avail-day-label">' + dayLabel + '<br><span>' + dateStr + '</span></div>';
    }
    grid.appendChild(headerEl);

    for (var t = 0; t < timeSlots.length; t++) {
      var row = document.createElement('div');
      row.className = 'reg-avail-row';
      row.innerHTML = '<div class="reg-avail-time-label">' + timeSlots[t] + '</div>';
      for (var d2 = 0; d2 < orderedDays.length; d2++) {
        var date2 = orderedDays[d2];
        var dateKey = (date2.getMonth()+1) + '/' + date2.getDate();
        var cellId = dateKey + ' ' + timeSlots[t];
        row.innerHTML += '<div class="reg-avail-cell" data-slot="' + cellId + '" tabindex="0" role="checkbox" aria-checked="false" aria-label="' + dayNames[date2.getDay()] + ' ' + dateKey + ' at ' + timeSlots[t] + '"></div>';
      }
      grid.appendChild(row);
    }

    var mobileAvail = document.createElement('div');
    mobileAvail.className = 'reg-avail-mobile';

    for (var md = 0; md < orderedDays.length; md++) {
      var mDate = orderedDays[md];
      var mDayLabel = dayNames[mDate.getDay()];
      var mDateStr = (mDate.getMonth()+1) + '/' + mDate.getDate();

      var card = document.createElement('div');
      card.className = 'reg-avail-day-card';
      card.setAttribute('data-day-index', md);

      var header = document.createElement('div');
      header.className = 'reg-avail-day-header';
      header.innerHTML = '<div>' + mDayLabel + ' <span>' + mDateStr + '</span> <span class="day-count" style="display:none">0</span></div><span class="day-toggle">▼</span>';
      card.appendChild(header);

      var slots = document.createElement('div');
      slots.className = 'reg-avail-day-slots';

      for (var mt = 0; mt < timeSlots.length; mt++) {
        var pill = document.createElement('div');
        pill.className = 'reg-avail-time-pill';
        pill.textContent = timeSlots[mt];
        pill.setAttribute('data-slot', mDateStr + ' ' + timeSlots[mt]);
        slots.appendChild(pill);
      }
      card.appendChild(slots);
      mobileAvail.appendChild(card);
    }

    grid.parentNode.insertBefore(mobileAvail, grid.nextSibling);

    mobileAvail.addEventListener('click', function(e) {
      var header = e.target.closest('.reg-avail-day-header');
      if (header) {
        header.parentElement.classList.toggle('open');
        return;
      }
      var pill = e.target.closest('.reg-avail-time-pill');
      if (pill) {
        pill.classList.toggle('selected');
        var slotKey = pill.getAttribute('data-slot');
        var desktopCell = grid.querySelector('[data-slot="' + slotKey + '"]');
        if (desktopCell) {
          desktopCell.classList.toggle('selected', pill.classList.contains('selected'));
          desktopCell.setAttribute('aria-checked', pill.classList.contains('selected'));
        }
        var card = pill.closest('.reg-avail-day-card');
        var count = card.querySelectorAll('.reg-avail-time-pill.selected').length;
        var badge = card.querySelector('.day-count');
        if (count > 0) {
          badge.style.display = '';
          badge.textContent = count;
        } else {
          badge.style.display = 'none';
        }
      }
    });

    var isDragging = false;
    var dragMode = null;
    var dragCol = null;

    function getCellCol(cell) {
      var row = cell.parentElement;
      var cells = row.querySelectorAll('.reg-avail-cell');
      for (var i = 0; i < cells.length; i++) {
        if (cells[i] === cell) return i;
      }
      return -1;
    }

    function applyCellToggle(cell) {
      if (dragMode === 'select') {
        cell.classList.add('selected');
        cell.setAttribute('aria-checked', 'true');
      } else {
        cell.classList.remove('selected');
        cell.setAttribute('aria-checked', 'false');
      }
    }

    grid.addEventListener('mousedown', function(e) {
      var cell = e.target.closest('.reg-avail-cell');
      if (!cell) return;
      e.preventDefault();
      isDragging = true;
      dragMode = cell.classList.contains('selected') ? 'deselect' : 'select';
      dragCol = getCellCol(cell);
      applyCellToggle(cell);
    });

    grid.addEventListener('mouseover', function(e) {
      if (!isDragging) return;
      var cell = e.target.closest('.reg-avail-cell');
      if (!cell) return;
      if (getCellCol(cell) === dragCol) applyCellToggle(cell);
    });

    document.addEventListener('mouseup', function() {
      isDragging = false; dragMode = null; dragCol = null;
    });

    grid.addEventListener('touchstart', function(e) {
      var cell = e.target.closest('.reg-avail-cell');
      if (!cell) return;
      isDragging = true;
      dragMode = cell.classList.contains('selected') ? 'deselect' : 'select';
      dragCol = getCellCol(cell);
      applyCellToggle(cell);
    }, {passive: true});

    grid.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      var touch = e.touches[0];
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      var cell = el ? el.closest('.reg-avail-cell') : null;
      if (!cell) return;
      if (getCellCol(cell) === dragCol) applyCellToggle(cell);
    }, {passive: true});

    document.addEventListener('touchend', function() {
      isDragging = false; dragMode = null; dragCol = null;
    });

    grid.addEventListener('keydown', function(e) {
      if (e.key === ' ' || e.key === 'Enter') {
        var cell = e.target.closest('.reg-avail-cell');
        if (!cell) return;
        e.preventDefault();
        cell.classList.toggle('selected');
        cell.setAttribute('aria-checked', cell.classList.contains('selected'));
      }
    });
  }

  window.openRegModal = function(e) {
    if (e) e.preventDefault();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });

  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var submitBtn = form.querySelector('.reg-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      var name = document.getElementById('regName').value.trim();
      var email = document.getElementById('regEmail').value.trim();
      var timezone = document.getElementById('regTimezone').value;
      var program = document.getElementById('regProgram').value || 'Not specified';
      var message = document.getElementById('regMessage').value.trim();

      var selected = grid.querySelectorAll('.reg-avail-cell.selected');
      var selectedMobile = document.querySelectorAll('.reg-avail-time-pill.selected');
      var slotSet = {};
      var slots = [];
      for (var i = 0; i < selected.length; i++) {
        var s = selected[i].getAttribute('data-slot');
        if (!slotSet[s]) { slotSet[s] = true; slots.push(s); }
      }
      for (var i2 = 0; i2 < selectedMobile.length; i2++) {
        var s2 = selectedMobile[i2].getAttribute('data-slot');
        if (!slotSet[s2]) { slotSet[s2] = true; slots.push(s2); }
      }

      function localHourToCT(hour24, dateStr) {
        var dateParts = dateStr.split('/');
        var now = new Date();
        var year = now.getFullYear();
        var month = parseInt(dateParts[0]) - 1;
        var day = parseInt(dateParts[1]);
        var localDate = new Date(year, month, day, hour24, 0, 0);
        var ctStr = localDate.toLocaleString('en-US', {timeZone: 'America/Chicago', hour12: false, hour: '2-digit', minute: '2-digit'});
        var ctHour = parseInt(ctStr.split(':')[0]);
        var ctDateStr = localDate.toLocaleString('en-US', {timeZone: 'America/Chicago', month: 'numeric', day: 'numeric'});
        var ctDateParts = ctDateStr.match(/(\d+)\/(\d+)/);
        var ctDate = ctDateParts ? ctDateParts[1] + '/' + ctDateParts[2] : dateStr;
        return {hour24: ctHour, dateStr: ctDate};
      }

      function hour24To12(h) {
        if (h === 0) return '12:00 AM';
        if (h < 12) return h + ':00 AM';
        if (h === 12) return '12:00 PM';
        return (h - 12) + ':00 PM';
      }

      function timeToHour(t) {
        var match = t.match(/^(\d+):00\s*(AM|PM)$/i);
        if (!match) return -1;
        var h = parseInt(match[1]);
        var ampm = match[2].toUpperCase();
        if (ampm === 'AM' && h === 12) h = 0;
        else if (ampm === 'PM' && h !== 12) h += 12;
        return h;
      }

      function collapseRanges(times) {
        times.sort(function(a, b) { return timeToHour(a) - timeToHour(b); });
        var ranges = [];
        var rangeStart = null;
        var rangePrev = null;
        for (var r = 0; r < times.length; r++) {
          var hr = timeToHour(times[r]);
          if (rangeStart === null) {
            rangeStart = times[r]; rangePrev = hr;
          } else if (hr === rangePrev + 1) {
            rangePrev = hr;
          } else {
            if (rangePrev === timeToHour(rangeStart)) ranges.push(rangeStart);
            else ranges.push(rangeStart + ' – ' + times[r - 1]);
            rangeStart = times[r]; rangePrev = hr;
          }
        }
        if (rangeStart !== null) {
          if (rangePrev === timeToHour(rangeStart)) ranges.push(rangeStart);
          else ranges.push(rangeStart + ' – ' + times[times.length - 1]);
        }
        return ranges.join(', ');
      }

      var availStr = 'No specific times selected — please reach out to coordinate.';
      if (slots.length > 0) {
        var byDateCT = {};
        for (var j = 0; j < slots.length; j++) {
          var parts = slots[j].split(' ');
          var dateKey = parts[0];
          var time = parts.slice(1).join(' ');
          var localH = timeToHour(time);
          var ct = localHourToCT(localH, dateKey);
          var ctTime = hour24To12(ct.hour24);
          if (!byDateCT[ct.dateStr]) byDateCT[ct.dateStr] = [];
          byDateCT[ct.dateStr].push(ctTime);
        }
        var lines = [];
        for (var dk in byDateCT) {
          lines.push(dk + ': ' + collapseRanges(byDateCT[dk]));
        }
        availStr = lines.join(' | ');
      }

      var formData = new FormData();
      formData.append('Name', name);
      formData.append('Email', email);
      formData.append('Timezone', timezone);
      formData.append('Program Interest', program);
      formData.append('Availability (Central Time)', availStr);
      if (message) formData.append('Additional Notes', message);
      formData.append('_subject', 'Registration Request: ' + name);
      formData.append('_cc', 'myra.walden@gmail.com,psureka4@gmail.com,simran.bhola@gmail.com');
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');

      fetch('https://formsubmit.co/ajax/empowermenttherapyinstitute@gmail.com', {
        method: 'POST',
        body: formData
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          form.innerHTML = '<div class="reg-success"><div class="reg-success-icon">&#10003;</div><h3>Registration Submitted!</h3><p>Thank you, ' + name + '. We\'ve received your registration and will be in touch to confirm your orientation session.</p></div>';
        } else {
          throw new Error('Submission failed');
        }
      })
      .catch(function() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Registration';
        alert('Something went wrong. Please try again, or email us directly at empowermenttherapyinstitute@gmail.com');
      });
    });
  }
})();

/* ===== Editable content: render sections from /data JSON files =====
   Content lives in data/*.json and is edited by non-coders through the CMS.
   Styling stays entirely in style.css and the markup classes used below, so
   editing the JSON can never change the design. If a fetch ever fails, the
   page keeps whatever HTML is already in place (progressive enhancement),
   so it never breaks. */
(function () {
  var tags = document.querySelector('.country-tags');
  if (!tags) return;
  fetch('data/countries.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !Array.isArray(data.items)) return; // keep the existing HTML fallback
      tags.innerHTML = '';
      data.items.forEach(function (name) {
        var span = document.createElement('span');
        span.className = 'country-tag visible';
        span.textContent = String(name);
        tags.appendChild(span);
      });
    })
    .catch(function () { /* leave the hardcoded list as-is */ });
})();

/* ===== News & Events =====
   Rendered from data/news.json + data/events.json. The whole section stays
   hidden unless there is at least one news item or upcoming event. Past
   one-time events fall off automatically; recurring events always show.
   Editing the JSON (via the CMS) can never affect styling. */
(function () {
  var section = document.getElementById('newsEvents');
  if (!section) return;

  function esc(s) {
    var e = document.createElement('div');
    e.textContent = s == null ? '' : String(s);
    return e.innerHTML;
  }
  function escLines(s) { return esc(s).replace(/\n/g, '<br>'); }
  function safeUrl(u) {
    u = String(u == null ? '' : u).trim();
    return /^(https?:\/\/|mailto:|\/)/i.test(u) ? u : '';
  }
  function parseLocalDate(s) {
    if (!s) return null;
    var p = String(s).slice(0, 10).split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtDate(d) {
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  function getJSON(path) {
    return fetch(path, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function renderNews(items) {
    var col = document.getElementById('newsCol');
    var list = document.getElementById('newsList');
    if (!list) return 0;
    var rows = items.map(function (it) { return { it: it || {}, d: parseLocalDate((it || {}).date) }; });
    rows.sort(function (a, b) { return (b.d ? b.d.getTime() : 0) - (a.d ? a.d.getTime() : 0); });
    list.innerHTML = '';
    var count = 0;
    rows.forEach(function (row) {
      var it = row.it;
      if (!it.title && !it.body) return;
      count++;
      var html = '';
      if (row.d) html += '<p class="ne-item-date">' + esc(fmtDate(row.d)) + '</p>';
      if (it.title) html += '<h4 class="ne-item-title">' + esc(it.title) + '</h4>';
      if (it.body) html += '<p class="ne-item-body">' + escLines(it.body) + '</p>';
      var url = safeUrl(it.link);
      if (url) html += '<a class="ne-item-link" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(it.link_label || 'Read more') + '</a>';
      var el = document.createElement('article');
      el.className = 'ne-item';
      el.innerHTML = html;
      list.appendChild(el);
    });
    if (col) col.hidden = count === 0;
    return count;
  }

  function renderEvents(items) {
    var col = document.getElementById('eventsCol');
    var list = document.getElementById('eventsList');
    if (!list) return 0;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var rows = [];
    items.forEach(function (it) {
      it = it || {};
      if (!it.title) return;
      var recurring = it.schedule_type === 'Recurring' || (!!it.recurrence && !it.date);
      var d = parseLocalDate(it.date);
      if (!recurring && d && d.getTime() < today.getTime()) return; // drop past one-time events
      rows.push({ it: it, recurring: recurring, d: d });
    });
    rows.sort(function (a, b) {
      if (a.recurring !== b.recurring) return a.recurring ? 1 : -1;
      return (a.d ? a.d.getTime() : 0) - (b.d ? b.d.getTime() : 0);
    });
    list.innerHTML = '';
    var count = 0;
    rows.forEach(function (row) {
      var it = row.it;
      count++;
      var html = '';
      if (row.recurring) {
        html += '<p class="ne-item-date"><span class="ne-recur">Repeats</span>' +
          esc(it.recurrence || 'Recurring') + (it.time ? ' &middot; ' + esc(it.time) : '') + '</p>';
      } else if (row.d) {
        html += '<p class="ne-item-date">' + esc(fmtDate(row.d)) + (it.time ? ' &middot; ' + esc(it.time) : '') + '</p>';
      } else if (it.time) {
        html += '<p class="ne-item-date">' + esc(it.time) + '</p>';
      }
      html += '<h4 class="ne-item-title">' + esc(it.title) + '</h4>';
      if (it.description) html += '<p class="ne-item-body">' + escLines(it.description) + '</p>';
      if (it.location) html += '<p class="ne-item-meta">' + esc(it.location) + '</p>';
      var url = safeUrl(it.link);
      if (url) html += '<a class="ne-item-link" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(it.link_label || 'Learn more') + '</a>';
      var el = document.createElement('article');
      el.className = 'ne-item';
      el.innerHTML = html;
      list.appendChild(el);
    });
    if (col) col.hidden = count === 0;
    return count;
  }

  Promise.all([getJSON('data/news.json'), getJSON('data/events.json')]).then(function (res) {
    var news = res[0] && Array.isArray(res[0].items) ? res[0].items : [];
    var events = res[1] && Array.isArray(res[1].items) ? res[1].items : [];
    var shown = renderNews(news) + renderEvents(events);
    if (shown > 0) section.hidden = false;
  });
})();
