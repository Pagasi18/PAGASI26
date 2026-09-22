// Arnes de cobranza: "vence hoy no es mora", pestañas Criticos / Ilocalizables /
// Mora Total, tipo de pago en el registro y exportador CSV/PDF.
// Fechas RELATIVAS (el modulo usa new Date() real). Usa el CreditoLedger REAL.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global; global.PG={};
const _els={};
const _mkEl=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},click(){},appendChild(){},removeChild(){}});
global.$=id=>{ if(!_els[id]) _els[id]=_mkEl(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>_mkEl(),body:{appendChild(){},removeChild(){},style:{}},addEventListener(){}};
global.setMicon=()=>{}; global.saveM=()=>S.saveFn&&S.saveFn();
global.DB={saveCred:()=>{},savePago:()=>{},saveMovimiento:()=>{},updateCred:()=>{}};
global.S={currentUser:{rol:'Gerente',nombre:'Samanta'},page:'pagos',creds:[],clientes:[],pagos:[],movimientos:[],facturas:[]};
global.fmt=n=>'$'+Number(n||0).toFixed(2);
global.fechaLocalISO=d=>{const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());};
global.parseFechaLocal=s=>new Date(String(s).slice(0,10)+'T12:00:00');
global.hoyLocalISO=()=>fechaLocalISO(new Date());
global.dLoc=n=>fechaLocalISO(new Date(Date.now()+n*86400000));
global.toast=()=>{}; global.logActividad=()=>{}; global.nav=()=>{}; global.closeM=()=>{};
global.confirm=()=>true;
global._concFiltrar=a=>a; global._concGetById=id=>null;
global.GESTION_COBRO=[{v:'',l:'—',c:'#999999'}];
global.pgGet=()=>1; global.pgSet=()=>{}; global.pgControls=()=>''; global._thSort=(a,b,c,d)=>'<th>'+d+'</th>';
global.isEmpleadoRole=()=>false; global.pageBanner=()=>''; global.portalComprobantesCard=()=>'';
global.PLAN={plazo:12,diasGracia:5};
global.open=function(){ return {document:{write:function(h){global._pdfCapturado=h;},close:function(){}},focus:function(){},print:function(){}}; };
global.ok=(l,v)=>{console.log((v?'OK  ':'FALLA')+' '+l); if(!v) process.exitCode=1;};
const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const LEDGER=fs.readFileSync(path.join(ROOT,'logic/credito-ledger.js'),'utf8');
const L=fs.readFileSync(path.join(ROOT,'logic/pagos.js'),'utf8');
const M=fs.readFileSync(path.join(ROOT,'modules/pagos.js'),'utf8');
global.CRLF=String.fromCharCode(13)+String.fromCharCode(10);
eval('with(auto){'+LEDGER+'\n'+L+'\n'+M+`
  var hoy=hoyLocalISO();
  ok('CreditoLedger real cargado', typeof CreditoLedger==='object' && !!CreditoLedger.generarEstadoCredito);

  function mk(id,extra){ return Object.assign({id:id,cli:'CLI '+id,clienteId:id,modelo:'M',precio:1000,ini:400,cuotaQ:50,totalCuotas:20,plazo:10,fecha:dLoc(-110),estado:'activo',mora:0,concesionarioId:null},extra||{}); }
  // HOY: primera cuota vence exactamente hoy (fecha+15d) -> NO es mora
  // AYER: 1 dia de atraso -> mora · C45: 45 dias -> critico · C10: 10 dias -> regular
  // C40A: 40 dias pero CON acuerdo mensual -> acuerdos (y Mora Total)
  S.creds=[
    mk('CRED-HOY',{fecha:dLoc(-15), mora:0}),
    mk('CRED-AYER',{fecha:dLoc(-16), mora:1}),
    mk('CRED-C45',{fecha:dLoc(-60), mora:45}),
    mk('CRED-C10',{fecha:dLoc(-25), mora:10}),
    mk('CRED-C40A',{fecha:dLoc(-55), mora:40, fechaCompromiso:dLoc(9)})
  ];
  S.cobTab='quincenal';
  var h=PG.pagos();

  // ── vence hoy NO es mora ──
  ok('vence hoy visible en quincenal', h.indexOf('CRED-HOY')>-1);
  ok('vence hoy con etiqueta correcta', h.indexOf('Vence hoy')>-1);
  ok('chip Atrasados = 2 (ayer y c10; c45 vive en Criticos)', h.indexOf('🔴 Atrasados <span style="opacity:.7;font-weight:800">2</span>')>-1);
  ok('quincenal: c45 NO esta (vive en Criticos)', h.indexOf('CRED-C45')===-1);
  ok('conciliacion menciona Criticos', h.indexOf('en Críticos: <b>1</b>')>-1);
  S.cuotasFilter='atrasados';
  var hA=PG.pagos();
  ok('filtro atrasados excluye al que vence hoy', hA.indexOf('CRED-HOY')===-1 && hA.indexOf('CRED-AYER')>-1);
  S.cuotasFilter='aldia';
  var hD=PG.pagos();
  ok('vence hoy queda en Al dia', hD.indexOf('CRED-HOY')>-1 && hD.indexOf('CRED-AYER')===-1);
  S.cuotasFilter='todos';

  // ── barra de pestañas ──
  ok('boton Criticos presente', h.indexOf('🚨 Críticos')>-1);
  ok('boton Mora Total presente', h.indexOf('📕 Mora Total')>-1);
  var _iC=h.indexOf('🚨 Críticos'), _iT=h.indexOf('📕 Mora Total');
  var _badge1=h.indexOf('margin-left:4px">1</span>', _iC);
  ok('contador criticos = 1 (solo c45; el de acuerdo va en su pestana)', h.indexOf('más de 30 días de mora')>-1 && _badge1>_iC && _badge1<_iT);
  // Desde el 17-sep la pestana lleva el % de la cartera: "4 en mora (80,0% de 5 créditos) · ..."
  // (sin expresiones regulares: este arnes evalua las pruebas dentro de un template
  //  literal y ahi \d pierde la barra invertida)
  var _iMora = h.indexOf('4 en mora');
  ok('contador mora total = 4', _iMora>-1);
  ok('y ahora dice que parte de la cartera es (4 de 5 = 80,0%)',
     _iMora>-1 && h.slice(_iMora, _iMora+90).indexOf('(80,0% de 5 créditos)')>-1);

  S.cobTab='criticos';
  var hC=PG.pagos();
  ok('criticos: c45 presente', hC.indexOf('CRED-C45')>-1);
  ok('criticos: el de acuerdo mensual NO esta', hC.indexOf('CRED-C40A')===-1);
  ok('criticos: c10 y ayer NO estan', hC.indexOf('CRED-C10')===-1 && hC.indexOf('CRED-AYER')===-1);
  ok('criticos: sin chips al dia/atrasados', hC.indexOf("setCuotasFilter('aldia')")===-1);
  ok('criticos: sin filtros de fecha', hC.indexOf('Vence desde:')===-1);
  ok('criticos: titulo correcto', hC.indexOf('más de 30 días de atraso')>-1);

  S.cobTab='total';
  var hT=PG.pagos();
  ok('total: los 4 morosos presentes', ['CRED-AYER','CRED-C45','CRED-C10','CRED-C40A'].every(function(x){return hT.indexOf(x)>-1;}));
  ok('total: el que vence hoy NO esta', hT.indexOf('CRED-HOY')===-1);
  ok('total: peor primero (c45 antes que c10 y ayer)', hT.indexOf('CRED-C45')<hT.indexOf('CRED-C10') && hT.indexOf('CRED-C10')<hT.indexOf('CRED-AYER'));
  ok('total: marca de acuerdo en c40', hT.indexOf('🗓️ Acuerdo:')>-1);
  S.cuotasQ='C45';
  var hQ=PG.pagos();
  ok('total: buscador filtra', hQ.indexOf('CRED-C45')>-1 && hQ.indexOf('CRED-C10')===-1);
  S.cuotasQ='';
  S.cobTab='quincenal';

  // ── Tipo de pago en registro ──
  ok('_tipoPago inicial por esInicial', _tipoPago({esInicial:true})==='inicial');
  ok('_tipoPago inicial por tipoOperacion', _tipoPago({tipoOperacion:'inicial_credito'})==='inicial');
  ok('_tipoPago liquidacion por tipo', _tipoPago({tipo:'liquidacion'})==='liquidacion');
  ok('_tipoPago liquidacion por referencia', _tipoPago({referencia:'LIQ-ANT'})==='liquidacion');
  ok('_tipoPago cuota por defecto', _tipoPago({metodo:'Efectivo'})==='cuota');
  S.pagos=[
    {id:'P1',cli:'A',cred:'CRED-AYER',fecha:hoy,monto:50,metodo:'Efectivo',cobrador:'X',estado:'confirmado'},
    {id:'P2',cli:'B',cred:'CRED-C10',fecha:hoy,monto:400,metodo:'Binance',cobrador:'X',estado:'confirmado',esInicial:true,tipoOperacion:'inicial_credito'},
    {id:'P3',cli:'C',cred:'CRED-C45',fecha:hoy,monto:900,metodo:'Efectivo',cobrador:'X',estado:'confirmado',tipo:'liquidacion',referencia:'LIQ-ANT'}
  ];
  var hP=PG.pagos();
  ok('columna Tipo en tabla', hP.indexOf('<th>Tipo</th>')>-1);
  ok('chips de tipo con contadores', hP.indexOf('💠 Iniciales')>-1 && hP.indexOf('⚡ Liquidaciones')>-1);
  ok('badge inicial en fila', hP.indexOf('💠 Inicial<')>-1);
  ok('badge liquidacion en fila', hP.indexOf('⚡ Liquidación<')>-1);
  S.pagosTipoF='inicial';
  var hPI=PG.pagos();
  ok('filtro inicial: solo P2', hPI.indexOf('>P2<')>-1 && hPI.indexOf('>P1<')===-1 && hPI.indexOf('>P3<')===-1);
  S.pagosTipoF='cuota';
  var hPC=PG.pagos();
  ok('filtro cuota: solo P1', hPC.indexOf('>P1<')>-1 && hPC.indexOf('>P2<')===-1);
  S.pagosTipoF='todos';
  ok('sin undefined en ningun render', [h,hA,hD,hC,hT,hP].every(function(x){return x.indexOf('undefined')===-1;}));

  // ── Pestaña Ilocalizables ──
  S.pagos=[];                                                // sin pagos: estados de mora limpios
  S.creds[3].cobranzaStatus='ilocalizable';                  // CRED-C10 (10 dias)
  S.creds.push(mk('CRED-C50',{fecha:dLoc(-65),mora:50,cobranzaStatus:'ilocalizable'})); // 50 dias, ilocalizable
  S.cobTab='quincenal';
  var hI0=PG.pagos();
  ok('boton Ilocalizables presente', hI0.indexOf('📵 Ilocalizables')>-1);
  ok('quincenal: c10 ya no esta (ilocalizable)', hI0.indexOf('CRED-C10')===-1);
  ok('conciliacion menciona Ilocalizables (2)', hI0.indexOf('en Ilocalizables: <b>2</b>')>-1);
  S.cobTab='criticos';
  var hI1=PG.pagos();
  ok('criticos: c50 ilocalizable NO esta', hI1.indexOf('CRED-C50')===-1);
  S.cobTab='iloc';
  var hI2=PG.pagos();
  ok('iloc: c10 y c50 presentes', hI2.indexOf('CRED-C10')>-1 && hI2.indexOf('CRED-C50')>-1);
  ok('iloc: los demas NO estan', hI2.indexOf('CRED-AYER')===-1 && hI2.indexOf('CRED-C45')===-1);
  ok('iloc: titulo correcto', hI2.indexOf('marcados con la nota')>-1);
  S.cobTab='total';
  var hI3=PG.pagos();
  ok('total sigue mostrando a los ilocalizables', hI3.indexOf('CRED-C10')>-1 && hI3.indexOf('CRED-C50')>-1);
  ok('sin undefined (ilocalizables)', [hI0,hI1,hI2,hI3].every(function(x){return x.indexOf('undefined')===-1;}));
  S.cobTab='quincenal';

  // ── Exportador (CSV / PDF) ──
  S.creds.push(mk('CRED-FUT',{fecha:dLoc(-5),mora:0}));     // al dia con cuota futura: fuera del reporte del dia
  var hX=PG.pagos();
  ok('boton Descargar presente', hX.indexOf('⬇ Descargar')>-1 && hX.indexOf('cobExportAbrir()')>-1);
  ok('listas stashed para exportar', window._cobXls && window._cobXls.total.length>=4 && window._cobXls.iloc.length===2);
  cobExportAbrir();
  ok('modal exportar abre', $('mtt').textContent==='Descargar reporte de cobranza');
  ok('modal con tarjetas del dia/semana/mes/pdf', ['Del día','De la semana','Del mes','📄 PDF','Rango de fechas'].every(function(x){return $('mbd').innerHTML.indexOf(x)>-1;}));
  window._cobExpSel={alc:'todas',per:'todo',fmt:'excel'};
  ok('exportar todo devuelve true', S.saveFn()===true);
  var X=window._cobXlsUltimoCsv||'';
  ok('csv: cabeceras completas', ['Cliente','Crédito','Concesionario','Días de mora','Cuotas vencidas','Saldo pendiente','Nota de cobranza','Cobrador'].every(function(c){return X.indexOf(c)>-1;}));
  ok('csv: todos los creditos presentes', ['CRED-HOY','CRED-AYER','CRED-C45','CRED-C10','CRED-C40A','CRED-C50','CRED-FUT'].every(function(c){return X.indexOf(c)>-1;}));
  ok('csv: estado por credito', X.indexOf('Ilocalizable')>-1 && X.indexOf('Crítico')>-1 && X.indexOf('Acuerdo mensual')>-1 && X.indexOf('Mora regular')>-1 && X.indexOf('Al día')>-1);
  ok('csv: montos con coma decimal y separador ;', X.indexOf(';50,00;')>-1);
  ok('csv: filas separadas por linea', X.split(CRLF).length>=8);
  cobExportAbrir();
  window._cobExpSel={alc:'todas',per:'dia',fmt:'excel'};
  ok('exportar del dia devuelve true', S.saveFn()===true);
  var XD=window._cobXlsUltimoCsv||'';
  ok('dia: incluye vence-hoy Y moras', XD.indexOf('CRED-HOY')>-1 && XD.indexOf('CRED-C45')>-1 && XD.indexOf('CRED-C10')>-1);
  ok('dia: excluye al dia con cuota futura', XD.indexOf('CRED-FUT')===-1);
  cobExportAbrir();
  window._cobExpSel={alc:'todas',per:'semana',fmt:'excel'};
  ok('exportar semana devuelve true', S.saveFn()===true);
  var XS=window._cobXlsUltimoCsv||'';
  ok('semana: incluye vence-hoy y moras', XS.indexOf('CRED-HOY')>-1 && XS.indexOf('CRED-C45')>-1);
  S.cobTab='iloc'; PG.pagos();
  cobExportAbrir();
  window._cobExpSel={alc:'actual',per:'todo',fmt:'excel'};
  ok('exportar pestaña actual devuelve true', S.saveFn()===true);
  var XI=window._cobXlsUltimoCsv||'';
  ok('csv iloc: solo los ilocalizables', XI.indexOf('CRED-C10')>-1 && XI.indexOf('CRED-C50')>-1 && XI.indexOf('CRED-AYER')===-1);
  S.cobTab='quincenal'; PG.pagos();
  cobExportAbrir();
  window._cobExpSel={alc:'todas',per:'dia',fmt:'pdf'};
  ok('exportar PDF devuelve true', S.saveFn()===true);
  var P=window._cobPdfUltimoHtml||'';
  ok('pdf: encabezado y carta horizontal', P.indexOf('Reporte de Cobranza')>-1 && P.indexOf('Letter landscape')>-1);
  ok('pdf: trae la data', P.indexOf('CRED-C45')>-1 && P.indexOf('Días de mora')>-1);
  ok('pdf: resumen en la banda', P.indexOf('Monto vencido')>-1 && P.indexOf('Prom. días de mora')>-1);
  ok('pdf: se abrio la ventana', (global._pdfCapturado||'').indexOf('Reporte de Cobranza')>-1);
}`);
