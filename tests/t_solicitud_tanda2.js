// 24-sep-2026, tanda 2 (Adam: "todas las solicitudes" nacen pendientes y "las aprueba
// todos"): nada nace activo; Aprobaciones la ve quien trabaja con créditos; nadie aprueba
// la suya salvo un administrador; el paso 4 ya no dice "Crédito Aprobado"; referencias
// con cédula y fiador con dirección e ingreso.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', style:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], appendChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }
const form = {}; ['mic','mtt','msb','modal-box','mbd','mft','ov'].forEach(id => form[id] = elemento());
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const avisos = [];
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;}, document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'}, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}}, fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';}, confirm(){ return true; }, open(){ return {document:{write(){},close(){}}}; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};}; ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){}; ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};}; ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = m => avisos.push(String(m)); ctx.nav = function(){}; ctx.closeM = function(){}; ctx.setMicon = function(){};
const S = ctx.S; const cr = src('logic/creditos.js'), ap = src('logic/aprobaciones.js'), cl = src('logic/clientes.js');
vm.runInContext("_cuentasBanc = [{nombre:'Binance 26'},{nombre:'100% Banco 26'}];", ctx);

// ── 1. Nacen activas (la aprobación se hizo por WhatsApp antes); solo el vendedor de concesionario va a la bandeja ──
ok('la solicitud nace activa, salvo la del vendedor de concesionario', /Vendedor Concesionario'\) \? 'pendiente_revision' : 'activo'/.test(cr));
ok('guarda la cuenta de la inicial que dijo el vendedor y su impresión', /inicialCuenta: WZ\.iniMetodo\|\|'', inicialRef: WZ\.iniRef\|\|''/.test(cr) && /impresionVendedor: WZ\.impresion/.test(cr));
ok('al guardar avisa que se envió a aprobación y lleva a la bandeja', /enviada a aprobación/.test(cr) && /hasModuleAccess\('aprobaciones'\)\) \? 'aprobaciones' : 'creditos'/.test(cr));
S.currentUser = { uid:'u', nombre:'X', rol:'Empleado' };
ok('el botón dice "Guardar solicitud" para el equipo y "Enviar a aprobación" solo para el vendedor de concesionario', /_wzVaAAprobaciones\(\) \? 'Enviar a aprobación' : 'Guardar solicitud'/.test(cr) && ctx._wzVaAAprobaciones() === false);

// ── 2. El paso 4 no aprueba ni rechaza ──
ok('ya no dice "Crédito Aprobado" ni "Crédito Rechazado"', cr.indexOf("'Crédito Aprobado'") === -1 && cr.indexOf("'Crédito Rechazado'") === -1);
vm.runInContext("WZ = { scoreMotivos:[], dir_q:'Calle 1', _chip_wz_hist_g:'bueno', r1n:'Ana', documentos:[{label:'Cédula'},{label:'Selfie con cédula'},{label:'Recibo de luz'},{label:'Estado de cuenta'}] };", ctx);
let d = ctx._wzDecisionPaso4(650);
ok('perfil completo con buen score: lista para guardar, y dice que queda activo', d.titulo === 'Lista para guardar' && d.color === 'green' && d.faltan.length === 0 && /queda activo/.test(d.detalle) && /es una guía, no decide/.test(d.detalle));
S.currentUser = { uid:'u', nombre:'X', rol:'Vendedor Concesionario' };
ok('para el vendedor de concesionario sí dice que va a Aprobaciones', ctx._wzDecisionPaso4(650).titulo === 'Lista para enviar a aprobación');
S.currentUser = { uid:'u', nombre:'X', rol:'Empleado' };
vm.runInContext("WZ = { scoreMotivos:[], documentos:[] };", ctx);
d = ctx._wzDecisionPaso4(650);
ok('dice qué falta sin bloquear', /dirección/.test(d.detalle) && /créditos anteriores/.test(d.detalle) && /una referencia/.test(d.detalle) && /los documentos/.test(d.detalle) && /se puede completar después/.test(d.detalle) && d.color === 'green');
vm.runInContext("WZ = { scoreMotivos:[], _chip_wz_impresion_g:'dudosa', documentos:[] };", ctx);
ok('si el vendedor la marcó dudosa: revisar con gerente', ctx._wzDecisionPaso4(700).titulo === 'Revisar con gerente' && /dudosa/.test(ctx._wzDecisionPaso4(700).detalle));
vm.runInContext("WZ = { scoreMotivos:['Ingreso (150) < mínimo requerido (250)'], documentos:[] };", ctx);
ok('con un motivo de rechazo automático: revisar con gerente, con el motivo', /Revisar/.test(ctx._wzDecisionPaso4(700).titulo) && /Ingreso \(150\)/.test(ctx._wzDecisionPaso4(700).detalle));
vm.runInContext("WZ = { scoreMotivos:[], documentos:[] };", ctx);
ok('score muy bajo: revisar con gerente', ctx._wzDecisionPaso4(400).titulo === 'Revisar con gerente');

// ── 3. Quién aprueba ──
const perms = r => { S.currentUser = { uid:'u', nombre:'X', rol:r, permisos: ctx.ROL_PERMISOS[r] }; return ctx.hasModuleAccess('aprobaciones'); };
ok('un empleado o vendedor que trabaja con créditos ve Aprobaciones', perms('Empleado') && perms('Vendedor') && perms('Gerente') && perms('Cobrador'));
ok('el contador no (no maneja créditos) ni el vendedor de concesionario', !perms('Contador') && !perms('Vendedor Concesionario'));
S.creds = [{ id:'M-050', cli:'CLIENTE', estado:'pendiente_revision', ini:500, inicialPct:0.5, precio:1000, vendedorUid:'u-liz', creadoPor:'Liz', inicialCuenta:'Binance 26', inicialRef:'REF-1' }];
S.currentUser = { uid:'u-liz', nombre:'Liz', rol:'Vendedor', permisos:['creditos'] }; avisos.length = 0;
ok('quien hizo la solicitud no la aprueba', ctx._aprPuedeDecidir(S.creds[0]) === false && avisos.some(a => /otra persona/.test(a)));
S.currentUser = { uid:'u-sam', nombre:'Samantha', rol:'Gerente', permisos:['creditos'] };
ok('otra persona con acceso, sí', ctx._aprPuedeDecidir(S.creds[0]) === true);
S.currentUser = { uid:'u-liz', nombre:'Liz', rol:'Administrador', permisos:[] };
ok('un administrador puede aprobar hasta la suya', ctx._aprPuedeDecidir(S.creds[0]) === true);

// ── 4. Al aprobar sale precargada la cuenta que dijo el vendedor ──
S.currentUser = { uid:'u-sam', nombre:'Samantha', rol:'Gerente', permisos:['creditos'] };
ctx._aprAprobar('M-050');
const modal = form['mbd'].innerHTML;
ok('la cuenta viene elegida y la referencia también', /value="Binance 26" selected/.test(modal) && /value="REF-1"/.test(modal));
ok('...y se dice que lo indicó el vendedor', /El vendedor indicó que la inicial entró a <b>Binance 26<\/b>/.test(modal));
S.currentUser = { uid:'u-liz', nombre:'Liz', rol:'Vendedor', permisos:['creditos'] }; form['mbd'].innerHTML = ''; avisos.length = 0;
ctx._aprAprobar('M-050');
ok('a quien la hizo no se le abre el modal', form['mbd'].innerHTML === '' && avisos.some(a => /otra persona/.test(a)));
ok('la bandeja muestra inicial, % y cuenta, y avisa si el vendedor la marcó dudosa', /inicial \$'\+/.test(ap) && /el vendedor la marcó dudosa/.test(ap));

// ── 5. Referencias con cédula, fiador con dirección e ingreso ──
ok('la solicitud pide la cédula de las dos referencias', /_inp\('wz_r1ci'/.test(cr) && /_inp\('wz_r2ci'/.test(cr));
ok('...y dirección e ingreso del fiador', /_inp\('wz_fiador_dir'/.test(cr) && /_inp\('wz_fiador_ing'/.test(cr));
ok('se guardan en el cliente y en el crédito', /ci:WZ\.r1ci\|\|''/.test(cr) && /fiador_ing: parseFloat\(WZ\.fiador_ing\)\|\|0/.test(cr) && /fiador_ing: parseFloat\(WZ\.fiador_ing\)\|\|0/.test(cl));
ok('la ficha los muestra', /field\('Dirección', c\.fiador_dir\)/.test(cl) && /field\('Ingreso mensual', \(parseFloat\(c\.fiador_ing\)/.test(cl) && /CI '\+esc\(r\.ci\)/.test(cl));

console.log('\n' + pass + ' OK · ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
