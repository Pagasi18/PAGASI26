// 21-nov-2026, Adam, con capturas del listado de créditos y de «Detalle del Crédito»:
// "necesito que me pongas qué vendedor vendió la moto".
//  · El listado trae la columna «Vendedor», al lado de Concesionario, y se puede ordenar por ella.
//  · La ventana de detalle trae la etiqueta «VENDEDOR · …» junto a la del concesionario.
//  · El CSV de créditos trae la columna Vendedor.
// El vendedor es el mismo al que Comisiones le cuenta la venta (_credVendedorActual): por el usuario
// y, en los créditos viejos, por el nombre anotado.
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
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
ctx.toast = () => {}; ctx.setMicon = () => {}; ctx.logActividad = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
const S = ctx.S;
const HOY = '2026-11-21';
const cred = (n, extra) => Object.assign({ id: 'M-' + n, cli: 'CLIENTE ' + n, clienteId: 'C' + n, modelo: 'MATRIX 150LITE', estado: 'activo', fecha: HOY, total: 1494, precio: 1432, ini: 645, fin: 787,
  cuotaQ: 83, cuota: 166, plazo: 9, totalCuotas: 18, pagado: 0, mora: 0, eliminado: false, contratoFirmado: true, concesionarioId: 'CO-1' }, extra || {});
S.currentUser = { uid: 'adm', nombre: 'Adam', rol: 'Administrador', email: 'a@ejemplo.com' };
S.page = 'creditos';
S.clientes = []; S.pagos = []; S.motos = [];
S.concesionarios = [{ id: 'CO-1', nombre: 'EMPIRE BELLO MONTE' }];
const USUARIOS = [
  { uid: 'u-heymar', nombre: 'Heymar Prueba', rol: 'Vendedor' },
  { uid: 'u-miguel', nombre: 'Miguel Prueba', rol: 'Empleado' },
  { uid: 'u-liz', nombre: 'Liz <b>Prueba</b>', rol: 'Vendedor' },
];
ctx._usersCache = USUARIOS;
S.creds = [
  cred('438', { vendedorUid: 'u-heymar', vendedorNombre: 'Heymar (nombre viejo)' }),   // por usuario: manda el nombre de hoy
  cred('437', { vendedorUid: 'u-miguel', vendedorNombre: 'Miguel Prueba' }),
  cred('436', { vendedorNombre: 'Miguel Prueba' }),                                    // viejo: sin uid, por nombre
  cred('435', { vendedorNombre: 'Usuario', creadoPor: 'Heymar Prueba' }),              // viejo: «Usuario» → quien lo creó
  cred('434', { vendedorNombre: 'Daniel Sin Usuario' }),                               // anotado, pero sin usuario en el sistema
  cred('433', {}),                                                                     // sin vendedor
  cred('432', { vendedorUid: 'u-borrado', vendedorNombre: 'Ex Empleada' }),            // su usuario ya no existe
  cred('431', { vendedorUid: 'u-liz' }),                                               // nombre con signos raros
];
const N = id => ctx._credVendedorNombre(S.creds.find(c => c.id === id));

// ── 1. El nombre ──
ok('con usuario: sale el nombre que tiene hoy ese usuario', N('M-438') === 'Heymar Prueba' && N('M-437') === 'Miguel Prueba');
ok('crédito viejo sin identificador: sale el nombre anotado', N('M-436') === 'Miguel Prueba');
ok('crédito viejo anotado como «Usuario»: sale quien lo creó', N('M-435') === 'Heymar Prueba');
ok('anotado a alguien sin usuario en el sistema: sale ese nombre igual', N('M-434') === 'Daniel Sin Usuario');
ok('sin vendedor: vacío', N('M-433') === '' && ctx._credVendedorNombre({}) === '' && ctx._credVendedorNombre(null) === '');
ok('si el usuario ya no existe, queda el nombre con que se guardó la venta', N('M-432') === 'Ex Empleada');
ok('es el mismo vendedor al que Comisiones le cuenta la venta', S.creds.every(c => ctx._credVendedorNombre(c) === String(ctx._credVendedorActual(c).nombre || '').trim()));

// ── 2. El listado ──
S.credSort = { col: 'id', dir: 'desc' };
let h = String(ctx.PG.creditos());
const cab = (h.match(/<thead><tr>[^]*?<\/tr><\/thead>/) || [''])[0];
const titulos = [...cab.matchAll(/<th(?:\s[^>]*)?>([^<]*)/g)].map(m => m[1].trim());
ok('la tabla trae la columna «Vendedor» justo después de «Concesionario»', titulos.indexOf('Vendedor') === titulos.indexOf('Concesionario') + 1 && titulos.indexOf('Concesionario') === 3);
ok('...y las demás columnas siguen en su orden', titulos.join('|') === 'ID|Cliente|Modelo|Concesionario|Vendedor|Fecha inicio|Precio|Total|Cuota Q.|Progreso|Saldo|Mora|FDC|Estado|');
ok('se puede ordenar por ella, como las otras', /onclick="setCredSort\('vend'\)"/.test(cab));
const fila = id => (h.match(new RegExp('<tr style="cursor:pointer" onclick="openAmort\\(\'' + id + '\'\\)">[^]*?</tr>')) || [''])[0];
// (el concesionario trae debajo, en un renglón aparte, el vendedor para las pantallas medianas: aquí se lee sin él)
const celdas = id => [...fila(id).matchAll(/<td[^>]*>([^]*?)<\/td>/g)].map(m => m[1].replace(/<div class="cr-vend-bajo">[^]*?<\/div>/, '').replace(/<[^>]+>/g, '').trim());
const bajo = id => ((fila(id).match(/<div class="cr-vend-bajo">([^]*?)<\/div>/) || ['', ''])[1]).replace(/<[^>]+>/g, '').trim();
ok('cada fila tiene 15 celdas, igual que el encabezado', S.creds.every(c => celdas(c.id).length === 15) && titulos.length === 15);
ok('M-438: concesionario y, al lado, su vendedor', celdas('M-438')[3] === 'EMPIRE BELLO MONTE' && celdas('M-438')[4] === 'Heymar Prueba');
ok('los créditos viejos también muestran su vendedor', celdas('M-436')[4] === 'Miguel Prueba' && celdas('M-435')[4] === 'Heymar Prueba' && celdas('M-434')[4] === 'Daniel Sin Usuario');
ok('sin vendedor sale una raya, y al pasar el ratón lo explica', celdas('M-433')[4] === '—' && /title="Este crédito no tiene vendedor anotado"/.test(fila('M-433')));
ok('el nombre completo sale al pasar el ratón (por si la columna lo corta)', /data-col="vend"[^>]*title="Heymar Prueba"/.test(fila('M-438')));
ok('un nombre con signos raros no rompe la tabla', /Liz &lt;b&gt;Prueba&lt;\/b&gt;/.test(fila('M-431')) && !/<b>Prueba<\/b>/.test(fila('M-431')));
ok('pantallas medianas: el vendedor también va en letra pequeña debajo del concesionario', bajo('M-438') === 'Vend. Heymar Prueba' && bajo('M-436') === 'Vend. Miguel Prueba' && bajo('M-433') === 'Sin vendedor' && /class="cr-vend-col"[^>]*onclick="setCredSort\('vend'\)"/.test(cab) && /<td class="tds cr-vend-col" data-col="vend"/.test(fila('M-438')));
ok('la fecha y lo demás no se corrieron de sitio', /nov/.test(celdas('M-438')[5]) && celdas('M-438')[6] === ctx.fmt(1432) && celdas('M-438')[13] === 'activo');
S.credFiltro = 'zzz-nada'; h = String(ctx.PG.creditos());
ok('«Sin resultados» ocupa las 15 columnas', /<td colspan="15"[^>]*>Sin resultados para este filtro<\/td>/.test(h));
S.credFiltro = '';

// Ordenar
const ordenDe = () => { h = String(ctx.PG.creditos()); return S.creds.map(c => c.id).sort((a, b) => h.indexOf("openAmort('" + a + "')\">") - h.indexOf("openAmort('" + b + "')\">")); };
S.credSort = undefined; ctx.setCredSort('vend');
ok('tocar «Vendedor» ordena de la A a la Z', S.credSort.col === 'vend' && S.credSort.dir === 'asc');
let o = ordenDe(), nombres = o.map(N);
ok('...Daniel, Ex Empleada, Heymar, Heymar, Liz, Miguel, Miguel y, al final, el que no tiene', nombres.join('|') === 'Daniel Sin Usuario|Ex Empleada|Heymar Prueba|Heymar Prueba|Liz <b>Prueba</b>|Miguel Prueba|Miguel Prueba|');
ctx.setCredSort('vend'); o = ordenDe(); nombres = o.map(N);
ok('tocar otra vez: de la Z a la A, y el que no tiene vendedor sigue al final', S.credSort.dir === 'desc' && nombres[0] === 'Miguel Prueba' && nombres[6] === 'Daniel Sin Usuario' && nombres[7] === '');
S.credSort = { col: 'id', dir: 'desc' };

// Sin la lista de usuarios (un vendedor de concesionario no la puede leer): sale el nombre guardado
ctx._usersCache = [];
h = String(ctx.PG.creditos());
ok('sin la lista de usuarios cargada, sale el nombre guardado en el crédito', celdas('M-438')[4] === 'Heymar (nombre viejo)' && celdas('M-437')[4] === 'Miguel Prueba' && celdas('M-433')[4] === '—');
ctx._usersCache = USUARIOS;

// Los anchos de la tabla (pantalla grande): una regla por columna, con la nueva
const css = src('assets/pagasi.css');
const reglas = [...css.matchAll(/\.tw-creditos th:nth-child\((\d+)\),\.tw-creditos td:nth-child\(\1\)\{width:([^;}]+)[^}]*\}\s*\/\* ([^*]+) \*\//g)].map(m => m[1] + ':' + m[3].trim());
ok('la hoja de estilos tiene los 15 anchos, con Vendedor en la quinta columna', reglas.join('|') === '1:ID|2:Cliente|3:Modelo|4:Concesionario|5:Vendedor|6:Fecha|7:Precio|8:Total|9:Cuota|10:Progreso|11:Saldo|12:Mora|13:FDC|14:Estado|15:Acciones');
ok('...y los botones de la fila siguen siendo la última columna', /\.tw-creditos td:nth-child\(15\) > div\{gap:2px\}/.test(css) && !/\.tw-creditos td:nth-child\(14\) > div/.test(css));
const medio = (css.match(/@media \(min-width:1100px\)\{[^]*?\n\}/) || [''])[0], ancho = (css.match(/@media \(min-width:1760px\)\{[^]*?\n\}/) || [''])[0];
ok('pantalla mediana: la columna se esconde, el vendedor sale debajo y los anchos son los de siempre (la tabla no crece)', /\.cr-vend-col\{display:none\}/.test(medio) && /\.cr-vend-bajo\{display:block\}/.test(medio) && /nth-child\(2\)\{width:10%\}/.test(medio) && /nth-child\(4\)\{width:140px\}/.test(medio));
ok('pantalla ancha (1760 o más): sale la columna y se quita el renglón de abajo, sin achicar las otras columnas', /td\.cr-vend-col\{display:table-cell\}/.test(ancho) && /\.cr-vend-bajo\{display:none\}/.test(ancho) && !/nth-child/.test(ancho));

// ── 3. La ventana «Detalle del Crédito» ──
const abrir = id => { els.mbd = undefined; ctx.openAmort(id); return String((els.mbd || {}).innerHTML || ''); };
let d = abrir('M-438');
ok('el detalle abre y trae la etiqueta del concesionario', /Detalle del Crédito/.test(doc.getElementById('mtt').textContent) && /data-chip="concesionario"[^>]*>CONCESIONARIO · EMPIRE BELLO MONTE<\/span>/.test(d));
ok('...y, al lado, «VENDEDOR · HEYMAR PRUEBA»', /data-chip="vendedor"[^>]*>VENDEDOR · HEYMAR PRUEBA<\/span>/.test(d) && d.indexOf('data-chip="concesionario"') < d.indexOf('data-chip="vendedor"'));
d = abrir('M-436');
ok('en un crédito viejo también sale su vendedor', /VENDEDOR · MIGUEL PRUEBA/.test(d));
d = abrir('M-433');
ok('sin vendedor no sale la etiqueta (y la del concesionario sigue)', !/data-chip="vendedor"/.test(d) && /CONCESIONARIO · EMPIRE BELLO MONTE/.test(d));
S.creds.push(cred('430', { concesionarioId: '', vendedorUid: 'u-heymar' }));
d = abrir('M-430');
ok('sin concesionario pero con vendedor: sale solo la del vendedor', /data-chip="vendedor"/.test(d) && !/data-chip="concesionario"/.test(d));
d = abrir('M-431');
ok('un nombre con signos raros tampoco rompe la ventana', /VENDEDOR · LIZ &lt;B&gt;PRUEBA&lt;\/B&gt;/.test(d));
S.creds.pop();

// ── 4. El CSV de créditos ──
ok('el CSV de créditos trae la columna Vendedor al final', /'Cuotas pagadas','En mora','Vendedor'\]\)\);/.test(src('logic/reportes.js')) && /c\.mora\|\|0,\(typeof _credVendedorNombre==='function'\?_credVendedorNombre\(c\)/.test(src('logic/reportes.js')));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
