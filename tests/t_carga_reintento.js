// Vigilante de carga (24-nov-2026). Ese dia GitHub Pages le contesto 503 a UNO de los ~85
// archivos del sistema (modules/concesionarios.js) minutos despues de publicar: el modulo no
// existio en esa sesion y nadie se entero. El <script id="pg-carga"> de admin.html ve el
// archivo que no llega, lo vuelve a pedir unas pocas veces y, si ni asi, avisa con un boton.
// Aqui se saca ese script TAL CUAL de admin.html y se corre contra una pagina de mentira con
// reloj propio: cada prueba decide que archivo llega, cual no y cuando.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
const guardian = (html.match(/<script id="pg-carga">([\s\S]*?)<\/script>/) || [])[1] || '';

// ── La pagina de mentira ────────────────────────────────────────────────
function nodo(tag) {
  const n = {
    tagName: String(tag || '').toUpperCase(), attrs: {}, style: {}, children: [], parentNode: null, textContent: '',
    setAttribute(k, v){ this.attrs[k] = String(v); }, getAttribute(k){ return k in this.attrs ? this.attrs[k] : null; },
    appendChild(c){ c.parentNode = this; this.children.push(c); return c; },
    removeChild(c){ const i = this.children.indexOf(c); if (i > -1) this.children.splice(i, 1); c.parentNode = null; return c; },
  };
  Object.defineProperty(n, 'src', { get(){ return n.attrs.src || ''; }, set(v){ n.attrs.src = String(v); }, enumerable: true });
  Object.defineProperty(n, 'id', { get(){ return n.attrs.id || ''; }, set(v){ n.attrs.id = String(v); }, enumerable: true });
  return n;
}
function textoDe(n){ return (n.textContent || '') + n.children.map(textoDe).join(' '); }
function buscar(n, id){ if (n.id === id) return n; for (const c of n.children) { const r = buscar(c, id); if (r) return r; } return null; }

function montar(opts) {
  opts = opts || {};
  const reloj = { t: 1000000, cola: [], n: 0 };
  const oyentesVentana = [], oyentesDoc = [], pedidos = [], avisos = [];
  const m = { recargas: 0, navs: [], redibujos: 0, sesion: Object.assign({}, opts.sesion || {}) };
  const head = nodo('head'), body = nodo('body');
  const headAppend = head.appendChild.bind(head);
  head.appendChild = function(c){ if (c.tagName === 'SCRIPT') pedidos.push(c); return headAppend(c); };
  const doc = {
    head, body, documentElement: nodo('html'), currentScript: null,
    createElement: nodo,
    getElementById(id){ return buscar(body, id); },
    addEventListener(tipo, fn){ oyentesDoc.push({ tipo, fn }); },
  };
  const ctx = {
    console: { log(){}, warn(){ avisos.push([].slice.call(arguments).join(' ')); }, error(){} },
    Date: { now: () => reloj.t }, String, Number, Math, Array, Object, JSON,
    setTimeout(fn, ms){ const id = ++reloj.n; reloj.cola.push({ id, a: reloj.t + (ms || 0), fn }); return id; },
    clearTimeout(id){ reloj.cola = reloj.cola.filter(x => x.id !== id); },
    document: doc,
    location: { reload(){ m.recargas++; } },
    sessionStorage: opts.sinSesion
      ? { getItem(){ throw new Error('sin permiso'); }, setItem(){ throw new Error('sin permiso'); } }
      : { getItem(k){ return k in m.sesion ? m.sesion[k] : null; }, setItem(k, v){ m.sesion[k] = String(v); } },
    addEventListener(tipo, fn, captura){ oyentesVentana.push({ tipo, fn, captura }); },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(guardian, ctx, { filename: 'admin.html#pg-carga' });

  m.ctx = ctx; m.doc = doc; m.pedidos = pedidos; m.avisos = avisos; m.oyentesVentana = oyentesVentana;
  m.PGCarga = ctx.PGCarga;
  m.estado = () => ctx.PGCarga.estado();
  // El reloj: corre lo que toque, en orden, hasta ms mas adelante
  m.avanzar = ms => {
    const hasta = reloj.t + ms;
    for (;;) {
      const pend = reloj.cola.filter(x => x.a <= hasta).sort((a, b) => a.a - b.a)[0];
      if (!pend) break;
      reloj.cola.splice(reloj.cola.indexOf(pend), 1);
      reloj.t = Math.max(reloj.t, pend.a);
      pend.fn();
    }
    reloj.t = hasta;
  };
  const emitir = ev => oyentesVentana.filter(o => o.tipo === 'error').forEach(o => o.fn(ev));
  // Un <script> de la pagina que el servidor nego
  m.noLlega = src => { const el = nodo('script'); el.setAttribute('src', src); emitir({ target: el }); };
  // Un archivo que revienta al cargar (error normal de JavaScript, no de red)
  m.revienta = src => { const el = nodo('script'); el.setAttribute('src', src); doc.currentScript = el; emitir({ target: ctx, message: 'x is not defined' }); doc.currentScript = null; };
  m.dcl = () => oyentesDoc.filter(o => o.tipo === 'DOMContentLoaded').forEach(o => o.fn());
  // El reintento N.º i (en el orden en que se pidieron) llega o no llega
  m.llega = (el, alCorrer) => { doc.currentScript = el; try { if (alCorrer) alCorrer(); } finally { doc.currentScript = null; } el.onload(); };
  m.falla = el => el.onerror();
  m.aviso = () => buscar(body, 'pg-carga-aviso');
  // El sistema abierto: S, PG, nav y el redibujo de tiempo real
  m.abrirSistema = (pagina, pantallas) => {
    ctx.S = { currentUser: { nombre: 'PRUEBA' }, page: pagina };
    ctx.PG = {}; (pantallas || []).forEach(p => { ctx.PG[p] = function(){ return ''; }; });
    ctx.PGL = { concesionarios: 'Concesionarios', creditos: 'Créditos' };
    ctx.nav = p => m.navs.push(p);
    ctx.scheduleRealtimeRender = () => { m.redibujos++; };
  };
  return m;
}
const V = '?v=20261124-0831';

// ── Donde vive ──────────────────────────────────────────────────────────
{
  const primero = html.match(/<script\b[^>]*>/);
  ok('el vigilante existe y es el PRIMER script de admin.html', guardian.length > 500 && !!primero && primero[0] === '<script id="pg-carga">');
  ok('va escrito dentro de la página (no es un archivo que pueda fallar)', !/<script id="pg-carga"[^>]*\bsrc=/.test(html));
  ok('no confunde a bump-version.sh ni a las pruebas que leen los src', !/\.(js|css)\?v=/.test(guardian) && !/src="(assets|logic|modules)\//.test(guardian));
  const m = montar();
  ok('escucha los errores de carga en fase de captura (los de <script> no burbujean)', m.oyentesVentana.some(o => o.tipo === 'error' && o.captura === true));
  ok('deja PGCarga.alTerminar y PGCarga.estado', typeof m.PGCarga.alTerminar === 'function' && typeof m.PGCarga.estado === 'function');
}

// ── Un día normal ───────────────────────────────────────────────────────
{
  const m = montar();
  let corrio = 0;
  m.PGCarga.alTerminar(() => corrio++);
  ok('sin nada pendiente, alTerminar corre en el acto', corrio === 1);
  m.avanzar(60000);
  ok('y no pide nada ni avisa', m.pedidos.length === 0 && !m.aviso() && m.recargas === 0);
}

// ── El caso del 24-nov: un módulo no llega y al reintento sí ────────────
{
  const m = montar();
  m.abrirSistema('dash', ['dash']);
  m.noLlega('modules/concesionarios.js' + V);
  ok('se anota como pendiente', m.estado().trabajando && m.estado().pendientes.join() === 'modules/concesionarios.js');
  ok('no lo pide en el mismo instante (espera corta)', m.pedidos.length === 0);
  m.avanzar(399);
  ok('a los 399 ms todavía no', m.pedidos.length === 0);
  m.avanzar(1);
  ok('a los 400 ms lo vuelve a pedir', m.pedidos.length === 1);
  const el = m.pedidos[0];
  ok('con la misma versión y &r=1 (otra dirección: no devuelve el fallo guardado)', el.src === 'modules/concesionarios.js' + V + '&r=1');
  ok('como script clásico, en orden y con el mismo charset', el.tagName === 'SCRIPT' && el.async === false && el.charset === 'utf-8');
  let entro = 0;
  m.PGCarga.alTerminar(() => entro++);
  ok('la entrada al sistema espera mientras se reintenta', entro === 0);
  m.llega(el, () => { m.ctx.PG.concesionarios = function(){ return ''; }; });
  ok('al llegar: recuperado, nada pendiente', m.estado().recuperados.join() === 'modules/concesionarios.js' && !m.estado().trabajando && m.estado().pendientes.length === 0);
  ok('la entrada sigue', entro === 1);
  ok('sin aviso y sin recargar', !m.aviso() && m.recargas === 0);
  ok('la pantalla abierta se redibuja como cuando llegan datos (no saca a nadie de donde está)', m.redibujos === 1 && m.navs.length === 0);
  m.avanzar(60000);
  ok('y no lo vuelve a pedir', m.pedidos.length === 1 && entro === 1);
}

// ── La persona estaba EN esa pantalla («En desarrollo»): se pinta al llegar ──
{
  const m = montar();
  m.abrirSistema('concesionarios', ['dash']);
  m.noLlega('modules/concesionarios.js' + V);
  m.avanzar(400);
  m.llega(m.pedidos[0], () => { m.ctx.PG.concesionarios = function(){ return ''; }; });
  ok('la pantalla que no existía se abre sola al llegar su archivo', m.navs.join() === 'concesionarios');
}
{
  const m = montar();
  m.abrirSistema('creditos', ['dash', 'creditos']);
  m.noLlega('modules/concesionarios.js' + V);
  m.avanzar(400);
  m.llega(m.pedidos[0], () => { m.ctx.PG.concesionarios = function(){ return ''; }; });
  ok('si estaba en otra pantalla, no se le reabre nada encima', m.navs.length === 0);
}
{
  const m = montar();   // sin sesión todavía (pantalla de entrada)
  m.noLlega('modules/concesionarios.js' + V);
  m.avanzar(400);
  m.llega(m.pedidos[0]);
  ok('en la pantalla de entrada no intenta pintar nada', m.navs.length === 0 && m.redibujos === 0 && !m.aviso());
}

// ── Reintentos: 3, con espera que crece ─────────────────────────────────
{
  const m = montar();
  m.abrirSistema('dash', ['dash']);
  m.noLlega('modules/concesionarios.js' + V);
  m.avanzar(400); m.falla(m.pedidos[0]);
  ok('1.er reintento falla: sigue pendiente, sin aviso', m.estado().trabajando && !m.aviso());
  m.avanzar(1199);
  ok('el 2.º espera 1,2 s', m.pedidos.length === 1);
  m.avanzar(1);
  ok('2.º reintento con &r=2', m.pedidos.length === 2 && /&r=2$/.test(m.pedidos[1].src));
  m.falla(m.pedidos[1]);
  m.avanzar(3000);
  ok('3.er reintento con &r=3, a los 3 s', m.pedidos.length === 3 && /&r=3$/.test(m.pedidos[2].src));
  let entro = 0;
  m.PGCarga.alTerminar(() => entro++);
  m.falla(m.pedidos[2]);
  ok('tras 3 fallos se rinde: perdido', m.estado().perdidos.join() === 'modules/concesionarios.js' && !m.estado().trabajando);
  m.avanzar(60000);
  ok('no hay 4.º reintento', m.pedidos.length === 3);
  const a = m.aviso();
  ok('sale el aviso', !!a && a.getAttribute('role') === 'alert');
  const t = a ? textoDe(a) : '';
  ok('en español claro, diciendo qué parte', /No se pudo cargar una parte del sistema \(Concesionarios\)/.test(t) && /Lo demás funciona/.test(t));
  ok('y dice qué archivo fue (para poder reportarlo)', /modules\/concesionarios\.js/.test(t));
  const b = a && buscar(a, 'pg-carga-recargar');
  ok('con el botón «Recargar»', !!b && b.textContent === 'Recargar' && b.tagName === 'BUTTON');
  b.onclick();
  ok('que recarga la página', m.recargas === 1);
  ok('el resto del sistema entra igual (no se queda en blanco)', entro === 1);
  const c = buscar(a, 'pg-carga-seguir');
  ok('se puede seguir trabajando sin esa parte', !!c && c.textContent === 'Seguir así');
  c.onclick();
  ok('«Seguir así» quita el aviso', !m.aviso());
  ok('los reintentos fallidos no dejan basura en la página', m.doc.head.children.length === 0);
  ok('no recargó sola por un módulo suelto', m.recargas === 1);
}

// ── Falla a la primera y llega a la segunda ─────────────────────────────
{
  const m = montar();
  m.noLlega('logic/creditos.js' + V);
  m.avanzar(400); m.falla(m.pedidos[0]);
  m.avanzar(1200); m.llega(m.pedidos[1]);
  ok('un archivo que llega al 2.º reintento queda recuperado, sin aviso', m.estado().recuperados.join() === 'logic/creditos.js' && !m.aviso() && m.estado().perdidos.length === 0);
}

// ── Varios a la vez: uno por uno y en el orden de la página ─────────────
{
  const m = montar();
  m.noLlega('logic/creditos.js' + V);
  m.noLlega('modules/concesionarios.js' + V);
  m.noLlega('modules/concesionarios.js' + V);   // el mismo dos veces no se duplica
  ok('dos pendientes, sin repetir', m.estado().pendientes.join() === 'logic/creditos.js,modules/concesionarios.js');
  m.avanzar(400);
  ok('se pide primero el que va antes, y solo ese', m.pedidos.length === 1 && /^logic\/creditos\.js/.test(m.pedidos[0].src));
  m.llega(m.pedidos[0]);
  ok('al llegar el primero se pide el segundo', m.pedidos.length === 2 && /^modules\/concesionarios\.js/.test(m.pedidos[1].src));
  ok('y mientras tanto sigue trabajando', m.estado().trabajando);
  m.llega(m.pedidos[1]);
  ok('los dos recuperados en su orden', m.estado().recuperados.join() === 'logic/creditos.js,modules/concesionarios.js' && !m.estado().trabajando);
}
{
  // Uno se pierde y el otro llega: no se frena la fila
  const m = montar();
  m.noLlega('logic/creditos.js' + V);
  m.noLlega('modules/concesionarios.js' + V);
  m.avanzar(400); m.falla(m.pedidos[0]); m.llega(m.pedidos[1]);
  m.avanzar(1200); m.falla(m.pedidos[2]);
  m.avanzar(3000); m.falla(m.pedidos[3]);
  ok('uno perdido y el otro recuperado', m.estado().perdidos.join() === 'logic/creditos.js' && m.estado().recuperados.join() === 'modules/concesionarios.js' && m.pedidos.length === 4);
  ok('aviso de una parte, sin nombre inventado para un archivo de lógica', /No se pudo cargar una parte del sistema\./.test(textoDe(m.aviso())));
}
{
  // Sin internet: fallan todos. El aviso sale en segundos, no en minutos.
  const m = montar();
  const todos = []; for (let i = 0; i < 80; i++) todos.push('logic/a' + i + '.js');
  todos.forEach(f => m.noLlega(f + V));
  const fallarTodos = () => { for (let p; (p = m.pedidos.find(x => !x._visto)); ) { p._visto = 1; m.falla(p); } };
  m.avanzar(400); fallarTodos();
  ok('80 archivos caídos: la primera vuelta los pide a todos, en su orden', m.pedidos.length === 80 && m.pedidos.every((p, i) => p.src === 'logic/a' + i + '.js' + V + '&r=1'));
  m.avanzar(1200); fallarTodos();
  m.avanzar(3000); fallarTodos();
  ok('3 vueltas (240 pedidos) y el aviso sale a los 4,6 s, no en minutos', m.pedidos.length === 240 && !!m.aviso() && m.estado().perdidos.length === 80 && !m.estado().trabajando);
}
{
  // Uno falla cuando ya se estaba reintentando otro: cada uno lleva su propia espera
  const m = montar();
  m.noLlega('logic/creditos.js' + V);
  m.avanzar(400); m.falla(m.pedidos[0]);
  m.avanzar(1200); m.falla(m.pedidos[1]);     // a creditos le quedan 3 s para su ultimo intento
  m.noLlega('modules/gps.js' + V);            // aparece tarde
  m.avanzar(399);
  ok('el que aparece tarde no se pide antes de su espera corta', m.pedidos.length === 2);
  m.avanzar(1);
  ok('y a los 400 ms se pide (no espera los 3 s del otro)', m.pedidos.length === 3 && /^modules\/gps\.js.*&r=1$/.test(m.pedidos[2].src));
  m.falla(m.pedidos[2]);
  m.avanzar(1200);
  ok('su 2.º intento a los 1,2 s', m.pedidos.length === 4 && /^modules\/gps\.js.*&r=2$/.test(m.pedidos[3].src));
  m.falla(m.pedidos[3]);
  m.avanzar(1400);
  ok('el primero recibe su 3.er intento a sus 3 s', m.pedidos.length === 5 && /^logic\/creditos\.js.*&r=3$/.test(m.pedidos[4].src));
  m.falla(m.pedidos[4]);
  ok('uno perdido no cierra la cuenta mientras el otro sigue', m.estado().trabajando && !m.aviso());
  m.avanzar(1600);
  ok('el tardío recibe sus 3 intentos completos', m.pedidos.length === 6 && /^modules\/gps\.js.*&r=3$/.test(m.pedidos[5].src));
  m.llega(m.pedidos[5]);
  ok('y se recupera aunque el otro se haya perdido', m.estado().recuperados.join() === 'modules/gps.js' && m.estado().perdidos.join() === 'logic/creditos.js' && !!m.aviso());
}

// ── Lo de afuera no se toca ─────────────────────────────────────────────
{
  const m = montar();
  m.noLlega('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
  m.noLlega('//cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js');
  const img = nodo('img'); img.setAttribute('src', 'assets/pegaso.png');
  m.oyentesVentana.forEach(o => o.fn({ target: img }));
  m.avanzar(10000);
  ok('Firebase, Chart.js y las imágenes no entran en el reintento', m.pedidos.length === 0 && !m.estado().trabajando);
  m.revienta('modules/dash.js' + V);
  ok('un error normal de JavaScript, sin nada faltando, no dispara nada', !m.estado().ordenRoto && m.pedidos.length === 0);
}

// ── El archivo que todos necesitan: pagasi-app.js ───────────────────────
{
  const m = montar();
  m.noLlega('assets/pagasi-app.js' + V);
  ok('pagasi-app.js faltando = el orden ya se rompió', m.estado().ordenRoto);
  m.avanzar(400);
  ok('se reintenta igual', m.pedidos.length === 1 && m.pedidos[0].src === 'assets/pagasi-app.js' + V + '&r=1');
  m.llega(m.pedidos[0]);
  ok('al llegar, la página se recarga SOLA (pegarlo al final no arregla a los que ya reventaron)', m.recargas === 1 && !m.aviso());
  ok('y deja anotada la hora de esa recarga', Number(m.sesion.pg_carga_recarga) > 0);
}
{
  // Segunda vez en menos de 2 minutos: no entra en un ciclo de recargas
  const m = montar({ sesion: { pg_carga_recarga: String(1000000 - 30000) } });
  let entro = 0;
  m.noLlega('assets/pagasi-app.js' + V);
  m.avanzar(400);
  m.PGCarga.alTerminar(() => entro++);
  m.llega(m.pedidos[0]);
  ok('si ya se recargó sola hace 30 s, NO vuelve a recargar', m.recargas === 0);
  const t = m.aviso() ? textoDe(m.aviso()) : '';
  ok('avisa y deja el botón a la persona', /El sistema no terminó de cargar/.test(t) && !!buscar(m.aviso(), 'pg-carga-recargar'));
  ok('ese aviso no se puede descartar (el sistema está incompleto)', !buscar(m.aviso(), 'pg-carga-seguir'));
  ok('y no deja a nadie colgado esperando', entro === 1);
}
{
  const m = montar({ sesion: { pg_carga_recarga: String(1000000 - 130000) } });
  m.noLlega('assets/pagasi-app.js' + V);
  m.avanzar(400); m.llega(m.pedidos[0]);
  ok('pasados los 2 minutos sí puede recargar sola otra vez', m.recargas === 1);
}
{
  const m = montar({ sinSesion: true });
  m.noLlega('assets/pagasi-app.js' + V);
  m.avanzar(400); m.llega(m.pedidos[0]);
  ok('si no puede anotar la recarga (navegador sin almacenamiento), no recarga sola: avisa', m.recargas === 0 && !!m.aviso());
}
{
  const m = montar();
  m.noLlega('assets/pagasi-app.js' + V);
  m.avanzar(400); m.falla(m.pedidos[0]);
  m.avanzar(1200); m.falla(m.pedidos[1]);
  m.avanzar(3000); m.falla(m.pedidos[2]);
  const t = m.aviso() ? textoDe(m.aviso()) : '';
  ok('pagasi-app.js no llega nunca: aviso de que el sistema no cargó, con Recargar y sin recarga sola',
    /El sistema no terminó de cargar/.test(t) && /revisa tu conexión/.test(t) && /assets\/pagasi-app\.js/.test(t) && m.recargas === 0 && !!buscar(m.aviso(), 'pg-carga-recargar'));
}

// ── Otro archivo revienta AL CARGAR porque le faltaba el que no llegó ───
{
  const m = montar();
  m.noLlega('logic/creditos.js' + V);
  m.revienta('modules/creditos.js' + V);
  ok('se anota que el orden se rompió', m.estado().ordenRoto);
  m.avanzar(400); m.llega(m.pedidos[0]);
  ok('al recuperar el archivo, se recarga sola', m.recargas === 1);
}
{
  const m = montar();
  m.noLlega('logic/creditos.js' + V);
  const el = nodo('script');   // un script escrito en la página (sin src) o de afuera no cuenta
  m.doc.currentScript = el; m.oyentesVentana.forEach(o => o.fn({ target: m.ctx, message: 'x' })); m.doc.currentScript = null;
  m.oyentesVentana.forEach(o => o.fn({ target: m.ctx, message: 'error dentro de un clic' }));
  ok('un error que no es de un archivo propio cargando no cuenta como orden roto', !m.estado().ordenRoto);
}

// ── La espera tiene tope ────────────────────────────────────────────────
{
  const m = montar();
  m.noLlega('modules/concesionarios.js' + V);
  m.avanzar(400);                    // pedido, y el servidor no contesta ni sí ni no
  let entro = 0;
  m.PGCarga.alTerminar(() => entro++);
  m.avanzar(9999);
  ok('la entrada espera hasta 10 s por un archivo que no contesta', entro === 0);
  m.avanzar(1);
  ok('a los 10 s entra igual', entro === 1);
  m.llega(m.pedidos[0]);
  ok('y cuando por fin llega no entra dos veces', entro === 1 && m.estado().recuperados.length === 1);
}
{
  const m = montar();
  m.noLlega('modules/concesionarios.js' + V);
  m.avanzar(400);
  const orden = [];
  m.PGCarga.alTerminar(() => { orden.push('a'); throw new Error('falla la primera'); });
  m.PGCarga.alTerminar(() => orden.push('b'));
  m.llega(m.pedidos[0]);
  ok('los que esperan salen en su orden, y un error en uno no deja colgado al otro', orden.join() === 'a,b');
}

// ── DOMContentLoaded ya pasó (logic/charts.js aplica así el tema guardado) ──
{
  const m = montar();
  m.dcl();
  m.noLlega('logic/charts.js' + V);
  m.avanzar(400);
  let tema = 0, otro = 0;
  m.llega(m.pedidos[0], () => { m.doc.addEventListener('DOMContentLoaded', () => tema++); });
  ok('no lo llama en medio de la carga del archivo', tema === 0);
  m.avanzar(0);
  ok('un archivo reintentado que se apunta a DOMContentLoaded ya pasado se llama igual', tema === 1);
  m.doc.addEventListener('DOMContentLoaded', () => otro++);
  m.doc.addEventListener('visibilitychange', () => otro++);
  m.avanzar(1000);
  ok('lo demás usa el addEventListener de siempre', otro === 0 && tema === 1);
}
{
  const m = montar();
  m.noLlega('logic/charts.js' + V);      // la página todavía está cargando
  m.avanzar(400);
  let tema = 0;
  m.llega(m.pedidos[0], () => { m.doc.addEventListener('DOMContentLoaded', () => tema++); });
  m.avanzar(0);
  ok('si DOMContentLoaded aún no pasó, no lo adelanta', tema === 0);
  m.dcl();
  ok('y corre una sola vez cuando pasa de verdad', tema === 1);
}

// ── La entrada al sistema (logic/usuarios.js) ───────────────────────────
{
  const us = fs.readFileSync(path.join(ROOT, 'logic/usuarios.js'), 'utf8');
  ok('init() pasa por _conTodoCargado en las dos entradas (sesión y activar invitación)', (us.match(/_appInited = true; _conTodoCargado\(function\(\)\{ if \(window\._appInited\) init\(\); \}\);/g) || []).length === 2);
  ok('y ya no se llama directo al entrar', !/_appInited = true; init\(\);/.test(us));
  const fnSrc = (us.match(/function _conTodoCargado\(fn\)\{[\s\S]*?\n\}/) || [])[0] || '';
  const cartel = [];
  const probar = win => {
    const c = { window: win, showLoader(msg){ cartel.push('ver:' + msg); }, hideLoader(){ cartel.push('quitar'); } };
    vm.createContext(c); vm.runInContext(fnSrc, c); return c._conTodoCargado;
  };
  let n = 0;
  probar({})(() => n++);
  ok('sin vigilante (otra página, pruebas) entra en el acto', n === 1);
  probar({ PGCarga: { alTerminar(fn){ fn(); } } })(() => n++);
  ok('con vigilante y nada pendiente entra en el acto, sin cartel', n === 2 && cartel.length === 0);
  let recibido = null;
  probar({ PGCarga: { alTerminar(fn){ recibido = fn; } } })(() => { cartel.push('entra'); n++; });
  ok('con un archivo pendiente, espera', n === 2 && typeof recibido === 'function');
  ok('y mientras espera se ve el cartel de «cargando» (no una pantalla vacía)', cartel.length === 1 && /^ver:Terminando de cargar el sistema/.test(cartel[0]));
  recibido();
  ok('entra cuando el vigilante lo suelta, quitando antes su cartel', n === 3 && cartel.slice(1).join() === 'quitar,entra');
  probar({ PGCarga: {} })(() => n++);
  ok('un PGCarga a medias no bloquea la entrada', n === 4);
}

// ── La pantalla cuyo archivo no llegó no dice «En desarrollo» ───────────
{
  const app = fs.readFileSync(path.join(ROOT, 'assets/pagasi-app.js'), 'utf8');
  const fnSrc = (app.match(/function _pantallaQueNoCargo\(\)\{[\s\S]*?\n\}/) || [])[0] || '';
  const probar = win => { const c = { window: win }; vm.createContext(c); vm.runInContext(fnSrc, c); return c._pantallaQueNoCargo(); };
  const est = o => ({ PGCarga: { estado: () => Object.assign({ pendientes: [], perdidos: [], recuperados: [] }, o) } });
  ok('nav() la usa donde antes decía solo «En desarrollo»', /\$\('cnt'\)\.innerHTML = _pantallaQueNoCargo\(\) \|\| `<div class="empty">/.test(app));
  ok('un día normal sigue diciendo «En desarrollo» (no inventa fallos)', probar(est({})) === '' && probar({}) === '' && probar({ PGCarga: {} }) === '');
  ok('un archivo recuperado tampoco cambia nada', probar(est({ recuperados: ['modules/concesionarios.js'] })) === '');
  const h = probar(est({ perdidos: ['modules/concesionarios.js'] }));
  ok('con un archivo perdido: dice que no terminó de cargar y ofrece Recargar', /Esta pantalla no terminó de cargar/.test(h) && /<button class="btn btn-p" onclick="location\.reload\(\)">Recargar<\/button>/.test(h));
  ok('igual mientras se está volviendo a pedir', /no terminó de cargar/.test(probar(est({ pendientes: ['modules/concesionarios.js'] }))));
  ok('si el vigilante falla al contestar, no rompe la navegación', probar({ PGCarga: { estado(){ throw new Error('x'); } } }) === '');
}

console.log('\n' + pass + ' OK, ' + fail + ' FALLA');
process.exit(fail ? 1 : 0);
