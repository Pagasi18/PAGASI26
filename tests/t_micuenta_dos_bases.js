// 15-oct-2026: desde pagasi.io entran los clientes de PAGASI 18 y de PAGASI 26 (Adam: "necesito que
// tanto los de pagasi 18 como pagasi 26 entren por pagasi.io"). Mi cuenta arma las dos bases de
// Firebase y busca el teléfono, el enlace o el correo del equipo en la propia y, si no está, en la
// otra; la sesión se abre en la base donde apareció. Firebase y el DOM son falsos: nada toca la red.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const espera = ms => new Promise(r => setTimeout(r, ms));

const html = fs.readFileSync(path.join(ROOT, 'micuenta.html'), 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');

// ── Firebase falso con DOS proyectos: cada app tiene su usuario, su base y su bitácora ──
function firebaseFalso(){
  const apps = [], bases = {};
  const base = app => bases[(app || apps[0]).name];
  const avisar = b => b.listeners.forEach(cb => cb(b.usuario));
  const authFn = function(app){
    const b = base(app);
    return {
      get currentUser(){ return b.usuario; },
      onAuthStateChanged(cb){ b.listeners.push(cb); setTimeout(() => cb(b.usuario), 5); return () => {}; },
      signInWithPhoneNumber(tel, ver){
        b.llamadas.push(['sms', tel, ver && ver.app && ver.app.name]);
        return Promise.resolve({ confirm(){ b.usuario = { uid: 'tel-' + b.nombre, phoneNumber: tel }; avisar(b); return Promise.resolve({ user: b.usuario }); } });
      },
      signInAnonymously(){ b.usuario = { uid: 'anon-' + b.nombre }; b.llamadas.push(['anonimo']); avisar(b); return Promise.resolve({ user: b.usuario }); },
      signInWithEmailAndPassword(em, pw){
        b.llamadas.push(['correo', em]);
        if (b.cuentas && b.cuentas[em] === pw) { b.usuario = { uid: 'staff-' + b.nombre, email: em }; avisar(b); return Promise.resolve({ user: b.usuario }); }
        return Promise.reject({ code: 'auth/invalid-credential' });
      },
      signOut(){ b.usuario = null; b.llamadas.push(['salir']); avisar(b); return Promise.resolve(); }
    };
  };
  authFn.RecaptchaVerifier = function(id, params, app){ this.app = app; this.clear = () => {}; };
  const firestoreFn = function(app){
    const b = base(app);
    return { collection(col){ return {
      doc(id){ return {
        get(){ const d = (b.docs[col] || {})[id]; b.llamadas.push(['get', col, id]); return Promise.resolve({ exists: !!d, id, data(){ return d; } }); },
        set(data){ if (b.denegar[col]) { b.llamadas.push(['denegado', col, id]); return Promise.reject({ code: 'permission-denied' }); } (b.docs[col] = b.docs[col] || {})[id] = data; b.llamadas.push(['set', col, id]); return Promise.resolve(); }
      }; },
      where(){ return { where(){ return this; }, limit(){ return this; }, get(){ return Promise.resolve({ docs: [], empty: true }); } }; }
    }; } };
  };
  firestoreFn.FieldValue = { serverTimestamp(){ return 'ts'; } };
  const fb = {
    apps,
    initializeApp(cfg, nombre){ const app = { name: nombre || '[DEFAULT]', options: cfg }; apps.push(app); bases[app.name] = { nombre: app.name, usuario: null, listeners: [], docs: {}, llamadas: [], denegar: {}, cuentas: null }; return app; },
    app(){ return apps[0]; },
    auth: authFn, firestore: firestoreFn,
    storage(){ return { ref(){ return { child(){ return {}; } }; } }; }
  };
  return { fb, bases };
}

function elemento(){ var v = ''; return { innerHTML: '', textContent: '', get value(){ return v; }, set value(x){ v = String(x); }, src: '', disabled: false, className: '', style: {}, dataset: {}, hidden: false, classList: { add(){}, remove(){}, contains(){ return false; }, toggle(){} }, addEventListener(){}, removeEventListener(){}, focus(){}, setAttribute(){}, getAttribute(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, appendChild(){}, remove(){} }; }

// Arranca el portal en pagasi.io con las dos bases y devuelve el contexto y los falsos.
// preparar(bases) deja datos o sesiones guardadas ANTES de que el portal arranque.
async function arrancar(preparar, hostname){
  const { fb, bases } = firebaseFalso();
  const origFb = fb.initializeApp;
  fb.initializeApp = function(cfg, nombre){ const app = origFb.call(fb, cfg, nombre); if (preparar) preparar(bases, app.name); return app; };
  const els = {};
  const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){}, visibilityState: 'visible' };
  const ctx = { MICUENTA_CERRADA_PRUEBA: false,   // estas pruebas son del portal abierto; el cierre tiene su propia suite
    console: { log(){}, warn(){}, error(){} }, setTimeout, clearTimeout, setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
    document: doc, navigator: { userAgent: 'node', language: 'es' }, location: { hostname: hostname || 'pagasi.io', origin: 'https://' + (hostname || 'pagasi.io'), href: 'https://' + (hostname || 'pagasi.io') + '/micuenta.html', search: '', hash: '', pathname: '/micuenta.html' },
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }, sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    URLSearchParams, fetch(){ return Promise.reject(new Error('sin red en la prueba')); }, alert(){}, firebase: fb, history: { replaceState(){}, pushState(){} }, matchMedia(){ return { matches: false, addEventListener(){} }; }, Image: function(){}, scrollTo(){}, innerWidth: 390, innerHeight: 800 };
  ctx.window = ctx; ctx.addEventListener = function(){}; ctx.removeEventListener = function(){};
  vm.createContext(ctx);
  vm.runInContext(inline, ctx, { filename: 'micuenta-inline.js' });
  // Espías: el portal cargado y la pantalla de entrada
  ctx.cargas = []; ctx.entradas = 0;
  ctx.cargarPortal = function(){ ctx.S.entrando = false; ctx.cargas.push(ctx.S.base); };
  const prepOriginal = ctx.prepararLogin; ctx.prepararLogin = function(){ ctx.entradas++; return prepOriginal(); };
  ctx.entrarModoMaster = function(){ ctx.cargas.push('equipo:' + ctx.S.base); };
  await espera(40);   // las dos bases reportan su sesión guardada
  return { ctx, bases, el: id => doc.getElementById(id) };
}

(async () => {
  // ── 1. Arranque en pagasi.io sin sesión guardada ──
  let a = await arrancar();
  ok('en pagasi.io se arman las dos bases (propia y otra)', Object.keys(a.ctx.BASES).sort().join() === 'otra,propia' && a.ctx.firebase.apps.length === 2);
  ok('sin sesión guardada muestra la entrada, una sola vez', a.ctx.entradas === 1 && a.ctx.cargas.length === 0);
  ok('arranca sobre la base propia', a.ctx.S.base === 'propia' && a.ctx.db === a.ctx.BASES.propia.db);

  // ── 2. SMS: el teléfono solo está en la otra compañía ──
  a = await arrancar((bases, n) => { if (n === 'otra') bases.otra.docs.indice_clientes = { '+584141234567': { clienteId: 'CLI-26' } }; });
  a.el('tel').value = '04141234567';
  a.ctx.pedirCodigo(); await espera(30);
  ok('busca el número primero aquí y luego en la otra', a.bases['[DEFAULT]'].llamadas.some(l => l[0] === 'get' && l[1] === 'indice_clientes') && a.bases.otra.llamadas.some(l => l[0] === 'get' && l[1] === 'indice_clientes'));
  ok('el SMS sale por el proyecto de la otra compañía, con su propio reCAPTCHA', a.bases.otra.llamadas.some(l => l[0] === 'sms' && l[1] === '+584141234567' && l[2] === 'otra') && !a.bases['[DEFAULT]'].llamadas.some(l => l[0] === 'sms'));
  ok('la base en uso pasa a ser la otra y queda el cliente', a.ctx.S.base === 'otra' && a.ctx.S.clienteId === 'CLI-26' && a.ctx.S.entrando === true);
  a.el('cod').value = '123456'; a.ctx.verificarCodigo(); await espera(40);
  ok('con el código la sesión se escribe en la otra base y el portal carga allá', a.bases.otra.llamadas.some(l => l[0] === 'set' && l[1] === 'sesiones_cliente') && a.ctx.cargas.join() === 'otra');
  ok('el aviso de sesión no devolvió al cliente a la entrada en medio del login', a.ctx.entradas === 1);

  // ── 3. SMS: el teléfono está en la propia ──
  a = await arrancar((bases, n) => { if (n === '[DEFAULT]') bases['[DEFAULT]'].docs.indice_clientes = { '+584241112233': { clienteId: 'CLI-18' } }; });
  a.el('tel').value = '0424-111-2233'; a.ctx.pedirCodigo(); await espera(30);
  ok('si está aquí, el SMS sale por la base propia y no se consulta la otra', a.bases['[DEFAULT]'].llamadas.some(l => l[0] === 'sms') && !a.bases.otra.llamadas.some(l => l[0] === 'get') && a.ctx.S.base === 'propia');

  // ── 4. SMS: no está en ninguna ──
  a = await arrancar();
  a.el('tel').value = '04160000000'; a.ctx.pedirCodigo(); await espera(30);
  ok('si no está en ninguna de las dos, lo dice y no manda SMS', /No encontramos ese número/.test(a.el('lgErr').textContent || a.el('lgErr').innerHTML) && !a.bases.otra.llamadas.some(l => l[0] === 'sms') && !a.bases['[DEFAULT]'].llamadas.some(l => l[0] === 'sms') && a.ctx.S.entrando === false);

  // ── 5. Enlace personal de la otra compañía ──
  a = await arrancar((bases, n) => { if (n === '[DEFAULT]') bases['[DEFAULT]'].denegar.sesiones_cliente = true; });
  a.ctx.S.token = 'CLI-123-abc'; a.ctx.S.clienteId = 'CLI-26-9'; a.el('ced').value = '12345678';
  a.ctx.entrarConEnlace(); await espera(40);
  ok('el enlace se prueba aquí (denegado) y luego en la otra, donde abre', a.bases['[DEFAULT]'].llamadas.some(l => l[0] === 'denegado') && a.bases.otra.llamadas.some(l => l[0] === 'set' && l[1] === 'sesiones_cliente') && a.ctx.cargas.join() === 'otra');
  ok('lo anónimo de la base propia se cerró para que al recargar no gane', a.bases['[DEFAULT]'].usuario === null && a.bases['[DEFAULT]'].llamadas.some(l => l[0] === 'salir'));

  // ── 6. Enlace que no abre en ninguna ──
  a = await arrancar((bases) => { Object.keys(bases).forEach(n => { bases[n].denegar.sesiones_cliente = true; }); });
  a.ctx.S.token = 'X'; a.ctx.S.clienteId = 'CLI-0'; a.el('ced').value = '99999999';
  a.ctx.entrarConEnlace(); await espera(40);
  ok('si ninguna lo acepta, avisa y vuelve a la base propia', /no coincide/.test(a.el('lgErr').textContent || a.el('lgErr').innerHTML) && a.ctx.cargas.length === 0 && a.ctx.S.base === 'propia' && a.ctx.S.entrando === false);

  // ── 7. El equipo: el correo es de la otra compañía ──
  a = await arrancar((bases, n) => { if (n === 'otra') { bases.otra.cuentas = { 'ana@pagasi.io': 'clave' }; bases.otra.docs.usuarios = { 'staff-otra': { nombre: 'Ana', rol: 'Empleado' } }; } });
  a.el('stEmail').value = 'ana@pagasi.io'; a.el('stPass').value = 'clave';
  a.ctx.loginStaff(); await espera(40);
  ok('el correo se prueba aquí y, al no existir, en la otra', a.bases['[DEFAULT]'].llamadas.some(l => l[0] === 'correo') && a.bases.otra.llamadas.some(l => l[0] === 'correo') && a.bases.otra.usuario && a.bases.otra.usuario.email === 'ana@pagasi.io');
  ok('entra en modo equipo sobre la base de la otra compañía', a.ctx.cargas.join() === 'equipo:otra' && a.ctx.S.master === true);

  // ── 8. Sesión guardada en la otra compañía (el cliente vuelve a abrir la página) ──
  a = await arrancar((bases, n) => { if (n === 'otra') { bases.otra.usuario = { uid: 'tel-otra', phoneNumber: '+584141234567' }; bases.otra.docs.sesiones_cliente = { 'tel-otra': { clienteId: 'CLI-26', via: 'sms' } }; } });
  ok('al volver, la sesión guardada en la otra base abre el portal directo allá', a.ctx.cargas.join() === 'otra' && a.ctx.entradas === 0 && a.ctx.S.clienteId === 'CLI-26');

  // ── 9. Salir cierra las dos ──
  a = await arrancar((bases, n) => { bases[n].usuario = { uid: 'x-' + n }; });
  a.ctx.location.href = ''; a.ctx.salir(); await espera(20);
  ok('salir cierra la sesión en las dos bases', a.bases['[DEFAULT]'].usuario === null && a.bases.otra.usuario === null);

  // ── 10. En 18.pagasi.io la otra no se arma (no es dominio autorizado en los dos proyectos) ──
  a = await arrancar(null, '18.pagasi.io');
  ok('fuera de pagasi.io solo se arma la base propia', Object.keys(a.ctx.BASES).join() === 'propia' && a.ctx.firebase.apps.length === 1 && a.ctx.entradas === 1);

  // ── 11. Texto: lo que debe quedar en el archivo ──
  ok('la otra compañía está declarada con su proyecto y pagasi.io es el único dominio que la activa', /var FIREBASE_CONFIG_OTRA = \{ apiKey:'[^']+', authDomain:'[a-z0-9-]+\.firebaseapp\.com', projectId:'[a-z0-9-]+'/.test(html) && /var OTRA_ACTIVA = \['pagasi\.io','www\.pagasi\.io','localhost','127\.0\.0\.1'\]/.test(html));
  const clon = fs.readFileSync(path.join(ROOT, '..', 'preparar-clon-26.sh'), 'utf8');
  ok('el clon de PAGASI 26 le da la vuelta: su otra compañía es PAGASI 18', /FIREBASE_CONFIG_OTRA = \{ apiKey:'[^']+', authDomain:'pagasi-v2\.firebaseapp\.com', projectId:'pagasi-v2'/.test(clon));

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
