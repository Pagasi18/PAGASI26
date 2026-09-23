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
