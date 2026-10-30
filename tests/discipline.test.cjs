const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = readFileSync(path.join(root, 'life25.js'), 'utf8');

function session(level = 0, done = {}) {
  const keys = { planner: 'monarch-planner-v25', game: 'monarch-life-v1' };
  const game = { xp: 123, history: [], inventory: ['keep'], characteristics: { vitality: 7 } };
  const values = new Map([
    [keys.game, JSON.stringify(game)],
    [keys.planner, JSON.stringify({ done, skills: { 'Disciplină': { level, completed: 0, streak: 0, manual: null } }, goals: { year: 'keep' } })],
    ['monarch-awakening-v2', JSON.stringify({ paths: ['Disciplină'], marker: 'keep' })]
  ]);
  const listeners = {}, fields = { 'life25-error': {}, 'life25-exp-category': { value: 'Citit' }, 'life25-exp-note': { value: '' } };
  let html = '', reloads = 0;
  vm.runInNewContext(source, {
    window: { MONARCH_BUILD: 'V9.0 test', MONARCH_PROGRESS_SHIELD: { ready: true } },
    localStorage: { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) },
    document: {
      addEventListener: (name, fn) => { listeners[name] = fn; },
      getElementById: id => fields[id] || null,
      body: { insertAdjacentHTML: (_, value) => { html = value; } }
    },
    alert() {}, location: { reload() { reloads++; } }
  });
  return {
    click(id, dataset = {}) { listeners.click({ target: { closest: () => ({ id, dataset }) } }); },
    note(value) { fields['life25-exp-note'].value = value; this.click('life25-exp-apply'); },
    planner: () => JSON.parse(values.get(keys.planner)),
    game: () => JSON.parse(values.get(keys.game)),
    html: () => html, reloads: () => reloads, values, gameBefore: game
  };
}
function applyStage(s) {
  s.click('', { life25Start: 'Disciplină' });
  s.click('life25-exp-next');
  s.click('', { expChoice: '1' });
  assert.equal(s.planner().active.smartStage, 2);
}

test('Romanian verbs accept diacritics, cedillas, decomposed Unicode and uppercase', () => {
  for (const note of ['Încep lectura cu prima pagină', 'Învăț cinci cuvinte din lecție', 'Împart tema în trei pași', 'Pregătesc caietul și citesc prima pagină', 'Urmăresc prima lecție din curs', 'Încep lectura cu prima pagină'.normalize('NFD'), 'PREGĂTESC CAIETUL ŞI CITESC PRIMA PAGINĂ', 'Incep lectura cu prima pagina']) {
    const s = session(); applyStage(s); s.note(note);
    assert.equal(s.planner().active.smartStage, 3, note);
    assert.deepEqual(s.game(), s.gameBefore);
  }
});

test('short, random, vague answers and verb substrings stay at the application step', () => {
  for (const note of ['', 'citesc', 'bbbbbbbb bbbbbbbb bbbbbbbb bbbbbbbb', 'Deschid caietul cândva după masă', 'Încep totul la un moment dat', 'Refacerea unui plan pentru mâine']) {
    const s = session(); applyStage(s); s.note(note);
    assert.equal(s.planner().active.smartStage, 2, note);
    assert.equal(s.planner().active.errors, 1);
    assert.deepEqual(s.game(), s.gameBefore);
  }
});

test('quiz, review, help, challenge and one-time reward retain their behavior', () => {
  const s = session(1);
  s.click('', { life25Start: 'Disciplină' });
  s.click('life25-exp-next');
  s.click('', { expChoice: '0' });
  assert.equal(s.planner().active.smartStage, 1);
  s.click('life25-exp-help');
  s.click('', { expChoice: '1' });
  s.note('Încep lectura cu prima pagină');
  s.click('', { expCheck: '0' });
  assert.equal(s.planner().active.smartStage, 3);
  s.click('', { expCheck: '2' });
  s.click('life25-exp-finish');
  assert.equal(s.game().xp, 123);
  s.click('', { v8Challenge: '1' });
  assert.equal(s.planner().active.challengePassed, false);
  s.click('', { v8Challenge: '0' });
  assert.match(s.html(), /Scor orientativ: 61\/100/);
  s.click('life25-exp-finish');
  assert.equal(s.game().xp, 143);
  assert.equal(s.game().history.length, 1);
  assert.deepEqual(s.game().inventory, ['keep']);
  assert.deepEqual(s.game().characteristics, { vitality: 7 });
  assert.equal(s.planner().goals.year, 'keep');
  assert.equal(s.reloads(), 1);
  s.click('life25-exp-finish');
  assert.equal(s.game().xp, 143);
});

test('historical completion is a review with zero XP and keeps saved data', () => {
  const done = { 'Disciplină:0': 'old', 'Disciplină:1': 'old', 'Disciplină:2': 'old' };
  const s = session(0, done); applyStage(s);
  s.note('Învăț cinci cuvinte din lecție');
  s.click('', { expCheck: '2' });
  assert.match(s.html(), /recapitularea · 0 XP/);
  s.click('life25-exp-finish');
  assert.deepEqual(s.game(), s.gameBefore);
  assert.deepEqual(s.planner().done, done);
  assert.match(s.values.get('monarch-awakening-v2'), /keep/);
});

test('all local assets share a release token and version labels use the build', () => {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="(?!https:)([^"?]+)\?v=([^"]+)"/g)];
  assert.equal(assets.length, 6);
  assert.equal(new Set(assets.map(m => m[2])).size, 1);
  for (const [, file] of assets) assert.ok(readFileSync(path.join(root, file)).length);
  const app = readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /window.MONARCH_BUILD='V9.1.2/);
  assert.match(app, /LIFE ASCENSION · \$\{esc\(window.MONARCH_BUILD\)\}/);
  assert.doesNotMatch(app + source, /V8\.1|V8\.3|Versiune încărcată: V8/);
});

