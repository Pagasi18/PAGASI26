// N° de factura correlativo de 10 dígitos en los archivos 03 y 04 de QuickBooks (el contador, 16-nov-2026):
// "este número [PAG-1790710635282] no podrá servir como correlativo… esta factura sería la Factura Nº 0000000001".
// Con Adam: solo PAGASI 26, una sola numeración para el 03 y el 04, por fecha del cobro y registro; el número queda
// fijo (un cobro eliminado deja su hueco, uno atrasado toma el siguiente) y el Recibo de Caja NO lleva este número.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

function entorno(marca){
  const G={ console:{log(){},warn(){},error(){}}, Math, JSON, Date, String, Number, Object, Array, parseFloat, parseInt, isNaN, isFinite, Promise,
    TextEncoder, Uint8Array, Uint32Array, S:{}, PLAN:{factor:2, plazo:12}, fmt:n=>'$'+(parseFloat(n)||0).toFixed(2), toast(){}, nav(){} };
  if(marca) G._marcaEmpresa=()=>({ marca });
  G.window=G; G.globalThis=G; vm.createContext(G);
  vm.runInContext(src('logic/categorias-egreso.js'), G);
  vm.runInContext(src('logic/exportar.js'), G);
  vm.runInContext(src('logic/libros-iva.js'), G);
  const pro=src('logic/contratos-protect.js');
  vm.runInContext(pro.slice(0, pro.indexOf('function _protectDatos')), G);
  vm.runInContext(src('logic/metodologia.js'), G);
  vm.runInContext(src('logic/credito-ledger.js'), G);
  const rep=src('logic/reportes.js');
  vm.runInContext(rep.slice(rep.indexOf('var _DF_SERVICIOS_HASTA'), rep.indexOf('// motos y total son los que ya usa el dashboard')), G);
  vm.runInContext(src('logic/quickbooks.js'), G);
  return G;
}
const cred={ id:'M-011', cli:'JEAN MANUEL DURAN GODOY', estado:'activo', fecha:'2026-09-14', precio:1500, ini:450, fin:1050, plazo:12, totalCuotas:24, cuota:75, monto:1800, modelo:'X', pagadas:0 };
const P=(id,fecha,monto,extra)=>Object.assign({ id, cred:'M-011', cli:cred.cli, fecha, monto, estado:'confirmado', metodo:'100% Banco', creadoEn:fecha+'T15:00:00.000Z' }, extra||{});
const pagos=[
  P('PAG-1791208925563','2026-10-05',75),
  P('PAG-1790710635282','2026-09-29',75),                         // el del ejemplo del contador: el primero
  P('PAG-1790975177960','2026-10-02',40),                         // abono (va al 03)
  P('PAG-1790956612583','2026-10-02',75),                         // mismo día, registrado antes
  P('PAG-INI','2026-09-14',450,{ esInicial:true }),               // la inicial no se factura
  P('PAG-ELIM','2026-10-03',75,{ eliminado:true }),               // eliminado antes de numerar: no lleva número
  P('PAG-PEND','2026-10-04',75,{ estado:'pendiente' }),           // sin confirmar
  P('PAG-HUERF','2026-10-04',75,{ cred:'M-999' })                 // sin su crédito: no sale en ningún archivo
];
const ctx=(G,extra)=>Object.assign({ creds:[cred], pagos, clientes:[{ nombre:cred.cli, cedula:'V-1' }], facturas:[], egresos:[], motos:[], concesionarios:[], periodo:'2026-10', corte:'2026-09-30' }, extra||{});

// ── Sin activar (PAGASI 18, o cualquiera que no sea la 26): todo como antes ──
const G18=entorno('18');
ok('PAGASI 18 no usa el correlativo', G18.qbCorrelativoActivo()===false && entorno().qbCorrelativoActivo()===false);
const D18=G18.qbDatos(ctx(G18));
ok('…y sus archivos siguen con el número del cobro', D18.facturas.docs.concat(D18.facturas.contado).every(d=>/^PAG-/.test(d.numero)));

// ── PAGASI 26 ──
const G=entorno('26');
ok('PAGASI 26 sí', G.qbCorrelativoActivo()===true);
ok('10 dígitos con ceros a la izquierda', G._qbNroTxt(1)==='0000000001' && G._qbNroTxt(510)==='0000000510' && G._qbNroTxt(0)==='' && G._qbNroTxt(undefined)==='');
let plan=G.qbNumerarPlan({ creds:[cred], pagos, nros:{} });
ok('se numeran solo los cobros que salen en el 03 o el 04: ni la inicial, ni el eliminado, ni el pendiente, ni el huérfano', plan.length===4 && plan.every(x=>!/INI|ELIM|PEND|HUERF/.test(x.id)));
ok('el del ejemplo del contador (29-sep) es la 0000000001', plan[0].id==='PAG-1790710635282' && plan[0].nro===1);
ok('por fecha y, el mismo día, por orden de registro; una sola serie para abonos (03) y contado (04)', plan.map(x=>x.id).join()==='PAG-1790710635282,PAG-1790956612583,PAG-1790975177960,PAG-1791208925563' && plan.map(x=>x.nro).join()==='1,2,3,4');
const nros={}; plan.forEach(x=>{ nros[x.id]=x.nro; });
const D=G.qbDatos(ctx(G,{ nros }));
const todos=D.facturas.docs.concat(D.facturas.contado);
ok('los archivos salen con el correlativo de 10 dígitos en la primera columna', D.filas.facturas.concat(D.filas.contado).every(r=>/^\d{10}$/.test(r[0])) && todos.every(d=>!d.sinNumero));
ok('el 03 y el 04 comparten la serie: no se repite ningún número entre los dos', new Set(todos.map(d=>d.numero)).size===todos.length && D.facturas.docs.length>=1 && D.facturas.contado.length>=1);
ok('el documento conserva el id del cobro por dentro', todos.every(d=>/^PAG-/.test(String(d.pagoId))));
const Dsin=G.qbDatos(ctx(G,{ nros:{} }));
ok('un cobro sin número se marca (y sale con el del cobro mientras tanto)', Dsin.facturas.docs.concat(Dsin.facturas.contado).every(d=>d.sinNumero && /^PAG-/.test(d.numero)));

// Lo que viene después: el atrasado toma el siguiente libre; el eliminado deja su hueco
const despues=pagos.map(p=>p.id==='PAG-1790956612583' ? Object.assign({}, p, { eliminado:true }) : p).concat([P('PAG-1795000000000','2026-09-30',75), P('PAG-1795000000001','2026-11-16',75)]);
plan=G.qbNumerarPlan({ creds:[cred], pagos:despues, nros });
ok('un cobro anotado después con fecha atrasada toma el siguiente número libre (5), no se mete en medio', plan.length===2 && plan[0].id==='PAG-1795000000000' && plan[0].nro===5 && plan[1].nro===6);
ok('el número de un cobro eliminado no se reutiliza: queda como hueco', !plan.some(x=>x.nro===2));
ok('lo ya numerado no vuelve a salir en la lista', G.qbSinNumerar({ creds:[cred], pagos, nros }).length===0);

// ── El guardado (assets/pagasi-app.js): una transacción sobre contadores/, sin tocar los pagos ──
const app=src('assets/pagasi-app.js');
const trozo=app.slice(app.indexOf('var _NROS_FACTURA_DESDE'), app.indexOf('// Multimoneda (config/multimoneda'));
function base(){
  const docs={}, escritos=[];
  const ref=(c,id)=>({ c, id, key:c+'/'+id, get(){ return Promise.resolve(snap(c+'/'+id)); } });
  const snap=k=>({ exists:!!docs[k], data:()=>JSON.parse(JSON.stringify(docs[k]||{})) });
  const db={ collection:c=>({ doc:id=>ref(c,id) }), runTransaction(fn){
    const pend=[]; const tx={ get:r=>Promise.resolve(snap(r.key)), set(r,d,o){ pend.push([r,d,o]); } };
    return fn(tx).then(res=>{ pend.forEach(([r,d,o])=>{ const a=docs[r.key]||{}; docs[r.key]=Object.assign({}, a, d, d.nros ? { nros:Object.assign({}, a.nros||{}, d.nros) } : {}); escritos.push(r.key); }); return res; });
  } };
  const H={ db, DB:{}, S:{ currentUser:{ nombre:'Adam' } }, Date, Math, Object, String, Promise, Error, JSON };
  vm.createContext(H); vm.runInContext(trozo, H);
  return { H, docs, escritos };
}
(async()=>{
  const B=base();
  let r=await B.H.DB.numerarFacturas(['PAG-A','PAG-B','PAG-C']);
  ok('la primera vez numera 1, 2, 3 en el orden que recibe', r['PAG-A']===1 && r['PAG-B']===2 && r['PAG-C']===3 && B.docs['contadores/facturas'].ultimo===3);
  ok('solo escribe en contadores/: ningún pago se toca', B.escritos.every(k=>/^contadores\/facturas(-\d{4})?$/.test(k)) && !/collection\('pagos'\)/.test(trozo));
  r=await B.H.DB.numerarFacturas(['PAG-B','PAG-D','PAG-D']);
  ok('lo ya numerado conserva su número y lo nuevo sigue la serie', r['PAG-B']===2 && r['PAG-D']===4 && r['PAG-A']===1 && B.docs['contadores/facturas'].ultimo===4);
  const antes=B.escritos.length; r=await B.H.DB.numerarFacturas(['PAG-A']);
  ok('si no hay nada nuevo no escribe nada', B.escritos.length===antes && r['PAG-A']===1);
  ok('el contador nunca baja (las Reglas lo exigen): cada escritura sube "ultimo"', B.docs['contadores/facturas-'+Math.max(new Date().getFullYear(),2026)].ultimo===4);
  const leidos=await B.H.DB.getNrosFactura();
  ok('se leen de vuelta todos', Object.keys(leidos).length===4 && leidos['PAG-D']===4);
  const reglas=src('firestore.rules'), m=reglas.slice(reglas.indexOf('match /contadores/{id}'), reglas.indexOf('match /contadores/{id}')+400);
  ok('las Reglas de contadores no dejan borrar ni bajar el número', /allow delete: if false/.test(m) && /request\.resource\.data\.ultimo > resource\.data\.ultimo/.test(m));

  // ── La pantalla ──
  const qb=src('logic/quickbooks.js');
  ok('el 03 y el 04 no se bajan para QuickBooks con cobros sin número (el PDF para leer sí)', /if\(formato !== 'pdf' && \(tipo === 'facturas' \|\| tipo === 'contado'\) && qbCorrelativoActivo\(\)\)/.test(qb));
  ok('numerar es de administrador y muestra la lista antes de guardar', /function qbNumerarAbrir\(\)\{\s*if\(!\(typeof isAdminUser === 'function' && isAdminUser\(\)\)\)/.test(qb) && /function qbNumerarGuardar\(\)\{\s*if\(!\(typeof isAdminUser === 'function' && isAdminUser\(\)\)/.test(qb));
  ok('el Recibo de Caja no cambia: sigue con su propia numeración', /function _facSiguienteNumeroFactura\(\)/.test(src('logic/facturacion.js')) && !/nros|NroTxt/.test(src('logic/facturacion.js')));
  console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
  if(fail) process.exitCode=1;
})();
