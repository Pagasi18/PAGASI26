// 13-oct-2026, Adam: la calculadora con tres tarjetas (40%, 60% y la preferida desde 40%),
// una sola tasa de 650%, seguro del 4,5% del precio de contado que va con la inicial, plazos
// de 6, 9 y 12 meses, y un modulo donde Liz cambia precios, seguro, fotos y disponibilidad
// y la web lo toma sola. Se prueba el catalogo publico, su lectura de Firestore y el modulo.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Un documento plano en el formato REST de Firestore (para probar desdeDocumentos)
function aFields(o){
  const v = x => x === null || x === undefined ? { nullValue:null } : typeof x === 'boolean' ? { booleanValue:x } : typeof x === 'number' ? (Number.isInteger(x) ? { integerValue:String(x) } : { doubleValue:x })
    : Array.isArray(x) ? { arrayValue:{ values:x.map(v) } } : typeof x === 'object' ? { mapValue:{ fields:aFields(x) } } : { stringValue:String(x) };
  const out = {}; Object.keys(o || {}).forEach(k => { out[k] = v(o[k]); }); return out;
}
// ── 1. El catalogo publico (assets/public/catalog.js) ──
function catalogoNuevo(globales){
  const ctx = Object.assign({ console:{log(){},warn(){}}, Math, Number, String, Object, Array, JSON, Promise, Date, isNaN }, globales || {});
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(src('assets/public/catalog.js').replace('typeof module===\'object\' && module.exports', 'false'), ctx);
  return ctx.PagasiCatalog;
}
let C = catalogoNuevo();
// 14-oct-2026 noche, Adam: el seguro va dentro del precio; la web y la calculadora no lo cobran aparte
ok('condiciones de Adam: 500% (15-oct por la tarde), sin seguro aparte, inicial desde 40%, plazos 6, 9 y 12', C.condiciones.apy === 500 && C.condiciones.seguroPct === 0 && C.condiciones.inicialMin === 40 && C.condiciones.inicialMax === 60 && C.condiciones.plazos.join() === '6,9,12');
let p = C.calcPlan(1320, 12);
ok('moto de $1.320 al 40%: inicial $528, sin seguro, al firmar $528, financiado $792', p.inicial === 528 && p.seguro === 0 && p.alFirmar === 528 && p.financiado === 792);
ok('cuota quincenal $104, $84 y $74 a 6, 9 y 12 meses (500%)', C.calcPlan(1320, 6).quincenal === 104 && C.calcPlan(1320, 9).quincenal === 84 && p.quincenal === 74);
ok('al 60%: cuota de $50 a 12 meses', C.calcPlan(1320, 12, 0.60).quincenal === 50);
ok('todo cuadra a simple vista: mensual = 2 quincenas y total = cuota por número de cuotas', p.mensual === 148 && p.totalEnCuotas === 74 * 24 && p.inicial + p.financiado === 1320);
ok('redondea hacia arriba como la calculadora (regla del 11-sep), sin sumar un dólar por la coma flotante', C.arriba(88.01) === 89 && C.arriba(726.0000000001) === 726 && C.money(587.4) === '$588');
const e = C.calcExacto(1320, 12);
ok('el cálculo exacto da la tasa de 500% efectiva anual', Math.abs(Math.pow(1 + (Math.pow(6, 1/24) - 1), 24) - 6) < 1e-9 && e.seguro === 0);
ok('plan() de la web usa la inicial mínima y 12 meses', JSON.stringify(C.plan(1)) === JSON.stringify(C.calcPlan(1320, 12)));
const N = C.base.length;
ok('la lista de respaldo: los 46 de siempre y los de Veloz primero, con promo', N === 49 && C.motos.length === N && C.origen === 'base' && C.motos.slice(0, 3).every(m => m.sedeName === 'Veloz' && m.promo && m.tag === 'Promo'));
ok('precios de Veloz: RZ 200 $1.390, CG200 rin de rayo $1.390 y rin de paleta $1.490', C.get(47).modelo === 'RZ 200' && C.get(47).precio === 1390 && C.get(48).precio === 1390 && C.get(49).precio === 1490);

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
ok('...sin los eliminados; el que no tiene precio queda "por confirmar"', !r.motos.some(m => m.id === 3) && r.motos.length === 4 && r.motos.find(m => m.id === 48).sinPrecio === true && r.motos.find(m => m.id === 48).precio === null);
ok('...y un modelo nuevo sin nombre web toma el del modelo', r.motos.find(m => m.id === 47).name === 'Nueva 200');
ok('condiciones con datos malos vuelven a las de respaldo', C.condValidas({ apy:-5, seguroPct:80, inicialMin:0, plazos:['x'] }).apy === 500 && C.condValidas({ seguroPct:80 }).seguroPct === 0 && C.condValidas({ plazos:['x'] }).plazos.join() === '6,9,12');

(async () => {
  // cargar(): lee la base una vez, aplica, guarda copia; si falla, queda la lista de respaldo
  const guardado = {};
  const ls = { getItem:k => guardado[k] || null, setItem:(k, v) => { guardado[k] = v; } };
  let llamadas = 0, urlPedida = '';
  C = catalogoNuevo({ localStorage: ls, fetch: url => { llamadas++; urlPedida = url; return Promise.resolve({ ok:true, json:() => Promise.resolve({ documents: docs }) }); } });
  await C.cargar(); await C.cargar();
  ok('cargar() pide el catálogo una sola vez, a la base de la compañía', llamadas === 1 && /projects\/(pagasi-v2|pagasi26-65ced)\/databases\/\(default\)\/documents\/catalogo\?/.test(urlPedida) && /key=AIza/.test(urlPedida));
  ok('la web muestra solo lo disponible, con el precio de Liz', C.origen === 'firestore' && C.motos.length === 2 && !C.get(2) && C.get(1).precio === 1400);
  ok('el que no tiene precio va aparte, para "Pregunta el precio" (y no a las cuotas)', C.proximos.length === 1 && C.proximos[0].modelo === 'SIN PRECIO' && !C.get(48));
  ok('y calcula con las condiciones guardadas (700%, seguro 5%)', C.condiciones.apy === 700 && C.plan(1).seguro === 70);
  ok('guarda una copia en el navegador para la próxima visita', JSON.parse(guardado.pagasi_catalogo_v1).motos.length === 4);
  const C2 = catalogoNuevo({ localStorage: ls, fetch: () => Promise.reject(new Error('sin internet')) });
  await C2.cargar();
  ok('sin internet: usa la última copia buena', C2.origen === 'cache' && C2.get(1).precio === 1400 && C2.condiciones.apy === 700);
  const C3 = catalogoNuevo({ fetch: () => Promise.resolve({ ok:false, status:403, json:() => Promise.resolve({}) }) });
  await C3.cargar();
  ok('si la base no deja leer (Reglas): sigue la lista de respaldo, sin romperse', C3.origen === 'base' && C3.motos.length === 49 && C3.condiciones.apy === 500 && C3.proximos.length === 5);
  const C4 = catalogoNuevo({ fetch: () => Promise.resolve({ ok:true, json:() => Promise.resolve({}) }) });
  await C4.cargar();
  ok('catálogo vacío en la base: sigue la lista de respaldo', C4.origen === 'base' && C4.motos.length === 49);

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
  ok('Catálogo web está en el menú (Sistema), con nombre y en el rol Administrador', ctx.MODULOS.some(m => m.id === 'catalogo' && m.grupo === 'Sistema') && /catalogo:'Catálogo web'/.test(src('assets/pagasi-app.js')) && /'cumplimiento','catalogo',('metricas',)?'perm_delete'/.test(src('assets/pagasi-app.js')));
  ok('...y también en el menú de un empleado con el permiso', /keys:\['plan','config','concesionarios','scores','users','cumplimiento','catalogo'\]/.test(src('assets/pagasi-app.js')));

  S.currentUser = { uid:'u1', nombre:'Pedro', rol:'Empleado', permisos:['dash'] };
  ok('sin el permiso no entra', ctx.catPuedeEditar() === false && /Pídele a un administrador/.test(ctx.PG.catalogo()));
  S.currentUser = { uid:'liz', nombre:'Liz', rol:'Empleado', permisos:['dash','catalogo'] };
  ok('Liz, con el permiso "catalogo", sí entra (sin ser administradora)', ctx.catPuedeEditar() === true && ctx.catEsAdmin() === false);
  await ctx.catCargar(true);
  ok('catálogo vacío: ofrece cargar los modelos de la web', /Cargar los 49 modelos de la web/.test(ctx.PG.catalogo()));
  await ctx.catImportar();
  ok('Liz carga los 49 modelos y las 5 Veloz sin precio (con promo, foto y precio por confirmar)', coleccion.docs['901'].precio === null && coleccion.docs['901'].promo === true && /veloz-dt-170/.test(coleccion.docs['901'].image) && coleccion.docs['47'].promo === true && coleccion.docs['47'].orden < 0 && coleccion.docs['47'].tag === '' && Object.keys(coleccion.docs).filter(k => k !== '_condiciones').length === 54 && coleccion.docs['1'].precio === 1320 && coleccion.docs['1'].sedeName === 'EK Bello Monte' && coleccion.docs['1'].disponible === true && /assets\/motos/.test(coleccion.docs['1'].image));
  ok('...pero las condiciones no: esas las crea un administrador', !coleccion.docs._condiciones);
  let h = ctx.PG.catalogo();
  ok('la tabla muestra precio, seguro, inicial, al firmar y las cuotas 6 · 9 · 12', /NEW HORSE 150/.test(h) && /\$528<\/td>/.test(h) && /\$104<\/td>[^]*?\$84<\/td>[^]*?\$74<\/td>/.test(h) && /Cuota 6 m<\/th>[^]*?Cuota 9 m<\/th>[^]*?Cuota 12 m<\/th>/.test(h));
  ok('Liz no ve las condiciones del plan (solo administradores)', !/Condiciones del plan/.test(h) && !/id="cat_apy"/.test(h) && !/id="cat_seguro"/.test(h));
  ok('los botones de nuevo modelo y Excel están', /catNuevoModelo\(\)/.test(h) && /Descargar reporte Excel/.test(h));
  ok('filtros con contadores: en la web, ocultos, promo, sin foto y precio por confirmar', /data-cat-chip="sinfoto"/.test(h) && /data-cat-chip="sinprecio"/.test(h) && />Precio por confirmar <b[^>]*>5</.test(h) && /Todos los concesionarios/.test(h));
  ok('cada moto con precio tiene "Ver en la web" y dice quién la cambió', /simulador\.html\?moto=1"/.test(h) && /Cambió Liz/.test(h));
  ok('la de precio por confirmar se marca y no muestra cuotas', /POR CONFIRMAR/.test(h) && /En la web: "Pregunta el precio"/.test(h));

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
  ok('Liz no puede guardar las condiciones', !coleccion.docs._condiciones && avisos.some(a => /las cambia un administrador/.test(a)));
  S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador', permisos:[] };
  doc.getElementById('cat_apy').value = '650'; doc.getElementById('cat_seguro').value = '4.5';
  await ctx.catGuardarCondiciones();
  ok('el administrador guarda la tasa, el seguro, la inicial y los plazos', coleccion.docs._condiciones.apy === 650 && coleccion.docs._condiciones.seguroPct === 4.5 && coleccion.docs._condiciones.inicialMin === 40 && coleccion.docs._condiciones.plazos.join() === '6,9,12');
  S.currentUser = { uid:'liz', nombre:'Liz', rol:'Empleado', permisos:['dash','catalogo'] };
  doc.getElementById('cat_seguro').value = '5'; doc.getElementById('cat_apy').value = '900';
  const antesLiz = escritos.length;
  await ctx.catGuardarCondiciones();
  ok('Liz tampoco cambia el seguro ni la tasa (no se escribe nada)', escritos.length === antesLiz && coleccion.docs._condiciones.seguroPct === 4.5 && coleccion.docs._condiciones.apy === 650);
  S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador', permisos:[] };
  ok('el administrador sí ve las condiciones', /Condiciones del plan/.test(ctx.PG.catalogo()) && /id="cat_apy"/.test(ctx.PG.catalogo()));
  S.currentUser = { uid:'liz', nombre:'Liz', rol:'Empleado', permisos:['dash','catalogo'] };

  const filas = ctx.catFilasExcel();
  // Con las condiciones guardadas en la prueba hay seguro (4,5%): sale su columna
  ok('Excel: concesionario primero, las columnas que pidieron y EN LA WEB al final', filas[0].join('|') === 'CONCESIONARIO|MODELO|PRECIO AL CONTADO|COSTO DEL SEGURO|INICIAL MÍNIMA|CUOTA QUINCENAL 6 MESES|CUOTA QUINCENAL 9 MESES|CUOTA QUINCENAL 12 MESES|EN LA WEB');
  const nh = filas.find(f => f[1] === 'NEW HORSE 150');
  ok('Excel: los mismos montos que la web (precio $1.400, seguro 4,5% = $63, inicial $560)', nh && nh[0] === coleccion.docs['1'].sedeName && nh[2] === 1400 && nh[3] === 63 && nh[4] === 560 && nh[7] === ctx.PagasiCatalog.calcPlan(1400, 12, 0.4, ctx.catCondiciones()).quincenal && nh[8] === 'SÍ');
  ok('Excel: un renglón por modelo, sin el eliminado, y los sin precio dicen POR CONFIRMAR', filas.find(f => f[1] === 'DT 170')[2] === 'POR CONFIRMAR' && filas.length === 1 + 53 && !filas.some(f => f[1] === coleccion.docs['3'].modelo));
  const concs = filas.slice(1).map(f => f[0]);
  ok('Excel: ordenado por concesionario (no por marca)', concs.every((x, i) => i === 0 || concs[i - 1].localeCompare(x, 'es', { sensitivity:'base' }) <= 0));
  const seg0 = ctx._cat.cond; ctx._cat.cond = Object.assign({}, seg0, { seguroPct:0 });
  ok('Excel: sin seguro (0%) no sale la columna del seguro', !ctx.catFilasExcel()[0].includes('COSTO DEL SEGURO') && ctx.catFilasExcel()[0].length === 8);
  ctx._cat.cond = seg0;
  ok('Excel: lleva filtros en la fila de títulos', /hoja\['!autofilter'\] = \{ ref: X\.utils\.encode_range/.test(src('logic/catalogo.js')));

  // ── Por concesionario, no por marca (Adam, 15-oct-2026) ──
  S.concesionarios = [ { id:'C-BT', nombre:'BERA TRINIDAD', activo:true }, { id:'C-BC', nombre:'BERA Chacao', activo:true }, { id:'C-X', nombre:'Cerrado', activo:false }, { id:'C-E', nombre:'Eliminado', eliminado:true } ];
  ctx.catNuevoModelo();
  let hm = doc.getElementById('mbd').innerHTML;
  ok('el concesionario se elige entre los del sistema (activos y no eliminados), no se escribe', /id="cm_conc"/.test(hm) && /value="C-BT"/.test(hm) && /value="C-BC"/.test(hm) && !/Cerrado/.test(hm) && !/Eliminado/.test(hm) && !/id="cm_sede"/.test(hm));
  Object.assign(doc.getElementById('cm_modelo'), { value:'nueva 250' }); doc.getElementById('cm_precio').value = '2100'; doc.getElementById('cm_conc').value = 'C-BT';
  doc.getElementById('cm_name').value = ''; doc.getElementById('cm_cc').value = '250cc'; doc.getElementById('cm_type').value = ''; doc.getElementById('cm_cat').value = ''; doc.getElementById('cm_tag').value = ''; doc.getElementById('cm_disp').checked = true;
  ctx.S.saveFn(); await new Promise(r => setImmediate(r));
  const nuevo = coleccion.docs['50'];
  ok('nuevo modelo: número siguiente, mayúsculas y el concesionario del sistema con su código', nuevo && nuevo.id === 50 && nuevo.modelo === 'NUEVA 250' && nuevo.name === 'Nueva 250' && nuevo.sedeName === 'BERA TRINIDAD' && nuevo.sede === 'bera-trinidad' && nuevo.concesionarioId === 'C-BT' && nuevo.disponible === true);
  ctx.catNuevoModelo(); doc.getElementById('cm_modelo').value = 'X'; doc.getElementById('cm_precio').value = '100'; doc.getElementById('cm_conc').value = '';
  const antesSin = Object.keys(coleccion.docs).length; ctx.S.saveFn(); await new Promise(r => setImmediate(r));
  ok('sin concesionario no se guarda', Object.keys(coleccion.docs).length === antesSin && avisos.some(a => /Elige el concesionario/.test(a)));
  // Copiar: el mismo modelo para BERA Chacao con otro precio
  ctx.catCopiar(50);
  hm = doc.getElementById('mbd').innerHTML;
  // los campos del modal son elementos falsos que no leen el HTML: se les pone lo que el modal muestra
  doc.getElementById('cm_modelo').value = 'NUEVA 250'; doc.getElementById('cm_cc').value = '250cc'; doc.getElementById('cm_name').value = '';
  ok('"Copiar" abre el modelo con sus datos, sin concesionario ni precio', /Copiar a otro concesionario/.test(doc.getElementById('mtt').textContent) && /value="NUEVA 250"/.test(hm) && /value="250cc"/.test(hm) && !/value="C-BT" selected/.test(hm) && !/value="2100"/.test(hm));
  doc.getElementById('cm_conc').value = 'C-BC'; doc.getElementById('cm_precio').value = '2250';
  ctx.S.saveFn(); await new Promise(r => setImmediate(r));
  const copia = coleccion.docs['51'];
  ok('la copia es otra fila: mismo modelo, BERA Chacao, su precio, y la original no cambia', copia && copia.modelo === 'NUEVA 250' && copia.concesionarioId === 'C-BC' && copia.sedeName === 'BERA Chacao' && copia.precio === 2250 && coleccion.docs['50'].precio === 2100 && coleccion.docs['50'].concesionarioId === 'C-BT');
  // Un grupo viejo entero pasa a un concesionario del sistema
  h = ctx.PG.catalogo();
  ok('los grupos viejos (sin concesionario del sistema) ofrecen "Asignar concesionario"; los nuevos no', (h.match(/catAsignarGrupo\(/g) || []).length >= 5 && /catAsignarGrupo\(&quot;Veloz&quot;\)/.test(h) && !/catAsignarGrupo\(&quot;BERA TRINIDAD&quot;\)/.test(h) && /catCopiar\(50\)/.test(h));
  ctx.catAsignarGrupo('Veloz'); doc.getElementById('cg_conc').value = 'C-BC';
  ctx.S.saveFn(); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  const veloz = Object.values(coleccion.docs).filter(d => d && d.concesionarioId === 'C-BC' && /^(RZ 200|CG200|DT 170)/.test(d.modelo || ''));
  ok('todos los Veloz pasan a BERA Chacao con sus precios', veloz.length >= 3 && veloz.every(d => d.sedeName === 'BERA Chacao' && d.sede === 'bera-chacao') && coleccion.docs['47'].precio === 1390 && !Object.values(coleccion.docs).some(d => d && d.sedeName === 'Veloz' && !d.eliminado));
  // La tabla: tantas columnas en la cabecera como en cada fila (15-oct: quedo un <th> fantasma y
  // las cuotas se veian corridas), y el filtro lista los concesionarios del sistema
  h = ctx.PG.catalogo();
  const nTh = (h.match(/<thead><tr>([^]*?)<\/tr><\/thead>/)[1].match(/<th/g) || []).length;
  const fila1 = h.match(/<tr data-id="50"[^]*?<\/tr>/)[0], nTd = (fila1.match(/<td/g) || []).length;
  ok('la cabecera tiene las mismas columnas que las filas (' + nTh + ')', nTh === nTd && (nTh === 10 || nTh === 12) && new RegExp('colspan="' + nTh + '"').test(h));
  ok('el filtro lista los concesionarios del sistema y los nombres viejos aparte', /<option value="c:C-BT"[^>]*>BERA TRINIDAD</.test(h) && /<optgroup label="Nombres viejos \(sin asignar\)">[^]*?<option value="n:Boleita"/.test(h) && !/<option value="n:BERA Chacao"/.test(h));
  ok('filtrar por BERA Chacao deja sus filas (por id) y las viejas con ese nombre', ctx._catPasaSede({ concesionarioId:'C-BC', sedeName:'BERA Chacao' }, 'c:C-BC') && ctx._catPasaSede({ sedeName:'BERA Chacao' }, 'c:C-BC') && !ctx._catPasaSede({ concesionarioId:'C-BT', sedeName:'BERA TRINIDAD' }, 'c:C-BC') && ctx._catPasaSede({ sedeName:'Boleita' }, 'n:Boleita') && ctx._catPasaSede({ sedeName:'x' }, ''));
  // El asistente de credito: el catalogo de la web por concesionario, con el precio de cada uno
  const CW = catalogoNuevo(); CW.aplicar(CW.desdeDocumentos(Object.keys(coleccion.docs).filter(k => k !== '_condiciones').map(k => ({ name:'projects/x/databases/(default)/documents/catalogo/' + k, fields:aFields(coleccion.docs[k]) }))).motos, null, 'firestore');
  ok('la web conserva el concesionario del sistema de cada fila', CW.get(50).concesionarioId === 'C-BT' && CW.get(51).concesionarioId === 'C-BC' && CW.get(47).concesionarioId === 'C-BC');
  ctx.PagasiCatalog = CW; ctx.window._wzCatPedido = true;
  vm.runInContext("CATALOGO.splice(0, CATALOGO.length, {modelo:'NUEVA 250', precio:1}, {modelo:'SOLO EN PLAN', marca:'BERA'})", ctx);
  const opts = ctx._wzCatOptions();
  ok('el selector del asistente agrupa por concesionario y muestra el precio de cada uno', /<optgroup label="BERA TRINIDAD">[^]*?data-precio="2100"[^]*?<\/optgroup>/.test(opts) && /<optgroup label="BERA Chacao">[^]*?data-precio="2250"[^]*?Nueva 250 — \$2,250/.test(opts));
  ok('lo de Plan & Precios que no está en la web va al final, sin repetir lo que ya está', /Otros modelos \(Plan & Precios/.test(opts) && /data-modelo="SOLO EN PLAN"/.test(opts) && (opts.match(/data-modelo="NUEVA 250"/g) || []).length === 2);
  S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador', permisos:[] };
  ctx.WZ = { step:3, precio:0, concesionarioId:'' }; ctx.window._wzEditando = null;
  const campos = {}; ['wz_precio_base_real','wz_precio','wz_concesionario_id','wz_moto_inv','wz_marca','wz-mpago-wrap','wz_new_cat_div','wz_cuota_sug'].forEach(id => { campos[id] = doc.getElementById(id) || (() => { const e = { value:'', style:{}, innerHTML:'' }; return e; })(); });
  const elsPrev = doc.getElementById; doc.getElementById = id => campos[id] || elsPrev(id);
  const opt = { getAttribute(k){ return { 'data-modelo':'NUEVA 250', 'data-precio':'2250', 'data-conc':'C-BC' }[k] || null; }, text:'Nueva 250 — $2,250' };
  ctx._wzPickMotoCat({ value:'web-51', options:[opt], selectedIndex:0 });
  ok('al elegir la fila de BERA Chacao: el modelo, el precio de ESE concesionario y la sede se llenan solos', ctx.WZ.motoModelo === 'NUEVA 250' && String(campos.wz_precio_base_real.value) === '2250' && ctx.WZ.precio === 2250 && ctx.WZ.concesionarioId === 'C-BC');
  campos.wz_precio_base_real.value = '1999'; ctx._wzPickMotoCat({ value:'web-50', options:[{ getAttribute(k){ return { 'data-modelo':'NUEVA 250', 'data-precio':'2100', 'data-conc':'C-BT' }[k] || null; }, text:'x' }], selectedIndex:0 });
  ok('si el empleado ya escribió un precio, no se pisa', String(campos.wz_precio_base_real.value) === '1999' && ctx.WZ.concesionarioId === 'C-BT');
  doc.getElementById = elsPrev;

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
