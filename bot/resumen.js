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
   RESUMEN DIARIO DE PAGASI POR TELEGRAM
   Corre en GitHub Actions todos los dias a las 6:00 PM hora Venezuela.
   Lee Firestore (solo lectura), arma el resumen del dia y lo manda a Telegram.
   NO modifica nada de la base de datos.

   Autenticacion con Google: SIN llave descargable. El paso
   google-github-actions/auth del workflow prueba la identidad de GitHub
   (Workload Identity Federation) y deja las credenciales en el entorno;
   @google-cloud/firestore las toma solo (ADC).

   Secreto que necesita (se configura en GitHub, no va en el codigo):
     - TELEGRAM_TOKEN     : el token del bot (@BotFather)
     - TELEGRAM_CHAT_ID   : opcional; si no esta, usa el chat por defecto de abajo
   ══════════════════════════════════════════════════════════════════════════ */

const { Firestore } = require('@google-cloud/firestore');
const Ledger = require('../logic/credito-ledger.js');   // mismo motor de cuotas que el admin
const Mora = require('./mora-comun.js');                // misma definicion de "en mora" que el sistema

const TOKEN = process.env.TELEGRAM_TOKEN;
// A quienes les llega el resumen: dueno + socio. Para sumar a alguien, agrega
// su chat id aqui (lo saca escribiendole a @userinfobot).
const CHATS = (process.env.TELEGRAM_CHAT_ID || '8571975984,1280343056')
  .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
const DIAS_GRACIA = 5;

if (!TOKEN) { console.error('Falta el secreto TELEGRAM_TOKEN.'); process.exit(1); }

const db = new Firestore({ projectId: _proyecto() });

/* ── Fechas, ancladas al reloj de Venezuela (el Action corre en UTC) ── */
const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });   // 2026-07-27
const ancla = new Date(hoy + 'T12:00:00Z');
const ayer  = new Date(ancla.getTime() - 86400000).toISOString().slice(0, 10);
const manana = new Date(ancla.getTime() + 86400000).toISOString().slice(0, 10);
const mes = hoy.slice(0, 7);
const hoyLindo = new Date().toLocaleDateString('es-VE',
  { timeZone: 'America/Caracas', weekday: 'long', day: '2-digit', month: 'long' });
const mesNombre = ancla.toLocaleDateString('es-VE', { month: 'long', timeZone: 'UTC' });

const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-VE');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pagoOK = p => !p.eliminado && (p.estado || 'confirmado') === 'confirmado';
const esIni = p => p.esInicial === true || p.tipoOperacion === 'inicial_credito';

async function main() {
  const [credSnap, pagoSnap, cliSnap, concSnap, compSnap] = await Promise.all([
    db.collection('creditos').get(),
    db.collection('pagos').get(),
    db.collection('clientes').get(),
    db.collection('concesionarios').get(),
    db.collection('comprobantes').where('estado', '==', 'pendiente').get()
  ]);

  const creds = credSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => !c.eliminado);
  const pagos = pagoSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(pagoOK);
  const clientes = cliSnap.docs.map(d => d.data());
  const concNom = {}; concSnap.docs.forEach(d => { concNom[d.id] = (d.data().nombre) || '—'; });

  const credById = {}; creds.forEach(c => { credById[c.id] = c; });
  const pagosByCred = {}; pagos.forEach(p => { (pagosByCred[p.cred] = pagosByCred[p.cred] || []).push(p); });

  // ── HOY ──
  const credHoy = creds.filter(c => c.fecha === hoy && c.estado !== 'cancelado');
  const pagosHoy = pagos.filter(p => p.fecha === hoy);
  const inisHoy = pagosHoy.filter(esIni);
  const cuotasHoy = pagosHoy.filter(p => !esIni(p));
  const montoVentas = credHoy.reduce((a, c) => a + (Number(c.precio) || 0), 0);
  const montoIni = inisHoy.reduce((a, p) => a + (Number(p.monto) || 0), 0);
  const montoCuotas = cuotasHoy.reduce((a, p) => a + (Number(p.monto) || 0), 0);
  const entroHoy = montoIni + montoCuotas;

  // Caja por metodo de pago
  const porMetodo = {};
  pagosHoy.forEach(p => { const k = p.metodo || 'Otro'; porMetodo[k] = (porMetodo[k] || 0) + (Number(p.monto) || 0); });

  // Leads del dia
  const leadsHoy = clientes.filter(c => String(c.creado || '').slice(0, 10) === hoy);
  const leadsTop = leadsHoy.filter(c => (Number(c.score_indexa) || 0) > 700).length;

  // Comparativo vs el promedio diario de los ultimos 7 dias. Mas estable que
  // "vs ayer": un domingo casi sin cobranza disparaba porcentajes absurdos.
  const hace7 = new Date(ancla.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const promDia = pagos.filter(p => p.fecha >= hace7 && p.fecha < hoy)
    .reduce((a, p) => a + (Number(p.monto) || 0), 0) / 7;
  let comp = '';
  if (promDia > 1) {
    const pct = Math.round((entroHoy - promDia) / promDia * 100);
    // Si el promedio es raro (semana atipica), un porcentaje enorme confunde
    // mas que ayuda: solo lo mostramos cuando cae en un rango con sentido.
    if (Math.abs(pct) <= 500) comp = pct >= 0 ? ` (▲ +${pct}% vs promedio)` : ` (▼ ${pct}% vs promedio)`;
  }

  // Por concesionario (ventas del dia + cobranza del dia)
  const sede = {};
  const getSede = id => (sede[id] = sede[id] || { ventas: 0, cobrado: 0 });
  credHoy.forEach(c => { getSede(c.concesionarioId).ventas++; });
  pagosHoy.forEach(p => { const c = credById[p.cred]; if (c) getSede(c.concesionarioId).cobrado += Number(p.monto) || 0; });
  const sedesOrden = Object.keys(sede).sort((a, b) => (sede[b].cobrado - sede[a].cobrado) || (sede[b].ventas - sede[a].ventas));

  // Ranking de vendedores (por ventas del dia)
  const vend = {};
  credHoy.forEach(c => {
    const k = c.creadoPor || c.vendedorNombre || '—';
    vend[k] = vend[k] || { n: 0, precio: 0 };
    vend[k].n++; vend[k].precio += Number(c.precio) || 0;
  });
  const vendOrden = Object.keys(vend).sort((a, b) => vend[b].precio - vend[a].precio);

  // Un solo recorrido con el motor de cuotas: cuanto esta realmente VENCIDO por
  // credito (cuotas ya pasadas sin pagar) y cuantas cuotas vencen manana.
  let vmCount = 0, vmMonto = 0;
  const vencidoPorCred = {}, diasPorCred = {};
  creds.filter(Mora.vigente).forEach(c => {
    let est;
    try { est = Ledger.generarEstadoCredito(c, pagosByCred[c.id] || [], { today: hoy, diasGracia: DIAS_GRACIA }); }
    catch (e) { return; }
    diasPorCred[c.id] = Mora.diasAtraso(c, est, hoy);
    let venc = 0;
    (est.cuotas || []).forEach(q => {
      const saldo = Number(q.saldo) || 0;
      if (saldo <= 0.01) return;
      if (q.fechaVence === manana) { vmCount++; vmMonto += saldo; }
      if (q.fechaVence <= hoy) venc += saldo;
    });
    vencidoPorCred[c.id] = venc;
  });

  // Mora: misma cuenta que el sistema (vigente con al menos un dia de atraso; punto 26)
  const moraCreds = creds.filter(c => Mora.vigente(c) && (diasPorCred[c.id] || 0) > 0);
  const moraMonto = moraCreds.reduce((a, c) => a + (vencidoPorCred[c.id] || 0), 0);
  const moraTop = moraCreds.slice().sort((a, b) => (diasPorCred[b.id] || 0) - (diasPorCred[a.id] || 0)).slice(0, 3);

  // Mes acumulado
  const credMes = creds.filter(c => String(c.fecha || '').slice(0, 7) === mes && c.estado !== 'cancelado');
  const cobradoMes = pagos.filter(p => String(p.fecha || '').slice(0, 7) === mes).reduce((a, p) => a + (Number(p.monto) || 0), 0);

  // Portal: comprobantes por revisar
  const compPend = compSnap.size;

  // Vigilante de integridad (solo lo que paso hoy)
  const sinMoto = credHoy.filter(c => c.motoId == null || c.motoId === '');
  const iniPorCred = {}; inisHoy.forEach(p => { iniPorCred[p.cred] = (iniPorCred[p.cred] || 0) + (Number(p.monto) || 0); });
  const iniExcede = credHoy
    .map(c => ({ id: c.id, cli: c.cli, plan: Number(c.ini) || 0, pagado: iniPorCred[c.id] || 0 }))
    .filter(x => x.pagado - x.plan > 1);

  /* ── Armar el mensaje ── */
  const L = [];
  L.push(`<b>🐴 Pagasi — ${hoyLindo}</b>`);

  L.push('');
  L.push('<b>━━ HOY ━━</b>');
  L.push(`🏍️ Ventas: <b>${credHoy.length}</b>${credHoy.length ? ' · ' + money(montoVentas) : ''}`);
  L.push(`💵 Iniciales: <b>${money(montoIni)}</b>`);
  L.push(`✅ Cuotas: ${cuotasHoy.length} · <b>${money(montoCuotas)}</b>`);
  L.push(`📥 Entró: <b>${money(entroHoy)}</b>${comp}`);
  const metLine = Object.keys(porMetodo).sort((a, b) => porMetodo[b] - porMetodo[a])
    .map(k => `${esc(k)} ${money(porMetodo[k])}`).join(' · ');
  if (metLine) L.push(`   ${metLine}`);
  L.push(`👤 Leads: <b>${leadsHoy.length}</b>${leadsTop ? ` (${leadsTop} con score &gt;700)` : ''}`);

  if (sedesOrden.length) {
    L.push('');
    L.push('<b>━━ POR CONCESIONARIO ━━</b>');
    sedesOrden.forEach(id => {
      const s = sede[id];
      const parts = [];
      if (s.ventas) parts.push(`${s.ventas} ${s.ventas === 1 ? 'moto' : 'motos'}`);
      if (s.cobrado) parts.push(`cobró ${money(s.cobrado)}`);
      L.push(`${esc(concNom[id] || 'Sin sede')}: ${parts.join(' · ')}`);
    });
  }

  if (vendOrden.length) {
    L.push('');
    L.push('<b>━━ VENDEDORES (hoy) ━━</b>');
    vendOrden.slice(0, 5).forEach(k => L.push(`${esc(k)}: ${vend[k].n} · ${money(vend[k].precio)}`));
  }

  L.push('');
  L.push('<b>━━ COBRANZA ━━</b>');
  L.push(`⚠️ En mora: <b>${moraCreds.length}</b> · ${money(moraMonto)} vencido`);
  // Acuerdos de pago mensual (fechaCompromiso): promesas de hoy e incumplidas
  const acu = creds.filter(c => c.fechaCompromiso && (c.estado === 'activo' || c.estado === 'mora'));
  if (acu.length) {
    const acuHoy = acu.filter(c => c.fechaCompromiso === hoy);
    const acuRotas = acu.filter(c => c.fechaCompromiso < hoy);
    L.push(`🗓 Acuerdos mensuales: <b>${acu.length}</b>`
      + (acuHoy.length ? ` · prometen pagar HOY: <b>${acuHoy.length}</b>` : '')
      + (acuRotas.length ? ` · 🔴 incumplidos: <b>${acuRotas.length}</b>` : ''));
    acuRotas.slice(0, 3).forEach(c => {
      L.push(`   • ${c.cli || c.id} — prometió el ${c.fechaCompromiso}`);
    });
  }
  moraTop.forEach(c => {
    L.push(`   • ${esc(c.cli)} — ${diasPorCred[c.id] || 0} días · ${money(vencidoPorCred[c.id] || 0)}`);
  });
  L.push(`📅 Vencen mañana: <b>${vmCount}</b> ${vmCount === 1 ? 'cuota' : 'cuotas'} · ${money(vmMonto)}`);

  L.push('');
  L.push('<b>━━ PORTAL ━━</b>');
  L.push(`📸 Comprobantes por revisar: <b>${compPend}</b>`);

  L.push('');
  L.push(`<b>━━ MES (${esc(mesNombre)}) ━━</b>`);
  L.push(`🏍️ ${credMes.length} motos · 💰 cobrado ${money(cobradoMes)}`);

  const alertas = [];
  if (sinMoto.length) alertas.push(`• ${sinMoto.length} venta(s) sin moto: ${sinMoto.map(c => esc(c.id)).join(', ')}`);
  iniExcede.forEach(x => alertas.push(`• ${esc(x.id)} (${esc(x.cli)}): inicial ${money(x.pagado)} &gt; plan ${money(x.plan)} — ¿de otro cliente?`));
  L.push('');
  if (alertas.length) { L.push('<b>🚨 Revisar hoy:</b>'); alertas.forEach(a => L.push(a)); }
  else L.push('🟢 Integridad: todo en orden.');

  const m = L.join('\n');

  /* ── Enviar a Telegram (a cada destinatario) ── */
  let algunoOk = false;
  for (const chat of CHATS) {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: m, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    const body = await res.json();
    if (body.ok) { algunoOk = true; console.log('Resumen enviado a', chat); }
    else console.error('Telegram', chat + ':', body.description);   // ej: el socio aun no le dio /start
  }
  if (!algunoOk) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
