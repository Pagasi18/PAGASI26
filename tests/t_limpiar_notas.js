// Limpieza puntual de notas de cobranza pegadas (bot/limpiar-notas-cobranza.js).
// La regla sale de logic/pagos.js. Se prueba con una base falsa: el dry no
// escribe, el real solo toca cobranzaStatus y deja respaldo, y nunca muestra
// nombres de clientes. Fechas RELATIVAS: la regla usa la fecha real de hoy.
const path = require('path');
const B = require(path.join(__dirname, '..', 'bot', 'limpiar-notas-cobranza.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const iso = d => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const dLoc = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

// ── La regla viene del sistema ──
const regla = B.cargarRegla();
ok('la regla sale de logic/pagos.js: 8 notas de deuda', regla.notas.length === 8);
ok('incluye "gestion"', regla.notas.indexOf('gestion') >= 0);
ok('no incluye "problema" ni "revision"', regla.notas.indexOf('problema') < 0 && regla.notas.indexOf('revision') < 0);
ok('trae la regla de "al dia" del sistema', typeof regla.alDia === 'function');
ok('cargar el script no se conecta a la base', typeof B.correr === 'function');

// ── Qué cuenta como pago ──
const P = x => Object.assign({ cred: 'CRED-901', monto: 50, fecha: dLoc(-2), estado: 'confirmado' }, x);
ok('pago confirmado cuenta', B.esPagoReal(P({})));
ok('sin estado cuenta como confirmado (igual que el sistema)', B.esPagoReal(P({ estado: undefined })));
ok('pendiente no cuenta', !B.esPagoReal(P({ estado: 'pendiente' })));
ok('eliminado no cuenta', !B.esPagoReal(P({ eliminado: true })));
ok('la inicial (esInicial) no cuenta', !B.esPagoReal(P({ esInicial: true })));
ok('la inicial (tipoOperacion) no cuenta', !B.esPagoReal(P({ tipoOperacion: 'inicial_credito' })));
ok('la inicial (concepto) no cuenta', !B.esPagoReal(P({ concepto: 'Inicial · Ana · CRED-901' })));
ok('monto 0 no cuenta', !B.esPagoReal(P({ monto: 0 })));
const u = B.ultimosPagos([P({ fecha: dLoc(-10) }), P({ fecha: dLoc(-3) }), P({ fecha: dLoc(-1), estado: 'pendiente' }), P({ cred: 'CRED-902', fecha: dLoc(-5) })]);
ok('toma el ultimo pago real de cada credito', u['CRED-901'] === dLoc(-3) && u['CRED-902'] === dLoc(-5));

// ── Qué se limpia y qué se queda ──
const lim = dLoc(-B.VENTANA_DIAS);
// hace 20 dias, 1 cuota pagada: la siguiente vence dentro de 10 dias -> al dia
const C = x => Object.assign({ id: 'CRED-901', fecha: dLoc(-20), pagado: 1, totalCuotas: 24, estado: 'activo', cobranzaStatus: 'gestion' }, x);
const ev = (c, ult) => B.evaluar(c, ult || { 'CRED-901': dLoc(-3) }, regla, lim).accion;
ok('al dia + pago hace 3 dias + "En gestion" -> se limpia', ev(C({})) === 'limpiar');
ok('sigue atrasado -> se queda', ev(C({ fecha: dLoc(-50) })) === 'atrasado');
ok('al dia pero nunca pago -> se queda', ev(C({}), {}) === 'sin_pago_reciente');
ok('al dia pero ultimo pago hace 45 dias -> se queda', ev(C({}), { 'CRED-901': dLoc(-45) }) === 'sin_pago_reciente');
ok('pago justo hace 30 dias -> se limpia', ev(C({}), { 'CRED-901': lim }) === 'limpiar');
ok('"Cliente con problema" -> nunca', ev(C({ cobranzaStatus: 'problema' })) === 'no_es_de_deuda');
ok('"En revision" -> nunca', ev(C({ cobranzaStatus: 'revision' })) === 'no_es_de_deuda');
ok('credito eliminado -> no se toca', ev(C({ eliminado: true })) === 'eliminado');
ok('credito cancelado -> no se toca', ev(C({ estado: 'cancelado' })) === 'cancelado');
ok('completado con pago reciente -> se limpia', ev(C({ estado: 'completado', fecha: dLoc(-400), cobranzaStatus: 'promesa' })) === 'limpiar');
ok('fecha rara -> no se asume al dia', ev(C({ fecha: { seconds: 1 } })) === 'atrasado');
ok('sin nota -> nada', ev(C({ cobranzaStatus: '' })) === 'sin_nota');
regla.notas.forEach(n => ok('se limpia "' + n + '"', ev(C({ cobranzaStatus: n })) === 'limpiar'));

// ── Base falsa ──
function fakeDb(creds, pagos, opts) {
  opts = opts || {};
  const docs = { creditos: new Map(), pagos: new Map(), respaldos: new Map() };
  creds.forEach(c => docs.creditos.set(c.id, JSON.parse(JSON.stringify(c))));
  pagos.forEach((p, i) => docs.pagos.set(p.id || ('P' + i), p));
  const writes = [];
  const ref = (col, id) => ({ col, id });
  const snap = (col, id) => {
    const has = docs[col].has(id);
    return { id, ref: ref(col, id), exists: has, data: () => (has ? JSON.parse(JSON.stringify(docs[col].get(id))) : undefined) };
  };
  return {
    writes, docs,
    collection: col => ({
      get: async () => ({ forEach: fn => [...docs[col].keys()].forEach(id => fn(snap(col, id))) }),
      doc: id => ref(col, id),
    }),
    getAll: async (...refs) => {
      if (!refs.length) throw new Error('getAll sin documentos');
      return refs.map(r => snap(r.col, r.id));
    },
    runTransaction: async fn => {
      const pend = [];
      const t = {
        getAll: async (...refs) => {
          if (!refs.length) throw new Error('getAll sin documentos');
          if (opts.enLaTransaccion) opts.enLaTransaccion(docs);
          return refs.map(r => snap(r.col, r.id));
        },
        set: (r, data) => pend.push({ op: 'set', r, data }),
        update: (r, data) => pend.push({ op: 'update', r, data }),
      };
      await fn(t);
      pend.forEach(w => {
        writes.push(w);
        if (w.op === 'set') docs[w.r.col].set(w.r.id, w.data);
        else docs[w.r.col].set(w.r.id, Object.assign(docs[w.r.col].get(w.r.id), w.data));
      });
    },
  };
}

(async () => {
  const creds = [
    C({ id: 'CRED-901', cli: 'NOMBRE SECRETO UNO' }),                     // se limpia
    C({ id: 'CRED-902', fecha: dLoc(-50), cli: 'NOMBRE SECRETO DOS' }),   // atrasado
    C({ id: 'CRED-903', cobranzaStatus: 'problema' }),                    // otra nota
    C({ id: 'CRED-904', cobranzaStatus: '' }),                            // sin nota
    C({ id: 'CRED-905', cobranzaStatus: 'no_contesta' }),                 // se limpia
    C({ id: 'CRED-906' }),                                                // al dia sin pago reciente
  ];
  const pagos = [
    P({ id: 'p1', cred: 'CRED-901', cli: 'NOMBRE SECRETO UNO' }),
    P({ id: 'p2', cred: 'CRED-902' }),
    P({ id: 'p3', cred: 'CRED-903' }),
    P({ id: 'p5', cred: 'CRED-905' }),
    P({ id: 'p6', cred: 'CRED-906', fecha: dLoc(-60) }),
  ];

  // Prueba en seco
  let db = fakeDb(creds, pagos), L = [];
  let r = await B.correr(db, { dry: true, log: s => L.push(String(s)) });
  let texto = L.join('\n');
  ok('dry: encuentra 2 para limpiar', r.limpiar === 2);
  ok('dry: no escribe nada', db.writes.length === 0);
  ok('dry: la nota sigue en la base', db.docs.creditos.get('CRED-901').cobranzaStatus === 'gestion');
  ok('dry: lista los creditos a limpiar', texto.includes('CRED-901') && texto.includes('CRED-905'));
  ok('dry: cuenta los que se quedan', /siguen atrasados: 1/.test(texto) && /otras notas .*: 1/.test(texto) && /sin pago en los ultimos 30 dias: 1/.test(texto));
  ok('dry: linea RESULTADO', L.some(s => /^RESULTADO dry=1 limpiar=2 limpiadas=0 verificadas=0 excede=0$/.test(s)));
  ok('el log no muestra nombres de clientes', !texto.includes('NOMBRE SECRETO'));

  // Real
  db = fakeDb(creds, pagos); L = [];
  r = await B.correr(db, { dry: false, log: s => L.push(String(s)) });
  ok('real: limpia 2 y las verifica', r.limpiadas === 2 && r.verificadas === 2);
  ok('real: CRED-901 queda sin nota', db.docs.creditos.get('CRED-901').cobranzaStatus === '');
  ok('real: CRED-905 queda sin nota', db.docs.creditos.get('CRED-905').cobranzaStatus === '');
  ok('real: el atrasado conserva su nota', db.docs.creditos.get('CRED-902').cobranzaStatus === 'gestion');
  ok('real: "Cliente con problema" intacto', db.docs.creditos.get('CRED-903').cobranzaStatus === 'problema');
  ok('real: el que no pago hace rato conserva su nota', db.docs.creditos.get('CRED-906').cobranzaStatus === 'gestion');
  const ups = db.writes.filter(w => w.op === 'update');
  ok('real: solo escribe el campo cobranzaStatus', ups.length === 2 && ups.every(w => Object.keys(w.data).length === 1 && w.data.cobranzaStatus === ''));
  ok('real: no toca pagado, estado ni mora', db.docs.creditos.get('CRED-901').pagado === 1 && db.docs.creditos.get('CRED-901').estado === 'activo');
  const bk = db.writes.filter(w => w.op === 'set' && w.r.col === 'respaldos');
  ok('real: guarda respaldo con la nota anterior', bk.length === 1 && bk[0].data.creditos.length === 2 &&
    bk[0].data.creditos.some(x => x.id === 'CRED-901' && x.notaAnterior === 'gestion') &&
    bk[0].data.creditos.some(x => x.id === 'CRED-905' && x.notaAnterior === 'no_contesta'));
  ok('real: el respaldo no guarda nombres', !JSON.stringify(bk[0].data).includes('NOMBRE SECRETO'));
  ok('real: linea RESULTADO con el respaldo', L.some(s => /^RESULTADO dry=0 limpiar=2 limpiadas=2 verificadas=2 excede=0 respaldo=respaldos\/notas-cobranza-/.test(s)));
  ok('real: el log tampoco muestra nombres', !L.join('\n').includes('NOMBRE SECRETO'));

  // Correrlo otra vez: ya no hay nada que hacer
  const antes = db.writes.length; L = [];
  r = await B.correr(db, { dry: false, log: s => L.push(String(s)) });
  ok('segunda vez: nada que limpiar y nada escrito', r.limpiar === 0 && db.writes.length === antes);

  // Filtro: solo 'gestion'
  db = fakeDb(creds, pagos); L = [];
  r = await B.correr(db, { dry: false, notas: ['gestion'], log: s => L.push(String(s)) });
  ok('filtro gestion: limpia solo esa (1)', r.limpiadas === 1 && db.docs.creditos.get('CRED-901').cobranzaStatus === '');
  ok('filtro gestion: "no_contesta" se queda', db.docs.creditos.get('CRED-905').cobranzaStatus === 'no_contesta');
  ok('filtro gestion: lo avisa en el log', L.some(s => /Filtro: solo gestion/.test(s)));
  db = fakeDb(creds, pagos);
  let errF = null;
  try { await B.correr(db, { dry: true, notas: ['problema'], log: () => {} }); } catch (e) { errF = e; }
  ok('filtro con "problema": error y nada escrito', !!errF && db.writes.length === 0);
  db = fakeDb(creds, pagos); errF = null;
  try { await B.correr(db, { dry: true, notas: ['nota_inventada'], log: () => {} }); } catch (e) { errF = e; }
  ok('filtro con nota inventada: error', !!errF);

  // Un empleado cambia una nota justo en el medio
  db = fakeDb(creds, pagos, { enLaTransaccion: docs => { docs.creditos.get('CRED-905').cobranzaStatus = 'problema'; } });
  r = await B.correr(db, { dry: false, log: () => {} });
  ok('si alguien cambia la nota en el medio, se respeta lo que puso', r.limpiadas === 1 && db.docs.creditos.get('CRED-905').cobranzaStatus === 'problema');

  // Todos cambiaron en el medio: nada que escribir, ni respaldo
  db = fakeDb(creds, pagos, { enLaTransaccion: docs => { docs.creditos.get('CRED-901').cobranzaStatus = ''; docs.creditos.get('CRED-905').cobranzaStatus = ''; } });
  r = await B.correr(db, { dry: false, log: () => {} });
  ok('si ya no queda nada al escribir, no escribe ni respaldo', r.limpiadas === 0 && db.writes.length === 0);

  // Demasiados: algo raro pasa
  const muchos = [], pm = [];
  for (let i = 0; i < B.MAXIMO + 1; i++) { muchos.push(C({ id: 'CRED-M' + i })); pm.push(P({ id: 'pm' + i, cred: 'CRED-M' + i })); }
  db = fakeDb(muchos, pm); L = [];
  r = await B.correr(db, { dry: true, log: s => L.push(String(s)) });
  ok('dry con demasiados: avisa', r.excede === true && L.some(s => /MAXIMO/.test(s)) && L.some(s => /excede=1$/.test(s)));
  db = fakeDb(muchos, pm);
  let err = null;
  try { await B.correr(db, { dry: false, log: () => {} }); } catch (e) { err = e; }
  ok('real con demasiados: falla y no escribe nada', !!err && db.writes.length === 0);

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA excepcion: ' + e.message); console.log(''); console.log(pass + ' pruebas OK, ' + (fail + 1) + ' fallas'); process.exitCode = 1; });
