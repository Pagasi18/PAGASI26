// Revision del 27-sep-2026 de la solicitud que llena el cliente en la web (lo que se comparte
// con PAGASI 26). Cada bloque es un hallazgo de los revisores:
//  1. La misma cedula con dos fichas (la vieja numerica y el lead WEB-): salir del campo de la
//     cedula ya no cambia el lead web elegido por la ficha vieja.
//  2. El fiador cuenta y se guarda como "si" solo con nombre Y telefono; si falta, se pregunta.
//  3. "Editar cliente" marca los chips de dependientes, historial y deudas del lead.
//  4. Lo no contestado sale vacio: uso de la moto, tiempo en la direccion, Cashea y fiador.
//  5. La cifra de ingreso que confirma el empleado queda como exacta.
//  6. Un lead web abierto no pasa a "activo" por tener el mismo nombre que otro cliente.
//  7. La fecha de alta de un lead web es la del servidor (web_ts), no la del telefono.
//  8. Cashea: un "no debo" explicito gana al monto viejo.
//  9. El prefijo 0422 (Digitel) vale en Mi cuenta.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
process.on('unhandledRejection', e => { fail++; console.log('FALLA promesa rechazada: ' + (e && e.message)); });
function elemento(v){ return Object.assign({ innerHTML:'', textContent:'', value:'', className:'', style:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], appendChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, focus(){ this._foco = true; }, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }, v || {}); }
const form = {};
const base = () => { Object.keys(form).forEach(k => delete form[k]); ['mic','mtt','msb','modal-box','mbd','mft','ov','wz-overlay'].forEach(id => form[id] = elemento()); };
base();
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const avisos = [], preguntas = [];
let respuesta = true;
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;}, document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'}, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}}, fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';}, confirm(m){ preguntas.push(String(m)); return respuesta; }, open(){ return {document:{write(){},close(){}}}; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};}; ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){}; ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};}; ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = m => avisos.push(String(m)); ctx.nav = function(){}; ctx.closeM = function(){}; ctx.setMicon = function(){};
ctx._puedeVender = () => true;
const guardados = [], creditos = [];
ctx.DB.saveCliente = o => { guardados.push(JSON.parse(JSON.stringify(o))); return Promise.resolve(); };
ctx.DB.crearCred = o => { creditos.push(JSON.parse(JSON.stringify(o))); return Promise.resolve(); };
const S = ctx.S;
const WZ = () => ctx.WZ;
const html = () => form['wz-overlay'].innerHTML;
const espera = () => new Promise(r => setTimeout(r, 30));

// El cliente de antes (copiado de la 18) que vuelve y llena la web: dos fichas, misma cédula
const VIEJA = { id:'312', nombre:'JOSE RAMON PEREZ', cedula:'V-14567890', tel:'0414-0000000', trabajo:'informal', ingreso:150, vivienda:'familiar', estado:'solvente', creado:'2025-03-01T00:00:00Z' };
const LEAD = { id:'WEB-14567890', nombre:'José Ramón Pérez', cedula:'V-14567890', tel:'0414-1234567', wa:'0414-1234567', trabajo:'delivery',
  ingreso:225, ingreso_rango:'$150 a $300', estado_ubi:'Miranda', estado:'lead', origen:'web', creado:'2099-12-31T23:59:59.999Z',
  web_ts:{ seconds: Date.UTC(2026, 8, 27, 14, 0, 0) / 1000, nanoseconds:0 }, web_uid:'anon-1', web_paso:8,
  uso_moto:'delivery', email:'jose@example.com', historial:'bueno', deudas:'graves', dependientes:3,
  fiador_nom:'Carmen Ruiz', fiador_rel:'familiar' };   // el fiador que dejó a medias: sin teléfono ni fiador:'si'
function reiniciar(clientes){
  base(); avisos.length = 0; preguntas.length = 0; respuesta = true; guardados.length = 0; creditos.length = 0;
  S.creds = []; S.motos = [];
  S.clientes = (clientes || [VIEJA, LEAD]).map(c => JSON.parse(JSON.stringify(c)));
  S.currentUser = { uid:'u-liz', nombre:'Liz', rol:'Administrador', permisos:[] };
  ctx.window._wzEditando = null;
  ctx.openAddCred();
}
function paso(n){ vm.runInContext('WZ.step='+n+';', ctx); ctx._wzRender(); return html(); }

(async () => {
  // ══ 1. Dos fichas con la misma cédula ══
  reiniciar();
  ctx._wzCliPick('WEB-14567890');
  ctx._wzCedulaFicha({ value:'V-14567890' });
  ok('con el lead web ya elegido, salir del campo de la cédula no pregunta nada', preguntas.length === 0 && WZ().clienteSel === 'WEB-14567890' && WZ().ing === 225);
  reiniciar();
  ctx._wzCedulaFicha({ value:'14567890' });
  ok('sin nada elegido, ofrece el lead web abierto (no la ficha vieja) y dice cuál', preguntas.length === 1 && /José Ramón Pérez, WEB-14567890, solicitud web/.test(preguntas[0]) && /tiene 2 fichas con esta cédula/.test(preguntas[0]));
  ok('...y al aceptar carga el lead web con lo que escribió el cliente', WZ().clienteSel === 'WEB-14567890' && WZ().email === 'jose@example.com' && WZ().uso === 'delivery');
  reiniciar([VIEJA, Object.assign({}, LEAD, { web_cerrado:true })]);
  ctx._wzCliPick('312');
  ctx._wzCedulaFicha({ value:'V-14567890' });
  ok('con la ficha vieja elegida tampoco pregunta (ya es de esa cédula)', preguntas.length === 0 && WZ().clienteSel === '312');

  // ══ 2. Fiador con nombre y sin teléfono ══
  reiniciar();
  ctx._wzCliPick('WEB-14567890');
  ok('el fiador a medias se abre en "Tiene fiador" con su nombre', WZ().fiador_tiene === 'si' && WZ().fiador_nom === 'Carmen Ruiz' && WZ().fiador_tel === '');
  vm.runInContext('WZ.step=2;', ctx); ctx._wzScore();
  ok('...pero sin teléfono no suma en el score', WZ().scoreInput.fiador === false);
  const conTel = (() => { vm.runInContext("WZ.fiador_tel='0412-7654321';", ctx); ctx._wzScore(); const f = WZ().scoreInput.fiador; vm.runInContext("WZ.fiador_tel='';", ctx); return f; })();
  ok('...con el teléfono sí', conTel === true);
  // Siguiente en el paso 2: se pregunta una vez
  form['wz_ing'] = elemento({ value:'300' }); form['wz_fiador_tel'] = elemento();
  vm.runInContext("WZ._chip_wz_emp_g='delivery';", ctx);
  respuesta = false; preguntas.length = 0;
  ok('"Siguiente" sin el teléfono del fiador pregunta y, si dice que no, se queda en el teléfono', ctx._wzValidar() === false && /Falta el teléfono del fiador \(Carmen Ruiz\)/.test(preguntas[0]) && form['wz_fiador_tel']._foco === true);
  respuesta = true; preguntas.length = 0;
  ok('...si dice que sigue, pasa', ctx._wzValidar() !== false && preguntas.length === 1);
  preguntas.length = 0;
  ok('...y no vuelve a preguntar por el mismo fiador', ctx._wzValidar() !== false && preguntas.length === 0);
  ok('sin teléfono, "tiene fiador" se guarda vacío (sin confirmar), no "si"', ctx._wzFiadorValor() === '');
  vm.runInContext("WZ.fiador_tiene='no';", ctx);
  ok('..."no" sigue siendo "no"', ctx._wzFiadorValor() === 'no');
  vm.runInContext("WZ.fiador_tiene='si'; WZ.fiador_nom='Carmen Ruiz'; WZ.fiador_tel='0412-7654321';", ctx);
  ok('...y con nombre y teléfono, "si"', ctx._wzFiadorValor() === 'si');
  ok('la ficha: fiador "si" con nombre y sin teléfono ya no cuenta', ctx.scoreInputDeCliente({ fiador:'si', fiador_nom:'Ana', fiador_tel:'' }, {}).fiador === false);

  // Guardar el crédito con el fiador a medias
  reiniciar();
  ctx._wzCliPick('WEB-14567890');
  vm.runInContext('WZ.step = 4; WZ.precio = 0;', ctx);
  ctx._wzGuardar(); await espera();
  let g = guardados.find(o => o.id === 'WEB-14567890');
  ok('al guardar, la ficha del lead NO queda con fiador "si" sin teléfono', !!g && g.fiador !== 'si' && g.fiador_nom === 'Carmen Ruiz');
  ok('...ni el crédito', creditos.length === 1 && creditos[0].fiador_tiene !== 'si' && creditos[0].clienteId === 'WEB-14567890');
  ok('...y el crédito queda en el lead web, que se cierra', !!g && g.web_cerrado === true);

  // ══ 3. "Editar cliente": los chips del lead se ven marcados ══
  vm.runInContext('WZ = { step:2, totalSteps:2, mode:"cliente" };', ctx);
  const hc = ctx._cliStep2();
  ok('el formulario del cliente tiene los contenedores wz_dep_g, wz_hist_g y wz_deuda_g', ['wz_dep_g','wz_hist_g','wz_deuda_g','wz_emp_g'].every(id => hc.indexOf('id="'+id+'"') > -1));
  // _cliHydrate marca los chips que encuentra
  const marcados = {};
  const ORIG_CHIP = ctx._wzChip;
  ctx._wzChip = function(el, grupo, val){ marcados[grupo] = val; };
  const chipsDe = (grupo, vals) => elemento({ children: vals.map(v => elemento({ getAttribute(k){ return k === 'onclick' ? "_wzChip(this,'"+grupo+"','"+v+"')" : null; } })) });
  base();
  form['wz_dep_g'] = chipsDe('wz_dep_g', ['0','1','2','3']); form['wz_hist_g'] = chipsDe('wz_hist_g', ['ninguno','bueno','mora_leve','malo']); form['wz_deuda_g'] = chipsDe('wz_deuda_g', ['no','menores','graves']);
  vm.runInContext("WZ = { step:2, mode:'cliente', dep:3, hist:'bueno', deuda:'graves' };", ctx);
  ctx._cliHydrate();
  ok('...y al abrirlo quedan marcados dependientes 3, historial "bueno" y deudas "graves"', marcados.wz_dep_g === '3' && marcados.wz_hist_g === 'bueno' && marcados.wz_deuda_g === 'graves');
  vm.runInContext("WZ = { step:2, mode:'cliente', dep:0 };", ctx); delete marcados.wz_dep_g;
  ctx._cliHydrate();
  ok('...dependientes 0 también ("Ninguno" es respuesta)', marcados.wz_dep_g === '0');
  ctx._wzChip = ORIG_CHIP;

  // ══ 4. Lo no contestado sale vacío ══
  const SOLO1 = { id:'WEB-23456789', nombre:'PEDRO GOMEZ', cedula:'V-23456789', tel:'0412-7654321', trabajo:'informal', ingreso:225, ingreso_rango:'$150 a $300', estado:'lead', origen:'web', web_uid:'anon-2', web_paso:1 };
  reiniciar([SOLO1]);
  ctx._wzCliPick('WEB-23456789');
  const h2 = paso(2), h3 = paso(3);
  ok('"Uso de la moto" empieza en "—"', /id="wz_uso"[^>]*>(\s|'|\+)*<option value="">—<\/option>/.test(h3.replace(/\n/g,'')) || /id="wz_uso"[^>]*><option value="">—<\/option>/.test(h3));
  ok('"Tiempo en esta dirección" sin contestar vale "", no "0"', /id="wz_tdir"[^>]*><option value="">Seleccionar\.\.\.<\/option>/.test(h2) && h2.indexOf('<option value="0">Seleccionar') === -1);
  ok('Cashea y fiador sin ningún radio marcado de entrada', !/name="wz_cashea" value="no" checked/.test(h2) && !/name="wz_fiador" value="no" checked/.test(h2));
  ok('...y en el formulario del cliente igual', (() => { vm.runInContext('WZ = { step:2, totalSteps:2, mode:"cliente" };', ctx); const x = ctx._cliStep2(); return !/value="no" checked/.test(x) && /id="wz_tdir"[^>]*><option value="">Seleccionar/.test(x); })());
  reiniciar([SOLO1]); ctx._wzCliPick('WEB-23456789');
  ok('sin datos de Cashea ni del fiador quedan sin marcar (ni "no")', WZ().cashea === '' && WZ().fiador_tiene === '');
  // Uso de la moto: obligatorio en la solicitud nueva ahora que empieza vacío
  base(); form['wz_uso'] = elemento({ value:'' }); form['wz_vendedor'] = elemento({ value:'' });
  vm.runInContext("WZ.step=3; WZ.vendedorNombre='Liz'; WZ.motoModelo='NEW HORSE 150';", ctx); avisos.length = 0;
  ok('paso 3 sin el uso de la moto no deja seguir', ctx._wzValidar() === false && avisos.some(a => /uso de la moto/.test(a)) && form['wz_uso']._foco === true);
  // Guardar sin contestarlos: vacío, no "no" ni "personal" ni "0"
  reiniciar([SOLO1]); ctx._wzCliPick('WEB-23456789');
  vm.runInContext('WZ.step = 4; WZ.precio = 0;', ctx); ctx._wzGuardar(); await espera();
  ok('el crédito no inventa uso "personal", Cashea "no", fiador "no" ni tiempo "0"', creditos.length === 1 && creditos[0].uso_moto === '' && creditos[0].cashea === '' && creditos[0].fiador_tiene === '' && creditos[0].tdir === '');

  // ══ 5. La cifra de ingreso confirmada queda como exacta ══
  reiniciar([SOLO1]); ctx._wzCliPick('WEB-23456789');
  ok('lead con rango: la pista pide confirmar la cifra', /wz_pista_ingreso/.test(paso(2)));
  base(); form['wz_ing'] = elemento({ value:'300' });
  vm.runInContext("WZ.step=2; WZ._chip_wz_emp_g='informal'; WZ.ing=300;", ctx);
  ctx._wzValidar();
  ok('el empleado pone 300 (no el 225 del rango) y pasa: queda como exacta', WZ().ingreso_exacto === true);
  ok('...la pista ya no vuelve a salir en el paso 2', !/wz_pista_ingreso/.test(paso(2)));
  vm.runInContext('WZ.step = 4; WZ.precio = 0;', ctx); ctx._wzGuardar(); await espera();
  g = guardados.find(o => o.id === 'WEB-23456789');
  ok('...y la ficha queda con ingreso 300 e ingreso_exacto (la bandeja muestra la cifra)', !!g && g.ingreso === 300 && g.ingreso_exacto === true && g.ingreso_rango === '$150 a $300');
  ok('...el borrador del crédito también la trae (al editar no sale la pista)', creditos.length === 1 && creditos[0].wizardDraft && creditos[0].wizardDraft.ingreso_exacto === true);
  reiniciar([SOLO1]); ctx._wzCliPick('WEB-23456789');
  vm.runInContext("WZ.ing=225;", ctx);
  ok('si deja el 225 del rango sin tocarlo, no se da por confirmada', ctx._wzIngresoConfirmado() === false);
  ctx._wzIngTocado();
  ok('...pero si lo escribió (aunque sea 225), sí', ctx._wzIngresoConfirmado() === true);
  vm.runInContext("WZ.ingreso_rango=''; WZ._ingTocado=false; WZ.ing=700;", ctx);
  ok('un cliente que no vino de la web no se marca', ctx._wzIngresoConfirmado() === false);

  // ══ 6. El estado del cliente se busca por clienteId ══
  S.clientes = [{ id:'WEB-14567890', nombre:'José Ramón Pérez', origen:'web', estado:'lead' }, { id:'88', nombre:'José Ramón Pérez', estado:'lead' }];
  S.creds = [{ id:'M-001', cli:'José Ramón Pérez', clienteId:'88', estado:'activo' }];
  guardados.length = 0; ctx.syncTodosEstadosClientes();
  ok('un lead web que está llenando no pasa a "activo" por el crédito de OTRO con el mismo nombre', S.clientes[0].estado === 'lead' && !guardados.some(o => o.id === 'WEB-14567890'));
  ok('...el dueño del crédito (por clienteId) sí', S.clientes[1].estado === 'activo');
  S.clientes[1].estado = 'lead'; S.clientes[0].estado = 'lead';
  ctx.syncEstadoClientePorCredito('M-001');
  ok('...igual al sincronizar un solo crédito', S.clientes[0].estado === 'lead' && S.clientes[1].estado === 'activo');
  S.clientes = [{ id:'CLI-5', nombre:'ANA VIEJA', estado:'lead' }, { id:'WEB-11111111', nombre:'ANA VIEJA', origen:'web', estado:'lead' }];
  S.creds = [{ id:'CRED-005', cli:'ANA VIEJA', estado:'activo' }];
  ctx.syncTodosEstadosClientes();
  ok('un crédito viejo sin clienteId sigue yendo por el nombre, pero no toca el lead web abierto', S.clientes[0].estado === 'activo' && S.clientes[1].estado === 'lead');
  S.clientes = [{ id:'CLI-6', nombre:'LUIS', estado:'activo' }];
  S.creds = [{ id:'C-9', cliId:'CLI-6', cli:'OTRO NOMBRE', estado:'completado' }];
  ctx.syncTodosEstadosClientes();
  ok('...y los créditos viejos con cliId se atan por cliId', S.clientes[0].estado === 'solvente');

  // ══ 7. La fecha de alta del lead web es la del servidor ══
  const lw = JSON.parse(JSON.stringify(LEAD));
  ok('con web_ts, "Cliente desde" y el orden usan la hora del servidor, no el 2099 del teléfono', ctx._cliCreado(lw) === '2026-09-27T14:00:00.000Z');
  ok('...también con un Timestamp de Firestore', ctx._cliCreado(Object.assign({}, lw, { web_ts:{ toDate(){ return new Date('2026-09-26T10:00:00Z'); } } })) === '2026-09-26T10:00:00.000Z');
  ok('...sin web_ts (o si no es web) sigue siendo creado', ctx._cliCreado({ creado:'2025-01-01T00:00:00Z' }) === '2025-01-01T00:00:00Z' && ctx._cliCreado({ origen:'panel', creado:'X', web_ts:{ seconds:1 } }) === 'X');
  const cl = src('logic/clientes.js');
  ok('la lista, la ficha y el orden de Clientes usan _cliCreado', /col==='creado'\)\{va=_cliCreado\(a\);vb=_cliCreado\(b\)/.test(cl) && /field\('Cliente desde', _cliCreado\(c\)/.test(cl));

  // ══ 8. Cashea: "no debo" gana al monto viejo ══
  ok('ficha con cashea_deuda "no" y un monto viejo: ya no resta como deuda', ctx.scoreInputDeCliente({ cashea:'si', cashea_deuda:'no', cashea_monto:400 }, {}).cashea_deuda === 'no');
  ok('...sin respuesta y con monto, como antes cuenta como deuda', ctx.scoreInputDeCliente({ cashea:'si', cashea_monto:400 }, {}).cashea_deuda === 'si');

  // ══ 9. 0422 ══
  ok('Mi cuenta y el portal aceptan el 0422 de Digitel', /var PREFIJOS = \['412','414','416','422','424','426'\];/.test(src('micuenta.html')) && ctx._pTelE164('0422-1234567') === '+584221234567');

  console.log('\n' + pass + ' OK · ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
