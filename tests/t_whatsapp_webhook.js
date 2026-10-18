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
      where: (f, op, v) => q(where.concat([[f, op, v]]), orden, lim), orderBy: (f) => q(where, f, lim), limit: (n) => q(where, orden, n),
      async get() { let docs = [...store.entries()].filter(([k]) => k.startsWith(ruta + '/') && !k.slice(ruta.length + 1).includes('/')).map(([k, d]) => ({ id: k.slice(ruta.length + 1), data: () => d, exists: true })).filter(x => cumple(x.data(), where)); if (orden) docs.sort((a, b) => String(a.data()[orden]).localeCompare(String(b.data()[orden]))); if (lim) docs = docs.slice(-lim); return { docs, empty: !docs.length }; },
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
  const ig = [], igFalso = { enviarTexto: async (a, t, op) => { ig.push({ a, t, humano: !!(op && op.humano) }); return 'mid.out' + ig.length; }, marcarLeido: async () => '', perfil: async () => ({ nombre: 'Luis Pérez', usuario: 'luisperez.ve' }) };
  const catalogo = { motos: [{ id: '1', name: 'BRZ 200', modelo: 'BRZ 200', sedeName: 'EK Bello Monte', precio: 1750, cc: '200cc', cat: 'Ciudad', disponible: true, orden: 1 }, { id: '2', name: 'Kavak 250', sedeName: 'EK Bello Monte', precio: 2900, disponible: true, orden: 2 }, { id: '3', name: 'SBR 150', sedeName: 'Haojin', precio: null, disponible: true }, { id: '4', name: 'Vieja', sedeName: 'Haojin', precio: 900, disponible: false }], cond: { apy: 500, seguroPct: 0, inicialMin: 40, inicialMax: 60, plazos: [6, 9, 12] }, sedes: [{ nombre: 'EK Bello Monte', ciudad: 'Caracas', direccion: 'Av. Principal' }] };
  const deps = { bases: { '26': db26, '18': db18 }, storage: () => ({ subir: async (ruta, bytes, mime) => { subidos.push({ ruta, mime }); return 'https://st/' + ruta; } }), meta: metaFalso, metaIG: igFalso, ventas: async () => catalogo, cerebro: cerebroFalso, cfg: { instrucciones: 'Esta semana no se recibe efectivo.', instruccionesVentas: 'Hay promo de casco gratis en octubre.', datosPago: 'Pago Móvil 0414-000-0000 · Banco X · RIF J-00000000-0', empresaNombre: { '18': 'PAGASI 18', '26': 'PAGASI 26' } }, ahora: () => AHORA, hoy: () => HOY, log: () => {} };
  return { db26, db18, enviados, plantillas, subidos, ig, catalogo, metaFalso, cerebroFalso, deps };
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
  r = await procesar.procesarMensaje(A.deps, msgTexto('584160000000', 'quiero una moto', 'wamid.c1'));
  ok('un número que no es cliente → VENTAS por WhatsApp: en la 26, área ventas, briefing del catálogo y sin cifras de crédito', r.empresa === '26' && r.area === 'ventas' && r.respondido && A.db26._store.get('conversaciones/wa:+584160000000').area === 'ventas' && /CATÁLOGO VIGENTE/.test(A.cerebroFalso.ultimo.sistema) && /asistente de ventas de Pagasi en WhatsApp/.test(A.cerebroFalso.ultimo.sistema) && /\+584160000000/.test(A.cerebroFalso.ultimo.sistema) && /NO se lo pidas/.test(A.cerebroFalso.ultimo.sistema) && !/CRÉDITO/.test(A.cerebroFalso.ultimo.sistema));
  A.cerebroFalso.respuesta = { reply: 'Listo, Ana. Un asesor te escribe por aquí.', draft: { tipo: 'lead', nombre: 'Ana Torres', ciudad: 'Valencia', modelo: 'Kavak 250' }, summary: 'Quiere la Kavak 250, Valencia.', handoff: true, handoffReason: 'lead' };
  r = await procesar.procesarMensaje(A.deps, msgTexto('584160000000', 'soy Ana Torres, de Valencia', 'wamid.c2'));
  const leadWa = A.db26._store.get('leads/wa:+584160000000');
  ok('...cuando quiere comprar queda el lead de WhatsApp con el teléfono ya puesto y la conversación "Quiere comprar"', leadWa && leadWa.canal === 'whatsapp' && leadWa.telefono === '584160000000' && leadWa.modelo === 'Kavak 250' && A.db26._store.get('conversaciones/wa:+584160000000').atencion === 'lead');
  A.cerebroFalso.respuesta = null;
  ok('el área se decide por el número de negocio cuando hay uno de ventas configurado', procesar.areaDe({ cfg: { numeros: { ventas: '0412-5550000', cobranza: '0422-0000000' } } }, { telefonoNegocio: '584125550000' }, 'C26') === 'ventas' && procesar.areaDe({ cfg: { numeros: { ventas: '0412-5550000' } } }, { telefonoNegocio: '584220000000' }, 'C26') === 'cobranza' && procesar.areaDe({ cfg: {} }, { telefonoNegocio: '584220000000' }, '') === 'ventas');
  // promesa y handoff del cerebro
  A.cerebroFalso.respuesta = { reply: 'Anotado para el sábado.', draft: { tipo: 'promesa', fecha: '2026-10-24', monto: 50 }, summary: 'Promete pagar el sábado.', handoff: false, handoffReason: '' };
  await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'pago el sábado', 'wamid.a2'));
  ok('la promesa del cerebro queda como borrador y el resumen en la conversación', A.db26._store.get('conversaciones/wa:+584141234567').borrador.fecha === '2026-10-24' && /sábado/.test(A.db26._store.get('conversaciones/wa:+584141234567').resumen));
  A.cerebroFalso.respuesta = { reply: 'Ya te paso con una persona.', draft: null, summary: 'Se queja del cobro.', handoff: true, handoffReason: 'queja' };
  await procesar.procesarMensaje(A.deps, msgTexto('584141234567', 'esto está mal cobrado', 'wamid.a3'));
  ok('la queja marca la conversación para una persona', A.db26._store.get('conversaciones/wa:+584141234567').atencion === 'queja');
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

  // ── 5. Recordatorios ──
  A = armar();
  A.db26._store.set('creditos/M-2', cred('M-2', 'C26', 13, { cli: 'ANA LÓPEZ' }));            // la cuota 1 vence en 2 días
  A.db26._store.set('clientes/C26b', { id: 'C26b', nombre: 'ANA LÓPEZ', tel: '04149998877' }); A.db26._store.get('creditos/M-2').clienteId = 'C26b';
  let rr = await recordatorios.correr(A.deps, { hoy: HOY, plantillas: { proximas: 'cuota_proxima', hoy: 'cuota_hoy', gracia: 'cuota_gracia', atrasadas: 'cuota_atrasada' } });
  const r26 = rr.find(x => x.empresa === '26');
  ok('manda la plantilla a quien le toca hoy (cuota a 2 días) y la anota', r26.enviados >= 1 && A.plantillas.some(x => x.a === '+584149998877' && x.n === 'cuota_proxima') && A.db26._lista('recordatorios/').some(x => x.cred === 'M-2' && x.estado === 'enviado'));
  ok('...y queda como mensaje del asistente en una conversación nueva', A.db26._store.get('conversaciones/wa:+584149998877') && A.db26._lista('conversaciones/wa:+584149998877/mensajes/').some(m => m.tipo === 'plantilla'));
  const antesTpl = A.plantillas.length;
  rr = await recordatorios.correr(A.deps, { hoy: HOY, plantillas: { proximas: 'cuota_proxima' } });
  ok('la segunda corrida del mismo día no repite el envío', A.plantillas.length === antesTpl && rr.find(x => x.empresa === '26').repetidos >= 1);
  rr = await recordatorios.correr(armar().deps, { hoy: HOY, plantillas: {} });
  ok('sin plantillas aprobadas no se manda nada (se cuenta como sin plantilla)', rr.every(x => x.enviados === 0));

  // ── 6. Instagram: ventas ──
  const avisoIg = { object: 'instagram', entry: [{ id: '17841400000', time: 1760796000000, messaging: [
    { sender: { id: '555001' }, recipient: { id: '17841400000' }, timestamp: 1760796000000, message: { mid: 'mid.1', text: 'hola, precio de la BRZ 200?' } },
    { sender: { id: '17841400000' }, recipient: { id: '555001' }, timestamp: 1760796001000, message: { mid: 'mid.eco', text: 'nuestra respuesta', is_echo: true } },
    { sender: { id: '555001' }, recipient: { id: '17841400000' }, timestamp: 1760796002000, message: { mid: 'mid.2', attachments: [{ type: 'image', payload: { url: 'https://cdn.ig/x.jpg' } }] } },
    { sender: { id: '555001' }, recipient: { id: '17841400000' }, timestamp: 1760796003000, read: { mid: 'mid.out1' } } ] }] };
  const pi = meta.parsearWebhook(avisoIg);
  ok('de Instagram salen el texto y la imagen, se ignora el eco y la lectura es un estado', pi.objeto === 'instagram' && pi.mensajes.length === 2 && pi.mensajes.every(x => x.canal === 'instagram' && x.de === '555001') && pi.mensajes[0].texto === 'hola, precio de la BRZ 200?' && pi.mensajes[1].tipo === 'imagen' && pi.mensajes[1].medio.url === 'https://cdn.ig/x.jpg' && pi.estados.length === 1 && pi.estados[0].estado === 'leido' && pi.estados[0].para === '555001');
  let B = armar();
  const sv = ventas.armarVentas({ instrucciones: B.deps.cfg.instruccionesVentas, motos: B.catalogo.motos, cond: B.catalogo.cond, sedes: B.catalogo.sedes, hoy: HOY, nombrePerfil: 'Luis', usuario: 'luisperez.ve' });
  const plan = Cat.calcPlan(1750, 12, 0.4, Cat.condValidas(B.catalogo.cond));
  ok('el briefing de ventas lleva el catálogo con la cuota exacta de la web, la sede con ciudad, la promo y cómo solicitar', new RegExp('BRZ 200 200cc \\(Ciudad\\): precio \\$1,750 · inicial desde \\$' + plan.inicial + ' \\(40%\\) · cuota quincenal \\$' + plan.quincenal + ' a 12 meses \\(24 cuotas\\)').test(sv) && /SEDE EK Bello Monte \(Caracas\)/.test(sv) && /casco gratis/.test(sv) && /pagasi\.io\/solicitar/.test(sv) && /@luisperez\.ve/.test(sv));
  ok('...sin precio dice "por confirmar" y lo no disponible no aparece', /SBR 150: precio por confirmar/.test(sv) && !/Vieja/.test(sv));
  ok('...y no habla de cobranza ni de deudas como si fuera cliente', !/cuotas pagadas|TIENE .* VENCIDA|cobranza de Pagasi/.test(sv) && /no la trates como deudora/.test(sv));
  ok('el cerebro valida un lead y limpia el teléfono', JSON.stringify(cerebro.validar({ reply: 'ok', draft: { tipo: 'lead', nombre: 'Luis Pérez', ciudad: 'Maracay', modelo: 'BRZ 200', telefono: '0414-555.0000' }, summary: 's', handoff: true, handoffReason: 'lead' }).draft) === JSON.stringify({ tipo: 'lead', nombre: 'Luis Pérez', ciudad: 'Maracay', modelo: 'BRZ 200', telefono: '04145550000', nota: '' }) && cerebro.validar({ reply: 'x', draft: { tipo: 'lead' }, summary: '', handoff: false }).draft === null);
  let ri = await procesar.procesarMensaje(B.deps, pi.mensajes[0]);
  const convIg = B.db26._store.get('conversaciones/ig:555001');
  ok('un mensaje de Instagram crea la conversación en la 26 (área ventas) con el usuario del perfil y sin cliente ni crédito', ri.empresa === '26' && ri.canal === 'instagram' && convIg && convIg.canal === 'instagram' && convIg.area === 'ventas' && convIg.usuario === 'luisperez.ve' && convIg.nombre === 'Luis Pérez' && convIg.clienteId === '' && !convIg.cred);
  ok('...el cerebro recibió el briefing de VENTAS (catálogo, no ledger) y se respondió por Instagram', /CATÁLOGO VIGENTE/.test(B.cerebroFalso.ultimo.sistema) && !/CRÉDITO M-1/.test(B.cerebroFalso.ultimo.sistema) && B.ig.length === 1 && B.ig[0].a === '555001' && B.enviados.length === 0);
  B.cerebroFalso.respuesta = { reply: 'Listo, Luis. Un asesor te escribe.', draft: { tipo: 'lead', nombre: 'Luis Pérez', ciudad: 'Maracay', modelo: 'BRZ 200', telefono: '04145550000' }, summary: 'Quiere la BRZ 200, Maracay.', handoff: true, handoffReason: 'lead' };
  ri = await procesar.procesarMensaje(B.deps, { canal: 'instagram', metaId: 'mid.3', de: '555001', nombre: '', tipo: 'texto', texto: 'soy Luis, Maracay, 0414-5550000', medio: null, hora: AHORA });
  const lead = B.db26._store.get('leads/ig:555001');
  ok('cuando quiere comprar queda el lead (colección leads + borrador) y la conversación marcada "Quiere comprar"', ri.handoff && lead && lead.modelo === 'BRZ 200' && lead.telefono === '04145550000' && lead.estado === 'nuevo' && lead.usuario === 'luisperez.ve' && B.db26._store.get('conversaciones/ig:555001').atencion === 'lead' && B.db26._store.get('conversaciones/ig:555001').borrador.ciudad === 'Maracay');
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

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
