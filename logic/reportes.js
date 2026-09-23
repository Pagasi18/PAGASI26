// Logica de finiquitos, PDFs, CSV, paginacion y reportes. Extraido mecanicamente de assets/pagasi-app.js.
// ══════════════════════════════════════════════════════════════════
// LA CONSTANCIA DE CANCELACION TOTAL (el "finiquito")
// ══════════════════════════════════════════════════════════════════
// 22-sep-2026, Adam viendola: "esta carta de finiquito no tiene sinergia de
// pagasi ni logo ni nada". Salia morada, sin logo y con el membrete de nadie.
// Y decia cosas que ya no son verdad: hablaba de ARRENDADOR, de canones y de
// una opcion a compra por US$ 1, que es el contrato viejo. El que se firma hoy
// es una VENTA A CREDITO con reserva de dominio: lo que se entrega al final es
// la liberacion de esa reserva, no el ejercicio de una opcion.
// Ahora el papel sigue la misma regla que los contratos: al credito viejo le
// sale el texto de su epoca, al de hoy el suyo. Y la identidad es la del
// sistema: logo, azul Pagasi, Nunito, y los datos de LA COMPANIA QUE FIRMA,
// que con dos empresas en el mismo sistema no puede salir de una constante.
function _finiquitoDatos(credId){
  var c = S.creds.find(function(x){ return String(x.id)===String(credId); });
  if(!c) return null;
  var cl = S.clientes.find(function(x){ return String(x.id)===String(c.clienteId); })
        || S.clientes.find(function(x){ return x.nombre===c.cli; }) || {};
  var moto = S.motos.find(function(m){ return String(m.id)===String(c.motoId); }) || {};
  var e = (typeof _empCtr==='function') ? _empCtr() : { nom:'', rif:'', dir:'', ciudad:'', tel:'', email:'' };
  // El representante legal no vive en el respaldo: o esta en la ficha o sale la raya.
  var ficha = (typeof _empresa==='object' && _empresa) ? _empresa : {};
  var real = (typeof _datoReal==='function') ? _datoReal : function(v){ return (v==null?'':String(v)).trim(); };
  var ced = (typeof _draCedulaTxt==='function') ? _draCedulaTxt : function(v){ return real(v); };
  var version = (typeof _contratoVersionDe==='function') ? _contratoVersionDe(c) : 'dra';
  return {
    c:c, cli:cl, moto:moto, emp:e, version:version, venta:(version==='protect'),
    cliNom: c.cli || cl.nombre || '',
    cliCed: ced(cl.cedula || cl.ci || ''),
    modelo: [real(c.marca)||real(moto.marca), real(c.modelo)||real(moto.modelo)].filter(Boolean).join(' '),
    color: real(c.color) || real(moto.color),
    anio: real(c.anio) || real(moto.anio),
    placa: real(c.placa) || real(moto.placa),
    serial: real(c.serialChasis) || real(moto.serialChasis) || real(c.vin) || real(moto.vin),
    cuotas: c.totalCuotas || (c.plazo ? c.plazo*2 : 0),
    pagado: (typeof getCreditoPagosConfirmados==='function') ? getCreditoPagosConfirmados(c) : 0,
    total: (parseFloat(c.ini)||0) + (parseFloat(c.total)||0),
    fechaFin: c.fechaCompletado || (typeof hoyLocalISO==='function' ? hoyLocalISO() : '')
  };
}

function _htmlFiniquito(credId){
  var D = _finiquitoDatos(credId); if(!D) return '';
  var c = D.c, e = D.emp, venta = D.venta;
  var az='#2563EB', azD='#1D4ED8', azL='#EFF6FF';
  var logo = (typeof _PAGASI_LOGO_BLUE!=='undefined' && _PAGASI_LOGO_BLUE)
    || ((document.querySelector('.sb-logo img')||{}).src||'');
  var esc = function(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  // 22-sep-2026, Adam: "no quiero que me dejes vacios en el contrato, si no hay un dato
  // ponme N/A". Un renglon en blanco en un papel que se firma se lee como un descuido y
  // nadie sabe si falta por error o porque no aplica. N/A lo dice. Nunca, en ningun caso,
  // el dato de la otra compania.
  var V = function(v, ancho){ var t=String(v==null?'':v).trim(); return t ? esc(t) : 'N/A'; };
  var dinero = function(n){ return 'US$ '+(parseFloat(n)||0).toFixed(2); };
  var fechaLarga = function(iso){
    if(!iso) return '';
    var d = new Date(String(iso).slice(0,10)+'T12:00:00');
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'});
  };
  var hoy = new Date().toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'});

  var p = 'font-size:11.5px;line-height:1.6;color:#222;margin:10px 0;text-align:justify';
  var h3 = 'color:'+az+';font-weight:900;font-size:12.5px;text-transform:uppercase;letter-spacing:.3px;margin:18px 0 8px;padding-bottom:4px;border-bottom:2px solid '+az;
  var lbl = 'background:'+azL+';color:'+azD+';font-weight:700;font-size:11.5px;padding:7px 10px';
  var val = 'padding:7px 10px;font-size:11.5px;border-bottom:1px solid #DBEAFE';
  var fila = function(a,b){ return '<tr><td style="'+lbl+';width:55%">'+a+'</td><td style="'+val+';text-align:right;font-weight:700">'+b+'</td></tr>'; };

  // ── El titulo y el texto: cada contrato con el suyo ──────────────────────
  var titulo = venta ? 'CONSTANCIA DE CANCELACIÓN TOTAL Y FINIQUITO'
                     : 'CONSTANCIA DE FINALIZACIÓN Y TRANSFERENCIA DE PROPIEDAD';
  var bajada = venta ? 'Cláusula 5.1 del Contrato de Financiamiento N° '+esc(c.id)
                     : 'Ejercicio de la Opción a Compra — Cláusula Séptima del Contrato';
  var relato = venta
    ? ('Por medio del presente documento, <strong>'+V(e.nom,160)+'</strong>, inscrita en el Registro de Información Fiscal bajo el N° <strong>'+V(e.rif,110)+'</strong>, con domicilio en <strong>'+V(e.dir,220)+'</strong> (en lo sucesivo, <strong>«Pagasi»</strong>), deja formal constancia de que el(la) ciudadano(a) <strong>'+V(D.cliNom,150)+'</strong>, titular de la cédula de identidad N° <strong>'+V(D.cliCed,90)+'</strong>, en su condición de <strong>Comprador</strong> bajo el Contrato de Financiamiento para la Adquisición de Vehículo Automotor N° <strong>'+esc(c.id)+'</strong>, ha pagado íntegramente el <strong>Monto Total Adeudado</strong>, comprendiendo la totalidad de las <strong>'+esc(D.cuotas)+' Cuotas Quincenales</strong>, los Intereses Financieros y cualesquiera otros montos a su cargo, sin que quede saldo pendiente alguno a favor de Pagasi.')
    : ('Por medio del presente documento, <strong>'+V(e.nom,160)+'</strong>, inscrita bajo el RIF <strong>'+V(e.rif,110)+'</strong>, con domicilio en <strong>'+V(e.dir,220)+'</strong>, en su condición de <strong>EL ARRENDADOR</strong>, deja formal constancia de que el(la) ciudadano(a) <strong>'+V(D.cliNom,150)+'</strong>, titular de la cédula de identidad N° <strong>'+V(D.cliCed,90)+'</strong>, en su condición de <strong>EL ARRENDATARIO</strong> del contrato de arrendamiento con opción a compra N° <strong>'+esc(c.id)+'</strong>, ha cancelado satisfactoriamente la totalidad de los <strong>'+esc(D.cuotas)+' cánones quincenales</strong> acordados, así como el pago simbólico de la opción a compra por US$ 1,00.');

  var declaracion = venta
    ? ('En virtud del pago íntegro del Monto Total Adeudado, Pagasi declara <strong>extinguidas todas las obligaciones</strong> del Comprador derivadas del Contrato N° '+esc(c.id)+', <strong>libera la reserva de dominio</strong> y cualesquiera garantías constituidas a su favor sobre el vehículo, y deja sin efecto la fianza y demás garantías personales otorgadas. El vehículo queda en plena propiedad del Comprador, libre de gravámenes frente a Pagasi, y los dispositivos telemáticos instalados pasan en propiedad al Comprador sin contraprestación adicional. Pagasi otorgará los documentos y prestará la colaboración necesaria para el traspaso ante el Instituto Nacional de Transporte Terrestre (INTT), dentro de los <strong>treinta (30) días hábiles</strong> siguientes a la emisión de esta constancia.')
    : ('En virtud del cumplimiento íntegro de las obligaciones derivadas del contrato, y en ejercicio de la opción a compra prevista en la <strong>Cláusula Séptima</strong> del mismo, <strong>'+V(e.nom,160)+'</strong> declara resuelto el vínculo arrendaticio y procederá a realizar el <strong>traspaso legal de la propiedad</strong> del vehículo descrito a favor de <strong>'+V(D.cliNom,150)+'</strong>, dentro de los <strong>treinta (30) días hábiles</strong> siguientes a la emisión del presente documento, previo cumplimiento de los trámites correspondientes ante el Instituto Nacional de Transporte Terrestre (INTT).');

  var cierre = venta
    ? ('En consecuencia, <strong>'+V(D.cliNom,150)+'</strong> nada queda a deber a Pagasi por concepto alguno derivado del Contrato N° '+esc(c.id)+', sirviendo el presente documento como el más amplio y eficaz finiquito entre las partes.')
    : ('En consecuencia, una vez perfeccionado el traspaso, <strong>'+V(D.cliNom,150)+'</strong> quedará como <strong>único y legítimo propietario</strong> del vehículo, sin que subsistan obligaciones económicas o contractuales pendientes entre las partes derivadas del contrato N° '+esc(c.id)+'.');

  var resumen = venta
    ? fila('Inicial pagada:', dinero(c.ini))
      + fila('Cuotas quincenales canceladas:', esc(D.cuotas)+' de '+esc(D.cuotas))
      + fila('Total abonado en cuotas:', dinero(D.pagado))
      + fila('Monto total del crédito:', dinero(D.total))
      + fila('Fecha de celebración:', V(fechaLarga(c.fecha),120))
      + '<tr style="background:'+azL+'"><td style="padding:9px 10px;font-size:11.5px;font-weight:800;color:'+azD+'">Fecha de cancelación total:</td>'
      + '<td style="padding:9px 10px;text-align:right;font-weight:900;color:'+azD+'">'+V(fechaLarga(D.fechaFin),120)+'</td></tr>'
    : fila('Depósito inicial pagado:', dinero(c.ini))
      + fila('Cánones quincenales cancelados:', esc(D.cuotas)+' de '+esc(D.cuotas))
      + fila('Total abonado en cánones:', dinero(D.pagado))
      + fila('Monto total del contrato:', dinero(D.total))
      + fila('Fecha de inicio del contrato:', V(fechaLarga(c.fecha),120))
      + fila('Fecha de cancelación total:', V(fechaLarga(D.fechaFin),120))
      + '<tr style="background:'+azL+'"><td style="padding:9px 10px;font-size:11.5px;font-weight:800;color:'+azD+'">Pago de opción a compra (Cláusula Séptima):</td>'
      + '<td style="padding:9px 10px;text-align:right;font-weight:900;color:'+azD+'">US$ 1,00</td></tr>';

  var firmaPagasi = '<div style="background:'+azL+';padding:14px 10px;border-radius:4px">'
    + '<div style="background:'+az+';color:#fff;font-weight:800;font-size:11.5px;padding:5px 8px;border-radius:3px;margin-bottom:56px;text-align:center">'
    +   (venta ? 'POR PAGASI' : 'POR EL ARRENDADOR') + '</div>'
    + '<div style="border-top:1px solid #333;padding-top:6px;font-size:10.5px;text-align:center;line-height:1.6">'
    +   '<strong>'+V(e.nom,140)+'</strong><br>RIF '+V(e.rif,90)+'</div></div>';
  var firmaCliente = '<div style="background:'+azL+';padding:14px 10px;border-radius:4px">'
    + '<div style="background:'+az+';color:#fff;font-weight:800;font-size:11.5px;padding:5px 8px;border-radius:3px;margin-bottom:10px;text-align:center">'
    +   (venta ? 'EL COMPRADOR' : 'EL EX-ARRENDATARIO / NUEVO PROPIETARIO') + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 60px;gap:8px;align-items:end">'
    +   '<div style="text-align:center;padding-top:46px"><div style="border-top:1px solid #333;padding-top:6px;font-size:10px;line-height:1.5">'
    +     'Firma<br>Nombre: '+V(D.cliNom,110)+'<br>C.I.: '+V(D.cliCed,80)+'</div></div>'
    +   '<div><div style="border:1px dashed #666;background:#fff;height:70px;border-radius:3px"></div>'
    +   '<div style="text-align:center;font-size:9px;color:#555;margin-top:3px;font-weight:700">HUELLA</div></div></div></div>';

  var pie = [V(e.nom,120), e.rif ? 'RIF '+esc(e.rif) : '', esc(e.dir||''), esc(e.tel||''), esc(e.email||'')]
    .filter(function(x){ return x; }).join(' · ');

  return '<div id="finiquito-doc" style="font-family:\'Nunito Sans\',\'Segoe UI\',Roboto,Arial,sans-serif;color:#1f2937;background:#fff;max-width:820px;margin:0 auto;padding:22px 26px 18px">'
    // Membrete: logo a la izquierda, referencia a la derecha (igual que el contrato)
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    +   (logo ? '<img src="'+logo+'" style="height:40px;object-fit:contain">' : '<div style="font-size:20px;font-weight:900;color:'+az+'">'+V(e.nom,120)+'</div>')
    +   '<div style="font-size:10.5px;color:#555;text-align:right;line-height:1.7">'
    +     '<strong>Documento N°:</strong> FIN-'+esc(c.id)+'<br><strong>Fecha de emisión:</strong> <strong>'+hoy+'</strong></div></div>'
    + '<div style="background:'+az+';color:#fff;text-align:center;padding:10px 14px;border-radius:4px;border-bottom:3px solid '+azD+'">'
    +   '<div style="font-size:14px;font-weight:900;letter-spacing:.3px">'+titulo+'</div>'
    +   '<div style="font-size:10.5px;margin-top:3px;opacity:.9">'+bajada+'</div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:14px 0 10px;font-size:11.5px">'
    +   '<div><strong style="color:'+az+'">Ciudad / Estado:</strong> '+V(e.ciudad,90)+'</div>'
    +   '<div style="text-align:right"><strong style="color:'+az+'">Ref. Contrato:</strong> '+esc(c.id)+'</div></div>'
    + '<div style="border-bottom:1px solid #DBEAFE;margin-bottom:6px"></div>'
    + '<p style="'+p+'">'+relato+'</p>'

    + '<h3 style="'+h3+'">Vehículo objeto del contrato</h3>'
    + '<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #DBEAFE">'
    +   '<tr><td style="'+lbl+';width:22%">Modelo:</td><td style="'+val+';width:28%">'+V(D.modelo,120)+'</td>'
    +       '<td style="'+lbl+';width:22%">Color:</td><td style="'+val+'">'+V(D.color,90)+'</td></tr>'
    +   '<tr><td style="'+lbl+'">Año:</td><td style="'+val+'">'+V(D.anio,60)+'</td>'
    +       '<td style="'+lbl+'">Placa:</td><td style="'+val+'">'+V(D.placa,90)+'</td></tr>'
    +   '<tr><td style="'+lbl+'">Serial de chasis / VIN:</td><td colspan="3" style="'+val+'">'+V(D.serial,180)+'</td></tr>'
    + '</table>'

    + '<h3 style="'+h3+'">'+(venta ? 'Resumen del crédito cancelado' : 'Resumen del arrendamiento cancelado')+'</h3>'
    + '<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #DBEAFE">'+resumen+'</table>'

    + '<h3 style="'+h3+'">'+(venta ? 'Declaración de cancelación total' : 'Declaración de finalización')+'</h3>'
    + '<div style="background:#F0FFF4;border:1px solid #4CAF50;border-left:4px solid #2E7D32;border-radius:4px;padding:12px 14px;margin-top:6px">'
    +   '<p style="'+p+';margin:0">'+declaracion+'</p></div>'
    + '<p style="'+p+'">'+cierre+'</p>'

    + '<div style="margin-top:24px;border-top:2px solid '+az+';padding-top:18px;page-break-inside:avoid">'
    +   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+firmaPagasi+firmaCliente+'</div></div>'
    + '<div style="margin-top:20px;padding-top:10px;border-top:1px solid #DBEAFE;text-align:center;font-size:9.5px;color:#64748b;line-height:1.6">'
    +   pie + '<br>' + titulo + ' · Documento N° FIN-'+esc(c.id)+'</div>'
    + '</div>';
}

function abrirFiniquito(credId){
  var D = _finiquitoDatos(credId); if(!D) return;
  // El mismo aviso que al imprimir un contrato: si la ficha de la empresa no se
  // pudo leer, este papel sale sin nombre ni RIF y no se puede entregar.
  if(typeof _avisarEmpresaContrato==='function') _avisarEmpresaContrato();
  setMicon('detalle');
  $('mtt').textContent = D.venta ? '¡Crédito cancelado!' : '¡Contrato Finalizado!';
  $('msb').textContent = D.cliNom + (D.venta ? ' pagó la totalidad de su crédito' : ' completó su arrendamiento');
  $('modal-box').className='modal modal-lg';
  $('mbd').innerHTML = '<div style="text-align:center;padding:14px 0 18px">'
    + '<div style="font-size:18px;font-weight:900;color:var(--p1);margin-bottom:4px">'+D.cliNom+'</div>'
    + '<div style="font-size:13px;color:var(--ink3)">'
    +   (D.venta ? 'ha pagado íntegramente el Monto Total Adeudado' : 'ha cancelado la totalidad de los cánones del arrendamiento')
    + '</div></div>'
    + _htmlFiniquito(D.c.id);
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>'
    + '<button class="btn btn-p" onclick="imprimirFiniquito()">Imprimir / Guardar PDF</button>';
  $('ov').style.display='flex';
}

function imprimirFiniquito(){
  var doc=$('finiquito-doc');
  if(!doc){window.print();return;}
  // Usa la ventana unificada Pagasi (Nunito + azul); el doc trae su propio membrete
  _abrirVentanaImpresion('Constancia de Finalización', doc.outerHTML, {sinHeader:true});
}

// ══════════════════════════════════════════
// GENERACIÓN DE REPORTES (imprime como PDF)
// ══════════════════════════════════════════

// Ventana de impresión con la identidad Pagasi — MISMO diseño que el
// Reporte Mensual (barra degradada, logo, sello CONFIDENCIAL, pie).
// TODOS los reportes del sistema salen por aquí para verse iguales.
// opts.sinHeader: true cuando el contenido ya trae su propio membrete (contratos, finiquito).
function _abrirVentanaImpresion(titulo, htmlContenido, opts){
  opts = opts || {};
  var logo = (typeof _PAGASI_LOGO_BLUE!=='undefined'&&_PAGASI_LOGO_BLUE) || ((document.querySelector('.sb-logo img')||{}).src||'');
  var nombreEmp = (typeof $==='function' && $('cfg_empresa') && $('cfg_empresa').value) || 'Pagasi';
  var genStr = new Date().toLocaleString('es-VE');
  var fonts = '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">';
  var w = window.open('','_blank','width=900,height=720');
  if(!w){ if(typeof toast==='function') toast('Habilita las ventanas emergentes para ver el reporte','error'); return; }
  if(opts.sinHeader){
    // Contenido con membrete propio (contratos, finiquito): shell simple Nunito
    var cssS = '*{box-sizing:border-box}@page{size:Letter;margin:12mm}body{font-family:\'Nunito\',\'Nunito Sans\',system-ui,Arial,sans-serif;padding:32px;color:#1f2937;font-size:12px;line-height:1.7;-webkit-print-color-adjust:exact;print-color-adjust:exact}@media print{body{padding:0}button{display:none!important}}';
    w.document.write('<html><head><title>'+titulo+'</title>'+fonts+'<style>'+cssS+'</style></head><body>'+htmlContenido
      +'<br><button onclick="window.print()" style="background:#2563EB;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;margin-top:16px;font-family:inherit;font-weight:700">Imprimir / Guardar PDF</button>'
      +'<script>setTimeout(function(){window.print();},600);<\/script></body></html>');
    w.document.close();
    return;
  }
  var wmSvg = "<svg xmlns='http://www.w3.org/2000/svg' width='430' height='320'><text x='215' y='175' transform='rotate(-26 215 160)' font-family='Arial,sans-serif' font-size='30' font-weight='800' fill='rgba(37,99,235,0.07)' text-anchor='middle'>CONFIDENCIAL</text></svg>";
  var wmUrl = "data:image/svg+xml;utf8,"+encodeURIComponent(wmSvg);
  var css = '*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'@page{size:A4;margin:13mm 11mm}'
    +"body{background:#eef1f7;font-family:'Nunito Sans',system-ui,-apple-system,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;padding:22px 0}"
    +".rp{max-width:820px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.08);background-image:url('"+wmUrl+"');background-repeat:repeat}"
    +".rp-bar{height:7px;background:linear-gradient(90deg,#1D4ED8 0%,#2563EB 55%,#60A5FA 100%)}"
    +".rp-head{padding:22px 34px 18px;border-bottom:2px solid #1D4ED8;position:relative;background:rgba(255,255,255,.92)}"
    +".rp-conf{position:absolute;top:18px;right:34px;background:#fde8ec;color:#b91c1c;border:1px solid #f5c2cb;font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;padding:4px 11px;border-radius:5px}"
    +".rp-lh{display:flex;align-items:center;gap:15px}.rp-logo{height:40px;width:auto;display:block}"
    +".rp-lh-co{border-left:1px solid #d6dbe3;padding-left:15px}.rp-lh-n{font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;color:#1D4ED8}.rp-lh-s{font-size:8.5px;color:#8a93a3;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-top:3px}"
    +".rp-title-row{margin-top:15px}"
    +".rp-kicker{font-size:9.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#9ca3af}"
    +".rp-title{font-family:'Nunito',sans-serif;font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-.5px;margin:3px 0 0}"
    +".rp-range{font-size:12px;color:#6b7280;margin-top:4px}"
    +".rp-body{padding:24px 34px 28px}"
    // Estilos del contenido genérico (h2/h3/table) mapeados al look .rp
    +".rp-body h2{display:none}" // el título ya va en el header del shell
    +".rp-body h3{font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;color:#1D4ED8;border-bottom:2px solid #1D4ED8;padding-bottom:6px;margin:22px 0 12px;break-after:avoid}"
    +".rp-body h3:first-of-type{margin-top:0}"
    +".rp-body table{width:100%;border-collapse:collapse;margin-bottom:6px}"
    +".rp-body th{padding:8px 7px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.03em;font-weight:800;background:#f8fafc;word-break:break-word}"
    +".rp-body td{padding:6px 7px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#374151;word-break:break-word;overflow-wrap:anywhere}"
    +".rp-body tr{break-inside:avoid}"
    +".ar{display:grid;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:11px}"
    +".ah{display:grid;padding:5px 0;border-bottom:2px solid #1D4ED8;font-weight:800;font-size:10.5px;text-transform:uppercase;color:#1D4ED8}"
    +".pd{opacity:0.45;text-decoration:line-through}"
    +".rp-note{background:#f8fafc;border:1px solid #e5e7eb;border-left:3px solid #b91c1c;border-radius:10px;padding:14px 16px;margin-top:18px;break-inside:avoid}.rp-note-t{font-size:10px;font-weight:900;color:#b91c1c;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}.rp-note-b{font-size:11px;color:#6b7280;line-height:1.6}"
    +".rp-foot{padding:15px 34px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9ca3af;font-weight:700;flex-wrap:wrap;gap:6px}"
    +".rp-actions{max-width:820px;margin:14px auto 0;text-align:center}"
    +"@media print{body{background:#fff;padding:0}.rp{box-shadow:none;border-radius:0;max-width:none}.rp-actions{display:none!important}}";
  var html = '<!DOCTYPE html><html lang="es-VE"><head><meta charset="UTF-8"><title>'+titulo+' · Pagasi</title>'+fonts+'<style>'+css+'</style></head><body>'
    +'<div class="rp">'
      +'<div class="rp-bar"></div>'
      +'<div class="rp-head">'
        +'<div class="rp-conf">Confidencial</div>'
        +'<div class="rp-lh">'
          +(logo?'<img class="rp-logo" src="'+logo+'" alt="Pagasi">':'')
          +'<div class="rp-lh-co"><div class="rp-lh-n">'+nombreEmp+'</div><div class="rp-lh-s">Sistema de Gestión de Crédito</div></div>'
        +'</div>'
        +'<div class="rp-title-row">'
          +'<div class="rp-kicker">Reporte</div>'
          +'<div class="rp-title">'+titulo+'</div>'
          +'<div class="rp-range">Generado: '+genStr+'</div>'
        +'</div>'
      +'</div>'
      +'<div class="rp-body">'+htmlContenido
        +'<div class="rp-note"><div class="rp-note-t">Documento confidencial</div><div class="rp-note-b">Este reporte contiene información financiera reservada de '+nombreEmp+'. Prohibida su divulgación, copia o distribución total o parcial sin autorización. Generado en tiempo real desde el sistema Pagasi.</div></div>'
      +'</div>'
      +'<div class="rp-foot"><span>'+nombreEmp+' · '+titulo+'</span><span>Confidencial · '+genStr+'</span></div>'
    +'</div>'
    +'<div class="rp-actions"><button onclick="window.print()" style="background:#2563EB;color:#fff;border:none;padding:9px 22px;border-radius:7px;cursor:pointer;font-size:13px;font-family:inherit;font-weight:800">Imprimir / Guardar PDF</button></div>'
    +'<script>setTimeout(function(){window.print();},650);<\/script></body></html>';
  w.document.write(html);
  w.document.close();
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD FINANZAS (primera pestaña de Finanzas)
// Indicadores de cartera con separación principal / interés,
// filtro global de fechas y reporte detallado por indicador.
// El filtro de fechas define el COHORTE: créditos originados en el
// rango + cuotas cobradas en el rango. Los saldos son al día de hoy.
// ══════════════════════════════════════════════════════════════
function _dfDatos(){
  var desde = S.dfDesde||'', hasta = S.dfHasta||'';
  var enR = function(f){ f = String(f||'').slice(0,10); if(desde && f < desde) return false; if(hasta && f > hasta) return false; return true; };
  // Créditos originados en el rango (cancelados no cuentan: la venta se anuló)
  var creds = _concFiltrar(S.creds||[]).filter(function(c){ return c && !c.eliminado && c.estado!=='cancelado' && enR(c.fecha); });
  var activos = creds.filter(function(c){ return c.estado==='activo'||c.estado==='mora'; });
  var principal = function(c){ var p=parseFloat(c.precio)||0, i=parseFloat(c.ini)||0; return Math.max(0, p-i); };
  var totalPI = function(c){ var t=parseFloat(c.total)||0; if(t>0) return t; var f=principal(c); var fac=parseFloat(c.factor)||((typeof PLAN!=='undefined'&&PLAN.factor)||2.102343121528029); return f*fac; };
  var interes = function(c){ return Math.max(0, totalPI(c)-principal(c)); };
  var saldo = function(c){ return (typeof getCreditoSaldoPendiente==='function') ? (getCreditoSaldoPendiente(c)||0) : 0; };
  var sum = function(arr, fn){ return arr.reduce(function(a,c){ return a+fn(c); },0); };
  // Cuotas cobradas en el rango (sin iniciales), divididas principal/interés
  // proporcionalmente al plan de cada crédito (principal/total)
  var pagos = _concFiltrar(S.pagos||[]).filter(function(p){ return p && !p.eliminado && p.estado==='confirmado' && !p.esInicial && p.tipoOperacion!=='inicial_credito' && enR(p.fecha); });
  var credIdx = {}; (S.creds||[]).forEach(function(c){ if(c) credIdx[c.id]=c; });
  var cuotasTot=0, cuotasPrin=0, cuotasInt=0;
  pagos.forEach(function(p){
    var m = parseFloat(p.monto)||0; cuotasTot += m;
    var c = credIdx[p.cred]; var ratio = 0;
    if(c){ var pr=principal(c), tt=totalPI(c); ratio = tt>0 ? pr/tt : 0; }
    cuotasPrin += m*ratio; cuotasInt += m*(1-ratio);
  });
  // Iniciales cobradas en el rango
  var iniciales = _concFiltrar(S.pagos||[]).filter(function(p){ return p && !p.eliminado && p.estado==='confirmado' && (p.esInicial||p.tipoOperacion==='inicial_credito') && enR(p.fecha); });
  var inicialesTot = iniciales.reduce(function(a,p){ return a+(parseFloat(p.monto)||0); },0);
  // Split del saldo pendiente en principal/interés (proporcional al plan de cada crédito)
  var saldoPrin = function(c){ var tt=totalPI(c); var r=tt>0?principal(c)/tt:0; return saldo(c)*r; };
  var saldoInt = function(c){ return Math.max(0, saldo(c)-saldoPrin(c)); };
  // Mora (dentro del cohorte) + aging
  var enMora = activos.filter(function(c){ return (parseFloat(c.mora)||0) > 0; });
  var aging = [
    {lbl:'1–15 días',  arr:enMora.filter(function(c){ var m=parseFloat(c.mora)||0; return m>0&&m<=15; })},
    {lbl:'16–30 días', arr:enMora.filter(function(c){ var m=parseFloat(c.mora)||0; return m>15&&m<=30; })},
    {lbl:'31–60 días', arr:enMora.filter(function(c){ var m=parseFloat(c.mora)||0; return m>30&&m<=60; })},
    {lbl:'+60 días',   arr:enMora.filter(function(c){ var m=parseFloat(c.mora)||0; return m>60; })}
  ].map(function(b){ return {lbl:b.lbl, n:b.arr.length, saldo:sum(b.arr,saldo)}; });
  var totPI = sum(creds,totalPI);
  var cxcTot = sum(creds,saldo);
  var completados = creds.filter(function(c){ return c.estado==='completado'; }).length;
  var recuperados = creds.filter(function(c){ return c.estado==='recuperado'||c.estado==='recuperada'; }).length;
  return {
    desde:desde, hasta:hasta, enR:enR, credIdx:credIdx,
    creds:creds, activos:activos, enMora:enMora, pagos:pagos,
    principal:principal, totalPI:totalPI, interes:interes, saldo:saldo,
    finTotal:sum(creds,principal), finActivos:sum(activos,principal),
    cxcTotal:cxcTot, cxcActivos:sum(activos,saldo),
    cxcPrin:sum(creds,saldoPrin), cxcInt:sum(creds,saldoInt),
    cxcActPrin:sum(activos,saldoPrin), cxcActInt:sum(activos,saldoInt),
    intTotal:sum(creds,interes), totPI:totPI,
    pctRecuperado: totPI>0 ? ((totPI-cxcTot)/totPI*100) : 0,
    ticketProm: creds.length ? (sum(creds,principal)/creds.length) : 0,
    cuotaProm: activos.length ? (sum(activos,function(c){ return parseFloat(c.cuotaQ||c.cuota)||0; })/activos.length) : 0,
    nOrig:creds.length, nOrigAct:activos.length, nCompletados:completados, nRecuperados:recuperados,
    cuotasTot:cuotasTot, cuotasPrin:cuotasPrin, cuotasInt:cuotasInt,
    inicialesTot:inicialesTot, nIniciales:iniciales.length,
    nMora:enMora.length, moraBalance:sum(enMora,saldo),
    moraInt:sum(enMora,function(c){ return parseFloat(c.moraMonto)||0; }),
    pctMora: activos.length ? (enMora.length/activos.length*100) : 0,
    aging:aging
  };
}

// Presets rápidos de fecha para el Dashboard Finanzas
function _dfRangoPreset(key){
  var hoy = hoyLocalISO();
  if(key==='hoy') return { desde:hoy, hasta:hoy };
  if(key==='quincena'){ var r=_concRangoDe('quincena', hoy); return { desde:r.desde, hasta:r.hasta }; }
  if(key==='mes'){ var m=_concRangoDe('mes', hoy); return { desde:m.desde, hasta:m.hasta }; }
  if(key==='mes_pasado'){
    var d0 = new Date(); var prev = new Date(d0.getFullYear(), d0.getMonth()-1, 15);
    var mp = _concRangoDe('mes', fechaLocalISO(prev)); return { desde:mp.desde, hasta:mp.hasta };
  }
  if(key==='ano'){ var a=_concRangoDe('ano', hoy); return { desde:a.desde, hasta:a.hasta }; }
  return { desde:'', hasta:'' }; // todo
}
function dfPreset(key){
  var r = _dfRangoPreset(key);
  S.dfDesde = r.desde; S.dfHasta = r.hasta;
  S.reportesTab = 'dashfin';
  nav('reportes');
}

function _renderDashFin(){
  var d = _dfDatos();
  var perLbl = (d.desde||d.hasta) ? ((d.desde||'inicio')+' → '+(d.hasta||'hoy')) : 'Todo el histórico';
  // Chips de preset (se marca el activo comparando el rango actual)
  var presetChips = [['hoy','Hoy'],['quincena','Esta quincena'],['mes','Este mes'],['mes_pasado','Mes pasado'],['ano','Este año'],['todo','Todo']].map(function(p){
    var r = _dfRangoPreset(p[0]);
    var on = (d.desde===r.desde && d.hasta===r.hasta);
    return '<button class="btn btn-sm '+(on?'btn-p':'btn-g')+'" onclick="dfPreset(\''+p[0]+'\')" style="font-size:11px;padding:5px 12px">'+p[1]+'</button>';
  }).join('');
  // Card profesional: valor grande + qué es + desglose + botón de reporte
  var card = function(o){
    return '<div class="card" style="padding:16px 18px;display:flex;flex-direction:column;border-top:3px solid '+(o.color||'var(--p1)')+'">'
      + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:var(--ink3);margin-bottom:8px">'+o.lbl+'</div>'
      + '<div style="font-family:var(--fd);font-weight:900;font-size:28px;letter-spacing:-1px;line-height:1;color:'+(o.color||'var(--ink)')+'">'+o.valor+'</div>'
      + (o.chips?'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">'+o.chips.map(function(ch){
          return '<span style="background:var(--surf2);border:1px solid var(--rim2);border-radius:20px;padding:3px 10px;font-size:10.5px;font-weight:700;color:var(--ink2)">'+ch[0]+' <b style="font-family:var(--fd);color:'+(ch[2]||'var(--ink)')+'">'+ch[1]+'</b></span>';
        }).join('')+'</div>':'')
      + '<div style="font-size:11px;color:var(--ink3);line-height:1.55;margin-top:10px;flex:1">'+o.desc+'</div>'
      + '<div style="border-top:1px solid var(--rim2);margin-top:12px;padding-top:10px">'
      + '<div style="font-size:9.5px;color:var(--ink3);font-weight:700;margin-bottom:6px">Reporte detallado — crédito por crédito</div>'
      + '<div style="display:flex;gap:6px">'
      + '<button class="btn btn-g btn-sm" style="flex:1;justify-content:center" onclick="dfReporte(\''+o.rep+'\',\'pdf\')">📄 PDF</button>'
      + '<button class="btn btn-g btn-sm" style="flex:1;justify-content:center" onclick="dfReporte(\''+o.rep+'\',\'excel\')">⬇ Excel</button>'
      + '</div></div></div>';
  };
  var secTitle = function(t, s){
    return '<div style="display:flex;align-items:baseline;gap:10px;margin:22px 0 10px">'
      + '<div style="font-size:14px;font-weight:900;color:var(--ink);letter-spacing:-.3px">'+t+'</div>'
      + '<div style="font-size:11px;color:var(--ink3)">'+s+'</div>'
      + '<div style="flex:1;height:1px;background:var(--rim)"></div>'
      + '</div>';
  };
  var pct = function(v){ return (Math.round(v*10)/10).toFixed(1).replace('.0','')+'%'; };
  var maxAging = Math.max(1, Math.max.apply(null, d.aging.map(function(b){ return b.saldo; })));
  return ''
    // ══ Barra de filtro global ══
    + '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:12px;padding:13px 16px;box-shadow:var(--shadow);margin-bottom:16px">'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
      + '<div style="font-size:9.5px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px">Período:</div>'
      + presetChips
      + '<div style="margin-left:auto;text-align:right"><div style="font-size:9.5px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px">Cohorte</div>'
      + '<div style="font-size:13px;font-weight:900;color:var(--p1)">'+perLbl+'</div>'
      + '<div style="font-size:10.5px;color:var(--ink3)">'+d.nOrig+' créditos · '+d.nOrigAct+' activos · '+d.nCompletados+' completados · '+d.nRecuperados+' recuperados</div></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--rim2)">'
      + '<span style="font-size:10.5px;color:var(--ink3);font-weight:700">O elige un rango exacto:</span>'
      + '<label style="font-size:11px;color:var(--ink3);font-weight:700">Desde</label>'
      + '<input type="date" value="'+(d.desde||'')+'" onchange="S.dfDesde=this.value;S.reportesTab=\'dashfin\';nav(\'reportes\')" style="border:1px solid var(--rim);border-radius:8px;padding:6px 9px;font-size:12.5px;font-family:var(--f);background:var(--surf);color:var(--ink)">'
      + '<label style="font-size:11px;color:var(--ink3);font-weight:700">Hasta</label>'
      + '<input type="date" value="'+(d.hasta||'')+'" onchange="S.dfHasta=this.value;S.reportesTab=\'dashfin\';nav(\'reportes\')" style="border:1px solid var(--rim);border-radius:8px;padding:6px 9px;font-size:12.5px;font-family:var(--f);background:var(--surf);color:var(--ink)">'
      + ((d.desde||d.hasta)?'<button class="btn btn-g btn-sm" onclick="S.dfDesde=\'\';S.dfHasta=\'\';S.reportesTab=\'dashfin\';nav(\'reportes\')">✕ Limpiar</button>':'')
      + '<span style="font-size:10.5px;color:var(--ink3);margin-left:auto">Aplica a originación y cobros · saldos al día de hoy</span>'
    + '</div>'
    + '</div>'

    // ══ SECCIÓN 1: ORIGINACIÓN ══
    + secTitle('Originación','Lo que colocaste en la calle — cohorte '+perLbl.toLowerCase())
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">'
    + card({lbl:'Créditos originados', valor:String(d.nOrig), color:'var(--ink)', rep:'orig',
        chips:[['Activos',String(d.nOrigAct),'var(--green)'],['Completados',String(d.nCompletados)],['Recuperados',String(d.nRecuperados),'var(--red)']],
        desc:'Cantidad de créditos otorgados en el período (los cancelados no cuentan: esa venta se anuló). Es tu volumen de colocación.'})
    + card({lbl:'Total financiado — principal', valor:fmt(d.finTotal), color:'var(--p1)', rep:'fin_total',
        chips:[['Ticket promedio',fmt(d.ticketProm)]],
        desc:'Capital que pusiste en la calle: precio de venta menos la inicial de cada crédito. Es el dinero tuyo que está trabajando.'})
    + card({lbl:'Interés pactado', valor:fmt(d.intTotal), color:'var(--amber)', rep:'orig',
        chips:[['Total a cobrar (P+I)',fmt(d.totPI)]],
        desc:'La ganancia acordada en los planes: lo que el cliente pagará por encima del principal. Principal + interés = todo lo que entra si pagan completo.'})
    + card({lbl:'Financiado — solo activos', valor:fmt(d.finActivos), color:'var(--p1)', rep:'fin_act',
        chips:[['Créditos activos',String(d.nOrigAct),'var(--green)'],['Cuota prom.',fmt(d.cuotaProm)]],
        desc:'El principal de los créditos que siguen vigentes (activos + en mora). Es tu exposición actual de capital.'})
    + '</div>'

    // ══ SECCIÓN 2: CUENTAS POR COBRAR ══
    + secTitle('Cuentas por cobrar','Lo que te deben hoy — saldo pendiente al día')
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">'
    + card({lbl:'CxC total — principal + interés', valor:fmt(d.cxcTotal), color:'var(--amber)', rep:'cxc_total',
        chips:[['Principal pend.',fmt(d.cxcPrin),'var(--p1)'],['Interés pend.',fmt(d.cxcInt),'var(--amber)']],
        desc:'Todo lo que falta por cobrar del cohorte (cuotas restantes de cada crédito, según el motor de amortización). Dividido en capital e interés pendiente.'})
    + card({lbl:'CxC solo activos — P+I', valor:fmt(d.cxcActivos), color:'var(--amber)', rep:'cxc_act',
        chips:[['Principal pend.',fmt(d.cxcActPrin),'var(--p1)'],['Interés pend.',fmt(d.cxcActInt),'var(--amber)']],
        desc:'Lo pendiente solo de créditos vigentes (activos + mora). Es tu cartera cobrable real — la que gestiona cobranza cada quincena.'})
    + card({lbl:'Recuperación del cohorte', valor:pct(d.pctRecuperado), color:'var(--green)', rep:'orig',
        chips:[['Cobrado (P+I)',fmt(d.totPI-d.cxcTotal),'var(--green)'],['Falta',fmt(d.cxcTotal),'var(--amber)']],
        desc:'Porcentaje del total a cobrar (P+I) que ya entró. Mientras más viejo el cohorte, más cerca de 100% debería estar.'})
    + '</div>'

    // ══ SECCIÓN 3: COBRADO EN EL RANGO ══
    + secTitle('Cobrado en el período','Dinero que entró en el rango de fechas — '+d.pagos.length+' cuotas + '+d.nIniciales+' iniciales')
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">'
    + card({lbl:'Cuotas cobradas — total', valor:fmt(d.cuotasTot), color:'var(--green)', rep:'cuotas',
        chips:[['Pagos',String(d.pagos.length)]],
        desc:'Suma de todas las cuotas confirmadas en el rango (no incluye iniciales). Es tu flujo de cobranza del período.'})
    + card({lbl:'Cuotas — porción principal', valor:fmt(d.cuotasPrin), color:'var(--p1)', rep:'cuotas',
        chips:[['% del cobro',pct(d.cuotasTot>0?d.cuotasPrin/d.cuotasTot*100:0)]],
        desc:'La parte de cada cuota que devuelve tu capital. Se calcula proporcional al plan de cada crédito (principal ÷ total).'})
    + card({lbl:'Cuotas — porción interés', valor:fmt(d.cuotasInt), color:'var(--amber)', rep:'cuotas',
        chips:[['% del cobro',pct(d.cuotasTot>0?d.cuotasInt/d.cuotasTot*100:0)]],
        desc:'La parte de cada cuota que es ganancia (interés). Este es el ingreso financiero real del período.'})
    + card({lbl:'Iniciales cobradas', valor:fmt(d.inicialesTot), color:'var(--green)', rep:'orig',
        chips:[['Iniciales',String(d.nIniciales)]],
        desc:'Cuotas iniciales recibidas en el rango. No son financiamiento: son el pago de entrada de cada moto.'})
    + '</div>'

    // ══ SECCIÓN 4: MORA ══
    + secTitle('Mora','Cartera con atraso — del cohorte filtrado')
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">'
    + card({lbl:'% de mora de la cartera', valor:pct(d.cxcActivos>0?d.moraBalance/d.cxcActivos*100:0), color:'var(--red)', rep:'mora',
        chips:[['Saldo en mora',fmt(d.moraBalance),'var(--red)'],['Cartera activa',fmt(d.cxcActivos)],['Por créditos',pct(d.pctMora),'var(--red)']],
        desc:'Qué porción de la cartera cobrable (CxC de créditos vigentes) está en manos de clientes atrasados. Es EL indicador de salud de la cartera: por debajo de 5% excelente, 5-15% vigilar, sobre 15% acción de cobranza urgente.'})
    + card({lbl:'Créditos en mora', valor:String(d.nMora), color:'var(--red)', rep:'mora',
        chips:[['Tasa de mora',pct(d.pctMora),'var(--red)'],['De '+d.nOrigAct+' activos','']],
        desc:'Créditos vigentes con al menos un día de atraso. La tasa de mora es sobre los créditos activos del cohorte.'})
    + card({lbl:'Balance en mora — P+I', valor:fmt(d.moraBalance), color:'var(--red)', rep:'mora',
        chips:[['% de la CxC activa',pct(d.cxcActivos>0?d.moraBalance/d.cxcActivos*100:0),'var(--red)']],
        desc:'Todo el saldo pendiente (principal + interés) de los créditos que están en mora. Es el capital en riesgo.'})
    + card({lbl:'Intereses por mora', valor:fmt(d.moraInt), color:'var(--red)', rep:'mora',
        desc:'Recargos acumulados por atraso registrados en los créditos morosos. Se cobran aparte de las cuotas.'})
    + '<div class="card" style="padding:16px 18px;border-top:3px solid var(--red)">'
      + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:var(--ink3);margin-bottom:10px">Antigüedad de la mora (aging)</div>'
      + d.aging.map(function(b){
          var w = Math.round(b.saldo/maxAging*100);
          return '<div style="margin-bottom:9px">'
            + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">'
            + '<span style="font-weight:700;color:var(--ink2)">'+b.lbl+'</span>'
            + '<span style="color:var(--ink3)">'+b.n+' créd. · <b style="font-family:var(--fd);color:var(--red)">'+fmt(b.saldo)+'</b></span></div>'
            + '<div style="height:7px;background:var(--rim);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+(b.saldo>0?Math.max(4,w):0)+'%;background:var(--red);border-radius:4px;opacity:'+(b.lbl==='+60 días'?'1':b.lbl==='31–60 días'?'.85':b.lbl==='16–30 días'?'.65':'.45')+'"></div></div>'
            + '</div>';
        }).join('')
      + '<div style="font-size:11px;color:var(--ink3);line-height:1.5;margin-top:6px;border-top:1px solid var(--rim2);padding-top:8px">Mientras más vieja la mora, más difícil de recuperar. Los de +60 días son candidatos a recuperación de la unidad.</div>'
    + '</div>'
    + '</div>'

    // ══ Nota metodológica ══
    + '<div style="font-size:11px;color:var(--ink3);background:var(--gs);border:1px solid var(--rim2);border-radius:10px;padding:11px 14px;line-height:1.6;margin-top:16px"><b style="color:var(--ink2)">Cómo se calcula:</b> Principal = precio de venta − inicial · Interés = total a pagar − principal · CxC = cuotas restantes según el motor de amortización (respeta pagos parciales y días de gracia) · La división principal/interés de cada cuota cobrada es proporcional al plan de su crédito · Los créditos cancelados quedan fuera del cohorte.</div>';
}

// ── Reporte detallado por indicador (PDF con membrete Pagasi) ──
// ── Generador de archivos .xlsx REALES sin librerías externas ──
// Construye el paquete OOXML y lo empaqueta en un ZIP (método "store", sin
// compresión) calculando el CRC-32 a mano. sheets = [{name, rows:[[celda,...]]}]
// donde cada celda es string o number.
function _xlsxDownload(filename, sheets){
  var enc = new TextEncoder();
  var colLetter = function(n){ var s=''; n++; while(n>0){ var m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; };
  var xesc = function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var sheetXml = function(rows){
    var out='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    for(var r=0;r<rows.length;r++){
      var cells=rows[r]||[];
      out+='<row r="'+(r+1)+'">';
      for(var c=0;c<cells.length;c++){
        var v=cells[c]; if(v===''||v==null) continue;
        var ref=colLetter(c)+(r+1);
        if(typeof v==='number' && isFinite(v)) out+='<c r="'+ref+'"><v>'+v+'</v></c>';
        else out+='<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xesc(v)+'</t></is></c>';
      }
      out+='</row>';
    }
    return out+'</sheetData></worksheet>';
  };
  var files=[];
  files.push({name:'[Content_Types].xml', data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map(function(s,i){return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';}).join('')+'</Types>'});
  files.push({name:'_rels/.rels', data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'});
  files.push({name:'xl/workbook.xml', data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map(function(s,i){return '<sheet name="'+xesc((s.name||('Hoja'+(i+1))).slice(0,31))+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>';}).join('')+'</sheets></workbook>'});
  files.push({name:'xl/_rels/workbook.xml.rels', data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map(function(s,i){return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>';}).join('')+'</Relationships>'});
  sheets.forEach(function(s,i){ files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml', data:sheetXml(s.rows||[])}); });
  // CRC-32
  var crcT=(function(){ var t=new Uint32Array(256); for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } return t; })();
  var crc32=function(b){ var c=0xFFFFFFFF; for(var i=0;i<b.length;i++) c=crcT[(c^b[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  var u16=function(n){ return [n&0xFF,(n>>>8)&0xFF]; };
  var u32=function(n){ return [n&0xFF,(n>>>8)&0xFF,(n>>>16)&0xFF,(n>>>24)&0xFF]; };
  var chunks=[], central=[], offset=0;
  files.forEach(function(f){
    var nb=enc.encode(f.name), db=enc.encode(f.data), crc=crc32(db);
    var lh=[].concat(u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0));
    chunks.push(new Uint8Array(lh),nb,db);
    var ch=[].concat(u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(db.length),u32(db.length),u16(nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset));
    central.push(new Uint8Array(ch),nb);
    offset += lh.length + nb.length + db.length;
  });
  var cSize=central.reduce(function(a,c){return a+c.length;},0);
  central.forEach(function(c){ chunks.push(c); });
  chunks.push(new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cSize),u32(offset),u16(0))));
  var blob=new Blob(chunks,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// formato: 'pdf' (default) o 'excel'
function dfReporte(key, formato){
  var d = _dfDatos();
  var perLbl = (d.desde||d.hasta) ? ((d.desde||'inicio')+' → '+(d.hasta||'hoy')) : 'Todo el histórico';
  var titulos = {
    fin_total:'Total financiado (principal)', cxc_total:'Cuentas por cobrar (principal + interés)',
    fin_act:'Total financiado — solo créditos activos', cxc_act:'Cuentas por cobrar — solo activos (P+I)',
    orig:'Créditos originados', orig_act:'Créditos originados activos',
    cuotas:'Cuotas cobradas (total, principal, interés)', mora:'Mora — créditos, balance e intereses'
  };
  var titulo = titulos[key]||'Reporte';
  var cobradoDe = function(credId){
    return (S.pagos||[]).filter(function(p){ return p && !p.eliminado && p.estado==='confirmado' && !p.esInicial && p.tipoOperacion!=='inicial_credito' && p.cred===credId; })
      .reduce(function(a,p){ return a+(parseFloat(p.monto)||0); },0);
  };
  // Construir secciones de datos (estructura común para PDF y Excel)
  // sección = { titulo, headers:[...], rows:[[...]], total:[...], nums:[índices de columnas numéricas] }
  var secciones = [];
  if(key==='cuotas'){
    var tot=0, tp=0, ti=0, rows=[];
    d.pagos.slice().sort(function(a,b){ return String(a.fecha||'').localeCompare(String(b.fecha||'')); }).forEach(function(p){
      var m=parseFloat(p.monto)||0; var c=d.credIdx[p.cred]; var ratio=0;
      if(c){ var pr=d.principal(c), tt=d.totalPI(c); ratio=tt>0?pr/tt:0; }
      var mp=m*ratio, mi=m*(1-ratio); tot+=m; tp+=mp; ti+=mi;
      // "Recibido en": como se cobro la cuota (Adam, 11-sep-2026). "N° Referencia":
      // el numero de la transferencia o comprobante (Adam, 14-sep-2026). Mismos datos
      // y mismos nombres que el formulario de pago. La referencia va como TEXTO para
      // que no se pierdan los ceros a la izquierda.
      rows.push([p.fecha||'', p.id, p.cred||'', p.cli||'', p.metodo||p.cuenta||'—', String(p.referencia||'').trim()||'—', m, mp, mi]);
    });
    secciones.push({ titulo:'Detalle de cuotas cobradas ('+d.pagos.length+')',
      headers:['Fecha','Pago','Crédito','Cliente','Recibido en','N° Referencia','Monto','Principal','Interés'],
      rows:rows, nums:[6,7,8], total:['TOTAL','','','','','',tot,tp,ti] });
  } else if(key==='mora'){
    secciones.push({ titulo:'Resumen', headers:['Créditos en mora','Balance en mora (P+I)','Intereses por mora'],
      rows:[[d.nMora, d.moraBalance, d.moraInt]], nums:[1,2] });
    var estadoLbl = function(c){
      if(typeof _notaCobranzaOpt==='function'){ var o=_notaCobranzaOpt(c.cobranzaStatus||''); return (o&&o.v)?o.t:'—'; }
      return c.cobranzaStatus||'—';
    };
    var sedeDe = function(c){
      if(!c.concesionarioId || typeof _concGetById!=='function') return '—';
      var cc=_concGetById(c.concesionarioId); return (cc&&cc.nombre)||'—';
    };
    var morosos = d.enMora.slice().sort(function(a,b){ return (parseFloat(b.mora)||0)-(parseFloat(a.mora)||0); });
    var rowsM=[];
    morosos.forEach(function(c){
      var cl=(S.clientes||[]).find(function(x){ return x && ((c.clienteId&&String(x.id)===String(c.clienteId))||x.nombre===c.cli); })||{};
      var cv=Math.ceil((parseFloat(c.mora)||0)/15);
      var gest=Array.isArray(c.gestiones)?c.gestiones:[];
      rowsM.push([c.id, c.cli||'', cl.tel||'', sedeDe(c), c.modelo||'', (parseFloat(c.mora)||0), (parseFloat(c.cuotaQ||c.cuota)||0), cv, d.saldo(c), estadoLbl(c), gest.length?gest.length:'—']);
    });
    secciones.push({ titulo:'Detalle ('+d.enMora.length+') — el historial de gestiones está en la sección siguiente',
      headers:['Crédito','Cliente','Teléfono','Sede','Modelo','Días','Cuota','C. venc.','Saldo (P+I)','Estado de gestión','Gest.'],
      rows:rowsM, nums:[6,8], total:['TOTAL','','','','','','','',d.moraBalance,'',''] });
    // ── Historial completo de gestiones de cobranza de los morosos ──
    var rowsG=[];
    morosos.forEach(function(c){
      (Array.isArray(c.gestiones)?c.gestiones.slice():[]).sort(function(a,b){ return String(b.creadoEn||b.fecha||'').localeCompare(String(a.creadoEn||a.fecha||'')); })
        .forEach(function(g){
          var res=String(g.resultado||'').trim(); if(res.length>90) res=res.slice(0,90)+'…';
          rowsG.push([c.id, c.cli||'', g.fecha||'', g.tipo||'', g.cobrador||'', res, g.fechaCompromiso||'']);
        });
    });
    if(rowsG.length){
      secciones.push({ titulo:'Gestiones de cobranza registradas ('+rowsG.length+')',
        headers:['Crédito','Cliente','Fecha','Tipo','Cobrador','Resultado','Compromiso'],
        rows:rowsG, nums:[] });
    }
    var sinGest = morosos.filter(function(c){ return !Array.isArray(c.gestiones)||!c.gestiones.length; }).length;
    if(sinGest){
      secciones.push({ titulo:'⚠ Morosos SIN ninguna gestión registrada ('+sinGest+')',
        headers:['Crédito','Cliente','Teléfono','Sede','Días mora','Saldo (P+I)'],
        rows:morosos.filter(function(c){ return !Array.isArray(c.gestiones)||!c.gestiones.length; }).map(function(c){
          var cl=(S.clientes||[]).find(function(x){ return x && ((c.clienteId&&String(x.id)===String(c.clienteId))||x.nombre===c.cli); })||{};
          return [c.id, c.cli||'', cl.tel||'', sedeDe(c), (parseFloat(c.mora)||0), d.saldo(c)];
        }), nums:[5] });
    }
    // ── Notas de los créditos morosos ──
    var rowsN = morosos.filter(function(c){ return String(c.notas||'').trim(); }).map(function(c){
      var n=String(c.notas||'').trim(); if(n.length>160) n=n.slice(0,160)+'…';
      return [c.id, c.cli||'', n];
    });
    if(rowsN.length){
      secciones.push({ titulo:'Notas de los créditos ('+rowsN.length+')',
        headers:['Crédito','Cliente','Nota'], rows:rowsN, nums:[] });
    }
  } else {
    var lista = (key==='fin_act'||key==='cxc_act'||key==='orig_act') ? d.activos : d.creds;
    var tf=0, tint=0, tpi=0, tcob=0, tsal=0, rowsC=[];
    lista.slice().sort(function(a,b){ return String(a.fecha||'').localeCompare(String(b.fecha||'')); }).forEach(function(c){
      var f=d.principal(c), inte=d.interes(c), tt=d.totalPI(c), cob=cobradoDe(c.id), sal=d.saldo(c);
      tf+=f; tint+=inte; tpi+=tt; tcob+=cob; tsal+=sal;
      rowsC.push([c.id, c.fecha||'', c.cli||'', c.estado||'', f, inte, tt, cob, sal]);
    });
    secciones.push({ titulo:'Detalle de créditos ('+lista.length+')',
      headers:['Crédito','Fecha','Cliente','Estado','Principal','Interés','Total (P+I)','Cobrado','Saldo'],
      rows:rowsC, nums:[4,5,6,7,8], total:['TOTAL','','','',tf,tint,tpi,tcob,tsal] });
  }

  // ── Excel (.xlsx real) ──
  if(formato==='excel'){
    var clean = function(r){ return r.map(function(v){ return (typeof v==='number' && isFinite(v)) ? Math.round(v*100)/100 : v; }); };
    var aoa = [];
    aoa.push(['PAGASI — '+titulo]);
    aoa.push(['Período', perLbl]);
    aoa.push(['Generado', new Date().toLocaleString('es-VE')]);
    secciones.forEach(function(sec){
      aoa.push([]);
      aoa.push([sec.titulo]);
      aoa.push(sec.headers);
      sec.rows.forEach(function(r){ aoa.push(clean(r)); });
      if(sec.total) aoa.push(clean(sec.total));
    });
    var slug = (titulo||'reporte').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    _xlsxDownload('finanzas-'+slug+'-'+hoyLocalISO()+'.xlsx', [{name:'Reporte', rows:aoa}]);
    if(typeof toast==='function') toast('Excel (.xlsx) exportado ✓','success');
    return;
  }

  // ── PDF (ventana Pagasi) ──
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var money = function(v){ return '$'+(parseFloat(v)||0).toFixed(2); };
  var html = '<h2>PAGASI — '+esc(titulo).toUpperCase()+'</h2>'
    + '<div style="text-align:center;font-size:11px;color:#555;margin-bottom:16px">Período: '+esc(perLbl)+' · Generado: '+new Date().toLocaleString('es-VE')+'</div>';
  secciones.forEach(function(sec){
    html += '<h3>'+esc(sec.titulo)+'</h3><table><tr>'+sec.headers.map(function(h){ return '<th>'+esc(h)+'</th>'; }).join('')+'</tr>';
    sec.rows.forEach(function(r){
      html += '<tr>'+r.map(function(v,i){ return '<td>'+(sec.nums.indexOf(i)>=0 ? money(v) : esc(v))+'</td>'; }).join('')+'</tr>';
    });
    if(sec.total){
      html += '<tr>'+sec.total.map(function(v,i){
        var content = (sec.nums.indexOf(i)>=0 && v!=='') ? money(v) : esc(v);
        return '<td style="font-weight:900">'+content+'</td>';
      }).join('')+'</tr>';
    }
    html += '</table>';
  });
  _abrirVentanaImpresion(titulo, html);
}

function descargarAmortPDF(){
  var credId = window._currentAmortCredId;
  if(!credId){ toast('Abre primero la tabla de amortización','error'); return; }
  var c = S.creds.find(function(x){return x.id===credId;});
  if(!c){ toast('Crédito no encontrado','error'); return; }
  var cl = S.clientes.find(function(x){return x.nombre===c.cli;}) || {};
  var emp = (typeof getEmpresa==='function') ? getEmpresa() : {nombre:'Pagasi',rif:'',ciudad:'Caracas',tel:'',email:'',direccion:''};

  // Datos canónicos
  var totalCuotas = getCreditoTotalCuotas(c);
  var cuota = getCreditoCuotaBase(c);
  var cuotasPag = getCreditoCuotasPagadas(c);
  var cuotasRest = Math.max(0, totalCuotas - cuotasPag);
  var pagosConf = getCreditoPagosConfirmados(c);
  var saldoPend = getCreditoSaldoPendiente(c);
  var pctPagado = (c.total||0) > 0 ? Math.round((pagosConf/(c.total))*100) : 0;

  // Fechas
  var fechaInicio = c.fecha || '—';
  var startDate = new Date((c.fecha||hoyLocalISO())+'T12:00:00');
  var fechaFin = new Date(startDate.getTime() + (totalCuotas*15*24*60*60*1000));
  var fechaFinStr = fechaFin.toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'});
  var proxFd = new Date(startDate.getTime() + ((cuotasPag+1)*15*24*60*60*1000));
  var proxFecha = cuotasPag<totalCuotas ? proxFd.toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'}) : '—';
  var hoy = new Date().toLocaleDateString('es-VE',{day:'numeric',month:'long',year:'numeric'});

  // Historial de pagos confirmados (desde S.pagos)
  var pagosDelCred = S.pagos.filter(function(p){ return !p.eliminado && p.cred===c.id; })
    .sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });

  // Tabla de amortización
  var tQ = PLAN.tasaMensual/100/2;
  var historial = c.pagosRegistrados||[];
  var pagosPorCuota = {};
  historial.forEach(function(h){
    if(!pagosPorCuota[h.cuota]) pagosPorCuota[h.cuota]=[];
    pagosPorCuota[h.cuota].push(h);
  });
  var _LA = saldosPorCuota(c);
  var saldoPorCuota = _LA.saldos;
  var sal = c.fin||0;
  var amortRows = '';
  for(var i=1;i<=totalCuotas;i++){
    var intMontoRaw = sal*tQ;
    var capMonto = cuota - intMontoRaw;
    sal = sal - capMonto;
    var estA = _LA.estados[i-1] || 'pendiente';
    var pd = estA==='pagada', parcialA = estA==='parcial', proxA = estA==='proxima';
    var fd = new Date(startDate.getTime()+(i*15*24*60*60*1000));
    var fechaStr = fd.toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric'});
    var estado = pd ? '✓ Pagada' : parcialA ? 'Parcial' : (proxA ? 'Próxima' : 'Pendiente');
    amortRows += '<tr style="'+(pd?'opacity:.55;background:#fafafa':parcialA?'background:#fff7ed':'')+'">'
      + '<td style="text-align:center;font-weight:700">'+i+'</td>'
      + '<td>'+fechaStr+'</td>'
      + '<td style="font-weight:'+(pd?'600':'700')+';color:'+(pd?'#999':parcialA?'#b45309':proxA?'#2563EB':'#111')+'">'+estado+'</td>'
      + '<td style="text-align:right;font-weight:700;color:'+(parcialA?'#b45309':'inherit')+'">'+(parcialA?fmt(saldoPorCuota[i-1])+' pend.':fmt(cuota))+'</td>'
      + '<td style="text-align:right;color:#b78a14">'+fmt(Math.max(0,intMontoRaw))+'</td>'
      + '<td style="text-align:right">'+fmt(Math.max(0,capMonto))+'</td>'
      + '<td style="text-align:right;color:#666">'+fmt(Math.max(0,sal))+'</td>'
      + '</tr>';
  }

  // Filas del historial de pagos
  var pagosHistHTML = pagosDelCred.length ? pagosDelCred.map(function(p){
    var estColor = p.estado==='confirmado' ? '#0a7a3f' : '#b78a14';
    return '<tr>'
      + '<td style="font-family:monospace;font-size:10.5px">'+p.id+'</td>'
      + '<td>'+(p.fecha||'—')+'</td>'
      + '<td style="text-align:right;font-weight:700;color:#0a7a3f">'+fmt(p.monto||0)+'</td>'
      + '<td>'+(p.metodo||'—')+'</td>'
      + '<td>'+(p.cobrador||'—')+'</td>'
      + '<td style="font-family:monospace;font-size:10.5px">'+(p.referencia||'—')+'</td>'
      + '<td style="color:'+estColor+';font-weight:700">'+(p.estado||'—')+'</td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="7" style="text-align:center;color:#999;padding:14px">Sin pagos registrados aún</td></tr>';

  // Info chips helper
  function infoChip(label, value, color){
    return '<div style="background:#fafafa;border:1px solid #e8e8e8;border-radius:6px;padding:8px 10px;min-width:0">'
      + '<div style="font-size:9px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">'+label+'</div>'
      + '<div style="font-size:12.5px;font-weight:700;color:'+(color||'#111')+';word-break:break-word">'+(value||'—')+'</div>'
    + '</div>';
  }

  var estadoBadge = c.mora>0
    ? '<span style="background:#fde7ec;color:#c22;padding:3px 10px;border-radius:12px;font-weight:700;font-size:10.5px">● EN MORA · '+c.mora+' día'+(c.mora!==1?'s':'')+'</span>'
    : c.estado==='completado'
      ? '<span style="background:#e7f7ec;color:#0a7a3f;padding:3px 10px;border-radius:12px;font-weight:700;font-size:10.5px">● COMPLETADO</span>'
      : c.estado==='cancelado'
        ? '<span style="background:#eee;color:#666;padding:3px 10px;border-radius:12px;font-weight:700;font-size:10.5px">● CANCELADO</span>'
        : '<span style="background:#eaf4ff;color:#1f5a9e;padding:3px 10px;border-radius:12px;font-weight:700;font-size:10.5px">● '+(c.estado||'activo').toUpperCase()+'</span>';

  var html = `
    <!-- Cabecera empresa -->
    <div style="text-align:center;margin-bottom:6px;padding-bottom:12px;border-bottom:2px solid #111">
      <div style="font-size:18px;font-weight:900;letter-spacing:1.5px;color:#111">${emp.nombre.toUpperCase()}</div>
      <div style="font-size:10px;color:#666;margin-top:3px">
        RIF ${emp.rif||'—'}${emp.ciudad?' · '+emp.ciudad:''}${emp.tel?' · Tel: '+emp.tel:''}${emp.email?' · '+emp.email:''}
      </div>
    </div>

    <!-- Título ficha + fecha -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin:14px 0 4px 0">
      <div>
        <div style="font-size:15px;font-weight:900;letter-spacing:.3px">FICHA DE CRÉDITO · ${c.id}</div>
        <div style="font-size:10.5px;color:#666;margin-top:2px">Documento generado el ${hoy}</div>
      </div>
      <div>${estadoBadge}</div>
    </div>

    <!-- DATOS DEL CLIENTE -->
    <h3 style="margin-top:18px">DATOS DEL CLIENTE</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px">
      ${infoChip('Nombre completo', c.cli)}
      ${infoChip('Cédula', cl.cedula)}
      ${infoChip('Teléfono', cl.tel)}
      ${infoChip('Email', cl.email)}
      ${infoChip('Ciudad', cl.ciudad)}
      ${infoChip('Trabajo', cl.trabajo)}
      ${infoChip('Ingreso mensual', cl.ingreso ? fmt(cl.ingreso) : '—')}
      ${infoChip('Contacto emergencia', cl.emergencia)}
      ${infoChip('Estado del cliente', cl.estado)}
    </div>

    <!-- VEHÍCULO -->
    <h3>VEHÍCULO FINANCIADO</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px">
      ${infoChip('Modelo / Marca', c.modelo)}
      ${infoChip('VIN / Serial', c.vin, '#444')}
      ${infoChip('Color', c.color)}
      ${infoChip('Año', c.anio)}
      ${infoChip('Placa', c.placa && c.placa!=='—' ? c.placa : 'Sin placa')}
      ${infoChip('GPS activo', c.gps ? 'Sí' : 'No')}
    </div>

    <!-- RESUMEN FINANCIERO -->
    <h3>RESUMEN FINANCIERO</h3>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px">
      ${infoChip('Cuenta N°', c.id, '#2563EB')}
      ${infoChip('Fecha inicio', fechaInicio)}
      ${infoChip('Fecha vencimiento final', fechaFinStr)}
      ${infoChip('Plazo', totalCuotas+' cuotas quincenales')}
      ${infoChip('Precio de venta', fmt(c.precio||0))}
      ${infoChip('Inicial (plan)', fmt(c.ini||0), '#0a7a3f')}
      ${infoChip('Monto financiado', fmt(c.fin||0))}
      ${infoChip('Total a pagar', fmt(c.total||0), '#111')}
      ${infoChip('Cuota quincenal', fmt(cuota), '#2563EB')}
      ${infoChip('Tasa mensual', (PLAN.tasaMensual||'—')+'%')}
      ${infoChip('Factor', (PLAN.factor||'—')+'x')}
      ${infoChip('% Inicial requerida', ((PLAN.inicial||0)*100)+'%')}
    </div>

    <!-- ESTADO ACTUAL -->
    <h3>ESTADO ACTUAL DE LA CUENTA</h3>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px">
      ${infoChip('Cuotas pagadas', cuotasPag+' de '+totalCuotas, '#0a7a3f')}
      ${infoChip('Cuotas pendientes', String(cuotasRest), cuotasRest>0?'#b78a14':'#0a7a3f')}
      ${infoChip('Total abonado', fmt(pagosConf), '#0a7a3f')}
      ${infoChip('Saldo pendiente', fmt(saldoPend), saldoPend>0?'#c22':'#0a7a3f')}
      ${infoChip('Progreso pago', pctPagado+'%', '#2563EB')}
      ${infoChip('Próximo vencimiento', proxFecha)}
      ${infoChip('Monto próxima cuota', cuotasRest>0 ? fmt(cuota) : 'Completado')}
      ${infoChip('Días de mora', c.mora>0 ? (c.mora+' días') : 'Al día', c.mora>0?'#c22':'#0a7a3f')}
    </div>

    <!-- HISTORIAL DE PAGOS -->
    <h3>HISTORIAL DE PAGOS REGISTRADOS</h3>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">ID Pago</th>
          <th style="text-align:left">Fecha</th>
          <th style="text-align:right">Monto</th>
          <th style="text-align:left">Método</th>
          <th style="text-align:left">Cobrador</th>
          <th style="text-align:left">Referencia</th>
          <th style="text-align:left">Estado</th>
        </tr>
      </thead>
      <tbody>${pagosHistHTML}</tbody>
    </table>
    ${pagosDelCred.length ? '<div style="text-align:right;margin-top:6px;font-size:11.5px"><strong>Total pagos confirmados: '+fmt(pagosConf)+'</strong> · '+pagosDelCred.filter(function(p){return p.estado==='confirmado';}).length+' operación(es)</div>' : ''}

    <!-- TABLA DE AMORTIZACIÓN -->
    <h3 style="page-break-before:always">TABLA DE AMORTIZACIÓN COMPLETA</h3>
    <table>
      <thead>
        <tr>
          <th style="text-align:center">Cuota #</th>
          <th style="text-align:left">Fecha venc.</th>
          <th style="text-align:left">Estado</th>
          <th style="text-align:right">Monto</th>
          <th style="text-align:right">Interés</th>
          <th style="text-align:right">Capital</th>
          <th style="text-align:right">Saldo</th>
        </tr>
      </thead>
      <tbody>${amortRows}</tbody>
    </table>

    <!-- Pie -->
    <div style="margin-top:30px;padding-top:14px;border-top:1px solid #ccc;display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div style="font-size:10.5px;color:#666;line-height:1.6">
          <strong>Notas:</strong> ${(c.notas||cl.notas||'Sin notas adicionales.').replace(/</g,'&lt;')}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10.5px;color:#666">Documento emitido por ${emp.nombre.toUpperCase()}</div>
        <div style="font-size:9.5px;color:#999;margin-top:4px">Generado el ${hoy} · Cuenta N° ${c.id}</div>
      </div>
    </div>
  `;

  _abrirVentanaImpresion('Ficha de Crédito '+c.id+' — '+c.cli, html);
}

function descargarEstadoPDF(){
  var credId = window._currentAmortCredId;
  if(!credId){ toast('Abre primero la tabla de amortización','error'); return; }
  var c = S.creds.find(function(x){return x.id===credId;});
  if(!c){ toast('Crédito no encontrado','error'); return; }
  var emp = (typeof getEmpresa==='function') ? getEmpresa() : {nombre:'Pagasi',rif:'',ciudad:'',tel:'',email:''};

  var totalCuotas = getCreditoTotalCuotas(c);
  var cuota = getCreditoCuotaBase(c);
  var cuotasPag = getCreditoCuotasPagadas(c);
  var hoy = new Date().toLocaleDateString('es-VE',{day:'numeric',month:'long',year:'numeric'});

  var fechaInicio = c.fecha || '—';
  var startDate = new Date((c.fecha||hoyLocalISO())+'T12:00:00');

  // La misma cuenta de la tabla de la pantalla: si la cuota tiene un abono,
  // sale PARCIAL y con lo que falta, no con la cuota entera (Adam, 15-sep-2026).
  var L = saldosPorCuota(c);
  var pagosPorCuota = L.abonos;

  // Construir filas solo con #, Fecha, Estado, Abonos, Monto
  var rowsHTML = '';
  for(var i=1;i<=totalCuotas;i++){
    var est = L.estados[i-1] || 'pendiente';
    var pd = est==='pagada', parcial = est==='parcial', esProx = est==='proxima';
    var fd = new Date(startDate.getTime()+(i*15*24*60*60*1000));
    var fechaStr = fd.toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric'});

    var estadoTxt = pd ? '✓ Pagada' : parcial ? 'Parcial' : (esProx ? 'Próxima' : 'Pendiente');
    var estadoColor = pd ? '#0a7a3f' : parcial ? '#b45309' : (esProx ? '#2563EB' : '#888');

    var histCuota = pagosPorCuota[i]||[];
    var abonosTxt = '—';
    if(histCuota.length>0){
      abonosTxt = histCuota.map(function(h){
        return '+'+fmt(h.montoPagado)+' · '+h.fecha;
      }).join('<br>');
    }
    // Lo que el cliente debe por esa cuota hoy
    var montoTxt = parcial ? fmt(L.saldos[i-1])+' pend.' : fmt(cuota);

    rowsHTML += '<tr style="'+(pd?'opacity:.6;background:#fafafa':parcial?'background:#fff7ed':'')+'">'
      + '<td style="text-align:center;font-weight:700">'+i+'</td>'
      + '<td>'+fechaStr+'</td>'
      + '<td style="font-weight:700;color:'+estadoColor+'">'+estadoTxt+'</td>'
      + '<td style="font-size:10.5px;color:'+(histCuota.length>0?'#0a7a3f':'#999')+'">'+abonosTxt+'</td>'
      + '<td style="text-align:right;font-weight:700;color:'+(pd?'#888':parcial?'#b45309':esProx?'#2563EB':'#111')+'">'+montoTxt+'</td>'
      + '</tr>';
  }

  var html = `
    <!-- Cabecera empresa -->
    <div style="text-align:center;margin-bottom:6px;padding-bottom:12px;border-bottom:2px solid #111">
      <div style="font-size:18px;font-weight:900;letter-spacing:1.5px;color:#111">${emp.nombre.toUpperCase()}</div>
      <div style="font-size:10px;color:#666;margin-top:3px">
        RIF ${emp.rif||'—'}${emp.ciudad?' · '+emp.ciudad:''}${emp.tel?' · Tel: '+emp.tel:''}${emp.email?' · '+emp.email:''}
      </div>
    </div>

    <!-- Título -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin:14px 0 10px 0">
      <div>
        <div style="font-size:15px;font-weight:900;letter-spacing:.3px">ESTADO DE CUENTA · ${c.id}</div>
        <div style="font-size:11px;color:#666;margin-top:2px">${c.cli} · Inicio ${fechaInicio} · ${totalCuotas} cuotas quincenales</div>
        <div style="font-size:10.5px;color:#666;margin-top:2px">Documento generado el ${hoy}</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#666">
        <div><strong>Cuota:</strong> ${fmt(cuota)}</div>
        <div><strong>Progreso:</strong> ${cuotasPag} de ${totalCuotas}</div>
        ${L.aviso?`<div style="color:#b45309;font-weight:700;margin-top:2px">Por pagar ahora: ${fmt(L.aviso.falta)}</div>`:''}
      </div>
    </div>

    ${L.aviso?`<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:9px 12px;font-size:11.5px;color:#7c2d12;margin:10px 0">La cuota ${L.aviso.cuota} tiene un abono de <strong>${fmt(L.aviso.abonado)}</strong> — solo quedan <strong>${fmt(L.aviso.falta)}</strong> por pagar.</div>`:''}

    <!-- TABLA DE AMORTIZACIÓN -->
    <table>
      <thead>
        <tr>
          <th style="text-align:center;width:40px">#</th>
          <th style="text-align:left">Fecha</th>
          <th style="text-align:left">Estado</th>
          <th style="text-align:left">Abonos</th>
          <th style="text-align:right">Monto</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
    </table>

    <!-- Pie -->
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #ccc;text-align:right;font-size:10.5px;color:#666">
      Documento emitido por ${emp.nombre.toUpperCase()} · Generado el ${hoy} · Cuenta N° ${c.id}
    </div>
  `;

  _abrirVentanaImpresion('Estado de Cuenta '+c.id+' — '+c.cli, html);
}

// El nombre con el que el navegador propone guardar el PDF es el titulo de la
// ventana de impresion. Adam (16-sep-2026): que salga "CRED-580 - MAIRENA
// YOXMALI FERNANDEZ PEREZ - BR150 MILAN" (codigo - cliente - modelo) para no
// renombrar cada archivo a mano. Sin letras prohibidas en nombres de archivo.
function _tituloContrato(credId){
  var c = (S.creds||[]).find(function(x){ return String(x.id)===String(credId); });
  var partes = [String(credId||'Contrato')];
  if(c && c.cli) partes.push(String(c.cli).trim());
  if(c && c.modelo) partes.push(String(c.modelo).trim());
  return partes.join(' - ').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function descargarContratoPDF(){
  // Renderiza el contrato del crédito seleccionado en el módulo contratos
  renderContrato();
  setTimeout(function(){
    var cz = $('cz');
    if(!cz){ toast('Selecciona un crédito primero','error'); return; }
    var credId = ($('sel-cred')&&$('sel-cred').value)||'contrato';
    _abrirVentanaImpresion(_tituloContrato(credId), cz.innerHTML, {sinHeader:true});
  }, 200);
}

function descargarContratoPDFById(credId){
  // Selecciona el crédito en el dropdown y usa renderContrato() para generar el HTML
  var sel = $('sel-cred');
  if(sel){
    // Asegurarnos de que la opción existe en el select antes de asignar
    var opt = Array.prototype.find.call(sel.options||[], function(o){return String(o.value)===String(credId);});
    if(opt) sel.value = credId;
  }
  // Si no estamos en la página de contratos, navegar brevemente para que #cz exista
  if(!$('cz')){ nav('contratos'); }
  setTimeout(function(){
    // Forzar que renderContrato use el credId correcto: si el select no existe o no coincide,
    // guardamos temporalmente y restauramos
    var prevSel = sel ? sel.value : null;
    if(sel) sel.value = credId;
    // La version del contrato es la del credito, no la que este en el selector
    var td = $('sel-tipo-doc'), cc = (S.creds||[]).find(function(x){ return String(x.id)===String(credId); });
    var prevTd = td ? td.value : null;
    if(td && cc && typeof _contratoVersionDe==='function') td.value = _contratoVersionDe(cc);
    renderContrato();
    if(td && prevTd!==null) td.value = prevTd;
    var cz = $('cz');
    if(!cz){ toast('No se pudo generar el contrato','error'); return; }
    _abrirVentanaImpresion(_tituloContrato(credId), cz.innerHTML, {sinHeader:true});
    if(sel && prevSel!==null) sel.value = prevSel;
  }, 150);
}
// EXPORTAR CSV
// ══════════════════════════════════════════════════════════════
function exportarCSV(tipo){
  var rows=[], filename='';
  function esc(v){ return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'; }
  function row(arr){ return arr.map(esc).join(','); }

  if(tipo==='clientes'){
    filename='clientes-'+hoyLocalISO()+'.csv';
    rows.push(row(['ID','Nombre','Cédula','Teléfono','Email','Ciudad','Trabajo','Ingreso mensual','Estado','Emergencia','Notas']));
    S.clientes.filter(function(c){return !c.eliminado;}).forEach(function(c){
      rows.push(row([c.id,c.nombre,c.cedula,c.tel,c.email||'',c.ciudad,c.trabajo,c.ingreso,c.estado,c.emergencia||'',c.notas||'']));
    });
  } else if(tipo==='creditos'){
    filename='creditos-'+hoyLocalISO()+'.csv';
    rows.push(row(['ID','Cliente','Modelo','Precio','Inicial','Financiado','Total','Cuota mensual','Cuota quincenal','Plazo','Fecha','Estado','Cuotas pagadas','En mora']));
    S.creds.filter(function(c){return !c.eliminado;}).forEach(function(c){
      rows.push(row([c.id,c.cli,c.modelo,c.precio,c.ini,c.fin,c.total,c.cuota,c.cuotaQ||'',c.plazo,c.fecha,c.estado,c.pagado,c.mora||0]));
    });
  } else if(tipo==='pagos'){
    filename='pagos-'+hoyLocalISO()+'.csv';
    rows.push(row(['ID','Cliente','Crédito','Fecha','Monto','Método/Cuenta','Cobrador','Estado','Referencia','Tasa Bs','Realizado por']));
    S.pagos.filter(function(p){return !p.eliminado;}).forEach(function(p){
      rows.push(row([p.id,p.cli,p.cred,p.fecha,p.monto,p.metodo,p.cobrador,p.estado,p.referencia||'',p.tasaBs||'',p.realizadoPor||'']));
    });
  } else if(tipo==='egresos'){
    filename='egresos-'+hoyLocalISO()+'.csv';
    rows.push(row(['ID','Concepto','Monto','Fecha','Categoría','Forma de pago','Referencia']));
    S.egresos.filter(function(e){return !e.eliminado;}).forEach(function(e){
      rows.push(row([e.id,e.concepto,e.monto,e.fecha,e.categoria||'',e.forma||'',e.referencia||'']));
    });
  } else if(tipo==='motos'){
    filename='motos-'+hoyLocalISO()+'.csv';
    rows.push(row(['ID','Modelo','Año','VIN','Color','Precio','Estado','Cliente','GPS','Notas']));
    S.motos.filter(function(m){return !m.eliminado;}).forEach(function(m){
      rows.push(row([m.id,m.modelo,m.anio||'',m.vin||'',m.color||'',m.precio||0,m.estado,m.cliente||'',m.gps?'Si':'No',m.notas||'']));
    });
  } else if(tipo==='movimientos'){
    filename='movimientos-cuentas-'+hoyLocalISO()+'.csv';
    rows.push(row(['ID','Fecha','Hora','Concepto','Tipo','Cuenta Origen','Cuenta Destino','Monto','Referencia','Realizado por','Estado']));
    (S.movimientos||[]).forEach(function(m){
      var estado = m.eliminado ? 'Anulado' : 'Activo';
      rows.push(row([
        m.id,
        m.fecha||'',
        m.hora||'',
        m.concepto||m.descripcion||'',
        m.tipo||'',
        m.cuentaOrigen||'',
        m.cuentaDestino||'',
        m.monto||0,
        m.referencia||'',
        m.realizadoPor||'',
        estado
      ]));
    });
  } else if(tipo==='cobranza'){
    filename='cobranza-mora-'+hoyLocalISO()+'.csv';
    rows.push(row(['ID Crédito','Cliente','Modelo','Días mora','Cuotas vencidas','Monto mora estimado','Cuota quincenal','Saldo pendiente','Teléfono']));
    var _cobCreds = _concFiltrar(S.creds||[]).filter(function(c){return !c.eliminado && c.mora>0 && c.estado==='activo';});
    _cobCreds.forEach(function(c){
      var cli = (S.clientes||[]).find(function(x){return String(x.id)===String(c.cliId)||(x.nombre||'')===(c.cli||'');});
      var cuotasV = Math.ceil((c.mora||0)/15);
      var montoMora = cuotasV * parseFloat(c.cuotaQ||c.cuota||0);
      rows.push(row([c.id,c.cli,c.modelo||'',c.mora||0,cuotasV,montoMora,c.cuotaQ||c.cuota||0,getCreditoSaldoPendiente(c),(cli&&cli.tel)||'']));
    });
  } else {
    toast('Tipo de export desconocido','error'); return;
  }

  if(rows.length<=1){toast('No hay datos para exportar','info');return;}
  var blob=new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
  toast('Exportado: '+filename,'success');
}

// ══════════════════════════════════════════════════════════════
// EXPORTAR CSV DE UNA CUENTA ESPECÍFICA
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// BACKUP JSON COMPLETO
// ══════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════
// PAGINACIÓN — helper genérico
// ══════════════════════════════════════════════════════════════
window._pages = {}; // { pagos: 1, clientes: 1, creditos: 1 }

function pgGet(key){ return window._pages[key]||1; }
function pgSet(key,n){ window._pages[key]=n; }

function pgControls(key, total, perPage, navFn){
  var pages = Math.ceil(total/perPage) || 1;
  var cur = pgGet(key);
  if(cur > pages) { pgSet(key,1); cur=1; }
  var from = (cur-1)*perPage+1;
  var to = Math.min(cur*perPage,total);
  if(total===0) return '';
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px 2px;font-size:12px;color:var(--ink3)">'
    +'<span>'+from+' – '+to+' de '+total+' registros</span>'
    +'<div style="display:flex;gap:6px">'
    +(cur>1?'<button class="btn btn-g btn-xs" onclick="'+navFn+'(\''+key+'\','+(cur-1)+')">‹ Anterior</button>':'')
    +(cur<pages?'<button class="btn btn-g btn-xs" onclick="'+navFn+'(\''+key+'\','+(cur+1)+')">Siguiente ›</button>':'')
    +'<span style="background:var(--surf2);border-radius:6px;padding:3px 8px;font-weight:700;color:var(--ink2)">'+cur+'/'+pages+'</span>'
    +'</div></div>';
}

function pgNav(key, n){ pgSet(key,n); window._pgKeep=true; nav(S.page); }

function generarReporte(tipo){
  try{
  var titulo, html_content;
  var empresa = ($('cfg_empresa')&&$('cfg_empresa').value)||'Pagasi';
  var fecha = new Date().toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'});
  var estilos = '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:\'Nunito\',system-ui,-apple-system,Arial,sans-serif;font-size:12px;color:#1f2937;padding:24px}h1{font-size:18px;font-weight:900;margin-bottom:4px;color:#1D4ED8}h2{font-size:13px;color:#64748b;font-weight:600;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#EFF6FF;color:#1D4ED8;padding:7px 9px;text-align:left;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #2563EB}td{padding:6px 9px;border-bottom:1px solid #DBEAFE;font-size:11px}tr:nth-child(even){background:#FAFCFF}.total-row{font-weight:900;background:#DBEAFE!important}.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}.green{background:#d4f5e9;color:#0a7a50}.red{background:#fde8ec;color:#b5162d}.blue{background:#DBEAFE;color:#1D4ED8}.gray{background:#f0f0f0;color:#555}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #2563EB}.logo-area{display:flex;align-items:center;gap:14px}.logo-area img{height:38px;object-fit:contain}.meta{text-align:right;color:#64748b;font-size:11px}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.stat-box{background:#F5F8FF;border:1px solid #DBEAFE;border-radius:8px;padding:12px;text-align:center}.stat-v{font-size:18px;font-weight:900;color:#2563EB}.stat-l{font-size:10px;color:#64748b;margin-top:2px}@media print{button{display:none!important}}</style>';

  if(tipo==='ingresos'){
    titulo = 'Reporte de Ingresos Mensuales';
    var pagosConf = S.pagos.filter(function(p){return !p.eliminado&&p.estado==='confirmado';});
    var pagosElim = S.pagos.filter(function(p){return p.eliminado&&p.estado==='confirmado';});
    var totalCobrado = pagosConf.reduce(function(a,p){return a+p.monto;},0);
    var totalIni = getTotalInicialesCobradas();
    // Group by month
    var byMonth = {};
    pagosConf.forEach(function(p){
      var mes = p.fecha ? p.fecha.substr(0,7) : 'Sin fecha';
      if(!byMonth[mes]) byMonth[mes]={mes:mes,cant:0,total:0};
      byMonth[mes].cant++; byMonth[mes].total+=p.monto;
    });
    var rows = Object.values(byMonth).sort(function(a,b){return b.mes.localeCompare(a.mes);})
      .map(function(m){ return '<tr><td>'+m.mes+'</td><td>'+m.cant+' pagos</td><td>$'+m.total.toFixed(2)+'</td></tr>'; }).join('');
    html_content = '<div class="stat-grid">'
      +'<div class="stat-box"><div class="stat-v">$'+totalCobrado.toFixed(2)+'</div><div class="stat-l">Total cobrado</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+pagosConf.length+'</div><div class="stat-l">Pagos registrados</div></div>'
      +'<div class="stat-box"><div class="stat-v">$'+totalIni.toFixed(2)+'</div><div class="stat-l">Iniciales recibidas</div></div>'
      +'<div class="stat-box"><div class="stat-v">$'+totalCobrado.toFixed(2)+'</div><div class="stat-l">Ingreso total</div></div>'
      +'</div>'
      +'<table><thead><tr><th>Mes</th><th>Cantidad</th><th>Monto</th></tr></thead><tbody>'+rows
      +'<tr class="total-row"><td>TOTAL</td><td>'+pagosConf.length+' pagos</td><td>$'+totalCobrado.toFixed(2)+'</td></tr>'
      +'</tbody></table>'
      +(function(){
        var byMetodo={};
        pagosConf.forEach(function(p){
          var k=(p.metodo||'Sin especificar'); 
          if(!byMetodo[k])byMetodo[k]={metodo:k,cant:0,total:0};
          byMetodo[k].cant++; byMetodo[k].total+=p.monto;
        });
        var mrows=Object.values(byMetodo).sort(function(a,b){return b.total-a.total;})
          .map(function(m){return '<tr><td>'+m.metodo+'</td><td>'+m.cant+'</td><td>$'+m.total.toFixed(2)+'</td><td>'+(m.total/totalCobrado*100).toFixed(1)+'%</td></tr>';}).join('');
        return '<h2 style="margin-top:20px;border-top:1px solid #eee;padding-top:14px">Por método / cuenta</h2>'
          +'<table><thead><tr><th>Cuenta / Método</th><th>Cantidad</th><th>Monto</th><th>% del total</th></tr></thead><tbody>'+mrows+'</tbody></table>';
      })()
      +'<h2 style="margin-top:20px;border-top:1px solid #eee;padding-top:14px">Detalle de pagos</h2>'
      +'<table><thead><tr><th>ID</th><th>Cliente</th><th>Crédito</th><th>Fecha</th><th>Monto</th><th>Recibido en</th><th>Referencia</th><th>Cobrador</th></tr></thead><tbody>'
      +pagosConf.map(function(p){
        return '<tr><td>'+p.id+'</td><td>'+p.cli+'</td><td>'+p.cred+'</td><td>'+(p.fecha||'—')+'</td><td>$'+p.monto.toFixed(2)+'</td><td><strong>'+(p.metodo||'—')+'</strong></td><td>'+(p.referencia||'—')+'</td><td>'+(p.cobrador||'—')+'</td></tr>';
      }).join('')
      +(pagosElim.length?'<tr><td colspan="8" style="background:#fde8ec;color:#b5162d;font-weight:700;padding:6px 9px"> Registros eliminados (no cuentan en totales)</td></tr>'
        +pagosElim.map(function(p){
          return '<tr style="opacity:0.6;text-decoration:line-through;background:#fff5f5"><td>'+p.id+'</td><td>'+p.cli+'</td><td>'+p.cred+'</td><td>'+(p.fecha||'—')+'</td><td>$'+p.monto.toFixed(2)+'</td><td>'+(p.metodo||'—')+'</td><td>'+(p.referencia||'—')+'</td><td>'+( p.eliminadoRazon||'Eliminado')+'</td></tr>';
        }).join(''):'')
      +'</tbody></table>';

  } else if(tipo==='creditos'){
    titulo = 'Reporte de Créditos Activos';
    var activos = S.creds.filter(function(c){return !c.eliminado&&c.estado==='activo';});
    var totalCartera = activos.reduce(function(a,c){return a+getCreditoSaldoPendiente(c);},0);
    html_content = '<div class="stat-grid">'
      +'<div class="stat-box"><div class="stat-v">'+activos.length+'</div><div class="stat-l">Créditos activos</div></div>'
      +'<div class="stat-box"><div class="stat-v">$'+totalCartera.toFixed(2)+'</div><div class="stat-l">Cartera vigente</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+S.creds.filter(function(c){return !c.eliminado&&c.estado==='completado';}).length+'</div><div class="stat-l">Completados</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+S.creds.filter(function(c){return !c.eliminado&&c.mora>0;}).length+'</div><div class="stat-l">En mora</div></div>'
      +'</div>'
      +'<table><thead><tr><th>ID</th><th>Cliente</th><th>Moto</th><th>Fecha</th><th>Cuota Q.</th><th>Pagadas</th><th>Estado</th></tr></thead><tbody>'
      +activos.map(function(c){
        var est = c.mora>0?'<span class="badge red">Mora</span>':'<span class="badge green">Al día</span>';
        return '<tr><td>'+c.id+'</td><td>'+c.cli+'</td><td>'+c.modelo+'</td><td>'+(c.fecha||'—')+'</td><td>$'+(c.cuotaQ||c.cuota||0).toFixed(2)+'</td><td>'+(c.pagado||0)+' / '+((c.totalCuotas||20))+'</td><td>'+est+'</td></tr>';
      }).join('')
      +'</tbody></table>';

  } else if(tipo==='mora'){
    titulo = 'Reporte de Mora';
    var enMora = S.creds.filter(function(c){return !c.eliminado&&(c.mora>0||c.estado==='vencido');});
    html_content = '<div class="stat-grid">'
      +'<div class="stat-box"><div class="stat-v">'+enMora.length+'</div><div class="stat-l">Clientes en mora</div></div>'
      +'<div class="stat-box"><div class="stat-v">$'+enMora.reduce(function(a,c){return a+(c.cuotaQ||c.cuota||0);},0).toFixed(2)+'</div><div class="stat-l">Cuotas pendientes</div></div>'
      +'</div>'
      +'<table><thead><tr><th>Crédito</th><th>Cliente</th><th>Moto</th><th>Cuotas vencidas</th><th>Cuota</th><th>Cobrador</th></tr></thead><tbody>'
      +enMora.map(function(c){
        return '<tr><td>'+c.id+'</td><td>'+c.cli+'</td><td>'+c.modelo+'</td><td><span class="badge red">'+c.mora+' vencidas</span></td><td>$'+(c.cuotaQ||c.cuota||0).toFixed(2)+'</td><td>'+(c.cobrador||'—')+'</td></tr>';
      }).join('')
      +'</tbody></table>';

  } else if(tipo==='inventario'){
    titulo = 'Inventario de Motocicletas';
    html_content = '<div class="stat-grid">'
      +'<div class="stat-box"><div class="stat-v">'+S.motos.filter(function(m){return !m.eliminado&&m.estado==='disponible';}).length+'</div><div class="stat-l">Disponibles</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+S.motos.filter(function(m){return !m.eliminado&&m.estado==='financiada';}).length+'</div><div class="stat-l">Financiadas</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+S.motos.filter(function(m){return !m.eliminado&&m.estado==='recuperada';}).length+'</div><div class="stat-l">Recuperadas</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+S.motos.filter(function(m){return !m.eliminado;}).length+'</div><div class="stat-l">Total</div></div>'
      +'</div>'
      +'<table><thead><tr><th>ID</th><th>Modelo</th><th>Año</th><th>VIN</th><th>Color</th><th>Precio</th><th>Estado</th><th>Cliente</th><th>GPS</th></tr></thead><tbody>'
      +S.motos.filter(function(m){return !m.eliminado;}).map(function(m){
        var est={'disponible':'<span class="badge green">Disponible</span>','financiada':'<span class="badge blue">Financiada</span>','recuperada':'<span class="badge red">Recuperada</span>','inventario':'<span class="badge gray">Inventario</span>'}[m.estado]||m.estado;
        return '<tr><td>'+m.id+'</td><td>'+m.modelo+'</td><td>'+(m.anio||'—')+'</td><td>'+(m.vin||'—')+'</td><td>'+(m.color||'—')+'</td><td>$'+Number(m.precio||0).toFixed(2)+'</td><td>'+est+'</td><td>'+(m.cliente||'—')+'</td><td>'+(m.gps?'✓':'—')+'</td></tr>';
      }).join('')
      +'</tbody></table>';

  } else if(tipo==='pyl'){
    titulo = 'Estado de Resultados (P&L)';
    // Las iniciales se contaban DOS veces: una en getTotalInicialesCobradas (movimientos)
    // y otra dentro de los pagos (la inicial tambien se guarda como pago). Aqui van las
    // cuotas por un lado y las iniciales por el otro (punto 17, 21-sep-2026).
    var tIni = getTotalInicialesCobradas();
    var tPagos = S.pagos.filter(function(p){
      return !p.eliminado && p.estado==='confirmado' && !p.esInicial && p.tipoOperacion!=='inicial_credito';
    }).reduce(function(a,p){return a+p.monto;},0);
    var tIngresos = tIni + tPagos;
    // La inicial que el cliente paga en la tienda queda como egreso de compra de moto,
    // pero no es plata que salio de Pagasi: se muestra aparte y no suma (igual que el dashboard).
    var _idsIniPyl = (typeof _egrIdsInicial==='function') ? _egrIdsInicial() : {};
    var esIniPyl = function(e){ return !!(e && _idsIniPyl[String(e.id)]); };
    var egresosActPyl = S.egresos.filter(function(e){return !e.eliminado && !esIniPyl(e);});
    var egresosIniPyl = S.egresos.filter(function(e){return !e.eliminado && esIniPyl(e);});
    var egresosElimPyl = S.egresos.filter(function(e){return e.eliminado;});
    var tEgresosIni = egresosIniPyl.reduce(function(a,e){return a+(e.monto||0);},0);
    var tEgresos = egresosActPyl.reduce(function(a,e){return a+(e.monto||0);},0);
    var utilidad = tIngresos - tEgresos;
    html_content = '<div class="stat-grid">'
      +'<div class="stat-box"><div class="stat-v" style="color:#0a7a50">$'+tIngresos.toFixed(2)+'</div><div class="stat-l">Ingresos totales</div></div>'
      +'<div class="stat-box"><div class="stat-v" style="color:#b5162d">$'+tEgresos.toFixed(2)+'</div><div class="stat-l">Egresos totales</div></div>'
      +'<div class="stat-box"><div class="stat-v" style="color:'+(utilidad>=0?'#0a7a50':'#b5162d')+'">$'+Math.abs(utilidad).toFixed(2)+'</div><div class="stat-l">'+(utilidad>=0?'Utilidad neta':'Pérdida neta')+'</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+S.creds.filter(function(c){return !c.eliminado&&c.estado==='activo';}).length+'</div><div class="stat-l">Créditos activos</div></div>'
      +'</div>'
      +'<table><thead><tr><th>Concepto</th><th>Monto</th></tr></thead><tbody>'
      +'<tr><td>Iniciales cobradas</td><td>$'+tIni.toFixed(2)+'</td></tr>'
      +'<tr><td>Pagos de cuotas</td><td>$'+tPagos.toFixed(2)+'</td></tr>'
      +'<tr class="total-row"><td>TOTAL INGRESOS</td><td>$'+tIngresos.toFixed(2)+'</td></tr>'
      +egresosActPyl.map(function(e){return '<tr><td>(-) '+e.concepto+'</td><td>$'+(e.monto||0).toFixed(2)+'</td></tr>';}).join('')
      +'<tr class="total-row"><td>TOTAL EGRESOS</td><td>$'+tEgresos.toFixed(2)+'</td></tr>'
      +(egresosIniPyl.length?'<tr><td colspan="2" style="background:#eef2fb;color:#2563EB;font-weight:700;padding:6px 9px">Iniciales de clientes registradas como compra de moto — no son salida de Pagasi (ya estan arriba como ingreso): $'+tEgresosIni.toFixed(2)+'</td></tr>'
        +egresosIniPyl.map(function(e){return '<tr style="opacity:.6"><td>'+e.concepto+'</td><td>$'+(e.monto||0).toFixed(2)+'</td></tr>';}).join(''):'')
      +'<tr class="total-row" style="background:#2563EB!important;color:#fff"><td>UTILIDAD NETA</td><td>$'+utilidad.toFixed(2)+'</td></tr>'
      +(egresosElimPyl.length?'<tr><td colspan="2" style="background:#fde8ec;color:#b5162d;font-weight:700;padding:6px 9px"> Egresos eliminados (no cuentan en totales)</td></tr>'
        +egresosElimPyl.map(function(e){return '<tr style="opacity:0.5;text-decoration:line-through;background:#fff5f5"><td>(-) '+e.concepto+' <em style="font-size:10px">['+( e.eliminadoRazon||'Eliminado')+']</em></td><td>$'+(e.monto||0).toFixed(2)+'</td></tr>';}).join(''):'')
      +'</tbody></table>';

  } else if(tipo==='flujo'){
    titulo = 'Flujo de Caja';
    var allPagos = S.pagos.filter(function(p){return !p.eliminado&&p.estado==='confirmado';});
    var pagosElimFlujo = S.pagos.filter(function(p){return p.eliminado&&p.estado==='confirmado';});
    var egresosActivos = S.egresos.filter(function(e){return !e.eliminado;});
    var egresosElim = S.egresos.filter(function(e){return e.eliminado;});
    html_content = '<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Entrada</th><th>Salida</th><th>Forma</th><th>Cuenta</th></tr></thead><tbody>'
      +allPagos.map(function(p){
        return '<tr><td>'+(p.fecha||'—')+'</td><td><span class="badge green">Ingreso</span></td><td>'+p.cli+' · '+p.cred+'</td><td>$'+p.monto.toFixed(2)+'</td><td>—</td><td>'+(p.metodo||'—')+'</td><td>'+(p.cuenta||'—')+'</td></tr>';
      }).join('')
      +egresosActivos.map(function(e){
        return '<tr><td>'+(e.fecha||'—')+'</td><td><span class="badge red">Egreso</span></td><td>'+e.concepto+'</td><td>—</td><td>$'+e.monto.toFixed(2)+'</td><td>—</td><td>—</td></tr>';
      }).join('')
      +(pagosElimFlujo.length||egresosElim.length?'<tr><td colspan="7" style="background:#fde8ec;color:#b5162d;font-weight:700;padding:6px 9px"> Registros eliminados (no cuentan en totales)</td></tr>':'')
      +pagosElimFlujo.map(function(p){
        return '<tr style="opacity:0.5;text-decoration:line-through;background:#fff5f5"><td>'+(p.fecha||'—')+'</td><td><span class="badge gray">Eliminado</span></td><td>'+p.cli+' · '+p.cred+'</td><td>$'+p.monto.toFixed(2)+'</td><td>—</td><td>'+(p.metodo||'—')+'</td><td>'+(p.eliminadoRazon||'Eliminado')+'</td></tr>';
      }).join('')
      +egresosElim.map(function(e){
        return '<tr style="opacity:0.5;text-decoration:line-through;background:#fff5f5"><td>'+(e.fecha||'—')+'</td><td><span class="badge gray">Eliminado</span></td><td>'+e.concepto+'</td><td>—</td><td>$'+e.monto.toFixed(2)+'</td><td>—</td><td>'+(e.eliminadoRazon||'Eliminado')+'</td></tr>';
      }).join('')
      +'</tbody></table>';

  } else if(tipo==='plan'){
    titulo = 'Reporte del Plan Financiero';
    html_content = '<div class="stat-grid">'
      +'<div class="stat-box"><div class="stat-v">'+PLAN.plazo+'</div><div class="stat-l">Meses plazo</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+PLAN.factor+'x</div><div class="stat-l">Factor</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+(PLAN.inicial*100)+'%</div><div class="stat-l">Inicial mínima</div></div>'
      +'<div class="stat-box"><div class="stat-v">'+PLAN.tasaMensual+'%</div><div class="stat-l">Tasa mensual</div></div>'
      +'</div>'
      +'<table><thead><tr><th>Modelo</th><th>Precio</th><th>Inicial ${PLAN.inicial*100}%</th><th>Financiado</th><th>Cuota mensual</th><th>Cuota quincenal</th><th>Total pagado</th></tr></thead><tbody>'
      +CATALOGO.map(function(c){
        var r = calcMoto(c.precio);
        return '<tr><td>'+c.modelo+'</td><td>$'+c.precio.toFixed(2)+'</td><td>$'+r.ini.toFixed(2)+'</td><td>$'+r.fin.toFixed(2)+'</td><td>$'+r.cuotaM.toFixed(2)+'</td><td>$'+r.cuotaQ.toFixed(2)+'</td><td>$'+r.totalPagado.toFixed(2)+'</td></tr>';
      }).join('')
      +'</tbody></table>';
  } else {
    toast('Reporte no implementado aún','info'); return;
  }

  var doc = window.open('about:blank','_blank');
  if(!doc){ toast('No se pudo abrir el reporte. Permite ventanas emergentes para pagasi.io','error'); return; }
  doc.document.open();
  var _logoPdf = (typeof _PAGASI_LOGO_BLUE!=='undefined'&&_PAGASI_LOGO_BLUE) || ((document.querySelector('.sb-logo img')||{}).src||'');
  doc.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+titulo+' — '+empresa+'</title>'+estilos+'</head><body>'
    +'<div class="header"><div class="logo-area">'+(_logoPdf?'<img src="'+_logoPdf+'" alt="Pagasi">':'')+'<div><h1>'+empresa+'</h1><h2>'+titulo+'</h2></div></div>'
    +'<div class="meta">'+fecha+'<br><button onclick="window.print()" style="margin-top:8px;background:#2563EB;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit;font-weight:700">Imprimir / Guardar PDF</button></div>'
    +'</div>'+html_content+'</body></html>');
  doc.document.close();
  }catch(err){
    console.error('Error generando reporte', err);
    toast('No se pudo generar el reporte','error');
  }
}


// ══════════════════════════════════════════════════════════════
// MÓDULO CUENTAS — Gestión contable por cuentas
// ══════════════════════════════════════════════════════════════
