// Pagasi module: metricas (14-oct-2026). Quién entra a la página pública, de dónde viene y
// qué hace: visitas por día, fuentes, teléfono o computadora, motos más vistas, horas y el
// embudo hasta la solicitud. Todo anónimo (assets/public/metricas.js).
// 23-oct-2026 (Adam: "quiero que se vean como las del dashboard… pon algunos redondos… que tenga
// la misma sinergia que el dashboard"): las mismas piezas del Dashboard — tarjetas kx (la azul
// protagonista, íconos, pastillas, anillo), gráficos de barras con degradado y el selector Día/Hora
// (dash-seg), y gráficos redondos para fuentes, dispositivos y páginas. Las tablas quedan abajo
// para el Excel/PDF.
function metCambiarRango(n){ _met.rango = n; metCargar(n); nav('metricas'); }

var _MET_COL = ['#2563EB', '#06B06A', '#F59E0B', '#8B5CF6'], _MET_OTROS = '#94A3B8';   // los del Dashboard
var _MET_SERIES = [
  { id: 'personas', nombre: 'Personas', col: 'var(--p1)', rgb: '37,99,235', rgbD: '59,130,246', uni: 'personas' },
  { id: 'visitas', nombre: 'Visitas', col: '#8B5CF6', rgb: '139,92,246', rgbD: '157,123,250', uni: 'visitas' },
  { id: 'whatsapp', nombre: 'WhatsApp', col: 'var(--green)', rgb: '0,184,118', rgbD: '0,214,143', uni: 'escribieron' },
  { id: 'solicitudes', nombre: 'Solicitudes', col: '#0E9488', rgb: '14,148,136', rgbD: '20,184,166', uni: 'solicitudes' }
];
var _MET_ICO = {
  personas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  whatsapp: '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
  solicitud: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><path d="M8.5 13h7"/><path d="M8.5 17h4.5"/>',
  salida: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  idea: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  embudo: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
  brujula: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  telefono: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>',
  entrada: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
  moto: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5h6l3.5-7h3"/><path d="M15 9.5l3.5 7"/><path d="M8 9.5h4"/>',
  campana: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 8.5a5 5 0 0 1 0 7"/><path d="M19 5.5a9 9 0 0 1 0 13"/>',
  calendario: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M16 2.5v4"/><path d="M8 2.5v4"/><path d="M3 10h18"/>'
};
function _metSvg(k, col){ return '<svg viewBox="0 0 24 24" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + _MET_ICO[k] + '</svg>'; }

var _MET_CSS = '<style id="met-css">'
  + '.met-k{cursor:default}.met-k:hover{transform:none}'
  + '.met-g2,.met-g3{display:grid;gap:16px;margin-bottom:18px;align-items:start}.met-g2{grid-template-columns:repeat(2,minmax(0,1fr))}.met-g3{grid-template-columns:repeat(3,minmax(0,1fr))}'
  + '@media(max-width:1180px){.met-g3{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:820px){.met-g2,.met-g3{grid-template-columns:1fr}}'
  + '.met-g2 .kx-card,.met-g3 .kx-card{min-height:0;height:100%}'
  + '.met-dona{display:flex;align-items:center;gap:16px;margin-top:14px}.met-dona-c{position:relative;width:132px;height:132px;flex-shrink:0}'
  + '.met-dona-t{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}'
  + '.met-dona-t b{font-family:var(--fd);font-weight:900;font-size:19px;color:var(--ink);line-height:1;font-variant-numeric:tabular-nums}.met-dona-t small{font-size:10px;color:var(--ink3);font-weight:700;margin-top:3px}'
  + '.met-ley{flex:1;min-width:0;gap:9px}.met-ley .met-cv{font-size:10.5px;color:var(--ink3);white-space:nowrap;min-width:58px;text-align:right}'
  + '@media(max-width:420px){.met-dona{flex-direction:column;align-items:stretch}.met-dona-c{margin:0 auto}}'
  + '.met-ideas{display:flex;flex-direction:column;gap:11px;margin-top:14px}.met-ideas>div{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:var(--ink2);line-height:1.5}.met-ideas b{color:var(--ink)}'
  + '.met-ideas .kx-bd{margin-top:1px}'
  + '.met-emb{display:flex;flex-direction:column;gap:10px;margin-top:14px}.met-emb .kx-r{margin-bottom:5px}.met-emb small{font-size:10.5px;color:var(--ink3);font-weight:700}'
  + '.met-emb .met-pierde .kx-r span{color:var(--red);font-weight:800}'
  + '.met-motos{display:flex;flex-direction:column;gap:11px;margin-top:14px}.met-motos .kx-r{margin-bottom:5px}.met-motos .kx-r span{display:flex;align-items:center;gap:8px;min-width:0}.met-motos .kx-r span em{font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
  + '.met-motos small{display:block;font-size:10.5px;color:var(--ink3);margin-top:4px}'
  + '.met-tw{overflow-x:auto}.met-tw table{min-width:440px}.met-tw th{padding:8px 10px}.met-tw td{padding:8px 10px;font-size:12.5px}.met-tw td.n,.met-tw th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}'
  + '.met-tablas>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;font-weight:800;font-size:13.5px;color:var(--ink2)}.met-tablas>summary::-webkit-details-marker{display:none}'
  + '.met-tablas>summary:after{content:"▾";margin-left:auto;color:var(--ink3);transition:transform .15s}.met-tablas[open]>summary:after{transform:rotate(180deg)}'
  + '.met-tablas h4{font-size:12px;font-weight:800;color:var(--ink2);margin:18px 0 6px}'
  + '</style>';

// ── Gráficos (Chart.js, con el mismo estilo que los del Dashboard) ──
window._metCharts = window._metCharts || {};
function _metTema(){
  var dark = typeof document !== 'undefined' && document.documentElement && document.documentElement.getAttribute('data-theme') === 'dark';
  return { dark: dark, ink3: dark ? '#6B6896' : '#9794BB', tipBg: dark ? '#252844' : '#fff', tipTit: dark ? '#E8E6FF' : '#0B0B1E', tipTxt: dark ? '#B0ADDB' : '#4A4870', surf: dark ? '#181A2E' : '#FFFFFF' };
}
// Barras con degradado; la resaltada (hoy, o la hora con más) va llena, como la última del Dashboard
function _metGrad(rgb, fuerte){
  return function(context){
    var chart = context.chart, a = chart.chartArea, f = context.dataIndex === fuerte;
    if(!a) return f ? 'rgba(' + rgb + ',1)' : 'rgba(' + rgb + ',0.25)';
    var g = chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
    if(f){ g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(1, 'rgba(' + rgb + ',0.6)'); }
    else { g.addColorStop(0, 'rgba(' + rgb + ',0.34)'); g.addColorStop(1, 'rgba(' + rgb + ',0.08)'); }
    return g;
  };
}
function _metChart(id, cfg){
  var cv = typeof document !== 'undefined' && document.getElementById(id);
  if(!cv || typeof Chart === 'undefined') return;
  if(_metCharts[id]){ try{ _metCharts[id].destroy(); }catch(e){} }
  if(_met._sinAnim) cfg.options.animation = false;
  _metCharts[id] = new Chart(cv, cfg);
}
// Mismo grosor en todas las vistas (Adam, 23-oct: con 7 días "barras muy gruesas, diferentes a las otras"): con
// 30 días o 24 horas cada barra mide unos 10 px; con 7 días ya no se ensanchan, quedan igual de finas.
var MET_BARRA_PX = 12;
function _metBarras(id, d, rgb, uni, grosor){
  var T = _metTema();
  _metChart(id, { type: 'bar', data: { labels: d.etq, datasets: [{ data: d.v, backgroundColor: _metGrad(rgb, d.fuerte), borderWidth: 0, borderRadius: 6, borderSkipped: false, maxBarThickness: grosor || MET_BARRA_PX }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: T.tipBg, borderColor: 'rgba(' + rgb + ',0.25)', borderWidth: 1, titleColor: T.tipTit, bodyColor: T.tipTxt, padding: 10,
        callbacks: { title: function(it){ return d.tit[it[0].dataIndex]; }, label: function(ctx){ return ' ' + (ctx.raw || 0).toLocaleString('es-VE') + ' ' + uni; } } } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: T.ink3, font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        y: { beginAtZero: true, grid: { color: 'rgba(' + rgb + ',0.07)' }, border: { display: false }, ticks: { color: T.ink3, font: { size: 9 }, maxTicksLimit: 5, precision: 0 } } } } });
}
function _metDona(id, partes){
  var T = _metTema();
  _metChart(id, { type: 'doughnut', data: { labels: partes.map(function(p){ return p.nombre; }), datasets: [{ data: partes.map(function(p){ return p.v; }), backgroundColor: partes.map(function(p){ return p.col; }), borderColor: T.surf, borderWidth: 2, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { backgroundColor: T.tipBg, borderColor: 'rgba(37,99,235,0.2)', borderWidth: 1, titleColor: T.tipTit, bodyColor: T.tipTxt, padding: 10,
        callbacks: { label: function(ctx){ var tot = ctx.dataset.data.reduce(function(a, b){ return a + b; }, 0) || 1; return ' ' + (ctx.raw || 0).toLocaleString('es-VE') + ' visitas · ' + Math.round(ctx.raw / tot * 100) + '%'; } } } } } });
}
// Día / Hora en un gráfico, sin volver a armar la página (como setDashPeriodo)
function metVista(serie, vista){
  _met.vistas = _met.vistas || {}; _met.vistas[serie] = vista;
  ['dia', 'hora'].forEach(function(v){ var b = document.getElementById('met-s-' + serie + '-' + v); if(b) b.className = v === vista ? 'on' : ''; });
  _metDibujarSerie(serie);
}
function _metDibujarSerie(serie){
  var D = window._metDatos; if(!D) return;
  var s = _MET_SERIES.filter(function(x){ return x.id === serie; })[0], vista = D.soloHora ? 'hora' : ((_met.vistas || {})[serie] || 'dia');
  var d = D[vista][serie], sub = document.getElementById('met-cs-' + serie);
  if(sub) sub.textContent = d.sub;
  _metBarras('met-c-' + serie, d, _metTema().dark ? s.rgbD : s.rgb, s.uni);
}
function _metDibujar(){
  var D = window._metDatos; if(!D || typeof Chart === 'undefined') return;
  _MET_SERIES.forEach(function(s){ _metDibujarSerie(s.id); });
  Object.keys(D.donas).forEach(function(k){ _metDona('met-d-' + k, D.donas[k]); });
  if(D.semana) _metBarras('met-c-semana', D.semana, _metTema().dark ? '157,123,250' : '139,92,246', 'visitas');
  _met._sinAnim = false;
}

PG.metricas = function(){
  var admin = typeof isAdminUser === 'function' && isAdminUser();
  if(!admin && !(typeof hasModuleAccess === 'function' && hasModuleAccess('metricas'))) return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">Pídele a un administrador el permiso de <b>Métricas web</b>.</div></div>';
  if(typeof document !== 'undefined' && document.head && !document.getElementById('met-css')) document.head.insertAdjacentHTML('beforeend', _MET_CSS);
  if(!_met.docs && !_met.cargando && !_met.error) metCargar(_met.rango);
  var E = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]; }); };
  var N = function(n){ return (+n || 0).toLocaleString('es-VE'); };
  var pc = function(a, b){ return b ? Math.round(a / b * 100) : 0; };
  var pct = function(a, b){ return b ? Math.round(a / b * 100) + '%' : '—'; };
  var rangos = [[1, 'Hoy'], [7, '7 días'], [30, '30 días']];
  var cabeza = pageBanner('Analítica · página web', 'Métricas web', 'Quién entra a pagasi.io, de dónde viene y qué hace · anónimo, sin datos personales',
    rangos.map(function(x){ return { label: x[1], onclick: 'metCambiarRango(' + x[0] + ')', primary: _met.rango === x[0] }; }).concat([{ label: '↻', onclick: 'metCargar(_met.rango,true)' }]));
  if(_met.error) return '<div class="page">' + cabeza + '<div class="card" style="padding:18px;color:var(--red);font-size:13px">' + E(_met.error) + '</div></div>';
  if(!_met.docs) return '<div class="page">' + cabeza + '<div class="card" style="padding:30px;text-align:center;color:var(--ink3)">Cargando las visitas…</div></div>';

  var hoy = _metHoyVE(), horaAhora = _metHoraVE(), P = metPeriodos(_met.rango, hoy, horaAhora), esHoy = _met.rango === 1;
  var r = metResumen(_met.docs, P.desde, P.hasta);
  if(!r.visitas) return '<div class="page">' + cabeza + '<div class="card" style="padding:30px;text-align:center;color:var(--ink3);line-height:1.6">Todavía no hay visitas en este período.<br><span style="font-size:12px">Se cuentan desde que se publicaron las métricas. Las visitas del personal de PAGASI no se cuentan.</span></div></div>';
  var ant = P.comparable ? metResumen(_met.docs, P.desdeAnt, P.hastaAnt, horaAhora) : null, A = ant || {}, Em = r.embudo;
  var contraQue = esHoy ? 'ayer a esta hora' : 'los ' + _met.rango + ' días anteriores';
  var periodo = esHoy ? 'Hoy' : _met.rango + ' días';
  var deAyer = 0;
  if(esHoy){
    var vAyer = {}, vHoy = {}, fAyer = _metRestarDias(hoy, 1);
    _met.docs.forEach(function(d){ if(d.vid && d.fecha === fAyer) vAyer[d.vid] = 1; if(d.vid && d.fecha === hoy) vHoy[d.vid] = 1; });
    deAyer = Object.keys(vHoy).filter(function(v){ return vAyer[v]; }).length;
  }
  // La pastilla de cada tarjeta: cuánto cambió contra el período anterior (o el período, si no hay con qué)
  var chip = function(a, b, col, bg){
    var c = ant ? metCambio(a, b) : null;
    if(c === null) return '<span class="kx-chip" style="background:' + bg + ';color:' + col + '">' + periodo + '</span>';
    var bueno = c >= 0;
    return '<span class="kx-chip" title="' + N(b) + ' ' + contraQue + '" style="background:' + (bueno ? 'rgba(0,168,112,.12)' : 'rgba(229,57,91,.12)') + ';color:' + (bueno ? 'var(--green)' : 'var(--red)') + '">' + (c > 0 ? '▲ ' : c < 0 ? '▼ ' : '= ') + Math.abs(c) + '%</span>';
  };

  // ── Fila 1: las tarjetas de arriba, como el Dashboard ──
  var cHero = ant ? metCambio(r.visitantes, A.visitantes) : null;
  var _em = function(t){ return String(t).split('').reduce(function(a, c){ return a + (c === '.' || c === ',' ? 0.25 : 0.57); }, 0); };
  var kxk = ((_em(N(r.visitantes)) + 0.7 + _em(N(r.visitas))) * 1.03).toFixed(2);
  var dsp = r.disp, totD = (dsp.telefono + dsp.computadora + dsp.tablet) || 1;
  var hero = '<div class="kx-hero met-k">'
    + '<div class="kx-top"><span class="kx-ico kx-ico-w">' + _metSvg('personas', '#fff') + '</span><span class="kx-tit">Personas que entraron</span><span class="kx-chip kx-chip-w"' + (cHero !== null ? ' title="' + N(A.visitantes) + ' ' + contraQue + '"' : '') + '>' + (cHero !== null ? (cHero > 0 ? '▲ ' : cHero < 0 ? '▼ ' : '= ') + Math.abs(cHero) + '% vs ' + (esHoy ? 'ayer' : 'antes') : periodo) + '</span></div>'
    + '<div class="kx-nums" style="--kxk:' + kxk + '"><div><div class="kx-big">' + N(r.visitantes) + '</div><div class="kx-sub">personas distintas</div></div><div class="kx-ncred"><div class="kx-big">' + N(r.visitas) + '</div><div class="kx-sub">visitas</div></div></div>'
    + '<div class="kx-split"><i style="width:' + (dsp.telefono / totD * 100).toFixed(2) + '%;background:#fff"></i><i style="width:' + (dsp.computadora / totD * 100).toFixed(2) + '%;background:#A9C6FF"></i>' + (dsp.tablet ? '<i style="width:' + (dsp.tablet / totD * 100).toFixed(2) + '%;background:#6E9BFA"></i>' : '') + '</div>'
    + '<div class="kx-stats"><div><small>Desde el teléfono</small><b>' + pc(dsp.telefono, totD) + '%</b></div><div><small>Computadora</small><b>' + pc(dsp.computadora + dsp.tablet, totD) + '%</b></div><div><small>' + (esHoy ? 'Ya vinieron ayer' : 'Volvieron otro día') + '</small><b>' + N(esHoy ? deAyer : r.volvieron) + '</b></div></div>'
    + '</div>';
  var card = function(ico, col, bg, tit, chp, cuerpo, extra){ return '<div class="kx-card met-k' + (extra || '') + '"><div class="kx-top"><span class="kx-ico" style="background:' + bg + '">' + _metSvg(ico, col) + '</span><span class="kx-tit">' + tit + '</span>' + (chp || '') + '</div>' + cuerpo + '</div>'; };
  // WhatsApp: barritas de los últimos 7 días (u horas, si es hoy), como "Mora por mes"
  var mini = [];
  if(esHoy){ for(var hh = Math.max(0, horaAhora - 6); hh <= horaAhora; hh++) mini.push({ v: r.horasDet.whatsapp[hh], l: _metHoraTexto(hh).replace(' ', '') }); }
  else { for(var dd = 6; dd >= 0; dd--){ var fd = _metRestarDias(hoy, dd); mini.push({ v: (r.porDia[fd] || {}).whatsapp || 0, l: MET_DIAS[new Date(fd + 'T12:00:00').getDay()].slice(0, 2) }); } }
  var miniMax = Math.max(1, Math.max.apply(null, mini.map(function(x){ return x.v; })));
  var kWa = card('whatsapp', 'var(--green)', 'rgba(0,168,112,.12)', 'WhatsApp', chip(Em.whatsapp, (A.embudo || {}).whatsapp, 'var(--green)', 'rgba(0,168,112,.12)'),
    '<div class="kx-big" style="color:var(--green)">' + N(Em.whatsapp) + '</div><div class="kx-sub">escribieron · ' + pct(Em.whatsapp, r.visitas) + ' de las visitas</div>'
    + '<div class="kx-pie"><div class="kx-mes">' + mini.map(function(x, i){ return '<div><em>' + x.v + '</em><i style="height:' + Math.max(3, Math.round(x.v / miniMax * 38)) + 'px;background:var(--green)' + (i === mini.length - 1 ? '' : ';opacity:.4') + '"></i><small>' + x.l + '</small></div>'; }).join('') + '</div></div>');
  var maxSol = Math.max(1, Em.solInicio, Em.solEnviada);
  var kSol = card('solicitud', '#0E9488', 'rgba(14,148,136,.12)', 'Solicitudes', chip(Em.solEnviada, (A.embudo || {}).solEnviada, '#0E9488', 'rgba(14,148,136,.12)'),
    '<div class="kx-big" style="color:#0E9488">' + N(Em.solEnviada) + '</div><div class="kx-sub">enviadas · ' + pct(Em.solEnviada, r.visitas) + ' de las visitas</div>'
    + '<div class="kx-pie kx-cmp"><div><div class="kx-r"><span>Empezaron a llenarla</span><b>' + N(Em.solInicio) + '</b></div><div class="kx-t"><i style="width:' + (Em.solInicio / maxSol * 100).toFixed(2) + '%;background:rgba(14,148,136,.45)"></i></div></div>'
    + '<div><div class="kx-r"><span>La enviaron</span><b style="color:#0E9488">' + N(Em.solEnviada) + ' · ' + pct(Em.solEnviada, Em.solInicio) + '</b></div><div class="kx-t"><i style="width:' + (Em.solEnviada / maxSol * 100).toFixed(2) + '%;background:#0E9488"></i></div></div></div>');
  var circ = 2 * Math.PI * 26, pReb = pc(r.rebote, r.visitas);
  var rebD = function(k){ var g = r.grupos.disp[k]; return g && g.visitas ? pc(g.rebote, g.visitas) + '%' : null; };
  var dReb = ant && A.visitas ? pReb - pc(A.rebote, A.visitas) : null;
  var kReb = card('salida', 'var(--red)', 'rgba(229,57,91,.12)', 'Se fueron',
    dReb === null ? '<span class="kx-chip" style="background:rgba(229,57,91,.12);color:var(--red)">' + periodo + '</span>' : '<span class="kx-chip" title="' + pc(A.rebote, A.visitas) + '% ' + contraQue + '" style="background:' + (dReb <= 0 ? 'rgba(0,168,112,.12)' : 'rgba(229,57,91,.12)') + ';color:' + (dReb <= 0 ? 'var(--green)' : 'var(--red)') + '">' + (dReb > 0 ? '▲ ' : dReb < 0 ? '▼ ' : '= ') + Math.abs(dReb) + ' pts</span>',
    '<div class="kx-mora"><div class="kx-ring"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(229,57,91,.14)" stroke-width="7"/><circle cx="32" cy="32" r="26" fill="none" stroke="var(--red)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (circ * pReb / 100).toFixed(2) + ' ' + circ.toFixed(2) + '"/></svg><div class="kx-rv"><b>' + pReb + '%</b><small>visitas</small></div></div>'
    + '<div><div class="kx-big" style="margin:0;color:var(--red)">' + N(r.rebote) + '</div><div class="kx-sub">vieron una página y no tocaron nada</div></div></div>'
    + '<div class="kx-pie kx-chips">' + [['telefono', 'Teléfono'], ['computadora', 'Computadora']].filter(function(x){ return rebD(x[0]); }).map(function(x){ return '<span class="kx-c">' + x[1] + ' <b>' + rebD(x[0]) + '</b></span>'; }).join('') + '</div>');
  var kTiempo = card('reloj', '#E08E00', 'rgba(245,166,35,.15)', 'Tiempo en la web', '',
    '<div class="kx-big">' + (r.conTiempo ? metTiempo(r.tiempoTipico) : '—') + '</div><div class="kx-sub">la mitad se queda más que esto</div>'
    + '<div class="kx-pie kx-prom"><div class="kx-r"><span>Páginas por visita</span><b>' + (r.paginas / r.visitas).toLocaleString('es-VE', { maximumFractionDigits: 1 }) + '</b></div><div class="kx-r"><span>Miraron una moto</span><b>' + pct(Em.moto, r.visitas) + '</b></div></div>');
  var fila1 = '<div class="kx-row">' + hero + kWa + kSol + kReb + kTiempo + '</div>';
  var aviso = (!ant && !esHoy) ? '<div style="font-size:11.5px;color:var(--ink3);margin:-8px 0 14px">La comparación con los ' + _met.rango + ' días anteriores aparece cuando haya datos de esos días (las métricas empezaron el 14-oct).</div>' : '';

  // ── Fila 2: los 4 gráficos, como los del Dashboard (Día / Hora) ──
  var fc = function(f){ return f.slice(8) + '/' + f.slice(5, 7); };
  var dias = []; for(var i = _met.rango - 1; i >= 0; i--) dias.push(_metRestarDias(hoy, i));
  var valDia = function(f, s){ var d = r.porDia[f] || {}; return s === 'personas' ? (d.visitantes || 0) : (d[s] || 0); };
  var total = { personas: r.visitantes, visitas: r.visitas, whatsapp: Em.whatsapp, solicitudes: Em.solEnviada };
  var horasVer = []; for(var h = 0; h <= (esHoy ? horaAhora : 23); h++) horasVer.push(h);
  var D = { soloHora: esHoy, dia: {}, hora: {}, donas: {}, semana: null };
  _MET_SERIES.forEach(function(s){
    var vd = dias.map(function(f){ return valDia(f, s.id); }), prom = vd.reduce(function(a, b){ return a + b; }, 0) / (vd.length || 1);
    D.dia[s.id] = { etq: dias.map(fc), tit: dias.map(function(f){ return MET_DIAS[new Date(f + 'T12:00:00').getDay()] + ' ' + fc(f) + (f === hoy ? ' (hasta ahora)' : ''); }), v: vd, fuerte: vd.length - 1,
      sub: 'Últimos ' + _met.rango + ' días · prom. ' + (Math.round(prom * 10) / 10).toLocaleString('es-VE') + '/día' };
    var vh = horasVer.map(function(hh){ return r.horasDet[s.id][hh]; }), pico = vh.indexOf(Math.max.apply(null, vh));
    D.hora[s.id] = { etq: horasVer.map(_metHoraTexto), tit: horasVer.map(function(hh){ return _metHoraTexto(hh) + ' (' + hh + ':00 – ' + hh + ':59)'; }), v: vh, fuerte: esHoy ? vh.length - 1 : pico,
      sub: (esHoy ? 'Hoy, hora por hora' : 'Por hora del día') + (vh[pico] ? ' · más a las ' + _metHoraTexto(horasVer[pico]) : '') };
  });
  var graficos = '<div class="dash-charts" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px">' + _MET_SERIES.map(function(s){
    var vista = esHoy ? 'hora' : ((_met.vistas || {})[s.id] || 'dia');
    var seg = esHoy ? '' : '<div class="dash-seg"><button id="met-s-' + s.id + '-dia" class="' + (vista === 'dia' ? 'on' : '') + '" onclick="metVista(\'' + s.id + '\',\'dia\')">Día</button><button id="met-s-' + s.id + '-hora" class="' + (vista === 'hora' ? 'on' : '') + '" onclick="metVista(\'' + s.id + '\',\'hora\')">Hora</button></div>';
    return '<div class="card"><div class="dash-head"><div class="dash-ch"><div class="ct" style="color:' + s.col + '">' + s.nombre + '</div>' + seg + '</div>'
      + '<div class="dash-big" style="color:' + s.col + '">' + N(total[s.id]) + '</div><div class="cs dash-cs"><span id="met-cs-' + s.id + '">' + D[vista][s.id].sub + '</span></div></div>'
      + '<div style="position:relative;height:160px;min-height:160px"><canvas id="met-c-' + s.id + '" role="img" aria-label="' + s.nombre + ' por ' + (vista === 'dia' ? 'día' : 'hora') + '; los números están en las tablas de abajo"></canvas></div></div>';
  }).join('') + '</div>';

  // ── Fila 3: lo más importante y el embudo ──
  var ideas = metIdeas(r);
  var kIdeas = card('idea', '#E08E00', 'rgba(245,166,35,.15)', 'Lo más importante', '<span class="kx-chip" style="background:rgba(245,166,35,.15);color:#B86E00">' + periodo + '</span>',
    '<div class="met-ideas">' + (ideas.length ? ideas.map(function(x, k){ return '<div><span class="kx-bd kx-bd-a">' + (k + 1) + '</span><span>' + x + '</span></div>'; }).join('') : '<div class="kx-vacio">Todavía hay pocas visitas para sacar conclusiones.</div>') + '</div>');
  var pasos = [['Entraron a la página', Em.visitas], ['Miraron una moto', Em.moto], ['Usaron el simulador', Em.simulo], ['Tocaron "La quiero"', Em.quiero], ['Empezaron la solicitud', Em.solInicio], ['Enviaron la solicitud', Em.solEnviada]];
  var peor = -1, peorT = 2;
  pasos.forEach(function(p, k){ if(k && pasos[k - 1][1] >= 10){ var t = p[1] / pasos[k - 1][1]; if(t < peorT){ peorT = t; peor = k; } } });
  var kEmb = card('embudo', 'var(--p1)', 'rgba(37,99,235,.12)', 'Embudo hasta la solicitud', '<span class="kx-chip" style="background:rgba(37,99,235,.12);color:var(--p1)">' + pct(Em.solEnviada, Em.visitas) + ' llega</span>',
    '<div class="met-emb">' + pasos.map(function(p, k){
      return '<div' + (k === peor ? ' class="met-pierde"' : '') + '><div class="kx-r"><span>' + E(p[0]) + (k === peor ? ' · aquí se pierde más' : '') + '</span><b>' + N(p[1]) + ' <small>' + pct(p[1], Em.visitas) + '</small></b></div>'
        + '<div class="kx-t"><i style="width:' + Math.max(1, p[1] / Math.max(1, Em.visitas) * 100).toFixed(2) + '%;background:' + (k === peor ? 'var(--red)' : 'var(--p1)') + (k ? ';opacity:' + (1 - k * 0.09).toFixed(2) : '') + '"></i></div>'
        + (k ? '<small>' + pct(p[1], pasos[k - 1][1]) + ' de los del paso anterior</small>' : '') + '</div>';
    }).join('') + '</div>');
  var fila3 = '<div class="met-g2">' + kIdeas + kEmb + '</div>';

  // ── Fila 4: los redondos ──
  var partes = function(tipo, nombre, max){
    var o = r.grupos[tipo], ks = Object.keys(o).sort(function(a, b){ return o[b].visitas - o[a].visitas; }), arr = [];
    ks.slice(0, max).forEach(function(k, i){ arr.push({ nombre: nombre(k), v: o[k].visitas, conv: pc(o[k].contactos, o[k].visitas), col: _MET_COL[i] }); });
    if(ks.length > max){ var resto = { nombre: 'Otras', v: 0, c: 0, col: _MET_OTROS }; ks.slice(max).forEach(function(k){ resto.v += o[k].visitas; resto.c += o[k].contactos; }); resto.conv = pc(resto.c, resto.v); arr.push(resto); }
    return arr;
  };
  var fuenteCorta = function(k){ return k === 'directo' ? 'Directo' : k === 'interno' ? 'Desde la misma web' : metNombreFuente(k); };
  D.donas.fuente = partes('fuente', fuenteCorta, 4);
  D.donas.disp = partes('disp', function(k){ return MET_DISP[k] || k; }, 3);
  D.donas.entrada = partes('entrada', function(k){ return MET_PAGINAS[k] || k; }, 4);
  var dona = function(k, ico, col, bg, tit){
    var ps = D.donas[k], tot = ps.reduce(function(a, p){ return a + p.v; }, 0);
    return card(ico, col, bg, tit, '<span class="kx-chip" style="background:' + bg + ';color:' + col + '">' + ps.length + (ps.length === 1 ? ' grupo' : ' grupos') + '</span>',
      '<div class="met-dona"><div class="met-dona-c"><canvas id="met-d-' + k + '" role="img" aria-label="' + E(tit) + ': ' + ps.map(function(p){ return E(p.nombre) + ' ' + pc(p.v, tot) + '%'; }).join(', ') + '"></canvas><div class="met-dona-t"><b>' + N(tot) + '</b><small>visitas</small></div></div>'
      + '<div class="kx-list met-ley">' + ps.map(function(p){ return '<div class="kx-li"><i class="kx-pt" style="background:' + p.col + '"></i><span class="kx-nm">' + E(p.nombre) + '</span><b>' + pc(p.v, tot) + '%</b><span class="met-cv" title="Escribieron por WhatsApp o pidieron el crédito">' + p.conv + '% escribe</span></div>'; }).join('') + '</div></div>');
  };
  var fila4 = '<div class="met-g3">' + dona('fuente', 'brujula', 'var(--p1)', 'rgba(37,99,235,.12)', 'De dónde vienen') + dona('disp', 'telefono', '#8B5CF6', 'rgba(139,92,246,.12)', 'Teléfono o computadora') + dona('entrada', 'entrada', 'var(--green)', 'rgba(0,168,112,.12)', 'Por dónde entran') + '</div>';

  // ── Fila 5: motos, días de la semana y campañas ──
  var motos = Object.keys(r.motosDet).map(function(k){ return [k, r.motosDet[k]]; }).filter(function(m){ return m[1].vistas; }).sort(function(a, b){ return b[1].vistas - a[1].vistas; });
  var topeMoto = motos.length ? motos[0][1].vistas : 1;
  var kMotos = card('moto', 'var(--p1)', 'rgba(37,99,235,.12)', 'Motos más vistas', '<span class="kx-chip" style="background:rgba(37,99,235,.12);color:var(--p1)">' + motos.length + ' motos</span>',
    motos.length ? '<div class="met-motos">' + motos.slice(0, 6).map(function(m, k){ var x = m[1];
      return '<div><div class="kx-r"><span><span class="kx-bd ' + (k === 0 ? 'kx-bd-g' : 'kx-bd-a') + '">' + (k + 1) + '</span><em>' + E(metNombreMoto(m[0])) + '</em></span><b>' + N(x.vistas) + '</b></div><div class="kx-t"><i style="width:' + (x.vistas / topeMoto * 100).toFixed(2) + '%;background:var(--p1)' + (k ? ';opacity:.55' : '') + '"></i></div>'
        + '<small>' + pct(x.simulo, x.vistas) + ' simuló · ' + pct(x.quiero, x.vistas) + ' tocó "La quiero"' + (x.whatsapp ? ' · ' + x.whatsapp + ' WhatsApp' : '') + '</small></div>'; }).join('') + '</div>' : '<div class="kx-vacio">Nadie ha abierto una moto en este período.</div>');
  var semOrden = [1, 2, 3, 4, 5, 6, 0], semMax = r.semana.indexOf(Math.max.apply(null, r.semana));
  if(!esHoy) D.semana = { etq: semOrden.map(function(d){ return MET_DIAS[d].slice(0, 3); }), tit: semOrden.map(function(d){ return MET_DIAS[d]; }), v: semOrden.map(function(d){ return r.semana[d]; }), fuerte: semOrden.indexOf(semMax) };
  var kSemana = esHoy ? '' : card('calendario', '#8B5CF6', 'rgba(139,92,246,.12)', 'Días de la semana', '<span class="kx-chip" style="background:rgba(139,92,246,.12);color:#8B5CF6">más el ' + MET_DIAS[semMax].toLowerCase() + '</span>',
    '<div style="position:relative;flex:1;min-height:190px;margin-top:14px"><canvas id="met-c-semana" role="img" aria-label="Visitas por día de la semana"></canvas></div>');
  var camps = Object.keys(r.grupos.campana).map(function(k){ return [k, r.grupos.campana[k]]; }).sort(function(a, b){ return b[1].visitas - a[1].visitas; });
  var nomCamp = function(k){ return k === 'medio: social' ? 'Biografía de Instagram' : k; };
  var kCamp = card('campana', '#E08E00', 'rgba(245,166,35,.15)', 'Campañas y enlaces', '<span class="kx-chip" style="background:rgba(245,166,35,.15);color:#B86E00">' + camps.length + '</span>',
    (camps.length ? '<div class="kx-list" style="margin-top:14px">' + camps.slice(0, 5).map(function(c){ return '<div class="kx-li"><span class="kx-bd kx-bd-a">' + N(c[1].visitas) + '</span><span class="kx-nm">' + E(nomCamp(c[0])) + '</span><b>' + pct(c[1].contactos, c[1].visitas) + '</b></div>'; }).join('') + '</div>' : '')
    + '<div class="kx-pie" style="font-size:11.5px;color:var(--ink3);line-height:1.55">Para saber qué publicación o anuncio trae gente, compártelo con un enlace marcado, por ejemplo <b style="color:var(--ink2);word-break:break-all">pagasi.io/?utm_campaign=veloz</b>. Aquí sale "veloz" con sus visitas y el % que escribe.</div>');
  var fila5 = '<div class="' + (esHoy ? 'met-g2' : 'met-g3') + '">' + kMotos + kSemana + kCamp + '</div>';

  // ── Abajo: todos los números en tablas (Excel/PDF) ──
  var tabla = function(cab, filas){ return '<div class="met-tw"><table><thead><tr>' + cab.map(function(c, i){ return '<th' + (i ? ' class="n"' : '') + '>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + filas.map(function(f){ return '<tr>' + f.map(function(c, i){ return '<td' + (i ? ' class="n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; };
  var grupoFilas = function(tipo, nombre){ var o = r.grupos[tipo]; return Object.keys(o).sort(function(a, b){ return o[b].visitas - o[a].visitas; }).map(function(k){ var g = o[k]; return [E(nombre(k)), N(g.visitas), N(g.personas), N(g.whatsapp), N(g.solEnviada), pct(g.contactos, g.visitas)]; }); };
  var cabG = function(t){ return [t, 'Visitas', 'Personas', 'WhatsApp', 'Solicitudes', 'Escribe o pide']; };
  var tDias = esHoy ? tabla(['Hora', 'Personas', 'Visitas', 'WhatsApp', 'Solicitudes'], horasVer.map(function(hh){ return [_metHoraTexto(hh), N(r.horasDet.personas[hh]), N(r.horasDet.visitas[hh]), N(r.horasDet.whatsapp[hh]), N(r.horasDet.solicitudes[hh])]; }))
    : tabla(['Día', 'Personas', 'Visitas', 'WhatsApp', 'Solicitudes'], dias.map(function(f){ var d = r.porDia[f] || {}; return [MET_DIAS[new Date(f + 'T12:00:00').getDay()].slice(0, 3) + ' ' + fc(f), N(d.visitantes), N(d.visitas), N(d.whatsapp), N(d.solicitudes)]; }));
  var tablas = '<details class="card met-tablas" style="padding:16px 18px;margin-bottom:14px"><summary><span class="kx-ico" style="background:rgba(127,140,180,.14)">' + _metSvg('solicitud', 'var(--ink2)') + '</span>Todos los números en tablas</summary>'
    + '<h4 data-titulo="' + (esHoy ? 'Hora por hora' : 'Día por día') + '">' + (esHoy ? 'Hora por hora' : 'Día por día') + '</h4>' + tDias
    + '<h4>Embudo hasta la solicitud</h4>' + tabla(['Paso', 'Visitas', 'Del total', 'Del paso anterior'], pasos.map(function(p, k){ return [E(p[0]), N(p[1]), pct(p[1], Em.visitas), k ? pct(p[1], pasos[k - 1][1]) : '']; }))
    + '<h4>De dónde vienen</h4>' + tabla(cabG('Fuente'), grupoFilas('fuente', metNombreFuente))
    + '<h4>Teléfono o computadora</h4>' + tabla(cabG('Dispositivo'), grupoFilas('disp', function(k){ return MET_DISP[k] || k; }))
    + '<h4>Por dónde entran</h4>' + tabla(cabG('Página'), grupoFilas('entrada', function(k){ return MET_PAGINAS[k] || k; }))
    + (camps.length ? '<h4>Campañas y enlaces</h4>' + tabla(cabG('Campaña'), grupoFilas('campana', nomCamp)) : '')
    + '<h4>Motos</h4>' + tabla(['Moto', 'La abrieron', 'Simularon', '"La quiero"', 'WhatsApp'], motos.map(function(m){ var x = m[1]; return [E(metNombreMoto(m[0])), N(x.vistas), N(x.simulo), N(x.quiero), N(x.whatsapp)]; }))
    + '</details>';
  // Para el Excel: los números de arriba en una tabla (no se ve en pantalla)
  var tablaResumen = '<div data-titulo="Resumen" style="display:none"></div><table style="display:none"><thead><tr><th>Resumen</th><th>Este período</th>' + (ant ? '<th>' + contraQue + '</th>' : '') + '</tr></thead><tbody>'
    + [['Personas', r.visitantes, A.visitantes], ['Visitas', r.visitas, A.visitas], ['Páginas vistas', r.paginas, A.paginas], ['Escribieron por WhatsApp', Em.whatsapp, (A.embudo || {}).whatsapp], ['Solicitudes enviadas', Em.solEnviada, (A.embudo || {}).solEnviada], ['Volvieron otro día', r.volvieron, A.volvieron], ['Tiempo típico (segundos)', r.tiempoTipico, A.tiempoTipico], ['Se fueron', r.rebote, A.rebote]]
      .map(function(x){ return '<tr><td>' + x[0] + '</td><td>' + (+x[1] || 0) + '</td>' + (ant ? '<td>' + (+x[2] || 0) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table>';
  var exportar = typeof pgBotonesExportar === 'function' ? pgBotonesExportar('met-cont', 'Métricas web · ' + (esHoy ? 'hoy' : _met.rango + ' días')) : '';

  window._metDatos = D;
  _met._sinAnim = !!window._rtRenderizando;   // en los redibujos por tiempo real, sin animación (como el Dashboard)
  if(typeof setTimeout === 'function') setTimeout(_metDibujar, 30);
  return '<div class="page">' + cabeza + '<div id="met-cont" data-titulo-base="Métricas">' + exportar + tablaResumen + fila1 + aviso + graficos + fila3 + fila4 + fila5 + tablas
    + '<div style="font-size:11px;color:var(--ink3);line-height:1.55">Una visita es un rato seguido en la página (30 minutos sin moverse empieza otra). "Personas" cuenta navegadores distintos: la misma persona en el teléfono y en la computadora cuenta dos veces. "Escribe" es el % de visitas que escribió por WhatsApp o pidió el crédito. No se guarda ningún dato personal.</div>'
    + '</div></div>';
};
