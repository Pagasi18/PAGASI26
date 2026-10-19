// Pagasi module: instagram (18-oct-2026). Los mensajes directos de la cuenta de Pagasi, atendidos
// por el asistente de VENTAS (el mismo que atiende las ventas por WhatsApp): responde con el
// catalogo de pagasi.io, las sedes y como solicitar, y anota a quien quiere comprar como lead.
// Usa el motor de pantalla de modules/whatsapp.js (lista + hilo + ficha, pestana Asistente).
PG.instagram = function(){
  if(!document.getElementById('wa-css')) document.head.insertAdjacentHTML('beforeend', _WA_CSS);
  if(!window._waCfg){ waCargarCfg(function(){ if(S.page === 'instagram') nav('instagram'); }); }
  var conectado = waConectadoCanal('instagram');
  if(!conectado) waDemoInstagram(); else waAbrirConversaciones('instagram');
  var ctx = { modulo: 'instagram', canal: 'instagram', area: 'ventas' }, tab = _waTabActual(ctx);
  var convs = _waConvsDe(ctx), conAtencion = convs.filter(function(c){ return c.atencion; }).length, leads = convs.filter(function(c){ return c.borrador && c.borrador.tipo === 'lead'; }).length;
  var cfg = window._waCfg || {};
  var h = '<div class="page wa-page">'
    + '<div class="wa-cab"><div class="wa-cab-izq"><div class="ct" style="font-size:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">Instagram ' + (conectado ? '<span class="wa-pill ig">' + (typeof cfg.instagram === 'string' && cfg.instagram ? '@' + _waEsc(cfg.instagram.replace(/^@/, '')) + ' conectado' : 'Instagram conectado') + '</span>' : '<span class="wa-pill ambar">Modo demostración</span>') + '</div>'
    + '<div class="cs">Mensajes directos de la cuenta de Pagasi: el asistente de ventas responde con el catálogo y anota a quien quiere comprar.</div></div>'
    + '<div class="wa-cab-der"><div class="wa-minis"><span><b id="wa-st-conv">' + convs.length + '</b> conversaciones</span><span class="ambar"><b id="wa-st-esperan">' + conAtencion + '</b> esperan persona</span><span class="verde"><b id="wa-st-leads">' + leads + '</b> quieren comprar</span></div>'
    + '<div class="wa-tabs"><button class="' + (tab === 'conv' ? 'on' : '') + '" id="wa-tab-conv" onclick="waTab(\'conv\')">Conversaciones' + (conAtencion ? ' · ' + conAtencion + ' esperan' : '') + '</button><button class="' + (tab === 'asistente' ? 'on' : '') + '" onclick="waTab(\'asistente\')">Asistente</button></div></div></div>'
    + (conectado ? '' : '<div class="wa-aviso"><span style="font-size:18px">⚠️</span><div><b>Instagram todavía no está conectado.</b> Las conversaciones son de muestra, en memoria, para ver cómo atiende el asistente.</div></div>');
  if(tab === 'asistente') h += _waPanelAsistente(ctx);
  else h += _waPanelConversaciones(ctx);
  h += '</div>';
  return h;
};
