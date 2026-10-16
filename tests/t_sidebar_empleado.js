// 16-oct-2026: Adam le dio el permiso "concesionarios" a un empleado y el modulo no aparecia en
// su menu, porque el menu del empleado tenia su propia lista de modulos y no incluia ese (ni
// Cumplimiento). Se prueba que el menu del empleado muestre exactamente lo que sus permisos
// dicen, para todos los modulos que el administrador puede dar.
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

// ── 1. Empleado con el permiso de Concesionarios (el caso de Adam) ──
S.currentUser = { uid:'e1', nombre:'Luis Marques', rol:'Empleado', permisos:['clientes','motos','creditos','contratos','notif','catalogo','concesionarios'], concesionarios:[] };
S.creds = [];
ctx.renderSidebar();
let menu = modulosEnMenu();
ok('el empleado con permiso de Concesionarios lo ve en su menú', menu.includes('concesionarios'));
ok('...y sigue viendo lo demás que tiene permitido', ['clientes','motos','creditos','contratos','notif','catalogo'].every(k => menu.includes(k)));
ok('...y nada de lo que no tiene (pagos, cuentas, usuarios, configuración)', !['pagos','cuentas','users','config','reportes'].some(k => menu.includes(k)));

// ── 2. Todos los módulos que el administrador puede dar salen en el menú del empleado ──
const todos = vm.runInContext('Object.keys(PGL)', ctx).filter(k => !['cobranza','conta'].includes(k));   // PGL es const: no cuelga del global
S.currentUser.permisos = todos.slice(); S.creds = [{ id:'CRED-1', estado:'pendiente_revision' }];
ctx.renderSidebar(); menu = modulosEnMenu();
const faltan = todos.filter(k => !menu.includes(k) && ctx.sidebarMuestra(k));
ok('con todos los permisos, el menú del empleado muestra todos los módulos (faltan: ' + (faltan.join(', ') || 'ninguno') + ')', faltan.length === 0);
ok('Aprobaciones aparece cuando hay solicitudes pendientes y el empleado trabaja con créditos', menu.includes('aprobaciones'));

// ── 3. Sin el permiso, Concesionarios no sale ──
S.currentUser.permisos = ['clientes','motos','creditos']; S.creds = [];
ctx.renderSidebar(); menu = modulosEnMenu();
ok('sin el permiso, Concesionarios no aparece', !menu.includes('concesionarios'));

// ── 4. El menú general (Gerente) también lo respeta ──
S.currentUser = { uid:'g1', nombre:'Gerente', rol:'Gerente', permisos:['dash','clientes','concesionarios'], concesionarios:[] };
ctx.renderSidebar(); menu = modulosEnMenu();
ok('un gerente con el permiso también ve Concesionarios', menu.includes('concesionarios'));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
