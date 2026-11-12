// MULTIMONEDA: dólares y bolívares (Adam, 11-nov-2026: "estamos cobrando en bolívares, pero se está registrando en
// dólares… si me entra un pago móvil, yo lo pongo más o menos en dólares. Necesito que la plataforma sea multimoneda…
// cada gasto y cada cobro queda anclado al dólar del día de elección… si pongo que la salida fue de la cuenta de
// bolívares, fue en bolívares; si pongo Binance, fue en dólares… cada cambio puede ser una tasa distinta, se elige").
//
// La regla: NADA de la lógica cambia. El crédito, las cuotas, la mora y todos los reportes siguen en dólares, y cada
// registro sigue guardando su `monto` en dólares, que es lo único que lee el resto del sistema. Lo que se agrega:
//  · La moneda la decide la CUENTA (Configuración → cuentas bancarias, campo Moneda). Si la cuenta es de bolívares, el
//    formulario pide los bolívares y la tasa, y calcula los dólares: ya nadie los pone "más o menos" a mano.
//  · La tasa se elige al registrar (dólar BCV o euro BCV de la fecha del movimiento, u otra escrita a mano) y queda
//    guardada en el registro: moneda:'BS', montoBs, tasaBs, tasaMoneda, tasaFecha, tasaFuente. Los mismos campos que
//    ya usan los gastos en bolívares desde el 26-oct-2026.
//  · Cada cuenta de bolívares tiene su saldo real en Bs (lo que hay en el banco), además del valor en dólares con que
//    se registró cada movimiento ("en libros"). La diferencia entre los dos es lo que se perdió (o ganó) por guardar
//    bolívares mientras sube el dólar: se ve en Cuentas y se registra como "diferencia cambiaria".
//  · Los registros viejos se quedan como están. Un movimiento sin bolívares guardados, en una cuenta de bolívares, se
//    estima con la tasa del día que ya traía (tasaBs) y se marca como estimado.
// Aquí no se calcula nada de créditos: solo conversión, el formulario de bolívares y el saldo en Bs de las cuentas.

var _MM_CAMPOS = ['montoBs', 'tasaMoneda', 'tasaFecha', 'tasaFuente'];
function _mmR2(n){ return Math.round((parseFloat(n) || 0) * 100) / 100; }
function _mmEsc(v){ return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function _mmEl(id){ return (typeof document !== 'undefined' && document.getElementById) ? document.getElementById(id) : null; }
function _mmFechaVE(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function _mmHoy(){ return (typeof hoyLocalISO === 'function') ? hoyLocalISO() : new Date().toISOString().slice(0, 10); }
function _mmBsAUsd(bs, t){ t = parseFloat(t) || 0; return t > 1 ? Math.round(((parseFloat(bs) || 0) / t) * 100) / 100 : 0; }
function _mmUsdABs(usd, t){ return Math.round(((parseFloat(usd) || 0) * (parseFloat(t) || 0)) * 100) / 100; }
function mmFmtBs(n){ return 'Bs ' + _mmR2(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function mmFmtTasa(t){ return (parseFloat(t) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }); }
function _mmFmtUsd(n){ return (typeof fmt === 'function') ? fmt(n) : '$' + _mmR2(n).toFixed(2); }

// ── La moneda la decide la cuenta ──
function mmCuenta(nombre){ var l = (typeof _cuentasBanc !== 'undefined' && _cuentasBanc) || []; for(var i = 0; i < l.length; i++){ if(l[i] && l[i].nombre === nombre) return l[i]; } return null; }
function _mmMonedaEsBs(m){ return /^(BS\.?|VES|VEF|VED)$/.test(String(m || 'USD').trim().toUpperCase()); }   // Configuración guarda 'BS'; VES/VEF/VED por si una cuenta vieja lo trae así
function mmCuentaEsBs(nombre){ var c = mmCuenta(nombre); return !!c && _mmMonedaEsBs(c.moneda); }
function mmCuentasBs(){ return ((typeof _cuentasBanc !== 'undefined' && _cuentasBanc) || []).filter(function(c){ return c && _mmMonedaEsBs(c.moneda); }); }

// ── Los bolívares de un registro (pago, gasto o movimiento) ──
function mmEsBs(o){ return !!o && o.moneda === 'BS' && parseFloat(o.montoBs) > 0; }
// Pone (o quita) los bolívares en un registro. d = { montoBs, tasaBs, tasaMoneda, tasaFecha, tasaFuente } o null.
// Al quitarlos, tasaBs se queda: los registros en dólares siempre guardaron ahí la tasa del día, de referencia.
function mmAplicar(o, d){
  if(!o) return o;
  if(d && parseFloat(d.montoBs) > 0 && parseFloat(d.tasaBs) > 1){
    o.moneda = 'BS'; o.montoBs = _mmR2(d.montoBs); o.tasaBs = Math.round(parseFloat(d.tasaBs) * 10000) / 10000;
    o.tasaMoneda = d.tasaMoneda || 'usd'; o.tasaFecha = d.tasaFecha || ''; o.tasaFuente = d.tasaFuente || '';
  } else if(o.moneda === 'BS'){
    delete o.moneda; _MM_CAMPOS.forEach(function(k){ delete o[k]; });
  }
  return o;
}
function mmDatosDe(o){ return mmEsBs(o) ? { montoBs: o.montoBs, tasaBs: o.tasaBs, tasaMoneda: o.tasaMoneda, tasaFecha: o.tasaFecha, tasaFuente: o.tasaFuente } : null; }
function mmCopiar(dest, src){ return mmAplicar(dest, mmDatosDe(src)); }   // el movimiento de un pago lleva los mismos bolívares que el pago
// "Bs 47.147,74 a 889,58" para las listas; vacío si el registro es en dólares
function mmTexto(o){ return mmEsBs(o) ? mmFmtBs(o.montoBs) + ' a ' + mmFmtTasa(o.tasaBs) : ''; }
function mmEtiquetaHtml(o){ var t = mmTexto(o); return t ? '<div style="font-size:10px;font-weight:600;color:var(--ink3);white-space:nowrap">' + _mmEsc(t) + '</div>' : ''; }

// ── El saldo real en bolívares de una cuenta ──
// Cuándo se anotó un movimiento (no su fecha): lo que se registró después de cuadrar el saldo es lo que lo mueve
function _mmMovMs(m){
  if(m && m.creadoEn){ var t = Date.parse(m.creadoEn); if(!isNaN(t)) return t; }
  var x = /(\d{13})/.exec(String((m && m.id) || '')); if(x) return +x[1];
  var f = Date.parse(String((m && m.fecha) || '').slice(0, 10) + 'T23:59:59'); return isNaN(f) ? 0 : f;
}
// Los bolívares que mueve: los guardados; si no hay, los dólares por la tasa del día que traía (estimado)
function mmMovBs(m){
  if(!m || m.sinBs) return { bs: 0, estimado: false };
  if(parseFloat(m.montoBs) > 0) return { bs: _mmR2(m.montoBs), estimado: false };
  var t = parseFloat(m.tasaBs) || 0, v = parseFloat(m.monto) || 0;
  return t > 1 ? { bs: _mmR2(v * t), estimado: true } : { bs: 0, estimado: true, sinTasa: true };
}
// apertura = { saldoBs, enMs }: el saldo real que alguien contó en el banco, y cuándo. Desde ahí se suma y resta.
function mmSaldoBs(nombre, movs, apertura){
  var bs = apertura ? _mmR2(apertura.saldoBs) : 0, desde = apertura ? (+apertura.enMs || 0) : 0, est = 0;
  (movs || []).forEach(function(m){
    if(!m || m.eliminado) return;
    var entra = m.cuentaDestino === nombre, sale = m.cuentaOrigen === nombre;
    if(!entra && !sale) return;
    if(desde && _mmMovMs(m) <= desde) return;
    var x = mmMovBs(m);
    if(x.estimado) est++;
    if(entra) bs += x.bs;
    if(sale) bs -= x.bs;
  });
  return { bs: _mmR2(bs), estimados: est, cuadrado: !!apertura };
}
// Dólares "en libros" de una cuenta: la suma de sus movimientos, cada uno a la tasa del día en que se registró
function mmLibro(nombre, movs){
  var s = 0;
  (movs || []).forEach(function(m){ if(!m || m.eliminado) return; var v = _mmR2(m.monto); if(m.cuentaDestino === nombre) s += v; if(m.cuentaOrigen === nombre) s -= v; });
  return _mmR2(s);
}
// Lo que vale hoy una cuenta de bolívares frente a lo que dicen los libros. dif < 0 = pérdida por la subida del dólar
function mmValor(nombre, movs, apertura, tasaHoy){
  var s = mmSaldoBs(nombre, movs, apertura), libro = mmLibro(nombre, movs), t = parseFloat(tasaHoy) || 0;
  var real = t > 1 ? _mmR2(s.bs / t) : null;
  return { bs: s.bs, estimados: s.estimados, cuadrado: s.cuadrado, libro: libro, real: real, dif: real == null ? null : _mmR2(real - libro), tasa: t };
}
// Al cambiar bolívares por dólares: los Bs que salen costaron (en libros) su parte del saldo; lo que entra en dólares
// es menos si el dólar subió mientras tanto. La diferencia es la pérdida (negativa) o ganancia de ESE cambio.
function mmDiferenciaCambio(antes, bsQueSalen, usdQueEntran){
  if(!antes || !(antes.bs > 0) || !(antes.libro > 0) || !(bsQueSalen > 0)) return 0;
  var costo = _mmR2(antes.libro * Math.min(1, bsQueSalen / antes.bs));
  return _mmR2(usdQueEntran - costo);
}
// El movimiento que deja la diferencia en la cuenta: una pérdida sale de ella, una ganancia entra. No mueve bolívares.
function mmMovDiferencia(nombre, dif, fecha, tasa, quien, ahoraMs, nota){
  dif = _mmR2(dif); if(!dif) return null;
  var perdida = dif < 0, ms = ahoraMs || Date.now();
  return { id: 'MOV-' + ms + '-DC', tipo: perdida ? 'retiro' : 'deposito', tipoOperacion: 'ajuste_cambiario', sinBs: true,
    concepto: 'Diferencia cambiaria (' + (perdida ? 'pérdida' : 'ganancia') + ') · ' + nombre + (nota ? ' · ' + nota : ''),
    monto: Math.abs(dif), cuentaOrigen: perdida ? nombre : null, cuentaDestino: perdida ? null : nombre,
    fecha: fecha || _mmHoy(), referencia: '', tasaBs: parseFloat(tasa) || 1, realizadoPor: quien || 'Admin',
    hora: new Date(ms).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }) };
}
function mmEsDiferencia(m){ return !!m && m.tipoOperacion === 'ajuste_cambiario'; }
// Lo registrado como diferencia cambiaria en un período (prefijo de fecha: '2026-11'): negativo = pérdida neta
function mmDiferenciaRegistrada(movs, prefijo){
  var s = 0;
  (movs || []).forEach(function(m){ if(!m || m.eliminado || !mmEsDiferencia(m)) return; if(prefijo && String(m.fecha || '').indexOf(prefijo) !== 0) return; s += m.cuentaDestino ? _mmR2(m.monto) : -_mmR2(m.monto); });
  return _mmR2(s);
}

// ── Configuración guardada (config/multimoneda): el saldo cuadrado de cada cuenta de bolívares ──
var _mmCfg = null, _mmCfgCargando = false;
function mmApertura(nombre){ return (_mmCfg && _mmCfg.aperturas && _mmCfg.aperturas[nombre]) || null; }
function mmCargar(){
  if(_mmCfg || _mmCfgCargando || typeof DB === 'undefined' || !DB.getMultimoneda) return;
  _mmCfgCargando = true;
  DB.getMultimoneda().then(function(d){
    _mmCfg = d || {}; if(!_mmCfg.aperturas) _mmCfg.aperturas = {};
    _mmCfgCargando = false;
    if(typeof S !== 'undefined' && S.page === 'cuentas' && typeof nav === 'function' && !(_mmEl('ov') && _mmEl('ov').style.display === 'flex')) nav('cuentas');
  }).catch(function(){ _mmCfgCargando = false; });
}
// La tasa de hoy para valorar: la del día que ya baja el panel (dólar BCV); si no llegó, la del historial
function mmTasaHoy(){
  if(typeof window !== 'undefined' && parseFloat(window._tasaBsGlobal) > 1) return parseFloat(window._tasaBsGlobal);
  if(typeof tasasElegir === 'function' && typeof _tasasCache !== 'undefined'){ var r = tasasElegir(_mmHoy(), _tasasCache, 'usd', _mmHoy()); if(r && r.tasa > 1) return r.tasa; }
  return 0;
}
function mmValorCuenta(nombre){ return mmValor(nombre, (typeof S !== 'undefined' && S.movimientos) || [], mmApertura(nombre), mmTasaHoy()); }

// ══════════════ EL BLOQUE DE BOLÍVARES DE UN FORMULARIO ══════════════
// Se engancha a un formulario que ya existe, sin cambiarlo: mientras la cuenta elegida sea de bolívares, aparece el
// bloque, el usuario escribe los bolívares y la tasa, y el bloque pone los dólares en el campo de monto de siempre
// (el formulario sigue leyendo ese campo, igual que si lo hubieran escrito a mano). Al guardar, mmSellar() deja los
// bolívares en el registro.
//  cfg = { p: prefijo, monto: id del monto en $, cuentas: [ids de los select de cuenta], fecha: id de la fecha,
//          registro: el registro que se edita (si ya estaba en Bs, vuelve a salir), reinicia: [ids que al cambiar
//          proponen otro monto], libre: true si los dólares también se pueden escribir (cambios: la tasa sale sola),
//          titulo: texto del bloque }
var _mm = {};
function mmEnganchar(cfg){
  var p = cfg.p, elM = _mmEl(cfg.monto); if(!elM) return;
  var st = _mm[p] = { cfg: cfg, req: 0, fuente: '', tasaFecha: '', sello: null, propio: false };
  // Un registro anterior a multimoneda (sin bolívares guardados) se puede corregir sin escribirlos: se queda como está
  st.opcional = !!cfg.registro && !mmEsBs(cfg.registro);
  var cont = (elM.closest && elM.closest('.fg')) || elM.parentNode, box = document.createElement('div');
  box.id = p + '_mmbox'; box.style.cssText = 'display:none;grid-column:1/-1';
  box.innerHTML = '<div style="border:1px solid rgba(37,99,235,.30);background:rgba(37,99,235,.05);border-radius:9px;padding:10px 12px">'
    + '<div id="' + p + '_mmtit" style="font-size:11.5px;font-weight:800;color:var(--ink2);margin-bottom:7px">' + _mmEsc(cfg.titulo || 'Cuenta en bolívares: escribe los bolívares y elige la tasa') + '</div>'
    + '<div class="fgr" style="gap:8px">'
    +   '<div class="fg"><label>Monto en bolívares (Bs) *</label><input class="fi" id="' + p + '_mmbs" type="number" step="0.01" min="0" placeholder="0,00" oninput="mmCalc(\'' + p + '\')"></div>'
    +   '<div class="fg"><label>Tasa (Bs por $) *</label><div style="display:flex;gap:6px">'
    +     '<select class="fs" id="' + p + '_mmsel" style="max-width:128px" onchange="mmTasaBuscar(\'' + p + '\')"><option value="usd">Dólar BCV</option><option value="eur">Euro BCV</option><option value="otra">Otra tasa</option></select>'
    +     '<input class="fi" id="' + p + '_mmtasa" type="number" step="0.0001" min="1" placeholder="Ej: 889.58" oninput="mmTasaManual(\'' + p + '\')"></div></div>'
    + '</div>'
    + '<div id="' + p + '_mminfo" style="font-size:10.5px;color:var(--ink3);margin-top:4px;line-height:1.4"></div>'
    + '<div id="' + p + '_mmeq" style="font-size:12.5px;font-weight:800;margin-top:5px;min-height:16px"></div>'
    + '<div id="' + p + '_mmsug" style="font-size:11px;color:var(--ink2);margin-top:2px"></div>'
    + '</div>';
  if(cont && cont.parentNode) cont.parentNode.insertBefore(box, cont.nextSibling);
  (cfg.cuentas || []).forEach(function(id){ var e = _mmEl(id); if(e && e.addEventListener) e.addEventListener('change', function(){ mmCuentaCambio(p); }); });
  var ef = cfg.fecha && _mmEl(cfg.fecha); if(ef && ef.addEventListener) ef.addEventListener('change', function(){ if(mmActivo(p) && (_mmEl(p + '_mmsel') || {}).value !== 'otra') mmTasaBuscar(p); });
  // Algo del formulario propuso otro monto (cambió el crédito, el descuento): los bolívares escritos ya no valen
  (cfg.reinicia || []).forEach(function(id){ var e = _mmEl(id); if(e && e.addEventListener) ['change', 'input'].forEach(function(ev){ e.addEventListener(ev, function(){ setTimeout(function(){ if(mmActivo(p)){ var b = _mmEl(p + '_mmbs'); if(b) b.value = ''; mmCalc(p); } }, 0); }); }); });
  // En los cambios de moneda los dólares también se escriben: la tasa sale de dividir
  if(cfg.libre && elM.addEventListener) elM.addEventListener('input', function(){ if(st.propio || !mmActivo(p)) return; var bs = parseFloat((_mmEl(p + '_mmbs') || {}).value) || 0, usd = parseFloat(elM.value) || 0; if(bs > 0 && usd > 0){ var t = _mmEl(p + '_mmtasa'), s = _mmEl(p + '_mmsel'); if(t) t.value = String(Math.round(bs / usd * 10000) / 10000); if(s) s.value = 'otra'; st.fuente = 'manual'; mmPintar(p); } });
  // Lo que ya estaba guardado en bolívares vuelve a salir tal cual, con su tasa
  var r = cfg.registro;
  if(mmEsBs(r)){
    var b0 = _mmEl(p + '_mmbs'), t0 = _mmEl(p + '_mmtasa'), s0 = _mmEl(p + '_mmsel');
    if(b0) b0.value = String(r.montoBs); if(t0) t0.value = String(r.tasaBs);
    if(s0) s0.value = (r.tasaFuente === 'manual' || r.tasaMoneda === 'otra') ? 'otra' : (r.tasaMoneda === 'eur' ? 'eur' : 'usd');
    st.fuente = r.tasaFuente || ''; st.tasaFecha = r.tasaFecha || ''; st.guardada = true;
  }
  // El guardado de siempre, con una revisión antes: en bolívares hacen falta los bolívares y la tasa
  // (los formularios que no guardan con S.saveFn llaman a mmRevisar() ellos mismos: cfg.sinSaveFn)
  if(!cfg.sinSaveFn && typeof S !== 'undefined' && typeof S.saveFn === 'function'){
    var orig = S.saveFn;
    S.saveFn = function(){ if(!mmRevisar(p)) return false; return orig.apply(this, arguments); };
  }
  mmCuentaCambio(p, true);
}
// Antes de guardar: si la cuenta es de bolívares, tienen que estar los bolívares y la tasa, y dar los dólares del campo.
// Deja listo lo que mmSellar() pondrá en el registro. true = se puede guardar.
function mmRevisar(p){
  var st = _mm[p]; if(!st) return true;
  st.sello = null;
  if(!_mmEl(p + '_mmbox') || !mmActivo(p)) return true;
  var d = mmLeer(p), elM = _mmEl(st.cfg.monto);
  if(!d && st.opcional && !(parseFloat((_mmEl(p + '_mmbs') || {}).value) > 0)) return true;
  if(!d){ if(typeof toast === 'function') toast('La cuenta es de bolívares: escribe el monto en bolívares y la tasa', 'error'); return false; }
  var usd = parseFloat(elM && elM.value) || 0;
  if(Math.abs(d.usd - usd) > (st.cfg.libre ? 0.011 : 0.005)){ if(typeof toast === 'function') toast('Los bolívares no coinciden con el monto en dólares (' + _mmFmtUsd(usd) + '): vuelve a escribir los bolívares', 'error'); return false; }
  st.sello = d;
  return true;
}
function mmActivo(p){ var st = _mm[p]; if(!st) return false; return (st.cfg.cuentas || []).some(function(id){ var e = _mmEl(id); return !!e && mmCuentaEsBs(e.value); }); }
function mmCuentaCambio(p, alAbrir){
  var st = _mm[p]; if(!st) return;
  var bs = mmActivo(p), box = _mmEl(p + '_mmbox'), elM = _mmEl(st.cfg.monto);
  if(box) box.style.display = bs ? '' : 'none';
  if(elM && !st.cfg.libre && !st.opcional){ elM.readOnly = bs; elM.style.background = bs ? 'var(--surf)' : ''; elM.title = bs ? 'Se calcula con los bolívares y la tasa' : ''; }
  if(!bs) return;
  if(st.opcional){ var ti = _mmEl(p + '_mmtit'); if(ti) ti.textContent = 'Registro anterior a multimoneda: los bolívares son opcionales. Si los escribes, el monto en dólares se recalcula con la tasa.'; }
  if(alAbrir && st.guardada){ mmInfo(p, 'Tasa guardada con el registro' + (st.tasaFecha ? ' · del ' + _mmFechaVE(st.tasaFecha) : '') + (st.fuente ? ' · ' + _mmEsc(st.fuente) : '')); mmPintar(p); return; }
  if((_mmEl(p + '_mmsel') || {}).value === 'otra' && parseFloat((_mmEl(p + '_mmtasa') || {}).value) > 1) mmCalc(p); else mmTasaBuscar(p);
}
function mmInfo(p, txt, color){ var el = _mmEl(p + '_mminfo'); if(el){ el.textContent = txt; el.style.color = color || 'var(--ink3)'; } }
function mmFechaDe(p){ var st = _mm[p], e = st && st.cfg.fecha && _mmEl(st.cfg.fecha), f = (e && e.value) || ''; return /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : _mmHoy(); }
// Busca en el historial la tasa BCV de la fecha del movimiento (logic/tasas.js). "Otra tasa" es la que escriben.
function mmTasaBuscar(p){
  var st = _mm[p]; if(!st) return;
  var sel = (_mmEl(p + '_mmsel') || {}).value || 'usd', ti = _mmEl(p + '_mmtasa'), fecha = mmFechaDe(p);
  st.guardada = false;
  if(sel === 'otra'){ st.fuente = 'manual'; st.tasaFecha = fecha; mmInfo(p, 'Escribe la tasa a la que se hizo este movimiento. Queda guardada con él.'); mmCalc(p); return; }
  var mio = ++st.req;
  if(typeof tasaParaFecha !== 'function'){ mmInfo(p, 'Escribe la tasa del ' + _mmFechaVE(fecha) + ' (Bs por $).'); return; }
  mmInfo(p, 'Buscando la tasa del ' + _mmFechaVE(fecha) + '…');
  tasaParaFecha(fecha, sel === 'eur' ? 'eur' : 'usd').then(function(r){
    if(mio !== st.req) return;   // llegó tarde: ya se pidió otra
    if(r && r.tasa > 1){
      if(ti) ti.value = String(r.tasa);
      st.fuente = r.fuente || 'historial'; st.tasaFecha = r.fechaTasa || fecha;
      mmInfo(p, (sel === 'eur' ? 'Euro' : 'Dólar') + ' BCV del ' + _mmFechaVE(r.fechaTasa || fecha) + (r.nota ? ' · ' + r.nota : '') + '. Puedes cambiarla: queda la que dejes.', r.aproximada ? '#BA7517' : '');
    } else {
      if(ti) ti.value = '';
      st.fuente = ''; st.tasaFecha = fecha;
      mmInfo(p, 'No hay tasa registrada del ' + _mmFechaVE(fecha) + ': escríbela (Bs por $).', '#BA7517');
    }
    mmCalc(p);
  }).catch(function(){ if(mio === st.req){ mmInfo(p, 'No se pudo leer la tasa: escríbela (Bs por $).', '#BA7517'); mmCalc(p); } });
}
function mmTasaManual(p){ var st = _mm[p]; if(!st) return; var s = _mmEl(p + '_mmsel'); if(s) s.value = 'otra'; st.req++; st.fuente = 'manual'; st.tasaFecha = mmFechaDe(p); st.guardada = false; mmInfo(p, 'Tasa escrita a mano. Queda guardada con el movimiento.'); mmCalc(p); }
// Con los bolívares y la tasa pone los dólares en el campo de siempre, y avisa a quien lo escuche
function mmCalc(p){
  var st = _mm[p]; if(!st) return;
  var elM = _mmEl(st.cfg.monto), bs = parseFloat((_mmEl(p + '_mmbs') || {}).value) || 0, t = parseFloat((_mmEl(p + '_mmtasa') || {}).value) || 0;
  if(elM && bs > 0 && t > 1){
    var usd = _mmBsAUsd(bs, t);
    if(elM.value !== usd.toFixed(2)){
      elM.value = usd.toFixed(2);
      st.propio = true;
      try { elM.dispatchEvent(new Event('input', { bubbles: true })); } catch(e){}
      st.propio = false;
    }
  }
  mmPintar(p);
}
function mmPintar(p){
  var st = _mm[p]; if(!st) return;
  var elM = _mmEl(st.cfg.monto), bs = parseFloat((_mmEl(p + '_mmbs') || {}).value) || 0, t = parseFloat((_mmEl(p + '_mmtasa') || {}).value) || 0;
  var usd = parseFloat(elM && elM.value) || 0, eq = _mmEl(p + '_mmeq'), sug = _mmEl(p + '_mmsug');
  if(eq){ eq.textContent = (bs > 0 && t > 1) ? mmFmtBs(bs) + ' ÷ ' + mmFmtTasa(t) + ' = ' + _mmFmtUsd(_mmBsAUsd(bs, t)) : ''; eq.style.color = 'var(--green)'; }
  if(sug){
    // Sin bolívares escritos, el campo de dólares trae lo que el formulario propone (la cuota, el saldo): cuántos Bs son
    if(!(bs > 0) && usd > 0 && t > 1){ var nec = _mmUsdABs(usd, t); sug.innerHTML = 'Para ' + _mmEsc(_mmFmtUsd(usd)) + ' completos son <b>' + _mmEsc(mmFmtBs(nec)) + '</b> a esta tasa. <a href="javascript:void(0)" onclick="mmUsar(\'' + p + '\',' + nec + ')" style="font-weight:700;color:var(--p1)">Usar ese monto</a>'; }
    else sug.textContent = '';
  }
}
function mmUsar(p, bs){ var b = _mmEl(p + '_mmbs'); if(b){ b.value = String(bs); mmCalc(p); } }
// Lo que se guarda: null si falta algo
function mmLeer(p){
  var st = _mm[p]; if(!st) return null;
  var bs = _mmR2((_mmEl(p + '_mmbs') || {}).value), t = Math.round((parseFloat((_mmEl(p + '_mmtasa') || {}).value) || 0) * 10000) / 10000, sel = (_mmEl(p + '_mmsel') || {}).value || 'usd';
  if(!(bs > 0) || !(t > 1)) return null;
  return { montoBs: bs, tasaBs: t, tasaMoneda: sel, tasaFecha: st.tasaFecha || mmFechaDe(p), tasaFuente: sel === 'otra' ? 'manual' : (st.fuente || 'historial'), usd: _mmBsAUsd(bs, t) };
}
// Deja en el registro los bolívares del formulario p (o los quita, si ahora la cuenta es en dólares)
function mmSellar(o, p){ var st = _mm[p]; if(!st || !o) return o; return mmAplicar(o, st.sello); }
function mmSello(p){ return (_mm[p] && _mm[p].sello) || null; }

// ══════════════ CUENTAS: lo que se ve y los dos botones de una cuenta de bolívares ══════════════
// El recuadro de la tarjeta de la cuenta: saldo real en Bs, lo que vale hoy y la diferencia con los libros
function mmTarjetaHtml(nombre){
  if(!mmCuentaEsBs(nombre)) return '';
  mmCargar();
  var v = mmValorCuenta(nombre), admin = (typeof isAdminUser !== 'function') || isAdminUser(), n = _mmEsc(String(nombre).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
  var h = '<div onclick="event.stopPropagation()" style="margin:0 0 10px;padding:9px 11px;border-radius:9px;background:var(--surf2);border:1px solid var(--rim);font-size:11.5px;line-height:1.5">'
    + '<div style="font-family:var(--fd);font-weight:900;font-size:16px;color:var(--ink)">' + _mmEsc(mmFmtBs(v.bs)) + '</div>'
    + '<div style="color:var(--ink3);font-size:10.5px">Saldo en bolívares' + (v.cuadrado ? ' (cuadrado con el banco)' : '') + (v.estimados ? ' · ' + v.estimados + ' movimiento' + (v.estimados === 1 ? '' : 's') + ' sin Bs guardados, estimado' + (v.estimados === 1 ? '' : 's') + ' con la tasa de su día' : '') + '</div>';
  if(v.real != null){
    h += '<div style="margin-top:5px">Hoy valen <b>' + _mmEsc(_mmFmtUsd(v.real)) + '</b> <span style="color:var(--ink3)">(a ' + _mmEsc(mmFmtTasa(v.tasa)) + ')</span> · en libros ' + _mmEsc(_mmFmtUsd(v.libro)) + '</div>';
    if(Math.abs(v.dif) >= 0.01) h += '<div style="font-weight:800;color:' + (v.dif < 0 ? 'var(--red)' : 'var(--green)') + '">' + (v.dif < 0 ? 'Pérdida' : 'Ganancia') + ' cambiaria sin registrar: ' + _mmEsc(_mmFmtUsd(Math.abs(v.dif))) + '</div>';
  } else h += '<div style="margin-top:5px;color:#BA7517">Sin tasa del día no se puede calcular cuánto valen hoy.</div>';
  if(admin) h += '<div style="display:flex;gap:5px;margin-top:7px;flex-wrap:wrap">'
    + '<button class="btn btn-g btn-xs" onclick="mmAbrirCuadrar(\'' + n + '\')" title="Poner el saldo real en bolívares que hay en el banco">Cuadrar saldo Bs</button>'
    + (v.real != null && Math.abs(v.dif) >= 0.01 ? '<button class="btn btn-g btn-xs" onclick="mmAbrirDiferencia(\'' + n + '\')" title="Dejar en los libros lo que de verdad valen hoy los bolívares">Registrar diferencia</button>' : '')
    + '</div>';
  return h + '</div>';
}
// "Cuadrar saldo Bs": el saldo real que hay en el banco. No mueve dinero: fija desde dónde se cuenta.
function mmAbrirCuadrar(nombre){
  if(typeof isAdminUser === 'function' && !isAdminUser()){ toast('Solo un administrador puede cuadrar el saldo en bolívares', 'error'); return; }
  var v = mmValorCuenta(nombre);
  setMicon('deposito'); $('mtt').textContent = 'Cuadrar saldo en bolívares'; $('msb').textContent = nombre; $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div class="fgr c1" style="gap:9px">'
    + '<div style="font-size:12px;color:var(--ink2);line-height:1.5">Escribe los bolívares que hay <b>ahora mismo</b> en esta cuenta, según el banco. Desde este momento el sistema suma y resta sobre ese saldo. No cambia ningún movimiento ni el valor en dólares de la cuenta.</div>'
    + '<div class="fg"><label>Saldo real en bolívares (Bs) *</label><input class="fi" id="mmc_bs" type="number" step="0.01" min="0" value="' + (v.bs > 0 ? v.bs : '') + '" placeholder="0,00"></div>'
    + '<div style="font-size:11px;color:var(--ink3)">El sistema calcula hoy ' + _mmEsc(mmFmtBs(v.bs)) + (v.estimados ? ' (con ' + v.estimados + ' estimados)' : '') + '.</div>'
    + '</div>';
  S.saveFn = function(){
    var bs = parseFloat(($('mmc_bs') || {}).value);
    if(!(bs >= 0)){ toast('Escribe el saldo en bolívares', 'error'); return false; }
    var ap = { saldoBs: _mmR2(bs), enMs: Date.now(), fecha: _mmHoy(), por: (S.currentUser && S.currentUser.nombre) || '' };
    if(!_mmCfg) _mmCfg = { aperturas: {} }; if(!_mmCfg.aperturas) _mmCfg.aperturas = {};
    _mmCfg.aperturas[nombre] = ap;
    if(typeof DB !== 'undefined' && DB.guardarAperturaBs) DB.guardarAperturaBs(nombre, ap);
    if(typeof logActividad === 'function') logActividad('saldo_bs_cuadrado', 'cuentas', nombre, { saldoBs: ap.saldoBs });
    closeM(); nav('cuentas'); toast('Saldo en bolívares cuadrado · ' + mmFmtBs(ap.saldoBs), 'success'); return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar saldo</button>';
  $('ov').style.display = 'flex';
}
// "Registrar diferencia": deja en los libros lo que de verdad valen hoy los bolívares de la cuenta
function mmDifCalc(){
  var st = _mm._dif; if(!st) return 0;
  var t = parseFloat(($('mmd_tasa') || {}).value) || 0, v = mmValor(st.nombre, S.movimientos || [], mmApertura(st.nombre), t), el = $('mmd_res');
  if(el) el.innerHTML = v.real == null ? 'Escribe la tasa.' : mmFmtBs(v.bs) + ' ÷ ' + mmFmtTasa(t) + ' = <b>' + _mmFmtUsd(v.real) + '</b> · en libros ' + _mmFmtUsd(v.libro) + '<br><b style="color:' + (v.dif < 0 ? 'var(--red)' : 'var(--green)') + '">' + (Math.abs(v.dif) < 0.01 ? 'Sin diferencia' : (v.dif < 0 ? 'Pérdida' : 'Ganancia') + ' cambiaria: ' + _mmFmtUsd(Math.abs(v.dif))) + '</b>';
  return v.real == null ? 0 : v.dif;
}
function mmAbrirDiferencia(nombre){
  if(typeof isAdminUser === 'function' && !isAdminUser()){ toast('Solo un administrador puede registrar la diferencia cambiaria', 'error'); return; }
  _mm._dif = { nombre: nombre };
  setMicon('retiro'); $('mtt').textContent = 'Registrar diferencia cambiaria'; $('msb').textContent = nombre; $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div class="fgr c1" style="gap:9px">'
    + '<div style="font-size:12px;color:var(--ink2);line-height:1.5">Los bolívares de esta cuenta se registraron al dólar del día en que entraron. Hoy valen otra cosa. Esto anota la diferencia como un movimiento de la cuenta, para que su valor en dólares sea el real. No mueve bolívares.</div>'
    + '<div class="fgr" style="gap:8px"><div class="fg"><label>Tasa de hoy (Bs por $) *</label><input class="fi" id="mmd_tasa" type="number" step="0.0001" min="1" value="' + (mmTasaHoy() || '') + '" oninput="mmDifCalc()"></div>'
    + '<div class="fg"><label>Fecha</label><input class="fi" id="mmd_fecha" type="date" value="' + _mmHoy() + '"></div></div>'
    + '<div id="mmd_res" style="font-size:12px;line-height:1.6;padding:9px 11px;border-radius:8px;background:var(--surf2)"></div>'
    + '</div>';
  S.saveFn = function(){
    var t = parseFloat(($('mmd_tasa') || {}).value) || 0;
    if(!(t > 1)){ toast('Escribe la tasa', 'error'); return false; }
    var dif = mmDifCalc();
    if(Math.abs(dif) < 0.01){ toast('No hay diferencia que registrar', 'info'); return false; }
    var mov = mmMovDiferencia(nombre, dif, ($('mmd_fecha') || {}).value || _mmHoy(), t, (S.currentUser && S.currentUser.nombre) || 'Admin');
    S.movimientos.push(mov); DB.saveMovimiento(mov);
    if(typeof logActividad === 'function') logActividad('diferencia_cambiaria', 'cuentas', mov.id, { cuenta: nombre, monto: dif, tasa: t });
    closeM(); nav('cuentas'); toast((dif < 0 ? 'Pérdida' : 'Ganancia') + ' cambiaria registrada · ' + _mmFmtUsd(Math.abs(dif)), 'success'); return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Registrar diferencia</button>';
  $('ov').style.display = 'flex';
  mmDifCalc();
}
// La línea de resumen arriba de las cuentas: lo registrado en el mes y lo que falta por registrar
function mmResumenHtml(mesKey){
  var bs = mmCuentasBs(); if(!bs.length) return '';
  var reg = mmDiferenciaRegistrada((typeof S !== 'undefined' && S.movimientos) || [], mesKey), pend = 0, hay = false;
  bs.forEach(function(c){ var v = mmValorCuenta(c.nombre); if(v.real != null){ pend += v.dif; hay = true; } });
  pend = _mmR2(pend);
  var txt = function(n){ return Math.abs(n) < 0.01 ? _mmFmtUsd(0) : (n < 0 ? '−' : '+') + _mmFmtUsd(Math.abs(n)); }, col = function(n){ return Math.abs(n) < 0.01 ? 'var(--ink2)' : (n < 0 ? 'var(--red)' : 'var(--green)'); };
  return '<div class="card" style="margin-bottom:14px;padding:12px 16px"><div style="display:flex;gap:22px;flex-wrap:wrap;align-items:center;font-size:12px">'
    + '<div><div class="ct" style="font-size:13px">Bolívares y diferencia cambiaria</div><div class="cs">Lo que cuesta guardar bolívares mientras sube el dólar</div></div>'
    + '<div><div style="font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Registrada este mes</div><div style="font-weight:900;font-family:var(--fd);font-size:16px;color:' + col(reg) + '">' + txt(reg) + '</div></div>'
    + (hay ? '<div><div style="font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Sin registrar, a la tasa de hoy</div><div style="font-weight:900;font-family:var(--fd);font-size:16px;color:' + col(pend) + '">' + txt(pend) + '</div></div>' : '')
    + '</div></div>';
}

if(typeof module !== 'undefined' && module.exports) module.exports = { mmFmtBs: mmFmtBs, mmFmtTasa: mmFmtTasa, mmEsBs: mmEsBs, mmAplicar: mmAplicar, mmCopiar: mmCopiar, mmDatosDe: mmDatosDe, mmTexto: mmTexto,
  mmMovBs: mmMovBs, mmSaldoBs: mmSaldoBs, mmLibro: mmLibro, mmValor: mmValor, mmDiferenciaCambio: mmDiferenciaCambio, mmMovDiferencia: mmMovDiferencia, mmEsDiferencia: mmEsDiferencia,
  mmDiferenciaRegistrada: mmDiferenciaRegistrada, _mmMovMs: _mmMovMs, _mmBsAUsd: _mmBsAUsd, _mmUsdABs: _mmUsdABs };
