// Pagasi module: metricas (14-oct-2026). Quién entra a la página pública, de dónde viene y
// qué hace: visitas por día, fuentes, teléfono o computadora, motos más vistas, horas y el
// embudo hasta la solicitud. Todo anónimo (assets/public/metricas.js).
// 23-oct-2026 (Adam: "mejórame el módulo de métricas al 100%"): gráfico de altura fija con eje y
// detalle al pasar el mouse, comparación con el período anterior, tablas con lo que convierte cada
// fuente, moto, teléfono y página (se exportan a Excel/PDF) y un resumen con lo más importante.
function metCambiarRango(n){ _met.rango = n; metCargar(n); nav('metricas'); }
function metCambiarSerie(s){ _met.serie = s; nav('metricas'); }

var _MET_CSS = '<style id="met-css">'
  + '.met-plot{position:relative;margin-left:34px}.met-col{position:relative;flex:1;height:100%;display:flex;align-items:flex-end;justify-content:center;border-radius:4px;cursor:default}'
  + '.met-col:hover{background:var(--surf2)}.met-col:hover>div{filter:brightness(1.12)}'
  + '.met-tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--surf);font-size:12px;border-radius:6px;padding:6px 9px;white-space:nowrap;transform:translate(-50%,-100%);display:none;line-height:1.5;z-index:3}'
  + '.met-tw{overflow-x:auto}.met-tw table{min-width:440px}.met-tw th{padding:8px 10px}.met-tw td{padding:8px 10px;font-size:12.5px}.met-tw td.n,.met-tw th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}'
  + '.met-chip{border:1px solid var(--rim);background:var(--surf);color:var(--ink2);border-radius:999px;padding:4px 11px;font-size:11.5px;font-weight:700;cursor:pointer}.met-chip.on{background:var(--p1);border-color:var(--p1);color:#fff}'
  + '.met-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}@media(min-width:1300px){.met-kpis{grid-template-columns:repeat(6,minmax(0,1fr))}}@media(max-width:560px){.met-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}'
  + '.met-ideas li{margin:0 0 6px;line-height:1.5}.met-ideas li:last-child{margin:0}'
  + '</style>';

function _metTip(e, el){
  var t = document.getElementById('met-tip-' + (el ? el.getAttribute('data-g') : _metTip.g)); if(!t) return;
  if(!e){ t.style.display = 'none'; return; }
  _metTip.g = el.getAttribute('data-g');
  var caja = t.parentNode.getBoundingClientRect();
  t.innerHTML = el.getAttribute('data-tip'); t.style.display = 'block';
  t.style.left = Math.max(60, Math.min(caja.width - 60, e.clientX - caja.left)) + 'px'; t.style.top = (e.clientY - caja.top - 10) + 'px';
}

// Barras verticales de altura fija (no crecen con el ancho de la pantalla), con eje, líneas guía y
// el detalle al pasar el mouse. items: [{ etq, v, tip, claro }]
function _metBarras(id, items, alto, cadaEtq){
  var max = Math.max(1, Math.max.apply(null, items.map(function(x){ return x.v; })));
  var paso = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : max <= 250 ? 50 : max <= 500 ? 100 : Math.ceil(max / 5 / 100) * 100;
  var tope = Math.ceil(max / paso) * paso, h = '';
  for(var t = 0; t <= tope; t += paso)
    h += '<div style="position:absolute;left:0;right:0;bottom:' + (t / tope * 100) + '%;border-top:1px solid ' + (t ? 'var(--rim)' : 'var(--ink3)') + ';opacity:' + (t ? '.7' : '.5') + '"><span style="position:absolute;right:calc(100% + 6px);top:-7px;font-size:10.5px;color:var(--ink3);font-variant-numeric:tabular-nums">' + t.toLocaleString('es-VE') + '</span></div>';
  h += '<div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:2px">' + items.map(function(x){
    var alt = x.v ? Math.max(1.5, x.v / tope * 100) : 0;
    return '<div class="met-col" data-g="' + id + '" data-tip="' + String(x.tip).replace(/"/g, '&quot;') + '" onmousemove="_metTip(event,this)" onmouseleave="_metTip(null,this)">'
      + '<div style="width:100%;max-width:30px;height:' + alt + '%;background:' + (x.claro ? 'var(--p2)' : 'var(--p1)') + ';border-radius:4px 4px 0 0"></div></div>';
  }).join('') + '</div>';
  var etqs = '<div style="display:flex;gap:2px;margin:5px 0 0 34px;height:14px">' + items.map(function(x, i){
    var ver = cadaEtq <= 1 || (items.length - 1 - i) % cadaEtq === 0;   // contadas desde la última: hoy siempre lleva fecha y no se pisan
    return '<div style="flex:1;position:relative">' + (ver ? '<span style="position:absolute;left:50%;transform:translateX(-50%);font-size:10.5px;color:var(--ink3);white-space:nowrap">' + x.etq + '</span>' : '') + '</div>';
  }).join('') + '</div>';
  return '<div class="met-plot" style="height:' + alto + 'px" role="img" aria-label="Gráfico de barras; los números están en la tabla">' + h + '<div class="met-tip no-export" id="met-tip-' + id + '"></div></div>' + etqs;
}

PG.metricas = function(){
  var admin = typeof isAdminUser === 'function' && isAdminUser();
  if(!admin && !(typeof hasModuleAccess === 'function' && hasModuleAccess('metricas'))) return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">Pídele a un administrador el permiso de <b>Métricas web</b>.</div></div>';
  if(typeof document !== 'undefined' && document.head && !document.getElementById('met-css')) document.head.insertAdjacentHTML('beforeend', _MET_CSS);
  if(!_met.docs && !_met.cargando && !_met.error) metCargar(_met.rango);
  var E = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]; }); };
  var N = function(n){ return (+n || 0).toLocaleString('es-VE'); };
  var pct = function(a, b){ return b ? Math.round(a / b * 100) + '%' : '—'; };
  var rangos = [[1, 'Hoy'], [7, '7 días'], [30, '30 días']];
  var cabeza = pageBanner('Analítica · página web', 'Métricas web', 'Visitas anónimas de la página pública · sin datos personales',
    rangos.map(function(x){ return { label: x[1], onclick: 'metCambiarRango(' + x[0] + ')', primary: _met.rango === x[0] }; }).concat([{ label: '↻', onclick: 'metCargar(_met.rango,true)' }]));
  if(_met.error) return '<div class="page">' + cabeza + '<div class="card" style="padding:18px;color:var(--red);font-size:13px">' + E(_met.error) + '</div></div>';
  if(!_met.docs) return '<div class="page">' + cabeza + '<div class="card" style="padding:30px;text-align:center;color:var(--ink3)">Cargando las visitas…</div></div>';

  var hoy = _metHoyVE(), horaAhora = _metHoraVE(), P = metPeriodos(_met.rango, hoy, horaAhora);
  var r = metResumen(_met.docs, P.desde, P.hasta);
  if(!r.visitas) return '<div class="page">' + cabeza + '<div class="card" style="padding:30px;text-align:center;color:var(--ink3);line-height:1.6">Todavía no hay visitas en este período.<br><span style="font-size:12px">Se cuentan desde que se publicaron las métricas. Las visitas del personal de PAGASI no se cuentan.</span></div></div>';
  var ant = P.comparable ? metResumen(_met.docs, P.desdeAnt, P.hastaAnt, horaAhora) : null;
  var contraQue = _met.rango === 1 ? 'ayer a esta hora' : 'los ' + _met.rango + ' días anteriores';

  // ── Números grandes, con el cambio contra el período anterior ──
  var cambio = function(a, b, alReves){
    if(!ant) return '';
    var c = metCambio(a, b);
    if(c === null) return '<div style="font-size:11px;color:var(--ink3);margin-top:3px">sin datos ' + contraQue + '</div>';
    var bueno = alReves ? c < 0 : c > 0, color = c === 0 ? 'var(--ink3)' : (bueno ? 'var(--green)' : 'var(--red)');
    return '<div style="font-size:11px;font-weight:700;color:' + color + ';margin-top:3px" title="' + N(b) + ' ' + contraQue + '">' + (c > 0 ? '▲ ' : c < 0 ? '▼ ' : '= ') + Math.abs(c) + '% <span style="font-weight:600;color:var(--ink3)">vs ' + contraQue + '</span></div>';
  };
  // En los porcentajes se dice cuántos puntos subió o bajó (menos es mejor: los que se van sin hacer nada)
  var puntos = function(a, ta, b, tb){
    if(!ant || !tb) return '';
    var d = Math.round(a / ta * 100) - Math.round(b / tb * 100), color = d === 0 ? 'var(--ink3)' : (d < 0 ? 'var(--green)' : 'var(--red)');
    return '<div style="font-size:11px;font-weight:700;color:' + color + ';margin-top:3px" title="' + Math.round(b / tb * 100) + '% ' + contraQue + '">' + (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '= ') + Math.abs(d) + ' punto' + (Math.abs(d) === 1 ? '' : 's') + ' <span style="font-weight:600;color:var(--ink3)">vs ' + contraQue + '</span></div>';
  };
  var kpi = function(v, t, sub, cmb){ return '<div class="cf-kpi"><div class="cf-kpi-v">' + v + '</div><div class="cf-kpi-l">' + t + '</div>' + (sub ? '<div style="font-size:11px;color:var(--ink3);margin-top:2px">' + sub + '</div>' : '') + (cmb || '') + '</div>'; };
  var A = ant || {}, deAyer = 0;
  if(_met.rango === 1){
    var vAyer = {}, vHoy = {}, fAyer = _metRestarDias(hoy, 1);
    _met.docs.forEach(function(d){ if(d.vid && d.fecha === fAyer) vAyer[d.vid] = 1; if(d.vid && d.fecha === hoy) vHoy[d.vid] = 1; });
    deAyer = Object.keys(vHoy).filter(function(v){ return vAyer[v]; }).length;
  }
  var kpis = '<div class="cf-kpis met-kpis" style="margin-bottom:14px">'
    + kpi(N(r.visitantes), 'Personas', _met.rango === 1 ? N(deAyer) + ' ya habían venido ayer' : N(r.volvieron) + ' volvieron otro día', cambio(r.visitantes, A.visitantes))
    + kpi(N(r.visitas), 'Visitas', N(r.paginas) + ' páginas vistas', cambio(r.visitas, A.visitas))
    + kpi(N(r.embudo.whatsapp), 'Escribieron por WhatsApp', pct(r.embudo.whatsapp, r.visitas) + ' de las visitas', cambio(r.embudo.whatsapp, (A.embudo || {}).whatsapp))
    + kpi(N(r.embudo.solEnviada), 'Solicitudes enviadas', pct(r.embudo.solEnviada, r.visitas) + ' de las visitas', cambio(r.embudo.solEnviada, (A.embudo || {}).solEnviada))
    + kpi(r.conTiempo ? metTiempo(r.tiempoTipico) : '—', 'Tiempo típico en la página', 'la mitad se queda más que esto')
    + kpi(pct(r.rebote, r.visitas), 'Se fueron sin hacer nada', 'vieron una página y no tocaron nada', puntos(r.rebote, r.visitas, A.rebote, A.visitas))
    + '</div>';
  var avisoComparar = (!ant && _met.rango > 1) ? '<div style="font-size:11.5px;color:var(--ink3);margin:-6px 0 12px">La comparación con los ' + _met.rango + ' días anteriores aparece cuando haya datos de esos días (las métricas empezaron el 14-oct).</div>' : '';

  // ── Lo más importante ──
  var ideas = metIdeas(r);
  var resumen = ideas.length ? '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">Lo más importante</div></div><ul class="met-ideas" style="margin:0;padding:0 16px 14px 34px;font-size:13px;color:var(--ink2)">' + ideas.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul></div>' : '';

  // ── Día por día (u hora por hora, si es hoy) ──
  var SERIES = [['personas', 'Personas'], ['visitas', 'Visitas'], ['whatsapp', 'WhatsApp'], ['solicitudes', 'Solicitudes']];
  if(!SERIES.some(function(s){ return s[0] === _met.serie; })) _met.serie = 'personas';
  var chips = '<div class="no-export" style="display:flex;gap:6px;flex-wrap:wrap">' + SERIES.map(function(s){ return '<button class="met-chip' + (_met.serie === s[0] ? ' on' : '') + '" onclick="metCambiarSerie(\'' + s[0] + '\')">' + s[1] + '</button>'; }).join('') + '</div>';
  var grafico, tablaDias;
  if(_met.rango === 1){
    var ayer = metResumen(_met.docs, _metRestarDias(hoy, 1), _metRestarDias(hoy, 1));
    var hs = []; for(var hh = 0; hh <= horaAhora; hh++) hs.push(hh);
    grafico = _metBarras('dia', hs.map(function(h){ return { etq: _metHoraTexto(h), v: r.horas[h], tip: '<b>' + _metHoraTexto(h) + '</b> · ' + r.horas[h] + ' visitas<br>ayer a esa hora: ' + ayer.horas[h] }; }), 190, hs.length > 12 ? 3 : 1);
    tablaDias = '<table><thead><tr><th>Hora</th><th class="n">Visitas hoy</th><th class="n">Ayer a esa hora</th></tr></thead><tbody>' + hs.map(function(h){ return '<tr><td>' + _metHoraTexto(h) + '</td><td class="n">' + r.horas[h] + '</td><td class="n">' + ayer.horas[h] + '</td></tr>'; }).join('') + '</tbody></table>';
  } else {
    var dias = []; for(var i = _met.rango - 1; i >= 0; i--) dias.push(_metRestarDias(hoy, i));
    var fc = function(f){ return f.slice(8) + '/' + f.slice(5, 7); };
    var val = function(d, s){ return s === 'personas' ? d.visitantes : d[s] || 0; };
    grafico = _metBarras('dia', dias.map(function(f){
      var d = r.porDia[f] || { visitas: 0, visitantes: 0, whatsapp: 0, solicitudes: 0 };
      return { etq: fc(f), v: val(d, _met.serie), claro: f === hoy, tip: '<b>' + MET_DIAS[new Date(f + 'T12:00:00').getDay()] + ' ' + fc(f) + (f === hoy ? ' (hasta ahora)' : '') + '</b><br>' + d.visitantes + ' personas · ' + d.visitas + ' visitas<br>' + d.whatsapp + ' WhatsApp · ' + d.solicitudes + (d.solicitudes === 1 ? ' solicitud' : ' solicitudes') };
    }), 190, dias.length > 10 ? Math.ceil(dias.length / 8) : 1);
    tablaDias = '<table><thead><tr><th>Día</th><th class="n">Personas</th><th class="n">Visitas</th><th class="n">WhatsApp</th><th class="n">Solicitudes</th></tr></thead><tbody>' + dias.map(function(f){ var d = r.porDia[f] || {}; return '<tr><td>' + MET_DIAS[new Date(f + 'T12:00:00').getDay()].slice(0, 3) + ' ' + fc(f) + '</td><td class="n">' + N(d.visitantes) + '</td><td class="n">' + N(d.visitas) + '</td><td class="n">' + N(d.whatsapp) + '</td><td class="n">' + N(d.solicitudes) + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  var nombreSerie = (SERIES.find(function(s){ return s[0] === _met.serie; }) || SERIES[0])[1];
  var cardGraf = '<div class="card" style="margin-bottom:14px"><div class="ch" style="flex-wrap:wrap;gap:8px"><div class="ct" data-titulo="' + (_met.rango === 1 ? 'Hora por hora' : 'Día por día') + '">' + (_met.rango === 1 ? 'Visitas de hoy, hora por hora' : nombreSerie + ' por día') + '</div>' + (_met.rango === 1 ? '<div style="font-size:11px;color:var(--ink3)">hora de Caracas</div>' : chips) + '</div>'
    + '<div style="padding:4px 16px 12px">' + grafico + (_met.rango > 1 ? '<div style="font-size:11px;color:var(--ink3);margin-top:8px">La barra clara es hoy, que todavía no termina.</div>' : '')
    + '<details style="margin-top:8px"><summary style="font-size:12px;color:var(--p1);cursor:pointer;font-weight:700">Ver la tabla</summary><div class="met-tw" style="margin-top:6px">' + tablaDias + '</div></details></div></div>';

  var card = function(t, html, sub){ return '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">' + t + '</div>' + (sub ? '<div style="font-size:11px;color:var(--ink3);text-align:right">' + sub + '</div>' : '') + '</div><div style="padding:0 16px 14px">' + html + '</div></div>'; };
  var barrita = function(v, max){ return '<div style="height:6px;border-radius:3px;background:var(--surf2);margin-top:4px;min-width:60px"><div style="height:6px;border-radius:3px;background:var(--p1);width:' + Math.max(2, Math.round(v / Math.max(1, max) * 100)) + '%"></div></div>'; };

  // ── Embudo, con lo que sigue de un paso al otro ──
  var Em = r.embudo;
  var pasos = [['Visitaron la página', Em.visitas], ['Miraron una moto', Em.moto], ['Usaron el simulador', Em.simulo], ['Tocaron "La quiero" o "Solicitar"', Em.quiero], ['Empezaron la solicitud', Em.solInicio], ['Enviaron la solicitud', Em.solEnviada]];
  var peorPaso = -1, peorT = 2;
  pasos.forEach(function(p, k){ if(k && pasos[k - 1][1] >= 10){ var t = p[1] / pasos[k - 1][1]; if(t < peorT){ peorT = t; peorPaso = k; } } });
  var embudo = '<div class="met-tw"><table><thead><tr><th>Paso</th><th class="n">Visitas</th><th class="n">Del total</th><th class="n">Del paso anterior</th></tr></thead><tbody>' + pasos.map(function(p, k){
    var deAnt = k ? pct(p[1], pasos[k - 1][1]) : '';
    return '<tr' + (k === peorPaso ? ' style="background:var(--reds)"' : '') + '><td>' + E(p[0]) + barrita(p[1], Em.visitas) + '</td><td class="n"><b>' + N(p[1]) + '</b></td><td class="n">' + pct(p[1], Em.visitas) + '</td><td class="n">' + deAnt + (k === peorPaso ? ' <span style="color:var(--red);font-weight:700">⚠</span>' : '') + '</td></tr>';
  }).join('') + '</tbody></table></div>'
    + '<div style="font-size:11.5px;color:var(--ink3);margin-top:8px;line-height:1.5">' + (peorPaso > 0 ? '⚠ Aquí se pierde más gente. ' : '') + 'Además, ' + N(Em.whatsapp) + ' visita' + (Em.whatsapp === 1 ? '' : 's') + ' (' + pct(Em.whatsapp, Em.visitas) + ') tocaron un botón de WhatsApp: muchos piden el precio por ahí en vez de llenar la solicitud.</div>';

  // ── Tablas por grupo: visitas, personas y lo que convierte ──
  var orden = function(o, campo){ return Object.keys(o).map(function(k){ return [k, o[k]]; }).sort(function(a, b){ return (campo ? b[1][campo] - a[1][campo] : b[1] - a[1]); }); };
  var tablaGrupo = function(tipo, titulo, nombre, max){
    var filas = orden(r.grupos[tipo], 'visitas'), resto = null;
    if(max && filas.length > max){
      resto = _metGrupoNuevo(); delete resto._vids;
      filas.slice(max).forEach(function(f){ ['visitas', 'personas', 'whatsapp', 'solEnviada', 'contactos', 'rebote'].forEach(function(k){ resto[k] += f[1][k]; }); });
      filas = filas.slice(0, max);
    }
    if(!filas.length) return '<div style="font-size:12px;color:var(--ink3);padding:6px 0">Sin datos todavía.</div>';
    var tope = filas[0][1].visitas;
    var fila = function(nom, g){ return '<tr><td>' + E(nom) + barrita(g.visitas, tope) + '</td><td class="n">' + N(g.visitas) + '</td><td class="n">' + N(g.personas) + '</td><td class="n">' + N(g.whatsapp) + '</td><td class="n">' + N(g.solEnviada) + '</td><td class="n"><b>' + pct(g.contactos, g.visitas) + '</b></td></tr>'; };
    return '<div class="met-tw"><table><thead><tr><th>' + titulo + '</th><th class="n">Visitas</th><th class="n">Personas</th><th class="n">WhatsApp</th><th class="n">Solicitudes</th><th class="n" title="Visitas que escribieron por WhatsApp o enviaron la solicitud">Contacto</th></tr></thead><tbody>'
      + filas.map(function(f){ return fila(nombre(f[0]), f[1]); }).join('') + (resto ? fila('Otras', resto) : '') + '</tbody></table></div>';
  };
  var motos = orden(r.motosDet, 'vistas').filter(function(m){ return m[1].vistas; }).slice(0, 12), topeMoto = motos.length ? motos[0][1].vistas : 1;
  var tablaMotos = motos.length ? '<div class="met-tw"><table><thead><tr><th>Moto</th><th class="n">La abrieron</th><th class="n">Simularon</th><th class="n">"La quiero"</th><th class="n">WhatsApp</th></tr></thead><tbody>' + motos.map(function(m){
    var x = m[1]; return '<tr><td>' + E(metNombreMoto(m[0])) + barrita(x.vistas, topeMoto) + '</td><td class="n">' + N(x.vistas) + '</td><td class="n">' + N(x.simulo) + ' <span class="no-export" style="color:var(--ink3)">' + pct(x.simulo, x.vistas) + '</span></td><td class="n">' + N(x.quiero) + ' <span class="no-export" style="color:var(--ink3)">' + pct(x.quiero, x.vistas) + '</span></td><td class="n">' + N(x.whatsapp) + '</td></tr>';
  }).join('') + '</tbody></table></div>' : '<div style="font-size:12px;color:var(--ink3);padding:6px 0">Nadie ha abierto una moto en este período.</div>';
  var camps = Object.keys(r.grupos.campana).length;
  var htmlCamp = camps ? tablaGrupo('campana', 'Campaña o enlace', function(k){ return k === 'medio: social' ? 'Enlace de la biografía de Instagram' : k; }, 10) : '';
  htmlCamp += '<div style="font-size:11.5px;color:var(--ink3);margin-top:' + (camps ? '8px' : '0') + ';line-height:1.55">Para saber qué publicación o anuncio trae gente, compártelo con un enlace marcado, por ejemplo <b style="color:var(--ink2);word-break:break-all">pagasi.io/?utm_source=instagram&amp;utm_campaign=veloz</b>: aquí sale "veloz" con sus visitas y contactos.</div>';

  // ── Horas y días de la semana ──
  var maxDow = [1, 2, 3, 4, 5, 6, 0];
  var grafHoras = _metBarras('horas', r.horas.map(function(v, h){ return { etq: _metHoraTexto(h), v: v, tip: '<b>' + _metHoraTexto(h) + '</b> · ' + v + ' visitas' }; }), 120, 6);
  var grafSemana = _metBarras('semana', maxDow.map(function(d){ return { etq: MET_DIAS[d].slice(0, 3), v: r.semana[d], tip: '<b>' + MET_DIAS[d] + '</b> · ' + r.semana[d] + ' visitas' }; }), 120, 1);

  var exportar = typeof pgBotonesExportar === 'function' ? pgBotonesExportar('met-cont', 'Métricas web · ' + (_met.rango === 1 ? 'hoy' : _met.rango + ' días')) : '';
  // Para el Excel: los números grandes en una tabla (no se ve en pantalla)
  var tablaResumen = '<div data-titulo="Resumen" style="display:none"></div><table style="display:none"><thead><tr><th data-titulo="Resumen">Resumen</th><th>Este período</th>' + (ant ? '<th>' + contraQue + '</th>' : '') + '</tr></thead><tbody>'
    + [['Personas', r.visitantes, A.visitantes], ['Visitas', r.visitas, A.visitas], ['Páginas vistas', r.paginas, A.paginas], ['Escribieron por WhatsApp', Em.whatsapp, (A.embudo || {}).whatsapp], ['Solicitudes enviadas', Em.solEnviada, (A.embudo || {}).solEnviada], ['Volvieron otro día', r.volvieron, A.volvieron], ['Tiempo típico (segundos)', r.tiempoTipico, A.tiempoTipico], ['Se fueron sin hacer nada', r.rebote, A.rebote]]
      .map(function(x){ return '<tr><td>' + x[0] + '</td><td>' + (+x[1] || 0) + '</td>' + (ant ? '<td>' + (+x[2] || 0) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table>';

  return '<div class="page">' + cabeza + '<div id="met-cont" data-titulo-base="Métricas">' + exportar + tablaResumen + kpis + avisoComparar + resumen + cardGraf
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:0 14px;align-items:start">'
    + '<div>' + card('Embudo hasta la solicitud', embudo) + card('De dónde vienen', tablaGrupo('fuente', 'Fuente', metNombreFuente, 8), '"Contacto": escribieron o pidieron el crédito') + card('Campañas y enlaces marcados', htmlCamp) + '</div>'
    + '<div>' + card('Motos', tablaMotos, 'visitas que abrieron cada moto') + card('Teléfono o computadora', tablaGrupo('disp', 'Dispositivo', function(k){ return MET_DISP[k] || k; })) + card('Por dónde entran', tablaGrupo('entrada', 'Página', function(k){ return MET_PAGINAS[k] || k; }))
    + (_met.rango === 1 ? '' : card('Horas del día', grafHoras, 'hora de Caracas') + card('Días de la semana', grafSemana)) + '</div>'
    + '</div>'
    + '<div style="font-size:11px;color:var(--ink3);margin-top:4px;line-height:1.55">Una visita es un rato seguido en la página (30 minutos sin moverse empieza otra). "Personas" cuenta navegadores distintos: la misma persona en el teléfono y en la computadora cuenta dos veces. El tiempo en la página se mide del primer al último movimiento. No se guarda ningún dato personal.</div>'
    + '</div></div>';
};
