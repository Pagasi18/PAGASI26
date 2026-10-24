// Cobranza por WhatsApp (18-oct-2026): el lado del servidor, con piezas falsas (sin red, sin Meta,
// sin Claude). Se prueba lo que llega de Meta, el briefing, la respuesta del cerebro, el flujo
// completo de un mensaje en las dos companias, los comprobantes, los estados, el equipo y los
// recordatorios.
const path = require('path');
const F = path.join(__dirname, '..', 'functions', 'lib');
const meta = require(path.join(F, 'meta.js')), briefing = require(path.join(F, 'briefing.js')), cerebro = require(path.join(F, 'cerebro.js')), procesar = require(path.join(F, 'procesar.js')), recordatorios = require(path.join(F, 'recordatorios.js')), ventas = require(path.join(F, 'ventas.js'));
const Cat = require(path.join(__dirname, '..', 'assets', 'public', 'catalog.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

// ── Un Firestore falso con lo que usa el servidor ──
function FakeDb(inicial) {
  const store = new Map();   // ruta completa -> datos
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
  return { collection: coleccion, _store: store, _lista: (pref) => [...store.entries()].filter(([k]) => k.startsWith(pref)).map(([k, d]) => Object.assign({ _ruta: k }, d)) };
}
const HOY = '2026-10-18', AHORA = '2026-10-18T14:00:00.000Z';
const iso = d => { const x = new Date(Date.UTC(2026, 9, 18)); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
function cred(id, clienteId, dias, extra) { return Object.assign({ id, clienteId, cli: 'MARÍA PÉREZ', marca: 'EK', modelo: 'XPRESS 150', placa: 'AB123CD', estado: 'activo', fecha: iso(-dias), cuotaQ: 50, cuota: 100, totalCuotas: 24, plazo: 12, total: 1200, fin: 1200, precio: 1800, ini: 600, frecuencia: 'quincenal' }, extra || {}); }
function armar() {
  const db26 = FakeDb({ indice_clientes: { '+584141234567': { clienteId: 'C26' } }, clientes: { C26: { id: 'C26', nombre: 'MARÍA JOSÉ PÉREZ', tel: '04141234567', telE164: '+584141234567' } }, creditos: { 'M-1': cred('M-1', 'C26', 20) }, pagos: { p1: { cred: 'M-1', monto: 50, fecha: iso(-6), estado: 'confirmado' } } });
  const db18 = FakeDb({ indice_clientes: { '+584241112233': { clienteId: 'C18' } }, clientes: { C18: { id: 'C18', nombre: 'JOSÉ ROJAS', telE164: '+584241112233' } }, creditos: { 'CRED-9': cred('CRED-9', 'C18', 40, { cli: 'JOSÉ ROJAS' }) }, pagos: {} });
  const enviados = [], plantillas = [], subidos = [];
  const metaFalso = { enviarTexto: async (a, t) => { enviados.push({ a, t }); return 'wamid.out' + enviados.length; }, enviarPlantilla: async (a, n, p) => { plantillas.push({ a, n, p }); return 'wamid.tpl' + plantillas.length; }, marcarLeido: async () => '', bajarMedio: async () => ({ bytes: Buffer.from('img'), mime: 'image/jpeg' }) };
  const cerebroFalso = { ultimo: null, respuesta: null, falla: false, async pensar(x) { this.ultimo = x; if (this.falla) throw new Error('sin cuota'); return this.respuesta || { reply: 'Hola María, vas al día.', draft: null, summary: 'Preguntó cuánto debe.', handoff: false, handoffReason: '' }; } };
  const ig = [], comentariosResp = [], privados = [], igFalso = { enviarTexto: async (a, t, op) => { ig.push({ a, t, humano: !!(op && op.humano) }); return 'mid.out' + ig.length; }, marcarLeido: async () => '', perfil: async () => ({ nombre: 'Luis Pérez', usuario: 'luisperez.ve' }), responderComentario: async (id, t) => { comentariosResp.push({ id, t }); return 'rep' + comentariosResp.length; }, mensajePrivado: async (id, t) => { privados.push({ id, t }); return { metaId: 'mid.priv' + privados.length, igsid: '9900' + privados.length }; } };
  const catalogo = { motos: [{ id: '1', name: 'BRZ 200', modelo: 'BRZ 200', sedeName: 'EK Bello Monte', precio: 1750, cc: '200cc', cat: 'Ciudad', disponible: true, orden: 1 }, { id: '2', name: 'Kavak 250', sedeName: 'EK Bello Monte', precio: 2900, disponible: true, orden: 2 }, { id: '3', name: 'SBR 150', sedeName: 'Haojin', precio: null, disponible: true }, { id: '4', name: 'Vieja', sedeName: 'Haojin', precio: 900, disponible: false }], cond: { apy: 500, seguroPct: 0, inicialMin: 40, inicialMax: 60, plazos: [6, 9, 12] }, sedes: [{ nombre: 'EK Bello Monte', ciudad: 'Caracas', direccion: 'Av. Principal' }] };
  const deps = { bases: { '26': db26, '18': db18 }, storage: () => ({ subir: async (ruta, bytes, mime) => { subidos.push({ ruta, mime }); return 'https://st/' + ruta; } }), meta: metaFalso, metaIG: igFalso, instagramId: '17841425348351958', ventas: async () => catalogo, cerebro: cerebroFalso, cfg: { instagram: 'pagasi.io', instrucciones: 'Esta semana no se recibe efectivo.', instruccionesVentas: 'Hay promo de casco gratis en octubre.', datosPago: 'Pago Móvil 0414-000-0000 · Banco X · RIF J-00000000-0', empresaNombre: { '18': 'PAGASI 18', '26': 'PAGASI 26' } }, ahora: () => AHORA, hoy: () => HOY, log: () => {} };
  return { db26, db18, enviados, plantillas, subidos, ig, comentariosResp, privados, catalogo, metaFalso, cerebroFalso, deps };
}
const msgTexto = (de, texto, id) => ({ metaId: id || 'wamid.in' + Math.random().toString(36).slice(2), de, nombre: 'Perfil WA', tipo: 'texto', texto, medio: null, hora: AHORA });

(async () => {
  // ── 1. Lo que llega de Meta ──
  const aviso = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { metadata: { display_phone_number: '584222285526' }, contacts: [{ wa_id: '584141234567', profile: { name: 'María' } }],
    messages: [{ id: 'wamid.1', from: '584141234567', timestamp: '1760796000', type: 'text', text: { body: 'cuánto debo?' } }, { id: 'wamid.2', from: '584141234567', timestamp: '1760796001', type: 'image', image: { id: 'media9', mime_type: 'image/jpeg', caption: 'mi pago' } }],
    statuses: [{ id: 'wamid.out1', status: 'delivered', timestamp: '1760796002', recipient_id: '584141234567' }, { id: 'wamid.out2', status: 'failed', recipient_id: '584141234567', errors: [{ code: 131026, title: 'Message undeliverable' }] }] } }] }] };
  const p = meta.parsearWebhook(aviso);
  ok('del aviso salen 2 mensajes (texto e imagen) y 2 estados', p.mensajes.length === 2 && p.estados.length === 2 && p.objeto === 'whatsapp_business_account');
  ok('el texto trae id, número, nombre del perfil y hora', p.mensajes[0].metaId === 'wamid.1' && p.mensajes[0].de === '584141234567' && p.mensajes[0].nombre === 'María' && p.mensajes[0].texto === 'cuánto debo?' && /^2025|^2026/.test(p.mensajes[0].hora));
  ok('la imagen trae el medio y el pie', p.mensajes[1].tipo === 'imagen' && p.mensajes[1].medio.id === 'media9' && p.mensajes[1].texto === 'mi pago');
  ok('los estados se traducen (entregado / fallo con su error)', p.estados[0].estado === 'entregado' && p.estados[1].estado === 'fallo' && /131026/.test(p.estados[1].error));
  ok('un aviso que no es de WhatsApp no produce nada', meta.parsearWebhook({ object: 'instagram', entry: [] }).mensajes.length === 0);
  ok('la verificación responde el challenge solo con el token correcto', meta.verificacion({ 'hub.mode': 'subscribe', 'hub.verify_token': 'secreto', 'hub.challenge': '123' }, 'secreto') === '123' && meta.verificacion({ 'hub.mode': 'subscribe', 'hub.verify_token': 'otro', 'hub.challenge': '123' }, 'secreto') === null);
  const crypto = require('crypto'); const cuerpo = '{"a":1}'; const firma = 'sha256=' + crypto.createHmac('sha256', 'app-secret').update(cuerpo).digest('hex');
  ok('la firma X-Hub-Signature-256 se verifica, y sin el secreto real nada entra', meta.firmaValida(cuerpo, firma, 'app-secret') && !meta.firmaValida(cuerpo, 'sha256=mala', 'app-secret') && !meta.firmaValida(cuerpo, firma, '') && !meta.firmaValida(cuerpo, firma, 'pendiente'));

  // ── 2. El briefing ──
  const e = briefing.estadoCredito(cred('M-1', 'C26', 20), [{ cred: 'M-1', monto: 50, fecha: iso(-6), estado: 'confirmado' }], HOY);
  ok('el estado del crédito: 1 pagada de 24, la próxima es la 2 y vence hoy o pronto', e && e.pagadas === 1 && e.totalCuotas === 24 && e.proxima && e.proxima.numero === 2);
  const sis = briefing.armar({ empresa: 'PAGASI 26', cliente: { nombre: 'MARÍA JOSÉ PÉREZ' }, creditos: [e], instrucciones: 'Esta semana no se recibe efectivo.', datosPago: 'Pago Móvil 0414', hoy: HOY, nombrePerfil: 'María' });
  ok('el briefing lleva las reglas fijas, las instrucciones del equipo, cómo pagar y las cifras', /NUNCA inventes montos/.test(sis) && /no se recibe efectivo/.test(sis) && /Pago Móvil 0414/.test(sis) && /CRÉDITO M-1/.test(sis) && /1 de 24 cuotas pagadas/.test(sis) && /llámalo María/.test(sis));
  const sisDatos = briefing.armar({ empresa: 'PAGASI 26', cliente: { nombre: 'MARÍA JOSÉ PÉREZ', cedula: 'V-12345678', direccion: 'Calle 5, casa 12', tel: '04141234567', email: 'maria@x.com' }, creditos: [e], hoy: HOY });
  ok('el briefing no lleva la cédula, la dirección, el teléfono ni el correo del cliente', !/12345678|Calle 5|04141234567|maria@x/.test(sisDatos));
  ok('sin cliente, pide nombre y manda a una persona', /no está registrado como cliente/.test(briefing.armar({ cliente: null, creditos: [], hoy: HOY, nombrePerfil: 'Pepe' })));

  // ── 3. El cerebro: validación y turnos ──
  ok('una respuesta bien formada pasa y la promesa queda limpia', JSON.stringify(cerebro.validar({ reply: 'ok', draft: { tipo: 'promesa', fecha: '2026-10-24', monto: 50, nota: 'sábado' }, summary: 's', handoff: true, handoffReason: 'queja' })) === JSON.stringify({ reply: 'ok', draft: { tipo: 'promesa', fecha: '2026-10-24', monto: 50, nota: 'sábado' }, summary: 's', handoff: true, handoffReason: 'queja' }));
  ok('sin reply o con razón inventada se corrige o se descarta', cerebro.validar({ summary: 'x' }) === null && cerebro.validar({ reply: 'x', summary: '', handoff: true, handoffReason: 'zzz' }).handoffReason === 'otro' && cerebro.validar({ reply: 'x', draft: { tipo: 'promesa', fecha: 'mañana' }, summary: '', handoff: false }).draft === null);
  // Ahorro (21-oct-2026): la parte fija del manual va guardada en Anthropic (cache_control) y lo de la conversación aparte
  {
    let cuerpo = null;
    const fakeFetch = async (u, o) => { cuerpo = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'tool_use', name: 'responder', input: { reply: 'Hola', summary: '', handoff: false } }], usage: {} }) }; };
    const sis = ventas.armarVentas({ motos: [], cond: null, sedes: [{ nombre: 'EK Trujillo', ciudad: 'VALERA', vendidas: [] }], hoy: '2026-10-21', usuario: 'ana', canal: 'instagram' });
    await cerebro.pensar({ apiKey: 'x', sistema: sis + '\n\nATENCIÓN: prueba', mensajes: [{ autor: 'cliente', texto: 'hola' }], fetchImpl: fakeFetch });
    ok('ahorro: el manual va en 2 bloques, el fijo guardado (cache_control) y la persona y los avisos en el segundo, sin la marca', Array.isArray(cuerpo.system) && cuerpo.system.length === 2 && cuerpo.system[0].cache_control && cuerpo.system[0].cache_control.type === 'ephemeral' && !cuerpo.system[1].cache_control && /LA PERSONA/.test(cuerpo.system[1].text) && /ATENCIÓN: prueba/.test(cuerpo.system[1].text) && /CATÁLOGO|SEDES ALIADAS/.test(cuerpo.system[0].text) && !JSON.stringify(cuerpo.system).includes(cerebro.MARCA));
    ok('ahorro: el último mensaje de la conversación también queda guardado', cuerpo.messages[cuerpo.messages.length - 1].content[0].cache_control.type === 'ephemeral');
    const otra = ventas.armarVentas({ motos: [], cond: null, sedes: [{ nombre: 'EK Trujillo', ciudad: 'VALERA', vendidas: [] }], hoy: '2026-10-21', usuario: 'luis', nombrePerfil: 'Luis', canal: 'instagram' });
    ok('ahorro: la parte fija es idéntica para dos personas distintas (así se reutiliza entre conversaciones)', cerebro.sistemaEnBloques(sis)[0].text === cerebro.sistemaEnBloques(otra)[0].text);
    const b1 = cerebro.sistemaEnBloques(briefing.armar({ empresa: 'PAGASI 26', cliente: { nombre: 'ANA PÉREZ' }, creditos: [], hoy: '2026-10-21' })), b2 = cerebro.sistemaEnBloques(briefing.armar({ empresa: 'PAGASI 26', cliente: null, creditos: [], hoy: '2026-10-21', nombrePerfil: 'X' }));
    ok('ahorro: en cobranza lo fijo es igual para todos los clientes y la ficha del cliente va aparte', b1[0].text === b2[0].text && /EL CLIENTE/.test(b1[1].text) && /EL CONTACTO/.test(b2[1].text));
  }
  // Bolívares a tasa euro (Adam, 21-oct-2026)
  {
    const e = briefing.estadoCredito(cred('M-9', 'C9', 15, { cuotaQ: 50, cuota: 100 }), [], HOY);
    const sb = briefing.armar({ empresa: 'PAGASI 26', cliente: { nombre: 'ANA PÉREZ' }, creditos: [e], hoy: HOY, tasaEuro: 993.18, fechaEuro: HOY });
    ok('bolívares: Patricia sabe que se puede pagar en bolívares a la tasa del euro BCV y la tasa de hoy', /PAGO EN BOLÍVARES: sí se puede/.test(sb) && /tasa oficial del euro del BCV/.test(sb) && /Bs\. 993,18 por euro/.test(sb));
    ok('bolívares: la cuota del cliente viene calculada en bolívares (dólares × tasa euro)', /\(en bolívares: Bs\. [\d.]+,\d{2}\)/.test(sb));
    const sv = ventas.armarVentas({ motos: [], cond: null, sedes: [], hoy: HOY, canal: 'instagram', tasaEuro: 993.18, fechaEuro: HOY });
    ok('bolívares: Paola lo dice con seguridad y ya no lo deja "por confirmar"', /PAGO EN BOLÍVARES: sí se puede pagar la inicial y las cuotas en bolívares/.test(sv) && !/te lo confirmo hoy por aquí": bolívares/.test(sv));
    const sinTasa = briefing.armar({ empresa: 'PAGASI 26', cliente: { nombre: 'ANA' }, creditos: [e], hoy: HOY });
    ok('bolívares: sin tasa guardada no inventa montos (se calcula con la tasa del día del pago)', /no tienes la tasa/.test(sinTasa) && !/en bolívares: Bs/.test(sinTasa));
  }
  const t = cerebro.turnos([{ autor: 'asistente', texto: 'Hola' }, { autor: 'cliente', texto: 'cuánto debo' }, { autor: 'cliente', tipo: 'imagen' }, { autor: 'equipo', texto: 'Te ayudo yo' }]);
  ok('el historial se vuelve turnos user/assistant, empieza en user y termina en user', t[0].role === 'user' && t[t.length - 1].role === 'user' && t.some(x => /mandó una imagen/.test(x.content)) && t.some(x => /respuesta del equipo/.test(x.content)));

  // ── 4. El flujo completo ──
  let A = armar();
  let r = await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'cuánto debo?', 'wamid.a1'));
  ok('cliente de la 26 → la conversación se guarda en la 26 (área cobranza) con su cliente y crédito', r.empresa === '26' && r.respondido && A.db26._store.get('conversaciones/wa:+584141234567').clienteId === 'C26' && A.db26._store.get('conversaciones/wa:+584141234567').cred === 'M-1' && A.db26._store.get('conversaciones/wa:+584141234567').area === 'cobranza');
  ok('...el cerebro recibió el briefing con sus cifras y el historial', /MARÍA JOSÉ PÉREZ/.test(A.cerebroFalso.ultimo.sistema) && /CRÉDITO M-1/.test(A.cerebroFalso.ultimo.sistema) && A.cerebroFalso.ultimo.mensajes.some(m => m.texto === 'cuánto debo?'));
  ok('...se le respondió por Meta y quedaron los dos mensajes (entrante y asistente) con su estado', A.enviados.length === 1 && A.enviados[0].a === '+584141234567' && A.db26._lista('conversaciones/wa:+584141234567/mensajes/').length === 2 && A.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.out1').estado === 'enviado');
  r = await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'cuánto debo?', 'wamid.a1'));
  ok('el mismo id de Meta otra vez (reenvío) no se procesa ni se responde dos veces', r.saltado === 'repetido' && A.enviados.length === 1);
  r = await procesar.procesarMensaje(A.deps, msgTexto('584241112233', 'hola', 'wamid.b1'));
  ok('cliente de la 18 → la conversación va a la 18', r.empresa === '18' && A.db18._store.get('conversaciones/wa:+584241112233').clienteId === 'C18' && !A.db26._store.get('conversaciones/wa:+584241112233'));
  r = await procesar.procesarMensaje(A.deps, msgTexto('584160000009', 'hola, quiero una moto', 'wamid.n1'));
  ok('un número que no es cliente → lo atiende PATRICIA (el WhatsApp es solo de cobranza): sin cifras, pide nombre y cédula y manda a comprar por Instagram', r.empresa === '26' && A.db26._store.get('conversaciones/wa:+584160000009').area === 'cobranza' && /Patricia/.test(A.cerebroFalso.ultimo.sistema) && /no está registrado como cliente/.test(A.cerebroFalso.ultimo.sistema) && /@pagasi\.io/.test(A.cerebroFalso.ultimo.sistema) && /cédula/.test(A.cerebroFalso.ultimo.sistema) && !/CATÁLOGO VIGENTE/.test(A.cerebroFalso.ultimo.sistema) && !/CRÉDITO /.test(A.cerebroFalso.ultimo.sistema));
  // Cliente con crédito que NO está en indice_clientes (la ficha tiene el teléfono con otro formato)
  await A.db26.collection('clientes').doc('C26B').set({ id: 'C26B', nombre: 'ROSA DÍAZ', tel: '0414-765.43.21' });
  await A.db26.collection('creditos').doc('M-7').set(cred('M-7', 'C26B', 10, { cli: 'ROSA DÍAZ' }));
  r = await procesar.procesarMensaje(A.deps, msgTexto('584147654321', 'cuánto debo?', 'wamid.n2'));
  ok('cliente con crédito que no está en el índice → lo encuentra por la ficha y Patricia le da sus cifras', r.empresa === '26' && A.db26._store.get('conversaciones/wa:+584147654321').area === 'cobranza' && A.db26._store.get('conversaciones/wa:+584147654321').clienteId === 'C26B' && /CRÉDITO M-7/.test(A.cerebroFalso.ultimo.sistema));
  // El índice apunta a una ficha sin crédito (un lead) y en la 18 está el cliente con crédito: gana el del crédito
  await A.db26.collection('indice_clientes').doc('+584148889999').set({ clienteId: 'L1' });
  await A.db26.collection('clientes').doc('L1').set({ id: 'L1', nombre: 'Lead viejo', tel: '04148889999', estado: 'lead' });
  await A.db18.collection('clientes').doc('C18B').set({ id: 'C18B', nombre: 'LUIS MORA', tel: '04148889999' });
  await A.db18.collection('creditos').doc('CRED-11').set(cred('CRED-11', 'C18B', 30, { cli: 'LUIS MORA' }));
  r = await procesar.procesarMensaje(A.deps, msgTexto('584148889999', 'hola', 'wamid.n3'));
  ok('si el índice apunta a una ficha sin crédito y otra ficha con ese teléfono tiene crédito, gana la del crédito', r.empresa === '18' && A.db18._store.get('conversaciones/wa:+584148889999').clienteId === 'C18B' && /CRÉDITO CRED-11/.test(A.cerebroFalso.ultimo.sistema));
  ok('el teléfono se compara sin importar el formato', procesar.telClave('0414-765.43.21') === '+584147654321' && procesar.telClave('+58-414-765-4321') === '+584147654321' && procesar.telClave('584147654321') === '+584147654321' && procesar.telClave('123') === '');
  // Ventas por WhatsApp solo si algún día hay un número de ventas configurado (config/asistente.numeros.ventas)
  A.deps.cfg.numeros = { ventas: '0412-5550000' };
  const msgVentas = (de, texto, id) => Object.assign(msgTexto(de, texto, id), { telefonoNegocio: '584125550000' });
  r = await procesar.procesarMensaje(A.deps, msgVentas('584160000000', 'quiero una moto', 'wamid.c1'));
  ok('al número de VENTAS (si se configura) quien no es cliente → Paola: en la 26, área ventas, briefing del catálogo y sin cifras de crédito', r.empresa === '26' && r.area === 'ventas' && r.respondido && A.db26._store.get('conversaciones/wa:+584160000000').area === 'ventas' && /CATÁLOGO VIGENTE/.test(A.cerebroFalso.ultimo.sistema) && /Paola, la asesora comercial online de Pagasi, y atiendes por WhatsApp/.test(A.cerebroFalso.ultimo.sistema) && /\+584160000000/.test(A.cerebroFalso.ultimo.sistema) && /NO se lo pidas/.test(A.cerebroFalso.ultimo.sistema) && !/CRÉDITO/.test(A.cerebroFalso.ultimo.sistema));
  A.cerebroFalso.respuesta = { reply: 'Listo, Ana. Un asesor te escribe por aquí.', draft: { tipo: 'lead', nombre: 'Ana Torres', ciudad: 'Valencia', modelo: 'Kavak 250' }, summary: 'Quiere la Kavak 250, Valencia.', handoff: true, handoffReason: 'lead' };
  r = await procesar.procesarMensaje(A.deps, msgVentas('584160000000', 'soy Ana Torres, de Valencia', 'wamid.c2'));
  const cliWa = A.db26._store.get('clientes/WA-04160000000');
  ok('el lead de WhatsApp entra a Clientes como Lead WhatsApp con su teléfono, moto y conversación (nombre en mayúsculas y sin tildes)', cliWa && cliWa.origen === 'whatsapp' && cliWa.estado === 'lead' && cliWa.nombre === 'ANA TORRES' && cliWa.tel === '04160000000' && cliWa.conversacion === 'wa:+584160000000' && A.db26._store.get('conversaciones/wa:+584160000000').clienteLead === 'WA-04160000000');
  await A.db26.collection('clientes').doc('77').set({ nombre: 'Pedro Gómez', tel: '04170000000', cedula: 'V-5555555', estado: 'activo' });
  A.cerebroFalso.respuesta = { reply: 'Listo, Pedro.', draft: { tipo: 'lead', nombre: 'Pedro Gómez', modelo: 'GTL 150' }, summary: 'Quiere otra moto.', handoff: true, handoffReason: 'lead' };
  r = await procesar.procesarMensaje(A.deps, msgVentas('584170000000', 'soy Pedro Gómez, quiero la GTL', 'wamid.c3'));
  ok('si ya existe un cliente con ese teléfono no se duplica: se le anota lo del chat', !A.db26._store.get('clientes/WA-04170000000') && A.db26._store.get('clientes/77').lead_chat && A.db26._store.get('clientes/77').lead_chat.modelo === 'GTL 150' && A.db26._store.get('conversaciones/wa:+584170000000').clienteLead === '77');
  const leadWa = A.db26._store.get('leads/wa:+584160000000');
  ok('...cuando quiere comprar queda el lead de WhatsApp con el teléfono ya puesto y la conversación "Quiere comprar"', leadWa && leadWa.canal === 'whatsapp' && leadWa.telefono === '584160000000' && leadWa.modelo === 'Kavak 250' && A.db26._store.get('conversaciones/wa:+584160000000').atencion === 'lead');
  // Reparto entre vendedores (24-oct-2026, Adam: "que nadie se quede esperando")
  const cvA = A.db26._store.get('conversaciones/wa:+584160000000');
  ok('sin reparto encendido no se asigna a nadie, pero queda desde cuándo espera', !cvA.vendedor && cvA.atencion === 'lead' && cvA.atencionDesde === AHORA);
  ok('quien quiere comprar queda en la etapa "interesado"', cvA.etapa === 'interesado');
  A.deps.cfg.reparto = { activo: true, vendedores: ['Liz Alejandra', 'Marianne Molina'] };
  const quiere = { reply: 'Listo. Un asesor te escribe.', draft: { tipo: 'lead', nombre: 'Rosa Díaz', modelo: 'BRZ 200' }, summary: 'Quiere la BRZ.', handoff: true, handoffReason: 'lead' };
  const persona = { reply: 'Ya te paso con una persona.', draft: null, summary: 'Pide una persona.', handoff: true, handoffReason: 'pide_persona' };
  A.cerebroFalso.respuesta = quiere; await procesar.procesarMensaje(A.deps, msgVentas('584180000001', 'quiero la BRZ', 'wamid.r1'));
  A.cerebroFalso.respuesta = persona; await procesar.procesarMensaje(A.deps, msgVentas('584180000002', 'quiero hablar con alguien', 'wamid.r2'));
  A.cerebroFalso.respuesta = quiere; await procesar.procesarMensaje(A.deps, msgVentas('584180000003', 'me interesa', 'wamid.r3'));
  const vd = n => (A.db26._store.get('conversaciones/wa:+58418000000' + n) || {}).vendedor;
  ok('con el reparto encendido, quien quiere comprar o pide una persona se asigna por turnos: Liz, Marianne, Liz', vd(1) === 'Liz Alejandra' && vd(2) === 'Marianne Molina' && vd(3) === 'Liz Alejandra');
  ok('...queda cuándo se asignó y el turno se guarda en config/asistente', A.db26._store.get('conversaciones/wa:+584180000001').asignadoEn === AHORA && (A.db26._store.get('config/asistente') || {}).reparto.ultimo === 'Liz Alejandra');
  A.cerebroFalso.respuesta = quiere; await procesar.procesarMensaje(A.deps, msgVentas('584180000001', 'sigo interesada', 'wamid.r4'));
  ok('una conversación que ya tiene vendedor no se reasigna ni gasta turno', vd(1) === 'Liz Alejandra' && A.deps.cfg.reparto.ultimo === 'Liz Alejandra');
  await A.db26.collection('conversaciones').doc('wa:+584180000005').set({ canal: 'whatsapp', area: 'ventas', telE164: '+584180000005', modo: 'humano', atendidoPor: 'Adam' });
  ok('ni una que ya atiende una persona', await procesar.repartir(A.deps, A.db26._store.get('conversaciones/wa:+584180000005'), 'lead') === '');
  ok('ni por otros motivos (error del asistente, revisar, comprobante)', await procesar.repartir(A.deps, {}, 'error') === '' && await procesar.repartir(A.deps, {}, 'comprobante') === '');
  A.deps.cfg.reparto = { activo: false, vendedores: ['Liz Alejandra'] };
  ok('apagado o sin vendedores en la lista, no asigna', await procesar.repartir(A.deps, {}, 'lead') === '' && await procesar.repartir(Object.assign({}, A.deps, { cfg: { reparto: { activo: true, vendedores: [] } } }), {}, 'lead') === '');
  A.deps.cfg.reparto = { activo: true, vendedores: ['Liz Alejandra', 'Marianne Molina'] };
  A.cerebroFalso.respuesta = { reply: 'Listo.', draft: { tipo: 'lead', nombre: 'Eva <script>alert(1)</script> "Mora"', telefono: '04190000000', modelo: 'BRZ 200' }, summary: 'Quiere la BRZ.', handoff: true, handoffReason: 'lead' };
  await procesar.procesarMensaje(A.deps, msgVentas('584190000000', 'soy Eva', 'wamid.x1'));
  const bx = A.db26._store.get('conversaciones/wa:+584190000000').borrador, cx = A.db26._store.get('clientes/WA-04190000000');
  ok('el nombre que viene del chat se guarda limpio en la conversación y en Clientes', bx.nombre === 'Eva scriptalert(1)/script Mora' && cx && !/[<>"]/.test(cx.nombre));
  A.cerebroFalso.respuesta = null; delete A.deps.cfg.numeros;
  ok('el área se decide por el número de negocio cuando hay uno de ventas configurado', procesar.areaDe({ cfg: { numeros: { ventas: '0412-5550000', cobranza: '0422-0000000' } } }, { telefonoNegocio: '584125550000' }, 'C26') === 'ventas' && procesar.areaDe({ cfg: { numeros: { ventas: '0412-5550000' } } }, { telefonoNegocio: '584220000000' }, 'C26') === 'cobranza' && procesar.areaDe({ cfg: {} }, { telefonoNegocio: '584220000000' }, '') === 'cobranza');
  // promesa y handoff del cerebro
  A.cerebroFalso.respuesta = { reply: 'Anotado para el sábado.', draft: { tipo: 'promesa', fecha: '2026-10-24', monto: 50 }, summary: 'Promete pagar el sábado.', handoff: false, handoffReason: '' };
  await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'pago el sábado', 'wamid.a2'));
  ok('la promesa del cerebro queda como borrador y el resumen en la conversación', A.db26._store.get('conversaciones/wa:+584141234567').borrador.fecha === '2026-10-24' && /sábado/.test(A.db26._store.get('conversaciones/wa:+584141234567').resumen));
  A.cerebroFalso.respuesta = { reply: 'Ya te paso con una persona.', draft: null, summary: 'Se queja del cobro.', handoff: true, handoffReason: 'queja' };
  await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'esto está mal cobrado', 'wamid.a3'));
  ok('la queja marca la conversación para una persona', A.db26._store.get('conversaciones/wa:+584141234567').atencion === 'queja');
  ok('...en cobranza no se reparte entre vendedores (la atiende el equipo de cobranza), pero queda desde cuándo espera', !A.db26._store.get('conversaciones/wa:+584141234567').vendedor && A.db26._store.get('conversaciones/wa:+584141234567').atencionDesde === AHORA);
  delete A.deps.cfg.reparto;
  // modo humano: el asistente se calla
  await A.db26.collection('conversaciones').doc('wa:+584141234567').set({ modo: 'humano', atendidoPor: 'Samantha' }, { merge: true });
  const antes = A.enviados.length;
  r = await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'gracias', 'wamid.a4'));
  ok('con una persona atendiendo, el mensaje se guarda pero el asistente no responde', r.callado && A.enviados.length === antes && A.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.a4').texto === 'gracias');
  // comprobante
  A = armar();
  r = await procesar.procesarMensaje(A.deps, { metaId: 'wamid.img', de: '584141234567', nombre: 'María', tipo: 'imagen', texto: '', medio: { id: 'media9', mime: 'image/jpeg' }, hora: AHORA });
  const comps = A.db26._lista('comprobantes/');
  ok('una imagen del cliente se sube a Storage, crea un comprobante pendiente y avisa al equipo', r.comprobante && A.subidos.length === 1 && comps.length === 1 && comps[0].estado === 'pendiente' && comps[0].origen === 'whatsapp' && comps[0].credId === 'M-1' && A.db26._store.get('conversaciones/wa:+584141234567').atencion === 'comprobante');
  ok('...y se le agradece sin pasar por el cerebro', A.enviados.length === 1 && /comprobante/.test(A.enviados[0].t) && A.cerebroFalso.ultimo === null);
  // cerebro caído
  A = armar(); A.cerebroFalso.falla = true;
  r = await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'hola', 'wamid.f1'));
  ok('si el cerebro falla, se manda una frase de cortesía y se marca error', r.cerebro === 'fallo' && A.enviados[0].t === procesar.CORTESIA && A.db26._store.get('conversaciones/wa:+584141234567').atencion === 'error');
  r = await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'sigues ahí?', 'wamid.f2'));
  ok('si sigue caído, la disculpa NO se repite: el mensaje se guarda y la conversación sigue en error', r.cerebro === 'fallo' && r.disculpa === 'omitida' && A.enviados.length === 1 && A.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.f2').texto === 'sigues ahí?' && A.db26._store.get('conversaciones/wa:+584141234567').atencion === 'error');
  A.cerebroFalso.falla = false; A.cerebroFalso.respuesta = { reply: 'Ya volví, ¿en qué te ayudo?', draft: null, summary: '', handoff: false };
  r = await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'hola de nuevo', 'wamid.f3'));
  ok('cuando el cerebro vuelve, responde normal', !r.cerebro && A.enviados.length === 2 && /Ya volví/.test(A.enviados[1].t));
  // estados
  A = armar();
  await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'hola', 'wamid.s1'));
  await procesar.procesarEstado(A.deps, { metaId: 'wamid.out1', estado: 'leido', para: '584141234567', error: '' });
  await procesar.procesarEstado(A.deps, { metaId: 'wamid.out1', estado: 'entregado', para: '584141234567', error: '' });
  ok('los estados de Meta actualizan el mensaje y no retroceden (leído no vuelve a entregado)', A.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.out1').estado === 'leido');
  // el equipo escribe
  r = await procesar.enviarEquipo(A.deps, { empresa: '26', convId: 'wa:+584141234567', texto: 'Hola, soy Samantha', por: 'Samantha' });
  ok('el equipo escribe dentro de la ventana: se manda, se guarda y la conversación pasa a humano', r.metaId && A.db26._store.get('conversaciones/wa:+584141234567').modo === 'humano' && A.db26._store.get('conversaciones/wa:+584141234567').atendidoPor === 'Samantha');
  await A.db26.collection('conversaciones').doc('wa:+584141234567').set({ ultimoEntranteHora: '2026-10-16T10:00:00.000Z' }, { merge: true });
  let err = null; try { await procesar.enviarEquipo(A.deps, { empresa: '26', convId: 'wa:+584141234567', texto: 'otra', por: 'S' }); } catch (x) { err = x; }
  ok('fuera de la ventana de 24 h el equipo no puede escribir libre', err && err.codigo === 'ventana');
  // El vendedor de la conversación (24-oct-2026, Adam: "filtros por vendedores")
  ok('el primero del equipo que escribe queda como vendedor de la conversación', A.db26._store.get('conversaciones/wa:+584141234567').vendedor === 'Samantha');
  await A.db26.collection('conversaciones').doc('wa:+584141234567').set({ ultimoEntranteHora: new Date().toISOString(), atencion: 'pide_persona', noLeidos: 3 }, { merge: true });
  await procesar.enviarEquipo(A.deps, { empresa: '26', convId: 'wa:+584141234567', texto: 'Ya te atiendo', por: 'Samantha' });
  ok('cuando alguien del equipo contesta, se quita la marca de "espera persona" y los no leídos', A.db26._store.get('conversaciones/wa:+584141234567').atencion === '' && A.db26._store.get('conversaciones/wa:+584141234567').noLeidos === 0);
  await A.db26.collection('conversaciones').doc('wa:+584141234567').set({ ultimoEntranteHora: new Date().toISOString(), modo: 'bot', atendidoPor: '' }, { merge: true });
  await procesar.enviarEquipo(A.deps, { empresa: '26', convId: 'wa:+584141234567', texto: 'te escribe Liz', por: 'Liz' });
  ok('...y no cambia aunque después escriba otra persona (ni al devolverla a Paola)', A.db26._store.get('conversaciones/wa:+584141234567').vendedor === 'Samantha' && A.db26._store.get('conversaciones/wa:+584141234567').atendidoPor === 'Liz');
  const actAntes = A.db26._store.get('conversaciones/wa:+584141234567').actualizado;
  const rv = await procesar.cambiarVendedor({ bases: A.deps.bases, ahora: () => '2026-10-24T12:00:00.000Z' }, { empresa: '26', convId: 'wa:+584141234567', vendedor: '  Liz  Alejandra ', quien: { empresa: '26', nombre: 'Marianne', permisos: ['whatsapp'] } });
  const cv = A.db26._store.get('conversaciones/wa:+584141234567');
  ok('"Pasar a…": quien tiene el canal cambia el vendedor y queda quién lo cambió (sin mover la conversación en la lista)', rv.vendedor === 'Liz Alejandra' && cv.vendedor === 'Liz Alejandra' && cv.vendedorCambiadoPor === 'Marianne' && cv.actualizado === actAntes);
  let ev = null; try { await procesar.cambiarVendedor({ bases: A.deps.bases, ahora: () => 'x' }, { empresa: '26', convId: 'wa:+584141234567', vendedor: 'Yo', quien: { empresa: '26', nombre: 'Ana', permisos: ['instagram'] } }); } catch (x) { ev = x; }
  ok('...quien no tiene el canal WhatsApp no puede', ev && ev.codigo === 'permiso' && A.db26._store.get('conversaciones/wa:+584141234567').vendedor === 'Liz Alejandra');
  ev = null; try { await procesar.cambiarVendedor({ bases: A.deps.bases, ahora: () => 'x' }, { empresa: '26', convId: 'wa:+584141234567', vendedor: 'Yo', quien: { empresa: '18', nombre: 'Pedro', permisos: ['whatsapp'] } }); } catch (x) { ev = x; }
  ok('...ni alguien de la otra compañía que no es administrador', ev && ev.codigo === 'permiso');
  await procesar.cambiarVendedor({ bases: A.deps.bases, ahora: () => 'x' }, { empresa: '26', convId: 'wa:+584141234567', vendedor: '', quien: { empresa: '18', nombre: 'Adam', admin: true } });
  ok('...un administrador sí, y vacío la deja sin vendedor', A.db26._store.get('conversaciones/wa:+584141234567').vendedor === '');
  // Quién puede mandar mensajes (auditoría del 24-oct-2026, A3)
  await A.db26.collection('conversaciones').doc('wa:+584141234567').set({ ultimoEntranteHora: new Date().toISOString() }, { merge: true });
  const intentaEq = async (q, extra) => { try { await procesar.enviarEquipo(A.deps, Object.assign({ empresa: '26', convId: 'wa:+584141234567', texto: 'hola', por: q.nombre, quien: q }, extra || {})); return null; } catch (x) { return x; } };
  let ee = await intentaEq({ empresa: '26', nombre: 'Cobradora', rol: 'Empleado', permisos: ['pagos'] });
  ok('sin el permiso del canal no se puede mandar un mensaje del equipo', ee && ee.codigo === 'permiso');
  ee = await intentaEq({ empresa: '26', nombre: 'Vendedor X', rol: 'Vendedor Concesionario', permisos: ['whatsapp'] });
  ok('...ni siendo vendedor de concesionario, aunque tenga el permiso', ee && ee.codigo === 'permiso');
  ee = await intentaEq({ empresa: '18', nombre: 'Empleada 18', rol: 'Empleado', permisos: ['whatsapp'] });
  ok('...ni desde la otra compañía sin ser administrador', ee && ee.codigo === 'permiso');
  ee = await intentaEq({ empresa: '26', nombre: 'Marianne', rol: 'Empleado', permisos: ['whatsapp'] });
  const ee2 = await intentaEq({ empresa: '18', nombre: 'Adam', rol: 'Administrador', admin: true, permisos: [] });
  ok('con el permiso del canal en su compañía, o siendo administrador, sí', ee === null && ee2 === null);
  ok('el servidor pone un tope de 20 mensajes por minuto por persona y responde 403 sin permiso', /topeEquipo\(quien\.uid\)/.test(require('fs').readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8')) && /e\.codigo === 'permiso' \? 403/.test(require('fs').readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8')));
  // La foto de la moto desde el catálogo
  const fotos = []; A.metaFalso.enviarImagen = async (para, url, pie) => { fotos.push({ para, url, pie }); return 'wamid.foto' + fotos.length; };
  await procesar.enviarEquipo(A.deps, { empresa: '26', convId: 'wa:+584141234567', texto: 'Esta es la BRZ 200', imagen: 'https://pagasi.io/assets/motos/brz-200.jpg', por: 'Marianne', quien: { empresa: '26', nombre: 'Marianne', permisos: ['whatsapp'] } });
  const mf = A.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.foto1');
  ok('el equipo manda la foto de la moto por WhatsApp con el texto como pie, y queda guardada como imagen', fotos.length === 1 && fotos[0].url === 'https://pagasi.io/assets/motos/brz-200.jpg' && fotos[0].pie === 'Esta es la BRZ 200' && mf && mf.tipo === 'imagen' && mf.medio.url === fotos[0].url);
  await procesar.enviarEquipo(A.deps, { empresa: '26', convId: 'wa:+584141234567', imagen: 'https://pagasi.io/assets/motos/tx-250.png', por: 'Marianne' });
  ok('...también sin texto ("📷 Foto" en la lista)', A.db26._store.get('conversaciones/wa:+584141234567').ultimoMensaje === '📷 Foto');
  ee = null; try { await procesar.enviarEquipo(A.deps, { empresa: '26', convId: 'wa:+584141234567', imagen: 'https://otro-sitio.com/x.jpg', por: 'M' }); } catch (x) { ee = x; }
  ok('solo fotos del sitio (catálogo) o de Firebase Storage', ee && ee.codigo === 'imagen' && fotos.length === 2);
  // Lo que Paola anota del chat, sin caracteres peligrosos (A4)
  ok('lo que viene del chat queda sin < > " \' ` \\ &', procesar.sinPeligro('<img src=x onerror="alert(1)">Ana & `Luis`\\') === 'img src=x onerror=alert(1)Ana Luis');
  // Notas internas, etapa y calificar a la asistente (24-oct-2026)
  const Q = { empresa: '26', nombre: 'Marianne', permisos: ['whatsapp'] }, AD = { bases: A.deps.bases, ahora: () => '2026-10-24T15:00:00.000Z' };
  await procesar.accionConversacion(AD, { empresa: '26', convId: 'wa:+584141234567', accion: 'nota', texto: 'Viene el sábado <b>con el fiador</b>', quien: Q });
  const nt = A.db26._store.get('conversaciones/wa:+584141234567').notas;
  ok('nota interna: queda con quién y cuándo, sin caracteres peligrosos', nt && nt.length === 1 && nt[0].texto === 'Viene el sábado bcon el fiador/b' && nt[0].por === 'Marianne' && nt[0].hora === '2026-10-24T15:00:00.000Z');
  await procesar.accionConversacion(AD, { empresa: '26', convId: 'wa:+584141234567', accion: 'etapa', etapa: 'solicitud', quien: Q });
  ok('etapa del cliente', A.db26._store.get('conversaciones/wa:+584141234567').etapa === 'solicitud' && A.db26._store.get('conversaciones/wa:+584141234567').etapaPor === 'Marianne');
  let ea = null; try { await procesar.accionConversacion(AD, { empresa: '26', convId: 'wa:+584141234567', accion: 'etapa', etapa: 'inventada', quien: Q }); } catch (x) { ea = x; }
  ok('...solo las etapas conocidas', ea && ea.codigo === 'etapa');
  ea = null; try { await procesar.accionConversacion(AD, { empresa: '26', convId: 'wa:+584141234567', accion: 'nota', texto: 'x', quien: { empresa: '26', nombre: 'Otro', permisos: ['pagos'] } }); } catch (x) { ea = x; }
  ok('...y quien no tiene el canal no puede anotar', ea && ea.codigo === 'permiso');
  await A.db26.collection('conversaciones').doc('wa:+584141234567').collection('mensajes').doc('wamid.asis1').set({ autor: 'asistente', texto: 'Tu cuota es de $50.', hora: AHORA });
  await procesar.accionConversacion(AD, { empresa: '26', convId: 'wa:+584141234567', accion: 'calificar', msgId: 'wamid.asis1', voto: 'mal', texto: 'Ya había pagado', quien: Q });
  const cq = A.db26._store.get('config/asistenteCalidad');
  ok('👎 a una respuesta de la asistente: queda en el mensaje y en la lista para revisar', A.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.asis1').calificacion.voto === 'mal' && cq.lista[0].voto === 'mal' && cq.lista[0].texto === 'Tu cuota es de $50.' && cq.lista[0].nota === 'Ya había pagado');
  await procesar.accionConversacion(AD, { empresa: '26', convId: 'wa:+584141234567', accion: 'calificar', msgId: 'wamid.asis1', voto: '', quien: Q });
  ok('...y se puede quitar', A.db26._store.get('conversaciones/wa:+584141234567/mensajes/wamid.asis1').calificacion === null && A.db26._store.get('config/asistenteCalidad').lista.length === 0);
  ea = null; try { await procesar.accionConversacion(AD, { empresa: '26', convId: 'wa:+584141234567', accion: 'calificar', msgId: 'wamid.foto1', voto: 'bien', quien: Q }); } catch (x) { ea = x; }
  ok('...solo se califican respuestas de la asistente (no las del equipo)', ea && ea.codigo === 'mensaje');
  await A.db26.collection('conversaciones').doc('wa:+584141234567').set({ atencion: 'pide_persona', atencionDesde: '2026-10-24T14:00:00.000Z', ultimoEntranteHora: new Date().toISOString() }, { merge: true });
  await procesar.enviarEquipo(Object.assign({}, A.deps, { ahora: () => '2026-10-24T14:25:00.000Z' }), { empresa: '26', convId: 'wa:+584141234567', texto: 'Hola, ya te atiendo', por: 'Marianne' });
  const ur = A.db26._store.get('conversaciones/wa:+584141234567').ultimaRespuesta;
  ok('cuando el equipo contesta a quien esperaba, queda cuánto tardó (para las métricas)', ur && ur.desde === '2026-10-24T14:00:00.000Z' && ur.hasta === '2026-10-24T14:25:00.000Z' && ur.por === 'Marianne');
  // Seguimiento automático (24-oct-2026, Adam: "sí, constrúyelo")
  const SG = armar(), T0 = '2026-10-24T15:00:00.000Z', hh = (h) => new Date(Date.parse(T0) - h * 3600000).toISOString();
  SG.deps.ahora = () => T0;
  const cs = (id, extra) => SG.db26._store.set('conversaciones/' + id, Object.assign({ canal: 'instagram', area: 'ventas', igsid: id.replace('ig:', ''), nombre: 'Persona', etapa: 'interesado', modo: 'bot', ultimoAutor: 'asistente', ultimoEntranteHora: hh(21) }, extra));
  cs('ig:701', { borrador: { tipo: 'lead', nombre: 'LUIS PEREZ' } });            // sí
  cs('ig:702', { modo: 'humano' });                                              // la atiende una persona
  cs('ig:703', { seguimientoEnviado: hh(30) });                                  // ya se le escribió
  cs('ig:704', { ultimoEntranteHora: hh(10) });                                  // muy pronto
  cs('ig:705', { ultimoEntranteHora: hh(25) });                                  // fuera de las 24 h de Meta
  cs('ig:706', { etapa: 'solicitud' });                                          // ya está en solicitud
  cs('ig:707', { ultimoAutor: 'cliente' });                                      // lo último lo escribió la persona
  cs('ig:708', { nombre: '@sara.r', etapa: '', atencion: 'lead' });              // sí (lead de antes, sin etapa)
  cs('wa:+584150000001', { canal: 'whatsapp', area: 'cobranza', telE164: '+584150000001' });   // cobranza: no
  let rs = await procesar.seguimientoVentas(SG.deps);
  ok('apagado no le escribe a nadie', rs.apagado === true && SG.ig.length === 0);
  SG.deps.cfg.seguimiento = { activo: true };
  rs = await procesar.seguimientoVentas(SG.deps);
  ok('encendido: le escribe solo a quien mostró interés y no volvió a escribir, entre 20 y 23 horas después', rs.enviados === 2 && SG.ig.map(x => x.a).sort().join() === '701,708');
  ok('...con el texto aprobado y su nombre (sin "@usuario")', SG.ig.find(x => x.a === '701').t === 'Hola Luis 👋 ¿Pudiste pensarlo? Si quieres, te hago la solicitud por aquí mismo, son unos datos cortos.' && SG.ig.find(x => x.a === '708').t.indexOf('Hola 👋 ¿Pudiste pensarlo?') === 0);
  ok('...y queda anotado: el mensaje y que ya se le escribió (no se repite)', SG.db26._store.get('conversaciones/ig:701').seguimientoEnviado === T0 && Object.keys(Object.fromEntries(SG.db26._store)).some(k => k.startsWith('conversaciones/ig:701/mensajes/') && SG.db26._store.get(k).tipo === 'seguimiento'));
  rs = await procesar.seguimientoVentas(SG.deps);
  ok('una segunda corrida no le vuelve a escribir a nadie', rs.enviados === 0 && SG.ig.length === 2);
  SG.deps.cfg.responde = { instagram: false };
  cs('ig:709', {});
  rs = await procesar.seguimientoVentas(SG.deps);
  ok('si Paola está apagada en Instagram, tampoco hace seguimiento', rs.enviados === 0);
  ok('se corre cada hora de 9 am a 7 pm, hora de Caracas', /exports\.seguimientoVentas = onSchedule\(\{ schedule: '10 9-19 \* \* \*', timeZone: 'America\/Caracas'/.test(require('fs').readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8')));
  const idxEq = require('fs').readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
  ok('/equipo con accion "vendedor" va a cambiarVendedor con el usuario de la sesión', /accion === 'vendedor'[\s\S]{0,300}procesar\.cambiarVendedor\([\s\S]{0,260}quien \}/.test(idxEq) && /permisos: Array\.isArray\(u\.data\(\)\.permisos\)/.test(idxEq));

  // ── 5. Recordatorios ──
  A = armar();
  A.db26._store.set('creditos/M-2', cred('M-2', 'C26', 12, { cli: 'ANA LÓPEZ' }));            // la cuota 1 vence en 3 días
  A.db26._store.set('clientes/C26b', { id: 'C26b', nombre: 'ANA LÓPEZ', tel: '04149998877' }); A.db26._store.get('creditos/M-2').clienteId = 'C26b';
  let rr = await recordatorios.correr(A.deps, { hoy: HOY, plantillas: { proximas: 'cuota_proxima', hoy: 'cuota_hoy', gracia: 'cuota_gracia', atrasadas: 'cuota_atrasada' } });
  const r26 = rr.find(x => x.empresa === '26');
  ok('manda la plantilla a quien le toca hoy (cuota a 3 días) y la anota', r26.enviados >= 1 && A.plantillas.some(x => x.a === '+584149998877' && x.n === 'cuota_proxima') && A.db26._lista('recordatorios/').some(x => x.cred === 'M-2' && x.estado === 'enviado'));
  ok('...y queda como mensaje del asistente en una conversación nueva', A.db26._store.get('conversaciones/wa:+584149998877') && A.db26._lista('conversaciones/wa:+584149998877/mensajes/').some(m => m.tipo === 'plantilla'));
  const antesTpl = A.plantillas.length;
  rr = await recordatorios.correr(A.deps, { hoy: HOY, plantillas: { proximas: 'cuota_proxima' } });
  ok('la segunda corrida del mismo día no repite el envío', A.plantillas.length === antesTpl && rr.find(x => x.empresa === '26').repetidos >= 1);
  const D = armar(); D.db26._store.set('creditos/M-2', cred('M-2', 'C26', 12, { cli: 'ANA LÓPEZ' })); D.db26._store.set('clientes/C26b', { id: 'C26b', nombre: 'ANA LÓPEZ', tel: '04149998877' }); D.db26._store.get('creditos/M-2').clienteId = 'C26b';
  rr = await recordatorios.correr(D.deps, { hoy: HOY, plantillas: {} });
  const tpl = D.plantillas.find(x => x.a === '+584149998877');
  ok('sin configurar nada usa las plantillas que Pagasi ya tiene aprobadas en Meta (recordatorio_cuota a 3 días) con sus 3 variables', tpl && tpl.n === 'recordatorio_cuota' && tpl.p.length === 3 && tpl.p[0] === 'Ana' && /^\$\d+,\d{2}$/.test(tpl.p[1]) && /^\d+ de [a-z]+$/.test(tpl.p[2]));
  const msgTpl = D.db26._lista('conversaciones/wa:+584149998877/mensajes/').find(m => m.tipo === 'plantilla');
  ok('...y guarda en la conversación el texto real de la plantilla, ya con los datos', msgTpl && /^Hola Ana, te recordamos que la cuota de tu crédito por \$\d+,\d{2} vence el \d+ de [a-z]+\./.test(msgTpl.texto));
  const ap = recordatorios.armarPlantilla('vence_hoy', { nombre: 'JOSÉ ROJAS', cuota: 3, totalCuotas: 24, monto: 88.14, fechaVence: '2026-10-18' });
  ok('vence_hoy lleva solo nombre y monto (con el $ dentro, como el ejemplo aprobado "$88,14"); cuota_vencida lleva nombre, monto y fecha', ap.params.join('|') === 'José|$88,14' && ap.texto === 'Hola José, hoy vence la cuota de tu crédito por $88,14. Si ya realizaste el pago, ignora este aviso. Si tienes dudas sobre tu pago, responde a este mensaje.' && recordatorios.armarPlantilla('cuota_vencida', { nombre: 'ANA', monto: 50, fechaVence: '2026-09-12' }).params.join('|') === 'Ana|$50,00|12 de septiembre');
  ok('una plantilla desconocida recibe las 5 variables de siempre', recordatorios.armarPlantilla('otra_cosa', { nombre: 'ANA', cuota: 2, totalCuotas: 24, monto: 50, fechaVence: '2026-10-20' }).params.length === 5);

  // ── 6. Instagram: ventas ──
  const avisoIg = { object: 'instagram', entry: [{ id: '17841400000', time: 1760796000000, messaging: [
    { sender: { id: '555001' }, recipient: { id: '17841400000' }, timestamp: 1760796000000, message: { mid: 'mid.1', text: 'hola, precio de la BRZ 200?' } },
    { sender: { id: '17841400000' }, recipient: { id: '555001' }, timestamp: 1760796001000, message: { mid: 'mid.eco', text: 'nuestra respuesta', is_echo: true } },
    { sender: { id: '555001' }, recipient: { id: '17841400000' }, timestamp: 1760796002000, message: { mid: 'mid.2', attachments: [{ type: 'image', payload: { url: 'https://cdn.ig/x.jpg' } }] } },
    { sender: { id: '555001' }, recipient: { id: '17841400000' }, timestamp: 1760796003000, read: { mid: 'mid.out1' } } ] }] };
  const pi = meta.parsearWebhook(avisoIg);
  ok('de Instagram salen el texto y la imagen, se ignora el eco y la lectura es un estado', pi.objeto === 'instagram' && pi.mensajes.length === 2 && pi.mensajes.every(x => x.canal === 'instagram' && x.de === '555001') && pi.mensajes[0].texto === 'hola, precio de la BRZ 200?' && pi.mensajes[1].tipo === 'imagen' && pi.mensajes[1].medio.url === 'https://cdn.ig/x.jpg' && pi.estados.length === 1 && pi.estados[0].estado === 'leido' && pi.estados[0].para === '555001');
  // Lo que no es texto (24-oct-2026: "cuando el usuario manda una imagen el sistema como que crashea")
  const adjs = meta.parsearWebhook({ object: 'instagram', entry: [{ id: '17841400000', messaging: [
    { sender: { id: '9' }, recipient: { id: '1' }, timestamp: 1, message: { mid: 'a1', attachments: [{ type: 'share', payload: { url: 'https://lookaside.fbsbx.com/p.jpg', title: 'BRZ 200 en cuotas' } }] } },
    { sender: { id: '9' }, recipient: { id: '1' }, timestamp: 2, message: { mid: 'a2', attachments: [{ type: 'ig_reel', payload: { url: 'https://x/r.mp4' } }] } },
    { sender: { id: '9' }, recipient: { id: '1' }, timestamp: 3, message: { mid: 'a3', attachments: [{ type: 'story_mention', payload: { url: 'https://x/s' } }] } },
    { sender: { id: '9' }, recipient: { id: '1' }, timestamp: 4, message: { mid: 'a4', attachments: [{ type: 'algo_nuevo' }] } },
    { sender: { id: '9' }, recipient: { id: '1' }, timestamp: 5, message: { mid: 'a5', attachments: [{ type: 'animated_image', payload: { url: 'https://x/g.gif' } }] } } ] }] }).mensajes;
  ok('compartir una publicación, un reel, una historia o un GIF llega con su tipo (antes todo era "adjunto")', adjs.map(x => x.tipo).join() === 'publicacion,video,historia,adjunto,imagen' && adjs[0].texto === 'BRZ 200 en cuotas' && adjs[0].medio.url === 'https://lookaside.fbsbx.com/p.jpg');
  const tu = cerebro.turnos([{ autor: 'cliente', tipo: 'publicacion', texto: 'BRZ 200 en cuotas' }, { autor: 'asistente', texto: '¿Qué moto?' }, { autor: 'cliente', tipo: 'adjunto', texto: '' }]);
  ok('la asistente se entera de lo que le mandaron (antes un adjunto sin texto se perdía)', /compartió una publicación o anuncio de Instagram: «BRZ 200 en cuotas»/.test(tu[0].content) && /mandó algo que no se puede ver aquí/.test(tu[tu.length - 1].content));
  ok('en la lista dice qué llegó', procesar.textoLista({ tipo: 'publicacion', texto: '' }) === '📌 Compartió una publicación' && procesar.textoLista({ tipo: 'adjunto' }) === '📎 Adjunto');
  let B = armar();
  const sv = ventas.armarVentas({ instrucciones: B.deps.cfg.instruccionesVentas, motos: B.catalogo.motos, cond: B.catalogo.cond, sedes: B.catalogo.sedes, hoy: HOY, nombrePerfil: 'Luis', usuario: 'luisperez.ve' });
  const plan = Cat.calcPlan(1750, 12, 0.4, Cat.condValidas(B.catalogo.cond));
  ok('el briefing de ventas lleva el catálogo con la cuota exacta de la web, la sede con ciudad, la promo y cómo solicitar', new RegExp('BRZ 200 200cc \\(Ciudad\\): precio \\$1,750 · inicial desde \\$' + plan.inicial + ' \\(40%\\) · cuota quincenal \\$' + plan.quincenal + ' a 12 meses \\(24 cuotas\\)').test(sv) && /SEDE EK Bello Monte \(Caracas\)/.test(sv) && /casco gratis/.test(sv) && /pagasi\.io\/solicitar/.test(sv) && /@luisperez\.ve/.test(sv));
  ok('...sin precio dice "por confirmar" y lo no disponible no aparece', /SBR 150: precio por confirmar/.test(sv) && !/Vieja/.test(sv));
  ok('...y no habla de cobranza ni de deudas como si fuera cliente', !/cuotas pagadas|TIENE .* VENCIDA|cobranza de Pagasi/.test(sv) && /no la trates como deudora/.test(sv));
  ok('la cédula se normaliza como la guarda el sistema (V-12345678) y lo raro se descarta', cerebro.cedulaLimpia('12.345.678') === 'V-12345678' && cerebro.cedulaLimpia('e-1234567') === 'E-1234567' && cerebro.cedulaLimpia('V 0987654') === 'V-987654' && cerebro.cedulaLimpia('123') === '' && cerebro.validar({ reply: 'ok', draft: { tipo: 'lead', nombre: 'Ana', cedula: 'v-20.111.222', inicial: 600.4, ocupacion: 'Comerciante' }, summary: '', handoff: false }).draft.cedula === 'V-20111222');
  // Freno de mensajes (20-oct-2026: el bot de una tienda de cestas mandó 14 imágenes y Paola contestó las 14)
  const h0 = Date.parse(AHORA), mk = (n, min) => ({ autor: 'asistente', hora: new Date(h0 - min * 60000).toISOString(), texto: 'r' + n });
  ok('frenado(): 10 respuestas en 3 minutos frenan (bucle); 15 en 10 minutos de una persona conversando no; 80 en el día frenan', procesar.frenado(Array.from({ length: 10 }, (_, i) => mk(i, i * 0.25)), AHORA) === 'ventana' && procesar.frenado(Array.from({ length: 15 }, (_, i) => mk(i, i * 0.65)), AHORA) === '' && procesar.frenado(Array.from({ length: 80 }, (_, i) => mk(i, 30 + i * 15)), AHORA) === 'dia' && procesar.frenado([], AHORA) === '');
  let F = armar(); F.cerebroFalso.respuesta = { reply: 'ok', draft: null, summary: '', handoff: false };
  for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) await procesar.procesarMensaje(F.deps, { canal: 'instagram', metaId: 'mid.fr' + i, de: '777001', nombre: '', tipo: 'texto', texto: 'mensaje ' + i, medio: null, hora: AHORA });
  const antesFr = F.ig.length;
  const rf = await procesar.procesarMensaje(F.deps, { canal: 'instagram', metaId: 'mid.fr16', de: '777001', nombre: '', tipo: 'texto', texto: 'mensaje 16', medio: null, hora: AHORA });
  ok('a los 16 mensajes en 10 minutos (bucle de bots) Paola se calla: el entrante se guarda, no se responde y la conversación queda en Revisar', rf.frenado === 'ventana' && F.ig.length === antesFr && F.db26._store.get('conversaciones/ig:777001/mensajes/mid.fr16').texto === 'mensaje 16' && F.db26._store.get('conversaciones/ig:777001').atencion === 'revisar');
  // Ráfagas: si mientras Paola piensa entra otro mensaje de la misma persona, solo se contesta el último
  let Rf = armar(); const pensarOrig = Rf.cerebroFalso.pensar;
  Rf.cerebroFalso.respuesta = { reply: 'Respuesta al primero', draft: null, summary: '', handoff: false };
  Rf.cerebroFalso.pensar = async function (x) { await Rf.db26.collection('conversaciones').doc('ig:666001').set({ ultimoEntranteId: 'mid.r2' }, { merge: true }); return pensarOrig.call(this, x); };
  const rr1 = await procesar.procesarMensaje(Rf.deps, { canal: 'instagram', metaId: 'mid.r1', de: '666001', nombre: '', tipo: 'texto', texto: 'hola', medio: null, hora: AHORA });
  ok('si mientras Paola pensaba llegó otro mensaje, esa respuesta se descarta (no se manda nada)', rr1.rafaga === true && Rf.ig.length === 0 && Rf.db26._store.get('conversaciones/ig:666001/mensajes/mid.r1').texto === 'hola');
  Rf.cerebroFalso.pensar = pensarOrig; Rf.cerebroFalso.respuesta = { reply: 'Respuesta con todo el contexto', draft: null, summary: '', handoff: false };
  const rr2 = await procesar.procesarMensaje(Rf.deps, { canal: 'instagram', metaId: 'mid.r2', de: '666001', nombre: '', tipo: 'texto', texto: 'quiero una moto', medio: null, hora: AHORA });
  ok('...y el último mensaje de la ráfaga sí se contesta, una sola vez, viendo los dos mensajes', !rr2.rafaga && Rf.ig.length === 1 && Rf.ig[0].t === 'Respuesta con todo el contexto' && JSON.stringify(Rf.cerebroFalso.ultimo.mensajes).includes('hola') && JSON.stringify(Rf.cerebroFalso.ultimo.mensajes).includes('quiero una moto'));
  // Sedes completas y requisitos en el briefing de ventas
  const svS = ventas.armarVentas({ instrucciones: '', motos: [{ id: 1, name: 'BRZ 200', precio: 1750, sedeName: 'EK Bello Monte' }], cond: null, sedes: [{ nombre: 'EK Bello Monte', ciudad: 'Caracas', direccion: '' }, { nombre: 'EK Trujillo', ciudad: 'Valera', direccion: '' }], hoy: '2026-10-20', nombrePerfil: '', usuario: 'x', canal: 'instagram', telefono: '', esCliente: false });
  ok('el briefing lista TODAS las sedes aliadas, con el estado, aunque no tengan motos en el catálogo', /EK Trujillo — Valera \(estado Trujillo\)/.test(svS) && /sede sin catálogo en línea/.test(svS) && /nunca digas que no hay sede sin revisar esta lista/.test(svS));
  ok('...y trae la lista oficial de requisitos (nov 2026): RIF, licencia y certificado médico, constancia de residencia, 2 de 3 comprobantes de ingreso y fiador obligatorio el día de la aprobación', /REQUISITOS \(lista oficial de Pagasi, versión noviembre 2026/.test(svS) && /RIF actualizado/.test(svS) && /Licencia y certificado médico de 2do grado/.test(svS) && /Constancia de residencia/.test(svS) && /al menos 2 de estos 3/.test(svS) && /obligatorio asistir con su FIADOR/.test(svS) && /la entrega es inmediata después de la aprobación/.test(svS) && !/no digas "de una vez"/.test(svS) && /Si la cuenta parece un negocio o un bot/.test(svS));
  // Calendario (Adam, 20-oct-2026): 3 días antes, el día, 1 y 3 días después, a los 7; acuerdos de pago respetados
  const W = require(path.join(__dirname, '..', 'logic', 'whatsapp.js'));
  const enDias = d => { const x = cred('X', 'CX', 15 + d); return W.waColaHoy([x], [], [{ id: 'CX', nombre: 'X', tel: '04140000000' }], HOY); };
  const grupoDe = d => { const c = enDias(d); return Object.keys(c.grupos).find(k => c.grupos[k].length); };
  ok('la cola pone la cuota en el grupo correcto: -3 y -1 próximas, 0 hoy, +1 y +3 gracia, +7 atrasadas, +12 cobrador', grupoDe(-3) === 'proximas' && grupoDe(-1) === 'proximas' && grupoDe(0) === 'hoy' && grupoDe(1) === 'gracia' && grupoDe(3) === 'gracia' && grupoDe(7) === 'atrasadas' && grupoDe(12) === 'cobrador' && !grupoDe(-4));
  ok('se escribe solo los días del calendario: 3 antes, el día, 1 y 3 después, a los 7', recordatorios.CUANDO.proximas({ dias: -3 }) && !recordatorios.CUANDO.proximas({ dias: -2 }) && recordatorios.CUANDO.hoy({ dias: 0 }) && recordatorios.CUANDO.gracia({ dias: 1 }) && recordatorios.CUANDO.gracia({ dias: 3 }) && !recordatorios.CUANDO.gracia({ dias: 2 }) && recordatorios.CUANDO.atrasadas({ dias: 7 }) && !recordatorios.CUANDO.atrasadas({ dias: 6 }));
  const conAcuerdo = (fc) => { const x = cred('Y', 'CY', 20, { fechaCompromiso: fc }); return W.waColaHoy([x], [], [{ id: 'CY', nombre: 'Y', tel: '04140000001' }], HOY); };
  const ca = conAcuerdo(iso(1));
  ok('con acuerdo de pago vigente no se le cobra el atraso: va al grupo "acuerdo" con la fecha del compromiso', ca.grupos.acuerdo.length === 1 && !ca.grupos.gracia.length && !ca.grupos.atrasadas.length && ca.grupos.acuerdo[0].fechaVence === iso(1) && ca.grupos.acuerdo[0].dias === -1 && recordatorios.CUANDO.acuerdo(ca.grupos.acuerdo[0]));
  ok('...el día del compromiso también se le recuerda; 3 días antes no', recordatorios.CUANDO.acuerdo(conAcuerdo(HOY).grupos.acuerdo[0]) && !recordatorios.CUANDO.acuerdo(conAcuerdo(iso(3)).grupos.acuerdo[0]));
  ok('si la fecha del compromiso pasó sin pago, vuelve a los recordatorios de atraso', !conAcuerdo(iso(-2)).grupos.acuerdo.length && conAcuerdo(iso(-2)).total === 1);
  let Ac = armar(); Ac.db26._store.set('creditos/M-9', cred('M-9', 'C26c', 20, { cli: 'LUIS ROJAS', fechaCompromiso: iso(1) })); Ac.db26._store.set('clientes/C26c', { id: 'C26c', nombre: 'LUIS ROJAS', tel: '04147776655' });
  await recordatorios.correr(Ac.deps, { hoy: HOY, plantillas: {} });
  const tplA = Ac.plantillas.find(x => x.a === '+584147776655');
  ok('un día antes del compromiso sale el recordatorio con la fecha del compromiso', tplA && tplA.n === 'recordatorio_cuota' && /de octubre/.test(tplA.p[2]));
  // ── Comentarios de Instagram (20-oct-2026) ──
  const avisoCom = (id, texto, de, usuario, parent) => ({ object: 'instagram', entry: [{ id: '17841425348351958', time: 1760900000, changes: [{ field: 'comments', value: Object.assign({ id, text: texto, from: { id: de, username: usuario }, media: { id: 'media1', media_product_type: 'FEED' } }, parent ? { parent_id: parent } : {}) }] }] });
  const pc = meta.parsearWebhook(avisoCom('c1', '¿cuánto cuesta la BRZ 200?', '555777', 'pepe.moto'));
  ok('el aviso de un comentario se interpreta: id, texto, quién, publicación', pc.comentarios.length === 1 && pc.comentarios[0].comentarioId === 'c1' && pc.comentarios[0].usuario === 'pepe.moto' && pc.comentarios[0].de === '555777' && pc.comentarios[0].mediaId === 'media1' && pc.mensajes.length === 0);
  let G = armar(); G.cerebroFalso.respuesta = { reply: 'La BRZ 200 está en $1.750, $148 por quincena a 12 meses. Escríbeme por mensaje directo y te paso todo.', draft: null, summary: 'Preguntó precio BRZ 200 en un comentario.', handoff: false };
  let rc = await procesar.procesarAviso(G.deps, pc);
  const comDoc = G.db26._store.get('comentarios_ig/c1');
  ok('a una pregunta en un comentario Paola contesta en público (corto) y abre el privado', rc.comentarios[0].respondido && rc.comentarios[0].privado && G.comentariosResp.length === 1 && G.comentariosResp[0].id === 'c1' && /1[.]750/.test(G.comentariosResp[0].t) && G.privados.length === 1 && G.privados[0].id === 'c1' && /Paola/.test(G.privados[0].t));
  ok('...el comentario queda guardado como respondido y el privado abre la conversación en el panel', comDoc && comDoc.estado === 'respondido' && comDoc.respuestaId === 'rep1' && comDoc.privado && comDoc.privado.igsid === '99001' && G.db26._store.get('conversaciones/ig:99001') && G.db26._store.get('conversaciones/ig:99001').origenComentario === 'c1' && G.db26._lista('conversaciones/ig:99001/mensajes/').length === 1);
  ok('el briefing del comentario lleva la instrucción de respuesta pública y el catálogo', /COMENTARIO PÚBLICO/.test(G.cerebroFalso.ultimo.sistema) && /NO_RESPONDER/.test(G.cerebroFalso.ultimo.sistema) && /CATÁLOGO VIGENTE/.test(G.cerebroFalso.ultimo.sistema));
  rc = await procesar.procesarAviso(G.deps, pc);
  ok('el mismo comentario repetido no se vuelve a responder', rc.comentarios[0].saltado === 'repetido' && G.comentariosResp.length === 1);
  rc = await procesar.procesarAviso(G.deps, meta.parsearWebhook(avisoCom('c2', 'Gracias por escribir, te respondemos por DM', '17841425348351958', 'pagasi.io')));
  ok('los comentarios de la propia cuenta de Pagasi se ignoran', rc.comentarios[0].saltado === 'propio' && G.comentariosResp.length === 1);
  rc = await procesar.procesarAviso(G.deps, meta.parsearWebhook(avisoCom('c3', 'yo también quiero', '555778', 'ana', 'c1')));
  ok('las respuestas a respuestas (hilo) no se contestan', rc.comentarios[0].saltado === 'respuesta-a-respuesta');
  G.cerebroFalso.respuesta = { reply: 'Gracias, nos alegra. Cuando quieras, escríbenos por mensaje directo.', draft: null, summary: '', handoff: false };
  rc = await procesar.procesarAviso(G.deps, meta.parsearWebhook(avisoCom('c4', 'me encanta esta moto', '555779', 'luisa')));
  ok('un comentario sin pregunta se contesta en público pero no abre privado', rc.comentarios[0].respondido && !rc.comentarios[0].privado && G.comentariosResp.length === 2 && G.privados.length === 1);
  G.cerebroFalso.respuesta = { reply: 'Lamento la demora. Te escribo por privado ahora mismo para resolverlo.', draft: null, summary: 'Reclamo por falta de respuesta.', handoff: true, handoffReason: 'queja' };
  rc = await procesar.procesarAviso(G.deps, meta.parsearWebhook(avisoCom('c5', 'Llevé mis documentos y nadie me responde, llevo 2 días esperando', '555780', 'regularito')));
  ok('un reclamo se contesta en público con disculpa, abre el privado y marca la conversación como queja', rc.comentarios[0].respondido && rc.comentarios[0].reclamo && G.privados.length === 2 && /resolverlo|escalo/.test(G.privados[1].t) && G.db26._store.get('conversaciones/ig:99002').atencion === 'queja');
  G.cerebroFalso.respuesta = { reply: 'NO_RESPONDER', draft: null, summary: 'spam', handoff: false };
  rc = await procesar.procesarAviso(G.deps, meta.parsearWebhook(avisoCom('c6', 'SIGUEME Y TE SIGO 🔥🔥', '555781', 'spam.acc')));
  ok('si Paola decide NO_RESPONDER (spam, otro negocio) no se publica nada', !rc.comentarios[0].respondido && rc.comentarios[0].motivo === 'no-responder' && G.comentariosResp.length === 3 && G.db26._store.get('comentarios_ig/c6').estado === 'sin-respuesta');
  // Tope por persona: 2 públicas y 1 privada al día; y la respuesta pública va en una línea sin saludo
  G.cerebroFalso.respuesta = { reply: 'Hola 👋 Soy Paola, asesora comercial de Pagasi. Disculpa la demora.\nTe escribo por privado ahora mismo.', draft: null, summary: '', handoff: false };
  const antesPub = G.comentariosResp.length, antesPriv = G.privados.length;
  rc = await procesar.procesarAviso(G.deps, meta.parsearWebhook(avisoCom('c8', 'nadie me responde por whatsapp', '555780', 'regularito')));
  ok('la segunda queja de la misma persona en el día sí se contesta en público (tope 2) pero ya no abre otro privado (tope 1)', rc.comentarios[0].respondido && !rc.comentarios[0].privado && G.comentariosResp.length === antesPub + 1 && G.privados.length === antesPriv);
  ok('...y la respuesta pública sale en una sola línea, sin el saludo de Paola', !/\n/.test(G.comentariosResp[antesPub].t) && !/Soy Paola/.test(G.comentariosResp[antesPub].t) && /Disculpa la demora/.test(G.comentariosResp[antesPub].t));
  rc = await procesar.procesarAviso(G.deps, meta.parsearWebhook(avisoCom('c9', 'sigo esperando respuesta', '555780', 'regularito')));
  ok('la tercera queja del día de la misma persona ya no se contesta en público: queda guardada con el motivo', !rc.comentarios[0].respondido && rc.comentarios[0].motivo === 'tope-usuario' && G.comentariosResp.length === antesPub + 1 && /tope/.test(G.db26._store.get('comentarios_ig/c9').motivo));
  rc = await procesar.procesarAviso(G.deps, meta.parsearWebhook(avisoCom('c7', '😍😍', '555782', 'emoji')));
  ok('un comentario de solo emojis no pasa por el cerebro ni se contesta', !rc.comentarios[0].respondido && rc.comentarios[0].motivo === 'vacio');
  // Enlaces: uno por conversación y solo si lo piden (20-oct-2026: 30% de las respuestas llevaban uno)
  ok('recortarEnlaces quita el enlace que nadie pidió y deja el resto', procesar.recortarEnlaces('Moka · $1.295, $73 por quincena. Puedes verla en pagasi.io/catalogo. ¿Te adelanto la solicitud?', { yaEnlace: false, pedido: { texto: 'cuanto cuesta la moka' } }) === 'Moka · $1.295, $73 por quincena.\n¿Te adelanto la solicitud?');
  ok('...si lo pidió (fotos, formulario) lo deja, pero solo uno', procesar.recortarEnlaces('Aquí las ves: pagasi.io/catalogo', { yaEnlace: false, pedido: { texto: 'tienes fotos?' } }) === 'Aquí las ves: pagasi.io/catalogo' && procesar.recortarEnlaces('El formulario: pagasi.io/solicitar. Y simula en pagasi.io/calculadora.', { yaEnlace: false, pedido: { texto: 'donde lleno el formulario' } }) === 'El formulario: pagasi.io/solicitar.');
  const svE = ventas.armarVentas({ instrucciones: '', motos: [], cond: null, sedes: [], hoy: '2026-10-20', nombrePerfil: '', usuario: 'x', canal: 'instagram', telefono: '', esCliente: false, yaEnlace: true });
  ok('el briefing trae la regla de un solo enlace y avisa cuando ya se mandó uno', /Máximo UN enlace en toda la conversación/.test(svE) && /YA MANDASTE UN ENLACE/.test(svE) && !/pagasi\.io\/calculadora\. Ver fotos/.test(svE));
  let E = armar();
  await E.db26.collection('conversaciones').doc('ig:888001').set({ canal: 'instagram', modo: 'bot', usuario: 'ana' });
  await E.db26.collection('conversaciones').doc('ig:888001').collection('mensajes').doc('a1').set({ autor: 'asistente', direccion: 'saliente', texto: 'Llénala en pagasi.io/solicitar', hora: '2026-10-16T09:00:00.000Z' });
  E.cerebroFalso.respuesta = { reply: 'La Moka está en $1.295. Mírala en pagasi.io/catalogo. ¿Te adelanto la solicitud?', draft: null, summary: '', handoff: false };
  await procesar.procesarMensaje(E.deps, { canal: 'instagram', metaId: 'mid.e1', de: '888001', nombre: '', tipo: 'texto', texto: 'y la moka?', medio: null, hora: AHORA });
  ok('con un enlace ya enviado en la conversación, el siguiente sale sin enlace aunque el modelo lo meta', E.ig.length === 1 && !/pagasi\.io/.test(E.ig[0].t) && /1\.295/.test(E.ig[0].t) && /YA MANDASTE UN ENLACE/.test(E.cerebroFalso.ultimo.sistema));
  // Sedes sin catálogo en línea: sus modelos salen de los créditos de esa sede (20-oct: "en Trujillo no sabes nada")
  const svT = ventas.armarVentas({ instrucciones: '', motos: [{ id: 1, name: 'BRZ 200', precio: 1750, sedeName: 'EK Bello Monte' }], cond: null, sedes: [{ nombre: 'EK Bello Monte', ciudad: 'Caracas' }, { nombre: 'EK Trujillo', ciudad: 'Valera', vendidas: [{ modelo: 'EK XPRESS II 150', precio: 1376, n: 20 }, { modelo: 'OWEN 200S', precio: 1803, n: 8 }] }], hoy: '2026-10-20', nombrePerfil: '', usuario: 'x', canal: 'instagram', telefono: '', esCliente: false });
  ok('una sede sin catálogo en la web lleva sus modelos y cuotas calculadas a partir de sus créditos', /SEDE EK Trujillo \(Valera\) — modelos que vende esta sede/.test(svT) && /EK Xpress II 150: precio \$1,376 · inicial desde \$551/.test(svT) && /Owen 200S: precio \$1,803/.test(svT) && !/EK Trujillo — Valera \(estado Trujillo\) · \(sede sin catálogo en línea\)/.test(svT));
  ok('el briefing manda a cerrar la venta en el chat y nunca a WhatsApp', /CERRAR LA VENTA EN ESTE CHAT/.test(svT) && /NUNCA mandes a la persona a WhatsApp/.test(svT) && /fiador: nombre, cédula y teléfono/.test(svT) && !/un asesor le escribe por WhatsApp/.test(svT) && !/te escribe hoy/.test(svT));
  // La solicitud que se completa en el chat queda en el cliente con los campos de la solicitud web
  let S2 = armar();
  S2.cerebroFalso.respuesta = { reply: 'Listo, Carla: tu solicitud quedó completa.', draft: { tipo: 'lead', nombre: 'Carla Ruiz', cedula: '20.333.444', telefono: '0414-7778899', ciudad: 'Caracas', direccion: 'Petare, calle 2', modelo: 'Moka', sede: 'Motos Toro Sabana Grande', inicial: 600, ocupacion: 'Comerciante independiente', ingreso: 500, fiador: 'José Ruiz · V-11222333 · 0412-5556677', ref1: 'Ana Pérez · 0414-1112233', ref2: 'Luis Díaz · 0424-4445566' }, summary: 'Solicitud completa por chat.', handoff: true, handoffReason: 'lead' };
  await procesar.procesarMensaje(S2.deps, { canal: 'instagram', metaId: 'mid.sc1', de: '444001', nombre: '', tipo: 'texto', texto: 'mis referencias: Ana 0414-1112233 y Luis 0424-4445566', medio: null, hora: AHORA });
  const cliS = S2.db26._store.get('clientes/WEB-20333444');
  ok('la solicitud completa en el chat entra al cliente con dirección, ingreso, fiador y 2 referencias (campos de la solicitud web)', cliS && cliS.dir === 'PETARE, CALLE 2' && cliS.ingreso === 500 && cliS.fiador === 'si' && cliS.fiador_nom === 'JOSE RUIZ' && cliS.fiador_ci === 'V-11222333' && /5556677/.test(cliS.fiador_tel) && cliS.ref1 && cliS.ref1.nom === 'ANA PEREZ' && /1112233/.test(cliS.ref1.tel) && cliS.ref2.nom === 'LUIS DIAZ' && cliS.solicitud_chat_completa === true);
  // Historial: Paola ve los ÚLTIMOS mensajes (20-oct-2026: pasados 40, veía los primeros y repetía lo mismo)
  let Hs = armar(); const refH = Hs.db26.collection('conversaciones').doc('ig:555999');
  await refH.set({ canal: 'instagram', modo: 'bot', usuario: 'liz' });
  for (let i = 0; i < 70; i++) await refH.collection('mensajes').doc('h' + i).set({ autor: i % 2 ? 'asistente' : 'cliente', direccion: i % 2 ? 'saliente' : 'entrante', texto: 'mensaje viejo ' + i, hora: new Date(Date.parse(AHORA) - (200 - i) * 60000).toISOString() });
  Hs.cerebroFalso.respuesta = { reply: 'Claro, dime tu duda.', draft: null, summary: '', handoff: false };
  await procesar.procesarMensaje(Hs.deps, { canal: 'instagram', metaId: 'mid.duda', de: '555999', nombre: '', tipo: 'texto', texto: 'Tengo otra duda', medio: null, hora: AHORA });
  const vistos = Hs.cerebroFalso.ultimo.mensajes.map(m => m.texto);
  ok('con más de 40 mensajes, Paola recibe los ÚLTIMOS (incluido el que acaba de llegar), no los primeros', vistos[vistos.length - 1] === 'Tengo otra duda' && vistos.includes('mensaje viejo 69') && !vistos.includes('mensaje viejo 0') && vistos.length === 60);
  // Guardia de repetición: si la respuesta repite la anterior, se le pide otra que atienda lo último
  ok('repite() detecta la misma pregunta final o un mensaje casi igual al anterior', procesar.repite('Sigo con las referencias: ¿nombre y teléfono de tu primera referencia?', [{ autor: 'asistente', texto: 'Lo anotamos después. Sigo con las referencias: ¿nombre y teléfono de tu primera referencia?' }]) && !procesar.repite('Claro, ¿cuál es tu duda?', [{ autor: 'asistente', texto: 'Sigo con las referencias: ¿nombre y teléfono de tu primera referencia?' }]));
  let Rp = armar(); const refR = Rp.db26.collection('conversaciones').doc('ig:555888');
  await refR.set({ canal: 'instagram', modo: 'bot', usuario: 'liz2' });
  await refR.collection('mensajes').doc('p1').set({ autor: 'asistente', direccion: 'saliente', texto: 'Sigo con tus referencias: ¿nombre y teléfono de la primera?', hora: '2026-10-16T13:00:00.000Z' });
  let llamadas = 0; const pensarR = Rp.cerebroFalso.pensar;
  Rp.cerebroFalso.pensar = async function (x) { llamadas++; this.ultimo = x; return llamadas === 1 ? { reply: 'Ok. Sigo con tus referencias: ¿nombre y teléfono de la primera?', draft: null, summary: '', handoff: false } : { reply: 'Claro, ¿cuál es tu duda?', draft: null, summary: '', handoff: false }; };
  await procesar.procesarMensaje(Rp.deps, { canal: 'instagram', metaId: 'mid.rp1', de: '555888', nombre: '', tipo: 'texto', texto: 'Tengo otra duda', medio: null, hora: AHORA });
  ok('si Paola iba a repetir su pregunta anterior, se le pide otra respuesta y sale la que atiende la duda', llamadas === 2 && Rp.ig.length === 1 && Rp.ig[0].t === 'Claro, ¿cuál es tu duda?' && /tu borrador repetía/.test(Rp.cerebroFalso.ultimo.sistema));
  Rp.cerebroFalso.pensar = pensarR;
  ok('el briefing pone la PRIORIDAD: responder primero a lo último y no repetir', /PRIORIDAD \(manda sobre todo lo demás/.test(ventas.armarVentas({ instrucciones: '', motos: [], cond: null, sedes: [], hoy: '2026-10-20', nombrePerfil: '', usuario: 'x', canal: 'instagram', telefono: '', esCliente: false })));
  ok('el cerebro valida un lead y limpia el teléfono', JSON.stringify(cerebro.validar({ reply: 'ok', draft: { tipo: 'lead', nombre: 'Luis Pérez', ciudad: 'Maracay', modelo: 'BRZ 200', telefono: '0414-555.0000' }, summary: 's', handoff: true, handoffReason: 'lead' }).draft) === JSON.stringify({ tipo: 'lead', nombre: 'Luis Pérez', ciudad: 'Maracay', modelo: 'BRZ 200', telefono: '04145550000', cedula: '', inicial: 0, ocupacion: '', direccion: '', ingreso: 0, sede: '', fiador: '', ref1: '', ref2: '', nota: '' }) && cerebro.validar({ reply: 'x', draft: { tipo: 'lead' }, summary: '', handoff: false }).draft === null);
  let ri = await procesar.procesarMensaje(B.deps, pi.mensajes[0]);
  const convIg = B.db26._store.get('conversaciones/ig:555001');
  ok('un mensaje de Instagram crea la conversación en la 26 (área ventas) con el usuario del perfil y sin cliente ni crédito', ri.empresa === '26' && ri.canal === 'instagram' && convIg && convIg.canal === 'instagram' && convIg.area === 'ventas' && convIg.usuario === 'luisperez.ve' && convIg.nombre === 'Luis Pérez' && convIg.clienteId === '' && !convIg.cred);
  ok('...el cerebro recibió el briefing de VENTAS (catálogo, no ledger) y se respondió por Instagram', /CATÁLOGO VIGENTE/.test(B.cerebroFalso.ultimo.sistema) && !/CRÉDITO M-1/.test(B.cerebroFalso.ultimo.sistema) && B.ig.length === 1 && B.ig[0].a === '555001' && B.enviados.length === 0);
  const bajadas = []; B.deps.bajarUrl = async (u) => { bajadas.push(u); return { bytes: Buffer.from('jpgdata'), mime: 'image/jpeg' }; };
  await procesar.procesarMensaje(B.deps, { canal: 'instagram', metaId: 'mid.foto9', de: '555001', nombre: '', tipo: 'imagen', texto: '', medio: { url: 'https://lookaside.fbsbx.com/foto.jpg', tipoMeta: 'image' }, hora: AHORA });
  const mf9 = B.db26._store.get('conversaciones/ig:555001/mensajes/mid.foto9');
  ok('la foto que manda la persona por Instagram se copia a Storage (el enlace de Meta vence) y queda el original', bajadas[0] === 'https://lookaside.fbsbx.com/foto.jpg' && mf9.medio.url === 'https://st/redes_instagram/555001/mid.foto9.jpg' && mf9.medio.original === 'https://lookaside.fbsbx.com/foto.jpg' && B.subidos.some(x => x.ruta === 'redes_instagram/555001/mid.foto9.jpg'));
  delete B.deps.bajarUrl;
  B.cerebroFalso.respuesta = { reply: 'Listo, Luis. Un asesor te escribe.', draft: { tipo: 'lead', nombre: 'Luis Pérez', ciudad: 'Maracay', modelo: 'BRZ 200', telefono: '04145550000' }, summary: 'Quiere la BRZ 200, Maracay.', handoff: true, handoffReason: 'lead' };
  ri = await procesar.procesarMensaje(B.deps, { canal: 'instagram', metaId: 'mid.3', de: '555001', nombre: '', tipo: 'texto', texto: 'soy Luis, Maracay, 0414-5550000', medio: null, hora: AHORA });
  const lead = B.db26._store.get('leads/ig:555001');
  ok('cuando quiere comprar queda el lead (colección leads + borrador) y la conversación marcada "Quiere comprar"', ri.handoff && lead && lead.modelo === 'BRZ 200' && lead.telefono === '04145550000' && lead.estado === 'nuevo' && lead.usuario === 'luisperez.ve' && B.db26._store.get('conversaciones/ig:555001').atencion === 'lead' && B.db26._store.get('conversaciones/ig:555001').borrador.ciudad === 'Maracay');
  const cliIg = B.db26._store.get('clientes/IG-555001');
  ok('el lead de Instagram entra a Clientes como Lead Instagram (nombre, teléfono, moto, @usuario)', cliIg && cliIg.origen === 'instagram' && cliIg.estado === 'lead' && cliIg.nombre === 'LUIS PEREZ' && cliIg.tel === '04145550000' && cliIg.moto_interes_modelo === 'BRZ 200' && /Lead Instagram/.test(cliIg.notas) && B.db26._store.get('conversaciones/ig:555001').clienteLead === 'IG-555001');
  B.cerebroFalso.respuesta = { reply: 'Anotada tu cédula.', draft: { tipo: 'lead', cedula: 'V-20.111.222', ocupacion: 'Comerciante', inicial: 700 }, summary: 'Dio su cédula.', handoff: true, handoffReason: 'lead' };
  ri = await procesar.procesarMensaje(B.deps, { canal: 'instagram', metaId: 'mid.3b', de: '555001', nombre: '', tipo: 'texto', texto: 'mi cédula es 20.111.222, soy comerciante, tengo 700 de inicial', medio: null, hora: AHORA });
  ok('la cédula que llega después completa el MISMO cliente (sin crear otro) y el borrador acumula todo', B.db26._store.get('clientes/IG-555001').cedula === 'V-20111222' && B.db26._store.get('clientes/IG-555001').trabajo === 'Comerciante' && !B.db26._store.get('clientes/WEB-20111222') && B.db26._store.get('conversaciones/ig:555001').borrador.nombre === 'Luis Pérez' && B.db26._store.get('conversaciones/ig:555001').borrador.cedula === 'V-20111222' && B.db26._store.get('conversaciones/ig:555001').borrador.inicial === 700);
  ri = await procesar.procesarMensaje(B.deps, pi.mensajes[0]);
  ok('el mismo mid otra vez no se procesa', ri.saltado === 'repetido');
  await procesar.procesarEstado(B.deps, pi.estados[0]);
  ok('la lectura de Instagram marca nuestro mensaje como leído', B.db26._store.get('conversaciones/ig:555001/mensajes/mid.out1').estado === 'leido');
  await procesar.enviarEquipo(B.deps, { empresa: '26', convId: 'ig:555001', texto: 'Hola Luis, soy Samantha', por: 'Samantha' });
  ok('el equipo responde por Instagram dentro de la ventana (sin etiqueta) y toma la conversación', B.ig[B.ig.length - 1].a === '555001' && B.ig[B.ig.length - 1].humano === false && B.db26._store.get('conversaciones/ig:555001').modo === 'humano');
  await B.db26.collection('conversaciones').doc('ig:555001').set({ ultimoEntranteHora: '2026-10-16T10:00:00.000Z' }, { merge: true });
  await procesar.enviarEquipo(B.deps, { empresa: '26', convId: 'ig:555001', texto: 'seguimos', por: 'Samantha' });
  ok('...pasadas 24 h y antes de 7 días va como agente humano', B.ig[B.ig.length - 1].humano === true);
  await B.db26.collection('conversaciones').doc('ig:555001').set({ ultimoEntranteHora: '2026-10-01T10:00:00.000Z' }, { merge: true });
  let errIg = null; try { await procesar.enviarEquipo(B.deps, { empresa: '26', convId: 'ig:555001', texto: 'x', por: 'S' }); } catch (x) { errIg = x; }
  ok('...y pasados 7 días ya no se puede', errIg && errIg.codigo === 'ventana');
  const C = armar(); C.deps.metaIG = null;
  ok('sin Instagram configurado el mensaje se salta sin romper nada', (await procesar.procesarMensaje(C.deps, pi.mensajes[0])).saltado === 'instagram-no-configurado');

  // ── Redes sociales (22-oct-2026): la calidad escoge el modelo y cada asistente se apaga por canal ──
  {
    const cuerpos = []; let primera = true;
    const responde = (ok, j) => ({ ok, status: ok ? 200 : 400, json: async () => j });
    const util = { content: [{ type: 'tool_use', name: 'responder', input: { reply: 'Hola', summary: '', handoff: false } }], usage: {} };
    const fetchQ = async (u, o) => { cuerpos.push(JSON.parse(o.body)); return responde(true, util); };
    for (const q of ['economica', 'normal', 'maxima', undefined]) await cerebro.pensar({ apiKey: 'x', sistema: 'S', mensajes: [{ autor: 'cliente', texto: 'hola' }], fetchImpl: fetchQ, calidad: q });
    ok('calidad Económica: Claude Haiku 5.5, con el razonamiento apagado', cuerpos[0].model === 'claude-haiku-5-5' && cuerpos[0].thinking && cuerpos[0].thinking.type === 'disabled');
    ok('calidad Normal: Claude Sonnet 5.5, sin el parámetro de razonamiento y pensando corto (esfuerzo bajo, 23-oct)', cuerpos[1].model === 'claude-sonnet-5-5' && !('thinking' in cuerpos[1]) && cuerpos[1].output_config && cuerpos[1].output_config.effort === 'low');
    ok('calidad Máxima: Claude Opus 5.5, sin intentar apagar el razonamiento (no lo deja)', cuerpos[2].model === 'claude-opus-5-5' && !('thinking' in cuerpos[2]) && cuerpos[2].max_tokens >= 3000);
    ok('sin calidad escogida, la Normal', cuerpos[3].model === 'claude-sonnet-5-5');
    // Si la API no aceptara el esfuerzo, se va sin él (no se queda sin contestar)
    {
      const enviados = []; let n = 0;
      const fE = async (u, o) => { const b = JSON.parse(o.body); enviados.push(b); n++; if (n === 1) return responde(false, { error: { message: 'output_config.effort: invalid value' } }); return responde(true, util); };
      const rE = await cerebro.pensar({ apiKey: 'x', sistema: 'S', mensajes: [{ autor: 'cliente', texto: 'hola' }], fetchImpl: fE, calidad: 'normal' });
      ok('si la API rechaza el esfuerzo, reintenta sin él y contesta', rE && rE.reply === 'Hola' && enviados.length === 2 && !('output_config' in enviados[1]));
    }
    // Reintento sin respuesta útil: Sonnet/Opus 5.5 no aceptan obligar la herramienta
    for (const q of ['normal', 'economica']) {
      cuerpos.length = 0; primera = true;
      const fetchR = async (u, o) => { cuerpos.push(JSON.parse(o.body)); if (primera) { primera = false; return responde(true, { content: [], usage: {} }); } return responde(true, util); };
      await cerebro.pensar({ apiKey: 'x', sistema: 'S', mensajes: [{ autor: 'cliente', texto: 'hola' }], fetchImpl: fetchR, calidad: q });
      if (q === 'normal') ok('reintento en Normal: más tope y SIN obligar la herramienta (daría 400)', cuerpos.length === 2 && cuerpos[1].tool_choice.type === 'auto' && cuerpos[1].max_tokens > cuerpos[0].max_tokens);
      else ok('reintento en Económica: obliga la herramienta (Haiku sí lo acepta)', cuerpos.length === 2 && cuerpos[1].tool_choice.type === 'tool');
    }
    // Paola apagada en Instagram: el mensaje llega, no se le pregunta a Claude ni se responde
    const R = armar(); R.deps.cfg.responde = { instagram: false };
    R.cerebroFalso.ultimo = null; const igAntes = R.ig.length;
    const ra = await procesar.procesarMensaje(R.deps, { canal: 'instagram', metaId: 'mid.apag', de: '777001', nombre: '', tipo: 'texto', texto: 'precio?', medio: null, hora: AHORA });
    ok('Paola apagada en Instagram: el mensaje queda en el panel y no se responde', ra.apagada && !R.cerebroFalso.ultimo && R.ig.length === igAntes && R.db26._store.get('conversaciones/ig:777001').noLeidos === 1 && !!R.db26._store.get('conversaciones/ig:777001/mensajes/mid.apag'));
    // Comentarios apagados
    const rcA = await procesar.procesarAviso(R.deps, meta.parsearWebhook(avisoCom('c9', '¿precio de la BRZ?', '555790', 'carla')));
    R.deps.cfg.responde = { comentariosIg: false }; R.cerebroFalso.ultimo = null;
    await procesar.procesarAviso(R.deps, meta.parsearWebhook(avisoCom('c10', '¿precio de la BRZ?', '555791', 'marta')));
    const c10 = R.db26._store.get('comentarios_ig/c10');
    ok('Paola apagada en comentarios: el comentario se guarda "sin respuesta" y dice por qué', !!rcA && c10 && c10.estado === 'sin-respuesta' && /apagada/.test(c10.motivo) && !R.cerebroFalso.ultimo);
    // La calidad que se escogió le llega al cerebro, por área
    const Q = armar(); Q.deps.cfg.calidad = { ventas: 'economica', cobranza: 'maxima' };
    await procesar.procesarMensaje(Q.deps, { canal: 'instagram', metaId: 'mid.q1', de: '777002', nombre: '', tipo: 'texto', texto: 'precio?', medio: null, hora: AHORA });
    ok('Paola usa la calidad de ventas que se escogió', Q.cerebroFalso.ultimo && Q.cerebroFalso.ultimo.calidad === 'economica');
  }

  // ── Métricas de Instagram (22-oct-2026): cuenta y publicaciones con "me gusta" y comentarios ──
  {
    const metricas = require(path.join(__dirname, '..', 'functions', 'lib', 'metricas.js'));
    const pedidos = [];
    const fM = async (u) => { pedidos.push(u); const j = u.includes('/media?') ? { data: [{ id: 1, caption: 'Veloz en cuotas', like_count: 5, comments_count: 2, timestamp: '2026-09-28T14:00:00+0000', media_type: 'IMAGE', permalink: 'https://instagram.com/p/x', media_url: 'https://cdn/x.jpg' }, { id: 2, media_type: 'VIDEO', media_product_type: 'REELS', thumbnail_url: 'https://cdn/t.jpg', media_url: 'https://cdn/v.mp4' }] } : { username: 'pagasi.io', followers_count: 662, follows_count: 10, media_count: 12 }; return { ok: true, status: 200, json: async () => j }; };
    const m = await metricas.instagram(fM, { token: 'T', cuenta: '178' });
    ok('métricas: la cuenta (usuario, seguidores, publicaciones)', m.usuario === 'pagasi.io' && m.seguidores === 662 && m.publicaciones === 12);
    ok('métricas: cada publicación con "me gusta", comentarios, enlace y foto (del reel, su miniatura)', m.posts.length === 2 && m.posts[0].meGusta === 5 && m.posts[0].comentarios === 2 && m.posts[0].enlace && m.posts[0].imagen === 'https://cdn/x.jpg' && m.posts[1].imagen === 'https://cdn/t.jpg' && m.posts[1].meGusta === 0);
    ok('métricas: solo pide campos que deja el permiso de hoy (sin insights)', pedidos.every(u => !/insights/.test(u)));
    let err = null; try { await metricas.instagram(async () => ({ ok: false, status: 400, json: async () => ({ error: { message: '(#10) sin permiso' } }) }), { token: 'T', cuenta: '178' }); } catch (e) { err = e; }
    ok('métricas: si Meta niega algo, avisa con su mensaje', err && /sin permiso/.test(err.message));
  }

  // ── Bajar costos (23-oct-2026): el manual guardado 1 hora y lo que gasta cada respuesta ──
  {
    let cuerpo = null;
    const fU = async (u, o) => { cuerpo = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'tool_use', name: 'responder', input: { reply: 'Hola', summary: '', handoff: false } }],
      usage: { input_tokens: 100, output_tokens: 400, cache_read_input_tokens: 18000, cache_creation_input_tokens: 1500, cache_creation: { ephemeral_5m_input_tokens: 1500, ephemeral_1h_input_tokens: 0 } } }) }; };
    const r = await cerebro.pensar({ apiKey: 'x', sistema: 'FIJO ' + cerebro.CORTE + ' persona', mensajes: [{ autor: 'cliente', texto: 'hola' }], fetchImpl: fU, calidad: 'normal' });
    ok('el manual se guarda 1 hora (ttl 1h) y el historial de la conversación 5 minutos', cuerpo.system[0].cache_control.ttl === '1h' && !cuerpo.messages[cuerpo.messages.length - 1].content[0].cache_control.ttl);
    // Sonnet: 100×2 + 400×10 + 18000×0,20 + 1500×2,50 = 200 + 4000 + 3600 + 3750 = 11.550 por millón
    ok('cada respuesta trae lo que gastó: llamadas, tokens y costo en dólares (Sonnet)', r.gasto && r.gasto.llamadas === 1 && r.gasto.salida === 400 && r.gasto.cacheLeida === 18000 && Math.abs(r.gasto.costo - 0.01155) < 1e-9);
    const g = { llamadas: 0, entrada: 0, salida: 0, cacheLeida: 0, cacheEscrita: 0, costo: 0 };
    cerebro.sumarUso(g, { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 18000, cache_creation: { ephemeral_1h_input_tokens: 18000 } }, 'claude-sonnet-5-5');
    ok('guardar el manual 1 hora cuesta el doble de la entrada (18 mil tokens = $0,072 en Sonnet)', Math.abs(g.costo - 0.072) < 1e-9 && g.cacheEscrita === 18000);
    const h = { llamadas: 0, entrada: 0, salida: 0, cacheLeida: 0, cacheEscrita: 0, costo: 0 };
    cerebro.sumarUso(h, { input_tokens: 100, output_tokens: 400 }, 'claude-haiku-5-5');
    ok('con Haiku el mismo trabajo cuesta 20 veces menos', Math.abs(h.costo - (100 * 0.10 + 400 * 0.50) / 1e6) < 1e-12);
    let n = 0; const fR = async (u, o) => { n++; return { ok: true, status: 200, json: async () => (n === 1 ? { content: [], usage: { input_tokens: 10, output_tokens: 1500 } } : { content: [{ type: 'tool_use', name: 'responder', input: { reply: 'ok', summary: '', handoff: false } }], usage: { input_tokens: 10, output_tokens: 300 } }) }; };
    const r2 = await cerebro.pensar({ apiKey: 'x', sistema: 'S', mensajes: [{ autor: 'cliente', texto: 'hola' }], fetchImpl: fR, calidad: 'normal' });
    ok('si hubo reintento, el gasto suma las dos llamadas', r2.gasto.llamadas === 2 && r2.gasto.salida === 1800);
    const idx = require('fs').readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
    ok('el servidor anota el gasto por día y por asistente en config/asistenteUso', /anotarGasto\(area \|\| 'ventas', r && r\.gasto\)/.test(idx) && /collection\('config'\)\.doc\('asistenteUso'\)/.test(idx));
  }

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
