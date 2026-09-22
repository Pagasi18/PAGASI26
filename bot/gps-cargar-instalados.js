// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
/* Carga puntual: marca como INSTALADOS los equipos del Excel maestro de GPS.

   El modulo de GPS ya tiene los 500 equipos como "stock" (se importaron en su
   dia), y su importador SALTA los idGps repetidos, asi que pegar el Excel otra
   vez no los actualiza. Este script los actualiza uno por uno, escribiendo los
   mismos campos que escribe el boton "Asignar" del modulo.

   Los datos salen de gps-instalados.json, generado del Excel "PAGASI Control
   GPS_MASTER". Las fechas del Excel venian con el dia y el mes volteados
   (9 de abril en vez de 4 de septiembre); ya vienen corregidas en el JSON.

   Se ejecuta a mano desde Actions. Con --dry no escribe nada.        */

const DRY = process.argv.includes('--dry');
const { Firestore } = require('@google-cloud/firestore');
const equipos = require('./gps-instalados.json');

(async () => {
  const db = new Firestore({ projectId: _proyecto() });

  // Los creditos, para no asignar un equipo a un credito que no existe
  const credsSnap = await db.collection('creditos').get();
  const creds = {};
  credsSnap.forEach(d => { const c = d.data(); if (c && !c.eliminado) creds[String(c.id || d.id)] = c; });

  // Los equipos, indexados por su ID de MiCODUS
  const gpsSnap = await db.collection('gps').get();
  const porIdGps = {};
  gpsSnap.forEach(d => {
    const g = { _doc: d.id, ...d.data() };
    if (g.idGps && !g.eliminado) porIdGps[String(g.idGps)] = g;
  });
  console.log(`Base: ${Object.keys(creds).length} creditos · ${Object.keys(porIdGps).length} equipos`);

  // Un credito no puede tener dos equipos instalados
  const yaTomado = {};
  Object.values(porIdGps).forEach(g => {
    if (g.creditoId && g.estado === 'instalado') yaTomado[String(g.creditoId)] = String(g.idGps);
  });

  const lote = db.batch();
  let ok = 0, saltados = 0;

  for (const e of equipos) {
    const g = porIdGps[String(e.idGps)];
    if (!g) { console.log(`  ${e.idGps} — no esta en la coleccion gps`); saltados++; continue; }
    if (!creds[e.creditoId]) { console.log(`  ${e.idGps} — el credito ${e.creditoId} no existe`); saltados++; continue; }

    const dueno = yaTomado[e.creditoId];
    if (dueno && dueno !== String(e.idGps)) {
      console.log(`  ${e.idGps} — ${e.creditoId} ya tiene el equipo ${dueno}`); saltados++; continue;
    }
    if (g.estado === 'instalado' && String(g.creditoId) === e.creditoId) {
      console.log(`  ${e.idGps} — ya estaba en ${e.creditoId}`); saltados++; continue;
    }

    const o = {
      estado: 'instalado',
      creditoId: e.creditoId,
      fechaInstalacion: e.fechaInstalacion,
      actualizado: new Date().toISOString(),
    };
    // Lo demas solo si el Excel lo trae: no pisar con vacio lo que ya haya
    ['iccid', 'linea', 'imei', 'tecnico', 'verificadoPor'].forEach(k => { if (e[k]) o[k] = e[k]; });
    if (e.passGps) o.pass = e.passGps;

    console.log(`  ${e.idGps} -> ${e.creditoId}  ${e.cliente} (${e.placa}) · ${e.fechaInstalacion}`);
    if (!DRY) lote.update(db.collection('gps').doc(g._doc), o);
    yaTomado[e.creditoId] = String(e.idGps);
    ok++;
  }

  if (!DRY && ok) await lote.commit();
  console.log(`\n${DRY ? '(dry-run) ' : ''}${ok} actualizados · ${saltados} saltados`);
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
