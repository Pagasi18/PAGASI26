/* Existing request validation, scoring, payload and Firebase submission. */
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
    console.log('Firebase OK');
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

var cur=1;
function goS(s){
  if(cur===1&&s===2){
    var req=['wz_nom','wz_ci','wz_tel','wz_emp','wz_ing'];
    for(var i=0;i<req.length;i++){
      var reqEl=document.getElementById(req[i]);
      if(!reqEl || !String(reqEl.value||'').trim()){
        alert('Por favor completa los campos requeridos.');
        return false;
      }
    }
  }
  var totalSteps = document.querySelectorAll('.prog .ps').length || 2;
  document.querySelectorAll('.fs').forEach(function(el){ if(el) el.classList.remove('on'); });
  document.querySelectorAll('.prog .ps').forEach(function(el){ if(el) el.classList.remove('on'); });
  cur=s;
  var fs=document.getElementById('fs'+cur);
  var pd=document.getElementById('pd'+cur);
  if(fs) fs.classList.add('on');
  if(pd) pd.classList.add('on');
  for(var j=1;j<cur;j++){
    var doneEl=document.getElementById('pd'+j);
    if(doneEl) doneEl.classList.add('done');
  }
  for(var j=cur;j<=totalSteps;j++){
    var stepEl=document.getElementById('pd'+j);
    if(stepEl && j!==cur) stepEl.classList.remove('done');
    if(stepEl && j===cur) stepEl.classList.remove('done');
  }
  return false;
}


function calcCrediScore(){
  var g=function(id){ var el=document.getElementById(id); return el?el.value:''; };
  var ing=parseFloat(g('wz_ing'))||0;
  var ifam=parseFloat(g('wz_ifam'))||0;
  var emp=g('wz_emp')||'';
  var ant=g('wz_ant')||'';
  var hist=g('wz_hist_g')||'ninguno';
  var deuda=g('wz_deuda_g')||'no';
  var dep=parseInt(g('wz_dep_g')||0,10)||0;
  var banco=g('wz_banco')||'activa';
  var viv=g('wz_viv')||'propia';
  var rem=g('wz_rem')||'no';
  var conocio=g('wz_conocio')||'';
  var cashea=g('wz_cashea')||'no';
  var casheaNivel=parseInt(g('wz_cashea_nivel')||0,10)||0;
  var fiador=(g('wz_fiador')||'no')==='si';
  var ingEf=Math.max(ing,ifam);
  var ratio=0;
  var f1={ninguno:50,bueno:100,mora_leve:35,malo:5}[hist]||50;
  if(deuda==='menores')f1=Math.max(0,f1-12); else if(deuda==='graves')f1=Math.max(0,f1-35);
  if(banco==='activa')f1=Math.min(100,f1+10); else if(banco==='no')f1=Math.max(0,f1-10);
  if(cashea==='si')f1=Math.min(100,f1+(casheaNivel>=3?18:casheaNivel>=2?10:5));
  var ingBase={formal:80,publico:70,independiente:60,comerciante:65,delivery:70,remesas:55,informal:30};
  var f2=ingEf>0?Math.min(100,((ingEf-100)/900)*100+30):0;
  if(emp)f2=Math.min(100,f2*(ingBase[emp]||50)/70);
  if(dep===1)f2=Math.max(0,f2-8); else if(dep===2)f2=Math.max(0,f2-18); else if(dep>=3)f2=Math.max(0,f2-28);
  if(viv==='propia')f2=Math.min(100,f2+10); else if(viv==='alquilada')f2=Math.max(0,f2-8);
  var empBase={formal:78,publico:70,independiente:65,comerciante:68,delivery:70,remesas:60,informal:38};
  var antBase={'1':0,'2':10,'3':22,'5':35};
  var f3=Math.min(100,(empBase[emp]||30)+(antBase[ant]||0));
  if(rem==='si'&&emp!=='remesas')f3=Math.min(100,f3+8);
  var f4=25; if(fiador)f4=Math.min(100,f4+45); if(viv==='propia')f4=Math.min(100,f4+15); else if(viv==='familiar')f4=Math.min(100,f4+5); if(banco==='activa')f4=Math.min(100,f4+10); else if(banco==='no')f4=Math.max(0,f4-10);
  var f5=50; if(conocio==='referido')f5=Math.min(100,f5+30); else if(conocio==='anterior')f5=Math.min(100,f5+22); else if(conocio==='redes')f5=Math.min(100,f5+5); if(deuda==='no')f5=Math.min(100,f5+10); else if(deuda==='graves')f5=Math.max(0,f5-15); if(rem==='si')f5=Math.min(100,f5+8);
  var hardReject=(ingEf>0&&ingEf<100)||(hist==='malo'&&deuda==='graves');
  var raw=Math.round((f1*30+f2*30+f3*20+f4*15+f5*5)/100*10);
  var score=hardReject?300:Math.max(300,Math.min(850,Math.round(300+(raw/1000)*550)));
  return {score:score,f1:Math.round(f1),f2:Math.round(f2),f3:Math.round(f3),f4:Math.round(f4),f5:Math.round(f5),ratio:ratio};
}

// Sin < > " ' ` \ y con & como "y": las Reglas de Firestore rechazan un lead con esos
// caracteres (con ellos se puede meter codigo en el panel; punto 1, 19-sep).
// "V-12.345.678" → "WEB-12345678". Sin digitos suficientes, vuelve al numero por hora.
function _idLead(cedula){
  var d = String(cedula||'').replace(/[^0-9]/g,'').replace(/^0+/,'');
  return (d.length>=6 && d.length<=12) ? ('WEB-'+d) : ('WEB-'+Date.now());
}

function _v(id){ var e=document.getElementById(id); return e ? String(e.value||'').replace(/&/g,' y ').replace(/[<>"'`\\]/g,'').replace(/\s+/g,' ').trim() : ''; }
function _n(id){ var e=document.getElementById(id); return e ? (parseFloat(e.value)||0) : 0; }
function _i(id){ var e=document.getElementById(id); return e ? (parseInt(e.value,10)||0) : 0; }

function buildClientePayload(){
  var scoreData=calcCrediScore();
  var motoSelEl=document.getElementById('fM');
  var motoId=motoSelEl ? (parseInt(motoSelEl.value,10) || null) : null;
  var motoData = (motoId != null && !isNaN(motoId)) ? CATALOG.find(function(m){ return m.id===motoId; }) : null;
  var now = new Date().toISOString();
  return {
    // ──── Identificación ────────────────────────────────────────
    // El numero de la ficha sale de la CEDULA, no de la hora: asi la base misma impide
    // que la misma persona quede registrada dos veces (el panel si revisaba la cedula,
    // la web no; punto 21, 21-sep-2026). Sin cedula legible, se usa la hora como antes.
    id: _idLead(_v('wz_ci')),
    nombre: _v('wz_nom'),
    cedula: _v('wz_ci'),
    rif: '',
    nacionalidad: '',
    // ──── Contacto ──────────────────────────────────────────────
    tel: _v('wz_tel'),
    wa: _v('wz_wa') || _v('wz_tel'),
    email: _v('wz_email'),
    // ──── Ubicación ─────────────────────────────────────────────
    ciudad: _v('wz_ciudad_res') || _v('wz_ciudad'),
    estado_ubi: _v('wz_estado'),
    dir: _v('wz_dir_det'),
    tiempo_dir: _v('wz_tdir'),
    vivienda: _v('wz_viv') || 'propia',
    // ──── Terremoto (evaluación de riesgo) ─────────────────────
    terremoto_afectado: _v('wz_terremoto') || 'no',
    terremoto_danos: (_v('wz_terremoto')==='si') ? (_v('wz_terremoto_danos')||'leves') : '',
    // ──── Empleo / Ingresos ────────────────────────────────────
    trabajo: _v('wz_emp'),
    empresa: _v('wz_empresa'),
    cargo: _v('wz_cargo'),
    dir_trabajo: '',
    tel_trabajo: '',
    antiguedad: _v('wz_ant'),
    ingreso: _n('wz_ing'),
    ingreso_familiar: _n('wz_ifam'),
    remesas: _v('wz_rem') || 'no',
    dependientes: _i('wz_dep_g'),
    // ──── Historial crediticio / Banco ──────────────────────────
    historial: _v('wz_hist_g') || 'ninguno',
    deudas: _v('wz_deuda_g') || 'no',
    banco_estado: _v('wz_banco') || 'activa',
    banco_nombre: _v('wz_banco_nm'),
    banco_cobro: _v('wz_banco_cobro'),
    cuenta_digitos: _v('wz_cuenta'),
    ahorro: _v('wz_ahorro') || 'no',
    // ──── Cashea (todos los campos del admin) ───────────────────
    cashea: _v('wz_cashea') || 'no',
    cashea_nivel: _v('wz_cashea_nivel'),
    cashea_pago: _v('wz_cashea_pago'),
    cashea_estado: '',
    cashea_deuda: 'no',
    cashea_monto: 0,
    cashea_cuotas_pend: 0,
    cashea_ultimo_art: '',
    cashea_ultimo_monto: 0,
    cashea_ultima_fecha: '',
    cashea_total_compras: '',
    cashea_obs: '',
    // ──── Fiador ────────────────────────────────────────────────
    fiador: _v('wz_fiador') || 'no',
    fiador_nom: _v('wz_fiador_nom'),
    fiador_tel: _v('wz_fiador_tel'),
    fiador_ci: _v('wz_fiador_ci'),
    fiador_rif: '',
    fiador_dir: '',
    fiador_email: '',
    fiador_rel: _v('wz_fiador_rel'),
    // ──── Referencias ───────────────────────────────────────────
    ref1: { nom:_v('wz_r1n'), ci:'', tel:_v('wz_r1t'), rel:_v('wz_r1r'), obs:_v('wz_r1obs') },
    ref2: { nom:_v('wz_r2n'), ci:'', tel:_v('wz_r2t'), rel:_v('wz_r2r'), obs:_v('wz_r2obs') },
    // ──── Documentos / Notas / Score ────────────────────────────
    docs_count: 0,
    documentos: [],
    impresion: '',
    notas: motoData ? ('Lead web · Interesado en ' + motoData.name + ' ($' + motoData.price.toLocaleString('en-US') + ' · ' + motoData.sede + ')') : 'Lead web sin moto específica',
    conocio: _v('wz_conocio'),
    score_indexa: scoreData.score,
    f1: scoreData.f1, f2: scoreData.f2, f3: scoreData.f3, f4: scoreData.f4, f5: scoreData.f5,
    // ──── Moto de interés (extra, útil para el asesor) ──────────
    moto_interes_id: motoData ? motoData.id : null,
    moto_interes_modelo: motoData ? motoData.name : '',
    moto_interes_precio: motoData ? motoData.price : 0,
    moto_interes_sede: motoData ? motoData.sede : '',
    // ──── Metadata Pagasi ───────────────────────────────────────
    estado: 'lead',
    origen: 'web',
    creado: now,
    editadoEn: now,
    editadoPor: 'Lead web'
  };
}

async function submitF(){
  if(window.__submittingSolicitud) return;
  window.__submittingSolicitud = true;
  var payload=buildClientePayload();
  // Validación mínima — campos críticos para identificar al lead.
  // Si falta uno, salimos y permitimos reintentar.
  if(!payload.nombre || !payload.cedula || !payload.tel){
    alert('Completa al menos Nombre, Cédula y Teléfono.');
    window.__submittingSolicitud = false;
    return;
  }
  var btns=document.querySelectorAll('#fs2 .btn');
  btns.forEach(function(b){b.disabled=true;});
  var btn=document.getElementById('btnGuardarSolicitud');
  if(btn) btn.textContent='Guardando...';
  try{
    if((!FIREBASE_READY||!fbAuth||!db) && !initFirebaseSolicitar()) throw new Error('Firebase no disponible');
    if(!fbAuth.currentUser) await fbAuth.signInAnonymously();
    // El formulario público SÓLO puede crear un lead nuevo. Las reglas de
    // Firestore ya no dejan que una sesión anónima LEA ni EDITE clientes
    // existentes, así que no buscamos duplicados desde aquí (eso expondría la
    // base). Si la misma persona envía dos veces, el equipo unifica el lead
    // duplicado desde el panel.
    await db.collection('clientes').doc(String(payload.id)).set(payload);
    // SEGURIDAD: cerrar la sesión anónima para que no quede activa en el navegador
    // (evita que ese mismo navegador entre luego a /admin con una sesión autenticada).
    try{ await fbAuth.signOut(); }catch(_e){}
    document.getElementById('fs2').classList.remove('on');
    document.getElementById('fOK').style.display='block';
    document.getElementById('pd2').classList.remove('on');
    document.getElementById('pd2').classList.add('done');
    document.getElementById('okText').textContent='Tu solicitud llegó a Pagasi. Un asesor te contactará en menos de 24 horas para finalizar el proceso.';
  }catch(err){
    console.error('submitF:',err);
    // La base rechaza por dos motivos: la ficha ya existe (la misma persona mandando otra
    // vez) o algun dato no paso la validacion. No se puede distinguir desde aqui, asi que
    // el mensaje cubre los dos y ofrece WhatsApp (antes decia "recibida" siempre).
    var rechazo = err && (err.code==='permission-denied' || /permission|insufficient/i.test(String(err.message||'')));
    if(rechazo){
      var okEl=document.getElementById('fOK'), okTxt=document.getElementById('okText');
      var fs2=document.getElementById('fs2'), pd2=document.getElementById('pd2');
      if(fs2) fs2.classList.remove('on');
      if(pd2){ pd2.classList.remove('on'); pd2.classList.add('done'); }
      if(okEl) okEl.style.display='block';
      if(okTxt) okTxt.textContent='Si ya nos enviaste tu solicitud antes, ya la tenemos y un asesor te contactará. Si es la primera vez, revisa que tu cédula y tus datos estén completos o escríbenos por WhatsApp.';
    } else {
      alert('Error: '+(err.message||err));
    }
  }finally{
    window.__submittingSolicitud = false;
    btns.forEach(function(b){b.disabled=false;});
    if(btn) btn.textContent='Guardar en Pagasi';
  }
}

(function(){
  function bindSolicitudButtons(){
    var b1=document.getElementById('btnContinuarSolicitud');
    if(b1) b1.addEventListener('click', function(ev){ ev.preventDefault(); goS(2); });
    var b2=document.getElementById('btnAtrasSolicitud');
    if(b2) b2.addEventListener('click', function(ev){ ev.preventDefault(); goS(1); });

  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindSolicitudButtons);
  else bindSolicitudButtons();
})();

function setR(on,off){var a=document.getElementById(on), b=document.getElementById(off); if(a)a.classList.add('on'); if(b)b.classList.remove('on');}
function showUp(inp,zId){}
