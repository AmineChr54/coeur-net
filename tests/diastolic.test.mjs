// Tests du moteur de fonction diastolique — node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('../src/_diastolic.js', import.meta.url), 'utf8'), ctx);
const D = ctx.CS.diastolic;
const g25 = (i) => D(i, { guideline: '2025' });
const g16 = (i) => D(i, { guideline: '2016' });

/* ---------- ASE 2025, algorithme principal (fig. 3) ---------- */
test('2025 : tout normal → fonction normale', () => {
  const r = g25({ e: 70, a: 60, es: 9, el: 12, trv: 2.3 });
  assert.equal(r.grade, '0'); assert.equal(r.lap, 'normal');
});
test('2025 : e′ réduite isolée, E/A ≤ 0,8 → grade 1', () => {
  const r = g25({ e: 50, a: 80, es: 5, el: 6, trv: 2.4 });
  assert.equal(r.grade, '1'); assert.equal(r.lap, 'normal');
});
test('2025 : les 3 paramètres anormaux, E/A < 2 → grade 2', () => {
  const r = g25({ e: 95, a: 70, es: 5.5, el: 7.5, trv: 3.0 });
  assert.equal(r.grade, '2'); assert.equal(r.lap, 'elevated');
});
test('2025 : les 3 paramètres anormaux, E/A ≥ 2 → grade 3', () => {
  const r = g25({ e: 120, a: 50, es: 5, el: 6, trv: 3.0 });
  assert.equal(r.grade, '3');
});
test('2025 : seuils inclusifs de la fig. 3 (e′ septal 6, E/e′ moyen 14, IT 2,8)', () => {
  const r = g25({ e: 98, a: 70, es: 6, el: 8, trv: 2.8 });
  assert.ok(r.crit.every((c) => c.abn === true));
  assert.equal(r.grade, '2');
});
test('2025 : e′ réduite, E/A > 0,8, LARS ≤ 18 % → grade 2', () => {
  const r = g25({ e: 70, a: 70, es: 5, el: 6, trv: 2.4, lars: 15 });
  assert.equal(r.grade, '2');
});
test('2025 : e′ réduite, E/A > 0,8, complémentaires normaux → grade 1', () => {
  const r = g25({ e: 70, a: 70, es: 5, el: 6, trv: 2.4, lars: 30, lavi: 28 });
  assert.equal(r.grade, '1'); assert.equal(r.lap, 'normal');
});
test('2025 : e′ réduite, E/A > 0,8, aucun complémentaire → indéterminé avec mesures à faire', () => {
  const r = g25({ e: 70, a: 70, es: 5, el: 6, trv: 2.4 });
  assert.equal(r.grade, '?');
  assert.ok(r.missing.some((m) => m.k === 'lars'));
});
test('2025 : méthode supplémentaire (Ar–A > 30 ms) si rien d’autre', () => {
  const r = g25({ e: 70, a: 70, es: 5, el: 6, trv: 2.4, ara: 40 });
  assert.equal(r.lap, 'elevated');
});
test('2025 : Vmax IT manquante, deux autres normaux → normal avec réserve', () => {
  const r = g25({ e: 70, a: 60, es: 9, el: 12 });
  assert.equal(r.grade, '0'); assert.ok(r.notes.length);
});
test('2025 : seuils e′ ajustés à l’âge (30 ans, septal 6,5 < 7)', () => {
  assert.equal(g25({ e: 70, a: 40, es: 6.5, el: 12, trv: 2.2, age: 30 }).grade, '0');
  assert.equal(g25({ e: 70, a: 40, es: 6.5, el: 12, trv: 2.2, age: 30, ageAdj: true }).crit[0].abn, true);
});

/* ---------- ASE/EACVI 2016 ---------- */
test('2016 A : 0/4 → normal', () => {
  assert.equal(g16({ e: 80, a: 60, es: 9, el: 12, trv: 2.2, lavi: 25, lvef: 60 }).grade, '0');
});
test('2016 A : 2/4 → indéterminé', () => {
  assert.equal(g16({ e: 80, a: 60, es: 5, el: 6, trv: 2.2, lavi: 25, lvef: 60 }).grade, '?');
});
test('2016 B : E/A ≤ 0,8 et E ≤ 50 → grade 1', () => {
  assert.equal(g16({ e: 45, a: 70, lvef: 40 }).grade, '1');
});
test('2016 B : E/A ≥ 2 → grade 3', () => {
  assert.equal(g16({ e: 100, a: 40, lvef: 35 }).grade, '3');
});
test('2016 B : cas v3 du quiz (E/A 1,4, E/e′ 16, VOGi 40, IT 3,1, FEVG 40 %) → grade 2', () => {
  assert.equal(g16({ e: 80, a: 57, es: 5, el: 5, trv: 3.1, lavi: 40, lvef: 40 }).grade, '2');
});
test('2016 : exemple du compte rendu d’écho (06-echo) → grade 2', () => {
  const bsa = Math.sqrt(160 * 70 / 3600);
  const r = g16({ e: 95, a: 70, es: 5.5, el: 7.5, trv: 3.0, lavi: 68 / bsa, lvef: 60, myo: true });
  assert.equal(r.grade, '2');
});

/* ---------- Populations particulières ---------- */
test('FA : ≥ 3 critères → pressions élevées', () => {
  assert.equal(g25({ rhythm: 'af', e: 110, es: 8, trv: 3.0, dt: 150 }).lap, 'elevated');
});
test('FA : 2 critères + LARS < 18 et IMC > 30 → élevées ; complémentaires négatifs → normales', () => {
  assert.equal(g25({ rhythm: 'af', e: 110, es: 8, trv: 2.4, dt: 200, lars: 12, bmi: 32 }).lap, 'elevated');
  assert.equal(g25({ rhythm: 'af', e: 110, es: 8, trv: 2.4, dt: 200, lars: 30, pvsd: 1.2, bmi: 25 }).lap, 'normal');
});
test('FA : 1 critère sur 4 → normales ; 1 critère avec 2 manquants → indéterminé', () => {
  assert.equal(g25({ rhythm: 'af', e: 80, es: 9, trv: 2.4, dt: 150 }).lap, 'normal');
  assert.equal(g25({ rhythm: 'af', e: 110, es: 12 }).lap, 'indeterminate');
});
test('MAC : E/A < 0,8 → normales ; E/A 1,2 avec TRIV 70 → élevées', () => {
  assert.equal(g25({ pop: 'mac', e: 60, a: 90 }).lap, 'normal');
  assert.equal(g25({ pop: 'mac', e: 84, a: 70, ivrt: 70 }).lap, 'elevated');
  assert.equal(g25({ pop: 'mac', e: 84, a: 70 }).lap, 'indeterminate');
});
test('HTP : E/A ≤ 0,8 et E ≤ 50 → normales ; LARS 15 → élevées ; E/e′ latéral 10 → indéterminé', () => {
  assert.equal(g25({ pop: 'ph', e: 45, a: 70 }).lap, 'normal');
  assert.equal(g25({ pop: 'ph', e: 84, a: 70, lars: 15 }).lap, 'elevated');
  assert.equal(g25({ pop: 'ph', e: 80, a: 70, el: 8 }).lap, 'indeterminate');
});
test('Transplanté : E/e′ < 7 → normales ; 7–14 avec E/SRIVR > 200 → élevées', () => {
  assert.equal(g25({ pop: 'htx', e: 60, es: 9, el: 11 }).lap, 'normal');
  assert.equal(g25({ pop: 'htx', e: 80, es: 8, el: 8, srivr: 0.3 }).lap, 'elevated');
});
test('Réparation mitrale : algorithme non applicable', () => {
  const r = g25({ pop: 'mvs', e: 80, a: 60 });
  assert.equal(r.algo, 'na'); assert.equal(r.lap, null);
});
test('La FA prime sur la population choisie', () => {
  assert.equal(g25({ rhythm: 'af', pop: 'mac', e: 110, es: 8, trv: 3, dt: 150 }).algo, 'af25');
});
test('Les virgules décimales sont acceptées', () => {
  assert.equal(g25({ e: '95', a: '70', es: '5,5', el: '7,5', trv: '3,0' }).grade, '2');
});

/* ---------- Non-régression : ancienne fonction diastolic() de 06-echo ---------- */
function legacy(v, myoDis) {
  const n = (k) => (v[k] == null ? NaN : v[k]);
  const r = { ea: n('e') / n('a'), eeavg: n('e') / ((n('es') + n('el')) / 2), lavi: n('lavi') };
  function B() {
    if (isNaN(r.ea)) return '?';
    if (r.ea <= 0.8 && n('e') <= 50) return '1';
    if (r.ea >= 2) return '3';
    const c = []; let pos = 0;
    if (!isNaN(r.eeavg)) { c.push(1); if (r.eeavg > 14) pos++; }
    if (!isNaN(n('trv'))) { c.push(1); if (n('trv') > 2.8) pos++; }
    if (!isNaN(r.lavi)) { c.push(1); if (r.lavi > 34) pos++; }
    if (c.length === 3) return pos >= 2 ? '2' : '1';
    if (c.length === 2) { if (pos === 2) return '2'; if (pos === 0) return '1'; }
    return '?';
  }
  if (myoDis) return B();
  let crit = 0, pos = 0;
  if (!isNaN(r.eeavg)) { crit++; if (r.eeavg > 14) pos++; }
  if (!isNaN(n('es')) || !isNaN(n('el'))) { crit++; if (n('es') < 7 || n('el') < 10) pos++; }
  if (!isNaN(n('trv'))) { crit++; if (n('trv') > 2.8) pos++; }
  if (!isNaN(r.lavi)) { crit++; if (r.lavi > 34) pos++; }
  if (!crit) return '?';
  if (pos / crit < 0.5) return '0';
  if (pos / crit > 0.5) return B();
  return '?';
}
test('2016 : identique à l’ancien moteur de 06-echo sur 5 000 cas aléatoires', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const maybe = (x) => (rnd() < 0.15 ? undefined : x);
  for (let i = 0; i < 5000; i++) {
    const both = rnd() < 0.85;
    const v = {
      e: 30 + rnd() * 100, a: maybe(20 + rnd() * 90),
      es: both ? 3 + rnd() * 10 : undefined, el: both ? 4 + rnd() * 12 : undefined,
      trv: maybe(1.8 + rnd() * 2), lavi: maybe(15 + rnd() * 40)
    };
    const myo = rnd() < 0.5;
    const got = g16({ ...v, lvef: 60, myo }).grade;
    assert.equal(got, legacy(v, myo), JSON.stringify({ v, myo }));
  }
});

/* ---------- Demandes d'Anis (nov. 2026) : surface OG et e′ latéral seul ---------- */
test('Surface OG > 20 cm² remplace le VOGi > 34 mL/m² quand le VOGi manque', () => {
  const base = { e: 70, a: 70, es: 5, el: 6, trv: 2.4 };
  const withLavi = g25({ ...base, lars: 30, lavi: 40 });
  const withArea = g25({ ...base, lars: 30, laa: 24 });
  assert.equal(withArea.grade, withLavi.grade);
  assert.equal(withArea.lap, withLavi.lap);
  const small = g25({ ...base, lars: 30, laa: 17 });
  assert.equal(small.grade, g25({ ...base, lars: 30, lavi: 28 }).grade);
});
test('Le VOGi prime sur la surface OG si les deux sont saisis', () => {
  const r1 = g25({ e: 70, a: 70, es: 5, el: 6, trv: 2.4, lars: 30, lavi: 28, laa: 25 });
  const r2 = g25({ e: 70, a: 70, es: 5, el: 6, trv: 2.4, lars: 30, lavi: 28 });
  assert.equal(r1.grade, r2.grade);
});
test('e′ latéral seul (sans septal) : l’algorithme conclut', () => {
  const r = g25({ e: 95, a: 70, el: 6.5, trv: 3.0 });
  assert.equal(r.grade, '2'); assert.equal(r.lap, 'elevated');
  const n = g25({ e: 70, a: 60, el: 12, trv: 2.3 });
  assert.equal(n.grade, '0');
});
