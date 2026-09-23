// 23-sep-2026, Adam: "LOS ANTICIPOS NO SE ESTAN REGISTRANDO COMO SALIDA EN LAS CUENTAS..
// ESO ES GRAVISIMO". Y lo era: se le manda dinero por adelantado a un concesionario, sale
// del banco de verdad, y el sistema no lo veía. El saldo de las cuentas decía tener más
// plata de la que hay — $6.463 de más en PAGASI 26 el día del lanzamiento.
// Además, el campo "Método" era una lista fija (Binance, Efectivo, Transferencia, Otro)
// que no tenía nada que ver con las cuentas de Configuración: elegías "Binance" y no
// existía ninguna cuenta con ese nombre.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const cs=src('logic/concesionarios.js');

function entorno(movs){
  const G={ console:{log(){},warn(){}}, Math, parseFloat, String, Number, Array, Object, Date, isNaN,
    S:{ movimientos: movs||[], concesionarios:[], currentUser:{nombre:'Adam'} },
    hoyLocalISO:()=>'2026-09-23', fmt:n=>'$'+(parseFloat(n)||0).toFixed(2),
    DB:{ guardados:[], saveMovimiento(m){ this.guardados.push(m); } }, window:{} };
  G.window=G; vm.createContext(G);
  vm.runInContext(cs.slice(cs.indexOf('function _concAnticiposSinMovimiento'), cs.indexOf('function _concDelAnticipo')), G);
  return G;
}

// ── El anticipo sale de la cuenta ───────────────────────────────────────────
let G=entorno([]);
let id=G._concAnticipoMovimiento({id:'C1',nombre:'EMPIRE Bello Monte'},
  {id:'ANT-1', monto:4012, cuenta:'Binance 26', fecha:'2026-09-23', ref:'2020'});
let mov=G.S.movimientos[0];
ok('registrar un anticipo crea su movimiento', G.S.movimientos.length===1 && id==='MOV-ANT-ANT-1');
ok('...es una SALIDA de la cuenta elegida', mov.tipo==='retiro' && mov.cuentaOrigen==='Binance 26' && !mov.cuentaDestino);
ok('...por el monto del anticipo', mov.monto===4012);
ok('...y se guarda en la base', G.DB.guardados.length===1);
ok('...dice a qué sede fue', /EMPIRE Bello Monte/.test(mov.concepto) && mov.concesionarioId==='C1');
ok('...y queda atado al anticipo, para poder deshacerlo', mov.anticipoId==='ANT-1');
ok('no es un gasto, es plata adelantada: no infla los egresos del mes',
  mov.tipoOperacion==='anticipo_concesionario' && cs.indexOf("tipoOperacion: 'anticipo_concesionario'")>-1);

// Un anticipo negativo es una devolución de la sede: el dinero ENTRA
G=entorno([]);
G._concAnticipoMovimiento({id:'C1',nombre:'TORO'}, {id:'ANT-2', monto:-500, cuenta:'Binance 26', fecha:'2026-09-23'});
mov=G.S.movimientos[0];
ok('una devolución de la sede entra a la cuenta', mov.tipo==='deposito' && mov.cuentaDestino==='Binance 26' && !mov.cuentaOrigen);
ok('...por el monto en positivo', mov.monto===500);
ok('...y se llama por su nombre', /Devolución de anticipo/.test(mov.concepto));

// Cero no mueve nada
G=entorno([]);
ok('un anticipo de cero no crea movimiento',
  G._concAnticipoMovimiento({id:'C1'}, {id:'ANT-3', monto:0, cuenta:'Binance 26'})==='' && G.S.movimientos.length===0);

// ── Anular el anticipo devuelve la plata ────────────────────────────────────
G=entorno([{id:'MOV-ANT-ANT-9', tipo:'retiro', monto:1000, cuentaOrigen:'Binance 26'}]);
G._concAnticipoMovimientoAnular({id:'ANT-9', movimientoId:'MOV-ANT-ANT-9'});
ok('al eliminar el anticipo, su movimiento deja de contar', G.S.movimientos[0].eliminado===true);
ok('...pero no se borra: queda el rastro de quién y cuándo',
  !!G.S.movimientos[0].eliminadoEn && G.S.movimientos[0].eliminadoPor==='Adam');
ok('...y se guarda el cambio', G.DB.guardados.length===1);
G=entorno([]);
ok('anular un anticipo sin movimiento no revienta',
  (function(){ try{ G._concAnticipoMovimientoAnular({id:'ANT-X'}); return true; }catch(e){ return false; } })());

// ── Los que quedaron sueltos se avisan, no se callan ───────────────────────
G=entorno([{id:'MOV-ANT-ANT-1', tipo:'retiro', monto:4012}]);
G.S.concesionarios=[
  {id:'C1', nombre:'EMPIRE', anticipos:[{id:'ANT-1', monto:4012}, {id:'ANT-2', monto:2451}]},
  {id:'C2', nombre:'TORO',   anticipos:[{id:'ANT-3', monto:900, eliminado:true}]},
];
const sueltos=G._concAnticiposSinMovimiento();
ok('se detecta el anticipo que no descontó de ninguna cuenta', sueltos.length===1 && sueltos[0].monto===2451);
ok('...el que sí tiene movimiento no se cuenta', !sueltos.some(x=>x.monto===4012));
ok('...y un anticipo eliminado tampoco', !sueltos.some(x=>x.monto===900));
const aviso=G._concAvisoAnticiposSueltos();
ok('la pantalla lo dice, con el monto', aviso.indexOf('$2451.00')>-1 && /no está descontado de ninguna cuenta/.test(aviso));
ok('...y explica por qué importa', /más plata de la que hay/.test(aviso));
G.S.concesionarios=[{id:'C1', anticipos:[{id:'ANT-1', monto:4012}]}];
ok('sin anticipos sueltos no se avisa de nada', G._concAvisoAnticiposSueltos()==='');

// ── La cuenta se elige de las de verdad ─────────────────────────────────────
ok('el formulario pide de qué cuenta sale', cs.indexOf('¿De qué cuenta sale?')>-1);
ok('...con las cuentas de Configuración, no una lista inventada',
  /_cuentasBanc\.map\(function\(x\)\{ return '<option value="'\+x\.nombre/.test(cs)
  && cs.indexOf("<option>Transferencia bancaria</option>")===-1);
ok('...y sin cuenta no deja guardar', /if\(!cuentaAnt\)\{ toast\('Elige de qué cuenta sale el anticipo'/.test(cs));
ok('la pantalla avisa de que el dinero sale de verdad', /sale de la cuenta que elijas/.test(cs));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
