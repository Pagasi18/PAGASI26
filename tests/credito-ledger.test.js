const assert = require('assert');
const Ledger = require('../logic/credito-ledger.js');

function nearly(actual, expected, tolerance = 0.01, label = '') {
  assert(Math.abs(actual - expected) <= tolerance, `${label || 'value'} expected ${expected}, got ${actual}`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`OK ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const credit = {
  id: 'CRED-T01',
  cli: 'Cliente Prueba',
  fecha: '2026-01-01',
  creado: '2026-01-01T10:00:00.000Z',
  cuotaQ: 50,
  plazo: 2,
  totalCuotas: 4,
  ini: 100,
  total: 200,
  estado: 'activo'
};

test('calendario crea cuotas quincenales', () => {
  const cuotas = Ledger.crearCalendarioCuotas(credit, { today: '2026-01-01', diasGracia: 5 });
  assert.strictEqual(cuotas.length, 4);
  assert.strictEqual(cuotas[0].fechaVence, '2026-01-16');
  assert.strictEqual(cuotas[1].fechaVence, '2026-01-31');
  nearly(cuotas[0].monto, 50, 0.001, 'monto cuota');
});

test('estado aplica pagos parciales y completos en orden', () => {
  const estado = Ledger.generarEstadoCredito(credit, [
    { id: 'P1', cred: 'CRED-T01', fecha: '2026-01-05', monto: 25, estado: 'confirmado' },
    { id: 'P2', cred: 'CRED-T01', fecha: '2026-01-06', monto: 75, estado: 'confirmado' }
  ], { today: '2026-01-07', diasGracia: 5 });

  assert.strictEqual(estado.cuotasPagadas, 2);
  nearly(estado.saldoPendiente, 100, 0.001, 'saldo pendiente');
  nearly(estado.saldoProxCuota, 50, 0.001, 'saldo proxima cuota');
  assert.strictEqual(estado.cuotas[0].estado, 'pagada');
  assert.strictEqual(estado.cuotas[1].estado, 'pagada');
});

test('estado detecta mora por cuota vencida', () => {
  const estado = Ledger.generarEstadoCredito(credit, [], { today: '2026-01-25', diasGracia: 5 });
  assert.strictEqual(estado.estado, 'mora');
  assert.strictEqual(estado.moraDias, 9);
  assert.strictEqual(estado.cuotas[0].estado, 'mora');
});

test('descuento de liquidacion completa saldo junto con pago final', () => {
  const estado = Ledger.generarEstadoCredito(Object.assign({}, credit, {
    descuentoLiquidacion: 50,
    fechaCompletado: '2026-01-10'
  }), [
    { id: 'P-LIQ', cred: 'CRED-T01', fecha: '2026-01-10', monto: 150, estado: 'confirmado', tipo: 'liquidacion' }
  ], { today: '2026-01-10', diasGracia: 5 });

  assert.strictEqual(estado.estado, 'completado');
  assert.strictEqual(estado.cuotasPagadas, 4);
  nearly(estado.saldoPendiente, 0, 0.001, 'saldo pendiente');
});

test('ledger ordena eventos principales', () => {
  const ledger = Ledger.generarLedgerCredito(Object.assign({}, credit, {
    descuentoLiquidacion: 10,
    fechaCompletado: '2026-01-20'
  }), [
    { id: 'P1', cred: 'CRED-T01', fecha: '2026-01-05', monto: 50, estado: 'confirmado' }
  ], [
    { id: 'MOV-1', fecha: '2026-01-05', concepto: 'Pago cuota Cliente Prueba CRED-T01', monto: 50, cuentaDestino: 'Caja' }
  ]);

  const tipos = ledger.map((e) => e.tipo);
  assert(tipos.includes('originacion_credito'));
  assert(tipos.includes('inicial_credito'));
  assert(tipos.includes('pago_cuota'));
  assert(tipos.includes('descuento_liquidacion'));
  assert(tipos.includes('movimiento_cuenta'));
});

console.log('\nCredito ledger tests passed.');
