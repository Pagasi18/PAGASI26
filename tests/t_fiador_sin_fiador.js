// 21-nov-2026, Adam: "según me dicen, cuando están armando una solicitud nueva viene por default
// un fiador". No era un fiador inventado: era el de la ficha del cliente (lo que anotó en la web
// o le dijo a Paola), que salía ya marcado «Tiene fiador». Y si el vendedor lo pasaba a «Sin
// fiador», el nombre se quedaba y el contrato salía con fiador y cláusula de fianza.
// Adam: publicar el arreglo, y que el fiador salga «sin marcar».
//  1. Contratos: sale el fiador si la venta se hizo con fiador; si no, manda la ficha («no» lo quita).
//  2. La solicitud: el fiador de la ficha se OFRECE, no se marca. Entra si el vendedor lo marca.
//  3. Al guardar una venta nueva sin fiador, el crédito no guarda nada del fiador y la ficha
//     queda en «no»; lo que escribió el cliente no se borra.
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

const FIADOR = { fiador:'si', fiador_nom:'CARMEN RUIZ PRUEBA', fiador_ci:'V-9876543', fiador_tel:'0412-7654321', fiador_dir:'CATIA', fiador_rel:'familiar', fiador_rif:'V-98765432', fiador_email:'carmen@example.com' };
const WEB = Object.assign({ id:'WEB-14567890', nombre:'JOSE RAMON PEREZ', cedula:'V-14567890', tel:'0414-1234567', trabajo:'delivery', ingreso:225, estado:'lead', origen:'web', creado:'2026-11-20T10:00:00.000Z' }, FIADOR);
function reiniciar(clientes){
  base(); avisos.length = 0; preguntas.length = 0; respuesta = true; guardados.length = 0; creditos.length = 0;
  S.creds = []; S.motos = [];
  S.clientes = (clientes || [WEB]).map(c => JSON.parse(JSON.stringify(c)));
  S.currentUser = { uid:'u-liz', nombre:'Liz', rol:'Administrador', permisos:[] };
  ctx.window._wzEditando = null;
  ctx.openAddCred();
}
const CAMPOS = ['fiador_nom','fiador_tel','fiador_ci','fiador_rel','fiador_dir','fiador_rif','fiador_email'];
const sinNada = o => CAMPOS.every(k => !o[k]) && !o.fiador_ing;
const CASILLAS = ['wz_fiador_nom','wz_fiador_tel','wz_fiador_ci','wz_fiador_rel','wz_fiador_dir','wz_fiador_ing'];
// Lo que hace el asistente al avanzar de paso: pasar las casillas del fiador a la solicitud
const recoger = () => vm.runInContext("['nom','tel','ci','rel','dir','ing'].forEach(function(k){ var e = document.getElementById('wz_fiador_' + k); if(e) WZ['fiador_' + k] = WZ['wz_fiador_' + k] = e.value; });", ctx);

(async () => {
  // ══ 1. La regla de los contratos ══
  const L = ctx._ctrLlevaFiador, NO = Object.assign({}, FIADOR, { fiador:'no' });
  ok('sin nombre de fiador en la ficha no hay fiador, diga lo que diga la marca', L({ fiador_tiene:'si' }, {}) === false && L({ fiador_tiene:'si' }, { fiador:'si', fiador_nom:'  ' }) === false && L(null, null) === false);
  ok('si la venta se hizo con fiador, sale', L({ fiador_tiene:'si' }, FIADOR) === true);
  ok('...aunque la ficha haya quedado después en «no» (por otra venta sin fiador)', L({ fiador_tiene:'si' }, NO) === true);
  ok('una venta sin fiador deja la ficha en «no», y así el contrato no trae fiador', L({ fiador_tiene:'no' }, NO) === false && L({ fiador_tiene:' NO ' }, Object.assign({}, FIADOR, { fiador:' No ' })) === false);
  ok('...igual si en el crédito no se marcó nada', L({ fiador_tiene:'' }, NO) === false && L({}, NO) === false);
  ok('si después alguien le pone un fiador en la ficha, vuelve a salir', L({ fiador_tiene:'no' }, FIADOR) === true && L({ fiador_tiene:'' }, FIADOR) === true);
  ok('sin marca en ninguno de los dos, como antes: el nombre basta', L({}, { fiador_nom:'CARMEN RUIZ PRUEBA' }) === true);
  const ficha = Object.assign({ id:'F1', nombre:'JOSE' }, NO), antes = JSON.stringify(ficha);
  const copia = ctx._ctrClienteParaContrato({ fiador_tiene:'no' }, ficha);
  ok('para el contrato de una venta sin fiador la ficha sale sin ningún dato del fiador', copia !== ficha && sinNada(copia) && copia.nombre === 'JOSE' && copia.fiador === 'no');
  ok('...y la ficha de verdad no se toca', JSON.stringify(ficha) === antes);
  ok('cuando sí lleva fiador se usa la misma ficha, sin copiar', ctx._ctrClienteParaContrato({ fiador_tiene:'si' }, ficha) === ficha);
  ok('una ficha sin fiador pasa tal cual', (() => { const f = { id:'F2', nombre:'ANA' }; return ctx._ctrClienteParaContrato({ fiador_tiene:'no' }, f) === f; })());

  // ══ 2. Los tres contratos leen la ficha por esa regla ══
  const cred = (id, marca) => ({ id, cli:'JOSE RAMON PEREZ', clienteId:'WEB-14567890', estado:'activo', fecha:'2026-11-21', precio:1432, ini:645, fin:787, total:1494, cuotaQ:83, totalCuotas:18, plazo:9, pagado:0, modelo:'MATRIX 150', fiador_tiene:marca });
  S.clientes = [Object.assign(JSON.parse(JSON.stringify(WEB)), { fiador:'no' })]; S.motos = []; S.pagos = []; S.concesionarios = [];
  S.creds = [cred('M-SI', 'si'), cred('M-NO', 'no'), cred('M-VACIO', '')];
  const P = id => ctx._protectDatos(id), D = id => ctx._draDatos(id), X = id => ctx._docCtx(id);
  ok('contrato Protect: la venta con fiador lo imprime', P('M-SI').hayFiador === true && /CARMEN RUIZ PRUEBA/.test(P('M-SI').fiaNom));
  ok('contrato Protect: la venta sin fiador (ficha en «no») sale sin fiador ni fianza', P('M-NO').hayFiador === false && !/CARMEN/.test(P('M-NO').fiaNom) && P('M-VACIO').hayFiador === false);
  ok('...y los recaudos del fiador solo salen cuando hay fiador', ctx._docsRecaudosLista(P('M-SI').hayFiador).some(r => /Fiador/.test(r[1])) && !ctx._docsRecaudosLista(P('M-NO').hayFiador).some(r => /Fiador/.test(r[1])));
  ok('contrato de reserva de dominio: con fiador interviene; sin fiador no', /fiador solidario/.test(ctx._draPreambuloFiador(D('M-SI'))) && ctx._draPreambuloFiador(D('M-NO')) === '' && D('M-NO').cli.fiador_nom === '');
  ok('los documentos de antes (pagaré, aval): igual', X('M-SI').cli.fiador_nom === 'CARMEN RUIZ PRUEBA' && X('M-NO').cli.fiador_nom === '' && X('M-NO').cli.fiador_ci === '');
  ok('la ficha guardada sigue con lo que escribió el cliente', S.clientes[0].fiador_nom === 'CARMEN RUIZ PRUEBA' && S.clientes[0].fiador_tel === '0412-7654321');
  ok('los 11 créditos de la 26 (crédito «no», ficha «no» con el nombre pegado) salen sin fiador', P('M-NO').hayFiador === false);
  S.clientes[0].fiador = 'si';
  ok('si después se le pone el fiador en la ficha (Editar cliente), el contrato lo vuelve a sacar', P('M-NO').hayFiador === true && P('M-VACIO').hayFiador === true && /fiador solidario/.test(ctx._draPreambuloFiador(D('M-NO'))));

  // ══ 3. La solicitud: el fiador se ofrece, no se marca ══
  ok('qué texto es un nombre y cuál no', ['CARMEN RUIZ', 'Ana', 'ESPOSA'].every(x => ctx._wzFiadorEsNombre(x)) && ['', '  ', 'NO', 'no tiene', 'AUN NO TIENE', 'No tengo fiador', 'N/A', 'ninguno', 'PENDIENTE', 'Todavía no', null, undefined].every(x => !ctx._wzFiadorEsNombre(x)));
  reiniciar();
  ok('una solicitud en blanco no trae fiador ni aviso', !WZ().fiador_tiene && !WZ().fiador_nom && !WZ().fiador_sug && ctx._wzFiadorValor() === '' && ctx._wzFiadorSugHtml() === '');
  ctx._wzCliPick('WEB-14567890');
  ok('al escoger un cliente de la web su fiador NO sale marcado ni escrito', WZ().fiador_tiene === '' && CAMPOS.every(k => !WZ()[k]) && !WZ().wz_fiador_nom);
  ok('...queda como aviso para el vendedor, con nombre, cédula y teléfono', WZ().fiador_sug.nom === 'CARMEN RUIZ PRUEBA' && WZ().fiador_sug.tel === '0412-7654321' && WZ().fiador_sug.ci === 'V-9876543' && WZ().fiador_sug.dir === 'CATIA' && WZ().fiador_sug.rel === 'familiar');
  const aviso = ctx._wzFiadorSugHtml();
  ok('...que dice quién es y trae el botón «Usar este fiador»', /El cliente tiene anotado un fiador: <b>CARMEN RUIZ PRUEBA<\/b> · V-9876543 · 0412-7654321\./.test(aviso) && /No está marcado/.test(aviso) && /onclick="_wzFiadorUsarSugerido\(\)">Usar este fiador</.test(aviso));
  vm.runInContext('WZ.step = 2;', ctx); ctx._wzRender();
  ok('en el paso 2 el aviso se ve y ninguna de las dos opciones viene marcada', /id="wz_fiador_sug" style="display:block">/.test(html()) && !/name="wz_fiador"[^>]*checked/.test(html()) && /id="wz_fiador_det" style="display:none"/.test(html()));
  ok('el aviso no deja pasar código en el nombre', (() => { vm.runInContext("WZ._g = WZ.fiador_sug; WZ.fiador_sug = { nom:'<img src=x onerror=1>', tel:'\"x', ci:'' };", ctx); const h = ctx._wzFiadorSugHtml(); vm.runInContext('WZ.fiador_sug = WZ._g; delete WZ._g;', ctx); return !/<img/.test(h) && /&lt;img/.test(h); })());

  // a) el vendedor no toca la pregunta y guarda: la venta va sin fiador
  vm.runInContext('WZ.step = 4; WZ.precio = 0;', ctx);
  ctx._wzGuardar(); await espera();
  let g = guardados.find(o => o.id === 'WEB-14567890');
  ok('si el vendedor no marca nada, el crédito se guarda sin fiador', creditos.length === 1 && creditos[0].fiador_tiene === '' && sinNada(creditos[0]));
  ok('...la ficha queda en «no» y lo que escribió el cliente no se borra', !!g && g.fiador === 'no' && g.fiador_nom === 'CARMEN RUIZ PRUEBA' && g.fiador_tel === '0412-7654321' && g.fiador_ci === 'V-9876543');
  ok('...el aviso que no se tomó no viaja guardado en el crédito', creditos[0].wizardDraft && !('fiador_sug' in creditos[0].wizardDraft) && !/CARMEN/.test(JSON.stringify(creditos[0])));
  S.creds = creditos.map(c => JSON.parse(JSON.stringify(c))); S.clientes = [JSON.parse(JSON.stringify(g))];
  ok('...y el contrato de esa venta sale sin fiador', ctx._protectDatos(creditos[0].id).hayFiador === false);
  ok('Cumplimiento tampoco revisa a esa persona como fiador', ctx.amlFiadoresDe(S.clientes[0]).length === 0);
  // la próxima vez que se abre una solicitud de ese cliente
  reiniciar([g]); ctx._wzCliPick('WEB-14567890');
  ok('la próxima solicitud de ese cliente sale en «Sin fiador», con el aviso por si ahora sí viene con él', WZ().fiador_tiene === 'no' && !WZ().fiador_nom && WZ().fiador_sug.nom === 'CARMEN RUIZ PRUEBA');

  // b) el vendedor marca «Sin fiador»
  reiniciar(); ctx._wzCliPick('WEB-14567890');
  vm.runInContext("WZ.fiador_tiene='no'; WZ.step = 4; WZ.precio = 0;", ctx);
  ctx._wzGuardar(); await espera();
  g = guardados.find(o => o.id === 'WEB-14567890');
  ok('si marca «Sin fiador»: crédito en «no» sin datos del fiador, ficha en «no»', creditos.length === 1 && creditos[0].fiador_tiene === 'no' && sinNada(creditos[0]) && !!g && g.fiador === 'no' && g.fiador_nom === 'CARMEN RUIZ PRUEBA');

  // c) el vendedor toca «Usar este fiador» (o marca «Tiene fiador»)
  reiniciar(); ctx._wzCliPick('WEB-14567890');
  CASILLAS.forEach(id => form[id] = elemento());
  const cajaAviso = form['wz_fiador_sug'] = elemento(), cajaDatos = form['wz_fiador_det'] = elemento();
  ctx._wzFiadorUsarSugerido();
  ok('al tocar «Usar este fiador» queda en «Tiene fiador» y entran sus datos en las casillas', WZ().fiador_tiene === 'si' && form['wz_fiador_nom'].value === 'CARMEN RUIZ PRUEBA' && form['wz_fiador_tel'].value === '0412-7654321' && form['wz_fiador_ci'].value === 'V-9876543' && form['wz_fiador_rel'].value === 'familiar' && form['wz_fiador_dir'].value === 'CATIA');
  ok('...se abren las casillas y el aviso se quita', cajaDatos.style.display === 'block' && cajaAviso.style.display === 'none');
  form['wz_fiador_nom'].value = 'OTRA PERSONA'; ctx._wzToggleFiador('no'); ctx._wzToggleFiador('si');
  ok('...si el vendedor ya escribió otro fiador, marcar otra vez no se lo pisa', form['wz_fiador_nom'].value === 'OTRA PERSONA');
  ok('...y al pasar a «Sin fiador» el aviso vuelve a verse', (() => { ctx._wzToggleFiador('no'); const v = cajaAviso.style.display === 'block' && cajaDatos.style.display === 'none'; ctx._wzToggleFiador('si'); return v; })());
  form['wz_fiador_nom'].value = 'CARMEN RUIZ PRUEBA'; recoger();
  CASILLAS.concat(['wz_fiador_sug', 'wz_fiador_det']).forEach(id => delete form[id]);
  vm.runInContext('WZ.step = 4; WZ.precio = 0;', ctx);
  ctx._wzGuardar(); await espera();
  g = guardados.find(o => o.id === 'WEB-14567890');
  ok('con el fiador marcado, el crédito lo guarda como siempre', creditos.length === 1 && creditos[0].fiador_tiene === 'si' && creditos[0].fiador_nom === 'CARMEN RUIZ PRUEBA' && creditos[0].fiador_tel === '0412-7654321' && creditos[0].fiador_ci === 'V-9876543' && creditos[0].fiador_dir === 'CATIA' && creditos[0].fiador_rel === 'familiar');
  ok('...y la ficha también, sin perder el RIF ni el correo que puso el cliente', !!g && g.fiador === 'si' && g.fiador_nom === 'CARMEN RUIZ PRUEBA' && g.fiador_rif === 'V-98765432' && g.fiador_email === 'carmen@example.com');
  S.creds = creditos.map(c => JSON.parse(JSON.stringify(c))); S.clientes = [JSON.parse(JSON.stringify(g))];
  ok('...y el contrato lo imprime', ctx._protectDatos(creditos[0].id).hayFiador === true);

  // d) otros casos
  reiniciar([Object.assign({}, WEB, { fiador:'', fiador_nom:'AUN NO TIENE', fiador_tel:'', fiador_ci:'' })]); ctx._wzCliPick('WEB-14567890');
  ok('un texto que no es un nombre («AUN NO TIENE») ni siquiera se ofrece', !WZ().fiador_sug && WZ().fiador_tiene === '');
  vm.runInContext('WZ.step = 4; WZ.precio = 0;', ctx); ctx._wzGuardar(); await espera();
  g = guardados.find(o => o.id === 'WEB-14567890');
  ok('...y al guardar la venta, la ficha queda en «no» (el contrato no sale con «AUN NO TIENE»)', !!g && g.fiador === 'no' && sinNada(creditos[0]));
  reiniciar([Object.assign({}, WEB, { fiador:'no', fiador_nom:'', fiador_tel:'', fiador_ci:'', fiador_dir:'', fiador_rel:'', fiador_rif:'', fiador_email:'' })]); ctx._wzCliPick('WEB-14567890');
  ok('un cliente que dijo que no tiene fiador sigue saliendo en «Sin fiador», sin aviso', WZ().fiador_tiene === 'no' && !WZ().fiador_sug);
  reiniciar(); ctx._wzCliPick('WEB-14567890'); ctx._wzCliClear();
  ok('al quitar el cliente escogido, el aviso de su fiador también se va', !WZ().fiador_sug && !WZ().fiador_tiene);
  // cliente nuevo escrito a mano: escribió un fiador y después marcó «Sin fiador»
  reiniciar([]);
  vm.runInContext("WZ.nom='NUEVA PRUEBA'; WZ.wz_nom='NUEVA PRUEBA'; WZ.ci='V-20111222'; WZ.wz_ci='V-20111222'; WZ.tel='0414-5550000'; WZ.wz_tel='0414-5550000'; WZ.fiador_tiene='no'; WZ.fiador_nom='ALGUIEN PRUEBA'; WZ.fiador_tel='0412-0001111'; WZ.fiador_ci='V-1234567'; WZ.step = 4; WZ.precio = 0;", ctx);
  ctx._wzGuardar(); await espera();
  g = guardados.find(o => o.nombre === 'NUEVA PRUEBA');
  ok('en una ficha nueva, «Sin fiador» no deja ningún fiador anotado', !!g && g.fiador === 'no' && sinNada(g) && creditos.length === 1 && creditos[0].fiador_tiene === 'no' && sinNada(creditos[0]));
  // desde un chat
  const conv = f => ({ id:'ig:1', canal:'instagram', usuario:'prueba', borrador:{ tipo:'lead', nombre:'LEAD PRUEBA', cedula:'V-7777777', telefono:'04147777777', fiador:f } });
  const pre = ctx.waPreloadSolicitud(conv('CARMEN PRUEBA · V-12121212 · 04141212121'));
  ok('desde un chat, el fiador que anotó Paola también se ofrece sin marcar', !pre.fiador_tiene && !pre.fiador_nom && !pre.wz_fiador_nom && pre.fiador_sug.nom === 'CARMEN PRUEBA' && pre.fiador_sug.ci === 'V-12121212' && pre.fiador_sug.tel === '04141212121');
  ok('...y si Paola anotó «NO TIENE», no se ofrece nada', !ctx.waPreloadSolicitud(conv('NO TIENE')).fiador_sug && !ctx.waPreloadSolicitud(conv('')).fiador_sug && !ctx.waPreloadSolicitud(conv('NO TIENE')).fiador_tiene);

  // ══ 4. Editar un crédito ya hecho no cambia nada de esto ══
  const fuente = src('logic/creditos.js');
  ok('al editar, «Sin fiador» vacía el fiador del crédito en vez de conservar el viejo', /\.\.\.\(WZ\.fiador_tiene === 'no'\s*\? \{ fiador_nom:'', fiador_tel:'', fiador_ci:'', fiador_rel:'', fiador_rif:'', fiador_dir:'', fiador_ing:0, fiador_email:'' \}/.test(fuente));
  ok('ningún guardado copia ya el nombre del fiador sin mirar la marca', !/fiador_nom: WZ\.fiador_nom\|\|''/.test(fuente));
  ok('la ficha pasa a «no» por no marcar nada solo en una venta NUEVA, nunca al editar', /if\(WZ\.fiador_tiene === 'no' \|\| \(!window\._wzEditando && WZ\.fiador_tiene !== 'si' && !String\(WZ\.fiador_nom\|\|''\)\.trim\(\) && String\(existing\.fiador_nom\|\|''\)\.trim\(\)\)\)\{ existing\.fiador = 'no'; \}/.test(fuente));
  ok('al editar un crédito el fiador sale como está guardado (eso no cambió)', /preload\.fiador_tiene = _f\('fiador_tiene','fiador','no'\);/.test(fuente));

  console.log('\n' + pass + ' OK · ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
