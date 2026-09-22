// Arnes del modulo GPS: cobertura, enlace con el credito y el importador
// del Excel (que es por donde van a entrar los 500 equipos).
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global;
const _els={};
const _mk=()=>({innerHTML:'',textContent:'',value:'',className:'',type:'text',style:{},appendChild(){},querySelector(){return _mk();}});
global.$=id=>{ if(!_els[id]) _els[id]=_mk(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:_mk,head:{appendChild(){}},body:{appendChild(){},removeChild(){},style:{}}};
global.setMicon=()=>{}; global.closeM=()=>{}; global.nav=()=>{}; global.toast=()=>{};
global.logActividad=()=>{}; global.confirm=()=>true; global.pageBanner=()=>'';
global.guardados=[];
global.DB={ saveGps:o=>{ guardados.push(o); return Promise.resolve(true); } };
global.S={currentUser:{nombre:'Adam',rol:'Administrador'}, gps:[], creds:[], motos:[], clientes:[]};
let pass=0, fail=0;
global.ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };

const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const SRC=fs.readFileSync(path.join(ROOT,'logic/gps.js'),'utf8');
const API=eval('with(auto){'+SRC+'\n; ({_gpsCobertura,_gpsCredInfo,_gpsPorRecuperar,_gpsEstadoDef,_gpsLista,_gpsCredsVivos,_gpsImportarProcesar,_gpsById,_gpsDiasSinRevisar,_gpsSinRevisar,_gpsCaidosEnMora,GPS_DIAS_REVISION,_gpsNuevoId,_gpsTienePos,_gpsFuente,_gpsHorasSinReportar,_gpsColor,_gpsTab,_gpsParseFecha,_gpsCoincide,_gpsFiltro,_gpsSetFiltro,_gpsFilasEquipos,_gpsAsignar,_gpsNumCred,_gpsListaMapa,_gpsSetTab,_gpsHtmlSims,_gpsBuscarCred,_gpsElegirCred,_gpsHtmlRevision,_gpsGrupo,_gpsHtmlDetalle,_gpsSeleccionar,_gpsSel,_gpsSetFiltroMapa,_gpsFiltroMapa,_gpsClaveDir,_gpsHtmlPanel,_gpsHtmlSync,_gpsCfg,_gpsWorkerUrl}) }');

// ── Escenario: 5 creditos, 3 con equipo ──
S.creds = [
  {id:'CRED-001', cli:'Ana',   modelo:'Bera',   placa:'AA1', estado:'activo',    mora:0,  eliminado:false},
  {id:'CRED-002', cli:'Beto',  modelo:'Empire', placa:'BB2', estado:'mora',      mora:12, eliminado:false},
  {id:'CRED-003', cli:'Caro',  modelo:'Toro',   placa:'CC3', estado:'activo',    mora:0,  eliminado:false},
  {id:'CRED-004', cli:'Dario', modelo:'Bera',   placa:'DD4', estado:'mora',      mora:45, eliminado:false},
  {id:'CRED-005', cli:'Elsa',  modelo:'Empire', placa:'EE5', estado:'cancelado', mora:0,  eliminado:false},
  {id:'CRED-006', cli:'Fabio', modelo:'Toro',   placa:'FF6', estado:'rechazado', mora:0,  eliminado:false},
];
S.gps = [
  {id:'G1', estado:'instalado', creditoId:'CRED-001', idGps:'111', imei:'imei1', linea:'0414', eliminado:false},
  {id:'G2', estado:'instalado', creditoId:'CRED-002', idGps:'222', imei:'imei2', linea:'0424', eliminado:false},
  {id:'G3', estado:'stock',     creditoId:'',         idGps:'333', imei:'imei3', linea:'0416', eliminado:false},
  {id:'G4', estado:'instalado', creditoId:'CRED-005', idGps:'444', imei:'imei4', linea:'0426', eliminado:false},
  {id:'G5', estado:'instalado', creditoId:'CRED-003', idGps:'555', imei:'imei5', linea:'0412', eliminado:true},
];

// ── Creditos vivos: se excluyen cancelado y rechazado ──
ok('creditos vivos = 4 (fuera cancelado y rechazado)', API._gpsCredsVivos().length===4);
ok('un eliminado no cuenta como equipo', API._gpsLista().length===4);

// ── Cobertura ──
const cob = API._gpsCobertura();
ok('cubiertos = 2 (CRED-001 y 002)', cob.cubiertos===2);
ok('sin equipo = 2 (CRED-003 y 004)', cob.sin.length===2);
ok('el G5 eliminado NO cuenta como cobertura de CRED-003',
   cob.sin.some(c=>c.id==='CRED-003'));
ok('en mora sin GPS = 1 (solo CRED-004)', cob.sinYMora.length===1);
ok('el que falta en mora es CRED-004', cob.sinYMora[0] && cob.sinYMora[0].id==='CRED-004');
ok('porcentaje de cobertura = 50%', cob.pct===50);
ok('CRED-002 esta en mora pero SI tiene equipo, no aparece',
   !cob.sinYMora.some(c=>c.id==='CRED-002'));

// ── Equipos montados en creditos muertos ──
const rec = API._gpsPorRecuperar();
ok('1 equipo por recuperar (G4 en credito cancelado)', rec.length===1);
ok('el equipo por recuperar es el G4', rec[0] && rec[0].id==='G4');

// ── Datos derivados del credito, no duplicados ──
const i2 = API._gpsCredInfo('CRED-002');
ok('el cliente sale del credito', i2.cliente==='Beto');
ok('la moto sale del credito', i2.modelo==='Empire' && i2.placa==='BB2');
ok('detecta mora por dias', i2.enMora===true && i2.diasMora===12);
const i1 = API._gpsCredInfo('CRED-001');
ok('sin mora no marca mora', i1.enMora===false);
const i5 = API._gpsCredInfo('CRED-005');
ok('un credito cancelado no esta vivo', i5.vivo===false);
ok('credito inexistente devuelve null', API._gpsCredInfo('CRED-999')===null);
ok('sin creditoId devuelve null', API._gpsCredInfo('')===null);

// ── Estados ──
ok('estado instalado se resuelve', API._gpsEstadoDef('instalado').l==='Instalado');
ok('estado desconocido cae a stock', API._gpsEstadoDef('cualquiera').v==='stock');

// ══════════════════════════════════════════════════════════════════
// IMPORTADOR — es por donde entran los 500 equipos, tiene que ser solido
// ══════════════════════════════════════════════════════════════════
const COLS = a => a.join('\t');
function importar(filas){
  guardados.length = 0;
  $('gps_imp').value = filas.join('\n');
  return API._gpsImportarProcesar();
}

const antes = S.gps.length;
importar([
  // estado, iccid, linea, idGps, pass, imei, cliente, cred, modelo, placa, conc, fecha, tecnico, micodus, verif, obs
  COLS(['INSTALADO','8958044200151','143557051','19210075478','141213','866557086115211','Ana','CRED-003','Bera','CC3','EK','29/08/2026','Francisco','ONLINE','Miguel','ok']),
  COLS(['STOCK','8958044200152','143557052','19210075479','141213','866557086115212','','','','','','','','','','']),
]);
ok('importa 2 filas nuevas', S.gps.length===antes+2);
ok('las 2 se mandaron a guardar', guardados.length===2);

const imp1 = S.gps.find(g=>g.idGps==='19210075478');
ok('mapea el estado INSTALADO', imp1 && imp1.estado==='instalado');
ok('enlaza el credito', imp1 && imp1.creditoId==='CRED-003');
ok('convierte la fecha 29/08/2026 -> 2026-08-29', imp1 && imp1.fechaInstalacion==='2026-08-29');
ok('guarda ICCID y linea', imp1 && imp1.iccid==='8958044200151' && imp1.linea==='143557051');
ok('guarda tecnico y verificado por', imp1 && imp1.tecnico==='Francisco' && imp1.verificadoPor==='Miguel');
ok('NO copia el cliente (sale del credito)', imp1 && imp1.cliente===undefined);

// ── Repetidos: no se duplican equipos ──
const n1 = S.gps.length;
const r = importar([COLS(['INSTALADO','8958044200151','143557051','19210075478','141213','866557086115211','Ana','CRED-003','','','','','','','',''])]);
ok('una fila ya cargada no se duplica', S.gps.length===n1);
ok('y devuelve false al no importar nada', r===false);

// ── Normalizacion del numero de credito ──
importar([COLS(['INSTALADO','','','88801','','imeiA','','CRED004','','','','','','','',''])]);
const impA = S.gps.find(g=>g.idGps==='88801');
ok('acepta "CRED004" sin guion y lo normaliza', impA && impA.creditoId==='CRED-004');

// ── Un credito que no existe no rompe la importacion ──
importar([COLS(['INSTALADO','','','88802','','imeiB','','CRED-777','','','','','','','',''])]);
const impB = S.gps.find(g=>g.idGps==='88802');
ok('credito inexistente entra sin enlace', impB && impB.creditoId==='');
ok('y baja a stock, porque instalado exige credito', impB && impB.estado==='stock');

// ── Fechas en otros formatos ──
importar([COLS(['STOCK','','','88803','','imeiC','','','','','','2026-07-15','','','',''])]);
ok('acepta fecha ISO', S.gps.find(g=>g.idGps==='88803').fechaInstalacion==='2026-07-15');
importar([COLS(['STOCK','','','88804','','imeiD','','','','','','5/3/26','','','',''])]);
ok('acepta 5/3/26 -> 2026-03-05', S.gps.find(g=>g.idGps==='88804').fechaInstalacion==='2026-03-05');
importar([COLS(['STOCK','','','88805','','imeiE','','','','','','no es fecha','','','',''])]);
ok('una fecha ilegible queda vacia, no rompe', S.gps.find(g=>g.idGps==='88805').fechaInstalacion==='');

// ── Filas basura ──
const n2 = S.gps.length;
importar(['', '   ', COLS(['','','','','','','','','','','','','','','',''])]);
ok('filas vacias no crean equipos', S.gps.length===n2);

// ── La cobertura se recalcula con lo importado ──
const cob2 = API._gpsCobertura();
ok('CRED-003 ya quedo cubierto tras importar', !cob2.sin.some(c=>c.id==='CRED-003'));
ok('CRED-004 tambien quedo cubierto: su fila decia CRED004 y se normalizo',
   !cob2.sin.some(c=>c.id==='CRED-004'));
ok('sin creditos descubiertos, la cobertura llega a 100%', cob2.pct===100);
ok('y ya no hay ninguno en mora sin GPS', cob2.sinYMora.length===0);

// ══════════════════════════════════════════════════════════════════
// REVISION MANUAL — mientras no hay API, alguien confirma que responden
// ══════════════════════════════════════════════════════════════════
const hoy = new Date();
const dLoc = n => { const d=new Date(hoy.getTime()+n*86400000);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };

ok('el umbral de revision son 15 dias', API.GPS_DIAS_REVISION===15);
ok('revisado hoy = 0 dias', API._gpsDiasSinRevisar({ultimaRevision:dLoc(0)})===0);
ok('revisado hace 20 dias', API._gpsDiasSinRevisar({ultimaRevision:dLoc(-20)})===20);
ok('sin fecha alguna devuelve null', API._gpsDiasSinRevisar({})===null);
ok('cae a la fecha de instalacion si nunca se reviso',
   API._gpsDiasSinRevisar({fechaInstalacion:dLoc(-7)})===7);
ok('la revision manda sobre la instalacion',
   API._gpsDiasSinRevisar({fechaInstalacion:dLoc(-90), ultimaRevision:dLoc(-2)})===2);
ok('una fecha basura no revienta', API._gpsDiasSinRevisar({ultimaRevision:'xxx'})===null);
// Una fecha suelta se ancla al mediodia: antes de las 12 del dia, "hoy"
// quedaba en el futuro y devolvia -1. En la pantalla se leia "hace -1 d".
ok('nunca devuelve negativo, ni de madrugada',
   API._gpsDiasSinRevisar({ultimaRevision:dLoc(0)}) >= 0);
ok('una fecha futura tampoco da negativo',
   API._gpsDiasSinRevisar({ultimaRevision:dLoc(3)}) === 0);

S.gps = [
  {id:'R1', estado:'instalado', creditoId:'CRED-001', ultimaRevision:dLoc(-2),  estadoMicodus:'ONLINE / OK', eliminado:false},
  {id:'R2', estado:'instalado', creditoId:'CRED-002', ultimaRevision:dLoc(-40), estadoMicodus:'OFFLINE',     eliminado:false},
  {id:'R3', estado:'instalado', creditoId:'CRED-004', eliminado:false},
  {id:'R4', estado:'stock',     creditoId:'',         eliminado:false},
  {id:'R5', estado:'instalado', creditoId:'CRED-001', ultimaRevision:dLoc(-30), eliminado:true},
];
const sr = API._gpsSinRevisar();
ok('sin revisar = 2 (R2 vencido y R3 que nunca)', sr.length===2);
ok('el recien revisado no aparece', !sr.some(g=>g.id==='R1'));
ok('el de stock no aplica: no hay nada que revisar', !sr.some(g=>g.id==='R4'));
ok('un eliminado no cuenta', !sr.some(g=>g.id==='R5'));

// R2 esta OFFLINE y CRED-002 tiene 12 dias de mora: la peor combinacion
const caidos = API._gpsCaidosEnMora();
ok('1 equipo caido en credito con mora', caidos.length===1);
ok('es el R2', caidos[0] && caidos[0].id==='R2');
ok('R1 esta ONLINE, no cuenta como caido', !caidos.some(g=>g.id==='R1'));

// Un equipo caido pero en un credito al dia no es urgente
S.gps.push({id:'R6', estado:'instalado', creditoId:'CRED-001', estadoMicodus:'OFFLINE', eliminado:false});
ok('caido en credito al dia no entra en la alerta',
   !API._gpsCaidosEnMora().some(g=>g.id==='R6'));

// Variantes de como se escribe "no reporta"
['OFFLINE','SIN SEÑAL RECIENTE','DESCONECTADO'].forEach(txt => {
  S.gps = [{id:'V', estado:'instalado', creditoId:'CRED-002', estadoMicodus:txt, eliminado:false}];
  ok('reconoce "'+txt+'" como caido', API._gpsCaidosEnMora().length===1);
});
S.gps = [{id:'V', estado:'instalado', creditoId:'CRED-002', estadoMicodus:'ONLINE / OK', eliminado:false}];
ok('ONLINE no se confunde con caido', API._gpsCaidosEnMora().length===0);

// ══════════════════════════════════════════════════════════════════
// IDS UNICOS — importar 500 de golpe colisionaba con Date.now()+random
// (cumpleanos: ~12 colisiones esperadas en 500 con 4 digitos aleatorios).
// Cuatro equipos reales se perdieron al cargar el lote de MiCODUS.
// ══════════════════════════════════════════════════════════════════
const lote = Array.from({length: 2000}, () => API._gpsNuevoId());
ok('2000 ids seguidos, todos distintos', new Set(lote).size === 2000);
ok('todos empiezan con GPS-', lote.every(i => i.indexOf('GPS-') === 0));

// El caso real: importar 500 filas de una sola vez
S.gps = []; guardados.length = 0;
const filas500 = Array.from({length: 500}, (_, i) =>
  ['SIM DISPONIBLE','','', '1921007' + String(7000+i), '', '', '','','','','','','','','','MV710G'].join('\t'));
importar(filas500);
const ids500 = S.gps.map(g => g.id);
ok('las 500 filas entraron', S.gps.length === 500);
ok('500 ids, cero colisiones', new Set(ids500).size === 500);
ok('500 seriales distintos', new Set(S.gps.map(g => g.idGps)).size === 500);
ok('500 escrituras a la BD', guardados.length === 500);
ok('cada escritura lleva su propio id', new Set(guardados.map(g => g.id)).size === 500);

// ══════════════════════════════════════════════════════════════════
// MAPA — es la portada del modulo, tiene que ser exacto
// ══════════════════════════════════════════════════════════════════
ok('el mapa es la pestaña de entrada', API._gpsTab()==='mapa');

ok('posicion valida', API._gpsTienePos({lat:10.46842, lng:-66.54793})===true);
ok('sin coordenadas, no', API._gpsTienePos({})===false);
ok('0,0 no es posicion (es el defecto de un equipo mudo)',
   API._gpsTienePos({lat:0, lng:0})===false);
ok('lat fuera de rango, no', API._gpsTienePos({lat:200, lng:10})===false);
ok('lng fuera de rango, no', API._gpsTienePos({lat:10, lng:900})===false);
ok('coordenadas como texto, no', API._gpsTienePos({lat:'10.4', lng:'-66.5'})===false);

ok('dataType 1 es GPS fino', API._gpsFuente({dataType:1}).fino===true);
ok('dataType 2 es antena, NO fino', API._gpsFuente({dataType:2}).fino===false);
ok('dataType 3 es wifi, NO fino', API._gpsFuente({dataType:3}).fino===false);
ok('sin dataType se asume GPS', API._gpsFuente({}).fino===true);

// Formato exacto de MiCODUS: UTC sin marca de zona
const hAtras = n => { const d=new Date(Date.now()-n*3600000);
  return d.toISOString().slice(0,19).replace('T',' '); };
ok('reporto hace 3h', API._gpsHorasSinReportar({ultimaSenal:hAtras(3)})===3);
ok('reporto hace 72h', API._gpsHorasSinReportar({ultimaSenal:hAtras(72)})===72);
ok('sin fecha devuelve null', API._gpsHorasSinReportar({})===null);
ok('fecha basura devuelve null', API._gpsHorasSinReportar({ultimaSenal:'xx'})===null);
ok('nunca da negativo', API._gpsHorasSinReportar({ultimaSenal:hAtras(-5)})===0);

// Colores: mora manda sobre antiguedad
S.creds = [{id:'C-MORA', cli:'X', estado:'mora', mora:9, eliminado:false},
           {id:'C-OK',   cli:'Y', estado:'activo', mora:0, eliminado:false}];
ok('en mora pinta rojo',  API._gpsColor({creditoId:'C-MORA', ultimaSenal:hAtras(1)})==='#F04B6A');
ok('mora manda aunque reporte bien', API._gpsColor({creditoId:'C-MORA', ultimaSenal:hAtras(200)})==='#F04B6A');
ok('al dia sin reportar +48h pinta ambar', API._gpsColor({creditoId:'C-OK', ultimaSenal:hAtras(72)})==='#F59E0B');
ok('al dia y reportando pinta verde', API._gpsColor({creditoId:'C-OK', ultimaSenal:hAtras(2)})==='#00B876');

// La marca de MiCODUS es UTC aunque no lo diga. Leerla como hora local
// adelantaba el reloj 4 horas en Venezuela y la alerta de +48h saltaba tarde.
const utc = (a,m,d,h,mi,se) => Date.UTC(a,m-1,d,h,mi,se||0);
ok('"2026-09-01 22:42:07" se lee como UTC',
   API._gpsParseFecha('2026-09-01 22:42:07').getTime() === utc(2026,9,1,22,42,7));
ok('con Z explicita da lo mismo',
   API._gpsParseFecha('2026-09-01T22:42:07Z').getTime() === utc(2026,9,1,22,42,7));
ok('con desfase explicito se respeta',
   API._gpsParseFecha('2026-09-01T18:42:07-04:00').getTime() === utc(2026,9,1,22,42,7));
ok('solo fecha: mediodia local, no UTC',
   API._gpsParseFecha('2026-09-01').getHours() === 12);
ok('vacio devuelve null', API._gpsParseFecha('') === null);
ok('basura devuelve null', API._gpsParseFecha('no es fecha') === null);

// ══════════════════════════════════════════════════════════════════
// BUSCADOR — con 500 equipos es la unica forma de llegar a uno
// ══════════════════════════════════════════════════════════════════
S.creds = [
  {id:'CRED-467', cli:'JOSE PRUEBA', modelo:'CF MT 450', placa:'AM2D29J', estado:'activo', mora:0,  eliminado:false},
  {id:'CRED-477', cli:'ABEL RAMIREZ',    modelo:'NEW OUTLOOK 175', placa:'AM6C46J', estado:'mora', mora:9, eliminado:false},
];
const eq = {id:'X', estado:'instalado', creditoId:'CRED-467', idGps:'19210075478',
            imei:'866557086115211', linea:'143557051', iccid:'895804420015136641',
            tecnico:'FRANCISCO', eliminado:false};

ok('sin texto, todo pasa', API._gpsCoincide(eq, ''));
ok('busca por serial', API._gpsCoincide(eq, '19210075478'));
ok('busca por serial parcial', API._gpsCoincide(eq, '75478'));
ok('busca por IMEI', API._gpsCoincide(eq, '866557086115211'));
ok('busca por linea', API._gpsCoincide(eq, '143557051'));
ok('busca por ICCID', API._gpsCoincide(eq, '136641'));
ok('busca por credito', API._gpsCoincide(eq, 'CRED-467'));
ok('busca por cliente', API._gpsCoincide(eq, 'jose'));
ok('busca por placa', API._gpsCoincide(eq, 'am2d29j'));
ok('busca por moto', API._gpsCoincide(eq, 'CF MT'));
ok('busca por tecnico', API._gpsCoincide(eq, 'francisco'));
ok('no distingue mayusculas', API._gpsCoincide(eq, 'JoSe'));
ok('varias palabras: todas deben estar', API._gpsCoincide(eq, 'jose 75478'));
ok('si una palabra no esta, no coincide', !API._gpsCoincide(eq, 'jose zzz'));
ok('lo que no existe no coincide', !API._gpsCoincide(eq, 'pedro'));

// El filtro combina texto y estado
S.gps = [
  eq,
  {id:'Y', estado:'stock', idGps:'19210076000', eliminado:false},
  {id:'Z', estado:'stock', idGps:'19210077111', eliminado:false},
  {id:'W', estado:'falla', idGps:'19210078222', eliminado:false},
];
API._gpsSetFiltro('q','');  API._gpsSetFiltro('estado','');
ok('sin filtro salen los 4', (API._gpsFilasEquipos().match(/<tr>/g)||[]).length >= 4);
API._gpsSetFiltro('estado','stock');
const soloStock = API._gpsFilasEquipos();
ok('filtrando stock no sale el instalado', soloStock.indexOf('19210075478') === -1);
ok('filtrando stock si salen los de stock', soloStock.indexOf('19210076000') > -1);
API._gpsSetFiltro('estado','');
API._gpsSetFiltro('q','76000');
const uno = API._gpsFilasEquipos();
ok('buscando un serial sale solo ese', uno.indexOf('19210076000') > -1 && uno.indexOf('19210077111') === -1);
API._gpsSetFiltro('q','no-existe-nada');
ok('sin coincidencias avisa', API._gpsFilasEquipos().indexOf('Ningun equipo coincide') > -1);
API._gpsSetFiltro('q','');

// ── Tope de filas: 500 en pantalla es inmanejable ──
S.gps = Array.from({length:200}, (_,i) => ({id:'B'+i, estado:'stock', idGps:'1921008'+String(1000+i), eliminado:false}));
const muchas = API._gpsFilasEquipos();
ok('no pinta las 200 de golpe', (muchas.match(/<tr>/g)||[]).length <= 61);
ok('y avisa cuantas hay en total', muchas.indexOf('de <b>200</b>') > -1);

// ══════════════════════════════════════════════════════════════════
// ASIGNAR — el equipo pasa a instalado y toma su credito
// ══════════════════════════════════════════════════════════════════
S.gps = [
  {id:'LIBRE', estado:'stock', idGps:'19210076000', linea:'0414', eliminado:false},
  {id:'PUESTO', estado:'instalado', creditoId:'CRED-467', idGps:'19210075478', eliminado:false},
];
guardados.length = 0;
API._gpsAsignar('LIBRE');
$('gpsa_cred').value = 'CRED-477';
$('gpsa_fecha').value = '2026-09-02';
$('gpsa_tecnico').value = 'FRANCISCO';
ok('la asignacion se guarda', S.saveFn() === true);
const asignado = S.gps.find(g => g.id === 'LIBRE');
ok('quedo instalado', asignado.estado === 'instalado');
ok('tomo el credito', asignado.creditoId === 'CRED-477');
ok('guardo la fecha', asignado.fechaInstalacion === '2026-09-02');
ok('guardo el tecnico', asignado.tecnico === 'FRANCISCO');
ok('se escribio en la base', guardados.length === 1 && guardados[0].id === 'LIBRE');
ok('NO copia el cliente: sale del credito', asignado.cliente === undefined);

// Sin credito no deja guardar
S.gps.push({id:'OTRO', estado:'stock', idGps:'19210079999', eliminado:false});
API._gpsAsignar('OTRO');
$('gpsa_cred').value = '';
ok('sin credito no guarda', S.saveFn() === false);

// Un credito no puede llevar dos equipos
API._gpsAsignar('OTRO');
$('gpsa_cred').value = 'CRED-467';   // ya lo tiene PUESTO
ok('rechaza un credito que ya tiene equipo', S.saveFn() === false);
ok('y el equipo quedo intacto en stock', S.gps.find(g=>g.id==='OTRO').estado === 'stock');

// ══════════════════════════════════════════════════════════════════
// ORDEN AL ASIGNAR — el GPS se monta en la venta del dia, no se
// retrofitea a las motos ya entregadas. Los creditos nuevos arriba.
// ══════════════════════════════════════════════════════════════════
ok('CRED-467 → 467', API._gpsNumCred('CRED-467') === 467);
ok('CRED-1200 → 1200', API._gpsNumCred('CRED-1200') === 1200);
ok('id raro → 0', API._gpsNumCred('sin-numero') === 0);
ok('vacio → 0', API._gpsNumCred('') === 0);

S.creds = [
  {id:'CRED-100', cli:'Viejo con mora', fecha:'2026-05-10', estado:'mora',   mora:90, eliminado:false},
  {id:'CRED-480', cli:'Nuevo de hoy',   fecha:'2026-09-02', estado:'activo', mora:0,  eliminado:false},
  {id:'CRED-300', cli:'Del medio',      fecha:'2026-07-01', estado:'activo', mora:5,  eliminado:false},
  {id:'CRED-481', cli:'Otro de hoy',    fecha:'2026-09-02', estado:'activo', mora:0,  eliminado:false},
];
S.gps = [{id:'L', estado:'stock', idGps:'19210076000', eliminado:false}];
API._gpsAsignar('L');
API._gpsBuscarCred('');
const listaCreds = $('gpsa_lista').innerHTML;
const opts = [...listaCreds.matchAll(/_gpsElegirCred\('(CRED-\d+)'\)/g)].map(m => m[1]);
ok('el primero es el mas nuevo', opts[0] === 'CRED-481');
ok('desempata por numero de credito', opts[1] === 'CRED-480');
ok('despues el del medio', opts[2] === 'CRED-300');
ok('el viejo con 90 dias de mora queda de ultimo', opts[3] === 'CRED-100');
ok('la mora ya NO manda el orden', opts[0] !== 'CRED-100');
ok('se ve la fecha de cada credito', listaCreds.indexOf('2026-09-02') > -1);
ok('la mora se sigue mostrando como aviso', listaCreds.indexOf('90 d de mora') > -1);

// ══════════════════════════════════════════════════════════════════
// MAPA DE TRES COLUMNAS — lista filtrable | mapa | detalle
// ══════════════════════════════════════════════════════════════════
const uh = n => new Date(Date.now()-n*3600000).toISOString().slice(0,19).replace('T',' ');
S.creds = [
  {id:'C-MORA',  cli:'Moroso Grande', modelo:'Bera',   placa:'AA1', estado:'mora',   mora:40, cuota:90, eliminado:false},
  {id:'C-MORA2', cli:'Moroso Chico',  modelo:'Empire', placa:'BB2', estado:'mora',   mora:5,  cuota:80, eliminado:false},
  {id:'C-MUDO',  cli:'Sin Reportar',  modelo:'Toro',   placa:'CC3', estado:'activo', mora:0,  cuota:70, eliminado:false},
  {id:'C-OK',    cli:'Al Dia',        modelo:'Bera',   placa:'DD4', estado:'activo', mora:0,  cuota:75, eliminado:false},
];
S.gps = [
  {id:'g1', estado:'instalado', creditoId:'C-OK',    idGps:'111', lat:10.4, lng:-66.9, ultimaSenal:uh(1),  dataType:1, velocidad:0,  eliminado:false},
  {id:'g2', estado:'instalado', creditoId:'C-MORA',  idGps:'222', lat:10.5, lng:-66.8, ultimaSenal:uh(2),  dataType:1, velocidad:48, eliminado:false},
  {id:'g3', estado:'instalado', creditoId:'C-MUDO',  idGps:'333', lat:10.6, lng:-66.7, ultimaSenal:uh(96), dataType:1, velocidad:0,  eliminado:false},
  {id:'g4', estado:'instalado', creditoId:'C-MORA2', idGps:'444', lat:10.7, lng:-66.6, ultimaSenal:uh(3),  dataType:2, velocidad:0, bateria:15, eliminado:false},
];
const pts = S.gps.slice();
API._gpsSetFiltroMapa('q', ''); API._gpsSetFiltroMapa('grupo', 'todos');

// ── Cada equipo cae en un solo grupo ──
ok('en mora se agrupa como mora', API._gpsGrupo(pts[1]) === 'mora');
ok('la mora manda sobre ir en marcha', API._gpsGrupo(pts[1]) !== 'moviendo');
ok('sin reportar +48h es mudo', API._gpsGrupo(pts[2]) === 'mudos');
ok('el resto es al dia', API._gpsGrupo(pts[0]) === 'aldia');

// ── La lista ──
const lm = API._gpsListaMapa(pts);
const orden = [...lm.matchAll(/_gpsSeleccionar\('(\w+)'\)/g)].map(m=>m[1]);
ok('los 4 salen en la lista', orden.length === 4);
ok('primero la mora mas alta', orden[0] === 'g2');
ok('despues la mora menor', orden[1] === 'g4');
ok('luego el que dejo de reportar', orden[2] === 'g3');
ok('de ultimo el que esta al dia', orden[3] === 'g1');
ok('muestra el cliente', lm.indexOf('Moroso Grande') > -1);
ok('muestra la placa', lm.indexOf('AA1') > -1);
ok('marca los dias de mora', lm.indexOf('40 d de mora') > -1);
ok('marca los dias sin reportar', lm.indexOf('4 d sin reportar') > -1);
ok('avisa cuando va en marcha', lm.indexOf('48 km/h') > -1);
ok('cada fila es clicable', (lm.match(/_gpsSeleccionar/g)||[]).length === 4);

// ── Los filtros ──
API._gpsSetFiltroMapa('grupo', 'mora');
const soloMora = API._gpsListaMapa(pts);
ok('el filtro de mora deja solo los 2', (soloMora.match(/_gpsSeleccionar/g)||[]).length === 2);
ok('y saca al que esta al dia', soloMora.indexOf('Al Dia') === -1);
API._gpsSetFiltroMapa('grupo', 'mudos');
ok('el filtro de sin señal deja 1', (API._gpsListaMapa(pts).match(/_gpsSeleccionar/g)||[]).length === 1);
API._gpsSetFiltroMapa('grupo', 'moviendo');
ok('en marcha: ninguno, porque el que corre esta en mora',
   API._gpsListaMapa(pts).indexOf('Ninguna moto en este grupo') > -1);
API._gpsSetFiltroMapa('grupo', 'todos');

// ── El buscador del mapa ──
API._gpsSetFiltroMapa('q', 'moroso grande');
ok('busca por cliente', API._gpsListaMapa(pts).indexOf('Moroso Grande') > -1);
ok('y descarta el resto', API._gpsListaMapa(pts).indexOf('Al Dia') === -1);
API._gpsSetFiltroMapa('q', 'cc3');
ok('busca por placa', API._gpsListaMapa(pts).indexOf('Sin Reportar') > -1);
API._gpsSetFiltroMapa('q', 'C-MORA2');
ok('busca por credito', API._gpsListaMapa(pts).indexOf('Moroso Chico') > -1);
API._gpsSetFiltroMapa('q', 'zzz');
ok('sin coincidencias avisa', API._gpsListaMapa(pts).indexOf('Ninguna moto en este grupo') > -1);
API._gpsSetFiltroMapa('q', '');

// ── El panel de detalle ──
ok('sin seleccion invita a elegir', API._gpsHtmlDetalle(null).indexOf('Elige una moto') > -1);
const det = API._gpsHtmlDetalle('g2');
ok('trae el cliente', det.indexOf('Moroso Grande') > -1);
ok('trae el serial', det.indexOf('222') > -1);
ok('dice que va en marcha', det.indexOf('En marcha') > -1);
ok('trae las coordenadas', det.indexOf('10.50000') > -1);
ok('trae el credito, que MiCODUS no sabe', det.indexOf('C-MORA') > -1);
ok('trae la moto y la placa', det.indexOf('Bera') > -1 && det.indexOf('AA1') > -1);
ok('marca la mora', det.indexOf('40 dias de mora') > -1);
ok('trae la velocidad', det.indexOf('48 km/h') > -1);
ok('busca la direccion en texto', det.indexOf('gps-dir') > -1);

const detQuieto = API._gpsHtmlDetalle('g1');
ok('una moto parada dice Detenida', detQuieto.indexOf('Detenida') > -1);
ok('y que esta al dia', detQuieto.indexOf('al dia') > -1);

const detAntena = API._gpsHtmlDetalle('g4');
ok('avisa que la posicion es aproximada', detAntena.indexOf('aproximada') > -1);
ok('avisa la bateria baja', detAntena.indexOf('15%') > -1);

// ── Seleccionar ──
API._gpsSeleccionar('g3');
ok('queda seleccionado', API._gpsSel() === 'g3');
ok('la lista lo marca', API._gpsListaMapa(pts).indexOf('border-left:3px solid') > -1);
window._gpsSeleccionado = null;

// La clave de cache de direccion redondea, para no repetir consultas
ok('la clave de direccion redondea a 4 decimales',
   API._gpsClaveDir({lat:10.474861, lng:-66.557053}) === '10.4749,-66.5571');

// ══════════════════════════════════════════════════════════════════
// BUSCADOR DE CREDITOS — un <select> con 470 opciones es inusable
// ══════════════════════════════════════════════════════════════════
S.creds = [
  {id:'CRED-480', cli:'MARIA GONZALEZ',  ci:'V-18456789', modelo:'Bera',   placa:'AB1C2D', fecha:'2026-09-02', estado:'activo', mora:0,  eliminado:false},
  {id:'CRED-479', cli:'JOSE RODRIGUEZ',  ci:'V-20111222', modelo:'Empire', placa:'XY9Z8W', fecha:'2026-09-01', estado:'activo', mora:0,  eliminado:false},
  {id:'CRED-100', cli:'PEDRO MARTINEZ',  ci:'V-14000111', modelo:'Toro',   placa:'QQ1R2S', fecha:'2026-05-10', estado:'mora',   mora:60, eliminado:false},
];
S.gps = [{id:'LIB', estado:'stock', idGps:'19210076000', eliminado:false}];
API._gpsAsignar('LIB');

ok('ya no hay un select gigante', $('mbd').innerHTML.indexOf('<select class="fs" id="gpsa_cred"') === -1);
ok('hay un campo para escribir', $('mbd').innerHTML.indexOf('gpsa_buscar') > -1);

API._gpsBuscarCred('');
const todo = $('gpsa_lista').innerHTML;
ok('sin escribir muestra los 3', (todo.match(/_gpsElegirCred/g)||[]).length === 3);
ok('el mas nuevo primero', todo.indexOf('MARIA GONZALEZ') < todo.indexOf('PEDRO MARTINEZ'));

API._gpsBuscarCred('maria');
ok('busca por nombre', $('gpsa_lista').innerHTML.indexOf('MARIA GONZALEZ') > -1);
ok('y descarta el resto', $('gpsa_lista').innerHTML.indexOf('JOSE RODRIGUEZ') === -1);

API._gpsBuscarCred('20111222');
ok('busca por cedula', $('gpsa_lista').innerHTML.indexOf('JOSE RODRIGUEZ') > -1);
API._gpsBuscarCred('CRED-100');
ok('busca por numero de credito', $('gpsa_lista').innerHTML.indexOf('PEDRO MARTINEZ') > -1);
API._gpsBuscarCred('xy9z8w');
ok('busca por placa, sin importar mayusculas', $('gpsa_lista').innerHTML.indexOf('JOSE RODRIGUEZ') > -1);
API._gpsBuscarCred('empire');
ok('busca por modelo de moto', $('gpsa_lista').innerHTML.indexOf('JOSE RODRIGUEZ') > -1);
API._gpsBuscarCred('maria bera');
ok('varias palabras: todas deben estar', $('gpsa_lista').innerHTML.indexOf('MARIA GONZALEZ') > -1);
API._gpsBuscarCred('maria empire');
ok('si una palabra no calza, no sale', $('gpsa_lista').innerHTML.indexOf('MARIA') === -1);
API._gpsBuscarCred('zzzz');
ok('sin coincidencias avisa', $('gpsa_lista').innerHTML.indexOf('Ningun credito coincide') > -1);

// Elegir uno y guardar
API._gpsBuscarCred('');
API._gpsElegirCred('CRED-479');
ok('al elegir queda guardado el id', $('gpsa_cred').value === 'CRED-479');
ok('y el campo muestra a quien elegiste', $('gpsa_buscar').value.indexOf('JOSE RODRIGUEZ') > -1);
$('gpsa_fecha').value = '2026-09-02';
$('gpsa_tecnico').value = 'FRANCISCO';
ok('guarda con el credito elegido', S.saveFn() === true);
ok('el equipo quedo con ese credito', S.gps.find(g=>g.id==='LIB').creditoId === 'CRED-479');

// La columna Revisado, que era la que faltaba y rompia la pestaña
ok('_gpsHtmlRevision existe y devuelve texto',
   typeof API._gpsHtmlRevision({estado:'instalado', ultimaRevision:'2026-09-02'}) === 'string');
ok('un equipo en stock no muestra revision',
   API._gpsHtmlRevision({estado:'stock'}).indexOf('—') > -1);

// ══════════════════════════════════════════════════════════════════
// La SIM se carga al asignar: en la calle el tecnico monta el equipo,
// le mete la SIM y se la entrega al cliente, todo en el mismo momento.
// ══════════════════════════════════════════════════════════════════
S.creds = [{id:'CRED-490', cli:'ANA PEREZ', modelo:'Bera', placa:'PP1', fecha:'2026-09-02', estado:'activo', mora:0, eliminado:false}];
S.gps = [
  {id:'NUEVO', estado:'stock', idGps:'19210077000', eliminado:false},
  {id:'OTRO',  estado:'stock', idGps:'19210077001', linea:'143557051', eliminado:false},
];
guardados.length = 0;
API._gpsAsignar('NUEVO');
ok('la pantalla de asignar pide la linea', $('mbd').innerHTML.indexOf('gpsa_linea') > -1);
ok('y el ICCID', $('mbd').innerHTML.indexOf('gpsa_iccid') > -1);

API._gpsElegirCred('CRED-490');
$('gpsa_linea').value   = '144999888';
$('gpsa_iccid').value   = '895804420015199999';
$('gpsa_fecha').value   = '2026-09-02';
$('gpsa_tecnico').value = 'FRANCISCO';
ok('guarda todo junto', S.saveFn() === true);

const recien = S.gps.find(g => g.id === 'NUEVO');
ok('quedo instalado', recien.estado === 'instalado');
ok('con su cliente', recien.creditoId === 'CRED-490');
ok('con su linea', recien.linea === '144999888');
ok('con su ICCID', recien.iccid === '895804420015199999');
ok('con su tecnico', recien.tecnico === 'FRANCISCO');
ok('una sola escritura, no dos pasos', guardados.length === 1);

// Una linea repetida es un error de carga: se rechaza
S.gps.push({id:'TERCERO', estado:'stock', idGps:'19210077002', eliminado:false});
API._gpsAsignar('TERCERO');
API._gpsElegirCred('CRED-490');
$('gpsa_linea').value = '143557051';   // ya la tiene OTRO
ok('rechaza una linea que ya esta en otro equipo', S.saveFn() === false);
ok('y no toca el equipo', S.gps.find(g=>g.id==='TERCERO').estado === 'stock');

// Sin SIM tambien se puede: a veces se instala y la linea se carga despues
S.creds.push({id:'CRED-491', cli:'LUIS SILVA', modelo:'Toro', fecha:'2026-09-02', estado:'activo', mora:0, eliminado:false});
API._gpsAsignar('TERCERO');
API._gpsElegirCred('CRED-491');
$('gpsa_linea').value = '';
$('gpsa_iccid').value = '';
ok('se puede asignar sin SIM todavia', S.saveFn() === true);
ok('y queda instalado igual', S.gps.find(g=>g.id==='TERCERO').estado === 'instalado');

// Si ya tenia SIM, la trae puesta para no retipearla
API._gpsAsignar('OTRO');
// Se comprueba sobre el HTML: el mock no parsea, asi que $('gpsa_linea')
// conserva lo que quedo del caso anterior.
ok('precarga la linea que ya tenia',
   $('mbd').innerHTML.indexOf('id="gpsa_linea" value="143557051"') > -1);

// ══════════════════════════════════════════════════════════════════
// BOTON DE ACTUALIZAR — el navegador no puede llamar a MiCODUS ni
// disparar el bot, asi que deja una señal que el bot recoge.
// ══════════════════════════════════════════════════════════════════
const minAtras = n => new Date(Date.now()-n*60000).toISOString();

window._gpsConfig = {};
ok('sin sincronizar dice "nunca"', API._gpsHtmlSync().indexOf('nunca') > -1);
ok('y ofrece el boton', API._gpsHtmlSync().indexOf('_gpsPedirRefresco') > -1);

window._gpsConfig = {ultimaSync: minAtras(0), ultimaSyncEquipos: 2};
ok('recien sincronizado', API._gpsHtmlSync().indexOf('hace un momento') > -1);
ok('dice cuantos equipos', API._gpsHtmlSync().indexOf('2 equipos') > -1);

window._gpsConfig = {ultimaSync: minAtras(25)};
ok('hace 25 minutos', API._gpsHtmlSync().indexOf('hace 25 min') > -1);
window._gpsConfig = {ultimaSync: minAtras(150)};
ok('hace 2 horas', API._gpsHtmlSync().indexOf('hace 2 h') > -1);
// Pedido del botón: "Buscando..." solo 15 min; si el Worker no pudo despertar al robot, vuelve el botón
window._gpsConfig = {ultimaSync: minAtras(60), refrescoPedido: true, refrescoPedidoEn: minAtras(2)};
ok('pedido reciente: "Buscando posiciones nuevas..." y sin botón', API._gpsHtmlSync().indexOf('Buscando posiciones nuevas') > -1 && API._gpsHtmlSync().indexOf('_gpsPedirRefresco') === -1);
window._gpsConfig = {ultimaSync: minAtras(60), refrescoPedido: true, refrescoPedidoEn: minAtras(20)};
ok('pedido de hace 20 min sin barrido: vuelve el botón para reintentar', API._gpsHtmlSync().indexOf('_gpsPedirRefresco') > -1 && API._gpsHtmlSync().indexOf('Buscando') === -1);
window._gpsConfig = {ultimaSync: minAtras(60), refrescoPedido: true};
ok('pedido sin hora (de antes): se muestra el botón', API._gpsHtmlSync().indexOf('_gpsPedirRefresco') > -1);
window._gpsConfig = {ultimaSync: minAtras(120), ultimoError: 'MiCODUS fallo en 3 de 3 equipos', ultimoErrorEn: minAtras(5)};
ok('si el último intento falló después del último barrido bueno, lo dice', API._gpsHtmlSync().indexOf('Último intento falló: MiCODUS fallo en 3 de 3 equipos') > -1);
window._gpsConfig = {ultimaSync: minAtras(5), ultimoError: 'viejo', ultimoErrorEn: minAtras(120)};
ok('un error viejo, ya superado por un barrido bueno, no se muestra', API._gpsHtmlSync().indexOf('Último intento falló') === -1);
window._gpsConfig = {ultimaSync: minAtras(120), ultimoError: '<b>x</b>', ultimoErrorEn: minAtras(5)};
ok('el error se muestra escapado', API._gpsHtmlSync().indexOf('&lt;b&gt;x&lt;/b&gt;') > -1);
window._gpsConfig = {ultimaSync: minAtras(60*50)};
ok('hace 2 dias', API._gpsHtmlSync().indexOf('hace 2 d') > -1);
ok('y avisa en ambar cuando lleva mucho', API._gpsHtmlSync().indexOf('var(--amber)') > -1);
window._gpsConfig = {ultimaSync: minAtras(30)};
ok('media hora todavia no alarma', API._gpsHtmlSync().indexOf('var(--amber)') === -1);

window._gpsConfig = {ultimaSync: minAtras(5), refrescoPedido: true, refrescoPedidoEn: minAtras(1)};   // el botón siempre guarda la hora del pedido
ok('con refresco pedido avisa que viene en camino',
   API._gpsHtmlSync().indexOf('Buscando posiciones nuevas') > -1);
ok('y esconde el boton para no pedirlo dos veces',
   API._gpsHtmlSync().indexOf('_gpsPedirRefresco') === -1);
window._gpsConfig = {};

// ── La URL del Worker sale de config, no del codigo ──
window._gpsConfig = {};
ok('sin Worker configurado no hay URL', API._gpsWorkerUrl() === '');
window._gpsConfig = {workerUrl: 'https://bot.pagasi.workers.dev'};
ok('arma la ruta del endpoint',
   API._gpsWorkerUrl() === 'https://bot.pagasi.workers.dev/gps-refresco');
window._gpsConfig = {workerUrl: 'https://bot.pagasi.workers.dev/'};
ok('tolera la barra al final',
   API._gpsWorkerUrl() === 'https://bot.pagasi.workers.dev/gps-refresco');
window._gpsConfig = {workerUrl: '   '};
ok('espacios en blanco no cuentan como URL', API._gpsWorkerUrl() === '');
window._gpsConfig = {};

console.log('');
console.log(pass+' pruebas OK, '+fail+' fallas');
process.exit(fail?1:0);
