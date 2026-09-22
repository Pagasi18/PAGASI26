// Correccion puntual del punto 3 (18-sep-2026): anula los depositos de reverso
// REPETIDOS de las motos que se borraron "regresando el dinero" con el codigo
// viejo (el retiro ya estaba anulado, que ya devolvia el dinero, y el reverso lo
// devolvio otra vez). Solo toca el caso claro: retiro anulado + UN reverso vivo,
// cuando se eligio regresar. Cualquier otro caso se lista y no se toca.
//
// Por defecto NO escribe (--dry). Para escribir hay que pasar la cantidad y el
// total que se esperan (ESPERADO_N, ESPERADO_TOTAL): si no coinciden con lo que
// encuentra, no escribe nada. Respaldo y correccion van en una sola transaccion
// (respaldos/cuentas-reversos-<fecha>). Los movimientos no se borran: quedan
// anulados con nota. El log es publico: sin nombres ni saldos.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const { medir } = require('./cuentas-reversos.js');

const n2 = x => Math.round((parseFloat(x) || 0) * 100) / 100;
const money = x => '$' + n2(x).toFixed(2);
const dia = v => { if (!v) return ''; if (typeof v.toDate === 'function') return v.toDate().toISOString().slice(0, 10); return String(v).slice(0, 10); };
const RAZON = 'Corrección 18-sep: reverso repetido (punto 3)';

// Decide que reversos anular. Devuelve {anular:[{k,cuenta,monto,ref,fecha}], revisar:[evento]}
function plan(eventos, movPorK) {
  const anular = [], revisar = [];
  eventos.filter(e => Math.abs(e.sobra) >= 0.01).forEach(e => {
    const claro = e.retiroAnulado && e.reversos === 1 && e.pedido === 1 && e.devueltas === 2
      && /regresando/.test(e.eleccion) && !/SIN/.test(e.eleccion);
    if (!claro) { revisar.push(e); return; }
    const k = e.revKeys[0], m = movPorK[k] || {};
    anular.push({ k, cuenta: String(m.cuentaDestino || ''), monto: n2(m.monto), ref: e.ref, fecha: dia(m.fecha), reversoDe: String(m.reversoDe || '') });
  });
  return { anular, revisar };
}

async function main() {
  const dry = process.argv.includes('--dry');
  const espN = parseInt(process.env.ESPERADO_N || '', 10);
  const espT = n2(process.env.ESPERADO_TOTAL || '');
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });

  const leer = async () => {
    const [movSnap, egSnap, motoSnap] = await Promise.all([db.collection('movimientos').get(), db.collection('egresos').get(), db.collection('motos').get()]);
    const movs = [], egresos = [], motos = [], movPorK = {};
    movSnap.forEach(d => { const m = Object.assign({ _k: d.id }, d.data() || {}); movs.push(m); movPorK[d.id] = m; });
    egSnap.forEach(d => egresos.push(Object.assign({ id: d.id }, d.data() || {})));
    motoSnap.forEach(d => motos.push(Object.assign({ id: d.id }, d.data() || {})));
    return { movs, egresos, motos, movPorK };
  };

  const A = await leer();
  const { eventos } = medir(A.movs, A.egresos, A.motos);
  const { anular, revisar } = plan(eventos, A.movPorK);
  const total = n2(anular.reduce((s, a) => s + a.monto, 0));
  const porCuenta = {};
  anular.forEach(a => { porCuenta[a.cuenta] = n2((porCuenta[a.cuenta] || 0) + a.monto); });

  console.log('REVERSOS REPETIDOS PARA ANULAR: ' + anular.length + ' · total ' + money(total));
  anular.forEach(a => console.log('  ' + a.fecha + ' · ' + a.cuenta + ' · ' + money(a.monto) + ' · ' + a.ref + ' · doc ' + a.k));
  console.log('EFECTO EN EL SALDO DEL SISTEMA:');
  Object.entries(porCuenta).forEach(([c, v]) => console.log('  ' + c + ' baja ' + money(v)));
  if (revisar.length) {
    console.log('CASOS QUE NO SE TOCAN (revisar a mano): ' + revisar.length);
    revisar.forEach(e => console.log('  ' + e.cuenta + ' · ' + money(e.monto) + ' · ' + e.eleccion + ' · ' + e.devueltas + '/' + e.pedido + ' · ' + e.ref));
  }

  if (dry) { console.log('RESULTADO dry=1 anular=' + anular.length + ' total=' + total.toFixed(2) + ' · nada escrito'); return; }
  if (!(espN === anular.length && Math.abs(espT - total) < 0.01))
    throw new Error('lo encontrado (' + anular.length + ' · ' + money(total) + ') no coincide con lo esperado (' + espN + ' · ' + money(espT) + '): no se escribio nada');
  if (!anular.length) { console.log('RESULTADO nada que anular'); return; }

  const idRespaldo = 'cuentas-reversos-' + new Date().toISOString().replace(/[:.]/g, '-');
  const respaldoRef = db.collection('respaldos').doc(idRespaldo);
  const ahora = new Date().toISOString();
  let hechos = 0;
  await db.runTransaction(async t => {
    const refs = anular.map(a => db.collection('movimientos').doc(a.k));
    const snaps = await t.getAll(...refs);
    const antes = [];
    snaps.forEach((s, i) => {
      const d = s.exists ? s.data() : null;
      // Se vuelve a mirar dentro de la transaccion: si alguien lo toco en el medio, no se escribe nada
      if (!d || d.eliminado || String(d.reversoDe || '') !== anular[i].reversoDe || Math.abs(n2(d.monto) - anular[i].monto) >= 0.01)
        throw new Error('el movimiento ' + anular[i].k + ' cambio mientras tanto: no se escribio nada');
      antes.push({ doc: s.id, datos: d });
    });
    t.set(respaldoRef, { tipo: 'cuentas-reversos-repetidos', creado: ahora, motivo: RAZON, movimientos: antes });
    refs.forEach(r => t.update(r, { eliminado: true, eliminadoPor: 'Corrección punto 3 (robot)', eliminadoEn: ahora, eliminadoRazon: RAZON }));
    hechos = refs.length;
  });
  console.log('Respaldo: respaldos/' + idRespaldo + ' (' + hechos + ' movimientos como estaban)');

  const B = await leer();
  const despues = medir(B.movs, B.egresos, B.motos).eventos.filter(e => Math.abs(e.sobra) >= 0.01);
  const sobra = n2(despues.reduce((s, e) => s + e.sobra, 0));
  const anulados = anular.filter(a => B.movPorK[a.k] && B.movPorK[a.k].eliminado).length;
  console.log('VERIFICACION: ' + anulados + '/' + hechos + ' anulados · dinero de mas que queda: ' + money(sobra));
  console.log('RESULTADO dry=0 anulados=' + anulados + ' total=' + total.toFixed(2) + ' queda=' + sobra.toFixed(2) + ' respaldo=respaldos/' + idRespaldo);
  if (anulados !== hechos) throw new Error('verificacion: ' + anulados + ' de ' + hechos);
}

if (require.main === module) main().catch(e => { console.log('RESULTADO ERROR: ' + (e && e.message || e)); process.exit(1); });
module.exports = { plan };
