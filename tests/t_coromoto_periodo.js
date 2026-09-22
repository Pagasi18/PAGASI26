// Punto 36: Coromoto agrupaba TODOS los creditos de un mes en un solo asiento fechado
// a fin de mes. Con un periodo que empieza a mitad de mes, ese asiento se iba entero a
// un lado del corte: el estado de resultados sumaba tambien lo otorgado antes de la
// fecha de inicio. La prueba usa fechas FIJAS, no "hace 15 dias", para que no dependa
// del dia en que se corra (la de t_coromoto.js fallaba sola del 11 al 15 de cada mes).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const cerca = (a, b, l) => ok(l + ' (' + Math.round(a) + ')', Math.abs(a - b) < 1);

const SRC = fs.readFileSync(path.join(ROOT, 'logic/coromoto.js'), 'utf8');
const HOY = '2026-06-30';   // fijo: el motor nunca fecha asientos en el futuro

function motor(creds, desde, hasta) {
  const G = {
    console: { log() {}, warn() {} }, Math, JSON, Object, Array, String, Number,
    parseFloat, parseInt, Date, isNaN, Promise, window: {}, db: null,
    hoyLocalISO: () => HOY,
    fechaLocalISO: d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    toast() {}, nav() {}, closeM() {}, saveM() {}, setMicon() {}, logActividad() {}, confirm: () => true,
    document: { querySelectorAll: () => [], getElementById: () => null }, $: () => null,
    _cuentasBanc: [{ nombre: 'Efectivo USD' }],
    S: null,
  };
  G.window._tasaBsGlobal = 160; G.window._tasaEuro = 175; G.globalThis = G;
  G.S = {
    currentUser: { rol: 'Administrador', nombre: 'Adam' }, page: 'reportes', reportesTab: 'coromoto',
    coromotoCfg: { mapCuentas: {}, mapCategorias: {}, ajustes: [] },
    creds: creds, pagos: [], egresos: [], movimientos: [], motos: [], clientes: [], concesionarios: [],
    coroDesde: desde || '', coroHasta: hasta || '',
  };
  vm.createContext(G);
  vm.runInContext(SRC, G, { filename: 'coromoto.js' });
  return G._coroCtx();
}

// Tres créditos del MISMO mes, a un lado y otro de un corte el día 15.
// Cada uno deja 500 de carga financiera (total 1500, financiado 1000).
const creds = [
  { id: 'CRED-1', cli: 'Ana',  fecha: '2026-06-05', estado: 'activo', total: 1500, fin: 1000, eliminado: false },
  { id: 'CRED-2', cli: 'Beto', fecha: '2026-06-20', estado: 'activo', total: 1500, fin: 1000, eliminado: false },
  { id: 'CRED-3', cli: 'Caro', fecha: '2026-06-25', estado: 'activo', total: 1500, fin: 1000, eliminado: false },
];

// ── Periodo que empieza a mitad de mes ────────────────────────────────────────
let c = motor(creds, '2026-06-15', '2026-06-30');
cerca(c.er.ing, 1000, '36. del 15 al 30 el ER solo cuenta los dos créditos de esa quincena');
cerca(c.esf.resultAntes, 500, '36. ...y el de la primera quincena queda en resultados acumulados previos');
cerca(c.esf.cuadre, 0, '36. el balance sigue cuadrando con el período partido');

// ── El otro lado del mismo corte ──────────────────────────────────────────────
c = motor(creds, '2026-06-01', '2026-06-14');
cerca(c.er.ing, 500, '36. del 1 al 14 solo cuenta el crédito de la primera quincena');
cerca(c.esf.cuadre, 0, '36. ...y también cuadra');

// ── Cerrar a mitad de mes: las CxC no pierden el mes entero ───────────────────
c = motor(creds, '', '2026-06-21');
cerca(c.er.ing, 1000, '36. cerrando el 21, entran los créditos hasta esa fecha');
cerca(c.esf.cuadre, 0, '36. ...y cuadra');

// ── Un mes completo NO cambia: sigue siendo un solo asiento ───────────────────
const mesEntero = motor(creds, '2026-06-01', '2026-06-30');
cerca(mesEntero.er.ing, 1500, '36. el mes completo cuenta los tres créditos, como siempre');
const sinPeriodo = motor(creds, '', '');
cerca(sinPeriodo.er.ing, 1500, '36. sin período, igual');
const asientosCred = sinPeriodo.lineas.filter(l => String(l.doc || '').indexOf('CRED/') === 0);
ok('36. sin corte sigue habiendo UN asiento por mes, no uno por crédito',
  new Set(asientosCred.map(l => l.f)).size === 1);

// ── Créditos de meses distintos: cada uno en su mes ───────────────────────────
c = motor([
  { id: 'CRED-A', cli: 'A', fecha: '2026-05-10', estado: 'activo', total: 1500, fin: 1000, eliminado: false },
  { id: 'CRED-B', cli: 'B', fecha: '2026-06-10', estado: 'activo', total: 1500, fin: 1000, eliminado: false },
], '2026-06-01', '2026-06-30');
cerca(c.er.ing, 500, '36. un crédito de mayo no se cuela en el período de junio');
cerca(c.esf.resultAntes, 500, '36. ...queda en lo acumulado previo');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
