// 21-nov-2026, Adam: "quedó brutal pero quiero los charts interactivos como el dashboard… dale sin parar".
// Los gráficos de «PAGASI 18 + 26» (modules/grupo-graficos.js) son de Chart.js, como los del Dashboard:
//  1. Cada gráfico se crea con lo que manda el servidor y suma exactamente esos números.
//  2. Los botones Día / Quinc. / Mes (y Las dos / 18 / 26, Créditos / Monto, Este mes / Siempre)
//     cambian solo su tarjeta, y el gráfico viejo se destruye antes de crear el nuevo.
//  3. El globito dice de qué día, quincena o mes es cada barra y cuánto pone cada compañía.
//  4. Sin Chart.js no se rompe nada, y en modo oscuro el globito va oscuro.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
process.on('unhandledRejection', e => { fail++; console.log('FALLA promesa rechazada: ' + (e && e.message)); });
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

const { grupoResumen, grupoSumar } = require('../logic/grupo-resumen');
const ledger = require('../logic/credito-ledger');
const p2 = n => String(n).padStart(2, '0');
const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
const HOY = dia(0);
const r2 = v => Math.round(v * 100) / 100;
const suma = l => r2(l.reduce((a, v) => a + (+v || 0), 0));

// ── Dos carteras de prueba repartidas en los últimos 200 días ──
function cartera(emp, n, concs, modelos){
  const creds = [], pagos = [];
  for (let i = 0; i < n; i++) {
    const d = -((i * 7 + (emp === '26' ? 3 : 0)) % 200), id = emp + '-C' + i;
    creds.push({ id, cli: 'CLIENTE ' + id, estado: 'activo', fecha: dia(d), total: 1440, cuotaQ: 80, totalCuotas: 18, plazo: 9, precio: 1400, ini: 600, fin: 800,
      concesionarioId: concs[i % concs.length], modelo: modelos[i % modelos.length], creado: dia(d) + 'T' + p2(9 + i % 9) + ':15:00.000Z' });
    pagos.push({ id: 'PI' + id, cred: id, monto: 600, fecha: dia(d), estado: 'confirmado', esInicial: true, metodo: i % 2 ? 'Inicial en concesionario' : 'EFECTIVO' });
    for (let k = 1; k <= 12 && d + k * 15 <= 0; k++) {
      if ((i + k) % 5 === 0) continue;                                  // algunas cuotas sin pagar: hay mora
      const f = Math.min(0, d + k * 15 + ((i + k) % 3 === 0 ? 4 : 0));  // algunas pagadas tarde
      pagos.push({ id: 'P' + id + '-' + k, cred: id, monto: 80, fecha: dia(f), estado: 'confirmado', metodo: ['100% Banco', 'Binance', 'Zelle', 'EFECTIVO'][(i + k) % 4] });
    }
  }
  return { creds, pagos };
}
const C18 = cartera('18', 40, ['CONC-1', 'CONC-2', 'CONC-3'], ['OWEN 200S', 'RK 200', 'TX 250 GS']);
const C26 = cartera('26', 55, ['CONC-1', 'CONC-4'], ['OWEN 200S', 'EK XPRESS', 'RK 200', 'BR200']);
const A = Object.assign({ nombre: 'PAGASI 18' }, grupoResumen(C18.creds, C18.pagos, { hoy: HOY, ledger, concesionarios: [{ id: 'CONC-1', nombre: 'EMPIRE Bello Monte' }, { id: 'CONC-2', nombre: 'Motos TORO' }, { id: 'CONC-3', nombre: 'HAOJIN' }] }));
const B = Object.assign({ nombre: 'PAGASI 26' }, grupoResumen(C26.creds, C26.pagos, { hoy: HOY, ledger, concesionarios: [{ id: 'CONC-1', nombre: 'EMPIRE BELLO MONTE' }, { id: 'CONC-4', nombre: 'VELOZ CHACAO' }] }));
const J = grupoSumar([A, B]);
const DATOS = { hoy: HOY, calculado: new Date().toISOString(), empresas: { '18': A, '26': B }, juntas: J };

// ── Un Chart.js de mentira que anota lo que se le pide ──
let creados = [], destruidos = 0;
function ChartFalso(lienzo, config){ this.lienzo = lienzo; this.config = config; this.vivo = true; this.destroy = () => { if (this.vivo) { destruidos++; this.vivo = false; } }; creados.push(this); }
ctx.Chart = ChartFalso;
let pantalla = '', reemplazos = [], tema = 'light';
const lienzos = {};
ctx.document.getElementById = id => {
  if (/^g2c-/.test(id) && (pantalla + reemplazos.join('')).indexOf('id="' + id + '"') > -1) {
    return lienzos[id] || (lienzos[id] = { id, parentElement: { hijos: [], querySelector(){ return null; }, appendChild(x){ this.hijos.push(x); } } });
  }
  return null;
};
ctx.document.querySelector = sel => { const m = /data-g2-sec="([^"]+)"/.exec(sel); return m ? { set outerHTML(h){ reemplazos.push(h); }, get outerHTML(){ return ''; } } : null; };
ctx.document.createElement = () => ({ className: '', textContent: '' });
ctx.document.documentElement = { getAttribute: k => k === 'data-theme' ? tema : null };
vm.runInContext('S.page = "grupo"; S.currentUser = { uid: "u1", nombre: "Adam", rol: "Administrador", permisos: [] };', ctx);
ctx._grupo.datos = JSON.parse(JSON.stringify(DATOS));
pantalla = vm.runInContext('_grupoHtml()', ctx);
const vivos = () => creados.filter(c => c.vivo);
const de = clave => vivos().find(c => c.lienzo.id === 'g2c-' + clave);
const datos = (c, i) => c.config.data.datasets[i].data;
const cb = (c, nombre, it) => c.config.options.plugins.tooltip.callbacks[nombre](it);

// ══ 1. Se crean los gráficos con los números del servidor ══
ctx.grupoGraficos({});
ok('se crean los 8 gráficos: lo cobrado, motos vendidas, cuotas a tiempo, formas de pago, mora por días, mora por mes de venta, concesionarios y modelos', vivos().length === 8 && ['cobro', 'ventas', 'puntual', 'metodos', 'mora', 'cosechas', 'conc', 'modelo'].every(k => !!de(k)));
ok('...de barras como el Dashboard (la mora por días, los concesionarios y los modelos, acostadas) y una torta para las formas de pago', de('cobro').config.type === 'bar' && de('metodos').config.type === 'doughnut' && ['mora', 'conc', 'modelo'].every(k => de(k).config.options.indexAxis === 'y') && de('ventas').config.options.indexAxis === 'x');
ok('las barras acostadas buscan la fila por la altura del mouse (axis «y»); las paradas, por el ancho (revisión 21-nov: el globito caía en otra fila)', ['mora', 'conc', 'modelo'].every(k => de(k).config.options.interaction.axis === 'y') && ['cobro', 'ventas', 'puntual', 'cosechas'].every(k => de(k).config.options.interaction.axis === 'x'));
ok('cada gráfico tiene nombre para el lector de pantalla', ['cobro', 'ventas', 'puntual', 'metodos', 'mora', 'cosechas', 'conc', 'modelo'].every(k => new RegExp('<canvas id="g2c-' + k + '" role="img" aria-label="Gráfico de [^"]+"').test(pantalla)));
ok('al salir del módulo (nav a otra página) se destruyen sus gráficos y los de la AI', /if\(S\.page !== p\)\{ if\(S\.page==='grupo' && typeof grupoGraficosFuera==='function'\) grupoGraficosFuera\(\); if\(S\.page==='ai' && typeof aiGraficosFuera==='function'\) aiGraficosFuera\(\); \}/.test(fs.readFileSync(path.join(ROOT, 'assets/pagasi-app.js'), 'utf8')));
ok('al tocar un botón, el foco vuelve al botón marcado de ese control (la tarjeta se reemplaza entera)', /btn\.focus\(\{ preventScroll: true \}\)/.test(fs.readFileSync(path.join(ROOT, 'modules/grupo-graficos.js'), 'utf8')));
ok('«Cómo se pagan las cuotas» el día 1: el mes de hoy todavía no tiene cuotas vencidas y el número grande es el del mes anterior, no «0%»', (() => {
  const vacio = { cuotas: 0, monto: 0, aTiempo: 0, tarde: 0, sinPagar: 0 };
  const pun = [Object.assign({ mes: '2026-10' }, vacio, { cuotas: 4, monto: 100, aTiempo: 90, tarde: 10 }), Object.assign({ mes: '2026-11' }, vacio)];
  const a2 = Object.assign({}, A, { puntualidad: pun }), b2 = Object.assign({}, B, { puntualidad: pun }), j2 = Object.assign({}, DATOS.juntas, { puntualidad: pun });
  const viejo = vm.runInContext('_g2Vista.puntual', ctx); vm.runInContext('_g2Vista.puntual = "mensual"; _g2Vista.puntualEmp = "juntas";', ctx);
  const h = vm.runInContext('_g2Puntualidad', ctx)(a2, b2, j2);
  vm.runInContext('_g2Vista.puntual = ' + JSON.stringify(viejo), ctx);
  return /90% a tiempo/.test(h) && /en octubre/.test(h) && !/>0% a tiempo/.test(h);
})());
const desde = vm.runInContext('_g2Desde', ctx)(A, B);
const totMes = x => (+x.cuotas || 0) + (+x.iniciales || 0);
ok('lo cobrado empieza por Mes: una barra por mes desde el primero con datos, 18 abajo y 26 arriba', de('cobro').config.data.labels.length === A.meses.length - desde && suma(datos(de('cobro'), 0)) === suma(A.meses.slice(desde).map(totMes)) && suma(datos(de('cobro'), 1)) === suma(B.meses.slice(desde).map(totMes)) && de('cobro').config.data.datasets[0].label === 'PAGASI 18');
ok('...apiladas, con el dinero en el eje como el Dashboard ($1,2k, $84k)', de('cobro').config.options.scales.y.stacked === true && de('cobro').config.options.scales.x.stacked === true && de('cobro').config.options.scales.y.ticks.callback(84000) === '$84k' && de('cobro').config.options.scales.y.ticks.callback(1200) === '$1,2k');
const ultimo = n => [{ dataIndex: n - 1 }];
ok('el globito dice el mes y que el último va hasta hoy, cuánto pone cada compañía y lo de las dos juntas', (() => { const c = de('cobro'), n = c.config.data.labels.length; return /\(hasta hoy\)$/.test(cb(c, 'title', ultimo(n))) && cb(c, 'label', { dataset: { label: 'PAGASI 18' }, raw: 1234.5 }) === ' PAGASI 18: $1.235' && /^Juntas: \$/.test(cb(c, 'footer', ultimo(n))[0]) && /^Cuotas \$[\d.]+ · iniciales \$[\d.]+$/.test(cb(c, 'footer', ultimo(n))[1]); })());
ok('motos vendidas empieza por Día (como «Créditos» del Dashboard): los últimos 30 días', de('ventas').config.data.labels.length === 30 && suma(datos(de('ventas'), 0).concat(datos(de('ventas'), 1))) === suma(J.dias.slice(-30).map(x => x.ventas)) && de('ventas').config.data.labels[29] === (+HOY.slice(8, 10)) + '/' + (+HOY.slice(5, 7)));
ok('...y su globito dice las motos de cada una y lo financiado', /^Juntas: \d+ motos? · \$[\d.]+ financiado$/.test(cb(de('ventas'), 'footer', ultimo(30))) && cb(de('ventas'), 'label', { dataset: { label: 'PAGASI 26' }, raw: 1 }) === ' PAGASI 26: 1 moto');
const pct = (x, k) => x.monto > 0 ? Math.round(x[k] * 100 / x.monto) : 0;
ok('cuotas a tiempo: por mes, tres partes (a tiempo, tarde y sin pagar) que suman lo que venció', de('puntual').config.data.labels.length === J.puntualidad.length && de('puntual').config.data.datasets.map(d => d.label).join() === 'A tiempo,Tarde,Sin pagar' && J.puntualidad.every((x, i) => Math.abs(datos(de('puntual'), 0)[i] + datos(de('puntual'), 1)[i] + datos(de('puntual'), 2)[i] - x.monto) < 0.05));
ok('...el globito dice el porcentaje de cada parte', (() => { const i = J.puntualidad.length - 1, x = J.puntualidad[i]; return cb(de('puntual'), 'label', { dataIndex: i, raw: x.aTiempo, dataset: { label: 'A tiempo', _clave: 'aTiempo' } }) === ' A tiempo: $' + Math.round(x.aTiempo).toLocaleString('es-VE') + ' (' + pct(x, 'aTiempo') + '%)'; })());
ok('formas de pago: la torta del mes, de mayor a menor, con el porcentaje en el globito', (() => { const c = de('metodos'), v = datos(c, 0), m = J.metodos, t = Object.keys(m).reduce((a, k) => a + m[k], 0); return suma(v) === r2(t) && v.every((x, i) => i === 0 || v[i - 1] >= x) && / \(\d+(,\d)?%\)$/.test(cb(c, 'label', { label: 'Efectivo', raw: v[0] })); })());
ok('mora por días: los créditos de cada tramo, 18 y 26', datos(de('mora'), 0).join() === A.tramos.map(t => t.creditos).join() && datos(de('mora'), 1).join() === B.tramos.map(t => t.creditos).join() && de('mora').config.data.labels.length === 4);
ok('mora por mes de venta: en porcentaje, «más de 30 días» y «1 a 30 días»', de('cosechas').config.data.datasets.map(d => d.label).join() === 'Más de 30 días,1 a 30 días' && de('cosechas').config.options.scales.y.ticks.callback(20) === '20%');
const rank = vm.runInContext('_g2RankingFilas', ctx);
ok('concesionarios: los que más venden, juntando la misma sede de las dos compañías por su clave', (() => { const f = rank(A, B, 'conc'), c = de('conc'); return c.config.data.labels.length === f.length && f[0].clave === 'CONC-1' && f[0].total === A.concesionarios.find(x => x.conc === 'CONC-1').vendidos + B.concesionarios.find(x => x.conc === 'CONC-1').vendidos && f[0].nombre === 'EMPIRE BELLO MONTE'; })());
ok('...y su globito dice la mora de los que siguen pagando', (() => { const c = de('conc'), l = cb(c, 'footer', [{ dataIndex: 0 }]); return Array.isArray(l) && /^Juntas: \d+ desde el principio$/.test(l[0]) && /^\d+% en mora \(\d+ de \d+ que siguen pagando\)$/.test(l[1]); })());
ok('modelos: escritos igual en las dos compañías se juntan', rank(A, B, 'modelo').find(f => f.clave === 'OWEN 200S').total === A.modelos.find(x => x.modelo === 'OWEN 200S').vendidos + B.modelos.find(x => x.modelo === 'OWEN 200S').vendidos);

// ══ 2. Los botones ══
const antesCobro = de('cobro');
ctx.grupoVista('cobro', 'diario');
ok('Día: el gráfico viejo se destruye y el nuevo trae los últimos 30 días', antesCobro.vivo === false && de('cobro') !== antesCobro && de('cobro').config.data.labels.length === 30 && suma(datos(de('cobro'), 0)) === suma(A.dias.slice(-30).map(totMes)) && suma(datos(de('cobro'), 1)) === suma(B.dias.slice(-30).map(totMes)));
ok('...la tarjeta se redibuja con «Día» marcado y el total de esos 30 días arriba', /<button type="button" class="on" onclick="grupoVista\('cobro','diario'\)">Día<\/button>/.test(reemplazos[reemplazos.length - 1]) && new RegExp('data-g2="cobro-big">\\$' + Math.round(suma(J.dias.slice(-30).map(totMes))).toLocaleString('es-VE').replace(/\./g, '\\.') + '<').test(reemplazos[reemplazos.length - 1]) && /Últimos 30 días · prom\. \$[\d.]+\/día/.test(reemplazos[reemplazos.length - 1]));
ok('...y el globito dice el día de la semana', /^(dom|lun|mar|mié|jue|vie|sáb) \d+ de [a-z]+ \(hasta hoy\)$/.test(cb(de('cobro'), 'title', ultimo(30))));
ctx.grupoVista('cobro', 'quincenal');
const quinc = iso => iso.slice(0, 7) + '-' + (+iso.slice(8, 10) <= 15 ? '1' : '2');
const ultimasQ = [...new Set(A.diasLargo.map(x => quinc(x.dia)))].slice(-8);
ok('Quinc.: las últimas 8 quincenas, cada una con la suma de sus días (como «11/Q2» en el Dashboard)', de('cobro').config.data.labels.length === 8 && de('cobro').config.data.labels[7] === (+HOY.slice(5, 7)) + '/Q' + (+HOY.slice(8, 10) <= 15 ? 1 : 2) && suma(datos(de('cobro'), 0)) === suma(A.diasLargo.filter(x => ultimasQ.includes(quinc(x.dia))).map(totMes)) && /^(1ª|2ª) quincena de [a-z]+ \d{4} \(hasta hoy\)$/.test(cb(de('cobro'), 'title', ultimo(8))));
ok('...las 8 quincenas están completas en los 135 días que manda el servidor («diasLargo»)', A.diasLargo.filter(x => quinc(x.dia) === ultimasQ[0])[0].dia.slice(8, 10) === (ultimasQ[0].slice(-1) === '1' ? '01' : '16'));
ctx.grupoVista('ventas', 'mensual');
ok('motos vendidas por Mes: las del mes de cada crédito', suma(datos(de('ventas'), 0)) === suma(A.meses.slice(desde).map(x => x.ventas)) && suma(datos(de('ventas'), 1)) === suma(B.meses.slice(desde).map(x => x.ventas)));
ctx.grupoVista('puntual', 'quincenal');
ok('cuotas a tiempo por quincena: las 8 quincenas del servidor', de('puntual').config.data.labels.length === 8 && J.puntualidadQ.every((x, i) => Math.abs(datos(de('puntual'), 0)[i] - x.aTiempo) < 0.01));
ctx.grupoVista('puntualEmp', '18');
ok('...y solo la 18 con su botón', A.puntualidadQ.every((x, i) => Math.abs(datos(de('puntual'), 0)[i] - x.aTiempo) < 0.01) && /class="on" onclick="grupoVista\('puntualEmp','18'\)">18</.test(reemplazos[reemplazos.length - 1]) && /Las cuotas que vencieron, PAGASI 18/.test(reemplazos[reemplazos.length - 1]));
ctx.grupoVista('metodos', 'hoy');
ok('formas de pago de hoy', (() => { const c = de('metodos'); const t = Object.keys(J.metodosPor.hoy).reduce((a, k) => a + J.metodosPor.hoy[k], 0); return t > 0 ? !!c && suma(datos(c, 0)) === r2(t) : !c && /Todavía no hay cobros hoy/.test(reemplazos[reemplazos.length - 1]); })());
ctx.grupoVista('metodos', 'semana');
ok('...y de los últimos 7 días', suma(datos(de('metodos'), 0)) === r2(Object.keys(J.metodosPor.semana).reduce((a, k) => a + J.metodosPor.semana[k], 0)) && /Lo cobrado los últimos 7 días por forma de pago/.test(reemplazos[reemplazos.length - 1]));
ctx.grupoVista('mora', 'monto');
ok('mora por días en dinero (botón Monto)', datos(de('mora'), 0).join() === A.tramos.map(t => r2(t.vencido)).join() && de('mora').config.options.scales.x.ticks.callback(1500) === '$1,5k');
ctx.grupoVista('cosechasEmp', '26');
ok('mora por mes de venta, solo la 26', (() => { const l = vm.runInContext('_g2CosechasLista', ctx)(A, B, J, desde); return de('cosechas').config.data.labels.length === l.length && l.every((x, i) => Math.abs(datos(de('cosechas'), 0)[i] - (x.vendidos ? Math.round(x.mas30 * 1000 / x.vendidos) / 10 : 0)) < 0.001) && l[0] === B.cosechas[B.cosechas.indexOf(l[0])]; })());
ctx.grupoVista('conc', 'mes');
ok('concesionarios de este mes: solo los que vendieron este mes', (() => { const f = rank(A, B, 'conc'); return f.every(x => x.total > 0) && f.reduce((a, x) => a + x.total, 0) === [].concat(A.concesionarios, B.concesionarios).reduce((a, x) => a + x.mes, 0) && (!f.length ? !de('conc') : de('conc').config.data.labels.length === f.length); })());
const nAntes = creados.length;
ctx.grupoVista('noexiste', 'x');
ok('un botón que no existe no hace nada', creados.length === nAntes);

// ══ 3. Redibujos, sin Chart.js y modo oscuro ══
const vivosAntes = vivos().length;
ctx.grupoGraficos({ sinAnimar: true });
ok('al redibujar la pantalla se destruyen todos los anteriores: nunca quedan dos del mismo', vivos().length === vivosAntes && new Set(vivos().map(c => c.lienzo.id)).size === vivos().length);
ok('...y en un redibujo automático no hay animación', vivos().every(c => c.config.options.animation === false));
ctx.grupoGraficosFuera();
ok('al salir del módulo se destruyen todos', vivos().length === 0);
delete ctx.Chart;
let roto = null; try { ctx.grupoGraficos({}); } catch (e) { roto = e; }
ok('sin Chart.js (no cargó) no se rompe nada y se avisa en el lugar del gráfico', !roto && lienzos['g2c-ventas'].parentElement.hijos.some(x => /No se pudo cargar el gráfico/.test(x.textContent)));
ctx.Chart = ChartFalso; tema = 'dark';
ctx.grupoGraficos({});
ok('en modo oscuro el globito va oscuro, como en el Dashboard', de('cobro').config.options.plugins.tooltip.backgroundColor === '#252844' && de('metodos').config.options.plugins.tooltip.backgroundColor === '#252844');
tema = 'light';
ctx._grupo.datos = null;
const nSin = creados.length; ctx.grupoGraficos({});
ok('sin números todavía no se dibuja nada', creados.length === nSin);

// ══ 4. Dónde se llama ══
const srcG = src('modules/grupo.js');
ok('al entrar al módulo y al llegar los números se dibujan los gráficos', /setTimeout\(function\(\)\{ if\(S\.page === 'grupo'\) grupoGraficos\(\{ sinAnimar: rt \}\); \}, 0\)/.test(srcG) && /if\(c && typeof grupoGraficos === 'function'\) grupoGraficos\(/.test(srcG));
ok('al cambiar a modo oscuro se vuelven a dibujar (si se está en el módulo)', /S\.page===?'grupo'\) grupoGraficos\(/.test(src('logic/charts.js')));
ok('la página carga el archivo de los gráficos después del módulo', /modules\/grupo\.js\?v=[^"]+"><\/script>\n<script charset="utf-8" src="modules\/grupo-graficos\.js\?v=/.test(src('admin.html')));
ok('los botones usan el mismo control del Dashboard (.dash-seg)', /class="dash-seg" data-g2-seg=/.test(vm.runInContext('_g2Seg("cobro", [["diario","Día"]], "diario")', ctx)));

console.log('\n' + pass + ' OK · ' + fail + ' fallas');
process.exit(fail ? 1 : 0);
