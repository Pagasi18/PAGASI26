// ══════════════════════════════════════════════════════════════════
// LISTA NEGRA (26-nov-2026)
// ══════════════════════════════════════════════════════════════════
// La pidió el Sr. Luis Márquez (Verificación Documental) y Adam la aprobó: una lista de personas con
// las que Pagasi no vuelve a hacer negocio sin que Verificación lo autorice. Al cargar un cliente o una
// solicitud, si la cédula del cliente, del fiador o de una referencia (o el teléfono de una referencia)
// está en la lista, el vendedor queda FRENADO con un aviso en clave —no sabe por qué— y Verificación
// decide. Decisiones de Adam: el módulo se llama «Lista negra»; cada persona lleva un motivo; «mala
// paga» va de las dos formas (a mano, y sola: más de 30 días de atraso o moto recuperada, en la 18 o en
// la 26); hay un buscador por cédula; la lista la ven solo Verificación y los administradores.
//
// Dónde vive cada cosa (todo en la base de la compañía que vende):
//   listaNegra/{C<cédula>}        lo que anota Verificación a mano
//   listaNegraAuto/{C<cédula>}    «mala paga» automática; la escribe solo el robot bot/lista-negra.js
//   listaNegraIndice/{M-|A-}{clave}  marcas vacías: es lo ÚNICO que puede consultar un vendedor, y solo
//                                 de a una y sabiendo la cédula o el teléfono. No dice quién ni por qué.
//   listaNegraAvisos/{id}         cada vez que el sistema frenó a alguien (lo ve Verificación)
//   listaNegraPases/{clave}       visto bueno de Verificación para una clave, por unos días
//   malapagas/{cédula}            la lista pública de malapagas.com (solo para el buscador)
// Una «clave» es C + los números de la cédula, o T + los últimos 10 números del teléfono.
//
// PAGASI 18 ya no vende: allá el módulo no aparece y nada se revisa. Si la consulta falla (sin conexión,
// o las Reglas todavía sin publicar) NO se frena la venta: se deja pasar y queda dicho en la consola.

var LN_MENSAJE = 'Coincidencia con Cédula en Contrato Anterior. ERROR BL26. Comunicarse con Departamento de Verificación Documental';
var LN_MOTIVOS = ['Mala paga', 'Documentos falsos', 'Moto recuperada', 'Fraude', 'Otro'];
var LN_PASE_DIAS = 7;          // lo que dura el visto bueno de Verificación
var LN_AUTO_DIAS = 30;         // «mala paga» automática: más de estos días de atraso

// ── Claves ───────────────────────────────────────────────────────────────────
function lnDigitos(v){ return String(v == null ? '' : v).replace(/[^\d]/g, ''); }
// V-12.345.678, v12345678 y 12345678 son la misma persona. Con menos de 6 números no es una cédula.
function lnCedKey(v){ var d = lnDigitos(v).replace(/^0+/, ''); return (d.length >= 6 && d.length <= 10) ? 'C' + d : ''; }
// 0414-1234567, +58 414 1234567 y 4141234567 son el mismo teléfono: los últimos 10 números.
function lnTelKey(v){ var d = lnDigitos(v); return d.length >= 10 ? 'T' + d.slice(-10) : ''; }
// Las claves que se revisan de un formulario: cédulas del cliente, el fiador y las dos referencias, y el
// teléfono de las referencias (Adam, 26-nov-2026: «por teléfono»). Cada clave una sola vez.
function lnClavesDe(d){
  d = d || {};
  var out = [], visto = {};
  var add = function(k, papel){ if(k && !visto[k]){ visto[k] = 1; out.push({ clave: k, papel: papel }); } };
  add(lnCedKey(d.ci), 'cliente');
  add(lnCedKey(d.fiador_ci), 'fiador');
  add(lnCedKey(d.r1ci), 'referencia 1'); add(lnTelKey(d.r1t), 'referencia 1');
  add(lnCedKey(d.r2ci), 'referencia 2'); add(lnTelKey(d.r2t), 'referencia 2');
  return out;
}
// Las mismas claves, pero de una ficha de cliente ya guardada (para no volver a frenar al EDITAR una
// ficha por datos que ya tenía: solo cuenta lo que cambió).
function lnClavesDeFicha(c){
  c = c || {};
  var r1 = c.ref1 || {}, r2 = c.ref2 || {}, m = {};
  lnClavesDe({ ci: c.cedula || c.ci, fiador_ci: c.fiador_ci, r1ci: r1.ci, r1t: r1.tel, r2ci: r2.ci, r2t: r2.tel }).forEach(function(x){ m[x.clave] = 1; });
  return m;
}
// Y las de un CRÉDITO ya guardado: lo que ese crédito tenía (su cliente, su fiador y sus referencias),
// no lo que diga hoy la ficha del cliente que esté elegido en la pantalla. Así, al editar un crédito,
// cambiarle el cliente o ponerle un fiador que no tenía SÍ se revisa, y no frena por una referencia
// vieja de la ficha que ese crédito nunca llevó (revisión del 26-nov-2026).
function lnClavesDeCredito(cred, cliente){
  cred = cred || {}; cliente = cliente || {};
  var m = {};
  lnClavesDe({ ci: cliente.cedula || cliente.ci, fiador_ci: cred.fiador_ci, r1ci: cred.r1ci, r1t: cred.r1t, r2ci: cred.r2ci, r2t: cred.r2t }).forEach(function(x){ m[x.clave] = 1; });
  return m;
}
function lnFirma(claves){ return (claves || []).map(function(x){ return x.clave; }).sort().join('|'); }
function lnPaseVigente(pase, ahoraISO){ return !!(pase && String(pase.hasta || '') >= String(ahoraISO || new Date().toISOString())); }

// ── «Mala paga» automática (lo usa el robot; aquí para probarlo) ─────────────
// creditos: [{ id, estado, eliminado, clienteId, cli, dias }] con `dias` = días de atraso ya calculados.
// Entra quien tenga un crédito vigente con MÁS de LN_AUTO_DIAS de atraso, o una moto recuperada.
function lnAutoDe(empresa, creditos, clientes, umbral){
  umbral = umbral == null ? LN_AUTO_DIAS : umbral;
  var porId = {}, porNombre = {};
  // (los créditos viejos se enlazan por nombre: solo vale si ese nombre es de UN solo cliente, para no anotar a un tocayo)
  (clientes || []).forEach(function(c){ if(!c || c.eliminado) return; porId[String(c.id)] = c; if(c.nombre){ var k = String(c.nombre); porNombre[k] = (k in porNombre) ? null : c; } });
  var out = {};
  (creditos || []).forEach(function(cr){
    if(!cr || cr.eliminado) return;
    var est = String(cr.estado || '');
    var recuperada = est === 'recuperado' || est === 'recuperada';
    var vigente = est === 'activo' || est === 'mora' || est === '';
    var dias = parseInt(cr.dias, 10) || 0;
    if(!recuperada && !(vigente && dias > umbral)) return;
    var cli = porId[String(cr.clienteId)] || porNombre[String(cr.cli)] || null;
    if(!cli) return;
    var key = lnCedKey(cli.cedula || cli.ci);
    if(!key) return;
    var e = out[key] || (out[key] = { cedula: String(cli.cedula || cli.ci || ''), cedulaKey: key, nombre: String(cli.nombre || cr.cli || ''),
      telefono: String(cli.tel || cli.wa || ''), telKey: lnTelKey(cli.tel || cli.wa), motivo: 'Mala paga', detalle: [] });
    e.detalle.push({ empresa: String(empresa), credito: String(cr.id), dias: dias, recuperada: recuperada });
    if(recuperada) e.motivo = 'Moto recuperada';
  });
  return out;
}

// ══════════════════════════════════════════════════════════════════
// De aquí en adelante, el panel
// ══════════════════════════════════════════════════════════════════
function lnAqui(){ return !(typeof _esLaBaseDe18 === 'function' && _esLaBaseDe18()); }
function lnPuedeVer(){
  if(!lnAqui() || typeof S === 'undefined' || !S.currentUser) return false;
  if(typeof isAdminUser === 'function' && isAdminUser()) return true;
  if(typeof isVendedorConcesionarioRole === 'function' && isVendedorConcesionarioRole()) return false;
  return (typeof getCurrentPerms === 'function' ? getCurrentPerms() : []).indexOf('listanegra') > -1;
}
function _lnEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
function _lnQuien(){ return (S.currentUser && (S.currentUser.nombre || S.currentUser.email)) || ''; }
function _lnConTiempo(promesa, ms){
  return new Promise(function(resolve, reject){
    var listo = false;
    var t = setTimeout(function(){ if(listo) return; listo = true; reject(new Error('la consulta tardó demasiado')); }, ms);
    Promise.resolve(promesa).then(function(v){ if(listo) return; listo = true; clearTimeout(t); resolve(v); }, function(e){ if(listo) return; listo = true; clearTimeout(t); reject(e); });
  });
}

// Consulta las marcas. Devuelve { coincidencias: [{clave, papel, fuentes:['manual'|'auto'], pase}], error }.
// Nunca rechaza: si no se pudo consultar, `error` lo dice y no hay coincidencias (la venta no se frena).
function lnConsultar(claves){
  if(typeof db === 'undefined' || !db || !claves || !claves.length) return Promise.resolve({ coincidencias: [], error: null });
  var idx = db.collection('listaNegraIndice'), ahora = new Date().toISOString();
  var trabajo = Promise.all(claves.map(function(x){
    return Promise.all([idx.doc('M-' + x.clave).get(), idx.doc('A-' + x.clave).get()]).then(function(r){
      var f = [];
      if(r[0].exists) f.push('manual');
      if(r[1].exists) f.push('auto');
      return f.length ? { clave: x.clave, papel: x.papel, fuentes: f, pase: false } : null;
    });
  })).then(function(rs){
    var hay = rs.filter(Boolean);
    if(!hay.length) return hay;
    return Promise.all(hay.map(function(h){
      return db.collection('listaNegraPases').doc(h.clave).get().then(function(p){ h.pase = lnPaseVigente(p.exists ? p.data() : null, ahora); return h; }, function(){ return h; });
    }));
  });
  return _lnConTiempo(trabajo, 8000).then(function(l){ return { coincidencias: l, error: null }; }, function(e){ return { coincidencias: [], error: e }; });
}

// Deja anotado que el sistema frenó a alguien, para que Verificación lo vea. Una vez por intento.
var _lnAvisados = {}, _lnAvisoDe = {};
function lnAvisoGuardar(frenan, datos){
  try{
    if(typeof db === 'undefined' || !db || !S.currentUser) return;
    var firma = lnFirma(frenan);
    if(_lnAvisados[firma] && Date.now() - _lnAvisados[firma] < 10 * 60000) return;
    _lnAvisados[firma] = Date.now();
    _lnAvisoDe[firma] = db.collection('listaNegraAvisos').add({
      fecha: new Date().toISOString(), uid: S.currentUser.uid || '', usuario: _lnQuien(), estado: 'pendiente',
      origen: (datos && datos.origen) || '', nombre: String((datos && datos.nom) || '').slice(0, 120), cedula: String((datos && datos.ci) || '').slice(0, 30),
      concesionarioId: String((datos && datos.concesionarioId) || ''),
      coincidencias: frenan.map(function(c){ return { clave: c.clave, papel: c.papel, fuentes: c.fuentes }; })
    }).then(function(d){ return (d && d.id) || ''; }, function(e){ console.warn('lista negra: no se pudo anotar el aviso', e && e.message); return ''; });
  }catch(e){}
}

// El visto bueno: una marca por clave, que vence sola.
function lnDarPase(claves, nota, avisoId){
  var hasta = new Date(Date.now() + LN_PASE_DIAS * 86400000).toISOString(), lote = db.batch();
  (claves || []).forEach(function(k){
    lote.set(db.collection('listaNegraPases').doc(k), { clave: k, hasta: hasta, fecha: new Date().toISOString(), por: _lnQuien(), porUid: (S.currentUser && S.currentUser.uid) || '', nota: String(nota || ''), avisoId: String(avisoId || '') });
  });
  return lote.commit();
}

// La ventana. Al vendedor le dice solo el mensaje en clave. A quien puede ver la lista le dice además
// qué coincidió y le deja autorizar la venta ahí mismo.
function lnVentana(frenan, datos, alAutorizar){
  var viejo = document.getElementById('ln-ventana'); if(viejo && viejo.parentNode) viejo.parentNode.removeChild(viejo);
  var puede = lnPuedeVer();
  var detalle = '';
  if(puede){
    detalle = '<div style="margin-top:14px;padding:10px 12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;font-size:12.5px;color:#7F1D1D;text-align:left;line-height:1.55">'
      + '<b>Solo tú lo ves (tienes acceso a la Lista negra):</b><br>'
      + frenan.map(function(c){ var k = String(c.clave || ''); return '· ' + _lnEsc(c.papel) + ' — ' + (k.charAt(0) === 'T' ? 'teléfono' : 'cédula') + ' ' + _lnEsc(k.slice(1)) + ' (' + (c.fuentes || []).map(function(f){ return f === 'auto' ? 'mala paga automática' : 'anotado a mano'; }).join(' y ') + ')'; }).join('<br>')
      + '</div>';
  }
  var w = document.createElement('div');
  w.id = 'ln-ventana';
  w.setAttribute('role', 'alertdialog');
  w.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:18px';
  w.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:460px;width:100%;padding:26px 24px 20px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:inherit">'
    + '<div style="width:54px;height:54px;border-radius:50%;background:#FEE2E2;color:#B91C1C;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;margin:0 auto 12px">!</div>'
    + '<div style="font-size:17px;font-weight:900;color:#B91C1C;margin-bottom:8px">No se puede continuar</div>'
    + '<div id="ln-ventana-msg" style="font-size:14.5px;line-height:1.5;color:#111827;font-weight:700">' + _lnEsc(LN_MENSAJE) + '</div>'
    + detalle
    + '<div style="display:flex;gap:8px;justify-content:center;margin-top:18px;flex-wrap:wrap">'
    + (puede && alAutorizar ? '<button type="button" id="ln-ventana-pase" style="background:#fff;color:#B91C1C;border:1.5px solid #FCA5A5;border-radius:10px;padding:10px 16px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">Autorizar y continuar</button>' : '')
    + '<button type="button" id="ln-ventana-ok" style="background:#2563EB;color:#fff;border:none;border-radius:10px;padding:10px 22px;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit">Entendido</button>'
    + '</div></div>';
  document.body.appendChild(w);
  var cerrar = function(){ if(w.parentNode) w.parentNode.removeChild(w); };
  var ok = document.getElementById('ln-ventana-ok'); if(ok) ok.onclick = cerrar;
  var pase = document.getElementById('ln-ventana-pase');
  if(pase) pase.onclick = function(){
    pase.disabled = true; pase.textContent = 'Autorizando…';
    lnDarPase(frenan.map(function(c){ return c.clave; }), 'Autorizado al cargar ' + ((datos && datos.nom) || '')).then(function(){
      // El aviso que dejó este mismo intento queda resuelto: que no le aparezca a Verificación como pendiente
      Promise.resolve(_lnAvisoDe[lnFirma(frenan)]).then(function(id){ if(id) db.collection('listaNegraAvisos').doc(id).update({ estado: 'autorizado', resueltoPor: _lnQuien(), resueltoEn: new Date().toISOString() }).catch(function(){}); });
      if(typeof logActividad === 'function') logActividad('lista_negra_autorizado', 'listanegra', (datos && datos.ci) || '', { claves: frenan.length });
      cerrar(); if(typeof toast === 'function') toast('Autorizado por ' + LN_PASE_DIAS + ' días', 'success'); alAutorizar();
    }).catch(function(e){ pase.disabled = false; pase.textContent = 'Autorizar y continuar'; if(typeof toast === 'function') toast('No se pudo autorizar: ' + (e && e.message || e), 'error'); });
  };
  return w;
}

// ── La puerta: se llama al GUARDAR un cliente o una solicitud ────────────────
// Devuelve true si se puede seguir ya. Si devuelve false, está consultando: llamará a `continuar` si
// todo está limpio (o hay visto bueno), o mostrará la ventana y llamará a `alFrenar`.
var _lnLibres = {};
function lnPuerta(datos, continuar, alFrenar){
  if(!lnAqui() || typeof db === 'undefined' || !db) return true;
  var ya = (datos && datos.yaGuardadas) || {};
  var claves = lnClavesDe(datos).filter(function(x){ return !ya[x.clave]; });
  if(!claves.length) return true;
  var firma = lnFirma(claves);
  if(_lnLibres[firma] && Date.now() - _lnLibres[firma] < 120000) return true;
  if(window._lnRevisando) return false;
  window._lnRevisando = true;
  // Mientras se consulta (hasta 8 segundos con mala conexión) el usuario puede cerrar o cancelar la
  // ventana. `datos.vigente()` dice si la pantalla sigue siendo la misma: si no, NO se guarda nada.
  // Antes el guardado se disparaba igual: Cancelar guardaba la ficha, y cerrar un crédito en edición
  // lo volvía a guardar como una solicitud nueva (revisión del 26-nov-2026).
  var sigue = function(){ try{ return !(datos && typeof datos.vigente === 'function') || !!datos.vigente(); }catch(e){ return false; } };
  lnConsultar(claves).then(function(r){
    window._lnRevisando = false;
    if(!sigue()){ if(alFrenar) alFrenar(); return; }
    if(r.error) console.warn('lista negra: no se pudo revisar; la venta sigue', r.error && r.error.message);
    var frenan = r.coincidencias.filter(function(c){ return !c.pase; });
    if(!frenan.length){ _lnLibres[firma] = Date.now(); continuar(); return; }
    lnAvisoGuardar(frenan, datos);
    lnVentana(frenan, datos, function(){ if(!sigue()) return; _lnLibres[firma] = Date.now(); continuar(); });
    if(alFrenar) alFrenar();
  });
  return false;
}

// ── El aviso al ESCRIBIR la cédula (o el teléfono de una referencia) ─────────
// Lo pidió Luis: «al ingresar la cédula». El formulario no se toca: se escucha cuando una de estas
// casillas pierde el foco con un valor nuevo. El freno de verdad sigue siendo la puerta al guardar.
var LN_CASILLAS = { wz_ci: ['C', 'cliente'], wz_fiador_ci: ['C', 'fiador'], wz_r1ci: ['C', 'referencia 1'], wz_r2ci: ['C', 'referencia 2'], wz_r1t: ['T', 'referencia 1'], wz_r2t: ['T', 'referencia 2'] };
var _lnVistas = {};
function lnAlEscribir(id, valor){
  var def = LN_CASILLAS[id];
  if(!def || !lnAqui()) return Promise.resolve(null);
  var clave = def[0] === 'C' ? lnCedKey(valor) : lnTelKey(valor);
  if(!clave || _lnVistas[clave]) return Promise.resolve(null);
  // Al editar una ficha, lo que ya tenía guardado no vuelve a avisar
  try{
    var edId = (typeof WZ !== 'undefined' && WZ) ? (WZ.clienteEditId || '') : '';
    if(edId){ var fc = (S.clientes || []).find(function(x){ return String(x.id) === String(edId); }); if(fc && lnClavesDeFicha(fc)[clave]) return Promise.resolve(null); }
  }catch(e){}
  return lnConsultar([{ clave: clave, papel: def[1] }]).then(function(r){
    var frenan = r.coincidencias.filter(function(c){ return !c.pase; });
    if(!r.error) _lnVistas[clave] = 1;
    if(!frenan.length) return null;
    var datos = { origen: 'al escribir', nom: (document.getElementById('wz_nom') || {}).value || '', ci: (document.getElementById('wz_ci') || {}).value || '' };
    lnAvisoGuardar(frenan, datos);
    lnVentana(frenan, datos, null);
    return frenan;
  });
}
if(typeof document !== 'undefined' && document.addEventListener){
  document.addEventListener('change', function(ev){
    var el = ev && ev.target;
    if(el && el.id && LN_CASILLAS[el.id]) lnAlEscribir(el.id, el.value);
  }, true);
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { LN_MENSAJE: LN_MENSAJE, LN_AUTO_DIAS: LN_AUTO_DIAS, lnCedKey: lnCedKey, lnTelKey: lnTelKey, lnClavesDe: lnClavesDe, lnClavesDeFicha: lnClavesDeFicha, lnClavesDeCredito: lnClavesDeCredito, lnFirma: lnFirma, lnPaseVigente: lnPaseVigente, lnAutoDe: lnAutoDe };
}
