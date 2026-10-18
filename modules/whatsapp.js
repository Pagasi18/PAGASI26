// Pagasi module: whatsapp (Cobranza por WhatsApp, 18-oct-2026). Tres pestanas: Hoy (la cola de
// recordatorios calculada con la cartera), Conversaciones (lista + hilo + ficha del cliente) y
// Asistente (instrucciones y estado de la conexion con Meta). Ver logic/whatsapp.js.
window._waTab = window._waTab || 'hoy';
function waTab(t){ window._waTab = t; nav('whatsapp'); }
function waAbrir(id){ window._waSel = id; var c = _waConv(id); if(c && c.noLeidos && !waConectado()) c.noLeidos = 0; nav('whatsapp'); }

var _WA_CSS = '<style id="wa-css">'
  + '.wa-tabs{display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap}.wa-tabs button{border:1px solid var(--rim);background:var(--surf);border-radius:999px;padding:8px 14px;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink2);cursor:pointer}.wa-tabs button.on{background:var(--p1);border-color:var(--p1);color:#fff}'
  + '.wa-aviso{display:flex;gap:12px;align-items:center;background:#fff7e6;border:1px solid #f3d9a4;color:#7a4d00;border-radius:12px;padding:11px 14px;font-size:12.5px;margin-bottom:14px}.wa-aviso b{font-weight:800}'
  + '.wa-grupo{margin-bottom:14px}.wa-grupo .ch{align-items:center}.wa-fila{display:grid;grid-template-columns:1.3fr 1fr .7fr .9fr 1.6fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--rim);font-size:12.5px}.wa-fila:first-of-type{border-top:0}.wa-fila b{font-weight:800}.wa-fila small{display:block;color:var(--ink3);font-size:11px}.wa-fila .msg{color:var(--ink3);font-size:11px;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}'
  + '.wa-pill{display:inline-block;border-radius:999px;padding:2px 8px;font-size:10.5px;font-weight:800}.wa-pill.azul{background:#e8f0ff;color:#065cff}.wa-pill.ambar{background:#fff4e0;color:#b45309}.wa-pill.rojo{background:#fdecec;color:#c81e1e}.wa-pill.gris{background:var(--surf2);color:var(--ink3)}.wa-pill.verde{background:#e6f7f0;color:#0e9f6e}'
  + '.wa-split{display:grid;grid-template-columns:320px 1fr 300px;gap:14px;min-height:560px}@media(max-width:1200px){.wa-split{grid-template-columns:280px 1fr}.wa-ficha{grid-column:1/-1}}@media(max-width:800px){.wa-split{grid-template-columns:1fr}}'
  + '.wa-lista{background:var(--surf);border:1px solid var(--rim);border-radius:var(--r20);overflow:hidden;display:flex;flex-direction:column}.wa-lista .wa-busca{padding:10px;border-bottom:1px solid var(--rim)}.wa-lista .items{overflow:auto;max-height:70vh}'
  + '.wa-item{display:grid;grid-template-columns:38px 1fr auto;gap:10px;padding:11px 12px;border-bottom:1px solid var(--rim);cursor:pointer;align-items:center}.wa-item:hover{background:var(--surf2)}.wa-item.on{background:#e8f0ff}.wa-item .av{width:38px;height:38px;border-radius:50%;background:var(--surf2);color:var(--ink2);display:grid;place-items:center;font-weight:800;font-size:12px}.wa-item .n{font-weight:800;font-size:13px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.wa-item .u{font-size:11.5px;color:var(--ink3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}.wa-item .h{font-size:10.5px;color:var(--ink3);text-align:right}.wa-item .nl{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:999px;background:var(--p1);color:#fff;font-size:10px;font-weight:800;padding:0 5px;margin-top:4px}'
  + '.wa-hilo{background:var(--surf);border:1px solid var(--rim);border-radius:var(--r20);display:flex;flex-direction:column;min-height:560px}.wa-hilo-top{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--rim);flex-wrap:wrap}.wa-hilo-top .quien b{font-size:14px}.wa-hilo-top .quien small{display:block;color:var(--ink3);font-size:11.5px}.wa-hilo-top .acc{display:flex;gap:6px;flex-wrap:wrap}'
  + '.wa-burbujas{flex:1;overflow:auto;padding:16px;background:#f3f6fc;display:flex;flex-direction:column;gap:8px;max-height:60vh}.wa-b{max-width:78%;border-radius:14px;padding:9px 12px;font-size:13px;line-height:1.5;position:relative;box-shadow:0 1px 2px rgba(0,0,0,.05)}.wa-b.cliente{align-self:flex-start;background:#fff;border-bottom-left-radius:4px}.wa-b.asistente{align-self:flex-end;background:#dcf2ff;border-bottom-right-radius:4px}.wa-b.equipo{align-self:flex-end;background:#d9fbe6;border-bottom-right-radius:4px}.wa-b .meta{display:flex;gap:6px;justify-content:flex-end;font-size:10px;color:var(--ink3);margin-top:4px}.wa-b .meta .quien{font-weight:800}.wa-b img{max-width:220px;border-radius:10px;display:block;margin-bottom:6px}.wa-b .plantilla{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#065cff;margin-bottom:3px}'
  + '.wa-escribir{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--rim)}.wa-escribir textarea{flex:1;min-height:44px;max-height:120px;resize:vertical}.wa-cerrada{padding:10px 14px;font-size:12px;color:#b45309;background:#fff4e0;border-top:1px solid #f3d9a4}'
  + '.wa-ficha{display:flex;flex-direction:column;gap:12px}.wa-ficha .card{padding:16px}.wa-ficha .ct{margin-bottom:8px}.wa-kv{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-top:1px solid var(--rim)}.wa-kv:first-of-type{border-top:0}.wa-kv span:last-child{font-weight:800;text-align:right}'
  + '.wa-demo-cliente{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;border-top:1px dashed var(--rim);background:#fffdf5}.wa-demo-cliente button{font:inherit;font-size:11px;border:1px solid var(--rim);background:#fff;border-radius:999px;padding:4px 10px;cursor:pointer}.wa-demo-cliente small{width:100%;color:var(--ink3);font-size:10.5px}'
  + '.wa-stats .stat{text-align:left}.wa-stats .st-v{font-size:26px}'
  + '</style>';

function _waIni(n){ var p = String(n || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); }
function _waHora(iso){ if(!iso) return ''; var d = new Date(iso), hoy = new Date(); var hm = d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); return d.toDateString() === hoy.toDateString() ? hm : _waFechaCorta(iso) + ' ' + hm; }
function _waAtencion(a){ return a === 'pide_persona' ? '<span class="wa-pill rojo">Pide una persona</span>' : a === 'queja' ? '<span class="wa-pill rojo">Queja</span>' : a === 'comprobante' ? '<span class="wa-pill ambar">Comprobante por revisar</span>' : a === 'promesa_vencida' ? '<span class="wa-pill ambar">Promesa vencida</span>' : a === 'error' ? '<span class="wa-pill rojo">El asistente falló</span>' : ''; }
function _waEstadoIcono(e){ return e === 'leido' ? '✓✓' : e === 'entregado' ? '✓✓' : e === 'enviado' ? '✓' : e === 'pendiente' ? '…' : e === 'fallo' ? '✕ no se envió' : ''; }

function _waPintarLista(){
  var cont = document.getElementById('wa-items'); if(!cont) return;
  var q = String((document.getElementById('wa-q') || {}).value || '').toLowerCase();
  var convs = (window._waConvs || []).filter(function(c){ return !q || (String(c.nombre || '') + ' ' + String(c.telE164 || '') + ' ' + String(c.clienteNombre || '')).toLowerCase().indexOf(q) > -1; })
    .slice().sort(function(a, b){ return (b.atencion ? 1 : 0) - (a.atencion ? 1 : 0) || String(b.ultimoMensajeHora || '').localeCompare(String(a.ultimoMensajeHora || '')); });
  cont.innerHTML = convs.length ? convs.map(function(c){
    return '<div class="wa-item' + (c.id === window._waSel ? ' on' : '') + '" onclick="waAbrir(\'' + _waEsc(c.id) + '\')">'
      + '<div class="av">' + _waEsc(_waIni(c.nombre || c.clienteNombre)) + '</div>'
      + '<div><div class="n">' + _waEsc(c.nombre || c.clienteNombre || c.telE164) + (c.modo === 'humano' ? '<span class="wa-pill verde">' + _waEsc(c.atendidoPor || 'Equipo') + '</span>' : '') + (c.borrador && c.borrador.tipo === 'promesa' ? '<span class="wa-pill azul">Promesa ' + _waFechaCorta(c.borrador.fecha) + '</span>' : '') + '</div>'
      + '<div class="u">' + _waEsc(c.ultimoMensaje || '') + '</div>' + (c.atencion ? '<div style="margin-top:4px">' + _waAtencion(c.atencion) + '</div>' : '') + '</div>'
      + '<div class="h">' + _waHora(c.ultimoMensajeHora) + (c.noLeidos ? '<br><span class="nl">' + c.noLeidos + '</span>' : '') + '</div></div>';
  }).join('') : '<div class="empty" style="padding:30px 16px">' + (waConectado() ? 'Todavía no hay conversaciones.' : 'Sin conversaciones de muestra.') + '</div>';
}
function _waPintarHilo(id){
  var cont = document.getElementById('wa-burbujas'); if(!cont || window._waSel !== id) return;
  var msgs = window._waMsgs[id] || [];
  cont.innerHTML = msgs.length ? msgs.map(function(m){
    var quien = m.autor === 'cliente' ? '' : (m.autor === 'equipo' ? (m.por || 'Equipo') : 'Asistente');
    return '<div class="wa-b ' + _waEsc(m.autor) + '">' + (m.tipo === 'plantilla' ? '<div class="plantilla">Recordatorio automático</div>' : '')
      + (m.medio && m.medio.url ? '<img src="' + _waEsc(m.medio.url) + '" alt="">' : '')
      + _waEsc(m.texto || (m.tipo === 'imagen' ? '(imagen)' : m.tipo === 'audio' ? '(audio)' : '')).replace(/\n/g, '<br>')
      + '<div class="meta">' + (quien ? '<span class="quien">' + _waEsc(quien) + '</span>' : '') + '<span>' + _waHora(m.hora) + '</span>' + (m.autor !== 'cliente' ? '<span title="' + _waEsc(m.estado || '') + '">' + _waEstadoIcono(m.estado) + '</span>' : '') + (m.error ? '<span style="color:var(--red)">' + _waEsc(m.error) + '</span>' : '') + '</div></div>';
  }).join('') : '<div class="empty">Sin mensajes.</div>';
  cont.scrollTop = cont.scrollHeight;
  _waPintarLista();
}
function _waEnviarDesdeCaja(id){ var ta = document.getElementById('wa-texto'); if(!ta) return; var t = ta.value; ta.value = ''; waEnviarEquipo(id, t); }
function _waPasarAPedido(id){
  var c = _waConv(id); if(!c || !c.borrador) return;
  if(c.borrador.tipo === 'promesa'){
    var cr = (S.creds || []).find(function(x){ return x.id === c.cred; });
    if(cr && typeof DB !== 'undefined' && DB.updateCred){ DB.updateCred(cr.id, { fechaCompromiso: c.borrador.fecha }); cr.fechaCompromiso = c.borrador.fecha; toast('Compromiso de pago anotado en el crédito ' + cr.id + ' para el ' + _waFechaCorta(c.borrador.fecha), 'success'); }
    else toast('Promesa: ' + _waFechaCorta(c.borrador.fecha) + ' · ' + _waMoney(c.borrador.monto) + (waConectado() ? '' : ' (en la demostración no se escribe nada)'), 'info');
    if(typeof logActividad === 'function') logActividad('wa_promesa_anotada', 'whatsapp', id, { fecha: c.borrador.fecha });
  }
}

PG.whatsapp = function(){
  if(!document.getElementById('wa-css')) document.head.insertAdjacentHTML('beforeend', _WA_CSS);
  if(!window._waCfg){ waCargarCfg(function(){ if(S.page === 'whatsapp') nav('whatsapp'); }); }
  var cola = waColaHoy();
  var conectado = waConectado();
  if(!conectado) waDemoConversaciones(cola); else waAbrirConversaciones();
  var tab = window._waTab || 'hoy';
  var convs = window._waConvs || [];
  var conAtencion = convs.filter(function(c){ return c.atencion; }).length;
  var promesas = convs.filter(function(c){ return c.borrador && c.borrador.tipo === 'promesa'; }).length;

  var h = '<div class="page">'
    + '<div class="ch" style="margin-bottom:12px"><div><div class="ct" style="font-size:20px">Cobranza por WhatsApp</div><div class="cs">El asistente recuerda las cuotas, responde al cliente y le pasa al equipo lo que necesita una persona.</div></div>'
    + '<div>' + (conectado ? '<span class="wa-pill verde">Conectado a Meta · ' + _waEsc((window._waCfg || {}).telefono || '') + '</span>' : '<span class="wa-pill ambar">Modo demostración</span>') + '</div></div>'
    + (conectado ? '' : '<div class="wa-aviso"><span style="font-size:18px">⚠️</span><div><b>Meta todavía no está conectado.</b> La cola de hoy es real (sale de tu cartera y del ledger) pero no se manda nada; las conversaciones son de muestra, en memoria, para ver cómo trabaja el asistente. Cuando se conecte el número, esta misma pantalla pasa a ser la de verdad.</div></div>')
    + '<div class="wa-tabs"><button class="' + (tab === 'hoy' ? 'on' : '') + '" onclick="waTab(\'hoy\')">Hoy · ' + cola.total + '</button><button class="' + (tab === 'conv' ? 'on' : '') + '" onclick="waTab(\'conv\')">Conversaciones' + (conAtencion ? ' · ' + conAtencion + ' esperan' : '') + '</button><button class="' + (tab === 'asistente' ? 'on' : '') + '" onclick="waTab(\'asistente\')">Asistente</button></div>';

  if(tab === 'hoy'){
    h += '<div class="sg wa-stats">'
      + '<div class="stat"><div class="st-v">' + (cola.grupos.proximas.length + cola.grupos.hoy.length) + '</div><div class="st-l">Recordatorios antes de vencer (2 días y hoy)</div></div>'
      + '<div class="stat"><div class="st-v" style="color:var(--amber)">' + (cola.grupos.gracia.length + cola.grupos.atrasadas.length) + '</div><div class="st-l">Vencidas que el asistente persigue (1 a 10 días)</div></div>'
      + '<div class="stat"><div class="st-v" style="color:var(--red)">' + cola.grupos.cobrador.length + '</div><div class="st-l">Para un cobrador (más de 10 días)</div></div>'
      + '<div class="stat"><div class="st-v">' + promesas + '</div><div class="st-l">Promesas de pago anotadas</div></div>'
      + '</div>'
      + (cola.sinTel ? '<div class="wa-aviso" style="background:var(--surf2);border-color:var(--rim);color:var(--ink2)">📵 <div><b>' + cola.sinTel + '</b> de estos clientes no tienen un celular válido en su ficha: a esos no les llega nada. Corrígelos en Clientes.</div></div>' : '');
    WA_GRUPOS.forEach(function(g){
      var items = cola.grupos[g.id];
      h += '<div class="card wa-grupo"><div class="ch"><div><div class="ct"><span class="wa-pill ' + g.tono + '">' + items.length + '</span> &nbsp;' + g.titulo + '</div><div class="cs">' + g.sub + '</div></div>'
        + (g.id !== 'cobrador' ? '<button class="btn btn-p btn-sm" ' + (conectado ? 'onclick="toast(\'Los recordatorios los manda el asistente solo, a las 8:30 am\',\'info\')"' : 'disabled title="Se activa cuando Meta esté conectado"') + '>Enviar ' + items.length + '</button>' : '<button class="btn btn-g btn-sm" onclick="nav(\'pagos\')">Ver en Cobranza</button>') + '</div>';
      if(!items.length) h += '<div class="empty" style="padding:10px 0">Nadie en este grupo hoy.</div>';
      else h += items.slice(0, 40).map(function(it){
        return '<div class="wa-fila"><div><b>' + _waEsc(it.nombre) + '</b><small>' + _waEsc(it.cred) + ' · ' + _waEsc(it.modelo) + '</small></div>'
          + '<div>' + (it.tel ? _waEsc(it.tel.replace('+58', '0')) : '<span class="wa-pill rojo">Sin celular</span>') + '<small>' + (it.pagadas) + ' de ' + it.totalCuotas + ' pagadas</small></div>'
          + '<div><b>' + _waMoney(it.monto) + '</b><small>cuota ' + it.cuota + '</small></div>'
          + '<div>' + _waFechaCorta(it.fechaVence) + '<small>' + (it.dias < 0 ? 'en ' + (-it.dias) + ' día' + (it.dias === -1 ? '' : 's') : it.dias === 0 ? 'hoy' : 'hace ' + it.dias + ' día' + (it.dias === 1 ? '' : 's')) + (it.vencidas > 1 ? ' · ' + it.vencidas + ' vencidas' : '') + '</small></div>'
          + '<div class="msg" title="' + _waEsc(waPlantilla(g.id, it)) + '">' + _waEsc(waPlantilla(g.id, it)) + '</div>'
          + '<div><button class="btn btn-g btn-xs" onclick="nav(\'clientes\');setTimeout(function(){ if(typeof verCliente===\'function\') verCliente(\'' + _waEsc(it.clienteId) + '\'); },150)">Ver</button></div></div>';
      }).join('') + (items.length > 40 ? '<div class="cs" style="padding-top:8px">… y ' + (items.length - 40) + ' más</div>' : '');
      h += '</div>';
    });
  }

  if(tab === 'conv'){
    var sel = _waConv(window._waSel) || convs[0] || null;
    if(sel && window._waSel !== sel.id){ window._waSel = sel.id; }
    var cred = sel ? (S.creds || []).find(function(x){ return x.id === sel.cred || (sel.clienteId && String(x.clienteId) === String(sel.clienteId) && x.estado !== 'cancelado'); }) : null;
    var est = null; if(cred){ try{ est = CreditoLedger.generarEstadoCredito(cred, S.pagos || [], { diasGracia: WA_GRACIA, today: hoyLocalISO() }); }catch(e){} }
    var prox = est ? (est.cuotas || []).filter(function(x){ return x && x.saldo > 0.001; })[0] : null;
    var abierta = sel ? waVentanaAbierta(sel) : false;
    h += '<div class="wa-split">'
      + '<div class="wa-lista"><div class="wa-busca"><input class="fi" id="wa-q" placeholder="Buscar por nombre o teléfono" oninput="_waPintarLista()" style="width:100%"></div><div class="items" id="wa-items"></div></div>'
      + '<div class="wa-hilo">' + (sel
        ? '<div class="wa-hilo-top"><div class="quien"><b>' + _waEsc(sel.nombre || sel.telE164) + '</b><small>' + _waEsc(String(sel.telE164 || '').replace('+58', '0')) + (sel.clienteNombre ? ' · cliente del sistema' : ' · no está en el sistema') + ' · ' + (sel.modo === 'humano' ? 'lo atiende ' + _waEsc(sel.atendidoPor || 'el equipo') : 'lo atiende el asistente') + '</small></div>'
          + '<div class="acc">' + (sel.atencion ? '<button class="btn btn-g btn-sm" onclick="waVisto(\'' + _waEsc(sel.id) + '\')">Visto</button>' : '') + (sel.modo === 'humano' ? '<button class="btn btn-g btn-sm" onclick="waDevolver(\'' + _waEsc(sel.id) + '\')">Devolver al asistente</button>' : '<button class="btn btn-p btn-sm" onclick="waAtender(\'' + _waEsc(sel.id) + '\')">Atender yo</button>') + '</div></div>'
          + '<div class="wa-burbujas" id="wa-burbujas"></div>'
          + (abierta ? '<div class="wa-escribir"><textarea class="fta" id="wa-texto" placeholder="Escribir como ' + _waEsc((S.currentUser && S.currentUser.nombre) || 'equipo') + '… (al escribir, tomas la conversación)"></textarea><button class="btn btn-p" onclick="_waEnviarDesdeCaja(\'' + _waEsc(sel.id) + '\')">Enviar</button></div>'
            : '<div class="wa-cerrada">La ventana de 24 horas de WhatsApp está cerrada: el cliente escribió por última vez ' + (sel.ultimoEntranteHora ? 'el ' + _waHora(sel.ultimoEntranteHora) : 'hace más de un día') + '. Solo se le puede escribir con una plantilla aprobada, o esperar a que vuelva a escribir.</div>')
          + (conectado ? '' : '<div class="wa-demo-cliente"><small>Demostración · el cliente escribe:</small>' + ['cuánto debo?', 'ya pagué', 'pago el sábado', 'cómo pago?', 'quiero hablar con una persona', 'no puedo pagar'].map(function(t){ return '<button onclick="waDemoClienteEscribe(\'' + _waEsc(sel.id) + '\',\'' + _waEsc(t) + '\')">' + _waEsc(t) + '</button>'; }).join('') + '</div>')
        : '<div class="empty" style="padding:60px 20px">Elige una conversación.</div>') + '</div>'
      + '<div class="wa-ficha">'
      + (sel ? '<div class="card"><div class="ct">Cliente</div>'
          + '<div class="wa-kv"><span>Nombre</span><span>' + _waEsc(sel.clienteNombre || sel.nombre || '—') + '</span></div>'
          + '<div class="wa-kv"><span>Crédito</span><span>' + (cred ? _waEsc(cred.id) + ' · ' + _waEsc(cred.modelo || '') : '—') + '</span></div>'
          + (est ? '<div class="wa-kv"><span>Cuotas</span><span>' + est.cuotasPagadas + ' de ' + est.totalCuotas + '</span></div><div class="wa-kv"><span>Próxima</span><span>' + (prox ? _waMoney(prox.saldo) + ' · ' + _waFechaCorta(prox.fechaVence) : '—') + '</span></div><div class="wa-kv"><span>Estado</span><span>' + (prox && prox.fechaVence < hoyLocalISO() ? '<span class="wa-pill rojo">Atraso ' + _waDias(prox.fechaVence, hoyLocalISO()) + ' d</span>' : '<span class="wa-pill verde">Al día</span>') + '</span></div>' : '')
          + (sel.clienteId && cred ? '<button class="btn btn-g btn-sm" style="margin-top:10px" onclick="nav(\'pagos\')">Ver en Cobranza</button>' : '') + '</div>'
        + '<div class="card"><div class="ct">Lo que anotó el asistente</div>'
          + (sel.borrador && sel.borrador.tipo === 'promesa' ? '<div class="wa-kv"><span>Promesa de pago</span><span>' + _waFechaCorta(sel.borrador.fecha) + ' · ' + _waMoney(sel.borrador.monto) + '</span></div><button class="btn btn-p btn-sm" style="margin-top:10px" onclick="_waPasarAPedido(\'' + _waEsc(sel.id) + '\')">Anotar el compromiso en el crédito</button>' : '<div class="cs">Sin promesas ni solicitudes pendientes.</div>')
          + (sel.resumen ? '<div class="cs" style="margin-top:10px;line-height:1.5"><b>Resumen:</b> ' + _waEsc(sel.resumen) + '</div>' : '') + '</div>'
        + '<div class="card"><div class="ct">Alertas</div>' + (sel.atencion ? _waAtencion(sel.atencion) + '<div class="cs" style="margin-top:8px">Cuando lo resuelvas, toca "Visto".</div>' : '<div class="cs">Nada pendiente.</div>') + '</div>'
        : '') + '</div></div>';
    setTimeout(function(){ _waPintarLista(); if(sel){ if(conectado) waAbrirMensajes(sel.id); else _waPintarHilo(sel.id); } }, 0);
  }

  if(tab === 'asistente'){
    var cfg = window._waCfg || {};
    var puede = typeof isAdminUser === 'function' && isAdminUser();
    h += '<div class="sg" style="grid-template-columns:1.4fr 1fr;align-items:start">'
      + '<div class="card"><div class="ch"><div><div class="ct">Instrucciones del asistente</div><div class="cs">Texto libre. El asistente lo lee antes de cada respuesta y manda sobre todo lo demás. Ejemplos: "esta semana no se reciben pagos en efectivo", "si preguntan por refinanciar, pásalos a Samantha".</div></div></div>'
      + '<textarea class="fta" id="wa-instr" style="width:100%;min-height:200px" ' + (puede ? '' : 'disabled') + '>' + _waEsc(cfg.instrucciones || '') + '</textarea>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap"><div class="cs">' + (cfg.actualizadoEn ? 'Última edición: ' + _waEsc(cfg.actualizadoPor || '') + ' · ' + _waHora(cfg.actualizadoEn) : 'Nadie las ha editado todavía') + (puede ? '' : ' · solo administración las edita') + '</div>' + (puede ? '<button class="btn btn-p btn-sm" onclick="waGuardarInstrucciones(document.getElementById(\'wa-instr\').value)">Guardar</button>' : '') + '</div></div>'
      + '<div style="display:grid;gap:12px">'
      + '<div class="card"><div class="ct">Reglas fijas (no se cambian desde aquí)</div><ul style="margin:8px 0 0 18px;padding:0;font-size:12.5px;line-height:1.7;color:var(--ink2)">'
      + '<li>Solo habla del crédito del cliente: cuánto debe, cuándo vence, cómo pagar y su comprobante.</li><li>Nunca aprueba, descuenta, refinancia ni promete nada: eso lo consulta con el equipo.</li><li>No inventa montos: todo sale del ledger del sistema.</li><li>No pide cédula ni documentos por el chat.</li><li>Si el cliente se queja, pide una persona o manda una imagen, se calla y avisa.</li><li>Tono: cercano, breve, en el español de Venezuela; recuerda, nunca amenaza.</li></ul></div>'
      + '<div class="card"><div class="ct">Conexión con Meta</div>' + (conectado ? '<div class="cs">Número ' + _waEsc(cfg.telefono || '') + ' conectado por la API oficial de WhatsApp.</div>' : '<div class="cs" style="line-height:1.6">Pendiente: verificación del negocio en Meta, número de WhatsApp dedicado a cobranza, plantillas aprobadas y las claves en el servidor. Mientras tanto el módulo funciona en demostración.</div>') + '</div>'
      + '<div class="card"><div class="ct">Horario de los recordatorios</div><div class="cs" style="line-height:1.6">Todos los días a las 8:30 am: 2 días antes de vencer, el día del vencimiento, al tercer día de vencida y al sexto; de 10 días en adelante no insiste y lo pasa a un cobrador.</div></div>'
      + '</div></div>';
  }
  h += '</div>';
  return h;
};
