// 11-nov-2026, Adam: "que concesionarios compartan el saldo. Es decir, yo tengo [una marca] la
// Yaguara, Chacao y de otra zona. Y esos tres comparten el saldo. Si yo meto un anticipo a
// cualquiera de los tres, le suma a los tres. Y si sale una venta de cualquiera de ellos, se
// descuenta del saldo de los tres. Eso pasa hoy en día con un solo caso, pero a lo mejor más
// adelante va a pasar con otro". Y después: "es el mismo aliado del portal, quiero que lo crees
// y después yo elijo los concesionarios que comparten".
// Las sedes con el mismo "Grupo de aliado" llevan UN saldo. Cada anticipo y cada venta sigue
// anotado en su sede; solo cambia la suma. Se arma con casillas en "Saldos compartidos".
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function elemento(extra) {
  return Object.assign({ innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], options:[], selectedIndex:-1, appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, insertAdjacentHTML(){},
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }, extra||{});
}
const form = {};
['mtt','msb','modal-box','mbd','mft','ov','micon'].forEach(id => { form[id] = elemento(); });
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
const avisos = [];
let respuestaConfirm = true, preguntas = [];
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';}, confirm(m){ preguntas.push(String(m)); return respuestaConfirm; },
  open(){ return { document:{ write(){}, close(){} } }; },
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const html = src('admin.html');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = function(m){ avisos.push(String(m)); };
ctx.nav = function(){};
ctx.logActividad = function(){};
const guardados = [];
vm.runInContext("DB.saveConcesionario = function(c){ __guardar(c); }; DB.saveMovimiento = function(){};", Object.assign(ctx, { __guardar: c => guardados.push(JSON.parse(JSON.stringify(c))) }));
const S = ctx.S;
vm.runInContext("_cuentasBanc = [{nombre:'Binance 26'}];", ctx);
const CA = vm.runInContext('CUENTA_ANTICIPOS', ctx);
S.currentUser = { uid:'u-admin', nombre:'Adam', rol:'Administrador' };

// Tres sedes de un mismo dueño y una cuarta que no tiene nada que ver
const ant = (id, monto, fecha) => ({ id, monto, fecha, metodo:'Binance 26', cuenta:'Binance 26' });
const cred = (id, conc, fecha, extra) => Object.assign({ id, concesionarioId:conc, estado:'activo', fecha, cli:'CLIENTE '+id, modelo:'XPRESS 150', precio:1350, precioBaseReal:1350, ini:750 }, extra||{});
function datos(){
  S.concesionarios = [
    { id:'C-YAG', nombre:'MARCA La Yaguara', ciudad:'Caracas', anticipos:[ant('ANT-1', 5000, '2026-11-01')] },
    { id:'C-CHA', nombre:'MARCA Chacao',     ciudad:'Caracas', anticipos:[ant('ANT-2', 1000, '2026-11-03')] },
    { id:'C-OTR', nombre:'MARCA Otra Zona',  ciudad:'Valencia', anticipos:[] },
    { id:'C-TOR', nombre:'MOTOS TORO',       ciudad:'Caracas', anticipos:[ant('ANT-9', 2000, '2026-11-02')] },
    { id:'C-BOR', nombre:'SEDE BORRADA',     eliminado:true, grupoAliado:'MARCA', anticipos:[ant('ANT-X', 99999, '2026-11-01')] },
  ];
  S.creds = [
    cred('M-1', 'C-YAG', '2026-11-04'),                       // Pagasi puso 600
    cred('M-2', 'C-CHA', '2026-11-05'), cred('M-3', 'C-CHA', '2026-11-06'), cred('M-4', 'C-CHA', '2026-11-07'),   // 1.800: Chacao sola queda en −800
    cred('M-5', 'C-OTR', '2026-11-08'),                       // 600, sin ningún anticipo propio
    cred('M-6', 'C-TOR', '2026-11-05'),
    cred('M-7', 'C-YAG', '2026-11-09', { estado:'cancelado' }),
  ];
  // Lo mismo en Cuentas: cada anticipo entró a "Anticipos en concesionarios" y cada moto salió de ahí
  S.movimientos = [
    { id:'MOV-ANT-ANT-1', tipo:'transferencia', monto:5000, cuentaOrigen:'Binance 26', cuentaDestino:CA, concesionarioId:'C-YAG', fecha:'2026-11-01' },
    { id:'MOV-ANT-ANT-2', tipo:'transferencia', monto:1000, cuentaOrigen:'Binance 26', cuentaDestino:CA, concesionarioId:'C-CHA', fecha:'2026-11-03' },
    { id:'MOV-ANT-ANT-9', tipo:'transferencia', monto:2000, cuentaOrigen:'Binance 26', cuentaDestino:CA, concesionarioId:'C-TOR', fecha:'2026-11-02' },
  ].concat(S.creds.filter(c => c.estado !== 'cancelado').map(c => ({ id:'MOV-'+c.id, tipo:'retiro', monto:600, cuentaOrigen:CA, concesionarioId:c.concesionarioId, fecha:c.fecha })));
  S.motos = []; S.egresos = []; S.pagos = []; S.clientes = [];
}
const fin = id => ctx._concFinanzasDe(id);
const grupo = (nombre, ids) => S.concesionarios.forEach(c => { if (ids.indexOf(c.id) > -1) c.grupoAliado = nombre; });
const TRES = ['C-YAG', 'C-CHA', 'C-OTR'];

// ════════ 1. Sin grupo todo sigue como estaba ════════
datos();
ok('sin grupo, cada sede lleva su saldo: La Yaguara 4.400, Chacao −800, Otra Zona −600, Toro 1.400',
  fin('C-YAG').saldo === 4400 && fin('C-CHA').saldo === -800 && fin('C-OTR').saldo === -600 && fin('C-TOR').saldo === 1400);
ok('...y no dicen que comparten nada', TRES.every(id => fin(id).compartido === false && fin(id).grupo === '' && fin(id).sedes.join() === id));
ok('...en Cuentas, lo mismo', ctx.saldoAnticipoDe('C-YAG') === 4400 && ctx.saldoAnticipoDe('C-CHA') === -800 && ctx.saldoAnticipoDe('C-OTR') === -600);
ok('...lo propio viene aparte y es igual a lo de siempre', fin('C-YAG').propio.enviado === 5000 && fin('C-YAG').propio.consumido === 600 && fin('C-YAG').propio.saldo === 4400);

// ════════ 2. Las tres comparten: un solo saldo ════════
grupo('MARCA', TRES);
ok('las tres sedes ven el mismo saldo: 6.000 enviados − 3.000 en motos = 3.000', TRES.every(id => fin(id).saldo === 3000 && fin(id).enviado === 6000 && fin(id).consumido === 3000));
ok('...es la suma de lo que cada una tenía (4.400 − 800 − 600): no aparece ni se pierde dinero', 4400 - 800 - 600 === fin('C-CHA').saldo);
ok('...dicen que comparten, con quién y cómo se llama el grupo', TRES.every(id => fin(id).compartido === true && fin(id).grupo === 'MARCA' && fin(id).sedes.slice().sort().join() === 'C-CHA,C-OTR,C-YAG'));
ok('...traen los anticipos y las motos de todo el grupo (la cancelada no cuenta)', fin('C-OTR').anticipos.length === 2 && fin('C-OTR').creds.length === 5 && fin('C-OTR').creds.every(c => c.estado !== 'cancelado'));
ok('...y lo de cada sede sola sigue ahí para los totales', fin('C-CHA').propio.enviado === 1000 && fin('C-CHA').propio.consumido === 1800 && fin('C-CHA').propio.saldo === -800);
ok('la sede que no es del grupo no se entera', fin('C-TOR').saldo === 1400 && fin('C-TOR').compartido === false);
ok('una sede borrada con el mismo nombre de grupo no mete su dinero', fin('C-YAG').enviado === 6000 && fin('C-YAG').sedes.indexOf('C-BOR') < 0);
ok('Cuentas dice lo mismo que Concesionarios para las tres', TRES.every(id => ctx.saldoAnticipoDe(id) === 3000) && ctx.saldoAnticipoDe('C-TOR') === 1400);

// "si yo meto un anticipo a cualquiera de los tres, le suma a los tres"
S.concesionarios.find(c => c.id === 'C-OTR').anticipos.push(ant('ANT-3', 2500, '2026-11-10'));
S.movimientos.push({ id:'MOV-ANT-ANT-3', tipo:'transferencia', monto:2500, cuentaOrigen:'Binance 26', cuentaDestino:CA, concesionarioId:'C-OTR', fecha:'2026-11-10' });
ok('un anticipo de 2.500 a Otra Zona le suma a las tres: 5.500', TRES.every(id => fin(id).saldo === 5500 && ctx.saldoAnticipoDe(id) === 5500));
ok('...y queda anotado en Otra Zona, no repartido', fin('C-OTR').propio.enviado === 2500 && fin('C-YAG').propio.enviado === 5000 && fin('C-CHA').propio.enviado === 1000);
// "si sale una venta de cualquiera de ellos, se descuenta del saldo de los tres"
S.creds.push(cred('M-8', 'C-CHA', '2026-11-11'));
S.movimientos.push({ id:'MOV-M-8', tipo:'retiro', monto:600, cuentaOrigen:CA, concesionarioId:'C-CHA', fecha:'2026-11-11' });
ok('una venta en Chacao (Pagasi pone 600) se descuenta a las tres: 4.900', TRES.every(id => fin(id).saldo === 4900 && ctx.saldoAnticipoDe(id) === 4900));
ok('...y la venta sigue siendo de Chacao', fin('C-CHA').propio.consumido === 2400 && fin('C-YAG').propio.consumido === 600);

// La solicitud: lo que "le queda" después de la moto mira el saldo del grupo
vm.runInContext("WZ = { concesionarioId:'C-CHA', iniMetodo:'Binance 26' };", ctx);
const plan = ctx._wzPlanPagoMoto(1350, 750);
ok('en la solicitud, una moto de Chacao sale del anticipo de Chacao...', plan.filas[1].cuenta === 'ANT:C-CHA' && plan.filas[1].monto === 600);
ok('...y la cuenta de lo que queda es la del grupo: 4.900 − 600 = 4.300 (Chacao sola estaría debiendo)', plan.saldoAnticipo === 4900 && plan.quedaAnticipo === 4300 && plan.quedaDebiendo === false);
ok('...el aviso de la solicitud dice que el saldo es compartido', /saldo compartido del grupo <b>MARCA<\/b>/.test(ctx._wzPagoMotoHtml(1350, 750)) && /Le quedan .* al grupo/.test(ctx._wzPagoMotoHtml(1350, 750)));
vm.runInContext("WZ.concesionarioId = 'C-TOR';", ctx);
ok('...y en una sede suelta no dice nada de grupos', !/compartido/.test(ctx._wzPagoMotoHtml(1350, 750)));
const conSaldo = ctx.anticiposConSaldo();
ok('la lista de anticipos con saldo avisa cuáles son compartidos, para que nadie los sume',
  conSaldo.filter(a => a.grupo === 'MARCA').length === 3 && conSaldo.filter(a => a.grupo === 'MARCA').every(a => a.saldo === 4900) && conSaldo.find(a => a.id === 'C-TOR').grupo === '');
ok('...y el desplegable lo escribe', /compartido del grupo MARCA/.test(ctx._mpagoMetodosOpts()) && /Anticipo — MOTOS TORO \(\$?[\d.,]+ disponible\)/.test(ctx._mpagoMetodosOpts()));

// ════════ 3. El nombre del grupo: mayúsculas, espacios y tildes no parten el grupo ════════
datos(); grupo('MARCA', ['C-YAG']); grupo(' marca ', ['C-CHA']); grupo('Márca', ['C-OTR']);
ok('"MARCA", " marca " y "Márca" son el mismo grupo', TRES.every(id => fin(id).compartido && fin(id).saldo === 3000));
const R = require(path.join(ROOT, 'bot', 'aliados-resumen.js'));
ok('...con la misma regla que usa el robot del portal', ['EK', 'Grupo Bera · Chacao', ' ék  motos '].every(n => 'G-' + ctx._concGrupoClave(n) === R.grupoIdDe(n)));
ok('los grupos que el portal ya junta por su cuenta son los mismos que aquí se ofrecen', JSON.stringify(ctx.CONC_GRUPOS_PORTAL) === JSON.stringify(R.GRUPOS_POR_DEFECTO));
datos(); grupo('MARCA', ['C-YAG']);
ok('un grupo de una sola sede no comparte con nadie', fin('C-YAG').compartido === false && fin('C-YAG').saldo === 4400);

// ════════ 4. La pantalla: tabla, detalle, anticipo, total y reporte ════════
datos(); grupo('MARCA', TRES);
const tabla = ctx._concRender();
ok('la tabla marca las tres sedes como compartidas', (tabla.match(/⇄ compartido · MARCA/g) || []).length === 3);
ok('...y tiene el botón de Saldos compartidos', /_concAbrirGrupos\(\)/.test(tabla) && /Saldos compartidos/.test(tabla));
const f$ = n => ctx.fmt(n);
ok('...el TOTAL no cuenta nada dos veces: 8.000 enviados, 3.600 consumidos, 4.400 de saldo',
  tabla.indexOf('>TOTAL<') > -1 && tabla.slice(tabla.indexOf('>TOTAL<')).indexOf(f$(8000)) > -1 && tabla.slice(tabla.indexOf('>TOTAL<')).indexOf(f$(3600)) > -1 && tabla.slice(tabla.indexOf('>TOTAL<')).indexOf(f$(4400)) > -1);

ctx._concAbrirDetalle('C-OTR');
let cuerpo = form.mbd.innerHTML;
ok('el detalle de una sede del grupo dice que el saldo es compartido y con quién', /Saldo compartido · MARCA/.test(cuerpo) && /MARCA La Yaguara, MARCA Chacao/.test(cuerpo) && /grupo MARCA/.test(form.msb.textContent));
ok('...muestra el saldo del grupo', cuerpo.indexOf(f$(3000)) > -1 && /a favor del grupo/.test(cuerpo));
ok('...el historial trae lo de las tres sedes, cada línea con su sede', (cuerpo.match(/<th>Sede<\/th>/g) || []).length === 3 && /ANT-1|Anticipo · Binance 26/.test(cuerpo) && ['M-1','M-2','M-5'].every(id => cuerpo.indexOf(id) > -1));
ok('...y no se cuela la sede que no es del grupo', cuerpo.indexOf('M-6') < 0 && cuerpo.indexOf('MOTOS TORO') < 0);
ok('...el anticipo de otra sede del grupo se borra de SU sede', /_concDelAnticipo\('C-YAG','ANT-1'\)/.test(cuerpo) && /_concDelAnticipo\('C-CHA','ANT-2'\)/.test(cuerpo));
ok('...y dice cuánto es de esta sede sola', /De esta sede sola: enviado/.test(cuerpo));
ctx._concAbrirDetalle('C-TOR');
ok('el detalle de una sede suelta queda como estaba', !/compartido/i.test(form.mbd.innerHTML) && !/<th>Sede<\/th>/.test(form.mbd.innerHTML) && form.msb.textContent === 'Detalle del concesionario · saldo y movimientos');

ctx._concOpenAnticipo('C-CHA');
ok('al registrar un anticipo se ve el saldo del grupo, no el de la sede sola', form.msb.textContent.indexOf(f$(3000)) > -1 && /compartido del grupo MARCA/.test(form.msb.textContent) && /le suma al saldo de todo el grupo/.test(form.mbd.innerHTML));
ctx._concOpenAnticipo('C-TOR');
ok('...en una sede suelta, el suyo y sin avisos', form.msb.textContent === 'Saldo actual: ' + f$(1400) && !/compartido/.test(form.mbd.innerHTML));

ctx._concAbrirDetalleTotal();
cuerpo = form.mbd.innerHTML;
ok('el detalle total suma cada cosa una sola vez (8.000 / 3.600 / 4.400)', cuerpo.indexOf(f$(8000)) > -1 && cuerpo.indexOf(f$(3600)) > -1 && cuerpo.indexOf(f$(4400)) > -1 && cuerpo.indexOf(f$(18000)) < 0);
ok('...y marca el saldo compartido en las tres sedes', (cuerpo.match(/⇄ compartido · MARCA/g) || []).length === 3);

// Reporte: las motos y anticipos son los de ESA sede; el saldo, el del grupo, con su desglose
let libro = null;
ctx._xlsxDownload = (nombre, hojas) => { libro = hojas[0].rows; };
form.crep_tipo = elemento({ value:'rango' }); form.crep_fecha = elemento({ value:'2026-11-11' });
form.crep_desde = elemento({ value:'2026-11-01' }); form.crep_hasta = elemento({ value:'2026-11-30' });
ctx._concGenerarReporte('C-CHA', 'excel');
const filaDe = t => (libro || []).find(r => String(r[0]).indexOf(t) === 0) || [];
ok('el Excel de Chacao lista solo las motos de Chacao', libro.filter(r => /^M-\d/.test(String(r[0]))).map(r => r[0]).join() === 'M-2,M-3,M-4');
ok('...con el saldo compartido del grupo (3.000) en vez del de la sede sola (−800)', filaDe('— SALDO COMPARTIDO DEL GRUPO MARCA —')[1] === 3000 && !libro.some(r => /SALDO GLOBAL DE LA SEDE/.test(String(r[0]))));
ok('...y lo que pone cada sede, que suma el saldo del grupo',
  filaDe('MARCA La Yaguara')[3] === 4400 && filaDe('MARCA Chacao')[3] === -800 && filaDe('MARCA Otra Zona')[3] === -600 && filaDe('TOTAL DEL GRUPO')[3] === 3000);
ctx._concGenerarReporte('C-TOR', 'excel');
ok('el Excel de una sede suelta queda como estaba', filaDe('— SALDO GLOBAL DE LA SEDE —')[1] === 1400 && !libro.some(r => /COMPARTIDO/.test(String(r[0]))));
let pdf = '';
ctx._abrirVentanaImpresion = (t, h) => { pdf = h; };
ctx._concGenerarReporte('C-CHA', 'pdf');
ok('el PDF de Chacao también: saldo del grupo y desglose por sede', /Saldo compartido del grupo MARCA/.test(pdf) && /TOTAL DEL GRUPO/.test(pdf) && pdf.indexOf('$3000.00') > -1 && pdf.indexOf('M-1<') < 0);

// ════════ 5. La ventana "Saldos compartidos": Adam elige las sedes ════════
datos(); guardados.length = 0; avisos.length = 0;
ctx._concAbrirGrupos();
ok('sin grupos, la ventana lo dice y ofrece crear uno', /Todavía ninguna sede comparte saldo/.test(form.mbd.innerHTML) && /_concGrupoEditar\(''\)/.test(form.mft.innerHTML));
ctx._concGrupoEditar('');
ok('el grupo nuevo lista las sedes con casillas (la borrada no) y el saldo de cada una',
  (form.mbd.innerHTML.match(/class="cgr-chk"/g) || []).length === 4 && form.mbd.innerHTML.indexOf('SEDE BORRADA') < 0 && form.mbd.innerHTML.indexOf(f$(4400)) > -1);
form.cgr_nombre = elemento({ value:'' }); form.cgr_resumen = elemento();
ctx._concGrupoMarcar('C-YAG', true);
ok('con una sola sede marcada pide al menos dos', /al menos <b>dos<\/b>/.test(form.cgr_resumen.innerHTML));
ctx._concGrupoMarcar('C-CHA', true); ctx._concGrupoMarcar('C-OTR', true);
ok('al marcar las tres, enseña el saldo que va a tener el grupo antes de guardar', form.cgr_resumen.innerHTML.indexOf(f$(3000)) > -1 && /No se mueve dinero/.test(form.cgr_resumen.innerHTML));
ctx._concGrupoGuardar();
ok('sin nombre no guarda', guardados.length === 0 && avisos.some(a => /nombre al grupo/.test(a)));
form.cgr_nombre.value = 'Marca';
ctx._concGrupoMarcar('C-CHA', false); ctx._concGrupoMarcar('C-OTR', false);
ctx._concGrupoGuardar();
ok('con una sola sede tampoco', guardados.length === 0 && avisos.some(a => /al menos dos sedes/.test(a)));
ctx._concGrupoMarcar('C-CHA', true); ctx._concGrupoMarcar('C-OTR', true);
const antesAnt = JSON.stringify(S.concesionarios.map(c => c.anticipos)), antesCreds = JSON.stringify(S.creds), antesMovs = JSON.stringify(S.movimientos);
ctx._concGrupoGuardar();
ok('guardar escribe el grupo en las tres sedes y en ninguna más', guardados.length === 3 && guardados.every(c => c.grupoAliado === 'Marca') && guardados.map(c => c.id).sort().join() === 'C-CHA,C-OTR,C-YAG' && !S.concesionarios.find(c => c.id === 'C-TOR').grupoAliado);
ok('...no toca ningún anticipo, crédito ni movimiento', JSON.stringify(S.concesionarios.map(c => c.anticipos)) === antesAnt && JSON.stringify(S.creds) === antesCreds && JSON.stringify(S.movimientos) === antesMovs);
ok('...y desde ese momento comparten', TRES.every(id => fin(id).saldo === 3000 && ctx.saldoAnticipoDe(id) === 3000));
ok('...la ventana vuelve a la lista con el grupo y su saldo', /⇄ Marca/.test(form.mbd.innerHTML) && form.mbd.innerHTML.indexOf(f$(3000)) > -1 && /3 sedes/.test(form.mbd.innerHTML));

// Cambiar las sedes: sale una, entra otra
guardados.length = 0;
ctx._concGrupoEditar('MARCA');
ok('al abrir el grupo vienen marcadas sus sedes y con su nombre', form.mtt.textContent === 'Grupo Marca' && (form.mbd.innerHTML.match(/class="cgr-chk" value="[^"]*" checked/g) || []).length === 3);
form.cgr_nombre.value = 'Marca';
ctx._concGrupoMarcar('C-OTR', false); ctx._concGrupoMarcar('C-TOR', true);
ctx._concGrupoGuardar();
ok('la que se desmarca vuelve a su saldo propio y la nueva entra', !S.concesionarios.find(c => c.id === 'C-OTR').grupoAliado && S.concesionarios.find(c => c.id === 'C-TOR').grupoAliado === 'Marca'
  && fin('C-OTR').compartido === false && fin('C-OTR').saldo === -600 && fin('C-TOR').saldo === 4400 - 800 + 1400);
ok('...solo se guardan las dos que cambiaron', guardados.map(c => c.id).sort().join() === 'C-OTR,C-TOR');

// Otro grupo con el mismo nombre no se puede crear por error
guardados.length = 0; avisos.length = 0;
ctx._concGrupoEditar('');
form.cgr_nombre.value = ' marca ';
ctx._concGrupoMarcar('C-OTR', true); ctx._concGrupoMarcar('C-YAG', true);
ctx._concGrupoGuardar();
ok('un grupo nuevo con el nombre de uno que ya existe no se guarda', guardados.length === 0 && avisos.some(a => /Ya hay un grupo con ese nombre/.test(a)));
// Una sede que ya está en otro grupo: se avisa, y al marcarla se pasa
ctx._concGrupoEditar('');
ok('en un grupo nuevo, la sede que ya está en otro lo dice', /Hoy está en el grupo Marca: si la marcas, pasa a este/.test(form.mbd.innerHTML));

// Deshacer
guardados.length = 0; preguntas = []; respuestaConfirm = false;
ctx._concGrupoDeshacer('MARCA');
ok('deshacer pregunta primero, y si se dice que no, no cambia nada', preguntas.length === 1 && /Deshacer el grupo "Marca"/.test(preguntas[0]) && guardados.length === 0 && fin('C-YAG').compartido === true);
respuestaConfirm = true;
ctx._concGrupoDeshacer('MARCA');
ok('al deshacer, cada sede vuelve a su saldo de siempre', guardados.length === 3 && guardados.every(c => c.grupoAliado === '')
  && fin('C-YAG').saldo === 4400 && fin('C-CHA').saldo === -800 && fin('C-TOR').saldo === 1400 && [fin('C-YAG'), fin('C-CHA'), fin('C-TOR')].every(f => !f.compartido));
ok('...y los anticipos y créditos siguen intactos', JSON.stringify(S.concesionarios.map(c => c.anticipos)) === antesAnt && JSON.stringify(S.creds) === antesCreds);

// Las sedes que el portal ya junta por su cuenta se OFRECEN, no se juntan solas
datos();
const fijas = R.GRUPOS_POR_DEFECTO.EK;
fijas.forEach((id, i) => S.concesionarios.push({ id, nombre:'EK SEDE ' + (i + 1), anticipos: i === 0 ? [ant('ANT-EK', 900, '2026-11-01')] : [] }));
ok('las sedes que el portal junta por su lista fija NO comparten saldo solas', fijas.every(id => fin(id).compartido === false) && fin(fijas[0]).saldo === 900 && fin(fijas[1]).saldo === 0);
ctx._concAbrirGrupos();
ok('...la ventana las ofrece con un botón', /En el portal ya salen como un solo aliado/.test(form.mbd.innerHTML) && /EK SEDE 1, EK SEDE 2, EK SEDE 3/.test(form.mbd.innerHTML));
ctx._concGrupoEditar('', 0);
ok('...que abre el grupo ya armado con su nombre, y Adam decide si lo guarda', form.mbd.innerHTML.indexOf('value="EK"') > -1 && (form.mbd.innerHTML.match(/class="cgr-chk" value="[^"]*" checked/g) || []).length === 3 && fijas.every(id => fin(id).compartido === false));
form.cgr_nombre.value = 'EK'; guardados.length = 0;
ctx._concGrupoGuardar();
ok('...al guardar comparten, y ya no se vuelve a ofrecer', guardados.length === 3 && fijas.every(id => fin(id).saldo === 900) && !/En el portal ya salen/.test(form.mbd.innerHTML));

// ════════ 6. La ficha de la sede sigue mostrando el grupo ════════
const cs = src('logic/concesionarios.js');
ok('el campo "Grupo de aliado" sigue en la ficha y explica que comparte el saldo', /id="conc_grupo"/.test(cs) && /comparten el saldo y son un solo aliado en el portal/.test(cs));
ok('las Reglas no cambian: el grupo es un campo de la sede, que el equipo ya puede guardar', /match \/concesionarios\/\{id\}/.test(src('firestore.rules')));

// ════════ 7. El portal de aliados: un solo saldo también en la pestaña de cada sede ════════
const pctx = { window: {}, document: { getElementById(){ return null; }, querySelectorAll(){ return []; } }, console, matchMedia: null, requestAnimationFrame: null };
pctx.window = pctx; vm.createContext(pctx);
vm.runInContext(src('aliados/portal.js'), pctx, { filename: 'portal.js' });
const HOY = '2026-11-11';
const credP = (id, conc, fecha) => ({ id, concesionarioId: conc, cli: 'ANA LÓPEZ', marca: 'EK', modelo: 'XPRESS 150', precio: 1350, precioBaseReal: 1350, ini: 750, fin: 600, estado: 'activo', fecha, creado: fecha + 'T12:00:00.000Z' });
const porEmpresa = { '26': {
  concesionarios: [
    { id: 'C-YAG', nombre: 'MARCA La Yaguara', ciudad: 'Caracas', grupoAliado: 'MARCA', anticipos: [{ fecha: '2026-11-01', monto: 5000 }] },
    { id: 'C-CHA', nombre: 'MARCA Chacao', ciudad: 'Caracas', grupoAliado: 'MARCA', anticipos: [{ fecha: '2026-11-03', monto: 1000 }] },
    { id: 'C-OTR', nombre: 'MARCA Otra Zona', ciudad: 'Valencia', grupoAliado: 'MARCA', anticipos: [] } ],
  creditos: [credP('M-1', 'C-YAG', '2026-11-04'), credP('M-2', 'C-CHA', '2026-11-05'), credP('M-3', 'C-CHA', '2026-11-06'), credP('M-4', 'C-CHA', '2026-11-07'), credP('M-5', 'C-OTR', '2026-11-08')],
  pagos: [] } };
const sedesP = R.armarSedes(porEmpresa), gruposP = R.armarGrupos(sedesP);
const resP = {}; Object.keys(sedesP).forEach(id => { resP[id] = R.resumenSede(sedesP[id], HOY); });
const resGr = {}; Object.keys(gruposP).forEach(g => { resGr[g] = Object.assign(R.resumenSede(gruposP[g], HOY), { tipo: 'grupo', sedes: gruposP[g].sedes }); });
R.rankingAliados(resP, resGr, sedesP);
const gdoc = Object.assign({ concId: 'G-MARCA', actualizadoEn: HOY + 'T14:05:00.000Z', hoy: HOY }, resGr['G-MARCA']);
ok('el robot: el grupo lleva 6.000 − 3.000 = 3.000 y cada movimiento dice de qué sede es',
  gdoc.deposito.saldo === 3000 && gdoc.deposito.movimientos.length === 7 && gdoc.deposito.movimientos.every(m => TRES.indexOf(m.sede) > -1));
ok('...el saldo corrido es el del grupo (la última línea termina en 3.000)', gdoc.deposito.movimientos[0].saldo === 3000 && gdoc.deposito.movimientos[0].sede === 'C-OTR');
ok('...y un grupo guarda las líneas de todas sus sedes (15 por sede)', (function(){
  const muchos = { nombre:'G', sedes:['a','b','c'], creditos:[], anticipos: Array.from({ length: 50 }, (_, i) => ({ empresa:'26', fecha:'2026-10-' + String(1 + (i % 28)).padStart(2, '0'), monto: 10, sede: 'a' })) };
  return R.resumenSede(muchos, HOY).deposito.movimientos.length === 45 && R.resumenSede(Object.assign({}, muchos, { sedes: undefined }), HOY).deposito.movimientos.length === 15; })());
const docsP = TRES.map(id => Object.assign({ concId: id, actualizadoEn: HOY + 'T14:05:00.000Z', hoy: HOY }, resP[id]));
const P = pctx.PortalAliados.desdeResumenes(docsP, { nombre: 'Dueño', grupo: '', logoAliado: '' }, gdoc);
ok('el portal: en la pestaña de cada sede se ve el saldo del grupo (Chacao sola diría −800)', TRES.every(id => P.SEDES[id].saldo === 3000 && P.SEDES[id].dep === 6000 && P.SEDES[id].saldoCompartido === true) && P.SEDES.todas.saldo === 3000);
ok('...los movimientos traen el saldo corrido del grupo y la sede de cada línea', P.MOVS.length === 7 && P.MOVS[0][4] === 3000 && P.MOVS[0][1] === 'C-OTR' && P.MOVS.every(m => TRES.indexOf(m[1]) > -1));
ok('...lo demás de cada sede (motos, volumen) sigue siendo lo suyo', P.SEDES['C-CHA'].motos === 3 && P.SEDES['C-YAG'].motos === 1 && P.SEDES.todas.motos === 5);
// Un resumen de grupo viejo (escrito antes de este cambio) no trae la sede en cada línea
const viejo = JSON.parse(JSON.stringify(gdoc)); viejo.deposito.movimientos.forEach(m => { delete m.sede; });
const PV = pctx.PortalAliados.desdeResumenes(docsP, { nombre: 'Dueño' }, viejo);
ok('...con un resumen anterior al cambio no se rompe: las líneas salen como del grupo', PV.MOVS.length === 7 && PV.MOVS.every(m => m[1] === 'todas') && PV.SEDES['C-CHA'].saldo === 3000);
const PS = pctx.PortalAliados.desdeResumenes(docsP, { nombre: 'Dueño' });
ok('...y sin grupo cada sede sigue con su saldo', PS.SEDES['C-CHA'].saldo === -800 && PS.SEDES['C-YAG'].saldo === 4400 && !PS.SEDES['C-CHA'].saldoCompartido && PS.esGrupo === false);
ok('el portal avisa en la pestaña de la sede que el saldo es compartido', /saldo compartido entre tus sedes/.test(src('aliados/portal.js')));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
