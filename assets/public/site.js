/* Presentation and navigation only; the public plan lives in catalog.js.
   Desde el 13-oct-2026 espera a que catalog.js lea el catalogo de la base (con tope de
   2,5 s) y el simulador muestra dos tarjetas que giran: inicial minima y preferida. */
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
    return '<article class="pg-moto-card'+(esPromo(m)?' pg-moto-card-promo':'')+'" data-moto-id="'+m.id+'"><a class="pg-moto-picture pg-photo-frame" href="simulador.html?moto='+m.id+'" aria-label="Ver '+escape(m.name)+'">'+picture(m)+(m.tag?'<span class="pg-tag '+(m.tag==='Más vendida'?'pg-tag-green':(m.tag==='Promo'?'pg-tag-promo':''))+'">'+(m.tag==='Promo'?'⚡ PROMO':escape(m.tag))+'</span>':'')+'</a><div class="pg-card-body"><div class="pg-card-meta">'+escape(m.sedeName)+'</div><h3 class="pg-card-name"><a href="simulador.html?moto='+m.id+'">'+escape(m.name)+'</a></h3><p class="pg-card-spec">'+escape(m.cat)+' · Contado '+D.money(m.precio)+'</p><div class="pg-card-payments"><div><span class="pg-offer-label">Cuota referencial</span><strong class="pg-card-price">'+D.money(p.quincenal)+' <small>/ quincena</small></strong></div><div><span class="pg-offer-label">Inicial + seguro</span><strong class="pg-card-initial">'+D.money(p.alFirmar)+'</strong></div></div><a class="pg-button" href="simulador.html?moto='+m.id+'">Ver moto y cuotas '+icon('arrow')+'</a></div></article>';
  }
  // Vitrina de promo (Adam, 13-oct-2026: "ponlo mucho mas llamativo"): tarjeta oscura con
  // borde naranja, foto a todo lo ancho, la cuota grande y un boton que pide clic.
  const esPromo=m=>!!(m&&(m.promo||m.tag==='Promo'));
  function promoCard(m){
    const p=D.plan(m.id),url='simulador.html?moto='+m.id;
    return '<article class="pg-promo-card" data-moto-id="'+m.id+'">'
      +'<a class="pg-promo-foto" href="'+url+'" aria-label="Ver '+escape(m.name)+'">'
      +(m.image?'<img src="'+escape(m.image)+'" alt="'+escape(m.name)+'" loading="lazy" decoding="async">':'<span class="pg-promo-sinfoto">'+icon('bike')+'</span>')
      +'<span class="pg-promo-cinta">⚡ PROMO</span></a>'
      +'<div class="pg-promo-cuerpo"><p class="pg-promo-cat">'+escape([m.sedeName,m.cat].filter(Boolean).join(' · '))+'</p><h3><a href="'+url+'">'+escape(m.name)+'</a></h3>'
      +'<div class="pg-promo-cuota"><span>Cuota quincenal</span><strong>'+D.money(p.quincenal)+'</strong><small>× '+p.totalCuotas+' cuotas</small></div>'
      +'<div class="pg-promo-datos"><div><span>Inicial + seguro</span><b>'+D.money(p.alFirmar)+'</b></div><div><span>Precio de contado</span><b>'+D.money(m.precio)+'</b></div></div>'
      +'<a class="pg-promo-cta" href="'+url+'">¡La quiero! '+icon('arrow')+'</a></div></article>';
  }
  // Veloz que aun no tienen precio en el catalogo (Adam, 13-oct-2026: "ponme todas las Veloz
  // en la primera pagina"). Si Liz la carga con precio en el modulo, sale como promo y aqui se omite.
  const PROXIMOS=[
    {name:'DT 170',cat:'170cc · Doble propósito',image:'assets/motos/veloz-dt-170.jpg'},
    {name:'La Rutera · HS-300-2A',cat:'300cc · Adventure',image:'assets/motos/veloz-hs-300-2a-rutera.jpg'},
    {name:'La Aventurera · HS-300Y-8N',cat:'300cc · Adventure',image:'assets/motos/veloz-hs-300y-8n-aventurera.jpg'},
    {name:'Scooter Keeway',cat:'Scooter',image:'assets/motos/veloz-scooter-keeway.jpg'},
    {name:'Scooter Veloz',cat:'Scooter',image:'assets/motos/veloz-scooter-veloz.jpg'}];
  function proximos(){
    const ya=new Set(D.motos.map(m=>D.normalize(m.modelo+' '+m.name)));
    return PROXIMOS.filter(p=>{const n=D.normalize(p.name.split(' · ').pop()),k=D.normalize(p.name.split(' · ')[0]);return ![...ya].some(x=>x.includes(n)||x.includes(k));});
  }
  function proximoCard(p){
    const wa='https://wa.me/584242177798?text='+encodeURIComponent('Hola, quiero el precio de la '+p.name+' de Veloz.');
    return '<article class="pg-promo-card pg-promo-proximo"><a class="pg-promo-foto" href="'+wa+'" target="_blank" rel="noopener" aria-label="Preguntar el precio de '+escape(p.name)+'">'
      +'<img src="'+escape(p.image)+'" alt="'+escape(p.name)+'" loading="lazy" decoding="async"><span class="pg-promo-cinta pg-promo-cinta-nuevo">NUEVA</span></a>'
      +'<div class="pg-promo-cuerpo"><p class="pg-promo-cat">Veloz · '+escape(p.cat)+'</p><h3>'+escape(p.name)+'</h3>'
      +'<div class="pg-promo-porconfirmar"><span>Precio por confirmar</span><strong>Pregúntanos</strong></div>'
      +'<a class="pg-promo-cta pg-promo-cta-wa" href="'+wa+'" target="_blank" rel="noopener">Pregunta el precio '+icon('arrow')+'</a></div></article>';
  }
  function promoBanner(motos){
    if(!motos.length)return '';
    const planes=motos.map(m=>D.plan(m.id)),sedes=[...new Set(motos.map(m=>m.sedeName).filter(Boolean))];
    const titulo=sedes.length===1?'¡Llegó '+sedes[0]+' a Pagasi!':'Promo Pagasi';
    return '<div class="pg-promo-banner"><span class="pg-promo-banner-fuego" aria-hidden="true">⚡</span><div><strong>'+escape(titulo)+'</strong>'
      +'<p>Motos nuevas desde <b>'+D.money(Math.min(...planes.map(p=>p.quincenal)))+' la quincena</b> · inicial con seguro desde '+D.money(Math.min(...planes.map(p=>p.alFirmar)))+'</p></div>'
      +'<a class="pg-promo-banner-cta" href="simulador.html?moto='+motos[0].id+'">Simular mi cuota '+icon('arrow')+'</a></div>';
  }
  function featuredCard(m){
    const p=D.plan(m.id),url='simulador.html?moto='+m.id;
    return '<article class="pg-featured-card" data-moto-id="'+m.id+'"><div class="pg-featured-heading"><div class="pg-featured-meta"><span>'+escape(m.cat)+'</span>'+(m.tag?'<span class="pg-featured-tag'+(m.tag==='Más vendida'?' pg-featured-tag-green':(m.tag==='Promo'?' pg-featured-tag-promo':''))+'">'+escape(m.tag)+'</span>':'')+'</div><h3><a href="'+url+'">'+escape(m.name)+'</a></h3></div><a class="pg-featured-visual" href="'+url+'" aria-label="Ver '+escape(m.name)+'"><span class="pg-featured-photo pg-photo-frame">'+picture(m)+'</span></a><div class="pg-featured-details"><p class="pg-featured-dealer">'+icon('pin')+escape(m.sedeName)+'</p><div class="pg-featured-plan"><div><span>Cuota quincenal</span><strong class="pg-featured-quota">'+D.money(p.quincenal)+'</strong></div><div><span>Inicial '+Math.round(p.pct*100)+'% + seguro</span><strong class="pg-featured-initial">'+D.money(p.alFirmar)+'</strong></div></div><div class="pg-featured-cash"><span>Precio de contado</span><strong>'+D.money(m.precio)+'</strong></div><a class="pg-featured-cta" href="'+url+'">Ver moto y cuotas <span>'+icon('arrow')+'</span></a></div></article>';
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
    document.querySelectorAll('[data-total-motos]').forEach(el=>{el.textContent='Ver las '+D.motos.length+' motos';});
    const promo=D.motos.filter(m=>m.promo||m.tag==='Promo').map(m=>m.id);
    const groups={promo,all:[1,5,8],trabajo:[1,2,27],ciudad:[3,11,35]};
    const tabPromo=document.querySelector('[data-home-use="promo"]');if(tabPromo)tabPromo.hidden=!promo.length;
    function show(use){const motos=(groups[use]||[]).map(id=>D.get(id)).filter(Boolean),esP=use==='promo';
      grid.classList.toggle('pg-grid-promo',esP);
      grid.innerHTML=esP?promoBanner(motos)+motos.map(promoCard).join('')+proximos().map(proximoCard).join(''):motos.map(featuredCard).join('');bindImageErrors(grid);}
    function elegir(use){document.querySelectorAll('[data-home-use]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.homeUse===use)));show(use);}
    document.querySelectorAll('[data-home-use]').forEach(b=>b.addEventListener('click',()=>elegir(b.dataset.homeUse)));elegir(promo.length&&tabPromo?'promo':'all');
  }
  function setupCatalog(){
    const form=document.getElementById('catalogFilters');if(!form)return;
    const q=document.getElementById('catalogSearch'),sort=document.getElementById('catalogSort'),grid=document.getElementById('catGrid'),count=document.getElementById('catalogCount');
    const sede=document.getElementById('filterSede'),initial=document.getElementById('filterInitial'),quota=document.getElementById('filterQuota');
    const yaHay=new Set([...sede.options].map(o=>o.value));
    D.motos.forEach(m=>{if(m.sede&&!yaHay.has(m.sede)){yaHay.add(m.sede);const o=document.createElement('option');o.value=m.sede;o.textContent=m.sedeName;sede.append(o);}});
    const params=new URLSearchParams(location.search);let use=params.get('uso')||'all';if(!['all','trabajo','ciudad','deportiva'].includes(use))use='all';
    q.value=params.get('q')||'';if(params.has('sede'))sede.value=params.get('sede');if(!sede.value)sede.value='all';
    const topes=D.motos.reduce((t,m)=>{const p=D.plan(m.id);return {ini:Math.max(t.ini,p.alFirmar),cuota:Math.max(t.cuota,p.quincenal)};},{ini:0,cuota:0});
    initial.max=String(Math.ceil(topes.ini/50)*50||2500);initial.value=initial.max;quota.max=String(Math.ceil(topes.cuota/5)*5||250);quota.value=quota.max;
    if(params.has('inicial')&&Number.isFinite(Number(params.get('inicial'))))initial.value=params.get('inicial');
    if(params.has('cuota')&&Number.isFinite(Number(params.get('cuota'))))quota.value=params.get('cuota');
    if(params.has('sort'))sort.value=params.get('sort');if(!sort.value)sort.value='featured';
    function render(){
      const query=D.normalize(q.value),maxInitial=Number(initial.value),maxQuota=Number(quota.value);
      let list=D.motos.filter(m=>{const p=D.plan(m.id);const category=D.normalize(m.type+' '+m.cat);return (!query||D.normalize(m.name+' '+m.sedeName).includes(query))&&(sede.value==='all'||m.sede===sede.value)&&p.alFirmar<=maxInitial&&p.quincenal<=maxQuota&&(use==='all'||(use==='trabajo'&&/trabajo|carga|clasica|economica/.test(category))||(use==='ciudad'&&/urbana|scooter|lite/.test(category))||(use==='deportiva'&&/sport|deportiva|naked|racing/.test(category)));});
      if(sort.value==='quota')list.sort((a,b)=>D.plan(a.id).quincenal-D.plan(b.id).quincenal);
      if(sort.value==='initial')list.sort((a,b)=>D.plan(a.id).alFirmar-D.plan(b.id).alFirmar);
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
  // Tarjeta que gira: delante inicial y cuota; detras seguro, al firmar y monto financiado
  function flipCard(tipo,titulo,p,c){
    const pct=Math.round(p.pct*100),seg=String(c.seguroPct).replace('.',',');
    return '<div class="pg-flip pg-flip-'+tipo+'" tabindex="0" role="button" aria-label="'+escape(titulo)+': '+pct+'% de inicial. Toca para ver el seguro y el monto financiado.">'
      +'<div class="pg-flip-inner">'
      +'<div class="pg-flip-face pg-flip-front"><span class="pg-flip-label">'+escape(titulo)+'</span><strong class="pg-flip-pct">'+pct+'<small>%</small></strong>'
      +'<div class="pg-flip-row"><span>Inicial</span><b>'+D.money(p.inicial)+'</b></div>'
      +'<div class="pg-flip-quota"><span>Cuota quincenal</span><strong>'+D.money(p.quincenal)+'</strong><small>'+p.totalCuotas+' cuotas · '+p.meses+' meses</small></div>'
      +'<span class="pg-flip-more">↻ Seguro y financiamiento</span></div>'
      +'<div class="pg-flip-face pg-flip-back"><span class="pg-flip-label">'+escape(titulo)+' · '+pct+'%</span>'
      +'<div class="pg-flip-row"><span>Seguro ('+seg+'%)<small>se paga con la inicial</small></span><b>'+D.money(p.seguro)+'</b></div>'
      +'<div class="pg-flip-row"><span>Pagas al firmar<small>inicial + seguro</small></span><b>'+D.money(p.alFirmar)+'</b></div>'
      +'<div class="pg-flip-row"><span>Total en cuotas</span><b>'+D.money(p.totalEnCuotas)+'</b></div>'
      +'<div class="pg-flip-row pg-flip-total"><span>Monto financiado</span><b>'+D.money(p.financiado)+'</b></div></div>'
      +'</div></div>';
  }
  function setupSimulator(){
    const select=document.getElementById('simMoto');if(!select)return;populateModels(select);
    const urlId=new URLSearchParams(location.search).get('moto');select.value=D.get(urlId)?String(urlId):(D.get(5)?'5':String((D.motos[0]||{}).id||''));
    const c=D.condiciones,plazos=c.plazos,urlPlazo=Number(new URLSearchParams(location.search).get('plazo'));
    let plazo=plazos.includes(urlPlazo)?urlPlazo:plazos[plazos.length-1];
    const gallery=document.getElementById('galleryImage'),thumbs=document.getElementById('galleryThumbs');gallery.addEventListener('load',()=>fitPhoto(gallery));
    const cardsBox=document.getElementById('simCards'),plazosBox=document.getElementById('simPlazos'),pref=document.getElementById('simPref'),prefOut=document.getElementById('simPrefOut');
    pref.min=String(c.inicialMin);if(Number(pref.value)<c.inicialMin)pref.value=String(c.inicialMin);
    document.getElementById('simPrefHelp').textContent='Mueve la barra: desde el '+c.inicialMin+'% del precio de contado.';
    plazosBox.innerHTML=plazos.map(n=>'<button type="button" data-plazo="'+n+'">'+n+' meses</button>').join('');
    const tocar=!(root.matchMedia&&root.matchMedia('(hover: hover)').matches);
    document.getElementById('simHint').textContent=tocar?'Toca una tarjeta para ver el seguro y el monto financiado.':'Pasa el cursor sobre una tarjeta para ver el seguro y el monto financiado.';
    const cond=document.getElementById('simCondiciones');
    if(cond)cond.textContent='Inicial desde el '+c.inicialMin+'% del precio de contado, plazos de '+plazos.join(', ').replace(/, (\d+)$/,' o $1')+' meses con cuotas quincenales y un seguro del '+String(c.seguroPct).replace('.',',')+'% del precio de contado que se paga junto con la inicial. El cálculo utiliza una tasa anual efectiva de referencia del '+c.apy+'%. Los importes se muestran redondeados al dólar. El financiamiento está sujeto a evaluación y disponibilidad.';
    function render(){const m=D.get(select.value);if(!m)return;
      const pPref=Number(pref.value)/100;prefOut.textContent=Math.round(pPref*100)+'%';
      document.getElementById('simName').textContent=m.name;document.getElementById('simSpec').textContent=m.type;
      document.getElementById('simCC').textContent=m.cc==='—'?'Moto nueva':m.cc;document.getElementById('simSede').textContent=m.sedeName;
      document.getElementById('simPrice').textContent=D.money(m.precio);
      const base=D.plan(m.id,c.inicialMin/100,plazo);
      document.getElementById('simSeguro').textContent=D.money(base.seguro);document.getElementById('simSeguroLbl').textContent='Seguro ('+String(c.seguroPct).replace('.',',')+'%) · va con la inicial';
      // Sin inicial maxima (Adam, 13-oct-2026): la minima y la que el cliente prefiera
      cardsBox.innerHTML=flipCard('min','Inicial mínima',base,c)+flipCard('pref','Tu inicial preferida',D.plan(m.id,pPref,plazo),c);
      plazosBox.querySelectorAll('[data-plazo]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.plazo)===plazo)));
      document.getElementById('simBtn').href='solicitar.html?moto='+m.id;
      gallery.hidden=!m.image;gallery.src=m.id===5?'assets/public/ek-xpress-hero.webp':m.image||'';gallery.alt=m.name;fitPhoto(gallery);if(photoObserver)photoObserver.observe(gallery.parentElement);document.getElementById('galleryMissing').hidden=!!m.image;
      document.getElementById('galleryCaption').textContent=m.id===5?'Vista ilustrativa del modelo. Consulta la fotografía del catálogo.':(m.image?'Fotografía del catálogo. Confirma colores y disponibilidad con tu asesor.':'Solicita fotografías y disponibilidad a tu asesor.');
      thumbs.innerHTML=m.id===5?'<button class="pg-thumb" type="button" aria-pressed="true" data-gallery-src="assets/public/ek-xpress-hero.webp" data-illustrative="true"><img src="assets/public/ek-xpress-hero.webp" alt="">Otra perspectiva</button><button class="pg-thumb" type="button" aria-pressed="false" data-gallery-src="'+m.image+'"><img src="'+m.image+'" alt="">Foto del catálogo</button>':'';
      history.replaceState(null,'',location.pathname+'?moto='+m.id+(plazo!==plazos[plazos.length-1]?'&plazo='+plazo:''));
    }
    // En el telefono no hay cursor: la tarjeta gira al tocarla y vuelve al tocarla otra vez.
    // Con mouse gira sola al pasar por encima (CSS) y vuelve al retirarlo.
    cardsBox.addEventListener('click',e=>{const f=e.target.closest('.pg-flip');if(f&&tocar)f.classList.toggle('is-flipped');});
    cardsBox.addEventListener('keydown',e=>{const f=e.target.closest('.pg-flip');if(f&&(e.key==='Enter'||e.key===' ')){e.preventDefault();f.classList.toggle('is-flipped');}});
    cardsBox.addEventListener('mouseleave',e=>{cardsBox.querySelectorAll('.pg-flip.is-flipped').forEach(f=>f.classList.remove('is-flipped'));},true);
    select.addEventListener('change',render);pref.addEventListener('input',render);
    plazosBox.addEventListener('click',e=>{const b=e.target.closest('[data-plazo]');if(!b)return;plazo=Number(b.dataset.plazo);render();});
    thumbs.addEventListener('click',e=>{const b=e.target.closest('[data-gallery-src]');if(!b)return;gallery.src=b.dataset.gallerySrc;fitPhoto(gallery);thumbs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.getElementById('galleryCaption').textContent=b.dataset.illustrative?'Vista ilustrativa del modelo. Consulta la fotografía del catálogo.':'Fotografía del catálogo. Confirma colores y disponibilidad con tu asesor.';});render();
  }
  root.PagasiSite=Object.freeze({icon,escape,populateModels,card,fitPhotos});
  function init(){document.querySelectorAll('[data-icon]').forEach(el=>{el.outerHTML=icon(el.dataset.icon);});setupNav();document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());if(D){setupHome();setupCatalog();setupSimulator();}}
  // Espera el catalogo de la base (precios de Liz) hasta 2,5 s; si tarda, sigue con lo que hay.
  function arrancar(){
    const listo=(D&&typeof D.cargar==='function')?Promise.race([D.cargar(),new Promise(r=>setTimeout(r,2500))]):Promise.resolve();
    listo.then(init,init);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar);else arrancar();
})(window);
