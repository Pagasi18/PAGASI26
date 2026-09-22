// El robot que mide los 13 puntos de "Datos a revisar en la base" (lista del 18-sep).
// Se prueba con datos inventados que disparan cada caso, para que el dia que alguien
// toque el robot no empiece a contar mal y mande a la oficina a buscar fantasmas.
const { revisar } = require('../bot/revisar-datos-13.js');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const cuantos = (r, k) => Array.isArray(r[k]) ? r[k].length : r[k];

const base = {
  creditos: [
    // vivo, con moto que se llama distinto, sin pago inicial y con el serial en "NA"
    { id: 'CRED-1', estado: 'activo', motoId: 1, modelo: 'EK XPRESS 150', ini: 300, serialChasis: 'NA' },
    // vivo pero con una nota de recuperacion: el punto 5 lo revivio
    { id: 'CRED-2', estado: 'mora', motoId: 1, modelo: 'EK XPRESS 150', ini: 0, serialChasis: 'ABC123', notas: 'se fue a recuperar' },
    // rechazado, y su moto sigue con el gasto de compra vivo
    { id: 'CRED-3', estado: 'cancelado', motoId: 2 },
    // vivo y apuntando a una moto que no existe
    { id: 'CRED-4', estado: 'activo', motoId: 99, ini: 0, serialChasis: 'X1' },
  ],
  motos: [
    { id: 1, modelo: 'NEW HORSE 150', estado: 'financiada', vin: 'VIN1' },
    { id: 2, modelo: 'M2', estado: 'recuperada', vin: 'VIN1' },
  ],
  egresos: [{ id: 9, motoIdRef: 2, origenAuto: 'compra_moto', eliminado: false }],
  movimientos: [
    { tipo: 'retiro', eliminado: true, tipoOperacion: 'compra_moto', motoIdRef: 1, monto: 1000, cuentaOrigen: 'Binance' },
    { tipo: 'deposito', eliminado: false, reversoDe: 'compra_moto:1', monto: 1000, cuentaDestino: 'Binance' },
  ],
  clientes: [{ id: 'CLI-1', cedula: 'V-12345678' }, { id: 'CLI-2', cedula: '12345678' }],
  pagos: [],
  empresa: { nombre: 'PAGASI 18' },
};

const r = revisar(base);

ok('1. ve el retiro anulado Y su reverso: el dinero volvio dos veces', cuantos(r, 'dineroDoble') === 1);
ok('2. ve el credito vivo con nota de recuperacion', cuantos(r, 'recuperadosRevividos') === 1 && r.recuperadosRevividos[0] === 'CRED-2');
ok('2. ve el credito con inicial en el plan y sin pago inicial', cuantos(r, 'aprobadasSinInicial') === 1 && r.aprobadasSinInicial[0] === 'CRED-1');
ok('3. ve la moto en "recuperada"', cuantos(r, 'motosRecuperadas') === 1);
ok('3. la moto "financiada" CON credito vivo no se reporta', cuantos(r, 'financiadasSinCreditoVivo') === 0);
ok('4. ve los dos creditos cuyo modelo no es el de su moto', cuantos(r, 'modeloDistinto') === 2);
ok('4. ...y dice que dice cada uno', r.modeloDistinto[0].credito === 'EK XPRESS 150' && r.modeloDistinto[0].moto === 'NEW HORSE 150');
ok('5. ve que faltan los cinco datos registrales', cuantos(r, 'empresaFalta') === 5);
ok('6. mide las cuentas sin decir el saldo (el log es publico)',
  r.cuentasConSaldo.length === 1 && typeof r.cuentasConSaldo[0].enCero === 'boolean' && !('saldo' in r.cuentasConSaldo[0]));
ok('7. ve la solicitud rechazada con el gasto de la moto vivo', cuantos(r, 'rechazadasConGasto') === 1 && r.rechazadasConGasto[0].id === 'CRED-3');
ok('8. ve el credito vivo que apunta a una moto que no existe', cuantos(r, 'vivosSinMoto') === 1 && r.vivosSinMoto[0] === 'CRED-4');
ok('9. ve los dos creditos vivos colgados de la misma moto', cuantos(r, 'motosCompartidas') === 1 && r.motosCompartidas[0].creditos.length === 2);
ok('10. ve el VIN repetido entre dos motos', cuantos(r, 'vinRepetido') === 1);
ok('11. cuenta "NA" como serial vacio, pero no "X1"', cuantos(r, 'serialNA') === 1 && r.serialNA[0] === 'CRED-1');
ok('12. ve los dos clientes con la misma cedula aunque uno lleve la V', cuantos(r, 'clientesRepetidos') === 1);
ok('13. ve la moto sin su gasto de compra', cuantos(r, 'motosSinGasto') === 1 && r.motosSinGasto[0] === 1);

// Base limpia: no puede inventar hallazgos
const limpio = revisar({ creditos: [], motos: [], egresos: [], movimientos: [], clientes: [], pagos: [],
  empresa: { nombre: 'X', rm: 'Séptimo', rmEstado: 'Distrito Capital', rmNum: '8', rmTomo: '58-A', rmFecha: '14/07/2026' } });
ok('con la base limpia no inventa nada',
  ['dineroDoble','recuperadosRevividos','aprobadasSinInicial','motosRecuperadas','financiadasSinCreditoVivo',
   'modeloDistinto','empresaFalta','rechazadasConGasto','vivosSinMoto','motosCompartidas','vinRepetido',
   'serialNA','clientesRepetidos','motosSinGasto'].every(k => cuantos(limpio, k) === 0));

// Un credito completado o cancelado NO es un credito vivo
const cerrados = revisar(Object.assign({}, base, {
  creditos: [{ id: 'CRED-9', estado: 'completado', motoId: 99, ini: 500, serialChasis: 'NA' }],
  motos: [], egresos: [], movimientos: [], clientes: [], pagos: [],
}));
ok('un credito ya pagado no se cuenta como vivo sin moto', cuantos(cerrados, 'vivosSinMoto') === 0);
ok('...ni como credito sin pago inicial', cuantos(cerrados, 'aprobadasSinInicial') === 0);
ok('...ni por su serial', cuantos(cerrados, 'serialNA') === 0);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
