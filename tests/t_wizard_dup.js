// Copia duplicada del wizard (bot/quitar-wizard-duplicado.js): solo borra
// wizardData cuando es identico a wizardDraft; el dry no escribe; el real solo
// toca ese campo, deja respaldo con ids (sin contenido) y verifica al final.
const path = require('path');
const B = require(path.join(__dirname, '..', 'bot', 'quitar-wizard-duplicado.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const BORRAR = { _sentinel: 'delete' };

function fakeDb(creds) {
  const docs = { creditos: new Map(), respaldos: new Map() };
  creds.forEach(c => docs.creditos.set(c.id, JSON.parse(JSON.stringify(c))));
  const writes = []; let commits = 0;
  const ref = (col, id) => ({ col, id });
  const snap = (col, id) => {
    const has = docs[col].has(id);
    return { id, ref: ref(col, id), exists: has, data: () => (has ? JSON.parse(JSON.stringify(docs[col].get(id))) : undefined) };
  };
  const aplicar = w => {
    writes.push(w);
    if (w.op === 'set') { docs[w.r.col].set(w.r.id, w.data); return; }
    const d = docs[w.r.col].get(w.r.id);
    Object.keys(w.data).forEach(k => { if (w.data[k] === BORRAR) delete d[k]; else d[k] = w.data[k]; });
  };
  return {
    writes, docs, commits: () => commits,
    collection: col => ({
      get: async () => ({ forEach: fn => [...docs[col].keys()].forEach(id => fn(snap(col, id))) }),
      doc: id => ({ set: async data => aplicar({ op: 'set', r: ref(col, id), data }) }),
    }),
    getAll: async (...refs) => { if (!refs.length) throw new Error('getAll vacio'); return refs.map(r => snap(r.col, r.id)); },
    batch: () => { const pend = []; return { update: (r, data) => pend.push({ op: 'update', r, data }), commit: async () => { commits++; pend.forEach(aplicar); } }; },
  };
}

const W = { paso: 2, cli: 'NOMBRE SECRETO', ingreso: 500, refs: [{ n: 'a' }, { n: 'b' }] };
const creds = [
  { id: 'CRED-1', cli: 'NOMBRE SECRETO', wizardDraft: W, wizardData: JSON.parse(JSON.stringify(W)) },   // identica -> se limpia
  { id: 'CRED-2', cli: 'X', wizardDraft: W, wizardData: Object.assign({}, W, { paso: 3 }) },            // distinta -> se queda
  { id: 'CRED-3', cli: 'X', wizardData: W },                                                             // sin draft -> se queda
  { id: 'CRED-4', cli: 'X', wizardDraft: W },                                                            // ya limpio
  { id: 'CRED-5', cli: 'X', wizardDraft: null, wizardData: null },                                       // nulos identicos -> se limpia
];

(async () => {
  let db = fakeDb(creds), L = [];
  let r = await B.correr(db, { dry: true, borrar: BORRAR, log: s => L.push(String(s)) });
  ok('dry: 2 identicas para limpiar', r.limpiar === 2);
  ok('dry: no escribe nada', db.writes.length === 0);
  ok('dry: reporta las que se quedan', /sin wizardDraft: 1/.test(L.join('\n')) && /copias distintas: 1/.test(L.join('\n')));
  ok('dry: linea RESULTADO', L.some(s => /^RESULTADO dry=1 limpiar=2 limpiadas=0 verificadas=0 bytes=\d+$/.test(s)));
  ok('el log no muestra nombres', !L.join('\n').includes('NOMBRE SECRETO'));

  db = fakeDb(creds); L = [];
  r = await B.correr(db, { dry: false, borrar: BORRAR, log: s => L.push(String(s)) });
  ok('real: limpia 2 y las verifica', r.limpiadas === 2 && r.verificadas === 2);
  ok('real: CRED-1 queda sin wizardData y CON wizardDraft', !('wizardData' in db.docs.creditos.get('CRED-1')) && db.docs.creditos.get('CRED-1').wizardDraft.paso === 2);
  ok('real: CRED-2 (distinta) intacta', 'wizardData' in db.docs.creditos.get('CRED-2'));
  ok('real: CRED-3 (sin draft) intacta', 'wizardData' in db.docs.creditos.get('CRED-3'));
  const ups = db.writes.filter(w => w.op === 'update');
  ok('real: solo escribe el campo wizardData', ups.length === 2 && ups.every(w => Object.keys(w.data).length === 1 && w.data.wizardData === BORRAR));
  ok('real: no toca otros campos', db.docs.creditos.get('CRED-1').cli === 'NOMBRE SECRETO');
  const bk = db.writes.filter(w => w.op === 'set' && w.r.col === 'respaldos');
  ok('real: respaldo con los ids', bk.length === 1 && bk[0].data.creditos.length === 2 && bk[0].data.creditos.some(x => x.id === 'CRED-1'));
  ok('real: el respaldo no guarda nombres ni contenido', !JSON.stringify(bk[0].data).includes('NOMBRE SECRETO'));
  ok('real: RESULTADO con respaldo', L.some(s => /^RESULTADO dry=0 limpiar=2 limpiadas=2 verificadas=2 bytes=\d+ respaldo=respaldos\/wizard-duplicado-/.test(s)));

  const antes = db.writes.length;
  r = await B.correr(db, { dry: false, borrar: BORRAR, log: () => {} });
  ok('segunda vez: nada que limpiar, nada escrito', r.limpiar === 0 && db.writes.length === antes);

  // Muchos: se hace por lotes
  const muchos = []; for (let i = 0; i < B.LOTE + 50; i++) muchos.push({ id: 'CRED-M' + i, wizardDraft: W, wizardData: JSON.parse(JSON.stringify(W)) });
  db = fakeDb(muchos);
  r = await B.correr(db, { dry: false, borrar: BORRAR, log: () => {} });
  ok('con mas de un lote: limpia todos en 2 commits', r.limpiadas === B.LOTE + 50 && db.commits() === 2);

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA excepcion: ' + e.message); console.log(''); console.log(pass + ' pruebas OK, ' + (fail + 1) + ' fallas'); process.exitCode = 1; });
