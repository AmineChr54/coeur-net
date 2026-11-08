/* CardioSuite — générateur d'ECG synthétique 12 dérivations (window.ECG)
   Modèle vectoriel : chaque onde est une gaussienne portée par un vecteur 3D (x = gauche, y = inférieur, z = antérieur)
   projeté sur l'axe de chaque dérivation. Échelle : 25 mm/s, 10 mm/mV. */
(function(){
  'use strict';
  var LEADS = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
  function limb(d){ var r = d * Math.PI / 180; return [Math.cos(r), Math.sin(r), 0]; }
  function prec(d, y){ var r = d * Math.PI / 180; return [Math.cos(r), y || 0, Math.sin(r)]; }
  var LV = {I:limb(0), II:limb(60), III:limb(120), aVR:limb(-150), aVL:limb(-30), aVF:limb(90),
    V1:prec(115, 0), V2:prec(92, 0), V3:prec(72, 0.05), V4:prec(52, 0.15), V5:prec(28, 0.2), V6:prec(5, 0.2)};
  var GAIN = {I:1, II:1, III:1, aVR:0.9, aVL:0.9, aVF:0.95, V1:1.25, V2:1.35, V3:1.3, V4:1.25, V5:1.15, V6:1};
  function dot(a, b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function C(c, s1, s2, amp, vec, kind){ return {c:c, s1:s1, s2:s2 == null ? s1 : s2, a:amp, v:vec, k:kind || ''}; }

  /* ---------- Morphologies (temps relatifs au début du QRS, en s) ---------- */
  function morph(name, o){
    o = o || {};
    var qrs, tw, st = [], dur = 0.09, tAmp = 0.32;
    var normalQRS = [C(0.015, 0.008, null, 0.22, [-0.55, 0.15, 0.82], 'q'), C(0.042, 0.011, null, 1.5, [0.75, 0.55, -0.35], 'R'), C(0.07, 0.011, null, 0.55, [-0.55, -0.45, -0.7], 'S')];
    var T = function(tp, s1, s2, amp, vec){ return C(tp, s1, s2, amp, vec, 'T'); };
    switch(name){
      case 'lbbb': case 'escape':
        qrs = [C(0.035, 0.02, null, 0.9, [0.85, 0.15, -0.5], 'R'), C(0.095, 0.025, null, 1.1, [0.9, 0.0, -0.45], 'R')]; dur = 0.15;
        tw = function(tp){ return [T(tp, 0.06, 0.04, 0.42, [-0.7, -0.2, 0.65]), C(dur + 0.07, 0.05, null, 0.12, [-0.7, -0.2, 0.65], 'ST')]; };
        break;
      case 'rbbb':
        qrs = [normalQRS[0], normalQRS[1], C(0.072, 0.012, null, 0.45, [-0.55, -0.45, -0.7], 'S'), C(0.105, 0.017, null, 0.72, [-0.65, 0.05, 0.75], 'R')]; dur = 0.13;
        tw = function(tp){ return [T(tp, 0.05, 0.035, 0.3, [0.75, 0.55, -0.3])]; };
        break;
      case 'lvh':
        qrs = [normalQRS[0], C(0.045, 0.012, null, 2.6, [0.75, 0.5, -0.35], 'R'), C(0.075, 0.012, null, 1.0, [-0.5, -0.4, -0.75], 'S')]; dur = 0.1;
        tw = function(tp){ return [T(tp, 0.06, 0.035, 0.28, [-0.6, -0.15, 0.45]), C(dur + 0.06, 0.05, null, 0.1, [-0.6, -0.2, 0.4], 'ST')]; };
        break;
      case 'wpw':
        qrs = [C(0.032, 0.026, null, 0.45, [0.6, 0.5, 0.45], 'D'), C(0.072, 0.012, null, 1.4, [0.75, 0.55, -0.15], 'R'), C(0.1, 0.012, null, 0.35, [-0.55, -0.45, -0.6], 'S')]; dur = 0.13;
        tw = function(tp){ return [T(tp, 0.05, 0.035, 0.18, [-0.2, 0.4, -0.35])]; };
        break;
      case 'pvc':
        qrs = [C(0.05, 0.03, null, 1.6, [-0.25, 0.85, 0.6], 'R'), C(0.12, 0.03, null, 0.8, [0.2, 0.3, -0.7], 'S')]; dur = 0.16;
        tw = function(tp){ return [T(tp - 0.02, 0.06, 0.05, 0.55, [0.25, -0.8, -0.5])]; };
        break;
      case 'vt':
        qrs = [C(0.05, 0.03, null, 1.7, [-0.6, -0.5, 0.45], 'R'), C(0.12, 0.03, null, 0.9, [0.4, 0.4, -0.6], 'S')]; dur = 0.17;
        tw = function(tp){ return [T(tp - 0.04, 0.05, 0.04, 0.45, [0.6, 0.5, -0.4])]; };
        break;
      default:
        qrs = normalQRS.slice();
        tw = function(tp){ return [T(tp, o.tS1 || 0.05, o.tS2 || 0.032, o.tAmp || tAmp, [0.65, 0.6, 0.45])]; };
    }
    if(name === 'stemi-ant'){
      qrs[0] = C(0.016, 0.009, null, 0.28, [0.1, 0.1, -0.7], 'q');
      tw = function(tp){ return [T(tp, 0.06, 0.04, 0.6, [0.3, 0.1, 0.95]), C(0.09 + (tp - 0.09) * 0.45, 0.06, 0.07, 0.32, [0.15, -0.25, 1.0], 'ST')]; };
    }
    if(name === 'stemi-inf'){
      qrs.unshift(C(0.014, 0.009, null, 0.32, [0.05, -0.9, 0], 'q'));
      tw = function(tp){ return [T(tp, 0.06, 0.04, 0.5, [-0.1, 0.9, 0.1]), C(0.09 + (tp - 0.09) * 0.45, 0.06, 0.07, 0.3, [-0.25, 1.0, 0.05], 'ST')]; };
    }
    if(name === 'pericarditis'){
      tw = function(tp){ return [T(tp, 0.055, 0.035, 0.34, [0.6, 0.6, 0.45]), C(0.09 + (tp - 0.09) * 0.45, 0.07, 0.07, 0.15, [0.55, 0.75, 0.45], 'ST')]; };
    }
    if(name === 'hyperk'){
      tw = function(tp){ return [T(tp, 0.032, 0.026, 0.95, [0.55, 0.5, 0.65])]; };
    }
    if(name === 'longqt'){
      tw = function(tp){ return [T(tp, 0.075, 0.045, 0.28, [0.65, 0.6, 0.45])]; };
    }
    return {qrs:qrs, tw:tw, dur:dur};
  }
  var P_WAVE = function(c){ return C(c, 0.022, 0.024, 0.14, [0.5, 0.8, 0.2], 'P'); };

  /* ---------- Catalogue des tracés ---------- */
  var TYPES = {
    'normal':      {label:'Rythme sinusal normal', hr:72},
    'tachy':       {label:'Tachycardie sinusale', hr:118},
    'brady':       {label:'Bradycardie sinusale', hr:46},
    'af':          {label:'Fibrillation atriale', hr:96},
    'flutter':     {label:'Flutter atrial 2:1', hr:150},
    'flutter41':   {label:'Flutter atrial 4:1', hr:75},
    'svt':         {label:'Tachycardie jonctionnelle (TRIN)', hr:182},
    'avb1':        {label:'BAV du 1er degré', hr:68},
    'mobitz1':     {label:'BAV 2 Mobitz I (Wenckebach)', hr:62},
    'mobitz2':     {label:'BAV 2 Mobitz II', hr:56},
    'avb3':        {label:'BAV complet (3e degré)', hr:38},
    'lbbb':        {label:'Bloc de branche gauche', hr:74},
    'rbbb':        {label:'Bloc de branche droit', hr:70},
    'stemi-ant':   {label:'STEMI antérieur', hr:88},
    'stemi-inf':   {label:'STEMI inférieur', hr:62},
    'pericarditis':{label:'Péricardite aiguë', hr:96},
    'lvh':         {label:'Hypertrophie ventriculaire gauche', hr:70},
    'wpw':         {label:'Pré-excitation (WPW)', hr:76},
    'longqt':      {label:'QT long', hr:64},
    'hyperk':      {label:'Hyperkaliémie', hr:68},
    'pvc':         {label:'Extrasystoles ventriculaires', hr:76},
    'vt':          {label:'Tachycardie ventriculaire', hr:168}
  };

  function rng(seed){ var a = seed >>> 0; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- Génération ---------- */
  function generate(type, opt){
    opt = opt || {};
    var def = TYPES[type] || TYPES.normal, R = rng(opt.seed || 7), fs = opt.fs || 500, dur = opt.duration || 10;
    var N = Math.round(fs * dur), out = {}; LEADS.forEach(function(l){ out[l] = new Float32Array(N); });
    var hr = opt.hr || def.hr, beats = [], pr = 0.16, qtc = 0.41, m = type, atrial = null;
    var mName = {'stemi-ant':'stemi-ant','stemi-inf':'stemi-inf','pericarditis':'pericarditis','lvh':'lvh','wpw':'wpw','lbbb':'lbbb','rbbb':'rbbb','hyperk':'hyperk','longqt':'longqt'}[type] || 'normal';
    if(type === 'longqt') qtc = 0.56;
    if(type === 'wpw') pr = 0.1;
    if(type === 'avb1') pr = 0.3;
    if(type === 'hyperk') qtc = 0.39;
    var t = 0.35 + R() * 0.25, i = 0;
    function addBeat(tq, p, mm, extra){ beats.push(Object.assign({t:tq, p:p, m:mm}, extra || {})); }
    if(['normal','tachy','brady','avb1','lbbb','rbbb','stemi-ant','stemi-inf','pericarditis','lvh','wpw','longqt','hyperk'].indexOf(type) >= 0){
      while(t < dur + 0.5){ var rr = 60 / hr * (1 + (R() - 0.5) * 0.04); addBeat(t, t - pr, mName); t += rr; }
    } else if(type === 'af'){
      while(t < dur + 0.5){ addBeat(t, null, 'normal'); t += (60 / hr) * (0.6 + R() * 0.85); }
    } else if(type === 'flutter'){
      atrial = {kind:'flutter', cl:0.2};
      t = 0.33; while(t < dur + 0.5){ addBeat(t, null, 'normal'); t += 0.4; }
    } else if(type === 'flutter41'){
      atrial = {kind:'flutter', cl:0.2};
      t = 0.33; while(t < dur + 0.5){ addBeat(t, null, 'normal'); t += 0.8; }
    } else if(type === 'svt'){
      while(t < dur + 0.5){ addBeat(t, null, 'normal', {retroP:true}); t += 60 / hr; }
    } else if(type === 'mobitz1'){
      var prs = [0.16, 0.25, 0.31, null], pp = 60 / 82, pt = 0.25, k = 0;
      while(pt < dur + 0.5){ var cur = prs[k % 4]; if(cur != null) addBeat(pt + cur, pt, 'normal'); else beats.push({t:null, p:pt}); pt += pp; k++; }
      pr = 0.16;
    } else if(type === 'mobitz2'){
      var pp2 = 60 / 84, pt2 = 0.3, k2 = 0;
      while(pt2 < dur + 0.5){ if(k2 % 3 !== 2) addBeat(pt2 + 0.18, pt2, 'rbbb'); else beats.push({t:null, p:pt2}); pt2 += pp2; k2++; }
      pr = 0.18;
    } else if(type === 'avb3'){
      var pp3 = 60 / 92, pt3 = 0.15; while(pt3 < dur + 0.5){ beats.push({t:null, p:pt3}); pt3 += pp3; }
      t = 0.6; while(t < dur + 0.5){ addBeat(t, null, 'escape'); t += 60 / hr; }
      pr = null;
    } else if(type === 'pvc'){
      var rr0 = 60 / hr, n = 0; t = 0.4;
      while(t < dur + 0.5){
        n++;
        if(n % 4 === 0){ var tp = beats[beats.length - 1].t + 0.46; addBeat(tp, null, 'pvc'); t = beats[beats.length - 2].t + 2 * rr0; }
        else { addBeat(t, t - pr, 'normal'); t += rr0; }
      }
    } else if(type === 'vt'){
      t = 0.2; while(t < dur + 0.5){ addBeat(t, null, 'vt'); t += 60 / hr; }
      var pp4 = 60 / 78, pt4 = 0.4; while(pt4 < dur + 0.5){ beats.push({t:null, p:pt4, dissoc:true}); pt4 += pp4; }
    }
    // Composantes absolues
    var comps = [];
    var conducted = beats.filter(function(b){ return b.t != null; });
    var meanRR = conducted.length > 1 ? (conducted[conducted.length - 1].t - conducted[0].t) / (conducted.length - 1) : 60 / hr;
    var qt = qtc * Math.sqrt(meanRR);
    beats.forEach(function(b){
      if(b.p != null) comps.push(Object.assign({}, P_WAVE(b.p + 0.045), {a:b.dissoc ? 0.1 : 0.14}));
      if(type === 'pericarditis' && b.p != null) comps.push(C(b.p + 0.13, 0.04, null, 0.05, [-0.5, -0.8, -0.2], 'Ta'));
      if(b.t == null) return;
      var mo = morph(b.m);
      var q = b.m === 'escape' || b.m === 'pvc' || b.m === 'vt' ? Math.max(qt, 0.42) : qt;
      mo.qrs.forEach(function(c){ comps.push(Object.assign({}, c, {c:b.t + c.c})); });
      mo.tw(q - 0.085).forEach(function(c){ comps.push(Object.assign({}, c, {c:b.t + c.c})); });
      if(b.retroP) comps.push(C(b.t + 0.07, 0.014, null, 0.1, [-0.3, -0.85, 0.3], 'P'));
    });
    comps.forEach(function(c){
      var coef = LEADS.map(function(l){ return c.a * dot(c.v, LV[l]) * GAIN[l]; });
      var i0 = Math.max(0, Math.floor((c.c - 4.5 * c.s1) * fs)), i1 = Math.min(N - 1, Math.ceil((c.c + 4.5 * c.s2) * fs));
      for(var j = i0; j <= i1; j++){
        var tt = j / fs, d = tt - c.c, s = d < 0 ? c.s1 : c.s2, g = Math.exp(-d * d / (2 * s * s));
        for(var L = 0; L < 12; L++) out[LEADS[L]][j] += coef[L] * g;
      }
    });
    // Activité atriale continue, dérive et bruit
    var phase = R() * 6.28, fVec = [0.35, 0.55, 0.75], flVec = [0.15, -1, 0.55];
    var fCoef = LEADS.map(function(l){ return dot(fVec, LV[l]) * GAIN[l]; }), flCoef = LEADS.map(function(l){ return dot(flVec, LV[l]) * GAIN[l]; });
    var noiseAmp = opt.noise == null ? 0.012 : opt.noise;
    for(var j = 0; j < N; j++){
      var tt = j / fs;
      var wander = 0.025 * Math.sin(2 * Math.PI * 0.21 * tt + phase) + 0.012 * Math.sin(2 * Math.PI * 0.47 * tt + 1.3 * phase);
      var af = 0, fl = 0;
      if(type === 'af') af = 0.045 * (Math.sin(2 * Math.PI * 6.2 * tt + phase) + 0.7 * Math.sin(2 * Math.PI * 7.9 * tt + 2 * phase) + 0.5 * Math.sin(2 * Math.PI * 5.1 * tt + 0.4));
      // Flutter typique (antihoraire) : plateau descendant lent, pointe négative brève, remontée rapide
      // → « dents de scie » négatives nettes en D2, D3, aVF ; ondes F positives en V1. Revu après l'avis d'Anis (nov. 2026).
      if(atrial){
        var ph = ((tt + 0.03) % atrial.cl) / atrial.cl, w;
        if(ph < 0.5) w = -0.35 * (ph / 0.5);
        else if(ph < 0.68) w = -0.35 - 0.65 * ((ph - 0.5) / 0.18);
        else if(ph < 0.9) w = -1 + 1.15 * ((ph - 0.68) / 0.22);
        else w = 0.15 - 0.15 * ((ph - 0.9) / 0.1);
        fl = 0.3 * w + 0.12;
      }
      for(var L2 = 0; L2 < 12; L2++){
        var nz = noiseAmp * ((R() + R() + R() - 1.5));
        out[LEADS[L2]][j] += wander * (L2 < 6 ? 1 : 0.6) + af * fCoef[L2] + fl * flCoef[L2] + nz;
      }
    }
    // Axe : aire nette du QRS en D1 et aVF sur un battement conduit
    var axis = null, ref = conducted[Math.min(2, conducted.length - 1)];
    if(ref){
      var mo2 = morph(ref.m), a1 = 0, aF = 0;
      mo2.qrs.forEach(function(c){ var area = c.a * (c.s1 + c.s2) / 2; a1 += area * dot(c.v, LV.I); aF += area * dot(c.v, LV.aVF); });
      axis = Math.round(Math.atan2(aF, a1) * 180 / Math.PI);
    }
    var qrsDur = ref ? morph(ref.m).dur : 0.09;
    var vrate = Math.round(60 / meanRR);
    var meta = describe(type, {hr:vrate, pr:pr, qrs:qrsDur, qt:qt, qtc:qtc, axis:axis, meanRR:meanRR});
    return {fs:fs, duration:dur, leads:out, type:type, label:def.label, meta:meta};
  }

  function axisCat(a){ if(a == null) return '–'; if(a >= -30 && a <= 90) return 'Normal'; if(a < -30 && a >= -90) return 'Déviation gauche'; if(a > 90 && a <= 180) return 'Déviation droite'; return 'Extrême'; }

  function describe(type, x){
    var ms = function(s){ return Math.round(s * 1000); };
    var m = {
      hr:x.hr, pr:x.pr != null ? ms(x.pr) : null, qrs:ms(x.qrs), qt:ms(x.qt), qtc:ms(x.qtc), axis:x.axis, axisCat:axisCat(x.axis),
      regular:['af','mobitz1','mobitz2','pvc'].indexOf(type) < 0,
      rhythm:'Sinusal', st:'Normal', dx:'', points:[]
    };
    var R = {
      'normal':['Sinusal','Normal','ECG normal : rythme sinusal, PR et QRS normaux, axe normal, pas de trouble de la repolarisation.'],
      'tachy':['Sinusal','Normal','Tachycardie sinusale. Rechercher une cause : fièvre, anémie, hypovolémie, douleur, EP, hyperthyroïdie.'],
      'brady':['Sinusal','Normal','Bradycardie sinusale. Vérifier les traitements bradycardisants (bêtabloquant, ivabradine) et la TSH.'],
      'af':['Fibrillation atriale','Normal','Fibrillation atriale : rythme irrégulièrement irrégulier, absence d’onde P, trémulations de la ligne de base. Calculer le CHA₂DS₂-VA.'],
      'flutter':['Flutter atrial','Normal','Flutter atrial typique avec conduction 2:1 : ondes F en dents de scie négatives en D2, D3, aVF à 300/min, fréquence ventriculaire à 150/min.'],
      'flutter41':['Flutter atrial','Normal','Flutter atrial typique avec conduction 4:1 : ondes F en dents de scie bien visibles en D2, D3, aVF à 300/min, positives en V1, fréquence ventriculaire à 75/min.'],
      'svt':['Jonctionnel','Normal','Tachycardie régulière à QRS fins à environ 180/min, sans onde P visible (pseudo-r′ en V1) : tachycardie par réentrée intranodale. Manœuvres vagales puis adénosine.'],
      'avb1':['Sinusal','Normal','BAV du 1er degré : PR fixe allongé à 300 ms, chaque P est suivie d’un QRS.'],
      'mobitz1':['Sinusal','Normal','BAV du 2e degré Mobitz I : allongement progressif du PR jusqu’à une onde P bloquée (périodes de Luciani-Wenckebach). Généralement nodal, bénin.'],
      'mobitz2':['Sinusal','Normal','BAV du 2e degré Mobitz II : PR fixe avec ondes P bloquées de façon inopinée, sur bloc de branche droit. Infranodal : indication de stimulation.'],
      'avb3':['Dissociation AV','Secondaire','BAV complet : ondes P régulières sans relation avec des QRS larges d’échappement ventriculaire lent (≈ 38/min). Stimulation en urgence.'],
      'lbbb':['Sinusal','Secondaire','Bloc de branche gauche complet : QRS ≥ 120 ms, aspect QS en V1, R large crocheté en D1, aVL, V5–V6, troubles de repolarisation secondaires discordants.'],
      'rbbb':['Sinusal','Secondaire','Bloc de branche droit complet : QRS ≥ 120 ms, rsR′ en V1, S large et empâtée en D1 et V6, T négatives en V1–V2.'],
      'stemi-ant':['Sinusal','Sus-décalage antérieur','STEMI antérieur : sus-décalage du ST de V1 à V4 avec ondes T amples, miroir inférieur. Occlusion probable de l’IVA : ICP primaire.'],
      'stemi-inf':['Sinusal','Sus-décalage inférieur','STEMI inférieur : sus-décalage du ST en D2, D3, aVF (D3 > D2 : coronaire droite probable), miroir en D1 et aVL. Enregistrer V3R–V4R et V7–V9.'],
      'pericarditis':['Sinusal','Sus-décalage diffus','Péricardite aiguë : sus-décalage du ST diffus et concave, sous-décalage de PR, miroir en aVR seulement.'],
      'lvh':['Sinusal','Secondaire','Hypertrophie ventriculaire gauche : indice de Sokolow-Lyon (SV1 + RV5) > 35 mm, avec aspect de surcharge (sous-décalage ST et T négatives en latéral).'],
      'wpw':['Sinusal','Secondaire','Pré-excitation ventriculaire (Wolff-Parkinson-White) : PR court (< 120 ms), onde delta, QRS élargi, repolarisation secondaire.'],
      'longqt':['Sinusal','Normal','QT long : QTc ≈ 560 ms. Rechercher une cause médicamenteuse ou électrolytique (K⁺, Mg²⁺, Ca²⁺) ; risque de torsades de pointes.'],
      'hyperk':['Sinusal','Ondes T pointues','Hyperkaliémie : ondes T amples, pointues et symétriques, à base étroite. Doser le potassium en urgence ; gluconate de calcium si troubles ECG.'],
      'pvc':['Sinusal','Normal','Rythme sinusal avec extrasystoles ventriculaires en quadrigéminisme : complexes prématurés larges, sans onde P, suivis d’un repos compensateur.'],
      'vt':['Ventriculaire','Secondaire','Tachycardie ventriculaire monomorphe : tachycardie régulière à QRS larges (≈ 170/min) avec dissociation AV. Choc électrique si instable, sinon amiodarone.']
    }[type] || ['Sinusal','Normal',''];
    m.rhythm = R[0]; m.st = R[1]; m.dx = R[2];
    if(type === 'af' || type === 'flutter' || type === 'flutter41' || type === 'svt' || type === 'vt' || type === 'avb3') m.pr = null;
    return m;
  }

  /* ---------- Rendu ---------- */
  function colors(){
    var cs = getComputedStyle(document.documentElement);
    var g = function(n, d){ var v = cs.getPropertyValue(n).trim(); return v || d; };
    return {paper:g('--paper', '#fff8f6'), minor:g('--grid-minor', '#f5cfcf'), major:g('--grid-major', '#e59a9a'), trace:g('--trace', '#111'), label:g('--fg-2', '#333')};
  }
  function setup(canvas, wmm, hmm, cssW){
    var dpr = window.devicePixelRatio || 1, pxmm = cssW / wmm;
    canvas.style.width = cssW + 'px'; canvas.style.height = (hmm * pxmm) + 'px';
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(hmm * pxmm * dpr);
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return {ctx:ctx, pxmm:pxmm};
  }
  function grid(ctx, pxmm, wmm, hmm, col){
    ctx.fillStyle = col.paper; ctx.fillRect(0, 0, wmm * pxmm, hmm * pxmm);
    ctx.lineWidth = 1;
    if(pxmm >= 2.2){
      ctx.strokeStyle = col.minor; ctx.beginPath();
      for(var x = 0; x <= wmm; x++){ if(x % 5){ ctx.moveTo(Math.round(x * pxmm) + .5, 0); ctx.lineTo(Math.round(x * pxmm) + .5, hmm * pxmm); } }
      for(var y = 0; y <= hmm; y++){ if(y % 5){ ctx.moveTo(0, Math.round(y * pxmm) + .5); ctx.lineTo(wmm * pxmm, Math.round(y * pxmm) + .5); } }
      ctx.stroke();
    }
    ctx.strokeStyle = col.major; ctx.beginPath();
    for(var x2 = 0; x2 <= wmm; x2 += 5){ ctx.moveTo(Math.round(x2 * pxmm) + .5, 0); ctx.lineTo(Math.round(x2 * pxmm) + .5, hmm * pxmm); }
    for(var y2 = 0; y2 <= hmm; y2 += 5){ ctx.moveTo(0, Math.round(y2 * pxmm) + .5); ctx.lineTo(wmm * pxmm, Math.round(y2 * pxmm) + .5); }
    ctx.stroke();
  }
  function trace(ctx, data, fs, t0, t1, x0mm, baseMm, pxmm, col){
    var i0 = Math.round(t0 * fs), i1 = Math.min(data.length - 1, Math.round(t1 * fs));
    ctx.strokeStyle = col.trace; ctx.lineWidth = Math.max(1.1, pxmm * 0.32); ctx.lineJoin = 'round'; ctx.beginPath();
    for(var i = i0; i <= i1; i++){
      var x = (x0mm + (i / fs - t0) * 25) * pxmm, y = (baseMm - data[i] * 10) * pxmm;
      if(i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  function calPulse(ctx, x0, base, pxmm, col){
    ctx.strokeStyle = col.trace; ctx.lineWidth = Math.max(1.1, pxmm * 0.32); ctx.beginPath();
    ctx.moveTo(x0 * pxmm, base * pxmm); ctx.lineTo((x0 + 1) * pxmm, base * pxmm); ctx.lineTo((x0 + 1) * pxmm, (base - 10) * pxmm);
    ctx.lineTo((x0 + 6) * pxmm, (base - 10) * pxmm); ctx.lineTo((x0 + 6) * pxmm, base * pxmm); ctx.lineTo((x0 + 7) * pxmm, base * pxmm); ctx.stroke();
  }
  function label(ctx, txt, xmm, ymm, pxmm, col){
    ctx.fillStyle = col.label; ctx.font = '600 ' + Math.max(10, pxmm * 3.2) + 'px "Segoe UI",system-ui,sans-serif'; ctx.fillText(txt, xmm * pxmm, ymm * pxmm);
  }
  /* Disposition standard 3 × 4 + D2 long. Renvoie la géométrie (mm) pour les étriers. */
  function draw12(canvas, ecg, cssW){
    var col = colors(), left = 8, colW = 62.5, rowH = 30, top = 4, wmm = left + 4 * colW + 2, hmm = top + 4 * rowH + 2;
    var s = setup(canvas, wmm, hmm, cssW), ctx = s.ctx, pxmm = s.pxmm;
    grid(ctx, pxmm, wmm, hmm, col);
    var layout = [['I','aVR','V1','V4'], ['II','aVL','V2','V5'], ['III','aVF','V3','V6']];
    for(var r = 0; r < 3; r++){
      var base = top + rowH * r + rowH * 0.6;
      calPulse(ctx, 0.6, base, pxmm, col);
      for(var c = 0; c < 4; c++){
        var L = layout[r][c], t0 = c * 2.5;
        trace(ctx, ecg.leads[L], ecg.fs, t0, t0 + 2.5, left + c * colW, base, pxmm, col);
        label(ctx, L, left + c * colW + 1.2, top + rowH * r + 6, pxmm, col);
        if(c > 0){ ctx.strokeStyle = col.trace; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo((left + c * colW) * pxmm, (base - 3) * pxmm); ctx.lineTo((left + c * colW) * pxmm, (base + 3) * pxmm); ctx.stroke(); }
      }
    }
    var b4 = top + rowH * 3 + rowH * 0.6;
    calPulse(ctx, 0.6, b4, pxmm, col);
    trace(ctx, ecg.leads.II, ecg.fs, 0, 10, left, b4, pxmm, col);
    label(ctx, 'II', left + 1.2, top + rowH * 3 + 6, pxmm, col);
    ctx.fillStyle = col.label; ctx.font = Math.max(9, pxmm * 2.6) + 'px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'right'; ctx.fillText('25 mm/s · 10 mm/mV', (wmm - 2) * pxmm, (hmm - 1.2) * pxmm); ctx.textAlign = 'left';
    return {pxmm:pxmm, wmm:wmm, hmm:hmm, left:left, msPerMm:40, mvPerMm:0.1};
  }
  function drawStrip(canvas, ecg, lead, cssW, opt){
    opt = opt || {};
    var col = colors(), secs = opt.seconds || ecg.duration, left = 8, wmm = left + secs * 25 + 2, hmm = opt.heightMm || 30;
    var s = setup(canvas, wmm, hmm, cssW), ctx = s.ctx, pxmm = s.pxmm;
    grid(ctx, pxmm, wmm, hmm, col);
    var base = hmm * 0.62;
    calPulse(ctx, 0.6, base, pxmm, col);
    trace(ctx, ecg.leads[lead || 'II'], ecg.fs, opt.t0 || 0, (opt.t0 || 0) + secs, left, base, pxmm, col);
    label(ctx, lead || 'II', left + 1.2, 5.5, pxmm, col);
    return {pxmm:pxmm, wmm:wmm, hmm:hmm, left:left, msPerMm:40, mvPerMm:0.1};
  }

  window.ECG = {LEADS:LEADS, TYPES:TYPES, generate:generate, draw12:draw12, drawStrip:drawStrip, axisCat:axisCat};
})();
