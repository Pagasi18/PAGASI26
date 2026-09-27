/* Presentacion de la solicitud: el resumen de la moto elegida en el lateral. La
   validacion, el payload y las escrituras viven en request.js. */
(function(){
  'use strict';
  const D=window.PagasiCatalog,select=document.getElementById('fM'),area=document.getElementById('requestSummary');
  if(!select||!area) return;
  function summary(){
    const m=D.get(select.value),p=m&&D.plan(m.id);
    area.innerHTML=m
      ? '<h2>La moto que elegiste</h2>'
        +(m.image?'<div class="pg-summary-picture pg-photo-frame"><img class="pg-summary-image" src="'+m.image+'" alt="'+PagasiSite.escape(m.name)+'"></div>':'<p class="pg-note">Pide la fotografía del modelo a tu asesor.</p>')
        +'<h3>'+PagasiSite.escape(m.name)+'</h3><small>'+PagasiSite.escape(m.sedeName)+'</small>'
        +'<dl><div><dt>Inicial referencial</dt><dd>'+D.money(p.inicial)+'</dd></div><div><dt>Cuota quincenal</dt><dd>'+D.money(p.quincenal)+'</dd></div><div><dt>Plazo</dt><dd>12 meses · 24 pagos</dd></div></dl>'
        +'<a class="pg-link" href="simulador.html?moto='+m.id+'">Revisar este plan →</a>'
        +'<p class="pg-note">Importes de referencia. El plan y la disponibilidad se confirman con tu asesor.</p>'
      : '<h2>¿Todavía no sabes cuál?</h2><p class="pg-note">Envía la solicitud igual: un asesor te ayuda a elegir según tu presupuesto.</p><a class="pg-link" href="catalogo.html" style="margin-top:20px">Explorar el catálogo →</a>';
    PagasiSite.fitPhotos(area);
  }
  select.addEventListener('change',summary);
  summary();
  // Cuando la solicitud ya se envio, el lateral deja de hablar de "elegir"
  const ok=document.getElementById('fOK');
  if(ok&&typeof MutationObserver==='function'){
    new MutationObserver(()=>{ if(ok.classList.contains('on')){ area.innerHTML='<h2>Ya está en manos de un asesor</h2><p class="pg-note">Te escribimos por WhatsApp. Mientras tanto puedes seguir mirando el catálogo.</p><a class="pg-link" href="catalogo.html" style="margin-top:20px">Ver el catálogo →</a>'; } }).observe(ok,{attributes:true,attributeFilter:['class']});
  }
})();
