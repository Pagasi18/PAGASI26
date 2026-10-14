// ══════════════════════════════════════════════════════════════════
// CATÁLOGO WEB · precios, seguro, fotos y disponibilidad de pagasi.io (13-oct-2026)
// ══════════════════════════════════════════════════════════════════
// Liz (o quien tenga el permiso "catalogo") cambia aqui el precio de contado, el seguro,
// las fotos, agrega modelos y marca cuales estan disponibles. pagasi.io lo lee directo de
// Firestore (coleccion "catalogo", ver assets/public/catalog.js): no hay que publicar nada.
// La tasa, el seguro, la inicial minima y los plazos estan en el documento "_condiciones" y
// solo los ve y los cambia un administrador (Adam, 13-oct-2026).

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
function catSinPrecio(m){ return !(+m.precio > 0); }
function catPlan(m, meses, pct){ return catSinPrecio(m) ? null : PagasiCatalog.calcPlan(m.precio, meses, pct, catCondiciones()); }
// Los de la lista original (y los Veloz sin precio) que todavia no estan en el catalogo
function catFaltantes(){
  var ya = {}; _cat.motos.forEach(function(m){ ya[String(m.id)] = 1; });
  return PagasiCatalog.base.concat(PagasiCatalog.baseProximos || []).filter(function(m){ return !ya[String(m.id)]; });
}
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
  if(!_cat.motos.length && !confirm('Se van a cargar los ' + catFaltantes().length + ' modelos que hoy muestra la web, con sus precios y fotos. Después los puedes cambiar uno por uno. ¿Seguir?')) return;
  var nuevos = catFaltantes();
  var batch = db.batch(), quien = _catQuien(), ahora = new Date().toISOString();
  nuevos.forEach(function(m){
    batch.set(db.collection('catalogo').doc(String(m.id)), {
      id: m.id, modelo: m.modelo, name: m.name, sede: m.sede, sedeName: m.sedeName, precio: (+m.precio > 0 ? m.precio : null),
      cat: m.cat || '', type: m.type || '', cc: m.cc || '', tag: m.promo ? '' : (m.tag || ''), promo: !!m.promo, image: m.image || '',
      disponible: true, orden: (m.orden != null ? m.orden : m.id), actualizadoPor: quien, actualizadoEn: ahora
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
  var m = _catLocal(id), txt = String(valor == null ? '' : valor).trim(), n = parseFloat(txt.replace(',', '.'));
  if(!m) return;
  // Vacio = precio por confirmar: en la web sale con "Pregunta el precio"
  if(txt === ''){
    if(catSinPrecio(m)) return;
    if(!confirm('¿Dejar ' + m.modelo + ' con el precio por confirmar? En la web sale con "Pregunta el precio" y sin cuotas.')){ nav('catalogo'); return; }
  } else if(!(n > 0)){ toast('El precio tiene que ser mayor que 0 (o vacío si todavía no tiene)', 'error'); nav('catalogo'); return; }
  var antes = m.precio; m.precio = txt === '' ? null : Math.round(n * 100) / 100;
  return _catGuardar(m.id, { precio: m.precio }).then(function(){
    if(typeof logActividad === 'function') logActividad('catalogo_precio', 'catalogo', String(m.id), { modelo: m.modelo, antes: antes, ahora: m.precio });
    toast(m.modelo + (m.precio ? ': precio de contado $' + m.precio.toLocaleString('en-US') : ': precio por confirmar'), 'success');
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

// Promo: la burbuja "Promo" en la web y en la portada (Adam, 13-oct-2026)
function catPromo(id, si){
  if(!catPuedeEditar()) return;
  var m = _catLocal(id); if(!m) return;
  var antes = !!m.promo; m.promo = !!si;
  return _catGuardar(m.id, { promo: m.promo }).then(function(){
    if(typeof logActividad === 'function') logActividad('catalogo_promo', 'catalogo', String(m.id), { modelo: m.modelo, promo: m.promo });
    toast(m.modelo + (m.promo ? ': sale con la burbuja de promo, primero en la portada' : ': sin promo'), 'info');
    nav('catalogo');
  }).catch(function(e){ m.promo = antes; _catError(e); nav('catalogo'); });
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
  // Solo administradores: tasa, seguro, inicial y plazos (Adam, 13-oct-2026)
  if(!catEsAdmin()){ toast('Las condiciones del plan las cambia un administrador', 'error'); return; }
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
// 15-oct-2026, Adam: "por concesionario, no por marca: BERA Trinidad no vende al mismo
// precio que BERA Chacao, igual con Veloz". Cada fila del catalogo es de UN concesionario
// del sistema (los de Concesionarios), con su propio precio. El mismo modelo en otro
// concesionario es otra fila: boton "Copiar". Los grupos viejos ("Veloz", "Boleita"…) se
// asignan de una vez con "Asignar concesionario".
function _catConcesionarios(){
  return ((typeof S !== 'undefined' && S.concesionarios) || []).filter(function(c){ return c && !c.eliminado && c.activo !== false && c.nombre; })
    .map(function(c){ return { id: String(c.id), nombre: String(c.nombre).trim() }; })
    .sort(function(a, b){ return a.nombre.localeCompare(b.nombre, 'es'); });
}
function _catConcOpciones(sel, nombreViejo){
  var E = _catEsc, lista = _catConcesionarios(), tiene = lista.some(function(c){ return c.id === String(sel || ''); });
  return '<option value="">— Elegir concesionario —</option>'
    + lista.map(function(c){ return '<option value="' + E(c.id) + '"' + (c.id === String(sel || '') ? ' selected' : '') + '>' + E(c.nombre) + '</option>'; }).join('')
    + ((nombreViejo && !tiene) ? '<option value="__viejo__" selected>' + E(nombreViejo) + ' (nombre viejo, sin concesionario del sistema)</option>' : '');
}
function _catSedes(){
  var vistos = {}, out = [];
  _cat.motos.concat(PagasiCatalog.base).forEach(function(m){ if(m.sedeName && !vistos[m.sedeName]){ vistos[m.sedeName] = m.sede || ''; out.push(m.sedeName); } });
  return { nombres: out.sort(function(a, b){ return a.localeCompare(b, 'es'); }), codigo: vistos };
}
function _catSlug(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24); }
function catNuevoModelo(){ catEditarModelo(null); }
// El mismo modelo para otro concesionario, con su propio precio (la foto se comparte)
function catCopiar(id){ var m = _catLocal(id); if(m) catEditarModelo(null, m); }
function catEditarModelo(id, base){
  if(!catPuedeEditar()) return;
  var m = id != null ? _catLocal(id) : null, nuevo = !m, copia = nuevo && !!base;
  m = m || (copia ? Object.assign({}, base, { sedeName: '', sede: '', concesionarioId: '', precio: '' })
                  : { modelo: '', name: '', sedeName: '', precio: '', cc: '', type: '', cat: '', tag: '', disponible: true });
  var E = _catEsc;
  setMicon('editar');
  $('mtt').textContent = copia ? 'Copiar a otro concesionario' : (nuevo ? 'Nuevo modelo' : 'Editar modelo');
  $('msb').textContent = copia ? (m.modelo + ' · elige el concesionario y su precio') : (nuevo ? 'Aparece en pagasi.io al guardarlo' : (m.modelo + ' · ' + (m.sedeName || '')));
  $('modal-box').className = 'modal';
  var campo = function(etq, idc, val, extra){ return '<div class="fg"><label>' + etq + '</label><input class="fi" id="' + idc + '" value="' + E(val) + '" ' + (extra || '') + '></div>'; };
  var sinConc = !_catConcesionarios().length;
  $('mbd').innerHTML = '<div class="fgr" style="gap:8px">'
    + campo('Modelo (como en la factura)', 'cm_modelo', m.modelo, 'placeholder="NEW HORSE 150" style="text-transform:uppercase"')
    + campo('Nombre en la web', 'cm_name', m.name, 'placeholder="New Horse 150"')
    + '</div><div class="fgr" style="gap:8px;margin-top:8px">'
    + '<div class="fg"><label>Concesionario (el que vende a este precio)</label><select class="fs" id="cm_conc">' + _catConcOpciones(m.concesionarioId, nuevo ? '' : m.sedeName) + '</select>'
    + (sinConc ? '<div style="font-size:11px;color:var(--amber);margin-top:4px">No hay concesionarios cargados en el sistema: créalos en Concesionarios.</div>' : '') + '</div>'
    + campo('Precio de contado (US$)', 'cm_precio', (+m.precio > 0 ? m.precio : ''), 'type="number" step="0.01" min="0" placeholder="Vacío = por confirmar"')
    + '</div><div class="fgr" style="gap:8px;margin-top:8px">'
    + campo('Cilindrada', 'cm_cc', m.cc, 'placeholder="150cc"')
    + campo('Tipo', 'cm_type', m.type, 'placeholder="Carga · Urbana"')
    + '</div><div class="fgr" style="gap:8px;margin-top:8px">'
    + campo('Categoría', 'cm_cat', m.cat, 'placeholder="150cc · Urbana"')
    + campo('Etiqueta (opcional)', 'cm_tag', m.tag, 'placeholder="Más vendida, Económica…"')
    + '</div>'
    + '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="cm_disp"' + (m.disponible !== false ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:var(--p1)"> Disponible: se ve en la web</label>'
    + (copia ? '<div style="font-size:11px;color:var(--ink3);margin-top:10px">Se crea otra fila del mismo modelo, con la misma foto, para el concesionario que elijas.</div>'
       : (nuevo ? '<div style="font-size:11px;color:var(--ink3);margin-top:10px">La foto se sube después de guardar, desde la tabla.</div>' : ''));
  S.saveFn = function(){
    var modelo = String($('cm_modelo').value || '').trim().toUpperCase(), precio = parseFloat(String($('cm_precio').value || '').replace(',', '.'));
    var concVal = String(($('cm_conc') && $('cm_conc').value) || '');
    if(!modelo){ toast('Falta el modelo', 'error'); return false; }
    var sinPrecio = String($('cm_precio').value || '').trim() === '';
    if(!sinPrecio && !(precio > 0)){ toast('El precio tiene que ser mayor que 0 (o vacío si todavía no tiene)', 'error'); return false; }
    if(!concVal){ toast('Elige el concesionario', 'error'); return false; }
    var conc = _catConcesionarios().find(function(c){ return c.id === concVal; });
    if(!conc && concVal !== '__viejo__'){ toast('Ese concesionario no existe', 'error'); return false; }
    var datos = {
      modelo: modelo, name: String($('cm_name').value || '').trim() || modelo.toLowerCase().replace(/(^|\s)\S/g, function(x){ return x.toUpperCase(); }),
      sedeName: conc ? conc.nombre : m.sedeName, sede: conc ? _catSlug(conc.nombre) : (m.sede || _catSlug(m.sedeName)), concesionarioId: conc ? conc.id : (m.concesionarioId || null),
      precio: sinPrecio ? null : Math.round(precio * 100) / 100,
      cc: String($('cm_cc').value || '').trim(), type: String($('cm_type').value || '').trim(), cat: String($('cm_cat').value || '').trim(),
      tag: String($('cm_tag').value || '').trim(), disponible: !!$('cm_disp').checked
    };
    var idDoc = nuevo ? (Math.max.apply(null, [0].concat(_cat.motos.map(function(x){ return +x.id || 0; }).filter(function(n){ return n < 900; }), PagasiCatalog.base.map(function(x){ return x.id; }))) + 1) : m.id;
    if(nuevo){ datos.id = idDoc; datos.orden = idDoc; datos.image = copia ? (base.image || '') : ''; datos.promo = copia ? !!base.promo : false; }
    _catGuardar(idDoc, datos).then(function(){
      var local = _catLocal(idDoc); if(local) Object.assign(local, datos); else _cat.motos.push(Object.assign({ id: idDoc }, datos));
      if(typeof logActividad === 'function') logActividad(copia ? 'catalogo_modelo_copiado' : (nuevo ? 'catalogo_modelo_nuevo' : 'catalogo_modelo_editado'), 'catalogo', String(idDoc), { modelo: modelo, precio: datos.precio, concesionario: datos.sedeName });
      toast(copia ? (modelo + ' copiado a ' + datos.sedeName) : (nuevo ? (modelo + ' agregado al catálogo') : 'Cambios guardados'), 'success');
      closeM(); nav('catalogo');
    }).catch(_catError);
    return false;   // se cierra al confirmar la escritura
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">' + (copia ? 'Copiar' : (nuevo ? 'Agregar modelo' : 'Guardar')) + '</button>';
  $('ov').style.display = 'flex';
}
// Un grupo viejo entero (ej. "Veloz") pasa a un concesionario del sistema de una vez
function catAsignarGrupo(sedeName){
  if(!catPuedeEditar()) return;
  var motos = _cat.motos.filter(function(m){ return m && !m.eliminado && (m.sedeName || '') === String(sedeName || ''); });
  if(!motos.length) return;
  setMicon('editar'); $('mtt').textContent = 'Asignar concesionario'; $('msb').textContent = motos.length + ' modelo' + (motos.length === 1 ? '' : 's') + ' de "' + sedeName + '"';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div style="font-size:12.5px;color:var(--ink2);line-height:1.55;margin-bottom:10px">Todos los modelos de <b>' + _catEsc(sedeName) + '</b> pasan al concesionario que elijas, con los precios que ya tienen. Si otro concesionario vende los mismos modelos a otro precio, después usa "Copiar" en cada uno.</div>'
    + '<div class="fg"><label>Concesionario</label><select class="fs" id="cg_conc">' + _catConcOpciones('', '') + '</select></div>';
  S.saveFn = function(){
    var conc = _catConcesionarios().find(function(c){ return c.id === String(($('cg_conc') && $('cg_conc').value) || ''); });
    if(!conc){ toast('Elige el concesionario', 'error'); return false; }
    var datos = { sedeName: conc.nombre, sede: _catSlug(conc.nombre), concesionarioId: conc.id };
    Promise.all(motos.map(function(m){ return _catGuardar(m.id, Object.assign({}, datos)).then(function(){ Object.assign(m, datos); }); })).then(function(){
      if(typeof logActividad === 'function') logActividad('catalogo_grupo_asignado', 'catalogo', conc.id, { de: sedeName, a: conc.nombre, modelos: motos.length });
      toast(motos.length + ' modelo' + (motos.length === 1 ? '' : 's') + ' ahora son de ' + conc.nombre, 'success'); closeM(); nav('catalogo');
    }).catch(_catError);
    return false;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Asignar</button>';
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
// 15-oct-2026, Liz: "filtros en el reporte y ordenado por concesionario (no por marca)".
// Primera columna el concesionario, ordenado por concesionario y modelo, y una columna "EN LA
// WEB" para poder filtrar. El seguro solo sale si hay seguro (desde el 14-oct va en el precio).
function catFilasExcel(){
  var c = catCondiciones(), conSeguro = +c.seguroPct > 0;
  var cab = ['CONCESIONARIO', 'MODELO', 'PRECIO AL CONTADO'].concat(conSeguro ? ['COSTO DEL SEGURO'] : []).concat(['INICIAL MÍNIMA'])
    .concat(CAT_PLAZOS_EXCEL.map(function(n){ return 'CUOTA QUINCENAL ' + n + ' MESES'; })).concat(['EN LA WEB']);
  var filas = [cab];
  catLista().slice().sort(function(a, b){
    return String(a.sedeName || '').localeCompare(String(b.sedeName || ''), 'es', { sensitivity:'base' }) || String(a.modelo || '').localeCompare(String(b.modelo || ''), 'es', { numeric:true, sensitivity:'base' });
  }).forEach(function(m){
    var web = m.disponible !== false ? 'SÍ' : 'NO', conc = m.sedeName || 'SIN CONCESIONARIO';
    if(catSinPrecio(m)){ filas.push([conc, m.modelo, 'POR CONFIRMAR'].concat(conSeguro ? [''] : []).concat(['']).concat(CAT_PLAZOS_EXCEL.map(function(){ return ''; })).concat([web])); return; }
    var base = catPlan(m, 12, c.inicialMin / 100);
    filas.push([conc, m.modelo, m.precio].concat(conSeguro ? [base.seguro] : []).concat([base.inicial])
      .concat(CAT_PLAZOS_EXCEL.map(function(n){ return catPlan(m, n, c.inicialMin / 100).quincenal; })).concat([web]));
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
    hoja['!cols'] = filas[0].map(function(t){ return { wch: t === 'CONCESIONARIO' ? 30 : (t === 'MODELO' ? 26 : Math.max(12, t.length + 2)) }; });
    // Filtros en la fila de titulos (las flechitas de Excel), sobre toda la tabla
    hoja['!autofilter'] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length - 1, c: filas[0].length - 1 } }) };
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
