#!/usr/bin/env node
/* Measures the matchers against held-out questions. Run after a build with vectors:

       python3 build/build.py && node build/embed.mjs && node tests/eval.mjs [--sweep]

   Three matchers, same questions:
     old      match.js over the pieces' frontmatter (keywords, answers, fields): the matcher on main
     words    bank.js over the bank's phrasings, by shared words
     meaning  bank.js over the bank's phrasings, by MiniLM cosine (the same model the page loads)
     page     what the page does: words when a phrasing is nearly the same sentence, meaning otherwise

   Two question sets:
     tests/held-out.json   written 1 Oct 2026 against the five texts, before the bank existed; labels are pieces
     tests/bank-eval.json  written 26 Oct 2026 against the bank, in another register; labels are entries

   --sweep prints how accuracy and false answers move with the meaning floor. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { embed } from '../build/embedder.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Match = require('../src/assets/js/match.js');
const Bank = require('../src/assets/js/bank.js');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const answers = read('public/answers.json');
const bankJson = read('public/bank.json');
if (!bankJson.vectors) { console.error('public/bank.json has no vectors: run node build/embed.mjs first'); process.exit(1); }
const held = read('tests/held-out.json');
const bankEval = read('tests/bank-eval.json');
const sweep = process.argv.includes('--sweep');

const pieces = Match.prepare(answers.pieces);
const bank = Bank.prepare(bankJson);
const onSite = new Set(answers.pieces.map(p => p.slug));
const byQ = {};
bankJson.entries.forEach(e => { byQ[e.q] = e; });

/* ---------- the questions, in one shape: { q, piece (slug or null), entry (id or null), none (bool) } ---------- */
const held1 = held.answerable.filter(x => x.piece.some(p => onSite.has(p))).map(x => ({ q: x.q, piece: x.piece, entry: null, set: 'held-out', kind: x.kind }));
const heldNone = [...held.near.map(x => x.q), ...held.far, ...held.requests].map(q => ({ q, none: true, set: 'held-out' }));
const bank1 = bankEval.answerable.map(x => {
  const e = byQ[x.entry];
  if (!e) throw new Error('bank-eval names an entry that is not in the bank: ' + x.entry);
  return { q: x.q, piece: onSite.has(e.leads) ? [e.leads] : null, entry: e.id, leads: e.leads, set: 'bank' };
});
const bankNone = bankEval.none.map(q => ({ q, none: true, set: 'bank' }));
const all = [...held1, ...heldNone, ...bank1, ...bankNone];

/* ---------- the matchers: each returns { leads, entry, score } or { leads: null } for "no answer" ---------- */
const vecs = await embed(all.map(x => x.q));
all.forEach((x, i) => { x.vec = vecs[i]; });

const matchers = {
  old: x => {
    const v = Match.verdict(Match.search(pieces, x.q));
    return v.kind === 'none' ? { leads: null, score: v.results[0] ? v.results[0].score : 0 } : { leads: v.results[0].piece.slug, score: v.results[0].score };
  },
  words: x => fromVerdict(Bank.verdict(Bank.words(bank, x.q), 'words')),
  meaning: x => fromVerdict(Bank.verdict(Bank.meaning(bank, x.vec), 'meaning')),
  page: x => {
    const w = Bank.verdict(Bank.words(bank, x.q), 'words');
    return fromVerdict(w.kind === 'none' ? Bank.verdict(Bank.meaning(bank, x.vec), 'meaning') : w);
  }
};
function fromVerdict(v) {
  const top = v.results[0];
  if (v.kind === 'none') return { leads: null, score: top ? top.score : 0, entry: top ? top.entry.id : null };
  return { leads: top.entry.leads, entry: top.entry.id, score: top.score, close: v.kind === 'close', partial: v.kind === 'partial' };
}

/* ---------- scoring ---------- */
function judge(x, r) {
  if (x.none) return r.leads === null ? 'abstain' : 'false answer';
  if (r.leads === null) return 'missed';
  if (x.entry !== null && r.entry !== undefined) return r.entry === x.entry ? 'right entry' : (x.piece && x.piece.includes(r.leads) ? 'right piece' : 'wrong');
  return x.piece && x.piece.includes(r.leads) ? 'right piece' : 'wrong';
}

const lines = [];
function out(s) { lines.push(s); console.log(s); }

out(`# Matcher evaluation — ${new Date().toISOString().slice(0, 10)}\n`);
out(`Questions: ${held1.filter(x => x.kind !== 'factual').length} held-out (piece labels, conceptual only: the ${held1.filter(x => x.kind === 'factual').length} factual ones ask for details inside the texts, which no bank entry carries) + ${bank1.length} bank-eval (entry labels) answerable; ${heldNone.length + bankNone.length} that must get no answer.`);
out(`Floors: words ≥ ${Bank.WORDS}; meaning ≥ ${Bank.SURE} is an answer, ≥ ${Bank.MEANING} is "the closest I have", close call within ${Bank.CLOSE}.\n`);

for (const set of ['held-out', 'bank']) {
  const ans = all.filter(x => x.set === set && !x.none && x.kind !== 'factual');
  const non = all.filter(x => x.set === set && x.none);
  out(`## ${set === 'held-out' ? 'held-out.json (written before the bank)' : 'bank-eval.json (rewordings of the bank)'}\n`);
  out(`| matcher | right piece | ${set === 'bank' ? 'right entry | ' : ''}missed | wrong | abstain on no-answer | false answers (hedged) |`);
  out(`|---|---|${set === 'bank' ? '---|' : ''}---|---|---|---|`);
  for (const [name, fn] of Object.entries(matchers)) {
    if (name === 'old' && set === 'bank') { /* old matcher has no entries; piece accuracy only */ }
    const j = ans.map(x => judge(x, fn(x)));
    const rn = non.map(x => fn(x));
    const jn = non.map((x, i) => judge(x, rn[i]));
    const hedged = rn.filter((r, i) => jn[i] === 'false answer' && r.partial).length;
    const n = ans.length, m = non.length;
    const pieceRight = j.filter(v => v === 'right piece' || v === 'right entry').length;
    const entryRight = j.filter(v => v === 'right entry').length;
    const row = [`${pieceRight}/${n} (${pct(pieceRight, n)})`];
    if (set === 'bank') row.push(name === 'old' ? '—' : `${entryRight}/${n} (${pct(entryRight, n)})`);
    row.push(`${j.filter(v => v === 'missed').length}`, `${j.filter(v => v === 'wrong').length}`,
      `${jn.filter(v => v === 'abstain').length}/${m} (${pct(jn.filter(v => v === 'abstain').length, m)})`, `${jn.filter(v => v === 'false answer').length} (${hedged})`);
    out(`| ${name} | ${row.join(' | ')} |`);
  }
  out('');
}

/* Where the meaning scores sit: the gap between answerable and not is what the floor lives in. */
const ansScores = all.filter(x => !x.none && x.kind !== 'factual').map(x => ({ x, s: Bank.meaning(bank, x.vec)[0].score })).sort((a, b) => a.s - b.s);
const nonScores = all.filter(x => x.none).map(x => ({ x, s: Bank.meaning(bank, x.vec)[0].score })).sort((a, b) => b.s - a.s);
out(`## Meaning scores\n`);
out(`Answerable: lowest ${ansScores[0].s} ("${ansScores[0].x.q}"), median ${ansScores[Math.floor(ansScores.length / 2)].s}, highest ${ansScores[ansScores.length - 1].s}.`);
out(`No answer: highest ${nonScores[0].s} ("${nonScores[0].x.q}"), median ${nonScores[Math.floor(nonScores.length / 2)].s}.`);
out(`Five lowest answerable: ${ansScores.slice(0, 5).map(a => `${a.s} "${a.x.q}"`).join('; ')}.`);
out(`Five highest no-answer: ${nonScores.slice(0, 5).map(a => `${a.s} "${a.x.q}"`).join('; ')}.\n`);

if (sweep) {
  out(`## Floor sweep (meaning)\n`);
  out('| floor | right piece | missed | false answers |');
  out('|---|---|---|---|');
  for (let f = 0.35; f <= 0.66; f += 0.03) {
    let right = 0, missed = 0, falseA = 0;
    for (const x of all) {
      if (x.kind === 'factual') continue;
      const r = Bank.meaning(bank, x.vec)[0];
      const got = r && r.score >= f ? r.entry.leads : null;
      if (x.none) { if (got !== null) falseA++; }
      else if (got === null) missed++;
      else if ((x.entry !== null && r.entry.id === x.entry) || (x.piece && x.piece.includes(got))) right++;
    }
    out(`| ${f.toFixed(2)} | ${right}/${all.filter(x => !x.none && x.kind !== 'factual').length} | ${missed} | ${falseA}/${all.filter(x => x.none).length} |`);
  }
  out('');
}

/* The misses, to read. */
out(`## What the page gets wrong\n`);
for (const x of all) {
  const r = matchers.page(x);
  const j = judge(x, r);
  if (x.kind === 'factual' || j === 'right entry' || j === 'right piece' || j === 'abstain') continue;
  const got = r.leads === null ? 'no answer' : `${r.entry !== undefined ? '"' + bankJson.entries[r.entry].q + '" → ' : ''}${r.leads || '(say only)'}`;
  const want = x.none ? 'no answer' : (x.entry !== null ? `"${bankJson.entries[x.entry].q}"` : x.piece.join('/'));
  out(`- ${j}: "${x.q}" → ${got} (${r.score}); wanted ${want}`);
}

fs.writeFileSync(path.join(ROOT, 'tests/eval-results.md'), lines.join('\n') + '\n');
console.log('\nWritten to tests/eval-results.md');

function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '—'; }
