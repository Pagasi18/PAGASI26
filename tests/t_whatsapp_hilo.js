// 19-oct-2026: con Instagram conectado y WhatsApp todavia en demostracion, el hilo de una
// conversacion de Instagram salia en blanco: waAbrirMensajes miraba solo la conexion de WhatsApp
// y nunca se suscribia a los mensajes. La conexion que manda es la del canal de la conversacion.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const suscripciones = [], pintados = [], toasts = [];
function fakeDb(docsPorConv) {
  return { collection(col) { return { doc(id) { return { collection(sub) { return { orderBy() { return this; }, limit() { return this; }, onSnapshot(cb, err) {
    suscripciones.push({ col, id, sub });
    if (docsPorConv[id] === 'error') { err(new Error('Missing or insufficient permissions.')); return () => {}; }
    cb({ docs: (docsPorConv[id] || []).map(d => ({ id: d.id, data: () => d })) });
    return () => {};
  } }; }, set() { return Promise.resolve(); } }; }, where() { return this; }, orderBy() { return this; }, limit() { return this; }, onSnapshot() { return () => {}; } }; } };
}
const ctx = { console: { log() {}, warn() {}, error() {} }, setTimeout() { return 0; }, document: { getElementById() { return null; } }, PG: {}, S: { currentUser: { nombre: 'Adam' }, page: 'instagram' },
  toast: (t) => toasts.push(t), nav() {}, logActividad() {}, fetch() { return Promise.resolve({ ok: false, json: () => Promise.resolve({}) }); } };
ctx.window = ctx;
ctx.db = fakeDb({ 'ig:111': [{ id: 'm1', autor: 'cliente', texto: 'Hola buenas', hora: '2026-10-19T21:50:55Z' }, { id: 'm2', autor: 'asistente', texto: '¡Hola!', hora: '2026-10-19T21:50:58Z' }], 'ig:222': 'error' });
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'logic/whatsapp.js'), 'utf8'), ctx, { filename: 'logic/whatsapp.js' });
ctx._waPintarHilo = (id) => pintados.push(id);

// Instagram conectado (con el usuario de la cuenta), WhatsApp en demostracion
ctx._waCfg = { instagram: 'pagasi.io', conectado: false };
ctx._waConvs = [{ id: 'ig:111', canal: 'instagram', nombre: 'Mootoro' }, { id: 'ig:222', canal: 'instagram' }, { id: 'wa:+584121234567', canal: 'whatsapp' }];
ok('waConectadoCanal(instagram) es verdadero con el usuario de la cuenta', ctx.waConectadoCanal('instagram') === true);
ok('waConectadoCanal(whatsapp) sigue falso', ctx.waConectadoCanal('whatsapp') === false);

let recibidos = null;
ctx.waAbrirMensajes('ig:111', (m) => { recibidos = m; });
ok('se suscribe a conversaciones/ig:111/mensajes', suscripciones.some(s => s.col === 'conversaciones' && s.id === 'ig:111' && s.sub === 'mensajes'));
ok('el hilo recibe los 2 mensajes guardados', Array.isArray(recibidos) && recibidos.length === 2 && recibidos[1].texto === '¡Hola!');
ok('se pinta el hilo', pintados.includes('ig:111'));
ok('quedan en memoria para la pantalla', (ctx._waMsgs['ig:111'] || []).length === 2);

// Conversacion de WhatsApp con WhatsApp en demostracion: no toca la base y pinta lo que haya
suscripciones.length = 0; pintados.length = 0;
ctx._waMsgs['wa:+584121234567'] = [{ id: 'd1', texto: 'demo' }];
let demo = null; ctx.waAbrirMensajes('wa:+584121234567', (m) => { demo = m; });
ok('WhatsApp en demostración no se suscribe a la base', suscripciones.length === 0);
ok('WhatsApp en demostración devuelve los mensajes de muestra', demo && demo.length === 1 && demo[0].texto === 'demo');
ok('y pinta el hilo igual', pintados.includes('wa:+584121234567'));

// Si la base rechaza la lectura, se avisa en vez de dejar el hilo en blanco
pintados.length = 0; let err = null; ctx.waAbrirMensajes('ig:222', (m) => { err = m; });
ok('con error de permisos avisa con toast', toasts.some(t => /No se pudieron leer los mensajes/.test(t)));
ok('y pinta el hilo (vacío) en vez de dejarlo en blanco', pintados.includes('ig:222') && Array.isArray(err) && err.length === 0);

// La ventana de respuesta: 7 dias en Instagram, 24 h en WhatsApp
const hace = h => new Date(Date.now() - h * 3600 * 1000).toISOString();
ok('Instagram: a los 3 días la ventana sigue abierta', ctx.waVentanaAbierta({ canal: 'instagram', ultimoEntranteHora: hace(72) }) === true);
ok('WhatsApp: a los 3 días la ventana está cerrada', ctx.waVentanaAbierta({ canal: 'whatsapp', ultimoEntranteHora: hace(72) }) === false);
toasts.length = 0; ctx.waEnviarEquipo('ig:222', 'hola');
ok('el aviso de ventana cerrada habla de 7 días en Instagram', toasts.some(t => /7 días de Instagram/.test(t)));

console.log(`\n${pass} OK, ${fail} FALLA`);
process.exit(fail ? 1 : 0);
