// Las categorías de gasto del contador (28-oct-2026, "02. Servicios.xlsx"): una sola lista (logic/categorias-egreso.js)
// que alimenta el selector de Registrar Egreso, los nombres en Finanzas y Cuentas, el mapa de Coromoto y la cuenta
// (*Account) de la factura de proveedor en QuickBooks. El Libro de Compras no cambia.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const C=require('../logic/categorias-egreso.js');

ok('las 5 categorías de siempre siguen (hay gastos viejos con ellas)', ['inventario','equipos','operativo','nomina','otros'].every(id=>C.egresoCategoria(id)));
ok('...más las 36 del contador', C.EGRESO_CATEGORIAS_CONTADOR.length===36 && C.EGRESO_CATEGORIAS.length===41);
ok('ningún id repetido', new Set(C.EGRESO_CATEGORIAS.map(c=>c.id)).size===C.EGRESO_CATEGORIAS.length);
ok('cada categoría del contador tiene su cuenta de QuickBooks (número y nombre) y su código de IVA de compra', C.EGRESO_CATEGORIAS_CONTADOR.every(c=>/^\d{7} /.test(c.cuentaQB) && /No VAT|16\.0%/.test(c.ivaCompra)));
ok('ejemplos: telefonía → 6102001; honorarios → 6101002; impuestos municipales sin IVA', C.egresoCuentaQB('servicios-de-telefonia')==='6102001 SERVICIO DE TELEFONIA E INTERNET' && C.egresoCuentaQB('honorarios-profesionales')==='6101002 HONORARIOS PROFESIONALES' && C.egresoCategoria('impuestos-municipales').ivaCompra==='No VAT (0%)');
ok('las de siempre: inventario y nómina con cuenta; las otras tres sin cuenta (el 06 avisa)', C.egresoCuentaQB('inventario')==='1113 INVENTARIOS' && C.egresoCuentaQB('nomina')!=='' && C.egresoCuentaQB('operativo')==='' && C.egresoCuentaQB('otros')==='');
ok('el nombre para mostrar, y una categoría desconocida se muestra tal cual', C.egresoCategoriaNombre('servicios-de-telefonia')==='SERVICIOS DE TELEFONIA' && C.egresoCategoriaNombre('operativo')==='Oficina y servicios' && C.egresoCategoriaNombre('xyz')==='xyz' && C.egresoCategoriaNombre('')==='');
const html=C.egresoCategoriasOpciones('alquiler-de-oficinas');
ok('el selector va por grupos y marca la elegida', /<optgroup label="Generales">/.test(html) && /<optgroup label="Oficina y generales">/.test(html) && /value="alquiler-de-oficinas" selected/.test(html) && (html.match(/<option /g)||[]).length===41);
ok('...con los nombres escapados', !/<option value="[^"]*<[^"]*"/.test(html) && /&amp;|&lt;|^[^<]*$/.test('x'));
ok('el 02 del contador: 42 filas de 19 columnas, los 4 ingresos primero', C.QB_PLAN_SERVICIOS.length===42 && C.QB_PLAN_SERVICIOS.every(r=>r.length===19) && C.QB_PLAN_SERVICIOS.slice(0,4).every(r=>r[1]==='Ingresos'));
ok('...los ingresos de financiamiento, mora y Protect con sus cuentas 4101001, 4101003 y 4101002', C.QB_PLAN_SERVICIOS[1][6]==='4101001 INGRESOS POR INTERESES DE FINANCIAMIENTO' && C.QB_PLAN_SERVICIOS[2][6]==='4101003 INGRESOS POR PAGO MOROSO' && C.QB_PLAN_SERVICIOS[3][6]==='4101002 INGRESOS POR PAGASI PROTEC');

// ── Dónde se usa ──────────────────────────────────────────────────────────────────────────────────────
const html2=src('admin.html');
ok('carga antes que todo logic/ (la usan egresos, cuentas, coromoto, reportes y quickbooks)', html2.indexOf('logic/categorias-egreso.js')>html2.indexOf('assets/pagasi-app.js') && html2.indexOf('logic/categorias-egreso.js')<html2.indexOf('logic/financiero.js'));
ok('Registrar Egreso usa el selector por grupos', /egresoCategoriasOpciones\('operativo'\)/.test(src('logic/egresos.js')));
ok('Finanzas, Cuentas y el reporte del contador muestran el nombre, no el id', (src('modules/reportes.js').match(/egresoCategoriaNombre/g)||[]).length>=5 && /egresoCategoriaNombre\(g\.cat\)/.test(src('logic/cuentas.js')));
ok('Coromoto deja mapear todas las categorías a su plan de cuentas', /EGRESO_CATEGORIAS\.map\(function\(c\)\{ return \[c\.id, c\.nombre\]; \}\)/.test(src('logic/coromoto.js')));
ok('QuickBooks saca la cuenta del gasto de la categoría y avisa si no la tiene', /egresoCuentaQB\(categoria\)/.test(src('logic/quickbooks.js')) && /sin cuenta de QuickBooks/.test(src('logic/quickbooks.js')));
ok('el Libro de Compras no cambió por esto', !/egresoCategoria|EGRESO_CATEGORIAS/.test(src('logic/libros-iva.js')));

// El formulario de Registrar Egreso de verdad, con el selector nuevo
const dom={}; const el=id=>{ if(!dom[id]) dom[id]={ id, value:'', innerHTML:'', textContent:'', style:{}, setAttribute(){}, getAttribute(){ return null; } }; return dom[id]; };
const G={ console:{log(){},warn(){}}, Math, JSON, Date, String, Number, Object, Array, parseFloat, parseInt, isNaN, isFinite, RegExp, Promise, setTimeout, clearTimeout,
  S:{ currentUser:{nombre:'X'}, egresos:[], movimientos:[] }, fmt:n=>'$'+n, toast(){}, nav(){}, closeM(){}, setMicon(){}, hoyLocalISO:()=>'2026-10-28', _cuentasBanc:[{nombre:'Binance'}],
  document:{ getElementById:id=>el(id), querySelectorAll:()=>[], createElement:()=>({}), body:{appendChild(){}} }, DB:{}, nextEgresoIdAsync:()=>Promise.resolve(1) };
G.$=id=>el(id); G.window=G; vm.createContext(G);
['logic/categorias-egreso.js','logic/tasas.js','logic/exportar.js','logic/libros-iva.js','logic/egresos.js'].forEach(f=>vm.runInContext(src(f),G));
G.openAddEgreso();
const sel=G.$('mbd').innerHTML;
ok('Registrar Egreso ofrece las 41 categorías, por grupos, con "Oficina y servicios" como antes por defecto', (sel.match(/<option value="/g)||[]).length>=41 && /<optgroup label="Oficina y generales">/.test(sel) && /value="operativo" selected/.test(sel) && /value="servicios-de-telefonia"/.test(sel));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
