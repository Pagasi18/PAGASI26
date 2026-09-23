// ══════════════════════════════════════════════════════════════════════════
// NUEVA METODOLOGIA — como se reparte lo que paga el cliente
// ══════════════════════════════════════════════════════════════════════════
// 23-sep-2026, Adam: "yo cobro 12% de interes anual y el resto es Pagasi Protect
// del pago que me tiene que hacer el cliente... y de Pagasi Protect hay que pagar
// el IVA".
// El contrato que se firma hoy ya esta armado asi, pero el sistema no lo mostraba
// en ningun sitio: en Finanzas todo el dinero cobrado se veia como una sola bolsa.
// Esta pantalla lo abre en las cuatro partes que son de verdad distintas, porque
// una de ellas (el IVA) no es de Pagasi: se le debe al SENIAT.
//
//   Lo que el cliente paga en cuotas
//     ├── Recuperacion del precio   lo que falta de la moto tras la inicial
//     ├── Intereses financieros     12 % anual sobre el monto financiado
//     └── Pagasi Protect            lo que queda, que es el servicio
//           ├── Base imponible      Protect ÷ 1,16
//           └── IVA (16 %)          el resto
//
// El IVA sale de dividir entre 1,16 y no de tomar el 16 % del total: el monto del
// Protect ya trae el impuesto dentro (Adam lo confirmo el 23-sep-2026). Tomar el
// 16 % del total daria un impuesto del 19 % sobre la base y no cuadraria contra
// una declaracion.

var _METO_IVA = 0.16;

// El reparto de UN credito, segun el contrato que firmo.
function _metoDeCredito(c){
  if(!c || typeof _protectFinanzas!=='function') return null;
  var F = _protectFinanzas(c);
  if(!F || !(F.MTA > 0)) return null;
  var protect = F.protect || 0;
  var base = Math.round((protect / (1 + _METO_IVA)) * 100) / 100;
  var iva  = Math.round((protect - base) * 100) / 100;
  return {
    id: c.id, cli: c.cli || '', fecha: c.fecha || '', estado: c.estado || '',
    precio: F.precio, inicial: F.inicial,
    // Las cuatro partes de lo que el cliente paga EN CUOTAS (la inicial va aparte:
    // esa no la financia Pagasi, la pone el cliente de entrada).
    recuperacion: F.saldoPrecio,     // devuelve lo que falta del precio de la moto
    intereses: F.intereses,          // 12 % anual sobre el monto financiado
    protect: protect,                // el servicio, con el IVA dentro
    protectBase: base,               // lo que es de Pagasi
    iva: iva,                        // lo que es del SENIAT
    total: F.MTA                     // = recuperacion + intereses + protect
  };
}

// Lo cobrado de un credito se reparte en la misma proporcion que su contrato: de
// cada dolar que entra, la misma tajada es Protect, intereses y precio. Es el
// criterio mas simple de auditar — "de cada $100 de este credito, $X son Protect" —
// y no depende de a que cuota se imputo cada pago.
function _metoRepartir(R, cobrado){
  var f = (R && R.total > 0) ? (cobrado / R.total) : 0;
  var r2 = function(x){ return Math.round(x * 100) / 100; };
  return {
    cobrado: r2(cobrado),
    recuperacion: r2(R.recuperacion * f),
    intereses: r2(R.intereses * f),
    protect: r2(R.protect * f),
    protectBase: r2(R.protectBase * f),
    iva: r2(R.iva * f)
  };
}

// Los pagos que cuentan: cuotas confirmadas. La inicial NO entra — el cliente la
// pone de entrada, no la financia nadie, y no lleva Protect.
function _metoPagosDe(creds, desde, hasta){
  var porCred = {};
  (S.pagos||[]).forEach(function(p){
    if(!p || p.eliminado || p.estado!=='confirmado') return;
    if(p.esInicial || p.tipoOperacion==='inicial_credito') return;
    var f = String(p.fecha||'').slice(0,10);
    if(desde && f < desde) return;
    if(hasta && f > hasta) return;
    var k = String(p.cred||p.creditoId||'');
    porCred[k] = (porCred[k]||0) + (parseFloat(p.monto)||0);
  });
  return porCred;
}

var _METO_PERIODO = 'mes';   // mes · quincena · ano · todo
function _metoSetPeriodo(p){ _METO_PERIODO = p; if(typeof nav==='function') nav('reportes'); }

function _metoRango(){
  var hoy = (typeof hoyLocalISO==='function') ? hoyLocalISO() : new Date().toISOString().slice(0,10);
  var d = new Date(hoy+'T12:00:00');
  if(_METO_PERIODO === 'todo')     return { desde:'', hasta:'', lbl:'desde el principio' };
  if(_METO_PERIODO === 'ano')      return { desde: hoy.slice(0,4)+'-01-01', hasta: hoy, lbl:'este año' };
  if(_METO_PERIODO === 'quincena'){
    var dia = d.getDate();
    var ini = hoy.slice(0,8) + (dia<=15 ? '01' : '16');
    return { desde: ini, hasta: hoy, lbl: (dia<=15?'esta quincena (1 al 15)':'esta quincena (16 en adelante)') };
  }
  return { desde: hoy.slice(0,7)+'-01', hasta: hoy, lbl:'este mes' };
}

// ── La pantalla ───────────────────────────────────────────────────────────
function _renderNuevaMetodologia(){
  var esc = function(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var creds = (typeof _concFiltrar==='function' ? _concFiltrar(S.creds||[]) : (S.creds||[]))
    .filter(function(c){ return c && !c.eliminado && c.estado!=='cancelado' && c.estado!=='rechazado' && c.estado!=='pendiente_revision'; });

  var repartos = [], sinCalcular = 0;
  creds.forEach(function(c){
    var R = _metoDeCredito(c);
    if(R) repartos.push(R); else sinCalcular++;
  });

  var rango = _metoRango();
  var cobradoPorCred = _metoPagosDe(creds, rango.desde, rango.hasta);

  var cero = { cobrado:0, recuperacion:0, intereses:0, protect:0, protectBase:0, iva:0 };
  var cob = Object.assign({}, cero), pac = { total:0, recuperacion:0, intereses:0, protect:0, protectBase:0, iva:0 };
  var filas = [];
  repartos.forEach(function(R){
    pac.total += R.total; pac.recuperacion += R.recuperacion; pac.intereses += R.intereses;
    pac.protect += R.protect; pac.protectBase += R.protectBase; pac.iva += R.iva;
    var c = _metoRepartir(R, cobradoPorCred[String(R.id)] || 0);
    ['cobrado','recuperacion','intereses','protect','protectBase','iva'].forEach(function(k){ cob[k] += c[k]; });
    if(c.cobrado > 0.004) filas.push({ R:R, c:c });
  });
  filas.sort(function(a,b){ return b.c.cobrado - a.c.cobrado; });

  var pct = function(parte, total){ return total>0 ? (Math.round(parte*1000/total)/10).toLocaleString('es-VE')+'%' : '—'; };
  var btn = function(k, lbl){
    var on = _METO_PERIODO===k;
    return '<button class="btn '+(on?'btn-p':'btn-g')+' btn-sm" onclick="_metoSetPeriodo(\''+k+'\')">'+lbl+'</button>';
  };
  var tarjeta = function(lbl, valor, sub, color){
    return '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:18px;padding:18px 20px">'
      + '<div style="font-size:11.5px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">'+lbl+'</div>'
      + '<div style="font-family:var(--fd);font-weight:900;font-size:26px;letter-spacing:-.8px;margin:8px 0 2px;color:'+(color||'var(--ink)')+'">'+valor+'</div>'
      + '<div style="font-size:11.5px;color:var(--ink3)">'+sub+'</div></div>';
  };

  return '<div class="card" style="margin-bottom:16px">'
    + '<div class="ch"><div><div class="ct">Nueva metodología</div>'
    + '<div class="cs">Cómo se reparte lo que paga el cliente: precio, intereses del 12 % y Pagasi Protect con su IVA</div></div>'
    + '<div style="display:flex;gap:6px">'+btn('quincena','Quincena')+btn('mes','Mes')+btn('ano','Año')+btn('todo','Todo')+'</div></div>'

    // ── Lo cobrado de verdad ────────────────────────────────────────────
    + '<div style="padding:4px 2px 0">'
    + '<div style="font-size:12.5px;font-weight:800;color:var(--ink2);margin:6px 0 10px">Cobrado en cuotas · '+rango.lbl+'</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">'
    +   tarjeta('Cobrado', fmt(cob.cobrado), 'sin contar las iniciales', 'var(--p1)')
    +   tarjeta('Recuperación del precio', fmt(cob.recuperacion), pct(cob.recuperacion, cob.cobrado)+' de lo cobrado')
    +   tarjeta('Intereses 12 % anual', fmt(cob.intereses), pct(cob.intereses, cob.cobrado)+' de lo cobrado', 'var(--green)')
    +   tarjeta('Pagasi Protect', fmt(cob.protectBase), 'sin IVA · '+pct(cob.protectBase, cob.cobrado)+' de lo cobrado', 'var(--p1)')
    +   tarjeta('IVA 16 %', fmt(cob.iva), 'esto no es de Pagasi', 'var(--amber)')
    + '</div></div>'

    // ── Lo pactado, toda la cartera ─────────────────────────────────────
    + '<div style="padding:18px 2px 0">'
    + '<div style="font-size:12.5px;font-weight:800;color:var(--ink2);margin:6px 0 10px">Pactado · toda la cartera ('+repartos.length+' crédito'+(repartos.length===1?'':'s')+')</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">'
    +   tarjeta('Total a cobrar', fmt(pac.total), 'en cuotas, sin las iniciales')
    +   tarjeta('Recuperación del precio', fmt(pac.recuperacion), pct(pac.recuperacion, pac.total)+' del total')
    +   tarjeta('Intereses 12 % anual', fmt(pac.intereses), pct(pac.intereses, pac.total)+' del total', 'var(--green)')
    +   tarjeta('Pagasi Protect', fmt(pac.protectBase), 'sin IVA · '+pct(pac.protectBase, pac.total)+' del total', 'var(--p1)')
    +   tarjeta('IVA 16 %', fmt(pac.iva), 'cuando se termine de cobrar', 'var(--amber)')
    + '</div></div>'

    // ── Cómo se hace la cuenta, escrito ─────────────────────────────────
    + '<div style="margin-top:18px;background:var(--surf2);border:1px solid var(--rim);border-radius:14px;padding:14px 16px;font-size:12px;line-height:1.7;color:var(--ink2)">'
    + '<b>Cómo se saca cada parte.</b> De lo que el cliente paga en cuotas: primero se aparta lo que falta del precio de la moto después de su inicial; '
    + 'los <b>intereses</b> son el 12 % anual sobre el monto financiado, calculado quincena a quincena sobre el saldo; y <b>todo lo que sobra es Pagasi Protect</b>. '
    + 'Del Protect, la base sale de dividir entre 1,16 y el resto es el IVA — el monto ya trae el impuesto dentro, así que el IVA es el 16 % de la base y cuadra contra una declaración. '
    + '<br>Lo cobrado de cada crédito se reparte en la misma proporción que su contrato: de cada dólar que entra, la misma tajada es Protect, intereses y precio. '
    + '<b>La inicial no entra en esta cuenta</b>: el cliente la pone de entrada, no la financia nadie y no lleva Protect.'
    + (sinCalcular ? '<br><span style="color:var(--amber);font-weight:700">'+sinCalcular+' crédito'+(sinCalcular===1?'':'s')+' no se pudo repartir</span> (le falta la cuota quincenal o el número de cuotas).' : '')
    + '</div>'

    // ── Crédito por crédito ─────────────────────────────────────────────
    + (filas.length
      ? '<div style="margin-top:16px"><div style="font-size:12.5px;font-weight:800;color:var(--ink2);margin-bottom:8px">Crédito por crédito · '+rango.lbl+'</div>'
        + '<div class="tw"><table><thead><tr>'
        + '<th>Crédito</th><th>Cliente</th><th style="text-align:right">Cobrado</th>'
        + '<th style="text-align:right">Precio</th><th style="text-align:right">Intereses</th>'
        + '<th style="text-align:right">Protect</th><th style="text-align:right">IVA</th></tr></thead><tbody>'
        + filas.map(function(x){
            return '<tr><td style="font-weight:700">'+esc(x.R.id)+'</td><td>'+esc(x.R.cli)+'</td>'
              + '<td style="text-align:right;font-weight:800">'+fmt(x.c.cobrado)+'</td>'
              + '<td style="text-align:right">'+fmt(x.c.recuperacion)+'</td>'
              + '<td style="text-align:right;color:var(--green)">'+fmt(x.c.intereses)+'</td>'
              + '<td style="text-align:right;color:var(--p1)">'+fmt(x.c.protectBase)+'</td>'
              + '<td style="text-align:right;color:var(--amber)">'+fmt(x.c.iva)+'</td></tr>';
          }).join('')
        + '</tbody><tfoot><tr style="font-weight:900;background:var(--surf2)">'
        + '<td colspan="2">TOTAL</td><td style="text-align:right">'+fmt(cob.cobrado)+'</td>'
        + '<td style="text-align:right">'+fmt(cob.recuperacion)+'</td>'
        + '<td style="text-align:right">'+fmt(cob.intereses)+'</td>'
        + '<td style="text-align:right">'+fmt(cob.protectBase)+'</td>'
        + '<td style="text-align:right">'+fmt(cob.iva)+'</td></tr></tfoot></table></div></div>'
      : '<div style="margin-top:16px;padding:20px;text-align:center;color:var(--ink3);font-size:12.5px">Sin cuotas cobradas en este período.</div>')

    + '<div style="margin-top:14px;display:flex;gap:8px">'
    + '<button class="btn btn-g btn-sm" onclick="_metoExportarCSV()">↓ Exportar CSV</button></div>'
    + '</div>';
}

// El mismo reparto, en un archivo que se abre con Excel.
function _metoExportarCSV(){
  var creds = (typeof _concFiltrar==='function' ? _concFiltrar(S.creds||[]) : (S.creds||[]))
    .filter(function(c){ return c && !c.eliminado && c.estado!=='cancelado' && c.estado!=='rechazado' && c.estado!=='pendiente_revision'; });
  var rango = _metoRango();
  var cobrado = _metoPagosDe(creds, rango.desde, rango.hasta);
  var n2 = function(x){ return (Math.round((parseFloat(x)||0)*100)/100).toFixed(2); };
  var filas = [['Crédito','Cliente','Fecha','Estado','Precio','Inicial','Cobrado en el período',
                'Recuperación del precio','Intereses 12%','Pagasi Protect (base)','IVA 16%',
                'Pactado total','Pactado Protect (base)','Pactado IVA']];
  creds.forEach(function(c){
    var R = _metoDeCredito(c); if(!R) return;
    var x = _metoRepartir(R, cobrado[String(R.id)] || 0);
    filas.push([R.id, R.cli, R.fecha, R.estado, n2(R.precio), n2(R.inicial), n2(x.cobrado),
                n2(x.recuperacion), n2(x.intereses), n2(x.protectBase), n2(x.iva),
                n2(R.total), n2(R.protectBase), n2(R.iva)]);
  });
  var csv = filas.map(function(f){
    return f.map(function(v){ var s=String(v==null?'':v); return /[",;\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }).join(';');
  }).join('\n');
  try{
    var blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'metodologia-'+_METO_PERIODO+'-'+((typeof hoyLocalISO==='function')?hoyLocalISO():'')+'.csv';
    a.click();
    if(typeof toast==='function') toast('Archivo descargado','success');
  }catch(e){ if(typeof toast==='function') toast('No se pudo descargar','error'); }
}
