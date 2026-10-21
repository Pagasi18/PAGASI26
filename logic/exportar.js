// Exportar a Excel y PDF desde Finanzas (Adam, 21-oct-2026: "revisa todo finanzas… que todo lo que se pueda
// exportar te permita exportar en excel y/o pdf").
//  · xlsxEscribir(nombre, hojas): un .xlsx de verdad, sin librerías, con estilos, celdas combinadas y anchos.
//    hoja = { name, rows:[[celda,...]], merges:['A1:Q1'], cols:[ancho,...] }
//    celda = valor (texto o número) o { v: valor, s: 'estilo' } con estilo de XLSX_ESTILOS.
//  · pgExportarTablas(idContenedor, titulo, 'excel'|'pdf'): exporta las tablas que se ven en pantalla
//    (una hoja por tabla); el PDF lleva también los gráficos como imagen.
//  · pgBotonesExportar(idContenedor, titulo): los dos botones, para ponerlos encima de cualquier vista.
// El PDF es el de todo el sistema: la ventana de impresión con la identidad Pagasi (_abrirVentanaImpresion).

var XLSX_ESTILOS = {
  normal: 0, negrita: 1, titulo: 2, grupo: 3, encabezado: 4, texto: 5, monto: 6, pct: 7,
  totalEtiqueta: 8, totalMonto: 9, nota: 10, montoSimple: 11, textoCentro: 12, marca: 13, subtitulo: 14
};

function _xlsxStylesXml(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="0%"/></numFmts>'
    + '<fonts count="5">'
    +   '<font><sz val="10"/><name val="Arial"/></font>'
    +   '<font><b/><sz val="10"/><name val="Arial"/></font>'
    +   '<font><b/><sz val="13"/><name val="Arial"/></font>'
    +   '<font><i/><sz val="9"/><color rgb="FF555555"/><name val="Arial"/></font>'
    +   '<font><b/><sz val="10"/><color rgb="FFB91C1C"/><name val="Arial"/></font>'
    + '</fonts>'
    + '<fills count="6">'
    +   '<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFE2EFDA"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>'
    + '</fills>'
    + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
    +   '<border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="15">'
    +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'                                                                     // 0 normal
    +   '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'                                                      // 1 negrita
    +   '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'                                                      // 2 titulo
    +   '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' // 3 grupo
    +   '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' // 4 encabezado
    +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'                                     // 5 texto
    +   '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'                           // 6 monto
    +   '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' // 7 pct
    +   '<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>' // 8 totalEtiqueta
    +   '<xf numFmtId="164" fontId="1" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' // 9 totalMonto
    +   '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' // 10 nota
    +   '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'                                           // 11 montoSimple
    +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>' // 12 textoCentro
    +   '<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'                       // 13 marca (faltan datos / REVISAR)
    +   '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1"/></xf>'     // 14 subtitulo
    + '</cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';
}

function _xlsxColLetra(n){ var s = ''; n++; while(n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function _xlsxEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
function _xlsxNombreHoja(n, usados){
  var b = String(n || 'Hoja').replace(/[\\\/\?\*\[\]:]/g, ' ').trim().slice(0, 31) || 'Hoja', x = b, i = 2;
  while(usados[x.toLowerCase()]){ x = b.slice(0, 28) + ' ' + (i++); }
  usados[x.toLowerCase()] = 1; return x;
}

// Los archivos del .xlsx (sin empaquetar): sirve para las pruebas y para xlsxEscribir
function xlsxArchivos(hojas){
  var usados = {};
  hojas = (hojas || []).map(function(h){ return Object.assign({}, h, { name: _xlsxNombreHoja(h.name, usados) }); });
  var hojaXml = function(h){
    var out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    out += '<sheetFormatPr defaultRowHeight="14"/>';
    if(h.cols && h.cols.length){
      out += '<cols>' + h.cols.map(function(w, i){ return w ? '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(+w)+'" customWidth="1"/>' : ''; }).join('') + '</cols>';
    }
    out += '<sheetData>';
    (h.rows || []).forEach(function(cells, r){
      cells = cells || [];
      // Alto fijo de la fila (h.alturas = {numero de fila: puntos}): sin él, Numbers y la vista previa de la Mac
      // estiran filas con celdas combinadas o con texto largo
      var alto = h.alturas && h.alturas[r + 1];
      out += '<row r="'+(r+1)+'"' + (alto ? ' ht="'+alto+'" customHeight="1"' : '') + '>';
      cells.forEach(function(c, i){
        var v = (c && typeof c === 'object' && !(c instanceof Date)) ? c.v : c;
        var s = (c && typeof c === 'object' && c.s != null) ? (typeof c.s === 'number' ? c.s : (XLSX_ESTILOS[c.s] || 0)) : 0;
        if((v === '' || v == null) && !s) return;
        var ref = _xlsxColLetra(i) + (r + 1), sa = s ? ' s="'+s+'"' : '';
        if(v === '' || v == null) out += '<c r="'+ref+'"'+sa+'/>';
        else if(typeof v === 'number' && isFinite(v)) out += '<c r="'+ref+'"'+sa+'><v>'+v+'</v></c>';
        else out += '<c r="'+ref+'"'+sa+' t="inlineStr"><is><t xml:space="preserve">'+_xlsxEsc(v)+'</t></is></c>';
      });
      out += '</row>';
    });
    out += '</sheetData>';
    if(h.merges && h.merges.length) out += '<mergeCells count="'+h.merges.length+'">' + h.merges.map(function(m){ return '<mergeCell ref="'+m+'"/>'; }).join('') + '</mergeCells>';
    out += '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>';
    if(h.horizontal) out += '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>';
    return out + '</worksheet>';
  };
  var files = [];
  files.push({ name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + hojas.map(function(h, i){ return '<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' });
  files.push({ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
  files.push({ name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
    + hojas.map(function(h, i){ return '<sheet name="'+_xlsxEsc(h.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'; }).join('') + '</sheets></workbook>' });
  files.push({ name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + hojas.map(function(h, i){ return '<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>'; }).join('')
    + '<Relationship Id="rId'+(hojas.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
  files.push({ name: 'xl/styles.xml', data: _xlsxStylesXml() });
  hojas.forEach(function(h, i){ files.push({ name: 'xl/worksheets/sheet'+(i+1)+'.xml', data: hojaXml(h) }); });
  return files;
}

// ZIP sin compresión (método "store") con CRC-32 calculado a mano, como _xlsxDownload
function _zipStore(files){
  var enc = new TextEncoder();
  var crcT = (function(){ var t = new Uint32Array(256); for(var n = 0; n < 256; n++){ var c = n; for(var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  var crc32 = function(b){ var c = 0xFFFFFFFF; for(var i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  var u16 = function(n){ return [n & 0xFF, (n >>> 8) & 0xFF]; }, u32 = function(n){ return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]; };
  var chunks = [], central = [], offset = 0;
  files.forEach(function(f){
    var nb = enc.encode(f.name), db = enc.encode(f.data), crc = crc32(db);
    var lh = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(db.length), u32(db.length), u16(nb.length), u16(0));
    chunks.push(new Uint8Array(lh), nb, db);
    var ch = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(db.length), u32(db.length), u16(nb.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
    central.push(new Uint8Array(ch), nb);
    offset += lh.length + nb.length + db.length;
  });
  var cSize = central.reduce(function(a, c){ return a + c.length; }, 0);
  central.forEach(function(c){ chunks.push(c); });
  chunks.push(new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cSize), u32(offset), u16(0))));
  return chunks;
}

function xlsxEscribir(nombre, hojas){
  var blob = new Blob(_zipStore(xlsxArchivos(hojas)), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  var url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = /\.xlsx$/i.test(nombre) ? nombre : nombre + '.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
}

// "$1.234,56" → 1234.56 · "12%" → texto · "—" → vacío. Lo demás queda como texto.
function _pgCeldaValor(t){
  t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  if(!t || t === '—' || t === '-') return '';
  var m = t.replace(/^\(?(-)?\s*\$\s*/, '$1').replace(/\)$/, '');
  if(/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(m) || /^-?\d+(,\d+)?$/.test(m)){
    var n = parseFloat(m.replace(/\./g, '').replace(',', '.'));
    if(isFinite(n)) return /^\(.*\)$/.test(t) ? -n : n;
  }
  return t;
}
function _pgTextoCelda(el){
  var c = el.cloneNode(true);
  Array.prototype.forEach.call(c.querySelectorAll('button,select,input,textarea,.no-export,script,style'), function(x){ x.remove(); });
  return c.textContent;
}
// El título de una tabla: el encabezado más cercano por arriba (.ct, h3, h4) o "Tabla N"
function _pgTituloTabla(tabla, i){
  var n = tabla;
  for(var k = 0; k < 6 && n; k++){
    var p = n.previousElementSibling;
    while(p){
      if(p.getAttribute && p.getAttribute('data-titulo')) return p.getAttribute('data-titulo');
      var t = p.matches && p.matches('.ct,h2,h3,h4') ? p : (p.querySelector && p.querySelector('[data-titulo],.ct,h2,h3,h4'));
      if(t && (t.getAttribute('data-titulo') || t.textContent.trim())) return t.getAttribute('data-titulo') || t.textContent.trim();
      p = p.previousElementSibling;
    }
    n = n.parentElement;
  }
  var base = tabla.closest && tabla.closest('[data-titulo-base]');
  return (base ? base.getAttribute('data-titulo-base') + ' ' : 'Tabla ') + (i + 1);
}
function _pgTablaFilas(tabla){
  var filas = [];
  Array.prototype.forEach.call(tabla.querySelectorAll('tr'), function(tr){
    if(tr.closest('.no-export')) return;
    var fila = [], esEnc = !!tr.closest('thead') || (tr.querySelectorAll('th').length && !tr.querySelectorAll('td').length);
    Array.prototype.forEach.call(tr.children, function(td){
      if(td.classList && td.classList.contains('no-export')) return;
      var v = _pgCeldaValor(_pgTextoCelda(td));
      fila.push(esEnc ? { v: String(v), s: 'encabezado' } : (typeof v === 'number' ? { v: v, s: 'monto' } : { v: v, s: 'texto' }));
      var span = parseInt(td.getAttribute && td.getAttribute('colspan'), 10) || 1;
      for(var k = 1; k < span; k++) fila.push(esEnc ? { v: '', s: 'encabezado' } : '');
    });
    if(fila.some(function(c){ return (c && c.v !== '' && c.v != null) || (c !== '' && c != null && typeof c !== 'object'); })) filas.push(fila);
  });
  return filas;
}

// Exporta lo que se ve en un contenedor: todas sus tablas
function pgExportarTablas(id, titulo, formato){
  var el = typeof id === 'string' ? document.getElementById(id) : id;
  if(!el){ if(typeof toast === 'function') toast('No encuentro qué exportar', 'error'); return; }
  var tablas = Array.prototype.filter.call(el.querySelectorAll('table'), function(t){ return !t.closest('.no-export'); });
  var fecha = (typeof hoyLocalISO === 'function') ? hoyLocalISO() : new Date().toISOString().slice(0, 10);
  var base = String(titulo || 'Reporte').replace(/[^\wÁÉÍÓÚÑáéíóúñ -]+/g, '').trim().replace(/\s+/g, '_');
  if(formato === 'excel'){
    if(!tablas.length){ if(typeof toast === 'function') toast('Esta vista no tiene tablas para Excel', 'error'); return; }
    var hojas = tablas.map(function(t, i){
      var filas = _pgTablaFilas(t), ancho = filas.reduce(function(a, f){ return Math.max(a, f.length); }, 0);
      var cols = []; for(var c = 0; c < ancho; c++) cols.push(c === 0 ? 30 : 16);
      return { name: _pgTituloTabla(t, i), rows: [[{ v: titulo + ' · ' + _pgTituloTabla(t, i), s: 'titulo' }], [{ v: 'Generado: ' + new Date().toLocaleString('es-VE'), s: 'nota' }], []].concat(filas), cols: cols };
    });
    xlsxEscribir(base + '_' + fecha + '.xlsx', hojas);
    return;
  }
  // PDF: la vista tal cual, sin botones ni campos, con los gráficos como imagen
  var c = el.cloneNode(true);
  var lienzos = el.querySelectorAll('canvas'), copias = c.querySelectorAll('canvas');
  Array.prototype.forEach.call(copias, function(cv, i){
    try { var img = document.createElement('img'); img.src = lienzos[i].toDataURL('image/png'); img.style.maxWidth = '100%'; cv.parentNode.replaceChild(img, cv); } catch(e){ cv.remove(); }
  });
  Array.prototype.forEach.call(c.querySelectorAll('button,select,input,textarea,.no-export,script'), function(x){ x.remove(); });
  var ancha = tablas.some(function(t){ return (t.querySelector('tr') || { children: [] }).children.length > 8; });
  _abrirVentanaImpresion(titulo, c.innerHTML, { horizontal: ancha });
}

// Los dos botones, para cualquier vista de Finanzas
function pgBotonesExportar(id, titulo, extra){
  var t = String(titulo || '').replace(/'/g, "\\'");
  return '<div class="no-export" style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;margin:0 0 10px">' + (extra || '')
    + '<button class="btn btn-g btn-sm" onclick="pgExportarTablas(\'' + id + '\',\'' + t + '\',\'excel\')">⬇ Excel</button>'
    + '<button class="btn btn-g btn-sm" onclick="pgExportarTablas(\'' + id + '\',\'' + t + '\',\'pdf\')">📄 PDF</button></div>';
}

// La pestaña Egresos es una lista (no una tabla): se exporta desde los datos, con lo mismo que se ve
function finExportarEgresos(formato){
  var lista = (typeof _concFiltrarEgresos === 'function' ? _concFiltrarEgresos(S.egresos || []) : (S.egresos || []))
    .filter(function(e){ return e && !e.eliminado; }).slice().sort(function(a, b){ return String(b.fecha || '').localeCompare(String(a.fecha || '')); });
  var enc = ['Fecha', 'Concepto', 'Categoría', 'Forma de pago', 'Monto ($)', 'Referencia', 'Proveedor', 'RIF', 'N° de factura', 'N° de control'];
  var filas = lista.map(function(e){ var f = e.fiscal || {};
    return [e.fecha || '', e.concepto || '', e.categoria || '', e.forma || '', +e.monto || 0, e.referencia || e.notas || '', f.proveedor || '', f.rif || '', f.numero || '', f.control || '']; });
  var total = Math.round(filas.reduce(function(a, f){ return a + f[4]; }, 0) * 100) / 100;
  var fecha = (typeof hoyLocalISO === 'function') ? hoyLocalISO() : new Date().toISOString().slice(0, 10);
  if(formato === 'excel'){
    xlsxEscribir('Egresos_' + fecha + '.xlsx', [{ name: 'Egresos', cols: [11, 46, 14, 20, 14, 18, 30, 14, 14, 14], rows:
      [[{ v: 'Egresos · ' + lista.length + ' registros', s: 'titulo' }], [{ v: 'Generado: ' + new Date().toLocaleString('es-VE'), s: 'nota' }], [],
       enc.map(function(h){ return { v: h, s: 'encabezado' }; })]
      .concat(filas.map(function(f){ return f.map(function(v, i){ return i === 4 ? { v: v, s: 'monto' } : { v: v, s: 'texto' }; }); }))
      .concat([[ '', '', '', { v: 'TOTAL', s: 'totalEtiqueta' }, { v: total, s: 'totalMonto' } ]]) }]);
    return;
  }
  var esc = function(v){ return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  _abrirVentanaImpresion('Egresos', '<h3>Egresos · ' + lista.length + ' registros</h3><table><thead><tr>' + enc.map(function(h){ return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>'
    + filas.map(function(f){ return '<tr>' + f.map(function(v, i){ return '<td' + (i === 4 ? ' style="text-align:right;white-space:nowrap"' : '') + '>' + (i === 4 ? fmt(v) : esc(v)) + '</td>'; }).join('') + '</tr>'; }).join('')
    + '<tr><td colspan="4" style="text-align:right;font-weight:800">TOTAL</td><td style="text-align:right;font-weight:800;white-space:nowrap">' + fmt(total) + '</td><td colspan="5"></td></tr></tbody></table>', { horizontal: true });
}

if(typeof module !== 'undefined' && module.exports) module.exports = { xlsxArchivos: xlsxArchivos, _zipStore: _zipStore, _pgCeldaValor: _pgCeldaValor, XLSX_ESTILOS: XLSX_ESTILOS };
