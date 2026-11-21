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
function _g2Reparto(titulo, a, b, dinero){
  var t = (+a || 0) + (+b || 0), pa = t > 0 ? Math.round(a * 1000 / t) / 10 : 0, pb = t > 0 ? Math.round((100 - pa) * 10) / 10 : 0;
  var val = function(v){ return dinero ? '$' + _g2Num(v) : _g2Num(v); };
  return '<div class="g2-rep"><div class="g2-rep-t">' + titulo + '</div>'
    + '<div class="g2-barra" role="img" aria-label="' + titulo + ': PAGASI 18 ' + pa.toLocaleString('es-VE') + '%, PAGASI 26 ' + pb.toLocaleString('es-VE') + '%">'
    + (t > 0 ? '<i style="width:' + pa + '%;background:' + GRUPO_COLOR['18'] + '"></i><i style="width:' + pb + '%;background:' + GRUPO_COLOR['26'] + '"></i>' : '') + '</div>'
    + '<div class="g2-rep-l"><span><b style="background:' + GRUPO_COLOR['18'] + '"></b>18 · ' + val(a) + ' · ' + pa.toLocaleString('es-VE') + '%</span>'
    + '<span><b style="background:' + GRUPO_COLOR['26'] + '"></b>26 · ' + val(b) + ' · ' + pb.toLocaleString('es-VE') + '%</span></div></div>';
}
function _g2Empresa(emp, x){
  var nombre = (x && x.nombre) || ('PAGASI ' + emp), sitio = emp === '18' ? '18.pagasi.io · solo cobra' : 'pagasi.io · vende y cobra';
  var cab = '<div class="g2-cab"><span class="g2-chapa" style="background:' + GRUPO_COLOR[emp] + '">' + emp + '</span><div><div class="g2-nom">' + nombre + '</div><div class="g2-sitio">' + sitio + '</div></div></div>';
  if(!x || x.error || typeof x.creditos !== 'number')
    return '<div class="g2-card" data-g2-emp="' + emp + '">' + cab + '<div class="g2-falla">No se pudo leer esta compañía en este momento. Toca «Actualizar» para intentar otra vez.</div></div>';
  return '<div class="g2-card" data-g2-emp="' + emp + '">' + cab + _g2Cifras(x, false) + '</div>';
}
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
  } else {
    h += '<div class="g2-card g2-aviso"><div class="g2-falla">Falta una de las dos compañías, así que no hay total. Toca «Actualizar» para intentar otra vez.</div></div>';
  }
  h += '<div class="g2-dos">' + _g2Empresa('18', a) + _g2Empresa('26', b) + '</div>';
  h += '<div class="g2-pie"><b>Créditos activos:</b> los que están en cartera (al día o en mora). <b>Dinero en la calle:</b> lo que falta por cobrar de esos créditos, capital e intereses. '
    + '<b>En mora:</b> los que tienen al menos un día de atraso; el monto vencido es el saldo de sus cuotas ya vencidas. Son las mismas cuentas del Dashboard de cada compañía.</div>';
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
