// Cobranza (Pagos › Cuotas Próximas): al cliente que ya abonó parte de su cuota
// hay que cobrarle SOLO lo que falta. Antes, mientras la cuota no estuviera
// vencida, la lista pedía la cuota entera: $94 a quien ya había abonado $40 y
// debía $54 (Adam, 15-sep-2026, CRED-141). Los que ya están vencidos siempre
// estuvieron bien, porque esos salen del ledger.
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


// ── CRED-141: cuota $94, 5 pagadas y $40 abonados a la 6, que vence HOY ──
const hoy = new Date();
const p2 = n => String(n).padStart(2,'0');
const dia = n => { const d = new Date(hoy); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); };
// La cuota 6 vence hoy: inicio = hoy - 6 quincenas
const inicio = dia(-90);
const pago = (id, monto, fecha) => ({id:id, cred:'CRED-141', cli:'EDGARDO VENTURA', fecha:fecha, monto:monto, estado:'confirmado', metodo:'efectivo', eliminado:false});
const CRED = {
  id:'CRED-141', cli:'EDGARDO VENTURA', clienteId:'CLI-141', modelo:'BERA BR150',
  estado:'activo', fecha:inicio, precio:1550, ini:800, fin:750, total:1128,
  cuota:188, cuotaQ:94, plazo:6, totalCuotas:12, pagado:5, mora:0, eliminado:false, saldoProxCuota:54
};
ctx.S.creds=[CRED];
ctx.S.clientes=[{id:'CLI-141', nombre:'EDGARDO VENTURA', tel:'04125771769', ciudad:'Sucre'}];
ctx.S.motos=[]; ctx.S.egresos=[]; ctx.S.cuentasPendientes=[];
ctx.S.pagos=[ pago('P1',94,dia(-75)), pago('P2',94,dia(-60)), pago('P3',94,dia(-45)),
              pago('P4',94,dia(-30)), pago('P5',94,dia(-15)), pago('P6',40,dia(0)) ];
ctx.S.currentUser={uid:'u1',nombre:'Prueba',rol:'Administrador'};
ctx.S.page='pagos';

const h = String(ctx.PG.pagos());
// La fila del crédito en la tabla de cuotas próximas
const filaCred = (function(){
  const partes = h.split('<tr');
  for(const t of partes){ if(t.indexOf('CRED-141')>-1 && t.indexOf('Cobrar')>-1) return t; }
  return '';
})();
ok('la lista de cobranza pinta a CRED-141', filaCred !== '');
ok('le cobra $54,00, no los $94,00 completos', /\$54,00/.test(filaCred) && !/>\$94,00</.test(filaCred));
ok('y le avisa a la cobradora que ya abonó', /abonó \$40,00 de \$94,00/.test(filaCred));

// ── Un cliente sin abonos no cambia: se le sigue cobrando la cuota entera ──
const LIMPIO = Object.assign({}, CRED, {id:'CRED-142', cli:'CLIENTE AL DIA', clienteId:'CLI-142', saldoProxCuota:0});
ctx.S.creds=[LIMPIO];
ctx.S.clientes=[{id:'CLI-142', nombre:'CLIENTE AL DIA', tel:'04140000000'}];
ctx.S.pagos=[ pago('Q1',94,dia(-75)), pago('Q2',94,dia(-60)), pago('Q3',94,dia(-45)), pago('Q4',94,dia(-30)), pago('Q5',94,dia(-15)) ];
ctx.S.pagos.forEach(function(p){ p.cred='CRED-142'; });
const h2 = String(ctx.PG.pagos());
const fila2 = (function(){
  const partes = h2.split('<tr');
  for(const t of partes){ if(t.indexOf('CRED-142')>-1 && t.indexOf('Cobrar')>-1) return t; }
  return '';
})();
ok('al que no ha abonado se le cobra la cuota completa', fila2!=='' && /\$94,00/.test(fila2));
ok('y no le sale el aviso de abono', !/abonó/.test(fila2));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
