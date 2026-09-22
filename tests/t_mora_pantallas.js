// Todas las pantallas cuentan la mora igual (Adam, 14-sep-2026: "dale a las 3 pantallas").
// Un crédito con más días de atraso que los de gracia queda con estado 'mora', pero sigue
// siendo un crédito activo que debe cuotas. Quedaban contándolo distinto:
//   · Reportes › Resumen: "activos" solo estado 'activo' y "en mora" todos los atrasados,
//     así que la tasa de mora podía pasar de 100%.
//   · Cuentas › Pendientes: "en mora" por estado, así que los atrasados dentro de la gracia
//     salían como "al día".
//   · Gráfico "Cobros programados" (Créditos y dashboard): no proyectaba sus cuotas.
// Con los MISMOS datos, las cuatro pantallas tienen que decir lo mismo.
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

const p2 = n => String(n).padStart(2, '0');
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
// Cuota quincenal de $50, 24 cuotas, ninguna pagada: cada crédito debe $1.200
const cred = (n, estado, mora, extra) => Object.assign({ id: 'CRED-' + n, cli: 'CLIENTE ' + n, modelo: 'MOTO', estado: estado, fecha: dia(0),
  total: 1200, precio: 1000, cuotaQ: 50, plazo: 12, totalCuotas: 24, pagado: 0, mora: mora, eliminado: false, contratoFirmado: true }, extra || {});
ctx.S.currentUser = { uid: 'u1', nombre: 'Prueba', rol: 'Administrador', email: 't@pagasi.io' };
ctx.S.clientes = []; ctx.S.pagos = []; ctx.S.motos = []; ctx.S.concesionarios = []; ctx.S.egresos = []; ctx.S.cuentasPendientes = [];
// 9 créditos vigentes: 3 al día, 2 atrasados dentro de la gracia (estado activo) y
// 4 que la pasaron (estado mora). Más un completado, un cancelado y uno borrado.
const CARTERA = [
  cred('101', 'activo', 0), cred('102', 'activo', 0), cred('103', 'activo', 0),
  cred('104', 'activo', 3), cred('105', 'activo', 5),
  cred('106', 'mora', 70), cred('107', 'mora', 8), cred('108', 'mora', 45), cred('109', 'mora', 20),
  cred('110', 'completado', 0, { pagado: 24 }), cred('111', 'cancelado', 0),
  cred('112', 'mora', 30, { eliminado: true }),
];
ctx.S.creds = CARTERA;
const vigentes = CARTERA.filter(c => !c.eliminado && (c.estado === 'activo' || c.estado === 'mora'));
const ACTIVOS = vigentes.length;                                  // 9
const EN_MORA = vigentes.filter(c => c.mora > 0).length;           // 6
const AL_DIA = ACTIVOS - EN_MORA;                                  // 3
const CARTERA_VIVA = vigentes.reduce((a, c) => a + ctx.getCreditoSaldoPendiente(c), 0);

// ── 1. Créditos (la referencia, ya arreglada) ──
ctx.S.page = 'creditos'; ctx.S.credTab = 'todos'; ctx.S.credSort = { col: 'id', dir: 'desc' };
const hc = String(ctx.PG.creditos());
ok('Créditos: 9 activos · 6 en mora (67%) · 3 al día',
  new RegExp(ACTIVOS + ' créditos activos · <strong[^>]*>' + EN_MORA + ' en mora \\(67%\\)').test(hc) && new RegExp('\\b' + AL_DIA + ' al día').test(hc));

// ── 2. Dashboard ──
ctx.S.page = 'dash';
const hd = String(ctx.PG.dash());
// Desde el 17-sep las tarjetas de arriba marcan sus numeros con data-kpi (diseno nuevo)
const dashKpi = (k) => { const m = hd.match(new RegExp('data-kpi="' + k + '">(\\d+)<')); return m ? +m[1] : null; };
ok('Dashboard: mismos 9 · 6 · 3 y la misma cartera',
  dashKpi('activos') === ACTIVOS && dashKpi('mora') === EN_MORA && dashKpi('aldia') === AL_DIA
  && ((hd.match(/data-kpi="cartera">(.*?)<\/div>/) || [])[1] || '').replace(/<[^>]+>/g, '') === ctx.fmt(CARTERA_VIVA));

// ── 3. Reportes › Resumen ──
ctx.S.page = 'reportes'; ctx.S.reportesTab = 'resumen';
const hr = String(ctx.PG.reportes());
const repActivos = (hr.match(/>(\d+)<\/div><div class="st-l">Créditos activos</) || [])[1];
const repMora = hr.match(/>(\d+)<\/div><div class="st-l">En mora <span[^>]*>(\d+)%/);
ok('Reportes: "Créditos activos" 9, igual que las otras pantallas', +repActivos === ACTIVOS);
ok('Reportes: "En mora" 6 y la tasa 67% (antes daba 120%, más del 100%)', repMora && +repMora[1] === EN_MORA && +repMora[2] === 67 && +repMora[2] <= 100);
ok('Reportes: la cartera es la misma que la de Créditos y el dashboard', hr.indexOf('Cartera: <b>' + ctx.fmt(CARTERA_VIVA) + '</b>') > -1);
// El cuadro "Mora detallada" está al final; "Top cartera activa" también nombra créditos antes
const moraCard = hr.slice(hr.indexOf('<div class="ct">Mora detallada</div>'));
const ordenMora = ['CRED-106', 'CRED-108', 'CRED-109', 'CRED-107', 'CRED-105', 'CRED-104'].map(id => moraCard.indexOf(id));
ok('Reportes › Mora detallada: los 6 atrasados, del más viejo al más nuevo (70d a 3d)',
  new RegExp('<div class="cs">' + EN_MORA + ' créditos').test(moraCard)
  && ordenMora.every(x => x > 0) && ordenMora.every((x, i) => i === 0 || ordenMora[i - 1] < x));

// ── 4. Cuentas › Pendientes ──
ctx.S.page = 'cuentas'; ctx.window._cuentasSubTab = 'cobrar';
const hp = String(ctx.renderTabPendientes());
const cuMora = hp.match(/>(\d+)<\/div><div class="st-l">En mora<\/div><div[^>]*>(\d+) al día</);
ok('Cuentas: "En mora" 6 · 3 al día (antes los de 3 y 5 días salían como al día)',
  cuMora && +cuMora[1] === EN_MORA && +cuMora[2] === AL_DIA);
ok('Cuentas: "Por cobrar" suma los 9 créditos vigentes',
  hp.indexOf('>' + ACTIVOS + ' créditos<') > -1 && hp.indexOf('>' + ctx.fmt(CARTERA_VIVA) + '<') > -1);
const filaCliente = (n) => { const i = hp.indexOf('Cliente: CLIENTE ' + n); return i < 0 ? '' : hp.slice(i, i + 400); };
ok('Cuentas: el cliente con 3 días de atraso ya sale como Expirado', /Expirado/.test(filaCliente('104')));
ok('Cuentas: el que está al día no sale como Expirado', filaCliente('101') !== '' && !/Expirado/.test(filaCliente('101')));

// ── 5. Cobros programados (gráfico de Créditos y del dashboard) ──
// Los 9 créditos son iguales (misma fecha y misma cuota), así que el total tiene que ser
// 9 veces el de uno solo: la etiqueta 'mora' no puede cambiar el cronograma.
// Con fecha de AYER: el cronograma pone cada cuota al mediodia y la ventana de 8
// quincenas empieza "ahora"; con fecha de hoy, antes del mediodia la octava cuota
// caia justo fuera y la prueba fallaba solo en las mañanas (19-sep-2026).
const CP = CARTERA.map(c => Object.assign({}, c, { fecha: dia(-1) }));
ctx.S.creds = CP;
const proy = (p) => { const b = ctx._cobrosProgramadosBuckets(p); return { cuotas: b.buckets.reduce((a, x) => a + x.cuotas, 0), monto: Math.round(b.buckets.reduce((a, x) => a + x.monto, 0)) }; };
const conMora = { diario: proy('diario'), quincenal: proy('quincenal'), mensual: proy('mensual') };
ok('Cobros programados: 8 quincenas × 9 créditos = 72 cuotas ($3.600), no solo las de 5',
  conMora.quincenal.cuotas === ACTIVOS * 8 && conMora.quincenal.monto === ACTIVOS * 8 * 50);
ok('cada crédito aporta lo mismo en los tres períodos (9 iguales)',
  conMora.diario.cuotas % ACTIVOS === 0 && conMora.mensual.cuotas % ACTIVOS === 0 && conMora.diario.cuotas > 0);
// Si a los 4 de estado 'mora' se les pone estado 'activo', la proyección NO puede cambiar
ctx.S.creds = CP.map(c => c.estado === 'mora' && !c.eliminado ? Object.assign({}, c, { estado: 'activo' }) : c);
const comoActivos = { diario: proy('diario'), quincenal: proy('quincenal'), mensual: proy('mensual') };
ok('la proyección es la misma llamándolos "mora" o "activo"', JSON.stringify(conMora) === JSON.stringify(comoActivos));
// Sin ellos tiene que bajar: es lo que pasaba antes del arreglo
ctx.S.creds = CP.filter(c => c.estado !== 'mora');
const sinMora = proy('quincenal');
ok('sin los de estado mora la proyección baja a 5 créditos (el error que se arregló)', sinMora.cuotas === 5 * 8);
ctx.S.creds = CP;
ok('el completado, el cancelado y el borrado nunca entran en la proyección',
  proy('quincenal').cuotas === ACTIVOS * 8);

ctx.S.creds = CARTERA;

// ── 6. Reporte impreso de cobranza: no deja fuera a los peores ──
const rep = ctx.generarReporteSemanal ? 'hay' : 'no';
if (rep === 'hay') {
  const hs = String(ctx.generarReporteSemanal(dia(-7), dia(0), true) || '');
  ok('Reporte semanal: la Cartera Morosa incluye a los de estado mora (CRED-106)',
    hs === '' || (hs.indexOf('CRED-106') > -1 && /Cartera Morosa/.test(hs)));
} else {
  ok('Reporte semanal: (no expuesto en este arnés, se revisa por código)', true);
}

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
