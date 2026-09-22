// 22-sep-2026: una vendedora edito un credito, en el paso 3 eligio otro modelo, guardo,
// el sistema dijo "Solicitud actualizada correctamente" y el credito se quedo con el
// modelo viejo (una EK XPRESS). El guardado de la edicion saca el modelo SIEMPRE de la
// moto atada, y elegir un modelo del catalogo suelta la moto: la eleccion se perdia en
// silencio. Ahora pregunta si esa unidad es en realidad ese modelo y, con el si, corrige
// la moto y el credito; con el no, lo dice claro y no cambia nada.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento() {
  return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], options:[], selectedIndex:-1, appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
const preguntas = [];
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';},
  confirm(m){ preguntas.push(String(m)); return ctx.__respuesta; },
  open(){ return { document:{ write(){}, close(){} } }; },
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});

const avisos = [];
ctx.toast = function(m, t){ avisos.push(String(m)); };
ctx.logActividad = function(){};
const guardadas = [];
ctx.DB = { saveMoto(m){ guardadas.push(m); return Promise.resolve(); }, saveCred(){ return Promise.resolve(); },
  updateCred(){ return Promise.resolve(); }, saveEgreso(){ return Promise.resolve(); }, saveMovimiento(){ return Promise.resolve(); },
  savePago(){ return Promise.resolve(); }, saveCliente(){ return Promise.resolve(); } };

const S = ctx.S;
S.currentUser = { uid:'u1', nombre:'Vendedora', rol:'Administrador', permisos:['motos','creditos'] };

// El trozo que se prueba: el bloque de edicion de _wzGuardar, tal cual esta en el archivo.
const fuente = fs.readFileSync(path.join(ROOT,'logic','creditos.js'),'utf8');
const desde = fuente.indexOf('var _modeloFinal = _motoRec');
const hasta = fuente.indexOf('var _upd = {', desde);
ok('el guardado de la edicion sigue teniendo el bloque del modelo', desde > -1 && hasta > desde);
const bloque = fuente.slice(desde, hasta);

function correr(respuesta, modeloElegido, modeloDeLaMoto, permisoMotos) {
  preguntas.length = 0; avisos.length = 0; guardadas.length = 0;
  ctx.__respuesta = respuesta;
  ctx.hasModuleAccess = function(k){ return k === 'motos' ? permisoMotos !== false : true; };
  const moto = { id:501, modelo:modeloDeLaMoto, estado:'financiada' };
  S.motos = [moto];
  S.creds = [{ id:'CRED-501', cli:'CLIENTE', modelo:modeloDeLaMoto, motoId:501, estado:'activo' }];
  ctx.WZ = Object.assign(ctx.WZ || {}, { motoModelo: modeloElegido, motoInvId: null });
  const local = { _motoRec: moto, _modeloFinal: moto.modelo, _editId: 'CRED-501',
    S: S, WZ: ctx.WZ, DB: ctx.DB, toast: ctx.toast, confirm: ctx.confirm,
    hasModuleAccess: ctx.hasModuleAccess, logActividad: ctx.logActividad, Date: Date, String: String };
  const fn = vm.runInContext('(function(_motoRec,_modeloFinal,_editId){' + bloque + ' return _modeloFinal; })', ctx);
  const resultado = fn.call(ctx, local._motoRec, local._modeloFinal, local._editId);
  return { resultado, moto, preguntas: preguntas.slice(), avisos: avisos.slice(), guardadas: guardadas.slice() };
}

// ── 1. Dice que SI: es la misma unidad, mal registrada ─────────────────────────
let r = correr(true, 'NEW HORSE 150', 'EK XPRESS 150');
ok('pregunta antes de tocar nada', r.preguntas.length === 1);
ok('la pregunta nombra la moto, el modelo viejo y el elegido',
  /#501/.test(r.preguntas[0]) && /EK XPRESS 150/.test(r.preguntas[0]) && /NEW HORSE 150/.test(r.preguntas[0]));
ok('con el SI, el credito queda con el modelo elegido', r.resultado === 'NEW HORSE 150');
ok('...y la moto del inventario tambien', r.moto.modelo === 'NEW HORSE 150');
ok('...y queda guardada', r.guardadas.length === 1 && r.guardadas[0].id === 501);
ok('...con auditoria de quien, cuando y desde que credito',
  r.moto.modeloAnterior === 'EK XPRESS 150' && r.moto.modeloCorregidoPor === 'Vendedora'
  && !!r.moto.modeloCorregidoEn && r.moto.modeloCorregidoDesde === 'CRED-501');
ok('y se le dice lo que cambio', r.avisos.some(a => /#501/.test(a) && /NEW HORSE 150/.test(a)));

// ── 2. Dice que NO: el cliente se llevo otra moto ──────────────────────────────
r = correr(false, 'NEW HORSE 150', 'EK XPRESS 150');
ok('con el NO no se renombra la moto', r.moto.modelo === 'EK XPRESS 150' && !r.moto.modeloAnterior);
ok('...ni se guarda nada', r.guardadas.length === 0);
ok('...el credito se queda con el modelo de su moto', r.resultado === 'EK XPRESS 150');
ok('...y se le dice CLARO en que quedo (esto era lo que fallaba en silencio)',
  r.avisos.some(a => /sigue con/.test(a) && /EK XPRESS 150/.test(a) && /#501/.test(a)));

// ── 3. Sin permiso de Motocicletas no se renombra una unidad ───────────────────
r = correr(true, 'NEW HORSE 150', 'EK XPRESS 150', false);
ok('sin permiso de motos ni siquiera pregunta', r.preguntas.length === 0);
ok('...no cambia la moto', r.moto.modelo === 'EK XPRESS 150');
ok('...y avisa que le falta permiso', r.avisos.some(a => /permiso/i.test(a)));

// ── 4. Si no cambio el modelo, no molesta con preguntas ────────────────────────
r = correr(true, 'EK XPRESS 150', 'EK XPRESS 150');
ok('mismo modelo: no pregunta nada', r.preguntas.length === 0 && r.avisos.length === 0);
ok('...y el credito conserva su modelo', r.resultado === 'EK XPRESS 150');

// ── 5. Espacios de mas no cuentan como cambio ──────────────────────────────────
r = correr(true, '  EK XPRESS 150  ', 'EK XPRESS 150');
ok('solo espacios: tampoco pregunta', r.preguntas.length === 0);

// ── 6. Sin modelo elegido, no hace nada ────────────────────────────────────────
r = correr(true, '', 'EK XPRESS 150');
ok('sin modelo elegido no pregunta ni cambia', r.preguntas.length === 0 && r.moto.modelo === 'EK XPRESS 150');


// ── 7. El numero de la moto se ve en pantalla (antes no se veia en ningun lado) ─
// La letra M NO se usa aqui: es la serie de los creditos de PAGASI 26, y dos cosas
// distintas con el mismo nombre confunden mas de lo que ayudan.
const num = ctx.motoNum;
ok('la moto 1 se lee #1', num({id:1}) === '#1');
ok('la moto 501 se lee #501', num({id:501}) === '#501');
ok('acepta el id suelto, no solo la moto', num(7) === '#7');
ok('un id que no es numero se muestra tal cual', num({id:'ABC'}) === 'ABC');
ok('sin moto, texto vacio', num(null) === '' && num({}) === '');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
