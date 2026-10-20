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

// En que compania esta este telefono (y que cliente es)
async function ubicar(deps, tel) {
  for (const emp of EMPRESAS) {
    const db = deps.bases[emp]; if (!db) continue;
    const d = await db.collection('indice_clientes').doc(tel).get();
    if (d.exists && d.data() && d.data().clienteId) return { empresa: emp, clienteId: String(d.data().clienteId) };
  }
  return { empresa: '26', clienteId: '' };
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
  return clienteId ? 'cobranza' : 'ventas';
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
  const area = areaDe(deps, m, u.clienteId);
  const base = { canal: 'whatsapp', area, telE164: tel, nombre: (conv && conv.nombre) || m.nombre || (ctx.cliente && ctx.cliente.nombre) || tel, clienteId: u.clienteId || (conv && conv.clienteId) || '', clienteNombre: (ctx.cliente && ctx.cliente.nombre) || (conv && conv.clienteNombre) || '',
    cred: ctx.credActivo ? ctx.credActivo.id : ((conv && conv.cred) || ''), modo: (conv && conv.modo) || 'bot', noLeidos: ((conv && conv.noLeidos) || 0) + 1, ultimoMensaje: textoLista(m), ultimoMensajeHora: entrante.hora, ultimoEntranteHora: entrante.hora, ultimoAutor: 'cliente', actualizado: ahora, empresa: u.empresa };
  if (!conv) base.creado = ahora;
  await convRef.set(base, { merge: true });
  deps.log('entrante', { canal: 'whatsapp', area, empresa: u.empresa, tipo: m.tipo, cliente: !!u.clienteId });
  if (deps.meta.marcarLeido) deps.meta.marcarLeido(m.metaId).catch(() => {});

  // VENTAS por WhatsApp: el mismo asistente que en Instagram, ya con el telefono de la persona
  if (area === 'ventas') {
    if (base.modo === 'humano') return { empresa: u.empresa, area, callado: true };
    return responderVentas(deps, { db, convRef, conv, base, canal: 'whatsapp', hoy, ahora, nombrePerfil: m.nombre, usuario: '', telefono: tel.replace('+', ''), leadId: 'wa:' + tel, empresa: u.empresa });
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
  const historial = await docs(convRef.collection('mensajes').orderBy('hora', 'asc').limit(40));
  const sistema = briefing.armar({ empresa: (deps.cfg.empresaNombre || {})[u.empresa] || 'Pagasi', cliente: ctx.cliente, creditos: ctx.creditos, instrucciones: deps.cfg.instrucciones, datosPago: deps.cfg.datosPago, hoy, nombrePerfil: m.nombre, promesa: conv && conv.borrador && conv.borrador.tipo === 'promesa' ? conv.borrador : null, comprobantesPendientes: ctx.comprobantesPendientes });
  let r;
  try { r = await deps.cerebro.pensar({ sistema, mensajes: historial }); }
  catch (e) {
    deps.log('cerebro-fallo', { error: String(e && e.message || e).slice(0, 160) });
    if (yaDisculpado(historial, ahora)) { await convRef.set({ atencion: 'error', actualizado: ahora }, { merge: true }); return { empresa: u.empresa, cerebro: 'fallo', disculpa: 'omitida' }; }
    await responder(deps, convRef, base, CORTESIA, ahora, { atencion: 'error' });
    return { empresa: u.empresa, cerebro: 'fallo' };
  }
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
    modo: (conv && conv.modo) || 'bot', noLeidos: ((conv && conv.noLeidos) || 0) + 1, ultimoMensaje: textoLista(m), ultimoMensajeHora: entrante.hora, ultimoEntranteHora: entrante.hora, ultimoAutor: 'cliente', actualizado: ahora, empresa: '26' };
  if (!conv) base.creado = ahora;
  await convRef.set(base, { merge: true });
  deps.log('entrante', { canal: 'instagram', tipo: m.tipo });
  if (deps.metaIG.marcarLeido) deps.metaIG.marcarLeido(igsid).catch(() => {});
  if (base.modo === 'humano') return { empresa: '26', canal: 'instagram', callado: true };

  return responderVentas(deps, { db, convRef, conv, base, canal: 'instagram', hoy, ahora, nombrePerfil: perfil.nombre, usuario: perfil.usuario, telefono: '', leadId: 'ig:' + igsid, empresa: '26' });
}

// El asistente de ventas (WhatsApp o Instagram): briefing con el catalogo, respuesta, y el lead
// si la persona quiere comprar. Por WhatsApp el telefono ya se sabe y queda en el lead.
async function responderVentas(deps, x) {
  const { db, convRef, conv, base, canal, hoy, ahora } = x;
  const historial = await docs(convRef.collection('mensajes').orderBy('hora', 'asc').limit(40));
  let cat = { motos: [], cond: null, sedes: [] };
  try { cat = await deps.ventas(); } catch (e) { deps.log('catalogo-fallo', { error: String(e && e.message || e).slice(0, 120) }); }
  const sistema = ventas.armarVentas({ instrucciones: deps.cfg.instruccionesVentas, motos: cat.motos, cond: cat.cond, sedes: cat.sedes, hoy, nombrePerfil: x.nombrePerfil, usuario: x.usuario, canal, telefono: x.telefono, esCliente: !!base.clienteId });
  let r;
  try { r = await deps.cerebro.pensar({ sistema, mensajes: historial }); }
  catch (e) {
    deps.log('cerebro-fallo', { canal, area: 'ventas', error: String(e && e.message || e).slice(0, 160) });
    if (yaDisculpado(historial, ahora)) { await convRef.set({ atencion: 'error', actualizado: ahora }, { merge: true }); return { empresa: x.empresa, canal, area: 'ventas', cerebro: 'fallo', disculpa: 'omitida' }; }
    await responder(deps, convRef, base, CORTESIA, ahora, { atencion: 'error' });
    return { empresa: x.empresa, canal, area: 'ventas', cerebro: 'fallo' };
  }
  const cambios = {};
  if (r.summary) cambios.resumen = r.summary;
  if (r.draft && r.draft.tipo === 'lead') {
    const previo = (conv && conv.borrador && conv.borrador.tipo === 'lead') ? conv.borrador : {};
    const lead = Object.assign({}, previo, Object.fromEntries(Object.entries(r.draft).filter(([, v]) => v)));   // lo nuevo completa lo que ya habia
    if (!lead.telefono && x.telefono) lead.telefono = x.telefono;
    cambios.borrador = lead;
    cambios.atencion = 'lead';
    await db.collection('leads').doc(x.leadId).set(Object.assign({ canal, convId: x.leadId, usuario: base.usuario || '', nombrePerfil: base.nombre || '', telE164: base.telE164 || '', clienteId: base.clienteId || '', estado: 'nuevo', creado: ahora }, lead, { actualizado: ahora, resumen: r.summary || '' }), { merge: true });
  } else if (r.handoff) cambios.atencion = RAZON_A_ATENCION[r.handoffReason] || 'pide_persona';
  await responder(deps, convRef, base, r.reply, ahora, cambios);
  return { empresa: x.empresa, canal, area: 'ventas', respondido: true, handoff: !!r.handoff || !!(r.draft && r.draft.tipo === 'lead'), draft: r.draft || null };
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
  const res = { mensajes: [], estados: [] };
  for (const m of parsed.mensajes || []) { try { res.mensajes.push(await procesarMensaje(deps, m)); } catch (e) { deps.log('mensaje-fallo', { error: String(e && e.message || e).slice(0, 160) }); res.mensajes.push({ error: true }); } }
  for (const s of parsed.estados || []) { try { res.estados.push(await procesarEstado(deps, s)); } catch (e) { res.estados.push({ error: true }); } }
  return res;
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

module.exports = { procesarAviso, procesarMensaje, procesarInstagram, procesarEstado, enviarEquipo, ubicar, contexto, areaDe, CORTESIA, ACK_COMPROBANTE, telDe };
