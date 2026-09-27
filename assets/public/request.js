/* Solicitud corta (27-sep-2026, Adam: "hay que alargar el formato de la pagina de
   solicitar"). Una sola pantalla con seis datos, errores al lado del campo, borrador
   en el navegador, pantalla de exito util (numero WEB- y WhatsApp listo) y una segunda
   pantalla opcional que vive detras de una llave hasta que las Reglas la permitan.
   No se calcula ningun score aqui: eso lo hace el sistema al aprobar. */
const CATALOG = PagasiCatalog.motos.map(m => ({ id:m.id, name:m.modelo, sede:m.sedeName, cc:m.cc, type:m.type, price:m.precio }));
const fM=document.getElementById('fM');
PagasiSite.populateModels(fM);
const requestedMoto=new URLSearchParams(location.search).get('moto');
if(requestedMoto && PagasiCatalog.get(requestedMoto)) fM.value=requestedMoto;

// Firebase de PAGASI 26
var FIREBASE_CONFIG = {
  // Firebase de PAGASI 26 (proyecto pagasi26-65ced). Esta llave va dentro de la
  // pagina y la ve cualquiera: no es un secreto, lo que protege la base son las
  // Reglas. La guarda de mas abajo impide abrir el sistema si queda sin poner.
  apiKey: 'AIzaSyD6IznQjzF7Tdq7UJMXT4rSBdbCNpsmij4',
  authDomain: 'pagasi26-65ced.firebaseapp.com',
  projectId: 'pagasi26-65ced',
  storageBucket: 'pagasi26-65ced.firebasestorage.app',
  messagingSenderId: '415041001199',
  appId: '1:415041001199:web:9844b2b6835fea0e84ad1a'
};

// Sin llave de Firebase la solicitud no se puede guardar en ningun lado: se dice
// y no se deja enviar, en vez de contestarle al cliente que todo salio bien.
var _SIN_LLAVE = String((FIREBASE_CONFIG||{}).apiKey||'').indexOf('FALTA_LA_LLAVE') === 0;
if(_SIN_LLAVE && typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded', function(){
    var f = document.querySelector('form'); if(f) f.style.display = 'none';
    var d = document.createElement('div');
    d.style.cssText = 'font-family:system-ui,sans-serif;max-width:520px;margin:12vh auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;text-align:center';
    d.innerHTML = '<div style="font-size:17px;font-weight:800;margin-bottom:8px">Formulario fuera de servicio</div>'
      + '<div style="font-size:14px;color:#374151">Todavía no está conectado a la base de datos. Escríbenos y te atendemos por WhatsApp.</div>';
    document.body.appendChild(d);
  });
}
// ── La compania que ya no vende tampoco recibe solicitudes por la web ──────
// 23-sep-2026: PAGASI 18 se quedo cobrando los creditos que ya tiene. El formulario
// publico sigue vivo en su direccion, y una solicitud que entre por ahi aterriza en
// la compania equivocada — nadie la ve hasta que el cliente llama preguntando.
// La decision sale de la BASE a la que apunta esta pagina, no del dominio.
var SOLICITUDES_CERRADAS = (FIREBASE_CONFIG.projectId === 'pagasi-v2');
var PAGASI_QUE_VENDE = 'https://pagasi.io/solicitar.html';
function _solicitudesCerradasAviso(){
  if(!SOLICITUDES_CERRADAS) return;
  try{
    var caja = document.querySelector('form') || document.querySelector('main') || document.body;
    var d = document.createElement('div');
    d.setAttribute('style','background:#FFF7E6;border:1px solid #E8980A;border-radius:14px;padding:18px 20px;margin:0 0 18px;'
      + "font-family:'Manrope',system-ui,sans-serif;color:#1f2937;line-height:1.6");
    var t = document.createElement('div');
    t.setAttribute('style','font-weight:800;font-size:16px;margin-bottom:6px');
    t.textContent = 'Las solicitudes se hacen en otra dirección';
    var p1 = document.createElement('div');
    p1.setAttribute('style','font-size:14px');
    p1.textContent = 'Esta página ya no recibe solicitudes nuevas. Para pedir tu crédito, entra aquí:';
    var a = document.createElement('a');
    a.href = PAGASI_QUE_VENDE;
    a.textContent = 'Solicitar mi moto en pagasi.io';
    a.setAttribute('style','display:inline-block;margin-top:12px;background:#065cff;color:#fff;text-decoration:none;'
      + 'font-weight:800;font-size:14px;padding:11px 20px;border-radius:12px');
    d.appendChild(t); d.appendChild(p1); d.appendChild(a);
    caja.parentNode.insertBefore(d, caja);
    // Y el formulario no se puede enviar: se deshabilita entero
    if(caja.tagName === 'FORM'){
      caja.setAttribute('style', (caja.getAttribute('style')||'') + ';opacity:.45;pointer-events:none');
      Array.prototype.forEach.call(caja.querySelectorAll('input,select,textarea,button'), function(x){ x.disabled = true; });
    }
  }catch(e){ console.warn('aviso solicitudes:', e); }
}

var fbApp=null, fbAuth=null, db=null, FIREBASE_READY=false;
function initFirebaseSolicitar(){
  try{
    if(typeof firebase==='undefined'){ console.error('Firebase SDK no cargó'); FIREBASE_READY=false; return false; }
    var cfg=FIREBASE_CONFIG;
    fbApp  = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(cfg);
    if(typeof firebase.auth!=='function' || typeof firebase.firestore!=='function'){ FIREBASE_READY=false; return false; }
    fbAuth = firebase.auth(fbApp);
    db     = firebase.firestore(fbApp);
    FIREBASE_READY = true;
    return true;
  }catch(e){
    console.error('Firebase init failed:',e);
    fbApp=null; fbAuth=null; db=null; FIREBASE_READY=false;
    return false;
  }
}
initFirebaseSolicitar();
window.addEventListener('load', function(){ if(!FIREBASE_READY){ initFirebaseSolicitar(); } });
window.addEventListener('load', _solicitudesCerradasAviso);
if(document.readyState !== 'loading') _solicitudesCerradasAviso();
else document.addEventListener('DOMContentLoaded', _solicitudesCerradasAviso);

// ── La segunda pantalla ("Adelanta tu evaluación") ────────────────────────
// Hoy las Reglas dejan que una sesion anonima CREE un lead y nada mas. Para que el
// mismo cliente complete su ficha despues de enviarla hace falta la regla
// esLeadWebAmpliando (firestore.rules) y guardar web_uid al crear. Mientras esa regla
// no este publicada, esta llave queda en false: la pantalla existe pero no se ofrece,
// y el lead se crea sin web_uid (con la regla vieja, un campo de mas lo rechazaria).
var ADELANTAR_EVALUACION = false;
var WHATSAPP_PAGASI = '584242177798';

// ── Normalizacion: lo que escribe el cliente, como lo guarda el sistema ────
// "v 12.345.678" → V-12345678. Solo V o E (las de persona); sin letra se asume V.
function normCedula(s){
  var t = String(s||'').toUpperCase().replace(/[^0-9VE]/g,'');
  var letra = /^[VE]/.test(t) ? t.charAt(0) : 'V';
  var d = t.replace(/[^0-9]/g,'').replace(/^0+/,'');
  if(d.length < 6 || d.length > 9) return null;
  return { valor: letra+'-'+d, digitos: d };
}
// "+58 414 123 45 67", "4141234567", "0414-1234567" → 0414-1234567. Solo celulares:
// la respuesta va por WhatsApp.
function normTel(s){
  var d = String(s||'').replace(/[^0-9]/g,'');
  if(d.indexOf('58') === 0 && d.length === 12) d = '0' + d.slice(2);
  if(d.length === 10 && d.charAt(0) !== '0') d = '0' + d;
  if(!/^0(412|414|416|424|426)[0-9]{7}$/.test(d)) return null;
  return { valor: d.slice(0,4)+'-'+d.slice(4), wa: '58'+d.slice(1) };
}
function _nombreOk(v){ var p = String(v||'').trim().split(/\s+/).filter(Boolean); return p.length >= 2 && String(v).trim().length >= 5 && !/[0-9]/.test(v); }

// Sin < > " ' ` \ y con & como "y": las Reglas de Firestore rechazan un lead con esos
// caracteres (con ellos se puede meter codigo en el panel; punto 1, 19-sep).
function _v(id){ var e=document.getElementById(id); return e ? String(e.value||'').replace(/&/g,' y ').replace(/[<>"'`\\]/g,'').replace(/\s+/g,' ').trim() : ''; }
function _n(id){ var e=document.getElementById(id); return e ? (parseFloat(e.value)||0) : 0; }
function _i(id){ var e=document.getElementById(id); return e ? (parseInt(e.value,10)||0) : 0; }
function _el(id){ return document.getElementById(id); }

// ── Validacion en linea ───────────────────────────────────────────────────
var CAMPOS1 = [
  { id:'wz_nom',       ok:function(v){ return _nombreOk(v); },   msg:'Escribe tu nombre y tu apellido.' },
  { id:'wz_ci',        ok:function(v){ return !!normCedula(v); }, msg:'Cédula de 6 a 9 números, por ejemplo V-12345678.' },
  { id:'wz_tel',       ok:function(v){ return !!normTel(v); },    msg:'Un celular venezolano: 0412, 0414, 0416, 0424 o 0426.' },
  { id:'wz_emp',       ok:function(v){ return !!v; },            msg:'Cuéntanos a qué te dedicas.' },
  { id:'wz_ing_rango', ok:function(v){ return !!v; },            msg:'Elige un rango aproximado. No hace falta el número exacto.' }
];
function marcarCampo(id, msg){
  var el = _el(id); if(!el) return;
  var fg = el.closest ? el.closest('.fg') : null, err = _el('err_'+id);
  if(msg){ el.classList.add('is-bad'); if(fg) fg.classList.add('has-err'); el.setAttribute('aria-invalid','true'); }
  else { el.classList.remove('is-bad'); if(fg) fg.classList.remove('has-err'); el.removeAttribute('aria-invalid'); }
  if(err) err.textContent = msg || '';
}
// Devuelve el primer campo con problema (o null). Con mostrar=true pinta los errores.
function validarPaso1(mostrar){
  var primero = null;
  CAMPOS1.forEach(function(f){
    var el = _el(f.id), bien = !!el && f.ok(String(el.value||''));
    if(mostrar) marcarCampo(f.id, bien ? '' : f.msg);
    if(!bien && !primero) primero = el;
  });
  return primero;
}
function validarUno(id){
  var f = CAMPOS1.filter(function(x){ return x.id===id; })[0], el = _el(id);
  if(!f || !el) return true;
  var bien = f.ok(String(el.value||''));
  marcarCampo(id, bien ? '' : f.msg);
  return bien;
}
function mostrarAviso(html){ var a = _el('fAviso'); if(!a) return; a.innerHTML = html || ''; a.classList.toggle('on', !!html); }

// ── Borrador en el navegador: si cierra y vuelve, no empieza de cero ─────
var BORRADOR_KEY = 'pagasi_solicitud_borrador_v1', BORRADOR_DIAS = 3;
var CAMPOS_BORRADOR = ['wz_nom','wz_ci','wz_tel','wz_emp','wz_ing_rango','wz_ciudad','fM'];
function guardarBorrador(){
  try{
    var o = { t: Date.now() };
    CAMPOS_BORRADOR.forEach(function(id){ var e = _el(id); if(e && e.value) o[id] = String(e.value).slice(0,120); });
    if(Object.keys(o).length > 1) localStorage.setItem(BORRADOR_KEY, JSON.stringify(o)); else localStorage.removeItem(BORRADOR_KEY);
  }catch(e){}
}
function cargarBorrador(){
  try{
    var o = JSON.parse(localStorage.getItem(BORRADOR_KEY)||'null'); if(!o || !o.t) return false;
    if(Date.now() - o.t > BORRADOR_DIAS*86400000){ localStorage.removeItem(BORRADOR_KEY); return false; }
    var puso = false;
    CAMPOS_BORRADOR.forEach(function(id){ var e = _el(id); if(e && o[id] && !e.value){ e.value = o[id]; puso = true; } });
    if(puso && _el('fM') && typeof _pintarPlan==='function') _pintarPlan();
    return puso;
  }catch(e){ return false; }
}
function borrarBorrador(){ try{ localStorage.removeItem(BORRADOR_KEY); }catch(e){} }

// ── El plan de la moto elegida, debajo del selector ───────────────────────
function _pintarPlan(){
  var caja = _el('fPlan'); if(!caja) return;
  var m = PagasiCatalog.get(fM.value), p = m && PagasiCatalog.plan(m.id);
  if(!m || !p){ caja.classList.remove('on'); caja.textContent = ''; return; }
  caja.innerHTML = '<b>'+PagasiCatalog.money(p.quincenal)+'</b> la quincena · inicial '+PagasiCatalog.money(p.inicial)+' · 12 meses. <span style="color:#64718b">Referencial, lo confirma tu asesor.</span>';
  caja.classList.add('on');
}

// ── Lo que se guarda ──────────────────────────────────────────────────────
// Solo campos que las Reglas admiten (esLeadWeb). Sin score: la web no evalua a nadie;
// el score lo calcula el sistema con la ficha completa al aprobar.
function buildClientePayload(){
  var ci = normCedula(_v('wz_ci')), tel = normTel(_v('wz_tel'));
  var motoId = fM ? (parseInt(fM.value,10) || null) : null;
  var motoData = (motoId != null && !isNaN(motoId)) ? CATALOG.find(function(m){ return m.id===motoId; }) : null;
  var rango = _el('wz_ing_rango');
  var rangoTxt = (rango && rango.selectedIndex > 0) ? rango.options[rango.selectedIndex].text : '';
  var now = new Date().toISOString();
  var notas = ['Solicitud web']
    .concat(rangoTxt ? ['Ingreso declarado: '+rangoTxt] : [])
    .concat(motoData ? ['Interesado en '+motoData.name+' ($'+motoData.price.toLocaleString('en-US')+' · '+motoData.sede+')'] : ['Sin moto específica, pide asesoría'])
    .join(' · ');
  return {
    // El numero de la ficha sale de la CEDULA: la base misma impide que la misma
    // persona quede registrada dos veces (punto 21, 21-sep-2026).
    id: 'WEB-' + (ci ? ci.digitos : String(Date.now())),
    nombre: _v('wz_nom'),
    cedula: ci ? ci.valor : _v('wz_ci'),
    tel: tel ? tel.valor : _v('wz_tel'),
    wa: tel ? tel.valor : _v('wz_tel'),
    ciudad: _v('wz_ciudad'),
    trabajo: _v('wz_emp'),
    ingreso: _n('wz_ing_rango'),          // punto medio del rango, para las pantallas que suman
    notas: notas,
    moto_interes_id: motoData ? motoData.id : null,
    moto_interes_modelo: motoData ? motoData.name : '',
    moto_interes_precio: motoData ? motoData.price : 0,
    moto_interes_sede: motoData ? motoData.sede : '',
    estado: 'lead',
    origen: 'web',
    creado: now,
    editadoEn: now,
    editadoPor: 'Solicitud web'
  };
}
// La segunda pantalla: solo lo que el cliente respondio, nada vacio
function buildExtraPayload(){
  var o = {}, texto = function(k, id){ var v = _v(id); if(v) o[k] = v; };
  texto('antiguedad','wz_ant'); texto('empresa','wz_empresa'); texto('vivienda','wz_viv');
  texto('historial','wz_hist_g'); texto('deudas','wz_deuda_g'); texto('banco_estado','wz_banco');
  texto('cashea','wz_cashea'); texto('conocio','wz_conocio'); texto('fiador','wz_fiador');
  if(_v('wz_dep_g')) o.dependientes = _i('wz_dep_g');
  if(o.cashea === 'si'){ texto('cashea_nivel','wz_cashea_nivel'); texto('cashea_pago','wz_cashea_pago'); }
  if(o.fiador === 'si'){ texto('fiador_nom','wz_fiador_nom'); texto('fiador_rel','wz_fiador_rel'); }
  var r1t = normTel(_v('wz_r1t'));
  if(_v('wz_r1n')) o.ref1 = { nom:_v('wz_r1n'), ci:'', tel:(r1t ? r1t.valor : _v('wz_r1t')), rel:'', obs:'' };
  o.editadoEn = new Date().toISOString();
  o.web_ampliado = o.editadoEn;   // una sola vez: la regla no deja una segunda
  return o;
}

// ── Pantallas ─────────────────────────────────────────────────────────────
var LEAD = null;
function _pantalla(id){
  ['fs1','fs2','fOK','fOK2'].forEach(function(k){ var e = _el(k); if(e) e.classList.toggle('on', k===id); });
  var card = _el('formSolicitud');
  if(card && card.scrollIntoView){ try{ card.scrollIntoView({ block:'start', behavior:'smooth' }); }catch(e){ card.scrollIntoView(); } }
  var e = _el(id); if(e){ e.setAttribute('tabindex','-1'); try{ e.focus({ preventScroll:true }); }catch(_e){} }
}
function _waHref(texto){ return 'https://wa.me/'+WHATSAPP_PAGASI+'?text='+encodeURIComponent(texto); }
function mostrarExito(p, duplicada){
  var nombre = String(p.nombre||'').trim().split(/\s+/)[0] || '';
  var moto = p.moto_interes_modelo || '';
  if(_el('okNombre')) _el('okNombre').textContent = nombre || 'ya está';
  if(_el('okId')) _el('okId').textContent = p.id;
  if(_el('okTitulo')) _el('okTitulo').innerHTML = duplicada ? 'Ya te tenemos, <span id="okNombre"></span>.' : '¡Listo, <span id="okNombre"></span>!';
  if(_el('okNombre')) _el('okNombre').textContent = nombre || (duplicada ? 'gracias' : 'ya está');
  if(_el('okText')) _el('okText').innerHTML = duplicada
    ? 'Ya hay una solicitud con esta cédula (<span class="fok-id">'+p.id+'</span>). Un asesor te escribe; si prefieres, adelántate por WhatsApp.'
    : 'Tu solicitud es la <span class="fok-id">'+p.id+'</span>. Guárdala por si nos escribes.';
  var msg = 'Hola, soy '+(p.nombre||'')+'. Acabo de enviar mi solicitud '+p.id+' por pagasi.io'+(moto ? ' y me interesa la '+moto : '')+'.';
  ['okWA','okWA2'].forEach(function(id){ var a = _el(id); if(a) a.href = _waHref(msg); });
  var extra = _el('okExtra'); if(extra) extra.hidden = !(ADELANTAR_EVALUACION && !duplicada && LEAD);
  _pantalla('fOK');
}

async function submitF(ev){
  if(ev && ev.preventDefault) ev.preventDefault();
  if(window.__submittingSolicitud) return false;
  mostrarAviso('');
  var malo = validarPaso1(true);
  if(malo){ try{ malo.focus(); malo.scrollIntoView({ block:'center', behavior:'smooth' }); }catch(e){} return false; }
  window.__submittingSolicitud = true;
  var btn = _el('btnGuardarSolicitud'), fs1 = _el('fs1');
  if(btn){ btn.disabled = true; btn.textContent = 'Enviando…'; }
  if(fs1) fs1.classList.add('fsaving');
  var payload = null;
  try{
    if((!FIREBASE_READY||!fbAuth||!db) && !initFirebaseSolicitar()) throw new Error('Firebase no disponible');
    if(!fbAuth.currentUser) await fbAuth.signInAnonymously();
    payload = buildClientePayload();
    if(ADELANTAR_EVALUACION && fbAuth.currentUser) payload.web_uid = fbAuth.currentUser.uid;
    // El formulario público SÓLO puede crear un lead nuevo. Las reglas de Firestore no
    // dejan que una sesión anónima LEA ni EDITE clientes existentes, así que no se
    // buscan duplicados desde aquí: la base rechaza la segunda con la misma cédula.
    await db.collection('clientes').doc(String(payload.id)).set(payload);
    LEAD = { id: payload.id, nombre: payload.nombre, moto: payload.moto_interes_modelo };
    // SEGURIDAD: la sesión anónima se cierra en cuanto no hace falta, para que no
    // quede activa en el navegador. Con la segunda pantalla, se cierra al terminarla.
    if(!ADELANTAR_EVALUACION){ try{ await fbAuth.signOut(); }catch(_e){} }
    borrarBorrador();
    mostrarExito(payload, false);
  }catch(err){
    console.error('submitF:', err);
    // La base rechaza por dos motivos: la ficha ya existe (la misma persona mandando otra
    // vez) o algun dato no paso la validacion. No se distingue desde aqui.
    var rechazo = err && (err.code==='permission-denied' || /permission|insufficient/i.test(String(err.message||'')));
    if(rechazo && payload){
      try{ await fbAuth.signOut(); }catch(_e){}
      borrarBorrador();
      mostrarExito(payload, true);
    } else {
      mostrarAviso('No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo otra vez, o <a href="'+_waHref('Hola, intenté enviar mi solicitud por pagasi.io y no me dejó.')+'" target="_blank" rel="noopener">escríbenos por WhatsApp</a>.');
    }
  }finally{
    window.__submittingSolicitud = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Enviar solicitud'; }
    if(fs1) fs1.classList.remove('fsaving');
  }
  return false;
}

async function guardarExtra(){
  if(!LEAD || window.__submittingSolicitud) return;
  window.__submittingSolicitud = true;
  var btn = _el('btnGuardarExtra'), fs2 = _el('fs2');
  if(btn){ btn.disabled = true; btn.textContent = 'Guardando…'; }
  if(fs2) fs2.classList.add('fsaving');
  try{
    if(!db || !fbAuth || !fbAuth.currentUser) throw new Error('Sesión cerrada');
    await db.collection('clientes').doc(String(LEAD.id)).update(buildExtraPayload());
    try{ await fbAuth.signOut(); }catch(_e){}
    _pantalla('fOK2');
  }catch(err){
    console.error('guardarExtra:', err);
    mostrarAviso('No se pudo guardar esta parte, pero tu solicitud ya está enviada. Puedes contarnos el resto por WhatsApp.');
    var av = _el('fAviso'); if(av && fs2) fs2.insertBefore(av, fs2.firstChild);
  }finally{
    window.__submittingSolicitud = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Guardar y terminar'; }
    if(fs2) fs2.classList.remove('fsaving');
  }
}
async function omitirExtra(){
  try{ if(fbAuth && fbAuth.currentUser) await fbAuth.signOut(); }catch(_e){}
  var extra = _el('okExtra'); if(extra) extra.hidden = true;
  _pantalla('fOK');
}

(function(){
  function arrancar(){
    var form = _el('formSolicitud');
    if(form) form.addEventListener('submit', submitF);
    CAMPOS1.forEach(function(f){
      var el = _el(f.id); if(!el) return;
      el.addEventListener('blur', function(){ if(String(el.value||'').trim()) validarUno(f.id); });
      el.addEventListener('input', function(){ if(el.classList.contains('is-bad')) validarUno(f.id); });
      el.addEventListener('change', function(){ validarUno(f.id); });
    });
    // Al salir de cedula y telefono se dejan escritos como los guarda el sistema
    var ci = _el('wz_ci'); if(ci) ci.addEventListener('blur', function(){ var n = normCedula(ci.value); if(n) ci.value = n.valor; });
    var tel = _el('wz_tel'); if(tel) tel.addEventListener('blur', function(){ var n = normTel(tel.value); if(n) tel.value = n.valor; });
    CAMPOS_BORRADOR.forEach(function(id){ var e = _el(id); if(e){ e.addEventListener('input', guardarBorrador); e.addEventListener('change', guardarBorrador); } });
    if(fM){ fM.addEventListener('change', _pintarPlan); }
    cargarBorrador();
    _pintarPlan();
    // Segunda pantalla
    var b = _el('btnAdelantar'); if(b) b.addEventListener('click', function(){ mostrarAviso(''); _pantalla('fs2'); });
    var o = _el('btnOmitir'); if(o) o.addEventListener('click', omitirExtra);
    var g = _el('btnGuardarExtra'); if(g) g.addEventListener('click', guardarExtra);
    var ca = _el('wz_cashea'); if(ca) ca.addEventListener('change', function(){ var w = _el('casheaWrap'); if(w) w.hidden = ca.value !== 'si'; });
    var fi = _el('wz_fiador'); if(fi) fi.addEventListener('change', function(){ var w = _el('fiadorWrap'); if(w) w.hidden = fi.value !== 'si'; });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
