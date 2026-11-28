// Inventario de oficina (28-nov-2026, Adam: "necesito que lo revises y lo mejores porque vamos a empezar a
// poner todo lo que tenemos ahí" y "sácame ese módulo de finanzas y ponlo solo").
//
// Antes era una pestaña de Finanzas. Lo que se arregla aquí:
//  · Se guardaba la lista COMPLETA con lo que cada navegador tenía en memoria: dos personas cargando a la
//    vez (o una pestaña abierta desde la mañana) y la última en guardar borraba lo de la otra. Ahora cada
//    cambio se aplica dentro de una transacción sobre lo que hay EN LA BASE en ese momento.
//  · El aviso «agregado» salía antes de saber si la base había guardado. Ahora sale cuando guardó.
//  · Cada artículo lleva su código (INV-001…), serial, marca y modelo, área y responsable.
//  · Un equipo que se daña, se vende o se pierde no se borra: se da de baja y queda el registro.
//
// Vive en config/inventarioEquipos ({ items:[…], sec, viejos, actualizado }). El documento de antes,
// config/inventarioOficina, NO se vuelve a escribir: una pestaña abierta desde antes de publicar sigue con
// el código viejo (el que escribe la lista completa) y, si compartieran documento, borraría lo cargado con
// el módulo nuevo (revisión del 28-nov-2026). Lo que había allí se trae una vez, y lo que alguien agregue
// después desde una pestaña vieja se trae también al abrir el módulo («viejos» guarda qué ya se trajo).
// Las dos direcciones caen en la misma Regla (match /config/{id} → interno): no cambia ninguna Regla.
// La pantalla está en modules/inventario.js. Lo de aquí no toca el DOM (salvo invGuardar/invSuscribir).

var INV_CATS = ['Computadora', 'Laptop', 'Monitor', 'Impresora', 'Teléfono / Celular', 'Tablet', 'Silla', 'Escritorio', 'Mueble / Mobiliario', 'Aire acondicionado', 'Cámara / Seguridad', 'Router / Red', 'UPS / Batería', 'Herramienta', 'Vehículo', 'Otro'];
var INV_CAMPOS = ['nombre', 'categoria', 'marca', 'serial', 'ubicacion', 'area', 'responsable', 'cantidad', 'valorUnit', 'estado', 'fecha', 'nota'];   // lo que se llena en la ventana
var INV_ESTADOS = ['Nuevo', 'Bueno', 'Regular', 'Para reparar', 'Dañado'];
var INV_MOTIVOS_BAJA = ['Se dañó y no tiene arreglo', 'Se vendió', 'Se regaló o se donó', 'Se perdió', 'Lo robaron', 'Se devolvió al proveedor', 'Otro'];
var INV_ORDENES = [['reciente', 'Lo último cargado'], ['codigo', 'Por código'], ['nombre', 'Por nombre'], ['valor', 'Mayor valor'], ['ubicacion', 'Por ubicación']];
// Un documento de Firestore aguanta 1 MiB. Mucho antes de llegar se avisa, en vez de fallar callado.
var INV_TOPE_BYTES = 900000;

function invEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
function invTexto(v, max){ return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 120); }
// Para buscar y comparar: sin tildes ni mayúsculas
function invPlano(v){ return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function invCant(x){ return parseInt(x && x.cantidad, 10) || 0; }
function invValor(x){ return Math.round((parseFloat(x && x.valorUnit) || 0) * invCant(x) * 100) / 100; }
function invEnUso(x){ return !!x && !x.baja; }
function invCodigo(n){ n = parseInt(n, 10) || 0; return 'INV-' + (n < 1000 ? ('000' + n).slice(-3) : String(n)); }
function invNumDeCodigo(c){ var m = /^INV-(\d+)$/.exec(String(c || '')); return m ? parseInt(m[1], 10) : 0; }
function invSerialKey(s){ return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
// Lo que la gente escribe cuando el equipo no tiene serial: no es un serial (y no choca con el de otro)
function invSerialDeRelleno(s){ var k = invSerialKey(s); return !k || /^(NA|SN|NO|SIN|NOTIENE|NOTRAE|NOAPLICA|NOSEVE|NOSELEE|NOLEGIBLE|ILEGIBLE|BORRADO|NINGUNO|SINSERIAL|SINSERIE|SINNUMERO|X+|0+)$/.test(k); }
// El día, en la hora de quien mira (las marcas de tiempo se guardan en hora universal: a las 8:30 pm de Caracas ya es "mañana")
function invDiaLocal(iso){
  var t = String(iso || ''); if(!t) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  var d = new Date(t); if(isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

// Los artículos cargados antes de este cambio no traían código: se les pone en orden de carga la primera
// vez que alguien guarda algo. Devuelve el contador ya avanzado.
function invAsignarCodigos(items, sec){
  var mayor = parseInt(sec, 10) || 0;
  items.forEach(function(x){ mayor = Math.max(mayor, invNumDeCodigo(x.codigo)); });
  items.map(function(x, i){ return { x: x, i: i }; })
    .filter(function(p){ return !invNumDeCodigo(p.x.codigo); })
    .sort(function(a, b){ return String(a.x.creado || '').localeCompare(String(b.x.creado || '')) || (a.i - b.i); })
    .forEach(function(p){ mayor++; p.x.codigo = invCodigo(mayor); });
  return mayor;
}

// Trae del documento de antes lo que todavía no se ha traído (la primera vez, todo; después, lo que alguien
// haya agregado desde una pestaña vieja). Lo que ya se trajo no se vuelve a traer aunque aquí se haya borrado
// o cambiado: de lo viejo solo interesa lo NUEVO. Devuelve { items, sec, viejos, traidos }.
function invTraerViejos(estado, itemsViejos){
  var items = (Array.isArray(estado && estado.items) ? estado.items : []).slice(), viejos = (Array.isArray(estado && estado.viejos) ? estado.viejos : []).slice();
  var visto = {}, traidos = 0;
  viejos.forEach(function(id){ visto[id] = 1; });
  items.forEach(function(x){ if(x && x.id) visto[x.id] = 1; });
  (Array.isArray(itemsViejos) ? itemsViejos : []).forEach(function(x){
    if(!x || typeof x !== 'object' || !x.id || visto[x.id]) return;
    var c = Object.assign({}, x); delete c.codigo;      // su código se lo pone este inventario, al final de la cuenta
    items.push(c); viejos.push(x.id); visto[x.id] = 1; traidos++;
  });
  // lo que ya estaba aquí y también está en lo viejo queda anotado como traído
  (Array.isArray(itemsViejos) ? itemsViejos : []).forEach(function(x){ if(x && x.id && viejos.indexOf(x.id) < 0) viejos.push(x.id); });
  return { items: items, sec: (estado && estado.sec) || 0, viejos: viejos, traidos: traidos };
}
// ¿Hay algo que poner al día? (para no escribir en la base cada vez que alguien abre el módulo)
function invFaltaAlDia(docNuevo, itemsViejos){
  var items = (docNuevo && Array.isArray(docNuevo.items)) ? docNuevo.items : [], viejos = (docNuevo && Array.isArray(docNuevo.viejos)) ? docNuevo.viejos : [];
  if(items.some(function(x){ return x && !invNumDeCodigo(x.codigo); })) return true;
  return (Array.isArray(itemsViejos) ? itemsViejos : []).some(function(x){ return x && x.id && viejos.indexOf(x.id) < 0 && !items.some(function(y){ return y && y.id === x.id; }); });
}

// Lo que viene del formulario, limpio. Devuelve { datos } o { error } con un mensaje para la persona.
function invLimpiar(d, hoyISO){
  d = d || {};
  var nombre = invTexto(d.nombre, 90);
  if(!nombre) return { error: 'Escribe qué es el artículo (por ejemplo: Laptop, Silla de oficina).' };
  var cant = parseInt(d.cantidad, 10);
  if(!(cant >= 1)) return { error: 'La cantidad tiene que ser 1 o más.' };
  if(cant > 9999) return { error: 'Esa cantidad es demasiado grande.' };
  var valor = d.valorUnit === '' || d.valorUnit == null ? 0 : parseFloat(String(d.valorUnit).replace(',', '.'));
  if(!isFinite(valor) || valor < 0) return { error: 'El valor no es un número válido.' };
  var serial = invTexto(d.serial, 60).toUpperCase();
  if(invSerialDeRelleno(serial)) serial = '';
  if(serial && cant > 1) return { error: 'Un serial es de un solo equipo: pon cantidad 1, o deja el serial vacío.' };
  var fecha = invTexto(d.fecha, 10);
  if(fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: 'La fecha de compra no es válida.' };
  if(fecha && hoyISO && fecha > hoyISO) return { error: 'La fecha de compra no puede ser en el futuro.' };
  return { datos: {
    nombre: nombre,
    categoria: INV_CATS.indexOf(d.categoria) > -1 ? d.categoria : 'Otro',
    marca: invTexto(d.marca, 60),
    serial: serial,
    ubicacion: invTexto(d.ubicacion, 80) || 'Oficina',
    area: invTexto(d.area, 60),
    responsable: invTexto(d.responsable, 60),
    cantidad: cant,
    valorUnit: Math.round(valor * 100) / 100,
    estado: INV_ESTADOS.indexOf(d.estado) > -1 ? d.estado : 'Bueno',
    fecha: fecha,
    nota: invTexto(d.nota, 300)
  } };
}

// Aplica UN cambio sobre la lista (función pura: la usan la transacción y las pruebas).
// cambio: { tipo:'agregar', datos } | { tipo:'editar', id, datos, cambiados:[campos] } | { tipo:'baja', id, motivo, fecha, nota }
//         | { tipo:'restaurar', id } | { tipo:'borrar', id }
// Devuelve { items, sec, item } o { error }.
function invAplicar(estado, cambio, quien, ahora, hoyISO){
  var items = (Array.isArray(estado && estado.items) ? estado.items : []).filter(function(x){ return x && typeof x === 'object'; }).map(function(x){ return Object.assign({}, x); });
  var sec = invAsignarCodigos(items, estado && estado.sec);
  cambio = cambio || {};
  var buscar = function(id){ for(var i = 0; i < items.length; i++) if(items[i].id === id) return items[i]; return null; };
  var serialRepetido = function(serial, salvoId){
    var k = invSerialKey(serial); if(!k || invSerialDeRelleno(serial)) return null;
    for(var i = 0; i < items.length; i++){ if(items[i].id !== salvoId && invEnUso(items[i]) && invSerialKey(items[i].serial) === k) return items[i]; }
    return null;
  };
  var item = null;
  if(cambio.tipo === 'agregar' || cambio.tipo === 'editar'){
    var datosEd = cambio.datos || {};
    if(cambio.tipo === 'editar'){
      item = buscar(cambio.id);
      if(!item) return { error: 'Ese artículo ya no está en el inventario (otra persona lo borró). Cierra y vuelve a mirar la lista.' };
      if(item.baja) return { error: 'Ese artículo fue dado de baja mientras lo tenías abierto. Cierra y míralo en «Dados de baja».' };
      // La ventana pudo estar abierta un rato: de lo que trae, solo vale lo que la persona cambió. El resto se
      // toma de la base, para no devolver a como estaba lo que otra persona acaba de corregir.
      if(Array.isArray(cambio.cambiados)){
        var mezcla = {};
        INV_CAMPOS.forEach(function(k){ mezcla[k] = cambio.cambiados.indexOf(k) > -1 ? datosEd[k] : item[k]; });
        datosEd = mezcla;
      }
    }
    var l = invLimpiar(datosEd, hoyISO);
    if(l.error) return { error: l.error };
    var rep = serialRepetido(l.datos.serial, cambio.tipo === 'editar' ? cambio.id : '');
    if(rep) return { error: 'Ese serial ya está cargado: ' + (rep.codigo || '') + ' · ' + (rep.nombre || '') + '.' };
    if(cambio.tipo === 'agregar'){
      sec++;
      item = Object.assign({ id: 'inv_' + String(ahora || '').replace(/\D/g, '').slice(0, 17) + '_' + sec, codigo: invCodigo(sec) }, l.datos, { creado: ahora, creadoPor: quien || '' });
      items.push(item);
    } else {
      Object.assign(item, l.datos, { editado: ahora, editadoPor: quien || '' });
    }
  } else if(cambio.tipo === 'baja'){
    item = buscar(cambio.id);
    if(!item) return { error: 'Ese artículo ya no está en el inventario.' };
    if(item.baja) return { error: 'Ese artículo ya estaba dado de baja.' };
    var fb = invTexto(cambio.fecha, 10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fb)) return { error: 'Pon la fecha de la baja.' };
    if(hoyISO && fb > hoyISO) return { error: 'La fecha de la baja no puede ser en el futuro.' };
    item.baja = { motivo: INV_MOTIVOS_BAJA.indexOf(cambio.motivo) > -1 ? cambio.motivo : 'Otro', fecha: fb, nota: invTexto(cambio.nota, 200), por: quien || '', en: ahora };
  } else if(cambio.tipo === 'restaurar'){
    item = buscar(cambio.id);
    if(!item) return { error: 'Ese artículo ya no está en el inventario.' };
    var rep2 = serialRepetido(item.serial, item.id);
    if(rep2) return { error: 'No se puede volver a poner en uso: su serial ahora lo tiene ' + (rep2.codigo || '') + ' · ' + (rep2.nombre || '') + '.' };
    delete item.baja;
    Object.assign(item, { editado: ahora, editadoPor: quien || '' });
  } else if(cambio.tipo === 'aldia'){
    item = null;   // nada más: arriba ya se le puso código a lo que no tenía
  } else if(cambio.tipo === 'borrar'){
    item = buscar(cambio.id);
    if(!item) return { error: 'Ese artículo ya no está en el inventario.' };
    items = items.filter(function(x){ return x.id !== cambio.id; });
  } else {
    return { error: 'No entendí qué cambio hacer.' };
  }
  if(JSON.stringify(items).length > INV_TOPE_BYTES) return { error: 'El inventario llegó al tope de lo que cabe guardado así. Avísale a quien lleva el sistema antes de seguir cargando.' };
  return { items: items, sec: sec, item: item };
}

// Los números de arriba: solo cuenta lo que está en uso
function invResumen(items){
  var r = { articulos: 0, unidades: 0, valor: 0, revisar: 0, bajas: 0, sinValor: 0, porCat: [] }, cat = {};
  (items || []).forEach(function(x){
    if(!x) return;
    if(!invEnUso(x)){ r.bajas++; return; }
    var n = invCant(x), v = invValor(x), c = x.categoria || 'Otro';
    r.articulos++; r.unidades += n; r.valor += v;
    if(x.estado === 'Para reparar' || x.estado === 'Dañado') r.revisar++;
    if(!(parseFloat(x.valorUnit) > 0)) r.sinValor++;
    if(!cat[c]) cat[c] = { cat: c, n: 0, val: 0 };
    cat[c].n += n; cat[c].val += v;
  });
  r.valor = Math.round(r.valor * 100) / 100;
  r.porCat = Object.keys(cat).map(function(k){ cat[k].val = Math.round(cat[k].val * 100) / 100; return cat[k]; }).sort(function(a, b){ return b.n - a.n || a.cat.localeCompare(b.cat); });
  return r;
}

// f: { vista:'uso'|'bajas', q, cat, ubicacion, estado }
function invFiltrar(items, f){
  f = f || {};
  var palabras = invPlano(f.q).split(/\s+/).filter(Boolean);
  // «INV-012», «inv012» o «INV'012» (así lo escribe un lector con el teclado en español): ese artículo y no INV-0120
  var mCod = /^inv[^a-z0-9]?(\d{3,})$/.exec(invPlano(f.q).trim()), numBuscado = mCod ? parseInt(mCod[1], 10) : 0, serialBuscado = mCod ? invSerialKey(f.q) : '';
  return (items || []).filter(function(x){
    if(!x) return false;
    if((f.vista === 'bajas') === invEnUso(x)) return false;
    if(f.cat && (x.categoria || 'Otro') !== f.cat) return false;
    if(f.ubicacion && (x.ubicacion || 'Oficina') !== f.ubicacion) return false;
    if(f.estado && (x.estado || '') !== f.estado) return false;
    if(numBuscado) return invNumDeCodigo(x.codigo) === numBuscado || (serialBuscado && invSerialKey(x.serial).indexOf(serialBuscado) > -1);
    if(!palabras.length) return true;
    var donde = invPlano([x.codigo, x.nombre, x.categoria, x.marca, x.serial, x.ubicacion, x.area, x.responsable, x.nota, x.baja && x.baja.motivo].join(' '));
    var sinGuion = donde.replace(/[^a-z0-9 ]/g, '');
    return palabras.every(function(p){ return donde.indexOf(p) > -1 || sinGuion.indexOf(p.replace(/[^a-z0-9]/g, '') || '\u0000') > -1; });
  });
}

function invOrdenar(items, orden){
  var txt = function(a, b, k){ return invPlano(a[k]).localeCompare(invPlano(b[k])); };
  var porCodigo = function(a, b){ return invNumDeCodigo(a.codigo) - invNumDeCodigo(b.codigo); };
  var reciente = function(a, b){ return String(b.creado || '').localeCompare(String(a.creado || '')) || porCodigo(b, a); };
  var f = { codigo: porCodigo,
    nombre: function(a, b){ return txt(a, b, 'nombre') || porCodigo(a, b); },
    valor: function(a, b){ return invValor(b) - invValor(a) || porCodigo(a, b); },
    ubicacion: function(a, b){ return txt(a, b, 'ubicacion') || txt(a, b, 'area') || porCodigo(a, b); } }[orden] || reciente;
  return (items || []).slice().sort(f);
}

// Dónde puede estar algo: la oficina, cada concesionario y lo que ya se haya escrito antes
function invUbicaciones(items, concesionarios){
  var l = ['Oficina'];
  (concesionarios || []).filter(function(c){ return c && !c.eliminado; }).forEach(function(c){ l.push('Concesionario: ' + (c.nombre || c.id)); });
  l.push('Otro lugar');
  (items || []).forEach(function(x){ if(x && x.ubicacion && l.indexOf(x.ubicacion) < 0) l.push(x.ubicacion); });
  return l;
}
// Lo que ya se escribió en un campo libre (área, responsable, marca), para sugerirlo y no escribirlo distinto cada vez
function invSugerencias(items, campo){
  var vistos = {}, l = [];
  (items || []).forEach(function(x){ var v = x && invTexto(x[campo], 60); var k = invPlano(v); if(v && !vistos[k]){ vistos[k] = 1; l.push(v); } });
  return l.sort(function(a, b){ return invPlano(a).localeCompare(invPlano(b)); });
}

// Las filas del Excel: todo lo que se sabe de cada artículo, no solo lo que cabe en pantalla
var INV_EXCEL_COLS = ['Código', 'Artículo', 'Categoría', 'Marca y modelo', 'Serial', 'Ubicación', 'Área o puesto', 'Responsable', 'Cantidad', 'Valor unitario ($)', 'Valor total ($)', 'Estado', 'Fecha de compra', 'Nota', 'Cargado por', 'Cargado el'];
function invFilaExcel(x){
  return [x.codigo || '', x.nombre || '', x.categoria || 'Otro', x.marca || '', x.serial || '', x.ubicacion || '', x.area || '', x.responsable || '', invCant(x), parseFloat(x.valorUnit) || 0, invValor(x), x.estado || '', x.fecha || '', x.nota || '', x.creadoPor || '', invDiaLocal(x.creado)];
}

// ── Etiquetas para pegar en cada equipo (28-nov-2026, Adam: "créale unas etiquetas para luego poder imprimirlas") ──
// Hoja carta con margen de 9 mm; cada etiqueta lleva el nombre de la empresa, el código en grande, qué es,
// su serial y el código de barras (Code 39) del código, por si algún día se quiere pasar un lector.
var INV_ETQ_TAM = {
  // «quieta» es el blanco a cada lado de las barras, además del borde de la etiqueta: entre los dos suman más de
  // 10 barras angostas, que es lo que pide un lector de mano para saber dónde empieza el código (revisión del 28-nov).
  mediana: { nombre: 'Medianas (24 por hoja)', cols: 3, filas: 8, pad: 2.4, emp: 5.4, cod: 15, nom: 7.6, det: 5.8, barra: 7.5, lineas: 2, quieta: 2.2 },
  grande: { nombre: 'Grandes (10 por hoja)', cols: 2, filas: 5, pad: 4, emp: 7.5, cod: 25, nom: 11.5, det: 8.5, barra: 13, lineas: 2, quieta: 3 },
  pequena: { nombre: 'Pequeñas (40 por hoja)', cols: 4, filas: 10, pad: 1.8, emp: 4.4, cod: 11, nom: 6, det: 0, barra: 6, lineas: 1, quieta: 1.7 }
};
var INV_ETQ_HOJA = { ancho: 197.9, alto: 261, margen: 9 };   // carta: 215,9 × 279,4 mm
var INV_ETQ_TOPE = 200;                                      // de una misma fila (500 sillas no son 500 etiquetas por descuido)

// Code 39: cada letra son 5 barras y 4 espacios, 3 de ellos anchos. Las barras salen de la clave «2 de 5» del
// número de la letra dentro de su decena, y la decena dice cuál de los 4 espacios es el ancho. Devuelve los
// anchos alternando barra, espacio, barra… empezando por barra (con los asteriscos de inicio y fin).
var INV39_ALFA = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ-. *', INV39_BARRAS = ['10001', '01001', '11000', '00101', '10100', '01100', '00011', '10010', '01010', '00110'], INV39_ESPACIO = [1, 2, 3, 0];
// Los 9 elementos de una letra (barra, espacio, barra…): '1' = ancho, '0' = angosto
function inv39Patron(ch){
  var i = INV39_ALFA.indexOf(ch), b = INV39_BARRAS[i % 10], ancho = INV39_ESPACIO[Math.floor(i / 10)], p = '';
  if(i < 0) return '';
  for(var k = 0; k < 5; k++){ p += b.charAt(k); if(k < 4) p += (k === ancho ? '1' : '0'); }
  return p;
}
function invCode39(texto){
  var N = 2, W = 5, limpio = String(texto == null ? '' : texto).toUpperCase().replace(/[^0-9A-Z. -]/g, ''), out = [];
  if(!limpio) return out;
  ('*' + limpio + '*').split('').forEach(function(ch, n, todas){
    inv39Patron(ch).split('').forEach(function(e){ out.push(e === '1' ? W : N); });
    if(n < todas.length - 1) out.push(N);   // el espacio entre una letra y la siguiente
  });
  return out;
}
function invBarrasSvg(texto, altoMm){
  var a = invCode39(texto), x = 0, r = '';
  if(!a.length) return '';
  a.forEach(function(w, i){ if(i % 2 === 0) r += '<rect x="' + x + '" y="0" width="' + w + '" height="10"/>'; x += w; });
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + x + ' 10" preserveAspectRatio="none" shape-rendering="crispEdges" style="display:block;width:100%;height:' + altoMm + 'mm" fill="#000">' + r + '</svg>';
}
// Qué etiquetas salen: solo de lo que está en uso y ya tiene código. porUnidad: 6 sillas = 6 etiquetas.
function invEtiquetasDe(items, porUnidad){
  var l = [];
  (items || []).forEach(function(x){
    if(!x || !invEnUso(x) || !invNumDeCodigo(x.codigo)) return;
    var n = porUnidad ? Math.min(Math.max(invCant(x), 1), INV_ETQ_TOPE) : 1;
    for(var i = 0; i < n; i++) l.push(x);
  });
  return l;
}
function invEtiquetasHojas(cuantas, tam){ var t = INV_ETQ_TAM[tam] || INV_ETQ_TAM.mediana; return Math.ceil((cuantas || 0) / (t.cols * t.filas)); }
// La página completa lista para imprimir (se abre en una ventana aparte). Todo lo escrito por la gente va escapado.
function invEtiquetasDoc(etiquetas, tam, empresa){
  var t = INV_ETQ_TAM[tam] || INV_ETQ_TAM.mediana, porHoja = t.cols * t.filas, H = INV_ETQ_HOJA, hojas = [];
  for(var i = 0; i < etiquetas.length; i += porHoja) hojas.push(etiquetas.slice(i, i + porHoja));
  var una = function(x){
    var det = [x.marca ? invEsc(x.marca) : '', x.serial ? 'S/N ' + invEsc(x.serial) : ''].filter(Boolean).join(' · ');
    return '<div class="e"><div class="emp">' + invEsc(empresa ? 'Propiedad de ' + empresa : 'Inventario') + '</div>'
      + '<div class="cod">' + invEsc(x.codigo) + '</div><div class="nom">' + invEsc(x.nombre || '') + '</div>'
      + (t.det && det ? '<div class="det">' + det + '</div>' : '') + '<div class="bar">' + invBarrasSvg(x.codigo, t.barra) + '</div></div>';
  };
  var css = '*{box-sizing:border-box;margin:0;padding:0}@page{size:Letter;margin:' + H.margen + 'mm}'
    + 'body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#e9ecf3;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + '.barra{position:sticky;top:0;background:#fff;border-bottom:1px solid #d5d9e3;padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:13px;color:#333;z-index:2}'
    + '.barra button{background:#2563EB;color:#fff;border:none;padding:9px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}'
    + '.hoja{width:' + H.ancho + 'mm;height:' + H.alto + 'mm;margin:8mm auto;background:#fff;display:grid;grid-template-columns:repeat(' + t.cols + ',1fr);grid-template-rows:repeat(' + t.filas + ',1fr);overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.12)}'
    + '.e{border:.2mm dashed #b5b5b5;padding:' + t.pad + 'mm;display:flex;flex-direction:column;overflow:hidden;min-width:0;min-height:0}'
    + '.emp{font-size:' + t.emp + 'pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.cod{font-size:' + t.cod + 'pt;font-weight:900;line-height:1.05;letter-spacing:.01em;margin-top:.6mm;white-space:nowrap}'
    + '.nom{font-size:' + t.nom + 'pt;font-weight:700;line-height:1.15;margin-top:.5mm;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + t.lineas + ';overflow:hidden;overflow-wrap:anywhere}'
    + '.det{font-size:' + t.det + 'pt;line-height:1.15;margin-top:.4mm;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.bar{margin-top:auto;padding:0 ' + t.quieta + 'mm}'
    + '@media print{body{background:#fff}.barra{display:none!important}.hoja{margin:0;box-shadow:none;break-after:page;page-break-after:always}.hoja:last-child{break-after:auto;page-break-after:auto}}';
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Etiquetas del inventario</title><style>' + css + '</style></head><body>'
    + '<div class="barra"><button onclick="window.print()">Imprimir</button><span><b>' + etiquetas.length + ' etiqueta' + (etiquetas.length === 1 ? '' : 's') + '</b> en ' + hojas.length + ' hoja' + (hojas.length === 1 ? '' : 's') + ' tamaño carta. Al imprimir, deja la escala en 100 % (sin «ajustar a la página»). La línea punteada es para recortar.</span></div>'
    + hojas.map(function(h){ return '<div class="hoja">' + h.map(una).join('') + '</div>'; }).join('')
    + '</body></html>';
}

// ── Leer la etiqueta con la cámara (28-nov-2026, Adam: "agrégale el botón de escanear") ──
// La cámara da una imagen; de ella se toman varias filas horizontales y cada una se pasa por aquí. Una fila es
// una lista de claridades (0 = negro, 255 = blanco). Se convierte en rachas (barra, espacio, barra…) y se busca
// un Code 39 completo: asterisco, letras, asterisco. Sirve al derecho y al revés (etiqueta de cabeza).
var _inv39Tabla = null;
function inv39Tabla(){
  if(_inv39Tabla) return _inv39Tabla;
  _inv39Tabla = {};
  INV39_ALFA.split('').forEach(function(ch){ _inv39Tabla[inv39Patron(ch)] = ch; });
  return _inv39Tabla;
}
// Rachas de una fila: números positivos = barra oscura, negativos = espacio claro. El corte entre claro y
// oscuro se saca de cada zona de la fila (la luz nunca es pareja); donde no hay contraste, todo es claro.
function invRachas(fila){
  var n = fila.length, B = Math.max(8, Math.round(n / 24)), nb = Math.ceil(n / B), mn = [], mx = [], b, i, v;
  for(b = 0; b < nb; b++){
    var lo = 255, hi = 0;
    for(i = b * B; i < Math.min(n, (b + 1) * B); i++){ v = fila[i]; if(v < lo) lo = v; if(v > hi) hi = v; }
    mn.push(lo); mx.push(hi);
  }
  var r = [], cur = -1, len = 0;
  for(i = 0; i < n; i++){
    b = Math.floor(i / B);
    var l = Math.min(mn[b], b > 0 ? mn[b - 1] : 255, b < nb - 1 ? mn[b + 1] : 255), h = Math.max(mx[b], b > 0 ? mx[b - 1] : 0, b < nb - 1 ? mx[b + 1] : 0);
    var oscuro = (h - l >= 50 && fila[i] < (l + h) / 2) ? 1 : 0;
    if(oscuro === cur) len++; else { if(cur >= 0) r.push(cur ? len : -len); cur = oscuro; len = 1; }
  }
  if(cur >= 0) r.push(cur ? len : -len);
  return r;
}
// Una letra: de sus 5 barras, 2 son anchas; de sus 4 espacios, 1. Barras y espacios se miden por separado
// porque la tinta (o el desenfoque) engorda las barras y adelgaza los espacios.
function _inv39Letra(W, p){
  var barras = [W[p], W[p + 2], W[p + 4], W[p + 6], W[p + 8]], esp = [W[p + 1], W[p + 3], W[p + 5], W[p + 7]];
  var ob = barras.slice().sort(function(a, b){ return a - b; }), oe = esp.slice().sort(function(a, b){ return a - b; });
  if(ob[3] < ob[2] * 1.3 + 0.5 || oe[3] < oe[2] * 1.3 + 0.5) return null;      // los anchos tienen que despegarse de los angostos
  if(ob[4] > ob[0] * 7 + 2 || oe[3] > oe[0] * 7 + 2) return null;              // ni tanto: eso ya no es una barra, es otra cosa
  var cb = (ob[2] + ob[3]) / 2, ce = (oe[2] + oe[3]) / 2, pat = '';
  for(var k = 0; k < 9; k++) pat += (W[p + k] > (k % 2 === 0 ? cb : ce)) ? '1' : '0';
  var T = inv39Tabla();
  return Object.prototype.hasOwnProperty.call(T, pat) ? T[pat] : null;
}
function invLeerRachas(rachas){
  var W = rachas.map(Math.abs);
  for(var s0 = 0; s0 + 9 <= rachas.length; s0++){
    if(rachas[s0] <= 0) continue;                                  // una letra empieza en barra
    if(_inv39Letra(W, s0) !== '*') continue;
    var ancho0 = 0, k; for(k = 0; k < 9; k++) ancho0 += W[s0 + k];
    var txt = '', p = s0 + 10, cerro = false;
    for(var c = 0; c < 24 && p + 9 <= rachas.length; c++, p += 10){
      var an = 0; for(k = 0; k < 9; k++) an += W[p + k];
      if(an < ancho0 * 0.6 || an > ancho0 * 1.6) break;            // todas las letras miden parecido
      if(W[p - 1] > ancho0 * 0.5) break;                           // el espacio entre letras es angosto
      var ch = _inv39Letra(W, p);
      if(ch === null) break;
      if(ch === '*'){ cerro = true; break; }
      txt += ch;
    }
    if(cerro && txt) return txt;
  }
  return '';
}
function invLeerFila(fila){
  var r = invRachas(fila);
  return invLeerRachas(r) || invLeerRachas(r.slice().reverse());
}
// Solo se acepta lo que tiene forma de código del inventario (el Code 39 no trae dígito de control)
function invCodigoLeido(texto){ var m = /^INV-(\d{1,6})$/.exec(String(texto || '').trim().toUpperCase()); return m ? invCodigo(parseInt(m[1], 10)) : ''; }

// ── Quién entra ──────────────────────────────────────────────────────────────
// Los administradores y quien tenga el permiso «Inventario de oficina». El vendedor de un concesionario, nunca.
function invPuedeVer(){
  if(typeof S === 'undefined' || !S.currentUser) return false;
  if(typeof isAdminUser === 'function' && isAdminUser()) return true;
  if(typeof isVendedorConcesionarioRole === 'function' && isVendedorConcesionarioRole()) return false;
  return (typeof getCurrentPerms === 'function' ? getCurrentPerms() : []).indexOf('inventario') > -1;
}
function invQuien(){ return (typeof S !== 'undefined' && S.currentUser && (S.currentUser.nombre || S.currentUser.email)) || ''; }
function invHoy(){ return (typeof hoyLocalISO === 'function') ? hoyLocalISO() : new Date().toISOString().slice(0, 10); }

// ── La base ──────────────────────────────────────────────────────────────────
var INV_DOC = 'inventarioEquipos', INV_DOC_VIEJO = 'inventarioOficina';
function _invRef(){ return db.collection('config').doc(INV_DOC); }
function _invRefViejo(){ return db.collection('config').doc(INV_DOC_VIEJO); }
// Guarda UN cambio. Lee el documento dentro de una transacción y aplica el cambio sobre lo que hay en la
// base (no sobre lo que este navegador recuerda), así nadie le pisa lo cargado a otro. Resuelve con
// { item, items } cuando la base YA guardó; rechaza con un Error cuyo mensaje se le puede mostrar a la persona.
// El documento viejo se lee (nunca se escribe) cuando el nuevo todavía no existe o cuando el cambio es «aldia».
function invGuardar(cambio){
  if(typeof db === 'undefined' || !db) return Promise.reject(new Error('No hay conexión con la base. Recarga la página.'));
  if(!invPuedeVer()) return Promise.reject(new Error('No tienes el permiso del inventario de oficina.'));
  if(cambio && cambio.tipo === 'borrar' && !(typeof isAdminUser === 'function' && isAdminUser())) return Promise.reject(new Error('Solo un administrador borra del todo. Lo normal es «Dar de baja».'));
  var ref = _invRef(), refViejo = _invRefViejo(), quien = invQuien(), ahora = new Date().toISOString(), hoy = invHoy();
  return db.runTransaction(function(tx){
    return tx.get(ref).then(function(d){
      var base = (d && d.exists) ? (d.data() || {}) : null;
      var leerViejo = !base || (cambio && cambio.tipo === 'aldia');
      return (leerViejo ? tx.get(refViejo) : Promise.resolve(null)).then(function(dv){
        var est = { items: base ? base.items : [], sec: base ? base.sec : 0, viejos: base ? base.viejos : [] };
        if(dv) est = invTraerViejos(est, (dv.exists && Array.isArray((dv.data() || {}).items)) ? dv.data().items : []);
        var r = invAplicar(est, cambio, quien, ahora, hoy);
        if(r.error){ var e = new Error(r.error); e.invAviso = true; throw e; }
        tx.set(ref, { items: r.items, sec: r.sec, viejos: Array.isArray(est.viejos) ? est.viejos : [], actualizado: ahora, actualizadoPor: quien });
        return r;
      });
    });
  }).then(function(r){
    if(typeof S !== 'undefined'){ S.inventarioOficina = r.items; }
    _invEscucha.listo = true;
    return r;
  }, function(e){
    if(e && e.invAviso) throw e;
    var msg = (e && e.code === 'permission-denied') ? 'La base no dejó guardar: tu usuario no tiene permiso para esto.'
      : ((e && (e.code === 'unavailable' || /offline|network|transport/i.test(e.message || ''))) ? 'No hay conexión: no se guardó. Revisa el internet y vuelve a intentar.'
      : ('No se pudo guardar: ' + ((e && e.message) || e)));
    throw new Error(msg);
  });
}
// Al abrir el módulo: ¿hay algo en el documento viejo sin traer, o artículos sin código? Lee los dos documentos
// (sin escribir) y resuelve con true si hace falta el cambio «aldia».
function invRevisarAlDia(){
  return Promise.all([_invRef().get(), _invRefViejo().get()]).then(function(r){
    var nuevo = (r[0] && r[0].exists) ? (r[0].data() || {}) : null, viejo = (r[1] && r[1].exists && Array.isArray((r[1].data() || {}).items)) ? r[1].data().items : [];
    return invFaltaAlDia(nuevo, viejo);
  });
}
// Mientras la pantalla está abierta se escucha el documento: lo que carga otra persona aparece solo.
var _invEscucha = { activa: false, error: '', listo: false };
function invSuscribir(alCambiar){
  if(_invEscucha.activa || typeof db === 'undefined' || !db) return;
  _invEscucha.activa = true;
  try {
    _invRef().onSnapshot(function(d){
      if(d && d.exists && Array.isArray((d.data() || {}).items)) S.inventarioOficina = d.data().items;
      _invEscucha.error = ''; _invEscucha.listo = true;
      if(typeof alCambiar === 'function') alCambiar();
    }, function(e){
      _invEscucha.activa = false;
      _invEscucha.error = (e && e.code === 'permission-denied') ? 'La base no deja leer el inventario con este usuario.' : 'No se pudo leer el inventario. Revisa el internet y recarga.';
      if(typeof alCambiar === 'function') alCambiar();
    });
  } catch(e){ _invEscucha.activa = false; }
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { INV_CATS: INV_CATS, INV_ESTADOS: INV_ESTADOS, INV_MOTIVOS_BAJA: INV_MOTIVOS_BAJA, INV_ORDENES: INV_ORDENES, INV_TOPE_BYTES: INV_TOPE_BYTES, INV_EXCEL_COLS: INV_EXCEL_COLS,
    invEsc: invEsc, invTexto: invTexto, invPlano: invPlano, invCant: invCant, invValor: invValor, invEnUso: invEnUso, invCodigo: invCodigo, invNumDeCodigo: invNumDeCodigo, invSerialKey: invSerialKey,
    invAsignarCodigos: invAsignarCodigos, invLimpiar: invLimpiar, invAplicar: invAplicar, invResumen: invResumen, invFiltrar: invFiltrar, invOrdenar: invOrdenar,
    invUbicaciones: invUbicaciones, invSugerencias: invSugerencias, invFilaExcel: invFilaExcel,
    INV_CAMPOS: INV_CAMPOS, invSerialDeRelleno: invSerialDeRelleno, invDiaLocal: invDiaLocal, invTraerViejos: invTraerViejos, invFaltaAlDia: invFaltaAlDia,
    INV_ETQ_TAM: INV_ETQ_TAM, INV_ETQ_HOJA: INV_ETQ_HOJA, INV_ETQ_TOPE: INV_ETQ_TOPE, invCode39: invCode39, invBarrasSvg: invBarrasSvg, invEtiquetasDe: invEtiquetasDe, invEtiquetasHojas: invEtiquetasHojas, invEtiquetasDoc: invEtiquetasDoc,
    inv39Patron: inv39Patron, inv39Tabla: inv39Tabla, invRachas: invRachas, invLeerRachas: invLeerRachas, invLeerFila: invLeerFila, invCodigoLeido: invCodigoLeido };
}
