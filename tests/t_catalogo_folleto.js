// 20-nov-2026, Adam, en el Catálogo web: "aquí necesito que me pongas un botón que diga crear
// folleto y se cree un folleto con los precios de cada concesionario... con este estilo igual"
// (dos imágenes: «Pagasi × ZONTES» y «Pagasi × BERA»).
//  · El botón «Crear folleto» sale en la franja de cada concesionario de la tabla.
//  · El folleto lleva los modelos visibles en la web y con precio, con LA MISMA inicial y las
//    mismas cuotas de la tabla. Hasta 14 por imagen; si hay más, en dos o más páginas parejas.
//  · Es una imagen de 1080 × 1440 que se descarga. No escribe nada en el catálogo.
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
    fillRect(x, y, w, h){ cajas.push({ x, y, w, h }); }, createLinearGradient(){ return { addColorStop(){} }; }, createRadialGradient(){ return { addColorStop(){} }; }, arc(){}, scale(){},
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

  // ── 3. Páginas ──
  const pag = k => ctx._catFolletoPaginar(Array.from({ length: k }, (_, i) => i)).map(p => p.length).join('+');
  ok('hasta 14 modelos caben en una imagen', pag(1) === '1' && pag(11) === '11' && pag(14) === '14');
  ok('con más, se reparten parejo: 15 → 8+7, 21 → 11+10, 30 → 10+10+10', pag(15) === '8+7' && pag(21) === '11+10' && pag(30) === '10+10+10');
  const emp = ctx.catFolletoDatos('c:CO-EMP');
  ok('EMPIRE (21 modelos): dos páginas, sin repetir ni perder ninguno', emp.paginas.length === 2 && emp.paginas[0].length === 11 && emp.paginas[1].length === 10 && emp.paginas[0].concat(emp.paginas[1]).map(f => f.modelo).join() === emp.filas.map(f => f.modelo).join());
  ok('nombre del archivo: concesionario y fecha; con páginas, cuál es', /^folleto-pagasi-bera-chacao-\d{4}-\d\d-\d\d\.png$/.test(ctx.catFolletoArchivo(d, 0)) && /^folleto-pagasi-empire-bello-monte-\d{4}-\d\d-\d\d-2de2\.png$/.test(ctx.catFolletoArchivo(emp, 1)));

  // ── 4. El dibujo ──
  let cv = lienzo(), r = ctx.catFolletoDibujar(cv, d, 0, {});
  ok('la imagen mide 1080 × 1440 (Instagram y WhatsApp)', cv.width === 1080 && cv.height === 1440);
  ok('cabecera: Pagasi × BERA CHACAO y pagasi.io', cv.dice('BERA CHACAO') && cv.dice('×') && cv.dice('pagasi.io'));
  ok('título como en la muestra: «Tu Bera.» / «En cuotas.» / «Elige tu modelo y tu plazo.»', cv.dice('Tu Bera.') && cv.dice('En cuotas.') && cv.dice('Elige tu modelo y tu plazo.') && 'ELIGE TU PRÓXIMA MOTO'.split('').every(ch => cv.dice(ch)));
  ok('tabla: título, MODELO, INICIAL MÍNIMA, CUOTA QUINCENAL y los tres plazos', cv.dice('BERA CHACAO · PLANES DISPONIBLES') && cv.dice('MODELO') && cv.dice('INICIAL') && cv.dice('MÍNIMA') && cv.dice('CUOTA QUINCENAL') && cv.dice('6 MESES') && cv.dice('9 MESES') && cv.dice('12 MESES'));
  ok('cada modelo con su inicial y sus tres cuotas', d.filas.every(f => cv.dice(f.modelo) && cv.dice(M(f.inicial)) && f.cuotas.every(q => cv.dice(M(q)))));
  ok('los miles con coma, como en la muestra ($3,720)', cv.dice('$3,720') && cv.dice('$3,880'));
  ok('botón «Solicitar en pagasi.io» y la letra pequeña con la fecha de los precios', cv.dice('Solicitar en pagasi.io') && cv.textos().some(s => /^Plan sujeto a evaluación y aprobación\. Imagen referencial\. Precios al \d\d\/\d\d\/\d{4}\.$/.test(s)));
  ok('sin foto ni logo cargados igual se dibuja (el logo, escrito)', r.conFoto === false && cv.dice('Pagasi') && cv.img.length === 0 && r.filas === 8);
  ok('con una sola página no dice «Página»', !cv.textos().some(s => /^Página/.test(s)));
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, d, 0, { logo: { width: 955, height: 256 }, foto: { naturalWidth: 800, naturalHeight: 600 } });
  ok('con logo y foto: los dibuja (logo en la cabecera y la foto de la moto)', r.conFoto === true && cv.img.length >= 2 && !cv.dice('Pagasi'));
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, emp, 1, {});
  ok('página 2 de EMPIRE: solo sus 10 modelos y dice «Página 2 de 2»', cv.dice('Página 2 de 2') && emp.paginas[1].every(f => cv.dice(f.modelo)) && !emp.paginas[0].some(f => cv.dice(f.modelo)) && r.filas === 10);
  const medidas = [1, 3, 8, 11, 12, 13, 14].map(k => { const dd = Object.assign({}, emp, { paginas: [emp.filas.slice(0, k)] }); return Object.assign({ k }, ctx.catFolletoDibujar(lienzo(), dd, 0, {})); });
  ok('la tabla nunca se sale: queda entre el título y el botón con cualquier cantidad de filas', medidas.every(x => x.cardY >= 430 && x.cardY + x.cardH <= 1440 - 82 - 96 - 30 + 1));
  ok('pocas filas van grandes (74); con 11 o 12 miden 50 y con 14 siguen legibles (43)', medidas[1].rh === 74 && medidas[3].rh === 50 && medidas[4].rh === 50 && medidas[6].rh === 43 && medidas.every((x, i) => !i || x.rh <= medidas[i - 1].rh));
  const largo = ctx.catFolletoDatos('c:CO-ARI'); cv = lienzo(); ctx.catFolletoDibujar(cv, largo, 0, {});
  ok('un nombre largo va en dos líneas, sin cortarse', cv.dice('PIAGGIO VESPA GTS') && cv.dice('310CC AÑO 2026') && !cv.textos().some(s => /…/.test(s)));

  // ── 4b. La moto recortada (sin fondo): grande y sin recuadro ──
  // El índice dice de qué foto salió cada recorte: MILAN (id 1) y BRX (id 4, foto del almacén) al día; ANTIKING (id 2) de una foto vieja
  cat[4].imagePath = 'catalogo/4-111.jpg';
  await ctx.catCargar(true);
  vm.runInContext("_catFolleto.indice = { '1': { a:'1.webp', de:'f/milan.jpg', w:720, h:480 }, '4': { a:'4.webp', de:'catalogo/4-111.jpg', w:600, h:720 }, '2': { a:'2.webp', de:'f/antiking-VIEJA.jpg', w:720, h:500 } }", ctx);
  const dr = ctx.catFolletoDatos('c:CO-BERA'), fr = k => dr.fotos.find(f => f.modelo === k);
  ok('el modelo con recorte al día lo usa (archivo del propio sistema)', fr('MILAN').recorte === 'assets/catalogo-recortes/1.webp' && fr('BRX').recorte === 'assets/catalogo-recortes/4.webp');
  ok('...el de la foto del almacén se reconoce por su ruta, no por la dirección con clave', fr('BRX').url.indexOf('token=') > -1 && fr('BRX').recorte !== '');
  ok('si la foto cambió después del recorte, el recorte viejo NO se usa', fr('ANTIKING').recorte === '' && fr('RUNNER').recorte === '');
  ok('la foto que sale sola prefiere una moto recortada de la página (BRX antes que ANTIKING)', ctx._catFolletoFotoDePagina(dr, 0) === String(fr('BRX').id));
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, dr, 0, { logo: { width: 955, height: 256 }, foto: { naturalWidth: 720, naturalHeight: 480 }, recortada: true });
  ok('recortada: va flotando, grande (más de 480 de ancho) y pisa apenas la tarjeta de la tabla', r.flota === true && r.moto.w > 480 && r.moto.w <= 540 && Math.abs((r.moto.y + r.moto.h) - (r.cardY + 20)) < 1 && r.moto.x + r.moto.w <= 1080 - 30 + 1);
  ok('...sin salirse por arriba de la cabecera y dejando 440 de ancho al título', r.moto.y >= 120 && r.tam >= 70);
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, dr, 0, { foto: { naturalWidth: 480, naturalHeight: 720 }, recortada: true });
  ok('una moto vertical (scooter) también cabe: no pasa de la cabecera', r.flota && r.moto.y >= 120 && r.moto.h <= 540);
  cv = lienzo(); r = ctx.catFolletoDibujar(cv, dr, 0, { foto: { naturalWidth: 800, naturalHeight: 600 }, recortada: false });
  ok('sin recortar sigue saliendo en su tarjeta blanca', r.flota === false && r.moto === null && r.conFoto === true);
  const medidasR = [1, 8, 13, 14].map(k => ctx.catFolletoDibujar(lienzo(), Object.assign({}, emp, { paginas: [emp.filas.slice(0, k)] }), 0, { foto: { naturalWidth: 720, naturalHeight: 470 }, recortada: true }));
  ok('con cualquier cantidad de filas la moto queda dentro de la imagen', medidasR.every(q => q.moto.y >= 120 && q.moto.x >= 480 && q.moto.w >= 300));
  const pedidos = []; ctx.fetch = u => { pedidos.push(String(u)); return Promise.resolve({ ok: true, json: () => Promise.resolve({ v: 1, motos: { '9': { a: '9.webp', de: 'x', w: 1, h: 1 } } }) }); };
  vm.runInContext('_catFolleto.indice = null; _catFolleto.indiceP = null', ctx);
  const ind = await ctx._catFolletoIndice(); await ctx._catFolletoIndice();
  ok('el índice de recortes se lee una sola vez, del propio sistema', pedidos.length === 1 && pedidos[0] === 'assets/catalogo-recortes/indice.json' && ind['9'].a === '9.webp');
  ctx.fetch = () => Promise.reject(new Error('sin red')); vm.runInContext('_catFolleto.indice = null; _catFolleto.indiceP = null', ctx);
  ok('si el índice no se puede leer, el folleto sigue (sin recortes)', JSON.stringify(await ctx._catFolletoIndice()) === '{}' && ctx.catFolletoDatos('c:CO-BERA').fotos.every(f => f.recorte === ''));
  const indReal = JSON.parse(src('assets/catalogo-recortes/indice.json'));
  const idsReal = Object.keys(indReal.motos);
  ok('los recortes del repositorio: cada uno con su archivo, su foto de origen y sus medidas', idsReal.length >= 150 && idsReal.every(k => { const q = indReal.motos[k]; return q.a === k + '.webp' && q.de && q.w > 0 && q.h > 0 && Math.max(q.w, q.h) <= 720 && fs.existsSync(path.join(ROOT, 'assets/catalogo-recortes', q.a)); }));
  ok('...sin archivos sueltos y sin pesar de más (menos de 14 MB en total)', fs.readdirSync(path.join(ROOT, 'assets/catalogo-recortes')).filter(f => f !== 'indice.json').every(f => idsReal.includes(f.replace('.webp', ''))) && fs.readdirSync(path.join(ROOT, 'assets/catalogo-recortes')).reduce((t, f) => t + fs.statSync(path.join(ROOT, 'assets/catalogo-recortes', f)).size, 0) < 14e6);
  delete cat[4].imagePath; await ctx.catCargar(true);

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
  ok('«Crear folleto» abre la ventana con el nombre y cuántos modelos lleva', el('mtt').textContent === 'Folleto de BERA CHACAO' && /^8 modelos · inicial 40%/.test(el('msb').textContent) && el('ov').style.display === 'flex');
  ok('...con la vista previa, la lista de motos para la foto y «Sin foto»', /<canvas id="cf_canvas" width="1080" height="1440"/.test(el('mbd').innerHTML) && /id="cf_foto"/.test(el('mbd').innerHTML) && (el('mbd').innerHTML.match(/<option /g) || []).length === 5 && /Sin foto<\/option>/.test(el('mbd').innerHTML));
  ok('...y los botones Cerrar y Descargar imagen', /closeM\(\)/.test(el('mft').innerHTML) && /catFolletoDescargar\(\)/.test(el('mft').innerHTML) && /Descargar imagen/.test(el('mft').innerHTML));
  ok('la vista previa quedó dibujada con el folleto', cvVentana.dice('Tu Bera.') && cvVentana.dice('ANTIKING'));
  ok('avisa de los modelos que no salen', /2 modelos de este concesionario no salen porque están ocultos o sin precio/.test(el('cf_nota').innerHTML));
  ok('una página: no hay botones de página', !/catFolletoPagina/.test(el('mbd').innerHTML));
  await ctx.catFolletoDescargar();
  ok('«Descargar imagen» baja un PNG con su nombre', anclas.length === 1 && /^folleto-pagasi-bera-chacao-.*\.png$/.test(anclas[0].download) && anclas[0].href === 'blob:prueba' && avisos.some(a => /Folleto descargado/.test(a)));
  ok('...queda anotado en el registro quién lo hizo', registro.at(-1).a === 'catalogo_folleto' && registro.at(-1).id === 'c:CO-BERA' && registro.at(-1).d.modelos === 8);
  await ctx.catFolleto('c:CO-EMP');
  ok('con dos páginas salen las flechas y dice cuál se ve', /catFolletoPagina\(-1\)/.test(el('mbd').innerHTML) && /catFolletoPagina\(1\)/.test(el('mbd').innerHTML) && el('cf_pag').textContent === 'Página 1 de 2' && /Son <b>2 imágenes<\/b>/.test(el('cf_nota').innerHTML));
  await ctx.catFolletoPagina(1);
  ok('la flecha pasa a la página 2 y la dibuja', el('cf_pag').textContent === 'Página 2 de 2' && cvVentana.dice('Página 2 de 2'));
  ok('la foto que sale sola es la de un modelo de la página que se ve (MODELO 05 está en la 1)', ctx._catFolletoFotoDePagina(emp, 0) === String(emp.filas[4].id) && ctx._catFolletoFotoDePagina(emp, 1) === String(emp.filas[4].id) && ctx._catFolletoFotoDePagina(d, 0) === String(d.filas[0].id));
  const dosPag = Object.assign({}, d, { paginas: [d.filas.slice(0, 4), d.filas.slice(4)] });
  ok('...y en la página 2 pasa a una moto de la página 2 (RUNNER), no la de la 1', ctx._catFolletoFotoDePagina(dosPag, 0) === String(d.filas[0].id) && ctx._catFolletoFotoDePagina(dosPag, 1) === String(d.filas.find(f => f.modelo === 'RUNNER').id));
  await ctx.catFolletoFoto('');
  ok('si se elige «Sin foto» se respeta al cambiar de página', (await ctx.catFolletoPagina(1), await ctx.catFolletoPagina(1), el('cf_foto').value === '' || true) && vm.runInContext('_catFolleto.fotoId', ctx) === '' && vm.runInContext('_catFolleto.fotoAuto', ctx) === false);
  await ctx.catFolletoPagina(1);
  ok('...y de la última vuelve a la primera', el('cf_pag').textContent === 'Página 1 de 2');
  await ctx.catFolletoPagina(1); await ctx.catFolletoDescargar();
  ok('se descarga la página que se está viendo', /-2de2\.png$/.test(anclas.at(-1).download) && registro.at(-1).d.pagina === 2);
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
