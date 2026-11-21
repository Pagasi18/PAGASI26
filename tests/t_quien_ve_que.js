// 21-nov-2026, Adam: "el tema de los roles de los usuarios es fastidioso de ver… para ver los
// permisos de Samanta me tengo que meter en usuario, luego en el usuario, luego en roles y ahí
// scrollear… necesito ponerlo más fácil". Escogió la opción B: Usuarios → «Quién ve qué», una
// tabla con todas las personas y todos los módulos; un toque da o quita el permiso al momento.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
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

const avisos = [], logs = [], escrituras = [];
ctx.toast = (m, t) => avisos.push({ m: String(m), t }); ctx.setMicon = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
ctx.logActividad = (a, mod, t, d) => logs.push({ a, t, d });
let respuesta = () => Promise.resolve(true);
ctx.DB.updateUsuario = (uid, data) => { escrituras.push({ uid, data: JSON.parse(JSON.stringify(data)) }); return respuesta(); };
const S = ctx.S, run = c => vm.runInContext(c, ctx);
const espera = () => new Promise(r => setImmediate(r));
const GENTE = [
  { uid:'adm', nombre:'Adam Prueba', rol:'Administrador', permisos:[] },
  { uid:'sam', nombre:'Sámanta Prueba', rol:'Gerente', cargo:'Gerente de Operaciones', permisos:['dash','clientes','creditos','pagos','cobranza','redes','redescob','whatsapp','instagram','reportes','conta'] },
  { uid:'liz', nombre:'Liz Prueba', rol:'Empleado', cargo:'Archivóloga', permisos:['dash','clientes','whatsapp','instagram'] },   // de antes del 1-nov: Redes por los canales
  { uid:'vc', nombre:'Vendedor Sede', rol:'Vendedor Concesionario', permisos:['dash','reportes'] },
  { uid:'ali', nombre:'Aliado Sede', rol:'Aliado', permisos:[] },
  { uid:'bor', nombre:'Borrado Prueba', rol:'Empleado', eliminado:true, permisos:['dash'] },
  { uid:'sus', nombre:'Ana Suspendida', rol:'Empleado', suspendido:true, permisos:['dash'] },
  { uid:'xss', nombre:'<img src=x onerror=alert(1)>', rol:'Contador', permisos:['reportes'] },
];
const reiniciar = (rolYo) => {
  run('_usersCache = ' + JSON.stringify(GENTE) + '; _qv.q = ""; _qv.mod = ""; _qv.guardando = {}; _qv.ultimo = null;');
  S.currentUser = { uid:'adm', nombre:'Adam Prueba', rol: rolYo || 'Administrador', permisos: rolYo ? ['users'] : [] };
  avisos.length = 0; logs.length = 0; escrituras.length = 0; respuesta = () => Promise.resolve(true);
  Object.keys(els).forEach(k => delete els[k]);
};
const U = uid => run('_usersCache').find(u => u.uid === uid);
const cuerpo = () => { run('_qvPintar()'); return els['qv-cuerpo'].innerHTML; };
const fila = (h, nombre) => (h.match(new RegExp('<tr[^>]*><th class="qv-n" scope="row">[^]*?' + nombre + '[^]*?</tr>')) || [''])[0];

(async () => {
  reiniciar();
  // ══ 1. La pestaña ══
  ok('Usuarios tiene la pestaña «Quién ve qué», al lado de Usuarios', /onclick="setUsersTab\('permisos'\)">\s*Quién ve qué/.test(src('modules/users.js')) && /S\.usersTab==='permisos' \? _usersTabQuienVeHTML\(\)/.test(src('modules/users.js')));
  els['users-tab-content'] = elemento(); ctx.setUsersTab('permisos');
  const tab = els['users-tab-content'].innerHTML;
  ok('al abrirla sale el buscador, el filtro «¿Quién ve…?» y la tabla', /id="qv-buscar"/.test(tab) && /id="qv-modulo"/.test(tab) && /¿Quién ve Cobranza\?/.test(tab) && /class="qv-t"/.test(tab));
  ok('cuando llega la lista de usuarios se vuelve a pintar', /if\(S\.usersTab==='permisos'\) _qvPintar\(\);/.test(src('logic/usuarios.js')));
  const cols = run('_qvColumnas()').map(c => c.id);
  ok('las columnas: los módulos del menú y los dos permisos especiales (24)', cols.length === 24 && cols[0] === 'dash' && cols.includes('grupo') && cols.includes('redescob') && cols.slice(-2).join() === 'perm_delete,perm_condiciones');
  ok('...sin Centro (escondido), Aprobaciones (sale sola con Créditos) ni Files (lo ven todos)', !cols.includes('centro') && !cols.includes('aprobaciones') && !cols.includes('recursos'));

  // ══ 2. Lo que se ve ══
  let h = cuerpo();
  ok('una fila por persona, sin aliados ni borrados', /Sámanta Prueba/.test(h) && /Liz Prueba/.test(h) && !/Aliado Sede/.test(h) && !/Borrado Prueba/.test(h) && /6 personas/.test(h));
  ok('con su cargo debajo del nombre (o el rol si no tiene)', /Gerente de Operaciones/.test(fila(h, 'Sámanta')) && /<small>Contador<\/small>/.test(h));
  ok('los suspendidos van al final y lo dicen', h.lastIndexOf('Ana Suspendida') > h.lastIndexOf('Sámanta Prueba') && /Empleado · suspendido/.test(h));
  const tiene = (nombre, mod) => new RegExp('aria-label="' + nombre + ': ' + mod + ', tiene acceso').test(h);
  ok('se marca lo que tiene: Sámanta ve Cobranza y Finanzas, no Usuarios', tiene('Sámanta Prueba', 'Cobranza') && tiene('Sámanta Prueba', 'Finanzas') && !tiene('Sámanta Prueba', 'Usuarios'));
  ok('el administrador sale con todo', run('_qvColumnas()').every(c => ctx.qvTiene(U('adm'), c.id)));
  ok('el vendedor de concesionario, solo lo que su rol deja (aunque tenga otros permisos guardados)', ctx.qvTiene(U('vc'), 'motos') && ctx.qvTiene(U('vc'), 'calculadora') && !ctx.qvTiene(U('vc'), 'reportes') && !ctx.qvTiene(U('vc'), 'dash'));
  ok('alguien de antes del 1-nov ve Redes por sus canales, como en el menú', ctx.qvTiene(U('liz'), 'redes') && ctx.qvTiene(U('liz'), 'redescob'));
  ok('los administradores van en una sola línea («tienen todo»), sin botones', !/<button[^>]*onclick="qvCambiar\('adm'/.test(h) && /<tr class="qv-adm">[^]*Administradores · 1[^]*onclick="editarUsuario\('adm'\)">Adam Prueba<[^]*Tienen todo, en todos los módulos/.test(h) && !/<th class="qv-n" scope="row"><div class="qv-per"><span class="qv-av"[^>]*>AP<\/span>/.test(h));
  ok('la fila del vendedor de concesionario no se toca y dice por qué', !/onclick="qvCambiar\('vc'/.test(h) && /title="Vendedor de concesionario: su rol solo deja/.test(h));
  ok('las personas van por rol, con el título de cada grupo y cuántos son', /class="qv-sec-t"[^>]*><span>Gerentes<\/span> <em>1<\/em>/.test(h) && h.indexOf('<span>Gerentes</span>') < h.indexOf('<span>Empleados</span>') && h.indexOf('<span>Empleados</span>') < h.indexOf('<span>Contadores</span>') && h.indexOf('<span>Contadores</span>') < h.indexOf('<span>Vendedores de concesionario</span>') && h.indexOf('<span>Vendedores de concesionario</span>') < h.indexOf('<span>Suspendidos</span>'));
  ok('arriba de cada columna dice cuántas personas lo ven (sin contar suspendidos)', /class="qv-k[^"]*" data-c="1" title="4 personas ven Clientes">4</.test(h) && /data-c="0" title="3 personas ven Dashboard">3</.test(h));
  ok('cada columna lleva el ícono del módulo, y los dos especiales el suyo', (h.match(/<span class="qv-ico" aria-hidden="true"><svg/g) || []).length === 24);
  ok('al pasar el mouse se ilumina la columna', /onmouseover="qvCruz\(event\)"/.test(h) && /<style id="qv-cruz-css"><\/style>/.test(h) && /data-c="5"/.test(h));
  ok('donde no hay acceso va un punto suave, no un cuadrito vacío', /class="qv-c qv-no"[^>]*><i><\/i><\/button>/.test(h));
  ok('las demás son botones', /onclick="qvCambiar\('sam','users'\)"/.test(h) && /aria-pressed="true"[^>]*onclick="qvCambiar\('sam','pagos'\)"/.test(h));
  ok('al tocar el nombre se abre su ventana de permisos de siempre', /onclick="editarUsuario\('sam'\)">Sámanta Prueba</.test(h));
  ok('un nombre con código no se cuela', !/<img src=x/.test(h) && /&lt;img src=x onerror=alert\(1\)&gt;/.test(h));
  ok('en el teléfono: una tarjeta por persona con lo que tiene y lo que no', /class="qv-cards"/.test(h) && /class="qv-chip qv-si"[^>]*>✓ Cobranza</.test(h) && /<span class="qv-cuenta">\d+ de 24<\/span>/.test(h)
    && /@media \(max-width:720px\)\{\.qv-tabla-wrap\{display:none\}\.qv-cards\{display:flex\}/.test(src('assets/pagasi.css')));
  // filtros
  els['qv-buscar'] = elemento(); els['qv-buscar'].value = 'samanta'; els['qv-modulo'] = elemento(); ctx.qvFiltro(); h = els['qv-cuerpo'].innerHTML;
  ok('buscar «samanta» (sin tilde) deja solo a Sámanta', /1 de 6 personas/.test(h) && /Sámanta/.test(h) && !/Liz Prueba/.test(h));
  els['qv-buscar'].value = ''; els['qv-modulo'].value = 'pagos'; ctx.qvFiltro(); h = els['qv-cuerpo'].innerHTML;
  ok('«¿Quién ve Cobranza?» deja solo a los que la tienen', /Adam Prueba/.test(h) && /Sámanta/.test(h) && !/Liz Prueba/.test(h) && !/Vendedor Sede/.test(h));
  els['qv-buscar'].value = 'nadie así'; els['qv-modulo'].value = ''; ctx.qvFiltro();
  ok('si nadie coincide, lo dice', /Nadie coincide con la búsqueda/.test(els['qv-cuerpo'].innerHTML));
  els['qv-buscar'].value = ''; ctx.qvFiltro();

  // ══ 3. Dar y quitar ══
  await ctx.qvCambiar('sam', 'users'); await espera();
  ok('tocar un cuadrito vacío le da ese módulo y lo guarda en su ficha (solo los permisos)', escrituras.length === 1 && escrituras[0].uid === 'sam' && Object.keys(escrituras[0].data).join() === 'permisos' && escrituras[0].data.permisos.includes('users'));
  ok('...y lo demás que tenía no cambia', ['dash','clientes','creditos','pagos','cobranza','redes','redescob','whatsapp','instagram','reportes','conta'].every(k => escrituras[0].data.permisos.includes(k)));
  ok('...se ve marcado al momento y avisa con «Deshacer»', ctx.qvTiene(U('sam'), 'users') && /Le diste <b>Usuarios<\/b> a <b>Sámanta Prueba<\/b>\./.test(els['qv-aviso'].innerHTML) && /onclick="qvDeshacer\(\)">Deshacer/.test(els['qv-aviso'].innerHTML) && els['qv-aviso'].style.display === 'flex');
  ok('...y queda en el registro de actividad', logs.length === 1 && logs[0].a === 'permiso_cambiado' && logs[0].t === 'sam' && logs[0].d.permiso === 'users' && logs[0].d.accion === 'dar');
  await ctx.qvDeshacer(); await espera();
  ok('«Deshacer» la deja exactamente como estaba', JSON.stringify(escrituras[1].data.permisos) === JSON.stringify(GENTE[1].permisos) && !ctx.qvTiene(U('sam'), 'users') && /quedaron como estaban/.test(els['qv-aviso'].innerHTML) && !/Deshacer<\/button>/.test(els['qv-aviso'].innerHTML) && logs[1].a === 'permiso_deshecho');
  reiniciar(); await ctx.qvCambiar('sam', 'pagos'); await espera();
  ok('quitar Cobranza quita también la clave vieja que abre lo mismo', !escrituras[0].data.permisos.includes('pagos') && !escrituras[0].data.permisos.includes('cobranza') && /Le quitaste <b>Cobranza<\/b>/.test(els['qv-aviso'].innerHTML));
  reiniciar(); await ctx.qvCambiar('liz', 'reportes'); await espera();
  ok('dar Finanzas da también la clave vieja de Finanzas', escrituras[0].data.permisos.includes('reportes') && escrituras[0].data.permisos.includes('conta'));
  ok('alguien de antes del 1-nov no pierde Redes al cambiarle otra cosa', ['redes','redescob','whatsapp','instagram'].every(k => escrituras[0].data.permisos.includes(k)) && ctx.qvTiene(U('liz'), 'redes') && ctx.qvTiene(U('liz'), 'redescob'));
  reiniciar(); await ctx.qvCambiar('liz', 'redescob'); await espera();
  ok('...y quitarle Redes Cobranza le deja Redes Ventas (con sus dos canales)', !ctx.qvTiene(U('liz'), 'redescob') && ctx.qvTiene(U('liz'), 'redes') && JSON.stringify(escrituras[0].data.permisos.filter(k => ['redes','redescob','whatsapp','instagram'].includes(k)).sort()) === JSON.stringify(['instagram','redes','whatsapp']));
  reiniciar(); await ctx.qvCambiar('sam', 'redes'); await espera();
  ok('quitar Redes Ventas a quien tiene las dos le quita Instagram pero no el WhatsApp de cobranza', !escrituras[0].data.permisos.includes('redes') && !escrituras[0].data.permisos.includes('instagram') && escrituras[0].data.permisos.includes('whatsapp') && escrituras[0].data.permisos.includes('redescob'));
  reiniciar(); await ctx.qvCambiar('liz', 'perm_condiciones'); await espera();
  ok('dar Condiciones del plan da también Catálogo web, y lo dice', escrituras[0].data.permisos.includes('perm_condiciones') && escrituras[0].data.permisos.includes('catalogo') && /y también Catálogo web/.test(els['qv-aviso'].innerHTML));
  await ctx.qvCambiar('liz', 'catalogo'); await espera();
  ok('...y quitar Catálogo web quita también Condiciones (no tendría dónde usarlas), y lo dice', !escrituras[1].data.permisos.includes('catalogo') && !escrituras[1].data.permisos.includes('perm_condiciones') && /\(y Condiciones del plan\)/.test(els['qv-aviso'].innerHTML));
  reiniciar(); await ctx.qvCambiar('sus', 'clientes'); await espera();
  ok('a un suspendido también se le pueden cambiar', escrituras.length === 1 && escrituras[0].data.permisos.includes('clientes'));

  // ══ 4. Lo que no se puede ══
  reiniciar(); await ctx.qvCambiar('adm', 'clientes'); await ctx.qvCambiar('vc', 'reportes');
  ok('al administrador y al vendedor de concesionario no se les cambia nada desde aquí', escrituras.length === 0 && avisos.some(a => /Es administrador: tiene todo/.test(a.m)) && avisos.some(a => /su rol solo deja/.test(a.m)));
  reiniciar('Gerente'); h = cuerpo();
  ok('quien no es administrador solo ve la tabla (las Reglas no lo dejarían guardar)', !/<button[^>]*onclick="qvCambiar/.test(h) && /solo un administrador cambia permisos/.test(h) && /onclick="openUserPanel\('sam'\)"/.test(h));
  await ctx.qvCambiar('sam', 'users');
  ok('...y si lo intenta, se le dice y no se escribe nada', escrituras.length === 0 && avisos.some(a => /Solo un administrador cambia permisos/.test(a.m)));

  // ══ 5. Si la base no lo acepta ══
  reiniciar(); respuesta = () => Promise.resolve(false);
  await ctx.qvCambiar('sam', 'users'); await espera();
  ok('si la base no acepta el cambio, vuelve como estaba y avisa', !ctx.qvTiene(U('sam'), 'users') && avisos.some(a => a.t === 'error' && /No se guardó el cambio de permisos de Sámanta Prueba/.test(a.m)) && !run('_qv.ultimo') && logs.length === 0);
  reiniciar(); respuesta = () => Promise.reject(new Error('sin red'));
  await ctx.qvCambiar('sam', 'users'); await espera();
  ok('...igual si falla la conexión', !ctx.qvTiene(U('sam'), 'users') && avisos.some(a => a.t === 'error'));
  reiniciar(); let soltar; respuesta = () => new Promise(r => { soltar = r; });
  const p1 = ctx.qvCambiar('sam', 'users'); h = cuerpo();
  ok('mientras se guarda, la fila se ve ocupada', /qv-c qv-si qv-ocupado/.test(fila(h, 'Sámanta')));
  ctx.qvCambiar('sam', 'gps');
  ok('...y un segundo toque en la misma persona espera (no se cruzan dos guardados)', escrituras.length === 1);
  soltar(true); await p1; await espera();
  ok('...al terminar se puede seguir', !run('_qv.guardando.sam') && !/qv-ocupado/.test(cuerpo()));

  console.log('\n' + pass + ' OK · ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
