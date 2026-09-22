// GPS en Mi cuenta: estado (SOLO LECTURA). Para revisar despues de activar a
// un cliente: que fichas hay, si tienen posicion, hace cuanto las reviso el
// robot, si el boton del cliente puede despertar al robot y los pedidos.
// El log de GitHub es publico: sin nombres, telefonos ni coordenadas.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const { Firestore } = require('@google-cloud/firestore');

function horasDesdeTexto(txt, ahora) {
  if (!txt) return null;
  let s = String(txt).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += ' 12:00:00';
  const t = new Date(s.replace(' ', 'T') + (/(z|[+-]\d\d:?\d\d)$/i.test(s) ? '' : 'Z')).getTime();
  return isFinite(t) ? (ahora - t) / 3600000 : null;
}
const h = x => (x === null ? '—' : x < 1 ? Math.round(x * 60) + ' min' : x.toFixed(1) + ' h');

(async () => {
  const db = new Firestore({ projectId: _proyecto() });
  const ahora = Date.now();
  const cfg = (await db.collection('config').doc('gps').get()).data() || {};
  console.log('config/gps · direccion del robot (workerUrl): ' + (cfg.workerUrl ? 'si' : 'NO')
    + ' · ultimo barrido hace ' + h(horasDesdeTexto(cfg.ultimaSync, ahora)));

  const fichas = await db.collection('ubicacion_cliente').get();
  console.log('Clientes con GPS en Mi cuenta: ' + fichas.size);
  let incompletas = 0;
  fichas.forEach(d => {
    const f = d.data();
    const pos = typeof f.lat === 'number' && typeof f.lng === 'number';
    if (!pos || !f.workerUrl) incompletas++;
    console.log('  ' + d.id + ' · posicion: ' + (pos ? 'si' : 'NO')
      + ' · ultima senal hace ' + h(horasDesdeTexto(f.ultimaSenal, ahora))
      + ' · revisada hace ' + h(horasDesdeTexto(f.revisado, ahora))
      + ' · boton despierta al robot: ' + (f.workerUrl ? 'si' : 'NO'));
  });

  const pedidos = await db.collection('pedidos_gps').get();
  console.log('Pedidos de clientes (boton "Actualizar ubicacion"): ' + pedidos.size);
  pedidos.forEach(d => {
    const t = d.data().pedidoEn;
    const ms = t && typeof t.toMillis === 'function' ? t.toMillis() : 0;
    console.log('  ' + d.id + ' · hace ' + (ms ? h((ahora - ms) / 3600000) : '—'));
  });

  console.log('RESULTADO fichas=' + fichas.size + ' incompletas=' + incompletas
    + ' pedidos=' + pedidos.size + ' workerUrl=' + (cfg.workerUrl ? 1 : 0));
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
