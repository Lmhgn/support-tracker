/* ============================================================
   AMG Support Acts Scraper
   Loaded by bookmarklet from GitHub Pages.
   Runs in the context of an academymusicgroup.com page.
   ============================================================ */
(async function () {

  if (window.__AMG_SCRAPER_RUNNING__) {
    alert('Support Tracker is already running in this tab.');
    return;
  }
  window.__AMG_SCRAPER_RUNNING__ = true;

  /* -- Progress bar -- */
  var ui = document.createElement('div');
  ui.id = '__amg_st_ui';
  ui.style.cssText = [
    'position:fixed;top:0;left:0;right:0;z-index:2147483647',
    'background:#0e0e1a;color:#e5e7eb',
    'padding:12px 24px;font:600 13px/1.5 sans-serif',
    'box-shadow:0 2px 16px rgba(0,0,0,.6)',
    'display:flex;align-items:center;gap:16px'
  ].join(';');

  var uiText = document.createElement('span');
  uiText.style.flex = '1';
  ui.appendChild(uiText);

  var barWrap = document.createElement('div');
  barWrap.style.cssText = 'width:200px;height:5px;background:rgba(255,255,255,.15);border-radius:3px;overflow:hidden;flex-shrink:0';
  var barFill = document.createElement('div');
  barFill.style.cssText = 'height:100%;width:0;background:#60a5fa;border-radius:3px;transition:width .4s';
  barWrap.appendChild(barFill);
  ui.appendChild(barWrap);
  document.body.appendChild(ui);

  function sp(msg, pct) {
    uiText.textContent = '♫ Support Tracker — ' + msg;
    barFill.style.width = (pct || 0) + '%';
  }

  function cleanup() {
    window.__AMG_SCRAPER_RUNNING__ = false;
    if (ui.parentNode) ui.parentNode.removeChild(ui);
  }

  /* -- Venue list -- */
  var VENUES = [
    { slug: 'o2academybrixton',       name: 'O2 Academy Brixton' },
    { slug: 'o2academyislington',     name: 'O2 Academy Islington' },
    { slug: 'o2forumkentishtown',     name: 'O2 Forum Kentish Town' },
    { slug: 'o2shepherdsbushempire',  name: "O2 Shepherd's Bush Empire" },
    { slug: 'o2apollomanchester',     name: 'O2 Apollo Manchester' },
    { slug: 'o2academyleeds',         name: 'O2 Academy Leeds' },
    { slug: 'o2academybirmingham',    name: 'O2 Academy Birmingham' },
    { slug: 'o2institutebirmingham',  name: 'O2 Institute Birmingham' },
    { slug: 'o2academyliverpool',     name: 'O2 Academy Liverpool' },
    { slug: 'o2academynewcastle',     name: 'O2 Academy Newcastle' },
    { slug: 'o2cityhallnewcastle',    name: 'O2 City Hall Newcastle' },
    { slug: 'o2academyglasgow',       name: 'O2 Academy Glasgow' },
    { slug: 'o2abcglasgow',           name: 'O2 ABC Glasgow' },
    { slug: 'o2academyoxford',        name: 'O2 Academy Oxford' },
    { slug: 'o2academysheffield',     name: 'O2 Academy Sheffield' },
    { slug: 'o2academybristol',       name: 'O2 Academy Bristol' },
    { slug: 'o2guildhallsouthampton', name: 'O2 Guildhall Southampton' },
    { slug: 'o2victoriawarehouse',    name: 'O2 Victoria Warehouse Manchester' },
    { slug: 'o2academyedinburgh',     name: 'O2 Academy Edinburgh' },
    { slug: 'o2academyleicester',     name: 'O2 Academy Leicester' },
    { slug: 'o2pyramidportsmouth',    name: 'O2 Pyramid Portsmouth' }
  ];

  /* -- Helpers -- */
  function dedupe(arr) {
    var seen = {};
    return arr.filter(function (e) {
      if (seen[e.title]) return false;
      seen[e.title] = true;
      return true;
    });
  }

  function parseSups(title, artists) {
    var tL = title.toLowerCase();
    var heads = artists.filter(function (a) { return tL.indexOf(a.toLowerCase()) !== -1; });
    var sups  = artists.filter(function (a) { return tL.indexOf(a.toLowerCase()) === -1; });
    return {
      headliners:  heads.length ? heads : [artists[0]],
      supportActs: sups.length  ? sups  : artists.slice(1)
    };
  }

  function dateFromISO(iso) {
    try {
      var d = new Date(iso);
      var DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
      var MONS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONS[d.getMonth()];
    } catch (e) { return ''; }
  }

  /* -- Method 1: JSON-LD -- */
  function fromJsonLd(doc) {
    var events = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
      try {
        var data = JSON.parse(s.textContent);
        (Array.isArray(data) ? data : [data]).forEach(function (item) {
          if (!item || !(item['@type'] || '').match(/Event/i)) return;
          var title = item.name || '';
          if (!title) return;
          var perfs = [];
          if (item.performer) {
            var pa = Array.isArray(item.performer) ? item.performer : [item.performer];
            perfs = pa.map(function (p) { return p.name || p; }).filter(Boolean);
          }
          if (perfs.length < 2) return;
          var r = parseSups(title, perfs);
          if (!r.supportActs.length) return;
          var date = item.startDate ? dateFromISO(item.startDate) : '';
          var time = item.startDate && item.startDate.length > 10 ? item.startDate.slice(11, 16) : '';
          events.push({ title: title, date: date, time: time, allArtists: perfs, headliners: r.headliners, supportActs: r.supportActs });
        });
      } catch (e) {}
    });
    return events;
  }

  /* -- Method 2: __NEXT_DATA__ / embedded JSON -- */
  function searchData(obj, depth) {
    if (!obj || depth > 8) return [];
    if (Array.isArray(obj)) {
      if (obj.length > 0 && obj[0] && typeof obj[0] === 'object') {
        var keys = Object.keys(obj[0]).join(' ').toLowerCase();
        if (keys.match(/title|name/) && keys.match(/artist|support|perform|lineup|act/)) {
          return obj.map(function (item) {
            var title = item.title || item.name || item.eventName || item.eventTitle || '';
            if (!title) return null;
            var artists = [];
            ['artists','lineup','performers','acts','supportActs','support','artistNames'].forEach(function (f) {
              if (artists.length || !item[f]) return;
              var v = item[f];
              if (Array.isArray(v)) artists = v.map(function (a) { return typeof a === 'string' ? a : (a.name || a.artistName || ''); }).filter(Boolean);
              else if (typeof v === 'string') artists = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            });
            if (artists.length < 2) return null;
            var r = parseSups(title, artists);
            if (!r.supportActs.length) return null;
            var date = '', time = '';
            ['date','startDate','eventDate','dateTime','startsAt'].forEach(function (f) {
              if (date || !item[f]) return;
              date = dateFromISO(item[f]);
              time = String(item[f]).slice(11, 16);
            });
            return { title: title, date: date, time: time, allArtists: artists, headliners: r.headliners, supportActs: r.supportActs };
          }).filter(Boolean);
        }
      }
      var res = [];
      obj.forEach(function (v) { res = res.concat(searchData(v, depth + 1)); });
      return res;
    }
    if (typeof obj === 'object') {
      var res = [];
      Object.values(obj).forEach(function (v) { res = res.concat(searchData(v, depth + 1)); });
      return res;
    }
    return [];
  }

  function fromNextData(doc) {
    var el = doc.querySelector('#__NEXT_DATA__');
    if (!el) return [];
    try { return searchData(JSON.parse(el.textContent), 0); } catch (e) { return []; }
  }

  /* -- Method 3: DOM -- */
  function fromDOM(doc) {
    var SELS = [
      '.whats-on__item', '.event-listing__item', '.event-item', '.events-list__item',
      '[class*="EventCard"]', '[class*="event-card"]', '[class*="EventItem"]', '[class*="event-item"]',
      '[class*="EventRow"]', '[class*="ListingCard"]', '[class*="listing-card"]', '[class*="EventListing"]',
      'article', '[role="listitem"]'
    ];
    var items = [];
    for (var i = 0; i < SELS.length; i++) {
      var found = Array.from(doc.querySelectorAll(SELS[i])).filter(function (el) {
        return el.querySelector('h1,h2,h3,h4,h5');
      });
      if (found.length > 1) { items = found; break; }
    }
    if (!items.length) {
      items = Array.from(doc.querySelectorAll('li,div')).filter(function (el) {
        return el.querySelector('h2,h3,h4,h5') && el.querySelectorAll('p,span').length > 1;
      }).slice(0, 100);
    }

    var events = [];
    var seen = {};
    items.forEach(function (item) {
      var tEl = item.querySelector('h1,h2,h3,h4,h5,[class*="title"],[class*="Title"],[class*="name"],[class*="Name"]');
      if (!tEl) return;
      var title = tEl.textContent.trim();
      if (!title || title.length < 3 || title.length > 200 || seen[title]) return;

      var dEl = item.querySelector('[class*="date"],[class*="Date"],time,[class*="when"]');
      var date = dEl ? dEl.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
      var tEl2 = item.querySelector('[class*="time"],[class*="Time"]');
      var time = tEl2 ? tEl2.textContent.trim().replace(/\s+/g, ' ').slice(0, 10) : '';

      var artistText = '';
      var aEl = item.querySelector(
        '[class*="artist"],[class*="Artist"],[class*="support"],[class*="Support"],' +
        '[class*="performer"],[class*="lineup"],[class*="acts"],[class*="subtitle"],[class*="Subtitle"]'
      );
      if (aEl) {
        var t = aEl.textContent.trim();
        if (t && t !== title && t.indexOf('|') === -1 && t.length > 2 && t.length < 300) artistText = t;
      }
      if (!artistText) {
        var els = Array.from(item.querySelectorAll('p,span,div'));
        for (var k = 0; k < els.length; k++) {
          if (els[k].querySelector('*')) continue;
          var t2 = els[k].textContent.trim();
          if (t2.indexOf(',') !== -1 && t2 !== title && t2.indexOf('|') === -1 && t2.length > 3 && t2.length < 200) {
            artistText = t2; break;
          }
        }
      }
      if (!artistText) return;

      var artists = artistText.split(',').map(function (a) { return a.trim(); }).filter(Boolean);
      if (artists.length < 2) return;
      var r = parseSups(title, artists);
      if (!r.supportActs.length) return;
      seen[title] = true;
      events.push({ title: title, date: date, time: time, allArtists: artists, headliners: r.headliners, supportActs: r.supportActs });
    });
    return events;
  }

  /* -- Combined with diagnostics -- */
  function extractEvents(doc, label) {
    var ld = fromJsonLd(doc);
    if (ld.length) { console.log('[SupportTracker]', label, 'JSON-LD:', ld.length); return dedupe(ld); }
    var nd = fromNextData(doc);
    if (nd.length) { console.log('[SupportTracker]', label, '__NEXT_DATA__:', nd.length); return dedupe(nd); }
    var dom = fromDOM(doc);
    console.log('[SupportTracker]', label,
      'DOM:', dom.length,
      '| NEXT_DATA present:', !!doc.querySelector('#__NEXT_DATA__'),
      '| title:', doc.title,
      '| snippet:', (doc.body ? doc.body.innerText.slice(0, 150).replace(/\s+/g, ' ') : 'none')
    );
    return dedupe(dom);
  }

  function getNextUrl(doc, cur) {
    var el = doc.querySelector('a[rel="next"], .pagination__next a, .next a, a.next, [class*="pagination"] a:last-child');
    if (!el || !el.href) return null;
    try { var u = new URL(el.href, cur); return u.href === cur ? null : u.href; } catch (e) { return null; }
  }

  /* -- Scrape one venue -- */
  async function scrapeVenue(venue, idx) {
    var url = 'https://www.academymusicgroup.com/' + venue.slug + '/events';
    var all = [];
    var pages = 0;
    while (url && pages < 25) {
      pages++;
      sp('Crawling ' + venue.name + ' (' + idx + '/' + VENUES.length + ') — page ' + pages, Math.round((idx - 1) / VENUES.length * 100));
      try {
        var res = await fetch(url, { credentials: 'include' });
        if (!res.ok) { console.log('[SupportTracker]', venue.slug, 'HTTP', res.status); break; }
        var html = await res.text();
        var doc = new DOMParser().parseFromString(html, 'text/html');
        all = all.concat(extractEvents(doc, venue.slug + ' p' + pages));
        url = getNextUrl(doc, url);
        if (url) await new Promise(function (r) { setTimeout(r, 400); });
      } catch (e) { console.log('[SupportTracker]', venue.slug, 'error:', e.message); break; }
    }
    return all;
  }

  /* -- Main loop -- */
  sp('Starting — crawling ' + VENUES.length + ' venues…', 0);
  var results = [];

  for (var i = 0; i < VENUES.length; i++) {
    var venue = VENUES[i];
    var events = await scrapeVenue(venue, i + 1);
    if (events.length) {
      results.push({
        slug: venue.slug,
        venue: venue.name,
        url: 'https://www.academymusicgroup.com/' + venue.slug + '/events',
        events: events,
        scraped: new Date().toISOString()
      });
    }
  }

  cleanup();

  if (!results.length) {
    alert(
      'Support Tracker: No results found.\n\n' +
      'Open DevTools (F12) → Console and look for [SupportTracker] lines.\n' +
      'These show exactly what each venue page returned.'
    );
    return;
  }

  var total = results.reduce(function (s, v) { return s + v.events.length; }, 0);
  var payload = { venues: results, scraped: new Date().toISOString() };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'amg-support-acts-all.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);

  alert('✓ Done! ' + total + ' shows with support acts across ' + results.length + ' venues.\nFile downloaded — drop it onto the Support Acts Dashboard.');
})();
