// 24-oct-2026, Adam: "dale arranca con todo". En Redes: notas internas y etapa del cliente en la ficha, 👍/👎 a las
// respuestas de la asistente (y su resumen en la ventana de Paola), y métricas por vendedor. El servidor lo guarda
// (tests/t_whatsapp_webhook.js); aquí, la pantalla.
process.env.TZ = 'America/Caracas';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', hidden: true, style: {}, className: '', scrollTop: 0, scrollHeight: 0 }); }
const doc = { activeElement: null, getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} };
const timers = [], toasts = [];
const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, location: { origin: 'https://pagasi.io' }, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  S: { page: 'redes', currentUser: { nombre: 'Liz Alejandra', uid: 'u3' }, creds: [], pagos: [], clientes: [] }, PG: {}, nav() {}, toast: (t) => toasts.push(t), logActividad() {}, closeM() {},
  isAdminUser: () => true, prompt: () => 'Dio un precio viejo', fmt: (n) => '$' + n, hoyLocalISO: () => '2026-10-24', CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
  fetch() { return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); } };
ctx.window = ctx;
let calidad = [];
function consulta(col) { const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, get() { return Promise.resolve({ docs: [] }); }, onSnapshot() { return () => {}; },
  doc(id) { return { get() { return Promise.resolve({ exists: id === 'asistenteCalidad', data: () => ({ lista: calidad }) }); }, set() { return Promise.resolve(); }, collection: consulta }; } }; return q; }
ctx.db = { collection: consulta };
vm.createContext(ctx);
for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const flush = () => { while (timers.length) timers.shift()(); };
const hoy = new Date().toISOString(), hace = (m) => new Date(Date.now() - m * 60000).toISOString();
ctx._waCfg = { conectado: false, instagram: '' };   // demostración: se guarda en la pantalla, sin servidor
ctx._waConvs = [{ id: 'ig:1', canal: 'instagram', area: 'ventas', nombre: 'Luis', etapa: 'solicitud', notas: [{ texto: 'Tiene la inicial', por: 'Marianne', hora: hace(60) }], ultimoMensaje: 'ok', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy }];
ctx._waMsgs = { 'ig:1': [{ id: 'mid.1', autor: 'cliente', texto: 'precio?', hora: hace(5) }, { id: 'mid.2', autor: 'asistente', texto: 'La BRZ está en $1.750.', hora: hace(4) }, { id: 'mid.3', autor: 'equipo', por: 'Liz', texto: 'Hola', hora: hace(3) }] };
ctx._rsTab = 'instagram'; ctx._rsVista = 'bandeja'; ctx._waSel = 'ig:1'; ctx._waVendSel = '';
['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q', 'rs-vend'].forEach(el); ctx.PG.redes(); flush();
el('wa-burbujas'); ctx._waPintarHilo('ig:1');

// ── 1. Notas y etapa en la ficha ──
const f = els['wa-ficha'].innerHTML;
ok('la ficha trae "Seguimiento del equipo" con la etapa y las notas internas', /Seguimiento del equipo/.test(f) && /onchange="waEtapa\('ig:1', this\.value\)"/.test(f) && /<option value="solicitud" selected>Solicitud<\/option>/.test(f) && /Tiene la inicial<\/div><small>Marianne · /.test(f) && /id="wa-nota-txt"/.test(f));
ok('una sola tarjeta de seguimiento por ficha', (f.match(/Seguimiento del equipo/g) || []).length === 1);
ok('en cobranza también hay notas (sin etapa de venta)', (() => { const fc = ctx._waHtmlFicha({ id: 'wa:1', canal: 'whatsapp', area: 'cobranza', nombre: 'María' }, {}); return (fc.match(/Seguimiento del equipo/g) || []).length === 1 && !/waEtapa/.test(fc) && /wa-nota-txt/.test(fc); })());
ok('en la lista se ve la etapa', /<span class="ambar">Solicitud<\/span>/.test(els['wa-items'].innerHTML));
el('wa-nota-txt').value = 'Viene el sábado con el fiador';
ctx.waNota('ig:1');
ok('anotar agrega la nota (con quién) y vacía la casilla', ctx._waConvs[0].notas.length === 2 && ctx._waConvs[0].notas[1].texto === 'Viene el sábado con el fiador' && ctx._waConvs[0].notas[1].por === 'Liz Alejandra' && els['wa-nota-txt'].value === '' && /Viene el sábado con el fiador/.test(els['wa-ficha'].innerHTML));
ctx.waEtapa('ig:1', 'vendido');
ok('cambiar la etapa se ve en la lista', ctx._waConvs[0].etapa === 'vendido' && /Vendido ✓/.test(els['wa-items'].innerHTML));

// ── 2. 👍/👎 en las respuestas de la asistente ──
const b = els['wa-burbujas'].innerHTML;
ok('las respuestas de la asistente traen 👍/👎 (las del equipo y del cliente no)', (b.match(/class="wa-cal"/g) || []).length === 1 && /waCalificar\('ig:1','mid\.2','mal'\)/.test(b));
ctx.waCalificar('ig:1', 'mid.2', 'mal');
ok('👎 pide qué estuvo mal y queda marcado', ctx._waMsgs['ig:1'][1].calificacion.voto === 'mal' && ctx._waMsgs['ig:1'][1].calificacion.nota === 'Dio un precio viejo' && /class="on" onclick="waCalificar\('ig:1','mid\.2','mal'\)"/.test(els['wa-burbujas'].innerHTML));
ctx.waCalificar('ig:1', 'mid.2', 'mal');
ok('tocarlo otra vez lo quita', ctx._waMsgs['ig:1'][1].calificacion === null);

// ── 3. En la ventana de Paola, lo que el equipo marcó ──
calidad = [{ conv: 'ig:1', msg: 'mid.2', voto: 'mal', por: 'Liz', hora: hace(30), area: 'ventas', texto: 'La BRZ está en $1.750.', nota: 'Dio un precio viejo' }, { conv: 'ig:2', voto: 'bien', hora: hace(60), area: 'ventas', texto: 'x' }, { conv: 'wa:1', voto: 'mal', hora: hace(60), area: 'cobranza', texto: 'y' }];
el('rs-calidad');
ctx._rsCargarCalidad(ctx.RS_ASIS.ventas);
setImmediate(() => {
  const q = els['rs-calidad'].innerHTML;
  ok('la ventana de Paola resume 👍/👎 de la semana (solo las suyas) y lista las 👎 con su nota y enlace', /👍 <b>1<\/b> bien/.test(q) && /👎 <b>1<\/b> mal/.test(q) && /«La BRZ está en \$1\.750\.»/.test(q) && /Dio un precio viejo/.test(q) && /waAbrir\('ig:1'\)/.test(q) && !/«y»/.test(q));

  // ── 4. Métricas por vendedor ──
  ctx.S.creds = [{ id: 'M-9', clienteId: 'IG-55', estado: 'activo' }];
  const conv = (id, extra) => Object.assign({ id, canal: 'instagram', area: 'ventas', ultimoMensajeHora: hoy }, extra);
  const D = ctx._rsVendedoresDatos([
    conv('a', { vendedor: 'Liz', ultimaRespuesta: { desde: hace(40), hasta: hace(30), por: 'Liz' }, borrador: { tipo: 'lead' }, etapa: 'solicitud' }),
    conv('b', { vendedor: 'Liz', ultimaRespuesta: { desde: hace(100), hasta: hace(70), por: 'Liz' }, clienteLead: 'IG-55', borrador: { tipo: 'lead' } }),
    conv('c', { vendedor: 'Liz' }),
    conv('d', { vendedor: 'Marianne', etapa: 'vendido', modo: 'humano', atendidoPor: 'Marianne' }),
    conv('e', {}),
    conv('f', { vendedor: 'Liz', ultimoMensajeHora: hace(60 * 24 * 40) })
  ], '2026-10-01');
  const liz = D.find(r => r.nombre === 'Liz'), mar = D.find(r => r.nombre === 'Marianne'), sin = D.find(r => r.nombre === '-');
  ok('por vendedor: conversaciones del período, atendidas, cuánto tardó en contestar (mediana), quieren comprar, solicitud y vendidas', liz.n === 3 && liz.atendidas === 2 && Math.round(liz.mediana) === 10 && liz.quieren === 2 && liz.solicitud === 1 && liz.vendidas === 1);
  ok('...vendida por etapa o porque hay un crédito para ese cliente; y la fila "solo Paola" al final', mar.vendidas === 1 && sin.n === 1 && D[D.length - 1].nombre === '-');
  const h = ctx._rsVendedoresHtml([conv('a', { vendedor: 'Liz' })], '2026-10-01');
  ok('la tabla "Equipo de ventas" sale en Métricas', /<h3>Equipo de ventas<\/h3>/.test(h) && /<td>Liz<\/td>/.test(h) && /_rsVendedoresHtml\(convs, desde\)/.test(fs.readFileSync(path.join(ROOT, 'modules/redes.js'), 'utf8')));
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
});
