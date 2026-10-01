// Run: node tests/check.js
// Checks the matching against real visitor questions and the redaction against tricky inputs.
const fs = require('fs');
const path = require('path');
const Match = require('../src/assets/js/match.js');
const Redact = require('../src/assets/js/redact.js');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/answers.json'), 'utf8'));
const index = Match.prepare(data.pieces);

// [question, expected slug, or 'none' when the honest answer is "I haven't done that"]
const cases = [
  ['How can my team test an idea before we commit a budget?', 'senz'],
  ['The board wants proof, not another deck. Where do we start?', 'senz'],
  ['Can people without a technical background build a prototype themselves?', 'senz'],
  ['Our innovation lab is too slow', 'senz'],
  ['How do we use AI without it making things up in front of customers?', 'brainboard'],
  ['Can we have an AI that says "I don\'t know"?', 'brainboard'],
  ['our chatbot hallucinates', 'brainboard'],
  ['Where does our personal data actually go?', 'datadraw'],
  ['Can we use AI and still pass GDPR?', 'datadraw'],
  ['How do we anonymise an employee list before sharing it?', 'datadraw'],
  ['Compliance keeps saying no. What would a yes look like?', 'datadraw'],
  ['How can a child keep a parent\'s voice when they live apart?', 'pebbble'],
  ['my kids live abroad with their mother', 'pebbble'],
  ['How can I write to my child in a language I don\'t speak?', 'tiptap'],
  ['How can a child say how they feel without an app?', 'pilipala'],
  ['Can a toy be connected without being addictive?', 'vrooom'],
  ['Can identity live with the person instead of on a server?', 'symbios'],
  ['Can an algorithm be explained to the people who use it?', 'musicast'],
  ['What do you believe about privacy?', 'empower-privacy-agency'],
  ['What is your day rate?', 'none'],
  ['Do you do logo design?', 'none'],
  ['How do we migrate our SAP system?', 'none'],
  ['Is our use case high-risk under the AI Act?', 'any'],
];

let pass = 0;
for (const [q, want] of cases) {
  const v = Match.verdict(Match.search(index, q));
  const top = v.results[0];
  const got = v.kind === 'none' ? 'none' : top.piece.slug;
  const ok = want === 'any' || got === want;
  if (ok) pass++;
  console.log(`${ok ? 'ok  ' : 'MISS'} ${v.kind.padEnd(7)} ${String(top ? top.score : 0).padStart(5)}  ${got.padEnd(24)} ← ${q}`);
}
console.log(`\nmatching: ${pass}/${cases.length}\n`);

const redactions = [
  'Hi, I\'m Anna Schmidt from Example GmbH, reach me at anna@example.com or +49 170 1234567.',
  'We at Northwind need help with GDPR. See https://northwind.example/brief',
  'Our IBAN is DE89 3704 0044 0532 0130 00, please don\'t share.',
  'We need a prototype by 2027 for 3 teams.',
];
for (const t of redactions) console.log(Redact.join(Redact.redact(t)) + '\n   ← ' + t);
