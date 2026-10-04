// Keyword scores from match.js for a list of questions, so tests/routing.py decides exactly as the page.
// Run after a build: node tests/keywords.js < questions.json  → { question: { slug: score } }
const fs = require('fs');
const path = require('path');
const Match = require('../src/assets/js/match.js');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/answers.json'), 'utf8'));
const index = Match.prepare(data.pieces);
const qs = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = {};
for (const q of qs) {
  const r = {};
  Match.search(index, q).filter(x => x.grounded).forEach(x => { r[x.piece.slug] = x.score; });
  out[q] = r;
}
process.stdout.write(JSON.stringify(out));
