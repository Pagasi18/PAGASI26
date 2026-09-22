// Créditos: por defecto la lista muestra el crédito MÁS NUEVO arriba (Adam,
// 11-sep-2026: "quiero que por default aparezca el más nuevo"). El orden por
// ID es numérico, así que CRED-1000 va antes que CRED-549. Se evalúa el app
// completo en un VM limpio, como t_render.
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

const HOY = '2026-09-11';
const cred = (n) => ({ id: 'CRED-' + n, cli: 'CLIENTE ' + n, modelo: 'MOTO', estado: 'activo', fecha: HOY, total: 1200, precio: 1000,
  cuotaQ: 50, plazo: 12, totalCuotas: 24, pagado: 0, mora: 0, eliminado: false, contratoFirmado: true });
ctx.S.currentUser = { uid: 'u1', nombre: 'Prueba', rol: 'Administrador', email: 't@pagasi.io' };
ctx.S.page = 'creditos';
ctx.S.creds = [cred('001'), cred('1000'), cred('549'), cred('012')];
ctx.S.clientes = []; ctx.S.pagos = []; ctx.S.motos = []; ctx.S.concesionarios = [];

const orden = h => ['CRED-1000', 'CRED-549', 'CRED-012', 'CRED-001'].map(id => h.indexOf('>' + id + '<'));

ok('el estado inicial ordena por ID de mayor a menor', ctx.S.credSort && ctx.S.credSort.col === 'id' && ctx.S.credSort.dir === 'desc');
let h = String(ctx.PG.creditos());
let p = orden(h);
ok('la lista se pinta con los 4 créditos', p.every(x => x > 0));
ok('por defecto: CRED-1000, 549, 012, 001 (el más nuevo arriba)', p[0] < p[1] && p[1] < p[2] && p[2] < p[3]);

ctx.S.credSort = undefined;
h = String(ctx.PG.creditos()); p = orden(h);
ok('aunque no haya orden guardado, el más nuevo va arriba', p[0] < p[1] && p[1] < p[2] && p[2] < p[3]);

ctx.S.credSort = { col: 'id', dir: 'desc' };
ctx.setCredSort('id');
ok('tocar "ID" invierte a ascendente', ctx.S.credSort.col === 'id' && ctx.S.credSort.dir === 'asc');
h = String(ctx.PG.creditos()); p = orden(h);
ok('ascendente: CRED-001 arriba y 1000 al final', p[3] < p[2] && p[2] < p[1] && p[1] < p[0]);
ctx.setCredSort('id');
ok('tocar "ID" otra vez vuelve a más nuevo arriba', ctx.S.credSort.dir === 'desc');

ctx.S.credSort = undefined;
ctx.setCredSort('cli');
ok('otra columna empieza ascendente, como antes', ctx.S.credSort.col === 'cli' && ctx.S.credSort.dir === 'asc');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
