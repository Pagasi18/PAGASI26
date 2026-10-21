// Libros de Compras y de Ventas del IVA (Adam, 21-oct-2026): las mismas columnas, resumen y controles de sus Excel,
// con los datos del sistema, en dólares. Y el Excel que se descarga (estilos, celdas combinadas, anchos).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const ctx = { console, Math, JSON, Date, String, Number, Object, Array, parseFloat, parseInt, isNaN, isFinite, TextEncoder,
  fmt: n => '$' + parseFloat(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), S: {} };
vm.createContext(ctx);
['logic/exportar.js', 'logic/libros-iva.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
const r = s => vm.runInContext(s, ctx);

// ════════ COMPRAS ════════
const motos = [{ id: 5, concesionarioId: 'C1' }], concesionarios = [{ id: 'C1', nombre: 'MOTOS TORO, C.A.', rif: 'J-12345678-9' }];
const egresos = [
  { id: 1, concepto: 'Papelería', monto: 116, fecha: '2026-10-03', categoria: 'operativo', fiscal: { proveedor: 'PAPELERIA SOL', rif: 'J-1', numero: '0001', control: '00-0001', fecha: '2026-10-02', exento: 0, base: 100, alicuota: 0.16 } },
  { id: 2, concepto: 'Compra de moto · OWEN', monto: 750, fecha: '2026-10-20', categoria: 'inventario', origenAuto: 'compra_moto', motoIdRef: 5, forma: 'Binance 26' },
  { id: 3, concepto: 'Compra de moto · OWEN', monto: 600, fecha: '2026-10-20', categoria: 'inventario', origenAuto: 'compra_moto', motoIdRef: 5, forma: 'Anticipo — MOTOS TORO' },
  { id: 4, concepto: 'Nómina octubre', monto: 900, fecha: '2026-10-15', categoria: 'nomina' },
  { id: 5, concepto: 'Propina', monto: 5, fecha: '2026-10-16', categoria: 'otros', fiscal: { noAplica: true } },
  { id: 6, concepto: 'Devolución papelería', monto: 0, fecha: '2026-10-18', categoria: 'operativo', fiscal: { proveedor: 'PAPELERIA SOL', rif: 'J-1', tipo: '03-ANUL', numero: 'NC-1', control: '00-0002', afectada: '0001', base: 50, alicuota: 0.16 } },
  { id: 7, concepto: 'Septiembre', monto: 10, fecha: '2026-09-30', categoria: 'otros' },
  { id: 8, concepto: 'Borrado', monto: 99, fecha: '2026-10-05', categoria: 'otros', eliminado: true },
];
ctx.S = { egresos, motos, concesionarios };
const docs = r('lbComprasDocumentos(S.egresos, { motos: S.motos, concesionarios: S.concesionarios })');
ok('compras: la moto pagada de 2 cuentas es UNA factura de 1.350; no van la nómina, lo que no lleva factura ni lo borrado',
  docs.length === 4 && docs.find(d => d.clave === 'moto:5').monto === 1350 && !docs.some(d => /Nómina|Propina|Borrado/.test(d.concepto)));
ok('compras: la moto sugiere como proveedor a la sede, con su RIF', docs.find(d => d.clave === 'moto:5').sugerido.rif === 'J-12345678-9');
let filas = r("lbComprasFilas(" + JSON.stringify(docs) + ", '2026-10', { esSPE: false, pctRet: 0.75 })");
ok('compras: solo el mes elegido (3 documentos de octubre), en orden de fecha y numerados', filas.length === 3 && filas.map(f => f.oper).join() === '1,2,3' && filas[0].factura === '0001');
const pap = filas.find(f => f.factura === '0001');
ok('compras: factura completa → base 100, 16%, IVA 16, total 116, sin faltantes', pap.base === 100 && pap.alic === 0.16 && pap.iva === 16 && pap.total === 116 && pap.faltan.length === 0 && pap.fechaDoc === '2026-10-02');
const moto = filas.find(f => f.clave === 'moto:5');
ok('compras: la moto sin datos sale con la sede, el total registrado y lo que falta', moto.nombre === 'MOTOS TORO, C.A.' && moto.rif === 'J-12345678-9' && moto.total === 1350 && moto.base === '' && moto.faltan.join() === 'N° de factura,N° de control,base e IVA');   // el RIF de la sede ya cuenta
const nc = filas.find(f => f.ndnc === 'NC-1');
ok('compras: la nota de crédito va en NEGATIVO, con su factura afectada y sin N° de factura', nc.base === -50 && nc.iva === -8 && nc.total === -58 && nc.factura === '' && nc.afectada === '0001' && nc.tipo === '03-ANUL');
let calc = r("lbComprasCalculo(" + JSON.stringify(filas) + ", '2026-10', 'MES')");
ok('compras: totales como la fila TOTALES del Excel', calc.totales.total === 1408 && calc.totales.base === 50 && calc.totales.iva === 8);
const int16 = calc.resumen.find(x => /internas gravadas – Alícuota General 16/.test(x.concepto));
ok('compras: el resumen separa compras internas al 16% (base 50, crédito 8)', int16.base === 50 && int16.credito === 8 && calc.resumen[calc.resumen.length - 1].concepto === 'TOTAL');
ok('compras: con la moto sin datos el control dice REVISAR y cuenta lo que falta', calc.controles[0].estado === 'REVISAR' && /1 por completar/.test(calc.controles[5].estado));
ok('compras: el resumen del mes cuadra con el crédito fiscal', calc.controles[2].estado === 'CUADRA');
// La moto ya completada
const docs2 = JSON.parse(JSON.stringify(docs)); docs2.find(d => d.clave === 'moto:5').fiscal = { proveedor: 'MOTOS TORO, C.A.', rif: 'J-12345678-9', numero: '777', control: '00-777', base: 1163.79, alicuota: 0.16 };
const filas2 = r("lbComprasFilas(" + JSON.stringify(docs2) + ", '2026-10', { esSPE: true, pctRet: 0.75 })");
const calc2 = r("lbComprasCalculo(" + JSON.stringify(filas2) + ", '2026-10', 'MES')");
ok('compras completas: Total = Exentas + Base + IVA → CUADRA', calc2.controles[0].estado === 'CUADRA' && calc2.controles[5].estado === 'OK');
ok('contribuyente especial: retiene 75% del IVA (16 → 12)', filas2.find(f => f.factura === '0001').ret === 12 && filas2.find(f => f.factura === '777').ret === 139.66);   // ROUND(186,21 × 0,75; 2), como el Excel
const q1 = r("lbComprasCalculo(" + JSON.stringify(filas2) + ", '2026-10', '1')");
ok('resumen de la 1ª quincena: solo lo del 1 al 15 (la papelería)', q1.resumen.find(x => /internas gravadas – Alícuota General 16/.test(x.concepto)).base === 100 && q1.controles[2].estado === '(elija MES)');
ok('buscar por proveedor o RIF, y ver solo los que les faltan datos', r("lbFiltrar(" + JSON.stringify(filas) + ", 'papeleria', 'todos')").length === 2 && r("lbFiltrar(" + JSON.stringify(filas) + ", '', 'faltan')").length === 1);

// ════════ VENTAS ════════
const facturas = [
  { id: 'F1', numero: '00000010', numeroControl: '00-00000010', fechaEmision: '2026-10-05', cliente: { nombre: 'ANA PEREZ', ci: '12345678' }, subtotal: 100, iva: 16, igtf: 3.48, total: 119.48, ivaRate: 16, igtfRate: 3 },
  { id: 'F2', numero: '00000011', numeroControl: '00-00000011', fechaEmision: '2026-10-20', cliente: { nombre: 'LUIS DIAZ', ci: 'V-9.876.543' }, subtotal: 500, iva: 0, total: 500 },
  { id: 'F3', numero: '00000012', numeroControl: '00-00000012', fechaEmision: '2026-10-21', cliente: { nombre: 'X', ci: '1' }, subtotal: 80, iva: 0, total: 80, anulada: true },
  { id: 'F0', numero: '00000009', numeroControl: '00-00000009', fechaEmision: '2026-09-28', cliente: { nombre: 'OTRO', ci: '5' }, subtotal: 50, iva: 0, total: 50 },
];
const fv = r("lbVentasFilas(" + JSON.stringify(facturas) + ", '2026-10')");
ok('ventas: una línea por factura del mes (3), numeradas', fv.length === 3 && fv.map(f => f.oper).join() === '1,2,3');
ok('ventas: con IVA → base 100, 16%, débito 16, total 116 (sin el IGTF), IGTF aparte', fv[0].base === 100 && fv[0].alic === 0.16 && fv[0].iva === 16 && fv[0].total === 116 && fv[0].igtf === 3.48 && fv[0].rif === 'V-12345678');
ok('ventas: sin IVA → exenta', fv[1].exento === 500 && fv[1].base === '' && fv[1].total === 500);
ok('ventas: la anulada se queda con su número y control, dice ANULADA y en cero', fv[2].nombre === 'ANULADA' && fv[2].total === 0 && fv[2].factura === '00000012' && fv[2].control === '00-00000012');
const cv = r("lbVentasCalculo(" + JSON.stringify(fv) + ", '2026-10', 'MES')");
ok('ventas: totales, resumen y controles como el Excel', cv.totales.total === 616 && cv.totales.exento === 500 && cv.totales.igtf === 3.48
  && cv.resumen.find(x => /gravadas – Alícuota General 16/.test(x.concepto)).debito === 16 && cv.controles.every(c => /OK|CUADRA/.test(c.estado)));
ok('RIF/cédula del cliente con letra', r("_lbRifCliente('12345678')") === 'V-12345678' && r("_lbRifCliente('e-8123456')") === 'E-8123456' && r("_lbRifCliente('j-401234567')") === 'J-401234567');

// ════════ EL EXCEL ════════
ctx.S = { egresos, motos, concesionarios, facturas, lbPeriodo: '2026-10', lbResumen: 'MES' };
ctx.getEmpresa = () => ({ nombre: 'PAGASI 18 C.A', rif: 'J-50829589-7', direccion: 'Av Los Chorros' });
const hoja = r("lbHojaExcel('compras', _lbDatos('compras'))");
ok('Excel de compras: título, RIF y "LIBRO DE COMPRAS (Art. 70, 72 y 75…)" como el original', hoja.rows[0][0].v === 'PAGASI 18 C.A' && /J-50829589-7/.test(hoja.rows[1][0].v) && /^LIBRO DE COMPRAS \(Art\. 70, 72 y 75/.test(hoja.rows[2][0].v));
const fGr = hoja.rows.findIndex(x => x[0] && x[0].v === 'DATOS DEL DOCUMENTO');
ok('Excel: grupos de columnas combinados (A:I, J:N, O:P, Q) y los 17 encabezados', fGr > 0 && hoja.merges.includes('A' + (fGr + 1) + ':I' + (fGr + 1)) && hoja.merges.includes('J' + (fGr + 1) + ':N' + (fGr + 1)) && hoja.rows[fGr + 1].length === 17 && hoja.rows[fGr + 1][9].v === '10. Total Compras (Con IVA)');
ok('Excel: TOTALES, RESUMEN, CONTROLES y NOTAS', hoja.rows.some(x => x[8] && x[8].v === 'TOTALES') && hoja.rows.some(x => x[3] && /^RESUMEN – Período 10\/2026/.test(x[3].v)) && hoja.rows.some(x => x[3] && x[3].v === 'CONTROLES') && hoja.rows.some(x => x[0] && x[0].v === 'NOTAS (base legal):'));
ok('Excel: anchos de columna del original (D = 46)', hoja.cols[3] === 46 && hoja.cols.length === 17);
const arch = r("xlsxArchivos([lbHojaExcel('ventas', _lbDatos('ventas'))])");
const hojaXml = arch.find(a => a.name === 'xl/worksheets/sheet1.xml').data;
ok('el .xlsx trae estilos, celdas combinadas, anchos y la hoja horizontal', arch.some(a => a.name === 'xl/styles.xml') && /<mergeCells count="\d+">/.test(hojaXml) && /<col min="4" max="4" width="46"/.test(hojaXml) && /orientation="landscape"/.test(hojaXml));
ok('los montos van como número con formato #,##0.00 (no como texto)', /<numFmt numFmtId="164" formatCode="#,##0.00"\/>/.test(arch.find(a => a.name === 'xl/styles.xml').data) && /<c r="J\d+" s="6"><v>116<\/v><\/c>/.test(hojaXml));
ok('texto con & y < no rompe el XML', !/&(?!amp;|lt;|gt;|quot;)/.test(r("xlsxArchivos([{name:'x',rows:[['A & B < C']]}])")[5].data.replace(/<\?xml[^>]*>/, '')));
const zip = r("_zipStore(xlsxArchivos([{name:'x',rows:[[1,'a']]}]))");
ok('el zip empieza con la firma PK y cierra con el directorio central', zip[0][0] === 0x50 && zip[0][1] === 0x4b && zip[zip.length - 1][0] === 0x50 && zip[zip.length - 1][1] === 0x4b);

// ════════ "$1.234,56" → número, al exportar cualquier tabla ════════
ok('exportar tablas: "$1.234,56" → 1234.56, "-$5,00" → -5, "—" → vacío, "Texto" queda', r("_pgCeldaValor('$1.234,56')") === 1234.56 && r("_pgCeldaValor('-$5,00')") === -5 && r("_pgCeldaValor('—')") === '' && r("_pgCeldaValor('Texto')") === 'Texto' && r("_pgCeldaValor('12')") === 12);

console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exit(1);
