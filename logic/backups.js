// Pagasi logic: backups
function exportarBackupJSON(){
  // Recolectar config docs desde Firebase antes de exportar
  var configKeys = ['plan','catalogo','planes','empresa','tasa','cobradores','score','rolesPermisos'];
  var configPromises = db
    ? configKeys.map(function(k){ return db.collection('config').doc(k).get().then(function(d){ return {key:k, data:d.exists?d.data():null}; }).catch(function(){ return {key:k,data:null}; }); })
    : configKeys.map(function(k){ return Promise.resolve({key:k,data:null}); });
  var usuariosPromise = db
    ? db.collection('usuarios').get().then(function(s){ return s.docs.map(function(d){ return Object.assign({uid:d.id},d.data()); }); }).catch(function(){ return []; })
    : Promise.resolve([]);
  var tareasPromise = db
    ? db.collection('tareas').get().then(function(s){ return s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }); }).catch(function(){ return []; })
    : Promise.resolve(S.tareas||[]);

  toast('Preparando backup completo...','info');
  Promise.all([usuariosPromise, tareasPromise].concat(configPromises)).then(function(results){
    var usuarios = results[0];
    var tareas   = results[1];
    var configData = {};
    results.slice(2).forEach(function(r){ if(r.data) configData[r.key] = r.data; });

    var backup={
      version:2,
      fechaExport:new Date().toISOString(),
      // Colecciones principales
      clientes:     S.clientes     || [],
      creds:        S.creds        || [],
      pagos:        S.pagos        || [],
      egresos:      S.egresos      || [],
      movimientos:  S.movimientos  || [],
      motos:        S.motos        || [],
      concesionarios: S.concesionarios || [],
      cuentasPendientes: S.cuentasPendientes || [],
      facturas:     S.facturas     || [],
      tareas:       tareas,
      usuarios:     usuarios,
      // Configuración
      config:       configData
    };
    var json=JSON.stringify(backup,null,2);
    var blob=new Blob([json],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    var fname='backup-pagasi-completo-'+hoyLocalISO()+'.json';
    a.href=url;a.download=fname;a.click();
    URL.revokeObjectURL(url);
    toast('Backup completo exportado: '+fname,'success');
  }).catch(function(err){
    toast('Error al exportar: '+(err&&err.message||err),'error');
  });
}

// ════════════════════════════════════════════════════════════════════════
// IMPORTAR BACKUP — versión corregida
// Arregla: escrituras silenciosas, sin batch, IDs nulos y errores ocultos.
// ════════════════════════════════════════════════════════════════════════
function importarBackupJSON(input){
  var file = input.files && input.files[0];
  if(!file){ return; }

  var reader = new FileReader();
  reader.onload = function(e){
    var data;
    try{
      data = JSON.parse(e.target.result);
    }catch(err){
      toast('Error leyendo archivo: '+err.message,'error');
      input.value=''; return;
    }
    if(!data.version || !data.clientes){
      toast('Archivo inválido — no parece un backup de Pagasi','error');
      input.value=''; return;
    }

    var resumen = '⚠️ Esto REEMPLAZA todos los datos actuales con el backup.\n\n'
      + 'Clientes: '+(data.clientes||[]).length+'\n'
      + 'Créditos: '+(data.creds||[]).length+'\n'
      + 'Pagos: '+(data.pagos||[]).length+'\n'
      + 'Movimientos: '+(data.movimientos||[]).length+'\n'
      + 'Egresos: '+(data.egresos||[]).length+'\n'
      + 'Motos: '+(data.motos||[]).length+'\n'
      + 'Concesionarios: '+(data.concesionarios||[]).length+'\n'
      + 'Facturas: '+(data.facturas||[]).length+'\n'
      + 'Tareas: '+(data.tareas||[]).length+'\n'
      + (data.config ? 'Config: '+Object.keys(data.config).join(', ')+'\n' : '')
      + '\n¿Continuar?';
    if(!confirm(resumen)){ input.value=''; return; }

    // ── 1) Cargar en memoria ──────────────────────────────────────────────
    S.clientes          = data.clientes          || [];
    S.creds             = data.creds             || [];
    S.pagos             = data.pagos             || [];
    S.egresos           = data.egresos           || [];
    S.movimientos       = data.movimientos       || [];
    S.motos             = data.motos             || [];
    S.concesionarios    = data.concesionarios    || [];
    S.cuentasPendientes = data.cuentasPendientes || [];
    S.facturas          = data.facturas          || [];
    S.tareas            = data.tareas            || [];

    if(!db){
      nav(S.page);
      toast('✓ Backup cargado en memoria (sin Firebase)','success');
      input.value=''; return;
    }

    // ── 2) Pausar listeners en vivo para que NO sobre-escriban ────────────
    try{ if(typeof stopRealtime==='function') stopRealtime(); }catch(e){}

    // ── 3) Colección → docId ──────────────────────────────────────────────
    var idDe = function(o){ return o && o.id; };
    var planes = [
      { col:'clientes',          arr:S.clientes,          id:idDe },
      { col:'creditos',          arr:S.creds,             id:idDe },
      { col:'pagos',             arr:S.pagos,             id:idDe },
      { col:'egresos',           arr:S.egresos,           id:idDe },
      { col:'movimientos',       arr:S.movimientos,       id:idDe },
      { col:'motos',             arr:S.motos,             id:idDe },
      { col:'concesionarios',    arr:S.concesionarios,    id:idDe },
      { col:'cuentasPendientes', arr:S.cuentasPendientes, id:idDe },
      { col:'facturas',          arr:S.facturas,          id:idDe },
      { col:'tareas',            arr:S.tareas,            id:idDe }
    ];

    // ── 4) Lista plana de operaciones {col, docId, data} ──────────────────
    var ops = [];
    var saltados = 0;
    planes.forEach(function(p){
      (p.arr||[]).forEach(function(o){
        var raw = p.id(o);
        if(raw === null || raw === undefined || raw === ''){ saltados++; return; }
        var docId = String(raw);
        if(docId.indexOf('/') !== -1 || docId === '.' || docId === '..'){ saltados++; return; }
        ops.push({ col:p.col, docId:docId, data:clean(o) });
      });
    });
    var usuarios = (data.usuarios||[]).filter(function(u){ return u && u.uid; });
    var configKeys = data.config ? Object.keys(data.config).filter(function(k){ return data.config[k]; }) : [];

    var totalDocs = ops.length + usuarios.length + configKeys.length;
    showLoader('Restaurando backup...', 'Subiendo '+totalDocs+' documentos a Firebase');

    // ── 5) Escribir en LOTES (batch) de 450 (límite Firestore = 500) ──────
    var LOTE = 450;
    function correrLotes(){
      var batches = [];
      for(var i=0; i<ops.length; i+=LOTE){
        var slice = ops.slice(i, i+LOTE);
        var b = db.batch();
        slice.forEach(function(op){
          b.set(db.collection(op.col).doc(op.docId), op.data, {merge:false});
        });
        batches.push(b);
      }
      if(usuarios.length || configKeys.length){
        var bx = db.batch();
        usuarios.forEach(function(u){
          bx.set(db.collection('usuarios').doc(String(u.uid)), clean(u), {merge:true});
        });
        configKeys.forEach(function(k){
          bx.set(db.collection('config').doc(k), data.config[k], {merge:true});
        });
        batches.push(bx);
      }
      var idx = 0;
      function siguiente(){
        if(idx >= batches.length){ return Promise.resolve(); }
        var b = batches[idx++];
        return b.commit().then(function(){
          showLoader('Restaurando backup...', 'Lote '+idx+'/'+batches.length+' guardado');
          return siguiente();
        });
      }
      return siguiente();
    }

    correrLotes().then(function(){
      try{ if(typeof startRealtime==='function') startRealtime(); }catch(e){}
      return DB.load();
    }).then(function(){
      hideLoader();
      nav(S.page);
      var msg = '✓ Backup restaurado — '+S.clientes.length+' clientes, '
              + S.creds.length+' créditos, '+S.concesionarios.length+' concesionarios';
      if(saltados>0) msg += ' ('+saltados+' registros sin ID válido omitidos)';
      toast(msg, 'success');
    }).catch(function(err){
      hideLoader();
      try{ if(typeof startRealtime==='function') startRealtime(); }catch(e){}
      console.error('IMPORT BACKUP FALLÓ:', err);
      toast('❌ Falló la restauración: '+(err && (err.code||err.message) || err)
            +'  — revisa la consola (F12)', 'error');
    });

    input.value='';
  };
  reader.readAsText(file);
}

function exportarBackup(){
  var data = {
    version: 1,
    fecha: new Date().toISOString(),
    empresa: ($('cfg_empresa')&&$('cfg_empresa').value)||'Pagasi',
    clientes: S.clientes,
    motos: S.motos,
    creditos: S.creds,
    pagos: S.pagos,
    egresos: S.egresos,
    movimientos: S.movimientos
  };
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var fecha = hoyLocalISO();
  a.href = url; a.download = 'backup-pagasi-'+fecha+'.json'; a.click();
  URL.revokeObjectURL(url);
  toast('✓ Backup exportado · '+
    data.clientes.length+' clientes, '+
    data.creditos.length+' créditos, '+
    data.pagos.length+' pagos','success');
}

function importarBackup(){
  if(!db){toast('Necesitas Firebase configurado para restaurar','error');return;}
  var input = document.createElement('input');
  input.type='file'; input.accept='.json';
  input.onchange = function(e){
    var file = e.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try{
        var data = JSON.parse(ev.target.result);
        if(!data.version || !data.clientes){
          toast('Archivo inválido — no es un backup de Pagasi','error'); return;
        }
        var total = (data.clientes||[]).length + (data.creditos||[]).length +
                    (data.pagos||[]).length + (data.movimientos||[]).length;
        if(!confirm('¿Restaurar backup del '+data.fecha.split('T')[0]+'? Registros: '+total+'\n\nEsto NO borrará datos actuales, solo agregará registros faltantes.')){return;}
        showLoader('Restaurando backup...','Subiendo datos a Firebase');
        var ops = [];
        (data.clientes||[]).forEach(function(o){if(o&&o.id) ops.push(db.collection('clientes').doc(String(o.id)).set(o));});
        (data.motos||[]).forEach(function(o){if(o&&o.id) ops.push(db.collection('motos').doc(String(o.id)).set(o));});
        (data.creditos||[]).forEach(function(o){if(o&&o.id) ops.push(db.collection('creditos').doc(String(o.id)).set(o));});
        (data.pagos||[]).forEach(function(o){if(o&&o.id) ops.push(db.collection('pagos').doc(String(o.id)).set(o));});
        (data.egresos||[]).forEach(function(o){if(o&&o.id) ops.push(db.collection('egresos').doc(String(o.id)).set(o));});
        (data.movimientos||[]).forEach(function(o){if(o&&o.id) ops.push(db.collection('movimientos').doc(String(o.id)).set(o));});
        Promise.all(ops).then(function(){
          hideLoader();
          toast('✓ Backup restaurado · '+ops.length+' registros subidos','success');
          setTimeout(function(){DB.load().then(function(){nav(S.page);});},1000);
        }).catch(function(err){
          hideLoader();
          toast('Error al restaurar: '+err.message,'error');
        });
      }catch(err){
        toast('Error al leer el archivo: '+err.message,'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
