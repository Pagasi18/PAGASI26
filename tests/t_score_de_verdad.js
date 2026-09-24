// 24-sep-2026, Adam: "primero arregla el score, creo que es lo primordial". El análisis
// de la cartera de la 18 dijo que el score no predecía nada (47%): capacidad de pago
// salía 10 y garantías 50 en todos. Causas: la solicitud leía la pantalla y cada paso
// borra la anterior (ingreso, fiador, banco, vivienda del paso 1 y 2 se perdían al llegar
// al paso 4); la ficha buscaba los datos con nombres que no existen y leía "fiador: no"
// como que sí tenía; y había dos fórmulas distintas. Ahora es una sola y recibe los datos.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function elemento(){ return { innerHTML:'', textContent:'', value:'', style:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], appendChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;}, document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'}, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}}, fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';}, confirm(){ return true; }, open(){ return {document:{write(){},close(){}}}; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};}; ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){}; ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};}; ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
const S = ctx.S; S.creds = []; S.clientes = [];

// ── 1. La solicitud ya no pierde los datos al cambiar de paso ──
// Como queda WZ al llegar al paso 4: los campos del paso 1 y 2 ya no están en pantalla
function wz(extra){ vm.runInContext("WZ = " + JSON.stringify(Object.assign({ step:4, precio:0, wz_ing:'900', ing:900, wz_ifam:'', wz_emp:'formal', emp:'formal', wz_ant:'5', ant:'5', wz_banco:'no', wz_viv:'alquilada', wz_rem:'no', wz_conocio:'referido', fiador_tiene:'si', cashea:'no', _chip_wz_hist_g:'bueno', _chip_wz_deuda_g:'no', _chip_wz_dep_g:'0', wz_tel:'0412', wz_uso:'delivery' }, extra||{})) + ";", ctx); ctx._wzScore(); return ctx.WZ; }
let W = wz();
ok('la capacidad de pago ya no es 10: el ingreso de 900 llega a la fórmula', W.f2 >= 15 && W.f2 !== 10);
ok('las garantías ya no son 50: el fiador cuenta (+45) y "sin banco" resta (−10)', W.f4 === 60);
ok('la antigüedad y el uso de la moto llegan a estabilidad', W.f3 >= 90);
ok('"referido" llega a confianza', W.f5 >= 80);
const conFiador = W.score; W = wz({ fiador_tiene:'no' });
ok('quitar el fiador baja el score', W.score < conFiador);
W = wz({ wz_ing:'0', ing:0 });
ok('sin ingreso la capacidad de pago cae a cero', W.f2 <= 10);
W = wz();
const directo = ctx.calcularScoreConCfg(W.scoreInput);
ok('la solicitud usa la misma fórmula que la ficha y el simulador', directo.score === W.score && directo.f2 === W.f2 && directo.f4 === W.f4);
ok('los datos con que salió el score quedan en WZ para guardarse con el crédito', W.scoreInput && W.scoreInput.ing === 900 && W.scoreInput.fiador === true && W.scoreInput.conocio === 'referido');
ok('...y el crédito los guarda congelados', /score_aprobacion: WZ\.score\|\|0,/.test(src('logic/creditos.js')) && /score_input: WZ\.scoreInput\|\|null,/.test(src('logic/creditos.js')));
// si el campo SÍ está en pantalla, manda la pantalla
form['wz_ing'] = elemento(); form['wz_ing'].value = '150';
W = wz(); ok('si el campo está en pantalla, manda la pantalla', W.scoreInput.ing === 150); delete form['wz_ing'];

// ── 2. La ficha del cliente lee los datos con su nombre real ──
const cliente = { id:'CLI-9', nombre:'PRUEBA', tel:'0412', ingreso:900, ingreso_familiar:0, trabajo:'formal', antiguedad:'5', historial:'bueno', deudas:'no', banco_estado:'no', vivienda:'alquilada', remesas:'si', dependientes:2, fiador:'no', conocio:'referido', cashea:'si', cashea_nivel:4, cashea_estado:'al_dia', cashea_total_compras:'4-5', cashea_deuda:'no', ref1:{nom:'Ana'} };
let inp = ctx.scoreInputDeCliente(cliente, {});
ok('trabajo → empleo, antiguedad, historial, deudas, banco_estado, vivienda', inp.emp==='formal' && inp.ant==='5' && inp.hist==='bueno' && inp.deuda==='no' && inp.banco==='no' && inp.viv==='alquilada');
ok('"fiador: no" ya NO cuenta como fiador', inp.fiador === false);
ok('remesas, dependientes, referencias y cómo nos conoció', inp.rem === true && inp.dep === 2 && inp.tieneRef === true && inp.conocio === 'referido');
ok('Cashea llega a la fórmula', inp.cashea === 'si' && inp.cashea_nivel === 4 && inp.cashea_estado === 'al_dia');
inp = ctx.scoreInputDeCliente({ tipo_empleo:'publico', antiguedad_laboral:'3', historial_crediticio:'malo', cuenta_bancaria:'activa', tipo_vivienda:'propia', recibe_remesas:'si', fiador:'si' }, {});
ok('las fichas viejas con los nombres antiguos siguen leyéndose', inp.emp==='publico' && inp.ant==='3' && inp.hist==='malo' && inp.banco==='activa' && inp.viv==='propia' && inp.rem && inp.fiador);
S.creds = [{ id:'M-050', clienteId:'CLI-9', fecha:'2026-09-20', cuotaQ:60, uso_moto:'negocio' }];
inp = ctx.scoreInputDeCliente(cliente);
ok('toma la cuota y el uso del último crédito del cliente', inp.cuotaQ === 60 && inp.uso === 'negocio');
const sc = ctx.recalcularScoreCliente(cliente, false);
ok('el recálculo devuelve un número, no un objeto', typeof sc === 'number' && sc >= 300 && sc <= 850);
const scVacio = ctx.recalcularScoreCliente({ id:'X', nombre:'VACIO' }, false);
ok('y un cliente con datos de verdad no da lo mismo que uno vacío', sc !== scVacio);

// ── 3. La fórmula única ──
const base = { ing:900, cuotaQ:60, emp:'formal', ant:'5', hist:'ninguno', deuda:'no', dep:0, banco:'activa', viv:'familiar' };
const a = ctx.calcularScoreConCfg(Object.assign({}, base, { cashea:'si', cashea_nivel:5, cashea_estado:'al_dia' }));
const b = ctx.calcularScoreConCfg(Object.assign({}, base, { cashea:'si', cashea_nivel:5, cashea_estado:'mora_grave' }));
const c = ctx.calcularScoreConCfg(base);
ok('Cashea al día suma y en mora grave resta', a.f1 > c.f1 && b.f1 < c.f1);
ok('la cuota se compara como mensual contra el ingreso', Math.abs(a.ratio - 120/900) < 1e-9);
ok('sin uso ni "cómo nos conoció" la fórmula sigue funcionando (simulador)', c.score >= 300 && c.f5 === 60);

// ── 4. El score con que se aprobó se ve en la ficha y no se recalcula ──
ok('la ficha muestra "Al aprobar M-…"', /Al aprobar '\+esc\(u\.id\)/.test(src('logic/clientes.js')));
const cr = src('logic/creditos.js');
ok('nada vuelve a escribir el score del crédito', !/S\.creds\[[^\]]+\]\.score_indexa\s*=|cred\.score_indexa\s*=|c\.score_indexa\s*=\s*(?!scoreFinal)/.test(cr));

console.log('\n' + pass + ' OK · ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
