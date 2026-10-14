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
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + e.stack); process.exitCode = 1; });
