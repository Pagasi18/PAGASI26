// ══════════════════════════════════════════════════════════════════════════
// PORTAL DEL CLIENTE (micuenta.html) — lado administrativo
//   1) Generar / revocar el acceso de un cliente al portal
//   2) Bandeja de comprobantes que suben los clientes (cola de revision)
// Los comprobantes NO son pagos: se aprueban abriendo el MISMO modal de
// "Registrar Pago" que usa el equipo, para no duplicar la contabilidad.
// ══════════════════════════════════════════════════════════════════════════

var _PORTAL_COMPS = [];          // comprobantes cargados (todos los estados)
var _PORTAL_COMPS_CARGADO = false;

function _pRandomToken(n){
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  var s = '';
  for(var i=0;i<(n||20);i++) s += abc.charAt(Math.floor(Math.random()*abc.length));
  return s;
}
function _pDigitos(s){ return String(s==null?'':s).replace(/\D/g,''); }
function _pBaseUrl(){
  try{
    var u = location.origin + location.pathname.replace(/[^\/]*$/,'');
    return u + 'micuenta.html';
  }catch(e){ return 'https://pagasi.io/micuenta.html'; }
}

// ── 1. Acceso del cliente al portal ─────────────────────────────────────
function portalAcceso(clienteId){
  var cli = (S.clientes||[]).find(function(x){ return String(x.id)===String(clienteId); });
  if(!cli){ toast('Cliente no encontrado','error'); return; }
  var ced = _pDigitos(cli.cedula);
  if(ced.length < 5){
    toast('Este cliente no tiene cédula registrada. Agrégala primero para poder darle acceso.','error');
    return;
  }
  if(typeof db==='undefined' || !db){ toast('Sin conexión a Firebase','error'); return; }

  setMicon && setMicon('cliente');
  $('mtt').textContent = 'Acceso al portal';
  $('msb').textContent = cli.nombre || '';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div style="padding:22px 0;text-align:center;color:var(--ink3);font-size:12.5px">Buscando acceso...</div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>';
  $('ov').style.display = 'flex';

  // ¿Ya tiene un acceso activo? Reutilizarlo (no invalidar el link que ya envio).
  db.collection('accesos_cliente').where('clienteId','==',String(clienteId)).where('activo','==',true).limit(1).get()
    .then(function(snap){
      if(!snap.empty){
        var d = snap.docs[0];
        return {token:d.id, data:d.data(), nuevo:false};
      }
      var token = 'CLI-' + Date.now() + '-' + _pRandomToken(18);
      var payload = {
        clienteId: String(clienteId),
        cedulaNorm: ced,
        nombre: cli.nombre || '',
        activo: true,
        creadoPor: (S.currentUser && S.currentUser.nombre) || 'Admin',
        creadoEn: new Date().toISOString()
      };
      return db.collection('accesos_cliente').doc(token).set(payload).then(function(){
        return {token:token, data:payload, nuevo:true};
      });
    })
    // Restaurar tambien la entrada del indice: asi devolver el acceso rehabilita
    // la entrada por SMS y "revocar" no queda como algo irreversible.
    .then(function(res){
      var tel = (typeof _pTelE164==='function') ? _pTelE164(cli.tel) : '';
      if(!tel) return res;
      return db.collection('indice_clientes').doc(tel)
        .set({clienteId:String(clienteId), actualizadoEn:new Date().toISOString()})
        .then(function(){ return res; })
        .catch(function(){ return res; });
    })
    .then(function(res){
      var link = _pBaseUrl() + '?t=' + encodeURIComponent(res.token) + '&c=' + encodeURIComponent(clienteId);
      var tel = _pDigitos(cli.tel);
      var wa = tel ? ('https://wa.me/58' + tel.replace(/^0/,'') + '?text=' + encodeURIComponent(
        'Hola ' + (String(cli.nombre||'').split(' ')[0]) + ', desde Pagasi te compartimos tu acceso a Mi Cuenta. '
        + 'Ahi puedes ver tu saldo, tus cuotas y enviar tus comprobantes de pago:\n\n' + link
        + '\n\nPara entrar solo necesitas tu numero de cedula.')) : '';

      $('mbd').innerHTML =
        '<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:12px;padding:13px 15px;margin-bottom:13px">'
        + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);margin-bottom:7px">Enlace personal de ' + _pEsc(cli.nombre) + '</div>'
        + '<div style="font-family:var(--fd);font-size:11px;color:var(--p1);word-break:break-all;line-height:1.5">' + _pEsc(link) + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
        + '<button class="btn btn-p btn-sm" onclick="portalCopiar(\'' + _pEsc(link) + '\')">Copiar enlace</button>'
        + (wa ? '<a class="btn btn-s btn-sm" href="' + wa + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>' : '')
        + '<button class="btn btn-d btn-sm" onclick="portalRevocar(\'' + res.token + '\',\'' + String(clienteId) + '\')">Revocar acceso</button>'
        + '</div>'
        + '<div style="font-size:11.5px;color:var(--ink3);line-height:1.6">'
        + '<b>Cómo funciona:</b> el cliente abre el enlace y escribe su cédula (<b>' + ced + '</b>) para entrar. '
        + 'El enlace solo sirve con esa cédula, así que si se filtra no expone su información. '
        + 'La sesión le queda guardada en el teléfono, no tiene que volver a entrar cada vez.'
        + (res.nuevo ? '' : '<br><br>Este cliente <b>ya tenía</b> un acceso activo: es el mismo enlace que se le envió antes.')
        + '</div>';
    })
    .catch(function(e){
      console.error('portalAcceso:', e);
      $('mbd').innerHTML = '<div style="padding:16px;color:var(--red);font-size:12.5px">No se pudo generar el acceso: ' + _pEsc(e.message||e) + '</div>';
    });
}

function _pEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function portalCopiar(link){
  try{
    navigator.clipboard.writeText(link).then(function(){ toast('Enlace copiado','success'); },
      function(){ toast('Copia el enlace manualmente','info'); });
  }catch(e){ toast('Copia el enlace manualmente','info'); }
}

// Revocar de VERDAD. Hay tres puertas y hay que cerrar las tres:
//   1. el enlace personal  -> accesos_cliente.activo = false
//   2. la sesion ya abierta -> borrar sesiones_cliente (si no, el que ya entro
//      sigue viendo su informacion aunque le "quites" el acceso)
//   3. la entrada por SMS  -> borrar del indice; si no, pide otro codigo y entra
function portalRevocar(token, clienteId){
  if(!confirm('¿Revocar el acceso al portal?\n\n· Se invalida su enlace personal\n· Se cierra la sesión que tenga abierta ahora\n· No podrá entrar con el código por SMS\n\nPuedes devolverle el acceso después con el mismo botón Portal.')) return;

  var cid = String(clienteId);
  var cli = (S.clientes||[]).find(function(x){ return String(x.id)===cid; }) || {};
  var tel = (typeof _pTelE164==='function') ? _pTelE164(cli.tel) : '';
  var cerradas = 0;

  // 1. Desactivar TODOS los accesos activos del cliente (no solo el que se ve)
  db.collection('accesos_cliente').where('clienteId','==',cid).where('activo','==',true).get()
    .then(function(snap){
      var ops = snap.docs.map(function(d){
        return d.ref.update({activo:false, revocadoEn:new Date().toISOString()});
      });
      // por si el token abierto en pantalla no salio en la consulta
      if(token && !snap.docs.some(function(d){ return d.id===token; })){
        ops.push(db.collection('accesos_cliente').doc(token)
          .update({activo:false, revocadoEn:new Date().toISOString()}).catch(function(){}));
      }
      return Promise.all(ops);
    })
    // 2. Cerrar las sesiones abiertas
    .then(function(){
      return db.collection('sesiones_cliente').where('clienteId','==',cid).get();
    })
    .then(function(snap){
      cerradas = snap.size;
      return Promise.all(snap.docs.map(function(d){ return d.ref.delete(); }));
    })
    // 3. Quitarlo del indice para que no pueda entrar con SMS
    .then(function(){
      if(!tel) return null;
      return db.collection('indice_clientes').doc(tel).delete().catch(function(){});
    })
    .then(function(){
      toast('Acceso revocado' + (cerradas ? ' · ' + cerradas + ' sesión(es) cerrada(s)' : ''), 'success');
      if(typeof logActividad==='function') logActividad('portal_acceso_revocado','clientes',cid,
        {token:token, sesionesCerradas:cerradas, indiceBorrado:!!tel});
      closeM();
    })
    .catch(function(e){
      console.error('portalRevocar:', e);
      toast('No se pudo revocar del todo: '+(e.message||e),'error');
    });
}

// ── 2. Bandeja de comprobantes ──────────────────────────────────────────
function portalCargarComprobantes(cb){
  if(typeof db==='undefined' || !db){ if(cb) cb(); return; }
  db.collection('comprobantes').get().then(function(s){
    _PORTAL_COMPS = s.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
    _PORTAL_COMPS_CARGADO = true;
    if(cb) cb();
  }).catch(function(e){
    console.warn('comprobantes:', e && e.message);
    _PORTAL_COMPS = []; _PORTAL_COMPS_CARGADO = true;
    if(cb) cb();
  });
}

function portalPendientes(){
  return _PORTAL_COMPS.filter(function(c){ return (c.estado||'pendiente')==='pendiente'; });
}

// Card para insertar en el modulo Cobranza. Solo aparece si hay pendientes.
function portalComprobantesCard(){
  if(!_PORTAL_COMPS_CARGADO){
    // Cargar en segundo plano y redibujar Cobranza cuando llegue
    portalCargarComprobantes(function(){
      if(S.page==='pagos' && portalPendientes().length && typeof nav==='function') nav('pagos');
    });
    return '';
  }
  var pend = portalPendientes();
  if(!pend.length) return '';
  pend.sort(function(a,b){ return String(a.creadoEn||'').localeCompare(String(b.creadoEn||'')); });

  var rows = pend.map(function(c){
    var cred = (S.creds||[]).find(function(x){ return String(x.id)===String(c.credId); });
    var quien = c.clienteNombre || (cred && cred.cli) || '—';
    return '<tr>'
      + '<td class="tdm">' + _pEsc(quien) + '</td>'
      + '<td class="tds" style="font-family:var(--fd)">' + _pEsc(c.credId||'—') + '</td>'
      + '<td class="tds">' + _pEsc(c.fecha||'') + '</td>'
      + '<td style="font-weight:800;font-family:var(--fd)">' + fmt(c.monto||0) + '</td>'
      + '<td class="tds">' + _pEsc(c.metodo||'') + (c.referencia?'<div style="font-size:10px;color:var(--ink3)">Ref ' + _pEsc(c.referencia) + '</div>':'') + '</td>'
      + '<td><div style="display:flex;gap:4px;flex-wrap:wrap">'
      + (c.fotoUrl ? '<a class="btn btn-g btn-xs" href="' + _pEsc(c.fotoUrl) + '" target="_blank" rel="noopener">Ver foto</a>' : '')
      + '<button class="btn btn-p btn-xs" onclick="portalCompRegistrar(\'' + c.id + '\')">Registrar pago</button>'
      + '<button class="btn btn-d btn-xs" onclick="portalCompRechazar(\'' + c.id + '\')">Rechazar</button>'
      + '</div></td></tr>';
  }).join('');

  return '<div class="card" style="margin-bottom:12px;border-left:3px solid var(--amber)">'
    + '<div class="ch" style="margin-bottom:10px"><div>'
    + '<div class="ct">Comprobantes enviados por clientes</div>'
    + '<div class="cs">Los subieron desde Mi Cuenta · revisa la foto y registra el pago</div>'
    + '</div><span class="bdg b-a">' + pend.length + '</span></div>'
    + '<div class="tw"><table><thead><tr><th>Cliente</th><th>Crédito</th><th>Fecha</th><th>Monto</th><th>Método</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div></div>';
}

// Aprobar = abrir el modal normal de Registrar Pago, prellenado, y marcar el
// comprobante solo si el pago se guardo de verdad.
function portalCompRegistrar(compId){
  var c = _PORTAL_COMPS.find(function(x){ return x.id===compId; });
  if(!c){ toast('Comprobante no encontrado','error'); return; }
  var cred = (S.creds||[]).find(function(x){ return String(x.id)===String(c.credId); });
  if(!cred){ toast('El crédito '+(c.credId||'')+' no está activo. Revísalo a mano.','error'); return; }

  openAddPago(c.credId);
  setTimeout(function(){
    if($('p_monto')) $('p_monto').value = c.monto || '';
    if($('p_fecha') && c.fecha) $('p_fecha').value = String(c.fecha).slice(0,10);
    if($('p_ref')) $('p_ref').value = c.referencia || ('Portal ' + String(compId).slice(0,6));
    // Envolver el guardado original: si el pago se registra, marcar aprobado.
    var orig = S.saveFn;
    S.saveFn = function(){
      var r = orig();
      if(r !== false) portalCompMarcar(compId, 'aprobado', '');
      return r;
    };
  }, 130);
}

function portalCompRechazar(compId){
  var nota = prompt('¿Por qué se rechaza? (el cliente lo verá en su portal)', 'No se pudo verificar el pago');
  if(nota===null) return;
  portalCompMarcar(compId, 'rechazado', nota || '');
}

function portalCompMarcar(compId, estado, nota){
  var upd = {
    estado: estado,
    notaStaff: nota || '',
    revisadoPor: (S.currentUser && S.currentUser.nombre) || 'Admin',
    revisadoEn: new Date().toISOString()
  };
  db.collection('comprobantes').doc(compId).update(upd)
    .then(function(){
      var i = _PORTAL_COMPS.findIndex(function(x){ return x.id===compId; });
      if(i>=0) _PORTAL_COMPS[i] = Object.assign(_PORTAL_COMPS[i], upd);
      if(typeof logActividad==='function') logActividad('comprobante_'+estado,'pagos',compId,upd);
      toast(estado==='aprobado' ? 'Comprobante aprobado' : 'Comprobante rechazado', estado==='aprobado'?'success':'info');
      if(S.page==='pagos' && typeof nav==='function') nav('pagos');
      // El momento de dopamina: avisarle que su pago entro y como quedo su racha.
      // Es lo que de verdad mueve el comportamiento de pago.
      if(estado==='aprobado') setTimeout(function(){ portalFelicitar(compId); }, 500);
    })
    .catch(function(e){ toast('No se pudo actualizar: '+(e.message||e),'error'); });
}

// ══════════════════════════════════════════════════════════════════════════
// NORMALIZACION DE DATOS PARA EL PORTAL
// El cliente entra con su telefono + codigo SMS. Para eso hacen falta dos
// cosas en cada ficha: cedulaNorm (solo digitos) y telE164 (+584141234567,
// el formato exacto que Firebase pone en el token al verificar por SMS), mas
// un indice telefono -> clienteId para poder ubicarlo antes de tener sesion.
// SIEMPRE muestra un informe primero: no escribe hasta que se confirme.
// ══════════════════════════════════════════════════════════════════════════

var _PORTAL_PLAN = null;   // resultado del analisis, listo para aplicar

// Prefijos de celular en Venezuela (los fijos no reciben SMS)
var _PORTAL_PREFIJOS = ['412','414','416','424','426'];

function _pTelE164(v){
  var d = String(v==null?'':v).replace(/\D/g,'');
  if(d.indexOf('58')===0 && d.length===12) d = d.slice(2);
  else if(d.indexOf('0')===0) d = d.slice(1);
  if(d.length !== 10) return '';
  if(_PORTAL_PREFIJOS.indexOf(d.slice(0,3)) === -1) return '';   // fijo u otro
  return '+58' + d;
}

function portalNormalizar(){
  var clientes = (S.clientes||[]).filter(function(c){ return c && !c.eliminado; });
  var listos = [], sinTel = [], porTel = {};

  clientes.forEach(function(c){
    var tel = _pTelE164(c.tel);
    var ced = _pDigitos(c.cedula);
    var item = {id:String(c.id), nombre:c.nombre||'', telOriginal:c.tel||'', telE164:tel, cedulaNorm:ced};
    if(!tel){ sinTel.push(item); return; }
    listos.push(item);
    (porTel[tel] = porTel[tel] || []).push(item);
  });

  var duplicados = Object.keys(porTel).filter(function(t){ return porTel[t].length > 1; })
    .map(function(t){ return {telE164:t, clientes:porTel[t]}; });
  var dupIds = {};
  duplicados.forEach(function(d){ d.clientes.forEach(function(x){ dupIds[x.id]=1; }); });

  // Solo indexamos telefonos sin ambiguedad; los repetidos se corrigen a mano
  var indexables = listos.filter(function(x){ return !dupIds[x.id]; });
  _PORTAL_PLAN = {listos:listos, indexables:indexables, sinTel:sinTel, duplicados:duplicados};

  var h = '<div style="font-size:12.5px;color:var(--ink2);line-height:1.6;margin-bottom:14px">'
    + 'Esto es lo que encontré en <b>' + clientes.length + '</b> clientes. Nada se ha guardado todavía.</div>'
    + '<div class="sg" style="grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">'
    + '<div class="stat"><div class="st-v" style="color:var(--green);font-size:24px">' + indexables.length + '</div>'
    + '<div class="st-l">Podrán entrar con SMS</div></div>'
    + '<div class="stat"><div class="st-v" style="color:var(--amber);font-size:24px">' + sinTel.length + '</div>'
    + '<div class="st-l">Sin celular válido</div></div>'
    + '<div class="stat"><div class="st-v" style="color:var(--red);font-size:24px">' + duplicados.length + '</div>'
    + '<div class="st-l">Teléfonos repetidos</div></div>'
    + '</div>';

  if(sinTel.length){
    h += '<details style="margin-bottom:10px"><summary style="cursor:pointer;font-size:12px;font-weight:800;color:var(--amber)">Ver los ' + sinTel.length + ' sin celular válido</summary>'
      + '<div style="max-height:170px;overflow-y:auto;margin-top:8px;font-size:11.5px;line-height:1.8">'
      + sinTel.map(function(x){ return '· ' + _pEsc(x.nombre) + ' <span style="color:var(--ink3)">(' + (_pEsc(x.telOriginal)||'sin teléfono') + ')</span>'; }).join('<br>')
      + '</div><div style="font-size:11px;color:var(--ink3);margin-top:8px;line-height:1.5">Estos entran con el enlace personal (botón Portal en su ficha). Si les corriges el celular y vuelves a correr esto, podrán usar el SMS.</div></details>';
  }
  if(duplicados.length){
    h += '<details style="margin-bottom:10px"><summary style="cursor:pointer;font-size:12px;font-weight:800;color:var(--red)">Ver los ' + duplicados.length + ' teléfonos repetidos</summary>'
      + '<div style="max-height:170px;overflow-y:auto;margin-top:8px;font-size:11.5px;line-height:1.8">'
      + duplicados.map(function(d){ return '· <b>' + d.telE164 + '</b>: ' + d.clientes.map(function(x){ return _pEsc(x.nombre); }).join(' / '); }).join('<br>')
      + '</div><div style="font-size:11px;color:var(--ink3);margin-top:8px;line-height:1.5">Dos o más clientes comparten el mismo número, así que no se puede saber quién entra. Los dejo fuera del SMS a propósito: usan el enlace personal hasta que corrijas los números.</div></details>';
  }

  h += '<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:11px 13px;font-size:11.5px;color:var(--ink2);line-height:1.6">'
    + '<b>Qué va a escribir:</b> agrega <span style="font-family:var(--fd)">cedulaNorm</span> y <span style="font-family:var(--fd)">telE164</span> a '
    + listos.length + ' fichas y crea ' + indexables.length + ' entradas de índice. '
    + 'No borra ni modifica ningún dato existente: solo agrega esos dos campos.</div>';

  setMicon && setMicon('config');
  $('mtt').textContent = 'Preparar el portal del cliente';
  $('msb').textContent = clientes.length + ' clientes analizados';
  $('modal-box').className = 'modal modal-lg';
  $('mbd').innerHTML = h;
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + (indexables.length ? '<button class="btn btn-p" onclick="portalNormalizarAplicar()">Aplicar a ' + listos.length + ' clientes</button>' : '');
  $('ov').style.display = 'flex';
}

function portalNormalizarAplicar(){
  if(!_PORTAL_PLAN){ toast('Corre primero el análisis','error'); return; }
  var listos = _PORTAL_PLAN.listos, indexables = _PORTAL_PLAN.indexables;
  var idxSet = {}; indexables.forEach(function(x){ idxSet[x.id]=1; });

  $('mbd').innerHTML = '<div style="padding:26px 0;text-align:center;color:var(--ink3);font-size:12.5px">Guardando... no cierres esta ventana.</div>';
  $('mft').innerHTML = '';

  // Lotes de 150 clientes (max 2 operaciones cada uno, tope de 500 por lote)
  var lotes = [], TAM = 150;
  for(var i=0;i<listos.length;i+=TAM) lotes.push(listos.slice(i,i+TAM));

  var hechos = 0;
  function correrLote(n){
    if(n >= lotes.length){
      toast('Listo: ' + hechos + ' clientes preparados para el portal','success');
      if(typeof logActividad==='function') logActividad('portal_normalizar','config','clientes',{fichas:listos.length, indice:indexables.length});
      closeM();
      return;
    }
    var batch = db.batch();
    lotes[n].forEach(function(x){
      batch.update(db.collection('clientes').doc(x.id), {telE164:x.telE164, cedulaNorm:x.cedulaNorm});
      if(idxSet[x.id]){
        batch.set(db.collection('indice_clientes').doc(x.telE164), {clienteId:x.id, actualizadoEn:new Date().toISOString()});
      }
      // Mantener en memoria para no tener que recargar
      var cl = (S.clientes||[]).find(function(c){ return String(c.id)===x.id; });
      if(cl){ cl.telE164 = x.telE164; cl.cedulaNorm = x.cedulaNorm; }
    });
    batch.commit().then(function(){
      hechos += lotes[n].length;
      correrLote(n+1);
    }).catch(function(e){
      console.error('normalizar lote '+n+':', e);
      $('mbd').innerHTML = '<div style="padding:16px;color:var(--red);font-size:12.5px">Se guardaron ' + hechos + ' clientes y falló el resto: '
        + _pEsc(e.message||e) + '<br><br>Puedes volver a correrlo: los ya guardados simplemente se reescriben igual.</div>';
      $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>';
    });
  }
  correrLote(0);
}

// ── 3. Aviso de felicitacion al cliente (el "momento de dopamina") ──────
// Al aprobar el pago le mandamos por WhatsApp la confirmacion + como quedo su
// racha y cuanto le falta para el proximo nivel. El mensaje va listo: el
// empleado solo toca enviar.
function portalFelicitar(compId){
  var comp = _PORTAL_COMPS.find(function(x){ return x.id===compId; });
  if(!comp) return;
  var cred = (S.creds||[]).find(function(x){ return String(x.id)===String(comp.credId); });
  var cli = (S.clientes||[]).find(function(x){
    return (comp.clienteId && String(x.id)===String(comp.clienteId))
        || (cred && x.nombre===cred.cli);
  }) || {};

  // Recalcular su racha y nivel YA con este pago aplicado
  var g = null;
  try{
    if(cred && typeof CreditoLedger!=='undefined' && typeof Gamificacion!=='undefined'){
      var gracia = (typeof PLAN!=='undefined' && PLAN.diasGracia!=null) ? PLAN.diasGracia : 5;
      var est = CreditoLedger.generarEstadoCredito(cred, S.pagos, {diasGracia:gracia});
      var pgc = (S.pagos||[]).filter(function(p){ return String(p.cred)===String(cred.id); });
      g = Gamificacion.calcularRacha(est, pgc, gracia, hoyLocalISO());
    }
  }catch(e){ g = null; }

  var nombre = String(cli.nombre || (cred&&cred.cli) || '').split(' ')[0];
  var txt = 'Hola ' + nombre + ', recibimos tu pago de $' + (parseFloat(comp.monto)||0).toFixed(2) + '. Gracias!';
  if(g){
    if(g.racha > 0){
      txt += '\n\nLlevas ' + g.racha + (g.racha===1?' pago puntual':' pagos puntuales seguidos')
           + ' y tienes ' + g.puntos + ' puntos.';
    } else {
      txt += '\n\nTienes ' + g.puntos + ' puntos acumulados.';
    }
    if(g.nivel && g.nivel.cupo > 0){
      txt += '\nEres cliente ' + g.nivel.nom + ': puedes pedir hasta $' + g.nivel.cupo
           + ' en cauchos, casco, aceite, repuestos o mantenimiento en tu concesionario, financiado en tus cuotas.';
    }
    if(g.siguiente && g.faltan > 0){
      txt += '\nTe ' + (g.faltan===1?'falta':'faltan') + ' ' + g.faltan
           + (g.faltan===1?' pago puntual':' pagos puntuales') + ' para nivel ' + g.siguiente.nom + '.';
    }
  }
  txt += '\n\nRevisa tu cuenta: ' + _pBaseUrl();

  var tel = _pDigitos(cli.tel);
  var wa = tel ? ('https://wa.me/58' + tel.replace(/^0/,'') + '?text=' + encodeURIComponent(txt)) : '';

  setMicon && setMicon('pago');
  $('mtt').textContent = 'Avisarle al cliente';
  $('msb').textContent = (cli.nombre || (cred&&cred.cli) || '') + ' · ' + (comp.credId||'');
  $('modal-box').className = 'modal';
  $('mbd').innerHTML =
    (g && g.nivel ? '<div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">'
      + '<span style="font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:4px 11px;border-radius:20px;color:'
      + g.nivel.col + ';background:' + g.nivel.bg + '">' + g.nivel.nom + '</span>'
      + (g.racha>0 ? '<span style="font-size:12px;font-weight:700;color:var(--ink2)">' + g.racha + ' pagos puntuales seguidos</span>' : '')
      + '<span style="font-size:12px;font-weight:700;color:var(--ink3);margin-left:auto">' + g.puntos + ' pts</span>'
      + '</div>' : '')
    + '<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:12px;padding:13px 15px;font-size:12.5px;color:var(--ink2);line-height:1.6;white-space:pre-wrap">'
    + _pEsc(txt) + '</div>'
    + '<div style="font-size:11.5px;color:var(--ink3);margin-top:11px;line-height:1.5">'
    + (wa ? 'El mensaje va listo. Al enviarlo, el cliente ve que su pago entró y cuánto le falta para su próximo premio.'
          : 'Este cliente no tiene teléfono registrado, así que no podemos avisarle. Agrégalo en su ficha.')
    + '</div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Después</button>'
    + (wa ? '<a class="btn btn-s" href="' + wa + '" target="_blank" rel="noopener" onclick="closeM()">Enviar por WhatsApp</a>' : '');
  $('ov').style.display = 'flex';
}
