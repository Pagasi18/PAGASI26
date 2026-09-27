// ══════════════════════════════════════════════════════════════════
// SOLICITUDES WEB · la bandeja del equipo (solo PAGASI 26, 27-sep-2026)
// ══════════════════════════════════════════════════════════════════
// Lo que entra por pagasi.io/solicitar aterriza en /clientes como lead con
// origen 'web'. Hasta hoy nadie se enteraba salvo que abriera Clientes y se
// fijara en un puntico azul (o una notificacion del navegador cada 30 min).
// Aqui se junta todo lo que hace falta para atenderlas:
//   · aviso en vivo cuando llega una nueva (tarjeta abajo a la derecha, mas la
//     notificacion del navegador si el usuario la tiene permitida)
//   · numero en el menu, al lado de Clientes, con las que faltan por atender
//   · pestaña "Solicitudes web" en Clientes
//   · en la ficha del cliente: de donde vino, que quiere, WhatsApp con el
//     mensaje escrito, "Crear solicitud" y "Marcar atendida"
// Atendida = alguien la marco (webAtendidaEn / webAtendidaPor) o ya tiene credito.
// Este archivo NO viene de PAGASI 18: preparar-clon-26.sh lo conserva y vuelve
// a poner los cuatro ganchos que lo llaman (admin.html, clientes, pagasi-app).

function _swEsLeadWeb(c){ return !!c && !c.eliminado && c.origen === 'web'; }
function _swTieneCredito(c){
  return (S.creds||[]).some(function(cr){ return cr && !cr.eliminado && (String(cr.cliId||'') === String(c.id) || (cr.cli && cr.cli === c.nombre)); });
}
function _swPendiente(c){ return _swEsLeadWeb(c) && !c.webAtendidaEn && !_swTieneCredito(c); }
function _swPendientes(){ return (S.clientes||[]).filter(_swPendiente); }
function _swEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
function _swPrimerNombre(c){ return String(c && c.nombre || '').trim().split(/\s+/)[0] || ''; }
// El WhatsApp con el mensaje ya escrito: el asesor solo pulsa enviar
function _swWaLink(c){
  var d = String(c.wa||c.tel||'').replace(/[^0-9]/g,'').replace(/^0/,'');
  if(!d) return '';
  var moto = c.moto_interes_modelo ? (' por la '+c.moto_interes_modelo) : '';
  var msg = 'Hola '+_swPrimerNombre(c)+', te escribo de Pagasi por tu solicitud'+moto+'. ¿Hablamos?';
  return 'https://wa.me/58'+d+'?text='+encodeURIComponent(msg);
}
// El rango que declaro el cliente viaja en las notas ("Ingreso declarado: $300 a $500")
function _swIngreso(c){
  var m = /Ingreso declarado: ([^·]+)/.exec(String(c.notas||''));
  if(m) return m[1].trim();
  return c.ingreso ? (typeof fmt==='function' ? fmt(c.ingreso) : '$'+c.ingreso)+'/mes' : '—';
}
function _swCuando(iso){
  if(!iso) return '—';
  try{
    var d = new Date(iso);
    var rel = (typeof fechaRel==='function') ? fechaRel(iso) : '';
    return d.toLocaleDateString('es-VE',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'})+(rel?' · '+rel:'');
  }catch(e){ return String(iso).slice(0,16); }
}

// ── Aviso en vivo ─────────────────────────────────────────────────────────
// Lo llama el onSnapshot de clientes con cada foto. La primera foto trae TODO como
// "added", asi que solo se avisa cuando ya hubo una foto anterior.
var _swAvisadas = {};
function _swAvisarNuevos(snap, yaHuboFoto){
  try{
    if(!yaHuboFoto || !snap || typeof snap.docChanges !== 'function') return;
    snap.docChanges().forEach(function(ch){
      if(!ch || ch.type !== 'added' || !ch.doc) return;
      var c = ch.doc.data() || {}; c.id = ch.doc.id;
      if(!_swEsLeadWeb(c) || _swAvisadas[c.id]) return;
      _swAvisadas[c.id] = true;
      _swMostrarAviso(c);
      if(typeof pushNotifShow === 'function'){
        pushNotifShow('Nueva solicitud web', (c.nombre||'')+(c.moto_interes_modelo ? ' · '+c.moto_interes_modelo : ''), 'sw-'+c.id);
      }
    });
    _swSidebarBadge();
  }catch(e){ console.warn('solicitudes web (aviso):', e && e.message); }
}
// Tarjeta fija abajo a la derecha, 20 segundos o hasta que la cierren. No se usa
// toast(): dura 3 segundos y una solicitud nueva merece mas que eso.
function _swMostrarAviso(c){
  try{
    var id = 'sw-aviso', box = document.getElementById(id);
    if(!box){
      box = document.createElement('div'); box.id = id;
      box.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:3000;max-width:340px;background:var(--surf,#fff);color:var(--ink,#111);border:1px solid var(--rim,#e5e7eb);border-left:4px solid var(--p1,#2563eb);border-radius:14px;padding:12px 14px;box-shadow:0 12px 40px rgba(37,99,235,.22);font-family:var(--f,system-ui);display:none';
      document.body.appendChild(box);
    }
    var moto = c.moto_interes_modelo ? _swEsc(c.moto_interes_modelo) : 'pide asesoría';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">'
      + '<div><div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--p1,#2563eb)">Nueva solicitud web</div>'
      + '<div style="font-size:14px;font-weight:800;margin-top:2px">'+_swEsc(c.nombre||'Sin nombre')+'</div>'
      + '<div style="font-size:12px;color:var(--ink3,#6b7280);margin-top:2px">'+moto+(c.ciudad?' · '+_swEsc(c.ciudad):'')+'</div></div>'
      + '<button type="button" onclick="document.getElementById(\'sw-aviso\').style.display=\'none\'" style="border:0;background:none;font-size:16px;cursor:pointer;color:var(--ink3,#6b7280)" aria-label="Cerrar">✕</button></div>'
      + '<div style="display:flex;gap:6px;margin-top:10px">'
      + '<button type="button" class="btn btn-p btn-xs" onclick="_swAbrirBandeja();document.getElementById(\'sw-aviso\').style.display=\'none\'">Ver solicitudes</button>'
      + '<button type="button" class="btn btn-g btn-xs" onclick="document.getElementById(\'sw-aviso\').style.display=\'none\';verCliente(\''+String(c.id).replace(/[^A-Za-z0-9_-]/g,'')+'\')">Abrir ficha</button>'
      + '</div>';
    box.style.display = 'block';
    clearTimeout(box._t); box._t = setTimeout(function(){ box.style.display = 'none'; }, 20000);
  }catch(e){}
}
function _swAbrirBandeja(){
  S.clienteEstadoFiltro = 'web';
  if(typeof closeM === 'function') try{ closeM(); }catch(e){}
  if(typeof nav === 'function') nav('clientes');
}

// ── El numero en el menu, al lado de Clientes ─────────────────────────────
function _swSidebarBadge(){
  try{
    var btn = document.querySelector('.sb-nav [data-nav="clientes"]'); if(!btn) return;
    var n = _swPendientes().length, bx = btn.querySelector('.si-bx.sw');
    if(!n){ if(bx) bx.remove(); return; }
    if(!bx){ bx = document.createElement('span'); bx.className = 'si-bx sw'; btn.appendChild(bx); }
    bx.textContent = n; bx.title = n+' solicitud'+(n!==1?'es':'')+' web sin atender';
  }catch(e){}
}
// La pestaña de Clientes, con el numero de pendientes
function _swChip(){
  var n = _swPendientes().length;
  return ['web', 'Solicitudes web'+(n ? ' · '+n : '')];
}

// ── En la ficha del cliente ───────────────────────────────────────────────
function _swFichaHtml(c){
  if(!_swEsLeadWeb(c)) return '';
  var pend = _swPendiente(c), conCred = _swTieneCredito(c), wa = _swWaLink(c);
  var idSeguro = String(c.id).replace(/[^A-Za-z0-9_-]/g,'');
  var f = function(l, v){ return '<div class="cf-field"><div class="cf-field-l">'+_swEsc(l)+'</div><div class="cf-field-v'+(v?'':' is-empty')+'">'+(v?_swEsc(v):'—')+'</div></div>'; };
  var estado = conCred ? ['Ya tiene crédito','rgba(16,185,129,.12)','var(--green,#059669)']
             : pend ? ['Sin atender','rgba(37,99,235,.12)','var(--p1,#2563eb)']
                    : ['Atendida','rgba(16,185,129,.12)','var(--green,#059669)'];
  var puedeVender = (typeof _puedeVender !== 'function') || _puedeVender();
  return '<div class="cf-section" style="border-left:3px solid var(--p1);margin-bottom:12px">'
    + '<div class="cf-section-h"><div class="cf-section-t">Solicitud web · '+_swEsc(c.id)+'</div>'
    + '<span class="bdg" style="background:'+estado[1]+';color:'+estado[2]+'">'+estado[0]+'</span></div>'
    + '<div class="cf-grid-3">'
    + f('Llegó', _swCuando(c.creado))
    + f('Moto de interés', c.moto_interes_modelo ? c.moto_interes_modelo+(c.moto_interes_sede?' · '+c.moto_interes_sede:'') : 'Pide asesoría')
    + f('Ingreso declarado', _swIngreso(c))
    + f('Se dedica a', c.trabajo)
    + f('Zona', c.ciudad)
    + f('Atendida por', c.webAtendidaPor ? c.webAtendidaPor+' · '+_swCuando(c.webAtendidaEn) : '')
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'
    + (wa ? '<a class="btn btn-sm" style="background:#25D366;color:#fff;border-color:#25D366" href="'+wa+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">WhatsApp con mensaje listo</a>' : '')
    + (puedeVender && !conCred ? '<button type="button" class="btn btn-p btn-sm" onclick="_swCrearSolicitud(\''+idSeguro+'\')">Crear solicitud</button>' : '')
    + (pend ? '<button type="button" class="btn btn-g btn-sm" onclick="_swMarcarAtendida(\''+idSeguro+'\')">Marcar atendida</button>'
            : (!conCred && c.webAtendidaEn ? '<button type="button" class="btn btn-g btn-sm" onclick="_swMarcarAtendida(\''+idSeguro+'\', true)">Volver a pendiente</button>' : ''))
    + '</div></div>';
}
// Se abre el asistente con este cliente ya elegido (el paso 1 busca por cliente)
function _swCrearSolicitud(id){
  if(typeof closeM === 'function') try{ closeM(); }catch(e){}
  if(typeof openAddCred !== 'function') return;
  openAddCred();
  setTimeout(function(){ if(typeof _wzCliPick === 'function') _wzCliPick(id); }, 120);
}
function _swMarcarAtendida(id, deshacer){
  var c = (S.clientes||[]).find(function(x){ return String(x.id) === String(id); });
  if(!c) return;
  var quien = (S.currentUser && (S.currentUser.nombre || S.currentUser.email)) || 'Equipo';
  if(deshacer){ c.webAtendidaEn = ''; c.webAtendidaPor = ''; }
  else { c.webAtendidaEn = new Date().toISOString(); c.webAtendidaPor = quien; }
  var p = (typeof DB !== 'undefined' && DB && typeof DB.saveCliente === 'function')
    ? DB.saveCliente({ id: c.id, webAtendidaEn: c.webAtendidaEn, webAtendidaPor: c.webAtendidaPor })
    : Promise.resolve(false);
  Promise.resolve(p).then(function(){
    if(typeof toast === 'function') toast(deshacer ? 'Solicitud de vuelta a pendientes' : 'Solicitud marcada como atendida', 'success');
    _swSidebarBadge();
    if(typeof verCliente === 'function') verCliente(c.id);
    if(S.page === 'clientes' && typeof nav === 'function') nav('clientes');
  }).catch(function(e){ if(typeof toast === 'function') toast('No se pudo guardar: '+(e && e.message || e), 'error'); });
}
