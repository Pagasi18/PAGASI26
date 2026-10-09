// ══════════════════════════════════════════════════════════════════
// CUMPLIMIENTO LC/FT · revision de listas, PEP y efectivo (9-oct-2026)
// ══════════════════════════════════════════════════════════════════
// PAGASI es sujeto obligado de la LOCDOFT (art. 9, num. 10, lit. h: compraventa de
// vehiculos automotores terrestres). Su manual de prevencion exige:
//  · revisar a cada cliente contra la lista SDN de OFAC y la Lista Consolidada de la
//    ONU al crearlo y al darle un credito, y toda la cartera al menos una vez al mes;
//  · preguntar si es Persona Expuesta Politicamente (art. 18) y que el Oficial de
//    Cumplimiento apruebe a los PEP antes de firmar;
//  · informar a la UNIF todas las transacciones en efectivo del mes (art. 17).
// Las listas las baja cada dia bot/listas-sanciones.js a data/listas-sanciones.json.
// Lo que encuentra se guarda en la ficha (aml_listas). Solo un administrador (el Oficial
// de Cumplimiento) descarta o confirma una coincidencia, siempre con una nota.

var AML_URL_LISTAS = 'data/listas-sanciones.json';
var AML_UMBRAL_EFECTIVO = 1000;   // US$: desde aqui el manual pide declarar el origen
var _amlListas = null, _amlCargando = null;

// Misma normalizacion que bot/listas-sanciones.js (si cambia alla, cambia aqui)
var _AML_VACIAS = { DE:1, DEL:1, LA:1, LAS:1, LOS:1, Y:1 };
function amlNorm(s){
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/)
    .filter(function(t){ return t.length >= 2 && !_AML_VACIAS[t]; }).join(' ');
}
function amlDigitos(ced){ return String(ced == null ? '' : ced).replace(/[^\d]/g, '').replace(/^0+/, ''); }

// Indice por palabra y por documento, para no comparar cada cliente con 8.000 personas
function amlPrepararListas(datos){
  var e = (datos && datos.e) || [], porPalabra = Object.create(null), porDoc = Object.create(null);
  e.forEach(function(x, i){
    (x[6] || []).forEach(function(n){
      n.split(' ').forEach(function(t){ (porPalabra[t] || (porPalabra[t] = [])).push(i); });
    });
    (x[5] || []).forEach(function(d){ (porDoc[d] || (porDoc[d] = [])).push(i); });
  });
  return { e: e, porPalabra: porPalabra, porDoc: porDoc, generado: (datos && datos.generado) || '', fuentes: (datos && datos.fuentes) || {} };
}
function amlCargarListas(){
  if(_amlListas) return Promise.resolve(_amlListas);
  if(_amlCargando) return _amlCargando;
  _amlCargando = fetch(AML_URL_LISTAS + '?d=' + new Date().toISOString().slice(0, 10))
    .then(function(r){ if(!r.ok) throw new Error('No se pudieron cargar las listas de sanciones (' + r.status + ')'); return r.json(); })
    .then(function(d){ _amlListas = amlPrepararListas(d); _amlCargando = null; return _amlListas; })
    .catch(function(err){ _amlCargando = null; throw err; });
  return _amlCargando;
}

// Coincidencias de una persona. Tipos, de mas a menos fuerte:
//  'documento'  la cedula aparece en la lista (y al menos una palabra del nombre coincide)
//  'nombre'     el nombre de la lista (3+ palabras) esta completo en el del cliente
//  'parcial'    nombre de lista de 2 palabras completo, o 3 de 4+ palabras
function amlBuscar(nombre, cedula, L){
  if(!L) return [];
  var C = amlNorm(nombre).split(' ').filter(Boolean), setC = Object.create(null);
  C.forEach(function(t){ setC[t] = 1; });
  var doc = amlDigitos(cedula), vistos = Object.create(null), out = [];
  var candidatos = Object.create(null);
  C.forEach(function(t){ (L.porPalabra[t] || []).forEach(function(i){ candidatos[i] = 1; }); });
  if(doc.length >= 6) (L.porDoc[doc] || []).forEach(function(i){ candidatos[i] = 1; });
  Object.keys(candidatos).forEach(function(k){
    var x = L.e[+k]; if(!x || vistos[x[0]]) return;
    var mejor = '', comunes = 0;
    (x[6] || []).forEach(function(n){
      var T = n.split(' '), dentro = T.filter(function(t){ return setC[t]; }).length;
      comunes = Math.max(comunes, dentro);
      if(T.length >= 3 && dentro === T.length) mejor = 'nombre';
      else if(!mejor && ((T.length === 2 && dentro === 2) || (T.length >= 4 && dentro >= 3))) mejor = 'parcial';
    });
    if(doc.length >= 6 && (x[5] || []).indexOf(doc) > -1 && comunes >= 1) mejor = 'documento';
    if(!mejor) return;
    vistos[x[0]] = 1;
    out.push({ id: x[0], lista: x[1], nombre: x[2], programa: x[3], detalle: x[4], tipo: mejor });
  });
  var peso = { documento: 0, nombre: 1, parcial: 2 };
  return out.sort(function(a, b){ return peso[a.tipo] - peso[b.tipo]; });
}

// Resultado para la ficha. Una coincidencia que el oficial ya descarto (o confirmo) no
// vuelve a saltar mientras sean las mismas personas de la lista; una nueva, si.
function amlResultado(c, coincidencias, L, quien){
  var prev = (c && c.aml_listas) || null, ids = coincidencias.map(function(x){ return x.id; }).sort();
  var r = { fecha: new Date().toISOString(), listas: (L && L.generado) || '', revisadoPor: quien || '',
            resultado: ids.length ? 'coincidencia' : 'limpio', coincidencias: coincidencias, estado: '' };
  if(ids.length){
    var resueltos = (prev && (prev.estado === 'descartada' || prev.estado === 'confirmada') && prev.idsResueltos) || [];
    var todosVistos = ids.every(function(id){ return resueltos.indexOf(id) > -1; });
    if(todosVistos){
      r.estado = prev.estado; r.nota = prev.nota || ''; r.resueltoPor = prev.resueltoPor || ''; r.resueltoEn = prev.resueltoEn || ''; r.idsResueltos = resueltos;
    } else r.estado = 'pendiente';
  }
  return r;
}
function _amlQuien(){ return (S.currentUser && (S.currentUser.nombre || S.currentUser.email)) || 'Sistema'; }
function _amlGuardar(c, r){
  c.aml_listas = r;
  if(typeof DB !== 'undefined' && DB && DB.saveCliente) return DB.saveCliente({ id: c.id, aml_listas: r });
  return Promise.resolve(false);
}
// Revisa un cliente y guarda el resultado. Devuelve el resultado (o null si no se pudo).
function amlRevisarCliente(c, opts){
  opts = opts || {};
  if(!c || c.eliminado || !c.nombre) return Promise.resolve(null);
  return amlCargarListas().then(function(L){
    var r = amlResultado(c, amlBuscar(c.nombre, c.cedula || c.ci, L), L, _amlQuien());
    return Promise.resolve(_amlGuardar(c, r)).then(function(){
      if(!opts.silencio && r.estado === 'pendiente' && typeof toast === 'function')
        toast('⚠️ ' + c.nombre + ': posible coincidencia en lista de sanciones. No entregar la moto hasta que el Oficial de Cumplimiento la revise.', 'warn');
      return r;
    });
  }).catch(function(err){
    console.warn('revision de listas:', err && err.message);
    if(!opts.silencio && typeof toast === 'function') toast('No se pudo revisar ' + c.nombre + ' contra las listas de sanciones: se revisa en Cumplimiento', 'warn');
    return null;
  });
}
// Lo llaman el formulario de cliente y el asistente despues de guardar. No bloquea nada.
function amlTrasGuardarCliente(c){
  try{ if(c && c.id) amlRevisarCliente(c); }catch(e){ console.warn('aml tras guardar:', e && e.message); }
}
function amlRevisarCartera(){
  var lista = (S.clientes || []).filter(function(c){ return c && !c.eliminado && c.nombre; });
  return amlCargarListas().then(function(L){
    var pend = 0, nuevas = 0;
    var cola = lista.map(function(c){
      var antes = c.aml_listas && c.aml_listas.estado;
      var r = amlResultado(c, amlBuscar(c.nombre, c.cedula || c.ci, L), L, _amlQuien());
      if(r.estado === 'pendiente'){ pend++; if(antes !== 'pendiente') nuevas++; }
      return _amlGuardar(c, r);
    });
    return Promise.all(cola).then(function(){ return { revisados: lista.length, pendientes: pend, nuevas: nuevas, listas: L.generado }; });
  });
}

// ── Lo que hace el Oficial de Cumplimiento ───────────────────────────────
function _amlEsOficial(){ return typeof isAdminUser !== 'function' || isAdminUser(); }
function amlResolver(cid, accion, nota){
  if(!_amlEsOficial()){ if(typeof toast === 'function') toast('Solo el Oficial de Cumplimiento (un administrador) resuelve coincidencias', 'error'); return false; }
  var c = (S.clientes || []).find(function(x){ return String(x.id) === String(cid); });
  if(!c || !c.aml_listas || !c.aml_listas.coincidencias || !c.aml_listas.coincidencias.length) return false;
  if(nota == null && typeof prompt === 'function'){
    nota = prompt(accion === 'confirmar'
      ? 'CONFIRMAR coincidencia de ' + c.nombre + '.\n\nNo se continúa la relación, se conserva todo y se reporta a la UNIF. No se le avisa al cliente.\n\nNota (obligatoria):'
      : 'DESCARTAR coincidencia de ' + c.nombre + ' (no es la misma persona).\n\n¿Por qué? (obligatorio: cédula distinta, fecha de nacimiento, nacionalidad...):');
  }
  if(!nota || !String(nota).trim()){ if(typeof toast === 'function') toast('Hace falta una nota para resolverla', 'error'); return false; }
  var r = Object.assign({}, c.aml_listas, {
    estado: accion === 'confirmar' ? 'confirmada' : 'descartada', nota: String(nota).trim(),
    resueltoPor: _amlQuien(), resueltoEn: new Date().toISOString(),
    idsResueltos: c.aml_listas.coincidencias.map(function(x){ return x.id; }).sort()
  });
  _amlGuardar(c, r);
  if(typeof logActividad === 'function') logActividad('aml_' + (accion === 'confirmar' ? 'confirmada' : 'descartada'), 'cumplimiento', String(c.id), { nota: r.nota });
  if(typeof toast === 'function') toast(accion === 'confirmar' ? 'Coincidencia confirmada: reportar a la UNIF' : 'Coincidencia descartada', accion === 'confirmar' ? 'warn' : 'success');
  return true;
}
function amlAprobarPep(cid){
  if(!_amlEsOficial()){ if(typeof toast === 'function') toast('Solo el Oficial de Cumplimiento (un administrador) aprueba clientes PEP', 'error'); return false; }
  var c = (S.clientes || []).find(function(x){ return String(x.id) === String(cid); });
  if(!c || c.pep !== 'si') return false;
  if(typeof confirm === 'function' && !confirm('Aprobar a ' + c.nombre + ' (PEP).\n\nConfirma que hiciste la debida diligencia reforzada: origen de los fondos y del patrimonio, búsqueda en fuentes abiertas y documentos.')) return false;
  c.pep_aprobadoPor = _amlQuien(); c.pep_aprobadoEn = new Date().toISOString();
  if(typeof DB !== 'undefined' && DB && DB.saveCliente) DB.saveCliente({ id: c.id, pep_aprobadoPor: c.pep_aprobadoPor, pep_aprobadoEn: c.pep_aprobadoEn });
  if(typeof logActividad === 'function') logActividad('aml_pep_aprobado', 'cumplimiento', String(c.id), {});
  if(typeof toast === 'function') toast('Cliente PEP aprobado', 'success');
  return true;
}

// ── Efectivo (art. 17: todas las transacciones en efectivo del mes, a la UNIF) ──
function amlEsEfectivo(p){ return /efectivo|cash/i.test(String((p && (p.metodo || p.cuenta)) || '')); }
function _amlCliDePago(p){
  var cr = (S.creds || []).find(function(x){ return x && x.id === p.cred; });
  var cid = cr && (cr.clienteId || cr.cliId);
  return (S.clientes || []).find(function(c){ return cid != null && String(c.id) === String(cid); })
      || (S.clientes || []).find(function(c){ return c.nombre && c.nombre === (p.cli || (cr && cr.cli)); }) || null;
}
function amlEfectivoDelMes(mes){
  return (S.pagos || []).filter(function(p){
    return p && !p.eliminado && (p.estado || 'confirmado') === 'confirmado' && amlEsEfectivo(p) && String(p.fecha || '').slice(0, 7) === mes;
  }).map(function(p){
    var c = _amlCliDePago(p);
    return { fecha: p.fecha, cliente: p.cli || (c && c.nombre) || '', cedula: (c && (c.cedula || c.ci)) || '', credito: p.cred || '',
             monto: parseFloat(p.monto) || 0, tipo: (p.esInicial || p.tipoOperacion === 'inicial_credito') ? 'Inicial' : (p.tipo === 'liquidacion' ? 'Cancelación anticipada' : 'Cuota'),
             recibidoPor: p.cobrador || p.realizadoPor || '', referencia: p.referencia || '', id: p.id };
  }).sort(function(a, b){ return String(a.fecha).localeCompare(String(b.fecha)); });
}
function amlEfectivoCSV(mes){
  var filas = amlEfectivoDelMes(mes), q = function(v){ var s = String(v == null ? '' : v); if(/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  var head = ['Fecha', 'Cliente', 'Cédula', 'Crédito', 'Tipo', 'Monto USD', 'Recibido por', 'Referencia', 'Id pago'];
  return [head.map(q).join(',')].concat(filas.map(function(f){
    return [f.fecha, f.cliente, f.cedula, f.credito, f.tipo, f.monto.toFixed(2), f.recibidoPor, f.referencia, f.id].map(q).join(',');
  })).join('\n');
}
function amlDescargarEfectivo(mes){
  var csv = '﻿' + amlEfectivoCSV(mes);
  try{
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'efectivo-' + mes + '-PAGASI.csv'; document.body.appendChild(a); a.click(); a.remove();
  }catch(e){ console.warn('descargar efectivo:', e && e.message); }
  if(typeof logActividad === 'function') logActividad('aml_reporte_efectivo', 'cumplimiento', mes, {});
}

// ── Alertas para el oficial ────────────────────────────────────────────
function amlAlertas(hoyISO){
  var hoy = hoyISO ? new Date(hoyISO + 'T12:00:00') : new Date(), desde = new Date(hoy.getTime() - 90 * 864e5).toISOString().slice(0, 10);
  var out = [];
  (S.pagos || []).forEach(function(p){
    if(!p || p.eliminado || (p.estado || 'confirmado') !== 'confirmado' || String(p.fecha || '') < desde) return;
    var monto = parseFloat(p.monto) || 0;
    if(amlEsEfectivo(p) && monto >= AML_UMBRAL_EFECTIVO)
      out.push({ tipo: 'efectivo', fecha: p.fecha, cliente: p.cli, credito: p.cred, texto: 'Pago en efectivo de US$ ' + monto.toFixed(2) + ': pedir y guardar el origen de los fondos' });
    if(p.tipo === 'liquidacion')
      out.push({ tipo: 'liquidacion', fecha: p.fecha, cliente: p.cli, credito: p.cred, texto: 'Cancelación anticipada (US$ ' + monto.toFixed(2) + (amlEsEfectivo(p) ? ', en efectivo' : '') + '): revisar el origen del dinero' });
  });
  var conCredito = Object.create(null);
  (S.creds || []).forEach(function(cr){ if(cr && !cr.eliminado && (cr.estado === 'activo' || cr.estado === 'mora')) conCredito[String(cr.clienteId || cr.cliId || '')] = cr.id; });
  (S.clientes || []).forEach(function(c){
    if(!c || c.eliminado || !conCredito[String(c.id)]) return;
    var r = c.aml_listas, vieja = !r || !r.fecha || (hoy.getTime() - new Date(r.fecha).getTime()) > 35 * 864e5;
    if(vieja) out.push({ tipo: 'sin_revision', fecha: r && r.fecha ? String(r.fecha).slice(0, 10) : '', cliente: c.nombre, credito: conCredito[String(c.id)], texto: r ? 'Hace más de un mes que no se revisa contra las listas' : 'Nunca se revisó contra las listas de sanciones' });
  });
  return out.sort(function(a, b){ return String(b.fecha).localeCompare(String(a.fecha)); });
}
function amlPendientes(){
  return (S.clientes || []).filter(function(c){ return c && !c.eliminado && ((c.aml_listas && c.aml_listas.estado === 'pendiente') || (c.pep === 'si' && !c.pep_aprobadoEn)); }).length;
}

// ── En la ficha del cliente ────────────────────────────────────────────
function _amlEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]; }); }
function _amlFichaHtml(c){
  if(!c) return '';
  var r = c.aml_listas, partes = [], id = String(c.id).replace(/[^A-Za-z0-9_-]/g, ''), oficial = _amlEsOficial();
  if(r && r.estado === 'pendiente'){
    partes.push('<div style="font-weight:800;color:var(--red)">Posible coincidencia en lista de sanciones · no entregar la moto ni firmar hasta que el Oficial de Cumplimiento la revise</div>'
      + (r.coincidencias || []).map(function(x){ return '<div style="font-size:12px;margin-top:4px">' + _amlEsc(x.lista) + ' · <b>' + _amlEsc(x.nombre) + '</b> · ' + _amlEsc(x.programa) + (x.detalle ? ' · ' + _amlEsc(x.detalle) : '') + ' · coincide por ' + _amlEsc(x.tipo) + '</div>'; }).join('')
      + (oficial ? '<div style="display:flex;gap:6px;margin-top:8px"><button type="button" class="btn btn-g btn-xs" onclick="amlResolver(\'' + id + '\',\'descartar\');closeM();verCliente(\'' + id + '\')">Descartar (no es la misma persona)</button><button type="button" class="btn btn-d btn-xs" onclick="amlResolver(\'' + id + '\',\'confirmar\');closeM();verCliente(\'' + id + '\')">Confirmar</button></div>' : ''));
  } else if(r && r.estado === 'confirmada'){
    partes.push('<div style="font-weight:800;color:var(--red)">Coincidencia CONFIRMADA en lista de sanciones · no continuar la relación · reportar a la UNIF · no avisar al cliente</div><div style="font-size:12px;margin-top:4px">' + _amlEsc(r.nota) + ' · ' + _amlEsc(r.resueltoPor) + '</div>');
  }
  if(c.pep === 'si'){
    partes.push('<div style="font-weight:800;color:var(--amber)">Persona expuesta políticamente' + (c.pep_detalle ? ': ' + _amlEsc(c.pep_detalle) : '') + '</div>'
      + (c.pep_aprobadoEn ? '<div style="font-size:12px;margin-top:2px">Aprobado por ' + _amlEsc(c.pep_aprobadoPor) + ' · ' + _amlEsc(String(c.pep_aprobadoEn).slice(0, 10)) + '</div>'
        : '<div style="font-size:12px;margin-top:2px">Falta la aprobación del Oficial de Cumplimiento (debida diligencia reforzada)</div>'
          + (oficial ? '<button type="button" class="btn btn-g btn-xs" style="margin-top:6px" onclick="amlAprobarPep(\'' + id + '\');closeM();verCliente(\'' + id + '\')">Aprobar PEP</button>' : '')));
  }
  if(!partes.length) return '';
  return '<div class="cf-section" style="border-left:3px solid var(--red);margin-bottom:12px"><div class="cf-section-h"><div class="cf-section-t">Cumplimiento</div></div>' + partes.join('<div style="height:10px"></div>') + '</div>';
}
