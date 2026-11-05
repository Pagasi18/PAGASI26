// 5-nov-2026, Adam: "en métricas web no veo nada de instagram… pon una chart de cuánta gente escribe vs
// cuánta gente responde, quiénes son los vendedores que más responden, quiénes son los que más venden".
// Se prueba el resumen (metRedesResumen) y la sección nueva de la pantalla.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const graficos = [], esperando = [], navs = [];
const ctx = { console, PG: {}, S: { page: 'metricas', creds: [] }, document: { head: { insertAdjacentHTML(){} }, documentElement: { getAttribute(){ return null; } }, getElementById: (id) => (/^met-[cd]-/.test(id) ? { id, getContext(){ return {}; } } : null) },
  isAdminUser: () => true, nav: (p) => navs.push(p), pageBanner: (a, b) => '<h1>' + b + '</h1>', setTimeout: (f) => esperando.push(f), Date, Math, JSON, Object, Array, String, Number, Promise,
  Chart: function(cv, cfg){ graficos.push({ id: cv.id, cfg }); this.destroy = () => {}; } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src('logic/metricas.js') + '\n' + src('logic/exportar.js') + '\n' + src('modules/metricas.js'), ctx);
ctx._metHoyVE = () => '2026-11-05'; ctx._metHoraVE = () => 15;
const h = (f, hh) => new Date(f + 'T' + hh + ':00:00-04:00').toISOString();   // hora de Caracas
const conv = (id, f, hh, extra) => Object.assign({ id, canal: id.indexOf('ig:') === 0 ? 'instagram' : 'whatsapp', area: 'ventas', creado: h(f, hh), ultimoMensajeHora: h(f, hh), modo: 'bot', ultimoAutor: 'asistente' }, extra || {});
const convs = [
  conv('ig:1', '2026-11-05', '09', { vendedor: 'Liz Alejandra', ultimoAutor: 'equipo', ultimaRespuesta: { desde: h('2026-11-05', '09'), hasta: h('2026-11-05', '10') }, borrador: { tipo: 'lead', nombre: 'Ana' } }),
  conv('ig:2', '2026-11-05', '22', {}),                                                              // 22:00 de Caracas sigue siendo el 5-nov (en UTC ya es el 6)
  conv('ig:3', '2026-11-04', '11', { modo: 'humano', atendidoPor: 'Marianne Molina' }),
  conv('wav:+1', '2026-11-04', '12', { vendedor: 'Liz Alejandra', ultimoAutor: 'equipo', ultimaRespuesta: { desde: h('2026-11-04', '12'), hasta: h('2026-11-04', '14') }, borrador: { tipo: 'lead', nombre: 'Luis' } }),
  conv('ig:4', '2026-11-02', '10', { borrador: { tipo: 'lead', nombre: 'Pepe' } }),
  conv('ig:viejo', '2026-10-20', '10', { vendedor: 'Liz Alejandra', ultimoAutor: 'equipo' })      // fuera de los 7 días
];
const creds = [
  { id: 'C1', fecha: '2026-11-03', estado: 'activo', vendedorNombre: 'Debora Angulo', fin: 900 }, { id: 'C2', fecha: '2026-11-04', estado: 'activo', vendedorNombre: 'Debora Angulo', fin: 1100 },
  { id: 'C3', fecha: '2026-11-01', estado: 'activo', creadoPor: 'Liz Alejandra', fin: 700 }, { id: 'C4', fecha: '2026-10-15', estado: 'activo', vendedorNombre: 'Liz Alejandra', fin: 800 },
  { id: 'C5', fecha: '2026-11-04', estado: 'cancelado', vendedorNombre: 'Oliver Torres', fin: 999 }, { id: 'C6', fecha: '2026-11-04', estado: 'activo', eliminado: true, vendedorNombre: 'Oliver Torres', fin: 999 }
];
const redes = { cargadoEn: Date.now(), conectado: true, sinPermiso: false, convs, ig: { actualizado: '2026-11-05T12:00:00Z', seguidoresDias: { '2026-10-28': 700, '2026-10-30': 710, '2026-11-05': 731 }, instagram: { usuario: 'pagasi.io', seguidores: 731, publicaciones: 14, posts: [] } } };

// ── 1. El resumen ──
const R = ctx.metRedesResumen(redes, '2026-10-30', '2026-11-05', creds);
ok('cuenta a los que escribieron en el período (la de las 10 pm de Caracas es del mismo día; la vieja no entra)', R.escribieron === 5 && R.instagram === 4 && R.whatsapp === 1 && R.porDia['2026-11-05'].escribieron === 2);
ok('a cuántos les contestó una persona (vendedor asignado, modo humano o respondió el equipo)', R.atendidas === 3 && R.porDia['2026-11-05'].atendidas === 1 && R.sinVendedor === 2);
ok('quieren comprar = dejaron sus datos', R.quieren === 3);
ok('vendedores que más responden: Liz primero (2 contestadas), con lo que tardó (mediana 1,5 h) y 2 que quieren comprar', R.responden[0].nombre === 'Liz Alejandra' && R.responden[0].atendidas === 2 && R.responden[0].minutos === 90 && R.responden[0].quieren === 2 && R.responden[1].nombre === 'Marianne Molina' && R.responden[1].minutos === null);
ok('vendedores que más venden: Debora (2 en el período), Liz (1 del período, 2 en total); sin cancelados ni eliminados', R.venden[0].nombre === 'Debora Angulo' && R.venden[0].periodo === 2 && R.venden[0].financiado === 2000 && R.venden[1].nombre === 'Liz Alejandra' && R.venden[1].periodo === 1 && R.venden[1].total === 2 && !R.venden.some(v => v.nombre === 'Oliver Torres'));
ok('Instagram: seguidores y cuánto creció desde el inicio del período', R.ig.seguidores === 731 && R.ig.crecimiento === 21 && R.ig.desdeCuando === '2026-10-30' && R.ig.publicaciones === 14);
ok('sin conversaciones ni créditos no revienta', (() => { const z = ctx.metRedesResumen({ convs: [], ig: null }, '2026-10-30', '2026-11-05', []); return z.escribieron === 0 && z.responden.length === 0 && z.venden.length === 0 && z.ig === null; })());

// ── 2. La pantalla ──
const docs = [{ vid: 'v1', fecha: '2026-11-05', hora: 10, fuente: 'ig', disp: 'telefono', entrada: 'index', inicio: 1000, ev: [{ t: 'vista', p: 'index', ts: 1000 }] }];
vm.runInContext('_met.docs = ' + JSON.stringify(docs) + '; _met.rango = 7; _met.redes = null;', ctx);
ctx.db = { collection(){ return { doc(){ return { get: () => Promise.resolve({ exists: false }) }; }, where(){ return this; }, orderBy(){ return this; }, limit(){ return this; }, get: () => Promise.resolve({ docs: [] }) }; } };
let html = ctx.PG.metricas();
ok('mientras carga, la sección dice que está cargando y pide los datos una sola vez', /Cargando Instagram y las conversaciones/.test(html) && vm.runInContext('_met.redesCargando', ctx) === true);
vm.runInContext('_met.redes = ' + JSON.stringify(redes) + '; _met.redesCargando = false;', ctx);
ctx.S.creds = creds;
html = ctx.PG.metricas();
ok('la sección nueva: Instagram con seguidores y crecimiento', /Instagram, WhatsApp de ventas y vendedores/.test(html) && /731<\/div><div class="kx-sub">seguidores · 14 publicaciones/.test(html) && /\+21 seguidores/.test(html));
ok('escribieron y a cuántos les contestó una persona, con el %', /<div class="kx-big" style="color:var\(--p1\)">5<\/div>/.test(html) && /<div class="kx-big" style="color:var\(--green\)">3<\/div>/.test(html) && /color:var\(--green\)">60%<\/span>/.test(html));
ok('el gráfico de escriben vs. les contestan', /id="met-c-redes"/.test(html) && /Escriben vs\. les contestan/.test(html));
ok('la tabla de los vendedores que más responden, Liz de primera con su tiempo', /Vendedores que más responden/.test(html) && /kx-bd-g">1<\/span> Liz Alejandra<\/td><td class="n">2<\/td><td class="n">2 <small>100%<\/small><\/td><td class="n">1,5 h<\/td><td class="n">2<\/td>/.test(html));
ok('la tabla de los que más venden, Debora de primera', /Vendedores que más venden/.test(html) && /kx-bd-g">1<\/span> Debora Angulo<\/td><td class="n">2<\/td><td class="n">\$2\.000<\/td><td class="n">2<\/td>/.test(html));
ok('...y las dos tablas van también abajo, para el Excel', /<h4>Vendedores que más responden<\/h4>/.test(html) && /<h4>Vendedores que más venden<\/h4>/.test(html));
graficos.length = 0; while (esperando.length) esperando.shift()();
const g = graficos.find(x => x.id === 'met-c-redes');
ok('el gráfico se dibuja con dos series (escribieron / les contestó una persona) y una barra por día', !!g && g.cfg.data.datasets.length === 2 && g.cfg.data.datasets[0].label === 'Escribieron' && g.cfg.data.labels.length === 7 && g.cfg.data.datasets[0].data.join() === '0,0,0,1,0,2,2' && g.cfg.data.datasets[1].data.join() === '0,0,0,0,0,2,1');
// Hoy: sin gráfico, solo los totales
vm.runInContext('_met.rango = 1;', ctx); html = ctx.PG.metricas();
ok('en "Hoy" no hay gráfico por día: dice los totales de hoy', !/id="met-c-redes"/.test(html) && /Hoy: 2 escribieron y a 1 les contestó una persona/.test(html));
// La 18: Meta no está conectado
vm.runInContext('_met.rango = 7; _met.redes = { cargadoEn: Date.now(), conectado: false, sinPermiso: false, convs: [], ig: null };', ctx); html = ctx.PG.metricas();
ok('en una compañía sin Meta (la 18) dice que eso se ve en pagasi.io', /están conectados en <b>pagasi\.io<\/b>/.test(html) && !/met-c-redes/.test(html));
vm.runInContext('_met.redes = { cargadoEn: Date.now(), conectado: true, sinPermiso: true, convs: [], ig: null };', ctx); html = ctx.PG.metricas();
ok('sin permiso de Redes Ventas lo dice, sin reventar', /permiso <b>Redes Ventas<\/b>/.test(html));
ok('el botón ↻ vuelve a traer también lo de Instagram', /if\(forzar\) _met\.redes = null;/.test(src('logic/metricas.js')));
ok('las listas piden canal y, en WhatsApp, el área de ventas (lo que dejan leer las Reglas)', /where\('canal', '==', 'whatsapp'\)\.where\('area', '==', 'ventas'\)/.test(src('logic/metricas.js')) && /where\('canal', '==', 'instagram'\)/.test(src('logic/metricas.js')));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
