// Formules partagées (src/_risk.js) et utilitaires de base (surface corporelle, niveaux du quiz)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../src/_risk.js', import.meta.url), 'utf8'), ctx);
const R = ctx.window.RISK;

test('EuroSCORE II : patient de référence (≤ 60 ans, aucun facteur, geste isolé) ≈ 0,50 %', () => {
  const m = R.euroscore2({ age: 60, female: false, renal: 'n', nyha: 1, lv: 'g', pa: 'n', urg: 'e', wt: 0 });
  assert.ok(Math.abs(m - 0.50) < 0.01, `obtenu ${m}`);
});
test('EuroSCORE II augmente avec l’âge, la FEVG basse et la dialyse', () => {
  const base = { age: 75, female: true, renal: 'm', nyha: 3, lv: 'g', pa: 'n', wt: 1 };
  const a = R.euroscore2(base);
  assert.ok(R.euroscore2({ ...base, age: 85 }) > a);
  assert.ok(R.euroscore2({ ...base, lv: 'p' }) > a);
  assert.ok(R.euroscore2({ ...base, renal: 'dial' }) > a);
});
test('SCORE2 : croît avec l’âge, le tabac et la PAS ; région calibrée', () => {
  const o = { female: false, age: 55, smoker: false, sbp: 140, tc: 5.5, hdl: 1.3, region: 'high' };
  const r = R.score2(o);
  assert.ok(r > 0 && r < 0.5);
  assert.ok(R.score2({ ...o, age: 65 }) > r);
  assert.ok(R.score2({ ...o, smoker: true }) > r);
  assert.ok(R.score2({ ...o, sbp: 170 }) > r);
  assert.ok(R.score2({ ...o, region: 'low' }) < r);
  assert.ok(R.score2({ ...o, region: 'veryhigh' }) > r);
});
test('SCORE2-OP et SCORE2-Diabetes donnent des risques plausibles', () => {
  const op = R.score2op({ female: true, age: 75, smoker: false, sbp: 150, tc: 6, hdl: 1.4, region: 'high', diabetes: false });
  assert.ok(op > 0.05 && op < 0.6, `op ${op}`);
  const dm = R.score2dm({ female: false, age: 60, smoker: false, sbp: 140, tc: 5.5, hdl: 1.1, region: 'high', agediab: 55, a1c: R.a1cToMmol(7.5), egfr: 75 });
  const nodm = R.score2({ female: false, age: 60, smoker: false, sbp: 140, tc: 5.5, hdl: 1.1, region: 'high' });
  assert.ok(dm > nodm, `diabète ${dm} > ${nodm}`);
});
test('Seuils ESC 2021 selon l’âge', () => {
  assert.deepEqual([...R.score2Thresholds(45)], [2.5, 7.5]);
  assert.deepEqual([...R.score2Thresholds(60)], [5, 10]);
  assert.deepEqual([...R.score2Thresholds(75)], [7.5, 15]);
});
test('HbA1c % → mmol/mol (IFCC)', () => {
  assert.ok(Math.abs(R.a1cToMmol(7) - 53) < 0.5);
});

// _base.js dans un DOM minimal : surface corporelle et niveaux
function loadBase() {
  const store = {};
  const el = () => ({ setAttribute() {}, appendChild() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} } });
  const c = {
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, key: (i) => Object.keys(store)[i], get length() { return Object.keys(store).length; } },
    location: { search: '', pathname: '/index.html', protocol: 'file:' },
    document: { documentElement: el(), createElement: el, querySelector: () => null, querySelectorAll: () => [] },
    addEventListener() {}, getComputedStyle: () => ({ getPropertyValue: () => '' }), URLSearchParams, Event: class {},
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(readFileSync(new URL('../src/_base.js', import.meta.url), 'utf8'), c);
  return c.CS;
}
test('Surface corporelle : Mosteller et Du Bois', () => {
  const CS = loadBase();
  assert.ok(Math.abs(CS.bsa(170, 70) - 1.818) < 0.005);
  assert.ok(Math.abs(CS.bsa(170, 70, 'dubois') - 1.810) < 0.005);
  assert.ok(Number.isNaN(CS.bsa('', 70)));
});
test('Niveaux du quiz : seuils et progression', () => {
  const CS = loadBase();
  assert.equal(CS.level(0).lvl, 1);
  assert.equal(CS.level(99).lvl, 1);
  assert.equal(CS.level(100).lvl, 2);
  assert.equal(CS.level(100 + 160).lvl, 3);
  const l = CS.level(130);
  assert.ok(l.pct > 0 && l.pct < 1);
  assert.equal(l.next, 260);
});

// Globorisk : valeurs de référence de la documentation du paquet R (version « lab »)
test('Globorisk : identique au paquet R globorisk (3 cas de référence)', () => {
  const fx = JSON.parse(readFileSync(new URL('./globorisk-fixtures.json', import.meta.url), 'utf8'));
  const cases = [
    [{ female: true, age: 52, sbp: 140, tc: 4.5, dm: true, smoker: false }, 'AFG:2000', 0.3559493],
    [{ female: false, age: 60, sbp: 160, tc: 5, dm: true, smoker: true }, 'AFG:2000', 0.6000554],
    [{ female: false, age: 65, sbp: 170, tc: 5, dm: true, smoker: true }, 'USA:2020', 0.2284217],
  ];
  for (const [o, k, exp] of cases) assert.ok(Math.abs(R.globorisk(o, fx[k]) - exp) < 1e-6, `${k} ${R.globorisk(o, fx[k])}`);
});
test('Globorisk Tunisie : plausible, croissant, hors 40–80 ans = NaN', () => {
  const fx = JSON.parse(readFileSync(new URL('./globorisk-fixtures.json', import.meta.url), 'utf8'))['TUN:2020'];
  const o = { female: false, age: 55, sbp: 140, tc: 5.5, dm: false, smoker: false };
  const r = R.globorisk(o, fx);
  assert.ok(r > 0.01 && r < 0.5, `r ${r}`);
  assert.ok(R.globorisk({ ...o, smoker: true }, fx) > r);
  assert.ok(R.globorisk({ ...o, dm: true }, fx) > r);
  assert.ok(R.globorisk({ ...o, age: 65 }, fx) > r);
  assert.ok(Number.isNaN(R.globorisk({ ...o, age: 35 }, fx)));
  assert.ok(Number.isNaN(R.globorisk({ ...o, age: 85 }, fx)));
});
