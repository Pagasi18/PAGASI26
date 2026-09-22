// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
/* Limpieza puntual (una sola vez): la copia duplicada del wizard en los creditos.

   Cada credito guardaba el formulario del wizard DOS veces, en wizardDraft y
   en wizardData, con el mismo contenido. La medicion del 10-sep-2026 dio
   2,17 MB en cada campo: 4,3 MB de los 12 MB que el app baja al abrir.
   El sistema lee cualquiera de los dos (c.wizardDraft || c.wizardData) y
   desde esa noche ya no guarda wizardData en los creditos nuevos ni al editar.

   Este script borra wizardData SOLO cuando es byte por byte identico a
   wizardDraft (se compara el JSON de los dos). Si un credito tiene wizardData
   pero no wizardDraft, o si las dos copias no son iguales, NO se toca y se
   reporta. Asi no se pierde ningun dato: la copia que queda es identica.

   Antes de borrar guarda en respaldos/<id> la lista de creditos tocados (id y
   tamaño; el contenido no se copia porque queda intacto en wizardDraft).
   Solo escribe el campo wizardData. El log no muestra nombres.

   Se ejecuta a mano desde Actions. Con --dry no escribe nada.            */

const LOTE = 400;   // escrituras por lote (Firestore admite 500)

function mb(n){ return (n / 1024 / 1024).toFixed(2) + ' MB'; }

async function correr(db, opts) {
  opts = opts || {};
  const dry = !!opts.dry;
  const log = opts.log || console.log;
  const borrar = opts.borrar || require('@google-cloud/firestore').FieldValue.delete();

  const snap = await db.collection('creditos').get();
  let total = 0, conCopia = 0, distintos = 0, sinDraft = 0, bytes = 0;
  const aLimpiar = [], raros = [];
  snap.forEach(d => {
    total++;
    const c = d.data() || {};
    if (!('wizardData' in c)) return;
    conCopia++;
    if (!('wizardDraft' in c)) { sinDraft++; raros.push(d.id + ' (no tiene wizardDraft)'); return; }
    const sData = JSON.stringify(c.wizardData === undefined ? null : c.wizardData);
    const sDraft = JSON.stringify(c.wizardDraft === undefined ? null : c.wizardDraft);
    if (sData !== sDraft) { distintos++; raros.push(d.id + ' (las dos copias no son iguales)'); return; }
    bytes += sData.length;
    aLimpiar.push({ ref: d.ref, id: d.id, bytes: sData.length });
  });

  log(`Base: ${total} creditos · ${conCopia} con wizardData`);
  log(`  A LIMPIAR (copia identica a wizardDraft): ${aLimpiar.length} · ${mb(bytes)} menos por apertura`);
  log(`  se quedan · sin wizardDraft: ${sinDraft} · copias distintas: ${distintos}`);
  raros.slice(0, 20).forEach(r => log('    se queda ' + r));

  if (dry || !aLimpiar.length) {
    log(`\n${dry ? '(dry-run) ' : ''}${aLimpiar.length} ${dry ? 'se limpiarian' : 'para limpiar'} · nada escrito`);
    log(`RESULTADO dry=${dry ? 1 : 0} limpiar=${aLimpiar.length} limpiadas=0 verificadas=0 bytes=${bytes}`);
    return { limpiar: aLimpiar.length, limpiadas: 0, verificadas: 0, bytes, respaldo: null };
  }

  // Respaldo: que creditos se tocaron (el contenido queda intacto en wizardDraft)
  const idRespaldo = 'wizard-duplicado-' + new Date().toISOString().replace(/[:.]/g, '-');
  await db.collection('respaldos').doc(idRespaldo).set({
    tipo: 'quitar-wizard-duplicado',
    creado: new Date().toISOString(),
    campo: 'wizardData',
    motivo: 'wizardData era una copia identica de wizardDraft en cada credito (4,3 MB por apertura)',
    nota: 'El contenido no se copia aqui: queda intacto en wizardDraft de cada credito.',
    creditos: aLimpiar.map(x => ({ id: x.id, bytes: x.bytes })),
  });

  // Borrado por lotes; se vuelve a leer cada credito dentro del lote para no
  // borrar si alguien cambio wizardDraft en el medio
  let hechos = 0;
  for (let i = 0; i < aLimpiar.length; i += LOTE) {
    const parte = aLimpiar.slice(i, i + LOTE);
    const frescos = await db.getAll(...parte.map(x => x.ref));
    const b = db.batch();
    let n = 0;
    frescos.forEach(s => {
      if (!s.exists) return;
      const c = s.data() || {};
      if (!('wizardData' in c) || !('wizardDraft' in c)) return;
      if (JSON.stringify(c.wizardData) !== JSON.stringify(c.wizardDraft)) return;
      b.update(s.ref, { wizardData: borrar });
      n++;
    });
    if (n) await b.commit();
    hechos += n;
    log(`  lote ${Math.floor(i / LOTE) + 1}: ${n} limpiados`);
  }

  const despues = await db.getAll(...aLimpiar.map(x => x.ref));
  const verificadas = despues.filter(s => s.exists && !('wizardData' in (s.data() || {}))).length;
  log(`\nRespaldo: respaldos/${idRespaldo} (${aLimpiar.length} creditos)`);
  log(`${hechos} copias borradas · verificadas ${verificadas}/${aLimpiar.length}`);
  log(`RESULTADO dry=0 limpiar=${aLimpiar.length} limpiadas=${hechos} verificadas=${verificadas} bytes=${bytes} respaldo=respaldos/${idRespaldo}`);
  if (verificadas !== aLimpiar.length) throw new Error(`verificacion: ${verificadas} de ${aLimpiar.length} quedaron sin wizardData`);
  return { limpiar: aLimpiar.length, limpiadas: hechos, verificadas, bytes, respaldo: 'respaldos/' + idRespaldo };
}

if (require.main === module) {
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  correr(db, { dry: process.argv.includes('--dry') })
    .catch(e => { console.error('ERROR', e.message); process.exit(1); });
}

module.exports = { correr, LOTE };
