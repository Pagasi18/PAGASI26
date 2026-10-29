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
const API=eval('with(auto){'+SRC+'\n; ({_htmlFiniquito,_finiquitoDatos,abrirFiniquito,_contratoVersionDe,_draFirma,_firmaRepSrc,_firmaRepImg}) }');

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
// 29-oct-2026, Adam, con la foto de la carta que la oficina escribia a mano para el INTT: "necesito que tenga
// esta info pero que salga mas bonito"; y "los contratos no estan saliendo con la firma".
ok('genera el documento',                 typeof h==='string' && h.length>2000);
ok('lleva el logo de Pagasi',             h.indexOf('LOGOAZULDEPRUEBA')>-1 && h.indexOf('<img src=')>-1);
ok('va en el azul del sistema, no morado', h.indexOf('#2563EB')>-1 && h.indexOf('#5E3BEE')===-1);
ok('con la tipografia del sistema',        h.indexOf('Nunito Sans')>-1);
ok('conserva el id que usa el boton de imprimir', h.indexOf('id="finiquito-doc"')>-1);
ok('el numero del documento',              h.indexOf('FIN-CRED-900')>-1);

// ── Es la carta para el INTT ─────────────────────────────────────────────────
ok('va dirigida al INTT, como la que escribian a mano', h.indexOf('INSTITUTO NACIONAL DE TRANSPORTE TERRESTRE (INTT)')>-1 && h.indexOf('GERENCIA DE REGISTRO DE VEHÍCULOS')>-1 && h.indexOf('SU DESPACHO.-')>-1);
ok('asunto: carta de finiquito y autorizacion de liberacion de reserva de dominio', h.indexOf('CARTA DE FINIQUITO Y AUTORIZACIÓN DE LIBERACIÓN DE RESERVA DE DOMINIO')>-1);
ok('saldo CERO DOLARES (USD 0,00)',        h.indexOf('CERO DÓLARES (USD 0,00)')>-1);
ok('otorga finiquito de cuenta y autoriza la liberacion', h.indexOf('FINIQUITO DE CUENTA')>-1 && h.indexOf('LIBERACIÓN DE RESERVA DE DOMINIO')>-1 && h.indexOf('libre de gravamen')>-1 && h.indexOf('libera la reserva de dominio')>-1);
ok('cierra como la carta: a solicitud de la parte interesada, en la ciudad de la compania', h.indexOf('Constancia que se expide a solicitud de la parte interesada, en Caracas, a la fecha de su presentación.')>-1);
ok('la fecha de hoy con la ciudad',         h.indexOf('Caracas, 22 de septiembre de 2026')>-1);

// ── Quien firma: el representante legal de la compania, con su cedula ────────
ok('quien suscribe es el representante legal, con su cedula y su cargo', /Quien suscribe, <strong>ADAM PRUEBA<\/strong>, titular de la cédula de identidad N° <strong>V-11223344<\/strong>, actuando en su carácter de <strong>Representante Legal<\/strong>/.test(h));
ok('la compania que firma, con su RIF y su domicilio', h.indexOf('PAGASI 26, C.A.')>-1 && h.indexOf('RIF J-50856275-5')>-1 && h.indexOf('Las Mercedes')>-1);
ok('...y no la otra',                      h.indexOf('PAGASI 18')===-1 && h.indexOf('J-50829589-7')===-1);
ok('el bloque de firma trae nombre, cargo y cedula del representante', /<strong>ADAM PRUEBA<\/strong><br>Representante Legal<br>C\.I\. V-11223344/.test(h));
ok('el sello: logo, compania y RIF',        /border:1.5px dashed #2563EB[\s\S]*?LOGOAZULDEPRUEBA[\s\S]*?PAGASI 26, C\.A\.[\s\S]*?RIF J-50856275-5/.test(h));
ok('sin firma cargada queda el hueco para firmar a mano', h.indexOf('height:62px')===-1 && h.indexOf('<div style="height:46px"></div>')>-1);

// ── El cliente y el vehiculo ─────────────────────────────────────────────────
ok('el nombre y la cedula del cliente',    h.indexOf('JOSE PRUEBA')>-1 && h.indexOf('V-12345678')>-1);
ok('la V- no se repite',                   h.indexOf('V-V-')===-1);
ok('el credito y la fecha en que se celebro', h.indexOf('crédito <strong>N° CRED-900</strong>, celebrado el 07 de septiembre de 2026')>-1);
ok('marca y modelo, año, color, clase, placa y serial', h.indexOf('EMPIRE MATRIX 150')>-1 && h.indexOf('>2026<')>-1 && h.indexOf('Negro')>-1 && h.indexOf('Motocicleta')>-1 && h.indexOf('AL9T94J')>-1 && h.indexOf('8Z53ADCK9TM006007')>-1);
ok('la reserva de dominio a favor de la compania', h.indexOf('Reserva de dominio a favor de:')>-1 && /Reserva de dominio a favor de:<\/td><td[^>]*>PAGASI 26, C\.A\. \(RIF J-50856275-5\)/.test(h));
ok('sin serial de motor no sale la fila (no un renglon vacio)', h.indexOf('Serial de motor')===-1);
ok('el resumen: inicial, cuotas, total pagado y fecha de cancelacion', h.indexOf('US$ 813.32')>-1 && h.indexOf('24 de 24')>-1 && h.indexOf('US$ 1716.24')>-1 && h.indexOf('22 de septiembre de 2026')>-1);
ok('ya no habla de arrendamiento ni de opcion a compra', h.indexOf('ARRENDATARIO')===-1 && h.indexOf('ARRENDADOR')===-1 && !/[Cc]ánones/.test(h) && h.indexOf('US$ 1,00')===-1 && h.indexOf('opción a compra')===-1);

// ── La misma carta para cualquier contrato (todos son ventas con reserva de dominio) ──
S.creds[0].contratoVersion='dra'; const dra=API._htmlFiniquito('CRED-900');
S.creds[0].contratoVersion='contrato'; const viejo=API._htmlFiniquito('CRED-900');
delete S.creds[0].contratoVersion;
ok('contrato DRA: la misma carta para el INTT', dra.indexOf('LIBERACIÓN DE RESERVA DE DOMINIO')>-1 && dra.indexOf('ARRENDATARIO')===-1 && dra.indexOf('US$ 1,00')===-1);
ok('contrato viejo: tambien (la oficina la escribia a mano para esos)', viejo.indexOf('LIBERACIÓN DE RESERVA DE DOMINIO')>-1 && viejo.indexOf('cánones')===-1);
S.motos[0].serialMotor='MOTOR-001'; const conMotor=API._htmlFiniquito('CRED-900'); delete S.motos[0].serialMotor;
ok('con serial de motor, sale su fila', conMotor.indexOf('Serial de motor:')>-1 && conMotor.indexOf('MOTOR-001')>-1);

// ── La firma del representante: una imagen en la ficha de la compania ───────
global._empresa.firmaRep='data:image/png;base64,FIRMAPRUEBA';
const conFirma=API._htmlFiniquito('CRED-900');
ok('con la firma cargada, se posa sobre la raya del representante', /<img src="data:image\/png;base64,FIRMAPRUEBA" alt="" style="height:62px/.test(conFirma) && conFirma.indexOf('<div style="height:46px"></div>')===-1);
ok('en los contratos de hoy (DRA y Protect) la firma va donde firma Pagasi', /<img src="data:image\/png;base64,FIRMAPRUEBA"/.test(API._draFirma('Por Pagasi','PAGASI 26, C.A.','RIF J-50856275-5',2)));
ok('...y nunca en la raya del comprador ni del fiador', API._draFirma('Por el Comprador','JOSE PRUEBA','V-12345678',2).indexOf('FIRMAPRUEBA')===-1 && API._draFirma('Por el Fiador','X','V-1',2).indexOf('FIRMAPRUEBA')===-1);
ok('el hueco de la firma mide lo mismo con o sin firma (40px)', API._draFirma('Por Pagasi','P','R',2).indexOf('height:40px')>-1 && API._draFirma('Por el Comprador','P','R',2).indexOf('height:40px')>-1);
global._empresa.firmaRep='http://otro-sitio/firma.png';
ok('solo se acepta una imagen embebida (data:image), nada que apunte a otro sitio', API._firmaRepSrc()==='' && API._firmaRepImg()==='' && API._htmlFiniquito('CRED-900').indexOf('otro-sitio')===-1);
global._empresa.firmaRep='data:image/png;base64,AAA"><script>alert(1)</script>';
ok('...ni nada que no sea base64 limpio', API._firmaRepSrc()==='');
global._empresa.firmaRep='';
ok('la firma real ya no esta pegada en el codigo (era publica)', fs.readFileSync(path.join(ROOT,'logic/contratos.js'),'utf8').indexOf('base64,iVBOR')===-1);

// ── Lo que falta sale con N/A, nunca con el dato de otra empresa ──────────────
const _antes=global._empresa;
global._empresa={ nombre:'PAGASI 26, C.A.', rif:'J-50856275-5' };   // ficha a medias
const medias=API._htmlFiniquito('CRED-900');
ok('ficha a medias: el dato que falta dice N/A, no queda en blanco', medias.indexOf('domicilio en <strong>N/A</strong>')>-1 && medias.indexOf('Quien suscribe, <strong>N/A</strong>')>-1);
ok('...y no queda ninguna raya vacia en el papel', medias.indexOf('border-bottom:1px solid #94a3b8')===-1);
ok('...y NUNCA con el domicilio de PAGASI 18', medias.indexOf('Sebucán')===-1);
ok('...ni con su telefono ni su correo',       medias.indexOf('424-2177798')===-1);
ok('...y el papel sale igual, no revienta',    medias.length>2000);

// Ficha que no se pudo leer, en una base que no es la de 18
global._empresa=undefined; global.FIREBASE_CONFIG={projectId:'pagasi26-65ced'};
const ciego=API._htmlFiniquito('CRED-900');
ok('sin ficha, en otra base: ni una letra de PAGASI 18', ciego.indexOf('PAGASI 18')===-1 && ciego.indexOf('J-50829589-7')===-1 && ciego.indexOf('Sebucán')===-1);
_toasts.length=0; API.abrirFiniquito('CRED-900');
ok('...y al abrirlo avisa que no se pudo leer la ficha', _toasts.some(m=>/NO SE PUDO LEER LA FICHA/.test(m)));
global.FIREBASE_CONFIG={projectId:'pagasi-v2'}; global._empresa=_antes;

// ── Lo que escribe un empleado se imprime escapado ──────────────────────────
S.clientes[0].nombre='JOSE <script>PRUEBA'; S.creds[0].cli='JOSE <script>PRUEBA';
const esc=API._htmlFiniquito('CRED-900');
ok('un < en el nombre sale escapado', esc.indexOf('&lt;script&gt;')>-1 && esc.indexOf('<script>')===-1);

console.log(`\n${pass} OK · ${fail} fallas`);
if(fail) process.exitCode=1;
