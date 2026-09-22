// 22-sep-2026: pagasi.io pasa de PAGASI 18 a PAGASI 26. El app guarda copias en la
// maquina de cada persona (motos, catalogo, plan de pago, score, tareas) y Chrome las
// guarda POR DOMINIO: los navegadores de la oficina abririan PAGASI 26 con el
// inventario y el plan de pago de PAGASI 18 dentro. Y en las motos la copia local le
// GANA a la base (mergeMotosPreferLocal), asi que no se ve el error: se ve una moto
// con el VIN de otra.
// Ahora la libreta queda marcada con el proyecto de Firebase y, si no es el de esta
// compania, se bota lo que es copia de la base. Lo de la persona no se toca.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function memoriaFalsa(inicial) {
  const datos = Object.assign({}, inicial || {});
  return {
    get length(){ return Object.keys(datos).length; },
    key(i){ return Object.keys(datos)[i] == null ? null : Object.keys(datos)[i]; },
    getItem(k){ return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; },
    setItem(k, v){ datos[k] = String(v); },
    removeItem(k){ delete datos[k]; },
    _todo(){ return datos; }
  };
}

// Solo el bloque de la memoria: se saca del archivo tal cual esta y se corre aparte.
const fuente = fs.readFileSync(path.join(ROOT, 'assets', 'pagasi-app.js'), 'utf8');
const desde = fuente.indexOf("var _MEM_MARCA = 'pagasi_empresa_memoria';");
const hasta = fuente.indexOf('// Que no pase callado', desde);
ok('el bloque de la memoria sigue en su sitio', desde > -1 && hasta > desde);
const bloque = fuente.slice(desde, hasta);

function abrirApp(projectId, memoria) {
  const ctx = { console: { log(){}, warn(){}, error(){} }, localStorage: memoria,
    FIREBASE_CONFIG: { projectId: projectId }, setTimeout(){ return 0; } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(bloque, ctx, { filename: 'memoria.js' });
  return ctx;
}

// Lo que un navegador de la oficina tiene despues de un dia en PAGASI 18
const comoQuedaLaOficina = () => ({
  'pagasi_empresa_memoria': 'pagasi-v2',
  'pagasi_motos_cache_v1': '[{"id":45,"modelo":"EK XPRESS 150","vin":"VIN-DE-18"}]',
  'pagasi_catalogo_config': '[{"id":1,"modelo":"NEW HORSE 150","precio":1320}]',
  'pagasi_catalogo_ver': '3',
  'pagasi_config_plan': '{"factor":1.55,"inicial":0.35}',
  'pagasi_config_score': '{"umbrales":{"aprobar":70}}',
  'pagasi_planes_extra': '[{"nombre":"Plan 18"}]',
  'pagasi_inv_oficina': '[{"id":99}]',
  'concesionarioActivo': 'CO-18',
  'pagasi_workcenter_tasks_v3': '[{"id":"WT-1"}]',
  'pagasi_notif_historial_v1': '[{"txt":"cobro de 18"}]',
  'libroSeniatCfg_v1': '{"ivaAlicuota":16}',
  'motosCache': '[]', 'motosCacheV2': '[]',
  'pagasi_mora_alert_2026-09-22': '1',
  'pgsDaily_cuotas_2026-09-22': '[]',
  'pgsPushLog_2026-09-22': '[]',
  '_perfilNagDismissed_u1_2026-09-22': '1',
  // de la persona y del equipo, no de la compania:
  'pagasi_theme': 'dark',
  'pgsPushEnabled': '1',
  'pagasi_cli_docs_CLI-88': '[{"id":"cedula","url":"data:...","source":"local"}]'
});

// ── 1. El caso de esta noche: el dominio cambia de compania ───────────────────
let mem = memoriaFalsa(comoQuedaLaOficina());
let ctx = abrirApp('pagasi-26', mem);
ok('se da cuenta de que la libreta era de otra compañía', !!ctx._memLimpiadaDe);
ok('...y dice de cuál venía y cuántas cosas botó',
  ctx._memLimpiadaDe.antes === 'pagasi-v2' && ctx._memLimpiadaDe.ahora === 'pagasi-26' && ctx._memLimpiadaDe.llaves > 10);
ok('el inventario de PAGASI 18 ya no está', mem.getItem('pagasi_motos_cache_v1') === null);
ok('...ni el catálogo', mem.getItem('pagasi_catalogo_config') === null && mem.getItem('pagasi_catalogo_ver') === null);
ok('...ni el plan de pago, que es el que calcula las cuotas', mem.getItem('pagasi_config_plan') === null);
ok('...ni el score', mem.getItem('pagasi_config_score') === null);
ok('...ni los planes extra, el inventario de oficina ni el concesionario activo',
  mem.getItem('pagasi_planes_extra') === null && mem.getItem('pagasi_inv_oficina') === null && mem.getItem('concesionarioActivo') === null);
ok('...ni las tareas ni el historial de avisos',
  mem.getItem('pagasi_workcenter_tasks_v3') === null && mem.getItem('pagasi_notif_historial_v1') === null);
ok('...ni la configuración de IVA/IGTF, que es de cada compañía', mem.getItem('libroSeniatCfg_v1') === null);
ok('...ni los cachés viejos de motos', mem.getItem('motosCache') === null && mem.getItem('motosCacheV2') === null);
ok('...ni los avisos del día, que llevan la fecha pegada',
  mem.getItem('pagasi_mora_alert_2026-09-22') === null && mem.getItem('pgsDaily_cuotas_2026-09-22') === null
  && mem.getItem('pgsPushLog_2026-09-22') === null && mem.getItem('_perfilNagDismissed_u1_2026-09-22') === null);
ok('PERO el tema de la persona se queda', mem.getItem('pagasi_theme') === 'dark');
ok('...los permisos de notificaciones también', mem.getItem('pgsPushEnabled') === '1');
ok('...y los documentos que adjuntó y no ha subido NO se pierden',
  String(mem.getItem('pagasi_cli_docs_CLI-88') || '').indexOf('data:') > -1);
ok('la libreta queda marcada con la compañía nueva', mem.getItem('pagasi_empresa_memoria') === 'pagasi-26');

// ── 2. Abrir otra vez la misma compañía no borra nada ─────────────────────────
mem.setItem('pagasi_motos_cache_v1', '[{"id":7}]');
ctx = abrirApp('pagasi-26', mem);
ok('la segunda vez no toca nada', !ctx._memLimpiadaDe && mem.getItem('pagasi_motos_cache_v1') === '[{"id":7}]');

// ── 3. Y si se vuelve atrás, se limpia igual ──────────────────────────────────
ctx = abrirApp('pagasi-v2', mem);
ok('volver a la compañía vieja también limpia', !!ctx._memLimpiadaDe && mem.getItem('pagasi_motos_cache_v1') === null);
ok('...y vuelve a marcar', mem.getItem('pagasi_empresa_memoria') === 'pagasi-v2');

// ── 4. Un navegador que nunca abrió el sistema no molesta ─────────────────────
mem = memoriaFalsa({});
ctx = abrirApp('pagasi-26', mem);
ok('navegador nuevo: no avisa de nada', !ctx._memLimpiadaDe);
ok('...pero queda marcado', mem.getItem('pagasi_empresa_memoria') === 'pagasi-26');

// ── 5. Libreta vieja sin marca (nadie abrió el sistema después del cambio) ────
mem = memoriaFalsa({ 'pagasi_motos_cache_v1': '[{"id":45}]', 'pagasi_theme': 'light' });
ctx = abrirApp('pagasi-26', mem);
ok('sin marca se limpia igual, que es lo seguro', mem.getItem('pagasi_motos_cache_v1') === null);
ok('...se dice que no había marca', ctx._memLimpiadaDe && ctx._memLimpiadaDe.antes === '(sin marca)');
ok('...y el tema se respeta', mem.getItem('pagasi_theme') === 'light');

// ── 6. Sin proyecto no se borra nada (por si algo falla al cargar) ────────────
mem = memoriaFalsa(comoQuedaLaOficina());
ctx = abrirApp('', mem);
ok('sin proyecto configurado no se toca la libreta',
  mem.getItem('pagasi_motos_cache_v1') !== null && !ctx._memLimpiadaDe);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
