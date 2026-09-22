// Puntos 13, 14, 15, 16 y 25 de la lista del 18-sep: todo lo de EDITAR un credito.
// 13: al editar salian dos cuadros ("Forma de pago de la moto" y "Cobro de Inicial")
//     que pedian cuenta y referencia y despues tiraban lo elegido a la basura.
// 14: un credito pagado, cancelado o recuperado se abria en el asistente entero y al
//     guardar le recalculaban el plan; y la sede se cambiaba sola a la de quien editaba.
// 15: poner la inicial en 0 se ignoraba, y nadie avisaba de que la inicial ya cobrada
//     quedaba distinta del plan.
// 16: el "Cancelar" del aviso no cancelaba: el cliente y la moto ya estaban escritos.
// 25: "Reparar motos" pisaba el modelo del credito sin mirar los seriales.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function elemento() {
  return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], options:[], selectedIndex:-1, appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
const preguntas = [], avisos = [];
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';},
  confirm(m){ preguntas.push(String(m)); return ctx.__respuesta !== false; },
  open(){ return { document:{ write(){}, close(){} } }; },
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const html = src('admin.html');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = function(m){ avisos.push(String(m)); };
ctx.nav = function(){}; ctx.closeM = function(){}; ctx.setMicon = function(){};
const S = ctx.S;
S.currentUser = { uid:'u1', nombre:'Prueba', rol:'Administrador', permisos:['creditos','motos','perm_delete'] };

// ── 13. Los dos cuadros no se dibujan al editar ───────────────────────────────
const creditosSrc = src('logic/creditos.js');
ok('13. el cuadro de la forma de pago de la moto sale solo si NO se está editando',
  /window\._wzEditando \? '' : \(\s*\n?\s*'<div id="wz-mpago-wrap"/.test(creditosSrc));
ok('13. el "Cobro de Inicial" se reemplaza por la inicial real al editar',
  /window\._wzEditando[\s\S]{0,400}_wzInicialRealHTML\(window\._wzEditando\)/.test(creditosSrc));

S.creds = [{ id:'CRED-1', cli:'CLIENTE', estado:'activo', motoId:1, ini:300 }];
S.pagos = [
  { id:'P1', cred:'CRED-1', monto:200, fecha:'2026-05-01', metodo:'Binance', estado:'confirmado', esInicial:true },
  { id:'P2', cred:'CRED-1', monto:100, fecha:'2026-05-02', metodo:'Efectivo', estado:'confirmado', concepto:'Inicial · CLIENTE · CRED-1' },
  { id:'P3', cred:'CRED-1', monto:999, fecha:'2026-05-03', metodo:'Zelle', estado:'confirmado', esInicial:true, eliminado:true },
  { id:'P4', cred:'CRED-1', monto:555, fecha:'2026-05-04', metodo:'Zelle', estado:'pendiente', esInicial:true },
];
let h = ctx._wzInicialRealHTML('CRED-1');
ok('13. muestra los dos pagos iniciales de verdad', /Binance/.test(h) && /Efectivo/.test(h));
ok('13. ...y no el que está borrado ni el que no está confirmado', !/Zelle/.test(h));
ok('13. ...cuenta también los pagos viejos que solo traen el concepto', /Efectivo/.test(h));
ok('13. dice que desde ahí no se toca', /Cobranza/.test(h));
ok('13. no vuelve a pedir la cuenta', h.indexOf('wz_ini_metodo') === -1);
S.creds = [{ id:'CRED-2', cli:'X', estado:'pendiente_revision', motoId:1 }]; S.pagos = [];
ok('13. en una solicitud sin aprobar dice que se registrará al aprobar',
  /al aprobar/.test(ctx._wzInicialRealHTML('CRED-2')));
S.creds = [{ id:'CRED-3', cli:'X', estado:'activo', motoId:1 }]; S.pagos = [];
ok('13. y si de verdad no hay inicial, lo dice en rojo', /No hay ninguna inicial/.test(ctx._wzInicialRealHTML('CRED-3')));

// ── 14. Un crédito cerrado no se abre en el asistente entero ──────────────────
let abierto = null;
ctx.openEditCred = function(id){ abierto = id; };
ctx.openAddCred = function(){ abierto = 'WIZARD'; };
['completado','cancelado','recuperado','recuperada'].forEach(function(estado){
  S.creds = [{ id:'CRED-9', cli:'X', estado:estado, motoId:1, ini:300, precio:1000 }];
  S.clientes = []; abierto = null; avisos.length = 0; ctx.window._wzEditando = null;
  ctx.editarCredSinFirma('CRED-9');
  ok('14. un crédito ' + estado + ' abre la edición corta, no el asistente', abierto === 'CRED-9');
  ok('14. ...y se le dice por qué', avisos.some(a => /no se le cambia el plan/.test(a)));
});
S.creds = [{ id:'CRED-8', cli:'X', estado:'activo', motoId:1, ini:300, precio:1000 }];
abierto = null; ctx.window._wzEditando = null;
ctx.editarCredSinFirma('CRED-8');
ok('14. un crédito activo sí se sigue editando entero', abierto === 'WIZARD');

// ── 14. La sede entra en el aviso de cambios ──────────────────────────────────
ok('14. la sede es un campo sensible', ctx._WZ_CAMPOS_SENSIBLES.some(c => c.k === 'concesionarioId'));
S.concesionarios = [{ id:'CO-A', nombre:'Bello Monte' }, { id:'CO-B', nombre:'Boleíta' }];
let difs = ctx._wzDiffSensible({ concesionarioId:'CO-A' }, { concesionarioId:'CO-B' });
ok('14. cambiar la sede sale en el aviso', difs.length === 1);
ok('14. ...con el nombre de la sede, no con su código',
  difs[0].antes === 'Bello Monte' && difs[0].ahora === 'Boleíta');
ok('14. el asistente ya no pisa la sede del crédito al editar',
  /_editandoSede \? WZ\.concesionarioId : S\.concesionarioActivo/.test(creditosSrc)
  && /if\(!\(window\._wzEditando && WZ\.concesionarioId\)\) WZ\.concesionarioId = disponibles\[0\]\.id;/.test(creditosSrc));

// ── 15. La inicial en cero ya se aplica ───────────────────────────────────────
const fin = ctx._wzCredPlanFields({ ini:0, fin:1000, total:1550, cuotaQ:64, cuotaM:129, plazo:12, totalCuotas:24 },
  { ini:300, fin:700, total:1085, cuota:45, cuotaQ:45, cuotaM:90, plazo:12, totalCuotas:24 });
ok('15. poner la inicial en 0 ahora sí se guarda como 0', fin.ini === 0);
const fin2 = ctx._wzCredPlanFields({ fin:1000 }, { ini:300 });
ok('15. y si el plan nuevo no trae inicial, se conserva la vieja', fin2.ini === 300);

// ── 15. El aviso dice que la inicial ya cobrada no se mueve ───────────────────
S.creds = [{ id:'CRED-1', cli:'X', estado:'activo', ini:300 }];
S.pagos = [{ id:'P1', cred:'CRED-1', monto:300, fecha:'2026-05-01', metodo:'Binance', estado:'confirmado', esInicial:true }];
preguntas.length = 0; ctx.__respuesta = true;
ctx._wzConfirmarCambios([{ etiqueta:'Inicial', antes:300, ahora:100, num:true }], 'CRED-1');
ok('15. si cambia la inicial y ya hay uno cobrado, el aviso lo dice',
  /OJO CON LA INICIAL/.test(preguntas[0]) && /NO se va a mover/.test(preguntas[0]));
ok('15. ...y manda a corregirlo donde se corrige de verdad', /Cobranza/.test(preguntas[0]));
preguntas.length = 0;
ctx._wzConfirmarCambios([{ etiqueta:'Precio', antes:1000, ahora:1100, num:true }], 'CRED-1');
ok('15. si no cambia la inicial, no molesta con ese aviso', !/OJO CON LA INICIAL/.test(preguntas[0]));

// ── 16. El aviso se pregunta ANTES de escribir nada ───────────────────────────
ok('16. la pregunta está antes de crear o actualizar el cliente',
  creditosSrc.indexOf('Aviso ANTES de escribir nada') < creditosSrc.indexOf('nextClienteIdAsync().then'));
ok('16. y ya no se pregunta al final', !/var _difsSens = _wzDiffSensible\(S\.creds\[_ei\], _upd\)/.test(creditosSrc));
ok('16. el crédito guarda a qué cliente quedó enlazado', /clienteId: \(existing && existing\.id\) \|\| cliId/.test(creditosSrc));

// ── 25. "Reparar motos" no pisa el modelo si los seriales no cuadran ──────────
const noCuadran = ctx._idsQueNoCuadran;
ok('25. dos seriales de chasis distintos se detectan',
  noCuadran({ serialChasis:'ABC123' }, { serialChasis:'XYZ999' }).length === 1);
ok('25. mayúsculas y espacios no cuentan como diferencia',
  noCuadran({ serialChasis:' abc 123 ' }, { serialChasis:'ABC123' }).length === 0);
ok('25. si el dato falta en un lado, no se puede comparar y no se inventa',
  noCuadran({ serialChasis:'ABC123' }, {}).length === 0);
ok('25. un "NA" cuenta como vacío, no como serial distinto',
  noCuadran({ serialChasis:'NA' }, { serialChasis:'ABC123' }).length === 0);
ok('25. compara los cuatro identificadores',
  noCuadran({ serialChasis:'CH-1', serialMotor:'MT-1', vin:'VIN-1', placa:'AA111AA' },
            { serialChasis:'CH-2', serialMotor:'MT-2', vin:'VIN-2', placa:'BB222BB' }).length === 4);
// una letra suelta como "X" es de las que el sistema trata como vacio
ok('25. una "X" suelta se trata como vacío, igual que "NA"',
  noCuadran({ serialChasis:'CH-1' }, { serialChasis:'X' }).length === 0);

S.creds = [{ id:'CRED-7', cli:'JUAN', estado:'activo', motoId:7, modelo:'EK XPRESS 150', serialChasis:'CHASIS-DEL-CLIENTE' }];
S.motos = [{ id:7, modelo:'NEW HORSE 150', estado:'disponible', serialChasis:'OTRO-CHASIS' }];
S.clientes = [];
let a = ctx._auditVinculosMoto();
ok('25. con los seriales distintos NO se ofrece reparar solo', a.relink.length === 0);
ok('25. ...se manda a revisar a mano', a.sospechosos.length === 1);
ok('25. ...diciendo qué dice cada uno',
  a.sospechosos[0].difs[0].credito === 'CHASIS-DEL-CLIENTE' && a.sospechosos[0].difs[0].moto === 'OTRO-CHASIS');
S.motos = [{ id:7, modelo:'NEW HORSE 150', estado:'disponible', serialChasis:'CHASIS-DEL-CLIENTE' }];
a = ctx._auditVinculosMoto();
ok('25. con los seriales iguales sí se repara como antes', a.relink.length === 1 && a.sospechosos.length === 0);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
