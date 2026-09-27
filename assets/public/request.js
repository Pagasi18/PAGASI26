/* Solicitud por partes (27-sep-2026, Adam: "quitarle trabajo al empleado").
   La parte 1 son los seis datos de siempre y CREA el lead WEB-<cedula>, asi nadie se
   pierde aunque se vaya ahi mismo. Despues se ofrece seguir: partes 2 a 9, una por
   pantalla, todo opcional, y cada "Siguiente" guarda en la ficha SOLO lo que contesto.
   Lo que llene el cliente le aparece ya escrito al empleado en "Nueva solicitud".
   No se piden fotos ni documentos, ni cuenta bancaria, ni la pregunta del terremoto
   ni la de cargo publico (decisiones de Adam del 27-sep). No se calcula ningun score:
   eso lo hace el sistema al aprobar. Las Reglas (firestore.rules, esLeadWeb y
   esLeadWebEditando) aceptan exactamente estos campos y valores. */
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

// ── Firebase: una app PROPIA para la solicitud ─────────────────────────────
// 27-sep-2026: la pagina usaba la app [DEFAULT], la misma de admin.html y micuenta.html,
// y en el mismo dominio eso es la MISMA sesion guardada. Un empleado con el panel abierto
// creaba el lead como staff (sin lista blanca) y el signOut del formulario lo sacaba del
// panel; al reves, abrir el panel mataba la sesion anonima del formulario a medias. Con
// su propio nombre ('solicitud') la sesion se guarda aparte y nadie pisa a nadie.
var APP_SOLICITUD = 'solicitud';
var fbApp=null, fbAuth=null, db=null, FIREBASE_READY=false;
function initFirebaseSolicitar(){
  try{
    if(typeof firebase==='undefined'){ console.error('Firebase SDK no cargó'); FIREBASE_READY=false; return false; }
    try{ fbApp = firebase.app(APP_SOLICITUD); }catch(_e){ fbApp = firebase.initializeApp(FIREBASE_CONFIG, APP_SOLICITUD); }
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
function _FV(){ return firebase.firestore.FieldValue; }

var WHATSAPP_PAGASI = '584242177798';
var TOTAL_PARTES = 9;
var VENTANA_DIAS = 7;   // lo mismo que dejan las Reglas para completar desde web_ts

// ── Los valores que acepta el sistema ────────────────────────────────────
// Son los codigos del asistente "Nueva solicitud" (logic/creditos.js) y de la ficha del
// cliente: lo que llena el cliente cae tal cual en el asistente del empleado. Las mismas
// listas estan en firestore.rules (esLeadWeb / esLeadWebEditando).
var TRABAJOS = ['formal','publico','delivery','independiente','comerciante','remesas','informal'];
var RANGOS_INGRESO = { '100':'Menos de $150', '225':'$150 a $300', '400':'$300 a $500', '650':'$500 a $800', '1000':'Más de $800' };
var ESTADOS_VE = ['Caracas (D.C.)','Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes',
  'Delta Amacuro','Falcón','Guárico','La Guaira','Lara','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa',
  'Sucre','Táchira','Trujillo','Yaracuy','Zulia'];
var OPC = {
  uso_moto:['personal','delivery','negocio'],
  moto_previa:['no','pagada','tiene','perdida'],
  antiguedad:['1','2','3','5'],
  dia_cobro:['quincenal','semanal','diario','mensual','variable'],
  si_no:['si','no'],
  dependientes:['0','1','2','3'],
  ahorro:['no','usd','bs'],                 // el asistente usa no/usd/bs, no si/no
  inicial_rango:['nada','<200','200-400','400-700','700+'],
  historial:['ninguno','bueno','mora_leve','malo'],
  deudas:['no','menores','graves'],
  banco_estado:['activa','poca','no'],
  cashea_nivel:['1','2','3','4','5','6'],
  cashea_estado:['al_dia','mora_leve','mora_grave','completado'],
  tiempo_dir:['1','2','3','4'],
  vivienda:['propia','alquilada','familiar','otro'],
  rel_ref:['Familiar directo','Amigo/a','Colega','Vecino/a'],
  fiador_rel:['familiar','conyuge','amigo','colega'],
  conocio:['referido','redes','vitrina','google','anterior','otro']
};
// Lo que se hace en una semana, un dia o una quincena, llevado al mes
var FACTOR_COBRO = { semanal:4.3, diario:26, quincenal:2, mensual:1, variable:1 };
var UNIDAD_COBRO = { semanal:'en una semana normal', diario:'en un día normal', quincenal:'en una quincena', mensual:'en un mes', variable:'en un mes normal' };

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
// Referencias y fiador: cualquier telefono venezolano de 11 numeros (tambien fijos)
function normTelLibre(s){
  var d = String(s||'').replace(/[^0-9]/g,'');
  if(d.indexOf('58') === 0 && d.length === 12) d = '0' + d.slice(2);
  if(d.length === 10 && d.charAt(0) !== '0') d = '0' + d;
  if(!/^0[0-9]{10}$/.test(d)) return '';
  return d.slice(0,4)+'-'+d.slice(4);
}
function _nombreOk(v){ var p = String(v||'').trim().split(/\s+/).filter(Boolean); return p.length >= 2 && String(v).trim().length >= 5 && !/[0-9]/.test(v); }

// Sin < > " ' ` \ y con & como "y": las Reglas de Firestore rechazan un lead con esos
// caracteres (con ellos se puede meter codigo en el panel; punto 1, 19-sep).
function _limpia(s){ return String(s==null?'':s).replace(/&/g,' y ').replace(/[<>"'`\\]/g,'').replace(/\s+/g,' ').trim(); }
function _v(id){ var e=document.getElementById(id); return e ? _limpia(e.value) : ''; }
// Los codigos se leen tal cual ('<200' lleva un <) y solo valen si estan en su lista
function _raw(id){ var e=document.getElementById(id); return e ? String(e.value==null?'':e.value).trim() : ''; }
function _n(id){ var e=document.getElementById(id); return e ? (parseFloat(e.value)||0) : 0; }
function _el(id){ return document.getElementById(id); }
// Un monto como lo escribe la gente: "80", "$ 80", "1.200", "45,5". null = vacio, NaN = no se entiende
function _monto(id){
  var s = _raw(id).replace(/[$\s]/g,'');
  if(!s) return null;
  if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g,'').replace(',', '.');
  else s = s.replace(',', '.');
  if(!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return parseFloat(s);
}

// ── Validacion en linea (parte 1) ─────────────────────────────────────────
var CAMPOS1 = [
  { id:'wz_nom',       ok:function(v){ return _nombreOk(v); },   msg:'Escribe tu nombre y tu apellido.' },
  { id:'wz_ci',        ok:function(v){ return !!normCedula(v); }, msg:'Cédula de 6 a 9 números, por ejemplo V-12345678.' },
  { id:'wz_tel',       ok:function(v){ return !!normTel(v); },    msg:'Un celular venezolano: 0412, 0414, 0416, 0424 o 0426.' },
  { id:'wz_emp',       ok:function(v){ return TRABAJOS.indexOf(v) > -1; }, msg:'Cuéntanos a qué te dedicas.' },
  { id:'wz_ing_rango', ok:function(v){ return !!RANGOS_INGRESO[v]; },     msg:'Elige un rango aproximado. No hace falta el número exacto.' },
  { id:'wz_estado',    ok:function(v){ return ESTADOS_VE.indexOf(v) > -1; }, msg:'Elige el estado donde vives.' }
];
function marcarCampo(id, msg){
  var el = _el(id); if(!el) return;
  var fg = el.closest ? el.closest('.fg, .fq') : null, err = _el('err_'+id);
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
function avisoWiz(texto, suave){
  var a = _el('wzAviso'); if(!a) return;
  a.textContent = texto || '';
  a.classList.toggle('on', !!texto); a.classList.toggle('suave', !!(texto && suave));
}
function _waHref(texto){ return 'https://wa.me/'+WHATSAPP_PAGASI+'?text='+encodeURIComponent(texto); }

// ── El plan de la moto elegida, debajo del selector ───────────────────────
function _pintarPlan(){
  var caja = _el('fPlan'); if(!caja) return;
  var m = PagasiCatalog.get(fM.value), p = m && PagasiCatalog.plan(m.id);
  if(!m || !p){ caja.classList.remove('on'); caja.textContent = ''; return; }
  caja.innerHTML = '<b>'+PagasiCatalog.money(p.quincenal)+'</b> la quincena · inicial '+PagasiCatalog.money(p.inicial)+' · 12 meses. <span style="color:#64718b">Referencial, lo confirma tu asesor.</span>';
  caja.classList.add('on');
}

// ── Parte 1: lo que CREA el lead ──────────────────────────────────────────
// Solo lo que admite esLeadWeb. Ya no van notas (el rango viaja en ingreso_rango),
// score, f1..f5, impresion, documentos ni conocio: eso lo escribe el equipo.
function buildClientePayload(uid){
  var ci = normCedula(_v('wz_ci')), tel = normTel(_v('wz_tel'));
  var motoId = fM ? (parseInt(fM.value,10) || null) : null;
  var motoData = (motoId != null && !isNaN(motoId)) ? CATALOG.find(function(m){ return m.id===motoId; }) : null;
  var rango = _raw('wz_ing_rango'), estado = _raw('wz_estado'), trabajo = _raw('wz_emp');
  var now = new Date().toISOString();
  var p = {
    // El numero de la ficha sale de la CEDULA: la base misma impide que la misma
    // persona quede registrada dos veces (punto 21, 21-sep-2026).
    id: 'WEB-' + (ci ? ci.digitos : ''),
    nombre: _v('wz_nom'),
    cedula: ci ? ci.valor : _v('wz_ci'),
    tel: tel ? tel.valor : _v('wz_tel'),
    wa: tel ? tel.valor : _v('wz_tel'),
    trabajo: trabajo,
    ingreso: RANGOS_INGRESO[rango] ? parseInt(rango,10) : 0,   // punto medio del rango, para las pantallas que suman
    ingreso_rango: RANGOS_INGRESO[rango] || '',                 // y el rango, para que el panel sepa que no es la cifra exacta
    moto_interes_id: motoData ? motoData.id : null,
    moto_interes_modelo: motoData ? motoData.name : '',
    moto_interes_precio: motoData ? motoData.price : 0,
    moto_interes_sede: motoData ? motoData.sede : '',
    estado: 'lead',
    origen: 'web',
    creado: now,
    editadoEn: now,
    editadoPor: 'Solicitud web',
    web_uid: uid || '',
    web_ts: _FV().serverTimestamp(),   // hora del SERVIDOR: de ahi cuentan los 7 dias
    web_paso: 1
  };
  if(ESTADOS_VE.indexOf(estado) > -1) p.estado_ubi = estado;
  return p;
}

// ── Partes 2 a 9 ──────────────────────────────────────────────────────────
// Una pantalla por parte; la 5 tiene dos (creditos y banco, y Cashea aparte en UNA).
var PANTALLAS = [
  { id:'p2',   parte:2, nombre:'Tu moto' },
  { id:'p3',   parte:3, nombre:'Tu trabajo' },
  { id:'p4',   parte:4, nombre:'Tu plata' },
  { id:'p5',   parte:5, nombre:'Créditos y banco' },
  { id:'p5c',  parte:5, nombre:'Tu Cashea' },
  { id:'p6',   parte:6, nombre:'Dónde vives' },
  { id:'p7',   parte:7, nombre:'Personas que te conocen' },
  { id:'p8',   parte:8, nombre:'Tu fiador' },
  { id:'p9',   parte:9, nombre:'Sobre ti' },
  { id:'pFin', parte:9, nombre:'Terminar', fin:true }
];
// Cada entrada de las pantallas, para el borrador del telefono
var CAMPOS_WIZ = ['wz_uso','wz_moto_previa','wz_empresa','wz_cargo','wz_ant','wz_dir_trabajo',
  'wz_dia_cobro','wz_monto','wz_rem','wz_ifam','wz_dep','wz_ahorro','wz_inicial',
  'wz_hist','wz_deuda','wz_deuda_mensual','wz_banco','wz_banco_nm',
  'wz_cashea','wz_cashea_nivel','wz_cashea_estado','wz_cashea_linea','wz_cashea_deuda','wz_cashea_monto',
  'wz_cashea_cuotas_pend','wz_cashea_compras_activas','wz_cashea_prox_monto',
  'wz_ciudad_res','wz_dir_det','wz_dir_ref','wz_tdir','wz_viv',
  'wz_r1n','wz_r1t','wz_r1r','wz_r2n','wz_r2t','wz_r2r',
  'wz_fiador','wz_fiador_nom','wz_fiador_tel','wz_fiador_rel','wz_fiador_ci','wz_fiador_dir','wz_fiador_ing',
  'wz_fn_d','wz_fn_m','wz_fn_a','wz_email','wz_rif','wz_conocio'];

// Lo que se guarda de una pantalla: SOLO lo contestado (nunca '' ni 0 por un vacio).
// Con validar=true tambien devuelve los errores para pintarlos al lado del campo; con
// validar=false ("No sé esto, siguiente" o "Salir") lo que no se entiende se deja fuera.
function datosPantalla(pid, validar){
  var o = {}, errores = [];
  var err = function(id, msg){ errores.push([id, msg]); };
  var codigo = function(k, id, lista){ var v = _raw(id); if(v && lista.indexOf(v) > -1) o[k] = v; return o[k] || ''; };
  var texto = function(k, id, max){ var v = _v(id).slice(0, max); if(v) o[k] = v; };
  var monto = function(k, id, entero){
    var n = _monto(id); if(n === null) return;
    if(isNaN(n) || n > 100000){ err(id, 'Escribe solo el número, por ejemplo 80.'); return; }
    if(n > 0) o[k] = entero ? Math.round(n) : Math.round(n*100)/100;
  };
  var trabajo = (LEAD && LEAD.trabajo) || '';
  if(pid === 'p2'){
    codigo('uso_moto', 'wz_uso', OPC.uso_moto);
    codigo('moto_previa', 'wz_moto_previa', OPC.moto_previa);
  } else if(pid === 'p3'){
    if(trabajo !== 'remesas'){ texto('empresa', 'wz_empresa', 120); texto('dir_trabajo', 'wz_dir_trabajo', 200); }
    texto('cargo', 'wz_cargo', 80);
    codigo('antiguedad', 'wz_ant', OPC.antiguedad);
  } else if(pid === 'p4'){
    var dia = codigo('dia_cobro', 'wz_dia_cobro', OPC.dia_cobro);
    // Primero cada cuanto cobra y despues cuanto se hace en ESA unidad: nadie que cobra
    // por dia sabe cuanto se hace "al mes en dolares" (revision del cliente, 27-sep).
    var n = _monto('wz_monto');
    if(n !== null){
      var mes = isNaN(n) ? NaN : Math.round(n * FACTOR_COBRO[dia || 'mensual']);
      if(isNaN(mes) || mes > 100000) err('wz_monto', 'Escribe solo el número, por ejemplo 80.');
      else if(mes > 0){ o.ingreso = mes; o.ingreso_exacto = true; }
    }
    codigo('remesas', 'wz_rem', OPC.si_no);
    monto('ingreso_familiar', 'wz_ifam');
    var dep = _raw('wz_dep'); if(OPC.dependientes.indexOf(dep) > -1) o.dependientes = parseInt(dep, 10);
    codigo('ahorro', 'wz_ahorro', OPC.ahorro);
    codigo('inicial_rango', 'wz_inicial', OPC.inicial_rango);
  } else if(pid === 'p5'){
    codigo('historial', 'wz_hist', OPC.historial);
    var deu = codigo('deudas', 'wz_deuda', OPC.deudas);
    if(deu && deu !== 'no') monto('deuda_mensual', 'wz_deuda_mensual');
    var ban = codigo('banco_estado', 'wz_banco', OPC.banco_estado);
    if(ban && ban !== 'no') texto('banco_nombre', 'wz_banco_nm', 160);
  } else if(pid === 'p5c'){
    // Cashea: solo los campos que se quedan (decision de Adam del 27-sep)
    if(codigo('cashea', 'wz_cashea', OPC.si_no) === 'si'){
      codigo('cashea_nivel', 'wz_cashea_nivel', OPC.cashea_nivel);
      codigo('cashea_estado', 'wz_cashea_estado', OPC.cashea_estado);
      monto('cashea_linea', 'wz_cashea_linea');
      if(codigo('cashea_deuda', 'wz_cashea_deuda', OPC.si_no) === 'si'){
        monto('cashea_monto', 'wz_cashea_monto');
        monto('cashea_cuotas_pend', 'wz_cashea_cuotas_pend', true);
        monto('cashea_compras_activas', 'wz_cashea_compras_activas', true);
        monto('cashea_prox_monto', 'wz_cashea_prox_monto');
      }
    }
  } else if(pid === 'p6'){
    texto('ciudad', 'wz_ciudad_res', 80);
    var dir = _v('wz_dir_det'), ref = _v('wz_dir_ref');
    var completa = dir ? (ref ? dir+' · Ref: '+ref : dir) : (ref ? 'Ref: '+ref : '');
    if(completa) o.dir = completa.slice(0, 300);
    codigo('tiempo_dir', 'wz_tdir', OPC.tiempo_dir);
    codigo('vivienda', 'wz_viv', OPC.vivienda);
  } else if(pid === 'p7'){
    // Sin cedula (nadie se sabe la de sus amigos) y sin observacion: esa la escribe el
    // equipo cuando llama para verificar.
    ['r1','r2'].forEach(function(r, i){
      var nom = _v('wz_'+r+'n').slice(0, 80), telTxt = _v('wz_'+r+'t'), rel = _raw('wz_'+r+'r');
      if(!nom && !telTxt) return;
      var tel = telTxt ? normTelLibre(telTxt) : '';
      if(telTxt && !tel) err('wz_'+r+'t', 'Revisa el número: por ejemplo 0414-1234567.');
      if(!nom){ err('wz_'+r+'n', 'Escribe también su nombre.'); return; }
      o['ref'+(i+1)] = { nom: nom, ci: '', tel: tel, rel: OPC.rel_ref.indexOf(rel) > -1 ? rel : '', obs: '' };
    });
  } else if(pid === 'p8'){
    var fi = codigo('fiador', 'wz_fiador', OPC.si_no);
    if(fi === 'si'){
      delete o.fiador;   // 'si' solo con nombre y telefono (abajo)
      var fnom = _v('wz_fiador_nom').slice(0, 80), ftxt = _v('wz_fiador_tel');
      var ftel = ftxt ? normTelLibre(ftxt) : '';
      if(!fnom){
        // Sin nombre no se guarda nada del fiador, igual que con las referencias: el panel
        // (asistente y ficha) abre el fiador por su nombre, y un telefono o una cedula
        // sueltos no se veian en ningun lado (integracion con PAGASI 18, 27-sep-2026).
        if(ftxt || _v('wz_fiador_ci') || _v('wz_fiador_dir') || _raw('wz_fiador_ing') || _raw('wz_fiador_rel'))
          err('wz_fiador_nom', 'Escribe también su nombre.');
      } else {
        if(ftxt && !ftel) err('wz_fiador_tel', 'Revisa el número: por ejemplo 0414-1234567.');
        if(!ftxt) err('wz_fiador_tel', 'Escribe su teléfono para poder llamarlo.');
        o.fiador_nom = fnom;
        if(ftel) o.fiador_tel = ftel;
        codigo('fiador_rel', 'wz_fiador_rel', OPC.fiador_rel);
        var fciTxt = _v('wz_fiador_ci');
        if(fciTxt){ var fci = normCedula(fciTxt); if(fci) o.fiador_ci = fci.valor; else err('wz_fiador_ci', 'Revisa la cédula: por ejemplo V-12345678.'); }
        texto('fiador_dir', 'wz_fiador_dir', 200);
        monto('fiador_ing', 'wz_fiador_ing');
        if(ftel) o.fiador = 'si';
      }
    }
  } else if(pid === 'p9'){
    var d = _raw('wz_fn_d'), m = _raw('wz_fn_m'), a = _raw('wz_fn_a');
    if(d || m || a){
      var f = fechaNacimiento(d, m, a);
      if(f) o.fecha_nacimiento = f; else err('wz_fn_d', 'Completa el día, el mes y el año.');
    }
    var mail = _limpia(_raw('wz_email')).replace(/\s/g,'').toLowerCase();
    if(mail){
      if(mail.length <= 100 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) o.email = mail;
      else err('wz_email', 'Revisa tu correo: por ejemplo nombre@gmail.com.');
    }
    var rif = _v('wz_rif').toUpperCase().replace(/\s/g,'');
    if(rif){
      if(/^[VEJPG]-?[0-9]{6,9}-?[0-9]?$/.test(rif) && rif.length <= 20) o.rif = rif;
      else err('wz_rif', 'Revisa el RIF: por ejemplo V-12345678-9.');
    }
    codigo('conocio', 'wz_conocio', OPC.conocio);
  }
  return { datos: o, errores: errores };
}
// 'AAAA-MM-DD' si la fecha existe de verdad, o ''
function fechaNacimiento(d, m, a){
  var dd = parseInt(d,10), mm = parseInt(m,10), aa = parseInt(a,10);
  if(!dd || !mm || !aa || aa < 1900) return '';
  var x = new Date(aa, mm-1, dd);
  if(x.getFullYear() !== aa || x.getMonth() !== mm-1 || x.getDate() !== dd) return '';
  return aa + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;
}
function _edad(iso){
  if(!iso) return null;
  var p = iso.split('-'), h = new Date(), e = h.getFullYear() - parseInt(p[0],10);
  if(h.getMonth()+1 < parseInt(p[1],10) || (h.getMonth()+1 === parseInt(p[1],10) && h.getDate() < parseInt(p[2],10))) e--;
  return e;
}

// ── Estado de la solicitud en esta pestaña ────────────────────────────────
var LEAD = null;   // { id, uid, nombre, creado (ms), trabajo, ingreso_rango, estado_ubi, moto }
var ESTADO = { i:0, paso:1, guardado:{}, pend:{}, ocupado:false };

// ── Borrador en el navegador ──────────────────────────────────────────────
// El anonimo no puede leer su propia ficha (tiene notas del equipo), asi que lo que ya
// contesto vive tambien aqui: para "Atrás", para retomar en el mismo telefono y para
// reenviar lo que se quedo sin señal. Solo texto, nunca fotos. Vence con la ventana de
// las Reglas (7 dias) y se borra al Terminar, al salir y al borrar desde el telefono.
var BORRADOR_KEY = 'pagasi_solicitud_borrador_v1', BORRADOR_DIAS = 7;
var CAMPOS_BORRADOR = ['wz_nom','wz_ci','wz_tel','wz_emp','wz_ing_rango','wz_estado','fM'];
function guardarBorrador(){
  try{
    var o = { t: Date.now() };
    if(LEAD){
      // Con el lead creado ya no se guardan cedula ni telefono: no hacen falta para seguir
      o.leadId = LEAD.id; o.uid = LEAD.uid; o.creadoLead = LEAD.creado; o.nombre = LEAD.nombre;
      o.trabajo = LEAD.trabajo; o.ingreso_rango = LEAD.ingreso_rango; o.estado_ubi = LEAD.estado_ubi; o.moto = LEAD.moto || '';
      o.i = ESTADO.i; o.parte = PANTALLAS[ESTADO.i] ? PANTALLAS[ESTADO.i].parte : 2; o.paso = ESTADO.paso;
      o.guardado = ESTADO.guardado; o.pend = ESTADO.pend;
      o.v = {};
      CAMPOS_WIZ.forEach(function(id){ var e = _el(id); if(e && e.value) o.v[id] = String(e.value).slice(0,300); });
    } else {
      CAMPOS_BORRADOR.forEach(function(id){ var e = _el(id); if(e && e.value) o[id] = String(e.value).slice(0,120); });
      if(Object.keys(o).length <= 1){ localStorage.removeItem(BORRADOR_KEY); return; }
    }
    localStorage.setItem(BORRADOR_KEY, JSON.stringify(o));
  }catch(e){}
}
function leerBorrador(){
  try{ var o = JSON.parse(localStorage.getItem(BORRADOR_KEY)||'null'); return (o && o.t) ? o : null; }catch(e){ return null; }
}
// Vencido: la solicitud a medias pasa de los 7 dias (con una hora de margen por la hora
// del telefono), o el borrador de la parte 1 lleva 7 dias sin tocarse.
function borradorVencido(o){
  if(!o) return true;
  if(o.leadId) return !o.creadoLead || (Date.now() - o.creadoLead > VENTANA_DIAS*86400000 - 3600000);
  return Date.now() - o.t > BORRADOR_DIAS*86400000;
}
// La parte 1: lo escrito vuelve a su lugar
function cargarBorrador(o){
  try{
    o = o || leerBorrador(); if(!o || o.leadId) return false;
    if(borradorVencido(o)){ borrarBorrador(); return false; }
    var puso = false;
    CAMPOS_BORRADOR.forEach(function(id){ var e = _el(id); if(e && o[id] && !e.value){ e.value = o[id]; puso = true; } });
    if(puso && _el('fM') && typeof _pintarPlan==='function') _pintarPlan();
    return puso;
  }catch(e){ return false; }
}
function borrarBorrador(){ try{ localStorage.removeItem(BORRADOR_KEY); }catch(e){} }

// ── Sesion anonima ────────────────────────────────────────────────────────
// NO se cierra entre partes (con otra sesion las Reglas ya no dejan completar). Se
// cierra al Terminar, al elegir WhatsApp, al borrar las respuestas del telefono, cuando
// la base dice que ya no se puede seguir y al cargar con un borrador vencido.
function sesionActual(){
  return new Promise(function(res){
    if(!fbAuth){ res(null); return; }
    var listo = false, un = null, quitar = false;
    var fin = function(u){ if(listo) return; listo = true; res(u || null); };
    try{
      un = fbAuth.onAuthStateChanged(function(u){ if(un) un(); else quitar = true; fin(u); });
      if(quitar && un) un();
    }catch(e){ fin(fbAuth.currentUser); }
    setTimeout(function(){ fin(fbAuth.currentUser); }, 4000);
  });
}
async function cerrarSesion(){ try{ if(fbAuth && fbAuth.currentUser) await fbAuth.signOut(); }catch(_e){} }
function _esRechazo(err){ return !!err && (err.code === 'permission-denied' || /permission|insufficient/i.test(String(err.message||''))); }
var _TIEMPO = { tiempo:true };
function _conTiempo(p, ms){
  var t = new Promise(function(res){ setTimeout(function(){ res(_TIEMPO); }, ms); });
  return Promise.race([p, t]);
}

// ── Pantallas ─────────────────────────────────────────────────────────────
var PANTALLAS_FS = ['fs1','fMas','fsWiz','fRet','fPausa','fOK'];
function _pantalla(id){
  PANTALLAS_FS.forEach(function(k){ var e = _el(k); if(e) e.classList.toggle('on', k===id); });
  var card = _el('formSolicitud');
  if(card && card.scrollIntoView){ try{ card.scrollIntoView({ block:'start', behavior:'smooth' }); }catch(e){ card.scrollIntoView(); } }
  var e = _el(id); if(e){ e.setAttribute('tabindex','-1'); try{ e.focus({ preventScroll:true }); }catch(_e){} }
}
function _ui(etapa){
  try{
    if(window.PagasiSolicitudUI && typeof window.PagasiSolicitudUI.etapa === 'function'){
      var p = PANTALLAS[ESTADO.i] || PANTALLAS[0];
      window.PagasiSolicitudUI.etapa({ etapa: etapa, leadId: LEAD ? LEAD.id : '', parte: p.parte, total: TOTAL_PARTES });
    }
  }catch(e){}
}
function _primerNombre(n){ return String(n||'').trim().split(/\s+/)[0] || ''; }
function _texto(id, t){ var e = _el(id); if(e) e.textContent = t; }
function _ocultar(id, si){ var e = _el(id); if(e) e.hidden = !!si; }
function _enApp(){ try{ return /Instagram|FBAN|FBAV|FB_IAB/i.test(navigator.userAgent||''); }catch(e){ return false; } }

// Despues de la parte 1: ya llego, ¿seguimos?
function mostrarMas(){
  _texto('masNombre', _primerNombre(LEAD.nombre) || 'ya está');
  _texto('masId', LEAD.id);
  _ocultar('masApp', !_enApp());
  _pantalla('fMas');
  _ui('mas');
}
// Los finales. Nunca se confirma que una cedula ya existe: el mensaje de "duplicado" es
// neutro, porque cualquiera podria probar cedulas para saber quien pidio credito.
function mostrarFin(tipo){
  var L = LEAD || {}, nombre = _primerNombre(L.nombre), id = L.id || '';
  var t = {
    whatsapp:  ['¡Listo'+(nombre ? ', '+nombre : '')+'!', 'Tu solicitud es la '+id+'. Guárdala por si nos escribes.', true],
    terminado: ['¡Listo'+(nombre ? ', '+nombre : '')+'!', 'Tu solicitud '+id+' está completa y ya está en manos de tu asesor. Borramos tus respuestas de este teléfono.', true],
    borrado:   ['Listo, borramos tus respuestas de este teléfono.', 'Lo que alcanzaste a llenar ya nos llegó ('+id+'). Lo que falta lo vemos por WhatsApp.', true],
    cerrado:   ['Tu asesor ya tiene tu solicitud.', 'Tu solicitud '+id+' ya nos llegó. Lo que falta lo vemos por WhatsApp.', true],
    perdida:   ['No podemos seguir desde aquí.', 'Tu solicitud '+id+' ya nos llegó, pero este navegador cerró la sesión y no se puede seguir llenando desde aquí. Lo que falta lo vemos por WhatsApp.', false],
    duplicado: ['Escríbenos por WhatsApp.', 'No pudimos registrar tu solicitud desde aquí. Si ya enviaste tu solicitud, escríbenos por WhatsApp y te atendemos.', false]
  }[tipo] || ['¡Listo!', '', true];
  _texto('okTitulo', t[0]);
  _texto('okText', t[1]);
  _ocultar('okPasos', !t[2]);
  var aviso = tipo === 'duplicado' || tipo === 'perdida', ico = _el('okIco');
  _texto('okIco', aviso ? 'i' : '✓');
  if(ico && ico.classList) ico.classList.toggle('info', aviso);
  var msg = tipo === 'duplicado'
    ? 'Hola, soy '+(L.nombre||'')+'. Intenté enviar mi solicitud por pagasi.io y no me dejó.'
    : 'Hola, soy '+(L.nombre||'')+'. Mi solicitud es la '+id+' (pagasi.io)'+(L.moto ? ' y me interesa la '+L.moto : '')+'.';
  var a = _el('okWA'); if(a) a.href = _waHref(msg);
  _ocultar('btnNueva', tipo !== 'perdida' && tipo !== 'borrado');   // el telefono queda libre para otra persona
  _pantalla('fOK');
  _ui('fin');
  LEAD = null; ESTADO = { i:0, paso:1, guardado:{}, pend:{}, ocupado:false };
}

// ── Parte 1: enviar ───────────────────────────────────────────────────────
async function submitF(ev){
  if(ev && ev.preventDefault) ev.preventDefault();
  // Un Enter en un campo de las otras partes tambien "envia" el formulario: aqui no hace nada
  var fs1 = _el('fs1');
  if(LEAD || window.__submittingSolicitud || (fs1 && !fs1.classList.contains('on'))) return false;
  mostrarAviso('');
  var malo = validarPaso1(true);
  if(malo){ try{ malo.focus(); malo.scrollIntoView({ block:'center', behavior:'smooth' }); }catch(e){} return false; }
  window.__submittingSolicitud = true;
  var btn = _el('btnGuardarSolicitud');
  if(btn){ btn.disabled = true; btn.textContent = 'Enviando…'; }
  if(fs1) fs1.classList.add('fsaving');
  var payload = null;
  try{
    if((!FIREBASE_READY||!fbAuth||!db) && !initFirebaseSolicitar()) throw new Error('Firebase no disponible');
    if(!fbAuth.currentUser) await fbAuth.signInAnonymously();
    var uid = fbAuth.currentUser.uid;
    payload = buildClientePayload(uid);
    // El lead y su marcador de sesion van JUNTOS: una solicitud por sesion (web_sesiones).
    // La base rechaza el lote si la cedula ya existe o si esta sesion ya creo otra.
    var lote = db.batch();
    lote.set(db.collection('clientes').doc(String(payload.id)), payload);
    lote.set(db.collection('web_sesiones').doc(uid), { leadId: payload.id, ts: _FV().serverTimestamp() });
    await lote.commit();
    LEAD = { id: payload.id, uid: uid, nombre: payload.nombre, creado: Date.now(), trabajo: payload.trabajo,
             ingreso_rango: payload.ingreso_rango, estado_ubi: payload.estado_ubi || '', moto: payload.moto_interes_modelo };
    ESTADO = { i:0, paso:1, guardado:{}, pend:{}, ocupado:false };
    guardarBorrador();
    mostrarMas();
  }catch(err){
    console.error('submitF:', err);
    if(_esRechazo(err) && payload){
      await cerrarSesion();
      borrarBorrador();
      LEAD = { nombre: payload.nombre };
      mostrarFin('duplicado');
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

// ── Moverse entre partes ──────────────────────────────────────────────────
var TXT_TRABAJO = {
  formal:        { empresa:['¿Cómo se llama la empresa donde trabajas?','Ej: Farmatodo, Empresas Polar'], cargo:['¿Qué haces ahí?','Ej: vendedora, cajero, almacenista'], dir:['¿Dónde queda tu trabajo?','Ej: Av. Francisco de Miranda, Chacao'] },
  publico:       { empresa:['¿En qué institución trabajas?','Ej: Alcaldía de Sucre, Corpoelec'], cargo:['¿Qué haces ahí?','Ej: analista, docente, vigilante'], dir:['¿Dónde queda tu trabajo?','Ej: El Silencio, Caracas'] },
  delivery:      { empresa:['¿Con qué app o empresa trabajas?','Ej: Yummy, PedidosYa, por mi cuenta'], cargo:['¿Qué haces?','Ej: motorizado, mototaxi, encomiendas'], dir:['¿En qué zona haces tus entregas?','Ej: Chacao, Altamira, Los Palos Grandes'] },
  independiente: { empresa:['¿Cómo se llama lo tuyo? Si no tiene nombre, pon a qué te dedicas','Ej: Peluquería Yeli, plomería'], cargo:['¿Qué haces?','Ej: peluquera, plomero, costurera'], dir:['¿Dónde trabajas?','Ej: en mi casa en Petare, a domicilio'] },
  comerciante:   { empresa:['¿Cómo se llama tu negocio?','Ej: Bodega La Esquina, venta de ropa'], cargo:['¿Qué vendes o qué haces en tu negocio?','Ej: víveres, ropa, repuestos'], dir:['¿Dónde queda tu negocio?','Ej: mercado de Catia, local 12'] },
  informal:      { empresa:['¿Dónde trabajas o para quién?','Ej: en un taller, en un puesto, por mi cuenta'], cargo:['¿Qué haces?','Ej: ayudante, vendedor, cocinera'], dir:['¿Dónde queda tu trabajo?','Ej: Petare, la redoma'] },
  remesas:       { cargo:['¿Haces algún trabajo o negocio aparte?','Ej: vendo comida, hago uñas (si no, déjalo en blanco)'], ant:'¿Desde hace cuánto te mandan plata?' }
};
function _etiqueta(k, txt, ph){
  _texto('t_'+k, txt);
  var i = _el('wz_'+k); if(i && ph != null) i.setAttribute('placeholder', ph);
}
// Lo que cambia segun lo que ya contesto: preguntas que se abren y textos que se adaptan
function condiciones(){
  var t = (LEAD && LEAD.trabajo) || '', x = TXT_TRABAJO[t] || TXT_TRABAJO.formal;
  // Parte 3: si vive de remesas no hay empresa ni lugar de trabajo que preguntar
  _ocultar('p3remesas', t !== 'remesas');
  _ocultar('q_empresa', t === 'remesas');
  _ocultar('q_dir_trabajo', t === 'remesas');
  if(x.empresa) _etiqueta('empresa', x.empresa[0], x.empresa[1]);
  if(x.cargo) _etiqueta('cargo', x.cargo[0], x.cargo[1]);
  if(x.dir) _etiqueta('dir_trabajo', x.dir[0], x.dir[1]);
  _texto('t_ant', x.ant || '¿Cuánto tiempo llevas en ese trabajo?');
  _texto('t_dia_cobro', t === 'remesas' ? '¿Cada cuánto te mandan?' : '¿Cada cuánto cobras?');
  // Parte 4: el monto se pregunta en la unidad en que cobra
  var dia = _raw('wz_dia_cobro');
  _texto('t_monto', '¿Cuánto te haces '+(UNIDAD_COBRO[dia] || 'en un mes normal')+', en dólares?');
  _texto('p4rango', LEAD && LEAD.ingreso_rango ? 'Al principio marcaste '+LEAD.ingreso_rango+' al mes. ' : '');
  // Parte 5
  var deu = _raw('wz_deuda'), ban = _raw('wz_banco');
  _ocultar('q_deuda_mensual', !(deu && deu !== 'no'));
  _ocultar('q_banco_nm', !(ban && ban !== 'no'));
  _ocultar('w_cashea', _raw('wz_cashea') !== 'si');
  _ocultar('w_cashea_deuda', _raw('wz_cashea_deuda') !== 'si');
  // Parte 6: el estado ya lo dijo en la parte 1
  _texto('p6estado', LEAD && LEAD.estado_ubi ? ' Estado: '+LEAD.estado_ubi+'.' : '');
  // Parte 8: los datos extra del fiador se abren solos si ya habia escrito alguno
  _ocultar('w_fiador', _raw('wz_fiador') !== 'si');
  if(_raw('wz_fiador_ci') || _raw('wz_fiador_dir') || _raw('wz_fiador_ing')){ _ocultar('w_fiador_mas', false); _ocultar('btnFiadorMas', true); }
}
// Botones de opcion: pintan la que esta elegida en su campo escondido
function pintarBotones(){
  try{
    Array.prototype.forEach.call(document.querySelectorAll('[data-for]'), function(g){
      var inp = _el(g.getAttribute('data-for')); if(!inp) return;
      var multi = g.hasAttribute('data-multi'), val = String(inp.value||''), lista = val.split(', ');
      Array.prototype.forEach.call(g.querySelectorAll('[data-v]'), function(b){
        var v = b.getAttribute('data-v'), on = multi ? lista.indexOf(v) > -1 : v === val;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  }catch(e){}
}
// Tocar una opcion la elige; tocarla otra vez la quita (asi "no se" siempre es posible)
function elegir(id, v, multi){
  var inp = _el(id); if(!inp) return;
  if(multi){
    var l = String(inp.value||'').split(', ').filter(Boolean), k = l.indexOf(v);
    if(k > -1) l.splice(k, 1); else l.push(v);
    inp.value = l.join(', ');
  } else inp.value = (String(inp.value) === v) ? '' : v;
  marcarCampo(id, '');
  condiciones(); pintarBotones(); guardarBorrador();
}
// Lo que se llena solo la primera vez que se entra a una parte (se ve y se puede cambiar)
function sugerencias(pid){
  var t = (LEAD && LEAD.trabajo) || '';
  if(ESTADO.guardado[pid] != null) return;
  var poner = function(id, v){ var e = _el(id); if(e && !e.value) e.value = v; };
  if(pid === 'p3' && t === 'delivery') poner('wz_cargo', 'Motorizado');
  if(pid === 'p4' && t === 'remesas') poner('wz_rem', 'si');
  if(pid === 'p9'){
    var q = ''; try{ q = String(location.search||''); }catch(e){}
    if(_enApp() || /utm_source=(instagram|facebook|ig|fb)\b/i.test(q)) poner('wz_conocio', 'redes');
  }
}
function progreso(){
  var p = PANTALLAS[ESTADO.i], pct = Math.round((ESTADO.i + 1) / PANTALLAS.length * 100);
  _texto('wzPaso', p.fin ? 'Parte '+TOTAL_PARTES+' de '+TOTAL_PARTES+' · Terminar' : 'Parte '+p.parte+' de '+TOTAL_PARTES+' · '+p.nombre);
  _texto('wzPct', pct+'%');
  var fill = _el('wzBarFill'); if(fill && fill.style) fill.style.width = pct+'%';
  var bar = _el('wzBar'); if(bar) bar.setAttribute('aria-valuenow', String(pct));
  // Navegacion: sin "Atrás" en la primera, y la ultima dice "Terminar"
  _ocultar('btnAtras', ESTADO.i === 0);
  _ocultar('btnNoSe', !!p.fin);
  _texto('btnSiguiente', p.fin ? 'Terminar' : 'Siguiente');
}
function pintarResumen(){
  var ul = _el('finResumen'); if(!ul) return;
  var h = '';
  PANTALLAS.forEach(function(p, i){
    if(p.fin) return;
    var g = ESTADO.guardado[p.id], lleno = !!g && g !== '{}';
    h += '<li class="'+(lleno ? 'ok' : '')+'"><span>Parte '+p.parte+' · '+p.nombre+'</span><em>'+(lleno ? 'Contestada' : 'Sin contestar')+'</em>'
      + '<button type="button" class="flink" data-ir="'+i+'">Cambiar</button></li>';
  });
  ul.innerHTML = h;   // solo textos fijos de esta pagina: nada que haya escrito el cliente
}
function limpiarErrores(){
  CAMPOS_WIZ.forEach(function(id){ var e = _el(id); if(e && e.classList && e.classList.contains('is-bad')) marcarCampo(id, ''); });
}
function irA(i){
  ESTADO.i = Math.max(0, Math.min(i, PANTALLAS.length - 1));
  var p = PANTALLAS[ESTADO.i];
  PANTALLAS.forEach(function(x){ _ocultar(x.id, x.id !== p.id); });
  sugerencias(p.id);
  condiciones(); pintarBotones(); progreso(); limpiarErrores(); avisoWiz('');
  if(p.fin) pintarResumen();
  _pantalla('fsWiz');
  guardarBorrador();
  _ui('wizard');
}

// Guarda una pantalla: update() con SOLO sus campos, mas web_paso (la parte mas alta a la
// que llego), web_act y web_n (hora del servidor y contador, que exigen las Reglas).
// Devuelve 'ok' | 'igual' | 'pendiente' | 'sin-datos' | 'cerrado' | 'error'. Los tres
// del medio se le dicen al cliente en la pantalla siguiente (AVISOS_GUARDAR).
var AVISOS_GUARDAR = {
  'pendiente': ['Estás sin señal: guardamos tus respuestas en este teléfono y las enviamos apenas vuelva.', true],
  'sin-datos': ['No pudimos guardar la parte anterior. Tu asesor te la pregunta por WhatsApp.', false],
  'error':     ['No pudimos guardar la parte anterior. Sigue: la volvemos a enviar después.', false]
};
async function guardarPantalla(p, datos, forzar){
  if(!LEAD || !db) return 'error';
  var paso = Math.max(ESTADO.paso, p.parte), firma = JSON.stringify(datos);
  var vacio = !Object.keys(datos).length;
  if(!forzar && paso === ESTADO.paso && (firma === ESTADO.guardado[p.id] || (vacio && ESTADO.guardado[p.id] == null))) return 'igual';
  var meta = function(){ return { web_paso: paso, web_act: _FV().serverTimestamp(), web_n: _FV().increment(1), editadoEn: new Date().toISOString() }; };
  var ref = db.collection('clientes').doc(String(LEAD.id));
  try{
    var prom = ref.update(Object.assign({}, datos, meta()));
    var r = await _conTiempo(prom, 15000);
    ESTADO.guardado[p.id] = firma; ESTADO.paso = paso;
    if(r === _TIEMPO){
      // Sin señal: Firestore lo manda solo cuando vuelva, mientras la pagina siga abierta.
      // Si la cierran antes, al retomar se reenvia desde el borrador.
      ESTADO.pend[p.id] = true;
      prom.then(function(){ delete ESTADO.pend[p.id]; guardarBorrador(); }, function(){});
      guardarBorrador();
      return 'pendiente';
    }
    delete ESTADO.pend[p.id];
    guardarBorrador();
    return 'ok';
  }catch(err){
    console.error('guardarPantalla:', err);
    if(!_esRechazo(err)){ ESTADO.pend[p.id] = true; guardarBorrador(); return 'error'; }
    // La base dijo que no. O esta parte trae algo que las Reglas no aceptan, o la solicitud
    // ya no se puede completar (cerrada por el asesor, terminada o vencida). Se prueba sin
    // los datos: si pasa, se sigue sin esta parte; si no, se acaba aqui.
    try{
      await ref.update(meta());
      ESTADO.paso = paso; ESTADO.guardado[p.id] = '{}'; delete ESTADO.pend[p.id]; guardarBorrador();
      return 'sin-datos';
    }catch(err2){
      if(_esRechazo(err2)){ await cerrarSesion(); borrarBorrador(); mostrarFin('cerrado'); return 'cerrado'; }
      ESTADO.pend[p.id] = true; guardarBorrador();
      return 'error';
    }
  }
}
async function reenviarPendientes(){
  var ids = Object.keys(ESTADO.pend || {});
  for(var k = 0; k < ids.length; k++){
    var p = PANTALLAS.filter(function(x){ return x.id === ids[k]; })[0]; if(!p) continue;
    var r = await guardarPantalla(p, datosPantalla(p.id, false).datos, true);
    if(r === 'cerrado') return r;
  }
  return 'ok';
}
function _ocupado(si, texto){
  ESTADO.ocupado = si;
  ['btnSiguiente','btnAtras','btnNoSe','btnSalir'].forEach(function(id){ var b = _el(id); if(b) b.disabled = si; });
  var w = _el('fsWiz'); if(w) w.classList.toggle('fsaving', si);
  if(texto) _texto('btnSiguiente', texto);
}
// "Siguiente" guarda lo que haya y sigue; "No sé esto, siguiente" (nose=true) hace lo
// mismo sin detenerse en lo que esta mal escrito: eso se queda fuera.
async function siguiente(nose){
  if(ESTADO.ocupado || !LEAD) return;
  var p = PANTALLAS[ESTADO.i];
  if(p.fin) return terminar();
  limpiarErrores(); avisoWiz('');
  var r = datosPantalla(p.id, !nose);
  if(!nose && r.errores.length){
    r.errores.forEach(function(e){ marcarCampo(e[0], e[1]); });
    var el = _el(r.errores[0][0]); try{ el.focus(); el.scrollIntoView({ block:'center', behavior:'smooth' }); }catch(e){}
    return;
  }
  _ocupado(true, 'Guardando…');
  try{
    var res = await guardarPantalla(p, r.datos);
    if(res === 'cerrado') return;
    if(ESTADO.volver){ ESTADO.volver = false; irA(PANTALLAS.length - 1); }
    else irA(ESTADO.i + 1);
    if(AVISOS_GUARDAR[res]) avisoWiz(AVISOS_GUARDAR[res][0], AVISOS_GUARDAR[res][1]);
  }finally{ _ocupado(false); if(LEAD) progreso(); }
}
function atras(){
  if(ESTADO.ocupado || !LEAD) return;
  guardarBorrador();
  irA(ESTADO.i - 1);
}
// "Salir y terminar después": guarda lo que haya en la pantalla y deja la sesion y el
// borrador vivos para retomar en este mismo telefono (hasta los 7 dias). Si el telefono
// es prestado, desde ahi mismo se puede borrar todo (borrarDeAqui).
async function salir(){
  if(ESTADO.ocupado || !LEAD) return;
  var p = PANTALLAS[ESTADO.i];
  _ocupado(true);
  try{
    if(!p.fin){ var res = await guardarPantalla(p, datosPantalla(p.id, false).datos); if(res === 'cerrado') return; }
    mostrarPausa();
  }finally{ _ocupado(false); if(LEAD) progreso(); }
}
function _fechaLimite(){
  try{ return new Date((LEAD.creado || Date.now()) + VENTANA_DIAS*86400000).toLocaleDateString('es-VE', { weekday:'long', day:'numeric', month:'long' }); }catch(e){ return 'la semana que viene'; }
}
function mostrarPausa(){
  _texto('pausaFecha', _fechaLimite());
  var a = _el('pausaWA'); if(a) a.href = _waHref('Hola, soy '+(LEAD.nombre||'')+'. Empecé mi solicitud '+LEAD.id+' por pagasi.io y prefiero terminarla por aquí.');
  _pantalla('fPausa');
  _ui('pausa');
}
async function terminar(){
  if(ESTADO.ocupado || !LEAD) return;
  _ocupado(true, 'Enviando…');
  try{
    // Lo que se quedo sin señal va primero: despues de web_fin ya no se puede escribir
    if(await reenviarPendientes() === 'cerrado') return;
    var prom = db.collection('clientes').doc(String(LEAD.id)).update({
      web_fin: _FV().serverTimestamp(), web_paso: ESTADO.paso, web_act: _FV().serverTimestamp(),
      web_n: _FV().increment(1), editadoEn: new Date().toISOString() });
    var r = await _conTiempo(prom, 20000);
    if(r === _TIEMPO){
      prom.catch(function(){});
      avisoWiz('No hay señal. Tus respuestas están guardadas en este teléfono: toca Terminar otra vez cuando tengas conexión.');
      return;
    }
    await cerrarSesion(); borrarBorrador(); mostrarFin('terminado');
  }catch(err){
    console.error('terminar:', err);
    if(_esRechazo(err)){ await cerrarSesion(); borrarBorrador(); mostrarFin('cerrado'); }
    else avisoWiz('No pudimos avisarle a tu asesor. Revisa tu conexión y toca Terminar otra vez.');
  }finally{ _ocupado(false); if(LEAD) progreso(); }
}
async function prefieroWhatsApp(){ await cerrarSesion(); borrarBorrador(); mostrarFin('whatsapp'); }
async function borrarDeAqui(){ await cerrarSesion(); borrarBorrador(); mostrarFin('borrado'); }

// ── Retomar en el mismo telefono ──────────────────────────────────────────
async function retomar(){
  var b = leerBorrador();
  if(!b || !b.leadId){
    cargarBorrador(b);
    // Una sesion anonima sin solicitud a medias no sirve para nada: se cierra
    if(fbAuth){ var u0 = await sesionActual(); if(u0) await cerrarSesion(); }
    return 'parte1';
  }
  if(!fbAuth) return 'sin-firebase';   // sin Firebase no se decide nada: el borrador se queda
  if(borradorVencido(b)){ borrarBorrador(); if(await sesionActual()) await cerrarSesion(); return 'vencido'; }
  LEAD = { id: b.leadId, uid: b.uid, nombre: b.nombre, creado: b.creadoLead, trabajo: b.trabajo,
           ingreso_rango: b.ingreso_rango, estado_ubi: b.estado_ubi, moto: b.moto };
  _texto('retNombre', _primerNombre(b.nombre) || 'de nuevo');
  _texto('retText', 'Buscando tu solicitud…');
  var bs = _el('btnRetSeguir'); if(bs) bs.disabled = true;
  _pantalla('fRet');
  var u = await sesionActual();
  if(u && u.uid === b.uid){
    Object.keys(b.v || {}).forEach(function(id){ var e = _el(id); if(e && CAMPOS_WIZ.indexOf(id) > -1) e.value = b.v[id]; });
    ESTADO = { i: Math.max(0, Math.min(b.i || 0, PANTALLAS.length - 1)), paso: b.paso || 1, guardado: b.guardado || {}, pend: b.pend || {}, ocupado:false };
    var p = PANTALLAS[ESTADO.i];
    _texto('retText', 'Tu solicitud '+b.leadId+' va por la parte '+p.parte+' de '+TOTAL_PARTES+'. ¿Seguimos donde quedaste?');
    if(bs) bs.disabled = false;
    condiciones(); pintarBotones();
    _ui('ret');
    return 'retomar';
  }
  // La sesion se perdio (otro navegador, datos borrados, la app de Instagram...): con otra
  // sesion las Reglas ya no dejan completar. Se dice y se ofrece WhatsApp.
  if(u) await cerrarSesion();
  borrarBorrador();
  mostrarFin('perdida');
  return 'perdida';
}
async function seguirDondeQuede(){
  if(!LEAD) return;
  _ocupado(true);
  try{ if(await reenviarPendientes() === 'cerrado') return; }finally{ _ocupado(false); }
  irA(ESTADO.i);
}
function hacerOtra(){
  borrarBorrador();
  _pantalla('fs1');
  _ui('parte1');
}

// ── Fecha de nacimiento: tres listas, mas facil que el calendario del telefono ──
var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function llenarFechas(){
  var add = function(sel, v, t){ if(!sel || !sel.appendChild) return; var o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); };
  var d = _el('wz_fn_d'), m = _el('wz_fn_m'), a = _el('wz_fn_a');
  if(d && d.options && d.options.length <= 1) for(var i = 1; i <= 31; i++) add(d, (i<10?'0':'')+i, String(i));
  if(m && m.options && m.options.length <= 1) MESES.forEach(function(n, k){ add(m, (k<9?'0':'')+(k+1), n); });
  var hoy = new Date().getFullYear();
  if(a && a.options && a.options.length <= 1) for(var y = hoy - 16; y >= 1940; y--) add(a, String(y), String(y));
}
function avisoEdad(){
  var f = fechaNacimiento(_raw('wz_fn_d'), _raw('wz_fn_m'), _raw('wz_fn_a')), e = _edad(f);
  _ocultar('fnAviso', !(e != null && e < 18));
}

// ── Elegir de mis contactos (Chrome de Android) ───────────────────────────
async function elegirContacto(quien){
  var ui = window.PagasiSolicitudUI; if(!ui || typeof ui.elegirContacto !== 'function') return;
  var c = await ui.elegirContacto(); if(!c) return;
  var ids = { r1:['wz_r1n','wz_r1t'], r2:['wz_r2n','wz_r2t'], fiador:['wz_fiador_nom','wz_fiador_tel'] }[quien]; if(!ids) return;
  var n = _el(ids[0]), t = _el(ids[1]);
  if(n && c.nom) n.value = _limpia(c.nom).slice(0, 80);
  if(t && c.tel) t.value = normTelLibre(c.tel) || _limpia(c.tel).slice(0, 20);
  guardarBorrador();
}

(function(){
  function arrancar(){
    var form = _el('formSolicitud');
    if(form){
      form.addEventListener('submit', submitF);
      // Un solo oyente para todos los botones de las partes
      form.addEventListener('click', function(ev){
        var b = ev.target && ev.target.closest ? ev.target.closest('button') : null; if(!b) return;
        var g = b.hasAttribute('data-v') ? b.closest('[data-for]') : null;
        if(g){ elegir(g.getAttribute('data-for'), b.getAttribute('data-v'), g.hasAttribute('data-multi')); return; }
        if(b.hasAttribute('data-contacto')){ elegirContacto(b.getAttribute('data-contacto')); return; }
        // "Cambiar" desde el resumen: al guardar esa parte se vuelve directo al final
        if(b.hasAttribute('data-ir')){ if(!ESTADO.ocupado){ ESTADO.volver = true; irA(parseInt(b.getAttribute('data-ir'), 10)); } return; }
      });
      var escribio = function(ev){
        var id = ev.target && ev.target.id; if(!id) return;
        if(CAMPOS_WIZ.indexOf(id) > -1){ if(ev.target.classList.contains('is-bad')) marcarCampo(id, ''); guardarBorrador(); }
        if(/^wz_fn_/.test(id)) avisoEdad();
      };
      form.addEventListener('input', escribio);
      form.addEventListener('change', escribio);
    }
    CAMPOS1.forEach(function(f){
      var el = _el(f.id); if(!el) return;
      el.addEventListener('blur', function(){ if(String(el.value||'').trim()) validarUno(f.id); });
      el.addEventListener('input', function(){ if(el.classList.contains('is-bad')) validarUno(f.id); });
      el.addEventListener('change', function(){ validarUno(f.id); });
    });
    // Al salir de cedula y telefono se dejan escritos como los guarda el sistema
    var ci = _el('wz_ci'); if(ci) ci.addEventListener('blur', function(){ var n = normCedula(ci.value); if(n) ci.value = n.valor; });
    var tel = _el('wz_tel'); if(tel) tel.addEventListener('blur', function(){ var n = normTel(tel.value); if(n) tel.value = n.valor; });
    CAMPOS_BORRADOR.forEach(function(id){ var e = _el(id); if(e){ e.addEventListener('input', function(){ if(!LEAD) guardarBorrador(); }); e.addEventListener('change', function(){ if(!LEAD) guardarBorrador(); }); } });
    if(fM){ fM.addEventListener('change', _pintarPlan); }
    var on = function(id, fn){ var b = _el(id); if(b) b.addEventListener('click', fn); };
    on('btnSeguirSolicitud', function(){ irA(0); });
    on('btnPrefieroWA', prefieroWhatsApp);
    on('btnSiguiente', function(){ siguiente(false); });
    on('btnNoSe', function(){ siguiente(true); });
    on('btnAtras', atras);
    on('btnSalir', salir);
    on('btnRetSeguir', seguirDondeQuede);
    on('btnRetBorrar', borrarDeAqui);
    on('btnPausaSeguir', function(){ irA(ESTADO.i); });
    on('btnPausaBorrar', borrarDeAqui);
    on('btnNueva', hacerOtra);
    on('btnFiadorMas', function(){ _ocultar('w_fiador_mas', false); _ocultar('btnFiadorMas', true); });
    llenarFechas();
    _pintarPlan();
    retomar().then(function(){ if(!LEAD) _pintarPlan(); }).catch(function(e){ console.warn('retomar:', e); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
