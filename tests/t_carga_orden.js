// Archivos que llegan tarde (24-nov-2026). El vigilante de carga de admin.html vuelve a pedir
// el archivo que GitHub nego y lo pega AL FINAL, despues de todos los demas. Eso solo sirve si
// ningun otro archivo lo necesitaba PARA CARGAR y si, puesto al final, no le pisa nada a uno
// que venia despues. Aqui se comprueba con los archivos de verdad, uno por uno: se carga el
// sistema sin ese archivo y se le pone al final, como hace el navegador en un reintento.
//   - Si nada cambia, puede llegar tarde.
//   - Si algo cambia, TIENE que estar en ESENCIALES (el vigilante recarga la pagina).
// Si esta prueba falla por un archivo nuevo: o se le quita la dependencia al cargar (lo mejor),
// o se agrega a ESENCIALES en el <script id="pg-carga"> de admin.html.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function elemento() {
  const e = {
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
  return e;
}
function contexto() {
  const doc = {
    getElementById(){ return elemento(); }, querySelector(){ return elemento(); },
    querySelectorAll(){ return []; }, createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
    head: elemento(), body: elemento(), documentElement: elemento(),
    addEventListener(){}, removeEventListener(){}, hidden: false, readyState: 'loading',
  };
  const ctx = {
    console: { log(){}, warn(){}, error(){} },
    JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Promise, Set, Map,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
    requestAnimationFrame(){ return 0; },
    document: doc, navigator: { userAgent: 'node', language: 'es' },
    location: { href: 'https://pagasi.io/admin.html', search: '', hash: '', pathname: '/admin.html' },
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    fetch(){ return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); },
    alert(){}, confirm(){ return true; }, prompt(){ return ''; },
    db: null, storage: null, firebase: undefined,
    innerWidth: 1440, innerHeight: 900,
  };
  ctx.MutationObserver = function(){ return {observe(){}, disconnect(){}}; };
  ctx.IntersectionObserver = function(){ return {observe(){}, disconnect(){}, unobserve(){}}; };
  ctx.ResizeObserver = function(){ return {observe(){}, disconnect(){}}; };
  ctx.addEventListener = function(){}; ctx.removeEventListener = function(){};
  ctx.dispatchEvent = function(){ return true; };
  ctx.matchMedia = function(){ return {matches:false, addListener(){}, addEventListener(){}}; };
  ctx.getComputedStyle = function(){ return {getPropertyValue(){ return ''; }}; };
  ctx.scrollTo = function(){};
  ctx.open = function(){ return {document:{write(){},close(){}}, focus(){}, print(){}, close(){}}; };
  ctx.history = { state:null, pushState(){}, replaceState(){}, back(){} };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  return ctx;
}

const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m => m[1]);
// CADA archivo es un script aparte, como en el navegador (un error en uno no frena al siguiente)
const fuentes = {};
archivos.forEach(f => { fuentes[f] = new vm.Script(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }); });

const guardian = (html.match(/<script id="pg-carga">([\s\S]*?)<\/script>/) || [])[1] || '';
const mEs = guardian.match(/var ESENCIALES = \[([^\]]*)\]/);
const ESENCIALES = mEs ? [...mEs[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : [];

// Carga los archivos en ese orden y anota: que archivo revento al cargar, quien escribio por
// ultimo cada nombre global (el dueño) y que pantallas quedaron registradas en PG.
function correr(orden) {
  const ctx = contexto(); vm.createContext(ctx);
  const dueno = {}, errores = {};
  const antes = new Map(Object.keys(ctx).map(k => [k, ctx[k]]));
  for (const f of orden) {
    try { fuentes[f].runInContext(ctx); } catch (e) { errores[f] = String((e && e.message) || e).slice(0, 120); }
    for (const k of Object.keys(ctx)) {
      let v; try { v = ctx[k]; } catch (e) { continue; }
      if (!antes.has(k) || antes.get(k) !== v) { dueno[k] = f; antes.set(k, v); }
    }
  }
  let pg = [];
  try { pg = vm.runInContext('typeof PG === "object" && PG ? Object.keys(PG) : []', ctx); } catch (e) {}
  return { dueno, errores, pg: [...pg].sort() };
}

const normal = correr(archivos);
ok('la página carga más de 60 archivos propios (' + archivos.length + ')', archivos.length > 60);
ok('en su orden normal ningún archivo revienta al cargar', Object.keys(normal.errores).length === 0);
ok('quedan registradas las pantallas del sistema (' + normal.pg.length + ')', normal.pg.length >= 25 && normal.pg.includes('concesionarios') && normal.pg.includes('dash'));
ok('el vigilante declara sus ESENCIALES y todos son archivos de la página', ESENCIALES.length > 0 && ESENCIALES.every(f => archivos.includes(f)));

const problemas = {};
for (const x of archivos) {
  const r = correr(archivos.filter(f => f !== x).concat([x]));
  const rompe = Object.keys(r.errores);
  const pisa = Object.keys(normal.dueno).filter(k => r.dueno[k] !== normal.dueno[k]);
  const sinPantalla = normal.pg.filter(k => !r.pg.includes(k));
  if (rompe.length || pisa.length || sinPantalla.length) problemas[x] = { rompe, err: r.errores, pisa, sinPantalla };
}

const sinCubrir = Object.keys(problemas).filter(f => !ESENCIALES.includes(f));
ok('todo archivo que NO puede llegar tarde está en ESENCIALES', sinCubrir.length === 0);
sinCubrir.forEach(f => {
  const p = problemas[f];
  console.log('     ' + f + ' no puede llegar tarde:'
    + (p.rompe.length ? ' revienta ' + p.rompe.slice(0, 4).map(a => a + ' («' + p.err[a] + '»)').join(', ') : '')
    + (p.pisa.length ? ' · cambia de dueño ' + p.pisa.slice(0, 6).join(', ') : '')
    + (p.sinPantalla.length ? ' · sin pantalla ' + p.sinPantalla.join(', ') : ''));
});
ok('assets/pagasi-app.js es esencial: sin él, los que vienen después revientan al cargar',
  ESENCIALES.includes('assets/pagasi-app.js') && !!problemas['assets/pagasi-app.js'] && problemas['assets/pagasi-app.js'].rompe.length > 0);
ok('ESENCIALES no trae archivos de más (cada uno de verdad rompe algo si llega tarde)', ESENCIALES.every(f => !!problemas[f]));

// El caso del 24-nov: modules/concesionarios.js llega tarde y la pantalla queda registrada igual
const tarde = correr(archivos.filter(f => f !== 'modules/concesionarios.js').concat(['modules/concesionarios.js']));
ok('modules/concesionarios.js al final: PG.concesionarios existe y nada reventó',
  tarde.pg.includes('concesionarios') && Object.keys(tarde.errores).length === 0);
const sinEl = correr(archivos.filter(f => f !== 'modules/concesionarios.js'));
ok('y sin reintento esa pantalla no existía (lo que pasó ese día)', !sinEl.pg.includes('concesionarios'));

// logic/usuarios.js es el que arranca la sesión: llega tarde sin romper a nadie
ok('logic/usuarios.js puede llegar tarde', !problemas['logic/usuarios.js']);

console.log('\n' + pass + ' OK, ' + fail + ' FALLA');
process.exit(fail ? 1 : 0);
