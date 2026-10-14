/* Decorative catalog wall: no finance, request or account behavior. */
(function(){
  'use strict';
  function init(){
    const hero=document.querySelector('.pg-motion-hero');
    if(!hero||!window.PagasiCatalog||!window.PagasiSite)return;
    const wall=hero.querySelector('[data-motion-columns]');
    const button=hero.querySelector('[data-motion-toggle]');
    const D=window.PagasiCatalog,S=window.PagasiSite;
    // La tira del medio es toda Veloz y con halo azul, asi se ve desde que abre la pagina
    // (Adam, 14-oct-2026: "lo de Veloz en las tiras del medio al principio y con el halo azul")
    const columns=[[5,9,8,35,1],[47,902,48,901,49,903],[16,34,3,13,27]];
    const esVeloz=m=>!!m&&(m.sede==='veloz'||String(m.sedeName||'').trim().toLowerCase()==='veloz');
    function card(id){
      const moto=D.get(id)||(D.proximos||[]).find(m=>m.id===id);
      if(!moto||!moto.image)return '';
      // La version liviana solo existe para las fotos del sitio; una foto subida por Liz va tal cual
      const propia=/^assets\//.test(moto.image);
      const optimized=propia?'assets/public/motion-motos/'+moto.image.split('/').pop().replace(/\.[^.]+$/,'.webp'):moto.image;
      return '<div class="pg-motion-card'+(esVeloz(moto)?' pg-motion-card-veloz':'')+'" data-motion-model="'+id+'"><div class="pg-motion-card-top"><span>'+S.escape(moto.sedeName)+'</span><span>'+S.escape(moto.cc)+'</span></div><picture class="pg-motion-photo pg-photo-frame"><source srcset="'+S.escape(optimized)+'" type="image/webp"><img src="'+S.escape(moto.image)+'" alt="" width="400" height="300" decoding="async"></picture><div class="pg-motion-card-bottom"><div><strong>'+S.escape(moto.name)+'</strong><small>'+S.escape(moto.type)+'</small></div><span class="pg-motion-card-mark">'+S.icon('bike')+'</span></div></div>';
    }
    wall.innerHTML=columns.map(ids=>{
      const group='<div class="pg-motion-group">'+ids.map(card).join('')+'</div>';
      // Identical groups (including their final gap) join without a jump.
      return '<div class="pg-motion-column"><div class="pg-motion-track">'+group+group+'</div></div>';
    }).join('');
    S.fitPhotos(wall);
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused=false,inView=true;
    function sync(){
      hero.dataset.motionRunning=String(!paused&&!reduce.matches&&inView&&!document.hidden);
      button.hidden=reduce.matches;
      button.setAttribute('aria-pressed',String(paused));
      button.setAttribute('aria-label',paused?'Reanudar movimiento de las motos':'Pausar movimiento de las motos');
      button.innerHTML=(paused?'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5 10 6 3 10.5Z"/></svg>':'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>')+'<span>'+(paused?'Reanudar':'Pausar')+'</span>';
    }
    button.addEventListener('click',()=>{paused=!paused;sync();});
    reduce.addEventListener('change',sync);
    document.addEventListener('visibilitychange',sync);
    if(typeof IntersectionObserver==='function'){
      new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();}).observe(hero);
    }
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
