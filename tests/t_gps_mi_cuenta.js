// GPS en Mi cuenta (Adam, 14-sep-2026): el interruptor del módulo GPS.
// Solo un administrador decide qué cliente ve su moto. La verdad es la ficha
// ubicacion_cliente/{crédito}: el panel la consulta, la crea o la borra, y
// nunca copia la clave, el IMEI ni la línea del equipo.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global;
const _els={};
const _mk=()=>({innerHTML:'',textContent:'',value:'',className:'',type:'text',style:{},appendChild(){},querySelector(){return _mk();}});
global.$=id=>{ if(!_els[id]) _els[id]=_mk(); return _els[id]; };
const elMc={innerHTML:'', _gps:null, getAttribute(k){ return k==='data-gps' ? this._gps : null; }};
global.document={getElementById:id=>id==='gps-mc'?elMc:null,querySelector:()=>null,querySelectorAll:()=>[],createElement:_mk,head:{appendChild(){}},body:{appendChild(){},removeChild(){},style:{}}};
global.setMicon=()=>{}; global.closeM=()=>{}; global.nav=()=>{}; global.pageBanner=()=>'';
let toasts=[], logs=[], confirmar=true, preguntas=[], esAdmin=true;
global.toast=(m,t)=>toasts.push({m,t});
global.logActividad=(a,mod,id,d)=>logs.push({a,mod,id,d});
global.confirm=m=>{ preguntas.push(m); return confirmar; };
global.isAdminUser=()=>esAdmin;
global.DB={ saveGps:()=>{ throw new Error('no debe guardar el equipo'); } };
let timers=[];
global.setTimeout=fn=>{ timers.push(fn); return timers.length; };
// Firestore de mentira
let docs={}, escrituras=[], lecturas=[], falla=null;
global.db={ collection:col=>({ doc:id=>({
  get:()=>{ lecturas.push(col+'/'+id); if(docs[col+'/'+id]==='DENEGADO') return Promise.reject({code:'permission-denied'}); return Promise.resolve({exists:(col+'/'+id) in docs, data:()=>docs[col+'/'+id]}); },
  set:d=>{ escrituras.push({op:'set',ruta:col+'/'+id,d}); if(falla) return Promise.reject(falla); docs[col+'/'+id]=d; return Promise.resolve(); },
  update:d=>{ escrituras.push({op:'update',ruta:col+'/'+id,d}); return Promise.resolve(); },
  delete:()=>{ escrituras.push({op:'delete',ruta:col+'/'+id}); if(falla) return Promise.reject(falla); delete docs[col+'/'+id]; return Promise.resolve(); },
}) }) };
// Igual que el del app: true si guardó, false (y aviso) si falló
global._dbSilent=fn=>{ try { return Promise.resolve(fn()).then(()=>true).catch(e=>{ toasts.push({m:'No se pudo guardar en Firebase: '+(e.message||e.code),t:'error'}); return false; }); } catch(e){ return Promise.resolve(false); } };
global._gpsConfig={ workerUrl:'https://w.example' };
global.S={currentUser:{nombre:'Adam',rol:'Administrador'}, gps:[], creds:[], motos:[], clientes:[]};
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };

const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const SRC=fs.readFileSync(path.join(ROOT,'logic/gps.js'),'utf8');
const API=eval('with(auto){'+SRC+'\n; ({_gpsHtmlDetalle,_gpsMiCuentaHtml,_gpsMiCuentaRevisar,_gpsVisibleCliente,_gpsById,_gpsCredInfo}) }');
const vaciar=async(n=10)=>{ for(let i=0;i<n;i++) await new Promise(r=>setImmediate(r)); };
const correrTimers=async()=>{ const t=timers.splice(0); for(const fn of t){ fn(); await vaciar(); } };

S.creds=[
  {id:'CRED-523', cli:'Cliente Prueba', modelo:'Bera', placa:'AA1', estado:'activo', mora:0, eliminado:false},
  {id:'CRED-600', cli:'Otro Cliente',   modelo:'Bera', placa:'BB2', estado:'activo', mora:0, eliminado:false},
];
S.gps=[
  {id:'g1', idGps:'1001', creditoId:'CRED-523', estado:'instalado', lat:10.48, lng:-66.9, ultimaSenal:'2026-09-14 16:02:11',
   passwordGps:'123456', imei:'866500000000001', linea:'04140000000', iccid:'8958000000000000001'},
  {id:'g2', idGps:'1002', creditoId:'CRED-600', estado:'falla', lat:10.2, lng:-66.2},
  {id:'g3', idGps:'1003', creditoId:'', estado:'instalado', lat:10.3, lng:-66.3},
];

(async()=>{
  // ── Quién ve el interruptor ──
  esAdmin=false;
  const dNo=API._gpsHtmlDetalle('g1');
  ok('un empleado (no admin) no ve el interruptor', dNo.indexOf('gps-mc')===-1);
  ok('el detalle sigue igual para el empleado (Revisar y Editar)', dNo.indexOf('_gpsRevisar')>-1 && dNo.indexOf('_gpsOpenEdit')>-1);
  esAdmin=true; timers=[];
  const dSi=API._gpsHtmlDetalle('g1');
  ok('el admin ve la fila "Mi cuenta" del equipo instalado', dSi.indexOf('id="gps-mc" data-gps="g1"')>-1 && dSi.indexOf('Mi cuenta')>-1);
  ok('mientras consulta no hay botón (no se toca a ciegas)', dSi.indexOf('consultando...')>-1 && dSi.indexOf('_gpsVisibleCliente')===-1);
  ok('equipo que no está instalado: sin interruptor', API._gpsHtmlDetalle('g2').indexOf('gps-mc')===-1);
  ok('equipo sin crédito: sin interruptor', API._gpsHtmlDetalle('g3').indexOf('gps-mc')===-1);

  // ── Consulta la ficha ──
  ok('al pintar el detalle agenda la consulta de la ficha', timers.length>=1);
  elMc._gps='g1';
  await correrTimers();
  ok('consulta ubicacion_cliente/CRED-523', lecturas.indexOf('ubicacion_cliente/CRED-523')>-1);
  ok('sin ficha: "el cliente no la ve" y botón para mostrársela', elMc.innerHTML.indexOf('el cliente no la ve')>-1 && elMc.innerHTML.indexOf("_gpsVisibleCliente('g1',true)")>-1 && elMc.innerHTML.indexOf('Mostrarle su moto en Mi cuenta')>-1);
  lecturas=[];
  API._gpsMiCuentaRevisar('g1'); await vaciar();
  ok('no vuelve a consultar dentro del minuto (el panel se repinta seguido)', lecturas.length===0);
  API._gpsMiCuentaRevisar('g1', true); await vaciar();
  ok('forzado sí consulta', lecturas.length===1);

  // ── Activar ──
  timers=[]; escrituras=[]; logs=[]; toasts=[]; preguntas=[];
  API._gpsVisibleCliente('g1', true); await vaciar();
  ok('pregunta antes, con el nombre del cliente', preguntas.length===1 && preguntas[0].indexOf('Cliente Prueba')>-1 && preguntas[0].indexOf('una vez por hora')>-1);
  const fic=escrituras.find(e=>e.ruta==='ubicacion_cliente/CRED-523');
  ok('crea la ficha ubicacion_cliente/CRED-523', !!fic && fic.op==='set');
  ok('la ficha lleva SOLO posición, señal, revisión y dirección del botón', !!fic && Object.keys(fic.d).sort().join()==='credId,lat,lng,revisado,ultimaSenal,workerUrl');
  ok('nunca la clave, el IMEI, la línea ni el ICCID', !!fic && !/123456|866500000000001|04140000000|8958000000000000001/.test(JSON.stringify(fic.d)));
  ok('con la posición y la señal del equipo', !!fic && fic.d.lat===10.48 && fic.d.lng===-66.9 && fic.d.ultimaSenal==='2026-09-14 16:02:11' && fic.d.credId==='CRED-523');
  ok('con la dirección del Worker de config/gps', !!fic && fic.d.workerUrl==='https://w.example');
  ok('no toca el equipo en /gps', escrituras.length===1);
  ok('queda en la bitácora', logs.length===1 && logs[0].a==='gps_mi_cuenta_activar' && logs[0].d.credito==='CRED-523');
  ok('avisa "Listo"', toasts.some(t=>t.t==='success' && t.m.indexOf('ya puede ver su moto')>-1));
  ok('el panel ahora dice "el cliente ve su moto" y ofrece quitarla', elMc.innerHTML.indexOf('el cliente ve su moto')>-1 && elMc.innerHTML.indexOf("_gpsVisibleCliente('g1',false)")>-1);

  // ── Quitar ──
  escrituras=[]; logs=[]; toasts=[];
  API._gpsVisibleCliente('g1', false); await vaciar();
  ok('quitar borra la ficha', escrituras.length===1 && escrituras[0].op==='delete' && escrituras[0].ruta==='ubicacion_cliente/CRED-523' && !('ubicacion_cliente/CRED-523' in docs));
  ok('quitar queda en la bitácora', logs.length===1 && logs[0].a==='gps_mi_cuenta_quitar');
  ok('el panel vuelve a "el cliente no la ve"', elMc.innerHTML.indexOf('el cliente no la ve')>-1);

  // ── Lo que NO debe pasar ──
  escrituras=[]; toasts=[];
  confirmar=false; API._gpsVisibleCliente('g1', true); await vaciar(); confirmar=true;
  ok('si dice "Cancelar", no escribe nada', escrituras.length===0);
  esAdmin=false; API._gpsVisibleCliente('g1', true); await vaciar(); esAdmin=true;
  ok('un empleado no puede activarlo ni llamando la función', escrituras.length===0 && toasts.some(t=>t.t==='error' && t.m.indexOf('administrador')>-1));
  API._gpsVisibleCliente('g3', true); await vaciar();
  ok('equipo sin crédito: no escribe', escrituras.length===0);
  falla={code:'permission-denied', message:'Missing or insufficient permissions.'}; logs=[]; toasts=[];
  API._gpsVisibleCliente('g1', true); await vaciar();
  ok('si Firebase lo rechaza (reglas sin publicar): sin "Listo" ni bitácora', logs.length===0 && !toasts.some(t=>t.t==='success'));
  ok('y el panel no miente: sigue "el cliente no la ve"', elMc.innerHTML.indexOf('el cliente no la ve')>-1);
  falla=null;
  docs['ubicacion_cliente/CRED-523']='DENEGADO';
  API._gpsMiCuentaRevisar('g1', true); await vaciar();
  ok('si no se puede consultar: lo dice y no ofrece botón', elMc.innerHTML.indexOf('no se pudo consultar')>-1 && elMc.innerHTML.indexOf('_gpsVisibleCliente')===-1);
  elMc._gps='g9'; elMc.innerHTML='otro';
  API._gpsMiCuentaRevisar('g1', true); await vaciar();
  ok('si el admin ya abrió otra moto, no pinta encima', elMc.innerHTML==='otro');

  console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
  if(fail) process.exitCode=1;
})();
