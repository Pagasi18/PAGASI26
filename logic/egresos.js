// Logica de egresos. Extraido mecanicamente de assets/pagasi-app.js.
// "Guardar y registrar otro" (el contador, 27-oct-2026): guarda y deja el modal abierto y limpio para la siguiente
// factura, en vez de cerrarlo y tener que volver a entrar. El botón pone la bandera y saveFn la lee al guardar.
var _egGuardarOtro = false;
// Corregir un gasto (el contador, 2-nov-2026: "corregir un egreso en caso de que la persona que está cargando se
// equivoque"): el mismo formulario, con el gasto cargado. El monto, la moneda, la fecha y la cuenta los cambia solo
// un administrador (es lo que exigen las Reglas de Firestore desde el 28-sep-2026, igual que en Pagos y Cuentas);
// el concepto, la categoría, la referencia y los datos de la factura los corrige quien lo registró. Cada corrección
// queda en el historial del gasto y ajusta su movimiento en Cuentas.
function openEditEgreso(id){
  var eg=(S.egresos||[]).find(function(x){ return String(x.id)===String(id); });
  if(!eg){ toast('No encuentro ese gasto','error'); return; }
  openAddEgreso(eg);
}
// El movimiento de Cuentas que sacó el dinero de este gasto: por egresoId (los registrados desde el 2-nov-2026) o,
// en los viejos, el retiro con el mismo concepto, fecha, monto y cuenta
function _egMovimientoDe(eg, antes){
  var a=antes||eg, movs=(S.movimientos||[]).filter(function(m){ return m && !m.eliminado && m.tipo==='retiro'; });
  return movs.find(function(m){ return m.egresoId!=null && String(m.egresoId)===String(eg.id); })
    || movs.find(function(m){ return m.concepto==='Egreso · '+a.concepto && m.fecha===a.fecha && Math.abs((parseFloat(m.monto)||0)-(parseFloat(a.monto)||0))<0.005 && (!a.forma || m.cuentaOrigen===a.forma); })
    || null;
}
// Los campos de la factura se editan en la moneda del gasto. Si la factura se completó desde el Libro de Compras en la
// otra moneda, se pintan convertidos con su tasa y, si al guardar sus montos no cambiaron, se conserva la factura tal
// como estaba (los bolívares originales y la tasa son la constancia legal; ver _egFiscalMismoDinero).
function _egFiscalParaEditar(eg){
  var f=Object.assign({}, eg.fiscal||{}), gastoBs=eg.moneda==='BS', factBs=f.moneda==='BS';
  if(f.noAplica || gastoBs===factBs) return f;
  if(factBs){ f.moneda='USD'; ['exentoBs','baseBs','retenidoBs','ivaBs','tasa','tasaMoneda','tasaFecha','tasaFuente'].forEach(function(k){ delete f[k]; }); return f; }   // ya trae los dólares
  var t=parseFloat(eg.tasaBs)||0;
  f.moneda='BS'; f.tasa=t; f.tasaMoneda=eg.tasaMoneda||'usd'; f.tasaFecha=eg.tasaFecha||''; f.tasaFuente=eg.tasaFuente||'';
  ['exento','base','retenido'].forEach(function(k){ f[k+'Bs']=(f[k]===''||f[k]==null||!t) ? '' : (typeof usdABs==='function' ? usdABs(f[k],t) : Math.round(f[k]*t*100)/100); });
  return f;
}
var _EG_FISCAL_DINERO=['exento','base','alicuota','retenido','iva','exentoBs','baseBs','retenidoBs','ivaBs','moneda','tasa','tasaMoneda','tasaFecha','tasaFuente'];
// Compara los MONTOS de la factura (la alícuota va aparte): en bolívares cuando las dos están en bolívares (la tasa del
// gasto y la de la factura pueden ser distintas, y eso no es un cambio de montos); si no, en dólares
function _egFiscalMismoDinero(a,b){
  var n=function(v){ return (v===''||v==null) ? 0 : (parseFloat(v)||0); };
  var suf=(a.moneda==='BS' && b.moneda==='BS') ? 'Bs' : '';
  return ['exento','base','retenido'].every(function(k){ return Math.abs(n(a[k+suf])-n(b[k+suf]))<0.011; });
}
function openAddEgreso(eg){
  var editar=!!(eg && eg.id!=null);
  // Lo que creó el sistema se corrige desde su módulo: la compra de una moto desde Motocicletas (ahí se decide qué
  // pasa con el dinero) y el pago de una comisión desde Comisiones (su categoría y su monto los lleva ese módulo)
  if(editar && eg.origenAuto){ toast(eg.origenAuto==='compra_moto' ? 'Este gasto es la compra de una moto: se corrige desde Motocicletas' : (eg.origenAuto==='comision' ? 'Este gasto es un pago de comisión: se corrige desde Comisiones' : 'Este gasto lo creó el sistema: se corrige desde su módulo'),'error'); return; }
  if(editar && eg.eliminado){ toast('Este gasto está eliminado: no se puede corregir','error'); return; }
  var puedeDinero=!editar || ((typeof isAdminUser==='function' && isAdminUser()) && !(eg.partes||[]).length);
  _egPartesIds=[];
  var enBsEg=editar && eg.moneda==='BS';
  var fisEg=editar ? _egFiscalParaEditar(eg) : {};
  var monEg=editar ? { moneda:enBsEg?'BS':'USD', tasa:enBsEg?eg.tasaBs:'', tasaMoneda:eg.tasaMoneda||'usd', tasaFecha:eg.tasaFecha||'', tasaFuente:eg.tasaFuente||'' } : {};
  var esc=function(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); };
  var dis=puedeDinero?'':' disabled';
  setMicon('egreso');$('mtt').textContent=editar?'Corregir Egreso #'+eg.id:'Registrar Egreso';$('msb').textContent='Contabilidad';
  $('modal-box').className='modal';
  var _cuentas=(_cuentasBanc||[]).map(function(c){ return c.nombre; });
  if(editar && eg.forma && _cuentas.indexOf(eg.forma)<0) _cuentas.push(eg.forma);   // una cuenta que ya no está sigue viéndose en su gasto
  var _metodosOpts = _cuentas.map(function(n){return '<option'+(editar && n===eg.forma?' selected':'')+'>'+esc(n)+'</option>';}).join('');
  // Las categorías son las del contador (logic/categorias-egreso.js, 28-oct-2026), por grupos. Al corregir, una
  // categoría que ya no está en la lista se agrega tal cual: si no, el navegador dejaba la primera y el gasto cambiaba
  // de categoría solo por abrir y guardar
  var _catOpts = (typeof egresoCategoriasOpciones==='function' ? egresoCategoriasOpciones(editar?(eg.categoria||'otros'):'operativo')
      : '<option value="inventario">Inventario / Motos</option><option value="equipos">Equipos (GPS)</option><option value="operativo" selected>Oficina y servicios</option><option value="nomina">Salarios / Nómina</option><option value="otros">Otros</option>');
  if(editar && eg.categoria && typeof egresoCategoria==='function' && !egresoCategoria(eg.categoria)) _catOpts = '<option value="'+esc(eg.categoria)+'" selected>'+esc(typeof egresoCategoriaNombre==='function' ? egresoCategoriaNombre(eg.categoria) : eg.categoria)+'</option>' + _catOpts;
  $('mbd').innerHTML = '<div class="fgr c1" style="gap:9px">'
    +(editar && !puedeDinero ? '<div style="padding:8px 11px;border-radius:8px;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.35);font-size:11.5px;color:var(--ink2)">'+((eg.partes||[]).length ? 'Este gasto se pagó de varias cuentas: el monto y las cuentas no se corrigen aquí (elimínalo y regístralo de nuevo).' : 'El monto, la moneda, la fecha y la cuenta de un gasto ya registrado los cambia solo un administrador.')+' Lo demás (concepto, categoría, referencia y factura) sí lo puedes corregir aquí.</div>' : '')
    +'<div class="fg"><label>Concepto *</label><input class="fi" id="eg_conc" value="'+(editar?esc(eg.concepto):'')+'" placeholder="Ej: Compra de motos, GPS..."></div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Categoría</label><select class="fs" id="eg_cat">'+_catOpts+'</select></div>'
    +'<div class="fg"><label>Monto (<span id="egf_lblmonto">'+(enBsEg?'Bs':'$')+'</span>) *</label><input class="fi" id="eg_monto" type="number" step="0.01" placeholder="0.00" value="'+(editar?esc(enBsEg?eg.montoBs:eg.monto):'')+'"'+dis+' oninput="if(typeof lbFiscalCalc===\'function\')lbFiscalCalc(\'egf\')"><div id="eg_monto_eq" style="font-size:10.5px;color:var(--ink3);min-height:13px;margin-top:2px"></div></div>'
    +'</div>'
    // Moneda del gasto: en bolívares el monto y la factura se escriben en Bs y el sistema los pasa a dólares con la
    // tasa BCV de la fecha de la factura (Adam, 26-oct-2026). Lo que se guarda sigue en dólares.
    +(typeof lbMonedaHtml==='function' ? lbMonedaHtml('egf', monEg) : '')
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Forma de pago</label><select class="fs" id="eg_forma"'+dis+'>'+_metodosOpts+'</select>'
    // Un gasto pagado de varias cuentas (el contador, 2-nov-2026: parte en efectivo y parte por transferencia): una sola
    // factura, un movimiento por cuenta. Al corregir no se reparte de nuevo: se elimina y se registra otra vez.
    +(editar ? ((eg.partes||[]).length ? '<div style="font-size:11px;color:var(--ink2);margin-top:4px">Pagado con: '+eg.partes.map(function(x){ return esc(x.forma)+' '+fmt(x.monto); }).join(' · ')+'</div>' : '')
      : '<div id="eg_partes"></div><a href="javascript:void(0)" onclick="egAgregarParte()" style="display:inline-block;margin-top:4px;font-size:11.5px;font-weight:700;color:var(--p1)">+ Pagado también con otra cuenta</a><div id="eg_partes_resto" style="font-size:10.5px;color:var(--ink3)"></div>')
    +'</div>'
    +'</div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Fecha</label><input class="fi" id="eg_fecha" type="date" value="'+(editar?esc(eg.fecha||''):hoyLocalISO())+'"'+dis+' onchange="if(typeof lbTasaBuscar===\'function\')lbTasaBuscar(\'egf\')"></div>'
    +'<div class="fg"><label>Referencia</label><input class="fi" id="eg_notas" value="'+(editar?esc(eg.notas||eg.referencia||''):'')+'" placeholder="Opcional"></div>'
    +'</div>'
    +'<div id="eg_rep_gasto"></div>'
    // Datos de la factura del proveedor para el Libro de Compras (Adam, 21-oct-2026)
    +(typeof lbCamposFiscalesHtml==='function'
      ? '<details id="eg_fiscal_box"'+(editar && eg.fiscal && !eg.fiscal.noAplica?' open':'')+' style="margin-top:4px;border:1px solid var(--rim);border-radius:9px;padding:9px 11px"><summary style="cursor:pointer;font-size:12.5px;font-weight:800">Factura del proveedor (para el Libro de Compras)</summary>'
        +'<div class="fgr c1" style="gap:9px;margin-top:9px">'+lbCamposFiscalesHtml('egf', fisEg, 0, {sinMoneda:true})+'</div></details>'
      : '')
    +(editar && (eg.historial||[]).length ? '<div style="font-size:10.5px;color:var(--ink3)">Corregido '+eg.historial.length+(eg.historial.length===1?' vez':' veces')+' · última: '+esc(eg.editadoPor||'')+' el '+esc(String(eg.editadoEn||'').slice(0,10))+'</div>' : '')
    +'</div>';
    if(typeof _lbTasaEscrita!=='undefined'){ _lbTasaEscrita.egf=false; _lbTasaReq.egf=(_lbTasaReq.egf||0)+1; }
    if(typeof _lbRepExcluir!=='undefined') _lbRepExcluir.egf=editar?[eg.id]:[];   // al corregir, su propia factura no cuenta como repetida
    if(editar){
      if(!puedeDinero){ ['egf_mon','egf_tasa','egf_tasasel'].forEach(function(id){ var el=$(id); if(el) el.disabled=true; }); }
      // Con la tasa ya guardada no se busca otra; se recalcula el equivalente y lo que dice la factura
      setTimeout(function(){ if(typeof lbMonedaCambio==='function') lbMonedaCambio('egf', true); if(typeof lbFiscalCalc==='function') lbFiscalCalc('egf'); },0);
    }
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
    if(editar) return _egGuardarCorreccion(eg, { conc:conc, montoIn:montoIn, monto:monto, enBs:enBs, tasaEg:tasaEg, puedeDinero:puedeDinero });
    var partes=_egLeerPartes(montoIn, enBs, tasaEg);
    if(partes===false) return false;
    // El numero lo da el contador de Firestore, no el maximo en memoria: con dos
    // personas guardando a la vez, el segundo gasto borraba al primero (punto 30).
    return nextEgresoIdAsync().then(function(newId){
    var newEg={id:newId,concepto:conc,monto:monto,fecha:($('eg_fecha')&&$('eg_fecha').value)||hoyLocalISO(),categoria:($('eg_cat')&&$('eg_cat').value)||'otros',forma:($('eg_forma')&&$('eg_forma').value)||'',notas:($('eg_notas')&&$('eg_notas').value)||'',eliminado:false,
      creadoEn:new Date().toISOString(),creadoPor:(S.currentUser&&S.currentUser.nombre)||''};   // cuándo se anotó (la fecha de arriba es la del gasto)
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

    // Crear movimiento de SALIDA en la cuenta seleccionada (uno por cuenta si se pagó de varias)
    var cuentaSalida=($('eg_forma')&&$('eg_forma').value)||'';
    if(!cuentaSalida && _cuentasBanc && _cuentasBanc.length>0) cuentaSalida=_cuentasBanc[0].nombre;
    if(partes){ newEg.partes=partes; newEg.forma=partes.map(function(x){ return x.forma; }).join(' + '); DB.saveEgreso(newEg); }
    var salidas=partes || (cuentaSalida ? [{ forma:cuentaSalida, monto:monto, montoBs:enBs?montoIn:undefined }] : []);
    salidas.forEach(function(x, i){
      var mov={
        id:'MOV-'+Date.now()+(partes?'-'+(i+1):''),
        tipo:'retiro',
        concepto:'Egreso · '+conc+(partes?' ('+(i+1)+'/'+salidas.length+')':''),
        monto:x.monto,
        cuentaOrigen:x.forma,
        cuentaDestino:null,
        fecha:newEg.fecha,
        referencia:newEg.notas||'',
        realizadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin',
        tasaBs:enBs ? tasaEg : (window._tasaBsGlobal||1),
        hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false}),
        egresoId:newId   // para encontrarlo al corregir o eliminar el gasto
      };
      if(enBs) mov.montoBs = x.montoBs;
      S.movimientos.push(mov);
      DB.saveMovimiento(mov);
    });

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
  $('mft').innerHTML=editar
    ? `<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar corrección</button>`
    : `<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-g" onclick="_egGuardarOtro=true;saveM()">Guardar y registrar otro</button><button class="btn btn-p" onclick="saveM()">Guardar Egreso y Cerrar</button>`;
  $('ov').style.display='flex';
}
// Las otras cuentas de un gasto pagado de varias: filas con cuenta y monto; lo que falta para el total sale de la cuenta
// de arriba. Devuelve null si es una sola cuenta, false si algo está mal (ya avisó), o la lista de partes en dólares.
var _egPartesIds=[], _egPartesN=0;
function egAgregarParte(){
  var cont=$('eg_partes'); if(!cont) return;
  var n=++_egPartesN, opts=(_cuentasBanc||[]).map(function(c){ return '<option>'+String(c.nombre).replace(/</g,'&lt;')+'</option>'; }).join('');
  _egPartesIds.push(n);
  var fila=document.createElement('div'); fila.id='eg_parte_'+n; fila.className='fgr'; fila.style.cssText='gap:8px;margin-top:6px;align-items:end';
  fila.innerHTML='<div class="fg"><label>También con</label><select class="fs" id="eg_parte_cta_'+n+'">'+opts+'</select></div>'
    +'<div class="fg"><label>Monto de esa cuenta</label><input class="fi" id="eg_parte_monto_'+n+'" type="number" step="0.01" placeholder="0.00" oninput="egPartesResto()"></div>'
    +'<button type="button" class="btn btn-g btn-sm" onclick="egQuitarParte('+n+')" title="Quitar">✕</button>';
  cont.appendChild(fila); egPartesResto();
}
function egQuitarParte(n){ _egPartesIds=_egPartesIds.filter(function(x){ return x!==n; }); var f=$('eg_parte_'+n); if(f && f.remove) f.remove(); egPartesResto(); }
function egPartesResto(){
  var el=$('eg_partes_resto'); if(!el) return;
  if(!_egPartesIds.length){ el.textContent=''; return; }
  var total=parseFloat(($('eg_monto')&&$('eg_monto').value))||0, otras=_egPartesIds.reduce(function(a,n){ return a+(parseFloat(($('eg_parte_monto_'+n)||{}).value)||0); },0);
  var resto=Math.round((total-otras)*100)/100, sim=(typeof lbMonedaEs==='function' && lbMonedaEs('egf'))?'Bs ':'$';
  el.textContent=resto>0 ? 'De la cuenta de arriba salen '+sim+resto.toFixed(2)+' (el resto del total)' : (total ? 'Las otras cuentas suman igual o más que el total' : '');
}
function _egLeerPartes(montoIn, enBs, tasaEg){
  if(!_egPartesIds.length) return null;
  var primera=($('eg_forma')&&$('eg_forma').value)||'', partes=[], suma=0, r2=function(x){ return Math.round(x*100)/100; };
  for(var i=0;i<_egPartesIds.length;i++){
    var n=_egPartesIds[i], cta=($('eg_parte_cta_'+n)||{}).value||'', m=parseFloat(($('eg_parte_monto_'+n)||{}).value)||0;
    if(!cta || m<=0){ toast('Cada cuenta adicional necesita su cuenta y su monto','error'); return false; }
    partes.push({ forma:cta, montoIn:m }); suma=r2(suma+m);
  }
  var resto=r2(montoIn-suma);
  if(resto<=0){ toast('Las otras cuentas suman igual o más que el total: revisa los montos','error'); return false; }
  partes.unshift({ forma:primera, montoIn:resto });
  var enUsd=partes.map(function(x){ return { forma:x.forma, monto:enBs ? bsAUsd(x.montoIn, tasaEg) : r2(x.montoIn), montoBs:enBs ? x.montoIn : undefined }; });
  // los centavos del cambio van a la primera cuenta, para que las partes sumen exactamente el gasto
  var totalUsd=enBs ? bsAUsd(montoIn, tasaEg) : r2(montoIn), dif=r2(totalUsd-enUsd.reduce(function(a,x){ return a+x.monto; },0));
  if(dif) enUsd[0].monto=r2(enUsd[0].monto+dif);
  return enUsd;
}
// Guarda la corrección de un gasto: lo que cambió queda en su historial, y su movimiento de Cuentas se ajusta
function _egGuardarCorreccion(eg, v){
  var real=(S.egresos||[]).find(function(x){ return String(x.id)===String(eg.id); })||eg;
  var antes={ concepto:real.concepto, categoria:real.categoria, monto:real.monto, fecha:real.fecha, forma:real.forma, notas:real.notas||'', moneda:real.moneda||'USD', montoBs:real.montoBs||null, tasaBs:real.tasaBs||null,
    fiscal: real.fiscal ? JSON.parse(JSON.stringify(real.fiscal)) : null };   // la factura también, para poder reconstruirla
  var ahora=new Date().toISOString(), quien=(S.currentUser&&S.currentUser.nombre)||'';
  var notas=(($('eg_notas')&&$('eg_notas').value)||'').trim();
  real.concepto=v.conc; real.categoria=($('eg_cat')&&$('eg_cat').value)||real.categoria||'otros'; real.notas=notas; real.referencia=notas;
  if(v.puedeDinero){
    real.monto=v.monto; real.fecha=($('eg_fecha')&&$('eg_fecha').value)||real.fecha; real.forma=($('eg_forma')&&$('eg_forma').value)||real.forma;
    if(v.enBs){
      real.moneda='BS'; real.montoBs=v.montoIn; real.tasaBs=v.tasaEg;
      real.tasaMoneda=(($('egf_tasasel')&&$('egf_tasasel').value)==='eur')?'eur':'usd';
      real.tasaFecha=($('egf_tasafecha')&&$('egf_tasafecha').value)||real.fecha; real.tasaFuente=($('egf_tasafuente')&&$('egf_tasafuente').value)||'historial';
    } else { real.moneda='USD'; ['montoBs','tasaBs','tasaMoneda','tasaFecha','tasaFuente'].forEach(function(k){ delete real[k]; }); }
  }
  var fis=(typeof lbLeerCamposFiscales==='function') ? lbLeerCamposFiscales('egf') : null, fisViejo=real.fiscal||null;
  // Si los montos de la factura no cambiaron, se conserva como estaba (con sus bolívares y su tasa, si los tenía) y
  // solo se toman los datos corregidos: proveedor, RIF, N°, control, fecha, tipo, origen, comprobante
  if(fis && !fis.noAplica && fisViejo && !fisViejo.noAplica && _egFiscalMismoDinero(fisViejo, fis)){
    var mezcla=Object.assign({}, fisViejo); Object.keys(fis).forEach(function(k){ if(_EG_FISCAL_DINERO.indexOf(k)<0) mezcla[k]=fis[k]; });
    var alicN=(fis.alicuota===''||fis.alicuota==null)?'':parseFloat(fis.alicuota), alicV=(fisViejo.alicuota===''||fisViejo.alicuota==null)?'':parseFloat(fisViejo.alicuota);
    if(alicN!==alicV){   // cambió solo la alícuota: el IVA se recalcula sobre los mismos montos, en las dos monedas
      var r2=function(x){ return Math.round(x*100)/100; };
      mezcla.alicuota=alicN;
      mezcla.iva=(mezcla.base===''||mezcla.base==null||alicN==='')?'':r2(parseFloat(mezcla.base)*alicN);
      if(mezcla.moneda==='BS') mezcla.ivaBs=(mezcla.baseBs===''||mezcla.baseBs==null||alicN==='')?'':r2(parseFloat(mezcla.baseBs)*alicN);
    }
    fis=mezcla;
  }
  if(fis){ if(!fis.noAplica && !fis.fecha) fis.fecha=real.fecha; fis.actualizado=ahora; fis.actualizadoPor=quien; real.fiscal=fis; } else delete real.fiscal;
  if(v.enBs && v.puedeDinero && typeof lbTasaPersistir==='function') lbTasaPersistir(fis && fis.moneda==='BS' ? fis : { moneda:'BS', tasaFuente:real.tasaFuente, tasa:v.tasaEg, tasaFecha:real.tasaFecha, tasaMoneda:real.tasaMoneda }, 'egf');
  real.editadoEn=ahora; real.editadoPor=quien;
  real.historial=(real.historial||[]).concat([{ en:ahora, por:quien, antes:antes }]).slice(-20);
  DB.saveEgreso(real);
  if(typeof logActividad==='function') logActividad('egreso_corregido','egresos',String(real.id),{ antes:antes, despues:{ concepto:real.concepto, monto:real.monto, fecha:real.fecha, forma:real.forma } });
  // El dinero que salió de la cuenta sigue al gasto
  var cambioDinero=v.puedeDinero && (Math.abs((parseFloat(antes.monto)||0)-real.monto)>0.005 || antes.fecha!==real.fecha || antes.forma!==real.forma);
  var movs=(real.partes||[]).length ? (S.movimientos||[]).filter(function(m){ return m && !m.eliminado && m.tipo==='retiro' && String(m.egresoId)===String(real.id); }) : [];
  var mov=movs.length ? movs[0] : _egMovimientoDe(real, antes);
  if(movs.length) movs.forEach(function(m, i){ m.concepto='Egreso · '+real.concepto+' ('+(i+1)+'/'+movs.length+')'; m.referencia=notas; DB.saveMovimiento(m); });
  else if(mov){
    mov.concepto='Egreso · '+real.concepto; mov.referencia=notas; mov.egresoId=real.id;
    if(v.puedeDinero){
      mov.monto=real.monto; mov.fecha=real.fecha; mov.cuentaOrigen=real.forma; mov.tasaBs=v.enBs ? v.tasaEg : (mov.tasaBs||window._tasaBsGlobal||1);
      if(v.enBs) mov.montoBs=v.montoIn; else delete mov.montoBs;
    }
    DB.saveMovimiento(mov);
  } else if(cambioDinero){
    toast('Gasto corregido, pero no encontré su movimiento en Cuentas: revisa el saldo de '+(antes.forma||'la cuenta'),'error');
  }
  if(mov || !cambioDinero) toast('Gasto corregido','success');
  closeM(); nav('conta'); return true;
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
      // pagado de varias cuentas: cada parte vuelve a la suya
      var vueltas=(eg.partes||[]).length ? eg.partes : (cuentaSalida ? [{ forma:cuentaSalida, monto:parseFloat(eg.monto)||0 }] : []);
      vueltas.forEach(function(x, k){
        var mov={
          id:'MOV-REV-EG-'+Date.now()+(vueltas.length>1?'-'+(k+1):''),
          tipo:'deposito',
          concepto:'Reverso egreso eliminado · '+eg.concepto,
          monto:parseFloat(x.monto)||0,
          cuentaOrigen:null,
          cuentaDestino:x.forma,
          fecha:hoyLocalISO(),
          referencia:'Reverso por eliminación de egreso #'+eg.id,
          realizadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin',
          tasaBs:window._tasaBsGlobal||1,
          hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false}),
          reversoDe:'egreso:'+eg.id
        };
        S.movimientos.push(mov);
        DB.saveMovimiento(mov);
      });
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
