// Créditos: la pantalla cuenta la mora IGUAL que el dashboard (Adam, 14-sep-2026:
// "en dashboard dice 1 número... los números de la tarjeta dan distintos").
// El sistema le pone estado 'mora' a un crédito cuando pasa los días de gracia.
// Esta pantalla solo contaba estado 'activo', así que los más atrasados no salían
// ni en Activos ni en En mora: 524 y 26 aquí contra 556 y 58 en el dashboard.
// También: en la pestaña "En mora" el más atrasado va arriba, y el globito de
// Cobranza se refresca al recalcular la mora. Se evalúa el app completo en un VM
// limpio, como t_creditos_orden.
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
const globo = elemento();   // el globito rojo de Cobranza en el menú (sb-badge-cob)
const doc = {
  getElementById(id){ return id === 'sb-badge-cob' ? globo : elemento(); }, querySelector(){ return elemento(); }, querySelectorAll(){ return []; },
  createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){},
};
let avisosDelDia = 0;   // veces que se marcó el aviso "entraron en mora hoy"
const ctx = {
  console: { log(){}, warn(){}, error(){} },
  setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
  document: doc, navigator: { userAgent: 'node', language: 'es' },
  location: { href: 'https://pagasi.io/admin.html', search: '', hash: '', pathname: '/admin.html' },
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  sessionStorage: { getItem(){ return null; }, setItem(k){ if (/pagasi_mora_alert_/.test(k)) avisosDelDia++; }, removeItem(){} },
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
const cred = (n, estado, mora, extra) => Object.assign({ id: 'CRED-' + n, cli: 'CLIENTE ' + n, modelo: 'MOTO', estado: estado, fecha: dia(0),
  total: 1200, precio: 1000, cuotaQ: 50, plazo: 12, totalCuotas: 24, pagado: 0, mora: mora, eliminado: false, contratoFirmado: true }, extra || {});
ctx.S.currentUser = { uid: 'u1', nombre: 'Prueba', rol: 'Administrador', email: 't@pagasi.io' };
ctx.S.page = 'creditos';
ctx.S.clientes = []; ctx.S.pagos = []; ctx.S.motos = []; ctx.S.concesionarios = []; ctx.S.egresos = [];
// Los días de mora NO van en el mismo orden que el número del crédito, para que el orden
// por mora se distinga del orden por ID.
const CARTERA = [
  cred('101', 'activo', 0), cred('102', 'activo', 0), cred('103', 'activo', 0),      // al día
  cred('104', 'activo', 3), cred('105', 'activo', 5),                                // atrasados dentro de la gracia
  cred('106', 'mora', 70), cred('107', 'mora', 8), cred('108', 'mora', 45), cred('109', 'mora', 20), // pasaron la gracia
  cred('110', 'completado', 0), cred('111', 'cancelado', 0),
  cred('112', 'mora', 30, { eliminado: true }),                                      // borrado: no cuenta en nada
];
ctx.S.creds = CARTERA;

// Lectores del HTML que pinta la pantalla
const tarjeta = (h, label) => { const m = h.match(new RegExp(label + '<\\/div>\\s*<div[^>]*>(\\d+)<\\/div>')); return m ? +m[1] : null; };
const pestana = (h, label) => { const m = h.match(new RegExp(label + ' <span[^>]*>(\\d+)<\\/span>')); return m ? +m[1] : null; };
// Posición dentro de la TABLA (los cuadros "Top clientes" y "Por modelo" también nombran créditos)
const posicion = (h, id) => { const t = h.slice(h.indexOf('<tbody>'), h.indexOf('</tbody>')); const i = t.indexOf('>' + id + '<'); return i < 0 ? -1 : h.indexOf('<tbody>') + i; };
const enOrden = (h, ids) => { const p = ids.map(id => posicion(h, id)); return p.every(x => x > 0) && p.every((x, i) => i === 0 || p[i - 1] < x); };
// La flecha del orden: el encabezado que ordena por esa columna lleva ↓ o ↑
const flechaEn = (h, col) => { const m = h.match(new RegExp("<th onclick=\"setCredSort\\('" + col + "'\\)\"[^>]*>[^<]*<span[^>]*>([↓↑])<\\/span>")); return m ? m[1] : ''; };

// ── Tarjetas y pestañas: como el dashboard ──
ctx.S.credTab = 'todos'; ctx.S.credSort = { col: 'id', dir: 'desc' };
let h = String(ctx.PG.creditos());
ok('Total creados: 11 (el borrado no cuenta)', tarjeta(h, 'Total creados') === 11);
ok('encabezado: 10 créditos (sin el cancelado)', /<b>10<\/b> créditos · Valor total/.test(h));
ok('Activos: 9 = 5 con estado activo + 4 con estado mora', tarjeta(h, 'Activos') === 9);
ok('En mora: 6 = 2 dentro de la gracia + 4 que la pasaron', tarjeta(h, 'En mora') === 6);
ok('3 al día', /\b3 al día/.test(h));
ok('Completados: 1 · Archivados: 1', tarjeta(h, 'Completados') === 1 && tarjeta(h, 'Archivados') === 1);
ok('banner: "9 créditos activos · 6 en mora (67%)"', /9 créditos activos · <strong[^>]*>6 en mora \(67%\)/.test(h));
ok('cartera viva por cobrar a 9 clientes (incluye los de estado mora)', /por cobrar a 9 clientes/.test(h));
const saldo9 = CARTERA.filter(c => !c.eliminado && (c.estado === 'activo' || c.estado === 'mora')).reduce((a, c) => a + ctx.getCreditoSaldoPendiente(c), 0);
ok('cartera viva suma el saldo de los 9', h.indexOf('>' + ctx.fmt(saldo9) + '<') > -1);
ok('pestañas: Todos 10 · Activos 9 · En mora 6 · Completados 1 · Archivados 1',
  pestana(h, 'Todos') === 10 && pestana(h, 'Activos') === 9 && pestana(h, 'En mora') === 6 && pestana(h, 'Completados') === 1 && pestana(h, 'Archivados') === 1);
ok('la pestaña Todos lista los de estado mora y sigue con el más nuevo arriba', enOrden(h, ['CRED-110', 'CRED-109', 'CRED-106', 'CRED-101']));

// ── El dashboard dice lo MISMO con los mismos datos (la queja de Adam) ──
ctx.S.page = 'dash';
const hd = String(ctx.PG.dash());
// Desde el 17-sep las tarjetas de arriba marcan sus numeros con data-kpi (diseno nuevo)
const dash = (k) => { const m = hd.match(new RegExp('data-kpi="' + k + '">(\\d+)<')); return m ? +m[1] : null; };
ok('dashboard: 9 créditos activos en cartera', dash('activos') === 9);
ok('dashboard: Al día 3 · En mora 6, igual que Créditos', dash('aldia') === 3 && dash('mora') === 6);
const carteraDash = ((hd.match(/data-kpi="cartera">(.*?)<\/div>/) || [])[1] || '').replace(/<[^>]+>/g, '');
ok('cartera activa del dashboard = cartera viva de Créditos', carteraDash === ctx.fmt(saldo9));
ctx.S.page = 'creditos';

// ── El globito del menú cuenta lo mismo (6) y al armar el menú sí avisa de los nuevos en mora ──
globo.textContent = ''; avisosDelDia = 0;
ctx.actualizarBadgeMora();
ok('globito de Cobranza: 6, como las dos pantallas', String(globo.textContent) === '6' && globo.style.display === 'flex');
ok('al armar el menú se marca el aviso "entraron en mora hoy" (CRED-104 con 3 días)', avisosDelDia === 1);

// ── Pestaña Activos: ahora también lista los de estado mora ──
ctx.S.credTab = 'activos';
h = String(ctx.PG.creditos());
ok('Activos lista CRED-106..109 (estado mora) y no el completado', ['CRED-106', 'CRED-107', 'CRED-108', 'CRED-109'].every(id => posicion(h, id) > 0) && posicion(h, 'CRED-110') < 0);

// ── Pestaña En mora: el más atrasado arriba ──
ctx.S.credSort = { col: 'id', dir: 'desc' };
ctx.setCredTab('mora');
ok('entrar a En mora pone el orden por días de mora, de mayor a menor', ctx.S.credTab === 'mora' && ctx.S.credSort.col === 'mora' && ctx.S.credSort.dir === 'desc');
h = String(ctx.PG.creditos());
ok('En mora lista solo los 6 atrasados', enOrden(h, ['CRED-106']) && posicion(h, 'CRED-101') < 0 && posicion(h, 'CRED-110') < 0);
ok('orden: 70d (106), 45d (108), 20d (109), 8d (107), 5d (105), 3d (104)', enOrden(h, ['CRED-106', 'CRED-108', 'CRED-109', 'CRED-107', 'CRED-105', 'CRED-104']));
ok('la flecha del orden sale en la columna Mora', flechaEn(h, 'mora') === '↓' && flechaEn(h, 'id') === '');
ctx.setCredSort('id');
h = String(ctx.PG.creditos());
ok('tocar ID: por ID ascendente (104 arriba)', enOrden(h, ['CRED-104', 'CRED-105', 'CRED-106', 'CRED-109']) && flechaEn(h, 'id') === '↑');
ctx.setCredSort('id');
h = String(ctx.PG.creditos());
ok('tocar ID otra vez: por ID descendente (109 arriba); sí se puede en esta pestaña', enOrden(h, ['CRED-109', 'CRED-108', 'CRED-105', 'CRED-104']) && flechaEn(h, 'id') === '↓');
ctx.setCredTab('mora');
ctx.setCredTab('todos');
ok('al salir de En mora vuelve el más nuevo arriba', ctx.S.credSort.col === 'id' && ctx.S.credSort.dir === 'desc');
ctx.setCredTab('mora'); ctx.setCredSort('cli');
ctx.setCredTab('activos');
ok('un orden elegido por el usuario (cliente) se conserva al cambiar de pestaña, como antes', ctx.S.credSort.col === 'cli');

// ── El globito de Cobranza se refresca al recalcular la mora (sin repetir el aviso del día) ──
// calcularMoraAuto vuelve a sacar los días de atraso desde la fecha y las cuotas pagadas
// (1 cuota cada 15 días). Se aceptan ±1 día por el cambio de hora de otros países.
ctx.S.creds = [
  cred('201', 'activo', 0, { fecha: dia(-60) }),   // 1ª cuota venció hace ~45 días: pasa a estado mora
  cred('202', 'activo', 0, { fecha: dia(0) }),     // vence en 15 días: al día
  cred('203', 'activo', 0, { fecha: dia(-19) }),   // venció hace ~4 días: dentro de la gracia, pero atrasado
  cred('204', 'activo', 0, { fecha: dia(-60), pagado: 24 }), // todo pagado: completado
  cred('205', 'activo', 0, { fecha: dia(-60), eliminado: true }),
];
globo.textContent = '60'; globo.style.display = 'flex'; avisosDelDia = 0;
ctx.calcularMoraAuto();
const c201 = ctx.S.creds[0], c203 = ctx.S.creds[2];
ok('calcularMoraAuto: CRED-201 queda en estado mora (~45 días) y CRED-203 activo con pocos días',
  c201.estado === 'mora' && c201.mora >= 44 && c201.mora <= 45 && c203.estado === 'activo' && c203.mora >= 3 && c203.mora <= 4);
// (el app asigna un número a textContent; el navegador lo vuelve texto)
ok('el globito pasa de 60 a 2 (los dos atrasados)', String(globo.textContent) === '2' && globo.style.display === 'flex');
ok('recalcular la mora NO dispara el aviso "entraron en mora hoy" (eso es solo al armar el menú)', avisosDelDia === 0);
ctx.S.creds[0].pagado = 24;
ctx.calcularMoraAuto();
ok('al pagar CRED-201 el globito baja a 1', String(globo.textContent) === '1');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
