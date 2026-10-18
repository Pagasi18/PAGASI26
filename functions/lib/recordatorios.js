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
function compartido(nombre) { const copia = path.join(__dirname, '..', 'logic', nombre); return require(fs.existsSync(copia) ? copia : path.join(__dirname, '..', '..', 'logic', nombre)); }
global.S = global.S || { creds: [], pagos: [], clientes: [] };
global.CreditoLedger = global.CreditoLedger || compartido('credito-ledger.js');
const W = compartido('whatsapp.js');
const briefing = require('./briefing');

// Que grupo manda hoy y con que dia exacto (para no escribir todos los dias)
const CUANDO = { proximas: it => it.dias === -2, hoy: it => it.dias === 0, gracia: it => it.dias === 3, atrasadas: it => it.dias === 6 };

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
      const plantilla = plantillas && plantillas[grupo];
      if (!plantilla) { r.sinPlantilla++; continue; }
      const clave = `${empresa}_${it.cred}_${it.cuota}_${grupo}`;
      const regRef = db.collection('recordatorios').doc(clave);
      try { await regRef.create({ empresa, cred: it.cred, cuota: it.cuota, grupo, tel: it.tel, hoy, creado: deps.ahora(), estado: 'enviando' }); } catch (e) { r.repetidos++; continue; }
      const texto = W.waPlantilla(grupo, it);
      // {{1}} nombre de pila · {{2}} cuota · {{3}} total de cuotas · {{4}} monto · {{5}} fecha
      const pila = String(it.nombre || '').trim().split(/\s+/)[0] || 'cliente';
      const params = [pila.charAt(0) + pila.slice(1).toLowerCase(), String(it.cuota), String(it.totalCuotas), briefing.money(it.monto), briefing.fecha(it.fechaVence)];
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

module.exports = { correr, correrEmpresa, CUANDO };
