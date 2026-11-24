// 18-nov-2026: el abogado mandó el contrato v3 revisado («Aceptación Anticipada»): sale Pagasi Protect
// y todo lo del GPS, entra el Gasto Administrativo (cláusula 2 y Anexo B) y la 3.20 de ajuste de cuotas.
// 24-nov-2026, Adam: «este va a ser el contrato nuevo... quiero que lo montes», con una hoja más del
// abogado: el anexo «Pago exclusivo en dólares estadounidenses» (3.14 bis). Desde ese día lo imprimen
// los créditos nuevos de PAGASI 26; los anteriores, y todos los de PAGASI 18, conservan su hoja.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, checked:false, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, removeEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, click(){} }; }
const els = {};
const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){ return ''; }, confirm(){ return true; },
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...fs.readFileSync(path.join(ROOT,'admin.html'),'utf8').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = () => {};
const admin = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
ok('el sistema carga el contrato nuevo, después del v3 del que toma los datos y la cuenta',
  admin.indexOf('logic/contratos-ga.js') > admin.indexOf('logic/contratos-protect.js') && admin.indexOf('logic/contratos-protect.js') > 0 && typeof ctx._htmlContratoGA === 'function');
// Las pruebas corren igual en el repo de la 18 y en el de la 26: la compañía se fija aquí a mano.
const en26 = () => { ctx.FIREBASE_CONFIG.projectId = 'pagasi26-65ced'; };
const en18 = () => { ctx.FIREBASE_CONFIG.projectId = 'pagasi-v2'; };
en26();

ctx._empresa = { nombre:'PAGASI 26, C.A.', rif:'J-50856275-5', ciudad:'Caracas', tel:'0414-0000000', email:'contacto@ejemplo.com', direccion:'Av. de Ejemplo', rm:'Séptimo', rmEstado:'Distrito Capital', rmNum:'8', rmTomo:'58-A', rmFecha:'14/07/2026', bancoUsd:'BANCO', cuentaUsd:'0000', cuentaBs:'0001', pagoMovil:'0414', billetera:'Binance', billeteraCuenta:'x@y' };
const S = ctx.S;
S.concesionarios = [{ id:'CO', nombre:'CONCESIONARIO, C.A.', rif:'J-00000000-0' }];
S.motos = [{ id:1, marca:'EMPIRE', modelo:'OWEN 200S', anio:'2026', color:'NEGRO', placa:'AA0A00A', serialChasis:'CH1', serialMotor:'MO1' }];
S.gps = [{ creditoId:'M-1', idGps:'GPS-SERIAL-9', imei:'123456789012345' }];
const cli = extra => Object.assign({ id:'K1', nombre:'CLIENTE DE PRUEBA', cedula:'V-12345678', dir:'CALLE 1', ciudad:'CARACAS', cargo:'MECANICO', ingreso:600, email:'c@e.com', tel:'0412-0000000' }, extra || {});
S.clientes = [cli(), cli({ id:'K2', nombre:'CLIENTE CON FIADOR', fiador_nom:'FIADOR DE PRUEBA', fiador_ci:'V-87654321', fiador_dir:'CALLE 2' })];
const cred = (id, k) => ({ id, clienteId:k, cli:'X', motoId:1, concesionarioId:'CO', fecha:'2026-11-18', creado:'2026-11-18T14:30:00.000Z', precio:1700, ini:700, cuotaQ:97, totalCuotas:20, plazo:10, estado:'activo', uso_moto:'personal' });
S.creds = [cred('M-1', 'K1'), cred('M-2', 'K2')];
const limpio = h => h.replace(/<\/?(strong|span|b)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

// ════════ 1. La cuenta: la misma del v3, con otro nombre ════════
const D = ctx._gaDatos('M-1'), F = D.F;
ok('el Gasto Administrativo es lo que la cuota tiene por encima del 12 %: monto financiado − saldo del precio', F.MF === 1841.78 && F.saldoPrecio === 1000 && F.protect === 841.78 && /US\$ 841\.78/.test(D.gasto));
ok('...y la cuota y el total no cambian: 20 × 97 = 1.940', F.n === 20 && F.cuota === 97 && F.MTA === 1940 && F.intereses === 98.22);

// ════════ 2. El texto: lo que salió y lo que entró ════════
const h = ctx._htmlContratoGA('M-1'), t = limpio(h);
ok('el título es el del abogado', /CONTRATO DE FINANCIAMIENTO PARA LA ADQUISICIÓN DE VEHÍCULO AUTOMOTOR, CON GARANTÍAS Y GASTO ADMINISTRATIVO/.test(t));
ok('no queda nada de Pagasi Protect', !/Protect|PROTECT|Programa/.test(t));
ok('ni del GPS: dispositivos, apagado remoto, geolocalización', !/GPS|Dispositivo|apagado remoto|geolocalizaci|GPS-SERIAL-9/i.test(t));
ok('la cláusula 2 es el Gasto Administrativo, con su monto', /2\. GASTO ADMINISTRATIVO/.test(t) && /2\.1 Concepto\. El Gasto Administrativo corresponde a los costos administrativos/.test(t) && /2\.2 Monto\. El monto único y total del Gasto Administrativo es la cantidad de US\$ 841\.78/.test(t));
ok('la 3.3 arma el monto financiado con el saldo del vehículo y el gasto', /3\.3 Monto Financiado\. El monto total financiado por Pagasi asciende a US\$ 1,841\.78/.test(t) && /esto es, US\$ 1,000\.00, desembolsado conforme a la Sección 1\.2; y \(b\) el Gasto Administrativo, esto es, US\$ 841\.78/.test(t));
ok('la 3.8 trae las cuotas en número y en letras', /mediante 20 \(VEINTE\) cuotas quincenales consecutivas, cada una por el monto de US\$ 97\.00/i.test(t));
ok('la 3.16 dice que el gasto no se descuenta por pago anticipado', /El Gasto Administrativo no será objeto de descuento por pago anticipado, en la medida en que corresponda a gastos efectivamente causados y legalmente exigibles/.test(t));
ok('entra la 3.20 con sus cuatro literales', /3\.20 Ajuste de Cuotas y Preservación del Equilibrio Económico Contractual/.test(t) && /\(a\) Criterios objetivos\./.test(t) && /\(b\) Proporcionalidad del ajuste\./.test(t) && /\(c\) Notificación, aceptación anticipada y aplicación\./.test(t) && /\(d\) Revisión extraordinaria\./.test(t) && /CPI-U/.test(t));
ok('la 9.4 habla del gasto efectivamente causado', /el Gasto Administrativo efectivamente causado y legalmente exigible, y los daños y perjuicios acreditados/.test(t));
ok('salieron la 11.3 y la 11.7, y el título 11 quedó sin la geolocalización', /11\. TRATAMIENTO DE DATOS 11\.1/.test(t) && !/11\.3 /.test(t) && !/11\.7 /.test(t) && /11\.6 Derechos del Comprador/.test(t));
ok('lo que no cambió sigue igual: 12 % anual, mora 3 % desde el día 6, 5 días de gracia, sin letras de cambio', /doce por ciento \(12%\) anual/.test(t) && /tres por ciento \(3%\) anual/.test(t) && /período de gracia de cinco \(5\) días/.test(t) && /NO se han emitido letras de cambio ni pagarés/.test(t));
ok('se llena con los datos del sistema: empresa, cliente, concesionario y moto', /PAGASI 26, C\.A\./.test(t) && /Registro Mercantil Séptimo/.test(t) && /CLIENTE DE PRUEBA/.test(t) && /V-12345678/.test(t) && /CONCESIONARIO, C\.A\./.test(t) && /OWEN 200S/.test(t) && /AA0A00A/.test(t));

// ════════ 3. Los anexos ════════
ok('Anexo A: el resumen nombra el Gasto Administrativo y el cronograma cierra en cero', /Gasto Administrativo: US\$ 841\.78/.test(t) && /La porción del Gasto Administrativo financiada se encuentra incluida dentro de “cap”/.test(t) && F.filas.length === 20 && F.filas[19].saldo === 0);
ok('Anexo B: detalle del gasto, con el monto, los renglones para el desglose y el total', /ANEXO “B” — DETALLE DEL GASTO ADMINISTRATIVO/.test(t) && /B\.1 Monto US\$ 841\.78, incluido en el Monto Financiado\./.test(t) && /B\.2 Desglose de gastos administrativos efectivamente causados/.test(t) && /Total del Gasto Administrativo US\$ 841\.78/.test(t) && /B\.3 Declaración del Comprador/.test(t));
ctx._empresa.gastoAdmDetalle = [{ concepto:'Gestión <b>y</b> trámite', monto:500 }, { concepto:'Otro concepto', monto:341.78 }];
const conDet = ctx._htmlContratoGA('M-1');
ok('...y si la ficha de la empresa trae el desglose, lo imprime (sin dejar pasar código)', /Gestión &lt;b&gt;y&lt;\/b&gt; trámite/.test(conDet) && /US\$ 500\.00/.test(conDet) && /US\$ 341\.78/.test(conDet));
delete ctx._empresa.gastoAdmDetalle;
ok('Anexo C: la constancia de recepción ya no lleva las filas del GPS', /ANEXO “C” — CONSTANCIA DE RECEPCIÓN DEL VEHÍCULO/.test(t) && /Llaves recibidas/.test(t) && !/apagado remoto instalado/.test(t));
ok('los Anexos B y C van enteros: ninguno se parte entre dos hojas (la firma del C no puede quedar sola)', ['ANEXO “B” — DETALLE DEL GASTO ADMINISTRATIVO', 'ANEXO “C” — CONSTANCIA DE RECEPCIÓN DEL VEHÍCULO'].every(x => /break-inside:avoid;page-break-inside:avoid"><div[^>]*>$/.test(h.slice(0, h.indexOf(x)))));
ok('Anexo D: recaudos y conocimiento del cliente, como antes', /ANEXO “D” — RECAUDOS Y DECLARACIÓN DE CONOCIMIENTO DEL CLIENTE/.test(t) && /D\.3 Declaración PEP/.test(t));

// ════════ 4. Con fiador (el documento del abogado no trae la fianza: se conserva la del v3 mientras responde) ════════
const tf = limpio(ctx._htmlContratoGA('M-2'));
ok('con fiador, el título y la cláusula 14 de fianza siguen saliendo', /CON GARANTÍAS, FIANZA Y GASTO ADMINISTRATIVO/.test(tf) && /14\. FIANZA/.test(tf) && /FIADOR DE PRUEBA/.test(tf) && /las Cuotas Quincenales, el Gasto Administrativo, los Intereses Financieros/.test(tf) && !/Protect/.test(tf));
ok('sin fiador, no', !/14\. FIANZA/.test(t) && !/Fiador/.test(t.replace(/Y DEL FIADOR/g, '')));

// ════════ 5. El v3 no se tocó ════════
const v3 = limpio(ctx._htmlContratoProtect('M-1'));
ok('el contrato v3 sigue imprimiendo Pagasi Protect y el GPS, igual que antes', /PAGASI PROTECT/.test(v3) && /2\.7 Protocolo de Apagado Remoto/.test(v3) && /GPS-SERIAL-9/.test(v3) && !/3\.20 /.test(v3));

// ════════ 6. La hoja nueva: pago exclusivo en dólares (3.14 bis) ════════
const iFirma = t.indexOf('Las Partes firman el presente Contrato'), iUsd = t.indexOf('ANEXO CONTRACTUAL — PAGO EXCLUSIVO EN DÓLARES ESTADOUNIDENSES'), iA = t.indexOf('ANEXO “A” — CRONOGRAMA DE PAGOS');
ok('va después de las firmas del contrato y antes del Anexo A', iFirma > 0 && iUsd > iFirma && iA > iUsd);
ok('lleva el número del contrato y su fecha', /ESTADOUNIDENSES Contrato N° M-1 · Fecha: 18 de noviembre de 2026/.test(t));
ok('la 3.14 bis: el dólar es moneda de cuenta y de pago, y la deuda se extingue solo con dólares',
  /3\.14 bis\. Moneda de pago y liberación de la deuda\. Las Partes acuerdan expresamente que el Dólar de los Estados Unidos de América \(USD\) constituye tanto la moneda de cuenta como la moneda de pago de todas las obligaciones derivadas del presente Contrato\./.test(t)
  && /exclusivamente mediante la entrega efectiva de dólares estadounidenses a Pagasi, a través de los medios de pago en dicha moneda que esta haya autorizado por escrito\./.test(t));
ok('...el Comprador no puede imponer el pago en bolívares, salvo autorización escrita para ese pago',
  /El Comprador no podrá imponer la cancelación total o parcial de la deuda mediante bolívares ni mediante otra moneda, activo o instrumento de pago, salvo autorización previa, expresa y escrita de Pagasi para el pago específico correspondiente\./.test(t)
  && /La aceptación excepcional de un pago distinto de USD no constituirá renuncia ni autorización para pagos posteriores\./.test(t));
ok('...manda sobre la lista de medios de pago de la 3.15 y deja la 3.20 como está',
  /Prelación e interpretación\. Esta disposición complementa la Sección 3\.14 y prevalece, en caso de contradicción, sobre la enumeración de medios de pago en bolívares, Pago Móvil u otros instrumentos contenida en la Sección 3\.15\./.test(t)
  && /Las restantes disposiciones del Contrato, incluida la Sección 3\.20 sobre ajustes, permanecen sin modificación\./.test(t));
ok('...con la salvedad legal y la aceptación expresa',
  /Salvedad legal\. Lo anterior se aplicará únicamente en la medida permitida por las normas imperativas venezolanas vigentes/.test(t)
  && /Si una norma imperativa reconoce al Comprador una facultad de pago en bolívares que no pueda excluirse contractualmente, prevalecerá dicha norma\./.test(t)
  && /Las Partes aceptan expresamente esta estipulación y la integran al Contrato\./.test(t));
const usd = t.slice(iUsd, iA), usdF = tf.slice(tf.indexOf('ANEXO CONTRACTUAL — PAGO EXCLUSIVO'), tf.indexOf('ANEXO “A” — CRONOGRAMA DE PAGOS'));
ok('la firman el Comprador y Pagasi; con fiador, también el Fiador', /Por el Comprador/.test(usd) && /Por Pagasi/.test(usd) && !/Por el Fiador/.test(usd) && /Por el Fiador/.test(usdF) && /FIADOR DE PRUEBA/.test(usdF));
const bloque = h.slice(h.indexOf('ANEXO CONTRACTUAL — PAGO EXCLUSIVO') - 400, h.indexOf('ANEXO CONTRACTUAL — PAGO EXCLUSIVO'));
ok('la hoja no se parte entre dos páginas', /break-inside:avoid;page-break-inside:avoid">\s*<div[^>]*>$/.test(bloque));
ok('la 3.14 y la 3.15 del cuerpo siguen como las escribió el abogado', /3\.14 Moneda del Contrato\. El Financiamiento se otorga en Dólares\./.test(t) && /3\.15 Medios de Pago\. Los pagos deberán realizarse exclusivamente a favor de Pagasi/.test(t));
ok('el v3 no lleva esta hoja', !/3\.14 bis|PAGO EXCLUSIVO EN DÓLARES/.test(v3));

// ════════ 7. A quién le toca: créditos nuevos de PAGASI 26, por la fecha del crédito ════════
const V = ctx._contratoVersionDe;
ok('rige desde el 24-nov-2026', ctx._CONTRATO_GA_DESDE === '2026-11-24');
en26();
ok('PAGASI 26: un crédito del 24-nov lleva el contrato nuevo, firmado o no',
  V({ id:'M-5', fecha:'2026-11-24' }) === 'ga' && V({ id:'M-5', fecha:'2026-11-24', contratoFirmado:true, fechaContratoFirmado:'2026-11-24' }) === 'ga' && V({ id:'M-6', fecha:'2027-01-15' }) === 'ga');
ok('...uno del 23-nov conserva el de Protect, firmado o no', V({ id:'M-4', fecha:'2026-11-23' }) === 'protect' && V({ id:'M-4', fecha:'2026-11-23', contratoFirmado:true, fechaContratoFirmado:'2026-11-23' }) === 'protect');
ok('...y lo conserva aunque le marquen la firma días después (manda la fecha del crédito, no la de la marca)',
  V({ id:'M-3', fecha:'2026-11-20', contratoFirmado:true, fechaContratoFirmado:'2026-11-26' }) === 'protect');
ok('...si el crédito trae grabada su versión, esa manda', V({ id:'M-7', fecha:'2026-12-01', contratoVersion:'protect' }) === 'protect' && V({ id:'M-8', fecha:'2026-10-01', contratoVersion:'ga' }) === 'ga');
ok('...sin fecha, o con una fecha mal escrita, no cae en el nuevo', V({ id:'M-9' }) !== 'ga' && V({ id:'M-9', fecha:'24/11/2026' }) !== 'ga' && V(null) !== 'ga');
en18();
ok('PAGASI 18 nunca imprime el contrato nuevo', V({ id:'CRED-900', fecha:'2026-11-24' }) === 'protect' && V({ id:'CRED-901', fecha:'2027-03-01', contratoFirmado:true, fechaContratoFirmado:'2027-03-01' }) === 'protect' && ctx._contratoGaLeToca({ fecha:'2026-12-01' }) === false);
ok('...ni lo ofrece en el desplegable', ctx._gaOpcionHtml({ id:'CRED-900', fecha:'2026-11-24' }) === '');
en26();

// ════════ 8. La pantalla de Contratos y la impresión por lote ════════
const modSrc = fs.readFileSync(path.join(ROOT, 'modules/contratos.js'), 'utf8');
const lineaSel = modSrc.split('\n').find(l => l.indexOf('id="sel-tipo-doc"') > -1) || '';
ok('el desplegable «Tipo de documento» pide la opción nueva para el crédito que la pantalla trae puesto',
  /<\/option>\$\{typeof _gaOpcionHtml==='function' \? _gaOpcionHtml\(credsActivos\[0\]\) : ''\}<\/select>/.test(lineaSel));
ok('la opción dice desde cuándo se firma', /^<option value="ga">Gasto Administrativo y pago en dólares — el que se firma desde el 24-nov-2026<\/option>$/.test(ctx._gaOpcionHtml({ id:'M-4', fecha:'2026-11-23' })));
ok('...y sale elegida solo cuando al crédito le toca', /<option value="ga" selected>/.test(ctx._gaOpcionHtml({ id:'M-5', fecha:'2026-11-24' })) && !/selected/.test(ctx._gaOpcionHtml({ id:'M-4', fecha:'2026-11-23' })) && !/selected/.test(ctx._gaOpcionHtml(undefined)));
S.creds = [cred('M-1', 'K1'), cred('M-2', 'K2'), Object.assign(cred('M-3', 'K1'), { fecha:'2026-11-24' }), Object.assign(cred('M-4', 'K1'), { fecha:'2026-11-25', estado:'cancelado' })];
const pag = ctx.PG.contratos();
const selHtml = (pag.match(/<select class="fs" id="sel-tipo-doc"[\s\S]*?<\/select>/) || [''])[0];
ok('la pantalla pinta la opción nueva al final y deja elegida la del primer crédito (uno anterior: Protect)',
  /<option value="protect">[\s\S]*<option value="ga">[^<]*<\/option><\/select>$/.test(selHtml) && !/selected/.test(selHtml));
S.creds = [Object.assign(cred('M-3', 'K1'), { fecha:'2026-11-24' }), cred('M-1', 'K1')];
ok('...y si el primer crédito es nuevo, la opción nueva sale elegida', /<option value="ga" selected>/.test(ctx.PG.contratos()));
els['sel-cred'] = Object.assign(elemento(), { value:'M-3' }); els['sel-tipo-doc'] = Object.assign(elemento(), { value:'' }); els['cz'] = elemento();
ctx.onCredContratoChange();
ok('al elegir un crédito nuevo, el tipo pasa al contrato nuevo y la vista previa lo pinta', els['sel-tipo-doc'].value === 'ga' && /2\. GASTO ADMINISTRATIVO/.test(els['cz'].innerHTML) && /3\.14 bis/.test(els['cz'].innerHTML) && !/PAGASI PROTECT/.test(els['cz'].innerHTML));
els['sel-cred'].value = 'M-1';
ctx.onCredContratoChange();
ok('al elegir uno anterior, vuelve al de Protect', els['sel-tipo-doc'].value === 'protect' && /PAGASI PROTECT/.test(els['cz'].innerHTML) && !/3\.14 bis/.test(els['cz'].innerHTML));
S.creds = [Object.assign(cred('M-3', 'K1'), { fecha:'2026-11-24' }), Object.assign(cred('M-5', 'K2'), { fecha:'2026-11-24' })];
const lote = ctx._htmlContratosDelDia('2026-11-24');
ok('«Contratos del día» saca el contrato nuevo para los créditos de ese día', (lote.match(/3\.14 bis/g) || []).length === 2 && !/PAGASI PROTECT/.test(lote));
S.creds = [cred('M-1', 'K1')];
ok('...y el de Protect para los de un día anterior', /PAGASI PROTECT/.test(ctx._htmlContratosDelDia('2026-11-18')) && !/3\.14 bis/.test(ctx._htmlContratosDelDia('2026-11-18')));
en18();
S.creds = [Object.assign(cred('CRED-900', 'K1'), { fecha:'2026-11-24' })];
ok('en PAGASI 18 la pantalla no ofrece la opción nueva y el lote del día sigue con Protect', !/value="ga"/.test(ctx.PG.contratos()) && /PAGASI PROTECT/.test(ctx._htmlContratosDelDia('2026-11-24')));
en26();

// ════════ 9. «Descargar PDF» desde la lista: sale el contrato de ESE crédito y los desplegables quedan en él ════════
// Con dos contratos vivos en la misma compañía, el tipo de documento no puede quedarse en el del crédito anterior.
// Y un crédito archivado (cancelado o recuperado) no está en el desplegable: antes lo dejaba vacío y el PDF salía con
// el contrato del primer crédito de la lista bajo el nombre del que se pidió.
function selectFalso(vals){
  const s = elemento(); let v = vals[0] || '';
  s.options = vals.map(x => ({ value:x }));
  Object.defineProperty(s, 'value', { get(){ return v; }, set(x){ v = s.options.some(o => String(o.value) === String(x)) ? String(x) : ''; } });
  s.appendChild = o => { s.options.push(o); };
  return s;
}
en26();
S.creds = [cred('M-1', 'K1'), Object.assign(cred('M-3', 'K1'), { fecha:'2026-11-24' }), Object.assign(cred('M-4', 'K2'), { fecha:'2026-11-24', estado:'cancelado' })];
els['sel-cred'] = selectFalso(['M-1', 'M-3']); els['sel-tipo-doc'] = selectFalso(['protect', 'ga']); els['cz'] = elemento();
const impresos = []; ctx.open = () => { const d = { html:'' }; impresos.push(d); return { document:{ write(x){ d.html += x; }, close(){} } }; };
const tOrig = ctx.setTimeout; ctx.setTimeout = fn => { fn(); return 0; };
const num = d => ((d && d.html.match(/N° de Contrato:<\/strong> ([A-Z]+-\d+)/)) || ['', ''])[1];
ctx.descargarContratoPDFById('M-3');
ok('un crédito nuevo baja con el contrato nuevo y los desplegables quedan en él', num(impresos[0]) === 'M-3' && /3\.14 bis/.test(impresos[0].html) && els['sel-cred'].value === 'M-3' && els['sel-tipo-doc'].value === 'ga');
ctx.descargarContratoPDFById('M-1');
ok('uno anterior baja con el de Protect y el tipo NO se queda en el del crédito anterior', num(impresos[1]) === 'M-1' && /PAGASI PROTECT/.test(impresos[1].html) && !/3\.14 bis/.test(impresos[1].html) && els['sel-cred'].value === 'M-1' && els['sel-tipo-doc'].value === 'protect');
ctx.descargarContratoPDF();
ok('...así «Descargar PDF» saca después ese mismo crédito con su misma hoja', num(impresos[2]) === 'M-1' && /PAGASI PROTECT/.test(impresos[2].html) && !/3\.14 bis/.test(impresos[2].html));
ctx.descargarContratoPDFById('M-4');
ok('un crédito archivado baja con SU contrato, no con el del primero de la lista', num(impresos[3]) === 'M-4' && /CLIENTE CON FIADOR/.test(impresos[3].html) && /3\.14 bis/.test(impresos[3].html) && els['sel-cred'].value === 'M-4' && els['sel-tipo-doc'].value === 'ga');
ctx.setTimeout = tOrig;

console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
