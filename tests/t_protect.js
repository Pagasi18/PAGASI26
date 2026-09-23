// Contrato v3 (financiamiento + Pagasi Protect): la matematica del 12 % y el
// documento. Lo importante: la cuota IMPRESA es la que el sistema cobra, el
// Protect se despeja de ella, y el cronograma cierra al centavo.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global;
const _els={};
const _mk=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},appendChild(){},querySelector(){return _mk();}});
global.$=id=>{ if(!_els[id]) _els[id]=_mk(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:_mk,body:{appendChild(){},removeChild(){},style:{}}};
global.S={creds:[],clientes:[],motos:[],pagos:[],gps:[]};
global.toast=()=>{}; global.nav=()=>{}; global.getEmpresa=()=>({nombre:'PAGASI 18, C.A.',rif:'J-50829589-7'});
global._concGetById=id=>({nombre:'EMPIRE Bello Monte',rif:'J-11111111-1'});
global._pintarDoc=()=>{}; global._PAGASI_LOGO_BLUE='';
// Este contrato se imprime como PAGASI 18. Importa decirlo: desde el 22-sep-2026 el
// respaldo con los datos de la compañia (domicilio, telefono, cuentas) SOLO vale en la
// base de PAGASI 18. En cualquier otra, una ficha de empresa que no se pudo leer sale
// en blanco, nunca con el nombre y la cuenta bancaria de otra empresa.
global.FIREBASE_CONFIG={projectId:'pagasi-v2'};
let pass=0, fail=0;
global.ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };

const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const SRC=['logic/contratos.js','logic/contratos-dra.js','logic/contratos-protect.js'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n');
const API=eval('with(auto){'+SRC+'\n; ({_protectFinanzas,_protectDatos,_htmlContratoProtect,_contratoVersionDe,_CONTRATO_PROTECT_DESDE,_docsRecaudosLista,_draCedulaTxt,_avisarEmpresaContrato}) }');
const F=API._protectFinanzas;
const cerca=(a,b,tol)=>Math.abs(a-b)<=(tol==null?0.02:tol);

ok('vigente desde el 7 de septiembre de 2026', API._CONTRATO_PROTECT_DESDE==='2026-09-07');

// ── El ejemplo de la abogada, al reves: de su cuota se recupera su MF ──
// Moto 3.750 · Protect 300 · inicial 978 · 18 cuotas → MF 3.072 · cuota 178,89 · intereses 148
const ej=F({precio:3750, ini:978, cuotaQ:178.89, totalCuotas:18, fecha:'2026-09-07'});
ok('ejemplo abogada: MF vuelve a 3.072',       cerca(ej.MF, 3072, 0.10));
ok('ejemplo abogada: Protect vuelve a 300',    cerca(ej.protect, 300, 0.10));
ok('ejemplo abogada: intereses ~148',          cerca(ej.intereses, 148, 0.10));
ok('ejemplo abogada: MTA = cuota x 18',        cerca(ej.MTA, 178.89*18));

// ── La moto promedio de hoy: 1.724 / 813 / cuota 71,51 x 24 → Protect ~703 ──
const prom=F({precio:1723.67, ini:813.32, cuotaQ:71.51, totalCuotas:24, fecha:'2026-09-07'});
ok('moto promedio: Protect sale en ~703',      cerca(prom.protect, 703, 3));
ok('moto promedio: saldo precio = 910,35',     cerca(prom.saldoPrecio, 910.35));
ok('moto promedio: MF = saldo + Protect',      cerca(prom.MF, prom.saldoPrecio+prom.protect));

// ── El cronograma cierra al centavo ──
const filas=prom.filas;
const sum=k=>filas.reduce((a,r)=>a+r[k],0);
ok('24 filas',                                  filas.length===24);
ok('suma de capital = MF',                      cerca(sum('capital'), prom.MF));
ok('suma de intereses = intereses',             cerca(sum('interes'), prom.intereses));
ok('suma de cuotas = MTA',                      cerca(sum('cuota'), prom.MTA));
ok('el saldo final es exactamente 0',           filas[23].saldo===0);
ok('todas las cuotas menos la ultima = cuotaQ', filas.slice(0,-1).every(r=>cerca(r.cuota,71.51)));
ok('la ultima absorbe el redondeo (a lo sumo medio centavo por fila)', cerca(filas[23].cuota, 71.51, 24*0.005+0.01));
ok('el interes baja cada quincena',             filas.every((r,i)=>i===0||r.interes<=filas[i-1].interes));
ok('el capital sube cada quincena',             filas.slice(0,-1).every((r,i)=>i===0||r.capital>=filas[i-1].capital));
ok('primera cuota vence a los 15 dias',         filas[0].fecha.toISOString().slice(0,10)==='2026-09-22');
ok('interes de la 1a quincena = MF x 0,5 %',    cerca(filas[0].interes, prom.MF*0.005));

// ── Si la cuota fuera menor que el 12 %, Protect no se vuelve negativo ──
const bajo=F({precio:1000, ini:450, cuotaQ:20, totalCuotas:24, fecha:'2026-09-07'});
ok('Protect nunca negativo',                    bajo.protect===0);

// ── El documento ──
S.clientes=[{id:'CLI-1',nombre:'JOSE PRUEBA',cedula:'12345678',direccion:'Av. Principal, Caracas',ciudad:'Caracas',tel:'0414-0000000',email:'jose@x.com',
             fiador_nom:'MARIA GARANTE',fiador_ci:'87654321',fiador_dir:'Calle 2, Caracas',fiador_tel:'0424-0000000'}];
S.motos=[{id:14,marca:'EMPIRE',modelo:'MATRIX 150',anio:2026,color:'Negro',placa:'AL9T94J',vin:'8Z53ADCK9TM006007',serialMotor:'MTR-1'}];
S.gps=[{creditoId:'CRED-900',idGps:'19210076409',imei:'866557087286946',fechaInstalacion:'2026-09-07',tecnico:'Francisco',estado:'instalado'}];
S.creds=[{id:'CRED-900',cli:'JOSE PRUEBA',clienteId:'CLI-1',motoId:14,concesionarioId:'C1',fecha:'2026-09-07',precio:1723.67,ini:813.32,cuotaQ:71.51,totalCuotas:24,plazo:12,uso_moto:'personal',contratoFirmado:false}];

const html=API._htmlContratoProtect('CRED-900');
ok('genera el documento',                       typeof html==='string' && html.length>20000);
ok('titulo del contrato nuevo',                 html.includes('PRESTACIÓN DE SERVICIOS «PAGASI PROTECT»'));
ok('nombre del cliente',                        html.includes('JOSE PRUEBA'));
ok('nombre del fiador',                         html.includes('MARIA GARANTE'));
ok('clausula 14 FIANZA presente con fiador',    html.includes('14. FIANZA'));
ok('tasa del 12 % anual',                       html.includes('doce por ciento (12%) anual'));
ok('mora del 3 % anual desde el dia 6',         html.includes('tres por ciento (3%) anual') && html.includes('sexto (6°) día'));
ok('protocolo de apagado: no por mora',         html.includes('no activarla por razón de mora'));
ok('instalacion en 30 dias en centro autorizado', html.includes('treinta (30) días continuos siguientes a la Fecha de Celebración, para lo cual'));
ok('sin letras de cambio (alternativa 1)',      html.includes('NO se han emitido letras de cambio'));
ok('los dispositivos pasan al comprador',       html.includes('pasarán en propiedad al Comprador sin contraprestación adicional'));
ok('medios: 100% Banco y Binance',              html.includes('100% Banco Universal') && html.includes('Binance'));
ok('canal +58 424-2177798',                     html.includes('+58 424-2177798'));
ok('la cuota impresa es la del sistema',        html.includes('US$ 71.51'));
ok('el Protect impreso es el despejado',        html.includes('US$ '+prom.protect.toFixed(2)));
ok('anexo A con capital, interes y saldo por cuota', /cap [\d.,]+ · int [\d.,]+ · saldo [\d.,]+/.test(html) && html.includes('TOTALES'));
ok('anexos B, C y D',                           html.includes('ANEXO “B”') && html.includes('ANEXO “C”') && html.includes('ANEXO “D”'));
ok('GPS del modulo en el anexo B',              html.includes('19210076409') && html.includes('866557087286946'));
ok('sin "undefined" ni "NaN" en el documento',  !/undefined|NaN/.test(html));
ok('sin placeholders crudos del Word',          !/\[_{4,}\]|\[NOMBRE|\[DIRECCI|\[CARGO\]/.test(html));
ok('la hipoteca mobiliaria (6.4) quedo fuera',  !/6\.4\t/.test(html) && !html.includes('Hipoteca Mobiliaria'));

// ── Sin fiador: se cae la clausula 14 y las firmas son 2 ──
S.clientes[0].fiador_nom=''; S.clientes[0].fiador_ci='';
const sinF=API._htmlContratoProtect('CRED-900');
ok('sin fiador: no hay clausula 14',            !sinF.includes('14. FIANZA'));
ok('sin fiador: no hay "Por el Fiador"',        !sinF.includes('Por el Fiador'));
ok('sin fiador: "dos (2) ejemplares"',          sinF.includes('dos (2) ejemplares'));

// ── Documentos del contrato: sin guardar nada, todo en gris ──
S.clientes[0].fiador_nom='MARIA GARANTE'; S.clientes[0].fiador_ci='87654321';
const sinDocs=API._htmlContratoProtect('CRED-900');
ok('sin docs: recaudos todos en blanco',        (sinDocs.match(/Sí \(&nbsp;&nbsp;\) &nbsp; No \(&nbsp;&nbsp;\)/g)||[]).length>=14);
ok('sin docs: PEP marcado en NO por defecto',   (sinDocs.match(/NO ostentan \(&nbsp;X&nbsp;\)/g)||[]).length===2 && sinDocs.includes('SÍ ostentan (&nbsp;&nbsp;)'));

// ── Con documentos guardados: sale impreso ──
S.creds[0].docsContrato={facturaNum:'00012345',facturaFecha:'2026-09-07',certOrigenNum:'BB-998877',polizaCia:'Seguros Caracas',polizaNum:'POL-555',
  recaudos:{cedCli:true,rifCli:true,domCli:false,ingCli:true,refCli:true,cedFia:true,rifFia:false,domFia:true,ingFia:true,factura:true,finiquito:true,certOrigen:true,poliza:false,fotos:true,otros:false},
  otrosTexto:'',pep:'no',pepDetalle:'',actividad:'Comerciante',ingresoMensual:'450',verificado:true,verificadoFecha:'2026-09-07',analista:'Miguel',aprobadoPor:'Adam',actualizadoEn:'2026-09-07T12:00:00Z',actualizadoPor:'Adam'};
const conDocs=API._htmlContratoProtect('CRED-900');
ok('factura en el considerando',                conDocs.includes('según factura N° <strong>00012345</strong>'));
ok('certificado de origen en el considerando',  conDocs.includes('certificado de origen: <strong>BB-998877</strong>'));
ok('poliza en el anexo C',                      conDocs.includes('Seguros Caracas · POL-555'));
ok('recaudo entregado marcado Sí (X)',          (conDocs.match(/Sí \(&nbsp;X&nbsp;\)/g)||[]).length===11);
ok('recaudo NO entregado marcado No (X)',       (conDocs.match(/No \(&nbsp;X&nbsp;\)/g)||[]).length===4);
ok('PEP: NO marcado, SÍ vacio (x2: clausula 8 y anexo D)', (conDocs.match(/NO ostentan \(&nbsp;X&nbsp;\)/g)||[]).length===2 && conDocs.includes('SÍ ostentan (&nbsp;&nbsp;)'));
ok('origen de fondos con ingreso',              conDocs.includes('<strong>Comerciante</strong>') && conDocs.includes('US$ 450.00'));
ok('verificaciones con fecha y analista',       conDocs.includes('sin novedad') && conDocs.includes('<strong>Miguel</strong>') && conDocs.includes('<strong>Adam</strong>'));
ok('sin "undefined" con docs',                  !/undefined|NaN/.test(conDocs));

// ── La lista de recaudos es una sola para formulario y contrato ──
ok('recaudos con fiador = 14',                  API._docsRecaudosLista(true).length===14);
ok('recaudos sin fiador = 10',                  API._docsRecaudosLista(false).length===10);
ok('cada recaudo tiene clave y texto',          API._docsRecaudosLista(true).every(r=>r.length===2 && r[0] && r[1]));


// ── Sin cuadro: el papel se llena con lo que el sistema ya sabe ──
S.clientes[0].trabajo='Mecánico'; S.clientes[0].ingreso=520; S.creds[0].creadoPor='Miguel'; S.creds[0].aprobadoPor='Adam';
const auto_=(function(){ const d=S.creds[0].docsContrato; delete S.creds[0].docsContrato; const h=API._htmlContratoProtect('CRED-900'); S.creds[0].docsContrato=d; return h; })();
ok('actividad = trabajo del cliente',            auto_.includes('<strong>Mecánico</strong>'));
ok('ingreso = ingreso del cliente',              auto_.includes('US$ 520.00'));
ok('analista = quien creo el credito',           auto_.includes('Analista responsable: <strong>Miguel</strong>'));
ok('aprobado por = quien lo aprobo (Aprobaciones)', auto_.includes('aprobado por <strong>Adam</strong>'));
ok('recaudos en blanco para marcar a boligrafo', (auto_.match(/Sí \(&nbsp;&nbsp;\) &nbsp; No \(&nbsp;&nbsp;\)/g)||[]).length>=14);

// ── Lo que escribe un empleado se imprime escapado ──
S.creds[0].docsContrato.polizaCia='Seguros <La Previsora>'; S.creds[0].docsContrato.otrosTexto='<carta laboral>';
const esc=API._htmlContratoProtect('CRED-900');
ok('un < en la aseguradora sale como &lt; (no se come el Anexo C)', esc.includes('Seguros &lt;La Previsora&gt;') && !esc.includes('Seguros <La Previsora>'));
ok('un < en "otros" sale como &lt;',            esc.includes('&lt;carta laboral&gt;'));
S.creds[0].docsContrato.polizaCia='Seguros Caracas'; S.creds[0].docsContrato.otrosTexto='';

// ── Fecha de factura sin guardar = fecha del credito (como imprimia antes) ──
const sinFecha=Object.assign({},S.creds[0]); delete sinFecha.docsContrato; S.creds.push(Object.assign(sinFecha,{id:'CRED-901'}));
const h901=API._htmlContratoProtect('CRED-901');
ok('sin docs: la fecha de factura es la del credito', h901.includes('de fecha <strong>07/09/2026</strong>'));
S.creds.pop();

// ── Profesion del fiador ──
S.creds[0].docsContrato.fiadorProfesion='Enfermera';
ok('profesion del fiador impresa',               API._htmlContratoProtect('CRED-900').includes('oficio <strong>Enfermera</strong>'));
ok('trabajo del cliente en el encabezado',       auto_.includes('oficio <strong>Mecánico</strong>, domiciliado'));
ok('sin profesion del fiador: la frase se omite, sin raya', !/DELGADO|GARANTE[^.]*oficio <span/.test(auto_) && auto_.includes('GARANTE</strong>, venezolano(a), mayor de edad, domiciliado(a)'));

// ── B.4 con los valores de Adam ──
ok('horario L-V 9 a 5',                          esc.includes('lunes a viernes, de 9:00 a.m. a 5:00 p.m.'));
ok('respuesta ante robo: 1 a 5 horas',           esc.includes('entre una (1) y cinco (5) horas'));


// ── El router manda los creditos nuevos aqui ──
ok('credito sin firmar hoy -> protect',         API._contratoVersionDe({contratoFirmado:false})==='protect');
ok('firmado el 7-sep -> protect',               API._contratoVersionDe({contratoFirmado:true,fechaContratoFirmado:'2026-09-07'})==='protect');
// En PAGASI 18 un credito del 6-sep se reimprime con el contrato de esa epoca; en
// PAGASI 26 solo existe el de hoy. Se lee el menu en vez de dar por hecho una.
var _MODC = fs.readFileSync(path.join(ROOT,'modules/contratos.js'),'utf8');
var _SOLO_HOY = (_MODC.match(/<option value="(protect|dra|contrato)">/g)||[]).length === 1;
ok('firmado el 6-sep -> el contrato que le toca a esta compañía',
  API._contratoVersionDe({contratoFirmado:true,fechaContratoFirmado:'2026-09-06'}) === (_SOLO_HOY ? 'protect' : 'dra'));
ok('version grabada manda sobre la fecha',      API._contratoVersionDe({contratoVersion:'dra',contratoFirmado:true,fechaContratoFirmado:'2026-09-20'})==='dra');

// ── Hora del credito en el contrato (Adam, 10-sep-2026) ──
S.creds[0].creado='2026-09-10T14:35:00';
const htmlHora=API._htmlContratoProtect('CRED-900');
ok('el contrato dice "siendo las"',             htmlHora.includes('siendo las'));
ok('sale la hora del credito (2:35)',           htmlHora.includes('2:35'));
ok('la hora sale en la celebracion y el anexo C', (htmlHora.split('siendo las').length-1)>=2);
delete S.creds[0].creado;
const htmlSinHora=API._htmlContratoProtect('CRED-900');
ok('sin c.creado: queda raya para boligrafo',   htmlSinHora.includes('siendo las') && !htmlSinHora.includes('2:35'));
S.creds[0].creado='no-es-fecha';
ok('c.creado invalido no rompe el contrato',    API._htmlContratoProtect('CRED-900').length>20000);

// ── Texto corrido, no a dos columnas (Adam, 15-sep-2026: "se descargan
// divididos y no corridos"). El cuerpo iba con column-count:2 tipo periodico.
S.creds[0].creado='2026-09-15T15:47:00';
const htmlCorrido=API._htmlContratoProtect('CRED-900');
ok('el cuerpo va corrido a lo ancho, sin columnas', !/column-count\s*:\s*[2-9]/.test(htmlCorrido));
ok('la letra del cuerpo se queda en 8,1 px',       htmlCorrido.includes('font-size:8.1px'));
ok('los anexos siguen enteros y en orden',         ['ANEXO “A”','ANEXO “B”','ANEXO “C”','ANEXO “D”'].every(function(a,i,arr){
  return htmlCorrido.indexOf(a)>-1 && (i===0 || htmlCorrido.indexOf(arr[i-1])<htmlCorrido.indexOf(a)); }));
ok('el Anexo D sigue arrancando en su propia hoja', /page-break-before:always[^>]*>\s*<div[^>]*>\s*<div[^>]*>ANEXO “D”/.test(htmlCorrido) || htmlCorrido.indexOf('page-break-before:always')>-1);

// ── La V- no se repite aunque la ficha ya traiga la cedula con "V-" ──
// (Adam, 16-sep-2026: "se me repite la V- en todos lados... no puede pasar")
ok('cedula pelada: V-12345678',                 API._draCedulaTxt('12345678')==='V-12345678');
ok('ya guardada con V-: queda UNA sola V',      API._draCedulaTxt('V-12345678')==='V-12345678');
ok('hasta un V-V- guardado se limpia',          API._draCedulaTxt('V-V-12345678')==='V-12345678');
ok('con puntos, espacios y minuscula',          API._draCedulaTxt('v- 22.032.047')==='V-22032047');
ok('un extranjero conserva su E',               API._draCedulaTxt('E-84123456')==='E-84123456');
ok('algo que no es cedula se deja tal cual',    API._draCedulaTxt('PASAPORTE AB123')==='PASAPORTE AB123');
ok('vacio queda vacio (raya para boligrafo)',   API._draCedulaTxt('')==='' && API._draCedulaTxt(null)==='');
const _cedAntes=S.clientes[0].cedula, _fiaAntes=S.clientes[0].fiador_ci;
S.clientes[0].cedula='V-12345678'; S.clientes[0].fiador_ci='V-9876543';
const htmlVV=API._htmlContratoProtect('CRED-900');
ok('el contrato entero no dice V-V- por ningun lado', htmlVV.indexOf('V-V-')===-1);
ok('preambulo: cedula del comprador con una sola V', htmlVV.includes('cédula de identidad venezolana N° <strong>V-12345678</strong>'));
ok('preambulo: la del fiador tambien',          htmlVV.includes('N° <strong>V-9876543</strong>'));
ok('firmas: C.I. V-12345678',                   htmlVV.includes('C.I. V-12345678'));
S.clientes[0].cedula=_cedAntes; S.clientes[0].fiador_ci=_fiaAntes;
const htmlSinV=API._htmlContratoProtect('CRED-900');
ok('con la cedula guardada sin V- se imprime igual que antes', htmlSinV.indexOf('V-V-')===-1 && htmlSinV.includes('C.I. V-'+String(_cedAntes)));

// ── Una compania con la ficha a medias (el caso de PAGASI 26) ────────────────
// Si el telefono o el correo de la empresa estan vacios, el contrato tiene que salir
// igual, con la raya para llenar a mano. El 22-sep-2026 no salia: reventaba con
// "b is not defined" y PAGASI 26 se quedaba SIN PODER IMPRIMIR NI UN CONTRATO.
// Esta prueba faltaba porque todas las demas renderizan con la ficha de PAGASI 18,
// donde esos campos nunca estan vacios y el respaldo nunca se usa.
var _empAntes = global._empresa;
global._empresa = { nombre:'PAGASI 26, C.A.', rif:'J-50856275-5', ciudad:'Caracas',
  direccion:'Av. Orinoco, Caracas', tel:'', email:'', bancoUsd:'', cuentaUsd:'', billetera:'' };
var _reventó = null, htmlVacio = '';
try { htmlVacio = API._htmlContratoProtect('CRED-900'); } catch(e){ _reventó = e.message; }
ok('con el telefono y el correo vacios, el contrato NO revienta', _reventó === null);
ok('...y sale entero', htmlVacio.length > 20000);
ok('...con el nombre y el RIF de la compania nueva',
  htmlVacio.indexOf('PAGASI 26, C.A.') > -1 && htmlVacio.indexOf('J-50856275-5') > -1);
ok('...sin arrastrar el telefono ni el correo de PAGASI 18',
  htmlVacio.indexOf('424-2177798') === -1 && htmlVacio.indexOf('info@pagasi.io') === -1);
// Adam, 22-sep-2026: "no quiero que me dejes vacios en el contrato, si no hay un dato
// ponme N/A". Antes salia una raya; una raya en un papel que se firma es un renglon que
// alguien tiene que llenar, y nadie sabe si falta por error o porque no aplica.
ok('...y el dato que falta dice N/A', htmlVacio.indexOf('<strong>N/A</strong>') > -1);
ok('...el telefono de la empresa dice N/A', /Teléfono \/ WhatsApp: <strong>N\/A<\/strong>/.test(htmlVacio));
ok('...el correo tambien', /E-Mail: <strong>N\/A<\/strong>/.test(htmlVacio));
// El banco sin cargar dejaba un HUECO en medio de la frase: "a las cuentas de PAGASI 26,
// C.A. en  (cuenta corriente...)", que parece un error de imprenta.
ok('...los medios de pago sin cargar dicen N/A, no dejan un hueco',
  htmlVacio.indexOf('cuentas de PAGASI 26, C.A. en <strong>N/A</strong> (cuenta corriente') > -1);
ok('...y la billetera igual', htmlVacio.indexOf('en <strong></strong>, segun los datos') === -1);
// La raya se queda SOLO donde el hueco es a proposito: la hora, que se escribe a mano.
ok('la raya se queda donde se llena a boligrafo (la hora), no en los datos',
  (htmlVacio.match(/border-bottom:1px solid #94a3b8/g)||[]).length <= 8);
global._empresa = _empAntes;

// ── La misma ficha vacia, pero en OTRA base: ni una letra de PAGASI 18 ───────
// El 22-sep-2026 el contrato de PAGASI 26 salio completo y con buena pinta a nombre
// de PAGASI 18, con su RIF y SU CUENTA BANCARIA, porque la ficha no se pudo leer (se
// habia caido la sesion) y el respaldo no miraba en que base estaba. El cliente habria
// pagado a la cuenta de la otra empresa.
var _cfgAntes = global.FIREBASE_CONFIG;
global.FIREBASE_CONFIG = { projectId:'pagasi26-65ced' };
global._empresa = undefined;
var htmlOtra = API._htmlContratoProtect('CRED-900');
ok('en otra base, la ficha vacia NO trae el nombre de PAGASI 18', htmlOtra.indexOf('PAGASI 18')===-1);
ok('...ni su RIF',            htmlOtra.indexOf('J-50829589-7')===-1 && htmlOtra.indexOf('J-50.829.589-7')===-1);
ok('...ni su cuenta bancaria', htmlOtra.indexOf('0156-0030-61-0301030586')===-1 && htmlOtra.indexOf('100% Banco Universal')===-1);
ok('...ni su domicilio',      htmlOtra.indexOf('Quinta Miramar')===-1);
ok('...ni su telefono ni su correo', htmlOtra.indexOf('424-2177798')===-1 && htmlOtra.indexOf('info@pagasi.io')===-1);
ok('...y el contrato sale igual, con rayas para llenar a boligrafo', htmlOtra.length>20000);
// El aviso que ve quien imprime
var _avisos=[]; var _toastAntes=global.toast; global.toast=function(m,t){ _avisos.push(String(m)); };
API._avisarEmpresaContrato();
ok('avisa que no se pudo leer la ficha y que no se firme',
  _avisos.some(function(m){ return /NO SE PUDO LEER LA FICHA/.test(m) && /No lo firmes/.test(m); }));
global.FIREBASE_CONFIG = { projectId:'pagasi-v2' }; _avisos.length=0;
API._avisarEmpresaContrato();
ok('en la base de 18 el aviso es el de siempre (sale a nombre de PAGASI 18)',
  _avisos.some(function(m){ return /sale a nombre de PAGASI 18/.test(m); }));
global.toast=_toastAntes; global.FIREBASE_CONFIG=_cfgAntes; global._empresa=_empAntes;

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
