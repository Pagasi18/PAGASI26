// Arnes del motor Coromoto (logic/coromoto.js): libro diario generado desde
// datos sinteticos, cuadres, periodos parciales, mapeo y conversion de moneda.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=fs.readFileSync(path.join(ROOT,'logic/coromoto.js'),'utf8');
function dLoc(n){ var d=new Date(); d.setDate(d.getDate()+n); var p=function(x){return String(x).padStart(2,'0');}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
var HOY=dLoc(0);
var G={
  console:console, Math:Math, JSON:JSON, Object:Object, Array:Array, String:String, Number:Number,
  parseFloat:parseFloat, parseInt:parseInt, Date:Date, isNaN:isNaN, Promise:Promise,
  window:{}, db:null,
  hoyLocalISO:function(){ return HOY; },
  fechaLocalISO:function(d){ var p=function(x){return String(x).padStart(2,'0');}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); },
  toast:function(){}, nav:function(){}, closeM:function(){}, saveM:function(){}, setMicon:function(){},
  logActividad:function(){}, confirm:function(){ return true; },
  esMovimientoInicialCredito:undefined,
  document:{ querySelectorAll:function(){ return []; }, getElementById:function(){ return null; } },
  $:function(){ return null; },
  _cuentasBanc:[{nombre:'Banco de Venezuela'},{nombre:'100% Banco 1030594'},{nombre:'Binance'},{nombre:'Efectivo USD'}],
  S:null
};
G.window._tasaBsGlobal=160; G.window._tasaEuro=175; G.globalThis=G;
var S={
  currentUser:{rol:'Administrador',nombre:'Adam'}, page:'reportes', reportesTab:'coromoto',
  coromotoCfg:{ mapCuentas:{}, mapCategorias:{inventario:'1129001',equipos:'6121000',operativo:'7151005',nomina:'7131001',otros:'7151039'},
    ajustes:[{id:'AJ-1',fecha:dLoc(-45),concepto:'Aporte de capital social',lineas:[{cod:'1113005',debe:10000,haber:0},{cod:'3111001',debe:0,haber:10000}]}] },
  creds:[
    {id:'CRED-1',cli:'Ana',fecha:dLoc(-40),estado:'activo',total:3000,fin:2000,eliminado:false},
    {id:'CRED-2',cli:'Beto',fecha:dLoc(-10),estado:'activo',total:1500,fin:1000,eliminado:false},
    {id:'CRED-3',cli:'Caro',fecha:dLoc(-5),estado:'pendiente_revision',total:9999,fin:9000,eliminado:false},
    {id:'CRED-4',cli:'Dario',fecha:dLoc(-5),estado:'activo',total:0,fin:0,eliminado:false},
    {id:'CRED-5',cli:'Elsa',fecha:dLoc(-3),estado:'activo',total:777,fin:600,eliminado:true},
    // Anulado por duplicado, con plazo mal tipeado (122026 en vez de 12) que dispara
    // el total a millones. eliminado:false porque se anulo en modo 'mantener'.
    {id:'CRED-6',cli:'Fabio',fecha:dLoc(-8),estado:'cancelado',plazo:122026,
     total:23917096,fin:1146,precio:2080,eliminado:false}
  ],
  pagos:[
    {id:'P-1',cred:'CRED-1',cli:'Ana',fecha:dLoc(-20),monto:100,metodo:'Binance',estado:'confirmado',eliminado:false},
    {id:'P-2',cred:'CRED-1',cli:'Ana',fecha:dLoc(-18),monto:55,metodo:'Binance',estado:'confirmado',eliminado:false},   // sin movimiento -> aviso
    {id:'P-3',cred:'CRED-2',cli:'Beto',fecha:dLoc(-2),monto:80,metodo:'Banco de Venezuela',estado:'pendiente',eliminado:false}
  ],
  movimientos:[
    {id:'MOV-1',tipo:'deposito',tipoOperacion:'inicial_credito',concepto:'Inicial · Ana · CRED-1',monto:500,cuentaOrigen:null,cuentaDestino:'Banco de Venezuela',fecha:dLoc(-40),eliminado:false},
    {id:'MOV-2',tipo:'deposito',concepto:'Pago cuota · Ana · CRED-1',conceptoPago:'P-1',monto:100,cuentaOrigen:null,cuentaDestino:'Binance',fecha:dLoc(-20),eliminado:false},
    {id:'MOV-3',tipo:'retiro',concepto:'Egreso · Papeleria oficina',monto:200,cuentaOrigen:'Banco de Venezuela',cuentaDestino:null,fecha:dLoc(-15),eliminado:false},
    {id:'MOV-4',tipo:'retiro',tipoOperacion:'compra_moto',concepto:'Egreso · Compra de moto · Bera SBR (Moto #7)',monto:800,cuentaOrigen:'Binance',cuentaDestino:null,fecha:dLoc(-12),eliminado:false},
    {id:'MOV-5',tipo:'transferencia',concepto:'Fondeo binance',monto:300,cuentaOrigen:'Banco de Venezuela',cuentaDestino:'Binance',fecha:dLoc(-9),eliminado:false},
    {id:'MOV-6',tipo:'deposito',concepto:'Prestamo socio Adam',monto:5000,cuentaOrigen:null,cuentaDestino:'Banco de Venezuela',fecha:dLoc(-35),eliminado:false},
    {id:'MOV-7',tipo:'retiro',concepto:'Devolucion a socio',monto:120,cuentaOrigen:'Banco de Venezuela',cuentaDestino:null,fecha:dLoc(-8),eliminado:false},
    {id:'MOV-8',tipo:'retiro',concepto:'Egreso · Gasto duplicado',monto:90,cuentaOrigen:'Efectivo USD',cuentaDestino:null,fecha:dLoc(-7),eliminado:false},
    {id:'MOV-REV-EG-1',tipo:'deposito',concepto:'Reverso egreso eliminado · Gasto duplicado',reversoDe:'egreso:9',monto:90,cuentaOrigen:null,cuentaDestino:'Efectivo USD',fecha:dLoc(-6),eliminado:false},
    {id:'MOV-9',tipo:'retiro',concepto:'Egreso · Gasto fantasma',monto:60,cuentaOrigen:'Efectivo USD',cuentaDestino:null,fecha:dLoc(-5),eliminado:false}
  ],
  egresos:[
    {id:1,concepto:'Papeleria oficina',monto:200,fecha:dLoc(-15),categoria:'operativo',forma:'Banco de Venezuela',eliminado:false},
    {id:2,concepto:'Compra de moto · Bera SBR (Moto #7)',monto:800,fecha:dLoc(-12),categoria:'inventario',forma:'Binance',eliminado:false},
    {id:9,concepto:'Gasto duplicado',monto:90,fecha:dLoc(-7),categoria:'otros',forma:'Efectivo USD',eliminado:true,eliminacionReversaCuenta:true},
    {id:10,concepto:'Gasto fantasma',monto:60,fecha:dLoc(-5),categoria:'otros',forma:'Efectivo USD',eliminado:true,eliminacionReversaCuenta:false}
  ]
};
G.S=S;
var auto=new Proxy(G,{has:function(){return true;},get:function(t,k){if(k in t)return t[k];if(k in global)return global[k];return undefined;},set:function(t,k,v){t[k]=v;return true;}});
eval('with(auto){'+SRC+'}');
// las declaraciones de funcion del eval viven en el scope del modulo, no en el proxy
var API=eval('({_coroCtx:_coroCtx,_coroF:_coroF,_coroMapaCuentas:_coroMapaCuentas,_renderCoromoto:_renderCoromoto,_coroHtmlDash:_coroHtmlDash,_coroHtmlDiario:_coroHtmlDiario,_coroHtmlMayor:_coroHtmlMayor,_coroHtmlBalComp:_coroHtmlBalComp,_coroHtmlESF:_coroHtmlESF,_coroHtmlER:_coroHtmlER,_coroHtmlFlujo:_coroHtmlFlujo,_coroHtmlInd:_coroHtmlInd,_coroHtmlCatalogo:_coroHtmlCatalogo,_coroHtmlNotas:_coroHtmlNotas})');

var pass=0, fail=0;
function ok(cond,msg){ if(cond){pass++;console.log('OK   '+msg);} else {fail++;console.log('FALLA '+msg);} }
function cerca(a,b,msg){ ok(Math.abs(a-b)<0.011, msg+' (esperado '+b+', dio '+(Math.round(a*100)/100)+')'); }

var ctx=API._coroCtx(); var L=ctx.lineas;
var tD=0,tH=0; L.forEach(function(l){tD+=l.debe;tH+=l.haber;});
cerca(tD,tH,'Diario cuadra (Debe == Haber)');
ok(L.every(function(l){ return l.f && l.cod && (l.debe>0)!==(l.haber>0); }), 'Cada linea tiene fecha, cuenta y un solo lado');
var cxcD=L.filter(function(l){return l.cod==='1122001';}).reduce(function(s,l){return s+l.debe;},0);
cerca(cxcD,4500,'CxC Debe = creditos otorgados (3000+1500)');
var ingH=L.filter(function(l){return l.cod==='5112001';}).reduce(function(s,l){return s+l.haber;},0);
cerca(ingH,1500,'Ingresos por servicios = carga financiera (1000+500)');
ok(ctx.avisos.credsSinPlan===1,'Aviso: 1 credito sin plan');
var cxcH=L.filter(function(l){return l.cod==='1122001';}).reduce(function(s,l){return s+l.haber;},0);
cerca(cxcH,100,'CxC Haber = solo cobros con movimiento (100)');
ok(ctx.avisos.pagosSinMov===1 && Math.abs(ctx.avisos.pagosSinMovMonto-55)<0.01,'Aviso: pago confirmado sin movimiento (55)');
var puenteH=L.filter(function(l){return l.cod==='1129001';}).reduce(function(s,l){return s+l.haber;},0);
cerca(puenteH,3500,'Puente Haber = capital financiado (3000) + iniciales (500)');
var puenteD=L.filter(function(l){return l.cod==='1129001';}).reduce(function(s,l){return s+l.debe;},0);
cerca(puenteD,800,'Puente Debe = compra de motos (800)');
var gastoOp=L.filter(function(l){return l.cod==='7151005';}).reduce(function(s,l){return s+l.debe;},0);
cerca(gastoOp,200,'Egreso operativo → 7151005 (200)');
ok(!L.some(function(l){return l.co.indexOf('Gasto duplicado')>-1;}),'Egreso eliminado CON reverso: no genera lineas');
var anulado=L.filter(function(l){return l.co.indexOf('EGRESO ANULADO')===0;});
ok(anulado.length===2 && Math.abs(anulado[0].debe+anulado[1].debe-60)<0.01,'Egreso anulado SIN reverso → CxP socios (60)');
ok(ctx.avisos.anulados===1,'Aviso: 1 egreso anulado sin reverso');
ok(ctx.avisos.aportes===1 && Math.abs(ctx.avisos.aportesMonto-5000)<0.01,'Aviso: 1 deposito como aporte socios (5000)');
ok(ctx.avisos.retiros===1 && Math.abs(ctx.avisos.retirosMonto-120)<0.01,'Aviso: 1 retiro contra socios (120)');
var transf=L.filter(function(l){return l.co.indexOf('TRANSFERENCIA')===0;});
ok(transf.length===2 && transf.reduce(function(s,l){return s+l.debe-l.haber;},0)===0,'Transferencia: dos patas que netean');

var e=ctx.esf, r=ctx.er, f=ctx.flujo;
cerca(e.efectivo,14420,'Efectivo total');
cerca(e.cxc,4400,'CxC saldo (4500-100)');
cerca(e.anticipos,-2700,'Puente saldo (800-3500)');
cerca(e.capital,10000,'Capital social (ajuste manual)');
cerca(e.cxp,4820,'CxP socios (5000-120-60)');
cerca(r.ing,1500,'ER ingresos');
cerca(r.neta,1300,'ER utilidad neta (1500-200)');
cerca(e.resEjercicio,1300,'ESF resultado del ejercicio');
cerca(e.cuadre,0,'ESF cuadra');
cerca(f.efCierre,e.efectivo,'Flujo concilia con ESF');
cerca(f.op,r.neta-e.cxc-e.anticipos,'Flujo operacion = neta - ΔCxC - ΔPuente');

S.coroDesde=dLoc(-15); S.coroHasta=HOY;
var ctx2=API._coroCtx();
cerca(ctx2.esf.cuadre,0,'ESF cuadra con periodo parcial');
cerca(ctx2.esf.efectivo,e.efectivo,'ESF sigue siendo acumulado al cierre');
cerca(ctx2.er.ing,500,'ER del periodo = carga de CRED-2');
cerca(ctx2.er.neta,300,'ER neta del periodo (500-200)');
cerca(ctx2.esf.resultAntes,1000,'Resultados acumulados previos (carga CRED-1)');
cerca(ctx2.flujo.efCierre,ctx2.esf.efectivo,'Flujo del periodo concilia con ESF');
ok(ctx2.flujo.efIni>0,'Efectivo inicial del periodo > 0');
S.coroDesde=''; S.coroHasta='';

var ctx3=API._coroCtx();
var M=function(n){ return '$'+API._coroF(n); };
['_coroHtmlDash','_coroHtmlDiario','_coroHtmlMayor','_coroHtmlBalComp','_coroHtmlESF','_coroHtmlER','_coroHtmlFlujo','_coroHtmlInd','_coroHtmlCatalogo','_coroHtmlNotas'].forEach(function(fn){
  try{ var html=API[fn](ctx3,M); ok(typeof html==='string' && html.length>100, fn+' devuelve HTML'); }
  catch(err){ ok(false, fn+' lanzo: '+err.message); }
});
var full=API._renderCoromoto();
ok(typeof full==='string' && full.indexOf('Coromoto')>-1,'_renderCoromoto completo');

var mapa=API._coroMapaCuentas().mapa;
ok(mapa['Binance']==='1113005','Binance → 1113005');
ok(mapa['100% Banco 1030594']==='1113003','Cuenta 1030594 → 1113003');
ok(mapa['Efectivo USD']==='1113002','Efectivo → 1113002 (CAJA)');
ok(mapa['Banco de Venezuela']==='1113001','Banco de Venezuela → 1113001');

var MBs=function(n){ return 'Bs. '+API._coroF((parseFloat(n)||0)*160); };
ok(MBs(10)==='Bs. '+(1600).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}),'Conversion a Bs multiplica por la tasa');
ok(API._coroHtmlESF(ctx3,MBs).indexOf('Bs. ')>-1,'ESF imprimible en Bs');


// ── Un credito anulado no puede entrar al libro (caso CRED-335 real: se anulo por
// duplicado pero traia plazo 122026, y su total de $23,9M deformaba todo el ER) ──
(function(){
  var ctx2 = API._coroCtx();
  var lin = ctx2.lineas || [];
  var tocado = lin.some(function(l){ return String(l.concepto||'').indexOf('CRED-6')>-1; });
  ok(!tocado, 'el credito anulado no genera asientos');

  var mayor = lin.reduce(function(a,l){ return a + (l.debe||0) + (l.haber||0); }, 0);
  ok(mayor < 1000000, 'ningun asiento arrastra el total disparatado del anulado ('+Math.round(mayor)+')');

  var ingresos = lin.filter(function(l){ return /ingreso/i.test(String(l.cuenta||'')+String(l.nombre||'')); })
                    .reduce(function(a,l){ return a + (l.haber||0); }, 0);
  ok(ingresos < 100000, 'los ingresos quedan en rango real ('+Math.round(ingresos)+')');
})();

console.log(pass+' pruebas OK, '+fail+' fallas');
process.exit(fail?1:0);