// 26-nov-2026: módulo «Lista negra». Lo pidió el Sr. Luis Márquez (Verificación Documental) y Adam lo aprobó con
// estas decisiones: se llama «Lista negra»; cada persona lleva un motivo; «mala paga» va de las dos formas (a mano
// y sola: más de 30 días de atraso o moto recuperada, en la 18 o la 26); hay un buscador por cédula; cuando hay
// coincidencia el sistema FRENA al vendedor con el aviso en clave («ERROR BL26») y Verificación decide; la lista la
// ven solo Verificación y los administradores; las referencias se revisan por cédula si la tienen y por teléfono.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ════════ 1. Las claves (sin navegador) ════════
const LN = require(path.join(ROOT, 'logic/lista-negra.js'));
ok('la cédula se compara aunque la escriban distinto', ['V-12.345.678', 'v12345678', ' 12345678 ', 'V-012345678'].every(x => LN.lnCedKey(x) === 'C12345678'));
ok('con menos de 6 números no es una cédula', LN.lnCedKey('V-123') === '' && LN.lnCedKey('') === '' && LN.lnCedKey(null) === '');
ok('el teléfono son sus últimos 10 números', ['0414-1234567', '+58 414 1234567', '584141234567', '4141234567'].every(x => LN.lnTelKey(x) === 'T4141234567') && LN.lnTelKey('1234567') === '');
const claves = LN.lnClavesDe({ ci: 'V-11111111', fiador_ci: 'V-22222222', r1ci: 'V-33333333', r1t: '0414-1111111', r2ci: '', r2t: '0412-2222222' });
ok('se revisan las cédulas del cliente, el fiador y las referencias, y el teléfono de las referencias',
  JSON.stringify(claves.map(x => x.clave + ':' + x.papel)) === JSON.stringify(['C11111111:cliente', 'C22222222:fiador', 'C33333333:referencia 1', 'T4141111111:referencia 1', 'T4122222222:referencia 2']));
ok('una misma cédula repetida se revisa una sola vez', LN.lnClavesDe({ ci: 'V-11111111', fiador_ci: '11111111' }).length === 1);
ok('las claves de una ficha ya guardada salen igual', Object.keys(LN.lnClavesDeFicha({ cedula: 'V-11111111', fiador_ci: 'V-22222222', ref1: { ci: '', tel: '0414-1111111' }, ref2: {} })).sort().join() === 'C11111111,C22222222,T4141111111');
ok('las claves de un CRÉDITO son las de su cliente, su fiador y sus referencias (no las de la ficha de hoy)', Object.keys(LN.lnClavesDeCredito({ fiador_ci: '', r1ci: 'V-33333333', r1t: '0414-1111111', r2t: '' }, { cedula: 'V-11111111', fiador_ci: 'V-22222222' })).sort().join() === 'C11111111,C33333333,T4141111111');
ok('el visto bueno vence', LN.lnPaseVigente({ hasta: '2026-12-01T00:00:00.000Z' }, '2026-11-26T12:00:00.000Z') && !LN.lnPaseVigente({ hasta: '2026-11-20T00:00:00.000Z' }, '2026-11-26T12:00:00.000Z') && !LN.lnPaseVigente(null));
ok('el aviso dice exactamente lo que pidió Luis', LN.LN_MENSAJE === 'Coincidencia con Cédula en Contrato Anterior. ERROR BL26. Comunicarse con Departamento de Verificación Documental');

// ════════ 2. «Mala paga» automática ════════
const clientes = [{ id: 'K1', nombre: 'UNO', cedula: 'V-11111111', tel: '0414-1111111' }, { id: 'K2', nombre: 'DOS', cedula: 'V-22222222', tel: '' }, { id: 'K3', nombre: 'TRES', cedula: 'V-33333333' },
  { id: 'K4', nombre: 'CUATRO', cedula: 'V-44444444' }, { id: 'K5', nombre: 'SIN CEDULA', cedula: '' }, { id: 'K6', nombre: 'SEIS', cedula: 'V-66666666' }];
const auto = LN.lnAutoDe('26', [
  { id: 'M-1', estado: 'mora', clienteId: 'K1', dias: 31 },                 // 31 días: entra
  { id: 'M-2', estado: 'activo', clienteId: 'K2', dias: 30 },               // 30 justos: no
  { id: 'M-3', estado: 'recuperado', clienteId: 'K3', dias: 0 },            // moto recuperada: entra
  { id: 'M-4', estado: 'cancelado', clienteId: 'K4', dias: 200 },           // venta anulada: no
  { id: 'M-5', estado: 'mora', clienteId: 'K5', dias: 90 },                 // sin cédula: no se puede anotar
  { id: 'M-6', estado: 'mora', clienteId: 'K6', dias: 90, eliminado: true },// crédito eliminado: no
  { id: 'M-7', estado: 'completado', clienteId: 'K6', dias: 0 },            // ya pagó todo: no
  { id: 'M-8', estado: 'mora', cli: 'UNO', dias: 45 }                       // crédito viejo enlazado por nombre
], clientes);
ok('entra quien tiene MÁS de 30 días de atraso o una moto recuperada, y nadie más', Object.keys(auto).sort().join() === 'C11111111,C33333333' && LN.LN_AUTO_DIAS === 30);
ok('un crédito viejo enlazado por nombre no anota a un tocayo: si dos clientes se llaman igual, no se adivina', Object.keys(LN.lnAutoDe('26', [{ id: 'M-1', estado: 'mora', cli: 'JUAN PEREZ', dias: 90 }], [{ id: 'A', nombre: 'JUAN PEREZ', cedula: 'V-10000001' }, { id: 'B', nombre: 'JUAN PEREZ', cedula: 'V-10000002' }])).length === 0);
ok('...con su motivo, su teléfono y de qué crédito sale', auto.C11111111.motivo === 'Mala paga' && auto.C11111111.telKey === 'T4141111111' && auto.C11111111.detalle.length === 2 && auto.C11111111.detalle[0].credito === 'M-1' && auto.C11111111.detalle[0].empresa === '26'
  && auto.C33333333.motivo === 'Moto recuperada' && auto.C33333333.detalle[0].recuperada === true);

// ════════ 3. El robot ════════
const bot = require(path.join(ROOT, 'bot/lista-negra.js'));
const junto = bot.juntar([{ C1: { nombre: 'A', telefono: '', telKey: '', motivo: 'Mala paga', detalle: [{ empresa: '18', credito: 'CRED-1', dias: 40 }] } },
  { C1: { nombre: 'A', telefono: '0414-1234567', telKey: 'T4141234567', motivo: 'Moto recuperada', detalle: [{ empresa: '26', credito: 'M-1', recuperada: true }] }, C2: { nombre: 'B', telefono: '', telKey: '', motivo: 'Mala paga', detalle: [{ empresa: '26', credito: 'M-2', dias: 60 }] } }]);
ok('quien debe en las dos compañías sale una sola vez, con los dos créditos', Object.keys(junto).length === 2 && junto.C1.detalle.length === 2 && junto.C1.motivo === 'Moto recuperada' && junto.C1.telKey === 'T4141234567');
const marcas = bot.marcasDe(junto);
ok('cada persona deja su marca de cédula y, si tiene, la de teléfono', Object.keys(marcas).sort().join() === 'A-C1,A-C2,A-T4141234567');
const pl = bot.plan(junto, marcas, { C1: junto.C1, C9: { nombre: 'YA PAGO' } }, { 'A-C1': 1, 'A-C9': 1 });
ok('solo se escribe lo que cambió, y quien se puso al día sale de la lista', pl.escribir.join() === 'C2' && pl.borrar.join() === 'C9' && pl.marcar.sort().join() === 'A-C2,A-T4141234567' && pl.desmarcar.join() === 'A-C9');
const credAtrasado = { id: 'M-9', fecha: '2026-08-01', cuotaQ: 80, totalCuotas: 12, plazo: 6, total: 960, estado: 'activo' };
ok('los días de atraso salen del mismo motor de cuotas del sistema', bot.atrasoDe(credAtrasado, [], '2026-11-26') > 90 && bot.atrasoDe(Object.assign({}, credAtrasado, { fecha: '2026-11-20' }), [], '2026-11-26') === 0);
const deEmp = bot.autoDeEmpresa('18', { creditos: [credAtrasado], pagos: [], clientes: [{ id: 'K1', nombre: 'UNO', cedula: 'V-11111111' }].map(c => c) }, '2026-11-26');
ok('...y un crédito sin cliente enlazado no rompe nada', Object.keys(deEmp).length === 0);
const cliK = [{ id: 'K1', nombre: 'UNO', cedula: 'V-11111111', tel: '0414-1111111' }];
const credK = Object.assign({}, credAtrasado, { clienteId: 'K1', cli: 'UNO' });
ok('un crédito con su cliente y sin pagos, vencido hace meses, entra', Object.keys(bot.autoDeEmpresa('18', { creditos: [credK], pagos: [], clientes: cliK }, '2026-11-26')).join() === 'C11111111');
const pagosAlDia = [1,2,3,4,5,6,7].map(i => ({ id: 'P' + i, cred: 'M-9', monto: 80, fecha: '2026-08-' + String(10 + i), estado: 'confirmado' }));
ok('...con sus cuotas pagadas, no', Object.keys(bot.autoDeEmpresa('18', { creditos: [credK], pagos: pagosAlDia, clientes: cliK }, '2026-11-26')).length === 0);
ok('...y tampoco si esos pagos están eliminados «manteniendo la amortización» (el sistema lo da al día)', Object.keys(bot.autoDeEmpresa('18', { creditos: [credK], pagos: pagosAlDia.map(p => Object.assign({}, p, { eliminado: true, mantenerEnAmortizacion: true })), clientes: cliK }, '2026-11-26')).length === 0);
ok('...pero un pago eliminado de verdad no cuenta', Object.keys(bot.autoDeEmpresa('18', { creditos: [credK], pagos: pagosAlDia.map(p => Object.assign({}, p, { eliminado: true })), clientes: cliK }, '2026-11-26')).length === 1);
ok('si una base responde sin créditos o sin clientes, el robot no escribe (borraría a todos)', bot.lecturaCreible({ creditos: [credK], clientes: cliK }) && !bot.lecturaCreible({ creditos: [], clientes: cliK }) && !bot.lecturaCreible({ creditos: [credK], clientes: [] }) && /if \(!lecturaCreible\(datos\)\) throw/.test(src('bot/lista-negra.js')));
ok('el log público no repite el mensaje de un error (puede traer una cédula)', bot.errorParaElLog(Object.assign(new Error('5 NOT_FOUND: listaNegraAuto/C12345678'), { code: 'not-found' })) === 'not-found' && !/\d{6}/.test(bot.errorParaElLog(new Error('x C12345678'))) && !/e\.message/.test(src('bot/lista-negra.js').split('if (require.main')[1]));
// El robot corre desde el repositorio de PAGASI 18 (lee las dos bases y escribe en la 26): el otro no lleva este archivo.
const wfRuta = path.join(ROOT, '.github/workflows/lista-negra.yml');
if (fs.existsSync(wfRuta)) { const wf = fs.readFileSync(wfRuta, 'utf8'); ok('el robot corre dos veces al día y se puede lanzar a mano sin escribir', /cron: '20 10,17 \* \* \*'/.test(wf) && /solo_leer/.test(wf) && /node lista-negra\.js/.test(wf)); }
else ok('(en este repositorio el robot no se programa: corre desde el de PAGASI 18)', true);

// ════════ 4. El panel ════════
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, checked:false, disabled:false, parentNode:null, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, insertBefore(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){}, select(){}, closest(){return null;}, matches(){return false;}, getBoundingClientRect(){return {top:0,left:0,width:0,height:0,bottom:0,right:0};}, querySelector(){return null;}, querySelectorAll(){return [];} }; }
const els = {}, ventanas = [];
const cuerpo = elemento(); cuerpo.appendChild = el => { ventanas.push(el); el.parentNode = cuerpo; }; cuerpo.removeChild = el => { el.parentNode = null; };
const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, createTextNode(){ return elemento(); }, head:elemento(), body:cuerpo, documentElement:elemento(), addEventListener(){}, removeEventListener(){}, title:'' };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({ e:[], generado:'2026-11-26', fuentes:{} })}); }, alert(){}, prompt(){ return ''; }, confirm(){ return true; },
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const admin = src('admin.html');
const archivos = [...admin.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
const avisosToast = []; ctx.toast = (m, t) => { avisosToast.push(t + ':' + m); };
ctx.logActividad = () => {}; ctx.confirmarEliminacion = o => o.onConfirm({});
ctx.closeM = () => { cerradas++; }; let cerradas = 0;
const S = ctx.S;
const dentro = expr => vm.runInContext(expr, ctx);
const en26 = () => { ctx.FIREBASE_CONFIG.projectId = 'pagasi26-65ced'; };
const en18 = () => { ctx.FIREBASE_CONFIG.projectId = 'pagasi-v2'; };
const como = (rol, permisos) => { S.currentUser = { uid: 'U-' + rol, nombre: rol + ' de prueba', email: 'x@ejemplo.com', rol, permisos: permisos || [] }; };

// Base de mentira: colecciones en memoria, lotes y un interruptor para fallar
function baseFalsa(datos){
  const B = { datos, escritos: [], falla: null, lecturas: 0 };
  const col = n => ({
    doc(id){ return {
      get(){ B.lecturas++; if(B.falla) return Promise.reject(B.falla); const d = (datos[n] || {})[id]; return Promise.resolve({ exists: !!d, id, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) }); },
      set(d){ (datos[n] = datos[n] || {})[id] = d; B.escritos.push('set ' + n + '/' + id); return Promise.resolve(); },
      update(d){ Object.assign((datos[n] = datos[n] || {})[id] = (datos[n][id] || {}), d); B.escritos.push('update ' + n + '/' + id); return Promise.resolve(); },
      delete(){ if(datos[n]) delete datos[n][id]; B.escritos.push('delete ' + n + '/' + id); return Promise.resolve(); },
      _n: n, _id: id
    }; },
    add(d){ const id = 'AUTO-' + (Object.keys(datos[n] || {}).length + 1); (datos[n] = datos[n] || {})[id] = d; B.escritos.push('add ' + n); return Promise.resolve({ id }); },
    orderBy(){ return col(n); }, limit(){ return col(n); }, where(){ return col(n); },
    onSnapshot(cb){ const l = Object.keys(datos[n] || {}).map(id => ({ id, data: () => datos[n][id] })); cb({ forEach: f => l.forEach(f) }); return () => {}; }
  });
  B.collection = col;
  B.batch = () => { const ops = []; return { set(r, d){ ops.push(() => col(r._n).doc(r._id).set(d)); }, update(r, d){ ops.push(() => col(r._n).doc(r._id).update(d)); }, delete(r){ ops.push(() => col(r._n).doc(r._id).delete()); }, commit(){ if(B.falla) return Promise.reject(B.falla); ops.forEach(f => f()); return Promise.resolve(); } }; };
  return B;
}
const vueltas = async n => { for (let i = 0; i < (n || 25); i++) await new Promise(r => setImmediate(r)); };
const limpiar = () => { ventanas.length = 0; vm.runInContext('_lnLibres = {}; _lnAvisados = {}; _lnVistas = {}; window._lnRevisando = false;', ctx); };

(async () => {
  en26(); como('Vendedor', ['dash', 'clientes', 'creditos']);
  const FORM = { origen: 'cliente', nom: 'CLIENTE NUEVO', ci: 'V-11111111', fiador_ci: 'V-22222222', r1ci: '', r1t: '0414-3333333', r2ci: '', r2t: '' };

  // 4a. Nadie en la lista: se guarda
  let B = baseFalsa({}); ctx.db = B; limpiar(); let siguio = 0;
  let r = ctx.lnPuerta(FORM, () => { siguio++; });
  await vueltas();
  ok('con todos limpios la puerta consulta y deja seguir', r === false && siguio === 1 && ventanas.length === 0 && B.lecturas === 6);
  ok('...y la segunda pasada (el guardado de verdad) ya no vuelve a consultar', ctx.lnPuerta(FORM, () => { siguio++; }) === true && B.lecturas === 6);

  // 4a-bis. Cancelan o cierran la ventana mientras el sistema consulta: NO se guarda
  B = baseFalsa({}); ctx.db = B; limpiar(); siguio = 0; let abierta = true, soltado = 0;
  ctx.lnPuerta(Object.assign({}, FORM, { vigente: () => abierta }), () => { siguio++; }, () => { soltado++; }); abierta = false; await vueltas();
  ok('si cierran la ventana mientras se consulta, no se guarda nada', siguio === 0 && soltado === 1 && ventanas.length === 0);
  ctx.lnPuerta(Object.assign({}, FORM, { vigente: () => true }), () => { siguio++; }); await vueltas();
  ok('...y con la ventana abierta sigue como siempre', siguio === 1);
  B = baseFalsa({ listaNegraIndice: { 'M-C11111111': {} } }); ctx.db = B; limpiar(); siguio = 0; abierta = true; como('Empleado', ['dash', 'listanegra']);
  ctx.lnPuerta(Object.assign({}, FORM, { vigente: () => abierta }), () => { siguio++; }); await vueltas(); abierta = false; els['ln-ventana-pase'].onclick(); await vueltas();
  ok('...ni se guarda si autorizan con la ventana del cliente ya cerrada', siguio === 0);
  como('Vendedor', ['dash', 'clientes', 'creditos']);

  // 4b. El cliente está anotado a mano: frena
  B = baseFalsa({ listaNegraIndice: { 'M-C11111111': { t: 'manual' } } }); ctx.db = B; limpiar(); siguio = 0; let frenado = 0;
  ctx.lnPuerta(FORM, () => { siguio++; }, () => { frenado++; });
  await vueltas();
  ok('si la cédula del cliente está en la lista, NO se guarda y sale la ventana', siguio === 0 && frenado === 1 && ventanas.length === 1 && /ERROR BL26/.test(ventanas[0].innerHTML) && /Coincidencia con Cédula en Contrato Anterior/.test(ventanas[0].innerHTML));
  ok('al vendedor la ventana no le dice quién ni por qué, ni le deja autorizar', !/Solo tú lo ves/.test(ventanas[0].innerHTML) && !/ln-ventana-pase/.test(ventanas[0].innerHTML) && !/11111111/.test(ventanas[0].innerHTML));
  const av = Object.values(B.datos.listaNegraAvisos || {})[0];
  ok('queda anotado para Verificación: quién, a quién quiso cargar y qué coincidió', !!av && av.estado === 'pendiente' && av.uid === 'U-Vendedor' && av.nombre === 'CLIENTE NUEVO' && av.coincidencias.length === 1 && av.coincidencias[0].clave === 'C11111111' && av.coincidencias[0].papel === 'cliente');
  ctx.lnPuerta(FORM, () => { siguio++; }); await vueltas();
  ok('si insiste, vuelve a frenar pero no llena la lista de avisos repetidos', siguio === 0 && Object.keys(B.datos.listaNegraAvisos).length === 1);

  // 4c. Fiador y referencias
  for (const [marca, papel] of [['A-C22222222', 'fiador'], ['M-T4143333333', 'referencia 1']]) {
    B = baseFalsa({ listaNegraIndice: { [marca]: { t: 'x' } } }); ctx.db = B; limpiar(); siguio = 0;
    ctx.lnPuerta(FORM, () => { siguio++; }); await vueltas();
    const a = Object.values(B.datos.listaNegraAvisos || {})[0];
    ok('también frena por ' + (papel === 'fiador' ? 'el fiador (mala paga automática)' : 'el teléfono de una referencia'), siguio === 0 && ventanas.length === 1 && a && a.coincidencias[0].papel === papel);
  }

  // 4d. Con el visto bueno de Verificación pasa; vencido, no
  B = baseFalsa({ listaNegraIndice: { 'M-C11111111': {} }, listaNegraPases: { C11111111: { hasta: new Date(Date.now() + 86400000).toISOString() } } }); ctx.db = B; limpiar(); siguio = 0;
  ctx.lnPuerta(FORM, () => { siguio++; }); await vueltas();
  ok('con el visto bueno vigente de Verificación, pasa', siguio === 1 && ventanas.length === 0);
  B = baseFalsa({ listaNegraIndice: { 'M-C11111111': {} }, listaNegraPases: { C11111111: { hasta: '2026-01-01T00:00:00.000Z' } } }); ctx.db = B; limpiar(); siguio = 0;
  ctx.lnPuerta(FORM, () => { siguio++; }); await vueltas();
  ok('con el visto bueno vencido, vuelve a frenar', siguio === 0 && ventanas.length === 1);

  // 4e. Al editar una ficha no frena por lo que ya tenía
  B = baseFalsa({ listaNegraIndice: { 'M-C11111111': {}, 'M-C99999999': {} } }); ctx.db = B; limpiar(); siguio = 0;
  const ya = ctx.lnClavesDeFicha({ cedula: 'V-11111111', fiador_ci: 'V-22222222', ref1: { tel: '0414-3333333' } });
  r = ctx.lnPuerta(Object.assign({}, FORM, { yaGuardadas: ya }), () => { siguio++; });
  ok('al editar una ficha sin cambiar cédulas ni teléfonos, ni consulta', r === true && B.lecturas === 0);
  ctx.lnPuerta(Object.assign({}, FORM, { fiador_ci: 'V-99999999', yaGuardadas: ya }), () => { siguio++; }); await vueltas();
  ok('...pero si le cambian el fiador por uno de la lista, frena', siguio === 0 && ventanas.length === 1);

  // 4f. Si no se puede consultar, la venta NO se frena
  B = baseFalsa({ listaNegraIndice: { 'M-C11111111': {} } }); B.falla = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); ctx.db = B; limpiar(); siguio = 0;
  ctx.lnPuerta(FORM, () => { siguio++; }); await vueltas();
  ok('si la base no deja consultar (Reglas sin publicar, sin conexión), se deja pasar', siguio === 1 && ventanas.length === 0);

  // 4g. En PAGASI 18 no existe
  en18(); B = baseFalsa({ listaNegraIndice: { 'M-C11111111': {} } }); ctx.db = B; limpiar(); como('Administrador', []);
  ok('en PAGASI 18 no se revisa nada y el módulo no se abre ni para un administrador', ctx.lnPuerta(FORM, () => {}) === true && B.lecturas === 0 && ctx.hasModuleAccess('listanegra') === false && ctx.lnPuedeVer() === false);
  en26();

  // 4h. Quien tiene acceso ve el detalle y puede autorizar ahí mismo
  como('Empleado', ['dash', 'clientes', 'listanegra']);
  B = baseFalsa({ listaNegraIndice: { 'M-C11111111': {} } }); ctx.db = B; limpiar(); siguio = 0;
  ctx.lnPuerta(FORM, () => { siguio++; }); await vueltas();
  ok('a Verificación la ventana sí le dice qué coincidió y le deja autorizar', /Solo tú lo ves/.test(ventanas[0].innerHTML) && /ln-ventana-pase/.test(ventanas[0].innerHTML) && /cédula 11111111/.test(ventanas[0].innerHTML));
  els['ln-ventana-pase'].onclick(); await vueltas();
  ok('...al autorizar queda el visto bueno por 7 días y la venta sigue', siguio === 1 && !!B.datos.listaNegraPases.C11111111 && B.datos.listaNegraPases.C11111111.hasta > new Date(Date.now() + 6 * 86400000).toISOString() && dentro('LN_PASE_DIAS') === 7);
  ok('...y el aviso de ese intento queda resuelto, no pendiente', Object.values(B.datos.listaNegraAvisos)[0].estado === 'autorizado' && Object.values(B.datos.listaNegraAvisos)[0].resueltoPor === 'Empleado de prueba');

  // 4i. El aviso al escribir la cédula
  como('Vendedor', ['dash', 'clientes']);
  B = baseFalsa({ listaNegraIndice: { 'M-C55555555': {} } }); ctx.db = B; limpiar();
  await ctx.lnAlEscribir('wz_r1ci', 'V-55555555'); await vueltas();
  ok('al escribir una cédula que está en la lista, el aviso sale sin esperar a guardar', ventanas.length === 1 && /ERROR BL26/.test(ventanas[0].innerHTML) && Object.values(B.datos.listaNegraAvisos)[0].coincidencias[0].papel === 'referencia 1');
  limpiar(); const antes = B.lecturas;
  await ctx.lnAlEscribir('wz_nom', 'V-55555555'); await ctx.lnAlEscribir('wz_ci', '123'); await vueltas();
  ok('...solo en las casillas de cédula y teléfono de referencia, y con el dato completo', ventanas.length === 0 && B.lecturas === antes);

  // ════════ 5. El módulo ════════
  ok('está en la lista de módulos, en los dos menús, en el del teléfono y con su nombre', dentro('MODULOS').some(m => m.id === 'listanegra' && m.label === 'Lista negra') && dentro('PGL.listanegra') === 'Lista negra'
    && (src('assets/pagasi-app.js').match(/'users','cumplimiento','listanegra','catalogo'\]\}/g) || []).length === 2 && /'listanegra'/.test(src('logic/movil-navegacion.js')) && !!dentro('PG_NAVICONS.listanegra'));
  ok('los administradores nuevos lo traen; los demás roles no', dentro('ROL_PERMISOS').Administrador.includes('listanegra') && ['Gerente', 'Cobrador', 'Vendedor', 'Contador', 'Empleado'].every(r => !(dentro('ROL_PERMISOS')[r] || []).includes('listanegra')));
  ok('la página se carga: la lógica antes que la pantalla', admin.indexOf('logic/lista-negra.js') > 0 && admin.indexOf('modules/listanegra.js') > admin.indexOf('logic/lista-negra.js'));
  como('Vendedor', ['dash', 'clientes', 'creditos']);
  ok('un vendedor no entra', ctx.hasModuleAccess('listanegra') === false && /solo Verificación y los administradores/.test(ctx.PG.listanegra()));
  S.currentUser = { uid: 'U-VC', nombre: 'VC', rol: 'Vendedor Concesionario', permisos: ['listanegra'] };
  ok('un vendedor de concesionario tampoco, aunque le marquen el permiso', ctx.hasModuleAccess('listanegra') === false && ctx.lnPuedeVer() === false);

  como('Empleado', ['dash', 'listanegra']);
  B = baseFalsa({ listaNegra: { C77777777: { cedula: 'V-77777777', cedulaKey: 'C77777777', nombre: 'PERSONA SIETE', telefono: '0414-7777777', telKey: 'T4147777777', motivo: 'Documentos falsos', comentario: 'PRESENTO UN RIF FALSO', creadoPor: 'LUIS' } },
    listaNegraAuto: { C88888888: { cedula: 'V-88888888', cedulaKey: 'C88888888', nombre: 'PERSONA OCHO', telefono: '', telKey: '', motivo: 'Mala paga', detalle: [{ empresa: '18', credito: 'CRED-100', dias: 64 }] } },
    listaNegraIndice: { 'M-C77777777': {}, 'M-T4147777777': {} } });
  ctx.db = B; vm.runInContext("_ln.suscrito = false; _ln.tab = 'lista'; _ln.filtro = '';", ctx);
  let html = ctx.PG.listanegra();
  ok('quien tiene el permiso ve la lista, con lo anotado a mano y lo automático', /PERSONA SIETE/.test(html) && /Documentos falsos/.test(html) && /PERSONA OCHO/.test(html) && /PAGASI 18 · CRED-100 · 64 días de atraso/.test(html) && /Automático/.test(html) && /A mano/.test(html));
  ok('...pero no ve los botones de modificar ni eliminar (son de administrador)', !/lnEliminar\(/.test(html) && !/>Editar</.test(html));
  como('Administrador', []);
  html = ctx.PG.listanegra();
  ok('un administrador sí, y solo en lo anotado a mano', (html.match(/lnEliminar\(/g) || []).length === 1 && /data-id="C77777777" onclick="lnAbrir\(this\.dataset\.id\)"/.test(html));

  // Agregar
  como('Empleado', ['dash', 'listanegra']);
  const llenar = o => { ['ln_ced', 'ln_nom', 'ln_tel', 'ln_mot', 'ln_com'].forEach(k => { els[k] = Object.assign(elemento(), { value: o[k] || '' }); }); };
  llenar({ ln_ced: 'v-12.345.678', ln_nom: 'josé pérez  gómez', ln_tel: '0412-5556677', ln_mot: 'Mala paga', ln_com: 'No pagó la moto anterior' });
  B.escritos.length = 0; ctx.lnGuardar(''); await vueltas();
  const nuevo = B.datos.listaNegra.C12345678;
  ok('agregar guarda a la persona con su motivo y deja las dos marcas (cédula y teléfono)', !!nuevo && nuevo.nombre === 'JOSE PEREZ GOMEZ' && nuevo.motivo === 'Mala paga' && nuevo.cedulaKey === 'C12345678' && nuevo.telKey === 'T4125556677' && nuevo.creadoPor === 'Empleado de prueba'
    && !!B.datos.listaNegraIndice['M-C12345678'] && !!B.datos.listaNegraIndice['M-T4125556677']);
  avisosToast.length = 0; ctx.lnGuardar(''); await vueltas();
  ok('la misma cédula no se anota dos veces', avisosToast.some(t => /ya está en la lista/.test(t)));
  llenar({ ln_ced: '123', ln_nom: 'X' }); avisosToast.length = 0; ctx.lnGuardar(''); await vueltas();
  ok('sin cédula completa no guarda', avisosToast.some(t => /cédula completa/.test(t)));
  avisosToast.length = 0; ctx.lnAbrir('C77777777'); ctx.lnEliminar('C77777777'); await vueltas();
  ok('quien no es administrador no modifica ni elimina', avisosToast.filter(t => /Solo un administrador/.test(t)).length === 2 && !!B.datos.listaNegra.C77777777);

  // Modificar y eliminar (administrador)
  como('Administrador', []);
  B.datos.listaNegra.C11112222 = { cedula: 'V-11112222', cedulaKey: 'C11112222', nombre: 'COMPARTE TELEFONO', telefono: '0414-7777777', telKey: 'T4147777777', motivo: 'Otro' };
  B.datos.listaNegraIndice['M-C11112222'] = {};
  vm.runInContext('_ln.suscrito = false;', ctx); ctx.PG.listanegra();
  llenar({ ln_nom: 'PERSONA SIETE', ln_tel: '0424-1112233', ln_mot: 'Fraude', ln_com: 'ACTUALIZADO' });
  ctx.lnGuardar('C77777777'); await vueltas();
  ok('al modificar cambia los datos y la marca del teléfono nuevo; la del viejo se queda porque otro la usa', B.datos.listaNegra.C77777777.motivo === 'Fraude' && B.datos.listaNegra.C77777777.telKey === 'T4241112233' && !!B.datos.listaNegraIndice['M-T4241112233'] && !!B.datos.listaNegraIndice['M-T4147777777'] && B.datos.listaNegra.C77777777.cedulaKey === 'C77777777');
  vm.runInContext('_ln.suscrito = false;', ctx); ctx.PG.listanegra();
  llenar({ ln_nom: 'PERSONA SIETE', ln_tel: '0426-9998877', ln_mot: 'Fraude', ln_com: '' });
  ctx.lnGuardar('C77777777'); await vueltas();
  ok('...y cuando el teléfono viejo no lo usa nadie más, su marca sí se quita', !B.datos.listaNegraIndice['M-T4241112233'] && !!B.datos.listaNegraIndice['M-T4269998877']);
  vm.runInContext('_ln.suscrito = false;', ctx); ctx.PG.listanegra();
  ctx.lnEliminar('C77777777'); await vueltas();
  ok('al eliminar se van el registro y sus marcas, y el sistema deja de frenar', !B.datos.listaNegra.C77777777 && !B.datos.listaNegraIndice['M-C77777777'] && !B.datos.listaNegraIndice['M-T4269998877']);

  // Buscar
  como('Empleado', ['dash', 'listanegra']);
  B.datos.malapagas = { '88888888': { nombre: 'PERSONA OCHO', ciudad: 'CARACAS', montoAdeudado: 500, moneda: 'USD', fechaReporte: '2026-05-01T00:00:00.000Z' } };
  S.clientes = [{ id: 'K8', nombre: 'PERSONA OCHO', cedula: 'V-88888888' }]; S.creds = [{ id: 'M-80', clienteId: 'K8', estado: 'mora', mora: 12 }];
  vm.runInContext("_ln.tab = 'buscar'; _ln.suscrito = false;", ctx); ctx.PG.listanegra();
  els['ln-q'] = Object.assign(elemento(), { value: 'V-88.888.888' });
  await ctx.lnBuscar(); await vueltas();
  html = vm.runInContext('_lnResultadoHtml()', ctx);
  ok('el buscador dice en qué listas aparece la cédula y de dónde sale cada dato', /aparece en 2 listas/.test(html) && /PAGASI 18 · CRED-100 · 64 días de atraso/.test(html) && /malapagas\.com/.test(html) && /debe USD 500/.test(html) && /reporte de terceros/.test(html) && /Anotarla en la lista negra/.test(html));
  els['ln-q'].value = 'V-10203040'; await ctx.lnBuscar(); await vueltas();
  ok('...y cuando no está en ninguna, lo dice', /no aparece en ninguna lista/.test(vm.runInContext('_lnResultadoHtml()', ctx)));
  els['ln-q'].value = '12'; await ctx.lnBuscar();
  ok('...con una cédula incompleta no busca', /Escribe una cédula completa/.test(vm.runInContext('_lnResultadoHtml()', ctx)));

  // Frenados
  B.datos.listaNegraAvisos = { A1: { fecha: '2026-11-26T15:00:00.000Z', uid: 'U-V', usuario: 'VENDEDOR UNO', estado: 'pendiente', nombre: 'CLIENTE X', cedula: 'V-88888888', coincidencias: [{ clave: 'C88888888', papel: 'cliente', fuentes: ['auto'] }] } };
  vm.runInContext("_ln.tab = 'frenados'; _ln.suscrito = false;", ctx);
  html = ctx.PG.listanegra();
  ok('Verificación ve a quién frenó el sistema y por qué', /VENDEDOR UNO quiso cargar a CLIENTE X/.test(html) && /PERSONA OCHO/.test(html) && /1 por revisar/.test(html) && /Autorizar 7 días/.test(html));
  ok('los botones no llevan el id escrito dentro del código: va en un dato aparte', /data-id="A1" onclick="lnResolver\(this\.dataset\.id, true\)"/.test(html) && !/lnResolver\('/.test(html));
  B.datos.listaNegraAvisos["x');window.PWN=1;//"] = { fecha: '2026-11-26T16:00:00.000Z', uid: 'U-M', usuario: '<img src=x onerror=alert(1)>', estado: 'pendiente', nombre: 'Y', coincidencias: [{ clave: 12345, papel: null }, 'basura', null] };
  vm.runInContext('_ln.suscrito = false;', ctx); html = ctx.PG.listanegra();
  ok('un aviso armado con mala intención no corre código ni rompe la pestaña', !/onclick="[^"]*PWN/.test(html) && /data-id="x&#39;\);window\.PWN=1;\/\/"/.test(html) && !/<img src=x/.test(html) && /VENDEDOR UNO quiso cargar/.test(html));
  ctx.lnResolver("x');window.PWN=1;//", true); await vueltas();
  ok('...y al autorizarlo no se crea ningún visto bueno con claves inventadas', Object.keys(B.datos.listaNegraPases || {}).every(k => /^[CT][0-9]{6,10}$/.test(k)));
  ctx.lnResolver('A1', true); await vueltas();
  ok('...al autorizar queda el visto bueno y el aviso resuelto', !!B.datos.listaNegraPases.C88888888 && B.datos.listaNegraAvisos.A1.estado === 'autorizado' && B.datos.listaNegraAvisos.A1.resueltoPor === 'Empleado de prueba');

  // ════════ 6. Dónde engancha y las Reglas ════════
  const cli = src('logic/clientes.js'), cre = src('logic/creditos.js');
  const fCli = cli.slice(cli.indexOf('function _cliGuardar(){'), cli.indexOf('function _cliGuardar(){') + 2200);
  ok('Nuevo Cliente pasa por la puerta ANTES de guardar', fCli.indexOf('lnPuerta(') > 0 && fCli.indexOf('lnPuerta(') < fCli.indexOf('nextClienteIdAsync()') && /origen:'cliente'/.test(fCli) && /yaGuardadas: _lnFicha \? lnClavesDeFicha\(_lnFicha\) : null/.test(fCli));
  const fWz = cre.slice(cre.indexOf('function _wzGuardar(){'), cre.indexOf('function _wzGuardar(){') + 3200);
  ok('Nueva Solicitud pasa por la puerta lo primero, antes de guardar nada (ni la moto nueva del catálogo)', fWz.indexOf('lnPuerta(') > 0 && fWz.indexOf('lnPuerta(') < fWz.indexOf("btn.textContent='Guardando...'") && /origen:'solicitud'/.test(fWz));
  ok('al EDITAR un crédito, lo «ya guardado» sale de ESE crédito y de su cliente original', /yaGuardadas: _lnCredEd \? lnClavesDeCredito\(_lnCredEd, _lnCliEd\) : null/.test(fWz) && /var _lnCredEd = _lnEd \? /.test(fWz) && !/_lnFichaWz/.test(cre));
  ok('...y si cierran la ventana o ya es otro crédito, no se guarda', /vigente: function\(\)\{[^}]*wz-overlay[^}]*\(window\._wzEditando \|\| null\) === _lnEd; \}/.test(fWz));
  ok('la solicitud revisa el fiador que de verdad va al crédito (con «Sin fiador» no guarda ninguno)', /fiador_ci:_wzFiadorDato\('fiador_ci'\)/.test(fWz) && /fiador_ci: _wzFiadorDato\('fiador_ci'\)/.test(cre));
  ok('la ficha de cliente revisa SIEMPRE la cédula del fiador, porque la guarda aunque diga «Sin fiador»', /fiador_ci:WZ\.fiador_ci, r1ci:WZ\.r1ci/.test(fCli) && /fiador_ci: WZ\.fiador_ci\|\|''/.test(cli) && !/fiador_tiene\|\|''\)==='no' \? '' : WZ\.fiador_ci/.test(cli + cre));
  ok('...y si cancelan mientras se consulta, la ficha no se guarda', /vigente: function\(\)\{[^}]*wz-overlay[^}]*clienteEditId[^}]*\}/.test(fCli));
  // Con el crédito y la ficha de mentira: qué se revisa de verdad al editar
  const credViejo = { id: 'M-50', clienteId: 'K1', cli: 'UNO', fiador_ci: '', r1ci: '', r1t: '0414-3333333', r2ci: '', r2t: '' };
  const fichaHoy = { id: 'K1', nombre: 'UNO', cedula: 'V-11111111', fiador_ci: 'V-22222222', ref1: { tel: '0412-9999999' }, ref2: {} };
  const yaCred = ctx.lnClavesDeCredito(credViejo, fichaHoy);
  B = baseFalsa({ listaNegraIndice: { 'M-C22222222': {}, 'M-C88888888': {}, 'M-T4143333333': {} } }); ctx.db = B; limpiar(); let pasa = 0;
  let rr = ctx.lnPuerta({ ci: 'V-11111111', fiador_ci: '', r1t: '0414-3333333', yaGuardadas: yaCred }, () => { pasa++; });
  ok('editar un crédito sin cambiarle nada no frena, aunque su referencia esté hoy en la lista', rr === true && B.lecturas === 0);
  ctx.lnPuerta({ ci: 'V-11111111', fiador_ci: 'V-22222222', r1t: '0414-3333333', yaGuardadas: yaCred }, () => { pasa++; }); await vueltas();
  ok('ponerle al crédito el fiador de la ficha (que el crédito no tenía) SÍ se revisa y frena', pasa === 0 && ventanas.length === 1);
  limpiar();
  ctx.lnPuerta({ ci: 'V-88888888', fiador_ci: '', r1t: '0414-3333333', yaGuardadas: yaCred }, () => { pasa++; }); await vueltas();
  ok('cambiarle el cliente por uno de la lista también frena', pasa === 0 && ventanas.length === 1);
  const apr = src('logic/aprobaciones.js');
  const fApr = apr.slice(apr.indexOf('function _aprAprobarConfirm('), apr.indexOf('function _aprAprobarConfirm(') + 3600);
  ok('al APROBAR una solicitud se vuelve a revisar, antes de activarla', fApr.indexOf('lnPuerta(') > 0 && fApr.indexOf('lnPuerta(') < fApr.indexOf("c.estado = 'activo';") && /origen:'aprobación'/.test(fApr) && /function\(\)\{ _aprAprobarConfirm\(credId\); \}/.test(fApr));
  const reglas = src('firestore.rules');
  const bloque = n => { const i = reglas.indexOf('match /' + n + '/{'); return i < 0 ? '' : reglas.slice(i, reglas.indexOf('\n    }\n', i)); };
  ok('Reglas: la lista la lee y la llena quien tiene el permiso; modificar y eliminar, solo un administrador',
    /function veListaNegra\(\) \{ return esInterno\(\) && \(esAdmin\(\) \|\| permiso\('listanegra'\)\); \}/.test(reglas) && /allow read: if veListaNegra\(\);/.test(bloque('listaNegra')) && /allow create: if veListaNegra\(\)/.test(bloque('listaNegra')) && /allow update: if esAdmin\(\)/.test(bloque('listaNegra')) && /allow delete: if esAdmin\(\);/.test(bloque('listaNegra')));
  ok('Reglas: el vendedor solo pregunta por una marca; no puede listar ni leer la lista', /allow get: if esStaff\(\);/.test(bloque('listaNegraIndice')) && /allow list: if false;/.test(bloque('listaNegraIndice')) && !/esStaff\(\)/.test(bloque('listaNegra')));
  ok('Reglas: lo automático y malapagas no se escriben desde el navegador', /allow write: if false;/.test(bloque('listaNegraAuto')) && /allow list, write: if false;/.test(bloque('malapagas')));
  ok('Reglas: quien fue frenado anota su aviso con su propio uid y no lo puede leer', /request\.resource\.data\.uid == request\.auth\.uid/.test(bloque('listaNegraAvisos')) && /allow read: if veListaNegra\(\);/.test(bloque('listaNegraAvisos')));

  console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
