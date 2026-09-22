// Punto 8 de la lista del 18-sep-2026: las cuentas del dinero de un credito nuevo
// venian elegidas solas (la primera de la lista; en la aprobacion, "Efectivo USD", que
// no es ninguna cuenta). Si nadie las cambiaba, el dinero quedaba anotado donde no era.
// Ahora arrancan en "— Elegir cuenta —" y no se guarda sin elegir.
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
const form = {};
const enConfig = true;
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
ctx.toast = function(m, t){ avisos.push([t, m]); }; ctx.closeM = function(){};
ctx.nav = function(){};
const el = (props) => Object.assign(elemento(), props || {});
ctx._cuentasBanc = [{ nombre:'Zelle' }, { nombre:'Efectivo' }, { nombre:'Binance' }];

// ── Forma de pago de la moto (wizard e Inventario) ──
const o = ctx._mpagoMetodosOpts();
ok('la forma de pago de la moto arranca en "— Elegir cuenta —"', o.indexOf('<option value="" selected>— Elegir cuenta —</option>') === 0);
ok('y siguen todas las cuentas', ['Zelle','Efectivo','Binance'].every(c => o.indexOf('value="' + c + '"') > -1));
function filas(prefix, lista){
  const rows = lista.map(([cuenta, monto]) => ({ querySelector(q){ return q === '.' + prefix + '-cuenta' ? { value: cuenta } : q === '.' + prefix + '-monto' ? { value: String(monto) } : null; } }));
  form[prefix + '-rows'] = el({ querySelectorAll(q){ return q === '.mpago-row' ? rows : []; } });
}
filas('mpago', [['', 1000]]);
let v = ctx._mpagoValidarContraCosto('mpago', 1000);
ok('monto sin cuenta: no deja guardar y dice por que', v.ok === false && /Elige de qué cuenta/.test(v.error));
filas('mpago', [['Binance', 1000]]);
v = ctx._mpagoValidarContraCosto('mpago', 1000);
ok('con la cuenta elegida: pasa', v.ok === true && v.pagos.length === 1 && v.pagos[0].cuenta === 'Binance');
filas('wzmpago', [['Efectivo', 400], ['', 600]]);
v = ctx._mpagoValidarContraCosto('wzmpago', 1000);
ok('pago dividido con una fila sin cuenta: no pasa', v.ok === false && /Elige de qué cuenta/.test(v.error));
filas('wzmpago', [['Efectivo', 400], ['Zelle', 600]]);
ok('pago dividido con las dos cuentas: pasa', ctx._mpagoValidarContraCosto('wzmpago', 1000).ok === true);

// ── Cobro de inicial en el wizard ──
ctx.WZ.iniMetodo = '';
let io = ctx._wzIniMetodoOpts();
ok('la inicial arranca en "— Elegir cuenta —"', /^<option value="" selected>— Elegir cuenta —<\/option>/.test(io) && io.indexOf('value="Zelle" selected') === -1);
ctx.WZ.iniMetodo = 'Binance';
io = ctx._wzIniMetodoOpts();
ok('si ya se eligio una, queda esa', io.indexOf('value="Binance" selected') > -1 && io.indexOf('value="" selected') === -1);
form['wz_ini_metodo'] = el({ value: '' });
ctx.S.currentUser = { nombre:'Prueba', rol:'Administrador' }; ctx.window._wzEditando = null;
ok('credito directo con inicial y sin cuenta: falta elegir', ctx._wzFaltaCuentaInicial(500) === true);
form['wz_ini_metodo'].value = 'Zelle';
ok('con cuenta elegida: sigue', ctx._wzFaltaCuentaInicial(500) === false);
form['wz_ini_metodo'].value = '';
ok('sin inicial no se pide cuenta', ctx._wzFaltaCuentaInicial(0) === false);
ctx.S.currentUser = { nombre:'Vendedor', rol:'Vendedor Concesionario' };
ok('solicitud de concesionario: la inicial se registra al aprobar, no se pide aqui', ctx._wzFaltaCuentaInicial(500) === false);
ctx.S.currentUser = { nombre:'Prueba', rol:'Administrador' }; ctx.window._wzEditando = 'CRED-1';
ok('editando: no se vuelve a cobrar la inicial', ctx._wzFaltaCuentaInicial(500) === false);
ctx.window._wzEditando = null;

// ── Aprobar una solicitud de concesionario ──
ctx.S.creds = [{ id:'CRED-900', cli:'CLIENTE', modelo:'MOTO', estado:'pendiente_revision', ini:500, inicialPct:0.3 }];
ctx.S.pagos = []; ctx.S.movimientos = [];
const avisosAntes = avisos.length;
form['apr_ini_monto'] = el({ value: '500' }); form['apr_ini_metodo'] = el({ value: '' }); form['apr_ini_ref'] = el({ value: '' });
ctx._aprAprobarConfirm('CRED-900');
ok('aprobar sin elegir cuenta: no se aprueba y lo dice',
  ctx.S.creds[0].estado === 'pendiente_revision' && ctx.S.pagos.length === 0 && avisos.slice(avisosAntes).some(a => a[0] === 'error' && /cuenta entró la inicial/.test(a[1])));
form['apr_ini_metodo'].value = 'Binance';
ctx._aprAprobarConfirm('CRED-900');
ok('con la cuenta elegida: se aprueba y la inicial entra en esa cuenta',
  ctx.S.creds[0].estado === 'activo' && ctx.S.pagos.length === 1 && ctx.S.pagos[0].cuenta === 'Binance' && ctx.S.movimientos.some(m => m.cuentaDestino === 'Binance' && m.monto === 500));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
