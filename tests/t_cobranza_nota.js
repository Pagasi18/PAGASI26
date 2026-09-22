// Nota de cobranza al registrar un pago: si el pago deja al cliente al dia,
// "En gestion de cobro" (y las demas notas de persecucion de deuda) se limpian
// solas. Si sigue atrasado, se quedan. "Cliente con problema" y "En revision"
// nunca se tocan. Fechas RELATIVAS: la regla usa new Date() real.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global; global.PG={};
const _els={};
const _mkEl=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},click(){},appendChild(){},removeChild(){}});
global.$=id=>{ if(!_els[id]) _els[id]=_mkEl(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>_mkEl(),body:{appendChild(){},removeChild(){},style:{}},addEventListener(){}};
const escrituras=[];
global.DB={saveCred:()=>{},savePago:()=>{},saveMovimiento:()=>{},updateCred:(id,u)=>{ escrituras.push({id,u}); }};
global.S={currentUser:{rol:'Gerente',nombre:'Samanta'},page:'pagos',creds:[],clientes:[],pagos:[],movimientos:[],facturas:[]};
global.fmt=n=>'$'+Number(n||0).toFixed(2);
global.fechaLocalISO=d=>{const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());};
global.parseFechaLocal=s=>new Date(String(s).slice(0,10)+'T12:00:00');
global.hoyLocalISO=()=>fechaLocalISO(new Date());
global.dLoc=n=>fechaLocalISO(new Date(Date.now()+n*86400000));
global.toast=()=>{}; global.logActividad=()=>{}; global.nav=()=>{}; global.closeM=()=>{};
global.confirm=()=>true;
global._concFiltrar=a=>a; global._concGetById=()=>null;
global.PLAN={plazo:12,diasGracia:5};
global.syncEstadoClientePorCredito=()=>{}; global.syncTodosEstadosClientes=()=>{};
let pass=0, fail=0;
global.ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const L=fs.readFileSync(path.join(ROOT,'logic/pagos.js'),'utf8');
const API=eval('with(auto){'+L+'\n; ({recalcularCreditoDesdePagos,_creditoAlDia,_notaCobranzaSeLimpia,NOTAS_COBRANZA_DE_DEUDA}) }');

function reset(){ S.creds=[]; S.pagos=[]; escrituras.length=0; }
function cred(id, diasAtras, nota, extra){
  return Object.assign({id, cli:'CLI '+id, clienteId:id, cuotaQ:50, totalCuotas:24, plazo:12,
    fecha:dLoc(-diasAtras), estado:'activo', mora:0, pagado:0, cobranzaStatus:nota}, extra||{});
}
function pagar(credId, monto, extra){
  S.pagos.push(Object.assign({id:'P'+S.pagos.length+'-'+credId, cred:credId, monto, fecha:hoyLocalISO(), estado:'confirmado'}, extra||{}));
}
function ultima(id){ const e=escrituras.filter(x=>x.id===id); return e.length ? e[e.length-1].u : null; }

ok('las funciones nuevas cargaron', typeof API.recalcularCreditoDesdePagos==='function' && typeof API._creditoAlDia==='function');

// ── El caso de Adam: cobra y el cliente queda al dia ──
// credito de hace 20 dias, paga 1 cuota: la siguiente vence dentro de 10 dias
reset(); S.creds.push(cred('A',20,'gestion')); pagar('A',50);
API.recalcularCreditoDesdePagos('A');
ok('cobra y queda al dia: sale de "En gestion de cobro"', S.creds[0].cobranzaStatus==='');
ok('se guarda en la base', ultima('A') && ultima('A').cobranzaStatus==='');
ok('en el MISMO guardado, sin escritura extra', escrituras.filter(x=>x.id==='A').length===1);
ok('el resto del guardado sigue igual (pagado = 1)', ultima('A').pagado===1);

// ── Abono que no alcanza: sigue en cobranza ──
// hace 50 dias, paga 1 cuota: la siguiente vencio hace 20 dias
reset(); S.creds.push(cred('B',50,'gestion')); pagar('B',50);
API.recalcularCreditoDesdePagos('B');
ok('abono que lo deja atrasado: la nota se queda', S.creds[0].cobranzaStatus==='gestion');
ok('y no se toca cobranzaStatus en la base', !('cobranzaStatus' in (ultima('B')||{})));

// ── Paga todo lo atrasado y queda al dia ──
reset(); S.creds.push(cred('C',50,'gestion')); pagar('C',150);
API.recalcularCreditoDesdePagos('C');
ok('pone al dia las 3 cuotas atrasadas: se limpia', S.creds[0].cobranzaStatus==='');

// ── Notas que NO son de la deuda: nunca se tocan ──
reset(); S.creds.push(cred('D',20,'problema')); pagar('D',50);
API.recalcularCreditoDesdePagos('D');
ok('"Cliente con problema" se queda aunque este al dia', S.creds[0].cobranzaStatus==='problema');
reset(); S.creds.push(cred('E',20,'revision')); pagar('E',50);
API.recalcularCreditoDesdePagos('E');
ok('"En revision" se queda aunque este al dia', S.creds[0].cobranzaStatus==='revision');

// ── Todas las notas de deuda ──
ok('son 8 notas de deuda', API.NOTAS_COBRANZA_DE_DEUDA.length===8);
API.NOTAS_COBRANZA_DE_DEUDA.forEach(n=>{
  reset(); S.creds.push(cred('G',20,n)); pagar('G',50);
  API.recalcularCreditoDesdePagos('G');
  ok('al quedar al dia se limpia "'+n+'"', S.creds[0].cobranzaStatus==='');
});

// ── Credito completado ──
reset(); S.creds.push(cred('F',400,'promesa',{totalCuotas:2})); pagar('F',100);
API.recalcularCreditoDesdePagos('F');
ok('paga la ultima cuota: completado', S.creds[0].estado==='completado');
ok('y la nota se limpia', S.creds[0].cobranzaStatus==='');

// ── Pagos que no cuentan ──
reset(); S.creds.push(cred('H',20,'gestion')); pagar('H',50,{estado:'pendiente'});
API.recalcularCreditoDesdePagos('H');
ok('un pago sin confirmar no limpia la nota', S.creds[0].cobranzaStatus==='gestion');
reset(); S.creds.push(cred('I',20,'gestion')); pagar('I',50,{eliminado:true});
API.recalcularCreditoDesdePagos('I');
ok('un pago eliminado no limpia la nota', S.creds[0].cobranzaStatus==='gestion');

// ── Sin nota: nada que hacer ──
reset(); S.creds.push(cred('J',20,'')); pagar('J',50);
API.recalcularCreditoDesdePagos('J');
ok('sin nota: no se manda cobranzaStatus', !('cobranzaStatus' in (ultima('J')||{})));

// ── La regla "al dia", en el borde ──
ok('la cuota siguiente vence HOY: esta al dia', API._creditoAlDia(cred('K',30,''),1,24,'activo')===true);
ok('vencio AYER: no esta al dia', API._creditoAlDia(cred('L',31,''),1,24,'activo')===false);
ok('completado: siempre al dia', API._creditoAlDia(cred('M',400,''),3,24,'completado')===true);
ok('todas las cuotas pagadas: al dia', API._creditoAlDia(cred('N',400,''),24,24,'activo')===true);
ok('sin fecha: no se asume al dia', API._creditoAlDia({cobranzaStatus:'gestion'},0,24,'activo')===false);
ok('nota desconocida: no se toca', API._notaCobranzaSeLimpia(cred('O',20,'otra_cosa'),1,24,'activo')===false);

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
