// Puntos 4, 5 y 6 de la lista del 18-sep-2026:
//  4) el wizard cambiaba la moto por otra del mismo precio al volver al paso 3;
//  5) el recalculo de mora (al abrir y cada 5 min) devolvia a "activo"/"mora" los
//     creditos recuperados y aprobaba solas las solicitudes pendientes;
//  6) abrir Inventario o el wizard volvia a marcar "financiada" la moto recuperada.
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
const els = {};
const doc = { getElementById(id){ return els[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; },
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
const escritos = [];
ctx.DB = Object.assign({}, ctx.DB, { updateCred(id, d){ escritos.push([id, d]); return Promise.resolve(); }, saveMoto(){ return Promise.resolve(); } });
const p2 = n => String(n).padStart(2, '0');
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
const cred = (id, estado, extra) => Object.assign({ id, cli:'CLIENTE ' + id, estado, fecha: dia(-60), cuotaQ:50, totalCuotas:24, plazo:12, pagado:0, mora:0, motoId: id }, extra || {});

// ── 5) Recalculo de mora ──
ctx.S.creds = [
  cred('REC', 'recuperado', { mora: 40 }), cred('PEN', 'pendiente_revision'), cred('RCH', 'rechazado'),
  cred('ATR', 'activo'), cred('ALD', 'activo', { fecha: dia(-3) }), cred('MOR', 'mora', { mora: 10 }),
  cred('VIE', undefined), cred('CMP', 'completado', { pagado: 24 }),
];
ctx.calcularMoraAuto();
const est = id => ctx.S.creds.find(c => c.id === id);
ok('un credito recuperado sigue recuperado (antes volvia a mora)', est('REC').estado === 'recuperado');
ok('el recuperado ya no cuenta dias de atraso (mora 0)', est('REC').mora === 0);
ok('una solicitud pendiente sigue pendiente (antes se aprobaba sola)', est('PEN').estado === 'pendiente_revision' && est('PEN').mora === 0);
ok('un rechazado sigue rechazado', est('RCH').estado === 'rechazado');
ok('la cartera vigente se sigue recalculando: 60 dias sin pagar → mora', est('ATR').estado === 'mora' && est('ATR').mora > 5);
ok('el que va al dia sigue activo', est('ALD').estado === 'activo' && est('ALD').mora === 0);
ok('uno en mora se recalcula', est('MOR').estado === 'mora' && est('MOR').mora > 10);
ok('un credito viejo sin estado se sigue recalculando como antes', est('VIE').estado === 'mora');
ok('el completado no se toca', est('CMP').estado === 'completado');
ok('no se escribio ningun estado nuevo para recuperado, pendiente ni rechazado',
  !escritos.some(([id, d]) => ['REC','PEN','RCH'].includes(id) && d.estado));

// ── 6) Inventario: la moto recuperada no vuelve a "financiada" ──
ctx.S.creds = [
  cred('C1', 'recuperado', { motoId: 1 }),                       // moto 1 recuperada
  cred('C2', 'activo', { motoId: 2 }),                           // moto 2 vendida
  cred('C3', 'recuperado', { motoId: 3, cli: 'CLIENTE VIEJO' }), // moto 3 recuperada y vuelta a vender
  cred('C4', 'activo', { motoId: 3, cli: 'CLIENTE NUEVO' }),
  cred('C5', 'rechazado', { motoId: 5 }),
];
ctx.S.motos = [
  { id:1, estado:'recuperada', cliente:null }, { id:2, estado:'disponible', cliente:null },
  { id:3, estado:'disponible', cliente:null }, { id:5, estado:'disponible', cliente:null },
];
ctx.sincronizarInventarioConCreditos({ save: true });
const moto = id => ctx.S.motos.find(m => m.id === id);
ok('la moto recuperada sigue recuperada y sin cliente', moto(1).estado === 'recuperada' && moto(1).cliente === null);
ok('la moto de un credito activo si pasa a financiada', moto(2).estado === 'financiada');
ok('moto recuperada y vuelta a vender: financiada con el cliente NUEVO', moto(3).estado === 'financiada' && moto(3).cliente === 'CLIENTE NUEVO');
ok('la moto de una solicitud rechazada queda disponible', moto(5).estado === 'disponible');

// ── 4) Wizard: dos modelos del mismo precio ──
// CATALOGO es una constante del app: se cambia su contenido, no la variable
vm.runInContext("CATALOGO.splice(0, CATALOGO.length, {modelo:'NEW HORSE 150', precio:1500}, {modelo:'LEÓN 200', precio:1500}, {modelo:'BR150 MILAN', precio:1200})", ctx);
function selectFalso(html){
  const opts = [...html.matchAll(/<option value="([^"]*)"(?: data-modelo="([^"]*)")?[^>]*>([^<]*)<\/option>/g)]
    .map(m => ({ value: m[1], text: m[3], _m: m[2] || null, getAttribute(k){ return k === 'data-modelo' ? this._m : null; } }));
  const s = { options: opts, selectedIndex: 0 };
  Object.defineProperty(s, 'value', { get(){ return (opts[s.selectedIndex] || {}).value || ''; },
    set(v){ const i = opts.findIndex(o => o.value === String(v)); s.selectedIndex = i < 0 ? 0 : i; } });
  return s;
}
const ov = Object.assign(elemento(), { style:{} });
let htmlWizard = '';
Object.defineProperty(ov, 'innerHTML', { get(){ return htmlWizard; }, set(v){ htmlWizard = v; } });
els['wz-overlay'] = ov;
ctx.S.motos = []; ctx.S.creds = []; ctx.S.clientes = [];
ctx.WZ.step = 3; ctx.WZ.motoModelo = '';
try { ctx._wzRender(); } catch (e) {}
const catHtml = (htmlWizard.match(/<select class="fs" id="wz_moto_cat"[\s\S]*?<\/select>/) || [''])[0];
const valores = [...catHtml.matchAll(/<option value="([^"]*)"/g)].map(m => m[1]).filter(v => v && v !== '__wz_new_cat__');
ok('cada modelo del catalogo tiene un valor distinto en el selector', valores.length === 3 && new Set(valores).size === 3);
// Se eligio NEW HORSE 150 y se vuelve al paso 3: el selector se arma de nuevo y se restaura
els['wz_moto_cat'] = selectFalso(catHtml);
ctx.setTimeout = function(fn){ try { fn(); } catch (e) {} return 0; };
ctx.WZ.step = 3; ctx.WZ.motoModelo = 'NEW HORSE 150'; ctx.WZ.motoInvId = null;
try { ctx._wzRender(); } catch (e) {}
els['wz_moto_cat'] = selectFalso((htmlWizard.match(/<select class="fs" id="wz_moto_cat"[\s\S]*?<\/select>/) || [''])[0]);
try { ctx._wzRender(); } catch (e) {}
ok('al volver al paso 3 sigue NEW HORSE 150 (antes quedaba LEÓN 200)', ctx.WZ.motoModelo === 'NEW HORSE 150');
const sel = els['wz_moto_cat'];
ok('y el selector muestra NEW HORSE 150', sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex]._m === 'NEW HORSE 150');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
