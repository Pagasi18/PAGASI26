// 15-oct-2026: el vendedor de concesionario solo le pide a la base lo de SU sede (las Reglas
// nuevas no le entregan otra cosa). Se prueba que el sistema, con ese rol, pida clientes,
// creditos, motos y concesionarios filtrados por sus sedes, no pida nada de dinero, numere
// con el contador y no ofrezca escribir en el catalogo. Los demas roles siguen igual.
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
ctx.toast = () => {}; ctx.setMicon = () => {}; ctx.logActividad = () => {}; ctx.nav = () => {}; ctx.closeM = () => {}; ctx.showLoader = () => {}; ctx.hideLoader = () => {};
const S = ctx.S;

// ── Un Firestore falso que anota cada consulta ──
const pedidos = [];   // { col, where, tipo }
let contador = { creditos: 0, clientes: 0 };
function fakeDb(){
  const snapVacio = { docs: [], forEach(){}, exists: false, data(){ return {}; } };
  const consulta = (col, where) => ({
    where(f, op, v){ return consulta(col, { f, op, v }); },
    get(){ pedidos.push({ col, where, tipo: 'get' }); return Promise.resolve(snapVacio); },
    onSnapshot(cb){ pedidos.push({ col, where, tipo: 'snap' }); try { cb(snapVacio); } catch (e) {} return () => {}; },
    doc(id){ return { get(){ pedidos.push({ col: col + '/' + id, tipo: 'doc' }); return Promise.resolve(snapVacio); } }; }
  });
  return {
    collection(col){ return consulta(col, null); },
    runTransaction(fn){
      const nombre = { get(){ return Promise.resolve({ exists: true, data(){ return { ultimo: contador.actualTx }; } }); } };
      const tx = { get(ref){ pedidos.push({ col: 'contadores', tipo: 'tx' }); contador.actualTx = contador[ref._n] || 0; return nombre.get(); }, set(ref, d){ contador[ref._n] = d.ultimo; } };
      return Promise.resolve().then(() => fn({ get: ref => tx.get(ref), set: (ref, d) => tx.set(ref, d) }));
    }
  };
}
const db = fakeDb();
// los refs de contadores llevan el nombre para que la transaccion falsa sepa cual es
const colOriginal = db.collection.bind(db);
db.collection = col => { const c = colOriginal(col); if (col === 'contadores') c.doc = id => ({ _n: id }); return c; };
ctx.db = db; ctx.DB.load;
const quien = (col) => pedidos.filter(p => p.col === col);
const limpiar = () => { pedidos.length = 0; ctx._rtStarted = false; if (typeof ctx.stopRealtime === 'function') try { ctx.stopRealtime(); } catch (e) {} };

(async () => {
  // ── 1. Vendedor de concesionario con dos sedes ──
  S.currentUser = { uid: 'vc1', nombre: 'Vendedor Bera', rol: 'Vendedor Concesionario', concesionarios: ['C-BT', 'C-BC'], permisos: ['motos','clientes','creditos'] };
  ok('sabe sus sedes', JSON.stringify(ctx._sedesDeVendConc()) === '["C-BT","C-BC"]');
  limpiar(); ctx.startRealtime();
  const snaps = pedidos.filter(p => p.tipo === 'snap');
  ok('tiempo real: se suscribe solo a motos, clientes, creditos y concesionarios', snaps.map(p => p.col).sort().join() === 'clientes,concesionarios,creditos,motos');
  ok('...cada una filtrada por sus sedes', snaps.every(p => p.where && p.where.op === 'in' && JSON.stringify(p.where.v) === '["C-BT","C-BC"]') && snaps.find(p => p.col === 'concesionarios').where.f === 'id' && snaps.find(p => p.col === 'creditos').where.f === 'concesionarioId');
  ok('...y nada de pagos, movimientos, egresos, cuentas, facturas, tareas ni recursos', !snaps.some(p => ['pagos','movimientos','egresos','cuentasPendientes','facturas','tareas','recursos'].includes(p.col)));
  limpiar(); await ctx.DB.load();
  const gets = pedidos.filter(p => p.tipo === 'get');
  ok('carga clasica: las mismas cuatro colecciones, filtradas, y nada de dinero ni GPS', gets.map(p => p.col).sort().join() === 'clientes,concesionarios,creditos,motos' && gets.every(p => p.where && p.where.op === 'in') && !pedidos.some(p => p.col === 'gps' || p.col === 'pagos'));
  ok('la configuracion (plan, catalogo, planes) si se lee', pedidos.some(p => p.col === 'config/plan') && pedidos.some(p => p.col === 'config/catalogo'));
  limpiar(); contador = { creditos: 640, clientes: 1012 };
  const id = await ctx.nextCredIdAsync();
  ok('numera con el contador (CRED-641) sin leer todos los creditos', id === ctx.credNum(641) && !pedidos.some(p => p.col === 'creditos') && pedidos.some(p => p.tipo === 'tx'));
  limpiar();
  const cid = await ctx.nextClienteIdAsync();
  ok('el numero de cliente tambien sale del contador (1013)', cid === 1013 && !pedidos.some(p => p.col === 'clientes'));
  ctx.window._wzCatPedido = true;
  ok('en el asistente no se le ofrece agregar modelos al catalogo', !/__wz_new_cat__/.test(ctx._wzCatOptions()) && /<optgroup/.test(ctx._wzCatOptions()));
  S.currentUser.concesionarios = [];
  ok('sin sedes asignadas no ve nada (consulta valida con una sede que no existe)', JSON.stringify(ctx._sedesDeVendConc()) === '["__sin_sede__"]');

  // ── 2. Un empleado interno sigue igual que siempre ──
  S.currentUser = { uid: 'e1', nombre: 'Empleada', rol: 'Empleado', concesionarios: ['C-BT'], permisos: ['dash','clientes','creditos','pagos'] };
  ok('para el personal interno no hay filtro por sede', ctx._sedesDeVendConc() === null);
  limpiar(); ctx.startRealtime();
  const snapsE = pedidos.filter(p => p.tipo === 'snap');
  ok('tiempo real interno: las 11 colecciones completas, sin filtro', snapsE.length === 11 && snapsE.every(p => !p.where) && snapsE.some(p => p.col === 'pagos'));
  limpiar(); await ctx.DB.load();
  ok('carga clasica interna: pagos, movimientos y GPS completos', ['pagos','movimientos','gps','egresos'].every(c => pedidos.some(p => p.col === c && p.tipo === 'get' && !p.where)));
  limpiar(); contador = { creditos: 0 };
  await ctx.nextCredIdAsync();
  ok('el interno lee todos los creditos y deja sembrado el contador', pedidos.some(p => p.col === 'creditos' && p.tipo === 'get'));
  ok('el interno si puede agregar modelos al catalogo desde el asistente', /__wz_new_cat__/.test(ctx._wzCatOptions()));

  // ── 3. Las Reglas dicen lo mismo (texto) ──
  const reglas = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  ok('las Reglas distinguen al vendedor de concesionario del personal interno', /function esVendConc\(\)/.test(reglas) && /function esInterno\(\)/.test(reglas) && /function deMiSede\(\)/.test(reglas));
  ok('pagos, movimientos, egresos, cuentas, facturas y GPS son solo del personal interno', /match \/pagos\/\{id\}\s*\{ allow read: if esInterno\(\)/.test(reglas) && /match \/movimientos\/\{id\}\s*\{ allow read, create: if esInterno\(\)/.test(reglas) && /match \/gps\/\{id\}\s*\{ allow read, create, update: if esInterno\(\)/.test(reglas) && /match \/cuentas\/\{id\}\s*\{ allow read, create, update: if esInterno\(\)/.test(reglas));
  ok('el vendedor crea creditos solo en pendiente_revision y solo de su sede', /esVendConc\(\) && nuevoDeMiSede\(\) && request\.resource\.data\.estado == 'pendiente_revision'/.test(reglas));
  ok('los contadores siguen abiertos a todo el personal (para numerar)', /match \/contadores\/\{id\}\s*\{\s*allow read: if esStaff\(\);/.test(reglas));
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
