// SOLO LECTURA. Lista los creditos de un dia con su estado y sus fechas, para
// cuadrar el grafico "Creditos otorgados" del dashboard con la lista de
// Creditos. Un credito entra si su fecha, o su hora de creacion (en UTC o en
// hora de Venezuela), cae en ese dia.
// El log de GitHub es publico: sin nombres, cedulas ni telefonos.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const { Firestore } = require('@google-cloud/firestore');

const DIA = String(process.env.DIA || '').trim();
const diaVE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' });

function texto(v) {
  if (!v) return '';
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  return String(v);
}

(async () => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(DIA)) { console.log('RESULTADO ERROR: dia debe ser AAAA-MM-DD'); process.exit(1); }
  const db = new Firestore({ projectId: _proyecto() });
  const snap = await db.collection('creditos').get();
  const filas = [];
  snap.forEach(d => {
    const c = d.data();
    const fecha = texto(c.fecha);
    const creado = texto(c.creado);
    const t = creado ? new Date(creado) : null;
    const creadoVE = t && isFinite(t.getTime()) ? diaVE.format(t) : '';
    const marcas = [];
    if (fecha.slice(0, 10) === DIA) marcas.push('fecha');
    if (creado.slice(0, 10) === DIA) marcas.push('creado-UTC');
    if (creadoVE === DIA) marcas.push('creado-VE');
    if (!marcas.length) return;
    filas.push({ id: d.id, n: parseInt(String(d.id).replace(/\D/g, ''), 10) || 0, estado: c.estado || '(sin estado)',
      eliminado: !!c.eliminado, fecha: fecha.slice(0, 25), creado: creado.slice(0, 19), creadoVE, marcas });
  });
  filas.sort((a, b) => a.n - b.n);
  console.log('Creditos que tocan el ' + DIA + ' (de ' + snap.size + ' en total):');
  filas.forEach(f => console.log('  ' + f.id + ' · estado ' + f.estado + ' · eliminado ' + (f.eliminado ? 'SI' : 'no')
    + ' · fecha ' + (f.fecha || '—') + ' · creado ' + (f.creado || '—') + ' (VE ' + (f.creadoVE || '—') + ')'
    + ' · coincide por: ' + f.marcas.join(', ')));
  const porFecha = filas.filter(f => f.marcas.includes('fecha'));
  const cuenta = arr => arr.reduce((o, f) => { const k = f.estado + (f.eliminado ? ' (eliminado)' : ''); o[k] = (o[k] || 0) + 1; return o; }, {});
  console.log('Por fecha = ' + DIA + ': ' + porFecha.length + ' · ' + JSON.stringify(cuenta(porFecha)));
  console.log('RESULTADO filas=' + filas.length + ' porFecha=' + porFecha.length);
})().catch(e => { console.log('RESULTADO ERROR ' + e.message); process.exit(1); });
