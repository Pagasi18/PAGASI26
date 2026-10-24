// 14-oct-2026, Adam: "un modelo de métricas para ver quiénes entran a la página web y cómo es
// su comportamiento". Se prueba el medidor de la página pública (anónimo, sin robots ni
// personal, qué manda) y el resumen del módulo Métricas web.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── 1. El medidor de la página pública ──
function pagina(opts){
  const enviados = [], escuchas = {}, almacen = { local: Object.assign({}, opts.local || {}), sesion: Object.assign({}, opts.sesion || {}) };
  const mk = m => ({ getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } });
  const ctx = {
    console: { log(){}, warn(){} }, Math, Date, JSON, Promise, URL, URLSearchParams, String, Number, Object, Array, encodeURIComponent, decodeURIComponent,
    navigator: { userAgent: opts.ua || 'Mozilla/5.0 (iPhone) Mobile Safari', webdriver: !!opts.webdriver },
    location: { hostname: opts.host || 'pagasi.io', pathname: opts.path || '/simulador.html', search: opts.search || '' },
    localStorage: mk(almacen.local), sessionStorage: mk(almacen.sesion),
    document: { referrer: opts.ref || '', addEventListener: (t, f) => { (escuchas[t] = escuchas[t] || []).push(f); } },
    addEventListener: (t, f) => { (escuchas['w:' + t] = escuchas['w:' + t] || []).push(f); },
    fetch: (url, o) => { enviados.push({ url, cuerpo: JSON.parse(o.body) }); return Promise.resolve({ ok: true }); },
    CustomEvent: function(t, o){ this.type = t; this.detail = o && o.detail; }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src('assets/public/catalog.js').replace("typeof module==='object' && module.exports", 'false'), ctx);
  vm.runInContext(src('assets/public/metricas.js'), ctx);
  return { ctx, enviados, escuchas, almacen, esperar: () => new Promise(r => setTimeout(r, 20)) };
}
const campo = (w, k) => { const f = w.update.fields[k]; return f && (f.stringValue != null ? f.stringValue : +f.integerValue); };

(async () => {
  let p = pagina({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram 300.0', search: '?moto=47' });
  await p.esperar();
  ok('una visita desde el navegador de Instagram se cuenta como Instagram', p.enviados.length === 1 && campo(p.enviados[0].cuerpo.writes[0], 'fuente') === 'instagram');
  const w0 = p.enviados[0].cuerpo.writes[0];
  ok('la primera escritura crea la visita, con la moto que abrió y desde teléfono', w0.currentDocument.exists === false && campo(w0, 'disp') === 'telefono' && campo(w0, 'entrada') === 'simulador'
    && w0.update.fields.ev.arrayValue.values[0].mapValue.fields.m.integerValue === '47');
  ok('va a la base de la compañía que sirve la página, con documento por visita', /projects\/(pagasi-v2|pagasi26-65ced)\/databases\/\(default\)\/documents:commit\?key=/.test(p.enviados[0].url) && /\/metricas\/s[0-9a-z]{14}$/.test(w0.update.name));
  ok('nada personal: solo los campos de la visita', Object.keys(w0.update.fields).sort().join() === 'campana,disp,entrada,ev,fecha,fuente,hora,inicio,medio,n,ultima,v,vid');
  p.escuchas.click[0]({ target: { closest: () => ({ getAttribute: k => (k === 'href' ? 'https://wa.me/584242177798?text=Hola%2C%20quiero%20el%20precio' : null), matches: () => false }) } });
  await p.esperar();
  const w1 = p.enviados[1] && p.enviados[1].cuerpo.writes[0];
  ok('el clic en WhatsApp agrega un evento a la misma visita (no crea otra)', w1 && w1.currentDocument.exists === true && w1.updateTransforms[0].appendMissingElements.values[0].mapValue.fields.t.stringValue === 'whatsapp' && w1.update.name === w0.update.name);
  p.escuchas['w:pagasi:metrica'][0]({ detail: { t: 'solicitud_enviada' } });
  await p.esperar();
  ok('la solicitud web avisa cuando llega la parte 1', p.enviados.length === 3 && p.enviados[2].cuerpo.writes[0].updateTransforms[0].appendMissingElements.values[0].mapValue.fields.t.stringValue === 'solicitud_enviada');

  p = pagina({ ref: 'https://www.google.com/', ua: 'Mozilla/5.0 (Macintosh) Safari', path: '/' });
  await p.esperar();
  ok('desde Google en computadora', campo(p.enviados[0].cuerpo.writes[0], 'fuente') === 'google' && campo(p.enviados[0].cuerpo.writes[0], 'disp') === 'computadora' && campo(p.enviados[0].cuerpo.writes[0], 'entrada') === 'index');
  p = pagina({ search: '?utm_source=instagram&utm_medium=bio&utm_campaign=veloz' });
  await p.esperar();
  ok('los enlaces especiales (utm) mandan: fuente, medio y campaña', campo(p.enviados[0].cuerpo.writes[0], 'fuente') === 'instagram' && campo(p.enviados[0].cuerpo.writes[0], 'medio') === 'bio' && campo(p.enviados[0].cuerpo.writes[0], 'campana') === 'veloz');
  p = pagina({});
  await p.esperar();
  ok('sin referente: directo', campo(p.enviados[0].cuerpo.writes[0], 'fuente') === 'directo');
  p = pagina({ local: { pg_staff: '1' } });
  await p.esperar();
  ok('el personal de PAGASI no se cuenta', p.enviados.length === 0);
  p = pagina({ ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' });
  await p.esperar();
  ok('los robots no se cuentan', p.enviados.length === 0);
  p = pagina({ host: '127.0.0.1' });
  await p.esperar();
  ok('las pruebas en la Mac no se cuentan', p.enviados.length === 0);
  ok('el sistema marca el navegador del personal al entrar', /localStorage\.setItem\('pg_staff', '1'\)/.test(src('assets/pagasi-app.js')));
  ok('las cinco páginas públicas cargan el medidor', ['index.html', 'catalogo.html', 'simulador.html', 'nosotros.html', 'solicitar.html'].every(f => /assets\/public\/metricas\.js\?v=/.test(src(f))));

  // ── 2. El resumen del módulo ──
  const ctx2 = { console: { log(){}, warn(){} } };
  vm.createContext(ctx2);
  vm.runInContext('var S={page:""};' + src('logic/metricas.js'), ctx2);
  const E = (t, m) => ({ t, p: 'x', ts: 1, m });
  const docs = [
    { vid: 'v1', fecha: '2026-10-14', hora: 9, fuente: 'instagram', disp: 'telefono', entrada: 'index', ev: [E('vista'), E('ver_moto', 47), E('simulo', 47), E('quiero', 47), E('solicitud_inicio'), E('solicitud_enviada')] },
    { vid: 'v1', fecha: '2026-10-14', hora: 20, fuente: 'directo', disp: 'telefono', entrada: 'simulador', ev: [E('vista', 47), E('whatsapp')] },
    { vid: 'v2', fecha: '2026-10-13', hora: 9, fuente: 'google', disp: 'computadora', entrada: 'catalogo', ev: [E('vista'), E('vista'), E('ver_moto', 1)] },
    { vid: 'v3', fecha: '2026-09-01', hora: 9, fuente: 'google', disp: 'computadora', entrada: 'index', ev: [E('vista')] }
  ];
  const r = ctx2.metResumen(docs, '2026-10-08', '2026-10-14');
  ok('cuenta visitas y personas del período (deja afuera las viejas)', r.visitas === 3 && r.visitantes === 2 && r.paginas === 4);
  ok('fuentes, teléfono y horas', r.fuentes.instagram === 1 && r.fuentes.google === 1 && r.disp.telefono === 2 && r.horas[9] === 2 && r.horas[20] === 1);
  ok('motos más vistas, una vez por visita', r.motos['47'] === 2 && r.motos['1'] === 1);
  ok('embudo: visitas, miraron moto, simularon, "La quiero", empezaron y enviaron', JSON.stringify(r.embudo) === JSON.stringify({ visitas: 3, moto: 3, simulo: 1, quiero: 1, whatsapp: 1, solInicio: 1, solEnviada: 1 }));
  ok('por día: visitas y personas', r.porDia['2026-10-14'].visitas === 2 && r.porDia['2026-10-14'].visitantes === 1 && r.porDia['2026-10-13'].visitas === 1);
  ok('el período de 7 días cuenta hoy y los 6 anteriores', ctx2.metDesde(7, '2026-10-14') === '2026-10-08' && ctx2.metDesde(1, '2026-10-14') === '2026-10-14');
  ok('Métricas web está en el menú (Análisis) y en el rol Administrador', /\{id:'metricas', label:'Métricas web', grupo:'Análisis'\}/.test(src('assets/pagasi-app.js')) && /'catalogo','metricas','perm_delete'/.test(src('assets/pagasi-app.js')));

  // ── 3. Lo nuevo del 23-oct (Adam: "mejórame el módulo de métricas al 100%") ──
  p = pagina({});
  await p.esperar();
  p.ctx.document.visibilityState = 'hidden';
  (p.escuchas.visibilitychange || []).forEach(f => f());
  (p.escuchas.visibilitychange || []).forEach(f => f());
  await p.esperar();
  const sales = p.enviados.filter(x => { const t = x.cuerpo.writes[0].updateTransforms; return t && t[0].appendMissingElements.values[0].mapValue.fields.t.stringValue === 'sale'; });
  ok('al irse de la página se anota "sale" una sola vez (para el tiempo en la página)', sales.length === 1);
  ok('las cinco páginas cargan el medidor nuevo', ['index.html', 'catalogo.html', 'simulador.html', 'nosotros.html', 'solicitar.html'].every(f => /assets\/public\/metricas\.js\?v=20261023-1/.test(src(f))));

  ok('las fuentes con otro nombre se juntan: "ig" (biografía) es Instagram, "l.wl.co" es WhatsApp, "chatgptcom" es ChatGPT',
    ctx2.metFuente('ig') === 'instagram' && ctx2.metFuente('l.wl.co') === 'whatsapp' && ctx2.metFuente('chatgptcom') === 'chatgpt' && ctx2.metFuente('search.brave.com') === 'buscador'
    && ctx2.metFuente('com.linkedin.android') === 'linkedin' && ctx2.metFuente('') === 'directo' && ctx2.metFuente('bcv.org.ve') === 'bcv.org.ve');
  const T = (t, ts, m) => ({ t, p: 'x', ts, m });
  const docs3 = [
    // v1: Instagram, abre la 47, simula, toca "La quiero" y WhatsApp; 2 min en la página
    { vid: 'v1', fecha: '2026-10-20', hora: 10, fuente: 'ig', medio: 'social', disp: 'telefono', entrada: 'index', inicio: 1000, ev: [T('vista', 1000), T('ver_moto', 30000, 47), T('simulo', 60000, 47), T('quiero', 90000, 47), T('whatsapp', 121000, 47)] },
    // v1 vuelve otro día por Google y no hace nada
    { vid: 'v1', fecha: '2026-10-22', hora: 21, fuente: 'google', disp: 'telefono', entrada: 'index', inicio: 5000, ev: [T('vista', 5000)] },
    // v2: directo, mira dos páginas, envía la solicitud, campaña "veloz"
    { vid: 'v2', fecha: '2026-10-22', hora: 21, fuente: 'directo', campana: 'Veloz', disp: 'computadora', entrada: 'solicitar', inicio: 0, ev: [T('vista', 2000), T('vista', 9000), T('solicitud_inicio', 20000), T('solicitud_enviada', 62000), T('sale', 70000)] },
    // v3: hoy después de la hora de corte
    { vid: 'v3', fecha: '2026-10-22', hora: 23, fuente: 'l.wl.co', disp: 'telefono', entrada: 'simulador', inicio: 0, ev: [T('vista', 1000, 5), T('sale', 11000)] }
  ];
  const r3 = ctx2.metResumen(docs3, '2026-10-16', '2026-10-22');
  ok('contactos (WhatsApp o solicitud) y los que se fueron sin hacer nada', r3.contactos === 2 && r3.rebote === 2 && r3.visitas === 4);
  ok('tiempo típico = la mitad (mediana) de lo que duran las visitas, con "sale" incluido', r3.conTiempo === 3 && r3.tiempoTipico === 68);
  ok('"volvieron otro día" cuenta personas con visitas en dos fechas distintas', r3.volvieron === 1);
  const gf = r3.grupos.fuente;
  ok('por fuente: visitas, personas, WhatsApp, solicitudes y contacto (Instagram junta "ig")', gf.instagram.visitas === 1 && gf.instagram.whatsapp === 1 && gf.instagram.contactos === 1 && gf.directo.solEnviada === 1 && gf.whatsapp.visitas === 1 && gf.google.rebote === 1 && !('_vids' in gf.instagram) && gf.instagram.personas === 1);
  ok('por campaña: "veloz" y el enlace de la biografía (medio social)', r3.grupos.campana.veloz.visitas === 1 && r3.grupos.campana['medio: social'].visitas === 1);
  ok('por moto: la abrieron, simularon, "La quiero" y WhatsApp', JSON.stringify(r3.motosDet['47']) === JSON.stringify({ vistas: 1, simulo: 1, quiero: 1, whatsapp: 1 }) && r3.motosDet['5'].vistas === 1);
  ok('por día de la semana (22-oct-2026 es jueves) y por día con WhatsApp y solicitudes', r3.semana[4] === 3 && r3.semana[2] === 1 && r3.porDia['2026-10-22'].solicitudes === 1 && r3.porDia['2026-10-20'].whatsapp === 1);
  const corte = ctx2.metResumen(docs3, '2026-10-16', '2026-10-22', 21);
  ok('con hora de corte, el último día solo cuenta hasta esa hora ("ayer a esta hora")', corte.visitas === 3 && !corte.grupos.fuente.whatsapp);
  const P7 = ctx2.metPeriodos(7, '2026-10-30', 15), P7b = ctx2.metPeriodos(7, '2026-10-23', 15), P1 = ctx2.metPeriodos(1, '2026-10-23', 9);
  ok('el período anterior: los 7 días de antes, cortados a la misma hora; antes del 14-oct no se compara',
    P7.desde === '2026-10-24' && P7.desdeAnt === '2026-10-17' && P7.hastaAnt === '2026-10-23' && P7.horaTope === 15 && P7.comparable === true && P7b.comparable === false && P1.desdeAnt === '2026-10-22' && P1.hastaAnt === '2026-10-22' && P1.comparable);
  ok('el cambio en %: sin datos antes no se inventa', ctx2.metCambio(150, 100) === 50 && ctx2.metCambio(50, 100) === -50 && ctx2.metCambio(5, 0) === null);
  ok('el tiempo se dice en palabras', ctx2.metTiempo(45) === '45 s' && ctx2.metTiempo(150) === '2 min 30 s' && ctx2.metTiempo(120) === '2 min');
  const muchas = [];
  for (let i = 0; i < 60; i++) muchas.push({ vid: 'a' + i, fecha: '2026-10-22', hora: 20, fuente: 'google', disp: 'telefono', entrada: 'index', ev: [T('vista', 1, 47)].concat(i < 30 ? [T('ver_moto', 2, 47)] : []) });
  for (let i = 0; i < 25; i++) muchas.push({ vid: 'b' + i, fecha: '2026-10-22', hora: 9, fuente: 'instagram', disp: 'telefono', entrada: 'index', ev: [T('vista', 1, 47), T('whatsapp', 2, 47)] });
  const ideas = ctx2.metIdeas(ctx2.metResumen(muchas, '2026-10-22', '2026-10-22')).join(' | ');
  ok('lo más importante: de dónde llega la mayoría, la fuente que más escribe, dónde se pierde gente y la moto más vista',
    /mayoría llega por <b>Google<\/b>, 71%/.test(ideas) && /más escriben vienen de <b>Instagram<\/b>: 100%/.test(ideas) && /se pierde: de <b>mirar una moto<\/b> a <b>usar el simulador<\/b>/.test(ideas) && /más vista: <b>Moto 47<\/b> \(85 visitas\)/.test(ideas) && /hora con más visitas: <b>8 pm<\/b>/.test(ideas));

  // La pantalla, en un VM limpio (si falta una función, revienta como en el navegador)
  // 23-oct-2026, Adam: "quiero que se vean como las del dashboard… pon algunos redondos"
  const graficos = [], esperando = [];
  const ctx3 = { console, PG: {}, S: { page: 'metricas' }, document: { head: { insertAdjacentHTML(){} }, documentElement: { getAttribute(){ return null; } }, getElementById: (id) => (/^met-[cd]-/.test(id) ? { id } : null) },
    isAdminUser: () => true, nav(){}, pageBanner: (a, b) => '<h1>' + b + '</h1>', setTimeout: (f) => esperando.push(f), Date, Math, JSON, Object, Array, String, Number,
    Chart: function(cv, cfg){ graficos.push({ id: cv.id, cfg }); this.destroy = () => {}; } };
  ctx3.window = ctx3;
  vm.createContext(ctx3);
  vm.runInContext(src('logic/metricas.js') + '\n' + src('logic/exportar.js') + '\n' + src('modules/metricas.js'), ctx3);
  ctx3._metHoyVE = () => '2026-10-22'; ctx3._metHoraVE = () => 22;
  vm.runInContext('_met.docs = ' + JSON.stringify(docs3.concat(muchas)) + '; _met.rango = 7;', ctx3);
  let h = ctx3.PG.metricas();
  ok('arriba, las tarjetas del Dashboard: la azul con personas y visitas, WhatsApp, solicitudes, el anillo de los que se van y el tiempo',
    /class="kx-row"/.test(h) && /class="kx-hero met-k"[\s\S]*Personas que entraron/.test(h) && />WhatsApp<\/span>[\s\S]*class="kx-mes"/.test(h) && />Solicitudes<\/span>[\s\S]*Empezaron a llenarla/.test(h) && />Se fueron<\/span>[\s\S]*class="kx-ring"/.test(h) && /Tiempo en la web/.test(h));
  ok('los 4 gráficos como los del Dashboard, con el selector Día / Hora (sin las pastillas de antes)',
    ['personas', 'visitas', 'whatsapp', 'solicitudes'].every(s => h.indexOf('id="met-c-' + s + '"') > -1 && h.indexOf('id="met-s-' + s + '-hora"') > -1) && /class="dash-seg"/.test(h) && !/met-chip/.test(h) && !/met-plot/.test(h));
  ok('redondos para de dónde vienen, teléfono o computadora y por dónde entran, con su leyenda y el % que escribe',
    ['fuente', 'disp', 'entrada'].every(k => h.indexOf('id="met-d-' + k + '"') > -1) && /De dónde vienen/.test(h) && /class="met-dona-t"><b>/.test(h) && /% escribe<\/span>/.test(h));
  ok('lo más importante, el embudo con el paso donde se pierde gente, motos, días de la semana y campañas', /Lo más importante/.test(h) && /aquí se pierde más/.test(h) && /Motos más vistas/.test(h) && /id="met-c-semana"/.test(h) && /Campañas y enlaces/.test(h));
  ok('...y abajo todos los números en tablas, con Excel/PDF; sin comparar antes del 14-oct', /Todos los números en tablas/.test(h) && (h.match(/<table>/g) || []).length >= 6 && /pgExportarTablas\('met-cont'/.test(h) && /La comparación con los 7 días anteriores aparece/.test(h));
  esperando.splice(0).forEach(f => f());
  const g = id => graficos.filter(x => x.id === id).pop();
  ok('se dibujan 4 gráficos de barras, 3 redondos y el de días de la semana', ['met-c-personas', 'met-c-visitas', 'met-c-whatsapp', 'met-c-solicitudes', 'met-c-semana'].every(id => g(id) && g(id).cfg.type === 'bar') && ['met-d-fuente', 'met-d-disp', 'met-d-entrada'].every(id => g(id) && g(id).cfg.type === 'doughnut'));
  ok('barras con degradado y bordes redondeados (como el Dashboard); una barra por día', typeof g('met-c-personas').cfg.data.datasets[0].backgroundColor === 'function' && g('met-c-personas').cfg.data.datasets[0].borderRadius === 6 && g('met-c-personas').cfg.data.labels.length === 7);
  ok('el redondo de fuentes: las primeras con los colores del Dashboard y el anillo fino', JSON.stringify(g('met-d-fuente').cfg.data.datasets[0].backgroundColor.slice(0, 2)) === JSON.stringify(['#2563EB', '#06B06A']) && g('met-d-fuente').cfg.options.cutout === '72%');
  graficos.length = 0;
  ctx3.metVista('whatsapp', 'hora');
  ok('Día / Hora cambia solo ese gráfico, sin armar la página', graficos.length === 1 && g('met-c-whatsapp').cfg.data.labels.length === 24 && g('met-c-whatsapp').cfg.data.labels[20] === '8 pm');
  vm.runInContext('_met.rango = 1; _met.vistas = {}; _met.docs.push({ vid: "z1", fecha: "2026-10-21", hora: 9, fuente: "google", disp: "telefono", entrada: "index", ev: [] });', ctx3);
  h = ctx3.PG.metricas();
  ok('hoy: hora por hora, comparado con ayer y sin selector', /Hoy, hora por hora/.test(h) && /vs ayer/.test(h) && !/met-s-personas-dia/.test(h) && !/id="met-c-semana"/.test(h));

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
