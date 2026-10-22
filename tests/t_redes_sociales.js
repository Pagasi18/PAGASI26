// 22-oct-2026: Adam: "el módulo de WhatsApp e Instagram ponmelo en uno solo que se llame Redes
// sociales... que aparezca todo: Messenger, Instagram, WhatsApp, comentarios de Facebook,
// comentarios de Instagram, igual que la foto". Una bandeja con una pestaña por canal; Messenger y
// los comentarios de Facebook todavía sin conectar; la cola de hoy y los asistentes como botones.
process.env.TZ = 'America/Caracas';   // la hora de la oficina, para la prueba de fechas
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', scrollTop: 0, scrollHeight: 0 }); }
const doc = { getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; } };
const navs = [], timers = [], escuchas = [];
const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  S: { page: 'redes', currentUser: { nombre: 'Adam', uid: 'u1' }, creds: [], pagos: [], clientes: [] }, PG: {}, nav: (p) => navs.push(p), toast() {}, logActividad() {},
  isAdminUser: () => true, fmt: (n) => '$' + n, hoyLocalISO: () => '2026-10-22', CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
  fetch() { return Promise.resolve({ ok: false, json: () => Promise.resolve({}) }); } };
ctx.window = ctx;
// Base falsa: anota qué colecciones se escuchan
function consulta(col) { const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, get() { return Promise.resolve({ docs: [] }); }, onSnapshot() { escuchas.push(col); return () => {}; }, doc() { return { get() { return new Promise(() => {}); }, set() { return Promise.resolve(); }, collection() { return consulta(col + '/sub'); } }; } }; return q; }
ctx.db = { collection: consulta };
vm.createContext(ctx);
for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const flush = () => { while (timers.length) timers.shift()(); };
const montar = () => { ['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q', 'rs-com-items', 'rs-com-filtros', 'rs-com-hilo', 'rs-com-ficha', 'rs-com-q'].forEach(el); const h = ctx.PG.redes(); flush(); return h; };

// WhatsApp e Instagram conectados (como en la PAGASI 26)
ctx._waCfg = { conectado: true, telefono: '+58 414-2719914', instagram: 'pagasi.io' };
const hoy = new Date().toISOString(), ayer = new Date(Date.now() - 86400000).toISOString();
ctx._waConvs = [
  { id: 'wa:+584140000001', canal: 'whatsapp', area: 'cobranza', nombre: 'María', telE164: '+584140000001', noLeidos: 2, ultimoMensaje: 'ya pagué', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy, ultimoAutor: 'cliente' },
  { id: 'wa:+584140000002', canal: 'whatsapp', area: 'ventas', nombre: 'Ana', telE164: '+584140000002', noLeidos: 0, ultimoMensaje: 'precio?', ultimoMensajeHora: ayer, ultimoEntranteHora: ayer, borrador: { tipo: 'lead', modelo: 'Kavak' } },
  { id: 'ig:1', canal: 'instagram', area: 'ventas', nombre: 'Luis', usuario: 'luis', noLeidos: 1, ultimoMensaje: 'hola', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy, origenComentario: 'c1' }
];
ctx._waComs = [
  { id: 'c1', usuario: 'luis', texto: 'Precio de la BRZ?', hora: hoy, tipoMedia: 'FEED', estado: 'respondido', respuesta: 'Está en $1,750. Escríbeme por directo.', privado: { enviado: true, igsid: '1' } },
  { id: 'c2', usuario: 'pedro', texto: '🔥', hora: ayer, tipoMedia: 'AD', estado: 'sin-respuesta', motivo: 'solo emoji o vacío' },
  { id: 'c3', usuario: 'jose', texto: 'nadie me llama', hora: hoy, tipoMedia: 'FEED', estado: 'fallo', reclamo: true, error: 'Meta HTTP 400' }
];

// ── 1. Las pestañas, como la bandeja de Meta ──
ctx._rsTab = 'todos';
let html = montar();
const nombres = ['Todos los mensajes', 'Instagram', 'WhatsApp', 'Messenger', 'Comentarios de Instagram', 'Comentarios de Facebook'];
ok('el módulo se llama Redes sociales', /Redes sociales/.test(html));
ok('tiene las seis pestañas en el orden de Adam: todos, Instagram, WhatsApp, Messenger y los comentarios', nombres.every(n => html.indexOf('>' + n + '<') > -1) && nombres.map(n => html.indexOf('>' + n + '<')).every((p, i, a) => !i || p > a[i - 1]));
ok('Messenger y Comentarios de Facebook dicen "sin conectar"', (html.match(/class="pend">sin conectar/g) || []).length === 2);
ok('los globos cuentan lo que no se ha leído: Todos 2, WhatsApp 1, Instagram 1', /id="rs-b-todos"><span class="b">2</.test(html) && /id="rs-b-whatsapp"><span class="b">1</.test(html) && /id="rs-b-instagram"><span class="b">1</.test(html));
ok('Comentarios de Instagram cuenta los de hoy (2)', /id="rs-b-igcom"><span class="b">2</.test(html));
ok('arriba a la derecha: Bandeja, Cobranza de hoy y los botones de Paola y Patricia', /Bandeja<\/button>/.test(html) && /Cobranza de hoy · /.test(html) && /rsAsistente\('ventas'\)/.test(html) && /rsAsistente\('cobranza'\)/.test(html));
ok('escucha las conversaciones de los dos canales y los comentarios', escuchas.includes('conversaciones') && escuchas.includes('comentarios_ig'));

// ── 2. "Todos los mensajes" mezcla los canales ──
ok('en Todos salen las 3 conversaciones (WhatsApp cobranza, WhatsApp ventas e Instagram)', (els['wa-items'].innerHTML.match(/class="wa-item/g) || []).length === 3);
ok('cada fila lleva la marca de su canal', /class="cn wa"/.test(els['wa-items'].innerHTML) && /class="cn ig"/.test(els['wa-items'].innerHTML));
ok('en Todos hay filtros de Cobranza y Ventas (en el menú)', />Cobranza \(1\)</.test(els['wa-filtros'].innerHTML) && />Ventas \(2\)</.test(els['wa-filtros'].innerHTML));
ctx.waFiltro('cobranza');
ok('el filtro Cobranza deja solo a María', (els['wa-items'].innerHTML.match(/class="wa-item/g) || []).length === 1 && /María/.test(els['wa-items'].innerHTML));
ctx.waFiltro('todas');

// ── 2b. El aspecto de la bandeja de Meta (Adam: "necesito que la visual sea como la de Meta") ──
ok('todo va en un solo panel con las pestañas arriba', /class="rs-caja"><div class="rs-tabs">/.test(html));
ok('la fila dice quién escribió lo último ("Patricia: ..." / "Paola: ...") y lleva etiquetas', /Paola: |Patricia: /.test(els['wa-items'].innerHTML) || /class="rs-tg"><span>Cobranza<\/span>/.test(els['wa-items'].innerHTML));
ok('las no leídas van en negrita (data-nl) con el punto azul', /data-nl="1"/.test(els['wa-items'].innerHTML) && /class="punto"/.test(els['wa-items'].innerHTML));
ok('la cabecera del hilo trae la foto y botones cuadrados', /wa-hilo-top"><div class="quien"><div class="av/.test(els['wa-hilo'].innerHTML) && /class="rs-ib/.test(els['wa-hilo'].innerHTML));
ok('la ficha empieza con el perfil, como en Meta', /class="card rs-perfil"/.test(els['wa-ficha'].innerHTML) && /Información/.test(els['wa-ficha'].innerHTML));
ok('la caja de escribir dice por dónde y como quién se responde', /Responde en WhatsApp como Patricia/.test(els['wa-hilo'].innerHTML));
ctx._waMsgs['wa:+584140000001'] = [
  { autor: 'asistente', tipo: 'plantilla', texto: 'Tu cuota vence hoy', hora: '2026-10-20T13:00:00.000Z', estado: 'leido' },
  { autor: 'cliente', tipo: 'texto', texto: 'ya pagué', hora: '2026-10-20T13:05:00.000Z' },
  { autor: 'cliente', tipo: 'texto', texto: 'me confirman?', hora: '2026-10-20T18:00:00.000Z' }];
el('wa-burbujas'); ctx._waSel = 'wa:+584140000001'; ctx._waPintarHilo('wa:+584140000001');
ok('el hilo pone la fecha al empezar y cuando pasa más de una hora (2 separadores)', (els['wa-burbujas'].innerHTML.match(/class="wa-sep"/g) || []).length === 2);
ok('lo que escribe la persona lleva su foto chica al lado', (els['wa-burbujas'].innerHTML.match(/class="avm/g) || []).length === 2);
ok('en la lista: la hora si es de hoy, el día si es de esta semana, la fecha si es más vieja', ctx._waHoraLista(new Date().toISOString()).indexOf(':') > 0 && ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].includes(ctx._waHoraLista(new Date(Date.now() - 2 * 86400000).toISOString())) && /oct|sep/.test(ctx._waHoraLista('2026-09-01T15:00:00.000Z')));

// ── 3. Cada pestaña de canal muestra solo lo suyo ──
ctx._rsTab = 'instagram'; montar();
ok('Instagram: solo Luis', (els['wa-items'].innerHTML.match(/class="wa-item/g) || []).length === 1 && /Luis/.test(els['wa-items'].innerHTML));
ok('Instagram no tiene los filtros de cobranza', !/Cobranza<i>/.test(els['wa-filtros'].innerHTML) && !/Con promesa/.test(els['wa-filtros'].innerHTML));
ctx._rsTab = 'whatsapp'; montar();
ok('WhatsApp: María y Ana', (els['wa-items'].innerHTML.match(/class="wa-item/g) || []).length === 2 && !/Luis/.test(els['wa-items'].innerHTML));
// Abrir desde Todos una conversación que no está en la pestaña: se va a Todos
navs.length = 0; ctx.waAbrir('ig:1');
ok('abrir una de Instagram estando en WhatsApp lleva a Todos los mensajes', navs[0] === 'redes' && ctx._rsTab === 'todos' && ctx._waSel === 'ig:1');

// ── 4. Messenger y comentarios de Facebook: todavía no llegan ──
ctx._rsTab = 'messenger'; html = montar();
ok('Messenger explica que todavía no está conectado', /Messenger todavía no está conectado/.test(html) && !/id="wa-items"/.test(html));
ctx._rsTab = 'fbcom'; html = montar();
ok('Comentarios de Facebook explica que todavía no están conectados', /Los comentarios de Facebook todavía no están conectados/.test(html));

// ── 5. Comentarios de Instagram ──
ctx._rsTab = 'igcom'; html = montar();
ok('la pestaña de comentarios trae su lista, el detalle y la ficha', /id="rs-com-items"/.test(html) && /id="rs-com-hilo"/.test(html) && /id="rs-com-ficha"/.test(html));
ok('salen los 3 comentarios', (els['rs-com-items'].innerHTML.match(/class="wa-item/g) || []).length === 3);
ok('el primero se abre con la respuesta pública de Paola', /Precio de la BRZ\?/.test(els['rs-com-hilo'].innerHTML) && /Respuesta pública/.test(els['rs-com-hilo'].innerHTML) && /Está en \$1,750/.test(els['rs-com-hilo'].innerHTML));
ok('...y el botón para ver la conversación privada que abrió Paola', /Ver la conversación privada/.test(els['rs-com-hilo'].innerHTML) && /waAbrir\(\\?'ig:1/.test(els['rs-com-hilo'].innerHTML));
ok('los filtros cuentan: Todos y Sin respuesta a la vista; respondió, reclamos y no se pudo enviar en el menú', /Todos<i>3</.test(els['rs-com-filtros'].innerHTML) && /Sin respuesta<i>1</.test(els['rs-com-filtros'].innerHTML) && />Paola respondió \(1\)</.test(els['rs-com-filtros'].innerHTML) && />Reclamos \(1\)</.test(els['rs-com-filtros'].innerHTML) && />No se pudo enviar \(1\)</.test(els['rs-com-filtros'].innerHTML));
ctx.rsComFiltro('reclamos');
ok('el filtro Reclamos deja solo el de José, con su error', (els['rs-com-items'].innerHTML.match(/class="wa-item/g) || []).length === 1 && /jose/.test(els['rs-com-items'].innerHTML) && /Meta HTTP 400/.test(els['rs-com-ficha'].innerHTML));
ctx.rsComFiltro('todos'); ctx.rsComAbrir('c2');
ok('el de Pedro dice por qué Paola no respondió y que fue en un anuncio', /solo emoji o vacío/.test(els['rs-com-ficha'].innerHTML) && /Anuncio/.test(els['rs-com-ficha'].innerHTML));

// ── 6. La cola de hoy y la ventana de cada asistente (como "Sandra" de DARKSIDE) ──
ctx._rsVista = 'hoy'; html = montar();
ok('Cobranza de hoy muestra la cola de recordatorios', /Recordatorios antes de vencer/.test(html) && !/class="rs-tabs"/.test(html));
ok('arriba están los botones de Paola y de Patricia', /onclick="rsAsistente\('ventas'\)">[\s\S]*Paola<\/button>/.test(html) && /onclick="rsAsistente\('cobranza'\)">[\s\S]*Patricia<\/button>/.test(html) && !/>Asistentes</.test(html));
ctx._rsVista = 'bandeja';
['mtt', 'msb', 'modal-box', 'mbd', 'mft', 'ov', 'mic'].forEach(el); els['ov'].style = {}; els['mic'].style = {};
ctx.isAdminUser = () => true;
ctx._waCfg = Object.assign({}, ctx._waCfg, { responde: { comentariosIg: false }, calidad: { ventas: 'economica' }, instruccionesVentas: 'Casco gratis esta semana' });
ctx.rsAsistente('ventas');
let v = els['mbd'].innerHTML;
ok('la ventana de Paola se abre con su nombre', els['mtt'].textContent === 'Paola de Pagasi' && els['ov'].style.display === 'flex' && /Hoy contestó en/.test(els['msb'].textContent));
ok('Dónde responde Paola: Instagram, WhatsApp ventas, comentarios de Instagram, y Messenger y comentarios de Facebook sin conectar', /Dónde responde Paola/.test(v) && (v.match(/class="rs-sw"/g) || []).length === 5 && (v.match(/sin conectar/g) || []).length === 2);
ok('...con los comentarios de Instagram apagados como estaban guardados', /data-canal="comentariosIg">/.test(v) && /data-canal="instagram" checked>/.test(v));
ok('la calidad: Económica, Normal y Máxima con lo que cuesta, y marcada la que se escogió', /Económica[\s\S]*Normal[\s\S]*Máxima/.test(v) && /\$150–300 al mes/.test(v) && /class="rs-q on"><input type="radio" name="rs-calidad" value="economica" checked/.test(v));
ok('lo que Paola debe saber trae lo que ya estaba escrito', /Lo que Paola debe saber/.test(v) && /Casco gratis esta semana/.test(v));
ok('la conexión: Meta, Instagram, WhatsApp, Messenger y Claude', /Meta \(la app de Pagasi\)/.test(v) && /Instagram @pagasi.io/.test(v) && /Claude \(la inteligencia de Paola\)/.test(v) && /Messenger<\/span>/.test(v));
ok('el administrador ve Guardar', /saveM\(\)">Guardar/.test(els['mft'].innerHTML));
ctx.rsAsistente('cobranza'); v = els['mbd'].innerHTML;
ok('la de Patricia: WhatsApp y los recordatorios de las 8:30, con el aviso de que salen a clientes de verdad', els['mtt'].textContent === 'Patricia de Pagasi' && /data-canal="recordatorios"/.test(v) && /clientes de verdad/.test(v) && /Cómo pagar/.test(v));
ok('los recordatorios salen apagados si config/asistente dice recordatorios: false (como hoy en la 26)', (ctx._waCfg.recordatorios = false, ctx.rsAsistente('cobranza'), /data-canal="recordatorios">/.test(els['mbd'].innerHTML)));
ok('...y encendidos si no dice nada (el servidor los manda)', (delete ctx._waCfg.recordatorios, ctx.rsAsistente('cobranza'), /data-canal="recordatorios" checked>/.test(els['mbd'].innerHTML)));
// Guardar: lo que se escoge queda en config/asistente (lo lee el servidor)
const escrito = [];
const sw = (canal, on) => ({ disabled: false, checked: on, getAttribute: () => canal });
const qs0 = doc.querySelectorAll, q0 = doc.querySelector, db0 = ctx.db;
doc.querySelectorAll = (sel) => sel === '#mbd .rs-sw' ? [sw('whatsappCobranza', false), sw('recordatorios', true)] : [];
doc.querySelector = (sel) => sel === '#mbd input[name="rs-calidad"]:checked' ? { value: 'maxima' } : null;
el('rs-instr').value = 'Sin efectivo esta semana'; el('rs-pago').value = 'Pago Móvil 0414';
ctx.db = { collection: () => ({ doc: (id) => ({ set: (d, o) => { escrito.push({ id, d, o }); return Promise.resolve(); } }) }) };
vm.runInContext('closeM = function(){}', ctx);
{
  ctx.rsGuardarAsistente('cobranza');   // la escritura sale en el acto; el cierre llega después
  doc.querySelectorAll = qs0; doc.querySelector = q0; ctx.db = db0;
  const g = escrito[0] || { d: {} };
  ok('al guardar a Patricia: apagada en WhatsApp, recordatorios encendidos, Máxima, instrucciones y cómo pagar', g.id === 'asistente' && g.o && g.o.merge && g.d.responde.whatsappCobranza === false && g.d.responde.comentariosIg === false && g.d.recordatorios === true && g.d.calidad.cobranza === 'maxima' && g.d.calidad.ventas === 'economica' && g.d.instrucciones === 'Sin efectivo esta semana' && g.d.datosPago === 'Pago Móvil 0414');
  // En una compañía sin Meta conectado (la 18): se ve, avisa que se configura en pagasi.io, y no se guarda
  const cfg0 = ctx._waCfg; ctx._waCfg = { conectado: false };
  ctx.rsAsistente('ventas');
  ok('sin Meta conectado avisa que las asistentes se configuran en pagasi.io y no deja guardar', /se configuran en <b>pagasi.io<\/b>/.test(els['mbd'].innerHTML) && !/Guardar/.test(els['mft'].innerHTML));
  ctx._waCfg = cfg0;
}

// ── 7. Cada canal lo ve quien tiene su permiso ──
ctx.hasModuleAccess = (k) => k === 'instagram';   // un vendedor: solo Instagram
const abiertos = []; const abrirReal = ctx.waAbrirConversaciones;
vm.runInContext('waAbrirConversaciones = function(canal){ __abiertos.push(canal); }', Object.assign(ctx, { __abiertos: abiertos }));
ctx._rsTab = 'whatsapp'; html = montar();
ok('sin permiso de WhatsApp no sale su pestaña ni la cola de cobranza', !/>WhatsApp</.test(html) && !/Cobranza de hoy/.test(html) && />Instagram</.test(html));
ok('...y la pestaña pedida cae en Todos los mensajes', ctx._rsTab === 'todos');
ok('...y solo se abren las conversaciones de Instagram (las Reglas no dejarían leer WhatsApp)', abiertos.length > 0 && abiertos.every(c => c === 'instagram'));
ctx.waAbrirConversaciones = abrirReal;
ctx.hasModuleAccess = (k) => k === 'whatsapp';    // un cobrador: solo WhatsApp
html = montar();
ok('sin permiso de Instagram no salen Instagram, Messenger ni los comentarios', !/>Instagram</.test(html) && !/>Messenger</.test(html) && !/Comentarios de Instagram/.test(html) && />WhatsApp</.test(html));

// ── 8. Demostración: la 18 no tiene Meta conectado ──
delete ctx.hasModuleAccess;
ctx._waCfg = { conectado: false }; ctx._waConvs = []; ctx._waComs = []; ctx._rsTab = 'igcom';
html = montar();
ok('sin Meta conectado avisa que es de muestra', /todavía no están conectados en esta compañía/.test(html));
ok('...y trae comentarios de muestra', (els['rs-com-items'].innerHTML.match(/class="wa-item/g) || []).length === 3 && ctx._waComs.every(c => c.demo));

// ── 9. La fecha de un mensaje de noche es la de Caracas, no la de UTC ──
ok('un mensaje del 21-oct a las 11:21 pm sale "21 oct 23:21" (no "22 oct")', ctx._waHora('2026-10-22T03:21:00.000Z') === '21 oct 23:21');

// ── 10. Métricas (Adam: "¿puedes poner las métricas de los post, ads, etc.?") ──
{
  delete ctx.hasModuleAccess;
  const hace = (d) => new Date(Date.now() - d * 86400000).toISOString();
  ctx._waCfg = { conectado: false };   // sin Meta: las conversaciones salen de las que ya están cargadas
  ctx._waConvs = [
    { id: 'ig:1', canal: 'instagram', area: 'ventas', nombre: 'A', creado: hace(0), borrador: { tipo: 'lead' } },
    { id: 'ig:2', canal: 'instagram', area: 'ventas', nombre: 'B', creado: hace(2) },
    { id: 'wa:1', canal: 'whatsapp', area: 'ventas', nombre: 'C', creado: hace(1) },
    { id: 'wa:2', canal: 'whatsapp', area: 'cobranza', nombre: 'D', creado: hace(3) },
    { id: 'ig:3', canal: 'instagram', area: 'ventas', nombre: 'E', creado: hace(20) }
  ];
  ctx._waComs = [{ id: 'c1', hora: hace(1), tipoMedia: 'AD', estado: 'respondido' }, { id: 'c2', hora: hace(2), tipoMedia: 'FEED', estado: 'sin-respuesta' }];
  const hoyL = ctx._waFechaLocal(new Date()), antes = ctx._waFechaLocal(new Date(Date.now() - 9 * 86400000));
  ctx._rsMet = { instagram: { usuario: 'pagasi.io', seguidores: 662, publicaciones: 12, posts: [{ id: '1', texto: 'Veloz en cuotas', fecha: hace(5), meGusta: 5, comentarios: 2, enlace: 'https://instagram.com/p/x', imagen: 'https://cdn/x.jpg' }] }, seguidoresDias: { [antes]: 640, [hoyL]: 662 }, actualizado: hace(0) };
  ctx._rsMetDias = 7; ctx._rsVista = 'metricas'; ctx._rsMetConvs = null;
  let html = montar();
  ok('arriba está el botón Métricas', /onclick="rsVista\('metricas'\)">Métricas<\/button>/.test(html));
  const m = ctx._rsMetricasHtml();
  ok('seguidores de Instagram y cuánto crecieron', /662/.test(m) && /\+22 desde el/.test(m) && /12 publicaciones/.test(m));
  ok('personas que escribieron en 7 días: 4 (Instagram 2, WhatsApp ventas 1, cobranza 1); la de hace 20 días no cuenta', /Personas que escribieron<\/div><div class="v">4</.test(m) && /Instagram 2 · WhatsApp ventas 1 · cobranza 1/.test(m));
  ok('quieren comprar: 1 de las 3 de ventas', /Quieren comprar<\/div><div class="v">1</.test(m) && /33% de las 3 conversaciones de ventas/.test(m));
  ok('comentarios: 1 en anuncios, 1 en publicaciones, Paola contestó 50%', /En anuncios 1 · en publicaciones 1 · Paola contestó 50%/.test(m));
  ok('el gráfico tiene un día por barra, con su número al pasar el ratón, y la tabla', (m.match(/data-tip="/g) || []).length === 7 && /Ver como tabla/.test(m) && /Instagram<\/span><span><i style="background:var\(--s-wa\)">/.test(m));
  ok('las publicaciones con "me gusta", comentarios y el enlace a Instagram', /♥ 5 &nbsp; 💬 2/.test(m) && /Ver en Instagram/.test(m));
  ok('dice qué falta para ver alcance y anuncios', /instagram_manage_insights/.test(m) && /ads_read/.test(m));
  ctx.rsMetDias(30); const m30 = ctx._rsMetricasHtml();
  ok('en 30 días entra también la de hace 20 días (5) y hay 30 barras', /Personas que escribieron<\/div><div class="v">5</.test(m30) && (m30.match(/data-tip="/g) || []).length === 30);
  ctx._rsVista = 'bandeja';
}

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
