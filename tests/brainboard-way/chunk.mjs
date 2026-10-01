/* Cuts my five texts three ways, to compare what I built today with what brainboard really does.
   brainboard's own code is imported read-only (never copied): chunk.js for cleaning and cutting.
     shipped    brainboard as it ships: sentences packed into ~700-character passages
     study      the librarian study's paragraph cut (nlu-comparison/1b-concept.mjs: MIN 250, MAX 1000),
                with brainboard's cleaning. Its ~20 lines are repeated here because that file is a script.
     mine       today's cut in my-agent (build/passages.py), read from the index it produced
   → chunks.json: { variant: [{ slug, title, text }] } */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
const BB = '/home/gab/dev/brainboard/app/js/agent/';
const { parseFrontmatter, chunkText, stripApparatus, splitSentences, looksLikeApparatus } = await import(BB + 'chunk.js');
const ROOT = new URL('../../', import.meta.url).pathname;
const files = readdirSync(ROOT + 'content/work').filter((f) => f.endsWith('.md')).sort();

const MIN = 250, MAX = 1000, norm = (s) => s.replace(/\s+/g, ' ').trim();
function paragraphs(body) {
  const ps = stripApparatus(body).split(/\n\s*\n/).map(norm).filter(Boolean);
  const merged = []; let carry = '';
  for (const p of ps) { const cur = carry ? carry + ' ' + p : p; if (cur.length < MIN) { carry = cur; continue; } merged.push(cur); carry = ''; }
  if (carry) merged.length ? (merged[merged.length - 1] += ' ' + carry) : merged.push(carry);
  return merged;
}
function splitLong(p) {
  if (p.length <= MAX) return [p];
  const sents = splitSentences(p).map((s) => s.trim()).filter(Boolean);
  const parts = Math.ceil(p.length / MAX), target = p.length / parts, out = []; let cur = [];
  for (const s of sents) { if (cur.length && cur.join(' ').length + s.length > target) { out.push(cur.join(' ')); cur = []; } cur.push(s); }
  if (cur.length) out.push(cur.join(' '));
  return out;
}

const out = { shipped: [], study: [], mine: [] };
for (const f of files) {
  const slug = f.replace('.md', '');
  const { title, site, body } = parseFrontmatter(readFileSync(ROOT + 'content/work/' + f, 'utf8'));
  for (const text of chunkText(title, site, body).slice(1)) out.shipped.push({ slug, title, text });   // [0] is the title anchor
  for (const text of paragraphs(body).flatMap(splitLong).filter((c) => !looksLikeApparatus(c))) out.study.push({ slug, title, text });
}
const mine = JSON.parse(readFileSync(ROOT + 'src/assets/nlu/index.json', 'utf8'));
const titles = Object.fromEntries(out.shipped.map((x) => [x.slug, x.title]));
out.mine = mine.passages.map((p) => ({ slug: p.slug, title: titles[p.slug], text: p.text }));
// every sentence of my passages (brainboard's own sentence splitter), very short ones joined to the next,
// each remembering the passage it sits in: to test matching the SENTENCE instead of the whole passage
out.sentences = [];
out.mine.forEach((p, pi) => {
  let carry = '';
  const push = (text) => out.sentences.push({ slug: p.slug, title: p.title, passage: pi, text });
  for (const s of splitSentences(p.text).map((x) => x.trim()).filter(Boolean)) {
    const cur = carry ? carry + ' ' + s : s;
    if (cur.length < 60) { carry = cur; continue; }
    push(cur); carry = '';
  }
  if (carry) push(carry);
});
writeFileSync(new URL('./chunks.json', import.meta.url), JSON.stringify(out));
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(10), String(v.length).padStart(4), 'passages, mean', Math.round(v.reduce((a, x) => a + x.text.length, 0) / v.length), 'chars');
console.log('\nshipped, Senz, passages 3-5:'); out.shipped.filter((x) => x.slug === 'senz').slice(3, 6).forEach((x) => console.log('  •', x.text.slice(0, 230)));
console.log('\nstudy, Senz, passages 3-5:'); out.study.filter((x) => x.slug === 'senz').slice(3, 6).forEach((x) => console.log('  •', x.text.slice(0, 230)));
console.log('\nmine, Senz, passages 3-5:'); out.mine.filter((x) => x.slug === 'senz').slice(3, 6).forEach((x) => console.log('  •', x.text.slice(0, 230)));
