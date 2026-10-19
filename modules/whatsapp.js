// Pagasi module: whatsapp (18-oct-2026). Dos areas: COBRANZA (Hoy = la cola de recordatorios
// calculada con la cartera, Conversaciones y Asistente) y VENTAS (quien escribe al WhatsApp
// preguntando por una moto: Conversaciones y Asistente de ventas). El motor de la pantalla
// (lista + hilo + ficha, pestana Asistente) es compartido con modules/instagram.js, que es
// otro modulo con el mismo asistente de ventas por mensajes directos. Ver logic/whatsapp.js.
window._waArea = window._waArea || 'cobranza';
window._waTabs = window._waTabs || {};
function _waCtxActual(){ return S.page === 'instagram' ? { modulo: 'instagram', canal: 'instagram', area: 'ventas' } : { modulo: 'whatsapp', canal: 'whatsapp', area: window._waArea || 'cobranza' }; }
function _waClave(ctx){ ctx = ctx || _waCtxActual(); return ctx.modulo + ':' + ctx.area; }
function _waTabActual(ctx){ ctx = ctx || _waCtxActual(); return window._waTabs[_waClave(ctx)] || (ctx.modulo === 'whatsapp' && ctx.area === 'cobranza' ? 'hoy' : 'conv'); }
function waTab(t){ window._waTabs[_waClave()] = t; nav(S.page === 'instagram' ? 'instagram' : 'whatsapp'); }
function waArea(a){ window._waArea = a === 'ventas' ? 'ventas' : 'cobranza'; window._waSel = null; nav('whatsapp'); }
// Abrir una conversacion: si ya estamos en esa pantalla se cambia solo el hilo y la ficha (sin
// recargar la pagina, que saltaba el formato y el scroll con cada clic, 19-oct-2026); si no, nav.
function waAbrir(id){
  var c = _waConv(id), mod = _waModuloDe(id), antes = _waCtxActual();
  window._waSel = id;
  if(c && c.canal !== 'instagram'){ window._waArea = c.area === 'ventas' ? 'ventas' : 'cobranza'; }
  window._waTabs[_waClave(c && c.canal === 'instagram' ? { modulo: 'instagram', area: 'ventas' } : { modulo: 'whatsapp', area: window._waArea })] = 'conv';
  var enSitio = S.page === mod && document.getElementById('wa-hilo') && antes.modulo === mod && antes.area === _waCtxActual().area;
  if(enSitio) _waPintarSeleccion(); else nav(mod);
}
// Filtros de la lista (por pantalla): la clave es modulo:area
window._waFiltros = window._waFiltros || {};
function _waFiltroActual(ctx){ return window._waFiltros[_waClave(ctx || _waCtxActual())] || 'todas'; }
function waFiltro(f){ window._waFiltros[_waClave()] = f; _waPintarLista(); }
// "Sin responder": el ultimo mensaje lo mando el cliente. El servidor anota ultimoAutor; para las
// conversaciones de antes, si la hora del ultimo mensaje es la del ultimo entrante, fue el cliente.
function _waSinResponder(c){ if(!c || !c.ultimoEntranteHora) return false; return c.ultimoAutor ? c.ultimoAutor === 'cliente' : String(c.ultimoMensajeHora || '') === String(c.ultimoEntranteHora || ''); }
function _waEsHoy(iso){ return !!iso && new Date(iso).toDateString() === new Date().toDateString(); }
var WA_FILTROS = [
  { id: 'todas', nombre: 'Todas', f: function(){ return true; } },
  { id: 'sin', nombre: 'Sin responder', f: _waSinResponder },
  { id: 'noleidas', nombre: 'No leídas', f: function(c){ return (c.noLeidos || 0) > 0; } },
  { id: 'esperan', nombre: 'Esperan persona', f: function(c){ return !!c.atencion; } },
  { id: 'humano', nombre: 'Atiende una persona', f: function(c){ return c.modo === 'humano'; } },
  { id: 'leads', nombre: 'Quieren comprar', f: function(c){ return !!(c.borrador && c.borrador.tipo === 'lead'); }, solo: 'ventas' },
  { id: 'promesas', nombre: 'Con promesa', f: function(c){ return !!(c.borrador && c.borrador.tipo === 'promesa'); }, solo: 'cobranza' },
  { id: 'hoy', nombre: 'Hoy', f: function(c){ return _waEsHoy(c.ultimoMensajeHora); } }
];
function _waFiltrosDe(ctx){ return WA_FILTROS.filter(function(f){ return !f.solo || f.solo === ctx.area; }); }
// Las conversaciones que le tocan a este contexto (canal y, en WhatsApp, el area)
function _waConvsDe(ctx){ return (window._waConvs || []).filter(function(c){ return (c.canal || 'whatsapp') === ctx.canal && (ctx.canal === 'instagram' || (c.area || 'cobranza') === ctx.area); }); }

var _WA_CSS = '<style id="wa-css">'
  + '.wa-cab{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:12px}.wa-cab-izq .cs{max-width:620px}.wa-cab-der{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.wa-cab .wa-tabs,.wa-cab .wa-areas{margin:0}.wa-minis{display:flex;gap:6px;flex-wrap:wrap}.wa-minis span{border:1px solid var(--rim);background:var(--surf);border-radius:999px;padding:5px 11px;font-size:11.5px;color:var(--ink3);white-space:nowrap}.wa-minis b{color:var(--ink);font-size:13px;margin-right:3px}.wa-minis .ambar b{color:#b45309}.wa-minis .verde b{color:#0f7a3e}.wa-tabs{display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap}.wa-tabs button{border:1px solid var(--rim);background:var(--surf);border-radius:999px;padding:8px 14px;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink2);cursor:pointer}.wa-tabs button.on{background:var(--p1);border-color:var(--p1);color:#fff}'
  + '.wa-aviso{display:flex;gap:12px;align-items:center;background:#fff7e6;border:1px solid #f3d9a4;color:#7a4d00;border-radius:12px;padding:11px 14px;font-size:12.5px;margin-bottom:14px}.wa-aviso b{font-weight:800}'
  + '.wa-grupo{margin-bottom:14px}.wa-grupo .ch{align-items:center}.wa-fila{display:grid;grid-template-columns:1.3fr 1fr .7fr .9fr 1.6fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--rim);font-size:12.5px}.wa-fila:first-of-type{border-top:0}.wa-fila b{font-weight:800}.wa-fila small{display:block;color:var(--ink3);font-size:11px}.wa-fila .msg{color:var(--ink3);font-size:11px;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}'
  + '.wa-pill{display:inline-block;border-radius:999px;padding:2px 8px;font-size:10.5px;font-weight:800}.wa-pill.azul{background:#e8f0ff;color:#065cff}.wa-pill.ambar{background:#fff4e0;color:#b45309}.wa-pill.rojo{background:#fdecec;color:#c81e1e}.wa-pill.gris{background:var(--surf2);color:var(--ink3)}.wa-pill.verde{background:#e6f7f0;color:#0e9f6e}'
  + '.wa-split{display:grid;grid-template-columns:320px 1fr 300px;gap:14px;min-height:560px}@media(min-width:1201px){.wa-split{min-height:460px}.wa-split>*{min-height:0}.wa-ficha{overflow:auto}}@media(max-width:1200px){.wa-split{grid-template-columns:280px 1fr}.wa-ficha{grid-column:1/-1}.wa-lista .items{max-height:60vh}.wa-burbujas{max-height:60vh}}@media(max-width:800px){.wa-split{grid-template-columns:1fr}}.wa-filtros{display:flex;gap:5px;flex-wrap:wrap;padding:8px 10px;border-bottom:1px solid var(--rim)}.wa-filtros button{border:1px solid var(--rim);background:var(--surf);border-radius:999px;padding:4px 9px;font:inherit;font-size:11px;font-weight:700;color:var(--ink2);cursor:pointer;white-space:nowrap}.wa-filtros button.on{background:var(--ink);border-color:var(--ink);color:#fff}.wa-filtros button i{font-style:normal;opacity:.65;margin-left:4px}.wa-filtros button:disabled{opacity:.45;cursor:default}.wa-item .sr{width:8px;height:8px;border-radius:50%;background:var(--amber);display:inline-block;flex:none}.wa-item .n .wa-pill{font-size:9.5px;padding:1px 6px}'
  + '.wa-lista{background:var(--surf);border:1px solid var(--rim);border-radius:var(--r20);overflow:hidden;display:flex;flex-direction:column}.wa-lista .wa-busca{padding:10px;border-bottom:1px solid var(--rim)}.wa-lista .items{overflow:auto;flex:1;min-height:0}'
  + '.wa-item{display:grid;grid-template-columns:38px 1fr auto;gap:10px;padding:11px 12px;border-bottom:1px solid var(--rim);cursor:pointer;align-items:center}.wa-item:hover{background:var(--surf2)}.wa-item.on{background:#e8f0ff}.wa-item .av{width:38px;height:38px;border-radius:50%;background:var(--surf2);color:var(--ink2);display:grid;place-items:center;font-weight:800;font-size:12px}.wa-item .n{font-weight:800;font-size:13px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.wa-item .u{font-size:11.5px;color:var(--ink3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}.wa-item .h{font-size:10.5px;color:var(--ink3);text-align:right}.wa-item .nl{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:999px;background:var(--p1);color:#fff;font-size:10px;font-weight:800;padding:0 5px;margin-top:4px}'
  + '.wa-hilo{background:var(--surf);border:1px solid var(--rim);border-radius:var(--r20);display:flex;flex-direction:column;min-height:0}.wa-hilo-top{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--rim);flex-wrap:wrap}.wa-hilo-top .quien b{font-size:14px}.wa-hilo-top .quien small{display:block;color:var(--ink3);font-size:11.5px}.wa-hilo-top .acc{display:flex;gap:6px;flex-wrap:wrap}'
  + '.wa-burbujas{flex:1;overflow:auto;padding:16px;background:#f3f6fc;display:flex;flex-direction:column;gap:8px;min-height:160px}.wa-b{max-width:78%;border-radius:14px;padding:9px 12px;font-size:13px;line-height:1.5;position:relative;box-shadow:0 1px 2px rgba(0,0,0,.05)}.wa-b.cliente{align-self:flex-start;background:#fff;border-bottom-left-radius:4px}.wa-b.asistente{align-self:flex-end;background:#dcf2ff;border-bottom-right-radius:4px}.wa-b.equipo{align-self:flex-end;background:#d9fbe6;border-bottom-right-radius:4px}.wa-b .meta{display:flex;gap:6px;justify-content:flex-end;font-size:10px;color:var(--ink3);margin-top:4px}.wa-b .meta .quien{font-weight:800}.wa-b img{max-width:220px;border-radius:10px;display:block;margin-bottom:6px}.wa-b .plantilla{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#065cff;margin-bottom:3px}'
  + '.wa-escribir{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--rim)}.wa-escribir textarea{flex:1;min-height:44px;max-height:120px;resize:vertical}.wa-cerrada{padding:10px 14px;font-size:12px;color:#b45309;background:#fff4e0;border-top:1px solid #f3d9a4}'
  + '.wa-ficha{display:flex;flex-direction:column;gap:12px}.wa-ficha .card{padding:16px}.wa-ficha .ct{margin-bottom:8px}.wa-kv{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-top:1px solid var(--rim)}.wa-kv:first-of-type{border-top:0}.wa-kv span:last-child{font-weight:800;text-align:right}'
  + '.wa-demo-cliente{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;border-top:1px dashed var(--rim);background:#fffdf5}.wa-demo-cliente button{font:inherit;font-size:11px;border:1px solid var(--rim);background:#fff;border-radius:999px;padding:4px 10px;cursor:pointer}.wa-demo-cliente small{width:100%;color:var(--ink3);font-size:10.5px}'
  + '.wa-stats .stat{text-align:left}.wa-stats .st-v{font-size:26px}'
  + '.wa-pill.ig{background:linear-gradient(90deg,#f58529,#dd2a7b,#8134af);color:#fff}.wa-pill.verde{background:#e6f7ee;color:#0f7a3e}.wa-item .av.ig{background:linear-gradient(135deg,#f58529,#dd2a7b,#8134af);color:#fff}'
  + '.wa-areas{display:flex;gap:0;margin:0 0 14px;border:1px solid var(--rim);border-radius:14px;overflow:hidden;width:max-content;max-width:100%}.wa-areas button{border:0;background:var(--surf);font:inherit;font-size:13px;font-weight:800;color:var(--ink2);padding:10px 18px;cursor:pointer;display:flex;gap:8px;align-items:center}.wa-areas button+button{border-left:1px solid var(--rim)}.wa-areas button.on{background:var(--p1);color:#fff}.wa-areas button .wa-pill{background:rgba(255,255,255,.25);color:inherit}.wa-areas button:not(.on) .wa-pill{background:var(--surf2);color:var(--ink2)}'
  + '</style>';

function _waIni(n){ var p = String(n || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); }
function _waHora(iso){ if(!iso) return ''; var d = new Date(iso), hoy = new Date(); var hm = d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); return d.toDateString() === hoy.toDateString() ? hm : _waFechaCorta(iso) + ' ' + hm; }
function _waAtencion(a){ return a === 'lead' ? '<span class="wa-pill verde">Quiere comprar</span>' : a === 'pide_persona' ? '<span class="wa-pill rojo">Pide una persona</span>' : a === 'queja' ? '<span class="wa-pill rojo">Queja</span>' : a === 'comprobante' ? '<span class="wa-pill ambar">Comprobante por revisar</span>' : a === 'promesa_vencida' ? '<span class="wa-pill ambar">Promesa vencida</span>' : a === 'error' ? '<span class="wa-pill rojo">El asistente falló</span>' : ''; }
function _waEstadoIcono(e){ return e === 'leido' ? '✓✓' : e === 'entregado' ? '✓✓' : e === 'enviado' ? '✓' : e === 'pendiente' ? '…' : e === 'fallo' ? '✕ no se envió' : ''; }

function _waPintarLista(){
  var cont = document.getElementById('wa-items'); if(!cont) return;
  var ctx = _waCtxActual(), q = String((document.getElementById('wa-q') || {}).value || '').toLowerCase();
  var todas = _waConvsDe(ctx), filtros = _waFiltrosDe(ctx), fid = _waFiltroActual(ctx);
  var filtro = filtros.find(function(f){ return f.id === fid; }) || filtros[0];
  var chips = document.getElementById('wa-filtros');
  if(chips) chips.innerHTML = filtros.map(function(f){ var n = f.id === 'todas' ? todas.length : todas.filter(f.f).length; return '<button class="' + (f.id === filtro.id ? 'on' : '') + '" onclick="waFiltro(\'' + f.id + '\')"' + (!n && f.id !== 'todas' && f.id !== filtro.id ? ' disabled' : '') + '>' + f.nombre + '<i>' + n + '</i></button>'; }).join('');
  var convs = todas
    .filter(filtro.f)
    .filter(function(c){ return !q || (String(c.nombre || '') + ' ' + String(c.telE164 || '') + ' ' + String(c.clienteNombre || '') + ' ' + String(c.usuario || '')).toLowerCase().indexOf(q) > -1; })
    .slice().sort(function(a, b){ return (b.atencion ? 1 : 0) - (a.atencion ? 1 : 0) || String(b.ultimoMensajeHora || '').localeCompare(String(a.ultimoMensajeHora || '')); });
  cont.innerHTML = convs.length ? convs.map(function(c){
    return '<div class="wa-item' + (c.id === window._waSel ? ' on' : '') + '" onclick="waAbrir(\'' + _waEsc(c.id) + '\')">'
      + '<div class="av' + (c.canal === 'instagram' ? ' ig' : '') + '">' + _waEsc(_waIni(c.nombre || c.clienteNombre)) + '</div>'
      + '<div><div class="n">' + (_waSinResponder(c) ? '<span class="sr" title="Sin responder"></span>' : '') + _waEsc(c.nombre || c.clienteNombre || c.telE164) + (c.canal === 'instagram' ? '<span class="wa-pill ig">IG</span>' : (c.area === 'ventas' ? '<span class="wa-pill azul">ventas</span>' : '')) + (c.modo === 'humano' ? '<span class="wa-pill gris" title="' + _waEsc(c.atendidoPor || '') + '">persona</span>' : '') + '</div>'
      + '<div class="u">' + _waEsc(c.ultimoMensaje || '') + '</div>' + (c.atencion ? '<div style="margin-top:4px">' + _waAtencion(c.atencion) + '</div>' : '') + '</div>'
      + '<div class="h">' + _waHora(c.ultimoMensajeHora) + (c.noLeidos ? '<br><span class="nl">' + c.noLeidos + '</span>' : '') + '</div></div>';
  }).join('') : '<div class="empty" style="padding:30px 16px">' + (todas.length ? 'Ninguna conversación con ese filtro.' : (waConectadoCanal(ctx.canal) ? 'Todavía no hay conversaciones.' : 'Sin conversaciones de muestra.')) + '</div>';
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

function _waPanelConversaciones(ctx){
  // Solo el esqueleto: la lista, el hilo y la ficha se llenan en el sitio (_waPintarSeleccion) y se
  // refrescan solos cuando llegan mensajes, sin volver a armar la pagina.
  var h = '<div class="wa-split">'
    + '<div class="wa-lista"><div class="wa-busca"><input class="fi" id="wa-q" placeholder="' + (ctx.canal === 'instagram' ? 'Buscar por nombre o usuario' : 'Buscar por nombre o teléfono') + '" oninput="_waPintarLista()" style="width:100%"></div><div class="wa-filtros" id="wa-filtros"></div><div class="items" id="wa-items"></div></div>'
    + '<div class="wa-hilo" id="wa-hilo"></div>'
    + '<div class="wa-ficha" id="wa-ficha"></div></div>';
  window._waFirma = ''; window._waMsgSel = null;
  setTimeout(_waPintarSeleccion, 0);
  return h;
}
// La conversacion elegida (o la primera) y lo que depende de ella: hilo + ficha + lista
function _waSeleccionada(ctx){
  var convs = _waConvsDe(ctx), sel = _waConv(window._waSel);
  if(sel && convs.indexOf(sel) < 0) sel = null; sel = sel || convs[0] || null;
  if(sel && window._waSel !== sel.id) window._waSel = sel.id;
  return sel;
}
function _waFirmaDe(sel){ return sel ? JSON.stringify([sel.id, sel.nombre, sel.usuario, sel.clienteNombre, sel.modo, sel.atendidoPor, sel.atencion, sel.borrador, sel.resumen, sel.ultimoEntranteHora, sel.telE164]) : 'nada'; }
function _waAjustarAltura(){
  var sp = document.querySelector('.wa-split'); if(!sp) return;
  if(window.innerWidth <= 1200){ sp.style.height = ''; return; }
  var alto = window.innerHeight - sp.getBoundingClientRect().top - 18;
  sp.style.height = Math.max(460, Math.round(alto)) + 'px';
}
if(typeof window.addEventListener === 'function' && !window._waResize){ window._waResize = true; window.addEventListener('resize', function(){ _waAjustarAltura(); }); }
function _waPintarSeleccion(){
  var ctx = _waCtxActual(), hilo = document.getElementById('wa-hilo'), ficha = document.getElementById('wa-ficha'); if(!hilo || !ficha) return;
  _waAjustarAltura();
  var conectado = waConectadoCanal(ctx.canal), sel = _waSeleccionada(ctx);
  var borrador = (document.getElementById('wa-texto') || {}).value || '';
  hilo.innerHTML = _waHtmlHilo(sel, ctx, conectado);
  ficha.innerHTML = _waHtmlFicha(sel, ctx);
  if(borrador && sel && window._waMsgSel === sel.id){ var ta = document.getElementById('wa-texto'); if(ta) ta.value = borrador; }
  window._waFirma = _waFirmaDe(sel);
  if(sel) _waMarcarLeida(sel);   // antes de pintar la lista, para que el globo de no leidos se apague ya
  _waPintarLista();
  if(!sel) return;
  if(window._waMsgSel !== sel.id){ window._waMsgSel = sel.id; if(conectado) waAbrirMensajes(sel.id); else _waPintarHilo(sel.id); }
  else _waPintarHilo(sel.id);
}
// Al abrir una conversacion los mensajes quedan leidos (el servidor los va contando)
function _waMarcarLeida(c){ if(!c || !(c.noLeidos > 0)) return; c.noLeidos = 0; if(waConectadoCanal(c.canal) && typeof _waActualizar === 'function') _waActualizar(c.id, { noLeidos: 0 }); }
// Llamada cuando cambian las conversaciones en la base o tras una accion: refresca en el sitio
// y devuelve true; si la pantalla no esta puesta devuelve false y el que llama hace nav.
function _waRefrescarEnSitio(forzar){
  if(!(S.page === 'whatsapp' || S.page === 'instagram') || !document.getElementById('wa-items')) return false;
  var ctx = _waCtxActual(), convs = _waConvsDe(ctx), esperan = convs.filter(function(c){ return c.atencion; }).length;
  var e;
  if((e = document.getElementById('wa-st-conv'))) e.textContent = convs.length;
  if((e = document.getElementById('wa-st-esperan'))) e.textContent = esperan;
  if((e = document.getElementById('wa-st-leads'))) e.textContent = convs.filter(function(c){ return c.borrador && c.borrador.tipo === 'lead'; }).length;
  if((e = document.getElementById('wa-tab-conv'))) e.textContent = 'Conversaciones' + (esperan ? ' · ' + esperan + ' esperan' : '');
  var sel = _waSeleccionada(ctx);
  if(forzar || _waFirmaDe(sel) !== window._waFirma) _waPintarSeleccion(); else _waPintarLista();
  return true;
}
function _waHtmlHilo(sel, ctx, conectado){
  if(!sel) return '<div class="empty" style="padding:60px 20px">Elige una conversación.</div>';
  var abierta = waVentanaAbierta(sel);
  return '<div class="wa-hilo-top"><div class="quien"><b>' + _waEsc(sel.nombre || sel.telE164) + '</b><small>' + (sel.canal === 'instagram' ? 'Instagram' + (sel.usuario ? ' · @' + _waEsc(sel.usuario) : '') + ' · ventas' : _waEsc(String(sel.telE164 || '').replace('+58', '0')) + (sel.area === 'ventas' ? ' · ventas' + (sel.clienteNombre ? ' · ya es cliente' : '') : (sel.clienteNombre ? ' · cliente del sistema' : ' · no está en el sistema'))) + ' · ' + (sel.modo === 'humano' ? 'lo atiende ' + _waEsc(sel.atendidoPor || 'el equipo') : 'lo atiende el asistente') + '</small></div>'
          + '<div class="acc">' + (sel.atencion ? '<button class="btn btn-g btn-sm" onclick="waVisto(\'' + _waEsc(sel.id) + '\')">Visto</button>' : '') + (sel.modo === 'humano' ? '<button class="btn btn-g btn-sm" onclick="waDevolver(\'' + _waEsc(sel.id) + '\')">Devolver al asistente</button>' : '<button class="btn btn-p btn-sm" onclick="waAtender(\'' + _waEsc(sel.id) + '\')">Atender yo</button>') + '</div></div>'
          + '<div class="wa-burbujas" id="wa-burbujas"></div>'
          + (abierta ? '<div class="wa-escribir"><textarea class="fta" id="wa-texto" placeholder="Escribir como ' + _waEsc((S.currentUser && S.currentUser.nombre) || 'equipo') + '… (al escribir, tomas la conversación)"></textarea><button class="btn btn-p" onclick="_waEnviarDesdeCaja(\'' + _waEsc(sel.id) + '\')">Enviar</button></div>'
            : (sel.canal === 'instagram' ? '<div class="wa-cerrada">Pasaron más de 7 días desde el último mensaje de la persona' + (sel.ultimoEntranteHora ? ' (' + _waHora(sel.ultimoEntranteHora) + ')' : '') + ': Instagram no deja escribirle hasta que vuelva a escribir.</div>'
              : '<div class="wa-cerrada">La ventana de 24 horas de WhatsApp está cerrada: el cliente escribió por última vez ' + (sel.ultimoEntranteHora ? 'el ' + _waHora(sel.ultimoEntranteHora) : 'hace más de un día') + '. Solo se le puede escribir con una plantilla aprobada, o esperar a que vuelva a escribir.</div>'))
          + (conectado ? '' : '<div class="wa-demo-cliente"><small>Demostración · ' + (sel.area === 'ventas' ? 'la persona' : 'el cliente') + ' escribe:</small>' + (sel.area === 'ventas' ? ['precio de la BRZ 200?', 'qué piden para el crédito?', 'quiero una, cómo hago?', 'tienen en Maracay?', 'quiero hablar con una persona'] : ['cuánto debo?', 'ya pagué', 'pago el sábado', 'cómo pago?', 'quiero hablar con una persona', 'no puedo pagar']).map(function(t){ return '<button onclick="waDemoClienteEscribe(\'' + _waEsc(sel.id) + '\',\'' + _waEsc(t) + '\')">' + _waEsc(t) + '</button>'; }).join('') + '</div>');
}
function _waHtmlFicha(sel, ctx){
  var cred = sel ? (S.creds || []).find(function(x){ return x.id === sel.cred || (sel.clienteId && String(x.clienteId) === String(sel.clienteId) && x.estado !== 'cancelado'); }) : null;
  var est = null; if(cred){ try{ est = CreditoLedger.generarEstadoCredito(cred, S.pagos || [], { diasGracia: WA_GRACIA, today: hoyLocalISO() }); }catch(e){} }
  var prox = est ? (est.cuotas || []).filter(function(x){ return x && x.saldo > 0.001; })[0] : null;
  return (sel && sel.area === 'ventas' ? '<div class="card"><div class="ct">Persona</div>'
          + (sel.canal === 'instagram' ? '<div class="wa-kv"><span>Instagram</span><span>' + (sel.usuario ? '@' + _waEsc(sel.usuario) : '—') + '</span></div>' : '<div class="wa-kv"><span>WhatsApp</span><span>' + _waEsc(String(sel.telE164 || '').replace('+58', '0')) + '</span></div>')
          + '<div class="wa-kv"><span>Nombre</span><span>' + _waEsc(sel.nombre || '—') + '</span></div>'
          + '<div class="wa-kv"><span>Canal</span><span>' + (sel.canal === 'instagram' ? 'Instagram' : 'WhatsApp') + ' · ventas</span></div>'
          + (sel.clienteNombre ? '<div class="wa-kv"><span>En el sistema</span><span>' + _waEsc(sel.clienteNombre) + '</span></div>' : '') + '</div>'
        + '<div class="card"><div class="ct">Lo que anotó el asistente</div>'
          + (sel.borrador && sel.borrador.tipo === 'lead' ? '<div class="wa-kv"><span>Quiere</span><span>' + _waEsc(sel.borrador.modelo || 'una moto') + '</span></div><div class="wa-kv"><span>Ciudad</span><span>' + _waEsc(sel.borrador.ciudad || '—') + '</span></div><div class="wa-kv"><span>WhatsApp</span><span>' + (sel.borrador.telefono ? '<a href="https://wa.me/' + _waEsc(sel.borrador.telefono) + '" target="_blank" rel="noopener">' + _waEsc(sel.borrador.telefono) + '</a>' : '—') + '</span></div>' + (sel.borrador.telefono && sel.canal === 'instagram' ? '<a class="btn btn-p btn-sm" style="margin-top:10px;display:inline-block" href="https://wa.me/' + _waEsc(sel.borrador.telefono) + '?text=' + encodeURIComponent('Hola ' + (sel.borrador.nombre || '') + ', te escribo de Pagasi por la ' + (sel.borrador.modelo || 'moto') + ' que preguntaste en Instagram.') + '" target="_blank" rel="noopener">Escribirle por WhatsApp</a>' : '') + '<button class="btn btn-g btn-sm" style="margin-top:10px;margin-left:6px" onclick="nav(\'clientes\')">Crear cliente</button>' : '<div class="cs">Todavía no dejó sus datos.</div>')
          + (sel.resumen ? '<div class="cs" style="margin-top:10px;line-height:1.5"><b>Resumen:</b> ' + _waEsc(sel.resumen) + '</div>' : '') + '</div>'
        + '<div class="card"><div class="ct">Alertas</div>' + (sel.atencion ? _waAtencion(sel.atencion) + '<div class="cs" style="margin-top:8px">Cuando lo resuelvas, toca "Visto".</div>' : '<div class="cs">Nada pendiente.</div>') + '</div>'
      : sel ? '<div class="card"><div class="ct">Cliente</div>'
          + '<div class="wa-kv"><span>Nombre</span><span>' + _waEsc(sel.clienteNombre || sel.nombre || '—') + '</span></div>'
          + '<div class="wa-kv"><span>Crédito</span><span>' + (cred ? _waEsc(cred.id) + ' · ' + _waEsc(cred.modelo || '') : '—') + '</span></div>'
          + (est ? '<div class="wa-kv"><span>Cuotas</span><span>' + est.cuotasPagadas + ' de ' + est.totalCuotas + '</span></div><div class="wa-kv"><span>Próxima</span><span>' + (prox ? _waMoney(prox.saldo) + ' · ' + _waFechaCorta(prox.fechaVence) : '—') + '</span></div><div class="wa-kv"><span>Estado</span><span>' + (prox && prox.fechaVence < hoyLocalISO() ? '<span class="wa-pill rojo">Atraso ' + _waDias(prox.fechaVence, hoyLocalISO()) + ' d</span>' : '<span class="wa-pill verde">Al día</span>') + '</span></div>' : '')
          + (sel.clienteId && cred ? '<button class="btn btn-g btn-sm" style="margin-top:10px" onclick="nav(\'pagos\')">Ver en Cobranza</button>' : '') + '</div>'
        + '<div class="card"><div class="ct">Lo que anotó el asistente</div>'
          + (sel.borrador && sel.borrador.tipo === 'promesa' ? '<div class="wa-kv"><span>Promesa de pago</span><span>' + _waFechaCorta(sel.borrador.fecha) + ' · ' + _waMoney(sel.borrador.monto) + '</span></div><button class="btn btn-p btn-sm" style="margin-top:10px" onclick="_waPasarAPedido(\'' + _waEsc(sel.id) + '\')">Anotar el compromiso en el crédito</button>' : '<div class="cs">Sin promesas ni solicitudes pendientes.</div>')
          + (sel.resumen ? '<div class="cs" style="margin-top:10px;line-height:1.5"><b>Resumen:</b> ' + _waEsc(sel.resumen) + '</div>' : '') + '</div>'
        + '<div class="card"><div class="ct">Alertas</div>' + (sel.atencion ? _waAtencion(sel.atencion) + '<div class="cs" style="margin-top:8px">Cuando lo resuelvas, toca "Visto".</div>' : '<div class="cs">Nada pendiente.</div>') + '</div>'
    : '');
}

function _waPanelAsistente(ctx){
  var cfg = window._waCfg || {}, conectado = waConectadoCanal(ctx.canal), h = '';
  var puede = typeof isAdminUser === 'function' && isAdminUser();
  var pie = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap"><div class="cs">' + (cfg.actualizadoEn ? 'Última edición: ' + _waEsc(cfg.actualizadoPor || '') + ' · ' + _waHora(cfg.actualizadoEn) : 'Nadie las ha editado todavía') + (puede ? '' : ' · solo administración las edita') + '</div>';
  var conexionWa = conectado && ctx.canal === 'whatsapp' ? '<div class="cs">WhatsApp: número ' + _waEsc(cfg.telefono || '') + ' conectado por la API oficial.</div>' : (ctx.canal === 'whatsapp' ? '<div class="cs" style="line-height:1.6">WhatsApp pendiente: verificación del negocio en Meta, el número, plantillas aprobadas y las claves en el servidor. Mientras tanto el módulo funciona en demostración.</div>' : '');
  var conexionIg = ctx.canal === 'instagram' ? (cfg.instagram ? '<div class="cs">Instagram: ' + (typeof cfg.instagram === 'string' ? '@' + _waEsc(cfg.instagram.replace(/^@/, '')) + ' ' : '') + 'conectado (mensajes directos).</div>' : '<div class="cs" style="line-height:1.6">Instagram pendiente: cuenta profesional ligada a una página de Facebook y permiso de mensajes en la misma app de Meta. Mientras tanto el módulo funciona en demostración.</div>') : '';
  if(ctx.area === 'cobranza'){
    h += '<div class="sg" style="grid-template-columns:1.4fr 1fr;align-items:start">'
      + '<div class="card"><div class="ch"><div><div class="ct">Instrucciones del asistente de cobranza</div><div class="cs">Texto libre. El asistente lo lee antes de cada respuesta y manda sobre todo lo demás. Ejemplos: "esta semana no se reciben pagos en efectivo", "si preguntan por refinanciar, pásalos a Samantha".</div></div></div>'
      + '<textarea class="fta" id="wa-instr" style="width:100%;min-height:160px" ' + (puede ? '' : 'disabled') + '>' + _waEsc(cfg.instrucciones || '') + '</textarea>'
      + '<div class="ct" style="margin-top:14px">Cómo pagar</div><div class="cs" style="margin-bottom:6px">Lo único que el asistente le da al cliente cuando pregunta dónde pagar: Pago Móvil, cuenta, RIF, Zelle. Si está vacío, lo manda con el equipo.</div>'
      + '<textarea class="fta" id="wa-pago" style="width:100%;min-height:80px" ' + (puede ? '' : 'disabled') + '>' + _waEsc(cfg.datosPago || '') + '</textarea>'
      + pie + (puede ? '<button class="btn btn-p btn-sm" onclick="waGuardarInstrucciones(document.getElementById(\'wa-instr\').value, document.getElementById(\'wa-pago\').value)">Guardar</button>' : '') + '</div></div>'
      + '<div style="display:grid;gap:12px">'
      + '<div class="card"><div class="ct">Reglas fijas (no se cambian desde aquí)</div><ul style="margin:8px 0 0 18px;padding:0;font-size:12.5px;line-height:1.7;color:var(--ink2)">'
      + '<li>Solo habla del crédito del cliente: cuánto debe, cuándo vence, cómo pagar y su comprobante.</li><li>Nunca aprueba, descuenta, refinancia ni promete nada: eso lo consulta con el equipo.</li><li>No inventa montos: todo sale del ledger del sistema.</li><li>No pide cédula ni documentos por el chat.</li><li>Si el cliente se queja, pide una persona o manda una imagen, se calla y avisa.</li><li>Tono: cercano, breve, en el español de Venezuela; recuerda, nunca amenaza.</li></ul></div>'
      + '<div class="card"><div class="ct">Conexión con Meta</div>' + conexionWa + '</div>'
      + '<div class="card"><div class="ct">Horario de los recordatorios</div><div class="cs" style="line-height:1.6">Todos los días a las 8:30 am: 2 días antes de vencer, el día del vencimiento, al tercer día de vencida y al sexto; de 10 días en adelante no insiste y lo pasa a un cobrador.</div></div>'
      + '</div></div>';
  } else {
    h += '<div class="sg" style="grid-template-columns:1.4fr 1fr;align-items:start">'
      + '<div class="card"><div class="ch"><div><div class="ct">Instrucciones del asistente de ventas</div><div class="cs">Lo que debe saber además del catálogo: promociones, horarios, qué decir de una sede, a quién pasar los interesados. Él ya conoce precios, inicial, cuotas y cómo se solicita. Son las mismas instrucciones para WhatsApp e Instagram.</div></div></div>'
      + '<textarea class="fta" id="wa-ventas" style="width:100%;min-height:200px" ' + (puede ? '' : 'disabled') + '>' + _waEsc(cfg.instruccionesVentas || '') + '</textarea>'
      + pie + (puede ? '<button class="btn btn-p btn-sm" onclick="waGuardarInstrucciones(null, null, document.getElementById(\'wa-ventas\').value)">Guardar</button>' : '') + '</div></div>'
      + '<div style="display:grid;gap:12px">'
      + '<div class="card"><div class="ct">Reglas fijas (no se cambian desde aquí)</div><ul style="margin:8px 0 0 18px;padding:0;font-size:12.5px;line-height:1.7;color:var(--ink2)">'
      + '<li>Solo habla de las motos, los planes y cómo solicitar; los precios y cuotas salen del catálogo de pagasi.io.</li><li>Nunca aprueba ni promete aprobación, entrega ni descuentos: "eso lo confirma tu asesor".</li><li>No pide cédula ni documentos: para que un asesor llame basta nombre, ciudad, modelo y WhatsApp.</li><li>Quien quiere comprar queda anotado como "Quiere comprar" con sus datos, para que el equipo lo llame.</li><li>Si pregunta por un crédito que ya tiene, lo manda a Mi cuenta o a cobranza.</li><li>Tono: cercano, entusiasta y breve, en el español de Venezuela.</li></ul></div>'
      + '<div class="card"><div class="ct">Conexión con Meta</div>' + conexionWa + conexionIg + '</div>'
      + '<div class="card"><div class="ct">Ventana para responder</div><div class="cs" style="line-height:1.6">' + (ctx.canal === 'instagram' ? 'El equipo puede escribirle a la persona hasta 7 días después de su último mensaje; pasado eso, hay que esperar a que vuelva a escribir.' : 'El equipo puede escribirle libremente durante las 24 horas siguientes a su último mensaje; después solo con una plantilla aprobada.') + '</div></div>'
      + '</div></div>';
  }
  return h;
}
PG.whatsapp = function(){
  if(!document.getElementById('wa-css')) document.head.insertAdjacentHTML('beforeend', _WA_CSS);
  if(!window._waCfg){ waCargarCfg(function(){ if(S.page === 'whatsapp') nav('whatsapp'); }); }
  var cola = waColaHoy();
  var conectado = waConectado();
  if(!conectado) waDemoConversaciones(cola); else waAbrirConversaciones('whatsapp');
  var ctx = _waCtxActual(), tab = _waTabActual(ctx);
  var cob = _waConvsDe({ canal: 'whatsapp', area: 'cobranza' }), ven = _waConvsDe({ canal: 'whatsapp', area: 'ventas' });
  var esperanCob = cob.filter(function(c){ return c.atencion; }).length, esperanVen = ven.filter(function(c){ return c.atencion; }).length;
  var convs = _waConvsDe(ctx), conAtencion = convs.filter(function(c){ return c.atencion; }).length;
  var promesas = cob.filter(function(c){ return c.borrador && c.borrador.tipo === 'promesa'; }).length;

  var h = '<div class="page wa-page">'
    + '<div class="wa-cab"><div class="wa-cab-izq"><div class="ct" style="font-size:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">WhatsApp ' + (conectado ? '<span class="wa-pill verde">Conectado · ' + _waEsc((window._waCfg || {}).telefono || '') + '</span>' : '<span class="wa-pill ambar">Modo demostración</span>') + '</div>'
    + '<div class="cs">' + (ctx.area === 'cobranza' ? 'Cobranza: el asistente recuerda las cuotas, responde al cliente y le pasa al equipo lo que necesita una persona.' : 'Ventas: el asistente atiende a quien pregunta por una moto, con el catálogo de pagasi.io, y anota a quien quiere comprar.') + '</div></div>'
    + '<div class="wa-cab-der"><div class="wa-areas"><button class="' + (ctx.area === 'cobranza' ? 'on' : '') + '" onclick="waArea(\'cobranza\')">Cobranza' + (esperanCob ? ' <span class="wa-pill">' + esperanCob + '</span>' : '') + '</button><button class="' + (ctx.area === 'ventas' ? 'on' : '') + '" onclick="waArea(\'ventas\')">Ventas' + (esperanVen ? ' <span class="wa-pill">' + esperanVen + '</span>' : '') + '</button></div>'
    + '<div class="wa-tabs">' + (ctx.area === 'cobranza' ? '<button class="' + (tab === 'hoy' ? 'on' : '') + '" onclick="waTab(\'hoy\')">Hoy · ' + cola.total + '</button>' : '') + '<button class="' + (tab === 'conv' ? 'on' : '') + '" id="wa-tab-conv" onclick="waTab(\'conv\')">Conversaciones' + (conAtencion ? ' · ' + conAtencion + ' esperan' : '') + '</button><button class="' + (tab === 'asistente' ? 'on' : '') + '" onclick="waTab(\'asistente\')">Asistente</button></div></div></div>'
    + (conectado ? '' : '<div class="wa-aviso"><span style="font-size:18px">⚠️</span><div><b>Meta todavía no está conectado.</b> ' + (ctx.area === 'cobranza' ? 'La cola de hoy es real (sale de tu cartera y del ledger) pero no se manda nada; las conversaciones son de muestra.' : 'Las conversaciones son de muestra, en memoria, para ver cómo atiende el asistente de ventas.') + '</div></div>');

  if(tab === 'hoy' && ctx.area === 'cobranza'){
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

  if(tab === 'conv') h += _waPanelConversaciones(ctx);
  if(tab === 'asistente') h += _waPanelAsistente(ctx);
  h += '</div>';
  return h;
};
