/* El cerebro: una llamada directa a la API de Anthropic (claude-sonnet-5-5) con una herramienta
   que devuelve la respuesta estructurada. Sin SDK: fetch. Si algo falla, quien llama responde
   una frase de cortesia y marca la conversacion para una persona.                         */
'use strict';
const MODELO = 'claude-sonnet-5-5';
const URL = 'https://api.anthropic.com/v1/messages';

const HERRAMIENTA = {
  name: 'responder',
  description: 'Entrega la respuesta al cliente y lo que hay que anotar en el sistema.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'Lo que se le manda al cliente por WhatsApp, en español de Venezuela, corto.' },
      draft: { type: ['object', 'null'], description: 'Lo que hay que anotar: una promesa de pago (cobranza) si el cliente dijo cuándo paga, o un lead (ventas) si la persona quiere que la contacten o dio sus datos; si no hay nada, null.',
        properties: { tipo: { type: 'string', enum: ['promesa', 'lead'] }, fecha: { type: 'string', description: 'promesa: AAAA-MM-DD' }, monto: { type: 'number' }, nota: { type: 'string' },
          nombre: { type: 'string', description: 'lead: nombre de la persona' }, ciudad: { type: 'string' }, modelo: { type: 'string', description: 'lead: la moto que le interesa' }, telefono: { type: 'string', description: 'lead: su WhatsApp' } }, required: ['tipo'] },
      summary: { type: 'string', description: 'Una línea para el equipo: qué quiere el cliente y en qué quedó.' },
      handoff: { type: 'boolean', description: 'true si una persona debe tomar la conversación.' },
      handoffReason: { type: 'string', enum: ['', 'pide_persona', 'queja', 'comprobante', 'no_puede_pagar', 'descuento', 'no_cliente', 'lead', 'otro'] }
    },
    required: ['reply', 'summary', 'handoff']
  }
};

// Se revisa a mano (sin librerias): lo que no cuadra se descarta
function validar(x) {
  if (!x || typeof x !== 'object') return null;
  const reply = typeof x.reply === 'string' ? x.reply.trim() : '';
  if (!reply || reply.length > 1500) return null;
  let draft = null;
  const d = x.draft && typeof x.draft === 'object' ? x.draft : null;
  const txt = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
  if (d && d.tipo === 'promesa' && /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha || ''))) {
    draft = { tipo: 'promesa', fecha: String(d.fecha), monto: typeof d.monto === 'number' && d.monto > 0 ? Math.round(d.monto * 100) / 100 : null, nota: txt(d.nota, 200) };
  } else if (d && d.tipo === 'lead') {
    const tel = String(d.telefono || '').replace(/\D/g, '');
    const lead = { tipo: 'lead', nombre: txt(d.nombre, 80), ciudad: txt(d.ciudad, 60), modelo: txt(d.modelo, 80), telefono: tel.length >= 10 ? tel : '', nota: txt(d.nota, 200) };
    if (lead.nombre || lead.modelo || lead.telefono || lead.ciudad) draft = lead;
  }
  const razones = ['', 'pide_persona', 'queja', 'comprobante', 'no_puede_pagar', 'descuento', 'no_cliente', 'lead', 'otro'];
  return { reply, draft, summary: typeof x.summary === 'string' ? x.summary.slice(0, 300) : '', handoff: !!x.handoff, handoffReason: razones.includes(x.handoffReason) ? x.handoffReason : (x.handoff ? 'otro' : '') };
}

// Historial (ultimos 40 mensajes) como turnos user/assistant; los del equipo van como assistant
function turnos(mensajes) {
  const t = [];
  (mensajes || []).slice(-40).forEach(m => {
    const rol = m.autor === 'cliente' ? 'user' : 'assistant';
    let texto = m.texto || (m.tipo === 'imagen' ? '[el cliente mandó una imagen]' : m.tipo === 'audio' ? '[el cliente mandó un audio]' : m.tipo === 'documento' ? '[el cliente mandó un documento]' : '');
    if (m.autor === 'equipo') texto = '[respuesta del equipo de Pagasi] ' + texto;
    if (!texto) return;
    if (t.length && t[t.length - 1].role === rol) t[t.length - 1].content += '\n' + texto;
    else t.push({ role: rol, content: texto });
  });
  if (!t.length || t[0].role !== 'user') t.unshift({ role: 'user', content: '[inicio de la conversación]' });
  if (t[t.length - 1].role !== 'user') t.push({ role: 'user', content: '[el cliente está esperando respuesta]' });
  return t;
}

async function pensar({ apiKey, sistema, mensajes, fetchImpl }) {
  const f = fetchImpl || fetch;
  const r = await f(URL, { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELO, max_tokens: 700, system: sistema, tools: [HERRAMIENTA], tool_choice: { type: 'auto' }, messages: turnos(mensajes) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Anthropic HTTP ' + r.status)); e.code = 'anthropic'; throw e; }
  const uso = (j.content || []).find(b => b.type === 'tool_use' && b.name === 'responder');
  if (uso) { const v = validar(uso.input); if (v) return Object.assign(v, { uso: j.usage || null }); }
  // Si contesto en texto plano, se usa como respuesta sin anotaciones
  const texto = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (texto) return { reply: texto.slice(0, 1500), draft: null, summary: '', handoff: false, handoffReason: '', uso: j.usage || null };
  throw new Error('El modelo no devolvió respuesta');
}

module.exports = { pensar, validar, turnos, HERRAMIENTA, MODELO };
