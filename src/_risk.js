/* Cœur Net — formules de risque partagées (window.RISK)
   Utilisées par « Scores de risque » et « Décision partagée ». Coefficients repris des publications originales :
   SCORE2 / SCORE2-OP (Eur Heart J 2021), SCORE2-Diabetes (Eur Heart J 2023), PCE (ACC/AHA 2013),
   EuroSCORE II (Nashef, Eur J Cardiothorac Surg 2012). */
(function(root){
  'use strict';
  function cockcroft(age, wt, creatMgdl, female){ if(!(age > 0 && wt > 0 && creatMgdl > 0)) return NaN; return (140 - age) * wt / (72 * creatMgdl) * (female ? 0.85 : 1); }
  function recal(risk, s1, s2){ return 1 - Math.exp(-Math.exp(s1 + s2 * Math.log(-Math.log(1 - risk)))); }
  var S2_CAL = { // SCORE2 : [scale1, scale2] hommes / femmes
    low:{m:[-0.5699,0.7476], f:[-0.7380,0.7019]}, moderate:{m:[-0.1565,0.8009], f:[-0.3143,0.7701]},
    high:{m:[0.3207,0.9360], f:[0.5710,0.9369]}, veryhigh:{m:[0.5836,0.8294], f:[0.9412,0.8329]} };
  var OP_CAL = {
    low:{m:[-0.34,1.19], f:[-0.52,1.01]}, moderate:{m:[0.01,1.25], f:[-0.10,1.10]},
    high:{m:[0.08,1.15], f:[0.38,1.09]}, veryhigh:{m:[0.05,0.70], f:[0.38,0.69]} };
  // o: female, age, smoker, sbp (mmHg), tc et hdl (mmol/L), region ('low'|'moderate'|'high'|'veryhigh')
  function score2(o){
    var cage = (o.age - 60) / 5, csbp = (o.sbp - 120) / 20, ctc = o.tc - 6, chdl = (o.hdl - 1.3) / 0.5, sm = o.smoker ? 1 : 0, x, S0;
    if(!o.female){ x = 0.3742*cage + 0.6012*sm + 0.2777*csbp + 0.1458*ctc - 0.2698*chdl - 0.0755*cage*sm - 0.0255*cage*csbp - 0.0281*cage*ctc + 0.0426*cage*chdl; S0 = 0.9605; }
    else { x = 0.4648*cage + 0.7744*sm + 0.3131*csbp + 0.1002*ctc - 0.2606*chdl - 0.1088*cage*sm - 0.0277*cage*csbp - 0.0226*cage*ctc + 0.0613*cage*chdl; S0 = 0.9776; }
    var raw = 1 - Math.pow(S0, Math.exp(x)); var c = S2_CAL[o.region][o.female ? 'f' : 'm'];
    return recal(raw, c[0], c[1]);
  }
  function score2op(o){
    var cage = o.age - 73, csbp = o.sbp - 150, ctc = o.tc - 6, chdl = o.hdl - 1.4, sm = o.smoker ? 1 : 0, dm = o.diabetes ? 1 : 0, x, S0, mean;
    if(!o.female){ x = 0.0634*cage + 0.4245*dm + 0.3524*sm + 0.0094*csbp + 0.0850*ctc - 0.3564*chdl - 0.0174*cage*dm - 0.0247*cage*sm - 0.0005*cage*csbp + 0.0073*cage*ctc + 0.0091*cage*chdl; S0 = 0.7576; mean = 0.0929; }
    else { x = 0.0789*cage + 0.6010*dm + 0.4921*sm + 0.0102*csbp + 0.0605*ctc - 0.3040*chdl - 0.0107*cage*dm - 0.0255*cage*sm - 0.0004*cage*csbp - 0.0009*cage*ctc + 0.0154*cage*chdl; S0 = 0.8082; mean = 0.2290; }
    var raw = 1 - Math.pow(S0, Math.exp(x - mean)); var c = OP_CAL[o.region][o.female ? 'f' : 'm'];
    return recal(raw, c[0], c[1]);
  }
  // + agediab (ans), a1c (mmol/mol), egfr (mL/min/1,73 m²)
  function score2dm(o){
    var cage = (o.age - 60) / 5, csbp = (o.sbp - 120) / 20, ctc = o.tc - 6, chdl = (o.hdl - 1.3) / 0.5, sm = o.smoker ? 1 : 0;
    var cad = (o.agediab - 50) / 5, ca1c = (o.a1c - 31) / 9.34, ce = (Math.log(o.egfr) - 4.5) / 0.15, x, S0;
    if(!o.female){ x = 0.5368*cage + 0.4774*sm + 0.1322*csbp + 0.6457 + 0.1102*ctc - 0.1087*chdl - 0.0672*cage*sm - 0.0268*cage*csbp - 0.0983*cage - 0.0181*cage*ctc + 0.0095*cage*chdl - 0.0998*cad + 0.0955*ca1c - 0.0591*ce + 0.0058*ce*ce - 0.0134*ca1c*cage + 0.0115*ce*cage; S0 = 0.9605; }
    else { x = 0.6624*cage + 0.6139*sm + 0.1421*csbp + 0.8096 + 0.1127*ctc - 0.1568*chdl - 0.1122*cage*sm - 0.0167*cage*csbp - 0.1272*cage - 0.0200*cage*ctc + 0.0186*cage*chdl - 0.1180*cad + 0.1173*ca1c - 0.0640*ce + 0.0062*ce*ce - 0.0196*ca1c*cage + 0.0169*ce*cage; S0 = 0.9776; }
    var raw = 1 - Math.pow(S0, Math.exp(x)); var c = S2_CAL[o.region][o.female ? 'f' : 'm'];
    return recal(raw, c[0], c[1]);
  }
  function pce(o){ // ASCVD (AHA/ACC 2013), unités mg/dL
    var la = Math.log(o.age), lt = Math.log(o.tc), lh = Math.log(o.hdl), ls = Math.log(o.sbp), sm = o.smoker ? 1 : 0, dm = o.diabetes ? 1 : 0, t = o.treated, s, S0, mean;
    if(o.female && !o.aa){ s = -29.799*la + 4.884*la*la + 13.540*lt - 3.114*la*lt - 13.578*lh + 3.149*la*lh + (t ? 2.019 : 1.957)*ls + 7.574*sm - 1.665*la*sm + 0.661*dm; S0 = 0.9665; mean = -29.18; }
    else if(o.female){ s = 17.114*la + 0.940*lt - 18.920*lh + 4.475*la*lh + (t ? 29.291*ls - 6.432*la*ls : 27.820*ls - 6.087*la*ls) + 0.691*sm + 0.874*dm; S0 = 0.9533; mean = 86.61; }
    else if(!o.aa){ s = 12.344*la + 11.853*lt - 2.664*la*lt - 7.990*lh + 1.769*la*lh + (t ? 1.797 : 1.764)*ls + 7.837*sm - 1.795*la*sm + 0.658*dm; S0 = 0.9144; mean = 61.18; }
    else { s = 2.469*la + 0.302*lt - 0.307*lh + (t ? 1.916 : 1.809)*ls + 0.549*sm + 0.645*dm; S0 = 0.8954; mean = 19.54; }
    return 1 - Math.pow(S0, Math.exp(s - mean));
  }
  /* Seuils ESC 2021 (prévention) selon l'âge : [élevé, très élevé] en % à 10 ans */
  function score2Thresholds(age){ return age < 50 ? [2.5, 7.5] : age < 70 ? [5, 10] : [7.5, 15]; }
  /* EuroSCORE II. v : age, female, cc (clairance mL/min, ou NaN) | renal ('n'|'m'|'s'|'dial'), art, mob, redo, lung, endo,
     crit, ins, nyha (1–4), ccs4, lv ('g'|'m'|'p'|'vp'), mi, pa ('n'|'m'|'s'), urg ('e'|'u'|'em'|'s'), wt ('0'..'3'), aorta */
  function euroscore2(v){
    var y = -5.324537;
    y += 0.0285181 * Math.max(1, v.age - 59);
    if(v.female) y += 0.2196434;
    var renal = v.renal || (v.dial ? 'dial' : v.cc < 50 ? 's' : v.cc <= 85 ? 'm' : 'n');
    y += {n:0, m:0.303553, s:0.8592256, dial:0.6421508}[renal];
    if(v.art) y += 0.5360268; if(v.mob) y += 0.2407181; if(v.redo) y += 1.118599; if(v.lung) y += 0.1886564; if(v.endo) y += 0.6194522; if(v.crit) y += 1.086517; if(v.ins) y += 0.3542749;
    y += {1:0, 2:0.1070545, 3:0.2958358, 4:0.5597929}[v.nyha || 1]; if(v.ccs4) y += 0.2226147;
    y += {g:0, m:0.3150652, p:0.8084096, vp:0.9346919}[v.lv || 'g']; if(v.mi) y += 0.1528943;
    y += {n:0, m:0.1788899, s:0.3491475}[v.pa || 'n']; y += {e:0, u:0.3174673, em:0.7039121, s:1.362947}[v.urg || 'e'];
    y += {0:0, 1:0.0062118, 2:0.5521478, 3:0.9724533}[v.wt == null ? 1 : v.wt]; if(v.aorta) y += 0.6527205;
    return Math.exp(y) / (1 + Math.exp(y)) * 100;
  }
  /* Globorisk (version « laboratoire »), calibré pour la Tunisie.
     Ueda P et al., Lancet Diabetes Endocrinol 2017 ; Hajifathalian K et al., ibid. 2015.
     Portage fidèle du paquet R globorisk (boyercb, licence MIT) : modèle de Cox centré sur les moyennes
     nationales des facteurs de risque par âge et sexe, taux de base nationaux d'événements CV (fatals + non fatals)
     pour chacune des 10 années de suivi. Données : window.GLOBO (fichier _globorisk_tun.js).
     o : female (bool), age (40–80), sbp (mmHg), tc (mmol/L), dm (bool), smoker (bool) → risque à 10 ans (0–1) */
  function globorisk(o, D){
    D = D || root.GLOBO;
    if(!D || !(o.age >= 40) || o.age > 80) return NaN;
    var sex = o.female ? 1 : 0, age = Math.trunc(o.age), agec = age < 85 ? Math.trunc(age / 5) - 7 : 10;
    var m = null;
    for(var i = 0; i < D.rf.length; i++){ var r = D.rf[i]; if(r.sex === sex && r.agec === agec){ m = r; break; } }
    var base = D.cvd[sex + '-' + age];
    if(!m || !base) return NaN;
    var c = D.coef;
    var sbpc = o.sbp / 10 - m.mean_sbp, tcc = o.tc - m.mean_tc, dmc = (o.dm ? 1 : 0) - m.mean_dm, smkc = (o.smoker ? 1 : 0) - m.mean_smk;
    var surv = 1;
    for(var t = 0; t < 10; t++){
      var lp = sbpc * c.main_sbpc + tcc * c.main_tcc + dmc * c.main__Idm_1 + smkc * c.main_smok +
        sex * dmc * c.main_sexdm + sex * smkc * c.main_sexsmok +
        (age + t) * (sbpc * c.tvc_sbpc + tcc * c.tvc_tcc + dmc * c.tvc_dm + smkc * c.tvc_smok);
      surv *= Math.exp(-Math.exp(lp) * base[t]);
    }
    return 1 - surv;
  }

  /* HbA1c % -> mmol/mol (IFCC) */
  function a1cToMmol(pct){ return (pct - 2.15) * 10.929; }
  root.RISK = {cockcroft:cockcroft, score2:score2, score2op:score2op, score2dm:score2dm, pce:pce, score2Thresholds:score2Thresholds, euroscore2:euroscore2, globorisk:globorisk, a1cToMmol:a1cToMmol};
})(typeof window !== 'undefined' ? window : globalThis);
