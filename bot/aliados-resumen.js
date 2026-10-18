/* Robot del portal de aliados (17-oct-2026).
   Lee los creditos, los pagos y los anticipos de cada concesionario en las DOS companias
   (PAGASI 18 y PAGASI 26) y escribe por sede un resumen en `aliados_resumen` de la 26, que
   es lo UNICO que el aliado puede leer desde pagasi.io/aliados (las Reglas no le dan las
   fichas de clientes ni los pagos). Corre cada hora en GitHub Actions con la cuenta de
   servicio de la 18, que tambien tiene permiso de Firestore en la 26.

   Lo que ve el aliado de cada venta: fecha, modelo, nombre del cliente, al dia o atraso y
   monto financiado. Nada de cedulas, telefonos ni direcciones (Adam, 17-oct-2026).

   SOLO_LEER=1 calcula y muestra cantidades sin escribir nada. El log es publico: sin
   nombres, cedulas ni telefonos.                                                        */
'use strict';
const path = require('path');
const Ledger = require(path.join(__dirname, '..', 'logic', 'credito-ledger.js'));

const PROYECTOS = { '18': 'pagasi-v2', '26': 'pagasi26-65ced' };
const DESTINO = 'pagasi26-65ced';          // donde vive la cuenta del aliado y el portal
const DIAS_GRACIA = 5;
const NIVELES = [
  { id: 'bronce',   nom: 'Bronce',   min: 0,     pct: 1.0 },
  { id: 'plata',    nom: 'Plata',    min: 10000, pct: 1.5 },
  { id: 'oro',      nom: 'Oro',      min: 25000, pct: 2.0 },
  { id: 'diamante', nom: 'Diamante', min: 50000, pct: 2.5 }
];

// ── Calculos puros (se prueban en tests/t_aliados_resumen.js) ──────────────────────
function nivelDe(vol) {
  let n = NIVELES[0];
  NIVELES.forEach(x => { if (vol >= x.min) n = x; });
  const sig = NIVELES[NIVELES.indexOf(n) + 1] || null;
  return { id: n.id, nom: n.nom, pct: n.pct, min: n.min, siguiente: sig ? { id: sig.id, nom: sig.nom, pct: sig.pct, min: sig.min } : null };
}
function multDe(atrasoPct) { return atrasoPct < 5 ? 110 : atrasoPct <= 10 ? 100 : atrasoPct <= 15 ? 75 : 50; }
// Hoy en Venezuela (UTC-4), como AAAA-MM-DD
function hoyCaracas(ahora) { return new Date((ahora ? new Date(ahora) : new Date()).getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10); }
function horaCaracas(ahora) { return new Date((ahora ? new Date(ahora) : new Date()).getTime() - 4 * 3600 * 1000).toISOString().slice(11, 16); }
function r2(n) { return Math.round((parseFloat(n) || 0) * 100) / 100; }
// Lo que puso Pagasi en la moto (misma formula que el modulo Concesionarios)
function costoSalida(cr) {
  const costo = parseFloat(cr.precioBaseReal || cr.precio) || 0, ini = parseFloat(cr.ini) || 0;
  const puso = costo - ini;
  return puso > 0 ? r2(puso) : 0;
}
// Nombre y apellido, sin mas (el aliado no necesita el nombre completo)
function nombreCorto(cli) {
  const p = String(cli || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'Cliente';
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  return p.slice(0, 2).map(cap).join(' ');
}
function fechaDe(cr) { return String(cr.fecha || cr.creado || '').slice(0, 10); }
function mesDe(iso) { return String(iso || '').slice(0, 7); }
function diasEntre(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
function restarMeses(ym, n) { const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 - n, 1)); return d.toISOString().slice(0, 7); }

// Dias de atraso del credito segun el ledger (la cuota vencida mas vieja sin pagar)
function atrasoDe(cred, pagos, hoy) {
  try {
    const est = Ledger.generarEstadoCredito(cred, pagos || [], { diasGracia: DIAS_GRACIA, today: hoy });
    let max = 0;
    (est.cuotas || []).forEach(q => {
      if (q && q.saldo > 0.001 && q.fechaVence && q.fechaVence < hoy) { const d = diasEntre(q.fechaVence, hoy); if (d > max) max = d; }
    });
    return { dias: max, completado: !!(est.totalCuotas && est.cuotasPagadas >= est.totalCuotas) };
  } catch (e) {
    return { dias: cred.estado === 'mora' ? 31 : 0, completado: cred.estado === 'completado' };
  }
}

/* Resumen de UNA sede. `datos` trae lo de las dos companias ya marcado con `empresa`:
   { nombre, ciudad, creditos:[{...cred, empresa}], pagosPorCred:{credId:[...]}, anticipos:[{empresa, fecha, monto}] } */
function resumenSede(datos, hoy) {
  hoy = hoy || hoyCaracas();
  const mes = mesDe(hoy), mesAnt = restarMeses(mes, 1);
  const creditos = (datos.creditos || []).filter(c => c && !c.eliminado);
  const pendientes = creditos.filter(c => c.estado === 'pendiente_revision');
  const ventas = creditos.filter(c => c.estado !== 'cancelado' && c.estado !== 'pendiente_revision')
    .map(c => {
      const a = atrasoDe(c, (datos.pagosPorCred || {})[c.id] || [], hoy);
      return { empresa: c.empresa, id: c.id, fecha: fechaDe(c), modelo: [c.marca, c.modelo].filter(Boolean).join(' ').trim() || 'Moto',
        nombre: nombreCorto(c.cli), fin: r2(c.fin || costoSalida(c)), dias: a.dias, completado: a.completado,
        creado: c.creado || '', aprobadoEn: c.aprobadoEn || '', vendedor: String(c.vendedorNombre || '').split(/\s+/)[0] || '' };
    })
    .sort((x, y) => (y.fecha + y.creado).localeCompare(x.fecha + x.creado));

  const delMes = ventas.filter(v => mesDe(v.fecha) === mes), delMesAnt = ventas.filter(v => mesDe(v.fecha) === mesAnt);
  const vol = r2(delMes.reduce((s, v) => s + v.fin, 0));
  const nivel = nivelDe(vol);
  const cartera = ventas.filter(v => v.fecha && diasEntre(v.fecha, hoy) > 60 && !v.completado);
  const atrasados = cartera.filter(v => v.dias > 30);
  const atrasoPct = cartera.length ? r2(atrasados.length / cartera.length * 100) : 0;
  const mult = multDe(atrasoPct);
  const base = r2(vol * nivel.pct / 100);

  // Deposito: solo cuentan las companias donde hay anticipos cargados (en la 18 nunca se cargaron)
  const anticipos = (datos.anticipos || []).filter(a => a && !a.eliminado && parseFloat(a.monto) > 0);
  const empresasConDeposito = [...new Set(anticipos.map(a => a.empresa))];
  const enviado = r2(anticipos.reduce((s, a) => s + (parseFloat(a.monto) || 0), 0));
  const salidas = ventas.filter(v => empresasConDeposito.includes(v.empresa));
  const consumido = r2(salidas.reduce((s, v) => s + costoSalida(creditos.find(c => c.id === v.id && c.empresa === v.empresa) || {}), 0));
  const movs = anticipos.map(a => ({ fecha: String(a.fecha || '').slice(0, 10), detalle: 'Depósito de Pagasi', monto: r2(a.monto), empresa: a.empresa }))
    .concat(salidas.map(v => ({ fecha: v.fecha, detalle: v.modelo + ' · ' + v.nombre, monto: -costoSalida(creditos.find(c => c.id === v.id && c.empresa === v.empresa) || {}), empresa: v.empresa })))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  let acum = 0; movs.forEach(m => { acum = r2(acum + m.monto); m.saldo = acum; });

  // Solicitudes de los vendedores: pendientes y las ultimas aprobadas con sus minutos
  const aprobadas = ventas.filter(v => v.aprobadoEn && v.creado).map(v => ({ ...v, minutos: Math.max(0, Math.round((Date.parse(v.aprobadoEn) - Date.parse(v.creado)) / 60000)) }))
    .sort((a, b) => b.aprobadoEn.localeCompare(a.aprobadoEn)).slice(0, 10);
  const mins = aprobadas.map(a => a.minutos).filter(m => m > 0 && m < 24 * 60);
  const prom = mins.length ? Math.round(mins.reduce((s, m) => s + m, 0) / mins.length) : null;
  const rec = mins.length ? Math.min(...mins) : null;

  // Seis meses de volumen y motos
  const meses = [];
  for (let i = 5; i >= 0; i--) { const ym = restarMeses(mes, i); const vs = ventas.filter(v => mesDe(v.fecha) === ym); meses.push({ ym, vol: r2(vs.reduce((s, v) => s + v.fin, 0)), motos: vs.length }); }
  // Comision acumulada estimada: cada mes con el nivel que le toco (sin multiplicador)
  const porMes = {}; ventas.forEach(v => { const m = mesDe(v.fecha); if (m) porMes[m] = r2((porMes[m] || 0) + v.fin); });
  const comisionAcum = r2(Object.values(porMes).reduce((s, v) => s + v * nivelDe(v).pct / 100, 0));
  const inicio = ventas.length ? ventas[ventas.length - 1].fecha : '';
  const diasAliado = inicio ? diasEntre(inicio, hoy) : 0;
  const primeras30 = inicio ? creditos.filter(c => c.estado !== 'cancelado' && fechaDe(c) && diasEntre(inicio, fechaDe(c)) <= 30).length : 0;

  return {
    nombre: datos.nombre || '', ciudad: datos.ciudad || '',
    mes: { ym: mes, motos: delMes.length, motosAnt: delMesAnt.length, vol, nivel: nivel.id, nivelNom: nivel.nom, pct: nivel.pct,
      siguiente: nivel.siguiente, falta: nivel.siguiente ? r2(nivel.siguiente.min - vol) : 0, base, mult, comision: r2(base * mult / 100) },
    calidad: { cartera: cartera.length, atrasados: atrasados.length, atrasoPct, aldiaPct: r2(100 - atrasoPct), mult },
    deposito: { empresas: empresasConDeposito, enviado, consumido, saldo: r2(enviado - consumido), movimientos: movs.slice(-15).reverse() },
    ventas: ventas.slice(0, 25).map(v => ({ empresa: v.empresa, fecha: v.fecha, modelo: v.modelo, nombre: v.nombre, fin: v.fin, dias: v.dias, completado: v.completado })),
    solicitudes: { pendientes: pendientes.slice(0, 10).map(c => ({ empresa: c.empresa, creado: c.creado || '', modelo: [c.marca, c.modelo].filter(Boolean).join(' ').trim() || 'Moto', nombre: nombreCorto(c.cli), vendedor: String(c.vendedorNombre || '').split(/\s+/)[0] || '' })),
      ultimas: aprobadas.map(a => ({ empresa: a.empresa, fecha: a.aprobadoEn.slice(0, 10), modelo: a.modelo, nombre: a.nombre, minutos: a.minutos })), prom, rec },
    meses,
    desde: { inicio, dias: diasAliado, motos: ventas.length, comision: comisionAcum },
    bono: { aplica: !!inicio && diasAliado <= 60, completas: primeras30, meta: 20, diasRestantes: inicio ? Math.max(0, 30 - diasAliado) : 0 }
  };
}

// Posicion de cada sede entre todas, por volumen del mes. Los demas salen sin nombre.
function ranking(resumenes) {
  const lista = Object.keys(resumenes).map(id => ({ id, vol: resumenes[id].mes.vol, ciudad: resumenes[id].ciudad || 'Caracas' }))
    .sort((a, b) => b.vol - a.vol || a.id.localeCompare(b.id));
  const top = lista.slice(0, 5);
  Object.keys(resumenes).forEach(id => {
    const pos = lista.findIndex(x => x.id === id) + 1;
    const filas = top.map((x, i) => ({ pos: i + 1, nombre: x.id === id ? 'Tú' : 'Concesionario · ' + x.ciudad, vol: x.vol, tu: x.id === id }));
    if (pos > 5) filas.push({ pos, nombre: 'Tú', vol: resumenes[id].mes.vol, tu: true });
    resumenes[id].ranking = { posicion: pos, total: lista.length, faltaPrimero: pos > 1 ? r2(lista[0].vol - resumenes[id].mes.vol) : 0, lista: filas };
  });
  return resumenes;
}

// Junta lo de las dos companias por concesionario (los ids son los mismos: la 26 nacio de la 18)
function armarSedes(porEmpresa) {
  const sedes = {};
  Object.keys(porEmpresa).forEach(emp => {
    const d = porEmpresa[emp];
    (d.concesionarios || []).forEach(c => {
      if (!c || c.eliminado) return;
      const s = sedes[c.id] || (sedes[c.id] = { id: c.id, nombre: '', ciudad: '', creditos: [], pagosPorCred: {}, anticipos: [] });
      if (emp === '26' || !s.nombre) { s.nombre = c.nombre || s.nombre; s.ciudad = c.ciudad || s.ciudad; }
      (Array.isArray(c.anticipos) ? c.anticipos : []).forEach(a => { if (a && !a.eliminado) s.anticipos.push({ empresa: emp, fecha: a.fecha, monto: a.monto }); });
    });
    (d.creditos || []).forEach(cr => {
      if (!cr || cr.eliminado || !cr.concesionarioId || !sedes[cr.concesionarioId]) return;
      sedes[cr.concesionarioId].creditos.push(Object.assign({}, cr, { empresa: emp }));
    });
    (d.pagos || []).forEach(p => {
      if (!p || p.eliminado || !p.cred) return;
      Object.keys(sedes).forEach(id => {
        if (sedes[id].creditos.some(c => c.id === p.cred && c.empresa === emp)) (sedes[id].pagosPorCred[p.cred] = sedes[id].pagosPorCred[p.cred] || []).push(p);
      });
    });
  });
  return sedes;
}

// ── Firestore ──────────────────────────────────────────────────────────────────────
async function leerEmpresa(proyecto) {
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: proyecto });
  const [conc, creds, pagos] = await Promise.all([
    db.collection('concesionarios').get(),
    db.collection('creditos').get(),
    db.collection('pagos').select('cred', 'monto', 'fecha', 'eliminado', 'estado', 'tipo', 'esInicial', 'tipoOperacion', 'mantenerEnAmortizacion').get()
  ]);
  const docs = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  return { concesionarios: docs(conc), creditos: docs(creds), pagos: docs(pagos) };
}

async function main() {
  const soloLeer = /^(1|true|si)$/i.test(String(process.env.SOLO_LEER || ''));
  const hoy = hoyCaracas();
  const porEmpresa = {};
  for (const emp of Object.keys(PROYECTOS)) {
    porEmpresa[emp] = await leerEmpresa(PROYECTOS[emp]);
    console.log('PAGASI ' + emp + ': ' + porEmpresa[emp].concesionarios.length + ' concesionarios · ' + porEmpresa[emp].creditos.length + ' créditos · ' + porEmpresa[emp].pagos.length + ' pagos');
  }
  const sedes = armarSedes(porEmpresa);
  const resumenes = {};
  Object.keys(sedes).forEach(id => { resumenes[id] = resumenSede(sedes[id], hoy); });
  ranking(resumenes);
  const ahora = new Date().toISOString();
  Object.keys(resumenes).sort().forEach(id => {
    const r = resumenes[id];
    console.log('  ' + id + ' · ' + r.mes.motos + ' motos del mes · $' + r.mes.vol + ' · ' + r.mes.nivelNom + ' · saldo $' + r.deposito.saldo + ' (' + (r.deposito.empresas.join('+') || 'sin depósito') + ') · atraso ' + r.calidad.atrasoPct + '% · #' + r.ranking.posicion + '/' + r.ranking.total + ' · ventas ' + r.desde.motos);
  });
  if (soloLeer) { console.log('SOLO_LEER: no se escribió nada (' + Object.keys(resumenes).length + ' resúmenes calculados)'); return; }
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: DESTINO });
  const lote = db.batch();
  Object.keys(resumenes).forEach(id => { lote.set(db.collection('aliados_resumen').doc(id), Object.assign({ concId: id, actualizadoEn: ahora, hoy }, resumenes[id])); });
  await lote.commit();
  console.log('Escritos ' + Object.keys(resumenes).length + ' resúmenes en aliados_resumen de ' + DESTINO + ' (' + ahora + ')');
}

module.exports = { nivelDe, multDe, costoSalida, nombreCorto, atrasoDe, resumenSede, ranking, armarSedes, hoyCaracas, horaCaracas, NIVELES };
if (require.main === module) main().catch(e => { console.error('FALLO:', e && e.message || e); process.exit(1); });
