// Dashboard Finanzas (21-oct-2026): los indicadores nuevos que pidió Adam.
// Hasta el CRED-498 todo lo que se cobra por encima de la moto es "otros
// servicios"; desde el CRED-499, y en toda la PAGASI 26 (M-###), rige el contrato
// con Pagasi Protect: interés al 12 % anual, Protect = monto financiado − moto,
// IVA = 16 % del Protect, aparte. Solo se muestra: nada se guarda.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global; global.PG={};
const _mkEl=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},click(){},appendChild(){},removeChild(){}});
global.$=()=>_mkEl();
global.document={getElementById:()=>_mkEl(),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>_mkEl(),body:{appendChild(){},removeChild(){},style:{}},addEventListener(){}};
let HOY='2026-10-21';
global.hoyLocalISO=()=>HOY;
global.fechaLocalISO=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
global.PLAN={factor:2,plazo:12};
global._concFiltrar=a=>a;
global.getCreditoSaldoPendiente=c=>c.saldoPrueba||0;
global.fmt=n=>'$'+Number(n||0).toFixed(2);
global.toast=()=>{};
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const cerca=(a,b)=>Math.abs(a-b)<0.005;
const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const PROT=fs.readFileSync(path.join(ROOT,'logic/contratos-protect.js'),'utf8').split('// ── Datos del documento')[0];
const L=fs.readFileSync(path.join(ROOT,'logic/reportes.js'),'utf8');
let excel=null;
global.__capturarExcel=(nombre, hojas)=>{ excel={nombre, filas:hojas[0].rows}; };
const API=eval('with(auto){'+PROT+'\n'+L+'\n; _xlsxDownload = __capturarExcel; _abrirVentanaImpresion = function(){}; ({_dfDatos,_dfRangoPreset,_renderDashFin,_protectFinanzas,_dfEsServicios,dfReporte}) }');

// Créditos: uno viejo (servicios), uno con Protect, y uno cancelado que no cuenta
const C498={id:'CRED-498',cli:'ANA',fecha:'2026-09-04',estado:'activo',precio:1500,ini:600,total:1800,cuotaQ:75,totalCuotas:24,plazo:12,saldoPrueba:900};
const C499={id:'CRED-499',cli:'LUIS',fecha:'2026-09-07',estado:'activo',precio:1500,ini:600,total:1800,cuotaQ:75,totalCuotas:24,plazo:12,saldoPrueba:1500};
const C500={id:'CRED-500',cli:'X',fecha:'2026-09-08',estado:'cancelado',precio:1000,ini:300,total:1500,cuotaQ:62.5,totalCuotas:24,plazo:12};
global.S={dfDesde:'',dfHasta:'',clientes:[],creds:[C498,C499,C500],pagos:[
  {id:'P1',cred:'CRED-498',fecha:'2026-09-19',monto:75,estado:'confirmado'},
  {id:'P2',cred:'CRED-499',fecha:'2026-09-22',monto:75,estado:'confirmado'},
  {id:'P3',cred:'CRED-499',fecha:'2026-09-07',monto:600,estado:'confirmado',esInicial:true}
]};

ok('CRED-498 es de otros servicios', API._dfEsServicios(C498)===true);
ok('CRED-499 ya es Pagasi Protect', API._dfEsServicios(C499)===false);
ok('los créditos de la 26 (M-###) nunca son de servicios', API._dfEsServicios({id:'M-012'})===false && API._dfEsServicios({id:'M-498'})===false);

const F=API._protectFinanzas(C499);
const d=API._dfDatos();
ok('el cancelado no cuenta', d.nOrig===2 && d.nServicios===1 && d.nProtect===1);
ok('principal (motos) = precio − inicial de los dos: 1.800', cerca(d.finTotal,1800));
ok('Protect solo = el Precio Protect del contrato del CRED-499', F.protect>0 && cerca(d.finProtect,F.protect));
ok('Protect + motos = motos + Protect', cerca(d.finMF,1800+F.protect));
ok('interés pactado = los Intereses Financieros del contrato (no el total − principal)', cerca(d.intReal,F.intereses) && !cerca(d.intReal,d.intTotal));
ok('otros servicios = lo que el CRED-498 paga por encima de la moto (1.800 − 900)', cerca(d.servPactado,900));
ok('ingresos totales = Protect + intereses + otros servicios', cerca(d.ingresosTot,F.protect+F.intereses+900));
ok('IVA = 16 % del Pagasi Protect', cerca(d.ivaProtect,Math.round(F.protect*0.16*100)/100));

// Cuotas: la inicial no entra; cada cuota se reparte en la proporción de su plan
ok('cuotas cobradas = 150 (sin la inicial)', cerca(d.cuotasTot,150));
ok('la cuota del CRED-498: su parte sobre el principal es otros servicios (75 × 900/1800)', cerca(d.cuotasServicios,37.5));
const resto=75*(1-900/1800), w=F.intereses+F.protect;
ok('la cuota del CRED-499: interés y Protect en la proporción del contrato', cerca(d.cuotasInteres,resto*F.intereses/w) && cerca(d.cuotasProtect,resto*F.protect/w));
ok('principal + interés + Protect + servicios = total cobrado', cerca(d.cuotasPrin+d.cuotasInteres+d.cuotasProtect+d.cuotasServicios,d.cuotasTot));
ok('la porción principal no cambió', cerca(d.cuotasPrin,75*900/1800*2));
ok('IVA del Protect cobrado = 16 %', cerca(d.ivaCobrado,d.cuotasProtect*0.16));
ok('la CxC pendiente también se reparte y cuadra', cerca(d.cxcPrin+d.cxcResto.interes+d.cxcResto.protect+d.cxcResto.servicios,d.cxcTotal));

// "Esta semana": de lunes a domingo, también cuando cruza de mes
let r=API._dfRangoPreset('semana');
ok('esta semana (miércoles 21-oct): lunes 19 al domingo 25', r.desde==='2026-10-19' && r.hasta==='2026-10-25');
HOY='2026-10-01'; r=API._dfRangoPreset('semana');
ok('esta semana (jueves 1-oct): lunes 28-sep al domingo 4-oct', r.desde==='2026-09-28' && r.hasta==='2026-10-04');
HOY='2026-10-25'; r=API._dfRangoPreset('semana');
ok('esta semana (domingo 25-oct): lunes 19 al domingo 25', r.desde==='2026-10-19' && r.hasta==='2026-10-25');
HOY='2026-10-21';

// Los nombres, como los pidió Adam
const html=API._renderDashFin();
['Total financiado principal (motos)','Total financiado principal (Pagasi Protect solo)','Total financiado principal (Pagasi Protect + motos)',
 'Interés pactado — monto real del contrato','Pagasi Protect pactado','Ingreso por otros servicios',
 'Ingresos totales — Pagasi Protect + intereses + otros servicios','IVA — 16% de Pagasi Protect',
 'Cuotas cobradas — total','Cuotas cobradas — porción solo interés','Cuotas cobradas — porción Pagasi Protect',
 'Cuotas cobradas — porción otros servicios','Esta semana'].forEach(t=>ok('el dashboard muestra "'+t+'"', html.indexOf(t)>=0));
ok('nada sale como NaN', html.indexOf('NaN')<0);
ok('en la 18 se nombra el corte del CRED-498', html.indexOf('CRED-498')>=0);

// En la 26 no hay créditos de servicios: no se menciona el CRED-498
global.S.creds=[Object.assign({},C499,{id:'M-001'})]; global.S.pagos=[];
const d26=API._dfDatos(), html26=API._renderDashFin();
ok('la 26: todo Protect, otros servicios en cero', d26.nProtect===1 && d26.nServicios===0 && d26.servPactado===0 && !d26.hayServicios);
ok('la 26: no se menciona el CRED-498', html26.indexOf('CRED-498')<0);

// El reporte en Excel trae las partes de cada crédito
global.S.creds=[C498,C499]; global.S.pagos=[];
API.dfReporte('ingresos','excel');
const filas=(excel&&excel.filas)||[];
const iHdr=filas.findIndex(f=>f && f[0]==='Crédito');
const hdr=filas[iHdr]||[];
ok('el Excel de ingresos tiene Contrato, Pagasi Protect, Interés, Otros servicios e IVA', ['Contrato','Principal (moto)','Pagasi Protect','Moto + Protect','Interés','Otros servicios','IVA 16% Protect'].every(h=>hdr.indexOf(h)>=0));
const f498=filas.find(f=>f && f[0]==='CRED-498'), f499=filas.find(f=>f && f[0]==='CRED-499');
ok('CRED-498 sale como Servicios y CRED-499 como Pagasi Protect', f498 && f498[4]==='Servicios' && f499 && f499[4]==='Pagasi Protect');
ok('el CRED-498 no tiene Protect ni interés', f498 && f498[hdr.indexOf('Pagasi Protect')]===0 && f498[hdr.indexOf('Interés')]===0 && f498[hdr.indexOf('Otros servicios')]===900);

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
