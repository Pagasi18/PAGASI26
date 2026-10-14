// ══════════════════════════════════════════════════════════════════
// CATÁLOGO WEB · precios, seguro, fotos y disponibilidad de pagasi.io (13-oct-2026)
// ══════════════════════════════════════════════════════════════════
// Liz (o quien tenga el permiso "catalogo") cambia aqui el precio de contado, el seguro,
// las fotos, agrega modelos y marca cuales estan disponibles. pagasi.io lo lee directo de
// Firestore (coleccion "catalogo", ver assets/public/catalog.js): no hay que publicar nada.
// La tasa, la inicial minima/maxima y los plazos estan en el documento "_condiciones" y la
// tasa solo la cambia un administrador (Adam, 13-oct-2026). Las Reglas lo exigen igual.

var _cat = { cargado: false, cargando: false, motos: [], cond: null, error: '' };
var CAT_PLAZOS_EXCEL = [6, 9, 12];

function catEsAdmin(){ return typeof isAdminUser === 'function' && isAdminUser(); }
function catPuedeEditar(){
  if(catEsAdmin()) return true;
  var p = (typeof getPermsEfectivos === 'function') ? getPermsEfectivos() : ((S.currentUser && S.currentUser.permisos) || []);
  return p.indexOf('catalogo') > -1;
}
function _catQuien(){ return (S.currentUser && (S.currentUser.nombre || S.currentUser.email)) || 'Sistema'; }
function _catEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]; }); }
function _catId(v){ return String(v).replace(/[^0-9]/g, ''); }

// Condiciones vigentes: las guardadas o, si no hay, las de catalog.js (650%, 4,5%, 40-60%, 6-9-12)
function catCondiciones(){ return PagasiCatalog.condValidas(_cat.cond || PagasiCatalog.COND_BASE); }
function catPlan(m, meses, pct){ return PagasiCatalog.calcPlan(m.precio, meses, pct, catCondiciones()); }
// Los que se ven en la tabla: todo menos lo eliminado, por concesionario y orden
function catLista(){
  return _cat.motos.filter(function(m){ return m && !m.eliminado; }).slice().sort(function(a, b){
    return String(a.sedeName || '').localeCompare(String(b.sedeName || ''), 'es') || ((+a.orden || +a.id) - (+b.orden || +b.id));
  });
}

// ── Leer ────────────────────────────────────────────────────────────
function catCargar(forzar){
  if(_cat.cargando || (_cat.cargado && !forzar)) return Promise.resolve(_cat);
  if(typeof db === 'undefined' || !db){ _cat.error = 'Sin conexión a Firebase'; return Promise.resolve(_cat); }
  _cat.cargando = true;
  return db.collection('catalogo').get().then(function(snap){
    var motos = [], cond = null;
    snap.forEach(function(d){
      var x = d.data() || {};
      if(d.id === '_condiciones'){ cond = x; return; }
      x.id = +x.id || +d.id;
      motos.push(x);
    });
    _cat.motos = motos; _cat.cond = cond; _cat.cargado = true; _cat.error = '';
  }).catch(function(e){
    _cat.error = (e && e.code === 'permission-denied') ? 'Las Reglas de Firebase todavía no dejan leer el catálogo.' : ('No se pudo leer el catálogo: ' + (e && e.message || e));
  }).then(function(){
    _cat.cargando = false;
    if(S.page === 'catalogo' && typeof nav === 'function') nav('catalogo');
    return _cat;
  });
}

// ── Escribir ────────────────────────────────────────────────────────
function _catGuardar(id, datos){
  datos.actualizadoPor = _catQuien(); datos.actualizadoEn = new Date().toISOString();
  return db.collection('catalogo').doc(String(id)).set(datos, { merge: true });
}
function _catLocal(id){ return _cat.motos.find(function(m){ return String(m.id) === String(id); }); }
function _catError(e){ toast('No se guardó: ' + ((e && e.code === 'permission-denied') ? 'no tienes permiso para el catálogo' : (e && e.message || e)), 'error'); }

// Carga por primera vez los 46 modelos que hoy tiene la web (catalog.js), con sus fotos.
function catImportar(){
  if(!catPuedeEditar()) return;
  if(_cat.motos.length && !confirm('El catálogo ya tiene modelos. ¿Agregar los que falten de la lista de la web?')) return;
  if(!_cat.motos.length && !confirm('Se van a cargar los ' + PagasiCatalog.base.length + ' modelos que hoy muestra la web, con sus precios y fotos. Después los puedes cambiar uno por uno. ¿Seguir?')) return;
  var ya = {}; _cat.motos.forEach(function(m){ ya[String(m.id)] = 1; });
  var nuevos = PagasiCatalog.base.filter(function(m){ return !ya[String(m.id)]; });
  var batch = db.batch(), quien = _catQuien(), ahora = new Date().toISOString();
  nuevos.forEach(function(m){
    batch.set(db.collection('catalogo').doc(String(m.id)), {
      id: m.id, modelo: m.modelo, name: m.name, sede: m.sede, sedeName: m.sedeName, precio: m.precio,
      cat: m.cat || '', type: m.type || '', cc: m.cc || '', tag: m.tag || '', image: m.image || '',
      disponible: true, orden: m.id, actualizadoPor: quien, actualizadoEn: ahora
    });
  });
  // Las condiciones las crea un administrador (las Reglas no dejan a nadie mas)
  if(catEsAdmin() && !_cat.cond){
    var c = PagasiCatalog.COND_BASE;
    batch.set(db.collection('catalogo').doc('_condiciones'), { apy: c.apy, seguroPct: c.seguroPct, inicialMin: c.inicialMin, inicialMax: c.inicialMax, plazos: c.plazos.slice(), actualizadoPor: quien, actualizadoEn: ahora });
  }
  return batch.commit().then(function(){
    if(typeof logActividad === 'function') logActividad('catalogo_importado', 'catalogo', '', { modelos: nuevos.length });
    toast(nuevos.length + ' modelos cargados. Ya se pueden editar.', 'success');
    return catCargar(true);
  }).catch(_catError);
}

function catPrecio(id, valor){
  if(!catPuedeEditar()) return;
  var m = _catLocal(id), n = parseFloat(String(valor).replace(',', '.'));
  if(!m) return;
  if(!(n > 0)){ toast('El precio tiene que ser mayor que 0', 'error'); nav('catalogo'); return; }
  var antes = m.precio; m.precio = Math.round(n * 100) / 100;
  return _catGuardar(m.id, { precio: m.precio }).then(function(){
    if(typeof logActividad === 'function') logActividad('catalogo_precio', 'catalogo', String(m.id), { modelo: m.modelo, antes: antes, ahora: m.precio });
    toast(m.modelo + ': precio de contado $' + m.precio.toLocaleString('en-US'), 'success');
    nav('catalogo');
  }).catch(function(e){ m.precio = antes; _catError(e); nav('catalogo'); });
}

function catDisponible(id, si){
  if(!catPuedeEditar()) return;
  var m = _catLocal(id); if(!m) return;
  var antes = m.disponible !== false; m.disponible = !!si;
  return _catGuardar(m.id, { disponible: m.disponible }).then(function(){
    if(typeof logActividad === 'function') logActividad('catalogo_disponible', 'catalogo', String(m.id), { modelo: m.modelo, disponible: m.disponible });
    toast(m.modelo + (m.disponible ? ' vuelve a verse en la web' : ' ya no se ve en la web'), 'info');
    nav('catalogo');
  }).catch(function(e){ m.disponible = antes; _catError(e); nav('catalogo'); });
}

// Eliminar no borra el documento: lo marca, deja de verse en la web y en esta tabla.
function catEliminar(id){
  if(!catPuedeEditar()) return;
  var m = _catLocal(id); if(!m) return;
  if(!confirm('¿Eliminar ' + m.modelo + ' del catálogo? Deja de verse en la web.')) return;
  m.eliminado = true; m.disponible = false;
  return _catGuardar(m.id, { eliminado: true, disponible: false }).then(function(){
    if(typeof logActividad === 'function') logActividad('catalogo_eliminado', 'catalogo', String(m.id), { modelo: m.modelo });
    toast(m.modelo + ' eliminado del catálogo', 'info');
    nav('catalogo');
  }).catch(function(e){ m.eliminado = false; _catError(e); nav('catalogo'); });
}

function catGuardarCondiciones(){
  if(!catPuedeEditar()) return;
  var c = catCondiciones(), datos = {};
  var seg = parseFloat(String(($('cat_seguro') && $('cat_seguro').value) || '').replace(',', '.'));
  if(!(seg >= 0 && seg < 50)){ toast('El seguro va en porcentaje, entre 0 y 50', 'error'); return; }
  datos.seguroPct = Math.round(seg * 100) / 100;
  if(catEsAdmin()){
    var apy = parseFloat(String(($('cat_apy') && $('cat_apy').value) || '').replace(',', '.'));
    if(!(apy > 0 && apy < 5000)){ toast('Revisa la tasa anual', 'error'); return; }
    datos.apy = Math.round(apy * 100) / 100;
    if(!_cat.cond){ datos.inicialMin = c.inicialMin; datos.inicialMax = c.inicialMax; datos.plazos = c.plazos.slice(); }
  } else if(!_cat.cond){
    toast('Las condiciones las crea primero un administrador', 'error'); return;
  }
  return _catGuardar('_condiciones', datos).then(function(){
    _cat.cond = Object.assign({}, _cat.cond || {}, datos);
    if(typeof logActividad === 'function') logActividad('catalogo_condiciones', 'catalogo', '_condiciones', datos);
    toast('Condiciones guardadas: ya se ven en la web', 'success');
    nav('catalogo');
  }).catch(_catError);
}

// ── Nuevo modelo / editar ───────────────────────────────────────────
function _catSedes(){
  var vistos = {}, out = [];
  _cat.motos.concat(PagasiCatalog.base).forEach(function(m){ if(m.sedeName && !vistos[m.sedeName]){ vistos[m.sedeName] = m.sede || ''; out.push(m.sedeName); } });
  return { nombres: out.sort(function(a, b){ return a.localeCompare(b, 'es'); }), codigo: vistos };
}
function _catSlug(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24); }
function catNuevoModelo(){ catEditarModelo(null); }
function catEditarModelo(id){
  if(!catPuedeEditar()) return;
  var m = id != null ? _catLocal(id) : null, nuevo = !m;
  m = m || { modelo: '', name: '', sedeName: '', precio: '', cc: '', type: '', cat: '', tag: '', disponible: true };
  var sedes = _catSedes(), E = _catEsc;
  setMicon('editar'); $('mtt').textContent = nuevo ? 'Nuevo modelo' : 'Editar modelo'; $('msb').textContent = nuevo ? 'Aparece en pagasi.io al guardarlo' : (m.modelo + ' · ' + (m.sedeName || ''));
  $('modal-box').className = 'modal';
  var campo = function(etq, idc, val, extra){ return '<div class="fg"><label>' + etq + '</label><input class="fi" id="' + idc + '" value="' + E(val) + '" ' + (extra || '') + '></div>'; };
  $('mbd').innerHTML = '<div class="fgr" style="gap:8px">'
    + campo('Modelo (como en la factura)', 'cm_modelo', m.modelo, 'placeholder="NEW HORSE 150" style="text-transform:uppercase"')
    + campo('Nombre en la web', 'cm_name', m.name, 'placeholder="New Horse 150"')
    + '</div><div class="fgr" style="gap:8px;margin-top:8px">'
    + '<div class="fg"><label>Concesionario</label><input class="fi" id="cm_sede" list="cm_sedes" value="' + E(m.sedeName) + '" placeholder="EK Bello Monte"><datalist id="cm_sedes">' + sedes.nombres.map(function(n){ return '<option value="' + E(n) + '">'; }).join('') + '</datalist></div>'
    + campo('Precio de contado (US$)', 'cm_precio', m.precio, 'type="number" step="0.01" min="0"')
    + '</div><div class="fgr" style="gap:8px;margin-top:8px">'
    + campo('Cilindrada', 'cm_cc', m.cc, 'placeholder="150cc"')
    + campo('Tipo', 'cm_type', m.type, 'placeholder="Carga · Urbana"')
    + '</div><div class="fgr" style="gap:8px;margin-top:8px">'
    + campo('Categoría', 'cm_cat', m.cat, 'placeholder="150cc · Urbana"')
    + campo('Etiqueta (opcional)', 'cm_tag', m.tag, 'placeholder="Más vendida, Económica…"')
    + '</div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="cm_disp"' + (m.disponible !== false ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:var(--p1)"> Disponible: se ve en la web</label>'
    + (nuevo ? '<div style="font-size:11px;color:var(--ink3);margin-top:10px">La foto se sube después de guardar, desde la tabla.</div>' : '');
  S.saveFn = function(){
    var modelo = String($('cm_modelo').value || '').trim().toUpperCase(), precio = parseFloat(String($('cm_precio').value || '').replace(',', '.'));
    var sedeName = String($('cm_sede').value || '').trim();
    if(!modelo){ toast('Falta el modelo', 'error'); return false; }
    if(!(precio > 0)){ toast('Falta el precio de contado', 'error'); return false; }
    if(!sedeName){ toast('Falta el concesionario', 'error'); return false; }
    var datos = {
      modelo: modelo, name: String($('cm_name').value || '').trim() || modelo.toLowerCase().replace(/(^|\s)\S/g, function(x){ return x.toUpperCase(); }),
      sedeName: sedeName, sede: sedes.codigo[sedeName] || _catSlug(sedeName), precio: Math.round(precio * 100) / 100,
      cc: String($('cm_cc').value || '').trim(), type: String($('cm_type').value || '').trim(), cat: String($('cm_cat').value || '').trim(),
      tag: String($('cm_tag').value || '').trim(), disponible: !!$('cm_disp').checked
    };
    var idDoc = nuevo ? (Math.max.apply(null, [0].concat(_cat.motos.map(function(x){ return +x.id || 0; }), PagasiCatalog.base.map(function(x){ return x.id; }))) + 1) : m.id;
    if(nuevo){ datos.id = idDoc; datos.orden = idDoc; datos.image = ''; }
    _catGuardar(idDoc, datos).then(function(){
      var local = _catLocal(idDoc); if(local) Object.assign(local, datos); else _cat.motos.push(Object.assign({ id: idDoc }, datos));
      if(typeof logActividad === 'function') logActividad(nuevo ? 'catalogo_modelo_nuevo' : 'catalogo_modelo_editado', 'catalogo', String(idDoc), { modelo: modelo, precio: datos.precio });
      toast(nuevo ? (modelo + ' agregado al catálogo') : 'Cambios guardados', 'success');
      closeM(); nav('catalogo');
    }).catch(_catError);
    return false;   // se cierra al confirmar la escritura
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">' + (nuevo ? 'Agregar modelo' : 'Guardar') + '</button>';
  $('ov').style.display = 'flex';
}

// ── Fotos ───────────────────────────────────────────────────────────
// Se achica en el navegador (lado mayor 1400 px, JPG sobre fondo blanco) y se sube a
// Storage. La web usa el enlace de descarga, que funciona sin tocar las Reglas de Storage.
function _catAchicar(file){
  return new Promise(function(ok, mal){
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function(){
      var lado = 1400, k = Math.min(1, lado / Math.max(img.width, img.height));
      var cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(function(b){ b ? ok(b) : mal(new Error('No se pudo preparar la foto')); }, 'image/jpeg', 0.86);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); mal(new Error('Ese archivo no es una imagen')); };
    img.src = url;
  });
}
function catElegirFoto(id){
  if(!catPuedeEditar()) return;
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = function(){ if(inp.files && inp.files[0]) catSubirFoto(id, inp.files[0]); };
  inp.click();
}
function catSubirFoto(id, file){
  var m = _catLocal(id); if(!m) return;
  if(typeof storage === 'undefined' || !storage || typeof storage.ref !== 'function'){ toast('Sin conexión a Storage', 'error'); return; }
  if(file.size > 15 * 1024 * 1024){ toast('La foto pesa más de 15 MB', 'error'); return; }
  toast('Subiendo la foto de ' + m.modelo + '…', 'info');
  var ruta = 'catalogo/' + m.id + '-' + Date.now() + '.jpg', anterior = m.imagePath || '';
  return _catAchicar(file).then(function(blob){
    var ref = storage.ref().child(ruta);
    return ref.put(blob, { contentType: 'image/jpeg' }).then(function(){ return ref.getDownloadURL(); });
  }).then(function(url){
    return _catGuardar(m.id, { image: url, imagePath: ruta }).then(function(){
      m.image = url; m.imagePath = ruta;
      if(anterior) storage.ref().child(anterior).delete().catch(function(){});
      if(typeof logActividad === 'function') logActividad('catalogo_foto', 'catalogo', String(m.id), { modelo: m.modelo });
      toast('Foto de ' + m.modelo + ' lista', 'success'); nav('catalogo');
    });
  }).catch(function(e){ toast('No se pudo subir la foto: ' + (e && e.message || e), 'error'); });
}
function catQuitarFoto(id){
  if(!catPuedeEditar()) return;
  var m = _catLocal(id); if(!m || !m.image) return;
  if(!confirm('¿Quitar la foto de ' + m.modelo + '? En la web sale "Fotografía por confirmar".')) return;
  var anterior = m.imagePath || '';
  return _catGuardar(m.id, { image: '', imagePath: '' }).then(function(){
    m.image = ''; m.imagePath = '';
    if(anterior && typeof storage !== 'undefined' && storage) storage.ref().child(anterior).delete().catch(function(){});
    toast('Foto quitada', 'info'); nav('catalogo');
  }).catch(_catError);
}

// ── Reporte Excel ───────────────────────────────────────────────────
// Columnas pedidas: MODELO, PRECIO AL CONTADO, COSTO DEL SEGURO, INICIAL MINIMA y las cuotas
// quincenales de 6, 9 y 12 meses. Mismos montos que la web (redondeados hacia arriba).
function catFilasExcel(){
  var c = catCondiciones();
  var filas = [['MODELO', 'PRECIO AL CONTADO', 'COSTO DEL SEGURO', 'INICIAL MÍNIMA'].concat(CAT_PLAZOS_EXCEL.map(function(n){ return 'CUOTA QUINCENAL ' + n + ' MESES'; }))];
  catLista().forEach(function(m){
    var base = catPlan(m, 12, c.inicialMin / 100);
    filas.push([m.modelo, m.precio, base.seguro, base.inicial].concat(CAT_PLAZOS_EXCEL.map(function(n){ return catPlan(m, n, c.inicialMin / 100).quincenal; })));
  });
  return filas;
}
function _catCargarXlsx(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise(function(ok, mal){
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = function(){ window.XLSX ? ok(window.XLSX) : mal(new Error('sin XLSX')); };
    s.onerror = function(){ mal(new Error('no cargó')); };
    document.head.appendChild(s);
  });
}
function catExcel(){
  var filas = catFilasExcel(), nombre = 'catalogo-pagasi-' + (typeof hoyLocalISO === 'function' ? hoyLocalISO() : new Date().toISOString().slice(0, 10));
  if(filas.length < 2){ toast('El catálogo está vacío', 'error'); return; }
  return _catCargarXlsx().then(function(X){
    var hoja = X.utils.aoa_to_sheet(filas);
    hoja['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 17 }, { wch: 15 }, { wch: 24 }, { wch: 24 }, { wch: 24 }];
    var libro = X.utils.book_new(); X.utils.book_append_sheet(libro, hoja, 'Catálogo');
    X.writeFile(libro, nombre + '.xlsx');
    if(typeof logActividad === 'function') logActividad('catalogo_excel', 'catalogo', '', { modelos: filas.length - 1 });
  }).catch(function(){
    // Sin internet para la libreria: un CSV que Excel abre igual
    var q = function(v){ var s = String(v == null ? '' : v); if(/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    var csv = '﻿' + filas.map(function(f){ return f.map(q).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    toast('Se descargó en CSV (se abre con Excel)', 'info');
  });
}
