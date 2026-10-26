#!/usr/bin/env node
/* Whole conversations against respond.js with the bank and the model, as the page runs them.
   Prints each reply so the flow can be read; fails on a wrong template or target.
   Runs in the Action only (respond.js is JavaScript); the questions are embedded by build/embed.py.

       node tests/talk.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Respond = require('../src/assets/js/respond.js');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const home = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
const data = JSON.parse(home.match(/<script type="application\/json" id="answers">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g, '</'));
const bank = read('public/bank.json');
/* All the questions below go through build/embed.py once, so the model is loaded a single time. */
function embedAll(texts) {
  const r = spawnSync('python3', [path.join(ROOT, 'build/embed.py'), '--texts'], { input: JSON.stringify(texts), encoding: 'utf8' });
  if (r.status !== 0) throw new Error('embed.py failed: ' + r.stderr);
  return JSON.parse(r.stdout);
}

/* [what is typed or tapped, expected template, expected link target or form, note] */
const script = [
  ['hello', 'talk'],
  ['my product owners have ideas all year but every one dies in a budget committee', 'project', '/work/senz/'],
  ['tell me more', 'project'],
  ['we are raising money and the data room is a mess', 'project', '/work/dowgo/'],
  ['how do we see where personal data flows in our organisation', 'project', '/work/autoflow/'],
  ['what is your day rate', 'none', 'form'],
  ['how do I hire developers faster', 'project', '/work/senz/', 'no entry for this: the closest one, said as such'],
  ['can I hire you', 'talk', 'form'],
  ['is this a chatbot', 'talk', '/how-this-site-works/'],
  ['show me everything', 'choice'],
  ['open pebbble', 'talk', '/work/pebbble/'],
  ['where are you based', 'talk'],
  ['thx', 'talk'],
];

const vectors = {};
const asked = script.map(s => s[0]).concat(['how do we make GDPR understandable to people outside legal']);
embedAll(asked).forEach((v, i) => { vectors[asked[i]] = v; });
const brain = Respond.create(data, bank, text => vectors[text] ? Promise.resolve(vectors[text]) : Promise.reject(new Error('not embedded: ' + text)));

let fails = 0;
for (const [text, template, target, note] of script) {
  const r = await brain.ask(text);
  const link = r.link ? r.link.href : r.go ? r.go : r.form ? 'form' : '';
  const ok = r.template === template && (!target || link.indexOf(target) !== -1);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'MISS'} ${template.padEnd(7)} ← ${text}`);
  console.log(`     ${r.says.join(' / ')}${r.why ? '   [' + r.why + ']' : ''}${link ? '   → ' + link : ''}${r.cards ? '   cards: ' + r.cards.map(c => c.title).join(', ') : ''}${r.next && r.next.items.length ? '   next: ' + r.next.items.map(i => i.text).join(' | ') : ''}`);
  if (!ok) console.log(`     wanted ${template}${target ? ' → ' + target : ''}${note ? ' (' + note + ')' : ''}`);
}
/* Tapping a suggested question runs its entry. */
const sugg = await brain.ask('how do we make GDPR understandable to people outside legal');
const tapped = brain.entry(sugg.next.items[0].entry);
const ok = tapped.template === 'project' || tapped.template === 'talk';
if (!ok) fails++;
console.log(`${ok ? 'ok  ' : 'MISS'} tapped "${sugg.next.items[0].text}" → ${tapped.says[0]}`);
console.log(`\nconversation: ${script.length + 1 - fails}/${script.length + 1}`);
process.exit(fails ? 1 : 0);
