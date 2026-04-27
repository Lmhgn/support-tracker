'use strict';

let allData = null;
let activeVenue = 'all';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
  showState('loading');
  try {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error('No data');
    allData = await res.json();
    renderDashboard(allData);
  } catch {
    showState('error');
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function renderDashboard(data) {
  showState('content');

  // Demo banner
  const demoBanner = document.getElementById('demoBanner');
  demoBanner.style.display = data.isDemo ? 'flex' : 'none';

  // Stats
  const totalShows = data.venues.reduce((s, v) => s + v.events.length, 0);
  const totalActs = data.venues.reduce(
    (s, v) => s + v.events.reduce((es, e) => es + e.supportActs.length, 0),
    0
  );
  document.getElementById('statVenues').textContent = data.venues.length;
  document.getElementById('statShows').textContent = totalShows;
  document.getElementById('statActs').textContent = totalActs;
  document.getElementById('statUpdated').textContent = formatDate(data.lastUpdated);
  document.getElementById('statsBar').style.display = '';

  // Controls
  document.getElementById('controlsBar').style.display = '';
  buildVenueTabs(data.venues);

  // Venues grid
  const grid = document.getElementById('venuesGrid');
  grid.innerHTML = '';
  data.venues.forEach((venue) => grid.appendChild(buildVenueCard(venue)));
  grid.style.display = '';
}

function buildVenueTabs(venues) {
  const container = document.getElementById('venueTabs');
  container.innerHTML = '';

  const allTab = makeTab('All Venues', 'all');
  allTab.classList.add('active');
  container.appendChild(allTab);

  venues.forEach((v) => {
    container.appendChild(makeTab(shortVenueName(v.name), v.name));
  });
}

function makeTab(label, value) {
  const btn = document.createElement('button');
  btn.className = 'venue-tab';
  btn.textContent = label;
  btn.dataset.venue = value;
  btn.onclick = () => setActiveVenue(value);
  return btn;
}

function setActiveVenue(venue) {
  activeVenue = venue;

  // Update tab state
  document.querySelectorAll('.venue-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.venue === venue);
  });

  // Show/hide venue cards
  document.querySelectorAll('.venue-card').forEach((card) => {
    const match = venue === 'all' || card.dataset.venue === venue;
    card.dataset.hidden = match ? 'false' : 'true';
  });

  filterEvents(); // reapply search within the new tab
}

function buildVenueCard(venue) {
  const card = document.createElement('div');
  card.className = 'venue-card';
  card.dataset.venue = venue.name;
  card.dataset.hidden = 'false';

  // Header
  const showCount = venue.events.length;
  card.innerHTML = `
    <div class="venue-card__header">
      <div>
        <div class="venue-card__name">${esc(venue.name)}</div>
        <a class="venue-card__link" href="${esc(venue.url)}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          View on AMG
        </a>
      </div>
      <span class="venue-card__count">${showCount} show${showCount !== 1 ? 's' : ''}</span>
    </div>
  `;

  if (venue.error) {
    card.insertAdjacentHTML(
      'beforeend',
      `<div class="venue-card__error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Scrape error: ${esc(venue.error)}
      </div>`
    );
    return card;
  }

  if (showCount === 0) {
    card.insertAdjacentHTML(
      'beforeend',
      `<div class="venue-card__empty">No support acts found for upcoming shows.</div>`
    );
    return card;
  }

  const list = document.createElement('ul');
  list.className = 'event-list';
  venue.events.forEach((ev) => list.appendChild(buildEventRow(ev)));
  card.appendChild(list);

  return card;
}

function buildEventRow(event) {
  const li = document.createElement('li');
  li.className = 'event-row';
  li.dataset.hidden = 'false';

  // Store searchable text on the element for fast filtering
  li.dataset.search = [
    event.title,
    ...(event.allArtists || []),
    event.date,
  ]
    .join(' ')
    .toLowerCase();

  const { dayOfWeek, dayNum, month, time } = parseDate(event.date, event.time);

  const headlinerBadges = (event.headliners || [])
    .map((a) => `<span class="badge badge--headliner">${esc(a)}</span>`)
    .join('');

  const supportBadges = (event.supportActs || [])
    .map((a) => `<span class="badge badge--support">${esc(a)}</span>`)
    .join('');

  li.innerHTML = `
    <div class="event-row__date">
      <span class="date-day">${esc(dayOfWeek)}</span>
      <span class="date-num">${esc(dayNum)}</span>
      <span class="date-month">${esc(month)}</span>
      ${time ? `<span class="date-time">${esc(time)}</span>` : ''}
    </div>
    <div class="event-row__details">
      <div class="event-row__title" title="${esc(event.title)}">${esc(event.title)}</div>
      ${
        headlinerBadges
          ? `<div class="artist-row">
               <span class="artist-label">Headliner</span>
               <div class="artist-badges">${headlinerBadges}</div>
             </div>`
          : ''
      }
      <div class="artist-row">
        <span class="artist-label">Support</span>
        <div class="artist-badges">${supportBadges}</div>
      </div>
    </div>
  `;

  return li;
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------
function filterEvents() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();

  document.querySelectorAll('.event-row').forEach((row) => {
    if (!query) {
      row.dataset.hidden = 'false';
      return;
    }
    const match = row.dataset.search.includes(query);
    row.dataset.hidden = match ? 'false' : 'true';
  });

  // Hide venue cards that have no visible rows (only when searching)
  document.querySelectorAll('.venue-card').forEach((card) => {
    if (activeVenue !== 'all' && card.dataset.venue !== activeVenue) return;
    if (!query) {
      card.dataset.hidden = activeVenue === 'all' || card.dataset.venue === activeVenue ? 'false' : 'true';
      return;
    }
    const visibleRows = card.querySelectorAll('.event-row:not([data-hidden="true"])').length;
    card.dataset.hidden = visibleRows === 0 ? 'true' : 'false';
  });
}

// ---------------------------------------------------------------------------
// Refresh (SSE stream from server)
// ---------------------------------------------------------------------------
function refreshData() {
  const btn = document.getElementById('refreshBtn');
  btn.disabled = true;
  btn.textContent = 'Scraping…';

  const drawer = document.getElementById('logDrawer');
  const logBody = document.getElementById('logBody');
  drawer.style.display = 'flex';
  logBody.textContent = '';

  const es = new EventSource('/api/refresh');

  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.log) {
      logBody.textContent += msg.log + '\n';
      logBody.scrollTop = logBody.scrollHeight;
    }
    if (msg.done) {
      es.close();
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        Refresh Data`;
      if (msg.code === 0) {
        logBody.textContent += '\nDone! Reloading data…';
        setTimeout(loadData, 1000);
      }
    }
  };

  es.onerror = () => {
    es.close();
    btn.disabled = false;
    btn.textContent = 'Refresh Data';
  };
}

function closeLog() {
  document.getElementById('logDrawer').style.display = 'none';
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function showState(state) {
  document.getElementById('loadingState').style.display = state === 'loading' ? 'flex' : 'none';
  document.getElementById('errorState').style.display = state === 'error' ? 'flex' : 'none';
  document.getElementById('venuesGrid').style.display = state === 'content' ? '' : 'none';
}

function parseDate(dateStr, timeStr) {
  // Handles formats: "SAT 02 MAY", "Sat 02 May 2025", "SAT\n02\nMAY\n19:00"
  if (!dateStr) return { dayOfWeek: '', dayNum: '?', month: '', time: timeStr || '' };

  const clean = dateStr.replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ').filter(Boolean);

  // Try to identify day-of-week (3 letters), day number (1-2 digits), month (3+ letters)
  const dayOfWeekMatch = parts.find((p) => /^(MON|TUE|WED|THU|FRI|SAT|SUN)$/i.test(p)) || '';
  const dayNumMatch = parts.find((p) => /^\d{1,2}$/.test(p)) || '?';
  const monthMatch =
    parts.find((p) => /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i.test(p)) || '';
  const embeddedTime = parts.find((p) => /^\d{2}:\d{2}$/.test(p));

  return {
    dayOfWeek: dayOfWeekMatch.toUpperCase().slice(0, 3),
    dayNum: dayNumMatch,
    month: monthMatch.toUpperCase().slice(0, 3),
    time: timeStr || embeddedTime || '',
  };
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function shortVenueName(name) {
  return name
    .replace("O2 Academy ", '')
    .replace("O2 Forum ", 'Forum ')
    .replace("O2 Shepherd's Bush Empire", "Shep's Bush");
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
