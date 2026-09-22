// Punto 17 de la lista del 18-sep-2026: Reportes contaba como gasto la inicial que el
// cliente paga en la tienda (queda registrada como un egreso de compra de moto, pero no
// sale de Pagasi: entra tambien como ingreso), y el P&L imprimible sumaba las iniciales
// DOS veces como ingreso (una por movimientos y otra por los pagos).
// El dashboard ya lo hacia bien desde el 17-sep; aqui se pone igual.
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
ctx.toast = function(){}; ctx.nav = function(){};

let impreso = '';
ctx.open = function(){ return { document: { open(){}, write(h){ impreso += h; }, close(){} } }; };
ctx._abrirVentanaImpresion = function(t, h){ impreso = h; };

// Una moto de $1.000: el cliente paga $300 de inicial en la tienda y Pagasi manda $700.
// En la base quedaron DOS egresos de compra: uno de $700 y otro de $300 (la inicial).
const hoy = new Date(), p2 = n => String(n).padStart(2, '0');
const fecha = hoy.getFullYear() + '-' + p2(hoy.getMonth() + 1) + '-' + p2(hoy.getDate());
ctx.S.currentUser = { uid: 'u1', nombre: 'Prueba', rol: 'Administrador' };
ctx.S.clientes = [{ id: 'CLI-1', nombre: 'CLIENTE UNO' }];
ctx.S.motos = [{ id: 1, modelo: 'MOTO', precio: 1000, estado: 'financiada' }];
ctx.S.creds = [{ id: 'CRED-001', cli: 'CLIENTE UNO', clienteId: 'CLI-1', motoId: 1, estado: 'activo', fecha: fecha,
  precio: 1000, ini: 300, fin: 700, cuotaQ: 50, totalCuotas: 24, pagado: 1, mora: 0 }];
ctx.S.pagos = [
  { id: 'PAG-INI', cred: 'CRED-001', cli: 'CLIENTE UNO', fecha: fecha, monto: 300, estado: 'confirmado', esInicial: true, tipoOperacion: 'inicial_credito', metodo: 'Binance' },
  { id: 'PAG-1', cred: 'CRED-001', cli: 'CLIENTE UNO', fecha: fecha, monto: 50, estado: 'confirmado', metodo: 'Binance' },
];
ctx.S.movimientos = [{ id: 'MOV-INI', tipo: 'deposito', tipoOperacion: 'inicial_credito', conceptoPago: 'PAG-INI', creditoId: 'CRED-001', monto: 300, cuentaDestino: 'Binance', fecha: fecha }];
ctx.S.egresos = [
  { id: 1, concepto: 'Compra de moto · MOTO (Moto #1)', monto: 700, fecha: fecha, categoria: 'inventario', forma: 'Binance', motoIdRef: 1, origenAuto: 'compra_moto', eliminado: false },
  { id: 2, concepto: 'Compra de moto · MOTO (Moto #1) (parte 2/2)', monto: 300, fecha: fecha, categoria: 'inventario', forma: 'Binance', motoIdRef: 1, origenAuto: 'compra_moto', eliminado: false },
  { id: 3, concepto: 'Alquiler', monto: 100, fecha: fecha, categoria: 'operativos', forma: 'Binance', eliminado: false },
];

// ── Pantalla de Reportes ──
ctx.S.page = 'reportes'; ctx.S.reportesTab = 'resumen';
const h = String(ctx.PG.reportes());
const num = t => { const m = h.match(new RegExp('<b>[$]([0-9.,]+)</b> ' + t)); return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : null; };
ok('Reportes: los egresos ya no cuentan la inicial ($800, no $1.100)', num('egresos') === 800);
ok('Reportes: los ingresos siguen siendo cuotas + inicial ($350)', num('ingresos') === 350);
ok('Reportes: la utilidad sale de esos dos ($350 − $800 = −$450)', h.indexOf('Utilidad: <b>$-450,00</b>') > -1);
ctx.S.reportesTab = 'egresos';
const he = String(ctx.PG.reportes());
ok('la pestaña Egresos avisa cuánto se dejó fuera por iniciales', /sin \$300.*de iniciales|\$300,00 son iniciales/.test(he));
ok('la inicial se sigue viendo en el historial, marcada', he.indexOf('inicial del cliente · no es salida') > -1);
ok('el historial sigue mostrando los 3 egresos', (he.match(/Compra de moto|Alquiler/g) || []).length >= 3);

// ── P&L imprimible ──
impreso = '';
ctx.generarReporte('pyl');
const pnum = t => { const m = impreso.match(new RegExp('<div class="stat-v"[^>]*>[$]([0-9.]+)</div><div class="stat-l">' + t)); return m ? parseFloat(m[1]) : null; };
ok('P&L: ingresos $350 (antes contaba la inicial dos veces: $650)', pnum('Ingresos totales') === 350);
ok('P&L: egresos $800, sin la inicial', pnum('Egresos totales') === 800);
ok('P&L: la utilidad cuadra con ingresos − egresos', /UTILIDAD NETA<\/td><td>\$-450\.00</.test(impreso));
ok('P&L: la fila de iniciales cobradas sigue estando', impreso.indexOf('Iniciales cobradas</td><td>$300.00') > -1);
ok('P&L: las cuotas van aparte', impreso.indexOf('Pagos de cuotas</td><td>$50.00') > -1);
ok('P&L: explica las iniciales que no son salida', impreso.indexOf('no son salida de Pagasi') > -1);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
