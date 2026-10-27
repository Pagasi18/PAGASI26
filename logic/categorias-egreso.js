// Categorías de gasto y plan de cuentas del contador (28-oct-2026). Él mandó "02. Servicios.xlsx" con sus conceptos:
// "la categoría que tenemos para registrar los egresos en pagasi pueden tener estos conceptos; esta información alimenta
// tal como está el libro de compras (sin modificar nada en el libro), pero al bajar el reporte para contabilizar los
// egresos en QB bajaría alimentado por los egresos". Y recomendó que las categorías nuevas las agregue el programador
// "en la medida que se vaya ampliando el alcance de la empresa": para agregar una, es una línea en EGRESO_CATEGORIAS.
// Antes las categorías estaban repetidas en cuatro archivos (egresos, cuentas, coromoto, quickbooks); ahora viven aquí.
//  · id: lo que se guarda en egreso.categoria (los cinco de siempre se conservan: hay gastos viejos con ellos).
//  · cuentaQB: la columna *Account de la factura de proveedor en QuickBooks (06). Sin cuenta, va el nombre y se avisa.
//  · ivaCompra: el código de IVA de compra del contador, de referencia (la factura manda si trae base e IVA).

// Generado desde "02. Servicios.xlsx" del contador (28-oct-2026). Las 19 columnas del 02 tal cual; no editar a mano:
var QB_PLAN_SERVICIOS = [["CARTERA DE FINANCIAMIENTO", "Ingresos", "Sin Inventario", "", "FINANCIAMIENTO DE MOTO", "", "1108001 CARTERA DE FINANCIAMIENTO", "AMORTIZACION DE FINANCIAMIENTO", "", "1108001 CARTERA DE FINANCIAMIENTO", "", "", "", "No VAT (0%)", "", "No VAT (0%)", "", "", ""],
  ["INTERESES DE FINANCIAMIENTO", "Ingresos", "Sin Inventario", "", "INTERESES POR FINANCIAMIENTO", "", "4101001 INGRESOS POR INTERESES DE FINANCIAMIENTO", "", "", "", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["COMISION POR MOROSIDAD", "Ingresos", "Sin Inventario", "", "INGRESOS POR PAGO MOROSO", "", "4101003 INGRESOS POR PAGO MOROSO", "", "", "", "", "", "", "16.0% S (16%)", "", "", "", "", ""],
  ["INGRESOS POR PAGASI PROTEC", "Ingresos", "Sin Inventario", "", "INGRESOS POR PAGASI PROTEC", "", "4101002 INGRESOS POR PAGASI PROTEC", "", "", "", "", "", "", "16.0% S (16%)", "", "", "", "", ""],
  ["HONORARIOS PROFESIONALES", "Servicios", "Sin Inventario", "", "", "", "", "HONORARIOS PROFESIONALES", "", "6101002 HONORARIOS PROFESIONALES", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["SERVICIOS DE TELEFONIA", "Servicios", "Sin Inventario", "", "", "", "", "SERVICIO DE TELEFONIA CELULAR", "", "6102001 SERVICIO DE TELEFONIA E INTERNET", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["ALQUILER DE OFICINAS", "Servicios", "Sin Inventario", "", "", "", "", "ARRENDAMIENTO DE OFICINA", "", "6101003 ALQUILER DE OFICINAS", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["ESTACIONAMIENTOS", "Servicios", "Sin Inventario", "", "", "", "", "ESTACIONAMIENTOS", "", "6101004 ESTACIONAMIENTOS", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["MATERIAL DE OFICINA", "Servicios", "Sin Inventario", "", "", "", "", "MATERIAL DE OFICINA", "", "6101006 MATERIAL DE OFICINA", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["MATERIAL DE LIMPIEZA", "Servicios", "Sin Inventario", "", "", "", "", "MATERIAL DE LIMPIEZA", "", "6101007 MATERIAL DE LIMPIEZA", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["GASTOS DE PUBLICIDAD", "Servicios", "Sin Inventario", "", "", "", "", "GASTOS DE PUBLICIDAD", "", "6101009 GASTOS DE PUBLICIDAD", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["SERVICIO DE INTERNET", "Servicios", "Sin Inventario", "", "", "", "", "SERVICIO DE INTERNET FIBRA OPTICA", "", "6102001 SERVICIO DE TELEFONIA E INTERNET", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["MTO. SERVIDORES", "Servicios", "Sin Inventario", "", "", "", "", "SERVICIO DE SERVIDORES", "", "6102002 SERVICIO DE SERVIDORES", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["DOMINIO PAGINA WEB", "Servicios", "Sin Inventario", "", "", "", "", "PAGINA WEB", "", "6102003 PAGINA WEB", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["GASTOS DE NOTARIA", "Servicios", "Sin Inventario", "", "", "", "", "COSTOS DE NOTARIA Y REGISTRO DE FINANCIAMIENTO", "", "5101002 COSTOS DE NOTARIA Y REGISTRO DE FINANCIAMIENTO", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["COSTOS DE FINANCIAMIENTO", "Servicios", "Sin Inventario", "", "", "", "", "COSTOS DE SERVICIO DE FINANCIAMIENTO", "", "5101001 COSTOS DE SERVICIO DE FINANCIAMIENTO", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["COSTOS DE INTERES FINANC.", "Servicios", "Sin Inventario", "", "", "", "", "INTERESES SOBRE PRESTAMOS BANCARIOS", "", "5101003 INTERESES SOBRE PRESTAMOS BANCARIOS", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["UNIFORME DE PERSONAL", "Servicios", "Sin Inventario", "", "", "", "", "COSTOS DE IMPLEMENTOS Y UNIFORME DEL PERSONAL", "", "5202001 COSTOS DE IMPLEMENTOS Y UNIFORME DEL PERSONAL", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["ATENCION AL PERSONAL", "Servicios", "Sin Inventario", "", "", "", "", "ATENCION AL PERSONAL", "", "5202002 ATENCION AL PERSONAL", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["CURSOS Y CAPACITACION", "Servicios", "Sin Inventario", "", "", "", "", "CURSOS Y CAPACITACION", "", "5202005 CURSOS Y CAPACITACION", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["CONDOMINIOS", "Servicios", "Sin Inventario", "", "", "", "", "CONDOMINIOS", "", "6101005 CONDOMINIOS", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["MANTENIMIENTO DE OFICINA", "Servicios", "Sin Inventario", "", "", "", "", "MANTENIMIENTO OFICINA Y EQUIPOS", "", "6104001 MANTENIMIENTO OFICINA Y EQUIPOS", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["IMPUESTOS MUNICIPALES", "Servicios", "Sin Inventario", "", "", "", "", "IMPUESTO SOBRE ACTIVIDADES ECONÓMICAS (PATENTE MUNICIPAL)", "", "6105001 IMPUESTO SOBRE ACTIVIDADES ECONÓMICAS (PATENTE MUNICIPAL)", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["TIMBRE FISCAL", "Servicios", "Sin Inventario", "", "", "", "", "TIMBRE FISCAL", "", "6105002 TIMBRE FISCAL", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["MULTAS", "Servicios", "Sin Inventario", "", "", "", "", "MULTAS Y SANCIONES LABORALES, FISCALES Y PARA FISCALES", "", "6105006 MULTAS Y SANCIONES LABORALES, FISCALES Y PARA FISCALES", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["ING. INT. BANCARIO", "Servicios", "Sin Inventario", "", "INGRESOS POR INTERESES BANCARIOS", "", "7101001 INGRESOS POR INTERESES BANCARIOS NACIONALES", "", "", "", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["COMISIONES BANCARIAS", "Servicios", "Sin Inventario", "", "", "", "", "GASTOS Y COMISIONES BANCARIAS", "", "7102001 GASTOS Y COMISIONES BANCARIAS", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["GASTOS POR INTERESES", "Servicios", "Sin Inventario", "", "", "", "", "GASTOS POR INTERESES", "", "7102002 GASTOS POR INTERESES", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["PERD.DIF. CAMBIARIO (INTERES)", "Servicios", "Sin Inventario", "", "", "", "", "PERD. DIF. CAMBIARIO SOBRE PRESTAMOS BANCARIOS", "", "7102006 PERD. DIF. CAMBIARIO SOBRE PRESTAMOS BANCARIOS", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["ING. DIF. BANCARIO (INTERES)", "Servicios", "Sin Inventario", "", "INGRESO DIF. CAMBIARIO SOBRE INTERESES DEVENGADOS", "", "7101002 INGRESO DIF. CAMBIARIO SOBRE INTERESES DEVENGADOS", "", "", "", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["IMPUESTO SOBRE LA RENTA CORRIENTE", "Servicios", "Sin Inventario", "", "", "", "", "IMPUESTO SOBRE LA RENTA CORRIENTE", "", "8101001 IMPUESTO SOBRE LA RENTA CORRIENTE", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["IMPUESTO SOBRE LA RENTA DIFERIDO", "Servicios", "Sin Inventario", "", "", "", "", "IMPUESTO SOBRE LA RENTA DIFERIDO", "", "8101002 IMPUESTO SOBRE LA RENTA DIFERIDO", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["MULTAS EN IMPUESTO SOBRE LA RENTA", "Servicios", "Sin Inventario", "", "", "", "", "MULTAS EN IMPUESTO SOBRE LA RENTA", "", "8101003 MULTAS EN IMPUESTO SOBRE LA RENTA", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["VIATICOS AL PERSONAL", "Servicios", "Sin Inventario", "", "", "", "", "VIATICOS AL PERSONAL", "", "5202003 VIATICOS AL PERSONAL", "", "", "", "", "", "16.0% S (16%)", "", "", ""],
  ["POLIZA DE SEGURO", "Servicios", "Sin Inventario", "", "", "", "", "POLIZA DE SEGURO", "", "5202004 POLIZA DE SEGURO", "", "", "", "No VAT (0%)", "", "", "", "", ""],
  ["IVSS y REG. PREST. EMPLEO", "Servicios", "Sin Inventario", "", "", "", "", "CUENTAS POR PAGAR IVSS  RÉGIMEN PRESTACIONAL DE EMPLEO", "", "2107001 CUENTAS POR PAGAR IVSS  RÉGIMEN PRESTACIONAL DE EMPLEO", "", "", "", "", "", "No VAT (0%)", "", "", ""],
  ["BANAVIH", "Servicios", "Sin Inventario", "", "", "", "", "CUENTAS POR PAGAR FAOV (BANAVIH)", "", "2107002 CUENTAS POR PAGAR FAOV (BANAVIH)", "", "", "", "", "", "No VAT (0%)", "", "", ""],
  ["INCES", "Servicios", "Sin Inventario", "", "", "", "", "CUENTAS POR PAGAR INCES", "", "2107003 CUENTAS POR PAGAR INCES", "", "", "", "", "", "No VAT (0%)", "", "", ""],
  ["FONDO PENSIONES", "Servicios", "Sin Inventario", "", "", "", "", "CUENTAS POR PAGAR CONTRIBUCION ESPECIAL FONDO DE PENSIONES", "", "2107004 CUENTAS POR PAGAR CONTRIBUCION ESPECIAL FONDO DE PENSIONES", "", "", "", "", "", "No VAT (0%)", "", "", ""],
  ["APORTE LOCTI", "Servicios", "Sin Inventario", "", "", "", "", "APORTE LOCTI", "", "6105003 APORTE LOCTI", "", "", "", "", "", "No VAT (0%)", "", "", ""],
  ["LEY ORGANICA DEL DEPORTE", "Servicios", "Sin Inventario", "", "", "", "", "APORTE LEY ORGÁNICA DE DEPORTE", "", "6105004 APORTE LEY ORGÁNICA DE DEPORTE", "", "", "", "", "", "No VAT (0%)", "", "", ""],
  ["LEY ORGANICA DE DROGAS (FONA)", "Servicios", "Sin Inventario", "", "", "", "", "APORTE LEY ORGÁNICA DE DROGAS (FONA)", "", "6105005 APORTE LEY ORGÁNICA DE DROGAS (FONA)", "", "", "", "", "", "No VAT (0%)", "", "", ""]];
// Las categorías de gasto del contador (su columna A) con su cuenta de QuickBooks (columna "Cuenta de gastos"):
var EGRESO_CATEGORIAS_CONTADOR = [
 {
  "id": "honorarios-profesionales",
  "nombre": "HONORARIOS PROFESIONALES",
  "grupo": "Oficina y generales",
  "cuentaQB": "6101002 HONORARIOS PROFESIONALES",
  "descCompra": "HONORARIOS PROFESIONALES",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "servicios-de-telefonia",
  "nombre": "SERVICIOS DE TELEFONIA",
  "grupo": "Oficina y generales",
  "cuentaQB": "6102001 SERVICIO DE TELEFONIA E INTERNET",
  "descCompra": "SERVICIO DE TELEFONIA CELULAR",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "alquiler-de-oficinas",
  "nombre": "ALQUILER DE OFICINAS",
  "grupo": "Oficina y generales",
  "cuentaQB": "6101003 ALQUILER DE OFICINAS",
  "descCompra": "ARRENDAMIENTO DE OFICINA",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "estacionamientos",
  "nombre": "ESTACIONAMIENTOS",
  "grupo": "Oficina y generales",
  "cuentaQB": "6101004 ESTACIONAMIENTOS",
  "descCompra": "ESTACIONAMIENTOS",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "material-de-oficina",
  "nombre": "MATERIAL DE OFICINA",
  "grupo": "Oficina y generales",
  "cuentaQB": "6101006 MATERIAL DE OFICINA",
  "descCompra": "MATERIAL DE OFICINA",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "material-de-limpieza",
  "nombre": "MATERIAL DE LIMPIEZA",
  "grupo": "Oficina y generales",
  "cuentaQB": "6101007 MATERIAL DE LIMPIEZA",
  "descCompra": "MATERIAL DE LIMPIEZA",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "gastos-de-publicidad",
  "nombre": "GASTOS DE PUBLICIDAD",
  "grupo": "Oficina y generales",
  "cuentaQB": "6101009 GASTOS DE PUBLICIDAD",
  "descCompra": "GASTOS DE PUBLICIDAD",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "servicio-de-internet",
  "nombre": "SERVICIO DE INTERNET",
  "grupo": "Oficina y generales",
  "cuentaQB": "6102001 SERVICIO DE TELEFONIA E INTERNET",
  "descCompra": "SERVICIO DE INTERNET FIBRA OPTICA",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "mto-servidores",
  "nombre": "MTO. SERVIDORES",
  "grupo": "Oficina y generales",
  "cuentaQB": "6102002 SERVICIO DE SERVIDORES",
  "descCompra": "SERVICIO DE SERVIDORES",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "dominio-pagina-web",
  "nombre": "DOMINIO PAGINA WEB",
  "grupo": "Oficina y generales",
  "cuentaQB": "6102003 PAGINA WEB",
  "descCompra": "PAGINA WEB",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "gastos-de-notaria",
  "nombre": "GASTOS DE NOTARIA",
  "grupo": "Costos de financiamiento",
  "cuentaQB": "5101002 COSTOS DE NOTARIA Y REGISTRO DE FINANCIAMIENTO",
  "descCompra": "COSTOS DE NOTARIA Y REGISTRO DE FINANCIAMIENTO",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "costos-de-financiamiento",
  "nombre": "COSTOS DE FINANCIAMIENTO",
  "grupo": "Costos de financiamiento",
  "cuentaQB": "5101001 COSTOS DE SERVICIO DE FINANCIAMIENTO",
  "descCompra": "COSTOS DE SERVICIO DE FINANCIAMIENTO",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "costos-de-interes-financ",
  "nombre": "COSTOS DE INTERES FINANC.",
  "grupo": "Costos de financiamiento",
  "cuentaQB": "5101003 INTERESES SOBRE PRESTAMOS BANCARIOS",
  "descCompra": "INTERESES SOBRE PRESTAMOS BANCARIOS",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "uniforme-de-personal",
  "nombre": "UNIFORME DE PERSONAL",
  "grupo": "Personal",
  "cuentaQB": "5202001 COSTOS DE IMPLEMENTOS Y UNIFORME DEL PERSONAL",
  "descCompra": "COSTOS DE IMPLEMENTOS Y UNIFORME DEL PERSONAL",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "atencion-al-personal",
  "nombre": "ATENCION AL PERSONAL",
  "grupo": "Personal",
  "cuentaQB": "5202002 ATENCION AL PERSONAL",
  "descCompra": "ATENCION AL PERSONAL",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "cursos-y-capacitacion",
  "nombre": "CURSOS Y CAPACITACION",
  "grupo": "Personal",
  "cuentaQB": "5202005 CURSOS Y CAPACITACION",
  "descCompra": "CURSOS Y CAPACITACION",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "condominios",
  "nombre": "CONDOMINIOS",
  "grupo": "Oficina y generales",
  "cuentaQB": "6101005 CONDOMINIOS",
  "descCompra": "CONDOMINIOS",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "mantenimiento-de-oficina",
  "nombre": "MANTENIMIENTO DE OFICINA",
  "grupo": "Oficina y generales",
  "cuentaQB": "6104001 MANTENIMIENTO OFICINA Y EQUIPOS",
  "descCompra": "MANTENIMIENTO OFICINA Y EQUIPOS",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "impuestos-municipales",
  "nombre": "IMPUESTOS MUNICIPALES",
  "grupo": "Oficina y generales",
  "cuentaQB": "6105001 IMPUESTO SOBRE ACTIVIDADES ECONÓMICAS (PATENTE MUNICIPAL)",
  "descCompra": "IMPUESTO SOBRE ACTIVIDADES ECONÓMICAS (PATENTE MUNICIPAL)",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "timbre-fiscal",
  "nombre": "TIMBRE FISCAL",
  "grupo": "Oficina y generales",
  "cuentaQB": "6105002 TIMBRE FISCAL",
  "descCompra": "TIMBRE FISCAL",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "multas",
  "nombre": "MULTAS",
  "grupo": "Oficina y generales",
  "cuentaQB": "6105006 MULTAS Y SANCIONES LABORALES, FISCALES Y PARA FISCALES",
  "descCompra": "MULTAS Y SANCIONES LABORALES, FISCALES Y PARA FISCALES",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "comisiones-bancarias",
  "nombre": "COMISIONES BANCARIAS",
  "grupo": "Financieros",
  "cuentaQB": "7102001 GASTOS Y COMISIONES BANCARIAS",
  "descCompra": "GASTOS Y COMISIONES BANCARIAS",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "gastos-por-intereses",
  "nombre": "GASTOS POR INTERESES",
  "grupo": "Financieros",
  "cuentaQB": "7102002 GASTOS POR INTERESES",
  "descCompra": "GASTOS POR INTERESES",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "perd-dif-cambiario-interes",
  "nombre": "PERD.DIF. CAMBIARIO (INTERES)",
  "grupo": "Financieros",
  "cuentaQB": "7102006 PERD. DIF. CAMBIARIO SOBRE PRESTAMOS BANCARIOS",
  "descCompra": "PERD. DIF. CAMBIARIO SOBRE PRESTAMOS BANCARIOS",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "impuesto-sobre-la-renta-corriente",
  "nombre": "IMPUESTO SOBRE LA RENTA CORRIENTE",
  "grupo": "Impuesto sobre la renta",
  "cuentaQB": "8101001 IMPUESTO SOBRE LA RENTA CORRIENTE",
  "descCompra": "IMPUESTO SOBRE LA RENTA CORRIENTE",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "impuesto-sobre-la-renta-diferido",
  "nombre": "IMPUESTO SOBRE LA RENTA DIFERIDO",
  "grupo": "Impuesto sobre la renta",
  "cuentaQB": "8101002 IMPUESTO SOBRE LA RENTA DIFERIDO",
  "descCompra": "IMPUESTO SOBRE LA RENTA DIFERIDO",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "multas-en-impuesto-sobre-la-renta",
  "nombre": "MULTAS EN IMPUESTO SOBRE LA RENTA",
  "grupo": "Impuesto sobre la renta",
  "cuentaQB": "8101003 MULTAS EN IMPUESTO SOBRE LA RENTA",
  "descCompra": "MULTAS EN IMPUESTO SOBRE LA RENTA",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "viaticos-al-personal",
  "nombre": "VIATICOS AL PERSONAL",
  "grupo": "Personal",
  "cuentaQB": "5202003 VIATICOS AL PERSONAL",
  "descCompra": "VIATICOS AL PERSONAL",
  "ivaCompra": "16.0% S (16%)"
 },
 {
  "id": "poliza-de-seguro",
  "nombre": "POLIZA DE SEGURO",
  "grupo": "Personal",
  "cuentaQB": "5202004 POLIZA DE SEGURO",
  "descCompra": "POLIZA DE SEGURO",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "ivss-y-reg-prest-empleo",
  "nombre": "IVSS y REG. PREST. EMPLEO",
  "grupo": "Obligaciones laborales",
  "cuentaQB": "2107001 CUENTAS POR PAGAR IVSS  RÉGIMEN PRESTACIONAL DE EMPLEO",
  "descCompra": "CUENTAS POR PAGAR IVSS  RÉGIMEN PRESTACIONAL DE EMPLEO",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "banavih",
  "nombre": "BANAVIH",
  "grupo": "Obligaciones laborales",
  "cuentaQB": "2107002 CUENTAS POR PAGAR FAOV (BANAVIH)",
  "descCompra": "CUENTAS POR PAGAR FAOV (BANAVIH)",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "inces",
  "nombre": "INCES",
  "grupo": "Obligaciones laborales",
  "cuentaQB": "2107003 CUENTAS POR PAGAR INCES",
  "descCompra": "CUENTAS POR PAGAR INCES",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "fondo-pensiones",
  "nombre": "FONDO PENSIONES",
  "grupo": "Obligaciones laborales",
  "cuentaQB": "2107004 CUENTAS POR PAGAR CONTRIBUCION ESPECIAL FONDO DE PENSIONES",
  "descCompra": "CUENTAS POR PAGAR CONTRIBUCION ESPECIAL FONDO DE PENSIONES",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "aporte-locti",
  "nombre": "APORTE LOCTI",
  "grupo": "Oficina y generales",
  "cuentaQB": "6105003 APORTE LOCTI",
  "descCompra": "APORTE LOCTI",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "ley-organica-del-deporte",
  "nombre": "LEY ORGANICA DEL DEPORTE",
  "grupo": "Oficina y generales",
  "cuentaQB": "6105004 APORTE LEY ORGÁNICA DE DEPORTE",
  "descCompra": "APORTE LEY ORGÁNICA DE DEPORTE",
  "ivaCompra": "No VAT (0%)"
 },
 {
  "id": "ley-organica-de-drogas-fona",
  "nombre": "LEY ORGANICA DE DROGAS (FONA)",
  "grupo": "Oficina y generales",
  "cuentaQB": "6105005 APORTE LEY ORGÁNICA DE DROGAS (FONA)",
  "descCompra": "APORTE LEY ORGÁNICA DE DROGAS (FONA)",
  "ivaCompra": "No VAT (0%)"
 }
];

// Las cinco categorías de siempre. Inventario y nómina tienen cuenta clara en el plan del contador; las otras tres van
// con su nombre y el 06 avisa que hay que recategorizar o que el contador diga la cuenta.
var EGRESO_CATEGORIAS_BASE = [
  { id: 'inventario', nombre: 'Inventario / Motos', grupo: 'Generales', cuentaQB: '1113 INVENTARIOS', ivaCompra: '16.0% S (16%)' },
  { id: 'equipos', nombre: 'Equipos (GPS)', grupo: 'Generales', cuentaQB: '', ivaCompra: '16.0% S (16%)' },
  { id: 'operativo', nombre: 'Oficina y servicios', grupo: 'Generales', cuentaQB: '', ivaCompra: '16.0% S (16%)' },
  { id: 'nomina', nombre: 'Salarios / Nómina', grupo: 'Generales', cuentaQB: '5102001 SUELDOS Y SALARIOS PERSONAL', ivaCompra: 'No VAT (0%)' },
  { id: 'otros', nombre: 'Otros', grupo: 'Generales', cuentaQB: '', ivaCompra: 'No VAT (0%)' }
];
var EGRESO_CATEGORIAS = EGRESO_CATEGORIAS_BASE.concat(EGRESO_CATEGORIAS_CONTADOR);
var _EGRESO_CAT_POR_ID = {};
EGRESO_CATEGORIAS.forEach(function(c){ _EGRESO_CAT_POR_ID[c.id] = c; });

function egresoCategoria(id){ return _EGRESO_CAT_POR_ID[String(id == null ? '' : id)] || null; }
// El nombre para mostrar; una categoría que no está en la lista (datos viejos o de otra base) se muestra tal cual
function egresoCategoriaNombre(id){ var c = egresoCategoria(id); return c ? c.nombre : String(id == null ? '' : id); }
// La cuenta de QuickBooks (*Account del 06); '' si la categoría no tiene cuenta todavía
function egresoCuentaQB(id){ var c = egresoCategoria(id); return c && c.cuentaQB ? c.cuentaQB : ''; }
// Las <option> del selector de Registrar Egreso, por grupos, con la elegida marcada
function egresoCategoriasOpciones(sel){
  var esc = function(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var grupos = [], porGrupo = {};
  EGRESO_CATEGORIAS.forEach(function(c){ if(!porGrupo[c.grupo]){ porGrupo[c.grupo] = []; grupos.push(c.grupo); } porGrupo[c.grupo].push(c); });
  return grupos.map(function(g){
    return '<optgroup label="' + esc(g) + '">' + porGrupo[g].map(function(c){ return '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.nombre) + '</option>'; }).join('') + '</optgroup>';
  }).join('');
}

if(typeof module !== 'undefined' && module.exports) module.exports = { EGRESO_CATEGORIAS: EGRESO_CATEGORIAS, EGRESO_CATEGORIAS_CONTADOR: EGRESO_CATEGORIAS_CONTADOR, QB_PLAN_SERVICIOS: QB_PLAN_SERVICIOS, egresoCategoria: egresoCategoria, egresoCategoriaNombre: egresoCategoriaNombre, egresoCuentaQB: egresoCuentaQB, egresoCategoriasOpciones: egresoCategoriasOpciones };
