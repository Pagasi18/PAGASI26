// 20-nov-2026, Adam, en el Catálogo web: "aquí necesito que me pongas un botón que diga crear
// folleto y se cree un folleto con los precios de cada concesionario... con este estilo igual"
// (dos imágenes: «Pagasi × ZONTES» y «Pagasi × BERA»).
//  · El botón «Crear folleto» sale en la franja de cada concesionario de la tabla.
//  · El folleto lleva los modelos visibles en la web y con precio, con LA MISMA inicial y las
//    mismas cuotas de la tabla.
//  · SIEMPRE una sola hoja TAMAÑO CARTA (Adam, 20-nov: "cuando hay muchas motos el sistema crea 2
//    separados... necesito que siempre sea uno" y "esto lo imprimimos... tiene que ser tamaño
//    estándar"): 2550 × 3300 px (8,5 × 11 pulgadas). Con muchos modelos las filas se achican.
//  · Abajo van el Instagram y el teléfono. Se descarga o se imprime; no escribe nada en el catálogo.
//  · En vez de la moto va el LOGO DE LA MARCA, en blanco (Adam, 21-nov: "creo que en vez de la moto
//    vamos a poner el logo de la marca.. ejemplo bera" y "pon los logos en blanco"). Las marcas que
//    todavía no tienen logo cargado siguen saliendo con la moto.
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
const avisos = []; ctx.toast = m => avisos.push(String(m));
const registro = []; ctx.logActividad = (a, m, id, d) => registro.push({ a, id, d });
ctx.setMicon = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
const S = ctx.S, el = id => doc.getElementById(id);

// La base de mentira
const escritos = [], cat = {};
let n = 0;
const moto = (conc, sede, modelo, precio, foto, extra) => { const id = ++n; cat[id] = Object.assign({ id, modelo, name: modelo, sede: 'x', sedeName: sede, precio, disponible: true, orden: id, image: foto || '' }, conc ? { concesionarioId: conc } : {}, extra || {}); return id; };
// BERA: dos grupos de nombre (mayúsculas distintas), el mismo concesionario del sistema
[['MILAN', 1025, 'f/milan.jpg'], ['ANTIKING', 1042, 'f/antiking.jpg'], ['SBR', 958, ''], ['BRX', 1238, 'https://firebasestorage.googleapis.com/v0/b/x/o/brx.jpg?alt=media&token=abc']].forEach(x => moto('CO-BERA', 'BERA CHACAO', x[0], x[1], x[2]));
[['leon', 1025, ''], ['Morini   X-Cape', 9300, ''], ['MORINI X-CAPE', 9700, ''], ['RUNNER', 1133, ''], ['RUNNER', 1133, 'f/runner.jpg']].forEach(x => moto('CO-BERA', 'BERA Chacao', x[0], x[1], x[2]));
moto('CO-BERA', 'BERA Chacao', 'COBRA', 1670, 'f/cobra.jpg', { disponible: false });
moto('CO-BERA', 'BERA Chacao', 'BWS', null, 'f/bws.jpg');
moto('CO-BERA', 'BERA Chacao', 'BORRADA', 900, '', { eliminado: true });
for (let i = 1; i <= 21; i++) moto('CO-EMP', 'EMPIRE Bello Monte', 'MODELO ' + String(i).padStart(2, '0'), 1000 + i * 50, i === 5 ? 'f/m5.jpg' : '');
[['KAVAK', 1730, ''], ['PIAGGIO VESPA GTS 310CC AÑO 2026', 14420, ''], ['MILAN', 1365, '']].forEach(x => moto('CO-ARI', 'ARI BENZA', x[0], x[1], x[2]));
moto('', 'Nombre Viejo', 'VIEJA 150', 900, ''); moto('', 'NOMBRE VIEJO', 'VIEJA 200', 1300, '');
moto('CO-VACIO', 'TODO OCULTO', 'NADA', 1000, '', { disponible: false });
cat._condiciones = { apy: 500, seguroPct: 0, inicialMin: 40, inicialMax: 60, plazos: [6, 9, 12] };
ctx.db = { collection(){ return { get(){ return Promise.resolve({ forEach(fn){ Object.keys(cat).forEach(id => fn({ id, data: () => cat[id] })); } }); },
  doc(id){ return { _id: id, set(d){ escritos.push({ id, d }); return Promise.resolve(); } }; } }; }, batch(){ return { set(){}, commit(){ return Promise.resolve(); } }; } };
S.concesionarios = [{ id: 'CO-BERA', nombre: 'BERA Chacao' }, { id: 'CO-EMP', nombre: 'EMPIRE Bello Monte' }, { id: 'CO-ARI', nombre: 'Ari Benza' }, { id: 'CO-VACIO', nombre: 'Todo Oculto' }];
S.currentUser = { uid: 'adm', nombre: 'Adam', rol: 'Administrador', permisos: [] };

// Un lienzo de mentira que anota lo que se escribe y se dibuja
function lienzo(){
  const t = [], img = [], cajas = [];
  const c = { font: '', fillStyle: '', textAlign: '', textBaseline: '', globalAlpha: 1,
    measureText(s){ const px = +(String(c.font).match(/(\d+(?:\.\d+)?)px/) || [0, 20])[1]; return { width: String(s).length * px * .56 }; },
    fillText(s, x, y){ t.push({ s: String(s), x, y, font: c.font, color: c.fillStyle }); }, drawImage(...a){ img.push(a); },
    fillRect(x, y, w, h){ cajas.push({ x, y, w, h }); }, createLinearGradient(){ return { addColorStop(){} }; }, createRadialGradient(){ return { addColorStop(){} }; }, arc(){}, scale(){}, quadraticCurveTo(){}, rect(){},
    save(){}, restore(){}, beginPath(){}, closePath(){}, moveTo(){}, lineTo(){}, arcTo(){}, fill(){}, stroke(){}, clip(){}, translate(){}, rotate(){}, transform(){} };
  const cv = { width: 0, height: 0, getContext(){ return c; }, toBlob(fn){ fn({ size: 1234, type: 'image/png' }); }, t, img };
  cv.dice = s => t.some(q => q.s === s); cv.textos = () => t.map(q => q.s);
  return cv;
}
const M = v => '$' + (+v || 0).toLocaleString('en-US');

(async () => {
  await ctx.catCargar(true);
  const c = ctx.catCondiciones();

  // ── 1. De quién es cada modelo ──
  const m1 = cat[1], m5 = cat[5];
  ok('«BERA CHACAO» y «BERA Chacao» son el mismo concesionario (por su id del sistema)', ctx._catFolletoClave(m1) === 'c:CO-BERA' && ctx._catFolletoClave(m5) === 'c:CO-BERA');
  ok('los nombres viejos sin asignar van por el nombre, sin mayúsculas ni tildes', ctx._catFolletoClave({ sedeName: 'Nombre  Viéjo' }) === 'n:nombre viejo' && ctx._catFolletoClave({ sedeName: 'NOMBRE VIEJO' }) === 'n:nombre viejo');

  // ── 2. Lo que lleva el folleto ──
  const d = ctx.catFolletoDatos('c:CO-BERA');
  ok('junta los dos grupos y deja solo lo que se ve en la web con precio (ni ocultos, ni sin precio, ni eliminados)', d.filas.map(f => f.modelo).join('|') === 'ANTIKING|BRX|LEON|MILAN|MORINI X-CAPE|MORINI X-CAPE|RUNNER|SBR');
  ok('en orden alfabético, con el nombre en mayúsculas y sin espacios dobles', d.filas[2].modelo === 'LEON' && d.filas[4].modelo === 'MORINI X-CAPE');
  ok('el mismo modelo con dos precios sale las dos veces (del más barato al más caro)', d.filas[4].precio === 9300 && d.filas[5].precio === 9700);
  ok('el mismo modelo cargado dos veces con el mismo precio sale una sola vez (y conserva la foto de la copia que la tiene)', d.filas.filter(f => f.modelo === 'RUNNER').length === 1 && d.filas.filter(f => f.modelo === 'RUNNER')[0].image === 'f/runner.jpg');
  ok('avisa cuántos no salen (1 oculto y 1 sin precio)', d.fuera === 2);
  const tabla = ctx.PG.catalogo();
  const fila = id => (tabla.match(new RegExp('<tr data-id="' + id + '"[^]*?</tr>')) || [''])[0];
  const enTabla = d.filas.every(f => { const h = fila(f.id); return h.includes('>' + M(f.inicial) + '</td>') && f.cuotas.every(q => h.includes('>' + M(q) + '</td>')); });
  ok('la inicial y las cuotas son las MISMAS que muestra la tabla del catálogo, modelo por modelo', enTabla && d.filas.length === 8);
  const ant = d.filas[0], plan = ctx.catPlan(cat[2], 12, c.inicialMin / 100);
  ok('ANTIKING ($1.042): inicial 40% = $417 y tres cuotas (6, 9 y 12 meses), de mayor a menor', ant.inicial === 417 && ant.inicial === plan.inicial && ant.cuotas.length === 3 && ant.cuotas[0] > ant.cuotas[1] && ant.cuotas[1] > ant.cuotas[2] && ant.cuotas[2] === plan.quincenal);
  ok('los plazos y la inicial salen de las condiciones del plan', d.plazos.join() === '6,9,12' && d.inicialPct === 40);
  ok('nombre del concesionario como está en el sistema, en mayúsculas', d.nombre === 'BERA CHACAO');
  ok('título con la marca cuando el nombre la trae: «Tu Bera.»', d.marca === 'Bera' && d.titulo === 'Tu Bera.');
  ok('...«Tu Empire.», «Tu Toro.», «Tu Veloz.», «Tu Piaggio.»', ['EMPIRE Bello Monte', 'MOTOS TORO SABANA GRANDE', 'VELOZ MOTORCYCLES CHACAO', 'PIAGGIO EL HATILLO'].map(ctx._catFolletoMarca).join() === 'Empire,Toro,Veloz,Piaggio');
  ok('...y «Tu moto.» cuando no (ARI BENZA); una marca dentro de otra palabra no cuenta', ctx.catFolletoDatos('c:CO-ARI').titulo === 'Tu moto.' && ctx._catFolletoMarca('LIBERATORE') === '' && ctx._catFolletoMarca('Motos Toro') === 'Toro');
  ok('las fotos para elegir: solo de modelos que salen en el folleto', d.fotos.map(f => f.modelo).join() === 'ANTIKING,BRX,MILAN,RUNNER' && d.fotos[0].url === 'f/antiking.jpg');
  ok('sin recortes cargados, ninguna foto va recortada', d.fotos.every(f => f.recorte === ''));
  const viejo = ctx.catFolletoDatos('n:nombre viejo');
  ok('un nombre viejo sin asignar también tiene folleto (junta sus dos formas de escribirlo)', viejo.filas.length === 2 && /NOMBRE VIEJO/.test(viejo.nombre));
  ok('concesionario con todo oculto: sin filas', ctx.catFolletoDatos('c:CO-VACIO').filas.length === 0 && ctx.catFolletoDatos('c:NO-EXISTE').filas.length === 0);
  cat._condiciones.inicialMin = 30; await ctx.catCargar(true);
  const d30 = ctx.catFolletoDatos('c:CO-BERA');
  ok('si cambian la inicial a 30%, el folleto cambia con ella ($313 y cuotas más altas)', d30.inicialPct === 30 && d30.filas[0].inicial === 313 && d30.filas[0].cuotas[2] > ant.cuotas[2]);
  cat._condiciones.inicialMin = 40; await ctx.catCargar(true);

  // ── 3. Siempre una sola imagen ──
  const F = vm.runInContext('CAT_FOLLETO', ctx);
  ok('la hoja es tamaño carta: 2550 × 3300 píxeles (8,5 × 11 pulgadas a calidad de imprenta)', F.PX_ANCHO === 2550 && F.PX_ALTO === 3300 && Math.abs(F.PX_ANCHO / F.PX_ALTO - 8.5 / 11) < 0.0005 && Math.abs(F.W / F.H - 8.5 / 11) < 0.001);
  ok('no hay otros tamaños ni páginas', typeof ctx.catFolletoAlto === 'undefined' && typeof ctx._catFolletoPaginar === 'undefined' && typeof ctx.catFolletoPagina === 'undefined');
  const emp = ctx.catFolletoDatos('c:CO-EMP');
  ok('EMPIRE (21 modelos): un solo folleto con los 21, sin páginas', emp.filas.length === 21 && !('paginas' in emp) && typeof ctx._catFolletoPaginar === 'undefined' && typeof ctx.catFolletoPagina === 'undefined');
  ok('nombre del archivo: concesionario y fecha, uno solo', /^folleto-pagasi-bera-chacao-\d{4}-\d\d-\d\d\.png$/.test(ctx.catFolletoArchivo(d)) && /^folleto-pagasi-empire-bello-monte-\d{4}-\d\d-\d\d\.png$/.test(ctx.catFolletoArchivo(emp)));
  ok('el gancho «cuotas desde»: la cuota más baja de todo el folleto', d.desde === Math.min(...d.filas.map(f => Math.min(...f.cuotas))) && d.desde === d.filas.find(f => f.modelo === 'SBR').cuotas[2] && ctx.catFolletoDatos('c:CO-VACIO').desde === 0);
  ok('el contacto que va abajo: el Instagram y el teléfono que muestra pagasi.io', d.contacto.instagram === '@pagasi.io' && d.contacto.telefono === '0424-217-7798' && /wa\.me\/584242177798/.test(src('index.html')));

  // ── 4. El dibujo ──
  let cv = lienzo(), r = ctx.catFolletoDibujar(cv, d, {});
  ok('con 8 modelos: una hoja carta (2550 × 3300)', cv.width === 2550 && cv.height === 3300 && r.ancho === 1080 && r.alto === 1398);
  ok('cabecera: Pagasi × BERA CHACAO y pagasi.io', cv.dice('BERA CHACAO') && cv.dice('×') && cv.dice('pagasi.io'));
  ok('título como en la muestra: «ELIGE TU PRÓXIMA MOTO» / «Tu Bera.» / «En cuotas.»', cv.dice('Tu Bera.') && cv.dice('En cuotas.') && 'ELIGE TU PRÓXIMA MOTO'.split('').every(ch => cv.dice(ch)));
  const pocas = lienzo(); ctx.catFolletoDibujar(pocas, ctx.catFolletoDatos('c:CO-ARI'), {});
  ok('«Elige tu modelo y tu plazo.» sale cuando hay sitio (pocos modelos); con más, queda solo el gancho del precio', pocas.dice('Elige tu modelo y tu plazo.') && pocas.dice('por quincena') && !cv.dice('Elige tu modelo y tu plazo.') && cv.dice('por quincena'));
  ok('tabla: título, MODELO, INICIAL MÍNIMA, CUOTA QUINCENAL y los tres plazos', cv.dice('BERA CHACAO · PLANES DISPONIBLES') && cv.dice('MODELO') && cv.dice('INICIAL') && cv.dice('MÍNIMA') && cv.dice('CUOTA QUINCENAL') && cv.dice('6 MESES') && cv.dice('9 MESES') && cv.dice('12 MESES'));
  ok('cada modelo con su inicial y sus tres cuotas', d.filas.every(f => cv.dice(f.modelo) && cv.dice(M(f.inicial)) && f.cuotas.every(q => cv.dice(M(q)))));
  ok('los miles con coma, como en la muestra ($3,720)', cv.dice('$3,720') && cv.dice('$3,880'));
  ok('botón «Solicitar en pagasi.io» y la letra pequeña con la fecha de los precios', cv.dice('Solicitar en pagasi.io') && cv.textos().some(s => /^Plan sujeto a evaluación y aprobación\. Imagen referencial\. Precios al \d\d\/\d\d\/\d{4}\.$/.test(s)));
  ok('abajo salen el Instagram y el teléfono', cv.dice('@pagasi.io') && cv.dice('0424-217-7798'));
  const sinC = lienzo(); ctx.catFolletoDibujar(sinC, Object.assign({}, d, { contacto: { instagram: '', telefono: '0412-000-0000' } }), {});
  ok('...y si uno falta, sale solo el otro', !sinC.dice('@pagasi.io') && sinC.dice('0412-000-0000'));
  ok('diseño nuevo: «pagasi.io», la pastilla «CUOTAS DESDE $… por quincena» y la etiqueta «INICIAL DESDE 40%»', cv.dice('pagasi.io') && 'CUOTASDESDE'.split('').every(ch => cv.dice(ch)) && cv.dice(M(d.desde)) && cv.dice('por quincena') && cv.dice('INICIAL DESDE 40%'));
  ok('...la cuota más baja (12 meses) va resaltada: su encabezado en blanco y sus valores en azul', cv.t.some(q => q.s === '12 MESES' && q.color === '#fff') && cv.t.some(q => q.s === '6 MESES' && q.color !== '#fff') && d.filas.every(f => cv.t.some(q => q.s === M(f.cuotas[2]) && q.color === '#1F3FF0')));
  ok('sin foto ni logo cargados igual se dibuja (el logo, escrito)', r.conFoto === false && cv.dice('Pagasi') && cv.img.length === 0 && r.filas === 8);
  ok('nunca dice «Página»: no hay páginas', !cv.textos().some(s => /^Página/.test(s)));
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, d, { logo: { width: 955, height: 256 }, foto: { naturalWidth: 800, naturalHeight: 600 } });
  ok('con logo y foto: los dibuja (logo en la cabecera y la foto de la moto)', r.conFoto === true && cv.img.length >= 2 && !cv.dice('Pagasi'));
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, emp, {});
  ok('EMPIRE: los 21 modelos en UNA hoja carta', cv.width === 2550 && cv.height === 3300 && r.filas === 21 && emp.filas.every(f => cv.dice(f.modelo)) && !cv.textos().some(s => /Página/.test(s)));
  const con = k => Object.assign({}, emp, { filas: Array.from({ length: k }, (_, i) => emp.filas[i % emp.filas.length]) });
  const medidas = [1, 3, 9, 10, 11, 14, 15, 16, 21, 22, 23, 26, 30, 40, 50].map(k => Object.assign({ k }, ctx.catFolletoDibujar(lienzo(), con(k), {})));
  const md = k => medidas.find(q => q.k === k);
  ok('la tabla nunca se sale de la hoja: queda entre la cabecera y el botón con 1, 21, 30, 40 o 50 modelos', medidas.every(q => q.filas === q.k && q.alto === 1398 && q.cardY >= 290 && q.cardY + q.cardH <= 1398 - 70 - 92 - 28 + 1));
  ok('pocas filas van grandes: 74 con 3, 54 con 9, 50 con 10 u 11, 41 con 14', md(3).rh === 74 && md(9).rh === 54 && md(10).rh === 50 && md(11).rh === 50 && md(14).rh === 41);
  ok('de 15 a 22 el encabezado se compacta y las filas quedan entre 40 y 30', md(15).rh === 40 && md(16).rh === 40 && md(21).rh === 31 && md(22).rh === 30 && md(15).denso && !md(14).denso);
  ok('con 23 o más el título pasa a una línea y la tabla gana sitio: 32, 28, 25, 18 y 15', md(23).rh === 32 && md(26).rh === 28 && md(30).rh === 25 && md(40).rh === 18 && md(50).rh === 15);
  ok('el título se adapta: completo, mediano y en una línea', md(9).modo === 'completo' && md(14).modo === 'completo' && md(21).modo === 'medio' && md(30).modo === 'mini' && md(50).modo === 'mini');
  ok('la letra de la tabla: 31 con 9 modelos, 18 con 21 y 14 con 30 (impresa en carta, ~8 puntos)', md(9).letra === 31 && md(21).letra === 18 && md(30).letra === 14 && md(40).letra === 10);
  const mini = lienzo(); ctx.catFolletoDibujar(mini, con(30), {});
  ok('con 30 modelos sigue trayendo título, gancho, tabla, botón y contacto', mini.dice('Tu Empire.') && mini.dice('En cuotas.') && mini.dice('por quincena') && mini.dice('EMPIRE BELLO MONTE · PLANES DISPONIBLES') && mini.dice('Solicitar en pagasi.io') && mini.dice('@pagasi.io') && !'ELIGE'.split('').every(ch => mini.dice(ch)));
  const largo = ctx.catFolletoDatos('c:CO-ARI'); cv = lienzo(); ctx.catFolletoDibujar(cv, largo, {});
  ok('un nombre largo va en dos líneas, sin cortarse', cv.dice('PIAGGIO VESPA GTS') && cv.dice('310CC AÑO 2026') && !cv.textos().some(s => /…/.test(s)));

  // ── 4b. La moto recortada (sin fondo): grande y sin recuadro ──
  // El índice dice de qué foto salió cada recorte: MILAN (id 1) y BRX (id 4, foto del almacén) al día; ANTIKING (id 2) de una foto vieja
  cat[4].imagePath = 'catalogo/4-111.jpg';
  await ctx.catCargar(true);
  vm.runInContext("_catFolleto.indice = { '1': { a:'1.webp', de:'f/milan.jpg', w:1000, h:660, n:900, c:0 }, '4': { a:'4.webp', de:'catalogo/4-111.jpg', w:800, h:1000, n:1400, c:1 }, '9': { a:'9.webp', de:'f/runner.jpg', w:700, h:500, n:430, c:0 }, '2': { a:'2.webp', de:'f/antiking-VIEJA.jpg', w:720, h:500, n:1300, c:0 } }", ctx);
  const dr = ctx.catFolletoDatos('c:CO-BERA'), fr = k => dr.fotos.find(f => f.modelo === k);
  ok('el modelo con recorte al día lo usa (archivo del propio sistema)', fr('MILAN').recorte === 'assets/catalogo-recortes/1.webp' && fr('BRX').recorte === 'assets/catalogo-recortes/4.webp');
  ok('...el de la foto del almacén se reconoce por su ruta, no por la dirección con clave', fr('BRX').url.indexOf('token=') > -1 && fr('BRX').recorte !== '');
  ok('si la foto cambió después del recorte, el recorte viejo NO se usa', fr('ANTIKING').recorte === '');
  ok('cada recorte trae su nitidez y si la foto venía cortada de origen', fr('MILAN').nitidez === 900 && fr('MILAN').cortada === false && fr('BRX').nitidez === 1400 && fr('BRX').cortada === true && fr('RUNNER').nitidez === 430);
  ok('la foto que sale sola: de las recortadas, la más nítida que no venga cortada (MILAN; BRX es más grande pero viene cortada; RUNNER es pequeña)', ctx._catFolletoFotoInicial(dr) === String(fr('MILAN').id) && ctx._catFolletoFotoInicial(d) === String(d.fotos[0].id) && ctx._catFolletoFotoInicial({ fotos: [] }) === '');
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, dr, { logo: { width: 955, height: 256 }, foto: { naturalWidth: 720, naturalHeight: 480 }, recortada: true });
  ok('recortada: va flotando, grande (más de 440 de ancho), completa sobre el azul y apoyada justo encima de la tabla (sin pisarla)', r.flota === true && r.moto.w > 440 && r.moto.w <= 560 && Math.abs((r.moto.y + r.moto.h) - (r.cardY - 6)) < 1 && r.moto.x + r.moto.w <= 1080 - 28 + 1);
  ok('...sin salirse por arriba de la cabecera y dejando 440 de ancho al título', r.moto.y >= 116 && r.tam >= 60);
  ok('...y SIN sombra alrededor del contorno (la hacía ver como calcomanía): solo la del piso, y cortada donde empieza la tabla', !/shadowColor[^;]*;[^\n]*drawImage\(r\.foto, moto\.x/.test(src('logic/catalogo-folleto.js')) && /x\.rect\(0, 0, W, cardY\); x\.clip\(\);/.test(src('logic/catalogo-folleto.js')));
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, dr, { foto: { naturalWidth: 480, naturalHeight: 720 }, recortada: true });
  ok('una moto vertical (scooter) también cabe: no pasa de la cabecera', r.flota && r.moto.y >= 116 && r.moto.h <= 560);
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, dr, { foto: { naturalWidth: 800, naturalHeight: 600 }, recortada: false });
  ok('sin recortar sigue saliendo en su tarjeta blanca', r.flota === false && r.moto === null && r.conFoto === true);
  const medidasR = [1, 8, 13, 15, 16, 21, 30, 40, 50].map(k => ctx.catFolletoDibujar(lienzo(), con(k), { foto: { naturalWidth: 720, naturalHeight: 470 }, recortada: true }));
  ok('con cualquier cantidad de filas la moto queda dentro de la hoja y bajo la cabecera', medidasR.every(q => q.moto.y >= 116 && q.moto.x >= 480 && q.moto.w >= 120 && q.moto.x + q.moto.w <= 1053));
  const pedidos = []; ctx.fetch = u => { pedidos.push(String(u)); return Promise.resolve({ ok: true, json: () => Promise.resolve({ v: 1, motos: { '9': { a: '9.webp', de: 'x', w: 1, h: 1 } } }) }); };
  vm.runInContext('_catFolleto.indice = null; _catFolleto.indiceP = null', ctx);
  const ind = await ctx._catFolletoIndice(); await ctx._catFolletoIndice();
  ok('el índice de recortes se lee una sola vez, del propio sistema', pedidos.length === 1 && pedidos[0] === 'assets/catalogo-recortes/indice.json' && ind['9'].a === '9.webp');
  ctx.fetch = () => Promise.reject(new Error('sin red')); vm.runInContext('_catFolleto.indice = null; _catFolleto.indiceP = null', ctx);
  ok('si el índice no se puede leer, el folleto sigue (sin recortes)', JSON.stringify(await ctx._catFolletoIndice()) === '{}' && ctx.catFolletoDatos('c:CO-BERA').fotos.every(f => f.recorte === ''));
  const indReal = JSON.parse(src('assets/catalogo-recortes/indice.json'));
  const idsReal = Object.keys(indReal.motos);
  ok('los recortes del repositorio (versión 6: silueta de un recortador y huecos del otro, sin fondo entre los rayos): cada uno con su archivo, su foto de origen, sus medidas y su nitidez', indReal.v === 6 && idsReal.length >= 150 && idsReal.every(k => { const q = indReal.motos[k]; return q.a === k + '.webp' && q.de && q.w > 0 && q.h > 0 && Math.max(q.w, q.h) <= 1000 && q.n >= Math.max(q.w, q.h) - 2 && (q.c === 0 || q.c === 1) && fs.existsSync(path.join(ROOT, 'assets/catalogo-recortes', q.a)); }));
  ok('...sin archivos sueltos y sin pesar de más (menos de 16 MB en total)', fs.readdirSync(path.join(ROOT, 'assets/catalogo-recortes')).filter(f => f !== 'indice.json').every(f => idsReal.includes(f.replace('.webp', ''))) && fs.readdirSync(path.join(ROOT, 'assets/catalogo-recortes')).reduce((t, f) => t + fs.statSync(path.join(ROOT, 'assets/catalogo-recortes', f)).size, 0) < 16e6);
  delete cat[4].imagePath; await ctx.catCargar(true);

  // ── 4c. El logo de la marca en vez de la moto ──
  const LOGOS = vm.runInContext('CAT_FOLLETO_LOGOS', ctx);
  ok('hay logo en blanco de Bajaj, Benmo, Bera, Empire (Keeway), Haojin, Piaggio, Toro y Veloz, y los archivos existen', Object.keys(LOGOS).sort().join() === 'Bajaj,Benmo,Bera,Empire,Haojin,Piaggio,Toro,Veloz' && Object.values(LOGOS).every(f => fs.existsSync(path.join(ROOT, 'assets/marcas', f))) && fs.readdirSync(path.join(ROOT, 'assets/marcas')).sort().join() === Object.values(LOGOS).sort().join());
  const png = f => { const b = fs.readFileSync(path.join(ROOT, 'assets/marcas', f)); return { ok: b.slice(1, 4).toString() === 'PNG', w: b.readUInt32BE(16), h: b.readUInt32BE(20), alfa: b[25] === 6, kb: b.length / 1024 }; };
  ok('...son PNG con transparencia, de 700 a 1200 de ancho y livianos (menos de 120 KB cada uno)', Object.values(LOGOS).every(f => { const q = png(f); return q.ok && q.alfa && q.w >= 700 && q.w <= 1200 && q.h > 100 && q.kb < 120; }));
  const dB = ctx.catFolletoDatos('c:CO-BERA'), dA = ctx.catFolletoDatos('c:CO-ARI'), dE = ctx.catFolletoDatos('c:CO-EMP');
  ok('BERA CHACAO → logo de Bera; EMPIRE → Empire Keeway', dB.logoMarca === 'assets/marcas/bera.png' && dE.logoMarca === 'assets/marcas/empire-keeway.png');
  ok('por nombre, todos los concesionarios de hoy tienen logo: Toro, Veloz, Haojin, Piaggio, Bajaj y Benmo', ['MOTOS TORO SABANA GRANDE', 'TORO SANTA MONICA', 'VELOZ PTO LA CRUZ', 'VELOZ MOTORCYCLES CHACAO', 'HAOJIN', 'PIAGGIO EL HATILLO', 'BAJAJ MARQUEZ', 'BENMO MOTOS ANDRES BELLO', 'BERA PETARE', 'BERA TRINIDAD', 'EMPIRE Bello Monte'].every(n => !!LOGOS[ctx._catFolletoMarca(n)]));
  // ARI BENZA es Benmo Motos El Llanito (Adam, 21-nov-2026)
  ok('ARI BENZA sale en el folleto como BENMO MOTOS EL LLANITO, con el logo de Benmo', dA.nombre === 'BENMO MOTOS EL LLANITO' && dA.nombreSistema === 'ARI BENZA' && dA.marca === 'Benmo' && dA.logoMarca === 'assets/marcas/benmo-motos.png');
  ok('...Benmo es una tienda de varias marcas: lleva su logo pero el título es «Tu moto.»', dA.titulo === 'Tu moto.' && ctx.catFolletoDatos('c:CO-BERA').titulo === 'Tu Bera.');
  ok('...y el archivo se llama por el nombre que sale en el folleto', /^folleto-pagasi-benmo-motos-el-llanito-\d{4}-\d\d-\d\d\.png$/.test(ctx.catFolletoArchivo(dA)));
  const sinLogo = Object.assign({}, dA, { logoMarca: '' });
  ok('con logo, eso es lo que sale solo; un concesionario sin logo sale con la moto de siempre', ctx._catFolletoImagenInicial(dB) === '__logo' && ctx._catFolletoImagenInicial(dA) === '__logo' && ctx._catFolletoImagenInicial(sinLogo) === ctx._catFolletoFotoInicial(dA));
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, dB, { logo: { width: 955, height: 256 }, marca: { naturalWidth: 1200, naturalHeight: 580 }, foto: { naturalWidth: 720, naturalHeight: 480 }, recortada: true });
  ok('con el logo de la marca NO se dibuja ninguna moto (aunque llegue una)', !!r.marca && r.moto === null && r.flota === false && r.conFoto === false);
  ok('...el logo va a la derecha del título, dentro de la hoja y por encima de la tabla', r.marca.w <= 440 && r.marca.w > 300 && r.marca.x + r.marca.w <= 1080 - 54 + 1 && r.marca.y >= 116 && r.marca.y + r.marca.h <= r.cardY);
  ok('...y el título, el gancho y la tabla siguen saliendo', cv.dice('Tu Bera.') && cv.dice('En cuotas.') && cv.dice('por quincena') && dB.filas.every(f => cv.dice(f.modelo)));
  const logoR = [1, 9, 16, 21, 30, 40].map(k => ctx.catFolletoDibujar(lienzo(), con(k), { marca: { naturalWidth: 1200, naturalHeight: 427 } }));
  ok('con cualquier cantidad de modelos el logo cabe entre la cabecera y la tabla', logoR.every(q => q.marca && q.marca.y >= 116 && q.marca.y + q.marca.h <= q.cardY && q.marca.h >= 55));
  const ancho4 = ctx.catFolletoDibujar(lienzo(), dB, { marca: { naturalWidth: 1200, naturalHeight: 176 } });
  ok('un logo muy alargado (Haojin) usa todo el ancho permitido', Math.round(ancho4.marca.w) === 440 && ancho4.marca.h < 70);

  // ── 5. El botón en la tabla ──
  const grupos = [...tabla.matchAll(/<tr class="cat-grupo"[^]*?<\/tr>/g)].map(x => x[0]);
  ok('cada franja de concesionario trae su botón «Crear folleto»', grupos.length >= 6 && grupos.every(g => (g.match(/>Crear folleto<\/button>/g) || []).length === 1));
  ok('...que abre el folleto de ESE concesionario', grupos.filter(g => /data-cat-folleto="c:CO-BERA"/.test(g) && /onclick="catFolleto\(&quot;c:CO-BERA&quot;\)"/.test(g)).length === 2 && grupos.some(g => /data-cat-folleto="n:nombre viejo"/.test(g)));
  ok('...a la derecha en pantalla ancha', grupos.every(g => /data-cat-folleto="[^"]*" style="float:right;/.test(g)));
  ctx.innerWidth = 390;
  ok('...y pegado al nombre en el teléfono (la tabla se corre de lado)', [...ctx.PG.catalogo().matchAll(/data-cat-folleto="[^"]*" style="([^"]*)"/g)].every(x => /^margin-left:10px;/.test(x[1]) && !/float/.test(x[1])));
  ctx.innerWidth = 1440;
  ok('el botón viejo «Asignar concesionario del sistema» sigue en los nombres sin asignar', grupos.some(g => /Asignar concesionario del sistema/.test(g) && /Crear folleto/.test(g)));

  // ── 6. La ventana y la descarga ──
  const cvVentana = lienzo(); els.cf_canvas = cvVentana;
  const anclas = []; doc.createElement = t => { const e = elemento(); if (t === 'a') { e.click = () => anclas.push({ download: e.download, href: e.href }); } return e; };
  ctx.URL = { createObjectURL: () => 'blob:prueba', revokeObjectURL(){} };
  const antes = escritos.length;
  await ctx.catFolleto('c:CO-BERA');
  ok('«Crear folleto» abre la ventana con el nombre, cuántos modelos lleva y que es una hoja carta', el('mtt').textContent === 'Folleto de BERA CHACAO' && /^8 modelos · inicial 40% · una hoja tamaño carta/.test(el('msb').textContent) && el('ov').style.display === 'flex');
  ok('...con la vista previa y la lista «Imagen del folleto»: el logo de la marca, las motos y «Sin imagen»', /<canvas id="cf_canvas" width="2550" height="3300"/.test(el('mbd').innerHTML) && /<label>Imagen del folleto<\/label>/.test(el('mbd').innerHTML) && /<option value="__logo">Logo de Bera<\/option>/.test(el('mbd').innerHTML) && (el('mbd').innerHTML.match(/<option /g) || []).length === 6 && /Moto: ANTIKING/.test(el('mbd').innerHTML) && /Sin imagen<\/option>/.test(el('mbd').innerHTML));
  ok('lo que sale solo es el logo de la marca, no una moto', vm.runInContext('_catFolleto.fotoId', ctx) === '__logo');
  ok('...y los botones Cerrar, Imprimir y Descargar imagen', /closeM\(\)/.test(el('mft').innerHTML) && /catFolletoImprimir\(\)/.test(el('mft').innerHTML) && /catFolletoDescargar\(\)/.test(el('mft').innerHTML) && /Descargar imagen/.test(el('mft').innerHTML));
  ok('la vista previa quedó dibujada con el folleto', cvVentana.dice('Tu Bera.') && cvVentana.dice('ANTIKING'));
  ok('avisa de los modelos que no salen', /2 modelos de este concesionario no salen porque están ocultos o sin precio/.test(el('cf_nota').innerHTML));
  ok('sin flechas de página: es una sola imagen', !/catFolletoPagina|cf_pag|Página/.test(el('mbd').innerHTML) && (el('mbd').innerHTML.match(/<canvas /g) || []).length === 1);
  await ctx.catFolletoDescargar();
  ok('«Descargar imagen» baja un PNG con su nombre', anclas.length === 1 && /^folleto-pagasi-bera-chacao-.*\.png$/.test(anclas[0].download) && anclas[0].href === 'blob:prueba' && avisos.some(a => /Folleto descargado/.test(a)));
  ok('...queda anotado en el registro quién lo hizo', registro.at(-1).a === 'catalogo_folleto' && registro.at(-1).id === 'c:CO-BERA' && registro.at(-1).d.modelos === 8 && !('pagina' in registro.at(-1).d));
  await ctx.catFolleto('c:CO-EMP');
  ok('con 21 modelos: la misma hoja carta, una sola vista previa, sin flechas', /<canvas id="cf_canvas" width="2550" height="3300"/.test(el('mbd').innerHTML) && !/catFolletoPagina/.test(el('mbd').innerHTML) && cvVentana.width === 2550 && cvVentana.height === 3300 && emp.filas.every(f => cvVentana.dice(f.modelo)));
  await ctx.catFolletoFoto('');
  ok('se puede elegir «Sin foto» y se vuelve a dibujar', vm.runInContext('_catFolleto.fotoId', ctx) === '' && cvVentana.dice('Tu Empire.'));
  await ctx.catFolletoDescargar();
  ok('se descarga UN archivo con los 21 modelos', /^folleto-pagasi-empire-bello-monte-\d{4}-\d\d-\d\d\.png$/.test(anclas.at(-1).download) && registro.at(-1).d.modelos === 21);
  const ventanas = []; ctx.open = () => { const v = { html: '', document: { write(h){ v.html += h; }, close(){} } }; ventanas.push(v); return v; };
  await ctx.catFolletoImprimir();
  ok('«Imprimir» abre la hoja sola, a tamaño carta y sin márgenes, y llama a la impresora', ventanas.length === 1 && /@page\{size:8\.5in 11in;margin:0\}/.test(ventanas[0].html) && /<img src="blob:prueba"/.test(ventanas[0].html) && /window\.print\(\)/.test(ventanas[0].html) && registro.at(-1).d.impreso === true);
  ctx.open = () => null; avisos.length = 0; await ctx.catFolletoImprimir();
  ok('si el navegador bloquea la ventana, avisa', avisos.some(a => /bloqueó la ventana de impresión/.test(a)));
  avisos.length = 0; el('mtt').textContent = 'otra';
  await ctx.catFolleto('c:CO-VACIO');
  ok('concesionario sin modelos visibles: avisa y no abre nada', avisos.some(a => /no tiene modelos visibles en la web con precio/.test(a)) && el('mtt').textContent === 'otra');
  ok('el folleto no escribe nada en el catálogo', escritos.length === antes && !/_catGuardar|\.set\(|\.update\(|\.delete\(|batch\(/.test(src('logic/catalogo-folleto.js')));
  S.currentUser = { uid: 'liz', nombre: 'Liz', rol: 'Empleado', permisos: ['dash', 'catalogo'] };
  ok('Liz, con el permiso del catálogo, también ve el botón y abre el folleto', /Crear folleto/.test(ctx.PG.catalogo()) && (await ctx.catFolleto('c:CO-ARI'), el('mtt').textContent === 'Folleto de ARI BENZA'));
  S.currentUser = { uid: 'x', nombre: 'Pedro', rol: 'Empleado', permisos: ['dash'] };
  el('mtt').textContent = 'otra';
  ok('sin permiso del catálogo no hay botón ni folleto', !/Crear folleto/.test(ctx.PG.catalogo()) && (ctx.catFolleto('c:CO-BERA'), el('mtt').textContent === 'otra'));

  // ── 7. Lo fijo ──
  const admin = src('admin.html');
  ok('el sistema carga el folleto después del catálogo y antes de su pantalla', admin.indexOf('logic/catalogo.js') > -1 && admin.indexOf('logic/catalogo.js') < admin.indexOf('logic/catalogo-folleto.js') && admin.indexOf('logic/catalogo-folleto.js') < admin.indexOf('modules/catalogo.js'));
  ok('el logo blanco existe', fs.existsSync(path.join(ROOT, 'assets/pagasi-logo-blanco.png')));
  ok('las fotos de otro sitio se piden con permiso entre sitios (si no lo hay, el folleto sale sin foto y se puede descargar)', /im\.crossOrigin = 'anonymous'/.test(src('logic/catalogo-folleto.js')) && /im\.onerror = function\(\)\{ ok\(null\); \}/.test(src('logic/catalogo-folleto.js')));

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
