// La barra lateral. 22-sep-2026, Adam: "centro de trabajo y files que nadie los usa...
// tambien aprobaciones y scores... tal vez esconderlo o algo" y "cambiame la visual de
// esta barra que este en sinergia con el nuevo dashborad".
// Se esconden del menu, NO se borran: la pantalla sigue viva y se abre por nav('scores').
// Aprobaciones es distinto: ahi caen las solicitudes de los vendedores de concesionario
// y alguien las tiene que aprobar, asi que aparece sola cuando hay algo esperando.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

// ── El menu se arma de verdad, con un administrador ──────────────────────────
function menu(creds){
  const G={ console:{log(){},warn(){}}, Math, String, Number, Array, Object, JSON, Date, parseInt, parseFloat, isNaN,
    S:{ creds:creds||[], currentUser:{uid:'U1',nombre:'Adam',rol:'Administrador',permisos:['dash']} },
    isEmpleadoRole:()=>false, isVendedorConcesionarioRole:()=>false, isAdminUser:()=>true,
    getCurrentPerms:()=>['dash'], updateSidebarFooter(){}, window:{} };
  let html='';
  const nav={ innerHTML:'', querySelector(sel){ const m=/data-nav="([a-z]+)"/.exec(sel);
      return (m && this.innerHTML.indexOf('data-nav="'+m[1]+'"')>-1) ? {querySelector:()=>null} : null; } };
  Object.defineProperty(nav,'innerHTML',{ get(){ return html; }, set(v){ html=v; } });
  G.document={ querySelector:s=>(s==='.sb-nav'?nav:null), getElementById:()=>null };
  G.window=G; vm.createContext(G);
  const app=src('assets/pagasi-app.js');
  vm.runInContext(app.slice(app.indexOf('var PG_NAVICONS'), app.indexOf('function updateSidebarFooter()')), G);
  vm.runInContext("var PGL="+/const PGL=(\{[\s\S]*?\});/.exec(app)[1]+";", G);
  G.renderSidebar();
  return html;
}

const m = menu([]);
ok('el menu se arma', m.length>500 && m.indexOf('data-nav="dash"')>-1);
['centro','recursos','scores'].forEach(function(k){
  ok('ya no se ve '+k, m.indexOf('data-nav="'+k+'"')===-1);
});
['dash','clientes','motos','creditos','pagos','contratos','gps','notif','calculadora','reportes','cuentas','comisiones','plan','config','concesionarios','users'].forEach(function(k){
  ok('sigue estando '+k, m.indexOf('data-nav="'+k+'"')>-1);
});
ok('sin solicitudes esperando, Aprobaciones no se ve', m.indexOf('data-nav="aprobaciones"')===-1);

// ── Aprobaciones aparece sola cuando hay algo que aprobar ───────────────────
const conCola = menu([
  {id:'C1', estado:'pendiente_revision'},
  {id:'C2', estado:'pendiente_revision'},
  {id:'C3', estado:'activo'},
  {id:'C4', estado:'pendiente_revision', eliminado:true},
]);
ok('con solicitudes esperando, Aprobaciones aparece', conCola.indexOf('data-nav="aprobaciones"')>-1);
ok('...con el numero de las que esperan (sin contar las borradas ni las activas)',
  /data-nav="aprobaciones"[\s\S]*?si-bx">2</.test(conCola));
ok('...y los escondidos siguen escondidos', conCola.indexOf('data-nav="scores"')===-1);

// ── Las pantallas NO se borraron: se abren por su enlace ────────────────────
['modules/centro.js','modules/recursos.js','modules/scores.js','modules/aprobaciones.js'].forEach(function(f){
  ok('la pantalla '+f.split('/')[1]+' sigue existiendo', fs.existsSync(path.join(ROOT,f)));
});
const appSrc=src('assets/pagasi-app.js');
ok('el menu tiene un solo sitio donde se decide que se esconde', /var SIDEBAR_OCULTOS = \['centro','recursos','scores'\]/.test(appSrc));
ok('el menu se vuelve a armar cuando cambia la cola de aprobaciones',
  /function _sidebarSyncAprobaciones\(\)/.test(appSrc) && /function updateBadge\(\)\{\n  _sidebarSyncAprobaciones\(\);/.test(appSrc));

// ── El esqueleto de admin.html no los muestra al cargar ────────────────────
const adm=src('admin.html');
ok('admin.html ya no trae Centro de trabajo mientras carga', adm.indexOf('data-nav="centro"')===-1);
ok('admin.html ya no trae Scores mientras carga', adm.indexOf('data-nav="scores"')===-1);

// ── La visual: la barra habla el idioma de las tarjetas del dashboard ──────
const css=src('assets/pagasi.css');
const bloque=css.slice(css.indexOf('/* ─── SIDEBAR — la misma familia'), css.indexOf('/* ─── TOPBAR ─── */'));
ok('la barra ya no es gris plano, usa las variables del sistema', /\.sb \{[\s\S]*?background: var\(--surf2\)/.test(bloque) && bloque.indexOf('#FAFAFA')===-1);
ok('el modulo abierto es una tarjeta blanca, no un relleno azul',
  /\.si\.on[\s\S]*?background: var\(--surf\)[\s\S]*?box-shadow: 0 1px 2px/.test(bloque));
ok('el icono va en su capsula, como el de cada tarjeta',
  /\.sic\.nav-ic \{[\s\S]*?border-radius: 10px/.test(bloque));
ok('las esquinas siguen la familia del dashboard (13px vs 20px de las tarjetas)',
  /border-radius: 13px/.test(bloque));
ok('el contador es un chip, no una bolita roja', /\.si-bx \{[\s\S]*?border-radius: 20px/.test(bloque));
ok('el contador de mora se queda en rojo', /#sb-badge-cob \{ background: var\(--reds\)/.test(bloque));
// El estilo del contador estaba escrito CUATRO veces en el mismo archivo, cada una
// pisando a la anterior: por eso no obedecia. Ahora hay una sola.
ok('el estilo del contador esta escrito una sola vez en todo el CSS',
  (css.match(/^\.si-bx\s*\{/gm)||[]).length===1);
ok('el numero de mora ya no se pinta a mano desde el JavaScript',
  !/cob\.style\.background='var\(--red\)'/.test(appSrc) && /cob\.textContent = enMora;\n      cob\.style\.display='flex';/.test(appSrc));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
