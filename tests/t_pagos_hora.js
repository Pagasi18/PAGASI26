// Registro de pagos: la hora debajo de la fecha (Adam, 18-sep-2026: "ponme hora
// aqui tambien", como en Creditos). Sale del numero del pago (PAG-<milisegundos>),
// que es el momento en que se registro. Con hora de Caracas.
process.env.TZ = 'America/Caracas';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function elemento() {
  return { innerHTML:'', outerHTML:'', textContent:'', value:'', className:'', id:'', type:'text', src:'',
    style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], checked:false, disabled:false,
    appendChild(){}, removeChild(){}, insertBefore(){}, remove(){},
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){},
    closest(){ return null; }, matches(){ return false; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
    querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
const doc = { getElementById(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; },
  createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
let impreso = '';   // lo que se manda a la ventana de impresión
const ctx = {
  console:{log(){},warn(){},error(){}},
  setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'},
  location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); },
  alert(){}, confirm(){return true;}, prompt(){return '';},
  open(){ return { document:{ write(h){ impreso += h; }, close(){} } }; },
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{},
};
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};};
ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};};
ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};};
ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}};
ctx.window=ctx;

const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = function(){};

const H = p => ctx._pagoHoraTxt(p);
const tiene = (s, hhmm) => s.indexOf(hhmm) > -1;
ok('PAG-1789736201484 del 18-sep: 8:56 a. m.', tiene(H({id:'PAG-1789736201484', fecha:'2026-09-18'}), '8:56') && /a\.\s?m\./.test(H({id:'PAG-1789736201484', fecha:'2026-09-18'})) && H({id:'PAG-1789736201484', fecha:'2026-09-18'}).indexOf('reg.') === -1);
ok('Carlos Lopez PAG-1789740740903: 10:12 a. m.', tiene(H({id:'PAG-1789740740903', fecha:'2026-09-18'}), '10:12'));
ok('registrado otro dia que la fecha del pago: lo dice', /^reg\. 18\/9 · 8:56/.test(H({id:'PAG-1789736201484', fecha:'2026-09-15'})));
ok('inicial del wizard (PAG-<ms>-<azar>) tambien', tiene(H({id:'PAG-1789736201484-4321', fecha:'2026-09-18'}), '8:56'));
ok('liquidacion (P-LIQ-<ms>) tambien', tiene(H({id:'P-LIQ-1789736201484', fecha:'2026-09-18'}), '8:56'));
ok('pago viejo sin milisegundos en el numero: sin hora, sin inventar', H({id:'PAG-001', fecha:'2026-05-01'}) === '' && H({id:'', fecha:''}) === '');
ok('un numero de 13 cifras que no es fecha real no se muestra', H({id:'PAG-9999999999999', fecha:'2026-09-18'}) === '');

// La tabla: la hora sale debajo de la fecha, y en el mismo dia manda la hora
ctx.S.currentUser = { uid:'u1', nombre:'Prueba', rol:'Administrador' };
ctx.S.page = 'pagos';
ctx.S.creds = [{ id:'CRED-001', cli:'CLIENTE UNO', estado:'activo', fecha:'2026-09-01', totalCuotas:12, cuotaQ:27, pagado:1 }];
ctx.S.pagos = [
  { id:'PAG-1789736201484', cli:'A', cred:'CRED-001', fecha:'2026-09-18', monto:144, estado:'confirmado', metodo:'100% Banco', cobrador:'X' },   // 8:56
  { id:'PAG-1789740740903', cli:'B', cred:'CRED-001', fecha:'2026-09-18', monto:27,  estado:'confirmado', metodo:'100% Banco', cobrador:'X' },   // 10:12
  { id:'PAG-1789650000000', cli:'C', cred:'CRED-001', fecha:'2026-09-17', monto:50,  estado:'confirmado', metodo:'Binance',    cobrador:'X' },
];
ctx.S.pagosSort = { col:'fecha', dir:'desc' };
const h = String(ctx.PG.pagos());
const celda = (h.match(/<td class="tds" style="white-space:nowrap">2026-09-18<div style="font-size:9.5px;opacity:.75">([^<]*)<\/div><\/td>/) || [])[1] || '';
ok('la tabla muestra la hora debajo de la fecha', tiene(celda, '10:12') || tiene(celda, '8:56'));
const i1012 = h.indexOf('PAG-1789740740903'), i856 = h.indexOf('PAG-1789736201484'), i17 = h.indexOf('PAG-1789650000000');
ok('fecha de mas nueva a mas vieja: dentro del 18, primero el de las 10:12', i1012 > -1 && i1012 < i856 && i856 < i17);
ctx.S.pagosSort = { col:'fecha', dir:'asc' };
const h2 = String(ctx.PG.pagos());
ok('al reves: el 17 primero y dentro del 18 el de las 8:56 antes', h2.indexOf('PAG-1789650000000') < h2.indexOf('PAG-1789736201484') && h2.indexOf('PAG-1789736201484') < h2.indexOf('PAG-1789740740903'));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
