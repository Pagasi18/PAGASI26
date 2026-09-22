// SOLO LECTURA. El catalogo de modelos vive en config/catalogo. Cada modelo lleva
// un numero (id) y la pantalla "Editar" busca por ESE numero: openEditCatalogo(id)
// hace CATALOGO.find(c => c.id === id). Si dos modelos comparten numero, al darle
// editar a uno se abre el OTRO (el primero de la lista). Tambien falla si el numero
// llego como texto ("12") o quedo vacio: entonces no encuentra nada y el formulario
// abre como si fuera un modelo nuevo.
//
// Este robot solo mira: numeros repetidos, numeros que no son numero, modelos con el
// mismo nombre y modelos con el mismo precio (que es lo que confundia al wizard viejo).
// El log de GitHub es publico: modelos y precios, sin nombres de clientes.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const n2 = x => Math.round((parseFloat(x) || 0) * 100) / 100;

function revisar(items) {
  const porId = {}, porNombre = {}, porPrecio = {}, raros = [];
  items.forEach((it, i) => {
    const id = it && it.id;
    const tipo = typeof id;
    if (id === undefined || id === null || id === '' || tipo !== 'number' || !isFinite(id)) {
      raros.push({ i, id: String(id), tipo, modelo: String((it && it.modelo) || '') });
    }
    const k = String(id);
    (porId[k] = porId[k] || []).push(it);
    const nom = String((it && it.modelo) || '').trim().toUpperCase();
    (porNombre[nom] = porNombre[nom] || []).push(it);
    const pr = n2(it && it.precio);
    (porPrecio[pr] = porPrecio[pr] || []).push(it);
  });
  const dupId = Object.entries(porId).filter(([, v]) => v.length > 1);
  const dupNom = Object.entries(porNombre).filter(([, v]) => v.length > 1);
  const dupPr = Object.entries(porPrecio).filter(([, v]) => v.length > 1);
  return { dupId, dupNom, dupPr, raros };
}

async function main() {
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  const doc = await db.collection('config').doc('catalogo').get();
  if (!doc.exists) { console.log('RESULTADO: no hay documento config/catalogo (el app usa el catalogo del codigo)'); return; }
  const data = doc.data() || {};
  const items = Array.isArray(data.items) ? data.items : [];
  console.log('LEIDO: config/catalogo · version ' + (data.version === undefined ? '(sin version)' : data.version) + ' · ' + items.length + ' modelos');
  console.log('');

  const { dupId, dupNom, dupPr, raros } = revisar(items);

  console.log('NUMEROS (id) REPETIDOS: ' + dupId.length);
  dupId.forEach(([id, v]) => {
    console.log('  id ' + id + ' lo comparten ' + v.length + ' modelos:');
    v.forEach((it, k) => console.log('    ' + (k === 0 ? '→ ABRE ESTE' : '  no se puede editar') + ' · ' + String(it.modelo || '') + ' · $' + n2(it.precio).toFixed(2) + (it.sede ? ' · ' + it.sede : '')));
  });

  console.log('');
  console.log('NUMEROS QUE NO SON NUMERO (no se pueden editar ni borrar): ' + raros.length);
  raros.forEach(r => console.log('  fila ' + r.i + ' · id ' + r.id + ' (' + r.tipo + ') · ' + r.modelo));

  console.log('');
  console.log('MODELOS CON EL MISMO NOMBRE: ' + dupNom.length);
  dupNom.forEach(([nom, v]) => console.log('  ' + nom + ' · ' + v.length + ' veces · ids ' + v.map(x => String(x.id)).join(', ')));

  console.log('');
  console.log('MODELOS CON EL MISMO PRECIO (confundian al asistente viejo): ' + dupPr.length + ' precios');
  dupPr.forEach(([pr, v]) => console.log('  $' + pr + ' · ' + v.map(x => String(x.modelo || '')).join(' / ')));

  console.log('');
  console.log('CATALOGO COMPLETO (id · modelo · precio · sede):');
  items.forEach(it => console.log('  ' + String(it.id) + ' · ' + String(it.modelo || '') + ' · $' + n2(it.precio).toFixed(2) + (it.sede ? ' · ' + it.sede : '') + (it.marca ? ' · marca ' + it.marca : '')));

  console.log('');
  const hayLio = dupId.length || raros.length;
  console.log('RESULTADO ' + (hayLio ? 'CON HALLAZGOS' : 'OK') + ' (solo lectura, no se cambio nada)');
}

if (require.main === module) main().catch(e => { console.log('RESULTADO ERROR: ' + (e && e.message || e)); process.exit(1); });
module.exports = { revisar };
