// Ayudas de venta en el móvil. Los formularios conservan sus campos y reglas.
var _pgProfileOpen='',_pgLastSale=null;
function pgSalesElement(tag,cls,text){
  var el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=String(text);return el;
}
function pgSalesHome(page){
  if(!page||!S.currentUser)return;
  pgSalesDashboardLayout(page);
  var clients=typeof _concFiltrarClientes==='function'?_concFiltrarClientes(S.clientes||[]):(S.clientes||[]);
  var motos=typeof _concFiltrar==='function'?_concFiltrar(S.motos||[]):(S.motos||[]);
  var credits=typeof _concFiltrar==='function'?_concFiltrar(S.creds||[]):(S.creds||[]);
  var shortcuts=[
    {key:'clientes',label:'Clientes',value:clients.filter(function(c){return !c.eliminado;}).length},
    {key:'motos',label:'Disponibles',value:motos.filter(function(m){return !m.eliminado&&m.estado==='disponible';}).length},
    {key:'creditos',label:'Solicitudes',value:credits.filter(function(c){return !c.eliminado&&c.estado==='pendiente_revision';}).length},
    {key:'pagos',label:'Cobranza',value:credits.filter(function(c){return !c.eliminado&&c.mora>0;}).length}
  ].filter(function(s){return hasModuleAccess(s.key)&&s.key!==S.page;});
  var signature=JSON.stringify([S.currentUser.uid,S.currentUser.nombre,S.page,shortcuts]);
  var old=page.querySelector('.pg-mobile-quickstart');if(old&&old.dataset.signature===signature)return;
  var box=pgSalesElement('section','pg-mobile-quickstart pg-sales-home');box.dataset.signature=signature;
  box.setAttribute('aria-label','Inicio de ventas');
  var name=(S.currentUser.nombre||'Equipo').trim().split(/\s+/)[0].toLowerCase();
  name=name.charAt(0).toUpperCase()+name.slice(1);
  var hero=pgSalesElement('div','pg-sales-hero');
  hero.appendChild(pgSalesElement('div','pg-sales-greeting','Tu espacio de ventas · '+name));
  hero.appendChild(pgSalesElement('h2','','Vamos por tu próxima venta.'));
  hero.appendChild(pgSalesElement('p','','Cliente, perfil y moto. Revisa la operación antes de guardarla.'));
  var next=pgSalesElement('button','pg-sales-new','Comenzar una venta');next.type='button';next.addEventListener('click',function(){openAddCred();});
  var arrow=pgSalesElement('span','','→');arrow.setAttribute('aria-hidden','true');next.appendChild(arrow);hero.appendChild(next);box.appendChild(hero);
  var grid=pgSalesElement('div','pg-sales-shortcuts');
  shortcuts.forEach(function(s){
    var button=pgSalesElement('button','pg-sales-shortcut');button.type='button';
    var icon=pgSalesElement('span','pg-sales-icon');icon.setAttribute('aria-hidden','true');icon.innerHTML=pgNavIcon(s.key);
    button.appendChild(icon);button.appendChild(pgSalesElement('strong','',s.value));button.appendChild(pgSalesElement('span','',s.label));
    if(s.key==='creditos')button.appendChild(pgSalesElement('small','','en revisión'));
    button.addEventListener('click',function(){nav(s.key);});grid.appendChild(button);
  });
  box.appendChild(grid);if(old)old.replaceWith(box);else page.insertBefore(box,page.firstChild);
}
function pgSalesDashboardLayout(page){
  if(S.page!=='dash')return;
  var current=page.querySelector('.pg-dashboard-more');
  if(window.innerWidth>1024){
    if(current){var content=current.querySelector('.pg-dashboard-content');while(content.firstChild)page.insertBefore(content.firstChild,current);current.remove();}
    return;
  }
  if(current)return;
  var details=pgSalesElement('details','pg-dashboard-more'),summary=pgSalesElement('summary','','Mi actividad y estadísticas'),body=pgSalesElement('div','pg-dashboard-content');
  Array.prototype.slice.call(page.children).forEach(function(child){if(!child.classList.contains('pg-mobile-quickstart'))body.appendChild(child);});
  details.appendChild(summary);details.appendChild(body);page.appendChild(details);
  details.addEventListener('toggle',function(){if(details.open)window.dispatchEvent(new Event('resize'));});
}

function pgMobileOpenField(el){
  var panel=el&&el.closest?el.closest('details.pg-form-section'):null;
  if(panel)panel.open=true;
}
function pgMobileGuidedProfile(ov){
  if(!ov||!document.createDocumentFragment)return;
  var mobile=window.innerWidth<=1024;
  if(!mobile){
    ov.classList.remove('pg-guided-profile');
    var introDesktop=ov.querySelector('.wz-h2');
    if(introDesktop&&introDesktop._pgBeforeGuidedText)introDesktop.textContent=introDesktop._pgBeforeGuidedText;
    var restored=[];
    Array.prototype.forEach.call(ov.querySelectorAll('details.pg-form-section'),function(panel){
      var card=pgSalesElement('div','wz-card');card.id=panel.id;
      card.appendChild(panel._pgHeading);
      var body=panel.querySelector('.pg-section-body');while(body.firstChild)card.appendChild(body.firstChild);
      var overview=card.querySelector('.pg-profile-overview');if(overview)overview.remove();
      panel.replaceWith(card);restored.push(card);
    });
    if(restored.length){
      var parent=restored[0].parentNode,anchor=document.createComment('perfil');parent.insertBefore(anchor,restored[0]);
      restored.sort(function(a,b){return parseInt(a.id.split('-').pop(),10)-parseInt(b.id.split('-').pop(),10);});
      restored.forEach(function(card){parent.insertBefore(card,anchor);});anchor.remove();
    }
    return;
  }
  if(ov.getAttribute('data-wizard')!=='solicitud'||WZ.step!==2){ov.classList.remove('pg-guided-profile');return;}
  ov.classList.add('pg-guided-profile');
  var intro=ov.querySelector('.wz-h2');if(intro){
    if(!intro._pgBeforeGuidedText)intro._pgBeforeGuidedText=intro.textContent;
    intro.textContent='Completa empleo e ingreso. Abre los demás bloques para revisar el expediente.';
  }
  var labels={
    residencia:'Dirección y vivienda',empleo:'Tipo de empleo e ingreso mensual',historial:'Deudas y referencias bancarias',
    cashea:'Historial informado por el cliente',referencias:'Personas de contacto',fiador:'Respaldo de la operación',
    documentos:'Fotografía o adjunta los respaldos',notas:'Contexto para quien revisa la venta'
  };
  Array.prototype.forEach.call(ov.querySelectorAll('.wz-card[id^="wz-sec-"]'),function(card){
    if(card.tagName==='DETAILS')return;
    var heading=card.querySelector('.wz-card-h');if(!heading)return;
    var title=heading.textContent.trim(),lower=title.toLowerCase();
    var key=Object.keys(labels).filter(function(k){return lower.indexOf(k)>=0;})[0]||'perfil';
    var panel=pgSalesElement('details','wz-card pg-form-section');panel.id=card.id;panel.dataset.section=key;panel._pgHeading=heading;
    var summary=pgSalesElement('summary','pg-section-summary');
    var icon=pgSalesElement('span','pg-section-icon');icon.innerHTML=pgNavIcon(key==='documentos'?'contratos':key==='empleo'?'centro':'clientes');icon.setAttribute('aria-hidden','true');
    var text=pgSalesElement('span','pg-section-copy');text.appendChild(pgSalesElement('strong','',title.charAt(0)+title.slice(1).toLowerCase()));
    text.appendChild(pgSalesElement('small','',labels[key]||'Datos del perfil'));
    summary.appendChild(icon);summary.appendChild(text);summary.appendChild(pgSalesElement('span','pg-section-state',''));
    var body=pgSalesElement('div','pg-section-body');heading.remove();while(card.firstChild)body.appendChild(card.firstChild);
    if(key==='empleo'){
      [['#wz_emp_g','pg-employment-choice'],['#wz_ing','pg-income-row']].forEach(function(pair){
        var row=body.querySelector(pair[0]);if(!row)return;
        while(row.parentNode&&row.parentNode!==body)row=row.parentNode;
        row.classList.add(pair[1]);
      });
      var overview=pgSalesElement('button','btn btn-g pg-profile-overview','Revisar otros datos');overview.type='button';
      overview.addEventListener('click',function(){panel.open=false;summary.focus();panel.scrollIntoView({block:'start',behavior:'auto'});});body.appendChild(overview);
    }
    panel.appendChild(summary);panel.appendChild(body);card.replaceWith(panel);
    panel.open=_pgProfileOpen?panel.id===_pgProfileOpen:key==='empleo';
    panel.addEventListener('toggle',function(){
      if(panel.open){
        _pgProfileOpen=panel.id;
        Array.prototype.forEach.call(ov.querySelectorAll('details.pg-form-section'),function(other){if(other!==panel)other.open=false;});
      }
      pgMobileUpdateSections();
    });
  });
  // Los campos obligatorios quedan primero; todos los demás siguen disponibles.
  var employment=ov.querySelector('details[data-section="empleo"]'),first=ov.querySelector('details.pg-form-section');
  if(employment&&first&&employment!==first)first.parentNode.insertBefore(employment,first);
  setTimeout(pgMobileUpdateSections,60);
}
function pgMobileUpdateSections(){
  var ov=document.getElementById('wz-overlay');if(!ov||!ov.querySelectorAll)return;
  Array.prototype.forEach.call(ov.querySelectorAll('[aria-invalid="true"][id$="_g"]'),function(group){
    if(typeof _wzChipVal!=='function'||!_wzChipVal(group.id))return;
    group.removeAttribute('aria-invalid');group.removeAttribute('aria-describedby');
    var error=document.getElementById(group.id+'-error');if(error)error.remove();
  });
  Array.prototype.forEach.call(ov.querySelectorAll('details.pg-form-section'),function(panel){
    var key=panel.dataset.section,state=panel.querySelector('.pg-section-state'),text='Opcional',done=false;
    if(key==='empleo'){
      var input=panel.querySelector('#wz_ing');
      done=!!(typeof _wzChipVal==='function'&&_wzChipVal('wz_emp_g')&&parseFloat(input&&input.value)>0);
      text=done?'Completo':'Requerido';
    }else if(key==='documentos'){
      var n=Array.isArray(WZ.documentos)?WZ.documentos.length:0;text=n?n+' archivo'+(n===1?'':'s'):'Sin archivos';done=n>0;
    }else{
      done=Array.prototype.some.call(panel.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=radio]):not([type=checkbox]),textarea,select'),function(el){return !!String(el.value||'').trim();});
      if(key==='residencia')done=Array.prototype.some.call(panel.querySelectorAll('input,textarea,select'),function(el){
        // El "No" del terremoto y su nivel oculto vienen de fábrica; no son una dirección respondida.
        if(el.id==='wz_terremoto')return el.value==='si';
        if(el.id==='wz_terremoto_danos')return false;
        return !!String(el.value||'').trim();
      });
      if(!done)done=!!panel.querySelector('input[type=radio]:checked,input[type=checkbox]:checked');
      if(!done&&typeof _wzChipVal==='function')done=Array.prototype.some.call(panel.querySelectorAll('[id$="_g"]'),function(group){return !!_wzChipVal(group.id);});
      text=done?'Con datos':'Opcional';
    }
    if(state&&state.textContent!==text)state.textContent=text;
    panel.classList.toggle('is-complete',done);
  });
}
function pgMobileGoToStep(step){
  var ov=document.getElementById('wz-overlay');
  if(!ov||step<1||step>=WZ.step)return;
  if(ov.getAttribute('data-wizard')==='cliente'){
    _cliCollectStep(WZ.step);WZ.step=step;_cliRender();
  }else{_wzCollectVisibleValues();WZ.step=step;_wzRender();}
}
function pgMobileStepLinks(ov){
  if(window.innerWidth>1024||!ov||!ov.querySelectorAll)return;
  Array.prototype.forEach.call(ov.querySelectorAll('.wz-step'),function(el,i){
    if(i+1>=WZ.step||el.dataset.linked)return;
    el.dataset.linked='true';el.setAttribute('role','button');el.tabIndex=0;
    el.setAttribute('aria-label','Volver al paso '+(i+1));
    el.addEventListener('click',function(){pgMobileGoToStep(i+1);});
    el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pgMobileGoToStep(i+1);}});
  });
}
function pgMobileReviewPrepare(){
  if(!document.createDocumentFragment)return;
  var sub=document.querySelector('#wz-overlay .wz-h2');
  if(window.innerWidth>1024){if(sub&&sub._pgBeforeReviewText)sub.textContent=sub._pgBeforeReviewText;return;}
  var root=document.getElementById('wz-resultado-contenido');if(!root||root.querySelector('.pg-review-score'))return;
  root.dataset.reviewReady='true';
  var decision=root.querySelector('.wz-dec'),plan=root.querySelector('.wz-plan-summary'),client=root.querySelector('.wz-client-summary'),score=root.querySelector('.wz-score');
  if(plan&&decision)decision.insertAdjacentElement('afterend',plan);
  [plan,client].forEach(function(card,i){
    if(!card)return;var head=card.querySelector('.wz-card-h');if(!head)return;
    var button=pgSalesElement('button','pg-review-edit','Editar');button.type='button';
    button.setAttribute('aria-label',i===0?'Editar moto y plan':'Editar datos del cliente');
    button.addEventListener('click',function(){pgMobileGoToStep(i===0?3:1);});head.appendChild(button);
  });
  if(score){
    var details=pgSalesElement('details','wz-card pg-review-score'),summary=pgSalesElement('summary','','Evaluación y score');
    summary.appendChild(pgSalesElement('span','',WZ.score+' / 850'));details.appendChild(summary);score.replaceWith(details);details.appendChild(score);root.appendChild(details);
  }
  if(sub){if(!sub._pgBeforeReviewText)sub._pgBeforeReviewText=sub.textContent;sub.textContent='Comprueba la moto, la inicial y la cuota antes de continuar.';}
}
function pgMobileSalesComplete(credit){
  if(!credit||!S.currentUser)return;
  _pgLastSale={id:String(credit.id),cliente:credit.cli||'',modelo:credit.modelo||'',estado:credit.estado,uid:S.currentUser.uid};
}
function pgMobileSalesPanel(cnt){
  if(!cnt||!document.createDocumentFragment)return;
  var existing=cnt.querySelector('.pg-sale-success');
  if(!_pgLastSale||!S.currentUser||_pgLastSale.uid!==S.currentUser.uid||['creditos','aprobaciones'].indexOf(S.page)<0){if(existing)existing.remove();return;}
  if(existing&&existing.dataset.credit===_pgLastSale.id)return;
  var credit=_pgLastSale,box=pgSalesElement('section','pg-sale-success');box.dataset.credit=credit.id;box.setAttribute('aria-label','Venta registrada');
  var top=pgSalesElement('div','pg-sale-success-top');top.appendChild(pgSalesElement('span','pg-sale-tick','✓'));
  var info=pgSalesElement('div');info.appendChild(pgSalesElement('strong','',credit.estado==='pendiente_revision'?'Solicitud enviada a revisión':'Crédito registrado'));
  info.appendChild(pgSalesElement('span','',credit.id+' · '+credit.cliente));top.appendChild(info);
  var dismiss=pgSalesElement('button','pg-sale-dismiss','×');dismiss.type='button';dismiss.setAttribute('aria-label','Cerrar confirmación');dismiss.addEventListener('click',function(){_pgLastSale=null;box.remove();});top.appendChild(dismiss);box.appendChild(top);
  box.appendChild(pgSalesElement('p','',credit.modelo));
  var actions=pgSalesElement('div','pg-sale-actions'),open=pgSalesElement('button','btn btn-p','Ver solicitud'),again=pgSalesElement('button','btn btn-g','Nueva venta');
  open.type=again.type='button';open.addEventListener('click',function(){openAmort(credit.id);});again.addEventListener('click',function(){openAddCred();});actions.appendChild(open);actions.appendChild(again);box.appendChild(actions);
  if(existing)existing.replaceWith(box);else{var page=cnt.querySelector('.page')||cnt;page.insertBefore(box,page.firstChild);}
}
(function(){
  function start(){
    var queued=false;
    function update(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;pgMobileUpdateSections();});}
    document.addEventListener('input',update);document.addEventListener('change',update);document.addEventListener('click',update);
    window.addEventListener('resize',function(){
      var ov=document.getElementById('wz-overlay');if(!ov||ov.style.display==='none')return;
      pgMobileGuidedProfile(ov);
      if(WZ.step===4&&ov.getAttribute('data-wizard')==='solicitud')_wzRenderResultado();
    });
  }
  if(document.readyState==='complete'||document.readyState==='interactive')start();else document.addEventListener('DOMContentLoaded',start);
})();
