// Pagasi module: metricas (14-oct-2026). Quién entra a la página pública, de dónde viene y
// qué hace: visitas por día, fuentes, teléfono o computadora, motos más vistas, horas y el
// embudo hasta la solicitud. Todo anónimo (assets/public/metricas.js).
function metCambiarRango(n){ _met.rango = n; metCargar(n); nav('metricas'); }
PG.metricas = function(){
  var admin = typeof isAdminUser === 'function' && isAdminUser();
  if(!admin && !(typeof hasModuleAccess === 'function' && hasModuleAccess('metricas'))) return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">Pídele a un administrador el permiso de <b>Métricas web</b>.</div></div>';
  if(!_met.docs && !_met.cargando && !_met.error) metCargar(_met.rango);
  var E = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]; }); };
  var N = function(n){ return (+n || 0).toLocaleString('es-VE'); };
  var pct = function(a, b){ return b ? Math.round(a / b * 100) + '%' : '—'; };
  var rangos = [[1, 'Hoy'], [7, '7 días'], [30, '30 días']];
  var cabeza = pageBanner('Analítica · página web', 'Métricas web', 'Visitas anónimas de la página pública · sin datos personales',
    rangos.map(function(x){ return { label: x[1], onclick: 'metCambiarRango(' + x[0] + ')', primary: _met.rango === x[0] }; }).concat([{ label: '↻', onclick: 'metCargar(_met.rango,true)' }]));
  if(_met.error) return '<div class="page">' + cabeza + '<div class="card" style="padding:18px;color:var(--red);font-size:13px">' + E(_met.error) + '</div></div>';
  if(!_met.docs) return '<div class="page">' + cabeza + '<div class="card" style="padding:30px;text-align:center;color:var(--ink3)">Cargando las visitas…</div></div>';

  var hoy = _metHoyVE(), desde = metDesde(_met.rango, hoy), r = metResumen(_met.docs, desde, hoy);
  if(!r.visitas) return '<div class="page">' + cabeza + '<div class="card" style="padding:30px;text-align:center;color:var(--ink3);line-height:1.6">Todavía no hay visitas en este período.<br><span style="font-size:12px">Se cuentan desde que se publicaron las métricas. Las visitas del personal de PAGASI no se cuentan.</span></div></div>';

  var kpi = function(v, t, sub){ return '<div class="cf-kpi"><div class="cf-kpi-v">' + v + '</div><div class="cf-kpi-l">' + t + '</div>' + (sub ? '<div style="font-size:11px;color:var(--ink3);margin-top:2px">' + sub + '</div>' : '') + '</div>'; };
  var kpis = '<div class="cf-kpis" style="margin-bottom:14px">'
    + kpi(N(r.visitantes), 'Personas', 'navegadores distintos')
    + kpi(N(r.visitas), 'Visitas', N(r.paginas) + ' páginas vistas')
    + kpi(pct(r.disp.telefono, r.visitas), 'Desde el teléfono', N(r.disp.computadora) + ' desde computadora')
    + kpi(N(r.embudo.whatsapp), 'Escribieron por WhatsApp', pct(r.embudo.whatsapp, r.visitas) + ' de las visitas')
    + kpi(N(r.embudo.solEnviada), 'Solicitudes enviadas', pct(r.embudo.solEnviada, r.visitas) + ' de las visitas')
    + '</div>';

  // Visitas por dia: barras de un solo color, el detalle al pasar el mouse
  var dias = []; for(var i = _met.rango - 1; i >= 0; i--) dias.push(_metRestarDias(hoy, i));
  var maxDia = Math.max.apply(null, [1].concat(dias.map(function(f){ return (r.porDia[f] || {}).visitas || 0; })));
  var W = 640, H = 170, pad = 22, bw = Math.max(4, Math.min(34, (W - pad * 2) / dias.length - 4));
  var barras = dias.map(function(f, k){
    var v = (r.porDia[f] || {}).visitas || 0, p = (r.porDia[f] || {}).visitantes || 0;
    var x = pad + k * ((W - pad * 2) / dias.length) + (((W - pad * 2) / dias.length) - bw) / 2, h = Math.round(v / maxDia * (H - 46)), y = H - 22 - h;
    var etq = (dias.length <= 10 || k % Math.ceil(dias.length / 8) === 0) ? '<text x="' + (x + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="var(--ink3)">' + f.slice(8) + '/' + f.slice(5, 7) + '</text>' : '';
    var val = (v && dias.length <= 14) ? '<text x="' + (x + bw / 2) + '" y="' + (y - 4) + '" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink2)">' + v + '</text>' : '';
    return '<g><title>' + f.slice(8) + '/' + f.slice(5, 7) + ': ' + v + ' visitas · ' + p + ' personas</title>'
      + '<rect x="' + (x - 2) + '" y="10" width="' + (bw + 4) + '" height="' + (H - 32) + '" fill="transparent"/>'
      + (h ? '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="4" fill="var(--p1)"/>' : '<rect x="' + x + '" y="' + (H - 23) + '" width="' + bw + '" height="1" fill="var(--rim)"/>')
      + val + etq + '</g>';
  }).join('');
  var grafDias = _met.rango === 1 ? '' : '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">Visitas por día</div></div><div style="padding:0 16px 10px"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Visitas por día">'
    + '<line x1="' + pad + '" y1="' + (H - 22) + '" x2="' + (W - pad) + '" y2="' + (H - 22) + '" stroke="var(--rim)"/>' + barras + '</svg></div></div>';

  // Lista con barra horizontal (fuentes, motos, entradas)
  var lista = function(pares, total, nombre){
    if(!pares.length) return '<div style="font-size:12px;color:var(--ink3);padding:6px 0">Sin datos todavía.</div>';
    var max = Math.max.apply(null, pares.map(function(p){ return p[1]; }));
    return pares.map(function(p){
      return '<div style="margin:0 0 9px" title="' + E(nombre(p[0])) + ': ' + p[1] + ' (' + pct(p[1], total) + ')"><div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;margin-bottom:3px"><span>' + E(nombre(p[0])) + '</span><b>' + N(p[1]) + ' <span style="color:var(--ink3);font-weight:600">· ' + pct(p[1], total) + '</span></b></div>'
        + '<div style="height:8px;border-radius:4px;background:var(--surf2)"><div style="height:8px;border-radius:4px;background:var(--p1);width:' + Math.max(2, Math.round(p[1] / max * 100)) + '%"></div></div></div>';
    }).join('');
  };
  var orden = function(o){ return Object.keys(o).map(function(k){ return [k, o[k]]; }).sort(function(a, b){ return b[1] - a[1]; }); };
  var card = function(t, html, sub){ return '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">' + t + '</div>' + (sub ? '<div style="font-size:11px;color:var(--ink3)">' + sub + '</div>' : '') + '</div><div style="padding:0 16px 14px">' + html + '</div></div>'; };

  // Embudo: cuantas visitas llegan a cada paso
  var pasos = [['Visitaron la página', r.embudo.visitas], ['Miraron una moto', r.embudo.moto], ['Usaron el simulador', r.embudo.simulo], ['Tocaron "La quiero" o "Solicitar"', r.embudo.quiero], ['Empezaron la solicitud', r.embudo.solInicio], ['Enviaron la solicitud', r.embudo.solEnviada]];
  var embudo = pasos.map(function(p, k){
    var w = Math.max(2, Math.round(p[1] / Math.max(1, r.embudo.visitas) * 100));
    return '<div style="display:grid;grid-template-columns:minmax(150px,1.2fr) 3fr 90px;gap:10px;align-items:center;margin-bottom:8px" title="' + E(p[0]) + ': ' + p[1] + '">'
      + '<span style="font-size:12.5px">' + E(p[0]) + '</span><div style="height:16px;border-radius:4px;background:var(--surf2)"><div style="height:16px;border-radius:4px;background:var(--p1);opacity:' + (1 - k * 0.1) + ';width:' + w + '%"></div></div>'
      + '<b style="font-size:12.5px;text-align:right">' + N(p[1]) + ' <span style="color:var(--ink3);font-weight:600">' + pct(p[1], r.embudo.visitas) + '</span></b></div>';
  }).join('') + '<div style="font-size:11.5px;color:var(--ink3);margin-top:6px">Además, ' + N(r.embudo.whatsapp) + ' visita' + (r.embudo.whatsapp === 1 ? '' : 's') + ' tocaron un botón de WhatsApp.</div>';

  // Horas del dia (hora de Caracas)
  var maxH = Math.max.apply(null, [1].concat(r.horas));
  var horas = '<div style="display:flex;align-items:flex-end;gap:3px;height:90px">' + r.horas.map(function(v, h){
    return '<div title="' + h + ':00 – ' + h + ':59 · ' + v + ' visitas" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%"><div style="background:var(--p1);border-radius:4px 4px 0 0;height:' + (v ? Math.max(3, Math.round(v / maxH * 100)) : 0) + '%"></div></div>';
  }).join('') + '</div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--ink3);margin-top:4px"><span>12 am</span><span>6 am</span><span>12 pm</span><span>6 pm</span><span>11 pm</span></div>';

  var motos = orden(r.motos).slice(0, 10);
  var html = '<div class="page">' + cabeza + kpis + grafDias
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px">'
    + '<div>' + card('De dónde vienen', lista(orden(r.fuentes), r.visitas, function(k){ return MET_FUENTES[k] || k; })) + card('Embudo hasta la solicitud', embudo) + '</div>'
    + '<div>' + card('Motos más vistas', lista(motos, r.visitas, metNombreMoto), 'visitas que la abrieron') + card('Horas del día', horas, 'hora de Caracas') + card('Por dónde entran', lista(orden(r.entradas), r.visitas, function(k){ return MET_PAGINAS[k] || k; })) + '</div>'
    + '</div>'
    + '<div style="font-size:11px;color:var(--ink3);margin-top:4px">Una visita es un rato seguido en la página (30 minutos sin moverse empieza otra). "Personas" cuenta navegadores distintos: la misma persona en el teléfono y en la computadora cuenta dos veces. No se guarda ningún dato personal.</div>'
    + '</div>';
  return html;
};
