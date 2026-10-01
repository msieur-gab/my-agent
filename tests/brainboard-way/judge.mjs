/* ranks.json → how each cut does on the 56 questions, including brainboard's own "exact extract":
   the sentence inside the best passage that shares most words with the question (retrieve.js, lexicalBest).
   splitSentences and tokenize are brainboard's, imported read-only. */
import { readFileSync } from 'fs';
const BB = '/home/gab/dev/brainboard/app/js/agent/';
const { splitSentences } = await import(BB + 'chunk.js');
const { tokenize } = await import(BB + 'lexical.js');
const here = (f) => new URL('./' + f, import.meta.url);
const concepts = process.argv.includes('--concepts');
const chunks = JSON.parse(readFileSync(here('chunks.json'))), ranks = JSON.parse(readFileSync(here(concepts ? 'ranks-concepts.json' : 'ranks.json')));
const held = JSON.parse(readFileSync(concepts ? here('concepts.json') : new URL('../held-out.json', import.meta.url)));

function lexicalBest(text, qTok) {                       // same rule as brainboard's retrieve.js
  const sents = splitSentences(text).map((x) => x.trim()).filter(Boolean);
  if (sents.length < 2) return (text || '').trim();
  let best = sents[0], bestN = -1;
  for (const sent of sents) { let n = 0; for (const w of tokenize(sent)) if (qTok.has(w)) n++; if (n > bestN) { bestN = n; best = sent; } }
  return best;
}
const has = (text, a) => a.expect.some((e) => text.toLowerCase().includes(e.toLowerCase()));
const verbose = process.argv.includes('-v');
console.log('cut                    passages  right piece  1st passage answers  answer in first 3  pinpointed sentence answers  refused');
for (const [name, r] of Object.entries(ranks)) {
  const C = chunks[r.cut]; let piece = 0, p1 = 0, p3 = 0, s1 = 0, refused = 0; const lines = [];
  held.answerable.forEach((a, k) => {
    const top = r.top[k], first = C[top[0][0]];
    if (top[0][1] < r.floor) refused++;
    const okPiece = a.piece.includes(first.slug); piece += okPiece;
    const h1 = okPiece && has(first.text, a); p1 += h1;
    p3 += top.slice(0, 3).some(([i]) => a.piece.includes(C[i].slug) && has(C[i].text, a));
    // the extract shown: the best-matching sentence when sentences were embedded, else brainboard's word-overlap pick
    const sent = r.sentences ? chunks.sentences[top[0][2]].text : lexicalBest(first.text, new Set(tokenize(a.q)));
    const hs = okPiece && has(sent, a); s1 += hs;
    if (verbose && name === 'mine, sentence or passage') lines.push(`   ${h1 ? 'passage ok ' : 'passage no '} ${hs ? 'sentence ok' : 'sentence no'}  ${a.q}\n        → ${sent.slice(0, 150)}`);
  });
  const n = held.answerable.length;
  console.log(name.padEnd(26), String(C.length).padStart(4), `${piece}/${n}`.padStart(12), `${p1}/${n}`.padStart(20), `${p3}/${n}`.padStart(18), `${s1}/${n}`.padStart(28), `${refused}/${n}`.padStart(8));
  lines.forEach((l) => console.log(l));
}
