'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'events.json');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/events', async (req, res) => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(404).json({ error: 'No data yet. Run: npm run scrape' });
  }
});

// Trigger a fresh scrape (non-blocking — streams progress via SSE)
app.get('/api/refresh', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const child = spawn('node', ['scraper.js'], { cwd: __dirname });

  child.stdout.on('data', (d) => {
    const lines = d.toString().split('\n').filter(Boolean);
    for (const line of lines) res.write(`data: ${JSON.stringify({ log: line })}\n\n`);
  });

  child.stderr.on('data', (d) => {
    const lines = d.toString().split('\n').filter(Boolean);
    for (const line of lines) res.write(`data: ${JSON.stringify({ log: line })}\n\n`);
  });

  child.on('close', (code) => {
    res.write(`data: ${JSON.stringify({ done: true, code })}\n\n`);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`Support Tracker running at http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/events`);
});
