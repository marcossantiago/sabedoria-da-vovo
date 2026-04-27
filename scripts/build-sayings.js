#!/usr/bin/env node
// Aggregates all sayings/entries/*.json into sayings/data.json
const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const ENTRIES_DIR = path.join(ROOT, 'sayings', 'entries');
const OUTPUT      = path.join(ROOT, 'sayings', 'data.json');

const files = fs.readdirSync(ENTRIES_DIR)
  .filter(f => f.endsWith('.json'))
  .sort();

const entries = files.map(f => JSON.parse(fs.readFileSync(path.join(ENTRIES_DIR, f), 'utf8')));

// Sort by date, then by filename as tiebreaker (already sorted above)
entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2) + '\n', 'utf8');
console.log(`Built ${OUTPUT} with ${entries.length} entries.`);
