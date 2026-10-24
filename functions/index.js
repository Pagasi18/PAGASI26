/* Cloud Functions (proyecto pagasi26-65ced, region us-east1) — Cobranza por WhatsApp.
     whatsappWebhook   GET: verificacion de Meta · POST: aviso de Meta, de WhatsApp (cobranza) o de
                       Instagram (ventas): se guarda crudo, se responde 200 y se procesa ·
                       POST /equipo: el panel manda un mensaje como equipo por el canal que toque ·
                       POST /aliados: un administrador crea el acceso de un aliado o le cambia la clave.
     recordatoriosWhatsApp  todos los dias 8:30 am (Caracas): las plantillas de cuotas.
   Secretos (firebase functions:secrets:set): WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN,
   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET, ANTHROPIC_API_KEY; y para los mensajes de
   Instagram (ventas, misma app de Meta y mismo webhook): INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID.
   Las dos companias: la app por defecto es la 26; la 18 se abre con su projectId (la cuenta de
   servicio de las funciones tiene datastore.user en pagasi-v2).                            */
'use strict';
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');
const meta = require('./lib/meta');
const cerebro = require('./lib/cerebro');
const procesar = require('./lib/procesar');
const recordatorios = require('./lib/recordatorios');
const metricas = require('./lib/metricas');
const aliados = require('./lib/aliados');

const VERIFY = defineSecret('WHATSAPP_VERIFY_TOKEN');
const TOKEN = defineSecret('WHATSAPP_ACCESS_TOKEN');
const PHONE_ID = defineSecret('WHATSAPP_PHONE_NUMBER_ID');
const APP_SECRET = defineSecret('WHATSAPP_APP_SECRET');
const ANTHROPIC = defineSecret('ANTHROPIC_API_KEY');
const IG_TOKEN = defineSecret('INSTAGRAM_ACCESS_TOKEN');
const IG_CUENTA = defineSecret('INSTAGRAM_ACCOUNT_ID');
const PROYECTOS = { '26': 'pagasi26-65ced', '18': 'pagasi-v2' };
const BUCKETS = { '26': 'pagasi26-65ced.firebasestorage.app', '18': 'pagasi-v2.firebasestorage.app' };
// El valor limpio de un secreto: 'echo valor | firebase functions:secrets:set' guarda un salto de
// linea al final (paso con WHATSAPP_VERIFY_TOKEN, 19-oct-2026) y Meta compara el token exacto.
const sec = p => String(p.value() || '').trim();

const app26 = getApps().find(a => a.name === '[DEFAULT]') || initializeApp({ projectId: PROYECTOS['26'], storageBucket: BUCKETS['26'] });
const app18 = getApps().find(a => a.name === 'p18') || initializeApp({ projectId: PROYECTOS['18'], storageBucket: BUCKETS['18'] }, 'p18');
const apps = { '26': app26, '18': app18 };
const bases = { '26': getFirestore(app26), '18': getFirestore(app18) };

function hoyCaracas() { return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10); }
async function cfgAsistente() {
  // config/tasa: la tasa del euro BCV que guarda el panel cada día (bolívares a tasa euro, Adam 21-oct-2026)
  const [d, t] = await Promise.all([bases['26'].collection('config').doc('asistente').get(), bases['26'].collection('config').doc('tasa').get().catch(() => null)]);
  const c = d.exists ? d.data() : {}, tasa = t && t.exists ? t.data() : {};
  return { tasaEuro: parseFloat(tasa.tasaEuro) || 0, fechaEuro: String(tasa.fechaEuro || tasa.fechaActualizacion || '').slice(0, 10), instrucciones: c.instrucciones || '', instruccionesVentas: c.instruccionesVentas || '', datosPago: c.datosPago || '', plantillas: c.plantillas || {}, empresaNombre: { '18': 'PAGASI 18', '26': 'PAGASI 26' }, conectado: !!c.conectado, recordatorios: c.recordatorios !== false,
    // Redes sociales (22-oct-2026): donde contesta cada asistente (apagada, el mensaje llega y lo
    // atiende el equipo) y la calidad de Claude de cada una. Sin escoger, todo encendido y "normal".
    responde: Object.assign({ whatsappCobranza: true, whatsappVentas: true, instagram: true, comentariosIg: true, messenger: true, comentariosFb: true }, c.responde || {}),
    calidad: Object.assign({ cobranza: 'normal', ventas: 'normal' }, c.calidad || {}) };
}
// Lo que necesita el asistente de ventas (Instagram): el catalogo de pagasi.io y las sedes de la 26
// Modelos que cada sede ha financiado (créditos de la 26), con el precio del crédito más reciente.
// Sirve para las sedes que no tienen catálogo en la web (p. ej. EK Trujillo). Caché de 15 minutos.
let _vendidas = { t: 0, datos: {} };
async function vendidasPorSede() {
  if (Date.now() - _vendidas.t < 15 * 60 * 1000) return _vendidas.datos;
  const s = await bases['26'].collection('creditos').get();
  const datos = {};
  s.docs.map(d => d.data() || {}).filter(c => c.concesionarioId && c.modelo && +c.precio > 0 && !c.eliminado && !['cancelado', 'pendiente_revision'].includes(c.estado))
    .sort((a, b) => String(b.creado || b.fecha || '').localeCompare(String(a.creado || a.fecha || '')))
    .forEach(c => { const m = (datos[c.concesionarioId] = datos[c.concesionarioId] || {}); const k = String(c.modelo).trim().toUpperCase(); if (!m[k]) m[k] = { modelo: String(c.modelo).trim(), precio: +c.precio, n: 0 }; m[k].n++; });
  _vendidas = { t: Date.now(), datos };
  return datos;
}
async function catalogoVentas() {
  const [cat, conc] = await Promise.all([bases['26'].collection('catalogo').get(), bases['26'].collection('concesionarios').get()]);
  let cond = null; const motos = [];
  cat.docs.forEach(d => { const x = d.data() || {}; if (d.id === '_condiciones') cond = x; else motos.push(Object.assign({ id: d.id }, x)); });
  let vendidas = {}; try { vendidas = await vendidasPorSede(); } catch (e) { logger.warn('vendidas', { error: String(e && e.message || e).slice(0, 120) }); }
  const sedes = conc.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(c => c && c.activo !== false && !c.eliminado).map(c => ({ nombre: c.nombre || '', ciudad: c.ciudad || '', direccion: c.direccion || '', vendidas: Object.values(vendidas[c.id] || {}).sort((a, b) => b.n - a.n).slice(0, 12) }));
  return { motos, cond, sedes };
}
function storageDe(empresa) {
  // Se guarda con un token de descarga, igual que las fotos que sube el portal: la URL abre
  // desde el panel sin firmar nada ni dar permisos extra a la cuenta de las funciones.
  return { async subir(ruta, bytes, mime) {
    const bucket = getStorage(apps[empresa]).bucket(BUCKETS[empresa]);
    const token = crypto.randomUUID();
    await bucket.file(ruta).save(bytes, { contentType: mime, resumable: false, metadata: { cacheControl: 'private, max-age=0', metadata: { firebaseStorageDownloadTokens: token } } });
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKETS[empresa]}/o/${encodeURIComponent(ruta)}?alt=media&token=${token}`;
  } };
}
function configurado(v) { return !!v && v !== 'pendiente'; }
function armarDeps(cfg) {
  const m = meta.cliente({ accessToken: sec(TOKEN), phoneNumberId: sec(PHONE_ID) });
  const ig = configurado(sec(IG_TOKEN)) && configurado(sec(IG_CUENTA)) ? meta.clienteInstagram({ accessToken: sec(IG_TOKEN), accountId: sec(IG_CUENTA) }) : null;
  // Bajar una foto por su enlace (las de Instagram) para guardarla en Storage antes de que venza
  const bajarUrl = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return { bytes: Buffer.from(await r.arrayBuffer()), mime: String(r.headers.get('content-type') || '').split(';')[0] }; };
  return { bases, storage: storageDe, bajarUrl, meta: m, metaIG: ig, instagramId: configurado(sec(IG_CUENTA)) ? sec(IG_CUENTA) : '', ventas: catalogoVentas, cfg, ahora: () => new Date().toISOString(), hoy: hoyCaracas, log: (q, d) => logger.info(q, d || {}),
    cerebro: { pensar: async ({ sistema, mensajes, calidad, area }) => { const r = await cerebro.pensar({ apiKey: sec(ANTHROPIC), sistema, mensajes, calidad }); anotarGasto(area || 'ventas', r && r.gasto); return r; } } };
}
// Lo que gasta cada asistente por día, en config/asistenteUso de la 26 (23-oct-2026, Adam: "ya nos
// gastamos $40 en Paola y Patricia, ¿me ayudas a bajar los costos?"): así se ve el costo real en el
// panel y no un cálculo. dias.{fecha}.{ventas|cobranza}: llamadas, tokens y costo en dólares.
function anotarGasto(area, g) {
  if (!g || !g.llamadas) return;
  const inc = {}; ['llamadas', 'entrada', 'salida', 'cacheLeida', 'cacheEscrita'].forEach(k => { inc[k] = FieldValue.increment(g[k] || 0); });
  inc.costo = FieldValue.increment(Math.round((g.costo || 0) * 1e6) / 1e6);
  bases['26'].collection('config').doc('asistenteUso').set({ dias: { [hoyCaracas()]: { [area === 'cobranza' ? 'cobranza' : 'ventas']: inc } }, actualizado: new Date().toISOString() }, { merge: true }).catch(e => logger.warn('gasto no anotado', { error: String(e && e.message || e).slice(0, 120) }));
}

// Quien escribe desde el panel: su token de Firebase (de la 26 o de la 18) y su ficha en /usuarios
// Tope de mensajes del equipo por persona (auditoría del 24-oct-2026, A3): 20 por minuto en cada instancia
const _envios = new Map();
function topeEquipo(uid) { const t = Date.now(), l = (_envios.get(uid) || []).filter(x => t - x < 60000); if (l.length >= 20) return false; l.push(t); _envios.set(uid, l); return true; }
async function quienEscribe(req) {
  // Detrás de la puerta pública (API Gateway) el Authorization original del panel llega en
  // X-Forwarded-Authorization; directo a Cloud Run, en Authorization.
  const h = String(req.headers['x-forwarded-authorization'] || req.headers.authorization || ''); const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  for (const emp of ['26', '18']) {
    try {
      const dec = await getAuth(apps[emp]).verifyIdToken(tok);
      const u = await bases[emp].collection('usuarios').doc(dec.uid).get();
      if (u.exists && u.data().rol !== 'Aliado' && u.data().suspendido !== true && u.data().eliminado !== true) return { empresa: emp, uid: dec.uid, nombre: u.data().nombre || dec.email || 'Equipo', admin: ['Administrador', 'admin'].includes(u.data().rol), rol: u.data().rol || '', permisos: Array.isArray(u.data().permisos) ? u.data().permisos : [] };
    } catch (e) { /* no es de esta compania */ }
  }
  return null;
}

// invoker 'public': Meta y el panel llaman sin credenciales de Google; la seguridad es la firma
// de Meta (POST) y el token de Firebase del usuario (/equipo).
exports.whatsappWebhook = onRequest({ region: 'us-east1', invoker: 'public', secrets: [VERIFY, TOKEN, PHONE_ID, APP_SECRET, ANTHROPIC, IG_TOKEN, IG_CUENTA], memory: '512MiB', timeoutSeconds: 120, cors: true }, async (req, res) => {
  if (req.method === 'GET') {
    const reto = meta.verificacion(req.query, sec(VERIFY));
    if (reto) return res.status(200).send(reto);
    return res.status(403).send('verificacion rechazada');
  }
  if (req.method !== 'POST') return res.status(405).send('método no permitido');

  // El panel: POST /equipo { empresa, conv, texto } · { empresa, conv, accion: 'vendedor', vendedor } (Pasar a…)
  if (/\/equipo\/?$/.test(req.path || '')) {
    const quien = await quienEscribe(req);
    if (!quien) return res.status(401).json({ error: 'Sin sesión del sistema' });
    if ((req.body || {}).accion === 'vendedor') {
      try {
        const r = await procesar.cambiarVendedor({ bases, ahora: () => new Date().toISOString() }, { empresa: String((req.body || {}).empresa || quien.empresa), convId: String((req.body || {}).conv || ''), vendedor: (req.body || {}).vendedor, quien });
        return res.status(200).json(Object.assign({ ok: true }, r));
      } catch (e) { return res.status(e.codigo === 'permiso' ? 403 : 400).json({ error: e.message, codigo: e.codigo || '' }); }
    }
    // Notas internas, etapa del cliente y calificar a la asistente (24-oct-2026)
    if (['nota', 'etapa', 'calificar'].includes((req.body || {}).accion)) {
      try {
        const b = req.body || {};
        const r = await procesar.accionConversacion({ bases, ahora: () => new Date().toISOString() }, { empresa: String(b.empresa || quien.empresa), convId: String(b.conv || ''), accion: b.accion, texto: b.texto, etapa: b.etapa, msgId: b.msg, voto: b.voto, quien });
        return res.status(200).json(Object.assign({ ok: true }, r));
      } catch (e) { return res.status(e.codigo === 'permiso' ? 403 : 400).json({ error: e.message, codigo: e.codigo || '' }); }
    }
    if (!topeEquipo(quien.uid)) return res.status(429).json({ error: 'Demasiados mensajes seguidos: espera un minuto', codigo: 'tope' });
    try {
      const cfg = await cfgAsistente();
      const r = await procesar.enviarEquipo(armarDeps(cfg), { empresa: String((req.body || {}).empresa || quien.empresa), convId: String((req.body || {}).conv || ''), texto: (req.body || {}).texto, imagen: (req.body || {}).imagen, por: quien.nombre, quien });
      return res.status(200).json({ ok: true, metaId: r.metaId });
    } catch (e) { return res.status(e.codigo === 'ventana' ? 409 : e.codigo === 'permiso' ? 403 : 400).json({ error: e.message, codigo: e.codigo || '' }); }
  }

  // El panel: POST /aliados { accion: 'crear' | 'clave' | 'acceso', ... } — accesos al portal de
  // aliados. Solo un administrador (de la 26 o de la 18); las cuentas se crean siempre en la 26.
  if (/\/aliados\/?$/.test(req.path || '')) {
    const quien = await quienEscribe(req);
    if (!quien || !quien.admin) return res.status(403).json({ error: 'Solo un administrador del sistema maneja los accesos de los aliados.' });
    try {
      const r = await aliados.accion({ auth: getAuth(apps['26']), db: bases['26'], ahora: () => new Date().toISOString() }, quien, req.body || {});
      logger.info('aliados', { accion: String((req.body || {}).accion || ''), por: quien.nombre, empresa: quien.empresa });
      return res.status(200).json(r);
    } catch (e) { return res.status(e.status || 500).json({ error: e.status ? e.message : 'No se pudo: ' + String(e.message || e).slice(0, 160), codigo: e.codigo || '' }); }
  }

  // El aviso de Meta: firma, guardar crudo, responder, procesar
  const crudo = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
  const secreto = sec(APP_SECRET) || '';
  if (!secreto || secreto === 'pendiente') { logger.warn('falta WHATSAPP_APP_SECRET: el aviso se rechaza'); return res.status(401).send('falta el secreto de la app'); }
  if (!meta.firmaValida(crudo, req.headers['x-hub-signature-256'], secreto)) { logger.warn('firma inválida'); return res.status(401).send('firma inválida'); }
  const cuerpo = req.body || {};
  const parsed = meta.parsearWebhook(cuerpo);
  const avisoRef = bases['26'].collection('webhooks_meta').doc();
  const nComentarios = (parsed.comentarios || []).length;
  await avisoRef.set({ recibido: new Date().toISOString(), objeto: parsed.objeto || '', mensajes: parsed.mensajes.length, estados: parsed.estados.length, comentarios: nComentarios, crudo: crudo.slice(0, 200000) }).catch(() => {});
  if (!parsed.mensajes.length && !parsed.estados.length && !nComentarios) return res.status(200).send('EVENT_RECEIVED');
  // Se procesa ANTES de responder: Cloud Run le quita la CPU al contenedor en cuanto sale la
  // respuesta y lo que quedaba pendiente (pensar, mandar) se congelaba (19-oct-2026). Meta espera
  // la respuesta unos segundos, asi que hay un tope: si no termina en 20 s se responde igual y
  // el resto sigue como pueda.
  const inicio = Date.now();
  const trabajo = (async () => {
    try {
      const cfg = await cfgAsistente();
      const r = await procesar.procesarAviso(armarDeps(cfg), parsed);
      await avisoRef.set({ procesado: new Date().toISOString(), ms: Date.now() - inicio, resultado: JSON.stringify(r).slice(0, 4000) }, { merge: true }).catch(() => {});
    } catch (e) { logger.error('procesar', e); await avisoRef.set({ error: String(e && e.message || e).slice(0, 500), ms: Date.now() - inicio }, { merge: true }).catch(() => {}); }
  })();
  await Promise.race([trabajo, new Promise(ok => setTimeout(ok, 20000))]);
  res.status(200).send('EVENT_RECEIVED');
});

exports.recordatoriosWhatsApp = onSchedule({ schedule: '30 8 * * *', timeZone: 'America/Caracas', region: 'us-east1', secrets: [TOKEN, PHONE_ID], memory: '1GiB', timeoutSeconds: 540 }, async () => {
  const cfg = await cfgAsistente();
  if (!cfg.conectado) { logger.info('recordatorios: Meta no está conectado, no se manda nada'); return; }
  // Interruptor aparte (config/asistente.recordatorios === false): el numero puede estar conectado
  // para conversar sin que salgan todavia las plantillas de cuotas (hace falta metodo de pago en la
  // cuenta de WhatsApp y el OK de Adam para escribirle a toda la cartera).
  if (!cfg.recordatorios) { logger.info('recordatorios: apagados en config/asistente (recordatorios=false)'); return; }
  const r = await recordatorios.correr(armarDeps(cfg), { plantillas: cfg.plantillas });
  logger.info('recordatorios', { resultado: r });
  await bases['26'].collection('recordatorios_corridas').add({ hoy: hoyCaracas(), corrido: new Date().toISOString(), resultado: r }).catch(() => {});
});

// Métricas de Instagram para Redes sociales (22-oct-2026): seguidores, publicaciones y los "me gusta"
// y comentarios de cada una, cada 2 horas, en config/redesMetricas de la 26 (lo lee el personal; son
// datos públicos de la cuenta). seguidoresDias guarda un número por día para ver cómo crece.
// Seguimiento automático de Paola (24-oct-2026): cada hora de 9 am a 7 pm. Solo manda si está encendido en
// config/asistente.seguimiento (ventana de Paola).
exports.seguimientoVentas = onSchedule({ schedule: '10 9-19 * * *', timeZone: 'America/Caracas', region: 'us-east1', secrets: [TOKEN, PHONE_ID, IG_TOKEN, IG_CUENTA], memory: '512MiB', timeoutSeconds: 300 }, async () => {
  const cfg = await cfgAsistente();
  const r = await procesar.seguimientoVentas(armarDeps(cfg));
  logger.info('seguimiento', { resultado: r });
});

exports.metricasRedes = onSchedule({ schedule: '15 */2 * * *', timeZone: 'America/Caracas', region: 'us-east1', secrets: [IG_TOKEN, IG_CUENTA], memory: '256MiB', timeoutSeconds: 120 }, async () => {
  const tok = sec(IG_TOKEN), cuenta = sec(IG_CUENTA);
  if (!configurado(tok) || !configurado(cuenta)) { logger.info('metricas: Instagram no está configurado'); return; }
  const ig = await metricas.instagram(fetch, { token: tok, cuenta });
  await bases['26'].collection('config').doc('redesMetricas').set({ instagram: ig, seguidoresDias: { [hoyCaracas()]: ig.seguidores }, actualizado: new Date().toISOString() }, { merge: true });
  logger.info('metricas', { seguidores: ig.seguidores, posts: ig.posts.length });
});
