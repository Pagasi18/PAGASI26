// 24-oct-2026, Adam: "vamos a hacer esto" (publicaciones que piden "comenta MOTO" con la cuota en la primera línea).
// Servidor: a quien comenta la palabra, Paola le escribe por privado con el precio, la inicial y las cuotas de la moto
// de la publicación (sin Claude) y le contesta corto en público. Pantalla: la sección en la ventana de Paola, la
// etiqueta y el filtro en Comentarios de Instagram.
process.env.TZ = 'America/Caracas';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), F = path.join(ROOT, 'functions', 'lib');
const meta = require(path.join(F, 'meta.js')), procesar = require(path.join(F, 'procesar.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function FakeDb(inicial) {
  const store = new Map();
  Object.keys(inicial || {}).forEach(col => Object.keys(inicial[col]).forEach(id => store.set(col + '/' + id, Object.assign({}, inicial[col][id]))));
  const cumple = (d, w) => w.every(([f, op, v]) => op === '==' ? d[f] === v : true);
  function coleccion(ruta) {
    const q = (where) => ({ where: (f, op, v) => q(where.concat([[f, op, v]])), orderBy: () => q(where), limit: () => q(where),
      async get() { const docs = [...store.entries()].filter(([k]) => k.startsWith(ruta + '/') && !k.slice(ruta.length + 1).includes('/')).map(([k, d]) => ({ id: k.slice(ruta.length + 1), data: () => d, exists: true })).filter(x => cumple(x.data(), where)); return { docs, empty: !docs.length }; },
      doc: (id) => documento(ruta + '/' + id) });
    return q([]);
  }
  function documento(ruta) {
    return { id: ruta.split('/').pop(),
      async get() { const d = store.get(ruta); return { exists: !!d, data: () => d }; },
      async set(d, o) { store.set(ruta, Object.assign({}, (o && o.merge && store.get(ruta)) || {}, d)); },
      async create(d) { if (store.has(ruta)) throw new Error('ya existe'); store.set(ruta, Object.assign({}, d)); },
      collection: (sub) => coleccion(ruta + '/' + sub) };
  }
  return { collection: coleccion, _store: store, _lista: (pref) => [...store.entries()].filter(([k]) => k.startsWith(pref)).map(([k, d]) => d) };
}
const AHORA = '2026-10-24T15:00:00.000Z';
const CATALOGO = { cond: { apy: 500, seguroPct: 0, inicialMin: 40, inicialMax: 60, plazos: [6, 9, 12] }, sedes: [],
  motos: [{ id: '101', modelo: 'EK XPRESS 150 LITE', name: 'EK Xpress 150 Lite', sedeName: 'EK Bello Monte', precio: 1020, disponible: true },
    { id: '102', modelo: 'BRF', sedeName: 'BERA Petare', precio: 1195, disponible: true }, { id: '103', modelo: 'BRF', sedeName: 'BERA Chacao', precio: 1180, disponible: true },
    { id: '104', modelo: 'LEON', sedeName: 'BERA Chacao', precio: 1300, disponible: true }, { id: '105', modelo: 'LEÓN 200', sedeName: 'Toro Sabana Grande', precio: 1320, disponible: true },
    { id: '106', modelo: 'ÁGUILA', sedeName: 'Boleita', precio: 980, disponible: false }, { id: '107', modelo: 'TRX150 RAYO', sedeName: 'Toro Sabana Grande', precio: 1050, disponible: true }] };
const PUBLICACIONES = { m1: '🏍️ EK Xpress 150 Lite: $57 por quincena.\nComenta MOTO y te escribimos.', m2: 'Feliz día del motorizado 🏍️ Comenta MOTO', m3: 'La Bera León llegó a Chacao' };
function armar(cfgExtra, opciones) {
  const db26 = FakeDb({}), publicos = [], privados = [], pensadas = [];
  const metaIG = { responderComentario: async (id, t) => { publicos.push({ id, t }); return 'rep' + publicos.length; },
    mensajePrivado: async (id, t) => { if (opciones && opciones.privadoFalla) throw new Error('El usuario no acepta mensajes'); privados.push({ id, t }); return { metaId: 'mid.p' + privados.length, igsid: '7700' + privados.length }; },
    publicacion: async (id) => { if (opciones && opciones.sinApi) throw new Error('sin permiso'); return { texto: PUBLICACIONES[id] || '' }; } };
  const cerebro = { async pensar(x) { pensadas.push(x); return { reply: 'Escríbeme por mensaje directo y te paso todo.', summary: '', handoff: false }; } };
  const deps = { bases: { '26': db26 }, metaIG, instagramId: '178414', ventas: async () => CATALOGO, cerebro, cfg: Object.assign({ instagram: 'pagasi.io', responde: { comentariosIg: true }, calidad: { ventas: 'normal' } }, cfgExtra || {}), ahora: () => AHORA, hoy: () => '2026-10-24', log: () => {} };
  return { db26, publicos, privados, pensadas, deps };
}
const aviso = (id, texto, de, usuario, media) => meta.parsearWebhook({ object: 'instagram', entry: [{ id: '178414', time: 1761318000, changes: [{ field: 'comments', value: { id, text: texto, from: { id: de, username: usuario }, media: { id: media || 'm1', media_product_type: 'FEED' } } }] }] });
const ENC = { comentaMoto: { activo: true, palabras: ['moto'] } };

(async () => {
  // ── 1. Reconocer la palabra ──
  const pc = (t, cfg) => procesar.palabraClave(t, cfg === undefined ? ENC : cfg);
  ok('"MOTO", "moto 🙌", "Mótó", "motos" y "Moto por favor!!" cuentan', ['MOTO', 'moto 🙌', 'Mótó', 'motos', 'Moto por favor!!'].every(t => pc(t) === 'moto'));
  ok('un comentario largo con la palabra no cuenta (lo contesta Paola como siempre)', pc('quiero saber cuanto sale la moto de la foto') === '' && pc('motorizado') === '');
  ok('apagado o sin configurar no cuenta nada', pc('MOTO', { comentaMoto: { activo: false } }) === '' && pc('MOTO', {}) === '' && pc('MOTO', null) === '');
  ok('las palabras se pueden cambiar (y vale la frase entera)', pc('Info', { comentaMoto: { activo: true, palabras: ['info', 'la quiero'] } }) === 'info' && pc('yo la quiero!', { comentaMoto: { activo: true, palabras: ['info', 'la quiero'] } }) === 'la quiero');

  // ── 2. La moto de la publicación ──
  const md = (t) => { const m = procesar.motoDeTexto(t, CATALOGO.motos); return m ? m.id : ''; };
  ok('el modelo que nombra la publicación se reconoce', md(PUBLICACIONES.m1) === '101');
  ok('con el mismo nombre en dos sedes manda la marca del texto y si no, la más barata', md('Bera BRF a cuotas') === '103' && md('BRF modelo nuevo') === '103');
  ok('"Bera León" es la de Bera (no la León 200 de Toro); una moto oculta no cuenta', md(PUBLICACIONES.m3) === '104' && md('Águila de Boleita') === '' && md('Toro León 200') === '105');
  ok('una publicación sin modelo no trae moto', md(PUBLICACIONES.m2) === '');

  // ── 3. El mensaje privado ──
  const txt = procesar.textoComentaMoto(CATALOGO.motos[0], CATALOGO.cond, CATALOGO.motos);
  ok('el privado trae contado, inicial, cuotas a 12 meses y los otros plazos, con la fórmula de pagasi.io', /EK Xpress 150 Lite/.test(txt) && /Precio de contado: \$1\.020/.test(txt) && /Inicial desde \$408 \(40%\)/.test(txt) && /24 cuotas quincenales de \$57 \(12 meses\)/.test(txt) && /6 meses \(\$81\) y a 9 meses \(\$65\)/.test(txt) && /¿En qué ciudad estás\?/.test(txt));
  const gen = procesar.textoComentaMoto(null, CATALOGO.cond, CATALOGO.motos);
  ok('sin moto: cuotas "desde" la más baja disponible y le pregunta qué moto quiere', /desde \$57/.test(gen) && /¿Qué moto te interesa/.test(gen) && !/\$55/.test(gen));

  // ── 4. El flujo completo ──
  let G = armar(ENC);
  let r = await procesar.procesarAviso(G.deps, aviso('k1', 'MOTO', '501', 'carlos.ccs'));
  const k1 = G.db26._store.get('comentarios_ig/k1'), conv = G.db26._store.get('conversaciones/ig:77001');
  ok('"MOTO": privado con las cuotas de la moto de la publicación y respuesta pública corta', r.comentarios[0].respondido && r.comentarios[0].privado && G.privados.length === 1 && G.privados[0].id === 'k1' && /\$57/.test(G.privados[0].t) && G.publicos.length === 1 && procesar.COMENTA_PUBLICO.includes(G.publicos[0].t));
  ok('...sin pasar por Claude', G.pensadas.length === 0);
  ok('...el comentario queda con la palabra y la moto', k1.estado === 'respondido' && k1.palabraClave === 'moto' && k1.moto === 'EK XPRESS 150 LITE' && k1.motoId === '101' && k1.via === 'palabra-clave' && k1.privado.enviado);
  ok('...y abre la conversación en el panel: etapa interesado y de qué publicación vino', conv && conv.canal === 'instagram' && conv.area === 'ventas' && conv.etapa === 'interesado' && conv.campana.palabra === 'moto' && conv.campana.motoId === '101' && conv.campana.mediaId === 'm1' && conv.origenComentario === 'k1' && G.db26._lista('conversaciones/ig:77001/mensajes/').length === 1);
  r = await procesar.procesarAviso(G.deps, aviso('k2', 'moto!', '501', 'carlos.ccs', 'm3'));
  ok('la misma persona comenta otra vez: ya no otro privado (tope del día), en público "ya te escribí"', !r.comentarios[0].privado && G.privados.length === 1 && G.publicos[1].t === 'Ya te escribí por mensaje directo: revisa tus mensajes 📩');
  r = await procesar.procesarAviso(G.deps, aviso('k3', 'MOTOS', '501', 'carlos.ccs'));
  ok('...y la tercera del día ya no se contesta', !r.comentarios[0].respondido && r.comentarios[0].motivo === 'tope-usuario' && G.publicos.length === 2);
  r = await procesar.procesarAviso(G.deps, aviso('k4', 'Moto', '502', 'ana.v', 'm2'));
  ok('en una publicación sin modelo: el privado general con la cuota "desde"', r.comentarios[0].privado && /desde \$57/.test(G.privados[1].t) && G.db26._store.get('comentarios_ig/k4').moto === '');
  r = await procesar.procesarAviso(G.deps, aviso('k5', 'Pésimo, compré una moto y nadie me responde', '503', 'molesto'));
  ok('un reclamo que nombra la moto no entra al atajo: lo contesta Paola como reclamo', G.pensadas.length === 1 && !G.db26._store.get('comentarios_ig/k5').palabraClave && G.db26._store.get('comentarios_ig/k5').reclamo);
  G = armar(ENC, { privadoFalla: true });
  r = await procesar.procesarAviso(G.deps, aviso('k6', 'MOTO', '504', 'cerrado'));
  ok('si Instagram no deja escribirle por privado, en público se le pide que escriba al DM', !r.comentarios[0].privado && G.publicos[0].t === '¡Hola! Escríbenos por mensaje directo y te paso el precio y las cuotas 📩' && G.db26._store.get('comentarios_ig/k6').privado.enviado === false);
  G = armar(ENC, { sinApi: true }); G.db26._store.set('config/redesMetricas', { instagram: { posts: [{ id: 'm9', texto: 'BRF de Bera Chacao: $66 por quincena' }] } });
  r = await procesar.procesarAviso(G.deps, aviso('k7', 'moto', '505', 'luis', 'm9'));
  ok('sin permiso para leer la publicación, saca el texto de las métricas guardadas', G.db26._store.get('comentarios_ig/k7').motoId === '103' && /BRF/.test(G.privados[0].t));
  G = armar({});
  r = await procesar.procesarAviso(G.deps, aviso('k8', 'MOTO', '506', 'pedro'));
  ok('apagado: el comentario sigue por Paola como siempre (sin el atajo)', G.pensadas.length === 1 && !G.db26._store.get('comentarios_ig/k8').palabraClave);
  G = armar(Object.assign({}, ENC, { responde: { comentariosIg: false } }));
  r = await procesar.procesarAviso(G.deps, aviso('k9', 'MOTO', '507', 'maria'));
  ok('funciona aunque Paola esté apagada para los demás comentarios (tiene su propio interruptor)', r.comentarios[0].privado && G.pensadas.length === 0);

  // ── 5. El servidor lee el interruptor (antes no leía reparto ni seguimiento) ──
  const idx = fs.readFileSync(path.join(ROOT, 'functions', 'index.js'), 'utf8');
  ok('cfgAsistente pasa reparto, seguimiento y comentaMoto al servidor', /reparto: c\.reparto \|\| \{\}, seguimiento: c\.seguimiento \|\| \{\}, comentaMoto: c\.comentaMoto \|\| \{\}/.test(idx));
  ok('meta.js sabe leer el texto de una publicación', typeof meta.clienteInstagram({ accessToken: 'x' }).publicacion === 'function');

  // ── 6. La pantalla ──
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', value: '', checked: false, disabled: false, style: {} });
  const doc = { getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector(q) { return q === '#mbd input[name="rs-calidad"]:checked' ? null : null; }, querySelectorAll(q) { return q === '#mbd .rs-sw' ? Object.values(els).filter(e => e.rsSw) : []; }, addEventListener() {} };
  const guardado = [], toasts = [];
  const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, location: { origin: 'https://pagasi.io' }, setTimeout(fn) { fn(); return 1; }, clearTimeout() {},
    S: { page: 'redes', currentUser: { nombre: 'adam', uid: 'u1' } }, PG: {}, nav() {}, toast: (t, k) => toasts.push([t, k]), logActividad() {}, closeM() {}, isAdminUser: () => true, fmt: (n) => '$' + n };
  ctx.window = ctx;
  ctx.db = { collection() { return { doc() { return { set(d) { guardado.push(d); return Promise.resolve(); }, get() { return Promise.resolve({ exists: false }); } }; }, where() { return this; }, orderBy() { return this; }, limit() { return this; }, onSnapshot() { return () => {}; }, get() { return Promise.resolve({ docs: [] }); } }; } };
  vm.createContext(ctx);
  for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const hace = (h) => new Date(Date.now() - h * 3600000).toISOString();
  ctx._waComs = [{ id: 'k1', usuario: 'carlos', texto: 'MOTO', hora: hace(5), estado: 'respondido', respuesta: '¡Listo! Te escribí por mensaje directo 📩', respondidoEn: hace(5), palabraClave: 'moto', moto: 'EK XPRESS 150 LITE', privado: { enviado: true, igsid: '77001' } },
    { id: 'k4', usuario: 'ana', texto: 'moto', hora: hace(2), estado: 'respondido', palabraClave: 'moto', moto: '', privado: { enviado: true, igsid: '77002' }, respondidoEn: hace(2) },
    { id: 'c1', usuario: 'pepe', texto: '¿precio?', hora: hace(1), estado: 'respondido' }];
  ctx._waConvs = [{ id: 'ig:77001', canal: 'instagram', origenComentario: 'k1', ultimoEntranteHora: hace(4) }, { id: 'ig:77002', canal: 'instagram', origenComentario: 'k4' }];
  const sec = ctx._rsComentaMotoHtml({ comentaMoto: { activo: true, palabras: ['moto', 'info'] } }, true);
  ok('la ventana de Paola trae "Comenta MOTO" con su interruptor, las palabras y lo de la semana', /<h4>Comenta MOTO<\/h4>/.test(sec) && /Encendido\./.test(sec) && /id="rs-cm-on" checked/.test(sec) && /value="MOTO, INFO"/.test(sec) && /2 comentarios con la palabra, 2 mensajes directos, 1 respondió/.test(sec));
  ok('...apagada por defecto y sin poder tocarla si no es editable', /Apagado\./.test(ctx._rsComentaMotoHtml({}, false)) && /id="rs-cm-on" disabled/.test(ctx._rsComentaMotoHtml({}, false)) && /value="MOTO"/.test(ctx._rsComentaMotoHtml({}, false)));
  ok('va en la ventana de Paola (ventas), no en la de Patricia', /_rsComentaMotoHtml\(cfg, editable\) \+ _rsRepartoHtml/.test(fs.readFileSync(path.join(ROOT, 'modules', 'redes.js'), 'utf8')));
  // Guardar: interruptor + palabras
  Object.assign(el('rs-cm-on'), { checked: true, rsSw: true }); el('rs-cm-pal').value = ' MOTO, Info ,, ';
  ctx._waCfg = { responde: {}, calidad: {} };
  await ctx.rsGuardarAsistente('ventas');
  ok('guardar escribe comentaMoto { activo, palabras } en minúsculas y no lo mezcla con los canales', guardado.length === 1 && guardado[0].comentaMoto.activo === true && JSON.stringify(guardado[0].comentaMoto.palabras) === '["moto","info"]' && !('undefined' in guardado[0].responde) && !Object.keys(guardado[0].responde).length);
  el('rs-cm-pal').value = '  ';
  const r2 = ctx.rsGuardarAsistente('ventas');
  ok('encendido sin palabras no se guarda y avisa', r2 === false && guardado.length === 1 && toasts.some(t => /al menos una palabra/.test(t[0])));
  // Comentarios de Instagram: etiqueta, filtro y detalle
  ok('hay filtro "Comentaron MOTO"', ctx.RS_COM_FILTROS.some(f => f.id === 'clave' && f.f(ctx._waComs[0]) && !f.f(ctx._waComs[2])));
  ['rs-com-items', 'rs-com-filtros', 'rs-com-hilo', 'rs-com-ficha', 'rs-com-q'].forEach(el);
  ctx._rsComSel = 'k1'; ctx._rsPintarComentarios();
  ok('en la lista se ve "MOTO → DM"', /<span class="azul">MOTO → DM<\/span>/.test(els['rs-com-items'].innerHTML));
  ok('el detalle dice qué le mandó Paola y de qué moto, con la palabra en la ficha', /Comentó MOTO: Paola le mandó por mensaje directo el precio, la inicial y las cuotas de la EK XPRESS 150 LITE/.test(els['rs-com-hilo'].innerHTML) && /Palabra clave<\/span><span><span class="wa-pill azul">MOTO<\/span>/.test(els['rs-com-ficha'].innerHTML) && /Moto de la publicación<\/span><span>EK XPRESS 150 LITE/.test(els['rs-com-ficha'].innerHTML));
  ctx._rsComSel = 'k4'; ctx._rsPintarComentarios();
  ok('sin modelo reconocido lo explica', /la publicación no nombra un modelo del catálogo/.test(els['rs-com-hilo'].innerHTML) && /No se reconoció/.test(els['rs-com-ficha'].innerHTML));

  // Los globos de las pestañas con el número real (24-oct-2026: antes pasado 9 decía "9+")
  ok('los globos de las pestañas dicen el número real, sin "9+"', ctx._rsGlobo(47) === '<span class="b">47</span>' && ctx._rsGlobo(1234) === '<span class="b">1.234</span>' && ctx._rsGlobo(0) === '' && ctx._rsGlobo(3) === '<span class="b">3</span>');
  // El aviso de Patricia dice los mismos días que manda el servidor (functions/lib/recordatorios.js CUANDO)
  const R = require(path.join(F, 'recordatorios.js')), red = fs.readFileSync(path.join(ROOT, 'modules', 'redes.js'), 'utf8');
  ok('el aviso de los recordatorios dice "3 días antes", igual que el servidor', /3 días antes de vencer, el día del vencimiento y, si se atrasan, al día siguiente, a los 3 y a los 7 días/.test(red) && !/2 días antes de vencer/.test(red) && R.CUANDO.proximas({ dias: -3 }) && !R.CUANDO.proximas({ dias: -2 }) && R.CUANDO.gracia({ dias: 1 }) && R.CUANDO.gracia({ dias: 3 }) && R.CUANDO.atrasadas({ dias: 7 }));
  console.log(`\n${pass} OK · ${fail} fallas`);
  if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA (excepción) ' + (e && e.stack || e)); process.exitCode = 1; });
