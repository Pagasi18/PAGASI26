// 14/15-oct-2026, Adam: el credito usa la formula del catalogo (la misma de pagasi.io y de la
// calculadora de los vendedores). "Deja una fija y que se pueda editar en tal caso": cuota
// fija, editable y marcada. Sin seguro aparte: desde el 14-oct en la noche va dentro del
// precio. El contrato no cambia.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
// Como en el navegador, .value siempre devuelve texto aunque se le asigne un numero
function elemento(){ var v=''; return { innerHTML:'', textContent:'', get value(){ return v; }, set value(x){ v = String(x); }, className:'', id:'', style:{}, dataset:{}, checked:false, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, click(){} }; }
const els = {};
const doc = { getElementById(id){ return els[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const pon = (id, v) => { els[id] = els[id] || elemento(); if (v !== undefined) els[id].value = String(v); return els[id]; };
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
ctx.DB.saveMovimiento = () => Promise.resolve(); ctx.DB.savePago = () => Promise.resolve(); ctx.DB.saveCred = () => Promise.resolve();
const S = ctx.S, D = ctx.PagasiCatalog;

// ── 1. La formula es la de la web y la calculadora de los vendedores ──
const cond = ctx.planCatCond();
ok('condiciones del catalogo: tasa 500 (15-oct por la tarde), sin seguro aparte, inicial desde 40%, plazos 6/9/12', cond.apy === 500 && cond.seguroPct === 0 && cond.inicialMin === 40 && cond.plazos.join() === '6,9,12');
const web = D.calcPlan(1390, 12, 0.40, cond);
const f = ctx.planCatalogo(1390, null, 12);
ok('RZ 200 ($1.390, 40%, 12 meses): mismos numeros que pagasi.io', f.ini === web.inicial && f.cuotaQ === web.quincenal && f.alFirmar === web.alFirmar && f.totalCuotas === 24);
ok('inicial minima 40% = $556 y eso es lo que paga al firmar (sin seguro)', f.ini === 556 && f.alFirmar === 556 && f.seguro === 0);
ok('cuota sin decimales, redondeada hacia arriba ($78 al 500%)', f.cuotaQ === 78 && f.cuotaQ >= D.calcExacto(1390, 12, 0.40, cond).quincenal);
const f9 = ctx.planCatalogo(1390, 700, 9);
ok('inicial escrita en dolares ($700) y plazo 9: la cuota baja y son 18 cuotas', f9.ini === 700 && f9.totalCuotas === 18 && f9.cuotaQ === D.calcPlan(1390, 9, 700 / 1390, cond).quincenal);
ok('sin precio no hay plan', ctx.planCatalogo(0, null, 12) === null);

// ── 2. Cuota fija, editable y marcada ──
let k = ctx.planCatalogoCampos(1390, 556, 12, f.cuotaQ);
ok('cuota de la formula: no queda marcada', k.cuotaEditada === false && k.cuotaFormula === f.cuotaQ && k.apyCatalogo === 500 && k.seguro === undefined);
k = ctx.planCatalogoCampos(1390, 556, 12, f.cuotaQ - 5);
ok('cuota escrita a mano ($5 menos): queda marcada con la de la formula', k.cuotaEditada === true && k.cuotaFormula === f.cuotaQ);
k = ctx.planCatalogoCampos(1390, 556, 12, f.cuotaQ + 0.4);
ok('centavos de diferencia no la marcan', k.cuotaEditada === false);

// ── 3. La calculadora del asistente llena sola (credito nuevo) ──
['wz_cuota_sug','wz_precio_base_real','wz_precio','wz_ini_real','wz_cuota_q_custom','wz_plazo_custom'].forEach(id => pon(id, ''));
ctx.WZ = { step:3, precio:1390 }; ctx.window._wzEditando = null; ctx.window._wzCondPedida = true;
pon('wz_precio_base_real', 1390); pon('wz_precio', 1390);
ctx._wzCuotaSug();
ok('credito nuevo: inicial 40%, cuota y plazo 12 se llenan solos', els.wz_ini_real.value === '556' && els.wz_cuota_q_custom.value === String(f.cuotaQ) && els.wz_plazo_custom.value === '12');
ok('la calculadora no menciona el seguro y muestra la tasa', !/[Ss]eguro/.test(els.wz_cuota_sug.innerHTML) && /Tasa 500%/.test(els.wz_cuota_sug.innerHTML) && /\$556/.test(els.wz_cuota_sug.innerHTML));
ok('los chips de inicial empiezan en 40% y los de plazo son 6, 9 y 12', /_wzCalcPct\(0\.4\)/.test(els.wz_cuota_sug.innerHTML) && !/_wzCalcPct\(0\.35\)/.test(els.wz_cuota_sug.innerHTML) && /_wzCalcPlazo\(6\)/.test(els.wz_cuota_sug.innerHTML) && !/_wzCalcPlazo\(24\)/.test(els.wz_cuota_sug.innerHTML));
ctx._wzCalcPlazo(6);
ok('elegir 6 meses cambia la cuota sola', els.wz_plazo_custom.value === '6' && els.wz_cuota_q_custom.value === String(ctx.planCatalogo(1390, 556, 6).cuotaQ));
els.wz_cuota_q_custom.value = '150'; ctx._wzCuotaTocada('150');
ok('cuota escrita a mano: se respeta y se avisa con la de la formula', els.wz_cuota_q_custom.value === '150' && ctx.WZ._cuotaManual === true && /Cuota escrita a mano: \$150/.test(els.wz_cuota_sug.innerHTML) && /Volver a la fórmula/.test(els.wz_cuota_sug.innerHTML));
ctx._wzCalcPct(0.5);
ok('cambiar la inicial no pisa la cuota escrita a mano', els.wz_cuota_q_custom.value === '150' && els.wz_ini_real.value === '695');
ctx._wzCuotaVolver();
ok('"Volver a la fórmula" la recalcula', ctx.WZ._cuotaManual === false && els.wz_cuota_q_custom.value === String(ctx.planCatalogo(1390, 695, 6).cuotaQ));
els.wz_ini_real.value = '500'; ctx.WZ._calcPct = 'manual'; ctx._wzCuotaSug();
ok('inicial escrita por debajo del 40%: se avisa', /por debajo del 40%/.test(els.wz_cuota_sug.innerHTML) && els.wz_ini_real.value === '500');
['wz_ini_real','wz_cuota_q_custom','wz_plazo_custom'].forEach(id => pon(id, ''));
ctx.WZ = { step:3, precio:1390 }; pon('wz_cuota_q_custom', 99); pon('wz_plazo_custom', 12);
ctx._wzCuotaSug();
ok('un borrador con cuota propia ($99) no se pisa: queda como escrita a mano', els.wz_cuota_q_custom.value === '99' && ctx.WZ._cuotaManual === true);

// ── 4. Al EDITAR un credito viejo no se llena nada solo ──
['wz_ini_real','wz_cuota_q_custom','wz_plazo_custom'].forEach(id => pon(id, ''));
ctx.WZ = { step:3, precio:1390 }; ctx.window._wzEditando = 'CRED-9';
pon('wz_ini_real', 625); pon('wz_cuota_q_custom', 88); pon('wz_plazo_custom', 12);
ctx._wzCuotaSug();
ok('editando: la cuota firmada ($88) y la inicial no cambian; se ofrece "Aplicar"', els.wz_cuota_q_custom.value === '88' && els.wz_ini_real.value === '625' && /Aplicar este plan/.test(els.wz_cuota_sug.innerHTML));
ok('editando: el resumen no agrega marca', ctx._wzFilasCatalogo({ precioBaseReal:1390, ini:625, plazo:12, cuotaQ:88 }).length === 0);
ctx.window._wzEditando = null;
const filas = ctx._wzFilasCatalogo({ precioBaseReal:1390, ini:556, plazo:12, cuotaQ:f.cuotaQ - 10 });
ok('resumen del paso 4: la marca de la cuota con la de la formula', filas.length === 1 && /fórmula da \$/.test(filas[0][1]));
ok('resumen del paso 4 sin marca cuando es la de la formula', ctx._wzFilasCatalogo({ precioBaseReal:1390, ini:556, plazo:12, cuotaQ:f.cuotaQ }).length === 0);

// ── 5. Aprobaciones: la marca ──
const cred = { id:'CRED-900', cli:'Cliente Prueba', modelo:'RZ 200', cuotaQ:150, cuotaFormula:f.cuotaQ, cuotaEditada:true, ini:556, precio:1390, estado:'pendiente_revision', creadoPor:'Vendedor X', concesionarioId:null };
S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador' };
ctx.isAdminUser = () => true;
S.creds = [cred]; S.pagos = []; S.movimientos = [];
ctx._cuentasBanc = [{ nombre:'Binance' }];
ok('la bandeja muestra "Cuota escrita a mano" con la de la formula', /Cuota escrita a mano/.test(ctx._aprMarcaCuota(cred)) && /\$150\.00/.test(ctx._aprMarcaCuota(cred)) && ctx._aprMarcaCuota({ cuotaEditada:false }) === '');
['mbd','mft','mtt','msb','mic','modal-box','ov'].forEach(id => pon(id));
ctx.$ = id => doc.getElementById(id);
ctx._aprAprobar('CRED-900');
ok('el modal de aprobar avisa la cuota y no pide seguro', /Cuota escrita a mano/.test(els.mbd.innerHTML) && !/apr_seg_monto/.test(els.mbd.innerHTML) && !/seguro/i.test(els.mft.innerHTML));
pon('apr_ini_monto', 556); pon('apr_ini_metodo', 'Binance'); pon('apr_ini_ref', 'r9');
ctx._aprAprobarConfirm('CRED-900');
ok('al aprobar: la inicial como pago + movimiento, y nada mas', cred.estado === 'activo' && S.pagos.length === 1 && S.pagos[0].monto === 556 && S.movimientos.length === 1 && S.movimientos[0].tipoOperacion === 'inicial_credito');

// ── 6. Nada de seguro aparte y el contrato no cambia ──
const src = fs.readFileSync(path.join(ROOT, 'logic/creditos.js'), 'utf8');
ok('el credito nuevo guarda cuotaFormula y cuotaEditada, no seguro', /cuotaEditada: !!_catNew\.cuotaEditada/.test(src) && !/seguro: _catNew/.test(src) && !/movSeguroCredito/.test(src));
ok('ningun archivo del sistema crea movimientos de seguro', !/seguro_credito/.test(fs.readFileSync(path.join(ROOT, 'logic/financiero.js'), 'utf8')) && !/seguro_credito/.test(fs.readFileSync(path.join(ROOT, 'logic/aprobaciones.js'), 'utf8')));
ok('los contratos no leen el seguro', !/\.seguro\b/.test(fs.readFileSync(path.join(ROOT, 'logic/contratos-protect.js'), 'utf8')) && !/\.seguro\b/.test(fs.readFileSync(path.join(ROOT, 'logic/contratos.js'), 'utf8')));
console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
