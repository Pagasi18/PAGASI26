/* Meta (WhatsApp Cloud API): leer lo que llega al webhook y mandar mensajes. Sin librerias:
   fetch de Node 20 contra graph.facebook.com. Todo lo que habla con Meta esta aqui, asi el
   resto se prueba con un `meta` falso.                                                    */
'use strict';
const crypto = require('crypto');
const GRAPH = 'https://graph.facebook.com/v22.0';

// Firma X-Hub-Signature-256 = sha256 HMAC del cuerpo crudo con el app secret
function firmaValida(cuerpoCrudo, cabecera, appSecret) {
  if (!appSecret || appSecret === 'pendiente') return false;   // sin el secreto real de Meta no entra nada
  if (!cabecera || typeof cabecera !== 'string' || !cabecera.startsWith('sha256=')) return false;
  const esperada = 'sha256=' + crypto.createHmac('sha256', appSecret).update(cuerpoCrudo).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(esperada), Buffer.from(cabecera)); } catch (e) { return false; }
}

// Verificacion del webhook (GET): Meta manda hub.mode, hub.verify_token y hub.challenge
function verificacion(query, verifyToken) {
  if (!query) return null;
  if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === verifyToken && query['hub.challenge']) return String(query['hub.challenge']);
  return null;
}

// Instagram (mensajes directos): entry[].messaging[] con sender/recipient, message{mid,text,
// attachments}, read{mid}. Los "echo" son nuestros propios mensajes devueltos: se ignoran.
function parsearInstagram(cuerpo) {
  const mensajes = [], estados = [], comentarios = [];
  (cuerpo.entry || []).forEach(entry => {
    // Comentarios en las publicaciones (campo 'comments' del webhook de Instagram)
    (entry.changes || []).forEach(ch => {
      if (!ch || ch.field !== 'comments' || !ch.value || !ch.value.id) return;
      const v = ch.value;
      comentarios.push({ canal: 'instagram', comentarioId: String(v.id), texto: String(v.text || ''), de: v.from && v.from.id ? String(v.from.id) : '', usuario: (v.from && v.from.username) || '',
        mediaId: v.media && v.media.id ? String(v.media.id) : '', tipoMedia: (v.media && v.media.media_product_type) || '', parentId: v.parent_id ? String(v.parent_id) : '',
        hora: entry.time ? new Date(entry.time > 1e12 ? entry.time : entry.time * 1000).toISOString() : new Date().toISOString(), cuentaNegocio: entry.id ? String(entry.id) : '' });
    });
    [].concat(entry.messaging || [], entry.standby || []).forEach(ev => {
      if (!ev || !ev.sender || !ev.sender.id) return;
      const hora = ev.timestamp ? new Date(ev.timestamp > 1e12 ? ev.timestamp : ev.timestamp * 1000).toISOString() : new Date().toISOString();
      const m = ev.message;
      if (m && m.mid && !m.is_echo && !m.is_deleted) {
        const adj = Array.isArray(m.attachments) && m.attachments[0] ? m.attachments[0] : null;
        const tipoAdj = adj ? (adj.type === 'image' ? 'imagen' : adj.type === 'audio' ? 'audio' : adj.type === 'video' ? 'video' : 'adjunto') : null;
        const texto = m.text || (adj && adj.type === 'share' && adj.payload && adj.payload.title) || '';
        mensajes.push({ canal: 'instagram', metaId: m.mid, de: String(ev.sender.id), nombre: '', tipo: m.text ? 'texto' : (tipoAdj || (m.is_unsupported ? 'adjunto' : 'texto')), texto,
          medio: adj && adj.payload && adj.payload.url ? { url: adj.payload.url, mime: '', tipoMeta: adj.type } : null, hora, cuentaNegocio: ev.recipient && ev.recipient.id ? String(ev.recipient.id) : '' });
      } else if (ev.postback && ev.postback.mid) {
        mensajes.push({ canal: 'instagram', metaId: ev.postback.mid, de: String(ev.sender.id), nombre: '', tipo: 'texto', texto: ev.postback.title || ev.postback.payload || '', medio: null, hora, cuentaNegocio: ev.recipient && ev.recipient.id ? String(ev.recipient.id) : '' });
      }
      if (ev.read && ev.read.mid) estados.push({ canal: 'instagram', metaId: ev.read.mid, estado: 'leido', error: '', para: String(ev.sender.id), hora });
    });
  });
  return { mensajes, estados, comentarios, objeto: 'instagram' };
}

// Del aviso crudo salen mensajes y estados, planos, sin perder de que numero vinieron
function parsearWebhook(cuerpo) {
  const mensajes = [], estados = [];
  if (cuerpo && cuerpo.object === 'instagram' && Array.isArray(cuerpo.entry)) return parsearInstagram(cuerpo);
  if (!cuerpo || cuerpo.object !== 'whatsapp_business_account' || !Array.isArray(cuerpo.entry)) return { mensajes, estados, objeto: cuerpo && cuerpo.object };
  cuerpo.entry.forEach(entry => {
    (entry.changes || []).forEach(ch => {
      const v = ch.value || {};
      if (ch.field !== 'messages') return;
      const perfil = {};
      (v.contacts || []).forEach(c => { if (c && c.wa_id) perfil[c.wa_id] = (c.profile && c.profile.name) || ''; });
      (v.messages || []).forEach(m => {
        if (!m || !m.id) return;
        const tipo = m.type || 'desconocido';
        let texto = '';
        if (tipo === 'text') texto = (m.text && m.text.body) || '';
        else if (tipo === 'button') texto = (m.button && m.button.text) || '';
        else if (tipo === 'interactive') texto = (m.interactive && ((m.interactive.button_reply && m.interactive.button_reply.title) || (m.interactive.list_reply && m.interactive.list_reply.title))) || '';
        else if (tipo === 'image' || tipo === 'document' || tipo === 'audio' || tipo === 'video' || tipo === 'sticker') texto = (m[tipo] && m[tipo].caption) || '';
        const medio = ['image', 'document', 'audio', 'video', 'sticker'].includes(tipo) && m[tipo] ? { id: m[tipo].id, mime: m[tipo].mime_type || '', nombre: m[tipo].filename || '' } : null;
        mensajes.push({ canal: 'whatsapp', metaId: m.id, de: m.from, nombre: perfil[m.from] || '', tipo: tipo === 'text' || tipo === 'button' || tipo === 'interactive' ? 'texto' : tipo === 'image' ? 'imagen' : tipo === 'document' ? 'documento' : tipo === 'audio' ? 'audio' : tipo, texto, medio,
          hora: m.timestamp ? new Date(parseInt(m.timestamp, 10) * 1000).toISOString() : new Date().toISOString(), telefonoNegocio: (v.metadata && v.metadata.display_phone_number) || '' });
      });
      (v.statuses || []).forEach(s => {
        if (!s || !s.id) return;
        const estado = s.status === 'sent' ? 'enviado' : s.status === 'delivered' ? 'entregado' : s.status === 'read' ? 'leido' : s.status === 'failed' ? 'fallo' : s.status;
        const err = Array.isArray(s.errors) && s.errors[0] ? (s.errors[0].title || '') + (s.errors[0].code ? ' (' + s.errors[0].code + ')' : '') : '';
        estados.push({ canal: 'whatsapp', metaId: s.id, estado, error: err, para: s.recipient_id || '', hora: s.timestamp ? new Date(parseInt(s.timestamp, 10) * 1000).toISOString() : new Date().toISOString() });
      });
    });
  });
  return { mensajes, estados, objeto: cuerpo.object };
}

function cliente(cfg) {
  const base = `${GRAPH}/${cfg.phoneNumberId}`;
  const cab = { authorization: 'Bearer ' + cfg.accessToken, 'content-type': 'application/json' };
  async function enviar(payload) {
    const r = await fetch(base + '/messages', { method: 'POST', headers: cab, body: JSON.stringify(Object.assign({ messaging_product: 'whatsapp' }, payload)) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Meta HTTP ' + r.status)); e.code = j.error && j.error.code; throw e; }
    return (j.messages && j.messages[0] && j.messages[0].id) || '';
  }
  return {
    // Texto libre (solo dentro de la ventana de 24 h)
    enviarTexto: (para, texto) => enviar({ to: para.replace('+', ''), type: 'text', text: { body: String(texto).slice(0, 4096), preview_url: false } }),
    enviarImagen: (para, url, pie) => enviar({ to: para.replace('+', ''), type: 'image', image: Object.assign({ link: url }, pie ? { caption: String(pie).slice(0, 1024) } : {}) }),
    // Plantilla aprobada por Meta (la unica forma de escribir fuera de la ventana)
    enviarPlantilla: (para, nombre, parametros, idioma) => enviar({ to: para.replace('+', ''), type: 'template', template: { name: nombre, language: { code: idioma || 'es' }, components: parametros && parametros.length ? [{ type: 'body', parameters: parametros.map(t => ({ type: 'text', text: String(t) })) }] : [] } }),
    marcarLeido: (metaId) => enviar({ status: 'read', message_id: metaId }).catch(() => ''),
    // Un medio que mando el cliente: primero la URL temporal, despues los bytes
    async bajarMedio(mediaId) {
      const info = await (await fetch(`${GRAPH}/${mediaId}`, { headers: { authorization: 'Bearer ' + cfg.accessToken } })).json();
      if (!info || !info.url) throw new Error('Meta no devolvió la URL del medio');
      const r = await fetch(info.url, { headers: { authorization: 'Bearer ' + cfg.accessToken } });
      if (!r.ok) throw new Error('No se pudo bajar el medio (HTTP ' + r.status + ')');
      return { bytes: Buffer.from(await r.arrayBuffer()), mime: info.mime_type || r.headers.get('content-type') || 'application/octet-stream', tamano: info.file_size || 0 };
    }
  };
}

// Instagram: se manda a un IGSID con el token de la PAGINA de Facebook ligada a la cuenta
// profesional (API de Instagram con inicio de sesion con Facebook): el envio va por /me/messages,
// donde 'me' es la pagina; POST /{accountId}/messages responde "Unsupported post request"
// (comprobado el 19-oct-2026). accountId queda para reconocer la cuenta en los avisos. Dentro de
// la ventana de 24 h va texto normal; con {humano:true} va con la etiqueta HUMAN_AGENT (hasta 7
// dias, solo personas del equipo), que Meta debe tener aprobada en la app.
function clienteInstagram(cfg) {
  const base = `${GRAPH}/me`;
  const cab = { authorization: 'Bearer ' + cfg.accessToken, 'content-type': 'application/json' };
  async function enviar(payload) {
    const r = await fetch(base + '/messages', { method: 'POST', headers: cab, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Meta HTTP ' + r.status)); e.code = j.error && j.error.code; throw e; }
    return j.message_id || '';
  }
  return {
    enviarTexto: (para, texto, op) => enviar(Object.assign({ recipient: { id: String(para) }, message: { text: String(texto).slice(0, 1000) } }, op && op.humano ? { messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' } : {})),
    marcarLeido: (para) => enviar({ recipient: { id: String(para) }, sender_action: 'mark_seen' }).catch(() => ''),
    // Respuesta publica a un comentario de una publicacion (POST /{comment-id}/replies, token de pagina)
    async responderComentario(comentarioId, texto) {
      const r = await fetch(`${GRAPH}/${comentarioId}/replies`, { method: 'POST', headers: cab, body: JSON.stringify({ message: String(texto).slice(0, 1000) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Meta HTTP ' + r.status)); e.code = j.error && j.error.code; throw e; }
      return j.id || '';
    },
    // Respuesta privada a un comentario: abre un DM con quien comento (una sola vez por comentario, 7 dias)
    async mensajePrivado(comentarioId, texto) {
      const r = await fetch(base + '/messages', { method: 'POST', headers: cab, body: JSON.stringify({ recipient: { comment_id: String(comentarioId) }, message: { text: String(texto).slice(0, 1000) } }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Meta HTTP ' + r.status)); e.code = j.error && j.error.code; throw e; }
      return { metaId: j.message_id || '', igsid: j.recipient_id ? String(j.recipient_id) : '' };
    },
    async perfil(igsid) {
      const r = await fetch(`${GRAPH}/${igsid}?fields=name,username`, { headers: { authorization: 'Bearer ' + cfg.accessToken } });
      const j = await r.json().catch(() => ({}));
      return { nombre: (j && j.name) || '', usuario: (j && j.username) || '' };
    }
  };
}

module.exports = { firmaValida, verificacion, parsearWebhook, parsearInstagram, cliente, clienteInstagram, GRAPH };
