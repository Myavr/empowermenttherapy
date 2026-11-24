(function () {
  'use strict';

  const hourMs = 3600000;
  const dayMs = 24 * hourMs;
  const zones = [
    ['America/Los_Angeles', 'Pacific US'], ['America/Denver', 'Mountain US'],
    ['America/Chicago', 'Central US (Chicago)'], ['America/New_York', 'Eastern US'],
    ['America/Halifax', 'Atlantic Canada'], ['America/Bogota', 'Colombia'],
    ['America/Argentina/Buenos_Aires', 'Argentina'], ['America/Sao_Paulo', 'Brazil (São Paulo)'],
    ['Atlantic/Cape_Verde', 'Cape Verde'], ['UTC', 'UTC'], ['Europe/London', 'United Kingdom'],
    ['Europe/Berlin', 'Central Europe (Berlin)'], ['Europe/Athens', 'Eastern Europe (Athens)'],
    ['Africa/Nairobi', 'East Africa'], ['Asia/Dubai', 'Gulf (Dubai)'], ['Asia/Karachi', 'Pakistan'],
    ['Asia/Kolkata', 'India'], ['Asia/Dhaka', 'Bangladesh'], ['Asia/Shanghai', 'China'],
    ['Asia/Singapore', 'Singapore'], ['Asia/Tokyo', 'Japan'], ['Asia/Seoul', 'South Korea'],
    ['Australia/Sydney', 'Eastern Australia (Sydney)'], ['Pacific/Auckland', 'New Zealand']
  ];

  function timeLabel(hour) {
    return (hour % 12 || 12) + ':00 ' + (hour < 12 ? 'AM' : 'PM');
  }

  function registrationDays(now, timeZone) {
    const clock = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    // Represent a local calendar reading on a UTC scale for wall-clock arithmetic.
    function wallTime(instant) {
      const fields = {};
      for (const { type, value } of clock.formatToParts(instant)) fields[type] = value;
      return Date.UTC(+fields.year, fields.month - 1, +fields.day, +fields.hour, +fields.minute);
    }
    const start = Math.floor(wallTime(now) / dayMs) * dayMs;
    const offsets = new Set();
    // Sample both sides of any clock change in the displayed week.
    for (let day = -1; day <= 8; day++) {
      const sample = start + day * dayMs;
      offsets.add(wallTime(sample) - sample);
    }
    const days = [];
    for (let i = 0; i < 7; i++) {
      const midnight = start + i * dayMs;
      const date = new Date(midnight);
      const weekday = date.getUTCDay();
      const hours = [];
      for (let hour = 0; hour < 24; hour++) {
        const wall = midnight + hour * hourMs;
        const matches = Array.from(offsets, offset => wall - offset)
          .filter(instant => wallTime(instant) === wall).sort((a, b) => a - b);
        hours.push(matches);
      }
      days.push({ label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][weekday],
        date: (date.getUTCMonth() + 1) + '/' + date.getUTCDate(), weekend: weekday === 0 || weekday === 6, hours });
    }
    return days.sort((a, b) => Number(a.weekend) - Number(b.weekend));
  }

  function formatAvailability(instants, timeZone) {
    const ordered = Array.from(instants).sort((a, b) => a - b);
    if (!ordered.length) return 'No specific times selected — please reach out to coordinate.';
    const day = new Intl.DateTimeFormat('en-US', { timeZone, month: 'numeric', day: 'numeric' });
    const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
    const zoned = new Intl.DateTimeFormat('en-US', {
      timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
    const days = new Map();
    const zoneAt = instant => zoned.formatToParts(instant).find(p => p.type === 'timeZoneName').value;
    for (const instant of ordered) {
      const date = day.format(instant);
      if (!days.has(date)) days.set(date, []);
      days.get(date).push(instant);
    }
    return Array.from(days, ([date, times]) => {
      const ranges = [];
      for (let i = 0; i < times.length; i++) {
        const first = times[i];
        // Include the zone on transition days, and keep ranges on each side separate.
        const transition = zoneAt(first - dayMs) !== zoneAt(first + dayMs);
        const format = transition ? zoned : time;
        while (times[i + 1] - times[i] === hourMs &&
          (!transition || zoneAt(times[i + 1]) === zoneAt(first))) i++;
        let label = format.format(first);
        if (first !== times[i]) label += ' – ' + format.format(times[i]);
        ranges.push(label);
      }
      return date + ': ' + ranges.join(', ');
    }).join(' | ');
  }

  function appendAvailability(data, selected) {
    data.append('Availability (Central Time, Chicago)', formatAvailability(selected, 'America/Chicago'));
    data.append('Availability (India Standard Time, IST)', formatAvailability(selected, 'Asia/Kolkata'));
    data.append('Availability (Colombia Time, COT)', formatAvailability(selected, 'America/Bogota'));
  }

  async function sendRegistration(data, request = fetch) {
    const response = await request('https://formsubmit.co/ajax/empowermenttherapyinstitute@gmail.com', {
      method: 'POST', body: data
    });
    if (!response.ok) throw new Error('Request rejected');
    const result = await response.json();
    if (result.success !== true && result.success !== 'true') throw new Error('Submission rejected');
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { registrationDays, appendAvailability, sendRegistration };
    return;
  }

  const form = document.getElementById('regForm');
  const modal = document.getElementById('regModal');
  const dialog = modal.querySelector('.reg-modal');
  dialog.querySelector('h2').id = 'registration-title';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'registration-title');
  const nameField = document.getElementById('regName');
  const timezone = document.getElementById('regTimezone');
  const grid = document.getElementById('regAvailGrid');
  const mobile = document.createElement('div');
  mobile.className = 'reg-avail-mobile';
  grid.after(mobile);
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  mobile.after(status);
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  timezone.add(new Option(detected.replace(/_/g, ' ') + ' (your time zone)', detected, true, true));
  for (const [zone, label] of zones) {
    if (zone === detected) timezone.selectedOptions[0].text = label + ' (your time zone)';
    else timezone.add(new Option(label, zone));
  }

  const selected = new Set();
  let trigger;
  let submitted = false;

  function synchronize(instant, pressed) {
    if (pressed) selected.add(instant);
    else selected.delete(instant);
    for (const button of form.querySelectorAll('[data-slot="' + instant + '"]')) {
      button.classList.toggle('selected', pressed);
      button.setAttribute('aria-pressed', String(pressed));
      const card = button.closest('.reg-avail-day-card');
      if (card) {
        const badge = card.querySelector('.day-count');
        const count = card.querySelectorAll('.selected').length;
        badge.hidden = !count;
        badge.textContent = count;
      }
    }
  }

  function renderAvailability(now) {
    const days = registrationDays(now, timezone.value || detected);
    const detailedTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone.value || detected, hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
    grid.replaceChildren();
    mobile.replaceChildren();
    function element(tag, className, parent, text) {
      const el = document.createElement(tag);
      el.className = className;
      if (text !== undefined) el.textContent = text;
      parent.appendChild(el);
      return el;
    }
    const header = element('div', 'reg-avail-header', grid);
    element('div', 'reg-avail-corner', header);
    const rows = Array.from({ length: 24 }, (_, hour) => {
      const row = element('div', 'reg-avail-row', grid);
      element('div', 'reg-avail-time-label', row, timeLabel(hour));
      return row;
    });
    for (const day of days) {
      const title = day.label + ' ' + day.date;
      const dayHeading = element('div', 'reg-avail-day-label', header, day.label);
      dayHeading.appendChild(document.createElement('br'));
      element('span', '', dayHeading, day.date);
      const card = element('div', 'reg-avail-day-card', mobile);
      const toggle = element('button', 'reg-avail-day-header', card);
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      const heading = element('span', '', toggle, title + ' ');
      const count = element('span', 'day-count', heading);
      count.hidden = true;
      element('span', 'day-toggle', toggle, '▼').setAttribute('aria-hidden', 'true');
      toggle.onclick = () => toggle.setAttribute('aria-expanded', String(card.classList.toggle('open')));
      const pills = element('div', 'reg-avail-day-slots', card);
      day.hours.forEach((matches, hour) => {
        const cell = element('div', 'reg-slot-group', rows[hour]);
        for (const instant of matches) {
          const repeated = matches.length > 1;
          const label = repeated ? detailedTime.format(instant) : timeLabel(hour);
          const desktop = element('button', 'reg-avail-cell', cell, repeated ? label : '');
          const pill = element('button', 'reg-avail-time-pill', pills, label);
          for (const button of [desktop, pill]) {
            button.type = 'button';
            button.dataset.slot = instant;
            button.dataset.day = day.date;
            button.disabled = instant <= now;
            button.setAttribute('aria-label', title + ' at ' + label);
            button.setAttribute('aria-pressed', 'false');
          }
          if (selected.has(instant)) synchronize(instant, true);
        }
      });
    }
  }

  // Click covers taps and native keyboard activation. Dragging paints one day.
  let drag;
  grid.addEventListener('pointerdown', event => {
    const button = event.target.closest('button[data-slot]:enabled');
    if (!button || event.button !== 0) return;
    drag = { first: button, day: button.dataset.day, pressed: !selected.has(+button.dataset.slot), moved: false };
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  });
  grid.addEventListener('pointermove', event => {
    if (!drag) return;
    const button = document.elementFromPoint(event.clientX, event.clientY)?.closest('button[data-slot]:enabled');
    if (!button || button.dataset.day !== drag.day || button === drag.first && !drag.moved) return;
    drag.moved = true;
    synchronize(+drag.first.dataset.slot, drag.pressed);
    synchronize(+button.dataset.slot, drag.pressed);
  });
  let dragged = false;
  document.addEventListener('pointerup', () => {
    dragged = Boolean(drag && drag.moved);
    drag = null;
  });
  document.addEventListener('pointercancel', () => { drag = null; });
  form.addEventListener('click', event => {
    const button = event.target.closest('button[data-slot]');
    if (button && !button.disabled && !(dragged && event.detail)) {
      synchronize(+button.dataset.slot, !selected.has(+button.dataset.slot));
    }
    dragged = false;
  });

  function refresh(onSubmit = false) {
    const now = Date.now();
    const previous = selected.size;
    for (const instant of selected) if (instant <= now) selected.delete(instant);
    if (!onSubmit || previous !== selected.size) renderAvailability(now);
    if (previous !== selected.size) {
      status.textContent = 'Some selected times have passed. Please review your availability.';
      return false;
    }
    return true;
  }
  timezone.addEventListener('change', () => {
    status.textContent = selected.size ? 'Time zone changed. Please choose your available times again.' : '';
    selected.clear();
    refresh();
  });
  window.openRegModal = function (event) {
    if (event) event.preventDefault();
    trigger = document.activeElement;
    if (!submitted) refresh();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    (submitted ? document.getElementById('regModalClose') : nameField).focus();
  };
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (trigger) trigger.focus();
  }
  document.getElementById('regModalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('active')) return;
    if (event.key === 'Escape') closeModal();
    if (event.key !== 'Tab') return;
    const controls = Array.from(modal.querySelectorAll('button:enabled, input, select, textarea'))
      .filter(control => control.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });
  function openLinkedRegistration() {
    if (window.location.hash === '#register') window.openRegModal();
  }
  window.addEventListener('hashchange', openLinkedRegistration);
  openLinkedRegistration();
  nameField.addEventListener('input', () => nameField.setCustomValidity(''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('.reg-submit');
    if (!submit || submit.disabled) return;
    const name = nameField.value.trim();
    if (!name) {
      nameField.setCustomValidity('Please enter your full name.');
      nameField.reportValidity();
      return;
    }
    if (!refresh(true)) return;
    submit.disabled = true;
    submit.textContent = 'Submitting...';
    status.textContent = '';
    const data = new FormData();
    data.append('Name', name);
    data.append('Email', form.elements.email.value.trim());
    data.append('Timezone', timezone.selectedOptions[0].text + ' (' + timezone.value + ')');
    data.append('Program Interest', form.elements.program.value || 'Not specified');
    appendAvailability(data, selected);
    const notes = form.elements.message.value.trim();
    if (notes) data.append('Additional Notes', notes);
    data.append('_subject', 'Registration Request: ' + name);
    data.append('_cc', 'pritimdi@gmail.com,empowermenttherapymw@gmail.com,info@comunicacionplena.com');
    data.append('_template', 'table');
    data.append('_captcha', 'false');
    try {
      await sendRegistration(data);
      submitted = true;
      form.innerHTML = '<div class="reg-success" role="status"><div class="reg-success-icon">✓</div><h3>Registration Submitted!</h3><p></p></div>';
      form.querySelector('p').textContent = 'Thank you, ' + name + '. We\'ve received your registration and will be in touch to confirm your orientation session.';
    } catch {
      submit.disabled = false;
      submit.textContent = 'Submit Registration';
      status.textContent = 'We couldn’t confirm your submission. Please try again, or email empowermenttherapyinstitute@gmail.com.';
    }
  });
})();
