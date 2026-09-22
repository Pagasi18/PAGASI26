// Punto 3 de la lista del 18-sep-2026: borrar una moto o un pago de comision
// devolvia el dinero DOS veces (anulaba el retiro, que ya lo devuelve, y ademas
// creaba un reverso), y con "sin regresar" lo devolvia igual.
// Aqui se usa el codigo real: se compran motos, se pagan comisiones, se borran con
// cada opcion y se exige que el saldo de Cuentas sea el correcto, que Coromoto diga
// lo mismo por cuenta, y que el robot bot/cuentas-reversos.js no encuentre sobrante.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento() {
  return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){},
    closest(){ return null; }, getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
const els = {}; let radio = 'si';
const doc = { getElementById(id){ return els[id] = els[id] || elemento(); }, querySelector(q){ return /checked/.test(q) ? { value: radio } : null; }, querySelectorAll(){ return []; },
  createElement(){ return elemento(); }, head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, confirm(){return true;}, prompt(){return '';},
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = function(){}; ctx.nav = function(){}; ctx.setMicon = function(){}; ctx.closeM = function(){}; ctx.requireDeletePermission = function(){ return true; };
const S = ctx.S;
S.currentUser = { nombre:'Prueba', uid:'u0' };
S.movimientos = []; S.egresos = []; S.motos = [];
ctx._cuentasBanc = [{nombre:'CL'},{nombre:'Banesco'},{nombre:'Binance'}];
// dinero inicial en las cuentas
[['Banesco',10000],['Binance',10000],['CL',10000]].forEach(([c,m],i)=>S.movimientos.push({id:'MOV-INI-'+i,tipo:'deposito',concepto:'Aporte',monto:m,cuentaOrigen:null,cuentaDestino:c,fecha:'2026-09-01'}));
const saldo = c => ctx.saldoCuenta(c);
const esperado = { Banesco:10000, Binance:10000, CL:10000 };

function comprar(id, pagos){ const m = { id, modelo:'MODELO '+id, precio:pagos.reduce((a,p)=>a+p.monto,0) }; S.motos.push(m); ctx._mpagoCrearGastos(m, pagos, {fecha:'2026-09-02'});
  pagos.forEach(p => esperado[p.cuenta] -= p.monto); return m; }
function borrarMoto(m, devolver){ const audit = { eliminado:true, eliminadoPor:'Prueba', eliminadoEn:'2026-09-10T12:00:00Z', eliminadoRazon:'Moto duplicada', eliminacionReversaCuenta:devolver };
  Object.assign(m, audit); ctx._mpagoReversarGastos(m.id, devolver, audit); }
// Desde el 21-sep (punto 12) Finanzas NO deja borrar el gasto de una moto: no abre el
// modal, asi que S.saveFn se queda sin asignar.
function borrarEgresoFinanzas(egId, devolver){
  radio = devolver ? 'si' : 'no';
  els.eg_del_razon = Object.assign(elemento(), {value:'Error de captura'});
  S.saveFn = null;
  ctx.delEgreso(egId);
  if(typeof S.saveFn === 'function'){ S.saveFn(); return true; }
  return false;   // Finanzas lo rechazo
}
function pagarComision(egId, cuenta, monto){ S.egresos.push({id:egId,concepto:'Comision',monto,fecha:'2026-09-03',categoria:'comisiones',forma:cuenta,usuarioComisionUid:'u1',eliminado:false});
  S.movimientos.push({id:'MOV-COM-u1-'+egId,tipo:'retiro',tipoOperacion:'comision',concepto:'Egreso · Comision',monto,cuentaOrigen:cuenta,cuentaDestino:null,fecha:'2026-09-03',usuarioComisionUid:'u1',conceptoEgreso:egId});
  esperado[cuenta] -= monto; }
function borrarComision(egId, devolver){ radio = devolver ? 'si' : 'no'; els.cdel_razon = Object.assign(elemento(), {value:'Pago duplicado'}); ctx._comConfirmarEliminarPago(egId, 'u1'); }


// 1) moto de $1000 por Banesco, borrada regresando el dinero → vuelve UNA vez
const m1 = comprar(1, [{cuenta:'Banesco', monto:1000}]); borrarMoto(m1, true); esperado.Banesco += 1000;
ok('regresar el dinero: vuelve una sola vez', saldo('Banesco') === esperado.Banesco);
// 2) moto de $800 (500 Binance + 300 Banesco) borrada SIN regresar → no vuelve
const m2 = comprar(2, [{cuenta:'Binance', monto:500},{cuenta:'Banesco', monto:300}]); borrarMoto(m2, false);
ok('sin regresar: el dinero no vuelve (Binance y Banesco)', saldo('Binance') === esperado.Binance && saldo('Banesco') === esperado.Banesco);
ok('sin regresar: el retiro sigue en el historial de la cuenta', S.movimientos.some(m => m.motoIdRef === 2 && m.tipo === 'retiro' && !m.eliminado));
// 3) Finanzas ya no deja borrar el gasto de una moto; se borra la moto (regresando) → vuelve UNA vez
const m3 = comprar(3, [{cuenta:'CL', monto:600}]);
const eg3 = S.egresos.find(e => e.motoIdRef === 3);
ok('Finanzas no deja borrar el gasto de la compra de una moto',
  borrarEgresoFinanzas(eg3.id, true) === false && !S.egresos.find(e => e.id === eg3.id).eliminado && saldo('CL') === esperado.CL);
borrarMoto(m3, true); esperado.CL += 600;
ok('al borrar la moto, el dinero vuelve una sola vez', saldo('CL') === esperado.CL);
// 4) moto borrada regresando, restaurada, y borrada otra vez regresando
const m4 = comprar(4, [{cuenta:'CL', monto:700}]); borrarMoto(m4, true); ctx.restaurarMoto(4);
ok('restaurada: la compra vuelve a descontarse', saldo('CL') === esperado.CL);
borrarMoto(m4, true); esperado.CL += 700;
ok('borrada otra vez despues de restaurar: vuelve una vez', saldo('CL') === esperado.CL);
// 5) moto que sigue viva
comprar(5, [{cuenta:'Banesco', monto:900}]);
// 6) comision de $200 por Binance borrada regresando
pagarComision(9001, 'Binance', 200); borrarComision(9001, true); esperado.Binance += 200;
ok('comision borrada devolviendo: vuelve una sola vez', saldo('Binance') === esperado.Binance);
// 7) comision de $150 por Banesco borrada SIN regresar
pagarComision(9002, 'Banesco', 150); borrarComision(9002, false);
ok('comision borrada sin devolver: no vuelve', saldo('Banesco') === esperado.Banesco);
ok('comision sin devolver queda marcada para Coromoto', S.egresos.find(e => e.id === 9002).eliminacionReversaCuenta === false);
// 8) intentar borrar en Finanzas el gasto de una moto viva: se rechaza y nada cambia
const m6 = comprar(6, [{cuenta:'Binance', monto:400}]); const eg6 = S.egresos.find(e => e.motoIdRef === 6);
ok('el gasto de una moto viva tampoco se borra desde Finanzas',
  borrarEgresoFinanzas(eg6.id, true) === false && saldo('Binance') === esperado.Binance);

['Banesco','Binance','CL'].forEach(c => ok(c + ': el saldo de Cuentas es el correcto (' + esperado[c] + ')', Math.abs(saldo(c) - esperado[c]) < 0.01));

// Coromoto dice lo mismo que Cuentas en cada cuenta
const A = ctx._coroAsientos(), mapa = ctx._coroMapaCuentas().mapa;
['Banesco','Binance','CL'].forEach(c => {
  const cod = mapa[c]; const caja = A.lineas.filter(l => l.cod === cod).reduce((s, l) => s + (l.debe || 0) - (l.haber || 0), 0);
  ok('Coromoto: la caja de ' + c + ' cuadra con Cuentas', Math.abs(caja - saldo(c)) < 0.01);
});

// El robot de solo lectura no encuentra dinero de mas
const { medir } = require(path.join(ROOT, 'bot/cuentas-reversos.js'));
const movs = S.movimientos.map((m,i)=>Object.assign({_k:m.id||('k'+i)}, JSON.parse(JSON.stringify(m))));
const { eventos } = medir(movs, JSON.parse(JSON.stringify(S.egresos)), JSON.parse(JSON.stringify(S.motos)));
ok('el robot no encuentra sobrante en ningun caso', eventos.every(e => Math.abs(e.sobra) < 0.01));

// Las 3 motos borradas con el codigo viejo: el robot las sigue viendo (retiro anulado + reverso)
const viejo = [{_k:'R1',tipo:'retiro',tipoOperacion:'compra_moto',motoIdRef:50,conceptoEgreso:700,monto:697,cuentaOrigen:'Efectivo',eliminado:true,reversoCreado:true},
  {_k:'V1',tipo:'deposito',monto:697,cuentaDestino:'Efectivo',reversoDe:'compra_moto:50'}];
const rv = medir(viejo, [{id:700,motoIdRef:50,origenAuto:'compra_moto',eliminado:true,eliminacionReversaCuenta:true}], [{id:50,eliminado:true,eliminacionReversaCuenta:true}]);
ok('una moto borrada con el codigo viejo se sigue midiendo como doble', rv.eventos.length === 1 && rv.eventos[0].sobra === 697);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
