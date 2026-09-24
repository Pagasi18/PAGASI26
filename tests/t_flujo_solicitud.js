// 23-sep-2026, Adam: "se pagaron con anticipo.. como es el flow en la solicitud.. no
// quiero que se equivoquen los vendedores.. deberia salir automatico sin preguntar".
// El paso de la moto le hacia repartir el costo fila por fila y elegir cada cuenta, y
// el paso 4 volvia a preguntar donde entro la inicial. La sede venia puesta en la
// primera de la lista. Ahora: la sede se elige primero y sin venir puesta, la inicial
// se pregunta UNA vez, y lo que financia Pagasi sale solo del anticipo de la sede.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function elemento(extra) {
  return Object.assign({ innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], options:[], selectedIndex:-1, appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){}, focus(){ this._enfocado = true; }, closest(){ return null; }, insertAdjacentHTML(){},
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }, extra||{});
}
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
const avisos = [];
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';}, confirm(){ return true; },
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
ctx.nav = function(){};
const S = ctx.S;
vm.runInContext("_cuentasBanc = [{nombre:'Binance 26'},{nombre:'100% Banco 26'}];", ctx);
S.concesionarios = [
  { id:'C1', nombre:'MOTOS TORO', ciudad:'Caracas' },
  { id:'C2', nombre:'EMPIRE BELLO MONTE', ciudad:'Caracas' },
  { id:'C3', nombre:'SEDE CERRADA', eliminado:true },
];
const CA = vm.runInContext('CUENTA_ANTICIPOS', ctx);
// MOTOS TORO tiene US$ 3.000 de anticipo; Empire no tiene nada
S.movimientos = [
  { id:'A1', tipo:'transferencia', monto:3000, cuentaOrigen:'Binance 26', cuentaDestino:CA, concesionarioId:'C1', fecha:'2026-09-20' },
];
S.motos = []; S.egresos = []; S.pagos = []; S.creds = [];
const admin = { uid:'u-admin', nombre:'Adam', rol:'Administrador' };
const vendedora = { uid:'u-mf', nombre:'María Fernanda', rol:'Vendedor' };

// ════════ 1. La regla: de dónde sale cada dólar ════════
const plan = o => ctx._mpagoPlanAuto(o);
const suma = p => Math.round(p.pagos.reduce((a,x)=>a+x.monto,0)*100)/100;
let p = plan({ costo:1350, inicial:750, cuentaInicial:'Binance 26', concesionarioId:'C1', saldoAnticipo:3000 });
ok('sede con anticipo: la inicial sale de donde la pagó el cliente',
  p.filas[0].que==='inicial' && p.filas[0].monto===750 && p.filas[0].cuenta==='Binance 26');
ok('...y lo que financia Pagasi sale del anticipo, solo',
  p.filas[1].que==='anticipo' && p.filas[1].monto===600 && p.filas[1].cuenta==='ANT:C1');
ok('...sin preguntar nada más', p.faltan.length===0 && p.filas.length===2);
ok('...las partes suman el costo de la moto', suma(p)===1350);
ok('...y dice cuánto le queda a la sede', p.quedaAnticipo===2400 && !p.anticipoNoAlcanza);

p = plan({ costo:1350, inicial:750, cuentaInicial:'Binance 26', concesionarioId:'C1', saldoAnticipo:400 });
ok('anticipo que no alcanza: pone lo que tiene', p.filas[1].que==='anticipo' && p.filas[1].monto===400 && p.quedaAnticipo===0);
ok('...y el resto pide cuenta', p.filas[2].que==='resto' && p.filas[2].monto===200 && p.faltan.join()==='resto');
ok('...sin la cuenta no hay pagos que guardar', p.pagos.length===0 && p.anticipoNoAlcanza);
p = plan({ costo:1350, inicial:750, cuentaInicial:'Binance 26', concesionarioId:'C1', saldoAnticipo:400, cuentaResto:'100% Banco 26' });
ok('...con la cuenta del resto, tres partes que suman el costo', p.pagos.length===3 && suma(p)===1350 && p.faltan.length===0);

p = plan({ costo:1350, inicial:750, cuentaInicial:'Binance 26', concesionarioId:'C2', saldoAnticipo:0 });
ok('sede sin anticipo: lo que financia Pagasi pide cuenta', p.filas.length===2 && p.filas[1].que==='resto'
  && p.filas[1].etiqueta==='Lo que financia Pagasi' && p.faltan.join()==='resto');
p = plan({ costo:1350, inicial:750, cuentaInicial:'Binance 26', concesionarioId:'', saldoAnticipo:3000 });
ok('sin sede no se usa ningún anticipo', !p.filas.some(f=>f.que==='anticipo'));
p = plan({ costo:1350, inicial:0, concesionarioId:'C1', saldoAnticipo:3000 });
ok('sin inicial: todo del anticipo y no se pregunta la cuenta de la inicial',
  p.filas.length===1 && p.filas[0].monto===1350 && p.faltan.length===0);
p = plan({ costo:1350, inicial:1500, cuentaInicial:'Binance 26', concesionarioId:'C1', saldoAnticipo:3000 });
ok('inicial mayor que la moto: no se inventa dinero', p.inicial===1350 && p.financiado===0 && suma(p)===1350);
p = plan({ costo:1350, inicial:750, concesionarioId:'C1', saldoAnticipo:3000 });
ok('sin la cuenta de la inicial no hay pagos que guardar', p.faltan.join()==='inicial' && p.pagos.length===0);
p = plan({ costo:1000.10, inicial:333.33, cuentaInicial:'Binance 26', concesionarioId:'C1', saldoAnticipo:5000 });
ok('los centavos cuadran', suma(p)===1000.10);

// ════════ 2. El resto nunca sale del anticipo de OTRA sede ════════
const oc = ctx._mpagoCuentasOpts('');
ok('la cuenta del resto ofrece solo cuentas del banco', /Binance 26/.test(oc) && /100% Banco 26/.test(oc) && oc.indexOf('ANT:')===-1);
ok('...y arranca sin elegir', /<option value="" selected>— Elegir cuenta —/.test(oc));
ok('...recuerda la que ya se eligió', /value="100% Banco 26" selected/.test(ctx._mpagoCuentasOpts('100% Banco 26')));

// ════════ 3. La sede: primero y sin venir puesta ════════
ctx.window._wzEditando = null;
S.currentUser = admin; S.concesionarioActivo = 'C2';
vm.runInContext("WZ = { step:3 };", ctx);
let h = ctx._wzSedeHtml();
ok('con varias sedes, ninguna viene elegida (ni la del selector de arriba)',
  /<option value="" selected>— Elegir concesionario —/.test(h) && !/value="C2" selected/.test(h) && ctx.WZ.concesionarioId==='');
ok('...las sedes borradas no salen', h.indexOf('SEDE CERRADA')===-1);
ok('...y al elegir una se recuerda', (vm.runInContext("WZ.concesionarioId='C1'",ctx), /value="C1" selected/.test(ctx._wzSedeHtml())));
S.currentUser = Object.assign({}, vendedora, { concesionarios:['C2'] });
vm.runInContext("WZ = { step:3 };", ctx);
h = ctx._wzSedeHtml();
ok('vendedora con una sola sede: queda puesta sola', ctx.WZ.concesionarioId==='C2' && /SEDE ÚNICA/.test(h) && /type="hidden" id="wz_concesionario_id" value="C2"/.test(h));
S.currentUser = admin;
ctx.window._wzEditando = 'CRED-5';
vm.runInContext("WZ = { step:3, concesionarioId:'C9' };", ctx);
S.concesionarios.push({ id:'C9', nombre:'SEDE VIEJA', eliminado:true });
h = ctx._wzSedeHtml();
ok('al editar se ve la sede del crédito aunque ya no esté en la lista', /value="C9" selected/.test(h) && ctx.WZ.concesionarioId==='C9');
S.concesionarios.pop();
ctx.window._wzEditando = null;
ok('la sede está arriba del paso de la moto', /var step2 = _wzSedeHtml\(\) \+/.test(src('logic/creditos.js')));
ok('el paso 4 ya no la elige: solo la muestra',
  src('logic/creditos.js').indexOf('S.concesionarioActivo') === -1 && /\+ _wzResumenDineroHTML\(r\);/.test(src('logic/creditos.js')));

// ════════ 4. Lo que ve el vendedor en "Cómo se paga la moto" ════════
vm.runInContext("WZ = { step:3, concesionarioId:'', iniMetodo:'Binance 26' };", ctx);
h = ctx._wzPagoMotoHtml(1350, 750);
ok('sin sede elegida no pide ninguna cuenta todavía', /Elige arriba de qué concesionario/.test(h) && h.indexOf('wz_mpago_resto')===-1);
ctx.WZ.concesionarioId = 'C1';
h = ctx._wzPagoMotoHtml(1350, 750);
ok('MOTOS TORO: sale del anticipo, sin desplegable', /anticipo de MOTOS TORO/.test(h) && h.indexOf('wz_mpago_resto')===-1);
ok('...dice cuánto le queda', /Le quedan/.test(h));
ok('...y la inicial sale de Binance 26', /Sale de <b>Binance 26<\/b>/.test(h));
ok('el administrador puede repartir a mano', /Repartir a mano/.test(h));
ctx.WZ.concesionarioId = 'C2';
h = ctx._wzPagoMotoHtml(1350, 750);
ok('EMPIRE (sin anticipo): ahí sí pregunta la cuenta', h.indexOf('id="wz_mpago_resto"')>-1 && /no tiene anticipo/.test(h));
S.currentUser = vendedora;
ok('la vendedora no ve "Repartir a mano"', !/Repartir a mano/.test(ctx._wzPagoMotoHtml(1350, 750)));
ctx.WZ.iniMetodo = '';
ok('si falta la cuenta de la inicial, lo dice', /Falta decir arriba dónde la pagó/.test(ctx._wzPagoMotoHtml(1350, 750)));

// ════════ 5. Al pasar del paso 3 (la validación real) ════════
function pantalla(v){
  Object.keys(form).forEach(k => delete form[k]);
  const campos = { wz_precio:v.costo, wz_precio_base_real:v.costo, wz_plan_mode:'custom', wz_ini_real:v.ini,
    wz_cuota_q_custom:60, wz_plazo_custom:12, wz_ini_metodo:v.iniMetodo||'', wz_ini_ref:v.ref||'' };
  Object.keys(campos).forEach(k => { form[k] = elemento({ id:k, value:String(campos[k]) }); });
  if(v.sedeSelect !== undefined) form['wz_concesionario_id'] = elemento({ id:'wz_concesionario_id', value:v.sedeSelect });
  form['wz-mpago-wrap'] = elemento({ id:'wz-mpago-wrap', style:{ display: v.inventario ? 'none' : 'block' } });
  vm.runInContext("WZ = { step:3, vendedorNombre:'María Fernanda', vendedorUid:'u-mf', motoModelo:'NEW HORSE 150', precio:"+v.costo+" };", ctx);
  if(v.inventario) ctx.WZ.motoInvId = '77';
  if(v.resto) ctx.WZ._mpagoCuentaResto = v.resto;
  avisos.length = 0;
  return ctx._wzValidar();
}
S.currentUser = vendedora;
let r = pantalla({ costo:1350, ini:750, iniMetodo:'Binance 26', sedeSelect:'' });
ok('sin sede no deja seguir', r===false && avisos.some(a=>/concesionario/.test(a)) && form['wz_concesionario_id']._enfocado);
r = pantalla({ costo:1350, ini:750, iniMetodo:'', sedeSelect:'C1' });
ok('sin la cuenta de la inicial no deja seguir', r===false && avisos.some(a=>/pagó el cliente la inicial/.test(a)));
r = pantalla({ costo:1350, ini:750, iniMetodo:'Binance 26', ref:'REF-9', sedeSelect:'C1' });
ok('MOTOS TORO + Binance: pasa sin más preguntas', r!==false && avisos.length===0);
ok('...y deja listo el pago: 750 de Binance y 600 del anticipo',
  JSON.stringify(ctx.WZ._pagosMoto)===JSON.stringify([{cuenta:'Binance 26',monto:750},{cuenta:'ANT:C1',monto:600}]));
ok('...con la cuenta y la referencia de la inicial guardadas para el final', ctx.WZ.iniMetodo==='Binance 26' && ctx.WZ.iniRef==='REF-9');
r = pantalla({ costo:1350, ini:750, iniMetodo:'Binance 26', sedeSelect:'C2' });
ok('EMPIRE sin cuenta para lo financiado: no deja seguir', r===false && avisos.some(a=>/financia Pagasi/.test(a)));
r = pantalla({ costo:1350, ini:750, iniMetodo:'Binance 26', sedeSelect:'C2', resto:'100% Banco 26' });
ok('...con la cuenta elegida: pasa', r!==false && ctx.WZ._pagosMoto.length===2 && ctx.WZ._pagosMoto[1].cuenta==='100% Banco 26');
r = pantalla({ costo:1350, ini:750, iniMetodo:'Binance 26', sedeSelect:'C1', inventario:true });
ok('moto del inventario: no se vuelve a pagar', r!==false && ctx.WZ._pagosMoto===null);
r = pantalla({ costo:1350, ini:750, iniMetodo:'', sedeSelect:'C1', inventario:true });
ok('...pero la inicial sí se pregunta', r===false && avisos.some(a=>/inicial/.test(a)));

// ════════ 6. Al guardar: la inicial se lee de lo que se eligió en el paso 3 ════════
Object.keys(form).forEach(k => delete form[k]);
vm.runInContext("WZ = { iniMetodo:'' };", ctx);
ok('sin la pantalla delante, igual se revisa que haya cuenta', ctx._wzFaltaCuentaInicial(750) === true);
ctx.WZ.iniMetodo = 'Binance 26';
ok('...y con cuenta, sigue', ctx._wzFaltaCuentaInicial(750) === false);
ok('el pago de la inicial usa la cuenta elegida en el paso 3',
  /var iniMetodo = \(\$\('wz_ini_metodo'\)&&\$\('wz_ini_metodo'\)\.value\) \|\| WZ\.iniMetodo \|\| '';/.test(src('logic/creditos.js')));
ok('...no se guarda una solicitud nueva sin sede', /Falta elegir de qué concesionario sale la moto/.test(src('logic/creditos.js')));
ok('el paso 4 ya no tiene desplegables de dinero',
  (function(){ const c=src('logic/creditos.js'); const a=c.indexOf('function _wzRenderResultado'); const b=c.indexOf('AVISO DE CAMBIOS SENSIBLES', a);
    return a>0 && b>a && c.slice(a,b).indexOf('id="wz_ini_metodo"')===-1 && c.slice(a,b).indexOf('id="wz_concesionario_id"')===-1; })());

// ════════ 7. Las cuentas cuadran de punta a punta ════════
S.currentUser = vendedora;
const antesBin = ctx.saldoCuenta('Binance 26'), antesAnt = ctx.saldoAnticipoDe('C1'), antesTot = ctx.totalCuentas();
// la inicial entra a Binance (lo que hace el guardado)...
S.movimientos.push({ id:'MOV-INI', tipo:'deposito', tipoOperacion:'inicial_credito', monto:750, cuentaDestino:'Binance 26', fecha:'2026-09-23' });
// ...y la moto se paga con el reparto automático
const pagos = ctx._mpagoPlanAuto({ costo:1350, inicial:750, cuentaInicial:'Binance 26', concesionarioId:'C1', saldoAnticipo:antesAnt }).pagos;
ctx._mpagoCrearGastos({ id:501, modelo:'NEW HORSE 150' }, pagos, { fecha:'2026-09-23', ids:[1,2] });
ok('Binance queda igual: entró la inicial y salió hacia la sede', ctx.saldoCuenta('Binance 26') === antesBin);
ok('el anticipo de MOTOS TORO baja justo lo financiado', ctx.saldoAnticipoDe('C1') === antesAnt - 600);
ok('el dinero de Pagasi baja solo lo que prestó', Math.round((antesTot - ctx.totalCuentas())*100)/100 === 600);
ok('los gastos dicen de dónde salió cada parte',
  S.egresos.some(e=>e.forma==='Binance 26' && e.monto===750) && S.egresos.some(e=>e.forma==='Anticipo — MOTOS TORO' && e.monto===600));

console.log('\n' + pass + ' OK · ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
