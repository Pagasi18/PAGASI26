// Que version de contrato le toca a cada credito. Lo importante: reimprimir
// un credito viejo debe sacar el contrato que ESE cliente firmo, no el nuevo.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global;
const _els={};
const _mkEl=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},appendChild(){}});
global.$=id=>{ if(!_els[id]) _els[id]=_mkEl(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>_mkEl(),body:{appendChild(){},removeChild(){},style:{}}};
global.S={creds:[],clientes:[],motos:[],pagos:[]};
global.toast=()=>{}; global.nav=()=>{};
global.ok=(l,v)=>{console.log((v?'OK  ':'FALLA')+' '+l); if(!v) process.exitCode=1;};
const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const L=fs.readFileSync(path.join(ROOT,'logic/contratos.js'),'utf8');

// Las declaraciones de funcion dentro de eval caen en scope de modulo, no en el
// proxy: hay que recuperarlas con un segundo eval.
global._CONTRATO_PROTECT_DESDE='2026-09-07';
const API=eval('with(auto){'+L+'\n; ({_contratoVersionDe:_contratoVersionDe, _CONTRATO_DRA_DESDE:_CONTRATO_DRA_DESDE}) }');
const V=API._contratoVersionDe, CORTE=API._CONTRATO_DRA_DESDE;

ok('la fecha de corte es hoy (31-ago-2026)', CORTE==='2026-08-31');

// ── Creditos ya firmados: manda el dia en que se firmo ──
ok('firmado antes del corte  -> contrato anterior', V({contratoFirmado:true, fechaContratoFirmado:'2026-08-30'})==='contrato');
ok('firmado el dia del corte -> contrato nuevo',    V({contratoFirmado:true, fechaContratoFirmado:'2026-09-01'})==='dra');
ok('firmado del 7-sep en adelante -> protect',     V({contratoFirmado:true, fechaContratoFirmado:'2026-09-15'})==='protect');
ok('firmado el 6-sep           -> todavia dra',    V({contratoFirmado:true, fechaContratoFirmado:'2026-09-06'})==='dra');
ok('firmado el 7-sep           -> protect',        V({contratoFirmado:true, fechaContratoFirmado:'2026-09-07'})==='protect');
ok('firmado hace un ano      -> contrato anterior', V({contratoFirmado:true, fechaContratoFirmado:'2025-11-02'})==='contrato');

// ── Sin fechaContratoFirmado cae a la fecha del credito (asi quedo la migracion) ──
ok('sin fechaFirmado usa fecha del credito', V({contratoFirmado:true, fecha:'2026-03-10'})==='contrato');
ok('fechaFirmado gana sobre fecha del credito', V({contratoFirmado:true, fecha:'2026-03-10', fechaContratoFirmado:'2026-09-01'})==='dra');

// ── Todavia sin firmar: no firmo nada, le toca el vigente ──
ok('sin firmar creado ayer -> contrato nuevo', V({contratoFirmado:false, fecha:'2026-08-30'})==='protect');
ok('sin firmar creado hoy  -> contrato nuevo', V({contratoFirmado:false, fecha:'2026-08-31'})==='protect');

// ── La version grabada manda sobre todo lo demas (para el futuro) ──
ok('version grabada manda', V({contratoVersion:'contrato', contratoFirmado:true, fechaContratoFirmado:'2026-12-01'})==='contrato');
ok('version grabada manda (al reves)', V({contratoVersion:'dra', contratoFirmado:true, fechaContratoFirmado:'2020-01-01'})==='dra');

// ── Bordes: nada raro debe reventar ──
ok('credito nulo no revienta', V(null)==='dra');
ok('firmado sin ninguna fecha -> anterior (conservador)', V({contratoFirmado:true})==='contrato');
ok('fecha con hora se recorta bien', V({contratoFirmado:true, fechaContratoFirmado:'2026-08-30T23:59:00'})==='contrato');
ok('objeto vacio no revienta', V({})==='protect');
