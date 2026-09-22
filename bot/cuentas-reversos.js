// SOLO LECTURA. Cuanto dinero de mas muestran las cuentas por el punto 3 de la lista
// de arreglos: al eliminar una moto o un pago de comision, el sistema anula el retiro
// (eso ya devuelve el dinero, porque el saldo no cuenta lo anulado) y ademas crea un
// deposito de reverso (lo devuelve otra vez). Con "sin regresar el dinero" tambien
// lo devuelve, porque el retiro queda anulado igual.
//
// Para cada retiro de compra de moto o de comision cuenta cuantas veces volvio el
// dinero a la cuenta (retiro anulado + reversos vivos) y lo compara con lo que se
// eligio al borrar. La diferencia es lo que sobra en esa cuenta.
// El log de GitHub es publico: sin nombres de clientes ni de empleados, sin saldos.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const n2 = x => Math.round((parseFloat(x) || 0) * 100) / 100;
const money = x => (x < 0 ? '-$' : '$') + Math.abs(n2(x)).toFixed(2);
const dia = v => { if (!v) return ''; if (typeof v.toDate === 'function') return v.toDate().toISOString().slice(0, 10); return String(v).slice(0, 10); };
const RAZONES = ['Error de captura', 'Moto duplicada', 'Datos incorrectos', 'Operación cancelada', 'Orden del administrador'];
const razon = r => !r ? '—' : (RAZONES.indexOf(r) > -1 ? r : 'Otro (texto libre)');

function medir(movs, egresos, motos) {
  const egPorId = {}; egresos.forEach(e => { egPorId[String(e.id)] = e; });
  const motoPorId = {}; motos.forEach(m => { motoPorId[String(m.id)] = m; });

  const origenes = movs.filter(m => m.tipo === 'retiro' && (m.tipoOperacion === 'compra_moto' || m.tipoOperacion === 'comision'));
  const reversos = movs.filter(m => !m.eliminado && m.tipo === 'deposito' && (m.reversoDe || /^Reverso /.test(String(m.concepto || ''))));

  // Cada reverso vivo se engancha a su retiro original
  const usados = new Set(), sinEnlace = [];
  const tomar = (cands, rev) => {
    const o = cands.find(c => !usados.has(c._k) && String(c.cuentaOrigen || '') === String(rev.cuentaDestino || '') && Math.abs(n2(c.monto) - n2(rev.monto)) < 0.01)
           || cands.find(c => !usados.has(c._k) && Math.abs(n2(c.monto) - n2(rev.monto)) < 0.01);
    return o || null;
  };
  const reversosDe = {};   // _k del retiro -> [reversos]
  reversos.forEach(rev => {
    const r = String(rev.reversoDe || '');
    let cands = [];
    if (r.indexOf('compra_moto:') === 0) cands = origenes.filter(o => o.tipoOperacion === 'compra_moto' && String(o.motoIdRef) === r.slice(12));
    else if (r.indexOf('comision:') === 0) cands = origenes.filter(o => o.tipoOperacion === 'comision' && String(o.conceptoEgreso) === r.slice(9));
    else if (r.indexOf('egreso:') === 0) cands = origenes.filter(o => String(o.conceptoEgreso) === r.slice(7));
    else if (!r) { sinEnlace.push(rev); return; }
    else return;   // otros reversos (egresos manuales): netean con su retiro, que nunca se anula
    if (!cands.length) return;
    // Un reverso "egreso:" y uno "compra_moto:" pueden caer sobre el mismo retiro: no se marca usado
    const o = r.indexOf('egreso:') === 0 ? cands[0] : tomar(cands, rev);
    if (!o) return;
    if (r.indexOf('egreso:') !== 0) usados.add(o._k);
    (reversosDe[o._k] = reversosDe[o._k] || []).push(rev);
  });

  const eventos = [];
  origenes.forEach(o => {
    const revs = reversosDe[o._k] || [];
    const devueltas = (o.eliminado ? 1 : 0) + revs.length;
    const eg = egPorId[String(o.conceptoEgreso)] || null;
    let pedido = 0, eleccion = 'sigue vigente', cuando = '', porque = '', tipo = o.tipoOperacion;
    if (tipo === 'compra_moto') {
      const m = motoPorId[String(o.motoIdRef)] || {};
      if (m.eliminado) {
        pedido = m.eliminacionReversaCuenta === false ? 0 : 1;
        eleccion = m.eliminacionReversaCuenta === false ? 'moto borrada SIN regresar' : 'moto borrada regresando el dinero';
        cuando = dia(m.eliminadoEn); porque = razon(m.eliminadoRazon);
      } else if (eg && eg.eliminado) {
        pedido = eg.eliminacionReversaCuenta ? 1 : 0;
        eleccion = 'gasto de la moto borrado en Finanzas ' + (eg.eliminacionReversaCuenta ? 'regresando' : 'SIN regresar');
        cuando = dia(eg.eliminadoEn); porque = razon(eg.eliminadoRazon);
      }
    } else {
      if (eg && eg.eliminado) {
        const dev = eg.devolvioDinero != null ? !!eg.devolvioDinero : !!eg.eliminacionReversaCuenta;
        pedido = dev ? 1 : 0;
        eleccion = 'pago de comision borrado ' + (dev ? 'regresando el dinero' : 'SIN regresar');
        cuando = dia(eg.eliminadoEn); porque = eg.eliminadoRazon ? 'con razon' : '—';
      }
    }
    const sobra = (devueltas - pedido) * n2(o.monto);
    if (devueltas === 0 && pedido === 0) return;
    eventos.push({ tipo, cuenta: String(o.cuentaOrigen || '(sin cuenta)'), monto: n2(o.monto), fecha: dia(o.fecha), cuando, porque,
      eleccion, devueltas, pedido, sobra, retiroAnulado: !!o.eliminado, reversos: revs.length, revKeys: revs.map(r => r._k),
      ref: tipo === 'compra_moto' ? 'moto #' + o.motoIdRef : 'egreso #' + o.conceptoEgreso });
  });
  return { eventos, sinEnlace };
}

async function main() {
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  const [movSnap, egSnap, motoSnap, ctaDoc] = await Promise.all([
    db.collection('movimientos').get(), db.collection('egresos').get(), db.collection('motos').get(),
    db.collection('config').doc('cuentasBanc').get(),
  ]);
  const movs = [], egresos = [], motos = [];
  movSnap.forEach(d => movs.push(Object.assign({ _k: d.id }, d.data() || {})));
  egSnap.forEach(d => egresos.push(Object.assign({ id: d.id }, d.data() || {})));
  motoSnap.forEach(d => motos.push(Object.assign({ id: d.id }, d.data() || {})));
  const cuentas = ((ctaDoc.exists && ctaDoc.data().lista) || []).map(c => String(c.nombre || ''));

  const { eventos, sinEnlace } = medir(movs, egresos, motos);
  console.log('LEIDO: ' + movs.length + ' movimientos · ' + egresos.length + ' egresos · ' + motos.length + ' motos · cuentas: ' + cuentas.join(', '));

  const conError = eventos.filter(e => Math.abs(e.sobra) >= 0.01).sort((a, b) => (a.cuando + a.fecha).localeCompare(b.cuando + b.fecha));
  const bien = eventos.length - conError.length;
  console.log('RETIROS DE MOTO/COMISION QUE SE ANULARON O REVIRTIERON: ' + eventos.length + ' (' + bien + ' bien, ' + conError.length + ' con dinero de mas o de menos)');

  const porCuenta = {};
  conError.forEach(e => { const c = porCuenta[e.cuenta] = porCuenta[e.cuenta] || { sobra: 0, n: 0 }; c.sobra += e.sobra; c.n++; });
  console.log('');
  console.log('SOBRANTE POR CUENTA (lo que el saldo del sistema muestra de mas):');
  Object.entries(porCuenta).sort((a, b) => b[1].sobra - a[1].sobra)
    .forEach(([c, v]) => console.log('  ' + c + ' · ' + money(v.sobra) + ' · ' + v.n + ' caso(s)'));
  const total = conError.reduce((s, e) => s + e.sobra, 0);
  console.log('  TOTAL · ' + money(total));

  const porTipo = {};
  conError.forEach(e => { const k = e.eleccion + ' · devuelto ' + e.devueltas + ' vez/veces, debia ' + e.pedido; const t = porTipo[k] = porTipo[k] || { s: 0, n: 0 }; t.s += e.sobra; t.n++; });
  console.log('');
  console.log('POR TIPO DE CASO:');
  Object.entries(porTipo).sort((a, b) => b[1].s - a[1].s).forEach(([k, v]) => console.log('  ' + k + ' · ' + v.n + ' · ' + money(v.s)));

  console.log('');
  console.log('DETALLE (fecha de borrado · cuenta · monto · que se eligio · razon · veces devuelto/debia · sobra · referencia):');
  conError.forEach(e => console.log('  ' + (e.cuando || '?') + ' · ' + e.cuenta + ' · ' + money(e.monto) + ' · ' + e.eleccion + ' · ' + e.porque
    + ' · ' + e.devueltas + '/' + e.pedido + ' · ' + money(e.sobra) + ' · ' + e.ref + ' (compra del ' + (e.fecha || '?') + ')'));

  if (sinEnlace.length) {
    console.log('');
    console.log('REVERSOS VIEJOS SIN ENLACE (no se pueden atribuir solos): ' + sinEnlace.length + ' · ' + money(sinEnlace.reduce((s, m) => s + n2(m.monto), 0)));
    sinEnlace.forEach(m => console.log('  ' + dia(m.fecha) + ' · ' + String(m.cuentaDestino || '') + ' · ' + money(m.monto) + ' · ' + String(m.concepto || '').split(' · ')[0]));
  }
  console.log('');
  console.log('RESULTADO OK (solo lectura, no se cambio nada)');
}

if (require.main === module) main().catch(e => { console.log('RESULTADO ERROR: ' + (e && e.message || e)); process.exit(1); });
module.exports = { medir };
