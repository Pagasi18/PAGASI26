// Logica de egresos. Extraido mecanicamente de assets/pagasi-app.js.
function openAddEgreso(){
  setMicon('egreso');$('mtt').textContent='Registrar Egreso';$('msb').textContent='Contabilidad';
  $('modal-box').className='modal';
  var _metodosOpts = (_cuentasBanc||[]).map(function(c){return '<option>'+c.nombre+'</option>';}).join('');
  $('mbd').innerHTML = '<div class="fgr c1" style="gap:9px">'
    +'<div class="fg"><label>Concepto *</label><input class="fi" id="eg_conc" placeholder="Ej: Compra de motos, GPS..."></div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Categoría</label><select class="fs" id="eg_cat">'
    +'<option value="inventario">Inventario / Motos</option>'
    +'<option value="equipos">Equipos (GPS)</option>'
    +'<option value="operativo">Oficina y servicios</option>'
    +'<option value="nomina">Salarios / Nómina</option>'
    +'<option value="otros">Otros</option>'
    +'</select></div>'
    +'<div class="fg"><label>Monto ($) *</label><input class="fi" id="eg_monto" type="number" step="0.01" placeholder="0.00"></div>'
    +'</div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Forma de pago</label><select class="fs" id="eg_forma">'+_metodosOpts+'</select></div>'
    +'</div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Fecha</label><input class="fi" id="eg_fecha" type="date" value="'+hoyLocalISO()+'"></div>'
    +'<div class="fg"><label>Referencia</label><input class="fi" id="eg_notas" placeholder="Opcional"></div>'
    +'</div>'
    +'</div>';
    S.saveFn=function(){
    var conc=(($('eg_conc')&&$('eg_conc').value)||'').trim();
    var monto=parseFloat(($('eg_monto')&&$('eg_monto').value))||0;
    if(!conc||monto<=0){toast('Concepto y monto son obligatorios','error');return false;}
    // El numero lo da el contador de Firestore, no el maximo en memoria: con dos
    // personas guardando a la vez, el segundo gasto borraba al primero (punto 30).
    return nextEgresoIdAsync().then(function(newId){
    var newEg={id:newId,concepto:conc,monto:monto,fecha:($('eg_fecha')&&$('eg_fecha').value)||hoyLocalISO(),categoria:($('eg_cat')&&$('eg_cat').value)||'otros',forma:($('eg_forma')&&$('eg_forma').value)||'',notas:($('eg_notas')&&$('eg_notas').value)||'',eliminado:false};
    S.egresos.push(newEg);
    DB.saveEgreso(newEg);
    if(typeof logActividad==='function') logActividad('egreso_registrado','egresos',String(newId),{concepto:conc, monto:monto, categoria:newEg.categoria});

    // Crear movimiento de SALIDA en la cuenta seleccionada
    var cuentaSalida=($('eg_forma')&&$('eg_forma').value)||'';
    if(!cuentaSalida && _cuentasBanc && _cuentasBanc.length>0) cuentaSalida=_cuentasBanc[0].nombre;
    if(cuentaSalida){
      var mov={
        id:'MOV-'+Date.now(),
        tipo:'retiro',
        concepto:'Egreso · '+conc,
        monto:monto,
        cuentaOrigen:cuentaSalida,
        cuentaDestino:null,
        fecha:newEg.fecha,
        referencia:newEg.notas||'',
        realizadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin',
        tasaBs:window._tasaBsGlobal||1,
        hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false})
      };
      S.movimientos.push(mov);
      DB.saveMovimiento(mov);
    }

    toast('Egreso registrado · '+fmt(monto),'success');closeM();nav('conta');return true;
    });
  };
  $('mft').innerHTML=`<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar Egreso</button>`;
  $('ov').style.display='flex';
}
function delEgreso(id){
  if(!requireDeletePermission()) return;
  var i=S.egresos.findIndex(function(x){return x.id===id;});
  if(i<0) return;
  var eg=S.egresos[i];
  // El gasto de la compra de una moto se maneja SOLO desde la moto: borrarlo por
  // separado dejaba la moto sin su compra y, si despues se borraba la moto, el dinero
  // volvia dos veces (punto 12, 21-sep-2026).
  if(eg.origenAuto==='compra_moto'){
    toast('Este gasto es la compra de una moto: bórralo desde Motocicletas (ahí se decide si el dinero vuelve a la cuenta)','error');
    return;
  }
  setMicon('eliminar');
  $('mtt').textContent='Eliminar Egreso';
  $('msb').textContent='El registro quedará auditado';
  $('modal-box').className='modal';
  $('mbd').innerHTML=''
    +'<div style="text-align:center;padding:8px 0 14px">'
    +'<div style="font-size:40px;margin-bottom:10px"></div>'
    +'<div style="font-size:14px;font-weight:800;margin-bottom:6px">¿Eliminar egreso: '+eg.concepto+' — '+fmt(eg.monto)+'?</div>'
    +'<div style="color:var(--ink3);font-size:12px;margin-bottom:14px">Puedes decidir si el dinero regresa o no a la cuenta de origen.</div>'
    +'</div>'
    +'<div class="fg"><label>Razón de la eliminación</label>'
    +'<select class="fs" id="eg_del_razon">'
    +'<option value="">— Seleccionar —</option>'
    +'<option>Error de captura</option>'
    +'<option>Egreso duplicado</option>'
    +'<option>Monto incorrecto</option>'
    +'<option>Operación cancelada</option>'
    +'<option>Orden del administrador</option>'
    +'<option>Otro</option>'
    +'</select></div>'
    +'<div class="fg" style="margin-top:8px;display:none" id="eg_del_otro_wrap">'
    +'<label>Especifica la razón</label>'
    +'<input class="fi" id="eg_del_otro" placeholder="Describe la razón..."></div>'
    +'<div class="fg" style="margin-top:10px"><label>¿Qué hacer con el dinero?</label>'
    +'<div style="display:grid;gap:8px">'
    +'<label style="display:flex;gap:8px;align-items:flex-start;background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px 12px"><input type="radio" name="eg_retorno" value="si" checked> <span><strong>Regresar el dinero a la cuenta</strong><br><span style="color:var(--ink3);font-size:12px">Crea un movimiento de reverso y suma el monto de nuevo a la cuenta.</span></span></label>'
    +'<label style="display:flex;gap:8px;align-items:flex-start;background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px 12px"><input type="radio" name="eg_retorno" value="no"> <span><strong>Eliminar sin regresar el dinero</strong><br><span style="color:var(--ink3);font-size:12px">Solo se anula el egreso, pero no se compensa la cuenta.</span></span></label>'
    +'</div></div>';
  setTimeout(function(){
    var sel=$('eg_del_razon');
    if(sel) sel.onchange=function(){ var w=$('eg_del_otro_wrap'); if(w) w.style.display=sel.value==='Otro'?'block':'none'; };
  },50);
  S.saveFn=function(){
    var razon=($('eg_del_razon')&&$('eg_del_razon').value)||'';
    if(razon==='Otro') razon=(($('eg_del_otro')&&$('eg_del_otro').value)||'').trim()||'Otro';
    if(!razon){ toast('Debes seleccionar una razón','error'); return false; }
    var devolver=(document.querySelector('input[name="eg_retorno"]:checked')||{}).value!=='no';
    var audit={
      eliminado:true,
      eliminadoPor:(S.currentUser&&S.currentUser.nombre)||'Administrador',
      eliminadoPorUid:(S.currentUser&&S.currentUser.uid)||'',
      eliminadoEn:new Date().toISOString(),
      eliminadoRazon:razon,
      eliminacionReversaCuenta:devolver
    };
    Object.assign(S.egresos[i],audit);
    DB.saveEgreso(S.egresos[i]);
    if(devolver){
      var cuentaSalida=eg.forma||eg.cuenta||eg.cuentaOrigen||'';
      if(!cuentaSalida && _cuentasBanc && _cuentasBanc.length>0) cuentaSalida=_cuentasBanc[0].nombre;
      if(cuentaSalida){
        var mov={
          id:'MOV-REV-EG-'+Date.now(),
          tipo:'deposito',
          concepto:'Reverso egreso eliminado · '+eg.concepto,
          monto:parseFloat(eg.monto)||0,
          cuentaOrigen:null,
          cuentaDestino:cuentaSalida,
          fecha:hoyLocalISO(),
          referencia:'Reverso por eliminación de egreso #'+eg.id,
          realizadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin',
          tasaBs:window._tasaBsGlobal||1,
          hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false}),
          reversoDe:'egreso:'+eg.id
        };
        S.movimientos.push(mov);
        DB.saveMovimiento(mov);
      }
    }
    closeM(); nav('conta');
    toast(devolver?'Egreso eliminado y dinero regresado a la cuenta':'Egreso eliminado sin regresar dinero','info');
    return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-d" onclick="saveM()">Eliminar Egreso</button>';
  $('ov').style.display='flex';
}

// UTILS
// ══════════════════════════════════════════════════════════════
// FEATURE 1: ALERTAS DE MORA AUTOMÁTICAS
// ══════════════════════════════════════════════════════════════
