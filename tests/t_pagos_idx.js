// Indice de pagos confirmados por credito (assets/pagasi-app.js). La version
// vieja recorria S.pagos completo por cada credito; la nueva lo recorre una vez
// por redibujo. Aqui se comprueba que da EXACTAMENTE lo mismo que la vieja con
// datos al azar, y que cualquier cambio local se ve en el redibujo siguiente.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const app = fs.readFileSync(path.join(ROOT, 'assets/pagasi-app.js'), 'utf8');
const ini = app.indexOf('// ── Indice de pagos confirmados por credito');
const fin = app.indexOf('// ── fin indice de pagos');
ok('el bloque del indice esta marcado', ini > 0 && fin > ini);
const BLOQUE = app.slice(ini, fin);

// La implementacion VIEJA, tal cual estaba, como referencia
function viejaPagosConfirmados(S, c) {
  if (!c) return 0;
  var pagosDelCred = (S && Array.isArray(S.pagos))
    ? S.pagos.filter(function (p) {
      return p && !p.eliminado && p.estado === 'confirmado' && p.cred === c.id && !p.esInicial && p.tipoOperacion !== 'inicial_credito';
    })
    : [];
  if (pagosDelCred.length) return pagosDelCred.reduce(function (a, p) { return a + (parseFloat(p.monto) || 0); }, 0);
  if (Array.isArray(c.pagosRegistrados) && c.pagosRegistrados.length) return c.pagosRegistrados.reduce(function (a, h) { return a + (parseFloat(h.montoPagado) || 0); }, 0);
  return (parseInt(c.pagado, 10) || 0) * ((parseFloat((c && (c.cuotaQ || c.cuota)) || 0)) || 0);
}

function montar(S) {
  const timers = [];
  const f = new Function('S', 'setTimeout', 'getCreditoCuotaBase',
    BLOQUE + '\nreturn { nueva: getCreditoPagosConfirmados, invalidar: _pagosIdxInvalidar };');
  const api = f(S, fn => { timers.push(fn); return timers.length; }, c => (parseFloat((c && (c.cuotaQ || c.cuota)) || 0)) || 0);
  return { api, siguienteTick: () => { timers.splice(0).forEach(fn => fn()); } };
}

// ── Datos al azar, reproducibles ──
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rnd() * a.length)];
const ids = []; for (let i = 1; i <= 300; i++) ids.push('CRED-' + String(i).padStart(3, '0'));
ids.push(12, '12', 'CRED-999');   // ids raros: numero, texto igual, sin pagos
const pagos = [];
for (let i = 0; i < 3000; i++) {
  pagos.push({
    id: 'P' + i, cred: pick(ids), monto: pick([50, 45.5, '60', 33.33, 0, 'x', undefined, 120.1]),
    estado: pick(['confirmado', 'confirmado', 'confirmado', 'pendiente', 'anulado', undefined]),
    eliminado: rnd() < 0.1, esInicial: rnd() < 0.05,
    tipoOperacion: rnd() < 0.05 ? 'inicial_credito' : pick(['pago', 'liquidacion', undefined]),
  });
}
pagos.push(null);   // un hueco raro en el array
const creds = ids.map(id => ({ id, cuotaQ: pick([50, 45.5, 0]), pagado: pick([0, 1, 3]), pagosRegistrados: rnd() < 0.3 ? [{ montoPagado: 10 }, { montoPagado: '5.5' }] : [] }));

{
  const S = { pagos: pagos.slice() };
  const m = montar(S);
  let iguales = 0;
  creds.forEach(c => { if (Object.is(m.api.nueva(c), viejaPagosConfirmados(S, c))) iguales++; });
  ok('300+ creditos con 3.000 pagos al azar: identico a la version vieja en todos (' + iguales + '/' + creds.length + ')', iguales === creds.length);
  ok('credito sin pagos usa los mismos respaldos que antes', Object.is(m.api.nueva(creds[creds.length - 1]), viejaPagosConfirmados(S, creds[creds.length - 1])));
  ok('cred "12" (texto) no se mezcla con id 12 (numero), como antes',
    Object.is(m.api.nueva({ id: 12 }), viejaPagosConfirmados(S, { id: 12 })) && Object.is(m.api.nueva({ id: '12' }), viejaPagosConfirmados(S, { id: '12' })));
  ok('sin credito -> 0', m.api.nueva(null) === 0);
  ok('sin S.pagos -> respaldo', montar({}).api.nueva({ id: 'X', pagado: 2, cuotaQ: 50 }) === 100);
}

// ── Cambios locales: se ven en el redibujo que sigue ──
{
  const S = { pagos: [{ id: 'a', cred: 'C1', monto: 50, estado: 'confirmado' }] };
  const m = montar(S); const C1 = { id: 'C1' };
  ok('base: 50', m.api.nueva(C1) === 50);
  S.pagos.push({ id: 'b', cred: 'C1', monto: 25, estado: 'confirmado' });
  ok('registrar un pago (push) se ve al instante: 75', m.api.nueva(C1) === 75);
  S.pagos[0].estado = 'anulado';
  m.api.invalidar();   // lo que hace toda escritura (_dbSilent), nav() y closeM()
  ok('anular un pago + guardar: se ve al instante: 25', m.api.nueva(C1) === 25);
  S.pagos[1].monto = 30;
  m.siguienteTick();   // sin guardar, al tick siguiente igual se rearma
  ok('cambio suelto: al tick siguiente se ve: 30', m.api.nueva(C1) === 30);
  S.pagos = [{ id: 'c', cred: 'C1', monto: 5, estado: 'confirmado' }];
  ok('S.pagos reemplazado (tiempo real): se ve al instante: 5', m.api.nueva(C1) === 5);
}

// ── Que si haga el trabajo una sola vez ──
{
  let lecturas = 0;
  const arr = []; for (let i = 0; i < 2000; i++) arr.push({ id: 'p' + i, cred: 'C' + (i % 100), estado: 'confirmado', get monto() { lecturas++; return 1; } });
  const S = { pagos: arr }; const m = montar(S);
  for (let i = 0; i < 100; i++) m.api.nueva({ id: 'C' + i });
  ok('100 creditos: los 2.000 pagos se leen una vez, no 100 (' + lecturas + ')', lecturas === 2000);
}

ok('_dbSilent, nav y closeM rearman el indice',
  /function _dbSilent\(fn\)\{[\s\S]{0,200}_pagosIdxInvalidar\(\)/.test(app) &&
  /function closeM\(\)\{[\s\S]{0,160}if\(typeof _pagosIdxInvalidar==='function'\) _pagosIdxInvalidar\(\);/.test(app) &&
  /_pagosIdxInvalidar\(\);[^\n]*\n\s*S\.page=p;/.test(app));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
