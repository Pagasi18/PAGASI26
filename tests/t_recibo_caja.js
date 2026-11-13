// El documento que se imprime de un pago es un RECIBO DE CAJA, no una factura (Adam, 13-nov-2026): sin N° de control y
// sin desglose de subtotal, IVA o IGTF; solo el total y su equivalente en bolívares.
const fs=require('fs'), path=require('path'), vm=require('vm');
let pass=0, fail=0; const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const fc=fs.readFileSync(path.join(__dirname,'..','logic','facturacion.js'),'utf8');
let html='';
const G={ console, Math, JSON, String, Number, Object, Array, parseFloat, parseInt, isNaN, toast(){},
  fmtFecha:f=>f.split('-').reverse().join('/'), fmtFechaHora:f=>'13/11/2026 10:27', S:{ facturas:[], pagos:[] } };
G.window=G; G._tasaBsGlobal=911.62;
G.open=()=>({ document:{ open(){}, write(h){ html+=h; }, close(){} } });
vm.createContext(G);
vm.runInContext(fc.slice(fc.indexOf('function _numeroALetras'), fc.indexOf('function abrirDetallePago')), G);
vm.runInContext(fc.slice(fc.indexOf('function imprimirFactura'), fc.indexOf('// Modal: anular factura')), G);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','logic','multimoneda.js'),'utf8'), G);
const fac={ id:'FAC-1', numero:'00000167', numeroControl:'00-00000167', pagoId:'PAG-1', fechaEmision:'2026-11-13', fechaCreacion:'2026-11-13T14:27:00Z',
  emisor:{ nombre:'PAGASI 18 C.A', rif:'J-50829589-7', direccion:'Av Los Chorros', tel:'04242177798', email:'info@pagasi.io' },
  cliente:{ nombre:'MICHAELL SARMIENTO', ci:'V-30496101', tel:'0424', direccion:'CASA 3' },
  concepto:'Crédito CRED-440 / HM 150', subtotal:8.62, iva:1.38, igtf:0.25, ivaAplica:true, igtfAplica:true, ivaRate:16, igtfRate:3, total:10, metodo:'100% Banco', referencia:'961352568', anulada:false };
G.S.facturas.push(fac);
const sale=fmt=>{ html=''; G.imprimirFactura('FAC-1', fmt); return html; };
['carta','media','ticket'].forEach(f=>{
  const h=sale(f), sinTitulo=h.replace(/RECIBO DE CAJA/g,'');
  ok(f+': dice RECIBO DE CAJA con su número, y no dice FACTURA', /RECIBO DE CAJA/.test(h) && /N° 00000167/.test(h) && !/FACTURA/.test(sinTitulo) && !/Factura/.test(h));
  ok(f+': sin N° de control y sin desglose de subtotal, IVA ni IGTF', !/Control/.test(h) && !/Subtotal/.test(h) && !/IVA/.test(h) && !/IGTF/.test(h) && !/8\.62/.test(h) && !/1\.38/.test(h));
  ok(f+': el total completo y su equivalente en bolívares a la tasa del día', /TOTAL:/.test(h) && /\$10\.00/.test(h) && /9116\.20/.test(h));
  ok(f+': cliente, concepto, método y referencia', /MICHAELL SARMIENTO/.test(h) && /Crédito CRED-440 \/ HM 150/.test(h) && /100% Banco/.test(h) && /961352568/.test(h));
});
ok('carta: "RECIBO DE CAJA A:" en lugar de "FACTURAR A:"', /RECIBO DE CAJA A:/.test(sale('carta')) && !/FACTURAR A/.test(sale('carta')));
// Multimoneda: si el pago entró en bolívares, el recibo dice los bolívares que entraron de verdad, no la tasa de hoy
G.S.pagos.push({ id:'PAG-1', monto:10, moneda:'BS', montoBs:9016.18, tasaBs:901.6175 });
ok('pago recibido en bolívares: el Total en Bs es el del pago (Bs 9.016,18), no el de la tasa de hoy', /9016\.18/.test(sale('carta')) && !/9116\.20/.test(sale('carta')));
ok('lo guardado no cambia: la factura conserva su subtotal, IVA y N° de control', fac.subtotal===8.62 && fac.iva===1.38 && fac.numeroControl==='00-00000167');
// ── El formulario: sin N° de control, y los cálculos y lo guardado exactamente igual (el contador, 13-nov-2026) ──
{
  const els={ fac_numero:{ value:'00000168' }, fac_fecha:{ value:'2026-11-13' }, fac_cli_nom:{ value:'ANA' }, fac_cli_ci:{ value:'V-1' }, fac_cli_tel:{ value:'' }, fac_cli_dir:{ value:'' },
    fac_concepto:{ value:'Pago de cuota 3' }, fac_iva_tgl:{ classList:{ contains:()=>true } }, fac_igtf_tgl:{ classList:{ contains:()=>false } } };
  const avisos=[], guardadas=[];
  const H={ console, Math, JSON, String, Number, Object, Array, Date, parseFloat, parseInt, isNaN, $:id=>els[id]||null, toast:(m,t)=>avisos.push([t,m]),
    hoyLocalISO:()=>'2026-11-13', getEmpresa:()=>({ nombre:'PAGASI 26, C.A.', rif:'J-1', direccion:'Caracas' }), abrirVerFactura(){}, DB:{ saveFactura:f=>guardadas.push(f) },
    S:{ pagos:[{ id:'PAG-9', cli:'ANA', cred:'M-1', monto:116, metodo:'Binance 26', referencia:'R1' }], facturas:[{ id:'FAC-0', numero:'00000167', numeroControl:'00-00000167', pagoId:'PAG-0' }], currentUser:{ nombre:'ADAM', uid:'u' } } };
  H.window=H; vm.createContext(H);
  vm.runInContext(fc.slice(fc.indexOf('function _facImpRates'), fc.indexOf('// Modal: ver factura ya emitida')), H);
  H.crearFactura('PAG-9');
  const f=guardadas[0];
  ok('crear el recibo no pide N° de control: se guarda vacío y no avisa nada', !!f && f.numeroControl==='' && !avisos.some(a=>a[0]==='error'));
  ok('la base, el IVA y el total se calculan y se guardan igual que siempre (116 = 100 + 16)', Math.abs(f.subtotal-100)<1e-9 && Math.abs(f.iva-16)<1e-9 && f.total===116 && f.ivaAplica===true && f.ivaRate===16 && f.igtf===0);
  ok('los demás atributos no cambian (número, pago, fecha, cliente, concepto, método, referencia)', f.numero==='00000168' && f.pagoId==='PAG-9' && f.fechaEmision==='2026-11-13' && f.cliente.nombre==='ANA' && f.concepto==='Pago de cuota 3' && f.metodo==='Binance 26' && f.referencia==='R1' && f.anulada===false);
  H.S.pagos.push({ id:'PAG-10', cli:'LUIS', monto:50 }); els.fac_numero.value='00000169';
  H.crearFactura('PAG-10');
  ok('dos recibos seguidos sin N° de control no chocan entre sí', guardadas.length===2 && guardadas[1].numeroControl==='');
  els.fac_numero.value='00000168'; H.S.pagos.push({ id:'PAG-11', cli:'X', monto:5 }); H.crearFactura('PAG-11');
  ok('el N° de recibo repetido sí se rechaza', guardadas.length===2 && avisos.some(a=>/ya está usado en otro recibo/.test(a[1])));
  ok('el formulario ya no tiene el campo de N° de control', !/id="fac_control"/.test(fc) && /N° de Recibo de Caja/.test(fc));
  ok('los botones dicen Recibo de Caja', /Generar Recibo de Caja<\/button>/.test(fc) && /Ver Recibo de Caja<\/button>/.test(fc) && /Crear Recibo de Caja<\/button>/.test(fc) && !/>Generar Factura<|>Ver Factura<|>Crear Factura<|>Anular Factura</.test(fc));
  const mp=fs.readFileSync(path.join(__dirname,'..','modules','pagos.js'),'utf8');
  ok('la lista de pagos dice Recibo', /<th>Recibo<\/th>/.test(mp) && /— sin recibo —/.test(mp));
  ok('el cálculo de impuestos no se tocó', /var base = monto \/ \(\(1\+aliv\) \* \(1\+aligtf\)\);\n  var iva  = base \* aliv;\n  var igtf = \(base \+ iva\) \* aligtf;/.test(fc));
}

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
