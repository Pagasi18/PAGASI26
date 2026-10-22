// 18-oct-2026: Adam: "publica todo, pero a todos los usuarios menos al mio escondele el WhatsApp
// y el Instagram". Los dos modulos estan en el sistema pero solo los ve su usuario (por uid o
// por correo), ni siquiera otro administrador; en el menu y tambien al navegar directo.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento(){ var v=''; return { innerHTML:'', textContent:'', get value(){ return v; }, set value(x){ v = String(x); }, className:'', id:'', style:{}, dataset:{}, checked:false, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, click(){} }; }
const els = {}, sbNav = elemento();
const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(sel){ return sel === '.sb-nav' ? sbNav : null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:false,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){ return ''; }, confirm(){ return true; },
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...fs.readFileSync(path.join(ROOT,'admin.html'),'utf8').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = () => {}; ctx.setMicon = () => {}; ctx.logActividad = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
const S = ctx.S;
const modulosEnMenu = () => [...sbNav.innerHTML.matchAll(/data-nav="([a-z]+)"/g)].map(m => m[1]);


const ADAM_UID = 'l8OCCAHCWyNLU6akwlU8vdrP3Ow2';
// ── 0. Desde el 22-oct-2026 (Adam: "todo el que tenga el permiso") ya no hay candado ──
ok('el candado está quitado: MODULOS_EN_PRUEBA vacío', Object.keys(vm.runInContext('MODULOS_EN_PRUEBA', ctx)).length === 0);
S.currentUser = { uid:'a2', email:'alejandro@pagasi.io', nombre:'Alejandro', rol:'Administrador', permisos:[], concesionarios:[] }; S.creds = [];
ctx.renderSidebar(); let menu0 = modulosEnMenu();
ok('otro administrador ya ve Redes sociales y entra', menu0.includes('redes') && ctx.hasModuleAccess('redes'));
S.currentUser = { uid:'m1', email:'ms.marianne0908@gmail.com', nombre:'Marianne', rol:'Empleado', permisos:['clientes','whatsapp','instagram'], concesionarios:[] };
ctx.renderSidebar(); menu0 = modulosEnMenu();
ok('una empleada con WhatsApp e Instagram (Marianne) ve Redes sociales', menu0.includes('redes') && ctx.hasModuleAccess('whatsapp') && ctx.hasModuleAccess('instagram'));
S.currentUser = { uid:'v1', email:'vc@x.com', nombre:'Vendedor', rol:'Vendedor Concesionario', permisos:['whatsapp','instagram'], concesionarios:['C1'] };
ok('un vendedor de concesionario no lo ve aunque le marquen los permisos (las Reglas tampoco lo dejan)', !ctx.hasModuleAccess('redes'));
S.currentUser = { uid:'e9', email:'e9@x.com', nombre:'Otro', rol:'Empleado', permisos:['clientes'], concesionarios:[] };
ctx.renderSidebar();
ok('sin WhatsApp ni Instagram no aparece', !modulosEnMenu().includes('redes') && !ctx.hasModuleAccess('redes'));

// ── El candado (por si se vuelve a poner): solo los de USUARIOS_DE_PRUEBA ──
vm.runInContext("MODULOS_EN_PRUEBA = { whatsapp: true, instagram: true }", ctx);
// ── 1. Otro administrador: no los ve ni entra ──
S.currentUser = { uid:'a2', email:'alejandro@pagasi.io', nombre:'Alejandro', rol:'Administrador', permisos:[], concesionarios:[] }; S.creds = [];
ctx.renderSidebar(); let menu = modulosEnMenu();
ok('otro administrador no ve Redes sociales en el menú', !menu.includes('redes') && !menu.includes('whatsapp') && !menu.includes('instagram'));
ok('...y tampoco puede entrar directo', !ctx.hasModuleAccess('redes') && !ctx.hasModuleAccess('whatsapp') && !ctx.hasModuleAccess('instagram'));
ok('...pero sigue viendo todo lo demás', ['dash','clientes','pagos','config','users'].every(k => menu.includes(k)) && ctx.hasModuleAccess('config'));

// ── 2. Un empleado con los permisos puestos: tampoco ──
S.currentUser = { uid:'e1', email:'emp@pagasi.io', nombre:'Empleada', rol:'Empleado', permisos:['dash','clientes','whatsapp','instagram'], concesionarios:[] };
ctx.renderSidebar(); menu = modulosEnMenu();
ok('un empleado con los permisos puestos tampoco lo ve', !menu.includes('redes') && menu.includes('clientes'));
ok('...ni entra', !ctx.hasModuleAccess('redes') && !ctx.hasModuleAccess('whatsapp') && !ctx.hasModuleAccess('instagram') && ctx.hasModuleAccess('clientes'));

// ── 3. Adam (por uid) sí ──
S.currentUser = { uid:ADAM_UID, email:'adam@pagasi.io', nombre:'adam', rol:'Administrador', permisos:[], concesionarios:[] };
ctx.renderSidebar(); menu = modulosEnMenu();
ok('Adam ve Redes sociales en su menú, una sola vez (ya no WhatsApp e Instagram sueltos)', menu.filter(k => k === 'redes').length === 1 && !menu.includes('whatsapp') && !menu.includes('instagram'));
ok('...y entra, con los dos canales', ctx.hasModuleAccess('redes') && ctx.hasModuleAccess('whatsapp') && ctx.hasModuleAccess('instagram'));
// ── 4. Adam por correo (si el uid cambiara) ──
S.currentUser = { uid:'otro', email:'Adam@pagasi.io', nombre:'adam', rol:'Administrador', permisos:[], concesionarios:[] };
ok('también lo reconoce por el correo, sin importar mayúsculas', ctx.hasModuleAccess('redes') && ctx.hasModuleAccess('whatsapp') && ctx.hasModuleAccess('instagram'));
// ── 5. Al vaciar la lista de prueba, se abren para quien tenga el permiso ──
vm.runInContext("MODULOS_EN_PRUEBA = {}", ctx);
S.currentUser = { uid:'e1', email:'emp@pagasi.io', nombre:'Empleada', rol:'Empleado', permisos:['dash','clientes','whatsapp'], concesionarios:[] };
ctx.renderSidebar(); menu = modulosEnMenu();
ok('cuando se abran (MODULOS_EN_PRUEBA vacío), manda el permiso: Redes sociales con WhatsApp sí, Instagram no', menu.includes('redes') && ctx.hasModuleAccess('redes') && ctx.hasModuleAccess('whatsapp') && !ctx.hasModuleAccess('instagram'));
S.currentUser = { uid:'e2', email:'emp2@pagasi.io', nombre:'Otra', rol:'Empleado', permisos:['dash','clientes'], concesionarios:[] };
ctx.renderSidebar(); menu = modulosEnMenu();
ok('...y sin ninguno de los dos permisos no aparece', !menu.includes('redes') && !ctx.hasModuleAccess('redes'));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
