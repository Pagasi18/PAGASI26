// 24-oct-2026, Adam: "dale arranca con todo". Herramientas para los vendedores en la caja de escribir de Redes:
// respuestas rápidas (las de fábrica salen del manual de Paola; un administrador las edita para todos) y la foto de
// una moto del catálogo. Y la auditoría (A4): los nombres que vienen de afuera se escapan en el panel.
process.env.TZ = 'America/Caracas';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', hidden: true, style: {}, className: '', scrollTop: 0, scrollHeight: 0 }); }
const doc = { activeElement: null, getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} };
const timers = [], toasts = [], guardados = [];
let admin = true;
const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, location: { origin: 'https://pagasi.io' }, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  S: { page: 'redes', currentUser: { nombre: 'Marianne Molina', uid: 'u2' }, creds: [], pagos: [], clientes: [] }, PG: {}, nav() {}, toast: (t) => toasts.push(t), logActividad() {}, closeM() {}, saveM() {},
  isAdminUser: () => admin, fmt: (n) => '$' + n, hoyLocalISO: () => '2026-10-24', CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
  fetch() { return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); } };
ctx.window = ctx;
function consulta(col) { const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, get() { return Promise.resolve({ docs: [] }); }, onSnapshot() { return () => {}; },
  doc(id) { return { get() { return new Promise(() => {}); }, set(d, o) { guardados.push({ col, id, d, o }); return Promise.resolve(); }, collection: consulta }; } }; return q; }
ctx.db = { collection: consulta };
vm.createContext(ctx);
for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(src(f), ctx, { filename: f });
const flush = () => { while (timers.length) timers.shift()(); };
const hoy = new Date().toISOString();
ctx._waCfg = { conectado: false, instagram: '' };
ctx._cat = { cargado: true, motos: [
  { id: 1, name: 'BRZ 200', image: 'assets/motos/brz-200.jpg', precio: 1750, sedeName: 'EK Bello Monte' },
  { id: 2, name: 'Veloz', image: 'assets/motos/veloz.jpg', precio: 1390, sedeName: 'Veloz Chacao' },
  { id: 3, name: 'Sin foto', precio: 900 }, { id: 4, name: 'Oculta', image: 'assets/motos/x.jpg', disponible: false }],
  cond: { inicialMin: 40, inicialMax: 60, plazos: [6, 9, 12] } };
ctx._waConvs = [{ id: 'ig:1', canal: 'instagram', area: 'ventas', nombre: 'luis PÉREZ', ultimoMensaje: 'hola', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy }];
ctx._rsTab = 'instagram'; ctx._rsVista = 'bandeja'; ctx._waSel = 'ig:1'; ctx._waVendSel = '';
['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q', 'rs-vend'].forEach(el); ctx.PG.redes(); flush();

// ── 1. Respuestas rápidas ──
ok('la caja de escribir trae los botones "Respuestas" y "Foto de moto"', /onclick="waRespuestas\('ig:1'\)"[\s\S]*Respuestas<\/button>/.test(els['wa-hilo'].innerHTML) && /onclick="waFotoMoto\('ig:1'\)"[\s\S]*Foto de moto<\/button>/.test(els['wa-hilo'].innerHTML));
const manual = src('functions/lib/ventas.js');
const req = ctx.WA_RESPUESTAS_BASE.find(r => r.titulo === 'Requisitos');
ok('las de fábrica salen del manual de Paola (los requisitos, palabra por palabra)', req && req.texto.split('\n').every(l => manual.indexOf(l.trim()) > -1));
ok('el texto se completa: nombre de la persona, quien escribe y las condiciones del catálogo', ctx.waLlenarRespuesta('Hola {nombre} 👋, soy {yo}. Inicial {inicial}%, hasta {inicialMax}%, a {plazos} meses.', ctx._waConvs[0]) === 'Hola Luis 👋, soy Marianne. Inicial 40%, hasta 60%, a 6, 9 o 12 meses.');
el('wa-rr'); el('wa-texto');
ctx.waRespuestas('ig:1');
ok('el panel muestra las respuestas (y "Editar" a un administrador)', els['wa-rr'].hidden === false && (els['wa-rr'].innerHTML.match(/class="wa-rr-i"/g) || []).length === 6 && /Editar<\/button>/.test(els['wa-rr'].innerHTML));
els['wa-texto'] = { id: 'wa-texto', value: 'Claro,', selectionStart: 6, selectionEnd: 6, getAttribute: () => 'ig:1', focus() {}, setSelectionRange() {} };
ctx.waUsarRespuesta('ig:1', 4);
ok('tocar una la pone en la caja donde está el cursor (se puede editar antes de enviar) y queda guardada como borrador', els['wa-texto'].value === 'Claro, Sí, puedes pagar la inicial y las cuotas en bolívares, a la tasa oficial del euro del BCV del día del pago.' && ctx._waBorradores['ig:1'] === els['wa-texto'].value && els['wa-rr'].hidden === true);
admin = false; ctx.waRespuestas('ig:1');
ok('un vendedor las usa pero no ve "Editar"', !/Editar<\/button>/.test(els['wa-rr'].innerHTML));
admin = true; ctx.waRespuestas('ig:1');
['mtt', 'msb', 'modal-box', 'mbd', 'mft', 'ov'].forEach(el);
ctx.waEditarRespuestas();
ok('el administrador edita la lista (título y texto, quitar y agregar)', (els['mbd'].innerHTML.match(/class="wa-rr-ed"/g) || []).length === 6 && /\+ Agregar respuesta/.test(els['mbd'].innerHTML));
ctx._waRrEdit.push({ titulo: 'Horario', texto: 'Atendemos de lunes a sábado.' }); ctx._waRrEdit.push({ titulo: '', texto: 'vacía' });
ctx.S.saveFn();
setImmediate(() => {
  const g = guardados.find(x => x.col === 'config' && x.id === 'asistente');
  ok('al guardar va a config/asistente.respuestasRapidas para todo el equipo (las vacías no)', g && g.o && g.o.merge && g.d.respuestasRapidas.length === 7 && g.d.respuestasRapidas[6].titulo === 'Horario' && ctx.waRespuestasLista().length === 7);

  // ── 2. La foto de la moto ──
  ctx.waFotoMoto('ig:1');
  ok('la foto: solo motos con foto y que se ven en la web, con nombre, precio y sede', (els['wa-fotos'] ? true : (el('wa-fotos'), ctx._waFotoFiltrar(''), true)) && /BRZ 200/.test(els['wa-fotos'].innerHTML) && /\$1\.750 · EK Bello Monte/.test(els['wa-fotos'].innerHTML) && !/Sin foto|Oculta/.test(els['wa-fotos'].innerHTML));
  ctx._waFotoFiltrar('veloz');
  ok('se puede buscar', /Veloz/.test(els['wa-fotos'].innerHTML) && !/BRZ 200/.test(els['wa-fotos'].innerHTML));
  el('wa-foto-sel'); ctx._waFotoEscoger(0);
  ok('al escoger una sale la foto con su texto para revisarlo', /<textarea class="fta" id="wa-foto-txt" rows="2">BRZ 200 · \$1\.750 · EK Bello Monte<\/textarea>/.test(els['wa-foto-sel'].innerHTML) && /Enviar foto/.test(els['mft'].innerHTML));
  els['wa-foto-txt'] = { value: 'Esta es la BRZ 200' };
  ctx._waFotoEnviar();
  const ultimo = (ctx._waMsgs['ig:1'] || []).slice(-1)[0] || {};
  ok('al enviar va la foto con el enlace completo de pagasi.io y su texto', ultimo.tipo === 'imagen' && ultimo.medio.url === 'https://pagasi.io/assets/motos/brz-200.jpg' && ultimo.texto === 'Esta es la BRZ 200' && toasts.some(t => /Foto enviada: BRZ 200/.test(t)));
  ok('...y se le pide al servidor con la foto (imagen) en el mismo envío del equipo', /JSON\.stringify\(Object\.assign\(\{ empresa: waEmpresa\(\), conv: id, texto: texto \}, imagen \? \{ imagen: imagen \} : \{\}\)\)/.test(src('logic/whatsapp.js')));

  // ── 3. Nombres escapados en el panel (auditoría A4) ──
  const c2 = { console, document: { getElementById() { return null; } } };
  vm.createContext(c2);
  const app = src('assets/pagasi-app.js');
  const f = n => { const i = app.indexOf('function ' + n + '('); let j = app.indexOf('{', i), k = j, d = 0; for (; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}' && --d === 0) break; } return app.slice(i, k + 1); };
  vm.runInContext(f('pgEsc') + '\n' + f('pgHtmlSeguro'), c2);
  ok('pgEsc escapa todo; pgHtmlSeguro deja solo negritas y cursivas', c2.pgEsc('<img src=x onerror="a()">') === '&lt;img src=x onerror=&quot;a()&quot;&gt;' && c2.pgHtmlSeguro('Listo <b>Ana</b> <img src=x onerror=a()>') === 'Listo <b>Ana</b> &lt;img src=x onerror=a()&gt;');
  ok('los avisos (toast) y la ventana de eliminar pasan por pgHtmlSeguro', /<span>\$\{pgHtmlSeguro\(msg\)\}<\/span>/.test(app) && /pgHtmlSeguro\(opts\.descripcion/.test(app));
  ok('Créditos y Pagos muestran el nombre del cliente escapado', /title="\$\{pgEsc\(c\.cli\)\}">\$\{pgEsc\(c\.cli\)\}/.test(src('modules/creditos.js')) && /\$\{pgEsc\(p\.cli\)\}<\/td>/.test(src('modules/pagos.js')) && /\$\{pgEsc\(c\.cli\)\} \(\$\{pgEsc\(c\.modelo\)\}\)<\/option>/.test(src('logic/pagos.js')));
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
});
