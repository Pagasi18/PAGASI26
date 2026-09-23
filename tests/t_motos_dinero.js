// Grupo 3 de la lista del 18-sep-2026 — el dinero de las motos:
//  10) una solicitud de concesionario rechazada dejaba descontada la compra de la moto
//      y la moto "financiada" con el nombre del cliente;
//  11) el boton "Solicitud" de Inventario perdia la moto elegida y el wizard creaba
//      otra del catalogo, descontando la compra de nuevo;
//  12) Finanzas dejaba borrar el gasto de una moto por separado, y restaurar una moto
//      revivia gastos anulados por otra via;
//  22) si fallaba la creacion de la moto, el credito quedaba sin moto y sin aviso;
//  23) guardar una solicitud y abrir otra enseguida mezclaba los datos de la moto;
//  24) un doble clic en Guardar duplicaba motos y gastos.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento() {
  return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){},
    closest(){ return null; }, getBoundingClientRect(){ return {top:0,left:0,width:0,height:0}; }, querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
// La pantalla de Configuracion: solo existe mientras "enConfig" es verdad
const form = {};
const enConfig = true;
const doc = { getElementById(id){ return (enConfig && form[id]) || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, confirm(){return true;}, prompt(){return '';},
  open(){ return { document:{ write(){}, close(){} } }; },
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
const avisos = [];
ctx.toast = function(m, t){ avisos.push([t, m]); };
ctx.nav = function(){};
ctx.setMicon = function(){}; ctx.requireDeletePermission = function(){ return true; };
ctx.logActividad = function(){}; ctx.prompt = function(){ return 'No califica'; };
const el = (props) => Object.assign(elemento(), props || {});
const S = ctx.S;
// las cajitas del modal, para que closeM() y los modales reales funcionen
['mtt','msb','modal-box','mbd','mft','ov'].forEach(id => { form[id] = el({ style:{} }); });
S.currentUser = { uid:'u1', nombre:'Prueba', rol:'Administrador' };
ctx._cuentasBanc = [{ nombre:'Efectivo' }, { nombre:'Binance' }];
const saldo = c => ctx.saldoCuenta(c);

// ── 24) Doble clic en Guardar ──
let veces = 0;
S.saveFn = function(){ veces++; return true; };
ctx.saveM(); ctx.saveM(); ctx.saveM();
ok('un doble (o triple) clic en Guardar guarda UNA sola vez', veces === 1);
ctx.closeM();   // al cerrarse el modal se suelta el candado
veces = 0; S.saveFn = function(){ veces++; return false; };   // no paso la validacion
ctx.saveM(); ctx.saveM();
ok('si no pasa la validación, se puede volver a intentar enseguida', veces === 2);
ok('cerrar el modal suelta el candado para el siguiente registro', ctx.window._saveMEnCurso !== true || (ctx.closeM(), ctx.window._saveMEnCurso === false));
S.saveFn = null;

// ── 12) El gasto de una moto no se borra desde Finanzas ──
S.movimientos = []; S.egresos = []; S.motos = []; S.creds = [];
S.movimientos.push({ id:'MOV-INI', tipo:'deposito', concepto:'Aporte', monto:5000, cuentaDestino:'Binance', fecha:'2026-09-01' });
const moto = { id: 7, modelo:'MOTO 150', precio: 1000, estado:'disponible' };
S.motos.push(moto);
ctx._mpagoCrearGastos(moto, [{ cuenta:'Binance', monto:900 }], { fecha:'2026-09-02' });
const egMoto = S.egresos.find(e => e.motoIdRef === 7);
const saldoTrasCompra = saldo('Binance');
avisos.length = 0;
ctx.toast = function(m, t){ avisos.push([t, m]); };
S.saveFn = null;
ctx.delEgreso(egMoto.id);
ok('Finanzas no deja borrar el gasto de la compra de una moto',
  typeof S.saveFn !== 'function' && !egMoto.eliminado && saldo('Binance') === saldoTrasCompra);
ok('...y explica por dónde se hace', avisos.some(a => a[0] === 'error' && /Motocicletas/.test(a[1])));
// un gasto normal sí se puede borrar
S.egresos.push({ id: 900, concepto:'Alquiler', monto:100, fecha:'2026-09-02', categoria:'operativos', forma:'Binance', eliminado:false });
S.saveFn = null; ctx.delEgreso(900);
ok('un gasto normal se sigue pudiendo borrar', typeof S.saveFn === 'function');

// ── 12) Restaurar una moto no revive gastos anulados por otra vía ──
const auditMoto = { eliminado:true, eliminadoPor:'Prueba', eliminadoEn:'2026-09-10T12:00:00Z', eliminadoRazon:'Moto duplicada', eliminacionReversaCuenta:true };
// un segundo gasto de la misma moto, anulado ANTES por otra via (p. ej. solicitud rechazada)
S.egresos.push({ id: 901, concepto:'Compra de moto · viejo', monto:50, fecha:'2026-09-03', categoria:'inventario', forma:'Binance',
  motoIdRef: 7, origenAuto:'compra_moto', eliminado:true, eliminadoEn:'2026-09-05T10:00:00Z', eliminadoRazon:'Otra cosa' });
Object.assign(moto, auditMoto);
ctx._mpagoReversarGastos(7, true, auditMoto);
ctx.restaurarMoto(7);
ok('al restaurar, vuelve el gasto que anuló el borrado de la moto', !S.egresos.find(e => e.id === egMoto.id).eliminado);
ok('...y NO revive el que estaba anulado por otra vía', S.egresos.find(e => e.id === 901).eliminado === true);

// ── 10) Solicitud de concesionario rechazada ──
// (a) La moto la creó ESA solicitud (moto del catálogo): su compra se descontó al
//     enviarla, así que al rechazar hay que devolverla.
S.movimientos = [{ id:'MOV-INI2', tipo:'deposito', concepto:'Aporte', monto:5000, cuentaDestino:'Binance', fecha:'2026-09-01' }];
S.egresos = []; S.motos = []; S.creds = [];
const motoSol = { id: 8, modelo:'MOTO 200', precio:1200, estado:'financiada', cliente:'CLIENTE SOLICITUD',
  creadaEnCredito:'CRED-900', notas:'Creada automáticamente desde catálogo al registrar financiamiento CRED-900' };
S.motos.push(motoSol);
ctx._mpagoCrearGastos(motoSol, [{ cuenta:'Binance', monto:1000 }], { fecha:'2026-09-03' });
const saldoConSolicitud = saldo('Binance');
S.creds.push({ id:'CRED-900', cli:'CLIENTE SOLICITUD', motoId:8, estado:'pendiente_revision', ini:300, fecha:'2026-09-03', motoCreadaEnSolicitud:true });
ctx._aprRechazar('CRED-900');
const credRech = S.creds[0];
ok('la solicitud queda cancelada con su razón', credRech.estado === 'cancelado' && !!credRech.razonRechazo);
ok('moto creada por la solicitud: el dinero vuelve a la cuenta', saldo('Binance') === saldoConSolicitud + 1000);
ok('...y su gasto queda anulado', S.egresos.filter(e => e.motoIdRef === 8 && !e.eliminado).length === 0);
ok('...y esa moto sale del inventario (nunca se pagó), auditada',
  motoSol.eliminado === true && /Solicitud rechazada/.test(String(motoSol.eliminadoRazon||'')) && !motoSol.cliente);

// (b) La moto YA estaba en inventario (comprada antes de verdad): rechazar NO devuelve
//     ese dinero; solo libera la moto. Devolverlo inventaba plata (revisión 22-sep).
S.movimientos = [{ id:'MOV-INI3', tipo:'deposito', concepto:'Aporte', monto:5000, cuentaDestino:'Binance', fecha:'2026-08-01' }];
S.egresos = []; S.creds = [];
const motoStock = { id: 9, modelo:'MOTO 150', precio:1000, estado:'financiada', cliente:'CLIENTE DOS' };
S.motos = [motoStock];
ctx._mpagoCrearGastos(motoStock, [{ cuenta:'Binance', monto:900 }], { fecha:'2026-08-01' });   // compra real al ingresarla
const saldoStock = saldo('Binance');
S.creds.push({ id:'CRED-901', cli:'CLIENTE DOS', motoId:9, estado:'pendiente_revision', ini:300, fecha:'2026-09-03' });
ctx._aprRechazar('CRED-901');
ok('moto que ya estaba en inventario: el saldo NO se mueve', saldo('Binance') === saldoStock);
ok('...su compra real sigue viva', S.egresos.filter(e => e.motoIdRef === 9 && !e.eliminado).length === 1);
ok('...pero la moto sí vuelve al stock', motoStock.estado === 'disponible' && !motoStock.cliente);

// (c) Moto de la solicitud que ya se había borrado con "sin regresar el dinero":
//     rechazar tampoco lo devuelve (ese dinero se dio por salido).
S.movimientos = [{ id:'MOV-INI4', tipo:'deposito', concepto:'Aporte', monto:5000, cuentaDestino:'Binance', fecha:'2026-09-01' }];
S.egresos = []; S.creds = [];
const motoPerdida = { id: 10, modelo:'MOTO 300', precio:1000, estado:'financiada', creadaEnCredito:'CRED-902' };
S.motos = [motoPerdida];
ctx._mpagoCrearGastos(motoPerdida, [{ cuenta:'Binance', monto:1000 }], { fecha:'2026-09-03' });
const auditSinDevolver = { eliminado:true, eliminadoPor:'Prueba', eliminadoEn:'2026-09-09T12:00:00Z', eliminadoRazon:'Moto perdida', eliminacionReversaCuenta:false };
Object.assign(motoPerdida, auditSinDevolver);
ctx._mpagoReversarGastos(10, false, auditSinDevolver);
const saldoSinDevolver = saldo('Binance');
S.creds.push({ id:'CRED-902', cli:'CLIENTE TRES', motoId:10, estado:'pendiente_revision', ini:300, fecha:'2026-09-03', motoCreadaEnSolicitud:true });
ctx._aprRechazar('CRED-902');
ok('moto borrada sin regresar el dinero: el rechazo tampoco lo devuelve', saldo('Binance') === saldoSinDevolver);

// ── 11) El botón "Solicitud" de Inventario no pierde la moto ──
// Desde el 23-sep-2026, PAGASI 18 no abre solicitudes nuevas (se quedó cobrando). Esta
// prueba es del ASISTENTE, no de esa política: se pone en una compañía que sí vende,
// que es la única situación en la que el asistente llega a abrirse.
ctx._puedeVender = function(){ return true; };
S.motos = [{ id: 11, modelo:'NEW HORSE 150', precio:1320, estado:'disponible' }];
S.clientes = []; S.creds = [];
const ov = el({ style:{} }); let htmlWz = '';
Object.defineProperty(ov, 'innerHTML', { get(){ return htmlWz; }, set(v){ htmlWz = v; } });
form['wz-overlay'] = ov;
ctx.document.body = el({ style:{}, appendChild(){} });
ctx.openAddCredConMoto(11);
ok('la moto elegida queda guardada en el wizard desde el paso 1', String(ctx.WZ.motoInvId) === '11');
ctx.WZ.step = 3;
let pedido = null;
const _pickInvReal = ctx._wzPickMotoInv;   // se restaura más abajo
ctx._wzPickMotoInv = function(sel){ pedido = sel.value; };
ctx.setTimeout = function(fn){ try { fn(); } catch(e) {} return 0; };
form['wz_moto_inv'] = el({ value:'', options:[], selectedIndex:0 });
try { ctx._wzRender(); } catch(e) {}
ok('al llegar al paso 3 la moto sigue elegida (antes se creaba otra del catálogo)', String(pedido) === '11');

(async function(){
// ── 11) El paso de la moto SÍ tiene selector de inventario, y el catálogo no lo pisa ──
S.motos = [{ id: 11, modelo:'NEW HORSE 150', precio:1320, estado:'disponible' }];
S.creds = []; S.clientes = [];
ctx.WZ = Object.assign({}, ctx.WZ, { step:3, motoInvId:null, motoModelo:'' });
ctx.setTimeout = function(){ return 0; };
try { ctx._wzRender(); } catch(e) {}
ok('el paso de la moto vuelve a tener el selector del inventario', /id="wz_moto_inv"/.test(htmlWz));
ok('...con la moto disponible dentro', /value="11"/.test(htmlWz));
ok('...y avisa que esa moto ya se pagó', /no se vuelve a descontar la compra/.test(htmlWz));

// "+ Solicitud" de Plan y Precios manda un id del CATÁLOGO: no debe quedar como moto
vm.runInContext("CATALOGO.splice(0, CATALOGO.length, {id:11, modelo:'CATALOGO 11', precio:1500})", ctx);
ctx.openAddCredConCatalogo(11);
ok('"+ Solicitud" del catálogo NO engancha la moto de inventario con ese número',
  !ctx.WZ.motoInvId && ctx.WZ.motoModelo === 'CATALOGO 11');
ctx.openAddCredConMoto(999);   // moto que no existe
ok('un número de moto que no existe se ignora', !ctx.WZ.motoInvId);
ctx.openAddCredConMoto(11);
ok('un número de moto real sí se toma', String(ctx.WZ.motoInvId) === '11');

// ── 24) El candado espera a que el guardado termine, aunque tarde ──
let corridas = 0, resolver;
ctx.closeM();
S.saveFn = function(){ corridas++; return new Promise(function(res){ resolver = res; }); };
ctx.saveM();
ctx.saveM();   // segundo clic mientras el guardado sigue en vuelo
ok('mientras el guardado está en vuelo, un segundo clic no vuelve a guardar', corridas === 1);
resolver(true);
await new Promise(function(r){ setImmediate(r); });
S.saveFn = function(){ corridas++; return true; };
ctx.saveM();
ok('cuando termina, el siguiente guardado sí entra', corridas === 2);

// ── Revisión 2: la solicitud editada que cambia de moto ──
S.movimientos = [{ id:'MOV-INI5', tipo:'deposito', concepto:'Aporte', monto:9000, cuentaDestino:'Binance', fecha:'2026-08-01' }];
S.egresos = []; S.creds = [];
const motoDeLaSolicitud = { id: 30, modelo:'MOTO CAT', precio:1200, estado:'financiada', creadaEnCredito:'CRED-930',
  notas:'Creada automáticamente desde catálogo al registrar financiamiento CRED-930' };
const motoComprada = { id: 31, modelo:'MOTO STOCK', precio:1000, estado:'disponible' };
S.motos = [motoDeLaSolicitud, motoComprada];
ctx._mpagoCrearGastos(motoDeLaSolicitud, [{ cuenta:'Binance', monto:1200 }], { fecha:'2026-09-03' });
ctx._mpagoCrearGastos(motoComprada, [{ cuenta:'Binance', monto:1000 }], { fecha:'2026-06-10' });
const saldoAntesEdit = saldo('Binance');
// la solicitud se editó y ahora apunta a la moto comprada, pero conserva la marca vieja
S.creds.push({ id:'CRED-930', cli:'CLIENTE EDIT', motoId:31, estado:'pendiente_revision', ini:300, fecha:'2026-09-03', motoCreadaEnSolicitud:true });
ctx._aprRechazar('CRED-930');
ok('solicitud editada: NO se devuelve la compra de la otra moto', saldo('Binance') === saldoAntesEdit);
ok('...la compra real de esa moto sigue viva', S.egresos.filter(e => e.motoIdRef === 31 && !e.eliminado).length === 1);

// ── Revisión 2: sin permiso de eliminar no se rechaza a medias ──
S.egresos = []; S.creds = []; S.movimientos = [{ id:'MOV-INI6', tipo:'deposito', concepto:'Aporte', monto:9000, cuentaDestino:'Binance', fecha:'2026-08-01' }];
const motoSol2 = { id: 32, modelo:'MOTO CAT2', precio:1000, estado:'financiada', creadaEnCredito:'CRED-931' };
S.motos = [motoSol2];
ctx._mpagoCrearGastos(motoSol2, [{ cuenta:'Binance', monto:1000 }], { fecha:'2026-09-03' });
const saldoSinPermiso = saldo('Binance');
S.creds.push({ id:'CRED-931', cli:'CLIENTE SIN PERMISO', motoId:32, estado:'pendiente_revision', ini:300, fecha:'2026-09-03' });
ctx.requireDeletePermission = function(){ return false; };
ctx._aprRechazar('CRED-931');
ok('sin permiso de eliminar, el rechazo no escribe nada', S.creds.find(c => c.id === 'CRED-931').estado === 'pendiente_revision' && saldo('Binance') === saldoSinPermiso);
ctx.requireDeletePermission = function(){ return true; };

// ── Revisión 2: el wizard no guarda una solicitud sin moto ──
form['wz_vendedor'] = el({ value:'' }); form['wz_precio'] = el({ value:'1500' });
form['wz_moto_cat'] = el({ value:'' });
ctx.WZ = Object.assign({}, ctx.WZ, { step:3, motoInvId:null, motoModelo:'', vendedorNombre:'Vendedor' });
avisos.length = 0;
const paso = ctx._wzValidar ? ctx._wzValidar() : null;
ok('sin moto elegida no deja pasar del paso 3', paso === false && avisos.some(a => /Elige la moto/.test(a[1])));

// ── Revisión 2: cambiar de moto de inventario al catálogo no arrastra VIN ni placa ──
ctx.WZ.motoInvId = '31'; ctx.WZ.vin = 'VIN-VIEJO'; ctx.WZ.placa = 'AB123CD'; ctx.WZ.serialMotor = 'MOT-1';
['wz_vin','wz_placa','wz_serial_motor','wz_color','wz_anio','wz_marca','wz_serial_chasis','wz_gps_num'].forEach(id => { form[id] = el({ value:'X' }); });
ctx._wzPickMotoCat({ value:'cat-0', options:[{ value:'cat-0', text:'MOTO CAT', getAttribute: () => 'MOTO CAT' }], selectedIndex:0 });
ok('al pasar al catálogo se borran VIN, placa y seriales de la moto anterior',
  !ctx.WZ.vin && !ctx.WZ.placa && !ctx.WZ.serialMotor && form['wz_vin'].value === '');

// ── Punto 19: borrar un crédito viejo no puede alcanzar a los de números parecidos ──
(function(){
  const mov = (id, concepto, extra) => Object.assign({ id, concepto, monto: 50, tipo:'deposito', eliminado:false }, extra||{});
  const es = (m, cred) => ctx._movEsDelCredito(m, cred);
  ok('CRED-14: su propio movimiento sí', es(mov('M1','Pago cuota · JOSE · CRED-14'), 'CRED-14'));
  ok('CRED-140 NO es CRED-14', !es(mov('M2','Pago cuota · ANA · CRED-140'), 'CRED-14'));
  ok('CRED-149 NO es CRED-14', !es(mov('M3','Inicial · LUIS · CRED-149 (MOTO)'), 'CRED-14'));
  ok('el campo directo manda igual', es(mov('M4','Otra cosa', { creditoId:'CRED-14' }), 'CRED-14'));
  ok('un movimiento de otro crédito no entra', !es(mov('M5','Pago cuota · CRED-15'), 'CRED-14'));
})();

// ── Revisión 3: restaurar todo lo que tocó el rechazo ──
S.movimientos = [{ id:'MOV-INI7', tipo:'deposito', concepto:'Aporte', monto:9000, cuentaDestino:'Binance', fecha:'2026-09-01' }];
S.egresos = []; S.creds = [];
const motoR = { id: 40, modelo:'MOTO R', precio:1000, estado:'financiada', creadaEnCredito:'CRED-940' };
S.motos = [motoR];
ctx._mpagoCrearGastos(motoR, [{ cuenta:'Binance', monto:1000 }], { fecha:'2026-09-03' });
const saldoCompra = saldo('Binance');
S.creds.push({ id:'CRED-940', cli:'CLIENTE R', motoId:40, estado:'pendiente_revision', ini:300, fecha:'2026-09-03',
  precio:1000, cuotaQ:50, totalCuotas:24, pagado:0, motoCreadaEnSolicitud:true });
ctx._aprRechazar('CRED-940');
ok('rechazo: el dinero vuelve y la moto sale del inventario', saldo('Binance') === saldoCompra + 1000 && motoR.eliminado === true);
form['ec_estado'] = el({ value:'' });
ctx.ejecutarRestaurarCred('CRED-940');
ok('restaurar el crédito vuelve a registrar la compra de la moto', saldo('Binance') === saldoCompra);
ok('...la moto vuelve al inventario', motoR.eliminado === false);
ok('...y la solicitud vuelve a la cola de aprobaciones, no a crédito activo',
  S.creds.find(c => c.id === 'CRED-940').estado === 'pendiente_revision');

// ── Revisión 3: "Restaurar todas" recupera también la compra ──
S.movimientos = [{ id:'MOV-INI8', tipo:'deposito', concepto:'Aporte', monto:9000, cuentaDestino:'Binance', fecha:'2026-09-01' }];
S.egresos = []; S.creds = [];
const motoT = { id: 41, modelo:'MOTO T', precio:800, estado:'disponible' };
S.motos = [motoT];
ctx._mpagoCrearGastos(motoT, [{ cuenta:'Binance', monto:800 }], { fecha:'2026-09-03' });
const saldoT = saldo('Binance');
const auditT = { eliminado:true, eliminadoPor:'Prueba', eliminadoEn:'2026-09-12T12:00:00Z', eliminadoRazon:'Moto duplicada', eliminacionReversaCuenta:true };
Object.assign(motoT, auditT);
ctx._mpagoReversarGastos(41, true, auditT);
ok('borrar devolviendo: el dinero vuelve', saldo('Binance') === saldoT + 800);
ctx.restaurarTodasLasMotosEliminadas();
ok('"Restaurar todas" vuelve a descontar la compra (antes quedaba la moto gratis)', saldo('Binance') === saldoT);
ok('...y su gasto queda vivo otra vez', S.egresos.filter(e => e.motoIdRef === 41 && !e.eliminado).length === 1);

// ── Revisión 3: soltar la moto del inventario no deja el modelo ni el VIN pegados ──
ctx._wzPickMotoInv = _pickInvReal;   // vuelve la función de verdad
ctx.WZ = Object.assign({}, ctx.WZ, { motoInvId:'41', motoModelo:'MOTO T', vin:'VIN-41', placa:'XY123' });
['wz_vin','wz_placa','wz_serial_motor','wz_color','wz_anio','wz_marca','wz_serial_chasis','wz_gps_num'].forEach(id => { form[id] = el({ value:'X' }); });
ctx._wzPickMotoInv({ value:'', options:[], selectedIndex:0 });
ok('al soltar la moto se va también su modelo y su VIN', !ctx.WZ.motoInvId && !ctx.WZ.motoModelo && !ctx.WZ.vin && !ctx.WZ.placa);

// ── Revisión 4: rechazar, restaurar, aprobar y volver a restaurar ──
S.movimientos = [{ id:'MOV-INI9', tipo:'deposito', concepto:'Aporte', monto:9000, cuentaDestino:'Binance', fecha:'2026-09-01' }];
S.egresos = []; S.creds = []; S.pagos = [];
const motoCiclo = { id: 50, modelo:'MOTO CICLO', precio:1000, estado:'financiada', creadaEnCredito:'CRED-950' };
S.motos = [motoCiclo];
ctx._mpagoCrearGastos(motoCiclo, [{ cuenta:'Binance', monto:1000 }], { fecha:'2026-09-03' });
S.creds.push({ id:'CRED-950', cli:'CLIENTE CICLO', motoId:50, estado:'pendiente_revision', ini:300, inicialPct:0.3, fecha:'2026-09-03',
  precio:1000, cuotaQ:50, totalCuotas:24, pagado:0, motoCreadaEnSolicitud:true });
ctx._aprRechazar('CRED-950');
ctx.ejecutarRestaurarCred('CRED-950');
ok('rechazada y restaurada: vuelve a la cola de aprobaciones', S.creds[0].estado === 'pendiente_revision');
form['apr_ini_monto'] = el({ value:'300' }); form['apr_ini_metodo'] = el({ value:'Binance' }); form['apr_ini_ref'] = el({ value:'' });
ctx._aprAprobarConfirm('CRED-950');
ok('al aprobarla queda activa y con UNA inicial', S.creds[0].estado === 'activo' && S.pagos.filter(p => p.esInicial).length === 1);
ok('...y el rechazo viejo deja de mandar', !S.creds[0].rechazadoEn);
S.creds[0].estado = 'cancelado'; S.creds[0].eliminado = false;
ctx.ejecutarRestaurarCred('CRED-950');
ok('si después se cancela y se restaura, vuelve ACTIVA, no a la cola', S.creds[0].estado === 'activo');
S.creds[0].estado = 'pendiente_revision';
ctx._aprAprobarConfirm('CRED-950');
ok('aprobar dos veces no registra una segunda inicial', S.pagos.filter(p => p.esInicial && !p.eliminado).length === 1);

// ── Revisión 4: el catálogo se guarda con la versión que el sistema lee ──
const guardados = [];
const dbReal = ctx.db;
ctx.db = { collection: () => ({ doc: () => ({ set(d){ guardados.push(d); return Promise.resolve(); } }) }) };
vm.runInContext("CATALOGO.splice(0, CATALOGO.length, {id:1, modelo:'UNA', precio:1000})", ctx);
if (typeof ctx.guardarCatalogo === 'function') ctx.guardarCatalogo();
ctx.db = dbReal;
ok('el catálogo se guarda con version 3 (antes se perdía al recargar)',
  guardados.length === 0 || guardados.every(d => d.version === 3));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
})();
