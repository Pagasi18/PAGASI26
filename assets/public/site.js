/* Presentation and navigation only; the public plan lives in catalog.js. */
(function(root){
  'use strict';
  const paths={arrow:'M5 12h14m-6-6 6 6-6 6',search:'M21 21l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',user:'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',menu:'M4 6h16M4 12h16M4 18h16',check:'m7 12 3 3 7-7 M22 12a10 10 0 1 1-5-8.7',shield:'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z m-4-10 3 3 5-6',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2',phone:'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z M10 5h4 M11 19h2',calculator:'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z M8 6h8v4H8Z M8 14h1M12 14h1M16 14h1M8 18h1M12 18h1M16 18h1',document:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 12h8M8 16h5',bike:'M8 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M24 17a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 17l5-8h6l5 8 M8 6h4 M16 5h2l2 12 M9 9l5 8H4',chat:'M21 11.5a9 9 0 0 1-13.3 8L3 21l1.5-4.7A9 9 0 1 1 21 11.5Z M8 8c0 4 4 8 8 8 M8 8l2 2-1 2 M16 16l-2-2-2 1',filter:'M4 5h16 M7 12h10 M10 19h4',spark:'m13 2-9 12h7l-1 8 10-12h-7Z',chevron:'m6 9 6 6 6-6',wallet:'M3 5h16v15H3Z M3 5V3h14v2 M15 11h6v5h-6Z',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'};
  function icon(name){return '<svg class="pg-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.arrow)+'"/></svg>';}
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const D=root.PagasiCatalog;
  function populateModels(select){
    if(!select||!D)return;
    const groups=new Map();
    D.motos.forEach(m=>{if(!groups.has(m.sedeName))groups.set(m.sedeName,[]);groups.get(m.sedeName).push(m);});
    groups.forEach((motos,sede)=>{const group=document.createElement('optgroup');group.label=sede+' ('+motos.length+')';motos.forEach(m=>{const option=document.createElement('option');option.value=m.id;option.textContent=m.name+' — '+D.money(m.precio);group.append(option);});select.append(group);});
  }

  // Bounds of the original photos: frame the motorcycle instead of its white margins.
  // Flyer photos have no entry and retain their complete, uncropped image.
  const photoFrames = {"arsen.png":[1200,800,241,187,975,630],"atlas-200hd.jpg":[800,800,52,83,748,717],"cappucino.jpg":[1024,793,240,22,761,771],"ek-xpress-150-lite.jpg":[800,800,7,163,746,643],"ek-xpress-150.jpg":[800,800,7,148,786,623],"ek-xpress-200s.jpg":[800,800,31,163,757,623],"ek-xpress-ii-150.jpg":[800,800,19,111,735,636],"fox.jpg":[1024,793,194,58,839,743],"jaguar-150.jpg":[1024,793,11,52,1002,726],"leon-200.jpg":[1024,793,16,53,980,764],"matrix-150-lite.jpg":[300,300,17,47,281,240],"moka.jpg":[1024,793,253,19,803,782],"new-horse-150.jpg":[800,800,37,162,750,634],"new-outlook-175.jpg":[800,800,19,145,779,652],"new-owen-ii-150.jpg":[900,900,15,136,884,756],"outlook-xl-paleta.jpg":[800,800,57,129,744,672],"owen-200s-amarillo.jpg":[800,800,27,129,773,630],"owen-200s.jpg":[800,800,27,129,773,630],"power.jpg":[1024,793,189,53,811,748],"r3x.jpg":[1024,793,91,29,888,772],"rex-150.jpg":[1024,793,112,77,916,761],"rex-250.jpg":[1024,793,51,4,959,793],"rk-200.jpg":[800,800,0,107,785,640],"rk-250.jpg":[800,800,7,127,784,653],"tank-iii.jpg":[1024,793,200,20,740,779],"tank.jpg":[1024,793,152,52,868,779],"trx150-paleta.jpg":[1024,793,93,46,937,734],"tx-250-gs.jpg":[800,800,31,106,768,659],"typhoon.jpg":[1024,793,34,49,966,730]};
  function fitPhoto(img){
    const frame=photoFrames[(img.getAttribute('src')||'').split('/').pop()];
    const box=img.parentElement;
    if(!frame||!box||!box.classList.contains('pg-photo-frame')){img.classList.remove('pg-photo-fitted');img.removeAttribute('style');return;}
    const [w,h,x1,y1,x2,y2]=frame, width=box.clientWidth, height=box.clientHeight;
    if(!width||!height)return;
    const padding=width<180?10:24;
    const scale=Math.min((width-padding)/(x2-x1),(height-padding)/(y2-y1));
    img.classList.add('pg-photo-fitted');
    Object.assign(img.style,{width:(w*scale)+'px',height:(h*scale)+'px',left:((width-(x2-x1)*scale)/2-x1*scale)+'px',top:((height-(y2-y1)*scale)/2-y1*scale)+'px'});
  }
  const photoObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(e=>{const img=e.target.querySelector('img');if(img)fitPhoto(img);})):null;
  function fitPhotos(scope){
    if(photoObserver)photoObserver.disconnect();
    // Release cards removed by a filter change before observing the new result set.
    document.querySelectorAll('.pg-photo-frame img').forEach(img=>{
      if(!img.dataset.photoBound){img.dataset.photoBound='true';img.addEventListener('load',()=>fitPhoto(img));}
      fitPhoto(img);if(photoObserver)photoObserver.observe(img.parentElement);
    });
  }
  function picture(m){return m.image?'<img src="'+escape(m.image)+'" alt="'+escape(m.name)+'" width="400" height="300" loading="lazy" decoding="async">':'<div class="pg-photo-missing">'+icon('bike')+'<span>Fotografía por confirmar</span></div>';}
  function card(m){
    const p=D.plan(m.id);
    return '<article class="pg-moto-card" data-moto-id="'+m.id+'"><a class="pg-moto-picture pg-photo-frame" href="simulador.html?moto='+m.id+'" aria-label="Ver '+escape(m.name)+'">'+picture(m)+(m.tag?'<span class="pg-tag '+(m.tag==='Más vendida'?'pg-tag-green':'')+'">'+escape(m.tag)+'</span>':'')+'</a><div class="pg-card-body"><div class="pg-card-meta">'+escape(m.sedeName)+'</div><h3 class="pg-card-name"><a href="simulador.html?moto='+m.id+'">'+escape(m.name)+'</a></h3><p class="pg-card-spec">'+escape(m.cat)+' · Contado '+D.money(m.precio)+'</p><div class="pg-card-payments"><div><span class="pg-offer-label">Cuota referencial</span><strong class="pg-card-price">'+D.money(p.quincenal)+' <small>/ quincena</small></strong></div><div><span class="pg-offer-label">Inicial</span><strong class="pg-card-initial">'+D.money(p.inicial)+'</strong></div></div><a class="pg-button" href="simulador.html?moto='+m.id+'">Ver moto y cuotas '+icon('arrow')+'</a></div></article>';
  }
  function featuredCard(m){
    const p=D.plan(m.id),url='simulador.html?moto='+m.id;
    return '<article class="pg-featured-card" data-moto-id="'+m.id+'"><div class="pg-featured-heading"><div class="pg-featured-meta"><span>'+escape(m.cat)+'</span>'+(m.tag?'<span class="pg-featured-tag'+(m.tag==='Más vendida'?' pg-featured-tag-green':'')+'">'+escape(m.tag)+'</span>':'')+'</div><h3><a href="'+url+'">'+escape(m.name)+'</a></h3></div><a class="pg-featured-visual" href="'+url+'" aria-label="Ver '+escape(m.name)+'"><span class="pg-featured-photo pg-photo-frame">'+picture(m)+'</span></a><div class="pg-featured-details"><p class="pg-featured-dealer">'+icon('pin')+escape(m.sedeName)+'</p><div class="pg-featured-plan"><div><span>Cuota quincenal</span><strong class="pg-featured-quota">'+D.money(p.quincenal)+'</strong></div><div><span>Inicial · 50%</span><strong class="pg-featured-initial">'+D.money(p.inicial)+'</strong></div></div><div class="pg-featured-cash"><span>Precio de contado</span><strong>'+D.money(m.precio)+'</strong></div><a class="pg-featured-cta" href="'+url+'">Ver moto y cuotas <span>'+icon('arrow')+'</span></a></div></article>';
  }
  function setupNav(){
    const toggle=document.querySelector('.pg-menu-toggle'),nav=document.querySelector('.pg-nav-links');
    if(!toggle||!nav)return;
    const close=()=>{nav.dataset.open='false';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Abrir menú');};
    toggle.addEventListener('click',()=>{const open=nav.dataset.open!=='true';nav.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.dataset.open==='true'){close();toggle.focus();}});
    document.addEventListener('click',e=>{if(!e.target.closest('.pg-header'))close();});
    nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});
    root.matchMedia('(min-width:901px)').addEventListener('change',close);
  }
  function bindImageErrors(scope){fitPhotos(scope);scope.querySelectorAll('.pg-moto-picture img,.pg-featured-photo img').forEach(img=>img.addEventListener('error',()=>{img.replaceWith(Object.assign(document.createElement('span'),{className:'pg-photo-missing',textContent:'Fotografía no disponible'}));},{once:true}));}
  function setupHome(){
    const hero=document.querySelector('.pg-index .pg-motion-hero, .pg-index .pg-hero'),whatsapp=document.querySelector('.pg-whatsapp');
    if(hero&&whatsapp&&typeof IntersectionObserver==='function'){
      whatsapp.hidden=true;
      const visible=new Set();
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);});
        whatsapp.hidden=visible.size>0;
      },{rootMargin:'-90px 0px 0px 0px'});
      [hero,document.querySelector('.pg-featured-section')].filter(Boolean).forEach(section=>observer.observe(section));
    }

    document.querySelectorAll('[data-plan-id]').forEach(el=>{const p=D.plan(el.dataset.planId);if(p&&p[el.dataset.planField]!==undefined)el.textContent=D.money(p[el.dataset.planField]);});
    const grid=document.querySelector('[data-home-grid]');if(!grid)return;
    const groups={all:[1,5,8],trabajo:[1,2,27],ciudad:[3,11,35]};
    function show(use){grid.innerHTML=groups[use].map(id=>featuredCard(D.get(id))).join('');bindImageErrors(grid);}
    document.querySelectorAll('[data-home-use]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-home-use]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));show(b.dataset.homeUse);}));show('all');
  }
  function setupCatalog(){
    const form=document.getElementById('catalogFilters');if(!form)return;
    const q=document.getElementById('catalogSearch'),sort=document.getElementById('catalogSort'),grid=document.getElementById('catGrid'),count=document.getElementById('catalogCount');
    const sede=document.getElementById('filterSede'),initial=document.getElementById('filterInitial'),quota=document.getElementById('filterQuota');
    const params=new URLSearchParams(location.search);let use=params.get('uso')||'all';if(!['all','trabajo','ciudad','deportiva'].includes(use))use='all';
    q.value=params.get('q')||'';if(params.has('sede'))sede.value=params.get('sede');if(!sede.value)sede.value='all';
    if(params.has('inicial')&&Number.isFinite(Number(params.get('inicial'))))initial.value=params.get('inicial');
    if(params.has('cuota')&&Number.isFinite(Number(params.get('cuota'))))quota.value=params.get('cuota');
    if(params.has('sort'))sort.value=params.get('sort');if(!sort.value)sort.value='featured';
    function render(){
      const query=D.normalize(q.value),maxInitial=Number(initial.value),maxQuota=Number(quota.value);
      let list=D.motos.filter(m=>{const p=D.plan(m.id);const category=D.normalize(m.type+' '+m.cat);return (!query||D.normalize(m.name+' '+m.sedeName).includes(query))&&(sede.value==='all'||m.sede===sede.value)&&p.inicial<=maxInitial&&p.quincenal<=maxQuota&&(use==='all'||(use==='trabajo'&&/trabajo|carga|clasica|economica/.test(category))||(use==='ciudad'&&/urbana|scooter|lite/.test(category))||(use==='deportiva'&&/sport|deportiva|naked|racing/.test(category)));});
      if(sort.value==='quota')list.sort((a,b)=>D.plan(a.id).quincenal-D.plan(b.id).quincenal);
      if(sort.value==='initial')list.sort((a,b)=>D.plan(a.id).inicial-D.plan(b.id).inicial);
      if(sort.value==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'es'));
      count.textContent=list.length+' de '+D.motos.length+' modelos';
      document.getElementById('initialOutput').textContent=D.money(maxInitial);document.getElementById('quotaOutput').textContent=D.money(maxQuota);
      grid.innerHTML=list.length?list.map(card).join(''):'<div class="pg-empty">'+icon('search')+'<h3>No encontramos esa combinación</h3><p>Prueba con otra inicial, cuota o modelo.</p><button class="pg-button" type="button" data-clear-filters>Ver todas las motos</button></div>';
      bindImageErrors(grid);document.querySelectorAll('[data-catalog-use]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.catalogUse===use)));
      const next=new URLSearchParams();if(q.value)next.set('q',q.value);if(sede.value!=='all')next.set('sede',sede.value);if(use!=='all')next.set('uso',use);if(initial.value!==initial.max)next.set('inicial',initial.value);if(quota.value!==quota.max)next.set('cuota',quota.value);if(sort.value!=='featured')next.set('sort',sort.value);
      history.replaceState(null,'',location.pathname+(next.size?'?'+next:'')+location.hash);
    }
    function reset(){q.value='';sede.value='all';initial.value=initial.max;quota.value=quota.max;sort.value='featured';use='all';render();}
    q.addEventListener('input',render);sort.addEventListener('change',render);sede.addEventListener('change',render);initial.addEventListener('input',render);quota.addEventListener('input',render);
    form.addEventListener('submit',e=>{e.preventDefault();render();if(root.innerWidth<=650){form.dataset.open='false';document.getElementById('filterToggle').setAttribute('aria-expanded','false');grid.scrollIntoView({block:'start',behavior:'smooth'});}});
    form.addEventListener('reset',e=>{e.preventDefault();reset();});grid.addEventListener('click',e=>{if(e.target.closest('[data-clear-filters]'))reset();});
    document.querySelectorAll('[data-catalog-use]').forEach(b=>b.addEventListener('click',()=>{use=b.dataset.catalogUse;render();}));
    const toggle=document.getElementById('filterToggle');toggle.addEventListener('click',()=>{const open=form.dataset.open!=='true';form.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));});render();
  }
  function setupSimulator(){
    const select=document.getElementById('simMoto');if(!select)return;populateModels(select);
    const urlId=new URLSearchParams(location.search).get('moto');select.value=D.get(urlId)?String(urlId):'5';let period='quincenal';
    const gallery=document.getElementById('galleryImage'),thumbs=document.getElementById('galleryThumbs');gallery.addEventListener('load',()=>fitPhoto(gallery));
    function render(){const m=D.get(select.value);if(!m)return;const p=D.plan(m.id);const view=period==='quincenal';
      document.getElementById('simName').textContent=m.name;document.getElementById('simSpec').textContent=m.type;
      document.getElementById('simCC').textContent=m.cc==='—'?'Moto nueva':m.cc;document.getElementById('simSede').textContent=m.sedeName;
      document.getElementById('simPrice').textContent=D.money(m.precio);document.getElementById('simInitial').textContent=D.money(p.inicial);document.getElementById('simInitialDetail').textContent=D.money(p.inicial);
      document.getElementById('simAmount').textContent=D.money(p[period]);document.getElementById('simPeriodLabel').textContent=view?'Tu cuota quincenal':'Equivalencia mensual';document.getElementById('simTerm').textContent=view?'24 pagos · 12 meses':'2 cuotas por mes · 12 meses';
      document.getElementById('simAlternate').textContent=D.money(view?p.mensual:p.quincenal);document.getElementById('simAlternateLabel').textContent=view?'Equivalencia mensual':'Cuota quincenal';
      document.getElementById('simBtn').href='solicitar.html?moto='+m.id;
      gallery.hidden=!m.image;gallery.src=m.id===5?'assets/public/ek-xpress-hero.webp':m.image||'';gallery.alt=m.name;fitPhoto(gallery);if(photoObserver)photoObserver.observe(gallery.parentElement);document.getElementById('galleryMissing').hidden=!!m.image;
      document.getElementById('galleryCaption').textContent=m.id===5?'Vista ilustrativa del modelo. Consulta la fotografía del catálogo.':(m.image?'Fotografía del catálogo. Confirma colores y disponibilidad con tu asesor.':'Solicita fotografías y disponibilidad a tu asesor.');
      thumbs.innerHTML=m.id===5?'<button class="pg-thumb" type="button" aria-pressed="true" data-gallery-src="assets/public/ek-xpress-hero.webp" data-illustrative="true"><img src="assets/public/ek-xpress-hero.webp" alt="">Otra perspectiva</button><button class="pg-thumb" type="button" aria-pressed="false" data-gallery-src="'+m.image+'"><img src="'+m.image+'" alt="">Foto del catálogo</button>':'';
      document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===period)));
      history.replaceState(null,'',location.pathname+'?moto='+m.id);
    }
    select.addEventListener('change',render);document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.period;render();}));
    thumbs.addEventListener('click',e=>{const b=e.target.closest('[data-gallery-src]');if(!b)return;gallery.src=b.dataset.gallerySrc;fitPhoto(gallery);thumbs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.getElementById('galleryCaption').textContent=b.dataset.illustrative?'Vista ilustrativa del modelo. Consulta la fotografía del catálogo.':'Fotografía del catálogo. Confirma colores y disponibilidad con tu asesor.';});render();
  }
  root.PagasiSite=Object.freeze({icon,escape,populateModels,card,fitPhotos});
  function init(){document.querySelectorAll('[data-icon]').forEach(el=>{el.outerHTML=icon(el.dataset.icon);});setupNav();document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());if(D){setupHome();setupCatalog();setupSimulator();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
