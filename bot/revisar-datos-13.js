// SOLO LECTURA. Los 13 puntos de "Datos a revisar en la base" de la lista del 18-sep,
// medidos de una sola pasada. No cambia nada: dice cuantos hay y cuales, para que la
// oficina los corrija uno por uno.
//
// El log de GitHub es PUBLICO: salen numeros de credito, de moto y de cliente, pero
// NUNCA nombres, cedulas, telefonos ni saldos de cuentas.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const n2 = x => Math.round((parseFloat(x) || 0) * 100) / 100;
const dia = v => { if (!v) return ''; if (typeof v.toDate === 'function') return v.toDate().toISOString().slice(0, 10); return String(v).slice(0, 10); };
const VACIOS = ['NA','N/A','N.A','N.A.','NO','NO APLICA','SN','S/N','SIN','SIN SERIAL','SIN DATO','NINGUNO','NONE','NULL','-','--','---','—','.','..','0','00','X','XX','XXX','?','N°','#'];
const esVacio = v => { const t = String(v == null ? '' : v).trim().toUpperCase().replace(/\s+/g, ' '); return !t || VACIOS.indexOf(t) > -1; };
const norm = s => String(s == null ? '' : s).trim().toUpperCase().replace(/\s+/g, ' ');
const soloDigitos = s => String(s == null ? '' : s).replace(/\D/g, '');

// Un credito esta vivo si todavia se cobra
const VIVO = ['activo', 'mora'];
const esVivo = c => VIVO.indexOf(String(c.estado || '')) > -1;

function revisar(d) {
  const { creditos, motos, egresos, movimientos, clientes, empresa } = d;
  const motoPorId = {}; motos.forEach(m => { motoPorId[String(m.id)] = m; });
  const r = {};

  // 1. Dinero devuelto de mas por borrar motos o comisiones (punto 3, ya corregido el 18-sep)
  const reversos = movimientos.filter(m => !m.eliminado && m.tipo === 'deposito' && (m.reversoDe || /^Reverso /.test(String(m.concepto || ''))));
  const retirosAnulados = movimientos.filter(m => m.eliminado && m.tipo === 'retiro' && (m.tipoOperacion === 'compra_moto' || m.tipoOperacion === 'comision'));
  const dobles = [];
  retirosAnulados.forEach(o => {
    const revs = reversos.filter(rv => String(rv.reversoDe || '').indexOf(String(o.tipoOperacion) + ':') === 0
      && Math.abs(n2(rv.monto) - n2(o.monto)) < 0.01);
    if (revs.length) dobles.push({ ref: o.tipoOperacion === 'compra_moto' ? 'moto #' + o.motoIdRef : 'egreso #' + o.conceptoEgreso, monto: n2(o.monto) });
  });
  r.dineroDoble = dobles;

  // 2. Recuperados que volvieron a activo/mora, y solicitudes aprobadas sin inicial (punto 5)
  const pistaRecuperado = c => /recuper/i.test(String(c.razonCancelacion || '') + ' ' + String(c.notas || '')
    + ' ' + (Array.isArray(c.gestiones) ? c.gestiones.map(g => (g && (g.accion || g.nota)) || '').join(' ') : ''));
  r.recuperadosRevividos = creditos.filter(c => !c.eliminado && esVivo(c) && pistaRecuperado(c)).map(c => c.id);
  r.aprobadasSinInicial = creditos.filter(c => !c.eliminado && esVivo(c) && (parseFloat(c.ini) || 0) > 0
    && !d.pagos.some(p => p && !p.eliminado && p.cred === c.id
      && (p.esInicial || p.tipoOperacion === 'inicial_credito' || /^Inicial · /.test(String(p.concepto || ''))))).map(c => c.id);

  // 3. Motos recuperadas que quedaron "financiada" (punto 6)
  r.motosRecuperadas = motos.filter(m => !m.eliminado && String(m.estado || '') === 'recuperada').map(m => m.id);
  r.financiadasSinCreditoVivo = motos.filter(m => !m.eliminado && String(m.estado || '') === 'financiada'
    && !creditos.some(c => !c.eliminado && String(c.motoId) === String(m.id) && esVivo(c))).map(m => m.id);

  // 4. Creditos cuyo modelo no coincide con el de su moto (punto 4)
  r.modeloDistinto = creditos.filter(c => !c.eliminado && c.motoId != null && motoPorId[String(c.motoId)]
    && norm(c.modelo) && norm(motoPorId[String(c.motoId)].modelo)
    && norm(c.modelo) !== norm(motoPorId[String(c.motoId)].modelo))
    .map(c => ({ id: c.id, credito: norm(c.modelo), moto: norm(motoPorId[String(c.motoId)].modelo), motoId: c.motoId }));

  // 5. Datos registrales de la empresa (punto 7)
  const faltanRm = ['rm', 'rmEstado', 'rmNum', 'rmTomo', 'rmFecha'].filter(k => !String((empresa || {})[k] || '').trim());
  r.empresaFalta = faltanRm;
  r.firmadosDesde7Sep = creditos.filter(c => !c.eliminado && c.contratoFirmado
    && dia(c.fechaFirma || c.contratoFirmadoEn || c.fecha) >= '2026-09-07').length;

  // 6. Saldo de cada cuenta (punto 8). Solo se dice si esta en cero o no: el log es publico.
  const saldo = {};
  movimientos.filter(m => !m.eliminado).forEach(m => {
    const mt = n2(m.monto);
    if (m.cuentaOrigen) saldo[m.cuentaOrigen] = n2((saldo[m.cuentaOrigen] || 0) - mt);
    if (m.cuentaDestino) saldo[m.cuentaDestino] = n2((saldo[m.cuentaDestino] || 0) + mt);
  });
  r.cuentasConSaldo = Object.keys(saldo).map(c => ({ cuenta: c, enCero: Math.abs(saldo[c]) < 1 }));

  // 7. Solicitudes rechazadas con el gasto de la moto todavia vivo (punto 10)
  r.rechazadasConGasto = creditos.filter(c => !c.eliminado && ['cancelado', 'rechazado'].indexOf(String(c.estado || '')) > -1
    && c.motoId != null && egresos.some(e => e && !e.eliminado && String(e.motoIdRef) === String(c.motoId) && e.origenAuto === 'compra_moto'))
    .map(c => ({ id: c.id, motoId: c.motoId }));

  // 8. Creditos vivos sin moto
  r.vivosSinMoto = creditos.filter(c => !c.eliminado && esVivo(c)
    && (c.motoId == null || c.motoId === '' || !motoPorId[String(c.motoId)])).map(c => c.id);

  // 9. Creditos que comparten moto (dos creditos apuntando a la misma unidad)
  const porMoto = {};
  creditos.filter(c => !c.eliminado && esVivo(c) && c.motoId != null).forEach(c => {
    (porMoto[String(c.motoId)] = porMoto[String(c.motoId)] || []).push(c.id);
  });
  r.motosCompartidas = Object.keys(porMoto).filter(k => porMoto[k].length > 1).map(k => ({ motoId: k, creditos: porMoto[k] }));

  // 10. VIN repetido entre motos
  const porVin = {};
  motos.filter(m => !m.eliminado && !esVacio(m.vin)).forEach(m => {
    const k = norm(m.vin); (porVin[k] = porVin[k] || []).push(m.id);
  });
  r.vinRepetido = Object.keys(porVin).filter(k => porVin[k].length > 1).map(k => porVin[k]);

  // 11. Creditos con serial de chasis vacio o escrito "NA" (punto 20)
  r.serialNA = creditos.filter(c => !c.eliminado && esVivo(c) && esVacio(c.serialChasis)).map(c => c.id);

  // 12. Clientes repetidos por cedula (punto 21)
  const porCed = {};
  clientes.filter(c => !c.eliminado && soloDigitos(c.cedula).length >= 5).forEach(c => {
    const k = soloDigitos(c.cedula); (porCed[k] = porCed[k] || []).push(c.id);
  });
  r.clientesRepetidos = Object.keys(porCed).filter(k => porCed[k].length > 1).map(k => porCed[k]);

  // 13. Motos sin su gasto de compra
  r.motosSinGasto = motos.filter(m => !m.eliminado
    && !egresos.some(e => e && !e.eliminado && String(e.motoIdRef) === String(m.id) && e.origenAuto === 'compra_moto')).map(m => m.id);

  return r;
}

function lista(arr, max) {
  const n = max || 25;
  const txt = arr.slice(0, n).map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(', ');
  return arr.length > n ? txt + ' … y ' + (arr.length - n) + ' más' : (txt || '—');
}

async function main() {
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  const leer = async c => { const s = await db.collection(c).get(); const a = []; s.forEach(d => a.push(Object.assign({ id: d.id }, d.data() || {}))); return a; };
  const [creditos, motos, egresos, movimientos, clientes, pagos, empDoc] = await Promise.all([
    leer('creditos'), leer('motos'), leer('egresos'), leer('movimientos'), leer('clientes'), leer('pagos'),
    db.collection('config').doc('empresa').get(),
  ]);
  const empresa = empDoc.exists ? empDoc.data() : null;
  console.log('LEIDO: ' + creditos.length + ' créditos · ' + motos.length + ' motos · ' + egresos.length + ' gastos · '
    + movimientos.length + ' movimientos · ' + clientes.length + ' clientes · ' + pagos.length + ' pagos');
  console.log('');

  const r = revisar({ creditos, motos, egresos, movimientos, clientes, pagos, empresa });
  const linea = (n, t, cant, det) => {
    console.log((cant ? '⚠ ' : '✓ ') + n + '. ' + t + ': ' + cant);
    if (cant && det) console.log('     ' + det);
  };

  linea(1, 'Dinero devuelto dos veces que siga vivo', r.dineroDoble.length, lista(r.dineroDoble.map(x => x.ref)));
  linea(2, 'Créditos recuperados que volvieron a activo o mora', r.recuperadosRevividos.length, lista(r.recuperadosRevividos));
  linea(2, 'Créditos vivos con inicial en el plan y SIN pago inicial registrado', r.aprobadasSinInicial.length, lista(r.aprobadasSinInicial));
  linea(3, 'Motos en estado "recuperada"', r.motosRecuperadas.length, lista(r.motosRecuperadas));
  linea(3, 'Motos "financiada" sin crédito vivo', r.financiadasSinCreditoVivo.length, lista(r.financiadasSinCreditoVivo));
  linea(4, 'Créditos cuyo modelo no coincide con el de su moto', r.modeloDistinto.length,
    r.modeloDistinto.slice(0, 25).map(x => x.id + ' dice "' + x.credito + '" y la moto #' + x.motoId + ' es "' + x.moto + '"').join(' · '));
  linea(5, 'Datos registrales de la empresa que faltan', r.empresaFalta.length, r.empresaFalta.join(', '));
  console.log('     contratos firmados desde el 7-sep: ' + r.firmadosDesde7Sep + (r.empresaFalta.length ? ' (salieron sin Registro Mercantil)' : ''));
  linea(6, 'Cuentas con saldo distinto de cero', r.cuentasConSaldo.filter(c => !c.enCero).length,
    r.cuentasConSaldo.map(c => c.cuenta + (c.enCero ? ' (en cero)' : '')).join(' · '));
  linea(7, 'Solicitudes rechazadas con el gasto de la moto vivo', r.rechazadasConGasto.length,
    r.rechazadasConGasto.slice(0, 25).map(x => x.id + ' → moto #' + x.motoId).join(' · '));
  linea(8, 'Créditos vivos sin moto', r.vivosSinMoto.length, lista(r.vivosSinMoto));
  linea(9, 'Motos compartidas por dos créditos vivos', r.motosCompartidas.length,
    r.motosCompartidas.slice(0, 25).map(x => 'moto #' + x.motoId + ': ' + x.creditos.join(' y ')).join(' · '));
  linea(10, 'VIN repetido entre motos', r.vinRepetido.length, r.vinRepetido.slice(0, 25).map(g => 'motos ' + g.join(' y ')).join(' · '));
  linea(11, 'Créditos vivos con el serial de chasis vacío o "NA"', r.serialNA.length, lista(r.serialNA));
  linea(12, 'Clientes repetidos por cédula', r.clientesRepetidos.length, r.clientesRepetidos.slice(0, 25).map(g => g.join(' = ')).join(' · '));
  linea(13, 'Motos sin su gasto de compra', r.motosSinGasto.length, lista(r.motosSinGasto));

  console.log('');
  console.log('RESULTADO OK (solo lectura, no se cambió nada)');
}

if (require.main === module) main().catch(e => { console.log('RESULTADO ERROR: ' + (e && e.message || e)); process.exit(1); });
module.exports = { revisar };
