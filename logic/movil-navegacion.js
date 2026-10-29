// Navegación táctil. Reutiliza el router y los permisos del sistema.
var _pgMenu={open:false,trigger:null,inert:[],overflow:'',pop:null};
var PG_MOBILE_LABELS={dash:'Inicio',motos:'Inventario de motos',creditos:'Ventas y solicitudes',pagos:'Cobranza',calculadora:'Calculadora',clientes:'Clientes'};
var PG_MENU_GROUPS=[
  {label:'Herramientas',keys:['calculadora','motos','contratos','aprobaciones']},
  {label:'Mi trabajo',keys:['dash','clientes','creditos']},
  {label:'Seguimiento',keys:['pagos','cobranza','redes','gps','notif']},
  {label:'Finanzas',keys:['reportes','cuentas','comisiones','conta']},
  {label:'Administración',keys:['concesionarios','users','catalogo','metricas','cumplimiento','plan','config','centro','scores','recursos']}
];
var PG_MENU_HINTS={dash:'Tu actividad y próximos pasos',clientes:'Buscar o registrar un cliente',motos:'Consultar el inventario',creditos:'Consultar el estado de una venta',calculadora:'Simular inicial y cuotas',contratos:'Preparar los documentos',aprobaciones:'Solicitudes por revisar',pagos:'Pagos y cuotas de clientes',redes:'Conversaciones con clientes',gps:'Ubicación y seguimiento',notif:'Avisos de tu cuenta',cuentas:'Saldos y movimientos',concesionarios:'Sedes y aliados',users:'Equipo y permisos',catalogo:'Productos de la página web'};
function pgNavElement(tag,cls,text){var el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=String(text);return el;}
function pgMobileGlyph(key){
  var paths={search:'<circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 4.5 4.5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',menu:'<path d="M4 7h16M4 12h16M4 17h10"/>',next:'<path d="m9 5 7 7-7 7"/>',moon:'<path d="M20.8 13.4A9 9 0 0 1 10.6 3.2a9 9 0 1 0 10.2 10.2Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>'};
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[key]||paths.next)+'</svg>';
}
function pgMobileModuleLabel(key){
  if(key==='creditos'&&typeof _puedeVender==='function'&&!_puedeVender())return 'Créditos';
  return PG_MOBILE_LABELS[key]||(typeof PGL!=='undefined'&&PGL[key])||'Pagasi';
}
function pgMobileNavigationRefresh(){
  if(!document.createElement||typeof S==='undefined')return;
  var root=document.getElementById('app-root'),bar=document.getElementById('mob-bottom-bar');
  var ready=!!(S.currentUser&&root&&root.style.display!=='none');
  if(bar)bar.setAttribute('data-ready',ready?'true':'false');
  if(!ready){if(_pgMenu.open)pgMobileMenuClose({navigation:true});return;}
  var top=document.getElementById('mobile-topbar'),title=document.getElementById('pgT-mob');if(!top||!title)return;
  if(!top.dataset.prepared){
    top.dataset.prepared='true';
    var context=pgNavElement('div','pg-mobile-context'),logo=pgNavElement('img');logo.src='assets/pagasi-logo.png';logo.alt='Pagasi';logo.width=76;logo.height=21;
    title.parentNode.insertBefore(context,title);context.appendChild(logo);context.appendChild(title);
    var menu=top.querySelector('.mob-menu-btn');if(menu){menu.innerHTML=pgMobileGlyph('menu');menu.setAttribute('aria-controls','pg-mobile-menu');menu.setAttribute('aria-haspopup','dialog');menu.setAttribute('aria-expanded','false');}
    var search=top.querySelector('[onclick="openMobSearch()"]');if(search){search.innerHTML=pgMobileGlyph('search');search.classList.add('pg-mobile-search');}
    var avatar=document.getElementById('mob-av');if(avatar){
      avatar.setAttribute('role','button');avatar.setAttribute('tabindex','0');avatar.setAttribute('aria-label','Mi cuenta');
      avatar.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();avatar.click();}});
    }
  }
  var label=pgMobileModuleLabel(S.page);
  if(title.textContent!==label)title.textContent=label;
}
function pgMobileMenuEntries(){
  var seen={},groups=[];
  PG_MENU_GROUPS.forEach(function(group){
    var keys=group.keys.filter(function(key){seen[key]=true;return hasModuleAccess(key)&&sidebarMuestra(key);});
    if(keys.length)groups.push({label:group.label,keys:keys});
  });
  var others=Object.keys(PGL).filter(function(key){return !seen[key]&&key!=='whatsapp'&&key!=='instagram'&&hasModuleAccess(key)&&sidebarMuestra(key);});
  if(others.length)groups.push({label:'Otros accesos',keys:others});
  return groups;
}
function pgMobileMenuFilter(value){
  var root=document.getElementById('pg-mobile-menu');if(!root)return;
  function clean(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  var q=clean(value||''),count=0;
  Array.prototype.forEach.call(root.querySelectorAll('.pg-menu-group'),function(group){
    var n=0;Array.prototype.forEach.call(group.querySelectorAll('[data-module]'),function(button){
      var match=!q||clean(button.dataset.search).indexOf(q)>=0;button.hidden=!match;if(match){n++;count++;}
    });group.hidden=!n;
  });
  root.querySelector('.pg-menu-empty').hidden=count>0;
  root.querySelector('.pg-menu-results-status').textContent=q?count+' acceso'+(count===1?'':'s')+' disponible'+(count===1?'':'s'):'';
}
function pgMobileMenuThemeRefresh(){
  var button=document.getElementById('pg-menu-theme');if(!button)return;
  var dark=document.documentElement.getAttribute('data-theme')==='dark',label=dark?'Activar modo claro':'Activar modo oscuro';
  button.setAttribute('aria-label',label);button.title=label;button.innerHTML=pgMobileGlyph(dark?'sun':'moon');
}
function pgMobileMenuOpen(){
  if(!S.currentUser||window.innerWidth>1024||_pgMenu.open||_pgMenu.pop)return;
  var old=document.getElementById('pg-mobile-menu');if(old)old.remove();
  var root=pgNavElement('div','pg-mobile-menu');root.id='pg-mobile-menu';
  var backdrop=pgNavElement('div','pg-menu-backdrop');backdrop.setAttribute('aria-hidden','true');backdrop.addEventListener('click',function(){pgMobileMenuClose();});root.appendChild(backdrop);
  var panel=pgNavElement('section','pg-menu-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','pg-menu-title');
  var handle=pgNavElement('span','pg-menu-handle');handle.setAttribute('aria-hidden','true');panel.appendChild(handle);
  var head=pgNavElement('div','pg-menu-head'),copy=pgNavElement('div');copy.appendChild(pgNavElement('span','pg-menu-kicker','TU ESPACIO PAGASI'));
  var title=pgNavElement('h2','','¿Qué necesitas hacer?');title.id='pg-menu-title';copy.appendChild(title);head.appendChild(copy);
  var close=pgNavElement('button','pg-menu-close');close.type='button';close.setAttribute('aria-label','Cerrar menú');close.innerHTML=pgMobileGlyph('close');close.addEventListener('click',function(){pgMobileMenuClose();});head.appendChild(close);panel.appendChild(head);
  var search=pgNavElement('div','pg-menu-search');var icon=pgNavElement('span');icon.innerHTML=pgMobileGlyph('search');search.appendChild(icon);
  var input=pgNavElement('input');input.id='pg-menu-search';input.type='search';input.placeholder='Buscar una herramienta';input.autocomplete='off';input.setAttribute('aria-label','Buscar una herramienta del menú');input.addEventListener('input',function(){pgMobileMenuFilter(input.value);});search.appendChild(input);panel.appendChild(search);
  var status=pgNavElement('div','pg-menu-results-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.appendChild(status);
  var list=pgNavElement('div','pg-menu-list');
  pgMobileMenuEntries().forEach(function(group){
    var section=pgNavElement('section','pg-menu-group');section.appendChild(pgNavElement('h3','',group.label));
    var grid=pgNavElement('div','pg-menu-grid');
    group.keys.forEach(function(key){
      var label=pgMobileModuleLabel(key),hint=PG_MENU_HINTS[key]||'Abrir '+label.toLowerCase();
      var button=pgNavElement('button','pg-menu-item');button.type='button';button.dataset.module=key;button.dataset.search=[label,hint,PGL[key],key].join(' ');
      if(S.page===key){button.classList.add('is-current');button.setAttribute('aria-current','page');}
      var pic=pgNavElement('span','pg-menu-icon');pic.innerHTML=pgNavIcon(key)||pgNavIcon('centro');pic.setAttribute('aria-hidden','true');button.appendChild(pic);
      var text=pgNavElement('span','pg-menu-item-copy');text.appendChild(pgNavElement('strong','',label));text.appendChild(pgNavElement('small','',hint));button.appendChild(text);
      var next=pgNavElement('span','pg-menu-next');next.innerHTML=pgMobileGlyph('next');button.appendChild(next);
      button.addEventListener('click',function(){pgMobileMenuClose({after:function(){if(hasModuleAccess(key))nav(key);}});});grid.appendChild(button);
    });section.appendChild(grid);list.appendChild(section);
  });
  var empty=pgNavElement('div','pg-menu-empty','No encontramos ese acceso. Prueba con otro nombre.');empty.hidden=true;list.appendChild(empty);panel.appendChild(list);
  var footer=pgNavElement('div','pg-menu-footer'),account=pgNavElement('button','pg-menu-account');account.type='button';
  var initials=(S.currentUser.nombre||'P').trim().split(/\s+/).slice(0,2).map(function(n){return n.charAt(0);}).join('');account.appendChild(pgNavElement('span','pg-menu-avatar',initials));
  var person=pgNavElement('span','pg-menu-person');person.appendChild(pgNavElement('strong','',S.currentUser.nombre||'Mi cuenta'));person.appendChild(pgNavElement('small','','Ver mi cuenta'));account.appendChild(person);
  var chevron=pgNavElement('span','pg-menu-next');chevron.innerHTML=pgMobileGlyph('next');account.appendChild(chevron);account.addEventListener('click',function(){pgMobileMenuClose({after:function(){showAdminProfile();}});});footer.appendChild(account);
  var theme=pgNavElement('button','pg-menu-theme');theme.id='pg-menu-theme';theme.type='button';theme.addEventListener('click',function(){toggleDark();pgMobileMenuThemeRefresh();});footer.appendChild(theme);panel.appendChild(footer);
  root.appendChild(panel);document.body.appendChild(root);
  _pgMenu.open=true;_pgMenu.trigger=document.activeElement;_pgMenu.overflow=document.body.style.overflow;_pgMenu.inert=[];
  ['app-root','mob-bottom-bar'].forEach(function(id){var el=document.getElementById(id);if(el){_pgMenu.inert.push({el:el,value:el.inert});el.inert=true;}});
  document.documentElement.classList.add('pg-menu-open');document.body.style.overflow='hidden';pgMobileMenuExpanded(true);pgMobileMenuViewport();
  try{history.pushState({app:'pagasi',page:S.page,pgMobileMenu:true},'',location.href);}catch(e){}
  pgMobileMenuThemeRefresh();close.focus({preventScroll:true});
}
function pgMobileMenuExpanded(on){
  Array.prototype.forEach.call(document.querySelectorAll('[aria-controls="pg-mobile-menu"]'),function(el){el.setAttribute('aria-expanded',on?'true':'false');});
}
function pgMobileMenuResume(){
  // Los datos siguen llegando; el redibujo espera a que termine la navegación.
  setTimeout(function(){if(!_pgMenu.open&&S.currentUser&&typeof _rtRenderPending!=='undefined'&&_rtRenderPending&&typeof scheduleRealtimeRender==='function')scheduleRealtimeRender();},0);
}
function pgMobileMenuClose(options){
  if(!_pgMenu.open)return false;
  var opts=options||{},root=document.getElementById('pg-mobile-menu');_pgMenu.open=false;if(root)root.hidden=true;
  document.documentElement.classList.remove('pg-menu-open');document.body.style.overflow=_pgMenu.overflow;
  _pgMenu.inert.forEach(function(item){item.el.inert=item.value;});_pgMenu.inert=[];pgMobileMenuExpanded(false);
  if(!opts.after&&_pgMenu.trigger&&_pgMenu.trigger.isConnected)_pgMenu.trigger.focus({preventScroll:true});
  var ownsHistory=history.state&&history.state.pgMobileMenu;
  if(ownsHistory&&!opts.fromHistory){
    if(opts.navigation){history.replaceState({app:'pagasi',page:S.page},'',location.href);}
    // Retirar primero la entrada del menú. La nueva página se abre después del
    // popstate para que Atrás vuelva a la pantalla que el vendedor estaba usando.
    else{_pgMenu.pop={after:opts.after};history.back();return true;}
  }
  if(opts.after)opts.after();pgMobileMenuResume();return true;
}
function pgMobileMenuBack(){
  if(_pgMenu.pop){var pending=_pgMenu.pop;_pgMenu.pop=null;if(pending.after)pending.after();pgMobileMenuResume();return true;}
  if(_pgMenu.open){pgMobileMenuClose({fromHistory:true});return true;}
  return false;
}
function pgMobileMenuViewport(){
  var root=document.getElementById('pg-mobile-menu');if(!root||!_pgMenu.open)return;
  var vv=window.visualViewport;root.style.setProperty('--pg-menu-height',(vv?vv.height:window.innerHeight)+'px');root.style.setProperty('--pg-menu-top',(vv?vv.offsetTop:0)+'px');
}
(function(){
  function start(){
    pgMobileNavigationRefresh();
    var app=document.getElementById('app-root');if(app&&typeof MutationObserver!=='undefined')new MutationObserver(pgMobileNavigationRefresh).observe(app,{attributes:true,attributeFilter:['style']});
    document.addEventListener('keydown',function(e){
      if(!_pgMenu.open)return;
      if(e.key==='Escape'){e.preventDefault();pgMobileMenuClose();return;}
      if(e.key!=='Tab')return;
      var root=document.getElementById('pg-mobile-menu');var focusable=Array.prototype.filter.call(root.querySelectorAll('button,input,[tabindex="0"]'),function(el){return !el.disabled&&el.getClientRects().length;});
      var first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    window.addEventListener('resize',function(){
      if(window.innerWidth>1024&&_pgMenu.open)pgMobileMenuClose({navigation:true});
      if(window.innerWidth<=1024&&S.currentUser)updateMobileNav();pgMobileNavigationRefresh();pgMobileMenuViewport();
    });
    if(window.visualViewport){window.visualViewport.addEventListener('resize',pgMobileMenuViewport);window.visualViewport.addEventListener('scroll',pgMobileMenuViewport);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
