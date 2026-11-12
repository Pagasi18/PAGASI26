// La inicial la recibe el concesionario, directo del cliente (Adam, 12-nov-2026). El asistente de créditos la trae
// elegida así; el pago de la inicial y el gasto de la moto se registran igual que siempre, pero su entrada y su salida
// van a una cuenta puente que queda en cero: ninguna cuenta real de Pagasi se mueve.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0; const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const G={ console:{log(){},warn(){}}, String, Array, Object, Math, Date, JSON, parseFloat, parseInt, isNaN, setTimeout:()=>0,
  _cuentasBanc:[{nombre:'Binance 26',moneda:'USD'},{nombre:'100% Banco 26',moneda:'BS'}], S:{ movimientos:[], egresos:[], pagos:[], currentUser:{nombre:'ADAM'} },
  DB:{ saveEgreso(){}, saveMovimiento(){} }, hoyLocalISO:()=>'2026-11-12', motoNum:m=>m.id, fmt:n=>'$'+n,
  document:{getElementById:()=>null, querySelectorAll:()=>[]}, _concSedesDeSaldo:id=>[String(id)], _concGetById:()=>({nombre:'VELOZ'}) };
G.window=G; vm.createContext(G);
const cu=src('logic/cuentas.js'); vm.runInContext(cu.slice(cu.indexOf('function montoMov'), cu.indexOf('function movsCuenta')), G);
vm.runInContext(src('logic/moto-pagos.js'), G);
const cr=src('logic/creditos.js'); vm.runInContext(cr.slice(cr.indexOf('function _wzIniMetodoOpts()'), cr.indexOf('function _wzFaltaCuentaInicial')), G);
const PUENTE=G.CUENTA_INICIAL_CONC;
ok('la cuenta puente existe y no es ninguna cuenta del banco', PUENTE==='Inicial en concesionario' && !G._cuentasBanc.some(c=>c.nombre===PUENTE));
G.WZ={};
const o=G._wzIniMetodoOpts();
ok('el asistente trae la inicial "en el concesionario" y las cuentas de Pagasi quedan de opción', G.WZ.iniMetodo===PUENTE && /^<option value="Inicial en concesionario" selected>En el concesionario/.test(o) && />Binance 26 \(el cliente le pagó a Pagasi\)</.test(o));
G.WZ={ iniMetodo:'Binance 26' };
ok('si se elige una cuenta de Pagasi, se respeta', /value="Binance 26" selected/.test(G._wzIniMetodoOpts()) && G.WZ.iniMetodo==='Binance 26');
ok('_wzIniEsConc reconoce la cuenta puente', G._wzIniEsConc(PUENTE) && !G._wzIniEsConc('Binance 26') && !G._wzIniEsConc(''));

// El caso de la foto de Adam: moto de $1.390, inicial de $417, $973 del anticipo de la sede (que tiene $10.210)
G.S.movimientos.push({ id:'MOV-A', tipo:'transferencia', monto:10210, cuentaOrigen:'Binance 26', cuentaDestino:G.CUENTA_ANTICIPOS, concesionarioId:'C1' });
G.S.movimientos.push({ id:'MOV-B', tipo:'deposito', monto:20000, cuentaDestino:'Binance 26' });
const antesBin=G.saldoCuenta('Binance 26'), antesBco=G.saldoCuenta('100% Banco 26'), antesTot=G.totalCuentas();
const plan=G._mpagoPlanAuto({ costo:1390, inicial:417, cuentaInicial:PUENTE, concesionarioId:'C1', saldoAnticipo:G.saldoAnticipoDe('C1') });
ok('el pago de la moto se arma solo: $417 de la inicial y $973 del anticipo, sin que falte nada', plan.faltan.length===0 && plan.pagos.length===2 && plan.pagos[0].cuenta===PUENTE && plan.pagos[0].monto===417 && plan.pagos[1].cuenta==='ANT:C1' && plan.pagos[1].monto===973);
// Lo que hace el guardado: la inicial entra (pago + depósito) y la moto se paga (gastos + retiros)
G.S.pagos.push({ id:'PAG-I', cred:'M-1', monto:417, metodo:PUENTE, cuenta:PUENTE, esInicial:true, tipoOperacion:'inicial_credito', estado:'confirmado' });
G.S.movimientos.push({ id:'MOV-I', tipo:'deposito', tipoOperacion:'inicial_credito', conceptoPago:'PAG-I', monto:417, cuentaDestino:PUENTE });
const gastos=G._mpagoCrearGastos({ id:'M-1', modelo:'HM150' }, plan.pagos, { ids:[901,902], fecha:'2026-11-12' });
ok('la inicial sigue registrada como pago del crédito y la compra como dos gastos (los reportes leen eso)', G.S.pagos.length===1 && gastos.length===2 && G.S.egresos.map(e=>e.monto).join()==='417,973' && G.S.egresos.every(e=>e.origenAuto==='compra_moto'));
ok('la salida de la inicial es de la cuenta puente, no de un banco', gastos[0].mov.cuentaOrigen===PUENTE && gastos[0].egreso.forma===PUENTE);
ok('la cuenta puente queda en cero: entró y salió lo mismo', G.saldoCuenta(PUENTE)===0);
ok('Binance y el banco no se movieron por la inicial', G.saldoCuenta('Binance 26')===antesBin && G.saldoCuenta('100% Banco 26')===antesBco);
ok('lo financiado sale del anticipo de la sede, como siempre', G.saldoAnticipoDe('C1')===10210-973 && G.totalCuentas()===antesTot-973);
const ap=src('logic/aprobaciones.js');
ok('al aprobar una solicitud de concesionario también viene "en el concesionario"', /En el concesionario \(el cliente le pagó a la sede\)/.test(ap) && /CUENTA_INICIAL_CONC/.test(ap));
console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
