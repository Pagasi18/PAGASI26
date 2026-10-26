// Historial de tasas de cambio por día (Adam, 26-oct-2026: las facturas de proveedor "se puedan colocar en bolívares
// y el sistema, como tiene el tipo de cambio ya cargado, que le haga la conversión" a la tasa BCV de la fecha de la
// factura). Hasta hoy la tasa vivía en un solo documento (config/tasa) que se pisa cada día: para la factura de la
// semana pasada no había con qué dividir. Ahora cada tasa que baja la pantalla queda guardada en tasas/{AAAA-MM-DD}
// (dólar y euro BCV), y la que falte la pone el analista a mano y queda guardada para esa fecha.
// Solo lectura y escritura de tasas: no toca ningún monto del sistema.
//  · Documento: { fecha, usd, eur, usdManual, eurManual, fuente, fechaValor, guardadoEn, guardadoPor }. La marca
//    "manual" es por moneda: el dólar oficial y un euro puesto a mano conviven en el mismo día.
//  · La oficial (bajada del BCV) manda sobre la manual: una manual nunca pisa una oficial de esa fecha.

var _tasasCache = {};   // fecha → documento

function _tasasHoy(){ return (typeof hoyLocalISO === 'function') ? hoyLocalISO() : new Date().toISOString().slice(0, 10); }
function _tasasMasDias(iso, n){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); if(!m) return ''; return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10); }
function _tasasDiaSemana(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : -1; }   // 0 domingo … 6 sábado
function _tasasEsFinde(iso){ var d = _tasasDiaSemana(iso); return d === 0 || d === 6; }
function _tasasFechaVE(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function _tasasNum(v){ var n = Math.round((parseFloat(v) || 0) * 10000) / 10000; return n > 1 ? n : 0; }
function _tasasEsFecha(f){ return /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')); }

// Bolívares ↔ dólares, a 2 decimales
function bsAUsd(bs, tasa){ tasa = parseFloat(tasa) || 0; return tasa > 1 ? Math.round(((parseFloat(bs) || 0) / tasa) * 100) / 100 : 0; }
function usdABs(usd, tasa){ return Math.round(((parseFloat(usd) || 0) * (parseFloat(tasa) || 0)) * 100) / 100; }

// Qué tasa rige para una fecha, con lo que haya en el historial (mapa fecha → doc). Es una función pura.
//  · Día hábil con tasa registrada: esa, exacta.
//  · Sábado o domingo: rige la del día hábil siguiente (Ley de IVA, art. 25); si ese día no está registrado, la
//    siguiente que haya se da como aproximada. Una tasa puesta a mano para ese mismo sábado o domingo sí se respeta.
//  · Día hábil sin tasa: la siguiente registrada (hasta 4 días después y nunca después de hoy), aproximada.
//  · Si tampoco: la última registrada antes, hasta 7 días atrás, aproximada, para que la revisen.
//  · Nada: null (el analista la escribe a mano y queda guardada para esa fecha).
function tasasElegir(fecha, mapa, moneda, hoy){
  moneda = moneda === 'eur' ? 'eur' : 'usd'; mapa = mapa || {}; hoy = hoy || _tasasHoy();
  var de = function(f){ var d = mapa[f]; return d && _tasasNum(d[moneda]) ? { tasa: _tasasNum(d[moneda]), fechaTasa: f, manual: !!d[moneda + 'Manual'], fuente: d[moneda + 'Manual'] ? 'manual' : (d.fuente || 'historial') } : null; };
  var r, finde = _tasasEsFinde(fecha), habil = fecha;
  if(finde){ do { habil = _tasasMasDias(habil, 1); } while(_tasasEsFinde(habil)); }
  r = de(fecha);
  if(r && (!finde || r.manual)){ r.aproximada = false; r.nota = ''; return r; }
  for(var d = 1; d <= 4; d++){
    var f = _tasasMasDias(fecha, d);
    if(f > hoy) break;
    r = de(f);
    if(r){
      if(finde && f === habil){ r.aproximada = false; r.nota = 'El ' + _tasasFechaVE(fecha) + ' no es día hábil: rige la tasa del ' + _tasasFechaVE(f) + ' (Ley de IVA, art. 25)'; }
      else { r.aproximada = true; r.nota = 'No hay tasa registrada del ' + _tasasFechaVE(finde ? habil : fecha) + (finde ? ' (el día hábil siguiente al ' + _tasasFechaVE(fecha) + ')' : '') + ': se usa la del ' + _tasasFechaVE(f) + ', la siguiente registrada. Verifícala.'; }
      return r;
    }
  }
  for(var a = 1; a <= 7; a++){
    var fa = _tasasMasDias(fecha, -a);
    r = de(fa);
    if(r){ r.aproximada = true; r.nota = 'No hay tasa registrada del ' + _tasasFechaVE(fecha) + ': se usa la del ' + _tasasFechaVE(fa) + ', la última registrada. Verifícala.'; return r; }
  }
  return null;
}

// Guarda (o completa) la tasa de un día en tasas/{fecha}. Nunca borra lo que ya había (merge). Los sábados y
// domingos no se registra lo automático: el BCV no publica tasa esos días y rige la del lunes (art. 25).
function tasasRegistrarDia(fecha, campos){
  fecha = String(fecha || '').slice(0, 10);
  if(!_tasasEsFecha(fecha)) return Promise.resolve();
  var data = { fecha: fecha, guardadoEn: new Date().toISOString(), guardadoPor: (typeof S !== 'undefined' && S.currentUser && S.currentUser.nombre) || '' };
  Object.keys(campos || {}).forEach(function(k){ var v = campos[k]; if(v === undefined || v === null || v === '' || (typeof v === 'number' && !isFinite(v))) return; data[k] = v; });
  if(!('usd' in data) && !('eur' in data)) return Promise.resolve();
  _tasasCache[fecha] = Object.assign({}, _tasasCache[fecha] || {}, data);
  if(typeof db === 'undefined' || !db) return Promise.resolve();
  return db.collection('tasas').doc(fecha).set(data, { merge: true }).catch(function(e){ console.warn('[Tasas] No se pudo guardar la tasa del ' + fecha + ':', e && e.message); });
}
// La automática del día (bajada del BCV): nunca en fin de semana, y quita la marca manual de esa moneda
function tasasRegistrarOficial(fecha, moneda, valor, fuente, fechaValor){
  var t = _tasasNum(valor); if(!t || _tasasEsFinde(fecha)) return Promise.resolve();
  var c = { fuente: fuente || 'bcv' }; c[moneda === 'eur' ? 'eur' : 'usd'] = t; c[(moneda === 'eur' ? 'eur' : 'usd') + 'Manual'] = false;
  if(fechaValor && _tasasEsFecha(fechaValor)) c.fechaValor = fechaValor;
  return tasasRegistrarDia(fecha, c);
}
// La que el analista escribe a mano para una fecha (queda marcada y con quién la puso). Si ese día ya tiene la
// oficial de esa moneda, no la pisa: la factura se guarda con la tasa que él escribió, pero el historial conserva la oficial.
function tasaGuardarManual(fecha, moneda, valor){
  var t = _tasasNum(valor); moneda = moneda === 'eur' ? 'eur' : 'usd';
  if(!t || !_tasasEsFecha(fecha)) return Promise.resolve(false);
  return _tasasCargar(fecha).then(function(mapa){
    var d = mapa[fecha];
    if(d && _tasasNum(d[moneda]) && !d[moneda + 'Manual']) return false;   // la oficial manda
    var c = { fuente: 'manual' }; c[moneda] = t; c[moneda + 'Manual'] = true;
    return tasasRegistrarDia(fecha, c).then(function(){ return true; });
  });
}

// El archivo del robot (data/tasas-bcv.json, bot/tasa-bcv.js): la tasa oficial de cada día hábil, bajo su fecha
// valor, guardada en el repo de lunes a viernes aunque nadie abra el panel. Se lee una vez por sesión.
var _tasasArchivo = {}, _tasasArchivoPromesa = null;
function _tasasDelArchivo(){
  if(_tasasArchivoPromesa) return _tasasArchivoPromesa;
  if(typeof fetch !== 'function' || typeof window === 'undefined' || !window.location) return (_tasasArchivoPromesa = Promise.resolve({}));
  _tasasArchivoPromesa = fetch('data/tasas-bcv.json?nc=' + Date.now(), { cache: 'no-store' })
    .then(function(r){ return r.ok ? r.json() : {}; }).catch(function(){ return {}; })
    .then(function(t){ _tasasArchivo = t && typeof t === 'object' ? t : {}; return _tasasArchivo; });
  return _tasasArchivoPromesa;
}
// Mete el archivo en la caché: la oficial del robot manda sobre una manual de esa misma fecha y moneda
function _tasasMezclarArchivo(t){
  Object.keys(t || {}).forEach(function(f){
    if(!_tasasEsFecha(f)) return;
    var x = t[f] || {}, c = _tasasCache[f] = Object.assign({ fecha: f }, _tasasCache[f] || {});
    ['usd', 'eur'].forEach(function(m){
      var v = _tasasNum(x[m]); if(!v) return;
      if(!_tasasNum(c[m]) || c[m + 'Manual']){ c[m] = v; c[m + 'Manual'] = false; c.fuente = x.fuente || 'bcv.org.ve'; }
    });
  });
}

// Carga del historial las fechas alrededor de una (7 atrás, 4 adelante) y las deja en caché. Lo de hoy entra solo
// cuando se baja o se lee del día (bcv-auto lo registra): una tasa vieja que quedó en memoria no se da por la de hoy.
function _tasasCargar(fecha){
  var desde = _tasasMasDias(fecha, -7), hasta = _tasasMasDias(fecha, 4);
  var deFirestore = (typeof db === 'undefined' || !db) ? Promise.resolve() :
    db.collection('tasas').where('fecha', '>=', desde).where('fecha', '<=', hasta).get().then(function(snap){
      snap.forEach(function(d){ var x = d.data() || {}; if(_tasasEsFecha(d.id)) _tasasCache[d.id] = Object.assign({}, _tasasCache[d.id] || {}, x, { fecha: d.id }); });
    }).catch(function(e){ console.warn('[Tasas] No se pudo leer el historial:', e && e.message); });
  return Promise.all([_tasasDelArchivo(), deFirestore]).then(function(r){ _tasasMezclarArchivo(r[0]); return _tasasCache; });
}

// La tasa (Bs por $) que rige para una fecha: promesa con { tasa, fechaTasa, fuente, manual, aproximada, nota } o null
function tasaParaFecha(fecha, moneda){
  var hoy = _tasasHoy();
  fecha = String(fecha || '').slice(0, 10);
  if(!_tasasEsFecha(fecha) || fecha > hoy) fecha = hoy;
  return _tasasCargar(fecha).then(function(mapa){ return tasasElegir(fecha, mapa, moneda, hoy); });
}

if(typeof module !== 'undefined' && module.exports) module.exports = { tasasElegir: tasasElegir, bsAUsd: bsAUsd, usdABs: usdABs, _tasasMasDias: _tasasMasDias, _tasasDiaSemana: _tasasDiaSemana, _tasasEsFinde: _tasasEsFinde, _tasasMezclarArchivo: _tasasMezclarArchivo };
