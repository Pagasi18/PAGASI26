/* Request presentation only. All scoring, payload fields and writes remain in request.js. */
(function(){
  'use strict';
  const D=window.PagasiCatalog,select=document.getElementById('fM');
  function summary(){const m=D.get(select.value),p=m&&D.plan(m.id);const area=document.getElementById('requestSummary');
    area.innerHTML=m?'<h2>La moto que elegiste</h2>'+(m.image?'<div class="pg-summary-picture pg-photo-frame"><img class="pg-summary-image" src="'+m.image+'" alt="'+PagasiSite.escape(m.name)+'"></div>':'<p class="pg-note">Pide la fotografía del modelo a tu asesor.</p>')+'<h3>'+PagasiSite.escape(m.name)+'</h3><small>'+PagasiSite.escape(m.sedeName)+'</small><dl><div><dt>Inicial referencial</dt><dd>'+D.money(p.inicial)+'</dd></div><div><dt>Cuota quincenal</dt><dd>'+D.money(p.quincenal)+'</dd></div><div><dt>Plazo</dt><dd>12 meses · 24 pagos</dd></div></dl><a class="pg-link" href="simulador.html?moto='+m.id+'">Revisar este plan →</a><p class="pg-note">Importes redondeados de referencia. El plan y la disponibilidad se confirman con tu asesor.</p>':'<h2>Encuentra tu próxima moto</h2><p class="pg-note">Puedes enviar tu solicitud sin elegir un modelo. Un asesor te ayudará a encontrar una opción.</p><a class="pg-link" href="catalogo.html" style="margin-top:20px">Explorar el catálogo →</a>';
    PagasiSite.fitPhotos(area);
  }
  select.addEventListener('change',summary);summary();
  const observer=new MutationObserver(()=>{
    document.querySelectorAll('.prog .ps').forEach(el=>{if(el.classList.contains('on'))el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    if(document.getElementById('fOK').style.display==='block'){document.querySelector('.prog').hidden=true;document.getElementById('fOK').setAttribute('tabindex','-1');document.getElementById('fOK').focus();}
  });
  observer.observe(document.getElementById('fs1'),{attributes:true,attributeFilter:['class']});observer.observe(document.getElementById('fs2'),{attributes:true,attributeFilter:['class']});observer.observe(document.getElementById('fOK'),{attributes:true,attributeFilter:['style']});
  document.getElementById('btnContinuarSolicitud').addEventListener('click',()=>{if(document.getElementById('fs2').classList.contains('on')){document.getElementById('fs2').scrollIntoView({block:'start'});document.getElementById('wz_estado').focus({preventScroll:true});}});
  document.getElementById('btnAtrasSolicitud').addEventListener('click',()=>{document.getElementById('fs1').scrollIntoView({block:'start'});document.getElementById('wz_nom').focus({preventScroll:true});});
})();
