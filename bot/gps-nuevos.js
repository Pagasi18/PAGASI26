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
   GPS: EQUIPOS NUEVOS DE MiCODUS que todavia no estan en el modulo

   Adam (14-sep-2026): "actualizame el modulo del GPS con los nuevos de
   MiCODUS para poder encontrar CRED-523 y activarle su cuenta con GPS".
   El robot de posiciones (gps-micodus.js) solo actualiza los equipos que YA
   estan en el modulo; los nuevos entran con el importador del modulo. Este
   robot entra a MiCODUS (SOLO LEE), compara con el modulo y trata de saber el
   credito de cada equipo por el nombre que tiene en MiCODUS: si trae el numero
   de credito ("CRED-523") o la placa de la moto de UN credito vigente.
     - Con GUARDAR=true (y el OK de Adam) crea en el modulo SOLO los equipos
       nuevos que reconocio sin dudas. No toca los que ya estan.
     - Tambien avisa de equipos que ya estan en el modulo sin credito pero cuyo
       nombre en MiCODUS apunta a uno. Con ASIGNAR=true (y el OK de Adam) les
       pone ese credito y los marca instalados; con SOLO=true, solo al del
       credito que se pidio revisar. No toca nada mas del equipo.
   Log publico: sin placas, seriales, nombres ni posiciones; solo cantidades y
   numeros de credito.
   ══════════════════════════════════════════════════════════════════════════ */

const NO_VIVOS = ['cancelado', 'recuperado', 'recuperada'];
const placaNormal = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// Como se ve un nombre sin mostrarlo: letras → A, numeros → 9
const forma = s => String(s || '').trim().replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, 'A').replace(/[0-9]/g, '9').slice(0, 24);
function credIdDe(texto) {
  const m = String(texto || '').toUpperCase().match(/CRED\s*-?\s*(\d{1,5})/);
  return m ? 'CRED-' + String(parseInt(m[1], 10)).padStart(3, '0') : '';
}

function indices(gpsApp, creds) {
  const vivos = (creds || []).filter(c => c && !c.eliminado && NO_VIVOS.indexOf(String(c.estado || '')) === -1);
  const porId = new Map(vivos.map(c => [String(c.id).toUpperCase(), c]));
  const porPlaca = new Map();
  vivos.forEach(c => { const p = placaNormal(c.placa); if (p.length >= 5) porPlaca.set(p, (porPlaca.get(p) || []).concat([c])); });
  const conEquipo = new Set((gpsApp || [])
    .filter(g => g && !g.eliminado && String(g.estado) === 'instalado' && g.creditoId).map(g => String(g.creditoId)));
  return { porId, porPlaca, conEquipo };
}

// El credito al que apunta el nombre del equipo en MiCODUS, o null si no hay certeza
function resolver(carNum, idx) {
  const id = credIdDe(carNum);
  if (id && idx.porId.has(id)) return { cred: idx.porId.get(id), por: 'numero' };
  const lista = idx.porPlaca.get(placaNormal(carNum)) || [];
  if (lista.length === 1) return { cred: lista[0], por: 'placa' };
  return null;
}

function planNuevos(equipos, gpsApp, creds) {
  const idx = indices(gpsApp, creds);
  const enModulo = new Set();   // tambien los eliminados: no se vuelven a crear
  (gpsApp || []).forEach(g => {
    if (g && g.idGps) enModulo.add(String(g.idGps));
    if (g && g.imei) enModulo.add(String(g.imei));
  });
  const nuevos = (equipos || []).filter(e => e && e.sn && !enModulo.has(String(e.sn)));
  const vinculados = [], conflicto = [], sinCredito = [];
  const tomados = new Set();
  const intentar = (e, r) => {
    const credId = String(r.cred.id);
    if (idx.conEquipo.has(credId)) { conflicto.push({ sn: String(e.sn), carNum: e.carNum || '', credId, motivo: 'ese credito ya tiene equipo en el modulo' }); return; }
    if (tomados.has(credId)) { conflicto.push({ sn: String(e.sn), carNum: e.carNum || '', credId, motivo: 'otro equipo de MiCODUS apunta al mismo credito' }); return; }
    tomados.add(credId);
    vinculados.push({ sn: String(e.sn), carNum: e.carNum || '', credId, por: r.por });
  };
  // Primero los que traen el numero de credito (lo mas seguro), despues por placa
  const resueltos = nuevos.map(e => ({ e, r: resolver(e.carNum, idx) }));
  resueltos.filter(x => x.r && x.r.por === 'numero').forEach(x => intentar(x.e, x.r));
  resueltos.filter(x => x.r && x.r.por === 'placa').forEach(x => intentar(x.e, x.r));
  resueltos.filter(x => !x.r).forEach(x => sinCredito.push({ sn: String(x.e.sn), carNum: x.e.carNum || '' }));
  return { nuevos, vinculados, conflicto, sinCredito };
}

// Equipos que ya estan en el modulo sin credito, cuyo nombre en MiCODUS apunta a un credito libre
function planSinVincular(equipos, gpsApp, creds) {
  const idx = indices(gpsApp, creds);
  const porSn = new Map((equipos || []).filter(e => e && e.sn).map(e => [String(e.sn), e]));
  const res = [];
  (gpsApp || []).forEach(g => {
    if (!g || g.eliminado || g.creditoId) return;
    const e = porSn.get(String(g.idGps || '')) || porSn.get(String(g.imei || ''));
    const r = e && resolver(e.carNum, idx);
    if (r && !idx.conEquipo.has(String(r.cred.id))) res.push({ gpsId: g._id || g.id, credId: String(r.cred.id), por: r.por });
  });
  return res;
}

// Lo que se cambia en un equipo que ya estaba en el modulo sin credito: nada mas que esto
function cambioAsignar(sv, ahoraISO) {
  return { creditoId: sv.credId, estado: 'instalado', actualizado: ahoraISO,
    asignadoPor: 'Robot MiCODUS (reconocido por ' + sv.por + ')' };
}

// El equipo que se crea en el modulo: lo que se sabe de MiCODUS, nada inventado
function docNuevo(v, ahoraISO, n) {
  return {
    id: 'GPS-' + Date.parse(ahoraISO) + '-' + n.toString(36) + '-' + Math.floor(Math.random() * 1296).toString(36),
    estado: 'instalado', idGps: v.sn, imei: '', linea: '', iccid: '', passwordGps: '',
    creditoId: v.credId, placaMicodus: v.carNum || '', fechaInstalacion: '', tecnico: '',
    estadoMicodus: '', verificadoPor: '', observaciones: 'Traído de MiCODUS por el robot (reconocido por ' + v.por + ')',
    eliminado: false, creado: ahoraISO, creadoPor: 'Robot MiCODUS', importado: true
  };
}

async function main() {
  const GUARDAR = process.env.GUARDAR === 'true';
  const ASIGNAR = process.env.ASIGNAR === 'true';
  const SOLO = process.env.SOLO === 'true';
  const OBJ = String(process.env.CREDITO || 'CRED-523').trim().toUpperCase();
  const micodus = require('./gps-micodus.js');
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });

  let equipos = [];
  try { equipos = await micodus.listarEquipos(await micodus.entrar()); }
  catch (e) { console.log('RESULTADO ERROR MiCODUS: ' + e.message); process.exit(1); }
  const [gpsSnap, credSnap] = await Promise.all([db.collection('gps').get(), db.collection('creditos').get()]);
  const gpsApp = gpsSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  const creds = credSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const plan = planNuevos(equipos, gpsApp, creds);
  const sueltos = planSinVincular(equipos, gpsApp, creds);
  const porNumero = plan.vinculados.filter(v => v.por === 'numero').length;

  console.log('MiCODUS: ' + equipos.length + ' equipos · en el modulo: ' + gpsApp.filter(g => !g.eliminado).length
    + ' · nuevos (no estan en el modulo): ' + plan.nuevos.length);
  console.log('  nuevos que se reconocen: ' + plan.vinculados.length + ' (por numero de credito ' + porNumero + ', por placa ' + (plan.vinculados.length - porNumero) + ')'
    + ' · con conflicto: ' + plan.conflicto.length + ' · sin credito reconocible: ' + plan.sinCredito.length);
  if (plan.vinculados.length) console.log('  creditos que se vincularian: ' + plan.vinculados.map(v => v.credId).join(', '));
  if (sueltos.length) console.log('  ya en el modulo SIN credito pero MiCODUS apunta a uno (asignar a mano): ' + sueltos.map(s => s.credId).join(', '));
  const formas = {};
  plan.sinCredito.forEach(e => { const f = forma(e.carNum) || '(vacio)'; formas[f] = (formas[f] || 0) + 1; });
  const top = Object.entries(formas).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (top.length) console.log('  forma de los nombres que no se reconocen (A=letra, 9=numero): ' + top.map(([f, n]) => '"' + f + '" x' + n).join(' · '));

  const c = creds.find(x => String(x.id).toUpperCase() === OBJ);
  const enMod = gpsApp.filter(g => !g.eliminado && String(g.creditoId || '').toUpperCase() === OBJ);
  const v = plan.vinculados.find(x => x.credId === OBJ), k = plan.conflicto.find(x => x.credId === OBJ), s = sueltos.find(x => x.credId === OBJ);
  console.log('  ' + OBJ + ': credito ' + (c ? 'existe (' + (c.estado || 'sin estado') + ', placa ' + (placaNormal(c.placa) ? 'cargada' : 'SIN cargar') + ')' : 'NO existe')
    + ' · equipo en el modulo: ' + (enMod.length ? enMod.map(g => (g.estado || 'sin estado') + (g.idGps ? ', con ID de MiCODUS' : ', SIN ID de MiCODUS')).join(' / ') : 'ninguno')
    + ' · en MiCODUS: ' + (v ? 'equipo nuevo, se vincularia (por ' + v.por + ')' : k ? 'aparece, pero ' + k.motivo
      : s ? 'esta en el modulo sin credito (asignar a mano)' : 'ningun equipo trae su numero ni su placa'));

  if (!GUARDAR && !ASIGNAR) {
    console.log('RESULTADO dry nuevos=' + plan.nuevos.length + ' vinculables=' + plan.vinculados.length + ' conflicto=' + plan.conflicto.length
      + ' sin=' + plan.sinCredito.length + ' sueltos=' + sueltos.length);
    return;
  }
  const ahora = new Date().toISOString();
  let guardados = 0, asignados = 0;
  for (let i = 0; GUARDAR && i < plan.vinculados.length; i += 400) {
    const parte = plan.vinculados.slice(i, i + 400);
    const lote = db.batch();
    parte.forEach((x, j) => { const doc = docNuevo(x, ahora, i + j + 1); lote.set(db.collection('gps').doc(doc.id), doc); });
    await lote.commit();
    guardados += parte.length;
  }
  if (ASIGNAR) {
    for (const sv of sueltos.filter(x => !SOLO || x.credId === OBJ)) {
      const ref = db.collection('gps').doc(String(sv.gpsId));
      const hecho = await db.runTransaction(async tx => {
        const d = await tx.get(ref);
        const g = d.exists ? d.data() : null;
        if (!g || g.eliminado || g.creditoId) return false;      // alguien lo cambio mientras tanto: no se pisa
        tx.update(ref, cambioAsignar(sv, ahora));
        return true;
      });
      if (hecho) { asignados++; console.log('  asignado: ' + sv.credId); }
    }
  }
  console.log('RESULTADO guardados=' + guardados + ' asignados=' + asignados + ' conflicto=' + plan.conflicto.length
    + ' sin=' + plan.sinCredito.length + ' sueltos=' + sueltos.length);
}

if (require.main === module) {
  main().catch(e => { console.log('RESULTADO ERROR ' + e.message); process.exit(1); });
}

module.exports = { planNuevos, planSinVincular, cambioAsignar, docNuevo, placaNormal, forma, credIdDe };
