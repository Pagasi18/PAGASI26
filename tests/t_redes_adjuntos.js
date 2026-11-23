// 23-nov-2026, Adam: "tengo problemas con el tema de red ventas... el módulo no me deja llamar ni mandar fotos ni
// anexar documentos... eso lo necesito... notas de voz... ETC".
// Primera parte: el equipo adjunta fotos, documentos, videos y audios; lo que manda la persona (notas de voz, videos,
// documentos) se guarda y se oye o se ve en el panel; lo que no quedó guardado se baja con un toque; botón «Llamar».
process.env.TZ = 'America/Caracas';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), F = path.join(ROOT, 'functions', 'lib');
const meta = require(path.join(F, 'meta.js')), procesar = require(path.join(F, 'procesar.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── Un Firestore falso con lo que usa el servidor (como en t_whatsapp_webhook.js) ──
function FakeDb(inicial) {
  const store = new Map();
  Object.keys(inicial || {}).forEach(col => Object.keys(inicial[col]).forEach(id => store.set(col + '/' + id, Object.assign({}, inicial[col][id]))));
  let seq = 0;
  const cumple = (d, w) => w.every(([f, op, v]) => op === '==' ? d[f] === v : op === 'in' ? v.includes(d[f]) : true);
  function coleccion(ruta) {
    const q = (where, orden, lim) => ({
      where: (f, op, v) => q(where.concat([[f, op, v]]), orden, lim), orderBy: (f, dir) => q(where, dir === 'desc' ? '-' + f : f, lim), limit: (n) => q(where, orden, n),
      async get() { let docs = [...store.entries()].filter(([k]) => k.startsWith(ruta + '/') && !k.slice(ruta.length + 1).includes('/')).map(([k, d]) => ({ id: k.slice(ruta.length + 1), data: () => d, exists: true })).filter(x => cumple(x.data(), where)); if (orden) { const desc = orden[0] === '-', campo = desc ? orden.slice(1) : orden; docs.sort((a, b) => String(a.data()[campo]).localeCompare(String(b.data()[campo])) * (desc ? -1 : 1)); } if (lim) docs = docs.slice(0, lim); return { docs, empty: !docs.length }; },
      doc: (id) => documento(ruta + '/' + (id || ('auto' + (++seq)))),
      async add(d) { const id = 'auto' + (++seq); store.set(ruta + '/' + id, Object.assign({}, d)); return { id }; }
    });
    return q([], null, 0);
  }
  function documento(ruta) {
    return { id: ruta.split('/').pop(), path: ruta,
      async get() { const d = store.get(ruta); return { exists: !!d, id: ruta.split('/').pop(), data: () => d }; },
      async set(d, o) { store.set(ruta, Object.assign({}, (o && o.merge && store.get(ruta)) || {}, d)); },
      async create(d) { if (store.has(ruta)) { const e = new Error('ya existe'); e.code = 6; throw e; } store.set(ruta, Object.assign({}, d)); },
      async update(d) { if (!store.has(ruta)) throw new Error('no existe'); store.set(ruta, Object.assign({}, store.get(ruta), d)); },
      collection: (sub) => coleccion(ruta + '/' + sub) };
  }
  return { collection: coleccion, _store: store };
}
const HOY = '2026-11-23', AHORA = '2026-11-23T14:00:00.000Z';
const VENTAS = '584142719914';   // el número de ventas (0414-2719914)
function armar() {
  const db26 = FakeDb({ indice_clientes: { '+584141234567': { clienteId: 'C26' } }, clientes: { C26: { id: 'C26', nombre: 'MARÍA JOSÉ PÉREZ', telE164: '+584141234567' } },
    creditos: { 'M-1': { id: 'M-1', clienteId: 'C26', cli: 'MARÍA', estado: 'activo', fecha: '2026-11-01', cuotaQ: 50, cuota: 100, totalCuotas: 24, plazo: 12, total: 1200, fin: 1200, precio: 1800, ini: 600 } }, pagos: {} });
  const db18 = FakeDb({});
  const llamadas = [], subidos = [], bajados = [];
  const metaFalso = {
    enviarTexto: async (a, t) => { llamadas.push({ q: 'texto', a, t }); return 'wamid.t' + llamadas.length; },
    enviarImagen: async (a, url, pie) => { llamadas.push({ q: 'imagen', a, url, pie }); return 'wamid.i' + llamadas.length; },
    enviarDocumento: async (a, url, nombre, pie) => { llamadas.push({ q: 'documento', a, url, nombre, pie }); return 'wamid.d' + llamadas.length; },
    enviarAudio: async (a, url, voz) => { llamadas.push({ q: 'audio', a, url, voz }); return 'wamid.a' + llamadas.length; },
    enviarVideo: async (a, url, pie) => { llamadas.push({ q: 'video', a, url, pie }); return 'wamid.v' + llamadas.length; },
    marcarLeido: async () => '',
    bajarMedio: async (id, tope) => { bajados.push({ id, tope }); if (id === 'vencido') { const e = new Error('Meta no devolvió la URL del medio'); e.codigo = 'vencido'; throw e; } if (id === 'gigante') { const e = new Error('grande'); e.codigo = 'grande'; throw e; }
      return id === 'voz1' ? { bytes: Buffer.from('ogg'), mime: 'audio/ogg; codecs=opus' } : id === 'vid1' ? { bytes: Buffer.from('mp4'), mime: 'video/mp4' } : id === 'docx1' ? { bytes: Buffer.from('doc'), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } : { bytes: Buffer.from('img'), mime: 'image/jpeg' }; } };
  const ig = [], igFalso = { enviarTexto: async (a, t, op) => { ig.push({ q: 'texto', a, t, humano: !!(op && op.humano) }); return 'mid.t' + ig.length; }, enviarImagen: async (a, url, op) => { ig.push({ q: 'imagen', a, url }); return 'mid.i' + ig.length; },
    enviarAdjunto: async (a, tipo, url, op) => { ig.push({ q: 'adjunto', a, tipo, url, humano: !!(op && op.humano) }); return 'mid.x' + ig.length; }, marcarLeido: async () => '', perfil: async () => ({ nombre: 'Luis', usuario: 'luis.ve' }) };
  const cerebro = { async pensar() { return { reply: 'Hola, ya te atiendo.', draft: null, summary: '', handoff: false, handoffReason: '' }; } };
  const deps = { bases: { '26': db26, '18': db18 }, storage: (emp) => ({ subir: async (ruta, bytes, mime) => { subidos.push({ emp, ruta, mime }); return 'https://st/' + ruta; } }), meta: metaFalso, metaIG: igFalso, instagramId: '1784',
    bajarUrl: async (url, tope) => { if (/vencido/.test(url)) throw new Error('HTTP 403'); return /html/.test(url) ? { bytes: Buffer.from('<html>'), mime: 'text/html' } : /audio/.test(url) ? { bytes: Buffer.from('m4a'), mime: 'audio/mp4' } : { bytes: Buffer.from('jpg'), mime: 'image/jpeg' }; },
    ventas: async () => ({ motos: [], cond: {}, sedes: [] }), cerebro, cfg: { empresaNombre: { '18': 'PAGASI 18', '26': 'PAGASI 26' }, responde: { whatsappVentas: false, instagram: false, whatsappCobranza: false } }, ahora: () => AHORA, hoy: () => HOY, log: () => {} };
  return { db26, db18, llamadas, subidos, bajados, ig, deps };
}
const URL_OK = 'https://firebasestorage.googleapis.com/v0/b/pagasi26-65ced.firebasestorage.app/o/redes_equipo%2Fwav__584145550000%2F1795-abc123-requisitos.pdf?alt=media&token=11111111-2222-3333-4444-555555555555';

(async () => {
  // ══ 1. Lo que llega de Meta ══
  const aviso = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { display_phone_number: VENTAS, phone_number_id: '1415108271676379' }, contacts: [{ wa_id: '584145550000', profile: { name: 'Luis' } }],
    messages: [{ id: 'wamid.v1', from: '584145550000', timestamp: '1795442400', type: 'audio', audio: { id: 'voz1', mime_type: 'audio/ogg; codecs=opus', voice: true } },
      { id: 'wamid.v2', from: '584145550000', timestamp: '1795442401', type: 'audio', audio: { id: 'mp3', mime_type: 'audio/mpeg' } },
      { id: 'wamid.v3', from: '584145550000', timestamp: '1795442402', type: 'document', document: { id: 'docx1', mime_type: 'application/pdf', filename: 'constancia de trabajo.pdf', caption: 'mi constancia' } }] } }] }] };
  const p = meta.parsearWebhook(aviso);
  ok('la nota de voz llega marcada como voz; un audio normal, no', p.mensajes[0].tipo === 'audio' && p.mensajes[0].medio.voz === true && p.mensajes[1].medio.voz === false);
  ok('el documento trae su nombre y su texto', p.mensajes[2].tipo === 'documento' && p.mensajes[2].medio.nombre === 'constancia de trabajo.pdf' && p.mensajes[2].texto === 'mi constancia');
  ok('la extensión sale del tipo y, si no se conoce, del nombre (un Word ya no queda como .jpg)', procesar.extDe('audio/ogg; codecs=opus') === 'ogg' && procesar.extDe('application/vnd.openxmlformats-officedocument.wordprocessingml.document') === 'docx' && procesar.extDe('application/octet-stream', 'lista.xlsx') === 'xlsx' && procesar.extDe('image/jpeg') === 'jpg' && procesar.extDe('', '') === 'jpg' && procesar.extDe('video/mp4') === 'mp4' && procesar.extDe('audio/raro') === 'ogg' && procesar.extDe('application/zip') === 'bin');

  // ══ 2. Una nota de voz al WhatsApp de VENTAS: se guarda (antes no se bajaba nada) ══
  let t = armar();
  await procesar.procesarMensaje(t.deps, p.mensajes[0]);
  let msg = t.db26._store.get('conversaciones/wav:+584145550000/mensajes/wamid.v1'), conv = t.db26._store.get('conversaciones/wav:+584145550000');
  ok('ventas: la nota de voz queda en Storage (redes_whatsapp/<teléfono>/<id>.ogg) con su enlace', t.subidos.length === 1 && t.subidos[0].ruta === 'redes_whatsapp/584145550000/wamid.v1.ogg' && t.subidos[0].emp === '26' && msg.medio.url === 'https://st/redes_whatsapp/584145550000/wamid.v1.ogg' && msg.medio.voz === true && msg.medio.id === 'voz1' && msg.medio.path === 'redes_whatsapp/584145550000/wamid.v1.ogg');
  ok('...se baja con el tope de 25 MB y la lista dice «Nota de voz»', t.bajados[0].tope === 25 * 1024 * 1024 && conv.ultimoMensaje === '🎤 Nota de voz' && conv.area === 'ventas');
  await procesar.procesarMensaje(t.deps, p.mensajes[2]);
  msg = t.db26._store.get('conversaciones/wav:+584145550000/mensajes/wamid.v3');
  ok('ventas: un documento también se guarda, con su nombre', /^redes_whatsapp\/584145550000\/wamid\.v3\./.test(msg.medio.path) && msg.medio.nombre === 'constancia de trabajo.pdf' && !!msg.medio.url);
  // un archivo que pesa demasiado, o que Meta ya no tiene: el mensaje llega igual
  t = armar();
  await procesar.procesarMensaje(t.deps, { canal: 'whatsapp', metaId: 'wamid.g', de: '584145550000', nombre: 'Luis', tipo: 'video', texto: '', medio: { id: 'gigante', mime: 'video/mp4', nombre: '', voz: false }, hora: AHORA, telefonoNegocio: VENTAS });
  msg = t.db26._store.get('conversaciones/wav:+584145550000/mensajes/wamid.g');
  ok('un video de más de 25 MB no se guarda pero el mensaje queda (con su id de Meta) y nada se cae', msg && msg.medio.id === 'gigante' && !msg.medio.url && t.subidos.length === 0);

  // ══ 3. COBRANZA: la nota de voz se guarda; la foto sigue siendo comprobante ══
  t = armar();
  await procesar.procesarMensaje(t.deps, { canal: 'whatsapp', metaId: 'wamid.c1', de: '584141234567', nombre: 'María', tipo: 'audio', texto: '', medio: { id: 'voz1', mime: 'audio/ogg', nombre: '', voz: true }, hora: AHORA, telefonoNegocio: '584146401617' });
  msg = t.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.c1');
  ok('cobranza: la nota de voz del cliente se guarda para oírla en el panel', msg.medio.url === 'https://st/redes_whatsapp/584141234567/wamid.c1.ogg' && msg.medio.voz === true);
  await procesar.procesarMensaje(t.deps, { canal: 'whatsapp', metaId: 'wamid.c2', de: '584141234567', nombre: 'María', tipo: 'imagen', texto: '', medio: { id: 'foto', mime: 'image/jpeg', nombre: '', voz: false }, hora: AHORA, telefonoNegocio: '584146401617' });
  msg = t.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.c2');
  ok('cobranza: la foto sigue su camino de comprobante (misma carpeta de siempre, una sola subida)', msg.medio.path === 'comprobantes_whatsapp/584141234567/wamid.c2.jpg' && t.subidos.filter(x => /wamid\.c2/.test(x.ruta)).length === 1 && [...t.db26._store.keys()].some(k => k.startsWith('comprobantes/')));
  await procesar.procesarMensaje(t.deps, { canal: 'whatsapp', metaId: 'wamid.c3', de: '584141234567', nombre: 'María', tipo: 'documento', texto: '', medio: { id: 'docx1', mime: '', nombre: 'recibo.docx', voz: false }, hora: AHORA, telefonoNegocio: '584146401617' });
  msg = t.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.c3');
  ok('cobranza: un Word mandado como comprobante queda .docx (antes .jpg) y con su nombre', msg.medio.path === 'comprobantes_whatsapp/584141234567/wamid.c3.docx' && msg.medio.nombre === 'recibo.docx');

  // ══ 4. Instagram: la nota de voz se copia antes de que venza el enlace ══
  t = armar();
  await procesar.procesarMensaje(t.deps, { canal: 'instagram', metaId: 'mid.a1', de: '9001', nombre: '', tipo: 'audio', texto: '', medio: { url: 'https://cdn.meta/audio1', mime: '', tipoMeta: 'audio' }, hora: AHORA });
  msg = t.db26._store.get('conversaciones/ig:9001/mensajes/mid.a1');
  ok('Instagram: el audio queda en Storage (redes_instagram/…​.m4a) y guarda el enlace original', msg.medio.path === 'redes_instagram/9001/mid.a1.m4a' && msg.medio.original === 'https://cdn.meta/audio1' && msg.medio.url === 'https://st/redes_instagram/9001/mid.a1.m4a');
  await procesar.procesarMensaje(t.deps, { canal: 'instagram', metaId: 'mid.a2', de: '9001', nombre: '', tipo: 'audio', texto: '', medio: { url: 'https://cdn.meta/html', mime: '', tipoMeta: 'audio' }, hora: AHORA });
  msg = t.db26._store.get('conversaciones/ig:9001/mensajes/mid.a2');
  ok('...y una página de error de Meta no se guarda como si fuera el audio', msg.medio.url === 'https://cdn.meta/html' && !msg.medio.path);

  // ══ 5. El equipo adjunta (POST /equipo con adjunto) ══
  t = armar();
  const admin = { admin: true, empresa: '26', nombre: 'Adam', rol: 'Administrador', permisos: [] };
  await t.db26.collection('conversaciones').doc('wav:+584145550000').set({ canal: 'whatsapp', area: 'ventas', telE164: '+584145550000', ultimoEntranteHora: AHORA, numeroId: '1415108271676379' });
  await t.db26.collection('conversaciones').doc('wa:+584141234567').set({ canal: 'whatsapp', area: 'cobranza', telE164: '+584141234567', ultimoEntranteHora: AHORA });
  await t.db26.collection('conversaciones').doc('ig:9001').set({ canal: 'instagram', area: 'ventas', igsid: '9001', ultimoEntranteHora: AHORA });
  let r = await procesar.enviarEquipo(t.deps, { empresa: '26', convId: 'wav:+584145550000', texto: 'Aquí están los requisitos', por: 'Adam', quien: admin, adjunto: { url: URL_OK, tipo: 'documento', nombre: 'requisitos.pdf', mime: 'application/pdf' } });
  let ll = t.llamadas.pop();
  msg = t.db26._store.get('conversaciones/wav:+584145550000/mensajes/' + r.metaId); conv = t.db26._store.get('conversaciones/wav:+584145550000');
  ok('WhatsApp: el documento sale con su nombre y el texto como pie', ll.q === 'documento' && ll.url === URL_OK && ll.nombre === 'requisitos.pdf' && ll.pie === 'Aquí están los requisitos' && ll.a === '+584145550000');
  ok('...y queda guardado como documento del equipo, con su enlace y su nombre', msg.tipo === 'documento' && msg.autor === 'equipo' && msg.medio.url === URL_OK && msg.medio.nombre === 'requisitos.pdf' && msg.medio.mime === 'application/pdf' && msg.por === 'Adam' && conv.modo === 'humano' && conv.ultimoMensaje === 'Aquí están los requisitos');
  r = await procesar.enviarEquipo(t.deps, { empresa: '26', convId: 'wav:+584145550000', texto: '', por: 'Adam', quien: admin, adjunto: { url: URL_OK.replace('requisitos.pdf', 'moto.jpg'), tipo: 'imagen', nombre: 'moto.jpg', mime: 'image/jpeg' } });
  ok('WhatsApp: la foto del equipo sale como imagen; sin texto, la lista dice «📷 Foto»', t.llamadas.pop().q === 'imagen' && t.db26._store.get('conversaciones/wav:+584145550000').ultimoMensaje === '📷 Foto');
  r = await procesar.enviarEquipo(t.deps, { empresa: '26', convId: 'wa:+584141234567', texto: 'Escúchalo', por: 'Adam', quien: admin, adjunto: { url: URL_OK.replace('requisitos.pdf', 'nota.m4a'), tipo: 'audio', nombre: 'nota.m4a', mime: 'audio/mp4' } });
  ok('WhatsApp: el audio va solo y el texto en un mensaje aparte', t.llamadas.length >= 2 && t.llamadas[t.llamadas.length - 2].q === 'audio' && t.llamadas[t.llamadas.length - 1].q === 'texto' && t.llamadas[t.llamadas.length - 1].t === 'Escúchalo');
  r = await procesar.enviarEquipo(t.deps, { empresa: '26', convId: 'wav:+584145550000', texto: 'mira', por: 'Adam', quien: admin, adjunto: { url: URL_OK.replace('requisitos.pdf', 'v.mp4'), tipo: 'video', nombre: 'v.mp4', mime: 'video/mp4' } });
  ok('WhatsApp: el video sale con el texto como pie', (ll = t.llamadas.pop()).q === 'video' && ll.pie === 'mira');
  r = await procesar.enviarEquipo(t.deps, { empresa: '26', convId: 'ig:9001', texto: 'Los requisitos', por: 'Adam', quien: admin, adjunto: { url: URL_OK, tipo: 'documento', nombre: 'requisitos.pdf', mime: 'application/pdf' } });
  ok('Instagram: el PDF sale como archivo y el texto después', t.ig[0].q === 'adjunto' && t.ig[0].tipo === 'file' && t.ig[0].url === URL_OK && t.ig[1].q === 'texto');
  const falla = async (args) => { try { await procesar.enviarEquipo(t.deps, Object.assign({ empresa: '26', por: 'Adam', quien: admin, texto: '' }, args)); return ''; } catch (e) { return e.codigo + ': ' + e.message; } };
  ok('Instagram: un Word no (solo PDF), y se dice claro', /^adjunto: Por Instagram solo se pueden mandar documentos en PDF/.test(await falla({ convId: 'ig:9001', adjunto: { url: URL_OK, tipo: 'documento', nombre: 'x.docx', mime: 'application/msword' } })));
  const antes = t.llamadas.length;
  ok('solo se manda lo que está en la carpeta redes_equipo de los depósitos de PAGASI: otro sitio, otra carpeta u otro depósito se rechazan',
    /^adjunto/.test(await falla({ convId: 'wav:+584145550000', adjunto: { url: 'https://evil.example/x.pdf', tipo: 'documento', nombre: 'x.pdf' } }))
    && /^adjunto/.test(await falla({ convId: 'wav:+584145550000', adjunto: { url: URL_OK.replace('redes_equipo%2F', 'clientes%2F'), tipo: 'documento', nombre: 'x.pdf' } }))
    && /^adjunto/.test(await falla({ convId: 'wav:+584145550000', adjunto: { url: URL_OK.replace('pagasi26-65ced', 'otro-proyecto'), tipo: 'documento', nombre: 'x.pdf' } }))
    && /^adjunto/.test(await falla({ convId: 'wav:+584145550000', adjunto: { url: URL_OK + '&x=<script>', tipo: 'documento', nombre: 'x.pdf' } }))
    && /^adjunto/.test(await falla({ convId: 'wav:+584145550000', adjunto: { url: URL_OK, tipo: 'ejecutable', nombre: 'x.exe' } })) && t.llamadas.length === antes);
  ok('...y también sirve el depósito de la 18', procesar.ADJ_OK.test(URL_OK.replace('pagasi26-65ced', 'pagasi-v2')));
  r = await procesar.enviarEquipo(t.deps, { empresa: '26', convId: 'wav:+584145550000', texto: '', por: 'Adam', quien: admin, adjunto: { url: URL_OK, tipo: 'documento', nombre: '<img src=x onerror=alert(1)>.pdf', mime: 'application/pdf' } });
  ok('el nombre del archivo se guarda sin caracteres que armen código', !/[<>"']/.test(t.db26._store.get('conversaciones/wav:+584145550000/mensajes/' + r.metaId).medio.nombre));
  ok('sin texto ni adjunto sigue sin mandarse nada', /^texto/.test(await falla({ convId: 'wav:+584145550000' })));

  // ══ 6. Quién puede: el área, igual que en las Reglas ══
  const cv = (canal, area) => ({ canal, area });
  const u = (permisos, extra) => Object.assign({ empresa: '26', rol: 'Vendedor', permisos }, extra || {});
  ok('con los permisos nuevos: Redes Ventas no escribe en cobranza y Redes Cobranza no escribe en ventas',
    procesar.puedeConv(u(['redes', 'whatsapp', 'instagram']), cv('whatsapp', 'ventas'), '26') && procesar.puedeConv(u(['redes', 'whatsapp', 'instagram']), cv('instagram', 'ventas'), '26') && !procesar.puedeConv(u(['redes', 'whatsapp', 'instagram']), cv('whatsapp', 'cobranza'), '26')
    && procesar.puedeConv(u(['redescob', 'whatsapp']), cv('whatsapp', 'cobranza'), '26') && procesar.puedeConv(u(['redescob', 'whatsapp']), cv('whatsapp'), '26') && !procesar.puedeConv(u(['redescob', 'whatsapp']), cv('whatsapp', 'ventas'), '26'));
  ok('un usuario de antes (solo el canal) entra como entraba; el administrador, a todo; otra compañía o un vendedor de concesionario, a nada',
    procesar.puedeConv(u(['whatsapp']), cv('whatsapp', 'ventas'), '26') && procesar.puedeConv(u(['whatsapp']), cv('whatsapp', 'cobranza'), '26') && !procesar.puedeConv(u(['whatsapp']), cv('instagram', 'ventas'), '26')
    && procesar.puedeConv({ admin: true, empresa: '18' }, cv('whatsapp', 'cobranza'), '26') && !procesar.puedeConv(u(['redes', 'whatsapp'], { empresa: '18' }), cv('whatsapp', 'ventas'), '26') && !procesar.puedeConv(u(['redes', 'whatsapp'], { rol: 'Vendedor Concesionario' }), cv('whatsapp', 'ventas'), '26'));
  const cob = u(['redescob', 'whatsapp'], { nombre: 'Cobrador' });
  ok('quien solo tiene Redes Cobranza ya no puede escribir en una conversación de ventas aunque conozca su id', /^permiso: No tienes acceso a esa conversación/.test(await falla({ convId: 'wav:+584145550000', texto: 'hola', quien: cob })));

  // ══ 7. Bajar ahora un archivo que no quedó guardado ══
  await t.db26.collection('conversaciones').doc('wav:+584145550000').collection('mensajes').doc('wamid.viejo').set({ metaId: 'wamid.viejo', direccion: 'entrante', autor: 'cliente', tipo: 'audio', texto: '', medio: { id: 'voz1', mime: 'audio/ogg', voz: true }, hora: AHORA });
  await t.db26.collection('conversaciones').doc('wav:+584145550000').collection('mensajes').doc('wamid.muerto').set({ metaId: 'wamid.muerto', direccion: 'entrante', autor: 'cliente', tipo: 'audio', texto: '', medio: { id: 'vencido', mime: 'audio/ogg' }, hora: AHORA });
  t.subidos.length = 0;
  r = await procesar.medioDeMensaje(t.deps, { empresa: '26', convId: 'wav:+584145550000', msgId: 'wamid.viejo', quien: admin });
  msg = t.db26._store.get('conversaciones/wav:+584145550000/mensajes/wamid.viejo');
  ok('«Bajar»: el servidor lo trae de WhatsApp, lo guarda y deja el enlace en el mensaje', r.medio.url === 'https://st/redes_whatsapp/584145550000/wamid.viejo.ogg' && msg.medio.url === r.medio.url && msg.medio.voz === true && msg.medio.id === 'voz1' && t.subidos.length === 1);
  r = await procesar.medioDeMensaje(t.deps, { empresa: '26', convId: 'wav:+584145550000', msgId: 'wamid.viejo', quien: admin });
  ok('...pedirlo otra vez no lo vuelve a bajar', t.subidos.length === 1 && !!r.medio.url);
  const pide = async (args) => { try { await procesar.medioDeMensaje(t.deps, Object.assign({ empresa: '26', convId: 'wav:+584145550000', quien: admin }, args)); return ''; } catch (e) { return e.codigo + ': ' + e.message; } };
  ok('...pasados los 7 días de WhatsApp lo dice claro', /^vencido: WhatsApp ya no deja bajar ese archivo: solo los guarda 7 días/.test(await pide({ msgId: 'wamid.muerto' })));
  ok('...y solo lo baja quien puede ver esa conversación', /^permiso/.test(await pide({ msgId: 'wamid.viejo', quien: cob })) && /^permiso/.test(await pide({ msgId: 'wamid.viejo', quien: null })) && /^mensaje/.test(await pide({ msgId: 'no-existe' })));

  // ══ 8. La pantalla ══
  const els = {};
  function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', hidden: true, style: {}, className: '', scrollTop: 0, scrollHeight: 0, disabled: false, getAttribute() { return null; } }); }
  const doc = { activeElement: null, getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, createElement() { return { click() {}, set onchange(f) {} }; } };
  const timers = [], toasts = [], pedidos = [], puestos = [];
  const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, location: { origin: 'https://pagasi.io' }, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
    S: { page: 'redes', currentUser: { nombre: 'Marianne Molina', uid: 'u2' }, creds: [], pagos: [], clientes: [] }, PG: {}, nav() {}, toast: (x, tipo) => toasts.push((tipo || '') + ': ' + x), logActividad() {}, closeM() { ctx._cerrado = (ctx._cerrado || 0) + 1; }, saveM() {},
    isAdminUser: () => true, fmt: (n) => '$' + n, hoyLocalISO: () => HOY, CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
    URL: { createObjectURL: () => 'blob:vista', revokeObjectURL() {} }, Promise, Date, Math, JSON,
    FIREBASE_CONFIG: { projectId: 'pagasi26-65ced' },
    firebase: { auth: () => ({ currentUser: { getIdToken: () => Promise.resolve('tok') } }) },
    fetch(url, o) { pedidos.push({ url, cuerpo: JSON.parse(o.body) }); return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, medio: { url: 'https://st/bajado.ogg', path: 'redes_whatsapp/x.ogg', voz: true } }) }); },
    storage: { ref: () => ({ child: (ruta) => ({ put: (blob, m) => { puestos.push({ ruta, tipo: m.contentType, blob }); return Promise.resolve(); }, getDownloadURL: () => Promise.resolve('https://firebasestorage.googleapis.com/v0/b/pagasi26-65ced.firebasestorage.app/o/' + encodeURIComponent(ruta) + '?alt=media&token=aaaa-bbbb') }) }) } };
  ctx.window = ctx;
  const consulta = () => { const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, get() { return Promise.resolve({ docs: [] }); }, onSnapshot() { return () => {}; }, doc() { return { get() { return new Promise(() => {}); }, set() { return Promise.resolve(); }, collection: consulta }; } }; return q; };
  ctx.db = { collection: consulta };
  vm.createContext(ctx);
  for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(src(f), ctx, { filename: f });
  const flush = () => { while (timers.length) timers.shift()(); };
  const tic = () => new Promise(r => setImmediate(r));
  const hoy = new Date().toISOString();
  ctx._waCfg = { conectado: true, instagram: 'pagasi.io' };
  ctx._waConvs = [
    { id: 'wav:+584145550000', canal: 'whatsapp', area: 'ventas', nombre: 'Luis Pérez', telE164: '+584145550000', ultimoMensaje: 'hola', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy },
    { id: 'wa:+584141234567', canal: 'whatsapp', area: 'cobranza', nombre: 'María', telE164: '+584141234567', ultimoMensaje: 'hola', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy },
    { id: 'ig:9001', canal: 'instagram', area: 'ventas', nombre: 'luis.ve', ultimoMensaje: 'hola', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy },
    { id: 'ig:9002', canal: 'instagram', area: 'ventas', nombre: 'ana.ve', ultimoMensaje: 'hola', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy, borrador: { tipo: 'lead', telefono: '04125556677' } }];
  const C = id => ctx._waConvs.find(x => x.id === id);
  const hilo = id => ctx._waHtmlHilo(C(id), { canal: 'todos', area: C(id).area }, true);
  ok('la caja de escribir trae «Adjuntar» en Redes Ventas (WhatsApp e Instagram) y en Redes Cobranza', /onclick="waAdjuntar\('wav:\+584145550000'\)"[\s\S]*Adjuntar<\/button>/.test(hilo('wav:+584145550000')) && /waAdjuntar\('ig:9001'\)/.test(hilo('ig:9001')) && /waAdjuntar\('wa:\+584141234567'\)/.test(hilo('wa:+584141234567')) && !/waFotoMoto/.test(hilo('wa:+584141234567')));
  ok('la cabecera trae «Llamar» con el teléfono de la conversación (tel:+58…), también en cobranza', /<a class="rs-ib" href="tel:\+584145550000"[^>]*>[\s\S]*Llamar<\/a>/.test(hilo('wav:+584145550000')) && /href="tel:\+584141234567"/.test(hilo('wa:+584141234567')));
  ok('...en Instagram solo si la persona dejó su teléfono (0412… pasa a +58412…)', !/href="tel:/.test(hilo('ig:9001')) && /href="tel:\+584125556677"/.test(hilo('ig:9002')));

  // Qué se puede adjuntar
  const A = (name, type, mb) => ({ name, type: type || '', size: Math.round((mb || 1) * 1048576) });
  ok('reconoce fotos, documentos, videos MP4 y audios', ctx.waAdjTipo(A('foto.JPG', 'image/jpeg')) === 'imagen' && ctx.waAdjTipo(A('IMG_1.HEIC', '')) === 'imagen' && ctx.waAdjTipo(A('requisitos.pdf', 'application/pdf')) === 'documento' && ctx.waAdjTipo(A('lista.xlsx', '')) === 'documento' && ctx.waAdjTipo(A('carta.docx', '')) === 'documento' && ctx.waAdjTipo(A('v.mp4', 'video/mp4')) === 'video' && ctx.waAdjTipo(A('nota.m4a', 'audio/mp4')) === 'audio' && ctx.waAdjTipo(A('nota.ogg', '')) === 'audio');
  ok('lo que Meta no recibe se rechaza con un mensaje claro', /no es MP4/.test(ctx.waAdjError(A('video.MOV', 'video/quicktime'), C('wav:+584145550000'))) && /no se puede mandar/.test(ctx.waAdjError(A('programa.exe', 'application/x-msdownload'), C('wav:+584145550000'))) && /no se puede mandar/.test(ctx.waAdjError(A('archivo.zip', 'application/zip'), C('wav:+584145550000'))));
  ok('los topes: documento 25 MB, video y audio 16 MB', /van hasta 25 MB/.test(ctx.waAdjError(A('g.pdf', 'application/pdf', 26), C('wav:+584145550000'))) && /van hasta 16 MB/.test(ctx.waAdjError(A('g.mp4', 'video/mp4', 17), C('wav:+584145550000'))) && ctx.waAdjError(A('g.pdf', 'application/pdf', 24), C('wav:+584145550000')) === '' && ctx.waAdjError(A('f.jpg', 'image/jpeg', 12), C('wav:+584145550000')) === '');
  ok('Instagram: de documentos solo PDF, y de audios solo M4A o AAC', /solo se pueden mandar documentos en PDF/.test(ctx.waAdjError(A('carta.docx', ''), C('ig:9001'))) && ctx.waAdjError(A('carta.pdf', 'application/pdf'), C('ig:9001')) === '' && /audios M4A o AAC/.test(ctx.waAdjError(A('nota.ogg', 'audio/ogg'), C('ig:9001'))) && ctx.waAdjError(A('nota.m4a', 'audio/mp4'), C('ig:9001')) === '');
  const ruta = ctx.waAdjRuta('wav:+584145550000', 'Constancia de TRABAJO (María Pérez) ñ.pdf', 'documento', 1795000000000);
  ok('la ruta en Storage va sin espacios, tildes ni símbolos: redes_equipo/<conversación>/<hora>-<azar>-<nombre>', /^redes_equipo\/wav_584145550000\/1795000000000-[a-z0-9]{1,6}-Constancia_de_TRABAJO_Maria_Perez_n\.pdf$/.test(ruta));
  ok('...y el enlace que da Firebase con esa ruta lo acepta el servidor', procesar.ADJ_OK.test('https://firebasestorage.googleapis.com/v0/b/pagasi26-65ced.firebasestorage.app/o/' + encodeURIComponent(ruta) + '?alt=media&token=1c0a7d5e-9b1f-4c59-8a51-0f6f3a1f2b9d'));
  ok('...una foto siempre queda .jpg (se achica antes de subir)', /-IMG_2291\.jpg$/.test(ctx.waAdjRuta('ig:9001', 'IMG_2291.HEIC', 'imagen')));

  // Revisar y mandar un documento
  ['mtt', 'msb', 'modal-box', 'mbd', 'mft', 'ov'].forEach(el);
  els['wa-texto'] = { id: 'wa-texto', value: 'Te mando los requisitos', getAttribute: () => 'wav:+584145550000' };
  ctx._waMsgs = {};
  ctx.waAdjuntoRevisar('wav:+584145550000', A('Requisitos Pagasi.pdf', 'application/pdf', 2));
  ok('la ventana muestra el archivo, su peso y el texto que ya estaba en la caja', /Mandar documento/.test(els.mtt.textContent) && /Por WhatsApp a Luis Pérez/.test(els.msb.textContent) && /Requisitos Pagasi\.pdf/.test(els.mbd.innerHTML) && /2,0 MB/.test(els.mbd.innerHTML) && /Te mando los requisitos<\/textarea>/.test(els.mbd.innerHTML) && /waAdjuntoEnviar\(\)/.test(els.mft.innerHTML));
  els['wa-adj-txt'] = { value: 'Te mando los requisitos' }; el('wa-adj-btn'); el('wa-adj-est');
  ctx.waAdjuntoEnviar(); ctx.waAdjuntoEnviar();   // dos toques seguidos
  for (let i = 0; i < 6; i++) await tic();
  ok('al enviar: se sube UNA vez a Storage (aunque se toque dos veces), con su tipo', puestos.length === 1 && /^redes_equipo\/wav_584145550000\/\d+-[a-z0-9]+-Requisitos_Pagasi\.pdf$/.test(puestos[0].ruta) && puestos[0].tipo === 'application/pdf');
  const ped = pedidos.find(x => x.cuerpo.adjunto);
  ok('...y se le pide al servidor con el enlace, el tipo, el nombre y el texto', ped && ped.cuerpo.conv === 'wav:+584145550000' && ped.cuerpo.texto === 'Te mando los requisitos' && ped.cuerpo.adjunto.tipo === 'documento' && ped.cuerpo.adjunto.nombre === 'Requisitos Pagasi.pdf' && ped.cuerpo.adjunto.mime === 'application/pdf' && procesar.ADJ_OK.test(ped.cuerpo.adjunto.url) && ped.cuerpo.empresa === '26');
  ok('...la ventana se cierra, la caja queda vacía y el mensaje aparece en el hilo', ctx._cerrado === 1 && els['wa-texto'].value === '' && ctx._waMsgs['wav:+584145550000'].length === 1 && ctx._waMsgs['wav:+584145550000'][0].tipo === 'documento' && ctx._waMsgs['wav:+584145550000'][0].medio.nombre === 'Requisitos Pagasi.pdf' && C('wav:+584145550000').ultimoMensaje === 'Te mando los requisitos' && toasts.some(x => /Documento enviado/.test(x)));
  toasts.length = 0;
  ctx.waAdjuntoRevisar('wav:+584145550000', A('video.MOV', 'video/quicktime', 3));
  ok('un archivo que no sirve ni siquiera abre la ventana', toasts.some(x => /^error: Ese video no es MP4/.test(x)));
  C('ig:9001').ultimoEntranteHora = '2026-01-01T00:00:00.000Z'; toasts.length = 0;
  ctx.waAdjuntar('ig:9001');
  ok('con la ventana de Meta cerrada no se puede adjuntar', toasts.some(x => /ventana para escribirle está cerrada/.test(x)));
  C('ig:9001').ultimoEntranteHora = hoy;

  // Las burbujas
  const H = (m) => ctx._waHtmlAdjunto(m, 'wav:+584145550000');
  let h = H({ id: 'm1', direccion: 'entrante', tipo: 'audio', hora: hoy, medio: { url: 'https://st/a.ogg', voz: true } });
  ok('una nota de voz guardada se oye en el hilo (reproductor) y se puede abrir aparte', /🎤 Nota de voz/.test(h) && /<audio controls preload="none" src="https:\/\/st\/a\.ogg"/.test(h) && /onerror="_waSonFallo\(this\)"/.test(h) && />Abrir<\/a>/.test(h));
  h = H({ id: 'm2', direccion: 'entrante', tipo: 'audio', hora: hoy, medio: { url: 'https://st/a.mp3' } });
  ok('un audio que no es nota de voz dice «Audio»', /🎵 Audio/.test(h) && /<audio /.test(h));
  h = H({ id: 'm3', direccion: 'entrante', tipo: 'video', hora: hoy, medio: { url: 'https://st/v.mp4' } });
  ok('un video guardado se ve en el hilo', /<video controls playsinline preload="metadata" src="https:\/\/st\/v\.mp4"/.test(h) && !/Instagram no deja verlo/.test(h));
  h = H({ id: 'm4', direccion: 'saliente', autor: 'equipo', tipo: 'documento', hora: hoy, medio: { url: 'https://st/r.pdf', nombre: 'Requisitos <b>Pagasi</b>.pdf' } });
  ok('un documento sale con su nombre (escapado) y abre en otra pestaña', /📄 <a href="https:\/\/st\/r\.pdf" target="_blank" rel="noopener noreferrer">Requisitos &lt;b&gt;Pagasi&lt;\/b&gt;\.pdf<\/a>/.test(h));
  h = H({ id: 'wamid.x', direccion: 'entrante', tipo: 'audio', hora: hoy, medio: { id: 'voz9', mime: 'audio/ogg', voz: true } });
  ok('una nota de voz que no quedó guardada trae el botón «Bajar»', /🎤 Nota de voz/.test(h) && /<button type="button" class="wa-bajar" onclick="waPedirMedio\('wav:\+584145550000','wamid\.x',this\)">Bajar<\/button>/.test(h));
  h = H({ id: 'wamid.y', direccion: 'entrante', tipo: 'documento', hora: new Date(Date.now() - 9 * 86400000).toISOString(), medio: { id: 'doc9', nombre: 'cedula.pdf' } });
  ok('...pasados 7 días ya no ofrece bajarlo y explica por qué', !/wa-bajar/.test(h) && /WhatsApp guarda los archivos 7 días/.test(h) && /cedula\.pdf/.test(h));
  h = H({ id: 'wamid.z', direccion: 'entrante', tipo: 'video', hora: hoy, medio: { id: 'vid9' } });
  ok('...un video de WhatsApp sin guardar ya no dice «Instagram no deja verlo»', /wa-bajar/.test(h) && !/Instagram/.test(h));
  ok('lo de antes sigue igual: la foto con enlace se ve y un texto no lleva adjunto', /<img src="https:\/\/st\/f\.jpg"/.test(H({ id: 'm5', tipo: 'imagen', hora: hoy, medio: { url: 'https://st/f.jpg' } })) && H({ id: 'm6', tipo: 'texto', texto: 'hola', hora: hoy }) === '' && /Instagram no deja verlo aquí/.test(H({ id: 'm7', direccion: 'entrante', tipo: 'historia', hora: hoy, medio: null })));
  // «Bajar» le pide el archivo al servidor
  ctx._waMsgs['wav:+584145550000'] = [{ id: 'wamid.x', direccion: 'entrante', tipo: 'audio', hora: hoy, medio: { id: 'voz9', voz: true } }];
  pedidos.length = 0;
  const boton = { disabled: false, textContent: 'Bajar' };
  await ctx.waPedirMedio('wav:+584145550000', 'wamid.x', boton);
  ok('«Bajar» pide el archivo al servidor (accion medio) y el mensaje queda con su enlace', pedidos.length === 1 && pedidos[0].cuerpo.accion === 'medio' && pedidos[0].cuerpo.msg === 'wamid.x' && pedidos[0].cuerpo.conv === 'wav:+584145550000' && ctx._waMsgs['wav:+584145550000'][0].medio.url === 'https://st/bajado.ogg' && boton.disabled === true);

  // El hilo no se repinta mientras suena una nota de voz
  const audio = { paused: false, ended: false };
  const cont = { innerHTML: 'ANTES', scrollTop: 0, scrollHeight: 0, querySelectorAll: () => [audio] };
  els['wa-burbujas'] = cont; ctx._waSel = 'wav:+584145550000';
  ctx._waPintarHilo('wav:+584145550000');
  ok('mientras suena una nota de voz el hilo no se repinta (no se corta a la mitad)', cont.innerHTML === 'ANTES' && ctx._waHiloPendiente === 'wav:+584145550000');
  audio.paused = true; ctx._waSonPara(); flush();
  ok('...y se pinta en cuanto para', cont.innerHTML !== 'ANTES' && /wa-b/.test(cont.innerHTML) && !ctx._waHiloPendiente);

  // ══ 9. Lo que encontró el revisor (23-nov-2026) ══
  // 9.1 Los ids de Instagram son largos e iguales al principio: dos notas de voz de la misma persona no se pisan
  t = armar();
  const largo = 'aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDI1MzQ4MzUxOTU4OjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1OTQ1NTQ5NTMyNDkwNjk5NjozMjU';
  await procesar.procesarMensaje(t.deps, { canal: 'instagram', metaId: largo + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1111', de: '9001', nombre: '', tipo: 'audio', texto: '', medio: { url: 'https://cdn.meta/audio1', mime: '', tipoMeta: 'audio' }, hora: AHORA });
  await procesar.procesarMensaje(t.deps, { canal: 'instagram', metaId: largo + 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2222', de: '9001', nombre: '', tipo: 'audio', texto: '', medio: { url: 'https://cdn.meta/audio2', mime: '', tipoMeta: 'audio' }, hora: AHORA });
  ok('Instagram: dos notas de voz de la misma persona quedan en dos archivos distintos (antes la segunda pisaba a la primera)', t.subidos.length === 2 && t.subidos[0].ruta !== t.subidos[1].ruta && /1111\.m4a$/.test(t.subidos[0].ruta) && /2222\.m4a$/.test(t.subidos[1].ruta));
  // 9.2 Un reel compartido no se copia; un video que manda la persona, sí
  t = armar();
  t.deps.bajarUrl = async () => ({ bytes: Buffer.from('mp4'), mime: 'video/mp4' });
  await procesar.procesarMensaje(t.deps, { canal: 'instagram', metaId: 'mid.reel', de: '9001', nombre: '', tipo: 'video', texto: '', medio: { url: 'https://cdn.meta/reel', mime: '', tipoMeta: 'ig_reel' }, hora: AHORA });
  await procesar.procesarMensaje(t.deps, { canal: 'instagram', metaId: 'mid.video', de: '9001', nombre: '', tipo: 'video', texto: '', medio: { url: 'https://cdn.meta/video', mime: '', tipoMeta: 'video' }, hora: AHORA });
  ok('Instagram: un reel compartido no se baja; un video que manda la persona sí', t.subidos.length === 1 && /mid\.video\.mp4$/.test(t.subidos[0].ruta) && !t.db26._store.get('conversaciones/ig:9001/mensajes/mid.reel').medio.path);
  // 9.3 La descarga corre a la par: la asistente piensa sin esperar a que baje el archivo
  t = armar();
  t.deps.cfg.responde = { whatsappVentas: true, instagram: true, whatsappCobranza: true };
  const orden = [];
  let soltarBajada; const bajada = new Promise(r => { soltarBajada = r; });
  t.deps.meta.bajarMedio = async () => { orden.push('baja-empieza'); await bajada; orden.push('baja-termina'); return { bytes: Buffer.from('ogg'), mime: 'audio/ogg' }; };
  t.deps.cerebro.pensar = async () => { orden.push('piensa'); soltarBajada(); return { reply: 'Hola, ya te atiendo.', draft: null, summary: '', handoff: false, handoffReason: '' }; };
  await procesar.procesarMensaje(t.deps, { canal: 'whatsapp', metaId: 'wamid.par', de: '584141234567', nombre: 'María', tipo: 'audio', texto: '', medio: { id: 'voz1', mime: 'audio/ogg', nombre: '', voz: true }, hora: AHORA, telefonoNegocio: '584146401617' });
  msg = t.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.par');
  ok('la asistente contesta sin esperar a que termine de bajar la nota de voz, y el archivo igual queda guardado', orden.join(',') === 'baja-empieza,piensa,baja-termina' && !!msg.medio.url && t.llamadas.some(x => x.q === 'texto'));
  // 9.4 A la asistente se le dice quién mandó el archivo
  const cerebro = require(path.join(F, 'cerebro.js'));
  if (cerebro.turnos) {
    const T = cerebro.turnos([{ autor: 'cliente', direccion: 'entrante', tipo: 'texto', texto: 'hola' }, { autor: 'equipo', direccion: 'saliente', tipo: 'documento', texto: '' }, { autor: 'cliente', direccion: 'entrante', tipo: 'documento', texto: '' }]);
    ok('lo que mandó el equipo no se le cuenta a la asistente como «el cliente mandó…»', /\[respuesta del equipo de Pagasi\] \[el equipo le mandó un documento\]/.test(T[1].content) && /\[el cliente mandó un documento\]/.test(T[2].content));
  } else ok('cerebro.turnos se puede probar', false);
  // 9.5 El tipo del adjunto: solo los cuatro
  t = armar();
  await t.db26.collection('conversaciones').doc('wav:+584145550000').set({ canal: 'whatsapp', area: 'ventas', telE164: '+584145550000', ultimoEntranteHora: AHORA });
  let errTipo = ''; try { await procesar.enviarEquipo(t.deps, { empresa: '26', convId: 'wav:+584145550000', texto: '', por: 'Adam', quien: admin, adjunto: { url: URL_OK, tipo: 'constructor', nombre: 'x' } }); } catch (x) { errTipo = x.codigo; }
  ok('un tipo de adjunto inventado («constructor») se rechaza antes de mandar nada', errTipo === 'adjunto' && t.llamadas.length === 0);

  // 9.6 Cancelar mientras sube: el archivo ya no sale
  pedidos.length = 0; puestos.length = 0; toasts.length = 0; ctx._cerrado = 0;
  let soltarSubida; const subida = new Promise(r => { soltarSubida = r; });
  let canceladaTarea = false;
  ctx.storage = { ref: () => ({ child: (ruta) => ({ put: (blob, m) => { puestos.push({ ruta }); const p = subida.then(() => ({})); p.on = () => {}; p.cancel = () => { canceladaTarea = true; }; return p; }, getDownloadURL: () => Promise.resolve('https://firebasestorage.googleapis.com/v0/b/pagasi26-65ced.firebasestorage.app/o/' + encodeURIComponent(ruta) + '?alt=media&token=aaaa-bbbb') }) }) };
  ctx._waMsgs['wav:+584145550000'] = [];
  ctx.waAdjuntoRevisar('wav:+584145550000', A('Equivocado.pdf', 'application/pdf', 14));
  els['wa-adj-txt'] = { value: '' };
  ok('el botón Cancelar de la ventana corta el envío (waAdjuntoCancelar)', /onclick="waAdjuntoCancelar\(\)"/.test(els.mft.innerHTML));
  ctx.waAdjuntoEnviar();
  for (let i = 0; i < 3; i++) await tic();
  ctx.waAdjuntoCancelar();
  soltarSubida();
  for (let i = 0; i < 6; i++) await tic();
  ok('cancelar a mitad de la subida: se corta la subida y el archivo NO se le manda a la persona', puestos.length === 1 && canceladaTarea === true && !pedidos.some(x => x.cuerpo.adjunto) && ctx._waMsgs['wav:+584145550000'].length === 0 && !toasts.some(x => /enviado/.test(x)));
  // 9.7 Mandar un mensaje mientras suena una nota de voz: el mensaje propio se ve al momento
  audio.paused = false; cont.innerHTML = 'ANTES'; els['wa-burbujas'] = cont; ctx._waSel = 'wav:+584145550000';
  ctx.waEnviarEquipo('wav:+584145550000', 'ya te la mando');
  ok('el mensaje propio aparece aunque esté sonando una nota de voz', /ya te la mando/.test(cont.innerHTML));
  // ...y un mensaje nuevo de la persona no rehace el hilo mientras suena
  ['wa-items', 'wa-hilo', 'wa-ficha'].forEach(el); els['wa-hilo'].innerHTML = 'HILO'; ctx._waFirma = 'otra';
  ctx._waRefrescarEnSitio();
  ok('si llega algo mientras suena, el hilo no se rehace (queda pendiente) y se pinta al parar', els['wa-hilo'].innerHTML === 'HILO' && ctx._waSeleccionPendiente === true && (audio.paused = true, ctx._waSonPara(), flush(), els['wa-hilo'].innerHTML !== 'HILO' && !ctx._waSeleccionPendiente));

  console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
