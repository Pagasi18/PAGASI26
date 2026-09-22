// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
/* Limpieza puntual (una sola vez): notas de cobranza pegadas.

   Hasta el 10-sep-2026 la nota de cobranza de un credito (En gestion de cobro,
   Promesa de pago, No contesta...) solo se cambiaba a mano, asi que muchos
   clientes que ya pagaron siguen marcados. Desde esa fecha el sistema la quita
   sola al registrar un pago que deja al cliente al dia (logic/pagos.js), pero
   eso no arregla las que ya estaban pegadas. Este script si.

   Quita una nota solo si se cumplen las tres:
     1. es una nota de DEUDA: la misma lista que usa el sistema. "Cliente con
        problema" y "En revision" nunca se tocan.
     2. el cliente esta al dia: la misma regla que usa el sistema.
     3. el cliente hizo un pago real en los ultimos 30 dias. Sin eso no hay
        forma de saber si la nota es vieja: un "Avisado" puesto antes de que
        venza la cuota es valido aunque el cliente este al dia.

   La lista y la regla se leen de logic/pagos.js, no se copian, para que el
   script y el sistema no puedan decir cosas distintas.

   Antes de escribir guarda un respaldo en respaldos/<id> con cada credito y su
   nota anterior, para poder devolverlas. Solo escribe el campo cobranzaStatus.
   El log NO muestra nombres de clientes: los logs de Actions son publicos.

   Se ejecuta a mano desde Actions. Con --dry no escribe nada.        */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VENTANA_DIAS = 30;
const MAXIMO = 250;   // si salen mas, algo raro pasa: no se escribe nada

// Igual que en assets/pagasi-app.js
function parseFechaLocal(v) {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T12:00:00');
  return new Date(s);
}

function isoLocal(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// La lista de notas de deuda y la regla "al dia", tal cual estan en logic/pagos.js
function cargarRegla() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'logic', 'pagos.js'), 'utf8');
  const ini = src.indexOf('var NOTAS_COBRANZA_DE_DEUDA');
  const fin = src.indexOf('function recalcularCreditoDesdePagos(');
  if (ini < 0 || fin <= ini) throw new Error('No encontre la regla de notas en logic/pagos.js');
  const ctx = vm.createContext({ parseFechaLocal, Date });
  vm.runInContext(src.slice(ini, fin), ctx);
  if (!Array.isArray(ctx.NOTAS_COBRANZA_DE_DEUDA) || typeof ctx._creditoAlDia !== 'function') {
    throw new Error('La regla de notas de logic/pagos.js no cargo bien');
  }
  return { notas: ctx.NOTAS_COBRANZA_DE_DEUDA.slice(), alDia: ctx._creditoAlDia };
}

// Un pago que el cliente hizo de verdad: confirmado, no eliminado, no la inicial
function esPagoReal(p) {
  return !!p && !!p.cred && !p.eliminado
    && (p.estado || 'confirmado') === 'confirmado'
    && !p.esInicial
    && p.tipoOperacion !== 'inicial_credito'
    && !(p.concepto && String(p.concepto).indexOf('Inicial · ') === 0)
    && (parseFloat(p.monto) || 0) > 0;
}

// Fecha (AAAA-MM-DD) del ultimo pago real de cada credito
function ultimosPagos(pagos) {
  const ult = {};
  (pagos || []).forEach(p => {
    if (!esPagoReal(p)) return;
    const f = String(p.fecha || '').slice(0, 10);
    const k = String(p.cred);
    if (f && (!ult[k] || f > ult[k])) ult[k] = f;
  });
  return ult;
}

// Que hacer con un credito: 'limpiar' o el motivo por el que se queda
function evaluar(c, ultimo, regla, limiteISO) {
  const nota = String((c && c.cobranzaStatus) || '');
  if (!nota) return { accion: 'sin_nota', nota };
  if (c.eliminado) return { accion: 'eliminado', nota };
  if (c.estado === 'cancelado') return { accion: 'cancelado', nota };
  if (regla.notas.indexOf(nota) < 0) return { accion: 'no_es_de_deuda', nota };
  let total = c.totalCuotas || ((parseInt(c.plazo, 10) || 0) * 2);   // igual que recalcularCreditoDesdePagos
  if (total < 0) total = 0;
  const pagadas = parseInt(c.pagado || 0, 10) || 0;
  if (!regla.alDia(c, pagadas, total, c.estado)) return { accion: 'atrasado', nota };
  const ult = ultimo[String(c.id)] || '';
  if (!ult || ult < limiteISO) return { accion: 'sin_pago_reciente', nota, ultimoPago: ult };
  return { accion: 'limpiar', nota, ultimoPago: ult };
}

const ETIQUETAS = {
  no_es_de_deuda: 'otras notas (Cliente con problema / En revision)',
  atrasado: 'siguen atrasados',
  sin_pago_reciente: `al dia pero sin pago en los ultimos ${VENTANA_DIAS} dias`,
  eliminado: 'credito eliminado',
  cancelado: 'credito cancelado',
};

async function correr(db, opts) {
  opts = opts || {};
  const dry = !!opts.dry;
  const log = opts.log || console.log;
  const regla = cargarRegla();

  // Filtro opcional: limpiar solo algunas notas (p.ej. solo 'gestion').
  // Solo se aceptan notas que ya esten en la lista de deuda del sistema:
  // pedir 'problema' o una nota inventada es un error, no un permiso.
  if (opts.notas && opts.notas.length) {
    const malas = opts.notas.filter(n => regla.notas.indexOf(n) < 0);
    if (malas.length) throw new Error('Notas fuera de la lista de deuda: ' + malas.join(', '));
    regla.notas = regla.notas.filter(n => opts.notas.indexOf(n) >= 0);
    log('Filtro: solo ' + regla.notas.join(', ') + ' (las demas notas de deuda se quedan)');
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy); limite.setDate(limite.getDate() - VENTANA_DIAS);
  const limiteISO = isoLocal(limite);

  const [credsSnap, pagosSnap] = await Promise.all([
    db.collection('creditos').get(),
    db.collection('pagos').get(),
  ]);
  const pagos = [];
  pagosSnap.forEach(d => pagos.push(d.data()));
  const ultimo = ultimosPagos(pagos);

  let totalCreds = 0;
  const conteo = {};
  const candidatos = [];
  credsSnap.forEach(d => {
    totalCreds++;
    const c = Object.assign({}, d.data());
    if (!c.id) c.id = d.id;
    const r = evaluar(c, ultimo, regla, limiteISO);
    if (r.accion === 'sin_nota') return;
    conteo[r.accion] = (conteo[r.accion] || 0) + 1;
    if (r.accion === 'limpiar') candidatos.push({ ref: d.ref, id: String(c.id), nota: r.nota, ultimoPago: r.ultimoPago });
  });

  const conNota = Object.values(conteo).reduce((a, b) => a + b, 0);
  const porNota = {};
  candidatos.forEach(x => { porNota[x.nota] = (porNota[x.nota] || 0) + 1; });
  log(`Base: ${totalCreds} creditos · ${pagos.length} pagos · hoy ${isoLocal(hoy)} · pago reciente = desde ${limiteISO}`);
  log(`Creditos con nota de cobranza: ${conNota}`);
  Object.keys(ETIQUETAS).forEach(k => { if (conteo[k]) log(`  se quedan · ${ETIQUETAS[k]}: ${conteo[k]}`); });
  log(`  A LIMPIAR: ${candidatos.length}` +
      (candidatos.length ? '  (' + Object.keys(porNota).map(n => n + ' ' + porNota[n]).join(' · ') + ')' : ''));
  candidatos.slice()
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .forEach(x => log(`    ${x.id.padEnd(12)} ${x.nota.padEnd(15)} ultimo pago ${x.ultimoPago}`));

  const excede = candidatos.length > MAXIMO;
  if (excede) log(`\nATENCION: ${candidatos.length} pasa el MAXIMO de ${MAXIMO}. Algo raro pasa: en real no se escribe nada.`);

  if (dry || !candidatos.length) {
    log(`\n${dry ? '(dry-run) ' : ''}${candidatos.length} ${dry ? 'se limpiarian' : 'para limpiar'} · nada escrito`);
    log(`RESULTADO dry=${dry ? 1 : 0} limpiar=${candidatos.length} limpiadas=0 verificadas=0 excede=${excede ? 1 : 0}`);
    return { limpiar: candidatos.length, limpiadas: 0, verificadas: 0, excede, respaldo: null };
  }
  if (excede) throw new Error(`${candidatos.length} creditos para limpiar pasa el maximo de ${MAXIMO}: no se escribio nada`);

  // Respaldo y limpieza en una sola transaccion: o se hacen los dos o ninguno.
  // Dentro se vuelve a leer cada credito: si alguien cambio la nota en el
  // medio, se respeta lo que puso.
  const idRespaldo = 'notas-cobranza-' + new Date().toISOString().replace(/[:.]/g, '-');
  const respaldoRef = db.collection('respaldos').doc(idRespaldo);
  let hechos = [];
  await db.runTransaction(async t => {
    const snaps = await t.getAll(...candidatos.map(x => x.ref));
    const finales = [];
    snaps.forEach(s => {
      if (!s.exists) return;
      const c = Object.assign({}, s.data());
      if (!c.id) c.id = s.id;
      const r = evaluar(c, ultimo, regla, limiteISO);
      if (r.accion === 'limpiar') finales.push({ ref: s.ref, doc: s.id, id: String(c.id), nota: r.nota });
    });
    hechos = [];
    if (!finales.length) return;
    t.set(respaldoRef, {
      tipo: 'limpieza-notas-cobranza',
      creado: new Date().toISOString(),
      motivo: 'Notas de cobranza de deuda pegadas en clientes al dia con pago en los ultimos ' + VENTANA_DIAS + ' dias',
      campo: 'cobranzaStatus',
      creditos: finales.map(f => ({ doc: f.doc, id: f.id, notaAnterior: f.nota })),
    });
    finales.forEach(f => t.update(f.ref, { cobranzaStatus: '' }));
    hechos = finales;
  });

  let verificadas = 0;
  if (hechos.length) {
    const despues = await db.getAll(...hechos.map(h => h.ref));
    verificadas = despues.filter(s => s.exists && !s.data().cobranzaStatus).length;
    log(`\nRespaldo: respaldos/${idRespaldo} (${hechos.length} creditos con su nota anterior)`);
  }
  log(`${hechos.length} notas limpiadas · verificadas ${verificadas}/${hechos.length}`);
  log(`RESULTADO dry=0 limpiar=${candidatos.length} limpiadas=${hechos.length} verificadas=${verificadas} excede=0` +
      (hechos.length ? ` respaldo=respaldos/${idRespaldo}` : ''));
  if (verificadas !== hechos.length) throw new Error(`verificacion: ${verificadas} de ${hechos.length} quedaron sin nota`);
  return { limpiar: candidatos.length, limpiadas: hechos.length, verificadas, excede: false, respaldo: hechos.length ? 'respaldos/' + idRespaldo : null };
}

if (require.main === module) {
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  const argNotas = (process.argv.find(x => x.startsWith('--notas=')) || '').slice(8);
  correr(db, {
    dry: process.argv.includes('--dry'),
    notas: argNotas ? argNotas.split(',').map(x => x.trim()).filter(Boolean) : null,
  })
    .catch(e => { console.error('ERROR', e.message); process.exit(1); });
}

module.exports = { correr, evaluar, esPagoReal, ultimosPagos, cargarRegla, isoLocal, VENTANA_DIAS, MAXIMO };
