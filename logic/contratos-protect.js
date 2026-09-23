// Contrato de FINANCIAMIENTO con Pagasi Protect — version 3, vigente desde el
// 7 de septiembre de 2026. Es el que redacto la abogada para la estructura
// nueva: Pagasi financia con recursos propios, el concesionario vende y NO
// firma, interes financiero explicito del 12 % anual (sistema frances), y el
// programa Pagasi Protect como negocio separable.
//
// LO QUE SALE LLENO Y LO QUE SALE EN GRIS (decision de Adam, 7-sep-2026)
// No hay ningun formulario extra: "ya es suficiente con todos los datos que
// tienen que llenar". El papel se llena con lo que el sistema ya sabe:
//   - actividad e ingreso del cliente (los pide el wizard de credito)
//   - quien creo el credito (analista) y quien lo aprobo (modulo Aprobaciones)
//   - PEP marcado en NO: es el 99,9 % de los casos; si es PEP se tacha a mano
// Y queda en gris, para escribir con los papeles del concesionario en la mano:
// N° de factura, certificado de origen, poliza, profesion del fiador, y las
// casillas de recaudos del Anexo D, que se marcan con boligrafo conforme el
// cliente entrega cada papel. Menos de dos minutos, sin pantalla.
// (c.docsContrato, si algun dia existe, manda sobre estos defaults.)
//
// LO QUE ESTE ARCHIVO HACE Y LO QUE NO
// - Solo produce la HOJA. El sistema sigue calculando, guardando y cobrando la
//   cuota exactamente igual que hoy (factor sobre el financiado). Nada de lo
//   que hay aqui toca creditos.js, pagos.js ni la mora automatica.
// - La cuota impresa es la MISMA que el sistema cobra. Para que el contrato
//   sea coherente con su propia formula del 12 %, el Precio Protect se despeja
//   hacia atras a partir de esa cuota: todo lo que el cliente paga por encima
//   del 12 % sobre el financiado es Protect. Asi lo decidio Adam (6-sep-2026):
//   "todo lo que este por encima del 12 % va en Pagasi Protect" y "varia por
//   credito/moto".
// - Los creditos firmados antes del 7-sep siguen imprimiendo su contrato
//   anterior. Nada retroactivo: misma regla que en la version 2.
//
// Decisiones de la abogada / de Adam ya aplicadas (6-sep-2026):
//   3.10  mora desde el dia 6, NO retroactiva
//   3.19  NO se han emitido letras de cambio (alternativa 1) — pendiente de
//         confirmar con la abogada; cambiarlo es una linea
//   2.5   los Dispositivos pasan al Comprador al final (son parte de Protect)
//   2.1   los Dispositivos se instalan en centro autorizado Pagasi dentro de
//         los primeros 30 dias
//   6.4   hipoteca mobiliaria OMITIDA: la propia nota de la abogada pide
//         verificar la autorizacion del ministerio antes de activarla
//   1.9   poliza de cobertura amplia (opcional) OMITIDA
//   3.15  medios de pago: cuentas en 100% Banco Universal y Binance
//   B.2   talleres: los que Pagasi indique al solicitar el servicio
//   B.4   canal: +58 424-2177798
//
// Reutiliza de contratos-dra.js: _draEstilos, _draParrafo, _draFirma,
// _draLogo, _draCuerpo, _draTxt, _draEnLetras. Son globales de script clasico.

var _CONTRATO_PROTECT_DESDE = '2026-09-07';

// Lista canonica de recaudos del Anexo D. Vive aqui, en el contrato, y el
// formulario de "Documentos del contrato" la importa: asi el papel nunca
// depende de que se haya cargado el archivo del formulario.
function _docsRecaudosLista(hayFiador){
  var l = [
    ['cedCli',  'Copia de cédula de identidad del Comprador'],
    ['rifCli',  'Copia del RIF del Comprador'],
    ['domCli',  'Comprobante de domicilio del Comprador (no mayor a 3 meses)'],
    ['ingCli',  'Constancia o soporte de ingresos / actividad económica del Comprador'],
    ['refCli',  'Referencias personales y/o comerciales del Comprador']
  ];
  if(hayFiador) l = l.concat([
    ['cedFia',  'Copia de cédula de identidad del Fiador'],
    ['rifFia',  'Copia del RIF del Fiador'],
    ['domFia',  'Comprobante de domicilio del Fiador'],
    ['ingFia',  'Constancia o soporte de ingresos / actividad económica del Fiador']
  ]);
  return l.concat([
    ['factura',    'Factura de la Compraventa emitida por el Concesionario, con mención del origen de los fondos'],
    ['finiquito',  'Recibo o finiquito de pago del precio emitido por el Concesionario'],
    ['certOrigen', 'Certificado de origen o documento de propiedad del Vehículo'],
    ['poliza',     'Póliza de Garantía y Responsabilidad Civil de Vehículos'],
    ['fotos',      'Fotografías del Vehículo al momento de la recepción']
  ]);
}
function fechaLocalISOhoy(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

// Tasa financiera anual del contrato y su equivalente quincenal (ano de 360
// dias, quincenas de 15). 12 % / 24 = 0,5 % por quincena.
var _PROTECT_TASA_ANUAL = 0.12;
var _PROTECT_I = _PROTECT_TASA_ANUAL / 24;

// ── La matematica del contrato ──────────────────────────────────────────
// Sistema frances: cuota fija, interes sobre saldo, capital creciente.
//   cuota = MF * i / (1 - (1+i)^-n)
// Aqui se usa AL REVES: la cuota ya la fijo el sistema. Se despeja el MF que
// esa cuota amortiza al 12 %, y el Precio Protect es lo que sobra entre ese MF
// y el saldo del precio no cubierto por la inicial.
function _protectFinanzas(c){
  var precio  = parseFloat(c.precio||0) || 0;
  var inicial = Math.round((parseFloat(c.ini)||0)*100)/100;
  var cuota   = parseFloat(c.cuotaQ||c.cuota||0) || 0;
  var n       = parseInt(c.totalCuotas||0,10) || ((parseInt(c.plazo||0,10)||12)*2);
  var i       = _PROTECT_I;
  var anualidad = (1 - Math.pow(1+i, -n)) / i;          // valor presente de n cuotas de 1
  var MF      = Math.round(cuota * anualidad * 100)/100;  // monto financiado que esa cuota amortiza
  var saldoPrecio = Math.round((precio - inicial)*100)/100;
  var protect = Math.round((MF - saldoPrecio)*100)/100;
  if(protect < 0) protect = 0;                            // por si la cuota fuera menor que el 12 %
  var totalCuotas = Math.round(cuota * n * 100)/100;
  var intereses = Math.round((totalCuotas - MF)*100)/100;
  var MTA = Math.round((MF + intereses)*100)/100;         // = suma de las cuotas

  // Cronograma fila por fila. La ultima cuota absorbe el redondeo para que el
  // saldo cierre exactamente en cero.
  var filas = [], saldo = MF, ini = c.fecha ? new Date(c.fecha+'T12:00:00') : new Date();
  for(var k=1; k<=n; k++){
    var interes = Math.round(saldo * i * 100)/100;
    var capital = (k===n) ? Math.round(saldo*100)/100 : Math.round((cuota - interes)*100)/100;
    var cuotaK  = (k===n) ? Math.round((capital + interes)*100)/100 : cuota;
    saldo = Math.round((saldo - capital)*100)/100;
    if(k===n) saldo = 0;
    filas.push({ n:k, fecha:new Date(ini.getTime() + k*15*24*60*60*1000),
                 capital:capital, interes:interes, cuota:cuotaK, saldo:saldo });
  }
  return { precio:precio, inicial:inicial, saldoPrecio:saldoPrecio, protect:protect,
           MF:MF, cuota:cuota, n:n, intereses:intereses, MTA:MTA, totalCuotas:totalCuotas,
           filas:filas, dias:n*15 };
}

// ── Datos del documento ─────────────────────────────────────────────────
function _protectDatos(credId){
  var id = credId || ($('sel-cred') && $('sel-cred').value);
  var c = (S.creds||[]).find(function(x){ return String(x.id)===String(id); }) || (S.creds||[])[0];
  if(!c) return null;
  var cli  = (S.clientes||[]).find(function(x){ return String(x.id)===String(c.clienteId); })
          || (S.clientes||[]).find(function(x){ return x.nombre===c.cli; }) || {};
  var moto = (S.motos||[]).find(function(m){ return String(m.id)===String(c.motoId); }) || {};
  var emp  = (typeof getEmpresa==='function') ? getEmpresa() : {};
  var conc = (c.concesionarioId && typeof _concGetById==='function') ? (_concGetById(c.concesionarioId)||{}) : {};
  var gps  = (S.gps||[]).find(function(g){ return g && !g.eliminado && String(g.creditoId)===String(c.id); }) || {};
  var F    = _protectFinanzas(c);
  var dc   = c.docsContrato || {};
  // Lo que escribe un empleado se imprime escapado: un '<' en el nombre de
  // una aseguradora no puede comerse medio Anexo C.
  var E    = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

  var num = function(x){ return (parseFloat(x)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var letras = function(x){ return (typeof _numALetras==='function') ? _numALetras(x) : num(x); };
  var b = function(len){ return '<span style="display:inline-block;border-bottom:1px solid #94a3b8;min-width:'+((len||10)*5.5)+'px">&nbsp;</span>'; };
  // "NA", "S/N" y compania valen como vacio: sale la raya, no el texto (punto 20)
  var V = function(v, len){ var s=(typeof _datoReal==='function') ? _datoReal(v) : (v==null?'':String(v)).trim(); return s ? '<strong>'+s+'</strong>' : b(len||14); };
  var USD = function(x){ return '<strong>US$ '+num(x)+'</strong>'; };
  var T = function(v){ return (typeof _datoReal==='function') ? _datoReal(v) : (v==null?'':String(v)).trim(); };

  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var fc = c.fecha ? new Date(c.fecha+'T12:00:00') : new Date();
  // Adam (10-sep-2026): cada contrato debe llevar la hora ademas de la fecha.
  // Sale de c.creado (el momento exacto en que se registro el credito). En un
  // credito viejo sin ese campo queda la raya para llenar a boligrafo.
  var hcre = null;
  if(c.creado){ var _h=new Date(c.creado); if(!isNaN(_h.getTime())) hcre=_h; }
  var horaDoc = hcre ? hcre.toLocaleTimeString('es-VE',{hour:'numeric',minute:'2-digit'}) : '';
  var fechaLarga = fc.toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'});
  var tasaEuro = parseFloat(window._tasaEuro||0) || 0;
  var mtaBs = tasaEuro>0 ? '<strong>Bs. '+num(F.MTA*tasaEuro)+'</strong>' : b(16);

  var fechaProtectFin = new Date(fc.getTime()); fechaProtectFin.setFullYear(fechaProtectFin.getFullYear()+1);
  var fmt = function(d){ return d.toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric'}); };

  var uso = String(c.uso_moto||'PERSONAL').toUpperCase();
  // Los bancos tambien salen de Configuracion -> Empresa: con dos companias, las
  // cuentas de una no pueden aparecer en el contrato de la otra (22-sep-2026).
  var _empC = _empCtr();
  var medios = 'Transferencia o deposito a las cuentas de '+_empC.nom+' en <strong>'+_empC.bancoUsd+'</strong> '
             + '(cuenta corriente en bolivares y cuentas custodia en dolares) y a la billetera digital de '+_empC.nom+' '
             + 'en <strong>'+_empC.billetera+'</strong>, segun los datos que Pagasi comunique por escrito al Comprador';

  return {
    c:c, cli:cli, moto:moto, emp:emp, conc:conc, gps:gps, F:F, b:b, num:num, V:V, USD:USD, T:T, fmt:fmt,
    // ── Pagasi ──
    empRm: V(emp.rm, 12), empRmEstado: V(emp.rmEstado, 16), empRmNum: V(emp.rmNum, 5),
    empRmTomo: V(emp.rmTomo, 6), empRmFecha: V(emp.rmFecha, 10),
    // Por decision de la empresa el representante NO se identifica en el
    // contrato: firma la compania, identificada por su RIF.
    // ── Comprador ──
    cliNom: V(cli.nombre || c.cli, 28), cliCi: V(_draCedulaTxt(cli.cedula || cli.ci), 11),
    cliRif: V(T(cli.rif) || _draCedulaTxt(cli.cedula||cli.ci), 12),
    cliDir: V(cli.direccion, 40), cliCiudad: V(cli.ciudad, 14),
    cliEmail: V(cli.email, 22), cliTel: V(cli.tel || cli.wa, 14), cliProf: V(cli.trabajo || cli.profesion || cli.ocupacion, 16),
    // ── Fiador ──
    hayFiador: !!T(cli.fiador_nom),
    fiaNom: V(cli.fiador_nom, 28), fiaCi: V(_draCedulaTxt(cli.fiador_ci), 11), fiaDir: V(cli.fiador_dir, 40),
    fiaEmail: V(cli.fiador_email, 22), fiaTel: V(cli.fiador_tel, 14), fiaProf: V(E(dc.fiadorProfesion), 16),
    // 'de profesion u oficio X, ' solo cuando se sabe: una raya en el encabezado se ve mal
    cliProfFrase: T(cli.trabajo || cli.profesion || cli.ocupacion) ? 'de profesión u oficio <strong>'+E(cli.trabajo || cli.profesion || cli.ocupacion)+'</strong>, ' : '',
    fiaProfFrase: T(dc.fiadorProfesion) ? 'de profesión u oficio <strong>'+E(dc.fiadorProfesion)+'</strong>, ' : '',
    // ── Concesionario (no firma, pero se identifica en los considerandos) ──
    concNom: V(conc.nombre, 26), concRif: V(conc.rif, 12),
    // ── Vehiculo ──
    // T() ya descarta "NA"/"S/N": se aplica a CADA candidato, no al resultado, para no
    // perder el dato bueno de la moto cuando el credito trae basura (22-sep-2026).
    marca:  V(T(c.marca) || T(moto.marca), 12), modelo: V(T(c.modelo) || T(moto.modelo), 16), anio: V(T(c.anio) || T(moto.anio), 6),
    tipo:   V(T(moto.tipo) || 'PASEO', 10), color: V(T(c.color) || T(moto.color), 10),
    placa:  V(T(c.placa) || T(moto.placa), 10),
    chasis: V(T(c.serialChasis) || T(moto.serialChasis) || T(c.vin) || T(moto.vin), 18),
    motor:  V(T(c.serialMotor) || T(moto.serialMotor), 18), uso: '<strong>'+uso+'</strong>',
    // ── GPS (del modulo GPS, si el equipo ya esta asignado al credito) ──
    gpsModelo: V(gps.idGps ? 'MiCODUS MV710G' : '', 14), gpsSerial: V(gps.idGps, 12), gpsImei: V(gps.imei, 16),
    gpsFecha: V(gps.fechaInstalacion ? fmt(new Date(gps.fechaInstalacion+'T12:00:00')) : '', 10),
    gpsTecnico: V(gps.tecnico, 14),
    // ── Dinero ──
    precio: USD(F.precio), inicial: USD(F.inicial), saldoPrecio: USD(F.saldoPrecio),
    protect: USD(F.protect), MF: USD(F.MF), intereses: USD(F.intereses), MTA: USD(F.MTA), mtaBs: mtaBs,
    cuota: USD(F.cuota), nCuotas: '<strong>'+F.n+'</strong>', nCuotasLetras: '<strong>'+_draEnLetras(F.n)+'</strong>',
    dias: '<strong>'+F.dias+'</strong>', diasLetras: '<strong>'+_draEnLetras(F.dias)+'</strong>',
    mtaLetras: '<strong>'+letras(F.MTA)+'</strong>',
    medios: medios,
    // ── Fechas ──
    fechaLarga: '<strong>'+fechaLarga+'</strong>', diaNum: '<strong>'+fc.getDate()+'</strong>',
    hora: horaDoc ? '<strong>'+horaDoc+'</strong>' : b(8),
    mesNom: '<strong>'+MESES[fc.getMonth()]+'</strong>', anioNum: '<strong>'+fc.getFullYear()+'</strong>',
    protectDesde: '<strong>'+fmt(fc)+'</strong>', protectHasta: '<strong>'+fmt(fechaProtectFin)+'</strong>',
    // ── Documentos del contrato (lo que se llena con el cliente delante) ──
    docs: dc,
    facturaNum: V(E(dc.facturaNum), 10),
    // Sin fecha de factura guardada, la del credito: es lo que imprimia antes
    facturaFecha: V(fmt(new Date((dc.facturaFecha || c.fecha || fechaLocalISOhoy())+'T12:00:00')), 10),
    certOrigenNum: V(E(dc.certOrigenNum), 14),
    poliza: V([E(dc.polizaCia), E(dc.polizaNum)].filter(Boolean).join(' · '), 22),
    actividad: V(E(dc.actividad || cli.trabajo || cli.profesion || cli.ocupacion), 16),
    ingresoMensual: V((dc.ingresoMensual || cli.ingreso) ? 'US$ '+num(dc.ingresoMensual || cli.ingreso) : '', 12),
    // PEP en NO por defecto: si alguien lo es, se tacha y se marca SI a mano
    pepNo: dc.pep==='si' ? '(&nbsp;&nbsp;)' : '(&nbsp;X&nbsp;)',
    pepSi: dc.pep==='si' ? '(&nbsp;X&nbsp;)' : '(&nbsp;&nbsp;)',
    pepDetalle: V(E(dc.pepDetalle), 24),
    verFecha: V(dc.verificado && dc.verificadoFecha ? fmt(new Date(dc.verificadoFecha+'T12:00:00')) : '', 8),
    verRes: dc.verificado ? '<strong>sin novedad</strong>' : b(10),
    analista: V(E(dc.analista || c.creadoPor), 16), aprobadoPor: V(E(dc.aprobadoPor || c.aprobadoPor), 14),
    recaudo: function(key){ return (dc.recaudos && dc.recaudos[key]===true) ? 'Sí (&nbsp;X&nbsp;) &nbsp; No (&nbsp;&nbsp;)' : (dc.recaudos && dc.recaudos[key]===false ? 'Sí (&nbsp;&nbsp;) &nbsp; No (&nbsp;X&nbsp;)' : 'Sí (&nbsp;&nbsp;) &nbsp; No (&nbsp;&nbsp;)'); },
    otrosTexto: V(E(dc.otrosTexto), 24)
  };
}

// ── El cuerpo del contrato ──────────────────────────────────────────────
// Un parrafo por funcion, igual que _DRA_CUERPO. Los que devuelven '' no se
// imprimen (asi desaparece el fiador cuando no hay).
var _PROTECT_CUERPO = [
  // ── Preambulo ──
  function(D){ return 'El presente CONTRATO DE FINANCIAMIENTO PARA LA ADQUISICIÓN DE VEHÍCULO AUTOMOTOR, CON GARANTÍAS, FIANZA Y PRESTACIÓN DE SERVICIOS «PAGASI PROTECT» (en lo sucesivo, el “Contrato”) se celebra el dia '+D.fechaLarga+', siendo las '+D.hora+' (la “Fecha de Celebración”), entre:'; },
  function(D){ return '(i) <strong>'+_empCtr().nom+'</strong>, sociedad mercantil domiciliada en Caracas, Distrito Capital, inscrita en el Registro Mercantil '+D.empRm+' de la Circunscripción Judicial '+D.empRmEstado+', bajo el N° '+D.empRmNum+', Tomo '+D.empRmTomo+', de fecha '+D.empRmFecha+', inscrita en el Registro de Información Fiscal (“RIF”) bajo el N° <strong>'+_empCtr().rif+'</strong> (en adelante “Pagasi”, y en su condición de otorgante del financiamiento y acreedor, también el “Financista”); y'; },
  function(D){ return '(ii) '+D.cliNom+', venezolano(a), mayor de edad, '+D.cliProfFrase+'domiciliado(a) en '+D.cliDir+', titular de la cédula de identidad venezolana N° '+D.cliCi+' y del RIF N° '+D.cliRif+' (el “Comprador” o “Deudor”, y conjuntamente con Pagasi, las “Partes” y cada una, una “Parte”).'; },
  function(D){ return D.hayFiador ? 'Asimismo interviene en el presente Contrato (iii) '+D.fiaNom+', venezolano(a), mayor de edad, '+D.fiaProfFrase+'domiciliado(a) en '+D.fiaDir+', titular de la cédula de identidad venezolana N° '+D.fiaCi+', quien actúa en su carácter de fiador solidario y principal pagador del Comprador (el “Fiador”), quedando comprendido dentro de la definición de “Partes” para todos los efectos de este Contrato.' : ''; },
  function(D){ return 'Todo ello de conformidad con lo previsto en los artículos 1.133, 1.159, 1.160, 1.167, 1.211, 1.215, 1.264, 1.266, 1.268, 1.269, 1.283, 1.296, 1.299, 1.300, 1.302, 1.735 y siguientes, y 1.804 y siguientes del Código Civil; el artículo 128 del Decreto con Rango, Valor y Fuerza de Ley del Banco Central de Venezuela; la Ley de Transporte Terrestre; y demás normativa aplicable, en base a los términos y condiciones siguientes:'; },
  function(D){ return 'CONSIDERANDO QUE '+D.concNom+', sociedad mercantil, RIF N° '+D.concRif+' (el “Concesionario”), es una agencia distribuidora de motocicletas en los términos previstos en el artículo 18(1) del Reglamento Parcial de la Ley de Transporte Terrestre sobre el Uso y Circulación de Motocicletas en la Red Vial Nacional y el Transporte Público de Personas en la Modalidad Individual Moto Taxis, contenido en el Decreto Presidencial N° 8.495, publicado en Gaceta Oficial N° 39.772 del 5 de octubre de 2011 (el “Reglamento LTT—Motos”).'; },
  function(D){ return 'CONSIDERANDO QUE el Comprador ha celebrado, o celebra en esta misma fecha, un contrato de compraventa con el Concesionario, en virtud del cual adquiere de éste, para sí, un vehículo automotor de la clase motocicleta identificado con las siguientes características: marca: '+D.marca+'; modelo: '+D.modelo+'; año: '+D.anio+'; clase: <strong>MOTO</strong>; tipo: '+D.tipo+'; color: '+D.color+'; placa: '+D.placa+'; serial de carrocería o chasis: '+D.chasis+'; serial de motor: '+D.motor+'; uso: '+D.uso+'; N° de certificado de origen: '+D.certOrigenNum+'; según factura N° '+D.facturaNum+' de fecha '+D.facturaFecha+' emitida por el Concesionario (el “Vehículo” y la “Compraventa”, respectivamente).'; },
  function(D){ return 'CONSIDERANDO QUE el Comprador no dispone de los fondos necesarios para pagar de contado el precio del Vehículo, y ha solicitado a Pagasi el otorgamiento de un financiamiento con dicha finalidad, el cual Pagasi ha convenido en otorgar con recursos propios, en los términos y condiciones del presente Contrato.'; },
  function(D){ return 'CONSIDERANDO QUE, en ejecución de dicho financiamiento, Pagasi paga o pone a disposición del Concesionario, por cuenta, orden y en descargo del Comprador, la porción financiada del precio del Vehículo, quedando el Comprador obligado a reembolsar dicha suma a Pagasi, con sus intereses, en la forma prevista en la Cláusula 3.'; },
  function(D){ return 'CONSIDERANDO QUE es voluntad expresa del Comprador subrogar a Pagasi en todos los derechos, acciones, privilegios y garantías que el Concesionario tenga o pudiera tener contra él por razón del precio del Vehículo, de conformidad con el ordinal 2° del artículo 1.299 del Código Civil.'; },
  function(D){ return 'CONSIDERANDO QUE el Comprador ha manifestado, de forma libre, voluntaria, informada y no condicionada, su voluntad de contratar adicionalmente con Pagasi el programa de servicios y suministro de bienes denominado “Pagasi Protect”, en los términos de la Cláusula 2 y del Anexo “B” de este Contrato.'; },
  function(D){ return 'CONSIDERANDO QUE el Comprador'+(D.hayFiador?' y el Fiador convienen':' conviene')+' en constituir a favor de Pagasi las garantías previstas en '+(D.hayFiador?'las Cláusulas 6 y 14':'la Cláusula 6')+', como mecanismo de aseguramiento del pago íntegro del Monto Total Adeudado.'; },
  function(D){ return 'Las Partes, por medio del presente Contrato, expresamente establecen lo siguiente:'; },

  // ── 1 ──
  function(D){ return '1. OBJETO DEL CONTRATO'; },
  function(D){ return '1.1\tOtorgamiento del Financiamiento. Pagasi otorga al Comprador, quien acepta, un financiamiento con destino único y exclusivo al pago del precio de adquisición del Vehículo al Concesionario y del Precio Protect, por el monto, en los términos y bajo las condiciones establecidos en la Cláusula 3 (el “Financiamiento”). El Comprador se obliga a reembolsar a Pagasi el Monto Total Adeudado en la forma, oportunidad y condiciones allí previstas.'; },
  function(D){ return '1.2\tDesembolso; Destino de los Fondos. El desembolso del Financiamiento se realiza en este acto mediante el pago directo por Pagasi al Concesionario de la cantidad de '+D.saldoPrecio+', por cuenta, orden y en descargo del Comprador, quien así lo instruye de manera expresa e irrevocable. El Comprador declara que dicho pago se efectúa exclusivamente con fondos provistos por Pagasi en virtud de este Contrato, y que el Financiamiento no podrá ser destinado a ninguna finalidad distinta.'; },
  function(D){ return '1.3\tRecaudos de la Compraventa. El Comprador se obliga a obtener del Concesionario y a entregar a Pagasi, en este acto o dentro de los '+D.b(4)+' días continuos siguientes: (a) la factura o documento de la Compraventa, en la cual deberá dejarse constancia expresa de que el precio fue pagado con fondos provenientes del financiamiento otorgado por '+_empCtr().nom+' conforme a este Contrato; (b) el recibo o finiquito de pago del precio emitido por el Concesionario, con idéntica mención y con indicación de si la venta se efectuó o no con reserva de dominio; y (c) el certificado de origen o documento de propiedad del Vehículo. Estos recaudos son requisito para la plena eficacia de la subrogación prevista en la Sección 6.1.'; },
  function(D){ return '1.4\tPrestación de Servicios «Pagasi Protect». Adicionalmente, y como negocio jurídico autónomo y separable del Financiamiento, Pagasi presta al Comprador los servicios y suministra los bienes que integran el programa “Pagasi Protect” (el “Programa”), en los términos de la Cláusula 2 y del Anexo “B”.'; },
  function(D){ return '1.5\tPagasi no es Vendedora; Ausencia de Responsabilidad sobre el Vehículo. El Comprador reconoce y acepta expresamente que Pagasi no es vendedora, fabricante, ensambladora, importadora ni distribuidora del Vehículo, y que su única intervención consiste en el otorgamiento del Financiamiento y en la prestación de los servicios del Programa. En consecuencia: (a) Pagasi no asume obligación alguna de entrega, saneamiento por evicción, saneamiento por vicios ocultos, garantía, calidad, idoneidad, funcionamiento, mantenimiento o reparación del Vehículo; (b) toda reclamación relativa al Vehículo, su estado, su documentación, su entrega o la garantía del fabricante deberá dirigirse exclusivamente contra el Concesionario o contra el garante que corresponda; y (c) ninguna incidencia, reclamación, controversia, retraso, defecto o litigio entre el Comprador y el Concesionario suspenderá, extinguirá, reducirá ni permitirá compensar las obligaciones de pago del Comprador frente a Pagasi bajo este Contrato, las cuales son autónomas, líquidas, exigibles e incondicionales.'; },
  function(D){ return '1.6\tRecepción del Vehículo. El Comprador declara que ha recibido el Vehículo del Concesionario, en este acto, previa inspección directa y personal a su entera satisfacción, conjuntamente con sus llaves, manuales, documentos y accesorios, todo lo cual hace constar en la Constancia de Recepción que se acompaña como Anexo “C” y forma parte integrante de este Contrato. Desde la recepción material, el Comprador asume la posesión, uso, guarda, custodia, conservación, mantenimiento ordinario y extraordinario, y la responsabilidad civil, administrativa, penal y de tránsito derivada del Vehículo.'; },
  function(D){ return '1.7\tLugar de Permanencia del Vehículo. Las Partes declaran que, mientras se mantengan vigentes las garantías previstas en la Cláusula 6, el Vehículo permanecerá y pernoctará habitualmente en la siguiente dirección: '+D.cliDir+'. El Comprador se obliga a notificar por escrito a Pagasi, dentro de los cinco (5) días continuos siguientes, cualquier cambio de dicha dirección, y a no trasladar el Vehículo fuera del territorio de la República Bolivariana de Venezuela.'; },
  function(D){ return '1.8\tUso y Mantenimiento del Vehículo. Durante el Período de Vigencia, el Comprador deberá usar el Vehículo de forma prudente, lícita y conforme a su destino natural, con la diligencia de un buen padre de familia, obligándose a: (a) mantenerlo en buen estado de funcionamiento y conservación; (b) realizar oportunamente el mantenimiento preventivo y correctivo; (c) abstenerse de modificar, alterar, borrar o sustituir seriales, placas, piezas esenciales o características de identificación; (d) abstenerse de destinarlo a actividades ilícitas o distintas de las autorizadas; y (e) cumplir estrictamente la Ley de Transporte Terrestre, el Reglamento LTT—Motos y el ordenamiento jurídico venezolano. El Comprador asumirá a su exclusivo cargo los costos de combustible, lubricantes, consumibles, mantenimiento, reparaciones (independientemente de su cuantía), neumáticos, accesorios, estacionamiento, multas, impuestos, tasas, daños o indemnizaciones a terceros derivadas de accidentes en los que haya estado involucrado el Vehículo, la Póliza de Seguro, y demás gastos, costos, cargas u obligaciones derivadas del uso, tenencia, circulación y custodia del Vehículo.'; },
  function(D){ return '1.9\tPóliza de Seguro. Durante el Período de Vigencia, el Comprador se obliga a mantener a su propia costa, debidamente pagada y vigente, la Póliza de Garantía y Responsabilidad Civil de Vehículos, o cualquier póliza sustancialmente equivalente exigida por la Ley de Transporte Terrestre, el Reglamento LTT—Motos y el ordenamiento jurídico venezolano (la “Póliza de Seguro”). El Comprador entregará a Pagasi copia de la(s) póliza(s) y de sus renovaciones dentro de los '+D.b(4)+' días continuos siguientes a su emisión.'; },
  function(D){ return '1.10\tDestino del Vehículo. El Comprador declara que el uso previsto del Vehículo es '+D.uso+'. Si el uso declarado corresponde al transporte público de personas en la modalidad individual moto taxi, o a cualquier actividad de reparto o delivery, el Comprador se obliga a obtener y mantener vigentes todas las autorizaciones, permisos, inscripciones y coberturas exigidas por el Reglamento LTT—Motos y la normativa aplicable. Cualquier cambio en el uso declarado deberá ser notificado previamente y por escrito a Pagasi.'; },

  // ── 2 ──
  function(D){ return '2. PROGRAMA «PAGASI PROTECT»'; },
  function(D){ return '2.1\tObjeto y Contenido del Programa. El Comprador contrata con Pagasi, quien se obliga a prestar y suministrar, por un período de doce (12) meses continuos contados a partir de la Fecha de Celebración (el “Período Protect”), el programa “Pagasi Protect”, integrado por los siguientes bienes y servicios:'; },
  function(D){ return '(a)\tUn (1) servicio de cambio de aceite y filtro del Vehículo, en los talleres o centros de servicio autorizados por Pagasi;'; },
  function(D){ return '(b)\tUn (1) servicio de lavado del Vehículo, en los establecimientos autorizados por Pagasi;'; },
  function(D){ return '(c)\tEl suministro e instalación de un (1) dispositivo de rastreo y geolocalización satelital (GPS) con finalidad antirrobo;'; },
  function(D){ return '(d)\tEl suministro e instalación de un (1) dispositivo de corte o apagado remoto del sistema de encendido del Vehículo, para su uso en caso de robo o hurto (conjuntamente con el dispositivo referido en el literal (c), los “Dispositivos”). La instalación de los Dispositivos se realizará en un centro autorizado por Pagasi, dentro de los treinta (30) días continuos siguientes a la Fecha de Celebración, para lo cual el Comprador se obliga a presentar el Vehículo en la fecha y lugar que Pagasi le indique; y'; },
  function(D){ return '(e)\tEl servicio de monitoreo y rastreo satelital del Vehículo, y el servicio de activación del apagado remoto en caso de robo o hurto, conforme al protocolo previsto en la Sección 2.7.'; },
  function(D){ return 'Las condiciones operativas, alcances, exclusiones, canales de atención, tiempos de respuesta y talleres autorizados del Programa se detallan en el Anexo “B”, el cual forma parte integrante de este Contrato.'; },
  function(D){ return '2.2\tPrecio del Programa. El precio único y total del Programa es la cantidad de '+D.protect+' (el “Precio Protect”), el cual se encuentra incluido dentro del Monto Financiado y será pagado por el Comprador de forma fraccionada, como parte de las Cuotas Quincenales, en los términos de la Cláusula 3.'; },
  function(D){ return '2.3\tNaturaleza Jurídica; el Programa NO constituye un contrato de seguro. Las Partes declaran expresamente que el Programa es un contrato de prestación de servicios y de suministro de bienes muebles, regido por el Código Civil y el Código de Comercio. El Programa NO constituye, ni podrá interpretarse, calificarse o asimilarse a un contrato de seguro, de reaseguro, de medicina prepagada, de administración de riesgos, de fianza, de financiamiento de primas, ni a ninguna otra relación u operación calificada como actividad aseguradora conforme al artículo 2 de la Ley de la Actividad Aseguradora. En consecuencia, y sin que la enunciación sea limitativa: (a) Pagasi no asume, transfiere, administra ni indemniza riesgo alguno del Comprador; (b) Pagasi no indemnizará al Comprador por la pérdida, robo, hurto, daño, destrucción total o parcial, desaparición o no recuperación del Vehículo, ni por lucro cesante, daño emergente o daño moral alguno; (c) el Programa no sustituye ni suple la Póliza de Seguro prevista en la Sección 1.9, la cual el Comprador se obliga a contratar por separado con una empresa de seguros autorizada; y (d) las obligaciones de Pagasi bajo el Programa son obligaciones de medio y no de resultado. El Comprador declara comprender y aceptar plenamente lo anterior.'; },
  function(D){ return '2.4\tCarácter Voluntario y Separable. El Comprador declara que la contratación del Programa ha sido libre, voluntaria e informada; que le fueron ofrecidas las condiciones del Financiamiento sin el Programa; y que la contratación del Programa no fue impuesta por Pagasi como condición para el otorgamiento del Financiamiento. La nulidad, resolución o terminación anticipada del Programa no afectará la validez, vigencia ni exigibilidad del Financiamiento, de las garantías ni de las obligaciones de pago derivadas de la Cláusula 3, salvo por el ajuste del Precio Protect previsto en la Sección 2.10.'; },
  function(D){ return '2.5\tPropiedad y Custodia de los Dispositivos. Los Dispositivos son y permanecerán en propiedad de Pagasi durante el Período de Vigencia. El Comprador los recibe en calidad de depositario, obligándose a custodiarlos con la diligencia de un buen padre de familia. Una vez pagado íntegramente el Monto Total Adeudado y culminado el Período Protect, los Dispositivos pasarán en propiedad al Comprador sin contraprestación adicional.'; },
  function(D){ return '2.6\tObligaciones del Comprador respecto de los Dispositivos. El Comprador se obliga a no remover, desconectar, alterar, bloquear, inhibir, manipular, dañar ni interferir de cualquier forma con los Dispositivos, su tarjeta, batería, antena, cableado, software o señal, ni permitir que terceros lo hagan, salvo autorización previa y por escrito de Pagasi o intervención técnica autorizada. El Comprador se obliga igualmente a permitir el acceso al Vehículo para la instalación, revisión, mantenimiento, reparación, sustitución o retiro de los Dispositivos, dentro de los cinco (5) días hábiles siguientes al requerimiento escrito de Pagasi. Cualquier manipulación no autorizada de los Dispositivos constituirá un Supuesto de Incumplimiento conforme a la Sección 9.1. Los costos de mantenimiento extraordinario, reposición, reparación, reinstalación o sustitución causados por daño, pérdida, manipulación, desconexión, negligencia o uso indebido imputable al Comprador serán asumidos por éste.'; },
  function(D){ return '2.7\tProtocolo de Apagado Remoto; Limitaciones. Las Partes convienen expresamente el siguiente protocolo, de obligatorio cumplimiento para Pagasi:'; },
  function(D){ return '(a)\tLa función de apagado o corte remoto del encendido únicamente podrá ser activada por Pagasi en los siguientes supuestos: (i) previa solicitud expresa del Comprador; (ii) ante denuncia de robo o hurto del Vehículo formulada ante el órgano competente; (iii) por requerimiento de una autoridad administrativa, policial o judicial competente; o (iv) en el marco de una gestión de recuperación del Vehículo derivada de robo o hurto.'; },
  function(D){ return '(b)\tEn todos los casos, la activación se ejecutará únicamente cuando el Vehículo se encuentre detenido y con velocidad igual a cero, y operará exclusivamente impidiendo un nuevo encendido. En ningún caso la activación podrá interrumpir la marcha del Vehículo mientras éste se encuentre en circulación, ni ejecutarse de manera que pueda poner en riesgo la vida, la integridad física o la seguridad del conductor, de sus acompañantes o de terceros.'; },
  function(D){ return '(c)\tLas Partes dejan expresa constancia de que la función de apagado remoto NO constituye un mecanismo de cobranza, de coacción, de autotutela ni de ejecución de garantías, y Pagasi se obliga a no activarla por razón de mora o incumplimiento de las obligaciones de pago del Comprador. La ejecución de las garantías y la recuperación no voluntaria del Vehículo se realizarán exclusivamente por las vías judiciales previstas en la Cláusula 9.'; },
  function(D){ return '(d)\tPagasi llevará un registro de cada activación, indicando fecha, hora, causa y persona que la autorizó, el cual estará a disposición del Comprador y de las autoridades competentes que lo requieran.'; },
  function(D){ return '2.8\tUso de los Servicios; Caducidad. Los servicios de cambio de aceite y lavado deberán ser solicitados y utilizados por el Comprador dentro del Período Protect, mediante los canales indicados en el Anexo “B”. Dichos servicios no son acumulables, transferibles, canjeables por dinero ni prorrogables, y caducarán al vencimiento del Período Protect si no hubieren sido utilizados, salvo que la imposibilidad de uso sea imputable a Pagasi.'; },
  function(D){ return '2.9\tExclusiones y Limitación de Responsabilidad. El Programa no comprende repuestos, piezas, insumos distintos de los expresamente indicados, reparaciones, servicios de grúa, asistencia vial, ni servicio alguno no listado en la Sección 2.1 y el Anexo “B”. Pagasi no será responsable por interrupciones, fallas, latencias, imprecisiones o indisponibilidad del servicio de rastreo o de apagado remoto derivadas de: falta o degradación de cobertura de la red celular o satelital; suspensión del servicio por los operadores de telecomunicaciones o por el proveedor de la plataforma; manipulación, desconexión o daño de los Dispositivos; agotamiento de la batería; interferencias; caso fortuito o fuerza mayor; o cualquier otra causa ajena a su control razonable.'; },
  function(D){ return '2.10\tAjuste por Terminación Anticipada del Programa. Si el Programa terminare anticipadamente por causa imputable a Pagasi, el Precio Protect se ajustará proporcionalmente al tiempo transcurrido del Período Protect y a los bienes efectivamente suministrados y servicios efectivamente prestados, y la diferencia se imputará como abono a capital del Financiamiento. Los Dispositivos ya suministrados e instalados y los servicios ya utilizados no serán objeto de reembolso.'; },
  function(D){ return '2.11\tCanales de Atención. Las solicitudes de servicio, el reporte de robo o hurto y toda comunicación relativa al Programa se canalizarán a través de los medios indicados en el Anexo “B”.'; },
  function(D){ return '2.12\tSuministro y Cobertura de Datos. El servicio de monitoreo depende de la conectividad celular y satelital provista por terceros. Pagasi suministrará la línea de datos del Dispositivo durante el Período Protect. El Comprador reconoce que la cobertura puede ser inexistente o intermitente en determinadas zonas del territorio nacional y que ello no constituye incumplimiento de Pagasi.'; },

  // ── 3 ──
  function(D){ return '3. MONTO DEL FINANCIAMIENTO, INTERESES Y CUOTAS'; },
  function(D){ return '3.1\tPrecio del Vehículo. El precio de adquisición del Vehículo pagadero al Concesionario, según la factura de la Compraventa, es la cantidad de '+D.precio+' (el “Precio del Vehículo”).'; },
  function(D){ return '3.2\tInicial. El Comprador paga en este acto, a Pagasi, la cantidad de '+D.inicial+' por concepto de cuota inicial (la “Inicial”), la cual se imputa al Precio del Vehículo. Pagasi declara recibir dicho monto a su entera y cabal satisfacción, sirviendo el presente Contrato como suficiente recibo y finiquito de la Inicial.'; },
  function(D){ return '3.3\tMonto Financiado. El monto total financiado por Pagasi asciende a '+D.MF+' (el “Monto Financiado”), integrado por: (a) el saldo del Precio del Vehículo no cubierto por la Inicial, esto es, '+D.saldoPrecio+', desembolsado conforme a la Sección 1.2; y (b) el Precio Protect, esto es, '+D.protect+'.'; },
  function(D){ return '3.4\tIntereses Financieros. El Monto Financiado devengará intereses financieros a una tasa fija del doce por ciento (12%) anual, calculados sobre los saldos deudores de capital, sobre la base de un año de trescientos sesenta (360) días y períodos quincenales de quince (15) días continuos, mediante el sistema de amortización de cuota fija (sistema francés) (los “Intereses Financieros”). El monto total de Intereses Financieros a devengarse durante todo el plazo, calculado conforme al cronograma del Anexo “A”, asciende a '+D.intereses+'.'; },
  function(D){ return '3.5\tMonto Total Adeudado. La suma del Monto Financiado y de los Intereses Financieros asciende a '+D.MTA+' ('+D.mtaLetras+') (el “Monto Total Adeudado”), sin perjuicio de los intereses moratorios, Impuestos, gastos y demás conceptos que resulten exigibles conforme a este Contrato. Para dar cumplimiento a lo establecido en el artículo 130 del Decreto con Rango, Valor y Fuerza de Ley del Banco Central de Venezuela, el Monto Total Adeudado equivale a '+D.mtaBs+', calculados al tipo de cambio de referencia publicado por el Banco Central de Venezuela vigente para la fecha de redacción y visado de este documento.'; },
  function(D){ return '3.6\tReconocimiento de Deuda. El Comprador reconoce y declara adeudar a Pagasi el Monto Total Adeudado, y se obliga a pagarlo en la forma, plazos y condiciones establecidos en esta Cláusula 3 y en el cronograma del Anexo “A”, con expresa renuncia a oponer excepciones derivadas de su relación con el Concesionario, conforme a la Sección 1.5.'; },
  function(D){ return '3.7\tTransparencia del Costo del Financiamiento. El Comprador declara que, previamente a la celebración de este Contrato, le fueron informados y explicados de forma clara, desglosada y comprensible: el Precio del Vehículo, el Precio Protect, la Inicial, el Monto Financiado, la tasa de Intereses Financieros, el monto total de los Intereses Financieros, el número y monto de las Cuotas Quincenales, la Tasa de Intereses Moratorios y el Monto Total Adeudado.'; },
  function(D){ return '3.8\tCuotas Quincenales. El Monto Total Adeudado será pagado por el Comprador a Pagasi mediante '+D.nCuotas+' ('+D.nCuotasLetras+') cuotas quincenales consecutivas, cada una por el monto de '+D.cuota+' (cada una, una “Cuota Quincenal”), conforme al cronograma de pagos contenido en el Anexo “A”. Cada Cuota Quincenal comprende la amortización de capital, los Intereses Financieros del período y la porción proporcional del Precio Protect, según el desglose del Anexo “A”.'; },
  function(D){ return '3.9\tVencimiento. La primera Cuota Quincenal vencerá a los quince (15) días continuos contados a partir de la Fecha de Celebración, y las sucesivas vencerán cada quince (15) días continuos siguientes, conforme al cronograma del Anexo “A”. Cada Cuota Quincenal podrá ser pagada en cualquier momento dentro del período quincenal que le corresponda, mediante uno o varios pagos parciales o abonos.'; },
  function(D){ return '3.10\tPeríodo de Gracia; Mora. El Comprador dispondrá de un período de gracia de cinco (5) días continuos contados a partir de la fecha de vencimiento de cada Cuota Quincenal, durante el cual no se causarán intereses moratorios ni recargo alguno. Transcurrido íntegramente dicho período de gracia sin que el pago se hubiere completado, el saldo insoluto causará intereses moratorios a partir del sexto (6°) día continuo siguiente a la fecha de vencimiento de la Cuota Quincenal, y hasta la fecha en que el pago se haga efectivo, a la Tasa de Intereses Moratorios indicada en la Sección 3.12.'; },
  function(D){ return '3.11\tExcedentes. Si los pagos efectuados dentro de un período quincenal exceden el monto de la Cuota Quincenal correspondiente, y no existieren montos vencidos e insolutos, el excedente se imputará automáticamente a la Cuota Quincenal inmediatamente siguiente, salvo instrucción escrita del Comprador de aplicarlo como abono a capital conforme a la Sección 3.16.'; },
  function(D){ return '3.12\tIntereses Moratorios. Los montos debidos e insolutos de cada Cuota Quincenal generarán intereses moratorios a una tasa del tres por ciento (3%) anual de interés simple, o, en su defecto, a la tasa máxima permitida por la legislación venezolana aplicable si ésta resultare menor (la “Tasa de Intereses Moratorios”), calculados en proporción a los días continuos de mora efectivamente transcurridos. Los intereses moratorios se causarán de forma adicional y acumulativa a los Intereses Financieros previstos en la Sección 3.4, los cuales continuarán devengándose sobre el saldo deudor durante todo el período de mora. Los intereses moratorios no serán capitalizables ni generarán a su vez intereses.'; },
  function(D){ return '3.13\tImputación de los Pagos. Todo pago recibido del Comprador se imputará en el siguiente orden: (i) en primer lugar, a los gastos de cobranza judicial y extrajudicial efectivamente causados y documentados; (ii) en segundo lugar, a los intereses moratorios causados y no pagados; (iii) en tercer lugar, a los Intereses Financieros vencidos y no pagados; (iv) en cuarto lugar, al capital de las Cuotas Quincenales vencidas e insolutas; y (v) en quinto lugar, a la Cuota Quincenal del período en curso. Una vez cubiertos esos conceptos, cualquier excedente se imputará conforme a la Sección 3.11. Esta imputación se conviene expresamente por las Partes a los efectos del artículo 1.302 del Código Civil.'; },
  function(D){ return '3.14\tMoneda de Cuenta y Moneda de Pago. El Precio del Vehículo, el Precio Protect, la Inicial, el Monto Financiado, los Intereses Financieros, el Monto Total Adeudado y las Cuotas Quincenales se encuentran expresados en Dólares, moneda que las Partes acuerdan como moneda de cuenta del presente Contrato. De conformidad con el artículo 128 del Decreto con Rango, Valor y Fuerza de Ley del Banco Central de Venezuela, el Comprador podrá liberarse válidamente de sus obligaciones de pago, a su elección: (i) mediante el pago en Dólares; o (ii) mediante el pago en Bolívares, por el equivalente calculado al tipo de cambio de referencia del EURO publicado por el Banco Central de Venezuela (https://www.bcv.org.ve/estadisticas/tipo-cambio-de-referencia-smc), vigente para la fecha efectiva en que se realice cada pago. Si la fecha efectiva de pago fuere un día no hábil bancario, o el Banco Central de Venezuela no hubiere publicado el tipo de cambio para esa fecha, se aplicará el último tipo de cambio de referencia del EURO publicado con anterioridad a dicha fecha.'; },
  function(D){ return '3.15\tMedios de Pago. Los pagos deberán realizarse exclusivamente a favor de Pagasi, a través de los siguientes medios: '+D.medios+'. Pagasi podrá modificar, agregar o suprimir medios de pago, previa notificación al Comprador conforme a la Cláusula 13. No se reputará válido ningún pago realizado a persona distinta de Pagasi —incluyendo al Concesionario— o por medios distintos de los aquí indicados o de los que Pagasi notifique por escrito.'; },
  function(D){ return '3.16\tPago Anticipado. El Comprador podrá, en cualquier momento y sin penalidad alguna, pagar anticipadamente la totalidad o parte del saldo de capital adeudado. En caso de pago anticipado total, el Comprador quedará liberado del pago de los Intereses Financieros no devengados a la fecha efectiva del pago. En caso de abono parcial a capital, las Partes acordarán por escrito si la reducción se aplicará al monto de las Cuotas Quincenales o al número de éstas, y Pagasi emitirá un cronograma de pagos ajustado. El Precio Protect no será objeto de descuento por pago anticipado, por corresponder a bienes ya suministrados y servicios ya puestos a disposición del Comprador.'; },
  function(D){ return '3.17\tRecibos y Estados de Cuenta. Pagasi emitirá al Comprador un comprobante o recibo por cada pago recibido, dentro de los cinco (5) días hábiles siguientes, y pondrá a su disposición, cuando éste lo solicite y en todo caso al menos una vez al mes, un estado de cuenta que refleje los pagos recibidos, su imputación y el saldo pendiente. El Comprador dispondrá de diez (10) días continuos para formular observaciones a cada estado de cuenta; transcurrido dicho lapso sin observaciones, el estado de cuenta se tendrá por conforme, sin perjuicio de la corrección de errores materiales.'; },
  function(D){ return '3.18\tImpuestos. Cada Parte tendrá la carga de pagar los impuestos, tasas o tributos (los “Impuestos”) que le correspondan bajo las transacciones previstas en este Contrato, conforme a la legislación aplicable. Cuando así corresponda según el ordenamiento jurídico vigente, a los montos pagados bajo este Contrato por concepto de Cuotas Quincenales, Precio Protect, Intereses Financieros y/o intereses moratorios deberá aplicarse (a) el Impuesto al Valor Agregado (“IVA”) y (b) el Impuesto a las Grandes Transacciones Financieras (“IGTF”), los cuales deberán ser pagados por el Comprador a Pagasi, en la forma prevista legalmente y adicionalmente a los montos aquí estipulados.'; },
  function(D){ return '3.19\tInstrumentos Cambiarios. Las Partes declaran que NO se han emitido letras de cambio ni pagarés para el pago de las Cuotas Quincenales.'; },

  // ── 4 ──
  function(D){ return '4. VIGENCIA DEL CONTRATO'; },
  function(D){ return '4.1\tPeríodo de Vigencia. El Contrato estará vigente desde la Fecha de Celebración hasta: (a) la fecha de vencimiento de la última Cuota Quincenal conforme al cronograma del Anexo “A”, esto es, '+D.dias+' ('+D.diasLetras+') días continuos contados a partir de la Fecha de Celebración (el “Día de Vencimiento Previsto”); o (b) la fecha posterior al Día de Vencimiento Previsto en la que el Comprador cumpla con cualquier obligación de pago pendiente bajo la Cláusula 3, en caso de que al Día de Vencimiento Previsto se encontrare en mora; o (c) la fecha anterior al Día de Vencimiento Previsto en la que el Comprador haya pagado íntegra y anticipadamente el Monto Total Adeudado (en todos los casos anteriores, el “Período de Vigencia”).'; },
  function(D){ return '4.2\tNo Prorrogable. El Período de Vigencia no será prorrogable en ningún caso, salvo que medie acuerdo expreso y por escrito de las Partes. Cualquier prórroga, refinanciamiento, reestructuración o plan de pagos que Pagasi conceda al Comprador deberá constar por escrito y no implicará novación de las obligaciones aquí asumidas, ni afectará las garantías de la Cláusula 6 ni la Fianza, salvo pacto expreso en contrario.'; },
  function(D){ return '4.3\tEfectos de la Terminación. Terminado el Contrato por cualquier causa distinta al pago íntegro del Monto Total Adeudado, se procederá conforme a la Cláusula 9. Pagado íntegramente el Monto Total Adeudado, se extinguirán de pleno derecho todas las garantías constituidas bajo la Cláusula 6 y la Fianza, y Pagasi procederá conforme a la Cláusula 5.'; },

  // ── 5 ──
  function(D){ return '5. EXTINCIÓN DE LA DEUDA Y LIBERACIÓN DE GARANTÍAS'; },
  function(D){ return '5.1\tFiniquito. Pagado íntegramente el Monto Total Adeudado, incluyendo la totalidad de las Cuotas Quincenales, los Intereses Financieros, los intereses moratorios, los Impuestos y cualesquiera otros montos adeudados bajo este Contrato, Pagasi emitirá y entregará al Comprador, dentro de los diez (10) días hábiles siguientes, una constancia de cancelación total y finiquito.'; },
  function(D){ return '5.2\tLiberación de Garantías. Simultáneamente, Pagasi suscribirá todos los documentos y realizará todas las diligencias que resulten razonablemente necesarias para el levantamiento y cancelación de las garantías constituidas bajo la Cláusula 6, incluyendo la supresión de la nota u observación asentada en el título de propiedad del Vehículo ante el Instituto Nacional de Transporte Terrestre (“INTT”) o la autoridad competente, y la devolución de los documentos originales que tuviere en su poder conforme a la Sección 6.6.'; },
  function(D){ return '5.3\tGastos. Los gastos de la liberación y cancelación de las garantías serán por cuenta del Comprador, conforme a la Sección 10.2.'; },

  // ── 6 ── (6.4 hipoteca mobiliaria omitida; se conserva la numeracion porque 9.1(h) cita 6.5-6.7)
  function(D){ return '6. GARANTÍAS'; },
  function(D){ return '6.1\tSubrogación Convencional. De conformidad con el ordinal 2° del artículo 1.299 del Código Civil, el Comprador declara expresamente que: (a) ha tomado prestada de Pagasi la cantidad indicada en la Sección 1.2 con la finalidad exclusiva de pagar el precio del Vehículo debido al Concesionario; (b) dicho precio ha sido efectivamente pagado con esos fondos; y (c) subroga en este acto a Pagasi, de manera plena, expresa e irrevocable, en todos los derechos, acciones, privilegios, preferencias y garantías que correspondían o pudieran corresponder al Concesionario contra el Comprador por razón de dicho precio, incluyendo cualquier reserva de dominio, privilegio del vendedor o acción resolutoria. El Comprador se obliga a obtener del Concesionario los recaudos previstos en la Sección 1.3, en los cuales deberá constar expresamente el origen de los fondos y la finalidad del pago, a los efectos de la plena eficacia de esta subrogación.'; },
  function(D){ return '6.2\tReserva de Dominio Subrogada. En el supuesto de que la Compraventa hubiere sido celebrada con reserva de dominio a favor del Concesionario, Pagasi quedará subrogada en dicha reserva de dominio en virtud de la Sección 6.1, siéndole aplicables, en lo pertinente, las disposiciones de la Ley sobre Ventas con Reserva de Dominio, incluidos los límites y consecuencias previstos en sus artículos 9, 10, 13 y 14. En tal caso, el Comprador se obliga a que el título de propiedad del Vehículo emitido por el INTT incluya la nota correspondiente a favor de Pagasi, conforme a la Sección 6.5.'; },
  function(D){ return '6.3\tProhibición Convencional de Enajenar y Gravar. Mientras subsista cualquier saldo del Monto Total Adeudado, el Comprador se obliga expresamente a no ceder, vender, permutar, donar, transferir la propiedad ni la posesión, dar en usufructo, arrendamiento, comodato, prenda, hipoteca o cualquier otra garantía, ni trasladar fuera del territorio de la República Bolivariana de Venezuela, el Vehículo, sin el consentimiento previo y por escrito de Pagasi (la “Prohibición de Enajenar y Gravar”). La contravención de esta obligación constituirá un Supuesto de Incumplimiento y facultará a Pagasi para exigir el pago inmediato de la totalidad del saldo del Monto Total Adeudado, sin perjuicio de las acciones que le correspondan y de la eventual responsabilidad penal del Comprador.'; },
  function(D){ return '6.5\tNota en el Título de Propiedad. El Comprador se obliga a tramitar ante el INTT, dentro de los '+D.b(4)+' días continuos siguientes a la Fecha de Celebración, el título de propiedad del Vehículo a su nombre, y a gestionar que en dicho título se asiente la nota, observación o mención expresa correspondiente a la garantía constituida a favor de Pagasi (reserva de dominio subrogada) y a la Prohibición de Enajenar y Gravar. El Comprador entregará a Pagasi copia del título así emitido dentro de los '+D.b(4)+' días hábiles siguientes a su obtención. El Comprador autoriza expresamente a Pagasi a realizar por sí misma dichos trámites, y a solicitar información sobre el Vehículo ante el INTT y demás autoridades competentes.'; },
  function(D){ return '6.6\tDepósito de Documentos. El Comprador entrega a Pagasi, en calidad de depósito y como medida de conservación de sus derechos, el original del certificado de origen y demás documentos de propiedad del Vehículo, los cuales Pagasi conservará hasta el pago íntegro del Monto Total Adeudado y devolverá conforme a la Sección 5.2. Pagasi entregará al Comprador copia simple de dichos documentos, así como constancia escrita del depósito.'; },
  function(D){ return '6.7\tAutenticación y Fecha Cierta. Las Partes se obligan a otorgar el presente Contrato ante Notaría Pública, o a darle fecha cierta mediante su presentación para archivo ante un Juzgado o Notaría, dentro de los '+D.b(4)+' días continuos siguientes a la Fecha de Celebración. La fecha cierta es requisito para la oponibilidad de la subrogación y de las garantías frente a terceros. El incumplimiento de esta obligación por el Comprador constituirá un Supuesto de Incumplimiento.'; },
  function(D){ return '6.8\tGarantías Adicionales. Las garantías previstas en esta Cláusula 6 son concurrentes, independientes y no excluyentes entre sí'+(D.hayFiador?', ni respecto de la Fianza prevista en la Cláusula 14':'')+'. Pagasi podrá ejercerlas conjunta o separadamente, en el orden que estime conveniente.'; },

  // ── 7 ──
  function(D){ return '7. RIESGOS, RESPONSABILIDAD E INDEMNIDAD'; },
  function(D){ return '7.1\tResponsabilidad del Comprador. Las multas, infracciones de tránsito, impuestos, tasas, daños, accidentes, hechos ilícitos y responsabilidades civiles, penales, administrativas o de cualquier otra naturaleza que se originen con posterioridad a la fecha y hora de recepción material del Vehículo serán por cuenta exclusiva del Comprador.'; },
  function(D){ return '7.2\tTraslado del Riesgo. Las Partes convienen expresamente que el riesgo de pérdida, robo, hurto, deterioro, destrucción total o parcial del Vehículo corresponde al Comprador desde el momento de su recepción material. En consecuencia, la pérdida, robo, hurto, destrucción, decomiso, retención, inmovilización o no recuperación del Vehículo, por cualquier causa, NO extinguirá, suspenderá ni reducirá la obligación del Comprador de pagar íntegramente el Monto Total Adeudado, sin perjuicio de la aplicación de las indemnizaciones que, en su caso, sean pagadas por la aseguradora conforme a la Sección 1.9.'; },
  function(D){ return '7.3\tDeber de Denuncia y Notificación. En caso de robo, hurto, accidente, retención, inmovilización o decomiso del Vehículo, el Comprador se obliga a: (a) formular la denuncia correspondiente ante el órgano competente dentro de las veinticuatro (24) horas siguientes; (b) notificar a Pagasi dentro de las veinticuatro (24) horas siguientes al hecho, por cualquiera de los medios de la Cláusula 13; y (c) entregar a Pagasi copia de la denuncia y de todo recaudo relacionado dentro de los cinco (5) días continuos siguientes.'; },
  function(D){ return '7.4\tIndemnidad. El Comprador se obliga a indemnizar y mantener indemne a Pagasi, sus accionistas, administradores, empleados y proveedores, frente a cualquier hecho, reclamación, demanda, sanción, multa, indemnización, costo, gasto o daño de un tercero o de una autoridad, derivado del uso, tenencia, circulación, custodia o destino del Vehículo con posterioridad a su recepción material, o del incumplimiento por el Comprador de sus obligaciones bajo este Contrato.'; },

  // ── 8 ──
  function(D){ return '8. DECLARACIONES Y GARANTÍAS DEL COMPRADOR'+(D.hayFiador?' Y DEL FIADOR':''); },
  function(D){ return 'El Comprador'+(D.hayFiador?' y el Fiador declaran y garantizan':' declara y garantiza')+' a Pagasi, en la Fecha de Celebración y durante todo el Período de Vigencia, que:'; },
  function(D){ return '(a)\tTiene'+(D.hayFiador?'n':'')+' plena capacidad civil y legal para obligarse en los términos del presente Contrato, y no se encuentra'+(D.hayFiador?'n':'')+' sujeto'+(D.hayFiador?'s':'')+' a interdicción, inhabilitación ni limitación alguna.'; },
  function(D){ return '(b)\tToda la información, documentación y recaudos suministrados a Pagasi —incluyendo, sin limitación, identidad, domicilio, actividad económica, ingresos, referencias personales y comerciales, y los documentos de la Compraventa— son veraces, exactos, completos y se encuentran vigentes; y se obliga'+(D.hayFiador?'n':'')+' a informar a Pagasi cualquier cambio sustancial dentro de los cinco (5) días continuos siguientes.'; },
  function(D){ return '(c)\tEl Vehículo fue adquirido del Concesionario mediante operación real y lícita; se encuentra libre de gravámenes, prohibiciones y medidas judiciales o administrativas distintas de las constituidas bajo este Contrato; su documentación de origen es auténtica; y no ha sido objeto de ventas, cesiones ni actos de disposición previos que afecten la adquisición.'; },
  function(D){ return '(d)\tLos fondos empleados para el pago de la Inicial y de las Cuotas Quincenales provienen y provendrán de actividades lícitas, y no tienen su origen, ni serán destinados, a actividades relacionadas con la legitimación de capitales, el financiamiento al terrorismo, el financiamiento de la proliferación de armas de destrucción masiva, el narcotráfico, la corrupción ni cualquier otra actividad ilícita, en los términos de la Ley Orgánica contra la Delincuencia Organizada y Financiamiento al Terrorismo y demás normativa aplicable.'; },
  function(D){ return '(e)\tNO ostenta'+(D.hayFiador?'n':'')+' '+D.pepNo+' / SÍ ostenta'+(D.hayFiador?'n':'')+' '+D.pepSi+' la condición de Persona Expuesta Políticamente (PEP), ni son cónyuge, pariente dentro del segundo grado de afinidad o cuarto de consanguinidad, ni asociado cercano de una PEP. En caso afirmativo, indicar: '+D.pepDetalle+'.'; },
  function(D){ return '(f)\tAutoriza'+(D.hayFiador?'n':'')+' expresamente a Pagasi a verificar, consultar y validar la información suministrada ante fuentes públicas y privadas, incluyendo listas restrictivas nacionales e internacionales, registros públicos, el INTT, centrales de riesgo y referencias personales y comerciales, así como a realizar los procesos de debida diligencia y conocimiento del cliente que resulten aplicables.'; },
  function(D){ return '(g)\tEl Vehículo no será destinado, directa ni indirectamente, a la comisión de delitos, al transporte de sustancias o bienes de comercio prohibido, ni a actividad ilícita alguna.'; },
  function(D){ return '(h)\tHa'+(D.hayFiador?'n':'')+' contado con la oportunidad de leer íntegramente este Contrato y sus Anexos, formular preguntas y recibir asesoría legal independiente de su elección; y celebra'+(D.hayFiador?'n':'')+' el Contrato con pleno conocimiento y consentimiento libre de vicios.'; },
  function(D){ return '(i)\tNo existe en su contra procedimiento judicial, administrativo o de ejecución que pueda afectar sustancialmente el cumplimiento de las obligaciones aquí asumidas, salvo: '+D.b(24)+'.'; },
  function(D){ return 'La falsedad, inexactitud u omisión sustancial en cualquiera de las declaraciones anteriores constituirá un Supuesto de Incumplimiento conforme a la Sección 9.1.'; },

  // ── 9 ──
  function(D){ return '9. INCUMPLIMIENTOS Y REMEDIOS'; },
  function(D){ return '9.1\tSupuestos de Incumplimiento. Constituirán supuestos de incumplimiento del Comprador bajo este Contrato (cada uno, un “Supuesto de Incumplimiento”), sin que la enunciación sea limitativa: (a) la falta de pago total o parcial de una o más Cuotas Quincenales, una vez transcurrido el período de gracia previsto en la Sección 3.10; (b) la contravención de la Prohibición de Enajenar y Gravar prevista en la Sección 6.3; (c) la remoción, desconexión, alteración, manipulación, inhibición o daño de los Dispositivos, o la negativa injustificada a permitir su instalación, revisión o sustitución; (d) la falta de contratación, mantenimiento o renovación de la Póliza de Seguro; (e) el traslado del Vehículo fuera del territorio nacional, o su traslado a una dirección distinta de la indicada en la Sección 1.7 sin la notificación allí prevista; (f) el uso del Vehículo para actividades ilícitas, o para un destino distinto del declarado en la Sección 1.10 sin la notificación previa allí prevista; (g) la falsedad, inexactitud u omisión sustancial en las declaraciones de la Cláusula 8; (h) el incumplimiento de las obligaciones de entrega de recaudos, autenticación, registro, nota en el título de propiedad y depósito de documentos previstas en las Secciones 1.3, 6.5, 6.6 y 6.7; (i) la constitución de gravámenes, o el decreto de medidas preventivas o ejecutivas de embargo, secuestro o prohibición sobre el Vehículo por causa imputable al Comprador; (j) la insolvencia manifiesta, cesación de pagos, o el decreto de medidas de ejecución sobre bienes del Comprador'+(D.hayFiador?' o del Fiador':'')+' que comprometan sustancialmente el cumplimiento; y (k) el incumplimiento de cualquier otra obligación sustancial asumida bajo este Contrato, no subsanado dentro de los diez (10) días continuos siguientes al requerimiento escrito de Pagasi.'; },
  function(D){ return '9.2\tPérdida del Beneficio del Término. Verificado un Supuesto de Incumplimiento, y previa notificación escrita al Comprador conforme a la Cláusula 13, Pagasi podrá tener por decaído el beneficio del término y declarar de plazo vencido la totalidad del saldo insoluto del Monto Total Adeudado, el cual se hará líquido y exigible de inmediato, de conformidad con el artículo 1.215 del Código Civil.'; },
  function(D){ return '9.3\tRemedios de Pagasi. Ante la verificación de un Supuesto de Incumplimiento, Pagasi podrá, a su sola elección y de forma alternativa o acumulativa según proceda en derecho: (a) exigir y demandar el pago inmediato de las sumas vencidas, de la totalidad del saldo insoluto del Monto Total Adeudado, de los Intereses Financieros y moratorios causados, y de los daños y perjuicios; (b) ejecutar las garantías constituidas bajo la Cláusula 6, incluidas, según corresponda, las acciones derivadas de la reserva de dominio subrogada; (c) solicitar y hacer ejecutar medidas cautelares, asegurativas o anticipadas, incluyendo el embargo o secuestro del Vehículo, ante cualquier tribunal competente de la República Bolivariana de Venezuela en el que estuviere ubicado el Vehículo; '+(D.hayFiador?'(d) exigir al Fiador el cumplimiento íntegro de las obligaciones garantizadas conforme a la Cláusula 14; y/o (e)':'y/o (d)')+' dar por terminado anticipadamente el Contrato mediante comunicación escrita dada al Comprador, sin perjuicio de las acciones legales que correspondan.'; },
  function(D){ return '9.4\tLímite Legal cuando resulte aplicable la Reserva de Dominio Subrogada. En el supuesto de que Pagasi hubiere quedado subrogada en una reserva de dominio conforme a la Sección 6.2, y de conformidad con el artículo 13 de la Ley sobre Ventas con Reserva de Dominio —norma que se aplica no obstante convenio en contrario—, cuando la falta de pago se refiera a Cuotas Quincenales que no excedan en su conjunto de la octava parte (1/8) del precio total del Vehículo, ello no dará lugar a la resolución de la Compraventa ni a la restitución del Vehículo, sino únicamente al cobro de las cuotas insolutas y de los intereses moratorios, conservando el Comprador el beneficio del término respecto de las cuotas sucesivas. Igualmente, si se produjere la resolución y restitución del Vehículo, la liquidación entre las Partes se practicará conforme al artículo 14 de dicha Ley, deduciéndose una justa compensación por el uso del Vehículo, que las Partes estiman convencionalmente en el '+D.b(3)+' por ciento del Precio del Vehículo por cada mes o fracción de mes transcurrido, así como los intereses moratorios, los gastos razonables y documentados de recuperación, traslado, depósito, peritaje, reacondicionamiento y venta, el Precio Protect correspondiente a bienes suministrados y servicios prestados, y los daños y perjuicios acreditados; todo ello sujeto a la facultad de moderación judicial prevista en el citado artículo 14.'; },
  function(D){ return '9.5\tRestitución o Dación Voluntaria. El Comprador podrá, en cualquier momento, ofrecer a Pagasi la entrega voluntaria del Vehículo en pago o en garantía del saldo adeudado. Si Pagasi la aceptare por escrito, se practicará la liquidación correspondiente, dejándose constancia en acta suscrita por ambas Partes del estado del Vehículo, del saldo adeudado, del valor atribuido al Vehículo y del saldo resultante a favor o en contra del Comprador.'; },
  function(D){ return '9.6\tProhibición de Vías de Hecho. Pagasi se obliga a no recurrir a vías de hecho, intimidación, hostigamiento ni a ninguna forma de autotutela para la cobranza o la recuperación del Vehículo, y a ejercer sus derechos exclusivamente por las vías extrajudiciales lícitas y judiciales previstas en este Contrato y en la ley.'; },

  // ── 10 ──
  function(D){ return '10. ACTOS DE REGISTRO Y GASTOS'; },
  function(D){ return '10.1\tTrámites. El Comprador realizará, en los plazos previstos en la Cláusula 6, todos los trámites de autenticación, registro e inscripción necesarios para la constitución, publicidad y oponibilidad de las garantías otorgadas a favor de Pagasi, así como los relativos al título de propiedad del Vehículo ante el INTT.'; },
  function(D){ return '10.2\tGastos. El Comprador asumirá los gastos notariales, registrales, de autenticación, reconocimiento de firmas, copias certificadas, timbres y demás gastos derivados de la formalización, inscripción y posterior liberación de este Contrato y de las garantías, así como los del trámite del título de propiedad ante el INTT o cualquier otra autoridad competente.'; },

  // ── 11 ──
  function(D){ return '11. TRATAMIENTO DE DATOS Y DE LA INFORMACIÓN DE GEOLOCALIZACIÓN'; },
  function(D){ return '11.1\tAutorización. El Comprador autoriza de manera expresa, libre, informada, específica e inequívoca a Pagasi y a los proveedores que ésta designe, a recolectar, consultar, almacenar, conservar, procesar y utilizar (a) los datos personales e información suministrados con ocasión de la solicitud y ejecución de este Contrato, y (b) la información generada por los Dispositivos, incluyendo datos de ubicación, rutas, fechas, horas, eventos de encendido o apagado, alertas de movimiento, desconexión, manipulación, batería y otros datos técnicos asociados al Vehículo.'; },
  function(D){ return '11.2\tFinalidades. Dicho tratamiento se realizará únicamente para las siguientes finalidades: la ejecución y administración ordinaria del Contrato; la protección de los derechos de Pagasi y la seguridad del Vehículo; la verificación de su ubicación en caso de mora, incumplimiento, accidente, hurto, robo, retención, pérdida, abandono, uso no autorizado o riesgo para su conservación; la facilitación de su recuperación; la prestación de los servicios del Programa; la gestión de cobranza; la atención de requerimientos de autoridad competente; y el cumplimiento de obligaciones legales, incluidas las de prevención de legitimación de capitales.'; },
  function(D){ return '11.3\tProhibición de Captación de Audio y Video. Salvo autorización expresa, escrita y separada del Comprador, los Dispositivos no serán utilizados para grabar, captar, almacenar o transmitir audio, video, imágenes ni comunicaciones privadas del Comprador o de terceros.'; },
  function(D){ return '11.4\tConfidencialidad y Seguridad. Pagasi tratará dicha información con carácter confidencial y adoptará medidas técnicas y organizativas razonables para protegerla contra el acceso, uso, divulgación, alteración o pérdida no autorizados. Pagasi podrá compartir la información únicamente con sus asesores, aseguradoras, proveedores de rastreo, talleres autorizados, cesionarios de los créditos, autoridades administrativas, policiales o judiciales, tribunales competentes, o terceros que intervengan razonablemente en la protección, recuperación, defensa, ejecución o cumplimiento de este Contrato, quienes quedarán sujetos a obligaciones de confidencialidad equivalentes.'; },
  function(D){ return '11.5\tConservación. La información se conservará durante el Período de Vigencia y por el tiempo adicional razonable y prudente que resulte necesario para atender reclamos, investigaciones, obligaciones legales, procedimientos judiciales o administrativos, cobranza, recuperación del Vehículo o defensa de los derechos de las Partes; y en todo caso por el plazo mínimo exigido por la normativa aplicable en materia de prevención de legitimación de capitales.'; },
  function(D){ return '11.6\tDerechos del Comprador. De conformidad con el artículo 28 de la Constitución de la República Bolivariana de Venezuela, el Comprador podrá solicitar a Pagasi, en cualquier momento y mediante comunicación escrita dirigida a las direcciones de la Cláusula 13, el acceso a la información que sobre él conste en los registros de Pagasi, así como su actualización, rectificación o supresión cuando resultare inexacta o cuando hubiere cesado la finalidad que justificó su tratamiento. Pagasi atenderá la solicitud dentro de los diez (10) días hábiles siguientes.'; },
  function(D){ return '11.7\tCesación del Tratamiento. Culminado el Período de Vigencia y transcurridos los plazos de conservación aplicables, Pagasi cesará el monitoreo activo de la geolocalización del Vehículo y procederá conforme a la Sección 2.5 respecto de los Dispositivos.'; },

  // ── 12 ──
  function(D){ return '12. CONFIDENCIALIDAD'; },
  function(D){ return '12.1\tDeber de Confidencialidad. Las Partes se obligan a mantener estricta confidencialidad sobre la existencia, términos, condiciones y disposiciones de este Contrato, y no podrán revelarlos públicamente ni comunicarlos a terceros sin el consentimiento previo y por escrito de la(s) otra(s) Parte(s), salvo cuando la divulgación sea requerida por ley, reglamento, autoridad competente, tribunal, asesor legal, contable o financiero, aseguradora, entidad bancaria, cesionario o potencial cesionario de los créditos, o proveedor necesario para la ejecución del Contrato, o cuando sea razonablemente necesaria para ejercer derechos, cumplir obligaciones o defender intereses derivados de este Contrato. La Parte que realice una divulgación permitida deberá procurar que el receptor mantenga la información con carácter confidencial, en la medida en que ello sea razonablemente posible.'; },

  // ── 13 ──
  function(D){ return '13. NOTIFICACIONES'; },
  function(D){ return '13.1\tForma de las Notificaciones. Las notificaciones y comunicaciones entre las Partes se tendrán como válidas y perfeccionadas cuando se realicen por escrito y sean remitidas: (a) a las direcciones de correo electrónico (“E-Mail”) indicadas en la Sección 13.3, entendiéndose perfeccionadas al día hábil siguiente (a partir de las 00:00, hora de Venezuela, de ese día); o (b) a las direcciones físicas indicadas en la Sección 13.3, entendiéndose recibidas al día hábil siguiente de la fecha de recepción.'; },
  function(D){ return '13.2\tComunicaciones Operativas. Las Partes convienen que las comunicaciones de carácter operativo —tales como recordatorios de vencimiento, confirmaciones de pago, estados de cuenta, coordinación de servicios del Programa y gestiones de cobranza extrajudicial— podrán ser válidamente remitidas mediante mensajería instantánea (WhatsApp) o mensajes de texto (SMS) a los números indicados en la Sección 13.3, teniendo pleno valor probatorio conforme al Decreto con Fuerza de Ley sobre Mensajes de Datos y Firmas Electrónicas. Las notificaciones relativas a incumplimientos, pérdida del beneficio del término, terminación anticipada, cesión y ejecución de garantías deberán realizarse conforme a la Sección 13.1.'; },
  function(D){ return '13.3\tDirecciones. Las Partes escogen como destino válido para practicar las notificaciones, comunicaciones, citaciones y/o entregas bajo este Contrato, las siguientes:'; },
  function(D){ return '(a)\tAl Comprador: (i) E-Mail: '+D.cliEmail+'; (ii) Dirección: '+D.cliDir+'; (iii) Teléfono / WhatsApp: '+D.cliTel+'.'; },
  function(D){ return D.hayFiador ? '(b)\tAl Fiador: (i) E-Mail: '+D.fiaEmail+'; (ii) Dirección: '+D.fiaDir+'; (iii) Teléfono / WhatsApp: '+D.fiaTel+'.' : ''; },
  // El correo, el domicilio y el telefono de Pagasi salen de Configuracion -> Empresa:
  // estaban escritos a mano y el contrato de la compania nueva mandaba al cliente a
  // llamar a la vieja (revisado el 22-sep-2026).
  function(D){ var _e=_empCtr(); return '('+(D.hayFiador?'c':'b')+')\tA Pagasi: (i) E-Mail: <strong>'+(_e.email||D.b(22))+'</strong>; (ii) Dirección: <strong>'+(_e.dir||D.b(40))+'</strong>; (iii) Teléfono / WhatsApp: <strong>'+(_e.tel||D.b(14))+'</strong>.'; },
  function(D){ return 'Cualquier modificación de estas direcciones físicas, de E-Mail y de datos de contacto telefónicos será comunicada entre las Partes de inmediato y por escrito. Mientras no medie dicha comunicación, las notificaciones practicadas en las direcciones aquí indicadas se reputarán válidas.'; },

  // ── 14 ── (solo si hay fiador)
  function(D){ return D.hayFiador ? '14. FIANZA' : ''; },
  function(D){ return D.hayFiador ? '14.1\tConstitución de la Fianza. El Fiador se constituye en este acto en fiador solidario y principal pagador del Comprador frente a Pagasi, por todas y cada una de las obligaciones asumidas por el Comprador bajo el presente Contrato, incluyendo sin limitación el pago íntegro del Monto Total Adeudado, las Cuotas Quincenales, el Precio Protect, los Intereses Financieros, los intereses moratorios, los Impuestos y cualesquiera otros montos, gastos, costos y costas derivados del mismo.' : ''; },
  function(D){ return D.hayFiador ? '14.2\tRenuncia a Beneficios. El Fiador renuncia expresamente a los beneficios de excusión y de división previstos en los artículos 1.812 y siguientes del Código Civil, así como a cualquier otro beneficio que pudiera corresponderle, de manera que Pagasi podrá exigirle el cumplimiento íntegro de las obligaciones garantizadas sin necesidad de requerir previamente al Comprador ni de ejecutar las garantías de la Cláusula 6.' : ''; },
  function(D){ return D.hayFiador ? '14.3\tVigencia de la Fianza. La fianza permanecerá vigente hasta la extinción total de las obligaciones garantizadas, y no se verá afectada ni extinguida por las prórrogas, modificaciones, refinanciamientos, planes o facilidades de pago que Pagasi pudiera conceder al Comprador, las cuales el Fiador acepta y autoriza desde ahora.' : ''; },
  function(D){ return D.hayFiador ? '14.4\tDeclaraciones del Fiador. El Fiador declara conocer íntegramente el contenido de este Contrato y de sus Anexos; que su patrimonio es suficiente para responder por las obligaciones garantizadas; y que le son aplicables, en lo pertinente, las declaraciones y garantías de la Cláusula 8 y las autorizaciones de tratamiento de datos de la Cláusula 11.' : ''; },
  function(D){ return D.hayFiador ? '14.5\tNotificaciones al Fiador. Las notificaciones al Fiador se practicarán en las direcciones indicadas en la Sección 13.3(b).' : ''; },

  // ── 15 ──
  function(D){ return '15. DISPOSICIONES GENERALES Y MISCELÁNEAS'; },
  function(D){ return '15.1\tLey Aplicable. El presente Contrato se regirá e interpretará de conformidad con las leyes de la República Bolivariana de Venezuela.'; },
  function(D){ return '15.2\tJurisdicción y Domicilio Especial. Para todos los efectos derivados de la interpretación, ejecución, cumplimiento, terminación o liquidación del presente Contrato, las Partes eligen como domicilio especial, único y excluyente la ciudad de Caracas, República Bolivariana de Venezuela, a la jurisdicción de cuyos tribunales declaran someterse, con renuncia expresa a cualquier otro fuero o domicilio que pudiera corresponderles; salvo respecto de las acciones reales, ejecutivas y de solicitud y práctica de medidas cautelares sobre el Vehículo previstas en la Sección 9.3, las cuales podrán intentarse ante los tribunales competentes del lugar donde se encuentre el Vehículo.'; },
  function(D){ return '15.3\tCesión. Pagasi podrá ceder, transferir, descontar, dar en garantía o titularizar, total o parcialmente, los derechos de crédito derivados de este Contrato, así como ceder su posición contractual, sin necesidad del consentimiento del Comprador'+(D.hayFiador?' ni del Fiador':'')+', bastando la notificación prevista en el artículo 1.550 del Código Civil, la cual podrá practicarse conforme a la Cláusula 13. El Comprador'+(D.hayFiador?' y el Fiador declaran':' declara')+' aceptar desde ahora dicha cesión y darse por notificado'+(D.hayFiador?'s':'')+' a todos los efectos legales, quedando entendido que las garantías de la Cláusula 6'+(D.hayFiador?' y la Fianza':'')+' se transmitirán conjuntamente con el crédito cedido. El Comprador no podrá ceder su posición contractual ni sus derechos y obligaciones bajo este Contrato sin el consentimiento previo y por escrito de Pagasi.'; },
  function(D){ return '15.4\tRecursos Propios. Pagasi declara que el Financiamiento se otorga exclusivamente con recursos propios, y que no realiza actividad de intermediación financiera ni capta recursos del público en los términos del Decreto con Rango, Valor y Fuerza de Ley de Instituciones del Sector Bancario.'; },
  function(D){ return '15.5\tFuerza Mayor. Ninguna de las Partes será responsable por el incumplimiento de sus obligaciones cuando éste obedezca a caso fortuito o fuerza mayor debidamente acreditado, mientras dure el impedimento. Esta disposición no aplicará a las obligaciones de pago de sumas de dinero del Comprador, las cuales subsistirán en todo caso.'; },
  function(D){ return '15.6\tAcuerdo Definitivo y Vinculante. El presente Contrato tiene la naturaleza de contrato definitivo y vinculante entre las Partes, conforme a los términos y condiciones establecidos en el Código Civil. Contiene la totalidad de los acuerdos, derechos de crédito, obligaciones, términos y condiciones que regirán las circunstancias y hechos objeto del mismo, y sustituye cualquier acuerdo, oferta, cotización o entendimiento previo, verbal o escrito. Sus efectos serán inmediatos y vinculantes entre las Partes desde la Fecha de Celebración, sin perjuicio del cumplimiento de los requisitos de fecha cierta, registro e inscripción necesarios para la oponibilidad de las garantías frente a terceros.'; },
  function(D){ return '15.7\tModificaciones y No Renuncia. Ninguna disposición de este Contrato podrá ser modificada, renunciada o rescindida tácitamente, sino mediante instrumento escrito firmado por la Parte contra la cual se solicita la ejecución de dicha modificación, renuncia o terminación. Ningún incumplimiento o demora de cualquiera de las Partes en el ejercicio de cualquier derecho operará como renuncia al mismo.'; },
  function(D){ return '15.8\tSeparabilidad. En caso de que cualquier parte o sección del presente Contrato fuera declarada nula, inválida o inoperante, el mismo deberá interpretarse omitiendo única y exclusivamente las disposiciones así declaradas, procurando preservar la validez y eficacia del resto del Contrato, conforme a la intención de las Partes y a la buena fe.'; },
  function(D){ return '15.9\tTítulos y Encabezados. Los encabezados y títulos de las cláusulas se establecen únicamente para facilitar la lectura e interpretación del Contrato, y no constituyen parte integrante del mismo.'; },
  function(D){ return '15.10\tAnexos. Forman parte integrante de este Contrato los siguientes Anexos: Anexo “A” — Cronograma de Pagos; Anexo “B” — Condiciones del Programa “Pagasi Protect”; Anexo “C” — Constancia de Recepción del Vehículo; Anexo “D” — Recaudos y Declaración de Conocimiento del Cliente.'; },
  function(D){ return '15.11\tEjemplares. Este Contrato se extiende y suscribe en '+(D.hayFiador?'tres (3)':'dos (2)')+' ejemplares que se reputarán como originales: uno que queda en poder del Comprador, '+(D.hayFiador?'uno en poder del Fiador y ':'')+'uno en poder de Pagasi.'; },
  function(D){ return '15.12\tTérminos Definidos. Los términos escritos con mayúscula inicial que no estén expresamente definidos en el cuerpo de este Contrato tendrán el significado que se les atribuye en el lugar de su primera aparición. Adicionalmente: “Bolívar(es)” significa la moneda de curso legal en Venezuela; “Dólar(es)” significa Dólares de los Estados Unidos de América; “Día Hábil” significa un día distinto de sábado, domingo o feriado nacional, en el que los bancos comerciales están abiertos y prestan servicios en Venezuela; “Venezuela” significa la República Bolivariana de Venezuela.'; }
];

var _PROTECT_CIERRE = 'Las Partes firman el presente Contrato en señal de conformidad y aceptación, en la Fecha de Celebración.-';

// ── Estilos: mas apretados que los del contrato dra ─────────────────────
// El contrato es largo (15 clausulas + 4 anexos). A la letra del dra salian 18
// hojas; a dos columnas y con la letra un punto mas chica salen ~10, que es lo
// que se puede imprimir por cada moto. Es letra de contrato: densa y legible.
function _protectEstilos(){
  var az='#2563EB', azD='#1D4ED8';
  return {
    az:az, azD:azD,
    doc:"font-family:'Nunito Sans','Segoe UI',Arial,sans-serif;color:#1f2937;max-width:820px;margin:0 auto;padding:14px 22px;background:#fff",
    h1:'background:'+az+';color:#fff;text-align:center;padding:8px 12px;border-radius:4px;margin:0 0 8px;border-bottom:3px solid '+azD+';font-size:12px;font-weight:900;letter-spacing:.3px;line-height:1.3;column-span:all;break-after:avoid',
    cl:'color:'+az+';font-weight:900;font-size:9.2px;text-transform:uppercase;letter-spacing:.2px;margin:7px 0 3px;padding-bottom:2px;border-bottom:1.5px solid '+az+';break-after:avoid',
    p:'font-size:8.1px;line-height:1.36;color:#222;margin:0 0 3px;text-align:justify',
    sub:'font-size:8.1px;line-height:1.36;color:#222;margin:0 0 3px 8px;text-align:justify',
    def:'font-size:7.6px;line-height:1.3;color:#333;margin:0 0 2px 14px;text-align:justify',
    // Texto corrido a lo ancho (Adam, 15-sep-2026: "se descargan divididos y no
    // corridos"). Antes iba a dos columnas tipo periodico para ahorrar hojas, pero
    // el ahorro de verdad vino de la letra chica: corrido son 9 hojas en vez de 8.
    // La letra se queda en 8,1 px, como la eligio el.
    cols:'',
    // Los anexos fluyen uno tras otro (B y C caben juntos en una hoja). Lo
    // unico que no se parte son los bloques de firma, que ya lo traen puesto.
    anexo:'margin-top:12px'
  };
}

// ── Bloque de firmas (2 o 3 segun haya fiador) ──────────────────────────
function _protectFirmas(D, incluirPagasi){
  var f = [];
  f.push(['Por el Comprador', D.cliNom, 'C.I. '+(_draCedulaTxt(D.cli.cedula||D.cli.ci) || 'V-________')]);
  if(D.hayFiador) f.push(['Por el Fiador', D.fiaNom, 'C.I. '+(_draCedulaTxt(D.cli.fiador_ci) || 'V-________')]);
  if(incluirPagasi!==false) f.push(['Por Pagasi', '<strong>'+_empCtr().nom+'</strong>', 'RIF '+_empCtr().rif]);
  var n = f.length;
  // break-before:avoid = la firma se va con el parrafo que la precede, nunca sola arriba de una hoja
  return '<div style="display:flex;gap:24px;margin-top:12px;align-items:flex-start;page-break-inside:avoid;break-before:avoid;page-break-before:avoid">'
       + f.map(function(x){ return _draFirma(x[0], x[1], x[2], n); }).join('') + '</div>';
}

// ── Anexo A: cronograma con capital, interes y saldo ────────────────────
function _protectCronograma(D, S_){
  var F = D.F, num = D.num;
  var M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var celda = 'display:flex;flex-direction:column;gap:1px;padding:4px 6px;background:#fff;border:1px solid #BFDBFE;border-radius:4px;break-inside:avoid';
  var badge = 'display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;background:'+S_.az+';color:#fff;font-size:8.5px;font-weight:800;border-radius:50%;flex-shrink:0';
  var h = '<div style="margin:6px 0 4px">'
    + '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:5px;padding:6px 10px;font-size:8.8px;line-height:1.55;margin-bottom:6px">'
    + '<strong>Resumen:</strong> Precio del Vehículo: <strong>US$ '+num(F.precio)+'</strong> · Precio Protect: <strong>US$ '+num(F.protect)+'</strong> · Inicial: <strong>US$ '+num(F.inicial)+'</strong> · '
    + 'Monto Financiado: <strong>US$ '+num(F.MF)+'</strong> · Tasa de Intereses Financieros: <strong>12% anual</strong> · Total Intereses Financieros: <strong>US$ '+num(F.intereses)+'</strong> · '
    + 'Tasa de Intereses Moratorios: <strong>3% anual</strong> (adicional a los Intereses Financieros) · N° de Cuotas: <strong>'+F.n+'</strong> · '
    + 'Cuota Quincenal: <strong>US$ '+num(F.cuota)+'</strong> · Monto Total Adeudado: <strong>US$ '+num(F.MTA)+'</strong>.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">';
  F.filas.forEach(function(r){
    h += '<div style="'+celda+'">'
       + '<div style="display:flex;align-items:center;gap:5px"><span style="'+badge+'">'+r.n+'</span>'
       + '<span style="font-size:8.8px;color:#444;font-weight:600;flex:1;line-height:1.1">'+r.fecha.getDate()+' '+M[r.fecha.getMonth()]+' '+String(r.fecha.getFullYear()).slice(-2)+'</span>'
       + '<span style="font-size:9.2px;font-weight:800;color:'+S_.azD+';white-space:nowrap">$'+num(r.cuota)+'</span></div>'
       + '<div style="font-size:7.3px;color:#6b7280;line-height:1.2;padding-left:22px">cap '+num(r.capital)+' · int '+num(r.interes)+' · saldo '+num(r.saldo)+'</div>'
       + '</div>';
  });
  h += '</div>'
     + '<div style="display:flex;justify-content:space-between;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:4px 10px;margin-top:5px;font-size:8.8px;font-weight:800">'
     + '<span>TOTALES</span><span>Capital '+num(F.MF)+' · Intereses '+num(F.intereses)+' · <span style="color:'+S_.azD+'">Total '+num(F.MTA)+'</span></span></div>'
     + '<p style="'+S_.p+';font-size:8.4px;color:#555;margin-top:4px">La porción del Precio Protect financiada se encuentra incluida dentro de “cap” (capital).</p>'
     + '</div>';
  return h;
}

// ── Anexo B: condiciones de Protect ─────────────────────────────────────
function _protectAnexoB(D, S_){
  var sub = function(t){ return '<div style="font-weight:800;color:'+S_.azD+';font-size:9.4px;margin:6px 0 2px">'+t+'</div>'; };
  var p = function(t){ return '<p style="'+S_.p+'">'+t+'</p>'; };
  return '<div style="'+S_.h1+'">ANEXO “B” — CONDICIONES DEL PROGRAMA «PAGASI PROTECT»</div>'
    + p('El presente Anexo forma parte integrante del Contrato y regula las condiciones operativas del Programa contratado conforme a la Cláusula 2.')
    + sub('B.1 Vigencia y Precio')
    + p('Período Protect: doce (12) meses continuos contados desde la Fecha de Celebración, esto es, desde el '+D.protectDesde+' hasta el '+D.protectHasta+'. Precio Protect: '+D.protect+', incluido en el Monto Financiado.')
    + sub('B.2 Servicios Incluidos')
    + p('(a) Cambio de aceite y filtro: un (1) servicio. Debe solicitarse con tres (3) días hábiles de anticipación, a través del canal indicado en B.4, y se realizará en el taller autorizado que Pagasi indique al Comprador al momento de la solicitud.')
    + p('(b) Lavado: un (1) servicio, en el establecimiento autorizado que Pagasi indique al Comprador al momento de la solicitud.')
    + p('(c) Dispositivo GPS antirrobo: marca/modelo '+D.gpsModelo+', serial '+D.gpsSerial+', IMEI '+D.gpsImei+'. Instalación realizada el '+D.gpsFecha+' por '+D.gpsTecnico+'. Si la instalación no se hubiere efectuado en la Fecha de Celebración, se realizará en centro autorizado por Pagasi dentro de los treinta (30) días continuos siguientes, conforme a la Sección 2.1(d).')
    + p('(d) Dispositivo de corte o apagado remoto: integrado en el mismo equipo del literal (c).')
    + p('(e) Monitoreo y rastreo satelital: disponible las veinticuatro (24) horas mediante la plataforma de rastreo de Pagasi y el canal de atención indicado en B.4.')
    + p('(f) Activación del apagado remoto en caso de robo o hurto, conforme al protocolo de la Sección 2.7 del Contrato.')
    + sub('B.3 Condiciones y Exclusiones')
    + p('Los servicios de cambio de aceite y lavado no son acumulables, transferibles ni canjeables por dinero, y caducan al vencimiento del Período Protect. El Programa no incluye repuestos, piezas, insumos distintos de los indicados, reparaciones, grúa, asistencia vial, ni cobertura o indemnización alguna. El Programa NO es un contrato de seguro y no indemniza la pérdida, robo, hurto o daño del Vehículo, conforme a la Sección 2.3 del Contrato.')
    + sub('B.4 Canales de Atención')
    + p('Solicitud de servicios y reporte de robo o hurto: (i) Teléfono / WhatsApp: <strong>'+(_empCtr().tel||b(14))+'</strong>; (ii) E-Mail: <strong>'+(_empCtr().email||b(22))+'</strong>; (iii) Horario de atención: <strong>lunes a viernes, de 9:00 a.m. a 5:00 p.m.</strong> Tiempo objetivo de respuesta ante reporte de robo o hurto: <strong>entre una (1) y cinco (5) horas</strong>.')
    + sub('B.5 Declaración del Comprador')
    + p('El Comprador declara haber recibido, leído y comprendido las condiciones del Programa; haber sido informado de que su contratación es voluntaria y de que el Programa no constituye un contrato de seguro; y haber recibido los Dispositivos instalados y en funcionamiento a su entera satisfacción, o, en su defecto, conocer la fecha y lugar de su instalación.')
    + '<div style="display:flex;gap:24px;align-items:flex-start;margin-top:14px;page-break-inside:avoid">'
    +   _draFirma('Por el Comprador', D.cliNom, 'C.I. '+(_draCedulaTxt(D.cli.cedula||D.cli.ci) || 'V-________'), 2)
    +   _draFirma('Por Pagasi', '<strong>'+_empCtr().nom+'</strong>', 'RIF '+_empCtr().rif, 2)
    + '</div>';
}

// ── Anexo C: constancia de recepcion ────────────────────────────────────
function _protectAnexoC(D, S_){
  // Una moto nueva sale del concesionario siempre igual: 0 km, 10 litros y UNA llave
  // (la otra se la queda Pagasi como garantia). Se imprime asi y lo que no aplique se
  // tacha a mano. Los cascos ya no van: no se entregan (Adam, 22-sep-2026).
  var S = function(t){ return '<strong>'+t+'</strong>'; };
  var filas = [
    ['Concesionario que entrega', D.concNom], ['Factura de la Compraventa N° / fecha', D.facturaNum+' / '+D.facturaFecha],
    ['Kilometraje al momento de la recepción', S('0 km (vehículo nuevo)')], ['Estado de carrocería y pintura', S('Nuevo, sin detalles')],
    ['Estado mecánico y de funcionamiento', S('Nuevo, en funcionamiento')], ['Estado eléctrico y de luces', S('Nuevo, operativo')],
    ['Estado de neumáticos', S('Nuevos')], ['Nivel de combustible', S('10 litros')],
    ['Llaves recibidas (cantidad)', S('1')],
    ['Manuales y documentos recibidos', S('Manual del propietario y documentos del Vehículo')], ['Accesorios recibidos', S('Los de fábrica')],
    ['Dispositivo GPS instalado (serial)', D.gpsSerial], ['Dispositivo de apagado remoto instalado (serial)', D.gpsSerial+' (mismo equipo)'],
    ['Certificado de origen (N° / entregado a Pagasi en depósito)', D.certOrigenNum+' · '+S('original entregado a Pagasi en depósito')], ['Póliza de Seguro (compañía y N°)', D.poliza],
    ['Observaciones', S('Sin observaciones')]
  ];
  var lbl = 'background:#EFF6FF;color:'+S_.azD+';font-weight:700;font-size:8.8px;padding:3px 8px;width:44%;border-bottom:1px solid #DBEAFE';
  var val = 'padding:3px 8px;font-size:8.8px;border-bottom:1px solid #DBEAFE';
  return '<div style="'+S_.h1+'">ANEXO “C” — CONSTANCIA DE RECEPCIÓN DEL VEHÍCULO</div>'
    + '<p style="'+S_.p+'">En <strong>Caracas</strong>, a los '+D.diaNum+' días del mes de '+D.mesNom+' de '+D.anioNum+', siendo las '+D.hora+', el Comprador deja constancia de que ha recibido del Concesionario el Vehículo identificado en los Considerandos del Contrato, previa inspección directa y personal, a su entera y cabal satisfacción, en las condiciones que a continuación se detallan.</p>'
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #BFDBFE;margin:8px 0">'
    + filas.map(function(r){ return '<tr><td style="'+lbl+'">'+r[0]+'</td><td style="'+val+'">'+r[1]+'</td></tr>'; }).join('')
    + '</table>'
    + '<p style="'+S_.p+'">El Comprador declara que Pagasi no es vendedora del Vehículo y que no asume responsabilidad alguna por su estado, entrega, documentación o garantía, conforme a la Sección 1.5 del Contrato.</p>'
    + '<div style="display:flex;gap:24px;align-items:flex-start;margin-top:14px;page-break-inside:avoid">'
    +   _draFirma('Por el Comprador', D.cliNom, 'C.I. '+(_draCedulaTxt(D.cli.cedula||D.cli.ci) || 'V-________'), 2)
    +   _draFirma('Recibido por Pagasi (a los solos efectos de constancia)', '<strong>'+_empCtr().nom+'</strong>', 'RIF '+_empCtr().rif, 2)
    + '</div>';
}

// ── Anexo D: recaudos y KYC ─────────────────────────────────────────────
function _protectAnexoD(D, S_){
  var sub = function(t){ return '<div style="font-weight:800;color:'+S_.azD+';font-size:9.4px;margin:6px 0 2px">'+t+'</div>'; };
  var p = function(t){ return '<p style="'+S_.p+'">'+t+'</p>'; };
  // La misma lista que el formulario de "Documentos del contrato"
  var recaudos = _docsRecaudosLista(D.hayFiador);
  var lbl = 'padding:2.5px 8px;font-size:8.6px;border-bottom:1px solid #DBEAFE';
  var val = 'padding:2.5px 8px;font-size:8.6px;border-bottom:1px solid #DBEAFE;white-space:nowrap;width:24%';
  var quien = D.hayFiador ? 'El Comprador y el Fiador declaran' : 'El Comprador declara';
  return '<div style="'+S_.h1+'">ANEXO “D” — RECAUDOS Y DECLARACIÓN DE CONOCIMIENTO DEL CLIENTE</div>'
    + p('El presente Anexo forma parte integrante del Contrato y documenta los recaudos y la debida diligencia realizada respecto del Comprador'+(D.hayFiador?' y del Fiador':'')+', a los efectos de las declaraciones de la Cláusula 8 y de la normativa aplicable en materia de prevención de legitimación de capitales y financiamiento al terrorismo.')
    + sub('D.1 Recaudos Consignados')
    + '<table style="width:100%;border-collapse:collapse;border:1px solid #BFDBFE;margin:4px 0">'
    + '<tr><th style="background:'+S_.az+';color:#fff;font-size:8.6px;padding:3px 8px;text-align:left">Recaudo</th><th style="background:'+S_.az+';color:#fff;font-size:8.6px;padding:3px 8px;text-align:left">Consignado</th></tr>'
    + recaudos.map(function(r){ return '<tr><td style="'+lbl+'">'+r[1]+'</td><td style="'+val+'">'+D.recaudo(r[0])+'</td></tr>'; }).join('')
    + '<tr><td style="'+lbl+'">Otros: '+D.otrosTexto+'</td><td style="'+val+'">'+D.recaudo('otros')+'</td></tr></table>'
    + sub('D.2 Declaración sobre el Origen de los Fondos')
    + p('El Comprador declara que la actividad económica de la cual provienen los fondos destinados al pago de la Inicial y de las Cuotas Quincenales es: '+D.actividad+', con un ingreso mensual aproximado de '+D.ingresoMensual+'. El Comprador declara que dichos fondos provienen de actividades lícitas y se obliga a suministrar a Pagasi, cuando ésta lo requiera razonablemente, los soportes que lo acrediten.')
    + sub('D.3 Declaración PEP')
    + p(quien+' que: NO ostenta'+(D.hayFiador?'n':'')+' '+D.pepNo+' / SÍ ostenta'+(D.hayFiador?'n':'')+' '+D.pepSi+' la condición de Persona Expuesta Políticamente, ni son cónyuge, pariente dentro del segundo grado de afinidad o cuarto de consanguinidad, ni asociado cercano de una PEP. En caso afirmativo, especificar: '+D.pepDetalle+'.')
    + sub('D.4 Verificaciones Realizadas por Pagasi')
    + p('Consulta en listas restrictivas: fecha '+D.verFecha+' · resultado '+D.verRes+'. Verificación de identidad: fecha '+D.verFecha+' · medio '+(D.docs.verificado?'<strong>cédula y RIF</strong>':D.b(10))+'. Verificación de domicilio: fecha '+D.verFecha+' · medio '+(D.docs.verificado?'<strong>comprobante de domicilio</strong>':D.b(10))+'. Verificación del Vehículo ante el INTT: fecha '+D.verFecha+' · resultado '+D.verRes+'. Analista responsable: '+D.analista+'. Aprobación del financiamiento: fecha '+D.fechaLarga+' · hora '+D.hora+' · aprobado por '+D.aprobadoPor+'.')
    + _protectFirmas(D);
}

// ── Ensamblado ──────────────────────────────────────────────────────────
function _htmlContratoProtect(credId){
  var D = _protectDatos(credId); if(!D) return null;
  var S_ = _protectEstilos(), c = D.c;
  var logo = _draLogo();
  var fecha = c.fecha ? new Date(c.fecha+'T12:00:00').toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'}) : '';
  // El preambulo (partes + considerandos) se imprime parrafo a parrafo, SIN
  // el "page-break-inside:avoid" que _draCuerpo le pone a cada bloque. Son
  // ~una pagina de texto seguido sin ningun titulo de clausula que cierre el
  // bloque, asi que el navegador lo saltaba entero a la pagina 2 y dejaba la
  // primera en blanco. Las clausulas numeradas si van por _draCuerpo.
  // Todo el cuerpo parrafo a parrafo, SIN los bloques anti-salto de
  // _draCuerpo: a dos columnas esos bloques dejan huecos al pie de cada
  // columna. El texto legal fluye entre columnas y hojas, que es lo normal.
  var cuerpo = _PROTECT_CUERPO.map(function(fn){
    var t = fn(D); return (t && String(t).trim()) ? _draParrafo(t, S_) : '';
  }).join('');
  var anexo = function(html){ return '<div style="'+S_.anexo+'">'+html+'</div>'; };

  return '<div class="cdoc" style="'+S_.doc+'">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    +   (logo?'<img src="'+logo+'" style="height:40px;object-fit:contain">':'<div></div>')
    +   '<div style="font-size:10.5px;color:#555;text-align:right;line-height:1.7">'
    +     '<strong>N° de Contrato:</strong> '+c.id+'<br><strong>Fecha:</strong> <strong>'+fecha+'</strong></div></div>'
    + '<div style="'+S_.h1+'">CONTRATO DE FINANCIAMIENTO PARA LA ADQUISICIÓN DE VEHÍCULO AUTOMOTOR, CON GARANTÍAS'+(D.hayFiador?', FIANZA':'')+' Y PRESTACIÓN DE SERVICIOS «PAGASI PROTECT»</div>'
    + '<div style="'+S_.cols+'">' + cuerpo + '</div>'
    + '<div style="break-inside:avoid;margin-top:10px">'
    +   _draParrafo(_PROTECT_CIERRE, S_)
    +   _protectFirmas(D)
    + '</div>'
    // ── Anexos: fluyen uno tras otro; cada uno evita partirse, pero no fuerza hoja nueva ──
    + anexo('<div style="'+S_.h1+'">ANEXO “A” — CRONOGRAMA DE PAGOS</div>'
      + '<p style="'+S_.p+'">El presente Anexo forma parte integrante del Contrato y refleja el calendario de vencimiento de las Cuotas Quincenales a cargo del Comprador, con el desglose de capital, Intereses Financieros y saldo insoluto.</p>'
      + _protectCronograma(D, S_)
      + '<div style="break-inside:avoid;page-break-inside:avoid">'
      +   '<p style="'+S_.p+';margin-top:6px">El Comprador'+(D.hayFiador?' y el Fiador declaran':' declara')+' conocer y aceptar el presente cronograma de pagos.</p>'
      +   _protectFirmas(D, false)
      + '</div>')
    + anexo(_protectAnexoB(D, S_))
    + anexo(_protectAnexoC(D, S_))
    // El Anexo D (recaudos y KYC) va entero en su propia hoja: es el que se
    // llena a mano con el cliente delante y no puede quedar partido.
    + '<div style="page-break-before:always;break-inside:avoid">' + _protectAnexoD(D, S_) + '</div>'
    + '</div>';
}
function _renderContratoProtect(){ _pintarDoc(_htmlContratoProtect()); }
