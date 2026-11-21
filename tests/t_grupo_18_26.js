// 21-nov-2026, Adam: "un módulo nuevo que se llame PAGASI 18 + 26… un dashboard de qué tiene
// pagasi 18 y 26 juntos… cada hora no: cuando alguien se meta en ese módulo… los créditos, dinero
// en la calle, cantidad de mora… solo las cosas básicas".
//  1. Las cuentas del servidor (logic/grupo-resumen.js) dan EXACTAMENTE lo que muestra
//     el Dashboard de la compañía, aunque los días de atraso guardados estén viejos.
//  2. El servidor (functions/lib/grupo.js) lee las dos bases al momento, suma y no deja salir
//     nada que no sean las sumas; solo responde a un administrador o a quien tenga el permiso.
//  3. La pantalla: está en el menú, pide los números al ENTRAR (no en cada redibujo) y los muestra.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
process.on('unhandledRejection', e => { fail++; console.log('FALLA promesa rechazada: ' + (e && e.message)); });
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
const doc = {
  getElementById(){ return elemento(); }, querySelector(){ return elemento(); }, querySelectorAll(){ return []; },
  createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){},
};
const ctx = {
  console: { log(){}, warn(){}, error(){} },
  setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
  document: doc, navigator: { userAgent: 'node', language: 'es' },
  location: { href: 'https://pagasi.io/admin.html', search: '', hash: '', pathname: '/admin.html' },
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

const { grupoResumen, grupoSumar, estadoHoy, diaDe } = require('../logic/grupo-resumen');
const ledger = require('../logic/credito-ledger');
const grupo = require('../functions/lib/grupo');
const clon = o => JSON.parse(JSON.stringify(o));
const p2 = n => String(n).padStart(2, '0');
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
const HOY = dia(0);

// ── Una cartera con todos los casos, armada alrededor de la fecha de hoy ──
const base = (id, extra) => Object.assign({ id, cli:'CLIENTE ' + id, estado:'activo', mora:0, pagado:0, total:1440, cuotaQ:80, totalCuotas:18, plazo:9, precio:1400, ini:600, fin:800 }, extra);
const CREDS = [
  base('A', { fecha: dia(-10) }),                                    // todavía no le toca pagar
  base('B', { fecha: dia(-40), pagado:2 }),                          // al día con dos cuotas
  base('C', { fecha: dia(-20) }),                                    // 5 días de atraso (dentro de la gracia: activo, pero ya cuenta)
  base('D', { fecha: dia(-60), pagado:1 }),                          // 30 días de atraso
  base('E', { fecha: dia(-100), pagado:2 }),                         // atrasado, con una cuota a medias
  base('F', { fecha: dia(-300), pagado:18 }),                        // ya pagó todo pero quedó guardado como activo
  base('G', { fecha: dia(-90), estado:'cancelado', mora:40 }),
  base('H', { fecha: dia(-90), estado:'recuperado', mora:40 }),
  base('I', { fecha: dia(-5), estado:'pendiente_revision' }),
  base('J', { fecha: dia(-90), eliminado:true, mora:60, estado:'mora' }),
  base('K', { fecha: dia(-50), pagado:1, estado:'activo', mora:0 }), // guardado «al día», pero hoy ya tiene 20 días de atraso
  base('L', { fecha: dia(-50), pagado:3, estado:'mora', mora:12 }),  // guardado «en mora», pero ya se puso al día
  base('M', { fecha:'', estado:'activo', mora:3 }),                  // sin fecha: se cuenta como está guardado
  base('N', { fecha:'', estado:'mora', mora:'8' }),
  base('O', { fecha: dia(-14) }),                                    // solo pagó la inicial
  base('P', { fecha: dia(-33), pagado:1 }),                          // con un pago pendiente y uno borrado
  base('Q', { fecha: dia(-44), pagado:2, pagosRegistrados:[{ montoPagado:80 }, { montoPagado:'80' }] }),   // sin pagos sueltos: los del crédito
  base('R', { fecha: dia(-58), pagado:3 }),                          // sin pagos de ningún tipo: cuotas pagadas × cuota
  base(900, { fecha: dia(-29), pagado:1 }),                          // id numérico y el pago lo trae como texto: no casan (igual que en el panel)
  base('T', { fecha: dia(-70), pagado:2, totalCuotas:undefined }),   // sin totalCuotas: plazo × 2
  base('U', { fecha: dia(-25), pagado:1, total:100 }),               // pagó más que el total: no resta
  base('V', { fecha: dia(-200), pagado:4, estado:'mora', mora:5, cobranzaStatus:'ilocalizable' }),
  base('W', { fecha: dia(-130), pagado:6, fechaCompromiso: dia(3) }),
];
const pago = (id, cred, monto, extra) => Object.assign({ id, cred, monto, fecha: dia(-3), estado:'confirmado', metodo:'Efectivo' }, extra);
const PAGOS = [
  pago('P1', 'B', 80), pago('P2', 'B', 80),
  pago('P3', 'D', 80, { fecha: dia(-44) }),
  pago('P4', 'E', 80, { fecha: dia(-84) }), pago('P5', 'E', 80, { fecha: dia(-70) }), pago('P6', 'E', 30, { fecha: dia(-50) }),
  pago('P7', 'K', 80, { fecha: dia(-36) }),
  pago('P8', 'L', 80), pago('P9', 'L', 80), pago('P10', 'L', 80),
  pago('P11', 'O', 600, { esInicial:true }), pago('P12', 'O', 45, { tipoOperacion:'inicial_credito' }),
  pago('P13', 'P', 80), pago('P14', 'P', 80, { estado:'pendiente' }), pago('P15', 'P', 80, { eliminado:true }),
  pago('P16', '900', 80),
  pago('P17', 'T', 80), pago('P18', 'T', '80'),
  pago('P19', 'U', 80), pago('P20', 'U', 80),
  pago('P21', 'V', 320, { fecha: dia(-150) }),
  pago('P22', 'W', 480, { fecha: dia(-40) }),
  pago('P23', 'F', 1440, { fecha: dia(-30) }),
  pago('P24', 'G', 400), pago('P25', 'J', 400),
];

// Lo que muestra el Dashboard de la compañía con esos mismos datos
function dashboard(gracia) {
  vm.runInContext('PLAN.diasGracia = ' + JSON.stringify(gracia) + ';', ctx);
  Object.assign(ctx.S, { creds: clon(CREDS), pagos: clon(PAGOS), clientes: [], motos: [], egresos: [], movimientos: [], cuentasPendientes: [], facturas: [], concesionarios: [], tareas: [], recursos: [],
    currentUser: { uid:'u1', nombre:'Adam', rol:'Administrador', permisos:[] }, page:'dash' });
  ctx.DB.updateCred = () => Promise.resolve(true);
  ctx.calcularMoraAuto();                                   // lo que hace el panel al abrir
  const h = String(ctx.PG.dash());
  const n = k => { const m = h.match(new RegExp('data-kpi="' + k + '">(\\d+)<')); return m ? +m[1] : null; };
  const txt = k => ((h.match(new RegExp('data-kpi="' + k + '">(.*?)</div>')) || [])[1] || '').replace(/<[^>]+>/g, '');
  return { creditos: n('activos'), alDia: n('aldia'), enMora: n('mora'), cartera: txt('cartera'), vencido: txt('mora-vencido') };
}
const dinero0 = v => '$' + Math.round(v).toLocaleString('es-VE') + ' vencido';

// ══ 1. Las cuentas son las del Dashboard ══
[5, 0, 10, null].forEach(g => {
  const d = dashboard(g === null ? 5 : g);
  const r = grupoResumen(clon(CREDS), clon(PAGOS), { hoy: HOY, gracia: g === null ? undefined : g, ledger });
  const et = g === null ? 'sin decir los días de gracia (5)' : 'con ' + g + ' días de gracia';
  ok(et + ': los mismos créditos, al día y en mora que el Dashboard (' + d.creditos + ' · ' + d.alDia + ' · ' + d.enMora + ')', d.creditos > 0 && r.creditos === d.creditos && r.alDia === d.alDia && r.enMora === d.enMora);
  ok(et + ': el mismo dinero en la calle (' + d.cartera + ')', ctx.fmt(r.cartera) === d.cartera);
  ok(et + ': el mismo monto vencido (' + d.vencido + ')', r.vencido > 0 && dinero0(r.vencido) === d.vencido);
});
const R = grupoResumen(clon(CREDS), clon(PAGOS), { hoy: HOY, ledger });
ok('la cartera de prueba da 18 créditos, 10 en mora y 8 al día', R.creditos === 18 && R.enMora === 10 && R.alDia === 8);
ok('los créditos y pagos que recibe no se modifican', (() => { const c = clon(CREDS), p = clon(PAGOS), a = JSON.stringify([c, p]); grupoResumen(c, p, { hoy: HOY, ledger }); return JSON.stringify([c, p]) === a; })());

// Caso por caso: lo guardado viejo se corrige con la fecha de hoy
const uno = (id, pagos) => grupoResumen(clon(CREDS.filter(c => c.id === id)), clon(pagos || PAGOS), { hoy: HOY, ledger });
ok('un crédito guardado «al día» que hoy ya está atrasado cuenta en mora (nadie abrió el panel ese día)', uno('K').creditos === 1 && uno('K').enMora === 1 && uno('K').vencido === 160);   // dos cuotas ya vencidas
ok('un crédito guardado «en mora» que ya se puso al día no cuenta en mora', uno('L').creditos === 1 && uno('L').enMora === 0 && uno('L').vencido === 0);
ok('el que ya pagó todas sus cuotas sale de la cartera aunque siga guardado como activo', uno('F').creditos === 0 && uno('F').cartera === 0);
ok('cancelado, recuperado, solicitud sin aprobar y borrado no cuentan', ['G', 'H', 'I', 'J'].every(id => uno(id).creditos === 0));
ok('con 5 días de atraso (dentro de la gracia) ya cuenta en mora, como en el Dashboard', uno('C').enMora === 1 && estadoHoy(CREDS[2], diaDe(HOY), 5).estado === 'activo' && estadoHoy(CREDS[2], diaDe(HOY), 5).mora === 5);
ok('...y pasada la gracia el estado es mora', estadoHoy(CREDS[3], diaDe(HOY), 5).estado === 'mora' && estadoHoy(CREDS[3], diaDe(HOY), 5).mora === 30);
ok('sin fecha se cuenta como está guardado', uno('M').creditos === 1 && uno('M').enMora === 1 && uno('N').enMora === 1);
ok('dinero en la calle = total − pagos confirmados que no son la inicial', uno('B').cartera === 1280 && uno('E').cartera === 1250);
ok('...la inicial no baja el saldo', uno('O').cartera === 1440);
ok('...ni un pago pendiente ni uno borrado', uno('P').cartera === 1360);
ok('...sin pagos sueltos usa los anotados en el crédito, y si tampoco hay, cuotas pagadas × cuota', uno('Q').cartera === 1280 && uno('R').cartera === 1200);
ok('...un pago cuyo crédito viene como texto no casa con un id numérico (igual que en el panel)', uno(900).cartera === 1360);
ok('...y nunca queda negativo', uno('U').cartera === 0);
ok('una cuota a medias: lo vencido es lo que falta de esa cuota y las siguientes vencidas', uno('E').vencido > 0 && uno('E').vencido === Math.round(uno('E').vencido * 100) / 100);
ok('sin el ledger, lo vencido cae a una cuota por crédito atrasado (como el Dashboard cuando falla)', grupoResumen(clon(CREDS.filter(c => c.id === 'D')), clon(PAGOS), { hoy: HOY, ledger: {} }).vencido === 80);
ok('las fechas se leen en hora de Venezuela', diaDe('2026-11-21') === diaDe('2026-11-21T03:59:59.000Z') + 1 && diaDe('2026-11-21') === diaDe('2026-11-21T04:00:00.000Z') && diaDe('') === null && diaDe('no es fecha') === null);
ok('listas vacías dan ceros', (() => { const v = grupoResumen([], [], { hoy: HOY }); return ['creditos', 'cartera', 'alDia', 'enMora', 'vencido'].every(k => v[k] === 0) && v.meses.length === 12 && v.meses.every(m => !m.cuotas && !m.iniciales && !m.ventas) && v.tramos.every(t => !t.creditos) && !v.semana.cuotas && !v.historico.vendidos && Object.keys(v.cobro).every(k => !v.cobro[k].cuotas && !v.cobro[k].iniciales); })() && grupoResumen(null, null, {}).creditos === 0 && grupoResumen(null, null, {}).meses.length === 0);
ok('las dos juntas son la suma', JSON.stringify(grupoSumar([{ creditos:10, cartera:1000.1, alDia:8, enMora:2, vencido:50.25 }, { creditos:5, cartera:500.2, alDia:5, enMora:0, vencido:0 }])) === JSON.stringify({ creditos:15, cartera:1500.3, alDia:13, enMora:2, vencido:50.25 }));

// ══ 1b. Lo que se agregó el 21-nov (Adam: "dame más data… está muy vacío") ══
const MES = HOY.slice(0, 7), mesMas = n => { const d = new Date(HOY + 'T12:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
const MES_ANT = mesMas(-1);
// unos pagos más, para que haya de todo: hoy, el mes pasado antes y después de esta fecha, y uno viejo
const PAGOS2 = PAGOS.concat([
  pago('X1', 'B', 25, { fecha: HOY }), pago('X2', 'O', 100, { fecha: HOY, esInicial:true }),
  pago('X3', 'B', 40, { fecha: MES_ANT + '-01' }), pago('X4', 'B', 70, { fecha: MES_ANT + '-28' }),
  pago('X5', 'B', 9, { fecha: '2020-01-05' }), pago('X6', 'B', 33, { fecha: '' }),
  pago('X7', 'B', 500, { fecha: HOY, estado:'pendiente' }), pago('X8', 'B', 500, { fecha: HOY, eliminado:true }),
  pago('X9', 'B', 12, { fecha: HOY + 'T15:30:00' }),
]);
const R2 = grupoResumen(clon(CREDS), clon(PAGOS2), { hoy: HOY, ledger });
const conf = PAGOS2.filter(p => !p.eliminado && p.estado === 'confirmado'), esIni = p => !!(p.esInicial || p.tipoOperacion === 'inicial_credito');
const suma = (lista, f) => Math.round(lista.filter(f).reduce((a, p) => a + (parseFloat(p.monto) || 0), 0) * 100) / 100;
const f10 = p => String(p.fecha || '').slice(0, 10);
const ultDia = (() => { const d = new Date(Date.UTC(+MES_ANT.slice(0, 4), +MES_ANT.slice(5, 7), 0)).getUTCDate(); return MES_ANT + '-' + String(Math.min(+HOY.slice(8, 10), d)).padStart(2, '0'); })();
ok('lo cobrado hoy: pagos confirmados de hoy, cuotas e iniciales por separado (un pago con hora también cuenta)', R2.cobro.hoy.cuotas === suma(conf, p => f10(p) === HOY && !esIni(p)) && R2.cobro.hoy.cuotas === 37 && R2.cobro.hoy.iniciales === 100);
ok('...ni un pago pendiente ni uno borrado', R2.cobro.hoy.cuotas < 500);
ok('lo de los últimos 7 días (hoy y los 6 anteriores)', R2.cobro.semana.cuotas === suma(conf, p => f10(p) >= dia(-6) && f10(p) <= HOY && !esIni(p)) && R2.cobro.semana.iniciales === suma(conf, p => f10(p) >= dia(-6) && f10(p) <= HOY && esIni(p)));
ok('lo de este mes y el mes pasado completo', R2.cobro.mes.cuotas === suma(conf, p => f10(p) >= MES + '-01' && !esIni(p)) && R2.cobro.mesPasado.cuotas === suma(conf, p => f10(p).slice(0, 7) === MES_ANT && !esIni(p)));
ok('...y el mes pasado hasta el mismo día, para comparar', R2.cobro.mesPasadoAFecha.cuotas === suma(conf, p => f10(p).slice(0, 7) === MES_ANT && f10(p) <= ultDia && !esIni(p)) && R2.cobro.mesPasadoAFecha.cuotas < R2.cobro.mesPasado.cuotas);
ok('desde el principio: todo lo confirmado, aunque no tenga fecha', R2.cobro.total.cuotas === suma(conf, p => !esIni(p)) && R2.cobro.total.iniciales === suma(conf, esIni));
const d2 = (() => { vm.runInContext('PLAN.diasGracia = 5;', ctx); Object.assign(ctx.S, { creds: clon(CREDS), pagos: clon(PAGOS2).map(p => Object.assign(p, { monto: parseFloat(p.monto) })), page:'dash' }); ctx.calcularMoraAuto(); const h = String(ctx.PG.dash()); return { mes: (h.match(/data-kpi="cobrado-mes">([^<]+)</) || [])[1], cuotas: (h.match(/data-kpi="flujo-cuotas">([^<]+)</) || [])[1] }; })();
ok('lo cobrado este mes es lo mismo que «Cobrado» del Dashboard (' + d2.mes + ')', '$' + Math.round(R2.cobro.mes.cuotas + R2.cobro.mes.iniciales).toLocaleString('es-VE') === d2.mes && '+$' + Math.round(R2.cobro.mes.cuotas).toLocaleString('es-VE') === d2.cuotas);
ok('los 12 meses de los gráficos terminan en el de hoy', R2.meses.length === 12 && R2.meses[11].mes === MES && R2.meses[10].mes === MES_ANT && R2.meses[0].mes === mesMas(-11));
ok('...cada mes con lo cobrado de ese mes (el pago de 2020 no entra)', R2.meses[11].cuotas === R2.cobro.mes.cuotas && R2.meses[10].cuotas === R2.cobro.mesPasado.cuotas && Math.round(R2.meses.reduce((a, m) => a + m.cuotas, 0) * 100) / 100 === suma(conf, p => f10(p) >= mesMas(-11) + '-01' && !esIni(p)));
const vendidos = CREDS.filter(c => !c.eliminado && !['cancelado', 'rechazado', 'rechazada', 'pendiente_revision'].includes(c.estado));
ok('las motos vendidas: los créditos otorgados (sin anulados, solicitudes ni borrados) en el mes de su fecha', R2.historico.vendidos === vendidos.length && R2.meses.reduce((a, m) => a + m.ventas, 0) === vendidos.filter(c => c.fecha && c.fecha >= mesMas(-11) + '-01').length && R2.meses[11].ventas === vendidos.filter(c => String(c.fecha).slice(0, 7) === MES).length);
ok('...con lo financiado', R2.historico.financiado === vendidos.length * 800 && R2.meses[11].financiado === R2.meses[11].ventas * 800);
ok('terminaron de pagar: el completado aunque esté guardado como activo', R2.historico.terminados === 1 && uno('F').historico.terminados === 1 && R2.historico.recuperados === 1);
ok('la mora por días de atraso suma lo mismo que la mora total', R2.tramos.map(t => t.tramo).join() === '1-15,16-30,31-60,+60' && R2.tramos.reduce((a, t) => a + t.creditos, 0) === R2.enMora && Math.abs(R2.tramos.reduce((a, t) => a + t.vencido, 0) - R2.vencido) < 0.01);
ok('...cada crédito en su tramo (5 días → 1-15; 30 → 16-30)', uno('C').tramos[0].creditos === 1 && uno('D').tramos[1].creditos === 1 && uno('D').tramos[1].vencido === uno('D').vencido);
const semanaEsperada = (() => { let n = 0, m = 0; CREDS.forEach(c => { if (c.eliminado) return; const e = estadoHoy(c, diaDe(HOY), 5); if (e.estado !== 'activo' && e.estado !== 'mora') return; const est = ledger.generarEstadoCredito(Object.assign({}, c, e), clon(PAGOS2), { diasGracia: 5, today: HOY }); est.cuotas.forEach(q => { if (q.saldo > 0.001 && q.fechaVence >= HOY && q.fechaVence <= dia(6)) { n++; m += q.saldo; } }); }); return { n, m: Math.round(m * 100) / 100 }; })();
ok('lo que vence esta semana: las cuotas de hoy a 6 días, con lo que les falta (' + semanaEsperada.n + ' cuotas)', semanaEsperada.n > 0 && R2.semana.cuotas === semanaEsperada.n && R2.semana.monto === semanaEsperada.m);
ok('agrupar los pagos por crédito da lo mismo que pasarlos todos', R2.vencido === grupoResumen(clon(CREDS), clon(PAGOS2), { hoy: HOY, ledger }).vencido && uno('E').vencido === Math.round(ledger.generarEstadoCredito(Object.assign({}, CREDS[4], { estado:'mora' }), clon(PAGOS), { diasGracia: 5, today: HOY }).cuotas.filter(q => q.saldo > 0.001 && q.fechaVence < HOY).reduce((a, q) => a + q.saldo, 0) * 100) / 100);
const { fechaTxt } = require('../logic/grupo-resumen');
ok('las fechas guardadas de cualquier forma se leen en hora de Venezuela', fechaTxt('2026-11-21') === '2026-11-21' && fechaTxt('2026-11-21T23:50:00') === '2026-11-21' && fechaTxt({ toDate: () => new Date('2026-11-22T03:00:00Z') }) === '2026-11-21' && fechaTxt(new Date('2026-11-22T05:00:00Z')) === '2026-11-22' && fechaTxt('') === '' && fechaTxt(null) === '' && fechaTxt('basura') === '');
const S2 = grupoSumar([R2, Object.assign({ nombre:'PAGASI 26' }, R2)]);
ok('las dos juntas suman también lo nuevo, mes por mes y tramo por tramo', S2.cobro.mes.cuotas === Math.round(R2.cobro.mes.cuotas * 200) / 100 && S2.meses.length === 12 && S2.meses[11].mes === MES && S2.meses[11].ventas === R2.meses[11].ventas * 2 && S2.tramos[0].tramo === '1-15' && S2.tramos[0].creditos === R2.tramos[0].creditos * 2 && S2.semana.cuotas === R2.semana.cuotas * 2 && S2.historico.vendidos === R2.historico.vendidos * 2 && !('nombre' in S2));
// ══ 1c. Más gráficos (21-nov, Adam: "ponme más data… ponme charts") ══
ok('cobrado día por día: los últimos 30 días terminando hoy, cada uno con lo de ese día', R2.dias.length === 30 && R2.dias[29].dia === HOY && R2.dias[0].dia === dia(-29) && R2.dias[29].cuotas === R2.cobro.hoy.cuotas && R2.dias[29].iniciales === R2.cobro.hoy.iniciales && Math.round(R2.dias.slice(-7).reduce((a, d) => a + d.cuotas, 0) * 100) / 100 === R2.cobro.semana.cuotas);
ok('las formas de pago suman lo cobrado este mes y juntan los nombres de cada compañía', (() => { const t = Object.keys(R2.metodos).reduce((a, k) => a + R2.metodos[k], 0); return Math.abs(t - (R2.cobro.mes.cuotas + R2.cobro.mes.iniciales)) < 0.01 && Object.keys(R2.metodos).join() === 'banco,binance,efectivo,zelle,concesionario,otros'; })());
const metodoDe = m => grupoResumen([], [pago('M', 'B', 10, { fecha: HOY, metodo: m })], { hoy: HOY }).metodos;
ok('...«100% Banco» y «100% Banco 26» son banco; «Inicial en concesionario» va aparte; Binance, Efectivo y Zelle por su nombre', metodoDe('100% Banco').banco === 10 && metodoDe('100% Banco 26').banco === 10 && metodoDe('Inicial en concesionario').concesionario === 10 && metodoDe('Binance 26').binance === 10 && metodoDe('EFECTIVO').efectivo === 10 && metodoDe('Efectivo USD').efectivo === 10 && metodoDe('Zelle').zelle === 10 && metodoDe('Pagos Alejandro').otros === 10 && metodoDe('').otros === 10);
ok('cómo se pagan las cuotas: los últimos 6 meses por el mes en que vencían', R2.puntualidad.length === 6 && R2.puntualidad[5].mes === MES && R2.puntualidad.every(x => Math.abs(x.aTiempo + x.tarde + x.sinPagar - x.monto) < 0.02));
const unoP = (c, pagos) => grupoResumen([Object.assign({ id:'Z', estado:'activo', total:160, cuotaQ:80, totalCuotas:2, fin:150, precio:300, ini:150 }, c)], pagos, { hoy: HOY, ledger }).puntualidad;
const venceAyer = dia(-1), fechaUna = dia(-16);   // la primera cuota vence a los 15 días: dia(-1)
const pu = (lista) => lista.find(x => x.mes === venceAyer.slice(0, 7));
ok('...pagada el día que vencía: a tiempo', pu(unoP({ fecha: fechaUna }, [pago('Q1', 'Z', 80, { fecha: venceAyer })])).aTiempo === 80);
ok('...pagada después: tarde', (() => { const x = pu(unoP({ fecha: dia(-20) }, [pago('Q1', 'Z', 80, { fecha: dia(-2) })])); return x.tarde === 80 && x.aTiempo === 0; })());
ok('...a medias y sin pagar el resto: lo que falta sale sin pagar', (() => { const x = pu(unoP({ fecha: fechaUna }, [pago('Q1', 'Z', 30, { fecha: dia(-3) })])); return x.aTiempo === 30 && x.sinPagar === 50 && x.cuotas === 1; })());
ok('...la cuota que vence hoy todavía no cuenta', (() => { const l = unoP({ fecha: dia(-15) }, []); return l.every(x => x.cuotas === 0); })());
ok('la mora según el mes de venta: cuántas de las vendidas cada mes están hoy en mora', R2.cosechas.length === 12 && R2.cosechas.reduce((a, x) => a + x.enMora, 0) === CREDS.filter(c => !c.eliminado && c.fecha && c.fecha >= mesMas(-11) + '-01').filter(c => { const e = estadoHoy(c, diaDe(HOY), 5); return (e.estado === 'activo' || e.estado === 'mora') && e.mora > 0; }).length && R2.cosechas.every(x => x.enMora <= x.vendidos && x.mas30 <= x.enMora));
ok('la venta promedio: las ventas de los últimos 90 días (sumas; la pantalla divide)', (() => { const v = vendidos.filter(c => c.fecha && c.fecha >= dia(-89) && c.fecha <= HOY); return R2.promedio.ventas === v.length && R2.promedio.precio === v.length * 1400 && R2.promedio.inicial === v.length * 600 && R2.promedio.cuota === v.length * 80; })());
const conConc = grupoResumen([base('c1', { fecha: dia(-40), concesionarioId:'CONC-1', modelo:' owen  200s ' }), base('c2', { fecha: HOY, concesionarioId:'CONC-1', modelo:'OWEN 200S' }), base('c3', { fecha: dia(-40), concesionarioId:'CONC-2', modelo:'RK 200' }), base('c4', { fecha: dia(-40), estado:'cancelado', concesionarioId:'CONC-2' })], [], { hoy: HOY, ledger, concesionarios: [{ id:'CONC-1', nombre:'EMPIRE BELLO MONTE' }] });
ok('los concesionarios: ventas, ventas del mes, activos y en mora, con su nombre (sin el anulado)', conConc.concesionarios[0].conc === 'CONC-1' && conConc.concesionarios[0].nombre === 'EMPIRE BELLO MONTE' && conConc.concesionarios[0].vendidos === 2 && conConc.concesionarios[0].mes === 1 && conConc.concesionarios[0].enMora === 1 && conConc.concesionarios[1].vendidos === 1 && conConc.concesionarios[1].nombre === '');
ok('los modelos: escritos distinto se juntan (mayúsculas y espacios)', conConc.modelos[0].modelo === 'OWEN 200S' && conConc.modelos[0].vendidos === 2 && conConc.modelos[1].modelo === 'RK 200');
ok('las dos juntas no mezclan concesionarios ni modelos (van por compañía y la pantalla los junta)', !('concesionarios' in S2) && !('modelos' in S2) && S2.dias.length === 30 && S2.puntualidad.length === 6 && S2.metodos.banco === R2.metodos.banco * 2 && S2.promedio.ventas === R2.promedio.ventas * 2);
ok('...y si una fila no casa (otro día u otro mes), esa lista no se suma', !('dias' in grupoSumar([R2, Object.assign({}, R2, { dias: R2.dias.map((d, i) => i === 3 ? Object.assign({}, d, { dia: '2000-01-01' }) : d) })])));
ok('...y si los meses no son los mismos, no se inventan', !('meses' in grupoSumar([R2, Object.assign({}, R2, { meses: R2.meses.slice(1) })])));
ok('...y si falta una no hay total', grupoSumar([{ creditos:10, cartera:1, alDia:1, enMora:0, vencido:0 }, { error:'x' }]) === null && grupoSumar([null, null]) === null);

(async () => {
  // ══ 2. El servidor ══
  let lecturas = 0;
  const baseFalsa = (creds, pagos, plan, falla) => ({ collection(col) { return {
    get: async () => { lecturas++; if (falla) throw new Error('sin permiso para leer a JUAN PEREZ'); return { docs: (col === 'creditos' ? creds : col === 'pagos' ? pagos : []).map(o => ({ id: String(o.id), data: () => { const c = clon(o); if (col === 'pagos' || typeof o.id !== 'number') delete c.id; return c; } })) }; },
    doc() { return { get: async () => ({ exists: plan !== undefined, data: () => plan }) }; } }; } });
  const C26 = [base('Z1', { fecha: dia(-10) }), base('Z2', { fecha: dia(-70), pagado:1 })], P26 = [pago('Y1', 'Z2', 80, { fecha: dia(-50) })];
  const registros = [];
  const deps = (b18, b26) => ({ bases: { '18': b18, '26': b26 }, hoy: HOY, ahora: '2026-11-21T19:30:00.000Z', log: (q, d) => registros.push([q, d]) });
  grupo.olvidar();
  let r = await grupo.resumenGrupo(deps(baseFalsa(CREDS, PAGOS, { diasGracia: 5 }), baseFalsa(C26, P26, { gracia: 0 })), {});
  const e18 = grupoResumen(clon(CREDS), clon(PAGOS), { hoy: HOY, gracia: 5, ledger }), e26 = grupoResumen(clon(C26), clon(P26), { hoy: HOY, gracia: 0, ledger });
  const igual = (a, b) => ['creditos', 'cartera', 'alDia', 'enMora', 'vencido'].every(k => a[k] === b[k]);
  ok('el servidor responde las dos compañías con las mismas cuentas', igual(r.empresas['18'], e18) && igual(r.empresas['26'], e26) && r.empresas['18'].nombre === 'PAGASI 18' && r.empresas['26'].nombre === 'PAGASI 26');
  ok('...y las dos juntas son la suma', r.juntas.creditos === e18.creditos + e26.creditos && r.juntas.enMora === e18.enMora + e26.enMora && Math.abs(r.juntas.cartera - (e18.cartera + e26.cartera)) < 0.005 && Math.abs(r.juntas.vencido - (e18.vencido + e26.vencido)) < 0.005);
  ok('...dice de qué día y a qué hora se calculó', r.hoy === HOY && r.calculado === '2026-11-21T19:30:00.000Z');
  ok('cada compañía usa sus propios días de gracia (config/plan)', grupo.graciaDe({ exists:true, data: () => ({ diasGracia: 0 }) }) === 0 && grupo.graciaDe({ exists:true, data: () => ({ gracia: 7 }) }) === 7 && grupo.graciaDe({ exists:false }) === 5 && grupo.graciaDe({ exists:true, data: () => ({ diasGracia: null }) }) === 5);
  ok('lee créditos, pagos, concesionarios (para los nombres) y el plan de cada base: 6 colecciones en total', lecturas === 6);
  const texto = JSON.stringify(r);
  ok('en la respuesta solo van sumas: ni clientes, ni identificadores, ni pagos', !/CLIENTE|"cli"|"id"|"cred"|"P1"|Efectivo/.test(texto) && Object.keys(r).sort().join() === 'calculado,empresas,hoy,juntas' && Object.keys(r.empresas['18']).sort().join() === 'alDia,cartera,cobro,concesionarios,cosechas,creditos,dias,enMora,historico,meses,metodos,modelos,nombre,promedio,puntualidad,semana,tramos,vencido' && Object.keys(r.juntas).sort().join() === 'alDia,cartera,cobro,cosechas,creditos,dias,enMora,historico,meses,metodos,promedio,puntualidad,semana,tramos,vencido');
  ok('el registro del servidor tampoco lleva datos: solo cuánto tardó', registros.length === 1 && registros[0][0] === 'grupo' && Object.keys(registros[0][1]).sort().join() === 'completo,ms');
  // la memoria de un minuto
  r = await grupo.resumenGrupo(deps(baseFalsa([], [], {}), baseFalsa([], [], {})), {});
  ok('si se vuelve a pedir enseguida no se lee otra vez (un minuto de memoria)', lecturas === 6 && r.deMemoria === true && r.juntas.creditos === e18.creditos + e26.creditos);
  r = await grupo.resumenGrupo(deps(baseFalsa(C26, P26, {}), baseFalsa(C26, P26, {})), { fresco: true });
  ok('«Actualizar» sí vuelve a leer', lecturas === 12 && !r.deMemoria && r.juntas.creditos === 4);
  r = await grupo.resumenGrupo(Object.assign(deps(baseFalsa(CREDS, PAGOS, {}), baseFalsa(C26, P26, {})), { hoy: dia(1) }), {});
  ok('al cambiar el día la memoria no sirve', lecturas === 18 && !r.deMemoria && r.hoy === dia(1));
  ok('la memoria dura un minuto', grupo.VIGENCIA_MS === 60000);
  // una base que no responde
  grupo.olvidar(); registros.length = 0;
  r = await grupo.resumenGrupo(deps(baseFalsa(CREDS, PAGOS, {}, true), baseFalsa(C26, P26, {})), {});
  ok('si una compañía no se puede leer, la otra sale y no hay total', r.empresas['18'].error === 'No se pudo leer PAGASI 18' && r.empresas['26'].creditos === 2 && r.juntas === null);
  ok('...el error que ve el usuario no trae el detalle', !/JUAN PEREZ/.test(JSON.stringify(r)));
  const antes = lecturas; r = await grupo.resumenGrupo(deps(baseFalsa(CREDS, PAGOS, {}), baseFalsa(C26, P26, {})), {});
  ok('...y lo incompleto no se guarda en memoria: la próxima vuelve a leer', lecturas === antes + 6 && !r.deMemoria && !!r.juntas);
  // quién puede
  ok('lo ve un administrador o quien tenga el permiso «grupo»; nadie más', grupo.puedeVer({ admin:true, permisos:[] }) && grupo.puedeVer({ admin:false, permisos:['dash', 'grupo'] }) && !grupo.puedeVer({ admin:false, permisos:['dash', 'reportes'] }) && !grupo.puedeVer({ admin:false }) && !grupo.puedeVer(null));
  const idx = src('functions/index.js'), ruta = idx.slice(idx.indexOf("if (/\\/equipo\\/?$/.test(req.path || '')) {"), idx.indexOf("if (/\\/aliados\\/?$/.test(req.path || '')) {"));
  ok('la puerta del panel (/equipo) atiende «resumenGrupo» con la sesión del usuario', /const quien = await quienEscribe\(req\);\s*if \(!quien\) return res\.status\(401\)[^\n]*\n[\s\S]{0,400}accion === 'resumenGrupo'/.test(ruta));
  ok('...revisa el permiso antes de leer nada', /accion === 'resumenGrupo'\) \{\s*if \(!grupo\.puedeVer\(quien\)\) return res\.status\(403\)/.test(ruta) && ruta.indexOf('grupo.puedeVer(quien)') < ruta.indexOf('grupo.resumenGrupo('));
  ok('...con la fecha de Venezuela, y va antes de lo que manda mensajes', /grupo\.resumenGrupo\(\{ bases, hoy: hoyCaracas\(\)/.test(ruta) && ruta.indexOf("accion === 'resumenGrupo'") < ruta.indexOf("accion === 'vendedor'") && ruta.indexOf("accion === 'resumenGrupo'") < ruta.indexOf('procesar.enviarEquipo'));
  ok('al desplegar, las cuentas y el ledger viajan con el servidor', /cp logic\/whatsapp\.js logic\/credito-ledger\.js logic\/grupo-resumen\.js functions\/logic\//.test(src('firebase.json')) && /compartido\('grupo-resumen\.js'\)/.test(src('functions/lib/grupo.js')) && /compartido\('credito-ledger\.js'\)/.test(src('functions/lib/grupo.js')));
  ok('el panel no carga el archivo de las cuentas (solo lo usa el servidor)', !/grupo-resumen/.test(src('admin.html')));

  // ══ 3. La pantalla ══
  const app = src('assets/pagasi-app.js');
  ok('el módulo está en la lista (para dar el permiso en Usuarios), con su nombre', ctx.MODULOS.some(m => m.id === 'grupo' && m.label === 'PAGASI 18 + 26') && vm.runInContext('PGL.grupo', ctx) === 'PAGASI 18 + 26');
  ok('está en el menú, después del Dashboard, en computadora y en teléfono', (app.match(/keys:\['dash','grupo','centro','recursos'\]/g) || []).length === 2 && /label:'Finanzas',keys:\['grupo','reportes'/.test(src('logic/movil-navegacion.js')) && !!ctx.pgNavIcon('grupo'));
  ok('la página carga el módulo', /<script charset="utf-8" src="modules\/grupo\.js\?v=[^"]+"><\/script>/.test(src('admin.html')));
  const como = (rol, permisos) => { ctx.S.currentUser = { uid:'u-' + rol, nombre:'Prueba', rol, permisos: permisos || [] }; };
  como('Administrador'); const adm = ctx.hasModuleAccess('grupo');
  como('Gerente', ['dash', 'reportes']); const ger = ctx.hasModuleAccess('grupo');
  como('Gerente', ['dash', 'grupo']); const gerSi = ctx.hasModuleAccess('grupo');
  como('Empleado', ['dash', 'grupo']); const empSi = ctx.hasModuleAccess('grupo');
  como('Vendedor Concesionario', ['grupo']); const vc = ctx.hasModuleAccess('grupo');
  ok('lo ve el administrador; un gerente o empleado solo si se le da el permiso; un vendedor de concesionario nunca', adm && !ger && gerSi && empSi && !vc);
  ok('ningún rol lo trae de fábrica salvo Administrador', Object.keys(ctx.ROL_PERMISOS).filter(k => ctx.ROL_PERMISOS[k].includes('grupo')).join() === 'Administrador');

  // entrar al módulo
  const cola = []; ctx.setTimeout = f => { cola.push(f); return 1; };
  const pedidos = []; let respuesta = { status: 200, cuerpo: Object.assign({ ok: true }, clon(await grupo.resumenGrupo(deps(baseFalsa(CREDS, PAGOS, {}), baseFalsa(C26, P26, {})), { fresco: true }))) };
  ctx.fetch = (url, o) => { pedidos.push({ url, o }); const x = respuesta; return Promise.resolve({ ok: x.status === 200, status: x.status, json: () => x.cuerpo === 'roto' ? Promise.reject(new Error('no es json')) : Promise.resolve(x.cuerpo) }); };
  ctx.firebase = { auth: Object.assign(() => ({ currentUser: { getIdToken: () => Promise.resolve('ficha-de-sesion') } }), {}) };
  const cuerpoEl = { innerHTML: '' }, estadoEl = { textContent: '' };
  ctx.document.getElementById = id => id === 'g2-cuerpo' ? cuerpoEl : id === 'g2-estado' ? estadoEl : null;
  const correrCola = async () => { while (cola.length) cola.shift()(); for (let i = 0; i < 12; i++) await Promise.resolve(); };
  como('Administrador'); ctx.S.page = 'grupo'; ctx.window._rtRenderizando = false;
  let h = String(ctx.PG.grupo());
  ok('al entrar se ve el encabezado, el botón Actualizar y que está leyendo', /PAGASI 18 \+ 26/.test(h) && /onclick="grupoActualizar\(\)"/.test(h) && /Leyendo las dos compañías/.test(h) && pedidos.length === 0);
  await correrCola();
  ok('...y pide los números al servidor una vez, con la sesión del usuario', pedidos.length === 1 && /\/equipo$/.test(pedidos[0].url) && pedidos[0].o.method === 'POST' && pedidos[0].o.headers.authorization === 'Bearer ficha-de-sesion' && pedidos[0].o.body === JSON.stringify({ accion:'resumenGrupo', fresco:false }));
  const pant = cuerpoEl.innerHTML, J = respuesta.cuerpo.juntas, A = respuesta.cuerpo.empresas['18'], B = respuesta.cuerpo.empresas['26'];
  const num = n => Math.round(n).toLocaleString('es-VE');
  const bloque = emp => (pant.match(new RegExp('data-g2-emp="' + emp + '"[\\s\\S]*?(?=data-g2-emp="|class="g2-pie")')) || [''])[0];
  const cifra = (emp, k) => ((bloque(emp).match(new RegExp('data-g2="' + k + '">(.*?)</div>')) || [])[1] || '').replace(/<[^>]+>/g, '');
  ok('se ven las dos juntas: créditos, dinero en la calle, en mora y vencido', cifra('juntas', 'creditos') === num(J.creditos) && cifra('juntas', 'cartera') === ctx.fmt(J.cartera) && cifra('juntas', 'mora') === num(J.enMora) && cifra('juntas', 'vencido') === ctx.fmt(J.vencido));
  ok('...y cada compañía con sus mismas cuatro cifras', cifra('18', 'creditos') === num(A.creditos) && cifra('18', 'cartera') === ctx.fmt(A.cartera) && cifra('18', 'mora') === num(A.enMora) && cifra('26', 'creditos') === num(B.creditos) && cifra('26', 'cartera') === ctx.fmt(B.cartera) && cifra('26', 'vencido') === ctx.fmt(B.vencido));
  ok('...con cuánto pone cada una en el total', /Dinero en la calle<\/div><div class="g2-barra" role="img" aria-label="Dinero en la calle: PAGASI 18 [\d,]+%, PAGASI 26 [\d,]+%"/.test(pant) && (pant.slice(0, pant.indexOf('data-g2-sec=')).match(/class="g2-rep"/g) || []).length === 4);
  ok('...dice a qué hora se calculó (hora de Venezuela)', /^Calculado hoy a las 3:30/.test(estadoEl.textContent));
  ok('en la pantalla no hay nombres de clientes', !/CLIENTE /.test(pant));
  const seccion = k => (pant.match(new RegExp('data-g2-sec="' + k + '"[\\s\\S]*?(?=data-g2-sec="|class="g2-dos")')) || [''])[0];
  ok('se ve lo que entró: hoy, 7 días, este mes y el mes pasado completo, con su gráfico por mes', ['cobro-hoy', 'cobro-semana', 'cobro-mes', 'cobro-mes-pasado'].every(k => new RegExp('data-g2="' + k + '"').test(seccion('cobrado'))) && cifra('juntas', 'x') === '' && /Cobrado por mes/.test(seccion('cobrado')) && (seccion('cobrado').match(/class="g2-col( g2-col-hoy)?"/g) || []).length >= 3);
  const txtDe = (sec, k) => ((seccion(sec).match(new RegExp('data-g2="' + k + '">(.*?)</div>')) || [])[1] || '').replace(/<[^>]+>/g, '');
  ok('...con el número de este mes de las dos juntas', txtDe('cobrado', 'cobro-mes') === ctx.fmt(J.cobro.mes.cuotas + J.cobro.mes.iniciales));
  ok('se ven las motos vendidas por mes, la mora por días de atraso y lo que vence esta semana', /data-g2="ventas-mes">\d+</.test(seccion('ventas')) && (seccion('mora').match(/data-g2-tramo=/g) || []).length === 4 && txtDe('semana', 'semana-monto') === ctx.fmt(J.semana.monto));
  ok('cada compañía trae «Desde el principio»', /Desde el principio/.test(bloque('18')) && /data-g2="hist-vendidos">\d+</.test(bloque('26')) && /data-g2="hist-cobrado"/.test(bloque('18')));
  ok('se ven todos los gráficos nuevos: día por día, formas de pago, cuotas a tiempo, mora por mes de venta, venta promedio, concesionarios y modelos', ['dias', 'metodos', 'puntualidad', 'cosechas', 'promedio', 'conc', 'modelo'].every(k => new RegExp('data-g2-sec="' + k + '"').test(pant)) && (seccion('dias').match(/class="g2-col( g2-col-hoy)?"/g) || []).length === 30);
  ok('...con títulos de sección: Cobranza, Ventas y Cada compañía', /<div class="g2-titulo">Cobranza<\/div>/.test(pant) && /<div class="g2-titulo">Ventas<\/div>/.test(pant) && /<div class="g2-titulo">Cada compañía<\/div>/.test(pant));
  ok('...los concesionarios de las dos compañías se juntan por su clave', /data-g2-conc=/.test(pant) && (pant.match(/data-g2-conc="/g) || []).length === new Set([].concat(A.concesionarios, B.concesionarios).map(x => x.conc.toUpperCase())).size);
  ok('el mes de hoy va resaltado en los gráficos y dice que va hasta hoy', /class="g2-col g2-col-hoy" title="[^"]*\(hasta hoy\)/.test(seccion('cobrado')));
  // un servidor de antes (sin lo nuevo) no rompe la pantalla: se ve lo básico
  respuesta = { status: 200, cuerpo: { ok: true, hoy: HOY, calculado: '2026-11-21T19:30:00.000Z', empresas: { '18': Object.assign({ nombre:'PAGASI 18' }, { creditos:3, cartera:10, alDia:3, enMora:0, vencido:0 }), '26': Object.assign({ nombre:'PAGASI 26' }, { creditos:2, cartera:5, alDia:2, enMora:0, vencido:0 }) }, juntas: { creditos:5, cartera:15, alDia:5, enMora:0, vencido:0 } } };
  await ctx.grupoActualizar();
  ok('con un servidor de antes (sin lo nuevo) se ve lo básico y nada más', /data-g2="creditos">5</.test(cuerpoEl.innerHTML) && !/data-g2-sec=/.test(cuerpoEl.innerHTML) && !/Desde el principio/.test(cuerpoEl.innerHTML));
  respuesta = { status: 200, cuerpo: Object.assign({ ok: true }, clon(await grupo.resumenGrupo(deps(baseFalsa(CREDS, PAGOS, {}), baseFalsa(C26, P26, {})), { fresco: true }))) };
  await ctx.grupoActualizar(); pedidos.length = 1;
  // un redibujo automático no vuelve a pedir
  ctx.window._rtRenderizando = true; h = String(ctx.PG.grupo()); await correrCola(); ctx.window._rtRenderizando = false;
  ok('un redibujo automático muestra lo que ya hay y NO vuelve a pedir', pedidos.length === 1 && /data-g2="creditos"/.test(h));
  // volver a entrar sí
  h = String(ctx.PG.grupo());
  ok('al volver a entrar se ven los números de antes mientras llegan los nuevos', /data-g2="creditos"/.test(h));
  await correrCola();
  ok('...y se piden otra vez', pedidos.length === 2);
  // Actualizar
  let pr = ctx.grupoActualizar(); const pr2 = ctx.grupoPedir(false);
  ok('mientras está pidiendo se avisa, y un segundo toque no dispara otra llamada', /Actualizando…/.test(estadoEl.textContent) && /g2-viejo/.test(cuerpoEl.innerHTML) && pr === pr2);
  await pr; await correrCola();
  ok('«Actualizar» pide los números recién leídos (sin la memoria del servidor)', pedidos.length === 3 && pedidos[2].o.body === JSON.stringify({ accion:'resumenGrupo', fresco:true }) && !/g2-viejo/.test(cuerpoEl.innerHTML));
  // errores
  respuesta = { status: 500, cuerpo: { error: 'No se pudo calcular: detalle interno' } };
  await ctx.grupoActualizar();
  ok('si el servidor falla se dice en sencillo y se dejan los números de la última vez', /No se pudieron calcular los números en este momento/.test(cuerpoEl.innerHTML) && !/detalle interno/.test(cuerpoEl.innerHTML) && /Abajo están los números de la última vez/.test(cuerpoEl.innerHTML) && /data-g2="creditos"/.test(cuerpoEl.innerHTML));
  vm.runInContext('_grupo.datos = null;', ctx);
  respuesta = { status: 200, cuerpo: { ok: true, metaId: 'x' } };
  await ctx.grupoActualizar();
  ok('si el servidor todavía no conoce el módulo (respuesta sin números), se avisa y se ofrece reintentar', /No se pudieron calcular/.test(cuerpoEl.innerHTML) && /Intentar otra vez/.test(cuerpoEl.innerHTML) && !/data-g2="creditos"/.test(cuerpoEl.innerHTML));
  respuesta = { status: 403, cuerpo: { error: 'No tienes acceso a PAGASI 18 + 26', codigo: 'permiso' } };
  await ctx.grupoActualizar();
  ok('si el servidor dice que no tiene permiso, se le dice eso', /No tienes acceso a este módulo\./.test(cuerpoEl.innerHTML));
  respuesta = { status: 502, cuerpo: 'roto' };
  await ctx.grupoActualizar();
  ok('una respuesta que no se entiende no rompe la pantalla', /No se pudieron calcular/.test(cuerpoEl.innerHTML));
  // una compañía sin leer
  respuesta = { status: 200, cuerpo: { ok: true, hoy: HOY, calculado: '2026-11-21T19:30:00.000Z', empresas: { '18': { nombre:'PAGASI 18', error:'No se pudo leer PAGASI 18' }, '26': Object.assign({ nombre:'PAGASI 26' }, e26) }, juntas: null } };
  await ctx.grupoActualizar();
  ok('si falta una compañía: se ve la otra, se dice cuál falta y no se inventa un total', /Falta una de las dos compañías/.test(cuerpoEl.innerHTML) && /No se pudo leer esta compañía/.test(bloque2(cuerpoEl.innerHTML, '18')) && /data-g2="creditos">2</.test(bloque2(cuerpoEl.innerHTML, '26')) && !/data-g2-emp="juntas"/.test(cuerpoEl.innerHTML));
  // sin sesión y sin acceso
  ctx.firebase = { auth: () => ({ currentUser: null }) }; vm.runInContext('_grupo.datos = null;', ctx);
  await ctx.grupoActualizar();
  ok('sin sesión no llama al servidor', pedidos.length === 8 && /Sin sesión/.test(cuerpoEl.innerHTML));
  como('Gerente', ['dash']); cola.length = 0;
  h = String(ctx.PG.grupo()); await correrCola();
  ok('quien no tiene el permiso no ve nada ni dispara la consulta', /No tienes acceso a PAGASI 18 \+ 26/.test(h) && pedidos.length === 8);
  // fuera del módulo no se pinta
  como('Administrador'); ctx.S.page = 'dash'; cuerpoEl.innerHTML = 'OTRA PANTALLA'; ctx.firebase = { auth: () => ({ currentUser: { getIdToken: () => Promise.resolve('t') } }) };
  respuesta = { status: 200, cuerpo: Object.assign({ ok: true }, clon(await grupo.resumenGrupo(deps(baseFalsa(CREDS, PAGOS, {}), baseFalsa(C26, P26, {})), { fresco: true }))) };
  await ctx.grupoPedir(false);
  ok('si la respuesta llega cuando ya se salió del módulo, no pisa la otra pantalla', cuerpoEl.innerHTML === 'OTRA PANTALLA');
  const css = src('assets/pagasi.css');
  ok('los estilos de lo nuevo existen y en teléfono todo va en una columna', /\.g2-tres\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(src('assets/pagasi.css')) && /@media \(max-width:760px\)\{\.g2-tres\{grid-template-columns:minmax\(0,1fr\)\}/.test(src('assets/pagasi.css')) && /@media \(max-width:1180px\)\{\.g2-cobro\{grid-template-columns:minmax\(0,1fr\)\}/.test(src('assets/pagasi.css')));
  ok('los estilos existen y en teléfono las compañías van una debajo de la otra', /\.g2-dos\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(css) && /@media \(max-width:720px\)\{\.g2-dos\{grid-template-columns:minmax\(0,1fr\)\}/.test(css));

  console.log('\n' + pass + ' OK · ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
function bloque2(pant, emp){ return (pant.match(new RegExp('data-g2-emp="' + emp + '"[\\s\\S]*?(?=data-g2-emp="|class="g2-pie")')) || [''])[0]; }
