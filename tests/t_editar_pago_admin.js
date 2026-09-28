// 28-sep-2026, Adam: "Eso de editar en Cobranza tiene la seguridad de que unicamente los
// administradores podemos editar eso, ¿no?". No la tenia: cualquiera con Cobranza veia el
// boton Editar y la base aceptaba el cambio de monto. Ahora el boton, la funcion y las
// Reglas (cambiaDineroPago) lo dejan solo al administrador.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], selectedIndex:-1, appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }
const form = {};
const doc = { getElementById(id){ return form[id] || (form[id] = elemento()); }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const avisos = [];
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';}, confirm(){ return true; },
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
const S = ctx.S;
ctx.toast = (m) => { avisos.push(String(m)); };
S.pagos = [{ id:'PAG-1', cred:'M-041', cli:'PASTOR PRUEBA', monto:497, fecha:'2026-09-28', metodo:'Efectivo', estado:'confirmado', esInicial:true }];
S.creds = [{ id:'M-041', cli:'PASTOR PRUEBA', estado:'activo', ini:420 }];
S.movimientos = []; S.facturas = []; S.clientes = [];

// ── La funcion no abre para un empleado ──
S.currentUser = { nombre:'María', rol:'Empleado', permisos:['dash','cobranza','pagos'] };
let abrio = false; ctx.setMicon = () => { abrio = true; };
ctx.openEditPago('PAG-1');
ok('un empleado no abre la edición del pago', abrio === false && avisos.some(a => /Solo un administrador puede editar un pago/.test(a)));
S.currentUser = { nombre:'Gerente', rol:'Gerente', permisos:['dash','cobranza','pagos','reportes'] };
abrio = false; avisos.length = 0; ctx.openEditPago('PAG-1');
ok('un gerente tampoco', abrio === false && avisos.length === 1);
S.currentUser = { nombre:'Adam', rol:'Administrador', permisos:['dash','cobranza','pagos','perm_delete'] };
abrio = false; avisos.length = 0; ctx.openEditPago('PAG-1');
ok('el administrador sí', abrio === true && avisos.length === 0);

// ── El boton Editar solo se pinta para el administrador ──
const mod = src('modules/pagos.js');
ok('la pantalla de Cobranza pinta "Editar" solo si isAdminUser()', /\$\{isAdminUser\(\)\?`<button class="btn btn-p btn-xs" onclick="openEditPago\('\$\{p\.id\}'\)"/.test(mod));

// ── La oferta de corregir la inicial al editar el credito respeta el permiso ──
S.currentUser = { nombre:'María', rol:'Empleado', permisos:['dash','creditos','pagos'] };
avisos.length = 0;
const r = ctx._wzOfrecerCorregirInicial('M-041', 497, 420);
ok('a un empleado no se le ofrece corregir el pago: se le dice que lo haga un administrador', r === false && S.pagos[0].monto === 497 && avisos.some(a => /solo un administrador puede corregir ese pago/.test(a)));

// ── Las Reglas ──
const reglas = src('firestore.rules');
ok('las Reglas tienen cambiaDineroPago con monto, fecha, cuenta y crédito', /function cambiaDineroPago\(\)[\s\S]{0,300}hasAny\(\['monto', 'fecha', 'metodo', 'cuenta', 'cred', 'cli', 'tasaBs'\]\)/.test(reglas));
ok('...y el update de /pagos exige admin cuando cambia el dinero', /match \/pagos\/\{id\}[\s\S]{0,400}allow update: if esStaff\(\) && \(!cambiaAnulacion\(\) \|\| puedeAnular\(\)\) && \(!cambiaDineroPago\(\) \|\| esAdmin\(\)\);/.test(reglas));
ok('en Cuentas: cambiaDineroMov y cambiaDineroEgreso, solo admin', /function cambiaDineroMov\(\)[\s\S]{0,300}hasAny\(\['monto', 'fecha', 'cuentaOrigen', 'cuentaDestino', 'tipo', 'tasaBs'\]\)/.test(reglas) && /function cambiaDineroEgreso\(\)[\s\S]{0,300}hasAny\(\['monto', 'fecha', 'cuenta', 'forma', 'cuentaOrigen', 'tasaBs'\]\)/.test(reglas) && /match \/movimientos\/\{id\}[\s\S]{0,300}\(!cambiaDineroMov\(\) \|\| esAdmin\(\)\)/.test(reglas) && /match \/egresos\/\{id\}[\s\S]{0,300}\(!cambiaDineroEgreso\(\) \|\| esAdmin\(\)\)/.test(reglas));
ok('la prueba del emulador cubre los casos', /un cobrador NO cambia el monto de un pago/.test(src('tests/reglas/t_reglas_seguridad.js')) && /el admin sí corrige el monto/.test(src('tests/reglas/t_reglas_seguridad.js')));
console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode = 1;
