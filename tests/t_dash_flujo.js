// Dashboard › tarjeta "Flujo de caja" (antes "Utilidad"). La vieja restaba TODO lo
// histórico, incluida la plata prestada en motos, y decía "sept." sin serlo: a Adam le
// salía −$348.849 en rojo (17-sep-2026: "todo esto lo puedes hacer mejor"). Ahora:
// cuotas cobradas DEL MES menos lo que salió DEL MES, sin la inicial del cliente.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function elemento() {
  return {
    innerHTML: '', outerHTML: '', textContent: '', value: '', className: '', id: '', type: 'text',
    style: {}, dataset: {}, classList: { add(){}, remove(){}, contains(){ return false; }, toggle(){} },
    children: [], checked: false, disabled: false,
    appendChild(){}, removeChild(){}, insertBefore(){}, remove(){},
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){},
    closest(){ return null; }, matches(){ return false; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
    querySelector(){ return elemento(); }, querySelectorAll(){ return []; },
  };
}
const doc = {
  getElementById(){ return elemento(); }, querySelector(){ return elemento(); }, querySelectorAll(){ return []; },
  createElement(){ return elemento(); }, createTextNode(){ return elemento(); },
  head: elemento(), body: elemento(), documentElement: elemento(), addEventListener(){}, removeEventListener(){},
};
const ctx = {
  console: { log(){}, warn(){}, error(){} },
  setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
  document: doc, navigator: { userAgent: 'node', language: 'es' },
  location: { href: 'https://pagasi.io/admin.html', search: '', hash: '', pathname: '/admin.html' },
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
  fetch(){ return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); },
  alert(){}, confirm(){ return true; }, prompt(){ return ''; },
  db: null, storage: null, firebase: undefined, innerWidth: 1440, innerHeight: 900, PG: {},
};
ctx.MutationObserver = function(){ return {observe(){}, disconnect(){}}; };
ctx.IntersectionObserver = function(){ return {observe(){}, disconnect(){}, unobserve(){}}; };
ctx.ResizeObserver = function(){ return {observe(){}, disconnect(){}}; };
ctx.addEventListener = function(){}; ctx.removeEventListener = function(){};
ctx.matchMedia = function(){ return {matches:false, addListener(){}, addEventListener(){}}; };
ctx.getComputedStyle = function(){ return {getPropertyValue(){ return ''; }}; };
ctx.scrollTo = function(){};
ctx.history = { state:null, pushState(){}, replaceState(){}, back(){} };
ctx.window = ctx;

const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
const archivos = [...html.matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m => m[1]);
vm.createContext(ctx);
vm.runInContext(archivos.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n'), ctx, { filename: 'app.js' });


const hoy = new Date();
const p2 = n => String(n).padStart(2, '0');
const esteMes = hoy.getFullYear() + '-' + p2(hoy.getMonth() + 1);
const diaDeEsteMes = esteMes + '-01';                 // siempre cae en el mes actual
const mesPasado = (() => { const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 15); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-15'; })();
ctx.S.currentUser = { uid: 'u1', nombre: 'Prueba', rol: 'Administrador' };
ctx.S.clientes = []; ctx.S.motos = []; ctx.S.concesionarios = []; ctx.S.cuentasPendientes = [];
ctx.S.creds = [{ id:'CRED-1', cli:'C1', motoId:10, estado:'activo', fecha:diaDeEsteMes, precio:1200, ini:500, fin:700, total:1100, cuotaQ:100, totalCuotas:12, plazo:6, pagado:0, mora:0 }];
ctx.S.pagos = [
  { id:'P1', cred:'CRED-1', fecha:diaDeEsteMes, monto:300, estado:'confirmado' },                 // cuota del mes
  { id:'P2', cred:'CRED-1', fecha:diaDeEsteMes, monto:500, estado:'confirmado', esInicial:true },  // inicial: no cuenta
  { id:'P3', cred:'CRED-1', fecha:mesPasado,    monto:999, estado:'confirmado' },                 // mes pasado: no cuenta
];
ctx.S.egresos = [
  { id:1, fecha:diaDeEsteMes, monto:500, origenAuto:'compra_moto', motoIdRef:10, categoria:'inventario' }, // la inicial: fuera
  { id:2, fecha:diaDeEsteMes, monto:700, origenAuto:'compra_moto', motoIdRef:10, categoria:'inventario' }, // prestado
  { id:3, fecha:diaDeEsteMes, monto:100, categoria:'sueldos' },                                            // gasto
  { id:4, fecha:mesPasado,    monto:5000, categoria:'sueldos' },                                           // mes pasado
  { id:5, fecha:diaDeEsteMes, monto:800, categoria:'sueldos', eliminado:true },                            // borrado
];
ctx.S.page = 'dash';
const h = String(ctx.PG.dash());
const i = h.indexOf('>Flujo de caja<');
const card = i > -1 ? h.slice(i, i + 2600) : '';
// Las tarjetas de arriba marcan sus numeros con data-kpi (diseno del 17-sep)
const kpi = (txt, k) => { const m = txt.match(new RegExp('data-kpi="' + k + '">([^<]+)<')); return m ? m[1] : null; };
ok('la tarjeta ahora se llama "Flujo de caja" (ya no "Utilidad")', i > -1 && h.indexOf('Ingresos menos Egresos') === -1);
ok('flujo = 300 cobrado − 700 prestado − 100 gastos = −500', kpi(card, 'flujo') === '−$500');
ok('cuotas cobradas del mes: +300 (sin la inicial ni el mes pasado)', kpi(card, 'flujo-cuotas') === '+$300');
ok('prestado en motos: 700 (sin los 500 de la inicial)', kpi(card, 'flujo-prestado') === '−$700');
ok('otros gastos: 100 (sin los 5.000 del mes pasado ni el borrado)', kpi(card, 'flujo-gastos') === '−$100');
ok('negativo en rojo', card.indexOf('style="color:var(--red)" data-kpi="flujo"') > -1);

// Un mes donde se cobra más de lo que se presta: sale en verde
ctx.S.pagos.push({ id:'P4', cred:'CRED-1', fecha:diaDeEsteMes, monto:1000, estado:'confirmado' });
const h2 = String(ctx.PG.dash());
const c2 = h2.slice(h2.indexOf('>Flujo de caja<'), h2.indexOf('>Flujo de caja<') + 2600);
ok('con 1.300 cobrados el flujo es +500 y sale en verde', kpi(c2, 'flujo') === '$500' && c2.indexOf('style="color:var(--green)" data-kpi="flujo"') > -1);

// Sin gastos no aparece la fila de "Otros gastos" (la tarjeta queda limpia)
ctx.S.egresos = ctx.S.egresos.filter(e => e.categoria !== 'sueldos');
const h3 = String(ctx.PG.dash());
const c3 = h3.slice(h3.indexOf('>Flujo de caja<'), h3.indexOf('>Flujo de caja<') + 2600);
ok('sin gastos del mes, no se muestra la fila de otros gastos', kpi(c3, 'flujo-gastos') === null);

// La tarjeta de mora: el vencido y el reparto, como Cobranza
ok('la tarjeta de mora pinta el vencido', /data-kpi="mora-vencido">\$[\d.]+ vencido</.test(h3));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
