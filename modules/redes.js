// Pagasi module: redes (22-oct-2026). Adam: "el módulo de WhatsApp e Instagram ponlo en uno solo
// que se llame Redes sociales... que aparezca todo: Messenger, Instagram, WhatsApp, comentarios de
// Facebook, comentarios de Instagram, igual que la foto" (la bandeja de Meta Business Suite).
// Arriba, una pestaña por canal; debajo, la misma pantalla de siempre (lista + hilo + ficha, el
// motor de modules/whatsapp.js). La cola de cobranza de hoy y las instrucciones de las asistentes
// quedan como botones arriba a la derecha (Paola y Patricia abren su ventana, como Sandra de DARKSIDE). Cada canal lo ve quien tiene su permiso ('whatsapp' o
// 'instagram', los mismos de las Reglas). Messenger y los comentarios de Facebook todavía no
// llegan al servidor (Adam, 22-oct: "por ahora no" a conectarlos): sus pestañas lo dicen.
window._rsTab = window._rsTab || 'todos';
window._rsVista = window._rsVista || 'bandeja';   // bandeja · hoy
window._rsComSel = window._rsComSel || '';
window._rsComFiltro = window._rsComFiltro || 'todos';

// perm: el permiso que hace falta para ver la pestaña. pendiente: el canal aún no está conectado.
// El orden lo puso Adam (22-oct-2026): todos, Instagram, WhatsApp, Messenger y al final los comentarios
var RS_TABS = [
  { id: 'todos', nombre: 'Todos los mensajes' },
  { id: 'instagram', nombre: 'Instagram', perm: 'instagram' },
  { id: 'whatsapp', nombre: 'WhatsApp', perm: 'whatsapp' },
  { id: 'messenger', nombre: 'Messenger', perm: 'instagram', pendiente: true },
  { id: 'igcom', nombre: 'Comentarios de Instagram', perm: 'instagram' },
  { id: 'fbcom', nombre: 'Comentarios de Facebook', perm: 'instagram', pendiente: true }
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
  + '.rs-caja .wa-filtros{flex-wrap:wrap}.rs-caja .wa-filtros button{flex:none}'
  + '.rs-caja .wa-mas{appearance:none;-webkit-appearance:none;border:0;background:var(--mt-gris) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2365676b%27 stroke-width=%273%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E") no-repeat right 9px center;border-radius:6px;padding:6px 28px 6px 10px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer;max-width:100%}.rs-caja .wa-mas.on{background-color:var(--mt-sel);color:var(--mt-azul)}'
  // En pantalla grande la bandeja cabe entera: sin el relleno de abajo de #cnt no queda nada para bajar
  + '@media(min-width:1201px){#cnt:has(.rs-page.rs-lleno){padding-bottom:0}}.rs-page.rs-lleno{margin-bottom:0}'
  // La ventana de cada asistente (como "Sandra" de DARKSIDE)
  + '.rs-asis-btn{display:inline-flex;align-items:center;gap:7px}.rs-asis-btn svg{width:16px;height:16px}'
  + '.rs-v h4{font-size:14px;font-weight:800;margin:18px 0 3px}.rs-v h4:first-child{margin-top:0}.rs-v .sv{font-size:12px;color:var(--ink3);margin-bottom:10px;line-height:1.5}'
  + '.rs-sws{display:flex;flex-direction:column;gap:4px}.rs-swf{display:flex;align-items:center;gap:10px;padding:7px 2px;font-size:13.5px;font-weight:600}.rs-swf .ic{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#fff;flex:none}.rs-swf .ic svg{width:12px;height:12px}.rs-swf .ic.wa{background:#25D366}.rs-swf .ic.ig{background:linear-gradient(135deg,#f58529,#dd2a7b,#8134af)}.rs-swf .ic.ms{background:linear-gradient(135deg,#00b2ff,#a334fa)}.rs-swf .ic.fb{background:#0866ff}.rs-swf .ic.rl{background:var(--ink2)}.rs-swf .t{flex:1}.rs-swf small{display:block;font-weight:500;color:var(--ink3);font-size:11.5px}'
  + '.rs-sw{appearance:none;-webkit-appearance:none;width:46px;height:26px;border-radius:999px;background:var(--rim2);position:relative;cursor:pointer;transition:background .15s;flex:none;margin:0}.rs-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .15s}.rs-sw:checked{background:#2f7a4f}.rs-sw:checked::after{left:23px}.rs-sw:disabled{opacity:.45;cursor:default}'
  + '.rs-qs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}@media(max-width:560px){.rs-qs{grid-template-columns:1fr}}.rs-q{border:1px solid var(--rim2);border-radius:10px;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;gap:3px}.rs-q input{display:none}.rs-q b{font-size:13.5px}.rs-q span{font-size:12.5px}.rs-q small{font-size:11px;color:var(--ink3);line-height:1.4}.rs-q.on{border:2px solid var(--ink);padding:9px 11px}'
  + '.rs-v textarea{width:100%;min-height:110px}.rs-cx{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:12.5px}@media(max-width:560px){.rs-cx{grid-template-columns:1fr}}.rs-cx span{display:flex;gap:6px;align-items:center;color:#c81e1e}.rs-cx span.ok{color:#0f7a3e}.rs-cx svg{width:14px;height:14px;flex:none}'
  + '.rs-v .aviso{font-size:12px;background:#fff4e0;color:#7a4d00;border:1px solid #f3d9a4;border-radius:8px;padding:8px 10px;margin-top:6px;line-height:1.5}'
  // Métricas: colores de los canales validados (dataviz, 22-oct): Instagram #c13584 / #d4479a (oscuro), WhatsApp #1baf7a
  + '.rs-met{--s-ig:#c13584;--s-wa:#1baf7a}[data-theme="dark"] .rs-met{--s-ig:#d4479a}'
  + '.rs-met .per{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}.rs-met .per button{border:0;background:var(--lift);border-radius:6px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer}.rs-met .per button.on{background:rgba(8,102,255,.09);color:#0866ff}'
  + '.rs-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px}.rs-kpi{background:var(--surf);border:1px solid var(--rim2);border-radius:10px;padding:14px 16px}.rs-kpi .l{font-size:12px;color:var(--ink2);font-weight:600}.rs-kpi .v{font-size:28px;font-weight:800;letter-spacing:-.5px;margin:4px 0 2px;font-variant-numeric:tabular-nums}.rs-kpi .d{font-size:12px;color:var(--ink3);line-height:1.45}'
  + '.rs-met .bloque{background:var(--surf);border:1px solid var(--rim2);border-radius:10px;padding:16px 18px;margin-bottom:14px}.rs-met .bloque h3{font-size:15px;font-weight:800;margin:0 0 2px}.rs-met .bloque .sv{font-size:12px;color:var(--ink3);margin-bottom:10px}'
  + '.rs-ley{display:flex;gap:14px;font-size:12px;color:var(--ink2);margin-bottom:6px}.rs-ley i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}'
  + '.rs-graf{position:relative}.rs-graf svg{width:100%;height:auto;display:block}.rs-graf .tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--surf);font-size:12px;border-radius:6px;padding:6px 9px;white-space:nowrap;transform:translate(-50%,-100%);display:none;line-height:1.5;z-index:2}'
  + '.rs-met table{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}.rs-met td,.rs-met th{padding:5px 8px;border-bottom:1px solid var(--rim2);text-align:right}.rs-met td:first-child,.rs-met th:first-child{text-align:left}.rs-met details summary{cursor:pointer;font-size:12.5px;color:#0866ff;font-weight:600;margin-top:8px}'
  + '.rs-posts{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.rs-post{border:1px solid var(--rim2);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;background:var(--surf)}.rs-post .img{aspect-ratio:1/1;background:var(--lift) center/cover no-repeat}.rs-post .c{padding:9px 10px;display:flex;flex-direction:column;gap:4px;flex:1}.rs-post .n{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}.rs-post .t{font-size:11.5px;color:var(--ink2);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.rs-post .f{font-size:11px;color:var(--ink3)}.rs-post a{font-size:12px;color:#0866ff;font-weight:600;text-decoration:none;margin-top:auto}'
  + '.rs-falta li{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:6px 0;line-height:1.45}.rs-falta svg{width:15px;height:15px;color:#c81e1e;flex:none;margin-top:2px}.rs-falta ul{list-style:none;padding:0;margin:6px 0 0}'
  + '.rs-com .estado{margin-top:4px}'
  + '</style>';

function rsTab(t){ window._rsTab = t; window._rsVista = 'bandeja'; window._waSel = null; nav('redes'); }
function rsVista(v){ window._rsVista = v; nav('redes'); }

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
  if(chips) chips.innerHTML = _waFiltrosHtml(RS_COM_FILTROS, filtro.id, function(f){ return todos.filter(f.f).length; }, 'rsComFiltro', ['todos', 'sin']);
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

// ── La ventana de cada asistente (Adam, 22-oct-2026: "ponme así un botón como el de Darkside") ──
// Como "Sandra" de DARKSIDE: dónde responde, la calidad de Claude (y lo que cuesta), lo que debe
// saber y cómo está conectada. Lo lee el servidor de config/asistente de la 26 (pagasi.io):
// responde {canal: false} la apaga en ese canal, calidad {ventas|cobranza} escoge el modelo.
// Costos: con lo que contestan hoy (21-oct: ~300 respuestas de Paola al día, ~30 de Patricia), su
// manual guardado en caché (~18 mil tokens), lo que escribe cada modelo (prueba real del 22-oct:
// 900 a 1.500 tokens por respuesta) y los precios de Claude por millón de tokens.
var RS_ASIS = {
  ventas: { nombre: 'Paola', area: 'ventas', volumen: 'unos 300 mensajes al día, lo que contesta hoy',
    canales: [['instagram', 'Instagram (mensajes)', 'ig'], ['whatsappVentas', 'WhatsApp (ventas)', 'wa'], ['comentariosIg', 'Comentarios de Instagram', 'ig'], ['messenger', 'Messenger', 'ms', true], ['comentariosFb', 'Comentarios de Facebook', 'fb', true]],
    costos: { economica: '≈ $5–15 al mes', normal: '≈ $150–300 al mes', maxima: '≈ $300–550 al mes' } },
  cobranza: { nombre: 'Patricia', area: 'cobranza', volumen: 'unos 30 mensajes al día',
    canales: [['whatsappCobranza', 'WhatsApp (respuestas a los clientes)', 'wa']],
    costos: { economica: '≈ menos de $1 al mes', normal: '≈ $10–20 al mes', maxima: '≈ $20–40 al mes' } }
};
var RS_CALIDADES = [
  { id: 'economica', nombre: 'Económica', modelo: 'Claude Haiku', nota: 'Respuestas más simples' },
  { id: 'normal', nombre: 'Normal', modelo: 'Claude Sonnet', nota: 'La recomendada · la de hoy' },
  { id: 'maxima', nombre: 'Máxima', modelo: 'Claude Opus', nota: 'La más lista' }
];
var _RS_CHISPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
// Messenger (el rayo) y Facebook (la f), para los interruptores
var _RS_ICONOS = {
  ms: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m6.5 14.5 4-4.3 2.2 2.3 4.8-2.6-4 4.3-2.2-2.3z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21z"/></svg>'
};
var _RS_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
var _RS_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
// Las conversaciones de esa asistente en las que contestó hoy (y la última vez que contestó)
function _rsUsoHoy(area){
  var suyas = (window._waConvs || []).filter(function(c){ return area === 'cobranza' ? _waEsCobranza(c) : !_waEsCobranza(c); });
  var hoy = suyas.filter(function(c){ return c.ultimoAutor === 'asistente' && _waEsHoy(c.ultimoMensajeHora); }).length;
  var ult = suyas.filter(function(c){ return c.ultimoAutor === 'asistente'; }).map(function(c){ return String(c.ultimoMensajeHora || ''); }).sort().pop() || '';
  return { hoy: hoy, ultima: ult };
}
function rsAsistente(area){
  var A = RS_ASIS[area] || RS_ASIS.ventas, cfg = window._waCfg || {}, resp = cfg.responde || {}, calidad = (cfg.calidad || {})[A.area] || 'normal';
  var puede = typeof isAdminUser === 'function' && isAdminUser(), aqui = waConectado() || waConectadoCanal('instagram');
  var editable = puede && aqui && !!(typeof db !== 'undefined' && db), uso = _rsUsoHoy(A.area);
  var claudeOk = !!uso.ultima && (Date.now() - new Date(uso.ultima).getTime()) < 48 * 3600 * 1000;
  // Los recordatorios tienen su propio campo (config/asistente.recordatorios): el servidor los manda salvo que diga false
  var fila = function(id, txt, ic, pend, sub){ var on = pend ? false : id === 'recordatorios' ? cfg.recordatorios !== false : resp[id] !== false;
    return '<label class="rs-swf"><span class="ic ' + ic + '">' + (_RS_ICONOS[ic] || _waIcono(ic === 'wa' ? 'wa' : ic === 'rl' ? 'bot' : 'ig')) + '</span><span class="t">' + txt + (pend ? ' <span class="wa-pill gris">sin conectar</span>' : '') + (sub ? '<small>' + sub + '</small>' : '') + '</span>'
      + '<input type="checkbox" role="switch" class="rs-sw" data-canal="' + id + '"' + (on ? ' checked' : '') + (pend || !editable ? ' disabled' : '') + '></label>'; };
  var h = '<div class="rs-v">'
    + (!aqui ? '<div class="aviso" style="margin:0 0 12px">En esta compañía ' + A.nombre + ' no está conectada a Meta: lo que ves es de muestra. Las asistentes se configuran en <b>pagasi.io</b>.</div>' : '')
    + '<h4>Dónde responde ' + A.nombre + '</h4><div class="sv">Apagada en un canal, los mensajes igual llegan aquí; los responde el equipo.</div><div class="rs-sws">'
    + A.canales.map(function(c){ return fila(c[0], c[1], c[2], c[3]); }).join('')
    + (A.area === 'cobranza' ? fila('recordatorios', 'Recordatorios de cuotas', 'rl', false, 'Todos los días a las 8:30 am, por plantilla de WhatsApp') : '')
    + '</div>' + (A.area === 'cobranza' ? '<div class="aviso">Con los recordatorios encendidos, Patricia les escribe a los clientes de verdad todos los días a las 8:30 am: 2 días antes de vencer, el día del vencimiento y cuando se atrasan.</div>' : '')
    + '<h4>Calidad de ' + A.nombre + '</h4><div class="sv">Lo que paga Pagasi en Claude. Aproximado, con ' + A.volumen + '.</div><div class="rs-qs" role="radiogroup">'
    + RS_CALIDADES.map(function(q){ return '<label class="rs-q' + (q.id === calidad ? ' on' : '') + '"><input type="radio" name="rs-calidad" value="' + q.id + '"' + (q.id === calidad ? ' checked' : '') + (editable ? '' : ' disabled') + ' onchange="document.querySelectorAll(\'.rs-q\').forEach(function(e){ e.classList.toggle(\'on\', e.contains(this)); }, this)"><b>' + q.nombre + '</b><span>' + A.costos[q.id] + '</span><small>' + q.modelo + ' · ' + q.nota + '</small></label>'; }).join('')
    + '</div>'
    + '<h4>Lo que ' + A.nombre + ' debe saber</h4><div class="sv">' + (A.area === 'ventas' ? 'Promociones, horarios, qué decir de una sede, a quién pasar los interesados. Ya conoce precios, inicial, cuotas y cómo se solicita. Lo que escribas aquí manda sobre todo lo demás.' : 'Lo que debe tener en cuenta esta semana. Ejemplos: "esta semana no se reciben pagos en efectivo", "si preguntan por refinanciar, pásalos a Samantha". Lo que escribas aquí manda sobre todo lo demás.') + '</div>'
    + '<textarea class="fta" id="rs-instr"' + (editable ? '' : ' disabled') + ' placeholder="' + (A.area === 'ventas' ? 'Ej.:\nEsta semana: casco gratis con la Veloz\nSábados la sede de Valencia abre hasta la 1 pm' : 'Ej.:\nEsta semana no se reciben pagos en efectivo') + '">' + _waEsc(A.area === 'ventas' ? (cfg.instruccionesVentas || '') : (cfg.instrucciones || '')) + '</textarea>'
    + (A.area === 'cobranza' ? '<h4>Cómo pagar</h4><div class="sv">Lo único que Patricia le da al cliente cuando pregunta dónde pagar: Pago Móvil, cuenta, RIF, Zelle. Si está vacío, lo manda con el equipo.</div><textarea class="fta" id="rs-pago" style="min-height:80px"' + (editable ? '' : ' disabled') + '>' + _waEsc(cfg.datosPago || '') + '</textarea>' : '')
    + (cfg.actualizadoEn ? '<div class="sv" style="margin-top:6px">Última vez: ' + _waEsc(cfg.actualizadoPor || 'alguien') + ', ' + _waHora(cfg.actualizadoEn) + '</div>' : '')
    + '<h4>Conexión</h4><div class="rs-cx">'
    + [['Meta (la app de Pagasi)', aqui], [A.area === 'ventas' ? 'Instagram' + (cfg.instagram ? ' @' + _waEsc(String(cfg.instagram).replace(/^@/, '')) : '') : 'WhatsApp ' + _waEsc(cfg.telefono || ''), A.area === 'ventas' ? !!cfg.instagram : waConectado()], [A.area === 'ventas' ? 'WhatsApp ' + _waEsc(cfg.telefono || '') : 'Plantillas de recordatorio', A.area === 'ventas' ? waConectado() : !!(cfg.plantillas && Object.keys(cfg.plantillas).length)], [A.area === 'ventas' ? 'Messenger' : '', false], ['Claude (la inteligencia de ' + A.nombre + ')', claudeOk]]
        .filter(function(x){ return x[0]; }).map(function(x){ return '<span class="' + (x[1] ? 'ok' : '') + '">' + (x[1] ? _RS_OK : _RS_NO) + x[0] + '</span>'; }).join('')
    + '</div></div>';
  if(typeof setMicon === 'function') setMicon('whatsapp');
  var mic = document.getElementById('mic'); if(mic){ mic.innerHTML = _RS_CHISPA; mic.style.color = '#fff'; mic.style.background = 'var(--ink)'; }
  document.getElementById('mtt').textContent = A.nombre + ' de Pagasi';
  document.getElementById('msb').textContent = 'Hoy contestó en ' + uso.hoy + ' ' + (uso.hoy === 1 ? 'conversación' : 'conversaciones') + ' · ' + (A.area === 'ventas' ? 'ventas' : 'cobranza');
  document.getElementById('modal-box').className = 'modal modal-lg';
  document.getElementById('mbd').innerHTML = h;
  S.saveFn = editable ? function(){ return rsGuardarAsistente(A.area); } : null;
  document.getElementById('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>' + (editable ? '<button class="btn btn-p" onclick="saveM()">Guardar</button>' : '');
  document.getElementById('ov').style.display = 'flex';
}
function rsGuardarAsistente(area){
  var cfg = window._waCfg || {}, resp = Object.assign({}, cfg.responde || {}), cal = Object.assign({}, cfg.calidad || {}), datos = {};
  document.querySelectorAll('#mbd .rs-sw').forEach(function(e){ if(e.disabled) return; if(e.getAttribute('data-canal') === 'recordatorios') datos.recordatorios = !!e.checked; else resp[e.getAttribute('data-canal')] = !!e.checked; });
  var q = document.querySelector('#mbd input[name="rs-calidad"]:checked'); if(q) cal[area] = q.value;
  datos.responde = resp; datos.calidad = cal;
  var t = document.getElementById('rs-instr'); if(t){ if(area === 'ventas') datos.instruccionesVentas = t.value; else datos.instrucciones = t.value; }
  var pago = document.getElementById('rs-pago'); if(pago) datos.datosPago = pago.value;
  datos.actualizadoPor = (S.currentUser && S.currentUser.nombre) || ''; datos.actualizadoEn = new Date().toISOString();
  return db.collection('config').doc('asistente').set(datos, { merge: true }).then(function(){
    window._waCfg = Object.assign(window._waCfg || {}, datos);
    if(typeof logActividad === 'function') logActividad('asistente_config', 'redes', 'config/asistente', Object.assign({ area: area, calidad: cal[area], responde: JSON.stringify(resp) }, 'recordatorios' in datos ? { recordatorios: datos.recordatorios } : {}));
    if(typeof toast === 'function') toast('Listo: ' + RS_ASIS[area].nombre + ' lo aplica desde su próxima respuesta', 'success');
    closeM();
  }).catch(function(e){ if(typeof toast === 'function') toast('No se pudo guardar: ' + (e && e.message || e), 'error'); return false; });
}

// ── Métricas (Adam, 22-oct-2026: "¿puedes poner las métricas de los post, ads, etc.?") ──
// Lo que se puede hoy: Instagram (seguidores, publicaciones con sus "me gusta" y comentarios, que
// guarda cada 2 horas el servidor en config/redesMetricas) y lo que hace Paola (personas que
// escriben, quién quiere comprar, comentarios contestados), que sale de las conversaciones. El
// alcance, las vistas y los anuncios necesitan permisos de Meta que la app todavía no tiene.
window._rsMetDias = window._rsMetDias || 7;
function rsMetDias(n){ window._rsMetDias = n; var e = document.getElementById('rs-met'); if(e) e.innerHTML = _rsMetricasHtml(); }
function rsCargarMetricas(){
  var listo = function(){ var e = document.getElementById('rs-met'); if(e && S.page === 'redes' && window._rsVista === 'metricas') e.innerHTML = _rsMetricasHtml(); };
  if(typeof db === 'undefined' || !db){ listo(); return; }
  db.collection('config').doc('redesMetricas').get().then(function(d){ window._rsMet = d.exists ? d.data() : null; listo(); }).catch(function(){ listo(); });
  // Las conversaciones de los últimos días de cada canal que este usuario ve (la bandeja trae solo las 200 más recientes)
  var canales = [];
  if(_rsVe('instagram') && waConectadoCanal('instagram')) canales.push('instagram');
  if(_rsVe('whatsapp') && waConectado()) canales.push('whatsapp');
  if(!canales.length) return;
  Promise.all(canales.map(function(c){ return db.collection('conversaciones').where('canal', '==', c).orderBy('actualizado', 'desc').limit(1000).get().then(function(s){ return s.docs.map(function(x){ return Object.assign({ id: x.id }, x.data()); }); }).catch(function(){ return []; }); }))
    .then(function(r){ window._rsMetConvs = [].concat.apply([], r); listo(); });
}
function _rsDiaLocal(iso){ var d = new Date(iso); return isNaN(d) ? '' : _waFechaLocal(d); }
function _rsMetricasHtml(){
  var dias = window._rsMetDias || 7, hoy = new Date(), desdeD = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1));
  var desde = _waFechaLocal(desdeD), lista = [];
  for(var i = 0; i < dias; i++){ var x = new Date(desdeD); x.setDate(desdeD.getDate() + i); lista.push(_waFechaLocal(x)); }
  var convs = (window._rsMetConvs && window._rsMetConvs.length ? window._rsMetConvs : (window._waConvs || []));
  var nuevas = convs.filter(function(c){ return _rsDiaLocal(c.creado || c.ultimoMensajeHora) >= desde; });
  var esIg = function(c){ return c.canal === 'instagram'; };
  var nIg = nuevas.filter(esIg).length, nWaV = nuevas.filter(function(c){ return !esIg(c) && !_waEsCobranza(c); }).length, nWaC = nuevas.filter(_waEsCobranza).length;
  var leads = nuevas.filter(function(c){ return c.borrador && c.borrador.tipo === 'lead'; }).length;
  var ventasN = nIg + nWaV;
  var coms = (window._waComs || []).filter(function(c){ return _rsDiaLocal(c.hora) >= desde; });
  var cAd = coms.filter(function(c){ return c.tipoMedia === 'AD'; }).length, cResp = coms.filter(function(c){ return c.estado === 'respondido'; }).length;
  var met = window._rsMet || {}, ig = met.instagram || null, sd = met.seguidoresDias || {};
  var fechasSeg = Object.keys(sd).sort(), base = fechasSeg.filter(function(f){ return f <= desde; }).pop() || fechasSeg[0];
  var crec = ig && base && sd[base] != null ? ig.seguidores - sd[base] : null;
  var pct = function(a, b){ return b ? Math.round(a / b * 100) + '%' : '—'; };
  var kpi = function(l, v, d){ return '<div class="rs-kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div></div>'; };
  var h = '<div class="per">' + [[7, 'Últimos 7 días'], [30, 'Últimos 30 días']].map(function(p){ return '<button class="' + (dias === p[0] ? 'on' : '') + '" onclick="rsMetDias(' + p[0] + ')">' + p[1] + '</button>'; }).join('') + '</div>'
    + '<div class="rs-kpis">'
    + kpi('Seguidores en Instagram', ig ? ig.seguidores.toLocaleString('es-VE') : '—', ig ? (crec != null && base < _waFechaLocal(hoy) ? (crec >= 0 ? '+' : '') + crec + ' desde el ' + _waFechaCorta(base) : 'Se empezó a guardar el ' + _waFechaCorta(fechasSeg[0] || _waFechaLocal(hoy)) + ': desde ahí se ve cuánto crece') + ' · ' + ig.publicaciones + ' publicaciones' : 'Todavía no hay datos de Instagram')
    + kpi('Personas que escribieron', String(ventasN + nWaC), 'Instagram ' + nIg + ' · WhatsApp ventas ' + nWaV + ' · cobranza ' + nWaC)
    + kpi('Quieren comprar', String(leads), pct(leads, ventasN) + ' de las ' + ventasN + ' conversaciones de ventas')
    + kpi('Comentarios en Instagram', String(coms.length), 'En anuncios ' + cAd + ' · en publicaciones ' + (coms.length - cAd) + ' · Paola contestó ' + pct(cResp, coms.length))
    + '</div>';
  // Gráfico: personas que escribieron por día, Instagram y WhatsApp apilados
  var porDia = lista.map(function(f){ var d = nuevas.filter(function(c){ return _rsDiaLocal(c.creado || c.ultimoMensajeHora) === f; }); return { f: f, ig: d.filter(esIg).length, wa: d.filter(function(c){ return !esIg(c); }).length }; });
  h += '<div class="bloque"><h3>Personas que escribieron por día</h3><div class="sv">Conversaciones nuevas en Instagram y WhatsApp (ventas y cobranza).</div>'
    + '<div class="rs-ley"><span><i style="background:var(--s-ig)"></i>Instagram</span><span><i style="background:var(--s-wa)"></i>WhatsApp</span></div>'
    + _rsGrafico(porDia)
    + '<details><summary>Ver como tabla</summary><table><tr><th>Día</th><th>Instagram</th><th>WhatsApp</th><th>Total</th></tr>' + porDia.slice().reverse().map(function(d){ return '<tr><td>' + _waFechaCorta(d.f) + '</td><td>' + d.ig + '</td><td>' + d.wa + '</td><td>' + (d.ig + d.wa) + '</td></tr>'; }).join('') + '</table></details></div>';
  // Las publicaciones de Instagram
  h += '<div class="bloque"><h3>Publicaciones de Instagram</h3><div class="sv">' + (ig ? 'Las últimas ' + ig.posts.length + ', con sus "me gusta" y comentarios' + (met.actualizado ? ' · actualizado ' + _waHora(met.actualizado) : '') : 'El servidor las trae cada 2 horas.') + '</div>'
    + (ig && ig.posts.length ? '<div class="rs-posts">' + ig.posts.map(function(p){ return '<div class="rs-post"><div class="img"' + (p.imagen ? ' style="background-image:url(\'' + _waEsc(p.imagen) + '\')"' : '') + '></div><div class="c"><div class="n">♥ ' + p.meGusta + ' &nbsp; 💬 ' + p.comentarios + '</div><div class="t">' + _waEsc(p.texto || '(sin texto)') + '</div><div class="f">' + _waFechaCorta(_rsDiaLocal(p.fecha)) + (p.producto === 'REELS' ? ' · reel' : p.tipo === 'CAROUSEL_ALBUM' ? ' · carrusel' : '') + '</div>' + (p.enlace ? '<a href="' + _waEsc(p.enlace) + '" target="_blank" rel="noopener">Ver en Instagram</a>' : '') + '</div></div>'; }).join('') + '</div>' : '<div class="cs">Sin publicaciones para mostrar todavía.</div>')
    + '</div>';
  // Lo que falta
  h += '<div class="bloque rs-falta"><h3>Para ver también el alcance y los anuncios</h3><div class="sv">Meta no deja leer estas cifras con los permisos que tiene hoy la app de Pagasi. Se activan cuando se genere de nuevo el token del usuario del sistema con estos permisos (en el Business Manager de Meta).</div><ul>'
    + '<li>' + _RS_NO + '<span><b>Alcance, vistas y guardados</b> de cada publicación y de la cuenta · permiso <code>instagram_manage_insights</code></span></li>'
    + '<li>' + _RS_NO + '<span><b>Anuncios:</b> cuánto se gastó, a cuánta gente llegó, cuántos mensajes trajo y el costo por mensaje · permiso <code>ads_read</code> y acceso a la cuenta de anuncios</span></li>'
    + '<li>' + _RS_NO + '<span><b>Página de Facebook:</b> alcance y publicaciones · permiso <code>read_insights</code></span></li></ul></div>';
  return h;
}
// Barras apiladas por día (Instagram abajo, WhatsApp arriba), con su número al pasar el ratón
function _rsGrafico(porDia){
  var W = 720, H = 200, iz = 30, ab = 22, ar = 8, n = porDia.length, max = Math.max(1, Math.max.apply(null, porDia.map(function(d){ return d.ig + d.wa; })));
  var paso = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.ceil(max / 5 / 10) * 10, tope = Math.ceil(max / paso) * paso;
  var y = function(v){ return ar + (H - ar - ab) * (1 - v / tope); }, ancho = (W - iz) / n, bw = Math.max(4, Math.min(28, ancho * 0.62));
  var g = '';
  for(var t = 0; t <= tope; t += paso) g += '<line x1="' + iz + '" x2="' + W + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--rim2)" stroke-width="1"/><text x="' + (iz - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="var(--ink3)">' + t + '</text>';
  var cada = n <= 7 ? 1 : Math.ceil(n / 8);
  porDia.forEach(function(d, i){
    var cx = iz + ancho * i + ancho / 2, x = cx - bw / 2, yIg = y(d.ig), yTot = y(d.ig + d.wa), r = 4;
    // Instagram abajo; si hay WhatsApp encima, 2 px de separación
    if(d.ig) g += '<rect x="' + x + '" y="' + yIg + '" width="' + bw + '" height="' + (y(0) - yIg) + '" rx="' + (d.wa ? 0 : r) + '" fill="var(--s-ig)"/>' + (d.wa ? '' : '<rect x="' + x + '" y="' + (yIg + r) + '" width="' + bw + '" height="' + Math.max(0, y(0) - yIg - r) + '" fill="var(--s-ig)"/>');
    if(d.wa) g += '<rect x="' + x + '" y="' + yTot + '" width="' + bw + '" height="' + Math.max(0, yIg - yTot - (d.ig ? 2 : 0)) + '" rx="' + r + '" fill="var(--s-wa)"/><rect x="' + x + '" y="' + (yTot + r) + '" width="' + bw + '" height="' + Math.max(0, yIg - yTot - r - (d.ig ? 2 : 0)) + '" fill="var(--s-wa)"/>';
    if(i % cada === 0 || i === n - 1) g += '<text x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle" font-size="11" fill="var(--ink3)">' + _waFechaCorta(d.f) + '</text>';
    g += '<rect x="' + (iz + ancho * i) + '" y="0" width="' + ancho + '" height="' + (H - ab) + '" fill="transparent" onmousemove="_rsTip(event, this)" onmouseleave="_rsTip(null)" data-tip="' + _waFechaCorta(d.f) + ' · Instagram ' + d.ig + ' · WhatsApp ' + d.wa + '"/>';
  });
  return '<div class="rs-graf"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Personas que escribieron por día">' + g + '</svg><div class="tip" id="rs-tip"></div></div>';
}
function _rsTip(e, el){
  var t = document.getElementById('rs-tip'); if(!t) return;
  if(!e){ t.style.display = 'none'; return; }
  var caja = t.parentNode.getBoundingClientRect();
  t.textContent = el.getAttribute('data-tip'); t.style.display = 'block';
  t.style.left = (e.clientX - caja.left) + 'px'; t.style.top = (e.clientY - caja.top - 8) + 'px';
}

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
  if((window._rsVista === 'hoy' && !veWa) || window._rsVista === 'asistente') window._rsVista = 'bandeja';
  var vista = window._rsVista, tab = window._rsTab, ctx = _waCtxActual();
  var waOk = waConectado(), igOk = waConectadoCanal('instagram');

  var h = '<div class="page wa-page rs-page">'
    + '<div class="rs-cab"><div><div class="t">Redes sociales '
      + (veWa ? (waOk ? '<span class="wa-pill verde">WhatsApp · ' + _waEsc(cfg.telefono || 'conectado') + '</span>' : '<span class="wa-pill ambar">WhatsApp en demostración</span>') : '')
      + (veIg ? (igOk ? '<span class="wa-pill ig">Instagram · @' + _waEsc(String(cfg.instagram).replace(/^@/, '')) + '</span>' : '<span class="wa-pill ambar">Instagram en demostración</span>') : '')
    + '</div><div class="cs">' + (veWa ? 'Patricia atiende la cobranza por WhatsApp. ' : '') + 'Paola atiende las ventas' + (veIg && veWa ? ' por WhatsApp e Instagram' : veIg ? ' por Instagram' : ' por WhatsApp') + '.</div></div>'
      + '<div class="wa-tabs"><button class="' + (vista === 'bandeja' ? 'on' : '') + '" onclick="rsVista(\'bandeja\')">Bandeja</button>'
      + (veWa ? '<button class="' + (vista === 'hoy' ? 'on' : '') + '" onclick="rsVista(\'hoy\')">Cobranza de hoy · ' + cola.total + '</button>' : '')
      + '<button class="' + (vista === 'metricas' ? 'on' : '') + '" onclick="rsVista(\'metricas\')">Métricas</button>'
      + (veIg || veWa ? '<button class="rs-asis-btn" onclick="rsAsistente(\'ventas\')">' + _RS_CHISPA + 'Paola</button>' : '')
      + (veWa ? '<button class="rs-asis-btn" onclick="rsAsistente(\'cobranza\')">' + _RS_CHISPA + 'Patricia</button>' : '') + '</div>'
    + '</div>'
    + ((veWa && !waOk) || (veIg && !igOk) ? '<div class="wa-aviso"><span style="font-size:18px">⚠️</span><div><b>' + (veWa && !waOk && veIg && !igOk ? 'WhatsApp e Instagram todavía no están conectados' : veWa && !waOk ? 'WhatsApp todavía no está conectado' : 'Instagram todavía no está conectado') + ' en esta compañía.</b> Lo que ves de ' + (veWa && !waOk && veIg && !igOk ? 'esos canales' : 'ese canal') + ' es de muestra, en memoria, para ver cómo atienden las asistentes.</div></div>' : '');

  if(vista === 'hoy'){
    h += _waPanelHoy(cola);
  } else if(vista === 'metricas'){
    h += '<div class="rs-met" id="rs-met">' + _rsMetricasHtml() + '</div>';
    rsCargarMetricas();
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
  // Se vuelve a medir cuando termina la animación de entrada de la página (la corre 8 px)
  setTimeout(function(){ if(S.page === 'redes' && typeof _waAjustarAltura === 'function') _waAjustarAltura(); }, 260);
  return h;
};
