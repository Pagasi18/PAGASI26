// 23-sep-2026, Adam viendo Concesionarios: "empire bello monte 2 motos y 1 solo
// credito... imposible, cada moto esta ligada a un credito. Igual bera trinidad, 0
// motos 1 credito". Era un solo crédito, M-004: se le cambió la sede después de crearlo
// y su moto se quedó en la sede de antes. En PAGASI 18 el mismo error afectaba a 23.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const cre=src('logic/creditos.js'), cs=src('logic/concesionarios.js');

function entorno(motos, creds){
  const guardadas=[], logs=[];
  const G={ console:{log(){},warn(){}}, String, Array, Object, Math, Date,
    S:{ motos:motos, creds:creds, currentUser:{nombre:'Adam'} },
    DB:{ saveMoto(m){ guardadas.push(Object.assign({},m)); } },
    logActividad:(a,b,c,d)=>logs.push({a,c,d}), toast(){}, nav(){}, confirm:()=>true,
    window:{} };
  G.window=G; vm.createContext(G);
  vm.runInContext(cre.slice(cre.indexOf('function _wzMoverMotoConElCredito'), cre.indexOf('function _wzSetVendedor')), G);
  vm.runInContext(cs.slice(cs.indexOf('function _concMotosFueraDeSede'), cs.indexOf('function _concAvisoAnticiposSueltos')), G);
  G.guardadas=guardadas; G.logs=logs;
  return G;
}

// ── El caso real ────────────────────────────────────────────────────────────
const EMPIRE='CONC-EMPIRE', TRINIDAD='CONC-TRINIDAD';
let G=entorno(
  [{id:4, modelo:'BR150 MILAN', concesionarioId:EMPIRE}, {id:12, modelo:'XPRESS', concesionarioId:EMPIRE}],
  [{id:'M-004', motoId:4, concesionarioId:TRINIDAD, estado:'activo'}, {id:'M-012', motoId:12, concesionarioId:EMPIRE, estado:'activo'}]);
ok('se detecta la moto que quedó en otra sede que su crédito', G._concMotosFueraDeSede().map(c=>c.id).join()==='M-004');
ok('...y no la que está bien', !G._concMotosFueraDeSede().some(c=>c.id==='M-012'));
const aviso=G._concAvisoMotosFueraDeSede();
ok('la pantalla lo dice, con el crédito', /1 moto en otra sede que su crédito \(M-004\)/.test(aviso));
ok('...explica por qué pasa', /se le cambió la sede después de crearlo/.test(aviso));
ok('...y ofrece alinearlas', /_concAlinearMotos\(\)/.test(aviso));

G._concAlinearMotos();
ok('al alinear, la moto pasa a la sede de su crédito', G.S.motos[0].concesionarioId===TRINIDAD);
ok('...la otra no se toca', G.S.motos[1].concesionarioId===EMPIRE && G.guardadas.length===1);
ok('...queda en la bitácora de dónde a dónde', G.logs.length===1 && G.logs[0].d.antes===EMPIRE && G.logs[0].d.ahora===TRINIDAD);
ok('después ya no queda ninguna fuera de sede', G._concMotosFueraDeSede().length===0 && G._concAvisoMotosFueraDeSede()==='');

// ── Lo que NO se toca ───────────────────────────────────────────────────────
G=entorno(
  [{id:1, concesionarioId:EMPIRE}, {id:2, concesionarioId:EMPIRE}, {id:3, concesionarioId:EMPIRE, eliminado:true}, {id:5, concesionarioId:EMPIRE}],
  [{id:'A', motoId:1, concesionarioId:TRINIDAD, estado:'cancelado'},
   {id:'B', motoId:2, concesionarioId:TRINIDAD, estado:'activo', eliminado:true},
   {id:'C', motoId:3, concesionarioId:TRINIDAD, estado:'activo'},
   {id:'D', motoId:5, concesionarioId:'', estado:'activo'},
   {id:'E', motoId:null, concesionarioId:TRINIDAD, estado:'activo'}]);
ok('un crédito cancelado no mueve su moto', !G._concMotosFueraDeSede().some(c=>c.id==='A'));
ok('un crédito borrado tampoco', !G._concMotosFueraDeSede().some(c=>c.id==='B'));
ok('una moto borrada no se resucita', !G._concMotosFueraDeSede().some(c=>c.id==='C'));
ok('un crédito sin sede no le quita la sede a su moto', !G._concMotosFueraDeSede().some(c=>c.id==='D'));
ok('un crédito sin moto no inventa nada', !G._concMotosFueraDeSede().some(c=>c.id==='E'));
ok('si no hay nada fuera de sede, no se avisa', G._concAvisoMotosFueraDeSede()==='');

// ── Y de aquí en adelante no vuelve a pasar ─────────────────────────────────
ok('al editar un crédito, su moto se muda con él',
  /DB\.updateCred\(_editId, _upd\);\s*\n[\s\S]{0,500}_wzMoverMotoConElCredito\(S\.creds\[_ei\]\);/.test(cre));
G=entorno([{id:9, concesionarioId:EMPIRE}], [{id:'M-9', motoId:9, concesionarioId:EMPIRE}]);
ok('si la moto ya está donde debe, no se escribe nada', G._wzMoverMotoConElCredito(G.S.creds[0])===false && G.guardadas.length===0);

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
