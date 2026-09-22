const assert = require('assert');
const Ledger = require('../logic/credito-ledger.js');
const G = require('../logic/gamificacion.js');

function test(name, fn) {
  try { fn(); console.log(`OK ${name}`); }
  catch (err) { console.error(`FAIL ${name}`); throw err; }
}

// Credito de referencia: cuotas quincenales de $50 desde 2026-01-01
// c1=16-ene  c2=31-ene  c3=15-feb  c4=02-mar  c5=17-mar ...
const cred = { id: 'C', fecha: '2026-01-01', cuotaQ: 50, plazo: 6, totalCuotas: 12 };
const P = (f, m) => ({ id: 'p' + f + m, cred: 'C', fecha: f, monto: m, estado: 'confirmado' });
const cal = Ledger.crearCalendarioCuotas(cred, { today: '2027-06-01', diasGracia: 5 });
const est = (pagos, hoy) => Ledger.generarEstadoCredito(cred, pagos, { today: hoy, diasGracia: 5 });
const racha = (pagos, hoy) => G.calcularRacha(est(pagos, hoy), pagos, 5, hoy);

test('pago antes del vencimiento cuenta como adelantado', () => {
  const r = racha([P('2026-01-10', 50)], '2026-01-25');
  assert.strictEqual(r.evs[0].adelantada, true);
  assert.strictEqual(r.evs[0].puntual, true);
  assert.strictEqual(r.puntos, 15, 'adelantado vale 15 puntos');
});

test('pago dentro de los dias de gracia cuenta como puntual', () => {
  const r = racha([P('2026-01-19', 50)], '2026-01-25');   // vence 16, gracia 5 -> limite 21
  assert.strictEqual(r.evs[0].adelantada, false);
  assert.strictEqual(r.evs[0].puntual, true);
  assert.strictEqual(r.puntos, 10, 'puntual vale 10 puntos');
});

test('pago pasada la gracia cuenta como tarde y no da puntos', () => {
  const r = racha([P('2026-01-30', 50)], '2026-02-10');
  assert.strictEqual(r.evs[0].puntual, false);
  assert.strictEqual(r.puntos, 0);
  assert.strictEqual(r.racha, 0);
});

// El caso que define el diseno: los pagos se aplican a la cuota mas vieja, asi
// que medir cuota por cuota dejaria la racha muerta para siempre tras un atraso.
test('si se atrasa y se pone al dia, la racha revive', () => {
  const pagos = [P('2026-01-30', 50), P('2026-01-31', 50), P('2026-02-15', 50), P('2026-03-02', 50)];
  const r = racha(pagos, '2026-03-10');
  assert.strictEqual(r.evs[0].puntual, false, 'c1 quedo tarde');
  assert.strictEqual(r.racha, 3, 'los 3 cortes siguientes al dia -> racha 3');
  assert.strictEqual(r.puntuales, 3);
});

test('varios abonos que completan a tiempo cuentan como puntual', () => {
  const pagos = [P('2026-01-10', 25), P('2026-01-14', 25)];
  const r = racha(pagos, '2026-01-25');
  assert.strictEqual(r.evs[0].puntual, true);
});

test('abonar de menos NO cuenta como puntual', () => {
  const r = racha([P('2026-01-10', 30)], '2026-01-25');
  assert.strictEqual(r.evs[0].puntual, false, 'pago 30 de una cuota de 50');
});

test('los cortes que aun no vencen no se evaluan', () => {
  const r = racha([], '2026-01-05');   // el primer corte es el 21-ene
  assert.strictEqual(r.cortes, 0);
  assert.strictEqual(r.racha, 0);
  assert.strictEqual(r.nivel.id, 'bronce');
});

function conPuntuales(n) {
  const pagos = [];
  for (let k = 0; k < n; k++) pagos.push(P(cal[k].fechaVence, 50));
  return racha(pagos, '2027-06-01');
}

test('niveles: 0-3 Bronce, 4 Plata, 12 Oro, 20 Platino', () => {
  assert.strictEqual(conPuntuales(0).nivel.id, 'bronce');
  assert.strictEqual(conPuntuales(3).nivel.id, 'bronce');
  assert.strictEqual(conPuntuales(4).nivel.id, 'plata');
  assert.strictEqual(conPuntuales(11).nivel.id, 'plata');
  assert.strictEqual(conPuntuales(12).nivel.id, 'oro', 'la mitad de 24 cuotas -> Oro');
});

test('los cupos de cada nivel son los pactados', () => {
  assert.strictEqual(conPuntuales(3).nivel.cupo, 0);
  assert.strictEqual(conPuntuales(4).nivel.cupo, 60);
  assert.strictEqual(conPuntuales(12).nivel.cupo, 150);
});

test('el progreso al siguiente nivel se calcula bien', () => {
  const r = conPuntuales(12);
  assert.strictEqual(r.siguiente.id, 'platino');
  assert.strictEqual(r.faltan, 8, 'de 12 a 20 faltan 8');
  const r4 = conPuntuales(4);
  assert.strictEqual(r4.faltan, 8, 'de 4 a 12 faltan 8');
});

test('un tropiezo NO baja de nivel (el beneficio ya se gano)', () => {
  // Paga puntual las 11 primeras y deja la 12 sin pagar. Al pasar su corte,
  // ese ultimo queda tarde: la racha se cae pero el nivel se mantiene.
  const pagos = [];
  for (let k = 0; k < 11; k++) pagos.push(P(cal[k].fechaVence, 50));
  const r = G.calcularRacha(est(pagos, '2027-01-01'), pagos, 5, '2027-01-01');
  assert.strictEqual(r.puntuales, 11, 'los 11 puntuales se conservan');
  assert.strictEqual(r.nivel.id, 'plata', 'con 11 sigue en Plata');
  assert.strictEqual(r.racha, 0, 'la racha se rompio por el corte impago');
  assert.ok(r.tarde > 0, 'hay al menos un corte tarde');
  assert.strictEqual(r.nivel.cupo, 60, 'no perdio el cupo que ya tenia');
});

test('no cuenta pagos eliminados, no confirmados ni la inicial', () => {
  const pagos = [
    Object.assign(P('2026-01-10', 50), { eliminado: true }),
    Object.assign(P('2026-01-11', 50), { estado: 'pendiente' }),
    Object.assign(P('2026-01-12', 50), { esInicial: true })
  ];
  const r = racha(pagos, '2026-01-25');
  assert.strictEqual(r.evs[0].puntual, false, 'ninguno de los tres deberia contar');
  assert.strictEqual(r.puntos, 0);
});

test('la mejor racha se conserva aunque la actual se caiga', () => {
  // Puntual c1..c5, falla c6, y vuelve a ponerse al dia en c7 y c8.
  // La racha actual baja a 2, pero el record debe seguir siendo 5.
  const pagos = [];
  [0,1,2,3,4].forEach(k => pagos.push(P(cal[k].fechaVence, 50)));
  pagos.push(P(cal[6].fechaVence, 100));   // cubre la c6 atrasada + la c7
  pagos.push(P(cal[7].fechaVence, 50));
  const r = G.calcularRacha(est(pagos, '2026-05-20'), pagos, 5, '2026-05-20');
  assert.strictEqual(r.rachaRecord, 5, 'el record de 5 no se borra');
  assert.ok(r.rachaRecord >= r.racha, 'el record nunca es menor que la racha actual');
});

test('rachaDesde apunta a la primera cuota de la racha actual', () => {
  const pagos = [];
  [0,1,2].forEach(k => pagos.push(P(cal[k].fechaVence, 50)));
  const r = G.calcularRacha(est(pagos, '2026-02-25'), pagos, 5, '2026-02-25');
  assert.strictEqual(r.racha, 3, 'tres puntuales seguidos');
  assert.strictEqual(r.rachaDesde, cal[0].fechaVence, 'arranca en la cuota 1');
});

test('sin racha no hay fecha de inicio ni record', () => {
  const r = G.calcularRacha(est([], '2026-02-25'), [], 5, '2026-02-25');
  assert.strictEqual(r.racha, 0);
  assert.strictEqual(r.rachaRecord, 0, 'sin puntuales el record es 0');
  assert.strictEqual(r.rachaDesde, '', 'sin racha no hay fecha');
});

console.log('\nGamificacion tests passed.');
