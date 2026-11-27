// Pagasi module: listanegra (26-nov-2026). La pantalla de la Lista negra: buscar una cédula en todas las
// listas, anotar personas y ver a quién frenó el sistema. La lógica y el freno viven en logic/lista-negra.js.
// La ven Verificación (permiso «Lista negra») y los administradores. Agregar: quien la ve. Modificar o
// eliminar: solo un administrador (así lo pidió Luis, y las Reglas de la base lo exigen igual).
// Ningún dato de la base va escrito dentro de un onclick (va en data-…): un aviso de «frenado» lo puede
// crear cualquier empleado con el id que quiera, y un id con comilla se salía del texto y corría código en
// la sesión de Verificación (revisión del 26-nov-2026).
var _ln = { tab: 'buscar', manual: [], auto: [], avisos: [], suscrito: false, error: '', filtro: '', consulta: '', resultado: null, buscando: false };

function lnSuscribir(){
  if(_ln.suscrito || typeof db === 'undefined' || !db) return;
  _ln.suscrito = true;
  var falla = function(e){ _ln.error = (e && e.code === 'permission-denied') ? 'La base todavía no deja leer la lista (faltan publicar las Reglas, o no tienes el permiso).' : ('No se pudo leer la lista: ' + (e && e.message || e)); lnPintar(); };
  var docs = function(s){ var l = []; s.forEach(function(d){ l.push(Object.assign({ _id: d.id }, d.data())); }); return l; };
  db.collection('listaNegra').onSnapshot(function(s){ _ln.manual = docs(s); _ln.error = ''; lnPintar(); }, falla);
  db.collection('listaNegraAuto').onSnapshot(function(s){ _ln.auto = docs(s); lnPintar(); }, function(){});
  db.collection('listaNegraAvisos').orderBy('fecha', 'desc').limit(100).onSnapshot(function(s){ _ln.avisos = docs(s); lnPintar(); }, function(){});
}
function lnPintar(){ if(typeof S !== 'undefined' && S.page === 'listanegra'){ var c = document.getElementById('ln-cuerpo'); if(c) c.innerHTML = _lnCuerpoHtml(); var t = document.getElementById('ln-tabs'); if(t) t.innerHTML = _lnTabsHtml(); } }
function lnTab(t){ _ln.tab = t; lnPintar(); }
function _lnFecha(iso){ try{ return new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }catch(e){ return String(iso || ''); } }
// A quién corresponde una clave (cédula o teléfono), mirando lo anotado a mano y lo automático
function _lnDeClave(clave){
  var es = function(x){ return x.cedulaKey === clave || x.telKey === clave; };
  return _ln.manual.filter(es).map(function(x){ return Object.assign({ _origen: 'manual' }, x); }).concat(_ln.auto.filter(es).map(function(x){ return Object.assign({ _origen: 'auto' }, x); }));
}
function _lnDetalleAuto(x){
  return (x.detalle || []).map(function(d){ return 'PAGASI ' + _lnEsc(d.empresa) + ' · ' + _lnEsc(d.credito) + ' · ' + (d.recuperada ? 'moto recuperada' : (d.dias + ' días de atraso')); }).join('<br>');
}

// ── Buscar ───────────────────────────────────────────────────────────────────
function lnBuscar(){
  var inp = document.getElementById('ln-q');
  var texto = inp ? inp.value : _ln.consulta;
  var clave = lnCedKey(texto);
  _ln.consulta = texto;
  if(!clave){ _ln.resultado = { error: 'Escribe una cédula completa (por ejemplo V-12345678).' }; lnPintar(); return Promise.resolve(); }
  _ln.buscando = true; _ln.resultado = null; lnPintar();
  var num = clave.slice(1);
  var seguro = function(p){ return p.then(function(d){ return d.exists ? d.data() : null; }, function(e){ return { _fallo: (e && e.code) || 'error' }; }); };
  var sanc = (typeof amlCargarListas === 'function')
    ? amlCargarListas().then(function(L){ return ((L.porDoc && L.porDoc[num]) || []).map(function(i){ return L.e[i]; }); }, function(){ return null; })
    : Promise.resolve(null);
  return Promise.all([
    seguro(db.collection('listaNegra').doc(clave).get()),
    seguro(db.collection('listaNegraAuto').doc(clave).get()),
    seguro(db.collection('malapagas').doc(num).get()),
    sanc
  ]).then(function(r){
    // Clientes de ESTA compañía con esa cédula, y cómo van sus créditos (lo que el panel ya tiene cargado)
    var propios = (S.clientes || []).filter(function(c){ return c && !c.eliminado && lnCedKey(c.cedula || c.ci) === clave; }).map(function(c){
      var creds = (S.creds || []).filter(function(k){ return k && !k.eliminado && (String(k.clienteId) === String(c.id) || k.cli === c.nombre); });
      return { nombre: c.nombre, creditos: creds.map(function(k){ return { id: k.id, estado: k.estado || 'activo', mora: parseInt(k.mora, 10) || 0 }; }) };
    });
    _ln.buscando = false;
    _ln.resultado = { clave: clave, cedula: texto, manual: r[0], auto: r[1], malapagas: r[2], sanciones: r[3], propios: propios };
    if(typeof logActividad === 'function') logActividad('lista_negra_consulta', 'listanegra', num, { aparece: !!(r[0] && !r[0]._fallo) || !!(r[1] && !r[1]._fallo) });
    lnPintar();
  });
}
function _lnResultadoHtml(){
  var R = _ln.resultado;
  if(_ln.buscando) return '<div style="padding:18px;color:var(--ink3);font-size:13px">Buscando en todas las listas…</div>';
  if(!R) return '<div style="padding:18px;color:var(--ink3);font-size:13px">Escribe una cédula y pulsa Buscar. Se revisa la lista negra de Pagasi, los que pagan mal en la 18 y la 26, las listas internacionales de sancionados y la lista pública de malapagas.com.</div>';
  if(R.error) return '<div style="padding:14px 16px;color:var(--red);font-size:13px;font-weight:700">' + _lnEsc(R.error) + '</div>';
  var hay = function(x){ return !!(x && !x._fallo); };
  var caja = function(titulo, mal, cuerpo){
    return '<div style="border:1px solid ' + (mal ? '#FCA5A5' : 'var(--rim)') + ';background:' + (mal ? '#FEF2F2' : 'var(--surf)') + ';border-radius:12px;padding:12px 14px">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:4px"><div style="font-weight:800;font-size:13px">' + titulo + '</div>'
      + '<span style="font-size:11px;font-weight:800;padding:2px 9px;border-radius:999px;background:' + (mal ? '#DC2626' : 'var(--gs)') + ';color:' + (mal ? '#fff' : 'var(--green)') + '">' + (mal ? 'APARECE' : 'No aparece') + '</span></div>'
      + '<div style="font-size:12.5px;color:var(--ink2);line-height:1.55">' + cuerpo + '</div></div>';
  };
  var sinLeer = function(x){ return (x && x._fallo) ? '<span style="color:var(--ink3)">No se pudo consultar (' + _lnEsc(x._fallo) + ').</span>' : 'Sin registro.'; };
  var cajas = [];
  cajas.push(caja('Lista negra de Pagasi', hay(R.manual), hay(R.manual)
    ? '<b>' + _lnEsc(R.manual.nombre) + '</b> · ' + _lnEsc(R.manual.motivo || 'Sin motivo') + (R.manual.telefono ? ' · tel. ' + _lnEsc(R.manual.telefono) : '') + (R.manual.comentario ? '<br>' + _lnEsc(R.manual.comentario) : '') + '<br><span style="color:var(--ink3)">Anotado por ' + _lnEsc(R.manual.creadoPor || '') + ' el ' + _lnEsc(String(R.manual.creado || '').slice(0, 10)) + '</span>'
    : sinLeer(R.manual)));
  cajas.push(caja('Mala paga en Pagasi (automático)', hay(R.auto), hay(R.auto)
    ? '<b>' + _lnEsc(R.auto.nombre) + '</b> · ' + _lnEsc(R.auto.motivo || '') + '<br>' + _lnDetalleAuto(R.auto)
    : sinLeer(R.auto) + (R.propios.length ? '<br>Es cliente de esta compañía: ' + R.propios.map(function(p){ return '<b>' + _lnEsc(p.nombre) + '</b> — ' + (p.creditos.length ? p.creditos.map(function(k){ return _lnEsc(k.id) + ' (' + (k.mora > 0 ? k.mora + ' días de atraso' : _lnEsc(k.estado)) + ')'; }).join(', ') : 'sin créditos'); }).join('; ') : '')));
  var sanc = R.sanciones || [];
  cajas.push(caja('Listas internacionales de sancionados (OFAC y ONU)', sanc.length > 0, R.sanciones === null ? '<span style="color:var(--ink3)">No se pudieron cargar las listas.</span>'
    : (sanc.length ? sanc.map(function(x){ return '<b>' + _lnEsc(x[2] || '') + '</b>' + (x[1] ? ' · ' + _lnEsc(x[1]) : ''); }).join('<br>') + '<br>Revísalo en Cumplimiento.' : 'Ningún documento igual en las listas.')));
  cajas.push(caja('malapagas.com (lista pública de deudores)', hay(R.malapagas), hay(R.malapagas)
    ? '<b>' + _lnEsc(R.malapagas.nombre) + '</b>' + (R.malapagas.ciudad ? ' · ' + _lnEsc(R.malapagas.ciudad) : '') + (R.malapagas.montoAdeudado ? ' · debe ' + _lnEsc(R.malapagas.moneda || '') + ' ' + _lnEsc(R.malapagas.montoAdeudado) : '') + (R.malapagas.fechaReporte ? ' · reportado el ' + _lnEsc(String(R.malapagas.fechaReporte).slice(0, 10)) : '') + '<br><span style="color:var(--ink3)">Es un reporte de terceros, no de Pagasi.</span>'
    : sinLeer(R.malapagas)));
  var n = [hay(R.manual), hay(R.auto), sanc.length > 0, hay(R.malapagas)].filter(Boolean).length;
  var cab = '<div style="padding:12px 14px;border-radius:12px;margin-bottom:10px;font-weight:900;font-size:14px;' + (n ? 'background:#DC2626;color:#fff' : 'background:var(--gs);color:var(--green);border:1px solid var(--rim)') + '">'
    + 'Cédula ' + _lnEsc(R.clave.slice(1)) + ': ' + (n ? 'aparece en ' + n + ' lista' + (n === 1 ? '' : 's') : 'no aparece en ninguna lista') + '</div>';
  var agregar = hay(R.manual) ? '' : '<div style="margin-top:10px"><button class="btn btn-g btn-sm" data-ced="' + _lnEsc(R.clave.slice(1)) + '" onclick="lnAbrir(\'\', this.dataset.ced)">+ Anotarla en la lista negra</button></div>';
  return cab + '<div style="display:grid;gap:8px">' + cajas.join('') + '</div>' + agregar;
}

// ── Lista ────────────────────────────────────────────────────────────────────
function lnFiltrar(v){ _ln.filtro = v; var t = document.getElementById('ln-tabla'); if(t) t.innerHTML = _lnTablaHtml(); }
function _lnTablaHtml(){
  var admin = typeof isAdminUser === 'function' && isAdminUser();
  var f = String(_ln.filtro || '').toUpperCase().trim(), fd = lnDigitos(f);
  var filas = _ln.manual.map(function(x){ return Object.assign({ _origen: 'manual' }, x); }).concat(_ln.auto.map(function(x){ return Object.assign({ _origen: 'auto' }, x); }))
    .filter(function(x){ if(!f) return true; return String(x.nombre || '').toUpperCase().indexOf(f) > -1 || (fd && (lnDigitos(x.cedula).indexOf(fd) > -1 || lnDigitos(x.telefono).indexOf(fd) > -1)); })
    .sort(function(a, b){ return String(a.nombre || '').localeCompare(String(b.nombre || '')); });
  if(!filas.length) return '<div style="padding:18px;color:var(--ink3);font-size:13px">' + (f ? 'Nadie coincide con «' + _lnEsc(_ln.filtro) + '».' : 'La lista está vacía. Usa «+ Agregar» para anotar a la primera persona.') + '</div>';
  return '<div style="overflow-x:auto"><table class="tbl" style="width:100%"><thead><tr><th>Cédula</th><th>Nombre completo</th><th>Teléfono</th><th>Motivo</th><th>Comentario</th><th>Origen</th><th></th></tr></thead><tbody>'
    + filas.map(function(x){
      var auto = x._origen === 'auto';
      return '<tr><td style="white-space:nowrap;font-weight:700">' + _lnEsc(x.cedula) + '</td><td>' + _lnEsc(x.nombre) + '</td><td style="white-space:nowrap">' + _lnEsc(x.telefono || '') + '</td>'
        + '<td>' + _lnEsc(x.motivo || '') + '</td><td style="font-size:12px;color:var(--ink2)">' + (auto ? _lnDetalleAuto(x) : _lnEsc(x.comentario || '')) + '</td>'
        + '<td><span style="font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:999px;background:' + (auto ? 'var(--surf2)' : 'var(--gs)') + ';color:var(--ink2);white-space:nowrap">' + (auto ? 'Automático' : 'A mano') + '</span></td>'
        + '<td style="white-space:nowrap;text-align:right">' + (!auto && admin ? '<button class="btn btn-g btn-xs" data-id="' + _lnEsc(x._id) + '" onclick="lnAbrir(this.dataset.id)">Editar</button> <button class="btn btn-g btn-xs" style="color:var(--red)" data-id="' + _lnEsc(x._id) + '" onclick="lnEliminar(this.dataset.id)">Eliminar</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

// ── Agregar / modificar ──────────────────────────────────────────────────────
function _lnMayus(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); }
function lnAbrir(id, cedulaNueva){
  var x = id ? _ln.manual.find(function(m){ return m._id === id; }) : null;
  if(id && !x){ toast('No encontré ese registro', 'error'); return; }
  if(x && !(typeof isAdminUser === 'function' && isAdminUser())){ toast('Solo un administrador modifica la lista', 'error'); return; }
  setMicon('user'); $('mtt').textContent = x ? 'Modificar registro' : 'Agregar a la lista negra'; $('msb').textContent = x ? 'La cédula no se cambia: si está mal, elimina el registro y anótalo de nuevo' : 'Desde que lo guardes, el sistema frena cualquier venta con esta persona';
  $('modal-box').className = 'modal';
  var v = function(k){ return _lnEsc(x ? (x[k] || '') : ''); };
  $('mbd').innerHTML = '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Cédula</label><input class="fi" id="ln_ced" placeholder="V-12345678" value="' + (x ? v('cedula') : _lnEsc(cedulaNueva || '')) + '"' + (x ? ' disabled' : '') + '></div>'
    + '<div class="fg"><label>Nombres completos</label><input class="fi" id="ln_nom" placeholder="Nombre y apellido" value="' + v('nombre') + '"></div>'
    + '<div class="fg"><label>Teléfono</label><input class="fi" id="ln_tel" placeholder="0414-1234567" value="' + v('telefono') + '"></div>'
    + '<div class="fg"><label>Motivo</label><select class="fs" id="ln_mot">' + LN_MOTIVOS.map(function(m){ return '<option' + ((x && x.motivo === m) ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>'
    + '<div class="fg"><label>Comentario</label><textarea class="fi" id="ln_com" rows="3" placeholder="Qué pasó, con qué contrato, quién lo reportó…">' + v('comentario') + '</textarea></div>'
    + '</div>';
  S.saveFn = function(){ lnGuardar(x ? x._id : ''); return false; };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" id="ln_btn" onclick="saveM()">' + (x ? 'Guardar cambios' : 'Agregar') + '</button>';
  $('ov').style.display = 'flex';
}
function lnGuardar(id){
  if(window._lnGuardando) return;
  var g = function(k){ return String(($(k) || {}).value || '').trim(); };
  var viejo = id ? _ln.manual.find(function(m){ return m._id === id; }) : null;
  var cedula = viejo ? viejo.cedula : g('ln_ced'), clave = viejo ? viejo._id : lnCedKey(cedula);
  var nombre = _lnMayus(g('ln_nom')), tel = g('ln_tel'), telKey = lnTelKey(tel);
  if(!clave){ toast('Escribe la cédula completa', 'error'); return; }
  if(!nombre){ toast('Escribe el nombre completo', 'error'); return; }
  if(tel && !telKey){ toast('El teléfono está incompleto (faltan números)', 'error'); return; }
  if(!viejo && _ln.manual.some(function(m){ return m._id === clave; })){ toast('Esa cédula ya está en la lista', 'error'); return; }
  if(viejo && !(typeof isAdminUser === 'function' && isAdminUser())){ toast('Solo un administrador modifica la lista', 'error'); return; }
  var ahora = new Date().toISOString(), idx = db.collection('listaNegraIndice'), lote = db.batch();
  var datos = { cedula: _lnMayus(cedula), cedulaKey: clave, nombre: nombre, telefono: tel, telKey: telKey, motivo: g('ln_mot') || 'Otro', comentario: g('ln_com') };
  if(viejo){
    Object.assign(datos, { editado: ahora, editadoPor: _lnQuien() });
    lote.update(db.collection('listaNegra').doc(clave), datos);
    // El teléfono cambió: la marca vieja se quita solo si nadie más de la lista tiene ese número
    if(viejo.telKey && viejo.telKey !== telKey && !_ln.manual.some(function(m){ return m._id !== clave && m.telKey === viejo.telKey; })) lote.delete(idx.doc('M-' + viejo.telKey));
  } else {
    Object.assign(datos, { creado: ahora, creadoPor: _lnQuien(), creadoPorUid: (S.currentUser && S.currentUser.uid) || '' });
    lote.set(db.collection('listaNegra').doc(clave), datos);
    lote.set(idx.doc('M-' + clave), { t: 'manual', fecha: ahora });
  }
  if(telKey) lote.set(idx.doc('M-' + telKey), { t: 'manual', fecha: ahora });
  window._lnGuardando = true; var b = $('ln_btn'); if(b) b.disabled = true;
  var soltar = function(){ window._lnGuardando = false; if(b) b.disabled = false; };
  // Antes de anotar a alguien nuevo se mira en la base si ya está: la lista de la pantalla puede no
  // haber terminado de cargar, o puede haberlo anotado otra persona hace un segundo.
  var yaEsta = viejo ? Promise.resolve(false) : db.collection('listaNegra').doc(clave).get().then(function(d){ return d.exists; });
  yaEsta.then(function(ya){
    if(ya){ soltar(); toast('Esa cédula ya está en la lista', 'error'); return; }
    return lote.commit().then(function(){
      soltar();
      if(typeof logActividad === 'function') logActividad(viejo ? 'lista_negra_modificada' : 'lista_negra_agregada', 'listanegra', clave.slice(1), { motivo: datos.motivo });
      closeM(); toast(viejo ? 'Registro modificado' : 'Anotado en la lista negra', 'success');
      if(_ln.resultado && _ln.resultado.clave === clave) lnBuscar();
    });
  }).catch(function(e){
    soltar();
    toast((e && e.code === 'permission-denied') ? 'La base no dejó guardar: no tienes el permiso, o faltan publicar las Reglas' : ('No se pudo guardar: ' + (e && e.message || e)), 'error');
  });
}
function lnEliminar(id){
  if(!(typeof isAdminUser === 'function' && isAdminUser())){ toast('Solo un administrador elimina de la lista', 'error'); return; }
  var x = _ln.manual.find(function(m){ return m._id === id; });
  if(!x) return;
  var hacer = function(){
    var idx = db.collection('listaNegraIndice'), lote = db.batch();
    lote.delete(db.collection('listaNegra').doc(id));
    lote.delete(idx.doc('M-' + id));
    if(x.telKey && !_ln.manual.some(function(m){ return m._id !== id && m.telKey === x.telKey; })) lote.delete(idx.doc('M-' + x.telKey));
    lote.commit().then(function(){
      if(typeof logActividad === 'function') logActividad('lista_negra_eliminada', 'listanegra', id.slice(1), { motivo: x.motivo || '' });
      toast('Eliminado de la lista negra', 'success');
    }).catch(function(e){ toast('No se pudo eliminar: ' + (e && e.message || e), 'error'); });
  };
  if(typeof confirmarEliminacion === 'function') confirmarEliminacion({ titulo: 'Eliminar de la lista negra', descripcion: '¿Sacar a ' + x.nombre + ' de la lista? El sistema dejará de frenar las ventas con esta persona.', onConfirm: hacer });
  else if(confirm('¿Sacar a ' + x.nombre + ' de la lista negra?')) hacer();
}

// ── Frenados ─────────────────────────────────────────────────────────────────
function lnResolver(avisoId, autorizar){
  var a = _ln.avisos.find(function(x){ return x._id === avisoId; });
  if(!a) return;
  // Solo claves con forma de clave: el aviso lo escribe quien fue frenado, y no se le cree cualquier cosa
  var claves = (Array.isArray(a.coincidencias) ? a.coincidencias : []).map(function(c){ return String((c && c.clave) || ''); }).filter(function(k){ return /^[CT][0-9]{6,10}$/.test(k); });
  var marca = { estado: autorizar ? 'autorizado' : 'rechazado', resueltoPor: _lnQuien(), resueltoEn: new Date().toISOString() };
  var paso = autorizar ? lnDarPase(claves, 'Autorizado desde Frenados', avisoId) : Promise.resolve();
  paso.then(function(){ return db.collection('listaNegraAvisos').doc(avisoId).update(marca); }).then(function(){
    if(typeof logActividad === 'function') logActividad(autorizar ? 'lista_negra_autorizado' : 'lista_negra_no_autorizado', 'listanegra', a.cedula || '', { claves: claves.length });
    toast(autorizar ? 'Autorizado: el vendedor puede cargarlo durante ' + LN_PASE_DIAS + ' días' : 'Marcado como no autorizado', autorizar ? 'success' : 'info');
  }).catch(function(e){ toast('No se pudo guardar: ' + (e && e.message || e), 'error'); });
}
function _lnFrenadosHtml(){
  if(!_ln.avisos.length) return '<div style="padding:18px;color:var(--ink3);font-size:13px">El sistema no ha frenado a nadie todavía.</div>';
  return '<div style="display:grid;gap:8px">' + _ln.avisos.map(function(a){
    var pend = a.estado === 'pendiente';
    var que = (Array.isArray(a.coincidencias) ? a.coincidencias : []).filter(function(c){ return c && typeof c === 'object'; }).map(function(c){
      c = { clave: String(c.clave || ''), papel: String(c.papel || '') };
      var quien = _lnDeClave(c.clave).map(function(x){ return '<b>' + _lnEsc(x.nombre) + '</b> (' + _lnEsc(x.motivo || '') + (x._origen === 'manual' && x.comentario ? ': ' + _lnEsc(x.comentario) : '') + ')'; }).join(', ');
      return '· ' + _lnEsc(c.papel) + ' — ' + (c.clave.charAt(0) === 'T' ? 'teléfono ' : 'cédula ') + _lnEsc(c.clave.slice(1)) + (quien ? ' → ' + quien : '');
    }).join('<br>');
    return '<div style="border:1px solid ' + (pend ? '#FCA5A5' : 'var(--rim)') + ';border-radius:12px;padding:12px 14px;background:var(--surf)">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div style="font-weight:800;font-size:13px">' + _lnEsc(a.usuario || 'Alguien') + ' quiso cargar a ' + _lnEsc(a.nombre || 'un cliente') + (a.cedula ? ' (' + _lnEsc(a.cedula) + ')' : '') + '</div>'
      + '<div style="font-size:11.5px;color:var(--ink3)">' + _lnEsc(_lnFecha(a.fecha)) + '</div></div>'
      + '<div style="font-size:12.5px;color:var(--ink2);line-height:1.55;margin:6px 0 8px">' + que + '</div>'
      + (pend ? '<button class="btn btn-p btn-sm" data-id="' + _lnEsc(a._id) + '" onclick="lnResolver(this.dataset.id, true)">Autorizar ' + LN_PASE_DIAS + ' días</button> <button class="btn btn-g btn-sm" data-id="' + _lnEsc(a._id) + '" onclick="lnResolver(this.dataset.id, false)">No autorizar</button>'
        : '<span style="font-size:11.5px;font-weight:800;color:' + (a.estado === 'autorizado' ? 'var(--green)' : 'var(--ink3)') + '">' + (a.estado === 'autorizado' ? 'Autorizado' : 'No autorizado') + ' por ' + _lnEsc(a.resueltoPor || '') + '</span>')
      + '</div>';
  }).join('') + '</div>';
}

// ── La página ────────────────────────────────────────────────────────────────
function _lnTabsHtml(){
  var pend = _ln.avisos.filter(function(a){ return a.estado === 'pendiente'; }).length;
  var b = function(k, t){ return '<button type="button" class="btn ' + (_ln.tab === k ? 'btn-p' : 'btn-g') + ' btn-sm" onclick="lnTab(\'' + k + '\')">' + t + '</button>'; };
  return b('buscar', 'Buscar una cédula') + b('lista', 'Lista (' + (_ln.manual.length + _ln.auto.length) + ')') + b('frenados', 'Frenados' + (pend ? ' · ' + pend + ' por revisar' : ''));
}
function _lnCuerpoHtml(){
  var aviso = _ln.error ? '<div style="padding:10px 14px;border:1px solid #FCA5A5;background:#FEF2F2;color:#991B1B;border-radius:10px;font-size:12.5px;font-weight:700;margin-bottom:10px">' + _lnEsc(_ln.error) + '</div>' : '';
  if(_ln.tab === 'lista'){
    return aviso + '<div class="card" style="padding:14px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">'
      + '<input class="fi" style="flex:1;min-width:200px" placeholder="Filtrar por nombre, cédula o teléfono" value="' + _lnEsc(_ln.filtro) + '" oninput="lnFiltrar(this.value)">'
      + '<button class="btn btn-p btn-sm" onclick="lnAbrir(\'\')">+ Agregar</button></div>'
      + '<div style="font-size:11.5px;color:var(--ink3);margin-bottom:8px">«A mano» lo anota Verificación. «Automático» lo pone el sistema: más de ' + LN_AUTO_DIAS + ' días de atraso o moto recuperada, en PAGASI 18 o 26; sale solo cuando la persona se pone al día.</div>'
      + '<div id="ln-tabla">' + _lnTablaHtml() + '</div></div>';
  }
  if(_ln.tab === 'frenados') return aviso + '<div class="card" style="padding:14px"><div style="font-size:11.5px;color:var(--ink3);margin-bottom:10px">Cada vez que el sistema frenó a un vendedor. Si autorizas, esa persona puede cargarse durante ' + LN_PASE_DIAS + ' días; después el sistema vuelve a frenar.</div>' + _lnFrenadosHtml() + '</div>';
  return aviso + '<div class="card" style="padding:14px"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
    + '<input class="fi" id="ln-q" style="flex:1;min-width:200px;font-size:15px" placeholder="Cédula, por ejemplo V-12345678" value="' + _lnEsc(_ln.consulta) + '" onkeydown="if(event.key===\'Enter\')lnBuscar()">'
    + '<button class="btn btn-p" onclick="lnBuscar()">Buscar</button></div>' + _lnResultadoHtml() + '</div>';
}
PG.listanegra = function(){
  if(!lnPuedeVer()) return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">La Lista negra la ven solo Verificación y los administradores.</div></div>';
  lnSuscribir();
  return '<div class="page"><div class="card" style="padding:16px 18px;margin-bottom:12px">'
    + '<div style="font-size:19px;font-weight:900">Lista negra</div>'
    + '<div style="font-size:12.5px;color:var(--ink3);margin-top:3px">Personas con las que Pagasi no vuelve a hacer negocio sin que Verificación lo autorice. Al vendedor solo le sale el aviso «ERROR BL26»; no ve la lista ni el motivo.</div>'
    + '<div id="ln-tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">' + _lnTabsHtml() + '</div></div>'
    + '<div id="ln-cuerpo">' + _lnCuerpoHtml() + '</div></div>';
};
