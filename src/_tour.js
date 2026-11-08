/* Cœur Net — visite guidée (window.CS.tour)
   CS.tour.define([{el:'#sel' | fn, title:{fr,ar}, body:{fr,ar} (HTML permis), before:fn, after:fn}], {key})
   Démarre seule à la première ouverture de la page ; le bouton « ? » de l'en-tête la relance. */
(function(){
  'use strict';
  var CS = window.CS, h = CS.h, t = CS.t;
  var steps = [], key = 'tour.' + CS.PAGE, idx = 0, mask, hole, pop, active = false;

  function define(list, opts){
    steps = list || [];
    if(opts && opts.key) key = 'tour.' + opts.key;
    // première visite : on attend que la page soit dessinée
    if(!CS.store.get(key, false)) setTimeout(function(){ if(!active && !document.querySelector('.modal-bg')) start(false); }, 700);
  }
  function target(s){
    if(!s.el) return null;
    var el = typeof s.el === 'function' ? s.el() : document.querySelector(s.el);
    if(!el) return null;
    var r = el.getBoundingClientRect();
    if(r.width === 0 && r.height === 0) return null;
    return el;
  }
  function isSheet(){ return window.matchMedia('(max-width:720px)').matches; }

  function start(force){
    if(!steps.length) return;
    if(active) stop(false);
    active = true; idx = 0;
    mask = h('div', {class:'tour-mask', 'aria-hidden':'true'});
    hole = h('div', {class:'tour-hole'});
    pop = h('div', {class:'tour-pop', role:'dialog', 'aria-modal':'true', 'aria-live':'polite'});
    mask.addEventListener('click', function(e){ e.stopPropagation(); });
    document.body.appendChild(mask); document.body.appendChild(hole); document.body.appendChild(pop);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    show(0);
  }
  function stop(done){
    if(!active) return;
    var s = steps[idx]; if(s && s.after) try{ s.after(); }catch(e){}
    active = false;
    [mask, hole, pop].forEach(function(x){ if(x) x.remove(); });
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    CS.store.set(key, true);
    if(done) CS.toast({fr:'Visite terminée. Le bouton « ? » la relance à tout moment.', ar:'انتهت الجولة. يعيد زر «؟» تشغيلها في أي وقت.'});
  }
  function onKey(e){
    if(!active) return;
    var rtl = CS.isAr();
    if(e.key === 'Escape'){ e.preventDefault(); stop(false); }
    else if(e.key === (rtl ? 'ArrowLeft' : 'ArrowRight') || e.key === 'Enter'){ e.preventDefault(); next(); }
    else if(e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')){ e.preventDefault(); prev(); }
  }
  function next(){ if(idx < steps.length - 1) show(idx + 1); else stop(true); }
  function prev(){ if(idx > 0) show(idx - 1); }

  function show(i){
    var old = steps[idx]; if(old && old.after && i !== idx) try{ old.after(); }catch(e){}
    idx = i;
    var s = steps[i];
    if(s.before) try{ s.before(); }catch(e){}
    var last = i === steps.length - 1;
    pop.innerHTML = '';
    var dots = h('div', {class:'tour-dots'});
    for(var k = 0; k < steps.length; k++) dots.appendChild(h('i', {class:k === i ? 'on' : ''}));
    pop.appendChild(h('div', {class:'row between', style:{marginBottom:'6px'}},
      h('span', {class:'tour-step', text:(i + 1) + ' / ' + steps.length}),
      h('button', {class:'btn ghost sm', type:'button', text:{fr:'Passer', ar:'تخطٍّ'}, onclick:function(){ stop(false); }})));
    pop.appendChild(h('h3', {text:s.title}));
    pop.appendChild(h('div', {class:'tb', html:t(s.body)}));
    pop.appendChild(h('div', {class:'tour-foot'}, dots,
      h('div', {class:'row', style:{gap:'6px'}},
        i > 0 ? h('button', {class:'btn sm', type:'button', text:{fr:'Précédent', ar:'السابق'}, onclick:prev}) : null,
        h('button', {class:'btn sm primary', type:'button', text:last ? {fr:'Terminer', ar:'إنهاء'} : {fr:'Suivant', ar:'التالي'}, onclick:next}))));
    var el = target(s);
    if(el){
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight, sheetH = isSheet() ? Math.min(pop.offsetHeight || 260, vh * .5) : 0;
      var visibleTop = 70, visibleBottom = vh - sheetH - 16;
      if(r.top < visibleTop || r.bottom > visibleBottom){
        var y = window.scrollY + r.top - (isSheet() ? Math.max(70, (visibleBottom - r.height) / 2) : vh / 2 - r.height / 2);
        window.scrollTo({top:Math.max(0, y), behavior:'smooth'});
      }
    }
    place(); setTimeout(place, 360);
    var f = pop.querySelector('.btn.primary'); if(f) f.focus({preventScroll:true});
  }
  function place(){
    if(!active) return;
    var s = steps[idx], el = target(s), sheet = isSheet();
    pop.classList.toggle('sheet', sheet);
    if(!el){
      hole.style.cssText = 'top:50%;left:50%;width:0;height:0;outline:0';
      if(!sheet){ pop.style.left = Math.max(12, (window.innerWidth - pop.offsetWidth) / 2) + 'px'; pop.style.top = Math.max(12, (window.innerHeight - pop.offsetHeight) / 2) + 'px'; }
      return;
    }
    var r = el.getBoundingClientRect(), pad = 6;
    hole.style.cssText = 'top:' + (r.top - pad) + 'px;left:' + (r.left - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px';
    if(sheet){ pop.style.left = ''; pop.style.top = ''; return; }
    var pw = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 14;
    var top = r.bottom + gap;
    if(top + ph > vh - 12) top = r.top - ph - gap;
    if(top < 12){ // ni dessous ni dessus : à côté
      top = Math.min(Math.max(12, r.top), vh - ph - 12);
      var side = CS.isAr() ? r.left - pw - gap : r.right + gap;
      if(side + pw > vw - 12 || side < 12) side = CS.isAr() ? r.right + gap : r.left - pw - gap;
      pop.style.left = Math.min(Math.max(12, side), vw - pw - 12) + 'px';
    } else {
      var left = CS.isAr() ? r.right - pw : r.left;
      pop.style.left = Math.min(Math.max(12, left), vw - pw - 12) + 'px';
    }
    pop.style.top = top + 'px';
  }

  CS.tour = {define:define, start:start, stop:stop, get active(){ return active; }};
})();
