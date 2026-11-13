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
console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
