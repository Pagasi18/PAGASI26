// ══════════════════════════════════════════════════════════════════
// SOLICITUDES WEB · la bandeja del equipo (solo PAGASI 26, 27-sep-2026)
// ══════════════════════════════════════════════════════════════════
// Lo que entra por pagasi.io/solicitar aterriza en /clientes como lead con
// origen 'web'. Hasta hoy nadie se enteraba salvo que abriera Clientes y se
// fijara en un puntico azul (o una notificacion del navegador cada 30 min).
// Aqui se junta todo lo que hace falta para atenderlas:
//   · aviso en vivo cuando llega una nueva, y cuando el cliente TERMINA de
//     llenarla (tarjeta abajo a la derecha, mas la notificacion del navegador
//     si el usuario la tiene permitida)
//   · numero en el menu, al lado de Clientes, con las que faltan por atender
//   · pestaña "Solicitudes web" en Clientes
//   · en la ficha del cliente: de donde vino, que quiere, cuanto lleno del
//     formulario por partes, WhatsApp con el mensaje escrito, "Crear solicitud",
//     "Marcar atendida" y "Cerrar formulario"
// Atendida = alguien la marco (webAtendidaEn / webAtendidaPor) o ya tiene credito.
// Cerrada = el equipo la cerro (web_cerrado): desde ahi el cliente ya no puede
// cambiar nada desde la web, y lo que corrija el asesor no se pisa.
// Este archivo NO viene de PAGASI 18: preparar-clon-26.sh lo conserva y vuelve
// a poner los cuatro ganchos que lo llaman (admin.html, clientes, pagasi-app).

var SW_PARTES = 9;   // el formulario de solicitar.html tiene 9 partes
function _swEsLeadWeb(c){ return !!c && !c.eliminado && c.origen === 'web'; }
// El credito guarda su cliente en clienteId (_wzGuardar en logic/creditos.js); cliId es de
// los creditos viejos. Se buscaba solo cliId, asi que un credito nuevo se reconocia nada
// mas por el nombre, y otro cliente con el mismo nombre y credito dejaba este lead como
// "Ya tiene credito". Por nombre solo los creditos que no traen ninguno de los dos
// (integracion con PAGASI 18, 27-sep-2026).
function _swTieneCredito(c){
  return (S.creds||[]).some(function(cr){
    if(!cr || cr.eliminado) return false;
    var cid = (cr.clienteId != null && String(cr.clienteId) !== '') ? cr.clienteId : cr.cliId;
    if(cid != null && String(cid) !== '') return String(cid) === String(c.id);
    return !!cr.cli && cr.cli === c.nombre;
  });
}
// "Sin atender" solo si nadie la marco, no esta cerrada y no tiene credito
function _swPendiente(c){ return _swEsLeadWeb(c) && !c.webAtendidaEn && !c.web_cerrado && !_swTieneCredito(c); }
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
// Las horas del formulario (web_ts, web_act, web_fin) son de Firestore: llegan como
// Timestamp, como {seconds} si pasaron por la cache del navegador, o como texto ISO.
function _swFecha(v){
  if(!v) return null;
  try{
    if(typeof v.toDate === 'function') return v.toDate();
    if(typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    var d = new Date(v); return isNaN(d.getTime()) ? null : d;
  }catch(e){ return null; }
}
// "hace 5 min", "hace 3 h", "hace 2 días"
function _swHace(v){
  var d = _swFecha(v); if(!d) return '';
  var min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if(min < 1) return 'hace un momento';
  if(min < 60) return 'hace '+min+' min';
  var h = Math.round(min / 60); if(h < 24) return 'hace '+h+' h';
  var dias = Math.round(h / 24); return 'hace '+dias+(dias === 1 ? ' día' : ' días');
}
// El ingreso que declaro: el rango de la parte 1 (ingreso_rango; en los leads de antes
// viajaba en las notas) y, si lo dio en la parte 4, la cifra que calculo el formulario.
function _swIngreso(c){
  var rango = c.ingreso_rango || '';
  if(!rango){ var m = /Ingreso declarado: ([^·]+)/.exec(String(c.notas||'')); if(m) rango = m[1].trim(); }
  var monto = c.ingreso ? (typeof fmt==='function' ? fmt(c.ingreso) : '$'+c.ingreso)+'/mes' : '';
  if(c.ingreso_exacto && monto) return monto + (rango ? ' (marcó '+rango+')' : '');
  return rango || monto || '—';
}
var SW_TRABAJO = { formal:'Empleado en empresa privada', publico:'Empleado público', delivery:'Delivery / motorizado', independiente:'Independiente', comerciante:'Comerciante / negocio propio', remesas:'Vive de remesas', informal:'Trabajo informal' };
var SW_USO = { personal:'Personal', delivery:'Para trabajar (delivery, mototaxi)', negocio:'Para su negocio' };
var SW_INICIAL = { 'nada':'Todavía nada', '<200':'Menos de $200', '200-400':'$200 a $400', '400-700':'$400 a $700', '700+':'Más de $700' };
var SW_COBRO = { quincenal:'Quincenal', semanal:'Semanal', diario:'Diario', mensual:'Mensual', variable:'Variable, cuando hay trabajo' };
function _swTxt(mapa, v){ return v ? (mapa[v] || String(v)) : ''; }
// Cuanto lleno del formulario por partes
function _swAvance(c){
  if(c.web_cerrado) return 'Formulario cerrado'+(c.web_cerrado_por ? ' por '+c.web_cerrado_por : '');
  if(c.web_fin) return 'Terminó el formulario'+(_swHace(c.web_fin) ? ' · '+_swHace(c.web_fin) : '');
  var paso = parseInt(c.web_paso, 10) || 0;
  if(!paso) return c.web_uid ? 'Llenó la parte 1' : 'Formulario corto (antes de las partes)';
  var t = 'Llenó '+paso+' de '+SW_PARTES+' partes';
  var act = _swFecha(c.web_act);
  if(act){
    var min = (Date.now() - act.getTime()) / 60000;
    t += (min < 60 ? ' · Sigue llenando: último cambio ' : ' · Último cambio ') + _swHace(c.web_act);
  }
  return t;
}
function _swCuando(iso){
  if(!iso) return '—';
  try{
    var d = _swFecha(iso); if(!d) return String(iso).slice(0,16);
    var rel = (typeof fechaRel==='function') ? fechaRel(d.toISOString()) : '';
    return d.toLocaleDateString('es-VE',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'})+(rel?' · '+rel:'');
  }catch(e){ return String(iso).slice(0,16); }
}

// ── Aviso en vivo ─────────────────────────────────────────────────────────
// Lo llama el onSnapshot de clientes con cada foto. La primera foto trae TODO como
// "added", asi que solo se avisa cuando ya hubo una foto anterior. Tambien se avisa
// cuando un cliente toca "Terminar" (le aparece web_fin): ese es el momento de escribirle.
// Solo si web_fin es de los ultimos 10 minutos: si el equipo toca una ficha que termino
// hace dias, no es noticia.
var _swAvisadas = {}, _swTerminadas = {};
function _swTerminoRecien(c){ var d = _swFecha(c.web_fin); return !!d && (Date.now() - d.getTime()) < 10*60000; }
function _swAvisarNuevos(snap, yaHuboFoto){
  try{
    if(!yaHuboFoto || !snap || typeof snap.docChanges !== 'function') return;
    snap.docChanges().forEach(function(ch){
      if(!ch || !ch.doc) return;
      var c = ch.doc.data() || {}; c.id = ch.doc.id;
      if(!_swEsLeadWeb(c)) return;
      if(ch.type === 'added' && !_swAvisadas[c.id]){
        _swAvisadas[c.id] = true;
        if(c.web_fin) _swTerminadas[c.id] = true;
        _swMostrarAviso(c);
        if(typeof pushNotifShow === 'function'){
          pushNotifShow('Nueva solicitud web', (c.nombre||'')+(c.moto_interes_modelo ? ' · '+c.moto_interes_modelo : ''), 'sw-'+c.id);
        }
      } else if(ch.type === 'modified' && !_swTerminadas[c.id] && _swTerminoRecien(c)){
        _swTerminadas[c.id] = true;
        _swMostrarAviso(c, true);
        if(typeof pushNotifShow === 'function'){
          pushNotifShow('Terminó su solicitud web', (c.nombre||'')+' ya llenó el formulario', 'sw-fin-'+c.id);
        }
      }
    });
    _swSidebarBadge();
  }catch(e){ console.warn('solicitudes web (aviso):', e && e.message); }
}
// Tarjeta fija abajo a la derecha, 20 segundos o hasta que la cierren. No se usa
// toast(): dura 3 segundos y una solicitud nueva merece mas que eso.
function _swMostrarAviso(c, termino){
  try{
    var id = 'sw-aviso', box = document.getElementById(id);
    if(!box){
      box = document.createElement('div'); box.id = id;
      box.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:3000;max-width:340px;background:var(--surf,#fff);color:var(--ink,#111);border:1px solid var(--rim,#e5e7eb);border-left:4px solid var(--p1,#2563eb);border-radius:14px;padding:12px 14px;box-shadow:0 12px 40px rgba(37,99,235,.22);font-family:var(--f,system-ui);display:none';
      document.body.appendChild(box);
    }
    var moto = c.moto_interes_modelo ? _swEsc(c.moto_interes_modelo) : 'pide asesoría';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">'
      + '<div><div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--p1,#2563eb)">'+(termino ? 'Terminó su solicitud web' : 'Nueva solicitud web')+'</div>'
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
             : c.web_cerrado ? ['Formulario cerrado','rgba(100,116,139,.14)','var(--ink3,#64748b)']
                    : ['Atendida','rgba(16,185,129,.12)','var(--green,#059669)'];
  var puedeVender = (typeof _puedeVender !== 'function') || _puedeVender();
  return '<div class="cf-section" style="border-left:3px solid var(--p1);margin-bottom:12px">'
    + '<div class="cf-section-h"><div class="cf-section-t">Solicitud web · '+_swEsc(c.id)+'</div>'
    + '<span class="bdg" style="background:'+estado[1]+';color:'+estado[2]+'">'+estado[0]+'</span></div>'
    + '<div class="cf-grid-3">'
    + f('Llegó', _swCuando(c.creado))
    + f('Formulario', _swAvance(c))
    + f('Moto de interés', c.moto_interes_modelo ? c.moto_interes_modelo+(c.moto_interes_sede?' · '+c.moto_interes_sede:'') : 'Pide asesoría')
    + f('Uso de la moto', _swTxt(SW_USO, c.uso_moto))
    + f('Tiene para la inicial', _swTxt(SW_INICIAL, c.inicial_rango))
    + f('Ingreso declarado', _swIngreso(c))
    + f('Cobra', _swTxt(SW_COBRO, c.dia_cobro))
    + f('Se dedica a', _swTxt(SW_TRABAJO, c.trabajo))
    + f('Zona', [c.ciudad, c.estado_ubi].filter(Boolean).join(' · '))
    + f('Atendida por', c.webAtendidaPor ? c.webAtendidaPor+' · '+_swCuando(c.webAtendidaEn) : '')
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'
    + (wa ? '<a class="btn btn-sm" style="background:#25D366;color:#fff;border-color:#25D366;text-decoration:none" href="'+wa+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">WhatsApp con mensaje listo</a>' : '')
    + (puedeVender && !conCred ? '<button type="button" class="btn btn-p btn-sm" onclick="_swCrearSolicitud(\''+idSeguro+'\')">Crear solicitud</button>' : '')
    + (pend ? '<button type="button" class="btn btn-g btn-sm" onclick="_swMarcarAtendida(\''+idSeguro+'\')">Marcar atendida</button>'
            : (!conCred && c.webAtendidaEn ? '<button type="button" class="btn btn-g btn-sm" onclick="_swMarcarAtendida(\''+idSeguro+'\', true)">Volver a pendiente</button>' : ''))
    + (!c.web_cerrado && !conCred ? '<button type="button" class="btn btn-g btn-sm" title="El cliente ya no podrá cambiar nada desde la web" onclick="_swCerrarFormulario(\''+idSeguro+'\')">Cerrar formulario</button>' : '')
    + '</div></div>';
}
// Se abre el asistente con este cliente ya elegido (el paso 1 busca por cliente)
function _swCrearSolicitud(id){
  if(typeof closeM === 'function') try{ closeM(); }catch(e){}
  if(typeof openAddCred !== 'function') return;
  openAddCred();
  setTimeout(function(){ if(typeof _wzCliPick === 'function') _wzCliPick(id); }, 120);
}
function _swQuien(){ return (S.currentUser && (S.currentUser.nombre || S.currentUser.email)) || 'Equipo'; }
function _swGuardar(c, cambios, ok){
  Object.keys(cambios).forEach(function(k){ c[k] = cambios[k]; });
  var p = (typeof DB !== 'undefined' && DB && typeof DB.saveCliente === 'function')
    ? DB.saveCliente(Object.assign({ id: c.id }, cambios))
    : Promise.resolve(false);
  return Promise.resolve(p).then(function(){
    if(typeof toast === 'function') toast(ok, 'success');
    _swSidebarBadge();
    if(typeof verCliente === 'function') verCliente(c.id);
    if(S.page === 'clientes' && typeof nav === 'function') nav('clientes');
  }).catch(function(e){ if(typeof toast === 'function') toast('No se pudo guardar: '+(e && e.message || e), 'error'); });
}
function _swMarcarAtendida(id, deshacer){
  var c = (S.clientes||[]).find(function(x){ return String(x.id) === String(id); });
  if(!c) return;
  return _swGuardar(c, deshacer ? { webAtendidaEn: '', webAtendidaPor: '' } : { webAtendidaEn: new Date().toISOString(), webAtendidaPor: _swQuien() },
    deshacer ? 'Solicitud de vuelta a pendientes' : 'Solicitud marcada como atendida');
}
// Cerrar el formulario: el asesor toma el caso y desde ese momento el cliente ya no
// puede cambiar nada desde la web (las Reglas miran web_cerrado). Crear el credito desde
// el lead hace lo mismo.
function _swCerrarFormulario(id){
  var c = (S.clientes||[]).find(function(x){ return String(x.id) === String(id); });
  if(!c || c.web_cerrado) return;
  if(typeof confirm === 'function' && !confirm('¿Cerrar el formulario de '+(c.nombre||'este cliente')+'? Desde ahora no podrá cambiar nada desde la web; lo que falte se lo preguntas por WhatsApp.')) return;
  return _swGuardar(c, { web_cerrado: true, web_cerrado_por: _swQuien(), web_cerrado_en: new Date().toISOString() }, 'Formulario cerrado');
}
