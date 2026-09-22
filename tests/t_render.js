// Humo: cada pagina del app se pinta en un VM LIMPIO, sin Proxy.
//
// Por que existe: los demas arneses evaluan el fuente dentro de
// `with(new Proxy(...))`, donde cualquier identificador desconocido se
// resuelve a un stub que devuelve 0. Eso permite inyectar el entorno, pero
// una funcion borrada por error se stubea en silencio y la prueba pasa.
//
// Paso de verdad: al quitar la pestaña Cobertura se borraron
// _gpsHtmlRevision y _gpsRevisar y quedaron sus llamadas. El arnes con Proxy
// dijo "51.000 caracteres, OK"; el navegador lanzaba ReferenceError y la
// pestaña Equipos no abria. Como nav() no tiene try/catch, el innerHTML nunca
// se asignaba: la pantalla se quedaba igual, sin error visible.
//
// Aqui no hay Proxy: si falta una funcion, revienta como en el navegador.
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

function contexto(estado) {
  const doc = {
    getElementById(){ return elemento(); },
    querySelector(){ return elemento(); },
    querySelectorAll(){ return []; },
    createElement(){ return elemento(); },
    createTextNode(){ return elemento(); },
    head: elemento(), body: elemento(), documentElement: elemento(),
    addEventListener(){}, removeEventListener(){},
  };
  const ctx = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Promise, Set, Map,
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
    PG: {},
  };
  ctx.MutationObserver = function(){ return {observe(){}, disconnect(){}}; };
  ctx.IntersectionObserver = function(){ return {observe(){}, disconnect(){}, unobserve(){}}; };
  ctx.ResizeObserver = function(){ return {observe(){}, disconnect(){}}; };
  ctx.addEventListener = function(){};
  ctx.removeEventListener = function(){};
  ctx.dispatchEvent = function(){ return true; };
  ctx.matchMedia = function(){ return {matches:false, addListener(){}, addEventListener(){}}; };
  ctx.getComputedStyle = function(){ return {getPropertyValue(){ return ''; }}; };
  ctx.scrollTo = function(){};
  ctx.open = function(){ return {document:{write(){},close(){}}, focus(){}, print(){}, close(){}}; };
  ctx.history = { state:null, pushState(){}, replaceState(){}, back(){} };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  Object.assign(ctx, estado);
  return ctx;
}

// Datos minimos pero realistas: un credito vivo, su moto, su cliente y equipos.
const HOY = new Date().toISOString().slice(0, 10);
const ESTADO = {
  S: {
    currentUser: { uid: 'u1', nombre: 'Adam', rol: 'Administrador', email: 'adam@pagasi.io' },
    page: 'gps', saveFn: null, clienteFiltro: '',
    creds: [
      { id: 'CRED-467', cli: 'JOSE PRUEBA', clienteId: 'CLI-1', modelo: 'CF MT 450',
        placa: 'AM2D29J', estado: 'activo', mora: 0, fecha: HOY, total: 2000, fin: 1200,
        cuota: 90, plazo: 12, eliminado: false, contratoFirmado: true },
      { id: 'CRED-477', cli: 'ABEL RAMIREZ', clienteId: 'CLI-2', modelo: 'NEW OUTLOOK 175',
        placa: 'AM6C46J', estado: 'mora', mora: 9, fecha: HOY, total: 1800, fin: 1000,
        cuota: 80, plazo: 12, eliminado: false, contratoFirmado: true },
    ],
    clientes: [{ id: 'CLI-1', nom: 'JOSE PRUEBA', ci: 'V-1', eliminado: false },
               { id: 'CLI-2', nom: 'ABEL RAMIREZ', ci: 'V-2', eliminado: false }],
    motos: [{ id: 1, modelo: 'CF MT 450', placa: 'AM2D29J', precio: 2000, estado: 'vendida', eliminado: false }],
    pagos: [], movimientos: [], egresos: [], facturas: [], cuentas: [], concesionarios: [],
    gps: [
      { id: 'G1', estado: 'instalado', creditoId: 'CRED-467', idGps: '19210075478',
        imei: '866557086115211', linea: '143557051', iccid: '895804420015136641',
        lat: 10.47486, lng: -66.55705, dataType: 1, bateria: 100,
        ultimaSenal: '2026-09-01 22:51:15', fechaInstalacion: HOY, tecnico: 'FRANCISCO',
        estadoMicodus: 'ONLINE / OK', eliminado: false },
      { id: 'G2', estado: 'stock', idGps: '19210076015', linea: '142706570',
        iccid: '895804420015136638', eliminado: false },
    ],
  },
};

// Cargar los mismos archivos que admin.html, en su orden
const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m => m[1]);
ok('admin.html carga los scripts del app (' + archivos.length + ')', archivos.length > 20);

const ctx = contexto({});
vm.createContext(ctx);

// Se concatenan: en el navegador los <script> clasicos comparten el ambito
// lexico, asi que `const PG = {}` de un archivo lo ve el siguiente. Cada
// runInContext por separado no: PG quedaria invisible.
const noCargaron = [];
const partes = [];
for (const f of archivos) {
  const ruta = path.join(ROOT, f);
  if (!fs.existsSync(ruta)) { noCargaron.push(f + ' (no existe)'); continue; }
  partes.push('/* ' + f + ' */\n' + fs.readFileSync(ruta, 'utf8'));
}
try { vm.runInContext(partes.join('\n;\n'), ctx, { filename: 'app.js' }); }
catch (e) { noCargaron.push('al evaluar: ' + e.message); }
if (noCargaron.length) noCargaron.forEach(x => console.log('     ' + x));
ok('todos los archivos evaluan sin reventar', noCargaron.length === 0);

// Los datos van DESPUES: pagasi-app.js declara su propio S al evaluarse y
// machacaria lo que hubieramos puesto antes. Este fue el error que hizo que
// esta misma prueba no atrapara el bug la primera vez: S.gps quedaba vacio,
// la tabla salia en su estado "sin equipos" y nunca se llegaba a las filas.
Object.assign(ctx.S, ESTADO.S);
ok('los datos de prueba quedaron cargados (' + ctx.S.gps.length + ' equipos)',
   ctx.S.gps.length === 2 && ctx.S.creds.length === 2);

// Pintar cada pagina registrada
const paginas = Object.keys(ctx.PG || {}).sort();
ok('las paginas quedaron registradas en PG (' + paginas.length + ')', paginas.length > 5);

const rotas = [];
for (const p of paginas) {
  try {
    ctx.S.page = p;
    const h = ctx.PG[p]();
    if (typeof h !== 'string') rotas.push(p + ' → devolvio ' + typeof h);
  } catch (e) {
    rotas.push(p + ' → ' + e.message);
  }
}
if (rotas.length) { console.log(''); rotas.forEach(r => console.log('     ✗ ' + r)); console.log(''); }
ok('todas las paginas se pintan sin ReferenceError', rotas.length === 0);

// El modulo GPS, pestaña por pestaña: es donde vivio el bug
const rotasGps = [];
for (const t of ['mapa', 'equipos', 'sims']) {
  try {
    ctx.window._gpsTabActual = t;
    const h = ctx.PG.gps();
    if (!h || h.length < 200) { rotasGps.push(t + ' → pinto ' + (h ? h.length : 0) + ' chars'); continue; }
    // Que pinte no basta: si la tabla sale en su estado "sin equipos" nunca se
    // recorren las filas, que es justo donde reventaba.
    if (t !== 'mapa' && !/<tr>/.test(h)) rotasGps.push(t + ' → sin filas (estado vacio)');
  } catch (e) { rotasGps.push(t + ' → ' + e.message); }
}
if (rotasGps.length) rotasGps.forEach(r => console.log('     ✗ ' + r));
ok('las tres pestañas de GPS se pintan', rotasGps.length === 0);

// ══════════════════════════════════════════════════════════════════
// Un modulo que se puede otorgar como permiso tiene que aparecer en
// ALGUN sidebar, o marcarlo no sirve de nada.
//
// Paso de verdad: al crear el modulo GPS se agrego al sidebar de
// administradores y se olvido el de empleados, que es otra lista aparte y
// esta escrita a mano. A Miguel le marcaron el permiso y aun asi no le
// aparecia: la casilla estaba puesta pero no habia boton que tocar.
// ══════════════════════════════════════════════════════════════════
const fuente = fs.readFileSync(path.join(ROOT, 'assets/pagasi-app.js'), 'utf8');

// Los modulos que el admin puede otorgar (los que salen en Editar Permisos)
const otorgables = [...fuente.matchAll(/\{\s*id:\s*'(\w+)'\s*,\s*label:/g)].map(m => m[1]);
ok('MODULOS tiene entradas (' + otorgables.length + ')', otorgables.length > 10);

// Las claves de los dos sidebars: el de empleados y el general
const clavesSidebar = new Set();
for (const m of fuente.matchAll(/keys:\s*\[([^\]]*)\]/g)) {
  for (const k of m[1].matchAll(/'(\w+)'/g)) clavesSidebar.add(k[1]);
}
ok('los sidebars declaran modulos (' + clavesSidebar.size + ')', clavesSidebar.size > 10);

// Estos viven fuera del sidebar a proposito
const APARTE = new Set(['concesionarios', 'aprobaciones']);
const huerfanos = otorgables.filter(k => !clavesSidebar.has(k) && !APARTE.has(k));
if (huerfanos.length) {
  console.log('');
  huerfanos.forEach(k => console.log('     ✗ "' + k + '" se puede otorgar pero no esta en ningun sidebar'));
  console.log('');
}
ok('todo modulo otorgable aparece en algun sidebar', huerfanos.length === 0);

// Y el caso concreto: GPS en los DOS, porque cobranza lo necesita
const bloquesOps = [...fuente.matchAll(/label:'Operaciones',\s*keys:\s*\[([^\]]*)\]/g)].map(m => m[1]);
ok('hay dos sidebars con grupo Operaciones', bloquesOps.length === 2);
ok('GPS esta en los dos', bloquesOps.every(b => b.indexOf("'gps'") > -1));

console.log('');
console.log(pass + ' pruebas OK, ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
