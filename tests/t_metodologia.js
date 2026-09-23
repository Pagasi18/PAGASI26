// 23-sep-2026, Adam: "necesito hacer una pestaña más que se llame Nueva metodología...
// yo cobro 12% de interés anual y el resto es Pagasi Protect del pago que me tiene que
// hacer el cliente... y de Pagasi Protect hay que pagar el IVA".
// El contrato que se firma hoy ya está armado así, pero en Finanzas todo el dinero
// cobrado se veía como una sola bolsa — incluido el IVA, que no es de Pagasi.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const cerca=(a,b,t)=>Math.abs(a-b)<=(t==null?0.02:t);
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

function entorno(creds, pagos){
  const G={ console:{log(){},warn(){}}, Math, parseFloat, parseInt, isNaN, String, Number, Array, Object, Date, JSON,
    S:{ creds:creds||[], pagos:pagos||[], clientes:[], motos:[] },
    hoyLocalISO:()=>'2026-09-23', fmt:n=>'$'+(parseFloat(n)||0).toFixed(2),
    toast(){}, nav(){}, document:{ createElement:()=>({click(){}}) }, window:{} };
  G.window=G; vm.createContext(G);
  const pro=src('logic/contratos-protect.js');
  vm.runInContext(pro.slice(0, pro.indexOf('function _protectDatos')), G);
  vm.runInContext(src('logic/metodologia.js'), G);
  return G;
}

// ── El ejemplo de Adam: moto 1350, inicial 750, cuota 53 × 24 ───────────────
const CRED={ id:'M-001', cli:'JOSÉ PRUEBA', fecha:'2026-09-23', estado:'activo',
             precio:1350, ini:750, cuotaQ:53, totalCuotas:24 };
let G=entorno([CRED],[]);
const R=G._metoDeCredito(CRED);

ok('el cliente paga en cuotas 53 × 24 = 1272', cerca(R.total, 1272, 0.5));
ok('recupera los 600 que faltan del precio tras la inicial', cerca(R.recuperacion, 600));
ok('los intereses son el 12 % anual sobre lo financiado, no sobre el precio',
  R.intereses > 0 && R.intereses < 100);
ok('y todo lo demás es Pagasi Protect', cerca(R.recuperacion + R.intereses + R.protect, R.total, 0.05));

// El IVA: el monto del Protect ya lo trae dentro
ok('la base del Protect sale de dividir entre 1,16', cerca(R.protectBase, R.protect/1.16));
ok('el IVA es lo que queda', cerca(R.iva, R.protect - R.protectBase));
ok('...y es exactamente el 16 % de la base, que es como se declara',
  cerca(R.iva, R.protectBase*0.16, 0.02));
ok('...no el 16 % del total (eso daría un 19 % sobre la base y no cuadraría)',
  !cerca(R.iva, R.protect*0.16, 0.5));
ok('base más IVA devuelven el Protect', cerca(R.protectBase + R.iva, R.protect));

// ── Lo cobrado se reparte en la misma proporción que el contrato ───────────
let x=G._metoRepartir(R, R.total);
ok('cobrado todo el crédito: el reparto es el del contrato',
  cerca(x.recuperacion, R.recuperacion) && cerca(x.protect, R.protect) && cerca(x.iva, R.iva));
x=G._metoRepartir(R, R.total/2);
ok('cobrada la mitad: cada parte va por la mitad',
  cerca(x.recuperacion, R.recuperacion/2, 0.05) && cerca(x.iva, R.iva/2, 0.05));
x=G._metoRepartir(R, 0);
ok('sin cobrar nada, todas las partes en cero',
  x.cobrado===0 && x.protect===0 && x.iva===0 && x.intereses===0);
ok('las partes de un cobro siempre suman el cobro',
  (function(){ const y=G._metoRepartir(R, 318.25);
    return cerca(y.recuperacion+y.intereses+y.protect, y.cobrado, 0.05); })());

// ── Qué pagos entran ────────────────────────────────────────────────────────
G=entorno([CRED],[
  {cred:'M-001', monto:53, fecha:'2026-09-10', estado:'confirmado'},
  {cred:'M-001', monto:53, fecha:'2026-09-20', estado:'confirmado'},
  {cred:'M-001', monto:750, fecha:'2026-09-05', estado:'confirmado', esInicial:true},
  {cred:'M-001', monto:53, fecha:'2026-08-20', estado:'confirmado'},
  {cred:'M-001', monto:53, fecha:'2026-09-21', estado:'pendiente'},
  {cred:'M-001', monto:53, fecha:'2026-09-21', estado:'confirmado', eliminado:true},
]);
let porCred=G._metoPagosDe([CRED], '2026-09-01', '2026-09-30');
ok('cuenta las cuotas confirmadas del mes', porCred['M-001']===106);
ok('...la inicial NO entra: el cliente la puso de entrada y no lleva Protect',
  porCred['M-001']!==856);
ok('...ni los pagos de otro mes, ni los pendientes, ni los anulados', porCred['M-001']===106);
porCred=G._metoPagosDe([CRED], '', '');
ok('con el período "todo" entran también las de meses anteriores', porCred['M-001']===159);

// ── Los períodos ────────────────────────────────────────────────────────────
G=entorno([CRED],[]);
G._METO_PERIODO='mes';      ok('el mes va del día 1 a hoy', G._metoRango().desde==='2026-09-01');
G._METO_PERIODO='ano';      ok('el año, desde el 1 de enero', G._metoRango().desde==='2026-01-01');
G._METO_PERIODO='quincena'; ok('el 23 cae en la segunda quincena', G._metoRango().desde==='2026-09-16');
G._METO_PERIODO='todo';     ok('"todo" no pone límites', G._metoRango().desde==='' && G._metoRango().hasta==='');

// ── La pantalla ─────────────────────────────────────────────────────────────
G=entorno([CRED],[{cred:'M-001', monto:106, fecha:'2026-09-20', estado:'confirmado'}]);
G._METO_PERIODO='mes';
const html=G._renderNuevaMetodologia();
ok('la pantalla se arma', typeof html==='string' && html.length>2000);
ok('...con las cuatro partes a la vista',
  html.indexOf('Recuperación del precio')>-1 && html.indexOf('Intereses 12 % anual')>-1
  && html.indexOf('Pagasi Protect')>-1 && html.indexOf('IVA 16 %')>-1);
ok('...dice que el IVA no es de Pagasi', html.indexOf('esto no es de Pagasi')>-1);
ok('...muestra lo cobrado y lo pactado', html.indexOf('Cobrado en cuotas')>-1 && html.indexOf('Pactado')>-1);
ok('...explica de dónde sale cada número', html.indexOf('Cómo se saca cada parte')>-1);
ok('...y avisa de que la inicial no entra', html.indexOf('La inicial no entra en esta cuenta')>-1);
ok('...el crédito aparece en la tabla', html.indexOf('M-001')>-1 && html.indexOf('JOSÉ PRUEBA')>-1);
ok('...sin "undefined" ni "NaN"', !/undefined|NaN/.test(html));

// Lo que escribe un empleado sale escapado
const CRED2=Object.assign({}, CRED, {cli:'JOSÉ <script>PRUEBA'});
G=entorno([CRED2],[{cred:'M-001', monto:106, fecha:'2026-09-20', estado:'confirmado'}]);
ok('un < en el nombre del cliente sale escapado',
  G._renderNuevaMetodologia().indexOf('&lt;script&gt;')>-1);

// ── Créditos que no se pueden repartir ──────────────────────────────────────
G=entorno([{id:'X-1', cli:'SIN DATOS', estado:'activo', precio:1000}],[]);
ok('un crédito sin cuota ni plazo no se inventa un reparto', G._metoDeCredito({id:'X-1', precio:1000})===null);
ok('...y la pantalla lo dice en vez de callarlo', /no se pudo repartir/.test(G._renderNuevaMetodologia()));

// ── La pestaña está en Finanzas ─────────────────────────────────────────────
const rep=src('modules/reportes.js');
ok('la pestaña existe en Finanzas', /\{k:'metodologia', lbl:'Nueva metodología'/.test(rep));
ok('...y se pinta cuando se elige', /tab==='metodologia'/.test(rep));
ok('el archivo se carga en el sistema', /logic\/metodologia\.js/.test(src('admin.html')));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
