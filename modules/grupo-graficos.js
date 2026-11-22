// Pagasi module: grupo — los gráficos interactivos de «PAGASI 18 + 26» (21-nov-2026).
// Adam: "quedó brutal pero quiero los charts interactivos como el dashboard". Son gráficos de
// Chart.js con el mismo estilo que los del Dashboard (logic/charts.js): el globito al pasar el
// mouse y los botones Día / Quinc. / Mes. Cada tarjeta con botones se vuelve a dibujar sola al
// tocar uno (grupoVista); el resto de la pantalla no se mueve.
//
// Cómo se dibujan: modules/grupo.js arma el HTML (cada gráfico es un <canvas id="g2c-…">) y,
// cuando ese HTML ya está en la pantalla, grupoGraficos() crea los gráficos. Antes de crear uno se
// destruye el anterior del mismo nombre: sin eso, cada redibujo dejaba un gráfico viejo vivo.

var _g2Charts = {};
// Lo que eligió la persona en cada tarjeta (dura mientras no recargue la página)
var _g2Vista = { cobro: 'mensual', ventas: 'diario', puntual: 'mensual', puntualEmp: 'juntas', metodos: 'mes', mora: 'creditos', cosechasEmp: 'juntas', conc: 'siempre', modelo: 'siempre' };
var G2_RGB = { '18': '29,78,216', '26': '20,184,166' };
var G2_PERIODO_TXT = { diario: 'Día', quincenal: 'Quinc.', mensual: 'Mes' };

function _g2Oscuro(){ return typeof document !== 'undefined' && document.documentElement && document.documentElement.getAttribute && document.documentElement.getAttribute('data-theme') === 'dark'; }
// Los colores del globito, la cuadrícula y las letras: los mismos del Dashboard
function _g2Tema(){
  var o = _g2Oscuro();
  return { ink3: o ? '#6B6896' : '#9794BB', grid: o ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.06)',
    tip: { backgroundColor: o ? '#252844' : '#fff', borderColor: o ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.2)', borderWidth: 1,
      titleColor: o ? '#E8E6FF' : '#0B0B1E', bodyColor: o ? '#B0ADDB' : '#4A4870', footerColor: o ? '#8F8CC0' : '#6B6896', padding: 10, boxPadding: 4, usePointStyle: true } };
}
function _g2TickDinero(v){ return (typeof _dashTick === 'function') ? _dashTick(v) : ('$' + Math.round(v)); }
// Como en el Dashboard: la barra del período de hoy fuerte y las de antes más suaves
function _g2Pintura(rgb, n){
  return function(ctx){
    var ult = ctx.dataIndex === n - 1, ch = ctx.chart, a = ch && ch.chartArea;
    if(!a || !ch.ctx || !ch.ctx.createLinearGradient) return 'rgba(' + rgb + ',' + (ult ? 1 : 0.6) + ')';
    var g = ch.ctx.createLinearGradient(0, a.top, 0, a.bottom);
    if(ult){ g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(1, 'rgba(' + rgb + ',0.78)'); }
    else { g.addColorStop(0, 'rgba(' + rgb + ',0.62)'); g.addColorStop(1, 'rgba(' + rgb + ',0.34)'); }
    return g;
  };
}

// ── Los botones (el mismo control .dash-seg del Dashboard) ──
function _g2Seg(clave, opciones, actual){
  return '<div class="dash-seg" data-g2-seg="' + clave + '">' + opciones.map(function(o){
    return '<button type="button" class="' + (o[0] === actual ? 'on' : '') + '" onclick="grupoVista(\'' + clave + '\',\'' + o[0] + '\')">' + o[1] + '</button>';
  }).join('') + '</div>';
}
function _g2SegPeriodo(clave, opciones){
  return _g2Seg(clave, opciones.map(function(p){ return [p, G2_PERIODO_TXT[p]]; }), _g2Vista[clave]);
}
function _g2SegEmpresa(clave){ return _g2Seg(clave, [['juntas', 'Las dos'], ['18', '18'], ['26', '26']], _g2Vista[clave]); }
var G2_NOMBRE_LIENZO = { 'g2c-cobro': 'Gráfico de lo cobrado', 'g2c-ventas': 'Gráfico de las motos vendidas', 'g2c-puntual': 'Gráfico de las cuotas a tiempo, tarde y sin pagar', 'g2c-metodos': 'Gráfico de las formas de pago',
  'g2c-mora': 'Gráfico de la mora por días de atraso', 'g2c-cosechas': 'Gráfico de la mora según el mes de venta', 'g2c-conc': 'Gráfico de los concesionarios que más venden', 'g2c-modelo': 'Gráfico de las motos más vendidas' };
function _g2Lienzo(id, alto){ var nom = G2_NOMBRE_LIENZO[id] || 'Gráfico'; return '<div class="g2-lienzo" style="height:' + alto + 'px"><canvas id="' + id + '" role="img" aria-label="' + nom + '. Pasa el mouse o toca cada barra para ver el detalle."></canvas></div>'; }

// ── Las series de Día / Quinc. / Mes ──
function _g2Quincena(iso){ return String(iso).slice(0, 7) + '-' + (+String(iso).slice(8, 10) <= 15 ? '1' : '2'); }
function _g2NomQuincena(q){ return (q.slice(-1) === '1' ? '1ª' : '2ª') + ' quincena de ' + _g2MesNom(q.slice(0, 7)); }
function _g2SumaFilas(lista){
  var o = { cuotas: 0, iniciales: 0, ventas: 0, financiado: 0 };
  lista.forEach(function(x){ x = x || {}; o.cuotas += +x.cuotas || 0; o.iniciales += +x.iniciales || 0; o.ventas += +x.ventas || 0; o.financiado += +x.financiado || 0; });
  return o;
}
// Devuelve, para cada barra: la etiqueta de abajo, el título del globito y lo de cada compañía
function _g2Serie(a, b, periodo){
  var filas = [];
  if(periodo === 'diario'){
    var da = (a.dias || []).slice(-30), db = (b.dias || []).slice(-30);
    filas = da.map(function(x, i){ return { etiqueta: +x.dia.slice(8, 10) + '/' + +x.dia.slice(5, 7), titulo: _g2FechaLarga(x.dia), a: x, b: db[i] || {} }; });
    return { filas: filas, unidad: 'día', sub: 'Últimos 30 días' };
  }
  if(periodo === 'quincenal'){
    var orden = [], ga = {}, gb = {};
    var la = a.diasLargo || a.dias || [], lb = b.diasLargo || b.dias || [];
    la.forEach(function(x, i){ var q = _g2Quincena(x.dia); if(!ga[q]){ ga[q] = []; gb[q] = []; orden.push(q); } ga[q].push(x); gb[q].push(lb[i]); });
    orden = orden.slice(-8);
    filas = orden.map(function(q){ return { etiqueta: +q.slice(5, 7) + '/Q' + q.slice(-1), titulo: _g2NomQuincena(q) + ' ' + q.slice(0, 4), a: _g2SumaFilas(ga[q]), b: _g2SumaFilas(gb[q]) }; });
    return { filas: filas, unidad: 'quincena', sub: 'Últimas ' + filas.length + ' quincenas' };
  }
  var desde = _g2Desde(a, b), ma = a.meses.slice(desde), mb = b.meses.slice(desde);
  filas = ma.map(function(x, i){ return { etiqueta: _g2MesCorto(x.mes), titulo: _g2MesNom(x.mes) + ' ' + x.mes.slice(0, 4), a: x, b: mb[i] || {} }; });
  return { filas: filas, unidad: 'mes', sub: 'Últimos ' + filas.length + ' meses' };
}

// ── Crear y destruir ──
function _g2Destruir(clave){
  var c = _g2Charts[clave];
  if(c){ try { c.destroy(); } catch(e){} delete _g2Charts[clave]; }
}
function grupoGraficosFuera(){ Object.keys(_g2Charts).forEach(_g2Destruir); }
function _g2Crear(clave, config, sinAnimar){
  _g2Destruir(clave);
  var lienzo = typeof document !== 'undefined' ? document.getElementById('g2c-' + clave) : null;
  if(!lienzo) return null;
  if(typeof Chart === 'undefined'){
    var w = lienzo.parentElement;
    if(w && !w.querySelector('.g2-sin-graf')){ var m = document.createElement('div'); m.className = 'g2-sin-graf'; m.textContent = 'No se pudo cargar el gráfico. Recarga la página.'; w.appendChild(m); }
    return null;
  }
  if(sinAnimar) config.options = Object.assign({}, config.options, { animation: false });
  try { _g2Charts[clave] = new Chart(lienzo, config); }
  catch(e){ if(typeof console !== 'undefined' && console.warn) console.warn('PAGASI 18 + 26: gráfico ' + clave, e); return null; }
  return _g2Charts[clave];
}
// Opciones de un gráfico de barras con el estilo del Dashboard
function _g2OpcionesBarras(t, o){
  o = o || {};
  var ejeValor = { stacked: true, grid: { color: t.grid }, border: { display: false, dash: [4, 4] },
    ticks: { color: t.ink3, font: { size: 9 }, maxTicksLimit: 5, precision: 0, callback: o.dinero ? _g2TickDinero : (o.pct ? function(v){ return v + '%'; } : undefined) } };
  if(o.max != null) ejeValor.max = o.max;
  var ejeCat = { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: t.ink3, font: { size: 9 }, autoSkip: true, maxRotation: 0 } };
  return { responsive: true, maintainAspectRatio: false, indexAxis: o.horizontal ? 'y' : 'x',
    // en barras acostadas el globito busca la fila por la altura del mouse (Chart.js mira el eje x si no se dice)
    interaction: { mode: 'index', intersect: false, axis: o.horizontal ? 'y' : 'x' },
    plugins: { legend: { display: false }, tooltip: Object.assign({}, t.tip, { callbacks: o.callbacks || {} }) },
    scales: o.horizontal ? { x: ejeValor, y: Object.assign({}, ejeCat, { ticks: Object.assign({}, ejeCat.ticks, { font: { size: 10 }, autoSkip: false }) }) } : { x: ejeCat, y: ejeValor } };
}
function _g2Dataset(nombre, datos, color, extra){
  return Object.assign({ label: nombre, data: datos, backgroundColor: color, borderColor: 'transparent', borderWidth: 0, borderRadius: 4, borderSkipped: false, maxBarThickness: 34 }, extra || {});
}

// ══ Cada gráfico: su tarjeta (HTML) y su dibujo ══

// ── Lo cobrado (en «Lo que entró»): Día / Quinc. / Mes, las dos compañías apiladas ──
function _g2CobroCab(a, b){
  var s = _g2Serie(a, b, _g2Vista.cobro), tot = 0;
  s.filas.forEach(function(f){ tot += _g2Total(f.a) + _g2Total(f.b); });
  return { big: _g2Plata0(tot), sub: s.sub + (s.filas.length ? ' · prom. ' + _g2Plata0(tot / s.filas.length) + '/' + s.unidad : '') };
}
function _g2CobroGraf(a, b, sinAnimar){
  var s = _g2Serie(a, b, _g2Vista.cobro), n = s.filas.length, t = _g2Tema();
  var va = s.filas.map(function(f){ return Math.round(_g2Total(f.a) * 100) / 100; }), vb = s.filas.map(function(f){ return Math.round(_g2Total(f.b) * 100) / 100; });
  return _g2Crear('cobro', { type: 'bar', data: { labels: s.filas.map(function(f){ return f.etiqueta; }), datasets: [
      _g2Dataset('PAGASI 18', va, _g2Pintura(G2_RGB['18'], n)), _g2Dataset('PAGASI 26', vb, _g2Pintura(G2_RGB['26'], n)) ] },
    options: _g2OpcionesBarras(t, { dinero: true, callbacks: {
      title: function(it){ var f = s.filas[it[0].dataIndex]; return f ? f.titulo + (it[0].dataIndex === n - 1 ? ' (hasta hoy)' : '') : ''; },
      label: function(c){ return ' ' + c.dataset.label + ': ' + _g2Plata0(c.raw); },
      footer: function(it){ var f = s.filas[it[0].dataIndex]; if(!f) return ''; var cu = (+f.a.cuotas || 0) + (+f.b.cuotas || 0), ini = (+f.a.iniciales || 0) + (+f.b.iniciales || 0); return ['Juntas: ' + _g2Plata0(cu + ini), 'Cuotas ' + _g2Plata0(cu) + ' · iniciales ' + _g2Plata0(ini)]; } } }) }, sinAnimar);
}

// ── Motos vendidas: Día / Quinc. / Mes ──
function _g2VentasCab(a, b){
  var s = _g2Serie(a, b, _g2Vista.ventas), tot = 0;
  s.filas.forEach(function(f){ tot += (+f.a.ventas || 0) + (+f.b.ventas || 0); });
  var prom = s.filas.length ? Math.round(tot / s.filas.length * 10) / 10 : 0;
  return { big: _g2Num(tot) + ' moto' + (tot === 1 ? '' : 's'), sub: s.sub + (s.filas.length ? ' · prom. ' + prom.toLocaleString('es-VE') + '/' + s.unidad : '') };
}
function _g2VentasGraf(a, b, sinAnimar){
  var s = _g2Serie(a, b, _g2Vista.ventas), n = s.filas.length, t = _g2Tema();
  var unidad = function(v){ return _g2Num(v) + ' moto' + (v === 1 ? '' : 's'); };
  return _g2Crear('ventas', { type: 'bar', data: { labels: s.filas.map(function(f){ return f.etiqueta; }), datasets: [
      _g2Dataset('PAGASI 18', s.filas.map(function(f){ return +f.a.ventas || 0; }), _g2Pintura(G2_RGB['18'], n)),
      _g2Dataset('PAGASI 26', s.filas.map(function(f){ return +f.b.ventas || 0; }), _g2Pintura(G2_RGB['26'], n)) ] },
    options: _g2OpcionesBarras(t, { callbacks: {
      title: function(it){ var f = s.filas[it[0].dataIndex]; return f ? f.titulo + (it[0].dataIndex === n - 1 ? ' (hasta hoy)' : '') : ''; },
      label: function(c){ return ' ' + c.dataset.label + ': ' + unidad(c.raw); },
      footer: function(it){ var f = s.filas[it[0].dataIndex]; if(!f) return ''; var v = (+f.a.ventas || 0) + (+f.b.ventas || 0); return 'Juntas: ' + unidad(v) + ' · ' + _g2Plata0((+f.a.financiado || 0) + (+f.b.financiado || 0)) + ' financiado'; } } }) }, sinAnimar);
}

// ── Cómo se pagan las cuotas: a tiempo / tarde / sin pagar, por mes o quincena y por compañía ──
function _g2PuntualLista(a, b, j){
  var de = _g2Vista.puntualEmp === '18' ? a : _g2Vista.puntualEmp === '26' ? b : j;
  var q = _g2Vista.puntual === 'quincenal' && Array.isArray(de.puntualidadQ);
  return { lista: q ? de.puntualidadQ : de.puntualidad, q: q };
}
function _g2PctDe(x, k){ return x && x.monto > 0 ? Math.round(x[k] * 100 / x.monto) : 0; }
function _g2PuntualGraf(a, b, j, sinAnimar){
  var pl = _g2PuntualLista(a, b, j), lista = pl.lista || [], n = lista.length, t = _g2Tema();
  var nom = function(x){ return pl.q ? _g2NomQuincena(x.quincena) : _g2MesNom(x.mes) + ' ' + String(x.mes).slice(0, 4); };
  var etq = function(x){ return pl.q ? +x.quincena.slice(5, 7) + '/Q' + x.quincena.slice(-1) : _g2MesCorto(x.mes); };
  var ds = [['A tiempo', 'aTiempo', G2_VERDE], ['Tarde', 'tarde', G2_AMBAR], ['Sin pagar', 'sinPagar', G2_ROJO]].map(function(d){
    return _g2Dataset(d[0], lista.map(function(x){ return Math.round((+x[d[1]] || 0) * 100) / 100; }), d[2], { _clave: d[1] });
  });
  return _g2Crear('puntual', { type: 'bar', data: { labels: lista.map(etq), datasets: ds },
    options: _g2OpcionesBarras(t, { dinero: true, callbacks: {
      title: function(it){ var x = lista[it[0].dataIndex]; return x ? nom(x) + (it[0].dataIndex === n - 1 ? ' (las que ya vencieron)' : '') : ''; },
      label: function(c){ var x = lista[c.dataIndex]; return ' ' + c.dataset.label + ': ' + _g2Plata0(c.raw) + ' (' + _g2PctDe(x, c.dataset._clave) + '%)'; },
      footer: function(it){ var x = lista[it[0].dataIndex]; return x ? _g2Num(x.cuotas) + ' cuotas por ' + _g2Plata0(x.monto) : ''; } } }) }, sinAnimar);
}

// ── Cómo pagan: la torta de formas de pago (hoy, 7 días o el mes) ──
var G2_METODO_COLOR = { banco: '#2563EB', binance: '#F0B90B', efectivo: '#16A34A', zelle: '#7C3AED', concesionario: '#F97316', otros: '#94A3B8' };
function _g2MetodosDe(x){ var p = x && x.metodosPor; return (p && p[_g2Vista.metodos]) || (x && x.metodos) || {}; }
function _g2MetodosGraf(a, b, j, sinAnimar){
  var mj = _g2MetodosDe(j), ma = _g2MetodosDe(a), mb = _g2MetodosDe(b), t = _g2Tema();
  var claves = Object.keys(G2_METODO).filter(function(k){ return (mj[k] || 0) > 0; }).sort(function(x, y){ return mj[y] - mj[x]; });
  var total = claves.reduce(function(s, k){ return s + mj[k]; }, 0);
  if(!claves.length){ _g2Destruir('metodos'); return null; }
  return _g2Crear('metodos', { type: 'doughnut', data: { labels: claves.map(function(k){ return G2_METODO[k]; }), datasets: [{ data: claves.map(function(k){ return Math.round(mj[k] * 100) / 100; }),
      backgroundColor: claves.map(function(k){ return G2_METODO_COLOR[k]; }), borderColor: _g2Oscuro() ? '#1C1F38' : '#fff', borderWidth: 2, hoverOffset: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '64%',
      plugins: { legend: { position: 'bottom', labels: { color: t.ink3, font: { size: 10 }, boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 10 } },
        tooltip: Object.assign({}, t.tip, { callbacks: {
          label: function(c){ return ' ' + c.label + ': ' + _g2Plata0(c.raw) + ' (' + _g2Pct(c.raw, total) + ')'; },
          footer: function(it){ var k = claves[it[0].dataIndex]; return k ? 'PAGASI 18 ' + _g2Plata0(ma[k] || 0) + ' · PAGASI 26 ' + _g2Plata0(mb[k] || 0) : ''; } } }) } } }, sinAnimar);
}

// ── La mora por días de atraso: barras acostadas, por créditos o por monto ──
function _g2MoraGraf(a, b, j, sinAnimar){
  var porMonto = _g2Vista.mora === 'monto', t = _g2Tema(), k = porMonto ? 'vencido' : 'creditos';
  var v = function(x){ return Math.round((+((x || {})[k]) || 0) * 100) / 100; };
  return _g2Crear('mora', { type: 'bar', data: { labels: j.tramos.map(function(x){ return (G2_TRAMO[x.tramo] || x.tramo).replace(/^De /, ''); }), datasets: [
      _g2Dataset('PAGASI 18', j.tramos.map(function(x, i){ return v(a.tramos[i]); }), GRUPO_COLOR['18']), _g2Dataset('PAGASI 26', j.tramos.map(function(x, i){ return v(b.tramos[i]); }), GRUPO_COLOR['26']) ] },
    options: _g2OpcionesBarras(t, { horizontal: true, dinero: porMonto, callbacks: {
      title: function(it){ var x = j.tramos[it[0].dataIndex]; return x ? (G2_TRAMO[x.tramo] || x.tramo) + ' de atraso' : ''; },
      label: function(c){ var x = (c.datasetIndex === 0 ? a : b).tramos[c.dataIndex] || {}; return ' ' + c.dataset.label + ': ' + _g2Num(x.creditos) + ' crédito' + (x.creditos === 1 ? '' : 's') + ' · ' + _g2Plata0(x.vencido) + ' vencido'; },
      footer: function(it){ var x = j.tramos[it[0].dataIndex]; return x ? 'Juntas: ' + _g2Num(x.creditos) + ' créditos · ' + _g2Plata0(x.vencido) : ''; } } }) }, sinAnimar);
}

// ── Mora según el mes de venta: % de las vendidas ese mes que hoy está en mora ──
function _g2CosechasLista(a, b, j, desde){
  var de = _g2Vista.cosechasEmp === '18' ? a : _g2Vista.cosechasEmp === '26' ? b : j;
  var lista = de.cosechas || [];
  while(desde < lista.length - 3 && (lista[desde].vendidos || 0) < 10) desde++;   // un mes con 3 ventas daba porcentajes engañosos
  return lista.slice(desde);
}
function _g2CosechasGraf(a, b, j, desde, sinAnimar){
  var lista = _g2CosechasLista(a, b, j, desde), t = _g2Tema();
  var p = function(x, k){ return x.vendidos > 0 ? Math.round(x[k] * 1000 / x.vendidos) / 10 : 0; };
  return _g2Crear('cosechas', { type: 'bar', data: { labels: lista.map(function(x){ return _g2MesCorto(x.mes); }), datasets: [
      _g2Dataset('Más de 30 días', lista.map(function(x){ return p(x, 'mas30'); }), G2_ROJO),
      _g2Dataset('1 a 30 días', lista.map(function(x){ return Math.max(0, Math.round((p(x, 'enMora') - p(x, 'mas30')) * 10) / 10); }), '#FDA4AF') ] },
    options: _g2OpcionesBarras(t, { pct: true, callbacks: {
      title: function(it){ var x = lista[it[0].dataIndex]; return x ? 'Vendidas en ' + _g2MesNom(x.mes) + ' ' + String(x.mes).slice(0, 4) : ''; },
      label: function(c){ return ' ' + c.dataset.label + ': ' + String(c.raw).replace('.', ',') + '%'; },
      footer: function(it){ var x = lista[it[0].dataIndex]; return x ? [_g2Num(x.enMora) + ' de ' + _g2Num(x.vendidos) + ' en mora (' + String(p(x, 'enMora')).replace('.', ',') + '%)', _g2Num(x.mas30) + ' con más de 30 días'] : ''; } } }) }, sinAnimar);
}

// ── Concesionarios y modelos: barras acostadas, este mes o desde siempre ──
function _g2RankingFilas(a, b, tipo){
  var esConc = tipo === 'conc', mes = _g2Vista[tipo] === 'mes';
  var filas = _g2Juntar(esConc ? a.concesionarios : a.modelos, esConc ? b.concesionarios : b.modelos, esConc ? 'conc' : 'modelo').map(function(y){
    var A = y.a || {}, B = y.b || {}, va = mes ? (A.mes || 0) : (A.vendidos || 0), vb = mes ? (B.mes || 0) : (B.vendidos || 0);
    var nombre = esConc ? (y.clave ? (String(B.nombre || A.nombre || '').toUpperCase() || 'CONCESIONARIO ' + y.clave) : 'SIN CONCESIONARIO') : y.clave;
    return { clave: y.clave, nombre: nombre, va: va, vb: vb, total: va + vb, activos: (A.activos || 0) + (B.activos || 0), enMora: (A.enMora || 0) + (B.enMora || 0), siempre: (A.vendidos || 0) + (B.vendidos || 0) };
  }).filter(function(f){ return f.total > 0; }).sort(function(x, y){ return y.total - x.total || x.nombre.localeCompare(y.nombre); });
  return filas.slice(0, 10);
}
function _g2RankingGraf(a, b, tipo, sinAnimar){
  var filas = _g2RankingFilas(a, b, tipo), t = _g2Tema(), esConc = tipo === 'conc', mes = _g2Vista[tipo] === 'mes';
  if(!filas.length){ _g2Destruir(tipo); return null; }
  var corto = function(s){ s = String(s); return s.length > 24 ? s.slice(0, 23) + '…' : s; };
  return _g2Crear(tipo, { type: 'bar', data: { labels: filas.map(function(f){ return corto(f.nombre); }), datasets: [
      _g2Dataset('PAGASI 18', filas.map(function(f){ return f.va; }), GRUPO_COLOR['18'], { maxBarThickness: 18 }), _g2Dataset('PAGASI 26', filas.map(function(f){ return f.vb; }), GRUPO_COLOR['26'], { maxBarThickness: 18 }) ] },
    options: _g2OpcionesBarras(t, { horizontal: true, callbacks: {
      title: function(it){ var f = filas[it[0].dataIndex]; return f ? f.nombre : ''; },
      label: function(c){ return ' ' + c.dataset.label + ': ' + _g2Num(c.raw) + ' moto' + (c.raw === 1 ? '' : 's'); },
      footer: function(it){
        var f = filas[it[0].dataIndex]; if(!f) return '';
        var l = ['Juntas: ' + _g2Num(f.total) + (mes ? ' este mes' : ' desde el principio')];
        if(esConc && f.activos > 0) l.push(Math.round(f.enMora * 100 / f.activos) + '% en mora (' + _g2Num(f.enMora) + ' de ' + _g2Num(f.activos) + ' que siguen pagando)');
        if(mes) l.push(_g2Num(f.siempre) + ' desde el principio');
        return l;
      } } }) }, sinAnimar);
}

// ══ Todos los gráficos de la pantalla ══
function grupoGraficos(o){
  o = o || {};
  var d = typeof _grupo !== 'undefined' && _grupo.datos;
  if(!d || !d.juntas || !d.empresas){ grupoGraficosFuera(); return; }
  var a = d.empresas['18'], b = d.empresas['26'], j = d.juntas, sa = !!o.sinAnimar;
  if(!_g2ConGraficos(a, b, j)){ grupoGraficosFuera(); return; }
  _g2CobroGraf(a, b, sa);
  _g2VentasGraf(a, b, sa);
  _g2PuntualGraf(a, b, j, sa);
  _g2MetodosGraf(a, b, j, sa);
  _g2MoraGraf(a, b, j, sa);
  _g2CosechasGraf(a, b, j, _g2Desde(a, b), sa);
  _g2RankingGraf(a, b, 'conc', sa);
  _g2RankingGraf(a, b, 'modelo', sa);
}
// Lo que necesita cada tarjeta con botones para volver a dibujarse sola
var G2_TARJETA = {
  cobro: 'cobrado', ventas: 'ventas', puntual: 'puntualidad', puntualEmp: 'puntualidad', metodos: 'metodos', mora: 'mora', cosechasEmp: 'cosechas', conc: 'conc', modelo: 'modelo'
};
// Tocar un botón: se guarda la elección y se redibuja solo esa tarjeta (con su gráfico)
function grupoVista(clave, valor){
  if(!Object.prototype.hasOwnProperty.call(_g2Vista, clave)) return;
  _g2Vista[clave] = valor;
  var d = typeof _grupo !== 'undefined' && _grupo.datos;
  if(!d || !d.juntas) return;
  var sec = G2_TARJETA[clave], viejo = typeof document !== 'undefined' && document.querySelector ? document.querySelector('[data-g2-sec="' + sec + '"]') : null;
  var a = d.empresas['18'], b = d.empresas['26'], j = d.juntas;
  var html = _g2Tarjeta(sec, a, b, j, d.hoy);
  var conFoco = !!(viejo && typeof document !== 'undefined' && document.activeElement && viejo.contains && viejo.contains(document.activeElement));
  if(viejo && html && 'outerHTML' in viejo) viejo.outerHTML = html;
  if(conFoco){ var btn = document.querySelector('[data-g2-seg="' + clave + '"] button.on'); if(btn && btn.focus) try { btn.focus({ preventScroll: true }); } catch(e){} }
  var dibujar = {
    cobrado: function(){ _g2CobroGraf(a, b); }, ventas: function(){ _g2VentasGraf(a, b); }, puntualidad: function(){ _g2PuntualGraf(a, b, j); },
    metodos: function(){ _g2MetodosGraf(a, b, j); }, mora: function(){ _g2MoraGraf(a, b, j); }, cosechas: function(){ _g2CosechasGraf(a, b, j, _g2Desde(a, b)); },
    conc: function(){ _g2RankingGraf(a, b, 'conc'); }, modelo: function(){ _g2RankingGraf(a, b, 'modelo'); }
  }[sec];
  if(dibujar) dibujar();
}
