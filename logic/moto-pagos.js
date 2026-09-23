// Helpers de pago/egreso para compra de motos. Extraido mecanicamente de assets/pagasi-app.js.
// La cuenta se elige a mano: antes venia elegida la primera de la lista y, si nadie la
// cambiaba, la compra se anotaba ahi aunque el dinero saliera de otra (punto 8, 19-sep).
// 23-sep-2026, Adam en PAGASI 26: "solo sale efectivo... y no tenemos cuenta de
// efectivo, tenemos 100% y binance". Cuando la lista de cuentas venia vacia, el
// sistema ofrecia "Efectivo USD" como si existiera, y el dinero se anotaba en una
// cuenta que no esta en Configuracion: no aparece en ningun saldo y nadie lo encuentra
// despues. Ahora, si no hay cuentas, se dice y no se deja elegir nada.
function _mpagoMetodosOpts(){
  if(!(_cuentasBanc && _cuentasBanc.length))
    return '<option value="" selected>— No hay cuentas cargadas —</option>';
  return '<option value="" selected>— Elegir cuenta —</option>'
    + _cuentasBanc.map(function(c){return '<option value="'+c.nombre+'">'+c.nombre+'</option>';}).join('');
}
// Que dinero es cada fila. Adam, 23-sep-2026: el paso 3 le pedia repartir los $1350 de
// la moto sin decir que $750 son la inicial que pone el cliente y $600 lo que pone
// Pagasi. Las dos salen hacia el concesionario, pero no son la misma plata, y de eso
// depende que el dashboard no cuente la inicial como dinero prestado.
function _mpagoEtiqueta(txt){
  return txt ? '<div class="mpago-tag" style="grid-column:1/-1;font-size:10.5px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:-2px">'+txt+'</div>' : '';
}
function _mpagoFilaHtml(prefix, idx, etiqueta){
  var opts = _mpagoMetodosOpts();
  return '<div class="mpago-row" data-idx="'+idx+'" style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px">'
    + _mpagoEtiqueta(etiqueta)
    + '<div class="fg" style="margin:0"><label style="font-size:11px">Cuenta / Forma de pago</label>'
    + '<select class="fs '+prefix+'-cuenta" onchange="_mpagoMarcarTocado(this,\''+prefix+'\')">'+opts+'</select></div>'
    + '<div class="fg" style="margin:0"><label style="font-size:11px">Monto ($)</label>'
    + '<input class="fi '+prefix+'-monto" type="number" step="0.01" placeholder="0.00" oninput="_mpagoMarcarTocado(this,\''+prefix+'\');_mpagoActualizarTotales(\''+prefix+'\')"></div>'
    + '<button type="button" class="btn btn-g btn-sm '+prefix+'-del" style="height:38px;padding:0 10px" onclick="_mpagoEliminarFila(this,\''+prefix+'\')" title="Eliminar">x</button>'
    + '</div>';
}
// El usuario tocó esta fila → ya no autorellenamos
function _mpagoMarcarTocado(el, prefix){
  var row = el.closest('.mpago-row');
  if(row) row.setAttribute('data-touched','1');
}
function _mpagoBloqueHtml(prefix, titulo, descripcion){
  prefix = prefix || _MPAGO_PREFIX;
  // Si la pantalla lleva horas abierta y las cuentas se crearon despues, se vuelven a
  // pedir y los desplegables se llenan solos (23-sep-2026).
  if(typeof _cuentasRecargarSiVacio==='function') setTimeout(_cuentasRecargarSiVacio, 0);
  return '<div class="fsec" style="margin-top:14px">'+(titulo||'Forma de pago de la moto')+'</div>'
    + '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:var(--r8);padding:12px">'
    + '<div style="font-size:12px;color:var(--ink3);margin-bottom:10px">'+(descripcion||'Indica de cuál(es) cuenta(s) o efectivo sale el dinero para pagar esta moto. Puedes dividir el pago entre varias.')+'</div>'
    + '<div id="'+prefix+'-rows">'+_mpagoFilaHtml(prefix,0)+'</div>'
    + '<button type="button" class="btn btn-g btn-sm" onclick="_mpagoAgregarFila(\''+prefix+'\')" style="margin-top:4px">+ Agregar otra cuenta</button>'
    + '<div id="'+prefix+'-totales" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;padding-top:10px;border-top:1px dashed var(--rim)">'
    +   '<div style="text-align:center"><div style="font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.5px">Costo</div><div id="'+prefix+'-costo" style="font-size:14px;font-weight:900;color:var(--ink)">$0.00</div></div>'
    +   '<div style="text-align:center"><div style="font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.5px">Asignado</div><div id="'+prefix+'-asignado" style="font-size:14px;font-weight:900;color:var(--p1)">$0.00</div></div>'
    +   '<div style="text-align:center"><div style="font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.5px">Diferencia</div><div id="'+prefix+'-dif" style="font-size:14px;font-weight:900;color:var(--ink)">$0.00</div></div>'
    + '</div>'
    + '<div id="'+prefix+'-msg" style="margin-top:8px;font-size:11px;color:var(--ink3)"></div>'
    + ((_cuentasBanc && _cuentasBanc.length) ? ''
       : '<div class="mpago-sin-cuentas" style="margin-top:8px;font-size:11.5px;color:var(--red);font-weight:700">'
         + 'No hay cuentas cargadas. Cárgalas en Configuración → Cuentas bancarias.</div>')
    + '</div>';
}
// El reparto que ya sabe el sistema: la inicial que pone el cliente y lo que financia
// Pagasi. Las dos filas salen con su monto puesto y etiquetadas; lo unico que hay que
// decir es de que cuenta sale cada una. Si el usuario ya toco algo, no se toca nada.
function _mpagoRepartirInicial(prefix, costo, inicial){
  prefix = prefix || _MPAGO_PREFIX;
  var cont = document.getElementById(prefix+'-rows');
  if(!cont) return;
  costo = parseFloat(costo)||0; inicial = parseFloat(inicial)||0;
  var financiado = Math.round((costo - inicial)*100)/100;
  var filas = cont.querySelectorAll('.mpago-row');
  // Solo en la primera entrada al paso, con las dos partes de verdad
  if(filas.length !== 1 || inicial <= 0.005 || financiado <= 0.005) return;
  if(filas[0].getAttribute('data-touched') === '1') return;
  cont.innerHTML = _mpagoFilaHtml(prefix, 0, 'Inicial del cliente')
                 + _mpagoFilaHtml(prefix, 1, 'Lo que financia Pagasi');
  var inps = cont.querySelectorAll('.'+prefix+'-monto');
  if(inps[0]) inps[0].value = inicial.toFixed(2);
  if(inps[1]) inps[1].value = financiado.toFixed(2);
  _mpagoActualizarTotales(prefix);
}

function _mpagoAgregarFila(prefix){
  prefix = prefix || _MPAGO_PREFIX;
  var cont = document.getElementById(prefix+'-rows');
  if(!cont) return;
  // Calcular restante ANTES de agregar la nueva fila
  var costoEl = document.getElementById(prefix+'-costo');
  var costo = costoEl ? (parseFloat((costoEl.textContent||'0').replace(/[^0-9.\-]/g,''))||0) : 0;
  var asignado = 0;
  cont.querySelectorAll('.'+prefix+'-monto').forEach(function(inp){
    asignado += parseFloat(inp.value)||0;
  });
  var restante = +(costo - asignado).toFixed(2);
  var idx = cont.querySelectorAll('.mpago-row').length;
  cont.insertAdjacentHTML('beforeend', _mpagoFilaHtml(prefix, idx));
  // Si hay restante positivo, precargar la nueva fila (que está vacía por ser recién creada)
  if(restante > 0.005){
    var rows = cont.querySelectorAll('.mpago-row');
    var nueva = rows[rows.length-1];
    if(nueva){
      var nuevoInp = nueva.querySelector('.'+prefix+'-monto');
      if(nuevoInp && !nuevoInp.value){ nuevoInp.value = restante.toFixed(2); }
    }
  }
  _mpagoActualizarTotales(prefix);
}
function _mpagoEliminarFila(btn, prefix){
  prefix = prefix || _MPAGO_PREFIX;
  var cont = document.getElementById(prefix+'-rows');
  if(!cont) return;
  var rows = cont.querySelectorAll('.mpago-row');
  if(rows.length<=1){
    // No eliminar la última, solo limpiar
    var inp = btn.parentNode.querySelector('.'+prefix+'-monto');
    if(inp) inp.value = '';
    _mpagoActualizarTotales(prefix);
    return;
  }
  btn.parentNode.remove();
  _mpagoActualizarTotales(prefix);
}
// Establece el costo objetivo y, opcionalmente, precarga la primera fila si NO ha sido tocada
// Si se pasa precargaPrimeraFila se intenta usar ese monto; si no, se usa el costo total
function _mpagoSetCosto(prefix, costo, precargaPrimeraFila){
  prefix = prefix || _MPAGO_PREFIX;
  var el = document.getElementById(prefix+'-costo');
  if(el) el.textContent = '$'+(parseFloat(costo)||0).toFixed(2);
  // Precargar/actualizar primera fila SOLO si NO fue tocada por el usuario
  var cont = document.getElementById(prefix+'-rows');
  if(cont){
    var firstRow = cont.querySelector('.mpago-row');
    if(firstRow && firstRow.getAttribute('data-touched')!=='1'){
      var firstInp = firstRow.querySelector('.'+prefix+'-monto');
      if(firstInp){
        var sugerido = (precargaPrimeraFila!=null && precargaPrimeraFila>0)
          ? parseFloat(precargaPrimeraFila)
          : (parseFloat(costo)||0);
        if(sugerido > 0.005){
          firstInp.value = sugerido.toFixed(2);
        } else {
          firstInp.value = '';
        }
      }
    }
  }
  _mpagoActualizarTotales(prefix);
}
function _mpagoActualizarTotales(prefix){
  prefix = prefix || _MPAGO_PREFIX;
  var cont = document.getElementById(prefix+'-rows');
  if(!cont) return;
  var asignado = 0;
  cont.querySelectorAll('.'+prefix+'-monto').forEach(function(inp){
    asignado += parseFloat(inp.value)||0;
  });
  var costoEl = document.getElementById(prefix+'-costo');
  var costo = costoEl ? (parseFloat((costoEl.textContent||'0').replace(/[^0-9.\-]/g,''))||0) : 0;
  var dif = +(costo - asignado).toFixed(2);
  var asEl = document.getElementById(prefix+'-asignado');
  var dEl  = document.getElementById(prefix+'-dif');
  var msg  = document.getElementById(prefix+'-msg');
  if(asEl) asEl.textContent = '$'+asignado.toFixed(2);
  if(dEl){
    dEl.textContent = (dif>=0?'$':'-$')+Math.abs(dif).toFixed(2);
    dEl.style.color = Math.abs(dif)<0.01 ? 'var(--green)' : (dif>0 ? 'var(--amber)' : 'var(--red)');
  }
  if(msg){
    if(costo<=0){ msg.textContent = ''; msg.style.color='var(--ink3)'; }
    else if(Math.abs(dif)<0.01){ msg.textContent = '✓ Pago cuadrado con el costo de la moto'; msg.style.color='var(--green)'; }
    else if(dif>0){ msg.textContent = 'Falta asignar $'+dif.toFixed(2); msg.style.color='var(--amber)'; }
    else { msg.textContent = 'Te excediste por $'+Math.abs(dif).toFixed(2); msg.style.color='var(--red)'; }
  }
}
function _mpagoLeerPagos(prefix){
  prefix = prefix || _MPAGO_PREFIX;
  var cont = document.getElementById(prefix+'-rows');
  var pagos = [];
  if(!cont) return pagos;
  cont.querySelectorAll('.mpago-row').forEach(function(row){
    var cSel = row.querySelector('.'+prefix+'-cuenta');
    var mInp = row.querySelector('.'+prefix+'-monto');
    var cuenta = cSel ? cSel.value : '';
    var monto = parseFloat(mInp&&mInp.value)||0;
    if(cuenta && monto>0) pagos.push({cuenta:cuenta, monto:+monto.toFixed(2)});
  });
  return pagos;
}
function _mpagoValidarContraCosto(prefix, costo){
  // Un monto sin cuenta elegida no se puede dar por bueno
  var cont = document.getElementById((prefix||_MPAGO_PREFIX)+'-rows'), sinCuenta = 0;
  if(cont) cont.querySelectorAll('.mpago-row').forEach(function(row){
    var cSel = row.querySelector('.'+(prefix||_MPAGO_PREFIX)+'-cuenta'), mInp = row.querySelector('.'+(prefix||_MPAGO_PREFIX)+'-monto');
    if((parseFloat(mInp&&mInp.value)||0)>0 && !(cSel&&cSel.value)) sinCuenta++;
  });
  if(sinCuenta && (parseFloat(costo)||0)>0) return {ok:false, error:'Elige de qué cuenta sale el dinero de la moto'};
  var pagos = _mpagoLeerPagos(prefix);
  var suma = pagos.reduce(function(a,p){return a+p.monto;},0);
  var costoNum = parseFloat(costo)||0;
  if(costoNum<=0) return {ok:true, pagos:pagos}; // sin costo no se exige
  if(pagos.length===0){ return {ok:false, error:'Debes indicar al menos una cuenta o forma de pago para la moto'}; }
  if(Math.abs(suma-costoNum)>0.01){
    return {ok:false, error:'La suma de pagos ($'+suma.toFixed(2)+') no coincide con el costo de la moto ($'+costoNum.toFixed(2)+')'};
  }
  return {ok:true, pagos:pagos};
}
// Crea, para una moto recién creada, los egresos + movimientos de retiro
// asociados al pago (uno por cada cuenta usada). Los egresos llevan
// motoIdRef y los movimientos llevan motoIdRef + conceptoEgreso para
// poder revertirlos en bloque al eliminar la moto.
function _mpagoCrearGastos(motoObj, pagos, opts){
  opts = opts || {};
  if(!motoObj || !Array.isArray(pagos) || !pagos.length) return [];
  var fecha = opts.fecha || hoyLocalISO();
  var hora = new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false});
  var quien = (S.currentUser&&S.currentUser.nombre)||'Admin';
  var conceptoBase = 'Compra de moto · '+(motoObj.modelo||'')+(motoObj.vin?' · VIN '+motoObj.vin:'')+' ('+motoNum(motoObj)+')';
  var creados = [];
  pagos.forEach(function(p, idx){
    // 1) Egreso en Finanzas (categoría inventario)
    // El numero lo da el contador de Firestore, no el maximo en memoria: con dos
    // personas guardando a la vez las dos sacaban el mismo y la segunda borraba el
    // gasto de la primera (punto 30, 22-sep-2026). Quien llama reserva los numeros
    // antes; si no los trae, se cae al calculo de siempre para no romper nada.
    var newEgId;
    if(Array.isArray(opts.ids) && opts.ids[idx] != null){
      newEgId = opts.ids[idx];
    } else {
      newEgId = (S.egresos&&S.egresos.length)
        ? Math.max.apply(null, S.egresos.map(function(x){return x.id;}))+1
        : 1;
      newEgId += idx;
    }
    var newEg = {
      id: newEgId,
      concepto: conceptoBase + (pagos.length>1 ? ' (parte '+(idx+1)+'/'+pagos.length+')' : ''),
      monto: p.monto,
      fecha: fecha,
      categoria: 'inventario',
      forma: p.cuenta,
      notas: opts.notas || '',
      motoIdRef: motoObj.id,
      origenAuto: 'compra_moto',
      eliminado: false
    };
    if(S.egresos) S.egresos.push(newEg);
    if(DB && DB.saveEgreso) DB.saveEgreso(newEg);
    // 2) Movimiento de retiro en cuentas
    var mov = {
      id: 'MOV-MOTO-'+motoObj.id+'-'+idx+'-'+Date.now(),
      tipo: 'retiro',
      tipoOperacion: 'compra_moto',
      concepto: 'Egreso · ' + newEg.concepto,
      monto: p.monto,
      cuentaOrigen: p.cuenta,
      cuentaDestino: null,
      fecha: fecha,
      referencia: opts.notas || '',
      realizadoPor: quien,
      tasaBs: window._tasaBsGlobal||1,
      hora: hora,
      motoIdRef: motoObj.id,
      conceptoEgreso: newEg.id
    };
    if(S.movimientos) S.movimientos.push(mov);
    if(DB && DB.saveMovimiento) DB.saveMovimiento(mov);
    creados.push({egreso:newEg, mov:mov});
  });
  return creados;
}
// Reverso (al eliminar moto): marca como eliminados los egresos y movimientos
// asociados, y opcionalmente devuelve el dinero a las cuentas creando
// movimientos de depósito de reverso.
function _mpagoReversarGastos(motoId, devolver, audit){
  var quien = (audit&&audit.eliminadoPor) || (S.currentUser&&S.currentUser.nombre)||'Admin';
  var fechaAudit = (audit&&audit.eliminadoEn) || new Date().toISOString();
  var razon = (audit&&audit.eliminadoRazon) || '';
  var afectados = 0;
  // 1) Egresos
  (S.egresos||[]).forEach(function(eg){
    if(!eg.eliminado && String(eg.motoIdRef)===String(motoId) && eg.origenAuto==='compra_moto'){
      eg.eliminado = true;
      eg.eliminadoPor = quien;
      eg.eliminadoEn = fechaAudit;
      eg.eliminadoRazon = razon;
      eg.eliminacionReversaCuenta = !!devolver;
      // Marca para que "restaurar moto" reviva SOLO los gastos que anulo este borrado
      // (antes revivia cualquier gasto anulado de esa moto; punto 12, 21-sep-2026)
      eg.anuladoPorMoto = fechaAudit;
      if(DB && DB.saveEgreso) DB.saveEgreso(eg);
      afectados++;
    }
  });
  // 2) Movimientos de la compra: el retiro NO se anula. El saldo de una cuenta no
  //    cuenta lo anulado, asi que anularlo ya devolvia el dinero; sumado al reverso,
  //    volvia dos veces (y con "sin regresar" volvia igual). Punto 3, 18-sep-2026.
  //    Ahora: regresar = un deposito de reverso por cada retiro; sin regresar = nada.
  if(devolver){
    var hora = new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false});
    (S.movimientos||[]).slice().forEach(function(m){
      if(m.eliminado || String(m.motoIdRef)!==String(motoId) || m.tipoOperacion!=='compra_moto' || m.tipo!=='retiro' || m.reversoCreado) return;
      // Si su gasto ya se borro en Finanzas regresando el dinero, ese dinero ya volvio
      var yaVolvio = m.conceptoEgreso!=null && (S.movimientos||[]).some(function(x){
        return !x.eliminado && x.reversoDe==='egreso:'+m.conceptoEgreso;
      });
      if(yaVolvio) return;
      // Si su gasto ya se anulo ANTES eligiendo "sin regresar el dinero", ese dinero se
      // dio por salido: no se devuelve ahora por otra via (revisado el 22-sep-2026).
      var _egDeEste = (S.egresos||[]).find(function(x){ return String(x.id)===String(m.conceptoEgreso); });
      if(_egDeEste && _egDeEste.eliminado && _egDeEste.eliminacionReversaCuenta === false) return;
      var rev = {
        id:'MOV-REV-MOTO-'+motoId+'-'+Date.now()+'-'+Math.floor(Math.random()*1000),
        tipo:'deposito',
        concepto:'Reverso compra de moto eliminada · '+(m.concepto||''),
        monto: parseFloat(m.monto)||0,
        cuentaOrigen:null,
        cuentaDestino: m.cuentaOrigen,
        fecha: hoyLocalISO(),
        referencia:'Reverso por eliminación de moto '+motoNum(motoId),
        realizadoPor: quien,
        tasaBs: window._tasaBsGlobal||1,
        hora: hora,
        reversoDe:'compra_moto:'+motoId
      };
      m.reversoCreado = true;
      if(DB && DB.saveMovimiento) DB.saveMovimiento(m);
      if(S.movimientos) S.movimientos.push(rev);
      if(DB && DB.saveMovimiento) DB.saveMovimiento(rev);
    });
  }
  return afectados;
}
function _mpagoTieneGastos(motoId){
  return (S.egresos||[]).some(function(eg){
    return !eg.eliminado && String(eg.motoIdRef)===String(motoId) && eg.origenAuto==='compra_moto';
  });
}

// ══════════════════════════════════════════
// MOTO CRUD
// ══════════════════════════════════════════
