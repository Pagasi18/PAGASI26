// Pagasi module: whatsapp (18-oct-2026) — el MOTOR de la bandeja de Redes sociales.
// Desde el 22-oct-2026 WhatsApp e Instagram son un solo modulo, Redes sociales
// (modules/redes.js), con una pestana por canal. Aqui queda la pantalla compartida: lista +
// hilo + ficha y la cola de cobranza de hoy (la ventana de cada asistente vive en modules/redes.js). Patricia
// atiende la COBRANZA por WhatsApp; Paola las VENTAS por WhatsApp e Instagram. Ver logic/whatsapp.js.
// El contexto es la pestana abierta de Redes sociales: 'todos', 'whatsapp', 'instagram'...
function _waCtxActual(){ return { modulo: 'redes', canal: window._rsTab || 'todos', area: '' }; }
function _waClave(ctx){ ctx = ctx || _waCtxActual(); return ctx.modulo + ':' + ctx.canal; }
// Abrir una conversacion: si ya estamos en esa pantalla se cambia solo el hilo y la ficha (sin
// recargar la pagina, que saltaba el formato y el scroll con cada clic, 19-oct-2026); si no, nav.
// Si la conversacion no es del canal de la pestana abierta, se abre en "Todos los mensajes".
function waAbrir(id){
  var c = _waConv(id), enLista = !!c && _waConvsDe(_waCtxActual()).indexOf(c) > -1;
  window._waSel = id;
  var enSitio = S.page === 'redes' && (window._rsVista || 'bandeja') === 'bandeja' && document.getElementById('wa-hilo') && enLista;
  if(enSitio){ _waPintarSeleccion(); return; }
  window._rsVista = 'bandeja';
  if(!enLista){ window._rsTab = 'todos'; window._waVendSel = ''; }   // que se vea aunque sea de otro vendedor
  nav('redes');
}
// Filtros de la lista (por pestana): la clave es redes:canal
window._waFiltros = window._waFiltros || {};
function _waFiltroActual(ctx){ return window._waFiltros[_waClave(ctx || _waCtxActual())] || 'todas'; }
function waFiltro(f){ window._waFiltros[_waClave()] = f; _waPintarLista(); }
// "Sin responder": el ultimo mensaje lo mando el cliente. El servidor anota ultimoAutor; para las
// conversaciones de antes, si la hora del ultimo mensaje es la del ultimo entrante, fue el cliente.
function _waSinResponder(c){ if(!c || !c.ultimoEntranteHora) return false; return c.ultimoAutor ? c.ultimoAutor === 'cliente' : String(c.ultimoMensajeHora || '') === String(c.ultimoEntranteHora || ''); }
function _waEsHoy(iso){ return !!iso && new Date(iso).toDateString() === new Date().toDateString(); }
function _waEsCobranza(c){ return (c.canal || 'whatsapp') === 'whatsapp' && (c.area || 'cobranza') === 'cobranza'; }
// en: las pestanas donde sale el filtro (sin "en", sale en todas). Cobranza solo hay por WhatsApp.
var WA_FILTROS = [
  { id: 'todas', nombre: 'Todas', f: function(){ return true; } },
  { id: 'noleidas', nombre: 'No leídas', f: function(c){ return (c.noLeidos || 0) > 0; } },
  { id: 'sin', nombre: 'Sin responder', f: _waSinResponder },
  { id: 'esperan', nombre: 'Esperan persona', f: function(c){ return !!c.atencion; } },
  { id: 'humano', nombre: 'Atiende una persona', f: function(c){ return c.modo === 'humano'; } },
  { id: 'cobranza', nombre: 'Cobranza', f: _waEsCobranza, en: ['todos', 'whatsapp'] },
  { id: 'ventas', nombre: 'Ventas', f: function(c){ return !_waEsCobranza(c); }, en: ['todos', 'whatsapp'] },
  { id: 'leads', nombre: 'Quieren comprar', f: function(c){ return !!(c.borrador && c.borrador.tipo === 'lead'); } },
  { id: 'promesas', nombre: 'Con promesa', f: function(c){ return !!(c.borrador && c.borrador.tipo === 'promesa'); }, en: ['todos', 'whatsapp'] },
  { id: 'hoy', nombre: 'Hoy', f: function(c){ return _waEsHoy(c.ultimoMensajeHora); } }
];
function _waFiltrosDe(ctx){ return WA_FILTROS.filter(function(f){ return !f.en || f.en.indexOf(ctx.canal) > -1; }); }
// Las conversaciones de la pestana abierta ('todos' = todos los canales que este usuario ve)...
function _waConvsCanal(ctx){ return (window._waConvs || []).filter(function(c){ return ctx.canal === 'todos' || (c.canal || 'whatsapp') === ctx.canal; }); }
// ...y del vendedor escogido en la barra de vendedores
function _waConvsDe(ctx){ var v = waVendSel(); return _waConvsCanal(ctx).filter(function(c){ return !v || (v === '-' ? !waVendedorDe(c) : waVendedorDe(c) === v); }); }
// El vendedor de cada conversación (Adam, 24-oct-2026: "necesito también filtros por vendedores"). Lo anota el
// servidor la primera vez que alguien del equipo escribe (o con "Pasar a…") y no se borra al devolverla a Paola.
// Las de antes del 24-oct, que no lo tienen: quien la está atendiendo. Vacío = sin vendedor (solo Paola).
function waVendedorDe(c){ if(!c) return ''; if(c.vendedor != null) return String(c.vendedor).trim(); return c.modo === 'humano' ? String(c.atendidoPor || '').trim() : ''; }
// Lo escogido en la barra: null = todavía nada (un vendedor entra viendo lo suyo; un administrador, todo),
// '' = todos, '-' = sin vendedor, o el nombre. Es uno solo para todas las pestañas.
if(window._waVendSel === undefined) window._waVendSel = null;
function waVendSel(){
  if(window._waVendSel != null) return window._waVendSel;
  var yo = String((S.currentUser && S.currentUser.nombre) || '').trim(), admin = typeof isAdminUser === 'function' && isAdminUser();
  return (!admin && yo && (window._waConvs || []).some(function(c){ return waVendedorDe(c) === yo; })) ? yo : '';
}
function waVendedorFiltro(v){ window._waVendSel = v == null ? '' : String(v); if(!_waRefrescarEnSitio(true)) nav('redes'); }
// Los vendedores de la pestaña, con cuántas conversaciones tiene cada uno (los nuevos aparecen solos)
function waVendedores(ctx){
  var o = {}, sin = 0, convs = _waConvsCanal(ctx || _waCtxActual());
  convs.forEach(function(c){ var v = waVendedorDe(c); if(v) o[v] = (o[v] || 0) + 1; else sin++; });
  return { total: convs.length, sin: sin, lista: Object.keys(o).map(function(k){ return { nombre: k, n: o[k] }; }).sort(function(a, b){ return b.n - a.n || a.nombre.localeCompare(b.nombre); }) };
}

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
  + '.wa-vend-sel{border:1px solid var(--rim);border-radius:8px;background:var(--surf);color:var(--ink);font:inherit;font-size:12px;font-weight:600;padding:3px 6px;max-width:170px}'
  + '.wa-escribir{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--rim)}.wa-escribir textarea{flex:1;min-height:44px;max-height:120px;resize:vertical}.wa-cerrada{padding:10px 14px;font-size:12px;color:#b45309;background:#fff4e0;border-top:1px solid #f3d9a4}'
  + '.wa-ficha{display:flex;flex-direction:column;gap:12px}.wa-ficha .card{padding:16px}.wa-ficha .ct{margin-bottom:8px}.wa-kv{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:5px 0;border-top:1px solid var(--rim)}.wa-kv:first-of-type{border-top:0}.wa-kv span:last-child{font-weight:800;text-align:right}'
  + '.wa-demo-cliente{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;border-top:1px dashed var(--rim);background:#fffdf5}.wa-demo-cliente button{font:inherit;font-size:11px;border:1px solid var(--rim);background:#fff;border-radius:999px;padding:4px 10px;cursor:pointer}.wa-demo-cliente small{width:100%;color:var(--ink3);font-size:10.5px}'
  + '.wa-stats .stat{text-align:left}.wa-stats .st-v{font-size:26px}'
  + '.wa-pill.ig{background:linear-gradient(90deg,#f58529,#dd2a7b,#8134af);color:#fff}.wa-pill.verde{background:#e6f7ee;color:#0f7a3e}.wa-item .av.ig{background:linear-gradient(135deg,#f58529,#dd2a7b,#8134af);color:#fff}'
  + '.wa-item .av{position:relative}.wa-item .av .cn{position:absolute;right:-3px;bottom:-3px;width:15px;height:15px;border-radius:50%;border:2px solid var(--surf)}.wa-item .av .cn.wa{background:#25D366}.wa-item .av .cn.ig{background:linear-gradient(135deg,#f58529,#dd2a7b,#8134af)}.wa-item .av .cn.ms{background:linear-gradient(135deg,#00b2ff,#006aff)}'
  + '.wa-areas{display:flex;gap:0;margin:0 0 14px;border:1px solid var(--rim);border-radius:14px;overflow:hidden;width:max-content;max-width:100%}.wa-areas button{border:0;background:var(--surf);font:inherit;font-size:13px;font-weight:800;color:var(--ink2);padding:10px 18px;cursor:pointer;display:flex;gap:8px;align-items:center}.wa-areas button+button{border-left:1px solid var(--rim)}.wa-areas button.on{background:var(--p1);color:#fff}.wa-areas button .wa-pill{background:rgba(255,255,255,.25);color:inherit}.wa-areas button:not(.on) .wa-pill{background:var(--surf2);color:var(--ink2)}'
  + '</style>';

function _waIni(n){ var p = String(n || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); }
// La fecha va en hora local, como la hora: con la del texto ISO (UTC) un mensaje de las 11 pm de
// Caracas salía con la fecha del día siguiente (22-oct-2026)
function _waHora(iso){ if(!iso) return ''; var d = new Date(iso), hoy = new Date(); var hm = d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); return d.toDateString() === hoy.toDateString() ? hm : _waFechaCorta(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)) + ' ' + hm; }
var _WA_DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
function _waFechaLocal(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
// En la lista, como la bandeja de Meta: la hora si es de hoy, el día si es de esta semana, si no la fecha
function _waHoraLista(iso){
  if(!iso) return ''; var d = new Date(iso), hoy = new Date();
  if(d.toDateString() === hoy.toDateString()) return d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
  var dias = Math.floor((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  return dias < 7 ? _WA_DIAS[d.getDay()] : _waFechaCorta(_waFechaLocal(d));
}
// Separador de fecha dentro del hilo ("Hoy, 2:37 pm" · "21 oct 2026, 11:21 pm")
function _waSep(iso){
  var d = new Date(iso), h = d.getHours(), hm = (h % 12 || 12) + ':' + ('0' + d.getMinutes()).slice(-2) + ' ' + (h < 12 ? 'am' : 'pm');
  return (d.toDateString() === new Date().toDateString() ? 'Hoy' : _waFechaCorta(_waFechaLocal(d)) + ' ' + d.getFullYear()) + ', ' + hm;
}
var _WA_ICONOS = {
  visto: '<path d="M20 6 9 17l-5-5"/>',
  yo: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6"/>',
  wa: '<path d="M21 11.5a8.4 8.4 0 0 1-9.2 8.4 8.6 8.6 0 0 1-3.4-.8L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/>'
};
function _waIcono(n){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (_WA_ICONOS[n] || '') + '</svg>'; }
function _waNombreAsis(c){ return c && _waEsCobranza(c) ? 'Patricia' : 'Paola'; }
function _waAtencion(a){ return a === 'lead' ? '<span class="wa-pill verde">Quiere comprar</span>' : a === 'pide_persona' ? '<span class="wa-pill rojo">Pide una persona</span>' : a === 'queja' ? '<span class="wa-pill rojo">Queja</span>' : a === 'comprobante' ? '<span class="wa-pill ambar">Comprobante por revisar</span>' : a === 'promesa_vencida' ? '<span class="wa-pill ambar">Promesa vencida</span>' : a === 'error' ? '<span class="wa-pill rojo">El asistente falló</span>' : a === 'revisar' ? '<span class="wa-pill ambar" title="Paola se frenó: demasiados mensajes seguidos en esta conversación">Revisar · Paola se frenó</span>' : ''; }
function _waEstadoIcono(e){ return e === 'leido' ? '✓✓' : e === 'entregado' ? '✓✓' : e === 'enviado' ? '✓' : e === 'pendiente' ? '…' : e === 'fallo' ? '✕ no se envió' : ''; }

// A la vista van los filtros más usados; el resto, en un menú desplegable con su cantidad (Adam,
// 22-oct-2026: "no puedo ver todos los botones"). Escoger "Más filtros" vuelve al primero (Todas).
function _waFiltrosHtml(filtros, activo, contar, fn, visibles){
  var chip = function(f){ var n = contar(f); return '<button class="' + (f.id === activo ? 'on' : '') + '" onclick="' + fn + '(\'' + f.id + '\')"' + (!n && f.id !== filtros[0].id && f.id !== activo ? ' disabled' : '') + '>' + f.nombre + '<i>' + n + '</i></button>'; };
  var resto = filtros.filter(function(f){ return visibles.indexOf(f.id) < 0; }), enMenu = resto.some(function(f){ return f.id === activo; });
  // Un menú nativo toma el ancho de su opción más larga y bajaba de línea: va del ancho de lo escogido
  var sel = enMenu ? resto.filter(function(f){ return f.id === activo; })[0] : null, texto = sel ? sel.nombre + ' (' + contar(sel) + ')' : 'Más filtros';
  return filtros.filter(function(f){ return visibles.indexOf(f.id) > -1; }).map(chip).join('')
    + (resto.length ? '<select class="wa-mas' + (enMenu ? ' on' : '') + '" style="width:' + Math.round(texto.length * 7.3 + 40) + 'px" onchange="' + fn + '(this.value)" aria-label="Más filtros">'
      + '<option value="' + filtros[0].id + '"' + (enMenu ? '' : ' selected') + '>Más filtros</option>'
      + resto.map(function(f){ var n = contar(f); return '<option value="' + f.id + '"' + (f.id === activo ? ' selected' : '') + (!n && f.id !== activo ? ' disabled' : '') + '>' + f.nombre + ' (' + n + ')</option>'; }).join('')
      + '</select>' : '');
}
function _waPintarLista(){
  var cont = document.getElementById('wa-items'); if(!cont) return;
  if(typeof _rsPintarVendedores === 'function') _rsPintarVendedores();
  var ctx = _waCtxActual(), q = String((document.getElementById('wa-q') || {}).value || '').toLowerCase();
  var todas = _waConvsDe(ctx), filtros = _waFiltrosDe(ctx), fid = _waFiltroActual(ctx);
  var filtro = filtros.find(function(f){ return f.id === fid; }) || filtros[0];
  var chips = document.getElementById('wa-filtros');
  if(chips) chips.innerHTML = _waFiltrosHtml(filtros, filtro.id, function(f){ return f.id === 'todas' ? todas.length : todas.filter(f.f).length; }, 'waFiltro', ['todas', 'noleidas']);
  var convs = todas
    .filter(filtro.f)
    .filter(function(c){ return !q || (String(c.nombre || '') + ' ' + String(c.telE164 || '') + ' ' + String(c.clienteNombre || '') + ' ' + String(c.usuario || '')).toLowerCase().indexOf(q) > -1; })
    .slice().sort(function(a, b){ return (b.atencion ? 1 : 0) - (a.atencion ? 1 : 0) || String(b.ultimoMensajeHora || '').localeCompare(String(a.ultimoMensajeHora || '')); });
  cont.innerHTML = convs.length ? convs.map(function(c){
    // Como la bandeja de Meta: foto redonda con la marca de la red, nombre, "Paola: ..." y etiquetas
    var quien = c.ultimoAutor === 'equipo' ? 'Tú: ' : c.ultimoAutor === 'asistente' ? _waNombreAsis(c) + ': ' : '';
    var tags = [_waEsCobranza(c) ? '<span>Cobranza</span>' : '<span>Ventas</span>'];
    if(c.atencion) tags.push('<span class="' + (/pide_persona|queja|error/.test(c.atencion) ? 'rojo' : c.atencion === 'lead' ? 'verde' : 'ambar') + '">' + _waAtencion(c.atencion).replace(/<[^>]+>/g, '') + '</span>');
    else if(c.borrador && c.borrador.tipo === 'lead') tags.push('<span class="verde">Quiere comprar</span>');
    if(c.modo === 'humano') tags.push('<span>Lo atiende ' + _waEsc(c.atendidoPor || 'el equipo') + '</span>');
    return '<div class="wa-item' + (c.id === window._waSel ? ' on' : '') + '" onclick="waAbrir(\'' + _waEsc(c.id) + '\')"' + (c.noLeidos ? ' data-nl="1"' : '') + '>'
      + '<div class="av' + (c.canal === 'instagram' ? ' ig' : '') + '">' + _waEsc(_waIni(c.nombre || c.clienteNombre)) + '<span class="cn ' + (c.canal === 'instagram' ? 'ig' : 'wa') + '" title="' + (c.canal === 'instagram' ? 'Instagram' : 'WhatsApp') + '">' + _waIcono(c.canal === 'instagram' ? 'ig' : 'wa') + '</span></div>'
      + '<div class="cuerpo"><div class="n">' + (_waSinResponder(c) ? '<span class="sr" title="Sin responder"></span>' : '') + '<span class="nom">' + _waEsc(c.nombre || c.clienteNombre || c.telE164) + '</span></div>'
      + '<div class="u">' + _waEsc(quien + (c.ultimoMensaje || '')) + '</div><div class="rs-tg">' + tags.join('') + '</div></div>'
      + '<div class="h">' + _waHoraLista(c.ultimoMensajeHora) + (c.noLeidos ? '<span class="punto" title="' + c.noLeidos + ' sin leer"></span>' : '') + '</div></div>';
  }).join('') : '<div class="empty" style="padding:30px 16px">' + (todas.length ? 'Ninguna conversación con ese filtro.' : (ctx.canal === 'todos' || waConectadoCanal(ctx.canal) ? 'Todavía no hay conversaciones.' : 'Sin conversaciones de muestra.')) + '</div>';
}
function _waPintarHilo(id){
  var cont = document.getElementById('wa-burbujas'); if(!cont || window._waSel !== id) return;
  var msgs = window._waMsgs[id] || [], conv = _waConv(id), asis = _waNombreAsis(conv), ini = _waIni(conv && (conv.nombre || conv.clienteNombre)), antes = 0;
  cont.innerHTML = msgs.length ? msgs.map(function(m){
    var quien = m.autor === 'cliente' ? '' : (m.autor === 'equipo' ? asis + ' · ' + (m.por || 'equipo') : asis);
    // Un separador de fecha al empezar y cada vez que pasa más de una hora, como en Meta
    var t = new Date(m.hora).getTime(), sep = !antes || t - antes > 3600000 ? '<div class="wa-sep">' + _waSep(m.hora) + '</div>' : ''; antes = t;
    return sep + '<div class="wa-m ' + _waEsc(m.autor) + '">' + (m.autor === 'cliente' ? '<div class="avm' + (conv && conv.canal === 'instagram' ? ' ig' : '') + '">' + _waEsc(ini) + '</div>' : '')
      + '<div class="wa-b ' + _waEsc(m.autor) + '">' + (m.tipo === 'plantilla' ? '<div class="plantilla">Recordatorio automático</div>' : '')
      + (m.medio && m.medio.url ? '<img src="' + _waEsc(m.medio.url) + '" alt="">' : '')
      + _waEsc(m.texto || (m.tipo === 'imagen' ? '(imagen)' : m.tipo === 'audio' ? '(audio)' : '')).replace(/\n/g, '<br>')
      + '<div class="meta">' + (quien ? '<span class="quien">' + _waEsc(quien) + '</span>' : '') + '<span>' + _waHora(m.hora) + '</span>' + (m.autor !== 'cliente' ? '<span title="' + _waEsc(m.estado || '') + '">' + _waEstadoIcono(m.estado) + '</span>' : '') + (m.error ? '<span class="err">' + _waEsc(m.error) + '</span>' : '') + '</div></div></div>';
  }).join('') : '<div class="empty">Sin mensajes.</div>';
  cont.scrollTop = cont.scrollHeight;
  _waPintarLista();
}
// Lo que el vendedor va escribiendo, por conversación (Adam, 23-oct-2026: "cuando el vendedor está
// escribiendo y viene un latido se le borra lo que escribió"). Sobrevive a cualquier repintado y a
// cambiar de conversación; se borra solo cuando el mensaje sale.
window._waBorradores = window._waBorradores || {};
function _waGuardarBorrador(id, v){ if(!id) return; if(v) window._waBorradores[id] = v; else delete window._waBorradores[id]; }
function _waEnviarDesdeCaja(id){
  var ta = document.getElementById('wa-texto'); if(!ta) return;
  // Si no sale (ventana cerrada, vacío) el texto se queda en la caja
  if(waEnviarEquipo(id, ta.value)){ ta.value = ''; _waGuardarBorrador(id, ''); }
}
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
    + '<div class="wa-lista"><div class="wa-busca"><input class="fi" id="wa-q" placeholder="' + (ctx.canal === 'instagram' ? 'Buscar por nombre o usuario' : ctx.canal === 'whatsapp' ? 'Buscar por nombre o teléfono' : 'Buscar por nombre, usuario o teléfono') + '" oninput="_waPintarLista()" style="width:100%"></div><div class="wa-filtros" id="wa-filtros"></div><div class="items" id="wa-items"></div></div>'
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
// La bandeja ocupa justo lo que queda visible del área de contenido (#cnt), sin barra para bajar
// (Adam, 22-oct-2026: "quiero que el módulo no se corte, que entre en una sola página"). Se mide
// DENTRO de #cnt y sumando su scroll: medida contra la ventana, si se llegaba con la página bajada
// salía más alta de la cuenta y la caja de escribir quedaba cortada abajo.
function _waAjustarAltura(){
  var sp = document.querySelector('.wa-split'); if(!sp) return;
  var pg = sp.closest ? sp.closest('.rs-page') : null, lleno = window.innerWidth > 1200;
  if(pg && pg.classList) pg.classList.toggle('rs-lleno', lleno);
  if(!lleno){ sp.style.height = ''; return; }
  var cnt = document.getElementById('cnt'), main = document.querySelector('.main');
  var arriba = cnt ? cnt.getBoundingClientRect().top : 0;
  var top = sp.getBoundingClientRect().top - arriba + (cnt ? cnt.scrollTop : 0);
  var visible = cnt ? cnt.clientHeight : window.innerHeight;
  sp.style.height = Math.max(420, Math.round(visible - top - 16)) + 'px';
  if(cnt) cnt.scrollTop = 0;
  if(main) main.scrollTop = 0;   // si algo la había corrido, la barra de arriba vuelve a verse entera
}
if(typeof window.addEventListener === 'function' && !window._waResize){ window._waResize = true; window.addEventListener('resize', function(){ _waAjustarAltura(); }); }
function _waPintarSeleccion(){
  var ctx = _waCtxActual(), hilo = document.getElementById('wa-hilo'), ficha = document.getElementById('wa-ficha'); if(!hilo || !ficha) return;
  _waAjustarAltura();
  var sel = _waSeleccionada(ctx), conectado = sel ? waConectadoCanal(sel.canal || 'whatsapp') : false;
  // La caja se arma de nuevo con el borrador de su conversación; si el vendedor estaba escribiendo,
  // el cursor vuelve a donde estaba
  var ta0 = document.getElementById('wa-texto'), foco = null;
  var conv0 = ta0 && ta0.getAttribute ? ta0.getAttribute('data-conv') : null;
  if(conv0){
    _waGuardarBorrador(conv0, ta0.value);
    if(document.activeElement === ta0) foco = { conv: conv0, ini: ta0.selectionStart, fin: ta0.selectionEnd };
  }
  hilo.innerHTML = _waHtmlHilo(sel, ctx, conectado);
  ficha.innerHTML = _waHtmlFicha(sel, ctx);
  var ta1 = document.getElementById('wa-texto');
  if(foco && ta1 && sel && foco.conv === sel.id){ try{ ta1.focus(); ta1.setSelectionRange(foco.ini, foco.fin); }catch(e){} }
  window._waFirma = _waFirmaDe(sel);
  if(sel) _waMarcarLeida(sel);   // antes de pintar la lista, para que el globo de no leidos se apague ya
  _waPintarLista();
  if(!sel) return;
  if(window._waMsgSel !== sel.id){ window._waMsgSel = sel.id; if(conectado) waAbrirMensajes(sel.id); else _waPintarHilo(sel.id); }
  else _waPintarHilo(sel.id);
}
// El sistema redibuja la pantalla cada vez que alguien del equipo guarda algo (pagos, créditos,
// clientes…). En la bandeja no se arma la página de nuevo, porque vaciaba la caja de escribir: se
// refrescan en el sitio la lista, los contadores y la ficha del cliente (que usa créditos y pagos).
// Devuelve true si lo hizo; en las otras vistas de Redes devuelve false y se redibuja como siempre.
function waRefrescarPorDatos(){
  if(S.page !== 'redes' || !document.getElementById('wa-items')) return false;
  _waRefrescarEnSitio();
  var ficha = document.getElementById('wa-ficha'), ctx = _waCtxActual();
  if(ficha) ficha.innerHTML = _waHtmlFicha(_waSeleccionada(ctx), ctx);
  return true;
}
// Al abrir una conversacion los mensajes quedan leidos (el servidor los va contando)
function _waMarcarLeida(c){ if(!c || !(c.noLeidos > 0)) return; c.noLeidos = 0; if(waConectadoCanal(c.canal) && typeof _waActualizar === 'function') _waActualizar(c.id, { noLeidos: 0 }); }
// Llamada cuando cambian las conversaciones en la base o tras una accion: refresca en el sitio
// y devuelve true; si la pantalla no esta puesta devuelve false y el que llama hace nav.
function _waRefrescarEnSitio(forzar){
  if(S.page !== 'redes') return false;
  if(typeof _rsPintarContadores === 'function') _rsPintarContadores();
  // En la cola de hoy, los comentarios o el asistente no hay lista que refrescar, y no se recarga
  // la pagina (borraria lo que se esta escribiendo en las instrucciones)
  if(!document.getElementById('wa-items')) return true;
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
  return '<div class="wa-hilo-top"><div class="quien"><div class="av' + (sel.canal === 'instagram' ? ' ig' : '') + '">' + _waEsc(_waIni(sel.nombre || sel.clienteNombre)) + '</div><div><b>' + _waEsc(sel.nombre || sel.telE164) + '</b><small>' + (sel.canal === 'instagram' ? 'Instagram' + (sel.usuario ? ' · @' + _waEsc(sel.usuario) : '') + ' · ventas' : _waEsc(String(sel.telE164 || '').replace('+58', '0')) + (sel.area === 'ventas' ? ' · ventas' + (sel.clienteNombre ? ' · ya es cliente' : '') : (sel.clienteNombre ? ' · cliente del sistema' : ' · no está en el sistema'))) + ' · ' + (sel.modo === 'humano' ? 'lo atiende ' + _waEsc(sel.atendidoPor || 'el equipo') : 'lo atiende el asistente') + '</small></div></div>'
          + '<div class="acc">' + (sel.atencion ? '<button class="rs-ib" title="Visto: ya lo resolví" onclick="waVisto(\'' + _waEsc(sel.id) + '\')">' + _waIcono('visto') + '</button>' : '') + (sel.modo === 'humano' ? '<button class="rs-ib" title="Devolver al asistente" onclick="waDevolver(\'' + _waEsc(sel.id) + '\')">' + _waIcono('bot') + 'Devolver al asistente</button>' : '<button class="rs-ib p" title="Atender yo: el asistente se calla" onclick="waAtender(\'' + _waEsc(sel.id) + '\')">' + _waIcono('yo') + 'Atender yo</button>') + '</div></div>'
          + '<div class="wa-burbujas" id="wa-burbujas"></div>'
          + (abierta ? '<div class="wa-escribir"><textarea class="fta" id="wa-texto" data-conv="' + _waEsc(sel.id) + '" oninput="_waGuardarBorrador(\'' + _waEsc(sel.id) + '\', this.value)" placeholder="Responde en ' + (sel.canal === 'instagram' ? 'Instagram' : 'WhatsApp') + ' como ' + _waNombreAsis(sel) + '…">' + _waEsc(window._waBorradores[sel.id] || '') + '</textarea><div class="wa-esc-pie"><span class="cs">Al escribir, tomas la conversación y queda registrado que fuiste tú.</span><button class="btn btn-p btn-sm" onclick="_waEnviarDesdeCaja(\'' + _waEsc(sel.id) + '\')">Enviar</button></div></div>'
            : (sel.canal === 'instagram' ? '<div class="wa-cerrada">Pasaron más de 7 días desde el último mensaje de la persona' + (sel.ultimoEntranteHora ? ' (' + _waHora(sel.ultimoEntranteHora) + ')' : '') + ': Instagram no deja escribirle hasta que vuelva a escribir.</div>'
              : '<div class="wa-cerrada">La ventana de 24 horas de WhatsApp está cerrada: el cliente escribió por última vez ' + (sel.ultimoEntranteHora ? 'el ' + _waHora(sel.ultimoEntranteHora) : 'hace más de un día') + '. Solo se le puede escribir con una plantilla aprobada, o esperar a que vuelva a escribir.</div>'))
          + (conectado ? '' : '<div class="wa-demo-cliente"><small>Demostración · ' + (sel.area === 'ventas' ? 'la persona' : 'el cliente') + ' escribe:</small>' + (sel.area === 'ventas' ? ['precio de la BRZ 200?', 'qué piden para el crédito?', 'quiero una, cómo hago?', 'tienen en Maracay?', 'quiero hablar con una persona'] : ['cuánto debo?', 'ya pagué', 'pago el sábado', 'cómo pago?', 'quiero hablar con una persona', 'no puedo pagar']).map(function(t){ return '<button onclick="waDemoClienteEscribe(\'' + _waEsc(sel.id) + '\',\'' + _waEsc(t) + '\')">' + _waEsc(t) + '</button>'; }).join('') + '</div>');
}
// "Pasar a…": el vendedor de la conversación, en la ficha
function _waHtmlVendedor(sel){
  var actual = waVendedorDe(sel), yo = String((S.currentUser && S.currentUser.nombre) || '').trim();
  var V = waVendedores({ canal: 'todos' }).lista.map(function(x){ return x.nombre; });
  [yo, actual].forEach(function(n){ if(n && V.indexOf(n) < 0) V.push(n); });
  return '<div class="wa-kv"><span>Vendedor</span><span><select class="wa-vend-sel" onchange="waPasarA(\'' + _waEsc(sel.id) + '\', this.value)" aria-label="Pasar a otro vendedor">'
    + '<option value=""' + (actual ? '' : ' selected') + '>Sin vendedor (Paola)</option>'
    + V.map(function(n){ return '<option value="' + _waEsc(n) + '"' + (n === actual ? ' selected' : '') + '>' + _waEsc(n) + (n === yo ? ' (yo)' : '') + '</option>'; }).join('') + '</select></span></div>';
}
function _waHtmlFicha(sel, ctx){
  var cred = sel ? (S.creds || []).find(function(x){ return x.id === sel.cred || (sel.clienteId && String(x.clienteId) === String(sel.clienteId) && x.estado !== 'cancelado'); }) : null;
  var est = null; if(cred){ try{ est = CreditoLedger.generarEstadoCredito(cred, S.pagos || [], { diasGracia: WA_GRACIA, today: hoyLocalISO() }); }catch(e){} }
  var prox = est ? (est.cuotas || []).filter(function(x){ return x && x.saldo > 0.001; })[0] : null;
  var perfil = sel ? '<div class="card rs-perfil"><div class="av' + (sel.canal === 'instagram' ? ' ig' : '') + '">' + _waEsc(_waIni(sel.nombre || sel.clienteNombre)) + '</div><div><b>' + _waEsc(sel.clienteNombre || sel.nombre || sel.telE164 || '') + '</b>'
    + (sel.canal === 'instagram' && sel.usuario ? '<a href="https://www.instagram.com/' + encodeURIComponent(sel.usuario) + '/" target="_blank" rel="noopener">Ver perfil</a>'
      : (sel.clienteId || sel.clienteLead) ? '<button class="lnk" onclick="nav(\'clientes\');setTimeout(function(){ if(typeof verCliente===\'function\') verCliente(\'' + _waEsc(sel.clienteId || sel.clienteLead) + '\'); },150)">Ver cliente</button>'
      : '<span class="cs">' + (sel.canal === 'instagram' ? 'Instagram' : 'WhatsApp') + '</span>') + '</div></div>' : '';
  return perfil + (sel && sel.area === 'ventas' ? '<div class="card"><div class="ct">Información</div>'
          + (sel.canal === 'instagram' ? '<div class="wa-kv"><span>Instagram</span><span>' + (sel.usuario ? '@' + _waEsc(sel.usuario) : '—') + '</span></div>' : '<div class="wa-kv"><span>WhatsApp</span><span>' + _waEsc(String(sel.telE164 || '').replace('+58', '0')) + '</span></div>')
          + '<div class="wa-kv"><span>Nombre</span><span>' + _waEsc(sel.nombre || '—') + '</span></div>'
          + '<div class="wa-kv"><span>Canal</span><span>' + (sel.canal === 'instagram' ? 'Instagram' : 'WhatsApp') + ' · ventas</span></div>' + _waHtmlVendedor(sel)
          + (sel.clienteNombre ? '<div class="wa-kv"><span>En el sistema</span><span>' + _waEsc(sel.clienteNombre) + '</span></div>' : '') + '</div>'
        + '<div class="card"><div class="ct">Lo que anotó el asistente</div>'
          + (sel.borrador && sel.borrador.tipo === 'lead' ? '<div class="wa-kv"><span>Quiere</span><span>' + _waEsc(sel.borrador.modelo || 'una moto') + '</span></div>' + (sel.borrador.nombre ? '<div class="wa-kv"><span>Nombre</span><span>' + _waEsc(sel.borrador.nombre) + '</span></div>' : '') + (sel.borrador.cedula ? '<div class="wa-kv"><span>Cédula</span><span>' + _waEsc(sel.borrador.cedula) + '</span></div>' : '') + '<div class="wa-kv"><span>Ciudad</span><span>' + _waEsc(sel.borrador.ciudad || '—') + '</span></div>' + (sel.borrador.inicial ? '<div class="wa-kv"><span>Inicial disponible</span><span>' + _waMoney(sel.borrador.inicial) + '</span></div>' : '') + (sel.borrador.ocupacion ? '<div class="wa-kv"><span>Se dedica a</span><span>' + _waEsc(sel.borrador.ocupacion) + '</span></div>' : '') + (sel.clienteLead ? '<div class="wa-kv"><span>En el sistema</span><span>' + (sel.canal === 'instagram' ? 'Lead Instagram' : 'Lead WhatsApp') + ' · ' + _waEsc(sel.clienteLead) + '</span></div>' : '') + '<div class="wa-kv"><span>WhatsApp</span><span>' + (sel.borrador.telefono ? '<a href="https://wa.me/' + _waEsc(sel.borrador.telefono) + '" target="_blank" rel="noopener">' + _waEsc(sel.borrador.telefono) + '</a>' : '—') + '</span></div>' + (sel.borrador.telefono && sel.canal === 'instagram' ? '<a class="btn btn-p btn-sm" style="margin-top:10px;display:inline-block" href="https://wa.me/' + _waEsc(sel.borrador.telefono) + '?text=' + encodeURIComponent('Hola ' + (sel.borrador.nombre || '') + ', te escribo de Pagasi por la ' + (sel.borrador.modelo || 'moto') + ' que preguntaste en Instagram.') + '" target="_blank" rel="noopener">Escribirle por WhatsApp</a>' : '') + (sel.clienteLead ? '<button class="btn btn-g btn-sm" style="margin-top:10px;margin-left:6px" onclick="nav(\'clientes\');setTimeout(function(){ if(typeof verCliente===\'function\') verCliente(\'' + _waEsc(sel.clienteLead) + '\'); },150)">Ver cliente</button>' : '<button class="btn btn-g btn-sm" style="margin-top:10px;margin-left:6px" onclick="nav(\'clientes\')">Crear cliente</button>') : '<div class="cs">Todavía no dejó sus datos.</div>')
          + (sel.resumen ? '<div class="cs" style="margin-top:10px;line-height:1.5"><b>Resumen:</b> ' + _waEsc(sel.resumen) + '</div>' : '') + '</div>'
        + '<div class="card"><div class="ct">Alertas</div>' + (sel.atencion ? _waAtencion(sel.atencion) + '<div class="cs" style="margin-top:8px">Cuando lo resuelvas, toca "Visto".</div>' : '<div class="cs">Nada pendiente.</div>') + '</div>'
      : sel ? '<div class="card"><div class="ct">Información</div>'
          + '<div class="wa-kv"><span>Nombre</span><span>' + _waEsc(sel.clienteNombre || sel.nombre || '—') + '</span></div>' + _waHtmlVendedor(sel)
          + '<div class="wa-kv"><span>Crédito</span><span>' + (cred ? _waEsc(cred.id) + ' · ' + _waEsc(cred.modelo || '') : '—') + '</span></div>'
          + (est ? '<div class="wa-kv"><span>Cuotas</span><span>' + est.cuotasPagadas + ' de ' + est.totalCuotas + '</span></div><div class="wa-kv"><span>Próxima</span><span>' + (prox ? _waMoney(prox.saldo) + ' · ' + _waFechaCorta(prox.fechaVence) : '—') + '</span></div><div class="wa-kv"><span>Estado</span><span>' + (prox && prox.fechaVence < hoyLocalISO() ? '<span class="wa-pill rojo">Atraso ' + _waDias(prox.fechaVence, hoyLocalISO()) + ' d</span>' : '<span class="wa-pill verde">Al día</span>') + '</span></div>' : '')
          + (sel.clienteId && cred ? '<button class="btn btn-g btn-sm" style="margin-top:10px" onclick="nav(\'pagos\')">Ver en Cobranza</button>' : '') + '</div>'
        + '<div class="card"><div class="ct">Lo que anotó el asistente</div>'
          + (sel.borrador && sel.borrador.tipo === 'promesa' ? '<div class="wa-kv"><span>Promesa de pago</span><span>' + _waFechaCorta(sel.borrador.fecha) + ' · ' + _waMoney(sel.borrador.monto) + '</span></div><button class="btn btn-p btn-sm" style="margin-top:10px" onclick="_waPasarAPedido(\'' + _waEsc(sel.id) + '\')">Anotar el compromiso en el crédito</button>' : '<div class="cs">Sin promesas ni solicitudes pendientes.</div>')
          + (sel.resumen ? '<div class="cs" style="margin-top:10px;line-height:1.5"><b>Resumen:</b> ' + _waEsc(sel.resumen) + '</div>' : '') + '</div>'
        + '<div class="card"><div class="ct">Alertas</div>' + (sel.atencion ? _waAtencion(sel.atencion) + '<div class="cs" style="margin-top:8px">Cuando lo resuelvas, toca "Visto".</div>' : '<div class="cs">Nada pendiente.</div>') + '</div>'
    : '');
}

// La cola de cobranza de hoy (antes la pestana "Hoy" del modulo WhatsApp): sale de la cartera
// y del ledger; los recordatorios los manda Patricia sola a las 8:30 am.
function _waPanelHoy(cola){
  var conectado = waConectado();
  var promesas = _waConvsDe({ canal: 'whatsapp' }).filter(function(c){ return _waEsCobranza(c) && c.borrador && c.borrador.tipo === 'promesa'; }).length;
  var h = '<div class="sg wa-stats">'
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
  return h;
}

