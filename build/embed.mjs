#!/usr/bin/env node
/* Adds the vectors to public/bank.json: one per phrasing of every entry (the question and its `also` lines).
   Run after build/build.py. Without this step the page still works, matching by words only.

       node build/embed.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embed, pack, MODEL } from './embedder.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'public/bank.json');
const bank = JSON.parse(fs.readFileSync(file, 'utf8'));

const texts = [];
bank.entries.forEach(e => [e.q, ...e.also].forEach(t => texts.push({ entry: e.id, text: t })));

const t0 = Date.now();
const vectors = await embed(texts.map(t => t.text));
bank.model = MODEL;
bank.dim = vectors[0].length;
bank.vectors = texts.map((t, i) => ({ e: t.entry, t: t.text, ...pack(vectors[i]) }));
fs.writeFileSync(file, JSON.stringify(bank));
console.log(`Embedded ${texts.length} phrasings of ${bank.entries.length} entries in ${Date.now() - t0} ms → public/bank.json (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
