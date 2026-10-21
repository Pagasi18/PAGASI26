/* El cerebro: una llamada directa a la API de Anthropic (claude-sonnet-5-5) con una herramienta
   que devuelve la respuesta estructurada. Sin SDK: fetch. Si algo falla, quien llama responde
   una frase de cortesia y marca la conversacion para una persona.                         */
'use strict';
const MODELO = 'claude-sonnet-5-5';
const URL = 'https://api.anthropic.com/v1/messages';
// Ahorro (Adam, 21-oct-2026): "prompt caching". El manual de Paola/Patricia trae primero la parte FIJA (reglas,
// catálogo, sedes, requisitos) y después MARCA + lo de esa conversación. La parte fija se manda marcada para que
// Anthropic la guarde ~5 minutos y la cobre al 10% en las llamadas siguientes (de cualquier conversación).
const MARCA = '⟦fin de la parte fija⟧', CORTE = '\n\n' + MARCA + '\n\n';
function sistemaEnBloques(sistema) {
  const s = String(sistema || ''), i = s.indexOf(CORTE);
  const fijo = i >= 0 ? s.slice(0, i) : s, resto = i >= 0 ? s.slice(i + CORTE.length) : '';
  const b = [{ type: 'text', text: fijo, cache_control: { type: 'ephemeral' } }];
  if (resto.trim()) b.push({ type: 'text', text: resto });
  return b;
}
// El historial también queda guardado: la próxima respuesta de la misma conversación lo relee al 10%
function conCache(t) { const c = t.map(x => Object.assign({}, x)), u = c[c.length - 1]; if (u) u.content = [{ type: 'text', text: String(u.content), cache_control: { type: 'ephemeral' } }]; return c; }

const HERRAMIENTA = {
  name: 'responder',
  description: 'Entrega la respuesta al cliente y lo que hay que anotar en el sistema.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'Lo que se le manda al cliente por WhatsApp, en español de Venezuela, corto.' },
      draft: { type: ['object', 'null'], description: 'Lo que hay que anotar: una promesa de pago (cobranza) si el cliente dijo cuándo paga, o un lead (ventas) si la persona quiere que la contacten o dio sus datos; si no hay nada, null.',
        properties: { tipo: { type: 'string', enum: ['promesa', 'lead'] }, fecha: { type: 'string', description: 'promesa: AAAA-MM-DD' }, monto: { type: 'number' }, nota: { type: 'string' },
          nombre: { type: 'string', description: 'lead: nombre de la persona' }, ciudad: { type: 'string' }, modelo: { type: 'string', description: 'lead: la moto que le interesa' }, telefono: { type: 'string', description: 'lead: su WhatsApp' }, cedula: { type: 'string', description: 'lead: su cédula (V-12345678)' }, inicial: { type: 'number', description: 'lead: la inicial que tiene disponible, en dólares' }, ocupacion: { type: 'string', description: 'lead: a qué se dedica / dónde trabaja' }, direccion: { type: 'string', description: 'lead: dirección donde vive' }, ingreso: { type: 'number', description: 'lead: ingreso mensual aproximado en dólares' }, sede: { type: 'string', description: 'lead: la sede donde la retiraría' }, fiador: { type: 'string', description: 'lead: fiador, "nombre · cédula · teléfono"' }, ref1: { type: 'string', description: 'lead: referencia 1, "nombre · teléfono"' }, ref2: { type: 'string', description: 'lead: referencia 2, "nombre · teléfono"' } }, required: ['tipo'] },
      summary: { type: 'string', description: 'Una línea para el equipo: qué quiere el cliente y en qué quedó.' },
      handoff: { type: 'boolean', description: 'true si una persona debe tomar la conversación.' },
      handoffReason: { type: 'string', enum: ['', 'pide_persona', 'queja', 'comprobante', 'no_puede_pagar', 'descuento', 'no_cliente', 'lead', 'otro'] }
    },
    required: ['reply', 'summary', 'handoff']
  }
};

// Cedula venezolana como la guarda el sistema: V-12345678 (o E-). Lo que no cuadre, vacio.
function cedulaLimpia(v) {
  const s = String(v || '').trim().toUpperCase(); const d = s.replace(/\D/g, '').replace(/^0+/, '');
  if (d.length < 6 || d.length > 9) return '';
  return (s.startsWith('E') ? 'E-' : 'V-') + d;
}
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
    const lead = { tipo: 'lead', nombre: txt(d.nombre, 80), ciudad: txt(d.ciudad, 60), modelo: txt(d.modelo, 80), telefono: tel.length >= 10 ? tel : '', cedula: cedulaLimpia(d.cedula), inicial: typeof d.inicial === 'number' && d.inicial > 0 ? Math.round(d.inicial) : 0, ocupacion: txt(d.ocupacion, 80), direccion: txt(d.direccion, 160), ingreso: typeof d.ingreso === 'number' && d.ingreso > 0 ? Math.round(d.ingreso) : 0, sede: txt(d.sede, 80), fiador: txt(d.fiador, 160), ref1: txt(d.ref1, 120), ref2: txt(d.ref2, 120), nota: txt(d.nota, 200) };
    if (lead.nombre || lead.modelo || lead.telefono || lead.ciudad || lead.cedula || lead.inicial || lead.ocupacion || lead.direccion || lead.ingreso || lead.fiador || lead.ref1) draft = lead;
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

// Una llamada a la API. Sonnet 5.5 razona antes de responder por defecto y ese razonamiento se
// comia el tope de salida (19-oct-2026: tope 700, stop_reason max_tokens y herramienta vacia):
// aqui el razonamiento va apagado (respuestas mas rapidas y baratas) y el tope es holgado.
async function llamar(f, apiKey, cuerpo) {
  const r = await f(URL, { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}
function leer(j) {
  const uso = (j.content || []).find(b => b.type === 'tool_use' && b.name === 'responder');
  if (uso) { const v = validar(uso.input); if (v) return Object.assign(v, { uso: j.usage || null }); }
  // Si contesto en texto plano, se usa como respuesta sin anotaciones
  const texto = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (texto) return { reply: texto.slice(0, 1500), draft: null, summary: '', handoff: false, handoffReason: '', uso: j.usage || null };
  return null;
}
async function pensar({ apiKey, sistema, mensajes, fetchImpl }) {
  const f = fetchImpl || fetch;
  const base = { model: MODELO, max_tokens: 1500, thinking: { type: 'disabled' }, system: sistemaEnBloques(sistema), tools: [HERRAMIENTA], tool_choice: { type: 'auto' }, messages: conCache(turnos(mensajes)) };
  let r = await llamar(f, apiKey, base);
  // Si esta version de la API no acepta apagar el razonamiento, se va sin ese parametro
  if (!r.ok && r.status === 400 && /thinking/i.test(String(r.j.error && r.j.error.message || ''))) { const sin = Object.assign({}, base); delete sin.thinking; r = await llamar(f, apiKey, sin); }
  if (!r.ok) { const e = new Error((r.j.error && r.j.error.message) || ('Anthropic HTTP ' + r.status)); e.code = 'anthropic'; throw e; }
  let v = leer(r.j);
  if (v) return v;
  // Sin respuesta util (p. ej. se corto por el tope): un reintento obligando la herramienta
  r = await llamar(f, apiKey, Object.assign({}, base, { max_tokens: 2500, tool_choice: { type: 'tool', name: 'responder' } }));
  if (!r.ok) { const e = new Error((r.j.error && r.j.error.message) || ('Anthropic HTTP ' + r.status)); e.code = 'anthropic'; throw e; }
  v = leer(r.j);
  if (v) return v;
  throw new Error('El modelo no devolvió respuesta');
}

module.exports = { pensar, validar, turnos, cedulaLimpia, HERRAMIENTA, MODELO, MARCA, CORTE, sistemaEnBloques };
