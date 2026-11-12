// Pago duplicado al registrar el pago de un cliente (Adam, 12-nov-2026), y el aviso de moneda en los gastos: los siete
// gastos del 10 y 11 de noviembre que entraron unas 900 veces más grandes (bolívares guardados como dólares).
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0; const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const preguntas=[]; let respuesta=false;
const G={ console, Math, JSON, String, Number, Object, Array, parseFloat, parseInt, isNaN, S:{ pagos:[] }, fmt:n=>'$'+(+n).toFixed(2), confirm:t=>{ preguntas.push(t); return respuesta; } };
G.window=G; vm.createContext(G);
const pg=src('logic/pagos.js'); vm.runInContext(pg.slice(pg.indexOf('function _pagoRefNorm'), pg.indexOf('function updPagoMonto')), G);
const eg=src('logic/egresos.js'); vm.runInContext(eg.slice(eg.indexOf('function egMontoFueraDeFactura'), eg.indexOf('function _egMontoCuadraConFactura')), G);

const pagos=[
  { id:'PAG-1', cli:'ERICK PEREZ', cred:'M-015', monto:50, fecha:'2026-11-10', referencia:'063144048233', realizadoPor:'Daniela', estado:'confirmado' },
  { id:'PAG-2', cli:'ANA', cred:'M-020', monto:98, fecha:'2026-11-09', referencia:'001247909992' },
  { id:'PAG-3', cli:'LUIS', cred:'M-030', monto:53, fecha:'2026-11-10', referencia:'', eliminado:true },
  { id:'PAG-4', cli:'ERICK PEREZ', cred:'M-015', monto:500, fecha:'2026-11-10', referencia:'', esInicial:true }
];
const d=(n,ex)=>G.pagosDuplicadosDe(n, pagos, ex).map(x=>x.pago.id+':'+x.motivo);
ok('mismo crédito, mismo monto y misma fecha: avisa', d({ cred:'M-015', monto:50, fecha:'2026-11-10', referencia:'063144507528' }).join()==='PAG-1:mismo crédito, mismo monto y misma fecha');
ok('misma referencia en otro crédito y con otro monto: avisa (una referencia de banco no se repite)', d({ cred:'M-099', monto:10, fecha:'2026-11-12', referencia:'001247909992' }).join()==='PAG-2:misma referencia');
ok('la referencia se compara sin ceros a la izquierda, espacios ni guiones', d({ cred:'M-099', monto:10, fecha:'2026-11-12', referencia:' 1247909992 ' }).length===1 && d({ cred:'M-099', monto:10, fecha:'2026-11-12', referencia:'0012-4790-9992' }).length===1);
ok('mismo crédito y monto pero otro día: no avisa (es la cuota siguiente)', d({ cred:'M-015', monto:50, fecha:'2026-11-25', referencia:'9999999' }).length===0);
ok('mismo día pero otro monto: no avisa', d({ cred:'M-015', monto:45, fecha:'2026-11-10', referencia:'8888888' }).length===0);
ok('un pago eliminado no cuenta', d({ cred:'M-030', monto:53, fecha:'2026-11-10', referencia:'' }).length===0);
ok('la inicial del crédito no se confunde con una cuota del mismo monto', d({ cred:'M-015', monto:500, fecha:'2026-11-10', referencia:'' }).length===0);
ok('sin referencia, o con una muy corta, no se compara por referencia', d({ cred:'M-099', monto:1, fecha:'2026-11-12', referencia:'' }).length===0 && d({ cred:'M-099', monto:1, fecha:'2026-11-12', referencia:'12' }).length===0);
G.S.pagos=pagos; respuesta=false;
ok('al registrar: pregunta, dice cuál es el pago y quién lo registró, y si se cancela no guarda', G._pagoDuplicadoConfirmar({ cred:'M-015', monto:50, fecha:'2026-11-10', referencia:'x' })===false && /PAGO DUPLICADO/.test(preguntas[0]) && /ERICK PEREZ · M-015 · \$50\.00 · 2026-11-10 · ref\. 063144048233 · lo registró Daniela/.test(preguntas[0]));
respuesta=true;
ok('...si se confirma, deja guardarlo (un cliente puede pagar dos veces lo mismo el mismo día)', G._pagoDuplicadoConfirmar({ cred:'M-015', monto:50, fecha:'2026-11-10', referencia:'x' })===true);
preguntas.length=0;
ok('...y sin duplicado no pregunta nada', G._pagoDuplicadoConfirmar({ cred:'M-777', monto:50, fecha:'2026-11-10', referencia:'777777' })===true && preguntas.length===0);
ok('Registrar Pago revisa el duplicado antes de guardar', /if\(!_pagoDuplicadoConfirmar\(\{ cred:credId, monto:monto,/.test(pg) && pg.indexOf('_pagoDuplicadoConfirmar({ cred:credId')<pg.indexOf('S.pagos.push(newPago)'));

// ── Gastos: el monto frente a su factura ──
ok('la carpeta: gasto de $96.220,84 con factura de $106,72: no cuadra', G.egMontoFueraDeFactura(96220.84, { base:92, iva:14.72, exento:'' })===106.72);
ok('el caso bueno: $106,72 con factura de $106,72', G.egMontoFueraDeFactura(106.72, { base:92, iva:14.72 })===0);
ok('un gasto pagado en parte o con propina no molesta (hasta cinco veces de diferencia)', G.egMontoFueraDeFactura(60, { base:100, iva:16 })===0 && G.egMontoFueraDeFactura(300, { base:100, iva:16 })===0);
ok('al revés (dólares guardados como bolívares): también avisa', G.egMontoFueraDeFactura(0.12, { base:92, iva:14.72 })===106.72);
ok('sin factura no hay con qué comparar', G.egMontoFueraDeFactura(96220.84, null)===0 && G.egMontoFueraDeFactura(96220.84, { noAplica:true })===0 && G.egMontoFueraDeFactura(96220.84, { base:'', iva:'' })===0);
ok('Registrar Egreso lo revisa antes de guardar, al registrar y al corregir', /if\(!_egMontoCuadraConFactura\(monto\)\) return false;/.test(eg) && eg.indexOf('_egMontoCuadraConFactura(monto)')<eg.indexOf('if(editar) return _egGuardarCorreccion'));
ok('un gasto nuevo no convierte los montos al cambiar de moneda; al corregir sí', /_lbSinConvertir\.egf=!editar;/.test(eg));
console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
