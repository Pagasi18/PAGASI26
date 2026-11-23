// 23-nov-2026, Adam: "tengo un cliente que le financié 34$ de un aceite para motos… créamelo tú, es el
// mismo crédito 440 de pagasi 18" → «Sumado a sus cuotas», «4 cuotas de $8,50».
// El CARGO EXTRA: algo que se financia después de la moto y se suma a ciertas cuotas del mismo crédito.
// cred.cargos = [{ id, concepto, monto, cuotas: [{ numero, monto }] }] y cred.total sube con el cargo.
// El contrato y la cuota pactada (cuotaQ) NO cambian.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento() {
  return {
    innerHTML: '', outerHTML: '', textContent: '', value: '', className: '', id: '', type: 'text',
    style: {}, dataset: {}, classList: { add(){}, remove(){}, contains(){ return false; }, toggle(){} },
    children: [], checked: false, disabled: false,
    appendChild(){}, removeChild(){}, insertBefore(){}, remove(){},
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){},
    closest(){ return null; }, matches(){ return false; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
    querySelector(){ return elemento(); }, querySelectorAll(){ return []; },
  };
}
const els = {};
const doc = {
  getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(){ return elemento(); }, querySelectorAll(){ return []; },
  createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){},
};
const ctx = {
  console: { log(){}, warn(){}, error(){} },
  setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
  document: doc, navigator: { userAgent: 'node', language: 'es' },
  location: { href: 'https://18.pagasi.io/admin.html', search: '', hash: '', pathname: '/admin.html' },
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  fetch(){ return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); },
  alert(){}, confirm(){ return true; }, prompt(){ return ''; },
  db: null, storage: null, firebase: undefined, innerWidth: 1440, innerHeight: 900, PG: {},
};
ctx.MutationObserver = function(){ return {observe(){}, disconnect(){}}; };
ctx.IntersectionObserver = function(){ return {observe(){}, disconnect(){}, unobserve(){}}; };
ctx.ResizeObserver = function(){ return {observe(){}, disconnect(){}}; };
ctx.addEventListener = function(){}; ctx.removeEventListener = function(){};
ctx.matchMedia = function(){ return {matches:false, addListener(){}, addEventListener(){}}; };
ctx.getComputedStyle = function(){ return {getPropertyValue(){ return ''; }}; };
ctx.scrollTo = function(){};
ctx.history = { state:null, pushState(){}, replaceState(){}, back(){} };
ctx.window = ctx;
const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m => m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n'), ctx, { filename: 'app.js' });
const L = require('../logic/credito-ledger.js');

// ── El crédito 440 de PAGASI 18 (números reales del 23-nov): $80 × 12 cuotas, 6 pagadas ──
const p2 = n => String(n).padStart(2, '0');
const CARGO = { id: 'CG-1', concepto: 'ACEITE', monto: 34, cuotas: [7, 8, 9, 10].map(n => ({ numero: n, monto: 8.5 })) };
const base = extra => Object.assign({ id: 'CRED-440', cli: 'CLIENTE 440', fecha: '2026-08-21', cuotaQ: 80, cuota: 80, totalCuotas: 12, plazo: 6, total: 960, ini: 509, fin: 621, estado: 'activo', pagado: 6, mora: 0 }, extra || {});
const conCargo = extra => base(Object.assign({ total: 994, cargos: [JSON.parse(JSON.stringify(CARGO))] }, extra || {}));
const pagos = (n, monto, cred) => Array.from({ length: n }, (_, k) => ({ id: 'P' + (k + 1), cred: cred || 'CRED-440', monto: monto || 80, fecha: '2026-09-' + p2(k + 1), estado: 'confirmado' }));

// ══ 1. El calendario (ledger): lo usan Mi cuenta, Patricia, los recordatorios, el módulo 18 + 26 y la AI ══
let e = L.generarEstadoCredito(conCargo(), pagos(6), { today: '2026-11-23', diasGracia: 5 });
ok('las cuotas 7 a 10 valen $88,50 (80 + 8,50 del aceite) y las demás $80', e.cuotas.slice(6, 10).every(q => q.monto === 88.5 && q.cargo === 8.5 && q.conceptoCargo === 'ACEITE') && e.cuotas[10].monto === 80 && !e.cuotas[10].cargo && e.cuotas[5].monto === 80);
ok('...lo que falta sube $34 ($480 + $34 = $514) y la próxima cuota es de $88,50', e.saldoPendiente === 514 && e.montoProxCuota === 88.5 && e.cargosTotal === 34 && e.cuotaBase === 80);
e = L.generarEstadoCredito(conCargo(), pagos(6).concat([{ id: 'P7', cred: 'CRED-440', monto: 80, fecha: '2026-12-01', estado: 'confirmado' }]), { today: '2026-12-15', diasGracia: 5 });
ok('pagar $80 en una cuota de $88,50 no la completa: quedan $8,50 y, vencida, cuenta como mora', e.cuotasPagadas === 6 && e.cuotas[6].saldo === 8.5 && e.cuotas[6].estado === 'mora' && e.moraDias > 0);
e = L.generarEstadoCredito(conCargo(), pagos(12), { today: '2027-04-01', diasGracia: 5 });
ok('pagando 12 × $80 NO queda completado: falta el aceite', e.estado !== 'completado' && Math.abs(e.saldoPendiente - 34) < 0.01);
e = L.generarEstadoCredito(conCargo({ cargos: [Object.assign({}, CARGO, { eliminado: true })], total: 960 }), pagos(6), { today: '2026-11-23' });
ok('un cargo quitado (eliminado) ya no suma', e.saldoPendiente === 480 && e.montoProxCuota === 80 && e.cargosTotal === 0);
const led = L.generarLedgerCredito(conCargo(), [], []);
ok('el libro del crédito: la originación es la de la moto (sin el cargo) y el cargo va aparte', led.find(x => x.tipo === 'originacion_credito').monto === 509 + 960 && led.some(x => x.tipo === 'cargo_extra' && x.monto === 34 && /ACEITE/.test(x.detalle)));
ok('sin cargos, todo igual que antes', L.generarEstadoCredito(base(), pagos(6), { today: '2026-11-23' }).saldoPendiente === 480 && L.montoDeCuota(base(), 7) === 80 && L.cargosTotal(base()) === 0);

// ══ 2. Las cuentas del panel (pagasi-app.js) ══
ctx.S.pagos = pagos(6); ctx.S.creds = [conCargo()];
const c440 = ctx.S.creds[0];
ok('el panel reconoce el crédito con cargos y el monto de cada cuota', ctx.credConCargos(c440) === true && ctx.getCreditoMontoCuota(c440, 7) === 88.5 && ctx.getCreditoMontoCuota(c440, 11) === 80 && ctx.credConCargos(base()) === false);
ctx.S.pagos = pagos(6).concat([{ id: 'P7', cred: 'CRED-440', monto: 80, fecha: '2026-12-01', estado: 'confirmado' }]);
ok('cuotas pagadas: $560 cobrados NO son 7 cuotas (la 7 vale $88,50): son 6 (antes dividía entre $80)', ctx.getCreditoCuotasPagadas(c440) === 6);
ctx.S.pagos = pagos(6).concat([{ id: 'P7', cred: 'CRED-440', monto: 88.5, fecha: '2026-12-01', estado: 'confirmado' }]);
ok('...y con $88,50 sí son 7', ctx.getCreditoCuotasPagadas(c440) === 7);
ok('el saldo del panel (total − cobrado) cuadra con el ledger', Math.abs(ctx.getCreditoSaldoPendiente(c440) - (994 - 568.5)) < 0.01);

// ══ 3. Cobranza (logic/pagos.js) ══
ctx.S.pagos = pagos(6);
const sp = ctx.saldosPorCuota(Object.assign({}, c440, { pagosRegistrados: Array.from({ length: 6 }, (_, k) => ({ cuota: k + 1, montoPagado: 80, fecha: '2026-09-0' + (k + 1), pagoId: 'P' + (k + 1) })).concat([{ cuota: 7, montoPagado: 80, fecha: '2026-12-01', pagoId: 'P7' }]) }));
ok('la tabla de cuotas y los PDF: la cuota 7 de $88,50 con $80 abonados sale PARCIAL ($8,50 pend.), no pagada', sp.montos[6] === 88.5 && sp.saldos[6] === 8.5 && sp.estados[6] === 'parcial' && sp.aviso && sp.aviso.cuota === 7 && sp.aviso.abonado === 80 && sp.aviso.falta === 8.5 && sp.estados[7] === 'pendiente');
// recalcular desde los pagos (escribe pagado, saldoProxCuota y estado)
const escritos = [];
ctx.DB = Object.assign({}, ctx.DB, { updateCred: (id, u) => { escritos.push({ id, u }); return Promise.resolve(true); } });
ctx.S.creds = [conCargo({ pagado: 0 })];
ctx.S.pagos = pagos(6).concat([{ id: 'P7', cred: 'CRED-440', monto: 80, fecha: '2026-12-01', estado: 'confirmado' }]);
ctx.recalcularCreditoDesdePagos('CRED-440');
const w = escritos.filter(x => x.id === 'CRED-440').pop();
ok('recalcular desde los pagos: 6 pagadas y a la 7 le faltan $8,50 (antes daba 7 pagadas)', w && w.u.pagado === 6 && w.u.saldoProxCuota === 8.5 && w.u.estado !== 'completado');
ctx.S.creds = [conCargo({ pagado: 0 })]; escritos.length = 0;
ctx.S.pagos = pagos(12);
ctx.recalcularCreditoDesdePagos('CRED-440');
ok('...pagando 12 × $80 sigue activo (falta el aceite): no se marca completado', escritos.pop().u.estado !== 'completado');
// el monto que propone «Registrar pago»
ctx.S.creds = [conCargo()];
ctx.S.pagos = pagos(6);
const opt = { dataset: { cuotaq: '80', cuota: '80' } };
ctx.updPagoMonto({ value: 'CRED-440', selectedIndex: 0, options: [opt] });
ok('«Registrar pago» propone $88,50 (la cuota 7 con el aceite), no $80', els.p_monto && els.p_monto.value === '88.50');
ok('el saldo para liquidar incluye el aceite', Math.abs(ctx.getSaldoPendienteCredito('CRED-440') - (994 - 480)) < 0.01 || Math.abs(ctx.getSaldoPendienteCredito('CRED-440') - 514) < 0.01);

// ══ 4. Editar el crédito no borra el cargo del total ══
ctx.WZ = ctx.WZ || {};
const f = ctx._wzCredPlanFields({ total: 960, cuotaQ: 80, totalCuotas: 12, plazo: 6 }, conCargo());
ok('al editar, el plan recalcula 80 × 12 = $960 y se le vuelve a sumar el aceite: $994', f.total === 994);
ok('...y si el plan no trae total, queda el guardado (que ya tiene el cargo)', ctx._wzCredPlanFields({ cuotaQ: 80 }, conCargo()).total === 994);
ok('...un crédito nuevo, sin cargos, no cambia', ctx._wzCredPlanFields({ total: 960 }, null).total === 960);

// ══ 5. La ventana «＋ Cargo extra» (solo administradores) ══
ok('el reparto suma exacto: 34 en 4 = 8,50 × 4; 10 en 3 = 3,33 + 3,33 + 3,34', JSON.stringify(ctx._cargoReparto(34, 4)) === '[8.5,8.5,8.5,8.5]' && JSON.stringify(ctx._cargoReparto(10, 3)) === '[3.33,3.33,3.34]');
ctx.S.creds = [base()]; ctx.S.pagos = pagos(6);
const setv = (id, v) => { els[id] = Object.assign(els[id] || elemento(), { value: String(v) }); };
setv('cg_concepto', 'Aceite'); setv('cg_monto', '34'); setv('cg_n', '4'); setv('cg_desde', '7');
let arm = ctx._cargoArmar(ctx.S.creds[0]);
ok('el caso de Adam: ACEITE $34 desde la cuota 7 en 4 cuotas → 7, 8, 9 y 10 con $8,50', !arm.err && arm.concepto === 'Aceite' && arm.cuotas.map(x => x.numero + ':' + x.monto).join() === '7:8.5,8:8.5,9:8.5,10:8.5');
setv('cg_desde', '5'); arm = ctx._cargoArmar(ctx.S.creds[0]);
ok('no deja sumarlo a cuotas ya pagadas', /todavía no están pagadas \(desde la 7\)/.test(arm.err));
setv('cg_desde', '11'); arm = ctx._cargoArmar(ctx.S.creds[0]);
ok('no deja pasarse de las cuotas del crédito', /desde la 11 caben 2 como mucho/.test(arm.err));
setv('cg_desde', '7'); setv('cg_concepto', ''); arm = ctx._cargoArmar(ctx.S.creds[0]);
ok('pide qué se financió y un monto válido', /Escribe qué se financió/.test(arm.err) && (setv('cg_concepto', 'X'), setv('cg_monto', '0'), /mayor que 0/.test(ctx._cargoArmar(ctx.S.creds[0]).err)));
// guardar: solo administradores; en la base se AGREGA el cargo y se SUMA al total
ctx.S.currentUser = { uid: 'u1', nombre: 'Prueba', rol: 'Gerente', permisos: [] };
escritos.length = 0; setv('cg_concepto', 'ACEITE'); setv('cg_monto', '34'); setv('cg_n', '4'); setv('cg_desde', '7');
ctx.cargoExtraGuardar('CRED-440');
ok('un gerente no puede agregar cargos (solo administradores)', escritos.length === 0);
ctx.S.currentUser = { uid: 'adm', nombre: 'Adam', rol: 'Administrador', permisos: [] };
const FV = { arrayUnion: x => ({ __union: x }), increment: n => ({ __inc: n }) };
ctx.firebase = { firestore: Object.assign(() => ({}), { FieldValue: FV }) };
(async () => {
  ctx.cargoExtraGuardar('CRED-440');
  await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  const g = escritos.find(x => x.u && x.u.cargos);
  ok('el administrador lo guarda: arrayUnion del cargo e increment del total (no reescribe el crédito)', g && g.u.cargos.__union && g.u.cargos.__union.concepto === 'ACEITE' && g.u.cargos.__union.monto === 34 && g.u.total.__inc === 34 && g.u.cargos.__union.cuotas.length === 4 && g.u.cargos.__union.creadoPor === 'Adam');
  ok('...y en la pantalla queda al instante (cargos y total)', (ctx.S.creds[0].cargos || []).length === 1 && ctx.S.creds[0].total === 994);
  ok('...el cargo no lleva nada «undefined» por dentro (Firestore no lo acepta)', !JSON.stringify(g.u.cargos.__union).includes('undefined') && Object.values(g.u.cargos.__union).every(v => v !== undefined));

  // ══ 6. Patricia (servidor) le explica el cargo al cliente ══
  const B = require('../functions/lib/briefing.js');
  const est = B.estadoCredito(conCargo(), pagos(6), '2026-11-23');
  const t = B.armar({ empresa: 'PAGASI 18', cliente: { nombre: 'CLIENTE' }, creditos: [est], hoy: '2026-11-23' });
  ok('Patricia: próxima cuota $88,50 y «financió ACEITE por $34: se suma $8,50 a las cuotas 7, 8, 9, 10»', /su próxima cuota es la 7, \$88,50/.test(t) && /financió ACEITE por \$34,00: se suma \$8,50 a las cuotas 7, 8, 9, 10/.test(t));
  const est2 = B.estadoCredito(conCargo(), pagos(10).map((p, k) => k >= 6 ? Object.assign(p, { monto: 88.5 }) : p), '2027-02-01');
  ok('...y cuando ya pagó esas cuotas, ya no lo menciona', !est2.cargos.length);

  // ══ 7. El módulo 18 + 26 y la AI ══
  const G = require('../logic/grupo-resumen.js');
  const idxVacio = new Map();
  ok('módulo 18 + 26: sin pagos a mano, lo cobrado de respaldo cuenta cada cuota con su cargo (6 × 80 = 480; con 7 pagadas: 568,50)', G.saldoPendiente(conCargo({ pagado: 7 }), idxVacio) === 994 - 568.5);

  console.log('\n' + pass + ' OK · ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(x => { console.log('FALLA la prueba se cayó: ' + (x && x.stack || x)); process.exit(1); });
