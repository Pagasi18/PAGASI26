// 24-sep-2026: los empleados pidieron "más data de Cashea" en la solicitud. Cashea tiene
// 6 niveles con nombre (Semilla … Araguaney); el sistema ofrecía 4 con nombres
// inventados. Los datos nuevos son los que la app le muestra al cliente en su teléfono.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function elemento(){ return { innerHTML:'', textContent:'', value:'', style:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], appendChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;}, document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'}, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}}, fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';}, confirm(){ return true; }, open(){ return {document:{write(){},close(){}}}; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};}; ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){}; ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};}; ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});

// ── Niveles ──
const niv = ctx._casheaNivelOpts();
ok('hay 6 niveles', (niv.match(/<option value="\d"/g)||[]).length === 6);
ok('con los nombres de Cashea', /Semilla/.test(niv) && /Araguaney/.test(niv) && !/Bronce|Plata|Oro/.test(niv));
ok('la ficha los muestra con nombre', ctx._casheaNivelNombre(3) === 'Nivel 3 — Hoja' && ctx._casheaNivelNombre('') === '');

// ── Formulario ──
const h = { row2:(a,b)=>'<r>'+a+b+'</r>', fg:(l,i)=>'<g>'+l+i+'</g>', sel:(id,o,on)=>'<select id="'+id+'" onchange="'+(on||'')+'">'+o+'</select>', inp:(id,t,ph,ex)=>'<input id="'+id+'" type="'+t+'" '+(ex||'')+'>', s2:t=>'<h>'+t+'</h>' };
const html = ctx._casheaExtraHtml(h);
ok('el formulario trae todos los datos nuevos', ctx.CASHEA_EXTRA.every(f => html.indexOf('id="wz_'+f.k+'"') > -1));
ok('...la línea, el cupo, las cuotas a tiempo, los atrasos y cómo se confirmó', ['Línea de crédito','Cupo disponible','Cuotas pagadas a tiempo','Atrasos','¿Cómo confirmaste'].every(s => html.indexOf(s) > -1));
ok('...y los que pesan en el score recalculan al tocarlos', /id="wz_cashea_cuotas_tiempo"[^>]*_wzScore\(\)/.test(html) && /id="wz_cashea_atrasos" onchange="_wzScore\(\)"/.test(html));
const cr = src('logic/creditos.js'), cl = src('logic/clientes.js');
ok('la solicitud y la ficha del cliente usan el mismo trozo', cr.indexOf('_casheaExtraHtml({row2:_row2') > -1 && cl.indexOf('_casheaExtraHtml({row2:_row2') > -1);
ok('y el mismo desplegable de niveles', cr.indexOf("_sel('wz_cashea_nivel',_casheaNivelOpts()") > -1 && cl.indexOf("_sel('wz_cashea_nivel',_casheaNivelOpts()") > -1);
ok('el formulario público acepta hasta nivel 6', /id="wz_cashea_nivel" min="0" max="6"/.test(src('solicitar.html')));

// ── Guardado ──
vm.runInContext("WZ = { cashea_linea:'600', cashea_cupo:'', cashea_cuotas_tiempo:'24', cashea_atrasos:'0', cashea_verificado:'app' };", ctx);
let d = ctx._casheaExtraDatos();
ok('los números se guardan como números', d.cashea_linea === 600 && d.cashea_cuotas_tiempo === 24 && d.cashea_cupo === 0);
ok('los textos como textos', d.cashea_atrasos === '0' && d.cashea_verificado === 'app' && d.cashea_prox_fecha === '');
d = ctx._casheaExtraDatos({ cashea_cupo: 350, cashea_prox_fecha:'2026-10-01', cashea_linea: 999 });
ok('al editar, lo vacío conserva lo que ya había y lo lleno manda', d.cashea_cupo === 350 && d.cashea_prox_fecha === '2026-10-01' && d.cashea_linea === 600);
ok('se guarda en el cliente, en el crédito y al editar', (cr.match(/\.\.\._casheaExtraDatos\(/g)||[]).length === 3 && (cl.match(/\.\.\._casheaExtraDatos\(/g)||[]).length === 1);
ok('se recoge del formulario y se precarga al editar', (cr.match(/CASHEA_EXTRA\.forEach/g)||[]).length >= 4 && (cl.match(/CASHEA_EXTRA\.forEach/g)||[]).length >= 2);
ok('la ficha del cliente los muestra', cl.indexOf('Lo que muestra la app de Cashea') > -1 && cl.indexOf('_casheaEtiqueta(') > -1);

// ── Score ──
const sc = v => ctx._casheaExtraScore(v);
ok('nivel 6 suma más que nivel 1', sc({cashea_nivel:6}) > sc({cashea_nivel:1}) && sc({cashea_nivel:1}) === 3);
ok('40 cuotas a tiempo suman 10', sc({cashea_nivel:0, cashea_cuotas_tiempo:'40'}) === 10);
ok('dos o más atrasos restan 18 y bajar de nivel resta 10', sc({cashea_atrasos:'2+'}) === -18 && sc({cashea_bajo_nivel:'si'}) === -10);
ok('sin datos no cambia nada', sc({}) === 0);
ok('la fórmula única lo usa en la intención de pago', /_casheaExtraScore\(input\)/.test(src('logic/scores.js')) && /calcularScoreConCfg\(input\)/.test(cr));

console.log('\n' + pass + ' OK · ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
