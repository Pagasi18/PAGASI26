// Dashboard › Egresos: el gráfico separa GASTOS OPERATIVOS de COMPRA DE MOTOS, y
// dentro de la compra NO cuenta la inicial que paga el cliente (Adam, 17-sep-2026:
// "separalo y quita las iniciales en uno"). El 17/9 de verdad: $24.943 en 30
// egresos, de los cuales $10.780 eran iniciales de 15 clientes.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global;
const _mk=()=>({innerHTML:'',textContent:'',style:{},className:'',appendChild(){},querySelector(){return null;},getContext(){return {};},parentElement:null});
global.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],createElement:_mk,addEventListener(){},documentElement:{getAttribute:()=>null},body:{appendChild(){},style:{}}};
global._concFiltrar=a=>a;
global.fechaLocalISO=d=>{const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());};
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const hoy=new Date();
const dia=n=>global.fechaLocalISO(new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()+n));
global.S={creds:[], pagos:[], egresos:[]};
const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const SRC=fs.readFileSync(path.join(ROOT,'logic/charts.js'),'utf8');
const API=eval('with(auto){'+SRC+'\n; ({getDashData,_egrIdsInicial}) }');

// Una moto de $1.730: el cliente pone $723 y Pagasi financia $1.007.
// La oficina registra DOS egresos: uno en efectivo por la inicial y otro en Binance.
S.creds=[
  {id:'CRED-595', motoId:588, estado:'activo', fecha:dia(0), precio:1730, ini:723, fin:1007},
  {id:'CRED-601', motoId:594, estado:'activo', fecha:dia(0), precio:1235, ini:516, fin:719},
  {id:'CRED-800', motoId:800, estado:'activo', fecha:dia(-3), precio:1500, ini:600, fin:900},
  {id:'CRED-900', motoId:900, estado:'cancelado', fecha:dia(0), precio:1000, ini:400, fin:600}, // anulado
];
S.egresos=[
  {id:1, fecha:dia(0), monto:723,  origenAuto:'compra_moto', motoIdRef:588, forma:'Efectivo', categoria:'inventario'},
  {id:2, fecha:dia(0), monto:1007, origenAuto:'compra_moto', motoIdRef:588, forma:'Binance',  categoria:'inventario'},
  {id:3, fecha:dia(0), monto:516,  origenAuto:'compra_moto', motoIdRef:594, forma:'Efectivo', categoria:'inventario'},
  {id:4, fecha:dia(0), monto:719,  origenAuto:'compra_moto', motoIdRef:594, forma:'Binance',  categoria:'inventario'},
  {id:5, fecha:dia(0), monto:450,  categoria:'sueldos'},                                   // gasto de verdad
  {id:6, fecha:dia(0), monto:120,  categoria:'alquiler'},                                  // gasto de verdad
  {id:7, fecha:dia(0), monto:300,  origenAuto:'compra_moto', motoIdRef:700, forma:'Binance', categoria:'inventario'}, // moto sin credito
  {id:8, fecha:dia(-3), monto:600, origenAuto:'compra_moto', motoIdRef:800, forma:'Efectivo', categoria:'inventario'},// otro dia, otra moto
  {id:13,fecha:dia(-3), monto:900, origenAuto:'compra_moto', motoIdRef:800, forma:'Binance',  categoria:'inventario'},
  {id:9, fecha:dia(0), monto:999,  categoria:'sueldos', eliminado:true},                   // borrado: no cuenta
];
const d=API.getDashData('egresos','diario');
const hoyB=d[d.length-1], hace3=d[d.length-4];

ok('el total sigue contando todo, como antes (723+1007+516+719+450+120+300)', hoyB.total===3835);
ok('gastos operativos: solo sueldos y alquiler = 570', hoyB.gastos===570);
ok('compra de motos: lo financiado 1007+719 + la moto sin crédito 300 = 2026', hoyB.motos===2026);
ok('iniciales apartadas: 723+516 = 1239', hoyB.iniciales===1239);
ok('gastos + motos + iniciales = total', hoyB.gastos+hoyB.motos+hoyB.iniciales===hoyB.total);
ok('el gráfico muestra 2596, no 3835', hoyB.gastos+hoyB.motos===2596);
ok('el egreso borrado no entra en ningún lado', hoyB.total!==3835+999);
ok('cada día con su moto: hace 3 días la inicial 600 y financiado 900', hace3.iniciales===600 && hace3.motos===900);

// Un crédito cancelado no aporta inicial: su egreso se cuenta como compra normal
S.egresos.push({id:10, fecha:dia(0), monto:400, origenAuto:'compra_moto', motoIdRef:900, forma:'Efectivo', categoria:'inventario'});
const d2=API.getDashData('egresos','diario'); const hoy2=d2[d2.length-1];
ok('crédito cancelado: su egreso va a compra de motos, no a iniciales', hoy2.iniciales===1239 && hoy2.motos===2426);

// Si la inicial coincide con lo financiado, no se apartan las dos
S.creds.push({id:'CRED-700', motoId:701, estado:'activo', fecha:dia(0), precio:1000, ini:500, fin:500});
S.egresos.push({id:11, fecha:dia(0), monto:500, origenAuto:'compra_moto', motoIdRef:701, forma:'Efectivo', categoria:'inventario'});
S.egresos.push({id:12, fecha:dia(0), monto:500, origenAuto:'compra_moto', motoIdRef:701, forma:'Binance',  categoria:'inventario'});
const d3=API.getDashData('egresos','diario'); const hoy3=d3[d3.length-1];
ok('inicial igual a lo financiado: se aparta una y la otra se cuenta', hoy3.iniciales===1739 && hoy3.motos===2926);

// El ingreso de la inicial no se toca: sigue contando en ingresos
S.pagos=[{id:'P1', estado:'confirmado', fecha:dia(0), monto:723, esInicial:true}];
const ing=API.getDashData('ingresos','diario');
ok('la inicial sigue contando como ingreso (no se toca ese lado)', ing[ing.length-1].total===723);

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
