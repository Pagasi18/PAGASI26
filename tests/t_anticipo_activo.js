// 23-sep-2026, Adam: "los anticipos aparecen como un egreso de la cuenta, pero en
// realidad siguen siendo un activo de pagasi, y solo se deduce de la cuenta cuando
// prestamos dinero en el concesionario".
// Tenía razón y el arreglo de la mañana se quedó a mitad. Cuando Pagasi le manda
// $10.000 a una sede el dinero SALE del banco —eso es cierto— pero Pagasi no perdió
// $10.000: los tiene en poder del concesionario. Contarlo como salida a secas hacía
// ver a la empresa más pobre de lo que es. Ahora el dinero se mueve a una cuenta donde
// espera, y de ahí se descuenta cuando sale una moto: el momento en que deja de ser
// efectivo y se convierte en un crédito por cobrar.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

function caja(movs, cuentas, concs){
  const G={ console:{log(){},warn(){}}, Math, parseFloat, isNaN, String, Number, Array, Object, Date, JSON,
    S:{ movimientos: movs||[], currentUser:{nombre:'Adam'} },
    _cuentasBanc: cuentas || [{nombre:'Binance 26'},{nombre:'100% Banco 26'}],
    _concGetById:(id)=>((concs||{})[id] || {id:id, nombre:id}),
    fmt:n=>'$'+(parseFloat(n)||0).toFixed(2), hoyLocalISO:()=>'2026-09-23',
    toast(){}, DB:{saveMovimiento(){}}, document:{getElementById:()=>null}, window:{} };
  G.window=G; vm.createContext(G);
  const cu=src('logic/cuentas.js');
  vm.runInContext(cu.slice(0, cu.indexOf('function movsCuenta')), G);
  return G;
}
// El movimiento tal como lo crea el sistema al registrar un anticipo
function anticipo(id, cid, nombre, monto, cuenta){
  const G=caja([], null, {});
  const cs=src('logic/concesionarios.js');
  const G2={ console:{log(){},warn(){}}, Math, parseFloat, String, Number, Array, Object, Date,
    S:{movimientos:[], currentUser:{nombre:'Adam'}}, CUENTA_ANTICIPOS:'Anticipos en concesionarios',
    hoyLocalISO:()=>'2026-09-23', DB:{saveMovimiento(){}}, window:{} };
  G2.window=G2; vm.createContext(G2);
  vm.runInContext(cs.slice(cs.indexOf('function _concAnticipoMovimiento'), cs.indexOf('function _concAnticipoMovimientoAnular')), G2);
  G2._concAnticipoMovimiento({id:cid, nombre:nombre}, {id:id, monto:monto, cuenta:cuenta, fecha:'2026-09-23'});
  return G2.S.movimientos[0];
}

// ── El dinero cambia de sitio, no desaparece ────────────────────────────────
const m1=anticipo('ANT-1','C1','MOTOS TORO',10000,'Binance 26');
ok('el anticipo sale del banco', m1.cuentaOrigen==='Binance 26');
ok('...y entra a la cuenta donde el dinero espera', m1.cuentaDestino==='Anticipos en concesionarios');
ok('...es una transferencia, no una salida', m1.tipo==='transferencia');
ok('...y queda anotado de qué sede es', m1.concesionarioId==='C1');

let G=caja([m1]);
ok('Binance baja los 10.000', G.saldoCuenta('Binance 26')===-10000);
ok('...y la cuenta de anticipos los tiene', G.saldoCuenta('Anticipos en concesionarios')===10000);
ok('EL DINERO DE PAGASI NO CAMBIA: eso era lo que estaba mal', G.totalCuentas()===0);

// ── Y se descuenta cuando sale una moto ─────────────────────────────────────
const compra={ id:'MOV-MOTO-1', tipo:'retiro', tipoOperacion:'compra_moto', monto:923,
  cuentaOrigen:'Anticipos en concesionarios', concesionarioId:'C1', concepto:'Egreso · Compra de moto' };
G=caja([m1, compra]);
ok('la moto se paga del anticipo, no del banco otra vez', G.saldoCuenta('Binance 26')===-10000);
ok('...y el anticipo baja por lo que puso Pagasi', G.saldoCuenta('Anticipos en concesionarios')===9077);
ok('...ahora sí baja el dinero de Pagasi: se convirtió en un crédito por cobrar', G.totalCuentas()===-923);
ok('el saldo de ESA sede es el que queda', G.saldoAnticipoDe('C1')===9077);

// Dos sedes no se mezclan
const m2=anticipo('ANT-2','C2','BERA Petare',3000,'Binance 26');
G=caja([m1, m2, compra]);
ok('cada sede lleva su propia cuenta', G.saldoAnticipoDe('C1')===9077 && G.saldoAnticipoDe('C2')===3000);
ok('...y el total de anticipos las suma', G.saldoCuenta('Anticipos en concesionarios')===12077);
const conSaldo=G.anticiposConSaldo();
ok('las sedes con dinero esperando salen ordenadas de mayor a menor',
  conSaldo.length===2 && conSaldo[0].saldo===9077 && conSaldo[1].saldo===3000);
ok('una sede sin anticipo no aparece', !conSaldo.some(x=>x.id==='C9'));

// ── La devolución: el dinero vuelve al banco ────────────────────────────────
const dev=anticipo('ANT-3','C1','MOTOS TORO',-500,'Binance 26');
ok('una devolución sale de la cuenta de anticipos', dev.cuentaOrigen==='Anticipos en concesionarios');
ok('...y vuelve al banco', dev.cuentaDestino==='Binance 26');
G=caja([m1, dev]);
ok('Binance recupera los 500', G.saldoCuenta('Binance 26')===-9500);
ok('...y el anticipo baja', G.saldoAnticipoDe('C1')===9500);
ok('el dinero de Pagasi sigue sin cambiar', G.totalCuentas()===0);

// ── El paso 3 ofrece pagar con el anticipo ──────────────────────────────────
(function(){
  const G3={ console:{log(){},warn(){}}, Math, parseFloat, String, Number, Array, Object, Date,
    _cuentasBanc:[{nombre:'Binance 26'}], fmt:n=>'$'+(parseFloat(n)||0).toFixed(2),
    anticiposConSaldo:()=>[{id:'C1', nombre:'MOTOS TORO', saldo:9077}],
    _concGetById:(id)=>({id:id, nombre:'MOTOS TORO'}),
    document:{getElementById:()=>null}, window:{} };
  G3.window=G3; vm.createContext(G3);
  const mp=src('logic/moto-pagos.js');
  vm.runInContext(mp.slice(0, mp.indexOf('function _mpagoAgregarFila')), G3);
  const opts=G3._mpagoMetodosOpts();
  ok('el paso 3 ofrece el anticipo de la sede, con su saldo',
    opts.indexOf('Anticipo — MOTOS TORO ($9077.00 disponible)')>-1);
  ok('...junto a las cuentas del banco', opts.indexOf('>Binance 26<')>-1);
  ok('...identificado por su sede, no por un nombre suelto', opts.indexOf('value="ANT:C1"')>-1);
  ok('el sistema distingue un anticipo de una cuenta', G3._mpagoEsAnticipo('ANT:C1') && !G3._mpagoEsAnticipo('Binance 26'));
  ok('...y sabe de qué sede es', G3._mpagoConcDeAnticipo('ANT:C1')==='C1');
  ok('en el papel del gasto se lee el nombre, no el código',
    G3._mpagoNombreCuenta('ANT:C1')==='Anticipo — MOTOS TORO' && G3._mpagoNombreCuenta('Binance 26')==='Binance 26');
})();
ok('el movimiento de la compra sale de la cuenta de anticipos cuando se elige así',
  /_mpagoEsAnticipo\(p\.cuenta\)[\s\S]{0,180}CUENTA_ANTICIPOS/.test(src('logic/moto-pagos.js')));
ok('...y deja anotada la sede, para saber de qué anticipo se descontó',
  /concesionarioId: _mpagoEsAnticipo\(p\.cuenta\) \? _mpagoConcDeAnticipo\(p\.cuenta\) : undefined/.test(src('logic/moto-pagos.js')));

// ── El comprobante de la transferencia ──────────────────────────────────────
const cs=src('logic/concesionarios.js');
ok('el formulario pide el comprobante', /id="cant_comp" type="file"/.test(cs));
ok('...acepta foto o PDF', /accept="image\/\*,application\/pdf"/.test(cs));
ok('...se sube después de guardar el anticipo', /_concAnticipoSubirComprobante\(c, ant,/.test(cs));
ok('...y si la subida falla, el anticipo NO se pierde',
  /el anticipo ya quedo registrado/.test(cs) && /El anticipo quedó registrado, pero el comprobante no subió/.test(cs));
ok('...hay un límite de tamaño, con aviso claro', /10 \* 1024 \* 1024/.test(cs) && /pesa más de 10 MB/.test(cs));
ok('...y queda a la vista en la lista de anticipos', /a\.comprobante[\s\S]{0,120}target="_blank"/.test(cs));

// ── Los anticipos que ya estaban registrados como salida ───────────────────
// Los nueve que PAGASI 26 cargó esta mañana quedaron con el formato viejo. No se
// corrigen solos a propósito: tocar movimientos de dinero sin que nadie lo pida es la
// clase de arreglo que después nadie sabe explicar.
(function(){
  const viejo={ id:'MOV-ANT-1', tipoOperacion:'anticipo_concesionario', tipo:'retiro',
                monto:10000, cuentaOrigen:'Binance 26', concesionarioId:'C1' };
  const nuevo={ id:'MOV-ANT-2', tipoOperacion:'anticipo_concesionario', tipo:'transferencia',
                monto:3000, cuentaOrigen:'Binance 26', cuentaDestino:'Anticipos en concesionarios', concesionarioId:'C2' };
  const otro ={ id:'MOV-X', tipo:'retiro', monto:500, cuentaOrigen:'Binance 26' };
  const guardados=[]; let avisos=[]; let navegado=false;
  const G={ console:{log(){},warn(){}}, Math, parseFloat, String, Number, Array, Object, Date, JSON, confirm:()=>true,
    S:{ movimientos:[viejo,nuevo,otro], currentUser:{nombre:'Adam'}, page:'concesionarios' },
    CUENTA_ANTICIPOS:'Anticipos en concesionarios', fmt:n=>'$'+(parseFloat(n)||0).toFixed(2),
    toast:(m)=>avisos.push(String(m)), nav:()=>{navegado=true},
    DB:{ saveMovimiento(m){ guardados.push(m); } }, window:{} };
  G.window=G; vm.createContext(G);
  const cs2=src('logic/concesionarios.js');
  vm.runInContext(cs2.slice(cs2.indexOf('function _concAnticiposFormatoViejo'), cs2.indexOf('function _concAvisoAnticiposSueltos')), G);

  ok('se detecta el anticipo que quedó como salida', G._concAnticiposFormatoViejo().length===1);
  ok('...el que ya está bien no se toca', !G._concAnticiposFormatoViejo().some(m=>m.id==='MOV-ANT-2'));
  ok('...ni un movimiento que no es anticipo', !G._concAnticiposFormatoViejo().some(m=>m.id==='MOV-X'));
  const aviso=G._concAvisoAnticiposViejos();
  ok('la pantalla lo dice, con el monto', aviso.indexOf('$10000.00')>-1 && /contados como gasto/.test(aviso));
  ok('...explica que la empresa se ve más pobre de lo que es', /más pobre de lo que es/.test(aviso));
  ok('...y ofrece el botón para arreglarlo', /_concCorregirAnticiposViejos\(\)/.test(aviso));

  G._concCorregirAnticiposViejos();
  ok('al corregir, el anticipo pasa a ser transferencia', viejo.tipo==='transferencia');
  ok('...con la otra mitad: la cuenta donde el dinero espera', viejo.cuentaDestino==='Anticipos en concesionarios');
  ok('...queda el rastro de quién y cuándo', !!viejo.corregidoEn && viejo.corregidoPor==='Adam');
  ok('...se guarda en la base', guardados.length===1 && guardados[0].id==='MOV-ANT-1');
  ok('...y se avisa de lo que se ganó', avisos.some(m=>/vuelven a contar como dinero tuyo/.test(m)));
  ok('después ya no queda ninguno por corregir', G._concAnticiposFormatoViejo().length===0);
  ok('...y el aviso desaparece', G._concAvisoAnticiposViejos()==='');
})();

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
