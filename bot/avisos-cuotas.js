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
   AVISOS DE COBRANZA — la lista del dia, repartida y lista para enviar

   Adam (11-sep-2026): "necesito avisarles a los clientes 3 dias antes de que
   se venza la cuota, y tambien el dia que se vence. Mas de mil cuotas al mes."
   Adam (14-sep-2026): "la cobranza se divide en 2: preventiva, los que no
   deben todavia, 3 dias antes de la cuota se le recuerda; y la critica, que
   es desde el dia 1 en que el cliente entra en mora." Eligio (y corrigio:
   "es al reves... Samantha preventiva"):
     - PREVENTIVA (Samantha): vence en 3 dias y vence HOY.
     - CRITICA (Jofanny): todos los que estan en mora desde el dia 1, en una
       sola lista, los de mas dias primero.

   Corre en GitHub Actions todas las mananas (7:46 am Venezuela). Lee Firestore
   (SOLO lectura) y, con el MISMO motor de cuotas del admin, arma para Telegram
   UN mensaje por cobradora ("mandame solo 2 mensajes, uno para Samantha y otro
   para Jofanny"), con el dia y sus totales arriba y un boton de WhatsApp por
   cliente (el mensaje ya va escrito; la cobradora solo toca el enlace y le da
   enviar). Solo si una lista no cabe en un mensaje de Telegram se parte:
          🟢 PREVENTIVA · vence HOY o en 3 dias → plantilla "Recordatorio cuota"
          🔴 CRITICA    · en mora 1-30 dias     → plantilla "Aviso de mora"
                        · en mora +30 dias      → plantilla "Aviso urgente de mora"
   No escribe nada en la base.

   Mismas reglas que la pantalla de Cobranza (modules/pagos.js):
   - En mora = la proxima cuota sin pagar ya vencio (lo que vence HOY no es
     mora) o el credito tiene c.mora > 0. Dias = el mayor de los dos.
   - Los que tienen ACUERDO de pago (fechaCompromiso) y los ILOCALIZABLES no
     van: cada uno tiene su propia gestion.

   Un cliente en mora lo lleva SOLO la cobradora de critica: si ademas le vence
   otra cuota (otro credito), ese recordatorio va en la lista de critica, para
   que dos cobradoras nunca le escriban al mismo cliente.

   Cada cobradora recibe SU lista en su propio chat con el bot (Adam, 14-sep:
   "cada una en su chat"), y Adam y su socio solo un resumen corto. Los chats
   estan en Firestore config/avisosTelegram (los guarda avisos-chats.js cuando
   ellas le tocan Iniciar al bot). Mientras falte el chat de una cobradora, su
   lista les sigue llegando a Adam y a su socio: no se pierde nada.

   - Clientes sin telefono utilizable: aparte, al final de la lista que les toca.
   - El log de Actions es publico: aqui NUNCA se imprimen nombres, telefonos
     ni enlaces; solo cantidades e ids de credito.

   Secretos / variables (en GitHub, no en el codigo):
     - TELEGRAM_TOKEN            : el token del bot (@BotFather)
     - TELEGRAM_CHAT_RESUMEN     : opcional, a quien le llega el resumen (por
                                   defecto TELEGRAM_CHAT_ID o Adam y su socio)
     - TELEGRAM_CHAT_ID_AVISOS   : opcional, un grupo para las listas cuyas
                                   cobradoras todavia no tienen chat guardado
     - COBRADORA_PREVENTIVA      : opcional (por defecto "Samantha")
     - COBRADORA_CRITICA         : opcional (por defecto "Jofanny")
   Con --dry calcula y reporta cantidades, sin mandar nada.
   ══════════════════════════════════════════════════════════════════════════ */

const Ledger = require('../logic/credito-ledger.js');

const DIAS_GRACIA = 5;
const DIAS_AVISO = 3;                 // el aviso anticipado: 3 dias antes
const DIAS_CRITICO = 30;              // mas de esto: aviso urgente (como en Cobranza)
const TELEGRAM_MAX = 3800;            // letras VISIBLES por mensaje: Telegram corta en 4096 (las direcciones de los enlaces no cuentan)
const TELEGRAM_MAX_ENTIDADES = 90;    // negritas, cursivas y enlaces por mensaje (Telegram admite hasta 100)
const PREVENTIVA_DEFECTO = 'Samantha';
const CRITICA_DEFECTO = 'Jofanny';
const COBRADORAS_DEFECTO = ['Samantha', 'Jofanny'];   // del reparto anterior (ver repartidor)

/* ── Fechas ancladas a Venezuela (Actions corre en UTC) ── */
function fechasDe(hoyISO) {
  const ancla = new Date(hoyISO + 'T12:00:00Z');
  const en3 = new Date(ancla.getTime() + DIAS_AVISO * 86400000).toISOString().slice(0, 10);
  return { hoy: hoyISO, en3 };
}
function diasEntre(desdeISO, hastaISO) {
  return Math.round((new Date(hastaISO + 'T12:00:00Z') - new Date(String(desdeISO).slice(0, 10) + 'T12:00:00Z')) / 86400000);
}
function lindo(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return d + '/' + m + '/' + y;
}
const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);

// Lo que Telegram cuenta para su limite: el texto visible, sin etiquetas ni las
// direcciones de los enlaces (que son largas: llevan el WhatsApp ya escrito)
function textoVisible(html) {
  return String(html).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function entidades(html) {
  return (String(html).match(/<(a|b|i)[\s>]/g) || []).length;
}

/* ── Telefono: mismo criterio que el admin (wa.me/58 + numero sin el 0) ── */
function telWhatsapp(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('58')) d = d.slice(2);
  d = d.replace(/^0+/, '');
  if (d.length !== 10) return null;    // 4141234567
  return '58' + d;
}

/* ── Los mensajes al cliente: las plantillas del sistema (logic/notificaciones.js) ── */
const dinero = n => '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',');

function mensajeRecordatorio(o) {        // plantilla "Recordatorio cuota"
  return [
    'Hola ' + o.nombre + ',',
    '',
    o.hoyMismo ? 'Tu cuota de la moto vence HOY:' : 'Te recordamos tu próxima cuota de la moto:',
    '• Monto: ' + dinero(o.monto),
    '• Fecha: ' + lindo(o.fechaVence),
    o.numero && o.totalCuotas ? '• Cuota N°: ' + o.numero + ' de ' + o.totalCuotas : '',
    '',
    'Escríbenos por aquí y la resolvemos rápido.',
    '',
    'PAGASI'
  ].filter(Boolean).join('\n');
}

function mensajeMora(o) {                // plantilla "Aviso de mora"
  return [
    'PAGASI — AVISO DE MORA',
    '',
    'Estimado/a ' + o.nombre + ':',
    '',
    'Le informamos que su cuenta presenta ' + plural(o.dias, 'día', 'días') + ' de atraso en el pago de la cuota quincenal N° '
      + o.numero + ' correspondiente a su vehículo' + (o.modelo ? ' ' + o.modelo : '') + '.',
    '',
    '• Crédito: ' + o.cred,
    '• Monto vencido: ' + dinero(o.monto),
    '• Días de atraso: ' + o.dias,
    '',
    'Le solicitamos respetuosamente que regularice su situación lo antes posible para evitar cargos adicionales y el inicio de un proceso de recuperación.',
    '',
    'Para realizar su pago o coordinar un acuerdo, comuníquese con nosotros a la brevedad.',
    '',
    'PAGASI'
  ].join('\n');
}

function mensajeMoraGrave(o) {           // plantilla "Aviso urgente de mora"
  return [
    'PAGASI — AVISO URGENTE DE MORA',
    '',
    'Estimado/a ' + o.nombre + ':',
    '',
    'Su cuenta N° ' + o.cred + ' registra ' + o.dias + ' días de atraso, lo cual representa una situación grave que requiere atención INMEDIATA.',
    '',
    '• Monto vencido: ' + dinero(o.monto),
    '• Días de atraso: ' + o.dias,
    '',
    'De no regularizarse esta situación en un plazo de 72 horas, nos veremos en la obligación de iniciar el proceso legal de recuperación del vehículo'
      + (o.modelo ? ' ' + o.modelo : '') + ' según los términos del contrato firmado.',
    '',
    'Le exhortamos a comunicarse con nosotros HOY MISMO para buscar una solución.',
    '',
    'PAGASI — Dpto. de Cobranza'
  ].join('\n');
}

function mensajeCliente(o) {
  if (o.tipo === 'critico') return mensajeMoraGrave(o);
  if (o.tipo === 'atrasado') return mensajeMora(o);
  return mensajeRecordatorio(o);
}

/* ── Quien es quien ── */
function claveCliente(c) {
  if (c && c.clienteId != null && String(c.clienteId) !== '') return 'id:' + c.clienteId;
  return 'nom:' + String((c && c.cli) || '').trim().toUpperCase();
}
function numeroCredito(id) {
  const m = String(id || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}
// Reparto anterior (11-sep): fijo por cliente, par/impar del PRIMER credito.
// Desde el 14-sep el reparto es por tipo de cobranza (ver duenas); se deja por
// si se vuelve a usar.
function repartidor(creds, cobradoras) {
  const lista = (cobradoras && cobradoras.length) ? cobradoras : COBRADORAS_DEFECTO;
  const primero = {};
  (creds || []).forEach(c => {
    if (!c) return;
    const k = claveCliente(c), n = numeroCredito(c.id);
    if (!(k in primero) || n < primero[k]) primero[k] = n;
  });
  return c => lista[(primero[claveCliente(c)] || 0) % lista.length];
}
// Quien trabaja cada tipo de cobranza
function duenas(opciones) {
  const o = (opciones && !Array.isArray(opciones)) ? opciones : {};
  return {
    preventiva: String(o.preventiva || '').trim() || PREVENTIVA_DEFECTO,
    critica: String(o.critica || '').trim() || CRITICA_DEFECTO
  };
}

/* ── Que avisos tocan hoy. Puro: recibe los datos, devuelve las listas. ── */
function calcularAvisos(creds, pagos, clientes, hoyISO, opciones) {
  const quien = duenas(opciones);
  const { hoy, en3 } = fechasDe(hoyISO);
  const pagosByCred = {};
  pagos.forEach(p => { (pagosByCred[p.cred] = pagosByCred[p.cred] || []).push(p); });
  const cliPorId = {}, cliPorNombre = {};
  clientes.forEach(c => {
    if (c && c.id != null) cliPorId[String(c.id)] = c;
    if (c && c.nombre) cliPorNombre[c.nombre] = c;
  });

  const vencenHoy = [], vencenEn3 = [], atrasados = [], criticos = [], sinTelefono = [];
  creds.forEach(c => {
    if (!c || c.eliminado) return;
    if (c.estado !== 'activo' && c.estado !== 'mora') return;
    let est;
    try { est = Ledger.generarEstadoCredito(c, pagosByCred[c.id] || [], { today: hoy, diasGracia: DIAS_GRACIA }); }
    catch (e) { return; }
    const cuotas = est.cuotas || [];
    const prox = cuotas.find(q => (Number(q.saldo) || 0) > 0.01);   // la proxima cuota sin pagar
    if (!prox) return;

    const cli = (c.clienteId != null && cliPorId[String(c.clienteId)]) || cliPorNombre[c.cli] || {};
    const base = {
      cred: c.id,
      clave: claveCliente(c),
      nombre: cli.nombre || c.cli || 'Cliente',
      tel: telWhatsapp(cli.tel),
      numero: prox.numero,
      totalCuotas: cuotas.length,
      fechaVence: prox.fechaVence,
      modelo: c.modelo || ''
    };

    // ── ¿En mora? (misma definicion que Cobranza) → CRITICA ──
    const moraCampo = parseInt(c.mora, 10) || 0;
    const diasLedger = prox.fechaVence < hoy ? diasEntre(prox.fechaVence, hoy) : 0;
    if (diasLedger > 0 || moraCampo > 0) {
      if (c.fechaCompromiso) return;                                         // acuerdo de pago: su propia gestion
      if (String(c.cobranzaStatus || '') === 'ilocalizable') return;         // ilocalizable: su propia gestion
      const dias = Math.max(moraCampo, diasLedger);
      const vencido = cuotas.filter(q => q.fechaVence < hoy).reduce((s, q) => s + (Number(q.saldo) || 0), 0);
      const aviso = Object.assign(base, {
        tipo: dias > DIAS_CRITICO ? 'critico' : 'atrasado',
        dias,
        monto: vencido > 0.01 ? vencido : (Number(prox.saldo) || 0),
        hoyMismo: false,
        cobradora: quien.critica
      });
      if (!aviso.tel) { sinTelefono.push(aviso); return; }
      (aviso.tipo === 'critico' ? criticos : atrasados).push(aviso);
      return;
    }

    // ── PREVENTIVA: vence hoy o en 3 dias ──
    if (prox.fechaVence !== hoy && prox.fechaVence !== en3) return;
    const hoyMismo = prox.fechaVence === hoy;
    const aviso = Object.assign(base, {
      tipo: hoyMismo ? 'hoy' : 'en3',
      dias: 0,
      monto: Number(prox.saldo) || 0,          // lo que falta de esa cuota (respeta abonos)
      hoyMismo,
      cobradora: quien.preventiva
    });
    if (!aviso.tel) { sinTelefono.push(aviso); return; }
    (hoyMismo ? vencenHoy : vencenEn3).push(aviso);
  });

  // Un cliente en mora lo lleva solo la de critica: sus recordatorios tambien
  const enMora = new Set([...atrasados, ...criticos, ...sinTelefono.filter(a => a.dias > 0)].map(a => a.clave));
  [...vencenHoy, ...vencenEn3, ...sinTelefono.filter(a => a.dias === 0)].forEach(a => {
    if (enMora.has(a.clave)) { a.cobradora = quien.critica; a.clienteEnMora = true; }
  });

  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre);
  const porDias = (a, b) => (b.dias - a.dias) || porNombre(a, b);
  vencenHoy.sort(porNombre); vencenEn3.sort(porNombre); sinTelefono.sort(porNombre);
  atrasados.sort(porDias); criticos.sort(porDias);
  const critica = [...atrasados, ...criticos].sort(porDias);   // una sola lista desde el dia 1
  return { hoy, en3, duenas: quien, vencenHoy, vencenEn3, atrasados, criticos, critica, sinTelefono };
}

/* ── El resumen para Adam y su socio: UN mensaje corto, sin nombres de clientes ── */
function armarResumen(r, nota) {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-VE');
  const total = arr => arr.reduce((s, a) => s + a.monto, 0);
  const quien = r.duenas || duenas();
  const critica = r.critica || [...(r.atrasados || []), ...(r.criticos || [])];
  const prevHoy = r.vencenHoy.filter(a => !a.clienteEnMora);
  const prevEn3 = r.vencenEn3.filter(a => !a.clienteEnMora);
  const tambien = [...r.vencenHoy, ...r.vencenEn3].filter(a => a.clienteEnMora);
  const nPrev = prevHoy.length + prevEn3.length + r.sinTelefono.filter(a => a.dias === 0 && !a.clienteEnMora).length;
  const urgentes = critica.filter(a => a.tipo === 'critico').length;
  const sinTel = r.sinTelefono.length;
  return [
    '<b>📣 Cobranza del ' + lindo(r.hoy) + '</b>',
    '🟢 ' + esc(quien.preventiva) + ' (preventiva): <b>' + plural(nPrev, 'aviso', 'avisos') + '</b> · ' + money(total([...prevHoy, ...prevEn3]))
      + ' — ' + plural(prevHoy.length, 'vence hoy', 'vencen hoy') + ' · ' + plural(prevEn3.length, 'vence', 'vencen') + ' el ' + lindo(r.en3),
    '🔴 ' + esc(quien.critica) + ' (crítica): <b>' + critica.length + ' en mora</b> · ' + money(total(critica)) + ' vencido'
      + (urgentes ? ' · ' + urgentes + ' con +' + DIAS_CRITICO + ' días' : '')
      + (tambien.length ? ' · ' + plural(tambien.length, 'cuota más que vence', 'cuotas más que vencen') : ''),
    sinTel ? '⚠ ' + plural(sinTel, 'cliente sin teléfono útil', 'clientes sin teléfono útil') + ' (corregir en Clientes)' : '',
    nota ? '<i>' + esc(nota) + '</i>' : ''
  ].filter(Boolean).join('\n');
}

/* ── Las listas de Telegram (HTML): una por cobradora ── */
// Adam (14-sep-2026): "mandame solo 2 mensajes, uno para Samantha y otro para
// Jofanny", y despues eligio que cada una la reciba en su propio chat y el
// solo el resumen. Cada lista trae arriba el dia y sus totales. Si no cabe en
// un mensaje se parte, y al enviar mandarPartiendo la parte mas si Telegram lo pide.
function armarPorDestino(r, nota) {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-VE');
  const total = arr => arr.reduce((s, a) => s + a.monto, 0);
  const quien = r.duenas || duenas();
  const critica = r.critica || [...(r.atrasados || []), ...(r.criticos || [])];
  const enlace = (a, texto) => '<a href="https://wa.me/' + a.tel + '?text=' + encodeURIComponent(mensajeCliente(a)) + '">' + texto + '</a>';
  const lineaAviso = a => '• ' + esc(a.nombre) + ' — ' + esc(a.cred) + ' · ' + money(a.monto) + ' · ' + enlace(a, '📲 Enviar aviso');
  const lineaMora = a => '• ' + esc(a.nombre) + ' — ' + esc(a.cred) + ' · ' + plural(a.dias, 'día', 'días') + ' · ' + money(a.monto)
    + ' · ' + enlace(a, a.tipo === 'critico' ? '🚨 Aviso urgente' : '📲 Enviar cobro');
  const etiquetaSinTel = a => a.tipo === 'hoy' ? ' (vence HOY)' : a.tipo === 'en3' ? ' (vence en ' + DIAS_AVISO + ' días)'
    : ' (' + plural(a.dias, 'día', 'días') + ' de atraso)';
  const dia = lindo(r.hoy);

  // Cada aviso va en UNA lista: la de su tipo, salvo los recordatorios de clientes en mora
  const prevHoy = r.vencenHoy.filter(a => !a.clienteEnMora);
  const prevEn3 = r.vencenEn3.filter(a => !a.clienteEnMora);
  const tambien = [...r.vencenHoy, ...r.vencenEn3].filter(a => a.clienteEnMora);
  const sinPrev = r.sinTelefono.filter(a => a.dias === 0 && !a.clienteEnMora);
  const sinCrit = r.sinTelefono.filter(a => a.dias > 0 || a.clienteEnMora);
  const nPrev = prevHoy.length + prevEn3.length + sinPrev.length;
  const urgentes = critica.filter(a => a.tipo === 'critico').length;

  // Solo se parte una lista si no cabe en un mensaje de Telegram
  const trocear = (cabeza, lineas) => {
    const salida = [];
    let actual = '';
    lineas.forEach(x => {
      const cand = actual ? actual + '\n' + x : x;
      const noCabe = textoVisible(cand).length > TELEGRAM_MAX || entidades(cand) > TELEGRAM_MAX_ENTIDADES;
      if (noCabe && actual) {
        salida.push(actual);
        actual = cabeza + ' (continúa)</b>\n' + x;
      } else actual = cand;
    });
    if (actual) salida.push(actual);
    return salida;
  };

  // 1) PREVENTIVA
  const cabP = '<b>🟢 PREVENTIVA — ' + esc(String(quien.preventiva).toUpperCase());
  const bP = [cabP + '</b>'];
  bP.push('📣 Cobranza del ' + dia + ' · <b>' + plural(nPrev, 'aviso', 'avisos') + '</b> · ' + money(total([...prevHoy, ...prevEn3]))
    + (sinPrev.length ? ' · ' + sinPrev.length + ' sin teléfono' : ''));
  bP.push('');
  bP.push('<b>📅 VENCEN HOY (' + prevHoy.length + ')</b>');
  if (prevHoy.length) prevHoy.forEach(a => bP.push(lineaAviso(a))); else bP.push('— Ninguna 🎉');
  bP.push('');
  bP.push('<b>🗓 VENCEN EL ' + lindo(r.en3) + ' (' + prevEn3.length + ')</b>');
  if (prevEn3.length) prevEn3.forEach(a => bP.push(lineaAviso(a))); else bP.push('— Ninguna');
  if (sinPrev.length) {
    bP.push('');
    bP.push('<b>⚠ SIN TELÉFONO ÚTIL (' + sinPrev.length + ')</b> — corregir en Clientes:');
    sinPrev.forEach(a => bP.push('• ' + esc(a.nombre) + ' — ' + esc(a.cred) + etiquetaSinTel(a)));
  }
  bP.push('');
  bP.push('<i>Toca el enlace: WhatsApp se abre con el mensaje listo, solo dale enviar.</i>');
  const msgsPrev = trocear(cabP, bP);

  // 2) CRITICA
  const cabC = '<b>🔴 CRÍTICA — ' + esc(String(quien.critica).toUpperCase());
  const bC = [cabC + '</b>'];
  bC.push('📣 Cobranza del ' + dia + ' · <b>' + critica.length + ' en mora</b> · ' + money(total(critica)) + ' vencido'
    + (urgentes ? ' · ' + urgentes + ' con +' + DIAS_CRITICO + ' días' : '')
    + (tambien.length ? ' · ' + plural(tambien.length, 'cuota más que vence', 'cuotas más que vencen') : '')
    + (sinCrit.length ? ' · ' + sinCrit.length + ' sin teléfono' : ''));
  bC.push('');
  bC.push('<b>EN MORA DESDE EL DÍA 1 (' + critica.length + ')</b> — los de más días primero');
  if (critica.length) critica.forEach(a => bC.push(lineaMora(a))); else bC.push('— Ninguno 🎉');
  if (tambien.length) {
    bC.push('');
    bC.push('<b>📅 TAMBIÉN LES VENCE (' + tambien.length + ')</b> — clientes que ya están en mora:');
    tambien.forEach(a => bC.push(lineaAviso(a) + (a.hoyMismo ? ' (HOY)' : ' (' + lindo(a.fechaVence) + ')')));
  }
  if (sinCrit.length) {
    bC.push('');
    bC.push('<b>⚠ SIN TELÉFONO ÚTIL (' + sinCrit.length + ')</b> — corregir en Clientes:');
    sinCrit.forEach(a => bC.push('• ' + esc(a.nombre) + ' — ' + esc(a.cred) + etiquetaSinTel(a)));
  }
  if (critica.length) {
    bC.push('');
    bC.push('<i>Los que están en mora salen cada día hasta que paguen: no hace falta escribirles a diario.</i>');
  }
  bC.push('');
  bC.push('<i>Toca el enlace: WhatsApp se abre con el mensaje listo, solo dale enviar.</i>');
  const msgsCrit = trocear(cabC, bC);
  return { resumen: [armarResumen(r, nota)], preventiva: msgsPrev, critica: msgsCrit };
}

function armarMensajes(r) {
  const d = armarPorDestino(r);
  return [...d.preventiva, ...d.critica];
}

/* ── Envio: Telegram tambien limita lo que pesan los enlaces de un mensaje ──
   Cada boton de WhatsApp lleva ADENTRO el mensaje entero para el cliente, y
   Telegram rechaza un mensaje con demasiado peso en enlaces ("ENTITIES_TOO_LONG",
   14-sep: 39 recordatorios no entraron en uno). Por eso se manda la lista
   entera y, si Telegram la rechaza por larga, se parte en dos y se reintenta:
   salen los MENOS mensajes posibles sin perder a nadie. El primer chat
   encuentra las partes que Telegram acepta; a los demas se les mandan esas. */
const DEMASIADO_LARGO = /ENTITIES_TOO_LONG|MESSAGE_TOO_LONG|message is too long/i;

function partirEnDos(msg) {
  const lineas = String(msg).split('\n');
  if (lineas.length < 3) return null;
  const esTitulo = l => l === '' || /^<b>.*<\/b>/.test(l);
  const mitad = Math.ceil(lineas.length / 2);
  // que la primera parte no termine en un titulo ni en una linea vacia
  let corte = mitad;
  while (corte < lineas.length - 1 && esTitulo(lineas[corte - 1])) corte++;
  if (esTitulo(lineas[corte - 1])) { corte = mitad; while (corte > 2 && esTitulo(lineas[corte - 1])) corte--; }
  if (corte <= 1 || esTitulo(lineas[corte - 1])) return null;
  const primera = lineas[0];
  const cabeza = primera.indexOf('(continúa)') > -1 ? primera : primera.replace(/<\/b>$/, ' (continúa)</b>');
  return [lineas.slice(0, corte).join('\n'), cabeza + '\n' + lineas.slice(corte).join('\n')];
}

async function mandar(token, chat, texto) {
  const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  return res.json();
}

// Devuelve las partes que Telegram SI acepto (en orden) y si salio todo
async function mandarPartiendo(token, chat, texto, nivel, etiqueta) {
  const body = await mandar(token, chat, texto);
  if (body.ok) return { partes: [texto], completo: true };
  const desc = String(body.description || '');
  if (body.error_code === 429 && nivel < 8) {                    // demasiado rapido: esperar lo que pide y reintentar
    await new Promise(r => setTimeout(r, (((body.parameters || {}).retry_after) || 2) * 1000));
    return mandarPartiendo(token, chat, texto, nivel + 1, etiqueta);
  }
  if (DEMASIADO_LARGO.test(desc) && nivel < 8) {
    const dos = partirEnDos(texto);
    if (dos) {
      const a = await mandarPartiendo(token, chat, dos[0], nivel + 1, etiqueta);
      const b = await mandarPartiendo(token, chat, dos[1], nivel + 1, etiqueta);
      return { partes: a.partes.concat(b.partes), completo: a.completo && b.completo };
    }
  }
  console.error('Telegram (' + (etiqueta || 'envio') + '):', desc);
  return { partes: [], completo: false };
}

async function enviarTelegram(token, chats, mensajes, etiqueta) {
  let algunoOk = false;
  const probado = new Map();   // mensaje → partes que Telegram ya acepto enteras
  for (const [i, chat] of chats.entries()) {
    let n = 0, mayor = 0;
    for (const m of mensajes) {
      const lista = probado.get(m) || [m];
      for (const t of lista) {
        const r = await mandarPartiendo(token, chat, t, 0, etiqueta);
        if (r.partes.length) algunoOk = true;
        n += r.partes.length;
        r.partes.forEach(x => { mayor = Math.max(mayor, x.length); });
        if (!probado.has(m) && lista.length === 1 && r.completo) probado.set(m, r.partes);
      }
    }
    // Solo tamanos (sin datos personales): sirve para conocer el limite real de Telegram
    console.log('Envio ' + (etiqueta || 'mensajes') + ' · destino ' + (i + 1) + ' de ' + chats.length + ': ' + n + ' mensaje(s)'
      + (n ? ' · el mas largo aceptado: ' + mayor + ' caracteres con enlaces' : ''));
  }
  return algunoOk;
}

// A quien le llega cada cosa. Puro: recibe la config de Firestore y las variables.
function destinos(cfg, env) {
  const e = env || {}, c = cfg || {};
  const lista = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  const prueba = String(e.CHAT_PRUEBA || '').trim();
  if (prueba) return { resumen: [prueba], preventiva: [prueba], critica: [prueba], prevPropio: false, critPropio: false, prueba: true };
  const resumen = lista(e.TELEGRAM_CHAT_RESUMEN || e.TELEGRAM_CHAT_ID || '8571975984,1280343056');
  const compartido = lista(e.TELEGRAM_CHAT_ID_AVISOS).length ? lista(e.TELEGRAM_CHAT_ID_AVISOS) : resumen;
  const chat = v => /^-?\d{5,20}$/.test(String(v || '').trim()) ? String(v).trim() : '';
  const prev = chat(c.chatPreventiva), crit = chat(c.chatCritica);
  return { resumen, preventiva: prev ? [prev] : compartido, critica: crit ? [crit] : compartido,
    prevPropio: !!prev, critPropio: !!crit, prueba: false };
}

async function main() {
  const DRY = process.argv.includes('--dry');
  const TOKEN = process.env.TELEGRAM_TOKEN;
  // CHAT_PRUEBA (solo desde el boton manual): manda UNA vez a un solo chat, para ver
  // como se ve, sin tocar a quien le llega el envio diario.
  const PRUEBA = String(process.env.CHAT_PRUEBA || '').trim();
  if (PRUEBA && !/^-?\d{5,20}$/.test(PRUEBA)) { console.error('CHAT_PRUEBA invalido'); process.exit(1); }
  if (PRUEBA) console.log('Envio de PRUEBA a un solo chat');
  if (!DRY && !TOKEN) { console.error('Falta el secreto TELEGRAM_TOKEN.'); process.exit(1); }

  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

  const [credSnap, pagoSnap, cliSnap, cfgSnap] = await Promise.all([
    db.collection('creditos').get(),
    db.collection('pagos').get(),
    db.collection('clientes').get(),
    db.collection('config').doc('avisosTelegram').get(),   // los chats de las cobradoras (avisos-chats.js)
  ]);
  const d = destinos(cfgSnap.exists ? cfgSnap.data() : {}, process.env);
  const creds = credSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const pagos = pagoSnap.docs.map(d => d.data()).filter(p => p && !p.eliminado && (p.estado || 'confirmado') === 'confirmado');
  const clientes = cliSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const r = calcularAvisos(creds, pagos, clientes, hoyISO,
    { preventiva: process.env.COBRADORA_PREVENTIVA, critica: process.env.COBRADORA_CRITICA });
  const nota = d.prueba ? '' : (d.prevPropio && d.critPropio ? 'Cada una recibió su lista con los WhatsApp listos en su chat.'
    : (d.prevPropio || d.critPropio) ? 'La lista que falta va abajo: todavía no está el chat de esa cobradora.'
    : 'Las listas van abajo: todavía no están los chats de las cobradoras.');
  const porDestino = armarPorDestino(r, nota);

  // Log SIN datos personales (los logs de Actions son publicos): ni clientes ni nombres de cobradoras
  const ids = arr => arr.map(a => a.cred).join(', ');
  const vaACritica = a => a.dias > 0 || a.clienteEnMora;
  const todos = [...r.vencenHoy, ...r.vencenEn3, ...r.critica, ...r.sinTelefono];
  console.log('Base: ' + creds.length + ' creditos · ' + pagos.length + ' pagos · hoy ' + r.hoy + ' · aviso para ' + r.en3);
  console.log('  vencen HOY: ' + r.vencenHoy.length + '  (' + ids(r.vencenHoy) + ')');
  console.log('  vencen en ' + DIAS_AVISO + ' dias: ' + r.vencenEn3.length + '  (' + ids(r.vencenEn3) + ')');
  console.log('  en mora (critica): ' + r.critica.length + '  (' + ids(r.critica) + ') · de ellos +' + DIAS_CRITICO + ' dias: ' + r.criticos.length);
  console.log('  recordatorios de clientes en mora (van a critica): ' + todos.filter(a => a.dias === 0 && a.clienteEnMora).length);
  console.log('  sin telefono util: ' + r.sinTelefono.length + '  (' + ids(r.sinTelefono) + ')');
  console.log('  lista preventiva: ' + todos.filter(a => !vaACritica(a)).length + ' avisos · lista critica: ' + todos.filter(vaACritica).length + ' avisos');
  const donde = propio => d.prueba ? 'chat de prueba' : propio ? 'chat propio de la cobradora' : 'chats del resumen (falta el chat de la cobradora)';
  console.log('  destino preventiva: ' + donde(d.prevPropio) + ' · destino critica: ' + donde(d.critPropio));
  console.log('  mensajes de Telegram: 1 resumen + ' + porDestino.preventiva.length + ' preventiva + ' + porDestino.critica.length + ' critica (Telegram puede pedir partir mas)');

  const resumen = 'hoy=' + r.vencenHoy.length + ' en3=' + r.vencenEn3.length + ' atrasados=' + r.atrasados.length
    + ' criticos=' + r.criticos.length + ' sintel=' + r.sinTelefono.length;
  if (DRY) { console.log('\n(dry-run) no se envio nada'); console.log('RESULTADO dry=1 ' + resumen); return; }
  const okRes = await enviarTelegram(TOKEN, d.resumen, porDestino.resumen, 'resumen');
  const okPrev = await enviarTelegram(TOKEN, d.preventiva, porDestino.preventiva, 'preventiva');
  const okCrit = await enviarTelegram(TOKEN, d.critica, porDestino.critica, 'critica');
  const ok = okPrev && okCrit;                 // las listas son lo que importa; el resumen solo informa
  console.log('RESULTADO dry=0 ' + resumen + ' enviado=' + (ok ? 1 : 0) + ' resumen=' + (okRes ? 1 : 0)
    + ' destinos=' + (d.prevPropio ? 'propio' : 'resumen') + '/' + (d.critPropio ? 'propio' : 'resumen'));
  if (!ok) process.exit(1);
}

if (require.main === module) {
  main().catch(e => { console.error('ERROR', e.message); process.exit(1); });
}

module.exports = { calcularAvisos, armarMensajes, armarPorDestino, armarResumen, destinos, mensajeCliente, telWhatsapp, fechasDe, repartidor, claveCliente, duenas,
  textoVisible, entidades, partirEnDos, enviarTelegram, DIAS_AVISO, DIAS_CRITICO, TELEGRAM_MAX, TELEGRAM_MAX_ENTIDADES,
  PREVENTIVA_DEFECTO, CRITICA_DEFECTO, COBRADORAS_DEFECTO };
