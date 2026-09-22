// Logica de documentos de clientes y wizard: Firebase Storage, fallback local y gestor de expediente.
// Extraido de assets/pagasi-app.js sin cambiar rutas, metadata ni persistencia.

var _wzDocsUp={};
var _wzDocDefs={
  // Perfil del cliente
  wz_doc_ci:{label:'Cédula de Identidad',icon:'🪪',group:'Perfil de cliente',accept:'image/*,.pdf'},
  wz_doc_ci_rev:{label:'Cédula de Identidad (Reverso)',icon:'🪪',group:'Perfil de cliente',accept:'image/*,.pdf'},
  wz_doc_lic:{label:'Licencia de Conducir',icon:'',group:'Perfil de cliente',accept:'image/*,.pdf'},
  wz_doc_rif:{label:'RIF',icon:'',group:'Perfil de cliente',accept:'image/*,.pdf'},
  wz_doc_foto_cli:{label:'Foto del Cliente',icon:'',group:'Perfil de cliente',accept:'image/*',capture:'user'},
  wz_doc_rec:{label:'Comprobante de Residencia',icon:'',group:'Perfil de cliente',accept:'image/*,.pdf'},
  wz_doc_sel:{label:'Selfie con Cédula',icon:'',group:'Perfil de cliente',accept:'image/*',capture:'user'},

  // Financiamiento
  wz_doc_ing:{label:'Comprobante de Ingresos',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_const_trab:{label:'Constancia de Trabajo',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_cart_ing:{label:'Carta de Ingresos',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_est_cta:{label:'Estados de Cuenta (3 meses)',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_ref:{label:'Referencias firmadas',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_ref_per:{label:'Referencias Personales',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_ref_com:{label:'Referencias Comerciales',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_contrato:{label:'Contrato Firmado',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_pagare:{label:'Pagaré',icon:'️',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_auto_cob:{label:'Autorización de Cobro',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_entrega_moto:{label:'Documento de Entrega de Moto',icon:'️',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_cond_esp:{label:'Acuerdo de Condiciones Especiales',icon:'',group:'Financiamiento',accept:'image/*,.pdf'},
  wz_doc_firma_dig:{label:'Firma Digital o Evidencia de Firma',icon:'️',group:'Financiamiento',accept:'image/*,.pdf'},

  // Documentos de la moto
  wz_doc_fact_moto:{label:'Factura de Compra de la Moto',icon:'',group:'Documentos de la moto',accept:'image/*,.pdf'},
  wz_doc_cert_origen:{label:'Certificado de Origen',icon:'',group:'Documentos de la moto',accept:'image/*,.pdf'},
  wz_doc_cert_circ:{label:'Certificado de Circulación',icon:'',group:'Documentos de la moto',accept:'image/*,.pdf'},
  wz_doc_titulo_prop:{label:'Título de Propiedad',icon:'️',group:'Documentos de la moto',accept:'image/*,.pdf'},
  wz_doc_seguro:{label:'Póliza de Seguro',icon:'️',group:'Documentos de la moto',accept:'image/*,.pdf'},
  wz_doc_revision:{label:'Revisión / Inspección',icon:'',group:'Documentos de la moto',accept:'image/*,.pdf'},
  wz_doc_fotos_moto:{label:'Fotos de la Moto',icon:'',group:'Documentos de la moto',accept:'image/*',capture:'environment'},

  // Pagos
  wz_doc_inicial:{label:'Comprobante de Pago Inicial',icon:'',group:'Pagos',accept:'image/*,.pdf'},
  wz_doc_cuotas:{label:'Comprobantes de Cuotas',icon:'',group:'Pagos',accept:'image/*,.pdf'},
  wz_doc_transfer:{label:'Capturas de Transferencias',icon:'',group:'Pagos',accept:'image/*,.pdf'},
  wz_doc_pago_var:{label:'Soportes Binance / Transferencia / Efectivo',icon:'',group:'Pagos',accept:'image/*,.pdf'}
};
function _wzDocTotal(){ return Object.keys(_wzDocDefs).length; }
// ── Formato de cédula Venezuela: siempre V-12345678 (o E-, J-, G-) ──
function _wzFmtCedula(raw){
  if(raw==null) return '';
  var s = String(raw).toUpperCase().replace(/\s+/g,'');
  // Remover todo excepto letras válidas, dígitos y guión
  var prefixMatch = s.match(/^([VEJGP])/);
  var digits = s.replace(/[^0-9]/g,'');
  if(!digits) return '';
  var prefix = prefixMatch ? prefixMatch[1] : 'V';
  return prefix + '-' + digits;
}

function _wzCedulaInput(ev){
  var el = ev && ev.target ? ev.target : ev;
  if(!el) return;
  var pos = el.selectionStart;
  var prev = el.value;
  var next = _wzFmtCedula(prev);
  if(next !== prev){
    el.value = next;
    // Mover cursor al final (simple, evita saltos raros)
    try{ el.setSelectionRange(next.length, next.length); }catch(_e){}
  }
}

function _wzSafeFileName(name){
  return String(name||'archivo').replace(/[^a-zA-Z0-9._-]+/g,'_');
}
function _wzDocLabel(id){ return (_wzDocDefs[id]&&_wzDocDefs[id].label)||id; }
// ══════════════════════════════════════════════════════════════════
// SISTEMA LIBRE DE DOCUMENTOS — compartido por wizard y tarjeta cliente
// ══════════════════════════════════════════════════════════════════

// ── Abrir un documento pidiendo la URL fresca al Storage de V2 ──
// Usa el path guardado para regenerar la URL en el bucket actual. Cae a la URL guardada si falla.
function _abrirDocFresco(path, urlVieja){
  // HTML del loader que aparece mientras carga
  var LOADER_HTML = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cargando documento...</title>'
    + '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F8FAFC;color:#334155}'
    + '.box{text-align:center;padding:32px;background:#fff;border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,.08);max-width:340px}'
    + '.spinner{width:42px;height:42px;border:3px solid #E2E8F0;border-top-color:#2563EB;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}'
    + '@keyframes spin{to{transform:rotate(360deg)}}'
    + '.lbl{font-size:14px;font-weight:600}.sub{font-size:11.5px;color:#64748B;margin-top:6px}</style></head>'
    + '<body><div class="box"><div class="spinner"></div><div class="lbl">Cargando documento…</div><div class="sub">Obteniendo URL desde Firebase Storage</div></div></body></html>';

  function showError(win, mensaje, detalle){
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Error</title>'
      + '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#FEF2F2;color:#1F2937}'
      + '.box{text-align:center;padding:36px;background:#fff;border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,.08);max-width:480px}'
      + 'h2{color:#DC2626;margin:0 0 12px;font-size:18px}p{margin:8px 0;font-size:13px;line-height:1.55}'
      + '.det{margin-top:18px;padding:12px;background:#F8FAFC;border-radius:8px;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#64748B;word-break:break-all;text-align:left}'
      + '</style></head><body><div class="box">'
      + '<h2>No se pudo abrir el documento</h2>'
      + '<p>'+mensaje+'</p>'
      + '<div class="det">'+detalle+'</div>'
      + '<p style="font-size:11.5px;color:#94A3B8;margin-top:16px">Verifica las reglas de Firebase Storage y que el archivo exista.</p>'
      + '</div></body></html>';
    if(win && !win.closed){ try{ win.document.open(); win.document.write(html); win.document.close(); }catch(e){} }
  }

  function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }

  // Caso 1: documentos locales (data: o local://) — abrir directo
  if(!path || path.indexOf('local://')===0 || (urlVieja||'').indexOf('data:')===0){
    if(urlVieja){
      var w1 = window.open(urlVieja, '_blank');
      if(!w1){ alert('Tu navegador bloqueó el popup. Habilita popups para este sitio.'); }
    } else {
      alert('Este documento no tiene URL guardada ni archivo en Storage.');
    }
    return;
  }

  // Caso 2: no hay Storage disponible — fallback a urlVieja
  if(typeof storage === 'undefined' || !storage || typeof storage.ref !== 'function'){
    if(urlVieja){ window.open(urlVieja, '_blank'); }
    else { alert('Firebase Storage no está cargado. Recarga la página.'); }
    return;
  }

  // Caso 3: pedimos la URL fresca a Storage
  // Abrir ventana ANTES de la promesa (evita pop-up blocker)
  var win = window.open('', '_blank');
  if(win){
    try { win.document.open(); win.document.write(LOADER_HTML); win.document.close(); } catch(e){}
  }

  storage.ref().child(path).getDownloadURL().then(function(url){
    if(win && !win.closed){ win.location.replace(url); }
    else { window.open(url, '_blank'); }
  }).catch(function(err){
    console.warn('[Storage] getDownloadURL falló para', path, err);
    // Plan B: intentar la URL vieja guardada
    if(urlVieja){
      if(win && !win.closed){ win.location.replace(urlVieja); }
      else { window.open(urlVieja, '_blank'); }
      return;
    }
    // Plan C: mostrar error claro
    var code = err && err.code ? err.code : 'unknown';
    var msg = err && err.message ? err.message : String(err);
    var mensaje = code === 'storage/object-not-found'
        ? 'El archivo no existe en Firebase Storage.'
        : code === 'storage/unauthorized'
        ? 'No tienes permisos para acceder a este archivo. Revisa las reglas de Storage.'
        : 'Hubo un error al obtener el archivo.';
    showError(win, mensaje, '<strong>Path:</strong> '+escapeHtml(path)+'<br><br><strong>Code:</strong> '+escapeHtml(code)+'<br><strong>Detalle:</strong> '+escapeHtml(msg));
  });
}

// ── HTML del bloque en la tarjeta de cliente ──
function _docLibreClienteHtml(c){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  var cliId = String(c.id);
  var docs = Array.isArray(c.documentos) ? c.documentos : [];
  var html = '';

  // Lista de docs existentes
  if(docs.length){
    html += '<div style="margin-bottom:12px">';
    html += docs.map(function(d){
      if(!d) return '';
      var isLocal = d.source==='local' || (d.url||'').indexOf('data:')===0;
      var badge = isLocal ? '<span class="bdg b-a" style="font-size:9px;margin-left:4px">local</span>'
                          : '<span class="bdg b-g" style="font-size:9px;margin-left:4px">nube</span>';
      return '<div class="li" style="margin-bottom:6px">'
        + '<div class="li-ic" style="background:var(--gs)">📄</div>'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-weight:700;color:var(--ink);font-size:12px">' + esc(d.label||d.name||'Documento') + badge + '</div>'
        + '<div class="tds" style="font-size:10px">' + esc(d.name||'Archivo') + (d.size?' · '+Math.round(d.size/1024)+'KB':'') + (d.uploadedAt?' · '+fmtFechaHora(d.uploadedAt):'') + '</div>'
        + '</div>'
        + (d.url || d.path ? '<button class="btn btn-xs btn-g" onclick="_abrirDocFresco(\''+String(d.path||'').replace(/'/g,"\\'")+'\',\''+String(d.url||'').replace(/'/g,"\\'")+'\')">Abrir</button>' : '')
        + '<button class="btn btn-xs btn-d" onclick="_cliDocDelete(\''+cliId+'\',\''+d.id+'\')">✕</button>'
        + '</div>';
    }).join('');
    html += '</div>';
  } else {
    html += '<div style="color:var(--ink3);font-size:12px;font-style:italic;margin-bottom:12px;padding:8px 0">Sin documentos cargados aún.</div>';
  }

  // Formulario para agregar
  html += '<div style="background:rgba(37,99,235,.04);border:1px solid var(--rim2);border-radius:12px;padding:12px">'
    + '<div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:8px">➕ Agregar documento</div>'
    + '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end">'
    + '<div><label style="font-size:10.5px;font-weight:700;color:var(--ink3);display:block;margin-bottom:4px">Nombre del documento</label>'
    + '<input class="fi" id="cli_doc_nombre_'+cliId+'" type="text" placeholder="Ej: Cédula, Contrato, Factura..." style="width:100%;font-size:13px"></div>'
    + '<div style="padding-bottom:1px"><label class="btn btn-p btn-sm" style="cursor:pointer;white-space:nowrap">'
    + '📎 Seleccionar archivo'
    + '<input type="file" accept="image/*,.pdf,.doc,.docx" multiple style="display:none" onchange="_docLibreSubirCliente(this,\''+cliId+'\')"></label></div>'
    + '</div>'
    + '</div>';

  return html;
}

// ── Subir archivo desde tarjeta de cliente ──
function _docLibreSubirCliente(input, cliId){
  var nombreInput = document.getElementById('cli_doc_nombre_'+cliId);
  var nombreBase = (nombreInput && nombreInput.value.trim()) ? nombreInput.value.trim() : '';
  var files = input.files;
  if(!files || !files.length) return;
  var c = S.clientes.find(function(x){ return String(x.id)===String(cliId); });
  if(!c){ toast('Cliente no encontrado','error'); return; }

  Array.from(files).forEach(function(file, idx){
    var label = files.length===1 ? (nombreBase||file.name) : (nombreBase ? nombreBase+' ('+(idx+1)+')' : file.name);
    var docId = 'libre_'+Date.now()+'_'+Math.floor(Math.random()*100000)+'_'+idx;
    var fakeInput = { files:[file], getAttribute: function(a){ return a==='data-cliente-id'?String(cliId):docId; } };
    // Save label for use in upload
    window._docLibrePendingLabel = window._docLibrePendingLabel || {};
    window._docLibrePendingLabel[docId] = label;
    _cliDocUpload(fakeInput, String(cliId), docId);
  });

  if(nombreInput) nombreInput.value = '';
  input.value = '';
}

// ── HTML del bloque en el wizard ──
function _docLibreWizardHtml(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  var existentes = Array.isArray(WZ.documentos) ? WZ.documentos : [];
  var listaHtml = '';
  if(existentes.length){
    listaHtml = '<div id="wz_doc_libre_list" style="margin-bottom:10px">'
      + existentes.map(function(d){
          if(!d) return '';
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--surf2);border-radius:9px;border:1px solid var(--rim);margin-bottom:6px">'
            + '<div style="font-size:16px">📄</div>'
            + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:var(--ink)">'+esc(d.label||d.name||'Documento')+'</div>'
            + '<div style="font-size:10px;color:var(--ink3)">'+esc(d.name||'Archivo')+(d.size?' · '+Math.round(d.size/1024)+'KB':'')+'</div></div>'
            + (d.url||d.path?'<button onclick="_abrirDocFresco(\''+String(d.path||'').replace(/'/g,"\\'")+'\',\''+String(d.url||'').replace(/'/g,"\\'")+'\')" style="font-size:11px;color:var(--p1);font-weight:700;background:none;border:none;cursor:pointer;padding:0">Abrir</button>':'')
            + '</div>';
        }).join('')
      + '</div>';
  } else {
    listaHtml = '<div id="wz_doc_libre_list" style="margin-bottom:10px"></div>';
  }

  return '<div style="background:rgba(37,99,235,.05);border:1px solid var(--rim2);border-radius:12px;padding:12px;margin-bottom:10px">'
    + '<div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:8px">📋 Documentos del expediente</div>'
    + listaHtml
    + '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end">'
    + '<div><label style="font-size:10.5px;font-weight:700;color:var(--ink3);display:block;margin-bottom:4px">Nombre del documento</label>'
    + '<input class="fi" id="wz_doc_libre_nombre" type="text" placeholder="Ej: Cédula, Contrato, Recibo..." style="width:100%"></div>'
    + '<div style="padding-bottom:1px"><label class="btn btn-p btn-sm" style="cursor:pointer;white-space:nowrap">'
    + '📎 Agregar'
    + '<input type="file" accept="image/*,.pdf,.doc,.docx" multiple style="display:none" onchange="_docLibreWizardSubir(this)"></label></div>'
    + '</div>'
    + '<div id="wz_doc_libre_status" style="font-size:11px;color:var(--ink3);margin-top:6px;min-height:16px"></div>'
    + '</div>';
}

// ── Subir archivo desde el wizard ──
function _docLibreWizardSubir(input){
  var nombreInput = document.getElementById('wz_doc_libre_nombre');
  var nombreBase = (nombreInput && nombreInput.value.trim()) ? nombreInput.value.trim() : '';
  var files = input.files;
  if(!files || !files.length) return;

  var statusEl = document.getElementById('wz_doc_libre_status');
  if(statusEl) statusEl.textContent = 'Subiendo...';

  Array.from(files).forEach(function(file, idx){
    var label = files.length===1 ? (nombreBase||file.name) : (nombreBase ? nombreBase+' ('+(idx+1)+')' : file.name);
    var docId = 'wzdoc_'+Date.now()+'_'+Math.floor(Math.random()*100000)+'_'+idx;

    window._docLibrePendingLabel = window._docLibrePendingLabel || {};
    window._docLibrePendingLabel[docId] = label;

    // Usar el mismo sistema de upload del wizard existente
    _wzHandleDocLibre(file, docId, label, function(meta){
      // Agregar a WZ.documentos
      if(!Array.isArray(WZ.documentos)) WZ.documentos = [];
      meta.label = label;
      WZ.documentos = WZ.documentos.filter(function(d){ return d.id!==docId; });
      WZ.documentos.push(meta);
      WZ.docsCount = WZ.documentos.length;
      // Actualizar lista visual sin re-renderizar wizard
      _docLibreWizardRefreshList();
      if(statusEl) statusEl.textContent = '✓ '+label+' guardado';
      setTimeout(function(){ if(statusEl) statusEl.textContent=''; }, 2500);
    });
  });

  if(nombreInput) nombreInput.value = '';
  input.value = '';
}

function _docLibreWizardRefreshList(){
  var listEl = document.getElementById('wz_doc_libre_list');
  if(!listEl) return;
  var docs = Array.isArray(WZ.documentos) ? WZ.documentos : [];
  if(!docs.length){ listEl.innerHTML=''; return; }
  listEl.innerHTML = docs.map(function(d){
    if(!d) return '';
    return '<div style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:var(--surf2);border-radius:9px;border:1px solid var(--rim);margin-bottom:6px">'
      + '<div style="font-size:16px">📄</div>'
      + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:var(--ink)">'+esc(d.label||d.name||'Documento')+'</div>'
      + '<div style="font-size:10px;color:var(--ink3)">'+esc(d.name||'Archivo')+(d.size?' · '+Math.round(d.size/1024)+'KB':'')+'</div></div>'
      + (d.url||d.path?'<button onclick="_abrirDocFresco(\''+String(d.path||'').replace(/'/g,"\\'")+'\',\''+String(d.url||'').replace(/'/g,"\\'")+'\')" style="font-size:11px;color:var(--p1);font-weight:700;background:none;border:none;cursor:pointer;padding:0">Abrir</button>':'')
      + '</div>';
  }).join('');
}

// ── Manejar upload individual en wizard (sin re-renderizar) ──
function _wzHandleDocLibre(file, docId, label, onDone){
  var cliId = _wzCurrentClienteKey();
  var tempKey = _wzEnsureDocsTempKey();
  var useKey = (cliId && String(cliId).indexOf('TMP-')!==0) ? String(cliId) : tempKey;

  var meta = {
    id: docId,
    label: label,
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    source: 'local',
    url: ''
  };

  // Intentar Firebase Storage primero
  if(typeof storage !== 'undefined' && storage && typeof storage.ref === 'function'){
    var path = 'clientes/'+useKey+'/docs/'+docId+'_'+_wzSafeFileName(file.name);
    var ref = storage.ref().child(path);
    var task = ref.put(file);
    task.on('state_changed', null, function(err){
      // Fallback a local
      _wzHandleDocLibreLocal(file, docId, label, meta, onDone);
    }, function(){
      ref.getDownloadURL().then(function(url){
        meta.url = url;
        meta.path = path;
        meta.source = 'firebase';
        _wzDocsUp[docId] = meta;
        if(onDone) onDone(meta);
      }).catch(function(){
        _wzHandleDocLibreLocal(file, docId, label, meta, onDone);
      });
    });
  } else {
    _wzHandleDocLibreLocal(file, docId, label, meta, onDone);
  }
}

function _wzHandleDocLibreLocal(file, docId, label, meta, onDone){
  if(file.size > 2*1024*1024){
    toast('Archivo demasiado grande para guardar localmente (máx 2MB)','error');
    meta.url = '';
    _wzDocsUp[docId] = meta;
    if(onDone) onDone(meta);
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e){
    meta.url = e.target.result;
    meta.source = 'local';
    _wzDocsUp[docId] = meta;
    try{
      var key = 'pagasi_cli_docs_'+_wzCurrentClienteKey();
      var arr = JSON.parse(localStorage.getItem(key)||'[]');
      arr = arr.filter(function(d){ return d.id!==docId; });
      arr.push(meta);
      localStorage.setItem(key, JSON.stringify(arr));
    }catch(e){}
    if(onDone) onDone(meta);
  };
  reader.readAsDataURL(file);
}

function _renderCliDocManager(c){
  return _docLibreClienteHtml(c);
}

// Eliminar documento
function _cliDocDelete(cliId, docId){
  var c = S.clientes.find(function(x){ return String(x.id)===String(cliId); });
  if(!c) return;
  if(!confirm('¿Eliminar este documento? Esta acción no se puede deshacer.')) return;

  var docs = Array.isArray(c.documentos) ? c.documentos.slice() : [];
  var removed = docs.find(function(d){return d&&d.id===docId;});
  docs = docs.filter(function(d){return !d||d.id!==docId;});
  c.documentos = docs;
  c.docs_count = docs.length;

  // Quitar de localStorage
  try{
    var key = 'pagasi_cli_docs_'+cliId;
    var local = JSON.parse(localStorage.getItem(key)||'[]').filter(function(d){return !d||d.id!==docId;});
    localStorage.setItem(key, JSON.stringify(local));
  }catch(e){}

  // Borrar de Firebase Storage si existe
  if(storage && removed && removed.path && removed.path.indexOf('local://')!==0){
    try{ storage.ref().child(removed.path).delete().catch(function(){}); }catch(e){}
  }

  // Actualizar Firestore
  if(db){
    db.collection('clientes').doc(String(c.id)).set({documentos:docs, docs_count:docs.length},{merge:true})
      .then(function(){ toast('Documento eliminado','success'); })
      .catch(function(){ toast('Documento eliminado localmente','info'); });
  } else {
    toast('Documento eliminado','success');
  }

  _cliDocRefreshInModal(cliId);
}
// Guardar documento en localStorage como fallback cuando no hay Storage
function _cliDocSaveLocal(cliId, meta){
  try{
    var key = 'pagasi_cli_docs_'+cliId;
    var prev = JSON.parse(localStorage.getItem(key)||'[]');
    var idx = prev.findIndex(function(d){return d&&d.id===meta.id;});
    if(idx>=0) prev[idx] = meta; else prev.push(meta);
    localStorage.setItem(key, JSON.stringify(prev));
    return true;
  }catch(e){ console.warn('localStorage doc save failed:', e); return false; }
}

function _cliDocLoadLocal(cliId){
  try{
    var key = 'pagasi_cli_docs_'+cliId;
    return JSON.parse(localStorage.getItem(key)||'[]');
  }catch(e){ return []; }
}

// Fusiona documentos locales + remotos en c.documentos (último gana por doc id)
function _cliDocMergeInto(c){
  if(!c) return;
  var remote = Array.isArray(c.documentos) ? c.documentos.slice() : [];
  var local = _cliDocLoadLocal(c.id);
  var map = {};
  remote.forEach(function(d){ if(d&&d.id) map[d.id] = d; });
  local.forEach(function(d){
    if(!d||!d.id) return;
    // local gana si es más reciente
    if(!map[d.id] || (d.uploadedAt||'') > (map[d.id].uploadedAt||'')){ map[d.id] = d; }
  });
  c.documentos = Object.keys(map).map(function(k){return map[k];});
  c.docs_count = c.documentos.length;
}

function _cliDocUpload(input, clienteId, docId){
  var file = input && input.files && input.files[0];
  if(!file){ return; }
  var cliId = String(clienteId||'').trim();
  if(!cliId){ toast('Cliente inválido','error'); return; }
  var def = _wzDocDefs[docId] || {};

  // Limite de tamaño para localStorage fallback: 2MB por archivo
  var FILE_LIMIT_LOCAL = 2 * 1024 * 1024;

  // Indicador visual inmediato en el label que contiene el input
  var label = input.closest ? input.closest('label') : null;
  var statusEl = null;
  if(label){
    label.style.borderColor = 'var(--p1)';
    label.style.background = 'rgba(37,99,235,.08)';
    statusEl = label.querySelector('[data-doc-status]') || (function(){
      var el = label.querySelector('div[style*="font-size:10.5px"]');
      if(el) el.setAttribute('data-doc-status','1');
      return el;
    })();
    if(statusEl){ statusEl.textContent = '⏳ Subiendo...'; statusEl.style.color = 'var(--p1)'; }
  }

  function finalize(meta, source){
    var c = S.clientes.find(function(x){ return String(x.id)===String(cliId); });
    if(!c){
      toast('Cliente no encontrado','error');
      return;
    }
    // Actualizar in-memory
    var docs = Array.isArray(c.documentos) ? c.documentos.slice() : [];
    var idx = docs.findIndex(function(d){ return d && d.id===docId; });
    if(idx>=0) docs[idx] = meta; else docs.push(meta);
    c.documentos = docs;
    c.docs_count = docs.length;

    // Persistir: intenta Firestore, sino solo localStorage
    var savedRemote = false;
    if(db && source==='firebase'){
      db.collection('clientes').doc(String(c.id)).set({documentos:docs, docs_count:docs.length},{merge:true})
        .then(function(){
          savedRemote = true;
          toast('✓ '+(def.label||'Documento')+' guardado','success');
        })
        .catch(function(err){
          console.error('Firestore save error:', err);
          _cliDocSaveLocal(cliId, meta);
          toast('Guardado localmente (Firestore falló: '+(err.code||err.message||'error')+')','error');
        });
    } else {
      // Ya está en localStorage
      toast('✓ '+(def.label||'Documento')+' guardado localmente','success');
    }

    // Refrescar UI solo en la sección docs
    setTimeout(function(){ _cliDocRefreshInModal(cliId); }, 200);
  }

  toast('Subiendo '+(def.label||'documento')+'...','success');

  // CAMINO 1: Firebase Storage disponible → subir remoto
  if(storage && typeof storage.ref === 'function'){
    var safeName = _wzSafeFileName(file.name || ('documento_'+docId));
    var filePath = 'clientes/'+cliId+'/documentos/'+docId+'_'+Date.now()+'_'+safeName;
    var ref = storage.ref().child(filePath);
    var uploadCompleted = false;

    // TIMEOUT de seguridad: si el upload no responde en 15s, asumimos que falló (CORS silencioso, red caída, etc)
    var timeoutId = setTimeout(function(){
      if(uploadCompleted) return;
      uploadCompleted = true;
      console.warn('Upload timeout (15s) — usando fallback local');
      toast('Upload lento, guardando localmente...','info');
      if(file.size <= FILE_LIMIT_LOCAL){
        _cliDocUploadLocal(file, cliId, docId, def, finalize);
      } else {
        toast('Archivo muy grande para fallback local ('+Math.round(file.size/1024/1024)+'MB)','error');
        if(label){ label.style.borderColor = 'var(--red)'; label.style.background = 'rgba(217,59,90,.08)'; }
      }
      if(input) input.value='';
    }, 15000);

    function handleUploadError(err){
      if(uploadCompleted) return;
      uploadCompleted = true;
      clearTimeout(timeoutId);
      console.error('Storage upload error:', err);
      var errMsg = err && (err.code || err.message) || 'error desconocido';
      // Detectar CORS específicamente
      var isCors = /cors|preflight|access control|network/i.test(errMsg);
      if(file.size <= FILE_LIMIT_LOCAL){
        toast(isCors ? 'Firebase Storage no permite tu dominio (CORS). Guardando localmente...' : 'Storage falló: '+errMsg+'. Guardando local.','info');
        _cliDocUploadLocal(file, cliId, docId, def, finalize);
      } else {
        toast('Error: '+errMsg+' · Archivo muy grande para local ('+Math.round(file.size/1024/1024)+'MB)','error');
        if(label){ label.style.borderColor = 'var(--red)'; label.style.background = 'rgba(217,59,90,.08)'; }
      }
      if(input) input.value='';
    }

    function handleUploadSuccess(url){
      if(uploadCompleted) return;
      uploadCompleted = true;
      clearTimeout(timeoutId);
      var meta = {
        id:docId, label:_wzDocLabel(docId),
        name:file.name||safeName, url:url, path:filePath,
        type:file.type||'', size:file.size||0,
        uploadedAt:new Date().toISOString(), group:def.group||'',
        source:'firebase'
      };
      finalize(meta, 'firebase');
      if(input) input.value='';
    }

    try{
      var task = ref.put(file, {contentType:file.type||'application/octet-stream', customMetadata:{docId:docId, docLabel:_wzDocLabel(docId), clienteId:cliId}});
      // Usar .on() para capturar errores que .then() se come silenciosamente
      task.on('state_changed',
        function(snapshot){
          // Progreso — actualizar label si queremos
          if(label && !uploadCompleted){
            var pct = snapshot.totalBytes > 0 ? Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100) : 0;
            var statusDiv = label.querySelector('[data-doc-status]');
            if(statusDiv) statusDiv.textContent = '⏳ Subiendo... '+pct+'%';
          }
        },
        handleUploadError,
        function(){
          // completado — obtener URL
          task.snapshot.ref.getDownloadURL()
            .then(handleUploadSuccess)
            .catch(handleUploadError);
        }
      );
    }catch(e){
      handleUploadError(e);
    }
  }
  // CAMINO 2: No hay Storage → localStorage directamente
  else {
    if(file.size > FILE_LIMIT_LOCAL){
      toast('Archivo muy grande ('+Math.round(file.size/1024/1024)+'MB). Máximo 2MB en modo local.','error');
      if(label){ label.style.borderColor = 'var(--red)'; label.style.background = 'rgba(217,59,90,.08)'; }
      if(input) input.value='';
      return;
    }
    _cliDocUploadLocal(file, cliId, docId, def, finalize);
    if(input) input.value='';
  }
}

// Sube un archivo a localStorage como base64 data URL
function _cliDocUploadLocal(file, cliId, docId, def, finalize){
  var reader = new FileReader();
  reader.onload = function(ev){
    var dataUrl = ev.target.result;
    var meta = {
      id:docId, label:_wzDocLabel(docId),
      name:file.name||('documento_'+docId),
      url:dataUrl,
      path:'local://'+cliId+'/'+docId,
      type:file.type||'',
      size:file.size||0,
      uploadedAt:new Date().toISOString(),
      group:def.group||'',
      source:'local'
    };
    _cliDocSaveLocal(cliId, meta);
    finalize(meta, 'local');
  };
  reader.onerror = function(){
    toast('Error leyendo el archivo','error');
  };
  reader.readAsDataURL(file);
}

// Refresca solo el panel de documentos dentro del modal de cliente (evita perder scroll / tab activo)
function _cliDocRefreshInModal(cliId){
  var c = S.clientes.find(function(x){ return String(x.id)===String(cliId); });
  if(!c) return;
  _cliDocMergeInto(c);
  var mbd = $('mbd'); if(!mbd) return;
  var docsPanel = mbd.querySelector('.cf-panel[data-tab="docs"]');
  if(!docsPanel) return;
  var section = docsPanel.querySelector('.cf-section');
  if(section){
    section.innerHTML = '<div class="cf-section-h"><div class="cf-section-t">Expediente del cliente</div></div>' + _renderCliDocManager(c);
  }
  // Actualizar contador en el tab
  var tab = mbd.querySelector('.cf-tab[data-tab="docs"] .cf-tab-count');
  if(tab) tab.textContent = (c.documentos||[]).length;
}

function _wzEnsureDocsTempKey(){
  if(!WZ._docsTempKey) WZ._docsTempKey='TMP-'+Date.now()+'-'+Math.floor(Math.random()*100000);
  return WZ._docsTempKey;
}
function _wzCurrentClienteKey(){
  return String((WZ.id||WZ.ci||WZ._solClienteId||_wzEnsureDocsTempKey())||'').trim();
}
function _wzGetClientDocsArray(){
  return Object.keys(_wzDocsUp).map(function(k){ return _wzDocsUp[k]; }).filter(function(x){ return x && x.url; });
}
function _wzSetDocVisual(id,meta){
  var status=document.getElementById(id+'_status');
  var ico=document.getElementById(id+'_ico');
  var wrap=document.getElementById(id+'_wrap');
  var prog=document.getElementById(id+'_prog');
  if(wrap){wrap.style.background='var(--greens)';wrap.style.borderColor='rgba(6,176,106,.3)';}
  if(status){status.textContent=(meta&&meta.name)?(meta.name.length>28?meta.name.slice(0,26)+'…':meta.name):'Subido';status.style.color='var(--green)';}
  if(ico){ico.textContent='';}
  if(prog){prog.style.width='100%';}
}
function _wzHydrateDocsUI(){
  Object.keys(_wzDocsUp).forEach(function(id){ if(_wzDocsUp[id]&&_wzDocsUp[id].url) _wzSetDocVisual(id,_wzDocsUp[id]); });
  _wzUpdateDocCount();
}
function _wzLoadDocsUpFromCliente(c){
  _wzDocsUp={};
  var arr=(c&&Array.isArray(c.documentos))?c.documentos:[];
  arr.forEach(function(d){ if(d&&d.id) _wzDocsUp[d.id]=d; });
  WZ.documentos=arr.slice();
  WZ.docsCount=arr.length;
}
function _wzPersistDocsToClienteIfPossible(){
  var cliId=_wzCurrentClienteKey();
  var docs=_wzGetClientDocsArray();
  WZ.documentos=docs;
  WZ.docsCount=docs.length;
  if(!db || !cliId || String(cliId).indexOf('TMP-')===0) return Promise.resolve(false);
  return db.collection('clientes').doc(String(cliId)).set({
    id:String(cliId),
    documentos:docs,
    docs_count:docs.length,
    editadoEn:new Date().toISOString(),
    editadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin',
    editadoPorUid:(S.currentUser&&S.currentUser.uid)||''
  }, {merge:true}).then(function(){ return true; }).catch(function(err){ console.warn('Persist docs:', err&&err.message?err.message:err); return false; });
}

function _wzHandleDoc(input,id){
  var file=input&&input.files&&input.files[0]; if(!file)return;
  var prog=document.getElementById(id+'_prog');
  var status=document.getElementById(id+'_status');
  var ico=document.getElementById(id+'_ico');
  var wrap=document.getElementById(id+'_wrap');
  if(!storage || typeof storage.ref!=='function'){
    toast('Firebase Storage no está disponible para guardar documentos','error');
    return;
  }
  if(status){status.textContent='Subiendo...';status.style.color='var(--ink3)';}
  if(ico)ico.textContent='⏳';
  if(wrap){wrap.style.background='var(--surf2)';wrap.style.borderColor='var(--rim2)';}

  var clienteKey=_wzCurrentClienteKey();
  var safeName=_wzSafeFileName(file.name||('documento_'+id));
  var filePath='clientes/'+clienteKey+'/documentos/'+id+'_'+Date.now()+'_'+safeName;
  var ref=storage.ref().child(filePath);
  var task=ref.put(file,{contentType:file.type||'application/octet-stream',customMetadata:{docId:id,docLabel:_wzDocLabel(id),clienteId:clienteKey}});

  task.on('state_changed', function(snap){
    var pct=snap.totalBytes?Math.round((snap.bytesTransferred/snap.totalBytes)*100):0;
    if(prog)prog.style.width=Math.min(100,pct)+'%';
    if(status)status.textContent='Subiendo... '+pct+'%';
  }, function(err){
    console.warn('Upload doc error:', err);
    if(status){status.textContent='Error al subir';status.style.color='var(--red)';}
    if(ico)ico.textContent='️';
    if(wrap){wrap.style.background='rgba(232,75,75,.06)';wrap.style.borderColor='rgba(232,75,75,.25)';}
    toast('No se pudo guardar el documento','error');
  }, function(){
    task.snapshot.ref.getDownloadURL().then(function(url){
      var meta={
        id:id,
        label:_wzDocLabel(id),
        name:file.name||safeName,
        url:url,
        path:filePath,
        type:file.type||'',
        size:file.size||0,
        uploadedAt:new Date().toISOString()
      };
      _wzDocsUp[id]=meta;
      _wzSetDocVisual(id,meta);
      _wzUpdateDocCount();
      return _wzPersistDocsToClienteIfPossible();
    }).then(function(persisted){
      toast(persisted?'Documento guardado':'Documento cargado. Se guardará con el cliente al finalizar','success');
    }).catch(function(err){
      console.warn('Doc URL/persist error:', err);
      toast('Documento cargado, pero no se pudo vincular aún al cliente','error');
    });
  });
}
function _wzUpdateDocCount(){
  var n=_wzGetClientDocsArray().length,total=_wzDocTotal();
  var cnt=document.getElementById('wz_doc_count');
  var tag=document.getElementById('wz_doc_tag');
  if(cnt)cnt.textContent=n+'/'+total;
  if(tag){
    if(n>=total){tag.textContent=' Completo';tag.style.background='var(--greens)';tag.style.color='var(--green)';tag.style.borderColor='rgba(6,176,106,.3)';}
    else if(n>=3){tag.textContent='Parcial ('+n+'/'+total+')';tag.style.background='var(--ambers)';tag.style.color='var(--amber)';}
    else{tag.textContent='⏳ Pendiente';tag.style.background='var(--surf2)';tag.style.color='var(--ink3)';}
  }
}

// ── Motor de score (actualizado con todos los campos nuevos) ──
