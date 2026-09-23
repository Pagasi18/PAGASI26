// Configuracion → Empresa: el Registro Mercantil y el cargo del representante se
// guardan, se cargan al abrir el sistema y el contrato v3 los imprime.
// Desde el 30-ago-2026 el boton fallaba en silencio (usaba campos que no leia) y
// nada se guardaba; ademas la carga al iniciar no traia esos campos, asi que el
// contrato salia con el Registro Mercantil en blanco.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento() {
  return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){},
    closest(){ return null; }, getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
// La pantalla de Configuracion: solo existe mientras "enConfig" es verdad
let enConfig = false;
const form = {};
const doc = { getElementById(id){ return (enConfig && form[id]) || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, confirm(){return true;}, prompt(){return '';},
  open(){ return { document:{ write(){}, close(){} } }; },
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
const avisos = [];
ctx.toast = function(m, t){ avisos.push([t, m]); };
ctx.nav = function(){};

// Firestore de mentira: solo config/empresa
let docEmpresa = null, escrito = null;
ctx.db = { collection(){ return { doc(){ return {
  set(data){ escrito = JSON.parse(JSON.stringify(data)); docEmpresa = escrito; return Promise.resolve(); },
  get(){ return Promise.resolve({ exists: !!docEmpresa, data(){ return docEmpresa; } }); },
}; } }; } };
const tick = () => new Promise(r => setImmediate(r));

(async function(){
  // ── 1) Guardar desde Configuracion → Empresa ──
  const valores = { cfg_empresa:'PAGASI 18, C.A.', cfg_rif:'J-50829589-7', cfg_ciudad:'Caracas', cfg_tel:'0212-0000000', cfg_email2:'info@pagasi.io',
    cfg_direccion:'Av. Principal', cfg_representante:'', cfg_rep_ci:'', cfg_rep_cargo:'Director', cfg_rep_doc:'Acta de Asamblea del 12/03/2024',
    cfg_rm:'Segundo', cfg_rm_estado:'Miranda', cfg_rm_fecha:'12/03/2024', cfg_rm_num:'18', cfg_rm_tomo:'145-A ' };
  for (const k in valores) { form[k] = elemento(); form[k].value = valores[k]; }
  enConfig = true;
  let error = null;
  try { ctx.guardarEmpresa(); } catch (e) { error = e; }
  await tick();
  ok('el boton Guardar ya no se cae (antes: ' + 'repCargo is not defined)', error === null);
  ok('se escribe en la base', !!escrito);
  ok('guarda el Registro Mercantil completo',
    escrito && escrito.rm === 'Segundo' && escrito.rmEstado === 'Miranda' && escrito.rmFecha === '12/03/2024' && escrito.rmNum === '18' && escrito.rmTomo === '145-A');
  ok('guarda cargo y documento del representante', escrito && escrito.repCargo === 'Director' && escrito.repDoc === 'Acta de Asamblea del 12/03/2024');
  ok('sigue guardando nombre, RIF y lo demas', escrito && escrito.nombre === 'PAGASI 18, C.A.' && escrito.rif === 'J-50829589-7' && escrito.email === 'info@pagasi.io' && !!escrito.updated);
  ok('avisa que se guardo', avisos.some(a => a[0] === 'success' && /Empresa guardada/.test(a[1])));
  ok('sin nombre no guarda y lo dice', (function(){ escrito = null; form.cfg_empresa.value = ''; ctx.guardarEmpresa(); form.cfg_empresa.value = 'PAGASI 18, C.A.';
    return escrito === null && avisos.some(a => a[0] === 'error' && /nombre de la empresa/.test(a[1])); })());

  // ── 2) Otro dia: se abre el sistema sin pasar por Configuracion ──
  enConfig = false;
  ctx._empresa = { nombre:'Pagasi', rif:'J-00000000-0', ciudad:'Caracas', tel:'', email:'', direccion:'', representante:'', repCI:'' };
  ctx.cargarEmpresa(); await tick(); await tick();
  const e1 = ctx.getEmpresa();
  ok('al iniciar se carga el Registro Mercantil', e1.rm === 'Segundo' && e1.rmEstado === 'Miranda' && e1.rmNum === '18' && e1.rmTomo === '145-A' && e1.rmFecha === '12/03/2024');
  ok('al iniciar se cargan cargo y documento', e1.repCargo === 'Director' && e1.repDoc === 'Acta de Asamblea del 12/03/2024');

  // ── 3) "Recargar desde Firebase" tampoco los pierde ──
  ctx._empresa = { nombre:'Pagasi', rif:'J-00000000-0', ciudad:'Caracas', tel:'', email:'', direccion:'', representante:'', repCI:'' };
  ctx.S.page = 'dash';
  try { ctx.recargarDesdeFirebase(); } catch (e) {}
  await tick(); await tick(); await tick();
  const e2 = ctx.getEmpresa();
  ok('Recargar desde Firebase trae el Registro Mercantil', e2.rm === 'Segundo' && e2.rmTomo === '145-A' && e2.repCargo === 'Director');

  // ── 4) El contrato v3 lo imprime ──
  ctx._empresa = Object.assign({}, docEmpresa);
  ctx.S.clientes = [{ id:'CLI-1', nombre:'JOSE PRUEBA', cedula:'12345678', direccion:'Av. Principal, Caracas', ciudad:'Caracas' }];
  ctx.S.motos = [{ id:14, marca:'EMPIRE', modelo:'MATRIX 150', anio:2026, color:'Negro', placa:'AL9T94J', vin:'8Z53ADCK9TM006007', serialMotor:'MTR-1' }];
  ctx.S.creds = [{ id:'CRED-900', cli:'JOSE PRUEBA', clienteId:'CLI-1', motoId:14, fecha:'2026-09-07', precio:1723.67, ini:813.32, cuotaQ:71.51, totalCuotas:24, plazo:12, uso_moto:'personal' }];
  const k = ctx._htmlContratoProtect('CRED-900');
  ok('el contrato sale con el Registro Mercantil lleno',
    k.indexOf('inscrita en el Registro Mercantil <strong>Segundo</strong> de la Circunscripción Judicial <strong>Miranda</strong>, bajo el N° <strong>18</strong>, Tomo <strong>145-A</strong>, de fecha <strong>12/03/2024</strong>') > -1);

  // Sin datos guardados el contrato dice N/A (Adam, 22-sep-2026: "no quiero que me dejes
  // vacios en el contrato, si no hay un dato ponme N/A"). Antes quedaba una raya, que en
  // un papel que se firma es un renglon que alguien tiene que llenar sin saber con que.
  ctx._empresa = { nombre:'Pagasi', rif:'J-00000000-0' };
  const vacio = ctx._htmlContratoProtect('CRED-900');
  ok('sin datos, el Registro Mercantil dice N/A',
    vacio.indexOf('inscrita en el Registro Mercantil <strong>N/A</strong> de la Circunscripción Judicial <strong>N/A</strong>, bajo el N° <strong>N/A</strong>, Tomo <strong>N/A</strong>') > -1);
  ok('nada de "undefined" en el preambulo', vacio.indexOf('undefined') === -1);

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exitCode = 1;
})();
