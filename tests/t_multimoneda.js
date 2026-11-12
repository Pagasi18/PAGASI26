// Multimoneda (Adam, 11-nov-2026): cobros, gastos y cuentas en bolívares con la tasa elegida anclada a cada registro.
// Aquí lo que no necesita navegador: los bolívares de un registro, el saldo real en Bs de una cuenta, la diferencia
// cambiaria, y que los formularios de siempre siguen guardando el monto en dólares.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0; const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const M=require('../logic/multimoneda.js');
const cerca=(a,b)=>Math.abs(a-b)<0.005;

// ── Los bolívares de un registro ──
const pago={ id:'PAG-1', monto:53, tasaBs:880 };
M.mmAplicar(pago, { montoBs:47147.74, tasaBs:889.58, tasaMoneda:'usd', tasaFecha:'2026-11-10', tasaFuente:'bcv.org.ve' });
ok('un cobro en bolívares guarda los Bs, la tasa elegida, de qué fecha y de dónde salió; el monto sigue en dólares', pago.moneda==='BS' && pago.montoBs===47147.74 && pago.tasaBs===889.58 && pago.tasaFecha==='2026-11-10' && pago.tasaFuente==='bcv.org.ve' && pago.monto===53);
ok('la cuota completa en bolívares da la cuota exacta en dólares: no quedan centavos', M._mmBsAUsd(M._mmUsdABs(53, 889.58), 889.58)===53 && M._mmBsAUsd(M._mmUsdABs(94.37, 912.4417), 912.4417)===94.37);
let exactas=true; for(let c=1;c<=400;c++){ const usd=c*0.37+10, t=880+c*0.731; if(M._mmBsAUsd(M._mmUsdABs(Math.round(usd*100)/100, t), t)!==Math.round(usd*100)/100) exactas=false; }
ok('...y lo mismo para 400 montos y tasas distintos', exactas);
const mov={ id:'MOV-1', monto:53, tasaBs:880 }; M.mmCopiar(mov, pago);
ok('el movimiento de la cuenta lleva los mismos bolívares que el pago', mov.moneda==='BS' && mov.montoBs===47147.74 && mov.tasaBs===889.58);
ok('en las listas se lee "Bs 47.147,74 a 889,58"', M.mmTexto(pago)==='Bs 47.147,74 a 889,58' && M.mmTexto({ monto:53 })==='');
M.mmAplicar(pago, null);
ok('si el pago se corrige a una cuenta en dólares, los bolívares se quitan y queda como cualquier pago en dólares', pago.moneda===undefined && pago.montoBs===undefined && pago.monto===53 && pago.tasaBs===889.58);
const viejo={ id:'PAG-0', monto:20, tasaBs:500 }; M.mmAplicar(viejo, null);
ok('un pago viejo en dólares no se toca', JSON.stringify(viejo)==='{"id":"PAG-0","monto":20,"tasaBs":500}');
ok('sin bolívares o sin tasa no se sella nada', M.mmAplicar({ monto:5 }, { montoBs:0, tasaBs:900 }).moneda===undefined && M.mmAplicar({ monto:5 }, { montoBs:100, tasaBs:1 }).moneda===undefined);

// ── El saldo real en bolívares de una cuenta ──
const C='Banco Bs';
const movs=[
  { id:'MOV-1790000000001', tipo:'deposito', monto:100, cuentaDestino:C, moneda:'BS', montoBs:80000, tasaBs:800 },
  { id:'MOV-1790000000002', tipo:'deposito', monto:50, cuentaDestino:C, tasaBs:820 },                                 // viejo: sin Bs guardados
  { id:'MOV-1790000000003', tipo:'retiro', monto:30, cuentaOrigen:C, moneda:'BS', montoBs:27000, tasaBs:900 },
  { id:'MOV-1790000000004', tipo:'deposito', monto:999, cuentaDestino:'Binance', tasaBs:900 },                        // otra cuenta
  { id:'MOV-1790000000005', tipo:'deposito', monto:10, cuentaDestino:C, moneda:'BS', montoBs:9000, tasaBs:900, eliminado:true }
];
let s=M.mmSaldoBs(C, movs, null);
ok('saldo en Bs: suma lo que entró y resta lo que salió, en bolívares de verdad (80.000 + 41.000 estimado − 27.000)', s.bs===94000 && s.estimados===1 && !s.cuadrado);
ok('en libros (dólares, cada movimiento a la tasa de su día): 100 + 50 − 30', M.mmLibro(C, movs)===120);
s=M.mmSaldoBs(C, movs, { saldoBs:70000, enMs:1790000000002 });
ok('cuadrado con el banco: cuenta desde el saldo real y solo lo anotado después (70.000 − 27.000)', s.bs===43000 && s.estimados===0 && s.cuadrado);
let v=M.mmValor(C, movs, null, 1000);
ok('lo que valen hoy: 94.000 Bs a 1.000 son $94; en libros $120; pérdida cambiaria de $26', v.real===94 && v.libro===120 && v.dif===-26);
ok('sin tasa del día no inventa un valor', M.mmValor(C, movs, null, 0).real===null && M.mmValor(C, movs, null, 0).dif===null);

// ── Cambiar bolívares por dólares ──
const antes={ bs:94000, libro:120 };
ok('cambio de la mitad de los bolívares a 1.000: entran $47, costaban $60 en libros, pérdida de $13', M.mmDiferenciaCambio(antes, 47000, 47)===-13);
ok('si se cambia a mejor tasa que la de los libros, es ganancia', M.mmDiferenciaCambio({ bs:80000, libro:100 }, 80000, 104)===4);
ok('sin saldo en bolívares o sin valor en libros no se anota nada', M.mmDiferenciaCambio({ bs:0, libro:0 }, 1000, 1)===0 && M.mmDiferenciaCambio(null, 1000, 1)===0);
const md=M.mmMovDiferencia(C, -13, '2026-11-11', 1000, 'ADAM', 1790000000010, 'cambio a Binance');
ok('la pérdida es un retiro de la cuenta de bolívares, marcado, que no mueve bolívares', md.tipo==='retiro' && md.cuentaOrigen===C && md.cuentaDestino===null && md.monto===13 && md.sinBs===true && md.tipoOperacion==='ajuste_cambiario' && /pérdida/.test(md.concepto));
const mg=M.mmMovDiferencia(C, 4, '2026-11-11', 1000, 'ADAM', 1790000000011);
ok('la ganancia es un depósito a la cuenta', mg.tipo==='deposito' && mg.cuentaDestino===C && mg.monto===4);
ok('diferencia de cero: no hay movimiento', M.mmMovDiferencia(C, 0, '2026-11-11', 1000)===null);
const con=movs.concat([md]);
ok('con la pérdida anotada, los libros bajan y los bolívares no cambian', M.mmLibro(C, con)===107 && M.mmSaldoBs(C, con, null).bs===94000);
ok('lo registrado como diferencia cambiaria en el mes: −13 + 4', M.mmDiferenciaRegistrada(con.concat([mg]), '2026-11')===-9 && M.mmDiferenciaRegistrada(con.concat([mg]), '2026-10')===0);
// Después de registrar toda la diferencia, los libros dicen lo que valen los bolívares
const todo=M.mmValor(C, movs, null, 1000), aj=M.mmMovDiferencia(C, todo.dif, '2026-11-11', 1000, 'ADAM', 1790000000012);
ok('registrar la diferencia deja los libros iguales al valor real', M.mmValor(C, movs.concat([aj]), null, 1000).dif===0);

// ── Nada de la lógica cambia: los formularios guardan el monto en dólares igual que antes ──
const pg=src('logic/pagos.js'), cu=src('logic/cuentas.js'), mm=src('logic/multimoneda.js');
ok('Registrar Pago, Liquidación y Editar Pago enganchan el bloque de bolívares sobre el campo de dólares de siempre', /mmEnganchar\(\{ p:'p', monto:'p_monto'/.test(pg) && /mmEnganchar\(\{ p:'liq', monto:'liq_monto_final'/.test(pg) && /mmEnganchar\(\{ p:'ep', monto:'ep_monto'/.test(pg));
ok('...y el monto que guardan sigue saliendo del mismo campo en dólares', /const monto=parseFloat\(\(\$\('p_monto'\)&&\$\('p_monto'\)\.value\)\)\|\|0;/.test(pg) && /var nuevoMonto = parseFloat\(\(\$\('ep_monto'\)&&\$\('ep_monto'\)\.value\)\)\|\|0;/.test(pg));
ok('el saldo en dólares de una cuenta se calcula igual que siempre (saldoCuenta no cambió)', /function saldoCuenta\(nombre\)\{\n  var s=0;\n  S\.movimientos\.filter\(function\(m\)\{return !m\.eliminado;\}\)\.forEach\(function\(m\)\{\n    var v = montoMov\(m\);\n    if\(m\.cuentaDestino===nombre\) s\+=v;\n    if\(m\.cuentaOrigen===nombre\) s-=v;/.test(cu));
ok('depósito, retiro y transferencia: la moneda la decide la cuenta (ya no hay un selector de moneda suelto)', !/dep_moneda|ret_moneda|tr_tasa/.test(cu) && /mmEnganchar\(\{ p:'dep'/.test(cu) && /mmEnganchar\(\{ p:'ret'/.test(cu) && /mmEnganchar\(\{ p:'tr'.*libre:true/.test(cu));
ok('multimoneda no toca créditos: no lee ni escribe cuotas, mora ni amortización', !/S\.creds|cuotaQ|saldoProxCuota|recalcularCreditoDesdePagos|calcularMoraAuto/.test(mm));
ok('multimoneda solo escribe en la base el saldo cuadrado y el movimiento de diferencia, por DB', !/db\.collection|\.set\(|\.update\(/.test(mm) && /DB\.guardarAperturaBs/.test(mm) && /DB\.saveMovimiento/.test(mm));
const adm=src('admin.html');
ok('admin.html carga multimoneda.js después de tasas.js y antes de pagos.js', adm.indexOf('logic/tasas.js')<adm.indexOf('logic/multimoneda.js') && adm.indexOf('logic/multimoneda.js')<adm.indexOf('logic/pagos.js'));

// ── Avisos de cobranza y portal del cliente: el monto también en bolívares, de referencia ──
const A=require('../bot/avisos-cuotas.js');
const av={ tipo:'recordatorio', nombre:'Luis', monto:53, fechaVence:'2026-11-15', numero:3, totalCuotas:24 };
A.fijarTasaBs(0);
ok('aviso sin tasa del día: sale igual que siempre, solo en dólares', !/bolívares/.test(A.mensajeCliente(av)));
ok('la tasa del aviso es la del día o, si no hay, la última anterior', A.tasaDelDia('2026-11-14', { '2026-11-10':{ usd:899.27 }, '2026-11-11':{ usd:901.6175 }, '2026-11-17':{ usd:950 } })===901.6175 && A.tasaDelDia('2026-01-01', { '2026-11-10':{ usd:899.27 } })===0);
A.fijarTasaBs(901.6175);
ok('aviso con tasa: agrega la línea en bolívares debajo del monto', /• Monto: \$53,00\n• En bolívares hoy: Bs 47\.785,73 \(tasa BCV 901,62\)\n/.test(A.mensajeCliente(av)));
ok('...también en el aviso de mora y en el urgente', /• En bolívares hoy: Bs 1\.130\.177,54/.test(A.mensajeCliente({ tipo:'atrasado', nombre:'L', monto:1253.5, dias:9, numero:3, cred:'M-1' })) && /• En bolívares hoy: Bs /.test(A.mensajeCliente({ tipo:'critico', nombre:'L', monto:100, dias:40, cred:'M-1' })));
A.fijarTasaBs(0);
const mc=src('micuenta.html');
ok('portal: muestra el pago en bolívares a la tasa BCV del día y deja reportar un pago móvil en bolívares', /function enBsHtml\(usd\)/.test(mc) && /completado \? '' : enBsHtml\(monto\)/.test(mc) && /<option value="Pago móvil Bs">/.test(mc) && /id="pBs"/.test(mc));
ok('portal: el comprobante sigue con los mismos campos que aceptan las Reglas (los Bs van en la referencia)', /referencia: refTxt,/.test(mc) && !/montoBs/.test(mc));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
