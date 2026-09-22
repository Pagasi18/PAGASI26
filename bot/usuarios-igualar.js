// Copia el ROL y los PERMISOS de un usuario a otro (Adam, 16-sep-2026:
// "necesito que jofanny tenga el mismo permiso de samanta"). Por defecto SOLO
// SIMULA; con GUARDAR=true escribe rol y permisos en la ficha del destino.
// Busca por nombre (sin acentos, may/min); si un patron calza con mas de un
// usuario se detiene y los lista. Los concesionarios asignados NO se copian
// (eso es el alcance por sede, no el permiso): solo se avisa si difieren.
// El log de GitHub es publico: los nombres salen recortados a 3 letras.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const { Firestore } = require('@google-cloud/firestore');

const DE = String(process.env.DE || '').trim();
const A = String(process.env.A || '').trim();
const GUARDAR = String(process.env.GUARDAR || '').trim() === 'true';

function norm(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function corto(s) { const n = norm(s).replace(/[^A-Z ]/g, '').trim(); return n ? n.slice(0, 3) + '···' : '(sin nombre)'; }
function lista(perms) { return Array.isArray(perms) ? perms.slice().sort().join(',') : '(sin lista)'; }

(async () => {
  if (!DE || !A) { console.log('RESULTADO ERROR: faltan DE y A'); process.exit(1); }
  const db = new Firestore({ projectId: _proyecto() });
  const snap = await db.collection('usuarios').get();
  const usuarios = [];
  snap.forEach(d => { const u = d.data() || {}; usuarios.push({ uid: d.id, nombre: u.nombre || '', rol: u.rol || '', permisos: u.permisos, concesionarios: u.concesionarios || [], suspendido: !!u.suspendido }); });
  const buscar = (patron) => usuarios.filter(u => norm(u.nombre).includes(norm(patron)));
  const origen = buscar(DE), destino = buscar(A);
  for (const [tag, lst, pat] of [['ORIGEN', origen, DE], ['DESTINO', destino, A]]) {
    if (lst.length !== 1) {
      console.log('RESULTADO ERROR: el patron "' + pat + '" (' + tag + ') calza con ' + lst.length + ' usuarios:');
      lst.forEach(u => console.log('  ' + u.uid + ' · ' + corto(u.nombre) + ' · rol ' + u.rol));
      process.exit(1);
    }
  }
  const o = origen[0], t = destino[0];
  if (o.uid === t.uid) { console.log('RESULTADO ERROR: origen y destino son el mismo usuario'); process.exit(1); }
  console.log('ORIGEN  ' + o.uid + ' · ' + corto(o.nombre) + ' · rol ' + o.rol + ' · permisos [' + lista(o.permisos) + ']' + (o.suspendido ? ' · SUSPENDIDO' : ''));
  console.log('DESTINO ' + t.uid + ' · ' + corto(t.nombre) + ' · rol ' + t.rol + ' · permisos [' + lista(t.permisos) + ']' + (t.suspendido ? ' · SUSPENDIDO' : ''));
  console.log('CAMBIO  rol: ' + t.rol + ' -> ' + o.rol + ' · permisos: ' + (lista(t.permisos) === lista(o.permisos) ? 'ya son iguales' : '[' + lista(t.permisos) + '] -> [' + lista(o.permisos) + ']'));
  if (String(o.concesionarios.sort()) !== String(t.concesionarios.sort()))
    console.log('AVISO   los concesionarios asignados difieren (origen ' + o.concesionarios.length + ', destino ' + t.concesionarios.length + '): NO se copian');
  if (!GUARDAR) { console.log('RESULTADO SIMULADO (GUARDAR=true para escribir)'); return; }
  const data = { rol: o.rol };
  if (Array.isArray(o.permisos)) data.permisos = o.permisos.slice();
  await db.collection('usuarios').doc(t.uid).update(data);
  console.log('RESULTADO GUARDADO: ' + corto(t.nombre) + ' quedo con rol ' + o.rol + ' y ' + (Array.isArray(o.permisos) ? o.permisos.length + ' permisos' : 'los permisos del rol'));
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
