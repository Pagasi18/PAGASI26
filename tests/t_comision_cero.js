// 13-oct-2026, Adam: en el usuario, "Comisión por cobranza" "se pone 1 por defecto cada vez
// que voy a cambiar algo". Un 0 guardado se mostraba como 1 y se perdía al guardar.
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
ctx.toast = () => {}; ctx.setMicon = () => {}; ctx.logActividad = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
const guardado = [];
ctx.DB.updateUsuario = (uid, data) => { guardado.push({uid, data}); return Promise.resolve(true); };

ok('helper: 0 guardado se muestra como 0', ctx._euComVal(0, 1) === 0 && ctx._euComVal(2.5, 1) === 2.5);
ok('helper: sin valor guardado, el defecto', ctx._euComVal(undefined, 1) === 1 && ctx._euComVal(null, 5) === 5 && ctx._euComVal('', 5) === 5);
ok('helper: campo vacío es 0, no 1', ctx._euComNum({value:''}) === 0 && ctx._euComNum({value:'0'}) === 0 && ctx._euComNum({value:'1.5'}) === 1.5 && ctx._euComNum(null) === 0);

ctx.S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador' };
ctx._usersCache = [{ uid:'u1', nombre:'Samantha', email:'s@pagasi.io', rol:'Empleado', permisos:['dash'], concesionarios:[], comisiones:{ activo:true, venta:{tipo:'fijo',valor:10}, cobranza:{tipo:'fijo',valor:0} } }];
ctx.S.usuarios = ctx._usersCache;
// editarUsuario lee la ficha desde Firestore: un Firebase falso que devuelve a Samantha
const usuario = ctx._usersCache[0];
ctx.db = { collection(){ return { doc(){ return { get(){ return Promise.resolve({ exists:true, data(){ return usuario; } }); }, update(){ return Promise.resolve(); } }; } }; } };
(async () => {
  ctx.editarUsuario('u1');
  await new Promise(r => setImmediate(r));
  const h = (els.mbd && els.mbd.innerHTML) || '';
  ok('abre el modal de permisos', /eu_com_c_val/.test(h));
  ok('la cobranza en 0 se muestra en 0, no en 1', /id="eu_com_c_val"[^>]*value="0"/.test(h));
  ok('la venta en 10 se muestra en 10', /id="eu_com_v_val"[^>]*value="10"/.test(h));
  const el = id => doc.getElementById(id);   // los campos del modal se crean al pedirlos
  el('eu_rol').value = 'Empleado'; el('eu_cargo').value = ''; el('eu_com_activo').checked = true;
  el('eu_com_v_tipo').value = 'fijo'; el('eu_com_v_val').value = '10'; el('eu_com_c_tipo').value = 'fijo'; el('eu_com_c_val').value = '0';
  ctx.S.saveFn();
  ok('al guardar sin tocar nada, la cobranza sigue en 0', guardado.length === 1 && guardado[0].data.comisiones.cobranza.valor === 0 && guardado[0].data.comisiones.venta.valor === 10);
  el('eu_com_c_val').value = '';
  ctx.S.saveFn();
  ok('campo vacío se guarda como 0', guardado.length === 2 && guardado[1].data.comisiones.cobranza.valor === 0);
  // un usuario que nunca tuvo comisiones ve los valores por defecto
  ctx._usersCache[0] = { uid:'u2', nombre:'Nuevo', rol:'Empleado', permisos:[] }; Object.assign(usuario, ctx._usersCache[0]); delete usuario.comisiones;
  ctx.editarUsuario('u2'); await new Promise(r => setImmediate(r));
  ok('sin comisiones guardadas: venta 5 y cobranza 1 por defecto', /id="eu_com_v_val"[^>]*value="5"/.test(els.mbd.innerHTML) && /id="eu_com_c_val"[^>]*value="1"/.test(els.mbd.innerHTML));
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})();
