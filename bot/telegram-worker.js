/* ══════════════════════════════════════════════════════════════════════════
   BOTONES DE PAGASI — Cloudflare Worker
   Escucha tus mensajes de Telegram 24/7 y, segun el boton que toques, dispara
   el GitHub Action correspondiente (que lee Firestore y te manda el reporte).
   No lee la base: solo enciende Actions, por eso no necesita llave de Firebase.

   Secrets del Worker:
     GITHUB_PAT       obligatorio: GPS (barrido de las 8 am y botones Actualizar)
     TELEGRAM_TOKEN,  solo si se usan los botones de Telegram (webhook con
     TG_SECRET,       secret_token = TG_SECRET). Sin ellos, lo que llegue a la
     CHAT_ID          raiz se ignora.
   ══════════════════════════════════════════════════════════════════════════ */

// El repositorio cuyos jobs dispara este Worker: tiene que ser el de ESTA compania.
// Con el de PAGASI 18 aqui, el Worker de PAGASI 26 disparaba los robots de PAGASI 18,
// que escriben en la base de PAGASI 18 (22-sep-2026).
const REPO = 'Pagasi18/PAGASI26';

// Quienes pueden usar el bot (dueno + socio). Para sumar a alguien, agrega su
// chat id aqui. El bot ignora a cualquier otro, aunque tenga el enlace.
const ALLOWED = ['8571975984', '1280343056'];

// Teclado de botones que se muestra en Telegram
const KEYBOARD = {
  keyboard: [
    [{ text: '📊 Resumen ahora' }],
    [{ text: '💰 Cobranza hoy' }, { text: '⚠️ Mora' }],
    [{ text: '📉 Por caer' }, { text: '📅 Vencen mañana' }],
    [{ text: '🏍️ Ventas del mes' }, { text: '🏆 Ranking' }],
    [{ text: '📈 Meta del mes' }, { text: '📦 Inventario' }],
    [{ text: '👥 Leads' }, { text: '📸 Comprobantes' }],
    [{ text: '🔍 Buscar cliente' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

// Boton -> modo del reporte a pedido (reporte.js)
const MODOS = {
  '💰 Cobranza hoy': 'cobranza',
  '⚠️ Mora': 'mora',
  '📉 Por caer': 'porcaer',
  '📅 Vencen mañana': 'vencen',
  '🏍️ Ventas del mes': 'ventas',
  '🏆 Ranking': 'ranking',
  '📈 Meta del mes': 'meta',
  '📦 Inventario': 'inventario',
  '👥 Leads': 'leads',
  '📸 Comprobantes': 'comprobantes'
};

// Origenes que pueden pedir un refresco de GPS desde el navegador.
const ORIGENES = ['https://pagasi.io', 'https://www.pagasi.io'];

export default {
  // Cloudflare si corre esto a la hora. GitHub retrasa sus workflows
  // programados horas enteras, asi que el barrido de GPS se dispara desde
  // aqui en vez de confiar en el cron de GitHub. Corre una vez al dia a las
  // 8:00 am de Venezuela (crons de wrangler.toml).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/gps-micodus.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_PAT}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'pagasi-gps-cron',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    ).then(r => {
      // Si GitHub no acepta (token vencido o sin permiso), el cron sale FALLIDO
      // en Cloudflare en vez de quedar en verde sin haber hecho nada.
      if (!r.ok) throw new Error('GitHub no disparo el barrido: HTTP ' + r.status);
    }));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Refresco de GPS a pedido desde el app ──────────────────────
    // GitHub retrasa los workflows programados de repos publicos horas
    // enteras: un cron de 5 minutos corria cada 4 horas, y el boton del
    // modulo quedaba esperando. Aqui se dispara al instante, porque el
    // token de GitHub ya vive en este Worker y no en el navegador.
    if (url.pathname === '/gps-refresco') {
      const origen = request.headers.get('Origin') || '';
      const cors = {
        'Access-Control-Allow-Origin': ORIGENES.includes(origen) ? origen : ORIGENES[0],
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
      if (request.method !== 'POST') return new Response('metodo no permitido', { status: 405, headers: cors });
      if (!ORIGENES.includes(origen)) return new Response('origen no permitido', { status: 403, headers: cors });

      const r = await fetch(
        `https://api.github.com/repos/${REPO}/actions/workflows/gps-micodus.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.GITHUB_PAT}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'pagasi-gps',
          },
          body: JSON.stringify({ ref: 'main' }),
        }
      );
      return new Response(JSON.stringify({ ok: r.ok, estado: r.status }),
        { status: r.ok ? 200 : 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    if (request.method !== 'POST') return new Response('Bot de Pagasi activo.');

    // Solo Telegram puede escribir aqui: el webhook se registra con secret_token
    // = TG_SECRET y Telegram lo manda en esta cabecera. Sin TELEGRAM_TOKEN o sin
    // TG_SECRET, se ignora todo: nadie puede disparar reportes con un JSON
    // inventado haciendose pasar por un chat permitido.
    if (!env.TELEGRAM_TOKEN || !env.TG_SECRET
        || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TG_SECRET) {
      return new Response('ok');
    }

    let update;
    try { update = await request.json(); } catch (e) { return new Response('ok'); }

    const msg = update.message || update.edited_message;
    const chatId = msg && msg.chat && msg.chat.id;
    const text = (msg && msg.text) || '';
    if (!ALLOWED.includes(String(chatId))) return new Response('ignored');

    const tg = (method, body) => fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const dispatch = (workflow, inputs) => fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_PAT}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'pagasi-telegram-bot'
        },
        body: JSON.stringify(inputs ? { ref: 'main', inputs } : { ref: 'main' })
      }
    );

    // Menu
    if (text === '/start' || text === '/menu') {
      await tg('sendMessage', { chat_id: chatId, text: 'Tu panel Pagasi 👇 Toca lo que quieras ver.', reply_markup: KEYBOARD });
      return new Response('ok');
    }

    // Resumen completo (usa su propio workflow, el mismo de las 7 PM)
    if (text === '📊 Resumen ahora' || text === '/resumen') {
      const gh = await dispatch('resumen-diario.yml');
      await tg('sendMessage', { chat_id: chatId, text: gh.ok ? '⏳ Generando tu resumen…' : '⚠️ No pude ahora, intenta de nuevo.' });
      return new Response('ok');
    }

    // Buscar cliente: pedimos la cedula con "responder"
    if (text === '🔍 Buscar cliente') {
      await tg('sendMessage', { chat_id: chatId, text: 'Escribe la cédula del cliente:', reply_markup: { force_reply: true } });
      return new Response('ok');
    }

    // Respondio a la pregunta de la cedula -> busqueda
    const rt = msg && msg.reply_to_message;
    if (rt && /cédula/i.test(rt.text || '')) {
      const gh = await dispatch('bot-reporte.yml', { modo: 'cliente', arg: text.trim(), chat: String(chatId) });
      await tg('sendMessage', { chat_id: chatId, text: gh.ok ? '⏳ Buscando…' : '⚠️ No pude buscar, intenta de nuevo.' });
      return new Response('ok');
    }

    // Botones de reporte a pedido
    if (MODOS[text]) {
      const gh = await dispatch('bot-reporte.yml', { modo: MODOS[text], arg: '', chat: String(chatId) });
      await tg('sendMessage', { chat_id: chatId, text: gh.ok ? '⏳ Generando…' : '⚠️ No pude ahora, intenta de nuevo.' });
      return new Response('ok');
    }

    // Cualquier otra cosa
    await tg('sendMessage', { chat_id: chatId, text: 'Usa /menu para ver tus botones.' });
    return new Response('ok');
  }
};
