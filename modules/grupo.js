// Pagasi module: grupo — «PAGASI 18 + 26» (21-nov-2026).
// Adam: "un módulo nuevo que se llame PAGASI 18 + 26… un dashboard de qué tiene pagasi 18 y 26
// juntos… cada hora no: cuando alguien se meta en ese módulo… los créditos, dinero en la calle,
// cantidad de mora… solo las cosas básicas".
//
// Cada compañía tiene su propia base y aquí solo hay sesión en una. Por eso las cuentas las hace
// el servidor (functions/lib/grupo.js): al ENTRAR al módulo se le piden con la sesión del usuario,
// él lee las dos bases en ese momento y devuelve solo las sumas. No se guarda nada y no viaja
// ningún dato de clientes. Son las mismas cuentas del Dashboard de cada compañía.
var _grupo = { datos: null, error: '', pidiendo: false, promesa: null };
var GRUPO_COLOR = { '18': '#1D4ED8', '26': '#14B8A6' };   // cada compañía, su color (siempre con su nombre al lado)

function _grupoUrl(){
  return (typeof _waRoot !== 'undefined' && _waRoot && _waRoot._waCfg && _waRoot._waCfg.urlEquipo)
    || (typeof WA_URL_EQUIPO !== 'undefined' ? WA_URL_EQUIPO : 'https://pagasi-webhook-5ao0p23z.ue.gateway.dev/equipo');
}
// Pide los números al servidor. fresco = true (botón Actualizar) salta el minuto de memoria del servidor.
function grupoPedir(fresco){
  if(_grupo.pidiendo) return _grupo.promesa;
  var user = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) || null;
  if(!user){ _grupo.error = 'Sin sesión: vuelve a entrar al sistema.'; _grupoPintar(); return Promise.resolve(); }
  _grupo.pidiendo = true; _grupo.error = '';
  _grupoPintar();
  _grupo.promesa = Promise.resolve().then(function(){ return user.getIdToken(); }).then(function(tok){
    return fetch(_grupoUrl(), { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify({ accion: 'resumenGrupo', fresco: !!fresco }) });
  }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(j){
      if(!r.ok) throw new Error(j.codigo === 'permiso' ? 'No tienes acceso a este módulo.' : 'respuesta ' + r.status);
      if(!j || !j.empresas) throw new Error('sin números');
      return j;
    });
  }).then(function(j){ _grupo.datos = j; _grupo.error = ''; })
    .catch(function(e){
      var m = String(e && e.message || e);
      _grupo.error = /acceso|sesión/.test(m) ? m : 'No se pudieron calcular los números en este momento. Prueba otra vez en un minuto.';
      if(typeof console !== 'undefined' && console.warn) console.warn('PAGASI 18 + 26:', m);
    })
    .then(function(){ _grupo.pidiendo = false; _grupoPintar(); });
  return _grupo.promesa;
}
function grupoActualizar(){ return grupoPedir(true); }
// Redibuja solo el cuerpo del módulo, y solo si se sigue en él
function _grupoPintar(){
  if(typeof S === 'undefined' || !S || S.page !== 'grupo' || typeof document === 'undefined') return;
  var c = document.getElementById('g2-cuerpo'); if(c) c.innerHTML = _grupoHtml();
  var b = document.getElementById('g2-estado'); if(b) b.textContent = _grupoEstadoTxt();
}

function _g2Num(n){ return (Math.round(+n || 0)).toLocaleString('es-VE'); }
// El dinero, con los centavos chiquitos: así las dos compañías suman exacto el total
function _g2Dinero(v){
  var t = (Math.round((+v || 0) * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), i = t.lastIndexOf(',');
  return '<span class="g2-mon">$</span>' + (i > -1 ? t.slice(0, i) + '<small>' + t.slice(i) + '</small>' : t);
}
function _g2Pct(n, t){ return t > 0 ? (Math.round(n * 1000 / t) / 10).toLocaleString('es-VE') + '%' : '0%'; }
function _g2Hora(iso){
  var d = new Date(iso); if(isNaN(d.getTime())) return '';
  // Siempre en hora de Venezuela, se abra donde se abra
  try { return d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Caracas' }); }
  catch(e){ return d.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' }); }
}
function _grupoEstadoTxt(){
  if(_grupo.pidiendo) return _grupo.datos ? 'Actualizando…' : 'Calculando…';
  if(_grupo.datos && _grupo.datos.calculado) return 'Calculado hoy a las ' + _g2Hora(_grupo.datos.calculado);
  return '';
}

// Una fila de cuatro cifras: créditos, dinero en la calle, en mora y vencido
function _g2Cifras(x, grande){
  var c = grande ? ' g2-grande' : '';
  return '<div class="g2-cifras' + c + '">'
    + '<div class="g2-cifra"><div class="g2-rot">Créditos activos</div><div class="g2-val" data-g2="creditos">' + _g2Num(x.creditos) + '</div><div class="g2-nota">' + _g2Num(x.alDia) + ' al día</div></div>'
    + '<div class="g2-cifra"><div class="g2-rot">Dinero en la calle</div><div class="g2-val" data-g2="cartera">' + _g2Dinero(x.cartera) + '</div><div class="g2-nota">lo que falta por cobrar</div></div>'
    + '<div class="g2-cifra"><div class="g2-rot">En mora</div><div class="g2-val' + (x.enMora > 0 ? ' g2-rojo' : '') + '" data-g2="mora">' + _g2Num(x.enMora) + '</div><div class="g2-nota">' + _g2Pct(x.enMora, x.creditos) + ' de los créditos</div></div>'
    + '<div class="g2-cifra"><div class="g2-rot">Monto vencido</div><div class="g2-val' + (x.vencido > 0 ? ' g2-rojo' : '') + '" data-g2="vencido">' + _g2Dinero(x.vencido) + '</div><div class="g2-nota">cuotas ya vencidas</div></div>'
    + '</div>';
}
// Cuánto pone cada compañía en un total: una barra de dos colores con el nombre y el número al lado
// et (opcional): otras dos partes en vez de las compañías { a, b, na, nb, ca, cb } (etiqueta corta, nombre y color)
function _g2Reparto(titulo, a, b, dinero, et){
  et = et || { a: '18', b: '26', na: 'PAGASI 18', nb: 'PAGASI 26', ca: GRUPO_COLOR['18'], cb: GRUPO_COLOR['26'] };
  var t = (+a || 0) + (+b || 0), pa = t > 0 ? Math.round(a * 1000 / t) / 10 : 0, pb = t > 0 ? Math.round((100 - pa) * 10) / 10 : 0;
  var val = function(v){ return dinero ? '$' + _g2Num(v) : _g2Num(v); };
  return '<div class="g2-rep"><div class="g2-rep-t">' + titulo + '</div>'
    + '<div class="g2-barra" role="img" aria-label="' + titulo + ': ' + et.na + ' ' + pa.toLocaleString('es-VE') + '%, ' + et.nb + ' ' + pb.toLocaleString('es-VE') + '%">'
    + (t > 0 ? '<i style="width:' + pa + '%;background:' + et.ca + '"></i><i style="width:' + pb + '%;background:' + et.cb + '"></i>' : '') + '</div>'
    + '<div class="g2-rep-l"><span><b style="background:' + et.ca + '"></b>' + et.a + ' · ' + val(a) + ' · ' + pa.toLocaleString('es-VE') + '%</span>'
    + '<span><b style="background:' + et.cb + '"></b>' + et.b + ' · ' + val(b) + ' · ' + pb.toLocaleString('es-VE') + '%</span></div></div>';
}
function _g2Empresa(emp, x){
  var nombre = (x && x.nombre) || ('PAGASI ' + emp), sitio = emp === '18' ? '18.pagasi.io · solo cobra' : 'pagasi.io · vende y cobra';
  var cab = '<div class="g2-cab"><span class="g2-chapa" style="background:' + GRUPO_COLOR[emp] + '">' + emp + '</span><div><div class="g2-nom">' + nombre + '</div><div class="g2-sitio">' + sitio + '</div></div></div>';
  if(!x || x.error || typeof x.creditos !== 'number')
    return '<div class="g2-card" data-g2-emp="' + emp + '">' + cab + '<div class="g2-falla">No se pudo leer esta compañía en este momento. Toca «Actualizar» para intentar otra vez.</div></div>';
  return '<div class="g2-card" data-g2-emp="' + emp + '">' + cab + _g2Cifras(x, false) + _g2Historico(x) + '</div>';
}

// ══ Lo que se agregó el 21-nov (Adam: "dame más data… está muy vacío") ══
var G2_MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _g2MesNom(mes){ return G2_MES[(+String(mes).slice(5, 7) || 1) - 1] || ''; }
function _g2MesCorto(mes){ var n = _g2MesNom(mes); return n === 'septiembre' ? 'sep' : n.slice(0, 3); }
function _g2Total(c){ return c ? (+c.cuotas || 0) + (+c.iniciales || 0) : 0; }
function _g2Plata0(v){ return '$' + _g2Num(v); }
// Para encima de las barras: corto y sin repetirse ("$1,2k", "$84k")
function _g2Corto(v){
  v = +v || 0;
  if(v < 1000) return '$' + Math.round(v);
  if(v < 10000) return '$' + (Math.round(v / 100) / 10).toLocaleString('es-VE') + 'k';
  return '$' + Math.round(v / 1000).toLocaleString('es-VE') + 'k';
}
// Cuánto pone cada compañía, en una línea chiquita con su color
function _g2Split(a, b, dinero){
  var v = function(x){ return dinero ? _g2Plata0(x) : _g2Num(x); };
  return '<span class="g2-split"><span><b style="background:' + GRUPO_COLOR['18'] + '"></b>18 · ' + v(a) + '</span><span><b style="background:' + GRUPO_COLOR['26'] + '"></b>26 · ' + v(b) + '</span></span>';
}
var _g2Ley = '<div class="g2-ley"><span><b style="background:' + GRUPO_COLOR['18'] + '"></b>PAGASI 18</span><span><b style="background:' + GRUPO_COLOR['26'] + '"></b>PAGASI 26</span></div>';
// Tiene los datos nuevos (un servidor de antes no los manda)
function _g2Completo(x){ return !!(x && x.cobro && Array.isArray(x.meses) && Array.isArray(x.tramos) && x.semana && x.historico); }

// Desde qué mes mostrar los gráficos: el primero con algo en alguna de las dos (no meses vacíos al principio)
function _g2Desde(a, b){
  for(var i = 0; i < a.meses.length; i++){
    var x = a.meses[i], y = b.meses[i] || {};
    if(_g2Total(x) || x.ventas || _g2Total(y) || y.ventas) return Math.min(i, Math.max(0, a.meses.length - 3));
  }
  return Math.max(0, a.meses.length - 3);
}
// Barras verticales apiladas. cols: [{ partes:[{v, color}] (de abajo hacia arriba), arriba:'texto',
// abajo:'texto', tip:'texto', hoy:bool, clave }]. o: { alto, aria, ancho (px mínimos por barra), max }
function _g2Barras(cols, o){
  o = o || {};
  var ALTO = o.alto || 132;
  var max = o.max || Math.max.apply(null, [1].concat(cols.map(function(c){ return c.partes.reduce(function(s, p){ return s + (+p.v || 0); }, 0); })));
  var html = cols.map(function(c){
    var segs = c.partes.map(function(p){ var h = p.v > 0 ? Math.max(3, Math.round(p.v / max * ALTO)) : 0; return h ? '<i style="height:' + h + 'px;background:' + p.color + '"></i>' : ''; }).reverse().join('');
    return '<div class="g2-col' + (c.hoy ? ' g2-col-hoy' : '') + '" title="' + _g2Esc(c.tip || '') + '"' + (c.clave ? ' data-g2-col="' + c.clave + '"' : '') + '>'
      + '<div class="g2-col-z" style="height:' + (ALTO + 24) + 'px"><div class="g2-col-v">' + (c.arriba || '') + '</div><div class="g2-pila">' + segs + '</div></div>'
      + '<div class="g2-col-m">' + (c.abajo || '') + '</div></div>';
  }).join('');
  var w = o.ancho || 30;
  return '<div class="g2-graf" role="img" aria-label="' + _g2Esc(o.aria || '') + '"><div class="g2-cols' + (w < 30 ? ' g2-cols-d' : '') + '" style="--g2-n:' + cols.length + ';--g2-w:' + w + 'px">' + html + '</div></div>';
}
function _g2Esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
// Barras por mes, cada una con lo de las dos compañías una encima de la otra (18 abajo, 26 arriba)
function _g2Columnas(titulo, a, b, valor, dinero, desde){
  var meses = a.meses.slice(desde), otros = b.meses.slice(desde), ult = meses.length - 1, f = function(v){ return dinero ? _g2Plata0(v) : _g2Num(v); };
  return _g2Barras(meses.map(function(x, i){
    var va = valor(x), vb = valor(otros[i] || {}), t = va + vb;
    return { clave: x.mes, hoy: i === ult, partes: [{ v: va, color: GRUPO_COLOR['18'] }, { v: vb, color: GRUPO_COLOR['26'] }],
      arriba: t > 0 ? (dinero ? _g2Corto(t) : _g2Num(t)) : '', abajo: _g2MesCorto(x.mes),
      tip: _g2MesNom(x.mes) + ' ' + x.mes.slice(0, 4) + (i === ult ? ' (hasta hoy)' : '') + ': PAGASI 18 ' + f(va) + ' · PAGASI 26 ' + f(vb) + ' · juntas ' + f(t) };
  }), { aria: titulo + ' por mes' });
}
function _g2CabSec(titulo, sub, derecha){
  return '<div class="g2-sec-cab"><div><div class="g2-sec-t">' + titulo + '</div>' + (sub ? '<div class="g2-sec-s">' + sub + '</div>' : '') + '</div>' + (derecha || '') + '</div>';
}

// ── Lo cobrado: hoy, 7 días, este mes (con el mes pasado a la misma fecha) y el mes pasado ──
function _g2Cobrado(a, b, j, hoy){
  var c = j.cobro, mes = String(hoy || '').slice(0, 7), mesAnt = (a.meses[a.meses.length - 2] || {}).mes || '';
  var dia = +String(hoy || '').slice(8, 10) || 0;
  var esteMes = _g2Total(c.mes), antes = _g2Total(c.mesPasadoAFecha);
  var cambio = antes > 0 ? Math.round((esteMes - antes) * 100 / antes) : null;
  var compara = cambio === null ? 'el mes pasado no hubo cobros a esta fecha'
    : '<span class="' + (cambio >= 0 ? 'g2-sube' : 'g2-baja') + '">' + (cambio >= 0 ? '▲ ' : '▼ ') + Math.abs(cambio).toLocaleString('es-VE') + '%</span> vs. ' + _g2Plata0(antes) + ' al ' + dia + ' de ' + _g2MesNom(mesAnt);
  var celda = function(rot, k, nota, dato){
    var x = c[k], t = _g2Total(x);
    return '<div class="g2-cifra"><div class="g2-rot">' + rot + '</div><div class="g2-val" data-g2="' + dato + '">' + _g2Dinero(t) + '</div>'
      + '<div class="g2-nota">' + nota + '</div>' + _g2Split(_g2Total(a.cobro[k]), _g2Total(b.cobro[k]), true) + '</div>';
  };
  var detalle = function(x){ return 'cuotas ' + _g2Plata0(x.cuotas) + ' · iniciales ' + _g2Plata0(x.iniciales); };
  return '<div class="g2-card g2-sec" data-g2-sec="cobrado">'
    + _g2CabSec('Lo que entró', 'Pagos confirmados de las dos compañías: cuotas e iniciales', _g2Ley)
    + '<div class="g2-cobro">'
    + '<div class="g2-cifras g2-cifras-c">'
    + celda('Hoy', 'hoy', detalle(c.hoy), 'cobro-hoy')
    + celda('Últimos 7 días', 'semana', detalle(c.semana), 'cobro-semana')
    + celda('En ' + _g2MesNom(mes), 'mes', compara, 'cobro-mes')
    + celda(_g2MesNom(mesAnt).replace(/^./, function(l){ return l.toUpperCase(); }) + ' completo', 'mesPasado', detalle(c.mesPasado), 'cobro-mes-pasado')
    + '</div>'
    + '<div class="g2-cobro-g"><div class="g2-rot">Cobrado por mes</div>' + _g2Columnas('Cobrado', a, b, _g2Total, true, _g2Desde(a, b)) + '</div>'
    + '</div></div>';
}
// ── Las motos vendidas por mes ──
function _g2Ventas(a, b, j, hoy){
  var desde = _g2Desde(a, b), n = j.meses.length, x = j.meses[n - 1] || {}, y = j.meses[n - 2] || {};
  return '<div class="g2-card g2-sec" data-g2-sec="ventas">'
    + _g2CabSec('Motos vendidas', 'Créditos otorgados cada mes', _g2Ley)
    + '<div class="g2-mini">'
    + '<div><div class="g2-rot">En ' + _g2MesNom(x.mes) + '</div><div class="g2-val" data-g2="ventas-mes">' + _g2Num(x.ventas) + '</div><div class="g2-nota">' + _g2Plata0(x.financiado) + ' financiado</div></div>'
    + '<div><div class="g2-rot">En ' + _g2MesNom(y.mes) + '</div><div class="g2-val g2-val-s" data-g2="ventas-mes-pasado">' + _g2Num(y.ventas) + '</div><div class="g2-nota">' + _g2Plata0(y.financiado) + ' financiado</div></div>'
    + '</div>'
    + _g2Columnas('Motos vendidas', a, b, function(m){ return +m.ventas || 0; }, false, desde)
    + '<div class="g2-nota g2-nota-f">Desde el principio, entre las dos: <b>' + _g2Num(j.historico.vendidos) + ' motos</b> · ' + _g2Plata0(j.historico.financiado) + ' financiado.</div>'
    + '</div>';
}
// ── La mora por días de atraso ──
var G2_TRAMO = { '1-15': 'De 1 a 15 días', '16-30': 'De 16 a 30 días', '31-60': 'De 31 a 60 días', '+60': 'Más de 60 días' };
function _g2Mora(a, b, j){
  var max = Math.max.apply(null, [1].concat(j.tramos.map(function(t){ return t.creditos; })));
  var filas = j.tramos.map(function(t, i){
    var ta = a.tramos[i] || {}, tb = b.tramos[i] || {};
    var wa = (ta.creditos || 0) * 100 / max, wb = (tb.creditos || 0) * 100 / max;
    return '<div class="g2-tramo" data-g2-tramo="' + t.tramo + '"><div class="g2-tramo-r"><span>' + (G2_TRAMO[t.tramo] || t.tramo) + '</span>'
      + '<b>' + _g2Num(t.creditos) + ' crédito' + (t.creditos === 1 ? '' : 's') + ' · <span class="' + (t.vencido > 0 ? 'g2-rojo-t' : '') + '">' + _g2Plata0(t.vencido) + '</span></b></div>'
      + '<div class="g2-tramo-b" title="PAGASI 18: ' + _g2Num(ta.creditos) + ' (' + _g2Plata0(ta.vencido) + ') · PAGASI 26: ' + _g2Num(tb.creditos) + ' (' + _g2Plata0(tb.vencido) + ')">'
      + (wa > 0 ? '<i style="width:' + wa.toFixed(2) + '%;background:' + GRUPO_COLOR['18'] + '"></i>' : '') + (wb > 0 ? '<i style="width:' + wb.toFixed(2) + '%;background:' + GRUPO_COLOR['26'] + '"></i>' : '') + '</div>'
      + '<div class="g2-tramo-n">' + _g2Split(ta.creditos || 0, tb.creditos || 0, false) + '</div></div>';
  }).join('');
  var viejo = j.tramos[j.tramos.length - 1] || { vencido: 0 };
  var pct = j.vencido > 0 ? Math.round(viejo.vencido * 100 / j.vencido) : 0;
  return '<div class="g2-card g2-sec" data-g2-sec="mora">'
    + _g2CabSec('La mora por días de atraso', _g2Num(j.enMora) + ' créditos en mora · ' + _g2Plata0(j.vencido) + ' vencido', '')
    + '<div class="g2-tramos">' + filas + '</div>'
    + (viejo.vencido > 0 ? '<div class="g2-nota g2-nota-f">Los de más de 60 días son el ' + pct + '% del monto vencido: son los más difíciles de cobrar.</div>' : '')
    + '</div>';
}
// ── Lo que vence esta semana ──
function _g2Semana(a, b, j, hoy){
  var hasta = '';
  try { var d = new Date(String(hoy) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 6); hasta = d.getUTCDate() + ' de ' + G2_MES[d.getUTCMonth()]; } catch(e){}
  var prom = j.semana.cuotas > 0 ? j.semana.monto / j.semana.cuotas : 0;
  return '<div class="g2-card g2-sec" data-g2-sec="semana">'
    + _g2CabSec('Lo que vence esta semana', 'Cuotas que vencen de hoy al ' + hasta, '')
    + '<div class="g2-val g2-val-g" data-g2="semana-monto">' + _g2Dinero(j.semana.monto) + '</div>'
    + '<div class="g2-nota">' + _g2Num(j.semana.cuotas) + ' cuotas por cobrar' + (prom ? ' · ' + _g2Plata0(prom) + ' en promedio' : '') + '</div>'
    + '<div class="g2-reps g2-reps-1">' + _g2Reparto('Monto por compañía', a.semana.monto, b.semana.monto, true) + _g2Reparto('Cuotas por compañía', a.semana.cuotas, b.semana.cuotas, false) + '</div>'
    + (j.vencido > 0 ? '<div class="g2-nota g2-nota-f" data-g2="semana-con-vencido">Y hay <b>' + _g2Plata0(j.vencido) + '</b> ya vencido sin pagar: si todos se pusieran al día, esta semana entrarían <b>' + _g2Plata0(j.semana.monto + j.vencido) + '</b>.</div>' : '')
    + '</div>';
}
// ── Desde el principio (en la tarjeta de cada compañía) ──
function _g2Historico(x){
  if(!_g2Completo(x)) return '';
  var h = x.historico, cobrado = _g2Total(x.cobro.total);
  var c = function(rot, v, nota, dato){ return '<div class="g2-cifra"><div class="g2-rot">' + rot + '</div><div class="g2-val g2-val-s" data-g2="' + dato + '">' + v + '</div><div class="g2-nota">' + nota + '</div></div>'; };
  return '<div class="g2-hist"><div class="g2-hist-t">Desde el principio</div><div class="g2-cifras g2-cifras-4">'
    + c('Motos vendidas', _g2Num(h.vendidos), _g2Plata0(h.financiado) + ' financiado', 'hist-vendidos')
    + c('Cobrado', _g2Dinero(cobrado), 'cuotas e iniciales', 'hist-cobrado')
    + c('Terminaron de pagar', _g2Num(h.terminados), 'créditos completos', 'hist-terminados')
    + c('Recuperadas', _g2Num(h.recuperados), 'motos devueltas', 'hist-recuperados')
    + '</div></div>';
}

// ══ Más gráficos (21-nov, Adam: "ponme más data… ponme charts etc") ══
var G2_VERDE = '#16A34A', G2_AMBAR = '#F59E0B', G2_ROJO = '#E11D48';
var G2_DIA = ['dom','lun','mar','mié','jue','vie','sáb'];
function _g2FechaLarga(iso){ var d = new Date(String(iso) + 'T12:00:00Z'); return isNaN(d.getTime()) ? '' : G2_DIA[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + G2_MES[d.getUTCMonth()]; }
// ── Cobrado día por día (últimos 30 días) ──
function _g2Dias(a, b, j){
  var lista = j.dias, n = lista.length, ult = n - 1, mejor = null, suma = 0;
  lista.forEach(function(x){ var t = _g2Total(x); suma += t; if(!mejor || t > _g2Total(mejor)) mejor = x; });
  var cols = lista.map(function(x, i){
    var va = _g2Total(a.dias[i]), vb = _g2Total(b.dias[i]), d = +x.dia.slice(8, 10);
    var finDe = new Date(x.dia + 'T12:00:00Z').getUTCDay() === 0;
    return { clave: x.dia, hoy: i === ult, partes: [{ v: va, color: GRUPO_COLOR['18'] }, { v: vb, color: GRUPO_COLOR['26'] }],
      arriba: '', abajo: d === 1 ? '<b>1</b>' : (finDe ? '<span class="g2-dom">' + d + '</span>' : String(d)),
      tip: _g2FechaLarga(x.dia) + (i === ult ? ' (hasta ahora)' : '') + ': ' + _g2Plata0(va + vb) + ' (cuotas ' + _g2Plata0(x.cuotas) + ', iniciales ' + _g2Plata0(x.iniciales) + ') · PAGASI 18 ' + _g2Plata0(va) + ' · PAGASI 26 ' + _g2Plata0(vb) };
  });
  var cab = '<div class="g2-mini g2-mini-3">'
    + '<div><div class="g2-rot">En 30 días</div><div class="g2-val g2-val-s" data-g2="dias-total">' + _g2Plata0(suma) + '</div></div>'
    + '<div><div class="g2-rot">Promedio por día</div><div class="g2-val g2-val-s">' + _g2Plata0(suma / (n || 1)) + '</div></div>'
    + '<div><div class="g2-rot">El mejor día</div><div class="g2-val g2-val-s">' + _g2Plata0(_g2Total(mejor)) + '</div><div class="g2-nota">' + (mejor ? _g2FechaLarga(mejor.dia) : '') + '</div></div></div>';
  return '<div class="g2-card g2-sec" data-g2-sec="dias">' + _g2CabSec('Cobrado día por día', 'Los últimos 30 días, del ' + _g2FechaLarga(lista[0] && lista[0].dia).replace(/^\S+ /, '') + ' a hoy (los domingos en gris)', _g2Ley)
    + cab + _g2Barras(cols, { aria: 'Cobrado cada día de los últimos 30', ancho: 16, alto: 190 }) + '</div>';
}
// ── Cómo pagan: lo cobrado este mes por forma de pago ──
var G2_METODO = { banco: 'Banco (transferencia y pago móvil)', binance: 'Binance', efectivo: 'Efectivo', zelle: 'Zelle', concesionario: 'En el concesionario (iniciales)', otros: 'Otras' };
function _g2Metodos(a, b, j, hoy){
  var claves = Object.keys(G2_METODO).filter(function(k){ return (j.metodos[k] || 0) > 0; }).sort(function(x, y){ return j.metodos[y] - j.metodos[x]; });
  var total = claves.reduce(function(s, k){ return s + j.metodos[k]; }, 0), max = claves.length ? j.metodos[claves[0]] : 1;
  var filas = claves.map(function(k){
    var v = j.metodos[k], va = a.metodos[k] || 0, vb = b.metodos[k] || 0;
    return '<div class="g2-fila" data-g2-metodo="' + k + '" title="PAGASI 18: ' + _g2Plata0(va) + ' · PAGASI 26: ' + _g2Plata0(vb) + '"><div class="g2-fila-r"><span>' + G2_METODO[k] + '</span><b>' + _g2Plata0(v) + ' <em>' + _g2Pct(v, total) + '</em></b></div>'
      + '<div class="g2-fila-b"><i style="width:' + (va * 100 / max).toFixed(2) + '%;background:' + GRUPO_COLOR['18'] + '"></i><i style="width:' + (vb * 100 / max).toFixed(2) + '%;background:' + GRUPO_COLOR['26'] + '"></i></div></div>';
  }).join('');
  var m = j.cobro.mes;
  return '<div class="g2-card g2-sec" data-g2-sec="metodos">' + _g2CabSec('Cómo pagan', 'Lo cobrado en ' + _g2MesNom(String(hoy).slice(0, 7)) + ' por forma de pago', '')
    + (filas ? '<div class="g2-filas">' + filas + '</div>' : '<div class="g2-nota">Todavía no hay cobros este mes.</div>')
    + '<div class="g2-reps g2-reps-1">' + _g2Reparto('Cuotas o iniciales', m.cuotas, m.iniciales, true, { a: 'Cuotas', b: 'Iniciales', na: 'Cuotas', nb: 'Iniciales', ca: '#6366F1', cb: '#F59E0B' })
    + _g2Reparto('Por compañía', _g2Total(a.cobro.mes), _g2Total(b.cobro.mes), true) + '</div></div>';
}
// ── Cómo se pagan las cuotas: a tiempo, tarde o sin pagar (por el mes en que vencían) ──
function _g2Puntualidad(a, b, j){
  var lista = j.puntualidad, ult = lista.length - 1;
  var pct = function(x, k){ return x && x.monto > 0 ? Math.round(x[k] * 100 / x.monto) : 0; };
  var cols = lista.map(function(x, i){
    var t = x.monto || 0;
    return { clave: x.mes, hoy: i === ult, partes: [{ v: x.aTiempo, color: G2_VERDE }, { v: x.tarde, color: G2_AMBAR }, { v: x.sinPagar, color: G2_ROJO }],
      arriba: t > 0 ? pct(x, 'aTiempo') + '%' : '', abajo: _g2MesCorto(x.mes),
      tip: _g2MesNom(x.mes) + (i === ult ? ' (las que ya vencieron)' : '') + ': ' + _g2Num(x.cuotas) + ' cuotas por ' + _g2Plata0(t) + ' · a tiempo ' + pct(x, 'aTiempo') + '% · tarde ' + pct(x, 'tarde') + '% · sin pagar ' + pct(x, 'sinPagar') + '%' };
  });
  var x = lista[ult] || {}, xa = a.puntualidad[ult], xb = b.puntualidad[ult];
  var ley = '<div class="g2-ley"><span><b style="background:' + G2_VERDE + '"></b>A tiempo</span><span><b style="background:' + G2_AMBAR + '"></b>Tarde</span><span><b style="background:' + G2_ROJO + '"></b>Sin pagar</span></div>';
  return '<div class="g2-card g2-sec" data-g2-sec="puntualidad">' + _g2CabSec('Cómo se pagan las cuotas', 'Las cuotas que vencieron cada mes, las dos compañías', ley)
    + _g2Barras(cols, { aria: 'Cuotas pagadas a tiempo, tarde y sin pagar por mes', max: 1e-9 + Math.max.apply(null, [1].concat(lista.map(function(y){ return y.monto || 0; }))) })
    + '<div class="g2-nota g2-nota-f">En ' + _g2MesNom(x.mes) + ' se pagó a tiempo el <b data-g2="puntual-mes">' + pct(x, 'aTiempo') + '%</b> de lo que venció; ' + pct(x, 'tarde') + '% llegó tarde y ' + pct(x, 'sinPagar') + '% sigue sin pagar. '
    + 'A tiempo: PAGASI 18 ' + pct(xa, 'aTiempo') + '% · PAGASI 26 ' + pct(xb, 'aTiempo') + '%.</div></div>';
}
// ── Mora según el mes de venta (cómo están hoy las motos vendidas cada mes) ──
function _g2Cosechas(a, b, j, desde){
  while(desde < j.cosechas.length - 3 && (j.cosechas[desde].vendidos || 0) < 10) desde++;   // un mes con 3 ventas daba porcentajes engañosos
  var lista = j.cosechas.slice(desde), ult = lista.length - 1, peor = null;
  var pct = function(x){ return x && x.vendidos > 0 ? Math.round(x.enMora * 1000 / x.vendidos) / 10 : 0; };
  lista.forEach(function(x){ if(x.vendidos >= 10 && (!peor || pct(x) > pct(peor))) peor = x; });
  var max = Math.max.apply(null, [5].concat(lista.map(pct)));
  var cols = lista.map(function(x, i){
    var p = pct(x), xa = a.cosechas[desde + i] || {}, xb = b.cosechas[desde + i] || {};
    var p30 = x.vendidos > 0 ? x.mas30 * 100 / x.vendidos : 0;
    return { clave: x.mes, hoy: i === ult, partes: [{ v: Math.max(0, p - p30), color: '#FDA4AF' }, { v: p30, color: G2_ROJO }],
      arriba: x.vendidos ? p.toLocaleString('es-VE') + '%' : '', abajo: _g2MesCorto(x.mes),
      tip: 'Vendidas en ' + _g2MesNom(x.mes) + ': ' + _g2Num(x.vendidos) + ' · hoy en mora ' + _g2Num(x.enMora) + ' (' + _g2Num(x.mas30) + ' con más de 30 días) · PAGASI 18 ' + _g2Num(xa.enMora) + ' de ' + _g2Num(xa.vendidos) + ' · PAGASI 26 ' + _g2Num(xb.enMora) + ' de ' + _g2Num(xb.vendidos) };
  });
  var ley = '<div class="g2-ley"><span><b style="background:#FDA4AF"></b>1 a 30 días</span><span><b style="background:' + G2_ROJO + '"></b>Más de 30 días</span></div>';
  return '<div class="g2-card g2-sec" data-g2-sec="cosechas">' + _g2CabSec('Mora según el mes de venta', 'De las motos vendidas cada mes, qué porcentaje está hoy en mora', ley)
    + _g2Barras(cols, { aria: 'Porcentaje en mora por mes de venta', max: max })
    + (peor ? '<div class="g2-nota g2-nota-f">Las vendidas en <b>' + _g2MesNom(peor.mes) + '</b> son las que peor pagan: ' + pct(peor).toLocaleString('es-VE') + '% en mora (' + _g2Num(peor.enMora) + ' de ' + _g2Num(peor.vendidos) + '). Las más nuevas todavía tienen pocas cuotas vencidas.</div>' : '')
    + '</div>';
}
// ── La venta promedio (últimos 90 días) ──
function _g2Promedio(a, b, j){
  var col = function(x){
    var p = x && x.promedio, n = p ? p.ventas : 0;
    if(!n) return ['—', '—', '—', '—', '0'];
    return [_g2Plata0(p.precio / n), _g2Plata0(p.inicial / n) + ' <em>' + (p.precio > 0 ? Math.round(p.inicial * 100 / p.precio) : 0) + '%</em>', _g2Plata0(p.cuota / n), (Math.round(p.plazo / n * 10) / 10).toLocaleString('es-VE') + ' meses', _g2Num(n)];
  };
  var cj = col(j), ca = col(a), cb = col(b), rot = ['Precio de la moto', 'Inicial', 'Cuota quincenal', 'Plazo', 'Ventas contadas'];
  var filas = rot.map(function(r, i){ return '<tr><th>' + r + '</th><td data-g2="prom-' + i + '"><b>' + cj[i] + '</b></td><td>' + ca[i] + '</td><td>' + cb[i] + '</td></tr>'; }).join('');
  return '<div class="g2-card g2-sec" data-g2-sec="promedio">' + _g2CabSec('La venta promedio', 'De las motos vendidas en los últimos 90 días', '')
    + '<div class="g2-tabla-w"><table class="g2-tabla"><thead><tr><th></th><th>Las dos</th><th><b style="background:' + GRUPO_COLOR['18'] + '"></b>18</th><th><b style="background:' + GRUPO_COLOR['26'] + '"></b>26</th></tr></thead><tbody>' + filas + '</tbody></table></div></div>';
}
// ── Los que más venden: concesionarios y modelos (se juntan por su clave) ──
function _g2Juntar(la, lb, clave){
  var m = {};
  [[la, 'a'], [lb, 'b']].forEach(function(par){
    (par[0] || []).forEach(function(x){
      var k = String(x[clave] || '').toUpperCase(), y = m[k] || (m[k] = { clave: k, nombre: '', a: null, b: null });
      y[par[1]] = x; if(x.nombre) y.nombre = x.nombre;
    });
  });
  return Object.keys(m).map(function(k){ return m[k]; });
}
function _g2Ranking(titulo, sub, sec, filas, conMora){
  var top = filas.slice(0, 10), max = top.length ? top[0].total : 1;
  var html = top.map(function(f, i){
    var moraTxt = '';
    if(conMora){ var p = f.activos > 0 ? Math.round(f.enMora * 100 / f.activos) : 0; moraTxt = ' <em class="' + (p >= 10 ? 'g2-rojo-t' : '') + '">' + p + '% en mora</em>'; }
    return '<div class="g2-fila" data-g2-' + sec + '="' + _g2Esc(f.clave) + '" title="' + _g2Esc(f.nombre + ': PAGASI 18 ' + f.va + ' · PAGASI 26 ' + f.vb + ' · este mes ' + f.mes) + '">'
      + '<div class="g2-fila-r"><span><i class="g2-pos">' + (i + 1) + '</i>' + _g2Esc(f.nombre) + '</span><b>' + _g2Num(f.total) + moraTxt + '</b></div>'
      + '<div class="g2-fila-b"><i style="width:' + (f.va * 100 / max).toFixed(2) + '%;background:' + GRUPO_COLOR['18'] + '"></i><i style="width:' + (f.vb * 100 / max).toFixed(2) + '%;background:' + GRUPO_COLOR['26'] + '"></i></div></div>';
  }).join('');
  return '<div class="g2-card g2-sec" data-g2-sec="' + sec + '">' + _g2CabSec(titulo, sub, _g2Ley) + (html ? '<div class="g2-filas">' + html + '</div>' : '<div class="g2-nota">Sin ventas todavía.</div>') + '</div>';
}
function _g2Concesionarios(a, b){
  var filas = _g2Juntar(a.concesionarios, b.concesionarios, 'conc').map(function(y){
    var A = y.a || {}, B = y.b || {};
    return { clave: y.clave, nombre: y.clave ? (String(B.nombre || A.nombre || '').toUpperCase() || 'Concesionario ' + y.clave) : 'Sin concesionario', va: A.vendidos || 0, vb: B.vendidos || 0,
      total: (A.vendidos || 0) + (B.vendidos || 0), mes: (A.mes || 0) + (B.mes || 0), activos: (A.activos || 0) + (B.activos || 0), enMora: (A.enMora || 0) + (B.enMora || 0) };
  }).sort(function(x, y){ return y.total - x.total || x.nombre.localeCompare(y.nombre); });
  return _g2Ranking('Los concesionarios que más venden', 'Motos vendidas desde el principio y cuántas de las que siguen pagando están en mora', 'conc', filas, true);
}
function _g2Modelos(a, b){
  var filas = _g2Juntar(a.modelos, b.modelos, 'modelo').map(function(y){
    var A = y.a || {}, B = y.b || {};
    return { clave: y.clave, nombre: y.clave, va: A.vendidos || 0, vb: B.vendidos || 0, total: (A.vendidos || 0) + (B.vendidos || 0), mes: (A.mes || 0) + (B.mes || 0) };
  }).sort(function(x, y){ return y.total - x.total || x.nombre.localeCompare(y.nombre); });
  return _g2Ranking('Las motos más vendidas', 'Por modelo, desde el principio', 'modelo', filas, false);
}
var _g2Tiene = function(x, k){ return !!(x && x[k] != null); };
function _g2Titulo(t){ return '<div class="g2-titulo">' + t + '</div>'; }

function _grupoHtml(){
  var d = _grupo.datos;
  if(!d){
    if(_grupo.error) return '<div class="g2-card g2-aviso"><div class="g2-falla">' + _grupo.error + '</div><button type="button" class="btn btn-p btn-sm" onclick="grupoActualizar()">Intentar otra vez</button></div>';
    return '<div class="g2-card g2-aviso"><div class="g2-espera"><span class="g2-giro" aria-hidden="true"></span>Leyendo las dos compañías… tarda unos segundos.</div></div>';
  }
  var a = d.empresas['18'], b = d.empresas['26'], j = d.juntas, h = '';
  if(_grupo.error) h += '<div class="g2-card g2-aviso"><div class="g2-falla">' + _grupo.error + ' Abajo están los números de la última vez.</div></div>';
  if(j){
    h += '<div class="g2-card g2-hero" data-g2-emp="juntas"><div class="g2-cab"><span class="g2-chapa g2-chapa-j">18 + 26</span><div><div class="g2-nom">Las dos compañías juntas</div><div class="g2-sitio">la suma de PAGASI 18 y PAGASI 26</div></div></div>'
      + _g2Cifras(j, true)
      + '<div class="g2-reps">' + _g2Reparto('Créditos activos', a.creditos, b.creditos, false) + _g2Reparto('Dinero en la calle', a.cartera, b.cartera, true)
      + _g2Reparto('Créditos en mora', a.enMora, b.enMora, false) + _g2Reparto('Monto vencido', a.vencido, b.vencido, true) + '</div></div>';
    // Lo nuevo solo si las dos lo traen (un servidor de antes no lo manda)
    if(_g2Completo(a) && _g2Completo(b) && _g2Completo(j) && a.meses.length === b.meses.length && a.meses.length >= 2){
      var todo = ['dias', 'puntualidad', 'cosechas', 'metodos', 'promedio'].every(function(k){ return _g2Tiene(a, k) && _g2Tiene(b, k) && _g2Tiene(j, k); }) && Array.isArray(a.concesionarios) && Array.isArray(b.concesionarios);
      h += _g2Cobrado(a, b, j, d.hoy);
      if(todo){
        h += _g2Titulo('Cobranza');
        h += '<div class="g2-fila-21">' + _g2Dias(a, b, j) + _g2Metodos(a, b, j, d.hoy) + '</div>';
        h += '<div class="g2-tres">' + _g2Puntualidad(a, b, j) + _g2Mora(a, b, j) + _g2Semana(a, b, j, d.hoy) + '</div>';
        h += _g2Titulo('Ventas');
        h += '<div class="g2-tres">' + _g2Ventas(a, b, j, d.hoy) + _g2Cosechas(a, b, j, _g2Desde(a, b)) + _g2Promedio(a, b, j) + '</div>';
        h += '<div class="g2-dos">' + _g2Concesionarios(a, b) + _g2Modelos(a, b) + '</div>';
        h += _g2Titulo('Cada compañía');
      } else {
        h += '<div class="g2-tres">' + _g2Ventas(a, b, j, d.hoy) + _g2Mora(a, b, j) + _g2Semana(a, b, j, d.hoy) + '</div>';
      }
    }
  } else {
    h += '<div class="g2-card g2-aviso"><div class="g2-falla">Falta una de las dos compañías, así que no hay total. Toca «Actualizar» para intentar otra vez.</div></div>';
  }
  h += '<div class="g2-dos">' + _g2Empresa('18', a) + _g2Empresa('26', b) + '</div>';
  h += '<div class="g2-pie"><b>Créditos activos:</b> los que están en cartera (al día o en mora). <b>Dinero en la calle:</b> lo que falta por cobrar de esos créditos, capital e intereses. '
    + '<b>En mora:</b> los que tienen al menos un día de atraso; el monto vencido es el saldo de sus cuotas ya vencidas. '
    + '<b>Lo que entró:</b> los pagos confirmados, cuotas e iniciales, por la fecha del pago. <b>Motos vendidas:</b> los créditos otorgados, por su fecha (sin los anulados ni las solicitudes sin aprobar). '
    + '<b>Cuotas a tiempo:</b> lo pagado hasta el día en que vencía la cuota; tarde, lo pagado después (los pagos se aplican a la cuota más vieja primero). '
    + 'Son las mismas cuentas del Dashboard de cada compañía.</div>';
  return '<div class="' + (_grupo.pidiendo ? 'g2-viejo' : '') + '">' + h + '</div>';
}

PG.grupo = function(){
  if(typeof hasModuleAccess === 'function' && !hasModuleAccess('grupo'))
    return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">No tienes acceso a PAGASI 18 + 26.</div></div>';
  // Al ENTRAR al módulo se calcula. Un redibujo automático (cuando cambia algo en la base de esta
  // compañía) no vuelve a pedir nada: si no, dejar la pestaña abierta sería estar leyendo sin parar.
  if(!window._rtRenderizando) setTimeout(function(){ grupoPedir(false); }, 0);
  return '<div class="page g2">'
    + pageBanner('Las dos compañías', 'PAGASI 18 + 26', 'Créditos, dinero en la calle y mora · <span id="g2-estado">' + _grupoEstadoTxt() + '</span>',
        [{ label: 'Actualizar', onclick: 'grupoActualizar()', primary: true }])
    + '<div id="g2-cuerpo">' + _grupoHtml() + '</div></div>';
};
