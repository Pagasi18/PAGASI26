// Arnes de la Auditoria de Datos (modules/config.js): comparacion de nombres
// normalizada (mayusculas/acentos/espacios) y accion segura "usar el nombre
// del credito" para pagos marcados como cliente distinto.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global; global.PG={};
const _els={};
const _mkEl=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},click(){},appendChild(){},removeChild(){}});
global.$=id=>{ if(!_els[id]) _els[id]=_mkEl(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>_mkEl(),body:{appendChild(){},removeChild(){},style:{}},addEventListener(){}};
global.guardados=[];
global.DB={savePago:p=>guardados.push({id:p.id,cli:p.cli,eliminado:!!p.eliminado}),saveCred:()=>{},updateCred:()=>{},saveMovimiento:()=>{}};
global.S={currentUser:{rol:'Administrador',nombre:'Adam'},page:'config',creds:[],clientes:[],pagos:[],movimientos:[],motos:[]};
global.fmt=n=>'$'+Number(n||0).toFixed(2);
global.fechaLocalISO=d=>{const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());};
global.hoyLocalISO=()=>fechaLocalISO(new Date());
global.toast=()=>{}; global.logActividad=()=>{}; global.nav=()=>{}; global.closeM=()=>{}; global.setMicon=()=>{};
global.confirm=()=>true;
global.getCreditoPagosConfirmados=()=>0;
global.MutationObserver=function(){ this.observe=function(){}; this.disconnect=function(){}; };
global.ok=(l,v)=>{console.log((v?'OK  ':'FALLA')+' '+l); if(!v) process.exitCode=1;};
const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const C=fs.readFileSync(path.join(ROOT,'modules/config.js'),'utf8');
eval('with(auto){'+C+`
  // normalizacion
  ok('norm: mayusculas', _auditNombreNorm('JUAN PEREZ')===_auditNombreNorm('juan perez'));
  ok('norm: acentos', _auditNombreNorm('José Pérez')===_auditNombreNorm('jose perez'));
  ok('norm: espacios de mas', _auditNombreNorm('  Ana   López ')===_auditNombreNorm('ana lopez'));
  ok('norm: nombres distintos siguen distintos', _auditNombreNorm('Ana Lopez')!==_auditNombreNorm('Maria Lopez'));

  S.creds=[{id:'CRED-1',cli:'JUAN PÉREZ',clienteId:'c1',estado:'activo',total:1000},{id:'CRED-2',cli:'MARIA LOPEZ',clienteId:'c2',estado:'activo',total:1000}];
  S.clientes=[{id:'c1',nombre:'JUAN PÉREZ',cedula:'V-1'},{id:'c2',nombre:'MARIA LOPEZ',cedula:'V-2'}];
  S.pagos=[
    {id:'P-A',cred:'CRED-1',cli:'juan perez',monto:50,fecha:'2026-08-01',estado:'confirmado'},      // mismo cliente, otra grafia → NO huerfano
    {id:'P-B',cred:'CRED-1',cli:'Juan Pérez ',monto:50,fecha:'2026-08-02',estado:'confirmado'},     // espacio final → NO huerfano
    {id:'P-C',cred:'CRED-1',cli:'PEDRO GOMEZ',monto:50,fecha:'2026-08-03',estado:'confirmado'},     // otro nombre → cliente distinto
    {id:'P-D',cred:'CRED-99',cli:'ALGUIEN',monto:50,fecha:'2026-08-04',estado:'confirmado'}         // credito inexistente
  ];
  auditarPagosHuerfanos();
  var H=window._auditHuerfanos||[];
  ok('huerfanos: solo 2 (cliente distinto real + credito inexistente)', H.length===2);
  ok('huerfanos: P-A y P-B NO aparecen', !H.some(function(h){return h.pago.id==='P-A'||h.pago.id==='P-B';}));
  ok('huerfanos: P-C es cliente distinto', H.some(function(h){return h.pago.id==='P-C'&&h.tipo==='cliente_distinto';}));
  ok('huerfanos: P-D es credito inexistente', H.some(function(h){return h.pago.id==='P-D'&&h.tipo==='cred_inexistente';}));
  var anyHtml=$('audit-resultado').innerHTML;
  ok('boton seguro solo en cliente distinto', anyHtml.indexOf('auditSincronizarNombre')>-1 && (anyHtml.match(/auditSincronizarNombre/g)||[]).length===1);
  ok('boton eliminar sigue disponible', anyHtml.indexOf('auditEliminarPago')>-1);

  // accion segura: copia el nombre del credito, no borra
  var idxC=H.findIndex(function(h){return h.pago.id==='P-C';});
  guardados.length=0;
  auditSincronizarNombre('P-C', idxC);
  var pC=S.pagos.find(function(p){return p.id==='P-C';});
  ok('sync: el pago toma el nombre del credito', pC.cli==='JUAN PÉREZ');
  ok('sync: se guardo y NO se elimino', guardados.length===1 && guardados[0].cli==='JUAN PÉREZ' && guardados[0].eliminado===false);
  ok('sync: ya no es huerfano', !(window._auditHuerfanos||[]).some(function(h){return h.pago.id==='P-C';}));

  // auditoria completa usa la misma normalizacion
  auditarCompleto();
  var I=window._auditIssues||[];
  var noCoincide=I.filter(function(i){return i.tipo==='Cliente no coincide con crédito';});
  ok('completa: sin falsas alarmas por grafia (0 "no coincide")', noCoincide.length===0);
  ok('completa: detecta el credito inexistente', I.some(function(i){return i.tipo==='Crédito inexistente'&&i.desc.indexOf('P-D')>-1;}));

  // ── relacion entre nombres (casos reales de la auditoria del 23/08) ──
  ok('rel: nombre corto = parcial', _auditNombresRel('Jesús morgado','Jesus Eduardo Morgado')==='parcial');
  ok('rel: REZTREPO/RESTREPO = tipeo', _auditNombresRel('IVAN GAMALIER FERNANDEZ REZTREPO','IVAN GAMALIER FERNANDEZ RESTREPO')==='tipeo');
  ok('rel: CARINA/KARINA = tipeo', _auditNombresRel('ALBA CARINA ROJO RAMIREZ','ALBA KARINA ROJO RAMIREZ')==='tipeo');
  ok('rel: persona vs empresa = distinto', _auditNombresRel('JOSE ELIAS GUEVARA LORETO','CORPORACION J G 2022 C.A')==='distinto');
  ok('rel: dos personas = distinto', _auditNombresRel('Ana Lopez','Maria Lopez')==='distinto');

  // ── huerfanos: parcial no aparece, tipeo aparece suave con boton seguro ──
  S.creds=[{id:'CRED-1',cli:'JUAN EDUARDO PEREZ',clienteId:'c1',estado:'activo',total:1000}];
  S.pagos=[
    {id:'P-P',cred:'CRED-1',cli:'Juan Perez',monto:50,fecha:'2026-08-01',estado:'confirmado'},       // parcial
    {id:'P-T',cred:'CRED-1',cli:'JUAN EDUARDO PERES',monto:50,fecha:'2026-08-02',estado:'confirmado'} // tipeo
  ];
  auditarPagosHuerfanos();
  var H2=window._auditHuerfanos||[];
  ok('huerfanos: el nombre corto NO es huerfano', !H2.some(function(h){return h.pago.id==='P-P';}));
  ok('huerfanos: el tipeo sale como tipo tipeo', H2.length===1 && H2[0].pago.id==='P-T' && H2[0].tipo==='tipeo');
  var h2html=$('audit-resultado').innerHTML;
  ok('huerfanos: etiqueta POSIBLE TIPEO y boton seguro', h2html.indexOf('POSIBLE TIPEO')>-1 && h2html.indexOf('auditSincronizarNombre')>-1);

  // ── completa: duplicados con tiempo/referencia, cedulas con creditos, motos en mora ──
  S.clientes=[{id:'c1',nombre:'JUAN EDUARDO PEREZ',cedula:'V-1'},{id:'c1b',nombre:'Juan E. Perez',cedula:'V-1'},{id:'c2',nombre:'MARIA',cedula:'V-2'}];
  S.creds=[
    {id:'CRED-1',cli:'JUAN EDUARDO PEREZ',clienteId:'c1',estado:'mora',total:1000,motoId:'M1'},
    {id:'CRED-2',cli:'MARIA',clienteId:'c2',estado:'completado',total:1000,motoId:'M2'}
  ];
  S.motos=[{id:'M1',modelo:'BR150',estado:'financiada',cliente:'JUAN'},{id:'M2',modelo:'RK200',estado:'financiada',cliente:'MARIA'}];
  S.pagos=[
    {id:'PAG-1783438231061',cred:'CRED-1',cli:'JUAN EDUARDO PEREZ',monto:86,fecha:'2026-07-07',estado:'confirmado',referencia:'111'},
    {id:'PAG-1783438261621',cred:'CRED-1',cli:'JUAN EDUARDO PEREZ',monto:86,fecha:'2026-07-07',estado:'confirmado',referencia:'222'},   // 30 s despues → muy probable
    {id:'PAG-1787317623095',cred:'CRED-2',cli:'MARIA',monto:126,fecha:'2026-08-21',estado:'confirmado',referencia:'A1'},
    {id:'PAG-1787335384331',cred:'CRED-2',cli:'MARIA',monto:126,fecha:'2026-08-21',estado:'confirmado',referencia:'B2'}              // 4.9 h despues, refs distintas → posible
  ];
  auditarCompleto();
  var I2=window._auditIssues||[];
  var dupMuy=I2.filter(function(i){return i.tipo==='Pago duplicado (muy probable)';});
  var dupPos=I2.filter(function(i){return i.tipo==='Posible pago duplicado';});
  ok('duplicado a 30 s = muy probable (error)', dupMuy.length===1 && dupMuy[0].sev==='error' && dupMuy[0].desc.indexOf('31 seg')>-1);
  ok('duplicado a horas con otra ref = posible (aviso)', dupPos.length===1 && dupPos[0].sev==='warn' && dupPos[0].desc.indexOf('4.9 h')>-1 && dupPos[0].desc.indexOf('A1 / B2')>-1);
  var ced=I2.filter(function(i){return i.tipo==='Cédula duplicada';});
  ok('cedula duplicada dice cual tiene creditos', ced.length===1 && ced[0].desc.indexOf('1 crédito')>-1 && ced[0].desc.indexOf('sin créditos → se puede eliminar')>-1);
  var motosI=I2.filter(function(i){return i.tipo==='Financiada sin crédito activo';});
  ok('moto con credito EN MORA no es alarma; con credito completado si', motosI.length===1 && motosI[0].desc.indexOf('MOT-M2')>-1);
  ok('completa: boton Ver en cobranza en pagos', $('audit-completo-resultado').innerHTML.indexOf('Ver en cobranza')>-1);
  ok('completa: nota de como corregir', $('audit-completo-resultado').innerHTML.indexOf('se eliminan desde Cobranza')>-1);
}`);
