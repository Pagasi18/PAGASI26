// Avisos de riesgo al crear un credito (7-oct-2026). Adam: "una persona se volvio fiador
// de 14 motos y el sistema deberia advertirlo"; y "un cliente con credito al dia puede
// sacar un segundo, que avise; igual con uno en mora; nosotros decidimos si si o no".
// Solo avisa: nunca bloquea. Se prueba con el app completo cargado en un VM.
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
const S = ctx.S;
S.currentUser = { uid:'u1', nombre:'Prueba', rol:'Administrador', permisos:['creditos'] };

// ── La cartera de prueba ─────────────────────────────────────────────────────
S.clientes = [
  { id:'C-1', nombre:'JUAN PEREZ', cedula:'V-12345678' },
  { id:'WEB-12345678', nombre:'Juan Perez', cedula:'V-012345678' },   // la misma persona, ficha de la web con cero adelante
  { id:'C-2', nombre:'ANA GOMEZ', cedula:'V-22222222' },
  { id:'C-3', nombre:'LUIS <b>RAMOS</b>', cedula:'V-33333333' },
  { id:'C-4', nombre:'PEDRO VIEJO', cedula:'V-44444444' },
];
S.creds = [
  { id:'M-001', cli:'JUAN PEREZ', clienteId:'C-1', estado:'activo', mora:0, modelo:'NEW HORSE 150', fiador_nom:'CARLOS FIADOR', fiador_ci:'V-99999999', fiador_tel:'0414-1234567' },
  { id:'M-002', cli:'ANA GOMEZ', clienteId:'C-2', estado:'mora', mora:12, modelo:'LEON 200', fiador_nom:'Carlos Fiador', fiador_ci:'99999999', fiador_tel:'' },
  { id:'M-003', cli:'LUIS <b>RAMOS</b>', clienteId:'C-3', estado:'pendiente_revision', modelo:'STREET 150', fiador_nom:'OTRO', fiador_ci:'', fiador_tel:'+58 414 1234567' },
  { id:'M-004', cli:'PEDRO VIEJO', cliId:'C-4', estado:'completado', modelo:'ARSEN', fiador_ci:'V-99999999' },   // pagado: no cuenta
  { id:'M-005', cli:'JUAN PEREZ', clienteId:'C-1', estado:'cancelado', modelo:'X', fiador_ci:'V-99999999' },     // cancelado: no cuenta
  { id:'M-006', cli:'PEDRO VIEJO', estado:'recuperado', modelo:'BERA', fiador_ci:'' },                           // viejo: solo por nombre
  { id:'M-007', cli:'ALGUIEN', clienteId:'C-9', estado:'activo', modelo:'Y', fiador_ci:'', fiador_tel:'' , eliminado:true },
];

// ── Las llaves ───────────────────────────────────────────────────────────────
ok('cédula: solo dígitos, sin ceros adelante, da igual el formato',
  ctx._riesgoCiKey('V-012.345.678') === '12345678' && ctx._riesgoCiKey(' v12345678 ') === '12345678' && ctx._riesgoCiKey('NA') === '');
ok('teléfono: los últimos 10 dígitos, con o sin 58 y con o sin el 0',
  ctx._riesgoTelKey('0414-1234567') === '4141234567' && ctx._riesgoTelKey('+58 414 1234567') === '4141234567' && ctx._riesgoTelKey('4141234567') === '4141234567');

// ── Fiador repetido ──────────────────────────────────────────────────────────
let l = ctx._riesgoFiadorEn('v-99999999', '', null);
ok('por cédula: encuentra los dos créditos vivos del fiador, escritos distinto', l.map(c=>c.id).join() === 'M-001,M-002');
ok('...y no cuenta el pagado ni el cancelado', !l.some(c=>c.id==='M-004'||c.id==='M-005'));
l = ctx._riesgoFiadorEn('', '0414 1234567', null);
ok('por teléfono: encuentra también el que quedó sin cédula (y el pendiente de aprobación)', l.map(c=>c.id).join() === 'M-001,M-003');
ok('al editar, el propio crédito no se cuenta a sí mismo', ctx._riesgoFiadorEn('99999999','', 'M-001').map(c=>c.id).join() === 'M-002');
ok('sin cédula ni teléfono no hay nada que buscar', ctx._riesgoFiadorEn('', '', null).length === 0 && ctx._riesgoFiadorEn('V-1', '123', null).length === 0);
ok('la lista dice qué crédito, de quién y cómo está',
  ctx._riesgoLista(ctx._riesgoFiadorEn('99999999','',null),'cli') === 'M-001 (JUAN PEREZ · al día), M-002 (ANA GOMEZ · en mora 12 días)');

// ── Cliente que ya tiene crédito ─────────────────────────────────────────────
l = ctx._riesgoCreditosDeCliente(S.clientes[0], null);
ok('por ficha: el cliente con un crédito activo (y no el cancelado)', l.map(c=>c.id).join() === 'M-001');
l = ctx._riesgoCreditosDeCliente({ id:null, cedula:'12345678' }, null);
ok('por cédula escrita a mano: junta las fichas con esa cédula, incluida la de la web con cero adelante', l.map(c=>c.id).join() === 'M-001');
l = ctx._riesgoCreditosDeCliente(S.clientes[4], null);
ok('un crédito viejo sin id de ficha se encuentra por el nombre, y "recuperado" sí cuenta', l.map(c=>c.id).join() === 'M-006' && ctx._riesgoEstadoTxt(l[0]) === 'moto recuperada');
ok('un crédito borrado no cuenta', ctx._riesgoCreditosDeCliente({ id:'C-9', cedula:'' }, null).length === 0);

// ── Lo que pidió la revisión adversaria ──────────────────────────────────────
S.creds.push({ id:'M-008', cli:'MARIA', clienteId:'C-2', estado:'activo', modelo:'Z', fiador_tiene:'no', fiador_nom:'', fiador_ci:'V-99999999', fiador_tel:'' });
ok('un crédito guardado "sin fiador" no cuenta aunque le haya quedado la cédula pegada', !ctx._riesgoFiadorEn('99999999','',null).some(c=>c.id==='M-008'));
S.clientes.push({ id:'C-7', nombre:'PEDRO BORRADO', cedula:'V-77777777', eliminado:true });
S.creds.push({ id:'M-040', cli:'PEDRO BORRADO', clienteId:'C-7', estado:'mora', mora:20, modelo:'LEON' });
ok('la ficha borrada sigue identificando a la persona: su mora se ve al crear otra ficha con la misma cédula', ctx._riesgoCreditosDeCliente({ id:'C-8', cedula:'77777777', nombre:'PEDRO B' }, null).map(c=>c.id).join() === 'M-040');
S.creds.push({ id:'M-020', cli:'MARIA LOPEZ', clienteId:'C-404', estado:'activo', modelo:'Q' });
ok('un crédito cuya ficha ya no existe se encuentra por el nombre (con otra mayúscula y acento)', ctx._riesgoCreditosDeCliente({ id:null, cedula:'', nombre:'maría lópez' }, null).map(c=>c.id).join() === 'M-020');
ok('...pero un crédito de OTRA ficha que sí existe no se mezcla por el nombre', ctx._riesgoCreditosDeCliente({ id:null, cedula:'', nombre:'JUAN PEREZ' }, null).map(c=>c.id).join() === '');
ok('un crédito recuperado con mora vieja dice "moto recuperada", no "en mora"', ctx._riesgoEstadoTxt({ estado:'recuperado', mora:45 }) === 'moto recuperada');
const antesRol = S.currentUser.rol; S.currentUser.rol = 'Vendedor Concesionario';
ok('el vendedor de concesionario ve el crédito y su estado, pero no el nombre del otro cliente', ctx._riesgoLista(ctx._riesgoFiadorEn('99999999','',null),'cli') === 'M-001 (al día), M-002 (en mora 12 días)');
S.currentUser.rol = antesRol;
ok('la lista corta del confirm recorta a 5 y dice cuántos faltan', /y 2 más$/.test(ctx._riesgoListaCorta([1,2,3,4,5,6,7].map(i=>({id:'M-'+i, cli:'X', estado:'activo'})),'cli')));

// ── Lo que se pinta en pantalla ──────────────────────────────────────────────
form['wz_fiador_aviso'] = elemento(); form['wz_fiador_ci'] = elemento(); form['wz_fiador_tel'] = elemento();
form['wz_fiador_ci'].value = 'V-99999999';
ctx._wzFiadorAviso();
ok('paso 2: la caja del fiador se muestra con los créditos', form['wz_fiador_aviso'].style.display === 'block' && /ya es fiador de 2 créditos/.test(form['wz_fiador_aviso'].innerHTML) && /M-001/.test(form['wz_fiador_aviso'].innerHTML));
form['wz_fiador_ci'].value = 'V-55555555'; ctx._wzFiadorAviso();
ok('...y se esconde cuando el fiador es nuevo', form['wz_fiador_aviso'].style.display === 'none');
ctx.WZ = { fiador_ci:'V-99999999' }; form['wz_fiador_ci'].value = ''; ctx._wzFiadorAviso();
ok('...y también cuando el operario borra la cédula aunque WZ guarde la vieja', form['wz_fiador_aviso'].style.display === 'none');
form['wz_cli_aviso'] = elemento(); form['wz_ci'] = elemento();
ctx.WZ = { step:1, clienteSel:'C-3' };
ctx._wzClienteAviso();
ok('paso 1: la caja del cliente muestra su crédito pendiente', /ya tiene 1 crédito/.test(form['wz_cli_aviso'].innerHTML) && /M-003/.test(form['wz_cli_aviso'].innerHTML));
form['wz_fiador_ci'].value = ''; form['wz_fiador_tel'].value = '0414-1234567'; ctx._wzFiadorAviso();
ok('un nombre con etiquetas sale escapado en la caja, no como HTML', form['wz_fiador_aviso'].innerHTML.indexOf('<b>RAMOS') === -1 && /&lt;b&gt;RAMOS/.test(form['wz_fiador_aviso'].innerHTML));
form['wz_fiador_tel'].value = '';
ctx.WZ = { step:1, clienteSel:'' }; form['wz_ci'].value = '012345678'; ctx._wzClienteAviso();
ok('paso 1: con la cédula escrita a mano también avisa', /M-001/.test(form['wz_cli_aviso'].innerHTML));
ctx.WZ = { step:1, clienteSel:'', ci:'V-12345678' }; form['wz_ci'].value = ''; ctx._wzClienteAviso();
ok('paso 1: al borrar la cédula la caja se apaga aunque WZ guarde la vieja', form['wz_cli_aviso'].style.display === 'none');
form['wz_ci'].value = ''; ctx._wzClienteAviso();
ok('...y sin cédula no muestra nada', form['wz_cli_aviso'].style.display === 'none');

// ── El confirm del asistente: avisa una vez y deja seguir ─────────────────────
ctx.WZ = { step:1, clienteSel:'C-1', nom:'JUAN PEREZ' };
form['wz_nom'] = elemento(); form['wz_nom'].value = 'JUAN PEREZ';
form['wz_ci'].value = 'V-12345678'; form['wz_tel'] = elemento(); form['wz_tel'].value = '0414-0000000';
preguntas.length = 0; ctx.__respuesta = false;
ok('paso 1: si el operario dice que no, se queda en el paso', ctx._wzValidar() === false && /ya tiene 1 crédito: M-001 \(NEW HORSE 150 · al día\)/.test(preguntas[0]||''));
preguntas.length = 0; ctx.__respuesta = true;
ok('paso 1: si acepta, sigue (el aviso no bloquea)', ctx._wzValidar() === true && preguntas.length === 1);
preguntas.length = 0;
ok('paso 1: no vuelve a preguntar lo mismo', ctx._wzValidar() === true && preguntas.length === 0);

ctx.WZ = { step:2, fiador_tiene:'si', fiador_nom:'CARLOS FIADOR', fiador_tel:'0424-7777777', fiador_ci:'V-99999999', _chip_wz_emp_g:'formal' };
form['wz_ing'] = elemento(); form['wz_ing'].value = '800';
form['wz_fiador_ci'].value = 'V-99999999'; form['wz_fiador_tel'].value = '0424-7777777'; form['wz_fiador_nom'] = elemento(); form['wz_fiador_nom'].value = 'CARLOS FIADOR';
preguntas.length = 0; ctx.__respuesta = false;
ok('paso 2: pregunta por el fiador repetido y, si dice que no, se queda', ctx._wzValidar() === false && /ya es fiador de 2 créditos: M-001 \(JUAN PEREZ · al día\), M-002 \(ANA GOMEZ · en mora 12 días\)/.test(preguntas[0]||''));
preguntas.length = 0; ctx.__respuesta = true;
ok('paso 2: si acepta, sigue', ctx._wzValidar() === true && preguntas.length === 1);
preguntas.length = 0;
ok('paso 2: la segunda vez no pregunta', ctx._wzValidar() === true && preguntas.length === 0);
ctx.WZ = { step:2, fiador_tiene:'no', _chip_wz_emp_g:'formal' }; form['wz_fiador_ci'].value = 'V-99999999'; preguntas.length = 0;
ok('paso 2: sin fiador marcado no pregunta aunque el campo tenga algo', ctx._wzValidar() === true && preguntas.length === 0);
ctx.window._wzEditando = 'M-002';
ctx.WZ = { step:2, fiador_tiene:'si', fiador_nom:'Carlos Fiador', fiador_tel:'', fiador_ci:'99999999', _chip_wz_emp_g:'formal', _fiadorSinTelOk:'Carlos Fiador' };   // el aviso viejo de 'falta el teléfono' ya se contestó
form['wz_fiador_ci'].value = '99999999'; form['wz_fiador_tel'].value = ''; form['wz_fiador_nom'].value = 'Carlos Fiador'; preguntas.length = 0;
ok('al editar un crédito sin tocar su fiador no vuelve a preguntar', ctx._wzValidar() === true && preguntas.length === 0);
ctx.WZ = { step:2, fiador_tiene:'si', fiador_nom:'OTRO', fiador_tel:'0414-1234567', fiador_ci:'', _chip_wz_emp_g:'formal' };
form['wz_fiador_ci'].value = ''; form['wz_fiador_tel'].value = '0414-1234567'; form['wz_fiador_nom'].value = 'OTRO'; preguntas.length = 0; ctx.__respuesta = true;
ok('al editar y cambiar el fiador por uno repetido, sí pregunta', ctx._wzValidar() === true && preguntas.length === 1 && /ya es fiador/.test(preguntas[0]));
ctx.window._wzEditando = null;
ctx.WZ = { fiador_tiene:'si', fiador_ci:'V-99999999', fiador_tel:'', clienteSel:'C-1' }; form['wz_fiador_ci'].value = 'V-99999999'; form['wz_fiador_tel'].value = ''; form['wz_ci'].value = '';
const anot = ctx._wzRiesgoAvisosGuardar();
ok('lo aceptado queda anotado en el crédito, legible', anot.length === 2 && /El cliente ya tenía 1 crédito: M-001/.test(anot[0]) && /El fiador ya respaldaba 2 créditos: M-001/.test(anot[1]));
ok('...y el crédito nuevo lo guarda y lo manda al registro de actividad', /riesgo_avisos: _wzRiesgoAvisosGuardar\(\)/.test(src('logic/creditos.js')) && /avisos:\(newCred\.riesgo_avisos\|\|\[\]\)\.join/.test(src('logic/creditos.js')));

// ── La bandeja de Aprobaciones ───────────────────────────────────────────────
let h = ctx._riesgoResumenHtml(S.creds[2]);   // M-003: cliente C-3 sin otros, fiador por teléfono
ok('aprobaciones: el fiador por teléfono sale (M-001) y el cliente no, porque no tiene otro', /El fiador ya respalda 1 crédito/.test(h) && /M-001/.test(h) && !/El cliente ya tiene/.test(h));
h = ctx._riesgoResumenHtml({ id:'M-010', cli:'JUAN PEREZ', clienteId:'C-1', estado:'pendiente_revision', fiador_ci:'V-99999999' });
ok('aprobaciones: una solicitud nueva de Juan avisa de M-001 y del fiador', /El cliente ya tiene 1 crédito/.test(h) && /M-001 \(NEW HORSE 150 · al día\)/.test(h) && /El fiador ya respalda 2/.test(h));
ok('aprobaciones: sin nada que avisar no pinta nada', ctx._riesgoResumenHtml({ id:'M-011', cli:'NADIE', clienteId:'C-77', estado:'pendiente_revision' }) === '');

// ── El cableado en el HTML y en la bandeja ───────────────────────────────────
const cre = src('logic/creditos.js');
ok('la cédula y el teléfono del fiador avisan al salir del campo', /wz_fiador_tel[^\n]*onblur="_wzFiadorAviso\(\)"/.test(cre) && /wz_fiador_ci[^\n]*onblur="_wzFiadorAviso\(\)"/.test(cre));
ok('la cédula del cliente también: al salir del campo pasa por _wzCedulaFicha, que repinta el aviso', /onblur="_wzCedulaFicha\(this\)"/.test(cre) && /function _wzCedulaFicha\(el\)\{\n\s*if\(typeof _wzClienteAviso==='function'\) _wzClienteAviso\(\);/.test(cre));
ok('las dos cajas existen en el asistente', /id="wz_cli_aviso"/.test(cre) && /id="wz_fiador_aviso"/.test(cre));
ok('elegir o limpiar el cliente del buscador repinta el aviso', (cre.match(/_wzClienteAviso\(\);\n\}/g)||[]).length >= 2);
ok('la bandeja de Aprobaciones muestra el resumen', /_riesgoResumenHtml\(c\)/.test(src('logic/aprobaciones.js')));
ok('nada de esto bloquea: no hay return false sin confirm en los avisos', !/_riesgoFiadorEn[\s\S]{0,200}toast\([^)]*error/.test(cre));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
