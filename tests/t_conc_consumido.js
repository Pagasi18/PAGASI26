// 23-sep-2026, Adam viendo la pantalla de Concesionarios: "me dice que mi saldo consumido
// es 2700, pero en realidad no es mi saldo consumido, porque el saldo consumido es
// únicamente el dinero que nosotros pusimos, no el dinero que puso el cliente".
// Tenía razón. EMPIRE Bello Monte tenía dos motos de $1.350 con $750 de inicial: Pagasi
// puso $600 en cada una, $1.200 en total. La pantalla decía $2.700 porque descontaba el
// precio completo del anticipo, como si la inicial del cliente la hubiera puesto Pagasi.
// Y esa misma cuenta estaba escrita a mano en SIETE sitios, así que arreglar uno solo
// habría dejado el historial de la misma pantalla contradiciendo al recuadro de arriba.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

// ── La cuenta, corriendo ─────────────────────────────────────────────────────
const G={ console:{log(){},warn(){}}, Math, parseFloat, String, Number, Array, Object, JSON, Date, isNaN, window:{} };
G.window=G; vm.createContext(G);
const cs=src('logic/concesionarios.js');
vm.runInContext(cs.slice(cs.indexOf('function _concCostoSalida'), cs.indexOf('function _concFinanzasDe')), G);
const costo=G._concCostoSalida;

// El caso real de Adam
ok('moto de 1350 con inicial de 750: Pagasi puso 600', costo({precio:1350, precioBaseReal:1350, ini:750})===600);
ok('las dos motos de EMPIRE suman 1200, no 2700',
  costo({precio:1350, precioBaseReal:1350, ini:750}) + costo({precio:1350, precioBaseReal:1350, ini:750}) === 1200);
// Los bordes
ok('sin inicial, Pagasi puso la moto entera', costo({precio:1350, ini:0})===1350);
ok('si la ficha no trae inicial, igual', costo({precio:1350})===1350);
ok('una inicial guardada como texto también resta', costo({precio:1350, ini:'750'})===600);
ok('el costo real manda sobre el precio de venta', costo({precio:1350, precioBaseReal:1200, ini:750})===450);
ok('una inicial mayor que la moto no le devuelve plata al anticipo', costo({precio:1000, ini:1200})===0);
ok('una inicial igual a la moto consume cero', costo({precio:1000, ini:1000})===0);
ok('los centavos no se arrastran', costo({precio:1723.67, ini:813.32})===910.35);
ok('un crédito vacío no rompe nada', costo(null)===0 && costo({})===0);
ok('un precio escrito como texto se entiende', costo({precio:'1350', ini:'750'})===600);

// ── Ningún sitio vuelve a hacer la cuenta por su lado ───────────────────────
// Esto es lo que evita que el recuadro y el historial de la MISMA pantalla digan cosas
// distintas: la tabla, el historial de la sede, el de todas, el resumen del período, la
// tabla de motos, el Excel y el PDF salen todos de la misma función.
const usos=(cs.match(/_concCostoSalida\(/g)||[]).length;
ok('la cuenta vive en un solo sitio y se usa en todos (≥7 veces)', usos>=7);
ok('ya no queda ningún cálculo suelto del precio completo',
  (cs.match(/parseFloat\(cr\.precioBaseReal\|\|cr\.precio\)/g)||[]).length <= 1);
[['el saldo de la sede','var consumido = creds.reduce(function(s,cr){ return s + _concCostoSalida(cr); }, 0);'],
 ['el resumen del período','var conP = credsF.reduce(function(s,cr){ return s+_concCostoSalida(cr); },0);'],
 ['la tabla de motos que salieron','var costo = _concCostoSalida(cr);'],
 ['el historial de la sede','monto:-_concCostoSalida(cr), credId:cr.id };'],
 ['el historial de todas las sedes','monto:-_concCostoSalida(cr), credId:cr.id });'],
 ['el reporte del período','var costoP = credsP.reduce(function(s,cr){ return s + _concCostoSalida(cr); }, 0);'],
].forEach(function(x){ ok(x[0]+' usa la función única', cs.indexOf(x[1])>-1); });

// ── El papel que se le entrega a la sede dice de quién es cada parte ────────
ok('el Excel separa lo que puso el cliente de lo que puso Pagasi',
  cs.indexOf("'Puso el cliente (inicial)','Puso Pagasi (descontado)'")>-1);
ok('...y ya no llama "Costo (deducción)" a lo que no es', cs.indexOf('Costo (deducción)')===-1);
ok('el resumen del Excel dice qué es el consumido',
  cs.indexOf('Consumido del anticipo — lo que puso Pagasi (período)')>-1);
ok('el PDF también separa las dos partes', cs.indexOf('<th>Puso el cliente</th><th>Puso Pagasi</th>')>-1);
ok('...y su total dice de dónde sale', cs.indexOf('TOTAL DESCONTADO DEL ANTICIPO')>-1);

// ── La gráfica mide otra cosa, y ahora lo dice ─────────────────────────────
// El botón decía "Monto" y sumaba el precio completo: dos números distintos con el
// mismo nombre en la misma pantalla.
const ch=src('logic/concesionarios-chart.js');
ok('la gráfica sigue midiendo lo comprado a la sede', /parseFloat\(c\.precioBaseReal\|\|c\.precio\)/.test(ch));
ok('...pero el botón ya no se llama igual que el consumido', /btn\('monto','Comprado'/.test(ch));
ok('...y el código avisa de que no es lo que se descuenta', /NO es lo que se descuenta del anticipo/.test(ch));

// ── Un caso completo, como lo ve Adam ──────────────────────────────────────
(function(){
  const S={ creds:[
    {id:'M-001', concesionarioId:'C1', estado:'activo',     precio:1350, precioBaseReal:1350, ini:750},
    {id:'M-002', concesionarioId:'C1', estado:'activo',     precio:1350, precioBaseReal:1350, ini:750},
    {id:'M-003', concesionarioId:'C1', estado:'cancelado',  precio:1350, precioBaseReal:1350, ini:750},
    {id:'M-004', concesionarioId:'C1', estado:'activo',     precio:1350, precioBaseReal:1350, ini:750, eliminado:true},
    {id:'M-005', concesionarioId:'C2', estado:'activo',     precio:1350, precioBaseReal:1350, ini:750},
  ]};
  const G2={ console:{log(){},warn(){}}, Math, parseFloat, String, Number, Array, Object, isNaN, S:S, window:{},
    _concGetById:function(id){ return { id:id, anticipos:[{monto:2000}] }; } };
  G2.window=G2; vm.createContext(G2);
  vm.runInContext(cs.slice(cs.indexOf('function _concCostoSalida'), cs.indexOf('// Rango de fechas para el filtro')), G2);
  const fin=G2._concFinanzasDe('C1');
  ok('la sede con 2 motos consume 1200 del anticipo', fin.consumido===1200);
  ok('...y con 2000 enviados le quedan 800', fin.saldo===800);
  ok('un crédito cancelado no consume nada', fin.creds.every(c=>c.estado!=='cancelado'));
  ok('un crédito borrado tampoco', fin.creds.every(c=>!c.eliminado));
  ok('las motos de otra sede no se mezclan', fin.creds.length===2);
})();

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
