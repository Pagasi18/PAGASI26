/* Presentacion de la solicitud: el lateral (la moto elegida en la parte 1 y, despues,
   donde va la solicitud) y "Elegir de mis contactos". La validacion, lo que se guarda,
   la sesion y el paso entre partes viven en request.js, que llama a etapa() cada vez
   que cambia de pantalla (27-sep-2026). */
(function(){
  'use strict';
  const D=window.PagasiCatalog,select=document.getElementById('fM'),area=document.getElementById('requestSummary');
  const esc=s=>(window.PagasiSite&&PagasiSite.escape)?PagasiSite.escape(String(s==null?'':s)):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let etapaActual='parte1';
  function summary(){
    if(!select||!area||etapaActual!=='parte1') return;
    const m=D.get(select.value),p=m&&D.plan(m.id);
    area.innerHTML=m
      ? '<h2>La moto que elegiste</h2>'
        +(m.image?'<div class="pg-summary-picture pg-photo-frame"><img class="pg-summary-image" src="'+m.image+'" alt="'+esc(m.name)+'"></div>':'<p class="pg-note">Pide la fotografía del modelo a tu asesor.</p>')
        +'<h3>'+esc(m.name)+'</h3><small>'+esc(m.sedeName)+'</small>'
        +'<dl><div><dt>Inicial referencial</dt><dd>'+D.money(p.inicial)+'</dd></div><div><dt>Cuota quincenal</dt><dd>'+D.money(p.quincenal)+'</dd></div><div><dt>Plazo</dt><dd>12 meses · 24 pagos</dd></div></dl>'
        +'<a class="pg-link" href="simulador.html?moto='+m.id+'">Revisar este plan →</a>'
        +'<p class="pg-note">Importes de referencia. El plan y la disponibilidad se confirman con tu asesor.</p>'
      : '<h2>¿Todavía no sabes cuál?</h2><p class="pg-note">Envía la solicitud igual: un asesor te ayuda a elegir según tu presupuesto.</p><a class="pg-link" href="catalogo.html" style="margin-top:20px">Explorar el catálogo →</a>';
    if(window.PagasiSite&&PagasiSite.fitPhotos) PagasiSite.fitPhotos(area);
  }
  // Lo que dice el lateral en cada momento. El numero WEB- lo escribio la pagina (sale de
  // la cedula), igual se escapa.
  function etapa(info){
    info=info||{}; etapaActual=info.etapa||'parte1';
    if(!area) return;
    if(etapaActual==='parte1'){ summary(); return; }
    if(etapaActual==='fin'){
      // Revision del 27-sep-2026: en "duplicado" (no se pudo registrar) y "perdida" (no se
      // puede seguir desde aqui) la tarjeta dice "escribenos", y el lateral decia lo contrario
      // ("te escribimos"): quien no quedo registrado esperaba un mensaje que no iba a llegar.
      if(info.tipo==='duplicado'||info.tipo==='perdida'){
        const wa='https://wa.me/584242177798?text='+encodeURIComponent('Hola, intenté hacer mi solicitud por pagasi.io y no pude terminarla.');
        area.innerHTML='<h2>Escríbenos por WhatsApp</h2><p class="pg-note">Desde aquí no pudimos seguir con tu solicitud. Un asesor te atiende por WhatsApp.</p><a class="pg-button pg-button-full" href="'+wa+'" target="_blank" rel="noopener" style="margin-top:16px">Escribir por WhatsApp</a>';
        return;
      }
      area.innerHTML='<h2>Ya está en manos de un asesor</h2><p class="pg-note">Te escribimos por WhatsApp. Mientras tanto puedes seguir mirando el catálogo.</p><a class="pg-link" href="catalogo.html" style="margin-top:20px">Ver el catálogo →</a>';
      return;
    }
    const donde=etapaActual==='wizard'?'<p class="pg-summary-paso">Vas por la <b>parte '+esc(info.parte)+' de '+esc(info.total)+'</b>.</p>':'';
    area.innerHTML='<h2>Tu solicitud</h2>'
      +(info.leadId?'<p class="pg-summary-id">'+esc(info.leadId)+'</p>':'')
      +donde
      +'<p class="pg-note">Lo que llenes se guarda cada vez que tocas <b>Siguiente</b>. Al terminar, tu asesor te escribe con todo listo.</p>';
  }
  if(select){ select.addEventListener('change',summary); }
  summary();

  // Elegir de mis contactos: la Contact Picker API existe en Chrome de Android y en pocos
  // mas (no en iPhone ni dentro de Instagram). Donde no existe, el boton ni se ve.
  function contactosDisponibles(){
    try{ return !!(window.navigator&&navigator.contacts&&typeof navigator.contacts.select==='function'&&'ContactsManager' in window); }catch(e){ return false; }
  }
  async function elegirContacto(){
    if(!contactosDisponibles()) return null;
    try{
      const r=await navigator.contacts.select(['name','tel'],{multiple:false});
      if(!r||!r.length) return null;
      return { nom:(r[0].name||[])[0]||'', tel:(r[0].tel||[])[0]||'' };
    }catch(e){ return null; }
  }
  if(contactosDisponibles()){
    Array.prototype.forEach.call(document.querySelectorAll('[data-contacto]'),b=>{ b.hidden=false; });
  }
  window.PagasiSolicitudUI={ etapa, elegirContacto, contactosDisponibles };
})();
