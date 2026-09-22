// El PDF del contrato se guarda con el nombre "CRED-580 - CLIENTE - MODELO"
// (Adam, 16-sep-2026: para no renombrar cada archivo a mano). El navegador usa
// el titulo de la ventana de impresion como nombre del archivo.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento() {
  return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){},
    closest(){ return null; }, getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
const doc = { getElementById(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
let impreso = '';
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, confirm(){return true;}, prompt(){return '';},
  open(){ return { document:{ write(h){ impreso += h; }, close(){} } }; },
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = function(){};

ctx.S.creds = [
  { id:'CRED-580', cli:'MAIRENA YOXMALI FERNANDEZ PEREZ', modelo:'BR150 MILAN', estado:'activo' },
  { id:'CRED-581', cli:'PEDRO PEREZ', modelo:'TR150/TRX "RAYO"', estado:'activo' },   // letras prohibidas en archivos
  { id:'CRED-582', cli:'', modelo:'', estado:'activo' },
];
ok('CRED-580 - MAIRENA YOXMALI FERNANDEZ PEREZ - BR150 MILAN',
  ctx._tituloContrato('CRED-580') === 'CRED-580 - MAIRENA YOXMALI FERNANDEZ PEREZ - BR150 MILAN');
ok('las letras que Windows no acepta en archivos se cambian por raya',
  ctx._tituloContrato('CRED-581') === 'CRED-581 - PEDRO PEREZ - TR150-TRX -RAYO-');
ok('sin cliente ni modelo queda solo el codigo', ctx._tituloContrato('CRED-582') === 'CRED-582');
ok('un credito que no existe no rompe nada', ctx._tituloContrato('CRED-999') === 'CRED-999');
const largo = ctx.S.creds[0]; largo.modelo = 'X'.repeat(300);
ok('un nombre kilometrico se corta a 120 letras', ctx._tituloContrato('CRED-580').length === 120);
largo.modelo = 'BR150 MILAN';

// El titulo llega tal cual a la ventana de impresion (el navegador lo usa de nombre)
impreso = '';
ctx._abrirVentanaImpresion(ctx._tituloContrato('CRED-580'), '<p>hola</p>', {sinHeader:true});
ok('la ventana sale con ese titulo',
  impreso.indexOf('<title>CRED-580 - MAIRENA YOXMALI FERNANDEZ PEREZ - BR150 MILAN</title>') > -1);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
