// Pagasi module: inventario (28-nov-2026). «Inventario de oficina»: lo que tiene la empresa en la oficina y en
// las sedes (computadoras, impresoras, sillas, escritorios…). Salió de Finanzas a pedido de Adam ("sácame ese
// módulo de finanzas y ponlo solo") y ahora tiene su permiso propio: lo ven los administradores y a quien se le
// marque «Inventario de oficina» en Usuarios → Quién ve qué. La lógica y el guardado viven en
// logic/inventario-oficina.js. Ningún dato de la base va escrito dentro de un onclick: va en data-….
var _iv = { vista: 'uso', q: '', cat: '', ubicacion: '', estado: '', orden: 'reciente', pegajoso: null, ventana: 0, antes: null };
// Cada ventana del inventario lleva una marca. Un guardado lento puede terminar cuando la persona ya cerró esa
// ventana y abrió otra (de este módulo o de otro): solo se cierra o se reabre si la que está a la vista es la suya.
function _ivMarca(){ _iv.ventana++; return '<input type="hidden" id="iv_ventana" value="' + _iv.ventana + '">'; }
function _ivEsMiVentana(marca){ var el = $('iv_ventana'); return !!el && String(el.value) === String(marca) && $('ov').style.display !== 'none'; }
function _ivPlural(n, uno, varios){ return n + ' ' + (n === 1 ? uno : varios); }

function _ivLista(){ return (typeof S !== 'undefined' && Array.isArray(S.inventarioOficina)) ? S.inventarioOficina : []; }
function _ivFiltros(){ return { vista: _iv.vista, q: _iv.q, cat: _iv.cat, ubicacion: _iv.ubicacion, estado: _iv.estado }; }
function _ivVisibles(){ return invOrdenar(invFiltrar(_ivLista(), _ivFiltros()), _iv.orden); }
function _ivFecha(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(invDiaLocal(iso)); return m ? (m[3] + '/' + m[2] + '/' + m[1]) : ''; }
function _ivHayFiltro(){ return !!(_iv.q || _iv.cat || _iv.ubicacion || _iv.estado); }
function _ivEstadoColor(e){ return (e === 'Dañado' || e === 'Para reparar') ? 'var(--red)' : (e === 'Regular' ? 'var(--amber)' : 'var(--green)'); }

// ── Lo que se repinta solo (cuando alguien más carga algo, o al filtrar) ──────
function invPintar(){
  if(typeof S === 'undefined' || S.page !== 'inventario') return;
  var poner = function(id, html){ var el = document.getElementById(id); if(el) el.innerHTML = html; };
  poner('inv-resumen', _ivResumenHtml());
  poner('inv-tabs', _ivTabsHtml());
  poner('inv-lista', _ivListaHtml());
}
function _ivSelects(){ var el = document.getElementById('inv-selects'); if(el) el.innerHTML = _ivSelectsHtml(); }
function invBuscar(v){ _iv.q = v; invPintar(); }
function invFiltro(campo, v){ if(campo === 'ubicacion' || campo === 'estado' || campo === 'orden') _iv[campo] = v; invPintar(); }
function invCat(c){ _iv.cat = (_iv.cat === c) ? '' : c; invPintar(); }
function invVista(v){ _iv.vista = v === 'bajas' ? 'bajas' : 'uso'; invPintar(); }
function invLimpiarFiltros(){ _iv.q = ''; _iv.cat = ''; _iv.ubicacion = ''; _iv.estado = ''; var q = document.getElementById('inv-q'); if(q) q.value = ''; _ivSelects(); invPintar(); }

function _ivResumenHtml(){
  var r = invResumen(_ivLista());
  var caja = function(valor, titulo, pie, color){ return '<div class="stat inv-stat"><div class="st-v" style="color:' + color + '">' + valor + '</div><div class="st-l">' + titulo + '</div><div class="inv-pie">' + pie + '</div></div>'; };
  var chips = r.porCat.map(function(c){
    return '<button type="button" class="inv-chip' + (_iv.cat === c.cat ? ' on' : '') + '" data-cat="' + invEsc(c.cat) + '" onclick="invCat(this.dataset.cat)">' + invEsc(c.cat) + ' <b>' + c.n + '</b>' + (c.val ? ' <span>' + fmt(c.val) + '</span>' : '') + '</button>';
  }).join('');
  return '<div class="inv-stats">'
    + caja(r.articulos, 'Artículos', 'Registros en uso', 'var(--p1)')
    + caja(r.unidades, 'Unidades', 'Sumando las cantidades', 'var(--ink)')
    + caja(fmt(r.valor), 'Valor total', r.sinValor ? (r.sinValor + ' sin valor anotado') : 'De lo que está en uso', 'var(--green)')
    + caja(r.revisar, 'Por revisar', 'Para reparar o dañados', r.revisar ? 'var(--red)' : 'var(--ink3)')
    + '</div>'
    + (chips ? '<div class="inv-chips">' + chips + '</div>' : '');
}
function _ivTabsHtml(){
  var r = invResumen(_ivLista());
  var b = function(k, t){ return '<button type="button" class="btn ' + (_iv.vista === k ? 'btn-p' : 'btn-g') + ' btn-sm" onclick="invVista(\'' + k + '\')">' + t + '</button>'; };
  return b('uso', 'En uso (' + r.articulos + ')') + b('bajas', 'Dados de baja (' + r.bajas + ')');
}
function _ivSelectsHtml(){
  var op = function(v, t, sel){ return '<option value="' + invEsc(v) + '"' + (sel ? ' selected' : '') + '>' + invEsc(t) + '</option>'; };
  var ubic = invUbicaciones(_ivLista(), S.concesionarios);
  return '<select class="fs inv-sel" aria-label="Ubicación" onchange="invFiltro(\'ubicacion\', this.value)">' + op('', 'Todas las ubicaciones', !_iv.ubicacion) + ubic.map(function(u){ return op(u, u, _iv.ubicacion === u); }).join('') + '</select>'
    + '<select class="fs inv-sel" aria-label="Estado" onchange="invFiltro(\'estado\', this.value)">' + op('', 'Todos los estados', !_iv.estado) + INV_ESTADOS.map(function(e){ return op(e, e, _iv.estado === e); }).join('') + '</select>'
    + '<select class="fs inv-sel" aria-label="Orden" onchange="invFiltro(\'orden\', this.value)">' + INV_ORDENES.map(function(o){ return op(o[0], o[1], _iv.orden === o[0]); }).join('') + '</select>';
}

function _ivDetalle(x){
  var l = [];
  if(x.marca) l.push(invEsc(x.marca));
  if(x.serial) l.push('Serial ' + invEsc(x.serial));
  return l.join(' · ');
}
function _ivAcciones(x){
  var id = ' data-id="' + invEsc(x.id) + '"';
  if(x.baja){
    return '<button class="btn btn-g btn-xs"' + id + ' onclick="invRestaurar(this.dataset.id)">Volver a poner en uso</button>'
      + ((typeof isAdminUser === 'function' && isAdminUser()) ? ' <button class="btn btn-g btn-xs" style="color:var(--red)"' + id + ' onclick="invBorrar(this.dataset.id)">Borrar</button>' : '');
  }
  return '<button class="btn btn-g btn-xs"' + id + ' onclick="invAbrir(this.dataset.id)">Editar</button> '
    + '<button class="btn btn-g btn-xs"' + id + ' title="Cargar otro igual a este" onclick="invAbrir(\'\', this.dataset.id)">Duplicar</button> '
    + '<button class="btn btn-g btn-xs"' + id + ' title="Se dañó, se vendió, se perdió…" onclick="invBaja(this.dataset.id)">Dar de baja</button>';
}
function _ivListaHtml(){
  var aviso = _invEscucha.error ? '<div class="inv-aviso">' + invEsc(_invEscucha.error) + '</div>' : '';
  var todos = _ivLista(), filas = _ivVisibles(), bajas = _iv.vista === 'bajas';
  if(!filas.length && !todos.length && (!_invEscucha.listo || _ivAlDia.corriendo) && !_invEscucha.error) return '<div class="card inv-vacio"><div class="inv-vacio-t">Cargando el inventario…</div></div>';
  if(!filas.length){
    var hayAlgo = todos.some(function(x){ return bajas ? !invEnUso(x) : invEnUso(x); });
    var msg = _ivHayFiltro() && hayAlgo
      ? '<div class="inv-vacio-t">Nada coincide con lo que buscas</div><button class="btn btn-g btn-sm" onclick="invLimpiarFiltros()">Quitar filtros</button>'
      : (bajas ? '<div class="inv-vacio-t">No hay nada dado de baja</div><div>Cuando un equipo se dañe, se venda o se pierda, se anota con «Dar de baja» y queda aquí.</div>'
        : '<div class="inv-vacio-t">Todavía no hay nada cargado</div><div>Empieza con «＋ Agregar artículo»: una computadora, una impresora, las sillas…</div>');
    return aviso + '<div class="card inv-vacio">' + msg + '</div>';
  }
  var unidades = filas.reduce(function(a, x){ return a + invCant(x); }, 0), valor = filas.reduce(function(a, x){ return a + invValor(x); }, 0);
  var cuenta = filas.length + ' artículo' + (filas.length === 1 ? '' : 's') + ' · ' + unidades + ' unidad' + (unidades === 1 ? '' : 'es') + ' · ' + fmt(valor);
  var cab = bajas
    ? '<th>Código</th><th>Artículo</th><th>Categoría</th><th>Motivo</th><th>Fecha de baja</th><th>Quién la anotó</th><th class="inv-num">Valor</th><th></th>'
    : '<th>Código</th><th>Artículo</th><th>Categoría</th><th>Ubicación</th><th>Responsable</th><th class="inv-num">Cant.</th><th class="inv-num">Valor unit.</th><th class="inv-num">Valor total</th><th>Estado</th><th></th>';
  var tabla = filas.map(function(x){
    var det = _ivDetalle(x);
    var art = '<td class="inv-art"><b>' + invEsc(x.nombre || '—') + '</b>' + (det ? '<div>' + det + '</div>' : '') + (x.nota ? '<div class="inv-nota">' + invEsc(x.nota) + '</div>' : '') + '</td>';
    var cat = '<td><span class="inv-cat">' + invEsc(x.categoria || 'Otro') + '</span></td>';
    var cod = '<td class="inv-cod">' + invEsc(x.codigo || '—') + '</td>';
    if(bajas){
      return '<tr>' + cod + art + cat + '<td>' + invEsc(x.baja.motivo || '') + (x.baja.nota ? '<div class="inv-nota">' + invEsc(x.baja.nota) + '</div>' : '') + '</td>'
        + '<td class="inv-nw">' + _ivFecha(x.baja.fecha) + '</td><td>' + invEsc(x.baja.por || '') + '</td><td class="inv-num">' + fmt(invValor(x)) + '</td><td class="inv-acc">' + _ivAcciones(x) + '</td></tr>';
    }
    return '<tr>' + cod + art + cat
      + '<td>' + invEsc(x.ubicacion || 'Oficina') + (x.area ? '<div class="inv-nota">' + invEsc(x.area) + '</div>' : '') + '</td>'
      + '<td>' + (x.responsable ? invEsc(x.responsable) : '<span class="inv-nada">—</span>') + '</td>'
      + '<td class="inv-num">' + invCant(x) + '</td><td class="inv-num">' + fmt(parseFloat(x.valorUnit) || 0) + '</td><td class="inv-num"><b>' + fmt(invValor(x)) + '</b></td>'
      + '<td><span class="inv-est" style="color:' + _ivEstadoColor(x.estado) + '">' + invEsc(x.estado || '—') + '</span></td>'
      + '<td class="inv-acc">' + _ivAcciones(x) + '</td></tr>';
  }).join('');
  var tarjetas = filas.map(function(x){
    var det = _ivDetalle(x);
    var dato = function(t, v){ return v ? '<div><small>' + t + '</small>' + v + '</div>' : ''; };
    return '<div class="inv-card"><div class="inv-card-top"><span class="inv-cod">' + invEsc(x.codigo || '—') + '</span><span class="inv-cat">' + invEsc(x.categoria || 'Otro') + '</span>'
      + (bajas ? '' : '<span class="inv-est" style="color:' + _ivEstadoColor(x.estado) + '">' + invEsc(x.estado || '') + '</span>') + '</div>'
      + '<div class="inv-card-n">' + invEsc(x.nombre || '—') + '</div>' + (det ? '<div class="inv-nota">' + det + '</div>' : '') + (x.nota ? '<div class="inv-nota">' + invEsc(x.nota) + '</div>' : '')
      + '<div class="inv-card-d">'
      + (bajas ? dato('Motivo', invEsc(x.baja.motivo || '')) + dato('Fecha de baja', _ivFecha(x.baja.fecha)) + dato('Quién la anotó', invEsc(x.baja.por || ''))
        : dato('Ubicación', invEsc(x.ubicacion || 'Oficina') + (x.area ? ' · ' + invEsc(x.area) : '')) + dato('Responsable', invEsc(x.responsable || '')) + dato('Cantidad', String(invCant(x))))
      + dato('Valor', fmt(invValor(x))) + '</div>'
      + '<div class="inv-card-a">' + _ivAcciones(x) + '</div></div>';
  }).join('');
  return aviso + '<div class="card inv-tarjeta"><div class="inv-cuenta">' + (_ivHayFiltro() ? 'Con el filtro: ' : '') + cuenta + '</div>'
    + '<div class="inv-tabla-wrap"><table class="inv-tabla"><thead><tr>' + cab + '</tr></thead><tbody>' + tabla + '</tbody></table></div>'
    + '<div class="inv-cards">' + tarjetas + '</div></div>';
}

// ── Agregar, editar o duplicar ───────────────────────────────────────────────
// invAbrir(id) edita; invAbrir('', idModelo) abre uno nuevo con los datos de otro (sin su serial).
function invAbrir(id, idModelo){
  var lista = _ivLista();
  var x = id ? lista.find(function(i){ return i.id === id; }) : null;
  if(id && !x){ toast('Ese artículo ya no está en la lista', 'error'); return; }
  var m = (!x && idModelo) ? lista.find(function(i){ return i.id === idModelo; }) : null;
  var base = x || (m ? Object.assign({}, m, { serial: '', nota: '', cantidad: 1 }) : Object.assign({ categoria: 'Computadora', ubicacion: 'Oficina', estado: 'Bueno', cantidad: 1 }, _iv.pegajoso || {}));
  var v = function(k){ return invEsc(base[k] == null ? '' : base[k]); };
  var op = function(lista, actual){ return lista.map(function(o){ return '<option value="' + invEsc(o) + '"' + (o === actual ? ' selected' : '') + '>' + invEsc(o) + '</option>'; }).join(''); };
  var sug = function(idl, campo){ return '<datalist id="' + idl + '">' + invSugerencias(lista, campo).map(function(s){ return '<option value="' + invEsc(s) + '">'; }).join('') + '</datalist>'; };
  var ubic = invUbicaciones(lista, S.concesionarios);
  if(base.ubicacion && ubic.indexOf(base.ubicacion) < 0) ubic.unshift(base.ubicacion);
  setMicon(x ? 'editar' : 'detalle');
  $('mtt').textContent = x ? ('Editar ' + (x.codigo || 'artículo')) : (m ? 'Cargar otro igual' : 'Agregar artículo');
  $('msb').textContent = x ? 'Cambia lo que haga falta y guarda' : (m ? 'Viene con los datos de ' + (m.codigo || 'ese artículo') + '. Pon el serial de este.' : 'Solo el nombre es obligatorio. Lo demás se puede completar después.');
  $('modal-box').className = 'modal modal-lg';
  var quien = x ? '<div class="inv-quien">' + invEsc(x.codigo || '') + (x.creadoPor ? ' · Lo cargó ' + invEsc(x.creadoPor) : '') + (x.creado ? ' el ' + _ivFecha(x.creado) : '')
    + (x.editadoPor ? ' · Última edición: ' + invEsc(x.editadoPor) + ' el ' + _ivFecha(x.editado) : '') + '</div>' : '';
  $('mbd').innerHTML = '<div class="fgr c2 inv-form">'
    + '<div class="fg inv-ancho"><label>Artículo</label><input class="fi" id="iv_nombre" maxlength="90" placeholder="Ej: Laptop, Impresora, Silla de oficina" value="' + v('nombre') + '"></div>'
    + '<div class="fg"><label>Categoría</label><select class="fs" id="iv_cat">' + op(INV_CATS, base.categoria || 'Otro') + '</select></div>'
    + '<div class="fg"><label>Marca y modelo</label><input class="fi" id="iv_marca" maxlength="60" list="iv_l_marca" placeholder="Ej: Dell Latitude 5420" value="' + v('marca') + '">' + sug('iv_l_marca', 'marca') + '</div>'
    + '<div class="fg"><label>Serial</label><input class="fi" id="iv_serial" maxlength="60" placeholder="El número que trae el equipo" value="' + v('serial') + '"></div>'
    + '<div class="fg"><label>Cantidad</label><input class="fi" id="iv_cant" type="number" inputmode="numeric" min="1" step="1" value="' + (parseInt(base.cantidad, 10) || 1) + '"></div>'
    + '<div class="fg"><label>Ubicación</label><select class="fs" id="iv_ubic">' + op(ubic, base.ubicacion || 'Oficina') + '</select></div>'
    + '<div class="fg"><label>Área o puesto</label><input class="fi" id="iv_area" maxlength="60" list="iv_l_area" placeholder="Ej: Recepción, Caja, Depósito" value="' + v('area') + '">' + sug('iv_l_area', 'area') + '</div>'
    + '<div class="fg"><label>Responsable</label><input class="fi" id="iv_resp" maxlength="60" list="iv_l_resp" placeholder="Quién lo usa o lo tiene a cargo" value="' + v('responsable') + '">' + sug('iv_l_resp', 'responsable') + '</div>'
    + '<div class="fg"><label>Estado</label><select class="fs" id="iv_estado">' + op(INV_ESTADOS, base.estado || 'Bueno') + '</select></div>'
    + '<div class="fg"><label>Valor de cada uno (USD)</label><input class="fi" id="iv_valor" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" value="' + ((parseFloat(base.valorUnit) || 0) > 0 ? parseFloat(base.valorUnit) : '') + '"></div>'
    + '<div class="fg"><label>Fecha de compra (si se sabe)</label><input class="fi" id="iv_fecha" type="date" max="' + invHoy() + '" value="' + v('fecha') + '"></div>'
    + '<div class="fg inv-ancho"><label>Nota</label><input class="fi" id="iv_nota" maxlength="300" placeholder="Cualquier detalle: color, accesorios, factura…" value="' + v('nota') + '"></div>'
    + '</div>' + quien + _ivMarca();
  _iv.antes = x ? _ivLeerForm() : null;      // al editar: cómo estaba cada casilla al abrir, para mandar solo lo que se toque
  S.saveFn = function(){ return invGuardarForm(x ? x.id : '', false); };
  var admin = typeof isAdminUser === 'function' && isAdminUser();
  $('mft').innerHTML = (x && admin ? '<button class="btn btn-g" style="color:var(--red);margin-right:auto" data-id="' + invEsc(x.id) + '" onclick="invBorrar(this.dataset.id)">Borrar del todo</button>' : '')
    + (x && invEnUso(x) && x.codigo ? '<button class="btn btn-g" data-id="' + invEsc(x.id) + '" onclick="invEtiquetas(this.dataset.id)">Etiqueta</button>' : '')
    + '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + (x ? '' : '<button class="btn btn-g" id="iv_otro" onclick="invGuardarForm(\'\', true)">Guardar y cargar otro</button>')
    + '<button class="btn btn-p" onclick="saveM()">' + (x ? 'Guardar cambios' : 'Guardar') + '</button>';
  $('ov').style.display = 'flex';
  setTimeout(function(){ var el = $(m ? 'iv_serial' : 'iv_nombre'); if(el && window.innerWidth > 720){ try { el.focus(); } catch(e){} } }, 60);
}
function _ivLeerForm(){
  var g = function(k){ var el = $(k); return el ? el.value : ''; };
  return { nombre: g('iv_nombre'), categoria: g('iv_cat'), marca: g('iv_marca'), serial: g('iv_serial'), cantidad: g('iv_cant'), ubicacion: g('iv_ubic'), area: g('iv_area'),
    responsable: g('iv_resp'), estado: g('iv_estado'), valorUnit: g('iv_valor'), fecha: g('iv_fecha'), nota: g('iv_nota') };
}
// Devuelve una promesa (o false si no pasó la validación): saveM mantiene el botón bloqueado hasta que termina.
function invGuardarForm(id, otro){
  if(window._ivGuardando) return false;
  var datos = _ivLeerForm();
  var l = invLimpiar(datos, invHoy());
  if(l.error){ toast(l.error, 'error'); return false; }
  var cambiados = null;
  if(id && _iv.antes){
    cambiados = INV_CAMPOS.filter(function(k){ return String(datos[k]) !== String(_iv.antes[k]); });
    if(!cambiados.length){ toast('No cambiaste nada', 'info'); closeM(); return false; }
  }
  var marca = ($('iv_ventana') || {}).value;
  window._ivGuardando = true;
  var botones = document.querySelectorAll('#mft button'); Array.prototype.forEach.call(botones, function(b){ b.disabled = true; });
  var soltar = function(){ window._ivGuardando = false; Array.prototype.forEach.call(document.querySelectorAll('#mft button'), function(b){ b.disabled = false; }); };
  return invGuardar(id ? { tipo: 'editar', id: id, datos: datos, cambiados: cambiados } : { tipo: 'agregar', datos: datos }).then(function(r){
    soltar();
    var it = r.item || {};
    if(typeof logActividad === 'function') logActividad(id ? 'inventario_editado' : 'inventario_agregado', 'inventario', it.codigo || '', { articulo: it.nombre || '', categoria: it.categoria || '', ubicacion: it.ubicacion || '' });
    toast((it.codigo ? it.codigo + ' · ' : '') + (id ? 'Cambios guardados' : 'Guardado en el inventario'), 'success');
    // «Cargar otro» recuerda dónde estabas parado; solo al AGREGAR (editar un artículo no es estar parado ahí)
    if(!id) _iv.pegajoso = { ubicacion: it.ubicacion, area: it.area, responsable: it.responsable, estado: it.estado === 'Dañado' || it.estado === 'Para reparar' ? 'Bueno' : it.estado };
    var mia = _ivEsMiVentana(marca);
    if(mia) closeM();
    _ivSelects(); invPintar();
    if(otro && mia && S.page === 'inventario') invAbrir('');
    return true;
  }, function(e){ soltar(); toast((e && e.message) || 'No se pudo guardar', 'error'); return false; });
}

// ── Dar de baja, volver a poner en uso, borrar ───────────────────────────────
function invBaja(id){
  var x = _ivLista().find(function(i){ return i.id === id; });
  if(!x){ toast('Ese artículo ya no está en la lista', 'error'); return; }
  setMicon('anular');
  $('mtt').textContent = 'Dar de baja';
  $('msb').textContent = 'Sale de la cuenta del inventario, pero el registro queda guardado';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div class="inv-baja-q"><b>' + invEsc(x.codigo || '') + '</b> · ' + invEsc(x.nombre || '') + (x.serial ? ' · Serial ' + invEsc(x.serial) : '') + '</div>'
    + '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>¿Qué pasó?</label><select class="fs" id="iv_b_motivo">' + INV_MOTIVOS_BAJA.map(function(mo){ return '<option>' + invEsc(mo) + '</option>'; }).join('') + '</select></div>'
    + '<div class="fg"><label>Fecha</label><input class="fi" id="iv_b_fecha" type="date" max="' + invHoy() + '" value="' + invHoy() + '"></div>'
    + '<div class="fg"><label>Nota (opcional)</label><input class="fi" id="iv_b_nota" maxlength="200" placeholder="A quién se vendió, dónde se perdió, quién lo autorizó…"></div>'
    + '</div>' + _ivMarca();
  S.saveFn = function(){
    var g = function(k){ var el = $(k); return el ? el.value : ''; };
    return _ivCambio({ tipo: 'baja', id: id, motivo: g('iv_b_motivo'), fecha: g('iv_b_fecha'), nota: g('iv_b_nota') }, 'inventario_baja', 'Dado de baja', true);
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Dar de baja</button>';
  $('ov').style.display = 'flex';
}
function _ivCambio(cambio, accion, aviso, cerrar){
  if(window._ivGuardando) return false;
  var marca = ($('iv_ventana') || {}).value;
  window._ivGuardando = true;
  return invGuardar(cambio).then(function(r){
    window._ivGuardando = false;
    var it = r.item || {};
    if(typeof logActividad === 'function') logActividad(accion, 'inventario', it.codigo || '', { articulo: it.nombre || '', motivo: (it.baja && it.baja.motivo) || cambio.motivo || '' });
    toast((it.codigo ? it.codigo + ' · ' : '') + aviso, 'success');
    if(cerrar && _ivEsMiVentana(marca)) closeM();
    _ivSelects(); invPintar();
    return true;
  }, function(e){ window._ivGuardando = false; toast((e && e.message) || 'No se pudo guardar', 'error'); return false; });
}
function invRestaurar(id){ _ivCambio({ tipo: 'restaurar', id: id }, 'inventario_restaurado', 'De vuelta en uso', false); }
function invBorrar(id){
  if(!(typeof isAdminUser === 'function' && isAdminUser())){ toast('Solo un administrador borra del todo. Lo normal es «Dar de baja».', 'error'); return; }
  var x = _ivLista().find(function(i){ return i.id === id; });
  if(!x){ toast('Ese artículo ya no está en la lista', 'error'); return; }
  setMicon('eliminar');
  $('mtt').textContent = 'Borrar del todo';
  $('msb').textContent = 'No queda ningún registro';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div class="inv-baja-q"><b>' + invEsc(x.codigo || '') + '</b> · ' + invEsc(x.nombre || '') + '</div>'
    + '<div style="font-size:13px;color:var(--ink2);line-height:1.6">Esto es solo para lo que se cargó por error (repetido o equivocado). Si el equipo se dañó, se vendió o se perdió, cierra esta ventana y usa <b>«Dar de baja»</b>: así queda anotado qué pasó.</div>' + _ivMarca();
  S.saveFn = function(){ return _ivCambio({ tipo: 'borrar', id: id }, 'inventario_borrado', 'Borrado', true); };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-d" onclick="saveM()">Borrar del todo</button>';
  $('ov').style.display = 'flex';
}

// ── Excel e impresión ────────────────────────────────────────────────────────
function invExcel(){
  var todos = invOrdenar(_ivLista(), 'codigo'), uso = todos.filter(invEnUso), bajas = todos.filter(function(x){ return !invEnUso(x); });
  if(!todos.length){ toast('Todavía no hay nada que exportar', 'info'); return; }
  var enc = function(l){ return l.map(function(t){ return { v: t, s: 'encabezado' }; }); };
  var fila = function(x){ return invFilaExcel(x).map(function(c, i){ return (i === 9 || i === 10) ? { v: c, s: 'monto' } : c; }); };
  var anchos = [10, 30, 18, 24, 20, 24, 18, 22, 9, 14, 14, 13, 13, 34, 20, 12];
  var cab = function(t){ return [[{ v: 'Inventario de oficina · ' + t, s: 'titulo' }], [{ v: 'Generado: ' + new Date().toLocaleString('es-VE'), s: 'nota' }], []]; };
  var total = uso.reduce(function(a, x){ return a + invValor(x); }, 0), unidades = uso.reduce(function(a, x){ return a + invCant(x); }, 0);
  var hojas = [{ name: 'En uso', cols: anchos, rows: cab('En uso').concat([enc(INV_EXCEL_COLS)], uso.map(fila),
    [[{ v: 'TOTAL', s: 'totalEtiqueta' }, '', '', '', '', '', '', '', { v: unidades, s: 'totalEtiqueta' }, '', { v: Math.round(total * 100) / 100, s: 'totalMonto' }]]) }];
  if(bajas.length){
    hojas.push({ name: 'Dados de baja', cols: anchos.concat([26, 13, 30, 20]), rows: cab('Dados de baja').concat([enc(INV_EXCEL_COLS.concat(['Motivo de la baja', 'Fecha de baja', 'Nota de la baja', 'Quién la anotó']))],
      bajas.map(function(x){ return fila(x).concat([x.baja.motivo || '', x.baja.fecha || '', x.baja.nota || '', x.baja.por || '']); })) });
  }
  xlsxEscribir('Inventario_de_oficina_' + invHoy() + '.xlsx', hojas);
}
// Imprime lo que se está viendo (con el filtro que haya puesto)
function invImprimir(){
  var filas = _ivVisibles(), bajas = _iv.vista === 'bajas';
  if(!filas.length){ toast('No hay nada que imprimir con ese filtro', 'info'); return; }
  var td = 'style="padding:5px 7px;border-bottom:1px solid #e5e7eb;font-size:10.5px;vertical-align:top"', th = 'style="padding:6px 7px;border-bottom:2px solid #111;font-size:9.5px;text-align:left;text-transform:uppercase;letter-spacing:.4px"';
  var der = td.replace('vertical-align:top', 'vertical-align:top;text-align:right;white-space:nowrap');
  var cab = (bajas ? ['Código', 'Artículo', 'Marca y modelo', 'Serial', 'Motivo', 'Fecha de baja', 'Valor'] : ['Código', 'Artículo', 'Marca y modelo', 'Serial', 'Ubicación', 'Responsable', 'Cant.', 'Valor', 'Estado'])
    .map(function(t){ return '<th ' + th + '>' + t + '</th>'; }).join('');
  var cuerpo = filas.map(function(x){
    var ini = '<td ' + td + '><b>' + invEsc(x.codigo || '') + '</b></td><td ' + td + '>' + invEsc(x.nombre || '') + '</td><td ' + td + '>' + invEsc(x.marca || '') + '</td><td ' + td + '>' + invEsc(x.serial || '') + '</td>';
    return '<tr>' + ini + (bajas
      ? '<td ' + td + '>' + invEsc(x.baja.motivo || '') + '</td><td ' + td + '>' + _ivFecha(x.baja.fecha) + '</td><td ' + der + '>' + fmt(invValor(x)) + '</td>'
      : '<td ' + td + '>' + invEsc(x.ubicacion || '') + (x.area ? ' · ' + invEsc(x.area) : '') + '</td><td ' + td + '>' + invEsc(x.responsable || '') + '</td><td ' + der + '>' + invCant(x) + '</td><td ' + der + '>' + fmt(invValor(x)) + '</td><td ' + td + '>' + invEsc(x.estado || '') + '</td>') + '</tr>';
  }).join('');
  var unidades = filas.reduce(function(a, x){ return a + invCant(x); }, 0), valor = filas.reduce(function(a, x){ return a + invValor(x); }, 0);
  var html = '<div style="font-size:11px;color:#555;margin-bottom:8px">' + (bajas ? 'Dados de baja' : 'En uso') + ' · ' + _ivPlural(filas.length, 'artículo', 'artículos') + ' · ' + _ivPlural(unidades, 'unidad', 'unidades') + ' · ' + fmt(valor) + (_ivHayFiltro() ? ' · con filtro' : '') + '</div>'
    + '<table style="width:100%;border-collapse:collapse"><thead><tr>' + cab + '</tr></thead><tbody>' + cuerpo + '</tbody></table>'
    + '<div style="display:flex;gap:60px;margin-top:46px;font-size:10.5px;color:#333"><div style="flex:1;border-top:1px solid #333;padding-top:5px">Revisado por</div><div style="flex:1;border-top:1px solid #333;padding-top:5px">Fecha</div></div>';
  _abrirVentanaImpresion('Inventario de oficina', html, { horizontal: true });
}

// ── Escanear una etiqueta con la cámara (28-nov-2026, Adam: "agrégale el botón de escanear") ──
// Abre la cámara de atrás del teléfono (o la de la computadora) y lee el código de barras de la etiqueta. Usa el
// lector del navegador cuando lo trae (Chrome en Android) y, siempre, el lector propio de logic/inventario-oficina.js
// (así también sirve en iPhone). La cámara se apaga al leer, al cerrar la ventana o al salir de ella como sea.
var _IV_ICONO_ESCANEAR = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px"><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M7 8v8"/><path d="M10.5 8v8"/><path d="M14 8v8"/><path d="M17 8v8"/></svg>';
var _ivCam = { stream: null, reloj: null, video: null, lienzo: null, nativo: null, ocupado: false, ultimo: '', veces: 0, desde: 0, turno: 0 };
function invEscanear(){
  if(typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toast('Este navegador no deja usar la cámara aquí. Escribe el código en el buscador.', 'error'); return; }
  invEscanearApagar();
  setMicon('detalle');
  $('mtt').textContent = 'Escanear etiqueta';
  $('msb').textContent = 'Apunta la cámara al código de barras';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div class="inv-cam"><video id="iv_video" playsinline muted autoplay></video><div class="inv-cam-linea"></div></div>'
    + '<div class="inv-cam-msg" id="iv_cam_msg">Abriendo la cámara…</div>';
  S.saveFn = null;
  $('mft').innerHTML = '<button class="btn btn-g" onclick="invEscanearCerrar()">Cerrar</button>';
  $('ov').style.display = 'flex';
  var turno = ++_ivCam.turno;
  navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } }).then(function(stream){
    var video = $('iv_video');
    // Cerraron la ventana (o abrieron otra) mientras el teléfono pedía el permiso: la cámara no se queda prendida
    if(turno !== _ivCam.turno || !video || $('ov').style.display === 'none'){ stream.getTracks().forEach(function(t){ t.stop(); }); return; }
    _ivCam.stream = stream; _ivCam.video = video; _ivCam.ultimo = ''; _ivCam.veces = 0; _ivCam.desde = Date.now(); _ivCam.ocupado = false;
    video.srcObject = stream;
    var p = video.play(); if(p && p.catch) p.catch(function(){});
    var msg = $('iv_cam_msg'); if(msg) msg.textContent = 'Pon la línea roja sobre las barras, de lado a lado.';
    _ivCam.nativo = null;
    try {
      if(typeof BarcodeDetector !== 'undefined' && BarcodeDetector.getSupportedFormats){
        BarcodeDetector.getSupportedFormats().then(function(f){ if(turno === _ivCam.turno && f.indexOf('code_39') > -1) _ivCam.nativo = new BarcodeDetector({ formats: ['code_39'] }); }, function(){});
      }
    } catch(e){}
    _ivCam.reloj = setInterval(_ivCamTick, 130);
  }, function(e){
    if(turno !== _ivCam.turno) return;
    var n = (e && e.name) || '';
    var texto = (n === 'NotAllowedError' || n === 'SecurityError') ? 'No hay permiso para usar la cámara. Dáselo a esta página en los ajustes del navegador y vuelve a tocar «Escanear».'
      : (n === 'NotFoundError' || n === 'OverconstrainedError') ? 'Este equipo no tiene una cámara que se pueda usar.'
      : (n === 'NotReadableError') ? 'Otra aplicación está usando la cámara. Ciérrala y vuelve a intentar.'
      : 'No se pudo abrir la cámara.';
    var msg = $('iv_cam_msg'); if(msg){ msg.textContent = texto + ' Mientras tanto puedes escribir el código en el buscador.'; msg.className = 'inv-cam-msg inv-cam-err'; }
  });
}
function invEscanearApagar(){
  _ivCam.turno++;
  if(_ivCam.reloj){ clearInterval(_ivCam.reloj); _ivCam.reloj = null; }
  if(_ivCam.stream){ try { _ivCam.stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e){} _ivCam.stream = null; }
  if(_ivCam.video){ try { _ivCam.video.srcObject = null; } catch(e){} _ivCam.video = null; }
  _ivCam.nativo = null; _ivCam.ocupado = false;
}
function invEscanearCerrar(){ invEscanearApagar(); closeM(); }
// Lee un cuadro ya dibujado en un lienzo. Se miran muchas líneas: bien juntas cerca del centro (donde está la raya
// roja) y otras inclinadas, por si el teléfono está torcido. Devuelve { codigo: en cuántas líneas salió }.
var _IV_FILAS = [0, 1.2, -1.2, 2.4, -2.4, 3.6, -3.6, 5, -5, 6.5, -6.5, 8, -8, 10, -10, 12.5, -12.5, 15, -15, 18, -18, 22, -22];   // % del alto, desde el centro
var _IV_PENDIENTES = [0.105, -0.105, 0.21, -0.21, 0.32, -0.32], _IV_INCLINADAS = [0, 3, -3, 6, -6, 10, -10];                    // unos 6°, 12° y 18°
function _ivLeerCuadro(ctx, w, h){
  var d = ctx.getImageData(0, 0, w, h).data, votos = {}, fila = new Array(w), listo = false;
  var leer = function(yc, m){
    if(listo) return;
    for(var x = 0; x < w; x++){
      var y = Math.round(yc + m * (x - w / 2)); if(y < 1) y = 1; else if(y > h - 2) y = h - 2;
      var i = (y * w + x) * 4, a = i - w * 4, b = i + w * 4;
      fila[x] = ((d[a] + d[i] + d[b]) * 0.299 + (d[a + 1] + d[i + 1] + d[b + 1]) * 0.587 + (d[a + 2] + d[i + 2] + d[b + 2]) * 0.114) / 3;
    }
    var cod = invCodigoLeido(invLeerFila(fila));
    if(cod){ votos[cod] = (votos[cod] || 0) + 1; if(votos[cod] >= 3) listo = true; }
  };
  _IV_FILAS.forEach(function(p){ leer(h * (0.5 + p / 100), 0); });
  _IV_PENDIENTES.forEach(function(m){ _IV_INCLINADAS.forEach(function(p){ leer(h * (0.5 + p / 100), m); }); });
  return votos;
}
function _ivCamTick(){
  var video = _ivCam.video;
  // La ventana se cerró por otro lado (la X, tocar fuera, otra ventana encima): se apaga la cámara
  if(!video || $('iv_video') !== video || $('ov').style.display === 'none' || (typeof S !== 'undefined' && S.page !== 'inventario')){ invEscanearApagar(); return; }
  if(video.readyState < 2 || !video.videoWidth) return;
  var w = Math.min(video.videoWidth, 1000), h = Math.round(video.videoHeight * w / video.videoWidth);
  if(!_ivCam.lienzo) _ivCam.lienzo = document.createElement('canvas');
  var cv = _ivCam.lienzo; if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  var ctx = cv.getContext('2d', { willReadFrequently: true });
  try { ctx.drawImage(video, 0, 0, w, h); } catch(e){ return; }
  var votos = _ivLeerCuadro(ctx, w, h), mejor = '', n = 0;
  Object.keys(votos).forEach(function(k){ if(votos[k] > n){ n = votos[k]; mejor = k; } });
  if(mejor){ _ivCamVisto(mejor, n >= 2 ? 2 : 1); if(!_ivCam.stream) return; }
  if(_ivCam.nativo && !_ivCam.ocupado){
    _ivCam.ocupado = true; var turno = _ivCam.turno;
    _ivCam.nativo.detect(video).then(function(r){ _ivCam.ocupado = false; if(turno !== _ivCam.turno) return;
      for(var i = 0; i < (r || []).length; i++){ var c = invCodigoLeido(r[i].rawValue); if(c){ _ivCamVisto(c, 2); return; } }
    }, function(){ _ivCam.ocupado = false; });
  }
  var msg = $('iv_cam_msg');
  if(msg && Date.now() - _ivCam.desde > 9000 && !/inv-cam-err/.test(msg.className)) msg.textContent = '¿No lo lee? Acerca o aleja un poco el teléfono, busca luz y que la línea roja cruce todas las barras.';
}
// Para dar un código por bueno tiene que salir dos veces (en dos filas del mismo cuadro o en dos cuadros seguidos)
function _ivCamVisto(cod, peso){
  if(cod === _ivCam.ultimo) _ivCam.veces += peso; else { _ivCam.ultimo = cod; _ivCam.veces = peso; }
  if(_ivCam.veces < 2) return;
  invEscanearApagar(); closeM();
  invIrACodigo(cod);
}
// Deja en pantalla el artículo de ese código (lo use la cámara o quien sea)
function invIrACodigo(cod){
  var num = invNumDeCodigo(cod), x = num ? _ivLista().find(function(i){ return invNumDeCodigo(i.codigo) === num; }) : null;
  if(!x){ toast(cod + ' no está en este inventario', 'error'); return; }
  _iv.vista = x.baja ? 'bajas' : 'uso'; _iv.cat = ''; _iv.ubicacion = ''; _iv.estado = ''; _iv.q = x.codigo;
  var q = document.getElementById('inv-q'); if(q) q.value = x.codigo;
  _ivSelects(); invPintar();
  toast(x.codigo + ' · ' + (x.nombre || '') + (x.baja ? ' (dado de baja)' : ''), x.baja ? 'info' : 'success');
  if(typeof logActividad === 'function') logActividad('inventario_escaneado', 'inventario', x.codigo, null);
}

// ── Etiquetas ────────────────────────────────────────────────────────────────
// invEtiquetas('') prepara las de lo que se está viendo (con el filtro puesto); invEtiquetas(id), la de un artículo.
var _ivEtq = { items: [], tam: 'mediana', porUnidad: true };
function invEtiquetas(id){
  var lista = _ivLista();
  var items = id ? lista.filter(function(x){ return x.id === id; }) : invOrdenar(invFiltrar(lista, Object.assign(_ivFiltros(), { vista: 'uso' })), 'codigo');
  items = items.filter(function(x){ return invEnUso(x) && invNumDeCodigo(x.codigo); });
  if(!items.length){ toast(id ? 'Ese artículo no lleva etiqueta (está dado de baja o todavía no tiene código)' : 'No hay artículos en uso para hacerles etiqueta' + (_ivHayFiltro() ? ' con ese filtro' : ''), 'info'); return; }
  _ivEtq.items = items;
  setMicon('imprimir');
  $('mtt').textContent = 'Etiquetas para imprimir';
  $('msb').textContent = 'Para pegarle a cada equipo su código';
  $('modal-box').className = 'modal';
  var uno = items.length === 1 ? items[0] : null;
  $('mbd').innerHTML = '<div class="inv-baja-q">' + (uno ? '<b>' + invEsc(uno.codigo) + '</b> · ' + invEsc(uno.nombre || '')
      : '<b>' + items.length + ' artículos</b>' + (_ivHayFiltro() ? ' (los del filtro que tienes puesto)' : ' (todo lo que está en uso)') + '. Para sacar solo algunos, cierra, busca o filtra, y vuelve a entrar.') + '</div>'
    + '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Tamaño</label><select class="fs" id="iv_e_tam" onchange="_ivEtqCuenta()">' + Object.keys(INV_ETQ_TAM).map(function(k){ return '<option value="' + k + '"' + (k === _ivEtq.tam ? ' selected' : '') + '>' + invEsc(INV_ETQ_TAM[k].nombre) + '</option>'; }).join('') + '</select></div>'
    + '<label class="inv-check"><input type="checkbox" id="iv_e_uni"' + (_ivEtq.porUnidad ? ' checked' : '') + ' onchange="_ivEtqCuenta()"> Una etiqueta por cada unidad (6 sillas = 6 etiquetas)</label>'
    + '<div class="inv-etq-cuenta" id="iv_e_cuenta"></div>'
    + '<div class="inv-quien" style="margin-top:0">Salen en hojas tamaño carta: papel adhesivo o papel normal para recortar por la línea punteada. Cada una lleva el nombre de la empresa, el código, qué es, su serial y un código de barras.</div>'
    + '</div>';
  S.saveFn = function(){ invEtiquetasAbrir(); return false; };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Ver e imprimir</button>';
  $('ov').style.display = 'flex';
  _ivEtqCuenta();
}
function _ivEtqCuenta(){
  var t = $('iv_e_tam'), u = $('iv_e_uni');
  if(t) _ivEtq.tam = INV_ETQ_TAM[t.value] ? t.value : 'mediana';
  if(u) _ivEtq.porUnidad = !!u.checked;
  var n = invEtiquetasDe(_ivEtq.items, _ivEtq.porUnidad).length, h = invEtiquetasHojas(n, _ivEtq.tam);
  var el = $('iv_e_cuenta'); if(el) el.textContent = n + ' etiqueta' + (n === 1 ? '' : 's') + ' · ' + h + ' hoja' + (h === 1 ? '' : 's');
}
function invEtiquetasAbrir(){
  var etqs = invEtiquetasDe(_ivEtq.items, _ivEtq.porUnidad);
  if(!etqs.length){ toast('No hay etiquetas que sacar', 'info'); return; }
  var empresa = (typeof getEmpresa === 'function' ? (getEmpresa() || {}).nombre : '') || 'Pagasi';
  var w = window.open('', '_blank');
  if(!w){ toast('El navegador bloqueó la ventana de las etiquetas. Permite las ventanas emergentes de esta página y vuelve a intentar.', 'error'); return; }
  w.document.write(invEtiquetasDoc(etqs, _ivEtq.tam, empresa));
  w.document.close();
  if(typeof logActividad === 'function') logActividad('inventario_etiquetas', 'inventario', etqs.length === 1 ? (etqs[0].codigo || '') : '', { etiquetas: etqs.length, tamano: _ivEtq.tam });
  closeM();
}
// Cada vez que se abre el módulo (como mucho una vez por minuto): se mira si en el documento de antes hay algo sin
// traer —lo que se cargó cuando el inventario estaba en Finanzas, o lo que alguien agregue desde una pestaña abierta
// desde antes de publicar— o si hay artículos sin código. Solo si hace falta se escribe (un cambio «aldia»). Son dos
// lecturas; si falla, se vuelve a intentar en la próxima entrada.
var _ivAlDia = { ultima: 0, corriendo: false };
function _ivPonerAlDia(){
  if(_ivAlDia.corriendo || typeof db === 'undefined' || !db || Date.now() - _ivAlDia.ultima < 60000) return;
  _ivAlDia.corriendo = true; _ivAlDia.ultima = Date.now();
  var fin = function(){ _ivAlDia.corriendo = false; _ivSelects(); invPintar(); }, fallo = function(){ _ivAlDia.ultima = 0; fin(); };
  try {
    invRevisarAlDia().then(function(falta){ if(falta) return invGuardar({ tipo: 'aldia' }); }).then(fin, fallo);
  } catch(e){ fallo(); }
}

// ── La página ────────────────────────────────────────────────────────────────
PG.inventario = function(){
  if(!invPuedeVer()) return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">El inventario de oficina lo ven los administradores y quien tenga ese permiso.</div></div>';
  invSuscribir(invPintar);
  _ivPonerAlDia();
  return '<div class="page inv-pg">'
    + '<div class="card inv-cab"><div><div class="inv-titulo">Inventario de oficina</div>'
    + '<div class="inv-sub">Lo que tiene la empresa: computadoras, impresoras, teléfonos, muebles y demás. Cada cosa con su código, dónde está y quién la tiene.</div></div>'
    + '<div class="inv-cab-b"><button class="btn btn-g btn-sm" onclick="invExcel()">⬇ Excel</button><button class="btn btn-g btn-sm" onclick="invImprimir()">Imprimir lista</button><button class="btn btn-g btn-sm" onclick="invEtiquetas(\'\')">Etiquetas</button>'
    + '<button class="btn btn-p" onclick="invAbrir(\'\')">＋ Agregar artículo</button></div></div>'
    + '<div id="inv-resumen">' + _ivResumenHtml() + '</div>'
    + '<div class="inv-barra"><div id="inv-tabs" class="inv-tabs">' + _ivTabsHtml() + '</div>'
    + '<div class="inv-busca"><input class="fi inv-q" id="inv-q" type="search" placeholder="Buscar por nombre, código, serial, responsable…" value="' + invEsc(_iv.q) + '" oninput="invBuscar(this.value)">'
    + '<button type="button" class="btn btn-g inv-escanear" title="Leer la etiqueta con la cámara" onclick="invEscanear()">' + _IV_ICONO_ESCANEAR + ' Escanear</button></div>'
    + '<span id="inv-selects" class="inv-selects">' + _ivSelectsHtml() + '</span></div>'
    + '<div id="inv-lista">' + _ivListaHtml() + '</div></div>';
};
