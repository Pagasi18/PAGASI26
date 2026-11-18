// 17-nov-2026, Adam: "¡que comisiones avisen!". En la primera quincena de noviembre una vendedora
// tenía 4 ventas a su nombre y la comisión apagada: no salía en el corte y esas ventas no le
// generaban nada, sin que nadie lo viera. Ahora Comisiones lo dice: en la pantalla y en el corte.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, checked:false, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, click(){} }; }
const els = {};
const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){ return ''; }, confirm(){ return true; },
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...fs.readFileSync(path.join(ROOT,'admin.html'),'utf8').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = () => {}; ctx.setMicon = () => {}; ctx.logActividad = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
ctx.hoyLocalISO = () => '2026-11-17';     // 2ª quincena de noviembre: el aviso mira del 1 al 30
ctx.S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador' };
const cred = (id, fecha, extra) => Object.assign({ id, fecha, cli: 'CLIENTE ' + id, modelo: 'Owen', precioFinanciado: 1000, estado: 'activo' }, extra || {});
const ACTIVA = { activo:true, venta:{tipo:'fijo',valor:5}, cobranza:{tipo:'fijo',valor:1} };
function datos(){
  ctx._usersCache = [
    { uid:'liz', nombre:'Liz', rol:'Vendedor', comisiones: JSON.parse(JSON.stringify(ACTIVA)) },
    { uid:'mich', nombre:'Michelle <b>', rol:'Vendedor', comisiones:{ activo:false } },          // la comisión apagada
    { uid:'adm', nombre:'Adam', rol:'Administrador' },                                           // nunca se le configuró
    { uid:'susp', nombre:'Suspendida', rol:'Vendedor', suspendido:true, comisiones: JSON.parse(JSON.stringify(ACTIVA)) }
  ];
  ctx.S.usuarios = ctx._usersCache;
  ctx.S.creds = [
    cred('M-1', '2026-11-03', { vendedorUid:'liz' }), cred('M-2', '2026-11-10', { vendedorUid:'liz' }),
    cred('M-3', '2026-11-06', { vendedorUid:'mich', vendedorNombre:'Michelle' }), cred('M-4', '2026-11-13', { vendedorUid:'mich' }),
    cred('M-5', '2026-11-13', { vendedorUid:'mich', estado:'cancelado' }),     // cancelada: no es venta
    cred('M-6', '2026-11-13', { vendedorUid:'mich', eliminado:true }),         // eliminada: tampoco
    cred('M-7', '2026-10-10', { vendedorUid:'mich' }),                         // de octubre: fuera de la ventana
    cred('M-8', '2026-11-07', { vendedorUid:'adm' }),                          // a nombre de un administrador
    cred('M-9', '2026-11-08', { vendedorUid:'ya-no-existe', vendedorNombre:'Alguien que se fue' }),
    cred('M-10', '2026-11-09', { vendedorNombre:'Nadie Conocido' }),           // crédito viejo: sin identificador y sin usuario con ese nombre
    cred('M-11', '2026-11-09', { vendedorNombre:'liz' }),                      // sin identificador pero el nombre es de Liz: sí genera
    cred('M-12', '2026-11-09', { vendedorNombre:'Usuario', creadoPor:'Liz' }), // el relleno "Usuario": vale quien lo creó
    cred('M-13', '2026-11-12', { vendedorUid:'susp' }),
    cred('M-14', '2026-11-20', { vendedorUid:'mich' })                         // de la quincena en curso
  ];
  ctx.S.pagos = []; ctx.S.egresos = [];
}

// ════════ 1. Qué ventas no generan comisión ════════
datos();
let g = ctx._comVentasSinComision('2026-11-01', '2026-11-15');
const de = n => g.find(x => x.nombre === n) || { ventas: [] };
ok('la vendedora con la comisión apagada sale con sus 2 ventas de la quincena', de('Michelle <b>').motivo === 'apagada' && de('Michelle <b>').ventas.map(v => v.credId).join() === 'M-3,M-4' && de('Michelle <b>').uid === 'mich');
ok('...sin la cancelada, la eliminada ni la de otro mes', !JSON.stringify(g).match(/M-5|M-6|M-7|M-14/));
ok('una venta a nombre de un administrador sin comisión también se avisa', de('Adam').motivo === 'apagada' && de('Adam').ventas.length === 1);
ok('un vendedor cuyo usuario ya no existe: sale con el nombre que quedó escrito', de('Alguien que se fue').motivo === 'sin_usuario' && de('Alguien que se fue').uid === '');
ok('un crédito viejo, sin identificador y con un nombre que no es de nadie', de('Nadie Conocido').motivo === 'sin_usuario');
ok('usuario suspendido: se avisa aunque tenga la comisión activa', de('Suspendida').motivo === 'suspendido');
ok('quien sí gana comisión no sale: ni por identificador, ni por nombre, ni por el relleno "Usuario"', !de('Liz').ventas.length && !JSON.stringify(g).match(/M-1"|M-2"|M-11|M-12/));
ok('son 6 ventas en 5 vendedores, primero el que tiene más', g.length === 5 && g.reduce((a, x) => a + x.ventas.length, 0) === 6 && g[0].nombre === 'Michelle <b>');
ok('coincide con lo que Comisiones le cuenta a Liz: sus 4 ventas (2 por identificador, 2 por nombre)', ctx._comCalcCorte(ctx._usersCache[0], '2026-11-01', '2026-11-15').ventas.length === 4);
ok('cada venta de la quincena está en un lado o en el otro: 4 con comisión + 6 sin = 10', 4 + 6 === ctx.S.creds.filter(c => !c.eliminado && c.estado !== 'cancelado' && c.fecha >= '2026-11-01' && c.fecha <= '2026-11-15').length);
const guardaCache = ctx._usersCache; ctx._usersCache = [];
ok('si la lista de usuarios no ha cargado, no acusa a nadie', ctx._comVentasSinComision('2026-11-01', '2026-11-15').length === 0 && ctx._comAvisoSinComisionHtml('2026-11-01', '2026-11-15', 'este corte') === '');
ctx._usersCache = guardaCache;

// ════════ 2. El recuadro en la pantalla ════════
let h = ctx._comAvisoSinComisionHtml('2026-11-01', '2026-11-15', 'este corte');
ok('el recuadro dice cuántas y de cuándo', /6 ventas de este corte no generan comisión/.test(h));
ok('...nombra a cada vendedor con su motivo y sus créditos', /2 ventas · tiene la comisión apagada/.test(h) && /M-3, M-4/.test(h) && /su usuario está suspendido/.test(h) && /no corresponde a ningún usuario/.test(h));
ok('...ofrece activar la comisión solo a quien la tiene apagada', /_comConfigRapida\('mich'\)/.test(h) && /_comConfigRapida\('adm'\)/.test(h) && (h.match(/Activar comisión/g) || []).length === 2);
ok('...y no deja pasar código en un nombre', h.indexOf('Michelle <b>') < 0 && h.indexOf('Michelle &lt;b&gt;') > -1);
ok('...explica cómo se corrige una venta mal anotada', /editando el crédito y cambiando el vendedor/.test(h));
ok('con una sola venta habla en singular', /1 venta de este corte no genera comisión/.test(ctx._comAvisoSinComisionHtml('2026-11-07', '2026-11-07', 'este corte')));
ok('sin nada que avisar no pinta nada', ctx._comAvisoSinComisionHtml('2026-09-01', '2026-09-15', 'este corte') === '');
ctx.S.creds.push(...Array.from({ length: 13 }, (_, i) => cred('X-' + i, '2026-11-11', { vendedorUid:'mich' })));
ok('con muchas ventas la lista de créditos se corta y dice cuántas más', /y 3 más/.test(ctx._comAvisoSinComisionHtml('2026-11-01', '2026-11-15', 'este corte')));
datos();

// ════════ 3. Dónde sale: pestaña Vendedores y pestaña de cortes ════════
const r = ctx._comRangoAviso();
ok('en Vendedores mira la quincena en curso y la anterior (17-nov → del 1 al 30)', r.desde === '2026-11-01' && r.hasta === '2026-11-30');
ctx.hoyLocalISO = () => '2026-11-03';
ok('...y a principio de mes, la segunda de octubre y la primera de noviembre', ctx._comRangoAviso().desde === '2026-10-16' && ctx._comRangoAviso().hasta === '2026-11-15');
ctx.hoyLocalISO = () => '2026-11-17';
ctx.window._comTab = 'vendedores';
let pant = ctx._comisionesRender();
ok('la pestaña Vendedores trae el aviso, con la venta del 20 incluida (7 ventas)', /id="com-aviso-sin"/.test(pant) && /7 ventas de esta quincena y la anterior no generan comisión/.test(pant) && /M-14/.test(pant));
ok('...antes de la tabla de vendedores', pant.indexOf('com-aviso-sin') < pant.indexOf('Vendedores y cobradores</div>'));
ctx.window._comTab = 'cortes'; ctx.window._comCorteRef = '2026-11-10';
pant = ctx._comisionesRender();
ok('la pestaña de cortes trae el aviso de ESE corte (6 ventas, sin la del 20)', /6 ventas de este corte no generan comisión/.test(pant) && !/M-14/.test(pant));
ctx.window._comCorteRef = '2026-09-10';
ok('un corte sin ventas de ese tipo no muestra aviso', !/com-aviso-sin/.test(ctx._comisionesRender()));
ctx.window._comTab = 'generadas'; ctx.window._comCorteRef = '2026-11-10';
ok('las otras pestañas quedan como estaban', !/com-aviso-sin/.test(ctx._comisionesRender()));

// ════════ 4. El corte en Excel y en PDF ════════
let libro = null, pdf = '';
ctx._xlsxDownload = (nombre, hojas) => { libro = hojas[0].rows; };
ctx._abrirVentanaImpresion = (t, html) => { pdf = html; };
ctx._comCorteExport('excel');
const fila = t => libro.findIndex(x => x[0] === t);
ok('el Excel del corte trae la sección de ventas que no generan comisión', fila('VENTAS DEL PERÍODO QUE NO GENERAN COMISIÓN') > fila('DETALLE DE OPERACIONES DEL CORTE'));
const seccion = libro.slice(fila('VENTAS DEL PERÍODO QUE NO GENERAN COMISIÓN') + 2);
ok('...con una fila por venta: vendedor, motivo, fecha, crédito, cliente y modelo', seccion.length === 6 && seccion[0].join('|') === 'Michelle <b>|tiene la comisión apagada|2026-11-06|M-3|CLIENTE M-3|Owen');
ok('...y lo de siempre sigue igual: Liz con sus 4 ventas y $20', libro.find(x => x[0] === 'Liz' && x[1] === 4 && x[2] === 20));
ctx._comCorteExport('pdf');
ok('el PDF también, sin dejar pasar código', /Ventas del período que no generan comisión/.test(pdf) && /Michelle &lt;b&gt;/.test(pdf) && pdf.indexOf('Michelle <b>') < 0 && /M-13/.test(pdf));
ctx.window._comCorteRef = '2026-09-10'; libro = null; ctx._comCorteExport('excel');
ok('un corte sin ventas de ese tipo no agrega la sección', libro && fila('VENTAS DEL PERÍODO QUE NO GENERAN COMISIÓN') < 0);

// ════════ 5. Al activar la comisión, el aviso desaparece y la venta empieza a contar ════════
ctx._usersCache[1].comisiones = JSON.parse(JSON.stringify(ACTIVA));
g = ctx._comVentasSinComision('2026-11-01', '2026-11-15');
ok('activada la comisión, la vendedora ya no sale en el aviso', !g.find(x => x.uid === 'mich') && g.reduce((a, x) => a + x.ventas.length, 0) === 4);
ok('...y sus ventas generan: 2 en la quincena, $10', ctx._comCalcCorte(ctx._usersCache[1], '2026-11-01', '2026-11-15').porVenta === 10);

console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
