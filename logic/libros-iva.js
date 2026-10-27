// Libros de Compras y de Ventas del IVA en Finanzas (Adam, 21-oct-2026: "quiero que estudies estos dos excel…
// dos pestañas más en finanzas… que muestren exactamente lo mismo pero con la información del sistema… que se
// pueda filtrar y buscar… exportar en pdf y en excel"). Las mismas columnas, resumen, controles y notas de los
// Excel LIBRO_DE_COMPRAS.xlsx y LIBRO_DE_VENTAS.xlsx, en dólares (Adam eligió dólares).
//  · Ventas: una línea por factura emitida (colección facturas). Reemplaza la pestaña "Libro SENIAT".
//  · Compras: los gastos (egresos). La compra de una moto, aunque se haya pagado de varias cuentas, es UNA factura
//    de la sede. Los datos de la factura del proveedor van en egreso.fiscal; si faltan, se completan desde el libro.
//  · Contribuyente especial y % de retención: config/libros (antes vivía solo en el navegador).

var LB_NOTAS_COMPRAS = [
  'Art. 75 RLIVA: registro cronológico de facturas, notas de débito/crédito y declaraciones de importación, con fecha, número, nombre o razón social y RIF del proveedor (cuando corresponda), discriminando compras gravadas, exentas y exoneradas, importaciones separadas de compras internas y el crédito fiscal por alícuota.',
  'Importaciones: se registra la Declaración Única de Aduanas (N° y fecha), no la factura del proveedor extranjero; RIF en blanco; Origen = IMPORTACION. El IVA de aduana no se retiene.',
  'Tipo de Transacción (formato SENIAT): 01-REG = factura; 02-COMP = nota de débito; 03-ANUL = nota de crédito; 04-AJUSTE = ajuste.',
  'Retención (Prov. SNAT/2015/0049): 75% del impuesto (Art. 4) o 100% en los casos del Art. 5. Comprobante numerado AAAAMMSSSSSSSS y registrado en este libro en el mismo período (Art. 16).',
  'Sujetos Pasivos Especiales declaran por quincena: use "Resumen de: 1 / 2". La quincena se toma de la fecha del documento.',
  'Art. 71 RLIVA: el libro debe permanecer en el establecimiento del contribuyente. Art. 56 LIVA: las operaciones se registran en el mes calendario en que ocurren.',
  'Alícuotas: General 16%, Reducida 8%, Adicional 15% sobre bienes y servicios suntuarios (16% + 15% = 31%). Verificar cambios posteriores en Gaceta Oficial.'
];
var LB_NOTAS_VENTAS = [
  'Art. 76 RLIVA: registro cronológico de las ventas a contribuyentes y no contribuyentes, con fecha y número de la factura o nota, nombre o razón social y RIF del comprador, discriminando ventas gravadas, exentas, exoneradas y exportaciones (con N° de la declaración de exportación y valor FOB).',
  'Art. 77 RLIVA: ventas a no contribuyentes pueden asentarse como resumen diario: una línea por día con la primera factura y la última ("Factura Hasta"), RIF en blanco.',
  'Art. 78 RLIVA: si emite facturas y también documentos de máquina fiscal, registre ambos tipos de operación por separado.',
  'Tipo de Transacción (formato SENIAT): 01-REG = factura; 02-COMP = nota de débito; 03-ANUL = nota de crédito; 04-AJUSTE = ajuste.',
  'Retenciones (Prov. SNAT/2015/0049, Arts. 7 y 16): el comprobante se registra en este libro en el período en que se recibe y se descuenta de la cuota de ese período.',
  'Sujetos Pasivos Especiales declaran por quincena: use "Resumen de: 1 / 2". La quincena se toma de la fecha del documento.',
  'Art. 71 RLIVA: el libro debe permanecer en el establecimiento del contribuyente. Alícuotas: General 16%, Reducida 8%, Adicional 15% (31%). Exportaciones: 0%.'
];
var LB_ALIC = [[0.16, 'Alícuota General 16%'], [0.31, 'Alícuota General + Adicional 31%'], [0.08, 'Alícuota Reducida 8%']];
var LB_TIPOS = [['01-REG', 'Factura'], ['02-COMP', 'Nota de débito'], ['03-ANUL', 'Nota de crédito'], ['04-AJUSTE', 'Ajuste']];

// ── Utilidades ──
function _lbR2(n){ return Math.round((parseFloat(n) || 0) * 100) / 100; }
function _lbNum(v){ return (v === '' || v == null || isNaN(parseFloat(v))) ? '' : parseFloat(v); }
function _lbQuincena(iso){ var d = parseInt(String(iso || '').slice(8, 10), 10); return d ? (d <= 15 ? 1 : 2) : ''; }
function _lbEnPeriodo(iso, periodo){ return String(iso || '').slice(0, 7) === String(periodo || ''); }
function _lbFechaVE(iso){ var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || ''); }
function _lbPeriodoVE(p){ var m = String(p || '').match(/^(\d{4})-(\d{2})$/); return m ? m[2] + '/' + m[1] : (p || ''); }
function _lbEsc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function _lbSuma(filas, col, pred){ return _lbR2((filas || []).reduce(function(a, f){ return a + ((!pred || pred(f)) && typeof f[col] === 'number' ? f[col] : 0); }, 0)); }
function _lbRifCliente(ci){
  var s = String(ci || '').toUpperCase().replace(/\s+/g, '');
  if(!s) return '';
  if(/^[VEJGP]-?\d/.test(s)) return s.charAt(0) + '-' + s.replace(/^[VEJGP]-?/, '');
  return /^\d+$/.test(s.replace(/\./g, '')) ? 'V-' + s.replace(/\./g, '') : s;
}

// ══════════════ COMPRAS ══════════════
// Los documentos de compra: un gasto = un documento, salvo la compra de una moto (sus partes pagadas de varias
// cuentas son una sola factura de la sede). No van la nómina, las comisiones ni lo marcado "no lleva factura".
function lbComprasDocumentos(egresos, ctx){
  ctx = ctx || {};
  var grupos = {}, orden = [];
  (egresos || []).forEach(function(e){
    if(!e || e.eliminado || e.anuladoPorMoto) return;
    if(['nomina', 'comisiones'].indexOf(e.categoria) > -1) return;
    var esMoto = e.origenAuto === 'compra_moto' && e.motoIdRef != null;
    var k = esMoto ? 'moto:' + e.motoIdRef : 'eg:' + e.id;
    if(!grupos[k]){ grupos[k] = { clave: k, egresos: [], monto: 0, fecha: e.fecha || '', concepto: e.concepto || '', categoria: e.categoria || '', motoId: esMoto ? e.motoIdRef : null, fiscal: null }; orden.push(k); }
    var g = grupos[k];
    g.egresos.push(e); g.monto = _lbR2(g.monto + (parseFloat(e.monto) || 0));
    if(e.fecha && (!g.fecha || e.fecha < g.fecha)) g.fecha = e.fecha;
    if(e.fiscal && (!g.fiscal || (!g.fiscal.numero && e.fiscal.numero))) g.fiscal = e.fiscal;
  });
  return orden.map(function(k){
    var g = grupos[k];
    if(g.motoId != null){
      var moto = (ctx.motos || []).find(function(m){ return String(m.id) === String(g.motoId); });
      var cid = (moto && moto.concesionarioId) || (g.egresos.find(function(e){ return e.concesionarioId; }) || {}).concesionarioId;
      var conc = cid && (ctx.concesionarios || []).find(function(c){ return String(c.id) === String(cid); });
      if(conc) g.sugerido = { proveedor: conc.nombre || '', rif: conc.rif || '' };
    }
    return g;
  }).filter(function(g){ return !(g.fiscal && g.fiscal.noAplica); });
}

function lbComprasFilas(docs, periodo, cfg){
  cfg = cfg || {};
  var pctDef = _lbNum(cfg.pctRet) === '' ? 0.75 : +cfg.pctRet;
  var filas = (docs || []).filter(function(g){ return _lbEnPeriodo(g.fecha, periodo); }).map(function(g){
    var f = g.fiscal || {}, sug = g.sugerido || {};
    var tipo = f.tipo || '01-REG', signo = tipo === '03-ANUL' ? -1 : 1;
    var origen = f.origen === 'IMPORTACION' ? 'IMPORTACION' : 'INTERNA';
    var exento = _lbNum(f.exento) === '' ? '' : signo * _lbR2(f.exento);
    var base = _lbNum(f.base) === '' ? '' : signo * _lbR2(f.base);
    var alic = base === '' ? '' : (_lbNum(f.alicuota) === '' ? '' : +f.alicuota);
    var iva = (base !== '' && alic !== '') ? _lbR2(base * alic) : '';
    var tieneMontos = exento !== '' || base !== '';
    var total = tieneMontos ? _lbR2((+exento || 0) + (+base || 0) + (+iva || 0)) : signo * g.monto;
    var ret = '';
    if(cfg.esSPE && typeof iva === 'number' && iva !== 0 && origen !== 'IMPORTACION'){
      ret = _lbNum(f.retenido) !== '' ? signo * _lbR2(Math.abs(f.retenido)) : _lbR2(iva * (_lbNum(f.pctRet) !== '' ? +f.pctRet : pctDef));
    }
    var fechaDoc = f.fecha || g.fecha;
    var faltan = [];
    if(!f.rif && !sug.rif && origen !== 'IMPORTACION') faltan.push('RIF');   // el de la sede cuenta (se guarda al completar)
    if(!f.numero) faltan.push(origen === 'IMPORTACION' ? 'N° de declaración' : (tipo === '01-REG' ? 'N° de factura' : 'N° de la nota'));
    if(!f.control && origen !== 'IMPORTACION') faltan.push('N° de control');
    if(!tieneMontos) faltan.push('base e IVA');
    return {
      clave: g.clave, egresoIds: g.egresos.map(function(e){ return e.id; }), fechaDoc: fechaDoc, fechaReg: g.fecha,
      rif: f.rif || sug.rif || '', nombre: f.proveedor || sug.proveedor || g.concepto || '',
      factura: tipo === '01-REG' ? (f.numero || '') : '', control: f.control || '', ndnc: tipo !== '01-REG' ? (f.numero || '') : '',
      tipo: tipo, afectada: f.afectada || '', total: total, exento: exento, base: base, alic: alic, iva: iva, ret: ret,
      comprobante: f.comprobante || '', origen: origen, quincena: _lbNum(f.quincena) !== '' ? +f.quincena : _lbQuincena(fechaDoc),
      faltan: faltan, concepto: g.concepto, monto: g.monto, categoria: g.categoria,
      // la factura se registró en bolívares: el original y la tasa con la que se pasó a dólares (26-oct-2026)
      monedaOrig: f.moneda === 'BS' ? 'BS' : 'USD', totalBsOrig: f.moneda === 'BS' ? _lbR2((+f.exentoBs || 0) + (+f.baseBs || 0) + (+f.ivaBs || 0)) : '', tasaOrig: f.moneda === 'BS' ? (+f.tasa || '') : '', tasaFechaOrig: f.moneda === 'BS' ? (f.tasaFecha || '') : '', tasaMonedaOrig: f.moneda === 'BS' ? (f.tasaMoneda || 'usd') : ''
    };
  });
  filas.sort(function(a, b){ return String(a.fechaDoc).localeCompare(String(b.fechaDoc)) || String(a.clave).localeCompare(String(b.clave)); });
  filas.forEach(function(f, i){ f.oper = i + 1; });
  return filas;
}

function lbComprasCalculo(filas, periodo, resumenDe){
  var enQ = function(f){ return resumenDe === 'MES' || String(f.quincena) === String(resumenDe); };
  var T = { total: _lbSuma(filas, 'total'), exento: _lbSuma(filas, 'exento'), base: _lbSuma(filas, 'base'), iva: _lbSuma(filas, 'iva'), ret: _lbSuma(filas, 'ret') };
  var res = [{ concepto: 'Compras exentas, exoneradas o no sujetas (sin derecho a crédito)', base: _lbSuma(filas, 'exento', enQ), credito: '', retenido: '' }];
  LB_ALIC.forEach(function(a){ var p = function(f){ return enQ(f) && f.alic === a[0] && f.origen === 'IMPORTACION'; };
    res.push({ concepto: 'Importaciones gravadas – ' + a[1], base: _lbSuma(filas, 'base', p), credito: _lbSuma(filas, 'iva', p), retenido: '' }); });
  LB_ALIC.forEach(function(a){ var p = function(f){ return enQ(f) && f.alic === a[0] && f.origen !== 'IMPORTACION'; };
    res.push({ concepto: 'Compras internas gravadas – ' + a[1], base: _lbSuma(filas, 'base', p), credito: _lbSuma(filas, 'iva', p), retenido: _lbSuma(filas, 'ret', p) }); });
  var tot = { concepto: 'TOTAL', base: _lbSuma(res, 'base'), credito: _lbSuma(res, 'credito'), retenido: _lbSuma(res, 'retenido') };
  var sinAlic = filas.filter(function(f){ return f.base !== '' && f.alic === ''; }).length;
  var malComp = filas.filter(function(f){ return f.comprobante && String(f.comprobante).length !== 14; }).length;
  var fuera = filas.filter(function(f){ return f.fechaDoc && !_lbEnPeriodo(f.fechaDoc, periodo); }).length;
  var faltan = filas.filter(function(f){ return f.faltan.length; }).length;
  var controles = [
    { concepto: 'Total Compras = Exentas + Base + IVA', estado: _lbR2(T.total - (T.exento + T.base + T.iva)) === 0 ? 'CUADRA' : 'REVISAR' },
    { concepto: 'Filas con base imponible pero sin alícuota', estado: sinAlic ? 'REVISAR: ' + sinAlic : 'OK' },
    { concepto: 'Resumen del MES cuadra con el total de crédito fiscal', estado: resumenDe !== 'MES' ? '(elija MES)' : (_lbR2(tot.credito - T.iva) === 0 ? 'CUADRA' : 'REVISAR') },
    { concepto: 'Comprobantes con N° distinto de 14 caracteres', estado: malComp ? 'REVISAR' : 'OK' },
    { concepto: 'Documentos con fecha fuera del mes (verificar)', estado: fuera ? fuera + ' documento(s)' : 'OK' },
    { concepto: 'Gastos sin los datos de la factura del proveedor', estado: faltan ? faltan + ' por completar' : 'OK' }
  ];
  return { totales: T, resumen: res.concat([tot]), controles: controles, faltan: faltan };
}

// ══════════════ VENTAS ══════════════
function lbVentasFilas(facturas, periodo){
  var filas = (facturas || []).filter(function(f){ return f && _lbEnPeriodo(f.fechaEmision, periodo); }).map(function(f){
    var cli = f.cliente || {};
    var fila = { id: f.id, fechaDoc: f.fechaEmision || '', rif: _lbRifCliente(cli.ci), nombre: cli.nombre || '', factura: f.numero || '', control: f.numeroControl || '',
      ndnc: '', tipo: '01-REG', afectada: '', total: 0, exento: '', exportacion: '', base: '', alic: '', iva: '', ret: '', comprobante: '', fechaComp: '',
      hasta: '', declExp: '', igtf: '', anulada: !!f.anulada, quincena: _lbQuincena(f.fechaEmision) };
    if(f.anulada){ fila.nombre = 'ANULADA'; fila.rif = ''; return fila; }
    var iva = _lbR2(f.iva), sub = _lbNum(f.subtotal) !== '' ? _lbR2(f.subtotal) : _lbR2((+f.total || 0) - (+f.igtf || 0) - iva);
    if(iva > 0){
      var r = _lbNum(f.ivaRate); fila.alic = r === '' ? 0.16 : (r > 1 ? _lbR2(r / 100) : r);
      fila.base = sub; fila.iva = iva;
    } else fila.exento = sub;
    fila.total = _lbR2((+fila.exento || 0) + (+fila.base || 0) + (+fila.iva || 0));
    if(_lbR2(f.igtf) > 0) fila.igtf = _lbR2(f.igtf);
    return fila;
  });
  filas.sort(function(a, b){ return String(a.fechaDoc).localeCompare(String(b.fechaDoc)) || String(a.factura).localeCompare(String(b.factura)); });
  filas.forEach(function(f, i){ f.oper = i + 1; });
  return filas;
}

function lbVentasCalculo(filas, periodo, resumenDe){
  var enQ = function(f){ return resumenDe === 'MES' || String(f.quincena) === String(resumenDe); };
  var T = { total: _lbSuma(filas, 'total'), exento: _lbSuma(filas, 'exento'), exportacion: _lbSuma(filas, 'exportacion'), base: _lbSuma(filas, 'base'), iva: _lbSuma(filas, 'iva'), ret: _lbSuma(filas, 'ret'), igtf: _lbSuma(filas, 'igtf') };
  var res = [
    { concepto: 'Ventas internas exentas, exoneradas o no sujetas', base: _lbSuma(filas, 'exento', enQ), debito: '', retenido: '' },
    { concepto: 'Ventas de exportación (valor FOB)', base: _lbSuma(filas, 'exportacion', enQ), debito: '', retenido: '' }
  ];
  LB_ALIC.forEach(function(a){ var p = function(f){ return enQ(f) && f.alic === a[0]; };
    res.push({ concepto: 'Ventas internas gravadas – ' + a[1], base: _lbSuma(filas, 'base', p), debito: _lbSuma(filas, 'iva', p), retenido: '' }); });
  res.push({ concepto: 'Retenciones de IVA recibidas de clientes (comprobantes del período)', base: '', debito: '', retenido: _lbSuma(filas, 'ret', enQ) });
  var tot = { concepto: 'TOTAL', base: _lbSuma(res, 'base'), debito: _lbSuma(res, 'debito'), retenido: _lbSuma(res, 'retenido') };
  var sinAlic = filas.filter(function(f){ return f.base !== '' && f.alic === ''; }).length;
  var expSinDecl = filas.filter(function(f){ return f.exportacion !== '' && !f.declExp; }).length;
  var fuera = filas.filter(function(f){ return f.fechaDoc && !_lbEnPeriodo(f.fechaDoc, periodo); }).length;
  var controles = [
    { concepto: 'Total Ventas = Exentas + Exportación + Base + IVA', estado: _lbR2(T.total - (T.exento + T.exportacion + T.base + T.iva)) === 0 ? 'CUADRA' : 'REVISAR' },
    { concepto: 'Filas con base imponible pero sin alícuota', estado: sinAlic ? 'REVISAR: ' + sinAlic : 'OK' },
    { concepto: 'Resumen del MES cuadra con el total de débito fiscal', estado: resumenDe !== 'MES' ? '(elija MES)' : (_lbR2(tot.debito - T.iva) === 0 ? 'CUADRA' : 'REVISAR') },
    { concepto: 'Exportaciones sin N° de declaración de exportación', estado: expSinDecl ? 'REVISAR' : 'OK' },
    { concepto: 'Documentos con fecha fuera del mes (verificar)', estado: fuera ? fuera + ' documento(s)' : 'OK' }
  ];
  return { totales: T, resumen: res.concat([tot]), controles: controles };
}

// Búsqueda y filtro de la pantalla (lo mismo que se exporta)
function lbFiltrar(filas, q, filtro){
  var t = String(q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return (filas || []).filter(function(f){
    if(filtro === 'faltan' && !(f.faltan && f.faltan.length)) return false;
    if(filtro === 'completos' && f.faltan && f.faltan.length) return false;
    if(!t) return true;
    return [f.nombre, f.rif, f.factura, f.control, f.ndnc, f.comprobante, f.concepto, f.afectada].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(t) > -1;
  });
}

// ══════════════ PANTALLA ══════════════
var _lbCfg = { esSPE: false, pctRet: 0.75, cargado: false };
function _lbCargarCfg(){
  if(_lbCfg.cargado || _lbCfg.cargando || typeof db === 'undefined' || !db) return;
  _lbCfg.cargando = true;
  db.collection('config').doc('libros').get().then(function(d){
    var x = d.exists ? (d.data() || {}) : {};
    _lbCfg = { esSPE: !!x.esSPE, pctRet: _lbNum(x.pctRet) === '' ? 0.75 : +x.pctRet, cargado: true };
    if(S && S.reportesTab === 'librocompras' && typeof nav === 'function') nav('reportes');
  }).catch(function(){ _lbCfg.cargado = true; _lbCfg.cargando = false; });
}
function lbPuedeConfigurar(){ return (typeof isAdminUser === 'function' && isAdminUser()) || (typeof hasModuleAccess === 'function' && hasModuleAccess('config')); }
function lbGuardarCfg(){
  if(!lbPuedeConfigurar()){ toast('Solo administración cambia esto', 'error'); return; }
  var spe = ((document.getElementById('lb_spe') || {}).value) === 'SI', pct = parseFloat((document.getElementById('lb_pct') || {}).value) || 0.75;
  _lbCfg = { esSPE: spe, pctRet: pct, cargado: true };
  if(typeof db !== 'undefined' && db) db.collection('config').doc('libros').set({ esSPE: spe, pctRet: pct, actualizado: new Date().toISOString(), actualizadoPor: (S.currentUser && S.currentUser.nombre) || '' }, { merge: true })
    .then(function(){ toast('Guardado: ' + (spe ? 'contribuyente especial, retiene ' + Math.round(pct * 100) + '%' : 'no es contribuyente especial'), 'success'); })
    .catch(function(){ toast('No se pudo guardar la configuración', 'error'); });
  _lbRepintar('compras');
}

function _lbEstado(tipo){
  if(!S.lbPeriodo){ var d = new Date(); S.lbPeriodo = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  if(!S.lbResumen) S.lbResumen = 'MES';
  return { periodo: S.lbPeriodo, resumenDe: S.lbResumen, q: tipo === 'compras' ? (S.lbQCompras || '') : (S.lbQVentas || ''), filtro: tipo === 'compras' ? (S.lbFiltroCompras || 'todos') : 'todos' };
}
// Lo que se ve y se exporta
function _lbDatos(tipo){
  var st = _lbEstado(tipo), filas, calc;
  if(tipo === 'compras'){
    var docs = lbComprasDocumentos(S.egresos || [], { motos: S.motos || [], concesionarios: S.concesionarios || [] });
    var todas = lbComprasFilas(docs, st.periodo, _lbCfg);
    filas = lbFiltrar(todas, st.q, st.filtro); calc = lbComprasCalculo(filas, st.periodo, st.resumenDe);
    calc.faltanMes = todas.filter(function(f){ return f.faltan.length; }).length; calc.totalMes = todas.length;
  } else {
    var todasV = lbVentasFilas(S.facturas || [], st.periodo);
    filas = lbFiltrar(todasV, st.q, 'todos'); calc = lbVentasCalculo(filas, st.periodo, st.resumenDe); calc.totalMes = todasV.length;
  }
  return { st: st, filas: filas, calc: calc, filtrado: !!(st.q || st.filtro !== 'todos'), empresa: (typeof getEmpresa === 'function' ? getEmpresa() : {}) || {} };
}

var _LB_COLS = {
  compras: {
    grupos: [['DATOS DEL DOCUMENTO', 9], ['COMPRAS INTERNAS O IMPORTACIONES', 5], ['RETENCIÓN IVA (Contrib. Especial)', 2], ['ART. 75', 1]],
    cols: [['oper', '1. Oper. Nro.'], ['fechaDoc', '2. Fecha del Documento', 'f'], ['rif', '3. RIF del Proveedor'], ['nombre', '4. Nombre o Razón Social'],
      ['factura', '5. Número de Factura (o N° Declaración de Importación)'], ['control', '6. Número de Control'], ['ndnc', '7. Nota de Débito / Crédito'],
      ['tipo', '8. Tipo de Transacción'], ['afectada', '9. Factura Afectada'], ['total', '10. Total Compras (Con IVA)', 'm'], ['exento', '11. Compras Exentas, Exoneradas o No Sujetas', 'm'],
      ['base', '12. Base Imponible', 'm'], ['alic', '13. Alícuota %', 'p'], ['iva', '14. Impuesto Causado (Crédito Fiscal)', 'm'], ['ret', '15. IVA Retenido (por el comprador)', 'm'],
      ['comprobante', '16. Nro. de Comprobante'], ['origen', 'Origen: Interna / Importación']],
    anchos: [7, 11, 14, 46, 14, 12, 12, 12, 12, 15, 15, 15, 8, 15, 15, 16, 11],
    totales: { iTxt: 8, cols: ['total', 'exento', 'base', 'iva', 'ret'] },
    titulo: 'LIBRO DE COMPRAS (Art. 70, 72 y 75 del Reglamento de la Ley de IVA)', resumenCols: ['Concepto', 'Base Imponible', 'Crédito Fiscal', 'IVA Retenido a Proveedores'], resumenKeys: ['base', 'credito', 'retenido'], notas: LB_NOTAS_COMPRAS
  },
  ventas: {
    grupos: [['DATOS DEL DOCUMENTO', 9], ['VENTAS INTERNAS O EXPORTACIONES', 6], ['IVA RETENIDO POR EL CLIENTE', 3], ['ARTS. 76-77', 2]],
    cols: [['oper', '1. Oper. Nro.'], ['fechaDoc', '2. Fecha del Documento', 'f'], ['rif', '3. RIF del Cliente'], ['nombre', '4. Nombre o Razón Social del Cliente'],
      ['factura', '5. Número de Factura (en resumen diario: primera)'], ['control', '6. Número de Control'], ['ndnc', '7. Nota de Débito / Crédito'], ['tipo', '8. Tipo de Transacción'],
      ['afectada', '9. Factura Afectada'], ['total', '10. Total Ventas (Con IVA)', 'm'], ['exento', '11. Ventas Exentas, Exoneradas o No Sujetas', 'm'], ['exportacion', 'Ventas de Exportación (valor FOB)', 'm'],
      ['base', '12. Base Imponible', 'm'], ['alic', '13. Alícuota %', 'p'], ['iva', '14. Impuesto (Débito Fiscal)', 'm'], ['ret', '15. IVA Retenido (por el cliente)', 'm'],
      ['comprobante', '16. Nro. de Comprobante'], ['fechaComp', 'Fecha del Comprobante', 'f'], ['hasta', 'Resumen diario: Factura Hasta'], ['declExp', 'N° Declaración de Exportación']],
    anchos: [7, 11, 14, 46, 14, 12, 12, 12, 12, 15, 15, 15, 15, 8, 15, 15, 16, 11, 13, 13],
    totales: { iTxt: 8, cols: ['total', 'exento', 'exportacion', 'base', 'iva', 'ret'] },
    titulo: 'LIBRO DE VENTAS (Art. 70, 72, 76, 77 y 78 del Reglamento de la Ley de IVA)', resumenCols: ['Concepto', 'Base Imponible', 'Débito Fiscal', 'IVA Retenido por Clientes'], resumenKeys: ['base', 'debito', 'retenido'], notas: LB_NOTAS_VENTAS
  }
};
function _lbCeldaHtml(v, t){
  if(v === '' || v == null) return '';
  if(t === 'm') return typeof v === 'number' ? fmt(v) : _lbEsc(v);
  if(t === 'p') return typeof v === 'number' ? Math.round(v * 100) + '%' : _lbEsc(v);
  if(t === 'f') return _lbFechaVE(v);
  return _lbEsc(v);
}
function _lbEstadoHtml(e){ var ok = /^(OK|CUADRA)$/.test(e) || /elija/.test(e); return '<b style="color:' + (ok ? 'var(--green)' : 'var(--red)') + '">' + _lbEsc(e) + '</b>'; }

function _lbCuerpoHtml(tipo){
  var D = _lbDatos(tipo), C = _LB_COLS[tipo];
  var th = 'padding:6px 7px;border:1px solid var(--rim);font-size:9.5px;font-weight:800;text-align:center;vertical-align:middle;line-height:1.25';
  var grupos = '<tr>' + C.grupos.map(function(g){ return '<th colspan="' + g[1] + '" style="' + th + ';background:rgba(37,99,235,.10);color:var(--p1)">' + g[0] + '</th>'; }).join('') + (tipo === 'compras' ? '<th class="no-export" style="' + th + '"></th>' : '') + '</tr>';
  var enc = '<tr>' + C.cols.map(function(c){ return '<th style="' + th + ';background:var(--gs);color:var(--ink2);min-width:' + (c[0] === 'nombre' ? 180 : 70) + 'px">' + c[1] + '</th>'; }).join('') + (tipo === 'compras' ? '<th class="no-export" style="' + th + ';background:var(--gs)"></th>' : '') + '</tr>';
  var cuerpo = D.filas.map(function(f){
    var falta = f.faltan && f.faltan.length;
    return '<tr style="' + (f.anulada ? 'opacity:.6;' : '') + (falta ? 'background:rgba(245,158,11,.07)' : '') + '">' + C.cols.map(function(c){
      var al = c[2] === 'm' ? 'right' : (c[2] === 'p' || c[0] === 'oper' || c[0] === 'tipo' ? 'center' : 'left');
      return '<td style="padding:5px 7px;border:1px solid var(--rim2);font-size:11px;text-align:' + al + ';' + (c[2] === 'm' ? 'font-family:var(--fd);white-space:nowrap' : (['fechaDoc', 'rif', 'factura', 'control', 'ndnc', 'tipo', 'comprobante'].indexOf(c[0]) > -1 ? 'white-space:nowrap' : '')) + '">' + _lbCeldaHtml(f[c[0]], c[2]) + '</td>';
    }).join('') + (tipo === 'compras' ? '<td class="no-export" style="padding:4px 6px;border:1px solid var(--rim2);white-space:nowrap">'
      + (falta ? '<div style="font-size:9.5px;color:var(--amber);font-weight:800;margin-bottom:3px">Falta: ' + _lbEsc(f.faltan.join(', ')) + '</div>' : '')
      + (f.monedaOrig === 'BS' ? '<div style="font-size:9.5px;color:var(--ink3);margin-bottom:3px">Factura en Bs: ' + _lbEsc(_lbFmtBs(f.totalBsOrig)) + (f.tasaOrig ? ' a ' + _lbEsc(_lbFmtTasa(f.tasaOrig)) + ' Bs/$' + (f.tasaMonedaOrig === 'eur' ? ' (euro)' : '') : '') + (f.tasaFechaOrig ? ' (' + _lbEsc(_lbFechaVE(f.tasaFechaOrig)) + ')' : '') + '</div>' : '')
      + '<button class="btn btn-g btn-sm" style="padding:3px 9px;font-size:11px" onclick="lbCompletar(\'' + f.clave + '\')">' + (falta ? '✎ Completar' : '✎ Editar') + '</button></td>' : '') + '</tr>';
  }).join('');
  var vacio = !D.filas.length ? '<tr><td colspan="' + (C.cols.length + 1) + '" style="padding:22px;text-align:center;color:var(--ink3);font-size:12px">'
    + (D.calc.totalMes ? 'Nada coincide con la búsqueda.' : (tipo === 'ventas' ? 'No hay facturas emitidas en ' + _lbPeriodoVE(D.st.periodo) + '. Las facturas se generan desde el detalle de cada pago.' : 'No hay gastos registrados en ' + _lbPeriodoVE(D.st.periodo) + '.')) + '</td></tr>' : '';
  var tot = '<tr>' + C.cols.map(function(c, i){
    var td = 'padding:7px;border:1px solid var(--rim);font-weight:800;background:rgba(16,185,129,.08);font-size:11px;';
    if(i === C.totales.iTxt) return '<td style="' + td + 'text-align:right">TOTALES</td>';
    if(C.totales.cols.indexOf(c[0]) > -1) return '<td style="' + td + 'text-align:right;font-family:var(--fd);white-space:nowrap">' + fmt(D.calc.totales[c[0]]) + '</td>';
    return '<td style="' + td + '"></td>';
  }).join('') + (tipo === 'compras' ? '<td class="no-export" style="border:1px solid var(--rim)"></td>' : '') + '</tr>';
  var resumen = '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr>' + C.resumenCols.map(function(h, i){ return '<th style="padding:7px 8px;border:1px solid var(--rim);background:var(--gs);font-size:10px;text-align:' + (i ? 'right' : 'left') + '">' + h + '</th>'; }).join('') + '</tr></thead><tbody>'
    + D.calc.resumen.map(function(r){ var t = r.concepto === 'TOTAL';
      return '<tr style="' + (t ? 'font-weight:800;background:rgba(16,185,129,.08)' : '') + '"><td style="padding:6px 8px;border:1px solid var(--rim2)">' + _lbEsc(r.concepto) + '</td>'
        + C.resumenKeys.map(function(k){ return '<td style="padding:6px 8px;border:1px solid var(--rim2);text-align:right;font-family:var(--fd);white-space:nowrap">' + (r[k] === '' ? '' : fmt(r[k])) + '</td>'; }).join('') + '</tr>'; }).join('')
    + '</tbody></table>';
  var controles = '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr><th style="padding:7px 8px;border:1px solid var(--rim);background:var(--gs);font-size:10px;text-align:left">Control</th><th style="padding:7px 8px;border:1px solid var(--rim);background:var(--gs);font-size:10px;text-align:left">Estado</th></tr></thead><tbody>'
    + D.calc.controles.map(function(c){ return '<tr><td style="padding:6px 8px;border:1px solid var(--rim2)">' + _lbEsc(c.concepto) + '</td><td style="padding:6px 8px;border:1px solid var(--rim2)">' + _lbEstadoHtml(c.estado) + '</td></tr>'; }).join('')
    + '</tbody></table>';
  var resDe = D.st.resumenDe === 'MES' ? ' (mes completo)' : ', quincena ' + D.st.resumenDe;
  return (D.filtrado ? '<div style="margin:0 0 8px;padding:8px 11px;border-radius:8px;background:rgba(37,99,235,.07);font-size:11.5px;color:var(--ink2)">Filtrado: se ven ' + D.filas.length + ' de ' + D.calc.totalMes + ' documentos del mes; los totales, el resumen y lo que se exporta son solo de lo que se ve.</div>' : '')
    + (tipo === 'compras' && D.calc.faltanMes ? '<div style="margin:0 0 8px;padding:9px 12px;border-radius:8px;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.35);font-size:12px;color:var(--ink2)"><b style="color:var(--amber)">' + D.calc.faltanMes + ' de ' + D.calc.totalMes + ' gastos de este mes no tienen los datos de la factura del proveedor.</b> Complétalos con ✎ (RIF, N° de factura, N° de control, base e IVA) para que el libro cuadre. <a href="javascript:void(0)" onclick="lbFiltroCompras(\'faltan\')" style="font-weight:700;color:var(--p1)">Ver solo esos</a></div>' : '')
    + '<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table id="lb-tabla-' + tipo + '" style="border-collapse:collapse;width:100%">' + '<thead>' + grupos + enc + '</thead><tbody>' + (vacio || cuerpo) + tot + '</tbody></table></div>'
    + '<div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:14px;margin-top:14px">'
    +   '<div><div style="font-size:12px;font-weight:800;margin-bottom:6px">RESUMEN – Período ' + _lbPeriodoVE(D.st.periodo) + resDe + '</div><div style="font-size:10.5px;color:var(--ink3);margin:-3px 0 6px">Art. 72 RLIVA: debe coincidir con la Declaración de IVA – Forma 30</div>' + resumen
    +     (tipo === 'ventas' && D.calc.totales.igtf ? '<div style="font-size:11px;color:var(--ink3);margin-top:6px">IGTF percibido en estas facturas (no forma parte del libro de IVA): <b>' + fmt(D.calc.totales.igtf) + '</b></div>' : '') + '</div>'
    +   '<div><div style="font-size:12px;font-weight:800;margin-bottom:6px">CONTROLES</div><div style="height:15px"></div>' + controles + '</div>'
    + '</div>'
    + '<details style="margin-top:14px"><summary style="cursor:pointer;font-size:12px;font-weight:800;color:var(--ink2)">NOTAS (base legal)</summary><ul style="margin:8px 0 0 18px;font-size:11px;color:var(--ink3);line-height:1.55">'
    + C.notas.map(function(n){ return '<li>' + _lbEsc(n) + '</li>'; }).join('') + '</ul></details>';
}

function _lbRender(tipo){
  if(tipo === 'compras') _lbCargarCfg();
  var st = _lbEstado(tipo), emp = (typeof getEmpresa === 'function' ? getEmpresa() : {}) || {}, C = _LB_COLS[tipo];
  var q = tipo === 'compras' ? 'lbQCompras' : 'lbQVentas';
  var spe = tipo === 'compras'
    ? '<div class="fg" style="min-width:150px"><label>¿Contribuyente especial?</label>' + (lbPuedeConfigurar()
        ? '<select class="fs" id="lb_spe" onchange="lbGuardarCfg()"><option value="NO"' + (_lbCfg.esSPE ? '' : ' selected') + '>NO</option><option value="SI"' + (_lbCfg.esSPE ? ' selected' : '') + '>SÍ</option></select>'
        : '<div style="padding:9px 0;font-weight:800">' + (_lbCfg.esSPE ? 'SÍ' : 'NO') + '</div>') + '</div>'
      + '<div class="fg" style="min-width:120px"><label>% Retención</label>' + (lbPuedeConfigurar()
        ? '<select class="fs" id="lb_pct" onchange="lbGuardarCfg()"' + (_lbCfg.esSPE ? '' : ' disabled') + '><option value="0.75"' + (_lbCfg.pctRet == 0.75 ? ' selected' : '') + '>75%</option><option value="1"' + (_lbCfg.pctRet == 1 ? ' selected' : '') + '>100%</option></select>'
        : '<div style="padding:9px 0;font-weight:800">' + Math.round(_lbCfg.pctRet * 100) + '%</div>') + '</div>'
      + '<div class="fg" style="min-width:150px"><label>Mostrar</label><select class="fs" onchange="lbFiltroCompras(this.value)"><option value="todos"' + (st.filtro === 'todos' ? ' selected' : '') + '>Todos</option><option value="faltan"' + (st.filtro === 'faltan' ? ' selected' : '') + '>Les faltan datos</option><option value="completos"' + (st.filtro === 'completos' ? ' selected' : '') + '>Completos</option></select></div>'
    : '';
  return '<div class="card" style="margin-bottom:14px">'
    + '<div class="ch" style="flex-wrap:wrap;gap:10px"><div><div class="ct">' + (tipo === 'compras' ? 'Libro de Compras' : 'Libro de Ventas') + '</div><div class="cs">' + _lbEsc(C.titulo.replace(/^LIBRO DE (COMPRAS|VENTAS) /, '')) + ' · cifras en dólares (USD)</div></div>'
    +   '<div style="display:flex;gap:6px;margin-left:auto"><button class="btn btn-g btn-sm" onclick="lbExportar(\'' + tipo + '\',\'excel\')">⬇ Excel</button><button class="btn btn-g btn-sm" onclick="lbExportar(\'' + tipo + '\',\'pdf\')">📄 PDF</button></div></div>'
    + '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 14px;font-size:12px;margin:2px 0 12px;padding:10px 12px;background:var(--gs);border-radius:9px">'
    +   '<span style="color:var(--ink3)">Empresa</span><b>' + _lbEsc(emp.nombre || '') + '</b>'
    +   '<span style="color:var(--ink3)">RIF</span><b>' + _lbEsc(emp.rif || '—') + '</b>'
    +   '<span style="color:var(--ink3)">Dirección fiscal</span><span>' + _lbEsc(emp.direccion || '—') + '</span></div>'
    + '<div class="fgr" style="gap:10px;align-items:end;flex-wrap:wrap">'
    +   '<div class="fg" style="min-width:150px"><label>Período (mes/año)</label><input class="fi" type="month" value="' + st.periodo + '" onchange="lbPeriodo(this.value)"></div>'
    +   '<div class="fg" style="min-width:140px"><label>Resumen de</label><select class="fs" onchange="lbResumenDe(this.value)"><option value="MES"' + (st.resumenDe === 'MES' ? ' selected' : '') + '>Mes completo</option><option value="1"' + (st.resumenDe === '1' ? ' selected' : '') + '>1ª quincena</option><option value="2"' + (st.resumenDe === '2' ? ' selected' : '') + '>2ª quincena</option></select></div>'
    +   spe
    +   '<div class="fg" style="flex:1;min-width:200px"><label>Buscar</label><input class="fi" placeholder="Buscar por ' + (tipo === 'compras' ? 'proveedor' : 'cliente') + ', RIF, N° de factura o de control…" value="' + _lbEsc(S[q] || '') + '" oninput="lbBuscar(\'' + tipo + '\',this.value)"></div>'
    + '</div></div>'
    + '<div id="lb-cuerpo-' + tipo + '">' + _lbCuerpoHtml(tipo) + '</div>';
}
function _renderLibroCompras(){ lbAlarmaCerrar(false); return _lbRender('compras'); }
function _renderLibroVentas(){ return _lbRender('ventas'); }
function _lbRepintar(tipo){ var el = document.getElementById('lb-cuerpo-' + tipo); if(el) el.innerHTML = _lbCuerpoHtml(tipo); }
function lbPeriodo(v){ if(/^\d{4}-\d{2}$/.test(v)){ S.lbPeriodo = v; nav('reportes'); } }
function lbResumenDe(v){ S.lbResumen = v; _lbRepintar(S.reportesTab === 'librocompras' ? 'compras' : 'ventas'); }
function lbFiltroCompras(v){ S.lbFiltroCompras = v; nav('reportes'); }
var _lbBuscarT = null;
function lbBuscar(tipo, v){ S[tipo === 'compras' ? 'lbQCompras' : 'lbQVentas'] = v; clearTimeout(_lbBuscarT); _lbBuscarT = setTimeout(function(){ _lbRepintar(tipo); }, 180); }

// ══════════════ COMPLETAR / EDITAR LOS DATOS DE LA FACTURA DEL PROVEEDOR ══════════════
// Los mismos campos sirven en "Registrar egreso" (prefijo 'egf') y en el libro (prefijo 'lbf')
// ══════════════ FACTURA REPETIDA ══════════════
// Adam, 27-oct-2026: "el sistema no filtra que la factura esté repetida… una especie de notificación previa de
// advertencia, y que la gente evite registrar dos veces la misma factura". Avisa, no bloquea: al escribir el N° y el
// proveedor sale el aviso con el gasto que ya existe, y al guardar pide confirmar.
// El contador (28-oct-2026): "debería hacerlo con el número de factura de ese mismo proveedor… si tienes otro
// proveedor con el mismo número de la factura, no debería arrojar esa alerta". Solo cuenta el mismo N° del mismo
// proveedor (por RIF o por nombre): ni el proveedor solo, ni el mismo día con el mismo monto (Movistar manda una
// factura mensual igual todos los meses).
function _lbRepNum(s){ return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+(?=[A-Z0-9])/, ''); }
function _lbRepTxt(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }
// f = { numero, rif, proveedor, fecha, monto, concepto }; devuelve los gastos que parecen la misma factura, con el motivo
function lbFacturaRepetida(f, egresos, opts){
  f = f || {}; opts = opts || {};
  var excluir = {}; (opts.excluirIds || []).forEach(function(id){ excluir[String(id)] = 1; });
  var num = _lbRepNum(f.numero), rif = _lbRepNum(f.rif), prov = _lbRepTxt(f.proveedor);
  if(!num || !(rif || prov)) return [];   // sin N° o sin proveedor no hay con qué comparar
  var vistos = {}, out = [];
  (egresos || []).forEach(function(e){
    if(!e || e.eliminado || e.anuladoPorMoto || excluir[String(e.id)]) return;
    var x = e.fiscal || {}; if(x.noAplica) x = {};
    if(_lbRepNum(x.numero) !== num) return;
    var xrif = _lbRepNum(x.rif), xprov = _lbRepTxt(x.proveedor);
    if(!((rif && xrif && rif === xrif) || (prov && xprov && prov === xprov))) return;   // mismo N° de OTRO proveedor: no es la misma
    var motivo = 'misma factura: mismo N° y mismo proveedor';
    var clave = (e.origenAuto === 'compra_moto' && e.motoIdRef != null) ? 'moto:' + e.motoIdRef : 'eg:' + e.id;   // la moto pagada de varias cuentas es UNA factura
    if(vistos[clave]) return; vistos[clave] = 1;
    out.push({ egreso: e, motivo: motivo });
  });
  return out;
}
function _lbRepTextoDe(m){
  var e = m.egreso, x = e.fiscal || {};
  return 'gasto #' + _lbEsc(e.id) + ' · ' + _lbEsc(_lbFechaVE(e.fecha)) + ' · ' + fmt(e.monto) + ' · ' + _lbEsc(e.concepto || '') + (x.numero ? ' · factura ' + _lbEsc(x.numero) : '') + (x.proveedor ? ' · ' + _lbEsc(x.proveedor) : '') + ' (' + _lbEsc(m.motivo) + ')';
}
// Lo que hay en el formulario, para buscar repetidas: el N° de factura y el proveedor (RIF o nombre)
function _lbRepDatos(p){
  var g = function(id){ return String((_lbEl(id) || {}).value || '').trim(); };
  return { numero: g(p + '_num'), rif: g(p + '_rif'), proveedor: g(p + '_prov') };
}
var _lbRepExcluir = {};   // por formulario: los gastos que son esta misma factura (al editar con ✎)
var _lbRepT = null, _lbAlarmaClave = {}, _lbAlarmaCerrada = {};
// La alarma (Adam, 27-oct-2026: "que diga pago duplicado y que sea como rojo brillante y titile tipo en un laboratorio
// de químicos… un pop-up… y lo puede cerrar"). Se abre una vez por cada coincidencia; cerrada, no vuelve a saltar
// por lo mismo, y queda una línea roja debajo del campo. Si lo escrito cambia y coincide con otra factura, salta de nuevo.
function _lbAlarmaEstilo(){
  if(typeof document === 'undefined' || !document.head || document.getElementById('lb-alarma-css')) return;
  var st = document.createElement('style'); st.id = 'lb-alarma-css';
  st.textContent = '@keyframes lbAlarma{0%{background:#ff1e3c;box-shadow:0 0 0 0 rgba(255,30,60,.95),0 0 60px 18px rgba(255,30,60,.7)}100%{background:#9c0016;box-shadow:0 0 0 18px rgba(255,30,60,0),0 0 10px 2px rgba(255,30,60,.3)}}'
    + '@keyframes lbAlarmaFondo{0%{background:rgba(120,0,16,.35)}100%{background:rgba(120,0,16,.6)}}'
    + '.lb-alarma{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;animation:lbAlarmaFondo .55s ease-in-out infinite alternate}'
    + '.lb-alarma-caja{animation:lbAlarma .55s ease-in-out infinite alternate;color:#fff;border-radius:18px;padding:26px 30px 22px;max-width:580px;width:calc(100% - 40px);text-align:center;border:3px solid #fff}'
    + '.lb-alarma-t{font-size:32px;font-weight:900;letter-spacing:3px;margin:0 0 6px;text-shadow:0 2px 8px rgba(0,0,0,.35)}'
    + '.lb-alarma-s{font-size:13.5px;font-weight:700;opacity:.95;margin-bottom:12px}'
    + '.lb-alarma-l{font-size:13px;line-height:1.6;text-align:left;background:rgba(0,0,0,.28);border-radius:10px;padding:10px 14px;margin:0 0 16px}'
    + '.lb-alarma-b{background:#fff;color:#9c0016;border:0;border-radius:10px;padding:11px 26px;font-weight:900;font-size:14px;cursor:pointer;letter-spacing:.5px}';
  document.head.appendChild(st);
}
function lbAlarmaMostrar(reps, clave){
  if(typeof document === 'undefined' || !document.body) return;
  _lbAlarmaEstilo(); lbAlarmaCerrar(false);
  var ov = document.createElement('div'); ov.id = 'lb-alarma'; ov.className = 'lb-alarma'; ov.setAttribute('data-clave', clave);
  ov.innerHTML = '<div class="lb-alarma-caja" role="alertdialog" aria-live="assertive"><div class="lb-alarma-t">🚨 PAGO DUPLICADO</div>'
    + '<div class="lb-alarma-s">Esta factura ya está registrada en el sistema</div>'
    + '<div class="lb-alarma-l">' + reps.map(_lbRepTextoDe).join('<br>') + '</div>'
    + '<button type="button" class="lb-alarma-b" onclick="lbAlarmaCerrar(true)">Entendido, cerrar</button></div>';
  ov.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') lbAlarmaCerrar(true); });
  document.body.appendChild(ov);
  var b = ov.querySelector('button'); if(b && b.focus) try { b.focus(); } catch(e){}
}
function lbAlarmaCerrar(porElUsuario){
  if(typeof document === 'undefined' || !document.getElementById) return;
  var el = document.getElementById('lb-alarma'); if(!el) return;
  if(porElUsuario) _lbAlarmaCerrada[el.getAttribute('data-clave') || ''] = 1;
  if(el.remove) el.remove(); else if(el.parentNode) el.parentNode.removeChild(el);
}
function lbRepetidaCheck(p){
  clearTimeout(_lbRepT);
  _lbRepT = setTimeout(function(){
    var el = (p === 'egf' && _lbEl('eg_rep_gasto')) || _lbEl(p + '_rep'); if(!el) return;   // en Registrar Egreso va a la vista, no dentro del bloque plegado
    var reps = lbFacturaRepetida(_lbRepDatos(p), S.egresos || [], { excluirIds: _lbRepExcluir[p] || [] });
    var clave = reps.map(function(m){ return m.egreso.id; }).join(',');
    el.innerHTML = reps.length ? '<div style="padding:8px 11px;border-radius:8px;background:rgba(232,51,90,.10);border:1px solid rgba(232,51,90,.45);font-size:11.5px;color:var(--ink2);line-height:1.5"><b style="color:var(--red)">🚨 PAGO DUPLICADO: esta factura ya está registrada</b><br>' + reps.map(_lbRepTextoDe).join('<br>') + '</div>' : '';
    if(!reps.length){ lbAlarmaCerrar(false); _lbAlarmaClave[p] = ''; return; }
    if(clave !== _lbAlarmaClave[p] && !_lbAlarmaCerrada[clave]){ _lbAlarmaClave[p] = clave; lbAlarmaMostrar(reps, clave); }
  }, 150);
}
// Al guardar: si está duplicada, pregunta. Devuelve true si se puede seguir.
function lbRepetidaConfirmar(p){
  var reps = lbFacturaRepetida(_lbRepDatos(p), S.egresos || [], { excluirIds: _lbRepExcluir[p] || [] });
  if(!reps.length) return true;
  var lista = reps.map(function(m){ var e = m.egreso; return '• #' + e.id + ' · ' + _lbFechaVE(e.fecha) + ' · ' + fmt(e.monto) + ' · ' + (e.concepto || '') + ' (' + m.motivo + ')'; }).join('\n');
  return (typeof confirm === 'function') ? confirm('🚨 PAGO DUPLICADO: esta factura ya está registrada.\n' + lista + '\n\n¿Registrarla otra vez de todas formas?') : true;
}

// Moneda de la factura: en dólares (como siempre) o en bolívares. En bolívares los montos se escriben tal como vienen
// en la factura y el sistema los pasa a dólares con la tasa BCV de la fecha del documento (Adam, 26-oct-2026: "que el
// sistema, como tiene el tipo de cambio ya cargado, le haga la conversión… los reportes siempre van saliendo dólares").
// Lo que se guarda y lo que ven el libro, Coromoto y QuickBooks sigue en dólares; el original en Bs, la tasa, su fecha
// y su fuente quedan guardados en la factura como constancia. La tasa sale del historial (logic/tasas.js); si no hay,
// el analista la escribe y queda guardada para esa fecha.
function lbMonedaHtml(p, f){
  f = f || {};
  var bs = f.moneda === 'BS', sel = f.tasaMoneda === 'eur' ? 'eur' : 'usd';
  return '<div class="fgr" style="gap:8px;align-items:end">'
    + '<div class="fg" style="min-width:150px"><label>Moneda de la factura</label><select class="fs" id="' + p + '_mon" data-prev="' + (bs ? 'BS' : 'USD') + '" onchange="lbMonedaCambio(\'' + p + '\')"><option value="USD"' + (bs ? '' : ' selected') + '>Dólares ($)</option><option value="BS"' + (bs ? ' selected' : '') + '>Bolívares (Bs)</option></select></div>'
    + '<div class="fg" id="' + p + '_tasabox" style="flex:1;min-width:280px;' + (bs ? '' : 'display:none') + '"><label>Tasa BCV de la fecha del documento (Bs por $)</label>'
    +   '<div style="display:flex;gap:6px;align-items:center"><select class="fs" id="' + p + '_tasasel" style="max-width:120px" onchange="lbTasaBuscar(\'' + p + '\')"><option value="usd"' + (sel === 'usd' ? ' selected' : '') + '>Dólar BCV</option><option value="eur"' + (sel === 'eur' ? ' selected' : '') + '>Euro BCV</option></select>'
    +   '<input class="fi" type="number" step="0.0001" min="1" id="' + p + '_tasa" value="' + (f.tasa ? +f.tasa : '') + '" placeholder="Ej: 886.23" oninput="lbTasaManual(\'' + p + '\')" style="max-width:140px">'
    +   '<button type="button" class="btn btn-g btn-sm" onclick="lbTasaBuscar(\'' + p + '\')" title="Buscar la tasa de esa fecha en el historial">↻</button>'
    +   '<input type="hidden" id="' + p + '_tasafecha" value="' + _lbEsc(f.tasaFecha || '') + '"><input type="hidden" id="' + p + '_tasafuente" value="' + _lbEsc(f.tasaFuente || '') + '"></div>'
    +   '<div id="' + p + '_tasainfo" style="font-size:10.5px;color:var(--ink3);margin-top:3px;line-height:1.4">' + (bs && f.tasa ? 'Tasa guardada con la factura' + (f.tasaFecha ? ' · del ' + _lbEsc(_lbFechaVE(f.tasaFecha)) : '') + (f.tasaFuente ? ' · ' + _lbEsc(f.tasaFuente) : '') + (f.tasaMoneda === 'eur' ? ' · euro' : '') : '') + '</div>'
    +   '<div style="font-size:10px;color:var(--ink3);margin-top:2px">Dólar BCV: la tasa oficial del día. Euro BCV: solo si el proveedor cobró los bolívares a la tasa del euro (se divide entre esa tasa).</div></div>'
    + '</div>';
}
var _LB_EQ = 'font-size:10.5px;color:var(--ink3);min-height:13px;margin-top:2px';
function lbCamposFiscalesHtml(p, f, monto, opts){
  f = f || {}; opts = opts || {};
  var bs = f.moneda === 'BS';
  var v = function(k){ return _lbEsc(f[k] == null ? '' : f[k]); };
  var vm = function(k){ return bs ? v(k + 'Bs') : v(k); };   // en Bs se editan los montos originales
  var alic = _lbNum(f.alicuota) === '' ? '0.16' : String(+f.alicuota);
  var sim = bs ? 'Bs' : '$';
  return (opts.sinMoneda ? '' : lbMonedaHtml(p, f))
    + '<div class="fgr" style="gap:8px">'
    + '<div class="fg"><label>Proveedor (razón social)</label><input class="fi" id="' + p + '_prov" value="' + v('proveedor') + '" placeholder="Ej: INVERSIONES MOTOS TORO, C.A." oninput="lbRepetidaCheck(\'' + p + '\')"></div>'
    + '<div class="fg"><label>RIF del proveedor</label><input class="fi" id="' + p + '_rif" value="' + v('rif') + '" placeholder="J-12345678-9" maxlength="16" oninput="lbRepetidaCheck(\'' + p + '\')"></div></div>'
    + '<div class="fgr" style="gap:8px">'
    + '<div class="fg"><label>Documento</label><select class="fs" id="' + p + '_tipo">' + LB_TIPOS.map(function(t){ return '<option value="' + t[0] + '"' + ((f.tipo || '01-REG') === t[0] ? ' selected' : '') + '>' + t[1] + ' (' + t[0] + ')</option>'; }).join('') + '</select></div>'
    + '<div class="fg"><label>N° de factura / nota / declaración</label><input class="fi" id="' + p + '_num" value="' + v('numero') + '" placeholder="00001234" oninput="lbRepetidaCheck(\'' + p + '\')"></div>'
    + '<div class="fg"><label>N° de control</label><input class="fi" id="' + p + '_ctl" value="' + v('control') + '" placeholder="00-00001234"></div></div>'
    + '<div id="' + p + '_rep"></div>'
    + '<div class="fgr" style="gap:8px">'
    + '<div class="fg"><label>Fecha del documento</label><input class="fi" type="date" id="' + p + '_fecha" value="' + v('fecha') + '" onchange="lbTasaBuscar(\'' + p + '\')"></div>'
    + '<div class="fg"><label>Factura afectada (solo notas)</label><input class="fi" id="' + p + '_afe" value="' + v('afectada') + '" placeholder="Opcional"></div>'
    + '<div class="fg"><label>Origen</label><select class="fs" id="' + p + '_ori"><option value="INTERNA"' + (f.origen === 'IMPORTACION' ? '' : ' selected') + '>Interna</option><option value="IMPORTACION"' + (f.origen === 'IMPORTACION' ? ' selected' : '') + '>Importación</option></select></div></div>'
    + '<div class="fgr" style="gap:8px">'
    + '<div class="fg"><label>Exento (<span class="lb-lblmon-' + p + '">' + sim + '</span>)</label><input class="fi" type="number" step="0.01" id="' + p + '_exe" value="' + vm('exento') + '" oninput="lbFiscalCalc(\'' + p + '\')" placeholder="0.00"><div id="' + p + '_exe_eq" style="' + _LB_EQ + '"></div></div>'
    + '<div class="fg"><label>Base imponible (<span class="lb-lblmon-' + p + '">' + sim + '</span>)</label><input class="fi" type="number" step="0.01" id="' + p + '_base" value="' + vm('base') + '" oninput="lbFiscalCalc(\'' + p + '\')" placeholder="0.00"><div id="' + p + '_base_eq" style="' + _LB_EQ + '"></div></div>'
    + '<div class="fg"><label>Alícuota</label><select class="fs" id="' + p + '_alic" onchange="lbFiscalCalc(\'' + p + '\')">' + [['0.16', '16% general'], ['0.08', '8% reducida'], ['0.31', '31% (16% + 15%)'], ['0', '0%']].map(function(a){ return '<option value="' + a[0] + '"' + (alic === a[0] ? ' selected' : '') + '>' + a[1] + '</option>'; }).join('') + '</select></div></div>'
    + '<div class="fgr" style="gap:8px">'
    + '<div class="fg"><label>IVA retenido (<span class="lb-lblmon-' + p + '">' + sim + '</span>)</label><input class="fi" type="number" step="0.01" id="' + p + '_ret" value="' + vm('retenido') + '" oninput="lbFiscalCalc(\'' + p + '\')" placeholder="Automático si es contribuyente especial"><div id="' + p + '_ret_eq" style="' + _LB_EQ + '"></div></div>'
    + '<div class="fg"><label>N° de comprobante de retención</label><input class="fi" id="' + p + '_comp" value="' + v('comprobante') + '" placeholder="14 dígitos: AAAAMMSSSSSSSS" maxlength="14"></div></div>'
    + '<div id="' + p + '_res" style="font-size:11.5px;color:var(--ink3);margin-top:2px"></div>'
    + (monto > 0 ? '<div style="margin-top:4px"><a href="javascript:void(0)" onclick="lbFiscalDesdeMonto(\'' + p + '\',' + monto + ')" style="font-size:11.5px;font-weight:700;color:var(--p1)">Repartir los ' + fmt(monto) + ' registrados como total con IVA 16% incluido</a></div>' : '')
    + '<label style="display:flex;gap:7px;align-items:center;margin-top:8px;font-size:12px;cursor:pointer"><input type="checkbox" id="' + p + '_noap"' + (f.noAplica ? ' checked' : '') + '> Este gasto no lleva factura (no va al Libro de Compras)</label>';
}
var _lbFmtBs = function(n){ return 'Bs ' + (Math.round((parseFloat(n) || 0) * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
var _lbFmtTasa = function(t){ return (parseFloat(t) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }); };
var _lbEl = function(id){ return document.getElementById(id); };
var _lbTasaReq = {};        // por formulario: número de la última búsqueda (una respuesta vieja no pisa la nueva)
var _lbTasaEscrita = {};    // por formulario: el analista tecleó la tasa en ESTE formulario (solo esa se guarda en el historial)
function lbMonedaEs(p){ var m = _lbEl(p + '_mon'); return !!m && m.value === 'BS'; }
function lbTasaDe(p){ var t = _lbEl(p + '_tasa'); var n = parseFloat(t && t.value) || 0; return n > 1 ? Math.round(n * 10000) / 10000 : 0; }
// La fecha cuya tasa se busca: la del documento; en Registrar Egreso, si no la escribieron, la del gasto
function lbTasaFechaDe(p){
  var f = (_lbEl(p + '_fecha') || {}).value || (p === 'egf' ? ((_lbEl('eg_fecha') || {}).value || '') : '');
  return /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : (typeof hoyLocalISO === 'function' ? hoyLocalISO() : new Date().toISOString().slice(0, 10));
}
// Al cambiar de moneda, los montos ya escritos se pasan a la otra moneda con la tasa (×tasa a Bs, ÷tasa a $): si no,
// al guardar se leerían en la moneda nueva tal cual (una base de Bs 8.862 quedaría como $8.862). Sin tasa se vacían y avisa.
var _LB_CAMPOS_MONTO = ['exe', 'base', 'ret'];
function _lbCamposConvertir(p, fn){
  var ids = _LB_CAMPOS_MONTO.map(function(k){ return p + '_' + k; }); if(p === 'egf') ids.push('eg_monto');
  ids.forEach(function(id){ var el = _lbEl(id); if(!el || el.value === '' || !(parseFloat(el.value) >= 0)) return; var v = fn(parseFloat(el.value)); el.value = v === '' ? '' : String(v); });
}
function lbMonedaCambio(p, sinBuscar){
  var bs = lbMonedaEs(p), box = _lbEl(p + '_tasabox'), sel = _lbEl(p + '_mon');
  var antes = sel ? (sel.getAttribute('data-prev') || (bs ? 'BS' : 'USD')) : (bs ? 'BS' : 'USD');
  if(sel) sel.setAttribute('data-prev', bs ? 'BS' : 'USD');
  if(box) box.style.display = bs ? '' : 'none';
  var lbls = document.querySelectorAll('.lb-lblmon-' + p); for(var i = 0; i < lbls.length; i++) lbls[i].textContent = bs ? 'Bs' : '$';
  var lm = _lbEl(p + '_lblmonto'); if(lm) lm.textContent = bs ? 'Bs' : '$';
  var cambio = antes !== (bs ? 'BS' : 'USD');
  if(cambio && !bs){   // Bs → $: con la tasa que había
    var t = lbTasaDe(p);
    _lbCamposConvertir(p, function(v){ return t ? bsAUsd(v, t) : ''; });
    if(!t && typeof toast === 'function') toast('Sin tasa no se pueden pasar los montos a dólares: escríbelos de nuevo', 'info');
    lbFiscalCalc(p); return;
  }
  if(bs && !sinBuscar){
    lbTasaBuscar(p, cambio ? function(t){   // $ → Bs: cuando llegue la tasa
      _lbCamposConvertir(p, function(v){ return t ? usdABs(v, t) : ''; });
      if(!t && typeof toast === 'function') toast('Sin tasa no se pueden pasar los montos a bolívares: escríbelos de nuevo', 'info');
      lbFiscalCalc(p);
    } : null);
  } else lbFiscalCalc(p);
}
function lbTasaInfo(p, html, color){ var el = _lbEl(p + '_tasainfo'); if(el){ el.innerHTML = html; el.style.color = color || 'var(--ink3)'; } }
function lbTasaBuscar(p, despues){
  if(!lbMonedaEs(p)) return;
  var fecha = lbTasaFechaDe(p), sel = (_lbEl(p + '_tasasel') || {}).value === 'eur' ? 'eur' : 'usd';
  var ff = _lbEl(p + '_tasafecha'), fu = _lbEl(p + '_tasafuente'), ti = _lbEl(p + '_tasa');
  var mio = _lbTasaReq[p] = (_lbTasaReq[p] || 0) + 1;
  _lbTasaEscrita[p] = false;
  if(typeof tasaParaFecha !== 'function'){ lbTasaInfo(p, 'Escribe la tasa BCV del ' + _lbEsc(_lbFechaVE(fecha)) + ' (Bs por $).'); if(despues) despues(lbTasaDe(p)); return; }
  lbTasaInfo(p, 'Buscando la tasa del ' + _lbEsc(_lbFechaVE(fecha)) + '…');
  tasaParaFecha(fecha, sel).then(function(r){
    if(mio !== _lbTasaReq[p]) return;   // ya se pidió otra (cambió la fecha o la moneda): esta respuesta es vieja
    if(_lbTasaEscrita[p]){ lbFiscalCalc(p); if(despues) despues(lbTasaDe(p)); return; }   // mientras buscaba, el analista la escribió: esa manda
    if(r){
      if(ti) ti.value = r.tasa;
      if(ff) ff.value = r.fechaTasa; if(fu) fu.value = r.manual ? 'historial-manual' : r.fuente;
      lbTasaInfo(p, (r.aproximada ? '⚠ ' : '') + (sel === 'eur' ? 'Euro' : 'Dólar') + ' BCV del ' + _lbEsc(_lbFechaVE(r.fechaTasa)) + ': <b>' + _lbFmtTasa(r.tasa) + ' Bs/$</b>' + (r.manual ? ' · puesta a mano' : '') + (r.nota ? '<br>' + _lbEsc(r.nota) : ''), r.aproximada ? 'var(--amber)' : 'var(--ink3)');
    } else {
      if(ti) ti.value = '';
      if(ff) ff.value = fecha; if(fu) fu.value = 'manual';
      lbTasaInfo(p, 'No hay tasa registrada del ' + _lbEsc(_lbFechaVE(fecha)) + '. Escribe la del BCV de ese día: quedará guardada para esa fecha.', 'var(--amber)');
    }
    lbFiscalCalc(p);
    if(despues) despues(lbTasaDe(p));
  });
}
function lbTasaManual(p){
  var ff = _lbEl(p + '_tasafecha'), fu = _lbEl(p + '_tasafuente'), fecha = lbTasaFechaDe(p);
  _lbTasaEscrita[p] = true; _lbTasaReq[p] = (_lbTasaReq[p] || 0) + 1;   // lo que llegue de una búsqueda anterior ya no cuenta
  if(ff) ff.value = fecha; if(fu) fu.value = 'manual';
  lbTasaInfo(p, lbTasaDe(p) ? 'Tasa escrita a mano: se guardará para el ' + _lbEsc(_lbFechaVE(fecha)) + ' con tu nombre (si ese día ya tiene la oficial, el historial conserva la oficial).' : 'La tasa tiene que ser mayor que 1.', 'var(--amber)');
  lbFiscalCalc(p);
}
function lbFiscalCalc(p){
  var g = function(k){ return parseFloat((_lbEl(p + '_' + k) || {}).value) || 0; };
  var bs = lbMonedaEs(p), tasa = bs ? lbTasaDe(p) : 0, alic = parseFloat((_lbEl(p + '_alic') || {}).value) || 0;
  var eq = function(k, usd){ var el = _lbEl(p + '_' + k + '_eq'); if(el) el.textContent = (bs && g(k) && tasa) ? '= ' + fmt(usd) : ''; };
  var exeI = g('exe'), baseI = g('base'), retI = g('ret');
  var exe = bs ? bsAUsd(exeI, tasa) : exeI, base = bs ? bsAUsd(baseI, tasa) : baseI, ret = bs ? bsAUsd(retI, tasa) : retI;
  eq('exe', exe); eq('base', base); eq('ret', ret);
  var iva = _lbR2(base * alic), tot = _lbR2(exe + base + iva), ivaBs = _lbR2(baseI * alic), totBs = _lbR2(exeI + baseI + ivaBs);
  var el = _lbEl(p + '_res');
  if(el){
    if(!(baseI || exeI)) el.innerHTML = '';
    else if(bs && !tasa) el.innerHTML = '<span style="color:var(--amber)">Escribe la tasa para ver el equivalente en dólares.</span>';
    else if(bs) el.innerHTML = 'IVA (crédito fiscal): <b>' + _lbFmtBs(ivaBs) + '</b> = ' + fmt(iva) + ' · Total con IVA: <b>' + _lbFmtBs(totBs) + '</b> = <b>' + fmt(tot) + '</b> · a ' + _lbFmtTasa(tasa) + ' Bs/$';
    else el.innerHTML = 'IVA (crédito fiscal): <b>' + fmt(iva) + '</b> · Total con IVA: <b>' + fmt(tot) + '</b>';
  }
  // En Registrar Egreso el monto del gasto va en la misma moneda y con la misma tasa
  if(p === 'egf'){ var me = _lbEl('eg_monto_eq'), mv = parseFloat((_lbEl('eg_monto') || {}).value) || 0; if(me) me.textContent = (bs && mv && tasa) ? '= ' + fmt(bsAUsd(mv, tasa)) : ''; }
}
// Reparte el monto registrado del gasto (en dólares) como total con IVA; en Bs, primero lo pasa a bolívares con la tasa
function lbFiscalDesdeMonto(p, monto){
  var alic = parseFloat((_lbEl(p + '_alic') || {}).value); if(!(alic > 0)) alic = 0.16;
  var bs = lbMonedaEs(p), tasa = bs ? lbTasaDe(p) : 0;
  if(bs && !tasa){ if(typeof toast === 'function') toast('Primero la tasa: sin ella no se puede pasar el monto a bolívares', 'error'); return; }
  var total = bs ? usdABs(monto, tasa) : monto, base = _lbR2(total / (1 + alic));
  var b = _lbEl(p + '_base'), e = _lbEl(p + '_exe');
  if(b) b.value = base.toFixed(2); if(e) e.value = '';
  lbFiscalCalc(p);
}
// Lo que falta para poder guardar ('' si está bien)
function lbFiscalValidar(p){
  if(lbMonedaEs(p) && !lbTasaDe(p)) return 'Falta la tasa BCV (Bs por $) para pasar la factura a dólares';
  return '';
}
// Lee los campos; devuelve null si no se llenó nada. En bolívares guarda los montos originales (…Bs) y, convertidos
// con la tasa, los de siempre en dólares: el libro, Coromoto y QuickBooks siguen leyendo exento/base/iva/retenido.
function lbLeerCamposFiscales(p){
  var g = function(k){ return String((_lbEl(p + '_' + k) || {}).value || '').trim(); };
  var noap = !!((_lbEl(p + '_noap') || {}).checked);
  var f = { proveedor: g('prov'), rif: g('rif').toUpperCase(), tipo: g('tipo') || '01-REG', numero: g('num'), control: g('ctl'), fecha: g('fecha'), afectada: g('afe'),
    origen: g('ori') === 'IMPORTACION' ? 'IMPORTACION' : 'INTERNA', exento: _lbNum(g('exe')), base: _lbNum(g('base')), alicuota: _lbNum(g('alic')), retenido: _lbNum(g('ret')), comprobante: g('comp') };
  if(noap) return { noAplica: true };
  var algo = f.proveedor || f.rif || f.numero || f.control || f.exento !== '' || f.base !== '' || f.comprobante;
  if(!algo) return null;
  if(f.base === '') f.alicuota = '';
  if(lbMonedaEs(p)){
    var tasa = lbTasaDe(p);
    f.moneda = 'BS'; f.tasa = tasa; f.tasaMoneda = (_lbEl(p + '_tasasel') || {}).value === 'eur' ? 'eur' : 'usd';
    f.tasaFecha = g('tasafecha') || f.fecha || lbTasaFechaDe(p); f.tasaFuente = g('tasafuente') || 'historial';
    f.exentoBs = f.exento; f.baseBs = f.base; f.retenidoBs = f.retenido;
    f.exento = f.exentoBs === '' ? '' : bsAUsd(f.exentoBs, tasa);
    f.base = f.baseBs === '' ? '' : bsAUsd(f.baseBs, tasa);
    f.retenido = f.retenidoBs === '' ? '' : bsAUsd(f.retenidoBs, tasa);
    if(f.baseBs !== '' && f.alicuota !== '') f.ivaBs = _lbR2(f.baseBs * f.alicuota);
  }
  if(f.base !== '' && f.alicuota !== '') f.iva = _lbR2(f.base * f.alicuota);
  return f;
}
// Si la tasa la escribió el analista, queda en el historial para esa fecha (la próxima factura de ese día ya la tiene)
function lbTasaPersistir(f, p){
  if(f && f.moneda === 'BS' && f.tasaFuente === 'manual' && f.tasa > 1 && (!p || _lbTasaEscrita[p]) && typeof tasaGuardarManual === 'function') tasaGuardarManual(f.tasaFecha, f.tasaMoneda, f.tasa);
  if(p) _lbTasaEscrita[p] = false;
}

function lbCompletar(clave){
  var docs = lbComprasDocumentos(S.egresos || [], { motos: S.motos || [], concesionarios: S.concesionarios || [] });
  var g = docs.find(function(d){ return d.clave === clave; });
  if(!g){ toast('No encuentro ese gasto', 'error'); return; }
  var f = Object.assign({}, g.sugerido || {}, g.fiscal || {});
  if(!f.fecha) f.fecha = g.fecha;
  setMicon('egreso'); $('mtt').textContent = 'Datos de la factura del proveedor'; $('msb').textContent = 'Libro de Compras';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div style="padding:9px 11px;border-radius:8px;background:var(--gs);font-size:12px;margin-bottom:10px"><b>' + _lbEsc(g.concepto) + '</b><br>Registrado el ' + _lbFechaVE(g.fecha) + ' por <b>' + fmt(g.monto) + '</b>'
    + (g.egresos.length > 1 ? ' · pagado de ' + g.egresos.length + ' cuentas (es una sola factura)' : '') + '</div>'
    + '<div class="fgr c1" style="gap:9px">' + lbCamposFiscalesHtml('lbf', f, g.monto) + '</div>';
  _lbTasaEscrita.lbf = false; _lbTasaReq.lbf = (_lbTasaReq.lbf || 0) + 1;
  _lbRepExcluir.lbf = g.egresos.map(function(e){ return e.id; });   // esta misma factura no cuenta como repetida
  setTimeout(function(){ lbMonedaCambio('lbf', !!f.tasa); lbRepetidaCheck('lbf'); }, 0);   // si ya tenía tasa guardada no la pisa buscando otra
  S.saveFn = function(){
    var err = lbFiscalValidar('lbf'); if(err){ toast(err, 'error'); return false; }
    if(!lbRepetidaConfirmar('lbf')) return false;
    var fis = lbLeerCamposFiscales('lbf');
    if(!fis){ toast('Llena al menos un dato de la factura, o marca que no lleva factura', 'error'); return false; }
    lbTasaPersistir(fis, 'lbf');
    fis.actualizado = new Date().toISOString(); fis.actualizadoPor = (S.currentUser && S.currentUser.nombre) || '';
    var guardados = g.egresos.map(function(e){
      var real = (S.egresos || []).find(function(x){ return String(x.id) === String(e.id); }) || e;
      real.fiscal = fis;
      return (typeof DB !== 'undefined' && DB.saveEgreso) ? DB.saveEgreso(real) : Promise.resolve();
    });
    Promise.all(guardados).then(function(){ toast(fis.noAplica ? 'Listo: ese gasto ya no va al libro' : 'Datos de la factura guardados', 'success'); }).catch(function(){ toast('No se pudo guardar', 'error'); });
    closeM(); nav('reportes'); return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar</button>';
  $('ov').style.display = 'flex';
}

// ══════════════ EXPORTAR: EXCEL (como los archivos originales) Y PDF ══════════════
function lbHojaExcel(tipo, D){
  var C = _LB_COLS[tipo], emp = D.empresa || {}, n = C.cols.length, L = _xlsxColLetra;
  var filas = [], merges = [], alturas = {};
  var fila = function(arr, alto){ filas.push(arr); if(alto) alturas[filas.length] = alto; return filas.length; };
  var r1 = fila([{ v: emp.nombre || 'NOMBRE DE LA EMPRESA', s: 'titulo' }]); merges.push('A' + r1 + ':' + L(n - 1) + r1);
  var r2 = fila([{ v: 'RIF: ' + (emp.rif || '') + '   ·   ' + (emp.direccion || 'DIRECCIÓN FISCAL'), s: 'negrita' }]); merges.push('A' + r2 + ':' + L(n - 1) + r2);
  var r3 = fila([{ v: C.titulo, s: 'subtitulo' }]); merges.push('A' + r3 + ':' + L(n - 1) + r3);
  var r4 = fila([{ v: 'Período (mes/año):', s: 'negrita' }, '', '', _lbPeriodoVE(D.st.periodo), '', { v: 'Moneda:', s: 'negrita' }, 'Dólares (USD)']); merges.push('A' + r4 + ':C' + r4);
  var r5 = fila([{ v: 'Resumen de: (MES / 1 / 2)', s: 'negrita' }, '', '', D.st.resumenDe, '', { v: 'Generado:', s: 'negrita' }, new Date().toLocaleString('es-VE')]); merges.push('A' + r5 + ':C' + r5);
  if(tipo === 'compras'){
    var r6 = fila([{ v: '¿Contribuyente Especial? (SI/NO):', s: 'negrita' }, '', '', _lbCfg.esSPE ? 'SI' : 'NO', '', '', { v: 'Notas de crédito: montos en NEGATIVO', s: 'negrita' }]); merges.push('A' + r6 + ':C' + r6);
    var r7 = fila([{ v: '% Retención por defecto:', s: 'negrita' }, '', '', { v: _lbCfg.pctRet, s: 'pct' }]); merges.push('A' + r7 + ':C' + r7);
  } else { fila(['', '', '', '', '', '', { v: 'Notas de crédito: montos en NEGATIVO', s: 'negrita' }]); fila([]); }
  fila([D.filtrado ? { v: 'Filtrado: ' + D.filas.length + ' de ' + D.calc.totalMes + ' documentos del mes (los totales son solo de lo que se ve).', s: 'nota' } : '']);
  fila([]);
  var rg = filas.length + 1, col = 0, gr = [];
  C.grupos.forEach(function(g){ gr.push({ v: g[0], s: 'grupo' }); for(var k = 1; k < g[1]; k++) gr.push({ v: '', s: 'grupo' }); merges.push(L(col) + rg + ':' + L(col + g[1] - 1) + rg); col += g[1]; });
  fila(gr, 18);
  fila(C.cols.map(function(c){ return { v: c[1], s: 'encabezado' }; }), 52);
  D.filas.forEach(function(f){
    fila(C.cols.map(function(c){
      var v = f[c[0]];
      if(c[2] === 'm') return typeof v === 'number' ? { v: v, s: 'monto' } : { v: '', s: 'texto' };
      if(c[2] === 'p') return typeof v === 'number' ? { v: v, s: 'pct' } : { v: '', s: 'textoCentro' };
      if(c[2] === 'f') return { v: _lbFechaVE(v), s: 'textoCentro' };
      if(c[0] === 'oper' || c[0] === 'tipo') return { v: v, s: 'textoCentro' };
      return { v: v == null ? '' : v, s: 'texto' };
    }));
  });
  if(!D.filas.length) fila([{ v: 'Sin documentos en el período', s: 'nota' }]);
  fila(C.cols.map(function(c, i){
    if(i === C.totales.iTxt) return { v: 'TOTALES', s: 'totalEtiqueta' };
    return C.totales.cols.indexOf(c[0]) > -1 ? { v: D.calc.totales[c[0]], s: 'totalMonto' } : '';
  }));
  fila([]);
  var rr = fila(['', '', '', { v: 'RESUMEN – Período ' + _lbPeriodoVE(D.st.periodo) + (D.st.resumenDe === 'MES' ? ' (mes completo)' : ', quincena ' + D.st.resumenDe) + '  (Art. 72 RLIVA: debe coincidir con la Declaración de IVA – Forma 30)', s: 'negrita' }]);
  merges.push('D' + rr + ':' + L(Math.min(n - 1, 9)) + rr);
  fila(['', '', ''].concat(C.resumenCols.map(function(h){ return { v: h, s: 'encabezado' }; })));
  D.calc.resumen.forEach(function(r){
    var t = r.concepto === 'TOTAL';
    fila(['', '', '', { v: r.concepto, s: t ? 'totalEtiqueta' : 'texto' }].concat(C.resumenKeys.map(function(k){ return r[k] === '' ? { v: '', s: t ? 'totalMonto' : 'texto' } : { v: r[k], s: t ? 'totalMonto' : 'monto' }; })));
  });
  if(tipo === 'ventas' && D.calc.totales.igtf) fila(['', '', '', { v: 'IGTF percibido en estas facturas (no forma parte del libro de IVA): ' + fmt(D.calc.totales.igtf), s: 'nota' }]);
  fila([]);
  fila(['', '', '', { v: 'CONTROLES', s: 'negrita' }]);
  D.calc.controles.forEach(function(c){ fila(['', '', '', { v: c.concepto, s: 'texto' }, { v: c.estado, s: /^(OK|CUADRA)$/.test(c.estado) ? 'textoCentro' : 'marca' }]); });
  fila([]);
  fila([{ v: 'NOTAS (base legal):', s: 'negrita' }]);
  C.notas.forEach(function(t){ var r = fila([{ v: t, s: 'nota' }], 13 * Math.max(1, Math.ceil(t.length / 190)) + 4); merges.push('A' + r + ':' + L(n - 1) + r); });
  return { name: tipo === 'compras' ? 'Libro de Compras' : 'Libro de Ventas', rows: filas, merges: merges, cols: C.anchos, alturas: alturas, horizontal: true };
}

function lbHtmlPdf(tipo, D){
  var C = _LB_COLS[tipo], emp = D.empresa || {};
  var th = 'border:1px solid #9ca3af;padding:3px 3px;font-size:6.6px;font-weight:800;text-align:center;vertical-align:middle;background:#f2f2f2;color:#111;text-transform:none;letter-spacing:0';
  var td = 'border:1px solid #cbd5e1;padding:2px 3px;font-size:7px;color:#111';
  var cel = function(v, t){ if(v === '' || v == null) return ''; if(t === 'm') return typeof v === 'number' ? fmt(v).replace('$', '') : _lbEsc(v); if(t === 'p') return typeof v === 'number' ? Math.round(v * 100) + '%' : ''; if(t === 'f') return _lbFechaVE(v); return _lbEsc(v); };
  var h = '<div style="font-size:10.5px;line-height:1.5;margin-bottom:8px"><b style="font-size:12.5px">' + _lbEsc(emp.nombre || '') + '</b><br>RIF: ' + _lbEsc(emp.rif || '') + ' · ' + _lbEsc(emp.direccion || '') + '<br><b>' + _lbEsc(C.titulo) + '</b><br>'
    + 'Período: <b>' + _lbPeriodoVE(D.st.periodo) + '</b> · Resumen de: <b>' + D.st.resumenDe + '</b> · Cifras en dólares (USD)' + (tipo === 'compras' ? ' · Contribuyente especial: <b>' + (_lbCfg.esSPE ? 'SÍ (' + Math.round(_lbCfg.pctRet * 100) + '%)' : 'NO') + '</b>' : '')
    + (D.filtrado ? '<br><i>Filtrado: ' + D.filas.length + ' de ' + D.calc.totalMes + ' documentos del mes.</i>' : '') + '</div>';
  h += '<table style="border-collapse:collapse;width:100%;table-layout:auto"><thead><tr>' + C.grupos.map(function(g){ return '<th colspan="' + g[1] + '" style="' + th + ';background:#d9e1f2">' + g[0] + '</th>'; }).join('') + '</tr><tr>'
    + C.cols.map(function(c){ return '<th style="' + th + '">' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>'
    + D.filas.map(function(f){ return '<tr>' + C.cols.map(function(c){ return '<td style="' + td + ';text-align:' + (c[2] === 'm' ? 'right' : (c[2] === 'p' || c[0] === 'oper' ? 'center' : 'left')) + (c[2] === 'm' || ['fechaDoc', 'rif', 'factura', 'control', 'ndnc', 'tipo'].indexOf(c[0]) > -1 ? ';white-space:nowrap' : '') + '">' + cel(f[c[0]], c[2]) + '</td>'; }).join('') + '</tr>'; }).join('')
    + '<tr>' + C.cols.map(function(c, i){ return i === C.totales.iTxt ? '<td style="' + td + ';font-weight:800;text-align:right;background:#e2efda">TOTALES</td>' : (C.totales.cols.indexOf(c[0]) > -1 ? '<td style="' + td + ';font-weight:800;text-align:right;background:#e2efda">' + cel(D.calc.totales[c[0]], 'm') + '</td>' : '<td style="' + td + ';background:#e2efda"></td>'); }).join('') + '</tr>'
    + '</tbody></table>';
  h += '<div style="display:flex;gap:18px;margin-top:12px;align-items:flex-start;break-inside:avoid"><div style="flex:1.6"><div style="font-size:9px;font-weight:800;margin-bottom:4px">RESUMEN – Período ' + _lbPeriodoVE(D.st.periodo) + (D.st.resumenDe === 'MES' ? ' (mes completo)' : ', quincena ' + D.st.resumenDe) + ' · Art. 72 RLIVA</div>'
    + '<table style="border-collapse:collapse;width:100%"><tr>' + C.resumenCols.map(function(x, i){ return '<th style="' + th + ';text-align:' + (i ? 'right' : 'left') + '">' + x + '</th>'; }).join('') + '</tr>'
    + D.calc.resumen.map(function(r){ var t = r.concepto === 'TOTAL'; return '<tr><td style="' + td + (t ? ';font-weight:800' : '') + '">' + _lbEsc(r.concepto) + '</td>' + C.resumenKeys.map(function(k){ return '<td style="' + td + ';text-align:right' + (t ? ';font-weight:800' : '') + '">' + (r[k] === '' ? '' : cel(r[k], 'm')) + '</td>'; }).join('') + '</tr>'; }).join('')
    + '</table>' + (tipo === 'ventas' && D.calc.totales.igtf ? '<div style="font-size:7.5px;margin-top:4px">IGTF percibido (no forma parte del libro de IVA): ' + fmt(D.calc.totales.igtf) + '</div>' : '') + '</div>'
    + '<div style="flex:1"><div style="font-size:9px;font-weight:800;margin-bottom:4px">CONTROLES</div><table style="border-collapse:collapse;width:100%">'
    + D.calc.controles.map(function(c){ var ok = /^(OK|CUADRA)$/.test(c.estado) || /elija/.test(c.estado); return '<tr><td style="' + td + '">' + _lbEsc(c.concepto) + '</td><td style="' + td + ';font-weight:800;color:' + (ok ? '#047857' : '#b91c1c') + '">' + _lbEsc(c.estado) + '</td></tr>'; }).join('')
    + '</table></div></div>';
  h += '<div style="margin-top:10px;font-size:7px;color:#555;line-height:1.45;break-inside:avoid"><b>NOTAS (base legal):</b><br>' + C.notas.map(_lbEsc).join('<br>') + '</div>';
  return h;
}

function lbExportar(tipo, formato){
  var D = _lbDatos(tipo);
  var nombre = (tipo === 'compras' ? 'Libro_de_Compras_' : 'Libro_de_Ventas_') + (D.empresa.nombre ? String(D.empresa.nombre).replace(/[^\wÑñ]+/g, '_').replace(/_+$/, '') + '_' : '') + D.st.periodo;
  if(formato === 'excel') return xlsxEscribir(nombre + '.xlsx', [lbHojaExcel(tipo, D)]);
  _abrirVentanaImpresion((tipo === 'compras' ? 'Libro de Compras ' : 'Libro de Ventas ') + _lbPeriodoVE(D.st.periodo), lbHtmlPdf(tipo, D), { horizontal: true });
}

if(typeof module !== 'undefined' && module.exports) module.exports = { lbComprasDocumentos: lbComprasDocumentos, lbComprasFilas: lbComprasFilas, lbComprasCalculo: lbComprasCalculo, lbVentasFilas: lbVentasFilas, lbVentasCalculo: lbVentasCalculo, lbFiltrar: lbFiltrar, _lbRifCliente: _lbRifCliente, lbLeerCamposFiscales: lbLeerCamposFiscales, lbFiscalValidar: lbFiscalValidar, lbCamposFiscalesHtml: lbCamposFiscalesHtml, lbMonedaHtml: lbMonedaHtml, lbFacturaRepetida: lbFacturaRepetida };
