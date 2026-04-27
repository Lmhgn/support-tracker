#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

const VENUES = [
  {
    name: 'O2 Academy Brixton',
    url: 'https://www.academymusicgroup.com/o2academybrixton/events',
  },
  {
    name: 'O2 Academy Islington',
    url: 'https://www.academymusicgroup.com/o2academyislington/events',
  },
  {
    name: 'O2 Forum Kentish Town',
    url: 'https://www.academymusicgroup.com/o2forumkentishtown/events',
  },
  {
    name: "O2 Shepherd's Bush Empire",
    url: 'https://www.academymusicgroup.com/o2shepherdsbushempire/events',
  },
];

// Demo data matching the reference image + plausible upcoming shows
const DEMO_DATA = {
  lastUpdated: new Date().toISOString(),
  isDemo: true,
  venues: [
    {
      name: 'O2 Academy Brixton',
      url: 'https://www.academymusicgroup.com/o2academybrixton/events',
      events: [
        {
          title: 'Kes: Roots Rock Soca Tour',
          date: 'SAT 02 MAY',
          time: '19:00',
          allArtists: ['Kes', 'COUTAIN'],
          headliners: ['Kes'],
          supportActs: ['COUTAIN'],
        },
        {
          title: 'Ninja Sex Party & TWRP: Pure Elegance Tour',
          date: 'TUE 05 MAY',
          time: '19:00',
          allArtists: ['Ninja Sex Party', 'TWRP', 'Jazz Emu'],
          headliners: ['Ninja Sex Party', 'TWRP'],
          supportActs: ['Jazz Emu'],
        },
        {
          title: 'Bloc Party',
          date: 'FRI 09 MAY',
          time: '19:00',
          allArtists: ['Bloc Party', 'Self Esteem'],
          headliners: ['Bloc Party'],
          supportActs: ['Self Esteem'],
        },
        {
          title: 'Suede: The Blue Hour Tour',
          date: 'SAT 17 MAY',
          time: '18:30',
          allArtists: ['Suede', 'Saint Saviour'],
          headliners: ['Suede'],
          supportActs: ['Saint Saviour'],
        },
      ],
    },
    {
      name: 'O2 Academy Islington',
      url: 'https://www.academymusicgroup.com/o2academyislington/events',
      events: [
        {
          title: 'The Wrecks',
          date: 'WED 07 MAY',
          time: '19:00',
          allArtists: ['The Wrecks', 'Darling'],
          headliners: ['The Wrecks'],
          supportActs: ['Darling'],
        },
        {
          title: 'Eliza McLamb',
          date: 'SAT 10 MAY',
          time: '19:00',
          allArtists: ['Eliza McLamb', 'Maisie Peters'],
          headliners: ['Eliza McLamb'],
          supportActs: ['Maisie Peters'],
        },
        {
          title: 'Girl in Red',
          date: 'THU 15 MAY',
          time: '19:00',
          allArtists: ['Girl in Red', 'Beabadoobee'],
          headliners: ['Girl in Red'],
          supportActs: ['Beabadoobee'],
        },
      ],
    },
    {
      name: 'O2 Forum Kentish Town',
      url: 'https://www.academymusicgroup.com/o2forumkentishtown/events',
      events: [
        {
          title: 'Enter Shikari',
          date: 'FRI 02 MAY',
          time: '19:00',
          allArtists: ['Enter Shikari', 'As Everything Unfolds', 'Holding Absence'],
          headliners: ['Enter Shikari'],
          supportActs: ['As Everything Unfolds', 'Holding Absence'],
        },
        {
          title: 'Phoebe Bridgers',
          date: 'SUN 11 MAY',
          time: '19:30',
          allArtists: ['Phoebe Bridgers', 'Lucy Dacus'],
          headliners: ['Phoebe Bridgers'],
          supportActs: ['Lucy Dacus'],
        },
      ],
    },
    {
      name: "O2 Shepherd's Bush Empire",
      url: 'https://www.academymusicgroup.com/o2shepherdsbushempire/events',
      events: [
        {
          title: 'Yard Act',
          date: 'SAT 03 MAY',
          time: '19:00',
          allArtists: ['Yard Act', 'CMAT'],
          headliners: ['Yard Act'],
          supportActs: ['CMAT'],
        },
        {
          title: 'The Libertines',
          date: 'WED 14 MAY',
          time: '19:00',
          allArtists: ['The Libertines', 'The Skints', 'Deadletter'],
          headliners: ['The Libertines'],
          supportActs: ['The Skints', 'Deadletter'],
        },
        {
          title: 'Wednesday',
          date: 'MON 19 MAY',
          time: '19:30',
          allArtists: ['Wednesday', 'Squirrel Flower'],
          headliners: ['Wednesday'],
          supportActs: ['Squirrel Flower'],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Artist parsing helpers
// ---------------------------------------------------------------------------

function parseArtists(rawText) {
  if (!rawText) return [];
  return rawText
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0 && a.length < 120);
}

function identifySupportActs(title, artists) {
  if (artists.length <= 1) return { headliners: artists, supportActs: [] };

  const titleLower = title.toLowerCase();
  const headliners = artists.filter((a) => titleLower.includes(a.toLowerCase()));
  const supportActs = artists.filter((a) => !titleLower.includes(a.toLowerCase()));

  // If no title match found (artist name not literally in title), treat first as headliner
  if (headliners.length === 0) {
    return { headliners: [artists[0]], supportActs: artists.slice(1) };
  }

  return { headliners, supportActs };
}

// ---------------------------------------------------------------------------
// Puppeteer scraping
// ---------------------------------------------------------------------------

async function launchBrowser() {
  // Use puppeteer-extra + stealth to bypass Cloudflare bot detection
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());

  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });
}

async function setupPage(browser) {
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-GB,en;q=0.9',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Upgrade-Insecure-Requests': '1',
  });

  // Mask automation signals
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });

  await page.setViewport({ width: 1280, height: 900 });
  return page;
}

async function extractEventsFromPage(page) {
  return page.evaluate(() => {
    // AMG uses various class patterns across their venue microsites.
    // We try progressively broader selectors.
    const containerSelectors = [
      '.whats-on__item',
      '.event-listing__item',
      '.event-item',
      '.events-list__item',
      'article[class*="event"]',
      'li[class*="event"]',
      '.listing-item',
    ];

    let items = [];
    for (const sel of containerSelectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        items = Array.from(found);
        break;
      }
    }

    // Broad fallback: any article or li containing a heading
    if (items.length === 0) {
      items = Array.from(document.querySelectorAll('article, li')).filter(
        (el) => el.querySelector('h2,h3,h4')
      );
    }

    const events = [];

    for (const item of items) {
      // --- Title ---
      const titleEl = item.querySelector(
        'h2,h3,h4,.event-title,.title,[class*="title"],[class*="name"]'
      );
      const title = titleEl ? titleEl.textContent.trim() : '';
      if (!title || title.length < 2) continue;

      // --- Date / Time ---
      const dateEl = item.querySelector(
        'time,.event-date,.date,[class*="date"]'
      );
      const timeEl = item.querySelector('.time,[class*="time"]');
      const date = dateEl ? dateEl.textContent.trim().replace(/\s+/g, ' ') : '';
      const time = timeEl ? timeEl.textContent.trim() : '';

      // --- Artists (the grey line beneath the title) ---
      // Priority: known semantic class names, then heuristic (contains commas, ≠ title)
      const artistSelectors = [
        '[class*="artist"]',
        '[class*="support"]',
        '[class*="performer"]',
        '.supporting',
        '.acts',
        'p.meta',
        '.event-meta',
        '[class*="lineup"]',
      ];

      let artistText = '';
      for (const sel of artistSelectors) {
        const el = item.querySelector(sel);
        if (el) {
          const t = el.textContent.trim();
          if (t && t !== title) {
            artistText = t;
            break;
          }
        }
      }

      // Heuristic: find a <p> or <span> that has a comma (multiple artists)
      if (!artistText) {
        const candidates = item.querySelectorAll('p,span');
        for (const el of candidates) {
          const t = el.textContent.trim();
          if (t.includes(',') && t !== title && t.length < 300) {
            artistText = t;
            break;
          }
        }
      }

      // Second heuristic: look for any text node near the title that differs
      if (!artistText) {
        const paras = item.querySelectorAll('p');
        for (const p of paras) {
          const t = p.textContent.trim();
          // skip venue lines (contain '|') and short strings
          if (t && t !== title && !t.includes('|') && t.length > 2 && t.length < 200) {
            artistText = t;
            break;
          }
        }
      }

      events.push({ title, date, time, artistText: artistText || '' });
    }

    return events;
  });
}

async function getNextPageUrl(page, currentUrl) {
  return page.evaluate((cur) => {
    const nextSelectors = [
      'a[rel="next"]',
      '.pagination__next > a',
      '.pagination .next a',
      'a.next',
      'a[aria-label="Next page"]',
      'a[aria-label="Next"]',
      '.pager__next a',
    ];
    for (const sel of nextSelectors) {
      const el = document.querySelector(sel);
      if (el && el.href && el.href !== cur) return el.href;
    }
    return null;
  }, currentUrl);
}

async function scrapeVenue(browser, venue) {
  const page = await setupPage(browser);
  const allEvents = [];
  let currentUrl = venue.url;
  let pageNum = 1;

  try {
    while (currentUrl) {
      console.log(`  [${venue.name}] page ${pageNum}: ${currentUrl}`);

      await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 45000 });

      // Wait for at least one event-like element
      try {
        await page.waitForSelector(
          '.whats-on__item,.event-listing__item,.event-item,article,li',
          { timeout: 12000 }
        );
      } catch {
        console.warn(`    Warning: timeout waiting for events on page ${pageNum}`);
      }

      // Small random delay to be polite
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

      const rawEvents = await extractEventsFromPage(page);
      console.log(`    Found ${rawEvents.length} raw events`);

      for (const ev of rawEvents) {
        const artists = parseArtists(ev.artistText);
        const { headliners, supportActs } = identifySupportActs(ev.title, artists);
        if (supportActs.length === 0) continue; // skip events with no support act

        allEvents.push({
          title: ev.title,
          date: ev.date,
          time: ev.time,
          allArtists: artists,
          headliners,
          supportActs,
        });
      }

      const nextUrl = await getNextPageUrl(page, currentUrl);
      currentUrl = nextUrl;
      pageNum++;

      if (pageNum > 25) {
        console.warn(`    Safety limit reached for ${venue.name}`);
        break;
      }
    }
  } finally {
    await page.close();
  }

  return allEvents;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main() {
  const isDemo = process.argv.includes('--demo');

  await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  const outputPath = path.join(__dirname, 'data', 'events.json');

  if (isDemo) {
    console.log('Running in DEMO mode — writing example data...');
    await fs.writeFile(outputPath, JSON.stringify(DEMO_DATA, null, 2));
    console.log(`Demo data written to ${outputPath}`);
    return;
  }

  let browser;
  try {
    console.log('Launching browser...');
    browser = await launchBrowser();

    const results = {
      lastUpdated: new Date().toISOString(),
      isDemo: false,
      venues: [],
    };

    for (const venue of VENUES) {
      console.log(`\nScraping: ${venue.name}`);
      try {
        const events = await scrapeVenue(browser, venue);
        results.venues.push({ name: venue.name, url: venue.url, events });
        console.log(`  => ${events.length} events with support acts`);
      } catch (err) {
        console.error(`  Error scraping ${venue.name}:`, err.message);
        results.venues.push({ name: venue.name, url: venue.url, events: [], error: err.message });
      }

      // Polite pause between venues
      await new Promise((r) => setTimeout(r, 2000));
    }

    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nDone. Data saved to ${outputPath}`);

    const totalShows = results.venues.reduce((s, v) => s + v.events.length, 0);
    console.log(`Total shows with support acts: ${totalShows}`);
    results.venues.forEach((v) => console.log(`  ${v.name}: ${v.events.length}`));
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
