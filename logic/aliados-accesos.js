// ══════════════════════════════════════════════════════════════════════════
// ACCESOS AL PORTAL DE ALIADOS (22-oct-2026)
// ══════════════════════════════════════════════════════════════════════════
// Adam: "necesito poder crear los usuarios y claves de los aliados... vienen nuevos concesionarios,
// y también los que tenemos actuales". Desde Usuarios (pestaña Aliados) o desde Concesionarios
// (botón Portal) un administrador le crea a un aliado su usuario y su clave, escoge qué sedes ve,
// le pone una clave nueva si se le olvida y le quita o le devuelve el acceso.
//
// La cuenta la crea el servidor (POST /aliados, functions/lib/aliados.js) en Firebase de la 26, que
// es donde entra el portal (pagasi.io/aliados), con un correo interno usuario@aliados.pagasi.io: el
// aliado escribe solo su usuario. Por eso esto se maneja desde pagasi.io; en la 18 se avisa.

var ALIADOS_URL = 'https://pagasi-webhook-5ao0p23z.ue.gateway.dev/aliados';   // la puerta pública del servidor (API Gateway)
var ALIADOS_PORTAL = 'pagasi.io/aliados';

// Etiquetas con su propio estilo (las wa-pill solo existen dentro de Redes sociales)
function _alPill(txt, tono){ var c = tono === 'verde' ? ['#e6f7ee', '#0f7a3e'] : tono === 'rojo' ? ['#fdecec', '#c81e1e'] : ['var(--surf2)', 'var(--ink3)']; return '<span style="display:inline-block;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:800;background:' + c[0] + ';color:' + c[1] + '">' + txt + '</span>'; }
function _alEsc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// Las cuentas de los aliados viven en la 26: desde la 18 no se ven ni se crean
function _alEnLa26(){ return !(typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG && FIREBASE_CONFIG.projectId === 'pagasi-v2'); }
function _alAliados(){ return ((typeof _usersCache !== 'undefined' && _usersCache) || []).filter(function(u){ return u && u.rol === 'Aliado'; }); }
function _alConcs(){ return (S.concesionarios || []).filter(function(c){ return c && !c.eliminado; }).slice().sort(function(a, b){ return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'); }); }
function _alNombreConc(id){ var c = (S.concesionarios || []).find(function(x){ return x && x.id === id; }); return c ? c.nombre : id; }
// Un usuario sugerido a partir del nombre: "EMPIRE Bello Monte" → "ekbellomonte"
function aliadoUsuarioSugerido(nombre){
  return String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/^(empire|keeway)\b/, 'ek').replace(/[^a-z0-9]+/g, '').slice(0, 24);
}
// Una clave fácil de dictar: 4 letras y 4 números, sin las que se confunden (l, o, 0, 1)
function aliadoClaveNueva(){
  var L = 'abcdefghjkmnpqrstuvwxyz', N = '23456789', s = '', azar = function(n){
    if(typeof crypto !== 'undefined' && crypto.getRandomValues){ var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
    return Math.floor(Math.random() * n);
  };
  for(var i = 0; i < 4; i++) s += L[azar(L.length)];
  for(var j = 0; j < 4; j++) s += N[azar(N.length)];
  return s;
}
function _alPost(datos){
  if(typeof auth === 'undefined' || !auth || !auth.currentUser) return Promise.reject(new Error('Sin sesión: vuelve a entrar al sistema.'));
  return auth.currentUser.getIdToken().then(function(t){
    return fetch(ALIADOS_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify(datos) });
  }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if(!r.ok) throw new Error(j.error || ('El servidor respondió ' + r.status)); return j; }); });
}
function _alRecargar(){ if(typeof DB !== 'undefined' && DB.getUsuarios) return DB.getUsuarios().then(function(l){ _usersCache = l || []; if(S.page === 'users' && S.usersTab === 'aliados' && $('users-tab-content')) $('users-tab-content').innerHTML = _aliadosTabHTML(); }).catch(function(){}); return Promise.resolve(); }
function _alAvisoLa18(){
  setMicon('llave'); $('mtt').textContent = 'Accesos de aliados'; $('msb').textContent = 'Portal de aliados';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div style="font-size:13px;line-height:1.6">Los aliados entran al portal con la base de <b>PAGASI 26</b>, así que sus usuarios y claves se crean desde <b>pagasi.io</b>. Entra a pagasi.io → Usuarios → Aliados.</div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>';
  $('ov').style.display = 'flex';
}

// ── Crear (o, con uid, cambiar el nombre y las sedes de uno que ya existe) ──
function abrirAccesoAliado(sedes, uid){
  if(!_alEnLa26()){ _alAvisoLa18(); return; }
  var u = uid ? _alAliados().find(function(x){ return x.uid === uid; }) : null;
  sedes = (u ? (u.concesionarios || []) : (sedes || [])).map(String);
  var concs = _alConcs();
  // Quién ya tiene acceso a cada sede (para no duplicar sin querer)
  var dueno = {}; _alAliados().forEach(function(a){ if(u && a.uid === u.uid) return; (a.concesionarios || []).forEach(function(id){ (dueno[id] = dueno[id] || []).push(a.usuario || a.nombre || '?'); }); });
  var primera = sedes.length ? _alNombreConc(sedes[0]) : '';
  setMicon('llave');
  $('mtt').textContent = u ? 'Aliado: ' + (u.nombre || u.usuario) : 'Acceso al portal de aliados';
  $('msb').textContent = u ? 'Usuario ' + (u.usuario || '') + ' · nombre y sedes que ve' : 'Usuario y clave para ' + ALIADOS_PORTAL;
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div style="display:grid;gap:12px">'
    + '<div class="fg"><label>Nombre que verá en su portal</label><input class="fi" id="al_nombre" value="' + _alEsc(u ? (u.grupo || u.nombre || '') : primera) + '" placeholder="Ej.: Grupo EK, Motos Toro"></div>'
    + (u ? '' : '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      + '<div class="fg"><label>Usuario</label><input class="fi" id="al_usuario" value="' + _alEsc(aliadoUsuarioSugerido(primera)) + '" autocapitalize="off" spellcheck="false" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9._-]/g,\'\')"><div style="font-size:10.5px;color:var(--ink3);margin-top:4px">Sin espacios ni acentos. Es lo que escribe para entrar.</div></div>'
      + '<div class="fg"><label>Clave</label><div style="display:flex;gap:6px"><input class="fi" id="al_clave" value="' + aliadoClaveNueva() + '" autocapitalize="off" spellcheck="false" style="flex:1;font-family:var(--fd)"><button class="btn btn-g btn-sm" type="button" onclick="$(\'al_clave\').value=aliadoClaveNueva()">Otra</button></div><div style="font-size:10.5px;color:var(--ink3);margin-top:4px">Al menos 6 caracteres. La puedes cambiar.</div></div>'
      + '</div>')
    + '<div><div style="font-size:12.5px;font-weight:800;color:var(--ink2)">Concesionarios que ve</div><div style="font-size:10.5px;color:var(--ink3);margin:2px 0 6px">Marca todas las sedes del mismo dueño: en su portal cuentan como un solo aliado.</div>'
    + '<div style="display:grid;gap:5px;max-height:240px;overflow-y:auto;padding:2px">'
    + concs.map(function(c){
        var on = sedes.indexOf(c.id) > -1, otros = dueno[c.id];
        return '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;text-transform:none;letter-spacing:0;color:var(--ink);padding:6px 9px;cursor:pointer;background:var(--surf2);border-radius:7px;border:1px solid var(--rim)">'
          + '<input type="checkbox" class="al-sede" value="' + _alEsc(c.id) + '"' + (on ? ' checked' : '') + ' style="accent-color:var(--p1)">'
          + '<span style="flex:1"><b style="font-weight:700">' + _alEsc(c.nombre || c.id) + '</b>' + (c.ciudad ? ' <span style="color:var(--ink3);font-size:11px">· ' + _alEsc(c.ciudad) + '</span>' : '') + '</span>'
          + (otros ? _alPill('ya la ve: ' + _alEsc(otros.join(', ')), 'gris') : '')
          + '</label>';
      }).join('')
    + '</div></div></div>';
  S.saveFn = function(){ return u ? _alGuardarSedes(u) : _alCrear(); };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">' + (u ? 'Guardar' : 'Crear acceso') + '</button>';
  $('ov').style.display = 'flex';
}
function _alSedesMarcadas(){ return [].slice.call(document.querySelectorAll('#mbd .al-sede')).filter(function(e){ return e.checked; }).map(function(e){ return e.value; }); }
function _alCrear(){
  var nombre = String(($('al_nombre') || {}).value || '').trim(), usuario = String(($('al_usuario') || {}).value || '').trim().toLowerCase(), clave = String(($('al_clave') || {}).value || '');
  var sedes = _alSedesMarcadas();
  if(!/^[a-z0-9][a-z0-9._-]{1,29}$/.test(usuario)){ toast('El usuario debe tener de 2 a 30 letras o números, sin espacios ni acentos', 'error'); return false; }
  if(clave.length < 6){ toast('La clave debe tener al menos 6 caracteres', 'error'); return false; }
  if(!sedes.length){ toast('Marca al menos un concesionario', 'error'); return false; }
  return _alPost({ accion: 'crear', usuario: usuario, clave: clave, nombre: nombre || _alNombreConc(sedes[0]), grupo: sedes.length > 1 ? nombre : '', concesionarios: sedes })
    .then(function(){
      if(typeof logActividad === 'function') logActividad('aliado_creado', 'usuarios', usuario, { sedes: sedes.join(',') });
      _alRecargar();
      _alMostrarDatos(nombre || _alNombreConc(sedes[0]), usuario, clave, false);
    })
    .catch(function(e){ toast(e.message || 'No se pudo crear', 'error'); return false; });
}
function _alGuardarSedes(u){
  var nombre = String(($('al_nombre') || {}).value || '').trim(), sedes = _alSedesMarcadas();
  if(!sedes.length){ toast('Marca al menos un concesionario', 'error'); return false; }
  var datos = { nombre: nombre || u.nombre || u.usuario, concesionarios: sedes, grupo: sedes.length > 1 ? (nombre || '') : '' };
  return db.collection('usuarios').doc(u.uid).set(datos, { merge: true }).then(function(){
    if(typeof logActividad === 'function') logActividad('aliado_sedes', 'usuarios', u.uid, { sedes: sedes.join(',') });
    toast('Listo: ' + (datos.nombre) + ' ve ' + sedes.length + ' sede' + (sedes.length === 1 ? '' : 's'), 'success');
    closeM(); _alRecargar();
  }).catch(function(e){ toast('No se pudo guardar: ' + (e.message || e), 'error'); return false; });
}

// ── Lo que se le manda al aliado: usuario, clave y dónde entrar ──
function _alTextoAcceso(nombre, usuario, clave, nueva){
  return 'Hola' + (nombre ? ' ' + nombre : '') + ', ' + (nueva ? 'esta es tu nueva clave' : 'este es tu acceso') + ' al portal de aliados de Pagasi:\n'
    + 'Entra en: https://' + ALIADOS_PORTAL + '\nUsuario: ' + usuario + '\nClave: ' + clave + '\n'
    + 'Ahí ves tus motos financiadas, tu saldo, tu nivel y tu comisión del mes.';
}
function _alMostrarDatos(nombre, usuario, clave, nueva){
  var texto = _alTextoAcceso(nombre, usuario, clave, nueva);
  window._alUltimoTexto = texto;
  setMicon('llave'); $('mtt').textContent = nueva ? 'Clave nueva lista' : 'Acceso creado'; $('msb').textContent = nombre || usuario;
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div style="display:grid;gap:12px">'
    + '<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:14px 16px;display:grid;gap:8px;font-size:13.5px">'
    + '<div style="display:flex;justify-content:space-between;gap:10px"><span style="color:var(--ink3)">Entra en</span><b>' + ALIADOS_PORTAL + '</b></div>'
    + '<div style="display:flex;justify-content:space-between;gap:10px"><span style="color:var(--ink3)">Usuario</span><b style="font-family:var(--fd)">' + _alEsc(usuario) + '</b></div>'
    + '<div style="display:flex;justify-content:space-between;gap:10px"><span style="color:var(--ink3)">Clave</span><b style="font-family:var(--fd);font-size:16px;letter-spacing:.5px">' + _alEsc(clave) + '</b></div></div>'
    + '<div style="font-size:12px;color:var(--ink3);line-height:1.5">Mándaselo ahora: por seguridad la clave no se vuelve a mostrar. Si se le olvida, le pones una nueva desde Usuarios → Aliados.</div></div>';
  S.saveFn = null;
  $('mft').innerHTML = '<button class="btn btn-g" onclick="_alCopiar()">Copiar</button>'
    + '<a class="btn btn-g" style="text-decoration:none" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>'
    + '<button class="btn btn-p" onclick="closeM()">Listo</button>';
  $('ov').style.display = 'flex';
}
function _alCopiar(){
  var t = window._alUltimoTexto || '';
  var ok = function(){ toast('Copiado: pégalo en el chat del aliado', 'success'); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok).catch(function(){ toast('No se pudo copiar: selecciónalo a mano', 'error'); });
}

// ── Clave nueva y quitar / devolver el acceso ──
function aliadoNuevaClave(uid){
  var u = _alAliados().find(function(x){ return x.uid === uid; }); if(!u) return;
  setMicon('llave'); $('mtt').textContent = 'Clave nueva para ' + (u.nombre || u.usuario); $('msb').textContent = 'Usuario ' + (u.usuario || '');
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div class="fg"><label>Clave nueva</label><div style="display:flex;gap:6px"><input class="fi" id="al_clave" value="' + aliadoClaveNueva() + '" autocapitalize="off" spellcheck="false" style="flex:1;font-family:var(--fd)"><button class="btn btn-g btn-sm" type="button" onclick="$(\'al_clave\').value=aliadoClaveNueva()">Otra</button></div>'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:5px">La clave anterior deja de servir en cuanto la guardes.</div></div>';
  S.saveFn = function(){
    var clave = String(($('al_clave') || {}).value || '');
    if(clave.length < 6){ toast('La clave debe tener al menos 6 caracteres', 'error'); return false; }
    return _alPost({ accion: 'clave', uid: uid, clave: clave }).then(function(){
      if(typeof logActividad === 'function') logActividad('aliado_clave', 'usuarios', uid, {});
      _alMostrarDatos(u.grupo || u.nombre, u.usuario, clave, true);
    }).catch(function(e){ toast(e.message || 'No se pudo', 'error'); return false; });
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar clave nueva</button>';
  $('ov').style.display = 'flex';
}
function aliadoAcceso(uid, activo){
  var u = _alAliados().find(function(x){ return x.uid === uid; }); if(!u) return;
  _alPost({ accion: 'acceso', uid: uid, activo: !!activo }).then(function(){
    if(typeof logActividad === 'function') logActividad(activo ? 'aliado_acceso_devuelto' : 'aliado_acceso_quitado', 'usuarios', uid, {});
    toast(activo ? (u.usuario + ' puede volver a entrar') : (u.usuario + ' ya no puede entrar al portal'), 'success');
    _alRecargar();
  }).catch(function(e){ toast(e.message || 'No se pudo', 'error'); });
}

// ── Desde Concesionarios: el botón Portal de cada sede ──
function aliadoPortalDeSede(concId){
  if(!_alEnLa26()){ _alAvisoLa18(); return; }
  var abrir = function(){
    var ya = _alAliados().filter(function(a){ return (a.concesionarios || []).indexOf(concId) > -1; });
    if(!ya.length){ abrirAccesoAliado([concId]); return; }
    // Ya tiene acceso: se muestra quién y qué se le puede hacer
    setMicon('llave'); $('mtt').textContent = 'Portal de ' + _alNombreConc(concId); $('msb').textContent = 'Ya tiene acceso';
    $('modal-box').className = 'modal';
    $('mbd').innerHTML = ya.map(function(a){
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:var(--surf2);border:1px solid var(--rim);border-radius:9px;margin-bottom:8px">'
        + '<div><b>' + _alEsc(a.grupo || a.nombre || a.usuario) + '</b><div style="font-size:11.5px;color:var(--ink3)">Usuario <b style="font-family:var(--fd)">' + _alEsc(a.usuario || '') + '</b> · ' + (a.concesionarios || []).length + ' sede' + ((a.concesionarios || []).length === 1 ? '' : 's') + (a.suspendido ? ' · <span style="color:var(--red)">sin acceso</span>' : '') + '</div></div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-g btn-xs" onclick="aliadoNuevaClave(\'' + a.uid + '\')">Clave nueva</button><button class="btn btn-g btn-xs" onclick="abrirAccesoAliado(null,\'' + a.uid + '\')">Sedes</button></div></div>';
    }).join('');
    S.saveFn = null;
    $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button><button class="btn btn-p" onclick="abrirAccesoAliado([\'' + concId + '\'])">Otro acceso</button>';
    $('ov').style.display = 'flex';
  };
  // La lista de usuarios puede no estar cargada si no se ha pasado por Usuarios
  if(typeof DB !== 'undefined' && DB.getUsuarios) DB.getUsuarios().then(function(l){ _usersCache = l || []; abrir(); }).catch(abrir); else abrir();
}

// ── La pestaña Aliados de Usuarios ──
function _aliadosTabHTML(){
  if(!_alEnLa26()) return '<div class="card" style="padding:18px;font-size:13px;line-height:1.6">Los aliados entran al portal con la base de <b>PAGASI 26</b>: sus usuarios y claves se manejan desde <b>pagasi.io</b> → Usuarios → Aliados.</div>';
  var lista = _alAliados().slice().sort(function(a, b){ return String(a.grupo || a.nombre || '').localeCompare(String(b.grupo || b.nombre || ''), 'es'); });
  var conAcceso = {}; lista.forEach(function(a){ if(!a.suspendido) (a.concesionarios || []).forEach(function(id){ conAcceso[id] = 1; }); });
  var sin = _alConcs().filter(function(c){ return c.activo !== false && !conAcceso[c.id]; });
  return '<div class="card" style="padding:16px 18px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div><div class="ct">Aliados con acceso al portal</div><div class="cs">Entran en ' + ALIADOS_PORTAL + ' con su usuario y su clave. Ven solo sus sedes.</div></div>'
    + '<button class="btn btn-p btn-sm" onclick="abrirAccesoAliado([])">＋ Acceso de aliado</button></div>'
    + (lista.length ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th>Aliado</th><th>Usuario</th><th>Sedes</th><th>Estado</th><th></th></tr></thead><tbody>'
      + lista.map(function(a){
          return '<tr style="border-top:1px solid var(--rim)"><td style="padding:8px 6px"><b>' + _alEsc(a.grupo || a.nombre || '—') + '</b>' + (a.creadoEn ? '<div style="font-size:10.5px;color:var(--ink3)">Creado el ' + _alEsc(String(a.creadoEn).slice(0, 10)) + (a.creadoPor ? ' por ' + _alEsc(a.creadoPor) : '') + '</div>' : '') + '</td>'
            + '<td style="font-family:var(--fd)">' + _alEsc(a.usuario || a.email || '') + '</td>'
            + '<td style="font-size:12px">' + (a.concesionarios || []).map(function(id){ return _alEsc(_alNombreConc(id)); }).join(' · ') + '</td>'
            + '<td>' + (a.suspendido ? _alPill('Sin acceso', 'rojo') : _alPill('Activo', 'verde')) + '</td>'
            + '<td style="text-align:right;white-space:nowrap">' + (a.usuario ? '<button class="btn btn-g btn-xs" onclick="aliadoNuevaClave(\'' + a.uid + '\')">Clave nueva</button> ' : '')
            + '<button class="btn btn-g btn-xs" onclick="abrirAccesoAliado(null,\'' + a.uid + '\')">Sedes</button> '
            + (a.suspendido ? '<button class="btn btn-g btn-xs" onclick="aliadoAcceso(\'' + a.uid + '\',true)">Devolver acceso</button>' : '<button class="btn btn-g btn-xs" style="color:var(--red)" onclick="aliadoAcceso(\'' + a.uid + '\',false)">Quitar acceso</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<div class="empty" style="padding:20px">Todavía no hay aliados con acceso. Crea el primero con "＋ Acceso de aliado".</div>')
    + (sin.length ? '<div style="margin-top:14px;font-size:12px;color:var(--ink3);line-height:1.6"><b style="color:var(--ink2)">Concesionarios activos sin acceso (' + sin.length + '):</b> '
      + sin.map(function(c){ return '<a href="#" onclick="event.preventDefault();abrirAccesoAliado([\'' + c.id + '\'])">' + _alEsc(c.nombre || c.id) + '</a>'; }).join(' · ') + '</div>' : '')
    + '</div>';
}

if(typeof module !== 'undefined' && module.exports) module.exports = { aliadoUsuarioSugerido: aliadoUsuarioSugerido, aliadoClaveNueva: aliadoClaveNueva };
