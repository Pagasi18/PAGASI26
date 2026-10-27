// Logica de egresos. Extraido mecanicamente de assets/pagasi-app.js.
// "Guardar y registrar otro" (el contador, 27-oct-2026): guarda y deja el modal abierto y limpio para la siguiente
// factura, en vez de cerrarlo y tener que volver a entrar. El botón pone la bandera y saveFn la lee al guardar.
var _egGuardarOtro = false;
function openAddEgreso(){
  setMicon('egreso');$('mtt').textContent='Registrar Egreso';$('msb').textContent='Contabilidad';
  $('modal-box').className='modal';
  var _metodosOpts = (_cuentasBanc||[]).map(function(c){return '<option>'+c.nombre+'</option>';}).join('');
  $('mbd').innerHTML = '<div class="fgr c1" style="gap:9px">'
    +'<div class="fg"><label>Concepto *</label><input class="fi" id="eg_conc" placeholder="Ej: Compra de motos, GPS..."></div>'
    +'<div class="fgr" style="gap:8px">'
    // Las categorías son las del contador (logic/categorias-egreso.js, 28-oct-2026), por grupos
    +'<div class="fg"><label>Categoría</label><select class="fs" id="eg_cat">'
    +(typeof egresoCategoriasOpciones==='function' ? egresoCategoriasOpciones('operativo')
      : '<option value="inventario">Inventario / Motos</option><option value="equipos">Equipos (GPS)</option><option value="operativo" selected>Oficina y servicios</option><option value="nomina">Salarios / Nómina</option><option value="otros">Otros</option>')
    +'</select></div>'
    +'<div class="fg"><label>Monto (<span id="egf_lblmonto">$</span>) *</label><input class="fi" id="eg_monto" type="number" step="0.01" placeholder="0.00" oninput="if(typeof lbFiscalCalc===\'function\')lbFiscalCalc(\'egf\')"><div id="eg_monto_eq" style="font-size:10.5px;color:var(--ink3);min-height:13px;margin-top:2px"></div></div>'
    +'</div>'
    // Moneda del gasto: en bolívares el monto y la factura se escriben en Bs y el sistema los pasa a dólares con la
    // tasa BCV de la fecha de la factura (Adam, 26-oct-2026). Lo que se guarda sigue en dólares.
    +(typeof lbMonedaHtml==='function' ? lbMonedaHtml('egf', {}) : '')
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Forma de pago</label><select class="fs" id="eg_forma">'+_metodosOpts+'</select></div>'
    +'</div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Fecha</label><input class="fi" id="eg_fecha" type="date" value="'+hoyLocalISO()+'" onchange="if(typeof lbTasaBuscar===\'function\')lbTasaBuscar(\'egf\')"></div>'
    +'<div class="fg"><label>Referencia</label><input class="fi" id="eg_notas" placeholder="Opcional"></div>'
    +'</div>'
    +'<div id="eg_rep_gasto"></div>'
    // Datos de la factura del proveedor para el Libro de Compras (Adam, 21-oct-2026)
    +(typeof lbCamposFiscalesHtml==='function'
      ? '<details id="eg_fiscal_box" style="margin-top:4px;border:1px solid var(--rim);border-radius:9px;padding:9px 11px"><summary style="cursor:pointer;font-size:12.5px;font-weight:800">Factura del proveedor (para el Libro de Compras)</summary>'
        +'<div class="fgr c1" style="gap:9px;margin-top:9px">'+lbCamposFiscalesHtml('egf', {}, 0, {sinMoneda:true})+'</div></details>'
      : '')
    +'</div>';
    if(typeof _lbTasaEscrita!=='undefined'){ _lbTasaEscrita.egf=false; _lbTasaReq.egf=(_lbTasaReq.egf||0)+1; }
    if(typeof _lbRepExcluir!=='undefined') _lbRepExcluir.egf=[];
    S.saveFn=function(){
    var otro=_egGuardarOtro; _egGuardarOtro=false;
    var conc=(($('eg_conc')&&$('eg_conc').value)||'').trim();
    var montoIn=parseFloat(($('eg_monto')&&$('eg_monto').value))||0;
    if(!conc||montoIn<=0){toast('Concepto y monto son obligatorios','error');return false;}
    // En bolívares: el monto se guarda en dólares a la tasa BCV de la fecha; el original queda de constancia
    var enBs = typeof lbMonedaEs==='function' && lbMonedaEs('egf');
    var tasaEg = enBs ? lbTasaDe('egf') : 0;
    if(enBs && !(tasaEg>1)){ toast('Falta la tasa BCV (Bs por $) para pasar el monto a dólares','error'); return false; }
    var monto = enBs ? bsAUsd(montoIn, tasaEg) : montoIn;
    if(monto<=0){toast('El monto en dólares queda en cero: revisa la tasa','error');return false;}
    // Factura repetida (mismo N° del mismo proveedor): avisa y pregunta (Adam, 27-oct-2026); no bloquea
    if(typeof lbRepetidaConfirmar==='function' && !lbRepetidaConfirmar('egf')) return false;
    // El numero lo da el contador de Firestore, no el maximo en memoria: con dos
    // personas guardando a la vez, el segundo gasto borraba al primero (punto 30).
    return nextEgresoIdAsync().then(function(newId){
    var newEg={id:newId,concepto:conc,monto:monto,fecha:($('eg_fecha')&&$('eg_fecha').value)||hoyLocalISO(),categoria:($('eg_cat')&&$('eg_cat').value)||'otros',forma:($('eg_forma')&&$('eg_forma').value)||'',notas:($('eg_notas')&&$('eg_notas').value)||'',eliminado:false};
    // "Referencia" se guardaba solo en notas y los reportes leen e.referencia (salía vacío)
    newEg.referencia = newEg.notas || '';
    if(enBs){
      newEg.moneda='BS'; newEg.montoBs=montoIn; newEg.tasaBs=tasaEg;
      newEg.tasaMoneda=(($('egf_tasasel')&&$('egf_tasasel').value)==='eur')?'eur':'usd';
      newEg.tasaFecha=($('egf_tasafecha')&&$('egf_tasafecha').value)||newEg.fecha; newEg.tasaFuente=($('egf_tasafuente')&&$('egf_tasafuente').value)||'historial';
    }
    var _fis = (typeof lbLeerCamposFiscales==='function') ? lbLeerCamposFiscales('egf') : null;
    if(_fis){ if(!_fis.noAplica && !_fis.fecha) _fis.fecha = newEg.fecha; newEg.fiscal = _fis; }
    if(enBs && typeof lbTasaPersistir==='function') lbTasaPersistir(_fis && _fis.moneda==='BS' ? _fis : { moneda:'BS', tasaFuente:newEg.tasaFuente, tasa:tasaEg, tasaFecha:newEg.tasaFecha, tasaMoneda:newEg.tasaMoneda }, 'egf');
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
        tasaBs:enBs ? tasaEg : (window._tasaBsGlobal||1),
        hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false})
      };
      if(enBs) mov.montoBs = montoIn;
      S.movimientos.push(mov);
      DB.saveMovimiento(mov);
    }

    toast('Egreso registrado · '+fmt(monto)+(enBs ? ' (Bs '+montoIn.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' a '+tasaEg+' Bs/$)' : ''),'success');
    if(otro){
      // La lista de atrás se actualiza y el modal se vuelve a armar vacío (fecha de hoy); si la factura del
      // proveedor estaba desplegada, queda desplegada para la siguiente
      var fiscalAbierto=!!($('eg_fiscal_box')&&$('eg_fiscal_box').open);
      nav('conta'); openAddEgreso();
      if(fiscalAbierto && $('eg_fiscal_box')) $('eg_fiscal_box').open=true;
      return true;
    }
    closeM();nav('conta');return true;
    });
  };
  $('mft').innerHTML=`<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-g" onclick="_egGuardarOtro=true;saveM()">Guardar y registrar otro</button><button class="btn btn-p" onclick="saveM()">Guardar Egreso y Cerrar</button>`;
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
