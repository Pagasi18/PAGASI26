// Punto 26 de la lista del 18-sep-2026: los robots de Telegram contaban la mora
// distinto que el sistema. Miraban el estado guardado ('mora'), que el sistema pone
// a partir del dia 6 (dias de gracia) y que ademas se queda viejo si nadie abre el
// app. El sistema cuenta EN MORA a todo credito vigente con al menos un dia de atraso.
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Mora = require(path.join(ROOT, 'bot/mora-comun.js'));
const Ledger = require(path.join(ROOT, 'logic/credito-ledger.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const HOY = '2026-09-22';
const p2 = n => String(n).padStart(2, '0');
const menos = d => { const x = new Date('2026-09-22T12:00:00'); x.setDate(x.getDate() - d); return x.getFullYear() + '-' + p2(x.getMonth() + 1) + '-' + p2(x.getDate()); };
// Credito quincenal de $50: la primera cuota vence 15 dias despues de la fecha
const cred = (id, diasDesdeInicio, extra) => Object.assign({ id, cli: 'CLIENTE ' + id, estado: 'activo', fecha: menos(diasDesdeInicio),
  precio: 1000, ini: 300, fin: 700, cuotaQ: 50, totalCuotas: 24, plazo: 12, pagado: 0, mora: 0 }, extra || {});
const est = c => Ledger.generarEstadoCredito(c, [], { today: HOY, diasGracia: 5 });

// Cartera: uno al dia, uno con 2 dias (dentro de la gracia), uno con 20, uno recuperado y uno cancelado
const alDia = cred('C1', 10);                         // su cuota vence en 5 dias
const gracia = cred('C2', 17);                        // vencio hace 2 dias → el sistema ya lo cuenta
const viejo = cred('C3', 35, { estado: 'mora', mora: 20 });
const recuperado = cred('C4', 40, { estado: 'recuperado', mora: 25 });
const cancelado = cred('C5', 40, { estado: 'cancelado', mora: 25 });
const cartera = [alDia, gracia, viejo, recuperado, cancelado];

// ── Lo que cuenta el SISTEMA (misma regla que dashboard/Creditos/Cobranza) ──
const vigentesApp = cartera.filter(c => !c.eliminado && (c.estado === 'activo' || c.estado === 'mora'));
const enMoraApp = vigentesApp.filter(c => Math.max(Number(c.mora) || 0, est(c).moraDias || 0) > 0
  || (est(c).cuotas || []).some(q => (Number(q.saldo) || 0) > 0.01 && q.fechaVence < HOY));

// ── Lo que cuentan los ROBOTS ──
const enMoraBot = cartera.filter(c => Mora.enMora(c, est(c), HOY));

ok('el robot cuenta los mismos créditos en mora que el sistema (' + enMoraBot.length + ')',
  enMoraBot.length === enMoraApp.length && enMoraBot.every(c => enMoraApp.indexOf(c) > -1));
ok('el de 2 días de atraso (dentro de la gracia) SÍ cuenta, como en la pantalla',
  enMoraBot.some(c => c.id === 'C2'));
ok('el viejo de 20 días cuenta', enMoraBot.some(c => c.id === 'C3'));
ok('el que va al día no cuenta', !enMoraBot.some(c => c.id === 'C1'));
ok('un recuperado no cuenta aunque tenga días guardados', !enMoraBot.some(c => c.id === 'C4'));
ok('un cancelado tampoco', !enMoraBot.some(c => c.id === 'C5'));
ok('los días que reporta el robot salen del motor de cuotas, no del campo viejo',
  Mora.diasAtraso(Object.assign({}, viejo, { mora: 0 }), est(viejo), HOY) === 20);
ok('si el campo guardado dice más días que el motor, manda el mayor (nunca reporta de menos)',
  Mora.diasAtraso(Object.assign({}, gracia, { mora: 9 }), est(gracia), HOY) === 9);
ok('un crédito viejo sin estado cuenta como vigente', Mora.vigente({ id: 'X', fecha: menos(40) }) === true);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
