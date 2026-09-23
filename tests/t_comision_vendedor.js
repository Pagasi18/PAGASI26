// 23-sep-2026, Adam: "en el tema de las comisiones no se están guardando... por ejemplo
// María Fernanda hizo un crédito, el M-001. Entonces, cuando vaya a agarrar quién ganó
// la comisión, tiene que agarrar predeterminado al usuario que está creando el crédito".
// Eran dos cosas distintas y las dos terminaban en lo mismo: un vendedor que hace una
// venta y no ve su comisión.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const cre=src('logic/creditos.js');

// ── 1) El crédito se guarda con el vendedor, lo haya tocado o no ───────────
// El desplegable YA mostraba el nombre del que está creando el crédito, así que nadie
// lo tocaba — y como el UID solo se rellenaba al CAMBIARLO, el crédito se guardaba sin
// vendedor identificado. El nombre sí caía; el UID no.
ok('el UID del vendedor cae en quien está creando el crédito',
  /vendedorUid: WZ\.vendedorUid \|\| \(S\.currentUser&&S\.currentUser\.uid\) \|\| '',/.test(cre));
ok('...igual que el nombre, que ya lo hacía',
  /vendedorNombre: WZ\.vendedorNombre \|\| \(S\.currentUser&&S\.currentUser\.nombre\) \|\| '',/.test(cre));
ok('y se apunta desde que se abre el asistente, no al pintar el paso 3',
  /WZ = \{ step:1[\s\S]{0,400}if\(S\.currentUser && S\.currentUser\.uid\)\{\s*\n\s*WZ\.vendedorUid = S\.currentUser\.uid;/.test(cre));

// Corriendo: el asistente recién abierto ya sabe de quién es la venta
(function(){
  const G={ console:{log(){},warn(){}}, Math, String, Number, Array, Object, Date, JSON, setTimeout:()=>0,
    S:{ currentUser:{uid:'U-MARIA', nombre:'María Fernanda González', email:'mf@pagasi.io'}, creds:[], clientes:[], motos:[] },
    document:{ getElementById:()=>null, createElement:()=>({style:{cssText:''}, id:''}), body:{appendChild(){}} },
    WZ:{}, window:{} };
  G.window=G; vm.createContext(G);
  const ini=cre.indexOf('function openAddCred');
  vm.runInContext(cre.slice(ini, cre.indexOf('\n}', cre.indexOf('WZ[\'wz_vendedor\'] = WZ.vendedorUid;', ini))+2), G);
  try{ G.openAddCred(); }catch(e){}
  ok('abrir el asistente ya deja apuntado al vendedor', G.WZ.vendedorUid==='U-MARIA');
  ok('...con su nombre', G.WZ.vendedorNombre==='María Fernanda González');
})();

// ── 2) Y si esa persona no cobra comisión, se dice ahí mismo ───────────────
// Un crédito puede quedar perfectamente atribuido y no generar un dólar: basta con que
// el vendedor no tenga la comisión activada. Antes eso se descubría al final de la
// quincena, cuando el vendedor preguntaba por su plata.
function aviso(usuario, cache){
  const G={ console:{log(){},warn(){}}, String, Array, Object,
    S:{ currentUser: usuario }, WZ:{ vendedorUid: usuario && usuario.uid },
    _usersCache: cache || [], document:{ getElementById:()=>null }, window:{} };
  G.window=G; vm.createContext(G);
  vm.runInContext(cre.slice(cre.indexOf('function _wzAvisoComision'), cre.indexOf('// Carga bajo demanda la lista completa de vendedores')), G);
  return G._wzAvisoComision();
}
const sinCom={uid:'U-1', nombre:'María Fernanda González'};
const conCom={uid:'U-2', nombre:'Miguel', comisiones:{activo:true, venta:{tipo:'fijo', valor:20}}};
const apagada={uid:'U-3', nombre:'Luis', comisiones:{activo:false, venta:{tipo:'fijo', valor:20}}};
ok('sin comisión configurada, se avisa con su nombre',
  /María Fernanda González no tiene comisión configurada/.test(aviso(sinCom)));
ok('...y dice que el crédito igual queda a su nombre', /queda a su nombre, pero no va a generar comisión/.test(aviso(sinCom)));
ok('...y dónde se arregla', /Usuarios → Comisiones/.test(aviso(sinCom)));
ok('con la comisión activa no molesta con nada', aviso(conCom)==='');
ok('con la comisión apagada sí avisa', /Luis no tiene comisión configurada/.test(aviso(apagada)));
ok('el aviso se refresca al cambiar de vendedor',
  /function _wzSetVendedor[\s\S]{0,900}av\.innerHTML = _wzAvisoComision\(\);/.test(cre));
ok('...y tiene su sitio en la pantalla', /id="wz_vendedor_aviso"/.test(cre));

// ── 3) La comisión se reparte por identificador, no por nombre ────────────
// Los dos primeros créditos de PAGASI 26 quedaron con el vendedor llamado literalmente
// "Usuario" —un relleno del desplegable que se coló al guardar— y ninguna de las dos
// ventas le contó a nadie, aunque las dos vendedoras tenían su comisión activada y el
// identificador bien guardado. Comparar nombres escritos a mano es frágil: un acento o
// un cambio de ficha y la plata de alguien desaparece.
const com=src('logic/comisiones.js');
function generado(usuario, creds){
  const G={ console:{log(){},warn(){}}, Math, parseFloat, String, Number, Array, Object, Date, isNaN,
    S:{ creds:creds, pagos:[] }, COMISIONES_DEFAULT:{venta:{valor:5},cobranza:{valor:1}}, window:{} };
  G.window=G; vm.createContext(G);
  vm.runInContext(com.slice(com.indexOf('function _comGetConfig'), com.indexOf('// ── Cortes quincenales')), G);
  return G._comCalcGenerado(usuario);
}
const MARIA={ uid:'U-MARIA', nombre:'María Fernanda González', comisiones:{activo:true, venta:{tipo:'fijo',valor:5}, cobranza:{tipo:'fijo',valor:0}} };
const OTRA ={ uid:'U-OTRA', nombre:'Samantha', comisiones:{activo:true, venta:{tipo:'fijo',valor:5}, cobranza:{tipo:'fijo',valor:0}} };

// El caso real: el crédito dice "Usuario" pero trae el identificador de María
const real=[{ id:'M-001', cli:'ELADIO', estado:'activo', precio:1420,
              vendedorUid:'U-MARIA', vendedorNombre:'Usuario', creadoPor:'María Fernanda González' }];
ok('el crédito con el vendedor llamado "Usuario" SÍ le cuenta a quien lo hizo',
  generado(MARIA, real).ventas.length===1);
ok('...y le genera su comisión', generado(MARIA, real).porVenta===5);
ok('...y no se la lleva otra persona', generado(OTRA, real).ventas.length===0);

// Un crédito viejo, sin identificador: sigue valiendo el nombre
const viejo=[{ id:'CRED-900', estado:'activo', precio:1000, creadoPor:'María Fernanda González' }];
ok('un crédito viejo sin identificador sigue contando por el nombre', generado(MARIA, viejo).ventas.length===1);
ok('...y no se lo lleva otro', generado(OTRA, viejo).ventas.length===0);

// El identificador manda sobre el nombre
const cambiado=[{ id:'M-009', estado:'activo', precio:1000, vendedorUid:'U-OTRA', vendedorNombre:'María Fernanda González' }];
ok('si el identificador dice otra persona, esa es la que cobra',
  generado(OTRA, cambiado).ventas.length===1 && generado(MARIA, cambiado).ventas.length===0);

const cancelado=[{ id:'M-010', estado:'cancelado', precio:1000, vendedorUid:'U-MARIA' }];
ok('un crédito cancelado no paga comisión', generado(MARIA, cancelado).ventas.length===0);
ok('sin comisión activa en la ficha no se genera nada',
  generado({uid:'U-MARIA', nombre:'María'}, real).porVenta===0);
ok('el código ya no reparte comparando nombres cuando hay identificador',
  /if\(c\.vendedorUid && u\.uid\)\{[\s\S]{0,120}String\(c\.vendedorUid\) !== String\(u\.uid\)\) return;/.test(com));
ok('y "Usuario" ya no se guarda como nombre del vendedor', /if\(nm === 'Usuario'\) nm = '';/.test(cre));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
