// 9-nov-2026, Adam: "Empezamos a trabajar también los sábados. Pero las comisiones los sábados van
// a ser más altas. En vez de ser $5 por venta, va a ser $15 por venta... igualito como está ahorita lo
// de los $5, pero que los sábados yo pueda elegir otro monto de comisión por venta".
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


ctx.S.currentUser = { uid:'adm', nombre:'Adam', rol:'Administrador' };
const cred = (id, fecha, uid, extra) => Object.assign({ id, fecha, vendedorUid: uid, cli: 'CLIENTE ' + id, modelo: 'Owen', precioFinanciado: 1000, estado: 'activo' }, extra || {});
ctx._usersCache = [
  { uid:'u1', nombre:'Liz', rol:'Vendedor', comisiones:{ activo:true, venta:{tipo:'fijo',valor:5}, cobranza:{tipo:'fijo',valor:1} } },              // de antes: sin monto de sábado
  { uid:'u2', nombre:'Debora', rol:'Vendedor', comisiones:{ activo:true, venta:{tipo:'fijo',valor:5}, cobranza:{tipo:'fijo',valor:1}, sabado:{valor:20} } },
  { uid:'u3', nombre:'Porcentaje', rol:'Vendedor', comisiones:{ activo:true, venta:{tipo:'porc',valor:1}, cobranza:{tipo:'fijo',valor:1} } },
  { uid:'u4', nombre:'Cero', rol:'Vendedor', comisiones:{ activo:true, venta:{tipo:'fijo',valor:5}, cobranza:{tipo:'fijo',valor:1}, sabado:{valor:0} } }
];
ctx.S.usuarios = ctx._usersCache;
ctx.S.creds = [
  cred('C1', '2026-11-06', 'u1'),                       // viernes → $5
  cred('C2', '2026-11-07', 'u1'),                       // sábado (el primero) → $15
  cred('C3', '2026-11-14', 'u1'),                       // sábado → $15
  cred('C4', '2026-10-31', 'u1'),                       // sábado VIEJO, ya pagado a $5 → sigue en $5
  cred('C5', '2026-11-08', 'u1'),                       // domingo → $5
  cred('C6', '2026-11-14', 'u1', { estado:'cancelado' }), // cancelado → nada
  cred('C7', '2026-11-14', 'u2'), cred('C8', '2026-11-13', 'u2'),
  cred('C9', '2026-11-14', 'u3'),
  cred('C10', '2026-11-14', 'u4')
];
ctx.S.pagos = [];
ctx.S.egresos = [{ id: 900, categoria: 'comisiones', monto: 10, fecha: '2026-11-08', forma: 'Banesco', usuarioComisionNombre: 'Liz' }];

const liz = ctx._comCalcGenerado(ctx._usersCache[0]);
const de = id => liz.ventas.find(v => v.credId === id);
ok('viernes: $5 como siempre', de('C1').comision === 5 && de('C1').sabado === false);
ok('sábado 7-nov (el primero): $15 aunque el vendedor no tenga monto de sábado guardado', de('C2').comision === 15 && de('C2').sabado === true);
ok('sábado 14-nov: $15', de('C3').comision === 15);
ok('un sábado de antes (31-oct) no cambia: se pagó a $5', de('C4').comision === 5 && de('C4').sabado === false);
ok('domingo: $5', de('C5').comision === 5);
ok('cancelado: no genera', !de('C6'));
ok('total de Liz: 5 + 15 + 15 + 5 + 5 = 45', liz.porVenta === 45);
const s = ctx._comGetSaldo(ctx._usersCache[0]);
ok('lo pagado (el gasto de comisiones) se descuenta igual que antes: por pagar 35', s.generado === 45 && s.pagado === 10 && s.saldo === 35);
const deb = ctx._comCalcGenerado(ctx._usersCache[1]);
ok('Debora con su propio monto de sábado ($20): sábado 20, viernes 5', deb.ventas.find(v => v.credId === 'C7').comision === 20 && deb.ventas.find(v => v.credId === 'C8').comision === 5);
ok('quien gana un % por venta no cambia los sábados (no hay monto fijo que reemplazar)', ctx._comCalcGenerado(ctx._usersCache[2]).ventas[0].comision === 10 && ctx._comCalcGenerado(ctx._usersCache[2]).ventas[0].sabado === false);
ok('un 0 guardado para el sábado es 0, no 15', ctx._comCalcGenerado(ctx._usersCache[3]).ventas[0].comision === 0);
const corte = ctx._comCalcCorte(ctx._usersCache[0], '2026-11-01', '2026-11-15');
ok('el corte de la quincena 1–15 nov suma los sábados a $15', corte.porVenta === 40 && corte.ventas.length === 4);
ok('la cobranza no cambia los sábados', /cfg\.cobranza\.tipo === 'porc'\s*\n\s*\? \(parseFloat\(p\.monto\)\|\|0\) \* \(cfg\.cobranza\.valor\/100\)\s*\n\s*: cfg\.cobranza\.valor;/.test(fs.readFileSync(path.join(ROOT,'logic/comisiones.js'),'utf8')));

// La pantalla
ctx.window._comTab = 'vendedores';
let html = ctx._comisionesRender();
ok('la tabla de vendedores dice el monto del sábado', /Venta \$5 · Sábado \$15 · Cobro \$1/.test(html) && /Venta \$5 · Sábado \$20 · Cobro \$1/.test(html));
ctx.window._comTab = 'generadas';
html = ctx._comisionesRender();
ok('en Generadas la venta del sábado se marca', /Venta · sábado/.test(html));
ctx._comAbrirDetalle('u1');
ok('en el detalle del vendedor también', />sábado<\/span>/.test(els.mbd.innerHTML));

// Configuración rápida (⚙ en Comisiones)
ctx._comConfigRapida('u1');
ok('el ⚙ muestra el campo del sábado con $15 por defecto', /id="cmr_sval"[^>]*value="15"/.test(els.mbd.innerHTML));
const el = id => doc.getElementById(id);
el('cmr_activo').checked = true; el('cmr_vtipo').value = 'fijo'; el('cmr_vval').value = '5'; el('cmr_ctipo').value = 'fijo'; el('cmr_cval').value = '1'; el('cmr_sval').value = '12';
ctx.S.saveFn();
ok('...y guarda el monto elegido', guardado.length === 1 && guardado[0].data.comisiones.sabado.valor === 12 && guardado[0].data.comisiones.venta.valor === 5);
el('cmr_sval').value = '';
ctx.S.saveFn();
ok('campo vacío vuelve a $15', guardado[1].data.comisiones.sabado.valor === 15);

// Editar usuario (Usuarios → permisos) no debe borrar el monto del sábado
const usuario = Object.assign({}, ctx._usersCache[1]);
ctx.db = { collection(){ return { doc(){ return { get(){ return Promise.resolve({ exists:true, data(){ return usuario; } }); }, update(){ return Promise.resolve(); } }; } }; } };
(async () => {
  ctx.editarUsuario('u2');
  await new Promise(r => setImmediate(r));
  ok('Usuarios muestra el monto de sábado de Debora ($20)', /id="eu_com_s_val"[^>]*value="20"/.test(els.mbd.innerHTML));
  el('eu_rol').value = 'Vendedor'; el('eu_cargo').value = ''; el('eu_com_activo').checked = true;
  el('eu_com_v_tipo').value = 'fijo'; el('eu_com_v_val').value = '5'; el('eu_com_c_tipo').value = 'fijo'; el('eu_com_c_val').value = '1'; el('eu_com_s_val').value = '20';
  guardado.length = 0; ctx.S.saveFn();
  ok('al guardar el usuario, el sábado sigue en $20 (no se pierde)', guardado.length === 1 && guardado[0].data.comisiones.sabado.valor === 20);
  ok('el pago de la comisión sigue siendo un gasto de "comisiones" con su cuenta y su retiro (no se tocó)', /categoria: 'comisiones',\s*\n\s*forma: cuenta,/.test(fs.readFileSync(path.join(ROOT,'logic/comisiones.js'),'utf8')) && /tipoOperacion: 'comision',/.test(fs.readFileSync(path.join(ROOT,'logic/comisiones.js'),'utf8')));
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})();
