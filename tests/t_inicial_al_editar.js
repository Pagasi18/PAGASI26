// 28-sep-2026, Adam editando M-041: la inicial real fue $420 pero se habia registrado
// $497. Edito el credito, el plan quedo en $420 y el pago de la inicial siguio en $497
// ("inicial pagada $497 · plan $420 · sobra $77"). El aviso mandaba a Cobranza; ahora,
// al guardar la edicion, se ofrece corregir ese pago y su movimiento en la cuenta.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], selectedIndex:-1, appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const preguntas = [], avisos = [];
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';},
  confirm(m){ preguntas.push(String(m)); return ctx.__respuesta !== false; },
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
const S = ctx.S;
const guardados = { pagos:[], movs:[] };
ctx.DB.savePago = p => { guardados.pagos.push(JSON.parse(JSON.stringify(p))); return Promise.resolve(true); };
ctx.DB.saveMovimiento = m => { guardados.movs.push(JSON.parse(JSON.stringify(m))); return Promise.resolve(true); };
ctx.toast = (m) => { avisos.push(String(m)); };
ctx.recalcularCreditoDesdePagos = () => { ctx.__recalculado = true; };
S.currentUser = { nombre:'Adam' };

function escena(){
  S.creds = [{ id:'M-041', cli:'PASTOR PRUEBA', estado:'activo', ini:420, precio:1200 }];
  S.pagos = [{ id:'PAG-1', cred:'M-041', cli:'PASTOR PRUEBA', monto:497, fecha:'2026-09-28', metodo:'Efectivo', estado:'confirmado', esInicial:true, tipoOperacion:'inicial_credito' }];
  S.movimientos = [{ id:'MOV-1', conceptoPago:'PAG-1', creditoId:'M-041', tipoOperacion:'inicial_credito', monto:497, cuentaDestino:'Efectivo' },
                   { id:'MOV-2', conceptoPago:'OTRO', monto:50 }];
  preguntas.length = 0; avisos.length = 0; guardados.pagos.length = 0; guardados.movs.length = 0; ctx.__recalculado = false; ctx.__respuesta = true;
}

// ── El caso de M-041: el plan bajo de 497 a 420 y el pago seguia en 497 ──
escena();
const r1 = ctx._wzOfrecerCorregirInicial('M-041', 497, 420);
ok('pregunta antes de tocar el pago', preguntas.length === 1 && /INICIAL DE M-041/.test(preguntas[0]));
ok('...y la pregunta dice las dos cifras y dónde entró el dinero', /\$420/.test(preguntas[0]) && /\$497/.test(preguntas[0]) && /Efectivo/.test(preguntas[0]) && /2026-09-28/.test(preguntas[0]));
ok('con Aceptar corrige el pago a 420 y guarda la cifra anterior', r1 === true && S.pagos[0].monto === 420 && S.pagos[0].montoAnterior === 497 && S.pagos[0].editadoPor === 'Adam' && S.pagos[0].editadoDesde === 'credito');
ok('...y el movimiento de esa inicial en la cuenta también', S.movimientos[0].monto === 420 && S.movimientos[0].montoAnterior === 497);
ok('...sin tocar otros movimientos', S.movimientos[1].monto === 50);
ok('...escribe el pago y el movimiento en la base y recalcula el crédito', guardados.pagos.length === 1 && guardados.movs.length === 1 && guardados.movs[0].id === 'MOV-1' && ctx.__recalculado === true);
ok('...y lo dice', avisos.some(a => /Inicial corregida a \$420/.test(a)));

// ── Cancelar: no se mueve nada ──
escena(); ctx.__respuesta = false;
const r2 = ctx._wzOfrecerCorregirInicial('M-041', 497, 420);
ok('con Cancelar no se toca ni el pago ni el movimiento', r2 === false && S.pagos[0].monto === 497 && S.movimientos[0].monto === 497 && guardados.pagos.length === 0 && guardados.movs.length === 0);

// ── Casos en que no hay nada que preguntar ──
escena();
ok('si la inicial no cambió, no pregunta', ctx._wzOfrecerCorregirInicial('M-041', 420, 420) === false && preguntas.length === 0);
escena(); S.pagos[0].monto = 420;
ok('si el pago ya coincide con el plan nuevo, no pregunta', ctx._wzOfrecerCorregirInicial('M-041', 497, 420) === false && preguntas.length === 0);
escena(); S.pagos = [];
ok('sin pago inicial registrado, no pregunta', ctx._wzOfrecerCorregirInicial('M-041', 497, 420) === false && preguntas.length === 0);
escena(); S.pagos.push({ id:'PAG-2', cred:'M-041', monto:100, fecha:'2026-09-29', metodo:'Binance', estado:'confirmado', esInicial:true });
ok('con dos pagos de inicial manda a Cobranza en vez de adivinar', ctx._wzOfrecerCorregirInicial('M-041', 497, 420) === false && preguntas.length === 0 && avisos.some(a => /2 pagos de inicial/.test(a)));
escena(); S.pagos[0].estado = 'pendiente';
ok('un pago pendiente no cuenta como inicial cobrada', ctx._wzOfrecerCorregirInicial('M-041', 497, 420) === false && preguntas.length === 0);

// ── Está enganchado al guardado de la edición y el aviso previo ya no miente ──
const cre = src('logic/creditos.js');
ok('el guardado de la edición guarda la inicial vieja antes de pisar el crédito', /var _iniAntes = parseFloat\(S\.creds\[_ei\]\.ini\)\|\|0;\s*Object\.assign\(S\.creds\[_ei\], _upd\);/.test(cre));
ok('...y ofrece corregir el pago después de guardar', /_wzOfrecerCorregirInicial\(_editId, _iniAntes, parseFloat\(_upd\.ini\)\|\|0\);/.test(cre));
preguntas.length = 0; ctx.__respuesta = true; S.creds = [{ id:'CRED-1', cli:'X', estado:'activo', ini:300 }]; S.pagos = [{ id:'P1', cred:'CRED-1', monto:300, estado:'confirmado', esInicial:true }];
ctx._wzConfirmarCambios([{ etiqueta:'Inicial', antes:300, ahora:100, num:true }], 'CRED-1');
ok('el aviso previo dice que se va a preguntar, no que el pago no se mueve', /te voy a preguntar si ese pago tambien se corrige/.test(preguntas[0]) && !/NO se va a mover/.test(preguntas[0]));
console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode = 1;
