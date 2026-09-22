// Pagasi module: clientes
PG.clientes = function(){
  // Default: al entrar a la página, mostrar Activos primero
  if(!S.clienteEstadoFiltro) S.clienteEstadoFiltro = 'activo';
  const estado=S.clienteEstadoFiltro;
  const chips=[['todos','Todos'],['lead','Leads'],['activo','Activos'],['mora','En mora'],['completado','Completados']];

  // Métricas para el banner — filtradas por concesionario activo
  var _CLIS = _concFiltrarClientes(S.clientes||[]);
  const nTot = _CLIS.filter(c=>!c.eliminado).length;
  const nAct = _CLIS.filter(function(c){
    if(c.eliminado) return false;
    return getClienteEstados(c).estados.indexOf('activo')>=0;
  }).length;

  return`<div class="page">
  ${pageBanner(
    'Base de datos · Clientes',
    'Gestión de Clientes',
    '<b>'+nTot+'</b> clientes registrados · <b>'+nAct+'</b> con crédito activo',
    [
      {label:'↻ Scores', onclick:'recalcularScoresYRecargar()'},
      {label:'↓ Exportar CSV', onclick:"exportarCSV('clientes')"},
      {label:'＋ Nuevo Cliente', onclick:'openAddCliente()', primary:true}
    ]
  )}
  <div style="display:flex;gap:9px;margin-bottom:10px;flex-wrap:wrap">
    <div class="srch" style="flex:1"><span class="srch-i">◆</span><input type="text" id="clienteQ" placeholder="Buscar por nombre, cédula, teléfono, ciudad..." oninput="liveSearchCliente(this.value)"></div>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
    ${chips.map(function(ch){ return `<button class="btn btn-sm ${estado===ch[0]?'btn-p':'btn-g'}" onclick="setClienteEstadoFiltro('${ch[0]}')">${ch[1]}</button>`; }).join('')}
  </div>
  <div id="clienteList">${renderClienteList(($('clienteQ')&&$('clienteQ').value)||'')}</div>
  </div>`;
};

