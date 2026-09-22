// Cobranza: las pestañas muestran PORCENTAJES además de los números (Adam,
// 17-sep-2026: "aquí ponme porcentajes también"). Dos denominadores:
//   · % de la CARTERA (créditos vigentes: activo + mora) → la tasa de mora real.
//   · % de la MORA (cómo se reparten los atrasados entre las pestañas).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function elemento() {
  return { innerHTML:'', outerHTML:'', textContent:'', value:'', className:'', id:'', type:'text', src:'',
    style:{}, dataset:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}},
    children:[], checked:false, disabled:false,
    appendChild(){}, removeChild(){}, insertBefore(){}, remove(){},
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){},
    closest(){ return null; }, matches(){ return false; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
    querySelector(){ return null; }, querySelectorAll(){ return []; } };
}
const doc = { getElementById(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; },
  createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){} };
let impreso = '';   // lo que se manda a la ventana de impresión
const ctx = {
  console:{log(){},warn(){},error(){}},
  setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'},
  location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); },
  alert(){}, confirm(){return true;}, prompt(){return '';},
  open(){ return { document:{ write(h){ impreso += h; }, close(){} } }; },
  db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{},
};
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};};
ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};};
ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};};
ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}};
ctx.window=ctx;

const html = fs.readFileSync(path.join(ROOT,'admin.html'),'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = function(){};



// ── Cartera de 20 créditos vigentes: 5 atrasados (25% de la cartera) ──
// 2 con pocos días (mora regular), 2 con más de 30 días (críticos), 1 con acuerdo mensual.
const hoy = new Date();
const p2 = n => String(n).padStart(2, '0');
const dia = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
const pago = (id, cred, monto, fecha) => ({id:id, cred:cred, cli:'C', fecha:fecha, monto:monto, estado:'confirmado', metodo:'efectivo', eliminado:false});
// diasAtraso: cuántos días lleva vencida la primera cuota impaga (0 = al día)
const credito = (n, diasAtraso, extra) => Object.assign({
  id:'CRED-'+n, cli:'CLIENTE '+n, clienteId:'CLI-'+n, modelo:'MOTO', estado:'activo',
  fecha: dia(-(15 + diasAtraso)),      // la cuota 1 venció hace diasAtraso
  precio:1200, ini:0, fin:1200, total:1200, cuota:200, cuotaQ:100, plazo:6, totalCuotas:12,
  pagado:0, mora:diasAtraso, eliminado:false
}, extra || {});
ctx.S.creds = []; ctx.S.clientes = []; ctx.S.pagos = [];
for (let i = 1; i <= 15; i++) {                       // 15 al día (su cuota vence en el futuro)
  ctx.S.creds.push(credito(100 + i, 0, { fecha: dia(-1), mora: 0 }));
  ctx.S.clientes.push({ id:'CLI-'+(100+i), nombre:'CLIENTE '+(100+i), tel:'04140000000' });
}
const atrasados = [[201, 3], [202, 8], [203, 45], [204, 60], [205, 10]];
atrasados.forEach(function(x){
  const extra = x[0] === 205 ? { fechaCompromiso: dia(5) } : {};   // CRED-205: acuerdo mensual
  ctx.S.creds.push(credito(x[0], x[1], extra));
  ctx.S.clientes.push({ id:'CLI-'+x[0], nombre:'CLIENTE '+x[0], tel:'04140000000' });
});
ctx.S.currentUser = { uid:'u1', nombre:'Prueba', rol:'Administrador' };
ctx.S.page = 'pagos';
const h = String(ctx.PG.pagos());
const bloque = h.slice(h.indexOf('Mora Regular'), h.indexOf('Mora Regular') + 4000);

ok('la cartera son 20 créditos vigentes y 5 en mora', ctx.S.creds.length === 20);
ok('Mora Total: "5 en mora (25,0% de 20 créditos)"', /5 en mora[^·]*\(25,0% de 20 créditos\)/.test(bloque));
ok('Mora Regular: 2 en atraso con su % de la mora (40%)', /2 en atraso[^·]*\(40% de los 5 atrasados\)/.test(bloque));
ok('Críticos: los de +30 días con su % de la mora (40%)', /más de 30 días de mora[^·]*\(40% de los 5 atrasados\)/.test(bloque));
ok('Acuerdos: 1 acuerdo con su % de la cartera (5,0%)', /1 acuerdo[^·]*\(5,0% de 20 créditos\)/.test(bloque));
ok('Ilocalizables en cero NO dice "0%" (se queda limpio)', /0 marcados ·/.test(bloque));
ok('la línea de abajo trae la tasa y el reparto',
  /En mora total: <b>5<\/b> \(<b>25,0%<\/b> de la cartera, 20 créditos\)/.test(h) && /en Críticos: <b>2<\/b> \(40%\)/.test(h));

// ── Sin mora, la línea no aparece y no se inventa ningún porcentaje ──
ctx.S.creds = ctx.S.creds.filter(c => String(c.id).indexOf('CRED-1') === 0);
ctx.S.pagos = [];
const h2 = String(ctx.PG.pagos());
ok('cartera sana: ni "de la mora" ni "de la cartera" en las pestañas',
  h2.indexOf('atrasados)') === -1 && h2.indexOf('% de 20 créditos)') === -1 && h2.indexOf('En mora total:') === -1);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
