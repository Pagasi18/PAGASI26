/* Portal de aliados (pagasi.io/aliados) — 17-oct-2026.
   Dos entradas: la demostracion (usuario bera / clave 1234, datos inventados de BERA) y la de
   verdad: el dueno del concesionario entra con su correo y clave de Firebase (cuenta con rol
   "Aliado" en PAGASI 26), el portal lee SOLO los resumenes de sus sedes (aliados_resumen, que
   arma el robot cada hora con las dos companias) y pinta el mismo tablero.                  */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var USD = function(n){ return '$' + Math.round(n).toLocaleString('es-VE'); };
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var MES3 = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  function pct(x){ return (parseFloat(x) || 0).toFixed(1).replace('.', ','); }
  function fechaCorta(iso){ if(!iso) return ''; var d = String(iso).slice(0, 10).split('-'); return d.length === 3 ? (parseInt(d[2], 10) + ' ' + MES3[parseInt(d[1], 10) - 1].toLowerCase()) : iso; }
  function mesNombre(ym){ return MESES[parseInt(String(ym).slice(5, 7), 10) - 1] || ''; }
  function saludo(){ var h = new Date().getHours(); return h < 12 ? '¡Buenos días' : h < 19 ? '¡Buenas tardes' : '¡Buenas noches'; }
  function nivelDe(v){ return v >= 50000 ? ['Diamante', 2.5, 'diamante', null] : v >= 25000 ? ['Oro', 2.0, 'oro', 50000] : v >= 10000 ? ['Plata', 1.5, 'plata', 25000] : ['Bronce', 1.0, 'bronce', 10000]; }
  function multDe(a){ return a < 5 ? 110 : a <= 10 ? 100 : a <= 15 ? 75 : 50; }
  var ORDEN = ['bronce','plata','oro','diamante'], PISOS = { bronce:0, plata:10000, oro:25000, diamante:50000 };
  function posRuta(v, n){ var i = ORDEN.indexOf(n[2]), centro = 12.5 + i * 25; if(!n[3]) return 87.5; return centro + 25 * ((v - PISOS[n[2]]) / (n[3] - PISOS[n[2]])); }
  var REDUCIR = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FB_26 = { apiKey:'AIzaSyD6IznQjzF7Tdq7UJMXT4rSBdbCNpsmij4', authDomain:'pagasi26-65ced.firebaseapp.com', projectId:'pagasi26-65ced', storageBucket:'pagasi26-65ced.firebasestorage.app', messagingSenderId:'415041001199', appId:'1:415041001199:web:9844b2b6835fea0e84ad1a' };

  // ── Demostración: BERA con datos inventados (para enseñar el portal) ──
  var DEMO = {
    demo: true, nombre: 'BERA', grupo: 'Grupo BERA', logo: 'assets/aliados/bera-blanco.png', mesNombre: 'octubre', desde: 'julio', totalAliados: 13, actualizado: null,
    orden: ['todas','chacao','petare','trinidad'], NOM: { chacao:'Chacao', petare:'Petare', trinidad:'La Trinidad', todas:'Las 3' },
    SEDES: {
      todas:{ nombre:'BERA', dep:30000, saldo:12660, motos:37, motosDelta:'+12 frente a septiembre', vol:31200, bono:14, bonoPend:2, bonoDias:9, atraso:3.8, aprom:38, rec:19, total:84, comAcum:null, meses:[0,0,4200,12900,22400,31200], etiquetas:['May','Jun','Jul','Ago','Sep','Oct'] },
      chacao:{ nombre:'BERA Chacao', dep:10000, saldo:3160, motos:15, motosDelta:'+5 frente a septiembre', vol:12400, bono:6, bonoPend:1, bonoDias:9, atraso:2.9, aprom:34, rec:19, total:37, comAcum:null, meses:[0,0,2100,6300,9800,12400], etiquetas:['May','Jun','Jul','Ago','Sep','Oct'] },
      petare:{ nombre:'BERA Petare', dep:10000, saldo:5420, motos:10, motosDelta:'+3 frente a septiembre', vol:8300, bono:3, bonoPend:1, bonoDias:9, atraso:6.4, aprom:45, rec:27, total:20, comAcum:null, meses:[0,0,0,2800,5600,8300], etiquetas:['May','Jun','Jul','Ago','Sep','Oct'] },
      trinidad:{ nombre:'BERA La Trinidad', dep:10000, saldo:4080, motos:12, motosDelta:'+4 frente a septiembre', vol:10500, bono:5, bonoPend:0, bonoDias:9, atraso:3.1, aprom:36, rec:22, total:27, comAcum:null, meses:[0,0,2100,3800,7000,10500], etiquetas:['May','Jun','Jul','Ago','Sep','Oct'] }
    },
    VENTAS: [
      ['14 oct','chacao','BRZ','M. Pérez','aldia',1362,0],['14 oct','trinidad','Kavak','J. Rodríguez','aldia',942,0],
      ['13 oct','petare','SBR','A. Gómez','aldia',741,0],['13 oct','chacao','Runner','L. Martínez','aldia',882,0],
      ['11 oct','trinidad','BR200','R. Silva','atraso',735,12],['10 oct','chacao','DT 250','C. Hernández','aldia',1485,0],
      ['9 oct','petare','Socialista','D. Torres','aldia',735,0],['8 oct','trinidad','X1','P. Ramírez','aldia',738,0]
    ],
    SOL: [
      ['09:40','chacao','BRZ · V. Rojas','Aprobada en 31 min','bien'],['Ayer','trinidad','Kavak · J. Rodríguez','Aprobada en 42 min','bien'],
      ['Ayer','petare','SBR · A. Gómez','Faltan dos fotos de la cédula','ojo'],['12 oct','chacao','Runner · L. Martínez','Aprobada en 28 min','bien'],
      ['11 oct','trinidad','BR200 · R. Silva','Aprobada en 55 min','bien']
    ],
    MOVS: [
      ['14 oct','chacao','BRZ · M. Pérez',-1362,3160],['14 oct','trinidad','Kavak · J. Rodríguez',-942,4080],
      ['13 oct','petare','SBR · A. Gómez',-741,5420],['13 oct','chacao','Runner · L. Martínez',-882,4522],
      ['1 oct','todas','Depósito de Pagasi al activar la alianza',30000,30000]
    ],
    RANK: { todas: [['Concesionario · Guarenas',33600],['Grupo BERA',31200,true],['Concesionario · La Candelaria',24900],['Concesionario · Los Teques',18200],['Concesionario · Guatire',12700]] }
  };
  DEMO.RANK.chacao = DEMO.RANK.petare = DEMO.RANK.trinidad = DEMO.RANK.todas;

  // ── De los resúmenes del robot a lo que pinta el tablero ──
  // Logo del aliado: el que tenga en su ficha; si todas sus sedes son EK/Empire/Haojin, el de EK
  function logoPara(nombres, logoFicha){
    if(logoFicha) return logoFicha;
    var ns = (nombres || []).filter(Boolean);
    return ns.length && ns.every(function(n){ return /empire|\bek\b|haojin/i.test(String(n)); }) ? 'assets/aliados/ek-blanco.png' : '';
  }
  // `grupoDoc`: el resumen del GRUPO que arma el robot cuando varias sedes son de un mismo dueño
  // (un nivel, un saldo, una posición en el ranking); si viene, "todas" es ese resumen y no la suma.
  function desdeResumenes(resumenes, usuario, grupoDoc){
    var rs = (resumenes || []).filter(Boolean);
    var D = { demo:false, esGrupo:false, nombre:'', grupo:'', logo:logoPara(rs.map(function(r){ return r.nombre; }).concat(grupoDoc ? [grupoDoc.nombre] : []), usuario && usuario.logoAliado), mesNombre:'', desde:'', totalAliados:0, actualizado:null, orden:['todas'], NOM:{}, SEDES:{}, VENTAS:[], SOL:[], MOVS:[], RANK:{} };
    if(!rs.length) return D;
    var hoyYm = (rs[0].hoy || new Date().toISOString().slice(0, 10)).slice(0, 7);
    D.mesNombre = mesNombre(rs[0].mes && rs[0].mes.ym || hoyYm);
    D.grupo = (usuario && usuario.grupo) || (grupoDoc && grupoDoc.nombre) || (usuario && usuario.nombre) || rs[0].nombre || 'Aliado';
    D.nombre = (usuario && usuario.grupo) || (grupoDoc && grupoDoc.nombre) || (rs.length === 1 ? rs[0].nombre : D.grupo);
    var act = rs.map(function(r){ return r.actualizadoEn || ''; }).sort().pop();
    if(act){ var dAct = new Date(act); D.actualizado = (isNaN(dAct) ? '' : ('a las ' + dAct.getHours() + ':' + ('0' + dAct.getMinutes()).slice(-2))); }
    var mesAntNombre = mesNombre(rs[0].meses && rs[0].meses.length > 1 ? rs[0].meses[rs[0].meses.length - 2].ym : hoyYm);
    var etiquetas = (rs[0].meses || []).map(function(m){ return MES3[parseInt(String(m.ym).slice(5, 7), 10) - 1] || m.ym; });
    function sedeDe(r){
      var m = r.mes || {}, c = r.calidad || {}, dep = r.deposito || {}, s = r.solicitudes || {}, d = r.desde || {}, b = r.bono || {};
      var delta = (m.motos || 0) - (m.motosAnt || 0);
      return { nombre: r.nombre || r.concId, dep: dep.enviado || 0, saldo: dep.saldo || 0, motos: m.motos || 0, motosAnt: m.motosAnt || 0,
        motosDelta: (delta >= 0 ? '+' : '') + delta + ' frente a ' + mesAntNombre, vol: m.vol || 0,
        bono: b.aplica ? (b.completas || 0) : null, bonoPend: 0, bonoDias: b.diasRestantes || 0,
        atraso: c.atrasoPct || 0, cartera: c.cartera || 0, atrasados: c.atrasados || 0, aprom: s.prom || null, rec: s.rec || null,
        total: d.motos || 0, comAcum: d.comision || 0, inicio: d.inicio || '', meses: (r.meses || []).map(function(x){ return x.vol || 0; }), etiquetas: etiquetas, ranking: r.ranking || null };
    }
    rs.forEach(function(r){
      var k = r.concId; D.orden.push(k); D.NOM[k] = String(r.nombre || k).replace(/^EMPIRE\s+/i, 'EK ');
      D.SEDES[k] = sedeDe(r);
      (r.ventas || []).forEach(function(v){ D.VENTAS.push([fechaCorta(v.fecha), k, v.modelo, v.nombre, v.dias > 0 ? 'atraso' : 'aldia', v.fin || 0, v.dias || 0, v.fecha, v.empresa || '']); });
      var sol = r.solicitudes || {};
      (sol.pendientes || []).forEach(function(p){ D.SOL.push(['Pendiente', k, p.modelo + ' · ' + p.nombre, 'En revisión' + (p.vendedor ? ' · ' + p.vendedor : ''), 'ojo', '9999']); });
      (sol.ultimas || []).forEach(function(a){ D.SOL.push([fechaCorta(a.fecha), k, a.modelo + ' · ' + a.nombre, 'Aprobada en ' + a.minutos + ' min', 'bien', a.fecha]); });
      ((r.deposito || {}).movimientos || []).forEach(function(mv){ D.MOVS.push([fechaCorta(mv.fecha), k, mv.detalle, mv.monto, mv.saldo, mv.fecha, mv.empresa || '']); });
      if(r.ranking) D.RANK[k] = (r.ranking.lista || []).map(function(f){ return [f.tu ? D.NOM[k] + ' (tú)' : f.nombre, f.vol, !!f.tu]; });
      if(r.ranking && r.ranking.total > D.totalAliados) D.totalAliados = r.ranking.total;
    });
    D.VENTAS.sort(function(a, b){ return String(b[7]).localeCompare(String(a[7])); });
    D.SOL.sort(function(a, b){ return String(b[5]).localeCompare(String(a[5])); });
    D.MOVS.sort(function(a, b){ return String(b[5]).localeCompare(String(a[5])); });
    D.NOM.todas = 'Las ' + rs.length;
    // El grupo: la suma de las sedes
    var ss = rs.map(function(r){ return D.SEDES[r.concId]; });
    var sum = function(f){ return ss.reduce(function(a, s){ return a + (parseFloat(s[f]) || 0); }, 0); };
    var cartera = sum('cartera'), atrasados = sum('atrasados');
    var proms = ss.map(function(s){ return s.aprom; }).filter(function(x){ return x; }), recs = ss.map(function(s){ return s.rec; }).filter(function(x){ return x; });
    var inicios = ss.map(function(s){ return s.inicio; }).filter(Boolean).sort();
    var conBono = ss.filter(function(s){ return s.bono !== null; });
    var mejor = ss.slice().sort(function(a, b){ return b.vol - a.vol; })[0];
    D.SEDES.todas = { nombre: D.nombre, dep: sum('dep'), saldo: sum('saldo'), motos: sum('motos'), motosAnt: sum('motosAnt'),
      motosDelta: ((sum('motos') - sum('motosAnt')) >= 0 ? '+' : '') + (sum('motos') - sum('motosAnt')) + ' frente a ' + mesAntNombre, vol: sum('vol'),
      bono: conBono.length ? conBono.reduce(function(a, s){ return a + s.bono; }, 0) : null, bonoPend: 0, bonoDias: conBono.length ? Math.max.apply(null, conBono.map(function(s){ return s.bonoDias; })) : 0,
      atraso: cartera ? Math.round(atrasados / cartera * 1000) / 10 : 0, cartera: cartera, atrasados: atrasados,
      aprom: proms.length ? Math.round(proms.reduce(function(a, x){ return a + x; }, 0) / proms.length) : null, rec: recs.length ? Math.min.apply(null, recs) : null,
      total: sum('total'), comAcum: Math.round(sum('comAcum') * 100) / 100, inicio: inicios[0] || '',
      meses: ss[0].meses.map(function(_, i){ return ss.reduce(function(a, s){ return a + (s.meses[i] || 0); }, 0); }), etiquetas: etiquetas,
      ranking: mejor ? mejor.ranking : null, rankingDe: mejor ? D.NOM[rs[ss.indexOf(mejor)].concId] : '' };
    D.RANK.todas = mejor ? D.RANK[rs[ss.indexOf(mejor)].concId] : [];
    D.desde = inicios[0] ? mesNombre(inicios[0].slice(0, 7)) + ' de ' + inicios[0].slice(0, 4) : '';
    // Un grupo de verdad: el robot ya juntó las sedes como un solo aliado
    if(grupoDoc && grupoDoc.mes){
      D.esGrupo = true;
      var g = sedeDe(grupoDoc); g.nombre = D.nombre; g.esGrupo = true; g.rankingDe = '';
      D.SEDES.todas = g;
      D.NOM.todas = D.nombre;
      D.RANK.todas = grupoDoc.ranking ? (grupoDoc.ranking.lista || []).map(function(f){ return [f.tu ? D.nombre + ' (tú)' : f.nombre, f.vol, !!f.tu]; }) : D.RANK.todas;
      if(grupoDoc.ranking && grupoDoc.ranking.total > D.totalAliados) D.totalAliados = grupoDoc.ranking.total;
      var ini = grupoDoc.desde && grupoDoc.desde.inicio; if(ini) D.desde = mesNombre(ini.slice(0, 7)) + ' de ' + ini.slice(0, 4);
    }
    return D;
  }

  // ── Pintar ──
  var D = DEMO, prev = {}, sedeActual = 'todas';
  function cuenta(id, hasta, fmt){
    var el = $(id), desde = (id in prev) ? prev[id] : 0; prev[id] = hasta;
    if(REDUCIR || desde === hasta || !window.requestAnimationFrame){ el.textContent = fmt(hasta); return; }
    var t0 = null, dur = 700;
    requestAnimationFrame(function paso(t){ if(t0 === null) t0 = t; var p = Math.min(1, (t - t0) / dur); p = 1 - Math.pow(1 - p, 3); el.textContent = fmt(desde + (hasta - desde) * p); if(p < 1) requestAnimationFrame(paso); else el.textContent = fmt(hasta); });
  }
  function botonesSedes(){
    var cont = $('sedes'); if(!cont) return;
    cont.innerHTML = D.orden.map(function(k){ return '<button type="button" data-sede="' + k + '" aria-pressed="' + (k === 'todas') + '">' + (k === 'todas' ? (D.esGrupo ? D.nombre + ' · las ' + (D.orden.length - 1) + ' sedes' : 'Las ' + (D.orden.length - 1) + ' sedes') : D.NOM[k]) + '</button>'; }).join('');
    cont.hidden = D.orden.length <= 2;
    cont.querySelectorAll('button').forEach(function(b){ b.addEventListener('click', function(){ pinta(b.dataset.sede); }); });
  }
  function cabecera(){
    var img = $('quien-logo'), nom = $('quien-nombre');
    if(img){ img.hidden = !D.logo; if(D.logo) img.src = D.logo; }
    if(nom){ nom.hidden = !!D.logo; nom.textContent = D.grupo || D.nombre; }
    var ahora = new Date();
    $('vivo-hora').textContent = D.actualizado ? ('hoy ' + D.actualizado) : ('hoy a las ' + ahora.getHours() + ':' + ('0' + ahora.getMinutes()).slice(-2));
    var wa = $('wa-asesor'); if(wa) wa.href = 'https://wa.me/584242177798?text=' + encodeURIComponent('Hola, escribo desde el portal de aliados de ' + (D.grupo || D.nombre) + '.');
  }
  function pinta(k){
    if(!D.SEDES[k]) k = 'todas';
    sedeActual = k;
    var s = D.SEDES[k];
    document.querySelectorAll('#sedes button').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.sede === k)); });
    $('titulo').textContent = (k === 'todas' ? saludo() + ', ' + D.nombre + '! Así va ' + D.mesNombre + '.' : 'Así va ' + D.mesNombre + ' en ' + s.nombre + '.');
    var comAcum = (s.comAcum !== null && s.comAcum !== undefined) ? s.comAcum : s.meses.reduce(function(a, v){ return a + v * nivelDe(v)[1] / 100; }, 0);
    $('desde').innerHTML = 'Desde que ' + (k === 'todas' ? 'empezaste' : 'empezó ' + s.nombre) + ' con Pagasi' + (D.desde ? ' en ' + D.desde : '') + ': <b>' + s.total + ' motos</b> y <b>' + USD(comAcum) + '</b> en comisiones' + (D.demo ? '' : ' estimadas') + '.';
    // Saldo negativo = el depósito ya se consumió y Pagasi le debe la diferencia al aliado
    var debe = s.saldo < 0;
    $('k-saldo-et').textContent = debe ? 'Pagasi te repone' : 'Saldo a tu favor';
    cuenta('k-saldo', Math.abs(s.saldo), USD);
    $('k-saldo-sub').textContent = !s.dep ? 'Sin depósito registrado todavía' : (debe ? 'ya se consumió el depósito de ' + USD(s.dep) : 'de ' + USD(s.dep) + ' depositados por Pagasi');
    $('b-saldo').style.width = (s.dep ? Math.max(0, Math.min(100, Math.round(s.saldo / s.dep * 100))) : 0) + '%';
    cuenta('k-motos', s.motos, function(v){ return String(Math.round(v)); }); $('k-motos-sub').textContent = s.motosDelta;
    var n = nivelDe(s.vol), m = multDe(s.atraso), base = s.vol * n[1] / 100;
    cuenta('k-vol', s.vol, USD); $('k-nivel').textContent = 'Nivel ' + n[0] + ' · ' + pct(n[1]) + '%';
    cuenta('k-com', base * m / 100, USD); $('k-com-sub').textContent = USD(base) + ' base × ' + m + '% por calidad de cartera';
    if(n[3]){ var falta = n[3] - s.vol, sig = nivelDe(n[3]); $('n-texto').innerHTML = 'Te faltan <b>' + USD(falta) + '</b> para ' + sig[0] + ' (' + pct(sig[1]) + '%).' + (D.demo && k === 'todas' ? ' Al ritmo de esta semana lo alcanzas en 3 semanas.' : ''); }
    else { $('n-texto').innerHTML = 'Estás en el nivel más alto. <b>Diamante · 2,5%</b>'; }
    var pos = posRuta(s.vol, n); $('ruta-fill').style.width = Math.max(0, Math.min(100, (pos - 12.5) / 75 * 100)) + '%'; $('ruta-tu').style.left = pos + '%'; $('ruta-tu').querySelector('span').textContent = 'Tú · ' + USD(s.vol);
    document.querySelectorAll('.ruta-nodo').forEach(function(e){ var i = ORDEN.indexOf(e.dataset.n), act = ORDEN.indexOf(n[2]); e.classList.toggle('falta', i > act); e.classList.toggle('aqui', i === act); });
    document.querySelectorAll('.nivel').forEach(function(e){ e.classList.toggle('on', e.dataset.n === n[2]); });
    // Bono de inicio: solo en los primeros 60 días como aliado (en la demo siempre)
    var conBono = s.bono !== null && s.bono !== undefined;
    $('card-bono').hidden = !conBono; $('card-nivel').classList.toggle('c12', !conBono); $('card-nivel').classList.toggle('c7', conBono);
    if(conBono){
      cuenta('k-bono', s.bono, function(v){ return String(Math.round(v)); });
      $('k-bono-sub').innerHTML = 'Quedan <b>' + s.bonoDias + ' días</b> · ' + Math.max(0, 20 - s.bono) + ' solicitudes más y el bono de <b>$2.000</b> es tuyo'; $('b-bono').style.width = Math.min(100, Math.round(s.bono / 20 * 100)) + '%';
      $('p-completas').textContent = '✓ ' + s.bono + ' completas'; $('p-pendientes').textContent = s.bonoPend + ' con documentos pendientes'; $('p-pendientes').hidden = !s.bonoPend;
    }
    $('q-aldia').textContent = pct(100 - s.atraso) + '%'; $('q-atraso').textContent = pct(s.atraso) + '%'; $('q-mult').textContent = m + '%';
    var qSub = $('q-sub'); if(qSub) qSub.textContent = D.demo ? 'Clientes referidos con más de 60 días de crédito' : (s.cartera ? s.cartera + ' créditos con más de 60 días · ' + s.atrasados + ' con más de 30 días de atraso' : 'Todavía no hay créditos con más de 60 días');
    [['m1',110],['m2',100],['m3',75],['m4',50]].forEach(function(p){ var tr = $(p[0]); tr.style.background = (p[1] === m) ? 'var(--azul-claro)' : ''; tr.querySelector('td:last-child').innerHTML = (p[1] === m) ? '<b>' + p[1] + '%</b>' : p[1] + '%'; });
    // Ranking
    var rank = D.RANK[k] || [];
    var max = rank.length ? Math.max.apply(null, rank.map(function(r){ return r[1]; })) : 1, yo = rank.findIndex(function(r){ return r[2]; });
    $('rank').innerHTML = rank.map(function(r, i){ return '<li' + (r[2] ? ' class="tu"' : '') + '><span class="pos">' + (i + 1) + '</span><span class="nom">' + r[0] + '</span><span class="val">' + USD(r[1]) + '</span><i><b style="width:' + (max ? Math.round(r[1] / max * 100) : 0) + '%"></b></i></li>'; }).join('');
    var posR = (!D.demo && s.ranking) ? s.ranking.posicion : (yo + 1);
    $('rank-txt').innerHTML = !rank.length ? 'Sin datos de ranking todavía.' : (posR === 1 ? '<b>Vas de primero</b> entre los aliados de Pagasi este mes.' : 'Vas de <b>#' + posR + '</b> entre ' + D.totalAliados + ' aliados.' + (yo > 0 ? ' Te faltan <b>' + USD(rank[yo - 1][1] - rank[yo][1]) + '</b> para el primer lugar.' : '')) + (k === 'todas' && !D.demo && s.rankingDe ? ' El ranking es por sede; esta es la de ' + s.rankingDe + '.' : (D.esGrupo && !D.demo ? ' Tus ' + (D.orden.length - 1) + ' sedes cuentan como un solo aliado.' : (k !== 'todas' && D.demo ? ' El ranking es por grupo.' : '')));
    $('a-prom').textContent = s.aprom ? s.aprom + ' min' : '—'; $('a-rec').textContent = s.rec ? s.rec + ' min' : '—';
    var ventas = D.VENTAS.filter(function(v){ return k === 'todas' || v[1] === k; }).slice(0, 12);
    $('v-cuenta').textContent = s.motos + ' este mes';
    var emp = function(e){ return e === '18' ? ' <span class="pill azul" title="Crédito de PAGASI 18">18</span>' : ''; };
    $('ventas').innerHTML = ventas.length ? ventas.map(function(v){ return '<tr><td>' + v[0] + emp(v[8]) + '</td><td>' + D.NOM[v[1]] + '</td><td><b>' + v[2] + '</b></td><td>' + v[3] + '</td><td>' + (v[4] === 'aldia' ? '<span class="pill bien">Al día</span>' : '<span class="pill ' + (v[6] > 30 ? 'mal' : 'ojo') + '">Atraso ' + v[6] + ' d</span>') + '</td><td class="r">' + USD(v[5]) + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="sub">Todavía no hay ventas financiadas.</td></tr>';
    var sol = D.SOL.filter(function(v){ return k === 'todas' || v[1] === k; }).slice(0, 8);
    $('solicitudes').innerHTML = sol.length ? sol.map(function(v){ return '<div class="evento"><time>' + v[0] + '</time><div><b>' + v[2] + '</b><div class="d">' + D.NOM[v[1]] + '</div></div><span class="pill ' + v[4] + '">' + v[3] + '</span></div>'; }).join('') : '<div class="sub">Sin solicitudes recientes.</div>';
    var movs = D.MOVS.filter(function(v){ return k === 'todas' || v[1] === k || v[1] === 'todas'; }).slice(0, 12);
    $('movs').innerHTML = movs.length ? movs.map(function(v){ var dep = v[3] > 0; return '<tr><td>' + v[0] + '</td><td>' + (v[1] === 'todas' ? 'Las ' + (D.orden.length - 1) : D.NOM[v[1]]) + '</td><td>' + v[2] + '</td><td class="r" style="color:' + (dep ? 'var(--bien)' : 'var(--fg)') + ';font-weight:700">' + (dep ? '+' : '−') + USD(Math.abs(v[3])) + '</td><td class="r">' + USD(v[4]) + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="sub">Sin movimientos registrados.</td></tr>';
    grafica(s.meses, s.etiquetas);
    var resumen = 'Resumen Pagasi · ' + s.nombre + ' · ' + D.mesNombre + ': ' + s.motos + ' motos financiadas, ' + USD(s.vol) + ' de volumen, nivel ' + n[0] + ' (' + pct(n[1]) + '%), comisión estimada ' + USD(base * m / 100) + ', saldo a favor ' + USD(s.saldo) + '. pagasi.io/aliados';
    $('compartir').href = 'https://wa.me/?text=' + encodeURIComponent(resumen);
    $('estado').innerHTML = '<div class="est-cab"><div><h1>Estado de cuenta · ' + D.mesNombre.charAt(0).toUpperCase() + D.mesNombre.slice(1) + ' ' + new Date().getFullYear() + '</h1><p>' + (k === 'todas' ? D.grupo + ' · ' + D.orden.slice(1).map(function(x){ return D.NOM[x]; }).join(', ') : s.nombre) + ' · emitido el ' + new Date().toLocaleDateString('es-VE', { day:'numeric', month:'long', year:'numeric' }) + '</p></div><img src="assets/pagasi-logo.png" alt="Pagasi"></div>'
      + '<div class="est-kpis"><div class="est-kpi"><small>Saldo a tu favor</small><b>' + USD(s.saldo) + '</b><span>de ' + USD(s.dep) + ' depositados</span></div><div class="est-kpi"><small>Motos financiadas</small><b>' + s.motos + '</b><span>' + s.motosDelta + '</span></div><div class="est-kpi"><small>Volumen del mes</small><b>' + USD(s.vol) + '</b><span>Nivel ' + n[0] + ' · ' + pct(n[1]) + '%</span></div><div class="est-kpi"><small>Comisión estimada</small><b>' + USD(base * m / 100) + '</b><span>' + USD(base) + ' × ' + m + '% por calidad de cartera</span></div></div>'
      + '<h3>Movimientos del depósito</h3><table><thead><tr><th>Fecha</th><th>Sede</th><th>Detalle</th><th class="r">Movimiento</th><th class="r">Saldo</th></tr></thead><tbody>' + movs.map(function(v){ return '<tr><td>' + v[0] + '</td><td>' + (v[1] === 'todas' ? 'Las ' + (D.orden.length - 1) : D.NOM[v[1]]) + '</td><td>' + v[2] + '</td><td class="r">' + (v[3] > 0 ? '+' : '−') + USD(Math.abs(v[3])) + '</td><td class="r">' + USD(v[4]) + '</td></tr>'; }).join('') + '</tbody></table>'
      + '<h3>Ventas financiadas</h3><table><thead><tr><th>Fecha</th><th>Sede</th><th>Moto</th><th>Cliente</th><th>Estado</th><th class="r">Financiado</th></tr></thead><tbody>' + ventas.map(function(v){ return '<tr><td>' + v[0] + (v[8] === '18' ? ' (P18)' : '') + '</td><td>' + D.NOM[v[1]] + '</td><td>' + v[2] + '</td><td>' + v[3] + '</td><td>' + (v[4] === 'aldia' ? 'Al día' : 'Atraso ' + v[6] + ' d') + '</td><td class="r">' + USD(v[5]) + '</td></tr>'; }).join('') + '</tbody></table>'
      + '<p class="est-pie">' + (D.demo ? 'Demostración con datos de muestra. ' : '') + 'Comisiones y bonos estimados; se confirman con la conciliación del cierre de mes. Pagasi · pagasi.io · info@pagasi.io · +58 424-217-7798</p>';
    var pie = $('pie-demo'); if(pie) pie.hidden = !D.demo;
  }
  function grafica(vals, etiquetas){
    var svg = $('graf'), W = 380, H = 330, p = { l:44, r:10, t:28, b:30 }, meses = etiquetas || ['May','Jun','Jul','Ago','Sep','Oct'];
    var max = Math.max.apply(null, vals.concat([1])), paso = max > 20000 ? 10000 : max > 8000 ? 5000 : max > 2000 ? 2000 : 500, top = Math.ceil(max / paso) * paso;
    var x = function(i){ return p.l + i * ((W - p.l - p.r) / vals.length); }, y = function(v){ return p.t + (H - p.t - p.b) * (1 - v / top); }, bw = (W - p.l - p.r) / vals.length - 12;
    var out = '';
    for(var g = 0; g <= top; g += paso){ out += '<line x1="' + p.l + '" x2="' + (W - p.r) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="#dfe6f3"/><text x="' + (p.l - 6) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="#7c88a6">' + (g >= 1000 ? (g / 1000) + 'k' : g) + '</text>'; }
    vals.forEach(function(v, i){ var h = y(0) - y(v); out += '<rect x="' + (x(i) + 6) + '" y="' + y(v) + '" width="' + bw + '" height="' + Math.max(h, 0) + '" rx="4" fill="#065cff" opacity="' + (i === vals.length - 1 ? 1 : .55) + '" style="animation-delay:' + (i * 70) + 'ms"><title>' + meses[i] + ': ' + USD(v) + '</title></rect>';
      if(v) out += '<text class="v" x="' + (x(i) + 6 + bw / 2) + '" y="' + (y(v) - 6) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#4b5875">' + USD(v) + '</text>';
      out += '<text x="' + (x(i) + 6 + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" fill="#7c88a6">' + meses[i] + '</text>'; });
    svg.innerHTML = out;
  }
  function entrar(datos){
    D = datos; prev = {};
    $('error').textContent = ''; $('entrada').hidden = true; $('tablero').hidden = false; $('tablero').classList.add('entra'); window.scrollTo(0, 0);
    botonesSedes(); cabecera(); pinta('todas');
  }
  function mostrarEntrada(){ $('tablero').hidden = true; $('tablero').classList.remove('entra'); $('entrada').hidden = false; $('clave').value = ''; window.scrollTo(0, 0); }

  // ── La entrada de verdad: Firebase (PAGASI 26) ──
  var fbApp = null, auth = null, db = null, entrando = false;
  function firebaseListo(){
    if(auth) return true;
    try{
      if(typeof firebase === 'undefined') return false;
      fbApp = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(FB_26);
      auth = firebase.auth(fbApp); db = firebase.firestore(fbApp);
      return true;
    }catch(e){ console.warn('firebase:', e); return false; }
  }
  // Modo Pagasi: el personal entra con su cuenta del sistema y elige qué aliado ver (las Reglas le
  // dejan leer todos los resúmenes). Así Adam revisa el portal de EK antes de invitar al dueño.
  var TODOS = [];
  function cargarAliado(user){
    return db.collection('usuarios').doc(user.uid).get().then(function(d){
      var u = d.exists ? d.data() : null;
      if(!u){ var e = new Error('no-aliado'); e.code = 'pagasi/no-aliado'; throw e; }
      if(u.rol !== 'Aliado'){
        return db.collection('aliados_resumen').get().then(function(snap){
          TODOS = snap.docs.map(function(x){ return x.data(); }).filter(function(r){ return r && r.concId; })
            .sort(function(a, b){ return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'); });
          if(!TODOS.length){ var e0 = new Error('sin-resumen'); e0.code = 'pagasi/sin-resumen'; throw e0; }
          return { modo: 'pagasi', quien: u.nombre || user.email || '' };
        });
      }
      var sedes = (u.concesionarios || []).map(String).filter(Boolean);
      if(!sedes.length){ var e2 = new Error('sin-sedes'); e2.code = 'pagasi/sin-sedes'; throw e2; }
      return Promise.all(sedes.map(function(id){ return db.collection('aliados_resumen').doc(id).get().then(function(r){ return r.exists ? r.data() : null; }).catch(function(){ return null; }); }))
        .then(function(rs){
          rs = rs.filter(Boolean);
          if(!rs.length){ var e3 = new Error('sin-resumen'); e3.code = 'pagasi/sin-resumen'; throw e3; }
          var gids = rs.map(function(r){ return r.grupoId || ''; });
          var gid = gids[0] && gids.every(function(x){ return x === gids[0]; }) ? gids[0] : '';
          var traerGrupo = gid ? db.collection('aliados_resumen').doc(gid).get().then(function(r){ return r.exists ? r.data() : null; }).catch(function(){ return null; }) : Promise.resolve(null);
          return traerGrupo.then(function(gd){ return { modo: 'aliado', datos: desdeResumenes(rs, { nombre: u.nombre || '', grupo: u.grupo || '', logoAliado: u.logoAliado || '' }, gd) }; });
        });
    });
  }
  function recibir(res){
    if(res.modo === 'pagasi'){ $('modo-pagasi').hidden = false; $('modo-quien').textContent = res.quien ? ' · ' + res.quien : ''; abrirPicker(); return; }
    $('modo-pagasi').hidden = true; entrar(res.datos);
  }
  function abrirPicker(){
    var lista = $('picker-lista');
    var grupos = TODOS.filter(function(r){ return r.tipo === 'grupo'; });
    var sueltas = TODOS.filter(function(r){ return r.tipo !== 'grupo' && !r.grupoId; });
    var fila = function(r, extra){ return '<label><input type="checkbox" value="' + r.concId + '"> <b>' + String(r.nombre || r.concId) + '</b>' + (extra || '') + '<span>' + (r.mes ? (r.mes.motos || 0) + ' motos este mes · ' + USD(r.mes.vol || 0) : '') + '</span></label>'; };
    lista.innerHTML = grupos.map(function(g){
      var nombres = (g.sedes || []).map(function(id){ var s = TODOS.filter(function(r){ return r.concId === id; })[0]; return s ? String(s.nombre).replace(/^EMPIRE\s+/i, 'EK ') : id; });
      return fila(g, ' <small style="color:var(--fg-3)">· un solo aliado: ' + nombres.join(', ') + '</small>');
    }).concat(sueltas.map(function(r){ return fila(r); })).join('');
    $('picker').hidden = false; $('entrada').hidden = true;
  }
  function verElegidos(){
    var ids = [].map.call(document.querySelectorAll('#picker-lista input:checked'), function(i){ return i.value; });
    if(!ids.length){ $('picker-msj').textContent = 'Marca al menos un aliado.'; return; }
    $('picker-msj').textContent = '';
    var elegidos = TODOS.filter(function(r){ return ids.indexOf(r.concId) > -1; });
    var gruposElegidos = elegidos.filter(function(r){ return r.tipo === 'grupo'; });
    // Un grupo marcado = sus sedes, con el resumen del grupo como "todas"
    var rs = [];
    elegidos.forEach(function(r){
      if(r.tipo !== 'grupo'){ rs.push(r); return; }
      (r.sedes || []).forEach(function(id){ var s = TODOS.filter(function(x){ return x.concId === id; })[0]; if(s && rs.indexOf(s) < 0) rs.push(s); });
    });
    var grupoDoc = gruposElegidos.length === 1 && elegidos.length === 1 ? gruposElegidos[0] : null;
    var grupo = String($('picker-grupo').value || '').trim();
    $('picker').hidden = true;
    entrar(desdeResumenes(rs, { nombre: grupo || (grupoDoc ? grupoDoc.nombre : (rs.length === 1 ? rs[0].nombre : rs.map(function(r){ return String(r.nombre).replace(/^EMPIRE\s+/i, 'EK '); }).join(' · '))), grupo: grupo, logoAliado: '' }, grupoDoc));
  }
  function mensajeDe(e){
    var c = String((e && e.code) || '');
    if(c === 'pagasi/no-aliado') return 'Ese correo no tiene cuenta en Pagasi. Si eres aliado, pídele a tu asesor la invitación.';
    if(c === 'pagasi/sin-sedes') return 'Tu cuenta todavía no tiene concesionarios asignados. Escríbele a tu asesor.';
    if(c === 'pagasi/sin-resumen') return 'Tus datos se están preparando. Vuelve a intentar en una hora o escríbele a tu asesor.';
    if(/wrong-password|invalid-credential|user-not-found|invalid-login/.test(c)) return 'Correo o clave incorrectos. Si no los tienes, pídeselos a tu asesor.';
    if(/too-many-requests/.test(c)) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    if(/network/.test(c)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    return 'No pudimos entrar. Intenta de nuevo o escríbele a tu asesor.';
  }
  function botonEsperando(si){
    var btn = $('entrar'); if(!btn) return;
    btn.disabled = si;
    btn.querySelector('.txt').textContent = si ? 'Entrando…' : 'Entrar al portal';
    var ic = btn.querySelector('.pg-icon, .gira'); if(ic) ic.outerHTML = si ? '<span class="gira" aria-hidden="true"></span>' : (window.PagasiSite ? PagasiSite.icon('arrow') : '→');
  }
  function fallo(msj){ $('error').textContent = msj; var caja = $('form'); caja.classList.remove('mal'); void caja.offsetWidth; caja.classList.add('mal'); botonEsperando(false); }

  // ── Arranque ──
  if(!$('form')){ window.PortalAliados = { desdeResumenes: desdeResumenes, DEMO: DEMO }; return; }
  var CUENTAS = { bera:'1234', 'grupo bera':'1234' };
  var FICHAS = { bera:{ nombre:'Grupo BERA', detalle:'Grupo BERA · 3 sedes', logo:'assets/aliados/bera-negro.png' } }; FICHAS['grupo bera'] = FICHAS.bera;
  $('usuario').addEventListener('input', function(){
    var f = FICHAS[String(this.value || '').trim().toLowerCase()];
    $('al-quien').hidden = !f; $('al-acceso').hidden = !!f;
    if(f){ $('al-quien-logo').src = f.logo; $('al-quien-txt').textContent = f.detalle; $('al-saludo').textContent = 'Hola, ' + f.nombre; }
    else { $('al-saludo').textContent = 'Entrar al portal'; }
  });
  $('ojo').addEventListener('click', function(){ var ver = $('clave').type === 'password'; $('clave').type = ver ? 'text' : 'password'; this.setAttribute('aria-pressed', String(ver)); this.setAttribute('aria-label', ver ? 'Ocultar la clave' : 'Mostrar la clave'); $('clave').focus(); });
  $('form').addEventListener('submit', function(e){
    e.preventDefault();
    if(entrando) return;
    var u = String($('usuario').value || '').trim().toLowerCase(), c = String($('clave').value || '');
    if(u.indexOf('@') > -1){
      if(!firebaseListo()){ fallo('No se pudo conectar. Revisa tu internet e intenta de nuevo.'); return; }
      entrando = true; botonEsperando(true); $('error').textContent = '';
      auth.signInWithEmailAndPassword(u, c).then(function(r){ return cargarAliado(r.user); })
        .then(function(res){ entrando = false; botonEsperando(false); recibir(res); })
        .catch(function(err){ entrando = false; console.warn('entrada:', err && err.code); fallo(mensajeDe(err)); if(/pagasi\//.test(String(err && err.code))){ try{ auth.signOut(); }catch(_e){} } });
      return;
    }
    if(CUENTAS[u] && CUENTAS[u] === c){
      botonEsperando(true);
      setTimeout(function(){ botonEsperando(false); entrar(DEMO); }, REDUCIR ? 0 : 750);
    } else { fallo('Usuario o clave incorrectos. Si no los tienes, pídeselos a tu asesor.'); }
  });
  var salir = function(e){ if(e) e.preventDefault(); var fin = function(){ D = DEMO; TODOS = []; $('picker').hidden = true; $('modo-pagasi').hidden = true; mostrarEntrada(); }; if(auth && auth.currentUser) auth.signOut().then(fin, fin); else fin(); };
  $('salir').addEventListener('click', salir);
  $('picker-salir').addEventListener('click', salir);
  $('picker-ver').addEventListener('click', verElegidos);
  $('cambiar-aliado').addEventListener('click', function(){ $('tablero').hidden = true; abrirPicker(); });
  $('pdf').addEventListener('click', function(){ $('pdf-msj').textContent = 'Se abre la ventana de impresión: elige «Guardar como PDF».'; setTimeout(function(){ window.print(); }, 50); });
  // Si ya hay sesión de aliado (viene del sistema o volvió a abrir la página), entra directo
  if(firebaseListo()){
    auth.onAuthStateChanged(function(user){
      if(!user || entrando || !$('tablero').hidden) return;
      if(!$('picker').hidden) return;
      cargarAliado(user).then(recibir).catch(function(){ /* sin ficha: se queda en la entrada */ });
    });
  }
  window.PortalAliados = { desdeResumenes: desdeResumenes, DEMO: DEMO, pinta: pinta };
})();
