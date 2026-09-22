// Pagasi logic: aprobaciones
function _aprGetPendientes(){
  return _concFiltrar(S.creds||[]).filter(function(c){
    return !c.eliminado && c.estado === 'pendiente_revision';
  });
}

// Render del módulo Aprobaciones
function _aprRender(){
  var pendientes = _aprGetPendientes();
  // Ordenar más recientes primero
  pendientes.sort(function(a,b){ return (b.creado||'').localeCompare(a.creado||''); });

  var html = '<div class="page">'
    + (typeof pageBanner === 'function'
      ? pageBanner(
          'Revisión de solicitudes · Aprobaciones pendientes',
          'Aprobaciones',
          '<b>'+pendientes.length+'</b> crédito'+(pendientes.length===1?'':'s')+' pendiente'+(pendientes.length===1?'':'s')+' de revisión.',
          [{label:'↻ Actualizar', onclick:"nav('aprobaciones')"}]
        )
      : '<h1 style="font-size:22px;margin:0 0 14px">Aprobaciones</h1>'
    )
    // KPI
    + '<div style="background:rgba(255,165,0,0.07);border:1px solid rgba(255,165,0,0.3);border-radius:10px;padding:11px 14px;margin-bottom:16px;font-size:11.5px;color:var(--ink2);line-height:1.6">'
    + '<strong style="color:var(--amber)">Bandeja de aprobaciones.</strong> '
    + 'Los vendedores en modo concesionario crean créditos que aparecen aquí. Revísalos y aprueba para que pasen a estado activo, o rechaza con una razón.'
    + '</div>';

  if(pendientes.length === 0){
    html += '<div style="padding:60px 20px;text-align:center;background:var(--surf);border-radius:14px;border:1px dashed var(--rim2)">'
      + '<div style="font-size:36px;margin-bottom:12px;opacity:.4">✓</div>'
      + '<div style="font-size:14px;font-weight:700;color:var(--ink2);margin-bottom:6px">Todo al día</div>'
      + '<div style="font-size:11.5px;color:var(--ink3);max-width:380px;margin:0 auto;line-height:1.55">No hay créditos pendientes de revisión.</div>'
      + '</div>';
  } else {
    html += '<div style="display:grid;gap:12px">';
    pendientes.forEach(function(c){
      var sede = c.concesionarioId ? (_concGetById ? _concGetById(c.concesionarioId) : null) : null;
      var sedeName = sede ? sede.nombre : (c.concesionarioId ? '(eliminada)' : '— sin sede —');
      var score = c.score_indexa || 0;
      var scoreCol = score >= 625 ? 'var(--green)' : score >= 450 ? 'var(--amber)' : 'var(--red)';
      var scoreLbl = score >= 750 ? 'Excelente' : score >= 625 ? 'Bueno' : score >= 450 ? 'Regular' : 'Bajo';
      html += '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:14px;padding:16px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start">'
        + '<div>'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
        + '<span style="font-family:var(--fd);font-weight:800;font-size:14px">'+c.id+'</span>'
        + '<span style="background:rgba(255,165,0,.18);color:var(--amber);padding:3px 9px;border-radius:9px;font-size:9.5px;font-weight:800;letter-spacing:.4px">PENDIENTE REVISIÓN</span>'
        + '<span style="font-size:11px;color:var(--ink3)">creado '+(c.creado||'').slice(0,10)+'</span>'
        + '</div>'
        + '<div style="font-size:16px;font-weight:700;margin-bottom:4px">'+(c.cli||'—')+'</div>'
        + '<div style="font-size:12px;color:var(--ink2);margin-bottom:8px">'+(c.modelo||'—')+' · $'+(parseFloat(c.precio)||0).toFixed(2)+'</div>'
        + '<div style="display:grid;grid-template-columns:repeat(4,auto);gap:18px;font-size:11px;margin-top:9px">'
        + '<div><div style="color:var(--ink3);font-weight:700;font-size:9.5px;text-transform:uppercase">Sede</div><div style="font-weight:700;margin-top:1px">'+sedeName+'</div></div>'
        + '<div><div style="color:var(--ink3);font-weight:700;font-size:9.5px;text-transform:uppercase">Vendedor</div><div style="font-weight:700;margin-top:1px">'+(c.creadoPor||'—')+'</div></div>'
        + '<div><div style="color:var(--ink3);font-weight:700;font-size:9.5px;text-transform:uppercase">Score</div><div style="font-weight:800;margin-top:1px;color:'+scoreCol+'">'+score+' · '+scoreLbl+'</div></div>'
        + '<div><div style="color:var(--ink3);font-weight:700;font-size:9.5px;text-transform:uppercase">Cuota Q.</div><div style="font-family:var(--fd);font-weight:800;margin-top:1px">$'+(parseFloat(c.cuotaQ||c.cuota||0)).toFixed(2)+'</div></div>'
        + '</div>'
        + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'
        + '<button class="btn btn-s btn-sm" onclick="_aprAprobar(\''+c.id+'\')" style="min-width:120px">✓ Aprobar</button>'
        + '<button class="btn btn-d btn-sm" onclick="_aprRechazar(\''+c.id+'\')" style="min-width:120px">✕ Rechazar</button>'
        + '<button class="btn btn-g btn-sm" onclick="_aprVerDetalle(\''+c.id+'\')" style="min-width:120px">Ver Detalle</button>'
        + '</div>'
        + '</div>';
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// Aprobar un crédito → pasa a 'activo'.
// Abre un modal que EXIGE registrar la inicial (monto + método) en el momento
// de aprobar, para que nunca queden créditos activos sin su pago inicial
// (raíz de las discrepancias detectadas: antes se aprobaba sin registrar la
// inicial y luego se cargaba a mano, pudiendo diferir del plan).
function _aprAprobar(credId){
  var c = (S.creds||[]).find(function(x){return x.id === credId;});
  if(!c){ toast('Crédito no encontrado','error'); return; }
  if(c.estado !== 'pendiente_revision'){ toast('Este crédito no está pendiente','error'); return; }
  var iniPlan = parseFloat(c.ini)||0;
  var cuentas = (typeof _cuentasBanc !== 'undefined' && _cuentasBanc && _cuentasBanc.length) ? _cuentasBanc : [];
  // Arranca en "— Elegir cuenta —": antes venia "Efectivo USD", que no es ninguna de
  // las cuentas, y la inicial no aparecia en ningun saldo (punto 8, 19-sep)
  var opts = (cuentas.length ? '<option value="" selected>— Elegir cuenta —</option>' : '<option value="Efectivo USD">Efectivo USD</option>')
    + cuentas.map(function(cu){ return '<option value="'+String(cu.nombre).replace(/"/g,'')+'">'+String(cu.nombre).replace(/[<>]/g,'')+'</option>'; }).join('');
  $('mic').textContent='OK';
  $('mtt').textContent='Aprobar crédito '+credId;
  $('msb').textContent=(c.cli||'—')+' · '+(c.modelo||'—');
  $('modal-box').className='modal';
  $('mbd').innerHTML = '<div style="font-size:12px;color:var(--ink2);line-height:1.6;margin-bottom:12px">Al aprobar, el crédito pasa a <b>ACTIVO</b>. Registra la <b>inicial real recibida</b> para que quede asentada como pago (sin esto, el crédito quedaría activo sin inicial registrada).</div>'
    + '<div style="background:var(--gs);border:1px solid var(--rim2);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12px">Inicial según el plan ('+((parseFloat(c.inicialPct)||0)*100).toFixed(0)+'%): <b style="font-family:var(--fd)">'+fmt(iniPlan)+'</b></div>'
    + '<div class="fg"><label>Inicial recibida (USD) *</label><input class="fi" id="apr_ini_monto" type="number" step="0.01" value="'+iniPlan.toFixed(2)+'"></div>'
    + '<div class="fg" style="margin-top:8px"><label>Método / cuenta de la inicial *</label><select class="fs" id="apr_ini_metodo">'+opts+'</select></div>'
    + '<div class="fg" style="margin-top:8px"><label>Referencia (opcional)</label><input class="fi" id="apr_ini_ref" type="text" placeholder="N° de referencia, Binance, etc."></div>'
    + '<div id="apr_ini_warn" style="font-size:11px;color:var(--amber);margin-top:8px;display:none"></div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="_aprAprobarConfirm(\''+credId+'\')">✓ Aprobar y registrar inicial</button>';
  $('ov').style.display='flex';
  setTimeout(function(){
    var inp=$('apr_ini_monto'), warn=$('apr_ini_warn');
    if(inp&&inp.addEventListener){ inp.addEventListener('input',function(){
      var v=parseFloat(inp.value)||0; var d=Math.round((iniPlan-v)*100)/100;
      if(Math.abs(d)>0.01){ warn.style.display='block'; warn.textContent=(d>0?'La inicial recibida es '+fmt(d)+' MENOR al plan. Se registrará lo recibido; el faltante seguirá pendiente.':'La inicial recibida es '+fmt(-d)+' MAYOR al plan.'); }
      else { warn.style.display='none'; }
    }); }
  },60);
}

// Confirmar aprobación: cambia estado y registra pago inicial + movimiento.
function _aprAprobarConfirm(credId){
  var c = (S.creds||[]).find(function(x){return x.id === credId;});
  if(!c){ toast('Crédito no encontrado','error'); return; }
  if(c.estado !== 'pendiente_revision'){ toast('Este crédito ya no está pendiente','error'); closeM(); return; }
  // Si ya tiene su inicial registrada, aprobar otra vez crearia un segundo deposito
  if((S.pagos||[]).some(function(p){ return p && !p.eliminado && p.cred===c.id && (p.esInicial || p.tipoOperacion==='inicial_credito'); })){
    toast('Este crédito ya tiene su inicial registrada','error'); closeM(); return;
  }
  var monto = parseFloat(($('apr_ini_monto')&&$('apr_ini_monto').value)||'0');
  var metodo = ($('apr_ini_metodo')&&$('apr_ini_metodo').value) || '';
  if(!metodo){ toast('Elige en qué cuenta entró la inicial','error'); return; }
  var ref = ($('apr_ini_ref')&&$('apr_ini_ref').value) || '';
  if(!(monto>0)){ toast('Indica la inicial recibida','error'); return; }
  var nombreUser = (S.currentUser&&S.currentUser.nombre)||'Admin';
  c.estado = 'activo';
  c.aprobadoEn = new Date().toISOString();
  c.aprobadoPor = nombreUser;
  // El rechazo anterior queda como historia, pero deja de mandar: si no, cualquier
  // restauracion futura devolvia el credito a la cola (revisado el 22-sep-2026)
  c.rechazadoEn = null; c.rechazadoPor = null;
  if(DB && DB.saveCred) DB.saveCred(c);
  // Registrar la inicial como pago (mismo formato que la creación directa)
  var pagoIniId = 'PAG-'+Date.now();
  var pagoIni = {
    id:pagoIniId, cli:c.cli, cred:c.id, fecha:(typeof hoyLocalISO==='function'?hoyLocalISO():new Date().toISOString().slice(0,10)),
    monto:monto, metodo:metodo, cuenta:metodo, cobrador:nombreUser, referencia:ref,
    estado:'confirmado', tipoOperacion:'inicial_credito', esInicial:true, realizadoPor:nombreUser,
    tasaBs:window._tasaBsGlobal||1, concesionarioId: c.concesionarioId || (typeof _concDefaultId==='function'?_concDefaultId():null)
  };
  S.pagos.push(pagoIni);
  if(DB && DB.savePago) DB.savePago(pagoIni);
  var movIni = {
    id:'MOV-'+Date.now(), tipo:'deposito', tipoOperacion:'inicial_credito', conceptoPago:pagoIniId,
    creditoId:c.id, conceptoCredito:c.id, concepto:'Inicial · '+c.cli+' · '+c.id+' ('+(c.modelo||'')+')',
    monto:monto, cuentaDestino:metodo, fecha:pagoIni.fecha, referencia:ref, realizadoPor:nombreUser,
    hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false})
  };
  S.movimientos.push(movIni);
  if(DB && DB.saveMovimiento) DB.saveMovimiento(movIni);
  closeM();
  toast('Crédito aprobado · '+credId+' · Inicial '+fmt(monto)+' → '+metodo,'success');
  nav('aprobaciones');
}

// Rechazar un crédito → estado 'cancelado' con razón
function _aprRechazar(credId){
  var c = (S.creds||[]).find(function(x){return x.id === credId;});
  if(!c){ toast('Crédito no encontrado','error'); return; }
  if(c.estado !== 'pendiente_revision'){ toast('Este crédito no está pendiente','error'); return; }
  // Si la solicitud creo su propia moto, rechazarla ANULA su gasto de compra: eso pide el
  // mismo permiso que anular en Finanzas, y hay que pedirlo ANTES de escribir nada, para
  // no dejar el credito cancelado a medias (revisado el 22-sep-2026).
  var _motoPrev = (S.motos||[]).find(function(m){ return String(m.id)===String(c.motoId); });
  // La nota se compara por numero completo: "financiamiento CRED-14" no puede dar por
  // dueña a la moto de CRED-140 (mismo fallo del punto 19; revisado el 22-sep-2026).
  var _creoLaMoto = _motoPrev
    ? (String(_motoPrev.creadaEnCredito||'') === String(credId)
       || (typeof _movEsDelCredito==='function' && _movEsDelCredito({concepto:String(_motoPrev.notas||'')}, credId)))
    : (c.motoCreadaEnSolicitud === true);
  if(_creoLaMoto && typeof requireDeletePermission==='function' && !requireDeletePermission()) return;
  var razon = prompt('Razón para rechazar el crédito '+credId+':');
  if(!razon || !razon.trim()){
    if(razon !== null) toast('Debes indicar una razón','error');
    return;
  }
  c.estado = 'cancelado';
  c.rechazadoEn = new Date().toISOString();
  c.rechazadoPor = (S.currentUser&&S.currentUser.nombre)||'Admin';
  c.razonRechazo = razon.trim();
  if(DB && DB.saveCred) DB.saveCred(c);
  // La compra de la moto se descuenta al ENVIAR la solicitud. Si se rechaza, ese dinero
  // no salio: se devuelve y la moto vuelve a estar disponible (antes quedaba descontada
  // y la moto "financiada" con el nombre del cliente; punto 10, 21-sep-2026).
  var _devuelto = 0;
  var _moto = _motoPrev;
  // ¿La moto la creo ESTA solicitud? Manda la marca de la MOTO: el campo del credito
  // puede quedar viejo si alguien edito la solicitud y le cambio la moto, y entonces se
  // devolvia la compra de otra unidad (revisado el 22-sep-2026).
  var _laCreoEstaSolicitud = _creoLaMoto;
  if(c.motoId != null && c.motoId !== '' && _laCreoEstaSolicitud){
    var _audit = {
      eliminado:true,
      eliminadoPor:c.rechazadoPor,
      eliminadoEn:c.rechazadoEn,
      eliminadoRazon:'Solicitud rechazada · '+c.razonRechazo,
      eliminacionReversaCuenta:true
    };
    if(typeof _mpagoReversarGastos==='function'){
      try{ _devuelto = _mpagoReversarGastos(c.motoId, true, _audit) || 0; }catch(_e){ _devuelto = 0; }
    }
  }
  if(_moto && !_moto.eliminado){
    if(_laCreoEstaSolicitud){
      // Esa unidad la trajo la solicitud y su compra se devolvio: no puede quedarse en el
      // stock como si Pagasi la hubiera pagado. Sale del inventario, auditada.
      _moto.eliminado = true;
      _moto.estado = 'disponible';   // si alguien la restaura, vuelve al stock, no "financiada"
      _moto.eliminadoPor = c.rechazadoPor;
      _moto.eliminadoEn = c.rechazadoEn;
      _moto.eliminadoRazon = 'Solicitud rechazada · '+c.razonRechazo;
      _moto.eliminacionReversaCuenta = true;
      _moto.cliente = null;
      _moto.creditoId = null;
    } else {
      // Moto que ya estaba en inventario: solo se libera
      _moto.estado = 'disponible';
      _moto.cliente = null;
      _moto.creditoId = null;
    }
    if(DB && DB.saveMoto) DB.saveMoto(_moto);
  }
  if(typeof logActividad==='function') logActividad('credito_rechazado','creditos',credId,{razon:c.razonRechazo, gastosDevueltos:_devuelto});
  toast('Crédito rechazado · '+credId+(_devuelto?' · se devolvió la compra y la moto salió del inventario':(_moto?' · la moto vuelve al stock':'')),'info');
  nav('aprobaciones');
}

// Ver detalle: redirige al módulo de créditos con el ID
function _aprVerDetalle(credId){
  // Si existe función abrirDetalleCredito, úsala. Si no, navega a créditos
  if(typeof abrirDetalleCredito === 'function'){
    abrirDetalleCredito(credId);
  } else {
    nav('creditos');
  }
}
