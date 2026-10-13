(function () {
  'use strict';

  // Foundation meets Tuesdays at 8 PM in Chicago, through daylight saving changes.
  function nextFoundationSession(now) {
    var chicago = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', hourCycle: 'h23'
    });
    // Chicago's Tuesday evening can fall on Wednesday in UTC.
    for (var day = -1; day <= 7; day++) {
      var candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, 20));
      var parts = chicago.formatToParts(candidate);
      var weekday = parts.find(function (p) { return p.type === 'weekday'; }).value;
      if (weekday !== 'Tue') continue;
      var hour = Number(parts.find(function (p) { return p.type === 'hour'; }).value);
      candidate.setUTCHours(candidate.getUTCHours() + 20 - hour);
      if (candidate >= now) return candidate;
    }
    throw new Error('No upcoming Foundation session');
  }

  function formatFoundationSession(start, timeZone) {
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

  function foundationTimezones(start, localZone) {
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
    module.exports = { nextFoundationSession: nextFoundationSession, formatFoundationSession: formatFoundationSession,
      foundationTimezones: foundationTimezones };
  }
  if (typeof document === 'undefined') return;

  var schedule = document.getElementById('foundation-time');
  if (!schedule) return;
  try {
    var localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
    var select = document.getElementById('foundation-timezone-select');
    var change = document.getElementById('foundation-timezone-change');
    var picker = document.getElementById('foundation-timezone-picker');
    var label = document.getElementById('foundation-timezone-label');
    localZone = new Intl.DateTimeFormat('en-US', { timeZone: localZone }).resolvedOptions().timeZone;
    var start = nextFoundationSession(new Date());
    select.replaceChildren();
    foundationTimezones(start, localZone).forEach(function (zone) {
      var option = document.createElement('option');
      option.value = zone.value;
      option.textContent = zone.label;
      option.dataset.city = zone.city;
      select.appendChild(option);
    });
    select.value = localZone;

    function update() {
      var text = formatFoundationSession(start, select.value);
      schedule.textContent = text;
      var city = select.selectedOptions[0].dataset.city;
      label.textContent = (select.value === localZone ? 'Your timezone: ' : 'Timezone: ') + city;
      var detail = document.getElementById('level1-meeting-time');
      if (detail) {
        detail.replaceChildren();
        var strong = document.createElement('strong');
        strong.textContent = 'When: ';
        detail.append(strong, document.createTextNode(text));
      }
    }

    update();
    document.getElementById('foundation-timezone-controls').hidden = false;
    change.addEventListener('click', function () {
      picker.hidden = !picker.hidden;
      change.setAttribute('aria-expanded', String(!picker.hidden));
      if (!picker.hidden) select.focus();
    });
    select.addEventListener('change', function () {
      update();
      picker.hidden = true;
      change.setAttribute('aria-expanded', 'false');
      change.focus();
    });
    select.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        picker.hidden = true;
        change.setAttribute('aria-expanded', 'false');
        change.focus();
      }
    });
  } catch (error) {
    // Keep the Chicago schedule readable when timezone conversion is unavailable.
  }
}());
