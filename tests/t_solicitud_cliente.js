// 27-sep-2026, Adam: el cliente llena la solicitud en la web y al empleado le tiene que
// aparecer YA ESCRITA en "Nueva solicitud" cuando le da "Crear solicitud" desde la ficha
// del lead. Decisiones del día: Cashea se recorta (12 datos fuera, en la web y en el
// sistema; los datos viejos NO se borran de la base), "Certificación de ingreso" como forma
// de comprobar el ingreso, lo que no se contestó se ve y se guarda vacío (y no suma puntos),
// el fiador cuenta solo con nombre (y teléfono, revisión), los 24 estados, y al hacer el crédito el formulario
// web de ese cliente se cierra (web_cerrado).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
process.on('unhandledRejection', e => { fail++; console.log('FALLA promesa rechazada: ' + (e && e.message)); });
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', style:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], appendChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }
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
// La 18 ya no vende: el asistente es el mismo que usa la 26, que sí vende
ctx._puedeVender = () => true;
const guardados = [], creditos = [];
ctx.DB.saveCliente = o => { guardados.push(JSON.parse(JSON.stringify(o))); return Promise.resolve(); };
ctx.DB.crearCred = o => { creditos.push(JSON.parse(JSON.stringify(o))); return Promise.resolve(); };
const S = ctx.S;
const cr = src('logic/creditos.js'), cl = src('logic/clientes.js'), scs = src('logic/scores.js');
const WZ = () => ctx.WZ;
const html = () => form['wz-overlay'].innerHTML;

// Un lead que llenó las 9 partes, con los valores EXACTOS del contrato de campos
const LEAD = {
  id:'WEB-12345678', nombre:'MARIA PEREZ', cedula:'V-12345678', tel:'0414-1234567', wa:'0414-1234567',
  trabajo:'delivery', ingreso:400, ingreso_rango:'$300 a $500', ingreso_exacto:true, estado_ubi:'La Guaira',
  moto_interes_id:42, moto_interes_modelo:'EMPIRE HORSE 150', moto_interes_precio:1450, moto_interes_sede:'Bello Monte',
  estado:'lead', origen:'web', creado:'2026-09-27T12:00:00.000Z', editadoEn:'2026-09-27T12:30:00.000Z', editadoPor:'Solicitud web',
  web_uid:'anon-1', web_paso:9, web_n:8,
  uso_moto:'delivery', moto_previa:'no',
  empresa:'Yummy', cargo:'Motorizado', antiguedad:'2', dir_trabajo:'Av. Principal',
  dia_cobro:'semanal', remesas:'no', ingreso_familiar:600, dependientes:0, inicial_rango:'200-400',
  historial:'bueno', deudas:'menores', deuda_mensual:40, banco_estado:'activa', banco_nombre:'Banesco',
  cashea:'si', cashea_nivel:'4', cashea_estado:'al_dia', cashea_deuda:'si', cashea_monto:120, cashea_cuotas_pend:3,
  cashea_linea:600, cashea_compras_activas:2, cashea_prox_monto:45,
  ciudad:'Catia La Mar', dir:'Calle 3, casa 12 · Ref: frente a la panadería', tiempo_dir:'3', vivienda:'familiar',
  ref1:{nom:'JOSE PEREZ', ci:'', tel:'0412-1111111', rel:'Familiar directo', obs:''},
  ref2:{nom:'LUISA DIAZ', ci:'', tel:'0424-2222222', rel:'Vecino/a', obs:''},
  fiador:'si', fiador_nom:'CARLOS PEREZ', fiador_tel:'0416-3333333', fiador_rel:'familiar', fiador_ci:'V-9876543', fiador_dir:'Catia La Mar', fiador_ing:500,
  fecha_nacimiento:'1995-03-05', email:'maria@example.com', rif:'V-12345678-0', conocio:'redes'
};
// Uno que solo llenó la parte 1 y se fue
const CORTO = { id:'WEB-23456789', nombre:'PEDRO GOMEZ', cedula:'V-23456789', tel:'0412-7654321', wa:'0412-7654321',
  trabajo:'informal', ingreso:225, ingreso_rango:'$150 a $300', estado_ubi:'Portuguesa', moto_interes_id:null,
  moto_interes_modelo:'', moto_interes_precio:0, moto_interes_sede:'', estado:'lead', origen:'web', web_uid:'anon-2', web_paso:1 };
function reiniciar(){
  base(); avisos.length = 0; preguntas.length = 0; respuesta = true; guardados.length = 0; creditos.length = 0;
  S.creds = []; S.motos = [];
  S.clientes = [JSON.parse(JSON.stringify(LEAD)), JSON.parse(JSON.stringify(CORTO))];
  S.currentUser = { uid:'u-liz', nombre:'Liz', rol:'Administrador', permisos:[] };
  ctx.window._wzEditando = null;
  ctx.openAddCred();
}
function paso(n){ vm.runInContext('WZ.step='+n+';', ctx); ctx._wzRender(); return html(); }
const selVacio = (h, id) => new RegExp('id="'+id+'"[^>]*><option value="">—</option>').test(h);
const QUITADOS = ['cashea_pago','cashea_ultimo_art','cashea_ultimo_monto','cashea_ultima_fecha','cashea_total_compras','cashea_cupo',
  'cashea_cuotas_tiempo','cashea_total_pagado','cashea_atrasos','cashea_bajo_nivel','cashea_antiguedad','cashea_prox_fecha'];
const QUEDAN = ['wz_cashea_nivel','wz_cashea_estado','wz_cashea_deuda','wz_cashea_monto','wz_cashea_cuotas_pend','wz_cashea_linea',
  'wz_cashea_compras_activas','wz_cashea_prox_monto','wz_cashea_verificado','wz_cashea_obs'];

// ══ A. Cashea: 12 datos fuera, en el asistente, el formulario del cliente y la ficha ══
reiniciar();
let h2 = paso(2);
ok('el asistente ya no pide ninguno de los 12 datos de Cashea', QUITADOS.every(k => h2.indexOf('id="wz_'+k+'"') === -1));
ok('...y sigue pidiendo nivel, estado, deuda (monto y cuotas), línea, compras en curso, próxima cuota, cómo se confirmó y observaciones', QUEDAN.every(id => h2.indexOf('id="'+id+'"') > -1));
vm.runInContext('WZ = { step:2, totalSteps:2, mode:"cliente" };', ctx);
const hc = ctx._cliStep2();
ok('el formulario del cliente tampoco', QUITADOS.every(k => hc.indexOf('id="wz_'+k+'"') === -1) && QUEDAN.every(id => hc.indexOf('id="'+id+'"') > -1));
ok('no queda ni una referencia a esos datos en el asistente, la ficha ni el score', QUITADOS.every(k => cr.indexOf(k) === -1 && cl.indexOf(k) === -1 && scs.indexOf(k) === -1));
// La ficha de un cliente viejo que SÍ tiene esos datos guardados
const VIEJO = { id:'CLI-7', nombre:'VIEJO', cedula:'V-7654321', cashea:'si', cashea_nivel:4, cashea_estado:'al_dia', cashea_pago:'2026-01-01',
  cashea_ultimo_art:'Nevera LG', cashea_ultimo_monto:450, cashea_total_compras:'6+', cashea_cupo:350, cashea_cuotas_tiempo:40, cashea_atrasos:'2+',
  cashea_bajo_nivel:'si', cashea_linea:600, cashea_obs:'Paga puntual', ingreso_comprobante:'certificacion', trabajo:'formal', ingreso:700, tel:'0414' };
S.clientes.push(JSON.parse(JSON.stringify(VIEJO)));
ctx.verCliente('CLI-7');
const ficha = form['mbd'].innerHTML;
ok('la ficha ya no muestra el último pago, el historial de compras ni el cupo', !/Nevera LG/.test(ficha) && !/Último pago/.test(ficha) && !/Historial de compras/.test(ficha) && !/Cupo disponible/.test(ficha) && !/Cuotas pagadas a tiempo/.test(ficha));
ok('...pero sí el nivel, la línea y las observaciones de Cashea', /Nivel 4 — Tronco/.test(ficha) && /Línea de crédito/.test(ficha) && /Paga puntual/.test(ficha));
// El score: lo que queda cuenta igual, lo que se quitó ya no pesa
const conViejos = ctx.recalcularScoreCliente(VIEJO, false);
const limpio = JSON.parse(JSON.stringify(VIEJO)); QUITADOS.forEach(k => delete limpio[k]);
ok('los datos viejos de Cashea ya no mueven el score', conViejos === ctx.recalcularScoreCliente(limpio, false));
const b0 = { ing:700, cuotaQ:60, emp:'formal', ant:'5', hist:'ninguno', deuda:'no', banco:'activa', viv:'familiar', cashea:'si' };
const f1 = x => ctx.calcularScoreConCfg(Object.assign({}, b0, x)).f1;
ok('el nivel de Cashea pesa igual que antes (nivel 5: +15; nivel 1: +3)', f1({cashea_nivel:5}) - f1({cashea_nivel:0}) === 15 && f1({cashea_nivel:1}) - f1({cashea_nivel:0}) === 3);
ok('el estado pesa igual (al día +10, mora grave −35)', f1({cashea_estado:'al_dia'}) - f1({}) === 10 && f1({}) - f1({cashea_estado:'mora_grave'}) === 35);
ok('la deuda y su monto pesan igual (más de $500: −8)', f1({}) - f1({cashea_deuda:'si', cashea_monto:600}) === 8 && f1({}) - f1({cashea_deuda:'si', cashea_monto:300}) === 4);
ok('el total de compras ya no suma', f1({cashea_total_compras:'6+'}) === f1({}));
// Los datos viejos no se borran: el guardado escribe con merge y sin esas claves
ok('la ficha se guarda con merge (lo que no se manda, se queda en la base)', /saveCliente: function\(o\)\{[^\n]*\.set\(clean\(o\), \{merge:true\}\)/.test(src('assets/pagasi-app.js')));
ctx.openAddCliente('CLI-7'); vm.runInContext('WZ.step = 2;', ctx); guardados.length = 0;
ctx._cliGuardar();

// ══ B. Certificación de ingreso ══
const comp = ctx.PERFIL_EXTRA.find(f => f.k === 'ingreso_comprobante');
ok('"Certificación de ingreso" es una opción, con código certificacion', comp.ops.some(o => o[0] === 'certificacion' && o[1] === 'Certificación de ingreso'));
ok('...en el asistente y en el formulario del cliente (el mismo trozo)', /value="certificacion"[^>]*>Certificación de ingreso/.test(ctx._perfilExtraHtml('empleo')) && /_perfilExtraHtml\('empleo'\)/.test(cl) && /_perfilExtraHtml\('empleo'\)/.test(cr));
ok('...y al editar una ficha que la tiene, sale elegida', /value="certificacion" selected>Certificación de ingreso/.test(ctx._perfilExtraHtml('empleo')));
ok('...y la ficha muestra su nombre', ctx._perfilEtiqueta('ingreso_comprobante', 'certificacion') === 'Certificación de ingreso' && /Certificación de ingreso/.test(ficha));

setTimeout(function(){
  const g = guardados.find(o => o.id === 'CLI-7');
  ok('guardar la ficha no manda los 12 datos (así no se pisan los viejos)', !!g && QUITADOS.every(k => !(k in g)));
  ok('...y en memoria la ficha los conserva', QUITADOS.filter(k => k in VIEJO).every(k => k in S.clientes.find(c => c.id === 'CLI-7')));

  // ══ C. Recibir al cliente de la web ══
  reiniciar();
  ctx._wzCliPick('WEB-12345678');
  const w = WZ();
  ok('elegido el lead, sus datos personales quedan escritos', w.nom === 'MARIA PEREZ' && w.ci === 'V-12345678' && w.tel === '0414-1234567' && w.wa === '0414-1234567' && w.email === 'maria@example.com' && w.conocio === 'redes' && w.fecha_nacimiento === '1995-03-05');
  ok('...su trabajo y su plata', w.emp === 'delivery' && w.empresa === 'Yummy' && w.cargo === 'Motorizado' && w.ant === '2' && w.ing === 400 && w.ifam === 600 && w.rem === 'no' && w.dia_cobro === 'semanal');
  ok('...dependientes 0 es respuesta: "Ninguno" queda marcado', w.dep === 0 && w['_chip_wz_dep_g'] === '0');
  ok('...créditos, banco y Cashea', w.hist === 'bueno' && w.deuda === 'menores' && w.deuda_mensual === 40 && w.banco === 'activa' && w.banco_nm === 'Banesco' && w.cashea === 'si' && w.cashea_nivel === '4' && w.cashea_estado === 'al_dia' && w.cashea_deuda === 'si' && w.cashea_monto === 120 && w.cashea_cuotas_pend === 3 && w.cashea_linea === 600 && w.cashea_compras_activas === 2 && w.cashea_prox_monto === 45);
  ok('...dónde vive', w.estado_ubi === 'La Guaira' && w.ciudad_res === 'Catia La Mar' && /Ref: frente a la panadería/.test(w.dir_det) && w.tdir === '3' && w.viv === 'familiar');
  ok('...sus referencias y su fiador', w.r1n === 'JOSE PEREZ' && w.r1r === 'Familiar directo' && w.r2r === 'Vecino/a' && w.fiador_tiene === 'si' && w.fiador_nom === 'CARLOS PEREZ' && w.fiador_rel === 'familiar' && w.fiador_ci === 'V-9876543' && w.fiador_dir === 'Catia La Mar' && w.fiador_ing === 500);
  ok('...y el uso de la moto precarga "Uso de la moto"', w.uso === 'delivery' && w.wz_uso === 'delivery');
  ok('...y la moto que eligió NO se elige sola (la moto doble del 22-sep)', !w.motoModelo && !w.motoInvId);
  // Ya escrito en la pantalla: el asistente pinta cada campo con lo del cliente
  h2 = paso(2);
  const ids = ['wz_estado','wz_ciudad_res','wz_dir_det','wz_tdir','wz_viv','wz_empresa','wz_cargo','wz_ing','wz_ant','wz_rem','wz_ifam','wz_banco','wz_banco_nm',
    'wz_cashea_nivel','wz_cashea_estado','wz_cashea_deuda','wz_cashea_monto','wz_cashea_cuotas_pend','wz_cashea_linea','wz_cashea_compras_activas','wz_cashea_prox_monto',
    'wz_r1n','wz_r1t','wz_r1r','wz_r2n','wz_r2r','wz_fiador_nom','wz_fiador_tel','wz_fiador_ci','wz_fiador_rel','wz_fiador_dir','wz_fiador_ing','wz_dia_cobro','wz_deuda_mensual','wz_moto_previa'];
  ids.forEach(id => form[id] = elemento());
  ctx._wzHydrate();
  const esperado = { wz_estado:'La Guaira', wz_ciudad_res:'Catia La Mar', wz_tdir:'3', wz_viv:'familiar', wz_empresa:'Yummy', wz_ing:400, wz_ant:'2', wz_rem:'no', wz_banco:'activa',
    wz_cashea_nivel:'4', wz_cashea_deuda:'si', wz_cashea_linea:600, wz_r1r:'Familiar directo', wz_r2r:'Vecino/a', wz_fiador_rel:'familiar', wz_fiador_ing:500, wz_dia_cobro:'semanal', wz_deuda_mensual:40, wz_moto_previa:'no' };
  const malos = Object.keys(esperado).filter(id => String(form[id].value) !== String(esperado[id]));
  ok('en el paso 2 cada campo aparece ya escrito' + (malos.length ? ' (fallan: ' + malos.join(', ') + ')' : ''), malos.length === 0);
  ok('La Guaira está en la lista de estados del paso 2', /<option>La Guaira<\/option>/.test(h2));
  ok('con la cifra exacta del ingreso, no sale el aviso de confirmarla', h2.indexOf('wz_pista_ingreso') === -1);
  const h3 = paso(3);
  ids.forEach(id => delete form[id]); form['wz_uso'] = elemento(); ctx._wzHydrate();
  ok('paso 3: el uso de la moto viene puesto', form['wz_uso'].value === 'delivery');
  ok('paso 3: "El cliente quiere: <modelo> · <sede>"', /id="wz_pista_moto"[^>]*>El cliente quiere: EMPIRE HORSE 150 · Bello Monte</.test(h3));
  ok('paso 3: debajo de la inicial, "El cliente dice que tiene: …"', /id="wz_ini_real"[^>]*>[\s\S]{0,40}id="wz_pista_inicial"[^>]*>El cliente dice que tiene: entre \$200 y \$400</.test(h3));
  ok('las pistas no llenan nada: la inicial y la moto siguen vacías', !WZ().ini && !WZ().motoModelo && !WZ()['wz_ini_real']);

  // El que solo hizo la parte 1: aviso del ingreso y nada inventado
  reiniciar();
  ctx._wzCliPick('WEB-23456789');
  const c = WZ();
  ok('sin datos, dependientes, historial y deudas quedan sin marcar', c.dep === '' && c['_chip_wz_dep_g'] === '' && c.hist === '' && c['_chip_wz_hist_g'] === '' && c.deuda === '' && c['_chip_wz_deuda_g'] === '');
  ok('...y vivienda, remesas, banco, ahorro, deuda con Cashea y relaciones vacías', ['viv','rem','banco','ahorro','cashea_deuda','r1r','r2r','fiador_rel','uso'].every(k => c[k] === ''));
  h2 = paso(2);
  ok('paso 2, junto al ingreso: "Marcó $150 a $300: confirma la cifra"', /id="wz_ing"[^>]*>[\s\S]{0,20}id="wz_pista_ingreso"[^>]*>Marcó \$150 a \$300: confirma la cifra</.test(h2));
  const listas = ['wz_viv','wz_rem','wz_banco','wz_ahorro','wz_r1r','wz_r2r','wz_fiador_rel','wz_cashea_deuda'];
  const sinVacio = listas.filter(id => !selVacio(h2, id));
  ok('las listas que no la tenían traen "—" primero' + (sinVacio.length ? ' (faltan: ' + sinVacio.join(', ') + ')' : ''), sinVacio.length === 0);
  ok('...también en el formulario del cliente', listas.every(id => selVacio(ctx._cliStep2(), id)));
  const h3c = paso(3);
  ok('sin moto ni inicial en la web, no hay pistas vacías', h3c.indexOf('wz_pista_moto') === -1 && h3c.indexOf('wz_pista_inicial') === -1);

  // Lo que viene de la web se limpia antes de pintarlo
  S.clientes[1].moto_interes_modelo = '<img src=x onerror=alert(1)>'; S.clientes[1].ingreso_rango = '<b>';
  ctx._wzCliPick('WEB-23456789');
  ok('las pistas escapan lo que escribió el cliente', paso(3).indexOf('<img src=x') === -1 && /&lt;img src=x/.test(html()) && paso(2).indexOf('Marcó <b>') === -1);

  // ── Fiador con nombre y sin teléfono ──
  // La web no marca fiador 'si' sin nombre y teléfono, pero sí guarda el nombre que escribió.
  reiniciar();
  Object.assign(S.clientes[1], { fiador_nom:'ANA GOMEZ', fiador_rel:'amigo' });
  ctx._wzCliPick('WEB-23456789');
  ok('el fiador que dejó a medias se ve: "Sí" con su nombre y su relación', WZ().fiador_tiene === 'si' && WZ().fiador_nom === 'ANA GOMEZ' && WZ().fiador_rel === 'amigo');
  ctx.openAddCliente('WEB-23456789');
  ok('...también en el formulario del cliente', WZ().fiador_tiene === 'si' && WZ().fiador_nom === 'ANA GOMEZ');
  reiniciar(); Object.assign(S.clientes[1], { fiador:'no', fiador_nom:'ANA GOMEZ' }); ctx._wzCliPick('WEB-23456789');
  ok('...pero si después contestó "No tengo", gana el "No"', WZ().fiador_tiene === 'no');
  reiniciar(); ctx._wzCliPick('WEB-23456789');
  // Revision del 27-sep-2026: sin nada del fiador queda SIN MARCAR ("no contestó" no es "no tiene")
  ok('...y sin nada del fiador queda sin marcar', WZ().fiador_tiene === '');

  // ── El vacío es "sin dato" en el score ──
  reiniciar(); ctx._wzCliPick('WEB-23456789'); vm.runInContext('WZ.step=2;', ctx); ctx._wzScore();
  const si = WZ().scoreInput;
  ok('lo no contestado va vacío a la fórmula (no "propia", "activa" ni "sin deudas")', si.viv === '' && si.banco === '' && si.deuda === '' && si.hist === '' && si.ant === '');
  const bs = { ing:500, cuotaQ:60, emp:'formal', ant:'3', hist:'ninguno', deuda:'menores', dep:0, banco:'poca', viv:'alquilada' };
  const sc = x => ctx.calcularScoreConCfg(Object.assign({}, bs, x));
  ok('banco vacío: ni el +10 de "activa" ni el −10 de "sin cuenta"', sc({banco:''}).f1 === sc({banco:'poca'}).f1 && sc({banco:'activa'}).f1 === sc({banco:''}).f1 + 10 && sc({banco:''}).f4 === sc({banco:'poca'}).f4);
  ok('deudas vacías: sin el +10 de "sin deudas"', sc({deuda:''}).f5 + 10 === sc({deuda:'no'}).f5 && sc({deuda:''}).f1 === sc({deuda:'no'}).f1);
  ok('antigüedad vacía: la base (0), no "1 a 3 años" (+22)', sc({ant:''}).f3 === sc({ant:'1'}).f3 && sc({ant:''}).f3 + 22 === sc({ant:'3'}).f3);
  ok('vivienda vacía: como "familiar", la de siempre', sc({viv:''}).f2 === sc({viv:'familiar'}).f2 && sc({viv:''}).f4 === sc({viv:'familiar'}).f4);
  ok('historial vacío: "sin historial" (50), la base de siempre', sc({hist:''}).f1 === sc({hist:'ninguno'}).f1);
  const todoBien = sc({banco:'activa', deuda:'no', ant:'5', viv:'propia', hist:'bueno'}).score, saltado = sc({banco:'', deuda:'', ant:'', viv:'', hist:''}).score;
  ok('saltarse las preguntas ya no da más puntos que contestarlas bien', saltado < todoBien);
  ok('la ficha también: banco y deudas que no tiene no suman', ctx.scoreInputDeCliente({ nombre:'X' }, {}).banco === '' && ctx.scoreInputDeCliente({ nombre:'X' }, {}).deuda === '');

  // ── El fiador cuenta solo con nombre y teléfono (revision del 27-sep-2026) ──
  reiniciar(); vm.runInContext("WZ.step=2; WZ.fiador_tiene='si'; WZ.fiador_nom=''; WZ.fiador_tel='0412-5550000';", ctx); ctx._wzScore();
  const sinNombre = WZ().scoreInput.fiador;
  vm.runInContext("WZ.fiador_nom='CARLOS'; WZ.fiador_tel='';", ctx); ctx._wzScore();
  const sinTel = WZ().scoreInput.fiador;
  vm.runInContext("WZ.fiador_tel='0412-5550000';", ctx); ctx._wzScore();
  ok('marcar "Tiene fiador" sin su nombre o sin su teléfono ya no suma; con los dos sí', sinNombre === false && sinTel === false && WZ().scoreInput.fiador === true);
  ok('en la ficha igual; las fichas viejas sin esos campos siguen contando', ctx.scoreInputDeCliente({ fiador:'si', fiador_nom:'' }, {}).fiador === false
    && ctx.scoreInputDeCliente({ fiador:'si', fiador_nom:'Ana', fiador_tel:'' }, {}).fiador === false
    && ctx.scoreInputDeCliente({ fiador:'si', fiador_nom:'Ana', fiador_tel:'0412-5550000' }, {}).fiador === true
    && ctx.scoreInputDeCliente({ fiador:'si', fiador_nom:'Ana' }, {}).fiador === true && ctx.scoreInputDeCliente({ fiador:'si' }, {}).fiador === true);

  // ── Cédula escrita a mano ──
  reiniciar();
  let h1 = html();
  ok('paso 1: la cédula busca la ficha al salir del campo', /id="wz_ci"[^>]*onblur="_wzCedulaFicha\(this\)"/.test(h1));
  ctx._wzCedulaFicha({ value:'V-12.345.678' });
  ok('ofrece "Esta cédula ya tiene ficha (MARIA PEREZ, WEB-12345678, solicitud web). ¿Cargar sus datos?"', preguntas[0] === 'Esta cédula ya tiene ficha (MARIA PEREZ, WEB-12345678, solicitud web). ¿Cargar sus datos?');
  ok('...y al aceptar carga la ficha (como el buscador)', WZ().clienteSel === 'WEB-12345678' && WZ().nom === 'MARIA PEREZ' && WZ().uso === 'delivery');
  preguntas.length = 0; ctx._wzCedulaFicha({ value:'V-12345678' });
  ok('si ya está elegida, no vuelve a preguntar', preguntas.length === 0);
  reiniciar(); respuesta = false;
  ctx._wzCedulaFicha({ value:'12345678' }); ctx._wzCedulaFicha({ value:'12345678' });
  ok('si dice que no, no carga nada ni insiste', preguntas.length === 1 && !WZ().clienteSel && !WZ().nom);
  reiniciar(); ctx._wzCedulaFicha({ value:'V-99999999' });
  ok('una cédula sin ficha no pregunta nada', preguntas.length === 0);
  reiniciar(); ctx.window._wzEditando = 'M-001'; ctx._wzCedulaFicha({ value:'V-12345678' }); ctx.window._wzEditando = null;
  ok('editando un crédito tampoco (su cliente ya está amarrado)', preguntas.length === 0);

  // ── Deseleccionar limpia todo ──
  reiniciar(); ctx._wzCliPick('WEB-12345678');
  vm.runInContext("WZ.r1ci='V-1'; WZ.wz_r1ci='V-1'; WZ.r2ci='V-2'; WZ.wz_r2ci='V-2';", ctx);
  ctx._wzCliClear();
  const d = WZ();
  ok('al quitar el cliente no quedan cédulas de referencias, dirección ni ingreso del fiador', ['r1ci','r2ci','fiador_dir','fiador_ing','wz_r1ci','wz_r2ci','wz_fiador_dir','wz_fiador_ing'].every(k => d[k] === ''));
  ok('...ni el uso de la moto ni lo que contó en la web', ['uso','wz_uso','moto_interes_modelo','moto_interes_sede','inicial_rango','ingreso_rango'].every(k => d[k] === '') && !d.ingreso_exacto);
  ok('...ni los datos de Cashea que quedan', ['cashea_linea','cashea_compras_activas','cashea_prox_monto','cashea_verificado','cashea_obs'].every(k => d[k] === ''));

  // ── Los 24 estados ──
  const CONTRATO = ['Caracas (D.C.)','Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes','Delta Amacuro','Falcón','Guárico','La Guaira','Lara','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa','Sucre','Táchira','Trujillo','Yaracuy','Zulia'];
  ok('la lista tiene los 24 estados con el mismo texto que la web', ctx.ESTADOS_VE.length === 24 && CONTRATO.every(e => ctx.ESTADOS_VE.indexOf(e) > -1));
  const op = ctx._estadosOpts('');
  ok('"Otro" queda al final, después de los 24', /<option>Zulia<\/option>[\s\S]*<option>Amazonas<\/option><option>Otro<\/option>$/.test(op));
  ok('el asistente y el formulario del cliente usan la misma lista', /_sel\('wz_estado',_estadosOpts\(\)\)/.test(cr) && /_sel\('wz_estado',_estadosOpts\(\)\)/.test(cl));
  ok('un estado viejo que no está en la lista se conserva como opción', /<option>Distrito Capital<\/option><option>Otro<\/option>/.test(ctx._estadosOpts('Distrito Capital')));

  // ── Al guardar el crédito, el formulario web se cierra ──
  reiniciar(); ctx._wzCliPick('WEB-12345678'); vm.runInContext('WZ.step = 4; WZ.precio = 0;', ctx);
  ctx._wzGuardar();
  setTimeout(function(){
    const f = guardados.find(o => o.id === 'WEB-12345678');
    ok('la ficha del lead queda con web_cerrado, quién y cuándo', !!f && f.web_cerrado === true && f.web_cerrado_por === 'Liz' && /^\d{4}-\d{2}-\d{2}T/.test(f.web_cerrado_en || ''));
    ok('...sin pisar el RIF ni el correo que puso el cliente', !!f && f.rif === 'V-12345678-0' && f.email === 'maria@example.com');
    ok('el crédito nuevo no lleva los 12 datos de Cashea', creditos.length === 1 && QUITADOS.every(k => !(k in creditos[0])) && creditos[0].cashea_linea === 600);
    ok('...y guarda el uso que dijo el cliente', creditos.length === 1 && creditos[0].uso_moto === 'delivery');
    // Una ficha que no vino de la web no se marca
    reiniciar(); guardados.length = 0; S.clientes.push(JSON.parse(JSON.stringify(VIEJO)));
    ctx._wzCliPick('CLI-7'); vm.runInContext('WZ.step = 4; WZ.precio = 0;', ctx); ctx._wzGuardar();
    setTimeout(function(){
      const v = guardados.find(o => o.id === 'CLI-7');
      ok('una ficha que no es de la web no se marca web_cerrado', !!v && !('web_cerrado' in v));
      ok('...y guardarla desde el asistente no le borra los datos viejos de Cashea', !!v && v.cashea_pago === '2026-01-01' && v.cashea_ultimo_art === 'Nevera LG');
      console.log('\n' + pass + ' OK · ' + fail + ' fallas');
      process.exit(fail ? 1 : 0);
    }, 30);
  }, 30);
}, 30);
