/* Cœur Net — utilitaires communs (window.CS)
   Langue : français par défaut, arabe standard (RTL) en option. Les textes sont des objets {fr, ar}
   (et parfois {tn} = derja, réservé aux écrans destinés au patient). Changer de langue recharge la page. */
(function(){
  'use strict';
  var P = 'cn.';
  var VERSION = 'v1.0 · novembre 2026';
  var SCHEMA = 1;

  /* ---------- Stockage local (adaptateur : une synchro serveur pourra s'y brancher plus tard) ---------- */
  var sync = { onChange:function(){} };            // remplacé par un vrai adaptateur le jour où barkhaus sera branché
  var store = {
    get: function(k, d){ try{ var v = localStorage.getItem(P+k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
    set: function(k, v){ try{ localStorage.setItem(P+k, JSON.stringify(v)); sync.onChange(k, v); }catch(e){} },
    del: function(k){ try{ localStorage.removeItem(P+k); sync.onChange(k, undefined); }catch(e){} },
    keys: function(){ var out = []; try{ for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(k && k.indexOf(P) === 0) out.push(k.slice(P.length)); } }catch(e){} return out; }
  };
  (function migrate(){ var v = store.get('schema', 0); if(v < SCHEMA) store.set('schema', SCHEMA); })();

  /* ---------- Langue ---------- */
  // ?lang=ar dans l'adresse force la langue (lien à partager) et la mémorise
  try{ var qp = new URLSearchParams(location.search).get('lang'); if(qp === 'ar' || qp === 'fr') store.set('lang', qp); }catch(e){}
  var LANG = store.get('lang', 'fr') === 'ar' ? 'ar' : 'fr';
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  function lang(){ return LANG; }
  function isAr(){ return LANG === 'ar'; }
  function setLang(l){ if(l === LANG) return; store.set('lang', l); location.reload(); }
  // t('texte') -> 'texte' ; t({fr, ar}) -> selon la langue ; t({fr, ar, tn}, 'tn') -> langue forcée
  function t(x, force){
    if(x == null) return '';
    if(typeof x !== 'object') return String(x);
    var l = force || LANG;
    return x[l] != null ? x[l] : (x.fr != null ? x.fr : '');
  }

  /* ---------- Thème ---------- */
  function applyTheme(){
    var th = store.get('theme', null);
    document.documentElement.setAttribute('data-theme', th === 'dark' ? 'dark' : 'light');
  }
  applyTheme();
  function isDark(){ return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function setTheme(th){ store.set('theme', th); applyTheme(); window.dispatchEvent(new Event('cs-theme')); }
  function toggleTheme(){ setTheme(isDark() ? 'light' : 'dark'); }
  window.addEventListener('storage', function(e){
    if(e.key === P+'theme'){ applyTheme(); window.dispatchEvent(new Event('cs-theme')); }
    if(e.key === P+'doctor'){ refreshDoctor(); }
    if(e.key === P+'lang'){ location.reload(); }
  });
  function css(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  /* ---------- DOM ---------- */
  function $(s, r){ return (r||document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
  function h(tag, attrs){
    var el = document.createElement(tag);
    if(attrs) for(var k in attrs){
      var v = attrs[k];
      if(v == null || v === false) continue;
      if(k === 'class') el.className = v;
      else if(k === 'html') el.innerHTML = v;
      else if(k === 'text') el.textContent = t(v);
      else if(k.slice(0,2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if(k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : (typeof v === 'object' ? t(v) : v));
    }
    for(var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c){
    if(c == null || c === false) return;
    if(Array.isArray(c)) c.forEach(function(x){ add(el, x); });
    else if(c.nodeType) el.appendChild(c);
    else el.appendChild(document.createTextNode(t(c)));
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  /* ---------- Format (chiffres occidentaux dans les deux langues, comme en Tunisie) ---------- */
  function fmt(n, d){
    if(n == null || isNaN(n)) return '–';
    d = d == null ? 0 : d;
    return Number(n).toLocaleString('fr-FR', {minimumFractionDigits:d, maximumFractionDigits:d});
  }
  function pct(n, d){ return fmt(n, d == null ? 1 : d) + ' %'; }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function num(v){ if(typeof v === 'number') return v; if(v == null) return NaN; v = String(v).replace(',', '.').trim(); return v === '' ? NaN : Number(v); }
  function todayISO(off){ var d = new Date(); if(off) d.setDate(d.getDate()+off); return d.toISOString().slice(0,10); }
  function locale(l){ return (l || LANG) === 'ar' ? 'ar-TN-u-nu-latn' : 'fr-FR'; }
  function frDate(iso){ if(!iso) return ''; var d = new Date(iso); if(isNaN(d)) return iso; return d.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric'}); }
  function frDateLong(iso, l){ var d = iso ? new Date(iso) : new Date(); return d.toLocaleDateString(locale(l), {day:'numeric', month:'long', year:'numeric'}); }

  /* ---------- Unités ---------- */
  var conv = {
    creat: {si:'µmol/L', mgdl:'mg/dL', f:88.4},
    chol:  {si:'mmol/L', mgdl:'mg/dL', f:1/38.67},
    gluc:  {si:'mmol/L', mgdl:'mg/dL', f:1/18.016},
    hb:    {si:'g/L',    mgdl:'g/dL',  f:10}
  };
  function units(){ return store.get('units', 'mgdl'); }
  function setUnits(u){ store.set('units', u); window.dispatchEvent(new Event('cs-units')); syncUnitSeg(); }
  function unitLabel(kind){ return conv[kind][units()]; }
  function toMgdl(kind, v){ return units() === 'si' ? v / conv[kind].f : v; }
  function fromMgdl(kind, v){ return units() === 'si' ? v * conv[kind].f : v; }

  /* ---------- Médecin ---------- */
  function doctor(){ return (store.get('doctor', '') || '').trim(); }
  function doctorLabel(){ var n = doctor().replace(/^dr\.?\s*/i, ''); return n ? t({fr:'Dr ', ar:'د. '}) + n : t({fr:'Dr …', ar:'د. …'}); }
  function refreshDoctor(){ $$('[data-cs-doctor]').forEach(function(el){ el.textContent = doctorLabel(); }); window.dispatchEvent(new Event('cs-doctor')); }

  /* ---------- Patient en cours (anonyme, partagé entre les outils) ---------- */
  function patient(){ return store.get('patient', {}) || {}; }
  function setPatient(p){ store.set('patient', p); window.dispatchEvent(new Event('cs-patient')); }
  // Surface corporelle (m²) : Mosteller par défaut, Du Bois au choix
  function bsa(heightCm, weightKg, formula){
    var hh = num(heightCm), w = num(weightKg);
    if(!(hh > 0) || !(w > 0)) return NaN;
    if(formula === 'dubois') return 0.007184 * Math.pow(w, 0.425) * Math.pow(hh, 0.725);
    return Math.sqrt(hh * w / 3600);
  }

  /* ---------- Icônes ---------- */
  var I = {
    back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    heart:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7l1.1 1.1L12 22l7.7-7.6 1.1-1.1a5.4 5.4 0 0 0 0-7.7z" opacity=".55"/><path d="M3 12h4l2-4 3 8 2-4h7"/></svg>',
    copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
    home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
    bolt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>'
  };

  /* ---------- Les outils de Cœur Net (accueil, menu, barre du bas) ---------- */
  var TOOLS = [
    {id:'diastolique', grp:'echo', min:2,
      name:{fr:'Fonction diastolique', ar:'الوظيفة الانبساطية'},
      d:{fr:'L’algorithme ASE 2025 pas à pas : grade, pressions de remplissage, phrase du compte rendu.', ar:'خوارزمية ASE 2025 خطوة بخطوة: الدرجة وضغوط الامتلاء وجملة التقرير.'}},
    {id:'echo', grp:'echo', min:5,
      name:{fr:'Compte rendu d’écho', ar:'تقرير تخطيط الصدى'},
      d:{fr:'Saisie structurée, valeurs anormales signalées, compte rendu prêt à copier ou imprimer.', ar:'إدخال منظَّم وتمييز القيم غير الطبيعية وتقرير جاهز للنسخ أو الطباعة.'}},
    {id:'consentement', grp:'patient', min:4,
      name:{fr:'Consentement éclairé', ar:'الموافقة المستنيرة'},
      d:{fr:'Expliquer la procédure au patient, puis imprimer un formulaire en français ou en arabe.', ar:'شرح الإجراء للمريض ثم طباعة استمارة بالفرنسية أو بالعربية.'}},
    {id:'decision', grp:'patient', min:3,
      name:{fr:'Décision partagée', ar:'القرار المشترك'},
      d:{fr:'Construire le profil du patient : risque calculé, niveau de danger et options en images.', ar:'بناء ملف المريض: خطر محسوب ومستوى الخطورة والخيارات بالصور.'}},
    {id:'education', grp:'patient', min:3,
      name:{fr:'Éducation patient', ar:'تثقيف المريض'},
      d:{fr:'Stent, infarctus, TAVI, pacemaker… expliqués avec des illustrations animées.', ar:'الدعامة والاحتشاء وTAVI والمنظِّم… مشروحة برسوم متحركة.'}},
    {id:'scores', grp:'calc', min:1,
      name:{fr:'Scores de risque', ar:'مقاييس الخطر'},
      d:{fr:'SCORE2, CHA₂DS₂-VA, GRACE, EuroSCORE II… 20 scores avec interprétation.', ar:'SCORE2 وCHA₂DS₂-VA وGRACE وEuroSCORE II… عشرون مقياسًا مع التفسير.'}},
    {id:'quiz', grp:'learn', min:5,
      name:{fr:'Quiz de cardiologie', ar:'اختبار أمراض القلب'},
      d:{fr:'Cas difficiles d’ECG, d’écho et de clinique. XP, niveaux, badges et coups critiques.', ar:'حالات صعبة في تخطيط القلب والصدى والسريريات. نقاط خبرة ومستويات وشارات.'}}
  ];
  var GROUPS = [
    {id:'echo', name:{fr:'Échographie', ar:'تخطيط الصدى'}},
    {id:'patient', name:{fr:'Avec le patient', ar:'مع المريض'}},
    {id:'calc', name:{fr:'Calcul', ar:'الحساب'}},
    {id:'learn', name:{fr:'Formation', ar:'التكوين'}}
  ];
  function tool(id){ for(var i = 0; i < TOOLS.length; i++) if(TOOLS[i].id === id) return TOOLS[i]; return null; }
  function group(id){ for(var i = 0; i < GROUPS.length; i++) if(GROUPS[i].id === id) return GROUPS[i]; return null; }
  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';

  /* ---------- Toast, copier, télécharger ---------- */
  var toastEl, toastT;
  function toast(msg){
    if(!toastEl){ toastEl = h('div', {class:'cs-toast', role:'status', 'aria-live':'polite'}); document.body.appendChild(toastEl); }
    toastEl.textContent = t(msg); toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, 2400);
  }
  function copy(text, okMsg){
    var ok1 = okMsg || {fr:'Copié dans le presse-papiers', ar:'تم النسخ'};
    function fallback(){
      var ta = h('textarea', {style:{position:'fixed', left:'-9999px', top:'0'}}); ta.value = text; document.body.appendChild(ta);
      ta.select(); var ok = false; try{ ok = document.execCommand('copy'); }catch(e){}
      ta.remove(); toast(ok ? ok1 : {fr:'Copie impossible : sélectionnez le texte à la main', ar:'تعذّر النسخ: حدِّد النص يدويًا'});
    }
    try{
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ toast(ok1); }, fallback);
      else fallback();
    }catch(e){ fallback(); }
  }
  function download(name, content, mime){
    try{
      var blob = new Blob([content], {type:(mime || 'text/plain') + ';charset=utf-8'});
      var a = h('a', {href:URL.createObjectURL(blob), download:name}); document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast({fr:'Fichier « ' + name + ' » enregistré', ar:'تم حفظ الملف « ' + name + ' »'});
    }catch(e){ toast({fr:'Téléchargement impossible ici', ar:'التنزيل غير ممكن هنا'}); }
  }
  function toCSV(rows, cols){
    var sep = ';';
    function cell(v){ v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var out = [cols.map(function(c){ return cell(c.label || c.key); }).join(sep)];
    rows.forEach(function(r){ out.push(cols.map(function(c){ return cell(typeof c.get === 'function' ? c.get(r) : r[c.key]); }).join(sep)); });
    return '﻿' + out.join('\r\n');
  }

  /* ---------- Sauvegarde : exporter / importer toutes les données de cet appareil ---------- */
  function exportBackup(){
    var data = {};
    store.keys().forEach(function(k){ data[k] = store.get(k); });
    var payload = {app:'coeur-net', schema:SCHEMA, date:new Date().toISOString(), data:data};
    download('coeur-net-sauvegarde-' + todayISO() + '.json', JSON.stringify(payload, null, 1), 'application/json');
  }
  function applyBackup(p){
    if(!p || p.app !== 'coeur-net' || !p.data || typeof p.data !== 'object') return false;
    store.keys().forEach(function(k){ store.del(k); });
    Object.keys(p.data).forEach(function(k){ store.set(k, p.data[k]); });
    return true;
  }
  function importBackup(){
    var inp = h('input', {type:'file', accept:'application/json,.json', style:{display:'none'}});
    inp.addEventListener('change', function(){
      var f = inp.files && inp.files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = function(){
        var p; try{ p = JSON.parse(r.result); }catch(e){ p = null; }
        if(!p || p.app !== 'coeur-net'){ toast({fr:'Ce fichier n’est pas une sauvegarde Cœur Net', ar:'هذا الملف ليس نسخة احتياطية من Cœur Net'}); return; }
        ask({fr:'Remplacer les données de cet appareil par la sauvegarde du ' + frDate(p.date) + ' ?', ar:'استبدال بيانات هذا الجهاز بالنسخة الاحتياطية بتاريخ ' + frDate(p.date) + '؟'}, {fr:'Remplacer', ar:'استبدال'}).then(function(ok){
          if(ok && applyBackup(p)) location.reload();
        });
      };
      r.readAsText(f);
    });
    document.body.appendChild(inp); inp.click(); setTimeout(function(){ inp.remove(); }, 60000);
  }

  /* ---------- Modale (remplace confirm/prompt) ; feuille du bas sur téléphone ---------- */
  function modal(content, opts){
    opts = opts || {};
    var bg = h('div', {class:'modal-bg' + (opts.sheet ? ' sheet' : ''), role:'dialog', 'aria-modal':'true'});
    var box = h('div', {class:'modal'}, content);
    bg.appendChild(box);
    var prev = document.activeElement;
    function close(){ bg.remove(); document.removeEventListener('keydown', onKey); if(!$('.modal-bg')) document.body.classList.remove('noscroll'); if(prev && prev.focus) try{ prev.focus(); }catch(e){} if(opts.onClose) opts.onClose(); }
    function onKey(e){ if(e.key === 'Escape') close(); }
    bg.addEventListener('click', function(e){ if(e.target === bg) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg); document.body.classList.add('noscroll');
    var f = box.querySelector('[autofocus],input,select,textarea,button.primary'); if(f && !opts.noFocus) setTimeout(function(){ f.focus(); }, 30);
    return {close:close, el:box};
  }
  function ask(message, okLabel){
    return new Promise(function(res){
      var m, done = false;
      function fin(v){ if(done) return; done = true; res(v); }
      var content = h('div', {class:'stack'},
        h('p', {text:message}),
        h('div', {class:'row end'},
          h('button', {class:'btn', text:{fr:'Annuler', ar:'إلغاء'}, onclick:function(){ fin(false); m.close(); }}),
          h('button', {class:'btn primary', text:okLabel || {fr:'Confirmer', ar:'تأكيد'}, onclick:function(){ fin(true); m.close(); }})
        ));
      m = modal(content, {onClose:function(){ fin(false); }});
    });
  }

  /* ---------- Contrôles segmentés ---------- */
  function seg(el, value, onChange){
    var btns = $$('button', el);
    function set(v, silent){
      value = v;
      btns.forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.v === String(v) ? 'true' : 'false'); });
      if(!silent && onChange) onChange(v);
    }
    btns.forEach(function(b){ b.type = 'button'; b.addEventListener('click', function(){ set(b.dataset.v); }); });
    set(value, true);
    return {get:function(){ return value; }, set:set};
  }
  function segEl(opts, value, onChange, cls){
    var el = h('div', {class:'seg ' + (cls || ''), role:'group'});
    opts.forEach(function(o){ el.appendChild(h('button', {type:'button', 'data-v':String(o[0]), text:o[1]})); });
    el.ctl = seg(el, String(value), onChange);
    return el;
  }
  function syncUnitSeg(){ $$('.cs-unitseg button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.v === units() ? 'true' : 'false'); }); }

  /* ---------- Fenêtres communes : nom du médecin, patient en cours, réglages, menu des outils ---------- */
  function editDoctor(){
    var inp = h('input', {class:'inp', id:'cs-doc-name', placeholder:{fr:'ex. Anis Ben Salah', ar:'مثال: أنيس بن صالح'}, value:doctor()});
    var m;
    function save(){ store.set('doctor', inp.value.trim()); refreshDoctor(); m.close(); toast({fr:'Nom enregistré', ar:'تم حفظ الاسم'}); }
    inp.addEventListener('keydown', function(e){ if(e.key === 'Enter') save(); });
    m = modal(h('div', {class:'stack'},
      h('h2', {text:{fr:'Nom du médecin', ar:'اسم الطبيب'}}),
      h('p', {class:'muted small', text:{fr:'Affiché dans les en-têtes, les formulaires et les comptes rendus. Enregistré sur cet appareil.', ar:'يظهر في الترويسات والاستمارات والتقارير. يُحفظ على هذا الجهاز.'}}),
      h('div', {class:'field'}, h('label', {for:'cs-doc-name', text:{fr:'Nom (sans « Dr »)', ar:'الاسم (دون «د.»)'}}), inp),
      h('div', {class:'row end'},
        h('button', {class:'btn', text:{fr:'Annuler', ar:'إلغاء'}, onclick:function(){ m.close(); }}),
        h('button', {class:'btn primary', text:{fr:'Enregistrer', ar:'حفظ'}, onclick:save}))
    ));
  }
  function patientSummary(p){
    p = p || patient();
    var parts = [];
    if(p.sex) parts.push(t(p.sex === 'f' ? {fr:'Femme', ar:'امرأة'} : {fr:'Homme', ar:'رجل'}));
    if(p.age) parts.push(p.age + t({fr:' ans', ar:' سنة'}));
    if(p.height && p.weight){ parts.push(fmt(p.height) + ' cm · ' + fmt(p.weight) + ' kg'); parts.push(t({fr:'SC ', ar:'م.س.ج '}) + fmt(bsa(p.height, p.weight), 2) + ' m²'); }
    if(p.rhythm) parts.push(t(p.rhythm === 'fa' ? {fr:'FA', ar:'رجفان أذيني'} : {fr:'Sinusal', ar:'نظم جيبي'}));
    return parts.join(' · ');
  }
  function editPatient(){
    var p = Object.assign({}, patient());
    var m;
    function numField(key, label, unit){
      var inp = h('input', {class:'inp', inputmode:'decimal', enterkeyhint:'next', value:p[key] == null ? '' : String(p[key]).replace('.', ',')});
      inp.addEventListener('input', function(){ var v = num(inp.value); p[key] = isNaN(v) ? null : v; paint(); });
      return h('div', {class:'field'}, h('label', {text:label}), h('div', {class:'inp-unit'}, inp, h('span', {class:'u', text:unit})));
    }
    var out = h('div', {class:'panel small'});
    function paint(){ var s = bsa(p.height, p.weight); out.textContent = isNaN(s) ? t({fr:'Taille et poids → surface corporelle (Mosteller) calculée automatiquement.', ar:'الطول والوزن ← تُحسب مساحة سطح الجسم (Mosteller) تلقائيًا.'}) : t({fr:'Surface corporelle (Mosteller) : ', ar:'مساحة سطح الجسم (Mosteller): '}) + fmt(s, 2) + ' m²'; }
    paint();
    m = modal(h('div', {class:'stack'},
      h('div', {class:'row between'}, h('h2', {text:{fr:'Patient en cours', ar:'المريض الحالي'}}), h('span', {class:'badge info', text:{fr:'anonyme', ar:'دون اسم'}})),
      h('p', {class:'muted small', text:{fr:'Ces valeurs pré-remplissent la fonction diastolique, les scores et la décision partagée. Aucun nom n’est demandé ; tout reste sur cet appareil.', ar:'تُعبِّئ هذه القيم مسبقًا الوظيفة الانبساطية والمقاييس والقرار المشترك. لا يُطلب أي اسم، ويبقى كل شيء على هذا الجهاز.'}}),
      h('div', {class:'grid g2'},
        numField('age', {fr:'Âge', ar:'السن'}, t({fr:'ans', ar:'سنة'})),
        h('div', {class:'field'}, h('label', {text:{fr:'Sexe', ar:'الجنس'}}), segEl([['m', {fr:'Homme', ar:'رجل'}], ['f', {fr:'Femme', ar:'امرأة'}]], p.sex || '', function(v){ p.sex = v; }, 'full')),
        numField('height', {fr:'Taille', ar:'الطول'}, 'cm'),
        numField('weight', {fr:'Poids', ar:'الوزن'}, 'kg'),
        h('div', {class:'field'}, h('label', {text:{fr:'Rythme', ar:'النظم'}}), segEl([['sinus', {fr:'Sinusal', ar:'جيبي'}], ['fa', {fr:'FA', ar:'رجفان أذيني'}]], p.rhythm || '', function(v){ p.rhythm = v; }, 'full'))),
      out,
      h('div', {class:'row between'},
        h('button', {class:'btn ghost danger', html:I.trash + '<span>' + esc(t({fr:'Nouveau patient', ar:'مريض جديد'})) + '</span>', onclick:function(){ setPatient({}); m.close(); toast({fr:'Patient effacé', ar:'تم مسح المريض'}); }}),
        h('div', {class:'row'},
          h('button', {class:'btn', text:{fr:'Annuler', ar:'إلغاء'}, onclick:function(){ m.close(); }}),
          h('button', {class:'btn primary', text:{fr:'Enregistrer', ar:'حفظ'}, onclick:function(){ setPatient(p); m.close(); toast({fr:'Patient enregistré', ar:'تم حفظ المريض'}); }})))
    ), {sheet:true, noFocus:true});
  }
  function settings(){
    var m;
    function rowItem(label, hint, ctl){ return h('div', {class:'set-row'}, h('div', {class:'set-l'}, h('div', {class:'set-t', text:label}), hint ? h('div', {class:'muted xs', text:hint}) : null), ctl); }
    m = modal(h('div', {class:'stack'},
      h('div', {class:'row between'}, h('h2', {text:{fr:'Réglages', ar:'الإعدادات'}}), h('button', {class:'icon-btn', 'aria-label':{fr:'Fermer', ar:'إغلاق'}, html:I.x, onclick:function(){ m.close(); }})),
      rowItem({fr:'Langue', ar:'اللغة'}, {fr:'Arabe : arabe standard, lu de droite à gauche', ar:'العربية الفصحى، من اليمين إلى اليسار'},
        segEl([['fr', 'Français'], ['ar', 'العربية']], LANG, setLang)),
      rowItem({fr:'Thème', ar:'المظهر'}, null, segEl([['light', {fr:'Clair', ar:'فاتح'}], ['dark', {fr:'Sombre', ar:'داكن'}]], isDark() ? 'dark' : 'light', setTheme)),
      rowItem({fr:'Unités biologiques', ar:'وحدات التحاليل'}, null, segEl([['mgdl', 'mg/dL'], ['si', 'SI']], units(), setUnits)),
      rowItem({fr:'Médecin', ar:'الطبيب'}, doctorLabel(), h('button', {class:'btn sm', text:{fr:'Modifier', ar:'تعديل'}, onclick:function(){ m.close(); editDoctor(); }})),
      rowItem({fr:'Patient en cours', ar:'المريض الحالي'}, patientSummary() || {fr:'Aucun', ar:'لا يوجد'}, h('button', {class:'btn sm', text:{fr:'Modifier', ar:'تعديل'}, onclick:function(){ m.close(); editPatient(); }})),
      h('div', {class:'divider'}),
      rowItem({fr:'Sauvegarde', ar:'النسخ الاحتياطي'}, {fr:'Pour passer d’un appareil à l’autre : exporter ici, importer là-bas.', ar:'للانتقال بين الأجهزة: صدِّر هنا واستورد هناك.'},
        h('div', {class:'row'},
          h('button', {class:'btn sm', html:I.download + '<span>' + esc(t({fr:'Exporter', ar:'تصدير'})) + '</span>', onclick:exportBackup}),
          h('button', {class:'btn sm', html:I.upload + '<span>' + esc(t({fr:'Importer', ar:'استيراد'})) + '</span>', onclick:function(){ m.close(); importBackup(); }}))),
      rowItem({fr:'PC sans Internet', ar:'حاسوب دون إنترنت'}, {fr:'Télécharger le site complet (.zip), le copier sur le PC (clé USB), dézipper et ouvrir index.html.', ar:'نزّل الموقع كاملًا (.zip) وانسخه إلى الحاسوب (مفتاح USB) ثم فكّ الضغط وافتح index.html.'},
        h('a', {class:'btn sm', href:'coeur-net-hors-ligne.zip', download:'', html:I.download + '<span>' + esc(t({fr:'Version hors ligne', ar:'نسخة دون اتصال'})) + '</span>'})),
      rowItem({fr:'Visites guidées', ar:'الجولات الإرشادية'}, {fr:'Les revoir à la prochaine ouverture de chaque outil.', ar:'إعادة عرضها عند فتح كل أداة.'},
        h('button', {class:'btn sm', html:I.reset + '<span>' + esc(t({fr:'Réactiver', ar:'إعادة تفعيل'})) + '</span>', onclick:function(){ store.keys().forEach(function(k){ if(k.indexOf('tour.') === 0) store.del(k); }); toast({fr:'Les visites guidées reviendront', ar:'ستظهر الجولات الإرشادية من جديد'}); }})),
      rowItem({fr:'Effacer toutes les données', ar:'مسح كل البيانات'}, {fr:'Remet l’application à zéro sur cet appareil.', ar:'يعيد التطبيق إلى حالته الأولى على هذا الجهاز.'},
        h('button', {class:'btn sm danger', html:I.trash + '<span>' + esc(t({fr:'Effacer', ar:'مسح'})) + '</span>', onclick:function(){
          ask({fr:'Effacer toutes les données de Cœur Net sur cet appareil ? Pensez à exporter une sauvegarde avant.', ar:'مسح كل بيانات Cœur Net على هذا الجهاز؟ يُستحسن تصدير نسخة احتياطية قبل ذلك.'}, {fr:'Tout effacer', ar:'مسح الكل'}).then(function(ok){ if(ok){ store.keys().forEach(function(k){ store.del(k); }); location.reload(); } });
        }})),
      h('p', {class:'muted xs', text:'Cœur Net ' + VERSION})
    ), {sheet:true, noFocus:true});
  }
  function toolMenu(){
    var m;
    var list = h('div', {class:'tm-list'});
    GROUPS.forEach(function(g){
      list.appendChild(h('div', {class:'tm-grp', text:g.name}));
      TOOLS.filter(function(x){ return x.grp === g.id; }).forEach(function(x){
        list.appendChild(h('a', {class:'tm-item g-' + x.grp + (x.id === PAGE ? ' on' : ''), href:x.id + '.html'},
          h('span', {class:'tm-ic', html:toolIcon(x.id)}),
          h('span', {class:'tm-tx'}, h('b', {text:x.name}), h('span', {class:'muted xs', text:x.d}))));
      });
    });
    m = modal(h('div', {class:'stack'},
      h('div', {class:'row between'}, h('h2', {text:{fr:'Tous les outils', ar:'كل الأدوات'}}), h('button', {class:'icon-btn', 'aria-label':{fr:'Fermer', ar:'إغلاق'}, html:I.x, onclick:function(){ m.close(); }})),
      list), {sheet:true, noFocus:true});
  }

  /* Petites icônes d'outil (trait, couleur héritée) */
  function toolIcon(id){
    var s = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">';
    var p = {
      diastolique:'<path d="M3 17c2.5 0 3-9 5.5-9s2.5 6 4.5 6 2-3 4-3 2 6 4 6"/><path d="M3 21h18" opacity=".45"/>',
      echo:'<path d="M12 3L4.5 18h15z" opacity=".5"/><path d="M8 13c1.5-1 6.5-1 8 0M9.5 9.5c1-.6 4-.6 5 0"/><path d="M5 21h14"/>',
      consentement:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 15.5h5"/>',
      decision:'<circle cx="7" cy="7" r="2"/><circle cx="17" cy="7" r="2"/><path d="M4 21v-5a3 3 0 0 1 6 0v5M14 21v-5a3 3 0 0 1 6 0v5"/><path d="M12 4v16" opacity=".4"/>',
      education:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M9 11h2l1-2 1 4 1-2h1"/>',
      scores:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
      quiz:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'
    }[id] || '';
    return s + p + '</svg>';
  }

  /* ---------- En-tête, pied de page, barre du bas (téléphone) ---------- */
  function init(o){
    o = o || {};
    var me = tool(PAGE);
    if(me) recordRecent(PAGE);
    if(me) document.title = t(me.name) + ' · Cœur Net';
    var top = document.getElementById('cs-top') || document.body.insertBefore(h('header', {id:'cs-top'}), document.body.firstChild);
    top.className = 'cs-top no-print';
    var actions = h('div', {class:'cs-actions'});
    if(o.actions) add(actions, o.actions);
    if(o.units){
      var us = h('div', {class:'seg cs-unitseg hide-sm', role:'group', 'aria-label':'Unités'},
        h('button', {'data-v':'mgdl', type:'button', text:'mg/dL'}), h('button', {'data-v':'si', type:'button', text:'SI'}));
      $$('button', us).forEach(function(b){ b.addEventListener('click', function(){ setUnits(b.dataset.v); }); });
      actions.appendChild(us);
    }
    actions.appendChild(h('button', {class:'btn ghost sm cs-doc hide-sm', type:'button', 'data-cs-doctor':'', title:{fr:'Modifier le nom du médecin', ar:'تعديل اسم الطبيب'}, onclick:editDoctor, text:doctorLabel()}));
    actions.appendChild(h('button', {class:'icon-btn cs-lang', type:'button', title:{fr:'العربية', ar:'Français'}, 'aria-label':{fr:'Passer en arabe', ar:'التبديل إلى الفرنسية'}, text:LANG === 'ar' ? 'Fr' : 'ع', onclick:function(){ setLang(LANG === 'ar' ? 'fr' : 'ar'); }}));
    if(o.tour !== false && CS.tour) actions.appendChild(h('button', {class:'icon-btn', id:'cs-help', type:'button', title:{fr:'Visite guidée', ar:'جولة إرشادية'}, 'aria-label':{fr:'Lancer la visite guidée', ar:'بدء الجولة الإرشادية'}, html:I.help, onclick:function(){ CS.tour.start(true); }}));
    actions.appendChild(h('button', {class:'icon-btn hide-sm', id:'cs-settings', type:'button', title:{fr:'Réglages', ar:'الإعدادات'}, 'aria-label':{fr:'Réglages', ar:'الإعدادات'}, html:I.gear, onclick:settings}));
    top.innerHTML = '';
    var isHome = PAGE === 'index';
    top.appendChild(h('div', {class:'cs-top-in'},
      isHome ? null : h('a', {class:'cs-back', href:'index.html', 'aria-label':{fr:'Retour à l’accueil', ar:'العودة إلى الرئيسية'}, html:I.back + '<span>' + esc(t({fr:'Accueil', ar:'الرئيسية'})) + '</span>'}),
      h('a', {class:'cs-brand', href:'index.html'},
        h('div', {class:'cs-logo', 'aria-hidden':'true', html:I.heart}),
        h('div', {class:'cs-titles'}, h('span', {class:'eyebrow', text:o.cat || (me ? group(me.grp).name : 'Cœur Net')}), h('h1', {text:o.title || (me ? me.name : 'Cœur Net')}))),
      actions));
    syncUnitSeg();
    var foot = document.getElementById('cs-foot') || document.body.appendChild(h('footer', {id:'cs-foot'}));
    foot.className = 'cs-foot no-print';
    var fi = h('div', {class:'cs-foot-in'},
      h('div', {html:t({fr:'<strong>Outil d’aide à la décision.</strong> Ne remplace pas le jugement clinique ; vérifier toute décision avec les recommandations en vigueur. Les données restent sur cet appareil.', ar:'<strong>أداة للمساعدة على القرار.</strong> لا تعوِّض الحكم السريري؛ يجب التحقق من كل قرار وفق التوصيات السارية. تبقى البيانات على هذا الجهاز.'})}));
    if(o.refs && o.refs.length) fi.appendChild(h('div', {html:'<strong>' + esc(t({fr:'Références', ar:'المراجع'})) + ' :</strong> <span dir="ltr">' + o.refs.map(esc).join(' · ') + '</span>'}));
    fi.appendChild(h('div', {text:'Cœur Net ' + VERSION}));
    foot.innerHTML = ''; foot.appendChild(fi);
    tabbar();
    registerSW();
    // Textes statiques des pages : <h2 data-ar="…">Texte français</h2>
    if(LANG === 'ar') $$('[data-ar]').forEach(function(el){ el.textContent = el.getAttribute('data-ar'); });
  }
  function tabbar(){
    if($('.cs-tabbar')) return;
    function item(href, icon, label, on, click){
      return h(href ? 'a' : 'button', {class:'cs-tab' + (on ? ' on' : ''), href:href || null, type:href ? null : 'button', onclick:click || null, 'aria-current':on ? 'page' : null},
        h('span', {class:'ic', html:icon}), h('span', {class:'lb', text:label}));
    }
    var bar = h('nav', {class:'cs-tabbar no-print', 'aria-label':{fr:'Navigation', ar:'التنقل'}},
      item('index.html', I.home, {fr:'Accueil', ar:'الرئيسية'}, PAGE === 'index'),
      item('diastolique.html', toolIcon('diastolique'), {fr:'Diastole', ar:'الانبساط'}, PAGE === 'diastolique'),
      item(null, I.grid, {fr:'Outils', ar:'الأدوات'}, false, toolMenu),
      item('quiz.html', toolIcon('quiz'), {fr:'Quiz', ar:'اختبار'}, PAGE === 'quiz'),
      item(null, I.gear, {fr:'Réglages', ar:'الإعدادات'}, false, settings));
    document.body.appendChild(bar);
    document.body.classList.add('has-tabbar');
  }
  function recordRecent(id){
    var st = store.get('hub', {fav:[], recent:[]});
    st.recent = [id].concat((st.recent || []).filter(function(x){ return x !== id; })).slice(0, 6);
    st.last = {id:id, at:Date.now()};
    store.set('hub', st);
  }
  function registerSW(){
    if(!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    try{ navigator.serviceWorker.register('sw.js'); }catch(e){}
  }

  /* ---------- Niveaux du quiz (partagé avec l'accueil) ----------
     Passer du niveau L au niveau L+1 coûte 100 + 60·(L−1) XP. */
  var TITLES = [
    {fr:'Externe', ar:'طالب خارجي'}, {fr:'Interne', ar:'طبيب داخلي'}, {fr:'Résident', ar:'طبيب مقيم'},
    {fr:'Chef de clinique', ar:'رئيس عيادة'}, {fr:'Assistant hospitalo-universitaire', ar:'مساعد استشفائي جامعي'},
    {fr:'Maître de conférences agrégé', ar:'أستاذ مبرِّز'}, {fr:'Professeur', ar:'أستاذ'}, {fr:'Légende du cœur', ar:'أسطورة القلب'}
  ];
  function level(xp){
    xp = Math.max(0, Math.floor(xp || 0));
    var L = 1, base = 0, need = 100;
    while(xp >= base + need){ base += need; L++; need = 100 + 60 * (L - 1); }
    return {lvl:L, xp:xp, base:base, next:base + need, pct:(xp - base) / need, title:TITLES[Math.min(TITLES.length - 1, Math.floor((L - 1) / 2))]};
  }

  /* ---------- Hasard reproductible ---------- */
  function rng(seed){
    var a = seed >>> 0;
    return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var r = Math.imul(a ^ a >>> 15, 1 | a); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; };
  }
  function gauss(r){ var u = 1 - r(), v = r(); return Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v); }

  window.CS = {
    store:store, sync:sync, VERSION:VERSION, PAGE:PAGE, isDark:isDark, toggleTheme:toggleTheme, setTheme:setTheme, css:css,
    lang:lang, isAr:isAr, setLang:setLang, t:t, locale:locale,
    $:$, $$:$$, h:h, esc:esc, fmt:fmt, pct:pct, clamp:clamp, num:num, todayISO:todayISO, frDate:frDate, frDateLong:frDateLong,
    units:units, setUnits:setUnits, unitLabel:unitLabel, toMgdl:toMgdl, fromMgdl:fromMgdl, conv:conv,
    doctor:doctor, doctorLabel:doctorLabel, editDoctor:editDoctor,
    patient:patient, setPatient:setPatient, editPatient:editPatient, patientSummary:patientSummary, bsa:bsa,
    TOOLS:TOOLS, GROUPS:GROUPS, tool:tool, group:group, toolIcon:toolIcon, toolMenu:toolMenu, settings:settings,
    exportBackup:exportBackup, importBackup:importBackup, applyBackup:applyBackup,
    I:I, toast:toast, copy:copy, download:download, toCSV:toCSV, modal:modal, ask:ask, seg:seg, segEl:segEl, init:init,
    back:function(){ location.href = 'index.html'; },
    rng:rng, gauss:gauss, level:level
  };
})();
