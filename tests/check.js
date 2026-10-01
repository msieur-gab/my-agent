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

// Typos: the same questions with slips in them must still find their piece.
const typos = [
  ['How can my team test an idea befor we comit a budjet?', 'senz'], ['our chatbot halucinates', 'brainboard'],
  ['Can we use AI and still pass GDRP?', 'datadraw'], ['have you worked on child abducton', 'pebbble'],
  ['Can a toy be conected without being adictive?', 'vrooom'], ['How do we anonymize an employe list before sharing it?', 'datadraw'],
];
let typoPass = 0;
for (const [q, want] of typos) {
  const v = Match.verdict(Match.search(index, q));
  const got = v.kind === 'none' ? 'none' : v.results[0].piece.slug;
  if (got === want) typoPass++; else console.log(`MISS typo ${got} (want ${want}) ← ${q}`);
}
console.log(`typos: ${typoPass}/${typos.length}`);

// Small talk: answered as talk, and never swallowing a real question.
const talk = [
  ['Hello!', 'greeting'], ['good morning', 'greeting'], ['Thanks a lot', 'thanks'],
  ['Are you an AI?', 'how'], ['How does this work?', 'how'], ['Who are you?', 'who'],
  ['What can I ask?', 'what'], ['Can I hire you?', 'contact'], ['tell me more', 'more'],
];
let talkPass = 0;
for (const [q, want] of talk) {
  const got = Match.intent(q);
  if (got === want) talkPass++; else console.log(`MISS intent ${got} (want ${want}) ← ${q}`);
}
// Black holes: everyday sentences that share a word with a piece but are not about it.
// They must get "no answer" (or the full list), never a project presented as the closest match.
const holes = ['show me all your work', 'can I see your work', 'what do you think about work', 'do you work remotely',
  'which clients did you work with', 'what tools do you use', 'I need help', 'we have a problem with our app'];
const fell = holes.filter(q => Match.verdict(Match.search(index, q)).kind !== 'none');
fell.forEach(q => console.log(`MISS black hole: a project was shown ← ${q}`));
const lists = ['show me all your work', 'what have you done', 'list your projects', 'portfolio', 'do you have case studies', 'can I see your work'];
const notLists = ['what do you think about work', 'do you work remotely', 'I need help'];
const listMiss = lists.filter(q => !Match.wantsList(q)).concat(notLists.filter(q => Match.wantsList(q)));
listMiss.forEach(q => console.log(`MISS list request misread ← ${q}`));
console.log(`black holes: ${holes.length - fell.length}/${holes.length}, list requests: ${lists.length + notLists.length - listMiss.length}/${lists.length + notLists.length}`);

// Typed commands: the same actions as tapping a card or its link. [sentence, project in focus, expected]
const commands = [
  ['can you open brainboard', null, 'open brainboard'], ['Brainboard', null, 'about brainboard'],
  ['Tell me about Senz', null, 'about senz'], ['what is Pebbble?', null, 'about pebbble'],
  ['show me this project', 'senz', 'open senz'], ['open it', 'vrooom', 'open vrooom'],
  ['read the full story', 'tiptap', 'open tiptap'], ['tell me about this one', 'senz', 'about senz'],
  ['show me Brainboard', null, 'about brainboard'], ['show me Brainboard', 'brainboard', 'open brainboard'],
  ['show me', 'pebbble', 'open pebbble'], ['open', 'pebbble', 'open pebbble'], ['Can you show me, please?', 'pebbble', 'open pebbble'],
  ['show me', null, 'null'],
  ['and what about titptap', null, 'about tiptap'], ['tell me about pebble', null, 'about pebbble'], ['open vroom', null, 'open vrooom'],
  ['what is brainbord', null, 'about brainboard'], ['tip tap', null, 'about tiptap'],
  ['show me this project', null, 'null'], ['How does Brainboard avoid making things up?', null, 'null'],
];
let cmdPass = 0;
for (const [q, focus, want] of commands) {
  const c = Match.command(q, data.pieces, focus);
  const got = c ? c.action + ' ' + c.slug : 'null';
  if (got === want) cmdPass++; else console.log(`MISS command ${got} (want ${want}) ← ${q}`);
}
const hijacked = cases.filter(([q]) => Match.command(q, data.pieces, 'senz'));
hijacked.forEach(([q]) => console.log(`MISS real question read as a command ← ${q}`));
console.log(`commands: ${cmdPass}/${commands.length}, real questions read as commands: ${hijacked.length}`);

const swallowed = cases.filter(([q]) => Match.intent(q));
swallowed.forEach(([q]) => console.log(`MISS real question read as small talk ← ${q}`));
console.log(`small talk: ${talkPass}/${talk.length}, real questions swallowed: ${swallowed.length}\n`);

// The conversation, end to end: what each kind of message gets back (respond.js, one visit, in order).
const Respond = require('../src/assets/js/respond.js');
const site = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/site.json'), 'utf8'));
const brain = Respond.create({ site, pieces: data.pieces });
const rounds = [
  ['a topic with several projects asks back with cards', () => brain.theme('distance'), r => r.template === 'choice' && r.cards.length === 3],
  ['picking a card presents the project', () => brain.pick('pebbble'), r => r.template === 'project' && /^Pebbble is about/.test(r.says[0]) && r.link.href === '/work/pebbble/'],
  ['"show me" then opens it', () => brain.ask('show me'), r => r.template === 'talk' && r.go === '/work/pebbble/'],
  ['a misspelt project name still finds it', () => brain.ask('and what about titptap'), r => r.template === 'project' && r.link.href === '/work/tiptap/'],
  ['a topic with one project presents it', () => brain.theme('ideas'), r => r.template === 'project' && r.link.href === '/work/senz/'],
  ['the same project is not presented twice', () => brain.ask('How can my team test an idea before we commit a budget?'), r => r.template === 'talk' && /still my best answer/.test(r.says[0])],
  ['a clear question says which words led to the answer', () => brain.ask('our chatbot hallucinates'), r => r.template === 'project' && /chatbot/.test(r.why)],
  ['"show me all your work" lists every project', () => brain.ask('show me all your work'), r => r.template === 'choice' && r.cards.length === 10],
  ['hello is answered as talk', () => brain.ask('hello'), r => r.template === 'talk' && r.next.items.length === site.themes.length],
  ['no match invites the question', () => brain.ask('Do you do logo design?'), r => r.template === 'none' && r.form.text === 'Do you do logo design?'],
  ['after "start over" a project can be presented again', () => { brain.reset(); return brain.theme('ideas'); }, r => r.template === 'project'],
];
let roundPass = 0;
for (const [name, run, ok] of rounds) {
  const r = run();
  if (ok(r)) roundPass++; else console.log(`MISS round: ${name} → ${JSON.stringify(r).slice(0, 160)}`);
}
console.log(`conversation: ${roundPass}/${rounds.length}\n`);

const redactions = [
  'Hi, I\'m Anna Schmidt from Example GmbH, reach me at anna@example.com or +49 170 1234567.',
  'We at Northwind need help with GDPR. See https://northwind.example/brief',
  'Our IBAN is DE89 3704 0044 0532 0130 00, please don\'t share.',
  'We need a prototype by 2027 for 3 teams.',
];
for (const t of redactions) console.log(Redact.join(Redact.redact(t)) + '\n   ← ' + t);
