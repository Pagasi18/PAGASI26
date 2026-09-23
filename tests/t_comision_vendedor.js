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
  /function _wzSetVendedor[\s\S]{0,320}av\.innerHTML = _wzAvisoComision\(\);/.test(cre));
ok('...y tiene su sitio en la pantalla', /id="wz_vendedor_aviso"/.test(cre));

// ── 3) La comisión se atribuye por nombre, y el respaldo sigue sirviendo ───
const com=src('logic/comisiones.js');
ok('la comisión va al vendedor del crédito', /var vendedor = \(c\.vendedorNombre \|\| c\.creadoPor \|\| ''\)/.test(com));
ok('...y para los créditos viejos, a quien lo creó', /c\.creadoPor/.test(com));
ok('un crédito cancelado no paga comisión', /c\.estado === 'cancelado'\) return;/.test(com));
ok('sin comisión activa en la ficha no se genera nada',
  /if\(!u \|\| !u\.comisiones \|\| !u\.comisiones\.activo\) return null;/.test(com));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
