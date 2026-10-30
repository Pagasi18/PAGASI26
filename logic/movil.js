// Presentación móvil: no cambia validaciones, cálculos, permisos ni persistencia.
var _pgMobileObserver=null,_pgMobileFrame=0,_pgWizardHistory=false;
function pgMobilePrepare(){
  if(typeof pgMobileNavigationRefresh==='function')pgMobileNavigationRefresh();
  var cnt=document.getElementById('cnt');
  if(cnt && typeof S!=='undefined'){
    cnt.setAttribute('data-page',S.page||'');
    if(['clientes','motos','creditos','pagos','contratos'].indexOf(S.page)>=0){   // 30-oct-2026: Cobranza y Contratos también en fichas (la tabla de 1.200 px era inusable en el teléfono)
      Array.prototype.forEach.call(cnt.querySelectorAll('.tw'),function(wrap){
        var heads=wrap.querySelectorAll('thead th');
        if(!heads.length)return;
        wrap.classList.add('pg-mobile-table');
        Array.prototype.forEach.call(wrap.querySelectorAll('tbody tr'),function(row){
          Array.prototype.forEach.call(row.children,function(cell,i){
            var label=heads[i]?(heads[i].textContent||'').replace(/[↑↓↕]/g,'').trim():'';
            if(cell.getAttribute('data-label')!==label)cell.setAttribute('data-label',label);
          });
        });
      });
    }
    if((S.page==='dash'||S.page==='motos') && typeof _puedeVender==='function' && _puedeVender() && hasModuleAccess('creditos')){
      var page=cnt.querySelector('.page');
      if(page && typeof pgSalesHome==='function')pgSalesHome(page);
      else if(page && !page.querySelector('.pg-mobile-quickstart')){
        page.insertAdjacentHTML('afterbegin','<div class="pg-mobile-quickstart"><div><b>Tu próxima venta</b><p>Cliente · Perfil · Moto · Revisión</p></div><button type="button" class="btn btn-p" onclick="openAddCred()">＋ Nueva solicitud</button></div>');
      }
    }
    if(typeof pgMobileSalesPanel==='function')pgMobileSalesPanel(cnt);
  }
  var ov=document.getElementById('wz-overlay');
  var scope=ov&&ov.style.display!=='none'?ov:cnt;
  if(scope){
    Array.prototype.forEach.call(scope.querySelectorAll('input,select,textarea'),function(el){
      if(el.tagName==='INPUT'){
        if(el.type==='tel'||/(?:tel|wa|telefono)$/.test(el.id)){el.setAttribute('inputmode','tel');el.setAttribute('autocomplete','tel');}
        if(el.type==='email'){el.setAttribute('inputmode','email');el.setAttribute('autocomplete','email');}
        if(el.type==='number')el.setAttribute('inputmode',el.step==='1'?'numeric':'decimal');
        if(el.id==='wz_ci')el.setAttribute('inputmode','text');
        if(el.id==='wz_nom')el.setAttribute('autocomplete','name');
      }
      if(el.id && !el.getAttribute('aria-label') && !scope.querySelector('label[for="'+el.id+'"]')){
        var group=el.closest('.fg'),label=group&&group.querySelector('label.fsec');
        if(label){label.setAttribute('for',el.id);}
      }
    });
  }
  if(ov){var head=ov.querySelector('.wz-head');if(head)ov.style.setProperty('--pg-wz-head',head.offsetHeight+'px');}
}
function pgMobileFieldError(id,message){
  if(typeof toast==='function')toast(message,'error');
  var el=document.getElementById(id);
  if(!el)return false;
  if(typeof pgMobileOpenField==='function')pgMobileOpenField(el);
  if(el.focus){try{el.focus({preventScroll:true});}catch(e){el.focus();}}
  if(typeof el.insertAdjacentElement!=='function')return false;
  el.setAttribute('aria-invalid','true');
  var old=document.getElementById(id+'-error');
  if(!old){old=document.createElement('div');old.id=id+'-error';old.className='pg-mobile-error';old.setAttribute('role','alert');el.insertAdjacentElement('afterend',old);}
  old.textContent=message;el.setAttribute('aria-describedby',old.id);
  if(el.scrollIntoView)el.scrollIntoView({block:'center',behavior:'auto'});
  return false;
}
function pgMobileWizardOpened(kind){
  var ov=document.getElementById('wz-overlay');if(!ov||!ov.style||typeof ov.style.setProperty!=='function')return;
  ov.setAttribute('data-wizard',kind);ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.setAttribute('data-step',String(WZ.step));
  ov.setAttribute('aria-label',kind==='cliente'?'Ficha del cliente':'Solicitud de venta');
  document.documentElement.classList.add('pg-wizard-open');
  if(window.innerWidth<=1024 && !_pgWizardHistory){
    try{history.pushState({app:'pagasi',page:S.page,wizard:kind},'',location.href);_pgWizardHistory=true;}catch(e){}
  }
  ov.scrollTop=0;
  if(typeof pgMobileGuidedProfile==='function')pgMobileGuidedProfile(ov);
  if(typeof pgMobileStepLinks==='function')pgMobileStepLinks(ov);
  pgMobilePrepare();
}
function pgMobileWizardClosed(){
  document.documentElement.classList.remove('pg-wizard-open');
  if(typeof _pgProfileOpen!=='undefined')_pgProfileOpen='';
  var ov=document.getElementById('wz-overlay');if(ov&&ov.removeAttribute)ov.removeAttribute('data-wizard');
  if(_pgWizardHistory){_pgWizardHistory=false;try{history.replaceState({app:'pagasi',page:S.page},'',location.href);}catch(e){}}
}
function pgMobileWizardBack(){
  var ov=document.getElementById('wz-overlay');
  if(!ov||ov.style.display==='none'||!_pgWizardHistory)return false;
  if(WZ.step>1){
    if(ov.getAttribute('data-wizard')==='cliente')_cliPrev();else _wzPrev();
    try{history.pushState({app:'pagasi',page:S.page,wizard:ov.getAttribute('data-wizard')},'',location.href);}catch(e){}
  }else{_pgWizardHistory=false;_wzClose();}
  return true;
}
function pgMobileViewport(){
  var vv=window.visualViewport,active=document.activeElement;
  var editing=active&&/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName);
  var bottom=vv?Math.max(0,window.innerHeight-vv.height-vv.offsetTop):0;
  var keyboard=editing&&bottom>120;
  document.documentElement.classList.toggle('pg-keyboard-open',!!keyboard);
  document.documentElement.style.setProperty('--pg-keyboard-bottom',keyboard?Math.round(bottom)+'px':'0px');
  var ov=document.getElementById('wz-overlay'),head=ov&&ov.querySelector('.wz-head');
  if(head)ov.style.setProperty('--pg-wz-head',head.offsetHeight+'px');
}
(function(){
  function start(){
    var cnt=document.getElementById('cnt');
    if(cnt && typeof MutationObserver!=='undefined'){
      _pgMobileObserver=new MutationObserver(function(){
        if(_pgMobileFrame)return;
        _pgMobileFrame=requestAnimationFrame(function(){_pgMobileFrame=0;pgMobilePrepare();});
      });
      _pgMobileObserver.observe(cnt,{childList:true,subtree:true});
    }
    document.addEventListener('input',function(ev){
      var el=ev.target;if(!el||!el.getAttribute||el.getAttribute('aria-invalid')!=='true')return;
      el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');
      var error=document.getElementById(el.id+'-error');if(error)error.remove();
    });
    document.addEventListener('focusin',pgMobileViewport);document.addEventListener('focusout',pgMobileViewport);
    if(window.visualViewport){window.visualViewport.addEventListener('resize',pgMobileViewport);window.visualViewport.addEventListener('scroll',pgMobileViewport);}
    window.addEventListener('resize',function(){pgMobileViewport();pgMobilePrepare();});
    pgMobilePrepare();
  }
  if(document.readyState==='complete'||document.readyState==='interactive')start();else document.addEventListener('DOMContentLoaded',start);
})();
