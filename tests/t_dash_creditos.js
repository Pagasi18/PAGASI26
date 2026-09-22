// Dashboard › "Créditos otorgados" (Adam, 14-sep-2026): el gráfico no cuenta
// los créditos cancelados (esa venta se anuló), igual que los reportes de
// Finanzas y el gráfico de concesionarios. Un crédito recuperado sí cuenta el
// día que se otorgó. Antes, el 14-sep marcaba 10 con 9 en la lista: CRED-555
// estaba cancelado.
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
const API=eval('with(auto){'+SRC+'\n; ({getDashData}) }');

S.creds=[
  {id:'CRED-550', estado:'activo',     fecha:dia(0),  total:2000},
  {id:'CRED-555', estado:'cancelado',  fecha:dia(0),  total:1500},                 // se anuló: no cuenta
  {id:'CRED-556', estado:'activo',     fecha:dia(0),  total:1800},
  {id:'CRED-540', estado:'recuperado', fecha:dia(-3), total:1200},                 // se otorgó ese día: sí cuenta
  {id:'CRED-541', estado:'completado', fecha:dia(-3), total:900},
  {id:'CRED-530', estado:'activo',     fecha:dia(-5), total:1000, eliminado:true}, // borrado: no cuenta
  {id:'CRED-531', estado:'cancelado',  fecha:dia(-5), total:1000},
];

const diario=API.getDashData('creditos','diario');
const hoyB=diario[diario.length-1], hace3=diario[diario.length-4], hace5=diario[diario.length-6];
ok('el diario trae 30 días', diario.length===30);
ok('hoy: 2 créditos (el cancelado no cuenta)', hoyB.count===2);
ok('hoy: el monto tampoco suma el cancelado', hoyB.total===3800);
ok('hace 3 días: el recuperado y el completado sí cuentan', hace3.count===2);
ok('hace 5 días: ni el borrado ni el cancelado cuentan', hace5.count===0);

const ym=dia(0).slice(0,7);
const esperadoMes=S.creds.filter(c=>!c.eliminado&&c.estado!=='cancelado'&&c.fecha.slice(0,7)===ym).length;
const mensual=API.getDashData('creditos','mensual');
ok('mensual: el mes actual no cuenta cancelados ni borrados', mensual[mensual.length-1].count===esperadoMes);

const quin=API.getDashData('creditos','quincenal');
ok('quincenal: en total 4 (sin cancelados ni borrado)', quin.reduce((a,b)=>a+b.count,0)===4);

S.pagos=[{id:'P-1',estado:'confirmado',fecha:dia(0),monto:50},{id:'P-2',estado:'pendiente',fecha:dia(0),monto:70}];
const ing=API.getDashData('ingresos','diario');
ok('los ingresos no cambian: solo confirmados', ing[ing.length-1].total===50);

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
