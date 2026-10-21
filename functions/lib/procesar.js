/* Lo que pasa con cada mensaje que llega por el webhook (WhatsApp o Instagram). Todo lo externo
   entra por `deps` (bases de las dos companias, Storage, Meta, el cerebro, la hora), asi el flujo
   completo se prueba con piezas falsas (tests/t_whatsapp_webhook.js).

   WhatsApp = cobranza. La conversacion vive en la compania donde esta el cliente (el telefono se
   busca en indice_clientes de la 26 y despues de la 18); un numero que no es cliente se guarda en
   la 26. Id 'wa:' + telefono E.164.
   Instagram = ventas. Siempre en la 26 (la que vende), id 'ig:' + IGSID, sin ledger: el briefing
   es el catalogo y como solicitar; si quiere comprar queda un lead para el equipo.
   El id de cada mensaje es el id de Meta, asi un reenvio del webhook no se procesa dos veces.   */
'use strict';
const briefing = require('./briefing');
const { cedulaLimpia } = require('./cerebro');
const ventas = require('./ventas');

const EMPRESAS = ['26', '18'];
const CORTESIA = 'Disculpa, en este momento no puedo responderte bien. Un asesor de Pagasi te escribe en breve por aquí mismo.';
// Si el cerebro sigue caido (p. ej. sin saldo en Anthropic), la disculpa se manda UNA vez por
// conversacion: si el ultimo mensaje del asistente ya fue la disculpa hace menos de 12 h, no se
// repite (19-oct-2026: una persona recibio cuatro seguidas). La conversacion queda en atencion 'error'.
function yaDisculpado(historial, ahora) {
  const ult = [...(historial || [])].reverse().find(m => m && m.autor !== 'cliente' && m.direccion === 'saliente');
  return !!(ult && ult.autor === 'asistente' && ult.texto === CORTESIA && Date.parse(ahora) - Date.parse(ult.hora || 0) < 12 * 3600 * 1000);
}
const ACK_COMPROBANTE = '¡Gracias! Recibí tu comprobante y lo pasé al equipo de Pagasi para confirmarlo. En cuanto lo registren te aviso por aquí.';
const RAZON_A_ATENCION = { pide_persona: 'pide_persona', queja: 'queja', comprobante: 'comprobante', no_puede_pagar: 'pide_persona', descuento: 'pide_persona', no_cliente: 'pide_persona', lead: 'lead', otro: 'pide_persona' };

function telDe(waId) { const d = String(waId || '').replace(/\D/g, ''); return d ? '+' + d : ''; }
function extDe(mime) { return mime === 'image/png' ? 'png' : mime === 'application/pdf' ? 'pdf' : mime === 'image/webp' ? 'webp' : 'jpg'; }
function textoLista(m) { return m.texto || (m.tipo === 'imagen' ? '📷 Imagen' : m.tipo === 'audio' ? '🎤 Audio' : m.tipo === 'documento' ? '📄 Documento' : m.tipo === 'video' ? '🎬 Video' : 'Mensaje'); }

async function docs(q) { const s = await q.get(); return (s.docs || []).map(d => Object.assign({ id: d.id }, d.data())); }

// En que compania esta este telefono (y que cliente es). Primero indice_clientes; como ese indice se llena a
// mano (portal "normalizar"), tambien se busca en las fichas por telefono (21-oct-2026: 75 clientes con credito
// no estaban). Entre todas las fichas con ese telefono gana la que tiene un credito vivo.
const telClave = t => { const d = String(t || '').replace(/\D/g, ''); return d.length >= 10 ? '+58' + d.slice(-10) : ''; };
const _fichas = new WeakMap();   // base -> { t, mapa: telefono -> [clienteId] }, 10 minutos
async function fichasPorTelefono(db, forzar) {
  const c = _fichas.get(db); if (!forzar && c && Date.now() - c.t < 10 * 60 * 1000) return c.mapa;
  const mapa = new Map();
  for (const x of await docs(db.collection('clientes'))) {
    if (x.eliminado) continue;
    new Set([x.telE164, x.tel, x.wa].map(telClave).filter(Boolean)).forEach(k => { if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(String(x.id)); });
  }
  _fichas.set(db, { t: Date.now(), mapa });
  return mapa;
}
async function tieneCreditoVivo(db, clienteId) {
  return (await docs(db.collection('creditos').where('clienteId', '==', clienteId))).some(c => !c.eliminado && ['activo', 'mora'].includes(c.estado));
}
async function ubicar(deps, tel) {
  const cands = [], k = telClave(tel);
  const sumar = (empresa, clienteId) => { if (clienteId && !cands.some(x => x.empresa === empresa && x.clienteId === clienteId)) cands.push({ empresa, clienteId }); };
  for (const emp of EMPRESAS) {
    const db = deps.bases[emp]; if (!db) continue;
    const d = await db.collection('indice_clientes').doc(tel).get();
    if (d.exists && d.data() && d.data().clienteId) sumar(emp, String(d.data().clienteId));
  }
  // Con la copia en memoria (10 min); si no aparece, se vuelve a leer al momento (cliente recien creado)
  for (const forzar of [false, true]) {
    let hallados = 0;
    for (const emp of EMPRESAS) {
      const db = deps.bases[emp]; if (!db || !k) continue;
      try { const ids = (await fichasPorTelefono(db, forzar)).get(k) || []; hallados += ids.length; ids.forEach(id => sumar(emp, id)); } catch (e) { /* sin fichas: queda el indice */ }
    }
    if (hallados || !k) break;
  }
  for (const c of cands) { try { if (await tieneCreditoVivo(deps.bases[c.empresa], c.clienteId)) return c; } catch (e) { /* sigue */ } }
  return cands[0] || { empresa: '26', clienteId: '' };
}

// Ficha y creditos del cliente, ya convertidos a cifras para el briefing
async function contexto(deps, empresa, clienteId, hoy) {
  const db = deps.bases[empresa];
  if (!clienteId) return { cliente: null, creditos: [], credActivo: null, comprobantesPendientes: 0 };
  const c = await db.collection('clientes').doc(clienteId).get();
  const cliente = c.exists ? Object.assign({ id: c.id }, c.data()) : null;
  const creds = (await docs(db.collection('creditos').where('clienteId', '==', clienteId))).filter(x => !x.eliminado && !['cancelado', 'pendiente_revision'].includes(x.estado));
  const estados = [];
  for (const cr of creds) {
    const pagos = (await docs(db.collection('pagos').where('cred', '==', cr.id))).filter(p => !p.eliminado);
    const e = briefing.estadoCredito(cr, pagos, hoy);
    if (e) estados.push(e);
  }
  const vivos = estados.filter(e => !e.completado);
  const comp = (await docs(db.collection('comprobantes').where('clienteId', '==', clienteId))).filter(x => x.estado === 'pendiente').length;
  return { cliente, creditos: estados, credActivo: vivos[0] || null, comprobantesPendientes: comp };
}

// El area por WhatsApp: ventas si escribio al numero de ventas (config/asistente.numeros) o si no
// es cliente; cobranza si es cliente. Una sola conversacion por telefono: el area es la del ultimo mensaje.
function areaDe(deps, m, clienteId) {
  const d = v => String(v || '').replace(/\D/g, '').replace(/^(58|0)/, '');   // 0412-555… y 58412555… son el mismo número
  const nums = (deps.cfg && deps.cfg.numeros) || {};
  const neg = d(m.telefonoNegocio);
  if (neg && d(nums.ventas) && neg === d(nums.ventas)) return 'ventas';
  // El WhatsApp es solo de cobranza (Adam, 21-oct-2026): quien no es cliente tambien lo atiende Patricia
  return 'cobranza';
}
// El canal decide por donde se manda y a quien
function canalDe(conv) { return (conv && conv.canal) || 'whatsapp'; }
function emisor(deps, canal) { return canal === 'instagram' ? deps.metaIG : deps.meta; }
function destino(conv) { return canalDe(conv) === 'instagram' ? conv.igsid : conv.telE164; }

async function procesarMensaje(deps, m) {
  if ((m.canal || 'whatsapp') === 'instagram') return procesarInstagram(deps, m);
  const tel = telDe(m.de); if (!tel) return { saltado: 'sin-telefono' };
  const ahora = deps.ahora(), hoy = deps.hoy();
  const u = await ubicar(deps, tel);
  const db = deps.bases[u.empresa];
  const convRef = db.collection('conversaciones').doc('wa:' + tel);
  const msgRef = convRef.collection('mensajes').doc(m.metaId);
  const entrante = { metaId: m.metaId, direccion: 'entrante', autor: 'cliente', tipo: m.tipo, texto: m.texto || '', medio: m.medio ? { id: m.medio.id, mime: m.medio.mime } : null, estado: 'recibido', hora: m.hora || ahora };
  try { await msgRef.create(entrante); } catch (e) { return { saltado: 'repetido', empresa: u.empresa }; }

  const convSnap = await convRef.get();
  const conv = convSnap.exists ? convSnap.data() : null;
  const ctx = await contexto(deps, u.empresa, u.clienteId, hoy);
  // Un cliente del sistema SIN creditos (un lead que Paola anoto, o uno creado a mano) se atiende como ventas
  const area = areaDe(deps, m, (ctx.creditos && ctx.creditos.length) ? u.clienteId : '');
  const base = { canal: 'whatsapp', area, telE164: tel, nombre: (conv && conv.nombre) || m.nombre || (ctx.cliente && ctx.cliente.nombre) || tel, clienteId: u.clienteId || (conv && conv.clienteId) || '', clienteNombre: (ctx.cliente && ctx.cliente.nombre) || (conv && conv.clienteNombre) || '',
    cred: ctx.credActivo ? ctx.credActivo.id : ((conv && conv.cred) || ''), modo: (conv && conv.modo) || 'bot', noLeidos: ((conv && conv.noLeidos) || 0) + 1, ultimoMensaje: textoLista(m), ultimoMensajeHora: entrante.hora, ultimoEntranteHora: entrante.hora, ultimoEntranteId: m.metaId, ultimoAutor: 'cliente', actualizado: ahora, empresa: u.empresa };
  if (!conv) base.creado = ahora;
  await convRef.set(base, { merge: true });
  deps.log('entrante', { canal: 'whatsapp', area, empresa: u.empresa, tipo: m.tipo, cliente: !!u.clienteId });
  if (deps.meta.marcarLeido) deps.meta.marcarLeido(m.metaId).catch(() => {});

  // VENTAS por WhatsApp: el mismo asistente que en Instagram, ya con el telefono de la persona
  if (area === 'ventas') {
    if (base.modo === 'humano') return { empresa: u.empresa, area, callado: true };
    return responderVentas(deps, { db, convRef, conv, base, canal: 'whatsapp', hoy, ahora, nombrePerfil: m.nombre, usuario: '', telefono: tel.replace('+', ''), leadId: 'wa:' + tel, empresa: u.empresa, entranteId: m.metaId });
  }

  // Una imagen o un documento: posible comprobante. Se guarda y se le pasa al equipo.
  if (m.medio && (m.tipo === 'imagen' || m.tipo === 'documento')) {
    let medio = null;
    try {
      const b = await deps.meta.bajarMedio(m.medio.id);
      const ruta = 'comprobantes_whatsapp/' + tel.replace('+', '') + '/' + m.metaId + '.' + extDe(b.mime);
      const url = await deps.storage(u.empresa).subir(ruta, b.bytes, b.mime);
      medio = { url, path: ruta, mime: b.mime };
      await msgRef.set({ medio }, { merge: true });
    } catch (e) { deps.log('medio-fallo', { error: String(e && e.message || e).slice(0, 120) }); }
    if (u.clienteId && medio) {
      await db.collection('comprobantes').add({ clienteId: u.clienteId, clienteNombre: (ctx.cliente && ctx.cliente.nombre) || '', credId: ctx.credActivo ? ctx.credActivo.id : '', monto: null, fecha: hoy, metodo: 'WhatsApp', referencia: '', fotoUrl: medio.url, fotoPath: medio.path, estado: 'pendiente', origen: 'whatsapp', creadoEn: ahora, telE164: tel });
    }
    await convRef.set({ atencion: 'comprobante', actualizado: ahora }, { merge: true });
    if (base.modo === 'bot') await responder(deps, convRef, base, u.clienteId ? ACK_COMPROBANTE : 'Recibí tu imagen. ¿Me dices tu nombre y si tienes un crédito con Pagasi? Un asesor te atiende en breve.', ahora, { resumen: 'Mandó una imagen (posible comprobante).' });
    return { empresa: u.empresa, comprobante: true };
  }

  // Con una persona atendiendo, el asistente se calla
  if (base.modo === 'humano') return { empresa: u.empresa, callado: true };

  // El cerebro
  const historial = await ultimosMensajes(convRef);
  const freno = frenado(historial, ahora);
  if (freno) { deps.log('frenado', { canal: 'whatsapp', area: 'cobranza', motivo: freno }); await convRef.set({ atencion: 'revisar', actualizado: ahora }, { merge: true }); return { empresa: u.empresa, frenado: freno }; }
  const sistema = briefing.armar({ empresa: (deps.cfg.empresaNombre || {})[u.empresa] || 'Pagasi', cliente: ctx.cliente, creditos: ctx.creditos, instrucciones: deps.cfg.instrucciones, datosPago: deps.cfg.datosPago, hoy, nombrePerfil: m.nombre, promesa: conv && conv.borrador && conv.borrador.tipo === 'promesa' ? conv.borrador : null, comprobantesPendientes: ctx.comprobantesPendientes });
  let r;
  try { r = await deps.cerebro.pensar({ sistema, mensajes: historial }); }
  catch (e) {
    deps.log('cerebro-fallo', { error: String(e && e.message || e).slice(0, 160) });
    if (yaDisculpado(historial, ahora)) { await convRef.set({ atencion: 'error', actualizado: ahora }, { merge: true }); return { empresa: u.empresa, cerebro: 'fallo', disculpa: 'omitida' }; }
    await responder(deps, convRef, base, CORTESIA, ahora, { atencion: 'error' });
    return { empresa: u.empresa, cerebro: 'fallo' };
  }
  if (await llegoOtro(convRef, m.metaId)) { deps.log('rafaga', { canal: 'whatsapp', area: 'cobranza' }); return { empresa: u.empresa, rafaga: true }; }
  const cambios = {};
  if (r.summary) cambios.resumen = r.summary;
  if (r.draft && r.draft.tipo === 'promesa') cambios.borrador = r.draft;
  if (!u.clienteId) { r.handoff = true; r.handoffReason = r.handoffReason || 'no_cliente'; }
  if (r.handoff) cambios.atencion = RAZON_A_ATENCION[r.handoffReason] || 'pide_persona';
  await responder(deps, convRef, base, r.reply, ahora, cambios);
  return { empresa: u.empresa, respondido: true, handoff: !!r.handoff, draft: r.draft || null };
}

// Instagram: ventas. Siempre en la 26, sin cliente ni ledger.
async function procesarInstagram(deps, m) {
  const igsid = String(m.de || '').trim(); if (!igsid) return { saltado: 'sin-remitente' };
  if (!deps.metaIG) return { saltado: 'instagram-no-configurado' };
  const ahora = deps.ahora(), hoy = deps.hoy(), db = deps.bases['26'];
  const convRef = db.collection('conversaciones').doc('ig:' + igsid);
  const msgRef = convRef.collection('mensajes').doc(m.metaId);
  const entrante = { metaId: m.metaId, direccion: 'entrante', autor: 'cliente', tipo: m.tipo, texto: m.texto || '', medio: m.medio ? { url: m.medio.url, mime: m.medio.mime || '', tipoMeta: m.medio.tipoMeta || '' } : null, estado: 'recibido', hora: m.hora || ahora };
  try { await msgRef.create(entrante); } catch (e) { return { saltado: 'repetido', empresa: '26', canal: 'instagram' }; }

  const convSnap = await convRef.get();
  const conv = convSnap.exists ? convSnap.data() : null;
  let perfil = { nombre: (conv && conv.nombre) || '', usuario: (conv && conv.usuario) || '' };
  if (!conv || (!conv.usuario && !conv.nombre)) { try { const p = await deps.metaIG.perfil(igsid); perfil = { nombre: p.nombre || perfil.nombre, usuario: p.usuario || perfil.usuario }; } catch (e) { /* sin perfil, no pasa nada */ } }
  const base = { canal: 'instagram', area: 'ventas', igsid, usuario: perfil.usuario || '', nombre: perfil.nombre || (perfil.usuario ? '@' + perfil.usuario : 'Instagram'), telE164: '', clienteId: '', clienteNombre: '', cred: '',
    modo: (conv && conv.modo) || 'bot', noLeidos: ((conv && conv.noLeidos) || 0) + 1, ultimoMensaje: textoLista(m), ultimoMensajeHora: entrante.hora, ultimoEntranteHora: entrante.hora, ultimoEntranteId: m.metaId, ultimoAutor: 'cliente', actualizado: ahora, empresa: '26' };
  if (!conv) base.creado = ahora;
  await convRef.set(base, { merge: true });
  deps.log('entrante', { canal: 'instagram', tipo: m.tipo });
  if (deps.metaIG.marcarLeido) deps.metaIG.marcarLeido(igsid).catch(() => {});
  if (base.modo === 'humano') return { empresa: '26', canal: 'instagram', callado: true };

  return responderVentas(deps, { db, convRef, conv, base, canal: 'instagram', hoy, ahora, nombrePerfil: perfil.nombre, usuario: perfil.usuario, telefono: '', leadId: 'ig:' + igsid, empresa: '26', entranteId: m.metaId });
}

// El asistente de ventas (WhatsApp o Instagram): briefing con el catalogo, respuesta, y el lead
// si la persona quiere comprar. Por WhatsApp el telefono ya se sabe y queda en el lead.
// Enlaces (20-oct-2026): uno por conversacion y solo si lo piden. Si el modelo mete uno de mas, se
// quita la frase que lo lleva (si queda algo que decir). Lo pedido: link, página, web, fotos, formulario.
const TIENE_ENLACE = /(https?:\/\/|www\.|pagasi\.io)/i;
const PIDE_ENLACE = /link|enlace|p[aá]gina|web|foto|imagen|formulario|d[oó]nde (lo )?(lleno|relleno|aplico|solicito)|cat[aá]logo|calculadora|simular|mi cuenta|saldo/i;
function recortarEnlaces(texto, o) {
  const t = String(texto || ''); if (!TIENE_ENLACE.test(t)) return t;
  const pidio = o && o.pedido && PIDE_ENLACE.test(String(o.pedido.texto || ''));
  if (pidio && !(o && o.yaEnlace)) {
    // Lo pidio y es el primero: se deja solo el primer enlace
    let visto = false;
    return t.split(/(?<=[.!?])\s+|\n+/).filter(f => { if (!TIENE_ENLACE.test(f)) return true; if (visto) return false; visto = true; return true; }).join(' ').replace(/\s{2,}/g, ' ').trim() || t;
  }
  if (pidio) return t;   // ya hubo uno, pero lo pide otra vez: se respeta
  const sin = t.split(/(?<=[.!?])\s+|\n+/).filter(f => !TIENE_ENLACE.test(f)).join('\n').trim();
  return sin.length >= 15 ? sin : t;
}

// ¿La respuesta repite uno de los 2 últimos mensajes de Paola? (misma pregunta final o >60% de las mismas palabras)
const palabras = t => new Set(String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(w => w.length > 3));
const preguntaFinal = t => { const m = String(t || '').match(/¿[^?¿]*\?\s*$/); return m ? m[0].toLowerCase().replace(/\s+/g, ' ').trim() : ''; };
function repite(texto, historial) {
  const previos = (historial || []).filter(m => m && m.autor === 'asistente').slice(-2).map(m => m.texto || '');
  const a = palabras(texto), qa = preguntaFinal(texto);
  return previos.some(p => { if (qa && qa === preguntaFinal(p)) return true; const b = palabras(p); if (!a.size || !b.size) return false; let comun = 0; a.forEach(w => { if (b.has(w)) comun++; }); return comun / Math.min(a.size, b.size) > 0.6; });
}

// Los ÚLTIMOS mensajes de la conversación, en orden cronológico. Firestore con orderBy asc + limit da
// los PRIMEROS: con eso, pasados 40 mensajes Paola no veía lo nuevo (20-oct-2026, Liz Ospina).
async function ultimosMensajes(convRef, n) {
  const s = await docs(convRef.collection('mensajes').orderBy('hora', 'desc').limit(n || 60));
  return s.sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));
}

// Freno: Paola no manda mas de 3 mensajes en 10 minutos ni 20 en 24 horas a la misma conversacion
// (20-oct-2026: una tienda de cestas con bot mando 14 imagenes seguidas y Paola contesto las 14).
// Si se pasa, el mensaje entrante se guarda, la conversacion queda en atencion 'revisar' y se calla.
// 20-oct: con 3 y luego 8 en 10 min calló conversaciones reales que escribían rápido. Las ráfagas ya
// se contestan una sola vez (llegoOtro), así que el freno queda solo para bots que responden en bucle.
// 20-oct 11:10: una clienta real (Althea) llegó a 15 respuestas en 10 min conversando. Un bot en bucle
// va mucho más rápido (la tienda de cestas: 14 en 2 min), así que el freno mide ritmo: 10 en 3 minutos.
const FRENO = { porVentana: 10, ventanaMs: 3 * 60 * 1000, porDia: 80 };
// Ráfagas: si mientras Paola pensaba entró otro mensaje de la misma persona, esta respuesta se
// descarta; la del mensaje nuevo sale con todo el contexto. Así a 5 mensajes seguidos se contesta 1 vez.
async function llegoOtro(convRef, entranteId) {
  if (!entranteId) return false;
  try { const d = await convRef.get(); const u = d.exists ? (d.data() || {}).ultimoEntranteId : ''; return !!u && u !== entranteId; } catch (e) { return false; }
}
function frenado(historial, ahora) {
  const t = Date.parse(ahora), salientes = (historial || []).filter(m => m && m.autor === 'asistente' && m.hora);
  const ventana = salientes.filter(m => t - Date.parse(m.hora) < FRENO.ventanaMs).length;
  const dia = salientes.filter(m => t - Date.parse(m.hora) < 24 * 3600 * 1000).length;
  return ventana >= FRENO.porVentana ? 'ventana' : (dia >= FRENO.porDia ? 'dia' : '');
}
async function responderVentas(deps, x) {
  const { db, convRef, conv, base, canal, hoy, ahora } = x;
  const historial = await ultimosMensajes(convRef);
  const freno = frenado(historial, ahora);
  if (freno) {
    deps.log('frenado', { canal, area: 'ventas', motivo: freno });
    await convRef.set({ atencion: 'revisar', actualizado: ahora }, { merge: true });
    return { empresa: x.empresa, canal, area: 'ventas', frenado: freno };
  }
  let cat = { motos: [], cond: null, sedes: [] };
  try { cat = await deps.ventas(); } catch (e) { deps.log('catalogo-fallo', { error: String(e && e.message || e).slice(0, 120) }); }
  const yaEnlace = historial.some(m => m && m.autor !== 'cliente' && TIENE_ENLACE.test(String(m.texto || '')));
  const sistema = ventas.armarVentas({ instrucciones: deps.cfg.instruccionesVentas, motos: cat.motos, cond: cat.cond, sedes: cat.sedes, hoy, nombrePerfil: x.nombrePerfil, usuario: x.usuario, canal, telefono: x.telefono, esCliente: !!base.clienteId, yaEnlace });
  let r;
  try { r = await deps.cerebro.pensar({ sistema, mensajes: historial }); if (r && r.reply) r.reply = recortarEnlaces(r.reply, { yaEnlace, pedido: [...historial].reverse().find(m => m && m.autor === 'cliente') }); }
  catch (e) {
    deps.log('cerebro-fallo', { canal, area: 'ventas', error: String(e && e.message || e).slice(0, 160) });
    if (yaDisculpado(historial, ahora)) { await convRef.set({ atencion: 'error', actualizado: ahora }, { merge: true }); return { empresa: x.empresa, canal, area: 'ventas', cerebro: 'fallo', disculpa: 'omitida' }; }
    await responder(deps, convRef, base, CORTESIA, ahora, { atencion: 'error' });
    return { empresa: x.empresa, canal, area: 'ventas', cerebro: 'fallo' };
  }
  // Si repite lo que ya dijo, se le pide otra vez que atienda lo último que escribió la persona
  if (r && r.reply && repite(r.reply, historial)) {
    const ultimo = [...historial].reverse().find(m => m && m.autor === 'cliente');
    deps.log('repeticion', { canal, area: 'ventas' });
    try { const r2 = await deps.cerebro.pensar({ sistema: sistema + `\n\nATENCIÓN: tu borrador repetía tu mensaje anterior. Responde a lo último que escribió la persona («${String(ultimo && ultimo.texto || '').slice(0, 300)}») sin repetir tu pregunta anterior.`, mensajes: historial }); if (r2 && r2.reply && !repite(r2.reply, historial)) r = Object.assign(r2, { reply: recortarEnlaces(r2.reply, { yaEnlace, pedido: ultimo }) }); } catch (e) { /* se queda la primera */ }
  }
  if (await llegoOtro(convRef, x.entranteId)) { deps.log('rafaga', { canal, area: 'ventas' }); return { empresa: x.empresa, canal, area: 'ventas', rafaga: true }; }
  const cambios = {};
  if (r.summary) cambios.resumen = r.summary;
  if (r.draft && r.draft.tipo === 'lead') {
    const previo = (conv && conv.borrador && conv.borrador.tipo === 'lead') ? conv.borrador : {};
    const lead = Object.assign({}, previo, Object.fromEntries(Object.entries(r.draft).filter(([, v]) => v)));   // lo nuevo completa lo que ya habia
    if (!lead.telefono && x.telefono) lead.telefono = x.telefono;
    if (lead.cedula) lead.cedula = cedulaLimpia(lead.cedula);   // V-12345678, aunque el modelo la mande con puntos
    cambios.borrador = lead;
    cambios.atencion = 'lead';
    const clienteLead = await clienteDesdeLead(deps, db, { canal, convId: x.leadId, base, conv, lead, resumen: r.summary, ahora, motos: cat.motos });
    if (clienteLead) { cambios.clienteLead = clienteLead; lead.clienteLead = clienteLead; }
    await db.collection('leads').doc(x.leadId).set(Object.assign({ canal, convId: x.leadId, usuario: base.usuario || '', nombrePerfil: base.nombre || '', telE164: base.telE164 || '', clienteId: base.clienteId || '', estado: 'nuevo', creado: ahora }, lead, { actualizado: ahora, resumen: r.summary || '' }), { merge: true });
  } else if (r.handoff) cambios.atencion = RAZON_A_ATENCION[r.handoffReason] || 'pide_persona';
  await responder(deps, convRef, base, r.reply, ahora, cambios);
  return { empresa: x.empresa, canal, area: 'ventas', respondido: true, handoff: !!r.handoff || !!(r.draft && r.draft.tipo === 'lead'), draft: r.draft || null };
}

// El lead del chat entra a Clientes como "Lead Instagram" / "Lead WhatsApp" (estado lead, igual que
// el Lead web de la solicitud publica) en cuanto hay nombre y telefono o cedula. Si ya existe un
// cliente con esa cedula o ese telefono, no se duplica: se le anota lo del chat. Devuelve el id.
const telNacional = v => String(v || '').replace(/\D/g, '').replace(/^58/, '').replace(/^0/, '');
// Mayúsculas y sin tildes, igual que en las pantallas (assets/public/mayusculas.js; Adam, 21-oct-2026). La Ñ se queda.
const mayus = v => String(v == null ? '' : v).replace(/[ñÑ]/g, '\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0001/g, 'Ñ').toUpperCase();

async function clienteDesdeLead(deps, db, o) {
  const { canal, convId, base, ahora } = o;
  // Los datos de la persona que anotó Paola, en mayúsculas y sin tildes (el modelo y la sede se quedan como en el catálogo)
  const lead = Object.assign({}, o.lead); ['nombre', 'ciudad', 'ocupacion', 'direccion', 'fiador', 'ref1', 'ref2'].forEach(k => { if (typeof lead[k] === 'string') lead[k] = mayus(lead[k]); });
  const nombre = String(lead.nombre || '').trim();
  const nac = telNacional(lead.telefono || (base && base.telE164) || '');
  const telLocal = nac.length >= 10 ? '0' + nac : '', telE164 = nac.length >= 10 ? '+58' + nac : '';
  const ced = String(lead.cedula || '');
  if (!nombre || (!telLocal && !ced)) return (o.conv && o.conv.clienteLead) || '';
  const usuario = (base && base.usuario) || '';
  const moto = (o.motos || []).find(m => m && lead.modelo && String(m.name || m.modelo || '').toLowerCase().includes(String(lead.modelo).toLowerCase().slice(0, 12)));
  const chat = { canal, convId, usuario, modelo: lead.modelo || '', sede: lead.sede || '', ciudad: lead.ciudad || '', inicial: lead.inicial || 0, ocupacion: lead.ocupacion || '', cedula: ced, telefono: telLocal, resumen: o.resumen || '', actualizado: ahora };
  // Lo de la solicitud que Paola recoge en el chat, con los nombres de la solicitud web
  const partes = v => String(v || '').split(/\s*[·|,;]\s*/).map(x => x.trim()).filter(Boolean);
  const telDe = arr => arr.find(x => String(x).replace(/\D/g, '').length >= 10) || '';
  const ciDe = arr => arr.find(x => cedulaLimpia(x)) ? cedulaLimpia(arr.find(x => cedulaLimpia(x)) ) : '';
  const fz = partes(lead.fiador), r1 = partes(lead.ref1), r2 = partes(lead.ref2);
  const solicitud = {};
  if (lead.direccion) solicitud.dir = lead.direccion;
  if (lead.ingreso) solicitud.ingreso = lead.ingreso;
  if (lead.fiador) Object.assign(solicitud, { fiador: 'si', fiador_nom: fz[0] || '', fiador_ci: ciDe(fz), fiador_tel: telDe(fz) });
  if (lead.ref1) solicitud.ref1 = { nom: r1[0] || '', ci: '', tel: telDe(r1), rel: '', obs: 'por chat' };
  if (lead.ref2) solicitud.ref2 = { nom: r2[0] || '', ci: '', tel: telDe(r2), rel: '', obs: 'por chat' };
  const completa = !!(nombre && ced && telLocal && lead.modelo && (lead.ciudad || lead.direccion) && lead.ocupacion && lead.ingreso && lead.fiador && lead.ref1 && lead.ref2);
  const buscar = async (campo, valores) => { for (const v of valores.filter(Boolean)) { const s = await db.collection('clientes').where(campo, '==', v).limit(1).get(); if (s.docs && s.docs.length) return Object.assign({ id: s.docs[0].id }, s.docs[0].data()); } return null; };
  let ex = null;
  if (o.conv && o.conv.clienteLead) { const d = await db.collection('clientes').doc(o.conv.clienteLead).get(); if (d.exists) ex = Object.assign({ id: d.id }, d.data()); }
  if (!ex && base && base.clienteId) { const d = await db.collection('clientes').doc(base.clienteId).get(); if (d.exists) ex = Object.assign({ id: d.id }, d.data()); }
  if (!ex && ced) ex = await buscar('cedula', [ced, ced.replace('-', ''), ced.split('-')[1]]);
  if (!ex && telLocal) ex = await buscar('tel', [telLocal, telE164, '+58 ' + nac.slice(0, 3) + '-' + nac.slice(3)]);
  const origenNombre = canal === 'instagram' ? 'Lead Instagram' : 'Lead WhatsApp';
  if (ex) {
    const cambios = { lead_chat: chat, editadoEn: ahora, editadoPor: 'Paola (asistente)' };
    if (!ex.origen) cambios.origen = canal;
    if (!ex.cedula && ced) cambios.cedula = ced;
    if (!ex.tel && telLocal) cambios.tel = telLocal;
    if (!ex.ciudad && lead.ciudad) cambios.ciudad = lead.ciudad;
    if (!ex.trabajo && lead.ocupacion) cambios.trabajo = lead.ocupacion;
    if (!ex.inicial_disponible && lead.inicial) cambios.inicial_disponible = lead.inicial;
    Object.entries(solicitud).forEach(([k, v]) => { const cur = ex[k]; if (cur === undefined || cur === '' || cur === 0 || cur === 'no' || (cur && typeof cur === 'object' && !cur.nom)) cambios[k] = v; });
    if (completa) cambios.solicitud_chat_completa = true;
    if (!ex.moto_interes_modelo && lead.modelo) { cambios.moto_interes_modelo = lead.modelo; if (moto) { cambios.moto_interes_precio = +moto.precio || 0; cambios.moto_interes_sede = moto.sedeName || moto.sede || ''; } }
    await db.collection('clientes').doc(ex.id).set(cambios, { merge: true });
    return ex.id;
  }
  const id = ced ? 'WEB-' + ced.replace(/\D/g, '').replace(/^0+/, '') : (canal === 'instagram' ? 'IG-' + String(convId).replace(/^ig:/, '') : 'WA-' + telLocal);
  const notas = origenNombre + (usuario ? ' (@' + usuario + ')' : '') + ' · ' + (lead.modelo ? 'Interesado en ' + lead.modelo : 'sin moto específica') + (lead.inicial ? ' · inicial disponible $' + lead.inicial : '') + (o.resumen ? ' · ' + o.resumen : '');
  await db.collection('clientes').doc(id).set({
    nombre, cedula: ced, tel: telLocal, telE164, ciudad: lead.ciudad || '', email: '', direccion: '', trabajo: lead.ocupacion || '', notas,
    moto_interes_modelo: lead.modelo || '', moto_interes_precio: moto ? (+moto.precio || 0) : 0, moto_interes_sede: moto ? (moto.sedeName || moto.sede || '') : '', inicial_disponible: lead.inicial || 0,
    estado: 'lead', origen: canal, origen_detalle: canal === 'instagram' ? (usuario ? '@' + usuario : 'Instagram') : telLocal, conversacion: convId, lead_chat: chat, solicitud_chat_completa: completa,
    ...solicitud,
    creado: ahora, editadoEn: ahora, editadoPor: 'Paola (asistente)'
  });
  deps.log('lead-cliente', { canal, id });
  return id;
}

// Manda el texto por el canal que toque, lo guarda como mensaje del asistente y actualiza la conversacion
async function responder(deps, convRef, conv, texto, ahora, cambios) {
  let metaId = '', estado = 'enviado', error = '';
  try { metaId = await emisor(deps, canalDe(conv)).enviarTexto(destino(conv), texto); } catch (e) { estado = 'fallo'; error = String(e && e.message || e).slice(0, 160); deps.log('envio-fallo', { canal: canalDe(conv), error }); }
  const msg = { metaId, direccion: 'saliente', autor: 'asistente', tipo: 'texto', texto, estado, error, hora: ahora };
  if (metaId) await convRef.collection('mensajes').doc(metaId).set(msg); else await convRef.collection('mensajes').add(msg);
  await convRef.set(Object.assign({ ultimoMensaje: texto, ultimoMensajeHora: ahora, ultimoAutor: 'asistente', actualizado: ahora }, cambios || {}), { merge: true });
}

// Estados que manda Meta de nuestros mensajes (enviado, entregado, leido, fallo)
async function procesarEstado(deps, s) {
  const ig = s.canal === 'instagram';
  const convId = ig ? 'ig:' + String(s.para || '') : 'wa:' + telDe(s.para);
  for (const emp of ig ? ['26'] : EMPRESAS) {
    const db = deps.bases[emp]; if (!db) continue;
    const ref = db.collection('conversaciones').doc(convId).collection('mensajes').doc(s.metaId);
    const d = await ref.get();
    if (!d.exists) continue;
    const orden = { enviado: 1, entregado: 2, leido: 3, fallo: 4 };
    if ((orden[d.data().estado] || 0) > (orden[s.estado] || 0) && s.estado !== 'fallo') return { empresa: emp, ignorado: true };
    await ref.set({ estado: s.estado, error: s.error || '' }, { merge: true });
    return { empresa: emp, actualizado: true };
  }
  return { ignorado: true };
}

async function procesarAviso(deps, parsed) {
  const res = { mensajes: [], estados: [], comentarios: [] };
  for (const c of parsed.comentarios || []) { try { res.comentarios.push(await procesarComentario(deps, c)); } catch (e) { deps.log('comentario-fallo', { error: String(e && e.message || e).slice(0, 160) }); res.comentarios.push({ error: true }); } }
  for (const m of parsed.mensajes || []) { try { res.mensajes.push(await procesarMensaje(deps, m)); } catch (e) { deps.log('mensaje-fallo', { error: String(e && e.message || e).slice(0, 160) }); res.mensajes.push({ error: true }); } }
  for (const s of parsed.estados || []) { try { res.estados.push(await procesarEstado(deps, s)); } catch (e) { res.estados.push({ error: true }); } }
  return res;
}

// Un comentario en una publicacion de Instagram: Paola contesta en publico (corto, sin listas) y, si
// es una pregunta o un reclamo, tambien por privado (abre el DM). Se guarda en comentarios_ig.
const PREGUNTA = /\?|precio|cuota|inicial|cuánto|cuanto|requisit|cómo|como|dónde|donde|sede|quiero|info|financ|crédito|credito|disponib|tienen|hay /i;
const RECLAMO = /nadie|nunca (me )?(respond|contest)|no (me )?(respond|contest)|no obtengo|sin respuesta|estafa|mentira|engaño|queja|reclamo|pésim|pesim|malo|mal servicio|llevo .* (d[ií]as|semanas)|esperando/i;
// Tope por persona en comentarios: 2 respuestas públicas y 1 privada cada 24 h (una misma persona
// dejó 5 comentarios iguales en 3 publicaciones y Paola le habría contestado 10 veces).
const TOPE_COMENTARIOS = { publicos: 2, privados: 1 };
async function contarComentarios(db, usuario, ahora) {
  if (!usuario) return { publicos: 0, privados: 0 };
  const s = await db.collection('comentarios_ig').where('usuario', '==', usuario).get();
  const t = Date.parse(ahora), dia = 24 * 3600 * 1000; let publicos = 0, privados = 0;
  (s.docs || []).forEach(d => { const x = d.data() || {}; if (x.estado === 'respondido' && x.respondidoEn && t - Date.parse(x.respondidoEn) < dia) publicos++; if (x.privado && x.privado.enviado && x.respondidoEn && t - Date.parse(x.respondidoEn) < dia) privados++; });
  return { publicos, privados };
}
async function procesarComentario(deps, c) {
  if (!deps.metaIG) return { saltado: 'instagram-no-configurado' };
  const db = deps.bases['26'], ahora = deps.ahora(), hoy = deps.hoy();
  const propio = (deps.instagramId && c.de === String(deps.instagramId)) || (deps.cfg && deps.cfg.instagram && c.usuario && c.usuario.toLowerCase() === String(deps.cfg.instagram).replace(/^@/, '').toLowerCase());
  if (propio) return { saltado: 'propio', comentarioId: c.comentarioId };
  if (c.parentId) return { saltado: 'respuesta-a-respuesta', comentarioId: c.comentarioId };
  const ref = db.collection('comentarios_ig').doc(c.comentarioId);
  try { await ref.create({ comentarioId: c.comentarioId, mediaId: c.mediaId, tipoMedia: c.tipoMedia, de: c.de, usuario: c.usuario, texto: c.texto, hora: c.hora, creado: ahora, estado: 'nuevo' }); } catch (e) { return { saltado: 'repetido', comentarioId: c.comentarioId }; }
  const texto = String(c.texto || '').trim();
  if (!texto || /^[\s\p{Emoji}\p{P}]+$/u.test(texto)) { await ref.set({ estado: 'sin-respuesta', motivo: 'solo emoji o vacío' }, { merge: true }); return { comentarioId: c.comentarioId, respondido: false, motivo: 'vacio' }; }
  const esReclamo = RECLAMO.test(texto), esPregunta = PREGUNTA.test(texto);
  const cuenta = await contarComentarios(db, c.usuario, ahora);
  if (cuenta.publicos >= TOPE_COMENTARIOS.publicos) { await ref.set({ estado: 'sin-respuesta', motivo: 'tope: ya se le respondió ' + cuenta.publicos + ' veces hoy', reclamo: esReclamo }, { merge: true }); return { comentarioId: c.comentarioId, respondido: false, motivo: 'tope-usuario' }; }
  let cat = { motos: [], cond: null, sedes: [] };
  try { cat = await deps.ventas(); } catch (e) { /* sin catalogo, Paola invita al DM */ }
  const instrucciones = `COMENTARIO PÚBLICO: la persona (@${c.usuario || 'alguien'}) comentó en una publicación de Instagram de Pagasi. Tu respuesta se publica debajo del comentario, la ve todo el mundo. Máximo 25 palabras, UNA frase o dos, sin listas, sin saludo largo, sin emojis. Si pregunta por un modelo concreto: precio y cuota en una línea. Si pregunta en general: una respuesta directa y "escríbeme por mensaje directo y te paso todo". Si es un reclamo o queja: disculpa en una línea y "te escribo por privado ahora mismo". Si es spam, otro negocio, una burla o no tiene nada que responder: reply exactamente "NO_RESPONDER". No pidas datos personales en público. NO saludes ni te presentes (en comentarios nunca va "Hola, soy Paola"): empieza directo por la respuesta, en UNA sola línea.`;
  const sistema = ventas.armarVentas({ instrucciones, motos: cat.motos, cond: cat.cond, sedes: cat.sedes, hoy, nombrePerfil: '', usuario: c.usuario, canal: 'instagram', telefono: '', esCliente: false });
  let r;
  try { r = await deps.cerebro.pensar({ sistema, mensajes: [{ autor: 'cliente', direccion: 'entrante', texto, hora: c.hora }] }); }
  catch (e) { deps.log('cerebro-fallo', { canal: 'instagram', area: 'comentario', error: String(e && e.message || e).slice(0, 160) }); await ref.set({ estado: 'fallo', error: String(e && e.message || e).slice(0, 200) }, { merge: true }); return { comentarioId: c.comentarioId, respondido: false, error: 'cerebro' }; }
  const respuesta = String(r.reply || '').replace(/^\s*hola[^.!\n]*(soy paola[^.!\n]*)?[.!]\s*/i, '').replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 240);
  if (!respuesta || /^NO_RESPONDER/i.test(respuesta)) { await ref.set({ estado: 'sin-respuesta', motivo: 'Paola decidió no responder', resumen: r.summary || '' }, { merge: true }); return { comentarioId: c.comentarioId, respondido: false, motivo: 'no-responder' }; }
  let respuestaId = '', error = '';
  try { respuestaId = await deps.metaIG.responderComentario(c.comentarioId, respuesta); } catch (e) { error = String(e && e.message || e).slice(0, 200); deps.log('comentario-envio-fallo', { error }); }
  const salida = { estado: error ? 'fallo' : 'respondido', respuesta, respuestaId, error, resumen: r.summary || '', reclamo: esReclamo, respondidoEn: ahora };
  // Privado: si pregunta o reclama, se le abre el DM; el hilo sigue como cualquier conversacion de Instagram
  if ((esPregunta || esReclamo) && !error && cuenta.privados < TOPE_COMENTARIOS.privados) {
    const privado = esReclamo
      ? 'Hola, soy Paola, de Pagasi. Vi tu comentario y quiero resolverlo: cuéntame por aquí qué pasó y con quién hablaste, y lo escalo hoy mismo al equipo.'
      : 'Hola 👋 Soy Paola, asesora comercial de Pagasi. Vi tu comentario en la publicación; por aquí te paso precios, cuotas y la solicitud. ¿Qué moto te interesa o en qué ciudad estás?';
    try {
      const p = await deps.metaIG.mensajePrivado(c.comentarioId, privado);
      salida.privado = { enviado: true, metaId: p.metaId, igsid: p.igsid };
      if (p.igsid) {
        const convRef = db.collection('conversaciones').doc('ig:' + p.igsid);
        const conv = await convRef.get();
        await convRef.set(Object.assign({ canal: 'instagram', area: 'ventas', igsid: p.igsid, usuario: c.usuario || '', nombre: (conv.exists && conv.data().nombre) || (c.usuario ? '@' + c.usuario : 'Instagram'), modo: (conv.exists && conv.data().modo) || 'bot', ultimoMensaje: privado, ultimoMensajeHora: ahora, ultimoAutor: 'asistente', actualizado: ahora, empresa: '26', origenComentario: c.comentarioId }, conv.exists ? {} : { creado: ahora, noLeidos: 0 }, esReclamo ? { atencion: 'queja' } : {}), { merge: true });
        await convRef.collection('mensajes').doc(p.metaId || ('cm-' + c.comentarioId)).set({ metaId: p.metaId, direccion: 'saliente', autor: 'asistente', tipo: 'texto', texto: privado, estado: 'enviado', error: '', hora: ahora, desdeComentario: c.comentarioId });
      }
    } catch (e) { salida.privado = { enviado: false, error: String(e && e.message || e).slice(0, 200) }; }
  }
  await ref.set(salida, { merge: true });
  deps.log('comentario', { usuario: c.usuario, respondido: !error, privado: !!(salida.privado && salida.privado.enviado), reclamo: esReclamo });
  return { comentarioId: c.comentarioId, respondido: !error, privado: !!(salida.privado && salida.privado.enviado), reclamo: esReclamo };
}

// El equipo escribe desde el panel. WhatsApp: solo dentro de la ventana de 24 h de Meta.
// Instagram: dentro de la ventana va normal; hasta 7 dias despues va como agente humano.
async function enviarEquipo(deps, { empresa, convId, texto, por }) {
  const db = deps.bases[empresa]; if (!db) throw Object.assign(new Error('Compañía desconocida'), { codigo: 'empresa' });
  texto = String(texto || '').trim(); if (!texto) throw Object.assign(new Error('Sin texto'), { codigo: 'texto' });
  const ref = db.collection('conversaciones').doc(convId);
  const d = await ref.get(); if (!d.exists) throw Object.assign(new Error('Conversación no encontrada'), { codigo: 'conversacion' });
  const conv = d.data(), ahora = deps.ahora(), canal = canalDe(conv);
  const desde = conv.ultimoEntranteHora ? Date.parse(ahora) - Date.parse(conv.ultimoEntranteHora) : Infinity;
  const limite = canal === 'instagram' ? 7 * 24 : 24;
  if (desde >= limite * 3600 * 1000) throw Object.assign(new Error(canal === 'instagram' ? 'Pasaron más de 7 días desde el último mensaje de la persona: hay que esperar a que vuelva a escribir.' : 'La ventana de 24 horas está cerrada: solo se puede escribir cuando el cliente vuelva a escribir.'), { codigo: 'ventana' });
  const em = emisor(deps, canal); if (!em) throw Object.assign(new Error('Ese canal no está configurado'), { codigo: 'canal' });
  const metaId = await em.enviarTexto(destino(conv), texto, { humano: canal === 'instagram' && desde >= 24 * 3600 * 1000 });
  const msg = { metaId, direccion: 'saliente', autor: 'equipo', tipo: 'texto', texto, estado: 'enviado', error: '', hora: ahora, por: por || 'Equipo' };
  await ref.collection('mensajes').doc(metaId || ('eq-' + Date.now())).set(msg);
  await ref.set({ modo: 'humano', atendidoPor: por || 'Equipo', ultimoMensaje: texto, ultimoMensajeHora: ahora, ultimoAutor: 'equipo', actualizado: ahora }, { merge: true });
  return { metaId };
}

module.exports = { mayus, procesarAviso, procesarMensaje, procesarInstagram, procesarComentario, procesarEstado, enviarEquipo, ubicar, telClave, contexto, areaDe, clienteDesdeLead, frenado, FRENO, llegoOtro, ultimosMensajes, repite, recortarEnlaces, CORTESIA, ACK_COMPROBANTE, telDe };
