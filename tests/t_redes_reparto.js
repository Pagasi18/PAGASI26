// 24-oct-2026, Adam: "que nadie se quede esperando". Cuando alguien quiere comprar o pide una persona, Paola le
// asigna la conversación a un vendedor por turnos (eso lo hace el servidor: tests/t_whatsapp_webhook.js). Aquí:
// la lista muestra "⏱ esperando" (rojo pasada 1 hora) con la que más lleva arriba, al vendedor le suena un aviso
// en cualquier pantalla, y en la ventana de Paola se escoge quién recibe.
process.env.TZ = 'America/Caracas';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', scrollTop: 0, scrollHeight: 0 }); }
const doc = { title: 'PAGASI 26 — Sistema', activeElement: null, getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} };
const timers = [], toasts = [], escuchas = [];
const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  S: { page: 'redes', currentUser: { nombre: 'Liz Alejandra', uid: 'u3' }, creds: [], pagos: [], clientes: [] }, PG: {}, nav() {}, toast: (t) => toasts.push(t), logActividad() {},
  isAdminUser: () => false, hasModuleAccess: (m) => m === 'instagram', fmt: (n) => '$' + n, hoyLocalISO: () => '2026-10-24', CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
  fetch() { return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); } };
ctx.window = ctx;
let fotoIg = null;
function consulta(col) { const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, get() { return Promise.resolve({ docs: [] }); },
  onSnapshot(cb) { escuchas.push(col); if (col === 'conversaciones') fotoIg = cb; return () => {}; }, doc() { return { get() { return Promise.resolve({ exists: true, data: () => ({ instagram: 'pagasi.io', conectado: false }) }); }, set() { return Promise.resolve(); }, collection: consulta }; } }; return q; }
ctx.db = { collection: consulta };
vm.createContext(ctx);
for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const flush = () => { while (timers.length) timers.shift()(); };
const hace = (min) => new Date(Date.now() - min * 60000).toISOString();

// ── 1. Esperando hace… ──
ok('el tiempo de espera en palabras', ctx._waEsperaTexto(5) === '5 min' && ctx._waEsperaTexto(150) === '2 h' && ctx._waEsperaTexto(60 * 72) === '3 d');
ok('espera desde que se marcó; si es de antes, desde su último mensaje; sin marca no espera', ctx.waEsperaMin({ atencion: 'lead', atencionDesde: hace(90) }) === 90 && ctx.waEsperaMin({ atencion: 'queja', ultimoEntranteHora: hace(10) }) === 10 && ctx.waEsperaMin({ atencion: '' }) === null);
ctx._waCfg = { conectado: false, instagram: '' };
ctx._waConvs = [
  { id: 'ig:1', canal: 'instagram', area: 'ventas', nombre: 'Nueva', atencion: 'pide_persona', atencionDesde: hace(20), ultimoMensajeHora: hace(1) },
  { id: 'ig:2', canal: 'instagram', area: 'ventas', nombre: 'Vieja', atencion: 'lead', atencionDesde: hace(300), ultimoMensajeHora: hace(200) },
  { id: 'ig:3', canal: 'instagram', area: 'ventas', nombre: 'Sin espera', atencion: '', ultimoMensajeHora: hace(0) }
];
ctx._rsTab = 'instagram'; ctx._rsVista = 'bandeja'; ctx._waVendSel = '';
['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q', 'rs-vend'].forEach(el); ctx.PG.redes(); flush();
const orden = (els['wa-items'].innerHTML.match(/onclick="waAbrir\('([^']+)'\)/g) || []).map(x => x.match(/'([^']+)'/)[1]).join(',');
ok('en "Todas", lo más reciente arriba (como en Meta)', orden === 'ig:3,ig:1,ig:2');
ctx.waFiltro('esperan');
const ordenEsp = (els['wa-items'].innerHTML.match(/onclick="waAbrir\('([^']+)'\)/g) || []).map(x => x.match(/'([^']+)'/)[1]).join(',');
ok('en "Esperan persona", la que más lleva esperando arriba', ordenEsp === 'ig:2,ig:1');
ctx.waFiltro('todas');
ok('cada una dice cuánto lleva esperando: en rojo pasada 1 hora, en ámbar antes', /class="rojo" title="Esperando a una persona desde [^"]*">⏱ 5 h<\/span>/.test(els['wa-items'].innerHTML) && /class="ambar" title="[^"]*">⏱ 20 min<\/span>/.test(els['wa-items'].innerHTML));

// ── 2. El aviso al vendedor ──
const sonarReal = ctx._waSonar; let sonidos = 0; ctx._waSonar = () => { sonidos++; };
const c = (id, extra) => Object.assign({ id, canal: 'instagram', area: 'ventas', nombre: 'Persona ' + id, ultimoMensajeHora: hace(0) }, extra);
ctx._waAvisar('instagram', [c('ig:10', { vendedor: 'Liz Alejandra' }), c('ig:11')]);
ok('la primera foto (lo que ya había) no avisa', sonidos === 0 && toasts.length === 0);
ctx._waAvisar('instagram', [c('ig:10', { vendedor: 'Liz Alejandra' }), c('ig:11', { vendedor: 'Liz Alejandra', atencion: 'lead' }), c('ig:12', { vendedor: 'Marianne Molina', atencion: 'lead' })]);
ok('cuando le asignan una conversación, suena y sale "Nueva conversación para ti"', sonidos === 1 && toasts.some(t => /Nueva conversación para ti: <b>Persona ig:11<\/b>/.test(t)) && !toasts.some(t => /ig:12/.test(t)));
toasts.length = 0;
ctx._waAvisar('instagram', [c('ig:10', { vendedor: 'Liz Alejandra' }), c('ig:11', { vendedor: 'Liz Alejandra', atencion: 'lead', ultimoEntranteHora: hace(0), ultimoAutor: 'cliente', noLeidos: 1 }), c('ig:12', { vendedor: 'Marianne Molina', atencion: 'lead', ultimoEntranteHora: hace(0), ultimoAutor: 'cliente' })]);
ok('cuando le escribe alguien de las suyas que espera, avisa "te escribió" (las de otros no)', toasts.some(t => /<b>Persona ig:11<\/b> te escribió/.test(t)) && !toasts.some(t => /ig:12/.test(t)));
ok('la pestaña del navegador muestra cuántas de las suyas tienen mensajes sin leer', (ctx._waConvs = [c('ig:11', { vendedor: 'Liz Alejandra', noLeidos: 2 }), c('ig:13', { vendedor: 'Liz Alejandra', noLeidos: 1 }), c('ig:14', { vendedor: 'Otro', noLeidos: 4 })], ctx._waTitulo(), doc.title === '(2) PAGASI 26 — Sistema'));
toasts.length = 0;
ctx._waAvisar('instagram', [c('ig:20', { vendedor: 'Liz Alejandra', nombre: '<img src=x onerror=alert(1)>' })]);
ok('el nombre en el aviso va escapado (viene de Instagram)', toasts.some(t => /&lt;img src=x onerror=alert\(1\)&gt;/.test(t)) && !toasts.some(t => /<img/.test(t)));
// Quien tiene Redes queda escuchando desde que entra (los avisos llegan en cualquier pantalla)
escuchas.length = 0; ctx._waCfg = null; ctx._waUnsubs = {};
ctx.waVigilar();
setImmediate(() => {
  ok('al entrar, quien tiene Instagram queda escuchando sus conversaciones', escuchas.includes('conversaciones'));
  const app = fs.readFileSync(path.join(ROOT, 'assets/pagasi-app.js'), 'utf8');
  ok('...lo arranca el sistema junto con el tiempo real', /function startRealtime\(\)\{[\s\S]{0,400}waVigilar\(\)/.test(app));

  // ── 3. En la ventana de Paola se escoge quién recibe ──
  const h = ctx._rsRepartoHtml({ reparto: { activo: true } }, true);
  ok('la ventana de Paola tiene "Reparto entre vendedores" con su interruptor', /Reparto entre vendedores/.test(h) && /id="rs-rep-on" checked/.test(h));
  el('rs-rep');
  ctx.DB = { getUsuarios: () => Promise.resolve([
    { nombre: 'Liz Alejandra', rol: 'Vendedor', permisos: ['instagram'] }, { nombre: 'Marianne Molina', rol: 'Empleado', permisos: ['instagram', 'whatsapp'] },
    { nombre: 'adam', rol: 'Administrador', permisos: [] }, { nombre: 'Concesionario X', rol: 'Vendedor Concesionario', permisos: ['instagram'] },
    { nombre: 'Aliado Y', rol: 'Aliado' }, { nombre: 'Suspendida', rol: 'Empleado', permisos: ['instagram'], suspendido: true }, { nombre: 'Cobradora', rol: 'Empleado', permisos: ['pagos'] }] ) };
  ctx._waConvs = [c('ig:30', { vendedor: 'Marianne Molina' })];
  ctx._rsCargarCandidatos({ reparto: {} }, true);
  setImmediate(() => {
    const r = els['rs-rep'].innerHTML;
    ok('pueden recibir quienes tienen Redes (no aliados, ni vendedores de concesionario, ni suspendidos)', /Liz Alejandra/.test(r) && /Marianne Molina/.test(r) && /adam <small>administrador/.test(r) && !/Concesionario X|Aliado Y|Suspendida|Cobradora/.test(r));
    ok('sin lista guardada se proponen los vendedores y quienes ya tienen conversaciones (no los administradores)', /value="Liz Alejandra" checked/.test(r) && /value="Marianne Molina" checked/.test(r) && /value="adam"(?! checked)/.test(r));
    ctx._rsCargarCandidatos({ reparto: { vendedores: ['Marianne Molina'], ultimo: 'Marianne Molina' } }, true);
    setImmediate(() => {
      const r2 = els['rs-rep'].innerHTML;
      ok('con lista guardada se marcan esos y dice a quién le tocó la última', /value="Marianne Molina" checked/.test(r2) && /value="Liz Alejandra"(?! checked)/.test(r2) && /La última fue para Marianne Molina/.test(r2));
      const red = fs.readFileSync(path.join(ROOT, 'modules/redes.js'), 'utf8');
      ok('al guardar va { activo, vendedores } y el turno lo conserva el servidor; encendido sin nadie marcado no deja guardar', /datos\.reparto = \{ activo: !!rep\.checked, vendedores: lista \}/.test(red) && /Para repartir, marca al menos un vendedor/.test(red));
      // ── 4. El botón del sonido: probar y escoger (Adam: "ponme un botón del sonido… que lo puedan cambiar los vendedores") ──
      const guardado = {}; ctx.localStorage = { getItem: k => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); } };
      ctx._waSonar = sonarReal;
      ok('hay 6 opciones (5 sonidos y "Sin sonido") y por defecto suena el ding-dong', ctx.WA_SONIDOS.length === 6 && ctx.WA_SONIDOS.some(x => x.id === 'nada') && ctx.waSonidoActual() === 'dingdong');
      ctx.waSonidoGuardar('campana'); ctx.waSonidoGuardar('inventado');
      ok('cada quien escoge el suyo y queda guardado en su navegador (lo raro no se guarda)', ctx.waSonidoActual() === 'campana' && guardado.pg_sonido_redes === 'campana');
      let osc = 0; ctx.AudioContext = function(){ this.state = 'running'; this.currentTime = 0; this.destination = {}; this.createOscillator = () => { osc++; return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }; this.createGain = () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }); };
      ctx._waSonar('pip', true);
      ok('"Probar" suena el escogido (dos pitidos = dos tonos)', osc === 2);
      osc = 0; ctx._waSonar('nada', true);
      ok('"Sin sonido" no suena', osc === 0);
      ['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q', 'rs-vend'].forEach(el);
      const pag = ctx.PG.redes(); flush();
      ok('en Redes sociales está el botón "Sonido" junto a Paola', /id="rs-son-btn" onclick="rsSonido\(\)"[^>]*>[\s\S]*?Sonido<\/button>/.test(pag));
      ['mtt', 'msb', 'modal-box', 'mbd', 'mft', 'ov', 'mic'].forEach(id => { el(id).style = {}; });
      ctx.rsSonido();
      const mod = els['mbd'].innerHTML;
      ok('la ventana del sonido muestra las 6 opciones, marcada la de esta persona, con "Probar" en cada sonido', (mod.match(/name="rs-sonido"/g) || []).length === 6 && /value="campana" checked/.test(mod) && (mod.match(/▶ Probar/g) || []).length === 5);
      ctx.rsSonidoEscoger('nada');
      ok('al escoger "Sin sonido" queda guardado y el botón muestra la campana tachada', guardado.pg_sonido_redes === 'nada' && /M3 3l18 18/.test(ctx._rsIconoSonido()));
      // ── 5. Seguimiento automático en la ventana de Paola ──
      ctx._waConvs = [c('ig:40', { seguimientoEnviado: new Date().toISOString() }), c('ig:41')];
      const sg = ctx._rsSeguimientoHtml({ seguimiento: { activo: false } }, true);
      ok('la ventana de Paola trae "Seguimiento automático" apagado, con el texto aprobado y cuántos se mandaron', /Seguimiento automático/.test(sg) && /Apagado\./.test(sg) && /id="rs-seg-on">/.test(sg) && /Hola \{nombre\} 👋 ¿Pudiste pensarlo\? Si quieres, te hago la solicitud por aquí mismo, son unos datos cortos\./.test(sg) && /Últimos 7 días: 1 seguimiento enviados/.test(sg));
      ok('...al guardar va { activo, texto } a config/asistente.seguimiento', /datos\.seguimiento = \{ activo: !!seg\.checked, texto: tx\.slice\(0, 500\) \}/.test(fs.readFileSync(path.join(ROOT, 'modules/redes.js'), 'utf8')));
      ok('el texto del panel es el mismo que manda el servidor', ctx.RS_SEGUIMIENTO_TEXTO === require(path.join(ROOT, 'functions/lib/procesar.js')).SEGUIMIENTO_TEXTO);
      console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
    });
  });
});
