// PAGASI 18 + 26 (21-nov-2026). Adam: "un dashboard de qué tiene pagasi 18 y 26 juntos… cada
// hora no: cuando alguien se meta en ese módulo… los créditos, dinero en la calle, cantidad de
// mora… solo las cosas básicas".
//
// Cuando alguien abre el módulo, el panel pide esto con la sesión del usuario (POST /equipo
// { accion: 'resumenGrupo' }). Aquí se leen los créditos y los pagos de las dos bases EN ESE
// MOMENTO, se hacen las mismas cuentas del Dashboard (logic/grupo-resumen.js, con el mismo ledger) y se responde.
// No se guarda nada en ninguna base y no sale ningún dato de clientes: solo las sumas.
const path = require('path'), fs = require('fs');
// La lógica compartida con el panel: al desplegar se copia a functions/logic (firebase.json,
// predeploy); en el repo se usa la original de logic/. La misma matemática que la pantalla.
function compartido(nombre) { const copia = path.join(__dirname, '..', 'logic', nombre), original = path.join(__dirname, '..', '..', 'logic', nombre); return require(fs.existsSync(original) ? original : copia); }
const { grupoResumen, grupoSumar } = compartido('grupo-resumen.js');
const ledger = compartido('credito-ledger.js');

const EMPRESAS = [['18', 'PAGASI 18'], ['26', 'PAGASI 26']];
// Si dos personas lo abren casi a la vez (o alguien entra y sale), la segunda respuesta sale de
// esta memoria en vez de volver a leer todo. «Actualizar» en la pantalla la salta.
const VIGENCIA_MS = 60 * 1000;
let memoria = null;

const docs = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));   // igual que el panel (_rtDesempacar)
// Los días de gracia de cada compañía (Configuración → config/plan), como los lee el panel
function graciaDe(planDoc) {
  const p = (planDoc && planDoc.exists && planDoc.data()) || {};
  const g = Object.prototype.hasOwnProperty.call(p, 'diasGracia') ? p.diasGracia : p.gracia;
  return (g !== undefined && g !== null && isFinite(Number(g))) ? Number(g) : 5;
}

async function resumenEmpresa(db, hoy) {
  const [creds, pagos, plan] = await Promise.all([db.collection('creditos').get(), db.collection('pagos').get(), db.collection('config').doc('plan').get()]);
  return grupoResumen(docs(creds), docs(pagos), { hoy, gracia: graciaDe(plan), ledger });
}

// deps: { bases: { '18': db, '26': db }, hoy: 'AAAA-MM-DD' en Venezuela, ahora: ISO, log }
async function resumenGrupo(deps, o) {
  const t0 = Date.now();
  if (!(o && o.fresco) && memoria && memoria.hoy === deps.hoy && t0 - memoria.t < VIGENCIA_MS) return Object.assign({}, memoria.r, { deMemoria: true });
  const empresas = {};
  await Promise.all(EMPRESAS.map(async ([emp, nombre]) => {
    try { empresas[emp] = Object.assign({ nombre }, await resumenEmpresa(deps.bases[emp], deps.hoy)); }
    catch (e) { empresas[emp] = { nombre, error: 'No se pudo leer ' + nombre }; if (deps.log) deps.log('grupo: no se pudo leer la ' + emp, { error: String(e && e.message || e).slice(0, 200) }); }
  }));
  const r = { hoy: deps.hoy, calculado: deps.ahora, empresas, juntas: grupoSumar(EMPRESAS.map(([emp]) => empresas[emp])) };
  if (r.juntas) memoria = { t: Date.now(), hoy: deps.hoy, r };   // lo incompleto no se guarda: la próxima vuelve a intentar
  if (deps.log) deps.log('grupo', { ms: Date.now() - t0, completo: !!r.juntas });
  return r;
}

// Quién lo puede ver: un administrador o alguien con el permiso «PAGASI 18 + 26» en su ficha
const puedeVer = quien => !!(quien && (quien.admin || (Array.isArray(quien.permisos) && quien.permisos.includes('grupo'))));
const olvidar = () => { memoria = null; };

module.exports = { resumenGrupo, puedeVer, graciaDe, olvidar, VIGENCIA_MS };
