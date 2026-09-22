// SOLO LECTURA. Datos que dejaron mal los puntos 4, 5 y 6 de la lista del 18-sep-2026:
//  4) el wizard cambiaba la moto por la primera del catalogo con el mismo precio al
//     volver al paso 3 (LEÓN 200 en vez de NEW HORSE 150 o STREET SPORT 150, etc.);
//  5) el recalculo de mora devolvia a activo/mora los creditos recuperados y
//     aprobaba solas las solicitudes de concesionario pendientes;
//  6) abrir Inventario volvia a marcar "financiada" la moto recuperada.
// No escribe nada. El log es publico: numeros de credito y de moto, sin nombres.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const { Firestore } = require('@google-cloud/firestore');

const VIGENTE = e => !e || e === 'activo' || e === 'mora';
const n2 = x => Math.round((parseFloat(x) || 0) * 100) / 100;
const dia = v => { if (!v) return ''; if (typeof v.toDate === 'function') return v.toDate().toISOString().slice(0, 10); return String(v).slice(0, 10); };
// Grupos del catalogo con el mismo precio: el primero (orden alfabetico) "se comia" a los demas
const SOMBRAS = { 'LEÓN 200': ['NEW HORSE 150', 'STREET SPORT 150'], 'CANARIO': ['CÓNDOR'], 'HJ150-8': ['REX 150'], 'MATRIX 150': ['OWEN 200S'] };
const norm = s => String(s || '').trim().toUpperCase();

(async () => {
  const db = new Firestore({ projectId: _proyecto() });
  const [cSnap, mSnap, pSnap, uSnap] = await Promise.all([
    db.collection('creditos').get(), db.collection('motos').get(), db.collection('pagos').get(), db.collection('usuarios').get(),
  ]);
  const creds = [], motos = {}, iniPorCred = {}, rolPorNombre = {}, rolPorUid = {};
  cSnap.forEach(d => { const c = d.data() || {}; if (!c.eliminado) creds.push(Object.assign({ _doc: d.id }, c)); });
  mSnap.forEach(d => { const m = d.data() || {}; motos[String(m.id != null ? m.id : d.id)] = m; });
  pSnap.forEach(d => { const p = d.data() || {}; if (p.eliminado) return; if (p.esInicial || p.tipoOperacion === 'inicial_credito') iniPorCred[p.cred] = n2((iniPorCred[p.cred] || 0) + n2(p.monto)); });
  uSnap.forEach(d => { const u = d.data() || {}; if (u.nombre) rolPorNombre[norm(u.nombre)] = u.rol || ''; rolPorUid[d.id] = u.rol || ''; });

  const cuenta = {}; creds.forEach(c => { const e = c.estado || '(sin estado)'; cuenta[e] = (cuenta[e] || 0) + 1; });
  console.log('CREDITOS POR ESTADO: ' + Object.entries(cuenta).sort((a, b) => b[1] - a[1]).map(([e, n]) => e + ' ' + n).join(' · '));
  const mCuenta = {}; Object.values(motos).filter(m => !m.eliminado).forEach(m => { const e = m.estado || '(sin estado)'; mCuenta[e] = (mCuenta[e] || 0) + 1; });
  console.log('MOTOS POR ESTADO: ' + Object.entries(mCuenta).sort((a, b) => b[1] - a[1]).map(([e, n]) => e + ' ' + n).join(' · '));

  // ── 5a) Recuperados que volvieron a la cartera ──
  console.log('');
  console.log('PUNTO 5a · creditos vigentes con pistas de haber sido recuperados:');
  let n5a = 0;
  creds.filter(c => VIGENTE(c.estado)).forEach(c => {
    const pistas = [];
    const m = motos[String(c.motoId)];
    if (m && !m.eliminado && m.estado === 'recuperada') pistas.push('su moto #' + c.motoId + ' esta "recuperada"');
    if (/recuper/i.test(String(c.cobranzaStatus || ''))) pistas.push('nota de cobranza "' + String(c.cobranzaStatus).slice(0, 30) + '"');
    const g = (Array.isArray(c.gestiones) ? c.gestiones : []).filter(x => /recuper/i.test(JSON.stringify(x || {})));
    if (g.length) pistas.push(g.length + ' gestion(es) que mencionan recuperar (ultima ' + dia((g[g.length - 1] || {}).fecha) + ')');
    if (!pistas.length) return;
    n5a++;
    console.log('  ' + c.id + ' · ' + c.estado + ' · ' + (c.mora || 0) + 'd · ' + pistas.join(' · '));
  });
  console.log('  total: ' + n5a);

  // ── 5b) Solicitudes de concesionario que se aprobaron solas ──
  console.log('');
  console.log('PUNTO 5b · creditos vigentes creados por un Vendedor Concesionario sin aprobacion:');
  let n5b = 0;
  creds.filter(c => VIGENTE(c.estado) && !c.aprobadoEn).forEach(c => {
    const rol = rolPorUid[c.creadoPorUid] || rolPorNombre[norm(c.creadoPor)] || '';
    if (rol !== 'Vendedor Concesionario') return;
    n5b++;
    console.log('  ' + c.id + ' · creado ' + dia(c.creado || c.fecha) + ' · ' + c.estado + ' · inicial del plan ' + '$' + n2(c.ini).toFixed(2)
      + ' · inicial registrada ' + (iniPorCred[c.id] ? '$' + iniPorCred[c.id].toFixed(2) : 'NINGUNA') + ' · sede ' + (c.concesionarioId || '—'));
  });
  console.log('  total: ' + n5b);
  const pend = creds.filter(c => c.estado === 'pendiente_revision').length;
  console.log('  (hoy hay ' + pend + ' solicitudes en pendiente_revision)');

  // ── 6) Motos: estado que no cuadra con sus creditos ──
  console.log('');
  console.log('PUNTO 6 · motos "financiada" sin ningun credito vigente:');
  const vigPorMoto = {}, todosPorMoto = {};
  creds.forEach(c => { if (c.motoId == null || c.motoId === '') return; const k = String(c.motoId);
    (todosPorMoto[k] = todosPorMoto[k] || []).push(c); if (VIGENTE(c.estado) || c.estado === 'completado' || c.estado === 'pendiente_revision') (vigPorMoto[k] = vigPorMoto[k] || []).push(c); });
  let n6 = 0;
  Object.entries(motos).forEach(([k, m]) => {
    if (m.eliminado || m.estado !== 'financiada' || vigPorMoto[k]) return;
    n6++;
    const otros = (todosPorMoto[k] || []).map(c => c.id + ' ' + (c.estado || '?')).join(', ') || 'sin credito';
    console.log('  moto #' + k + ' · ' + (m.modelo || '') + ' · creditos: ' + otros);
  });
  console.log('  total: ' + n6);

  // ── 4) Modelos que pudo cambiar el wizard ──
  console.log('');
  console.log('PUNTO 4 · creditos cuyo modelo no coincide con el de su moto:');
  let n4a = 0;
  creds.forEach(c => { const m = motos[String(c.motoId)]; if (!m || !c.modelo || !m.modelo) return;
    if (norm(c.modelo) !== norm(m.modelo)) { n4a++; console.log('  ' + c.id + ' · credito "' + c.modelo + '" · moto #' + c.motoId + ' "' + m.modelo + '" · ' + (c.estado || '?')); } });
  console.log('  total: ' + n4a);
  console.log('PUNTO 4 · creditos con un modelo que "se comia" a otros del mismo precio (verificar contra la moto fisica/VIN):');
  let n4b = 0;
  creds.filter(c => SOMBRAS[norm(c.modelo)] && c.estado !== 'cancelado').sort((a, b) => String(a.creado || a.fecha).localeCompare(String(b.creado || b.fecha))).forEach(c => {
    n4b++;
    console.log('  ' + c.id + ' · ' + c.modelo + ' (pudo ser ' + SOMBRAS[norm(c.modelo)].join(' o ') + ') · creado ' + dia(c.creado || c.fecha) + ' · ' + (c.estado || '?'));
  });
  console.log('  total: ' + n4b);
  console.log('');
  console.log('RESULTADO OK (solo lectura, no se cambio nada) 5a=' + n5a + ' 5b=' + n5b + ' 6=' + n6 + ' 4mismatch=' + n4a + ' 4candidatos=' + n4b);
})().catch(e => { console.log('RESULTADO ERROR: ' + (e && e.message || e)); process.exit(1); });
