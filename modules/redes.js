// Pagasi module: redes (22-oct-2026). Adam: "el módulo de WhatsApp e Instagram ponlo en uno solo
// que se llame Redes sociales... que aparezca todo: Messenger, Instagram, WhatsApp, comentarios de
// Facebook, comentarios de Instagram, igual que la foto" (la bandeja de Meta Business Suite).
// Arriba, una pestaña por canal; debajo, la misma pantalla de siempre (lista + hilo + ficha, el
// motor de modules/whatsapp.js). La cola de cobranza de hoy y las instrucciones de las asistentes
// quedan como botones arriba a la derecha. Cada canal lo ve quien tiene su permiso ('whatsapp' o
// 'instagram', los mismos de las Reglas). Messenger y los comentarios de Facebook todavía no
// llegan al servidor (Adam, 22-oct: "por ahora no" a conectarlos): sus pestañas lo dicen.
window._rsTab = window._rsTab || 'todos';
window._rsVista = window._rsVista || 'bandeja';   // bandeja · hoy · asistente
window._rsAsis = window._rsAsis || 'cobranza';     // en Asistentes: cobranza (Patricia) · ventas (Paola)
window._rsComSel = window._rsComSel || '';
window._rsComFiltro = window._rsComFiltro || 'todos';

// perm: el permiso que hace falta para ver la pestaña. pendiente: el canal aún no está conectado.
var RS_TABS = [
  { id: 'todos', nombre: 'Todos los mensajes' },
  { id: 'messenger', nombre: 'Messenger', perm: 'instagram', pendiente: true },
  { id: 'instagram', nombre: 'Instagram', perm: 'instagram' },
  { id: 'whatsapp', nombre: 'WhatsApp', perm: 'whatsapp' },
  { id: 'fbcom', nombre: 'Comentarios de Facebook', perm: 'instagram', pendiente: true },
  { id: 'igcom', nombre: 'Comentarios de Instagram', perm: 'instagram' }
];
function _rsVe(canal){ return typeof hasModuleAccess !== 'function' || hasModuleAccess(canal); }
function _rsTabsVisibles(){ return RS_TABS.filter(function(t){ return !t.perm || _rsVe(t.perm); }); }
function _rsGlobo(n){ return n > 0 ? '<span class="b">' + (n > 9 ? '9+' : n) + '</span>' : ''; }
// Lo que pide atención en cada pestaña: conversaciones con mensajes sin leer, o comentarios de hoy
function _rsCuenta(tab){
  if(tab === 'igcom') return (window._waComs || []).filter(function(c){ return _waEsHoy(c.hora); }).length;
  if(tab === 'messenger' || tab === 'fbcom') return 0;
  return _waConvsDe({ canal: tab }).filter(function(c){ return (c.noLeidos || 0) > 0; }).length;
}

var _RS_CSS = '<style id="rs-css">'
  + '.rs-tabs{display:flex;gap:4px;background:var(--surf);border:1px solid var(--rim);border-radius:14px;padding:6px;margin-bottom:12px;overflow-x:auto}'
  + '.rs-tabs button{border:0;background:transparent;border-radius:10px;padding:9px 14px;font:inherit;font-size:13px;font-weight:700;color:var(--ink2);cursor:pointer;display:flex;gap:7px;align-items:center;white-space:nowrap;flex:none}'
  + '.rs-tabs button:hover{background:var(--surf2)}.rs-tabs button.on{background:#e8f0ff;color:#065cff}'
  + '.rs-tabs .b{background:#c81e1e;color:#fff;border-radius:999px;font-size:10.5px;font-weight:800;padding:1px 7px;line-height:16px}'
  + '.rs-tabs .pend{background:var(--surf2);color:var(--ink3);border-radius:999px;font-size:10px;font-weight:800;padding:1px 7px}'
  + '.rs-pend{background:var(--surf);border:1px solid var(--rim);border-radius:var(--r20);padding:46px 24px;text-align:center}.rs-pend .ic{font-size:34px;margin-bottom:10px}.rs-pend b{display:block;font-size:16px;margin-bottom:8px}.rs-pend p{max-width:520px;margin:0 auto;color:var(--ink3);font-size:13px;line-height:1.6}'
  // La bandeja con el aspecto de Meta (Adam, 22-oct: "necesito que la visual sea como la de Meta")
  + '.rs-cab{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}.rs-cab .t{font-size:20px;font-weight:800;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rs-cab .cs{margin-top:2px}.rs-cab .wa-tabs{margin:0}'
  + '.rs-caja{--mt-azul:#0866ff;--mt-sel:rgba(8,102,255,.09);--mt-gris:var(--lift);--mt-borde:var(--rim2);background:var(--surf);border:1px solid var(--mt-borde);border-radius:10px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.05)}'
  + '.rs-caja .rs-tabs{border:0;border-bottom:1px solid var(--mt-borde);border-radius:0;margin:0;padding:8px 12px}.rs-caja .rs-tabs button{font-size:14px;font-weight:600;color:var(--ink);padding:8px 12px;border-radius:6px}.rs-caja .rs-tabs button.on{background:var(--mt-sel);color:var(--mt-azul)}.rs-caja .rs-tabs .b{background:#e41e3f}'
  + '.rs-caja .wa-split{gap:0;grid-template-columns:360px 1fr 320px}.rs-caja .wa-lista,.rs-caja .wa-hilo{border:0;border-radius:0;background:var(--surf)}.rs-caja .wa-lista{border-right:1px solid var(--mt-borde)}'
  + '.rs-caja .wa-ficha{border-left:1px solid var(--mt-borde);gap:0;overflow:auto}.rs-caja .wa-ficha .card{border:0;border-radius:0;box-shadow:none;background:transparent;border-bottom:1px solid var(--mt-borde);padding:16px 18px;margin:0}.rs-caja .wa-ficha .ct{font-size:15px;font-weight:700;margin-bottom:10px}'
  + '@media(max-width:1200px){.rs-caja .wa-split{grid-template-columns:300px 1fr}.rs-caja .wa-ficha{border-left:0;border-top:1px solid var(--mt-borde)}}@media(max-width:800px){.rs-caja .wa-split{grid-template-columns:1fr}.rs-caja .wa-lista{border-right:0;border-bottom:1px solid var(--mt-borde)}}'
  + '.rs-caja .wa-busca{border:0;padding:12px 12px 6px}.rs-caja .wa-busca input{border-radius:8px;padding-left:34px;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2365676b%27 stroke-width=%272.4%27 stroke-linecap=%27round%27%3E%3Ccircle cx=%2711%27 cy=%2711%27 r=%277%27/%3E%3Cpath d=%27m20 20-3.5-3.5%27/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:11px center}'
  + '.rs-caja .wa-filtros{border:0;padding:4px 12px 10px;gap:6px}.rs-caja .wa-filtros button{border:0;background:var(--mt-gris);border-radius:6px;padding:6px 10px;font-size:12.5px;font-weight:600;color:var(--ink)}.rs-caja .wa-filtros button.on{background:var(--mt-sel);color:var(--mt-azul)}.rs-caja .wa-filtros button i{opacity:.55}'
  + '.rs-caja .wa-item{grid-template-columns:48px minmax(0,1fr) auto;border:0;padding:10px 12px;margin:0 6px 2px;border-radius:8px;gap:12px;align-items:start}.rs-caja .wa-item:hover{background:var(--surf2)}.rs-caja .wa-item.on{background:var(--mt-sel)}'
  + '.rs-caja .wa-item .av{width:48px;height:48px;font-size:14px}.rs-caja .wa-item .n{font-size:14.5px;font-weight:600;flex-wrap:nowrap}.rs-caja .wa-item .nom{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rs-caja .wa-item .u{font-size:13px;color:var(--ink2);max-width:none;margin-top:1px}'
  + '.rs-caja .wa-item[data-nl] .n,.rs-caja .wa-item[data-nl] .u{font-weight:800;color:var(--ink)}.rs-caja .wa-item .h{font-size:12px;padding-top:2px;display:flex;flex-direction:column;align-items:flex-end;gap:8px}.rs-caja .wa-item .punto{width:10px;height:10px;border-radius:50%;background:var(--mt-azul)}'
  + '.rs-caja .wa-item .av .cn{width:19px;height:19px;right:-3px;bottom:-3px;display:grid;place-items:center;color:#fff}.rs-caja .wa-item .av .cn svg{width:10px;height:10px}'
  + '.rs-tg{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.rs-tg span{background:var(--mt-gris);border-radius:5px;padding:2px 8px;font-size:11.5px;font-weight:600;color:var(--ink)}.rs-tg span.rojo{color:#c81e1e}.rs-tg span.ambar{color:#b45309}.rs-tg span.verde{color:#0f7a3e}'
  + '.rs-caja .wa-hilo-top{padding:12px 18px;border-bottom:1px solid var(--mt-borde)}.rs-caja .wa-hilo-top .quien{display:flex;gap:12px;align-items:center}.rs-caja .wa-hilo-top .quien b{font-size:16px}'
  + '.rs-caja .av{border-radius:50%;background:var(--lift);color:var(--ink2);display:grid;place-items:center;font-weight:800;flex:none}.rs-caja .wa-hilo-top .av{width:44px;height:44px;font-size:13px}.rs-caja .av.ig,.rs-caja .avm.ig{background:linear-gradient(135deg,#f58529,#dd2a7b,#8134af);color:#fff}'
  + '.rs-ib{height:38px;min-width:38px;border:1px solid var(--rim2);background:var(--surf);border-radius:6px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}.rs-ib:hover{background:var(--surf2)}.rs-ib svg{width:17px;height:17px}.rs-ib.p{background:#0866ff;border-color:#0866ff;color:#fff}'
  + '.rs-caja .wa-burbujas{background:var(--surf);padding:16px 20px;gap:3px}.rs-caja .wa-sep{align-self:center;font-size:12px;color:var(--ink3);margin:14px 0 8px}'
  + '.rs-caja .wa-m{display:flex;gap:8px;align-items:flex-end;max-width:72%;margin-bottom:4px}.rs-caja .wa-m.cliente{align-self:flex-start}.rs-caja .wa-m.asistente,.rs-caja .wa-m.equipo{align-self:flex-end}'
  + '.rs-caja .avm{width:28px;height:28px;border-radius:50%;background:var(--lift);color:var(--ink2);display:grid;place-items:center;font-size:10px;font-weight:800;flex:none}'
  + '.rs-caja .wa-b{max-width:100%;box-shadow:none;border-radius:18px;padding:8px 13px;font-size:14px}.rs-caja .wa-b.cliente{background:var(--mt-gris);color:var(--ink);border-bottom-left-radius:18px}.rs-caja .wa-b.asistente,.rs-caja .wa-b.equipo{background:var(--mt-azul);color:#fff;border-bottom-right-radius:18px}'
  + '.rs-caja .wa-b .meta{color:inherit;opacity:.72}.rs-caja .wa-b .plantilla{color:inherit;opacity:.85}.rs-caja .wa-b .err{color:#ffd6d6;font-weight:700}.rs-caja .wa-b.cliente .err{color:var(--red)}'
  + '.rs-caja .wa-escribir{flex-direction:column;border:1px solid var(--mt-borde);border-radius:10px;margin:10px 14px 14px;padding:8px 10px;gap:6px}.rs-caja .wa-escribir textarea{border:0;box-shadow:none;background:transparent;min-height:42px;resize:none;padding:4px;outline:none}'
  + '.wa-esc-pie{display:flex;justify-content:space-between;align-items:center;gap:8px}.wa-esc-pie .cs{font-size:11.5px}.rs-caja .wa-cerrada{margin:10px 14px 14px;border:1px solid #f3d9a4;border-radius:10px}.rs-caja .wa-demo-cliente{margin:0 14px;border-radius:10px 10px 0 0}'
  + '.rs-perfil{display:flex;gap:12px;align-items:center}.rs-perfil .av{width:52px;height:52px;font-size:15px}.rs-perfil b{font-size:16px;display:block}.rs-perfil a,.rs-perfil .lnk{color:#0866ff;font-size:13px;font-weight:600;background:none;border:0;padding:0;cursor:pointer;text-decoration:none}'
  + '.rs-caja .wa-kv{border:0;padding:4px 0;font-size:13px}.rs-caja .wa-kv span:first-child{color:var(--ink2)}.rs-caja .wa-kv span:last-child{font-weight:600}.rs-caja .rs-pend{border:0;border-radius:0}'
  + '.rs-caja .wa-hilo-top{flex-wrap:nowrap}.rs-caja .wa-hilo-top .quien{min-width:0;flex:1}.rs-caja .wa-hilo-top .quien>div:last-child{min-width:0}.rs-caja .wa-hilo-top .quien small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rs-caja .wa-hilo-top .acc{flex:none;flex-wrap:nowrap}'
  + '.rs-caja .wa-filtros{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.rs-caja .wa-filtros::-webkit-scrollbar{display:none}.rs-caja .wa-filtros button{flex:none}'
  + '.rs-com .estado{margin-top:4px}.rs-asis{display:flex;gap:0;margin:0 0 14px;border:1px solid var(--rim);border-radius:14px;overflow:hidden;width:max-content;max-width:100%}.rs-asis button{border:0;background:var(--surf);font:inherit;font-size:13px;font-weight:800;color:var(--ink2);padding:10px 18px;cursor:pointer}.rs-asis button+button{border-left:1px solid var(--rim)}.rs-asis button.on{background:var(--p1);color:#fff}'
  + '</style>';

function rsTab(t){ window._rsTab = t; window._rsVista = 'bandeja'; window._waSel = null; nav('redes'); }
function rsVista(v){ window._rsVista = v; nav('redes'); }
function rsAsis(a){ window._rsAsis = a; nav('redes'); }

// Globos de las pestañas y contadores de arriba, en el sitio (al llegar mensajes o comentarios)
function _rsPintarContadores(){
  _rsTabsVisibles().forEach(function(t){ var e = document.getElementById('rs-b-' + t.id); if(e) e.innerHTML = t.pendiente ? '' : _rsGlobo(_rsCuenta(t.id)); });
}

// ── Messenger y comentarios de Facebook: todavía no llegan ──
function _rsPanelPendiente(tab){
  var ms = tab === 'messenger';
  return '<div class="rs-pend"><div class="ic">' + (ms ? '💬' : '📝') + '</div><b>' + (ms ? 'Messenger' : 'Los comentarios de Facebook') + ' todavía no ' + (ms ? 'está conectado' : 'están conectados') + '</b>'
    + '<p>' + (ms
      ? 'Los mensajes que la gente le escribe a la página de Facebook de Pagasi todavía no le llegan al sistema. Cuando se conecte, aparecerán aquí y Paola los contestará igual que en Instagram.'
      : 'Los comentarios en las publicaciones y anuncios de Facebook todavía no le llegan al sistema. Para que Paola también pueda contestarlos, Meta pide un permiso más que hay que solicitarles.')
    + '</p></div>';
}

// ── Comentarios de Instagram ──
var RS_COM_FILTROS = [
  { id: 'todos', nombre: 'Todos', f: function(){ return true; } },
  { id: 'respondido', nombre: 'Paola respondió', f: function(c){ return c.estado === 'respondido'; } },
  { id: 'sin', nombre: 'Sin respuesta', f: function(c){ return c.estado === 'sin-respuesta' || c.estado === 'nuevo'; } },
  { id: 'reclamos', nombre: 'Reclamos', f: function(c){ return !!c.reclamo; } },
  { id: 'fallo', nombre: 'No se pudo enviar', f: function(c){ return c.estado === 'fallo'; } },
  { id: 'hoy', nombre: 'Hoy', f: function(c){ return _waEsHoy(c.hora); } }
];
function _rsComEstado(c){
  return c.estado === 'respondido' ? '<span class="wa-pill verde">Paola respondió</span>'
    : c.estado === 'fallo' ? '<span class="wa-pill rojo">No se pudo enviar</span>'
    : c.estado === 'nuevo' ? '<span class="wa-pill azul">Recién llegado</span>'
    : '<span class="wa-pill gris">Sin respuesta</span>';
}
function _rsComTag(c){ return c.estado === 'respondido' ? '<span class="verde">Paola respondió</span>' : c.estado === 'fallo' ? '<span class="rojo">No se pudo enviar</span>' : c.estado === 'nuevo' ? '<span>Recién llegado</span>' : '<span>Sin respuesta</span>'; }
function _rsComDonde(c){ return c.tipoMedia === 'AD' ? 'un anuncio' : c.tipoMedia === 'REELS' ? 'un reel' : c.tipoMedia === 'STORY' ? 'una historia' : 'una publicación'; }
function rsComFiltro(f){ window._rsComFiltro = f; _rsPintarComentarios(); }
function rsComAbrir(id){ window._rsComSel = id; _rsPintarComentarios(); }
// La conversación privada que abrió Paola a partir del comentario (si la hay)
function _rsComConv(c){
  var igsid = c.privado && c.privado.igsid;
  return (window._waConvs || []).find(function(x){ return x.canal === 'instagram' && (x.origenComentario === c.id || (igsid && x.id === 'ig:' + igsid)); });
}
function _rsPanelComentarios(){
  setTimeout(_rsPintarComentarios, 0);
  return '<div class="wa-split rs-com">'
    + '<div class="wa-lista"><div class="wa-busca"><input class="fi" id="rs-com-q" placeholder="Buscar por usuario o texto" oninput="_rsPintarComentarios()" style="width:100%"></div><div class="wa-filtros" id="rs-com-filtros"></div><div class="items" id="rs-com-items"></div></div>'
    + '<div class="wa-hilo" id="rs-com-hilo"></div>'
    + '<div class="wa-ficha" id="rs-com-ficha"></div></div>';
}
function _rsPintarComentarios(){
  var cont = document.getElementById('rs-com-items'); if(!cont) return;
  if(typeof _waAjustarAltura === 'function') _waAjustarAltura();
  var todos = window._waComs || [], q = String((document.getElementById('rs-com-q') || {}).value || '').toLowerCase();
  var filtro = RS_COM_FILTROS.find(function(f){ return f.id === window._rsComFiltro; }) || RS_COM_FILTROS[0];
  var chips = document.getElementById('rs-com-filtros');
  if(chips) chips.innerHTML = RS_COM_FILTROS.map(function(f){ var n = todos.filter(f.f).length; return '<button class="' + (f.id === filtro.id ? 'on' : '') + '" onclick="rsComFiltro(\'' + f.id + '\')"' + (!n && f.id !== 'todos' && f.id !== filtro.id ? ' disabled' : '') + '>' + f.nombre + '<i>' + n + '</i></button>'; }).join('');
  var lista = todos.filter(filtro.f).filter(function(c){ return !q || (String(c.usuario || '') + ' ' + String(c.texto || '')).toLowerCase().indexOf(q) > -1; });
  var sel = lista.find(function(c){ return c.id === window._rsComSel; }) || lista[0] || null;
  window._rsComSel = sel ? sel.id : '';
  cont.innerHTML = window._waComsError ? '<div class="empty" style="padding:30px 16px">No se pudieron leer los comentarios: ' + _waEsc(window._waComsError) + '</div>'
    : lista.length ? lista.map(function(c){
      return '<div class="wa-item' + (sel && c.id === sel.id ? ' on' : '') + '" onclick="rsComAbrir(\'' + _waEsc(c.id) + '\')">'
        + '<div class="av ig">' + _waEsc(String(c.usuario || '?').slice(0, 2).toUpperCase()) + '<span class="cn ig">' + _waIcono('ig') + '</span></div>'
        + '<div class="cuerpo"><div class="n"><span class="nom">@' + _waEsc(c.usuario || 'alguien') + '</span></div>'
        + '<div class="u">' + _waEsc(c.texto || '') + '</div><div class="rs-tg">' + _rsComTag(c) + (c.reclamo ? '<span class="rojo">Reclamo</span>' : '') + '<span>' + ({ AD: 'Anuncio', REELS: 'Reel', STORY: 'Historia' }[c.tipoMedia] || 'Publicación') + '</span></div></div>'
        + '<div class="h">' + _waHoraLista(c.hora) + '</div></div>';
    }).join('') : '<div class="empty" style="padding:30px 16px">' + (todos.length ? 'Ningún comentario con ese filtro.' : 'Todavía no hay comentarios.') + '</div>';
  var hilo = document.getElementById('rs-com-hilo'), ficha = document.getElementById('rs-com-ficha');
  if(!sel){ if(hilo) hilo.innerHTML = '<div class="empty" style="padding:60px 20px">Elige un comentario.</div>'; if(ficha) ficha.innerHTML = ''; return; }
  var conv = _rsComConv(sel);
  var ini = String(sel.usuario || '?').slice(0, 2).toUpperCase();
  if(hilo) hilo.innerHTML = '<div class="wa-hilo-top"><div class="quien"><div class="av ig">' + _waEsc(ini) + '</div><div><b>@' + _waEsc(sel.usuario || 'alguien') + '</b><small>Comentó en ' + _rsComDonde(sel) + ' de Instagram · ' + _waHora(sel.hora) + '</small></div></div>'
      + '<div class="acc">' + (conv ? '<button class="rs-ib p" onclick="rsTab(\'instagram\');setTimeout(function(){ waAbrir(\'' + _waEsc(conv.id) + '\'); },0)">Ver la conversación privada</button>' : '') + '</div></div>'
    + '<div class="wa-burbujas"><div class="wa-sep">' + _waSep(sel.hora) + '</div>'
      + '<div class="wa-m cliente"><div class="avm ig">' + _waEsc(ini) + '</div><div class="wa-b cliente">' + _waEsc(sel.texto || '(sin texto)') + '<div class="meta"><span class="quien">@' + _waEsc(sel.usuario || '') + '</span><span>' + _waHora(sel.hora) + '</span></div></div></div>'
      + (sel.respuesta ? '<div class="wa-m asistente"><div class="wa-b asistente"><div class="plantilla">Respuesta pública</div>' + _waEsc(sel.respuesta) + '<div class="meta"><span class="quien">Paola</span><span>' + _waHora(sel.respondidoEn || sel.hora) + '</span>' + (sel.estado === 'fallo' ? '<span class="err">✕ no se publicó</span>' : '') + '</div></div></div>' : '')
      + (sel.privado && sel.privado.enviado ? '<div class="wa-m asistente"><div class="wa-b asistente"><div class="plantilla">Mensaje privado</div>Paola también le escribió por mensaje directo.' + (conv ? '' : ' (la conversación aparece en la pestaña Instagram)') + '<div class="meta"><span class="quien">Paola</span></div></div></div>' : '')
    + '</div>'
    + '<div class="wa-cerrada" style="background:var(--surf2);color:var(--ink3);border-top-color:var(--rim)">Paola contesta los comentarios sola. Para contestar tú, hazlo desde Instagram.</div>';
  if(ficha) ficha.innerHTML = '<div class="card rs-perfil"><div class="av ig">' + _waEsc(ini) + '</div><div><b>@' + _waEsc(sel.usuario || 'alguien') + '</b>' + (sel.usuario ? '<a href="https://www.instagram.com/' + encodeURIComponent(sel.usuario) + '/" target="_blank" rel="noopener">Ver perfil</a>' : '') + '</div></div>'
    + '<div class="card"><div class="ct">Comentario</div>'
      + '<div class="wa-kv"><span>Usuario</span><span>@' + _waEsc(sel.usuario || '—') + '</span></div>'
      + '<div class="wa-kv"><span>Dónde</span><span>' + ({ AD: 'Anuncio', REELS: 'Reel', STORY: 'Historia' }[sel.tipoMedia] || 'Publicación') + '</span></div>'
      + '<div class="wa-kv"><span>Fecha</span><span>' + _waHora(sel.hora) + '</span></div>'
      + '<div class="wa-kv"><span>Estado</span><span>' + _rsComEstado(sel) + '</span></div>'
      + (sel.motivo ? '<div class="wa-kv"><span>Por qué no respondió</span><span>' + _waEsc(sel.motivo) + '</span></div>' : '')
      + (sel.error ? '<div class="wa-kv"><span>Error</span><span>' + _waEsc(sel.error) + '</span></div>' : '')
      + '<div class="wa-kv"><span>Mensaje privado</span><span>' + (sel.privado && sel.privado.enviado ? 'Sí' : 'No') + '</span></div>'
      + '<div class="wa-kv"><span>Reclamo</span><span>' + (sel.reclamo ? '<span class="wa-pill rojo">Sí</span>' : 'No') + '</span></div>'
      + (sel.resumen ? '<div class="cs" style="margin-top:10px;line-height:1.5"><b>Resumen:</b> ' + _waEsc(sel.resumen) + '</div>' : '')
    + '</div>';
}
function _rsRefrescarComentarios(){ _rsPintarContadores(); _rsPintarComentarios(); }

PG.redes = function(){
  if(!document.getElementById('wa-css')) document.head.insertAdjacentHTML('beforeend', _WA_CSS);
  if(!document.getElementById('rs-css')) document.head.insertAdjacentHTML('beforeend', _RS_CSS);
  if(!window._waCfg){ waCargarCfg(function(){ if(S.page === 'redes') nav('redes'); }); }
  var veWa = _rsVe('whatsapp'), veIg = _rsVe('instagram'), cfg = window._waCfg || {};
  var tabs = _rsTabsVisibles();
  if(!tabs.some(function(t){ return t.id === window._rsTab; })) window._rsTab = 'todos';
  var cola = veWa ? waColaHoy() : null;
  // Cada canal se abre solo si este usuario lo ve (las Reglas tampoco dejan leer el otro)
  if(veWa){ if(waConectado()) waAbrirConversaciones('whatsapp'); else waDemoConversaciones(cola); }
  if(veIg){ if(waConectadoCanal('instagram')) waAbrirConversaciones('instagram'); else waDemoInstagram(); waAbrirComentarios(); }
  if(window._rsVista === 'hoy' && !veWa) window._rsVista = 'bandeja';
  var vista = window._rsVista, tab = window._rsTab, ctx = _waCtxActual();
  var waOk = waConectado(), igOk = waConectadoCanal('instagram');

  var h = '<div class="page wa-page rs-page">'
    + '<div class="rs-cab"><div><div class="t">Redes sociales '
      + (veWa ? (waOk ? '<span class="wa-pill verde">WhatsApp · ' + _waEsc(cfg.telefono || 'conectado') + '</span>' : '<span class="wa-pill ambar">WhatsApp en demostración</span>') : '')
      + (veIg ? (igOk ? '<span class="wa-pill ig">Instagram · @' + _waEsc(String(cfg.instagram).replace(/^@/, '')) + '</span>' : '<span class="wa-pill ambar">Instagram en demostración</span>') : '')
    + '</div><div class="cs">' + (veWa ? 'Patricia atiende la cobranza por WhatsApp. ' : '') + 'Paola atiende las ventas' + (veIg && veWa ? ' por WhatsApp e Instagram' : veIg ? ' por Instagram' : ' por WhatsApp') + '.</div></div>'
      + '<div class="wa-tabs"><button class="' + (vista === 'bandeja' ? 'on' : '') + '" onclick="rsVista(\'bandeja\')">Bandeja</button>'
      + (veWa ? '<button class="' + (vista === 'hoy' ? 'on' : '') + '" onclick="rsVista(\'hoy\')">Cobranza de hoy · ' + cola.total + '</button>' : '')
      + '<button class="' + (vista === 'asistente' ? 'on' : '') + '" onclick="rsVista(\'asistente\')">Asistentes</button></div>'
    + '</div>'
    + ((veWa && !waOk) || (veIg && !igOk) ? '<div class="wa-aviso"><span style="font-size:18px">⚠️</span><div><b>' + (veWa && !waOk && veIg && !igOk ? 'WhatsApp e Instagram todavía no están conectados' : veWa && !waOk ? 'WhatsApp todavía no está conectado' : 'Instagram todavía no está conectado') + ' en esta compañía.</b> Lo que ves de ' + (veWa && !waOk && veIg && !igOk ? 'esos canales' : 'ese canal') + ' es de muestra, en memoria, para ver cómo atienden las asistentes.</div></div>' : '');

  if(vista === 'hoy'){
    h += _waPanelHoy(cola);
  } else if(vista === 'asistente'){
    var area = window._rsAsis;
    if(area === 'cobranza' && !veWa) area = 'ventas';
    h += '<div class="rs-asis">' + (veWa ? '<button class="' + (area === 'cobranza' ? 'on' : '') + '" onclick="rsAsis(\'cobranza\')">Patricia · cobranza</button>' : '') + '<button class="' + (area === 'ventas' ? 'on' : '') + '" onclick="rsAsis(\'ventas\')">Paola · ventas</button></div>'
      + _waPanelAsistente({ modulo: 'redes', canal: area === 'cobranza' ? 'whatsapp' : (veIg ? 'instagram' : 'whatsapp'), area: area });
  } else {
    h += '<div class="rs-caja"><div class="rs-tabs">' + tabs.map(function(t){
      return '<button class="' + (t.id === tab ? 'on' : '') + '" onclick="rsTab(\'' + t.id + '\')">' + t.nombre
        + '<span id="rs-b-' + t.id + '">' + (t.pendiente ? '' : _rsGlobo(_rsCuenta(t.id))) + '</span>' + (t.pendiente ? '<span class="pend">sin conectar</span>' : '') + '</button>';
    }).join('') + '</div>';
    // En pantallas angostas la fila de pestañas se desliza: que la abierta quede a la vista
    setTimeout(function(){ var b = document.querySelector('.rs-tabs button.on'), f = b && b.parentNode; if(f && b.offsetLeft + b.offsetWidth > f.clientWidth) f.scrollLeft = b.offsetLeft - 12; }, 0);
    if(tab === 'messenger' || tab === 'fbcom') h += _rsPanelPendiente(tab);
    else if(tab === 'igcom') h += _rsPanelComentarios();
    else h += _waPanelConversaciones(ctx);
    h += '</div>';
  }
  h += '</div>';
  return h;
};
