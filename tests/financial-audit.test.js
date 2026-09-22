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

// Regresion: la mora vieja YA PAGADA no debe seguir contando.
// El calendario se arma "en seco" (todas las cuotas con saldo completo) y ahi
// se marcaba mora; si no se recalculaba tras aplicar los pagos, un credito al
// dia con historial de atraso reportaba mora para siempre.
test('mora NO cuenta cuotas que ya se pagaron, aunque se pagaran tarde', () => {
  // Cuotas cada 15 dias desde 2026-01-01: c1=16-ene, c2=31-ene, c3=15-feb, c4=02-mar
  // Paga c1 y c2 muy tarde (el 10 de marzo) y hoy es 11 de marzo.
  // c3 y c4 tambien estan vencidas y sin pagar -> esa mora SI cuenta.
  const est = Ledger.generarEstadoCredito(credit, [
    { id: 'PT1', cred: 'CRED-T01', fecha: '2026-03-10', monto: 100, estado: 'confirmado' }
  ], { today: '2026-03-11', diasGracia: 5 });

  assert.strictEqual(est.cuotasPagadas, 2);
  assert.strictEqual(est.cuotas[0].diasMora, 0, 'cuota 1 pagada no debe tener mora');
  assert.strictEqual(est.cuotas[0].estado, 'pagada');
  assert.strictEqual(est.cuotas[1].diasMora, 0, 'cuota 2 pagada no debe tener mora');
  // La cuota 3 (15-feb) sigue impaga: 24 dias de atraso al 11-mar
  assert.strictEqual(est.cuotas[2].diasMora, 24, 'la mora real de lo impago si cuenta');
  assert.strictEqual(est.moraDias, 24, 'moraDias = el atraso mas viejo SIN pagar');
});

// Y el caso que motivo el arreglo: todo lo vencido esta pagado -> cero mora
test('credito al dia con historial de atraso reporta CERO mora', () => {
  // Paga las 3 primeras cuotas (tarde) y hoy es 20-feb: la c4 vence el 02-mar,
  // asi que no hay nada vencido sin pagar.
  const est = Ledger.generarEstadoCredito(credit, [
    { id: 'PT2', cred: 'CRED-T01', fecha: '2026-02-19', monto: 150, estado: 'confirmado' }
  ], { today: '2026-02-20', diasGracia: 5 });

  assert.strictEqual(est.cuotasPagadas, 3);
  assert.strictEqual(est.moraDias, 0, 'al dia => cero dias de mora');
  assert.strictEqual(est.estado, 'activo', 'al dia => estado activo, no mora');
});
