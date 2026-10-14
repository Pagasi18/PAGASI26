// Pagasi module: catalogo (13-oct-2026). La pantalla de Liz: precios de contado, fotos,
// modelos nuevos, disponibilidad y promo de pagasi.io. Lo que se guarda aqui la web lo
// toma sola (assets/public/catalog.js lee la coleccion "catalogo").
// Mejoras de la noche del 13-oct (Adam: "mejorar el modulo"): filtros con contadores para
// ver lo que falta (sin foto, sin precio, ocultos, promo, por concesionario), modelos con el
// precio por confirmar, "Ver en la web" y quien hizo el ultimo cambio.
var CAT_FILTROS = [
  { k: 'todos', l: 'Todos', f: function(){ return true; } },
  { k: 'web', l: 'En la web', f: function(m){ return m.disponible !== false; } },
  { k: 'ocultos', l: 'Ocultos', f: function(m){ return m.disponible === false; } },
  { k: 'promo', l: 'En promo', f: function(m){ return !!m.promo; } },
  { k: 'sinfoto', l: 'Sin foto', f: function(m){ return !m.image; } },
  { k: 'sinprecio', l: 'Precio por confirmar', f: function(m){ return catSinPrecio(m); } }
];
function _catFiltroActual(){ return window._catF || (window._catF = { chip: 'todos', sede: '' }); }
// Busqueda, chip y concesionario a la vez, sin redibujar la pagina (no se pierde el foco)
function catFiltrar(q){
  if(q !== undefined) window._catQ = (typeof PagasiCatalog !== 'undefined' ? PagasiCatalog.normalize(q) : String(q || '').toLowerCase());
  var f = _catFiltroActual(), q2 = window._catQ || '';
  var filtro = (CAT_FILTROS.find(function(x){ return x.k === f.chip; }) || CAT_FILTROS[0]).f;
  var porId = {}; _cat.motos.forEach(function(m){ porId[String(m.id)] = m; });
  var visiblesPorGrupo = {};
  document.querySelectorAll('#cat-tabla tbody tr[data-id]').forEach(function(tr){
    var m = porId[tr.getAttribute('data-id')];
    var ok = !!m && filtro(m) && (!f.sede || (m.sedeName || '') === f.sede) && (!q2 || tr.getAttribute('data-busca').indexOf(q2) > -1);
    tr.style.display = ok ? '' : 'none';
    if(ok) visiblesPorGrupo[tr.getAttribute('data-grupo')] = 1;
  });
  document.querySelectorAll('#cat-tabla tbody tr.cat-grupo').forEach(function(tr){ tr.style.display = visiblesPorGrupo[tr.getAttribute('data-grupo')] ? '' : 'none'; });
  document.querySelectorAll('[data-cat-chip]').forEach(function(b){ b.classList.toggle('btn-p', b.getAttribute('data-cat-chip') === f.chip); b.classList.toggle('btn-g', b.getAttribute('data-cat-chip') !== f.chip); });
}
function catChip(k){ _catFiltroActual().chip = k; catFiltrar(); }
function catSede(v){ _catFiltroActual().sede = v; catFiltrar(); }
function _catCuando(iso){
  if(!iso) return '';
  var d = new Date(iso); if(isNaN(d.getTime())) return '';
  var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return d.getDate() + ' ' + meses[d.getMonth()];
}
PG.catalogo = function(){
  if(!catPuedeEditar()) return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">Pídele a un administrador el permiso de <b>Catálogo web</b>.</div></div>';
  if(!_cat.cargado && !_cat.cargando && !_cat.error) catCargar();
  var E = _catEsc, admin = catEsAdmin(), c = catCondiciones(), lista = catLista(), faltan = _cat.cargado ? catFaltantes() : [];
  var M = function(v){ return '$' + (+v || 0).toLocaleString('en-US'); };
  var seg = String(c.seguroPct).replace('.', ',');
  // Sin seguro aparte (desde el 14-oct va dentro del precio) las columnas Seguro y Al firmar sobran
  var conSeguro = +c.seguroPct > 0, nCols = conSeguro ? 12 : 10;
  var acciones = [{ label: '+ Nuevo modelo', onclick: 'catNuevoModelo()' }, { label: '↓ Descargar reporte Excel', onclick: 'catExcel()', primary: true }];
  var enWeb = lista.filter(function(m){ return m.disponible !== false; }).length;
  var cabeza = pageBanner('Catálogo web · pagasi.io', 'Catálogo', _cat.cargado
      ? (enWeb + ' de ' + lista.length + ' modelos visibles en la web · lo que guardes aquí aparece en pagasi.io al momento')
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

  // Condiciones (tasa, seguro, inicial, plazos): solo administradores (Adam, 13-oct-2026)
  var condiciones = !admin ? '' : '<div class="card" style="margin-bottom:14px"><div class="ch"><div class="ct">Condiciones del plan</div></div><div style="padding:0 16px 14px">'
    + '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end">'
    + '<div class="fg" style="min-width:150px"><label>Tasa anual (APY)</label><input class="fi" id="cat_apy" type="number" step="0.01" value="' + c.apy + '" style="width:130px"></div>'
    + '<div class="fg" style="min-width:150px"><label>Seguro (% del precio de contado)</label><input class="fi" id="cat_seguro" type="number" step="0.01" value="' + c.seguroPct + '" style="width:130px"></div>'
    + '<div style="font-size:12px;color:var(--ink2);line-height:1.7;padding-bottom:6px">Inicial desde <b>' + c.inicialMin + '%</b> · plazos de <b>' + c.plazos.join(', ') + ' meses</b><br>El seguro se paga junto con la inicial.</div>'
    + '<button class="btn btn-p btn-sm" style="margin-left:auto" onclick="catGuardarCondiciones()">Guardar condiciones</button>'
    + '</div>' + (!_cat.cond ? '<div style="font-size:11.5px;color:var(--amber);margin-top:8px">Todavía no están guardadas: se usan las de la web (' + c.apy + '% y ' + seg + '%). Guárdalas una vez.</div>' : '')
    + '</div></div>';

  // Lo que falta, de un vistazo: cada chip filtra la tabla
  var f = _catFiltroActual();
  var chips = CAT_FILTROS.map(function(x){
    var n = lista.filter(x.f).length;
    var aviso = (x.k === 'sinfoto' || x.k === 'sinprecio') && n ? ' style="border-color:var(--amber)"' : '';
    return '<button type="button" class="btn ' + (f.chip === x.k ? 'btn-p' : 'btn-g') + ' btn-sm" data-cat-chip="' + x.k + '" onclick="catChip(\'' + x.k + '\')"' + aviso + '>' + x.l + ' <b style="margin-left:4px">' + n + '</b></button>';
  }).join('');
  var sedes = []; lista.forEach(function(m){ if(m.sedeName && sedes.indexOf(m.sedeName) < 0) sedes.push(m.sedeName); });
  var selSede = '<select class="fs" onchange="catSede(this.value)" style="max-width:220px"><option value="">Todos los concesionarios</option>'
    + sedes.map(function(s){ return '<option value="' + E(s) + '"' + (f.sede === s ? ' selected' : '') + '>' + E(s) + '</option>'; }).join('') + '</select>';

  var foto = function(m){
    var id = _catId(m.id);
    return m.image
      ? '<div style="position:relative;width:64px;height:48px;border-radius:8px;overflow:hidden;background:#fff;border:1px solid var(--rim)"><img src="' + E(m.image) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain"></div>'
        + '<div style="display:flex;gap:4px;margin-top:4px"><button class="btn btn-g btn-xs" onclick="catElegirFoto(' + id + ')" title="Cambiar la foto">Cambiar</button><button class="btn btn-g btn-xs" onclick="catQuitarFoto(' + id + ')" title="Quitar la foto">✕</button></div>'
      : '<button class="btn btn-g btn-xs" onclick="catElegirFoto(' + id + ')" style="width:64px;height:48px;white-space:normal;line-height:1.2;border-color:var(--amber)">＋ Foto</button>';
  };
  var grupoAnt = null, nGrupo = 0;
  var filas = lista.map(function(m){
    var id = _catId(m.id), sinPrecio = catSinPrecio(m), b = catPlan(m, 12, c.inicialMin / 100), visible = m.disponible !== false;
    var busca = (typeof PagasiCatalog !== 'undefined' ? PagasiCatalog.normalize(m.modelo + ' ' + (m.name || '') + ' ' + (m.sedeName || '')) : '');
    var titulo = '';
    if(m.sedeName !== grupoAnt){ grupoAnt = m.sedeName; nGrupo++; titulo = '<tr class="cat-grupo" data-grupo="' + nGrupo + '"><td colspan="' + nCols + '" style="background:var(--surf2);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);padding:8px 12px">' + E(m.sedeName || 'Sin concesionario') + (m.concesionarioId ? '' : ' <button class="btn btn-g btn-xs" style="margin-left:10px;text-transform:none;letter-spacing:0" onclick="catAsignarGrupo(' + JSON.stringify(String(m.sedeName || '')).replace(/"/g, '&quot;') + ')" title="Estos modelos todavía no están atados a un concesionario del sistema">Asignar concesionario del sistema</button>') + '</td></tr>'; }
    var cambio = m.actualizadoPor ? '<div class="tds" style="font-size:10.5px;opacity:.8">Cambió ' + E(m.actualizadoPor) + (m.actualizadoEn ? ' · ' + E(_catCuando(m.actualizadoEn)) : '') + '</div>' : '';
    var verWeb = (visible && !sinPrecio) ? ' · <a href="simulador.html?moto=' + id + '" target="_blank" rel="noopener" style="font-weight:700">Ver en la web ↗</a>' : '';
    var raya = '<span style="color:var(--ink3)">—</span>';
    return titulo + '<tr data-id="' + id + '" data-grupo="' + nGrupo + '" data-busca="' + E(busca) + '"' + (visible ? '' : ' style="opacity:.55"') + '>'
      + '<td>' + foto(m) + '</td>'
      + '<td><div style="font-weight:800">' + E(m.modelo) + '</div>' + (sinPrecio ? '<div><span style="display:inline-block;white-space:nowrap;font-size:9.5px;font-weight:800;color:var(--amber);border:1px solid var(--amber);border-radius:6px;padding:1px 6px;margin:2px 0">PRECIO POR CONFIRMAR</span></div>' : '')
        + '<div class="tds">' + E(m.name || '') + (m.cc && m.cc !== '—' ? ' · ' + E(m.cc) : '') + verWeb + '</div>' + cambio + '</td>'
      + '<td><input class="fi" type="number" step="0.01" min="0" value="' + (sinPrecio ? '' : +m.precio) + '" placeholder="Sin precio" onchange="catPrecio(' + id + ',this.value)" style="width:110px;font-weight:700" title="Precio de contado (vacío = por confirmar)"></td>'
      + (conSeguro ? '<td style="text-align:right">' + (b ? M(b.seguro) : raya) + '</td>' : '')
      + '<td style="text-align:right">' + (b ? M(b.inicial) : raya) + '</td>'
      + (conSeguro ? '<td style="text-align:right;font-weight:700">' + (b ? M(b.alFirmar) : raya) + '</td>' : '')
      + (b ? CAT_PLAZOS_EXCEL.map(function(n, k){ var ultimo = k === CAT_PLAZOS_EXCEL.length - 1; return '<td style="text-align:right;white-space:nowrap;font-family:var(--fd);' + (k === 0 ? 'border-left:1px solid var(--rim);' : '') + (ultimo ? 'font-weight:800;color:var(--p1)' : 'color:var(--ink2)') + '">' + M(catPlan(m, n, c.inicialMin / 100).quincenal) + '</td>'; }).join('')
           : '<td colspan="' + CAT_PLAZOS_EXCEL.length + '" style="text-align:center;border-left:1px solid var(--rim)"><span style="font-size:11px;color:var(--ink3)">En la web: "Pregunta el precio"</span></td>')
      + '<td style="text-align:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px"><input type="checkbox"' + (visible ? ' checked' : '') + ' onchange="catDisponible(' + id + ',this.checked)" style="width:16px;height:16px;accent-color:var(--green)">' + (visible ? 'Sí' : 'No') + '</label></td>'
      + '<td style="text-align:center"><input type="checkbox"' + (m.promo ? ' checked' : '') + ' onchange="catPromo(' + id + ',this.checked)" title="Burbuja de promo en la web y primero en la portada" style="width:16px;height:16px;accent-color:#065cff"></td>'
      + '<td style="white-space:nowrap"><button class="btn btn-g btn-xs" onclick="catEditarModelo(' + id + ')">✎ Editar</button> <button class="btn btn-g btn-xs" onclick="catCopiar(' + id + ')" title="El mismo modelo en otro concesionario, con su propio precio">⧉ Copiar</button> <button class="btn btn-g btn-xs" onclick="catEliminar(' + id + ')" title="Eliminar del catálogo">🗑</button></td>'
      + '</tr>';
  }).join('');

  var html = '<div class="page">' + cabeza + condiciones
    + (faltan.length ? '<div class="card" style="margin-bottom:14px;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-left:3px solid var(--p1)"><div style="font-size:13px"><b>' + faltan.length + ' modelo' + (faltan.length === 1 ? '' : 's') + ' de la web todavía no está' + (faltan.length === 1 ? '' : 'n') + ' aquí</b>: ' + E(faltan.slice(0, 6).map(function(m){ return m.name || m.modelo; }).join(', ')) + (faltan.length > 6 ? '…' : '') + '. Tráelos para manejarlos desde esta pantalla.</div><button class="btn btn-p btn-sm" style="margin-left:auto" onclick="catImportar()">Traer ' + (faltan.length === 1 ? 'el que falta' : 'los ' + faltan.length) + '</button></div>' : '')
    + '<div class="card"><div class="ch" style="gap:10px;flex-wrap:wrap"><div class="ct">Modelos</div>'
    + '<input class="fi" placeholder="Buscar modelo o concesionario…" value="' + E(window._catQ || '') + '" oninput="catFiltrar(this.value)" style="max-width:260px;margin-left:auto">' + selSede
    + '</div><div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 10px">' + chips + '</div>'
    + '<div style="overflow-x:auto"><table class="tbl" id="cat-tabla" style="width:100%"><thead><tr>'
    + '<th>Foto</th><th>Modelo</th><th>Precio contado</th>' + (conSeguro ? '<th style="text-align:right">Seguro ' + E(seg) + '%</th>' : '') + '<th style="text-align:right">Inicial ' + c.inicialMin + '%</th>' + (conSeguro ? '<th style="text-align:right">Al firmar</th>' : '') + '<th style="text-align:right">' + CAT_PLAZOS_EXCEL.map(function(n, k){ return '<th style="text-align:right;white-space:nowrap;' + (k === 0 ? 'border-left:1px solid var(--rim)' : '') + '" title="Cuota quincenal a ' + n + ' meses con la inicial mínima">Cuota ' + n + ' m</th>'; }).join('') + '<th style="text-align:center">En la web</th><th style="text-align:center">Promo</th><th></th>'
    + '</tr></thead><tbody>' + filas + '</tbody></table></div>'
    + '<div style="font-size:11px;color:var(--ink3);padding:10px 16px">El precio se guarda al salir de la casilla; vacío = precio por confirmar (en la web sale con "Pregunta el precio"). Las cuotas son las mismas que ve el cliente en la web, con la inicial mínima. Cada fila es de un concesionario: si otro vende el mismo modelo a otro precio, usa "Copiar".</div></div>'
    + '</div>';
  if(window._catQ || f.chip !== 'todos' || f.sede) setTimeout(function(){ catFiltrar(); }, 0);
  return html;
};
