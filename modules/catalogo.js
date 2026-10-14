// Pagasi module: catalogo (13-oct-2026). La pantalla de Liz: precios de contado, seguro,
// fotos, modelos nuevos y disponibilidad de pagasi.io. Lo que se guarda aqui la web lo
// toma sola (assets/public/catalog.js lee la coleccion "catalogo").
function catFiltrar(q){
  q = (typeof PagasiCatalog !== 'undefined' ? PagasiCatalog.normalize(q) : String(q || '').toLowerCase());
  window._catQ = q;
  document.querySelectorAll('#cat-tabla tbody tr[data-busca]').forEach(function(tr){
    tr.style.display = (!q || tr.getAttribute('data-busca').indexOf(q) > -1) ? '' : 'none';
  });
}
PG.catalogo = function(){
  if(!catPuedeEditar()) return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">Pídele a un administrador el permiso de <b>Catálogo web</b>.</div></div>';
  if(!_cat.cargado && !_cat.cargando && !_cat.error) catCargar();
  var E = _catEsc, admin = catEsAdmin(), c = catCondiciones(), lista = catLista();
  var M = function(v){ return '$' + (+v || 0).toLocaleString('en-US'); };
  var seg = String(c.seguroPct).replace('.', ',');
  var acciones = [{ label: '+ Nuevo modelo', onclick: 'catNuevoModelo()' }, { label: '↓ Descargar reporte Excel', onclick: 'catExcel()', primary: true }];
  var cabeza = pageBanner('Catálogo web · pagasi.io', 'Catálogo', _cat.cargado
      ? (lista.filter(function(m){ return m.disponible !== false; }).length + ' de ' + lista.length + ' modelos visibles en la web · lo que guardes aquí aparece en pagasi.io al momento')
      : 'Cargando el catálogo…', _cat.cargado && lista.length ? acciones : []);

  if(_cat.error) return '<div class="page">' + cabeza + '<div class="card" style="padding:18px;color:var(--red);font-size:13px">' + E(_cat.error) + ' <button class="btn btn-g btn-sm" onclick="_cat.error=\'\';catCargar(true)">Reintentar</button></div></div>';
  if(!_cat.cargado) return '<div class="page">' + cabeza + '<div class="card" style="padding:30px;text-align:center;color:var(--ink3)">Cargando…</div></div>';

  // Catalogo vacio: la web sigue con su lista fija hasta que se cargue aqui
  if(!lista.length){
    return '<div class="page">' + cabeza
      + '<div class="card" style="padding:26px;max-width:640px"><div style="font-size:16px;font-weight:800;margin-bottom:6px">Todavía no hay modelos en el catálogo</div>'
      + '<div style="font-size:13px;color:var(--ink2);line-height:1.6;margin-bottom:14px">Hoy la web muestra una lista fija de ' + PagasiCatalog.base.length + ' modelos. Cárgala aquí una vez y desde ese momento los precios, las fotos y la disponibilidad se cambian desde esta pantalla.</div>'
      + '<button class="btn btn-p" onclick="catImportar()">Cargar los ' + PagasiCatalog.base.length + ' modelos de la web</button></div></div>';
  }

  var condiciones = '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">Condiciones del plan</div></div><div style="padding:0 16px 14px">'
    + '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end">'
    + '<div class="fg" style="min-width:150px"><label>Tasa anual (APY)</label>' + (admin
        ? '<input class="fi" id="cat_apy" type="number" step="0.01" value="' + c.apy + '" style="width:130px">'
        : '<div style="font-weight:800;font-size:15px;padding:8px 0">' + c.apy + '% <span style="font-size:11px;color:var(--ink3);font-weight:600">· la cambia un administrador</span></div>') + '</div>'
    + '<div class="fg" style="min-width:150px"><label>Seguro (% del precio de contado)</label><input class="fi" id="cat_seguro" type="number" step="0.01" value="' + c.seguroPct + '" style="width:130px"></div>'
    + '<div style="font-size:12px;color:var(--ink2);line-height:1.7;padding-bottom:6px">Inicial desde <b>' + c.inicialMin + '%</b> · plazos de <b>' + c.plazos.join(', ') + ' meses</b><br>El seguro se paga junto con la inicial.</div>'
    + '<button class="btn btn-p btn-sm" style="margin-left:auto" onclick="catGuardarCondiciones()">Guardar condiciones</button>'
    + '</div>' + (!_cat.cond ? '<div style="font-size:11.5px;color:var(--amber);margin-top:8px">Todavía no están guardadas: se usan las de la web (' + c.apy + '% y ' + seg + '%).' + (admin ? ' Guárdalas una vez.' : ' Un administrador tiene que guardarlas primero.') + '</div>' : '')
    + '</div></div>';

  var foto = function(m){
    var id = _catId(m.id);
    return m.image
      ? '<div style="position:relative;width:64px;height:48px;border-radius:8px;overflow:hidden;background:#fff;border:1px solid var(--rim)"><img src="' + E(m.image) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain"></div>'
        + '<div style="display:flex;gap:4px;margin-top:4px"><button class="btn btn-g btn-xs" onclick="catElegirFoto(' + id + ')" title="Cambiar la foto">Cambiar</button><button class="btn btn-g btn-xs" onclick="catQuitarFoto(' + id + ')" title="Quitar la foto">✕</button></div>'
      : '<button class="btn btn-g btn-xs" onclick="catElegirFoto(' + id + ')" style="width:64px;height:48px;white-space:normal;line-height:1.2">＋ Foto</button>';
  };
  var grupoAnt = null;
  var filas = lista.map(function(m){
    var id = _catId(m.id), b = catPlan(m, 12, c.inicialMin / 100), visible = m.disponible !== false;
    var busca = (typeof PagasiCatalog !== 'undefined' ? PagasiCatalog.normalize(m.modelo + ' ' + (m.name || '') + ' ' + (m.sedeName || '')) : '');
    var titulo = '';
    if(m.sedeName !== grupoAnt){ grupoAnt = m.sedeName; titulo = '<tr class="cat-grupo"><td colspan="10" style="background:var(--surf2);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);padding:8px 12px">' + E(m.sedeName || 'Sin concesionario') + '</td></tr>'; }
    return titulo + '<tr data-busca="' + E(busca) + '"' + (visible ? '' : ' style="opacity:.55"') + '>'
      + '<td>' + foto(m) + '</td>'
      + '<td><div style="font-weight:800">' + E(m.modelo) + '</div><div class="tds">' + E(m.name || '') + (m.cc ? ' · ' + E(m.cc) : '') + '</div></td>'
      + '<td><input class="fi" type="number" step="0.01" min="0" value="' + (+m.precio || 0) + '" onchange="catPrecio(' + id + ',this.value)" style="width:104px;font-weight:700" title="Precio de contado"></td>'
      + '<td style="text-align:right">' + M(b.seguro) + '</td>'
      + '<td style="text-align:right">' + M(b.inicial) + '</td>'
      + '<td style="text-align:right;font-weight:700">' + M(b.alFirmar) + '</td>'
      + '<td style="text-align:right;white-space:nowrap">' + CAT_PLAZOS_EXCEL.map(function(n){ return M(catPlan(m, n, c.inicialMin / 100).quincenal); }).join(' · ') + '</td>'
      + '<td style="text-align:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px"><input type="checkbox"' + (visible ? ' checked' : '') + ' onchange="catDisponible(' + id + ',this.checked)" style="width:16px;height:16px;accent-color:var(--green)">' + (visible ? 'Sí' : 'No') + '</label></td>'
      + '<td style="text-align:center"><input type="checkbox"' + (m.promo ? ' checked' : '') + ' onchange="catPromo(' + id + ',this.checked)" title="Burbuja de promo en la web y primero en la portada" style="width:16px;height:16px;accent-color:#ff5a1f"></td>'
      + '<td style="white-space:nowrap"><button class="btn btn-g btn-xs" onclick="catEditarModelo(' + id + ')">✎ Editar</button> <button class="btn btn-g btn-xs" onclick="catEliminar(' + id + ')" title="Eliminar del catálogo">🗑</button></td>'
      + '</tr>';
  }).join('');

  var html = '<div class="page">' + cabeza + condiciones
    + '<div class="card"><div class="ch" style="gap:10px;flex-wrap:wrap"><div class="ct">Modelos</div>'
    + '<input class="fi" placeholder="Buscar modelo o concesionario…" value="' + E(window._catQ || '') + '" oninput="catFiltrar(this.value)" style="max-width:280px;margin-left:auto">'
    + (lista.length < PagasiCatalog.base.length ? '<button class="btn btn-g btn-sm" onclick="catImportar()" title="Agregar los modelos de la lista original que falten">Traer los que faltan</button>' : '')
    + '</div><div style="overflow-x:auto"><table class="tbl" id="cat-tabla" style="width:100%"><thead><tr>'
    + '<th>Foto</th><th>Modelo</th><th>Precio contado</th><th style="text-align:right">Seguro ' + E(seg) + '%</th><th style="text-align:right">Inicial ' + c.inicialMin + '%</th><th style="text-align:right">Al firmar</th><th style="text-align:right">Cuota ' + CAT_PLAZOS_EXCEL.join(' · ') + ' meses</th><th style="text-align:center">En la web</th><th style="text-align:center">Promo</th><th></th>'
    + '</tr></thead><tbody>' + filas + '</tbody></table></div>'
    + '<div style="font-size:11px;color:var(--ink3);padding:10px 16px">El precio se guarda al salir de la casilla. Las cuotas son las mismas que ve el cliente en la web (redondeadas hacia arriba), con la inicial mínima.</div></div>'
    + '</div>';
  if(window._catQ) setTimeout(function(){ catFiltrar(window._catQ); }, 0);
  return html;
};
