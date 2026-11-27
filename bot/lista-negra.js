/* Robot de la Lista negra (26-nov-2026): la «mala paga» automática.
   Adam: «mala paga de las dos formas» (a mano y sola). Lee los créditos, los pagos y los clientes de las
   DOS compañías (PAGASI 18 y PAGASI 26), y anota en la 26 —donde se vende— a quien tenga un crédito
   vigente con MÁS de 30 días de atraso o una moto recuperada:
     listaNegraAuto/{C<cédula>}        quién es, el motivo y de qué crédito sale
     listaNegraIndice/A-<clave>        la marca que el panel consulta al cargar un cliente
   Lo que ya no cumple (se puso al día) se borra solo. Lo anotado a mano por Verificación NO se toca.
   Corre en GitHub Actions con la cuenta de servicio de la 18, que también escribe en la 26.

   SOLO_LEER=1 calcula y muestra cantidades sin escribir. El log es público: sin nombres, cédulas ni
   teléfonos.                                                                                          */
'use strict';
const path = require('path');
const Ledger = require(path.join(__dirname, '..', 'logic', 'credito-ledger.js'));
const LN = require(path.join(__dirname, '..', 'logic', 'lista-negra.js'));

const PROYECTOS = { '18': 'pagasi-v2', '26': 'pagasi26-65ced' };
const DESTINO = 'pagasi26-65ced';
const DIAS_GRACIA = 5;

function hoyCaracas(ahora) { return new Date((ahora ? new Date(ahora) : new Date()).getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10); }
function diasEntre(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
// Días de atraso: la cuota vencida más vieja sin pagar, según el mismo motor de cuotas del sistema.
function atrasoDe(cred, pagos, hoy) {
  try {
    const est = Ledger.generarEstadoCredito(cred, pagos || [], { diasGracia: DIAS_GRACIA, today: hoy });
    let max = 0;
    (est.cuotas || []).forEach(q => { if (q && q.saldo > 0.001 && q.fechaVence && q.fechaVence < hoy) { const d = diasEntre(q.fechaVence, hoy); if (d > max) max = d; } });
    return max;
  } catch (e) { return parseInt(cred && cred.mora, 10) || 0; }
}
// De los datos de UNA compañía, quién entra a la lista automática: { C<cédula>: {...} }
function autoDeEmpresa(empresa, datos, hoy) {
  const pagosPorCred = {};
  // TODOS los pagos van al motor de cuotas, que es quien decide cuáles cuentan: un pago eliminado «manteniendo
  // la amortización» sigue pagando la cuota. Si se quitaban aquí, el robot anotaba como mala paga a alguien que
  // el sistema da al día (revisión del 26-nov-2026).
  (datos.pagos || []).forEach(p => { if (!p) return; (pagosPorCred[p.cred] || (pagosPorCred[p.cred] = [])).push(p); });
  const creditos = (datos.creditos || []).map(c => Object.assign({}, c, { dias: atrasoDe(c, pagosPorCred[c.id] || [], hoy) }));
  return LN.lnAutoDe(empresa, creditos, datos.clientes || []);
}
// Junta las dos compañías: la misma persona puede deber en las dos.
function juntar(partes) {
  const out = {};
  partes.forEach(m => Object.keys(m).forEach(k => {
    if (!out[k]) { out[k] = Object.assign({}, m[k], { detalle: m[k].detalle.slice() }); return; }
    out[k].detalle = out[k].detalle.concat(m[k].detalle);
    if (m[k].motivo === 'Moto recuperada') out[k].motivo = 'Moto recuperada';
    if (!out[k].telKey && m[k].telKey) { out[k].telKey = m[k].telKey; out[k].telefono = m[k].telefono; }
  }));
  return out;
}
// Las marcas del índice que corresponden a esa lista: una por cédula y una por teléfono.
function marcasDe(lista) {
  const m = {};
  Object.keys(lista).forEach(k => { m['A-' + k] = 1; if (lista[k].telKey) m['A-' + lista[k].telKey] = 1; });
  return m;
}
// Qué escribir y qué borrar, comparando con lo que ya hay (para no reescribir todo cada vez).
function plan(lista, marcas, yaDocs, yaMarcas) {
  const firma = x => JSON.stringify([x.nombre, x.telefono, x.motivo, x.detalle]);
  const escribir = Object.keys(lista).filter(k => !yaDocs[k] || firma(yaDocs[k]) !== firma(lista[k]));
  const borrar = Object.keys(yaDocs).filter(k => !lista[k]);
  const marcar = Object.keys(marcas).filter(k => !yaMarcas[k]);
  const desmarcar = Object.keys(yaMarcas).filter(k => !marcas[k]);
  return { escribir, borrar, marcar, desmarcar };
}

// Una base que responde sin créditos o sin clientes no es «nadie debe»: es una lectura mala. Con eso el plan
// borraría de la lista a todos los de esa compañía, así que mejor no escribir nada.
function lecturaCreible(datos) { return !!datos && (datos.creditos || []).length > 0 && (datos.clientes || []).length > 0; }
// El log es público: de un error solo sale su código o su tipo, nunca el mensaje (puede traer la ruta de un
// documento, que lleva la cédula).
function errorParaElLog(e) { return String((e && (e.code || e.name)) || 'error').replace(/[^A-Za-z0-9_\- ]/g, '').slice(0, 40); }

async function leerEmpresa(proyecto) {
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: proyecto });
  const [creds, pagos, clientes] = await Promise.all([
    db.collection('creditos').get(),
    db.collection('pagos').select('cred', 'monto', 'fecha', 'eliminado', 'estado', 'tipo', 'esInicial', 'tipoOperacion', 'mantenerEnAmortizacion').get(),
    db.collection('clientes').select('nombre', 'cedula', 'ci', 'tel', 'wa', 'eliminado').get()
  ]);
  const docs = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  return { creditos: docs(creds), pagos: docs(pagos), clientes: docs(clientes) };
}

async function main() {
  const soloLeer = /^(1|true|si)$/i.test(String(process.env.SOLO_LEER || ''));
  const hoy = hoyCaracas(), partes = [];
  for (const emp of Object.keys(PROYECTOS)) {
    const datos = await leerEmpresa(PROYECTOS[emp]);
    if (!lecturaCreible(datos)) throw Object.assign(new Error('lectura vacía'), { code: 'lectura-vacia-' + emp });
    const m = autoDeEmpresa(emp, datos, hoy);
    const rec = Object.keys(m).filter(k => m[k].motivo === 'Moto recuperada').length;
    console.log('PAGASI ' + emp + ': ' + datos.creditos.length + ' créditos · ' + datos.clientes.length + ' clientes → ' + Object.keys(m).length + ' personas en mala paga (' + rec + ' con moto recuperada)');
    partes.push(m);
  }
  const lista = juntar(partes), marcas = marcasDe(lista);
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: DESTINO });
  const [sDocs, sIdx] = await Promise.all([db.collection('listaNegraAuto').get(), db.collection('listaNegraIndice').get()]);
  const yaDocs = {}, yaMarcas = {};
  sDocs.docs.forEach(d => { yaDocs[d.id] = d.data(); });
  sIdx.docs.forEach(d => { if (d.id.indexOf('A-') === 0) yaMarcas[d.id] = 1; });
  const p = plan(lista, marcas, yaDocs, yaMarcas);
  console.log('Total: ' + Object.keys(lista).length + ' personas · ' + Object.keys(marcas).length + ' marcas. Cambios: ' + p.escribir.length + ' por escribir, ' + p.borrar.length + ' por borrar, ' + p.marcar.length + ' marcas nuevas, ' + p.desmarcar.length + ' marcas por quitar');
  if (soloLeer) { console.log('SOLO_LEER: no se escribió nada'); return; }
  const ahora = new Date().toISOString(), ops = [];
  p.escribir.forEach(k => ops.push(b => b.set(db.collection('listaNegraAuto').doc(k), Object.assign({}, lista[k], { actualizado: ahora }))));
  p.borrar.forEach(k => ops.push(b => b.delete(db.collection('listaNegraAuto').doc(k))));
  p.marcar.forEach(k => ops.push(b => b.set(db.collection('listaNegraIndice').doc(k), { t: 'auto', fecha: ahora })));
  p.desmarcar.forEach(k => ops.push(b => b.delete(db.collection('listaNegraIndice').doc(k))));
  for (let i = 0; i < ops.length; i += 400) { const b = db.batch(); ops.slice(i, i + 400).forEach(f => f(b)); await b.commit(); }
  console.log('Escrito en ' + DESTINO + ': ' + ops.length + ' cambios (' + ahora + ')');
}

module.exports = { atrasoDe, autoDeEmpresa, juntar, marcasDe, plan, hoyCaracas, lecturaCreible, errorParaElLog };
if (require.main === module) main().catch(e => { console.error('FALLO: ' + errorParaElLog(e) + ' (no se escribió nada más)'); process.exit(1); });
