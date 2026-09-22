// Arranque sin doble bajada (10-sep-2026): DB.load({viaRealtime:true}) ya NO
// pide las colecciones grandes con .get() — las trae la primera foto de cada
// suscripcion de startRealtime — y la carga clasica DB.load() sigue pidiendo
// todo (respaldos, recargas). Se evalua el app COMPLETO en un VM limpio, como
// t_render: si falta una funcion, revienta como en el navegador.
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

// La base falsa: colecciones fijas, y un registro de que se pidio con .get()
function baseFalsa(DATA, opts) {
  opts = opts || {};
  const gets = [];
  const updates = [];
  const lecturas = { n: 0 };
  const subs = {};
  const wrap = d => ({ id: d.id, data: () => { lecturas.n++; return d; } });
  const snapDe = (docs, cambios) => {
    const ws = (docs || []).map(wrap);
    const s = { docs: ws, forEach(fn){ ws.forEach(fn); } };
    if (cambios) s.docChanges = () => cambios.map(c => ({ type: c.type, doc: ws.find(w => w.id === c.id) || wrap(c.doc) }));
    return s;
  };
  const db = {
    collection(name){
      return {
        get(){ gets.push(name); return Promise.resolve(snapDe(DATA[name])); },
        doc(id){
          return {
            get(){ gets.push(name + '/' + id); return Promise.resolve({ exists: false, data: () => ({}) }); },
            set(){ return Promise.resolve(); }, update(d){ updates.push({ name, id, d }); return Promise.resolve(); },
          };
        },
        onSnapshot(cb, errCb){
          subs[name] = cb;
          setImmediate(() => {
            if (opts.falla === name) errCb(new Error('sin permiso (prueba)'));
            else cb(snapDe(DATA[name]));
          });
          return () => {};
        },
        where(){ return { onSnapshot(){ return () => {}; }, get(){ return Promise.resolve(snapDe([])); } }; },
        orderBy(){ return this; }, limit(){ return this; },
      };
    },
  };
  // Una foto nueva de una coleccion, con sus cambios (como manda Firestore)
  const emitir = (name, docs, cambios) => subs[name] && subs[name](snapDe(docs, cambios));
  return { db, gets, lecturas, emitir, updates };
}

function contexto() {
  const doc = {
    getElementById(){ return elemento(); }, querySelector(){ return elemento(); },
    querySelectorAll(){ return []; }, createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
    head: elemento(), body: elemento(), documentElement: elemento(),
    addEventListener(){}, removeEventListener(){}, hidden: false,
  };
  const ctx = {
    console: { log(){}, warn(){}, error(){} },
    JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Promise, Set, Map,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    // setTimeout REAL: realtimeBootListo lo usa para su plazo (siempre lo cancela)
    setTimeout, clearTimeout, setInterval(){ return 0; }, clearInterval(){},
    requestAnimationFrame(){ return 0; },
    document: doc, navigator: { userAgent: 'node', language: 'es' },
    location: { href: 'https://pagasi.io/admin.html', search: '', hash: '', pathname: '/admin.html' },
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    fetch(){ return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); },
    alert(){}, confirm(){ return true; }, prompt(){ return ''; },
    db: null, storage: null, firebase: undefined,
    innerWidth: 1440, innerHeight: 900, PG: {},
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
  ctx.window = ctx; ctx.globalThis = ctx;
  return ctx;
}

const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m => m[1]);
const fuente = archivos.map(f => '/* ' + f + ' */\n' + fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');

const DATA = {
  motos: [{ id: 'M1', modelo: 'CF MT 450', placa: 'AAA111', estado: 'vendida' }],
  clientes: [{ id: 'CLI-1', nombre: 'JOSE PRUEBA', ingreso: 500, score_indexa: { total: 600 } }],
  creditos: [{ id: 'CRED-1', cli: 'JOSE PRUEBA', estado: 'activo', fecha: '2026-09-01', cuotaQ: 50, totalCuotas: 24, pagado: 0, mora: 0 }],
  pagos: [{ id: 'P-1', cred: 'CRED-1', monto: 50, fecha: '2026-09-08', estado: 'confirmado' }],
  egresos: [], movimientos: [], cuentasPendientes: [], facturas: [],
  concesionarios: [{ id: 'CO-1', nombre: 'Sede prueba' }],
  tareas: [], recursos: [], gps: [],
};

function montarApp(base) {
  const ctx = contexto();
  vm.createContext(ctx);
  vm.runInContext(fuente, ctx, { filename: 'app.js' });
  ctx.db = base.db;
  ctx.S.currentUser = { uid: 'u1', nombre: 'Prueba', rol: 'Administrador', email: 't@pagasi.io' };
  ctx.S.page = '';   // sin pagina: el redibujo del tiempo real no pinta nada
  return ctx;
}

(async () => {
  // ── Arranque nuevo: tiempo real primero, carga sin las colecciones grandes ──
  {
    const base = baseFalsa(DATA);
    const ctx = montarApp(base);
    ok('el app completo evalua sin reventar', typeof ctx.DB === 'object' && typeof ctx.startRealtime === 'function');
    ctx.startRealtime();
    const cargó = await Promise.race([
      ctx.DB.load({ viaRealtime: true }).then(() => true),
      new Promise(r => setTimeout(() => r(false), 5000)),
    ]);
    ok('la carga del arranque termina (no se cuelga)', cargó === true);
    const grandes = ['motos','clientes','creditos','pagos','egresos','movimientos','cuentasPendientes','facturas','concesionarios'];
    ok('NO vuelve a pedir ninguna coleccion grande con .get()', grandes.every(c => !base.gets.includes(c)));
    ok('la configuracion y gps si se piden', base.gets.includes('gps') && base.gets.includes('config/plan'));
    ok('los creditos llegaron por el tiempo real', ctx.S.creds.length === 1 && ctx.S.creds[0].id === 'CRED-1');
    ok('pagos, motos y concesionarios tambien', ctx.S.pagos.length === 1 && ctx.S.motos.length === 1 && ctx.S.concesionarios.length === 1);
    ok('en memoria el cliente queda como llega de la base (como siempre tras la primera foto)', ctx.S.clientes.length === 1 && typeof ctx.S.clientes[0].score_indexa === 'object');
    await new Promise(r => setTimeout(r, 1700));
    const fix = base.updates.find(u => u.name === 'clientes' && u.id === 'CLI-1');
    ok('el score corrupto se repara en la base a los 1,5 s, igual que antes', !!fix && fix.d.score_indexa === 600);

    // ── Segunda foto de pagos: entra un pago nuevo ──
    const antesPagos = ctx.S.pagos;
    base.lecturas.n = 0;
    const nuevo = { id: 'P-2', cred: 'CRED-1', monto: 25, fecha: '2026-09-10', estado: 'confirmado' };
    base.emitir('pagos', [DATA.pagos[0], nuevo], [{ type: 'added', id: 'P-2', doc: nuevo }]);
    ok('segunda foto: desempaca 1 documento, no los 2', base.lecturas.n === 1);
    ok('S.pagos es un array nuevo con el pago nuevo', ctx.S.pagos !== antesPagos && ctx.S.pagos.length === 2 && ctx.S.pagos[1].id === 'P-2');
    ok('el pago viejo es el mismo objeto de antes', ctx.S.pagos[0] === antesPagos[0]);
    ok('el saldo del credito ya ve el pago nuevo (indice rearmado): 75', ctx.getCreditoPagosConfirmados(ctx.S.creds[0]) === 75);
    base.emitir('pagos', [DATA.pagos[0]], [{ type: 'removed', id: 'P-2', doc: nuevo }]);
    ok('borrado: vuelve a 1 pago y el saldo a 50', ctx.S.pagos.length === 1 && ctx.getCreditoPagosConfirmados(ctx.S.creds[0]) === 50);

    // La carga clasica sigue pidiendo todo (respaldos, recargas)
    base.gets.length = 0;
    await ctx.DB.load();
    ok('la carga clasica sigue pidiendo las colecciones', grandes.every(c => base.gets.includes(c)));
  }

  // ── Si una coleccion del tiempo real falla, cae a la carga clasica ──
  {
    const base = baseFalsa(DATA, { falla: 'pagos' });
    const ctx = montarApp(base);
    ctx.startRealtime();
    const cargó = await Promise.race([
      ctx.DB.load({ viaRealtime: true }).then(() => true),
      new Promise(r => setTimeout(() => r(false), 5000)),
    ]);
    ok('con una coleccion fallando, la carga igual termina', cargó === true);
    ok('y cayo a la clasica: pidio los creditos con .get()', base.gets.includes('creditos') && base.gets.includes('pagos'));
    ok('los datos quedaron completos por la via clasica', ctx.S.pagos.length === 1 && ctx.S.creds.length === 1);
  }

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA excepcion: ' + e.message); console.log(''); console.log(pass + ' pruebas OK, ' + (fail + 1) + ' fallas'); process.exit(1); });
