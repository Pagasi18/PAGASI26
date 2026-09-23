// 22-sep-2026: con dos companias en el mismo sistema (PAGASI 18 cobrando y PAGASI 26
// vendiendo), el nombre, el RIF, el domicilio, el telefono y las cuentas de PAGASI 18
// estaban escritos DENTRO del codigo de los contratos: 34 veces. El contrato de la
// compania nueva habria salido a nombre de la vieja, que es un problema legal.
// Ahora todo eso sale de Configuracion -> Empresa, y si esa ficha esta vacia se usan
// los datos de PAGASI 18 (lo que decia el codigo antes) y se avisa en pantalla.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento() {
  return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], options:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){}, closest(){ return null; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, confirm(){return true;}, prompt(){return '';},
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

// ── 1. Ficha vacia (como viene el app de fabrica): los datos de PAGASI 18 ──────
// El respaldo solo vale en la base de PAGASI 18, asi que esta prueba dice en cual
// esta parada. Si no lo dijera, en PAGASI 26 estaria probando lo contrario de lo que
// dice su titulo: esta misma suite corre en las dos companias.
const proyectoReal = ctx.FIREBASE_CONFIG ? ctx.FIREBASE_CONFIG.projectId : null;
ctx.FIREBASE_CONFIG = { projectId: 'pagasi-v2' };
ctx._empresa = { nombre:'Pagasi', rif:'J-00000000-0', ciudad:'Caracas', tel:'', email:'', direccion:'' };
let e = ctx._empCtr();
ok('ficha vacia: el contrato sigue saliendo como PAGASI 18', e.nom === 'PAGASI 18, C.A.' && e.rif === 'J-50829589-7');
ok('...con su domicilio', /Sebucán/.test(e.dir));
ok('...su banco y su cuenta', /100% Banco/.test(e.bancoUsd) && e.cuentaUsd === '0156-0030-61-0301030586');
ok('...y su telefono y correo', /424-2177798/.test(e.tel) && e.email === 'info@pagasi.io');
avisos.length = 0; ctx._avisarEmpresaContrato();
ok('...pero se avisa en pantalla que falta cargar la empresa',
  avisos.length === 1 && /Configuración → Empresa/.test(avisos[0]) && /PAGASI 18/.test(avisos[0]));

// ── 2. La compania nueva, con su ficha cargada ────────────────────────────────
ctx._empresa = { nombre:'PAGASI 26, C.A.', rif:'J-50856275-5', ciudad:'Caracas',
  direccion:'Av. Orinoco, Edif. Centro Bali, piso 2, of. 2, Urb. Las Mercedes, Caracas',
  tel:'0212-0000000', email:'info@pagasi.io',
  bancoUsd:'Banesco', cuentaUsd:'0134-0000-00-0000000000', billetera:'Binance (USDT)',
  rm:'Séptimo', rmEstado:'Distrito Capital', rmNum:'8', rmTomo:'58-A', rmFecha:'14/07/2026' };
e = ctx._empCtr();
ok('compania nueva: sale su nombre', e.nom === 'PAGASI 26, C.A.');
ok('...su RIF', e.rif === 'J-50856275-5');
ok('...el RIF con puntos para el texto legal', e.rifPuntos === 'J-50.856.275-5');
ok('...su domicilio, no el de la otra', /Las Mercedes/.test(e.dir) && !/Sebucán/.test(e.dir));
ok('...su banco y su cuenta, no los de la otra', e.bancoUsd === 'Banesco' && !/0156-0030/.test(e.cuentaUsd));
avisos.length = 0; ctx._avisarEmpresaContrato();
ok('...y no molesta con avisos', avisos.length === 0);
ok('...y dice que la ficha no está vacía', ctx._empCtr().sinLlenar === false);

// ── 3. Ficha A MEDIAS: lo que falta sale EN BLANCO, nunca de la otra compañía ──
// Esto era un hueco de verdad: se completaba campo por campo y el contrato de
// PAGASI 26 salía con la CUENTA BANCARIA de PAGASI 18. El cliente pagaba a la
// cuenta equivocada y no había ningún aviso (revisado el 22-sep-2026).
ctx._empresa = { nombre:'PAGASI 26, C.A.', rif:'J-50856275-5', ciudad:'Caracas' };
e = ctx._empCtr();
ok('a medias: el nombre y el RIF cargados mandan', e.nom === 'PAGASI 26, C.A.' && e.rif === 'J-50856275-5');
ok('...la cuenta bancaria de PAGASI 18 NO aparece', !e.cuentaUsd && !e.bancoUsd);
ok('...ni su domicilio, ni su teléfono, ni su correo', !e.dir && !e.tel && !e.email);
ok('...ni su billetera', !e.billetera && !e.billeteraCuenta);
avisos.length = 0; ctx._avisarEmpresaContrato();
ok('...y se avisa qué campos van a salir en blanco',
  avisos.length === 1 && /sin /.test(avisos[0]) && /cuenta/.test(avisos[0]) && /domicilio/.test(avisos[0]));

// ── 3b. Ficha completa: no se avisa nada ─────────────────────────────────────
ctx._empresa = { nombre:'PAGASI 26, C.A.', rif:'J-50856275-5', ciudad:'Caracas', direccion:'Las Mercedes',
  tel:'0212-0000000', email:'info@pagasi26.io', bancoUsd:'Banesco', cuentaUsd:'0134-0000-00-0000000000',
  billetera:'Binance (USDT)', billeteraCuenta:'pagos@pagasi26.io' };
avisos.length = 0; ctx._avisarEmpresaContrato();
ok('ficha completa: sin avisos', avisos.length === 0);

// ── 3c. El respaldo de PAGASI 18 SOLO vale en la base de PAGASI 18 ──────────
// Lo peor que puede pasar con un papel que se firma es que salga perfecto y
// equivocado. El 22-sep-2026 PAGASI 26 imprimio un contrato a nombre de PAGASI 18
// porque la ficha no se habia podido leer (se habia caido la sesion).
ctx._empresa = { nombre:'Pagasi', rif:'J-00000000-0', ciudad:'Caracas', tel:'', email:'', direccion:'' };

ctx.FIREBASE_CONFIG = { projectId: 'pagasi-v2' };
e = ctx._empCtr();
ok('en la base de PAGASI 18, una ficha vacía sí usa sus datos', e.nom === 'PAGASI 18, C.A.' && e.conRespaldo === true);

ctx.FIREBASE_CONFIG = { projectId: 'pagasi26-65ced' };
e = ctx._empCtr();
ok('en OTRA compañía, una ficha vacía NO trae el nombre de PAGASI 18', e.nom === '');
ok('...ni su RIF', !e.rif);
ok('...ni su cuenta bancaria', !e.cuentaUsd && !e.bancoUsd);
ok('...ni su domicilio ni su teléfono', !e.dir && !e.tel);
avisos.length = 0; ctx._avisarEmpresaContrato();
ok('...y el aviso dice que NO se firme',
  avisos.length === 1 && /NO SE PUDO LEER/.test(avisos[0]) && /No lo firmes/.test(avisos[0]));

ctx.FIREBASE_CONFIG = { projectId: 'pagasi-v2' };
avisos.length = 0; ctx._avisarEmpresaContrato();
ok('en PAGASI 18 el aviso sigue siendo el de siempre', /Configuración → Empresa/.test(avisos[0]));
if (proyectoReal) ctx.FIREBASE_CONFIG = { projectId: proyectoReal };

// ── 3d. La llave de ESTA copia no apunta a la base de la otra compania ───────
ok('el proyecto de Firebase de esta copia esta configurado', !!proyectoReal);

// ── 4. El codigo ya no lleva a PAGASI 18 escrito dentro de los contratos ─────
['logic/contratos.js','logic/contratos-dra.js','logic/contratos-protect.js'].forEach(function(f){
  const src = fs.readFileSync(path.join(ROOT,f),'utf8');
  // se permite solo en el bloque de respaldo de contratos.js (_EMP_18 y sus comentarios)
  const cuerpo = f === 'logic/contratos.js' ? src.slice(src.indexOf('// QUE VERSION DE CONTRATO')) : src;
  ok(f + ': sin el nombre de PAGASI 18 escrito a mano', cuerpo.indexOf('PAGASI 18') === -1);
  ok(f + ': sin el RIF de PAGASI 18 escrito a mano', !/J-50\.?829\.?589-?\.?7/.test(cuerpo));
});

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
