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
  var h = '<div class="page">'
    + '<div class="ch" style="margin-bottom:12px"><div><div class="ct" style="font-size:20px">Instagram</div><div class="cs">Los mensajes directos de la cuenta de Pagasi. El asistente de ventas responde con el catálogo y anota a quien quiere comprar; el equipo entra cuando hace falta.</div></div>'
    + '<div>' + (conectado ? '<span class="wa-pill ig">@' + _waEsc(cfg.instagram || '') + ' conectado</span>' : '<span class="wa-pill ambar">Modo demostración</span>') + '</div></div>'
    + (conectado ? '' : '<div class="wa-aviso"><span style="font-size:18px">⚠️</span><div><b>Instagram todavía no está conectado.</b> Las conversaciones son de muestra, en memoria, para ver cómo atiende el asistente. Falta que la cuenta sea profesional, esté ligada a una página de Facebook y tenga el permiso de mensajes en la app de Meta.</div></div>')
    + '<div class="sg wa-stats" style="margin-bottom:14px">'
    + '<div class="stat"><div class="st-v">' + convs.length + '</div><div class="st-l">Conversaciones</div></div>'
    + '<div class="stat"><div class="st-v" style="color:var(--amber)">' + conAtencion + '</div><div class="st-l">Esperan a una persona</div></div>'
    + '<div class="stat"><div class="st-v" style="color:#0f7a3e">' + leads + '</div><div class="st-l">Quieren comprar (leads)</div></div>'
    + '</div>'
    + '<div class="wa-tabs"><button class="' + (tab === 'conv' ? 'on' : '') + '" onclick="waTab(\'conv\')">Conversaciones' + (conAtencion ? ' · ' + conAtencion + ' esperan' : '') + '</button><button class="' + (tab === 'asistente' ? 'on' : '') + '" onclick="waTab(\'asistente\')">Asistente</button></div>';
  if(tab === 'asistente') h += _waPanelAsistente(ctx);
  else h += _waPanelConversaciones(ctx);
  h += '</div>';
  return h;
};
