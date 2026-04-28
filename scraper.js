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
    // London
    { slug: 'o2academybrixton',              name: 'O2 Academy Brixton' },
    { slug: 'o2academyislington',            name: 'O2 Academy Islington' },
    { slug: 'o2forumkentishtown',            name: 'O2 Forum Kentish Town' },
    { slug: 'o2shepherdsbushempire',         name: "O2 Shepherd's Bush Empire" },
    // Midlands
    { slug: 'o2academybirmingham',           name: 'O2 Academy Birmingham' },
    { slug: 'o2institutebirmingham',         name: 'O2 Institute Birmingham' },
    { slug: 'o2academyleicester',            name: 'O2 Academy Leicester' },
    { slug: 'o2academyoxford',               name: 'O2 Academy Oxford' },
    // South
    { slug: 'o2academybournemouth',          name: 'O2 Academy Bournemouth' },
    { slug: 'o2academybristol',              name: 'O2 Academy Bristol' },
    { slug: 'o2guildhallsouthampton',        name: 'O2 Guildhall Southampton' },
    // North West
    { slug: 'o2academyliverpool',            name: 'O2 Academy Liverpool' },
    { slug: 'o2ritzmanchester',              name: 'O2 Ritz Manchester' },
    { slug: 'o2victoriawarehousemanchester', name: 'O2 Victoria Warehouse Manchester' },
    { slug: 'o2apollomanchester',            name: 'O2 Apollo Manchester' },
    // Yorkshire
    { slug: 'o2academyleeds',                name: 'O2 Academy Leeds' },
    { slug: 'o2academysheffield',            name: 'O2 Academy Sheffield' },
    // North East
    { slug: 'o2cityhallnewcastle',           name: 'O2 City Hall Newcastle' },
    // Scotland
    { slug: 'o2academyglasgow',              name: 'O2 Academy Glasgow' },
    { slug: 'edinburghcornexchange',         name: 'Edinburgh Corn Exchange',
      baseUrl: 'https://www.edinburghcornexchange.co.uk/whats-on', htmlOnly: true }
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
    // True if element lives inside a hero / banner / popup / cookie overlay
    function inBanner(el) {
      var node = el.parentElement;
      while (node && node !== doc.body) {
        var combined = ((node.className || '') + ' ' + (node.id || '')).toLowerCase();
        if (/\b(hero|banner|featured|promo|carousel|slider|spotlight|masthead|highlight|marquee|modal|popup|overlay|cookie|consent|newsletter|gdpr|onetrust|dialog|lightbox|drawer)\b/.test(combined)) return true;
        node = node.parentElement;
      }
      return false;
    }

    var SELS = [
      '.whats-on__item', '.event-listing__item', '.event-item', '.events-list__item',
      '[class*="EventCard"]', '[class*="event-card"]', '[class*="EventItem"]', '[class*="event-item"]',
      '[class*="EventRow"]', '[class*="ListingCard"]', '[class*="listing-card"]', '[class*="EventListing"]',
      'article', '[role="listitem"]'
    ];

    // Pick the selector yielding the MOST items outside banner sections
    var items = [];
    var usedSel = 'none';
    for (var i = 0; i < SELS.length; i++) {
      var found = Array.from(doc.querySelectorAll(SELS[i])).filter(function (el) {
        return el.querySelector('h1,h2,h3,h4,h5') && !inBanner(el);
      });
      if (found.length > items.length) { items = found; usedSel = SELS[i]; }
    }

    if (!items.length) {
      items = Array.from(doc.querySelectorAll('li,div')).filter(function (el) {
        return el.querySelector('h2,h3,h4,h5') && el.querySelectorAll('p,span').length > 1 && !inBanner(el);
      }).slice(0, 100);
      if (items.length) usedSel = 'fallback li/div';
    }

    console.log('[SupportTracker] DOM selector:', usedSel, '| count:', items.length,
      '| sample:', items.slice(0, 2).map(function (el) { return (el.className || el.tagName).toString().slice(0, 60); }).join(' || '));

    var events = [];
    var seen = {};
    items.forEach(function (item) {
      var tEl = item.querySelector('h1,h2,h3,h4,h5,[class*="title"],[class*="Title"],[class*="name"],[class*="Name"]');
      if (!tEl) return;
      var title = tEl.textContent.trim();
      if (!title || title.length < 3 || title.length > 200 || seen[title]) return;
      // Skip cookie consent, newsletter and other page-furniture false positives
      if (/privacy|cookie|gdpr|consent|newsletter|sign up|exclusive update|never miss|advertising and content|audience research|personalised/i.test(title)) return;

      var dEl = item.querySelector('[class*="date"],[class*="Date"],time,[class*="when"]');
      var date = dEl ? dEl.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
      var tEl2 = item.querySelector('[class*="time"],[class*="Time"]');
      var time = tEl2 ? tEl2.textContent.trim().replace(/\s+/g, ' ').slice(0, 10) : '';

      var artistText = '';
      var aEl = item.querySelector(
        '[class*="artist"],[class*="Artist"],[class*="support"],[class*="Support"],' +
        '[class*="performer"],[class*="lineup"],[class*="acts"],[class*="subtitle"],[class*="Subtitle"]'
      );
      var JUNK = /privacy|cookie|gdpr|consent|newsletter|sign up|exclusive update|never miss|advertising and content|audience research|personalised/i;
      if (aEl) {
        var t = aEl.textContent.trim();
        if (t && t !== title && !JUNK.test(t) && t.indexOf('|') === -1 && t.length > 2 && t.length < 300) artistText = t;
      }
      if (!artistText) {
        var els = Array.from(item.querySelectorAll('p,span,div'));
        for (var k = 0; k < els.length; k++) {
          if (els[k].querySelector('*')) continue;
          var t2 = els[k].textContent.trim();
          if (t2.indexOf(',') !== -1 && t2 !== title && !JUNK.test(t2) && t2.indexOf('|') === -1 && t2.length > 3 && t2.length < 200) {
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
  var JUNK_RE = /privacy|cookie|gdpr|consent|newsletter|sign up|exclusive update|never miss|advertising and content|audience research|personalised|partners can use|services development|^what'?s on$/i;
  function cleanEvents(arr) {
    return dedupe(arr.filter(function (e) {
      if (JUNK_RE.test(e.title)) return false;
      var artists = (e.allArtists || []).join(' ');
      if (JUNK_RE.test(artists)) return false;
      return true;
    }));
  }

  function extractEvents(doc, label) {
    var ld = fromJsonLd(doc);
    if (ld.length) { console.log('[SupportTracker]', label, 'JSON-LD:', ld.length); return cleanEvents(ld); }
    var nd = fromNextData(doc);
    if (nd.length) { console.log('[SupportTracker]', label, '__NEXT_DATA__:', nd.length); return cleanEvents(nd); }
    var dom = fromDOM(doc);
    console.log('[SupportTracker]', label,
      'DOM result:', dom.length,
      '| title:', doc.title,
      '| snippet:', (doc.body ? doc.body.innerText.slice(0, 200).replace(/\s+/g, ' ') : 'none')
    );
    return cleanEvents(dom);
  }

  /* -- Build a paginated URL using AMG's ?Page=N convention -- */
  function pageUrl(base, page) {
    if (page === 1) return base;
    if (/[?&]Page=\d+/i.test(base)) return base.replace(/([?&]Page=)\d+/i, '$1' + page);
    return base + (base.includes('?') ? '&' : '?') + 'Page=' + page;
  }

  /* -- Load a URL in a hidden same-origin iframe and wait for React to render -- */
  function scrapeInIframe(url, label) {
    return new Promise(function (resolve) {
      var iframe = document.createElement('iframe');
      // Give the iframe a real viewport size so lazy-loading works, but keep it off-screen
      iframe.style.cssText = 'position:fixed;top:0;left:-1400px;width:1280px;height:900px;opacity:0;pointer-events:none;z-index:-1';
      document.body.appendChild(iframe);

      var resolved = false;
      function done(events) {
        if (resolved) return;
        resolved = true;
        try { document.body.removeChild(iframe); } catch (e) {}
        resolve(events);
      }

      // Hard timeout — give up after 20 s
      var hardTimeout = setTimeout(function () {
        console.log('[SupportTracker]', label, 'iframe hard timeout');
        done([]);
      }, 20000);

      iframe.onload = function () {
        // Dismiss cookie/newsletter overlays so they don't block event rendering
        setTimeout(function () {
          try {
            var doc = iframe.contentDocument;
            if (!doc) return;
            // Accept cookie consent (OneTrust, Cookiebot, generic)
            ['#onetrust-accept-btn-handler','#CybotCookiebotDialogBodyButtonAccept',
             '[class*="accept-all"]','[id*="acceptAll"]','[aria-label*="Accept all"]',
             '[aria-label*="Accept All"]'].forEach(function (s) {
              var el = doc.querySelector(s);
              if (el) { try { el.click(); } catch (e) {} }
            });
            // Close newsletter / "Never miss a beat" popups
            ['[class*="modal"] [class*="close"]','[class*="modal"] [aria-label*="close"]',
             '[class*="popup"] [class*="close"]','[role="dialog"] [class*="close"]',
             '[data-dismiss="modal"]','[class*="newsletter"] button'].forEach(function (s) {
              var el = doc.querySelector(s);
              if (el) { try { el.click(); } catch (e) {} }
            });
          } catch (e) {}
        }, 1000); // wait 1s for overlays to render before dismissing

        // Poll until events appear in the iframe DOM or 8 s passes
        var pollStart = Date.now();
        var poll = setInterval(function () {
          try {
            var doc = iframe.contentDocument;
            if (!doc || !doc.body) return;
            var events = extractEvents(doc, label);
            var elapsed = Date.now() - pollStart;
            if (events.length > 0 || elapsed > 8000) {
              clearInterval(poll);
              clearTimeout(hardTimeout);
              console.log('[SupportTracker]', label, 'iframe:', events.length, 'events in', Math.round(elapsed / 100) / 10 + 's');
              done(events);
            }
          } catch (e) {
            clearInterval(poll);
            clearTimeout(hardTimeout);
            console.log('[SupportTracker]', label, 'iframe read error:', e.message);
            done([]);
          }
        }, 400);
      };

      iframe.onerror = function () {
        clearTimeout(hardTimeout);
        console.log('[SupportTracker]', label, 'iframe load error');
        done([]);
      };

      iframe.src = url;
    });
  }

  /* -- Scrape via fetch+DOMParser (for cross-origin venues like Edinburgh) -- */
  async function scrapeVenueHTML(venue, idx) {
    var baseUrl = venue.baseUrl || ('https://www.academymusicgroup.com/' + venue.slug + '/events');
    var all = [];
    for (var page = 1; page <= 6; page++) {
      sp('Crawling ' + venue.name + ' (' + idx + '/' + VENUES.length + ') — p' + page, Math.round((idx - 1) / VENUES.length * 100));
      try {
        var res = await fetch(pageUrl(baseUrl, page), { credentials: 'include' });
        if (!res.ok) break;
        var doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        var batch = extractEvents(doc, venue.slug + ' p' + page);
        all = all.concat(batch);
        if (!batch.length && page > 1) break;
        await new Promise(function (r) { setTimeout(r, 400); });
      } catch (e) { console.log('[SupportTracker]', venue.slug, 'fetch error:', e.message); break; }
    }
    return all;
  }

  /* -- Scrape via iframe (same-origin AMG venues — gets live JS-rendered DOM) -- */
  async function scrapeVenueIframe(venue, idx) {
    var baseUrl = 'https://www.academymusicgroup.com/' + venue.slug + '/events';
    var all = [];
    var seen = {};
    for (var page = 1; page <= 6; page++) {
      sp('Loading ' + venue.name + ' (' + idx + '/' + VENUES.length + ') — p' + page, Math.round((idx - 1) / VENUES.length * 100));
      var events = await scrapeInIframe(pageUrl(baseUrl, page), venue.slug + ' p' + page);
      var fresh = events.filter(function (e) {
        if (seen[e.title]) return false;
        seen[e.title] = true;
        return true;
      });
      if (!fresh.length && page > 1) break;
      all = all.concat(fresh);
    }
    return all;
  }

  /* -- Main loop -- */
  sp('Crawling ' + VENUES.length + ' venues…', 0);
  var results = [];

  for (var i = 0; i < VENUES.length; i++) {
    var venue = VENUES[i];
    // Edinburgh Corn Exchange is cross-origin — use fetch; AMG venues use iframe (live DOM)
    var events = venue.htmlOnly
      ? await scrapeVenueHTML(venue, i + 1)
      : await scrapeVenueIframe(venue, i + 1);
    if (events.length) {
      results.push({
        slug: venue.slug,
        venue: venue.name,
        url: venue.baseUrl || ('https://www.academymusicgroup.com/' + venue.slug + '/events'),
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
