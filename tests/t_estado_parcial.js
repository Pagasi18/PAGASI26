// Estado de cuenta imprimible: una cuota con abono sale PARCIAL y con lo que
// falta, no con la cuota entera (Adam, 15-sep-2026, CRED-141: cuota $94, el
// cliente abonó $40 y el PDF le seguía diciendo "Próxima · $94,00" mientras la
// pantalla decía "Parcial · $54,00 pend."). La cuenta ahora es una sola:
// saldosPorCuota() en logic/pagos.js, que usan la pantalla y los dos PDF.
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

// ── El caso de Adam: CRED-141, cuota $94, 5 cuotas pagadas y $40 abonados a la 6 ──
const abono = (cuota, monto, fecha) => ({cuota:cuota, montoPagado:monto, fecha:fecha, pagoId:'P-'+cuota+'-'+monto, tipo:'pago'});
const CRED = {
  id:'CRED-141', cli:'EDGARDO VENTURA DI MURO PIÑANGO', clienteId:'CLI-141', modelo:'MOTO',
  estado:'activo', fecha:'2026-06-17', precio:1550, ini:800, fin:750, total:1128,
  cuota:188, cuotaQ:94, plazo:6, totalCuotas:12, pagado:5, mora:0, eliminado:false,
  saldoProxCuota:54,
  pagosRegistrados:[
    abono(1,94,'2026-07-02'), abono(2,88,'2026-07-17'), abono(2,6,'2026-07-02'),
    abono(3,82,'2026-07-31'), abono(3,12,'2026-07-17'),
    abono(4,76,'2026-08-14'), abono(4,18,'2026-07-31'),
    abono(5,70,'2026-08-31'), abono(5,24,'2026-08-14'),
    abono(6,40,'2026-09-15')
  ]
};
ctx.S.creds=[CRED]; ctx.S.clientes=[]; ctx.S.motos=[]; ctx.S.pagos=[]; ctx.S.egresos=[];
ctx.S.currentUser={uid:'u1',nombre:'Prueba',rol:'Administrador'};

// ── 1. La cuenta compartida ──
const L = ctx.saldosPorCuota(CRED);
ok('cuotas 1 a 5: pagadas', L.estados.slice(0,5).every(e=>e==='pagada'));
ok('cuota 6: parcial, no "próxima"', L.estados[5]==='parcial');
ok('a la cuota 6 le faltan 54', L.saldos[5]===54);
ok('cuotas 7 a 12: pendientes con los 94 completos', L.estados.slice(6).every(e=>e==='pendiente') && L.saldos.slice(6).every(s=>s===94));
ok('el aviso dice cuota 6, abonado 40, faltan 54', L.aviso && L.aviso.cuota===6 && L.aviso.abonado===40 && L.aviso.falta===54);

// ── 2. El estado de cuenta imprimible (lo que recibe el cliente) ──
ctx.window._currentAmortCredId = 'CRED-141';
impreso = '';
ctx.descargarEstadoPDF();
// La fila de la cuota n: el trozo de HTML entre <tr y <tr cuyo primer <td> es ese numero
const fila = (n) => {
  const partes = impreso.split('<tr');
  for (const trozo of partes) {
    const m = trozo.match(/>(\d+)<\/td>/);
    if (m && Number(m[1]) === n) return trozo;
  }
  return '';
};
const f6 = fila(6), f7 = fila(7), f1 = fila(1);
ok('el PDF se generó', impreso.indexOf('ESTADO DE CUENTA · CRED-141') > -1);
ok('la cuota 6 sale como Parcial (antes decía "Próxima")', /Parcial/.test(f6) && !/Próxima/.test(f6));
ok('la cuota 6 cobra 54,00, no los 94,00 completos', /54,00 pend\./.test(f6) && !/\$94,00/.test(f6.split('Parcial')[1]||''));
ok('el abono de 40 sigue apareciendo', /\+\$40,00/.test(f6));
ok('arriba dice "Por pagar ahora: $54,00"', /Por pagar ahora: \$54,00/.test(impreso));
ok('y el aviso en palabras para el cliente', /La cuota 6 tiene un abono de <strong>\$40,00<\/strong> — solo quedan <strong>\$54,00<\/strong>/.test(impreso));
ok('la cuota 1 sigue Pagada', /✓ Pagada/.test(f1));
ok('la cuota 7 sigue Pendiente y con los 94 completos', /Pendiente/.test(f7) && /\$94,00/.test(f7));
ok('ninguna cuota pendiente quedó marcada como Parcial', (impreso.match(/Parcial/g)||[]).length === 1);

// ── 3. El PDF de amortización, que tenía el mismo problema ──
impreso = '';
ctx.descargarAmortPDF();
const a6 = fila(6);
ok('amortización: la cuota 6 también sale Parcial con 54,00', /Parcial/.test(a6) && /54,00 pend\./.test(a6));

// ── 4. Un crédito al día no cambia en nada ──
const ALDIA = Object.assign({}, CRED, {id:'CRED-200', pagado:5, saldoProxCuota:0,
  pagosRegistrados:[abono(1,94,'2026-07-02'),abono(2,94,'2026-07-17'),abono(3,94,'2026-08-01'),abono(4,94,'2026-08-16'),abono(5,94,'2026-08-31')]});
ctx.S.creds=[ALDIA]; ctx.window._currentAmortCredId='CRED-200';
const L2 = ctx.saldosPorCuota(ALDIA);
ok('sin abonos a medias no hay ninguna cuota parcial', L2.estados.indexOf('parcial')===-1 && L2.aviso===null);
impreso = '';
ctx.descargarEstadoPDF();
ok('el PDF de un crédito al día no dice Parcial ni muestra el aviso',
  impreso.indexOf('Parcial')===-1 && impreso.indexOf('Por pagar ahora')===-1 && /Próxima/.test(impreso));

// ── 5. Un pago que sobra se derrama a la cuota siguiente ──
const SOBRA = Object.assign({}, CRED, {id:'CRED-300', pagado:1, saldoProxCuota:0,
  pagosRegistrados:[abono(1,150,'2026-07-02')]});
const L3 = ctx.saldosPorCuota(SOBRA);
ok('un pago de 150 cubre la cuota 1 y deja 38 en la cuota 2',
  L3.estados[0]==='pagada' && L3.estados[1]==='parcial' && L3.saldos[1]===38);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
