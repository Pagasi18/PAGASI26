// ══════════════════════════════════════════════════════════════
// RECURSOS — Repositorio de archivos del equipo
// Flyers, requisitos, listas de precios, contratos. Subir a Firebase
// Storage, metadata en Firestore (colección 'recursos', realtime S.recursos).
// ══════════════════════════════════════════════════════════════

var REC_CATS = [
  {k:'requisitos',  label:'Requisitos',       color:'#2563EB'},
  {k:'precios',     label:'Lista de precios', color:'#00B876'},
  {k:'flyers',      label:'Flyers',           color:'#F5A623'},
  {k:'contratos',   label:'Contratos',        color:'#0EA5E9'},
  {k:'capacitacion',label:'Capacitación',     color:'#6366F1'},
  {k:'otros',       label:'Otros',            color:'#64748B'}
];
function _recCatInfo(k){ for(var i=0;i<REC_CATS.length;i++){ if(REC_CATS[i].k===(k||'otros')) return REC_CATS[i]; } return REC_CATS[REC_CATS.length-1]; }
function _recEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }
function _recSize(b){ b=parseFloat(b)||0; if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(0)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function _recExt(nombre){ return String(nombre||'').split('.').pop().toLowerCase(); }
function _recTypeColor(nombre){
  var e=_recExt(nombre);
  if(['pdf'].indexOf(e)>=0) return '#E8335A';
  if(['jpg','jpeg','png','webp','gif','heic','bmp','svg'].indexOf(e)>=0) return '#7C3AED';
  if(['doc','docx'].indexOf(e)>=0) return '#2563EB';
  if(['xls','xlsx','csv'].indexOf(e)>=0) return '#00B876';
  if(['ppt','pptx'].indexOf(e)>=0) return '#F5A623';
  return '#64748B';
}
PG.recursos = function(){
  var cat = window._recCat || 'todos';
  var q = (window._recQuery||'').toLowerCase();
  var all = (S.recursos||[]).filter(function(r){ return r && !r.eliminado; });
  // Conteo por categoría
  var counts = {todos: all.length};
  REC_CATS.forEach(function(c){ counts[c.k] = all.filter(function(r){ return (r.categoria||'otros')===c.k; }).length; });

  var lista = all.slice().sort(function(a,b){ return String(b.uploadedAt||'').localeCompare(String(a.uploadedAt||'')); });
  if(cat!=='todos') lista = lista.filter(function(r){ return (r.categoria||'otros')===cat; });
  if(q) lista = lista.filter(function(r){ return ((r.nombre||'')+' '+(r.descripcion||'')+' '+(r.categoria||'')).toLowerCase().indexOf(q)>=0; });

  var html = pageBanner(
    'Sistema · Material del equipo',
    'Files',
    '<b>'+all.length+'</b> archivo(s) · Flyers, requisitos y listas de precios para compartir con clientes',
    [{label:'＋ Subir archivo', onclick:'recAbrirSubir()', primary:true}]
  );

  // Filtros por categoría + búsqueda
  html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">';
  html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
  html += '<button class="btn '+(cat==='todos'?'btn-p':'btn-g')+' btn-sm" onclick="recSetCat(\'todos\')">Todos <span style="opacity:.6">'+counts.todos+'</span></button>';
  REC_CATS.forEach(function(c){
    html += '<button class="btn '+(cat===c.k?'btn-p':'btn-g')+' btn-sm" onclick="recSetCat(\''+c.k+'\')">'+c.label+' <span style="opacity:.6">'+(counts[c.k]||0)+'</span></button>';
  });
  html += '</div>';
  html += '<div style="flex:1;min-width:160px;max-width:280px;margin-left:auto"><input type="text" id="rec_q" placeholder="Buscar archivo..." value="'+_recEsc(window._recQuery||'')+'" oninput="recBuscar(this.value)" style="width:100%;padding:9px 13px;border:1px solid var(--rim);border-radius:10px;font-family:var(--f);font-size:13px;background:var(--surf2);outline:none"></div>';
  html += '</div>';

  if(!lista.length){
    html += '<div class="empty" style="padding:60px 20px;text-align:center">'
      + '<div style="width:56px;height:56px;border-radius:16px;background:var(--gs);color:var(--p1);display:flex;align-items:center;justify-content:center;margin:0 auto 14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px"><path d="M4 4h6l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg></div>'
      + '<div class="e-tt" style="font-size:16px;font-weight:800;color:var(--ink)">'+(all.length?'Sin archivos en esta vista':'Aún no hay recursos')+'</div>'
      + '<div style="font-size:13px;color:var(--ink3);margin-top:6px;max-width:360px;margin-left:auto;margin-right:auto;line-height:1.5">Subí los flyers de requisitos, listas de precios y material que el equipo comparte con los clientes.</div>'
      + '<button class="btn btn-p" style="margin-top:16px" onclick="recAbrirSubir()">＋ Subir el primero</button>'
      + '</div>';
    return html;
  }

  html += '<style>'
    + '.fl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr));gap:16px}'
    + '.fl-card{background:#fff;border:1px solid var(--rim);border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.04);transition:transform .18s,box-shadow .18s;display:flex;flex-direction:column}'
    + '.fl-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px -10px rgba(15,23,42,.16)}'
    + '.fl-prev{height:152px;position:relative;background:linear-gradient(135deg,#EFF3FF 0%,#DBEAFE 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;border-bottom:1px solid var(--rim)}'
    + '.fl-prev img{width:100%;height:100%;object-fit:cover;display:block}'
    + '.fl-prev iframe{width:133%;height:133%;border:0;pointer-events:none;background:#fff;transform:scale(.75);transform-origin:top left}'
    + '.fl-ph{display:flex;flex-direction:column;align-items:center;gap:8px}'
    + '.fl-ph svg{width:34px;height:34px}'
    + '.fl-ph-ext{font-family:var(--fm);font-weight:900;font-size:20px;letter-spacing:1.5px}'
    + '.fl-chip{position:absolute;top:10px;left:10px;font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#fff;padding:4px 10px;border-radius:50px;box-shadow:0 3px 10px rgba(0,0,0,.22)}'
    + '.fl-body{padding:13px 15px 14px;display:flex;flex-direction:column;flex:1}'
    + '.fl-name{font-size:13.5px;font-weight:800;color:var(--ink);line-height:1.3;word-break:break-word}'
    + '.fl-desc{font-size:11.5px;color:var(--ink2);margin-top:6px;line-height:1.45}'
    + '.fl-meta{font-size:10px;color:var(--ink3);margin-top:auto;padding-top:11px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-weight:600}'
    + '.fl-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px;padding-top:11px;border-top:1px solid var(--rim)}'
    + '</style>';
  html += '<div class="fl-grid">';
  lista.forEach(function(r){
    var c = _recCatInfo(r.categoria);
    var puedeBorrar = isAdminUser() || (S.currentUser && r.uploadedBy===S.currentUser.uid);
    var fecha = (r.uploadedAt||'').slice(0,10);
    html += '<div class="fl-card">'
      + '<div class="fl-prev" onclick="recDescargar(\''+r.id+'\')" style="cursor:pointer">'
        + _recPreview(r)
        + '<span class="fl-chip" style="background:'+c.color+'">'+c.label+'</span>'
      + '</div>'
      + '<div class="fl-body">'
        + '<div class="fl-name">'+_recEsc(r.nombre||'Archivo')+'</div>'
        + (r.descripcion?'<div class="fl-desc">'+_recEsc(r.descripcion)+'</div>':'')
        + '<div class="fl-meta"><span>'+_recSize(r.size)+'</span><span style="opacity:.5">·</span><span>'+_recEsc(r.uploadedByName||'—')+'</span>'+(fecha?'<span style="opacity:.5">·</span><span>'+fecha+'</span>':'')+'</div>'
        + '<div class="fl-acts">'
          + '<button class="btn btn-p btn-sm" onclick="recDescargar(\''+r.id+'\')" style="flex:1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;margin-right:4px;vertical-align:-2px"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>Abrir</button>'
          + '<button class="btn btn-g btn-sm" title="Copiar link" onclick="recCopiarLink(\''+r.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg></button>'
          + '<button class="btn btn-g btn-sm" title="Compartir por WhatsApp" onclick="recCompartirWA(\''+r.id+'\')" style="color:#1FA855;border-color:rgba(31,168,85,.3)"><svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.9.9-2.7-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.1.1-.2 0-.4 0-.5l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.8.8-.9 1.9-.4 3.1a9 9 0 0 0 4.7 4.3c1.7.6 2.4.5 3.2.4.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.2z"/></svg></button>'
          + (puedeBorrar?'<button class="btn btn-g btn-sm" title="Editar" onclick="recAbrirEditar(\''+r.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>':'')
          + (puedeBorrar?'<button class="btn btn-g btn-sm" title="Eliminar" onclick="recEliminar(\''+r.id+'\')" style="color:var(--red);border-color:rgba(226,75,74,.3)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>':'')
        + '</div>'
      + '</div>'
    + '</div>';
  });
  html += '</div>';
  return html;
};

// Extensión REAL del archivo (no del nombre editable): prioriza el path subido y el MIME
function _recRealExt(r){
  var fromPath = r && r.path ? _recExt(r.path) : '';
  if(fromPath && fromPath.length>=2 && fromPath.length<=5 && /^[a-z0-9]+$/.test(fromPath)) return fromPath;
  var t = (r && r.tipo || '').toLowerCase();
  if(t.indexOf('pdf')>=0) return 'pdf';
  if(t.indexOf('png')>=0) return 'png';
  if(t.indexOf('jpeg')>=0 || t.indexOf('jpg')>=0) return 'jpg';
  if(t.indexOf('webp')>=0) return 'webp';
  if(t.indexOf('gif')>=0) return 'gif';
  if(t.indexOf('svg')>=0) return 'svg';
  if(t.indexOf('image/')>=0) return 'png';
  if(t.indexOf('sheet')>=0 || t.indexOf('excel')>=0) return 'xlsx';
  if(t.indexOf('word')>=0 || t.indexOf('document')>=0) return 'docx';
  return _recExt(r && r.nombre);
}
// Preview del archivo dentro de la tarjeta (imagen real, página 1 del PDF, o placeholder)
function _recPreview(r){
  var url = r.url || '';
  var mime = (r.tipo||'').toLowerCase();
  var e = _recRealExt(r);
  var isImg = mime.indexOf('image/')===0 || ['jpg','jpeg','png','webp','gif','bmp','svg','heic'].indexOf(e)>=0;
  var isPdf = mime.indexOf('pdf')>=0 || e==='pdf';
  if(url && isImg){
    return '<img src="'+url+'" loading="lazy" alt="" onerror="this.style.display=\'none\'">';
  }
  if(url && isPdf){
    return '<iframe src="'+url+'#toolbar=0&navpanes=0&scrollbar=0&view=FitH" loading="lazy" title="preview"></iframe>';
  }
  var col = _recTypeColor(e);
  return '<div class="fl-ph" style="color:'+col+'">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>'
    + '<span class="fl-ph-ext">'+((e||'FILE').toUpperCase().slice(0,4))+'</span>'
  + '</div>';
}

function recSetCat(k){ window._recCat = k; nav('recursos'); }
function recBuscar(v){ window._recQuery = v; var lista=document.getElementById('cnt'); window._recCat=window._recCat||'todos'; /* re-render preservando foco */ nav('recursos'); var inp=document.getElementById('rec_q'); if(inp){ inp.focus(); try{inp.setSelectionRange(inp.value.length,inp.value.length);}catch(e){} } }

function _recFind(id){ return (S.recursos||[]).find(function(r){ return r.id===id; }); }

function recDescargar(id){
  var r = _recFind(id); if(!r) return;
  if(typeof storage!=='undefined' && storage && r.path){
    storage.ref().child(r.path).getDownloadURL().then(function(url){ window.open(url,'_blank'); }).catch(function(){ if(r.url) window.open(r.url,'_blank'); });
  } else if(r.url){ window.open(r.url,'_blank'); }
}
function recCopiarLink(id){
  var r = _recFind(id); if(!r || !r.url) { toast('Sin link disponible','warn'); return; }
  try{ navigator.clipboard.writeText(r.url).then(function(){ toast('Link copiado','success'); }, function(){ toast('No se pudo copiar','error'); }); }
  catch(e){ toast('No se pudo copiar','error'); }
}
function recCompartirWA(id){
  var r = _recFind(id); if(!r || !r.url){ toast('Sin link para compartir','warn'); return; }
  var msg = (r.nombre||'Archivo')+' — Pagasi\n'+r.url;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}
function recEliminar(id){
  var r = _recFind(id); if(!r) return;
  if(!isAdminUser() && !(S.currentUser && r.uploadedBy===S.currentUser.uid)){ toast('Solo el autor o un admin puede eliminar','warn'); return; }
  if(!confirm('¿Eliminar "'+(r.nombre||'archivo')+'"? No se puede deshacer.')) return;
  // Borrar de Storage (best-effort) + Firestore
  if(typeof storage!=='undefined' && storage && r.path){ try{ storage.ref().child(r.path).delete().catch(function(){}); }catch(e){} }
  if(typeof DB!=='undefined' && DB.delRecurso) DB.delRecurso(id);
  S.recursos = (S.recursos||[]).filter(function(x){ return x.id!==id; });
  if(typeof logActividad==='function') logActividad('Eliminó recurso','recursos',id,{nombre:r.nombre});
  nav('recursos'); toast('Archivo eliminado','info');
}

// ─── Modal de subida ───
function recAbrirSubir(){
  if(typeof storage==='undefined' || !storage){ toast('Almacenamiento no disponible','error'); return; }
  if(typeof setMicon==='function') setMicon('agregar');
  $('mtt').textContent = 'Subir archivo';
  if($('msb')) $('msb').textContent = 'Flyer, requisitos, lista de precios…';
  if($('modal-box')) $('modal-box').className='modal';
  var cats = REC_CATS.map(function(c){ return '<option value="'+c.k+'">'+c.label+'</option>'; }).join('');
  $('mbd').innerHTML = ''
    + '<div class="fg" style="margin-bottom:12px"><label class="fsec" style="display:block;margin-bottom:5px">Archivo *</label>'
    +   '<input type="file" id="rec_file" onchange="_recFileSel(this)" style="width:100%;padding:11px;border:1px dashed var(--rim);border-radius:10px;font-family:var(--f);font-size:13px;background:var(--surf2);cursor:pointer">'
    +   '<div id="rec_file_info" style="font-size:11px;color:var(--ink3);margin-top:6px"></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    +   '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px">Nombre</label><input class="fi" id="rec_nombre" placeholder="Ej: Requisitos crédito 2026"></div>'
    +   '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px">Categoría</label><select class="fs" id="rec_categoria">'+cats+'</select></div>'
    + '</div>'
    + '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px">Descripción (opcional)</label><input class="fi" id="rec_desc" placeholder="Breve nota sobre el archivo"></div>'
    + '<div id="rec_prog_wrap" style="display:none;margin-top:14px"><div style="font-size:11px;color:var(--ink3);margin-bottom:5px" id="rec_prog_lbl">Subiendo…</div><div style="background:var(--lift);border-radius:6px;height:8px;overflow:hidden"><div id="rec_prog_bar" style="height:100%;width:0%;background:var(--p1);border-radius:6px;transition:width .2s"></div></div></div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" id="rec_btn_sub" onclick="recSubir()">Subir archivo</button>';
  $('ov').style.display='flex';
}
function _recFileSel(input){
  var f = input.files && input.files[0]; if(!f) return;
  var info = document.getElementById('rec_file_info'); if(info) info.textContent = f.name+' · '+_recSize(f.size);
  var nom = document.getElementById('rec_nombre');
  if(nom && !nom.value){ nom.value = f.name.replace(/\.[^.]+$/,''); }
}
function recSubir(){
  var input = document.getElementById('rec_file');
  var file = input && input.files && input.files[0];
  if(!file){ toast('Elegí un archivo','warn'); return; }
  if(file.size > 25*1048576){ toast('Máximo 25 MB por archivo','error'); return; }
  if(typeof storage==='undefined' || !storage){ toast('Almacenamiento no disponible','error'); return; }
  var nombre = (document.getElementById('rec_nombre')||{}).value || file.name;
  var categoria = (document.getElementById('rec_categoria')||{}).value || 'otros';
  var descripcion = (document.getElementById('rec_desc')||{}).value || '';
  var btn = document.getElementById('rec_btn_sub'); if(btn){ btn.disabled=true; btn.textContent='Subiendo…'; }
  var pw = document.getElementById('rec_prog_wrap'); if(pw) pw.style.display='block';

  var id = 'REC-'+Date.now()+'-'+Math.floor(Math.random()*9999);
  var safe = String(file.name).replace(/[^\w.\-]/g,'_');
  var path = 'recursos/'+id+'_'+safe;
  var ref = storage.ref().child(path);
  var task = ref.put(file, {contentType: file.type || 'application/octet-stream'});
  task.on('state_changed',
    function(snap){
      var pct = snap.totalBytes>0 ? Math.round(snap.bytesTransferred/snap.totalBytes*100) : 0;
      var bar = document.getElementById('rec_prog_bar'); if(bar) bar.style.width = pct+'%';
      var lbl = document.getElementById('rec_prog_lbl'); if(lbl) lbl.textContent = 'Subiendo… '+pct+'%';
    },
    function(err){
      if(btn){ btn.disabled=false; btn.textContent='Subir archivo'; }
      toast('Error al subir: '+(err&&err.code||'desconocido'),'error');
    },
    function(){
      ref.getDownloadURL().then(function(url){
        var meta = {
          id:id, nombre:nombre, categoria:categoria, descripcion:descripcion,
          url:url, path:path, size:file.size, tipo:file.type||'',
          uploadedBy:(S.currentUser&&S.currentUser.uid)||'', uploadedByName:(S.currentUser&&(S.currentUser.nombre||S.currentUser.email))||'—',
          uploadedAt:new Date().toISOString()
        };
        if(typeof DB!=='undefined' && DB.saveRecurso) DB.saveRecurso(meta);
        S.recursos = (S.recursos||[]).concat([meta]);
        if(typeof logActividad==='function') logActividad('Subió recurso','recursos',id,{nombre:nombre,categoria:categoria});
        closeM(); nav('recursos'); toast('Archivo subido','success');
      }).catch(function(){
        if(btn){ btn.disabled=false; btn.textContent='Subir archivo'; }
        toast('Subido pero no se pudo obtener el link','warn');
      });
    }
  );
}

// ─── Modal de edición (nombre, categoría, descripción y reemplazar archivo) ───
function recAbrirEditar(id){
  var r = _recFind(id); if(!r) return;
  if(!isAdminUser() && !(S.currentUser && r.uploadedBy===S.currentUser.uid)){ toast('Solo el autor o un admin puede editar','warn'); return; }
  if(typeof setMicon==='function') setMicon('editar');
  $('mtt').textContent = 'Editar archivo';
  if($('msb')) $('msb').textContent = r.nombre||'';
  if($('modal-box')) $('modal-box').className='modal';
  var cats = REC_CATS.map(function(c){ return '<option value="'+c.k+'"'+((r.categoria||'otros')===c.k?' selected':'')+'>'+c.label+'</option>'; }).join('');
  $('mbd').innerHTML = ''
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    +   '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px">Nombre</label><input class="fi" id="rec_e_nombre" value="'+_recEsc(r.nombre||'')+'"></div>'
    +   '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px">Categoría</label><select class="fs" id="rec_e_cat">'+cats+'</select></div>'
    + '</div>'
    + '<div class="fg" style="margin-bottom:12px"><label class="fsec" style="display:block;margin-bottom:5px">Descripción</label><input class="fi" id="rec_e_desc" value="'+_recEsc(r.descripcion||'')+'" placeholder="Breve nota"></div>'
    + '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px">Reemplazar archivo / imagen (opcional)</label>'
    +   '<input type="file" id="rec_e_file" onchange="_recEFileSel(this)" style="width:100%;padding:11px;border:1px dashed var(--rim);border-radius:10px;font-family:var(--f);font-size:13px;background:var(--surf2);cursor:pointer">'
    +   '<div id="rec_e_finfo" style="font-size:11px;color:var(--ink3);margin-top:6px">Dejá vacío para mantener el archivo actual.</div>'
    + '</div>'
    + '<div id="rec_e_prog_wrap" style="display:none;margin-top:14px"><div style="font-size:11px;color:var(--ink3);margin-bottom:5px" id="rec_e_prog_lbl">Subiendo…</div><div style="background:var(--lift);border-radius:6px;height:8px;overflow:hidden"><div id="rec_e_prog_bar" style="height:100%;width:0%;background:var(--p1);border-radius:6px;transition:width .2s"></div></div></div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" id="rec_e_btn" onclick="recGuardarEdicion(\''+id+'\')">Guardar cambios</button>';
  $('ov').style.display='flex';
}
function _recEFileSel(input){
  var f = input.files && input.files[0]; if(!f) return;
  var info = document.getElementById('rec_e_finfo'); if(info) info.textContent = 'Nuevo: '+f.name+' · '+_recSize(f.size)+' (reemplaza al actual)';
}
function recGuardarEdicion(id){
  var r = _recFind(id); if(!r) return;
  if(!isAdminUser() && !(S.currentUser && r.uploadedBy===S.currentUser.uid)){ toast('Sin permiso','warn'); return; }
  var nombre = (document.getElementById('rec_e_nombre')||{}).value || r.nombre || 'Archivo';
  var categoria = (document.getElementById('rec_e_cat')||{}).value || r.categoria || 'otros';
  var descripcion = (document.getElementById('rec_e_desc')||{}).value || '';
  var fileInput = document.getElementById('rec_e_file');
  var file = fileInput && fileInput.files && fileInput.files[0];

  function aplicar(extra){
    var meta = Object.assign({}, r, {nombre:nombre, categoria:categoria, descripcion:descripcion}, extra||{});
    if(typeof DB!=='undefined' && DB.saveRecurso) DB.saveRecurso(meta);
    S.recursos = (S.recursos||[]).map(function(x){ return x.id===id ? meta : x; });
    if(typeof logActividad==='function') logActividad('Editó recurso','recursos',id,{nombre:nombre});
    closeM(); nav('recursos'); toast('Archivo actualizado','success');
  }

  // Sin archivo nuevo: solo actualizar datos
  if(!file){ aplicar(); return; }

  // Reemplazar archivo en Storage
  if(file.size > 25*1048576){ toast('Máximo 25 MB','error'); return; }
  if(typeof storage==='undefined' || !storage){ toast('Almacenamiento no disponible','error'); return; }
  var btn = document.getElementById('rec_e_btn'); if(btn){ btn.disabled=true; btn.textContent='Subiendo…'; }
  var pw = document.getElementById('rec_e_prog_wrap'); if(pw) pw.style.display='block';
  var oldPath = r.path;
  var newId = 'REC-'+Date.now()+'-'+Math.floor(Math.random()*9999);
  var safe = String(file.name).replace(/[^\w.\-]/g,'_');
  var path = 'recursos/'+newId+'_'+safe;
  var ref = storage.ref().child(path);
  var task = ref.put(file, {contentType: file.type || 'application/octet-stream'});
  task.on('state_changed',
    function(snap){
      var pct = snap.totalBytes>0 ? Math.round(snap.bytesTransferred/snap.totalBytes*100) : 0;
      var bar = document.getElementById('rec_e_prog_bar'); if(bar) bar.style.width = pct+'%';
      var lbl = document.getElementById('rec_e_prog_lbl'); if(lbl) lbl.textContent = 'Subiendo… '+pct+'%';
    },
    function(err){ if(btn){ btn.disabled=false; btn.textContent='Guardar cambios'; } toast('Error al subir: '+(err&&err.code||'desconocido'),'error'); },
    function(){
      ref.getDownloadURL().then(function(url){
        aplicar({url:url, path:path, size:file.size, tipo:file.type||''});
        if(oldPath){ try{ storage.ref().child(oldPath).delete().catch(function(){}); }catch(e){} }
      }).catch(function(){ if(btn){ btn.disabled=false; btn.textContent='Guardar cambios'; } toast('Subido pero no se pudo obtener el link','warn'); });
    }
  );
}

window.recSetCat = recSetCat;
window.recBuscar = recBuscar;
window.recDescargar = recDescargar;
window.recCopiarLink = recCopiarLink;
window.recCompartirWA = recCompartirWA;
window.recEliminar = recEliminar;
window.recAbrirSubir = recAbrirSubir;
window._recFileSel = _recFileSel;
window.recSubir = recSubir;
window.recAbrirEditar = recAbrirEditar;
window._recEFileSel = _recEFileSel;
window.recGuardarEdicion = recGuardarEdicion;
