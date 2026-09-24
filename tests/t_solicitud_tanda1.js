// 24-sep-2026, tanda 1 de mejoras de la solicitud (Adam: "dale a lo demás", sin la inicial
// ofrecida): se quita el duplicado de empleo/ingreso del paso 1, se agregan datos que sí
// sirven (fecha de nacimiento, cómo se comprobó el ingreso, cuándo cobra, deuda mensual,
// moto previa), todos opcionales, y el expediente muestra qué falta sin obligar.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function elemento(){ return { innerHTML:'', textContent:'', value:'', style:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], appendChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }
const form = {};
const doc = { getElementById(id){ return form[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){} };
const avisos = [];
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;}, document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'}, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}}, fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){return '';}, confirm(){ return true; }, open(){ return {document:{write(){},close(){}}}; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};}; ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){}; ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};}; ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>src(f)).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = m => avisos.push(String(m));
const cr = src('logic/creditos.js'), cl = src('logic/clientes.js');

// ── 1. El duplicado ──
const paso1 = cr.slice(cr.indexOf("var step1 = '<div class=\"fg\""), cr.indexOf('// ── PASO 2: Moto ──'));
ok('el paso 1 ya no pregunta empleo, antigüedad ni ingreso', paso1.indexOf('id="wz_emp"') === -1 && paso1.indexOf("'wz_ing'") === -1 && paso1.indexOf("'wz_ant'") === -1 && paso1.indexOf("'wz_ifam'") === -1);
ok('...pero sí la fecha de nacimiento', /_perfilExtraHtml\('cliente'\)/.test(paso1));
ok('el formulario del cliente (ficha) tampoco los repite', cl.indexOf('id="wz_emp"') === -1 && /_perfilExtraHtml\('cliente'\)/.test(cl));
ok('el paso 2 sigue teniendo empleo, antigüedad, ingreso e ingreso familiar', /id="wz_emp_g"/.test(cr) && /_inp\('wz_ing'/.test(cr) && /_sel\('wz_ant'/.test(cr) && /_inp\('wz_ifam'/.test(cr));

// ── 2. Lo obligatorio no cambió: solo se mudó de paso ──
function validar(paso, extra){
  Object.keys(form).forEach(k => delete form[k]); avisos.length = 0;
  vm.runInContext("WZ = " + JSON.stringify(Object.assign({ step: paso }, extra || {})) + ";", ctx);
  ['wz_nom','wz_ci','wz_tel'].forEach(id => { form[id] = elemento(); form[id].value = 'x'; });
  if(extra && extra.__ing != null){ form['wz_ing'] = elemento(); form['wz_ing'].value = String(extra.__ing); }
  return ctx._wzValidar();
}
ctx.window._wzEditando = null;
ok('paso 1: con nombre, cédula y teléfono ya pasa (empleo e ingreso ya no están ahí)', validar(1) !== false);
ok('paso 2: sin tipo de empleo no deja seguir, como antes', validar(2, {}) === false && avisos.some(a => /tipo de empleo/.test(a)));
ok('paso 2: sin ingreso tampoco', validar(2, { _chip_wz_emp_g:'formal', __ing:0 }) === false && avisos.some(a => /ingreso mensual/.test(a)));
ok('paso 2: con empleo e ingreso pasa', validar(2, { _chip_wz_emp_g:'formal', __ing:600 }) !== false);
ok('ningún dato nuevo es obligatorio', !/fecha_nacimiento|dia_cobro|ingreso_comprobante|deuda_mensual|moto_previa/.test(cr.slice(cr.indexOf('function _wzValidar'), cr.indexOf('function _wzNext'))));

// ── 3. Los datos nuevos ──
const h = sec => ctx._perfilExtraHtml(sec);
ok('cliente: fecha de nacimiento', /id="wz_fecha_nacimiento" type="date"/.test(h('cliente')));
ok('empleo: cómo se comprobó el ingreso y cuándo cobra', /id="wz_ingreso_comprobante"/.test(h('empleo')) && /id="wz_dia_cobro"/.test(h('empleo')) && /Solo de palabra/.test(h('empleo')) && /Quincenal/.test(h('empleo')));
ok('historial: deuda mensual y moto previa', /id="wz_deuda_mensual" type="number"/.test(h('historial')) && /id="wz_moto_previa"/.test(h('historial')) && /la perdió/.test(h('historial')));
ok('la solicitud y la ficha los ponen en su sección', /_perfilExtraHtml\('empleo'\)/.test(cr) && /_perfilExtraHtml\('historial'\)/.test(cr) && /_perfilExtraHtml\('empleo'\)/.test(cl) && /_perfilExtraHtml\('historial'\)/.test(cl));
vm.runInContext("WZ = { fecha_nacimiento:'1990-05-10', deuda_mensual:'80', dia_cobro:'semanal' };", ctx);
let d = ctx._perfilExtraDatos();
ok('se guardan con su tipo', d.fecha_nacimiento === '1990-05-10' && d.deuda_mensual === 80 && d.dia_cobro === 'semanal' && d.moto_previa === '');
d = ctx._perfilExtraDatos({ moto_previa:'pagada', deuda_mensual: 999 });
ok('al editar, lo vacío conserva lo que había', d.moto_previa === 'pagada' && d.deuda_mensual === 80);
ok('se guardan en el cliente, en el crédito y al editar', (cr.match(/\.\.\._perfilExtraDatos\(/g)||[]).length === 3 && (cl.match(/\.\.\._perfilExtraDatos\(/g)||[]).length === 1);
ok('la edad se calcula sola', ctx._edadDe('1990-05-10') === 36 && ctx._edadDe('') === '' && ctx._edadDe('2030-01-01') === '');
ok('la ficha los muestra', /Fecha de nacimiento/.test(cl) && /Cuándo cobra/.test(cl) && /Ya tuvo moto/.test(cl) && /Paga al mes en otras deudas/.test(cl));

// ── 4. El expediente dice qué falta, sin obligar ──
const est = ctx._expedienteEstado([{ label:'Cédula frente' }, { label:'Recibo de luz', name:'IMG_1.jpg' }]);
ok('reconoce la cédula y el comprobante de residencia por el nombre', est.find(x=>x.k==='cedula').ok && est.find(x=>x.k==='residencia').ok);
ok('...y marca lo que falta', !est.find(x=>x.k==='selfie').ok && !est.find(x=>x.k==='ingreso').ok);
const eh = ctx._expedienteHtml([{ label:'Cédula' }]);
ok('lo dice en la pantalla, con "se pueden subir después"', /Faltan 3/.test(eh) && /se pueden subir después/.test(eh));
ok('completo también lo dice', /Expediente base completo/.test(ctx._expedienteHtml([{label:'Cédula'},{label:'Selfie con cédula'},{label:'Recibo de luz'},{label:'Estado de cuenta'}])));
ok('está en la solicitud y en la ficha', /_expedienteHtml\(existentes\)/.test(src('logic/documentos.js')) && /_expedienteHtml\(c\.documentos\)/.test(cl));
ok('sin documentos no se bloquea nada', !/expediente/i.test(cr.slice(cr.indexOf('function _wzValidar'), cr.indexOf('function _wzNext'))));

// ── 5. Subir un documento refresca la lista (esc no era global y reventaba) ──
(function(){
  const lista = elemento(); form['wz_doc_libre_list'] = lista;
  vm.runInContext("WZ = { documentos:[{id:'d1', label:'Cédula <frente>', name:'ci.jpg', size:2048}] };", ctx);
  let error = null; try { ctx._docLibreWizardRefreshList(); } catch(e){ error = e; }
  ok('la lista de documentos se refresca sin reventar', !error && /Cédula &lt;frente&gt;/.test(lista.innerHTML));
  delete form['wz_doc_libre_list'];
})();

console.log('\n' + pass + ' OK · ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
