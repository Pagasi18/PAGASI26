// Pagasi module: cumplimiento (programa LC/FT, 9-oct-2026). Solo administradores: el
// Oficial de Cumplimiento ve aqui lo que tiene que resolver y saca el reporte de efectivo.
function _cumMesAnterior(){ var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function cumRevisarCartera(){
  if(typeof isAdminUser === 'function' && !isAdminUser()){ toast('Solo un administrador revisa la cartera', 'error'); return; }
  toast('Revisando toda la cartera contra OFAC y ONU…', 'info');
  amlRevisarCartera().then(function(r){
    if(typeof logActividad === 'function') logActividad('aml_revision_cartera', 'cumplimiento', '', r);
    toast('Listo: ' + r.revisados + ' clientes y ' + (r.fiadores || 0) + ' fiadores revisados · ' + r.pendientes + ' coincidencia' + (r.pendientes === 1 ? '' : 's') + ' por revisar', r.pendientes ? 'warn' : 'success');
    nav('cumplimiento');
  }).catch(function(e){ toast('No se pudo revisar: ' + (e && e.message || e), 'error'); });
}
function cumCambiarMes(v){ window._cumMes = v; nav('cumplimiento'); }
PG.cumplimiento = function(){
  if(typeof isAdminUser === 'function' && !isAdminUser()) return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">Solo el Oficial de Cumplimiento (un administrador) entra aquí.</div></div>';
  if(!_amlListas && !window._cumCargando){
    window._cumCargando = true;
    amlCargarListas().then(function(){ window._cumCargando = false; if(S.page === 'cumplimiento') nav('cumplimiento'); })
      .catch(function(){ window._cumCargando = false; });
  }
  var E = _amlEsc, M = function(v){ return typeof fmt === 'function' ? fmt(v) : '$' + (+v).toFixed(2); };
  var clientes = (S.clientes || []).filter(function(c){ return c && !c.eliminado; });
  // Coincidencias por revisar: las del cliente y las de su fiador, cada una en su fila
  var pend = [];
  clientes.forEach(function(c){
    if(c.aml_listas && c.aml_listas.estado === 'pendiente') pend.push({ c: c, r: c.aml_listas, que: '' });
    if(c.aml_fiador && c.aml_fiador.estado === 'pendiente') pend.push({ c: c, r: c.aml_fiador, que: 'fiador' });
  });
  var peps = clientes.filter(function(c){ return c.pep === 'si'; });
  var revisados = clientes.filter(function(c){ return c.aml_listas && c.aml_listas.fecha; }).length;
  var mes = window._cumMes || _cumMesAnterior(), efectivo = amlEfectivoDelMes(mes);
  var totalEf = efectivo.reduce(function(s, f){ return s + f.monto; }, 0);
  var alertas = amlAlertas();
  var L = _amlListas;
  var estadoListas = L ? ('Listas al ' + E(String(L.generado || '').slice(0, 10)) + ' · OFAC SDN ' + (L.fuentes['OFAC SDN'] || 0) + ' · ONU ' + (L.fuentes['ONU'] || 0) + ' personas') : 'Cargando las listas…';
  var tabla = function(cab, filas, vacio){
    return filas.length
      ? '<div style="overflow-x:auto"><table class="tbl" style="width:100%"><thead><tr>' + cab.map(function(h){ return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + filas.join('') + '</tbody></table></div>'
      : '<div style="color:var(--ink3);font-size:13px;padding:8px 0">' + vacio + '</div>';
  };
  var idDe = function(c){ return String(c.id).replace(/[^A-Za-z0-9_-]/g, ''); };
  var filasPend = pend.map(function(p){
    var c = p.c, r = p.r, x = (r.coincidencias || [])[0] || {}, q = p.que ? ',null,\'fiador\'' : '';
    var quien = p.que
      ? '<b>Fiador:</b> ' + E(x.fiador || '') + '<div class="tds">' + E(x.fiadorCedula || '') + ' · respalda a <a href="#" onclick="verCliente(\'' + idDe(c) + '\');return false">' + E(c.nombre) + '</a></div>'
      : '<a href="#" onclick="verCliente(\'' + idDe(c) + '\');return false" style="font-weight:700">' + E(c.nombre) + '</a><div class="tds">' + E(c.cedula || '') + '</div>';
    return '<tr><td>' + quien + '</td>'
      + '<td>' + E(x.lista || '') + '<div class="tds">' + E(x.nombre || '') + ' · ' + E(x.programa || '') + (x.detalle ? ' · ' + E(x.detalle) : '') + (r.coincidencias.length > 1 ? ' · y ' + (r.coincidencias.length - 1) + ' más' : '') + '</div></td>'
      + '<td>' + E(x.tipo || '') + '</td>'
      + '<td style="white-space:nowrap"><button class="btn btn-g btn-xs" onclick="amlResolver(\'' + idDe(c) + '\',\'descartar\'' + q + ');nav(\'cumplimiento\')">Descartar</button> <button class="btn btn-d btn-xs" onclick="amlResolver(\'' + idDe(c) + '\',\'confirmar\'' + q + ');nav(\'cumplimiento\')">Confirmar</button></td></tr>';
  });
  var filasPep = peps.map(function(c){
    return '<tr><td><a href="#" onclick="verCliente(\'' + idDe(c) + '\');return false" style="font-weight:700">' + E(c.nombre) + '</a><div class="tds">' + E(c.cedula || '') + '</div></td><td>' + E(c.pep_detalle || '—') + '</td>'
      + '<td>' + (c.pep_aprobadoEn ? 'Aprobado · ' + E(c.pep_aprobadoPor) + ' · ' + E(String(c.pep_aprobadoEn).slice(0, 10)) : '<button class="btn btn-p btn-xs" onclick="amlAprobarPep(\'' + idDe(c) + '\');nav(\'cumplimiento\')">Aprobar</button>') + '</td></tr>';
  });
  var filasEf = efectivo.map(function(f){
    return '<tr><td>' + E(f.fecha) + '</td><td>' + E(f.cliente) + '<div class="tds">' + E(f.cedula) + '</div></td><td>' + E(f.credito) + '</td><td>' + E(f.tipo) + '</td><td style="text-align:right;font-weight:700">' + M(f.monto) + '</td><td>' + E(f.recibidoPor) + '</td></tr>';
  });
  var filasAl = alertas.slice(0, 80).map(function(a){
    return '<tr><td>' + E(a.fecha || '—') + '</td><td>' + E(a.cliente || '') + '<div class="tds">' + E(a.credito || '') + '</div></td><td>' + E(a.texto) + '</td></tr>';
  });
  var kpi = function(v, t, col){ return '<div class="cf-kpi' + (col ? ' ' + col : '') + '"><div class="cf-kpi-v">' + v + '</div><div class="cf-kpi-l">' + t + '</div></div>'; };
  return '<div class="page">'
    + pageBanner('Prevención LC/FT · Sanciones', 'Cumplimiento', estadoListas, [
        { label: '↻ Revisar toda la cartera', onclick: 'cumRevisarCartera()', primary: true }
      ])
    + '<div class="cf-kpis" style="margin-bottom:14px">'
    + kpi(pend.length, 'Coincidencias por revisar', pend.length ? 'is-r' : 'is-g')
    + kpi(peps.filter(function(c){ return !c.pep_aprobadoEn; }).length, 'PEP sin aprobar', '')
    + kpi(revisados + ' / ' + clientes.length, 'Clientes revisados', '')
    + kpi(M(totalEf), 'Efectivo ' + E(mes), '')
    + '</div>'
    + '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">Coincidencias en listas de sanciones</div></div><div style="padding:0 16px 14px">'
    + '<div style="font-size:12px;color:var(--ink3);margin-bottom:8px">No entregar la moto ni firmar mientras esté pendiente. Descartar solo con una razón (cédula distinta, fecha de nacimiento, nacionalidad). Si se confirma: no continuar, conservar todo, reportar a la UNIF y no avisar al cliente.</div>'
    + tabla(['Cliente o fiador', 'Persona en la lista', 'Coincide por', ''], filasPend, 'Ninguna coincidencia pendiente.') + '</div></div>'
    + '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">Personas expuestas políticamente</div></div><div style="padding:0 16px 14px">'
    + tabla(['Cliente', 'Cargo o relación', 'Aprobación del oficial'], filasPep, 'Ningún cliente marcado como PEP.') + '</div></div>'
    + '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">Transacciones en efectivo · reporte mensual a la UNIF</div>'
    + '<div style="display:flex;gap:8px;align-items:center"><input type="month" class="fi" style="width:auto" value="' + E(mes) + '" onchange="cumCambiarMes(this.value)">'
    + '<button class="btn btn-p btn-sm" onclick="amlDescargarEfectivo(\'' + E(mes) + '\')">↓ Descargar CSV</button></div></div><div style="padding:0 16px 14px">'
    + '<div style="font-size:12px;color:var(--ink3);margin-bottom:8px">' + efectivo.length + ' pago' + (efectivo.length === 1 ? '' : 's') + ' en efectivo · total ' + M(totalEf) + '. La ley pide informar a la UNIF todas las transacciones en efectivo del mes anterior.</div>'
    + tabla(['Fecha', 'Cliente', 'Crédito', 'Tipo', 'Monto', 'Recibido por'], filasEf, 'Sin pagos en efectivo ese mes.') + '</div></div>'
    + '<div class="card"><div class="ch"><div class="ct">Alertas (últimos 90 días)</div></div><div style="padding:0 16px 14px">'
    + tabla(['Fecha', 'Cliente', 'Qué revisar'], filasAl, 'Sin alertas.') + (alertas.length > 80 ? '<div class="tds">Se muestran 80 de ' + alertas.length + '.</div>' : '') + '</div></div>'
    + '</div>';
};
