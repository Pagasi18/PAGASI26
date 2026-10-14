// 13-oct-2026, Adam: la calculadora con tres tarjetas (40%, 60% y la preferida desde 40%),
// una sola tasa de 650%, seguro del 4,5% del precio de contado que va con la inicial, plazos
// de 6, 9 y 12 meses, y un modulo donde Liz cambia precios, seguro, fotos y disponibilidad
// y la web lo toma sola. Se prueba el catalogo publico, su lectura de Firestore y el modulo.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── 1. El catalogo publico (assets/public/catalog.js) ──
function catalogoNuevo(globales){
  const ctx = Object.assign({ console:{log(){},warn(){}}, Math, Number, String, Object, Array, JSON, Promise, Date, isNaN }, globales || {});
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(src('assets/public/catalog.js').replace('typeof module===\'object\' && module.exports', 'false'), ctx);
  return ctx.PagasiCatalog;
}
let C = catalogoNuevo();
ok('condiciones de Adam: 650%, seguro 4,5%, inicial 40 a 60%, plazos 6, 9 y 12', C.condiciones.apy === 650 && C.condiciones.seguroPct === 4.5 && C.condiciones.inicialMin === 40 && C.condiciones.inicialMax === 60 && C.condiciones.plazos.join() === '6,9,12');
let p = C.calcPlan(1320, 12);
ok('moto de $1.320 al 40%: inicial $528, seguro $60, al firmar $588, financiado $792', p.inicial === 528 && p.seguro === 60 && p.alFirmar === 588 && p.financiado === 792);
ok('cuota quincenal $110, $89 y $81 a 6, 9 y 12 meses', C.calcPlan(1320, 6).quincenal === 110 && C.calcPlan(1320, 9).quincenal === 89 && p.quincenal === 81);
ok('al 60%: cuota de $54 a 12 meses', C.calcPlan(1320, 12, 0.60).quincenal === 54);
ok('todo cuadra a simple vista: mensual = 2 quincenas y total = cuota por número de cuotas', p.mensual === 162 && p.totalEnCuotas === 81 * 24 && p.inicial + p.financiado === 1320);
ok('redondea hacia arriba como la calculadora (regla del 11-sep), sin sumar un dólar por la coma flotante', C.arriba(88.01) === 89 && C.arriba(726.0000000001) === 726 && C.money(587.4) === '$588');
const e = C.calcExacto(1320, 12);
ok('el cálculo exacto da la tasa de 650% efectiva anual', Math.abs(Math.pow(1 + (Math.pow(7.5, 1/24) - 1), 24) - 7.5) < 1e-9 && Math.abs(e.seguro - 59.4) < 1e-9);
ok('plan() de la web usa la inicial mínima y 12 meses', JSON.stringify(C.plan(1)) === JSON.stringify(C.calcPlan(1320, 12)));
ok('la lista de respaldo sigue con los 46 modelos', C.motos.length === 46 && C.base.length === 46 && C.origen === 'base');

// Lo que llega de Firestore (formato REST)
const docs = [
  { name:'projects/x/databases/(default)/documents/catalogo/_condiciones', fields:{ apy:{integerValue:'700'}, seguroPct:{doubleValue:5}, inicialMin:{integerValue:'40'}, inicialMax:{integerValue:'60'}, plazos:{arrayValue:{values:[{integerValue:'6'},{integerValue:'12'}]}} } },
  { name:'projects/x/databases/(default)/documents/catalogo/1', fields:{ id:{integerValue:'1'}, modelo:{stringValue:'NEW HORSE 150'}, name:{stringValue:'New Horse 150'}, precio:{doubleValue:1400}, sedeName:{stringValue:'EK Bello Monte'}, image:{stringValue:'https://firebasestorage.googleapis.com/x.jpg'}, disponible:{booleanValue:true} } },
  { name:'projects/x/databases/(default)/documents/catalogo/2', fields:{ id:{integerValue:'2'}, modelo:{stringValue:'AGOTADA'}, precio:{integerValue:'1000'}, disponible:{booleanValue:false} } },
  { name:'projects/x/databases/(default)/documents/catalogo/3', fields:{ id:{integerValue:'3'}, modelo:{stringValue:'BORRADA'}, precio:{integerValue:'1000'}, eliminado:{booleanValue:true} } },
  { name:'projects/x/databases/(default)/documents/catalogo/47', fields:{ id:{integerValue:'47'}, modelo:{stringValue:'NUEVA 200'}, precio:{integerValue:'2000'}, sedeName:{stringValue:'Boleita'} } },
  { name:'projects/x/databases/(default)/documents/catalogo/48', fields:{ id:{integerValue:'48'}, modelo:{stringValue:'SIN PRECIO'} } },
];
const r = C.desdeDocumentos(docs);
ok('de Firestore: lee condiciones, modelos y la foto subida', r.cond.apy === 700 && r.motos.find(m => m.id === 1).precio === 1400 && /firebasestorage/.test(r.motos.find(m => m.id === 1).image));
ok('...sin los eliminados ni los que no tienen precio', !r.motos.some(m => m.id === 3 || m.id === 48) && r.motos.length === 3);
ok('...y un modelo nuevo sin nombre web toma el del modelo', r.motos.find(m => m.id === 47).name === 'Nueva 200');
ok('condiciones con datos malos vuelven a las de respaldo', C.condValidas({ apy:-5, seguroPct:80, inicialMin:0, plazos:['x'] }).apy === 650 && C.condValidas({ seguroPct:80 }).seguroPct === 4.5 && C.condValidas({ plazos:['x'] }).plazos.join() === '6,9,12');

(async () => {
  // cargar(): lee la base una vez, aplica, guarda copia; si falla, queda la lista de respaldo
  const guardado = {};
  const ls = { getItem:k => guardado[k] || null, setItem:(k, v) => { guardado[k] = v; } };
  let llamadas = 0, urlPedida = '';
  C = catalogoNuevo({ localStorage: ls, fetch: url => { llamadas++; urlPedida = url; return Promise.resolve({ ok:true, json:() => Promise.resolve({ documents: docs }) }); } });
  await C.cargar(); await C.cargar();
  ok('cargar() pide el catálogo una sola vez, a la base de la compañía', llamadas === 1 && /projects\/(pagasi-v2|pagasi26-65ced)\/databases\/\(default\)\/documents\/catalogo\?/.test(urlPedida) && /key=AIza/.test(urlPedida));
  ok('la web muestra solo lo disponible, con el precio de Liz', C.origen === 'firestore' && C.motos.length === 2 && !C.get(2) && C.get(1).precio === 1400);
  ok('y calcula con las condiciones guardadas (700%, seguro 5%)', C.condiciones.apy === 700 && C.plan(1).seguro === 70);
  ok('guarda una copia en el navegador para la próxima visita', JSON.parse(guardado.pagasi_catalogo_v1).motos.length === 3);
  const C2 = catalogoNuevo({ localStorage: ls, fetch: () => Promise.reject(new Error('sin internet')) });
  await C2.cargar();
  ok('sin internet: usa la última copia buena', C2.origen === 'cache' && C2.get(1).precio === 1400 && C2.condiciones.apy === 700);
  const C3 = catalogoNuevo({ fetch: () => Promise.resolve({ ok:false, status:403, json:() => Promise.resolve({}) }) });
  await C3.cargar();
  ok('si la base no deja leer (Reglas): sigue la lista de respaldo, sin romperse', C3.origen === 'base' && C3.motos.length === 46 && C3.condiciones.apy === 650);
  const C4 = catalogoNuevo({ fetch: () => Promise.resolve({ ok:true, json:() => Promise.resolve({}) }) });
  await C4.cargar();
  ok('catálogo vacío en la base: sigue la lista de respaldo', C4.origen === 'base' && C4.motos.length === 46);

  // ── 2. El modulo del sistema ──
  function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, checked:false, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, click(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }
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
  const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m => m[1]);
  ok('el sistema carga el catálogo público y el módulo', archivos.includes('assets/public/catalog.js') && archivos.includes('logic/catalogo.js') && archivos.includes('modules/catalogo.js'));
  vm.createContext(ctx); vm.runInContext(archivos.map(f => src(f)).join('\n;\n'), ctx, { filename:'app.js' });
  const avisos = []; ctx.toast = m => avisos.push(String(m)); ctx.logActividad = () => {}; ctx.nav = () => {}; ctx.closeM = () => {}; ctx.setMicon = () => {};
  const escritos = [];
  const coleccion = { docs:{} };
  ctx.db = {
    collection(n){ return { get(){ return Promise.resolve({ forEach(fn){ Object.keys(coleccion.docs).forEach(id => fn({ id, data:() => coleccion.docs[id] })); } }); },
      doc(id){ return { _id:id, set(d, o){ escritos.push({ id, d:JSON.parse(JSON.stringify(d)), merge:!!(o && o.merge) }); coleccion.docs[id] = Object.assign({}, o && o.merge ? coleccion.docs[id] : {}, d); return Promise.resolve(); } }; } }; },
    batch(){ const ops = []; return { set(ref, d){ ops.push([ref._id, d]); }, commit(){ ops.forEach(([id, d]) => { escritos.push({ id, d, lote:true }); coleccion.docs[id] = d; }); return Promise.resolve(); } }; }
  };
  const S = ctx.S;
  ok('Catálogo web está en el menú (Sistema), con nombre y en el rol Administrador', ctx.MODULOS.some(m => m.id === 'catalogo' && m.grupo === 'Sistema') && /catalogo:'Catálogo web'/.test(src('assets/pagasi-app.js')) && /'cumplimiento','catalogo','perm_delete'/.test(src('assets/pagasi-app.js')));
  ok('...y también en el menú de un empleado con el permiso', /keys:\['plan','config','scores','users','catalogo'\]/.test(src('assets/pagasi-app.js')));

  S.currentUser = { uid:'u1', nombre:'Pedro', rol:'Empleado', permisos:['dash'] };
  ok('sin el permiso no entra', ctx.catPuedeEditar() === false && /Pídele a un administrador/.test(ctx.PG.catalogo()));
  S.currentUser = { uid:'liz', nombre:'Liz', rol:'Empleado', permisos:['dash','catalogo'] };
  ok('Liz, con el permiso "catalogo", sí entra (sin ser administradora)', ctx.catPuedeEditar() === true && ctx.catEsAdmin() === false);
  await ctx.catCargar(true);
  ok('catálogo vacío: ofrece cargar los 46 modelos de la web', /Cargar los 46 modelos de la web/.test(ctx.PG.catalogo()));
  await ctx.catImportar();
  ok('Liz carga los 46 modelos con precio, concesionario y foto', Object.keys(coleccion.docs).filter(k => k !== '_condiciones').length === 46 && coleccion.docs['1'].precio === 1320 && coleccion.docs['1'].sedeName === 'EK Bello Monte' && coleccion.docs['1'].disponible === true && /assets\/motos/.test(coleccion.docs['1'].image));
  ok('...pero las condiciones no: esas las crea un administrador', !coleccion.docs._condiciones);
  let h = ctx.PG.catalogo();
  ok('la tabla muestra precio, seguro, inicial, al firmar y las cuotas 6 · 9 · 12', /NEW HORSE 150/.test(h) && /\$60<\/td>/.test(h) && /\$528<\/td>/.test(h) && /\$588<\/td>/.test(h) && /\$110 · \$89 · \$81/.test(h));
  ok('Liz no ve la casilla de la tasa: solo el valor y quién la cambia', !/id="cat_apy"/.test(h) && /650% <span[^>]*>· la cambia un administrador/.test(h));
  ok('los botones de nuevo modelo y Excel están', /catNuevoModelo\(\)/.test(h) && /Descargar reporte Excel/.test(h));

  await ctx.catPrecio(1, '1400');
  ok('Liz cambia el precio de contado: se guarda solo el precio, con quién y cuándo', escritos.at(-1).id === '1' && escritos.at(-1).merge && escritos.at(-1).d.precio === 1400 && escritos.at(-1).d.actualizadoPor === 'Liz' && !('modelo' in escritos.at(-1).d));
  await ctx.catPrecio(1, '0');
  ok('un precio de 0 no se guarda', escritos.at(-1).d.precio === 1400 && avisos.some(a => /mayor que 0/.test(a)));
  await ctx.catDisponible(2, false);
  ok('marcar "no disponible" la saca de la web', coleccion.docs['2'].disponible === false);
  await ctx.catEliminar(3);
  ok('eliminar no borra el documento: lo marca y deja de verse', coleccion.docs['3'].eliminado === true && !ctx.catLista().some(m => m.id === 3));

  doc.getElementById('cat_seguro').value = '5';
  await ctx.catGuardarCondiciones();
  ok('Liz no puede crear las condiciones (las crea un administrador primero)', !coleccion.docs._condiciones && avisos.some(a => /las crea primero un administrador/.test(a)));
  S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador', permisos:[] };
  doc.getElementById('cat_apy').value = '650'; doc.getElementById('cat_seguro').value = '4.5';
  await ctx.catGuardarCondiciones();
  ok('el administrador guarda la tasa, el seguro, la inicial y los plazos', coleccion.docs._condiciones.apy === 650 && coleccion.docs._condiciones.seguroPct === 4.5 && coleccion.docs._condiciones.inicialMin === 40 && coleccion.docs._condiciones.plazos.join() === '6,9,12');
  S.currentUser = { uid:'liz', nombre:'Liz', rol:'Empleado', permisos:['dash','catalogo'] };
  doc.getElementById('cat_seguro').value = '5'; doc.getElementById('cat_apy').value = '900';
  await ctx.catGuardarCondiciones();
  ok('Liz cambia el seguro, pero aunque la casilla diga 900 no toca la tasa', escritos.at(-1).id === '_condiciones' && escritos.at(-1).d.seguroPct === 5 && !('apy' in escritos.at(-1).d) && coleccion.docs._condiciones.apy === 650);

  const filas = ctx.catFilasExcel();
  ok('Excel: las columnas que pidieron', filas[0].join('|') === 'MODELO|PRECIO AL CONTADO|COSTO DEL SEGURO|INICIAL MÍNIMA|CUOTA QUINCENAL 6 MESES|CUOTA QUINCENAL 9 MESES|CUOTA QUINCENAL 12 MESES');
  const nh = filas.find(f => f[0] === 'NEW HORSE 150');
  ok('Excel: los mismos montos que la web (precio $1.400, seguro 5% = $70, inicial $560)', nh && nh[1] === 1400 && nh[2] === 70 && nh[3] === 560 && nh[6] === ctx.PagasiCatalog.calcPlan(1400, 12, 0.4, ctx.catCondiciones()).quincenal);
  ok('Excel: un renglón por modelo, sin el eliminado', filas.length === 1 + 45 && !filas.some(f => f[0] === coleccion.docs['3'].modelo));

  // Nuevo modelo
  ctx.catNuevoModelo();
  Object.assign(doc.getElementById('cm_modelo'), { value:'nueva 250' }); doc.getElementById('cm_precio').value = '2100'; doc.getElementById('cm_sede').value = 'Boleita';
  doc.getElementById('cm_name').value = ''; doc.getElementById('cm_cc').value = '250cc'; doc.getElementById('cm_type').value = ''; doc.getElementById('cm_cat').value = ''; doc.getElementById('cm_tag').value = ''; doc.getElementById('cm_disp').checked = true;
  ctx.S.saveFn(); await new Promise(r => setImmediate(r));
  const nuevo = coleccion.docs['47'];
  ok('nuevo modelo: toma el número siguiente, en mayúsculas y con el código del concesionario', nuevo && nuevo.id === 47 && nuevo.modelo === 'NUEVA 250' && nuevo.name === 'Nueva 250' && nuevo.sede === coleccion.docs['18'].sede && nuevo.disponible === true);

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
