(function () {
  'use strict';

  // All weekly schedules follow Chicago time through daylight saving changes.
  var programSchedules = {
    1: { weekday: 'Tue', hour: 20, minute: 0 },
    2: { weekday: 'Thu', hour: 9, minute: 0 },
    3: { weekday: 'Fri', hour: 9, minute: 30 }
  };

  function nextProgramSession(now, level) {
    var session = programSchedules[level];
    if (!session) throw new Error('Unknown program level');
    var chicago = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', hourCycle: 'h23'
    });
    // An evening in Chicago can fall on the following day in UTC.
    for (var day = -1; day <= 7; day++) {
      var candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, session.hour, session.minute));
      var parts = chicago.formatToParts(candidate);
      var weekday = parts.find(function (p) { return p.type === 'weekday'; }).value;
      if (weekday !== session.weekday) continue;
      var hour = Number(parts.find(function (p) { return p.type === 'hour'; }).value);
      candidate.setUTCHours(candidate.getUTCHours() + session.hour - hour);
      if (candidate >= now) return candidate;
    }
    throw new Error('No upcoming program session');
  }

  function formatProgramSession(start, timeZone) {
    var end = new Date(start.getTime() + 90 * 60 * 1000);
    var time = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone, hour: 'numeric', minute: '2-digit', hour12: true
    });
    var weekday = new Intl.DateTimeFormat('en-US', { timeZone: timeZone, weekday: 'long' });
    var day = weekday.format(start) + 's';
    var range = typeof time.formatRange === 'function'
      ? time.formatRange(start, end) : time.format(start) + '\u2013' + time.format(end);
    if (weekday.format(start) !== weekday.format(end)) {
      range = time.format(start) + '\u2013' + weekday.format(end) + 's ' + time.format(end);
    }
    var zone = new Intl.DateTimeFormat('en-US', { timeZone: timeZone, timeZoneName: 'short' })
      .formatToParts(start).find(function (p) { return p.type === 'timeZoneName'; }).value;
    return day + ' \u00b7 ' + range + ' ' + zone;
  }

  // Representative places cover worldwide offsets, including fractional ones.
  var cityZones = [
    ['Etc/GMT+12', 'Baker Island'],
    ['Pacific/Pago_Pago', 'Pago Pago'],
    ['Pacific/Honolulu', 'Honolulu'],
    ['Pacific/Marquesas', 'Taiohae, Marquesas Islands'],
    ['America/Anchorage', 'Anchorage'],
    ['Pacific/Gambier', 'Rikitea, Gambier Islands'],
    ['America/Los_Angeles', 'Los Angeles'],
    ['America/Vancouver', 'Vancouver'],
    ['Pacific/Pitcairn', 'Adamstown, Pitcairn Islands'],
    ['America/Denver', 'Denver'],
    ['America/Phoenix', 'Phoenix'],
    ['America/Mexico_City', 'Mexico City'],
    ['America/Guatemala', 'Guatemala City'],
    ['America/Chicago', 'Chicago'],
    ['America/Bogota', 'Bogot\u00e1'],
    ['America/Lima', 'Lima'],
    ['America/New_York', 'New York'],
    ['America/Toronto', 'Toronto'],
    ['America/Caracas', 'Caracas'],
    ['America/Santo_Domingo', 'Santo Domingo'],
    ['America/Halifax', 'Halifax'],
    ['America/Santiago', 'Santiago'],
    ['America/St_Johns', "St. John's, Newfoundland"],
    ['America/Sao_Paulo', 'S\u00e3o Paulo'],
    ['America/Argentina/Buenos_Aires', 'Buenos Aires'],
    ['America/Noronha', 'Fernando de Noronha'],
    ['Atlantic/Azores', 'Ponta Delgada, Azores'],
    ['Atlantic/Cape_Verde', 'Praia, Cape Verde'],
    ['UTC', 'Coordinated Universal Time'],
    ['Europe/London', 'London'],
    ['Europe/Lisbon', 'Lisbon'],
    ['Africa/Abidjan', 'Abidjan'],
    ['Africa/Lagos', 'Lagos'],
    ['Africa/Casablanca', 'Casablanca'],
    ['Europe/Paris', 'Paris'],
    ['Europe/Berlin', 'Berlin'],
    ['Europe/Amsterdam', 'Amsterdam'],
    ['Africa/Johannesburg', 'Johannesburg'],
    ['Africa/Cairo', 'Cairo'],
    ['Europe/Athens', 'Athens'],
    ['Europe/Istanbul', 'Istanbul'],
    ['Europe/Moscow', 'Moscow'],
    ['Asia/Riyadh', 'Riyadh'],
    ['Africa/Nairobi', 'Nairobi'],
    ['Africa/Dar_es_Salaam', 'Dar es Salaam'],
    ['Asia/Tehran', 'Tehran'],
    ['Asia/Dubai', 'Dubai'],
    ['Asia/Kabul', 'Kabul'],
    ['Asia/Karachi', 'Karachi'],
    ['Asia/Tashkent', 'Tashkent'],
    ['Asia/Kolkata', 'New Delhi'],
    ['Asia/Kathmandu', 'Kathmandu'],
    ['Asia/Dhaka', 'Dhaka'],
    ['Asia/Yangon', 'Yangon'],
    ['Asia/Bangkok', 'Bangkok'],
    ['Asia/Jakarta', 'Jakarta'],
    ['Asia/Shanghai', 'Shanghai'],
    ['Asia/Hong_Kong', 'Hong Kong'],
    ['Asia/Singapore', 'Singapore'],
    ['Asia/Manila', 'Manila'],
    ['Australia/Perth', 'Perth'],
    ['Australia/Eucla', 'Eucla'],
    ['Asia/Tokyo', 'Tokyo'],
    ['Asia/Seoul', 'Seoul'],
    ['Australia/Darwin', 'Darwin'],
    ['Australia/Adelaide', 'Adelaide'],
    ['Australia/Brisbane', 'Brisbane'],
    ['Australia/Sydney', 'Sydney'],
    ['Australia/Melbourne', 'Melbourne'],
    ['Australia/Lord_Howe', 'Lord Howe Island'],
    ['Pacific/Noumea', 'Noum\u00e9a'],
    ['Pacific/Guadalcanal', 'Honiara'],
    ['Pacific/Auckland', 'Auckland'],
    ['Pacific/Fiji', 'Suva, Fiji'],
    ['Pacific/Tarawa', 'South Tarawa'],
    ['Pacific/Chatham', 'Waitangi, Chatham Islands'],
    ['Pacific/Tongatapu', "Nuku\u02bbalofa, Tonga"],
    ['Pacific/Apia', 'Apia'],
    ['Pacific/Kiritimati', 'London, Kiritimati']
  ];

  // Prefer recognizable major cities when several places share an offset.
  var representativeCities = [
    'Tokyo', 'New Delhi', 'Shanghai', 'Jakarta', 'Dhaka', 'Cairo', 'Mexico City',
    'S\u00e3o Paulo', 'New York', 'Karachi', 'Lagos', 'Istanbul', 'Moscow',
    'Buenos Aires', 'Los Angeles', 'Paris', 'Lima', 'Tehran', 'London',
    'Bangkok', 'Bogot\u00e1', 'Dar es Salaam', 'Johannesburg', 'Santiago',
    'Sydney', 'Melbourne', 'Dubai', 'Toronto', 'Abidjan', 'Auckland', 'Praia, Cape Verde'
  ];

  function utcOffset(date, timeZone) {
    var offset = new Intl.DateTimeFormat('en-US', { timeZone: timeZone, timeZoneName: 'longOffset' })
      .formatToParts(date).find(function (p) { return p.type === 'timeZoneName'; }).value;
    var match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    var minutes = match ? (Number(match[2]) * 60 + Number(match[3] || 0)) * (match[1] === '-' ? -1 : 1) : 0;
    return {
      minutes: minutes,
      label: 'UTC' + (minutes < 0 ? '-' : '+') + String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0') +
        ':' + String(Math.abs(minutes) % 60).padStart(2, '0')
    };
  }

  // Time and Date map legend supplied by the user: the six colors repeat by hour.
  var mapColors = ['#fc8d58', '#fde092', '#a8d696', '#7cbdd1', '#ab8ac1', '#ee6464'];
  function timezoneColors(minutes) {
    var hours = minutes / 60;
    function color(hour) { return mapColors[((hour % 6) + 6) % 6]; }
    return { lower: color(Math.floor(hours)), upper: color(Math.ceil(hours)) };
  }

  function programTimezones(start, localZone) {
    var zones = new Map();
    function add(zone, city) {
      try {
        var canonical = new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone;
        if (!zones.has(canonical) || city) {
          zones.set(canonical, city || canonical.split('/').pop().replace(/_/g, ' '));
        }
      } catch (error) { /* Ignore zones not supported by this browser's timezone database. */ }
    }
    cityZones.forEach(function (entry) { add(entry[0], entry[1]); });
    add(localZone);
    var canonicalLocal = new Intl.DateTimeFormat('en-US', { timeZone: localZone }).resolvedOptions().timeZone;
    var choices = Array.from(zones, function (entry) {
      var offset = utcOffset(start, entry[0]);
      var isLocal = entry[0] === canonicalLocal;
      return { value: entry[0], city: entry[1], minutes: offset.minutes, isLocal: isLocal,
        offset: offset.label,
        label: offset.label + ' \u2014 ' + entry[1] + (isLocal ? ' (your timezone)' : '') };
    });
    var byOffset = new Map();
    function priority(city) {
      var rank = representativeCities.indexOf(city);
      return rank < 0 ? representativeCities.length : rank;
    }
    choices.forEach(function (choice) {
      var previous = byOffset.get(choice.minutes);
      if (!previous || choice.isLocal || (!previous.isLocal && priority(choice.city) < priority(previous.city))) {
        byOffset.set(choice.minutes, choice);
      }
    });
    return Array.from(byOffset.values()).sort(function (a, b) {
      return Number(b.isLocal) - Number(a.isLocal) || a.minutes - b.minutes || a.city.localeCompare(b.city);
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { nextProgramSession: nextProgramSession, formatProgramSession: formatProgramSession,
      programTimezones: programTimezones, timezoneColors: timezoneColors };
  }
  if (typeof document === 'undefined') return;

  function renderTimezone(element, zone) {
    element.replaceChildren();
    var prefix = document.createElement('span');
    prefix.className = 'program-utc-prefix';
    prefix.textContent = 'UTC';
    var badge = document.createElement('span');
    badge.className = 'program-utc-badge';
    var number = document.createElement('span');
    number.className = 'program-utc-number';
    number.textContent = zone.offset.slice(3);
    var colors = timezoneColors(zone.minutes);
    number.style.color = colors.lower;
    if (colors.lower !== colors.upper) {
      number.className += ' program-utc-number--fractional';
      number.style.backgroundImage = 'repeating-linear-gradient(135deg, ' + colors.lower + ' 0 2px, ' + colors.upper + ' 2px 4px)';
    }
    badge.appendChild(number);
    var city = document.createElement('span');
    city.className = 'program-timezone-city';
    city.textContent = '\u2014 ' + zone.city + (zone.isLocal ? ' (your timezone)' : '');
    element.append(prefix, badge, city);
  }

  function createTimezoneDropdown(select, picker, zones, onPick) {
    var wrapper = document.createElement('div');
    wrapper.className = 'program-timezone-dropdown';
    var trigger = document.createElement('button');
    trigger.className = 'program-timezone-trigger';
    trigger.type = 'button';
    trigger.id = select.id + '-button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    var menu = document.createElement('div');
    menu.className = 'program-timezone-menu';
    menu.id = select.id + '-menu';
    menu.hidden = true;
    menu.tabIndex = -1;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Choose timezone');
    trigger.setAttribute('aria-controls', menu.id);
    var pickerLabel = picker.querySelector('label');
    if (pickerLabel) pickerLabel.htmlFor = trigger.id;
    var active = 0;
    var options = zones.map(function (zone, index) {
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'program-timezone-option';
      option.id = select.id + '-option-' + index;
      option.tabIndex = -1;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-label', zone.label);
      renderTimezone(option, zone);
      option.addEventListener('click', function () { pick(index); });
      menu.appendChild(option);
      return option;
    });
    wrapper.append(trigger, menu);
    picker.appendChild(wrapper);
    select.hidden = true;

    function refresh() {
      var index = zones.findIndex(function (zone) { return zone.value === select.value; });
      renderTimezone(trigger, zones[index]);
      trigger.setAttribute('aria-label', 'Show times in ' + zones[index].label);
      options.forEach(function (option, i) { option.setAttribute('aria-selected', String(i === index)); });
    }
    function setActive(index) {
      active = Math.max(0, Math.min(zones.length - 1, index));
      options.forEach(function (option, i) { option.classList.toggle('is-active', i === active); });
      menu.setAttribute('aria-activedescendant', options[active].id);
      options[active].scrollIntoView({ block: 'nearest' });
    }
    function open() {
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      setActive(zones.findIndex(function (zone) { return zone.value === select.value; }));
      menu.focus({ preventScroll: true });
    }
    function close(restoreFocus) {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    }
    function pick(index) {
      select.value = zones[index].value;
      refresh();
      close(false);
      onPick();
    }
    trigger.addEventListener('click', function () { if (menu.hidden) open(); else close(true); });
    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(); }
    });
    var search = '', lastSearch = 0;
    menu.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(active + (event.key === 'ArrowDown' ? 1 : -1));
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setActive(event.key === 'Home' ? 0 : zones.length - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); pick(active);
      } else if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); close(true);
      } else if (event.key === 'Tab') {
        close(true);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        var now = Date.now();
        search = (now - lastSearch > 700 ? '' : search) + event.key.toLowerCase();
        lastSearch = now;
        var index = zones.findIndex(function (zone) {
          return zone.city.toLowerCase().startsWith(search) || zone.offset.toLowerCase().startsWith(search) || zone.offset.slice(3).startsWith(search);
        });
        if (index >= 0) setActive(index);
      }
    });
    document.addEventListener('pointerdown', function (event) { if (!wrapper.contains(event.target)) close(false); });
    wrapper.addEventListener('focusout', function (event) { if (!wrapper.contains(event.relatedTarget)) close(false); });
    refresh();
    return { trigger: trigger, close: close, refresh: refresh };
  }

  function initializeSchedule(root) {
    var schedule = root.querySelector('.program-schedule-time');
    if (!schedule) return;
    try {
      var localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
      var select = root.querySelector('select');
      var controls = root.querySelector('.program-timezone');
      var change = controls.querySelector('button');
      var picker = root.querySelector('.program-timezone-picker');
      var label = controls.querySelector('span');
      localZone = new Intl.DateTimeFormat('en-US', { timeZone: localZone }).resolvedOptions().timeZone;
      var start = nextProgramSession(new Date(), root.dataset.programLevel);
      select.replaceChildren();
      var zones = programTimezones(start, localZone);
      zones.forEach(function (zone) {
        var option = document.createElement('option');
        option.value = zone.value;
        option.textContent = zone.label;
        option.dataset.city = zone.city;
        select.appendChild(option);
      });
      select.value = localZone;

      function finishChoice() {
        update();
        picker.hidden = true;
        change.setAttribute('aria-expanded', 'false');
        change.focus();
      }
      var dropdown = createTimezoneDropdown(select, picker, zones, finishChoice);

      function update() {
        var text = formatProgramSession(start, select.value);
        schedule.textContent = text;
        var city = select.selectedOptions[0].dataset.city;
        label.textContent = (select.value === localZone ? 'Your timezone: ' : 'Timezone: ') + city;
        var detail = root.closest('.level-step-card').querySelector('#level1-meeting-time');
        if (detail) {
          detail.replaceChildren();
          var strong = document.createElement('strong');
          strong.textContent = 'When: ';
          detail.append(strong, document.createTextNode(text));
        }
      }

      update();
      controls.hidden = false;
      change.addEventListener('click', function () {
        picker.hidden = !picker.hidden;
        change.setAttribute('aria-expanded', String(!picker.hidden));
        if (!picker.hidden) dropdown.trigger.focus();
        else dropdown.close(false);
      });
      select.addEventListener('change', function () {
        dropdown.refresh();
        finishChoice();
      });
      picker.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault();
          dropdown.close(false);
          picker.hidden = true;
          change.setAttribute('aria-expanded', 'false');
          change.focus();
        }
      });
    } catch (error) {
      // Keep the Chicago schedule readable when timezone conversion is unavailable.
    }
  }
  document.querySelectorAll('.program-schedule[data-program-level]').forEach(initializeSchedule);
}());
