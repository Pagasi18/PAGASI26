// Puntos 31, 32, 33 y 35 de la lista del 18-sep.
// 31: el saldo de una cuenta se rompia si algun monto estaba guardado como texto.
// 32: la pantalla de GPS pintaba sin limpiar lo que llega del Excel y de MiCODUS.
// 33: los reportes de Telegram a pedido salian sin el telefono del cliente.
// 35: la mora salia un dia corta desde un pais con cambio de hora.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

// ── 31. Saldos con montos guardados como texto ────────────────────────────────
function saldoCon(movs) {
  const ctx = { console: { log() {}, warn() {} }, Math, parseFloat, isNaN, String, Number, Array, Object, JSON, Date,
    S: { movimientos: movs }, window: {} };
  ctx.window = ctx; vm.createContext(ctx);
  const src = fs.readFileSync(path.join(ROOT, 'logic', 'cuentas.js'), 'utf8');
  vm.runInContext(src.slice(0, src.indexOf('function totalCuentas')), ctx);
  return ctx.saldoCuenta('Binance');
}
ok('31. un monto guardado como texto ya no concatena', saldoCon([
  { tipo: 'deposito', cuentaDestino: 'Binance', monto: '100' },
  { tipo: 'deposito', cuentaDestino: 'Binance', monto: 50 },
  { tipo: 'retiro', cuentaOrigen: 'Binance', monto: 30 },
]) === 120);
ok('31. un monto que no es número se cuenta como cero, no rompe el saldo', saldoCon([
  { tipo: 'deposito', cuentaDestino: 'Binance', monto: 100 },
  { tipo: 'deposito', cuentaDestino: 'Binance', monto: 'pendiente' },
]) === 100);
ok('31. los anulados siguen sin contar', saldoCon([
  { tipo: 'deposito', cuentaDestino: 'Binance', monto: '100' },
  { tipo: 'deposito', cuentaDestino: 'Binance', monto: '999', eliminado: true },
]) === 100);
ok('31. los centavos no se arrastran', saldoCon([
  { tipo: 'deposito', cuentaDestino: 'Binance', monto: 0.1 },
  { tipo: 'deposito', cuentaDestino: 'Binance', monto: 0.2 },
]) === 0.3);

// ── 32. La pantalla de GPS escapa lo que llega de afuera ──────────────────────
const gps = fs.readFileSync(path.join(ROOT, 'logic', 'gps.js'), 'utf8');
ok('32. existe el ayudante que escapa', /function _gpsE\(v\)/.test(gps));
const ctxG = { console: { log() {}, warn() {} }, String, window: {} }; ctxG.window = ctxG;
vm.createContext(ctxG);
vm.runInContext(gps.slice(gps.indexOf('function _gpsE(v)'), gps.indexOf('function _gpsCoincide')), ctxG);
ok('32. una celda del Excel con una etiqueta sale como texto, no como HTML',
  ctxG._gpsE('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;');
ok('32. escapa también comillas y el &', ctxG._gpsE('a"b\'c&d') === 'a&quot;b&#39;c&amp;d');
ok('32. lo vacío no se convierte en "null" ni "undefined"', ctxG._gpsE(null) === '' && ctxG._gpsE(undefined) === '');
['g.idGps || \'—\'', 'g.imei || \'—\'', 'g.linea || \'—\'', 'g.iccid || \'—\''].forEach(function (campo) {
  ok('32. la tabla de equipos escapa ' + campo.split(' ')[0], gps.indexOf('_gpsE(' + campo + ')') > -1);
});
ok('32. el estado que manda MiCODUS también se escapa', gps.indexOf('_gpsE(g.estadoMicodus)') > -1);
ok('32. y el técnico que se pega del Excel', /_gpsE\(g\.tecnico/.test(gps));
ok('32. no quedó ninguna salida de esas sin escapar',
  gps.indexOf("+ (g.imei || '—') +") === -1 && gps.indexOf("+ (g.iccid || '—') +") === -1
  && gps.indexOf('+ g.estadoMicodus + ') === -1);

// ── 33. El reporte de Telegram encuentra al cliente por nombre si hace falta ──
const rep = fs.readFileSync(path.join(ROOT, 'bot', 'reporte.js'), 'utf8');
ok('33. el reporte arma también el índice por nombre', /cliPorNombre/.test(rep));
ok('33. ...y lo usa cuando el crédito no trae clienteId',
  /cliById\[String\(cred\.clienteId\)\]\)\s*\|\|\s*cliPorNombre\[cred\.cli\]/.test(rep));
ok('33. ...saltando clientes eliminados y quedándose con el primer homónimo',
  /!c\.eliminado && !\(c\.nombre in cliPorNombre\)/.test(rep));
// el mismo caso, resuelto a mano con la lógica del archivo
const clientes = [{ id: 'CLI-1', nombre: 'JUAN PEREZ', tel: '04141112233' }];
const cliById = {}, cliPorNombre = {};
clientes.forEach(c => { cliById[String(c.id)] = c; if (c && c.nombre && !c.eliminado && !(c.nombre in cliPorNombre)) cliPorNombre[c.nombre] = c; });
const telDe = cred => { const cl = (cred.clienteId != null && cliById[String(cred.clienteId)]) || cliPorNombre[cred.cli] || {}; return cl.tel || cl.telefono || cl.wa || cred.tel || ''; };
ok('33. un crédito sin clienteId igual saca el teléfono por el nombre', telDe({ cli: 'JUAN PEREZ' }) === '04141112233');
ok('33. un crédito con un clienteId que ya no existe, también', telDe({ clienteId: 'CLI-BORRADO', cli: 'JUAN PEREZ' }) === '04141112233');
ok('33. y si no hay forma, queda vacío y no revienta', telDe({ cli: 'NO EXISTE' }) === '');

// ── 35. La mora no depende del huso horario ───────────────────────────────────
const ledger = fs.readFileSync(path.join(ROOT, 'logic', 'credito-ledger.js'), 'utf8');
ok('35. el motor de cuotas ya no corta hacia abajo',
  /Math\.round\(\(today\.getTime\(\) - vence\.getTime\(\)\) \/ DAY_MS\)/.test(ledger)
  && /Math\.round\(\(hoyRef\.getTime\(\) - venceRef\.getTime\(\)\) \/ DAY_MS\)/.test(ledger));
const pagosSrc = fs.readFileSync(path.join(ROOT, 'logic', 'pagos.js'), 'utf8');
ok('35. y el número de días que se GUARDA tampoco', /var diasAtraso=Math\.round\(\(hoy-fechaVence\)/.test(pagosSrc));
ok('35. ninguno de los dos quedó con floor',
  !/Math\.floor\(\(today\.getTime\(\)/.test(ledger) && !/Math\.floor\(\(hoyRef\.getTime\(\)/.test(ledger)
  && !/Math\.floor\(\(hoy-fechaVence\)/.test(pagosSrc));
// un vencimiento que cruza el cambio de hora de Estados Unidos
const venc = new Date(2026, 1, 15, 12, 0, 0), hoy = new Date(2026, 2, 20, 12, 0, 0);
ok('35. round da el mismo número de días aunque la resta pierda una hora',
  Math.round((hoy - venc) / 86400000) === 33);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
