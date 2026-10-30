// Exportar a QuickBooks (Adam, 23-oct-2026: "Tenemos un nuevo contador… nosotros también vamos a trabajar con
// QuickBooks… una nueva pestaña en finanzas… estudies profundamente estas Excel… dupliques esto… que se pueda
// imprimir igual que todo. En Excel, en PDF… para que le entre a QuickBooks… no hacer cálculos nuevos, sino
// agarrar lo que ya tenemos").
// Las plantillas de importación del contador, llenas con los datos del sistema:
//  01 Ficha de Clientes (.xlsx)              los clientes con crédito y lo que deben a la fecha de corte (motor contable)
//  02 Servicios (.xlsx)                      el catálogo del contador, con lo que se factura de verdad
//  03 Factura a clientes · Crédito (.csv)    una factura por cada abono: los cobros que no pagan una cuota completa
//                                            ellos solos (convenios, mora: varios pagos a una cuota)
//  04 Factura a clientes · Contado (.csv)    un recibo de venta por cada cobro que paga cuotas completas de una sola
//                                            vez, con la cuenta donde entró el dinero (el contador, 29-oct-2026: así
//                                            el cobro y la forma de pago quedan en un solo movimiento en QuickBooks)
//  05 Ficha de Proveedores (.xlsx)           los proveedores de los gastos (los del Libro de Compras)
//  06 Factura de Proveedor QB (.csv)         las facturas de proveedor del mes (las del Libro de Compras)
// Los CSV salen como los del contador: separados por ';', en Windows-1252 y con fin de línea CRLF.
// QuickBooks enlaza las facturas con el cliente y el proveedor por el NOMBRE: el mismo texto tiene que salir igual
// en los 6 archivos y en todos los meses (ver _qbNombresQB).
// Nada se guarda: la pestaña solo lee y exporta.

var QB_IVA_GENERAL = '16.0% S (16%)', QB_SIN_IVA = 'No VAT (0%)';
var QB_TERMINOS = 'Net 15', QB_DIAS_TERMINOS = 15;   // los términos de las dos plantillas de factura
var QB_MONEDA = 'USD';                               // créditos, pagos y gastos están en dólares
var QB_PAIS = 'Venezuela';

// El catálogo del contador: las 42 filas de su "02. Servicios.xlsx" del 28-oct-2026 (QB_PLAN_SERVICIOS, en
// logic/categorias-egreso.js). Ya trae la regla de Adam del 23-sep: INTERESES DE FINANCIAMIENTO sin IVA e INGRESOS POR
// PAGASI PROTEC con el 16 %. Las facturas (03) y los recibos (04) usan exactamente esos nombres. Lo que no está en su catálogo y el sistema
// necesita (solo si aparece): OTROS SERVICIOS (PAGASI 18, contratos hasta el CRED-498) e IGTF PERCIBIDO.
// fila = las 19 columnas del 02; linea = la descripción en la factura; la tasa sale del código de IVA de ventas.
function _qbFilaPlan(nombre){ var r = (typeof QB_PLAN_SERVICIOS !== 'undefined' ? QB_PLAN_SERVICIOS : []).find(function(x){ return x[0] === nombre; }); return r ? r.slice() : [nombre, 'Ingresos', 'Sin Inventario', '', nombre, '', '', '', '', '', '', '', '', QB_SIN_IVA, '', '', '', '', '']; }
function _qbTasaDe(codigo){ var m = /^([0-9.]+)%/.exec(String(codigo || '')); return m ? Math.round(parseFloat(m[1])) / 100 : 0; }
var QB_SERVICIOS = [
  { k: 'cartera', fila: _qbFilaPlan('CARTERA DE FINANCIAMIENTO'), linea: 'AMORTIZACION DE FINANCIAMIENTO' },
  { k: 'intereses', fila: _qbFilaPlan('INTERESES DE FINANCIAMIENTO'), linea: 'INTERESES POR FINANCIAMIENTO' },
  { k: 'mora', fila: _qbFilaPlan('COMISION POR MOROSIDAD'), linea: 'INGRESOS POR PAGO MOROSO' },
  { k: 'protect', fila: _qbFilaPlan('INGRESOS POR PAGASI PROTEC'), linea: 'INGRESOS POR PAGASI PROTEC' },
  { k: 'servicios', linea: 'OTROS SERVICIOS DEL CONTRATO', nuevo: true, soloSiHay: 'servicios',
    cambio: 'No está en el catálogo del contador. Solo PAGASI 18: en los contratos hasta el CRED-498 lo cobrado por encima de la moto es "otros servicios", sin IVA (como en Dashboard Finanzas).',
    fila: ['OTROS SERVICIOS', 'Ingresos', 'Sin Inventario', '', 'OTROS SERVICIOS DEL CONTRATO (HASTA EL CRED-498)', '', '4201001 INGRESOS POR MORA EN FINANCIAMIENTO', '', '', '', '', '', '', QB_SIN_IVA, '', '', '', '', ''] },
  { k: 'igtf', linea: 'IGTF PERCIBIDO', nuevo: true, soloSiHay: 'igtf',
    cambio: 'No está en el catálogo del contador. El IGTF (3 %) que llevan algunas facturas fiscales no es ingreso: va en su línea, a la cuenta 2106008 de su plan.',
    fila: ['IGTF PERCIBIDO', 'Impuestos', 'Sin Inventario', '', 'IGTF PERCIBIDO EN COBROS EN DIVISAS', '', '2106008 CUENTAS POR PAGAR IGTF PERCIBIDO POR ENTERAR', '', '', '', '', '', '', QB_SIN_IVA, '', '', '', '', ''] }
];
QB_SERVICIOS.forEach(function(s){ s.tasa = _qbTasaDe(s.fila[13]); });
// Qué parte de cada cobro va a qué servicio (las partes salen de qbPartirPago; el IGTF, de la factura fiscal)
var QB_PARTES = [['amortizacion', 'cartera'], ['intereses', 'intereses'], ['protect', 'protect'], ['servicios', 'servicios'], ['igtf', 'igtf']];
// La cuenta de cada gasto en QuickBooks (*Account del 06) sale de la categoría (logic/categorias-egreso.js, la columna
// "Cuenta de gastos" del contador). Una categoría sin cuenta va con su nombre y el 06 lo avisa.
function _qbCuentaGasto(categoria){
  var c = (typeof egresoCuentaQB === 'function') ? egresoCuentaQB(categoria) : '';
  if(c) return { cuenta: c, ok: true };
  var n = (typeof egresoCategoriaNombre === 'function') ? egresoCategoriaNombre(categoria) : String(categoria || '');
  return { cuenta: _qbTxt(n).toUpperCase() || 'OTROS', ok: false };
}
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
  facturas:    { n: '03', titulo: 'Factura de Servicios a clientes · Crédito', archivo: '03. Factura de Servicios a clientes Credito', hoja: '03. Facturas a Credito', fmt: 'csv',
    enc: ['Nº Factura', 'Cliente', 'Fecha Factura', 'Fecha Vcmto.', 'Terminos', 'Producto / Servicio', 'Descripcion', 'ItemQuantity', 'ItemRate', '*ItemAmount', '*ItemTaxCode', 'ItemTaxAmount', 'Currency', 'Service Date', 'Note to customer'],
    anchos: [19, 34, 12, 12, 9, 26, 30, 8, 10, 11, 15, 11, 9, 12, 40], montos: [8, 9, 11] },
  // La plantilla "03. Factura de Servicios a clientes Contado.csv" del contador (29-oct-2026): un recibo de venta
  // (Sales Receipt) lleva el cobro y la cuenta donde entró el dinero en un solo movimiento
  contado:     { n: '04', titulo: 'Factura de Servicios a clientes · Contado', archivo: '04. Factura de Servicios a clientes Contado', hoja: '04. Facturas de Contado', fmt: 'csv',
    enc: ['*SalesReceiptNo', 'Customer', '*SalesReceiptDate', '*DepositAccount', 'Location', 'Memo', 'Item(Product/Service)', 'ItemDescription', 'ItemQuantity', 'ItemRate', '*ItemAmount', '*ItemTaxCode', 'ItemTaxAmount', 'Currency', 'Service Date'],
    anchos: [19, 34, 12, 36, 9, 40, 26, 30, 8, 10, 11, 15, 11, 9, 12], montos: [9, 10, 12] },
  proveedores: { n: '05', titulo: 'Ficha de Proveedores', archivo: '05. Ficha de Proveedores', hoja: '05. Ficha de Proveedores', fmt: 'xlsx',
    enc: ['Persona Contacto', 'Nombre de la empresa', 'Correo', 'Telefono', 'Celular', 'Fax', 'Pagina Web', 'Calle', 'Ciudad', 'Estado', 'Codigo Postal', 'Pais', 'Fe. Creacion', 'RIF', 'Moneda'],
    anchos: [34, 34, 18, 14, 12, 10, 12, 34, 14, 12, 12, 12, 12, 15, 9], montos: [] },
  compras:     { n: '06', titulo: 'Factura de Proveedor', archivo: '06. Factura de Proveedor QB', hoja: '06. Factura de Proveedor QB', fmt: 'csv',
    enc: ['*BillNo', '*Supplier', '*BillDate', '*DueDate', 'Terms', 'Location', 'Memo', '*Account', 'LineDescription', '*LineAmount', '*LineTaxCode', 'LineTaxAmount', 'Currency'],
    anchos: [16, 32, 11, 11, 8, 9, 9, 22, 40, 11, 15, 12, 9], montos: [9, 11] }
};
var QB_ORDEN = ['clientes', 'servicios', 'facturas', 'contado', 'proveedores', 'compras'];
// Los archivos que van por mes (los demás son fichas o catálogo)
function _qbPorMes(tipo){ return tipo === 'facturas' || tipo === 'contado' || tipo === 'compras'; }

// La cuenta de QuickBooks donde entra cada cobro de contado (*DepositAccount del 04). Son las tres de la plantilla del
// contador, una por cada "Recibido en" del selector de pagos (_ORDEN_PAGO en logic/pagos.js), buscadas en el nombre de la
// cuenta del sistema tal como quedó en el pago (p.metodo). Un cobro en una cuenta que no esté aquí sale con el nombre
// de su cuenta y el 04 lo avisa: el contador la agrega a esta lista.
var QB_CUENTAS_DEPOSITO = [
  { match: '100% banco', cuenta: '1103001 100% BANCO CTA. CTE Nº 68129' },
  { match: 'binance',    cuenta: '1105001 BINANCE' },
  { match: 'efectivo',   cuenta: '1102001 CAJA EN MONEDA EXTRANJERA USD' }
];
function _qbCuentaDeposito(metodo){
  var norm = function(x){ return String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }, n = norm(metodo);
  if(!/[a-z0-9]/.test(n)) return { cuenta: 'SIN CUENTA', ok: false };   // sin cuenta elegida el pago guarda '—'
  var m = QB_CUENTAS_DEPOSITO.find(function(x){ return n.indexOf(norm(x.match)) > -1; });
  if(m) return { cuenta: m.cuenta, ok: true };
  return { cuenta: _qbTxt(metodo).toUpperCase(), ok: false };
}

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
function _qbFinMes(periodo){ var m = /^(\d{4})-(\d{2})$/.exec(String(periodo || '')); return m ? new Date(Date.UTC(+m[1], +m[2], 0)).toISOString().slice(0, 10) : ''; }
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

// ══════════════ COBROS A CLIENTES: FACTURAS A CRÉDITO (03) Y RECIBOS DE CONTADO (04) ══════════════
// Las cuotas confirmadas del mes, con el mismo filtro de Dashboard Finanzas y la Nueva metodología. La inicial no
// va: no la financia Pagasi y no lleva Protect. El N° y la fecha son los del pago: no cambian aunque después se
// emita su factura fiscal, y cada cobro está en uno solo de los dos archivos. El N° de la factura fiscal, si se
// emitió, va en la nota; y si esa factura cobró IGTF, el IGTF va en su propia línea.
// Reimportar un mes: QuickBooks reconoce el mismo N° dentro del mismo archivo, pero un cobro registrado o editado
// después de cerrar el mes ya no está en lo que el contador importó: los controles los cuentan para que los revise.
// Por cada pago: las cuotas que tocó (según el motor contable) y el primer vencimiento, para el Service Date; y la
// cuota del crédito, para saber si el cobro es de contado.
function _qbVencimientos(c, pagos){
  var L = (typeof CreditoLedger !== 'undefined') ? CreditoLedger : null, m = {};
  if(!L) return { pagos: m, cuota: 0 };
  var est = L.generarEstadoCredito(c, pagos, {});
  est.cuotas.forEach(function(cu){
    (cu.aplicaciones || []).forEach(function(a){
      var x = m[a.pagoId] || (m[a.pagoId] = { cuotas: [], fechaVence: '' });
      if(x.cuotas.indexOf(cu.numero) === -1) x.cuotas.push(cu.numero);
      if(cu.fechaVence && (!x.fechaVence || cu.fechaVence < x.fechaVence)) x.fechaVence = cu.fechaVence;
    });
  });
  return { pagos: m, cuota: _qbR2(est.cuotaBase) };
}
// Contado o crédito (el contador, 29-oct-2026): contado es "un solo pago por el total de la cuota". Se mira el MONTO del
// cobro contra la cuota del crédito: es de contado si paga una o varias cuotas completas (k × cuota, con hasta
// QB_TOLERANCIA_CONTADO de diferencia: quien paga 72 por una cuota de 71,51, o 58 por una de 58,33, pagó la cuota), y
// también la liquidación anticipada (un solo cobro que salda el crédito). Lo demás es crédito: el abono a una cuota y el
// cobro que paga más de una cuota sin ser cuotas completas. Se decide con el monto y no con el reparto del motor contable
// porque ese reparto cambia si después se registra un pago con fecha anterior, y un cobro ya importado en QuickBooks no
// puede cambiar de archivo; además, con el reparto, un solo pago redondeado volvía "abono" a todos los pagos siguientes.
var QB_TOLERANCIA_CONTADO = 1;   // dólares de diferencia con k × cuota que todavía cuentan como cuota completa
function _qbEsLiquidacion(p){ return !!(p && (p.tipo === 'liquidacion' || p.referencia === 'LIQ-ANT')); }
function _qbTipoCobro(p, cobrado, cuota, tocadas){
  if(!(tocadas > 0)) return { contado: false, mixto: false, liquidacion: false, sinAplicar: true, cuotasPagadas: 0, redondeo: 0 };   // el motor no lo aplicó a ninguna cuota (crédito ya saldado)
  if(_qbEsLiquidacion(p)) return { contado: true, mixto: false, liquidacion: true, sinAplicar: false, cuotasPagadas: tocadas, redondeo: 0 };
  if(!(cuota > 0)) return { contado: false, mixto: false, liquidacion: false, sinAplicar: false, cuotasPagadas: 0, redondeo: 0 };
  var k = Math.round(cobrado / cuota), dif = _qbR2(cobrado - k * cuota), entero = k >= 1 && Math.abs(dif) <= QB_TOLERANCIA_CONTADO + 0.0001;
  return { contado: entero, mixto: !entero && cobrado > cuota + QB_TOLERANCIA_CONTADO, liquidacion: false, sinAplicar: false, cuotasPagadas: entero ? k : 0, redondeo: entero ? dif : 0 };
}

function qbFacturas(ctx){
  var credPorId = {}, facPorPago = {}, venc = {};
  (ctx.creds || []).forEach(function(c){ if(c) credPorId[String(c.id)] = c; });
  (ctx.facturas || []).forEach(function(f){ if(f && f.pagoId && !f.anulada) facPorPago[String(f.pagoId)] = f; });
  var delMes = (ctx.pagos || []).filter(function(p){ return p && !p.eliminado && p.estado === 'confirmado' && _lbEnPeriodo(p.fecha, ctx.periodo); });
  var iniciales = delMes.filter(_qbEsInicial);
  var cuotas = delMes.filter(function(p){ return !_qbEsInicial(p); })
    .sort(function(a, b){ return String(a.fecha).localeCompare(String(b.fecha)) || String(a.id).localeCompare(String(b.id)); });
  var docs = [], contado = [], sinCredito = [], credsFacturados = [];
  cuotas.forEach(function(p){
    var c = credPorId[String(p.cred || p.creditoId)];
    if(!c){ sinCredito.push(p); return; }
    if(credsFacturados.indexOf(c) === -1) credsFacturados.push(c);
    if(!venc[c.id]) venc[c.id] = _qbVencimientos(c, _qbPagosDe(ctx, c.id));
    var fac = facPorPago[String(p.id)], cobrado = _qbR2(p.monto), igtf = fac ? _qbR2(fac.igtf) : 0;
    if(!(igtf > 0 && igtf < cobrado)) igtf = 0;
    var partes = qbPartirPago(c, _qbR2(cobrado - igtf));
    if(igtf) partes.igtf = igtf;
    var lineas = qbLineas(partes), v = venc[c.id].pagos[p.id] || {}, fecha = _qbISO(p.fecha);
    var tipo = _qbTipoCobro(p, cobrado, venc[c.id].cuota, (v.cuotas || []).length);
    var d = { numero: String(p.id), pagoId: p.id, factura: fac ? String(fac.numero) : '', cred: c.id, fecha: fecha, vence: _qbMasDias(fecha, QB_DIAS_TERMINOS),
      servicio: v.fechaVence || fecha, cuotas: v.cuotas || [], nota: 'CONTRATO Nº ' + c.id + (fac ? ' · FACTURA FISCAL Nº ' + fac.numero : ''),
      cobrado: cobrado, igtf: igtf, como: partes.como, lineas: lineas,
      monto: _qbR2(lineas.reduce(function(a, l){ return a + l.monto; }, 0)), iva: _qbR2(lineas.reduce(function(a, l){ return a + l.iva; }, 0)),
      contado: tipo.contado, mixto: tipo.mixto, liquidacion: tipo.liquidacion, sinAplicar: tipo.sinAplicar, cuotasPagadas: tipo.cuotasPagadas, redondeo: tipo.redondeo,
      deposito: _qbCuentaDeposito(p.metodo || p.cuenta),
      registrado: _qbISO(p.creadoEn), editado: _qbISO(p.editadoEn) };   // cuándo se anotó o se editó (la fecha de arriba es la del cliente)
    (tipo.contado ? contado : docs).push(d);
  });
  return { docs: docs, contado: contado, iniciales: iniciales, sinCredito: sinCredito, credsFacturados: credsFacturados };
}

function _qbFilasFactura(d){
  return d.lineas.map(function(l, i){
    var cab = i === 0;
    return [d.numero, cab ? d.cliente : '', cab ? _qbDMY(d.fecha) : '', cab ? _qbDMY(d.vence) : '', cab ? QB_TERMINOS : '', l.servicio, l.desc, 1, l.monto, l.monto, l.codigo, l.iva,
      cab ? QB_MONEDA : '', cab ? _qbDMY(d.servicio) : '', cab ? d.nota : ''];
  });
}
// El recibo de venta (04): como la factura, pero sin términos ni vencimiento y con la cuenta de depósito en cada línea
// (así viene en la plantilla del contador). N° = el del pago; fecha = la del cobro; Memo = contrato y factura fiscal.
function _qbFilasContado(d){
  return d.lineas.map(function(l, i){
    var cab = i === 0;
    return [d.numero, cab ? d.cliente : '', cab ? _qbDMY(d.fecha) : '', d.deposito.cuenta, '', cab ? d.nota : '', l.servicio, l.desc, 1, l.monto, l.monto, l.codigo, l.iva,
      cab ? QB_MONEDA : '', cab ? _qbDMY(d.servicio) : ''];
  });
}

// ══════════════ PROVEEDORES Y SUS FACTURAS (los documentos del Libro de Compras) ══════════════
// Mismos documentos que el Libro de Compras (lbComprasDocumentos): sin nómina, comisiones, lo que "no lleva
// factura" ni las compras de motos (la sede no le factura cada moto a PAGASI). El proveedor es el de los datos
// fiscales del gasto; si no hay, el gasto no se inventa un proveedor: queda en la lista para completarlo en el
// Libro de Compras.
// Un proveedor es un RIF con un nombre (dos sedes con el mismo RIF y distinto nombre son dos proveedores). Un RIF
// de relleno ("N/A", "0") no es RIF: no junta a nadie. Un gasto sin RIF va con el proveedor del mismo nombre que sí
// lo tiene, si existe.
function _qbRifValido(rif){ var r = String(rif || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return /^[VEJGPC]\d{5,10}$/.test(r) ? r : ''; }
function _qbProvDeDoc(g){ var f = g.fiscal || {}; return { nombre: _qbTxt(f.proveedor), rif: _qbTxt(f.rif).toUpperCase(), importacion: f.origen === 'IMPORTACION' }; }

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
  var sinRif = [], sinProv = [];
  (docs || []).forEach(function(g){
    var p = _qbProvDeDoc(g);
    if(!p.nombre){ sinProv.push(g); return; }
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
  // Los gastos sin proveedor no se quedan por fuera (el contador, 28-oct-2026: "se deberían reflejar los egresos
  // registrados"): van a un proveedor de relleno, SIN PROVEEDOR, hasta que se complete la factura en el Libro de Compras
  if(sinProv.length){
    var k0 = 'N:SIN PROVEEDOR', x0 = { clave: k0, nombre: 'SIN PROVEEDOR', nombreClave: 'SIN PROVEEDOR', nombreQB: 'SIN PROVEEDOR', rif: '', conc: null, desde: '', importacion: false, docs: 0, primera: '', relleno: true };
    sinProv.forEach(function(g){ x0.docs++; var f = _qbISO(g.fecha); if(f && (!x0.desde || f < x0.desde)) x0.desde = f; porDoc[g.clave] = k0; });
    porClave[k0] = x0; filas.push(x0);
  }
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
    if(!prov) return;
    var numero = _qbTxt(fi.numero) || ('EG-' + f.egresoIds[0]), avisos = [];
    if(prov.relleno){ sinProveedor.push(f); avisos.push('sin proveedor: va como SIN PROVEEDOR'); }
    if(!_qbTxt(fi.numero)) avisos.push('sin N° de factura del proveedor');
    var u = prov.clave + '|' + numero.toUpperCase();
    if(usados[u]){ numero = numero + '-' + (++usados[u]); avisos.push('N° de factura repetido'); } else usados[u] = 1;
    var cg = _qbCuentaGasto(g.categoria), cuenta = cg.cuenta, lineas = [];
    if(!cg.ok) avisos.push('categoría "' + cuenta + '" sin cuenta de QuickBooks: recategorízalo o que el contador diga la cuenta');
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
  F.docs.concat(F.contado).forEach(function(d){ var x = C.porCred[String(d.cred)]; d.cliente = x ? x.nombreQB : ''; });
  var docsCompra = lbComprasDocumentos(ctx.egresos || []);
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
  var extras = servicios.filter(function(s){ return s.nuevo; });

  var filas = {
    clientes: C.filas.map(function(x){ return _qbFilaCliente(x, ctx.corte); }),
    servicios: (typeof QB_PLAN_SERVICIOS !== 'undefined' ? QB_PLAN_SERVICIOS.map(function(r){ return r.slice(); }) : servicios.filter(function(s){ return !s.nuevo; }).map(function(s){ return s.fila.slice(); })).concat(extras.map(function(s){ return s.fila.slice(); })),
    facturas: [].concat.apply([], F.docs.map(_qbFilasFactura)),
    contado: [].concat.apply([], F.contado.map(_qbFilasContado)),
    proveedores: P.filas.map(_qbFilaProveedor),
    compras: [].concat.apply([], B.bills.map(_qbFilasCompra))
  };

  var suma = function(arr, k){ return _qbR2((arr || []).reduce(function(a, x){ return a + (parseFloat(x[k]) || 0); }, 0)); };
  var cobrado = suma(F.docs, 'cobrado'), facturado = _qbR2(suma(F.docs, 'monto') + suma(F.docs, 'iva'));
  var cobradoCont = suma(F.contado, 'cobrado'), facturadoCont = _qbR2(suma(F.contado, 'monto') + suma(F.contado, 'iva'));
  var ivaExactoDe = function(docs){ return docs.every(function(d){ return d.lineas.every(function(l){ var s = _qbServicio(l.k); return !s.tasa || _qbR2(l.monto * s.tasa) === l.iva; }); }); };
  var ivaExacto = ivaExactoDe(F.docs), ivaExactoCont = ivaExactoDe(F.contado);
  var sinDeposito = F.contado.filter(function(d){ return !d.deposito.ok; });
  // Cobros del mes anotados o editados cuando el mes ya había terminado: si el contador ya importó ese mes, no los tiene
  var finMes = _qbFinMes(ctx.periodo), tardios = function(docs){ return docs.filter(function(d){ return (d.registrado && d.registrado > finMes) || (d.editado && d.editado > finMes); }); };
  var tardiosCred = tardios(F.docs), tardiosCont = tardios(F.contado);
  var ivaLibro = _qbR2((ctx.facturas || []).filter(function(f){ return f && !f.anulada && _lbEnPeriodo(f.fechaEmision, ctx.periodo); }).reduce(function(a, f){ return a + (parseFloat(f.iva) || 0); }, 0));
  var ok = function(c){ return c ? 'CUADRA' : 'REVISAR'; }, cuantos = function(n, mal){ return n ? (mal ? 'REVISAR: ' : '') + n : 'OK'; };
  // Las compras de motos del mes no van (la sede no las factura): se cuentan para que se vea de dónde sale la diferencia con Egresos
  var motosMes = (ctx.egresos || []).filter(function(e){ return e && !e.eliminado && !e.anuladoPorMoto && e.origenAuto === 'compra_moto' && _lbEnPeriodo(e.fecha, ctx.periodo); });
  var ctl = {
    clientes: [
      { concepto: 'Clientes con crédito', estado: String(C.filas.length) },
      { concepto: 'Con saldo por cobrar al ' + _qbDMY(ctx.corte), estado: String(C.filas.filter(function(x){ return x.saldo > 0; }).length) },
      { concepto: 'Saldo por cobrar total (cuotas que faltan según el motor contable)', estado: fmt(suma(C.filas, 'saldo')) },
      { concepto: 'Los créditos cancelados, cerrados, sin aprobar o creados después del corte no suman saldo', estado: 'OK' },
      { concepto: 'Créditos sin cuota o sin número de cuotas (su saldo es total − cobrado, como en Pagos)', estado: cuantos(C.sinCuota.length, true) },
      { concepto: 'Créditos sin cliente y con el nombre de dos personas distintas (ponles el cliente)', estado: cuantos(C.ambiguos.length, true) }
    ],
    servicios: [{ concepto: 'El catálogo del contador tal cual (02. Servicios.xlsx del 28-oct-2026): ' + (typeof QB_PLAN_SERVICIOS !== 'undefined' ? QB_PLAN_SERVICIOS.length : 0) + ' servicios y categorías de gasto con su cuenta', estado: 'OK' }]
      .concat(extras.map(function(s){ return { concepto: s.fila[0] + ': ' + s.cambio, estado: 'AVISO' }; })),
    facturas: [
      { concepto: 'Abonos del mes: cobros que no pagan cuotas completas (una factura por cada abono)', estado: F.docs.length + ' · ' + fmt(cobrado) },
      { concepto: 'Cobros de contado del mes (van en el 04, no aquí)', estado: F.contado.length + ' · ' + fmt(cobradoCont) },
      { concepto: 'Crédito (03) + Contado (04) = todos los cobros de cuotas del mes', estado: (F.docs.length + F.contado.length) + ' · ' + fmt(_qbR2(cobrado + cobradoCont)) },
      { concepto: 'Lo facturado (montos + IVA) es igual a lo cobrado', estado: ok(Math.abs(cobrado - facturado) < 0.005) },
      { concepto: 'El IVA de cada línea es el 16 % de su monto (si QuickBooks lo recalcula, da lo mismo)', estado: ok(ivaExacto) },
      { concepto: 'IVA del mes: 16 % del Pagasi Protect, por dentro de la cuota', estado: fmt(suma(F.docs, 'iva')) },
      { concepto: 'Con factura fiscal emitida (su N° va en la nota; el N° de la factura es el del pago)', estado: F.docs.filter(function(d){ return d.factura; }).length + ' de ' + F.docs.length },
      { concepto: 'IVA del mes en el Libro de Ventas (las facturas fiscales lo sacan del pago entero; incluye el contado)', estado: fmt(ivaLibro) },
      { concepto: 'IGTF de las facturas fiscales (va en su propia línea: no es ingreso)', estado: fmt(suma(F.docs, 'igtf')) },
      { concepto: 'Cobros que pagan más de una cuota sin ser cuotas completas (van aquí, a crédito)', estado: String(F.docs.filter(function(d){ return d.mixto; }).length) },
      { concepto: 'Cobros que el motor contable no aplica a ninguna cuota (el crédito ya estaba saldado): van aquí', estado: cuantos(F.docs.filter(function(d){ return d.sinAplicar; }).length, true) },
      { concepto: 'Cobros de este mes registrados o editados después de que terminó el mes (si ya lo importaste, revísalos en QuickBooks)', estado: cuantos(tardiosCred.length, true) },
      { concepto: 'Iniciales del mes (no van: no las financia Pagasi ni llevan Protect)', estado: F.iniciales.length + ' · ' + fmt(suma(F.iniciales, 'monto')) },
      { concepto: 'Cobros sin su crédito en el sistema (no se pueden facturar)', estado: cuantos(F.sinCredito.length, true) },
      { concepto: 'Repartidas sin la Nueva metodología (sin cuota, cuota bajo el 12 % o precio menor que la inicial)', estado: String(F.docs.filter(function(d){ return d.como === 'sin-protect'; }).length) }
    ],
    contado: [
      { concepto: 'Cobros de contado del mes: cuotas completas pagadas de una sola vez (un recibo de venta por cobro)', estado: F.contado.length + ' · ' + fmt(cobradoCont) },
      { concepto: 'Abonos del mes (van en el 03, a crédito)', estado: F.docs.length + ' · ' + fmt(cobrado) },
      { concepto: 'Lo facturado (montos + IVA) es igual a lo cobrado', estado: ok(Math.abs(cobradoCont - facturadoCont) < 0.005) },
      { concepto: 'El IVA de cada línea es el 16 % de su monto (si QuickBooks lo recalcula, da lo mismo)', estado: ok(ivaExactoCont) },
      { concepto: 'IVA del mes: 16 % del Pagasi Protect, por dentro de la cuota', estado: fmt(suma(F.contado, 'iva')) },
      { concepto: 'Cuenta de depósito de QuickBooks según "Recibido en" (100% Banco, Binance, Efectivo)', estado: cuantos(sinDeposito.length, true) + (sinDeposito.length ? ' sin cuenta' : '') },
      { concepto: 'Cobros que pagan varias cuotas completas de una vez (un solo recibo con todo)', estado: String(F.contado.filter(function(d){ return d.cuotasPagadas > 1; }).length) },
      { concepto: 'Cobros con hasta ' + fmt(QB_TOLERANCIA_CONTADO) + ' de diferencia con la cuota (el cliente redondeó): cuentan como cuota completa', estado: String(F.contado.filter(function(d){ return Math.abs(d.redondeo) > 0.004; }).length) },
      { concepto: 'Liquidaciones anticipadas (un solo cobro que salda el crédito: van de contado)', estado: String(F.contado.filter(function(d){ return d.liquidacion; }).length) },
      { concepto: 'Cobros de este mes registrados o editados después de que terminó el mes (si ya lo importaste, revísalos en QuickBooks)', estado: cuantos(tardiosCont.length, true) },
      { concepto: 'Con factura fiscal emitida (su N° va en el Memo; el N° del recibo es el del pago)', estado: F.contado.filter(function(d){ return d.factura; }).length + ' de ' + F.contado.length },
      { concepto: 'IGTF de las facturas fiscales (va en su propia línea: no es ingreso)', estado: fmt(suma(F.contado, 'igtf')) }
    ],
    proveedores: [
      { concepto: 'Proveedores de los gastos (todos los meses)', estado: String(P.filas.length) },
      { concepto: 'Sedes (con teléfono, dirección y ciudad de su ficha)', estado: String(P.filas.filter(function(x){ return x.conc; }).length) },
      { concepto: 'RIF que no es RIF ("N/A", "0"…): van sin RIF; corrígelos en el Libro de Compras', estado: cuantos(P.rifMalos.length, true) },
      { concepto: 'Proveedores que también son clientes (en QuickBooks llevan su RIF en el nombre)', estado: String(tambienClientes.length) }
    ],
    compras: [
      { concepto: 'Facturas de proveedor del mes', estado: B.bills.length + ' · ' + fmt(_qbR2(suma(B.bills, 'monto') + suma(B.bills, 'iva'))) },
      { concepto: 'Gastos del mes sin proveedor (van como SIN PROVEEDOR: complétalos en el Libro de Compras)', estado: cuantos(B.sinProveedor.length, true) },
      { concepto: 'Gastos con una categoría sin cuenta de QuickBooks (recategorízalos)', estado: cuantos(B.bills.filter(function(b){ return b.avisos.some(function(a){ return /sin cuenta de QuickBooks/.test(a); }); }).length, true) },
      { concepto: 'Sin N° de factura del proveedor (van con EG- y el N° del gasto)', estado: String(B.bills.filter(function(b){ return b.avisos.indexOf('sin N° de factura del proveedor') > -1; }).length) },
      { concepto: 'Notas de crédito (no van aquí: en QuickBooks son créditos de proveedor)', estado: String(B.notasCredito.length) },
      { concepto: 'Compras de motos del mes (no van: la sede no le factura cada moto a PAGASI)', estado: motosMes.length + ' · ' + fmt(suma(motosMes, 'monto')) },
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
// facturas (03, 04 y 06) la búsqueda elige facturas enteras: si algo de una factura coincide, van todas sus líneas.
function _qbVer(D, tipo){
  var filas = D.filas[tipo], q = String(D.st.q || '').trim();
  if(!q) return { filas: filas, filtrado: false };
  var norm = function(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }, Q = norm(q);
  if(!_qbPorMes(tipo)) return { filas: filas.filter(function(r){ return norm(r.join(' ')).indexOf(Q) > -1; }), filtrado: true };
  var docs = [], clave = function(r){ return tipo === 'compras' ? r[0] + '|' + r[1] : r[0]; };
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
    var estilo = (tipo === 'servicios' && marcado[r[0]]) ? 'background:rgba(245,158,11,.08)' : (((tipo === 'facturas' || tipo === 'contado') && r[1]) || tipo === 'compras' ? 'border-top:2px solid var(--rim)' : '');
    return '<tr style="' + estilo + '">' + r.map(celda).join('') + '</tr>';
  }).join('');
  var vacio = !V.filas.length ? '<tr><td colspan="' + A.enc.length + '" style="padding:22px;text-align:center;color:var(--ink3);font-size:12px">'
    + (V.filtrado ? 'Nada coincide con la búsqueda.' : { clientes: 'No hay clientes con crédito.', servicios: '', facturas: 'No hay abonos (cobros a crédito) en ' + _lbPeriodoVE(D.st.periodo) + '.', contado: 'No hay cobros de contado (cuotas completas pagadas de una vez) en ' + _lbPeriodoVE(D.st.periodo) + '.', proveedores: 'Ningún gasto tiene proveedor todavía. Se completan en el Libro de Compras.', compras: 'No hay facturas de proveedor en ' + _lbPeriodoVE(D.st.periodo) + '.' }[tipo]) + '</td></tr>' : '';
  var tot = '';
  var sumCol = function(i){ return _qbR2(V.filas.reduce(function(a, r){ return a + (typeof r[i] === 'number' ? r[i] : 0); }, 0)); };
  var cols = { facturas: [9, 11], contado: [10, 12], compras: [9, 11], clientes: [11] }[tipo];
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

// Los cobros del período anotados o editados cuando el mes ya había cerrado (los mismos que cuenta el control)
function _qbTardios(D, docs){
  var fin = _qbFinMes(D.st.periodo);
  return docs.filter(function(d){ return (d.registrado && d.registrado > fin) || (d.editado && d.editado > fin); })
    .map(function(d){ return _qbDMY(d.fecha) + ' · ' + d.numero + ' · ' + d.cred + ' · ' + fmt(d.cobrado) + (d.registrado > fin ? ' · registrado el ' + _qbDMY(d.registrado) : ' · editado el ' + _qbDMY(d.editado)); });
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
    listas += _qbListaHtml('Cobros que pagan más de una cuota sin ser cuotas completas', D.facturas.docs.filter(function(d){ return d.mixto; }).map(function(d){ return _qbDMY(d.fecha) + ' · ' + d.numero + ' · ' + d.cred + ' · cuotas ' + d.cuotas.join(', ') + ' · ' + fmt(d.cobrado); }));
    listas += _qbListaHtml('Cobros registrados o editados después de que terminó el mes', _qbTardios(D, D.facturas.docs));
  }
  if(tipo === 'contado'){
    listas += _qbListaHtml('Cobros sin cuenta de QuickBooks para el depósito (su "Recibido en" no es 100% Banco, Binance ni Efectivo)', D.facturas.contado.filter(function(d){ return !d.deposito.ok; }).map(function(d){ return _qbDMY(d.fecha) + ' · ' + d.numero + ' · ' + d.cred + ' · recibido en "' + d.deposito.cuenta + '" · ' + fmt(d.cobrado); }));
    listas += _qbListaHtml('Cobros registrados o editados después de que terminó el mes', _qbTardios(D, D.facturas.contado));
  }
  if(tipo === 'proveedores') listas += _qbListaHtml('RIF que no es RIF', D.proveedores.rifMalos);
  if(tipo === 'compras'){
    listas += _qbListaHtml('Gastos sin proveedor (van como SIN PROVEEDOR)', D.compras.sinProveedor.map(function(f){ return _qbDMY(f.fechaDoc) + ' · ' + (f.concepto || '') + ' · ' + fmt(f.total); }));
    listas += _qbListaHtml('Notas de crédito', D.compras.notasCredito.map(function(f){ return _qbDMY(f.fechaDoc) + ' · ' + f.nombre + ' · ' + (f.ndnc || '') + ' · ' + fmt(f.total); }));
    listas += _qbListaHtml('Facturas con algo por revisar', D.compras.bills.filter(function(b){ return b.avisos.length; }).map(function(b){ return b.numero + ' · ' + b.proveedor + ': ' + b.avisos.join('; '); }));
  }
  var nota = {
    clientes: 'Balance de Apertura = lo que cada cliente debe al ' + _qbDMY(D.st.corte) + ' (fecha de corte): las cuotas que le faltan con los pagos hechos hasta ese día, con el mismo motor contable de Pagos. Un cliente sin saldo va con el balance y la fecha en blanco. Las cuotas que se cobren después del corte ya están dentro de ese saldo: si también se importan los cobros de después del corte (03 y 04), en QuickBooks hay que aplicarlos contra ese saldo (las facturas del 03 como pago del saldo; los recibos del 04 no lo rebajan por sí solos).',
    servicios: 'El catálogo del contador tal cual (su 02. Servicios.xlsx): servicios de ingreso y categorías de gasto con su cuenta. Lo marcado en amarillo no estaba en su catálogo. Las facturas (03) y los recibos (04) usan exactamente estos nombres.',
    facturas: 'A crédito van los abonos: los cobros que no pagan cuotas completas (convenios, mora: varios pagos a una cuota). Una factura por cada abono, partida como en la Nueva metodología: Cartera de financiamiento (lo que recupera del precio de la moto), Intereses (12 % anual, sin IVA) y Pagasi Protect, con el IVA del 16 % por dentro. Lo facturado (montos + IVA) es igual a lo cobrado. N° y Fecha Factura = los del cobro · Service Date = el vencimiento de la cuota que pagó. El pago de estas facturas se registra aparte en QuickBooks. Si un mes ya se importó y después se registró o editó un cobro de ese mes, el control de abajo lo cuenta: revísalo allá antes de volver a importar.',
    contado: 'De contado van los cobros que pagan una o varias cuotas completas de una sola vez (la mayoría; con hasta ' + fmt(QB_TOLERANCIA_CONTADO) + ' de diferencia por redondeo) y las liquidaciones anticipadas. Un recibo de venta por cobro, con las mismas líneas de la factura y la cuenta de QuickBooks donde entró el dinero según el "Recibido en" del pago (100% Banco, Binance o Efectivo): el cobro y su depósito quedan en un solo movimiento. N° y fecha = los del cobro · Memo = contrato y factura fiscal · Service Date = el vencimiento de la cuota que pagó. Si un mes ya se importó y después se registró o editó un cobro de ese mes, el control de abajo lo cuenta.',
    proveedores: 'Los proveedores salen de los datos fiscales de cada gasto (Libro de Compras). Las compras de motos no van: la sede no le factura cada moto a PAGASI. Si un gasto trae el RIF o el nombre de una sede, la ficha toma su teléfono, dirección y ciudad. Fe. Creación = la de la sede o la del primer gasto.',
    compras: 'Los gastos del mes con factura de proveedor (por su fecha), como en el Libro de Compras de ' + _lbPeriodoVE(D.st.periodo) + ': la parte exenta va en una línea "' + QB_SIN_IVA + '" y la base en otra con su IVA. La cuenta (*Account) es la de la categoría del gasto en el plan del contador. Las compras de motos, la nómina y las comisiones no van.'
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
    var A = QB_ARCHIVOS[t], n = t === 'facturas' ? D.facturas.docs.length : (t === 'contado' ? D.facturas.contado.length : (t === 'compras' ? D.compras.bills.length : D.filas[t].length)), act = st.vista === t;
    return '<button class="btn ' + (act ? 'btn-p' : 'btn-g') + ' btn-sm" style="padding:6px 11px" onclick="qbVista(\'' + t + '\')">' + A.n + ' · ' + _lbEsc(A.titulo) + ' <span style="opacity:.75">(' + n + ')</span></button>';
  }).join('');
  return '<div class="card" style="margin-bottom:14px">'
    + '<div class="ch" style="flex-wrap:wrap;gap:10px"><div><div class="ct">Exportar a QuickBooks</div><div class="cs">Las plantillas de importación del contador, llenas con los datos del sistema · cifras en dólares (USD)</div></div>'
    +   '<div style="display:flex;gap:6px;margin-left:auto"><button class="btn btn-p btn-sm" onclick="qbDescargarTodo()">⬇ Descargar los 6</button></div></div>'
    + '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 14px;font-size:12px;margin:2px 0 12px;padding:10px 12px;background:var(--gs);border-radius:9px">'
    +   '<span style="color:var(--ink3)">Empresa</span><b>' + _lbEsc(emp.nombre || '') + '</b>'
    +   '<span style="color:var(--ink3)">RIF</span><b>' + _lbEsc(emp.rif || '—') + '</b></div>'
    + '<div class="fgr" style="gap:10px;align-items:end;flex-wrap:wrap">'
    +   '<div class="fg" style="min-width:150px"><label>Período de las facturas (03, 04 y 06)</label><input class="fi" id="qb-periodo" type="month" value="' + st.periodo + '" onchange="qbPeriodo(this.value)"></div>'
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
    + (tipo === 'clientes' ? 'Balance de apertura al <b>' + _qbDMY(D.st.corte) + '</b>' : (_qbPorMes(tipo) ? 'Período: <b>' + _lbPeriodoVE(D.st.periodo) + '</b>' : 'Catálogo'))
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
  _abrirVentanaImpresion('QuickBooks · ' + A.n + '. ' + A.titulo + (_qbPorMes(tipo) ? ' ' + _lbPeriodoVE(D.st.periodo) : ''), qbHtmlPdf(D, tipo, V), { horizontal: true });
}
// Los 6 en el formato de cada plantilla (el navegador puede pedir permiso para bajar varios archivos)
function qbDescargarTodo(){
  var D = _qbCalcular();
  D.st = Object.assign({}, D.st, { q: '' });   // los 6 completos, aunque haya una búsqueda puesta
  QB_ORDEN.forEach(function(t, i){ setTimeout(function(){ qbExportar(t, QB_ARCHIVOS[t].fmt === 'csv' ? 'csv' : 'excel', D); }, i * 700); });
  if(typeof toast === 'function') toast('Bajando los 6 archivos…', 'success');
}

if(typeof module !== 'undefined' && module.exports) module.exports = { qbPartirPago: qbPartirPago, qbLineas: qbLineas, qbSaldoCredito: qbSaldoCredito, qbClientes: qbClientes, qbFacturas: qbFacturas,
  qbProveedores: qbProveedores, qbCompras: qbCompras, qbDatos: qbDatos, qbCsvTexto: qbCsvTexto, qbWin1252: qbWin1252, qbHoja: qbHoja, QB_ARCHIVOS: QB_ARCHIVOS, QB_SERVICIOS: QB_SERVICIOS };
