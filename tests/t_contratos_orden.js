// Contratos › Listado: el mas nuevo arriba, como en Creditos (Adam, 17-sep-2026:
// "deberia salir en orden... no se que orden estas usando"). Antes ordenaba solo
// por fecha: los 15 creditos de un mismo dia quedaban en el orden crudo de la
// base (ascendente). Ahora: fecha mas reciente primero y, a igual fecha, el
// numero de credito mas alto primero.
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
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, confirm(){return true;}, prompt(){return '';},
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});

const cred = (n, fecha, extra) => Object.assign({ id:'CRED-'+n, cli:'CLIENTE '+n, modelo:'MOTO', estado:'activo', fecha:fecha,
  total:1200, precio:1000, cuotaQ:50, plazo:12, totalCuotas:24, pagado:0, mora:0, eliminado:false, contratoFirmado:true }, extra||{});
ctx.S.currentUser = { uid:'u1', nombre:'Prueba', rol:'Administrador' };
ctx.S.page = 'contratos';
ctx.S.clientes=[]; ctx.S.pagos=[]; ctx.S.motos=[]; ctx.S.concesionarios=[];
// El caso del pantallazo: 4 del mismo dia (mezclados) + 1 de ayer + 1 viejo + 1 cancelado del mismo dia
ctx.S.creds = [
  cred('571','2026-09-16'), cred('585','2026-09-16'), cred('573','2026-09-16'), cred('1000','2026-09-16'),
  cred('570','2026-09-15'), cred('100','2026-06-01'),
  cred('584','2026-09-16', {estado:'cancelado'}),
];
const h = String(ctx.PG.contratos());
const cuerpo = h.slice(h.indexOf('id="ctr-tbody"'));
const pos = id => cuerpo.indexOf('>CRED-'+id+'<') > -1 ? cuerpo.indexOf('>CRED-'+id+'<') : cuerpo.indexOf('CRED-'+id);
const orden = ['1000','585','573','571','570','100'].map(pos);
ok('todos los creditos salen en el listado', orden.every(x => x > 0));
ok('mismo dia: CRED-1000, 585, 573, 571 (el numero mas alto arriba, no el orden de la base)',
  orden[0] < orden[1] && orden[1] < orden[2] && orden[2] < orden[3]);
ok('el de ayer despues de los de hoy, y el de junio de ultimo', orden[3] < orden[4] && orden[4] < orden[5]);
ok('el cancelado del mismo dia tambien entra, ordenado con los demas', pos('584') > 0 && pos('584') < pos('571') && pos('584') > pos('585'));
// (credsRecientes se calcula pero hoy no se pinta en la pagina: codigo muerto que no se borra, regla de la casa)
console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
