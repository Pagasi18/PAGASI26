// 28-nov-2026: «Inventario de oficina». Adam: "necesito que lo revises y lo mejores porque vamos a empezar a poner
// todo lo que tenemos ahí", "sácame ese módulo de finanzas y ponlo solo" y "créale unas etiquetas para luego poder
// imprimirlas". Era una pestaña de Finanzas que guardaba la lista COMPLETA desde la memoria de cada navegador (dos
// personas cargando a la vez se pisaban). Aquí se cuida: que cada cambio se aplique sobre lo que hay en la base, que
// el aviso de «guardado» salga solo si guardó, los códigos, el serial repetido, las bajas, quién entra y las etiquetas.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I = require(path.join(ROOT, 'logic/inventario-oficina.js'));
const AHORA = '2026-11-28T15:00:00.000Z', HOY = '2026-11-28';
const ap = (estado, cambio, quien) => I.invAplicar(estado, cambio, quien || 'Ana', AHORA, HOY);

// ════════ 1. Un cambio sobre la lista (sin navegador) ════════
const viejos = [{ id: 'inv_2', nombre: 'Segundo', cantidad: 6, valorUnit: 35, creado: '2026-03-12T10:00:00.000Z' }, { id: 'inv_1', nombre: 'Primero', cantidad: 1, valorUnit: 650, creado: '2026-03-10T10:00:00.000Z', nota: 'cosa' }];
let r = ap({ items: viejos }, { tipo: 'agregar', datos: { nombre: '  Laptop   de ventas ', categoria: 'Laptop', serial: 'lap-01', cantidad: '1', valorUnit: '480,50', area: 'Ventas' } });
ok('a lo cargado antes se le pone código en el orden en que se cargó, y lo nuevo sigue la cuenta', r.items.find(x => x.id === 'inv_1').codigo === 'INV-001' && r.items.find(x => x.id === 'inv_2').codigo === 'INV-002' && r.item.codigo === 'INV-003' && r.sec === 3);
ok('lo que ya estaba no pierde nada', r.items.find(x => x.id === 'inv_1').nota === 'cosa' && r.items.find(x => x.id === 'inv_2').cantidad === 6 && r.items.length === 3);
ok('el artículo nuevo queda limpio: espacios, serial en mayúsculas, valor con coma, quién y cuándo', r.item.nombre === 'Laptop de ventas' && r.item.serial === 'LAP-01' && r.item.valorUnit === 480.5 && r.item.creadoPor === 'Ana' && r.item.creado === AHORA && r.item.ubicacion === 'Oficina' && r.item.estado === 'Bueno' && r.item.fecha === '');
ok('la fecha de compra ya no se inventa: si no se pone, queda vacía', r.item.fecha === '' && !/hoyISO\)/.test(src('modules/inventario.js').split('iv_fecha')[1].slice(0, 120)));
ok('la lista que entra no se toca (se trabaja sobre una copia)', viejos[0].codigo === undefined && viejos.length === 2);
const base = { items: r.items, sec: r.sec };
ok('sin nombre no se guarda', /Escribe qué es/.test(ap(base, { tipo: 'agregar', datos: { nombre: '   ' } }).error));
ok('cantidad 0, negativa o gigante: no', [0, -2, 'x', 10000].every(c => !!ap(base, { tipo: 'agregar', datos: { nombre: 'Silla', cantidad: c } }).error));
ok('un valor que no es número: no', !!ap(base, { tipo: 'agregar', datos: { nombre: 'Silla', cantidad: 1, valorUnit: 'mucho' } }).error && !!ap(base, { tipo: 'agregar', datos: { nombre: 'Silla', cantidad: 1, valorUnit: -5 } }).error);
ok('una fecha de compra en el futuro: no', /futuro/.test(ap(base, { tipo: 'agregar', datos: { nombre: 'Silla', cantidad: 1, fecha: '2026-12-01' } }).error) && !ap(base, { tipo: 'agregar', datos: { nombre: 'Silla', cantidad: 1, fecha: HOY } }).error);
ok('un serial es de un solo equipo', /cantidad 1/.test(ap(base, { tipo: 'agregar', datos: { nombre: 'Laptop', cantidad: 3, serial: 'X-9' } }).error));
ok('el mismo serial no se carga dos veces, aunque lo escriban distinto', /ya está cargado: INV-003/.test(ap(base, { tipo: 'agregar', datos: { nombre: 'Otra', cantidad: 1, serial: ' LAP 01 ' } }).error));
ok('una categoría o un estado que no existen no se cuelan', (() => { const x = ap(base, { tipo: 'agregar', datos: { nombre: 'Cosa', cantidad: 1, categoria: '<b>', estado: 'Roto' } }).item; return x.categoria === 'Otro' && x.estado === 'Bueno'; })());
const idNuevo = r.item.id;
let e = ap(base, { tipo: 'editar', id: idNuevo, datos: { nombre: 'Laptop de ventas', cantidad: 1, serial: 'LAP-01', responsable: 'Luis', estado: 'Regular' } }, 'Bea');
ok('editar cambia lo que se tocó y anota quién; el código y quién lo cargó no cambian', e.item.responsable === 'Luis' && e.item.estado === 'Regular' && e.item.editadoPor === 'Bea' && e.item.codigo === 'INV-003' && e.item.creadoPor === 'Ana' && e.sec === 3);
ok('editar algo que otra persona ya borró avisa, no inventa', /ya no está/.test(ap(base, { tipo: 'editar', id: 'inv_no', datos: { nombre: 'X', cantidad: 1 } }).error));
let b = ap(base, { tipo: 'baja', id: idNuevo, motivo: 'Se vendió', fecha: '2026-11-27', nota: 'A un empleado' }, 'Bea');
ok('dar de baja no borra: queda con motivo, fecha y quién', b.items.length === 3 && b.item.baja.motivo === 'Se vendió' && b.item.baja.fecha === '2026-11-27' && b.item.baja.por === 'Bea' && b.item.baja.nota === 'A un empleado');
ok('...con un motivo raro queda «Otro», y sin fecha o con fecha futura no pasa', ap(base, { tipo: 'baja', id: idNuevo, motivo: 'porque sí', fecha: HOY }).item.baja.motivo === 'Otro' && !!ap(base, { tipo: 'baja', id: idNuevo, motivo: 'Se vendió', fecha: '' }).error && !!ap(base, { tipo: 'baja', id: idNuevo, motivo: 'Se vendió', fecha: '2027-01-01' }).error);
const conBaja = { items: b.items, sec: b.sec };
ok('lo dado de baja no cuenta en los números', (() => { const s = I.invResumen(conBaja.items); return s.articulos === 2 && s.unidades === 7 && s.valor === 860 && s.bajas === 1; })());
ok('el serial de algo dado de baja se puede volver a cargar (el equipo se repuso)', !ap(conBaja, { tipo: 'agregar', datos: { nombre: 'Laptop nueva', cantidad: 1, serial: 'LAP-01' } }).error);
ok('...y entonces el viejo ya no vuelve a «en uso» con ese mismo serial', (() => { const n = ap(conBaja, { tipo: 'agregar', datos: { nombre: 'Laptop nueva', cantidad: 1, serial: 'LAP-01' } }); return /su serial ahora lo tiene INV-004/.test(ap({ items: n.items, sec: n.sec }, { tipo: 'restaurar', id: idNuevo }).error); })());
ok('volver a poner en uso le quita la baja', (() => { const v = ap(conBaja, { tipo: 'restaurar', id: idNuevo }); return !v.item.baja && I.invResumen(v.items).articulos === 3; })());
ok('borrar del todo lo saca de la lista, y el código no se vuelve a usar', (() => { const d = ap(base, { tipo: 'borrar', id: idNuevo }); const n = ap({ items: d.items, sec: d.sec }, { tipo: 'agregar', datos: { nombre: 'Otra', cantidad: 1 } }); return d.items.length === 2 && n.item.codigo === 'INV-004'; })());
ok('un cambio que no existe no hace nada', !!ap(base, { tipo: 'explotar' }).error);
ok('antes de llegar al tope del documento se avisa (no falla callado)', /tope/.test(ap({ items: Array.from({ length: 3000 }, (_, i) => ({ id: 'x' + i, codigo: I.invCodigo(i + 1), nombre: 'A'.repeat(90), nota: 'B'.repeat(250), cantidad: 1 })), sec: 3000 }, { tipo: 'agregar', datos: { nombre: 'Una más', cantidad: 1 } }).error) && I.INV_TOPE_BYTES < 1048576);
ok('después de INV-999 sigue INV-1000', I.invCodigo(999) === 'INV-999' && I.invCodigo(1000) === 'INV-1000' && I.invNumDeCodigo('INV-1000') === 1000 && I.invNumDeCodigo('otra cosa') === 0);

// ════════ 2. Buscar, filtrar, ordenar ════════
const L = [
  { id: 'a', codigo: 'INV-001', nombre: 'Impresora láser', categoria: 'Impresora', marca: 'HP M404', serial: 'VNB-3', ubicacion: 'Oficina', area: 'Recepción', responsable: 'María José', cantidad: 1, valorUnit: 200, estado: 'Para reparar', creado: '2026-11-01T10:00:00.000Z' },
  { id: 'b', codigo: 'INV-002', nombre: 'Sillas', categoria: 'Silla', ubicacion: 'Concesionario: X', cantidad: 6, valorUnit: 30, estado: 'Bueno', creado: '2026-11-02T10:00:00.000Z' },
  { id: 'c', codigo: 'INV-010', nombre: 'Monitor', categoria: 'Monitor', ubicacion: 'Oficina', cantidad: 1, valorUnit: 500, estado: 'Dañado', creado: '2026-11-03T10:00:00.000Z' },
  { id: 'd', codigo: 'INV-003', nombre: 'Teléfono', categoria: 'Teléfono / Celular', ubicacion: 'Oficina', cantidad: 1, valorUnit: 100, estado: 'Bueno', creado: '2026-11-04T10:00:00.000Z', baja: { motivo: 'Se perdió', fecha: '2026-11-20', por: 'Ana' } }
];
const ids = l => l.map(x => x.id).join('');
ok('la vista «en uso» no trae lo dado de baja, y la de bajas solo eso', ids(I.invFiltrar(L, { vista: 'uso' })) === 'abc' && ids(I.invFiltrar(L, { vista: 'bajas' })) === 'd');
ok('se busca sin tildes ni mayúsculas, por nombre, marca, serial, área o responsable', ['impresora laser', 'hp', 'vnb3', 'recepcion', 'maria jose', 'INV-001', 'inv001'].every(q => ids(I.invFiltrar(L, { vista: 'uso', q })) === 'a'));
ok('varias palabras: tienen que estar todas', ids(I.invFiltrar(L, { vista: 'uso', q: 'impresora recepcion' })) === 'a' && ids(I.invFiltrar(L, { vista: 'uso', q: 'impresora caja' })) === '');
ok('filtros por categoría, ubicación y estado', ids(I.invFiltrar(L, { vista: 'uso', cat: 'Silla' })) === 'b' && ids(I.invFiltrar(L, { vista: 'uso', ubicacion: 'Oficina' })) === 'ac' && ids(I.invFiltrar(L, { vista: 'uso', estado: 'Dañado' })) === 'c');
ok('órdenes: lo último, por código (INV-010 después de INV-003), por nombre y por valor', ids(I.invOrdenar(L, 'reciente')) === 'dcba' && ids(I.invOrdenar(L, 'codigo')) === 'abdc' && ids(I.invOrdenar(L, 'nombre')) === 'acbd' && ids(I.invOrdenar(L, 'valor')) === 'cabd');
const res = I.invResumen(L);
ok('el resumen: artículos, unidades, valor, por revisar y por categoría', res.articulos === 3 && res.unidades === 8 && res.valor === 880 && res.revisar === 2 && res.bajas === 1 && res.porCat[0].cat === 'Silla' && res.porCat[0].n === 6 && res.porCat[0].val === 180);
ok('las ubicaciones: oficina, cada concesionario y las que ya se escribieron', I.invUbicaciones(L, [{ id: 1, nombre: 'MOTOS A' }, { id: 2, nombre: 'VIEJO', eliminado: true }]).join('|') === 'Oficina|Concesionario: MOTOS A|Otro lugar|Concesionario: X');
ok('las sugerencias no repiten lo mismo escrito distinto', I.invSugerencias([{ area: 'Caja' }, { area: 'caja' }, { area: 'CAJA ' }, { area: 'Recepción' }, {}], 'area').length === 2);
ok('la fila del Excel trae todo, también lo que no cabe en pantalla', I.INV_EXCEL_COLS.length === 16 && I.invFilaExcel(L[0]).length === 16 && I.invFilaExcel(L[0])[4] === 'VNB-3' && I.invFilaExcel(L[1])[10] === 180);

// ════════ 3. Etiquetas ════════
const patron = t => I.invCode39(t).map(w => (w === 5 ? '1' : '0')).join('');
ok('el código de barras es Code 39 de verdad (inicio y fin con *, y las letras de la tabla)', patron('A') === '010010100' + '0' + '100001001' + '0' + '010010100' && patron('1').slice(10, 19) === '100100001' && patron('-').slice(10, 19) === '010000101' && patron('U').slice(10, 19) === '110000001' && patron('Z').slice(10, 19) === '011010000');
ok('...cada letra con 3 anchos y 6 angostos', (() => { const a = I.invCode39('INV-0123456789'); const letras = []; for (let i = 0; i < a.length; i += 10) letras.push(a.slice(i, i + 9)); return letras.length === 16 && letras.every(l => l.filter(w => w === 5).length === 3 && l.length === 9); })());
ok('...y lo que no se puede codificar se quita (nada de texto raro en la barra)', I.invCode39('<b>').length === I.invCode39('B').length && I.invCode39('').length === 0);
const etq = I.invEtiquetasDe(L, true);
ok('una etiqueta por unidad: 6 sillas son 6; lo dado de baja no lleva', etq.length === 8 && etq.filter(x => x.id === 'b').length === 6 && !etq.some(x => x.id === 'd') && I.invEtiquetasDe(L, false).length === 3);
ok('...lo que todavía no tiene código no saca etiqueta, y una fila enorme tiene tope', I.invEtiquetasDe([{ id: 'z', nombre: 'Sin código', cantidad: 1 }], true).length === 0 && I.invEtiquetasDe([{ id: 'm', codigo: 'INV-001', cantidad: 5000 }], true).length === I.INV_ETQ_TOPE);
ok('las hojas se cuentan según el tamaño', I.invEtiquetasHojas(24, 'mediana') === 1 && I.invEtiquetasHojas(25, 'mediana') === 2 && I.invEtiquetasHojas(25, 'grande') === 3 && I.invEtiquetasHojas(40, 'pequena') === 1 && I.invEtiquetasHojas(0, 'mediana') === 0);
ok('la hoja cabe en una carta con sus márgenes', I.INV_ETQ_HOJA.ancho + 2 * I.INV_ETQ_HOJA.margen <= 215.9 && I.INV_ETQ_HOJA.alto + 2 * I.INV_ETQ_HOJA.margen <= 279.4);
const docE = I.invEtiquetasDoc(I.invEtiquetasDe([{ id: 'x', codigo: 'INV-007', nombre: '<img src=x onerror=alert(1)>', marca: 'A&B', serial: '"S1"', cantidad: 1 }].concat(L), true), 'mediana', 'PAGASI <26>');
ok('la hoja de etiquetas: una por artículo, con código, nombre, serial, empresa y barras', (docE.match(/class="e"/g) || []).length === 9 && />INV-007</.test(docE) && /S\/N VNB-3/.test(docE) && /Propiedad de PAGASI &lt;26&gt;/.test(docE) && (docE.match(/<svg /g) || []).length === 9 && /@page\{size:Letter;margin:9mm\}/.test(docE));
ok('...y un nombre con código no se cuela en la hoja', !/<img src=x/.test(docE) && /&lt;img src=x onerror=alert\(1\)&gt;/.test(docE) && /A&amp;B/.test(docE) && /&quot;S1&quot;/.test(docE));
ok('con más etiquetas que las que caben, van en varias hojas', (I.invEtiquetasDoc(Array.from({ length: 25 }, (_, i) => ({ codigo: I.invCodigo(i + 1), nombre: 'X' })), 'mediana', 'P').match(/class="hoja"/g) || []).length === 2);

// ════════ 3b. Leer la etiqueta (lo que hace la cámara, sin cámara) ════════
// Una fila de imagen simulada: fondo claro y el código a «px» pixeles por unidad, con desenfoque, ruido o luz dispareja
function filaDe(texto, px, o){ o = o || {}; const claro = o.claro || 230, oscuro = o.oscuro || 30; let f = [];
  for (let i = 0; i < 60; i++) f.push(claro);
  I.invCode39(texto).forEach((w, i) => { const n = Math.round(w * px); for (let k = 0; k < n; k++) f.push(i % 2 === 0 ? oscuro : claro); });
  for (let i = 0; i < 60; i++) f.push(claro);
  if (o.blur) { const g = f.slice(); for (let i = 0; i < f.length; i++) { let t = 0, c = 0; for (let d = -o.blur; d <= o.blur; d++) { const j = i + d; if (j >= 0 && j < f.length) { t += g[j]; c++; } } f[i] = t / c; } }
  if (o.ruido) { let sem = 7; const azar = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff; }; f = f.map(v => Math.max(0, Math.min(255, v + (azar() - 0.5) * o.ruido))); }
  if (o.rampa) f = f.map((v, i) => v * (0.55 + 0.45 * i / f.length));
  return f; }
ok('el lector entiende lo que el propio sistema imprime (toda la tabla, ida y vuelta)', 'INV-0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ.'.split('').every(ch => I.invLeerFila(filaDe('A' + ch + 'Z', 2)) === 'A' + ch + 'Z') && Object.keys(I.inv39Tabla()).length === 40);
ok('lee de cerca y de lejos (barras de 4 pixeles o de menos de 2)', [3, 2, 1, 0.7].every(px => I.invLeerFila(filaDe('INV-012', px)) === 'INV-012'));
ok('lee desenfocado, con ruido, con poca diferencia entre claro y oscuro, y con sombra', I.invLeerFila(filaDe('INV-777', 2, { blur: 2, ruido: 30 })) === 'INV-777' && I.invLeerFila(filaDe('INV-003', 3, { oscuro: 90, claro: 170, ruido: 15 })) === 'INV-003' && I.invLeerFila(filaDe('INV-045', 1.2, { blur: 1, ruido: 20, rampa: true })) === 'INV-045');
ok('lee la etiqueta de cabeza', I.invLeerFila(filaDe('INV-1000', 1.5, { blur: 1 }).reverse()) === 'INV-1000');
ok('un código cortado (la raya no cruza todas las barras) no se lee a medias', (() => { const f = filaDe('INV-012', 2); return I.invLeerFila(f.slice(0, Math.round(f.length * 0.7))) === '' && I.invLeerFila(f.slice(Math.round(f.length * 0.3))) === ''; })());
ok('una pared, un texto o ruido no dan códigos inventados (5.000 filas al azar)', (() => { let sem = 3, falsos = 0; const azar = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff; };
  for (let k = 0; k < 5000; k++) { const f = []; let v = azar() > 0.5 ? 220 : 40; while (f.length < 900) { const n = 1 + Math.floor(azar() * 9); for (let i = 0; i < n; i++) f.push(v); v = v > 128 ? 40 : 220; } if (I.invCodigoLeido(I.invLeerFila(f))) falsos++; }
  return falsos === 0 && I.invLeerFila(new Array(900).fill(200)) === '' && I.invLeerFila([]) === ''; })());
ok('solo se acepta lo que tiene forma de código del inventario', I.invCodigoLeido('inv-012') === 'INV-012' && I.invCodigoLeido('INV-7') === 'INV-007' && I.invCodigoLeido('INV-1000') === 'INV-1000' && I.invCodigoLeido('ABC-012') === '' && I.invCodigoLeido('INV-12A') === '' && I.invCodigoLeido('') === '');
const LC = [{ id: 'p', codigo: 'INV-012', nombre: 'A', cantidad: 1 }, { id: 'q', codigo: 'INV-120', nombre: 'B', cantidad: 1 }, { id: 'r', codigo: 'INV-1200', nombre: 'C', cantidad: 1 }, { id: 't', codigo: 'INV-001', nombre: 'Cable inv-120 de repuesto', cantidad: 1 }];
ok('buscar un código completo trae ESE artículo (no INV-1200 por parecerse a INV-120), lo escriba una persona o un lector', ["INV-120", "inv120", "INV'120", "INV?120", "inv 120"].every(q => ids(I.invFiltrar(LC, { vista: 'uso', q })) === 'q') && ids(I.invFiltrar(LC, { vista: 'uso', q: 'INV-1200' })) === 'r' && ids(I.invFiltrar(LC, { vista: 'uso', q: 'INV-012' })) === 'p');
ok('...y a medio escribir sigue buscando como siempre', ids(I.invFiltrar(LC, { vista: 'uso', q: 'inv-12' })) === 'qrt' && ids(I.invFiltrar(LC, { vista: 'uso', q: 'cable' })) === 't');

// ════════ 4. El panel ════════
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, checked:false, disabled:false, parentNode:null, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, insertBefore(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){}, select(){}, closest(){return null;}, matches(){return false;}, getBoundingClientRect(){return {top:0,left:0,width:0,height:0,bottom:0,right:0};}, querySelector(){return null;}, querySelectorAll(){return [];} }; }
const els = {}, abiertas = [];
const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, createTextNode(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){}, title:'' };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){ return ''; }, confirm(){ return true; },
  open(){ const w = { html:'', document:{ write(h){ w.html += h; }, close(){} } }; abiertas.push(w); return ctx._sinVentanas ? null : w; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const admin = src('admin.html');
const archivos = [...admin.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
const avisos = [], bitacora = []; ctx.toast = (m, t) => { avisos.push((t || 'info') + ':' + m); };
ctx.logActividad = (a, m, t, d) => { bitacora.push(a + ':' + m + ':' + t); };
let cerradas = 0; ctx.closeM = () => { cerradas++; };
ctx.setMicon = () => {};   // el ícono de la ventana necesita un DOM de verdad
const S = ctx.S, dentro = expr => vm.runInContext(expr, ctx);
const como = (rol, permisos) => { S.currentUser = { uid: 'U-' + rol, nombre: rol + ' de prueba', email: 'x@ejemplo.com', rol, permisos: permisos || [] }; };
const vueltas = async n => { for (let i = 0; i < (n || 25); i++) await new Promise(r => setImmediate(r)); };
// Base de mentira con los DOS documentos (el nuevo y el de antes) y transacciones estrictas, como las de verdad:
// lo leído es una foto de ese instante; entre leer y escribir puede colarse otra; si alguien escribió lo que yo
// leí, mi función se vuelve a ejecutar entera con lo nuevo. B.doc es el documento nuevo; B.viejo, el de antes.
function baseFalsa(docNuevo, docViejo){
  const B = { doc: docNuevo, viejo: docViejo || null, escritos: 0, escritosViejo: 0, lecturas: 0, intentos: 0, falla: null, oyentes: [], ver: { n: 0, v: 0 } };
  const hacer = (k, campo) => ({ _k: k,
    get(){ B.lecturas++; if (B.falla) return Promise.reject(B.falla); const foto = B[campo] ? JSON.parse(JSON.stringify(B[campo])) : null; return Promise.resolve({ exists: !!foto, data: () => foto }); },
    set(d){ B[campo] = JSON.parse(JSON.stringify(d)); B.ver[k]++; if (k === 'n') B.escritos++; else B.escritosViejo++; return Promise.resolve(); },
    onSnapshot(cb){ if (k === 'n') B.oyentes.push(cb); return () => {}; } });
  const refs = { inventarioEquipos: hacer('n', 'doc'), inventarioOficina: hacer('v', 'viejo') };
  B.collection = () => ({ doc: id => refs[id] });
  B.runTransaction = async fn => {
    for (let i = 0; i < 8; i++) {
      B.intentos++;
      const leidos = []; let pendiente = null;
      const res = await fn({ get(r){ leidos.push([r._k, B.ver[r._k]]); return r.get(); }, set(r, d){ if (B.falla) throw B.falla; pendiente = [r, d]; } });
      await new Promise(r => setImmediate(r));                        // aquí se puede colar otra transacción
      if (leidos.some(([k, v]) => B.ver[k] !== v)) continue;          // cambió lo que leí: de nuevo
      if (pendiente) await pendiente[0].set(pendiente[1]);
      return res;
    }
    throw new Error('demasiados reintentos');
  };
  return B;
}

(async () => {
  // ── 4a. Está en el menú, con su permiso, y ya no en Finanzas ──
  const app = src('assets/pagasi-app.js'), rep = src('modules/reportes.js');
  ok('es un módulo del menú: lista, nombre, ícono, los dos menús y el del teléfono', dentro('MODULOS').some(m => m.id === 'inventario' && m.label === 'Inventario de oficina' && m.grupo === 'Sistema') && dentro('PGL.inventario') === 'Inventario de oficina' && !!dentro('PG_NAVICONS.inventario')
    && (app.match(/'catalogo','inventario'\]\}/g) || []).length === 2 && /'inventario'/.test(src('logic/movil-navegacion.js')) && /inventario:'Equipos y muebles de la oficina'/.test(src('logic/movil-navegacion.js')));
  ok('los administradores nuevos lo traen; los demás roles no', dentro('ROL_PERMISOS').Administrador.includes('inventario') && ['Gerente', 'Cobrador', 'Vendedor', 'Contador', 'Empleado', 'Vendedor Concesionario'].every(x => !(dentro('ROL_PERMISOS')[x] || []).includes('inventario')));
  ok('sale en «Quién ve qué» para dárselo a quien haga falta', dentro('_qvColumnas()').some(c => c.id === 'inventario' && c.label === 'Inventario de oficina'));
  ok('la página carga la lógica antes que la pantalla', admin.indexOf('logic/inventario-oficina.js') > 0 && admin.indexOf('modules/inventario.js') > admin.indexOf('logic/inventario-oficina.js'));
  ok('salió de Finanzas: ni la pestaña ni su código viejo', !/Inventario de oficina/.test(rep.replace(/\/\/[^\n]*/g, '')) && !/_renderTabInventario|invAgregar|inv-nombre/.test(rep) && /if\(S\.reportesTab === 'inventario'\) S\.reportesTab = 'dashfin';/.test(rep));
  ok('ya nadie guarda la lista completa desde su memoria', !/DB\.saveInventarioOficina\s*=/.test(app) && !/saveInventarioOficina\(/.test(archivos.map(f => src(f)).join('\n')) && !/setItem\('pagasi_inv_oficina'/.test(src('modules/inventario.js') + src('logic/inventario-oficina.js')));
  const logica = src('logic/inventario-oficina.js');
  ok('las Reglas no cambian: el documento nuevo y el de antes caen en la misma regla de config', /INV_DOC = 'inventarioEquipos', INV_DOC_VIEJO = 'inventarioOficina'/.test(logica) && !/inventario/i.test(src('firestore.rules')) && /match \/config\/\{id\}/.test(src('firestore.rules')));
  ok('el documento de antes solo se lee: nunca se escribe', !/_invRefViejo\(\)\.(set|update|delete)|tx\.(set|update|delete)\(refViejo/.test(logica + src('modules/inventario.js')));
  ok('el arranque ya no baja el inventario ni lo saca de la copia vieja del navegador', !/doc\('inventarioOficina'\)/.test(app) && !/getItem\('pagasi_inv_oficina'/.test(app) && /if\(!Array\.isArray\(S\.inventarioOficina\)\) S\.inventarioOficina = \[\];/.test(app));

  // ── 4b. Quién entra ──
  como('Administrador'); ok('el administrador entra', ctx.invPuedeVer() === true && ctx.hasModuleAccess('inventario') === true);
  como('Empleado', ['dash', 'inventario']); ok('quien tiene el permiso entra, y sin tener Finanzas', ctx.invPuedeVer() === true && ctx.hasModuleAccess('inventario') === true && ctx.hasModuleAccess('reportes') === false);
  como('Gerente', ['dash', 'reportes', 'cuentas']); ok('tener Finanzas ya no da el inventario', ctx.invPuedeVer() === false && ctx.hasModuleAccess('inventario') === false && /lo ven los administradores/.test(ctx.PG.inventario()));
  como('Vendedor Concesionario', ['inventario']); ok('un vendedor de concesionario nunca, aunque le marquen el permiso', ctx.invPuedeVer() === false && ctx.hasModuleAccess('inventario') === false);

  // ── 4c. Guardar: cada cambio sobre lo que hay en la base ──
  como('Empleado', ['dash', 'inventario']);
  let B = baseFalsa({ items: [{ id: 'inv_1', nombre: 'Primero', cantidad: 1, valorUnit: 10, creado: '2026-01-01T00:00:00.000Z' }], actualizado: 'x' }); ctx.db = B;
  S.inventarioOficina = [];   // esta pantalla está "vieja": no ha visto nada
  const g1 = await ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'Silla', cantidad: 4 } });
  ok('aunque esta pantalla no hubiera visto lo de otra persona, guardar NO lo borra', B.doc.items.length === 2 && B.doc.items[0].id === 'inv_1' && g1.item.codigo === 'INV-002' && B.doc.sec === 2 && B.doc.actualizadoPor === 'Empleado de prueba');
  // Dos personas con la pantalla vieja cargan a la vez: quedan las dos cosas
  S.inventarioOficina = [];
  await Promise.all([ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'Monitor', cantidad: 1 } }), ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'Teclado', cantidad: 1 } })]);
  ok('dos cargas A LA VEZ desde pantallas viejas: quedan las dos, con códigos distintos (una de las dos tuvo que repetirse)', B.doc.items.length === 4 && new Set(B.doc.items.map(x => x.codigo)).size === 4 && new Set(B.doc.items.map(x => x.id)).size === 4 && B.doc.sec === 4 && B.intentos >= 4);
  const cuatro = await Promise.all(['A', 'B', 'C', 'D'].map(n => ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'Cosa ' + n, cantidad: 1 } })));
  ok('...y cuatro a la vez también: nadie pisa a nadie', B.doc.items.length === 8 && new Set(B.doc.items.map(x => x.codigo)).size === 8 && B.doc.sec === 8 && new Set(cuatro.map(r => r.item.codigo)).size === 4);
  B.doc.items = B.doc.items.slice(0, 4); B.doc.sec = 4;   // (para lo que sigue)
  ok('...y la pantalla queda con la lista de la base', S.inventarioOficina.length === 8);
  const antes = JSON.stringify(B.doc);
  let fallo = null; try { await ctx.invGuardar({ tipo: 'agregar', datos: { nombre: '' } }); } catch (x) { fallo = x; }
  ok('un cambio que no pasa la revisión no escribe nada', fallo && /Escribe qué es/.test(fallo.message) && JSON.stringify(B.doc) === antes);
  fallo = null; try { await ctx.invGuardar({ tipo: 'borrar', id: 'inv_1' }); } catch (x) { fallo = x; }
  ok('borrar del todo: solo un administrador (quien no lo es, da de baja)', fallo && /Solo un administrador/.test(fallo.message) && B.doc.items.length === 4);
  como('Vendedor', ['dash']); fallo = null; try { await ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'Colado', cantidad: 1 } }); } catch (x) { fallo = x; }
  ok('sin el permiso no se guarda nada', fallo && /permiso/.test(fallo.message) && B.doc.items.length === 4);
  como('Administrador');
  B.falla = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  fallo = null; try { await ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'X', cantidad: 1 } }); } catch (x) { fallo = x; }
  ok('si la base no deja, el aviso lo dice en cristiano', fallo && /La base no dejó guardar/.test(fallo.message));
  B.falla = Object.assign(new Error('Failed to get document because the client is offline.'), { code: 'unavailable' });
  fallo = null; try { await ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'X', cantidad: 1 } }); } catch (x) { fallo = x; }
  ok('sin internet: dice que NO se guardó', fallo && /No hay conexión: no se guardó/.test(fallo.message));
  B.falla = null;
  // Compañía nueva: el documento todavía no existe
  B = baseFalsa(null); ctx.db = B; S.inventarioOficina = [];
  await ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'El primero', cantidad: 1 } });
  ok('si el documento no existe todavía, el primer artículo lo crea', B.doc.items.length === 1 && B.doc.items[0].codigo === 'INV-001');
  // La copia vieja del navegador ya no es semilla de nada
  B = baseFalsa(null); ctx.db = B; S.inventarioOficina = [{ id: 'local_1', nombre: 'Copia vieja del navegador', cantidad: 1 }];
  await ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'Uno de verdad', cantidad: 1 } });
  ok('lo que esta pantalla "recordaba" no se sube a la base como si fuera la lista buena', B.doc.items.length === 1 && B.doc.items[0].nombre === 'Uno de verdad');

  // ── 4c-bis. Lo de antes (el documento que escribía la pestaña de Finanzas) ──
  const VIEJO = { actualizado: 'x', items: [{ id: 'inv_v2', nombre: 'Segundo viejo', cantidad: 6, valorUnit: 35, creado: '2026-03-12T10:00:00.000Z' }, { id: 'inv_v1', nombre: 'Primer viejo', cantidad: 1, valorUnit: 650, creado: '2026-03-10T10:00:00.000Z', nota: 'cosa' }] };
  B = baseFalsa(null, JSON.parse(JSON.stringify(VIEJO))); ctx.db = B; S.inventarioOficina = [];
  ok('con lo de antes sin traer, al abrir hace falta ponerse al día', await ctx.invRevisarAlDia() === true && B.escritos === 0);
  await ctx.invGuardar({ tipo: 'aldia' });
  ok('ponerse al día trae lo de antes completo, con código en el orden en que se cargó', B.doc.items.length === 2 && B.doc.items.find(x => x.id === 'inv_v1').codigo === 'INV-001' && B.doc.items.find(x => x.id === 'inv_v1').nota === 'cosa' && B.doc.items.find(x => x.id === 'inv_v2').codigo === 'INV-002' && B.doc.viejos.sort().join() === 'inv_v1,inv_v2' && B.doc.sec === 2);
  ok('...el documento de antes queda intacto (es el respaldo de cómo estaba)', JSON.stringify(B.viejo) === JSON.stringify(VIEJO) && B.escritosViejo === 0);
  ok('...y ya no hace falta volver a hacerlo', await ctx.invRevisarAlDia() === false);
  // Alguien con una pestaña abierta desde antes de publicar sigue usando la pestaña vieja de Finanzas: su código viejo
  // reescribe SU documento con su lista (sin lo nuevo) más lo que agrega. El inventario nuevo no se entera… hasta ponerse al día.
  await ctx.invGuardar({ tipo: 'agregar', datos: { nombre: 'Cargado con el módulo nuevo', cantidad: 1, serial: 'N-1' } });
  await ctx.invGuardar({ tipo: 'borrar', id: 'inv_v2' });
  B.viejo = { actualizado: 'y', items: VIEJO.items.concat([{ id: 'inv_tarde', nombre: 'Agregado desde una pestaña vieja', cantidad: 2, valorUnit: 10, creado: '2026-11-28T18:00:00.000Z' }]) }; B.ver.v++;
  ok('una pestaña vieja no puede tocar el inventario nuevo: lo cargado con el módulo sigue ahí', B.doc.items.length === 2 && B.doc.items.some(x => x.serial === 'N-1'));
  ok('...y lo que esa pestaña agregó se nota al abrir el módulo', await ctx.invRevisarAlDia() === true);
  await ctx.invGuardar({ tipo: 'aldia' });
  ok('...y se trae con el código que sigue, sin revivir lo borrado ni cambiar los códigos ya dados', B.doc.items.length === 3 && B.doc.items.find(x => x.id === 'inv_tarde').codigo === 'INV-004' && !B.doc.items.some(x => x.id === 'inv_v2') && B.doc.items.find(x => x.id === 'inv_v1').codigo === 'INV-001' && B.doc.items.find(x => x.serial === 'N-1').codigo === 'INV-003' && await ctx.invRevisarAlDia() === false);
  ok('sin documento de antes y sin nuevo, no hay nada que poner al día (no se escribe por abrir)', (B = baseFalsa(null, null), ctx.db = B, await ctx.invRevisarAlDia()) === false && B.escritos === 0);
  ok('traer lo de antes es una función sin sorpresas: lo ya traído no se repite y lo que viene sin id se ignora', (() => { const r1 = I.invTraerViejos({ items: [], sec: 0, viejos: [] }, [{ id: 'a', nombre: 'A', codigo: 'INV-050' }, { nombre: 'sin id' }, null]); const r2 = I.invTraerViejos(r1, [{ id: 'a', nombre: 'A cambiado' }, { id: 'b', nombre: 'B' }]);
    return r1.items.length === 1 && r1.items[0].codigo === undefined && r1.traidos === 1 && r2.items.length === 2 && r2.items[0].nombre === 'A' && r2.traidos === 1 && r2.viejos.join() === 'a,b'; })());

  // ── 4c-ter. Editar con la ventana abierta un rato ──
  B = baseFalsa({ sec: 1, viejos: [], items: [{ id: 'inv_e', codigo: 'INV-001', nombre: 'Laptop', categoria: 'Laptop', marca: '', serial: 'S-1', ubicacion: 'Oficina', area: 'Caja', responsable: 'Luis', cantidad: 1, valorUnit: 100, estado: 'Bueno', fecha: '', nota: '' }] }); ctx.db = B;
  // A abrió la ventana (veía Luis / Bueno). Mientras tanto B lo cambió a María / Para reparar. A solo escribe una nota.
  const formA = { nombre: 'Laptop', categoria: 'Laptop', marca: '', serial: 'S-1', ubicacion: 'Oficina', area: 'Caja', responsable: 'Luis', cantidad: '1', valorUnit: '100', estado: 'Bueno', fecha: '', nota: 'Tiene un rayón' };
  await ctx.invGuardar({ tipo: 'editar', id: 'inv_e', datos: { nombre: 'Laptop', cantidad: 1, serial: 'S-1', responsable: 'María', estado: 'Para reparar', categoria: 'Laptop', area: 'Caja', valorUnit: 100 }, cambiados: ['responsable', 'estado'] });
  await ctx.invGuardar({ tipo: 'editar', id: 'inv_e', datos: formA, cambiados: ['nota'] });
  ok('guardar una nota no devuelve a como estaba lo que otra persona acaba de cambiar', B.doc.items[0].responsable === 'María' && B.doc.items[0].estado === 'Para reparar' && B.doc.items[0].nota === 'Tiene un rayón' && B.doc.items[0].area === 'Caja');
  await ctx.invGuardar({ tipo: 'baja', id: 'inv_e', motivo: 'Se vendió', fecha: HOY });
  fallo = null; try { await ctx.invGuardar({ tipo: 'editar', id: 'inv_e', datos: formA, cambiados: ['nota'] }); } catch (x) { fallo = x; }
  ok('...y si lo dieron de baja mientras tanto, la edición no se guarda callada: avisa', fallo && /fue dado de baja mientras lo tenías abierto/.test(fallo.message) && B.doc.items[0].nota === 'Tiene un rayón');

  // ── 4d. La pantalla ──
  B = baseFalsa({ sec: 3, items: [
    { id: 'inv_a', codigo: 'INV-001', nombre: '<img src=x onerror=alert(1)>', categoria: 'Laptop', marca: 'M"1', serial: 'S-1', ubicacion: 'Oficina', area: 'Caja', responsable: "O'Neil", cantidad: 1, valorUnit: 100, estado: 'Para reparar', nota: '<b>n</b>', creado: '2026-11-01T10:00:00.000Z', creadoPor: 'Ana' },
    { id: "inv_b');alert(1);('", codigo: 'INV-002', nombre: 'Sillas', categoria: 'Silla', ubicacion: 'Oficina', cantidad: 6, valorUnit: 30, estado: 'Bueno', creado: '2026-11-02T10:00:00.000Z' },
    { id: 'inv_c', codigo: 'INV-003', nombre: 'Teléfono', categoria: 'Teléfono / Celular', ubicacion: 'Oficina', cantidad: 1, valorUnit: 140, estado: 'Bueno', creado: '2026-11-03T10:00:00.000Z', baja: { motivo: 'Se perdió', fecha: '2026-11-20', por: 'Ana', nota: '' } }] });
  ctx.db = B; S.inventarioOficina = JSON.parse(JSON.stringify(B.doc.items)); S.page = 'inventario'; S.concesionarios = [];
  dentro("_iv.vista='uso'; _iv.q=''; _iv.cat=''; _iv.ubicacion=''; _iv.estado=''; _iv.orden='reciente'; _ivAlDia.ultima=Date.now(); _ivAlDia.corriendo=false;");
  let h = ctx.PG.inventario();
  ok('la página trae título, botones, resumen, buscador, filtros y la lista', /Inventario de oficina/.test(h) && /onclick="invAbrir\(''\)">＋ Agregar artículo/.test(h) && /invExcel\(\)/.test(h) && /invImprimir\(\)/.test(h) && /invEtiquetas\(''\)/.test(h) && /id="inv-q"/.test(h) && /id="inv-resumen"/.test(h) && /id="inv-selects"/.test(h) && /En uso \(2\)/.test(h) && /Dados de baja \(1\)/.test(h));
  ok('los números de arriba: 2 artículos, 7 unidades, $280, 1 por revisar', /<div class="st-v"[^>]*>2<\/div><div class="st-l">Artículos/.test(h) && />7<\/div><div class="st-l">Unidades/.test(h) && /280,00<\/div><div class="st-l">Valor total/.test(h) && />1<\/div><div class="st-l">Por revisar/.test(h));
  ok('lo que escribe la gente va escapado (nombre, nota, marca, responsable)', !/<img src=x/.test(h) && /&lt;img src=x onerror=alert\(1\)&gt;/.test(h) && !/<b>n<\/b>/.test(h) && /M&quot;1/.test(h) && /O&#39;Neil/.test(h));
  ok('ningún dato de la base va dentro de un onclick: el id viaja en data-id', !/onclick="[^"]*inv_/.test(h) && /data-id="inv_a" onclick="invAbrir\(this\.dataset\.id\)"/.test(h) && /data-id="inv_b&#39;\);alert\(1\);\(&#39;"/.test(h));
  ok('se pinta la tabla (computadora) y las tarjetas (teléfono), y la hoja de estilos cambia entre una y otra', /class="inv-tabla"/.test(h) && /class="inv-cards"/.test(h) && (h.match(/class="inv-card"/g) || []).length === 2 && /@media \(max-width:860px\)\{\s*\.inv-tabla-wrap\{display:none\}\.inv-cards\{display:flex\}/.test(src('assets/pagasi.css')));
  ok('cada fila: editar, duplicar y dar de baja', (h.match(/>Editar<\/button>/g) || []).length === 4 && (h.match(/>Duplicar<\/button>/g) || []).length === 4 && (h.match(/>Dar de baja<\/button>/g) || []).length === 4);
  ok('al abrir se escucha la base (lo que carga otro aparece solo)', B.oyentes.length === 1);
  B.oyentes[0]({ exists: true, data: () => ({ items: B.doc.items.concat([{ id: 'inv_d', codigo: 'INV-004', nombre: 'Llegó de otra pantalla', cantidad: 1, valorUnit: 0, creado: '2026-11-28T10:00:00.000Z' }]) }) });
  ok('...y se repinta el resumen, las pestañas y la lista (no el buscador, para no quitarle el cursor a quien escribe)', /Llegó de otra pantalla/.test(els['inv-lista'].innerHTML) && /En uso \(3\)/.test(els['inv-tabs'].innerHTML) && />3<\/div><div class="st-l">Artículos/.test(els['inv-resumen'].innerHTML));
  S.inventarioOficina = JSON.parse(JSON.stringify(B.doc.items));
  ctx.invBuscar('sillas'); ok('buscar deja solo lo que coincide', (els['inv-lista'].innerHTML.match(/class="inv-card"/g) || []).length === 1 && /Con el filtro: 1 artículo · 6 unidades/.test(els['inv-lista'].innerHTML));
  ctx.invBuscar('zzz'); ok('si nada coincide lo dice y ofrece quitar el filtro', /Nada coincide/.test(els['inv-lista'].innerHTML) && /invLimpiarFiltros\(\)/.test(els['inv-lista'].innerHTML));
  ctx.invLimpiarFiltros(); ctx.invCat('Silla'); ok('tocar una categoría filtra, y tocarla otra vez quita el filtro', dentro('_iv.cat') === 'Silla' && /class="inv-chip on" data-cat="Silla"/.test(els['inv-resumen'].innerHTML) && (ctx.invCat('Silla'), dentro('_iv.cat') === ''));
  ctx.invVista('bajas'); const hb = els['inv-lista'].innerHTML;
  ok('en «Dados de baja»: motivo, fecha, quién, y volver a poner en uso', /Se perdió/.test(hb) && /20\/11\/2026/.test(hb) && />Volver a poner en uso<\/button>/.test(hb) && /invRestaurar\(this\.dataset\.id\)/.test(hb));
  ok('...«Borrar» solo le sale al administrador', />Borrar<\/button>/.test(hb) && (como('Empleado', ['inventario']), ctx.invPintar(), !/>Borrar<\/button>/.test(els['inv-lista'].innerHTML)));
  como('Administrador'); ctx.invVista('uso');
  S.inventarioOficina = []; ctx.invPintar(); ok('vacío: dice por dónde empezar', /Todavía no hay nada cargado/.test(els['inv-lista'].innerHTML));
  S.inventarioOficina = JSON.parse(JSON.stringify(B.doc.items));

  // ── 4e. La ventana de agregar y el aviso de guardado ──
  ctx.invAbrir('');
  ok('la ventana de agregar: 12 casillas, solo el nombre obligatorio, y «Guardar y cargar otro»', ['iv_nombre', 'iv_cat', 'iv_marca', 'iv_serial', 'iv_cant', 'iv_ubic', 'iv_area', 'iv_resp', 'iv_estado', 'iv_valor', 'iv_fecha', 'iv_nota'].every(k => new RegExp('id="' + k + '"').test(els.mbd.innerHTML)) && /Solo el nombre es obligatorio/.test(els.msb.textContent) && /Guardar y cargar otro/.test(els.mft.innerHTML) && els.mtt.textContent === 'Agregar artículo');
  ok('...la fecha de compra viene vacía (antes salía la de hoy)', /id="iv_fecha" type="date" max="\d{4}-\d{2}-\d{2}" value=""/.test(els.mbd.innerHTML));
  const llenar = d => { ['iv_nombre', 'iv_cat', 'iv_marca', 'iv_serial', 'iv_cant', 'iv_ubic', 'iv_area', 'iv_resp', 'iv_estado', 'iv_valor', 'iv_fecha', 'iv_nota'].forEach(k => { els[k] = elemento(); }); Object.keys(d).forEach(k => { els['iv_' + k].value = d[k]; }); };
  llenar({ nombre: 'Laptop nueva', cat: 'Laptop', serial: 'ln-9', cant: '1', ubic: 'Oficina', area: 'Ventas', resp: 'Luis', estado: 'Nuevo', valor: '500' });
  avisos.length = 0; cerradas = 0; bitacora.length = 0; B.falla = Object.assign(new Error('offline'), { code: 'unavailable' });
  let p = ctx.invGuardarForm('', false); await p; await vueltas();
  ok('si la base falla: NO dice «guardado», la ventana sigue abierta y no se anota en la bitácora', avisos.length === 1 && /^error:No hay conexión/.test(avisos[0]) && cerradas === 0 && bitacora.length === 0 && B.doc.items.length === 3 && ctx._ivGuardando === false);
  B.falla = null; avisos.length = 0;
  p = ctx.invGuardarForm('', false); const doble = ctx.invGuardarForm('', false); await p; await vueltas();
  ok('con la base bien: guarda, avisa con el código, cierra y queda en la bitácora', B.doc.items.length === 4 && avisos.length === 1 && /^success:INV-004 · Guardado en el inventario/.test(avisos[0]) && cerradas === 1 && bitacora.join() === 'inventario_agregado:inventario:INV-004');
  ok('un doble clic no lo guarda dos veces', doble === false && B.doc.items.filter(x => x.nombre === 'Laptop nueva').length === 1);
  ok('«cargar otro» recuerda dónde estabas parado (ubicación, área, responsable)', dentro('_iv.pegajoso.area') === 'Ventas' && dentro('_iv.pegajoso.responsable') === 'Luis' && dentro('_iv.pegajoso.ubicacion') === 'Oficina');
  llenar({ nombre: '', cant: '1' }); avisos.length = 0;
  ok('sin nombre: avisa y no llama a la base', ctx.invGuardarForm('', false) === false && /^error:Escribe qué es/.test(avisos[0]) && B.doc.items.length === 4);
  ctx.invAbrir('inv_a');
  ok('editar: trae sus datos, dice quién lo cargó, y el administrador puede borrar o sacar su etiqueta', els.mtt.textContent === 'Editar INV-001' && /value="S-1"/.test(els.mbd.innerHTML) && /Lo cargó Ana el 01\/11\/2026/.test(els.mbd.innerHTML) && /Borrar del todo/.test(els.mft.innerHTML) && /invEtiquetas\(this\.dataset\.id\)/.test(els.mft.innerHTML) && !/Guardar y cargar otro/.test(els.mft.innerHTML));
  como('Empleado', ['inventario']); ctx.invAbrir('inv_a'); ok('...a quien no es administrador no le sale «Borrar del todo»', !/Borrar del todo/.test(els.mft.innerHTML)); como('Administrador');
  ctx.invAbrir('', 'inv_a');
  ok('duplicar: mismos datos, sin el serial ni la nota, y cantidad 1', els.mtt.textContent === 'Cargar otro igual' && /id="iv_serial"[^>]*value=""/.test(els.mbd.innerHTML) && /id="iv_nota"[^>]*value=""/.test(els.mbd.innerHTML) && /id="iv_area"[^>]*value="Caja"/.test(els.mbd.innerHTML));

  // ── 4f. Etiquetas desde la pantalla ──
  ctx.invLimpiarFiltros(); avisos.length = 0; abiertas.length = 0; cerradas = 0;
  els.iv_e_tam = elemento(); els.iv_e_tam.value = 'mediana'; els.iv_e_uni = elemento(); els.iv_e_uni.checked = true;   // (en el navegador salen así marcadas)
  ctx.invEtiquetas('');
  ok('la ventana de etiquetas: tamaño, una por unidad, y cuántas salen', els.mtt.textContent === 'Etiquetas para imprimir' && /id="iv_e_tam"/.test(els.mbd.innerHTML) && /Medianas \(24 por hoja\)/.test(els.mbd.innerHTML) && /id="iv_e_uni" checked/.test(els.mbd.innerHTML) && els.iv_e_cuenta.textContent === '8 etiquetas · 1 hoja');
  els.iv_e_tam = elemento(); els.iv_e_tam.value = 'grande'; els.iv_e_uni = elemento(); els.iv_e_uni.checked = false; ctx._ivEtqCuenta();
  ok('...al cambiar el tamaño o quitar «por unidad» la cuenta cambia', els.iv_e_cuenta.textContent === '3 etiquetas · 1 hoja');
  ctx.invEtiquetasAbrir();
  ok('se abre la hoja en otra ventana, con sus etiquetas, y queda en la bitácora', abiertas.length === 1 && (abiertas[0].html.match(/class="e"/g) || []).length === 3 && /Propiedad de /.test(abiertas[0].html) && cerradas === 1 && /inventario_etiquetas:inventario:/.test(bitacora.join()));
  ctx._sinVentanas = true; avisos.length = 0; cerradas = 0; ctx.invEtiquetasAbrir();
  ok('si el navegador bloquea la ventana, lo dice (y no cierra)', /^error:El navegador bloqueó la ventana/.test(avisos[0]) && cerradas === 0); ctx._sinVentanas = false;
  avisos.length = 0; ctx.invEtiquetas('inv_c');
  ok('algo dado de baja no saca etiqueta', /^info:Ese artículo no lleva etiqueta/.test(avisos[0]));

  // ── 4f-bis. Escanear ──
  ok('el botón «Escanear» está junto al buscador', /class="inv-busca"><input[^>]*id="inv-q"[^>]*><button[^>]*onclick="invEscanear\(\)"[^>]*>.*Escanear<\/button><\/div>/.test(ctx.PG.inventario()));
  // El lienzo de mentira: todas las filas de la imagen traen el mismo código
  const lienzoCon = (texto, w, h) => { const fila = filaDe(texto, (w - 140) / I.invCode39(texto).reduce((a, b) => a + b, 0)); while (fila.length < w) fila.push(230);
    return { getImageData(){ const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, v = fila[x]; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } return { data: d }; } }; };
  const votos = ctx._ivLeerCuadro(lienzoCon('INV-002', 640, 200), 640, 200);
  ok('de un cuadro de la cámara sale el código, visto en varias líneas', Object.keys(votos).join() === 'INV-002' && votos['INV-002'] >= 3);
  ok('...y de un cuadro sin etiqueta no sale nada', Object.keys(ctx._ivLeerCuadro({ getImageData(){ return { data: new Uint8ClampedArray(640 * 200 * 4).fill(180) }; } }, 640, 200)).length === 0);
  S.inventarioOficina = [{ id: 'inv_a', codigo: 'INV-001', nombre: 'Laptop', cantidad: 1, valorUnit: 1 }, { id: 'inv_b', codigo: 'INV-002', nombre: 'Sillas', categoria: 'Silla', cantidad: 6, valorUnit: 1 }, { id: 'inv_c', codigo: 'INV-003', nombre: 'Teléfono', cantidad: 1, valorUnit: 1, baja: { motivo: 'Se perdió', fecha: '2026-11-20', por: 'Ana' } }];
  dentro("_iv.vista='uso'; _iv.q=''; _iv.cat='Laptop'; _iv.ubicacion=''; _iv.estado='';"); ctx.PG.inventario(); avisos.length = 0; bitacora.length = 0;
  let apagadas = 0; const pista = { stop(){ apagadas++; } }, camara = { getTracks(){ return [pista]; } };
  dentro('_ivCam.ultimo = ""; _ivCam.veces = 0;'); vm.runInContext('_ivCam.stream = __cam;', Object.assign(ctx, { __cam: camara })); cerradas = 0;
  ctx._ivCamVisto('INV-002', 1);
  ok('una sola lectura no basta (el Code 39 no trae dígito de control)', cerradas === 0 && apagadas === 0 && avisos.length === 0);
  ctx._ivCamVisto('INV-009', 1); ctx._ivCamVisto('INV-002', 1);
  ok('...ni dos lecturas distintas seguidas', cerradas === 0 && apagadas === 0);
  ctx._ivCamVisto('INV-002', 1);
  ok('con dos iguales: apaga la cámara, cierra y deja ESE artículo en pantalla (quitando los otros filtros)', cerradas === 1 && apagadas === 1 && dentro('_iv.q') === 'INV-002' && dentro('_iv.cat') === '' && els['inv-q'].value === 'INV-002' && (els['inv-lista'].innerHTML.match(/class="inv-card"/g) || []).length === 1 && />Sillas</.test(els['inv-lista'].innerHTML) && /^success:INV-002 · Sillas/.test(avisos[0]) && /inventario_escaneado:inventario:INV-002/.test(bitacora.join()));
  avisos.length = 0; ctx.invIrACodigo('INV-003');
  ok('si lo escaneado está dado de baja, lo muestra en esa pestaña y lo dice', dentro('_iv.vista') === 'bajas' && /^info:INV-003 · Teléfono \(dado de baja\)/.test(avisos[0]) && /Se perdió/.test(els['inv-lista'].innerHTML));
  avisos.length = 0; ctx.invIrACodigo('INV-999');
  ok('si el código no es de este inventario, lo dice y no mueve nada', /^error:INV-999 no está en este inventario/.test(avisos[0]) && dentro('_iv.q') === 'INV-003');
  // La cámara: permisos y apagado
  avisos.length = 0; ctx.navigator.mediaDevices = undefined; ctx.invEscanear();
  ok('en un navegador sin cámara lo dice y no abre nada', /^error:Este navegador no deja usar la cámara/.test(avisos[0]));
  let pedida = null, soltar = null, negar = null; apagadas = 0;
  ctx.navigator.mediaDevices = { getUserMedia(o){ pedida = o; return new Promise((res, rej) => { soltar = res; negar = rej; }); } };
  let relojes = 0; ctx.setInterval = () => { relojes++; return 77; }; ctx.clearInterval = () => {};
  els.ov.style.display = 'none'; ctx.invEscanear();
  ok('al tocar «Escanear» pide la cámara de atrás, sin micrófono', pedida && pedida.audio === false && pedida.video.facingMode.ideal === 'environment' && els.mtt.textContent === 'Escanear etiqueta' && /<video id="iv_video" playsinline muted autoplay>/.test(els.mbd.innerHTML) && els.ov.style.display === 'flex');
  els.iv_video = elemento(); els.iv_video.play = () => {}; soltar(camara); await vueltas();
  ok('...y cuando el teléfono la da, empieza a leer', relojes === 1 && dentro('_ivCam.stream') === camara && /línea roja/.test(els.iv_cam_msg.textContent));
  ctx.invEscanearCerrar();
  ok('al cerrar se apaga la cámara', apagadas === 1 && dentro('_ivCam.stream') === null);
  els.ov.style.display = 'none'; ctx.invEscanear(); els.ov.style.display = 'none'; soltar(camara); await vueltas();
  ok('si cierran la ventana mientras el teléfono pregunta por el permiso, la cámara no se queda prendida', apagadas === 2 && dentro('_ivCam.stream') === null);
  els.ov.style.display = 'none'; els.iv_cam_msg = elemento(); ctx.invEscanear(); negar(Object.assign(new Error('x'), { name: 'NotAllowedError' })); await vueltas();
  ok('sin permiso de cámara lo explica y recuerda que se puede escribir el código', /No hay permiso para usar la cámara/.test(els.iv_cam_msg.textContent) && /escribir el código en el buscador/.test(els.iv_cam_msg.textContent));
  ctx.invEscanearApagar();
  dentro('_ivCam.video = {}; _ivCam.stream = __cam;'); els.ov.style.display = 'none'; apagadas = 0; ctx._ivCamTick();
  ok('si la ventana se cerró por otro lado (la X, otra ventana), el lector se apaga solo', apagadas === 1 && dentro('_ivCam.stream') === null);

  // ── 4g. Al abrir el módulo ──
  B = baseFalsa(null, { items: [{ id: 'inv_v1', nombre: 'De antes', cantidad: 1, valorUnit: 5, creado: '2026-02-01T00:00:00.000Z' }] }); ctx.db = B;
  S.inventarioOficina = []; S.page = 'inventario'; dentro('_ivAlDia.ultima=0; _ivAlDia.corriendo=false; _invEscucha.listo=false; _invEscucha.activa=false; _invEscucha.error="";');
  let hAbrir = ctx.PG.inventario();
  ok('mientras llega la primera lectura dice «Cargando», no «no hay nada»', /Cargando el inventario/.test(hAbrir) && !/Todavía no hay nada cargado/.test(hAbrir));
  await vueltas(60);
  ok('al abrir el módulo se trae lo de antes y recibe su código (una sola escritura)', B.doc && B.doc.items[0].codigo === 'INV-001' && B.escritos === 1 && S.inventarioOficina[0].codigo === 'INV-001' && B.escritosViejo === 0);
  dentro('_ivAlDia.ultima=0; _ivAlDia.corriendo=false;'); ctx.PG.inventario(); await vueltas(60);
  ok('...y con todo al día, abrirlo otra vez no escribe nada', B.escritos === 1);
  const lect = B.lecturas; ctx.PG.inventario(); await vueltas(60);
  ok('...ni vuelve a leer si se entra dos veces seguidas (como mucho una revisión por minuto)', B.lecturas === lect);
  B.falla = Object.assign(new Error('offline'), { code: 'unavailable' }); dentro('_ivAlDia.ultima=0; _ivAlDia.corriendo=false;'); ctx.PG.inventario(); await vueltas(60);
  ok('...si esa revisión falla (sin internet), se vuelve a intentar la próxima vez', dentro('_ivAlDia.ultima') === 0 && dentro('_ivAlDia.corriendo') === false); B.falla = null;

  // ── 4h. La ventana de editar manda solo lo que se tocó, y un guardado lento no toca ventanas ajenas ──
  B = baseFalsa({ sec: 2, viejos: [], items: [{ id: 'inv_a', codigo: 'INV-001', nombre: 'Laptop', categoria: 'Laptop', marca: 'M1', serial: 'S-1', ubicacion: 'Oficina', area: 'Caja', responsable: 'Luis', cantidad: 1, valorUnit: 100, estado: 'Bueno', fecha: '', nota: '', creado: '2026-11-29T00:30:00.000Z', creadoPor: 'Ana' }] }); ctx.db = B;
  S.inventarioOficina = JSON.parse(JSON.stringify(B.doc.items)); dentro('_ivAlDia.ultima=Date.now(); _ivAlDia.corriendo=false; _iv.pegajoso=null; _iv.q=""; _iv.vista="uso";');
  const CASILLAS = { nombre: 'iv_nombre', categoria: 'iv_cat', marca: 'iv_marca', serial: 'iv_serial', cantidad: 'iv_cant', ubicacion: 'iv_ubic', area: 'iv_area', responsable: 'iv_resp', estado: 'iv_estado', valorUnit: 'iv_valor', fecha: 'iv_fecha', nota: 'iv_nota' };
  const poner = d => { Object.keys(CASILLAS).forEach(k => { els[CASILLAS[k]] = elemento(); els[CASILLAS[k]].value = d[k] == null ? '' : String(d[k]); }); };
  const comoEsta = () => Object.assign({}, B.doc.items[0]);
  // Abrir la ventana de verdad necesita un DOM que entienda innerHTML; aquí se ponen las casillas a mano como las dejaría
  poner(comoEsta()); ctx.invAbrir('inv_a'); poner(comoEsta()); dentro('_iv.antes = _ivLeerForm();');
  const marcaDe = () => (/id="iv_ventana" value="(\d+)"/.exec(els.mbd.innerHTML) || [])[1];
  els.iv_ventana = elemento(); els.iv_ventana.value = marcaDe(); els.ov.style.display = 'flex';
  avisos.length = 0; cerradas = 0; const escritosAntes = B.escritos;
  ok('guardar sin haber cambiado nada no escribe en la base', ctx.invGuardarForm('inv_a', false) === false && /^info:No cambiaste nada/.test(avisos[0]) && B.escritos === escritosAntes && cerradas === 1);
  // Otra persona le cambia el responsable; esta ventana (abierta antes) solo cambia la nota
  await ctx.invGuardar({ tipo: 'editar', id: 'inv_a', datos: Object.assign(comoEsta(), { responsable: 'María' }), cambiados: ['responsable'] });
  els.iv_nota.value = 'Con cargador'; avisos.length = 0; cerradas = 0;
  await ctx.invGuardarForm('inv_a', false); await vueltas();
  ok('la ventana manda solo lo que se tocó: queda la nota nueva Y el responsable que puso la otra persona', B.doc.items[0].nota === 'Con cargador' && B.doc.items[0].responsable === 'María' && /^success:INV-001 · Cambios guardados/.test(avisos[0]) && cerradas === 1);
  ok('editar no deja «pegado» el responsable para el próximo artículo nuevo', dentro('_iv.pegajoso') === null);
  ok('«Lo cargó … el» sale con el día de aquí, no con el de la hora universal', I.invDiaLocal('2026-11-29T00:30:00.000Z') === (d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2))(new Date('2026-11-29T00:30:00.000Z')) && I.invDiaLocal('2026-03-10') === '2026-03-10' && I.invDiaLocal('') === '' && I.invDiaLocal('basura') === '' && /_ivFecha\(iso\)\{ var m = [^;]*invDiaLocal\(iso\)/.test(src('modules/inventario.js')) && /invDiaLocal\(x\.creado\)\];/.test(logica));
  // Guardado lento: la persona cerró la ventana y abrió otra cosa antes de que la base contestara
  poner(Object.assign(comoEsta(), { nota: 'Otra nota' })); dentro('_iv.antes = Object.assign(_ivLeerForm(), { nota: "Con cargador" });');
  els.iv_ventana = elemento(); els.iv_ventana.value = marcaDe(); avisos.length = 0; cerradas = 0;
  const lento = ctx.invGuardarForm('inv_a', false); els.iv_ventana.value = 'otra-ventana'; await lento; await vueltas();
  ok('si al terminar un guardado lento la ventana a la vista ya es otra, no se la cierra a nadie', B.doc.items[0].nota === 'Otra nota' && cerradas === 0 && /^success:/.test(avisos[0]));

  // ── 4i. Seriales de relleno, seriales con forma de código, plural, blanco de las barras ──
  const conRelleno = ap({ items: [], sec: 0 }, { tipo: 'agregar', datos: { nombre: 'Silla', cantidad: 4, serial: 'N/A' } });
  ok('«N/A», «S/N», «no tiene»… no son un serial: se guarda vacío, deja poner cantidad y no choca con otro', conRelleno.item.serial === '' && conRelleno.item.cantidad === 4 && ['n/a', 'S/N', 'SN', 'No tiene', 'sin serial', '---', 'XXX', '000', 'no aplica'].every(x => !ap({ items: conRelleno.items, sec: 1 }, { tipo: 'agregar', datos: { nombre: 'Mesa', cantidad: 1, serial: x } }).error) && I.invSerialDeRelleno('ABC-123') === false && I.invSerialDeRelleno('SN-4455') === false);
  ok('un serial con forma de código (INV123456) se sigue encontrando en el buscador', ids(I.invFiltrar([{ id: 'z', codigo: 'INV-001', nombre: 'Cosa', serial: 'INV123456', cantidad: 1 }, { id: 'y', codigo: 'INV-002', nombre: 'Otra', cantidad: 1 }], { vista: 'uso', q: 'INV123456' })) === 'z' && ids(I.invFiltrar([{ id: 'z', codigo: 'INV-001', nombre: 'Cosa', serial: 'INV-2020', cantidad: 1 }, { id: 'w', codigo: 'INV-2020', nombre: 'La del código', cantidad: 1 }], { vista: 'uso', q: 'inv-2020' })) === 'zw');
  S.inventarioOficina = [{ id: 'u', codigo: 'INV-001', nombre: 'Único', cantidad: 1, valorUnit: 5 }]; dentro('_iv.q=""; _iv.vista="uso"; _iv.cat=""; _iv.ubicacion=""; _iv.estado="";'); abiertas.length = 0;
  const impresas = []; ctx._abrirVentanaImpresion = (t, h) => { impresas.push(h); }; ctx.invImprimir();
  ok('la lista impresa de un solo artículo dice «1 artículo · 1 unidad»', impresas.length === 1 && /· 1 artículo · 1 unidad ·/.test(impresas[0]) && !/1 artículos|1 unidades/.test(impresas[0]));
  ok('a cada lado de las barras queda blanco de sobra para un lector de mano (más de 10 barras angostas), en los tres tamaños', Object.keys(I.INV_ETQ_TAM).every(k => { const t = I.INV_ETQ_TAM[k], ancho = I.INV_ETQ_HOJA.ancho / t.cols, barras = ancho - 2 * t.pad - 2 * t.quieta, angosta = barras * 2 / I.invCode39('INV-001').reduce((a, b) => a + b, 0); return t.pad + t.quieta >= 10 * angosta && angosta >= 0.3; }) && /\.bar\{margin-top:auto;padding:0 2\.2mm\}/.test(I.invEtiquetasDoc([{ codigo: 'INV-001', nombre: 'X' }], 'mediana', 'P')));

  console.log(`\n${pass} OK · ${fail} FALLA`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
