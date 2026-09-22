// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
/* Prueba con DATOS REALES, solo lectura (11-sep-2026).

   Adam: "has test, no quiero problemas mañana... llegaron las motos". Esta
   prueba corre el app COMPLETO dos veces con los documentos reales de
   Firestore:
     VIEJO = el codigo de antes de los cambios (--viejo, por defecto e9cb6b7)
     NUEVO = el codigo que se va a publicar (lo que esta en el checkout)
   y comprueba que el nuevo calcula y muestra EXACTAMENTE lo mismo que el
   viejo, que arranca por la via nueva, que al abrir escribe lo mismo, que el
   tiempo real incremental coincide con la base completa, y mide tiempos.

   Aislamiento: los datos se leen UNA vez con la cuenta del bot y se le sirven
   al app a traves de una base FALSA sin ninguna salida a Firestore: toda
   escritura que intente el app se aplica solo a esa copia en memoria.

   Privacidad: el log de Actions es publico. Solo se imprimen ids de
   documentos, numeros, nombres de pantallas y tiempos. Las diferencias de
   HTML se muestran con letras y digitos enmascarados.

   Uso: node probar-datos-reales.js [--viejo=e9cb6b7] [--nuevo=ref] [--datos=archivo.json]
   (--datos sirve para probar el arnes en local con datos inventados)      */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const a = argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const VIEJO = arg('viejo', 'e9cb6b7');
const DATOS = arg('datos', '');
const NUEVO = arg('nuevo', '');   // vacio = lo que esta en el checkout
for (const r of [VIEJO, NUEVO]) if (r && !/^[A-Za-z0-9._\/-]{1,80}$/.test(r)) { console.error('ref invalido: ' + r); process.exit(2); }

let okN = 0, fallaN = 0;
const ok = (l, v, extra) => {
  if (v) { okN++; console.log('OK    ' + l); }
  else { fallaN++; console.log('FALLA ' + l + (extra ? '\n        → ' + extra : '')); }
};
const info = s => console.log('      · ' + s);
const titulo = s => console.log('\n── ' + s + ' ──');
const hr = () => Number(process.hrtime.bigint() / 1000000n);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const errores = [];
// Tapa el contenido entre comillas de los mensajes de error (pueden traer nombres)
const tapar = s => String(s).replace(/(['"«`])([^'"»`]{0,200})(['"»`])/g, (m, a, b, c) => a + b.replace(/\S/g, '·') + c).slice(0, 220);
const mascara = s => String(s).replace(/[A-Za-zÀ-ÖØ-öø-ÿ]/g, 'a').replace(/[0-9]/g, '9');
process.on('uncaughtException', e => { errores.push('?|' + (e && e.message)); });
process.on('unhandledRejection', e => { errores.push('?|' + (e && e.message)); });

const COLS = ['motos', 'clientes', 'creditos', 'pagos', 'egresos', 'movimientos', 'cuentasPendientes', 'facturas', 'concesionarios', 'tareas', 'recursos', 'gps'];

// ── Datos ────────────────────────────────────────────────────────────────
function aPlano(v) {
  if (v === null || typeof v !== 'object') return v;
  if (typeof v.toDate === 'function' && typeof v.seconds === 'number') return { __ts: v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6) };
  if (Array.isArray(v)) return v.map(aPlano);
  if (typeof v.latitude === 'number' && typeof v.longitude === 'number' && typeof v.isEqual === 'function') return { latitude: v.latitude, longitude: v.longitude };
  if (Buffer.isBuffer(v)) return v.toString('base64');
  const o = {};
  for (const k of Object.keys(v)) if (v[k] !== undefined && typeof v[k] !== 'function') o[k] = aPlano(v[k]);
  return o;
}

async function traerDatos() {
  if (DATOS) return JSON.parse(fs.readFileSync(DATOS, 'utf8'));
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  const out = { cols: {}, config: {} };
  for (const c of COLS) {
    const s = await db.collection(c).get();
    out.cols[c] = s.docs.map(d => ({ id: d.id, data: aPlano(d.data()) }));
  }
  const cs = await db.collection('config').get();
  cs.forEach(d => { out.config[d.id] = aPlano(d.data()); });
  return out;
}

// ── Codigo de cada lado: los mismos archivos que carga admin.html ─────────
function fuenteDe(ref) {
  const leer = f => ref
    ? execFileSync('git', ['show', ref + ':' + f], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 }).toString('utf8')
    : fs.readFileSync(path.join(ROOT, f), 'utf8');
  const html = leer('admin.html');
  const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m => m[1]);
  return archivos.map(f => '/* ' + f + ' */\n' + leer(f)).join('\n;\n');
}

// ── Dentro del app: fecha fija y azar reproducible, igual en los dos lados ─
const T0 = Date.now();
const PREPARAR_VM = `(function(){
  var RD = Date;
  function FD(){
    var a = Array.prototype.slice.call(arguments);
    if(!(this instanceof FD)) return new RD(${T0}).toString();
    if(a.length === 0) return new RD(${T0});
    return new (Function.prototype.bind.apply(RD, [null].concat(a)))();
  }
  FD.prototype = RD.prototype;
  FD.now = function(){ return ${T0}; };
  FD.UTC = RD.UTC; FD.parse = RD.parse;
  globalThis.Date = FD;
  var semilla = 1;
  Math.random = function(){ semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  globalThis.__semilla = function(n){ semilla = (n % 2147483646) + 1; };
})();`;
// Copia fresca de un documento, creada DENTRO del app (como hace Firestore)
const CLONAR = `(function(json){ return JSON.parse(json, function(k, v){
  if(v && typeof v === 'object' && !Array.isArray(v) && v.__ts !== undefined && Object.keys(v).length === 1){
    var ms = v.__ts;
    return { seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1e6, toDate: function(){ return new Date(ms); }, toMillis: function(){ return ms; } };
  }
  return v;
}); })`;

function elemento() {
  return {
    innerHTML: '', outerHTML: '', textContent: '', value: '', className: '', id: '', type: 'text',
    style: {}, dataset: {}, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    children: [], options: [], checked: false, disabled: false,
    appendChild() {}, removeChild() {}, insertBefore() {}, remove() {}, replaceChildren() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, click() {}, focus() {}, blur() {}, select() {}, setSelectionRange() {},
    closest() { return null; }, matches() { return false; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
    querySelector() { return elemento(); }, querySelectorAll() { return []; },
  };
}

function contexto(etiqueta, lsInicial) {
  const pend = new Set();
  const tm = {
    setTimeout(fn, ms) {
      const args = Array.prototype.slice.call(arguments, 2);
      const t = setTimeout(() => {
        pend.delete(t);
        try { if (typeof fn === 'function') fn.apply(null, args); }
        catch (e) { errores.push(etiqueta + '|' + (e && e.message)); }
      }, Math.min(Number(ms) || 0, 60000));
      pend.add(t); return t;
    },
    clearTimeout(t) { pend.delete(t); clearTimeout(t); },
    cancelar() { pend.forEach(t => clearTimeout(t)); pend.clear(); },
  };
  const ls = new Map(Object.entries(lsInicial || {}));
  const almacen = m => ({ getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } });
  const doc = {
    getElementById() { return elemento(); }, querySelector() { return elemento(); },
    querySelectorAll() { return []; }, createElement() { return elemento(); }, createTextNode() { return elemento(); },
    head: elemento(), body: elemento(), documentElement: elemento(),
    addEventListener() {}, removeEventListener() {}, hidden: false, activeElement: null, cookie: '',
  };
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {}, table() {}, debug() {} },
    setTimeout: tm.setTimeout, clearTimeout: tm.clearTimeout, setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    document: doc,
    navigator: { userAgent: 'node', language: 'es', clipboard: { writeText() { return Promise.resolve(); } } },
    location: { href: 'https://pagasi.io/admin.html', search: '', hash: '', pathname: '/admin.html', origin: 'https://pagasi.io', reload() {} },
    localStorage: almacen(ls), sessionStorage: almacen(new Map()),
    fetch() { return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}), text: () => Promise.resolve('') }); },
    alert() {}, confirm() { return true; }, prompt() { return ''; },
    db: null, storage: null, firebase: undefined,
    innerWidth: 1440, innerHeight: 900, PG: {},
  };
  ctx.MutationObserver = function () { return { observe() {}, disconnect() {} }; };
  ctx.IntersectionObserver = function () { return { observe() {}, disconnect() {}, unobserve() {} }; };
  ctx.ResizeObserver = function () { return { observe() {}, disconnect() {} }; };
  ctx.addEventListener = function () {}; ctx.removeEventListener = function () {};
  ctx.dispatchEvent = function () { return true; };
  ctx.matchMedia = function () { return { matches: false, addListener() {}, addEventListener() {} }; };
  ctx.getComputedStyle = function () { return { getPropertyValue() { return ''; } }; };
  ctx.scrollTo = function () {};
  ctx.open = function () { return { document: { write() {}, close() {} }, focus() {}, print() {}, close() {} }; };
  ctx.history = { state: null, pushState() {}, replaceState() {}, back() {} };
  ctx.window = ctx; ctx.self = ctx;
  return { ctx, tm };
}

// ── Base falsa: sirve los datos reales, aplica las escrituras en memoria ──
function baseFalsa(ctx, datos, etiqueta) {
  const clonar = vm.runInContext(CLONAR, ctx);
  const store = {};
  for (const c of Object.keys(datos.cols)) { const m = new Map(); datos.cols[c].forEach(d => m.set(String(d.id), JSON.stringify(d.data))); store[c] = m; }
  const cfg = new Map(Object.entries(datos.config || {}).map(([k, v]) => [k, JSON.stringify(v)]));
  const gets = [], writes = [], subs = {}, pendientes = {};

  const mkDoc = (col, id, json) => ({ id, exists: true, data: () => clonar(json), ref: docRef(col, id) });
  const noExiste = (col, id) => ({ id, exists: false, data: () => undefined, ref: docRef(col, id) });
  const snapCol = (col, cambios) => {
    const m = store[col] || new Map();
    const docs = [...m.entries()].map(([id, j]) => mkDoc(col, id, j));
    const s = { docs, size: docs.length, empty: !docs.length, forEach(fn) { docs.forEach(fn); } };
    if (cambios) s.docChanges = () => cambios.map(ch => ({ type: ch.type, doc: ch.type === 'removed' ? mkDoc(col, ch.id, ch.json || '{}') : docs.find(d => d.id === ch.id) }));
    return s;
  };
  const avisar = (col, lote) => (subs[col] || []).forEach(cb => {
    try { cb(snapCol(col, lote)); } catch (e) { errores.push(etiqueta + '|onSnapshot ' + col + ': ' + (e && e.message)); }
  });
  const aplicar = (col, ch) => {
    const m = store[col] || (store[col] = new Map());
    if (ch.type === 'removed') { const j = m.get(ch.id); m.delete(ch.id); return { type: 'removed', id: ch.id, json: j }; }
    const tipo = m.has(ch.id) ? 'modified' : 'added';
    m.set(ch.id, JSON.stringify(ch.data));
    return { type: tipo, id: ch.id };
  };
  const emitirYa = (col, cambios) => avisar(col, cambios.map(ch => aplicar(col, ch)));
  const emitirLuego = (col, cambio) => {
    const lote = pendientes[col] || (pendientes[col] = []);
    lote.push(aplicar(col, cambio));
    if (lote.length === 1) setImmediate(() => { const l = pendientes[col]; pendientes[col] = []; avisar(col, l); });
  };
  const escribir = (op, col, id, data) => {
    id = String(id);
    writes.push({ op, col, id, campos: data && typeof data === 'object' ? Object.keys(data).sort() : [] });
    const plano = data && typeof data === 'object' ? JSON.parse(JSON.stringify(aPlano(data))) : {};
    if (col === 'config') {
      if (op === 'delete') cfg.delete(id);
      else cfg.set(id, JSON.stringify(op === 'set' ? plano : Object.assign(cfg.has(id) ? JSON.parse(cfg.get(id)) : {}, plano)));
      return Promise.resolve();
    }
    if (!COLS.includes(col)) return Promise.resolve();   // logs, usuarios...: se anota y listo
    const m = store[col] || (store[col] = new Map());
    if (op === 'delete') { if (m.has(id)) emitirLuego(col, { type: 'removed', id }); return Promise.resolve(); }
    if (op === 'update' && !m.has(id)) return Promise.reject(new Error('No document to update'));
    const nuevo = op === 'set' ? plano : Object.assign(m.has(id) ? JSON.parse(m.get(id)) : {}, plano);
    emitirLuego(col, { id, data: nuevo });
    return Promise.resolve();
  };
  let auto = 0;
  function docRef(col, id) {
    if (id === undefined || id === null) id = 'AUTO-' + (++auto);
    id = String(id);
    return {
      id, __col: col,
      get() {
        gets.push(col + '/' + id);
        if (col === 'config') return Promise.resolve(cfg.has(id) ? mkDoc(col, id, cfg.get(id)) : noExiste(col, id));
        const m = store[col];
        return Promise.resolve(m && m.has(id) ? mkDoc(col, id, m.get(id)) : noExiste(col, id));
      },
      set(d, o) { return escribir(o && o.merge ? 'merge' : 'set', col, id, d); },
      update(d) { return escribir('update', col, id, d); },
      delete() { return escribir('delete', col, id, null); },
      onSnapshot() { return () => {}; },
      collection(sub) { return colRef(col + '/' + id + '/' + sub); },
    };
  }
  function colRef(col) {
    const q = {
      get() { gets.push(col); return Promise.resolve(snapCol(col)); },
      doc(id) { return docRef(col, id); },
      add(d) { const r = docRef(col); return escribir('set', col, r.id, d).then(() => r); },
      onSnapshot(cb) {
        (subs[col] = subs[col] || []).push(cb);
        setImmediate(() => { try { cb(snapCol(col)); } catch (e) { errores.push(etiqueta + '|onSnapshot ' + col + ': ' + (e && e.message)); } });
        return () => { subs[col] = (subs[col] || []).filter(x => x !== cb); };
      },
      where() { return q; }, orderBy() { return q; }, limit() { return q; }, startAfter() { return q; },
    };
    return q;
  }
  const db = {
    collection: colRef,
    batch() {
      const ops = [];
      return {
        set: (r, d, o) => { ops.push([o && o.merge ? 'merge' : 'set', r, d]); },
        update: (r, d) => { ops.push(['update', r, d]); },
        delete: r => { ops.push(['delete', r]); },
        commit: () => Promise.all(ops.map(o => escribir(o[0], o[1].__col, o[1].id, o[2]))),
      };
    },
    runTransaction(fn) {
      return Promise.resolve(fn({
        get: r => r.get(),
        set: (r, d) => escribir('set', r.__col, r.id, d),
        update: (r, d) => escribir('update', r.__col, r.id, d),
        delete: r => escribir('delete', r.__col, r.id, null),
      }));
    },
    enablePersistence() { return Promise.resolve(); },
  };
  return { db, gets, writes, store, emitirYa };
}

function montar(etiqueta, fuente, datos, lsInicial) {
  const { ctx, tm } = contexto(etiqueta, lsInicial);
  vm.createContext(ctx);
  vm.runInContext(PREPARAR_VM, ctx);
  vm.runInContext(fuente, ctx, { filename: etiqueta + '.js' });
  const base = baseFalsa(ctx, datos, etiqueta);
  ctx.db = base.db;
  ctx.S.currentUser = { uid: 'prueba', nombre: 'Prueba', rol: 'Administrador', email: 'prueba@pagasi.io' };
  ctx.S.page = '';
  return { ctx, base, tm };
}

// ── La prueba ────────────────────────────────────────────────────────────
(async () => {
  console.log('PRUEBA CON DATOS REALES (solo lectura) · viejo=' + VIEJO + ' · nuevo=' + (NUEVO || 'checkout') + ' · ' + new Date(T0).toISOString());

  titulo('Datos');
  let t = hr();
  const datos = await traerDatos();
  const nDocs = Object.values(datos.cols).reduce((a, x) => a + x.length, 0);
  info(`${nDocs} documentos en ${Object.keys(datos.cols).length} colecciones · leídos en ${hr() - t} ms`);
  // Desde anoche (d8a29f5) el app en vivo estimaba scores en memoria; si alguien guardo un cliente,
  // el campo _scoreEstimado quedo en la base. Solo se cuentan (ids, sin nombres).
  const estimados = (datos.cols.clientes || []).filter(d => d.data && d.data._scoreEstimado !== undefined).map(d => d.id);
  info(`clientes con _scoreEstimado guardado en la base: ${estimados.length}${estimados.length ? ' (' + estimados.slice(0, 10).join(', ') + ')' : ''}`);

  // Cache local de motos VIEJA en el navegador: la primera moto con otro estado.
  // Lo que se ve tiene que ser lo del servidor, igual que antes.
  const fuenteNueva = fuenteDe(NUEVO || null);
  const claveCache = (fuenteNueva.match(/MOTOS_CACHE_KEY\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  if (!claveCache) info('no encontré la clave de la cache de motos: se salta esa prueba');
  const lsInicial = {};
  const primeraMoto = (datos.cols.motos || [])[0];
  if (claveCache && primeraMoto) {
    lsInicial[claveCache] = JSON.stringify([Object.assign({ id: primeraMoto.id }, primeraMoto.data, { estado: 'ESTADO-VIEJO-DE-CACHE', _pruebaCache: true })]);
  }

  titulo('Arranque');
  const V = montar('VIEJO', fuenteDe(VIEJO), datos, lsInicial);
  const N = montar('NUEVO', fuenteNueva, datos, lsInicial);
  ok('los dos apps evalúan completos con los datos reales', typeof V.ctx.DB === 'object' && typeof N.ctx.DB === 'object');

  t = hr();
  await V.ctx.DB.load();
  V.ctx.startRealtime();
  await esperar(500);
  const msV = hr() - t;
  t = hr();
  N.ctx.startRealtime();
  const cargo = await Promise.race([N.ctx.DB.load({ viaRealtime: true }).then(() => true), esperar(60000).then(() => false)]);
  const msN = hr() - t;
  ok('el nuevo termina de cargar (no se cuelga)', cargo === true);
  const grandes = ['motos', 'clientes', 'creditos', 'pagos', 'egresos', 'movimientos', 'cuentasPendientes', 'facturas', 'concesionarios'];
  const repetidas = grandes.filter(c => N.base.gets.includes(c));
  ok('el nuevo arranca por tiempo real: no vuelve a bajar las colecciones', repetidas.length === 0, 'volvió a pedir: ' + repetidas.join(', '));
  info(`carga dentro de la prueba: viejo ${msV} ms (bajando doble) · nuevo ${msN} ms`);
  await esperar(2500);   // saneado de scores (1,5 s), mora y demás tareas de arranque, y sus fotos

  const len = (X, k) => (Array.isArray(X.ctx.S[k]) ? X.ctx.S[k].length : -1);
  for (const k of ['creds', 'pagos', 'clientes', 'motos', 'movimientos', 'egresos', 'facturas', 'concesionarios', 'gps']) {
    ok(`misma cantidad de ${k}: ${len(V, k)}`, len(V, k) === len(N, k), `viejo ${len(V, k)} · nuevo ${len(N, k)}`);
  }
  for (const k of ['creds', 'clientes', 'pagos', 'motos', 'movimientos', 'egresos']) {
    const a = V.ctx.S[k] || [], mb = new Map((N.ctx.S[k] || []).map(x => [x && x.id, x]));
    const distintos = [];
    a.forEach(x => { const y = mb.get(x && x.id); if (!y || JSON.stringify(x) !== JSON.stringify(y)) distintos.push(String(x && x.id)); });
    ok(`${k}: cada registro en memoria idéntico al de antes`, distintos.length === 0, `${distintos.length} distintos, p.ej. ${distintos.slice(0, 6).join(', ')}`);
  }
  if (claveCache && primeraMoto) {
    const mN = (N.ctx.S.motos || []).find(m => String(m.id) === String(primeraMoto.id));
    ok('con una cache vieja de motos en el navegador, se ve lo del servidor', !!mN && mN.estado !== 'ESTADO-VIEJO-DE-CACHE');
  }

  const firma = w => w.op + ' ' + w.col + '/' + w.id + ' [' + w.campos.join(',') + ']';
  const multiset = arr => arr.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const escV = V.base.writes.filter(w => w.col !== 'logs').map(firma);
  const escN = N.base.writes.filter(w => w.col !== 'logs').map(firma);
  const mV = multiset(escV), mN = multiset(escN);
  const soloN = [...mN].filter(([k, n]) => n > (mV.get(k) || 0)).map(([k]) => k);
  const soloV = [...mV].filter(([k, n]) => n > (mN.get(k) || 0)).map(([k]) => k);
  ok(`al abrir, escribe lo mismo que antes (${escV.length} escrituras)`, soloN.length === 0 && soloV.length === 0,
    `solo en el nuevo: ${soloN.slice(0, 4).join(' | ') || '-'} · solo en el viejo: ${soloV.slice(0, 4).join(' | ') || '-'}`);

  titulo('Saldos de todos los créditos');
  const mapN = new Map((N.ctx.S.creds || []).map(c => [c.id, c]));
  const malos = [];
  for (const c of V.ctx.S.creds || []) {
    const n = mapN.get(c.id);
    if (!n) { malos.push(c.id + ' falta'); continue; }
    for (const f of ['getCreditoPagosConfirmados', 'getCreditoSaldoPendiente', 'getCreditoCuotasPagadas', 'getCreditoTotalCuotas', 'getCreditoCuotaBase']) {
      const a = V.ctx[f](c), b = N.ctx[f](n);
      if (!Object.is(a, b)) malos.push(c.id + ' ' + f + ' ' + a + '≠' + b);
    }
  }
  ok(`abonado, saldo y cuotas pagadas idénticos en los ${len(V, 'creds')} créditos reales`, malos.length === 0, malos.slice(0, 5).join(' | '));

  titulo('Pantallas (mismo HTML que antes)');
  const normN = (p, h) => (p === 'creditos' ? h.replace(/<div style="font-size:9\.5px;opacity:\.75">[^<]*<\/div>/g, '') : h);
  const pintar = (X, p) => {
    const r = {};
    X.ctx.S.page = p; X.ctx._pages = {}; X.ctx.__semilla(12345);
    const t1 = hr();
    try { const h = X.ctx.PG[p](); r.h = typeof h === 'string' ? h : String(h == null ? '' : h); }
    catch (e) { r.err = (e && e.message) || String(e); }
    r.ms = hr() - t1;
    X.ctx.S.page = '';
    return r;
  };
  const paginas = Object.keys(N.ctx.PG).filter(p => typeof N.ctx.PG[p] === 'function');
  const tiempos = [];
  let iguales = 0;
  for (const p of paginas) {
    const a = typeof V.ctx.PG[p] === 'function' ? pintar(V, p) : { falta: true };
    const b = pintar(N, p);
    tiempos.push([p, a.ms, b.ms]);
    if (b.err) {
      if (a.err && a.err === b.err) info(`${p}: ya reventaba igual antes (no es de hoy): ${tapar(b.err)}`);
      else ok(`pantalla ${p} se pinta`, false, tapar(b.err));
      continue;
    }
    if (a.falta || a.err) { info(`${p}: no existía o reventaba antes; el nuevo la pinta`); continue; }
    const hb = normN(p, b.h);
    if (a.h === hb) { iguales++; continue; }
    let i = 0; while (i < a.h.length && i < hb.length && a.h[i] === hb[i]) i++;
    ok(`pantalla ${p}: mismo HTML que antes`, false,
      `difiere desde el carácter ${i} de ${a.h.length}: viejo «${mascara(a.h.slice(Math.max(0, i - 50), i + 70))}» · nuevo «${mascara(hb.slice(Math.max(0, i - 50), i + 70))}»`);
  }
  ok(`${iguales} de ${paginas.length} pantallas con HTML idéntico al de antes`, iguales > 0);
  tiempos.sort((x, y) => (y[1] || 0) - (x[1] || 0)).slice(0, 8)
    .forEach(([p, a, b]) => info(`${p.padEnd(16)} viejo ${String(a == null ? '-' : a).padStart(5)} ms · nuevo ${String(b).padStart(5)} ms`));

  titulo('Buscador de créditos');
  const buscar = (X, q) => {
    X.ctx.S.page = 'creditos'; X.ctx.S.credFiltro = q; X.ctx._pages = {}; X.ctx.__semilla(7);
    const t1 = hr(); const h = String(X.ctx.PG.creditos()); const ms = hr() - t1;
    X.ctx.S.credFiltro = ''; X.ctx.S.page = '';
    return { h, ms };
  };
  let totV = 0, totN = 0, igualesB = true;
  for (const q of ['c', 'cr', 'cre', 'cred', 'cred-', 'cred-0', 'cred-00', 'cred-001']) {
    const a = buscar(V, q), b = buscar(N, q);
    totV += a.ms; totN += b.ms;
    if (a.h !== normN('creditos', b.h)) igualesB = false;
  }
  ok('escribir "CRED-001" letra por letra: mismos resultados que antes', igualesB);
  info(`las 8 letras: viejo ${totV} ms · nuevo ${totN} ms`);
  ok('el buscador nuevo no es más lento que el viejo', totN <= totV * 1.1 + 50, `viejo ${totV} ms · nuevo ${totN} ms`);

  titulo('Contrato con hora');
  const recientes = (N.ctx.S.creds || []).filter(c => c && !c.eliminado && c.creado)
    .sort((a, b) => String(b.creado).localeCompare(String(a.creado))).slice(0, 8);
  const contratosMal = [];
  for (const c of recientes) {
    try {
      const h = N.ctx._htmlContratoProtect(c.id);
      if (!(typeof h === 'string' && h.length > 20000 && h.includes('siendo las'))) contratosMal.push(c.id + ' sin hora o incompleto');
    } catch (e) { contratosMal.push(c.id + ': ' + tapar(e && e.message)); }
  }
  ok(`contrato Protect con hora en los ${recientes.length} créditos más recientes`, recientes.length > 0 && contratosMal.length === 0, contratosMal.slice(0, 4).join(' | '));

  titulo('Cobranza');
  let conNota = 0, alDiaConNota = 0, erroresCob = 0;
  for (const c of N.ctx.S.creds || []) {
    try {
      if (c && c.cobranzaStatus) conNota++;
      const total = c.totalCuotas || ((parseInt(c.plazo, 10) || 0) * 2);
      if (N.ctx._notaCobranzaSeLimpia(c, parseInt(c.pagado || 0, 10) || 0, total, c.estado)) alDiaConNota++;
    } catch (e) { erroresCob++; }
  }
  ok('la regla de "al día" corre en todos los créditos reales sin errores', erroresCob === 0, erroresCob + ' errores');
  info(`${conNota} créditos con nota de cobranza · ${alDiaConNota} al día con nota de deuda (salen solos con su próximo pago)`);

  titulo('Tiempo real incremental con datos reales');
  let sem = 42; const rnd = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff; };
  const cids = [...N.base.store.creditos.keys()];
  for (let i = 0; i < 20; i++) {
    const id = cids[Math.floor(rnd() * cids.length)];
    const d = JSON.parse(N.base.store.creditos.get(id)); d.mora = (parseInt(d.mora, 10) || 0) + 1;
    N.base.emitirYa('creditos', [{ id, data: d }]);
  }
  const vivos = (N.ctx.S.creds || []).filter(c => c && !c.eliminado && c.estado === 'activo').map(c => c.id);
  for (let i = 0; i < 20 && vivos.length; i++) {
    const id = 'PAG-PRUEBA-' + i;
    N.base.emitirYa('pagos', [{ id, data: { id, cred: vivos[Math.floor(rnd() * vivos.length)], monto: 10 + i, estado: 'confirmado', fecha: '2026-09-11' } }]);
  }
  const pids = [...N.base.store.pagos.keys()].filter(x => !x.startsWith('PAG-PRUEBA-'));
  for (let i = 0; i < 5 && pids.length; i++) N.base.emitirYa('pagos', [{ type: 'removed', id: pids[Math.floor(rnd() * pids.length)] }]);
  const REV = (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && v.__ts !== undefined && Object.keys(v).length === 1
    ? { seconds: Math.floor(v.__ts / 1000), nanoseconds: (v.__ts % 1000) * 1e6 } : v);
  const completa = col => [...N.base.store[col].entries()].map(([id, j]) => JSON.stringify(Object.assign({ id }, JSON.parse(j, REV))));
  const difiere = (col, key) => { const a = completa(col), b = (N.ctx.S[key] || []).map(x => JSON.stringify(x)); let d = 0; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) d++; return d; };
  const dC = difiere('creditos', 'creds'), dP = difiere('pagos', 'pagos');
  ok('créditos en memoria = base completa, tras 20 cambios en vivo', dC === 0, dC + ' distintos');
  ok('pagos en memoria = base completa, tras 20 nuevos y 5 borrados en vivo', dP === 0, dP + ' distintos');
  const pagosFull = [...N.base.store.pagos.entries()].map(([id, j]) => Object.assign({ id }, JSON.parse(j)));
  const cuentaVieja = c => {
    const del = pagosFull.filter(p => p && !p.eliminado && p.estado === 'confirmado' && p.cred === c.id && !p.esInicial && p.tipoOperacion !== 'inicial_credito');
    if (del.length) return del.reduce((a, p) => a + (parseFloat(p.monto) || 0), 0);
    if (Array.isArray(c.pagosRegistrados) && c.pagosRegistrados.length) return c.pagosRegistrados.reduce((a, h) => a + (parseFloat(h.montoPagado) || 0), 0);
    return (parseInt(c.pagado, 10) || 0) * (parseFloat((c.cuotaQ || c.cuota) || 0) || 0);
  };
  const malS = [];
  for (const c of N.ctx.S.creds || []) { const a = cuentaVieja(c), b = N.ctx.getCreditoPagosConfirmados(c); if (!Object.is(a, b)) malS.push(c.id + ' ' + a + '≠' + b); }
  ok('abonado de cada crédito = cuenta vieja, después de los cambios en vivo', malS.length === 0, malS.slice(0, 5).join(' | '));

  titulo('Carga clásica (respaldos y recargas)');
  N.base.gets.length = 0;
  await N.ctx.DB.load();
  await esperar(500);
  ok('DB.load() clásico sigue bajando todo y deja los datos completos',
    grandes.every(c => N.base.gets.includes(c)) && len(N, 'pagos') === N.base.store.pagos.size && len(N, 'creds') === N.base.store.creditos.size,
    `pagos ${len(N, 'pagos')}/${N.base.store.pagos.size} · créditos ${len(N, 'creds')}/${N.base.store.creditos.size}`);

  titulo('Errores en segundo plano');
  const deLado = et => new Set(errores.filter(e => e.startsWith(et + '|')).map(e => e.slice(et.length + 1)));
  const eV = deLado('VIEJO'), eN = deLado('NUEVO');
  const nuevos = [...eN].filter(e => !eV.has(e));
  ok('no aparecen errores nuevos en segundo plano', nuevos.length === 0, nuevos.slice(0, 4).map(tapar).join(' | '));
  if (eV.size) info(`${eV.size} errores de segundo plano que ya existían antes (entorno de prueba sin gráficos): ${[...eV].slice(0, 3).map(tapar).join(' | ')}`);
  const sinLado = errores.filter(e => e.startsWith('?|'));
  if (sinLado.length) info(`${sinLado.length} errores sin lado identificado: ${sinLado.slice(0, 3).map(tapar).join(' | ')}`);

  V.tm.cancelar(); N.tm.cancelar();
  console.log(`\nRESULTADO ok=${okN} fallas=${fallaN}`);
  process.exit(fallaN ? 1 : 0);
})().catch(e => {
  console.log('FALLA la prueba no pudo terminar: ' + tapar(e && e.message));
  console.log(`RESULTADO ok=${okN} fallas=${fallaN + 1}`);
  process.exit(1);
});
