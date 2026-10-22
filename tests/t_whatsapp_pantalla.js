// 19-oct-2026: Adam, en el modulo Instagram: "cada vez que hago click me cambia el formato" y
// "ponle filtros". La pantalla de conversaciones (compartida por WhatsApp e Instagram) ahora
// cambia de conversacion y se refresca EN EL SITIO (sin nav), tiene filtros y marca leido al abrir.
// Desde el 22-oct-2026 la pantalla vive en Redes sociales (modules/redes.js), pestana Instagram.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

// Documento falso: elementos por id con innerHTML/textContent/value
const els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', scrollTop: 0, scrollHeight: 0 }); }
const doc = { getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; } };
const navs = [], toasts = [], escritos = [], timers = [];
const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  S: { page: 'redes', currentUser: { nombre: 'Adam', uid: 'u1' }, creds: [], pagos: [] }, PG: {}, nav: (p) => navs.push(p), toast: (t) => toasts.push(t), logActividad() {},
  isAdminUser: () => true, fmt: (n) => '$' + n, hoyLocalISO: () => '2026-10-19', CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
  fetch() { return Promise.resolve({ ok: false, json: () => Promise.resolve({}) }); } };
ctx.window = ctx;
ctx.db = { collection() { return { doc(id) { return { set(c) { escritos.push({ id, c }); return Promise.resolve(); }, collection() { return { orderBy() { return this; }, limit() { return this; }, onSnapshot(cb) { cb({ docs: [] }); return () => {}; } }; } }; }, where() { return this; }, orderBy() { return this; }, limit() { return this; }, onSnapshot() { return () => {}; } }; } };
vm.createContext(ctx);
for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const flush = () => { while (timers.length) timers.shift()(); };

// Instagram conectado, tres conversaciones con estados distintos
ctx._waCfg = { instagram: 'pagasi.io', conectado: false };
const hoy = new Date().toISOString(), ayer = new Date(Date.now() - 86400000).toISOString();
ctx._waConvs = [
  { id: 'ig:1', canal: 'instagram', area: 'ventas', nombre: 'Mootoro', usuario: 'mootoroebikes', modo: 'bot', noLeidos: 3, ultimoMensaje: 'Por aquí no manejo saldos', ultimoMensajeHora: hoy, ultimoEntranteHora: ayer, ultimoAutor: 'asistente' },
  { id: 'ig:2', canal: 'instagram', area: 'ventas', nombre: 'Ana', usuario: 'ana', modo: 'bot', noLeidos: 1, ultimoMensaje: 'hola?', ultimoMensajeHora: ayer, ultimoEntranteHora: ayer, atencion: 'pide_persona' },
  { id: 'ig:3', canal: 'instagram', area: 'ventas', nombre: 'Luis', usuario: 'luis', modo: 'humano', atendidoPor: 'Adam', noLeidos: 0, ultimoMensaje: 'gracias', ultimoMensajeHora: ayer, ultimoEntranteHora: ayer, ultimoAutor: 'equipo', borrador: { tipo: 'lead', modelo: 'BRZ 200' } }
];
// Montar la pantalla como lo hace nav('instagram'): Redes sociales en la pestana Instagram
['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q', 'wa-st-conv', 'wa-st-esperan', 'wa-st-leads', 'rs-b-instagram'].forEach(el);
ctx._rsTab = 'instagram';
const html = ctx.PG.redes();
ok('la pantalla trae lista, filtros, hilo y ficha', /id="wa-filtros"/.test(html) && /id="wa-hilo"/.test(html) && /id="wa-ficha"/.test(html));
flush();
ok('los filtros se pintan con sus cantidades', /Todas<i>3<\/i>/.test(els['wa-filtros'].innerHTML) && /Sin responder<i>1<\/i>/.test(els['wa-filtros'].innerHTML) && /Esperan persona<i>1<\/i>/.test(els['wa-filtros'].innerHTML) && /Quieren comprar<i>1<\/i>/.test(els['wa-filtros'].innerHTML));
ok('el filtro "Con promesa" (de cobranza) no sale en ventas', !/Con promesa/.test(els['wa-filtros'].innerHTML));
ok('la lista muestra las 3 y marca la que está sin responder', (els['wa-items'].innerHTML.match(/class="wa-item/g) || []).length === 3 && /class="sr"/.test(els['wa-items'].innerHTML));
ok('se abre la primera (Mootoro) en el hilo y la ficha', ctx._waSel === 'ig:1' && /Mootoro/.test(els['wa-hilo'].innerHTML) && /@mootoroebikes/.test(els['wa-ficha'].innerHTML));
ok('al abrirla queda leída: noLeidos 0 y se guarda en la base', ctx._waConvs[0].noLeidos === 0 && escritos.some(e => e.id === 'ig:1' && e.c.noLeidos === 0));
ok('la lista ya no marca a Mootoro como no leída', !/waAbrir\('ig:1'\)" data-nl/.test(els['wa-items'].innerHTML) && /waAbrir\('ig:2'\)" data-nl="1"/.test(els['wa-items'].innerHTML));

// Filtros
ctx.waFiltro('sin');
ok('filtro Sin responder deja solo a Ana', (els['wa-items'].innerHTML.match(/class="wa-item/g) || []).length === 1 && /Ana/.test(els['wa-items'].innerHTML));
ctx.waFiltro('humano');
ok('filtro Atiende una persona deja solo a Luis', (els['wa-items'].innerHTML.match(/class="wa-item/g) || []).length === 1 && /Luis/.test(els['wa-items'].innerHTML));
ctx.waFiltro('leads');
ok('filtro Quieren comprar deja solo a Luis', /Luis/.test(els['wa-items'].innerHTML) && !/Ana/.test(els['wa-items'].innerHTML));
ctx.waFiltro('todas');

// Clic en otra conversacion: en el sitio, sin nav
navs.length = 0; els['wa-texto'] = el('wa-texto'); els['wa-texto'].value = 'borrador que estaba escribiendo';
ctx.waAbrir('ig:2');
ok('abrir otra conversación no recarga la página (sin nav)', navs.length === 0 && ctx._waSel === 'ig:2');
ok('el hilo y la ficha pasan a Ana', /Ana/.test(els['wa-hilo'].innerHTML) && /@ana/.test(els['wa-ficha'].innerHTML));
ok('la lista marca a Ana como seleccionada', /wa-item on" onclick="waAbrir\('ig:2'\)/.test(els['wa-items'].innerHTML));
ok('Ana quedó leída al abrirla', ctx._waConvs[1].noLeidos === 0);

// Llega un cambio de la base: se refresca en el sitio y los contadores
ctx._waConvs[2].atencion = 'lead';
ok('_waRefrescarEnSitio devuelve true con la pantalla puesta', ctx._waRefrescarEnSitio() === true && navs.length === 0);
ok('los contadores de los filtros se actualizan en el sitio', /Esperan persona<i>2<\/i>/.test(els['wa-filtros'].innerHTML) && /Todas<i>3<\/i>/.test(els['wa-filtros'].innerHTML));
// Si cambia la conversacion abierta (p. ej. la toma una persona) se repinta hilo y ficha
ctx._waConvs[1].modo = 'humano'; ctx._waConvs[1].atendidoPor = 'Adam';
ctx._waRefrescarEnSitio();
ok('el hilo refleja que ahora la atiende Adam', /lo atiende Adam/.test(els['wa-hilo'].innerHTML));
// Y si no cambio nada de la abierta, no se repinta el hilo (no interrumpe lo que escribes)
els['wa-hilo'].innerHTML = 'MARCA'; ctx._waRefrescarEnSitio();
ok('sin cambios en la abierta, el hilo no se vuelve a armar', els['wa-hilo'].innerHTML === 'MARCA');

// En Redes sociales pero sin la lista (cola de hoy, comentarios, asistentes): no se recarga la
// pagina, que borraria lo que se esta escribiendo en las instrucciones
delete els['wa-items'];
ok('en Redes sociales sin la lista, _waRefrescarEnSitio no pide recargar', ctx._waRefrescarEnSitio() === true);
// En otra pagina devuelve false y el que llama hace nav
ctx.S.page = 'clientes';
ok('en otra página, _waRefrescarEnSitio devuelve false', ctx._waRefrescarEnSitio() === false);
ctx.waAbrir('ig:3');
ok('desde otra página, abrir una conversación navega a Redes sociales, en su pestaña', navs[navs.length - 1] === 'redes' && ctx._rsTab === 'instagram' && ctx._waSel === 'ig:3');

console.log(`\n${pass} OK, ${fail} FALLA`);
process.exit(fail ? 1 : 0);
