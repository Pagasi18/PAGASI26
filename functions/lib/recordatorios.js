/* Los recordatorios de cada manana (8:30 am Caracas): 2 dias antes de vencer, el dia del
   vencimiento, al tercer dia de vencida y al sexto. Se mandan como plantillas aprobadas por
   Meta (la unica forma de escribirle a quien no ha escrito en 24 h). Cada envio queda en
   `recordatorios/{empresa}_{credito}_{cuota}_{tipo}` para no repetirlo, y como mensaje en la
   conversacion del cliente. La cola la calcula logic/whatsapp.js con el mismo ledger del
   sistema, asi la pantalla "Hoy" y lo que se manda son lo mismo.                          */
'use strict';
const path = require('path'), fs = require('fs');
// La logica compartida con el panel: al desplegar se copia a functions/logic (firebase.json,
// predeploy); en el repo se usa la original de logic/.
function compartido(nombre) { const copia = path.join(__dirname, '..', 'logic', nombre); const original = path.join(__dirname, '..', '..', 'logic', nombre); return require(fs.existsSync(original) ? original : copia); }   // en el repo manda la original (la copia puede estar vieja); al desplegar solo existe la copia
global.S = global.S || { creds: [], pagos: [], clientes: [] };
global.CreditoLedger = global.CreditoLedger || compartido('credito-ledger.js');
const W = compartido('whatsapp.js');
const briefing = require('./briefing');

// Que grupo manda hoy y con que dia exacto (Adam, 20-oct-2026): 3 dias antes, el dia del vencimiento,
// 1 dia despues, y luego a los 3 y a los 7 dias (despues de 10 dias pasa a un cobrador). Con acuerdo
// de pago: 1 dia antes de la fecha del compromiso y ese mismo dia (dias contados hasta el compromiso).
const CUANDO = { proximas: it => it.dias === -3, hoy: it => it.dias === 0, gracia: it => it.dias === 1 || it.dias === 3, atrasadas: it => it.dias === 7, acuerdo: it => it.dias === -1 || it.dias === 0 };

// Las plantillas que Pagasi ya tiene aprobadas en Meta (cuenta "Pagasi Cobranza", 15-sep-2026),
// con sus variables en orden y su texto, para guardar en la conversacion lo que de verdad se mando.
// Una plantilla que no este aqui recibe las 5 variables de siempre (nombre, cuota, total, monto, fecha).
const PLANTILLAS = {
  recordatorio_cuota: { vars: ['nombre', 'monto', 'fecha'], texto: 'Hola {{1}}, te recordamos que la cuota de tu crédito por ${{2}} vence el {{3}}. Si ya realizaste el pago, ignora este aviso. Si tienes dudas sobre tu pago, responde a este mensaje.' },
  vence_hoy: { vars: ['nombre', 'monto'], texto: 'Hola {{1}}, hoy vence la cuota de tu crédito por ${{2}}. Si ya realizaste el pago, ignora este aviso. Si tienes dudas sobre tu pago, responde a este mensaje.' },
  cuota_vencida: { vars: ['nombre', 'monto', 'fecha'], texto: 'Hola {{1}}, la cuota de tu crédito por ${{2}} venció el {{3}} y sigue pendiente de pago. Si ya realizaste el pago, ignora este aviso. Si no, responde a este mensaje para coordinar tu pago.' }
};
// Por defecto, el grupo → plantilla que ya existe en Meta
const PLANTILLAS_POR_GRUPO = { proximas: 'recordatorio_cuota', hoy: 'vence_hoy', gracia: 'cuota_vencida', atrasadas: 'cuota_vencida', acuerdo: 'recordatorio_cuota' };
// El dia del compromiso va como "hoy vence"; el dia antes, como recordatorio con la fecha del compromiso
function plantillaDe(grupo, it, plantillas) { if (grupo === 'acuerdo' && it.dias === 0) return (plantillas && plantillas.acuerdoHoy) || 'vence_hoy'; return (plantillas && plantillas[grupo]) || PLANTILLAS_POR_GRUPO[grupo]; }
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = iso => { const p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? parseInt(p[2], 10) + ' de ' + MESES[parseInt(p[1], 10) - 1] : String(iso || ''); };
const montoVE = n => (Math.round((parseFloat(n) || 0) * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });   // 88,14 como en la plantilla aprobada
// Los parametros y el texto final de una plantilla para una cuota
function armarPlantilla(nombre, it) {
  const pila = String(it.nombre || '').trim().split(/\s+/)[0] || 'cliente';
  const valores = { nombre: pila.charAt(0) + pila.slice(1).toLowerCase(), cuota: String(it.cuota), total: String(it.totalCuotas), monto: montoVE(it.monto), fecha: fechaLarga(it.fechaVence) };
  const def = PLANTILLAS[nombre];
  const vars = def ? def.vars : ['nombre', 'cuota', 'total', 'monto', 'fecha'];
  const params = vars.map(v => valores[v]);
  const texto = def ? def.texto.replace(/\{\{(\d)\}\}/g, (m, i) => params[parseInt(i, 10) - 1]) : W.waPlantilla(it.grupo || 'hoy', it);
  return { params, texto };
}

async function docs(q) { const s = await q.get(); return (s.docs || []).map(d => Object.assign({ id: d.id }, d.data())); }

async function correrEmpresa(deps, empresa, plantillas, hoy) {
  const db = deps.bases[empresa];
  const [creds, pagos, clientes] = await Promise.all([docs(db.collection('creditos')), docs(db.collection('pagos')), docs(db.collection('clientes'))]);
  const cola = W.waColaHoy(creds, pagos, clientes, hoy);
  const r = { empresa, candidatos: 0, enviados: 0, repetidos: 0, sinTelefono: 0, sinPlantilla: 0, fallos: 0 };
  for (const grupo of Object.keys(CUANDO)) {
    const items = (cola.grupos[grupo] || []).filter(CUANDO[grupo]);
    for (const it of items) {
      r.candidatos++;
      if (!it.tel) { r.sinTelefono++; continue; }
      const plantilla = plantillaDe(grupo, it, plantillas);
      if (!plantilla) { r.sinPlantilla++; continue; }
      const clave = `${empresa}_${it.cred}_${it.cuota}_${grupo}_${it.acuerdo ? it.fechaVence + '_' : ''}${it.dias}`;   // un envio por dia del calendario
      const regRef = db.collection('recordatorios').doc(clave);
      try { await regRef.create({ empresa, cred: it.cred, cuota: it.cuota, grupo, tel: it.tel, hoy, creado: deps.ahora(), estado: 'enviando' }); } catch (e) { r.repetidos++; continue; }
      const { params, texto } = armarPlantilla(plantilla, Object.assign({ grupo }, it));
      let metaId = '', estado = 'enviado', error = '';
      try { metaId = await deps.meta.enviarPlantilla(it.tel, plantilla, params, 'es'); r.enviados++; }
      catch (e) { estado = 'fallo'; error = String(e && e.message || e).slice(0, 160); r.fallos++; }
      await regRef.set({ estado, error, metaId }, { merge: true });
      const convRef = db.collection('conversaciones').doc('wa:' + it.tel);
      const c = await convRef.get();
      const ahora = deps.ahora();
      await convRef.set(Object.assign({ canal: 'whatsapp', telE164: it.tel, clienteId: it.clienteId, clienteNombre: it.nombre, cred: it.cred, ultimoMensaje: texto, ultimoMensajeHora: ahora, actualizado: ahora, empresa }, c.exists ? {} : { nombre: it.nombre, modo: 'bot', noLeidos: 0, creado: ahora }), { merge: true });
      await convRef.collection('mensajes').doc(metaId || clave).set({ metaId, direccion: 'saliente', autor: 'asistente', tipo: 'plantilla', texto, estado, error, hora: ahora, grupo });
    }
  }
  return r;
}

async function correr(deps, opciones) {
  const hoy = (opciones && opciones.hoy) || deps.hoy();
  const plantillas = (opciones && opciones.plantillas) || {};
  const res = [];
  for (const emp of Object.keys(deps.bases)) { try { res.push(await correrEmpresa(deps, emp, plantillas, hoy)); } catch (e) { res.push({ empresa: emp, error: String(e && e.message || e).slice(0, 160) }); } }
  return res;
}

module.exports = { correr, correrEmpresa, armarPlantilla, CUANDO, PLANTILLAS, PLANTILLAS_POR_GRUPO };
