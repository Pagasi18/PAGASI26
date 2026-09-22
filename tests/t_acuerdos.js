// Arnes de acuerdos mensuales — fechas RELATIVAS al dia real para que la
// suite no caduque: el modulo usa new Date() de verdad.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global; global.PG={};
const _els={};
const _mkEl=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},click(){},appendChild(){},removeChild(){}});
global.$=id=>{ if(!_els[id]) _els[id]=_mkEl(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>_mkEl(),body:{appendChild(){},removeChild(){},style:{}},addEventListener(){}};
global.setMicon=()=>{}; global.saveM=()=>S.saveFn&&S.saveFn();
global.guardados=[];
global.DB={saveCred:c=>guardados.push({id:c.id,fecha:c.fechaCompromiso}),savePago:()=>{},saveMovimiento:()=>{},updateCred:()=>{}};
global.S={currentUser:{rol:'Gerente',nombre:'Samanta'},page:'pagos',creds:[],clientes:[],pagos:[],movimientos:[],facturas:[]};
global.fmt=n=>'$'+Number(n||0).toFixed(2);
global.fechaLocalISO=d=>{const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());};
global.parseFechaLocal=s=>new Date(String(s).slice(0,10)+'T12:00:00');
global.hoyLocalISO=()=>fechaLocalISO(new Date());
global.dLoc=n=>fechaLocalISO(new Date(Date.now()+n*86400000)); // hoy+n dias
global.toast=()=>{}; global.logActividad=()=>{}; global.nav=()=>{}; global.closeM=()=>{};
global.confirm=()=>true;
global._concFiltrar=a=>a; global._concGetById=id=>({C1:{nombre:'MOTOS BERA CHACAO'}}[id]||null);
global.GESTION_COBRO=[{v:'',l:'—',c:'#999999'}];
global.pgGet=()=>1; global.pgSet=()=>{}; global.pgControls=()=>''; global._thSort=(a,b,c,d)=>'<th>'+d+'</th>';
global.isEmpleadoRole=()=>false; global.pageBanner=()=>''; global.portalComprobantesCard=()=>'';
global.PLAN={plazo:12,diasGracia:5};
global.ok=(l,v)=>{console.log((v?'OK  ':'FALLA')+' '+l); if(!v) process.exitCode=1;};
const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const L=fs.readFileSync(path.join(ROOT,'logic/pagos.js'),'utf8');
const M=fs.readFileSync(path.join(ROOT,'modules/pagos.js'),'utf8');
eval('with(auto){'+L+'\n'+M+`
  var hoy=hoyLocalISO();
  // helpers puros
  ok('semaforo rojo +14d', _acuerdoSemaforo(dLoc(-14), hoy).label.indexOf('+14d')>-1);
  ok('semaforo vence hoy', _acuerdoSemaforo(hoy, hoy).nivel==='amarillo');
  ok('semaforo en fecha', _acuerdoSemaforo(dLoc(11), hoy).nivel==='verde');
  ok('rueda +1 mes normal', _acuerdoProximaFecha('2026-08-15')==='2026-09-15');
  ok('rueda con tope feb', _acuerdoProximaFecha('2026-01-31')==='2026-02-28');
  ok('rueda 31->30', _acuerdoProximaFecha('2026-08-31')==='2026-09-30');

  // creditos base con 5 dias de atraso (se quedan en Mora Regular)
  function mk(id,extra){ return Object.assign({id:id,cli:'CLI '+id,clienteId:id,modelo:'M',precio:1000,ini:400,cuotaQ:50,totalCuotas:20,plazo:10,fecha:dLoc(-20),estado:'activo',mora:0,concesionarioId:'C1'},extra||{}); }
  S.creds=[mk('CRED-A'), mk('CRED-B',{fechaCompromiso:dLoc(-14)}), mk('CRED-C',{fechaCompromiso:hoy}), mk('CRED-D',{fechaCompromiso:dLoc(11)})];

  S.cobTab='quincenal';
  var h1=PG.pagos();
  ok('tab1: aparece el quincenal', h1.indexOf('CRED-A')>-1);
  ok('tab1: NO aparecen los de acuerdo', h1.indexOf('CRED-B')===-1 && h1.indexOf('CRED-C')===-1);
  ok('tab1: buscador visible', h1.indexOf('id="cuotasQ"')>-1);
  ok('tab1: globo rojo con 1 promesa rota', h1.indexOf('margin-left:4px">1</span>')>-1);

  S.cobTab='acuerdos';
  var h2=PG.pagos();
  ok('tab2: los 3 acuerdos presentes', h2.indexOf('CRED-B')>-1 && h2.indexOf('CRED-C')>-1 && h2.indexOf('CRED-D')>-1);
  ok('tab2: incumplida +14d', h2.indexOf('Incumplida +14d')>-1);
  ok('tab2: vence hoy', h2.indexOf('Vence hoy')>-1);
  ok('tab2: en fecha', h2.indexOf('En fecha')>-1);
  ok('tab2: orden peor primero', h2.indexOf('CRED-B') < h2.indexOf('CRED-C') && h2.indexOf('CRED-C') < h2.indexOf('CRED-D'));
  ok('tab2: concesionario en fila', h2.indexOf('MOTOS BERA CHACAO')>-1);
  ok('tab2: acciones presentes', h2.indexOf("acuerdoAcordar('CRED-B')")>-1 && h2.indexOf("acuerdoQuitar('CRED-B')")>-1);
  ok('tab2: columna Notas', h2.indexOf('<th>Notas</th>')>-1);
  ok('tab2: KPIs presentes', h2.indexOf('Acumulado en acuerdos')>-1 && h2.indexOf('Promesas incumplidas hoy')>-1 && h2.indexOf('Cumplimiento hist')>-1);
  ok('sin undefined', h2.indexOf('undefined')===-1 && h1.indexOf('undefined')===-1);

  // boton directo en fila quincenal, por rol
  S.cobTab='quincenal';
  ok('fila quincenal: gerente ve el boton', PG.pagos().indexOf("acuerdoAcordar('CRED-A')")>-1);
  S.currentUser.rol='Vendedor Concesionario';
  ok('fila quincenal: vendedor NO lo ve', PG.pagos().indexOf("acuerdoAcordar('CRED-A')")===-1);
  S.currentUser.rol='Gerente';

  // modal de acordar
  guardados.length=0;
  acuerdoAcordar('CRED-A');
  ok('modal: titulo', $('mtt').textContent==='Acuerdo de pago mensual');
  ok('modal: chips rapidos', $('mbd').innerHTML.indexOf('Día 15')>-1 && $('mbd').innerHTML.indexOf('En 1 mes')>-1);
  $('ac_fecha').value=dLoc(27);
  ok('acordar guarda', S.saveFn()===true && S.creds[0].fechaCompromiso===dLoc(27) && guardados.length===1);
  $('ac_fecha').value='2026-01-01';
  ok('rechaza fecha pasada', S.saveFn()===false);
  $('ac_fecha').value='';
  ok('rechaza fecha vacia', S.saveFn()===false);

  // historial de promesas
  var cB=S.creds[1];
  cB.fechaCompromiso=dLoc(11); cB.promesasLog=[];
  _acuerdoRodarTrasPago(cB);
  ok('pago a tiempo anota cumplida', cB.promesasLog.length===1 && cB.promesasLog[0].resultado==='cumplida');
  cB.fechaCompromiso=dLoc(-18);
  _acuerdoRodarTrasPago(cB);
  ok('pago tarde anota rota', cB.promesasLog.length===2 && cB.promesasLog[1].resultado==='rota');
  var cC=S.creds[2]; cC.fechaCompromiso=dLoc(-17); cC.promesasLog=[];
  acuerdoAcordar('CRED-C'); $('ac_fecha').value=dLoc(22); S.saveFn();
  ok('reprogramar vencida anota rota', cC.promesasLog.length===1 && cC.promesasLog[0].resultado==='rota');
  var cD=S.creds[3]; cD.fechaCompromiso=dLoc(-16); cD.promesasLog=[];
  acuerdoQuitar('CRED-D');
  ok('quitar vencida anota rota', cD.promesasLog.length===1 && cD.promesasLog[0].resultado==='rota' && !('fechaCompromiso' in cD));
  ok('quitar elimina el campo', !('fechaCompromiso' in cD));

  // conciliacion de vencidos: chip vs campo c.mora
  delete S.creds[0].fechaCompromiso;                 // A regular, diff<0
  S.creds.push(mk('CRED-E',{fecha:dLoc(-9),mora:9})); // mora guardada, proxima cuota en el futuro
  // regulares = A(diff<0), D(diff<0), E(mora 9) -> 3 atrasados
  S.cobTab='quincenal'; S.cuotasFilter='todos';
  var h4=PG.pagos();
  ok('chip suma diff<0 y c.mora>0', h4.indexOf('3 en atraso')>-1);
  ok('linea de conciliacion presente', h4.indexOf('En mora total')>-1);
  S.cuotasFilter='aldia';
  var h5=PG.pagos();
  ok('contador de pestana ignora filtro rapido', h5.indexOf('3 en atraso')>-1);
  ok('CRED-E ya no se esconde en Al dia', h5.indexOf('CRED-E')===-1);
  S.cuotasFilter='atrasados';
  ok('CRED-E aparece bajo Atrasados', PG.pagos().indexOf('CRED-E')>-1);
  S.cuotasFilter='todos';

  // KPIs con historial: 1 cumplida / 4 total
  S.cobTab='acuerdos';
  var h6=PG.pagos();
  ok('KPI cumplimiento con cifras', h6.indexOf('(1/4)')>-1);
  S.currentUser.rol='Vendedor Concesionario';
  var antes=S.creds[1].fechaCompromiso;
  acuerdoAcordar('CRED-B');
  ok('vendedor NO puede acordar', S.creds[1].fechaCompromiso===antes);
}`);
