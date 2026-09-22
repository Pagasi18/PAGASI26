// Puntos 27, 29, 30, 34 y 38 de la lista del 18-sep.
// 27: el dashboard apartaba la inicial del cliente buscando UN gasto cuyo monto
//     coincidiera; si la inicial se pago en dos partes, no apartaba nada y esos dolares
//     se contaban como plata prestada por Pagasi.
// 29: el VIN no se revisaba al escribirlo, y el del asistente PISABA el de la moto.
// 30: el numero de un gasto salia del maximo en memoria: dos personas guardando a la
//     vez sacaban el mismo y la segunda borraba el gasto de la primera.
// 34: poner 0 dias de gracia no funcionaba (0||5 vale 5 en JavaScript).
// 38: el aviso de "contrato firmado" prometia algo que el sistema no hace.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── 27. Apartar la inicial aunque se haya pagado en varias partes ─────────────
function idsInicial(egresos, creds) {
  const G = { console:{log(){},warn(){}}, Math, JSON, Object, Array, String, Number, parseFloat, parseInt, Date, isNaN,
    S: { egresos: egresos, creds: creds, pagos: [], movimientos: [], motos: [] }, window: {} };
  G.window = G; vm.createContext(G);
  const s = src('logic/charts.js');
  vm.runInContext(s.slice(s.indexOf('function _egrIdsInicial()'), s.indexOf('// ── Estilo comun')), G);
  return G._egrIdsInicial();
}
const cred = { id:'CRED-1', motoId:5, ini:500, estado:'activo' };
const eg = (id, monto) => ({ id:id, motoIdRef:5, origenAuto:'compra_moto', monto:monto, fecha:'2026-06-01' });

let ids = idsInicial([eg(1,500), eg(2,1000)], [cred]);
ok('27. una sola fila que cuadra: se aparta esa (como antes)', ids['1'] === true && !ids['2']);
ids = idsInicial([eg(1,300), eg(2,200), eg(3,1000)], [cred]);
ok('27. la inicial pagada en DOS partes ahora también se aparta', ids['1'] === true && ids['2'] === true);
ok('27. ...y lo que prestó Pagasi no se aparta', !ids['3']);
ids = idsInicial([eg(1,100), eg(2,150), eg(3,250), eg(4,1000)], [cred]);
ok('27. tres partes que suman la inicial', ids['1'] && ids['2'] && ids['3'] && !ids['4']);
ids = idsInicial([eg(1,400), eg(2,1000)], [cred]);
ok('27. si ninguna combinación suma la inicial, no se inventa nada', Object.keys(ids).length === 0);
ids = idsInicial([eg(1,500), eg(2,300), eg(3,200)], [cred]);
ok('27. ante dos combinaciones posibles gana la de menos filas', ids['1'] === true && !ids['2'] && !ids['3']);
const muchos = []; for (let i = 1; i <= 9; i++) muchos.push(eg(i, 60));
ok('27. con demasiadas filas ni lo intenta (no se cuelga)', Object.keys(idsInicial(muchos, [cred])).length === 0);
ok('27. un crédito cancelado no aparta nada',
  Object.keys(idsInicial([eg(1,500)], [{ id:'CRED-1', motoId:5, ini:500, estado:'cancelado' }])).length === 0);

// ── 29. El VIN se revisa y no pisa el de la moto ──────────────────────────────
const G2 = { console:{log(){},warn(){}}, Math, String, S:{ motos:[] }, window:{} }; G2.window = G2;
vm.createContext(G2);
const appSrc = src('assets/pagasi-app.js');
vm.runInContext(appSrc.slice(appSrc.indexOf('function vinAvisos('), appSrc.indexOf('function nextEgresoIdsAsync(')), G2);
const v = G2.vinAvisos;
ok('29. un VIN de 17 caracteres válidos no molesta', v('1HGBH41JXMN109186').length === 0);
ok('29. avisa si tiene otro largo', v('ABC123').some(a => /17/.test(a)));
ok('29. avisa de la I, la O y la Q, que el VIN no lleva', v('1HGBH41JXMN1O9186').some(a => /I, O ni Q/.test(a)));
ok('29. avisa si lleva guiones o espacios', v('1HGB-41JXMN109186').some(a => /letras y números/.test(a)));
ok('29. avisa si no coincide con el de la moto elegida',
  v('1HGBH41JXMN109186', '1HGBH41JXMN109999').some(a => /no coincide/.test(a)));
ok('29. si coincide, no molesta', v('1hgbh41jxmn109186', '1HGBH41JXMN109186').length === 0);
ok('29. sin VIN escrito, ningún aviso', v('').length === 0 && v(null).length === 0);
ok('29. el asistente ya no pisa el VIN de la moto del inventario',
  /WZ\.vin && \(typeof _datoReal==='function' \? !_datoReal\(S\.motos\[mi\]\.vin\) : !S\.motos\[mi\]\.vin\)/.test(src('logic/creditos.js')));

// ── 30. Los gastos toman su número del contador, no de la memoria ─────────────
ok('30. existe el reservador de números de gasto', /function nextEgresoIdsAsync\(cuantos\)/.test(appSrc));
ok('30. reserva N seguidos de una sola vez', /reservarNumero\('egresos', Math\.max\(max, localBase\(\)\) \+ \(n-1\)\)/.test(appSrc));
['logic/egresos.js', 'logic/comisiones.js'].forEach(function (f) {
  ok('30. ' + f + ' ya no calcula el número en memoria', !/Math\.max\.apply\(null,\s*S\.egresos\.map/.test(src(f)));
  ok('30. ' + f + ' usa el contador', /nextEgresoId/.test(src(f)));
});
ok('30. la compra de una moto recibe los números ya reservados', /opts\.ids\[idx\]/.test(src('logic/moto-pagos.js')));
ok('30. ...y quien la crea los pide antes', /nextEgresoIdsAsync\(_nGastos\)/.test(src('logic/motos.js'))
  && /nextEgresoIdsAsync\(_mPagos\.length\)/.test(src('logic/creditos.js')));

// ── 34. Cero días de gracia es un valor válido ────────────────────────────────
['logic/pagos.js', 'logic/configuracion.js', 'modules/config.js', 'logic/financiero.js', 'logic/motos.js'].forEach(function (f) {
  ok('34. ' + f + ' ya no convierte el 0 en 5', !/diasGracia\|\|5/.test(src(f)));
});
ok('34. el campo de la pantalla muestra el 0 que se guardó',
  /value="\$\{\(PLAN\.diasGracia!=null\?PLAN\.diasGracia:5\)\}"/.test(src('modules/config.js')));
// la propia trampa, en cristiano
const gracia = p => (p.diasGracia != null ? p.diasGracia : 5);
ok('34. con 0 configurado, la mora empieza el primer día', gracia({ diasGracia: 0 }) === 0);
ok('34. sin configurar, siguen siendo 5', gracia({}) === 5);

// ── 38. El aviso de contrato firmado dice la verdad ───────────────────────────
const credSrc = src('logic/creditos.js');
ok('38. ya no promete que el crédito empieza a contar desde la firma',
  !/A partir de este momento el crédito contará contablemente/.test(credSrc));
ok('38. dice que queda registrada la fecha de firma', /Queda registrada la fecha de firma/.test(credSrc));
ok('38. y que el crédito ya venía contando desde su fecha', /ya venía contando/.test(credSrc));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
