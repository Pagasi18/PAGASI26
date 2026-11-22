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
  if(c && typeof grupoGraficos === 'function') grupoGraficos({ sinAnimar: !!_grupo.pidiendo });
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

// ══ Lo que se agregó el 21-nov (Adam: "dame más data… está muy vacío"; después "ponme charts" y
// "quiero los charts interactivos como el dashboard": los gráficos están en modules/grupo-graficos.js) ══
var G2_MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function _g2MesNom(mes){ return G2_MES[(+String(mes).slice(5, 7) || 1) - 1] || ''; }
function _g2MesCorto(mes){ var n = _g2MesNom(mes); return n === 'septiembre' ? 'sep' : n.slice(0, 3); }
function _g2Total(c){ return c ? (+c.cuotas || 0) + (+c.iniciales || 0) : 0; }
function _g2Plata0(v){ return '$' + _g2Num(v); }
// Cuánto pone cada compañía, en una línea chiquita con su color
function _g2Split(a, b, dinero){
  var v = function(x){ return dinero ? _g2Plata0(x) : _g2Num(x); };
  return '<span class="g2-split"><span><b style="background:' + GRUPO_COLOR['18'] + '"></b>18 · ' + v(a) + '</span><span><b style="background:' + GRUPO_COLOR['26'] + '"></b>26 · ' + v(b) + '</span></span>';
}
var _g2Ley = '<div class="g2-ley"><span><b style="background:' + GRUPO_COLOR['18'] + '"></b>PAGASI 18</span><span><b style="background:' + GRUPO_COLOR['26'] + '"></b>PAGASI 26</span></div>';
// Tiene los datos nuevos (un servidor de antes no los manda)
function _g2Completo(x){ return !!(x && x.cobro && Array.isArray(x.meses) && Array.isArray(x.tramos) && x.semana && x.historico); }
var _g2Tiene = function(x, k){ return !!(x && x[k] != null); };
// Lo que piden los gráficos: los días con sus ventas, la puntualidad, las cosechas, las formas de pago…
function _g2ConGraficos(a, b, j){
  var conDias = function(x){ return x && Array.isArray(x.dias) && x.dias.length >= 30 && x.dias[0] && 'ventas' in x.dias[0]; };
  return _g2Completo(a) && _g2Completo(b) && _g2Completo(j) && a.meses.length === b.meses.length && a.meses.length >= 2
    && conDias(a) && conDias(b) && a.dias.length === b.dias.length
    && ['puntualidad', 'cosechas', 'metodos', 'promedio'].every(function(k){ return _g2Tiene(a, k) && _g2Tiene(b, k) && _g2Tiene(j, k); })
    && Array.isArray(a.concesionarios) && Array.isArray(b.concesionarios) && Array.isArray(a.modelos) && Array.isArray(b.modelos);
}

// Desde qué mes mostrar los gráficos: el primero con algo en alguna de las dos (no meses vacíos al principio)
function _g2Desde(a, b){
  for(var i = 0; i < a.meses.length; i++){
    var x = a.meses[i], y = b.meses[i] || {};
    if(_g2Total(x) || x.ventas || _g2Total(y) || y.ventas) return Math.min(i, Math.max(0, a.meses.length - 3));
  }
  return Math.max(0, a.meses.length - 3);
}
function _g2Esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _g2CabSec(titulo, sub, derecha){
  return '<div class="g2-sec-cab"><div><div class="g2-sec-t">' + titulo + '</div>' + (sub ? '<div class="g2-sec-s">' + sub + '</div>' : '') + '</div>' + (derecha || '') + '</div>';
}
// El número grande y la línea de abajo de un gráfico, como las tarjetas del Dashboard
function _g2GrafCab(clave, cab, color){
  return '<div class="g2-graf-cab"><div class="dash-big g2-big"' + (color ? ' style="color:' + color + '"' : '') + ' data-g2="' + clave + '-big">' + cab.big + '</div><div class="cs dash-cs" data-g2="' + clave + '-sub">' + cab.sub + '</div></div>';
}
var G2_VERDE = '#16A34A', G2_AMBAR = '#F59E0B', G2_ROJO = '#E11D48';
var G2_DIA = ['dom','lun','mar','mié','jue','vie','sáb'];
function _g2FechaLarga(iso){ var d = new Date(String(iso) + 'T12:00:00Z'); return isNaN(d.getTime()) ? '' : G2_DIA[d.getUTCDay()] + ' ' + d.getUTCDate() + ' de ' + G2_MES[d.getUTCMonth()]; }

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
  var conGraf = _g2ConGraficos(a, b, j);
  return '<div class="g2-card g2-sec" data-g2-sec="cobrado">'
    + _g2CabSec('Lo que entró', 'Pagos confirmados de las dos compañías: cuotas e iniciales', _g2Ley)
    + '<div class="g2-cobro">'
    + '<div class="g2-cifras g2-cifras-c">'
    + celda('Hoy', 'hoy', detalle(c.hoy), 'cobro-hoy')
    + celda('Últimos 7 días', 'semana', detalle(c.semana), 'cobro-semana')
    + celda('En ' + _g2MesNom(mes), 'mes', compara, 'cobro-mes')
    + celda(_g2MesNom(mesAnt).replace(/^./, function(l){ return l.toUpperCase(); }) + ' completo', 'mesPasado', detalle(c.mesPasado), 'cobro-mes-pasado')
    + '</div>'
    + (conGraf ? '<div class="g2-cobro-g"><div class="g2-sec-cab g2-sec-cab-s"><div class="g2-rot">Cobrado</div>' + _g2SegPeriodo('cobro', ['diario', 'quincenal', 'mensual']) + '</div>'
      + _g2GrafCab('cobro', _g2CobroCab(a, b)) + _g2Lienzo('g2c-cobro', 210) + '</div>' : '')
    + '</div></div>';
}
// ── Las motos vendidas: Día / Quinc. / Mes ──
function _g2Ventas(a, b, j){
  var n = j.meses.length, x = j.meses[n - 1] || {}, y = j.meses[n - 2] || {};
  return '<div class="g2-card g2-sec" data-g2-sec="ventas">'
    + _g2CabSec('Motos vendidas', 'Créditos otorgados', _g2SegPeriodo('ventas', ['diario', 'quincenal', 'mensual']))
    + '<div class="g2-graf-cab-fila">' + _g2GrafCab('ventas', _g2VentasCab(a, b)) + _g2Ley + '</div>'
    + _g2Lienzo('g2c-ventas', 230)
    + '<div class="g2-mini g2-mini-3 g2-mini-f">'
    + '<div><div class="g2-rot">En ' + _g2MesNom(x.mes) + '</div><div class="g2-val g2-val-s" data-g2="ventas-mes">' + _g2Num(x.ventas) + '</div><div class="g2-nota">' + _g2Plata0(x.financiado) + ' financiado</div></div>'
    + '<div><div class="g2-rot">En ' + _g2MesNom(y.mes) + '</div><div class="g2-val g2-val-s" data-g2="ventas-mes-pasado">' + _g2Num(y.ventas) + '</div><div class="g2-nota">' + _g2Plata0(y.financiado) + ' financiado</div></div>'
    + '<div><div class="g2-rot">Desde el principio</div><div class="g2-val g2-val-s" data-g2="ventas-siempre">' + _g2Num(j.historico.vendidos) + '</div><div class="g2-nota">' + _g2Plata0(j.historico.financiado) + ' financiado</div></div>'
    + '</div></div>';
}
// ── La mora por días de atraso ──
var G2_TRAMO = { '1-15': 'De 1 a 15 días', '16-30': 'De 16 a 30 días', '31-60': 'De 31 a 60 días', '+60': 'Más de 60 días' };
function _g2Mora(a, b, j){
  var viejo = j.tramos[j.tramos.length - 1] || { vencido: 0 };
  var pct = j.vencido > 0 ? Math.round(viejo.vencido * 100 / j.vencido) : 0;
  var filas = j.tramos.map(function(t){ return '<span data-g2-tramo="' + t.tramo + '">' + (G2_TRAMO[t.tramo] || t.tramo) + ': <b>' + _g2Num(t.creditos) + '</b> · ' + _g2Plata0(t.vencido) + '</span>'; }).join('');
  return '<div class="g2-card g2-sec" data-g2-sec="mora">'
    + _g2CabSec('La mora por días de atraso', _g2Num(j.enMora) + ' créditos en mora · ' + _g2Plata0(j.vencido) + ' vencido', _g2Seg('mora', [['creditos', 'Créditos'], ['monto', 'Monto']], _g2Vista.mora))
    + _g2Ley + _g2Lienzo('g2c-mora', 190)
    + '<div class="g2-tramos-txt">' + filas + '</div>'
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
// ── Cómo pagan: lo cobrado por forma de pago (hoy, 7 días o el mes) ──
var G2_METODO = { banco: 'Banco (transferencia y pago móvil)', binance: 'Binance', efectivo: 'Efectivo', zelle: 'Zelle', concesionario: 'En el concesionario (iniciales)', otros: 'Otras' };
var G2_METODO_PERIODO = { hoy: ['hoy', 'Hoy', 'hoy'], semana: ['semana', '7 días', 'los últimos 7 días'], mes: ['mes', 'Mes', 'este mes'] };
function _g2Metodos(a, b, j){
  var per = _g2Vista.metodos, mj = _g2MetodosDe(j), c = (j.cobro || {})[per] || j.cobro.mes;
  var total = Object.keys(G2_METODO).reduce(function(s, k){ return s + (mj[k] || 0); }, 0);
  return '<div class="g2-card g2-sec" data-g2-sec="metodos">'
    + _g2CabSec('Cómo pagan', 'Lo cobrado ' + G2_METODO_PERIODO[per][2] + ' por forma de pago', _g2Seg('metodos', ['hoy', 'semana', 'mes'].map(function(k){ return [k, G2_METODO_PERIODO[k][1]]; }), per))
    + _g2GrafCab('metodos', { big: _g2Plata0(total), sub: 'cobrado ' + G2_METODO_PERIODO[per][2] })
    + (total > 0 ? _g2Lienzo('g2c-metodos', 230) : '<div class="g2-nota g2-vacio">Todavía no hay cobros ' + G2_METODO_PERIODO[per][2] + '.</div>')
    + '<div class="g2-reps g2-reps-1">' + _g2Reparto('Cuotas o iniciales', c.cuotas, c.iniciales, true, { a: 'Cuotas', b: 'Iniciales', na: 'Cuotas', nb: 'Iniciales', ca: '#6366F1', cb: '#F59E0B' })
    + _g2Reparto('Por compañía', _g2Total(((a.cobro || {})[per]) || {}), _g2Total(((b.cobro || {})[per]) || {}), true) + '</div></div>';
}
// ── Cómo se pagan las cuotas: a tiempo, tarde o sin pagar ──
function _g2Puntualidad(a, b, j){
  // El primer día del período (el 1, o el 16 en quincenas) todavía no vence ninguna cuota: se muestra el anterior
  var conCuotas = function(l){ var k = l.length - 1; while(k > 0 && !((l[k] || {}).monto > 0)) k--; return k; };
  var pl = _g2PuntualLista(a, b, j), lista = pl.lista || [], x = lista[conCuotas(lista)] || {};
  var ult = conCuotas(j.puntualidad), xa = a.puntualidad[ult], xb = b.puntualidad[ult], xm = j.puntualidad[ult] || {};
  var quien = _g2Vista.puntualEmp === 'juntas' ? 'las dos compañías' : 'PAGASI ' + _g2Vista.puntualEmp;
  var periodo = pl.q ? 'en la ' + _g2NomQuincena(x.quincena || '') : 'en ' + _g2MesNom(x.mes);
  var ley = '<div class="g2-ley"><span><b style="background:' + G2_VERDE + '"></b>A tiempo</span><span><b style="background:' + G2_AMBAR + '"></b>Tarde</span><span><b style="background:' + G2_ROJO + '"></b>Sin pagar</span></div>';
  return '<div class="g2-card g2-sec" data-g2-sec="puntualidad">'
    + _g2CabSec('Cómo se pagan las cuotas', 'Las cuotas que vencieron, ' + quien, _g2SegPeriodo('puntual', ['quincenal', 'mensual']))
    + '<div class="g2-graf-cab-fila">' + _g2GrafCab('puntual', { big: _g2PctDe(x, 'aTiempo') + '% a tiempo', sub: periodo + ' · ' + _g2PctDe(x, 'tarde') + '% tarde · ' + _g2PctDe(x, 'sinPagar') + '% sin pagar' }, G2_VERDE) + _g2SegEmpresa('puntualEmp') + '</div>'
    + ley + _g2Lienzo('g2c-puntual', 200)
    + '<div class="g2-nota g2-nota-f">En ' + _g2MesNom(xm.mes) + ' se pagó a tiempo el <b data-g2="puntual-mes">' + _g2PctDe(xm, 'aTiempo') + '%</b> de lo que venció (las dos compañías). '
    + 'A tiempo: PAGASI 18 ' + _g2PctDe(xa, 'aTiempo') + '% · PAGASI 26 ' + _g2PctDe(xb, 'aTiempo') + '%. A tiempo es pagada hasta el día en que vencía.</div></div>';
}
// ── Mora según el mes de venta (cómo están hoy las motos vendidas cada mes) ──
function _g2Cosechas(a, b, j, desde){
  var lista = _g2CosechasLista(a, b, j, desde), peor = null;
  var pct = function(x){ return x && x.vendidos > 0 ? Math.round(x.enMora * 1000 / x.vendidos) / 10 : 0; };
  lista.forEach(function(x){ if(x.vendidos >= 10 && (!peor || pct(x) > pct(peor))) peor = x; });
  var ley = '<div class="g2-ley"><span><b style="background:#FDA4AF"></b>1 a 30 días</span><span><b style="background:' + G2_ROJO + '"></b>Más de 30 días</span></div>';
  return '<div class="g2-card g2-sec" data-g2-sec="cosechas">'
    + _g2CabSec('Mora según el mes de venta', 'De las motos vendidas cada mes, qué porcentaje está hoy en mora', _g2SegEmpresa('cosechasEmp'))
    + ley + _g2Lienzo('g2c-cosechas', 210)
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
function _g2Ranking(tipo, a, b){
  var esConc = tipo === 'conc', mes = _g2Vista[tipo] === 'mes', filas = _g2RankingFilas(a, b, tipo);
  var titulo = esConc ? 'Los concesionarios que más venden' : 'Las motos más vendidas';
  var sub = (esConc ? 'Motos vendidas por concesionario' : 'Por modelo') + (mes ? ', este mes' : ', desde el principio') + (esConc && !mes ? ' · al pasar el mouse, su mora' : '');
  var alto = Math.max(120, filas.length * 30 + 30);
  return '<div class="g2-card g2-sec" data-g2-sec="' + tipo + '">'
    + _g2CabSec(titulo, sub, _g2Seg(tipo, [['mes', 'Este mes'], ['siempre', 'Siempre']], _g2Vista[tipo]))
    + _g2Ley + (filas.length ? _g2Lienzo('g2c-' + tipo, alto) : '<div class="g2-nota g2-vacio">Sin ventas ' + (mes ? 'este mes' : 'todavía') + '.</div>')
    + '</div>';
}
// Cada tarjeta por su nombre (para redibujar solo esa al tocar un botón)
function _g2Tarjeta(sec, a, b, j, hoy){
  switch(sec){
    case 'cobrado': return _g2Cobrado(a, b, j, hoy);
    case 'ventas': return _g2Ventas(a, b, j);
    case 'puntualidad': return _g2Puntualidad(a, b, j);
    case 'metodos': return _g2Metodos(a, b, j);
    case 'mora': return _g2Mora(a, b, j);
    case 'cosechas': return _g2Cosechas(a, b, j, _g2Desde(a, b));
    case 'conc': case 'modelo': return _g2Ranking(sec, a, b);
  }
  return '';
}
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
      h += _g2Cobrado(a, b, j, d.hoy);
      if(_g2ConGraficos(a, b, j)){
        h += _g2Titulo('Cobranza');
        h += '<div class="g2-tres">' + _g2Puntualidad(a, b, j) + _g2Metodos(a, b, j) + _g2Semana(a, b, j, d.hoy) + '</div>';
        h += '<div class="g2-dos">' + _g2Mora(a, b, j) + _g2Cosechas(a, b, j, _g2Desde(a, b)) + '</div>';
        h += _g2Titulo('Ventas');
        h += '<div class="g2-fila-21">' + _g2Ventas(a, b, j) + _g2Promedio(a, b, j) + '</div>';
        h += '<div class="g2-dos">' + _g2Ranking('conc', a, b) + _g2Ranking('modelo', a, b) + '</div>';
        h += _g2Titulo('Cada compañía');
      } else {
        h += '<div class="g2-tres">' + _g2Semana(a, b, j, d.hoy) + '</div>';
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
    + 'Pasa el mouse por los gráficos para ver el detalle de cada barra. Son las mismas cuentas del Dashboard de cada compañía.</div>';
  return '<div class="' + (_grupo.pidiendo ? 'g2-viejo' : '') + '">' + h + '</div>';
}

PG.grupo = function(){
  if(typeof hasModuleAccess === 'function' && !hasModuleAccess('grupo'))
    return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">No tienes acceso a PAGASI 18 + 26.</div></div>';
  // Al ENTRAR al módulo se calcula. Un redibujo automático (cuando cambia algo en la base de esta
  // compañía) no vuelve a pedir nada: si no, dejar la pestaña abierta sería estar leyendo sin parar.
  var rt = !!window._rtRenderizando;
  if(!rt) setTimeout(function(){ grupoPedir(false); }, 0);
  // Los gráficos se dibujan cuando el HTML ya está en la pantalla (en un redibujo automático, sin animación)
  if(typeof grupoGraficos === 'function') setTimeout(function(){ if(S.page === 'grupo') grupoGraficos({ sinAnimar: rt }); }, 0);
  return '<div class="page g2">'
    + pageBanner('Las dos compañías', 'PAGASI 18 + 26', 'Créditos, dinero en la calle y mora · <span id="g2-estado">' + _grupoEstadoTxt() + '</span>',
        [{ label: 'Actualizar', onclick: 'grupoActualizar()', primary: true }])
    + '<div id="g2-cuerpo">' + _grupoHtml() + '</div></div>';
};
