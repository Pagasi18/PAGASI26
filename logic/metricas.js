// ══════════════════════════════════════════════════════════════════
// MÉTRICAS WEB · quién entra a la página pública y qué hace (14-oct-2026)
// ══════════════════════════════════════════════════════════════════
// assets/public/metricas.js guarda cada visita anónima en la colección "metricas" (sin
// nombres, cédulas ni teléfonos). Aquí se leen y se resumen. Solo administradores, o quien
// tenga el permiso "metricas".
// 23-oct-2026 (Adam: "mejórame el módulo de métricas al 100%"): comparación con el período
// anterior, lo que convierte cada fuente, moto, teléfono y página, tiempo en la página, los que
// se van sin hacer nada, los que vuelven otro día y un resumen con lo más importante.

var _met = { rango: 7, serie: 'personas', cargando: false, docs: null, desde: '', error: '', cargadoEn: 0, redes: null, redesCargando: false };
var MET_INICIO = '2026-10-14';   // se publicaron las métricas: antes no hay con qué comparar

function _metHoyVE(){
  try{ return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); }catch(e){ return new Date().toISOString().slice(0, 10); }
}
function _metHoraVE(){
  try{ return +new Date().toLocaleString('en-US', { timeZone: 'America/Caracas', hour: 'numeric', hour12: false }) % 24; }catch(e){ return new Date().getHours(); }
}
function _metRestarDias(iso, n){
  var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function metDesde(rango, hoyISO){ return _metRestarDias(hoyISO || _metHoyVE(), Math.max(0, (rango || 7) - 1)); }

// El período que se mira y el anterior del mismo largo. El último día del anterior se corta a la
// misma hora de hoy: hoy va por la mitad y compararlo con un día entero lo haría ver peor.
function metPeriodos(rango, hoyISO, horaAhora){
  rango = rango || 7;
  var desde = metDesde(rango, hoyISO), desdeAnt = _metRestarDias(desde, rango), hastaAnt = _metRestarDias(hoyISO, rango);
  return { desde: desde, hasta: hoyISO, desdeAnt: desdeAnt, hastaAnt: hastaAnt, horaTope: horaAhora, comparable: desdeAnt >= MET_INICIO };
}

// Se trae el doble del período para poder comparar con el anterior
function metCargar(rango, forzar){
  rango = rango || _met.rango;
  if(forzar) _met.redes = null;   // el botón ↻ también vuelve a traer Instagram y las conversaciones
  var desde = metDesde(rango * 2);
  if(_met.cargando) return Promise.resolve(_met);
  if(!forzar && _met.docs && _met.desde <= desde && (Date.now() - _met.cargadoEn) < 5 * 60 * 1000){ _met.rango = rango; return Promise.resolve(_met); }
  if(typeof db === 'undefined' || !db){ _met.error = 'Sin conexión a Firebase'; return Promise.resolve(_met); }
  _met.cargando = true; _met.rango = rango;
  return db.collection('metricas').where('fecha', '>=', desde).get().then(function(snap){
    var docs = []; snap.forEach(function(d){ var x = d.data() || {}; x._id = d.id; docs.push(x); });
    _met.docs = docs; _met.desde = desde; _met.error = ''; _met.cargadoEn = Date.now();
  }).catch(function(e){
    _met.error = (e && e.code === 'permission-denied') ? 'Las Reglas de Firebase todavía no dejan leer las métricas.' : ('No se pudieron leer las métricas: ' + (e && e.message || e));
  }).then(function(){
    _met.cargando = false;
    if(S.page === 'metricas' && typeof nav === 'function') nav('metricas');
    return _met;
  });
}

var MET_FUENTES = { instagram: 'Instagram', facebook: 'Facebook', google: 'Google', whatsapp: 'WhatsApp', directo: 'Directo (escribieron la dirección o un enlace guardado)', interno: 'Volvieron desde la misma página', buscador: 'Otros buscadores', tiktok: 'TikTok', chatgpt: 'ChatGPT', linkedin: 'LinkedIn', correo: 'Correo' };
var MET_PAGINAS = { index: 'Inicio', catalogo: 'Catálogo', simulador: 'Simulador', solicitar: 'Solicitud', nosotros: 'Nosotros' };
var MET_DISP = { telefono: 'Teléfono', computadora: 'Computadora', tablet: 'Tablet' };
var MET_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
// Las fuentes llegan con nombres distintos para lo mismo: "ig" es el enlace de la biografía de
// Instagram, "l.wl.co" es el enlace que abre WhatsApp, "chatgptcom" viene de ChatGPT
var MET_ALIAS = { ig: 'instagram', 'l.instagram.com': 'instagram', fb: 'facebook', 'm.facebook.com': 'facebook', 'l.facebook.com': 'facebook', 'lm.facebook.com': 'facebook',
  'l.wl.co': 'whatsapp', wa: 'whatsapp', chatgptcom: 'chatgpt', 'chatgpt.com': 'chatgpt', 'com.linkedin.android': 'linkedin', 'linkedin.com': 'linkedin', 'lnkd.in': 'linkedin',
  'com.google.android.googlequicksearchbox': 'google', 'com.google.android.gm': 'correo' };
function metFuente(f){
  f = String(f || 'directo').toLowerCase();
  if(MET_ALIAS[f]) return MET_ALIAS[f];
  if(/(^|\.)google\./.test(f)) return 'google';
  if(/bing|yahoo|duckduckgo|brave|ecosia|yandex/.test(f)) return 'buscador';
  if(/instagram/.test(f)) return 'instagram';
  if(/facebook|(^|\.)fb\./.test(f)) return 'facebook';
  if(/whatsapp|wa\.me/.test(f)) return 'whatsapp';
  if(/chatgpt|openai/.test(f)) return 'chatgpt';
  if(/tiktok/.test(f)) return 'tiktok';
  return f;
}

var _MET_ACCIONES = { ver_moto: 1, simulo: 1, quiero: 1, whatsapp: 1, filtro: 1, solicitud_inicio: 1, solicitud_enviada: 1 };
function _metGrupoNuevo(){ return { visitas: 0, personas: 0, moto: 0, simulo: 0, quiero: 0, whatsapp: 0, solEnviada: 0, contactos: 0, rebote: 0, _vids: {} }; }

// Resumen de las visitas entre dos fechas (incluidas). Con horaTope, el último día solo cuenta
// hasta esa hora (para comparar "a esta misma hora"). Funcion pura: la prueban los tests.
function metResumen(docs, desde, hasta, horaTope){
  var r = { visitas: 0, visitantes: 0, paginas: 0, porDia: {}, fuentes: {}, disp: { telefono: 0, computadora: 0, tablet: 0 }, horas: [], semana: [0, 0, 0, 0, 0, 0, 0], motos: {}, entradas: {},
            embudo: { visitas: 0, moto: 0, simulo: 0, quiero: 0, whatsapp: 0, solInicio: 0, solEnviada: 0 },
            contactos: 0, rebote: 0, tiempoTipico: 0, conTiempo: 0, volvieron: 0,
            grupos: { fuente: {}, disp: {}, entrada: {}, campana: {} }, motosDet: {},
            horasDet: { personas: [], visitas: [], whatsapp: [], solicitudes: [] } };
  for(var h = 0; h < 24; h++){ r.horas.push(0); r.horasDet.personas.push(0); r.horasDet.visitas.push(0); r.horasDet.whatsapp.push(0); r.horasDet.solicitudes.push(0); }
  var vids = {}, vidsDia = {}, diasDeVid = {}, durs = [], vidsHora = {};
  var sumar = function(tipo, clave, v, vid){
    var g = r.grupos[tipo][clave] = r.grupos[tipo][clave] || _metGrupoNuevo();
    g.visitas++; if(vid) g._vids[vid] = 1;
    ['moto', 'simulo', 'quiero', 'whatsapp', 'solEnviada', 'contactos', 'rebote'].forEach(function(k){ if(v[k]) g[k]++; });
  };
  (docs || []).forEach(function(d){
    var f = String(d.fecha || '');
    if(!f || f < desde || f > hasta) return;
    if(horaTope != null && f === hasta && +d.hora > horaTope) return;
    r.visitas++;
    if(d.vid){ vids[d.vid] = 1; (vidsDia[f] = vidsDia[f] || {})[d.vid] = 1; (diasDeVid[d.vid] = diasDeVid[d.vid] || {})[f] = 1; }
    var dia = r.porDia[f] = r.porDia[f] || { visitas: 0, visitantes: 0, whatsapp: 0, solicitudes: 0, contactos: 0 };
    dia.visitas++;
    var fu = metFuente(d.fuente); r.fuentes[fu] = (r.fuentes[fu] || 0) + 1;
    if(r.disp[d.disp] != null) r.disp[d.disp]++;
    var hr = +d.hora; if(hr >= 0 && hr < 24){ r.horas[hr]++; r.horasDet.visitas[hr]++; if(d.vid) (vidsHora[hr] = vidsHora[hr] || {})[d.vid] = 1; } else hr = -1;
    var dow = new Date(f + 'T12:00:00').getDay(); if(dow >= 0) r.semana[dow]++;
    var en = String(d.entrada || 'index'); r.entradas[en] = (r.entradas[en] || 0) + 1;
    var tiene = {}, vistasMoto = {}, simMoto = {}, quieroMoto = {}, waMoto = {}, nVistas = 0, acciones = false, ultimo = 0, primero = +d.inicio || 0;
    (Array.isArray(d.ev) ? d.ev : []).forEach(function(e){
      if(!e || !e.t) return;
      tiene[e.t] = 1;
      if(_MET_ACCIONES[e.t]) acciones = true;
      if(e.t === 'vista'){ r.paginas++; nVistas++; }
      var m = +e.m > 0 ? +e.m : 0;
      if(m && (e.t === 'vista' || e.t === 'ver_moto')) vistasMoto[m] = 1;
      if(m && e.t === 'simulo') simMoto[m] = 1;
      if(m && e.t === 'quiero') quieroMoto[m] = 1;
      if(m && e.t === 'whatsapp') waMoto[m] = 1;
      var ts = +e.ts || 0; if(ts > ultimo) ultimo = ts; if(ts && (!primero || ts < primero)) primero = ts;
    });
    // Tiempo en la página: del primer al último movimiento (con tope de 2 horas)
    if(primero && ultimo > primero) durs.push(Math.min(ultimo - primero, 2 * 3600 * 1000));
    Object.keys(vistasMoto).forEach(function(m){ r.motos[m] = (r.motos[m] || 0) + 1; });
    var todas = {}; [vistasMoto, simMoto, quieroMoto, waMoto].forEach(function(o){ Object.keys(o).forEach(function(m){ todas[m] = 1; }); });
    Object.keys(todas).forEach(function(m){
      var x = r.motosDet[m] = r.motosDet[m] || { vistas: 0, simulo: 0, quiero: 0, whatsapp: 0 };
      if(vistasMoto[m]) x.vistas++; if(simMoto[m]) x.simulo++; if(quieroMoto[m]) x.quiero++; if(waMoto[m]) x.whatsapp++;
    });
    var v = { moto: Object.keys(vistasMoto).length > 0, simulo: !!tiene.simulo, quiero: !!tiene.quiero, whatsapp: !!tiene.whatsapp, solEnviada: !!tiene.solicitud_enviada };
    v.contactos = v.whatsapp || v.solEnviada;
    v.rebote = nVistas <= 1 && !acciones;
    var E = r.embudo;
    E.visitas++;
    if(v.moto) E.moto++;
    if(v.simulo) E.simulo++;
    if(v.quiero) E.quiero++;
    if(v.whatsapp){ E.whatsapp++; dia.whatsapp++; if(hr >= 0) r.horasDet.whatsapp[hr]++; }
    if(tiene.solicitud_inicio) E.solInicio++;
    if(v.solEnviada){ E.solEnviada++; dia.solicitudes++; if(hr >= 0) r.horasDet.solicitudes[hr]++; }
    if(v.contactos){ r.contactos++; dia.contactos++; }
    if(v.rebote) r.rebote++;
    sumar('fuente', fu, v, d.vid);
    sumar('disp', MET_DISP[d.disp] ? d.disp : 'computadora', v, d.vid);
    sumar('entrada', en, v, d.vid);
    var camp = String(d.campana || '').trim() || (d.medio ? 'medio: ' + String(d.medio).trim() : '');
    if(camp) sumar('campana', camp.toLowerCase(), v, d.vid);
  });
  r.visitantes = Object.keys(vids).length;
  Object.keys(vidsHora).forEach(function(hh){ r.horasDet.personas[hh] = Object.keys(vidsHora[hh]).length; });
  r.volvieron = Object.keys(diasDeVid).filter(function(k){ return Object.keys(diasDeVid[k]).length > 1; }).length;
  Object.keys(r.porDia).forEach(function(f){ r.porDia[f].visitantes = Object.keys(vidsDia[f] || {}).length; });
  Object.keys(r.grupos).forEach(function(t){ Object.keys(r.grupos[t]).forEach(function(k){ var g = r.grupos[t][k]; g.personas = Object.keys(g._vids).length; delete g._vids; }); });
  durs.sort(function(a, b){ return a - b; });
  r.conTiempo = durs.length;
  r.tiempoTipico = durs.length ? Math.round((durs.length % 2 ? durs[(durs.length - 1) / 2] : (durs[durs.length / 2 - 1] + durs[durs.length / 2]) / 2) / 1000) : 0;
  return r;
}

// Cuánto cambió respecto al período anterior, en %. Sin datos antes: null (no se inventa).
function metCambio(a, b){ return b ? Math.round(((+a || 0) - b) / b * 100) : null; }

// "2 min 30 s"
function metTiempo(seg){
  seg = Math.round(+seg || 0);
  if(seg < 60) return seg + ' s';
  var m = Math.floor(seg / 60), s = seg % 60;
  return m < 60 ? m + ' min' + (s ? ' ' + s + ' s' : '') : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}

// Nombre de una moto por su numero (catalogo cargado en el sistema o el de la web)
function metNombreMoto(id){
  var m = (typeof _cat !== 'undefined' && _cat.motos || []).find(function(x){ return String(x.id) === String(id); })
       || (typeof PagasiCatalog !== 'undefined' && ((PagasiCatalog.base || []).concat(PagasiCatalog.baseProximos || []).find(function(x){ return String(x.id) === String(id); })));
  return m ? (m.name || m.modelo) : ('Moto ' + id);
}
function metNombreFuente(k){ return MET_FUENTES[k] || k; }
function _metHoraTexto(h){ return h === 0 ? '12 am' : h < 12 ? h + ' am' : h === 12 ? '12 pm' : (h - 12) + ' pm'; }

// Lo más importante del período, en palabras (máximo 4). Pura: la prueban los tests.
function metIdeas(r){
  var ideas = [], pc = function(a, b){ return b ? Math.round(a / b * 100) : 0; };
  if(!r || !r.visitas) return ideas;
  var fuentes = Object.keys(r.grupos.fuente).map(function(k){ return [k, r.grupos.fuente[k]]; });
  var masVisitas = fuentes.slice().sort(function(a, b){ return b[1].visitas - a[1].visitas; })[0];
  if(masVisitas) ideas.push((pc(masVisitas[1].visitas, r.visitas) > 50 ? 'La mayoría llega por <b>' : 'Por donde más gente llega: <b>') + metNombreFuente(masVisitas[0]) + '</b>, ' + pc(masVisitas[1].visitas, r.visitas) + '% de las visitas.');
  var promedio = pc(r.contactos, r.visitas);
  var mejor = fuentes.filter(function(f){ return f[1].visitas >= 20 && f[0] !== 'interno'; }).sort(function(a, b){ return b[1].contactos / b[1].visitas - a[1].contactos / a[1].visitas; })[0];
  if(mejor && mejor[1].contactos && pc(mejor[1].contactos, mejor[1].visitas) > promedio) ideas.push('Las visitas que más escriben vienen de <b>' + metNombreFuente(mejor[0]) + '</b>: ' + pc(mejor[1].contactos, mejor[1].visitas) + '% escribe por WhatsApp o pide el crédito (el promedio es ' + promedio + '%).');
  var E = r.embudo, pasos = [['entrar', E.visitas], ['mirar una moto', E.moto], ['usar el simulador', E.simulo], ['tocar "La quiero"', E.quiero], ['empezar la solicitud', E.solInicio], ['enviarla', E.solEnviada]];
  var peor = null;
  for(var i = 1; i < pasos.length; i++){ if(pasos[i - 1][1] >= 10){ var t = pasos[i][1] / pasos[i - 1][1]; if(!peor || t < peor.t) peor = { t: t, de: pasos[i - 1][0], a: pasos[i][0] }; } }
  if(peor) ideas.push('Donde más gente se pierde: de <b>' + peor.de + '</b> a <b>' + peor.a + '</b> (solo sigue el ' + Math.round(peor.t * 100) + '%).');
  var motos = Object.keys(r.motosDet).map(function(k){ return [k, r.motosDet[k]]; }).sort(function(a, b){ return b[1].vistas - a[1].vistas; });
  if(motos[0] && motos[0][1].vistas){
    var hp = r.horas.indexOf(Math.max.apply(null, r.horas));
    ideas.push('La moto más vista: <b>' + metNombreMoto(motos[0][0]) + '</b> (' + motos[0][1].vistas + ' visitas). La hora con más visitas: <b>' + _metHoraTexto(hp) + '</b>.');
  }
  return ideas.slice(0, 4);
}

// ── Instagram, el WhatsApp de ventas y los vendedores (5-nov-2026) ──
// Adam: "en métricas web no veo nada de instagram… pon una chart de cuánta gente escribe vs cuánta gente
// responde, quiénes son los vendedores que más responden, quiénes son los que más venden". Lo de Instagram
// y las conversaciones vive en la compañía conectada a Meta (pagasi.io): seguidores y publicaciones en
// config/redesMetricas (las guarda el servidor cada 2 horas) y las conversaciones de ventas (Instagram y
// el WhatsApp de ventas, que es lo que dejan leer las Reglas). Las ventas por vendedor salen de los créditos.
function _metDiaVE(iso){
  if(!iso) return '';
  try{ return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); }catch(e){ return String(iso).slice(0, 10); }
}
function metCargarRedes(forzar){
  if(typeof db === 'undefined' || !db) return Promise.resolve(null);
  if(!forzar && _met.redes && (Date.now() - _met.redes.cargadoEn) < 5 * 60 * 1000) return Promise.resolve(_met.redes);
  if(_met.redesCargando) return Promise.resolve(null);
  _met.redesCargando = true;
  var lee = function(q){ return q.get().then(function(s){ return s.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); }); }).catch(function(){ return null; }); };
  var convs = db.collection('conversaciones');
  var cfg = typeof waCargarCfg === 'function' ? new Promise(function(res){ waCargarCfg(res); }) : Promise.resolve(null);
  return Promise.all([
    db.collection('config').doc('redesMetricas').get().then(function(d){ return d.exists ? d.data() : null; }).catch(function(){ return null; }),
    lee(convs.where('canal', '==', 'instagram').orderBy('actualizado', 'desc').limit(1000)),
    lee(convs.where('canal', '==', 'whatsapp').where('area', '==', 'ventas').orderBy('actualizado', 'desc').limit(1000)),
    cfg
  ]).then(function(r){
    _met.redesCargando = false;
    var todas = (r[1] || []).concat(r[2] || []);
    _met.redes = { cargadoEn: Date.now(), ig: r[0], convs: todas, sinPermiso: r[1] === null && r[2] === null, conectado: r[3] ? !!(r[3].conectado || r[3].instagram) : todas.length > 0 };
    return _met.redes;
  }).catch(function(){ _met.redesCargando = false; return null; });
}
// El resumen del período: cuánta gente escribió, a cuántos les contestó una persona (no Paola), por día,
// por vendedor, y las ventas de cada vendedor (créditos de la compañía)
function metRedesResumen(redes, desde, hasta, creds){
  var atendida = function(c){ return !!(c.ultimaRespuesta || c.ultimoAutor === 'equipo' || c.modo === 'humano' || (c.vendedor && String(c.vendedor).trim())); };
  var lead = function(c){ return !!(c.borrador && c.borrador.tipo === 'lead'); };
  var vendedorDe = function(c){ if(c.vendedor != null && String(c.vendedor).trim()) return String(c.vendedor).trim(); return c.modo === 'humano' ? String(c.atendidoPor || '').trim() : ''; };
  var todas = (redes && redes.convs) || [];
  var convs = todas.filter(function(c){ var f = _metDiaVE(c.creado || c.ultimoMensajeHora); return f >= desde && f <= hasta; });
  var porDia = {}, vend = {};
  convs.forEach(function(c){
    var f = _metDiaVE(c.creado || c.ultimoMensajeHora), d = porDia[f] = porDia[f] || { escribieron: 0, atendidas: 0 };
    d.escribieron++; if(atendida(c)) d.atendidas++;
    var v = vendedorDe(c); if(!v) return;
    var r = vend[v] = vend[v] || { nombre: v, conversaciones: 0, atendidas: 0, quieren: 0, tiempos: [] };
    r.conversaciones++; if(atendida(c)) r.atendidas++; if(lead(c)) r.quieren++;
    if(c.ultimaRespuesta && c.ultimaRespuesta.desde && c.ultimaRespuesta.hasta){ var m = (new Date(c.ultimaRespuesta.hasta) - new Date(c.ultimaRespuesta.desde)) / 60000; if(m >= 0) r.tiempos.push(m); }
  });
  var mediana = function(a){ if(!a.length) return null; var s = a.slice().sort(function(x, y){ return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  var responden = Object.keys(vend).map(function(k){ var r = vend[k]; return { nombre: r.nombre, conversaciones: r.conversaciones, atendidas: r.atendidas, quieren: r.quieren, minutos: mediana(r.tiempos) }; })
    .sort(function(a, b){ return b.atendidas - a.atendidas || b.conversaciones - a.conversaciones || a.nombre.localeCompare(b.nombre); });
  var ventas = {};
  (creds || []).forEach(function(c){
    if(!c || c.eliminado || c.estado === 'cancelado' || c.estado === 'pendiente_revision') return;
    var v = String(c.vendedorNombre || c.creadoPor || '').trim(); if(!v) return;
    var f = String(c.fecha || '').slice(0, 10), r = ventas[v] = ventas[v] || { nombre: v, periodo: 0, financiado: 0, total: 0 };
    r.total++; if(f >= desde && f <= hasta){ r.periodo++; r.financiado += parseFloat(c.fin) || 0; }
  });
  var venden = Object.keys(ventas).map(function(k){ return ventas[k]; }).sort(function(a, b){ return b.periodo - a.periodo || b.total - a.total || a.nombre.localeCompare(b.nombre); });
  var ig = redes && redes.ig && redes.ig.instagram ? redes.ig.instagram : null, sd = (redes && redes.ig && redes.ig.seguidoresDias) || {};
  var fechas = Object.keys(sd).sort(), base = fechas.filter(function(f){ return f <= desde; }).pop() || fechas[0];
  return {
    escribieron: convs.length, instagram: convs.filter(function(c){ return c.canal === 'instagram'; }).length, whatsapp: convs.filter(function(c){ return c.canal !== 'instagram'; }).length,
    atendidas: convs.filter(atendida).length, quieren: convs.filter(lead).length, sinVendedor: convs.filter(function(c){ return !vendedorDe(c); }).length,
    porDia: porDia, responden: responden, venden: venden,
    ig: ig ? { seguidores: ig.seguidores || 0, publicaciones: ig.publicaciones || (ig.posts || []).length, crecimiento: (base && sd[base] != null && ig.seguidores != null) ? ig.seguidores - sd[base] : null, desdeCuando: base || '', actualizado: redes.ig.actualizado || '' } : null
  };
}
