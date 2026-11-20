// ═══════════════════════════════════════════════════════════════
//  CATÁLOGO · FOLLETO POR CONCESIONARIO (20-nov-2026)
//  Adam, en el Catálogo web: "aquí necesito que me pongas un botón que diga crear folleto y se
//  cree un folleto con los precios de cada concesionario... con este estilo igual" (dos imágenes
//  de muestra: «Pagasi × ZONTES» y «Pagasi × BERA»: fondo azul, «Tu Bera. En cuotas.», tabla con
//  la inicial y la cuota quincenal a 6, 9 y 12 meses, y «Solicitar en pagasi.io»).
//
//  El botón «Crear folleto» sale en la franja de cada concesionario de la tabla. El folleto es
//  una imagen de 1080 × 1440 (la medida de Instagram y WhatsApp) que el sistema dibuja en un
//  lienzo con LOS MISMOS números de la tabla (catPlan): los modelos visibles en la web y con
//  precio. Nada se guarda en la base: solo se lee el catálogo y se descarga la imagen.
// ═══════════════════════════════════════════════════════════════

var CAT_FOLLETO = { W: 1080, H: 1440, POR_PAGINA: 14 };
// Marcas que se reconocen en el nombre del concesionario para el título («Tu Bera.»). Si el
// nombre no trae ninguna (ARI BENZA), el título es «Tu moto.».
var CAT_FOLLETO_MARCAS = ['Bera', 'Empire', 'Haojin', 'Toro', 'Veloz', 'Piaggio', 'Bajaj', 'Benmo', 'Zontes', 'Keeway', 'Vespa', 'Suzuki', 'Yamaha', 'Honda', 'Kawasaki', 'Benelli', 'Kymco', 'Hero', 'TVS', 'Lifan', 'Loncin', 'Skygo', 'Escuda'];
var _catFolleto = { d: null, pag: 0, fotoId: '', fotoAuto: true, imgs: {}, fuente: null, turno: 0, indice: null, indiceP: null };
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
function _catFolletoRecorte(m){
  var x = (_catFolleto.indice || {})[String(m && m.id)], de = String((m && (m.imagePath || m.image)) || '');
  return (x && x.a && de && x.de === de) ? CAT_RECORTES + x.a : '';
}

function _catFolletoNorm(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
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
// Hasta 14 modelos caben en una imagen. Si hay más, se reparten parejo en dos o más (21 → 11 y 10).
function _catFolletoPaginar(filas){
  var n = filas.length, max = CAT_FOLLETO.POR_PAGINA;
  if(n <= max) return [filas.slice()];
  var pags = Math.ceil(n / max), por = Math.ceil(n / pags), out = [];
  for(var i = 0; i < n; i += por) out.push(filas.slice(i, i + por));
  return out;
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
    if(vistos[k]){ if(!vistos[k].image && m.image){ vistos[k].image = m.image; vistos[k].recorte = _catFolletoRecorte(m); } return; }
    filas.push(vistos[k] = { id: m.id, modelo: modelo, precio: +m.precio, inicial: b.inicial, cuotas: cuotas, image: m.image || '', recorte: _catFolletoRecorte(m) });
  });
  var nombre = _catFolletoNombre(clave, todos), marca = _catFolletoMarca(nombre);
  return {
    clave: clave, nombre: String(nombre).replace(/\s+/g, ' ').trim().toUpperCase(), marca: marca, titulo: 'Tu ' + (marca || 'moto') + '.',
    plazos: CAT_PLAZOS_EXCEL.slice(), inicialPct: c.inicialMin, filas: filas, paginas: _catFolletoPaginar(filas),
    fotos: filas.filter(function(f){ return f.image; }).map(function(f){ return { id: String(f.id), modelo: f.modelo, url: f.image, recorte: f.recorte || '' }; }),
    fuera: todos.length - enWeb.length,
    fecha: (typeof hoyLocalISO === 'function' ? hoyLocalISO() : new Date().toISOString().slice(0, 10))
  };
}
function catFolletoArchivo(d, pagina){
  var slug = _catFolletoNorm(d.nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'concesionario';
  return 'folleto-pagasi-' + slug + '-' + d.fecha + (d.paginas.length > 1 ? '-' + ((pagina || 0) + 1) + 'de' + d.paginas.length : '') + '.png';
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
    var iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1, w = 300, h = Math.max(1, Math.round(w * ih / iw));
    c.width = w; c.height = h;
    var k = c.getContext('2d'); k.drawImage(img, 0, 0, w, h); k.globalCompositeOperation = 'source-in'; k.fillStyle = '#fff'; k.fillRect(0, 0, w, h);
    return c;
  }catch(e){ return null; }
}
// Dibuja la página `pagina` del folleto `d` en el lienzo. r = { logo, foto, recortada }: imágenes ya
// cargadas (o nada). Con la moto recortada sale grande y sin recuadro; si no, en una tarjeta blanca.
function catFolletoDibujar(cv, d, pagina, r){
  r = r || {};
  var W = CAT_FOLLETO.W, H = CAT_FOLLETO.H;
  cv.width = W; cv.height = H;
  var x = cv.getContext('2d');
  var filas = d.paginas[pagina] || [], nPag = d.paginas.length, n = Math.max(filas.length, 1);
  var AZUL = '#1F3FF0', TINTA = '#0C1235', MARINO = '#22327F';

  // Fondo: azul Pagasi con dos franjas de luz en diagonal y baldosas tenues abajo a la derecha
  var g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1672FF'); g.addColorStop(.5, '#065CFF'); g.addColorStop(1, '#0448D8');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.save(); x.fillStyle = '#fff';
  x.globalAlpha = .07; x.beginPath(); x.moveTo(W * .40, 0); x.lineTo(W * .74, 0); x.lineTo(W * .22, H); x.lineTo(-W * .12, H); x.closePath(); x.fill();
  x.globalAlpha = .045; x.beginPath(); x.moveTo(W * .88, 0); x.lineTo(W * 1.12, 0); x.lineTo(W * .64, H); x.lineTo(W * .40, H); x.closePath(); x.fill();
  x.restore();
  var flota = !!(r.foto && r.recortada), silueta = flota ? _cfSilueta(r.foto) : null;
  [[W - 150, H - 150, 230, -.22], [W - 20, H - 290, 190, -.22], [W - 30, 250, 210, -.22]].forEach(function(t){
    x.save(); x.translate(t[0], t[1]); x.rotate(t[3]); x.globalAlpha = .08; x.fillStyle = '#fff';
    _cfCaja(x, -t[2] / 2, -t[2] / 2, t[2], t[2], 34); x.fill();
    if(silueta){ x.globalAlpha = .15; var sw = t[2] * .78, sh = sw * silueta.height / silueta.width; if(sh > t[2] * .78){ sh = t[2] * .78; sw = sh * silueta.width / silueta.height; } try{ x.drawImage(silueta, -sw / 2, -sh / 2, sw, sh); }catch(e){} }
    else if(r.logo){ x.globalAlpha = .16; var ih = t[2] * .5, iw = ih * 222 / 256; try{ x.drawImage(r.logo, 0, 0, 222, 256, -iw / 2, -ih / 2, iw, ih); }catch(e){} }
    x.restore();
  });

  // Cabecera: Pagasi × CONCESIONARIO ......... pagasi.io
  var M = 54, lx = M;
  if(r.logo){ var lh = 62, lw = lh * 955 / 256; try{ x.drawImage(r.logo, M, 50, lw, lh); }catch(e){} lx = M + lw; }
  else { _cfTexto(x, 'Pagasi', M, 98, { tam: 54, peso: 800 }); lx = M + x.measureText('Pagasi').width; }
  _cfTexto(x, 'pagasi.io', W - M, 96, { tam: 30, peso: 700, al: 'right' });
  var anchoWeb = x.measureText('pagasi.io').width;
  _cfTexto(x, '×', lx + 22, 96, { tam: 46, peso: 500 });
  _cfTexto(x, d.nombre, lx + 22 + 46, 97, { tam: 44, min: 22, peso: 800, max: W - M - anchoWeb - 36 - (lx + 68) });

  // Tarjeta de la tabla: abajo, del alto que pidan sus filas; lo que sobra arriba es del título y la foto
  var ctaH = 96, ctaY = H - 82 - ctaH, cardX = M - 6, cardW = W - 2 * (M - 6), cardBottom = ctaY - 30;
  // Con muchos modelos el título se aprieta un poco arriba (la tarjeta sube hasta 430) para que
  // las filas no queden chiquitas: se busca que midan 50; con 13 o 14 quedan en 46 y 43.
  var CAB = 178, PIE = 22;
  var rh = Math.max(36, Math.min(74, Math.floor((cardBottom - 520 - CAB - PIE) / n)));
  if(rh < 50) rh = Math.max(36, Math.min(50, Math.floor((cardBottom - 430 - CAB - PIE) / n)));
  var cardH = CAB + PIE + rh * n, cardY = cardBottom - cardH;
  var heroTop = cardY < 520 ? 138 : 150, heroBottom = cardY - 30, heroH = heroBottom - heroTop;

  // La moto del modelo elegido. Recortada: grande, sin recuadro, con una luz detrás; pisa un poco
  // la tarjeta de la tabla (se dibuja al final, encima). Sin recortar: en una tarjeta blanca.
  var hayFoto = !!r.foto, fw = 0, moto = null;
  if(flota){
    var mw0 = r.foto.naturalWidth || r.foto.width || 1, mh0 = r.foto.naturalHeight || r.foto.height || 1;
    // De alto, hasta donde termina la cabecera (queda un aire bajo «pagasi.io»); pisa 20 de la tarjeta
    var me = Math.min(540 / mw0, Math.min(cardY - 122, 540) / mh0), mw = mw0 * me, mh = mh0 * me;
    moto = { x: W - 30 - mw, y: cardY + 20 - mh, w: mw, h: mh };
    fw = Math.min(mw - 22, W - 2 * M - 34 - 440);       // al título siempre le quedan 440 de ancho
    var cxL = moto.x + mw / 2, cyL = moto.y + mh * .52, rad = Math.max(mw, mh) * .8;
    var luz = x.createRadialGradient(cxL, cyL, 0, cxL, cyL, rad);
    luz.addColorStop(0, 'rgba(255,255,255,.34)'); luz.addColorStop(.5, 'rgba(255,255,255,.12)'); luz.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = luz; x.fillRect(cxL - rad, cyL - rad, rad * 2, rad * 2);
  }
  if(hayFoto && !flota){
    fw = 400; var fh = Math.min(heroH - 10, 430), fx = W - M - fw + 6, fy = heroTop + (heroH - fh) / 2;
    x.save(); x.shadowColor = 'rgba(2,24,96,.38)'; x.shadowBlur = 44; x.shadowOffsetY = 18; x.fillStyle = '#fff'; _cfCaja(x, fx, fy, fw, fh, 36); x.fill(); x.restore();
    var iw0 = r.foto.naturalWidth || r.foto.width || 1, ih0 = r.foto.naturalHeight || r.foto.height || 1, pad = 20;
    var esc = Math.min((fw - 2 * pad) / iw0, (fh - 2 * pad) / ih0), dw = iw0 * esc, dh = ih0 * esc;
    x.save(); _cfCaja(x, fx + 6, fy + 6, fw - 12, fh - 12, 30); x.clip();
    try{ x.drawImage(r.foto, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh); }catch(e){}
    x.restore();
  }

  // Título: «Tu Bera.» / «En cuotas.» (inclinado) / «Elige tu modelo y tu plazo.»
  var anchoTxt = hayFoto ? (W - M - fw - 34 - M) : (W - 2 * M);
  var tam = Math.max(70, Math.min(120, (heroH - 118) / 2.02));
  x.font = _cfFuente(800, tam);
  var ancho = Math.max(x.measureText(d.titulo).width, x.measureText('En cuotas.').width * 1.04);
  if(ancho > anchoTxt) tam = Math.floor(tam * anchoTxt / ancho);
  var bloque = 118 + tam * 2.02, y0 = heroTop + Math.max(0, (heroH - bloque) / 2);
  x.fillStyle = '#fff'; x.fillRect(M, y0 + 14, 54, 4);
  _cfEspaciado(x, 'ELIGE TU PRÓXIMA MOTO', M + 74, y0 + 25, { tam: 23, peso: 700, sep: 4.5, color: 'rgba(255,255,255,.95)' });
  var yT = y0 + 52 + tam * .86;
  _cfTexto(x, d.titulo, M - 3, yT, { tam: tam, peso: 800 });
  x.save(); x.transform(1, 0, -.19, 1, 0, 0);      // inclinada a mano: Manrope no trae cursiva
  var yC = yT + tam * 1.0;
  _cfTexto(x, 'En cuotas.', M - 3 + .19 * yC, yC, { tam: tam, peso: 800, color: '#CFE0FF' });
  x.restore();
  _cfTexto(x, 'Elige tu modelo y tu plazo.', M, yC + 56, { tam: 34, peso: 500, max: anchoTxt });

  // Tarjeta blanca con la tabla
  x.save(); x.shadowColor = 'rgba(2,24,96,.30)'; x.shadowBlur = 50; x.shadowOffsetY = 20; x.fillStyle = '#fff'; _cfCaja(x, cardX, cardY, cardW, cardH, 40); x.fill(); x.restore();
  var colL = cardX + 20, colR = cardX + cardW - 20, bw = 396, bx = colR - bw, cw = bw / d.plazos.length, xIni = bx - 90, xMod = colL + 24;
  var pagTxt = nPag > 1 ? 'Página ' + (pagina + 1) + ' de ' + nPag : '';
  var anchoPag = 0;
  if(pagTxt){ _cfTexto(x, pagTxt, colR - 6, cardY + 60, { tam: 21, peso: 700, al: 'right', color: '#6B7BB8' }); anchoPag = x.measureText(pagTxt).width + 24; }
  _cfTexto(x, d.nombre + ' · PLANES DISPONIBLES', xMod - 4, cardY + 60, { tam: 28, min: 17, peso: 800, color: MARINO, max: colR - xMod - anchoPag });
  // Encabezado: MODELO | INICIAL MÍNIMA | franja «CUOTA QUINCENAL» con sus plazos
  var by = cardY + 84, bh = CAB - 84;
  x.save(); _cfCaja(x, bx, by, bw, bh + 18, 22); x.clip();
  x.fillStyle = '#D6E3FF'; x.fillRect(bx, by, bw, 46); x.fillStyle = '#E6EEFF'; x.fillRect(bx, by + 46, bw, bh - 46);
  x.restore();
  _cfTexto(x, 'CUOTA QUINCENAL', bx + bw / 2, by + 32, { tam: 22, peso: 800, al: 'center', color: MARINO });
  d.plazos.forEach(function(p, k){ _cfTexto(x, p + ' MESES', bx + cw * (k + .5), by + 78, { tam: 20, peso: 800, al: 'center', color: '#3A4C9E' }); });
  _cfTexto(x, 'MODELO', xMod, by + 78, { tam: 21, peso: 800, color: MARINO });
  _cfTexto(x, 'INICIAL', xIni, by + 52, { tam: 21, peso: 800, al: 'center', color: MARINO });
  _cfTexto(x, 'MÍNIMA', xIni, by + 78, { tam: 21, peso: 800, al: 'center', color: MARINO });
  // Filas
  var fs = Math.max(21, Math.min(34, Math.round(rh * .56)));
  filas.forEach(function(f, i){
    var fy0 = cardY + CAB + i * rh, cy = fy0 + rh / 2 + 1;
    x.fillStyle = i % 2 ? '#EEF3FF' : '#E2EBFF'; _cfCaja(x, colL, fy0 + 3, colR - colL, rh - 6, 16); x.fill();
    _cfModelo(x, f.modelo, xMod, cy, xIni - 74 - xMod, fs, rh, TINTA);
    _cfTexto(x, _catFolletoDinero(f.inicial), xIni, cy, { tam: fs, peso: 800, al: 'center', color: AZUL, base: 'middle', max: 140 });
    f.cuotas.forEach(function(q, k){ _cfTexto(x, _catFolletoDinero(q), bx + cw * (k + .5), cy, { tam: fs, peso: 800, al: 'center', color: TINTA, base: 'middle', max: cw - 12 }); });
  });

  // La moto recortada, encima de todo: su sombra en el piso y un poco de sombra propia
  if(moto){
    var sx = moto.x + moto.w / 2, sy = moto.y + moto.h - moto.h * .03, rx = moto.w * .47, ry = Math.max(12, moto.h * .055);
    x.save(); x.translate(sx, sy); x.scale(1, ry / rx);
    var som = x.createRadialGradient(0, 0, 0, 0, 0, rx); som.addColorStop(0, 'rgba(1,14,70,.50)'); som.addColorStop(.6, 'rgba(1,14,70,.20)'); som.addColorStop(1, 'rgba(1,14,70,0)');
    x.fillStyle = som; x.beginPath(); x.arc(0, 0, rx, 0, Math.PI * 2); x.fill(); x.restore();
    x.save(); x.shadowColor = 'rgba(1,14,70,.30)'; x.shadowBlur = 26; x.shadowOffsetY = 14;
    try{ x.drawImage(r.foto, moto.x, moto.y, moto.w, moto.h); }catch(e){}
    x.restore();
  }

  // Botón «Solicitar en pagasi.io →» y la letra pequeña
  var ctaW = 640;
  x.save(); x.shadowColor = 'rgba(2,24,96,.28)'; x.shadowBlur = 30; x.shadowOffsetY = 12; x.fillStyle = '#fff'; _cfCaja(x, cardX, ctaY, ctaW, ctaH, ctaH / 2); x.fill(); x.restore();
  _cfTexto(x, 'Solicitar en pagasi.io', cardX + 60, ctaY + ctaH / 2 + 2, { tam: 41, peso: 800, color: AZUL, base: 'middle' });
  var ax = cardX + 60 + x.measureText('Solicitar en pagasi.io').width + 26, ay = ctaY + ctaH / 2 + 1;
  x.save(); x.strokeStyle = AZUL; x.lineWidth = 5.5; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + 44, ay); x.moveTo(ax + 28, ay - 16); x.lineTo(ax + 44, ay); x.lineTo(ax + 28, ay + 16); x.stroke(); x.restore();
  var f = String(d.fecha || '').split('-');
  _cfTexto(x, 'Plan sujeto a evaluación y aprobación. Imagen referencial.' + (f.length === 3 ? ' Precios al ' + f[2] + '/' + f[1] + '/' + f[0] + '.' : ''), M, H - 36, { tam: 22, peso: 500, color: 'rgba(255,255,255,.9)', max: W - 2 * M });
  return { filas: filas.length, rh: rh, cardY: cardY, cardH: cardH, tam: tam, conFoto: hayFoto, flota: flota, moto: moto };
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
  _catFolleto.d = d; _catFolleto.pag = 0; _catFolleto.fotoAuto = true; _catFolleto.fotoId = '';
  if(typeof setMicon === 'function') setMicon('editar');
  $('mtt').textContent = 'Folleto de ' + d.nombre;
  $('msb').textContent = d.filas.length + ' modelo' + (d.filas.length === 1 ? '' : 's') + ' · inicial ' + d.inicialPct + '% · los mismos precios y cuotas de la tabla';
  $('modal-box').className = 'modal';
  var fotos = d.fotos.length
    ? '<div class="fg" style="margin:0;flex:1;min-width:180px"><label>Moto de la foto</label><select class="fs" id="cf_foto" onchange="catFolletoFoto(this.value)">'
      + d.fotos.map(function(f){ return '<option value="' + E(f.id) + '">' + E(f.modelo) + '</option>'; }).join('') + '<option value="">Sin foto</option></select></div>'
    : '';
  var pags = d.paginas.length > 1
    ? '<div style="display:flex;align-items:center;gap:6px"><button type="button" class="btn btn-g btn-sm" onclick="catFolletoPagina(-1)" title="Página anterior">‹</button><span id="cf_pag" style="font-size:12px;font-weight:700;white-space:nowrap"></span><button type="button" class="btn btn-g btn-sm" onclick="catFolletoPagina(1)" title="Página siguiente">›</button></div>'
    : '';
  $('mbd').innerHTML = ''
    + ((fotos || pags) ? '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px">' + fotos + pags + '</div>' : '')
    + '<div style="background:var(--surf2);border-radius:14px;padding:12px;text-align:center"><canvas id="cf_canvas" width="' + CAT_FOLLETO.W + '" height="' + CAT_FOLLETO.H + '" style="width:100%;max-width:400px;height:auto;border-radius:10px;display:block;margin:0 auto;box-shadow:0 6px 24px rgba(0,0,0,.18)"></canvas></div>'
    + '<div id="cf_nota" style="font-size:11.5px;color:var(--ink3);line-height:1.5;margin-top:8px"></div>';
  var comparte = _catFolletoPuedeCompartir();
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>'
    + (comparte ? '<button class="btn btn-g" onclick="catFolletoCompartir()">Compartir</button>' : '')
    + '<button class="btn btn-p" onclick="catFolletoDescargar()">↓ Descargar imagen</button>';
  S.saveFn = null;
  $('ov').style.display = 'flex';
  return _catFolletoPintar();
}
function _catFolletoNota(conFoto){
  var d = _catFolleto.d, el = $('cf_nota'); if(!d || !el) return;
  var t = [];
  if(d.paginas.length > 1) t.push('Son <b>' + d.paginas.length + ' imágenes</b> (' + d.filas.length + ' modelos): descarga cada página.');
  if(d.fuera > 0) t.push(d.fuera + ' modelo' + (d.fuera === 1 ? '' : 's') + ' de este concesionario no sale' + (d.fuera === 1 ? '' : 'n') + ' porque está' + (d.fuera === 1 ? '' : 'n') + ' oculto' + (d.fuera === 1 ? '' : 's') + ' o sin precio.');
  if(_catFolleto.fotoId && !conFoto) t.push('<span style="color:var(--amber)">La foto de este modelo no se pudo usar: el folleto sale sin foto. Prueba con otro modelo.</span>');
  el.innerHTML = t.join(' ');
  var p = $('cf_pag'); if(p) p.textContent = 'Página ' + (_catFolleto.pag + 1) + ' de ' + d.paginas.length;
}
// Mientras nadie elija la moto de la foto, sale la primera con foto de la página que se está viendo
// (en la página 2 de BERA CHACAO, una Zontes y no la de la página 1).
function _catFolletoFotoDePagina(d, pagina){
  var ids = {}; (d.paginas[pagina] || []).forEach(function(f){ ids[String(f.id)] = 1; });
  var deAqui = d.fotos.filter(function(x){ return ids[x.id]; });
  var f = deAqui.filter(function(x){ return x.recorte; })[0] || d.fotos.filter(function(x){ return x.recorte; })[0] || deAqui[0] || d.fotos[0];
  return f ? f.id : '';
}
function _catFolletoPintar(){
  var d = _catFolleto.d, turno = ++_catFolleto.turno; if(!d) return Promise.resolve(null);
  if(_catFolleto.fotoAuto){
    _catFolleto.fotoId = _catFolletoFotoDePagina(d, _catFolleto.pag);
    var sel = $('cf_foto'); if(sel) sel.value = _catFolleto.fotoId;
  }
  var foto = d.fotos.filter(function(f){ return f.id === String(_catFolleto.fotoId); })[0];
  // Primero la moto recortada; si no hay (o no carga), la foto como está, en su recuadro
  var laFoto = _catFolletoImg(foto ? (foto.recorte || foto.url) : '').then(function(im){
    if(im || !foto || !foto.recorte) return { im: im, recortada: !!(im && foto && foto.recorte) };
    return _catFolletoImg(foto.url).then(function(im2){ return { im: im2, recortada: false }; });
  });
  return Promise.all([_catFolletoFuente(), _catFolletoImg('assets/pagasi-logo-blanco.png'), laFoto]).then(function(r){
    var cv = $('cf_canvas'); if(!cv || turno !== _catFolleto.turno) return null;
    var res = catFolletoDibujar(cv, d, _catFolleto.pag, { logo: r[1], foto: r[2].im, recortada: r[2].recortada });
    _catFolletoNota(res.conFoto);
    return res;
  });
}
function catFolletoFoto(id){ _catFolleto.fotoAuto = false; _catFolleto.fotoId = String(id || ''); return _catFolletoPintar(); }
function catFolletoPagina(paso){
  var d = _catFolleto.d; if(!d) return;
  _catFolleto.pag = (_catFolleto.pag + paso + d.paginas.length) % d.paginas.length;
  return _catFolletoPintar();
}
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
    a.href = url; a.download = catFolletoArchivo(d, _catFolleto.pag); a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{ URL.revokeObjectURL(url); a.remove(); }catch(e){} }, 2000);
    if(typeof logActividad === 'function') logActividad('catalogo_folleto', 'catalogo', d.clave, { concesionario: d.nombre, modelos: d.filas.length, pagina: _catFolleto.pag + 1 });
    toast('Folleto descargado: ' + a.download, 'success');
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
    var archivo = new File([blob], catFolletoArchivo(d, _catFolleto.pag), { type: 'image/png' });
    if(!_catFolletoPuedeCompartir()) return catFolletoDescargar();
    if(typeof logActividad === 'function') logActividad('catalogo_folleto', 'catalogo', d.clave, { concesionario: d.nombre, modelos: d.filas.length, pagina: _catFolleto.pag + 1, compartido: true });
    return navigator.share({ files: [archivo], title: 'Pagasi × ' + d.nombre }).then(function(){ return true; }, function(){ return false; });
  });
}
