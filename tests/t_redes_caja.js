// 23-oct-2026, Adam: "el módulo de redes sociales tiene como un latido y cuando el vendedor está
// escribiendo y viene un latido se le borra lo que escribió". El "latido" era el redibujo por tiempo
// real: cada vez que alguien del equipo guarda algo (un pago, un crédito…) la pantalla abierta se
// arma de nuevo, y la caja de escribir salía vacía (el cursor sí volvía). Ahora la bandeja se
// refresca en el sitio, lo escrito se guarda por conversación y, en todo el sistema, el redibujo
// devuelve lo escrito además del cursor.
process.env.TZ = 'America/Caracas';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

// ── 1. La bandeja de Redes ──
const els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', scrollTop: 0, scrollHeight: 0 }); }
const doc = { activeElement: null, getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; } };
const navs = [], timers = [], toasts = [];
const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  S: { page: 'redes', currentUser: { nombre: 'Ana', uid: 'u1' }, creds: [], pagos: [], clientes: [] }, PG: {}, nav: (p) => navs.push(p), toast: (t) => toasts.push(t), logActividad() {},
  isAdminUser: () => true, fmt: (n) => '$' + n, hoyLocalISO: () => '2026-10-23', CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
  fetch() { return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); } };
ctx.window = ctx;
function consulta() { const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, get() { return Promise.resolve({ docs: [] }); }, onSnapshot() { return () => {}; }, doc() { return { get() { return new Promise(() => {}); }, set() { return Promise.resolve(); }, collection: consulta }; } }; return q; }
ctx.db = { collection: consulta };
vm.createContext(ctx);
for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const flush = () => { while (timers.length) timers.shift()(); };
const hoy = new Date().toISOString(), haceDias = new Date(Date.now() - 9 * 86400000).toISOString();
ctx._waCfg = { conectado: false, instagram: '' };   // demostración: no se manda nada a ningún lado
ctx._waConvs = [
  { id: 'ig:1', canal: 'instagram', area: 'ventas', nombre: 'Luis', ultimoMensaje: 'precio?', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy },
  { id: 'ig:2', canal: 'instagram', area: 'ventas', nombre: 'Rosa', ultimoMensaje: 'hola', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy },
  { id: 'ig:3', canal: 'instagram', area: 'ventas', nombre: 'Pedro', ultimoMensaje: 'info', ultimoMensajeHora: haceDias, ultimoEntranteHora: haceDias }
];
ctx._rsTab = 'instagram'; ctx._rsVista = 'bandeja'; ctx._waSel = 'ig:1';
const montar = () => { ['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q'].forEach(el); ctx.PG.redes(); flush(); };
montar();
// El vendedor escribe en la caja de Luis (la caja del navegador: guarda lo escrito con oninput)
let enfocada = null, cursor = null;
function caja(conv, texto) {
  els['wa-texto'] = { id: 'wa-texto', value: texto, selectionStart: texto.length, selectionEnd: texto.length, getAttribute: (k) => (k === 'data-conv' ? conv : null),
    focus() { enfocada = conv; }, setSelectionRange(a, b) { cursor = [a, b]; } };
  ctx._waGuardarBorrador(conv, texto);
  doc.activeElement = els['wa-texto'];
}
ok('la caja lleva su conversación y guarda lo escrito al teclear', /id="wa-texto" data-conv="ig:1" oninput="_waGuardarBorrador\('ig:1', this\.value\)"/.test(els['wa-hilo'].innerHTML));
caja('ig:1', 'Hola Luis, la BRZ está en');
const hiloAntes = els['wa-hilo'].innerHTML;
navs.length = 0;
ok('cuando alguien del equipo guarda algo, la bandeja se refresca en el sitio (sin armar la página)', ctx.waRefrescarPorDatos() === true && navs.length === 0);
ok('...y la caja no se toca: lo escrito sigue ahí', els['wa-hilo'].innerHTML === hiloAntes && els['wa-texto'].value === 'Hola Luis, la BRZ está en');
// Llega algo de la misma conversación (cambia su resumen): el hilo se arma de nuevo
ctx._waConvs[0].resumen = 'Pregunta por la BRZ';
enfocada = null; cursor = null;
ctx._waRefrescarEnSitio();
ok('si el hilo se vuelve a armar, la caja sale con lo escrito', />Hola Luis, la BRZ está en<\/textarea>/.test(els['wa-hilo'].innerHTML));
ok('...y el cursor vuelve a donde estaba', enfocada === 'ig:1' && cursor && cursor[0] === 25 && cursor[1] === 25);
// Aunque la página se arme entera (otra vista y vuelta), lo escrito no se pierde
montar();
ok('aunque la página se arme entera, la caja sale con lo escrito', />Hola Luis, la BRZ está en<\/textarea>/.test(els['wa-hilo'].innerHTML));
// Cambiar de conversación y volver
doc.activeElement = null;
ctx.waAbrir ? ctx.waAbrir('ig:2') : (ctx._waSel = 'ig:2', ctx._waPintarSeleccion()); flush();
ok('en otra conversación la caja empieza vacía', /data-conv="ig:2"[^>]*><\/textarea>/.test(els['wa-hilo'].innerHTML));
caja('ig:2', 'Rosa, ');
ctx.waAbrir ? ctx.waAbrir('ig:1') : (ctx._waSel = 'ig:1', ctx._waPintarSeleccion()); flush();
ok('al volver a la de Luis, su mensaje a medio escribir sigue ahí', />Hola Luis, la BRZ está en<\/textarea>/.test(els['wa-hilo'].innerHTML) && ctx._waBorradores['ig:2'] === 'Rosa, ');
// Enviar
caja('ig:1', 'Hola Luis, la BRZ está en $1.750');
ctx._waEnviarDesdeCaja('ig:1');
ok('al enviar, la caja se vacía y se olvida el borrador', els['wa-texto'].value === '' && !('ig:1' in ctx._waBorradores) && /\$1\.750/.test(ctx._waConvs[0].ultimoMensaje));
caja('ig:3', 'Pedro, ¿sigues interesado?');
toasts.length = 0;
ctx._waEnviarDesdeCaja('ig:3');
ok('si no sale (ventana cerrada), lo escrito se queda en la caja', els['wa-texto'].value === 'Pedro, ¿sigues interesado?' && ctx._waBorradores['ig:3'] === 'Pedro, ¿sigues interesado?' && toasts.some(t => /ventana de 7 días/.test(t)));
// En la cola de hoy o en Métricas no hay bandeja: se redibuja como siempre
delete els['wa-items'];
ok('en las otras vistas de Redes se redibuja como siempre', ctx.waRefrescarPorDatos() === false);

// ── 2. El redibujo por tiempo real del sistema (assets/pagasi-app.js) ──
const app = fs.readFileSync(path.join(ROOT, 'assets/pagasi-app.js'), 'utf8');
function funcion(nombre) {
  const i = app.indexOf('function ' + nombre + '('); let j = app.indexOf('{', i), n = 0, k = j;
  for (; k < app.length; k++) { if (app[k] === '{') n++; else if (app[k] === '}' && --n === 0) break; }
  return app.slice(i, k + 1);
}
const pantalla = {};
const c2 = { console: { warn() {} }, Date, S: { currentUser: { nombre: 'Ana' }, page: 'redes' }, window: {}, navs: 0, enSitio: null,
  setTimeout(fn) { fn(); }, _perfAnotar() {},
  document: { activeElement: null, getElementById: (id) => pantalla[id] || null } };
c2.nav = () => { c2.navs++; Object.keys(pantalla).forEach(id => { pantalla[id] = campo(id, pantalla[id].tagName, pantalla[id].tipo, pantalla[id].render); }); };
function campo(id, tag, tipo, render) { return { id, tagName: tag, tipo, render: render || '', value: render || '', selectionStart: 0, selectionEnd: 0, getAttribute: (k) => (k === 'type' ? tipo : null), focus() { c2.document.activeElement = this; }, setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; } }; }
vm.createContext(c2);
vm.runInContext('var _rtRenderPending = true, _rtUltimoRender = 0;\n' + funcion('_captureFocus') + '\n' + funcion('_restoreFocus') + '\n' + funcion('_rtRedibujar'), c2);
c2.waRefrescarPorDatos = () => true;
c2._rtRedibujar();
ok('en Redes sociales el redibujo por tiempo real no arma la página: la refresca en el sitio', c2.navs === 0);
c2.waRefrescarPorDatos = () => false;
c2._rtRedibujar();
ok('...salvo en las vistas sin bandeja, que se redibujan como siempre', c2.navs === 1);
// Cualquier otra pantalla: el empleado escribe una nota y llega un pago de otro empleado
c2.S.page = 'clientes'; c2.navs = 0;
pantalla.nota = campo('nota', 'TEXTAREA', null, '');
pantalla.nota.value = 'Llamar mañana a las 10'; pantalla.nota.selectionStart = pantalla.nota.selectionEnd = 22;
c2.document.activeElement = pantalla.nota;
c2._rtRedibujar();
ok('en las demás pantallas, el redibujo devuelve lo escrito (no solo el cursor)', c2.navs === 1 && pantalla.nota.value === 'Llamar mañana a las 10' && c2.document.activeElement === pantalla.nota && pantalla.nota.selectionStart === 22);
pantalla.monto = campo('monto', 'INPUT', 'number', '');
pantalla.monto.value = '75'; c2.document.activeElement = pantalla.monto;
c2._rtRedibujar();
ok('también en los campos de una línea', pantalla.monto.value === '75');
pantalla.buscar = campo('buscar', 'INPUT', 'text', '');
c2.document.activeElement = pantalla.buscar;   // el formulario ya lo vació al guardar
c2._rtRedibujar();
ok('si el formulario ya vació el campo al guardar, se queda vacío', pantalla.buscar.value === '');
pantalla.fecha = campo('fecha', 'SELECT', null, 'b');
pantalla.fecha.value = 'a'; c2.document.activeElement = pantalla.fecha;
c2._rtRedibujar();
ok('las listas desplegables no se tocan (manda lo que pinta la pantalla)', pantalla.fecha.value === 'b');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
