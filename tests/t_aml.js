// 9-oct-2026: programa LC/FT. PAGASI es sujeto obligado de la LOCDOFT (art. 9, num. 10,
// lit. h). Se prueba la revision contra OFAC/ONU, la PEP, el efectivo para la UNIF, el
// modulo Cumplimiento y que el robot de listas entienda los archivos oficiales.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], selectedIndex:-1, appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, click(){} }; }
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const avisos = [], respuestas = { prompt:'', confirm:true };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){ return respuestas.prompt; }, confirm(){ return respuestas.confirm; },
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
const S = ctx.S;
const guardados = [];
ctx.DB.saveCliente = o => { guardados.push(JSON.parse(JSON.stringify(o))); return Promise.resolve(true); };
ctx.toast = m => { avisos.push(String(m)); };
ctx.logActividad = () => {};

// ── Normalizacion y busqueda, con una lista inventada en el formato del robot ──
ok('normaliza acentos, mayúsculas y palabras vacías', ctx.amlNorm('José de la Peña Ñúñez') === 'JOSE PENA NUNEZ');
const datos = { generado:'2026-10-09T10:00:00Z', fuentes:{'OFAC SDN':3,'ONU':1}, e:[
  ['OFAC-1','OFAC SDN','RANGEL SILVA, Henry de Jesus','VENEZUELA','Nac. 28 Aug 1961 · Venezuela',['5764952'],['RANGEL SILVA HENRY JESUS']],
  ['OFAC-2','OFAC SDN','MORENO, Carlos','VENEZUELA','',[],['MORENO CARLOS']],
  ['OFAC-3','OFAC SDN','GARCIA LOPEZ, Maria Elena','SDNTK','',['12345678'],['GARCIA LOPEZ MARIA ELENA']],
  ['ONU-1','ONU','ABU BAKR AL BAGHDADI','Al-Qaida','',[],['ABU BAKR BAGHDADI','IBRAHIM AWAD']] ] };
const L = ctx.amlPrepararListas(datos);
let r = ctx.amlBuscar('Henry de Jesús Rangel Silva', 'V-5.764.952', L);
ok('cédula de la lista + nombre: coincide por documento', r.length === 1 && r[0].tipo === 'documento' && r[0].id === 'OFAC-1');
r = ctx.amlBuscar('Henry Rangel Silva de Jesús', '', L);
ok('el nombre completo en otro orden también coincide', r.length === 1 && r[0].tipo === 'nombre');
r = ctx.amlBuscar('Carlos Alberto Moreno Pérez', 'V-20111222', L);
ok('nombre de lista de 2 palabras dentro del nombre del cliente: coincidencia parcial', r.length === 1 && r[0].tipo === 'parcial' && r[0].id === 'OFAC-2');
r = ctx.amlBuscar('Pedro Pérez', 'V-12345678', L);
ok('misma cédula pero ninguna palabra del nombre en común: no se marca', r.length === 0);
r = ctx.amlBuscar('María Pérez', 'V-12345678', L);
ok('misma cédula y el mismo primer nombre: coincide por documento', r.length === 1 && r[0].tipo === 'documento' && r[0].id === 'OFAC-3');
r = ctx.amlBuscar('Carlos Pérez', 'V-9876543', L);
ok('un nombre común con una sola palabra igual no se marca', r.length === 0);
r = ctx.amlBuscar('Ana Gómez', 'V-20333444', L);
ok('un cliente que no está en ninguna lista queda limpio', r.length === 0);

// ── El resultado en la ficha y lo que hace el oficial ──
S.currentUser = { nombre:'Adam', rol:'Administrador' };
const c = { id:'C1', nombre:'Carlos Alberto Moreno Pérez', cedula:'V-20111222' };
S.clientes = [c];
let res = ctx.amlResultado(c, ctx.amlBuscar(c.nombre, c.cedula, L), L, 'Adam');
ok('con coincidencia queda pendiente', res.resultado === 'coincidencia' && res.estado === 'pendiente' && res.listas === '2026-10-09T10:00:00Z');
c.aml_listas = res;
respuestas.prompt = 'Cédula distinta: el sancionado es V-5.123.456, nacido en 1955';
ok('el oficial la descarta con una nota', ctx.amlResolver('C1', 'descartar') === true && c.aml_listas.estado === 'descartada' && /1955/.test(c.aml_listas.nota) && c.aml_listas.resueltoPor === 'Adam');
res = ctx.amlResultado(c, ctx.amlBuscar(c.nombre, c.cedula, L), L, 'Sistema');
ok('la misma coincidencia ya descartada no vuelve a saltar en la próxima revisión', res.estado === 'descartada' && /1955/.test(res.nota));
const L2 = ctx.amlPrepararListas({ generado:'x', fuentes:{}, e: datos.e.concat([['OFAC-9','OFAC SDN','MORENO PEREZ, Carlos Alberto','VENEZUELA','',[],['MORENO PEREZ CARLOS ALBERTO']]]) });
res = ctx.amlResultado(c, ctx.amlBuscar(c.nombre, c.cedula, L2), L2, 'Sistema');
ok('si aparece una persona nueva en la lista, vuelve a pendiente', res.estado === 'pendiente' && res.coincidencias.length === 2);
respuestas.prompt = '';
c.aml_listas = res;
ok('sin nota no se resuelve', ctx.amlResolver('C1', 'confirmar') === false && c.aml_listas.estado === 'pendiente');
S.currentUser = { nombre:'María', rol:'Empleado' };
respuestas.prompt = 'es él';
ok('un empleado no puede resolver coincidencias', ctx.amlResolver('C1', 'descartar') === false && c.aml_listas.estado === 'pendiente');
const ficha = ctx._amlFichaHtml(c);
ok('la ficha avisa que no se entrega la moto', /no entregar la moto/.test(ficha) && /MORENO, Carlos/.test(ficha));
ok('...y a un empleado no le muestra los botones de resolver', !/amlResolver/.test(ficha));
S.currentUser = { nombre:'Adam', rol:'Administrador' };
ok('al oficial sí', /amlResolver\('C1','descartar'\)/.test(ctx._amlFichaHtml(c)));

// ── PEP ──
const p = { id:'C2', nombre:'Luis Prueba', cedula:'V-15000000', pep:'si', pep_detalle:'Hermano del alcalde' };
S.clientes.push(p);
ok('la ficha muestra la PEP sin aprobar', /expuesta políticamente: Hermano del alcalde/.test(ctx._amlFichaHtml(p)) && /Falta la aprobación/.test(ctx._amlFichaHtml(p)));
S.currentUser = { nombre:'María', rol:'Empleado' };
ok('un empleado no aprueba PEP', ctx.amlAprobarPep('C2') === false && !p.pep_aprobadoEn);
S.currentUser = { nombre:'Adam', rol:'Administrador' };
ok('el oficial sí, y queda quién y cuándo', ctx.amlAprobarPep('C2') === true && p.pep_aprobadoPor === 'Adam' && !!p.pep_aprobadoEn);
ok('la pregunta PEP está en el perfil del cliente (asistente, formulario y ficha)', ctx.PERFIL_EXTRA.some(f => f.k === 'pep' && f.sec === 'cliente') && ctx.PERFIL_EXTRA.some(f => f.k === 'pep_detalle'));
ok('el contrato marca PEP según la ficha', /pepSi: \(dc\.pep\|\|cli\.pep\)==='si'/.test(src('logic/contratos-protect.js')));

// ── Efectivo del mes (art. 17) ──
S.creds = [{ id:'M-1', cli:'Luis Prueba', clienteId:'C2', estado:'activo' }];
S.pagos = [
  { id:'P1', cred:'M-1', cli:'Luis Prueba', monto:420, fecha:'2026-09-28', metodo:'EFECTIVO', estado:'confirmado', esInicial:true, cobrador:'Ana' },
  { id:'P2', cred:'M-1', cli:'Luis Prueba', monto:56, fecha:'2026-09-30', metodo:'Pago móvil', estado:'confirmado' },
  { id:'P3', cred:'M-1', cli:'Luis Prueba', monto:56, fecha:'2026-09-15', metodo:'Efectivo', estado:'confirmado', eliminado:true },
  { id:'P4', cred:'M-1', cli:'Luis Prueba', monto:1200, fecha:'2026-10-05', metodo:'Efectivo', estado:'confirmado', tipo:'liquidacion', cobrador:'Ana' } ];
const ef = ctx.amlEfectivoDelMes('2026-09');
ok('el efectivo del mes trae solo pagos en efectivo, confirmados y no anulados', ef.length === 1 && ef[0].id === 'P1' && ef[0].tipo === 'Inicial' && ef[0].cedula === 'V-15000000');
const csv = ctx.amlEfectivoCSV('2026-09');
ok('el CSV para la UNIF trae cabecera y la fila', /Fecha.*Cédula.*Monto USD/.test(csv.split('\n')[0]) && /"420\.00"/.test(csv));
S.clientes.push({ id:'C3', nombre:'=HYPERLINK("x")', cedula:'1' });
S.creds.push({ id:'M-2', cli:'=HYPERLINK("x")', clienteId:'C3' }); S.pagos.push({ id:'P5', cred:'M-2', cli:'=HYPERLINK("x")', monto:10, fecha:'2026-09-10', metodo:'efectivo', estado:'confirmado' });
ok('el CSV no deja fórmulas de Excel', /"'=HYPERLINK/.test(ctx.amlEfectivoCSV('2026-09')));
const al = ctx.amlAlertas('2026-10-09');
ok('alerta: efectivo de US$ 1.000 o más', al.some(a => a.tipo === 'efectivo' && /1200\.00/.test(a.texto)));
ok('alerta: cancelación anticipada', al.some(a => a.tipo === 'liquidacion'));
ok('alerta: cliente con crédito activo que nunca se revisó contra las listas', al.some(a => a.tipo === 'sin_revision' && a.cliente === 'Luis Prueba'));

// ── El modulo ──
ok('Cumplimiento está registrado (menú, título, admin)', ctx.MODULOS.some(m => m.id === 'cumplimiento') && /cumplimiento:'Cumplimiento'/.test(src('assets/pagasi-app.js')) && /'users','cumplimiento'\]/.test(src('assets/pagasi-app.js')));
S.currentUser = { nombre:'María', rol:'Empleado' };
ok('un empleado no ve el módulo', /Solo el Oficial de Cumplimiento/.test(ctx.PG.cumplimiento()));
S.currentUser = { nombre:'Adam', rol:'Administrador' };
const h = ctx.PG.cumplimiento();
ok('el administrador ve coincidencias, PEP, efectivo y alertas', /Coincidencias en listas de sanciones/.test(h) && /Personas expuestas políticamente/.test(h) && /reporte mensual a la UNIF/.test(h) && /Alertas/.test(h));
ok('el asistente y el formulario de cliente revisan contra las listas al guardar', /amlTrasGuardarCliente\(cliente\)/.test(src('logic/creditos.js')) && /amlTrasGuardarCliente\(idx>=0 \? S\.clientes\[idx\] : obj\)/.test(src('logic/clientes.js')));

// ── El robot de listas entiende los archivos oficiales ──
const bot = require(path.join(ROOT, 'bot/listas-sanciones.js'));
const sdn = '36,"AEROCARIBBEAN AIRLINES",-0- ,"CUBA",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- \n11185,"RANGEL SILVA, Henry de Jesus","individual","VENEZUELA",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"DOB 28 Aug 1961; nationality Venezuela; Cedula No. 5764952 (Venezuela)."\n';
const alt = '11185,1,"aka","RANGEL, Henry",-0- \n';
const lo = bot.ofac(sdn, alt);
ok('robot: de OFAC toma solo personas, con cédula y alias', lo.length === 1 && lo[0].docs[0] === '5764952' && lo[0].alias[0] === 'RANGEL, Henry' && /1961/.test(lo[0].detalle));
const xml = '<CONSOLIDATED_LIST><INDIVIDUALS><INDIVIDUAL><FIRST_NAME>ABU</FIRST_NAME><SECOND_NAME>BAKR</SECOND_NAME><UN_LIST_TYPE>Al-Qaida</UN_LIST_TYPE><REFERENCE_NUMBER>QDi.299</REFERENCE_NUMBER><NATIONALITY><VALUE>Iraq</VALUE></NATIONALITY><INDIVIDUAL_ALIAS><ALIAS_NAME>IBRAHIM AWAD</ALIAS_NAME></INDIVIDUAL_ALIAS></INDIVIDUAL></INDIVIDUALS></CONSOLIDATED_LIST>';
const lu = bot.onu(xml);
ok('robot: de la ONU toma nombre, programa, nacionalidad y alias', lu.length === 1 && lu[0].id === 'ONU-QDi.299' && lu[0].nombre === 'ABU BAKR' && /Iraq/.test(lu[0].detalle) && lu[0].alias[0] === 'IBRAHIM AWAD');
ok('robot y panel normalizan igual', bot.norm('José de la Peña Ñúñez') === ctx.amlNorm('José de la Peña Ñúñez'));
const real = JSON.parse(src('data/listas-sanciones.json'));
ok('la lista real tiene OFAC y ONU con miles de personas', real.e.length > 5000 && real.fuentes['OFAC SDN'] > 1000 && real.fuentes['ONU'] > 100);
ok('la lista real trae a los sancionados de Venezuela con su cédula', real.e.filter(x => /VENEZUELA/.test(x[3]) && x[5].length).length > 100);
ok('el workflow corre cada día y solo hace commit si cambió', /cron: '30 10 \* \* \*'/.test(src('.github/workflows/listas-sanciones.yml')) && /git diff --quiet -- data\/listas-sanciones\.json/.test(src('.github/workflows/listas-sanciones.yml')));
console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode = 1;
