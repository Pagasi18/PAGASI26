/* Módulo AI (21-nov-2026). Adam: "un modelo como que se llame AI.. donde los administradores de la
   empresa podamos buscar… a qué hora es la que más se vende… qué concesionario vendió más hoy… qué
   vendedor tuvo más ventas". Después: "haz el módulo de AI… dale sin parar".

   Aquí están las CONSULTAS que la AI puede pedir. Las cuentas las hace este código, no la AI: ella
   entiende la pregunta, escoge la consulta y explica el resultado. Así los números no se inventan y
   son los mismos del Dashboard (las piezas vienen de logic/grupo-resumen.js y del mismo ledger).

   Solo leen: ninguna consulta escribe, borra ni manda nada. De los clientes sale el nombre (cuando la
   pregunta lo pide: «quién debe más»); nunca cédula ni teléfono, que ni se cargan aquí.          */
'use strict';
const path = require('path'), fs = require('fs');
// La lógica compartida con el panel: al desplegar se copia a functions/logic (firebase.json, predeploy)
function compartido(nombre) { const copia = path.join(__dirname, '..', 'logic', nombre), original = path.join(__dirname, '..', '..', 'logic', nombre); return require(fs.existsSync(original) ? original : copia); }
const G = compartido('grupo-resumen.js');
const ledger = compartido('credito-ledger.js');

const DIA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ORDEN_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const METODO_NOM = { banco: 'banco (transferencia o pago móvil)', binance: 'Binance', efectivo: 'efectivo', zelle: 'Zelle', concesionario: 'inicial pagada en el concesionario', otros: 'otras formas' };
const TRAMO_NOM = { '1-15': 'de 1 a 15 días', '16-30': 'de 16 a 30 días', '31-60': 'de 31 a 60 días', '+60': 'más de 60 días' };
const p2 = n => (n < 10 ? '0' : '') + n;
const r2 = v => Math.round((+v || 0) * 100) / 100;
const r1 = v => Math.round((+v || 0) * 10) / 10;
// Para comparar nombres: sin tildes, en mayúsculas y sin espacios de más
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const esFecha = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00Z'));
const docs = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));

class ErrorConsulta extends Error {}

// La hora (0 a 23, en Venezuela) en que se anotó algo. Una fecha con zona (…Z) se pasa a UTC−4;
// sin zona, la hora escrita ya es la de aquí. Sin hora, null.
function horaCaracas(v) {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.toDate === 'function') v = v.toDate().toISOString();
  const s = String(v);
  if (!/T\d{2}:\d{2}/.test(s)) return null;
  const t = Date.parse(s);
  if (isNaN(t)) return null;
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(s)) return new Date(t - 4 * 3600000).getUTCHours();
  return +s.slice(11, 13);
}
// Los pagos de inicial no guardan creadoEn, pero su número es 'PAG-' + la hora en milisegundos
function horaDeId(id) { const m = /^PAG-(\d{13})(?!\d)/.exec(String(id || '')); return m ? new Date(+m[1] - 4 * 3600000).getUTCHours() : null; }
function diaSemana(iso) { const d = new Date(iso + 'T12:00:00Z'); return isNaN(d.getTime()) ? null : d.getUTCDay(); }
function lunesDe(iso) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
function graciaDe(planDoc) {
  const p = (planDoc && planDoc.exists && planDoc.data()) || {};
  const g = Object.prototype.hasOwnProperty.call(p, 'diasGracia') ? p.diasGracia : p.gracia;
  return (g !== undefined && g !== null && isFinite(Number(g))) ? Number(g) : 5;
}

// ── Armar los datos de UNA compañía: las ventas (créditos otorgados) y los cobros ──
function armar(emp, creds, pagos, concs, gracia, hoy) {
  const nomConc = {};
  (concs || []).forEach(k => { if (k && k.id != null) nomConc[String(k.id)] = norm(k.nombre); });
  const hoyN = G.diaDe(hoy), idx = G.indicePagos(pagos), porCred = G.agruparPagos(pagos);
  const ventas = [], porId = {}, deTodos = {};
  const concDe = id => (id == null || id === '') ? 'SIN CONCESIONARIO' : (nomConc[String(id)] || 'CONCESIONARIO ' + id);
  // Las etiquetas de TODOS los créditos, también anulados: sus pagos confirmados siguen contando como cobro
  (creds || []).forEach(c0 => { if (c0 && c0.id != null) deTodos[String(c0.id)] = { concesionario: concDe(c0.concesionarioId), vendedor: norm(c0.vendedorNombre) || 'SIN VENDEDOR ANOTADO', modelo: norm(c0.modelo) || norm(c0.marca) || 'SIN MODELO' }; });
  (creds || []).forEach(c0 => {
    if (!c0 || c0.eliminado) return;
    const guardado = String(c0.estado || '');
    if (G.NO_ES_VENTA.indexOf(guardado) > -1) return;           // anulados y solicitudes no son ventas
    const e = G.estadoHoy(c0, hoyN, gracia), activo = e.estado === 'activo' || e.estado === 'mora';
    const c = activo ? Object.assign({}, c0, { estado: e.estado, mora: e.mora }) : c0;
    const est = G.estadoLedger(c, porCred, ledger, hoy, gracia);
    const dias = activo ? (parseInt(e.mora, 10) || 0) : 0;
    const v = {
      empresa: emp, id: String(c0.id), cliente: String(c0.cli || '').trim().replace(/\s+/g, ' '),
      concesionario: concDe(c0.concesionarioId),
      vendedor: norm(c0.vendedorNombre) || 'SIN VENDEDOR ANOTADO', modelo: norm(c0.modelo) || norm(c0.marca) || 'SIN MODELO', marca: norm(c0.marca) || 'SIN MARCA',
      precio: +c0.precio || 0, inicial: +c0.ini || 0, financiado: +c0.fin || 0, cuota: parseFloat(c0.cuotaQ || c0.cuota) || 0, plazo: +c0.plazo || 0,
      fecha: G.fechaTxt(c0.fecha) || G.fechaTxt(c0.creado), hora: horaCaracas(c0.creado),
      estado: activo ? (dias > 0 ? 'en mora' : 'al día') : (e.estado === 'completado' ? 'completado' : (guardado === 'recuperada' ? 'recuperado' : guardado || 'otro')),
      activo, diasAtraso: dias, saldo: activo ? r2(G.saldoPendiente(c, idx)) : 0, vencido: activo && dias > 0 ? r2(G.vencidoDe(c, est, hoy)) : 0,
      cuotasPagadas: est ? est.cuotasPagadas : (parseInt(c0.pagado, 10) || 0), cuotasTotal: est ? est.totalCuotas : (parseInt(c0.totalCuotas, 10) || 0),
      vencidas: []
    };
    // Las cuotas que ya vencieron: lo pagado hasta el día en que vencía, lo pagado después y lo que falta
    if (est && hoy) (est.cuotas || []).forEach(q => {
      if (!q || !q.fechaVence || q.fechaVence >= hoy) return;
      let at = 0;
      (q.aplicaciones || []).forEach(a => { if (String(a.fecha || '').slice(0, 10) <= q.fechaVence) at += parseFloat(a.monto) || 0; });
      at = Math.min(at, q.pagado || 0);
      v.vencidas.push({ vence: q.fechaVence, monto: q.monto || 0, aTiempo: at, tarde: Math.max(0, (q.pagado || 0) - at), sinPagar: Math.max(0, q.saldo || 0) });
    });
    ventas.push(v); porId[v.id] = v;
  });
  const cobros = [];
  (pagos || []).forEach(p => {
    if (!p || p.eliminado || p.estado !== 'confirmado') return;
    const m = parseFloat(p.monto) || 0;
    if (!m) return;
    const v = porId[String(p.cred)] || deTodos[String(p.cred)];
    const h = horaCaracas(p.creadoEn);
    cobros.push({ empresa: emp, fecha: G.fechaTxt(p.fecha), hora: h == null ? horaDeId(p.id) : h, monto: m, tipo: (p.esInicial || p.tipoOperacion === 'inicial_credito') ? 'inicial' : 'cuota',
      metodo: G.metodoDe(p.metodo), concesionario: v ? v.concesionario : (p.concesionarioId != null && p.concesionarioId !== '' ? concDe(p.concesionarioId) : 'SIN CRÉDITO'), vendedor: v ? v.vendedor : 'SIN CRÉDITO', modelo: v ? v.modelo : 'SIN CRÉDITO' });
  });
  // Los concesionarios activos: para que los que no vendieron salgan con 0
  const concesionarios = (concs || []).filter(k => k && k.activo !== false && !k.eliminado && k.id != null).map(k => ({ empresa: emp, nombre: concDe(k.id) }));
  return { ventas, cobros, concesionarios };
}

// Las dos bases, leídas en el momento (una memoria corta: varias preguntas seguidas no vuelven a leer)
const VIGENCIA_MS = 3 * 60 * 1000;
let memoria = null;
async function cargar(bases, hoy, o) {
  if (!(o && o.fresco) && memoria && memoria.hoy === hoy && Date.now() - memoria.t < VIGENCIA_MS) return memoria.D;
  const partes = await Promise.all(['18', '26'].map(async emp => {
    const db = bases[emp];
    const [cs, ps, ks, plan] = await Promise.all([db.collection('creditos').get(), db.collection('pagos').get(), db.collection('concesionarios').get(), db.collection('config').doc('plan').get()]);
    return armar(emp, docs(cs), docs(ps), docs(ks), graciaDe(plan), hoy);
  }));
  const D = { ventas: partes[0].ventas.concat(partes[1].ventas), cobros: partes[0].cobros.concat(partes[1].cobros), concesionarios: partes[0].concesionarios.concat(partes[1].concesionarios) };
  memoria = { t: Date.now(), hoy, D };
  return D;
}
const olvidar = () => { memoria = null; };

// ── Piezas comunes de las consultas ──
// Sin «hasta», el período termina HOY, como en el módulo PAGASI 18 + 26 (revisión 21-nov: sin tope, un
// solo registro con un año mal escrito llenaba «los últimos meses» de meses vacíos del futuro). Lo que
// quedó anotado con fecha posterior a hoy no se cuenta, pero se avisa con cuántos son y cuánto suman.
function periodo(a, hoy, defecto) {
  if (a.desde != null && a.desde !== '' && !esFecha(a.desde)) throw new ErrorConsulta('«desde» tiene que ser una fecha AAAA-MM-DD');
  if (a.hasta != null && a.hasta !== '' && !esFecha(a.hasta)) throw new ErrorConsulta('«hasta» tiene que ser una fecha AAAA-MM-DD');
  const conDesde = esFecha(a.desde), conHasta = esFecha(a.hasta);
  const desde = conDesde ? a.desde : (defecto || '2000-01-01'), hasta = conHasta ? a.hasta : hoy;
  if (desde > hasta) throw new ErrorConsulta('«desde» es después de «hasta»');
  return { desde, hasta, conDesde: conDesde || !!defecto, conHasta };
}
const enPeriodo = (f, per) => !!f && f >= per.desde && f <= per.hasta;
const verPeriodo = per => ({ desde: per.desde === '2000-01-01' ? 'el principio' : per.desde, hasta: per.conHasta ? per.hasta : 'hoy' });
// l: las filas de la compañía y los filtros, SIN cortar por fecha. Solo cuando el período termina hoy.
function avisoFuturo(r, l, fechaDe, per, hoy, que, monto) {
  if (per.conHasta && per.hasta < hoy) return;
  const fut = l.filter(x => { const f = fechaDe(x) || ''; return f > hoy && f > per.hasta && f >= per.desde; });
  if (!fut.length) return;
  const suma = monto ? r2(fut.reduce((t, x) => t + (+monto(x) || 0), 0)) : null;
  r.aviso_fechas = 'No se cuentan ' + fut.length + ' ' + que + (suma != null ? ' por $' + suma : '') + ' anotados con fecha posterior a hoy (la más lejana: ' + fut.map(fechaDe).sort().pop() + ').' + (que === 'pagos' ? ' «Cobrado del mes» en el Dashboard sí los suma.' : '');
}
function empresas(a) { return a.empresa === '18' || a.empresa === '26' ? [a.empresa] : ['18', '26']; }
// Un nombre casa si cada palabra buscada es el comienzo de una de sus palabras: «Ana» casa con
// ANA PEREZ pero no con MARIANA; «bello monte» casa con EMPIRE BELLO MONTE.
const palabras = s => norm(s).split(/[^A-Z0-9]+/).filter(Boolean);
// Las palabras con letras y números pegados también valen por pedazos: TRX150 = TRX150, TRX y 150
// (así «150», «TRX 150» y «HJ 150» casan con TRX150 RAYO o HJ150-8); las de solo letras no se parten.
const pedazos = w => [w].concat((w.match(/[A-Z]+|[0-9]+/g) || []).filter(t => t !== w));
function casa(nombre, buscado) {
  const q = palabras(buscado); if (!q.length) return false;
  const w = [].concat(...palabras(nombre).map(pedazos)), cabe = x => w.some(y => y.startsWith(x));
  return q.every(x => cabe(x) || (/[A-Z]/.test(x) && /[0-9]/.test(x) && (x.match(/[A-Z]+|[0-9]+/g) || []).every(cabe)));
}
const CAMPOS_FILTRO = [['filtro_concesionario', 'concesionario'], ['filtro_vendedor', 'vendedor'], ['filtro_modelo', 'modelo']];
// r: el resultado de la consulta; ahí se anota qué nombres entraron en cada filtro, para que la AI lo diga
function filtrar(l, a, r) {
  CAMPOS_FILTRO.forEach(([k, campo]) => {
    if (!a[k] || !palabras(a[k]).length) return;
    l = l.filter(x => casa(x[campo], a[k]));
    if (r) { const vistos = [...new Set(l.map(x => x[campo]))].sort(); (r.coinciden = r.coinciden || {})[campo] = vistos.length > 12 ? vistos.slice(0, 12).concat(['y ' + (vistos.length - 12) + ' más']) : vistos; if (!vistos.length) r.nota_filtro = 'Ningún ' + campo + ' casó con «' + String(a[k]).slice(0, 40) + '» en estos datos: revisa cómo se escribe.'; }
  });
  return l;
}
function tramoDe(d) { for (const t of G.TRAMOS) if (d >= t[1] && d <= t[2]) return TRAMO_NOM[t[0]]; return 'al día'; }
const etiquetaHora = h => p2(h) + ':00 a ' + p2(h) + ':59';
const etiquetaQuincena = f => f.slice(0, 7) + (+f.slice(8, 10) <= 15 ? ' 1ª quincena' : ' 2ª quincena');
// La etiqueta del grupo al que va cada fila
function grupoDe(por, x, fecha) {
  switch (por) {
    case 'dia': return fecha;
    case 'semana': return 'semana del lunes ' + lunesDe(fecha);
    case 'quincena': return etiquetaQuincena(fecha);
    case 'mes': case 'mes_venta': return fecha.slice(0, 7);
    case 'hora': return x.hora == null ? 'sin hora anotada' : etiquetaHora(x.hora);
    case 'dia_semana': return DIA_SEMANA[diaSemana(fecha)] || 'sin fecha';
    case 'concesionario': return x.concesionario;
    case 'vendedor': return x.vendedor;
    case 'modelo': return x.modelo;
    case 'marca': return x.marca;
    case 'empresa': return 'PAGASI ' + x.empresa;
    case 'plazo': return x.plazo ? x.plazo + ' meses' : 'sin plazo';
    case 'metodo': return METODO_NOM[x.metodo] || x.metodo;
    case 'tipo': return x.tipo === 'inicial' ? 'iniciales' : 'cuotas';
    case 'tramo_mora': return tramoDe(x.diasAtraso);
    case 'estado': return x.estado;
  }
  return 'total';
}
const EN_EL_TIEMPO = ['dia', 'semana', 'quincena', 'mes', 'mes_venta', 'hora', 'dia_semana'];
const masDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Los grupos que tienen que salir aunque no tengan movimiento (con 0): los días, semanas, quincenas y
// meses del período; las horas entre la primera y la última con movimiento; los 7 días de la semana.
function gruposDelTiempo(por, l, fechaDe, per, hoy) {
  const fechas = l.map(fechaDe).filter(Boolean).sort();
  const ini = per.conDesde ? per.desde : fechas[0], fin = per.hasta;
  if (por === 'dia_semana') return ORDEN_SEMANA.slice();
  if (por === 'hora') { const hs = l.map(x => x.hora).filter(h => h != null); if (!hs.length) return []; const out = []; for (let h = Math.min(...hs); h <= Math.max(...hs); h++) out.push(etiquetaHora(h)); return out; }
  if (!ini || !fin || ini > fin) return [];
  const dias = Math.round((Date.parse(fin + 'T12:00:00Z') - Date.parse(ini + 'T12:00:00Z')) / 864e5);
  const out = [];
  if (por === 'dia') { if (dias > 2200) return []; for (let f = ini; f <= fin; f = masDias(f, 1)) out.push(f); }
  else if (por === 'semana') { if (dias > 4000) return []; for (let f = lunesDe(ini); f <= fin; f = masDias(f, 7)) out.push('semana del lunes ' + f); }
  else if (por === 'quincena') { const qi = etiquetaQuincena(ini), qf = etiquetaQuincena(fin); for (let mm = ini.slice(0, 7); mm <= fin.slice(0, 7) && out.length < 400; mm = G.mesMas(mm, 1)) [mm + ' 1ª quincena', mm + ' 2ª quincena'].forEach(q => { if (q >= qi && q <= qf) out.push(q); }); }
  else if (por === 'mes' || por === 'mes_venta') { for (let m = ini.slice(0, 7); m <= fin.slice(0, 7) && out.length < 400; m = G.mesMas(m, 1)) out.push(m); }
  return out;
}
// Juntar por grupo, ordenar y cortar.
//   valor: la cifra con la que se ordena «mayor/menor»
//   o: { minimo (al ordenar por %), vacio (los ceros de un grupo sin movimiento), todos (grupos que salen aunque estén en 0),
//        porCifra (se pidió ordenar por una cifra: entonces no va en orden de fecha) }
function agrupar(l, por, fechaDe, sumar, valor, a, o) {
  o = o || {};
  const m = new Map(), n = new Map();
  (o.todos || []).forEach(k => { if (!m.has(k)) { m.set(k, Object.assign({}, o.vacio)); n.set(k, 0); } });
  l.forEach(x => { const k = grupoDe(por, x, fechaDe(x)); const acc = m.get(k) || Object.assign({}, o.vacio); sumar(acc, x); m.set(k, acc); n.set(k, (n.get(k) || 0) + 1); });
  let grupos = [...m.entries()].map(([grupo, acc]) => Object.assign({ grupo }, acc));
  // En un ranking por porcentaje, un grupo de 1 crédito (100%) taparía a los de verdad: se piden al menos «minimo»
  const minimo = Math.max(0, parseInt(a.minimo, 10) || o.minimo || 0);
  const chicos = minimo > 1 ? grupos.filter(g => n.get(g.grupo) < minimo).length : 0;
  if (chicos) grupos = grupos.filter(g => n.get(g.grupo) >= minimo);
  // Por fecha solo cuando se agrupa en el tiempo y no se pidió otra cosa: con «ordenar_por», o con
  // «limite» en horas o días de la semana («las 3 horas en que más se vende»), va de mayor a menor.
  const enTiempo = EN_EL_TIEMPO.indexOf(por) > -1;
  const orden = ['mayor', 'menor', 'cronologico'].includes(a.orden) ? a.orden
    : (enTiempo && !o.porCifra && !(a.limite && (por === 'hora' || por === 'dia_semana')) ? 'cronologico' : 'mayor');
  if (orden === 'cronologico') {
    if (por === 'dia_semana') grupos.sort((x, y) => ORDEN_SEMANA.indexOf(x.grupo) - ORDEN_SEMANA.indexOf(y.grupo));
    else grupos.sort((x, y) => String(x.grupo).localeCompare(String(y.grupo)));
  } else grupos.sort((x, y) => (orden === 'menor' ? valor(x) - valor(y) : valor(y) - valor(x)) || String(x.grupo).localeCompare(String(y.grupo)));
  const max = Math.max(1, Math.min(62, parseInt(a.limite, 10) || (enTiempo ? 62 : 15)));
  const omitidos = Math.max(0, grupos.length - max) + chicos;
  // en orden de fecha se quedan los más recientes (días, semanas, meses); en un ranking, los primeros
  grupos = orden === 'cronologico' && por !== 'dia_semana' && por !== 'hora' ? grupos.slice(-max) : grupos.slice(0, max);
  return { grupos, omitidos, orden, chicos };
}
const ORDEN_TXT = { mayor: 'de mayor a menor', menor: 'de menor a mayor', cronologico: 'en orden de fecha u hora' };
const sumaDe = (l, k) => r2(l.reduce((s, x) => s + (+x[k] || 0), 0));
const pct = (n, t) => t > 0 ? r1(n * 100 / t) : 0;

// ── Las consultas ──
const nombreEmpresa = emps => emps.length === 2 ? 'las dos' : 'PAGASI ' + emps[0];
// Los grupos que salen aunque estén en 0 (ventas y cobros): el tiempo del período, las compañías,
// y los concesionarios activos. Vendedores y modelos sin movimiento no salen (se dice en la nota).
function gruposEnCero(por, l, fechaDe, per, hoy, D, emps, a, tipo) {
  if (EN_EL_TIEMPO.indexOf(por) > -1) return gruposDelTiempo(por, l, fechaDe, per, hoy);
  if (por === 'empresa') return emps.map(e => 'PAGASI ' + e);
  if (por === 'tipo' && !tipo) return ['cuotas', 'iniciales'];
  if (por === 'concesionario' && !a.filtro_vendedor && !a.filtro_modelo) return [...new Set((D.concesionarios || []).filter(k => emps.includes(k.empresa) && (!a.filtro_concesionario || casa(k.nombre, a.filtro_concesionario))).map(k => k.nombre))];
  return [];
}
function notaGrupos(r, por, orden) {
  r.ordenado = ORDEN_TXT[orden] || orden;
  if (por === 'vendedor' || por === 'modelo' || por === 'marca' || por === 'metodo') r.nota_ceros = 'Solo salen los que tuvieron movimiento en el período: los que no tuvieron ninguno no aparecen.';
}
function ventas(D, a, hoy) {
  const per = periodo(a, hoy), emps = empresas(a), por = a.agrupar_por || 'nada';
  const r = { periodo: verPeriodo(per), empresa: nombreEmpresa(emps) };
  const todas = filtrar(D.ventas.filter(v => emps.includes(v.empresa)), a, null);
  const l = filtrar(D.ventas.filter(v => emps.includes(v.empresa) && enPeriodo(v.fecha, per)), a, r);
  const n = l.length, precio = sumaDe(l, 'precio'), inicial = sumaDe(l, 'inicial');
  r.total = { motos_vendidas: n, financiado: sumaDe(l, 'financiado'), precio_promedio: n ? r2(precio / n) : 0, inicial_promedio: n ? r2(inicial / n) : 0, inicial_pct_del_precio: pct(inicial, precio), cuota_quincenal_promedio: n ? r2(sumaDe(l, 'cuota') / n) : 0 };
  avisoFuturo(r, todas, x => x.fecha, per, hoy, 'ventas', x => x.financiado);
  if (por !== 'nada') {
    const g = agrupar(l, por, x => x.fecha, (acc, x) => { acc.motos += 1; acc.financiado = r2(acc.financiado + x.financiado); }, x => x.motos, a,
      { vacio: { motos: 0, financiado: 0 }, todos: gruposEnCero(por, l, x => x.fecha, per, hoy, D, emps, a) });
    r.grupos = g.grupos.map(x => Object.assign(x, { pct_del_total: pct(x.motos, n) }));
    if (g.omitidos) r.grupos_no_mostrados = g.omitidos;
    notaGrupos(r, por, g.orden);
    if (por === 'hora') r.nota = 'La hora es cuando el crédito se cargó en el sistema (no necesariamente la firma).';
    if (por === 'vendedor') r.nota = 'El vendedor es el anotado en el crédito: a veces es quien lo cargó, no quien vendió. Los créditos viejos de la 18 no tienen vendedor anotado.';
  }
  return r;
}
function cobros(D, a, hoy) {
  const per = periodo(a, hoy), emps = empresas(a), por = a.agrupar_por || 'nada', tipo = a.tipo === 'cuotas' ? 'cuota' : a.tipo === 'iniciales' ? 'inicial' : '';
  const r = { periodo: verPeriodo(per), empresa: nombreEmpresa(emps), tipo: tipo ? (tipo === 'cuota' ? 'solo cuotas' : 'solo iniciales') : 'cuotas e iniciales' };
  const todos = filtrar(D.cobros.filter(p => emps.includes(p.empresa) && (!tipo || p.tipo === tipo)), a, null);
  const l = filtrar(D.cobros.filter(p => emps.includes(p.empresa) && enPeriodo(p.fecha, per) && (!tipo || p.tipo === tipo)), a, r);
  const monto = sumaDe(l, 'monto');
  r.total = { cobrado: monto, pagos: l.length, cuotas: r2(l.filter(p => p.tipo === 'cuota').reduce((s, p) => s + p.monto, 0)), iniciales: r2(l.filter(p => p.tipo === 'inicial').reduce((s, p) => s + p.monto, 0)) };
  avisoFuturo(r, todos, x => x.fecha, per, hoy, 'pagos', x => x.monto);
  if (por !== 'nada') {
    const g = agrupar(l, por, x => x.fecha, (acc, x) => { acc.cobrado = r2(acc.cobrado + x.monto); acc.pagos += 1; }, x => x.cobrado, a,
      { vacio: { cobrado: 0, pagos: 0 }, todos: gruposEnCero(por, l, x => x.fecha, per, hoy, D, emps, a, tipo) });
    r.grupos = g.grupos.map(x => Object.assign(x, { pct_del_total: pct(x.cobrado, monto) }));
    if (g.omitidos) r.grupos_no_mostrados = g.omitidos;
    notaGrupos(r, por, g.orden);
    if (por === 'hora') r.nota = 'La hora es cuando el pago se registró en el sistema. Los pocos que no la tienen salen como «sin hora anotada».';
  }
  return r;
}
function cartera(D, a) {
  const emps = empresas(a), por = a.agrupar_por || 'nada', ord = a.ordenar_por || 'creditos';
  const r = { hoy: true, empresa: nombreEmpresa(emps) };
  const l = filtrar(D.ventas.filter(v => v.activo && emps.includes(v.empresa)), a, r);
  const tot = { creditos_activos: l.length, dinero_en_la_calle: sumaDe(l, 'saldo'), en_mora: l.filter(v => v.diasAtraso > 0).length, vencido: sumaDe(l, 'vencido') };
  tot.al_dia = tot.creditos_activos - tot.en_mora; tot.pct_en_mora = pct(tot.en_mora, tot.creditos_activos);
  r.total = tot;
  if (por !== 'nada') {
    const valor = { creditos: x => x.creditos, cartera: x => x.dinero_en_la_calle, en_mora: x => x.en_mora, pct_mora: x => x.pct_en_mora, vencido: x => x.vencido }[ord] || (x => x.creditos);
    const minimo = ord === 'pct_mora' ? Math.max(1, parseInt(a.minimo, 10) || 5) : 0;
    const g = agrupar(l, por, x => x.fecha || '0000-00-00', (acc, x) => {
      acc.creditos += 1; acc.dinero_en_la_calle = r2(acc.dinero_en_la_calle + x.saldo);
      acc.en_mora += x.diasAtraso > 0 ? 1 : 0; acc.vencido = r2(acc.vencido + x.vencido);
      acc.pct_en_mora = pct(acc.en_mora, acc.creditos);
    }, valor, a, { minimo, porCifra: !!a.ordenar_por, vacio: { creditos: 0, dinero_en_la_calle: 0, en_mora: 0, vencido: 0, pct_en_mora: 0 } });
    r.grupos = g.grupos;
    if (g.omitidos) r.grupos_no_mostrados = g.omitidos;
    r.ordenado = g.orden === 'cronologico' ? ORDEN_TXT.cronologico : ORDEN_TXT[g.orden] + ' por ' + ({ creditos: 'créditos', cartera: 'dinero en la calle', en_mora: 'créditos en mora', pct_mora: '% en mora', vencido: 'monto vencido' }[ord] || ord);
    if (g.chicos) r.nota = 'Sin ' + g.chicos + (g.chicos === 1 ? ' grupo' : ' grupos') + ' de menos de ' + minimo + ' créditos (con 1 o 2 el porcentaje engaña).';
  }
  return r;
}
// Buscar a una persona o un crédito: primero el número exacto, después el nombre completo y después
// el nombre que empieza con lo buscado
// El número de un crédito: letras (o nada) y el número: CRED-052 (la 18) o M-064 (la 26) → ['CRED', 52] / ['M', 64]
const NUM_CRED = /^([A-Z]*)[\s-]*0*([0-9]+)$/;
function puntajeBusqueda(v, buscado) {
  const t = norm(buscado), id = norm(v.id), mq = NUM_CRED.exec(t), mi = NUM_CRED.exec(id);
  if (id === t || (mq && mi && +mq[2] === +mi[2] && (!mq[1] || mq[1] === mi[1]))) return 4;
  if (norm(v.cliente) === t) return 3;
  if (casa(v.cliente, buscado)) return 2;
  if (/[0-9]/.test(t) && id.indexOf(t) > -1) return 1;
  return 0;
}
function creditos(D, a, hoy) {
  const emps = empresas(a), est = a.estado || (a.buscar ? 'todos' : 'en_mora');
  let l = D.ventas.filter(v => emps.includes(v.empresa));
  if (est === 'en_mora') l = l.filter(v => v.diasAtraso > 0);
  else if (est === 'activos') l = l.filter(v => v.activo);
  else if (est === 'completados') l = l.filter(v => v.estado === 'completado');
  const pts = new Map();
  if (a.buscar) {
    l = l.filter(v => { const p = puntajeBusqueda(v, a.buscar); if (p) pts.set(v, p); return p > 0; });
    if (l.some(v => pts.get(v) === 4)) l = l.filter(v => pts.get(v) > 1);      // con el número exacto, nada «parecido» (M-64 no trae M-640)
  }
  if (a.vendidos_desde || a.vendidos_hasta) { const per = periodo({ desde: a.vendidos_desde, hasta: a.vendidos_hasta }, hoy); l = l.filter(v => enPeriodo(v.fecha, per)); }
  const r = {};
  l = filtrar(l, a, r);
  const orden = a.orden || (est === 'en_mora' ? 'mas_atraso' : 'mas_reciente');
  const cmp = { mas_atraso: (x, y) => y.diasAtraso - x.diasAtraso || y.vencido - x.vencido, mas_vencido: (x, y) => y.vencido - x.vencido || y.diasAtraso - x.diasAtraso, mas_saldo: (x, y) => y.saldo - x.saldo,
    mas_reciente: (x, y) => String(y.fecha).localeCompare(String(x.fecha)), mas_antiguo: (x, y) => String(x.fecha).localeCompare(String(y.fecha)) }[orden] || ((x, y) => y.diasAtraso - x.diasAtraso);
  l = l.slice().sort((x, y) => ((pts.get(y) || 0) - (pts.get(x) || 0)) || cmp(x, y));
  const max = Math.max(1, Math.min(25, parseInt(a.limite, 10) || 10));
  return Object.assign({ estado_buscado: { en_mora: 'en mora', activos: 'activos', completados: 'completados', todos: 'todos' }[est] || est, encontrados: l.length, mostrados: Math.min(max, l.length), creditos: l.slice(0, max).map(v => ({ credito: v.id, cliente: v.cliente, empresa: 'PAGASI ' + v.empresa, concesionario: v.concesionario, vendedor: v.vendedor, modelo: v.modelo,
    fecha_venta: v.fecha, estado: v.estado, dias_atraso: v.diasAtraso, vencido: v.vencido, saldo_por_cobrar: v.saldo, cuota_quincenal: v.cuota, cuotas_pagadas: v.cuotasPagadas, cuotas_total: v.cuotasTotal })) }, r);
}
function puntualidad(D, a, hoy) {
  const per = periodo(a, hoy, G.mesMas(hoy.slice(0, 7), -5) + '-01'), emps = empresas(a), por = a.agrupar_por || 'mes';
  const r = { periodo_de_vencimiento: verPeriodo(per), empresa: nombreEmpresa(emps) };
  const filas = [];
  filtrar(D.ventas.filter(v => emps.includes(v.empresa)), a, r).forEach(v => v.vencidas.forEach(q => { if (enPeriodo(q.vence, per)) filas.push(Object.assign({ vence: q.vence }, q, { empresa: v.empresa, concesionario: v.concesionario, vendedor: v.vendedor, modelo: v.modelo })); }));
  const sumar = (acc, x) => { acc.cuotas += 1; acc.monto = r2(acc.monto + x.monto); acc.a_tiempo = r2(acc.a_tiempo + x.aTiempo); acc.tarde = r2(acc.tarde + x.tarde); acc.sin_pagar = r2(acc.sin_pagar + x.sinPagar); };
  const vacio = { cuotas: 0, monto: 0, a_tiempo: 0, tarde: 0, sin_pagar: 0 };
  const conPct = x => Object.assign(x, { pct_a_tiempo: pct(x.a_tiempo, x.monto), pct_tarde: pct(x.tarde, x.monto), pct_sin_pagar: pct(x.sin_pagar, x.monto) });
  const tot = Object.assign({}, vacio); filas.forEach(x => sumar(tot, x));
  r.total = conPct(tot);
  r.nota = 'A tiempo = pagado hasta el día en que vencía la cuota; los pagos se aplican a la cuota más vieja primero. Solo cuotas que ya vencieron (antes de hoy).';
  if (por !== 'nada') {
    const ord = a.ordenar_por === 'pct_a_tiempo' ? (x => x.pct_a_tiempo) : a.ordenar_por === 'sin_pagar' ? (x => x.sin_pagar) : (x => x.monto);
    const g = agrupar(filas, por, x => x.vence, sumar, x => { conPct(x); return ord(x); }, a, { vacio, porCifra: !!a.ordenar_por, minimo: a.ordenar_por === 'pct_a_tiempo' ? 20 : 0 });
    r.grupos = g.grupos.map(conPct);
    if (g.omitidos) r.grupos_no_mostrados = g.omitidos;
    r.ordenado = ORDEN_TXT[g.orden] || g.orden;
    if (g.chicos) r.nota_minimo = 'Sin ' + g.chicos + (g.chicos === 1 ? ' grupo' : ' grupos') + ' de menos de ' + Math.max(1, parseInt(a.minimo, 10) || 20) + ' cuotas (con pocas el porcentaje engaña).';
  }
  return r;
}

// ── Los gráficos van dentro de la respuesta («responder»), con números que la AI ya sacó ──
const TIPOS_GRAFICO = ['barras', 'barras_horizontales', 'linea', 'torta'];
const MAX_GRAFICOS = 3, MAX_ETIQUETAS = 62;
const txtCorto = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
function unGrafico(a) {
  if (!a || typeof a !== 'object') throw new ErrorConsulta('no es un gráfico');
  const tipo = TIPOS_GRAFICO.includes(a.tipo) ? a.tipo : 'barras';
  if (!Array.isArray(a.etiquetas) || !a.etiquetas.length) throw new ErrorConsulta('faltan las etiquetas');
  if (a.etiquetas.length > MAX_ETIQUETAS) throw new ErrorConsulta('trae ' + a.etiquetas.length + ' etiquetas y el máximo es ' + MAX_ETIQUETAS + ': agrupa (por semana o por mes) o muestra menos');
  const etiquetas = a.etiquetas.map(e => txtCorto(e, 40));
  const entrada = Array.isArray(a.series) ? a.series : [];
  if (!entrada.length) throw new ErrorConsulta('falta la serie con los valores');
  if (entrada.length > (tipo === 'torta' ? 1 : 3)) throw new ErrorConsulta(tipo === 'torta' ? 'la torta lleva una sola serie' : 'máximo 3 series');
  const series = entrada.map((s0, k) => {
    const nombre = txtCorto(s0 && s0.nombre, 40) || 'Serie ' + (k + 1), vals = Array.isArray(s0 && s0.valores) ? s0.valores : [];
    if (vals.length !== etiquetas.length) throw new ErrorConsulta('la serie «' + nombre + '» trae ' + vals.length + ' valores y hay ' + etiquetas.length + ' etiquetas');
    return { nombre, valores: vals.map(v => { const x = typeof v === 'number' ? v : (typeof v === 'string' && /^-?[0-9]+(\.[0-9]{1,2})?$/.test(v.trim()) ? Number(v.trim()) : NaN); if (!isFinite(x)) throw new ErrorConsulta('«' + txtCorto(v, 20) + '» no es un número: manda los valores como números (12500, no «12.500» ni «$12.500»)'); return r2(x); }) };
  });
  return { tipo, titulo: txtCorto(a.titulo, 80) || 'Gráfico', etiquetas, series, formato: ['dinero', 'numero', 'porcentaje'].includes(a.formato) ? a.formato : 'numero', apilado: a.apilado === true && tipo !== 'torta' && series.length > 1 };
}
// Revisa los gráficos de una respuesta: los buenos se dibujan; los errores se le devuelven a la AI
function validarGraficos(lista) {
  const graficos = [], errores = [];
  if (lista != null && !Array.isArray(lista)) return { graficos, errores: ['«graficos» tiene que ser una lista'] };
  (lista || []).forEach((g, i) => { try { graficos.push(unGrafico(g)); } catch (e) { errores.push('gráfico ' + (i + 1) + ': ' + (e instanceof ErrorConsulta ? e.message : 'no se pudo leer')); } });
  if (graficos.length > MAX_GRAFICOS) { errores.push('son ' + graficos.length + ' gráficos y el máximo es ' + MAX_GRAFICOS); graficos.length = MAX_GRAFICOS; }
  return { graficos, errores };
}

// ── Las herramientas como las ve Claude ──
const EMPRESA = { type: 'string', enum: ['ambas', '18', '26'], description: 'ambas (por defecto), 18 (PAGASI 18) o 26 (PAGASI 26)' };
const FECHA = d => ({ type: 'string', description: d + ' (AAAA-MM-DD, hora de Venezuela)' });
const ORDEN = { type: 'string', enum: ['mayor', 'menor', 'cronologico'], description: 'mayor primero, menor primero o en orden de fecha/hora. Si no se dice: en orden de fecha al agrupar por día, semana, quincena o mes (y por hora o día de la semana sin «limite»); en los demás casos, mayor primero' };
const LIMITE = { type: 'integer', minimum: 1, maximum: 62, description: 'cuántos grupos devolver (15 por defecto en rankings). El corte sigue el orden: en orden de fecha se quedan los más recientes; de mayor a menor, los mayores' };
const HASTA = FECHA('último día (hoy si no se dice; lo anotado con fecha posterior a hoy se avisa en «aviso_fechas»)');
const FILTROS = { filtro_concesionario: { type: 'string', description: 'solo ese concesionario (una o más palabras del nombre)' }, filtro_vendedor: { type: 'string', description: 'solo ese vendedor (nombre o apellido; la respuesta dice qué nombres entraron en «coinciden»)' }, filtro_modelo: { type: 'string', description: 'solo ese modelo de moto (una o más palabras del nombre)' } };
const GRAFICO = { type: 'object', properties: { tipo: { type: 'string', enum: TIPOS_GRAFICO }, titulo: { type: 'string' }, etiquetas: { type: 'array', items: { type: 'string' }, maxItems: MAX_ETIQUETAS },
  series: { type: 'array', maxItems: 3, items: { type: 'object', properties: { nombre: { type: 'string' }, valores: { type: 'array', items: { type: 'number' } } }, required: ['nombre', 'valores'] } },
  formato: { type: 'string', enum: ['dinero', 'numero', 'porcentaje'] }, apilado: { type: 'boolean' } }, required: ['tipo', 'titulo', 'etiquetas', 'series'] };
const HERRAMIENTAS = [
  { name: 'ventas', description: 'Motos vendidas (créditos otorgados, sin anulados ni solicitudes sin aprobar) en un período: cuántas, cuánto se financió, precio, inicial y cuota promedio; y agrupadas. Para: cuántas se vendieron, qué concesionario/vendedor/modelo vendió más, a qué hora o qué día de la semana se vende más, ventas por día/semana/mes, comparar PAGASI 18 y 26. Los días, semanas, meses, horas, días de la semana y concesionarios sin ventas salen con 0.',
    input_schema: { type: 'object', properties: Object.assign({ empresa: EMPRESA, desde: FECHA('primer día'), hasta: HASTA,
      agrupar_por: { type: 'string', enum: ['nada', 'dia', 'semana', 'quincena', 'mes', 'hora', 'dia_semana', 'concesionario', 'vendedor', 'modelo', 'marca', 'empresa', 'plazo'] }, orden: ORDEN, limite: LIMITE }, FILTROS) } },
  { name: 'cobros', description: 'Lo cobrado (pagos confirmados) en un período, cuotas e iniciales, y agrupado: por día, semana, quincena, mes, hora en que se registró, día de la semana, forma de pago, tipo (cuotas o iniciales), concesionario, vendedor o modelo del crédito, o compañía. Los días, semanas, meses, horas, días de la semana y concesionarios sin cobros salen con 0.',
    input_schema: { type: 'object', properties: Object.assign({ empresa: EMPRESA, desde: FECHA('primer día'), hasta: HASTA, tipo: { type: 'string', enum: ['todo', 'cuotas', 'iniciales'] },
      agrupar_por: { type: 'string', enum: ['nada', 'dia', 'semana', 'quincena', 'mes', 'hora', 'dia_semana', 'metodo', 'tipo', 'concesionario', 'vendedor', 'modelo', 'empresa'] }, orden: ORDEN, limite: LIMITE }, FILTROS) } },
  { name: 'cartera', description: 'La cartera de HOY (créditos activos: al día o en mora): cuántos créditos, dinero en la calle (lo que falta por cobrar), cuántos en mora, % en mora y monto vencido; agrupada por compañía, concesionario, vendedor, modelo, tramo de días de atraso, mes de venta o plazo. Para: qué concesionario tiene más mora, cuánto hay en la calle, cómo está la mora.',
    input_schema: { type: 'object', properties: Object.assign({ empresa: EMPRESA, agrupar_por: { type: 'string', enum: ['nada', 'empresa', 'concesionario', 'vendedor', 'modelo', 'tramo_mora', 'mes_venta', 'plazo'] },
      ordenar_por: { type: 'string', enum: ['creditos', 'cartera', 'en_mora', 'pct_mora', 'vencido'], description: 'la cifra del ranking (de mayor a menor si no se dice «orden»)' }, orden: ORDEN, limite: LIMITE,
      minimo: { type: 'integer', minimum: 1, description: 'al ordenar por porcentaje: solo grupos con al menos esta cantidad de créditos (5 por defecto)' } }, FILTROS) } },
  { name: 'creditos', description: 'Créditos uno por uno, con el nombre del cliente: los que tienen más días de atraso o más vencido, los más recientes, o buscar el crédito de una persona por su nombre o número (al buscar, el estado por defecto es «todos»; si no se busca, «en_mora»). Nunca trae cédulas ni teléfonos.',
    input_schema: { type: 'object', properties: Object.assign({ empresa: EMPRESA, estado: { type: 'string', enum: ['en_mora', 'activos', 'completados', 'todos'] }, buscar: { type: 'string', description: 'nombre del cliente o número del crédito (el número exacto sale primero)' },
      vendidos_desde: FECHA('vendidos desde'), vendidos_hasta: FECHA('vendidos hasta'), orden: { type: 'string', enum: ['mas_atraso', 'mas_vencido', 'mas_saldo', 'mas_reciente', 'mas_antiguo'] },
      limite: { type: 'integer', minimum: 1, maximum: 25 } }, FILTROS) } },
  { name: 'puntualidad', description: 'Cómo se pagan las cuotas que ya vencieron: a tiempo (pagado hasta el día en que vencía), tarde o sin pagar, en dinero y porcentaje. Por mes o quincena de vencimiento, compañía, concesionario, vendedor o modelo. Por defecto, los últimos 6 meses.',
    input_schema: { type: 'object', properties: Object.assign({ empresa: EMPRESA, desde: FECHA('cuotas que vencieron desde'), hasta: FECHA('hasta'), agrupar_por: { type: 'string', enum: ['nada', 'mes', 'quincena', 'empresa', 'concesionario', 'vendedor', 'modelo'] },
      ordenar_por: { type: 'string', enum: ['monto', 'pct_a_tiempo', 'sin_pagar'], description: 'la cifra del ranking (de mayor a menor si no se dice «orden»)' }, orden: ORDEN, limite: LIMITE,
      minimo: { type: 'integer', minimum: 1, description: 'al ordenar por porcentaje: solo grupos con al menos esta cantidad de cuotas (20 por defecto)' } }, FILTROS) } },
  { name: 'responder', description: 'Entrega la respuesta final a la persona: es la ÚNICA forma de que la vea. Llámala una sola vez, sola y al final, cuando ya tengas todos los números, con el texto completo y, si ayudan, los gráficos (uno; dos como mucho) hechos con números que YA sacaste de las consultas.',
    input_schema: { type: 'object', properties: { texto: { type: 'string', description: 'la respuesta completa, en markdown sencillo y en español' }, graficos: { type: 'array', maxItems: MAX_GRAFICOS, items: GRAFICO } }, required: ['texto'] } }
];
const NOMBRE_CONSULTA = { ventas: 'ventas', cobros: 'cobros', cartera: 'cartera de hoy', creditos: 'créditos uno por uno', puntualidad: 'cuotas a tiempo' };
const POR_TXT = { dia: 'por día', semana: 'por semana', quincena: 'por quincena', mes: 'por mes', mes_venta: 'por mes de venta', hora: 'por hora', dia_semana: 'por día de la semana', concesionario: 'por concesionario', vendedor: 'por vendedor', modelo: 'por modelo', marca: 'por marca', empresa: 'por compañía', plazo: 'por plazo', metodo: 'por forma de pago', tipo: 'cuotas e iniciales', tramo_mora: 'por días de atraso' };
// Lo que se le muestra a la persona debajo de la respuesta: qué consultó (para que sepa de dónde salió)
function resumen(nombre, a, hoy) {
  a = a || {};
  if (!NOMBRE_CONSULTA[nombre]) return '';
  const partes = [NOMBRE_CONSULTA[nombre]];
  if (a.agrupar_por && a.agrupar_por !== 'nada') partes.push(POR_TXT[a.agrupar_por] || a.agrupar_por);
  if (a.empresa === '18' || a.empresa === '26') partes.push('PAGASI ' + a.empresa);
  const d = esFecha(a.desde) ? a.desde : '', h = esFecha(a.hasta) ? a.hasta : '';
  if (d && (d === h || (d === hoy && !h))) partes.push(d === hoy ? 'hoy' : d);
  else if (d || h) partes.push((d || 'el principio') + ' a ' + (h || 'hoy'));
  ['filtro_concesionario', 'filtro_vendedor', 'filtro_modelo'].forEach(k => { if (a[k]) partes.push(String(a[k]).slice(0, 30)); });
  if (nombre === 'creditos' && a.buscar) partes.push('«' + String(a.buscar).slice(0, 30) + '»');
  return partes.join(' · ');
}
// Ejecutar lo que pidió la AI. ctx: { D, hoy, usadas }. «responder» no pasa por aquí (lo maneja ai.js)
function ejecutar(nombre, args, ctx) {
  const a = (args && typeof args === 'object') ? args : {};
  let r;
  switch (nombre) {
    case 'ventas': r = ventas(ctx.D, a, ctx.hoy); break;
    case 'cobros': r = cobros(ctx.D, a, ctx.hoy); break;
    case 'cartera': r = cartera(ctx.D, a); break;
    case 'creditos': r = creditos(ctx.D, a, ctx.hoy); break;
    case 'puntualidad': r = puntualidad(ctx.D, a, ctx.hoy); break;
    default: throw new ErrorConsulta('No existe la consulta «' + String(nombre).slice(0, 40) + '».');
  }
  const txt = resumen(nombre, a, ctx.hoy);
  if (txt && ctx.usadas.indexOf(txt) < 0) ctx.usadas.push(txt);
  return r;
}

module.exports = { armar, cargar, olvidar, ejecutar, HERRAMIENTAS, ErrorConsulta, horaCaracas, horaDeId, lunesDe, norm, casa, resumen, validarGraficos, VIGENCIA_MS, MAX_GRAFICOS, MAX_ETIQUETAS,
  consultas: { ventas, cobros, cartera, creditos, puntualidad } };
