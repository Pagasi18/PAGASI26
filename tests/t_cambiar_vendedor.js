// 17-nov-2026, Adam: "que salga predeterminado el nombre del usuario que hizo la solicitud, pero que
// se puedan cambiar luego si se necesita". La casilla Vendedor de la solicitud sigue saliendo con
// quien la carga; lo nuevo es que el vendedor de una venta ya guardada (y firmada) se cambia en la
// ventana Editar Crédito, y que editar un crédito viejo ya no se lo pasa a quien lo edita.
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
const avisos = [], logs = [], guardados = [];
ctx.toast = (m) => { avisos.push(String(m)); }; ctx.setMicon = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
ctx.logActividad = (a, m, t, d) => { logs.push({ a, m, t, d }); };
ctx.DB.updateCred = (id, upd) => { guardados.push({ id, upd: JSON.parse(JSON.stringify(upd)) }); return Promise.resolve(true); };
ctx.DB.getUsuarios = () => Promise.resolve([]);
ctx.getCobradoresList = () => ['Cobradora'];
const ACTIVA = { activo:true, venta:{tipo:'fijo',valor:5}, cobranza:{tipo:'fijo',valor:1} };
const cred = (id, extra) => Object.assign({ id, fecha:'2026-11-05', cli:'CLIENTE ' + id, modelo:'Owen', precio:1400, precioFinanciado:1000, cuotaQ:100, totalCuotas:12, plazo:6, pagado:0, estado:'activo', cobrador:'Cobradora', contratoFirmado:true, notas:'' }, extra || {});
function datos(rol){
  ctx.S.currentUser = { uid:'adm', nombre:'Adam', rol: rol || 'Administrador' };
  ctx._usersCache = [
    { uid:'adm', nombre:'Adam', rol:'Administrador' },
    { uid:'liz', nombre:'Liz', rol:'Vendedor', cargo:'Asesora', comisiones: JSON.parse(JSON.stringify(ACTIVA)) },
    { uid:'jefe', nombre:'Jefe', rol:'Empleado', comisiones: JSON.parse(JSON.stringify(ACTIVA)) },
    { uid:'mich', nombre:'Michelle', rol:'Vendedor', comisiones:{ activo:false } },
    { uid:'ida', nombre:'Se Fue', rol:'Vendedor', suspendido:true, comisiones: JSON.parse(JSON.stringify(ACTIVA)) }
  ];
  ctx.S.usuarios = ctx._usersCache;
  ctx.S.creds = [
    cred('M-1', { vendedorUid:'jefe', vendedorNombre:'Jefe', creadoPor:'Jefe' }),
    cred('M-2', { vendedorNombre:'liz', creadoPor:'Jefe' }),                 // viejo: sin identificador, el nombre es de Liz
    cred('M-3', { vendedorNombre:'Alguien De Antes', creadoPor:'Alguien De Antes' }),  // viejo: el nombre no es de nadie
    cred('M-4', { vendedorUid:'ida', vendedorNombre:'Se Fue' })              // su vendedora está suspendida
  ];
  ctx.S.pagos = []; ctx.S.egresos = [];
  avisos.length = 0; logs.length = 0; guardados.length = 0;
  ['ec_vendedor','ec_vendedor_nota','ec_estado','ec_cobrador','ec_fecha','ec_gps','ec_notas'].forEach(k => { delete els[k]; });
}
const abrir = id => { ctx.openEditCred(id); return els.mbd.innerHTML; };
const elegir = uid => { els.ec_vendedor = Object.assign(elemento(), { value: uid }); };
const selecc = h => (h.match(/<select class="fs" id="ec_vendedor"[^>]*>(.*?)<\/select>/) || ['', ''])[1];

// ════════ 1. La casilla en la ventana Editar Crédito ════════
datos();
let h = abrir('M-1');
ok('la ventana Editar Crédito trae la casilla Vendedor', /id="ec_vendedor"/.test(h) && /Vendedor \(para comisión\)/.test(h));
ok('...con el vendedor de hoy ya marcado', /<option value="jefe" selected>Jefe/.test(selecc(h)) && (selecc(h).match(/ selected/g) || []).length === 1);
ok('...lista a los demás usuarios con su cargo, y no a los suspendidos', /<option value="liz">Liz · Asesora<\/option>/.test(selecc(h)) && /value="mich"/.test(selecc(h)) && !/value="ida"/.test(selecc(h)));
ok('...un administrador la puede cambiar', !/id="ec_vendedor"[^>]* disabled/.test(h));
ok('...y explica de quién es la comisión', /La comisión de esta venta es de quien salga aquí\./.test(els.ec_vendedor_nota.innerHTML) && !/Solo lo cambia/.test(els.ec_vendedor_nota.innerHTML));

// ════════ 2. Cambiar el vendedor ════════
elegir('liz'); ctx.S.saveFn();
let g = guardados[0] || { upd: {} };
ok('al elegir a otra persona y guardar, el crédito queda a su nombre', g.id === 'M-1' && g.upd.vendedorUid === 'liz' && g.upd.vendedorNombre === 'Liz');
ok('...queda anotado quién estaba antes, quién lo cambió y cuándo', g.upd.vendedorNombreAntes === 'Jefe' && g.upd.vendedorCambiadoPor === 'Adam' && /^\d{4}-\d{2}-\d{2}T/.test(g.upd.vendedorCambiadoEn));
ok('...y en el registro de actividad', logs.length === 1 && logs[0].a === 'vendedor_cambiado' && logs[0].t === 'M-1' && logs[0].d.antes === 'Jefe' && logs[0].d.ahora === 'Liz');
ok('...el aviso dice el cambio', avisos.some(a => a === 'Vendedor cambiado: Jefe → Liz'));
ok('...lo demás del crédito no cambia', g.upd.estado === 'activo' && g.upd.cobrador === 'Cobradora' && g.upd.fecha === '2026-11-05');
const liz = ctx._usersCache[1], jefe = ctx._usersCache[2];
ok('la comisión pasa de una persona a la otra', ctx._comCalcGenerado(jefe).ventas.length === 0 && ctx._comCalcGenerado(liz).ventas.some(v => v.credId === 'M-1'));
ok('al volver a abrir, sale marcada la nueva vendedora', /<option value="liz" selected>/.test(selecc(abrir('M-1'))));

datos(); abrir('M-1'); elegir('jefe'); ctx.S.saveFn();
ok('si se guarda sin cambiar de vendedor, no se escribe nada del vendedor ni se registra', guardados.length === 1 && !('vendedorUid' in guardados[0].upd) && logs.length === 0 && avisos.some(a => a === 'Crédito actualizado'));
datos(); abrir('M-1'); ctx.S.saveFn();
ok('si la casilla no se tocó, igual', !('vendedorUid' in guardados[0].upd) && logs.length === 0);
datos(); abrir('M-1'); elegir('no-existe'); ctx.S.saveFn();
ok('un identificador que no es de ningún usuario no se guarda', !('vendedorUid' in guardados[0].upd));

// ════════ 3. Quién puede ════════
datos('Gerente'); h = abrir('M-1'); elegir('liz'); ctx.S.saveFn();
ok('un gerente también puede', !/id="ec_vendedor"[^>]* disabled/.test(h) && guardados[0].upd.vendedorUid === 'liz');
datos('Empleado'); h = abrir('M-1');
ok('un empleado ve quién es el vendedor, pero con la casilla cerrada', /id="ec_vendedor"[^>]* disabled/.test(h) && /<option value="jefe" selected>/.test(selecc(h)) && /Solo lo cambia un administrador o un gerente/.test(els.ec_vendedor_nota.innerHTML));
elegir('liz'); ctx.S.saveFn();
ok('...y aunque fuerce el valor, no se guarda', guardados.length === 1 && !('vendedorUid' in guardados[0].upd) && logs.length === 0);
datos('Vendedor'); abrir('M-1'); elegir('adm'); ctx.S.saveFn();
ok('un vendedor tampoco puede pasarse una venta', !('vendedorUid' in guardados[0].upd));

// ════════ 4. Créditos viejos, vendedores suspendidos y comisión apagada ════════
datos();
ok('un crédito viejo sin identificador se reconoce por el nombre (como en Comisiones)', /<option value="liz" selected>/.test(selecc(abrir('M-2'))));
ctx.S.saveFn();
ok('...y guardarlo sin tocar no escribe nada del vendedor', !('vendedorUid' in guardados[0].upd));
h = selecc(abrir('M-3'));
ok('si el nombre no es de ningún usuario, sale tal cual y marcado «sin usuario en el sistema»', /<option value="" selected>Alguien De Antes \(sin usuario en el sistema\)<\/option>/.test(h));
guardados.length = 0; elegir(''); ctx.S.saveFn();
ok('...guardarlo así no lo cambia', !('vendedorUid' in guardados[0].upd));
guardados.length = 0; abrir('M-3'); elegir('liz'); ctx.S.saveFn();
ok('...y se le puede poner una persona de verdad', guardados[0].upd.vendedorUid === 'liz' && guardados[0].upd.vendedorNombreAntes === 'Alguien De Antes');
h = selecc(abrir('M-4'));
ok('si la vendedora está suspendida, sigue saliendo marcada (no parece de otro)', /<option value="ida" selected>Se Fue · Vendedor · suspendido<\/option>/.test(h));
abrir('M-1'); elegir('mich'); ctx._credVendedorNota();
ok('al elegir a alguien con la comisión apagada, se avisa ahí mismo', /Michelle tiene la comisión apagada: la venta no le va a generar nada/.test(els.ec_vendedor_nota.innerHTML));
elegir('liz'); ctx._credVendedorNota();
ok('...y con alguien que sí gana comisión, no', !/apagada/.test(els.ec_vendedor_nota.innerHTML));
ctx.S.creds.push(cred('M-9', { vendedorUid:'liz', vendedorNombre:'<img src=x>' }));
ctx._usersCache.push({ uid:'raro', nombre:'<b>Raro</b>', rol:'Vendedor' });
ok('un nombre con código no se cuela en la lista', selecc(abrir('M-9')).indexOf('<b>Raro') < 0 && /&lt;b>Raro/.test(selecc(abrir('M-9'))));

// ════════ 5. La solicitud: sigue saliendo quien la carga; al editar, no se le pasa al que edita ════════
datos();
ctx.window._wzEditando = null; ctx.WZ.vendedorUid = '';
ok('en una solicitud nueva la casilla sale con quien la está cargando (como pidió Adam)', /<option value="adm"[^>]* selected>/.test(ctx._wzVendedorOpts()));
ctx.WZ.vendedorUid = 'liz';
ok('...y si ya se eligió a otra persona, esa', /<option value="liz"[^>]* selected>/.test(ctx._wzVendedorOpts()) && !/<option value="adm"[^>]* selected>/.test(ctx._wzVendedorOpts()));
ctx.window._wzEditando = 'M-3'; ctx.WZ.vendedorUid = '';
ok('al EDITAR un crédito viejo sin identificador, no se marca a quien edita', !/ selected/.test(ctx._wzVendedorOpts()) && /— Seleccionar vendedor —/.test(ctx._wzVendedorOpts()));
ctx.WZ.vendedorUid = 'jefe';
ok('...y al editar uno que sí lo trae, sale su vendedor', /<option value="jefe"[^>]* selected>/.test(ctx._wzVendedorOpts()));
ctx.window._wzEditando = null;
const fuente = fs.readFileSync(path.join(ROOT, 'logic/creditos.js'), 'utf8');
ok('el asistente no pone por defecto a quien edita en ninguno de sus tres puntos', (fuente.match(/window\._wzEditando \? '' : \(/g) || []).length === 2 && /!WZ\.vendedorUid && !window\._wzEditando && S\.currentUser/.test(fuente));

console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
