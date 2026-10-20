/* Cloud Functions (proyecto pagasi26-65ced, region us-east1) — Cobranza por WhatsApp.
     whatsappWebhook   GET: verificacion de Meta · POST: aviso de Meta, de WhatsApp (cobranza) o de
                       Instagram (ventas): se guarda crudo, se responde 200 y se procesa ·
                       POST /equipo: el panel manda un mensaje como equipo por el canal que toque.
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
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');
const meta = require('./lib/meta');
const cerebro = require('./lib/cerebro');
const procesar = require('./lib/procesar');
const recordatorios = require('./lib/recordatorios');

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
  const d = await bases['26'].collection('config').doc('asistente').get();
  const c = d.exists ? d.data() : {};
  return { instrucciones: c.instrucciones || '', instruccionesVentas: c.instruccionesVentas || '', datosPago: c.datosPago || '', plantillas: c.plantillas || {}, empresaNombre: { '18': 'PAGASI 18', '26': 'PAGASI 26' }, conectado: !!c.conectado, recordatorios: c.recordatorios !== false };
}
// Lo que necesita el asistente de ventas (Instagram): el catalogo de pagasi.io y las sedes de la 26
async function catalogoVentas() {
  const [cat, conc] = await Promise.all([bases['26'].collection('catalogo').get(), bases['26'].collection('concesionarios').get()]);
  let cond = null; const motos = [];
  cat.docs.forEach(d => { const x = d.data() || {}; if (d.id === '_condiciones') cond = x; else motos.push(Object.assign({ id: d.id }, x)); });
  const sedes = conc.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(c => c && c.activo !== false && !c.eliminado).map(c => ({ nombre: c.nombre || '', ciudad: c.ciudad || '', direccion: c.direccion || '' }));
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
  return { bases, storage: storageDe, meta: m, metaIG: ig, ventas: catalogoVentas, cfg, ahora: () => new Date().toISOString(), hoy: hoyCaracas, log: (q, d) => logger.info(q, d || {}),
    cerebro: { pensar: ({ sistema, mensajes }) => cerebro.pensar({ apiKey: sec(ANTHROPIC), sistema, mensajes }) } };
}

// Quien escribe desde el panel: su token de Firebase (de la 26 o de la 18) y su ficha en /usuarios
async function quienEscribe(req) {
  // Detrás de la puerta pública (API Gateway) el Authorization original del panel llega en
  // X-Forwarded-Authorization; directo a Cloud Run, en Authorization.
  const h = String(req.headers['x-forwarded-authorization'] || req.headers.authorization || ''); const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  for (const emp of ['26', '18']) {
    try {
      const dec = await getAuth(apps[emp]).verifyIdToken(tok);
      const u = await bases[emp].collection('usuarios').doc(dec.uid).get();
      if (u.exists && u.data().rol !== 'Aliado' && u.data().suspendido !== true && u.data().eliminado !== true) return { empresa: emp, uid: dec.uid, nombre: u.data().nombre || dec.email || 'Equipo' };
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

  // El panel: POST /equipo { empresa, conv, texto }
  if (/\/equipo\/?$/.test(req.path || '')) {
    const quien = await quienEscribe(req);
    if (!quien) return res.status(401).json({ error: 'Sin sesión del sistema' });
    try {
      const cfg = await cfgAsistente();
      const r = await procesar.enviarEquipo(armarDeps(cfg), { empresa: String((req.body || {}).empresa || quien.empresa), convId: String((req.body || {}).conv || ''), texto: (req.body || {}).texto, por: quien.nombre });
      return res.status(200).json({ ok: true, metaId: r.metaId });
    } catch (e) { return res.status(e.codigo === 'ventana' ? 409 : 400).json({ error: e.message, codigo: e.codigo || '' }); }
  }

  // El aviso de Meta: firma, guardar crudo, responder, procesar
  const crudo = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
  const secreto = sec(APP_SECRET) || '';
  if (!secreto || secreto === 'pendiente') { logger.warn('falta WHATSAPP_APP_SECRET: el aviso se rechaza'); return res.status(401).send('falta el secreto de la app'); }
  if (!meta.firmaValida(crudo, req.headers['x-hub-signature-256'], secreto)) { logger.warn('firma inválida'); return res.status(401).send('firma inválida'); }
  const cuerpo = req.body || {};
  const parsed = meta.parsearWebhook(cuerpo);
  const avisoRef = bases['26'].collection('webhooks_meta').doc();
  await avisoRef.set({ recibido: new Date().toISOString(), objeto: parsed.objeto || '', mensajes: parsed.mensajes.length, estados: parsed.estados.length, crudo: crudo.slice(0, 200000) }).catch(() => {});
  if (!parsed.mensajes.length && !parsed.estados.length) return res.status(200).send('EVENT_RECEIVED');
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
