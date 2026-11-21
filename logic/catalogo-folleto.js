// ═══════════════════════════════════════════════════════════════
//  CATÁLOGO · FOLLETO POR CONCESIONARIO (20-nov-2026)
//  Adam, en el Catálogo web: "aquí necesito que me pongas un botón que diga crear folleto y se
//  cree un folleto con los precios de cada concesionario... con este estilo igual" (dos imágenes
//  de muestra: «Pagasi × ZONTES» y «Pagasi × BERA»: fondo azul, «Tu Bera. En cuotas.», tabla con
//  la inicial y la cuota quincenal a 6, 9 y 12 meses, y «Solicitar en pagasi.io»).
//
//  El botón «Crear folleto» sale en la franja de cada concesionario de la tabla. El folleto es
//  UNA imagen de 1080 de ancho que el sistema dibuja en un lienzo con LOS MISMOS números de la
//  tabla (catPlan): los modelos visibles en la web y con precio. Nada se guarda en la base: solo
//  se lee el catálogo y se descarga la imagen.
//
//  SIEMPRE una sola hoja TAMAÑO CARTA (Adam, 20-nov-2026: "cuando hay muchas motos el sistema
//  crea 2 separados... necesito que siempre sea uno" y "recuerda que esto lo imprimimos... así
//  que tiene que ser tamaño estándar"). La imagen mide 2550 × 3300 píxeles: una hoja carta
//  (8,5 × 11 pulgadas) a calidad de imprenta. Con muchos modelos las filas se achican y el título
//  de arriba se aprieta; nunca se parte en páginas ni cambia de tamaño.
// ═══════════════════════════════════════════════════════════════

// Se dibuja en una hoja de 1080 × 1398 (la proporción de la carta) y se amplía a 2550 × 3300.
var CAT_FOLLETO = { W: 1080, H: 1398, PX_ANCHO: 2550, PX_ALTO: 3300 };
// El contacto que va abajo (Adam, 20-nov-2026: "agrega el instagram y el número de teléfono"):
// los mismos que muestra pagasi.io.
var CAT_FOLLETO_CONTACTO = { instagram: '@pagasi.io', telefono: '0424-217-7798' };
// Marcas que se reconocen en el nombre del concesionario para el título («Tu Bera.»). Si el
// nombre no trae ninguna (ARI BENZA), el título es «Tu moto.».
var CAT_FOLLETO_MARCAS = ['Bera', 'Empire', 'Haojin', 'Toro', 'Veloz', 'Piaggio', 'Bajaj', 'Benmo', 'Zontes', 'Keeway', 'Vespa', 'Suzuki', 'Yamaha', 'Honda', 'Kawasaki', 'Benelli', 'Kymco', 'Hero', 'TVS', 'Lifan', 'Loncin', 'Skygo', 'Escuda'];
// El logo de la marca, en blanco, va donde antes iba la moto (Adam, 21-nov-2026: "creo que en vez
// de la moto vamos a poner el logo de la marca.. ejemplo bera" y "pon los logos en blanco").
// Son archivos del sistema (assets/marcas/, blanco sobre transparente) y se eligen por la marca que
// se reconoce en el nombre del concesionario. Una marca sin logo aquí sigue saliendo con la moto.
var CAT_MARCAS_DIR = 'assets/marcas/';
var CAT_FOLLETO_LOGOS = { Bera: 'bera.png', Empire: 'empire-keeway.png', Haojin: 'haojin.png', Toro: 'toro.png', Veloz: 'veloz.png',
  Piaggio: 'piaggio.png', Bajaj: 'bajaj.png', Benmo: 'benmo-motos.png' };   // Bajaj y Benmo, buscados en internet el 21-nov-2026 (Adam: "busca los logos que te faltan"); el de Piaggio lo mandó él ("este es el logo de piaggio")
// Marcas que son TIENDAS y no fábricas: venden motos de varias marcas, así que llevan su logo pero el
// título es «Tu moto.» (como en los folletos de Benmo que Adam aprobó en noviembre).
var CAT_FOLLETO_TIENDAS = { Benmo: 1 };
// Concesionarios que en el folleto salen con otro nombre que en el sistema.
// Adam, 21-nov-2026: "Ari Benza [es] Benmo Motos El Llanito".
var CAT_FOLLETO_NOMBRES = { 'ari benza': 'BENMO MOTOS EL LLANITO' };
var CAT_FOLLETO_LOGO = '__logo';      // el valor de «Logo de la marca» en la lista de imágenes del folleto
var _catFolleto = { d: null, fotoId: '', imgs: {}, fuente: null, turno: 0, indice: null, indiceP: null };
// Las motos RECORTADAS (sin fondo), para que en el folleto salgan grandes y «flotando» sobre el
// azul y no en un recuadro blanco (Adam, 20-nov-2026: "la foto de la moto está muy plana").
// Son archivos del propio sistema: assets/catalogo-recortes/<id>.webp, con un índice que dice de
// qué foto salió cada uno. Si la foto del modelo cambió después, el recorte ya no se usa (hasta
// volver a recortar con respaldos/catalogo-recortes/actualizar.py) y la foto sale en su recuadro.
var CAT_RECORTES = 'assets/catalogo-recortes/';
function _catFolletoIndice(){
  if(_catFolleto.indiceP) return _catFolleto.indiceP;
  return (_catFolleto.indiceP = new Promise(function(ok){
    var fin = function(x){ _catFolleto.indice = (x && x.motos && typeof x.motos === 'object') ? x.motos : {}; ok(_catFolleto.indice); };
    try{
      if(typeof fetch !== 'function'){ fin(null); return; }
      fetch(CAT_RECORTES + 'indice.json', { cache: 'no-cache' }).then(function(r){ return (r && r.ok) ? r.json() : null; }).then(fin, function(){ fin(null); });
    }catch(e){ fin(null); }
  }));
}
// El recorte de un modelo, si está al día con su foto: { url, n, c } · n = tamaño de la moto en la
// foto original (para elegir la más nítida) · c = la foto original viene cortada por el borde.
function _catFolletoRecorte(m){
  var x = (_catFolleto.indice || {})[String(m && m.id)], de = String((m && (m.imagePath || m.image)) || '');
  return (x && x.a && de && x.de === de) ? { url: CAT_RECORTES + x.a, n: +x.n || Math.max(+x.w || 0, +x.h || 0), c: !!x.c } : null;
}

function _catFolletoNorm(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
// Un concesionario = su id del sistema. Los nombres viejos sin asignar van por el nombre (sin
// mayúsculas ni tildes: «BERA CHACAO» y «BERA Chacao» son el mismo).
function _catFolletoClave(m){ return (m && m.concesionarioId) ? 'c:' + m.concesionarioId : 'n:' + _catFolletoNorm(m && m.sedeName); }
function _catFolletoNombre(clave, motos){
  if(String(clave).indexOf('c:') === 0 && typeof _catConcesionarios === 'function'){
    var id = String(clave).slice(2), c = _catConcesionarios().filter(function(x){ return x.id === id; })[0];
    if(c) return c.nombre;
  }
  return (motos && motos[0] && motos[0].sedeName) || 'Pagasi';
}
function _catFolletoMarca(nombre){
  var n = ' ' + _catFolletoNorm(nombre) + ' ';
  return CAT_FOLLETO_MARCAS.filter(function(b){ return n.indexOf(' ' + b.toLowerCase() + ' ') > -1; })[0] || '';
}
function _catFolletoDinero(v){ return '$' + (+v || 0).toLocaleString('en-US'); }

// Lo que lleva el folleto de un concesionario: los modelos que hoy se ven en la web y tienen
// precio, con la inicial mínima y las cuotas quincenales tal como salen en la tabla del módulo.
function catFolletoDatos(clave){
  var c = catCondiciones(), pct = c.inicialMin / 100;
  var todos = catLista().filter(function(m){ return _catFolletoClave(m) === clave; });
  var enWeb = todos.filter(function(m){ return m.disponible !== false && !catSinPrecio(m); });
  var vistos = {}, filas = [];
  enWeb.slice().sort(function(a, b){
    return String(a.modelo || '').localeCompare(String(b.modelo || ''), 'es', { numeric: true, sensitivity: 'base' }) || ((+a.precio || 0) - (+b.precio || 0));
  }).forEach(function(m){
    var b = catPlan(m, 12, pct); if(!b) return;
    var cuotas = CAT_PLAZOS_EXCEL.map(function(n){ return catPlan(m, n, pct).quincenal; });
    var modelo = String(m.modelo || m.name || '').replace(/\s+/g, ' ').trim().toUpperCase();
    var k = modelo + '|' + b.inicial + '|' + cuotas.join('|');
    // El mismo modelo cargado dos veces con el mismo precio sale una vez (y si solo la copia tiene foto, se usa)
    var rec = _catFolletoRecorte(m);
    if(vistos[k]){ if(!vistos[k].image && m.image){ vistos[k].image = m.image; vistos[k].rec = rec; } return; }
    filas.push(vistos[k] = { id: m.id, modelo: modelo, precio: +m.precio, inicial: b.inicial, cuotas: cuotas, image: m.image || '', rec: rec });
  });
  var enSistema = String(_catFolletoNombre(clave, todos)).replace(/\s+/g, ' ').trim().toUpperCase();
  var nombre = CAT_FOLLETO_NOMBRES[_catFolletoNorm(enSistema)] || enSistema, marca = _catFolletoMarca(nombre);
  return {
    clave: clave, nombre: nombre, nombreSistema: enSistema, marca: marca, titulo: 'Tu ' + ((marca && !CAT_FOLLETO_TIENDAS[marca]) ? marca : 'moto') + '.',
    plazos: CAT_PLAZOS_EXCEL.slice(), inicialPct: c.inicialMin, filas: filas,
    // La cuota más baja de todo el folleto, para el gancho «Cuotas desde $…»
    desde: filas.length ? Math.min.apply(null, filas.map(function(f){ return Math.min.apply(null, f.cuotas); })) : 0,
    fotos: filas.filter(function(f){ return f.image; }).map(function(f){ return { id: String(f.id), modelo: f.modelo, url: f.image, recorte: f.rec ? f.rec.url : '', nitidez: f.rec ? f.rec.n : 0, cortada: !!(f.rec && f.rec.c) }; }),
    contacto: { instagram: CAT_FOLLETO_CONTACTO.instagram, telefono: CAT_FOLLETO_CONTACTO.telefono },
    logoMarca: (marca && CAT_FOLLETO_LOGOS[marca]) ? CAT_MARCAS_DIR + CAT_FOLLETO_LOGOS[marca] : '',
    fuera: todos.length - enWeb.length,
    fecha: (typeof hoyLocalISO === 'function' ? hoyLocalISO() : new Date().toISOString().slice(0, 10))
  };
}
function catFolletoArchivo(d){
  var slug = _catFolletoNorm(d.nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'concesionario';
  return 'folleto-pagasi-' + slug + '-' + d.fecha + '.png';
}

// ── Dibujo ──────────────────────────────────────────────────────────
function _cfCaja(x, px, py, w, h, r){
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  x.beginPath(); x.moveTo(px + r, py); x.lineTo(px + w - r, py); x.arcTo(px + w, py, px + w, py + r, r);
  x.lineTo(px + w, py + h - r); x.arcTo(px + w, py + h, px + w - r, py + h, r);
  x.lineTo(px + r, py + h); x.arcTo(px, py + h, px, py + h - r, r);
  x.lineTo(px, py + r); x.arcTo(px, py, px + r, py, r); x.closePath();
}
function _cfFuente(peso, px){ return peso + ' ' + px + "px Manrope, Nunito, 'Helvetica Neue', Arial, sans-serif"; }
// Escribe achicando la letra hasta que quepa en el ancho; si ni así, corta con «…». Devuelve el tamaño usado.
function _cfTexto(x, txt, px, py, o){
  o = o || {};
  var tam = o.tam || 24, min = o.min || Math.round(tam * .6), peso = o.peso || 700, max = o.max || 0;
  txt = String(txt == null ? '' : txt);
  x.font = _cfFuente(peso, tam);
  if(max){
    while(tam > min && x.measureText(txt).width > max){ tam -= 1; x.font = _cfFuente(peso, tam); }
    if(x.measureText(txt).width > max){ while(txt.length > 2 && x.measureText(txt + '…').width > max) txt = txt.slice(0, -1); txt = txt.replace(/\s+$/, '') + '…'; }
  }
  x.textAlign = o.al || 'left'; x.textBaseline = o.base || 'alphabetic'; x.fillStyle = o.color || '#fff';
  x.fillText(txt, px, py);
  return tam;
}
// El nombre del modelo en su columna: en una línea si cabe (achicando poco); si es largo
// («PIAGGIO VESPA GTS 310CC AÑO 2026»), en dos líneas partidas por la mitad.
function _cfModelo(x, txt, px, cy, maxW, fs, rh, color){
  txt = String(txt == null ? '' : txt);
  var s1 = fs; x.font = _cfFuente(800, s1);
  while(s1 > Math.ceil(fs * .8) && x.measureText(txt).width > maxW){ s1 -= 1; x.font = _cfFuente(800, s1); }
  var pal = txt.split(' ');
  if(x.measureText(txt).width <= maxW || pal.length < 2){ _cfTexto(x, txt, px, cy, { tam: s1, min: 12, peso: 800, color: color, base: 'middle', max: maxW }); return 1; }
  var s2 = Math.max(12, Math.min(Math.round(fs * .74), Math.floor((rh - 12) / 2.1)));
  x.font = _cfFuente(800, s2);
  var mejor = 1, ancho = Infinity;
  for(var i = 1; i < pal.length; i++){
    var w = Math.max(x.measureText(pal.slice(0, i).join(' ')).width, x.measureText(pal.slice(i).join(' ')).width);
    if(w < ancho){ ancho = w; mejor = i; }
  }
  var d = s2 * .56;
  _cfTexto(x, pal.slice(0, mejor).join(' '), px, cy - d, { tam: s2, min: 11, peso: 800, color: color, base: 'middle', max: maxW });
  _cfTexto(x, pal.slice(mejor).join(' '), px, cy + d, { tam: s2, min: 11, peso: 800, color: color, base: 'middle', max: maxW });
  return 2;
}
// Letras separadas (el lienzo no separa letras igual en todos los navegadores): una por una
function _cfEspaciado(x, txt, px, py, o){
  x.font = _cfFuente(o.peso || 700, o.tam || 24); x.textAlign = 'left'; x.textBaseline = o.base || 'alphabetic'; x.fillStyle = o.color || '#fff';
  var cx = px;
  String(txt).split('').forEach(function(ch){ x.fillText(ch, cx, py); cx += x.measureText(ch).width + (o.sep || 0); });
  return cx - px;
}

// La silueta blanca de la moto recortada, para las baldosas del fondo (como en las muestras de Adam)
function _cfSilueta(img){
  try{
    if(typeof document === 'undefined' || !img) return null;
    var c = document.createElement('canvas'); if(!c || !c.getContext) return null;
    var iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1, w = 620, h = Math.max(1, Math.round(w * ih / iw));
    c.width = w; c.height = h;
    var k = c.getContext('2d'); k.drawImage(img, 0, 0, w, h); k.globalCompositeOperation = 'source-in'; k.fillStyle = '#fff'; k.fillRect(0, 0, w, h);
    return c;
  }catch(e){ return null; }
}
// Una pastilla de vidrio (blanco translúcido con borde), para «pagasi.io» y «Cuotas desde…»
function _cfVidrio(x, px, py, w, h){
  x.save(); x.fillStyle = 'rgba(255,255,255,.15)'; _cfCaja(x, px, py, w, h, h / 2); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.42)'; x.lineWidth = 1.5; _cfCaja(x, px + .75, py + .75, w - 1.5, h - 1.5, h / 2); x.stroke(); x.restore();
}
// Los dos iconos del contacto, dibujados a mano (blancos, 34 de lado, centrados en cx, cy)
function _cfIconoInstagram(x, cx, cy){
  x.save(); x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 3;
  _cfCaja(x, cx - 15, cy - 15, 30, 30, 9); x.stroke();
  x.beginPath(); x.arc(cx, cy, 7.2, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(cx + 8.6, cy - 8.6, 2.1, 0, Math.PI * 2); x.fill();
  x.restore();
}
function _cfIconoTelefono(x, cx, cy){
  x.save(); x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.arc(cx, cy, 14.5, 0, Math.PI * 2); x.stroke();                                   // el globo
  x.beginPath(); x.moveTo(cx - 13.5, cy + 6); x.lineTo(cx - 16.5, cy + 16.5); x.lineTo(cx - 6, cy + 13.4); x.closePath(); x.fill();   // su colita
  x.lineWidth = 3.6; x.beginPath(); x.moveTo(cx - 5.4, cy - 6.4); x.quadraticCurveTo(cx - 6.6, cy + 6.6, cx + 6.4, cy + 5.4); x.stroke();   // el auricular
  x.beginPath(); x.arc(cx - 5.4, cy - 6.4, 2.3, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(cx + 6.4, cy + 5.4, 2.3, 0, Math.PI * 2); x.fill();
  x.restore();
}
// Dibuja el folleto `d` en el lienzo: UNA hoja carta (2550 × 3300 px). r = { logo, marca, foto, recortada }:
// imágenes ya cargadas (o nada). Con `marca` (el logo de la marca, en blanco) va el logo a la derecha
// del título y no se dibuja moto. Si no, la moto: recortada sale grande y sin recuadro; sin recortar,
// en una tarjeta blanca. Todas las medidas de aquí adentro son de la hoja de 1080 × 1398.
function catFolletoDibujar(cv, d, r){
  r = r || {};
  var filas = d.filas || [], n = Math.max(filas.length, 1);
  var W = CAT_FOLLETO.W, H = CAT_FOLLETO.H;
  cv.width = CAT_FOLLETO.PX_ANCHO; cv.height = CAT_FOLLETO.PX_ALTO;
  var x = cv.getContext('2d');
  x.scale(CAT_FOLLETO.PX_ANCHO / W, CAT_FOLLETO.PX_ALTO / H);
  var AZUL = '#1F3FF0', TINTA = '#0C1235', MARINO = '#22327F', M = 54;

  // Fondo: azul Pagasi que se oscurece hacia abajo, dos franjas de luz y baldosas tenues
  var g = x.createLinearGradient(0, 0, W * .55, H);
  g.addColorStop(0, '#1C76FF'); g.addColorStop(.42, '#065CFF'); g.addColorStop(1, '#0434B4');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.save(); x.fillStyle = '#fff';
  x.globalAlpha = .07; x.beginPath(); x.moveTo(W * .40, 0); x.lineTo(W * .74, 0); x.lineTo(W * .74 - H * .36, H); x.lineTo(W * .40 - H * .36, H); x.closePath(); x.fill();
  x.globalAlpha = .045; x.beginPath(); x.moveTo(W * .88, 0); x.lineTo(W * 1.12, 0); x.lineTo(W * 1.12 - H * .36, H); x.lineTo(W * .88 - H * .36, H); x.closePath(); x.fill();
  x.restore();
  var conMarca = !!r.marca;        // el logo de la marca manda: con él no se dibuja ninguna moto
  var flota = !conMarca && !!(r.foto && r.recortada), silueta = flota ? _cfSilueta(r.foto) : null;
  [[W - 30, 250, 210, -.22], [W - 26, H * .52, 170, -.22]].forEach(function(t){
    x.save(); x.translate(t[0], t[1]); x.rotate(t[3]); x.globalAlpha = .08; x.fillStyle = '#fff';
    _cfCaja(x, -t[2] / 2, -t[2] / 2, t[2], t[2], 34); x.fill();
    if(silueta){ x.globalAlpha = .15; var sw = t[2] * .78, sh = sw * silueta.height / silueta.width; if(sh > t[2] * .78){ sh = t[2] * .78; sw = sh * silueta.width / silueta.height; } try{ x.drawImage(silueta, -sw / 2, -sh / 2, sw, sh); }catch(e){} }
    else if(r.logo){ x.globalAlpha = .16; var ih = t[2] * .5, iw = ih * 222 / 256; try{ x.drawImage(r.logo, 0, 0, 222, 256, -iw / 2, -ih / 2, iw, ih); }catch(e){} }
    x.restore();
  });

  // Cabecera: Pagasi × CONCESIONARIO ......... (pagasi.io)
  var lx = M;
  if(r.logo){ var lh = 62, lw = lh * 955 / 256; try{ x.drawImage(r.logo, M, 46, lw, lh); }catch(e){} lx = M + lw; }
  else { _cfTexto(x, 'Pagasi', M, 94, { tam: 54, peso: 800 }); lx = M + x.measureText('Pagasi').width; }
  x.font = _cfFuente(700, 27);
  var wWeb = x.measureText('pagasi.io').width + 46;
  _cfVidrio(x, W - M - wWeb, 51, wWeb, 52);
  _cfTexto(x, 'pagasi.io', W - M - wWeb / 2, 78, { tam: 27, peso: 700, al: 'center', base: 'middle' });
  _cfTexto(x, '×', lx + 22, 92, { tam: 46, peso: 500 });
  _cfTexto(x, d.nombre, lx + 22 + 46, 93, { tam: 44, min: 22, peso: 800, max: W - M - wWeb - 30 - (lx + 68) });

  // La tarjeta de la tabla va abajo y mide lo que pidan sus filas; lo que sobra arriba es del título
  // y la moto. Como la hoja no crece, con más modelos se van apretando las cosas por escalones:
  //   hasta 9 → filas grandes · 10–14 → el título sube · 15–22 → encabezado compacto y título mediano
  //   23 o más → título en una línea y filas chicas (en papel se siguen leyendo: 30 modelos ≈ letra de 8 puntos)
  var ctaH = 92, ctaY = H - 70 - ctaH, cardX = M - 6, cardW = W - 2 * (M - 6), cardBottom = ctaY - 28;
  var CAB = 178, PIE = 22;
  var rh = Math.min(74, Math.floor((cardBottom - 520 - CAB - PIE) / n));
  if(rh < 50) rh = Math.min(50, Math.floor((cardBottom - 430 - CAB - PIE) / n));
  if(rh < 40){ CAB = 150; PIE = 16; rh = Math.min(40, Math.floor((cardBottom - 380 - CAB - PIE) / n)); }
  if(rh < 30) rh = Math.max(12, Math.min(32, Math.floor((cardBottom - 292 - CAB - PIE) / n)));
  var denso = CAB === 150;
  var cardH = CAB + PIE + rh * n, cardY = cardBottom - cardH;
  var heroTop = cardY < 520 ? 130 : 146, heroBottom = cardY - 28, heroH = heroBottom - heroTop;
  var modo = heroH >= 262 ? 'completo' : (heroH >= 180 ? 'medio' : 'mini');

  // La moto del modelo elegido. Recortada: grande, sin recuadro, con luz y dos aros detrás, completa
  // sobre el azul y apoyada justo encima de la tabla (sin pisarla). Sin recortar: en una tarjeta blanca.
  var hayFoto = !conMarca && !!r.foto, fw = 0, moto = null, marca = null;
  if(conMarca){
    // El logo de la marca, en blanco, a la derecha del título: hasta 440 de ancho y lo que dé el alto
    var lw0 = r.marca.naturalWidth || r.marca.width || 1, lh0 = r.marca.naturalHeight || r.marca.height || 1;
    var le = Math.min(440 / lw0, Math.max(60, Math.min(heroH - 30, 250)) / lh0), lw = lw0 * le, lh2 = lh0 * le;
    marca = { x: W - M - lw, y: heroTop + (heroH - lh2) / 2, w: lw, h: lh2 };
    fw = lw;
    var cxM = marca.x + lw / 2, cyM = marca.y + lh2 / 2, radM = Math.max(lw * .62, lh2 * 1.1);
    var luzM = x.createRadialGradient(cxM, cyM, 0, cxM, cyM, radM);
    luzM.addColorStop(0, 'rgba(255,255,255,.20)'); luzM.addColorStop(.55, 'rgba(255,255,255,.07)'); luzM.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = luzM; x.fillRect(cxM - radM, cyM - radM, radM * 2, radM * 2);
    try{ x.drawImage(r.marca, marca.x, marca.y, lw, lh2); }catch(e){}
  }
  if(flota){
    var mw0 = r.foto.naturalWidth || r.foto.width || 1, mh0 = r.foto.naturalHeight || r.foto.height || 1;
    // De alto, desde donde termina la cabecera (queda un aire bajo «pagasi.io») hasta 6 antes de la tabla
    var me = Math.min(560 / mw0, Math.min(cardY - 6 - 118, 560) / mh0), mw = mw0 * me, mh = mh0 * me;
    moto = { x: W - 28 - mw, y: cardY - 6 - mh, w: mw, h: mh };
    fw = Math.min(mw - 22, W - 2 * M - 34 - 440);       // al título siempre le quedan 440 de ancho
    var cxL = moto.x + mw / 2, cyL = moto.y + mh * .52, rad = Math.max(mw, mh) * .8;
    var luz = x.createRadialGradient(cxL, cyL, 0, cxL, cyL, rad);
    luz.addColorStop(0, 'rgba(255,255,255,.38)'); luz.addColorStop(.5, 'rgba(255,255,255,.14)'); luz.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = luz; x.fillRect(cxL - rad, cyL - rad, rad * 2, rad * 2);
    x.save(); x.strokeStyle = '#fff'; x.lineWidth = 2;
    x.globalAlpha = .20; x.beginPath(); x.arc(cxL, cyL, rad * .56, 0, Math.PI * 2); x.stroke();
    x.globalAlpha = .10; x.beginPath(); x.arc(cxL, cyL, rad * .78, 0, Math.PI * 2); x.stroke();
    x.restore();
  }
  if(hayFoto && !flota){
    var fh = Math.max(110, Math.min(heroH - 6, 430)); fw = Math.min(400, fh * 1.35);
    var fx = W - M - fw + 6, fy = heroTop + (heroH - fh) / 2;
    x.save(); x.shadowColor = 'rgba(2,24,96,.38)'; x.shadowBlur = 44; x.shadowOffsetY = 18; x.fillStyle = '#fff'; _cfCaja(x, fx, fy, fw, fh, 36); x.fill(); x.restore();
    var iw0 = r.foto.naturalWidth || r.foto.width || 1, ih0 = r.foto.naturalHeight || r.foto.height || 1, pad = 18;
    var esc = Math.min((fw - 2 * pad) / iw0, (fh - 2 * pad) / ih0), dw = iw0 * esc, dh = ih0 * esc;
    x.save(); _cfCaja(x, fx + 6, fy + 6, fw - 12, fh - 12, 30); x.clip();
    try{ x.drawImage(r.foto, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh); }catch(e){}
    x.restore();
  }

  // Título y gancho. Completo: «ELIGE TU PRÓXIMA MOTO» / «Tu Bera.» / «En cuotas.» / [«Elige tu
  // modelo y tu plazo.»] / pastilla «CUOTAS DESDE $37 por quincena». Medio: sin la línea de arriba.
  // Mini (muchos modelos): «Tu Bera. En cuotas.» en una sola línea y la pastilla.
  var anchoTxt = (hayFoto || conMarca) ? (W - M - fw - 34 - M) : (W - 2 * M);
  var conGancho = d.desde > 0, tam, y0, yBajo, kP;
  if(modo === 'mini'){
    kP = .78; tam = Math.max(38, Math.min(62, heroH - (conGancho ? 62 : 8)));
    x.font = _cfFuente(800, tam);
    var w1 = x.measureText(d.titulo + ' ').width, wT = w1 + x.measureText('En cuotas.').width * 1.04;
    if(wT > anchoTxt){ tam = Math.floor(tam * anchoTxt / wT); x.font = _cfFuente(800, tam); w1 = x.measureText(d.titulo + ' ').width; }
    y0 = heroTop + Math.max(0, (heroH - (tam + (conGancho ? 62 : 0))) / 2);
    var yL = y0 + tam * .84;
    _cfTexto(x, d.titulo, M - 2, yL, { tam: tam, peso: 800 });
    x.save(); x.transform(1, 0, -.19, 1, 0, 0);
    _cfTexto(x, 'En cuotas.', M - 2 + w1 + .19 * yL, yL, { tam: tam, peso: 800, color: '#CFE0FF' });
    x.restore();
    yBajo = yL + 2;
  } else {
    var completo = modo === 'completo', conSub = completo && heroH >= (conGancho ? 430 : 300);
    kP = completo ? 1 : .86;
    var arriba = completo ? 52 : 4, fijo = arriba + (conSub ? 52 : 0) + (conGancho ? Math.round(84 * kP) : 0) + 8;
    tam = Math.max(completo ? 60 : 44, Math.min(122, (heroH - fijo) / 2.02));
    x.font = _cfFuente(800, tam);
    var ancho = Math.max(x.measureText(d.titulo).width, x.measureText('En cuotas.').width * 1.04);
    if(ancho > anchoTxt) tam = Math.floor(tam * anchoTxt / ancho);
    var bloque = fijo + tam * 2.02; y0 = heroTop + Math.max(0, (heroH - bloque) / 2);
    if(completo){
      x.fillStyle = '#fff'; x.fillRect(M, y0 + 14, 54, 4);
      _cfEspaciado(x, 'ELIGE TU PRÓXIMA MOTO', M + 74, y0 + 25, { tam: 23, peso: 700, sep: 4.5, color: 'rgba(255,255,255,.95)' });
    }
    var yT = y0 + arriba + tam * .86;
    _cfTexto(x, d.titulo, M - 3, yT, { tam: tam, peso: 800 });
    x.save(); x.transform(1, 0, -.19, 1, 0, 0);      // inclinada a mano: Manrope no trae cursiva
    var yC = yT + tam * 1.0;
    _cfTexto(x, 'En cuotas.', M - 3 + .19 * yC, yC, { tam: tam, peso: 800, color: '#CFE0FF' });
    x.restore();
    yBajo = yC + 8;
    if(conSub){ _cfTexto(x, 'Elige tu modelo y tu plazo.', M, yC + 50, { tam: 33, peso: 500, max: anchoTxt }); yBajo = yC + 60; }
  }
  if(conGancho){
    var precio = _catFolletoDinero(d.desde), e1 = kP, medir = function(k){
      x.font = _cfFuente(700, 18 * k); var a = 0; 'CUOTAS DESDE'.split('').forEach(function(ch){ a += x.measureText(ch).width + 1.6 * k; });
      x.font = _cfFuente(800, 40 * k); var b = x.measureText(precio).width;
      x.font = _cfFuente(600, 21 * k); var c = x.measureText('por quincena').width;
      return { a: a, b: b, c: c, total: 26 * k + a + 12 * k + b + 11 * k + c + 26 * k };
    };
    var md = medir(e1); if(md.total > anchoTxt){ e1 = e1 * anchoTxt / md.total; md = medir(e1); }
    var ph = Math.round(62 * e1), py = yBajo + Math.round(16 * kP), cyP = py + ph / 2 + 1, cx = M + 26 * e1;
    _cfVidrio(x, M, py, md.total, ph);
    _cfEspaciado(x, 'CUOTAS DESDE', cx, cyP, { tam: 18 * e1, peso: 700, sep: 1.6 * e1, base: 'middle', color: 'rgba(255,255,255,.92)' }); cx += md.a + 12 * e1;
    _cfTexto(x, precio, cx, cyP, { tam: 40 * e1, peso: 800, base: 'middle' }); cx += md.b + 11 * e1;
    _cfTexto(x, 'por quincena', cx, cyP, { tam: 21 * e1, peso: 600, base: 'middle', color: 'rgba(255,255,255,.94)' });
  }

  // Tarjeta blanca con la tabla
  x.save(); x.shadowColor = 'rgba(2,24,96,.32)'; x.shadowBlur = 54; x.shadowOffsetY = 22; x.fillStyle = '#fff'; _cfCaja(x, cardX, cardY, cardW, cardH, denso ? 32 : 40); x.fill(); x.restore();
  var np = d.plazos.length, colL = cardX + 20, colR = cardX + cardW - 20, bw = 396, bx = colR - bw, cw = bw / np, xIni = bx - 90, xMod = colL + 24;
  // Título de la tabla y, a la derecha, la etiqueta «INICIAL DESDE 40%»
  var yTit = cardY + (denso ? 47 : 61), etq = 'INICIAL DESDE ' + d.inicialPct + '%'; x.font = _cfFuente(800, denso ? 16 : 18);
  var wEtq = x.measureText(etq).width + (denso ? 28 : 34), hEtq = denso ? 32 : 38;
  x.fillStyle = '#E4ECFF'; _cfCaja(x, colR - wEtq - 2, yTit - 7 - hEtq / 2, wEtq, hEtq, hEtq / 2); x.fill();
  _cfTexto(x, etq, colR - 2 - wEtq / 2, yTit - 7, { tam: denso ? 16 : 18, peso: 800, al: 'center', base: 'middle', color: AZUL });
  _cfTexto(x, d.nombre + ' · PLANES DISPONIBLES', xMod - 4, yTit, { tam: denso ? 24 : 28, min: 15, peso: 800, color: MARINO, max: colR - wEtq - 22 - xMod });
  // Encabezado: MODELO | INICIAL MÍNIMA | franja «CUOTA QUINCENAL» con sus plazos (el más largo, que
  // es la cuota más baja, va resaltado)
  var by = cardY + (denso ? 66 : 84), bh = CAB - (by - cardY), bt = denso ? 38 : 46, xUlt = bx + cw * (np - 1), yEnc = by + bh - 16;
  x.save(); _cfCaja(x, bx, by, bw, bh + 18, 22); x.clip();
  x.fillStyle = '#D6E3FF'; x.fillRect(bx, by, bw, bt); x.fillStyle = '#E6EEFF'; x.fillRect(bx, by + bt, bw, bh - bt);
  x.fillStyle = AZUL; x.fillRect(xUlt, by + bt, cw, bh - bt);
  x.restore();
  _cfTexto(x, 'CUOTA QUINCENAL', bx + bw / 2, by + (denso ? 27 : 32), { tam: denso ? 19 : 22, peso: 800, al: 'center', color: MARINO });
  d.plazos.forEach(function(p, k){ _cfTexto(x, p + ' MESES', bx + cw * (k + .5), yEnc, { tam: denso ? 18 : 20, peso: 800, al: 'center', color: k === np - 1 ? '#fff' : '#3A4C9E' }); });
  _cfTexto(x, 'MODELO', xMod, yEnc, { tam: denso ? 18 : 21, peso: 800, color: MARINO });
  _cfTexto(x, 'INICIAL', xIni, yEnc - (denso ? 22 : 26), { tam: denso ? 18 : 21, peso: 800, al: 'center', color: MARINO });
  _cfTexto(x, 'MÍNIMA', xIni, yEnc, { tam: denso ? 18 : 21, peso: 800, al: 'center', color: MARINO });
  // Filas
  var fs = Math.max(10, Math.min(34, Math.round(rh * .58))), sep = rh >= 30 ? 3 : (rh >= 20 ? 2 : 1), rad = Math.min(16, (rh - 2 * sep) / 2);
  filas.forEach(function(f, i){
    var fy0 = cardY + CAB + i * rh, cy = fy0 + rh / 2 + (rh >= 30 ? 1 : .5);
    x.fillStyle = i % 2 ? '#EEF3FF' : '#E2EBFF'; _cfCaja(x, colL, fy0 + sep, colR - colL, rh - 2 * sep, rad); x.fill();
    x.fillStyle = i % 2 ? '#DDE7FF' : '#CFDDFF'; _cfCaja(x, xUlt + 5, fy0 + sep, cw - 5, rh - 2 * sep, rad); x.fill();
    if(rh >= 44) _cfModelo(x, f.modelo, xMod, cy, xIni - 74 - xMod, fs, rh, TINTA);
    else _cfTexto(x, f.modelo, xMod, cy, { tam: fs, min: Math.max(9, Math.round(fs * .62)), peso: 800, color: TINTA, base: 'middle', max: xIni - 74 - xMod });
    _cfTexto(x, _catFolletoDinero(f.inicial), xIni, cy, { tam: fs, peso: 800, al: 'center', color: AZUL, base: 'middle', max: 140 });
    f.cuotas.forEach(function(q, k){ _cfTexto(x, _catFolletoDinero(q), bx + cw * (k + .5) + (k === np - 1 ? 2 : 0), cy, { tam: fs, peso: 800, al: 'center', color: k === np - 1 ? AZUL : TINTA, base: 'middle', max: cw - 14 }); });
  });

  // La moto recortada, con su sombra en el piso (solo sobre el azul: se corta donde empieza la
  // tabla, para que no deje una franja gris encima del blanco). SIN sombra alrededor del
  // contorno: se la quité porque la hacía ver como una calcomanía pegada (Adam: "se ve recortada").
  if(moto){
    var sx = moto.x + moto.w / 2, sy = moto.y + moto.h - moto.h * .03, rx = moto.w * .49, ry = Math.max(11, moto.h * .05);
    x.save(); x.beginPath(); x.rect(0, 0, W, cardY); x.clip();
    x.translate(sx, sy); x.scale(1, ry / rx);
    var som = x.createRadialGradient(0, 0, 0, 0, 0, rx); som.addColorStop(0, 'rgba(1,14,70,.50)'); som.addColorStop(.55, 'rgba(1,14,70,.22)'); som.addColorStop(1, 'rgba(1,14,70,0)');
    x.fillStyle = som; x.beginPath(); x.arc(0, 0, rx, 0, Math.PI * 2); x.fill(); x.restore();
    try{ x.drawImage(r.foto, moto.x, moto.y, moto.w, moto.h); }catch(e){}
  }

  // Abajo: el botón «Solicitar en pagasi.io →», el Instagram y el teléfono, y la letra pequeña
  var ctaW = 600;
  x.save(); x.shadowColor = 'rgba(2,24,96,.30)'; x.shadowBlur = 32; x.shadowOffsetY = 13; x.fillStyle = '#fff'; _cfCaja(x, cardX, ctaY, ctaW, ctaH, ctaH / 2); x.fill(); x.restore();
  _cfTexto(x, 'Solicitar en pagasi.io', cardX + 54, ctaY + ctaH / 2 + 2, { tam: 39, peso: 800, color: AZUL, base: 'middle' });
  var ax = cardX + 54 + x.measureText('Solicitar en pagasi.io').width + 24, ay = ctaY + ctaH / 2 + 1;
  x.save(); x.strokeStyle = AZUL; x.lineWidth = 5.5; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + 42, ay); x.moveTo(ax + 27, ay - 15); x.lineTo(ax + 42, ay); x.lineTo(ax + 27, ay + 15); x.stroke(); x.restore();
  var co = d.contacto || {}, xC = cardX + ctaW + 40, lineas = [];
  if(co.instagram) lineas.push([_cfIconoInstagram, co.instagram]);
  if(co.telefono) lineas.push([_cfIconoTelefono, co.telefono]);
  lineas.forEach(function(l, i){
    var cyC = lineas.length === 1 ? ctaY + ctaH / 2 : ctaY + 24 + i * 44;
    l[0](x, xC + 17, cyC);
    _cfTexto(x, l[1], xC + 48, cyC + 1, { tam: 28, min: 18, peso: 800, base: 'middle', max: W - M - (xC + 48) });
  });
  var f = String(d.fecha || '').split('-');
  _cfTexto(x, 'Plan sujeto a evaluación y aprobación. Imagen referencial.' + (f.length === 3 ? ' Precios al ' + f[2] + '/' + f[1] + '/' + f[0] + '.' : ''), M, H - 28, { tam: 21, peso: 500, color: 'rgba(255,255,255,.9)', max: W - 2 * M });
  return { filas: filas.length, ancho: W, alto: H, rh: rh, letra: fs, denso: denso, modo: modo, cardY: cardY, cardH: cardH, tam: tam, conFoto: hayFoto, flota: flota, moto: moto, marca: marca };
}

// ── Recursos (letra, logo, foto) ────────────────────────────────────
// La letra de pagasi.io (Manrope). Si no hay internet para bajarla, se dibuja con la del sistema.
function _catFolletoFuente(){
  if(_catFolleto.fuente) return _catFolleto.fuente;
  return (_catFolleto.fuente = new Promise(function(ok){
    var listo = false, fin = function(){ if(!listo){ listo = true; ok(true); } };
    try{
      var pedir = function(){
        if(!document.fonts || !document.fonts.load){ fin(); return; }
        Promise.all(['500', '700', '800'].map(function(p){ return document.fonts.load(p + ' 40px Manrope'); })).then(fin, fin);
      };
      setTimeout(fin, 5000);
      var l = document.getElementById('cat-folleto-fuente');
      if(l){ pedir(); return; }
      l = document.createElement('link'); l.id = 'cat-folleto-fuente'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap';
      l.onload = pedir; l.onerror = fin;
      document.head.appendChild(l);
    }catch(e){ fin(); }
  }));
}
// Una imagen lista para dibujar. Las de otro sitio (las fotos subidas al almacén) se piden con
// permiso entre sitios: si el almacén no lo da, la foto no carga y el folleto sale sin ella (así
// el lienzo nunca queda bloqueado para descargar). El parámetro extra evita que el navegador
// reuse la copia que ya bajó para la tabla, que viene sin ese permiso.
function _catFolletoImg(url){
  if(!url) return Promise.resolve(null);
  if(_catFolleto.imgs[url]) return _catFolleto.imgs[url];
  return (_catFolleto.imgs[url] = new Promise(function(ok){
    try{
      var im = new Image(), src = String(url);
      var deOtroSitio = /^https?:\/\//i.test(src) && src.indexOf(location.origin + '/') !== 0;
      if(deOtroSitio){ im.crossOrigin = 'anonymous'; src += (src.indexOf('?') > -1 ? '&' : '?') + 'folleto=1'; }
      im.onload = function(){ ok(im); }; im.onerror = function(){ ok(null); };
      im.src = src;
    }catch(e){ ok(null); }
  }));
}

// ── Ventana ─────────────────────────────────────────────────────────
function catFolleto(clave){
  if(!catPuedeEditar()) return;
  if(!_catFolleto.indice) return _catFolletoIndice().then(function(){ return catFolleto(clave); });
  var d = catFolletoDatos(clave), E = _catEsc;
  if(!d.filas.length){ toast('Este concesionario no tiene modelos visibles en la web con precio: no hay qué poner en el folleto', 'error'); return; }
  _catFolleto.d = d; _catFolleto.fotoId = _catFolletoImagenInicial(d);
  if(typeof setMicon === 'function') setMicon('editar');
  $('mtt').textContent = 'Folleto de ' + d.nombreSistema;
  $('msb').textContent = d.filas.length + ' modelo' + (d.filas.length === 1 ? '' : 's') + ' · inicial ' + d.inicialPct + '% · una hoja tamaño carta, lista para imprimir';
  $('modal-box').className = 'modal';
  // Qué imagen lleva el folleto: el logo de la marca (si la marca tiene), una de las motos, o ninguna
  var fotos = (d.fotos.length || d.logoMarca)
    ? '<div class="fg" style="margin:0;flex:1;min-width:180px"><label>Imagen del folleto</label><select class="fs" id="cf_foto" onchange="catFolletoFoto(this.value)">'
      + (d.logoMarca ? '<option value="' + CAT_FOLLETO_LOGO + '">Logo de ' + E(d.marca) + '</option>' : '')
      + d.fotos.map(function(f){ return '<option value="' + E(f.id) + '">Moto: ' + E(f.modelo) + (f.recorte ? (f.cortada ? ' · foto cortada' : (f.nitidez < 500 ? ' · foto pequeña' : '')) : ' · sin recortar') + '</option>'; }).join('') + '<option value="">Sin imagen</option></select></div>'
    : '';
  $('mbd').innerHTML = ''
    + (fotos ? '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px">' + fotos + '</div>' : '')
    + '<div style="background:var(--surf2);border-radius:14px;padding:12px;text-align:center"><canvas id="cf_canvas" width="' + CAT_FOLLETO.PX_ANCHO + '" height="' + CAT_FOLLETO.PX_ALTO + '" style="width:auto;height:auto;max-width:min(100%,400px);max-height:58vh;border-radius:10px;display:block;margin:0 auto;box-shadow:0 6px 24px rgba(0,0,0,.18)"></canvas></div>'
    + '<div id="cf_nota" style="font-size:11.5px;color:var(--ink3);line-height:1.5;margin-top:8px"></div>';
  var comparte = _catFolletoPuedeCompartir();
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>'
    + (comparte ? '<button class="btn btn-g" onclick="catFolletoCompartir()">Compartir</button>' : '')
    + '<button class="btn btn-g" onclick="catFolletoImprimir()">Imprimir</button>'
    + '<button class="btn btn-p" onclick="catFolletoDescargar()">↓ Descargar imagen</button>';
  S.saveFn = null;
  $('ov').style.display = 'flex';
  return _catFolletoPintar();
}
function _catFolletoNota(conFoto){
  var d = _catFolleto.d, el = $('cf_nota'); if(!d || !el) return;
  var t = [];
  if(d.filas.length >= 23) t.push('Con ' + d.filas.length + ' modelos la letra de la tabla sale <b>pequeña</b> para que todos quepan en la hoja; impresa en carta se lee bien.');
  if(d.fuera > 0) t.push(d.fuera + ' modelo' + (d.fuera === 1 ? '' : 's') + ' de este concesionario no sale' + (d.fuera === 1 ? '' : 'n') + ' porque está' + (d.fuera === 1 ? '' : 'n') + ' oculto' + (d.fuera === 1 ? '' : 's') + ' o sin precio.');
  if(_catFolleto.fotoId && !conFoto) t.push(_catFolleto.fotoId === CAT_FOLLETO_LOGO
    ? '<span style="color:var(--amber)">El logo de la marca no cargó: el folleto sale sin imagen. Prueba de nuevo o elige una moto.</span>'
    : '<span style="color:var(--amber)">La foto de este modelo no se pudo usar: el folleto sale sin foto. Prueba con otro modelo.</span>');
  if(!d.logoMarca && d.fotos.length) t.push('Este concesionario todavía no tiene cargado el logo de su marca: por eso sale con una moto.');
  if(d.nombre !== d.nombreSistema) t.push('En el folleto este concesionario sale como <b>' + _catEsc(d.nombre) + '</b>.');
  el.innerHTML = t.join(' ');
}
// La moto que sale sola en la foto: de las recortadas, la más nítida que no venga cortada de
// origen; si ninguna está recortada, la primera con foto.
function _catFolletoFotoInicial(d){
  var rec = d.fotos.filter(function(x){ return x.recorte; }).slice().sort(function(a, b){ return (a.cortada - b.cortada) || (b.nitidez - a.nitidez); });
  var f = rec[0] || d.fotos[0];
  return f ? f.id : '';
}
// Lo que sale solo: el logo de la marca si la marca lo tiene; si no, la moto de siempre
function _catFolletoImagenInicial(d){ return d.logoMarca ? CAT_FOLLETO_LOGO : _catFolletoFotoInicial(d); }
function _catFolletoPintar(){
  var d = _catFolleto.d, turno = ++_catFolleto.turno; if(!d) return Promise.resolve(null);
  var sel = $('cf_foto'); if(sel && sel.value !== _catFolleto.fotoId) sel.value = _catFolleto.fotoId;
  var conLogo = _catFolleto.fotoId === CAT_FOLLETO_LOGO && !!d.logoMarca;
  var foto = conLogo ? null : d.fotos.filter(function(f){ return f.id === String(_catFolleto.fotoId); })[0];
  // Primero la moto recortada; si no hay (o no carga), la foto como está, en su recuadro
  var laFoto = _catFolletoImg(foto ? (foto.recorte || foto.url) : '').then(function(im){
    if(im || !foto || !foto.recorte) return { im: im, recortada: !!(im && foto && foto.recorte) };
    return _catFolletoImg(foto.url).then(function(im2){ return { im: im2, recortada: false }; });
  });
  return Promise.all([_catFolletoFuente(), _catFolletoImg('assets/pagasi-logo-blanco.png'), laFoto, _catFolletoImg(conLogo ? d.logoMarca : '')]).then(function(r){
    var cv = $('cf_canvas'); if(!cv || turno !== _catFolleto.turno) return null;
    var res = catFolletoDibujar(cv, d, { logo: r[1], foto: r[2].im, recortada: r[2].recortada, marca: r[3] });
    _catFolletoNota(res.conFoto || !!res.marca);
    return res;
  });
}
function catFolletoFoto(id){ _catFolleto.fotoId = String(id || ''); return _catFolletoPintar(); }
function _catFolletoBlob(){
  var cv = $('cf_canvas');
  return new Promise(function(ok){
    try{ if(!cv || !cv.toBlob){ ok(null); return; } cv.toBlob(function(b){ ok(b || null); }, 'image/png'); }catch(e){ ok(null); }
  });
}
function catFolletoDescargar(){
  var d = _catFolleto.d; if(!d) return Promise.resolve(false);
  return _catFolletoBlob().then(function(blob){
    if(!blob){ toast('No se pudo crear la imagen. Elige «Sin foto» y prueba de nuevo.', 'error'); return false; }
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = catFolletoArchivo(d); a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{ URL.revokeObjectURL(url); a.remove(); }catch(e){} }, 2000);
    if(typeof logActividad === 'function') logActividad('catalogo_folleto', 'catalogo', d.clave, { concesionario: d.nombre, modelos: d.filas.length });
    toast('Folleto descargado: ' + a.download, 'success');
    return true;
  });
}
// Imprimir: abre la hoja sola en otra ventana, a tamaño carta y sin márgenes, y llama a la impresora
function catFolletoImprimir(){
  var d = _catFolleto.d; if(!d) return Promise.resolve(false);
  return _catFolletoBlob().then(function(blob){
    if(!blob){ toast('No se pudo crear la imagen. Elige «Sin foto» y prueba de nuevo.', 'error'); return false; }
    var url = URL.createObjectURL(blob), w = window.open('', '_blank');
    if(!w){ toast('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes o descarga la imagen.', 'error'); return false; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + _catEsc('Folleto ' + d.nombre) + '</title>'
      + '<style>@page{size:8.5in 11in;margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:8.5in;height:11in}@media screen{body{background:#555}img{margin:0 auto;width:min(100vw,8.5in);height:auto}}</style></head>'
      + '<body><img src="' + url + '" onload="setTimeout(function(){window.focus();window.print();},350)"></body></html>');
    w.document.close();
    if(typeof logActividad === 'function') logActividad('catalogo_folleto', 'catalogo', d.clave, { concesionario: d.nombre, modelos: d.filas.length, impreso: true });
    return true;
  });
}
// En el teléfono: mandarlo directo a WhatsApp o Instagram con el menú de compartir. En la
// computadora el botón no sale: ahí se descarga.
function _catFolletoPuedeCompartir(){
  try{
    if(typeof navigator === 'undefined' || !navigator.share || !navigator.canShare || typeof File === 'undefined') return false;
    if(typeof matchMedia === 'function' && !matchMedia('(pointer: coarse)').matches) return false;
    return navigator.canShare({ files: [new File([''], 'folleto.png', { type: 'image/png' })] });
  }catch(e){ return false; }
}
function catFolletoCompartir(){
  var d = _catFolleto.d; if(!d) return Promise.resolve(false);
  return _catFolletoBlob().then(function(blob){
    if(!blob){ toast('No se pudo crear la imagen. Elige «Sin foto» y prueba de nuevo.', 'error'); return false; }
    var archivo = new File([blob], catFolletoArchivo(d), { type: 'image/png' });
    if(!_catFolletoPuedeCompartir()) return catFolletoDescargar();
    if(typeof logActividad === 'function') logActividad('catalogo_folleto', 'catalogo', d.clave, { concesionario: d.nombre, modelos: d.filas.length, compartido: true });
    return navigator.share({ files: [archivo], title: 'Pagasi × ' + d.nombre }).then(function(){ return true; }, function(){ return false; });
  });
}
