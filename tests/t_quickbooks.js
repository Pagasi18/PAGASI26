// Exportar a QuickBooks (Adam, 23-oct-2026): las plantillas de importación del nuevo contador (01 Ficha de Clientes,
// 02 Servicios, 03 Factura de Servicios a clientes · Crédito, 04 · Contado (29-oct), 05 Ficha de Proveedores y 06 Factura de Proveedor QB), llenas con
// lo que el sistema YA calcula: el reparto de la Nueva metodología, el motor contable y el Libro de Compras.
// "Tiene que ser perfecto y dar los datos perfectos y tomar, no hacer cálculos nuevos… agarrar lo que ya tenemos".
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

function entorno(){
  const G={ console:{log(){},warn(){}}, Math, JSON, Date, String, Number, Object, Array, parseFloat, parseInt, isNaN, isFinite,
    TextEncoder, Uint8Array, Uint32Array, S:{}, PLAN:{factor:2, plazo:12},
    fmt:n=>'$'+(parseFloat(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}), toast(){}, nav(){} };
  G.window=G; G.globalThis=G; vm.createContext(G);
  vm.runInContext(src('logic/categorias-egreso.js'), G);   // el catálogo y las categorías del contador
  vm.runInContext(src('logic/exportar.js'), G);
  vm.runInContext(src('logic/libros-iva.js'), G);
  const pro=src('logic/contratos-protect.js');
  vm.runInContext(pro.slice(0, pro.indexOf('function _protectDatos')), G);
  vm.runInContext(src('logic/metodologia.js'), G);
  vm.runInContext(src('logic/credito-ledger.js'), G);
  const rep=src('logic/reportes.js');
  vm.runInContext(rep.slice(rep.indexOf('var _DF_SERVICIOS_HASTA'), rep.indexOf('// motos y total son los que ya usa el dashboard')), G);
  vm.runInContext(src('logic/quickbooks.js'), G);
  return G;
}
const G=entorno();
const r2=n=>Math.round(n*100)/100;
const cerca=(a,b)=>Math.abs(a-b)<0.005;

// ── El crédito de Adam: moto 1350, inicial 750, cuota 53 × 24 (el de la Nueva metodología) ─────────────────
const M154={ id:'M-154', cli:'JESUS GALARRAGA', clienteId:7, fecha:'2026-09-23', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 };
const p=G.qbPartirPago(M154, 53);
ok('una cuota de 53 se parte como la Nueva metodología: 25,00 de la moto', cerca(p.amortizacion, 25));
ok('...3,17 de intereses', cerca(p.intereses, 3.17));
ok('...y 24,83 de Pagasi Protect', cerca(p.protect, 24.83));
ok('...usando la metodología, no un cálculo propio', p.como==='metodologia');
const R=G._metoRepartir(G._metoDeCredito(M154), 53);
ok('las partes son las mismas que muestra la pestaña Nueva metodología', cerca(p.amortizacion, R.recuperacion) && cerca(p.intereses, R.intereses) && Math.abs(p.protect-R.protect)<=0.011);

const L=G.qbLineas(p);
ok('la factura tiene 3 líneas con los nombres del catálogo del contador: CARTERA, INTERESES e INGRESOS POR PAGASI PROTEC', L.length===3 && L[0].servicio==='CARTERA DE FINANCIAMIENTO' && L[1].servicio==='INTERESES DE FINANCIAMIENTO' && L[2].servicio==='INGRESOS POR PAGASI PROTEC');
ok('Cartera e Intereses van sin IVA', L[0].codigo==='No VAT (0%)' && L[0].iva===0 && L[1].codigo==='No VAT (0%)' && L[1].iva===0);
ok('el IVA va en el Protect, por dentro: el IVA de la metodología (3,42) sobre una base de 21,40', L[2].codigo==='16.0% S (16%)' && cerca(L[2].monto, 21.40) && cerca(L[2].iva, 3.42));
ok('...y el 16 % de esa base da exactamente ese IVA (si QuickBooks lo recalcula, no cambia)', r2(L[2].monto*0.16)===L[2].iva);
ok('...el centavo que eso mueve va a la línea sin IVA (Cartera 25,01)', cerca(L[0].monto, 25.01));
ok('montos + IVA = lo que pagó el cliente, al centavo', cerca(L.reduce((a,l)=>a+l.monto+l.iva,0), 53));

// Al centavo con cualquier monto (abonos, liquidaciones, centavos sueltos)
const montos=[53, 30, 23, 0.01, 0.07, 100.99, 1172, 1272, 7.77, 53.01];
ok('con cualquier monto, la factura suma exactamente lo cobrado', montos.every(m=>{ const ls=G.qbLineas(G.qbPartirPago(M154,m)); return cerca(ls.reduce((a,l)=>a+l.monto+l.iva,0), m); }));
ok('...y ninguna línea sale negativa', montos.every(m=>G.qbLineas(G.qbPartirPago(M154,m)).every(l=>l.monto>=0 && l.iva>=0)));
const muchos=[]; for(let c=1;c<=20000;c+=7) muchos.push(c/100);
ok('...de 0,01 a 200: el IVA de cada línea es siempre el 16 % de su monto y todo suma lo cobrado', muchos.every(m=>{ const ls=G.qbLineas(G.qbPartirPago(M154,m)); return cerca(ls.reduce((a,l)=>a+l.monto+l.iva,0), m) && ls.every(l=>l.monto>=0 && (l.codigo!=='16.0% S (16%)' || r2(l.monto*0.16)===l.iva)); }));

// Créditos donde la metodología no aplica: se reparte como Dashboard Finanzas
const SINCUOTA={ id:'M-200', cli:'X', fecha:'2026-09-01', estado:'activo', precio:1000, ini:400, total:1200 };
const ps=G.qbPartirPago(SINCUOTA, 100);
ok('crédito sin cuota: la moto en proporción al plan y el resto a intereses (como Dashboard Finanzas)', ps.como==='sin-protect' && cerca(ps.amortizacion, 50) && cerca(ps.intereses, 50) && ps.protect===0);
const VIEJO={ id:'CRED-100', cli:'Y', fecha:'2026-03-01', estado:'activo', precio:1000, ini:400, cuotaQ:50, totalCuotas:24, total:1200 };
const pv=G.qbPartirPago(VIEJO, 100);
ok('PAGASI 18 hasta el CRED-498: el resto es "otros servicios", sin Protect ni interés', pv.como==='servicios' && cerca(pv.amortizacion, 50) && cerca(pv.servicios, 50) && pv.protect===0 && pv.intereses===0);
const lv=G.qbLineas(pv);
ok('...y en la factura va como "OTROS SERVICIOS", sin IVA', lv.length===2 && lv[1].servicio==='OTROS SERVICIOS' && lv[1].iva===0);
const BAJA={ id:'M-201', cli:'Z', fecha:'2026-09-01', estado:'activo', precio:1350, ini:750, cuotaQ:26, totalCuotas:24, total:624 };
const pb=G.qbPartirPago(BAJA, 26);
ok('cuota que no llega al 12 % (sin Protect): no inventa Protect y suma lo cobrado', pb.protect===0 && cerca(pb.amortizacion+pb.intereses, 26));

// ── Saldo por cobrar a la fecha de corte (motor contable) ─────────────────────────────────────────────────
const pagos154=[
  { id:'PAG-1', cred:'M-154', fecha:'2026-10-08', monto:53, estado:'confirmado', metodo:'100% Banco 26' },
  { id:'PAG-2', cred:'M-154', fecha:'2026-10-20', monto:30, estado:'confirmado' },
  { id:'PAG-3', cred:'M-154', fecha:'2026-10-22', monto:76, estado:'confirmado' },
  { id:'PAG-4', cred:'M-154', fecha:'2026-10-25', monto:53, estado:'pendiente' },
  { id:'PAG-INI', cred:'M-154', fecha:'2026-09-23', monto:750, estado:'confirmado', esInicial:true, tipoOperacion:'inicial_credito' }
];
ok('saldo al 30-sep: las 24 cuotas enteras (la inicial no cuenta)', G.qbSaldoCredito(M154, pagos154, '2026-09-30')===1272);
ok('saldo al 20-oct: solo los pagos hasta ese día (53 + 30)', G.qbSaldoCredito(M154, pagos154, '2026-10-20')===1189);
ok('saldo al 31-oct: el pago pendiente no cuenta', G.qbSaldoCredito(M154, pagos154, '2026-10-31')===1113);
ok('un crédito creado después del corte no tiene saldo a esa fecha', G.qbSaldoCredito(M154, pagos154, '2026-09-01')===null);
ok('un crédito cancelado debe 0', G.qbSaldoCredito(Object.assign({}, M154, {estado:'cancelado'}), pagos154, '2026-10-31')===0);
ok('uno sin aprobar no cuenta', G.qbSaldoCredito(Object.assign({}, M154, {estado:'pendiente_revision'}), pagos154, '2026-10-31')===null);
const LIQ=Object.assign({}, M154, { id:'M-155', descuentoLiquidacion:100, estado:'completado' });
const pagosLiq=[{ id:'P-LIQ-1', cred:'M-155', fecha:'2026-10-15', monto:1172, estado:'confirmado', tipo:'liquidacion', referencia:'LIQ-ANT' }];
ok('liquidado con descuento: después de la liquidación debe 0', G.qbSaldoCredito(LIQ, pagosLiq, '2026-10-31')===0);
ok('...y antes de liquidar debía todo: el descuento no se aplica antes de tiempo', G.qbSaldoCredito(LIQ, pagosLiq, '2026-10-10')===1272);

// ── Todo junto, como en la pantalla ───────────────────────────────────────────────────────────────────────
const clientes=[
  { id:7, nombre:'JESUS GALARRAGA', cedula:'V-12345678', email:'jg@correo.com', tel:'0414-1111111', wa:'0424-2222222', dir:'AV. PRINCIPAL; CASA 3', ciudad:'CARACAS', estado_ubi:'DISTRITO CAPITAL', estado:'activo' },
  { id:8, nombre:'JESUS GALARRAGA', cedula:'12.345.678', tel:'0414-1111111', estado:'activo' },            // misma cédula: la misma persona
  { id:9, nombre:'MARIA PEREZ', cedula:'V-9999999', tel:'0412-3333333', wa:'0412-3333333', estado:'activo' },
  { id:10, nombre:'MARIA PEREZ', cedula:'V-8888888', tel:'0412-4444444', estado:'activo' },               // otra persona con el mismo nombre
  { id:11, nombre:'ÑANDÚ ROJAS', cedula:'V-5555555', estado:'lead', origen:'web' }                       // un lead sin crédito no va
];
const creds=[
  M154,
  { id:'M-156', cli:'JESUS GALARRAGA', cliId:8, fecha:'2026-10-01', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 },
  { id:'M-157', cli:'MARIA PEREZ', clienteId:9, fecha:'2026-09-10', estado:'mora', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 },
  { id:'M-158', cli:'MARIA PEREZ', clienteId:10, fecha:'2026-09-12', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 },
  { id:'M-159', cli:'SIN FICHA', fecha:'2026-09-15', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 },
  { id:'M-160', cli:'BORRADO', fecha:'2026-09-15', estado:'activo', eliminado:true, precio:1, ini:0, cuotaQ:1, totalCuotas:2 }
];
const pagos=pagos154.concat([
  { id:'PAG-5', cred:'M-157', fecha:'2026-10-05', monto:53, estado:'confirmado', metodo:'Binance 26' },
  { id:'PAG-6', cred:'M-158', fecha:'2026-10-09', monto:53, estado:'confirmado', metodo:'Zelle Pagasi' },      // cuenta que QuickBooks no conoce
  { id:'PAG-10', cred:'M-157', fecha:'2026-10-19', monto:106, estado:'confirmado', metodo:'Efectivo USD' },   // dos cuotas completas de una vez
  { id:'PAG-7', cred:'M-158', fecha:'2026-09-30', monto:53, estado:'confirmado' },                       // otro mes
  { id:'PAG-8', cred:'M-159', fecha:'2026-10-11', monto:53, estado:'confirmado', eliminado:true },      // eliminado
  { id:'PAG-9', cred:'M-999', fecha:'2026-10-12', monto:40, estado:'confirmado' }                       // sin crédito
]);
const facturas=[
  { id:'FAC-1', numero:'00000202', pagoId:'PAG-2', fechaEmision:'2026-10-21', subtotal:25.86, iva:4.14, total:30, anulada:false },
  { id:'FAC-2', numero:'00000203', pagoId:'PAG-3', fechaEmision:'2026-10-22', subtotal:65.52, iva:10.48, total:76, anulada:true }
];
const concesionarios=[{ id:'CONC-1', nombre:'MOTOS DEL ESTE', rif:'J-40000000-1', telefono:'0212-5555555', direccion:'AV. FRANCISCO DE MIRANDA', ciudad:'CARACAS', createdAt:'2026-08-01T10:00:00.000Z' }];
const motos=[{ id:31, concesionarioId:'CONC-1' }];
const egresos=[
  { id:101, fecha:'2026-10-03', monto:116, concepto:'Papelería', categoria:'operativo', fiscal:{ proveedor:'LIBRERIA EL SOL', rif:'j-30111222-3', numero:'A-77', control:'00-1', fecha:'2026-10-02', exento:10, base:100, alicuota:0.16, tipo:'01-REG' } },
  { id:102, fecha:'2026-10-05', monto:500, concepto:'Compra de moto · BERA (31) (parte 1/2)', categoria:'inventario', origenAuto:'compra_moto', motoIdRef:31 },
  { id:103, fecha:'2026-10-05', monto:700, concepto:'Compra de moto · BERA (31) (parte 2/2)', categoria:'inventario', origenAuto:'compra_moto', motoIdRef:31 },
  { id:104, fecha:'2026-10-06', monto:50, concepto:'Almuerzo', categoria:'otros' },                                   // sin proveedor
  { id:105, fecha:'2026-10-07', monto:900, concepto:'Nómina', categoria:'nomina' },                                    // no es factura de proveedor
  { id:106, fecha:'2026-10-08', monto:20, concepto:'Devolución', categoria:'operativo', fiscal:{ proveedor:'LIBRERIA EL SOL', rif:'J-30111222-3', numero:'NC-1', tipo:'03-ANUL', base:10, alicuota:0.16 } },
  { id:107, fecha:'2026-10-09', monto:58, concepto:'Tóner', categoria:'operativo', fiscal:{ proveedor:'LIBRERIA EL SOL', rif:'J-30111222-3', numero:'A-77', base:50, alicuota:0.16 } },   // mismo N°
  { id:108, fecha:'2026-09-09', monto:10, concepto:'Agua', categoria:'operativo', fiscal:{ proveedor:'AGUAS C.A.', rif:'J-1' } },            // otro mes: proveedor sí, factura no
  { id:109, fecha:'2026-10-10', monto:5, concepto:'Borrado', categoria:'operativo', eliminado:true, fiscal:{ proveedor:'FANTASMA', rif:'J-2' } },
  { id:110, fecha:'2026-10-11', monto:1392, concepto:'Cascos', categoria:'operativo', fiscal:{ proveedor:'MOTOS DEL ESTE', rif:'J-40000000-1', numero:'S-1', base:1200, alicuota:0.16 } }   // lo que la sede SÍ factura
];
const D=G.qbDatos({ creds, pagos, clientes, facturas, egresos, motos, concesionarios, periodo:'2026-10', corte:'2026-09-30' });

// 01 Clientes
const cli=D.filas.clientes, porNombre=n=>cli.find(r=>r[0]===n);
ok('01: una fila por persona con crédito (las dos fichas con la misma cédula son una)', cli.filter(r=>/^JESUS GALARRAGA/.test(r[0])).length===1);
ok('...dos personas que se llaman igual: la del crédito más antiguo con su nombre y la otra con su cédula', porNombre('MARIA PEREZ')[13]==='V-9999999' && !!porNombre('MARIA PEREZ (V-8888888)'));
ok('...el crédito sin ficha también tiene su cliente', !!porNombre('SIN FICHA'));
ok('...un lead sin crédito y un crédito borrado no van', !cli.some(r=>/ÑANDÚ|BORRADO/.test(r[0])));
ok('...el cobro de un crédito que ya no existe no inventa cliente', !cli.some(r=>/M-999/.test(r.join(' '))));
const jg=porNombre('JESUS GALARRAGA');
ok('...con los datos de la ficha en las columnas de la plantilla', jg[1]==='jg@correo.com' && jg[2]==='0414-1111111' && jg[3]==='0424-2222222' && jg[6]==='AV. PRINCIPAL; CASA 3' && jg[7]==='CARACAS' && jg[8]==='DISTRITO CAPITAL' && jg[13]==='V-12345678' && jg[14]==='USD');
ok('...Movil vacío cuando el WhatsApp es el mismo teléfono', porNombre('MARIA PEREZ')[3]==='');
ok('...Balance de Apertura = lo que debía al corte: M-154 entero (M-156 todavía no existía)', jg[11]===1272 && jg[12]==='2026-09-30');
ok('...y el "Estado" es la región (estado_ubi), no el estatus del cliente', jg[8]!=='activo');

// 02 Servicios: la plantilla del contador, con los cambios a la vista
const sv=D.filas.servicios;
ok('02: las 19 columnas de la plantilla y las 42 filas del contador (28-oct)', G.QB_ARCHIVOS.servicios.enc.length===19 && sv.length===42 && sv.every(r=>r.length===19));
ok('...CARTERA DE FINANCIAMIENTO tal cual la del contador, con su cuenta', sv[0].join('|')==='CARTERA DE FINANCIAMIENTO|Ingresos|Sin Inventario||FINANCIAMIENTO DE MOTO||1108001 CARTERA DE FINANCIAMIENTO|AMORTIZACION DE FINANCIAMIENTO||1108001 CARTERA DE FINANCIAMIENTO||||No VAT (0%)||No VAT (0%)|||');
ok('...INTERESES sin IVA (el contador ya adoptó la regla de Adam)', sv[1][0]==='INTERESES DE FINANCIAMIENTO' && sv[1][13]==='No VAT (0%)' && sv[1][6]==='4101001 INGRESOS POR INTERESES DE FINANCIAMIENTO');
ok('...COMISION POR MOROSIDAD e INGRESOS POR PAGASI PROTEC con el 16 %, y los gastos con su cuenta', sv[2][0]==='COMISION POR MOROSIDAD' && sv[2][13]==='16.0% S (16%)' && sv[3][0]==='INGRESOS POR PAGASI PROTEC' && sv[3][13]==='16.0% S (16%)' && sv[4][0]==='HONORARIOS PROFESIONALES' && sv[4][9]==='6101002 HONORARIOS PROFESIONALES' && sv[4][15]==='16.0% S (16%)');
ok('...ninguna fila trae el "N/A" de la plantilla vieja: es el archivo del contador tal cual', !sv.some(r=>r.indexOf('N/A')>-1));
ok('..."OTROS SERVICIOS" no sale donde no hay contratos viejos (PAGASI 26)', !sv.some(r=>r[0]==='OTROS SERVICIOS'));
const D18=G.qbDatos({ creds:[VIEJO], pagos:[], clientes:[], facturas:[], egresos:[], periodo:'2026-10', corte:'2026-09-30' });
ok('...y sí sale donde los hay (PAGASI 18), como fila 43', D18.filas.servicios.length===43 && D18.filas.servicios.some(r=>r[0]==='OTROS SERVICIOS'));
ok('...las facturas (03) y los recibos (04) usan exactamente los nombres del 02', D.filas.facturas.every(r=>sv.some(s=>s[0]===r[5])) && D.filas.contado.every(r=>sv.some(s=>s[0]===r[6])));

// 03 Facturas
// 03 Facturas a crédito (los abonos) y 04 Recibos de contado (cuotas completas de una vez), el contador 29-oct-2026
const fc=D.filas.facturas, nums=[...new Set(fc.map(r=>r[0]))];
const ct=D.filas.contado, numsC=[...new Set(ct.map(r=>r[0]))];
ok('03: a crédito van los abonos: el de 30 a la cuota 2 y el de 76 que la completa y paga la 3 (varios pagos a una cuota)', nums.length===2 && nums.join(',')==='PAG-2,PAG-3');
ok('04: de contado van los que pagan cuotas completas de una vez, en orden de fecha y con el N° del pago', numsC.length===4 && numsC.join(',')==='PAG-5,PAG-1,PAG-6,PAG-10');
ok('...ningún cobro está en los dos archivos, y entre los dos están todos', nums.every(n=>numsC.indexOf(n)<0) && nums.length+numsC.length===6);
ok('...sin la inicial, el pendiente, el eliminado, el de otro mes ni el que no tiene crédito', !fc.concat(ct).some(r=>/PAG-(INI|4|7|8|9)$/.test(r[0])));
ok('...el N° de la factura fiscal, si se emitió, va en la nota (la anulada no cuenta)', fc.find(r=>r[0]==='PAG-2')[14]==='CONTRATO Nº M-154 · FACTURA FISCAL Nº 00000202' && fc.find(r=>r[0]==='PAG-3')[14]==='CONTRATO Nº M-154');
const f2=fc.find(r=>r[0]==='PAG-2');
ok('...03: la fecha es la del cobro aunque tenga factura fiscal, con vencimiento a 15 días y Net 15', f2[2]==='20/10/2026' && f2[3]==='04/11/2026' && f2[4]==='Net 15');
ok('...03: Service Date = vencimiento de la cuota que pagó (el abono de 30 es de la cuota 2)', f2[13]==='23/10/2026');
const f1=ct.filter(r=>r[0]==='PAG-1');
ok('04: la primera línea con todo: cliente, fecha dd/mm/aaaa, cuenta de depósito, Memo, moneda y Service Date', f1[0].join(';')==='PAG-1;JESUS GALARRAGA;08/10/2026;1103001 100% BANCO CTA. CTE Nº 68129;;CONTRATO Nº M-154;CARTERA DE FINANCIAMIENTO;AMORTIZACION DE FINANCIAMIENTO;1;25.01;25.01;No VAT (0%);0;USD;08/10/2026');
ok('...las siguientes con el N°, la cuenta de depósito (como la plantilla) y la línea', f1[1].join(';')==='PAG-1;;;1103001 100% BANCO CTA. CTE Nº 68129;;;INTERESES DE FINANCIAMIENTO;INTERESES POR FINANCIAMIENTO;1;3.17;3.17;No VAT (0%);0;;' && f1[2].join(';')==='PAG-1;;;1103001 100% BANCO CTA. CTE Nº 68129;;;INGRESOS POR PAGASI PROTEC;INGRESOS POR PAGASI PROTEC;1;21.4;21.4;16.0% S (16%);3.42;;');
ok('...la cuenta de depósito sale del "Recibido en" del pago: Binance → 1105001, Efectivo → 1102001', ct.find(r=>r[0]==='PAG-5')[3]==='1105001 BINANCE' && ct.find(r=>r[0]==='PAG-10')[3]==='1102001 CAJA EN MONEDA EXTRANJERA USD');
ok('...un "Recibido en" que QuickBooks no conoce sale con su nombre y el control lo avisa', ct.find(r=>r[0]==='PAG-6')[3]==='ZELLE PAGASI' && D.controles.contado.some(c=>/Cuenta de depósito/.test(c.concepto) && c.estado==='REVISAR: 1 sin cuenta'));
const f10=ct.filter(r=>r[0]==='PAG-10');
ok('...dos cuotas completas en un solo pago: un solo recibo que suma lo cobrado, con el primer vencimiento', cerca(f10.reduce((a,r)=>a+r[10]+r[12],0), 106) && f10[0][14]==='10/10/2026' && D.controles.contado.some(c=>/varias cuotas/.test(c.concepto) && c.estado==='1'));
ok('...el cliente de cada archivo es el mismo nombre de la Ficha de Clientes', fc.concat(ct).filter(r=>r[1]).every(r=>cli.some(c=>c[0]===r[1])));
ok('...la de la otra MARIA PEREZ va a su propia ficha', ct.find(r=>r[0]==='PAG-6')[1]==='MARIA PEREZ (V-8888888)');
const C3=D.controles.facturas, C4=D.controles.contado;
ok('...control: lo facturado cuadra con lo cobrado en los dos archivos', C3.some(c=>/igual a lo cobrado/.test(c.concepto) && c.estado==='CUADRA') && C4.some(c=>/igual a lo cobrado/.test(c.concepto) && c.estado==='CUADRA'));
ok('...control: 2 abonos ($106) + 4 de contado ($265) = los 6 cobros del mes', C3.some(c=>/^Abonos del mes/.test(c.concepto) && /^2 · /.test(c.estado) && /106/.test(c.estado)) && C3.some(c=>/Crédito \(03\) \+ Contado \(04\)/.test(c.concepto) && /^6 · /.test(c.estado) && /371/.test(c.estado)) && C4.some(c=>/^Cobros de contado/.test(c.concepto) && /^4 · /.test(c.estado) && /265/.test(c.estado)));
ok('...control: el de 76 (más de una cuota sin ser cuotas completas) queda contado aparte', C3.some(c=>/más de una cuota sin ser cuotas completas/.test(c.concepto) && c.estado==='1'));
ok('...control: ningún cobro de octubre se anotó después de cerrar el mes', C3.some(c=>/después de que terminó el mes/.test(c.concepto) && c.estado==='OK') && C4.some(c=>/después de que terminó el mes/.test(c.concepto) && c.estado==='OK'));
ok('...control: cuenta las iniciales que no van y el cobro sin crédito', C3.some(c=>/Iniciales/.test(c.concepto) && /^0 /.test(c.estado)) && C3.some(c=>/sin su crédito/.test(c.concepto) && c.estado==='REVISAR: 1'));
ok('...suma de montos + IVA del 03 = 106 y del 04 = 265', cerca(r2(fc.reduce((a,r)=>a+r[9]+r[11],0)), 106) && cerca(r2(ct.reduce((a,r)=>a+r[10]+r[12],0)), 265));
ok('...el 04 con el encabezado exacto de la plantilla del contador', G.qbCsvTexto(G.QB_ARCHIVOS.contado.enc, ct).split('\r\n')[0]==='*SalesReceiptNo;Customer;*SalesReceiptDate;*DepositAccount;Location;Memo;Item(Product/Service);ItemDescription;ItemQuantity;ItemRate;*ItemAmount;*ItemTaxCode;ItemTaxAmount;Currency;Service Date');
ok('...y el "Nº" de la cuenta del banco sale en Windows-1252 como el byte BA, igual que en su archivo', (()=>{ const b=G.qbWin1252(G.QB_CUENTAS_DEPOSITO[0].cuenta); return b.length===G.QB_CUENTAS_DEPOSITO[0].cuenta.length && Array.from(b).indexOf(0xBA)>-1; })());

// La regla de contado mira el MONTO contra la cuota, no el reparto del motor (lo que encontró la revisión del 29-oct-2026)
const baseQ=(extra)=>Object.assign({ creds:[], pagos:[], clientes, facturas:[], egresos:[], motos:[], concesionarios:[], periodo:'2026-10', corte:'2026-09-30' }, extra);
const R1={ id:'M-R', cli:'JESUS GALARRAGA', clienteId:7, fecha:'2026-09-01', estado:'activo', precio:1350, ini:750, cuotaQ:71.51, totalCuotas:24, total:1716.24 };
const pagosR=[71.51, 72, 71.51, 71.50, 60, 143.02].map((m,i)=>({ id:'PAG-R'+(i+1), cred:'M-R', fecha:'2026-10-'+String(1+i*4).padStart(2,'0'), monto:m, estado:'confirmado', metodo:'Efectivo' }));
const DR=G.qbDatos(baseQ({ creds:[R1], pagos:pagosR }));
const idsC=[...new Set(DR.filas.contado.map(r=>r[0]))], idsF=[...new Set(DR.filas.facturas.map(r=>r[0]))];
ok('redondeo: 72 o 71,50 por una cuota de 71,51 es la cuota completa (contado), y no vuelve "abono" a los pagos exactos que siguen', idsC.join(',')==='PAG-R1,PAG-R2,PAG-R3,PAG-R4,PAG-R6' && idsF.join(',')==='PAG-R5');
ok('...60 por una cuota de 71,51 es un abono (crédito); 143,02 son dos cuotas completas (un recibo); los dos redondeos se cuentan', DR.controles.contado.some(c=>/varias cuotas/.test(c.concepto) && c.estado==='1') && DR.controles.contado.some(c=>/redonde/.test(c.concepto) && c.estado==='2') && cerca(DR.filas.contado.filter(r=>r[0]==='PAG-R6').reduce((a,r)=>a+r[10]+r[12],0), 143.02));
const PX={ id:'PAG-X', cred:'M-154', fecha:'2026-10-20', monto:53, estado:'confirmado', metodo:'Binance 26' };
const DA=G.qbDatos(baseQ({ creds:[M154], pagos:[PX] }));
const DB=G.qbDatos(baseQ({ creds:[M154], pagos:[PX, { id:'PAG-Y', cred:'M-154', fecha:'2026-10-15', monto:30, estado:'confirmado', creadoEn:'2026-11-05T14:00:00.000Z' }] }));
ok('un abono anotado en noviembre con fecha de octubre no cambia de archivo al cobro ya exportado: PAG-X sigue en el 04', DA.filas.contado.some(r=>r[0]==='PAG-X') && DB.filas.contado.some(r=>r[0]==='PAG-X') && DB.filas.facturas.some(r=>r[0]==='PAG-Y'));
ok('...pero el control del 03 avisa que ese abono se registró después de cerrar el mes', DB.controles.facturas.some(c=>/después de que terminó el mes/.test(c.concepto) && c.estado==='REVISAR: 1') && DA.controles.facturas.some(c=>/después de que terminó el mes/.test(c.concepto) && c.estado==='OK'));
const DL=G.qbDatos(baseQ({ creds:[LIQ], pagos:pagosLiq }));
ok('la liquidación anticipada es un solo cobro que salda el crédito: va de contado, y el control la cuenta', DL.filas.contado.some(r=>r[0]==='P-LIQ-1') && !DL.filas.facturas.length && DL.controles.contado.some(c=>/Liquidaciones anticipadas/.test(c.concepto) && c.estado==='1'));
const DN=G.qbDatos(baseQ({ creds:[M154], pagos:[{ id:'PAG-N', cred:'M-154', fecha:'2026-10-02', monto:53, estado:'confirmado', metodo:'', cuenta:'—' }] }));
ok('un pago guardado sin cuenta ("—") sale como SIN CUENTA, no con la raya', DN.filas.contado[0][3]==='SIN CUENTA' && DN.controles.contado.some(c=>/Cuenta de depósito/.test(c.concepto) && c.estado==='REVISAR: 1 sin cuenta'));
const DS=G.qbDatos(baseQ({ creds:[Object.assign({}, M154, { id:'M-S', estado:'completado' })], pagos:[{ id:'PAG-S', cred:'M-S', fecha:'2026-10-02', monto:1272, estado:'confirmado' }, { id:'PAG-S2', cred:'M-S', fecha:'2026-10-09', monto:53, estado:'confirmado' }] }));
ok('un cobro que el motor no aplica a ninguna cuota (el crédito ya estaba saldado) va a crédito y el control lo avisa', DS.filas.facturas.some(r=>r[0]==='PAG-S2') && DS.controles.facturas.some(c=>/no aplica a ninguna cuota/.test(c.concepto) && c.estado==='REVISAR: 1'));

// 05 Proveedores
const pv5=D.filas.proveedores;
ok('05: un proveedor por RIF (mayúsculas y guiones no lo duplican)', pv5.filter(r=>/LIBRERIA EL SOL/.test(r[1])).length===1);
ok('...la sede que factura algo sale con su teléfono, dirección, ciudad y fecha de creación', (()=>{ const s=pv5.find(r=>r[1]==='MOTOS DEL ESTE'); return s && s[0]==='MOTOS DEL ESTE' && s[3]==='0212-5555555' && s[7]==='AV. FRANCISCO DE MIRANDA' && s[8]==='CARACAS' && s[12]==='2026-08-01' && s[13]==='J-40000000-1' && s[14]==='USD'; })());
ok('...la primera columna (el nombre que QuickBooks exige) lleva el nombre: cada *Supplier del 06 está ahí', pv5.every(r=>r[0]) && D.filas.compras.every(r=>pv5.some(v=>v[0]===r[1])));
ok('...el de otro mes también está (la ficha es de todos los meses)', pv5.some(r=>r[1]==='AGUAS C.A.'));
ok('...un gasto sin proveedor no inventa uno, y lo borrado no va', !pv5.some(r=>/Almuerzo|FANTASMA|Nómina/.test(r[1])));

// 06 Facturas de proveedor
const cp=D.filas.compras;
const lib=cp.filter(r=>r[0]==='A-77');
ok('06: la factura con exento y base va en dos líneas, cada una con su código', lib.length===2 && lib[0][9]===10 && lib[0][10]==='No VAT (0%)' && lib[0][11]===0 && lib[1][9]===100 && lib[1][10]==='16.0% S (16%)' && lib[1][11]===16);
ok('...fechas como en la plantilla 06 (mm/dd/aaaa) y vencimiento a 15 días', lib[0][2]==='10/02/2026' && lib[0][3]==='10/17/2026' && lib[0][4]==='Net 15');
ok('...cada línea repite la cabecera, como la plantilla; la categoría vieja "operativo" va con su nombre', lib[1][1]==='LIBRERIA EL SOL' && lib[1][12]==='USD' && lib[1][7]==='OFICINA Y SERVICIOS');
ok('...el mismo N° del mismo proveedor no se mezcla en una sola factura', cp.some(r=>r[0]==='A-77-2' && r[9]===50));
const sede=cp.filter(r=>r[1]==='MOTOS DEL ESTE');
ok('...la compra de la moto NO va al 06 (la sede no la factura a PAGASI); lo que la sede sí factura, sí', sede.length===1 && sede[0][0]==='S-1' && sede[0][9]===1200 && !cp.some(r=>/Compra de moto|EG-102|EG-103/.test(r.join(' '))));
ok('...sin la nómina, la nota de crédito ni lo de otro mes', !cp.some(r=>/Nómina|NC-1|Agua/.test(r.join(' '))));
ok('...el gasto sin proveedor SÍ va (el contador: que se reflejen todos), como SIN PROVEEDOR', cp.some(r=>r[1]==='SIN PROVEEDOR' && /Almuerzo/.test(r[8]) && r[9]===50) && pv5.some(r=>r[0]==='SIN PROVEEDOR'));
ok('...un gasto con categoría del contador sale a su cuenta de QuickBooks', (()=>{ const Dc=G.qbDatos({ creds:[], pagos:[], clientes:[], facturas:[], egresos:[{ id:700, fecha:'2026-10-05', monto:50, categoria:'servicios-de-telefonia', concepto:'MOVISTAR', fiscal:{ proveedor:'MOVISTAR', rif:'J-1', numero:'5', base:50, alicuota:0 } }], motos:[], concesionarios:[], periodo:'2026-10', corte:'2026-09-30' }); return Dc.filas.compras[0][7]==='6102001 SERVICIO DE TELEFONIA E INTERNET' && !Dc.compras.bills[0].avisos.some(a=>/sin cuenta/.test(a)); })());
ok('...y los controles dicen cuántos quedaron así y por qué', D.compras.sinProveedor.length===1 && D.compras.notasCredito.length===1 && D.controles.compras.some(c=>/sin proveedor/.test(c.concepto) && c.estado==='REVISAR: 1'));
ok('...y cuentan las compras de motos del mes que no van (2 egresos, $1.200), para que se entienda la diferencia con Egresos', D.controles.compras.some(c=>/Compras de motos del mes/.test(c.concepto) && /^2 · /.test(c.estado) && /1.?200/.test(c.estado)));

// ── Los archivos ───────────────────────────────────────────────────────────────────────────────────────────
const csv=G.qbCsvTexto(G.QB_ARCHIVOS.facturas.enc, fc);
ok('CSV: separado por ";" con CRLF y CRLF al final, como el del contador', csv.split('\r\n').length===fc.length+2 && csv.endsWith('\r\n') && !/[^\r]\n/.test(csv));
ok('...el encabezado exacto de la plantilla 03', csv.split('\r\n')[0]==='Nº Factura;Cliente;Fecha Factura;Fecha Vcmto.;Terminos;Producto / Servicio;Descripcion;ItemQuantity;ItemRate;*ItemAmount;*ItemTaxCode;ItemTaxAmount;Currency;Service Date;Note to customer');
const b=G.qbWin1252(csv);
ok('...en Windows-1252: "Nº" es N + byte BA, como en el archivo del contador', b[0]===0x4E && b[1]===0xBA && b[2]===0x20 && b.length===csv.length);
const raro=G.qbWin1252('ÑÁé€—😀');
ok('...Ñ, acentos, € y raya larga a su byte; lo que no existe en 1252 queda "?"', [...raro].join(',')===[0xD1,0xC1,0xE9,0x80,0x97,0x3F].join(','));
ok('...un texto con ";" va entre comillas para no romper las columnas', G.qbCsvTexto(['a','b'], [['x;y','z"w']]).split('\r\n')[1]==='"x;y";"z""w"');
const csv6=G.qbCsvTexto(G.QB_ARCHIVOS.compras.enc, cp);
ok('...el 06 con su encabezado exacto', csv6.split('\r\n')[0]==='*BillNo;*Supplier;*BillDate;*DueDate;Terms;Location;Memo;*Account;LineDescription;*LineAmount;*LineTaxCode;LineTaxAmount;Currency');
ok('...los montos con punto decimal y sin separador de miles', /;1200;16\.0% S \(16%\);192;USD\r\n/.test(csv6) && /;3\.42;/.test(G.qbCsvTexto(G.QB_ARCHIVOS.contado.enc, ct)));

const hoja=G.qbHoja('clientes', cli);
ok('Excel: fila 1 = los encabezados de la plantilla, sin títulos encima (QuickBooks lee la primera fila)', hoja.rows[0].map(c=>c.v).join('|')===G.QB_ARCHIVOS.clientes.enc.join('|') && hoja.name==='02. Importacion de Clientes');
const xml=G.xlsxArchivos([G.qbHoja('clientes', [['A','','','','','','','','','','Venezuela',100,'2026-10-20','V-1','USD']])]).find(f=>f.name==='xl/worksheets/sheet1.xml').data;
ok('...la Fecha es fecha de Excel de verdad (20-oct-2026 = 46315), como en la plantilla', /<c r="M2" s="15"><v>46315<\/v><\/c>/.test(xml));
ok('...el estilo de fecha existe en el libro', /<cellXfs count="16">/.test(G.xlsxArchivos([hoja]).find(f=>f.name==='xl/styles.xml').data) && G.XLSX_ESTILOS.fecha===15);
ok('...el balance es número, no texto', /<c r="L2" s="11"><v>100<\/v><\/c>/.test(xml));
ok('...cada archivo con la hoja de su plantilla', G.qbHoja('servicios',[]).name==='sample-products' && G.qbHoja('proveedores',[]).name==='05. Ficha de Proveedores');

// ── La búsqueda elige facturas enteras ─────────────────────────────────────────────────────────────────────
const V=G._qbVer(Object.assign({}, D, { st:{ q:'M-154' } }), 'facturas');
ok('buscar un contrato trae sus facturas con todas sus líneas', V.filtrado && V.filas.length===6 && V.filas.every(r=>/^(PAG-2|PAG-3)$/.test(r[0])));
const VC=G._qbVer(Object.assign({}, D, { st:{ q:'M-154' } }), 'contado');
ok('...y en el 04 sus recibos enteros', VC.filtrado && VC.filas.length===3 && VC.filas.every(r=>r[0]==='PAG-1'));
const V6=G._qbVer(Object.assign({}, D, { st:{ q:'papeleria' } }), 'compras');
ok('...y en el 06 también (ignorando acentos)', V6.filas.length===2 && V6.filas.every(r=>r[0]==='A-77'));

// ── Lo que encontró la revisión antes de publicar (23-oct-2026) ─────────────────────────────────────────
const base=(extra)=>Object.assign({ creds:[], pagos:[], clientes:[], facturas:[], egresos:[], motos:[], concesionarios:[], periodo:'2026-10', corte:'2026-10-31' }, extra);
const fila01=(Dx,n)=>Dx.filas.clientes.find(r=>r[0]===n);

// El nombre en QuickBooks no cambia de un mes a otro cuando aparece alguien que se llama igual
const A1={ id:1, nombre:'MARIA PEREZ', cedula:'V-1' }, A2={ id:2, nombre:'Maria Perez', cedula:'V-2' };
const cA={ id:'M-1', cli:'MARIA PEREZ', clienteId:1, fecha:'2026-09-01', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 };
const cB={ id:'M-9', cli:'Maria Perez', clienteId:2, fecha:'2026-11-05', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 };
const pA={ id:'PAG-A', cred:'M-1', fecha:'2026-12-01', monto:53, estado:'confirmado' };
const oct=G.qbDatos(base({ creds:[cA], clientes:[A1] }));
const dic=G.qbDatos(base({ creds:[cA,cB], clientes:[A1,A2], pagos:[pA], periodo:'2026-12' }));
ok('nombre estable: la que ya estaba sigue llamándose igual cuando llega otra con el mismo nombre', oct.filas.clientes[0][0]==='MARIA PEREZ' && !!fila01(dic,'MARIA PEREZ') && dic.filas.contado[0][1]==='MARIA PEREZ');
ok('...la que llega después lleva su cédula, aunque esté escrita en minúsculas (QuickBooks no distingue)', !!fila01(dic,'Maria Perez (V-2)'));

// Créditos sin cuota: el motor no arma el plan → total − cobrado, como en Pagos, y queda marcado
const sc={ id:'M-200', cli:'SIN CUOTA', fecha:'2026-09-01', estado:'activo', precio:1000, ini:400, total:1200, plazo:12 };
const Dsc=G.qbDatos(base({ creds:[sc], pagos:[{ id:'PAG-S', cred:'M-200', fecha:'2026-09-20', monto:100, estado:'confirmado' }] }));
ok('crédito sin cuota: su saldo es total − cobrado (1100), no 0', fila01(Dsc,'SIN CUOTA')[11]===1100);
ok('...y el control lo marca para revisar', Dsc.controles.clientes.some(c=>/sin cuota/.test(c.concepto) && /^REVISAR/.test(c.estado)));

// Liquidación condonada al 100 %: no hay pago LIQ, pero el crédito quedó cerrado
const cond=Object.assign({}, M154, { id:'M-300', estado:'completado', tipoCierre:'liquidacion_anticipada', descuentoLiquidacion:1272, fechaCompletado:'2026-10-10' });
ok('liquidación condonada entera: después de cerrarse debe 0', G.qbSaldoCredito(cond, [], '2026-10-31')===0);
ok('...y antes de cerrarse debía todo', G.qbSaldoCredito(cond, [], '2026-10-05')===1272);

// Precio menor que la inicial: no sale una línea negativa ni IVA de más
const raro2=Object.assign({}, M154, { id:'M-301', precio:0 });
const lr=G.qbLineas(G.qbPartirPago(raro2, 53));
ok('precio vacío o menor que la inicial: ninguna línea negativa y el Protect no se infla', lr.every(l=>l.monto>=0) && G.qbPartirPago(raro2, 53).como==='sin-protect');

// IGTF de la factura fiscal: no es ingreso, va en su línea
const facIg={ id:'FAC-9', numero:'00000300', pagoId:'PAG-1', fechaEmision:'2026-10-08', subtotal:44.36, iva:7.10, igtf:1.54, total:53, anulada:false };
const Dig=G.qbDatos(base({ creds:[M154], clientes, pagos:pagos154, facturas:[facIg] }));
const lig=Dig.filas.contado.filter(r=>r[0]==='PAG-1');   // PAG-1 paga la cuota completa: va en el 04
ok('IGTF: va en su propia línea "IGTF PERCIBIDO", sin IVA', lig.some(r=>r[6]==='IGTF PERCIBIDO' && r[10]===1.54 && r[12]===0));
ok('...lo demás se reparte sobre lo cobrado menos el IGTF, y todo suma lo cobrado', cerca(lig.reduce((a,r)=>a+r[10]+r[12],0), 53));
ok('...el 02 trae el servicio IGTF solo cuando hay facturas con IGTF', Dig.filas.servicios.some(r=>r[0]==='IGTF PERCIBIDO') && !D.filas.servicios.some(r=>r[0]==='IGTF PERCIBIDO'));

// El mismo cobro sale igual aunque su factura fiscal se emita después de exportar
const antes=G.qbDatos(base({ creds:[M154], clientes, pagos:pagos154 })).filas.contado.filter(r=>r[0]==='PAG-1')[0];
const despues=G.qbDatos(base({ creds:[M154], clientes, pagos:pagos154, facturas:[{ id:'F', numero:'00000999', pagoId:'PAG-1', fechaEmision:'2026-11-02', anulada:false }] })).filas.contado.filter(r=>r[0]==='PAG-1')[0];
ok('mismo N° y misma fecha antes y después de emitir la factura fiscal (reimportar no la duplica)', antes[0]===despues[0] && antes[2]===despues[2] && /00000999/.test(despues[5]));

// Mismo texto en los 6 archivos: invisibles, acentos descompuestos y letras fuera de Windows-1252
const raros=[{ id:5, nombre:'JOSÉ PEREZ', cedula:'V-5' }, { id:6, nombre:'ANA​LOPEZ', cedula:'V-6' }];
const cR=[{ id:'M-5', cli:'x', clienteId:5, fecha:'2026-09-01', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 }, { id:'M-6', cli:'y', clienteId:6, fecha:'2026-09-01', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 }];
const Dr=G.qbDatos(base({ creds:cR, clientes:raros, pagos:[{ id:'PAG-R', cred:'M-5', fecha:'2026-10-02', monto:53, estado:'confirmado' }], egresos:[{ id:300, fecha:'2026-10-02', monto:10, categoria:'otros', concepto:'x', fiscal:{ proveedor:'FERRETERÍA ŞAHİN', rif:'J-30000000-1', numero:'1', base:10, alicuota:0 } }] }));
ok('el nombre sale igual en el 01 (Excel) y en el 04 (CSV): acento compuesto, sin invisibles', fila01(Dr,'JOSÉ PEREZ') && fila01(Dr,'ANALOPEZ') && Dr.filas.contado[0][1]==='JOSÉ PEREZ');
ok('...y lo que Windows-1252 no tiene se cambia por su letra base en todos los archivos', Dr.filas.proveedores[0][0]==='FERRETERÍA SAHIN' && Dr.filas.compras[0][1]==='FERRETERÍA SAHIN');

// RIF de relleno: no junta proveedores distintos
const Dn=G.qbDatos(base({ egresos:[
  { id:401, fecha:'2026-10-02', monto:10, categoria:'otros', concepto:'clavos', fiscal:{ proveedor:'FERRETERIA EL CLAVO', rif:'N/A', numero:'881' } },
  { id:402, fecha:'2026-10-03', monto:5, categoria:'otros', concepto:'taxi', fiscal:{ proveedor:'TAXI JUAN', rif:'N/A', numero:'1' } } ] }));
ok('RIF "N/A": dos proveedores distintos siguen siendo dos, y van sin RIF', Dn.filas.proveedores.length===2 && Dn.filas.proveedores.every(r=>r[13]==='') && Dn.filas.compras.some(r=>r[1]==='TAXI JUAN'));
ok('...y el control lo marca', Dn.controles.proveedores.some(c=>/no es RIF/.test(c.concepto) && c.estado==='REVISAR: 2'));

// PAGASI 18: crédito enlazado solo por nombre, con dos personas que se llaman igual
const jose=[{ id:21, nombre:'JOSE GONZALEZ', cedula:'V-11111111', tel:'0414-1' }, { id:22, nombre:'JOSE GONZALEZ', cedula:'V-22222222', tel:'0414-2' }];
const cJ=[{ id:'CRED-600', cli:'JOSE GONZALEZ', fecha:'2026-09-01', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 }];
const Dj=G.qbDatos(base({ creds:cJ, clientes:jose }));
ok('crédito solo con el nombre de dos personas distintas: no se le pega a ninguna (sin cédula ni teléfono ajenos)', Dj.filas.clientes.length===1 && Dj.filas.clientes[0][13]==='' && Dj.filas.clientes[0][2]==='');
ok('...y el control pide ponerle el cliente', Dj.controles.clientes.some(c=>/dos personas/.test(c.concepto) && c.estado==='REVISAR: 1'));

// Fichas de la misma cédula: manda la activa
const dup=[{ id:5, nombre:'JOSE PERES', cedula:'V-123456', tel:'VIEJO', eliminado:true }, { id:6, nombre:'JOSE PEREZ', cedula:'V-123456', tel:'NUEVO' }];
const cD=[{ id:'M-50', cli:'JOSE PERES', clienteId:5, fecha:'2026-09-01', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 }, { id:'M-51', cli:'JOSE PEREZ', clienteId:6, fecha:'2026-09-02', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, total:1272 }];
const Dd=G.qbDatos(base({ creds:cD, clientes:dup }));
ok('misma cédula en una ficha borrada y una activa: un solo cliente con los datos de la activa', Dd.filas.clientes.length===1 && Dd.filas.clientes[0][0]==='JOSE PEREZ' && Dd.filas.clientes[0][2]==='NUEVO' && Dd.filas.clientes[0][11]===2544);

// Un cliente que también es proveedor
const Dcp=G.qbDatos(base({ creds:[M154], clientes, egresos:[{ id:501, fecha:'2026-10-02', monto:15, categoria:'otros', concepto:'honorarios', fiscal:{ proveedor:'JESUS GALARRAGA', rif:'V-12345678-0', numero:'7', base:15, alicuota:0.16 } }] }));
ok('cliente que también es proveedor: el proveedor lleva su RIF (QuickBooks no repite nombres entre los dos)', !!fila01(Dcp,'JESUS GALARRAGA') && Dcp.filas.proveedores[0][0]==='JESUS GALARRAGA (V-12345678-0)' && Dcp.filas.compras[0][1]==='JESUS GALARRAGA (V-12345678-0)');

// Dos sedes con el mismo RIF y distinto nombre
const sedes=[{ id:'A', nombre:'EMPIRE BELLO MONTE', rif:'J-40000000-1', telefono:'0212-BM' }, { id:'B', nombre:'EMPIRE VALENCIA', rif:'J-40000000-1', telefono:'0241-VA' }];
const Ds=G.qbDatos(base({ concesionarios:sedes, egresos:[
  { id:601, fecha:'2026-10-01', monto:9, categoria:'otros', concepto:'casco', fiscal:{ proveedor:'EMPIRE VALENCIA', rif:'J-40000000-1', numero:'1', base:9, alicuota:0 } },
  { id:602, fecha:'2026-10-02', monto:8, categoria:'otros', concepto:'guantes', fiscal:{ proveedor:'EMPIRE BELLO MONTE', rif:'J-40000000-1', numero:'2', base:8, alicuota:0 } } ] }));
ok('dos sedes con el mismo RIF: cada una con su nombre y su teléfono, y cada factura a su sede', Ds.filas.proveedores.length===2 && Ds.filas.proveedores.find(r=>r[0]==='EMPIRE BELLO MONTE')[3]==='0212-BM' && Ds.filas.compras.find(r=>r[8]==='guantes')[1]==='EMPIRE BELLO MONTE');
const Dm=G.qbDatos(base({ concesionarios:sedes, motos:[{ id:5, concesionarioId:'A' }], egresos:[
  { id:603, fecha:'2026-10-01', monto:900, categoria:'inventario', origenAuto:'compra_moto', motoIdRef:5, concepto:'moto 5' },
  { id:604, fecha:'2026-10-01', monto:300, categoria:'inventario', origenAuto:'compra_moto', motoIdRef:5, concepto:'moto 5' } ] }));
ok('la compra de una moto no va al 06 ni convierte a la sede en proveedor (Adam, 27-oct-2026: la sede no la factura)', Dm.filas.compras.length===0 && Dm.filas.proveedores.length===0 && Dm.compras.sinProveedor.length===0);

// Completado al corte: debe 0 aunque el plan tuviera cuotas sin pagar (como en Pagos)
ok('crédito cerrado (completado) antes del corte debe 0', G.qbSaldoCredito(Object.assign({}, M154, { estado:'completado', fechaCompletado:'2026-10-01' }), [], '2026-10-31')===0);
ok('la búsqueda no pierde el foco al redibujar en tiempo real (tiene id)', /id="qb-buscar"/.test(src('logic/quickbooks.js')));

// ── Que la pestaña exista y cargue en orden ──────────────────────────────────────────────────────────────
const rep=src('modules/reportes.js'), html=src('admin.html');
ok('la pestaña está en Finanzas', /\{k:'quickbooks', lbl:'Exportar a QuickBooks'/.test(rep) && /tab==='quickbooks'/.test(rep));
const iMet=html.indexOf('logic/metodologia.js'), iQb=html.indexOf('logic/quickbooks.js'), iMod=html.indexOf('modules/reportes.js');
ok('...y su script carga después de lo que usa y antes de las vistas', iMet>0 && iQb>iMet && iQb<iMod && html.indexOf('logic/credito-ledger.js')<iQb && html.indexOf('logic/libros-iva.js')<iQb);
ok('no escribe nada en la base: solo lee y exporta', !/\bDB\.|\.set\(|\.update\(|\.add\(|collection\(/.test(src('logic/quickbooks.js')));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
