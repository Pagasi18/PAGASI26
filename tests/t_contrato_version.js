// 22-sep-2026, reportado por Adam: al VER un contrato salía el viejo y al IMPRIMIRLO
// salía el nuevo. Dos documentos distintos para el mismo crédito, que en un papel que
// se firma es un problema de verdad.
// La causa: en verContratoById el crédito se buscaba DENTRO del if que agrega la
// opción al desplegable. Si el crédito ya estaba en la lista, la variable llegaba
// vacía a _contratoVersionDe(), que sin crédito devuelve 'dra' — el contrato viejo.
// Aparte: el Anexo C decía 2 llaves y 1 casco; se entrega UNA llave y ningún casco.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── El crédito se busca siempre, no solo cuando falta en el desplegable ───────
const ctr = src('logic/contratos.js');
const fn = ctr.slice(ctr.indexOf('function verContratoById'), ctr.indexOf('// Overlay a pantalla completa'));
ok('la búsqueda del crédito está ANTES de tocar el desplegable',
  fn.indexOf('var c = (S.creds||[]).find') < fn.indexOf("getElementById('sel-cred')"));
ok('...y ya no está metida dentro del if', !/if\(!has\)\{[\s\S]{0,120}var c = \(S\.creds/.test(fn));
ok('sin crédito no se toca el tipo de documento (antes caía en el viejo)',
  /if\(td && c\) td\.value = _contratoVersionDe\(c\);/.test(fn));

// ── Las dos salidas eligen la MISMA versión ──────────────────────────────────
const rep = src('logic/reportes.js');
ok('al imprimir también se usa la versión del crédito',
  /td\.value = _contratoVersionDe\(cc\)/.test(rep));

// ── _contratoVersionDe, con el crédito delante ───────────────────────────────
const G = { console:{log(){},warn(){}}, String, Date, S:{creds:[]}, window:{} }; G.window = G;
vm.createContext(G);
// La fecha desde la que rige el contrato de hoy vive en contratos-protect.js: se lee
// del archivo, no se copia a mano, para que la prueba siga a la realidad.
const pro0 = src('logic/contratos-protect.js');
vm.runInContext(pro0.slice(pro0.indexOf('var _CONTRATO_PROTECT_DESDE'), pro0.indexOf('\n', pro0.indexOf('var _CONTRATO_PROTECT_DESDE'))), G);
vm.runInContext(ctr.slice(0, ctr.indexOf('function renderContrato()')), G);
ok('la fecha del contrato de hoy se leyó del archivo', G._CONTRATO_PROTECT_DESDE === '2026-09-07');
const V = G._contratoVersionDe;
ok('un crédito sin firmar lleva el contrato de hoy', V({ id:'CRED-1', fecha:'2026-09-20' }) === 'protect');
ok('uno firmado el 10-sep lleva el de hoy',
  V({ id:'CRED-2', contratoFirmado:true, fechaContratoFirmado:'2026-09-10' }) === 'protect');
ok('uno firmado el 2-sep lleva el de esa época',
  V({ id:'CRED-3', contratoFirmado:true, fechaContratoFirmado:'2026-09-02' }) === 'dra');
ok('uno firmado en julio lleva la estructura anterior',
  V({ id:'CRED-4', contratoFirmado:true, fechaContratoFirmado:'2026-07-15' }) === 'contrato');
ok('si el crédito trae grabada su versión, esa manda',
  V({ id:'CRED-5', contratoVersion:'dra', contratoFirmado:true, fechaContratoFirmado:'2026-09-20' }) === 'dra');

// ── El desplegable solo ofrece las versiones que el sistema puede elegir ─────
const mod = src('modules/contratos.js');
const opciones = (mod.match(/<option value="([a-z]+)">/g) || []).map(x => x.replace(/.*value="|">/g, ''));
const tipos = opciones.filter(o => ['protect','dra','contrato','venta','cesion','ambos','pagare','carta','arriendo'].indexOf(o) > -1);
ok('quedan las tres versiones de contrato, ni una más',
  tipos.length === 3 && tipos.indexOf('protect') > -1 && tipos.indexOf('dra') > -1 && tipos.indexOf('contrato') > -1);
ok('el que se firma hoy va primero', tipos[0] === 'protect');
ok('las tres que el sistema puede elegir solo están',
  ['protect','dra','contrato'].every(t => tipos.indexOf(t) > -1));
ok('ya no se ofrecen pagaré, carta ni arrendamiento',
  ['pagare','carta','arriendo','venta','cesion','ambos'].every(t => tipos.indexOf(t) === -1));

// ── Anexo C ──────────────────────────────────────────────────────────────────
const pro = src('logic/contratos-protect.js');
ok('el Anexo C dice UNA llave', /\['Llaves recibidas \(cantidad\)', S\('1'\)\]/.test(pro));
ok('...y ya no dice dos', !/\['Llaves recibidas \(cantidad\)', S\('2'\)\]/.test(pro));
ok('el Anexo C ya no habla de cascos', pro.indexOf('Cascos recibidos') === -1);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
