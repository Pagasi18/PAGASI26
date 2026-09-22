// Logica de alertas, recibos, facturas y libro SENIAT. Extraido mecanicamente de assets/pagasi-app.js.
// ══════════════════════════════════════════════════════════════
// FEATURE 2: RECIBO / COMPROBANTE DE PAGO
// ══════════════════════════════════════════════════════════════
function ofrecerRecibo(pago, cred){
  setMicon('check');
  $('mtt').textContent = 'Pago Registrado';
  $('msb').textContent = 'El pago fue guardado exitosamente';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML =
    '<div style="text-align:center;padding:10px 0 16px">'
    +'<div style="width:56px;height:56px;border-radius:50%;background:var(--greens);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">'
    +'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
    +'</div>'
    +'<div style="font-family:var(--fd);font-weight:900;font-size:26px;color:var(--green)">'+fmt(pago.monto)+'</div>'
    +'<div style="font-size:12px;color:var(--ink3);margin-top:4px">'+cred.cli+' · '+pago.id+'</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-top:2px">'+pago.fecha+(pago.referencia?' · Ref: #'+pago.referencia:'')+'</div>'
    +'<div style="display:flex;gap:8px;justify-content:center;margin-top:18px">'
    +'<button class="btn btn-g btn-sm" onclick="closeM()">Cerrar</button>'
    +'<button class="btn btn-g btn-sm" onclick="closeM();abrirWhatsAppRecibo('+JSON.stringify(pago).replace(/"/g,"&quot;")+')" style="background:#25D366;color:#fff;border:none"> WhatsApp</button>'
    +'<button class="btn btn-p btn-sm" onclick="imprimirRecibo('+JSON.stringify(pago).replace(/"/g,"&quot;")+','+JSON.stringify(cred).replace(/"/g,"&quot;")+')"> Recibo PDF</button>'
    +'</div>'
    +'</div>';
  $('mft').innerHTML = '';
  $('ov').style.display = 'flex';
}

function imprimirRecibo(pago, cred){
  var empresa = ($('cfg_empresa')&&$('cfg_empresa').value) || 'Pagasi';
  var fecha = new Date(pago.fecha+'T12:00:00').toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    +'<title>Recibo '+pago.id+'</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">'
    +'<style>'
    +'*{margin:0;padding:0;box-sizing:border-box;font-family:\'Nunito\',system-ui,Arial,sans-serif}'
    +'body{background:#fff;color:#111;padding:40px}'
    +'.recibo{max-width:420px;margin:auto;border:1px solid #ddd;border-radius:12px;overflow:hidden}'
    +'.header{background:#2563EB;color:#fff;padding:24px;text-align:center}'
    +'.header h1{font-size:22px;font-weight:900;letter-spacing:-0.5px}'
    +'.header p{font-size:12px;opacity:0.85;margin-top:4px}'
    +'.badge{background:rgba(255,255,255,0.2);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;display:inline-block;margin-top:8px}'
    +'.body{padding:24px}'
    +'.monto{text-align:center;background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:20px;margin-bottom:20px}'
    +'.monto .label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#666}'
    +'.monto .valor{font-size:34px;font-weight:900;color:#16a34a;margin-top:4px}'
    +'.row{display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:12px}'
    +'.row .k{color:#888;font-weight:600}'
    +'.row .v{font-weight:700;text-align:right;max-width:55%}'
    +'.footer{background:#f9f9f9;padding:14px;text-align:center;font-size:10px;color:#888;border-top:1px solid #eee}'
    +'@media print{body{padding:0}.recibo{border:none;border-radius:0}}'
    +'</style></head><body>'
    +'<div class="recibo">'
    +'<div class="header">'
    +'<h1>'+empresa+'</h1>'
    +'<p>Comprobante de Pago</p>'
    +'<div class="badge">'+pago.id+'</div>'
    +'</div>'
    +'<div class="body">'
    +'<div class="monto"><div class="label">Monto recibido</div><div class="valor">'+fmt(pago.monto)+'</div></div>'
    +'<div class="row"><span class="k">Cliente</span><span class="v">'+pago.cli+'</span></div>'
    +'<div class="row"><span class="k">Crédito</span><span class="v">'+pago.cred+'</span></div>'
    +'<div class="row"><span class="k">Vehículo</span><span class="v">'+(cred.modelo||'—')+'</span></div>'
    +'<div class="row"><span class="k">Fecha</span><span class="v">'+fecha+'</span></div>'
    +'<div class="row"><span class="k">Método de pago</span><span class="v">'+(pago.metodo||'—')+'</span></div>'
    +(pago.referencia?'<div class="row"><span class="k">Referencia</span><span class="v">#'+pago.referencia+'</span></div>':'')
    +'<div class="row"><span class="k">Cobrador</span><span class="v">'+(pago.cobrador||pago.realizadoPor||'—')+'</span></div>'
    +'<div class="row" style="border:none"><span class="k">Cuotas pagadas</span><span class="v">'+(cred.pagado||'—')+' / '+(cred.totalCuotas||cred.plazo*2||'—')+'</span></div>'
    +'</div>'
    +'<div class="footer">'+empresa+' · Documento generado el '+new Date().toLocaleDateString('es-VE')+' · Conserve este comprobante</div>'
    +'</div>'
    +'<script>window.onload=function(){window.print();}<\/script>'
    +'</body></html>';
  var w = window.open('','_blank','width=520,height=700');
  if(w){ w.document.write(html); w.document.close(); }
}

function abrirWhatsAppRecibo(pago){
  var empresa = ($('cfg_empresa')&&$('cfg_empresa').value) || 'Pagasi';
  var cl = S.clientes.find(function(c){ return c.nombre===pago.cli; })||{};
  var tel = (cl.tel||'').replace(/\D/g,'');
  var texto = ' *Comprobante de Pago — '+empresa+'*\n\n'
    +' *Recibo:* '+pago.id+'\n'
    +' *Cliente:* '+pago.cli+'\n'
    +' *Monto:* '+fmt(pago.monto)+'\n'
    +' *Fecha:* '+pago.fecha+'\n'
    +' *Método:* '+(pago.metodo||'—')+'\n'
    +(pago.referencia?' *Referencia:* #'+pago.referencia+'\n':'')
    +'\n_Gracias por su pago puntual_';
  var url = 'https://wa.me/'+(tel||'')+( tel?'':'')+'?text='+encodeURIComponent(texto);
  window.open(url,'_blank');
}

// ══════════════════════════════════════════════════════════════
// FEATURE 3: DASHBOARD DE COBRANZA POR COBRADOR
// ══════════════════════════════════════════════════════════════
// ╔══════════════════════════════════════════════════════════╗
// ║  FACTURACIÓN SENIAT — Generación de facturas digitales    ║
// ║  Sistema correlativo legal: números inmutables,           ║
// ║  facturas anulables (no eliminables) según SENIAT.        ║
// ╚══════════════════════════════════════════════════════════╝

// Devuelve siguiente número de factura (correlativo, 8 dígitos)
function _facSiguienteNumeroFactura(){
  var maxN = 0;
  (S.facturas||[]).forEach(function(f){
    var n = parseInt(f.numero||'0', 10);
    if(!isNaN(n) && n > maxN) maxN = n;
  });
  return String(maxN + 1).padStart(8, '0');
}

// Devuelve siguiente número de control SENIAT (correlativo, 8 dígitos con prefijo 00-)
function _facSiguienteNumeroControl(){
  var maxN = 0;
  (S.facturas||[]).forEach(function(f){
    var nc = (f.numeroControl||'').replace(/^00-/, '');
    var n = parseInt(nc||'0', 10);
    if(!isNaN(n) && n > maxN) maxN = n;
  });
  return '00-' + String(maxN + 1).padStart(8, '0');
}

// Busca la factura asociada a un pago (si existe y no está anulada)
function _facGetByPagoId(pagoId){
  return (S.facturas||[]).find(function(f){ return f.pagoId === pagoId; });
}

// Helper: convierte número a letras (para factura SENIAT)
function _numeroALetras(num){
  var n = parseFloat(num);
  if(isNaN(n)) return '';
  var entero = Math.floor(n);
  var decimal = Math.round((n - entero) * 100);
  var unidades = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
  var decenas = ['','','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  var centenas = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  function _grupo(num){
    if(num === 0) return '';
    if(num <= 20) return unidades[num];
    if(num < 100){
      var d = Math.floor(num/10), u = num%10;
      if(d === 2) return u === 0 ? 'VEINTE' : 'VEINTI'+unidades[u];
      return decenas[d] + (u ? ' Y '+unidades[u] : '');
    }
    if(num === 100) return 'CIEN';
    if(num < 1000){
      var c = Math.floor(num/100), r = num%100;
      return centenas[c] + (r ? ' '+_grupo(r) : '');
    }
    return num.toString();
  }
  function _miles(num){
    if(num === 0) return 'CERO';
    if(num < 1000) return _grupo(num);
    if(num < 1000000){
      var m = Math.floor(num/1000), r = num%1000;
      var sm = m === 1 ? 'MIL' : _grupo(m)+' MIL';
      return sm + (r ? ' '+_grupo(r) : '');
    }
    if(num < 1000000000){
      var mm = Math.floor(num/1000000), rm = num%1000000;
      var smm = mm === 1 ? 'UN MILLON' : _grupo(mm)+' MILLONES';
      return smm + (rm ? ' '+_miles(rm) : '');
    }
    return num.toString();
  }
  return _miles(entero) + ' CON ' + String(decimal).padStart(2,'0') + '/100 DOLARES';
}

// Modal: ver detalle de un pago (con opción de generar factura)
function abrirDetallePago(pagoId){
  var p = (S.pagos||[]).find(function(x){ return x.id === pagoId; });
  if(!p){ toast('Pago no encontrado','error'); return; }
  var cred = (S.creds||[]).find(function(x){ return x.id === p.cred; });
  var fac = _facGetByPagoId(p.id);
  setMicon('pago');
  $('mtt').textContent = 'Detalle del Pago';
  $('msb').textContent = p.id;
  $('modal-box').className = 'modal';
  var estadoLabel = p.estado || 'confirmado';
  var estadoColor = estadoLabel==='confirmado' ? 'var(--green)' : (estadoLabel==='pendiente' ? 'var(--amber)' : 'var(--red)');
  var facBlock = '';
  if(fac){
    var facColor = fac.anulada ? 'var(--red)' : 'var(--green)';
    var facLabel = fac.anulada ? 'ANULADA' : 'EMITIDA';
    facBlock = '<div style="margin-top:14px;padding:12px;background:rgba(0,184,118,0.08);border:1px solid rgba(0,184,118,0.25);border-radius:9px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      + '<div style="font-size:11px;color:var(--ink3);font-weight:700;letter-spacing:.5px">FACTURA ASOCIADA</div>'
      + '<span class="bdg" style="background:'+facColor+';color:#fff;font-size:9px;padding:2px 7px;border-radius:4px">'+facLabel+'</span>'
      + '</div>'
      + '<div style="font-family:var(--fd);font-weight:800;font-size:15px">N° '+fac.numero+'</div>'
      + '<div style="font-size:11px;color:var(--ink3)">Control SENIAT: '+fac.numeroControl+'</div>'
      + '<div style="font-size:11px;color:var(--ink3);margin-top:3px">Emitida: '+fmtFechaHora(fac.fechaEmision)+'</div>'
      + (fac.anulada ? '<div style="font-size:11px;color:var(--red);margin-top:5px">Anulada: '+fmtFechaHora(fac.fechaAnulacion)+'<br>Razón: '+(fac.razonAnulacion||'—')+'</div>' : '')
      + '</div>';
  }
  $('mbd').innerHTML =
    '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Cliente</label><div style="font-weight:700;font-size:14px;padding:6px 0">'+(p.cli||'—')+'</div></div>'
    + '<div class="fg"><label>Crédito</label><div style="font-family:var(--fd);font-size:13px;padding:6px 0">'+(p.cred||'—')+(cred?' — '+cred.modelo:'')+'</div></div>'
    + '</div>'
    + '<div class="fgr" style="margin-top:10px;gap:10px">'
    + '<div class="fg"><label>Fecha</label><div style="font-family:var(--fd);font-size:13px;padding:6px 0">'+(p.fecha||'—')+'</div></div>'
    + '<div class="fg"><label>Monto</label><div style="font-family:var(--fd);font-weight:800;font-size:18px;color:var(--green);padding:6px 0">'+fmt(p.monto||0)+'</div></div>'
    + '<div class="fg"><label>Recibido en</label><div style="font-size:13px;padding:6px 0">'+(p.metodo||'—')+'</div></div>'
    + '<div class="fg"><label>Cobrador</label><div style="font-size:13px;padding:6px 0">'+(p.cobrador||'—')+'</div></div>'
    + '<div class="fg"><label>Estado</label><div style="padding:6px 0"><span class="bdg" style="background:'+estadoColor+';color:#fff;font-size:10px;padding:3px 9px;border-radius:5px;text-transform:uppercase;font-weight:700">'+estadoLabel+'</span></div></div>'
    + (p.referencia ? '<div class="fg"><label>Referencia</label><div style="font-family:var(--fd);font-size:12px;padding:6px 0">'+p.referencia+'</div></div>' : '')
    + '</div>'
    + facBlock;
  // Footer: depende si tiene factura o no
  var ftHtml = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>';
  if(p.estado === 'confirmado'){
    if(fac && !fac.anulada){
      ftHtml += '<button class="btn btn-p" onclick="abrirVerFactura(\''+fac.id+'\')">Ver Factura</button>';
    } else if(!fac){
      ftHtml += '<button class="btn btn-p" onclick="abrirGenerarFactura(\''+p.id+'\')">Generar Factura</button>';
    } else {
      ftHtml += '<button class="btn btn-d" disabled style="opacity:.6">Factura Anulada</button>';
    }
  }
  $('mft').innerHTML = ftHtml;
  $('ov').style.display = 'flex';
}

// Devuelve el texto de la(s) cuota(s) que cubre un pago, leyendo el ledger del crédito.
// SOLO LECTURA — no modifica ningún cálculo. Distingue cuotas completas de abonos parciales.
// Ej: "cuota 3/24" · "cuotas 3 a 5/24" · "cuota 3 y abono a la 4/24" · "abono a cuota 3/24".
function _facCuotasDePago(p, cred){
  if(!p || !cred || !Array.isArray(cred.pagosRegistrados)) return '';
  var led = cred.pagosRegistrados;
  var nums = led
    .filter(function(h){ return h && h.pagoId === p.id; })
    .map(function(h){ return parseInt(h.cuota, 10); })
    .filter(function(n){ return n > 0; });
  if(!nums.length) return '';
  nums.sort(function(a, b){ return a - b; });
  var min = nums[0], max = nums[nums.length - 1];
  var total = (typeof getCreditoTotalCuotas === 'function')
    ? getCreditoTotalCuotas(cred)
    : (parseInt(cred.totalCuotas, 10) || 0);
  var cuotaBase = (typeof getCreditoCuotaBase === 'function')
    ? getCreditoCuotaBase(cred)
    : (parseFloat(cred.cuotaQ || cred.cuota || 0) || 0);
  var sufijo = total > 0 ? ('/' + total) : '';
  // ¿La última cuota tocada quedó cubierta al 100% o sólo es un abono parcial?
  function pagadoEnCuota(n){
    return led.filter(function(h){ return parseInt(h.cuota, 10) === n; })
              .reduce(function(a, h){ return a + (parseFloat(h.montoPagado) || 0); }, 0);
  }
  var ultParcial = cuotaBase > 0 && (pagadoEnCuota(max) < cuotaBase - 0.01);
  if(min === max){
    return (ultParcial ? 'abono a cuota ' : 'cuota ') + min + sufijo;
  }
  if(ultParcial){
    // de min..(max-1) completas + abono a la última
    return (min === max - 1 ? 'cuota ' + min : 'cuotas ' + min + ' a ' + (max - 1))
      + ' y abono a la ' + max + sufijo;
  }
  return 'cuotas ' + min + ' a ' + max + sufijo;
}

// Modal: generar factura para un pago
function abrirGenerarFactura(pagoId){
  var p = (S.pagos||[]).find(function(x){ return x.id === pagoId; });
  if(!p){ toast('Pago no encontrado','error'); return; }
  if(_facGetByPagoId(p.id)){ toast('Este pago ya tiene factura emitida','warning'); return; }
  var cred = (S.creds||[]).find(function(x){ return x.id === p.cred; });
  // Buscar el cliente para autocompletar sus datos en la factura.
  // 1) por el clienteId/cliId guardado en el crédito (lo más confiable);
  // 2) si no, por nombre (sin distinguir mayúsculas ni espacios sobrantes).
  var _cliRef = cred && (cred.clienteId || cred.cliId);
  var cliente = (_cliRef!=null && String(_cliRef)!=='')
    ? (S.clientes||[]).find(function(x){ return String(x.id) === String(_cliRef); })
    : null;
  if(!cliente){
    var _nm = String(p.cli||'').trim().toLowerCase();
    cliente = (S.clientes||[]).find(function(x){ return String(x.nombre||'').trim().toLowerCase() === _nm; });
  }
  var emp = getEmpresa();
  var nextNum = _facSiguienteNumeroFactura();
  var nextCtrl = _facSiguienteNumeroControl();
  setMicon('factura');
  $('mtt').textContent='Generar Factura';
  $('msb').textContent='Pago '+p.id;
  $('modal-box').className='modal';
  $('mbd').innerHTML =
    '<div style="background:rgba(74,107,255,0.08);border:1px solid rgba(74,107,255,0.25);border-radius:9px;padding:11px;margin-bottom:14px;font-size:11.5px;color:var(--ink2)">'
    + '<strong style="color:var(--p1)">⚠ Importante:</strong> Una vez creada, la factura será inmutable. Solo podrá ser anulada (no eliminada) según las normas SENIAT.'
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--ink3);font-weight:700;letter-spacing:.5px;margin-bottom:8px">NÚMEROS LEGALES</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>N° de Factura</label><input class="fi" id="fac_numero" value="'+nextNum+'" style="font-family:var(--fd);font-weight:700"></div>'
    + '<div class="fg"><label>N° de Control SENIAT</label><input class="fi" id="fac_control" value="'+nextCtrl+'" style="font-family:var(--fd);font-weight:700"></div>'
    + '<div class="fg"><label>Fecha de Emisión</label><input class="fi" id="fac_fecha" type="date" value="'+(hoyLocalISO())+'"></div>'
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--ink3);font-weight:700;letter-spacing:.5px;margin:14px 0 8px">DATOS DEL EMISOR (EMPRESA)</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Razón Social</label><div style="font-weight:700;font-size:13px;padding:6px 0">'+(emp.nombre||'—')+'</div></div>'
    + '<div class="fg"><label>RIF</label><div style="font-family:var(--fd);font-weight:700;font-size:13px;padding:6px 0">'+(emp.rif||'—')+'</div></div>'
    + '<div class="fg" style="grid-column:1/-1"><label>Dirección Fiscal</label><div style="font-size:12px;padding:6px 0">'+(emp.direccion||emp.ciudad||'—')+'</div></div>'
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--ink3);font-weight:700;letter-spacing:.5px;margin:14px 0 8px">DATOS DEL CLIENTE</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Nombre / Razón Social</label><input class="fi" id="fac_cli_nom" value="'+(p.cli||(cliente&&cliente.nombre)||'')+'"></div>'
    + '<div class="fg"><label>C.I. / RIF</label><input class="fi" id="fac_cli_ci" value="'+((cliente&&(cliente.cedula||cliente.rif))||'')+'"></div>'
    + '<div class="fg"><label>Teléfono</label><input class="fi" id="fac_cli_tel" value="'+((cliente&&(cliente.tel||cliente.wa))||'')+'"></div>'
    + '<div class="fg" style="grid-column:1/-1"><label>Dirección</label><input class="fi" id="fac_cli_dir" value="'+((cliente&&(cliente.dir||cliente.ciudad))||'')+'"></div>'
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--ink3);font-weight:700;letter-spacing:.5px;margin:14px 0 8px">DETALLE DE LA OPERACIÓN</div>'
    + '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Concepto / Descripción</label><textarea class="fi" id="fac_concepto" rows="2" style="resize:vertical">Pago de '+(_facCuotasDePago(p,cred)||'cuota')+' — Crédito '+(p.cred||'')+(cred?' / '+cred.modelo:'')+'</textarea></div>'
    + '</div>'
    + '<div style="margin-top:10px;border-top:1px solid var(--rim);padding-top:10px">'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0">'
    +     '<span style="font-size:12px;color:var(--ink3);font-weight:700">Base imponible (Subtotal)</span>'
    +     '<span id="fac_sub_disp" style="font-family:var(--fd);font-weight:700;font-size:13.5px">'+fmt(p.monto||0)+'</span>'
    +   '</div>'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;gap:10px">'
    +     '<div style="display:flex;align-items:center;gap:9px">'
    +       '<button type="button" class="tgl on" id="fac_iva_tgl" onclick="this.classList.toggle(\'on\');_facRecalcImpuestos()"></button>'
    +       '<span style="font-size:12.5px;font-weight:700">IVA <span id="fac_iva_rate" style="color:var(--ink3);font-weight:600"></span></span>'
    +       '<span id="fac_iva_lbl" style="font-size:10px;font-weight:800;color:var(--green)">Aplica</span>'
    +     '</div>'
    +     '<span id="fac_iva_disp" style="font-family:var(--fd);font-weight:700;font-size:13.5px">$0.00</span>'
    +   '</div>'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;gap:10px">'
    +     '<div style="display:flex;align-items:center;gap:9px">'
    +       '<button type="button" class="tgl" id="fac_igtf_tgl" onclick="this.classList.toggle(\'on\');_facRecalcImpuestos()"></button>'
    +       '<span style="font-size:12.5px;font-weight:700">IGTF <span id="fac_igtf_rate" style="color:var(--ink3);font-weight:600"></span></span>'
    +       '<span id="fac_igtf_lbl" style="font-size:10px;font-weight:800;color:var(--ink3)">No aplica</span>'
    +     '</div>'
    +     '<span id="fac_igtf_disp" style="font-family:var(--fd);font-weight:700;font-size:13.5px">$0.00</span>'
    +   '</div>'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0 2px;border-top:2px solid var(--ln);margin-top:6px">'
    +     '<span style="color:var(--green);font-weight:800;font-size:14px">TOTAL</span>'
    +     '<span id="fac_total_disp" style="font-family:var(--fd);font-weight:900;font-size:18px;color:var(--green)">'+fmt(p.monto||0)+'</span>'
    +   '</div>'
    +   '<input type="hidden" id="fac_monto_base" value="'+(p.monto||0)+'">'
    + '</div>';
  $('mft').innerHTML =
    '<button class="btn btn-g" onclick="abrirDetallePago(\''+p.id+'\')">Cancelar</button>'
    + '<button class="btn btn-p" onclick="crearFactura(\''+p.id+'\')">Crear Factura</button>';
  $('ov').style.display='flex';
  if(typeof _facRecalcImpuestos==='function') _facRecalcImpuestos();
}

// Tasas de IVA / IGTF tomadas de la config fiscal del sistema (con respaldo 16% / 3%).
function _facImpRates(){
  var iv = (typeof _libroSeniatCfg!=='undefined') ? parseFloat(_libroSeniatCfg.ivaAlicuota) : NaN;
  var ig = (typeof _libroSeniatCfg!=='undefined') ? parseFloat(_libroSeniatCfg.igtfAlicuota) : NaN;
  return { iva: (iv>0?iv:16), igtf: (ig>0?ig:3) };
}
// Desglose de impuestos para la factura. Misma convención que el sistema:
// El monto pagado es SIEMPRE el TOTAL final (lo que entregó el cliente).
// Tanto el IVA como el IGTF se extraen "por dentro": total = base × (1+IVA) × (1+IGTF).
// SOLO LECTURA — no toca créditos, pagos ni cuotas.
function _facCalcImpuestos(monto, ivaOn, igtfOn){
  monto = parseFloat(monto)||0;            // = TOTAL pagado
  var r = _facImpRates();
  var aliv   = ivaOn  ? (r.iva/100)  : 0;
  var aligtf = igtfOn ? (r.igtf/100) : 0;
  var base = monto / ((1+aliv) * (1+aligtf));
  var iva  = base * aliv;
  var igtf = (base + iva) * aligtf;
  return { base: base, iva: iva, igtf: igtf, total: monto, ivaRate: r.iva, igtfRate: r.igtf };
}
// Recalcula y refresca lo que se ve en el formulario al mover los toggles.
function _facRecalcImpuestos(){
  if(typeof $!=='function') return;
  var mEl = $('fac_monto_base'); if(!mEl) return;
  var monto = parseFloat(mEl.value)||0;
  var ivaOn  = $('fac_iva_tgl')  ? $('fac_iva_tgl').classList.contains('on')  : true;
  var igtfOn = $('fac_igtf_tgl') ? $('fac_igtf_tgl').classList.contains('on') : false;
  var d = _facCalcImpuestos(monto, ivaOn, igtfOn);
  if($('fac_iva_rate'))   $('fac_iva_rate').textContent   = '('+d.ivaRate+'%)';
  if($('fac_igtf_rate'))  $('fac_igtf_rate').textContent  = '('+d.igtfRate+'%)';
  if($('fac_sub_disp'))   $('fac_sub_disp').textContent   = fmt(d.base);
  if($('fac_iva_disp'))   $('fac_iva_disp').textContent   = fmt(d.iva);
  if($('fac_igtf_disp'))  $('fac_igtf_disp').textContent  = fmt(d.igtf);
  if($('fac_total_disp')) $('fac_total_disp').textContent = fmt(d.total);
  if($('fac_iva_lbl')){  $('fac_iva_lbl').textContent  = ivaOn?'Aplica':'No aplica';  $('fac_iva_lbl').style.color  = ivaOn?'var(--green)':'var(--ink3)'; }
  if($('fac_igtf_lbl')){ $('fac_igtf_lbl').textContent = igtfOn?'Aplica':'No aplica'; $('fac_igtf_lbl').style.color = igtfOn?'var(--green)':'var(--ink3)'; }
}

// Crea la factura (luego de revisar el form)
function crearFactura(pagoId){
  var p = (S.pagos||[]).find(function(x){ return x.id === pagoId; });
  if(!p){ toast('Pago no encontrado','error'); return; }
  var numero = ($('fac_numero')&&$('fac_numero').value||'').trim();
  var control = ($('fac_control')&&$('fac_control').value||'').trim();
  if(!numero){ toast('El N° de factura es obligatorio','error'); return; }
  if(!control){ toast('El N° de control SENIAT es obligatorio','error'); return; }
  // Validar que el número no esté ya usado
  var dupN = (S.facturas||[]).find(function(f){ return f.numero === numero; });
  if(dupN){ toast('El N° '+numero+' ya está usado en otra factura','error'); return; }
  var dupC = (S.facturas||[]).find(function(f){ return f.numeroControl === control; });
  if(dupC){ toast('El N° de control '+control+' ya está usado','error'); return; }
  var emp = getEmpresa();
  // Leer interruptores de IVA / IGTF del formulario y calcular el desglose
  var _ivaOn  = $('fac_iva_tgl')  ? $('fac_iva_tgl').classList.contains('on')  : true;
  var _igtfOn = $('fac_igtf_tgl') ? $('fac_igtf_tgl').classList.contains('on') : false;
  var _imp = _facCalcImpuestos(p.monto||0, _ivaOn, _igtfOn);
  var fac = {
    id: 'FAC-'+Date.now(),
    numero: numero,
    numeroControl: control,
    pagoId: p.id,
    fechaEmision: ($('fac_fecha')&&$('fac_fecha').value)||hoyLocalISO(),
    fechaCreacion: new Date().toISOString(),
    creadoPor: (S.currentUser&&S.currentUser.nombre)||'Admin',
    creadoPorUid: (S.currentUser&&S.currentUser.uid)||'',
    // Snapshot del emisor
    emisor: {
      nombre: emp.nombre, rif: emp.rif, direccion: emp.direccion||emp.ciudad,
      ciudad: emp.ciudad, tel: emp.tel, email: emp.email
    },
    // Snapshot del cliente
    cliente: {
      nombre: ($('fac_cli_nom')&&$('fac_cli_nom').value)||p.cli||'',
      ci: ($('fac_cli_ci')&&$('fac_cli_ci').value)||'',
      tel: ($('fac_cli_tel')&&$('fac_cli_tel').value)||'',
      direccion: ($('fac_cli_dir')&&$('fac_cli_dir').value)||''
    },
    concepto: ($('fac_concepto')&&$('fac_concepto').value)||'Pago de cuota',
    subtotal: _imp.base,
    iva: _imp.iva,
    igtf: _imp.igtf,
    ivaAplica: _ivaOn,
    igtfAplica: _igtfOn,
    ivaRate: _imp.ivaRate,
    igtfRate: _imp.igtfRate,
    total: _imp.total,
    metodo: p.metodo||'',
    referencia: p.referencia||'',
    anulada: false
  };
  S.facturas.push(fac);
  DB.saveFactura(fac);
  toast('Factura '+fac.numero+' emitida ✓','success');
  abrirVerFactura(fac.id);
}

// Modal: ver factura ya emitida
function abrirVerFactura(facId){
  var fac = (S.facturas||[]).find(function(x){ return x.id === facId; });
  if(!fac){ toast('Factura no encontrada','error'); return; }
  setMicon('factura');
  $('mtt').textContent='Factura '+fac.numero;
  $('msb').textContent='Control: '+fac.numeroControl;
  $('modal-box').className='modal';
  var anuladaBlock = fac.anulada
    ? '<div style="background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.35);border-radius:9px;padding:11px;margin-bottom:12px"><div style="color:var(--red);font-weight:800;font-size:13px;margin-bottom:4px"> FACTURA ANULADA</div><div style="font-size:11.5px;color:var(--ink2)">Anulada: '+fmtFechaHora(fac.fechaAnulacion)+' por '+(fac.anuladaPor||'—')+'</div><div style="font-size:11.5px;color:var(--ink2);margin-top:3px">Razón: '+(fac.razonAnulacion||'—')+'</div></div>'
    : '';
  $('mbd').innerHTML =
    anuladaBlock
    + '<div style="background:var(--surf);padding:14px;border-radius:9px;margin-bottom:12px">'
    + '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:14px">'
    + '<div><div style="font-size:13px;color:var(--ink3);font-weight:700;letter-spacing:.5px">FACTURA</div>'
    + '<div style="font-family:var(--fd);font-weight:800;font-size:22px;color:var(--p1)">N° '+fac.numero+'</div>'
    + '<div style="font-size:11px;color:var(--ink3);margin-top:2px">Control SENIAT: '+fac.numeroControl+'</div></div>'
    + '<div style="text-align:right">'
    + '<div style="font-weight:800;font-size:14px">'+(fac.emisor&&fac.emisor.nombre||'—')+'</div>'
    + '<div style="font-family:var(--fd);font-size:11px;color:var(--ink2)">'+(fac.emisor&&fac.emisor.rif||'—')+'</div>'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px">'+(fac.emisor&&fac.emisor.direccion||'')+'</div>'
    + (fac.emisor&&fac.emisor.tel?'<div style="font-size:10.5px;color:var(--ink3)">Tel: '+fac.emisor.tel+'</div>':'')
    + '</div></div>'
    + '<hr style="border:none;border-top:1px dashed var(--ln);margin:10px 0">'
    + '<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:10px">'
    + '<div style="flex:1"><div style="font-size:10px;color:var(--ink3);font-weight:700;letter-spacing:.5px">FACTURAR A</div>'
    + '<div style="font-weight:700;font-size:13px;margin-top:2px">'+(fac.cliente&&fac.cliente.nombre||'—')+'</div>'
    + (fac.cliente&&fac.cliente.ci?'<div style="font-family:var(--fd);font-size:11px;color:var(--ink2)">C.I./RIF: '+fac.cliente.ci+'</div>':'')
    + (fac.cliente&&fac.cliente.tel?'<div style="font-size:11px;color:var(--ink2)">Tel: '+fac.cliente.tel+'</div>':'')
    + (fac.cliente&&fac.cliente.direccion?'<div style="font-size:11px;color:var(--ink2)">'+fac.cliente.direccion+'</div>':'')
    + '</div>'
    + '<div style="text-align:right"><div style="font-size:10px;color:var(--ink3);font-weight:700;letter-spacing:.5px">FECHA</div>'
    + '<div style="font-family:var(--fd);font-weight:700;font-size:13px;margin-top:2px">'+fmtFecha(fac.fechaEmision)+'</div></div>'
    + '</div>'
    + '<hr style="border:none;border-top:1px dashed var(--ln);margin:10px 0">'
    + '<div style="margin:10px 0"><div style="font-size:10px;color:var(--ink3);font-weight:700;letter-spacing:.5px;margin-bottom:5px">CONCEPTO</div>'
    + '<div style="font-size:13px;line-height:1.5">'+fac.concepto+'</div></div>'
    + '<hr style="border:none;border-top:1px dashed var(--ln);margin:10px 0">'
    + '<div style="display:flex;justify-content:flex-end;margin-top:10px">'
    + '<div style="min-width:240px">'
    + '<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0"><span>Subtotal:</span><span style="font-family:var(--fd)">'+fmt(fac.subtotal)+'</span></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--ink3)"><span>IVA '+(fac.ivaAplica?('('+(fac.ivaRate||16)+'%)'):'(no aplica)')+':</span><span style="font-family:var(--fd)">'+fmt(fac.iva||0)+'</span></div>'
    + ((fac.igtfAplica||((fac.igtf||0)>0))?'<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--ink3)"><span>IGTF ('+(fac.igtfRate||3)+'%):</span><span style="font-family:var(--fd)">'+fmt(fac.igtf||0)+'</span></div>':'')
    + '<div style="display:flex;justify-content:space-between;font-size:15px;padding:6px 0;font-weight:800;border-top:2px solid var(--ln);margin-top:5px"><span>TOTAL:</span><span style="font-family:var(--fd);color:var(--green)">'+fmt(fac.total)+'</span></div>'
    + '</div></div>'
    + '<div style="font-size:10px;color:var(--ink3);text-align:center;margin-top:14px;padding-top:10px;border-top:1px dashed var(--ln);font-style:italic">Son: '+_numeroALetras(fac.total)+'</div>'
    + '<div style="font-size:9.5px;color:var(--ink3);text-align:center;margin-top:5px">Emitida el '+fmtFechaHora(fac.fechaCreacion)+' · Método: '+(fac.metodo||'—')+(fac.referencia?' · Ref: '+fac.referencia:'')+'</div>'
    + '</div>';
  var ftHtml = '<button class="btn btn-g" onclick="abrirDetallePago(\''+fac.pagoId+'\')">← Volver al pago</button>';
  if(!fac.anulada){
    ftHtml += '<button class="btn btn-s" onclick="abrirImprimirFactura(\''+fac.id+'\')"> Imprimir</button>';
    ftHtml += '<button class="btn btn-d" onclick="abrirAnularFactura(\''+fac.id+'\')">Anular</button>';
  } else {
    ftHtml += '<button class="btn btn-s" onclick="abrirImprimirFactura(\''+fac.id+'\')"> Imprimir copia</button>';
  }
  $('mft').innerHTML = ftHtml;
  $('ov').style.display='flex';
}

// Modal: elegir formato de impresión
function abrirImprimirFactura(facId){
  var fac = (S.facturas||[]).find(function(x){ return x.id === facId; });
  if(!fac){ toast('Factura no encontrada','error'); return; }
  setMicon('imprimir');
  $('mtt').textContent='Imprimir Factura';
  $('msb').textContent='N° '+fac.numero;
  $('modal-box').className='modal';
  $('mbd').innerHTML =
    '<div style="font-size:12.5px;color:var(--ink2);margin-bottom:14px">Selecciona el formato de impresión:</div>'
    + '<div style="display:grid;gap:10px">'
    + '<button class="btn btn-p" style="padding:14px;text-align:left;display:flex;align-items:center;gap:12px" onclick="imprimirFactura(\''+fac.id+'\',\'carta\')">'
    + '<span style="font-family:var(--fd);font-weight:800;font-size:18px;width:60px;text-align:center"></span>'
    + '<span><div style="font-weight:700;font-size:13.5px">Carta (8.5\" x 11\")</div><div style="font-size:11px;color:rgba(255,255,255,.85);font-weight:400">Impresora estándar — Hoja completa</div></span>'
    + '</button>'
    + '<button class="btn btn-p" style="padding:14px;text-align:left;display:flex;align-items:center;gap:12px" onclick="imprimirFactura(\''+fac.id+'\',\'media\')">'
    + '<span style="font-family:var(--fd);font-weight:800;font-size:18px;width:60px;text-align:center"></span>'
    + '<span><div style="font-weight:700;font-size:13.5px">Media Carta (8.5\" x 5.5\")</div><div style="font-size:11px;color:rgba(255,255,255,.85);font-weight:400">2 facturas por hoja — Ahorro de papel</div></span>'
    + '</button>'
    + '<button class="btn btn-p" style="padding:14px;text-align:left;display:flex;align-items:center;gap:12px" onclick="imprimirFactura(\''+fac.id+'\',\'ticket\')">'
    + '<span style="font-family:var(--fd);font-weight:800;font-size:18px;width:60px;text-align:center"></span>'
    + '<span><div style="font-weight:700;font-size:13.5px">Ticket 80mm</div><div style="font-size:11px;color:rgba(255,255,255,.85);font-weight:400">Impresora térmica — Comprobante rápido</div></span>'
    + '</button>'
    + '</div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="abrirVerFactura(\''+fac.id+'\')">← Volver</button>';
  $('ov').style.display='flex';
}

// Genera HTML imprimible y abre ventana de impresión
function imprimirFactura(facId, formato){
  var fac = (S.facturas||[]).find(function(x){ return x.id === facId; });
  if(!fac){ toast('Factura no encontrada','error'); return; }
  var tasaBs = window._tasaBsGlobal || 0;
  var totalBs = tasaBs ? (fac.total * tasaBs).toFixed(2) : '';
  var anuladaWatermark = fac.anulada
    ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;color:rgba(255,0,0,.18);font-weight:900;letter-spacing:8px;pointer-events:none;z-index:9999;white-space:nowrap">ANULADA</div>'
    : '';
  var pageSize, bodyMaxWidth, bodyPadding, fontSize, fontTitle, headSize, marginTop;
  if(formato === 'carta'){
    pageSize = 'Letter';
    bodyMaxWidth = '7.5in'; bodyPadding = '0.5in';
    fontSize = '12px'; fontTitle = '24px'; headSize = '14px'; marginTop = '0';
  } else if(formato === 'media'){
    pageSize = '8.5in 5.5in';
    bodyMaxWidth = '7.5in'; bodyPadding = '0.4in 0.5in';
    fontSize = '11px'; fontTitle = '20px'; headSize = '12px'; marginTop = '0';
  } else { // ticket
    pageSize = '80mm auto';
    bodyMaxWidth = '72mm'; bodyPadding = '4mm';
    fontSize = '10px'; fontTitle = '14px'; headSize = '11px'; marginTop = '0';
  }
  var contenidoFactura = '';
  if(formato === 'ticket'){
    // Diseño compacto monoespaciado para ticket
    contenidoFactura =
      '<div style="text-align:center;margin-bottom:6mm">'
      + '<div style="font-weight:900;font-size:'+fontTitle+';margin-bottom:1mm">'+fac.emisor.nombre+'</div>'
      + '<div style="font-size:9px">RIF: '+fac.emisor.rif+'</div>'
      + (fac.emisor.direccion ? '<div style="font-size:9px">'+fac.emisor.direccion+'</div>' : '')
      + (fac.emisor.tel ? '<div style="font-size:9px">Tel: '+fac.emisor.tel+'</div>' : '')
      + '</div>'
      + '<div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:2mm 0;text-align:center;margin-bottom:3mm">'
      + '<div style="font-weight:900;font-size:12px">FACTURA</div>'
      + '<div style="font-size:11px;font-weight:700">N° '+fac.numero+'</div>'
      + '<div style="font-size:9px">Control: '+fac.numeroControl+'</div>'
      + '</div>'
      + '<div style="font-size:9.5px;line-height:1.5;margin-bottom:3mm">'
      + '<div><strong>Fecha:</strong> '+fmtFecha(fac.fechaEmision)+'</div>'
      + '<div><strong>Cliente:</strong> '+fac.cliente.nombre+'</div>'
      + (fac.cliente.ci ? '<div><strong>C.I./RIF:</strong> '+fac.cliente.ci+'</div>' : '')
      + (fac.cliente.tel ? '<div><strong>Tel:</strong> '+fac.cliente.tel+'</div>' : '')
      + '</div>'
      + '<div style="border-top:1px dashed #000;padding-top:2mm;margin-bottom:3mm;font-size:10px">'+fac.concepto+'</div>'
      + '<div style="border-top:1px dashed #000;padding-top:2mm;font-size:10px">'
      + '<div style="display:flex;justify-content:space-between"><span>Subtotal:</span><span>$'+parseFloat(fac.subtotal).toFixed(2)+'</span></div>'
      + '<div style="display:flex;justify-content:space-between;color:#666"><span>IVA '+(fac.ivaAplica?('('+(fac.ivaRate||16)+'%)'):'(no aplica)')+':</span><span>$'+parseFloat(fac.iva||0).toFixed(2)+'</span></div>'
      + ((fac.igtfAplica||((fac.igtf||0)>0))?'<div style="display:flex;justify-content:space-between;color:#666"><span>IGTF ('+(fac.igtfRate||3)+'%):</span><span>$'+parseFloat(fac.igtf||0).toFixed(2)+'</span></div>':'')
      + '<div style="display:flex;justify-content:space-between;font-weight:900;font-size:12px;border-top:1px solid #000;padding-top:1mm;margin-top:1mm"><span>TOTAL:</span><span>$'+parseFloat(fac.total).toFixed(2)+'</span></div>'
      + (totalBs ? '<div style="display:flex;justify-content:space-between;font-size:9px;color:#666"><span>Total Bs:</span><span>'+totalBs+'</span></div>' : '')
      + '</div>'
      + '<div style="text-align:center;font-size:8.5px;margin-top:4mm;font-style:italic">Son: '+_numeroALetras(fac.total)+'</div>'
      + '<div style="text-align:center;font-size:8.5px;margin-top:2mm;color:#666">'+fmtFechaHora(fac.fechaCreacion)+'</div>'
      + '<div style="text-align:center;font-size:8px;margin-top:3mm">¡Gracias por su pago!</div>';
  } else {
    // Carta o Media: formato profesional
    contenidoFactura =
      '<table style="width:100%;border-collapse:collapse;margin-bottom:'+ (formato==='media'?'8px':'14px') +'">'
      + '<tr><td style="vertical-align:top">'
      + '<div style="font-weight:900;font-size:'+fontTitle+';color:#1a1a1a;margin-bottom:3px">'+fac.emisor.nombre+'</div>'
      + '<div style="font-size:'+fontSize+'"><strong>RIF:</strong> '+fac.emisor.rif+'</div>'
      + (fac.emisor.direccion ? '<div style="font-size:'+fontSize+'">'+fac.emisor.direccion+'</div>' : '')
      + (fac.emisor.tel ? '<div style="font-size:'+fontSize+'">Tel: '+fac.emisor.tel+'</div>' : '')
      + (fac.emisor.email ? '<div style="font-size:'+fontSize+'">'+fac.emisor.email+'</div>' : '')
      + '</td><td style="vertical-align:top;text-align:right">'
      + '<div style="border:2px solid #1a1a1a;padding:8px 14px;display:inline-block">'
      + '<div style="font-weight:900;font-size:'+headSize+';letter-spacing:1px">FACTURA</div>'
      + '<div style="font-family:monospace;font-weight:700;font-size:'+headSize+';margin-top:2px">N° '+fac.numero+'</div>'
      + '<div style="font-family:monospace;font-size:'+fontSize+';margin-top:2px">Control: '+fac.numeroControl+'</div>'
      + '</div>'
      + '</td></tr></table>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:'+ (formato==='media'?'8px':'14px') +';font-size:'+fontSize+'">'
      + '<tr><td style="vertical-align:top;padding-right:12px;width:60%">'
      + '<div style="font-weight:700;color:#666;font-size:9px;letter-spacing:.5px;margin-bottom:3px">FACTURAR A:</div>'
      + '<div style="font-weight:700;font-size:'+headSize+'">'+fac.cliente.nombre+'</div>'
      + (fac.cliente.ci ? '<div>C.I./RIF: '+fac.cliente.ci+'</div>' : '')
      + (fac.cliente.tel ? '<div>Tel: '+fac.cliente.tel+'</div>' : '')
      + (fac.cliente.direccion ? '<div>'+fac.cliente.direccion+'</div>' : '')
      + '</td><td style="vertical-align:top;text-align:right">'
      + '<div style="font-weight:700;color:#666;font-size:9px;letter-spacing:.5px;margin-bottom:3px">FECHA DE EMISIÓN</div>'
      + '<div style="font-weight:700;font-size:'+headSize+'">'+fmtFecha(fac.fechaEmision)+'</div>'
      + '</td></tr></table>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:'+ (formato==='media'?'8px':'14px') +';font-size:'+fontSize+'">'
      + '<thead><tr style="background:#f0f0f0"><th style="text-align:left;padding:8px;border:1px solid #ccc">CONCEPTO / DESCRIPCIÓN</th><th style="text-align:right;padding:8px;border:1px solid #ccc;width:120px">MONTO</th></tr></thead>'
      + '<tbody><tr><td style="padding:10px;border:1px solid #ccc;vertical-align:top">'+fac.concepto+'</td><td style="padding:10px;border:1px solid #ccc;text-align:right;font-family:monospace;font-weight:700">$'+parseFloat(fac.total).toFixed(2)+'</td></tr></tbody>'
      + '</table>'
      + '<table style="width:100%;border-collapse:collapse;font-size:'+fontSize+'">'
      + '<tr><td style="vertical-align:top;padding-right:12px;font-style:italic;color:#555">'
      + '<div style="font-size:9.5px"><strong>Son:</strong> '+_numeroALetras(fac.total)+'</div>'
      + (fac.metodo ? '<div style="font-size:9.5px;margin-top:4px"><strong>Método de pago:</strong> '+fac.metodo+'</div>' : '')
      + (fac.referencia ? '<div style="font-size:9.5px"><strong>Referencia:</strong> '+fac.referencia+'</div>' : '')
      + '</td><td style="vertical-align:top;text-align:right;width:200px">'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<tr><td style="text-align:left;padding:3px 8px">Subtotal:</td><td style="text-align:right;padding:3px 8px;font-family:monospace">$'+parseFloat(fac.subtotal).toFixed(2)+'</td></tr>'
      + '<tr><td style="text-align:left;padding:3px 8px;color:#666">IVA '+(fac.ivaAplica?('('+(fac.ivaRate||16)+'%)'):'(no aplica)')+':</td><td style="text-align:right;padding:3px 8px;font-family:monospace;color:#666">$'+parseFloat(fac.iva||0).toFixed(2)+'</td></tr>'
      + ((fac.igtfAplica||((fac.igtf||0)>0))?'<tr><td style="text-align:left;padding:3px 8px;color:#666">IGTF ('+(fac.igtfRate||3)+'%):</td><td style="text-align:right;padding:3px 8px;font-family:monospace;color:#666">$'+parseFloat(fac.igtf||0).toFixed(2)+'</td></tr>':'')
      + '<tr style="border-top:2px solid #1a1a1a"><td style="text-align:left;padding:6px 8px;font-weight:900;font-size:'+headSize+'">TOTAL:</td><td style="text-align:right;padding:6px 8px;font-family:monospace;font-weight:900;font-size:'+headSize+'">$'+parseFloat(fac.total).toFixed(2)+'</td></tr>'
      + (totalBs ? '<tr><td style="text-align:left;padding:3px 8px;color:#666;font-size:9.5px">Total en Bs:</td><td style="text-align:right;padding:3px 8px;font-family:monospace;color:#666;font-size:9.5px">'+totalBs+'</td></tr>' : '')
      + '</table></td></tr></table>'
      + '<div style="text-align:center;font-size:8.5px;color:#999;margin-top:'+(formato==='media'?'8px':'18px')+';padding-top:'+(formato==='media'?'4px':'8px')+';border-top:1px solid #ddd">Emitida el '+fmtFechaHora(fac.fechaCreacion)+'</div>';
  }
  var html = '<!doctype html><html><head><meta charset="utf-8"><title>Factura '+fac.numero+'</title>'
    + '<style>'
    + '@page{size:'+pageSize+';margin:0}'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:'+fontSize+';position:relative;background:#fff}'
    + '.pf{max-width:'+bodyMaxWidth+';margin:0 auto;padding:'+bodyPadding+';position:relative}'
    + '@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}'
    + '</style></head><body>'
    + '<div class="pf">'+anuladaWatermark+contenidoFactura+'</div>'
    + '<script>setTimeout(function(){window.print();},250);<\/script>'
    + '</body></html>';
  var w = window.open('', '_blank', 'width=900,height=700');
  if(!w){ toast('No se pudo abrir la ventana de impresión. Verifica el bloqueador de popups.','error'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// Modal: anular factura
function abrirAnularFactura(facId){
  var fac = (S.facturas||[]).find(function(x){ return x.id === facId; });
  if(!fac){ toast('Factura no encontrada','error'); return; }
  if(fac.anulada){ toast('Esta factura ya está anulada','warning'); return; }
  setMicon('anular');
  $('mtt').textContent='Anular Factura';
  $('msb').textContent='N° '+fac.numero;
  $('modal-box').className='modal';
  $('mbd').innerHTML =
    '<div style="background:rgba(255,71,87,0.12);border:1px solid rgba(255,71,87,0.35);border-radius:9px;padding:12px;margin-bottom:14px">'
    + '<div style="font-weight:800;color:var(--red);font-size:13px;margin-bottom:5px">⚠ Acción irreversible</div>'
    + '<div style="font-size:11.5px;color:var(--ink2);line-height:1.55">Una factura anulada queda registrada permanentemente como tal. Por exigencia SENIAT:</div>'
    + '<ul style="font-size:11.5px;color:var(--ink2);margin-top:6px;padding-left:20px;line-height:1.5">'
    + '<li>El número de la factura ('+fac.numero+') no podrá reutilizarse</li>'
    + '<li>El número de control ('+fac.numeroControl+') no podrá reutilizarse</li>'
    + '<li>La factura permanecerá en el sistema con estado "ANULADA"</li>'
    + '</ul></div>'
    + '<div class="fg"><label>Razón de anulación <span style="color:var(--red)">*</span></label>'
    + '<textarea class="fi" id="anu_razon" rows="3" placeholder="Ej: Error en datos del cliente, monto incorrecto, etc."></textarea></div>';
  $('mft').innerHTML =
    '<button class="btn btn-g" onclick="abrirVerFactura(\''+fac.id+'\')">Cancelar</button>'
    + '<button class="btn btn-d" onclick="confirmarAnularFactura(\''+fac.id+'\')">Anular Factura</button>';
  $('ov').style.display='flex';
}

function confirmarAnularFactura(facId){
  var fi = (S.facturas||[]).findIndex(function(x){ return x.id === facId; });
  if(fi < 0){ toast('Factura no encontrada','error'); return; }
  var razon = ($('anu_razon')&&$('anu_razon').value||'').trim();
  if(!razon){ toast('Debes indicar la razón de anulación','error'); return; }
  S.facturas[fi].anulada = true;
  S.facturas[fi].fechaAnulacion = new Date().toISOString();
  S.facturas[fi].razonAnulacion = razon;
  S.facturas[fi].anuladaPor = (S.currentUser&&S.currentUser.nombre)||'Admin';
  S.facturas[fi].anuladaPorUid = (S.currentUser&&S.currentUser.uid)||'';
  DB.saveFactura(S.facturas[fi]);
  toast('Factura '+S.facturas[fi].numero+' anulada','info');
  abrirVerFactura(facId);
}


// ╔══════════════════════════════════════════════════════════╗
// ║  LIBRO DE VENTAS SENIAT                                   ║
// ║  Reporte fiscal con cálculo de IVA y IGTF para entregar   ║
// ║  al contador. NO emite facturas legales.                  ║
// ╚══════════════════════════════════════════════════════════╝

// Configuración (se guarda en localStorage)
var _libroSeniatCfg = {
  ivaActivo: false,        // ¿Cobro IVA?
  ivaAlicuota: 16,          // 16, 8, 0
  esSPE: false,             // ¿Soy Sujeto Pasivo Especial (cobro IGTF)?
  igtfAlicuota: 3,          // % IGTF (default 3%)
  // Métodos que se consideran "moneda extranjera" (gravados con IGTF si esSPE=true)
  metodosDivisa: ['Zelle','USDT','Efectivo USD','Efectivo','PayPal','Binance','Wise','Cash App','Dolar','Dólar'],
  // Período seleccionado
  periodoTipo: 'mes',       // 'mes' | 'rango'
  periodoMes: '',           // YYYY-MM
  periodoDesde: '',         // YYYY-MM-DD
  periodoHasta: ''          // YYYY-MM-DD
};

function _libroSeniatLoadCfg(){
  try{
    var raw = localStorage.getItem('libroSeniatCfg_v1');
    if(raw){
      var saved = JSON.parse(raw);
      Object.keys(saved).forEach(function(k){ _libroSeniatCfg[k] = saved[k]; });
    }
  }catch(e){}
  // Default: mes actual si no hay nada
  if(!_libroSeniatCfg.periodoMes){
    var d = new Date();
    _libroSeniatCfg.periodoMes = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
}

function _libroSeniatSaveCfg(){
  try{ localStorage.setItem('libroSeniatCfg_v1', JSON.stringify(_libroSeniatCfg)); }catch(e){}
}

// Determina si un método de pago es divisa (gravado con IGTF)
// Estrategia 1: Si el nombre del método coincide con una cuenta bancaria configurada,
//   usar el campo `moneda` de esa cuenta (USD = divisa, BS = bolívares)
// Estrategia 2 (fallback): Si no hay match con cuenta, usar lista de palabras clave
function _libroSeniatEsDivisa(metodo){
  if(!metodo) return false;
  var nombreMetodo = String(metodo).trim();
  // Buscar cuenta bancaria con ese nombre (insensible a mayúsculas)
  var cuentas = (typeof _cuentasBanc !== 'undefined' && _cuentasBanc) ? _cuentasBanc : [];
  var cuenta = cuentas.find(function(c){
    return (c.nombre||'').trim().toLowerCase() === nombreMetodo.toLowerCase();
  });
  if(cuenta){
    // moneda 'USD' o cualquier cosa distinta a 'BS' se considera divisa
    return (cuenta.moneda||'USD').toUpperCase() !== 'BS';
  }
  // Fallback: palabras clave (por si el método no coincide con cuenta configurada)
  var m = nombreMetodo.toLowerCase();
  // "Bs" / "bolívares" / "bolivares" → bolívares (NO divisa)
  if(m.indexOf('bs') !== -1 || m.indexOf('bolivar') !== -1 || m.indexOf('bolívar') !== -1) return false;
  // Si contiene palabras de divisa explícitas
  return _libroSeniatCfg.metodosDivisa.some(function(d){
    return m.indexOf(d.toLowerCase()) !== -1;
  });
}

// Filtra pagos según período configurado
function _libroSeniatFiltrarPagos(){
  var pagos = (S.pagos||[]).filter(function(p){
    return !p.eliminado && p.estado==='confirmado';
  });
  var desde, hasta;
  if(_libroSeniatCfg.periodoTipo === 'mes'){
    var ym = _libroSeniatCfg.periodoMes;
    if(!ym) return pagos;
    desde = ym + '-01';
    var partes = ym.split('-');
    var lastDay = new Date(parseInt(partes[0]), parseInt(partes[1]), 0).getDate();
    hasta = ym + '-' + String(lastDay).padStart(2,'0');
  } else {
    desde = _libroSeniatCfg.periodoDesde;
    hasta = _libroSeniatCfg.periodoHasta;
  }
  if(!desde || !hasta) return pagos;
  return pagos.filter(function(p){
    return p.fecha >= desde && p.fecha <= hasta;
  });
}

// Calcula desglose fiscal de un pago según configuración actual
// Asume: monto pagado YA INCLUYE IVA (sacar base dividiendo entre 1+iva%)
function _libroSeniatDesglose(pago){
  var total = parseFloat(pago.monto)||0;
  var aliv = _libroSeniatCfg.ivaActivo ? (parseFloat(_libroSeniatCfg.ivaAlicuota)||0) : 0;
  var base, iva;
  if(aliv > 0){
    base = total / (1 + aliv/100);
    iva = total - base;
  } else {
    base = total;
    iva = 0;
  }
  // IGTF aplica solo si es SPE Y método es divisa. IGTF se calcula adicional al total.
  // Sin embargo, en práctica el IGTF se documenta sobre el monto pagado en divisas (el total recibido)
  var igtf = 0;
  var igtfAplica = false;
  if(_libroSeniatCfg.esSPE && _libroSeniatEsDivisa(pago.metodo)){
    igtfAplica = true;
    igtf = total * (parseFloat(_libroSeniatCfg.igtfAlicuota)||0)/100;
  }
  return {
    total: total,
    base: base,
    aliv: aliv,
    iva: iva,
    igtf: igtf,
    igtfAplica: igtfAplica,
    totalConIgtf: total + igtf  // Lo que el cliente debió pagar realmente con IGTF
  };
}

// Busca CI/RIF del cliente (busca en S.clientes por nombre exacto)
// Campo correcto: 'cedula' (no 'ci')
function _libroSeniatGetCI(nombreCliente){
  if(!nombreCliente) return '';
  var c = (S.clientes||[]).find(function(x){
    return (x.nombre||'').trim().toLowerCase() === String(nombreCliente).trim().toLowerCase();
  });
  return c ? (c.cedula||c.ci||'') : '';
}

// Render principal del tab Libro SENIAT
function _renderLibroSeniat(){
  _libroSeniatLoadCfg();
  var cfg = _libroSeniatCfg;
  var pagos = _libroSeniatFiltrarPagos();
  // Ordenar por fecha
  pagos.sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
  // Totales
  var totBase = 0, totIva = 0, totIgtf = 0, totTotal = 0, totConIgtf = 0;
  var filas = pagos.map(function(p, idx){
    var d = _libroSeniatDesglose(p);
    totBase += d.base;
    totIva += d.iva;
    totIgtf += d.igtf;
    totTotal += d.total;
    totConIgtf += d.totalConIgtf;
    var ci = _libroSeniatGetCI(p.cli);
    var fac = (S.facturas||[]).find(function(f){ return f.pagoId === p.id; });
    var nFac = fac && !fac.anulada ? fac.numero : '—';
    return '<tr style="border-bottom:1px solid var(--rim2)">'
      + '<td class="tds" style="padding:6px 8px">'+(idx+1)+'</td>'
      + '<td class="tds" style="padding:6px 8px">'+(p.fecha||'')+'</td>'
      + '<td class="tds" style="padding:6px 8px;font-family:var(--fd);font-size:10.5px">'+(p.id||'')+'</td>'
      + '<td class="tds" style="padding:6px 8px;font-family:var(--fd);font-size:10.5px">'+nFac+'</td>'
      + '<td class="tds" style="padding:6px 8px">'+(p.cli||'')+'</td>'
      + '<td class="tds" style="padding:6px 8px;font-family:var(--fd);font-size:10.5px">'+(ci||'<span style="color:var(--red)">SIN CI</span>')+'</td>'
      + '<td class="tds" style="padding:6px 8px;font-family:var(--fd);text-align:right">'+fmt(d.base)+'</td>'
      + '<td class="tds" style="padding:6px 8px;font-family:var(--fd);text-align:right;color:var(--ink3)">'+(d.aliv>0 ? d.aliv+'%' : '—')+'</td>'
      + '<td class="tds" style="padding:6px 8px;font-family:var(--fd);text-align:right">'+fmt(d.iva)+'</td>'
      + '<td class="tds" style="padding:6px 8px;font-family:var(--fd);text-align:right;'+(d.igtfAplica?'color:var(--amber)':'color:var(--ink3)')+'">'+(d.igtfAplica ? fmt(d.igtf) : '—')+'</td>'
      + '<td class="tds" style="padding:6px 8px;font-family:var(--fd);text-align:right;font-weight:700">'+fmt(d.total)+'</td>'
      + '<td class="tds" style="padding:6px 8px;color:var(--ink3);font-size:10.5px">'+(p.metodo||'—')+'</td>'
      + '</tr>';
  }).join('');
  // Período label
  var periodoLbl = '';
  if(cfg.periodoTipo === 'mes' && cfg.periodoMes){
    var partes = cfg.periodoMes.split('-');
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    periodoLbl = meses[parseInt(partes[1])-1] + ' ' + partes[0];
  } else if(cfg.periodoTipo === 'rango'){
    periodoLbl = (cfg.periodoDesde||'?') + ' al ' + (cfg.periodoHasta||'?');
  }
  // Mes actual default
  var mesActual = cfg.periodoMes || (function(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  })();
  var clientesSinCI = pagos.filter(function(p){ return !_libroSeniatGetCI(p.cli); }).length;
  return ''
    + '<div class="card" style="margin-bottom:14px">'
    + '<div class="ch"><div><div class="ct">⚖ Libro de Ventas SENIAT</div><div class="cs">Reporte fiscal · No es factura legal</div></div></div>'
    + '<div style="background:rgba(255,165,0,0.08);border:1px solid rgba(255,165,0,0.3);border-radius:9px;padding:11px 13px;font-size:11.5px;color:var(--ink2);line-height:1.55">'
    + '<strong style="color:var(--amber)">⚠ Importante:</strong> Este reporte es un auxiliar contable para entregar a tu contador o al SENIAT en caso de fiscalización. '
    + '<strong>No sustituye la facturación legal</strong> (talonarios autorizados, máquina fiscal o sistema certificado SENIAT). '
    + 'Los cálculos asumen que el monto cobrado <strong>YA INCLUYE IVA</strong> (base = monto / 1.16 si IVA 16%). Verifica con tu contador antes de entregar.'
    + '</div>'
    + '</div>'
    // ════════ CONFIGURACIÓN ════════
    + '<div class="card" style="margin-bottom:14px">'
    + '<div class="ch"><div><div class="ct">Configuración fiscal</div><div class="cs">Define cómo calcular impuestos · Pregunta a tu contador</div></div></div>'
    + '<div class="fgr" style="gap:12px;margin-top:6px">'
    + '<div class="fg"><label>¿Cobras IVA en tus operaciones?</label>'
    + '<select class="fs" id="ls_iva_activo" onchange="_libroSeniatChange()">'
    + '<option value="no" '+(!cfg.ivaActivo?'selected':'')+'>No — Estoy exento o no aplica</option>'
    + '<option value="si" '+(cfg.ivaActivo?'selected':'')+'>Sí — Cobro IVA</option>'
    + '</select></div>'
    + '<div class="fg"><label>Alícuota IVA</label>'
    + '<select class="fs" id="ls_iva_aliv" onchange="_libroSeniatChange()" '+(cfg.ivaActivo?'':'disabled')+'>'
    + '<option value="16" '+(cfg.ivaAlicuota==16?'selected':'')+'>16% (general)</option>'
    + '<option value="8" '+(cfg.ivaAlicuota==8?'selected':'')+'>8% (reducida)</option>'
    + '<option value="0" '+(cfg.ivaAlicuota==0?'selected':'')+'>0% (exportación)</option>'
    + '</select></div>'
    + '<div class="fg"><label>¿Eres Sujeto Pasivo Especial (SPE)?</label>'
    + '<select class="fs" id="ls_spe" onchange="_libroSeniatChange()">'
    + '<option value="no" '+(!cfg.esSPE?'selected':'')+'>No — No cobro IGTF</option>'
    + '<option value="si" '+(cfg.esSPE?'selected':'')+'>Sí — Soy SPE, cobro IGTF en pagos en divisa</option>'
    + '</select></div>'
    + '<div class="fg"><label>Alícuota IGTF</label>'
    + '<select class="fs" id="ls_igtf_aliv" onchange="_libroSeniatChange()" '+(cfg.esSPE?'':'disabled')+'>'
    + '<option value="3" '+(cfg.igtfAlicuota==3?'selected':'')+'>3% (estándar — divisas)</option>'
    + '<option value="2" '+(cfg.igtfAlicuota==2?'selected':'')+'>2% (otros casos)</option>'
    + '</select></div>'
    + '</div>'
    + '<div style="margin-top:8px;padding:10px;background:var(--gs);border-radius:8px;font-size:11px;color:var(--ink3);line-height:1.55">'
    + '<strong style="color:var(--ink2)">¿Cómo se detecta si un pago genera IGTF?</strong> '
    + 'El sistema usa la <strong>moneda configurada de cada cuenta bancaria</strong> en Configuración: '
    + 'cuentas en <strong>USD</strong> generan IGTF, cuentas en <strong>Bs</strong> no. '
    + 'Si un método no coincide con ninguna cuenta configurada, se detecta por palabras clave (Zelle, USDT, etc).'
    + '</div>'
    + '</div>'
    // ════════ PERÍODO ════════
    + '<div class="card" style="margin-bottom:14px">'
    + '<div class="ch"><div><div class="ct">Período del reporte</div><div class="cs">'+periodoLbl+'</div></div></div>'
    + '<div class="fgr" style="gap:12px">'
    + '<div class="fg"><label>Tipo de período</label>'
    + '<select class="fs" id="ls_periodo_tipo" onchange="_libroSeniatChange()">'
    + '<option value="mes" '+(cfg.periodoTipo==='mes'?'selected':'')+'>Por mes</option>'
    + '<option value="rango" '+(cfg.periodoTipo==='rango'?'selected':'')+'>Rango personalizado</option>'
    + '</select></div>'
    + (cfg.periodoTipo==='mes'
        ? '<div class="fg"><label>Mes</label><input class="fi" type="month" id="ls_mes" value="'+mesActual+'" onchange="_libroSeniatChange()"></div>'
        : '<div class="fg"><label>Desde</label><input class="fi" type="date" id="ls_desde" value="'+(cfg.periodoDesde||'')+'" onchange="_libroSeniatChange()"></div>'
          + '<div class="fg"><label>Hasta</label><input class="fi" type="date" id="ls_hasta" value="'+(cfg.periodoHasta||'')+'" onchange="_libroSeniatChange()"></div>')
    + '</div>'
    + '</div>'
    // ════════ TOTALES ════════
    + '<div class="card" style="margin-bottom:14px">'
    + '<div class="ch"><div><div class="ct">Totales del período</div><div class="cs">'+pagos.length+' operaciones</div></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:6px">'
    + '<div style="background:var(--gs);padding:11px;border-radius:9px;"><div style="font-size:9.5px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Base imponible</div><div style="font-family:var(--fd);font-weight:800;font-size:16px;margin-top:3px">'+fmt(totBase)+'</div></div>'
    + '<div style="background:var(--gs);padding:11px;border-radius:9px;"><div style="font-size:9.5px;font-weight:800;color:var(--p1);text-transform:uppercase;letter-spacing:.5px">IVA débito fiscal</div><div style="font-family:var(--fd);font-weight:800;font-size:16px;margin-top:3px">'+fmt(totIva)+'</div></div>'
    + '<div style="background:var(--gs);padding:11px;border-radius:9px;"><div style="font-size:9.5px;font-weight:800;color:var(--amber);text-transform:uppercase;letter-spacing:.5px">IGTF percibido</div><div style="font-family:var(--fd);font-weight:800;font-size:16px;margin-top:3px">'+fmt(totIgtf)+'</div></div>'
    + '<div style="background:var(--gs);padding:11px;border-radius:9px;"><div style="font-size:9.5px;font-weight:800;color:var(--green);text-transform:uppercase;letter-spacing:.5px">Total cobrado</div><div style="font-family:var(--fd);font-weight:800;font-size:16px;margin-top:3px">'+fmt(totTotal)+'</div></div>'
    + '<div style="background:var(--gs);padding:11px;border-radius:9px;"><div style="font-size:9.5px;font-weight:800;color:var(--green);text-transform:uppercase;letter-spacing:.5px">Total + IGTF</div><div style="font-family:var(--fd);font-weight:800;font-size:16px;margin-top:3px">'+fmt(totConIgtf)+'</div></div>'
    + '</div>'
    + (clientesSinCI > 0 ? '<div style="margin-top:10px;padding:9px 11px;background:rgba(255,71,87,.08);border:1px solid rgba(255,71,87,.25);border-radius:8px;font-size:11px;color:var(--red)">⚠ Hay <strong>'+clientesSinCI+' pago'+(clientesSinCI>1?'s':'')+'</strong> con cliente sin CI/RIF registrado. SENIAT lo exige para el libro.</div>' : '')
    + '</div>'
    // ════════ TABLA ════════
    + '<div class="card">'
    + '<div class="ch"><div><div class="ct">Detalle de operaciones</div><div class="cs">Estilo Libro de Ventas SENIAT</div></div>'
    + '<div style="display:flex;gap:6px">'
    + '<button class="btn btn-g btn-sm" onclick="_libroSeniatExportarCSV()"> Exportar CSV</button>'
    + '<button class="btn btn-p btn-sm" onclick="_libroSeniatImprimir()"> Imprimir / PDF</button>'
    + '</div></div>'
    + (pagos.length === 0
      ? '<div style="padding:30px 0;text-align:center;color:var(--ink3);font-size:13px">Sin operaciones en este período</div>'
      : '<div class="tw" style="overflow-x:auto"><table style="font-size:11.5px;min-width:1100px">'
        + '<thead><tr style="background:var(--gs)">'
        + '<th style="padding:8px;text-align:left">#</th>'
        + '<th style="padding:8px;text-align:left">Fecha</th>'
        + '<th style="padding:8px;text-align:left">Comprob.</th>'
        + '<th style="padding:8px;text-align:left">N° Factura</th>'
        + '<th style="padding:8px;text-align:left">Cliente</th>'
        + '<th style="padding:8px;text-align:left">RIF/C.I.</th>'
        + '<th style="padding:8px;text-align:right">Base</th>'
        + '<th style="padding:8px;text-align:right">% IVA</th>'
        + '<th style="padding:8px;text-align:right">IVA</th>'
        + '<th style="padding:8px;text-align:right">IGTF</th>'
        + '<th style="padding:8px;text-align:right">Total</th>'
        + '<th style="padding:8px;text-align:left">Método</th>'
        + '</tr></thead>'
        + '<tbody>'+filas+'</tbody>'
        + '<tfoot><tr style="background:var(--gs);font-weight:800">'
        + '<td colspan="6" style="padding:9px 8px;text-align:right">TOTALES:</td>'
        + '<td style="padding:9px 8px;text-align:right;font-family:var(--fd)">'+fmt(totBase)+'</td>'
        + '<td></td>'
        + '<td style="padding:9px 8px;text-align:right;font-family:var(--fd);color:var(--p1)">'+fmt(totIva)+'</td>'
        + '<td style="padding:9px 8px;text-align:right;font-family:var(--fd);color:var(--amber)">'+fmt(totIgtf)+'</td>'
        + '<td style="padding:9px 8px;text-align:right;font-family:var(--fd);color:var(--green)">'+fmt(totTotal)+'</td>'
        + '<td></td></tr></tfoot>'
        + '</table></div>')
    + '</div>';
}

// Maneja cualquier cambio en los selects/inputs de configuración
function _libroSeniatChange(){
  var cfg = _libroSeniatCfg;
  var el;
  el = $('ls_iva_activo'); if(el) cfg.ivaActivo = (el.value === 'si');
  el = $('ls_iva_aliv'); if(el) cfg.ivaAlicuota = parseFloat(el.value)||0;
  el = $('ls_spe'); if(el) cfg.esSPE = (el.value === 'si');
  el = $('ls_igtf_aliv'); if(el) cfg.igtfAlicuota = parseFloat(el.value)||3;
  el = $('ls_periodo_tipo'); if(el) cfg.periodoTipo = el.value;
  el = $('ls_mes'); if(el) cfg.periodoMes = el.value;
  el = $('ls_desde'); if(el) cfg.periodoDesde = el.value;
  el = $('ls_hasta'); if(el) cfg.periodoHasta = el.value;
  _libroSeniatSaveCfg();
  // Re-render
  if(typeof nav === 'function') nav('reportes');
}

// Exportar a CSV (formato Libro de Ventas SENIAT)
function _libroSeniatExportarCSV(){
  var pagos = _libroSeniatFiltrarPagos();
  pagos.sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
  var emp = (typeof getEmpresa === 'function') ? getEmpresa() : {nombre:'',rif:''};
  var cfg = _libroSeniatCfg;
  var periodoLbl = '';
  if(cfg.periodoTipo === 'mes' && cfg.periodoMes){
    periodoLbl = cfg.periodoMes;
  } else if(cfg.periodoTipo === 'rango'){
    periodoLbl = (cfg.periodoDesde||'')+'_a_'+(cfg.periodoHasta||'');
  }
  var rows = [];
  // Encabezado
  rows.push(['LIBRO DE VENTAS - REPORTE AUXILIAR SENIAT']);
  rows.push(['Empresa:', emp.nombre||'', 'RIF:', emp.rif||'']);
  rows.push(['Período:', periodoLbl]);
  rows.push(['IVA aplicado:', cfg.ivaActivo ? cfg.ivaAlicuota+'%' : 'No aplica']);
  rows.push(['IGTF (SPE):', cfg.esSPE ? cfg.igtfAlicuota+'% en pagos divisa' : 'No aplica']);
  rows.push(['Generado:', new Date().toLocaleString('es-VE')]);
  rows.push([]);
  // Headers de tabla
  rows.push(['#','Fecha','N° Comprobante','N° Factura','Cliente','RIF/C.I.','Base Imponible','% IVA','IVA','IGTF','Total','Método de pago']);
  var totBase=0, totIva=0, totIgtf=0, totTotal=0;
  pagos.forEach(function(p, idx){
    var d = _libroSeniatDesglose(p);
    var ci = _libroSeniatGetCI(p.cli);
    var fac = (S.facturas||[]).find(function(f){ return f.pagoId === p.id; });
    var nFac = fac && !fac.anulada ? fac.numero : '';
    rows.push([
      idx+1,
      p.fecha||'',
      p.id||'',
      nFac,
      p.cli||'',
      ci,
      d.base.toFixed(2),
      d.aliv,
      d.iva.toFixed(2),
      d.igtfAplica ? d.igtf.toFixed(2) : '0.00',
      d.total.toFixed(2),
      p.metodo||''
    ]);
    totBase+=d.base; totIva+=d.iva; totIgtf+=d.igtf; totTotal+=d.total;
  });
  rows.push([]);
  rows.push(['','','','','','TOTALES:', totBase.toFixed(2), '', totIva.toFixed(2), totIgtf.toFixed(2), totTotal.toFixed(2), '']);
  // Convertir a CSV
  var csv = rows.map(function(r){
    return r.map(function(c){
      var s = String(c==null?'':c);
      if(s.indexOf(',')>=0 || s.indexOf('"')>=0 || s.indexOf('\n')>=0){
        s = '"'+s.replace(/"/g,'""')+'"';
      }
      return s;
    }).join(',');
  }).join('\n');
  // Descargar (con BOM para que Excel lo abra bien con tildes)
  var blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'libro_ventas_seniat_'+(periodoLbl||'reporte')+'.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  if(typeof toast === 'function') toast('Libro exportado · CSV','success');
}

// Imprimir (también permite guardar como PDF desde el diálogo del navegador)
function _libroSeniatImprimir(){
  var pagos = _libroSeniatFiltrarPagos();
  pagos.sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
  var emp = (typeof getEmpresa === 'function') ? getEmpresa() : {nombre:'',rif:'',direccion:''};
  var cfg = _libroSeniatCfg;
  var periodoLbl = '';
  if(cfg.periodoTipo === 'mes' && cfg.periodoMes){
    var partes = cfg.periodoMes.split('-');
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    periodoLbl = meses[parseInt(partes[1])-1] + ' ' + partes[0];
  } else if(cfg.periodoTipo === 'rango'){
    periodoLbl = (cfg.periodoDesde||'')+' al '+(cfg.periodoHasta||'');
  }
  var totBase=0, totIva=0, totIgtf=0, totTotal=0;
  var rowsHtml = pagos.map(function(p, idx){
    var d = _libroSeniatDesglose(p);
    var ci = _libroSeniatGetCI(p.cli);
    var fac = (S.facturas||[]).find(function(f){ return f.pagoId === p.id; });
    var nFac = fac && !fac.anulada ? fac.numero : '—';
    totBase+=d.base; totIva+=d.iva; totIgtf+=d.igtf; totTotal+=d.total;
    return '<tr>'
      +'<td>'+(idx+1)+'</td>'
      +'<td>'+(p.fecha||'')+'</td>'
      +'<td style="font-family:monospace;font-size:9px">'+(p.id||'')+'</td>'
      +'<td style="font-family:monospace;font-size:9px">'+nFac+'</td>'
      +'<td>'+(p.cli||'')+'</td>'
      +'<td style="font-family:monospace;font-size:9px">'+(ci||'—')+'</td>'
      +'<td class="num">'+d.base.toFixed(2)+'</td>'
      +'<td class="num">'+(d.aliv||'—')+(d.aliv>0?'%':'')+'</td>'
      +'<td class="num">'+d.iva.toFixed(2)+'</td>'
      +'<td class="num">'+(d.igtfAplica ? d.igtf.toFixed(2) : '—')+'</td>'
      +'<td class="num"><strong>'+d.total.toFixed(2)+'</strong></td>'
      +'<td style="font-size:9px">'+(p.metodo||'')+'</td>'
      +'</tr>';
  }).join('');
  var html = '<!doctype html><html><head><meta charset="utf-8"><title>Libro de Ventas SENIAT - '+periodoLbl+'</title>'
    + '<style>'
    + '@page{size:Letter landscape;margin:.4in}'
    + '*{box-sizing:border-box}'
    + 'body{font-family:Arial,sans-serif;color:#000;font-size:10px;margin:0;padding:0}'
    + '.hd{border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px}'
    + '.hd h1{margin:0;font-size:16px;letter-spacing:1px}'
    + '.hd .sb{font-size:11px;color:#333;margin-top:2px}'
    + '.meta{display:flex;justify-content:space-between;font-size:10px;margin-bottom:10px}'
    + '.meta b{font-weight:700}'
    + 'table{width:100%;border-collapse:collapse;font-size:9.5px;margin-top:6px}'
    + 'th{background:#e0e0e0;padding:5px 4px;border:1px solid #888;text-align:left;font-size:9px}'
    + 'td{padding:4px;border:1px solid #ccc}'
    + '.num{text-align:right;font-family:monospace}'
    + 'tfoot td{background:#f0f0f0;font-weight:800;border-top:2px solid #000}'
    + '.disc{margin-top:14px;padding:8px;background:#fff8e0;border:1px solid #d4a843;font-size:9px;color:#444;line-height:1.5}'
    + '.foot{margin-top:18px;padding-top:8px;border-top:1px solid #999;display:flex;justify-content:space-between;font-size:8.5px;color:#666}'
    + '.sig{margin-top:30px;display:flex;justify-content:space-around;font-size:10px}'
    + '.sig .b{border-top:1px solid #000;width:200px;text-align:center;padding-top:3px}'
    + '@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}'
    + '</style></head><body>'
    + '<div class="hd">'
    + '<h1>LIBRO DE VENTAS — REPORTE AUXILIAR</h1>'
    + '<div class="sb">Documento de uso interno y contable · Período: <b>'+periodoLbl+'</b></div>'
    + '</div>'
    + '<div class="meta">'
    + '<div><b>Razón social:</b> '+(emp.nombre||'—')+'<br><b>RIF:</b> '+(emp.rif||'—')
    + (emp.direccion?'<br><b>Domicilio fiscal:</b> '+emp.direccion:'')+'</div>'
    + '<div style="text-align:right">'
    + '<b>IVA:</b> '+(cfg.ivaActivo?cfg.ivaAlicuota+'%':'No aplica')+'<br>'
    + '<b>IGTF:</b> '+(cfg.esSPE?cfg.igtfAlicuota+'% (SPE)':'No aplica')+'<br>'
    + '<b>Operaciones:</b> '+pagos.length+'<br>'
    + '<b>Generado:</b> '+new Date().toLocaleString('es-VE')
    + '</div></div>'
    + (pagos.length === 0
      ? '<p style="text-align:center;padding:40px;color:#666">Sin operaciones en este período.</p>'
      : '<table>'
        + '<thead><tr><th>#</th><th>Fecha</th><th>N° Comprob.</th><th>N° Factura</th><th>Cliente</th><th>RIF/C.I.</th><th class="num">Base</th><th class="num">% IVA</th><th class="num">IVA</th><th class="num">IGTF</th><th class="num">Total</th><th>Método</th></tr></thead>'
        + '<tbody>'+rowsHtml+'</tbody>'
        + '<tfoot><tr>'
        + '<td colspan="6" style="text-align:right">TOTALES:</td>'
        + '<td class="num">'+totBase.toFixed(2)+'</td>'
        + '<td></td>'
        + '<td class="num">'+totIva.toFixed(2)+'</td>'
        + '<td class="num">'+totIgtf.toFixed(2)+'</td>'
        + '<td class="num">'+totTotal.toFixed(2)+'</td>'
        + '<td></td></tr></tfoot></table>')
    + '<div class="disc"><strong>Aviso legal:</strong> Este reporte es un documento auxiliar de uso interno y contable. '
    + 'No sustituye la facturación legal exigida por la Providencia Administrativa SNAT/2011/00071 (talonarios autorizados, máquinas fiscales o sistemas de facturación electrónica certificados por SENIAT). '
    + 'Los cálculos asumen que el monto cobrado YA INCLUYE el IVA. Validar con contador antes de cualquier uso oficial.</div>'
    + '<div class="sig"><div class="b">Elaborado por</div><div class="b">Revisado por contador</div><div class="b">Firma y sello</div></div>'
    + '<div class="foot"><div>Pagasi · Sistema de gestión</div><div>'+new Date().toLocaleString('es-VE')+'</div></div>'
    + '<script>setTimeout(function(){window.print();},300);<\/script>'
    + '</body></html>';
  var w = window.open('', '_blank', 'width=1100,height=800');
  if(!w){
    if(typeof toast === 'function') toast('Activa los popups para imprimir','error');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}


// ╔══════════════════════════════════════════════════════════╗
// ║  MÓDULO DE COMISIONES                                     ║
// ║  - Tarjetas tipo "vendedor" con saldo a pagar             ║
// ║  - Pago de comisiones (descuenta de cuenta + crea egreso) ║
// ║  - Eliminación con opción de devolver dinero              ║
// ║  - Configuración por usuario (fijo o porcentaje)          ║
// ╚══════════════════════════════════════════════════════════╝

// Defaults globales (usados cuando un usuario activa comisiones sin config previa)
