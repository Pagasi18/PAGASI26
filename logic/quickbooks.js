// Exportar a QuickBooks (Adam, 23-oct-2026: "Tenemos un nuevo contador… nosotros también vamos a trabajar con
// QuickBooks… una nueva pestaña en finanzas… estudies profundamente estas Excel… dupliques esto… que se pueda
// imprimir igual que todo. En Excel, en PDF… para que le entre a QuickBooks… no hacer cálculos nuevos, sino
// agarrar lo que ya tenemos").
// Las plantillas de importación del contador (llegaron 5: no hay 04), llenas con los datos del sistema:
//  01 Ficha de Clientes (.xlsx)              los clientes con crédito y lo que deben a la fecha de corte (motor contable)
//  02 Servicios (.xlsx)                      el catálogo del contador, con lo que se factura de verdad
//  03 Factura de Servicios a clientes (.csv) una factura por cuota cobrada, partida como la Nueva metodología
//  05 Ficha de Proveedores (.xlsx)           los proveedores de los gastos (los del Libro de Compras)
//  06 Factura de Proveedor QB (.csv)         las facturas de proveedor del mes (las del Libro de Compras)
// Los CSV salen como los del contador: separados por ';', en Windows-1252 y con fin de línea CRLF.
// QuickBooks enlaza las facturas con el cliente y el proveedor por el NOMBRE: el mismo texto tiene que salir igual
// en los 5 archivos y en todos los meses (ver _qbNombresQB).
// Nada se guarda: la pestaña solo lee y exporta.

var QB_IVA_GENERAL = '16.0% S (16%)', QB_SIN_IVA = 'No VAT (0%)';
var QB_TERMINOS = 'Net 15', QB_DIAS_TERMINOS = 15;   // los términos de las dos plantillas de factura
var QB_MONEDA = 'USD';                               // créditos, pagos y gastos están en dólares
var QB_PAIS = 'Venezuela';

// El catálogo del contador (02. Servicios.xlsx) tal cual, con los cambios que la pantalla muestra:
//  · Intereses de Financiamiento va SIN IVA y aparece Pagasi Protect con el 16 % por dentro. Es la regla de Adam del
//    23-sep-2026 ("de Pagasi Protect hay que pagar el IVA"; ver logic/metodologia.js). El contador tenía el 16 % en
//    los intereses y no tenía Protect. Adam (23-oct): "Lo hablo con el contador". Si deciden otra cosa se cambia
//    AQUÍ (la tasa y el código de cada servicio, y en QB_PARTES qué parte de la cuota va a cada uno) y todo lo
//    demás lo sigue: el 02, las facturas, los totales y los controles.
//  · Otros servicios: solo en la PAGASI 18 (contratos hasta el CRED-498, sin interés ni Protect).
//  · IGTF percibido: solo si alguna factura fiscal se emitió con IGTF (ese dinero es del SENIAT, no es ingreso).
// fila = las 19 columnas del 02; linea = la descripción en la factura (las dos primeras, como el 03 del contador).
var QB_SERVICIOS = [
  { k: 'cartera', tasa: 0, linea: 'Amortizacion de Financiamiento',
    fila: ['Cartera de financiamiento', 'Ingresos', 'Sin Inventario', 'N/A', 'Financiamiento de Moto Con Cliente', 'N/A', 'CARTERA DE FINANCIAMIENTO', 'Amortizacion de Financiamiento', '', 'CARTERA DE FINANCIAMIENTO', 'N/A', 'N/A', 'N/A', QB_SIN_IVA, 'N/A', QB_SIN_IVA, 'N/A', '', 'N/A'] },
  { k: 'intereses', tasa: 0, linea: 'Intereses por Financiamiento',
    cambio: 'El contador lo tenía con 16.0% S (16%). Va sin IVA por la regla del 23-sep: el IVA se paga del Pagasi Protect.',
    fila: ['Intereses de Financiamiento', 'Ingresos', 'Sin Inventario', 'N/A', 'Intereses por Financiamiento', 'N/A', 'INGRESOS POR INTERESES DE FINANCIAMIENTO', '', '', '', 'N/A', 'N/A', 'N/A', QB_SIN_IVA, 'N/A', '', 'N/A', '', 'N/A'] },
  { k: 'mora', tasa: 0.16, linea: 'Cobro de Comision por pago extemporaneo',
    fila: ['Comision por Morosidad', 'Ingresos', 'Sin Inventario', 'N/A', 'Cobro de Comision por pago extemporaneo', 'N/A', 'INGRESOS POR MORA EN FINANCIAMIENTO', '', '', '', 'N/A', 'N/A', 'N/A', QB_IVA_GENERAL, 'N/A', '', 'N/A', '', 'N/A'] },
  { k: 'honorarios',
    fila: ['Honorarios Profesionales', 'Servicios', 'Sin Inventario', 'N/A', '', 'N/A', '', 'Honorarios profesionales varios', '', 'HONORARIOS PROFESIONALES', '', '', '', '', 'N/A', QB_IVA_GENERAL, 'N/A', 'Jesus Galarraga', 'N/A'] },
  { k: 'protect', tasa: 0.16, linea: 'Servicio Pagasi Protect', nuevo: true,
    cambio: 'Nuevo: no estaba en la plantilla del contador. Lleva el IVA de cada cuota (16 % por dentro del Protect).',
    fila: ['Pagasi Protect', 'Ingresos', 'Sin Inventario', 'N/A', 'Servicio Pagasi Protect', 'N/A', 'INGRESOS POR PAGASI PROTECT', '', '', '', 'N/A', 'N/A', 'N/A', QB_IVA_GENERAL, 'N/A', '', 'N/A', '', 'N/A'] },
  { k: 'servicios', tasa: 0, linea: 'Otros servicios del contrato', nuevo: true, soloSiHay: 'servicios',
    cambio: 'Nuevo, solo PAGASI 18: en los contratos hasta el CRED-498 lo cobrado por encima de la moto es "otros servicios", sin IVA (como en Dashboard Finanzas).',
    fila: ['Otros servicios', 'Ingresos', 'Sin Inventario', 'N/A', 'Otros servicios del contrato (hasta el CRED-498)', 'N/A', 'INGRESOS POR OTROS SERVICIOS', '', '', '', 'N/A', 'N/A', 'N/A', QB_SIN_IVA, 'N/A', '', 'N/A', '', 'N/A'] },
  { k: 'igtf', tasa: 0, linea: 'IGTF percibido', nuevo: true, soloSiHay: 'igtf',
    cambio: 'Nuevo: el IGTF (3 %) que llevan algunas facturas fiscales no es ingreso, es del SENIAT. Va en su propia línea; la cuenta la confirma el contador.',
    fila: ['IGTF percibido', 'Impuestos', 'Sin Inventario', 'N/A', 'IGTF percibido en cobros en divisas', 'N/A', 'IGTF POR PAGAR', '', '', '', 'N/A', 'N/A', 'N/A', QB_SIN_IVA, 'N/A', '', 'N/A', '', 'N/A'] }
];
// Qué parte de cada cobro va a qué servicio (las partes salen de qbPartirPago; el IGTF, de la factura fiscal)
var QB_PARTES = [['amortizacion', 'cartera'], ['intereses', 'intereses'], ['protect', 'protect'], ['servicios', 'servicios'], ['igtf', 'igtf']];
// QuickBooks pide la cuenta de cada gasto por su nombre. Mientras el contador no pase las suyas, van las categorías
// de Registrar egreso.
var QB_CUENTAS_GASTO = { inventario: 'INVENTARIO / MOTOS', equipos: 'EQUIPOS (GPS)', operativo: 'OFICINA Y SERVICIOS', otros: 'OTROS' };
// Código de IVA de cada alícuota de compra. El 16 % y el 0 % son los del 02 del contador; 8 % y 31 % siguen el mismo
// formato y están por confirmar (la factura sale marcada).
var QB_CODIGO_COMPRA = { '0.16': QB_IVA_GENERAL, '0.08': '8.0% R (8%)', '0.31': '31.0% (31%)' };

var QB_ARCHIVOS = {
  clientes:    { n: '01', titulo: 'Ficha de Clientes', archivo: '01. Ficha de Clientes', hoja: '02. Importacion de Clientes', fmt: 'xlsx',
    enc: ['Nombre', 'Email', 'Telefono', 'Movil', 'Fax', 'Pagina Web', 'Direccion', 'Ciudad', 'Estado', 'Codigo postal', 'Pais', 'Balance de Apertura', 'Fecha', 'Numero de Registro', 'Divisa'],
    anchos: [34, 26, 14, 14, 10, 19.11, 40, 16, 16, 12.33, 12.33, 17.66, 12.33, 16, 10], montos: [11] },
  servicios:   { n: '02', titulo: 'Servicios', archivo: '02. Servicios', hoja: 'sample-products', fmt: 'xlsx',
    enc: ['Nombre del Servicio', 'Categoria', 'Tipo de Servicio', 'Unidad en stock', 'Descripcion de Ventas', 'Tarifa', 'Cuenta de ingresos', 'Descripcion en Compras', 'Costo de compra', 'Cuenta de gastos', 'Existencias', 'Cantidad a la fecha', 'Punto de reabastecimiento', 'Codigo IVA Ventas', 'La tasa de ventas incluye impuestos', 'Codigo IVA Compra', 'La tasa de compra incluye impuestos', 'Proveedor preferido', 'Cuenta de activos de inventario'],
    anchos: [26.33, 11.55, 19.11, 11.55, 38.55, 11.55, 46.22, 29, 15.44, 46.22, 11.55, 17.66, 24.11, 16.55, 32.11, 17.44, 33.22, 17.89, 27.89], montos: [] },
  facturas:    { n: '03', titulo: 'Factura de Servicios a clientes', archivo: '03. Factura de Servicios a clientes', hoja: '03. Factura de Servicios', fmt: 'csv',
    enc: ['Nº Factura', 'Cliente', 'Fecha Factura', 'Fecha Vcmto.', 'Terminos', 'Producto / Servicio', 'Descripcion', 'ItemQuantity', 'ItemRate', '*ItemAmount', '*ItemTaxCode', 'ItemTaxAmount', 'Currency', 'Service Date', 'Note to customer'],
    anchos: [19, 34, 12, 12, 9, 26, 30, 8, 10, 11, 15, 11, 9, 12, 40], montos: [8, 9, 11] },
  proveedores: { n: '05', titulo: 'Ficha de Proveedores', archivo: '05. Ficha de Proveedores', hoja: '05. Ficha de Proveedores', fmt: 'xlsx',
    enc: ['Persona Contacto', 'Nombre de la empresa', 'Correo', 'Telefono', 'Celular', 'Fax', 'Pagina Web', 'Calle', 'Ciudad', 'Estado', 'Codigo Postal', 'Pais', 'Fe. Creacion', 'RIF', 'Moneda'],
    anchos: [34, 34, 18, 14, 12, 10, 12, 34, 14, 12, 12, 12, 12, 15, 9], montos: [] },
  compras:     { n: '06', titulo: 'Factura de Proveedor', archivo: '06. Factura de Proveedor QB', hoja: '06. Factura de Proveedor QB', fmt: 'csv',
    enc: ['*BillNo', '*Supplier', '*BillDate', '*DueDate', 'Terms', 'Location', 'Memo', '*Account', 'LineDescription', '*LineAmount', '*LineTaxCode', 'LineTaxAmount', 'Currency'],
    anchos: [16, 32, 11, 11, 8, 9, 9, 22, 40, 11, 15, 12, 9], montos: [9, 11] }
};
var QB_ORDEN = ['clientes', 'servicios', 'facturas', 'proveedores', 'compras'];

// ── Utilidades ──
var _QB_CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B,
  0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A,
  0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
var _qbR2 = function(n){ return Math.round((parseFloat(n) || 0) * 100) / 100; };
function _qbISO(v){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; }
function _qbMasDias(iso, n){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); if(!m) return ''; return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10); }
function _qbDMY(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }   // 03: 13/10/2026
function _qbMDY(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[2] + '/' + m[3] + '/' + m[1] : ''; }   // 06: 10/13/2026
function _qbSerial(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 + 25569 : ''; }   // fecha de Excel
function _qbFinMesAnterior(periodo){ var m = /^(\d{4})-(\d{2})$/.exec(String(periodo || '')); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, 0)).toISOString().slice(0, 10) : ''; }
function _qbEn1252(c){ return c < 0x80 || (c >= 0xA0 && c <= 0xFF) || !!_QB_CP1252[c]; }
// El texto tal como va a QuickBooks, igual en los Excel y en los CSV: sin caracteres invisibles (los que deja pegar
// desde WhatsApp), con los acentos compuestos, y sin nada que Windows-1252 no tenga (Ş → S; lo que no tiene letra
// base, como un emoji, se quita). Si no, el mismo nombre saldría distinto en el 01 y en el 03.
function _qbTxt(v){
  var s = String(v == null ? '' : v);
  if(s.normalize) s = s.normalize('NFC');
  s = s.replace(/[­​-‏⁠﻿]/g, '');
  var out = '';
  for(var i = 0; i < s.length; i++){
    var c = s.charCodeAt(i);
    if(_qbEn1252(c)){ out += s.charAt(i); continue; }
    if(c >= 0xD800 && c <= 0xDBFF){ i++; continue; }
    var d = s.charAt(i).normalize ? s.charAt(i).normalize('NFD') : '';
    for(var j = 0; j < d.length; j++){ var cc = d.charCodeAt(j); if(!(cc >= 0x300 && cc <= 0x36F) && _qbEn1252(cc)) out += d.charAt(j); }
  }
  return out.replace(/\s+/g, ' ').trim();
}
// Para comparar nombres como los compara QuickBooks: sin mayúsculas, acentos ni signos
function _qbClaveNombre(s){ return _qbTxt(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }
function _qbServicio(k){ return QB_SERVICIOS.find(function(s){ return s.k === k; }) || QB_SERVICIOS[0]; }
function _qbEsInicial(p){ return !!(p && (p.esInicial || p.tipoOperacion === 'inicial_credito')); }
// Los pagos de un crédito, con un índice que se arma una vez (el motor recorre los pagos de cada crédito)
function _qbPagosDe(ctx, credId){
  if(!ctx._porCred){ ctx._porCred = {}; (ctx.pagos || []).forEach(function(p){ if(p){ var k = String(p.cred); (ctx._porCred[k] = ctx._porCred[k] || []).push(p); } }); }
  return ctx._porCred[String(credId)] || [];
}

// ══════════════ EL REPARTO DE UNA CUOTA COBRADA ══════════════
// Sin cálculos nuevos: las partes son las de la Nueva metodología (_metoDeCredito/_metoRepartir: recuperación del
// precio, interés al 12 % anual y Pagasi Protect, en la proporción del contrato). El Protect se queda con lo que
// falta para que las partes sumen exactamente lo cobrado.
// Donde la metodología no aplica se reparte como Dashboard Finanzas (principal / total del plan):
//  · PAGASI 18 hasta el CRED-498: el resto es "otros servicios".
//  · Sin cuota, con una cuota que no alcanza el 12 % (no queda Protect) o con precio menor que la inicial: el resto
//    es interés.
function qbPartirPago(c, monto){
  var m = _qbR2(monto);
  var principal = Math.max(0, (parseFloat(c && c.precio) || 0) - (parseFloat(c && c.ini) || 0));
  var porPlan = function(){
    var t = parseFloat(c && c.total) || 0;
    if(!(t > 0)) t = principal * ((c && parseFloat(c.factor)) || (typeof PLAN !== 'undefined' && PLAN && PLAN.factor) || 0);
    var a = _qbR2(m * (t > 0 ? Math.min(1, principal / t) : 1));
    return { amortizacion: a, resto: _qbR2(m - a) };
  };
  if(typeof _dfEsServicios === 'function' && _dfEsServicios(c)){
    var s = porPlan();
    return { amortizacion: s.amortizacion, intereses: 0, protect: 0, servicios: s.resto, como: 'servicios' };
  }
  var R = (typeof _metoDeCredito === 'function') ? _metoDeCredito(c) : null;
  if(R && R.recuperacion >= 0 && R.protect > 0 && R.total > 0 && Math.abs(R.recuperacion + R.intereses + R.protect - R.total) < 0.05){
    var p = _metoRepartir(R, m);
    var prot = _qbR2(m - p.recuperacion - p.intereses);
    if(prot >= 0) return { amortizacion: p.recuperacion, intereses: p.intereses, protect: prot, servicios: 0, como: 'metodologia' };
  }
  var x = porPlan();
  return { amortizacion: x.amortizacion, intereses: x.resto, protect: 0, servicios: 0, como: 'sin-protect' };
}

// Las líneas de la factura: una por servicio. En la línea con IVA, el IVA es el de la Nueva metodología
// (parte − parte ÷ 1,16) y el monto es una base con la que el 16 % da exactamente ese IVA: así, si QuickBooks lo
// recalcula desde el código, le da lo mismo. El centavo que eso mueva va a la línea sin IVA (Cartera), y la factura
// sigue sumando lo cobrado.
function qbLineas(partes){
  var porServ = {}, orden = [];
  QB_PARTES.forEach(function(pp){
    var v = _qbR2(partes[pp[0]]);
    if(!(Math.abs(v) > 0.004)) return;
    if(porServ[pp[1]] == null){ porServ[pp[1]] = 0; orden.push(pp[1]); }
    porServ[pp[1]] = _qbR2(porServ[pp[1]] + v);
  });
  var lineas = orden.map(function(k){ var s = _qbServicio(k); return { k: k, servicio: s.fila[0], desc: s.linea || s.fila[4], tasa: s.tasa || 0, monto: porServ[k], iva: 0, codigo: s.fila[13] || QB_SIN_IVA }; });
  var ajuste = 0;
  lineas.forEach(function(l){
    if(!l.tasa) return;
    var t = l.monto, iva = _qbR2(t - t / (1 + l.tasa)), b0 = _qbR2(t - iva), base = b0;
    for(var d = 0; d <= 10; d++){
      var hit = (d ? [b0 - d / 100, b0 + d / 100] : [b0]).map(_qbR2).find(function(b){ return _qbR2(b * l.tasa) === iva; });
      if(hit != null){ base = hit; break; }
    }
    l.monto = base; l.iva = iva; ajuste = _qbR2(ajuste + t - base - iva);
  });
  if(Math.abs(ajuste) > 0.004){
    var sin = lineas.find(function(l){ return !l.tasa && l.k !== 'igtf' && l.monto + ajuste >= 0; }) || lineas.find(function(l){ return l.tasa && l.monto + ajuste >= 0; });
    if(sin) sin.monto = _qbR2(sin.monto + ajuste);
  }
  return lineas.map(function(l){ return { k: l.k, servicio: l.servicio, desc: l.desc, monto: l.monto, iva: l.iva, codigo: l.codigo }; });
}

// ══════════════ CLIENTES ══════════════
// Crédito → cliente: primero clienteId, después cliId (la regla de _credEsDeCliente, logic/pagos.js) y por último el
// nombre. Por nombre no cuenta un lead web abierto, y si hay dos personas distintas con ese nombre el crédito no se
// le pega a ninguna: queda en la lista para ponerle el cliente.
function _qbIndiceClientes(clientes){
  var porId = {}, porNombre = {};
  (clientes || []).forEach(function(cl){
    if(!cl) return;
    porId[String(cl.id)] = cl;
    if(cl.origen === 'web' && cl.estado === 'lead' && cl.web_cerrado !== true) return;
    var n = _qbTxt(cl.nombre);
    if(n) (porNombre[n] = porNombre[n] || []).push(cl);
  });
  return { porId: porId, porNombre: porNombre };
}
function _qbCedula(cl){ return cl ? String(cl.cedula || cl.rif || '').replace(/\D/g, '') : ''; }
// De varias fichas de la misma persona: la que no está borrada y, entre esas, la más vieja (siempre la misma)
function _qbFichaPrincipal(fichas){
  return (fichas || []).slice().sort(function(a, b){
    if(!!a.eliminado !== !!b.eliminado) return a.eliminado ? 1 : -1;
    var na = parseFloat(a.id), nb = parseFloat(b.id);
    if(isFinite(na) && isFinite(nb) && na !== nb) return na - nb;
    return String(a.id).localeCompare(String(b.id));
  })[0] || null;
}
function _qbClienteDe(c, idx){
  var cid = (c.clienteId != null && String(c.clienteId) !== '') ? c.clienteId : c.cliId;
  if(cid != null && String(cid) !== '' && idx.porId[String(cid)]) return { ficha: idx.porId[String(cid)] };
  var cands = idx.porNombre[_qbTxt(c.cli)] || [], vivas = cands.filter(function(cl){ return !cl.eliminado; });
  if(!vivas.length) vivas = cands;
  var personas = {};
  vivas.forEach(function(cl){ var ced = _qbCedula(cl); personas[ced ? 'CI:' + ced : 'ID:' + cl.id] = 1; });
  if(Object.keys(personas).length > 1) return { ficha: null, ambiguo: true };
  return { ficha: _qbFichaPrincipal(vivas) };
}
function _qbCredCuenta(c){ return !!c && !c.eliminado && ['pendiente_revision', 'rechazado', 'rechazada'].indexOf(c.estado) === -1; }

// Lo que debe un crédito a la fecha de corte, con el motor contable (logic/credito-ledger.js): las cuotas que
// faltan con los pagos hechos hasta ese día. El motor no corta por fecha, así que se le pasan solo esos pagos, y el
// descuento de una liquidación cuenta solo si la liquidación ya se había hecho. Un crédito cerrado (completado) al
// corte debe 0, como en Pagos. Si el crédito no tiene cuota o número de cuotas el motor no puede armar el plan:
// entonces es total − cobrado, como en Pagos y Dashboard Finanzas, y queda marcado (info.sinCuota).
function qbSaldoCredito(c, pagos, corte, info){
  if(!_qbCredCuenta(c)) return null;
  if(c.fecha && _qbISO(c.fecha) > corte) return null;   // todavía no existía
  if(c.estado === 'cancelado') return 0;
  if(c.estado === 'completado' && _qbISO(c.fechaCompletado) && _qbISO(c.fechaCompletado) <= corte) return 0;
  var hasta = (pagos || []).filter(function(p){ return p && String(p.cred) === String(c.id) && _qbISO(p.fecha) && _qbISO(p.fecha) <= corte; });
  var desc = parseFloat(c.descuentoLiquidacion) || 0;
  var liq = hasta.some(function(p){ return !p.eliminado && (p.estado || 'confirmado') === 'confirmado' && (p.tipo === 'liquidacion' || p.referencia === 'LIQ-ANT'); })
    || (c.tipoCierre === 'liquidacion_anticipada' && desc > 0 && !!_qbISO(c.fechaCompletado) && _qbISO(c.fechaCompletado) <= corte);
  var L = (typeof CreditoLedger !== 'undefined') ? CreditoLedger : null;
  if(!L) return null;
  var e = L.generarEstadoCredito(c, hasta, { today: corte, liquidacionActiva: liq });
  if(!(e.totalCuotas > 0) || !(e.cuotaBase > 0)){
    if(info) info.sinCuota = true;
    var cobrado = hasta.filter(function(p){ return !p.eliminado && p.estado === 'confirmado' && !_qbEsInicial(p); }).reduce(function(a, p){ return a + (parseFloat(p.monto) || 0); }, 0);
    return _qbR2(Math.max(0, (parseFloat(c.total) || 0) - cobrado - (liq ? desc : 0)));
  }
  return _qbR2(e.saldoPendiente);
}

// El nombre en QuickBooks. QuickBooks no admite dos nombres iguales (sin distinguir mayúsculas ni acentos) y enlaza
// cada factura por el nombre, así que el nombre de alguien no puede cambiar de un mes a otro: entre los que se
// llaman igual, se queda con el nombre limpio el que llegó primero (el crédito o el gasto más antiguo) y los demás
// llevan su cédula o RIF. Los que llegan después no le cambian el nombre a nadie.
function _qbNombresQB(items, sufijo){
  var grupos = {};
  items.forEach(function(x){ var k = _qbClaveNombre(x.nombre); (grupos[k] = grupos[k] || []).push(x); });
  Object.keys(grupos).forEach(function(k){
    grupos[k].sort(function(a, b){ return a.primera < b.primera ? -1 : (a.primera > b.primera ? 1 : 0); })
      .forEach(function(x, i){ x.nombreQB = i === 0 ? x.nombre : x.nombre + ' (' + sufijo(x) + ')'; });
  });
}

function qbClientes(ctx){
  var idx = _qbIndiceClientes(ctx.clientes), porClave = {}, orden = [], ambiguos = [], sinCuota = [];
  var ponCred = function(c){
    var r = _qbClienteDe(c, idx), cl = r.ficha, ced = _qbCedula(cl);
    if(r.ambiguo) ambiguos.push(c);
    var clave = ced ? 'CI:' + ced : (cl ? 'ID:' + cl.id : 'NOM:' + _qbClaveNombre(c.cli) + (r.ambiguo ? '|' + c.id : ''));
    if(!porClave[clave]){ porClave[clave] = { clave: clave, fichas: [], creditos: [], saldo: 0, primera: '', nombreCred: _qbTxt(c.cli) }; orden.push(clave); }
    var x = porClave[clave];
    if(cl && x.fichas.indexOf(cl) === -1) x.fichas.push(cl);
    if(x.creditos.indexOf(String(c.id)) === -1){
      x.creditos.push(String(c.id));
      var orden1 = (_qbISO(c.fecha) || '9999-99-99') + '|' + String(c.id);
      if(!x.primera || orden1 < x.primera) x.primera = orden1;
      var info = {}, s = qbSaldoCredito(c, _qbPagosDe(ctx, c.id), ctx.corte, info);
      if(info.sinCuota) sinCuota.push(c);
      if(s != null) x.saldo = _qbR2(x.saldo + s);
    }
    return x;
  };
  var porCred = {};
  (ctx.creds || []).forEach(function(c){ if(_qbCredCuenta(c)) porCred[String(c.id)] = ponCred(c); });
  // Un cobro de un crédito que no cuenta (p. ej. sin aprobar) igual necesita su cliente
  (ctx.credsFacturados || []).forEach(function(c){ if(!porCred[String(c.id)]) porCred[String(c.id)] = ponCred(c); });
  var filas = orden.map(function(k){
    var x = porClave[k];
    x.ficha = _qbFichaPrincipal(x.fichas);
    x.nombre = _qbTxt(x.ficha ? x.ficha.nombre : x.nombreCred) || 'SIN NOMBRE';
    x.registro = _lbRifCliente(x.ficha ? (x.ficha.rif || x.ficha.cedula || '') : '');
    return x;
  });
  _qbNombresQB(filas, function(x){ return x.registro || (x.ficha && x.ficha.id != null ? 'ID ' + x.ficha.id : x.creditos[0]); });
  filas.sort(function(a, b){ return a.nombreQB.localeCompare(b.nombreQB); });
  return { filas: filas, porCred: porCred, ambiguos: ambiguos, sinCuota: sinCuota };
}

function _qbFilaCliente(x, corte){
  var f = x.ficha || {}, tel = _qbTxt(f.tel), wa = _qbTxt(f.wa);
  return [x.nombreQB, _qbTxt(f.email), tel, wa && wa !== tel ? wa : '', '', '', _qbTxt(f.dir || f.direccion), _qbTxt(f.ciudad), _qbTxt(f.estado_ubi), '', QB_PAIS,
    x.saldo > 0 ? x.saldo : '', x.saldo > 0 ? corte : '', x.registro, QB_MONEDA];
}

// ══════════════ FACTURAS A CLIENTES (una por cuota cobrada) ══════════════
// Las cuotas confirmadas del mes, con el mismo filtro de Dashboard Finanzas y la Nueva metodología. La inicial no
// va: no la financia Pagasi y no lleva Protect. El N° y la fecha son los del pago: no cambian aunque después se
// emita su factura fiscal (si se reimporta un mes, QuickBooks reconoce las mismas facturas). El N° de la factura
// fiscal, si se emitió, va en la nota; y si esa factura cobró IGTF, el IGTF va en su propia línea.
function _qbVencimientos(c, pagos){
  var L = (typeof CreditoLedger !== 'undefined') ? CreditoLedger : null, m = {};
  if(!L) return m;
  L.generarEstadoCredito(c, pagos, {}).cuotas.forEach(function(cu){
    (cu.aplicaciones || []).forEach(function(a){
      var x = m[a.pagoId] || (m[a.pagoId] = { cuotas: [], fechaVence: '' });
      if(x.cuotas.indexOf(cu.numero) === -1) x.cuotas.push(cu.numero);
      if(cu.fechaVence && (!x.fechaVence || cu.fechaVence < x.fechaVence)) x.fechaVence = cu.fechaVence;
    });
  });
  return m;
}

function qbFacturas(ctx){
  var credPorId = {}, facPorPago = {}, venc = {};
  (ctx.creds || []).forEach(function(c){ if(c) credPorId[String(c.id)] = c; });
  (ctx.facturas || []).forEach(function(f){ if(f && f.pagoId && !f.anulada) facPorPago[String(f.pagoId)] = f; });
  var delMes = (ctx.pagos || []).filter(function(p){ return p && !p.eliminado && p.estado === 'confirmado' && _lbEnPeriodo(p.fecha, ctx.periodo); });
  var iniciales = delMes.filter(_qbEsInicial);
  var cuotas = delMes.filter(function(p){ return !_qbEsInicial(p); })
    .sort(function(a, b){ return String(a.fecha).localeCompare(String(b.fecha)) || String(a.id).localeCompare(String(b.id)); });
  var docs = [], sinCredito = [], credsFacturados = [];
  cuotas.forEach(function(p){
    var c = credPorId[String(p.cred || p.creditoId)];
    if(!c){ sinCredito.push(p); return; }
    if(credsFacturados.indexOf(c) === -1) credsFacturados.push(c);
    if(!venc[c.id]) venc[c.id] = _qbVencimientos(c, _qbPagosDe(ctx, c.id));
    var fac = facPorPago[String(p.id)], cobrado = _qbR2(p.monto), igtf = fac ? _qbR2(fac.igtf) : 0;
    if(!(igtf > 0 && igtf < cobrado)) igtf = 0;
    var partes = qbPartirPago(c, _qbR2(cobrado - igtf));
    if(igtf) partes.igtf = igtf;
    var lineas = qbLineas(partes), v = venc[c.id][p.id] || {}, fecha = _qbISO(p.fecha);
    docs.push({ numero: String(p.id), pagoId: p.id, factura: fac ? String(fac.numero) : '', cred: c.id, fecha: fecha, vence: _qbMasDias(fecha, QB_DIAS_TERMINOS),
      servicio: v.fechaVence || fecha, cuotas: v.cuotas || [], nota: 'CONTRATO Nº ' + c.id + (fac ? ' · FACTURA FISCAL Nº ' + fac.numero : ''),
      cobrado: cobrado, igtf: igtf, como: partes.como, lineas: lineas,
      monto: _qbR2(lineas.reduce(function(a, l){ return a + l.monto; }, 0)), iva: _qbR2(lineas.reduce(function(a, l){ return a + l.iva; }, 0)) });
  });
  return { docs: docs, iniciales: iniciales, sinCredito: sinCredito, credsFacturados: credsFacturados };
}

function _qbFilasFactura(d){
  return d.lineas.map(function(l, i){
    var cab = i === 0;
    return [d.numero, cab ? d.cliente : '', cab ? _qbDMY(d.fecha) : '', cab ? _qbDMY(d.vence) : '', cab ? QB_TERMINOS : '', l.servicio, l.desc, 1, l.monto, l.monto, l.codigo, l.iva,
      cab ? QB_MONEDA : '', cab ? _qbDMY(d.servicio) : '', cab ? d.nota : ''];
  });
}

// ══════════════ PROVEEDORES Y SUS FACTURAS (los documentos del Libro de Compras) ══════════════
// Mismos documentos que el Libro de Compras (lbComprasDocumentos): sin nómina, comisiones ni lo que "no lleva
// factura", y la compra de una moto pagada de varias cuentas es una sola factura de la sede. El proveedor es el de
// los datos fiscales del gasto o la sede de la moto; si no hay ninguno, el gasto no se inventa un proveedor: queda
// en la lista para completarlo en el Libro de Compras.
// Un proveedor es un RIF con un nombre (dos sedes con el mismo RIF y distinto nombre son dos proveedores). Un RIF
// de relleno ("N/A", "0") no es RIF: no junta a nadie. Un gasto sin RIF va con el proveedor del mismo nombre que sí
// lo tiene, si existe.
function _qbRifValido(rif){ var r = String(rif || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return /^[VEJGPC]\d{5,10}$/.test(r) ? r : ''; }
function _qbProvDeDoc(g){ var f = g.fiscal || {}, s = g.sugerido || {}; return { nombre: _qbTxt(f.proveedor || s.proveedor), rif: _qbTxt(f.rif || s.rif).toUpperCase(), importacion: f.origen === 'IMPORTACION' }; }

function qbProveedores(docs, concesionarios){
  var porClave = {}, orden = [], porDoc = {}, rifMalos = [];
  var concs = (concesionarios || []).filter(function(c){ return c && !c.eliminado; });
  var sede = function(rv, nk){
    var mismoRif = rv ? concs.filter(function(c){ return _qbRifValido(c.rif) === rv; }) : [];
    return mismoRif.find(function(c){ return _qbClaveNombre(c.nombre) === nk; }) || mismoRif[0]
      || (!rv ? concs.find(function(c){ return _qbClaveNombre(c.nombre) === nk; }) : null) || null;
  };
  var agregar = function(k, g, p, rv){
    var nk = _qbClaveNombre(p.nombre), fecha = _qbISO(g.fecha);
    if(!porClave[k]){ porClave[k] = { clave: k, nombre: p.nombre, nombreClave: nk, rif: rv ? p.rif : '', conc: sede(rv, nk), desde: fecha, importacion: p.importacion, docs: 0, primera: '' }; orden.push(k); }
    var x = porClave[k], o = (fecha || '9999-99-99') + '|' + g.clave;
    x.docs++;
    if(fecha && (!x.desde || fecha < x.desde)) x.desde = fecha;
    if(!x.primera || o < x.primera) x.primera = o;
    porDoc[g.clave] = k;
  };
  var sinRif = [];
  (docs || []).forEach(function(g){
    var p = _qbProvDeDoc(g);
    if(!p.nombre) return;
    var rv = _qbRifValido(p.rif);
    if(p.rif && !rv && !p.importacion) rifMalos.push(p.nombre + ' (RIF "' + p.rif + '")');
    if(rv) agregar('R:' + rv + '|' + _qbClaveNombre(p.nombre), g, p, rv); else sinRif.push([g, p]);
  });
  sinRif.forEach(function(gp){
    var nk = _qbClaveNombre(gp[1].nombre), conRif = orden.find(function(k){ return porClave[k].nombreClave === nk; });
    agregar(conRif || 'N:' + nk, gp[0], gp[1], conRif ? porClave[conRif].rif : '');
  });
  var filas = orden.map(function(k){ return porClave[k]; });
  _qbNombresQB(filas, function(x){ return x.rif || 'SIN RIF'; });
  filas.sort(function(a, b){ return a.nombreQB.localeCompare(b.nombreQB); });
  return { filas: filas, porClave: porClave, porDoc: porDoc, rifMalos: rifMalos };
}

function _qbFilaProveedor(x){
  var c = x.conc || {};
  // La primera columna es el nombre con el que QuickBooks enlaza las facturas del 06 (*Supplier)
  return [x.nombreQB, x.nombre, '', _qbTxt(c.telefono), '', '', '', _qbTxt(c.direccion), _qbTxt(c.ciudad), '', '', x.importacion ? '' : QB_PAIS,
    _qbISO(c.createdAt) || x.desde, x.rif, QB_MONEDA];
}

function qbCompras(docs, periodo, provs){
  var porClaveDoc = {};
  (docs || []).forEach(function(g){ porClaveDoc[g.clave] = g; });
  var filas = lbComprasFilas(docs, periodo, {});
  var bills = [], sinProveedor = [], notasCredito = [], usados = {};
  filas.forEach(function(f){
    var g = porClaveDoc[f.clave] || {}, fi = g.fiscal || {};
    if(typeof f.total === 'number' && f.total < 0){ notasCredito.push(f); return; }
    var prov = provs.porClave[provs.porDoc[f.clave]];
    if(!prov){ sinProveedor.push(f); return; }
    var numero = _qbTxt(fi.numero) || ('EG-' + f.egresoIds[0]), avisos = [];
    if(!_qbTxt(fi.numero)) avisos.push('sin N° de factura del proveedor');
    var u = prov.clave + '|' + numero.toUpperCase();
    if(usados[u]){ numero = numero + '-' + (++usados[u]); avisos.push('N° de factura repetido'); } else usados[u] = 1;
    var cuenta = QB_CUENTAS_GASTO[g.categoria] || (_qbTxt(g.categoria).toUpperCase() || 'OTROS'), lineas = [];
    if(typeof f.exento === 'number' && f.exento) lineas.push({ monto: f.exento, codigo: QB_SIN_IVA, iva: 0 });
    if(typeof f.base === 'number' && f.base){
      var cod = QB_CODIGO_COMPRA[String(f.alic)];
      if(f.alic === 0) cod = QB_SIN_IVA;
      else if(!cod){ cod = QB_SIN_IVA; avisos.push('base sin alícuota: va sin IVA'); }
      else if(f.alic !== 0.16) avisos.push('código de IVA del ' + Math.round(f.alic * 100) + '% por confirmar con el contador');
      lineas.push({ monto: f.base, codigo: cod, iva: cod === QB_SIN_IVA ? 0 : (typeof f.iva === 'number' ? f.iva : 0) });
    }
    if(!lineas.length){ lineas.push({ monto: _qbR2(f.total), codigo: QB_SIN_IVA, iva: 0 }); avisos.push('sin base ni IVA: va todo sin IVA'); }
    var fecha = _qbISO(f.fechaDoc);
    bills.push({ numero: numero, proveedor: prov.nombreQB, fecha: fecha, vence: _qbMasDias(fecha, QB_DIAS_TERMINOS), cuenta: cuenta, desc: _qbTxt(g.concepto), lineas: lineas, avisos: avisos,
      monto: _qbR2(lineas.reduce(function(a, l){ return a + l.monto; }, 0)), iva: _qbR2(lineas.reduce(function(a, l){ return a + l.iva; }, 0)), clave: f.clave });
  });
  return { bills: bills, sinProveedor: sinProveedor, notasCredito: notasCredito };
}

function _qbFilasCompra(b){
  return b.lineas.map(function(l){ return [b.numero, b.proveedor, _qbMDY(b.fecha), _qbMDY(b.vence), QB_TERMINOS, '', '', b.cuenta, b.desc, l.monto, l.codigo, l.iva, QB_MONEDA]; });
}

// ══════════════ TODO JUNTO (lo que se ve y lo que se exporta) ══════════════
function qbDatos(ctx){
  _qbPagosDe(ctx, '');   // el índice de pagos por crédito, una sola vez para todo
  var F = qbFacturas(ctx);
  var C = qbClientes(Object.assign({}, ctx, { credsFacturados: F.credsFacturados }));
  F.docs.forEach(function(d){ var x = C.porCred[String(d.cred)]; d.cliente = x ? x.nombreQB : ''; });
  var docsCompra = lbComprasDocumentos(ctx.egresos || [], { motos: ctx.motos || [], concesionarios: ctx.concesionarios || [] });
  var P = qbProveedores(docsCompra, ctx.concesionarios);
  // En QuickBooks un nombre no puede ser a la vez cliente y proveedor: el proveedor lleva su RIF
  var nombresCli = {};
  C.filas.forEach(function(x){ nombresCli[_qbClaveNombre(x.nombreQB)] = 1; });
  var tambienClientes = P.filas.filter(function(x){ return nombresCli[_qbClaveNombre(x.nombreQB)]; });
  tambienClientes.forEach(function(x){ x.nombreQB = x.nombre + ' (' + (x.rif || 'PROVEEDOR') + ')'; });
  if(tambienClientes.length) P.filas.sort(function(a, b){ return a.nombreQB.localeCompare(b.nombreQB); });
  var B = qbCompras(docsCompra, ctx.periodo, P);
  var hay = {
    servicios: typeof _dfEsServicios === 'function' && (ctx.creds || []).some(function(c){ return c && !c.eliminado && _dfEsServicios(c); }),
    igtf: (ctx.facturas || []).some(function(f){ return f && !f.anulada && _qbR2(f.igtf) > 0; })
  };
  var servicios = QB_SERVICIOS.filter(function(s){ return !s.soloSiHay || hay[s.soloSiHay]; });

  var filas = {
    clientes: C.filas.map(function(x){ return _qbFilaCliente(x, ctx.corte); }),
    servicios: servicios.map(function(s){ return s.fila.slice(); }),
    facturas: [].concat.apply([], F.docs.map(_qbFilasFactura)),
    proveedores: P.filas.map(_qbFilaProveedor),
    compras: [].concat.apply([], B.bills.map(_qbFilasCompra))
  };

  var suma = function(arr, k){ return _qbR2((arr || []).reduce(function(a, x){ return a + (parseFloat(x[k]) || 0); }, 0)); };
  var cobrado = suma(F.docs, 'cobrado'), facturado = _qbR2(suma(F.docs, 'monto') + suma(F.docs, 'iva'));
  var ivaExacto = F.docs.every(function(d){ return d.lineas.every(function(l){ var s = _qbServicio(l.k); return !s.tasa || _qbR2(l.monto * s.tasa) === l.iva; }); });
  var ivaLibro = _qbR2((ctx.facturas || []).filter(function(f){ return f && !f.anulada && _lbEnPeriodo(f.fechaEmision, ctx.periodo); }).reduce(function(a, f){ return a + (parseFloat(f.iva) || 0); }, 0));
  var ok = function(c){ return c ? 'CUADRA' : 'REVISAR'; }, cuantos = function(n, mal){ return n ? (mal ? 'REVISAR: ' : '') + n : 'OK'; };
  var ctl = {
    clientes: [
      { concepto: 'Clientes con crédito', estado: String(C.filas.length) },
      { concepto: 'Con saldo por cobrar al ' + _qbDMY(ctx.corte), estado: String(C.filas.filter(function(x){ return x.saldo > 0; }).length) },
      { concepto: 'Saldo por cobrar total (cuotas que faltan según el motor contable)', estado: fmt(suma(C.filas, 'saldo')) },
      { concepto: 'Los créditos cancelados, cerrados, sin aprobar o creados después del corte no suman saldo', estado: 'OK' },
      { concepto: 'Créditos sin cuota o sin número de cuotas (su saldo es total − cobrado, como en Pagos)', estado: cuantos(C.sinCuota.length, true) },
      { concepto: 'Créditos sin cliente y con el nombre de dos personas distintas (ponles el cliente)', estado: cuantos(C.ambiguos.length, true) }
    ],
    servicios: servicios.filter(function(s){ return s.cambio; }).map(function(s){ return { concepto: s.fila[0] + ': ' + s.cambio, estado: 'AVISO' }; }),
    facturas: [
      { concepto: 'Cuotas cobradas y confirmadas del mes (una factura por cada una)', estado: F.docs.length + ' · ' + fmt(cobrado) },
      { concepto: 'Lo facturado (montos + IVA) es igual a lo cobrado', estado: ok(Math.abs(cobrado - facturado) < 0.005) },
      { concepto: 'El IVA de cada línea es el 16 % de su monto (si QuickBooks lo recalcula, da lo mismo)', estado: ok(ivaExacto) },
      { concepto: 'IVA del mes: 16 % del Pagasi Protect, por dentro de la cuota', estado: fmt(suma(F.docs, 'iva')) },
      { concepto: 'Con factura fiscal emitida (su N° va en la nota; el N° de la factura es el del pago)', estado: F.docs.filter(function(d){ return d.factura; }).length + ' de ' + F.docs.length },
      { concepto: 'IVA del mes en el Libro de Ventas (las facturas fiscales lo sacan del pago entero)', estado: fmt(ivaLibro) },
      { concepto: 'IGTF de las facturas fiscales (va en su propia línea: no es ingreso)', estado: fmt(suma(F.docs, 'igtf')) },
      { concepto: 'Iniciales del mes (no van: no las financia Pagasi ni llevan Protect)', estado: F.iniciales.length + ' · ' + fmt(suma(F.iniciales, 'monto')) },
      { concepto: 'Cobros sin su crédito en el sistema (no se pueden facturar)', estado: cuantos(F.sinCredito.length, true) },
      { concepto: 'Repartidas sin la Nueva metodología (sin cuota, cuota bajo el 12 % o precio menor que la inicial)', estado: String(F.docs.filter(function(d){ return d.como === 'sin-protect'; }).length) }
    ],
    proveedores: [
      { concepto: 'Proveedores de los gastos (todos los meses)', estado: String(P.filas.length) },
      { concepto: 'Sedes (con teléfono, dirección y ciudad de su ficha)', estado: String(P.filas.filter(function(x){ return x.conc; }).length) },
      { concepto: 'RIF que no es RIF ("N/A", "0"…): van sin RIF; corrígelos en el Libro de Compras', estado: cuantos(P.rifMalos.length, true) },
      { concepto: 'Proveedores que también son clientes (en QuickBooks llevan su RIF en el nombre)', estado: String(tambienClientes.length) }
    ],
    compras: [
      { concepto: 'Facturas de proveedor del mes', estado: B.bills.length + ' · ' + fmt(_qbR2(suma(B.bills, 'monto') + suma(B.bills, 'iva'))) },
      { concepto: 'Gastos del mes sin proveedor (no entran: complétalos en el Libro de Compras)', estado: cuantos(B.sinProveedor.length, true) },
      { concepto: 'Sin N° de factura del proveedor (van con EG- y el N° del gasto)', estado: String(B.bills.filter(function(b){ return b.avisos.indexOf('sin N° de factura del proveedor') > -1; }).length) },
      { concepto: 'Notas de crédito (no van aquí: en QuickBooks son créditos de proveedor)', estado: String(B.notasCredito.length) },
      { concepto: 'La nómina y las comisiones no son facturas de proveedor: no van', estado: 'OK' }
    ]
  };
  return { ctx: ctx, filas: filas, controles: ctl, clientes: C, facturas: F, proveedores: P, compras: B, servicios: servicios };
}

// ══════════════ ARCHIVOS ══════════════
// CSV como los del contador: ';', CRLF al final de cada línea y Windows-1252 (el 'º' de "Nº Factura" es el byte BA).
function _qbCampoCsv(v){
  var s = v == null ? '' : String(v);
  s = s.replace(/\r\n|\r|\n/g, ' ');
  return /[;"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function qbCsvTexto(enc, filas){ return [enc].concat(filas).map(function(r){ return r.map(_qbCampoCsv).join(';'); }).join('\r\n') + '\r\n'; }
function qbWin1252(texto){
  var s = String(texto == null ? '' : texto);
  if(s.normalize) s = s.normalize('NFC');
  var out = new Uint8Array(s.length), n = 0;
  for(var i = 0; i < s.length; i++){
    var c = s.charCodeAt(i);
    if(c >= 0xD800 && c <= 0xDBFF){ i++; out[n++] = 0x3F; continue; }   // fuera de Windows-1252: '?'
    if(c < 0x80 || (c >= 0xA0 && c <= 0xFF)) out[n++] = c;
    else out[n++] = _QB_CP1252[c] || 0x3F;
  }
  return out.subarray(0, n);
}

// La hoja de Excel: fila 1 los encabezados de la plantilla y desde la fila 2 los datos, sin títulos encima (QuickBooks
// lee la primera fila como encabezados). Las fechas del 01 y del 05 van como fecha de Excel, igual que en la plantilla.
function qbHoja(tipo, filas){
  var A = QB_ARCHIVOS[tipo], colFecha = { clientes: 12, proveedores: 12 }[tipo];
  return { name: A.hoja, cols: A.anchos, rows: [A.enc.map(function(h){ return { v: h, s: 'encabezado' }; })].concat(filas.map(function(r){
    return r.map(function(v, i){
      if(i === colFecha && v) return { v: _qbSerial(v), s: 'fecha' };
      if(typeof v === 'number' && A.montos.indexOf(i) > -1) return { v: v, s: 'montoSimple' };
      return v;
    });
  })) };
}

function _qbNombreArchivo(tipo, st){
  var A = QB_ARCHIVOS[tipo];
  if(tipo === 'clientes') return A.archivo + ' (corte ' + st.corte + ')';
  if(tipo === 'servicios' || tipo === 'proveedores') return A.archivo;
  return A.archivo + ' ' + st.periodo;
}
function _qbDescargar(nombre, bytes, tipoMime){
  var blob = new Blob([bytes], { type: tipoMime }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
}

// ══════════════ PANTALLA ══════════════
function _qbEstado(){
  if(!S.qbPeriodo){ var d = new Date(); S.qbPeriodo = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  if(!S.qbCorte) S.qbCorte = _qbFinMesAnterior(S.qbPeriodo);
  if(!S.qbVista || !QB_ARCHIVOS[S.qbVista]) S.qbVista = 'facturas';
  return { periodo: S.qbPeriodo, corte: S.qbCorte, vista: S.qbVista, q: S.qbQ || '' };
}
function _qbCalcular(){
  var st = _qbEstado();
  var D = qbDatos({ creds: S.creds || [], pagos: S.pagos || [], clientes: S.clientes || [], facturas: S.facturas || [], egresos: S.egresos || [],
    motos: S.motos || [], concesionarios: S.concesionarios || [], periodo: st.periodo, corte: st.corte });
  D.st = st; D.empresa = (typeof getEmpresa === 'function' ? getEmpresa() : {}) || {};
  return D;
}
// Lo de la vista elegida, con la búsqueda aplicada: lo que se ve es lo que se exporta (como en los libros). En las
// facturas (03 y 06) la búsqueda elige facturas enteras: si algo de una factura coincide, van todas sus líneas.
function _qbVer(D, tipo){
  var filas = D.filas[tipo], q = String(D.st.q || '').trim();
  if(!q) return { filas: filas, filtrado: false };
  var norm = function(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }, Q = norm(q);
  if(tipo !== 'facturas' && tipo !== 'compras') return { filas: filas.filter(function(r){ return norm(r.join(' ')).indexOf(Q) > -1; }), filtrado: true };
  var docs = [], clave = function(r){ return tipo === 'facturas' ? r[0] : r[0] + '|' + r[1]; };
  filas.forEach(function(r){ var u = docs[docs.length - 1]; if(u && u.k === clave(r)) u.filas.push(r); else docs.push({ k: clave(r), filas: [r] }); });
  return { filas: [].concat.apply([], docs.filter(function(d){ return norm(d.filas.map(function(r){ return r.join(' '); }).join(' ')).indexOf(Q) > -1; }).map(function(d){ return d.filas; })), filtrado: true };
}

function _qbTablaHtml(D, tipo, V){
  var A = QB_ARCHIVOS[tipo];
  var th = 'padding:6px 7px;border:1px solid var(--rim);font-size:9.5px;font-weight:800;text-align:center;vertical-align:middle;line-height:1.25;background:var(--gs);color:var(--ink2);white-space:nowrap';
  var celda = function(v, i){
    var esMonto = A.montos.indexOf(i) > -1;
    var txt = v === '' || v == null ? '' : (esMonto && typeof v === 'number' ? fmt(v) : ((tipo === 'clientes' || tipo === 'proveedores') && i === 12 ? _qbDMY(v) : _lbEsc(v)));
    return '<td style="padding:5px 7px;border:1px solid var(--rim2);font-size:11px;' + (esMonto || typeof v === 'number' ? 'text-align:right;font-family:var(--fd);' : '') + 'white-space:nowrap">' + txt + '</td>';
  };
  var marcado = tipo === 'servicios' ? D.servicios.reduce(function(m, s){ m[s.fila[0]] = !!(s.nuevo || s.cambio); return m; }, {}) : {};
  var cuerpo = V.filas.map(function(r){
    var estilo = (tipo === 'servicios' && marcado[r[0]]) ? 'background:rgba(245,158,11,.08)' : ((tipo === 'facturas' && r[1]) || tipo === 'compras' ? 'border-top:2px solid var(--rim)' : '');
    return '<tr style="' + estilo + '">' + r.map(celda).join('') + '</tr>';
  }).join('');
  var vacio = !V.filas.length ? '<tr><td colspan="' + A.enc.length + '" style="padding:22px;text-align:center;color:var(--ink3);font-size:12px">'
    + (V.filtrado ? 'Nada coincide con la búsqueda.' : { clientes: 'No hay clientes con crédito.', servicios: '', facturas: 'No hay cuotas cobradas y confirmadas en ' + _lbPeriodoVE(D.st.periodo) + '.', proveedores: 'Ningún gasto tiene proveedor todavía. Se completan en el Libro de Compras.', compras: 'No hay facturas de proveedor en ' + _lbPeriodoVE(D.st.periodo) + '.' }[tipo]) + '</td></tr>' : '';
  var tot = '';
  var sumCol = function(i){ return _qbR2(V.filas.reduce(function(a, r){ return a + (typeof r[i] === 'number' ? r[i] : 0); }, 0)); };
  var cols = { facturas: [9, 11], compras: [9, 11], clientes: [11] }[tipo];
  if(cols){
    tot = '<tr>' + A.enc.map(function(h, i){
      var td = 'padding:7px;border:1px solid var(--rim);font-weight:800;background:rgba(16,185,129,.08);font-size:11px;';
      if(i === cols[0] - 1) return '<td style="' + td + 'text-align:right">TOTALES</td>';
      if(cols.indexOf(i) > -1) return '<td style="' + td + 'text-align:right;font-family:var(--fd);white-space:nowrap">' + fmt(sumCol(i)) + '</td>';
      return '<td style="' + td + '"></td>';
    }).join('') + '</tr>';
  }
  return '<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table id="qb-tabla-' + tipo + '" style="border-collapse:collapse;width:100%"><thead><tr>'
    + A.enc.map(function(h){ return '<th style="' + th + '">' + _lbEsc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + (vacio || cuerpo) + tot + '</tbody></table></div>';
}

function _qbListaHtml(titulo, items){
  if(!items.length) return '';
  return '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:12px;font-weight:800;color:var(--amber)">' + _lbEsc(titulo) + ' (' + items.length + ')</summary>'
    + '<ul style="margin:8px 0 0 18px;font-size:11.5px;color:var(--ink2);line-height:1.6">' + items.map(function(t){ return '<li>' + _lbEsc(t) + '</li>'; }).join('') + '</ul></details>';
}

function _qbCuerpoHtml(D){
  D = D || _qbCalcular();
  var tipo = D.st.vista, A = QB_ARCHIVOS[tipo], V = _qbVer(D, tipo);
  var estadoHtml = function(e){ var mal = /^(REVISAR|AVISO)/.test(e); return '<b style="color:' + (mal ? (e === 'AVISO' ? 'var(--amber)' : 'var(--red)') : 'var(--ink)') + '">' + _lbEsc(e) + '</b>'; };
  var controles = '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr><th style="padding:7px 8px;border:1px solid var(--rim);background:var(--gs);font-size:10px;text-align:left">Control</th><th style="padding:7px 8px;border:1px solid var(--rim);background:var(--gs);font-size:10px;text-align:right">Resultado</th></tr></thead><tbody>'
    + D.controles[tipo].map(function(c){ return '<tr><td style="padding:6px 8px;border:1px solid var(--rim2)">' + _lbEsc(c.concepto) + '</td><td style="padding:6px 8px;border:1px solid var(--rim2);text-align:right;white-space:nowrap">' + estadoHtml(c.estado) + '</td></tr>'; }).join('')
    + '</tbody></table>';
  var listas = '';
  if(tipo === 'clientes'){
    listas += _qbListaHtml('Créditos sin cuota o sin número de cuotas', D.clientes.sinCuota.map(function(c){ return c.id + ' · ' + _qbTxt(c.cli); }));
    listas += _qbListaHtml('Créditos con el nombre de dos personas distintas', D.clientes.ambiguos.map(function(c){ return c.id + ' · ' + _qbTxt(c.cli); }));
  }
  if(tipo === 'facturas'){
    listas += _qbListaHtml('Cobros sin su crédito', D.facturas.sinCredito.map(function(p){ return _qbDMY(p.fecha) + ' · ' + p.id + ' · crédito ' + (p.cred || '—') + ' · ' + fmt(p.monto); }));
  }
  if(tipo === 'proveedores') listas += _qbListaHtml('RIF que no es RIF', D.proveedores.rifMalos);
  if(tipo === 'compras'){
    listas += _qbListaHtml('Gastos sin proveedor', D.compras.sinProveedor.map(function(f){ return _qbDMY(f.fechaDoc) + ' · ' + (f.concepto || '') + ' · ' + fmt(f.total); }));
    listas += _qbListaHtml('Notas de crédito', D.compras.notasCredito.map(function(f){ return _qbDMY(f.fechaDoc) + ' · ' + f.nombre + ' · ' + (f.ndnc || '') + ' · ' + fmt(f.total); }));
    listas += _qbListaHtml('Facturas con algo por revisar', D.compras.bills.filter(function(b){ return b.avisos.length; }).map(function(b){ return b.numero + ' · ' + b.proveedor + ': ' + b.avisos.join('; '); }));
  }
  var nota = {
    clientes: 'Balance de Apertura = lo que cada cliente debe al ' + _qbDMY(D.st.corte) + ' (fecha de corte): las cuotas que le faltan con los pagos hechos hasta ese día, con el mismo motor contable de Pagos. Un cliente sin saldo va con el balance y la fecha en blanco. Las cuotas que se cobren después del corte ya están dentro de ese saldo: si también se importan sus facturas (03), en QuickBooks se registran como pago de ese saldo.',
    servicios: 'El catálogo del contador tal cual. Lo marcado en amarillo cambió o es nuevo; el aviso de abajo dice por qué. Las facturas (03) usan exactamente estos nombres.',
    facturas: 'Cada cuota cobrada se parte como en la Nueva metodología: Cartera de financiamiento (lo que recupera del precio de la moto), Intereses (12 % anual, sin IVA) y Pagasi Protect, con el IVA del 16 % por dentro. Lo facturado (montos + IVA) es igual a lo cobrado. N° y Fecha Factura = los del cobro · Service Date = el vencimiento de la cuota que pagó.',
    proveedores: 'Los proveedores salen de los datos fiscales de cada gasto (Libro de Compras) y, en la compra de motos, de la sede. La sede trae su teléfono, dirección y ciudad. Fe. Creación = la de la sede o la del primer gasto.',
    compras: 'Las mismas facturas del Libro de Compras de ' + _lbPeriodoVE(D.st.periodo) + ': la parte exenta va en una línea "' + QB_SIN_IVA + '" y la base en otra con su IVA. La cuenta es la categoría del gasto mientras el contador no pase sus cuentas de QuickBooks.'
  }[tipo];
  return (V.filtrado ? '<div style="margin:0 0 8px;padding:8px 11px;border-radius:8px;background:rgba(37,99,235,.07);font-size:11.5px;color:var(--ink2)">Filtrado: los totales y lo que se exporta son solo de lo que se ve.</div>' : '')
    + '<div class="ch" style="flex-wrap:wrap;gap:10px;margin-bottom:8px"><div><div class="ct" style="font-size:14px">' + A.n + '. ' + _lbEsc(A.titulo) + '</div><div class="cs">' + _lbEsc(nota) + '</div></div>'
    +   '<div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap">'
    +     (A.fmt === 'csv' ? '<button class="btn btn-p btn-sm" onclick="qbExportar(\'' + tipo + '\',\'csv\')">⬇ CSV para QuickBooks</button>' : '')
    +     '<button class="btn ' + (A.fmt === 'csv' ? 'btn-g' : 'btn-p') + ' btn-sm" onclick="qbExportar(\'' + tipo + '\',\'excel\')">⬇ Excel</button>'
    +     '<button class="btn btn-g btn-sm" onclick="qbExportar(\'' + tipo + '\',\'pdf\')">📄 PDF</button></div></div>'
    + _qbTablaHtml(D, tipo, V)
    + '<div style="margin-top:14px"><div style="font-size:12px;font-weight:800;margin-bottom:6px">CONTROLES</div>' + controles + listas + '</div>';
}

function _renderQuickBooks(){
  var st = _qbEstado(), emp = (typeof getEmpresa === 'function' ? getEmpresa() : {}) || {};
  var D = _qbCalcular();
  var chips = QB_ORDEN.map(function(t){
    var A = QB_ARCHIVOS[t], n = t === 'facturas' ? D.facturas.docs.length : (t === 'compras' ? D.compras.bills.length : D.filas[t].length), act = st.vista === t;
    return '<button class="btn ' + (act ? 'btn-p' : 'btn-g') + ' btn-sm" style="padding:6px 11px" onclick="qbVista(\'' + t + '\')">' + A.n + ' · ' + _lbEsc(A.titulo) + ' <span style="opacity:.75">(' + n + ')</span></button>';
  }).join('');
  return '<div class="card" style="margin-bottom:14px">'
    + '<div class="ch" style="flex-wrap:wrap;gap:10px"><div><div class="ct">Exportar a QuickBooks</div><div class="cs">Las plantillas de importación del contador, llenas con los datos del sistema · cifras en dólares (USD)</div></div>'
    +   '<div style="display:flex;gap:6px;margin-left:auto"><button class="btn btn-p btn-sm" onclick="qbDescargarTodo()">⬇ Descargar los 5</button></div></div>'
    + '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 14px;font-size:12px;margin:2px 0 12px;padding:10px 12px;background:var(--gs);border-radius:9px">'
    +   '<span style="color:var(--ink3)">Empresa</span><b>' + _lbEsc(emp.nombre || '') + '</b>'
    +   '<span style="color:var(--ink3)">RIF</span><b>' + _lbEsc(emp.rif || '—') + '</b></div>'
    + '<div class="fgr" style="gap:10px;align-items:end;flex-wrap:wrap">'
    +   '<div class="fg" style="min-width:150px"><label>Período de las facturas (03 y 06)</label><input class="fi" id="qb-periodo" type="month" value="' + st.periodo + '" onchange="qbPeriodo(this.value)"></div>'
    +   '<div class="fg" style="min-width:150px"><label>Corte del saldo de clientes (01)</label><input class="fi" id="qb-corte" type="date" value="' + st.corte + '" onchange="qbCorte(this.value)"></div>'
    +   '<div class="fg" style="flex:1;min-width:200px"><label>Buscar</label><input class="fi" id="qb-buscar" placeholder="Buscar por cliente, proveedor, RIF, N° de factura o contrato…" value="' + _lbEsc(st.q) + '" oninput="qbBuscar(this.value)"></div>'
    + '</div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">' + chips + '</div></div>'
    + '<div class="card" style="margin-bottom:14px"><div id="qb-cuerpo">' + _qbCuerpoHtml(D) + '</div></div>';
}
function _qbRepintar(){ var el = document.getElementById('qb-cuerpo'); if(el) el.innerHTML = _qbCuerpoHtml(); }
function qbVista(t){ if(QB_ARCHIVOS[t]){ S.qbVista = t; nav('reportes'); } }
function qbPeriodo(v){
  if(!/^\d{4}-\d{2}$/.test(v)) return;
  var corteDef = S.qbCorte === _qbFinMesAnterior(S.qbPeriodo);   // si el corte era el de siempre, se mueve con el mes
  S.qbPeriodo = v; if(corteDef) S.qbCorte = _qbFinMesAnterior(v);
  nav('reportes');
}
function qbCorte(v){ if(/^\d{4}-\d{2}-\d{2}$/.test(v)){ S.qbCorte = v; nav('reportes'); } }
var _qbBuscarT = null;
function qbBuscar(v){ S.qbQ = v; clearTimeout(_qbBuscarT); _qbBuscarT = setTimeout(_qbRepintar, 180); }

// ══════════════ EXPORTAR ══════════════
function qbHtmlPdf(D, tipo, V){
  var A = QB_ARCHIVOS[tipo], emp = D.empresa || {};
  var th = 'border:1px solid #9ca3af;padding:3px 3px;font-size:6.6px;font-weight:800;text-align:center;vertical-align:middle;background:#f2f2f2;color:#111;text-transform:none;letter-spacing:0';
  var td = 'border:1px solid #cbd5e1;padding:2px 3px;font-size:7px;color:#111';
  var h = '<div style="font-size:10.5px;line-height:1.5;margin-bottom:8px"><b style="font-size:12.5px">' + _lbEsc(emp.nombre || '') + '</b><br>RIF: ' + _lbEsc(emp.rif || '') + '<br><b>QUICKBOOKS · ' + A.n + '. ' + _lbEsc(A.titulo.toUpperCase()) + '</b><br>'
    + (tipo === 'clientes' ? 'Balance de apertura al <b>' + _qbDMY(D.st.corte) + '</b>' : (tipo === 'facturas' || tipo === 'compras' ? 'Período: <b>' + _lbPeriodoVE(D.st.periodo) + '</b>' : 'Catálogo'))
    + ' · Cifras en dólares (USD)' + (V.filtrado ? '<br><i>Filtrado por: ' + _lbEsc(D.st.q) + '</i>' : '') + '</div>';
  h += '<table style="border-collapse:collapse;width:100%;table-layout:auto"><thead><tr>' + A.enc.map(function(x){ return '<th style="' + th + '">' + _lbEsc(x) + '</th>'; }).join('') + '</tr></thead><tbody>'
    + V.filas.map(function(r){ return '<tr>' + r.map(function(v, i){
        var num = typeof v === 'number', fecha = (tipo === 'clientes' || tipo === 'proveedores') && i === 12;
        return '<td style="' + td + ';white-space:nowrap' + (num ? ';text-align:right' : '') + '">' + (v === '' || v == null ? '' : (num && A.montos.indexOf(i) > -1 ? fmt(v).replace('$', '') : (fecha ? _qbDMY(v) : _lbEsc(v)))) + '</td>'; }).join('') + '</tr>'; }).join('')
    + '</tbody></table>';
  h += '<div style="margin-top:12px;break-inside:avoid"><div style="font-size:9px;font-weight:800;margin-bottom:4px">CONTROLES</div><table style="border-collapse:collapse;width:100%">'
    + D.controles[tipo].map(function(c){ return '<tr><td style="' + td + '">' + _lbEsc(c.concepto) + '</td><td style="' + td + ';font-weight:800;text-align:right;white-space:nowrap;color:' + (/^REVISAR/.test(c.estado) ? '#b91c1c' : '#111') + '">' + _lbEsc(c.estado) + '</td></tr>'; }).join('')
    + '</table></div>';
  return h;
}

function qbExportar(tipo, formato, D){
  D = D || _qbCalcular();
  var A = QB_ARCHIVOS[tipo], V = _qbVer(D, tipo), nombre = _qbNombreArchivo(tipo, D.st);
  if(formato === 'csv') return _qbDescargar(nombre + '.csv', qbWin1252(qbCsvTexto(A.enc, V.filas)), 'text/csv;charset=windows-1252');
  if(formato === 'excel') return xlsxEscribir(nombre + '.xlsx', [qbHoja(tipo, V.filas)]);
  _abrirVentanaImpresion('QuickBooks · ' + A.n + '. ' + A.titulo + (tipo === 'facturas' || tipo === 'compras' ? ' ' + _lbPeriodoVE(D.st.periodo) : ''), qbHtmlPdf(D, tipo, V), { horizontal: true });
}
// Los 5 en el formato de cada plantilla (el navegador puede pedir permiso para bajar varios archivos)
function qbDescargarTodo(){
  var D = _qbCalcular();
  D.st = Object.assign({}, D.st, { q: '' });   // los 5 completos, aunque haya una búsqueda puesta
  QB_ORDEN.forEach(function(t, i){ setTimeout(function(){ qbExportar(t, QB_ARCHIVOS[t].fmt === 'csv' ? 'csv' : 'excel', D); }, i * 700); });
  if(typeof toast === 'function') toast('Bajando los 5 archivos…', 'success');
}

if(typeof module !== 'undefined' && module.exports) module.exports = { qbPartirPago: qbPartirPago, qbLineas: qbLineas, qbSaldoCredito: qbSaldoCredito, qbClientes: qbClientes, qbFacturas: qbFacturas,
  qbProveedores: qbProveedores, qbCompras: qbCompras, qbDatos: qbDatos, qbCsvTexto: qbCsvTexto, qbWin1252: qbWin1252, qbHoja: qbHoja, QB_ARCHIVOS: QB_ARCHIVOS, QB_SERVICIOS: QB_SERVICIOS };
