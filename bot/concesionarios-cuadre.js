// SOLO LECTURA. Saca lo que hace falta para cuadrar el modulo de Concesionarios
// contra el control en Excel que lleva la oficina (SALDOS_DISPONIBLES_CONCESIONARIOS):
// por cada credito, la sede, la fecha, el modelo y los montos guardados (precio,
// precio base real, inicial, financiado) y por cada sede sus anticipos cargados.
// El log de GitHub es publico: SIN nombres, cedulas ni telefonos. Para poder
// cruzar con el Excel se imprime solo una huella corta del nombre del cliente.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const { Firestore } = require('@google-cloud/firestore');
const crypto = require('crypto');

function huella(nombre) {
  const n = String(nombre || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
  return n ? crypto.createHash('sha256').update(n).digest('hex').slice(0, 10) : '';
}
function texto(v) { if (!v) return ''; if (typeof v.toDate === 'function') return v.toDate().toISOString(); return String(v); }
function num(v) { const x = parseFloat(v); return isNaN(x) ? '' : Math.round(x * 100) / 100; }
const diaVE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' });

(async () => {
  const db = new Firestore({ projectId: _proyecto() });
  const conc = await db.collection('concesionarios').get();
  console.log('SEDES ' + conc.size);
  conc.forEach(d => {
    const c = d.data() || {};
    const ants = Array.isArray(c.anticipos) ? c.anticipos.filter(a => a && !a.eliminado) : [];
    console.log('SEDE|' + d.id + '|' + String(c.nombre || '').replace(/\|/g, ' ') + '|' + String(c.ciudad || '').replace(/\|/g, ' ') + '|anticipos=' + ants.length + '|enviado=' + num(ants.reduce((s, a) => s + (parseFloat(a.monto) || 0), 0)) + '|eliminado=' + (c.eliminado ? 1 : 0));
    ants.forEach(a => console.log('ANT|' + d.id + '|' + texto(a.fecha).slice(0, 10) + '|' + num(a.monto) + '|' + String(a.metodo || '')));
  });
  const snap = await db.collection('creditos').get();
  console.log('CREDITOS ' + snap.size);
  console.log('CRED|id|fecha|creadoVE|sede|modelo|precio|precioBaseReal|ini|fin|total|estado|eliminado|huella');
  const filas = [];
  snap.forEach(d => {
    const c = d.data() || {};
    const t = c.creado ? new Date(texto(c.creado)) : null;
    filas.push({ n: parseInt(String(d.id).replace(/\D/g, ''), 10) || 0, l: ['CRED', d.id, texto(c.fecha).slice(0, 10), (t && isFinite(t.getTime())) ? diaVE.format(t) : '',
      String(c.concesionarioId || ''), String(c.modelo || '').replace(/\|/g, ' '), num(c.precio), num(c.precioBaseReal), num(c.ini), num(c.fin), num(c.total),
      String(c.estado || ''), c.eliminado ? 1 : 0, huella(c.cli)].join('|') });
  });
  filas.sort((a, b) => a.n - b.n).forEach(f => console.log(f.l));
  console.log('RESULTADO OK sedes=' + conc.size + ' creditos=' + snap.size);
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
