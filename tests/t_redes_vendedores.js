// 24-oct-2026, Adam: "en el módulo de redes sociales necesito también filtros por vendedores… ahora solo
// están Liz y Marianne, pero pronto vamos a tener más… ponle una barra abajo de esta". Una barra debajo de
// las pestañas con cada vendedor (los nuevos aparecen solos), "Todos" y "Sin vendedor"; la conversación
// sigue siendo de su vendedor aunque se la devuelva a Paola, y se cambia con "Pasar a…" en la ficha.
process.env.TZ = 'America/Caracas';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', scrollTop: 0, scrollHeight: 0 }); }
const doc = { activeElement: null, getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; } };
const navs = [], timers = [], toasts = [];
let admin = false;
const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  S: { page: 'redes', currentUser: { nombre: 'Marianne Molina', uid: 'u2' }, creds: [], pagos: [], clientes: [] }, PG: {}, nav: (p) => navs.push(p), toast: (t) => toasts.push(t), logActividad() {},
  isAdminUser: () => admin, fmt: (n) => '$' + n, hoyLocalISO: () => '2026-10-24', CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
  fetch() { return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); } };
ctx.window = ctx;
function consulta() { const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, get() { return Promise.resolve({ docs: [] }); }, onSnapshot() { return () => {}; }, doc() { return { get() { return new Promise(() => {}); }, set() { return Promise.resolve(); }, collection: consulta }; } }; return q; }
ctx.db = { collection: consulta };
vm.createContext(ctx);
for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const flush = () => { while (timers.length) timers.shift()(); };
const hoy = new Date().toISOString();
ctx._waCfg = { conectado: false, instagram: '' };   // demostración: "Pasar a…" no llama al servidor
const conv = (id, extra) => Object.assign({ id, canal: id.startsWith('ig:') ? 'instagram' : 'whatsapp', area: 'ventas', nombre: 'Persona ' + id, ultimoMensaje: 'hola', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy }, extra);
ctx._waConvs = [
  conv('ig:1', { vendedor: 'Marianne Molina', modo: 'bot' }),                       // de Marianne aunque ya volvió a Paola
  conv('ig:2', { vendedor: 'Marianne Molina', modo: 'humano', atendidoPor: 'Marianne Molina' }),
  conv('ig:3', { modo: 'humano', atendidoPor: 'Liz Alejandra' }),                  // de antes: sin el campo, la atiende Liz
  conv('ig:4', { modo: 'bot' }),                                                   // solo Paola
  conv('wa:+584140000005', { vendedor: 'Liz Alejandra' }),
  conv('ig:6', { vendedor: '', modo: 'humano', atendidoPor: 'Adam' })               // la dejaron "sin vendedor" a propósito
];
ctx._rsTab = 'todos'; ctx._rsVista = 'bandeja';
const montar = () => { ['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q', 'rs-vend'].forEach(el); const h = ctx.PG.redes(); flush(); return h; };
const items = () => (els['wa-items'].innerHTML.match(/onclick="waAbrir\('([^']+)'\)/g) || []).map(x => x.match(/'([^']+)'/)[1]).sort().join(',');

let h = montar();
ok('quién es el vendedor: el anotado; si es de antes, quien la atiende; "" a propósito = sin vendedor', ctx.waVendedorDe(ctx._waConvs[0]) === 'Marianne Molina' && ctx.waVendedorDe(ctx._waConvs[2]) === 'Liz Alejandra' && ctx.waVendedorDe(ctx._waConvs[3]) === '' && ctx.waVendedorDe(ctx._waConvs[5]) === '');
ok('la barra sale debajo de las pestañas de canales', /<div class="rs-tabs">[\s\S]*<\/div><div class="rs-vend" id="rs-vend"/.test(h));
ok('...con Todos, cada vendedor (con su inicial y cuántas tiene) y Sin vendedor', /Todos<i>6<\/i>/.test(h) && /title="Marianne Molina"><span class="av"[^>]*>MM<\/span>Marianne<i>2<\/i>/.test(h) && /title="Liz Alejandra"><span class="av"[^>]*>LA<\/span>Liz<i>2<\/i>/.test(h) && /Sin vendedor<i>2<\/i>/.test(h));
ok('una vendedora entra viendo lo suyo', /class="on" data-v="Marianne Molina"/.test(h) && items() === 'ig:1,ig:2');
ctx.waVendedorFiltro('');
ok('"Todos" muestra todas', items() === 'ig:1,ig:2,ig:3,ig:4,ig:6,wa:+584140000005' && /class="on solo" data-v=""/.test(els['rs-vend'].innerHTML));
ctx.waVendedorFiltro('Liz Alejandra');
ok('Liz: la que tomó antes del 24-oct y la de WhatsApp', items() === 'ig:3,wa:+584140000005');
ctx.waVendedorFiltro('-');
ok('Sin vendedor: las que atiende solo Paola', items() === 'ig:4,ig:6');
ctx._rsTab = 'instagram'; ctx.waVendedorFiltro('Liz Alejandra'); montar();
ok('se combina con la pestaña: en Instagram, Liz tiene 1', items() === 'ig:3' && /Liz<i>1<\/i>/.test(els['rs-vend'].innerHTML) && /Todos<i>5<\/i>/.test(els['rs-vend'].innerHTML));
ctx.waFiltro('humano');
ok('...y con los otros filtros ("Atiende una persona")', items() === 'ig:3');
ctx.waFiltro('todas');
ok('los globos rojos de las pestañas no dependen del vendedor escogido', ctx._rsCuenta('instagram') === ctx._waConvsCanal({ canal: 'instagram' }).filter(c => c.noLeidos > 0).length);
// Un vendedor nuevo aparece solo
ctx._waConvs.push(conv('ig:7', { vendedor: 'Pedro Pérez' }));
ctx._waPintarLista();
ok('un vendedor nuevo aparece solo en la barra en cuanto tiene una conversación', /title="Pedro Pérez"><span class="av"[^>]*>PP<\/span>Pedro<i>1<\/i>/.test(els['rs-vend'].innerHTML));
// Un administrador entra viendo todo
ctx._waVendSel = null; admin = true;
ok('un administrador entra viendo todas', ctx.waVendSel() === '');
admin = false; ctx.S.currentUser = { nombre: 'Nueva Vendedora' };
ok('alguien sin conversaciones también entra viendo todas', ctx.waVendSel() === '');
ctx.S.currentUser = { nombre: 'Marianne Molina', uid: 'u2' };
// Pasar a…
ctx._rsTab = 'todos'; ctx.waVendedorFiltro(''); ctx._waSel = 'ig:4'; montar();
ok('la ficha dice el vendedor y deja pasarla a otro (o dejarla sin vendedor)', /<span>Vendedor<\/span><span><select class="wa-vend-sel" onchange="waPasarA\('ig:4', this\.value\)"/.test(els['wa-ficha'].innerHTML) && /<option value="" selected>Sin vendedor \(Paola\)<\/option>/.test(els['wa-ficha'].innerHTML) && /Marianne Molina \(yo\)/.test(els['wa-ficha'].innerHTML) && /<option value="Liz Alejandra">/.test(els['wa-ficha'].innerHTML));
ctx.waPasarA('ig:4', 'Liz Alejandra');
ok('"Pasar a…" Liz: queda con Liz y lo avisa', ctx.waVendedorDe(ctx._waConvs[3]) === 'Liz Alejandra' && toasts.some(t => /queda con Liz Alejandra/.test(t)));
// Atender yo / escribir: queda como suya
const c8 = conv('ig:8', { modo: 'bot' }); ctx._waConvs.push(c8);
ctx.waAtender('ig:8');
setImmediate(() => {
  ok('al tocar "Atender yo" en una sin vendedor, queda como suya', c8.vendedor === 'Marianne Molina');
  const c9 = conv('ig:9', { modo: 'bot' }); ctx._waConvs.push(c9);
  ctx.waEnviarEquipo('ig:9', 'Hola, te escribe Marianne');
  ok('...y también al escribirle', c9.vendedor === 'Marianne Molina' && c9.atendidoPor === 'Marianne Molina');
  ctx.waDevolver('ig:9');
  setImmediate(() => {
    ok('al devolverla a Paola sigue siendo suya', ctx.waVendedorDe(c9) === 'Marianne Molina' && c9.modo === 'bot');
    // Abrir una conversación de otro vendedor desde afuera: se ve igual
    ctx.waVendedorFiltro('Liz Alejandra'); ctx.S.page = 'clientes';
    ctx.waAbrir('ig:1');
    ok('si se abre una conversación de otro vendedor (desde otra pantalla), el filtro vuelve a Todos para que se vea', ctx._waVendSel === '' && ctx._rsTab === 'todos');
    console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
  });
});
