/* Cœur Net — illustrations médicales en couches (window.ILLUS)
   Style : dégradés, ombres douces, reflets ; palette fixe (ce sont des dessins), fond de scène adapté au thème.
   Toutes les scènes : viewBox 600 × 320. ILLUS.scene('artery:stent') renvoie le SVG complet. */
(function(){
  'use strict';
  /* ---------- Définitions communes ---------- */
  function lg(id, x2, y2, stops){ return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '">' + stops.map(function(s){ return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>'; }
  function rg(id, cx, cy, r, stops){ return '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '">' + stops.map(function(s){ return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</radialGradient>'; }
  var DEFS = '<defs>' +
    '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sc-a)"/><stop offset="1" style="stop-color:var(--sc-b)"/></linearGradient>' +
    lg('tissue', 0, 1, [[0, '#fbe6df'], [1, '#f3c9c0']]) +
    lg('wall', 0, 1, [[0, '#b9505a'], [.5, '#e6948f'], [1, '#b9505a']]) +
    lg('media', 0, 1, [[0, '#dd7f80'], [.5, '#f6b9b1'], [1, '#dd7f80']]) +
    lg('intima', 0, 1, [[0, '#f3c4bc'], [.5, '#fde3dc'], [1, '#f3c4bc']]) +
    lg('lumen', 0, 1, [[0, '#4d0b17'], [.25, '#7e1726'], [.5, '#a32333'], [.75, '#7e1726'], [1, '#4d0b17']]) +
    rg('rbc', '50%', '50%', '50%', [[0, '#9e1528'], [.35, '#c8243a'], [.7, '#f1636a'], [1, '#b01b2f']]) +
    rg('plaque', '45%', '40%', '60%', [[0, '#fff6cf'], [.45, '#f6d36a'], [1, '#c9952a']]) +
    lg('metal', 0, 1, [[0, '#f4f7fa'], [.35, '#b9c3cf'], [.6, '#6f7b8a'], [1, '#d5dce4']]) +
    lg('metalH', 1, 0, [[0, '#6f7b8a'], [.5, '#eef2f6'], [1, '#6f7b8a']]) +
    lg('balloon', 0, 1, [[0, '#bfe0ff', .85], [.5, '#7fb8f0', .6], [1, '#4f8fd6', .8]]) +
    rg('hb', '38%', '34%', '75%', [[0, '#f07a74'], [.55, '#d4424a'], [1, '#8f1b31']]) +
    rg('hbw', '38%', '34%', '75%', [[0, '#e9a4a0'], [.55, '#c46d72'], [1, '#86404b']]) +
    lg('ao', 1, 1, [[0, '#ec5f5f'], [1, '#a8243a']]) +
    lg('pa', 1, 1, [[0, '#7d9ee8'], [1, '#3e5fb8']]) +
    lg('vc', 0, 1, [[0, '#8aa6ea'], [1, '#4a68bd']]) +
    rg('la', '40%', '35%', '70%', [[0, '#f29a8f'], [1, '#c0444e']]) +
    rg('ra', '40%', '35%', '70%', [[0, '#9fb4ee'], [1, '#5672c4']]) +
    rg('isch', '50%', '50%', '60%', [[0, '#4e2c4a'], [.6, '#7b5470', .92], [1, '#7b5470', .25]]) +
    rg('glow', '50%', '50%', '50%', [[0, '#fff7b0'], [.4, '#ffd23f', .9], [1, '#ffb000', 0]]) +
    rg('hot', '50%', '50%', '50%', [[0, '#fff2c0'], [.4, '#ff8a2f', .95], [1, '#ff4d2f', 0]]) +
    rg('skin', '40%', '30%', '75%', [[0, '#f8ddc9'], [1, '#d9a988']]) +
    lg('skinL', 1, 0, [[0, '#dcae8f'], [.5, '#f6d8c3'], [1, '#dcae8f']]) +
    lg('gown', 0, 1, [[0, '#8fc2e8'], [1, '#4f8cc0']]) +
    lg('pants', 0, 1, [[0, '#5b6f8c'], [1, '#3e4f68']]) +
    lg('hlw', 0, 1, [[0, '#fff', .6], [1, '#fff', 0]]) +
    rg('shadow', '50%', '50%', '50%', [[0, '#000', .25], [1, '#000', 0]]) +
    lg('screen', 0, 1, [[0, '#e9f6ff'], [1, '#cfe6fb']]) +
    lg('water', 0, 1, [[0, '#9fd0ff', .75], [1, '#4b97e6', .85]]) +
    rg('brain', '45%', '40%', '65%', [[0, '#ffd9df'], [1, '#e79aa8']]) +
    rg('clot', '40%', '35%', '70%', [[0, '#7a1f2c'], [1, '#2e0a10']]) +
    '<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>' +
    '<filter id="ds" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#3a1a20" flood-opacity=".25"/></filter>' +
    '<filter id="desat"><feColorMatrix type="saturate" values=".45"/></filter>' +
    '<clipPath id="lumc"><path d="M0 104 C150 96 450 112 600 104 L600 216 C450 224 150 208 0 216Z"/></clipPath>' +
  '</defs>';
  var LANG = 'fr';
  var LBL = {chol:{fr:'cholestérol', ar:'الكوليسترول', tn:'الكولسترول'}, stent:{fr:'stent', ar:'الدعامة', tn:'الستنت'}, calc:{fr:'calcium', ar:'الكلس', tn:'الكلس'}, wrist:{fr:'poignet', ar:'المعصم', tn:'المعصم'}, groin:{fr:'aine', ar:'أعلى الفخذ', tn:'الفخذ'}, box:{fr:'boîtier', ar:'العلبة', tn:'العلبة'}, days:{fr:'jours', ar:'أيام', tn:'أيام'}, samu:{fr:'SAMU', ar:'الإسعاف', tn:'السامو'}};
  function W(k){ var x = LBL[k]; return x[LANG] || x.fr; }
  function open(){ return '<svg viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg">' + DEFS + '<rect width="600" height="320" fill="url(#bg)"/>'; }
  function txt(x, y, t, cls){ return '<text x="' + x + '" y="' + y + '" text-anchor="middle" class="' + (cls || 'il-lbl') + '">' + t + '</text>'; }
  function tag(x, y, t){ var w = Math.max(70, t.length * 8.4 + 22); return '<g filter="url(#ds)"><rect x="' + (x - w / 2) + '" y="' + (y - 16) + '" width="' + w + '" height="30" rx="15" fill="#fff"/></g>' + txt(x, y + 5, t, 'il-tag'); }

  /* ---------- Artère (coupe longitudinale, effet tube) ---------- */
  function rbcs(n){
    var s = '';
    for(var i = 0; i < n; i++){
      var x = Math.round(20 + i * 580 / n), y = 116 + ((i * 41) % 88), rot = (i * 37) % 50 - 25, d = -(i * 3.4 / n).toFixed(2), sc = (0.85 + ((i * 13) % 30) / 100).toFixed(2);
      s += '<g class="cell" style="--x:' + x + 'px;animation-delay:' + d + 's"><g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + sc + ')"><ellipse rx="13" ry="7.5" fill="url(#rbc)"/><ellipse rx="5.5" ry="2.6" fill="#7d0f1f" opacity=".35"/></g></g>';
    }
    return s;
  }
  function stentMesh(x, y, w, hh, cls){
    var n = 9, step = w / n, s = '<g class="' + (cls || '') + '" filter="url(#ds)" style="fill:none;stroke:url(#metalH);stroke-width:3.4;stroke-linejoin:round">';
    for(var i = 0; i < n; i++){ var x0 = x + i * step; s += '<path d="M' + x0 + ' ' + y + ' L' + (x0 + step / 2) + ' ' + (y + hh / 2) + ' L' + x0 + ' ' + (y + hh) + ' M' + (x0 + step) + ' ' + y + ' L' + (x0 + step / 2) + ' ' + (y + hh / 2) + ' L' + (x0 + step) + ' ' + (y + hh) + '"/>'; }
    s += '<path d="M' + x + ' ' + y + ' H' + (x + w) + ' M' + x + ' ' + (y + hh) + ' H' + (x + w) + '" style="stroke-width:2;opacity:.6"/>';
    return s + '</g>';
  }
  function artery(state){
    var narrow = state === 'plaque' || state === 'wire', flat = state === 'stent' || state === 'flow', hasPl = state !== 'normal';
    var s = open();
    s += '<rect x="0" y="34" width="600" height="252" fill="url(#tissue)" opacity=".9"/>';
    for(var i = 0; i < 22; i++){ var fx = (i * 83) % 600, fy = i % 2 ? 44 : 276, r = 9 + (i * 7) % 9; s += '<circle cx="' + fx + '" cy="' + fy + '" r="' + r + '" fill="#fff4d8" opacity=".55"/>'; }
    s += '<path d="M0 62 C150 52 450 72 600 62 L600 258 C450 268 150 248 0 258Z" fill="url(#wall)"/>';
    s += '<path d="M0 78 C150 69 450 87 600 78 L600 242 C450 251 150 233 0 242Z" fill="url(#media)"/>';
    s += '<path d="M0 92 C150 84 450 100 600 92 L600 228 C450 236 150 220 0 228Z" fill="url(#intima)"/>';
    s += '<path d="M0 104 C150 96 450 112 600 104 L600 216 C450 224 150 208 0 216Z" fill="url(#lumen)"/>';
    s += '<g clip-path="url(#lumc)" class="' + (narrow ? 'slow' : '') + '">' + rbcs(narrow ? 10 : 16) + '</g>';
    if(hasPl){
      var cls = state === 'balloon' ? 'squash' : '';
      var top = flat ? 116 : 154, bot = flat ? 206 : 168;
      s += '<g class="' + cls + '" style="transform-origin:300px 100px"><path d="M160 100 C200 ' + top + ' 400 ' + top + ' 440 104Z" fill="url(#plaque)" stroke="#f3e2bd" stroke-width="3"/>' +
        (flat ? '' : '<circle cx="268" cy="122" r="4" fill="#fffbe6"/><circle cx="318" cy="128" r="3" fill="#fffbe6"/><path d="M290 116 l10 4 M340 118 l8 6" stroke="#fffbe6" stroke-width="2"/>') + '</g>';
      s += '<g class="' + cls + '" style="transform-origin:300px 220px"><path d="M190 214 C230 ' + bot + ' 380 ' + bot + ' 420 216Z" fill="url(#plaque)" stroke="#f3e2bd" stroke-width="3"/></g>';
    }
    if(state === 'wire' || state === 'balloon'){ s += '<path class="draw" style="--len:620" d="M0 160 L556 160" stroke="url(#metal)" stroke-width="4" fill="none"/><circle cx="558" cy="160" r="5" fill="#8c97a6"/>'; }
    if(state === 'balloon'){
      s += '<g class="inflate" filter="url(#ds)"><rect x="196" y="114" width="208" height="92" rx="46" fill="url(#balloon)" stroke="#5c9be0" stroke-width="2"/><rect x="216" y="120" width="168" height="16" rx="8" fill="#fff" opacity=".45"/>' + stentMesh(206, 118, 188, 84) + '</g>';
    }
    if(flat) s += stentMesh(176, 108, 248, 104);
    s += '<path d="M0 108 C150 100 450 116 600 108" stroke="#fff" stroke-opacity=".22" stroke-width="5" fill="none"/>';
    if(state === 'plaque') s += tag(300, 28, W('chol'));
    if(state === 'stent' || state === 'flow') s += tag(300, 300, W('stent'));
    return s + '</svg>';
  }

  /* ---------- Cœur anatomique ---------- */
  var HX = 150; // décalage horizontal du cœur dans la scène
  function heartBody(fillId){
    return '<path d="M96 30 C96 60 98 84 104 104 L124 100 C118 80 116 58 118 30 Z" fill="url(#vc)"/>' +
      '<path d="M140 118 C134 70 150 34 190 30 C226 27 248 52 246 92 L246 112 L224 112 L224 92 C224 66 212 52 192 53 C168 55 160 76 164 118 Z" fill="url(#ao)"/>' +
      '<path d="M168 40 L166 14 M190 34 L192 8 M212 40 L220 16" stroke="url(#ao)" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="M150 132 C150 106 160 88 184 84 C204 81 222 88 232 100 L218 116 C210 108 200 104 188 106 C176 108 172 120 174 138 Z" fill="url(#pa)"/>' +
      '<ellipse cx="108" cy="140" rx="34" ry="30" fill="url(#ra)"/>' +
      '<path d="M226 120 C244 112 262 118 262 132 C262 142 252 146 244 144 Z" fill="#c0444e"/>' +
      '<ellipse cx="222" cy="140" rx="30" ry="26" fill="url(#la)"/>' +
      '<path d="M94 150 C80 196 98 240 140 266 C172 286 214 300 238 288 C256 276 258 240 252 206 C248 180 242 162 228 148 C190 132 130 132 94 150 Z" fill="url(#' + fillId + ')"/>' +
      '<path d="M98 152 C130 138 190 136 230 150" fill="none" stroke="#f1c46b" stroke-width="7" stroke-linecap="round" opacity=".75"/>';
  }
  function coronaries(flow, blockLAD){
    var s = '<path d="M182 148 C190 190 208 240 236 286" fill="none" stroke="#ffd2cc" stroke-width="4.5" stroke-linecap="round"/>' +
      '<path d="M192 190 C210 196 226 204 240 214 M198 226 C182 236 168 248 158 262" fill="none" stroke="#ffd2cc" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M144 150 C114 156 98 180 100 214 C102 240 118 258 142 268" fill="none" stroke="#ffd2cc" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path d="M190 146 C214 146 236 156 248 176" fill="none" stroke="#ffd2cc" stroke-width="3.2" stroke-linecap="round"/>';
    if(flow){
      s += '<path class="flowdash" d="M182 148 C190 190 208 240 236 286" fill="none" stroke="#b81f35" stroke-width="2" stroke-linecap="round"/>';
      s += '<path class="flowdash" d="M144 150 C114 156 98 180 100 214 C102 240 118 258 142 268" fill="none" stroke="#b81f35" stroke-width="1.6" stroke-linecap="round"/>';
      s += '<path class="flowdash" d="M190 146 C214 146 236 156 248 176" fill="none" stroke="#b81f35" stroke-width="1.6" stroke-linecap="round"/>';
    }
    if(blockLAD) s += '<circle cx="193" cy="196" r="8" fill="url(#clot)" stroke="#ffd2cc" stroke-width="2"/>';
    return s;
  }
  function brain(x, y, sc, hit){
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')" filter="url(#ds)">' +
      '<path d="M10 60 C0 30 30 4 62 10 C80 -2 112 4 118 26 C140 32 142 64 124 76 C124 98 96 108 78 98 C64 112 30 108 26 90 C8 88 0 74 10 60Z" fill="url(#brain)" stroke="#c97786" stroke-width="2"/>' +
      '<path d="M30 40 C40 30 52 44 62 34 M70 30 C84 22 92 40 104 32 M24 66 C38 58 46 76 60 66 M74 60 C86 50 98 66 112 56 M50 88 C60 80 70 92 82 84" fill="none" stroke="#c97786" stroke-width="2.4" stroke-linecap="round"/>' +
      (hit ? '<circle cx="86" cy="44" r="14" fill="url(#isch)" class="pulse"/><circle cx="86" cy="44" r="6" fill="url(#clot)"/>' : '') + '</g>';
  }
  function heart(state){
    var s = open(), weak = state === 'weak';
    s += '<ellipse cx="' + (HX + 175) + '" cy="304" rx="96" ry="10" fill="url(#shadow)"/>';
    s += '<circle cx="' + (HX + 160) + '" cy="170" r="120" fill="#ff8f8f" opacity=".12" filter="url(#soft)"/>';
    var anim = weak ? 'weak' : state === 'chaos' ? 'quiver' : 'beat';
    s += '<g transform="translate(' + HX + ' 0)"' + (weak ? ' filter="url(#desat)"' : '') + '><g class="' + anim + '" style="transform-origin:170px 200px">';
    s += heartBody(weak ? 'hbw' : 'hb');
    if(state === 'infarct') s += '<path d="M196 198 C220 202 244 220 250 248 C246 276 234 290 222 292 C206 262 196 230 196 198Z" fill="url(#isch)" class="pulse"/>';
    if(['coronary', 'infarct', 'bypass', 'beat', 'weak'].indexOf(state) >= 0) s += coronaries(state === 'coronary' || state === 'beat' || state === 'bypass', state === 'infarct' || state === 'bypass');
    s += '<path d="M106 170 C114 154 142 150 162 156 C136 162 118 178 112 200 C104 190 102 180 106 170 Z" fill="url(#hlw)"/>';
    s += '</g>';
    // éléments hors battement
    if(state === 'bypass'){
      s += '<path class="draw" style="--len:300" d="M130 40 C60 80 120 190 204 232" fill="none" stroke="#e05555" stroke-width="6" stroke-linecap="round"/>';
      s += '<path class="draw" style="--len:300" d="M166 104 C262 84 276 170 240 214" fill="none" stroke="#7d9ee8" stroke-width="6" stroke-linecap="round"/>';
      s += '<path class="flowdash" d="M166 104 C262 84 276 170 240 214" fill="none" stroke="#b81f35" stroke-width="2"/>';
    }
    if(state === 'electric' || state === 'pacer' || state === 'beat'){
      var path = 'M110 108 C124 130 146 148 160 158 C170 186 186 220 212 262';
      s += '<path d="' + path + '" fill="none" stroke="#ffe27a" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round" opacity=".9"/>';
      s += '<path d="M176 196 C166 220 160 240 156 258 M182 204 C204 214 226 226 240 244" fill="none" stroke="#ffe27a" stroke-width="2.4" stroke-dasharray="2 6" stroke-linecap="round" opacity=".9"/>';
      s += '<circle cx="110" cy="108" r="14" fill="url(#glow)" class="pulse"/><circle cx="160" cy="158" r="9" fill="url(#glow)" class="pulse" style="animation-delay:.15s"/>';
      if(state !== 'pacer') s += '<circle r="7" fill="#fff6a8"><animateMotion dur="1.15s" repeatCount="indefinite" path="' + path + '"/></circle>';
    }
    if(state === 'chaos' || state === 'ablation'){
      var pts = [[92, 128], [116, 148], [100, 120], [214, 128], [236, 140], [206, 150], [126, 132], [226, 120], [244, 128], [90, 150], [200, 134], [130, 116]];
      pts.forEach(function(p, i){ s += '<circle class="flick" cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="url(#glow)" style="animation-delay:' + (-i * 0.13).toFixed(2) + 's"/>'; });
    }
    if(state === 'ablation'){
      s += '<path class="draw" style="--len:420" d="M60 320 C80 260 120 220 160 196 C190 178 220 160 238 146" fill="none" stroke="url(#metal)" stroke-width="5" stroke-linecap="round"/>';
      s += '<circle cx="240" cy="145" r="16" fill="url(#hot)" class="pulse"/>';
      [[246, 134], [252, 144], [246, 154], [236, 158]].forEach(function(p, i){ s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="#5a2a1a" stroke="#ffb27a" stroke-width="1.5" class="grow" style="animation-delay:' + (i * 0.5) + 's"/>'; });
    }
    if(state === 'clot' || state === 'stroke'){
      s += '<circle cx="250" cy="128" r="11" fill="url(#clot)" class="' + (state === 'clot' ? 'grow' : '') + '" stroke="#ffd2cc" stroke-width="2"/>';
      if(state === 'clot') s += '<circle cx="250" cy="128" r="26" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 5" class="pulse"/>';
    }
    if(state === 'pacer'){
      s += '<path d="M-60 62 C0 50 60 40 104 44 C112 70 108 100 108 130 C120 190 150 240 186 272" fill="none" stroke="#5d6875" stroke-width="3.5" stroke-linecap="round"/>';
      s += '<circle cx="186" cy="272" r="12" fill="url(#glow)" class="pulse"/>';
    }
    s += '</g>';
    if(state === 'pacer') s += '<g filter="url(#ds)"><rect x="40" y="36" width="84" height="62" rx="22" fill="url(#metal)" stroke="#6f7b8a" stroke-width="2"/><rect x="58" y="50" width="48" height="8" rx="4" fill="#fff" opacity=".6"/><circle cx="110" cy="78" r="5" fill="#4fc68b" class="pulse"/></g>';
    if(state === 'stroke'){
      s += '<path d="M' + (HX + 250) + ' 120 C' + (HX + 300) + ' 50 440 40 470 70" fill="none" stroke="#b81f35" stroke-width="3" stroke-dasharray="6 7"/>';
      s += '<circle r="8" fill="url(#clot)"><animateMotion dur="2.2s" repeatCount="indefinite" path="M' + (HX + 250) + ' 120 C' + (HX + 300) + ' 50 440 40 478 76"/></circle>';
      s += brain(462, 26, 0.95, true);
    }
    if(weak) s += '<g opacity=".8"><path d="M470 150 h60" stroke="#5b6b7b" stroke-width="4" stroke-dasharray="5 7" stroke-linecap="round"/><path d="M528 140 l16 10 -16 10z" fill="#5b6b7b"/></g>';
    return s + '</svg>';
  }

  /* ---------- Valve aortique (vue du dessus) ---------- */
  function cusp(rot, calc, scale){
    var c = calc ? 'url(#plaque)' : '#f6cfc8', st = calc ? '#c9952a' : '#d99a94';
    return '<path transform="rotate(' + rot + ' 300 160)" d="M300 160 L300 66 A94 94 0 0 1 381 207 Z" fill="' + c + '" stroke="' + st + '" stroke-width="' + (calc ? 4 : 2.5) + '"/>' +
      '<path transform="rotate(' + rot + ' 300 160)" d="M300 150 L300 84 A76 76 0 0 1 360 196" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>';
  }
  function tavFrame(cls, r){
    var s = '<g class="' + cls + '" filter="url(#ds)"><circle cx="300" cy="160" r="' + r + '" fill="none" stroke="url(#metal)" stroke-width="6"/>';
    for(var i = 0; i < 18; i++){ var a = i * 20 * Math.PI / 180, b = (i * 20 + 10) * Math.PI / 180, b2 = (i * 20 + 20) * Math.PI / 180;
      s += '<path d="M' + (300 + r * Math.cos(a)).toFixed(1) + ' ' + (160 + r * Math.sin(a)).toFixed(1) + ' L' + (300 + (r - 15) * Math.cos(b)).toFixed(1) + ' ' + (160 + (r - 15) * Math.sin(b)).toFixed(1) + ' L' + (300 + r * Math.cos(b2)).toFixed(1) + ' ' + (160 + r * Math.sin(b2)).toFixed(1) + '" fill="none" stroke="#9aa5b3" stroke-width="2.6" stroke-linejoin="round"/>'; }
    return s + '</g>';
  }
  function valve(state){
    var s = open();
    s += '<ellipse cx="300" cy="300" rx="130" ry="10" fill="url(#shadow)"/>';
    s += '<circle cx="300" cy="160" r="128" fill="url(#wall)" filter="url(#ds)"/><circle cx="300" cy="160" r="112" fill="url(#media)"/><circle cx="300" cy="160" r="98" fill="url(#lumen)"/>';
    if(state === 'normal' || state === 'stenosis'){
      var st2 = state === 'stenosis';
      s += '<g class="' + (st2 ? 'openS' : 'open3') + '">' + cusp(0, st2) + cusp(120, st2) + cusp(240, st2) + '</g>';
      if(st2) s += '<g fill="#fffbe6" stroke="#e9c76a" stroke-width="2"><circle cx="268" cy="126" r="9"/><circle cx="338" cy="182" r="11"/><circle cx="296" cy="218" r="8"/><circle cx="330" cy="120" r="6"/></g>' + tag(300, 28, W('calc'));
    }
    if(state === 'deliver'){
      s += cusp(0, true) + cusp(120, true) + cusp(240, true);
      s += '<g filter="url(#ds)"><rect x="272" y="96" width="56" height="128" rx="14" fill="url(#metalH)" opacity=".9"/>';
      for(var k = 0; k < 7; k++) s += '<path d="M276 ' + (104 + k * 17) + ' L300 ' + (112 + k * 17) + ' L324 ' + (104 + k * 17) + '" fill="none" stroke="#6f7b8a" stroke-width="2"/>';
      s += '</g><path d="M300 224 L300 320" stroke="url(#metalH)" stroke-width="10" stroke-linecap="round"/>';
    }
    if(state === 'deploy' || state === 'done'){
      if(state === 'deploy') s += '<g opacity=".7">' + cusp(0, true) + cusp(120, true) + cusp(240, true) + '</g>';
      s += tavFrame(state === 'deploy' ? 'expand' : '', 96);
      if(state === 'done') s += '<g class="open3">' + ['0', '120', '240'].map(function(r){ return '<path transform="rotate(' + r + ' 300 160)" d="M300 160 L300 76 A84 84 0 0 1 373 202 Z" fill="#fbeee9" stroke="#c9b3ac" stroke-width="2"/>'; }).join('') + '</g>';
    }
    return s + '</svg>';
  }

  /* ---------- Silhouettes et objets du quotidien ---------- */
  function person(o){
    o = o || {};
    var s = '<ellipse cx="300" cy="306" rx="70" ry="8" fill="url(#shadow)"/>';
    s += '<path d="M282 196 L276 298 M318 196 L324 298" stroke="url(#pants)" stroke-width="26" stroke-linecap="round"/>';
    if(o.edema) s += '<path d="M276 240 L276 300 M324 240 L324 300" stroke="url(#water)" stroke-width="36" stroke-linecap="round" class="pulse"/>';
    s += '<path d="M262 94 L232 180 M338 94 L368 180" stroke="url(#skinL)" stroke-width="18" stroke-linecap="round"/>';
    s += '<path d="M252 92 Q300 74 348 92 L352 204 Q300 214 248 204Z" fill="url(#gown)" filter="url(#ds)"/>';
    s += '<path d="M260 92 Q300 80 340 92 L340 104 Q300 94 260 104Z" fill="#fff" opacity=".25"/>';
    s += '<rect x="290" y="66" width="20" height="18" rx="6" fill="url(#skinL)"/>';
    s += '<circle cx="300" cy="48" r="26" fill="url(#skin)"/><path d="M274 46 C274 18 326 18 326 46 C318 32 284 32 274 46Z" fill="#3b2a24"/>';
    s += '<g class="beat" style="transform-origin:290px 124px"><path d="M290 112 C278 100 264 112 278 128 L290 140 L302 128 C316 112 302 100 290 112Z" fill="url(#hb)"/></g>';
    if(o.lungs) s += '<path d="M262 104 Q300 96 338 104 L336 132 Q300 124 264 132Z" fill="url(#water)" class="pulse"/>';
    return s;
  }
  function body(state){
    var s = open();
    if(['wrist', 'groin', 'fluid', 'pmbox', 'person'].indexOf(state) >= 0) s += person({edema:state === 'fluid', lungs:state === 'fluid'});
    if(state === 'wrist') s += '<path class="draw" style="--len:240" d="M368 182 L352 132 L338 98 L306 108 L292 124" fill="none" stroke="#e03645" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 0"/><circle cx="368" cy="182" r="12" fill="url(#hot)" class="pulse"/>' + tag(450, 186, W('wrist'));
    if(state === 'groin') s += '<path class="draw" style="--len:200" d="M312 204 L310 170 L302 140 L292 126" fill="none" stroke="#e03645" stroke-width="5" stroke-linecap="round"/><circle cx="312" cy="204" r="12" fill="url(#hot)" class="pulse"/>' + tag(420, 210, W('groin'));
    if(state === 'pmbox') s += '<g filter="url(#ds)"><rect x="316" y="94" width="26" height="20" rx="7" fill="url(#metal)" stroke="#6f7b8a"/></g><path d="M320 106 C310 116 300 120 294 124" fill="none" stroke="#5d6875" stroke-width="2.4"/>' + tag(430, 104, W('box'));
    if(state === 'scale'){
      s += '<g filter="url(#ds)"><rect x="190" y="206" width="220" height="70" rx="22" fill="#fff" stroke="#d4dbe3" stroke-width="2"/></g><rect x="246" y="218" width="108" height="38" rx="9" fill="#1c2a38"/><text x="300" y="246" text-anchor="middle" style="font:800 24px var(--font-display);fill:#7ef0b0">+2 kg</text>';
      s += '<g filter="url(#ds)"><rect x="232" y="40" width="136" height="130" rx="16" fill="#fff"/><rect x="232" y="40" width="136" height="34" rx="16" fill="#e05555"/><rect x="232" y="58" width="136" height="16" fill="#e05555"/></g><text x="300" y="134" text-anchor="middle" style="font:800 52px var(--font-display);fill:#1c2a38">3</text><text x="300" y="160" text-anchor="middle" class="il-lbl">' + W('days') + '</text>';
    }
    if(state === 'salt'){
      s += '<g class="bob" filter="url(#ds)"><path d="M262 124 L338 124 L328 274 L272 274Z" fill="#fff" stroke="#d4dbe3" stroke-width="3"/><path d="M270 130 L278 268" stroke="#fff" stroke-width="6" opacity=".8"/><rect x="264" y="96" width="72" height="32" rx="10" fill="url(#metal)"/>' +
        '<circle cx="286" cy="110" r="3" fill="#333"/><circle cx="300" cy="110" r="3" fill="#333"/><circle cx="314" cy="110" r="3" fill="#333"/><text x="300" y="214" text-anchor="middle" style="font:800 28px var(--font-display);fill:#9aa5b3">NaCl</text></g>';
      for(var i = 0; i < 6; i++) s += '<rect x="' + (284 + i * 7) + '" y="80" width="5" height="5" fill="#fff" stroke="#c9d1da" class="fall" style="animation-delay:' + (i * 0.25) + 's"/>';
      s += '<circle cx="300" cy="180" r="128" fill="none" stroke="#e03645" stroke-width="14" opacity=".9"/><path d="M210 90 L390 270" stroke="#e03645" stroke-width="14" stroke-linecap="round" opacity=".9"/>';
    }
    if(state === 'phone190'){
      s += '<g filter="url(#ds)"><rect x="232" y="26" width="136" height="270" rx="26" fill="#1c2a38"/><rect x="242" y="48" width="116" height="226" rx="12" fill="url(#screen)"/></g>';
      s += '<text x="300" y="98" text-anchor="middle" class="il-lbl">' + W('samu') + '</text><text x="300" y="160" text-anchor="middle" style="font:800 54px var(--font-display);fill:#1c2a38">190</text>';
      s += '<circle cx="300" cy="226" r="34" fill="#2fbf71" opacity=".25" class="ring"/><circle cx="300" cy="226" r="24" fill="#2fbf71"/><path d="M290 218 c4 10 10 16 20 20 l5-5 c-3-3-6-4-9-4 l-3 3 c-4-2-7-5-9-9 l3-3 c0-3-1-6-4-9z" fill="#fff"/>';
    }
    if(state === 'clock'){
      s += '<g filter="url(#ds)"><circle cx="300" cy="160" r="116" fill="#fff" stroke="url(#metal)" stroke-width="12"/></g>';
      for(var k = 0; k < 12; k++){ var a = k * Math.PI / 6; s += '<path d="M' + (300 + 92 * Math.sin(a)).toFixed(1) + ' ' + (160 - 92 * Math.cos(a)).toFixed(1) + ' L' + (300 + 102 * Math.sin(a)).toFixed(1) + ' ' + (160 - 102 * Math.cos(a)).toFixed(1) + '" stroke="#1c2a38" stroke-width="' + (k % 3 ? 3 : 6) + '" stroke-linecap="round"/>'; }
      s += '<path d="M300 160 L300 96" stroke="#e03645" stroke-width="5" stroke-linecap="round" class="tick"/><path d="M300 160 L350 160" stroke="#1c2a38" stroke-width="8" stroke-linecap="round"/><circle cx="300" cy="160" r="9" fill="#1c2a38"/>';
      s += '<g transform="translate(470 120)" class="beat" style="transform-origin:470px 140px"><path d="M0 18 C-18 -2 -40 16 -20 38 L0 56 L20 38 C40 16 18 -2 0 18Z" fill="url(#hb)"/></g>';
    }
    if(state === 'pills'){
      var days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      s += '<g filter="url(#ds)"><rect x="76" y="96" width="448" height="136" rx="20" fill="#fff" stroke="#d4dbe3" stroke-width="2"/></g>';
      days.forEach(function(d, i){ var x = 92 + i * 62;
        s += '<rect x="' + x + '" y="124" width="50" height="94" rx="12" fill="#eef4f9" stroke="#d4dbe3"/><text x="' + (x + 25) + '" y="116" text-anchor="middle" class="il-lbl">' + d + '</text>';
        s += '<g class="grow" style="animation-delay:' + (i * 0.15) + 's"><rect x="' + (x + 9) + '" y="140" width="32" height="14" rx="7" fill="#e05555"/><rect x="' + (x + 25) + '" y="140" width="16" height="14" rx="7" fill="#fff" stroke="#e05555"/></g>';
        s += '<circle cx="' + (x + 25) + '" cy="184" r="11" fill="#4f8cc0" class="grow" style="animation-delay:' + (i * 0.15 + 0.1) + 's"/><path d="M' + (x + 17) + ' 184 h16" stroke="#fff" stroke-width="2" opacity=".7"/>'; });
    }
    if(state === 'phone15'){
      s += '<g filter="url(#ds)"><rect x="210" y="104" width="96" height="70" rx="24" fill="url(#metal)" stroke="#6f7b8a" stroke-width="2"/><rect x="420" y="70" width="70" height="130" rx="14" fill="#1c2a38"/><rect x="428" y="84" width="54" height="100" rx="6" fill="url(#screen)"/></g>';
      s += '<path d="M314 230 H412" stroke="#0b6e99" stroke-width="4"/><path d="M314 220 V240 M412 220 V240" stroke="#0b6e99" stroke-width="4"/><text x="363" y="268" text-anchor="middle" style="font:800 26px var(--font-display);fill:#0b6e99">&gt; 15 cm</text>';
    }
    if(state === 'walk'){
      s += '<circle cx="520" cy="62" r="30" fill="#ffd166" opacity=".9"/><path d="M0 290 C150 276 450 300 600 284 L600 320 L0 320Z" fill="#9fd39b"/>';
      s += '<g class="bob"><circle cx="300" cy="64" r="22" fill="url(#skin)"/><path d="M280 62 C280 38 320 38 320 62 C312 50 288 50 280 62Z" fill="#3b2a24"/>';
      s += '<path d="M300 112 L270 166 M300 112 L332 160" stroke="url(#skinL)" stroke-width="14" stroke-linecap="round" class="arm"/>';
      s += '<path d="M282 90 Q300 82 318 90 L320 186 L280 186Z" fill="url(#gown)"/>';
      s += '<path d="M292 184 L268 282" stroke="url(#pants)" stroke-width="20" stroke-linecap="round" class="leg1"/><path d="M308 184 L332 282" stroke="url(#pants)" stroke-width="20" stroke-linecap="round" class="leg2"/></g>';
    }
    return s + '</svg>';
  }
  function scene(key){ var p = key.split(':'); return ({artery:artery, heart:heart, valve:valve, body:body}[p[0]] || artery)(p[1]); }
  window.ILLUS = {setLang:function(l){ LANG = l; }, scene:scene, heart:heart, artery:artery, valve:valve, body:body};
})();
