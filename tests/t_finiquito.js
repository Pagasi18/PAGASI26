// La constancia de cancelacion total (el "finiquito").
// 22-sep-2026, Adam viendola en pantalla: "esta carta de finiquito no tiene sinergia
// de pagasi ni logo ni nada". Ademas decia cosas que ya no son verdad: ARRENDADOR,
// canones y una opcion a compra por US$ 1 — el contrato viejo. El que se firma hoy es
// una venta a credito con reserva de dominio: lo que se entrega al final es la
// liberacion de esa reserva.
// Se prueba: la identidad (logo, azul, membrete), que cada credito reciba el texto de
// SU contrato, y que los datos salgan de la compania que firma y no de una constante.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global;
const _els={};
const _mk=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},appendChild(){},querySelector(){return _mk();}});
global.$=id=>{ if(!_els[id]) _els[id]=_mk(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:_mk,body:{appendChild(){},removeChild(){},style:{}}};
global.S={creds:[],clientes:[],motos:[],pagos:[],gps:[]};
const _toasts=[];
global.toast=(m)=>{ _toasts.push(String(m)); };
global.nav=()=>{}; global.setMicon=()=>{}; global.closeM=()=>{};
global.getEmpresa=()=>(global._empresa||{});
global.getCreditoPagosConfirmados=c=>Number(c._pagado||0);
global.hoyLocalISO=()=>'2026-09-22';
global._concGetById=()=>({nombre:'EMPIRE Bello Monte'});
global._pintarDoc=()=>{};
global._PAGASI_LOGO_BLUE='data:image/png;base64,LOGOAZULDEPRUEBA';
global.fmt=n=>'$ '+(parseFloat(n)||0).toFixed(2);
global.FIREBASE_CONFIG={projectId:'pagasi-v2'};
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };

const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const SRC=['logic/contratos.js','logic/contratos-dra.js','logic/contratos-protect.js','logic/reportes.js']
  .map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n');
const API=eval('with(auto){'+SRC+'\n; ({_htmlFiniquito,_finiquitoDatos,abrirFiniquito,_contratoVersionDe}) }');

// ── Un credito pagado completo, con el contrato de hoy ───────────────────────
global._empresa={ nombre:'PAGASI 26, C.A.', rif:'J-50856275-5', ciudad:'Caracas',
  direccion:'Av. Orinoco, Las Mercedes, Caracas', tel:'0212-0000000', email:'info@pagasi.io',
  bancoUsd:'Banesco', cuentaUsd:'0134-0000-00-0000000000', billetera:'Binance (USDT)',
  representante:'ADAM PRUEBA', repCI:'V-11223344' };
S.clientes=[{id:'CLI-1',nombre:'JOSE PRUEBA',cedula:'12345678'}];
S.motos=[{id:14,marca:'EMPIRE',modelo:'MATRIX 150',anio:2026,color:'Negro',placa:'AL9T94J',serialChasis:'8Z53ADCK9TM006007'}];
S.creds=[{id:'CRED-900',cli:'JOSE PRUEBA',clienteId:'CLI-1',motoId:14,fecha:'2026-09-07',
  ini:813.32,total:1716.24,cuotaQ:71.51,totalCuotas:24,estado:'completado',
  fechaCompletado:'2026-09-22',contratoFirmado:true,fechaContratoFirmado:'2026-09-07',_pagado:1716.24}];

const h=API._htmlFiniquito('CRED-900');
ok('genera el documento',                 typeof h==='string' && h.length>2000);
ok('lleva el logo de Pagasi',             h.indexOf('LOGOAZULDEPRUEBA')>-1 && h.indexOf('<img src=')>-1);
ok('va en el azul del sistema, no morado', h.indexOf('#2563EB')>-1 && h.indexOf('#5E3BEE')===-1);
ok('con la tipografia del sistema',        h.indexOf('Nunito Sans')>-1);
ok('conserva el id que usa el boton de imprimir', h.indexOf('id="finiquito-doc"')>-1);

// ── La compania que firma es la del sistema, no una constante ───────────────
ok('sale el nombre de la compania',        h.indexOf('PAGASI 26, C.A.')>-1);
ok('...y su RIF',                          h.indexOf('J-50856275-5')>-1);
ok('...y su domicilio',                    h.indexOf('Las Mercedes')>-1);
ok('...y no el nombre de la otra',         h.indexOf('PAGASI 18')===-1 && h.indexOf('J-50829589-7')===-1);
ok('el pie lleva el membrete de la compania', h.indexOf('RIF J-50856275-5')>-1 && h.indexOf('info@pagasi.io')>-1);
ok('el representante legal sale de la ficha', h.indexOf('ADAM PRUEBA')>-1 && h.indexOf('V-11223344')>-1);

// ── El texto del contrato de HOY: venta a credito, no arrendamiento ─────────
ok('titulo: cancelacion total y finiquito', h.indexOf('CONSTANCIA DE CANCELACIÓN TOTAL Y FINIQUITO')>-1);
ok('cita la clausula 5.1 del contrato de hoy', h.indexOf('Cláusula 5.1')>-1);
ok('habla de Comprador, no de ARRENDATARIO', h.indexOf('Comprador')>-1 && h.indexOf('ARRENDATARIO')===-1);
ok('no dice ARRENDADOR',                   h.indexOf('ARRENDADOR')===-1);
ok('no habla de canones',                  !/[Cc]ánones/.test(h));
ok('no inventa una opcion a compra por US$ 1', h.indexOf('US$ 1,00')===-1 && h.indexOf('opción a compra')===-1);
ok('dice que se libera la reserva de dominio', h.indexOf('libera la reserva de dominio')>-1);
ok('y que los GPS pasan al comprador',     h.indexOf('pasan en propiedad al Comprador')>-1);
ok('menciona el Monto Total Adeudado',     h.indexOf('Monto Total Adeudado')>-1);

// ── Los datos del credito y de la moto ──────────────────────────────────────
ok('el nombre y la cedula del cliente',    h.indexOf('JOSE PRUEBA')>-1 && h.indexOf('V-12345678')>-1);
ok('la V- no se repite',                   h.indexOf('V-V-')===-1);
ok('la moto con marca y modelo',           h.indexOf('EMPIRE MATRIX 150')>-1);
ok('el serial de chasis',                  h.indexOf('8Z53ADCK9TM006007')>-1);
ok('la inicial pagada',                    h.indexOf('US$ 813.32')>-1);
ok('el total abonado',                     h.indexOf('US$ 1716.24')>-1);
ok('las 24 cuotas',                        h.indexOf('24 de 24')>-1);
ok('la fecha de cancelacion en letras',    h.indexOf('septiembre de 2026')>-1);
ok('el numero del documento',              h.indexOf('FIN-CRED-900')>-1);
ok('sin "undefined" ni "NaN"',             !/undefined|NaN/.test(h));

// ── Un credito viejo se reimprime con el papel que firmo ────────────────────
S.creds[0].contratoVersion='dra';
const viejo=API._htmlFiniquito('CRED-900');
ok('contrato viejo: sigue siendo el de arrendamiento', viejo.indexOf('ARRENDATARIO')>-1 && viejo.indexOf('cánones')>-1);
ok('contrato viejo: con su opcion a compra',           viejo.indexOf('US$ 1,00')>-1);
ok('contrato viejo: pero YA con el logo y el azul',    viejo.indexOf('LOGOAZULDEPRUEBA')>-1 && viejo.indexOf('#5E3BEE')===-1);
ok('contrato viejo: y con la compania del sistema',    viejo.indexOf('PAGASI 26, C.A.')>-1 && viejo.indexOf('PAGASI 18')===-1);
delete S.creds[0].contratoVersion;

// ── Lo que falta sale con la raya, nunca con el dato de otra empresa ────────
const _antes=global._empresa;
global._empresa={ nombre:'PAGASI 26, C.A.', rif:'J-50856275-5' };   // ficha a medias
const medias=API._htmlFiniquito('CRED-900');
ok('ficha a medias: el domicilio sale con raya para llenar a mano',
  medias.indexOf('border-bottom:1px solid #94a3b8')>-1);
ok('...y NUNCA con el domicilio de PAGASI 18', medias.indexOf('Sebucán')===-1);
ok('...ni con su telefono ni su correo',       medias.indexOf('424-2177798')===-1);
ok('...y el papel sale igual, no revienta',    medias.length>2000);

// Ficha que no se pudo leer, en una base que no es la de 18
global._empresa=undefined; global.FIREBASE_CONFIG={projectId:'pagasi26-65ced'};
const ciego=API._htmlFiniquito('CRED-900');
ok('sin ficha, en otra base: ni una letra de PAGASI 18',
  ciego.indexOf('PAGASI 18')===-1 && ciego.indexOf('J-50829589-7')===-1 && ciego.indexOf('Sebucán')===-1);
_toasts.length=0; API.abrirFiniquito('CRED-900');
ok('...y al abrirlo avisa que no se pudo leer la ficha',
  _toasts.some(m=>/NO SE PUDO LEER LA FICHA/.test(m)));
global.FIREBASE_CONFIG={projectId:'pagasi-v2'}; global._empresa=_antes;

// ── Lo que escribe un empleado se imprime escapado ──────────────────────────
S.clientes[0].nombre='JOSE <script>PRUEBA'; S.creds[0].cli='JOSE <script>PRUEBA';
const esc=API._htmlFiniquito('CRED-900');
ok('un < en el nombre sale escapado', esc.indexOf('&lt;script&gt;')>-1 && esc.indexOf('<script>')===-1);
S.clientes[0].nombre='JOSE PRUEBA'; S.creds[0].cli='JOSE PRUEBA';

// ── Un credito que no existe no rompe nada ─────────────────────────────────
ok('credito inexistente: devuelve vacio, sin reventar', API._htmlFiniquito('CRED-NO-EXISTE')==='');
ok('...y abrirlo tampoco revienta', (function(){ try{ API.abrirFiniquito('CRED-NO-EXISTE'); return true; }catch(e){ return false; } })());

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
