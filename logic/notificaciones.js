// Pagasi logic: notificaciones
const NOTIF_HIST_KEY='pagasi_notif_historial_v1';
function cargarHistorialNotificaciones(){
  try{
    if(Array.isArray(window._notifHistorial) && window._notifHistorial.length) return window._notifHistorial;
    var raw=localStorage.getItem(NOTIF_HIST_KEY);
    window._notifHistorial = raw ? JSON.parse(raw) : [];
  }catch(e){ window._notifHistorial=[]; }
  return window._notifHistorial;
}
function guardarHistorialNotificaciones(){
  try{ localStorage.setItem(NOTIF_HIST_KEY, JSON.stringify(window._notifHistorial||[])); }catch(e){}
}
function renderHistorialNotificaciones(){
  cargarHistorialNotificaciones();
  var h=$('notif-historial');
  if(!h) return;
  if(!(window._notifHistorial||[]).length){
    h.innerHTML='<div style="text-align:center;padding:40px 20px"><div style="font-weight:700;font-size:13px;color:var(--ink2);margin-bottom:4px">Sin envios registrados</div><div style="font-size:12px;color:var(--ink3)">Los mensajes enviados apareceran aqui con fecha y detalles.</div></div>';
    return;
  }
  h.innerHTML=(window._notifHistorial||[]).map(function(n){
    var dotColor=n.canal==='whatsapp'?'#25D366':'var(--p1)';
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid var(--rim)">'
      +'<div style="width:10px;height:10px;border-radius:50%;background:'+dotColor+';flex-shrink:0;margin-top:4px"></div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:12px;font-weight:800;color:var(--ink)">'+n.tipo+'</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-top:2px">'+n.dest+' — '+n.cantidad+' mensaje'+(n.cantidad!==1?'s':'')+'</div>'
      +'<div style="font-size:10.5px;color:var(--ink3)">'+n.fecha+'</div>'
      +(n.mensaje?'<div style="margin-top:6px;padding:8px 10px;background:var(--surf2);border:1px solid var(--rim);border-radius:8px;font-size:11px;white-space:pre-wrap;line-height:1.45;color:var(--ink)">'+String(n.mensaje).replace(/</g,'&lt;')+'</div>':'')
      +'</div>'
      +'<span class="bdg b-g" style="align-self:flex-start">enviado</span></div>';
  }).join('');
}

// Helper: desde el módulo de Pagos, abrir Notificaciones con el recordatorio de cuota preseleccionado
// para un crédito/cliente específico.
function avisarCuotaProxima(credId){
  var c = S.creds.find(function(x){return String(x.id)===String(credId);});
  if(!c){ toast('Crédito no encontrado','error'); return; }
  var cli = S.clientes.find(function(x){return x.nombre===c.cli;}) ||
            S.clientes.find(function(x){return String(x.id)===String(c.clienteId);});
  if(!cli){ toast('Cliente no encontrado — asegúrate de que esté registrado','error'); return; }
  if(!cli.tel || cli.tel.replace(/[^0-9]/g,'').length<7){
    toast(' '+cli.nombre+' no tiene teléfono válido registrado','warn');
  }
  // Navegar a notificaciones
  nav('notif');
  // Después de que se renderice, seleccionar plantilla + cliente
  setTimeout(function(){
    // Seleccionar la plantilla "Recordatorio cuota"
    if(typeof setNotifTipo==='function') setNotifTipo('cuota');
    // Cambiar destinatario a "Cuotas próximas" para que encaje mejor con la plantilla
    var destSel = document.getElementById('notif-dest');
    if(destSel){ destSel.value='proximas'; }
    // Preseleccionar el cliente específico
    if(typeof nxAcPick==='function'){ nxAcPick(cli.id); }
    // Refrescar contadores y preview
    if(typeof actualizarContadoresNotif==='function') actualizarContadoresNotif();
    if(typeof actualizarPreviewNotif==='function') actualizarPreviewNotif();
    // Scroll al preview para que el usuario lo vea
    var preview = document.getElementById('notif-preview');
    if(preview && preview.scrollIntoView){ preview.scrollIntoView({behavior:'smooth',block:'center'}); }
    toast('Plantilla "Recordatorio de cuota" lista para '+cli.nombre,'success');
  }, 250);
}

function setNotifTipo(tipo){
  var sel = $('notif-tipo');
  if(sel) sel.value = tipo || 'lead_bienvenida';
  var grid = $('nx-tpl-grid');
  if(grid){
    Array.from(grid.querySelectorAll('[data-tipo]')).forEach(function(btn){
      var active = btn.getAttribute('data-tipo') === (tipo || 'lead_bienvenida');
      btn.classList.toggle('is-active', active);
    });
  }
  // Actualizar contador de plantilla seleccionada
  var counter = $('nx-tpl-counter');
  if(counter){
    var names={lead_bienvenida:'Bienvenida Lead',bienvenida_activo:'Cliente activo',cuota:'Recordatorio cuota',confirmado:'Pago recibido',cuenta:'Estado de cuenta',mora:'Aviso de mora',mora_grave:'Mora urgente',acuerdo:'Acuerdo de pago',liquidacion:'Liquidación',vencimiento:'Vencimiento',custom:'Personalizado'};
    counter.textContent = names[tipo] || 'Selecciona una';
  }
  // Auto-deducir el grupo destinatario según la plantilla
  var mapaDest = {
    lead_bienvenida: 'leads',
    bienvenida_activo: 'activos',
    cuota: 'proximas',
    confirmado: 'activos',
    cuenta: 'activos',
    mora: 'mora',
    mora_grave: 'mora',
    acuerdo: 'mora',
    liquidacion: 'activos',
    vencimiento: 'activos',
    custom: 'activos'
  };
  var destAuto = mapaDest[tipo] || 'activos';
  var destSel = $('notif-dest');
  // Solo cambiamos si NO hay una elección de cliente específico ya en curso
  var clientePicked = $('notif-cliente-sel-id');
  var hayPicked = clientePicked && clientePicked.value;
  if(destSel && !hayPicked){
    destSel.value = destAuto;
    if(typeof nxAcUnpick === 'function') nxAcUnpick(true);
    if(typeof _nxAcScope !== 'undefined') _nxAcScope = 'group';
    if(typeof nxAcUpdateHint === 'function') nxAcUpdateHint();
    if(typeof nxAcGetClientsForScope === 'function' && typeof nxAcRender === 'function'){
      _nxAcResults = nxAcGetClientsForScope();
      nxAcRender();
    }
    if(typeof actualizarContadoresNotif === 'function') actualizarContadoresNotif();
  }
  actualizarTipoDesc();
  actualizarPreviewNotif();
}

function actualizarTipoDesc(){
  var tipo=($('notif-tipo')&&$('notif-tipo').value)||'lead_bienvenida';
  var desc=$('notif-tipo-desc');
  var customWrap=$('notif-custom-wrap');
  var descs={
    lead_bienvenida:'Mensaje formal de bienvenida para leads que dejaron sus datos. Presenta la empresa y anuncia el contacto de un asesor.',
    bienvenida_activo:'Mensaje de bienvenida para clientes ya activos con datos de su plan de cuotas.',
    mora:'Notifica el atraso con datos de cuenta, cuota N°, días de mora y fecha de vencimiento.',
    mora_grave:'Aviso urgente para cuentas con mora prolongada. Menciona inicio de proceso de recuperación.',
    cuota:'Recordatorio corto con el monto y fecha de la próxima cuota del cliente.',
    confirmado:'Confirma la recepción del pago y comunica la próxima fecha de vencimiento.',
    cuenta:'Estado de cuenta: cuotas pagadas, restantes, porcentaje avanzado, mora y fecha fin de contrato.',
    acuerdo:'Formaliza por escrito el acuerdo de pago acordado verbalmente con el cliente.',
    liquidacion:'Ofrece al cliente la posibilidad de liquidar anticipadamente su contrato.',
    vencimiento:'Alerta cuando el contrato se acerca a su fecha final con cuotas pendientes.',
    custom:'Redacte su propio mensaje. Variables: {nombre} {cuota} {mora} {modelo} {cuenta} {empresa} {cuotaNum} {totalCuotas} {fechaProx}'
  };
  if(desc) desc.textContent=descs[tipo]||descs.custom;
  if(customWrap) customWrap.style.display=(tipo==='custom')?'block':'none';
}

function _nxCountGroup(dest){
  // Cuenta ignorando el cliente específico seleccionado
  var prev = null;
  var hidden = $('notif-cliente-sel-id');
  if(hidden){ prev = hidden.value; hidden.value = ''; }
  var n = (getDestinatariosNotif(dest)||[]).length;
  if(hidden) hidden.value = prev;
  return n;
}

function actualizarContadoresNotif(){
  var counts = {
    leads: _nxCountGroup('leads'),
    activos: _nxCountGroup('activos'),
    proximas: _nxCountGroup('proximas'),
    mora: _nxCountGroup('mora')
  };
  Object.keys(counts).forEach(function(k){
    var el = $('nx-c-'+k);
    if(el) el.textContent = counts[k];
  });
  // Destinatarios efectivos (considera el cliente específico si está seleccionado)
  var dest = ($('notif-dest')&&$('notif-dest').value)||'leads';
  var destinatarios = getDestinatariosNotif(dest)||[];
  var n = destinatarios.length;
  var hasSpecific = !!($('notif-cliente-sel-id')&&$('notif-cliente-sel-id').value);
  var destCounter = $('nx-dest-counter');
  if(destCounter){
    if(hasSpecific) destCounter.textContent = '1 cliente seleccionado';
    else destCounter.textContent = n + ' destinatario' + (n!==1?'s':'');
  }
  var sendN = $('nx-send-n'); if(sendN) sendN.textContent = n;
  var sendLbl = $('nx-send-lbl');
  if(sendLbl){
    var sinTel = destinatarios.filter(function(d){return !d.tel||d.tel.replace(/[^0-9]/g,'').length<7;}).length;
    if(n===0) sendLbl.textContent = 'sin destinatarios';
    else if(hasSpecific && sinTel>0) sendLbl.textContent = 'cliente seleccionado · sin teléfono';
    else if(hasSpecific) sendLbl.textContent = 'cliente seleccionado';
    else if(sinTel>0) sendLbl.textContent = 'listos · '+sinTel+' sin teléfono';
    else sendLbl.textContent = 'destinatarios listos';
  }
  var btn = $('notif-send-btn');
  if(btn) btn.disabled = (n===0);
}

function actualizarPreviewNotif(){
  var tipo = ($('notif-tipo')&&$('notif-tipo').value)||'lead_bienvenida';
  var dest = ($('notif-dest')&&$('notif-dest').value)||'leads';
  actualizarTipoDesc();
  var destinatarios = getDestinatariosNotif(dest)||[];
  var sampleD = destinatarios[0]||{nombre:'Cliente Ejemplo',tel:'04120000000',cuota:15000,mora:5,modelo:'Moto 150cc',cred:'CRED-0001'};
  var msg = buildMensajeNotif(tipo, sampleD);
  var bubble = $('notif-preview');
  var empty = $('notif-preview-empty');
  if(bubble && empty){
    if(!msg){
      bubble.style.display = 'none';
      empty.style.display = 'block';
    } else {
      bubble.style.display = 'inline-block';
      empty.style.display = 'none';
      var ahora = new Date();
      var hora = ahora.getHours().toString().padStart(2,'0')+':'+ahora.getMinutes().toString().padStart(2,'0');
      // Limpiar y construir: span de texto + span de hora
      bubble.innerHTML = '';
      var textSpan = document.createElement('span');
      textSpan.textContent = msg;
      bubble.appendChild(textSpan);
      var timeSpan = document.createElement('span');
      timeSpan.className = 'nx-wa-time';
      timeSpan.textContent = hora + ' ✓✓';
      bubble.appendChild(timeSpan);
    }
  }
  actualizarContadoresNotif();
}

// ── Autocomplete para elegir un cliente dentro del grupo (o de todos) ──
var _nxAcFocusIdx = -1;
var _nxAcResults = [];
var _nxAcScope = 'group'; // 'group' = solo clientes del segmento activo; 'all' = todos

function nxAcGetAllClients(){
  var out = [];
  (S.clientes||[]).forEach(function(c){
    if(c.eliminado) return;
    var creds = (typeof getCreditosCliente==='function') ? getCreditosCliente(c) : [];
    var cr = creds.find(function(x){ return x.estado==='activo'||x.estado==='mora'; });
    // Calcular días hasta la próxima cuota si está activo
    var diasProx = null;
    if(cr && cr.fecha){
      try {
        var cuotasPag = (typeof getCreditoCuotasPagadas==='function') ? getCreditoCuotasPagadas(cr) : (cr.pagado||0);
        var inicio = parseFechaLocal(cr.fecha);
        var siguiente = new Date(inicio.getTime() + ((cuotasPag+1) * 15 * 24 * 60 * 60 * 1000));
        var hoy = new Date(); hoy.setHours(0,0,0,0);
        diasProx = Math.ceil((siguiente - hoy) / (24*60*60*1000));
      } catch(e){ diasProx = null; }
    }
    out.push({
      id: c.id,
      nombre: c.nombre || '',
      tel: c.tel || '',
      cedula: c.cedula || c.ci || '',
      cuenta: cr ? cr.id : '',
      isActivo: !!cr,
      modelo: cr ? cr.modelo : '',
      mora: cr ? (cr.mora||0) : 0,
      diasProxCuota: diasProx
    });
  });
  return out;
}

// Devuelve los clientes del scope actual (grupo activo, o todos si _nxAcScope==='all')
function nxAcGetClientsForScope(){
  var all = nxAcGetAllClients();
  if(_nxAcScope==='all') return all;
  var dest = ($('notif-dest')&&$('notif-dest').value)||'leads';
  // IDs del grupo activo según destinatarios reales del segmento
  var destGroup = getDestinatariosNotif(dest)||[];
  // Los destinatarios no tienen id del cliente; hacemos match por nombre
  var names = new Set();
  destGroup.forEach(function(d){ if(d && d.nombre) names.add(d.nombre); });
  return all.filter(function(c){ return names.has(c.nombre); });
}

function nxAcToggleScope(){
  _nxAcScope = (_nxAcScope==='group') ? 'all' : 'group';
  nxAcUpdateHint();
  var input = $('nx-ac-input');
  _nxAcResults = nxAcGetClientsForScope();
  // Aplicar filtro de búsqueda actual si había texto
  if(input && input.value.trim()){
    nxAcFilter();
  } else {
    nxAcRender();
    nxAcOpen();
  }
}

function nxAcUpdateHint(){
  var hint = $('nx-ac-hint');
  var btn = $('nx-ac-modeswitch');
  var dest = ($('notif-dest')&&$('notif-dest').value)||'leads';
  var names = {leads:'leads',activos:'clientes activos',proximas:'clientes con cuota pendiente',mora:'clientes en mora'};
  var grupoLbl = names[dest] || 'este grupo';
  if(_nxAcScope==='group'){
    if(hint) hint.textContent = 'O busca un ' + grupoLbl.replace(/s$/,'') + ' específico dentro del grupo';
    if(btn) btn.textContent = 'Ver todos los clientes';
  } else {
    if(hint) hint.textContent = 'Buscando en TODOS los clientes';
    if(btn) btn.textContent = 'Volver al grupo';
  }
}

function nxAcFilter(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  var input = $('nx-ac-input');
  if(!input) return;
  var q = (input.value||'').toLowerCase().trim();
  var clear = $('nx-ac-clear');
  if(clear) clear.classList.toggle('is-visible', q.length>0);
  var base = nxAcGetClientsForScope();
  if(q){
    _nxAcResults = base.filter(function(c){
      return (c.nombre.toLowerCase().indexOf(q) !== -1)
          || (c.tel && c.tel.toLowerCase().indexOf(q) !== -1)
          || (c.cedula && c.cedula.toLowerCase().indexOf(q) !== -1)
          || (c.cuenta && c.cuenta.toLowerCase().indexOf(q) !== -1);
    });
  } else {
    _nxAcResults = base;
  }
  _nxAcFocusIdx = -1;
  nxAcRender();
  nxAcOpen();
}

function nxAcRender(){
  var list = $('nx-ac-list');
  if(!list) return;
  // Actualizar título del bloque y contador
  var titleEl = $('nx-ac-list-title');
  var countEl = $('nx-ac-list-count');
  var destSel = $('notif-dest');
  var dest = (destSel && destSel.value) || 'leads';
  var nombresGrupo = {leads:'Leads sin cuenta',activos:'Activos con cuenta',proximas:'Cuotas pendientes esta semana',mora:'En mora',especifico:'Cliente específico'};
  if(titleEl) titleEl.textContent = nombresGrupo[dest] || 'Destinatarios';
  if(countEl) countEl.textContent = _nxAcResults.length || 0;

  if(!_nxAcResults.length){
    var input=$('nx-ac-input');
    var hasQuery = input && input.value.trim();
    if(hasQuery){
      list.innerHTML = '<div class="nx-ac-empty" style="padding:18px;text-align:center;font-size:12px;color:var(--ink3)">Sin coincidencias en este grupo. <button type="button" onclick="nxAcToggleScope()" style="border:none;background:none;color:var(--p1);font-weight:700;cursor:pointer;padding:0;font-size:inherit;text-decoration:underline">Buscar en todos los clientes</button></div>';
    } else {
      list.innerHTML = '<div class="nx-ac-empty" style="padding:24px;text-align:center;font-size:12px;color:var(--ink3)">No hay clientes en este grupo</div>';
    }
    return;
  }
  // Ordenar por urgencia: morosos primero (más días de mora arriba),
  // luego activos por días hasta próxima cuota ascendente (los más cercanos arriba),
  // por último los leads / sin crédito.
  function _nxSortKey(c){
    if(c.mora > 0) return [0, -c.mora]; // morosos: orden por mora desc (más mora arriba)
    if(c.isActivo){
      var d = (c.diasProxCuota == null) ? 99999 : c.diasProxCuota;
      return [1, d]; // activos: vencidos primero, luego más cercanos
    }
    return [2, 0]; // leads / sin crédito
  }
  _nxAcResults.sort(function(a,b){
    var ka = _nxSortKey(a), kb = _nxSortKey(b);
    if(ka[0] !== kb[0]) return ka[0] - kb[0];
    return ka[1] - kb[1];
  });
  var activos = _nxAcResults.filter(function(c){ return c.isActivo; });
  var leads = _nxAcResults.filter(function(c){ return !c.isActivo; });
  var html = '';
  function initials(name){
    var p = (name||'').split(/\s+/).filter(Boolean);
    return ((p[0]||'')[0]||'?').toUpperCase() + ((p[1]||'')[0]||'').toUpperCase();
  }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function renderItem(c, idx){
    var meta = [];
    if(c.cuenta) meta.push(c.cuenta);
    else if(!c.isActivo) meta.push('Lead');
    if(c.tel) meta.push(c.tel);
    else meta.push('sin teléfono');
    // Badge de días: mora si hay, sino días hasta próxima cuota
    var diasBadge = '';
    if(c.mora>0){
      diasBadge = '<span style="background:#FCEBEB;color:#E8335A;font-size:10px;font-weight:800;padding:3px 8px;border-radius:50px;border:1px solid #F5C9D2;flex-shrink:0;letter-spacing:.02em;line-height:1.3" title="Días de mora">'+c.mora+'d mora</span>';
    } else if(c.isActivo && c.diasProxCuota!=null){
      var d = c.diasProxCuota;
      var col, bgc, txt;
      if(d < 0){ col='#E8335A'; bgc='#FCEBEB'; txt=Math.abs(d)+'d venc.'; }
      else if(d === 0){ col='#BA7517'; bgc='#FAEEDA'; txt='vence hoy'; }
      else if(d <= 3){ col='#BA7517'; bgc='#FAEEDA'; txt='en '+d+'d'; }
      else if(d <= 7){ col='#2563EB'; bgc='#E6F1FB'; txt='en '+d+'d'; }
      else { col='#00B876'; bgc='#E1F5EE'; txt='en '+d+'d'; }
      diasBadge = '<span style="background:'+bgc+';color:'+col+';font-size:10px;font-weight:800;padding:3px 8px;border-radius:50px;border:1px solid '+col+'33;flex-shrink:0;letter-spacing:.02em;line-height:1.3" title="Días para próxima cuota">'+txt+'</span>';
    }
    return '<div class="nx-ac-item" data-id="'+esc(c.id)+'" data-idx="'+idx+'" onclick="nxAcPick(\''+esc(c.id)+'\')" title="Click para enviar solo a este cliente">'
      + '<div class="nx-ac-avatar" style="'+(c.isActivo?'':'background:var(--ink3)')+'">'+esc(initials(c.nombre))+'</div>'
      + '<div class="nx-ac-body">'
      + '<div class="nx-ac-name">'+esc(c.nombre||'Sin nombre')+'</div>'
      + '<div class="nx-ac-meta">'+esc(meta.join(' · '))+'</div>'
      + '</div>'
      + diasBadge
      + '</div>';
  }
  var idxCounter = 0;
  if(activos.length && leads.length){
    html += '<div class="nx-ac-group">Clientes activos ('+activos.length+')</div>';
    activos.forEach(function(c){ html += renderItem(c, idxCounter++); });
    html += '<div class="nx-ac-group">Leads / sin cuenta ('+leads.length+')</div>';
    leads.forEach(function(c){ html += renderItem(c, idxCounter++); });
  } else {
    _nxAcResults.forEach(function(c){ html += renderItem(c, idxCounter++); });
  }
  list.innerHTML = html;
}

function nxAcOpen(){
  var input = $('nx-ac-input');
  if(!input) return;
  if(!_nxAcResults.length) _nxAcResults = nxAcGetClientsForScope();
  nxAcRender();
  var list = $('nx-ac-list');
  if(list) list.classList.add('is-open');
}

function nxAcClose(){
  var list = $('nx-ac-list');
  if(list) list.classList.remove('is-open');
  _nxAcFocusIdx = -1;
}

function nxAcPick(id){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  var all = nxAcGetAllClients();
  var c = all.find(function(x){ return String(x.id)===String(id); });
  if(!c) return;
  var hidden = $('notif-cliente-sel-id');
  if(hidden) hidden.value = c.id;
  var sel = $('notif-cliente-sel');
  if(sel){
    var has = Array.from(sel.options).some(function(o){return String(o.value)===String(c.id);});
    if(!has){ var o=document.createElement('option'); o.value=c.id; o.textContent=c.nombre; sel.appendChild(o); }
    sel.value = c.id;
  }
  var input = $('nx-ac-input');
  if(input) input.value = '';
  var clear = $('nx-ac-clear'); if(clear) clear.classList.remove('is-visible');
  nxAcClose();
  var selWrap = $('nx-ac-selected-wrap');
  if(selWrap){
    function initials(name){
      var p = (name||'').split(/\s+/).filter(Boolean);
      return ((p[0]||'')[0]||'?').toUpperCase() + ((p[1]||'')[0]||'').toUpperCase();
    }
    function esc(s){ return String(s||'').replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
    var meta = [];
    if(c.cuenta) meta.push(c.cuenta);
    else meta.push('Lead');
    if(c.tel) meta.push(c.tel);
    else meta.push('sin teléfono');
    selWrap.innerHTML = '<div class="nf2-solo nx-ac-selected">'
      + '<div class="nf2-solo-av">'+esc(initials(c.nombre))+'</div>'
      + '<div class="nf2-solo-info">'
      + '<div class="nf2-solo-n"><span class="nf2-solo-bdg">SOLO ESTE</span>'+esc(c.nombre)+'</div>'
      + '<div class="nf2-solo-m">'+esc(meta.join(' · '))+'</div>'
      + '</div>'
      + '<button type="button" class="nf2-solo-x" onclick="nxAcUnpick()" title="Volver a enviar a todo el grupo">×</button>'
      + '</div>';
  }
  actualizarPreviewNotif();
}

function nxAcUnpick(silent){
  var hidden = $('notif-cliente-sel-id'); if(hidden) hidden.value = '';
  var sel = $('notif-cliente-sel'); if(sel) sel.value = '';
  var selWrap = $('nx-ac-selected-wrap'); if(selWrap) selWrap.innerHTML = '';
  var input = $('nx-ac-input'); if(input) input.value='';
  if(!silent) actualizarPreviewNotif();
}

function nxAcClearInput(){
  var input = $('nx-ac-input');
  if(input){ input.value=''; input.focus(); }
  var clear = $('nx-ac-clear'); if(clear) clear.classList.remove('is-visible');
  _nxAcResults = nxAcGetClientsForScope();
  nxAcRender();
}

function nxAcKey(ev){
  var list = $('nx-ac-list');
  if(!list || !list.classList.contains('is-open')){ if(ev.key!=='Escape') nxAcOpen(); }
  var items = Array.from(list.querySelectorAll('.nx-ac-item'));
  if(ev.key==='ArrowDown'){
    ev.preventDefault();
    _nxAcFocusIdx = Math.min(_nxAcFocusIdx+1, items.length-1);
  } else if(ev.key==='ArrowUp'){
    ev.preventDefault();
    _nxAcFocusIdx = Math.max(_nxAcFocusIdx-1, 0);
  } else if(ev.key==='Enter'){
    ev.preventDefault();
    if(_nxAcFocusIdx>=0 && items[_nxAcFocusIdx]){
      var id = items[_nxAcFocusIdx].getAttribute('data-id');
      nxAcPick(id);
    }
    return;
  } else if(ev.key==='Escape'){
    nxAcClose();
    return;
  } else { return; }
  items.forEach(function(it,i){ it.classList.toggle('is-focus', i===_nxAcFocusIdx); });
  if(items[_nxAcFocusIdx]) items[_nxAcFocusIdx].scrollIntoView({block:'nearest'});
}

document.addEventListener('click', function(ev){
  var wrap = ev.target.closest && ev.target.closest('.nx-ac-wrap');
  if(!wrap){ nxAcClose(); }
});

function getDestinatariosNotif(dest){
  function findCliente(c){
    if(c && c.cliId!=null && String(c.cliId)!==''){
      var byId=(S.clientes||[]).find(function(x){ return String(x.id)===String(c.cliId); });
      if(byId) return byId;
      return {}; // si tiene cliId pero no encuentra, NO cae al fallback de nombre
    }
    var nom=(c&&c.cli||'').trim();
    if(!nom) return {};
    return (S.clientes||[]).find(function(x){ return (x.nombre||'').trim()===nom; }) || {};
  }
  function activeCredForClient(cl){
    var creds = (typeof getCreditosCliente==='function') ? getCreditosCliente(cl) : [];
    return creds.find(function(cr){ return cr.estado==='activo'||cr.estado==='mora'; })
        || creds.slice().sort(function(a,b){ return String(b.fecha||'').localeCompare(String(a.fecha||'')); })[0]
        || null;
  }
  function mkDest(cl, c, extra){
    cl = cl || {};
    c = c || {};
    extra = extra || {};
    return {
      nombre: cl.nombre || c.cli || 'Cliente',
      tel: cl.tel || c.tel || '',
      mora: c.mora || 0,
      cuota: c.cuotaQ || c.cuota || 0,
      modelo: c.modelo || extra.modelo || '',
      cred: c.id || c.cuenta || extra.cred || '',
      esLead: !!extra.esLead,
      ciudad: cl.ciudad || '',
      ingreso: cl.ing || cl.ingreso || 0,
      totalCuotas: c.totalCuotas || 0
    };
  }

  // ── Override: si hay un cliente seleccionado en el autocomplete, envía solo a ese ──
  var selId = String(
    (typeof document!=='undefined' && document.getElementById('notif-cliente-sel-id') && document.getElementById('notif-cliente-sel-id').value) || ''
  );
  if(selId){
    var cl = (S.clientes||[]).find(function(x){ return String(x.id)===selId; });
    if(cl){
      var cred = activeCredForClient(cl);
      return [mkDest(cl, cred||{}, {esLead:!cred})];
    }
  }

  if(dest==='mora'){
    return (S.creds||[]).filter(function(c){ return !c.eliminado && c.estado==='activo' && (c.mora||0)>0; }).map(function(c){
      return mkDest(findCliente(c), c);
    });
  }
  if(dest==='proximas'){
    return (S.creds||[]).filter(function(c){
      if(c.eliminado || c.estado!=='activo' || !c.fecha) return false;
      var sig = new Date(parseFechaLocal(c.fecha).getTime() + ((getCreditoCuotasPagadas(c)+1)*15*24*60*60*1000));
      var diff = Math.floor((sig - new Date())/(24*60*60*1000));
      return diff>=0 && diff<=7;
    }).map(function(c){ return mkDest(findCliente(c), c); });
  }
  if(dest==='leads'){
    return (S.clientes||[]).filter(function(cl){
      if(cl.eliminado) return false;
      var cr=activeCredForClient(cl);
      return !cr;
    }).map(function(cl){ return mkDest(cl, {}, {esLead:true}); });
  }
  if(dest==='activos'){
    return (S.creds||[]).filter(function(c){ return !c.eliminado && c.estado==='activo'; }).map(function(c){
      return mkDest(findCliente(c), c);
    });
  }
  if(dest==='especifico'){
    var selId = String(
      (($('notif-cliente-sel-id')&&$('notif-cliente-sel-id').value)||'')
      || (($('notif-cliente-sel')&&$('notif-cliente-sel').value)||'')
    );
    if(!selId) return [];
    var cl = (S.clientes||[]).find(function(x){ return String(x.id)===selId; });
    if(!cl) return [];
    var cred = activeCredForClient(cl);
    return [mkDest(cl, cred||{}, {esLead:!cred})];
  }
  return (S.creds||[]).filter(function(c){ return !c.eliminado && c.estado==='activo'; }).map(function(c){
    return mkDest(findCliente(c), c);
  });
}

function buildMensajeNotif(tipo, d){
  var nombre = d.nombre||'Cliente';
  var cuota = d.cuota ? fmt(d.cuota) : '0,00';
  var mora = d.mora || 0;
  var modelo = d.modelo||'—';
  var cred = d.cred || d.cuenta || d.cuentaId || (d.esLead ? 'LEAD' : 'CUENTA ACTIVA');
  var empresa = ($('cfg_empresa')&&$('cfg_empresa').value)||'Pagasi';
  var cr = d.cred ? (S&&S.creds ? S.creds.find(function(x){return x.id===d.cred;}) : null) : null;
  // Usar helpers canónicos para que los números coincidan con dashboard/reportes/contabilidad
  var totalCuotas = cr ? getCreditoTotalCuotas(cr) : 0;
  var cuotasPagadas = cr ? getCreditoCuotasPagadas(cr) : 0;
  var totalPagado = cr ? getCreditoPagosConfirmados(cr) : 0;
  var saldoPend = cr ? getCreditoSaldoPendiente(cr) : 0;
  var cuotaNum = cr ? Math.min(cuotasPagadas+1, totalCuotas) : 0;
  var cuotasRest = totalCuotas - cuotasPagadas;
  var montoTotal = cr ? parseFloat(cr.total||cr.fin||0) : 0;
  var pct = totalCuotas > 0 ? Math.round(cuotasPagadas/totalCuotas*100) : 0;
  var fechaInicio = cr&&cr.fecha ? parseFechaLocal(cr.fecha).toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
  var fechaProx = '';
  var fechaVencFin = '';
  if(cr&&cr.fecha){
    var sig=new Date(parseFechaLocal(cr.fecha).getTime()+((cuotasPagadas+1)*15*24*60*60*1000));
    fechaProx=sig.toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric'});
    var fin=new Date(parseFechaLocal(cr.fecha).getTime()+(totalCuotas*15*24*60*60*1000));
    fechaVencFin=fin.toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric'});
  }

  // Bloque de datos de cuenta — texto limpio, sin emojis
  var lineaSep = '--------------------------------';
  var bloqueHeader = [
    lineaSep,
    'EMPRESA : '+empresa.toUpperCase(),
    'CUENTA N° : '+cred,
    'CLIENTE : '+nombre,
    'VEHICULO : '+modelo,
    lineaSep,
    'Cuota N° : '+cuotaNum+' de '+totalCuotas,
    'Cuotas pag. : '+cuotasPagadas+' ('+pct+'%)',
    'Cuotas rest. : '+cuotasRest,
    'Cuota quinc. : '+cuota,
    fechaProx ? 'Vence el : '+fechaProx : '',
    totalPagado>0 ? 'Total pag. : '+fmt(totalPagado) : '',
    fechaVencFin ? 'Fin contrato : '+fechaVencFin : '',
    mora > 0 ? 'Dias de mora : '+mora+' dia'+(mora!==1?'s':'') : '',
    lineaSep
  ].filter(Boolean).join('\n');

  if(tipo==='mora'){
    return [
      empresa.toUpperCase()+' — AVISO DE MORA',
      '',
      'Estimado/a '+nombre+':',
      '',
      'Le informamos que su cuenta presenta '+mora+' dia'+(mora!==1?'s':'')+' de atraso en el pago de la cuota quincenal N° '+cuotaNum+' correspondiente a su vehiculo '+modelo+'.',
      '',
      bloqueHeader,
      '',
      'Le solicitamos respetuosamente que regularice su situacion lo antes posible para evitar cargos adicionales y el inicio de un proceso de recuperacion.',
      '',
      'Para realizar su pago o coordinar un acuerdo, comuniquese con nuestra oficina a la brevedad.',
      '',
      empresa.toUpperCase()
    ].filter(Boolean).join('\n');
  }

  if(tipo==='mora_grave'){
    return [
      empresa.toUpperCase()+' — AVISO URGENTE DE MORA',
      '',
      'Estimado/a '+nombre+':',
      '',
      'Su cuenta N° '+cred+' registra '+mora+' dias de atraso, lo cual representa una situacion grave que requiere atencion INMEDIATA.',
      '',
      bloqueHeader,
      '',
      'De no regularizarse esta situacion en un plazo de 72 horas, nos veremos en la obligacion de iniciar el proceso legal de recuperacion del vehiculo '+modelo+' segun los terminos del contrato firmado.',
      '',
      'Le exhortamos a comunicarse con nuestra oficina HOY MISMO para buscar una solucion.',
      '',
      empresa.toUpperCase()+' — Dpto. de Cobranza'
    ].filter(Boolean).join('\n');
  }

  if(tipo==='cuota'){
    return [
      'Hola ' + nombre + ',',
      '',
      'Te recordamos tu próxima cuota de la moto:',
      cuota ? '• Monto: ' + cuota : '',
      fechaProx ? '• Fecha: ' + fechaProx : '',
      cuotaNum && totalCuotas ? '• Cuota N°: ' + cuotaNum + ' de ' + totalCuotas : '',
      '',
      'Escríbenos por aquí y la resolvemos rápido.',
      '',
      empresa.toUpperCase()
    ].filter(Boolean).join('\n');
  }

  if(tipo==='confirmado'){
    return [
      empresa.toUpperCase()+' — PAGO RECIBIDO',
      '',
      'Estimado/a '+nombre+':',
      '',
      'Hemos recibido y procesado exitosamente su pago correspondiente a la cuota N° '+cuotasPagadas+' de su plan de cuotas.',
      '',
      bloqueHeader,
      '',
      'Su proximo vencimiento es el '+fechaProx+' por un monto de '+cuota+'.',
      '',
      'Gracias por mantenerse al dia con sus obligaciones.',
      '',
      empresa.toUpperCase()
    ].filter(Boolean).join('\n');
  }

  if(tipo==='cuenta'){
    return [
      empresa.toUpperCase()+' — ESTADO DE CUENTA',
      '',
      'Estimado/a '+nombre+':',
      '',
      'A continuacion le presentamos el estado actualizado de su cuenta:',
      '',
      bloqueHeader,
      '',
      mora > 0
        ? 'ATENCION: Su cuenta presenta '+mora+' dia'+(mora!==1?'s':'')+' de mora. Le solicitamos que regularice su situacion a la brevedad.'
        : 'Su cuenta se encuentra al dia. Le agradecemos su puntualidad.',
      '',
      'Para cualquier consulta, comuniquese con nuestra oficina.',
      '',
      empresa.toUpperCase()
    ].filter(Boolean).join('\n');
  }

  if(tipo==='acuerdo'){
    return [
      empresa.toUpperCase()+' — CONFIRMACION DE ACUERDO DE PAGO',
      '',
      'Estimado/a '+nombre+':',
      '',
      'Por medio del presente mensaje confirmamos el acuerdo de pago establecido hoy para regularizar su cuenta N° '+cred+'.',
      '',
      bloqueHeader,
      '',
      'Segun lo acordado, usted realizara el pago de su cuota '+cuotaNum+' de '+cuota+' en la fecha comprometida. Le recordamos que el incumplimiento del acuerdo podra derivar en acciones de recuperacion.',
      '',
      'Quedamos a su disposicion para cualquier consulta adicional.',
      '',
      empresa.toUpperCase()+' — Dpto. de Cobranza'
    ].filter(Boolean).join('\n');
  }

  if(tipo==='lead_bienvenida'){
    return [
      empresa.toUpperCase()+' — BIENVENIDA',
      '',
      'Estimado/a '+nombre+':',
      '',
      'Reciba un cordial saludo de '+empresa+'. Agradecemos su interés en nuestros planes de pago en cuotas para motocicletas.',
      '',
      'Uno de nuestros asesores se comunicará con usted a la brevedad para brindarle la información correspondiente y acompañarle en el proceso.',
      '',
      'Quedamos atentos a cualquier consulta por este medio.',
      '',
      'Cordialmente,',
      empresa.toUpperCase()
    ].filter(Boolean).join('\n');
  }

  if(tipo==='bienvenida_activo' || tipo==='bienvenida'){
    return [
      empresa.toUpperCase()+' — BIENVENIDO/A',
      '',
      'Estimado/a '+nombre+':',
      '',
      'Nos complace darle la bienvenida como cliente activo de '+empresa+'. Su cuenta ya fue creada exitosamente.',
      '',
      bloqueHeader,
      '',
      'Su primera cuota de '+cuota+' vence el dia '+fechaProx+'. Recuerde que las cuotas son quincenales y su contrato tiene una duracion de '+Math.round(totalCuotas/2)+' meses ('+totalCuotas+' cuotas).',
      '',
      'Guarde este número de WhatsApp para consultas sobre su cuenta, pagos o cualquier inquietud. Estamos para servirle.',
      '',
      empresa.toUpperCase()
    ].filter(Boolean).join('\n');
  }

  if(tipo==='liquidacion'){
    return [
      empresa.toUpperCase()+' — OFERTA DE LIQUIDACION ANTICIPADA',
      '',
      'Estimado/a '+nombre+':',
      '',
      'Le informamos que su cuenta N° '+cred+' califica para una liquidacion anticipada de su contrato.',
      '',
      bloqueHeader,
      '',
      'Si desea cancelar su contrato anticipadamente antes del '+fechaVencFin+', comuniquese con nuestra oficina para recibir informacion sobre el monto a liquidar, descuentos y condiciones especiales disponibles para usted.',
      '',
      'Esta es una excelente oportunidad para liberarse de su compromiso antes de tiempo.',
      '',
      empresa.toUpperCase()
    ].filter(Boolean).join('\n');
  }

  if(tipo==='vencimiento'){
    return [
      empresa.toUpperCase()+' — AVISO DE VENCIMIENTO PROXIMO',
      '',
      'Estimado/a '+nombre+':',
      '',
      'Le informamos que su contrato N° '+cred+' se encuentra proximo a su fecha de vencimiento final: '+fechaVencFin+'.',
      '',
      bloqueHeader,
      '',
      'Tiene pendientes '+cuotasRest+' cuota'+(cuotasRest!==1?'s':'')+' para completar su plan. Le solicitamos mantener sus pagos al dia para finalizar exitosamente su contrato.',
      '',
      'Para cualquier consulta, comuniquese con nuestra oficina.',
      '',
      empresa.toUpperCase()
    ].filter(Boolean).join('\n');
  }

  // custom
  var custom=($('notif-msg')&&$('notif-msg').value)||'Hola {nombre}';
  return custom.replace(/{nombre}/g,nombre).replace(/{cuota}/g,cuota).replace(/{mora}/g,mora).replace(/{modelo}/g,modelo).replace(/{cuenta}/g,cred).replace(/{empresa}/g,empresa).replace(/{saldo}/g,fmt(saldoPend)).replace(/{cuotaNum}/g,cuotaNum).replace(/{totalCuotas}/g,totalCuotas).replace(/{fechaProx}/g,fechaProx);
}

function enviarNotificaciones(){
  var tipo = ($('notif-tipo') &&$('notif-tipo').value) ||'mora';
  var canal = 'whatsapp';
  var dest = ($('notif-dest') &&$('notif-dest').value) ||'mora';
  var destinatarios = getDestinatariosNotif(dest);

  // ── Si no hay destinatarios con el filtro, abrir de todos modos ──
  if(!destinatarios.length){
    // Fallback: ofrece abrir WhatsApp con número manual
    setMicon('mensaje'); $('mtt').textContent='Enviar mensaje'; $('msb').textContent='Sin destinatarios automáticos';
    $('modal-box').className='modal';
    $('mbd').innerHTML='<div class="fg"><label>No se encontraron destinatarios con el filtro seleccionado.<br>Puedes enviar manualmente:</label></div>'
      +'<div class="fgr" style="gap:8px;margin-top:10px">'
      +'<div class="fg"><label>Número de teléfono (sin código de país)</label>'
      +'<input class="fi" id="notif_tel_manual" placeholder="Ej: 04141234567" type="tel"></div></div>'
      +'<div class="fg" style="margin-top:8px"><label>Mensaje</label>'
      +'<textarea class="fta" id="notif_msg_manual" rows="4">'+buildMensajeNotif(tipo,{nombre:'Cliente',cuota:0,mora:0})+'</textarea></div>';
    S.saveFn=function(){
      var tel=($('notif_tel_manual')&&$('notif_tel_manual').value.trim())||'';
      tel=tel.replace(/[^0-9]/g,'').replace(/^0/,'');
      if(!tel){toast('Ingresa un número de teléfono','error');return false;}
      var msg=encodeURIComponent(($('notif_msg_manual')&&$('notif_msg_manual').value)||'');
      window.open('https://wa.me/58'+tel+'?text='+msg,'_blank');
      closeM(); return true;
    };
    $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
      +'<button class="btn btn-p" onclick="saveM()">MSG Abrir WhatsApp</button>';
    $('ov').style.display='flex';
    return;
  }

  if(canal==='whatsapp'){
    // Separate contacts with and without phone numbers
    var conTel = destinatarios.filter(function(d){ return d.tel && d.tel.replace(/[^0-9]/g,'').length>=7; });
    var sinTel = destinatarios.filter(function(d){ return !d.tel || d.tel.replace(/[^0-9]/g,'').length<7; });

    if(!conTel.length){
      // None have phone — show manual option
      toast('Ningún destinatario tiene teléfono registrado. Agrega teléfonos en la ficha del cliente.','error');
      return;
    }

    // Open WhatsApp for up to 5 at a time (browser popup limit)
    var opened=0;
    conTel.slice(0,5).forEach(function(d,i){
      var tel=d.tel.replace(/[^0-9]/g,'').replace(/^0/,'');
      var msg=encodeURIComponent(buildMensajeNotif(tipo,d));
      setTimeout(function(){ window.open('https://wa.me/58'+tel+'?text='+msg,'_blank'); }, i*600);
      opened++;
    });

    var msgs=[];
    if(opened>0) msgs.push('✓ Abriendo WhatsApp para '+opened+' contacto'+(opened!==1?'s':''));
    if(conTel.length>5) msgs.push(' Solo se abren 5 a la vez. Quedan '+(conTel.length-5)+' más — usa "Copiar" para el resto');
    if(sinTel.length>0) msgs.push('ℹ️ '+sinTel.length+' cliente'+(sinTel.length!==1?'s':'')+' sin teléfono: '+sinTel.map(function(d){return d.nombre.split(' ')[0];}).join(', '));
    toast(msgs.join('\n'), opened>0?'success':'info');

  } else {
    // Copy all messages to clipboard
    var allMsgs=destinatarios.map(function(d,i){
      return '('+(i+1)+') '+d.nombre+(d.tel?' — '+d.tel:' — SIN TELÉFONO')+'\n'+buildMensajeNotif(tipo,d);
    }).join('\n\n─────────────────\n\n');
    if(navigator.clipboard){
      navigator.clipboard.writeText(allMsgs).then(function(){
        toast(destinatarios.length+' mensaje'+(destinatarios.length!==1?'s':'')+' copiados al portapapeles ✓','success');
      });
    } else {
      var ta=document.createElement('textarea');
      ta.value=allMsgs; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      toast(destinatarios.length+' mensajes copiados','success');
    }
  }

  // Save to history
  cargarHistorialNotificaciones();
  if(!window._notifHistorial) window._notifHistorial=[];
  window._notifHistorial.unshift({
    tipo:{lead_bienvenida:'Bienvenida Lead',bienvenida_activo:'Bienvenida Cliente Activo',mora:'Mora',mora_grave:'Mora Grave',cuota:'Cuota próxima',confirmado:'Pago recibido',cuenta:'Estado de cuenta',acuerdo:'Acuerdo de pago',bienvenida:'Bienvenida Cliente Activo',liquidacion:'Liquidación anticipada',vencimiento:'Vencimiento próximo',custom:'Personalizado'}[tipo]||tipo,
    canal:canal, dest:{leads:'Leads',activos:'Clientes activos',mora:'Clientes en mora',proximas:'Cuotas esta semana',especifico:'Cliente específico'}[dest]||dest,
    cantidad:destinatarios.length,
    mensaje:buildMensajeNotif(tipo,destinatarios[0]||{}),
    fecha:new Date().toLocaleDateString('es-VE')
  });
  if(window._notifHistorial.length>100) window._notifHistorial=window._notifHistorial.slice(0,100);
  guardarHistorialNotificaciones();
  renderHistorialNotificaciones();
  if(typeof logActividad==='function') logActividad('notif_enviada','notif',tipo,{canal:canal, dest:dest, cantidad:destinatarios.length});
}
