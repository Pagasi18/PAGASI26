// Cargo separado de permisos (Adam, 15-sep-2026: "tengo empleados que no son ni
// vendedores ni gerentes... se me estan quejando los empleados por los nombres de
// los roles"). El CARGO es el nombre real del puesto y es lo que ve el empleado
// debajo de su nombre; el ROL sigue mandando en los permisos y solo lo ve el admin.
// Lo que no puede pasar: que ponerle un cargo a alguien le cambie lo que puede tocar.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function elemento() {
  return { innerHTML:'', outerHTML:'', textContent:'', value:'', className:'', id:'', type:'text', src:'',
    style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], checked:false, disabled:false,
    appendChild(){}, removeChild(){}, insertBefore(){}, remove(){},
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){},
    closest(){ return null; }, matches(){ return false; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
    querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
// El menú de la izquierda: nombre, iniciales y el cartelito del cargo
const sb = { '.sb-un': elemento(), '.sb-av': elemento(), '.sb-ur': elemento(), '.sb-foot': null };
const doc = {
  getElementById(){ return null; },
  querySelector(sel){ return Object.prototype.hasOwnProperty.call(sb, sel) ? sb[sel] : elemento(); },
  querySelectorAll(){ return []; },
  createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){},
};
const ctx = {
  console:{log(){},warn(){},error(){}},
  setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'},
  location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); },
  alert(){}, confirm(){return true;}, prompt(){return '';},
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{},
};
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};};
ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};};
ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};};
ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}};
ctx.window=ctx;

const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.S.creds=[]; ctx.S.pagos=[]; ctx.S.clientes=[]; ctx.S.motos=[];

const badge = () => String(sb['.sb-ur'].textContent);

// ── Lo que ve cada quien debajo de su nombre ──
ctx.S.currentUser = { uid:'u1', nombre:'Nataly', email:'n@pagasi.io', rol:'Empleado', cargo:'Archivóloga', permisos:[] };
ctx.updateSidebarFooter();
ok('Nataly ve "Archivóloga", no "Empleado"', badge() === 'Archivóloga');
ctx.S.currentUser = { uid:'u2', nombre:'Samantha', email:'s@pagasi.io', rol:'Gerente', cargo:'Gerente de Cobranzas', permisos:[] };
ctx.updateSidebarFooter();
ok('Samantha ve "Gerente de Cobranzas"', badge() === 'Gerente de Cobranzas');
ctx.S.currentUser = { uid:'u3', nombre:'Luis', email:'l@pagasi.io', rol:'Empleado', cargo:'Analista de Contratos', permisos:[] };
ctx.updateSidebarFooter();
ok('el Sr. Luis ve "Analista de Contratos"', badge() === 'Analista de Contratos');
ctx.S.currentUser = { uid:'u4', nombre:'Sin cargo', email:'x@pagasi.io', rol:'Vendedor', cargo:'', permisos:[] };
ctx.updateSidebarFooter();
ok('sin cargo puesto se sigue viendo el rol, como antes', badge() === 'Vendedor');
ctx.S.currentUser = { uid:'u5', nombre:'Viejo', email:'v@pagasi.io', rol:'Contador', permisos:[] };
ctx.updateSidebarFooter();
ok('un usuario de antes (sin el campo cargo) no se rompe', badge() === 'Contador');

// ── El cargo NO da permisos: eso lo sigue mandando el rol ──
const permisosDe = (u) => { ctx.S.currentUser = u; return ctx.getPermsEfectivos().slice().sort(); };
const empleado = { uid:'u6', nombre:'Nataly', rol:'Empleado', cargo:'Archivóloga' };
const empleadoSinCargo = { uid:'u6', nombre:'Nataly', rol:'Empleado' };
ok('ponerle cargo a alguien no le cambia ni un permiso',
  permisosDe(empleado).join('|') === permisosDe(empleadoSinCargo).join('|'));
ctx.S.currentUser = { uid:'u7', nombre:'Curiosa', rol:'Empleado', cargo:'Administrador' };
ok('escribir "Administrador" en el cargo NO convierte a nadie en administrador', ctx.isAdminUser() === false);
ok('y tampoco le da el permiso de configuración', ctx.getPermsEfectivos().indexOf('config') === -1);
ctx.S.currentUser = { uid:'u8', nombre:'Adam', rol:'Administrador', cargo:'Director' };
ok('el administrador con cargo "Director" sigue siendo administrador', ctx.isAdminUser() === true);
ctx.S.currentUser = { uid:'u9', nombre:'Externo', rol:'Vendedor Concesionario', cargo:'Asesor de Ventas' };
ok('el vendedor de concesionario con cargo bonito conserva su menú reducido',
  ctx.isVendedorConcesionarioRole() === true && ctx.getPermsEfectivos().indexOf('pagos') === -1);

// ── El color del cartelito sigue saliendo del rol, no del cargo ──
ctx.S.currentUser = { uid:'u10', nombre:'Nataly', rol:'Empleado', cargo:'Archivóloga' };
ctx.updateSidebarFooter();
const colorEmpleado = sb['.sb-ur'].style.background;
ctx.S.currentUser = { uid:'u11', nombre:'Nataly', rol:'Empleado', cargo:'' };
ctx.updateSidebarFooter();
ok('el color del cartelito lo sigue dando el rol', sb['.sb-ur'].style.background === colorEmpleado);

// ── El texto se escapa: un cargo con < no puede meter HTML ──
ctx.S.currentUser = { uid:'u12', nombre:'Prueba', rol:'Empleado', cargo:'<b>jefe</b>' };
ctx.updateSidebarFooter();
ok('el cargo se pinta como texto (textContent), no como HTML', badge() === '<b>jefe</b>');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
