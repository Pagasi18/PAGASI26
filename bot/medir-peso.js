// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
/* Medicion (solo lectura): cuanto pesa lo que el app baja al abrir.

   Cuenta, por coleccion, cuantos documentos hay y cuantos bytes ocupan en
   JSON (aproxima lo que viaja por la red), el promedio, los 5 documentos mas
   pesados y que campos pesan mas dentro de ellos. No escribe nada.
   No imprime nombres de personas: solo ids, campos y numeros.               */

const { Firestore } = require('@google-cloud/firestore');

// Las 11 colecciones que el app escucha en vivo, mas gps (se pide al abrir)
const COLS = ['motos','clientes','creditos','pagos','egresos','movimientos','cuentasPendientes','facturas','concesionarios','tareas','recursos','gps'];

function kb(n){ return (n/1024).toFixed(1)+' KB'; }
function mb(n){ return (n/1024/1024).toFixed(2)+' MB'; }

(async () => {
  const db = new Firestore({ projectId: _proyecto() });
  let totalDocs = 0, totalBytes = 0;
  const filas = [];
  const camposGlobales = {};   // campo -> bytes acumulados (todas las colecciones)

  for (const col of COLS) {
    const snap = await db.collection(col).get();
    let bytes = 0; const docs = [];
    const campos = {};
    snap.forEach(d => {
      const data = d.data() || {};
      const s = JSON.stringify(data);
      bytes += s.length;
      // peso por campo (para saber que es lo gordo)
      const porCampo = {};
      Object.keys(data).forEach(k => {
        const b = JSON.stringify(data[k] === undefined ? null : data[k]).length + k.length + 3;
        porCampo[k] = b; campos[k] = (campos[k] || 0) + b;
        camposGlobales[col + '.' + k] = (camposGlobales[col + '.' + k] || 0) + b;
      });
      docs.push({ id: d.id, bytes: s.length, porCampo });
    });
    totalDocs += snap.size; totalBytes += bytes;
    docs.sort((a, b) => b.bytes - a.bytes);
    filas.push({ col, n: snap.size, bytes, top: docs.slice(0, 5), campos });
  }

  console.log('PESO POR COLECCION (lo que baja cada apertura)');
  console.log('  coleccion            docs      total     promedio/doc');
  filas.sort((a, b) => b.bytes - a.bytes).forEach(f => {
    console.log('  ' + f.col.padEnd(18) + String(f.n).padStart(6) + '  ' + mb(f.bytes).padStart(10) + '  ' + (f.n ? kb(f.bytes / f.n) : '-').padStart(10));
  });
  console.log('  TOTAL'.padEnd(20) + String(totalDocs).padStart(6) + '  ' + mb(totalBytes).padStart(10));

  console.log('\nCAMPOS MAS PESADOS (sumando todos los documentos)');
  Object.entries(camposGlobales).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, b]) => {
    console.log('  ' + k.padEnd(34) + mb(b).padStart(10) + '  (' + (100 * b / totalBytes).toFixed(1) + '% del total)');
  });

  console.log('\nDOCUMENTOS MAS PESADOS');
  filas.filter(f => f.n).slice(0, 4).forEach(f => {
    console.log('  ' + f.col + ':');
    f.top.slice(0, 3).forEach(d => {
      const gordos = Object.entries(d.porCampo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, b]) => k + ' ' + kb(b)).join(' · ');
      console.log('    ' + d.id.padEnd(14) + kb(d.bytes).padStart(9) + '   ' + gordos);
    });
  });

  console.log('\nRESULTADO docs=' + totalDocs + ' bytes=' + totalBytes + ' mb=' + (totalBytes / 1024 / 1024).toFixed(2));
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
