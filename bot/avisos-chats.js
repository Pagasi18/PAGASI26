// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
'use strict';
/* ══════════════════════════════════════════════════════════════════════════
   CHATS DE LAS COBRADORAS — quien le toco "Iniciar" a @Pagasi_Cobranza_Bot

   Adam (14-sep-2026) eligio que cada cobradora reciba SU lista en su propio
   chat con el bot. Un bot no puede escribirle a quien no le haya tocado
   Iniciar, y para escribirle necesita el numero de ese chat. Este robot:
     1. le pregunta a Telegram quien le toco Iniciar al bot (ultimas 24 horas),
     2. busca por su nombre en Telegram a la cobradora de preventiva (Samantha)
        y a la de critica (Jofanny); si hay dudas, no adivina,
     3. guarda los chats que encontro en Firestore (config/avisosTelegram), que
        es de donde los lee avisos-cuotas.js, y
     4. le manda a Adam UN mensaje privado con lo que quedo guardado, o a quien
        no encontro y quienes si tocaron Iniciar.
   El log de GitHub es publico: aqui no se imprimen nombres ni numeros de chat.
   Con --dry no guarda nada (igual le avisa a Adam).
   ══════════════════════════════════════════════════════════════════════════ */

const ADAM = '8571975984';

const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Los chats privados que le escribieron al bot, sin repetir
function chatsDeUpdates(updates) {
  const vistos = new Map();
  (updates || []).forEach(u => {
    const m = u && (u.message || u.edited_message);
    const c = m && m.chat;
    if (!c || c.type !== 'private') return;
    vistos.set(String(c.id), {
      id: String(c.id),
      nombre: [c.first_name, c.last_name].filter(Boolean).join(' ').trim(),
      usuario: c.username || ''
    });
  });
  return [...vistos.values()];
}

// UNA persona por su nombre o su usuario de Telegram. null si no aparece o si hay dudas.
function buscar(chats, nombre) {
  const q = normal(nombre);
  if (q.length < 3) return null;
  const hallados = (chats || []).filter(c => normal(c.nombre + ' ' + c.usuario).split(/[^a-z0-9]+/)
    .some(p => p && (p.startsWith(q) || (p.length >= 4 && q.startsWith(p)))));
  return hallados.length === 1 ? hallados[0] : null;
}

function asignar(chats, nombrePreventiva, nombreCritica) {
  const prev = buscar(chats, nombrePreventiva), crit = buscar(chats, nombreCritica);
  const mismo = !!(prev && crit && prev.id === crit.id);     // una sola persona no puede llevar las dos listas
  return { preventiva: mismo ? null : prev, critica: mismo ? null : crit };
}

function mensajeParaAdam(asig, chats, nombrePreventiva, nombreCritica, guardado) {
  const quien = c => esc(c.nombre || (c.usuario ? '@' + c.usuario : 'sin nombre'));
  const l = ['<b>📋 Chats de cobranza en @Pagasi_Cobranza_Bot</b>'];
  l.push('🟢 Preventiva (' + esc(nombrePreventiva) + '): ' + (asig.preventiva ? '✅ ' + quien(asig.preventiva) : '⚠ no la encuentro'));
  l.push('🔴 Crítica (' + esc(nombreCritica) + '): ' + (asig.critica ? '✅ ' + quien(asig.critica) : '⚠ no la encuentro'));
  if (guardado && (asig.preventiva || asig.critica)) {
    l.push('');
    l.push('Guardado: desde el próximo envío, la que tiene ✅ recibe su lista en su chat.');
  }
  if (!asig.preventiva || !asig.critica) {
    l.push('');
    if (chats.length) {
      l.push('Le tocaron Iniciar al bot:');
      chats.forEach((c, i) => l.push((i + 1) + '. ' + esc(c.nombre || 'sin nombre') + (c.usuario ? ' @' + esc(c.usuario) : '')));
    } else {
      l.push('Nadie le ha tocado Iniciar al bot todavía (o fue hace más de 24 horas).');
    }
    l.push('Pídele a la que falta que abra @Pagasi_Cobranza_Bot y toque Iniciar, y avísale a Claude.');
  } else {
    l.push('Tú sigues recibiendo solo el resumen.');
  }
  return l.join('\n');
}

async function main() {
  const DRY = process.argv.includes('--dry');
  const TOKEN = process.env.TELEGRAM_TOKEN;
  if (!TOKEN) { console.log('RESULTADO ERROR: falta TELEGRAM_TOKEN'); process.exit(1); }
  const nomPrev = String(process.env.NOMBRE_PREVENTIVA || '').trim() || 'Samantha';
  const nomCrit = String(process.env.NOMBRE_CRITICA || '').trim() || 'Jofanny';

  const info = await fetch('https://api.telegram.org/bot' + TOKEN + '/getUpdates').then(r => r.json());
  if (!info.ok) { console.log('RESULTADO ERROR: Telegram no dio la lista (' + (info.description || 'sin detalle') + ')'); process.exit(1); }
  const chats = chatsDeUpdates(info.result);
  const asig = asignar(chats, nomPrev, nomCrit);
  console.log('Tocaron Iniciar (24 h): ' + chats.length + ' · preventiva: ' + (asig.preventiva ? 'encontrada' : 'NO')
    + ' · critica: ' + (asig.critica ? 'encontrada' : 'NO'));

  let guardado = false;
  if (!DRY && (asig.preventiva || asig.critica)) {
    const { Firestore } = require('@google-cloud/firestore');
    const db = new Firestore({ projectId: _proyecto() });
    const datos = { actualizado: new Date().toISOString() };
    if (asig.preventiva) { datos.chatPreventiva = asig.preventiva.id; datos.nombrePreventiva = nomPrev; }
    if (asig.critica) { datos.chatCritica = asig.critica.id; datos.nombreCritica = nomCrit; }
    await db.collection('config').doc('avisosTelegram').set(datos, { merge: true });
    guardado = true;
  }

  const aviso = await fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: ADAM, text: mensajeParaAdam(asig, chats, nomPrev, nomCrit, guardado), parse_mode: 'HTML' })
  }).then(r => r.json());
  console.log('RESULTADO guardado=' + (guardado ? 1 : 0) + ' preventiva=' + (asig.preventiva ? 1 : 0)
    + ' critica=' + (asig.critica ? 1 : 0) + ' aviso_a_adam=' + (aviso.ok ? 1 : 0));
  if (!aviso.ok) process.exit(1);
}

if (require.main === module) {
  main().catch(e => { console.log('RESULTADO ERROR ' + e.message); process.exit(1); });
}

module.exports = { chatsDeUpdates, buscar, asignar, mensajeParaAdam, normal };
