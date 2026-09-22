// Punto 18 de la lista del 18-sep-2026: se podia liquidar por adelantado un credito
// que no debia cobrarse (recuperado, cancelado o una solicitud sin aprobar): entraba
// dinero a caja y el credito quedaba "pagado". Y la casilla "Cerrar contrato" no hacia
// nada: el credito quedaba completado igual, se marcara o no.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento() {
  return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){},
    closest(){ return null; }, getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
// La pantalla de Configuracion: solo existe mientras "enConfig" es verdad
const form = {};
const enConfig = true;
const doc = { getElementById(id){ return (enConfig && form[id]) || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
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
ctx.toast = function(m, t){ avisos.push([t, m]); }; ctx.closeM = function(){};
ctx.nav = function(){};
ctx.setMicon = function(){};
const el = (props) => Object.assign(elemento(), props || {});
const S = ctx.S;
S.currentUser = { uid:'u1', nombre:'Prueba', rol:'Administrador' };
['mtt','msb','modal-box','mbd','mft','ov'].forEach(id => { form[id] = el({ style:{} }); });
const cred = (id, estado) => ({ id, cli:'CLIENTE ' + id, estado, fecha:'2026-06-01', precio:1000, ini:300, fin:700,
  cuotaQ:50, cuota:50, totalCuotas:24, plazo:12, pagado:2, mora:0, motoId:1 });
S.motos = [{ id:1, modelo:'MOTO', estado:'financiada' }];
S.pagos = []; S.movimientos = []; S.egresos = [];
ctx._cuentasBanc = [{ nombre:'Binance' }];

function intentar(estado){
  S.creds = [cred('CRED-1', estado)];
  avisos.length = 0;
  form['mbd'].innerHTML = '';
  ctx.openLiquidarAnticipado('CRED-1');
  const abrio = String(form['mbd'].innerHTML || '').indexOf('Liquid') > -1 || String(form['mbd'].innerHTML || '').length > 200;
  // y aunque alguien llame directo a la ejecución (por consola o un boton viejo):
  ctx.window._liqCredId = 'CRED-1';
  const pagosAntes = S.pagos.length;
  ctx.ejecutarLiquidacionAnticipada();
  return { abrio, cobro: S.pagos.length > pagosAntes, estadoFinal: S.creds[0].estado, avisos: avisos.slice() };
}

['recuperado','recuperada','cancelado','completado','pendiente_revision','rechazado'].forEach(estado => {
  const r = intentar(estado);
  ok('un crédito ' + estado + ' no se puede liquidar ni cobra nada',
    r.abrio === false && r.cobro === false && r.estadoFinal === estado && r.avisos.some(a => /no se puede liquidar/.test(a[1])));
});

// El que sí se puede: activo y en mora
['activo','mora'].forEach(estado => {
  S.creds = [cred('CRED-2', estado)];
  avisos.length = 0; form['mbd'].innerHTML = '';
  ctx.openLiquidarAnticipado('CRED-2');
  ok('un crédito ' + estado + ' sí abre la liquidación', String(form['mbd'].innerHTML || '').length > 200);
});

ok('ya no aparece la casilla "Cerrar contrato" que no hacía nada',
  String(form['mbd'].innerHTML || '').indexOf('liq_cerrar') === -1
  && String(form['mbd'].innerHTML || '').indexOf('Cerrar contrato') === -1);
ok('...y dice claramente que el crédito queda cerrado',
  /queda <b>cerrado \(completado\)<\/b>/.test(String(form['mbd'].innerHTML || '')));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
