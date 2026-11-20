// 20-nov-2026, Adam, mirando "Condiciones del plan" del Catálogo web: "aquí necesito un botón para
// también cambiar las iniciales... ahora creo que están en 30 y quisiera ponerla en 40 pero quiero
// poner la posibilidad de cambiarlo cuando quiera". Y después: "necesito darle acceso a María
// Fernanda para que ella pueda cambiar también".
//  1) La casilla «Inicial mínima» guarda inicialMin en catalogo/_condiciones, que es de donde ya
//     la leen la web, la calculadora, el asistente de créditos y Paola.
//  2) El permiso extra «perm_condiciones» (Usuarios → Editar permisos) deja cambiar las
//     condiciones sin ser administrador. Las Reglas de Firestore piden lo mismo.
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
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const avisos = []; ctx.toast = m => avisos.push(String(m));
const registro = []; ctx.logActividad = (a, m, id, d) => registro.push({ a, id, d });
ctx.setMicon = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
const S = ctx.S, el = id => doc.getElementById(id);

// La base de mentira: unas motos y las condiciones como están hoy (tasa 500, inicial 30)
const escritos = [];
const coleccion = { docs: {
  '1': { id:1, modelo:'NEW HORSE 150', name:'New Horse 150', sede:'ek', sedeName:'EK Bello Monte', precio:1320, disponible:true, orden:1 },
  '2': { id:2, modelo:'OWEN 200S', name:'Owen 200S', sede:'ek', sedeName:'EK Bello Monte', precio:2000, disponible:true, orden:2 },
  _condiciones: { apy:500, seguroPct:0, inicialMin:30, inicialMax:60, plazos:[6,9,12] }
} };
const usuarios = {};
ctx.db = {
  collection(n){
    if(n === 'usuarios') return { doc(id){ return { get(){ return Promise.resolve({ exists: !!usuarios[id], data(){ return usuarios[id]; } }); }, update(){ return Promise.resolve(); } }; } };
    return { get(){ return Promise.resolve({ forEach(fn){ Object.keys(coleccion.docs).forEach(id => fn({ id, data:() => coleccion.docs[id] })); } }); },
      doc(id){ return { _id:id, set(d, o){ escritos.push({ id, d:JSON.parse(JSON.stringify(d)), merge:!!(o && o.merge) }); coleccion.docs[id] = Object.assign({}, o && o.merge ? coleccion.docs[id] : {}, d); return Promise.resolve(); } }; } };
  },
  batch(){ return { set(){}, commit(){ return Promise.resolve(); } }; }
};
const ADAM = { uid:'adm', nombre:'Adam', rol:'Administrador', permisos:[] };
const LIZ = { uid:'liz', nombre:'Liz', rol:'Empleado', permisos:['dash','catalogo'] };
const MAFE = { uid:'mf', nombre:'Maria Fernanda', rol:'Gerente', permisos:['dash','clientes','creditos','catalogo','perm_condiciones'] };
const cond = () => coleccion.docs._condiciones;
const llenar = (apy, seguro, inicial) => { el('cat_apy').value = apy; el('cat_seguro').value = seguro; el('cat_inicial').value = inicial; };
async function guardar(apy, seguro, inicial){ llenar(apy, seguro, inicial); avisos.length = 0; const n = escritos.length; await ctx.catGuardarCondiciones(); return escritos.length > n ? escritos.at(-1) : null; }

(async () => {
  // ── 1. La casilla de la inicial ──
  S.currentUser = ADAM;
  await ctx.catCargar(true);
  let h = ctx.PG.catalogo();
  ok('Condiciones del plan trae la casilla «Inicial mínima», con la de hoy (30)', /Inicial mínima \(% del precio\)<\/label><input[^>]*id="cat_inicial"[^>]*value="30"/.test(h));
  ok('...junto a la tasa y el seguro, que siguen donde estaban', /id="cat_apy"[^>]*value="500"/.test(h) && /id="cat_seguro"[^>]*value="0"/.test(h) && /Guardar condiciones/.test(h));
  ok('...y ya no dice la inicial como texto fijo', !/Inicial desde <b>/.test(h));

  let w = await guardar('500', '0', '40');
  ok('Adam pone 40 y guarda: se escribe inicialMin = 40 en _condiciones (sin pisar lo demás)', w && w.id === '_condiciones' && w.merge && w.d.inicialMin === 40 && cond().inicialMin === 40 && cond().plazos.join() === '6,9,12');
  ok('...la tasa y el seguro quedan como estaban', cond().apy === 500 && cond().seguroPct === 0);
  ok('...la máxima no se toca (60)', !('inicialMax' in w.d) && cond().inicialMax === 60);
  ok('...queda escrito quién lo cambió', w.d.actualizadoPor === 'Adam' && /^\d{4}-\d\d-\d\d/.test(w.d.actualizadoEn) && registro.at(-1).a === 'catalogo_condiciones' && registro.at(-1).d.inicialMin === 40);
  ok('...y el aviso lo dice', avisos.some(a => /Condiciones guardadas/.test(a) && /inicial mínima 40%/.test(a)));
  h = ctx.PG.catalogo();
  ok('la pantalla ya muestra 40 en la casilla y en la tabla (inicial de la New Horse: $528)', /id="cat_inicial"[^>]*value="40"/.test(h) && /Inicial 40%/.test(h) && /\$528<\/td>/.test(h));

  // Lo que leen la web, la calculadora, el asistente de créditos y Paola: todos pasan por aquí
  const C = ctx.PagasiCatalog.condValidas(cond());
  ok('la web lee 40: inicial de una moto de $2.000 = $800 y se financian $1.200', C.inicialMin === 40 && ctx.PagasiCatalog.calcExacto(2000, 12, null, C).inicial === 800 && ctx.PagasiCatalog.calcExacto(2000, 12, null, C).financiado === 1200);
  const Cat = require(path.join(ROOT, 'assets/public/catalog.js'));
  ok('...y el servidor (Paola, Comenta MOTO), que usa el mismo archivo', Cat.condValidas(cond()).inicialMin === 40 && Cat.calcPlan(2000, 12, null, Cat.condValidas(cond())).inicial === 800);
  ok('el asistente de créditos y la calculadora no tienen la inicial escrita a mano', /var minPct=cond\.inicialMin\/100;/.test(src('logic/creditos.js')) && /const INICIAL_DEFECTO = _COND\.inicialMin \/ 100;/.test(src('calculadora.html')) && /pref\.min=String\(c\.inicialMin\)/.test(src('assets/public/site.js')));

  w = await guardar('500', '0', '');
  ok('casilla vacía: se guarda lo demás y la inicial queda como estaba (40)', w && !('inicialMin' in w.d) && cond().inicialMin === 40);
  w = await guardar('500', '0', '40');
  ok('guardar sin cambiarla no la reescribe', w && !('inicialMin' in w.d) && !avisos.some(a => /inicial mínima/.test(a)));
  for (const malo of ['0', '100', '-5', 'abc', '150']) {
    w = await guardar('500', '0', malo);
    ok('«' + malo + '» no se guarda y avisa', w === null && cond().inicialMin === 40 && avisos.some(a => /entre 1 y 99/.test(a)));
  }
  w = await guardar('500', '0', '37,5');
  ok('acepta decimales con coma (37,5)', w && w.d.inicialMin === 37.5 && cond().inicialMin === 37.5);
  w = await guardar('500', '0', '70');
  ok('si la mínima pasa de la máxima (70 > 60), la máxima la acompaña', w.d.inicialMin === 70 && w.d.inicialMax === 70 && cond().inicialMax === 70);
  w = await guardar('500', '0', '40');
  ok('...y al bajarla otra vez, la máxima vuelve a 60', w.d.inicialMin === 40 && w.d.inicialMax === 60 && cond().inicialMin === 40 && cond().inicialMax === 60);
  w = await guardar('650', '0', '40');
  ok('cambiar solo la tasa no toca la inicial', w.d.apy === 650 && !('inicialMin' in w.d) && cond().inicialMin === 40);
  await guardar('500', '0', '40');

  // Primera vez (condiciones sin guardar): se crean completas, con la inicial de la casilla
  const guardadas = cond(); delete coleccion.docs._condiciones;
  await ctx.catCargar(true);
  ok('sin condiciones guardadas avisa con la tasa, el seguro y la inicial de la web', /Todavía no están guardadas[^<]*tasa 400%[^<]*inicial 30%/.test(ctx.PG.catalogo()));
  w = await guardar('400', '0', '40');
  ok('...y al guardarlas por primera vez van completas (inicial 40, máxima 60, plazos)', w.d.inicialMin === 40 && w.d.inicialMax === 60 && w.d.plazos.join() === '6,9,12' && w.d.apy === 400);
  coleccion.docs._condiciones = guardadas; await ctx.catCargar(true);

  // ── 2. El permiso para María Fernanda ──
  ok('el permiso extra existe con su nombre', /Cambiar condiciones del plan/.test(vm.runInContext('EXTRA_PERMS', ctx).perm_condiciones) && vm.runInContext('EXTRA_PERMS', ctx).perm_delete === 'Permiso para eliminar');
  ok('el administrador lo tiene siempre', ctx.catPuedeCondiciones() === true && ctx.getPermsEfectivos().includes('perm_condiciones') && ctx.getPermsEfectivos().includes('perm_delete'));
  ok('no viene con ningún rol: se marca persona por persona', vm.runInContext("Object.keys(ROL_PERMISOS).every(function(r){ return ROL_PERMISOS[r].indexOf('perm_condiciones') < 0; })", ctx));

  S.currentUser = LIZ;
  ok('Liz (solo Catálogo web) sigue sin ver ni cambiar las condiciones', ctx.catPuedeCondiciones() === false && !/Condiciones del plan/.test(ctx.PG.catalogo()) && !/id="cat_inicial"/.test(ctx.PG.catalogo()));
  w = await guardar('900', '5', '10');
  ok('...y si lo intenta no se escribe nada', w === null && cond().apy === 500 && cond().inicialMin === 40 && avisos.some(a => /administrador o quien tenga ese permiso/.test(a)));

  S.currentUser = MAFE;
  h = ctx.PG.catalogo();
  ok('María Fernanda, con el permiso, no es administradora pero ve las condiciones', ctx.catEsAdmin() === false && ctx.isAdminUser() === false && ctx.catPuedeCondiciones() === true && /Condiciones del plan/.test(h) && /id="cat_apy"/.test(h) && /id="cat_seguro"/.test(h) && /id="cat_inicial"[^>]*value="40"/.test(h));
  w = await guardar('500', '0', '35');
  ok('...cambia la inicial a 35 y queda a su nombre', w && w.d.inicialMin === 35 && w.d.actualizadoPor === 'Maria Fernanda' && cond().inicialMin === 35);
  w = await guardar('450', '0', '35');
  ok('...y también la tasa', w && w.d.apy === 450 && cond().apy === 450);
  ok('el permiso no le da nada más: sigue sin poder eliminar ni entrar a Usuarios', ctx.canDeleteAction() === false && ctx.hasModuleAccess('users') === false && ctx.hasModuleAccess('config') === false);
  S.currentUser = Object.assign({}, MAFE, { permisos:['dash','catalogo'] });
  ok('si se lo quitan, deja de verlas', ctx.catPuedeCondiciones() === false && !/Condiciones del plan/.test(ctx.PG.catalogo()));

  // Usuarios → Editar permisos: la casilla
  ok('quien cambia las condiciones entra al Catálogo web (se le agrega solo)', ctx._permisosConCatalogo(['dash','perm_condiciones']).join() === 'dash,perm_condiciones,catalogo' && ctx._permisosConCatalogo(['dash','catalogo','perm_condiciones']).length === 3 && ctx._permisosConCatalogo(['dash']).join() === 'dash');
  // Las casillas de la ventana, leídas del HTML que arma el sistema (el documento de prueba no tiene DOM)
  let casillas = [];
  const leerCasillas = () => { casillas = [...els.mbd.innerHTML.matchAll(/<input type="checkbox"([^>]*)>/g)].map(m => ({ id:(m[1].match(/ id="([^"]*)"/) || [])[1] || '', value:(m[1].match(/ value="([^"]*)"/) || [])[1] || '', checked:/ checked/.test(m[1]), classList:{ contains:c => new RegExp('class="[^"]*' + c).test(m[1]) } })); };
  doc.querySelectorAll = sel => /checkbox/.test(sel) ? casillas : (/eu-conc-cb/.test(sel) ? [] : []);
  doc.querySelector = sel => { const v = (String(sel).match(/value="([^"]*)"/) || [])[1]; return casillas.find(c => c.value === v) || null; };
  const guardado = []; ctx.DB.updateUsuario = (uid, data) => { guardado.push({ uid, data }); return Promise.resolve(true); };
  S.currentUser = ADAM;
  usuarios.mf = { uid:'mf', nombre:'Maria Fernanda', email:'mf@ejemplo.com', rol:'Gerente', permisos:['dash','clientes','creditos'] };
  ctx.editarUsuario('mf'); await new Promise(r => setImmediate(r)); leerCasillas();
  const cb = v => casillas.find(c => c.value === v);
  ok('Editar permisos trae la casilla «Cambiar condiciones del plan», sin marcar', !!cb('perm_condiciones') && cb('perm_condiciones').checked === false && /Cambiar condiciones del plan \(tasa, seguro e inicial\)/.test(els.mbd.innerHTML));
  ok('...y la de eliminar sigue estando', !!cb('perm_delete') && /Permiso para eliminar/.test(els.mbd.innerHTML));
  cb('perm_condiciones').checked = true; ctx._euCondicionesToggle(cb('perm_condiciones'));
  ok('al marcarla se marca también Catálogo web', cb('catalogo').checked === true);
  el('eu_rol').value = 'Gerente'; el('eu_cargo').value = 'Gerente de Operaciones';
  ctx.S.saveFn(); await new Promise(r => setImmediate(r));
  ok('al guardar, su ficha queda con el permiso y con el Catálogo web', guardado.length === 1 && guardado[0].uid === 'mf' && guardado[0].data.permisos.includes('perm_condiciones') && guardado[0].data.permisos.includes('catalogo') && guardado[0].data.permisos.includes('creditos') && guardado[0].data.rol === 'Gerente');
  ok('...sin darle el de eliminar', !guardado[0].data.permisos.includes('perm_delete'));
  usuarios.mf.permisos = guardado[0].data.permisos;
  ctx.editarUsuario('mf'); await new Promise(r => setImmediate(r)); leerCasillas();
  ok('al abrirla de nuevo sale marcada', cb('perm_condiciones').checked === true && cb('catalogo').checked === true);
  cb('perm_condiciones').checked = false; guardado.length = 0; ctx.S.saveFn(); await new Promise(r => setImmediate(r));
  ok('y se le puede quitar (el Catálogo web se queda, eso se desmarca aparte)', !guardado[0].data.permisos.includes('perm_condiciones') && guardado[0].data.permisos.includes('catalogo'));
  ok('en la lista de usuarios el permiso extra no se cuenta como un módulo', /!EXTRA_PERMS\[p\] && p!=='whatsapp'/.test(src('logic/usuarios.js')));

  // Las Reglas de Firestore piden lo mismo (se prueban de verdad en el emulador, en la 26)
  const reglas = src('firestore.rules');
  ok('Reglas: las condiciones las escribe además quien tenga perm_condiciones', /allow create, update: if id == '_condiciones' && permiso\('perm_condiciones'\);/.test(reglas));
  ok('Reglas: quien solo tiene «catalogo» sigue sin poder tocar tasa, inicial ni plazos', /permiso\('catalogo'\) && \(id != '_condiciones'\s*\n\s*\|\| !request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasAny\(\['apy','inicialMin','inicialMax','plazos'\]\)\)\)/.test(reglas));
  ok('Reglas: los permisos de una ficha solo los cambia un administrador', /function camposDeAcceso\(\)/.test(reglas) && /affectedKeys\(\)\.hasAny\(camposDeAcceso\(\)\)/.test(reglas));

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
