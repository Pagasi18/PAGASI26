// ══════════════════════════════════════════════════════════════════
// MÉTRICAS WEB · quién entra a la página pública y qué hace (14-oct-2026)
// ══════════════════════════════════════════════════════════════════
// assets/public/metricas.js guarda cada visita anónima en la colección "metricas" (sin
// nombres, cédulas ni teléfonos). Aquí se leen y se resumen. Solo administradores, o quien
// tenga el permiso "metricas".

var _met = { rango: 7, cargando: false, docs: null, desde: '', error: '', cargadoEn: 0 };

function _metHoyVE(){
  try{ return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); }catch(e){ return new Date().toISOString().slice(0, 10); }
}
function _metRestarDias(iso, n){
  var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function metDesde(rango, hoyISO){ return _metRestarDias(hoyISO || _metHoyVE(), Math.max(0, (rango || 7) - 1)); }

function metCargar(rango, forzar){
  rango = rango || _met.rango;
  var desde = metDesde(rango);
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

var MET_FUENTES = { instagram: 'Instagram', facebook: 'Facebook', google: 'Google', whatsapp: 'WhatsApp', directo: 'Directo (escribieron la dirección o un enlace guardado)', interno: 'Volvieron desde la misma página', buscador: 'Otros buscadores', tiktok: 'TikTok' };
var MET_PAGINAS = { index: 'Inicio', catalogo: 'Catálogo', simulador: 'Simulador', solicitar: 'Solicitud', nosotros: 'Nosotros' };

// Resumen de las visitas entre dos fechas (incluidas). Funcion pura: la prueban los tests.
function metResumen(docs, desde, hasta){
  var r = { visitas: 0, visitantes: 0, paginas: 0, porDia: {}, fuentes: {}, disp: { telefono: 0, computadora: 0, tablet: 0 }, horas: [], motos: {}, entradas: {},
            embudo: { visitas: 0, moto: 0, simulo: 0, quiero: 0, whatsapp: 0, solInicio: 0, solEnviada: 0 } };
  for(var h = 0; h < 24; h++) r.horas.push(0);
  var vids = {}, vidsDia = {};
  (docs || []).forEach(function(d){
    var f = String(d.fecha || '');
    if(!f || f < desde || f > hasta) return;
    r.visitas++;
    if(d.vid){ vids[d.vid] = 1; (vidsDia[f] = vidsDia[f] || {})[d.vid] = 1; }
    var dia = r.porDia[f] = r.porDia[f] || { visitas: 0, visitantes: 0 };
    dia.visitas++;
    var fu = String(d.fuente || 'directo'); r.fuentes[fu] = (r.fuentes[fu] || 0) + 1;
    if(r.disp[d.disp] != null) r.disp[d.disp]++;
    var hr = +d.hora; if(hr >= 0 && hr < 24) r.horas[hr]++;
    var en = String(d.entrada || 'index'); r.entradas[en] = (r.entradas[en] || 0) + 1;
    var tiene = {}, vistasMoto = {};
    (Array.isArray(d.ev) ? d.ev : []).forEach(function(e){
      if(!e || !e.t) return;
      tiene[e.t] = 1;
      if(e.t === 'vista') r.paginas++;
      if((e.t === 'vista' || e.t === 'ver_moto') && +e.m > 0) vistasMoto[+e.m] = 1;
    });
    Object.keys(vistasMoto).forEach(function(m){ r.motos[m] = (r.motos[m] || 0) + 1; });
    var E = r.embudo;
    E.visitas++;
    if(Object.keys(vistasMoto).length) E.moto++;
    if(tiene.simulo) E.simulo++;
    if(tiene.quiero) E.quiero++;
    if(tiene.whatsapp) E.whatsapp++;
    if(tiene.solicitud_inicio) E.solInicio++;
    if(tiene.solicitud_enviada) E.solEnviada++;
  });
  r.visitantes = Object.keys(vids).length;
  Object.keys(r.porDia).forEach(function(f){ r.porDia[f].visitantes = Object.keys(vidsDia[f] || {}).length; });
  return r;
}
// Nombre de una moto por su numero (catalogo cargado en el sistema o el de la web)
function metNombreMoto(id){
  var m = (typeof _cat !== 'undefined' && _cat.motos || []).find(function(x){ return String(x.id) === String(id); })
       || (typeof PagasiCatalog !== 'undefined' && ((PagasiCatalog.base || []).concat(PagasiCatalog.baseProximos || []).find(function(x){ return String(x.id) === String(id); })));
  return m ? (m.name || m.modelo) : ('Moto ' + id);
}
