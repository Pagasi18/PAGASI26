// 15-oct-2026: "los contratos no están mostrando los RIF de los concesionarios". El contrato
// siempre buscaba conc.rif, pero el formulario de Concesionarios no tenia donde escribirlo.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento(){ var v=''; return { innerHTML:'', textContent:'', get value(){ return v; }, set value(x){ v = String(x); }, className:'', id:'', style:{}, dataset:{}, checked:false, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, click(){} }; }
const els = {};
const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
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
const avisos = []; ctx.toast = m => avisos.push(String(m)); ctx.setMicon = () => {}; ctx.logActividad = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
const guardados = []; ctx.DB.saveConcesionario = c => { guardados.push(JSON.parse(JSON.stringify(c))); return Promise.resolve(); };
ctx.$ = id => doc.getElementById(id);
const S = ctx.S;
const el = id => doc.getElementById(id);
S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador' };
S.concesionarios = [{ id:'C1', nombre:'BERA TRINIDAD', ciudad:'Caracas', activo:true }];

// ── 1. El formulario tiene el RIF y lo guarda ──
ok('el RIF se escribe a mano en cualquier forma y queda J-12345678-9', ctx._concRifNormal('j123456789') === 'J-12345678-9' && ctx._concRifNormal(' J-12345678-9 ') === 'J-12345678-9' && ctx._concRifNormal('j 12345678 9') === 'J-12345678-9' && ctx._concRifNormal('') === '');
ctx._concOpenEdit('C1');
ok('el formulario del concesionario pide el RIF', /id="conc_rif"/.test(el('mbd').innerHTML) && /sale en los contratos/.test(el('mbd').innerHTML));
el('conc_nombre').value = 'BERA TRINIDAD'; el('conc_rif').value = 'j-501234567'; el('conc_ciudad').value = 'Caracas'; el('conc_telefono').value = ''; el('conc_direccion').value = ''; el('conc_activo').checked = true;
ctx.S.saveFn();
ok('se guarda con el RIF ordenado', guardados.length === 1 && guardados[0].rif === 'J-50123456-7' && S.concesionarios[0].rif === 'J-50123456-7');
ctx._concOpenEdit('C1'); el('conc_nombre').value = 'BERA TRINIDAD'; el('conc_rif').value = 'hola';
ctx.S.saveFn();
ok('un RIF que no tiene forma de RIF no se guarda y se avisa', guardados.length === 1 && avisos.some(a => /Revisa el RIF/.test(a)));
ctx._concOpenEdit('C1'); el('conc_nombre').value = 'BERA TRINIDAD'; el('conc_rif').value = '';
ctx.S.saveFn();
ok('el RIF no es obligatorio (se puede guardar vacío)', guardados.length === 2 && guardados[1].rif === '');
S.concesionarios[0].rif = 'J-50123456-7';

// ── 2. Sale en los contratos ──
S.clientes = [{ id:'CLI-1', nombre:'JOSE PRUEBA', cedula:'12345678', direccion:'Av. Principal', ciudad:'Caracas', tel:'0414-0000000' }];
S.motos = [{ id:14, marca:'BERA', modelo:'NEW HORSE 150', anio:2026, color:'Negro', vin:'8Z53ADCK9TM006007', serialMotor:'MTR-1' }];
S.gps = [];
S.creds = [{ id:'CRED-900', cli:'JOSE PRUEBA', clienteId:'CLI-1', motoId:14, concesionarioId:'C1', fecha:'2026-10-15', precio:1320, ini:528, cuotaQ:79, totalCuotas:24, plazo:12, uso_moto:'personal', contratoFirmado:false }];
const protect = ctx._htmlContratoProtect('CRED-900');
ok('contrato Protect: "BERA TRINIDAD, sociedad mercantil, RIF N° J-50123456-7"', /BERA TRINIDAD<\/strong>, sociedad mercantil, RIF N° <strong>J-50123456-7<\/strong>/.test(protect));
const dra = ctx._htmlContratosDRA('CRED-900');
ok('contrato de cesión (DRA): el concesionario con su RIF', /J-50123456-7/.test(dra));
S.concesionarios[0].rif = '';
ok('sin RIF el contrato no inventa nada (sale la raya para llenar a mano)', !/J-50123456-7/.test(ctx._htmlContratoProtect('CRED-900')));

// ── 3. Se ve cuáles faltan ──
S.concesionarios = [{ id:'C1', nombre:'BERA TRINIDAD', activo:true, rif:'J-50123456-7' }, { id:'C2', nombre:'VELOZ PTO LA CRUZ', activo:true }];
const lista = ctx.PG.concesionarios ? ctx.PG.concesionarios() : (typeof ctx._concRender === 'function' ? ctx._concRender() : '');
ok('la lista muestra el RIF de cada uno y "Sin RIF" en los que faltan', /RIF J-50123456-7/.test(lista) && /Sin RIF/.test(lista));
console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
