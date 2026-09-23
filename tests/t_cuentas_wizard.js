// 23-sep-2026, Adam el día que PAGASI 26 empezó a vender: "en la solicitud, en el paso 3,
// cuando te dice dónde pagar solo sale efectivo... y no tenemos cuenta de efectivo,
// tenemos 100% y binance".
// Eran dos cosas. La lista de cuentas de su pantalla estaba vacía (la creamos después de
// que él abriera el sistema) y, al estar vacía, el sistema ofrecía "Efectivo USD" como si
// esa cuenta existiera: el dinero se anotaba en una cuenta que no está en Configuración,
// no aparece en ningún saldo y nadie lo encuentra después.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

// ── Los desplegables, corriendo de verdad ───────────────────────────────────
function opts(cuentas){
  const G={ console:{log(){},warn(){}}, String, Array, Object, Math, Date, JSON, setTimeout:()=>0,
    _cuentasBanc:cuentas, document:{getElementById:()=>null, querySelectorAll:()=>[]}, window:{} };
  G.window=G; vm.createContext(G);
  const mp=src('logic/moto-pagos.js');
  vm.runInContext(mp.slice(0, mp.indexOf('function _mpagoAgregarFila')), G);
  const cr=src('logic/creditos.js');
  vm.runInContext(cr.slice(cr.indexOf('function _wzIniMetodoOpts()'), cr.indexOf('function _wzFaltaCuentaInicial')), G);
  G.WZ = {};
  return { moto:G._mpagoMetodosOpts(), inicial:G._wzIniMetodoOpts(), bloque:G._mpagoBloqueHtml('wzmpago') };
}

const conCuentas = opts([{nombre:'Binance 26',tipo:'Billetera digital',moneda:'USD'},
                         {nombre:'100% Banco 26',tipo:'Cuenta corriente',moneda:'Bs'}]);
ok('con cuentas cargadas salen las dos, en la compra de la moto',
  conCuentas.moto.indexOf('>Binance 26<')>-1 && conCuentas.moto.indexOf('>100% Banco 26<')>-1);
ok('...y en el cobro de la inicial',
  conCuentas.inicial.indexOf('>Binance 26<')>-1 && conCuentas.inicial.indexOf('>100% Banco 26<')>-1);
ok('...y ninguna viene elegida de antemano (el dinero no se anota solo)',
  /<option value="" selected>— Elegir cuenta —<\/option>/.test(conCuentas.moto)
  && /<option value=""[^>]* selected>— Elegir cuenta —<\/option>/.test(conCuentas.inicial));
ok('...sin cuentas inventadas', conCuentas.moto.indexOf('Efectivo USD')===-1 && conCuentas.inicial.indexOf('Efectivo USD')===-1);
ok('...y sin el aviso rojo', conCuentas.bloque.indexOf('No hay cuentas cargadas')===-1);

const sinCuentas = opts([]);
ok('sin cuentas NO se inventa "Efectivo USD" en la compra de la moto',
  sinCuentas.moto.indexOf('Efectivo USD')===-1);
ok('...ni en el cobro de la inicial', sinCuentas.inicial.indexOf('Efectivo USD')===-1);
ok('...se dice que no hay cuentas',
  sinCuentas.moto.indexOf('No hay cuentas cargadas')>-1 && sinCuentas.inicial.indexOf('No hay cuentas cargadas')>-1);
ok('...la opción no vale nada, así que no se puede guardar por descuido',
  /<option value=""[^>]*>— No hay cuentas cargadas —<\/option>/.test(sinCuentas.moto));
ok('...y la pantalla dice dónde cargarlas',
  sinCuentas.bloque.indexOf('Configuración → Cuentas bancarias')>-1);

// ── Ya no queda ninguna cuenta inventada en el sistema ──────────────────────
['logic/moto-pagos.js','logic/creditos.js','logic/aprobaciones.js','logic/pagos.js'].forEach(function(f){
  ok(f.split('/')[1]+' ya no escribe "Efectivo USD" a mano', src(f).indexOf("'Efectivo USD'")===-1);
});

// ── El paso 3 dice qué dinero es cada fila ──────────────────────────────────
// Adam, 23-sep-2026: el paso 3 le pedía repartir los $1350 de la moto sin decir que
// $750 son la inicial que pone el cliente y $600 lo que pone Pagasi. Las dos salen
// hacia el concesionario, pero no son la misma plata: de eso depende que el dashboard
// no cuente la inicial del cliente como dinero prestado por Pagasi.
(function(){
  const filas=[];
  function cont(n){
    return { get innerHTML(){ return filas.join(''); },
      set innerHTML(v){ filas.length=0; if(v) filas.push(v); },
      querySelectorAll(sel){
        if(sel==='.mpago-row') return n===0 ? [] : Array.from({length:n},()=>({getAttribute:()=>null}));
        return [];
      } };
  }
  function repartir(nFilas, costo, inicial, tocada){
    const montos=[];
    const c = { innerHTML:'',
      querySelectorAll(sel){
        if(sel==='.mpago-row') return Array.from({length:nFilas},()=>({getAttribute:()=> tocada?'1':null}));
        if(sel==='.wzmpago-monto') return [{set value(v){montos[0]=v;}, get value(){return montos[0];}},
                                           {set value(v){montos[1]=v;}, get value(){return montos[1];}}];
        return [];
      } };
    const G={ console:{log(){},warn(){}}, String, Array, Object, Math, parseFloat, setTimeout:()=>0,
      _cuentasBanc:[{nombre:'Binance 26'}], document:{ getElementById:(id)=> id==='wzmpago-rows'? c : null, querySelectorAll:()=>[] },
      window:{} };
    G.window=G; vm.createContext(G);
    const mp=src('logic/moto-pagos.js');
    vm.runInContext(mp.slice(0, mp.indexOf('function _mpagoEliminarFila')), G);
    G._mpagoActualizarTotales=function(){};
    G._mpagoRepartirInicial('wzmpago', costo, inicial);
    return { html:c.innerHTML, montos:montos };
  }
  const r = repartir(1, 1350, 750, false);
  ok('el paso 3 reparte solo: inicial y financiado en dos filas',
    r.montos[0]==='750.00' && r.montos[1]==='600.00');
  ok('...y dice cuál es cuál',
    r.html.indexOf('Inicial del cliente')>-1 && r.html.indexOf('Lo que financia Pagasi')>-1);
  ok('...las dos suman el costo de la moto', (parseFloat(r.montos[0])+parseFloat(r.montos[1]))===1350);

  const sinIni = repartir(1, 1350, 0, false);
  ok('sin inicial no se inventa un reparto', sinIni.montos.length===0 && sinIni.html==='');
  const todoIni = repartir(1, 1350, 1350, false);
  ok('si la inicial cubre la moto entera, tampoco', todoIni.montos.length===0);
  const tocada = repartir(1, 1350, 750, true);
  ok('si el vendedor ya escribió algo, no se le pisa', tocada.montos.length===0);
  const dosFilas = repartir(2, 1350, 750, false);
  ok('si ya hay dos filas (volvió al paso), se respetan', dosFilas.montos.length===0);
})();

ok('el wizard pide ese reparto al pintar el paso 3',
  /_mpagoRepartirInicial\('wzmpago', costoBase, iniReal\);/.test(src('logic/creditos.js')));

// ── La pantalla que lleva horas abierta se entera de las cuentas nuevas ─────
const cfg=src('logic/configuracion.js');
ok('existe la relectura para cuando la lista está vacía', /function _cuentasRecargarSiVacio\(\)/.test(cfg));
ok('...no relee si ya hay cuentas', /if\(_cuentasBanc && _cuentasBanc\.length\) return;/.test(cfg));
ok('...ni se pisa a sí misma si ya está preguntando', /window\._cuentasRecargando/.test(cfg));
ok('...y al llegar las cuentas rellena los desplegables vacíos', /function _cuentasRellenarSelects\(\)/.test(cfg));
ok('...solo los que traían el aviso, no los demás',
  /indexOf\('No hay cuentas cargadas'\) === -1\) return;/.test(cfg));
ok('...escapando el nombre de la cuenta', /replace\(\/"\/g,'&quot;'\)/.test(cfg));
ok('la compra de la moto pide la relectura al pintarse',
  /_cuentasRecargarSiVacio==='function'\) setTimeout\(_cuentasRecargarSiVacio, 0\)/.test(src('logic/moto-pagos.js')));
ok('el cobro de la inicial también',
  /_cuentasRecargarSiVacio==='function'\) setTimeout\(_cuentasRecargarSiVacio, 0\)/.test(src('logic/creditos.js')));

// La relectura, corriendo: llega la lista y el desplegable se llena solo
(function(){
  const sel = { options:[{textContent:'— No hay cuentas cargadas —'}], innerHTML:'' };
  const otro = { options:[{textContent:'— Elegir cobrador —'}], innerHTML:'INTACTO' };
  const G={ console:{log(){},warn(){}}, String, Array, Object, setTimeout:(f)=>f(),
    _cuentasBanc:[], _cobradores:[], window:{},
    document:{ getElementById:()=>null, querySelectorAll:(q)=> q==='select' ? [sel,otro] : [] } };
  G.window=G; vm.createContext(G);
  let pedido=0;
  G.db={ collection(){ return { doc(){ return { get(){ pedido++; return Promise.resolve({
    exists:true, data(){ return { lista:[{nombre:'Binance 26'},{nombre:'100% Banco 26'}] }; } }); } }; } }; } };
  const cfgSrc=src('logic/configuracion.js');
  vm.runInContext(cfgSrc.slice(cfgSrc.indexOf('function renderCuentasBanc'), cfgSrc.indexOf('function renderCobradores')), G);
  G._cuentasRecargarSiVacio();
  return new Promise(r=>setImmediate(r)).then(function(){
    ok('la relectura pide la lista a la base una sola vez', pedido===1);
    ok('...y el desplegable vacío se llena con las cuentas de verdad',
      sel.innerHTML.indexOf('>Binance 26<')>-1 && sel.innerHTML.indexOf('>100% Banco 26<')>-1);
    ok('...sin tocar los desplegables que no eran de cuentas', otro.innerHTML==='INTACTO');
    console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
    if(fail) process.exitCode=1;
  });
})();
