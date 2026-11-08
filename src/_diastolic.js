/* CardioSuite — moteur de fonction diastolique (ASE/EACVI 2016 et ASE 2025)
   Logique pure, sans DOM : partagée par 18-diastolique, 06-echo et les tests (node --test).
   Seuils relus sur les figures des publications :
     - Nagueh SF et al., J Am Soc Echocardiogr 2016;29:277-314 (algorithmes A et B)
     - Nagueh SF et al., J Am Soc Echocardiogr 2025;38(7) : fig. 3 (algorithme principal), fig. 4 (MAC),
       fig. 5 (transplantés), fig. 6 (HTP), fig. 8 (FA), tableau 6 (e′ selon l'âge), tableau 7 (populations particulières)
   Entrée : vitesses en cm/s (E, A, e′), Vmax IT et IP en m/s, temps en ms, VOGi en mL/m², SLOG (LARS) en %.
   Sortie : {guideline, algo, pop, lap, grade, lvl, title, lapTxt, crit[], path[], missing[], notes[], refs[], sentence} */
(function(root){
'use strict';

var REF16 = 'Nagueh SF et al., JASE 2016 – fonction diastolique (ASE/EACVI)';
var REF25 = 'Nagueh SF et al., JASE 2025 – fonction diastolique (ASE)';

var POPS = {
  std:{l:'Cas général'},
  af:{l:'Fibrillation atriale'},
  mac:{l:'Calcifications annulaires mitrales modérées ou sévères'},
  ms:{l:'Rétrécissement mitral'},
  mr:{l:'Insuffisance mitrale primaire significative'},
  mvs:{l:'Réparation, prothèse mitrale ou TEER'},
  hcm:{l:'Cardiomyopathie hypertrophique'},
  ph:{l:'Hypertension pulmonaire non cardiaque (groupes 1, 3 à 5)'},
  htx:{l:'Transplantation cardiaque (rythme sinusal)'},
  na:{l:'Constriction péricardique ou assistance ventriculaire'}
};

function N(x){
  if(typeof x === 'number') return x;
  if(x == null) return NaN;
  x = String(x).replace(',', '.').trim();
  return x === '' ? NaN : Number(x);
}
function ok(x){ return !isNaN(x) && isFinite(x); }
function f(x, d){ return ok(x) ? x.toFixed(d == null ? 0 : d).replace('.', ',') : '–'; }

/* ---------- Oreillette gauche : VOGi (référence) ou, à défaut, surface OG en 4 cavités ---------- */
// Seuil de la surface : > 20 cm² (dilatation selon la quantification des cavités ASE/EACVI). Approximation pragmatique :
// le VOGi reste le paramètre des recommandations et prime s'il est saisi.
function laAbn(d){ if(ok(d.lavi)) return d.lavi > 34; if(ok(d.laa)) return d.laa > 20; return null; }
function laVal(d){ return ok(d.lavi) ? f(d.lavi, 0) + ' mL/m²' : ok(d.laa) ? f(d.laa, 0) + ' cm²' : ''; }
function laName(d, def){ return !ok(d.lavi) && ok(d.laa) ? 'Surface OG (4 cavités) > 20 cm²' : def; }
function laThr(d){ return !ok(d.lavi) && ok(d.laa) ? '> 20 cm² (à défaut du VOGi > 34 mL/m²)' : '> 34 mL/m²'; }

/* ---------- Grandeurs dérivées ---------- */
function derive(inp){
  var d = {};
  ['age', 'lvef', 'e', 'a', 'es', 'el', 'trv', 'pasp', 'lavi', 'laa', 'lars', 'pvsd', 'ivrt', 'dt', 'ara', 'prv', 'padp', 'lwave', 'valsalva', 'srivr', 'bmi', 'tee'].forEach(function(k){ d[k] = N(inp[k]); });
  d.ea = d.e / d.a;
  d.eavg = ok(d.es) && ok(d.el) ? (d.es + d.el) / 2 : NaN;
  d.eeavg = d.e / d.eavg; d.eesep = d.e / d.es; d.eelat = d.e / d.el;
  d.esr = d.e / d.srivr;            // E / SRIVR en cm (transplantés)
  d.ivrtTee = d.ivrt / d.tee;       // TRIV / TE-e′ (valvulopathies mitrales)
  d.myo = !!inp.myo || (ok(d.lvef) && d.lvef < 50);
  d.ageAdj = !!inp.ageAdj && ok(d.age);
  return d;
}

/* Seuils de e′ réduite : fig. 3 (≤ 6 / ≤ 7 / ≤ 6,5) ou tableau 6 selon l'âge (< seuil) */
function eLim(d){
  if(d.ageAdj){
    var t = d.age < 40 ? [7, 10, 9] : d.age <= 65 ? [6, 8, 7] : [6, 7, 6.5];
    return {s:t[0], l:t[1], a:t[2], strict:true, txt:'septal < ' + f(t[0], t[0] % 1 ? 1 : 0) + ', latéral < ' + f(t[1], 0) + ' ou moyen < ' + f(t[2], t[2] % 1 ? 1 : 0) + ' cm/s (tableau 6, ' + (d.age < 40 ? '20–39 ans' : d.age <= 65 ? '40–65 ans' : '> 65 ans') + ')'};
  }
  return {s:6, l:7, a:6.5, strict:false, txt:'septal ≤ 6, latéral ≤ 7 ou moyen ≤ 6,5 cm/s'};
}
function eReduced(d){
  if(!ok(d.es) && !ok(d.el)) return null;
  var L = eLim(d), lt = function(x, t){ return ok(x) && (L.strict ? x < t : x <= t); };
  return lt(d.es, L.s) || lt(d.el, L.l) || lt(d.eavg, L.a);
}
function eTxt(d){ return [ok(d.es) ? 'sept. ' + f(d.es, 1) : '', ok(d.el) ? 'lat. ' + f(d.el, 1) : ''].filter(Boolean).join(' · ') + (ok(d.es) || ok(d.el) ? ' cm/s' : ''); }
function eeTxt(d){
  if(ok(d.eeavg)) return 'moyen ' + f(d.eeavg, 1);
  return [ok(d.eesep) ? 'septal ' + f(d.eesep, 1) : '', ok(d.eelat) ? 'latéral ' + f(d.eelat, 1) : ''].filter(Boolean).join(' · ');
}

/* ---------- Construction du résultat ---------- */
function Res(g, pop){
  return {guideline:g, pop:pop, popLabel:POPS[pop].l, algo:'', lap:null, grade:null, lvl:'ok', title:'', lapTxt:'',
    crit:[], path:[], missing:[], notes:[], refs:[g === '2016' && (pop === 'std') ? REF16 : REF25], sentence:''};
}
// abn : true (anormal), false (normal), null (non disponible)
function C(R, k, label, value, abn, thr){ var c = {k:k, label:label, value:value, abn:abn, thr:thr, grp:R.grp || ''}; R.crit.push(c); return c; }
function step(R, id, txt){ R.path.push({id:id, txt:txt}); }
function need(R, k, label, why){ if(!R.missing.some(function(m){ return m.k === k; })) R.missing.push({k:k, label:label, why:why || ''}); }
function cmp(x, op, t){ if(!ok(x)) return null; return op === '>' ? x > t : op === '>=' ? x >= t : op === '<' ? x < t : x <= t; }
function anyTrue(arr){ return arr.some(function(x){ return x === true; }); }
function allNull(arr){ return arr.every(function(x){ return x === null; }); }

function setGrade(R, grade, lap){
  R.grade = grade; R.lap = lap;
  var g25 = R.guideline === '2025';
  if(grade === '0'){ R.title = 'Fonction diastolique normale'; R.lvl = 'ok'; }
  else if(grade === '1'){ R.title = 'Dysfonction diastolique grade 1'; R.lvl = 'abn'; }
  else if(grade === '2'){ R.title = 'Dysfonction diastolique grade 2'; R.lvl = 'sev'; }
  else if(grade === '3'){ R.title = 'Dysfonction diastolique grade 3'; R.lvl = 'sev'; }
  else if(grade === '2-3'){ R.title = 'Dysfonction diastolique grade 2 ou 3'; R.lvl = 'sev'; need(R, 'ea', 'E/A', 'Départage grade 2 (E/A < 2) et grade 3 (E/A ≥ 2)'); }
  else if(grade === '?'){ R.title = 'Fonction diastolique indéterminée'; R.lvl = 'abn'; }
  R.lapTxt = lap === 'normal' ? 'pressions de remplissage normales'
    : lap === 'elevated' ? (grade === '2' && g25 ? 'pressions de remplissage élevées (élévation légère à modérée)' : grade === '3' && g25 ? 'pressions de remplissage élevées (élévation marquée)' : 'pressions de remplissage élevées')
    : lap === 'indeterminate' ? 'pressions de remplissage indéterminées' : '';
}
function setLap(R, lap){
  R.lap = lap;
  R.title = lap === 'normal' ? 'Pressions de remplissage normales' : lap === 'elevated' ? 'Pressions de remplissage élevées' : 'Pressions de remplissage indéterminées';
  R.lapTxt = '';
  R.lvl = lap === 'normal' ? 'ok' : lap === 'elevated' ? 'sev' : 'abn';
}
function gradeByEA(R, d){
  if(!ok(d.ea)){ step(R, 'm.eaNA', 'E/A non disponible'); return '2-3'; }
  if(d.ea < 2){ step(R, 'm.ealt2', 'E/A ' + f(d.ea, 2) + ' < 2'); return '2'; }
  step(R, 'm.eage2', 'E/A ' + f(d.ea, 2) + ' ≥ 2'); return '3';
}

/* ---------- ASE 2025 : algorithme principal (fig. 3) ---------- */
function main25(d, R){
  R.algo = 'm25';
  var L = eLim(d);
  var cE = C(R, 'e', 'e′ réduite', eTxt(d), eReduced(d), L.txt);
  var eeAbn = ok(d.e) ? (anyTrue([cmp(d.eeavg, '>=', 14), cmp(d.eesep, '>=', 15), cmp(d.eelat, '>=', 13)]) ? true : (ok(d.eeavg) || ok(d.eesep) || ok(d.eelat) ? false : null)) : null;
  var cEE = C(R, 'ee', 'E/e′ augmenté', eeTxt(d), eeAbn, 'septal ≥ 15, latéral ≥ 13 ou moyen ≥ 14');
  var trAbn = ok(d.trv) || ok(d.pasp) ? anyTrue([cmp(d.trv, '>=', 2.8), cmp(d.pasp, '>=', 35)]) : null;
  var cTR = C(R, 'tr', 'Vmax IT / PAPS augmentée', [ok(d.trv) ? f(d.trv, 1) + ' m/s' : '', ok(d.pasp) ? 'PAPS ' + f(d.pasp) + ' mmHg' : ''].filter(Boolean).join(' · '), trAbn, 'Vmax IT ≥ 2,8 m/s ou PAPS ≥ 35 mmHg');
  var three = [cE, cEE, cTR];
  var avail = three.filter(function(c){ return c.abn !== null; }), nAbn = avail.filter(function(c){ return c.abn; }).length;
  if(cE.abn === null) need(R, 'e′', 'e′ septal et latéral', 'Premier paramètre de l’algorithme (relaxation)');
  if(cEE.abn === null) need(R, 'E', 'Onde E mitrale', 'Nécessaire au rapport E/e′');
  if(cTR.abn === null) need(R, 'trv', 'Vmax IT ou PAPS', 'Plusieurs fenêtres ; sérum salé agité ou contraste si le jet est incomplet');
  if(avail.length < 2){
    step(R, 'm.start', 'Moins de 2 des 3 paramètres principaux disponibles');
    setGrade(R, '?', 'indeterminate'); return;
  }
  if(nAbn === 0){
    step(R, 'm.allnormal', 'e′, E/e′ et Vmax IT normaux');
    if(avail.length < 3) R.notes.push('Conclusion fondée sur 2 des 3 paramètres principaux (' + three.filter(function(c){ return c.abn === null; })[0].label + ' non disponible).');
    setGrade(R, '0', 'normal'); return;
  }
  if(nAbn === 3){
    step(R, 'm.all3', 'Les 3 paramètres principaux sont anormaux');
    step(R, 'm.inclap', 'Pression OG élevée');
    setGrade(R, gradeByEA(R, d), 'elevated'); return;
  }
  if(nAbn === 1 && cE.abn){
    step(R, 'm.eonly', 'e′ réduite isolée');
    if(!ok(d.ea)){ need(R, 'ea', 'Ondes E et A', 'Départage grade 1 (E/A ≤ 0,8) et recherche de pressions élevées'); }
    else if(d.ea <= 0.8){
      step(R, 'm.ea08', 'E/A ' + f(d.ea, 2) + ' ≤ 0,8');
      setGrade(R, '1', 'normal');
      R.notes.push('Si le patient est symptomatique : échographie d’effort diastolique.');
      return;
    } else step(R, 'm.ea08p', 'E/A ' + f(d.ea, 2) + ' > 0,8 : paramètres complémentaires');
  } else step(R, 'm.mixed', nAbn === 2 ? '2 paramètres anormaux sur 3' : (cEE.abn ? 'E/e′ augmenté isolé' : 'Vmax IT / PAPS augmentée isolée'));
  supp25(d, R, cE.abn === true);
}

/* Paramètres complémentaires de la fig. 3 : S/D VP ≤ 0,67, LARS ≤ 18 %, VOGi > 34, ou à défaut TRIV ≤ 70 ms */
function supp25(d, R, eRed){
  var cPV = C(R, 'pvsd', 'Flux veineux pulmonaire S/D', ok(d.pvsd) ? f(d.pvsd, 2) : '', cmp(d.pvsd, '<=', 0.67), '≤ 0,67');
  var cLARS = C(R, 'lars', 'Strain réservoir OG (LARS)', ok(d.lars) ? f(d.lars, 0) + ' %' : '', cmp(d.lars, '<=', 18), '≤ 18 %');
  var cLA = C(R, 'lavi', laName(d, 'Volume OG indexé'), laVal(d), laAbn(d), laThr(d));
  var cIV = C(R, 'ivrt', 'TRIV (alternative)', ok(d.ivrt) ? f(d.ivrt, 0) + ' ms' : '', cmp(d.ivrt, '<=', 70), '≤ 70 ms');
  var sup = [cPV, cLARS, cLA, cIV];
  step(R, 'm.supp', 'Paramètres complémentaires');
  if(cLA.abn && !cLARS.abn && !cPV.abn) R.notes.push('VOGi : exclure une autre cause de dilatation de l’OG (sportif, anémie, FA ou flutter, valvulopathie mitrale).');
  if(anyTrue(sup.map(function(c){ return c.abn; }))){
    step(R, 'm.inclap', 'Au moins 1 critère présent : pression OG élevée');
    setGrade(R, gradeByEA(R, d), 'elevated'); return;
  }
  // S/D > 0,67 n'exclut pas des pressions élevées si la FEVG est normale (texte de la section 11)
  var pvNeg = cPV.abn === false && ok(d.lvef) && d.lvef < 50;
  if(cPV.abn === false && !pvNeg) R.notes.push('S/D veineux pulmonaire > 0,67 à FEVG normale : n’exclut pas des pressions élevées, confirmer par le TRIV.');
  if(cLARS.abn === false || cLA.abn === false || cIV.abn === false || pvNeg){
    step(R, 'm.normlap', 'Aucun critère présent : pression OG normale');
    if(eRed){ setGrade(R, '1', 'normal'); R.notes.push('Si le patient est symptomatique : échographie d’effort diastolique.'); return; }
    // e′ conservée : dysfonction si ≥ 2 marqueurs de la fig. 2 (E/e′ moyen > 14, LARS ≤ 18 %, E/A ≤ 0,8 ou ≥ 2, VOGi > 34)
    var m = [cmp(d.eeavg, '>', 14), cLARS.abn, ok(d.ea) ? (d.ea <= 0.8 || d.ea >= 2) : null, cLA.abn].filter(function(x){ return x === true; }).length;
    if(m >= 2){ step(R, 'm.fig2', 'e′ conservée mais ≥ 2 marqueurs de remodelage (fig. 2)'); setGrade(R, '1', 'normal'); }
    else setGrade(R, '0', 'normal');
    R.notes.push('Pression OG normale au repos : si dyspnée inexpliquée, échographie d’effort diastolique.');
    return;
  }
  // Aucun paramètre complémentaire : méthodes supplémentaires (note † de la fig. 3)
  var S = [cmp(d.prv, '>=', 2), cmp(d.padp, '>=', 16), cmp(d.lwave, '>=', 50), cmp(d.ara, '>', 30), cmp(d.valsalva, '>=', 50)];
  if(anyTrue(S)){
    C(R, 'sup', 'Méthodes supplémentaires', [S[0] ? 'IP télédiastolique ≥ 2 m/s' : '', S[1] ? 'PAPd ≥ 16 mmHg' : '', S[2] ? 'onde L ≥ 50 cm/s' : '', S[3] ? 'Ar–A > 30 ms' : '', S[4] ? 'baisse de E/A ≥ 50 % au Valsalva' : ''].filter(Boolean).join(', '), true, 'au moins une présente');
    step(R, 'm.inclap', 'Méthode supplémentaire positive : pression OG élevée');
    setGrade(R, gradeByEA(R, d), 'elevated'); return;
  }
  need(R, 'lars', 'Strain réservoir OG (LARS)', 'Faisable chez la plupart des patients en coupes apicales');
  need(R, 'lavi', 'Volume OG indexé ou surface OG', 'VOGi biplan en télésystole ; à défaut, surface OG en 4 cavités');
  need(R, 'pvsd', 'Flux veineux pulmonaire S/D', 'Surtout fiable si la FEVG est altérée');
  need(R, 'ivrt', 'TRIV', 'Alternative si les précédents manquent');
  if(allNull(S)) need(R, 'sup', 'Ar–A, Valsalva, onde L, IP télédiastolique', 'Méthodes supplémentaires si rien d’autre n’est fiable');
  setGrade(R, '?', 'indeterminate');
}

/* ---------- ASE/EACVI 2016 : algorithmes A et B ---------- */
function algo16(d, R){
  if(!d.myo) return algoA16(d, R);
  step(R, 'b.start', 'FEVG < 50 % ou cardiopathie myocardique : algorithme B');
  algoB16(d, R);
}
function algoA16(d, R){
  R.algo = 'a16'; R.grp = 'Algorithme A';
  step(R, 'a.start', 'FEVG normale sans cardiopathie myocardique : algorithme A');
  var c = [
    C(R, 'ee', 'E/e′ moyen > 14', ok(d.eeavg) ? f(d.eeavg, 1) : '', cmp(d.eeavg, '>', 14), '> 14'),
    C(R, 'e', 'e′ septal < 7 ou latéral < 10', eTxt(d), ok(d.es) || ok(d.el) ? (cmp(d.es, '<', 7) === true || cmp(d.el, '<', 10) === true) : null, 'septal < 7 ou latéral < 10 cm/s'),
    C(R, 'tr', 'Vmax IT > 2,8 m/s', ok(d.trv) ? f(d.trv, 1) + ' m/s' : '', cmp(d.trv, '>', 2.8), '> 2,8 m/s'),
    C(R, 'lavi', laName(d, 'VOGi > 34 mL/m²'), laVal(d), laAbn(d), laThr(d))
  ];
  var av = c.filter(function(x){ return x.abn !== null; }), pos = av.filter(function(x){ return x.abn; }).length;
  c.forEach(function(x){ if(x.abn === null) need(R, x.k, x.label.replace(/ [<>].*$/, ''), 'Critère de l’algorithme A'); });
  if(!av.length){ setGrade(R, '?', 'indeterminate'); return; }
  if(pos / av.length < 0.5){ step(R, 'a.normal', pos + ' critère(s) positif(s) sur ' + av.length + ' (< 50 %)'); setGrade(R, '0', 'normal'); return; }
  if(pos / av.length > 0.5){ step(R, 'a.dd', pos + ' critères positifs sur ' + av.length + ' (> 50 %) : algorithme B'); algoB16(d, R); R.algo = 'a16'; return; }
  step(R, 'a.indet', pos + ' critères positifs sur ' + av.length + ' (50 %)');
  setGrade(R, '?', 'indeterminate');
}
function algoB16(d, R){
  R.algo = R.algo || 'b16'; R.grp = 'Algorithme B';
  C(R, 'ea', 'E/A', ok(d.ea) ? f(d.ea, 2) + (ok(d.e) ? ' (E ' + f(d.e) + ' cm/s)' : '') : '', ok(d.ea) ? (d.ea >= 2 ? true : d.ea <= 0.8 && d.e <= 50 ? false : null) : null, '≤ 0,8 avec E ≤ 50 cm/s ; ≥ 2');
  if(!ok(d.ea)){ need(R, 'ea', 'Ondes E et A', 'Point d’entrée de l’algorithme B'); step(R, 'b.eaNA', 'E/A non disponible'); setGrade(R, '?', 'indeterminate'); return; }
  if(d.ea <= 0.8 && d.e <= 50){ step(R, 'b.g1', 'E/A ≤ 0,8 et E ≤ 50 cm/s'); setGrade(R, '1', 'normal'); return; }
  if(d.ea >= 2){ step(R, 'b.g3', 'E/A ≥ 2'); setGrade(R, '3', 'elevated'); return; }
  step(R, 'b.mid', d.ea <= 0.8 ? 'E/A ≤ 0,8 avec E > 50 cm/s' : 'E/A entre 0,8 et 2');
  var eeV = ok(d.eeavg) ? d.eeavg : NaN, eeA = ok(d.eeavg) ? d.eeavg > 14 : ok(d.eesep) ? d.eesep > 15 : ok(d.eelat) ? d.eelat > 13 : null;
  var c = [
    C(R, 'ee', 'E/e′ moyen > 14', ok(eeV) ? f(eeV, 1) : eeTxt(d), eeA, '> 14 (septal > 15, latéral > 13 si un seul e′)'),
    C(R, 'tr', 'Vmax IT > 2,8 m/s', ok(d.trv) ? f(d.trv, 1) + ' m/s' : '', cmp(d.trv, '>', 2.8), '> 2,8 m/s'),
    C(R, 'lavi', laName(d, 'VOGi > 34 mL/m²'), laVal(d), laAbn(d), laThr(d))
  ];
  var av = c.filter(function(x){ return x.abn !== null; });
  // FEVG altérée : S/D veineux pulmonaire < 1 peut remplacer un critère manquant
  if(av.length < 3 && ok(d.lvef) && d.lvef < 50 && ok(d.pvsd)){ av.push(C(R, 'pvsd', 'S/D veineux pulmonaire < 1', f(d.pvsd, 2), d.pvsd < 1, '< 1 (FEVG altérée)')); }
  var pos = av.filter(function(x){ return x.abn; }).length, neg = av.length - pos;
  c.forEach(function(x){ if(x.abn === null) need(R, x.k, x.label.replace(/ [<>].*$/, ''), 'Critère de l’algorithme B'); });
  if(av.length >= 3){
    if(pos >= 2){ step(R, 'b.g2', pos + ' critères positifs sur ' + av.length); setGrade(R, '2', 'elevated'); }
    else { step(R, 'b.g1b', neg + ' critères négatifs sur ' + av.length); setGrade(R, '1', 'normal'); }
    return;
  }
  if(av.length === 2){
    if(pos === 2){ step(R, 'b.g2', '2 critères positifs sur 2'); setGrade(R, '2', 'elevated'); return; }
    if(pos === 0){ step(R, 'b.g1b', '2 critères négatifs sur 2'); setGrade(R, '1', 'normal'); return; }
    step(R, 'b.indet', '1 critère positif et 1 négatif');
  } else step(R, 'b.indet', 'Moins de 2 critères disponibles');
  setGrade(R, '?', 'indeterminate');
}

/* ---------- Populations particulières (ASE 2025) ---------- */
function af25(d, R){
  R.algo = 'af25';
  var c = [
    C(R, 'e', 'Onde E ≥ 100 cm/s', ok(d.e) ? f(d.e) + ' cm/s' : '', cmp(d.e, '>=', 100), '≥ 100 cm/s'),
    C(R, 'eesep', 'E/e′ septal > 11', ok(d.eesep) ? f(d.eesep, 1) : '', cmp(d.eesep, '>', 11), '> 11'),
    C(R, 'tr', 'Vmax IT > 2,8 m/s ou PAPS > 35 mmHg', [ok(d.trv) ? f(d.trv, 1) + ' m/s' : '', ok(d.pasp) ? 'PAPS ' + f(d.pasp) : ''].filter(Boolean).join(' · '), ok(d.trv) || ok(d.pasp) ? anyTrue([cmp(d.trv, '>', 2.8), cmp(d.pasp, '>', 35)]) : null, '> 2,8 m/s ou > 35 mmHg'),
    C(R, 'dt', 'TDE ≤ 160 ms', ok(d.dt) ? f(d.dt) + ' ms' : '', cmp(d.dt, '<=', 160), '≤ 160 ms')
  ];
  var pos = c.filter(function(x){ return x.abn === true; }).length, miss = c.filter(function(x){ return x.abn === null; });
  miss.forEach(function(x){ need(R, x.k, x.label.replace(/ [<>≤≥].*$/, ''), 'Moyenne de plusieurs cycles représentatifs de la fréquence'); });
  R.notes.push('En FA : moyenner plusieurs cycles représentatifs de la fréquence cardiaque moyenne.');
  if(pos >= 3){ step(R, 'af.3', pos + ' critères sur 4'); setLap(R, 'elevated'); return; }
  if(pos + miss.length <= 1){ step(R, 'af.01', pos + ' critère sur 4'); setLap(R, 'normal'); return; }
  if(pos === 2){
    step(R, 'af.2', '2 critères sur 4 : critères complémentaires');
    var s = [
      C(R, 'lars', 'LARS < 18 %', ok(d.lars) ? f(d.lars) + ' %' : '', cmp(d.lars, '<', 18), '< 18 %'),
      C(R, 'pvsd', 'S/D veineux pulmonaire < 1', ok(d.pvsd) ? f(d.pvsd, 2) : '', cmp(d.pvsd, '<', 1), '< 1'),
      C(R, 'bmi', 'IMC > 30 kg/m²', ok(d.bmi) ? f(d.bmi, 1) : '', cmp(d.bmi, '>', 30), '> 30 kg/m²')
    ];
    var sp = s.filter(function(x){ return x.abn === true; }).length, sm = s.filter(function(x){ return x.abn === null; });
    if(sp >= 2){ step(R, 'af.s23', sp + ' critères complémentaires sur 3'); setLap(R, 'elevated'); return; }
    if(sp === 0 && sm.length <= 1){ step(R, 'af.s0', 'Aucun critère complémentaire'); setLap(R, 'normal'); return; }
    sm.forEach(function(x){ need(R, x.k, x.label.replace(/ [<>].*$/, ''), 'Critère complémentaire en FA'); });
    step(R, 'af.s1', sp === 1 ? '1 seul critère complémentaire' : 'Critères complémentaires non disponibles');
    setLap(R, 'indeterminate'); return;
  }
  step(R, 'af.miss', 'Données insuffisantes'); setLap(R, 'indeterminate');
}
function mac25(d, R){
  R.algo = 'mac25';
  C(R, 'ea', 'E/A', ok(d.ea) ? f(d.ea, 2) : '', ok(d.ea) ? (d.ea > 1.8 ? true : d.ea < 0.8 ? false : null) : null, '< 0,8 normal ; > 1,8 élevé');
  if(!ok(d.ea)){ need(R, 'ea', 'Ondes E et A', 'Point d’entrée de l’algorithme MAC'); setLap(R, 'indeterminate'); return; }
  if(d.ea < 0.8){ step(R, 'mac.lo', 'E/A < 0,8'); setLap(R, 'normal'); return; }
  if(d.ea > 1.8){ step(R, 'mac.hi', 'E/A > 1,8'); setLap(R, 'elevated'); return; }
  step(R, 'mac.mid', 'E/A entre 0,8 et 1,8 : TRIV');
  C(R, 'ivrt', 'TRIV < 80 ms', ok(d.ivrt) ? f(d.ivrt) + ' ms' : '', cmp(d.ivrt, '<', 80), '< 80 ms');
  if(!ok(d.ivrt)){ need(R, 'ivrt', 'TRIV', 'Départage les E/A entre 0,8 et 1,8'); setLap(R, 'indeterminate'); return; }
  if(d.ivrt >= 80){ step(R, 'mac.ivl', 'TRIV ≥ 80 ms'); setLap(R, 'normal'); }
  else { step(R, 'mac.ivs', 'TRIV < 80 ms'); setLap(R, 'elevated'); }
}
function ph25(d, R){
  R.algo = 'ph25';
  R.notes.push('HTP : utiliser le E/e′ latéral (septum souvent aplati).');
  C(R, 'ea', 'E/A', ok(d.ea) ? f(d.ea, 2) + (ok(d.e) ? ' (E ' + f(d.e) + ' cm/s)' : '') : '', null, '≤ 0,8 avec E ≤ 50 ; ≥ 2 avec e′ réduite');
  if(!ok(d.ea)){ need(R, 'ea', 'Ondes E et A', 'Point d’entrée de l’algorithme HTP'); setLap(R, 'indeterminate'); return; }
  if(d.ea <= 0.8 && d.e <= 50){ step(R, 'ph.lo', 'E/A ≤ 0,8 et E ≤ 50 cm/s'); setLap(R, 'normal'); return; }
  var er = eReduced(d);
  if(d.ea >= 2 && er){ step(R, 'ph.hi', 'E/A ≥ 2 et e′ réduite'); setLap(R, 'elevated'); return; }
  if(d.ea >= 2 && er === null) need(R, 'e′', 'e′ septal et latéral', 'E/A ≥ 2 : conclut si e′ est réduite');
  step(R, 'ph.mid', d.ea >= 2 ? 'E/A ≥ 2 sans e′ réduite démontrée : LARS' : 'E/A intermédiaire : LARS');
  if(ok(d.lars)){
    C(R, 'lars', 'LARS ≤ 18 %', f(d.lars) + ' %', d.lars <= 18, '≤ 18 %');
    if(d.lars > 18){ step(R, 'ph.lars+', 'LARS > 18 %'); setLap(R, 'normal'); }
    else { step(R, 'ph.lars-', 'LARS ≤ 18 %'); setLap(R, 'elevated'); }
    return;
  }
  step(R, 'ph.nolars', 'LARS non disponible : E/e′ latéral');
  C(R, 'eelat', 'E/e′ latéral', ok(d.eelat) ? f(d.eelat, 1) : '', ok(d.eelat) ? (d.eelat > 13 ? true : d.eelat < 8 ? false : null) : null, '< 8 normal ; > 13 élevé');
  if(!ok(d.eelat)){ need(R, 'lars', 'LARS ou E/e′ latéral', 'Nécessaire si E/A est intermédiaire'); setLap(R, 'indeterminate'); return; }
  if(d.eelat < 8){ step(R, 'ph.ee8', 'E/e′ latéral < 8'); setLap(R, 'normal'); return; }
  if(d.eelat > 13){ step(R, 'ph.ee13', 'E/e′ latéral > 13'); setLap(R, 'elevated'); return; }
  step(R, 'ph.eemid', 'E/e′ latéral entre 8 et 13'); need(R, 'lars', 'LARS', 'E/e′ latéral entre 8 et 13 : non concluant');
  setLap(R, 'indeterminate');
}
function htx25(d, R){
  R.algo = 'htx25';
  C(R, 'ee', 'E/e′ moyen', ok(d.eeavg) ? f(d.eeavg, 1) : '', ok(d.eeavg) ? (d.eeavg > 14 ? true : d.eeavg < 7 ? false : null) : null, '< 7 normal ; > 14 élevé');
  if(!ok(d.eeavg)){ need(R, 'e′', 'E, e′ septal et latéral', 'E/e′ moyen'); setLap(R, 'indeterminate'); return; }
  if(d.eeavg < 7){ step(R, 'htx.lo', 'E/e′ moyen < 7'); setLap(R, 'normal'); return; }
  if(d.eeavg > 14){ step(R, 'htx.hi', 'E/e′ moyen > 14'); setLap(R, 'elevated'); return; }
  step(R, 'htx.mid', 'E/e′ moyen entre 7 et 14');
  if(ok(d.esr)){
    C(R, 'esr', 'E / SRIVR', f(d.esr) + ' cm', d.esr > 200, '> 200 cm');
    step(R, d.esr > 200 ? 'htx.sr+' : 'htx.sr-', 'E/SRIVR ' + (d.esr > 200 ? '> 200 cm' : '≤ 200 cm'));
    setLap(R, d.esr > 200 ? 'elevated' : 'normal'); return;
  }
  if(ok(d.trv)){
    C(R, 'tr', 'Vmax IT', f(d.trv, 1) + ' m/s', d.trv > 2.8, '> 2,8 m/s');
    step(R, d.trv > 2.8 ? 'htx.tr+' : 'htx.tr-', 'SRIVR non disponible : Vmax IT ' + (d.trv > 2.8 ? '> 2,8' : '≤ 2,8') + ' m/s');
    setLap(R, d.trv > 2.8 ? 'elevated' : 'normal'); return;
  }
  need(R, 'srivr', 'SRIVR (strain rate de relaxation isovolumique) ou Vmax IT', 'E/e′ entre 7 et 14');
  setLap(R, 'indeterminate');
}
// Valvulopathies mitrales et CMH : indicateurs du tableau 7, sans algorithme validé — synthèse à la majorité
function indicators(d, R, list, label){
  R.algo = 'ind25';
  list.forEach(function(x){ C(R, x[0], x[1], x[2], x[3], x[4]); if(x[3] === null) need(R, x[0], x[1].replace(/ [<>≤≥(].*$/, ''), 'Indicateur du tableau 7'); });
  var av = R.crit.filter(function(c){ return c.abn !== null; }), pos = av.filter(function(c){ return c.abn; }).length;
  R.notes.push(label + ' : pas d’algorithme validé ; synthèse indicative à partir des indicateurs du tableau 7, à interpréter dans le contexte.');
  if(av.length < 2){ step(R, 'ind.na', 'Moins de 2 indicateurs disponibles'); setLap(R, 'indeterminate'); return; }
  if(pos > av.length / 2){ step(R, 'ind.pos', pos + ' indicateur(s) sur ' + av.length + ' en faveur de pressions élevées'); setLap(R, 'elevated'); return; }
  if(pos < av.length / 2){ step(R, 'ind.neg', pos + ' indicateur(s) sur ' + av.length); setLap(R, 'normal'); return; }
  step(R, 'ind.eq', pos + ' indicateur(s) sur ' + av.length + ' (50 %)'); setLap(R, 'indeterminate');
}
function special(d, R, pop){
  if(pop === 'af') return af25(d, R);
  if(pop === 'mac') return mac25(d, R);
  if(pop === 'ph') return ph25(d, R);
  if(pop === 'htx') return htx25(d, R);
  if(pop === 'ms') return indicators(d, R, [
    ['ivrt', 'TRIV < 60 ms', ok(d.ivrt) ? f(d.ivrt) + ' ms' : '', cmp(d.ivrt, '<', 60), '< 60 ms'],
    ['a', 'Onde A > 1,5 m/s', ok(d.a) ? f(d.a / 100, 2) + ' m/s' : '', cmp(d.a, '>', 150), '> 1,5 m/s'],
    ['tee', 'TRIV / TE-e′ < 4,2', ok(d.ivrtTee) ? f(d.ivrtTee, 1) : '', cmp(d.ivrtTee, '<', 4.2), '< 4,2']], 'Rétrécissement mitral');
  if(pop === 'mr'){
    var L = [
      ['ivrt', 'TRIV < 60 ms', ok(d.ivrt) ? f(d.ivrt) + ' ms' : '', cmp(d.ivrt, '<', 60), '< 60 ms'],
      ['ara', 'Ar–A ≥ 30 ms', ok(d.ara) ? f(d.ara) + ' ms' : '', cmp(d.ara, '>=', 30), '≥ 30 ms'],
      ['tee', 'TRIV / TE-e′ < 5,6', ok(d.ivrtTee) ? f(d.ivrtTee, 1) : '', cmp(d.ivrtTee, '<', 5.6), '< 5,6']];
    if(ok(d.lvef) && d.lvef < 50) L.push(['ee', 'E/e′ moyen > 14 (FEVG altérée)', ok(d.eeavg) ? f(d.eeavg, 1) : '', cmp(d.eeavg, '>', 14), '> 14']);
    return indicators(d, R, L, 'Insuffisance mitrale');
  }
  if(pop === 'hcm') return indicators(d, R, [
    ['ee', 'E/e′ moyen > 14', ok(d.eeavg) ? f(d.eeavg, 1) : '', cmp(d.eeavg, '>', 14), '> 14'],
    ['ara', 'Ar–A ≥ 30 ms', ok(d.ara) ? f(d.ara) + ' ms' : '', cmp(d.ara, '>=', 30), '≥ 30 ms'],
    ['tr', 'Vmax IT > 2,8 m/s', ok(d.trv) ? f(d.trv, 1) + ' m/s' : '', cmp(d.trv, '>', 2.8), '> 2,8 m/s'],
    ['lavi', laName(d, 'VOGi > 34 mL/m²'), laVal(d), laAbn(d), laThr(d)]], 'Cardiomyopathie hypertrophique');
  // Réparation / prothèse mitrale / TEER, constriction, assistance : algorithme non applicable
  R.algo = 'na';
  step(R, 'na', 'Algorithme principal non applicable');
  R.title = 'Algorithme non applicable'; R.lvl = 'abn'; R.lap = null;
  R.notes.push(pop === 'mvs' ? 'Après réparation, remplacement mitral ou TEER : l’évaluation repose sur les intervalles de temps et les pressions pulmonaires (Vmax IT / PAPS), à interpréter au cas par cas.' : 'Constriction péricardique ou assistance ventriculaire : évaluation spécialisée, hors du champ de cet outil.');
}

/* ---------- Phrase de compte rendu ---------- */
function sentence(d, R){
  var p = [];
  if(ok(d.ea)) p.push('E/A ' + f(d.ea, 2));
  if(ok(d.es) || ok(d.el)) p.push('e′ ' + eTxt(d));
  if(ok(d.eeavg)) p.push('E/e′ moyen ' + f(d.eeavg, 1)); else if(ok(d.eesep)) p.push('E/e′ septal ' + f(d.eesep, 1)); else if(ok(d.eelat)) p.push('E/e′ latéral ' + f(d.eelat, 1));
  if(ok(d.trv)) p.push('Vmax IT ' + f(d.trv, 1) + ' m/s');
  if(ok(d.lavi)) p.push('VOGi ' + f(d.lavi) + ' mL/m²'); else if(ok(d.laa)) p.push('surface OG ' + f(d.laa) + ' cm²');
  if(ok(d.lars)) p.push('LARS ' + f(d.lars) + ' %');
  if(ok(d.pvsd)) p.push('S/D VP ' + f(d.pvsd, 2));
  if(ok(d.ivrt)) p.push('TRIV ' + f(d.ivrt) + ' ms');
  var g = R.guideline === '2016' && R.pop === 'std' ? 'ASE/EACVI 2016' : 'ASE 2025';
  var ctx = R.pop !== 'std' ? ' (' + R.popLabel.charAt(0).toLowerCase() + R.popLabel.slice(1) + ')' : '';
  return R.title + (R.lapTxt ? ', ' + R.lapTxt : '') + ctx + ', selon les recommandations ' + g + '.' + (p.length ? ' ' + p.join(', ') + '.' : '');
}

function diastolic(inp, opt){
  inp = inp || {}; opt = opt || {};
  var g = opt.guideline === '2016' ? '2016' : '2025';
  var pop = inp.rhythm === 'af' ? 'af' : POPS[inp.pop] ? inp.pop : 'std';
  var d = derive(inp), R = Res(g, pop);
  if(pop !== 'std'){
    special(d, R, pop);
    if(g === '2016') R.notes.unshift('Population particulière : algorithme spécifique ASE 2025 appliqué (pas d’algorithme formel en 2016).');
  }
  else if(g === '2016') algo16(d, R);
  else main25(d, R);
  if(R.algo !== 'na') R.sentence = sentence(d, R);
  R.derived = {ea:d.ea, eavg:d.eavg, eeavg:d.eeavg, eesep:d.eesep, eelat:d.eelat, myo:d.myo};
  return R;
}

root.CS = root.CS || {};
root.CS.diastolic = diastolic;
root.CS.diastolic.POPS = POPS;
root.CS.diastolic.REFS = {r2016:REF16, r2025:REF25};
})(typeof window !== 'undefined' ? window : globalThis);
