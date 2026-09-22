// Campo Monto de "Registrar Pago": viene lleno con la cuota; al entrar se
// selecciona todo para que lo escrito REEMPLACE el valor en vez de pegarse al
// final ("50,00" + "50" = "50,0050"). Paso de verdad: prueba del 11-sep-2026.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
global.window=global; global.PG={};
const _els={};
const _mkEl=()=>({innerHTML:'',textContent:'',value:'',className:'',style:{},click(){},appendChild(){},removeChild(){},insertBefore(){}});
global.$=id=>{ if(!_els[id]) _els[id]=_mkEl(); return _els[id]; };
global.document={getElementById:id=>global.$(id),querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>_mkEl(),body:{appendChild(){},removeChild(){},style:{}},addEventListener(){}};
global.DB={saveCred:()=>{},savePago:()=>{},saveMovimiento:()=>{},updateCred:()=>{}};
global.S={currentUser:{rol:'Administrador',nombre:'Prueba'},page:'pagos',creds:[],clientes:[],pagos:[],movimientos:[],facturas:[]};
global.PLAN={plazo:12,diasGracia:5};
global.hoyLocalISO=()=>'2026-09-11';
global.getCobradoresList=()=>['Samanta'];
global._cuentasBanc=[{nombre:'Binance Pagos'}];
global.setMicon=()=>{}; global.toast=()=>{};
const timers=[];
global.setTimeout=fn=>{ timers.push(fn); return timers.length; };
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const auto=new Proxy({},{has:()=>true,get:(t,k)=>{if(k===Symbol.unscopables)return undefined;if(k in t)return t[k];if(k in global)return global[k];return function(){return 0;};},set:(t,k,v)=>{t[k]=v;return true;}});
const L=fs.readFileSync(path.join(ROOT,'logic/pagos.js'),'utf8');
const API=eval('with(auto){'+L+'\n; ({openAddPago,_seleccionarAlEntrar,_mantenerSeleccion}) }');

S.creds=[{id:'CRED-1',cli:'CLIENTE X',modelo:'GN 125',estado:'activo',cuota:100,cuotaQ:50}];
API.openAddPago('CRED-1');
const inp=($('mbd').innerHTML.match(/<input[^>]*id="p_monto"[^>]*>/)||[])[0]||'';
ok('el formulario tiene el campo monto', !!inp);
ok('al entrar al monto se selecciona todo', /onfocus="_seleccionarAlEntrar\(this\)"/.test(inp));
ok('el clic no deshace la selección', /onmouseup="_mantenerSeleccion\(event,this\)"/.test(inp));
ok('el campo sigue siendo numérico con el mismo placeholder', /type="number"/.test(inp) && /placeholder="0\.00"/.test(inp));
ok('las funciones quedan disponibles para el HTML', typeof window._seleccionarAlEntrar==='function' && typeof window._mantenerSeleccion==='function');

timers.length=0;
let sel=0; const el={select(){ sel++; }};
API._seleccionarAlEntrar(el);
ok('selecciona después de que el navegador pone el foco', sel===0 && timers.length===1);
timers.splice(0).forEach(f=>f());
ok('selecciona todo el valor', sel===1);
let prev=0; const ev={preventDefault(){ prev++; }};
API._mantenerSeleccion(ev, el); API._mantenerSeleccion(ev, el);
ok('anula SOLO el primer mouseup (los clics siguientes ponen el cursor normal)', prev===1);
let revento=false;
try { API._seleccionarAlEntrar(null); API._mantenerSeleccion(null, null); } catch(e){ revento=true; }
ok('sin elemento no revienta', !revento);
API._seleccionarAlEntrar({ select(){ throw new Error('no se puede'); } });
try { timers.splice(0).forEach(f=>f()); } catch(e){ revento=true; }
ok('si el navegador no deja seleccionar, no revienta', !revento);

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
