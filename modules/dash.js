// Pagasi module: dash
PG.dash = function(){
  // Los empleados ven un dashboard especializado
  if(isEmpleadoRole()) return empleadoDashHTML();

  // ── Variables filtradas por concesionario activo ──
  // Si hay un concesionario en el switcher, todas las métricas se calculan solo sobre esos datos.
  var _SCREDS = _concFiltrar(S.creds||[]);
  var _SPAGOS = _concFiltrar(S.pagos||[]);
  var _SMOTOS = _concFiltrar(S.motos||[]);
  var _SEGR = _concFiltrarEgresos(S.egresos||[]);

  // ── Core metrics ──
  const mora = _SCREDS.filter(c=>c.mora>0).length;
  const activos = _SCREDS.filter(c=>c.estado==='activo').length;
  const completados = _SCREDS.filter(c=>c.estado==='completado').length;
  const totalCreds = _SCREDS.filter(c=>!c.eliminado && c.estado!=='cancelado' && c.estado!=='recuperado' && c.estado!=='recuperada').length;
  // Créditos ACTIVOS en cartera = todos los que siguen vigentes (estado 'activo' O 'mora').
  // Un crédito en mora sigue siendo activo: no está pagado. (Antes solo contaba estado==='activo',
  // dejando fuera los que tienen estado 'mora' — por eso salía 202 en vez del total real.)
  const activosArr = _SCREDS.filter(c=>!c.eliminado && (c.estado==='activo'||c.estado==='mora'));
  const activosEnCartera = activosArr.length;
  const moraEnCartera = activosArr.filter(c=>c.mora>0).length;
  const alDia = Math.max(0, activosEnCartera - moraEnCartera);
  // Cartera: suma del saldo pendiente REAL de cada crédito vigente (activo o en mora)
  // (usa la función canónica que respeta pagos parciales)
  const cartera = activosArr.reduce((a,c)=>a+getCreditoSaldoPendiente(c),0);
  const cuotasCobradas = _SPAGOS.filter(p=>!p.eliminado&&p.estado==='confirmado'&&!p.esInicial&&p.tipoOperacion!=='inicial_credito').reduce((a,p)=>a+p.monto,0);
  const inicialesCobradas = _SPAGOS.filter(p=>!p.eliminado&&p.estado==='confirmado'&&(p.esInicial||p.tipoOperacion==='inicial_credito')).reduce((a,p)=>a+p.monto,0);
  const ingMes = inicialesCobradas + cuotasCobradas; // Dashboard: ingresos confirmados sin duplicar la inicial
  // ── Cobrado SOLO del mes actual ──
  const _primerDiaMesDash = hoyLocalISO().slice(0,7)+'-01';
  const _pagosMesDash = _SPAGOS.filter(p=>!p.eliminado&&p.estado==='confirmado'&&(p.fecha||'')>=_primerDiaMesDash);
  const cuotasCobradasMes = _pagosMesDash.filter(p=>!p.esInicial&&p.tipoOperacion!=='inicial_credito').reduce((a,p)=>a+p.monto,0);
  const inicialesCobradasMes = _pagosMesDash.filter(p=>p.esInicial||p.tipoOperacion==='inicial_credito').reduce((a,p)=>a+p.monto,0);
  const ingMesReal = cuotasCobradasMes + inicialesCobradasMes;
  const egMes = _SEGR.filter(e=>!e.eliminado).reduce((a,e)=>a+(e.monto||0),0);
  const utilidad = ingMes - egMes;
  // ── Flujo de caja DEL MES (reemplaza la tarjeta "Utilidad") ──
  // La tarjeta vieja restaba TODO lo historico, incluida la plata prestada en motos
  // (que vuelve en cuotas, no es perdida), y ademas decia "sept." siendo historica.
  // Ahora: cuotas cobradas del mes menos lo que salio del mes, sin la inicial del
  // cliente en ninguno de los dos lados (igual que el grafico de Egresos).
  const _idsIniDash = (typeof _egrIdsInicial==='function') ? _egrIdsInicial() : {};
  const _egrMesDash = _SEGR.filter(e=>!e.eliminado && String(e.fecha||'').slice(0,10)>=_primerDiaMesDash && !_idsIniDash[String(e.id)]);
  const prestadoMes = _egrMesDash.filter(e=>e.origenAuto==='compra_moto').reduce((a,e)=>a+(parseFloat(e.monto)||0),0);
  const gastosMes = _egrMesDash.filter(e=>e.origenAuto!=='compra_moto').reduce((a,e)=>a+(parseFloat(e.monto)||0),0);
  const flujoMes = cuotasCobradasMes - prestadoMes - gastosMes;
  // ── Tarjetas de arriba (diseno B aprobado por Adam, 17-sep-2026) ──
  const _mesCortoDash = new Date().toLocaleDateString('es-VE',{month:'short'}).replace('.','');
  const _mesLargoDash = new Date().toLocaleDateString('es-VE',{month:'long'});
  // el monto grande sin los centimos del mismo tamano, para que quepa al lado el numero de creditos
  const _cartTxt = fmt(cartera), _cartComa = _cartTxt.lastIndexOf(',');
  const _cartEnt = _cartComa > 0 ? _cartTxt.slice(0, _cartComa) : _cartTxt;
  const _cartCts = _cartComa > 0 ? _cartTxt.slice(_cartComa) : '';
  // ancho aproximado de los dos numeros grandes (en em): el CSS achica la letra si la tarjeta es angosta
  const _kxEm = t => [...String(t)].reduce((a, c) => a + (c === '.' || c === ',' ? 0.25 : 0.57), 0);
  const _kxk = ((_kxEm(_cartEnt) + 0.7 + _kxEm(activosEnCartera)) * 1.03).toFixed(2);
  const _pesos0 = v => '$' + Math.round(v||0).toLocaleString('es-VE');
  const _pesosSigno = v => ((v||0) < 0 ? '−' : '') + '$' + Math.round(Math.abs(v||0)).toLocaleString('es-VE');
  const _pct1 = (n, t) => t > 0 ? (Math.round(n*1000/t)/10).toLocaleString('es-VE') + '%' : '0%';
  const pctMoraCart = activosEnCartera > 0 ? moraEnCartera*100/activosEnCartera : 0;
  const pctCuotasMes = ingMesReal > 0 ? cuotasCobradasMes*100/ingMesReal : 0;
  const _maxFlujo = Math.max(cuotasCobradasMes, prestadoMes, gastosMes, 1);
  // Mora: como la reparte Cobranza (acuerdos, ilocalizables, criticos +30 dias, regular) y
  // el vencido con el mismo ledger: saldo de las cuotas ya vencidas o, si no hay, lo que
  // falta de la proxima. Solo corre sobre los atrasados, no sobre toda la cartera.
  let moraVencido = 0, moraReg = 0, moraAcu = 0, moraCrit = 0, moraIloc = 0;
  const _hoyKx = hoyLocalISO();
  const _graciaKx = (typeof PLAN!=='undefined' && PLAN.diasGracia!=null) ? PLAN.diasGracia : 5;
  activosArr.forEach(function(c){
    if(!(c.mora > 0)) return;
    if(c.fechaCompromiso) moraAcu++;
    else if(String(c.cobranzaStatus||'')==='ilocalizable') moraIloc++;
    else if((parseInt(c.mora,10)||0) > 30) moraCrit++;
    else moraReg++;
    try{
      if(typeof CreditoLedger==='undefined' || !CreditoLedger.generarEstadoCredito) throw 0;
      const est = CreditoLedger.generarEstadoCredito(c, S.pagos, {diasGracia:_graciaKx});
      let venc = 0, n = 0;
      (est.cuotas||[]).forEach(function(q){ if(q && q.saldo>0.001 && q.fechaVence && q.fechaVence < _hoyKx){ venc += q.saldo; n++; } });
      if(n) moraVencido += venc;
      else { const prox = (est.cuotas||[])[est.cuotasPagadas]; moraVencido += prox ? (prox.saldo||0) : (parseFloat(c.cuotaQ||c.cuota)||0); }
    }catch(e){ moraVencido += parseFloat(c.cuotaQ||c.cuota)||0; }
  });
  const _circKx = 2*Math.PI*26;
  // Tasas: los valores iniciales; bcv-auto.js los refresca por id
  const _tfKx = v => v > 1 ? v.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  const _brKx = (a, b) => (a > 1 && b > 1) ? (((b-a)/a*100) >= 0 ? '+' : '') + ((b-a)/a*100).toFixed(1) + '%' : '—';
  const pendPagos = _SPAGOS.filter(p=>p.estado==='pendiente').length;
  const dispMotos = _SMOTOS.filter(m=>!m.eliminado&&m.estado==='disponible').length;

  // ── Mora buckets ──
  const moraBuckets = {
    '1-15': _SCREDS.filter(c=>c.mora>0&&c.mora<=15).length,
    '16-30': _SCREDS.filter(c=>c.mora>15&&c.mora<=30).length,
    '31-60': _SCREDS.filter(c=>c.mora>30&&c.mora<=60).length,
    '+60': _SCREDS.filter(c=>c.mora>60).length,
  };
  // BUG FIX: sumar la cuota REAL de cada crédito activo (antes multiplicaba count × primer cuota,
  // lo cual era incorrecto si los créditos tenían distintos montos)
  const cuotaEsperada = activosArr.reduce((a,c)=>a+parseFloat(c.cuotaQ||c.cuota||0),0);
  const pctCobro = cuotaEsperada > 0 ? Math.min(100, Math.round(cuotasCobradas / cuotaEsperada * 100)) : 0;

  // ── Promedios de crédito (inicial y cuota) ──
  const credsProm = _SCREDS.filter(c=>!c.eliminado && c.estado!=='cancelado' && c.estado!=='recuperado' && c.estado!=='recuperada');
  const _iniVals = credsProm.map(c=>parseFloat(c.ini)||0).filter(v=>v>0);
  const _cuoVals = credsProm.map(c=>parseFloat(c.cuotaQ||c.cuota||0)||0).filter(v=>v>0);
  const inicialProm = _iniVals.length ? _iniVals.reduce((a,v)=>a+v,0)/_iniVals.length : 0;
  const cuotaProm = _cuoVals.length ? _cuoVals.reduce((a,v)=>a+v,0)/_cuoVals.length : 0;
  const cuotaPromMes = cuotaProm*2;

  // ── Moto inventory ──
  const mDisp = _SMOTOS.filter(m=>!m.eliminado&&m.estado==='disponible').length;
  const mFin = _SMOTOS.filter(m=>!m.eliminado&&m.estado==='financiada').length;
  const mRec = _SMOTOS.filter(m=>!m.eliminado&&m.estado==='recuperada').length;
  const mInv = _SMOTOS.filter(m=>!m.eliminado&&m.estado==='inventario').length;
  const mTotal = Math.max(1, mDisp+mFin+mRec+mInv);

  // ── Créditos por estado (para pie) ──
  const cActivos = alDia;         // al día (vigentes sin mora)
  const cCompletados = completados;
  const cEnMora = moraEnCartera;  // en mora (siguen contando como activos)
  const cCancelados = _SCREDS.filter(c=>!c.eliminado&&c.estado==='cancelado').length;
  const cTotalReal = cActivos+cCompletados+cEnMora+cCancelados;
  const cTotal = Math.max(1, cTotalReal);

  // ── Pie chart SVG helper ──
  function pieSlice(pct, offsetPct, color, r=40, cx=50, cy=50){
    if(pct<=0) return '';
    const circ = 2*Math.PI*r;
    const dash = pct/100*circ;
    const gap = circ - dash;
    const rot = offsetPct/100*360 - 90;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      transform="rotate(${rot} ${cx} ${cy})"
      style="transition:stroke-width .2s"
      onmouseover="this.setAttribute('stroke-width','13')"
      onmouseout="this.setAttribute('stroke-width','10')"/>`;
  }

  // Moto pie
  const motoSlices=[
    [mDisp/mTotal*100, 0, '#06B06A'],
    [mFin/mTotal*100, mDisp/mTotal*100, '#2563EB'],
    [mRec/mTotal*100, (mDisp+mFin)/mTotal*100, '#D93B5A'],
    [mInv/mTotal*100, (mDisp+mFin+mRec)/mTotal*100, '#5B8DEF'],
  ];
  let mOff=0;
  const motoArcs = motoSlices.map(([p,,c])=>{const a=pieSlice(p,mOff,c);mOff+=p;return a;}).join('');

  // Créditos pie
  const credSlices=[
    [cActivos/cTotal*100, 0, '#2563EB'],
    [cEnMora/cTotal*100, cActivos/cTotal*100, '#D93B5A'],
    [cCompletados/cTotal*100, (cActivos+cEnMora)/cTotal*100, '#06B06A'],
  ];
  let cOff=0;
  const credArcs = credSlices.map(([p,,c])=>{const a=pieSlice(p,cOff,c);cOff+=p;return a;}).join('');

  // ── Pagos por método (para pie) ──
  const metodoCounts={};
  _SPAGOS.filter(p=>!p.eliminado&&p.estado==='confirmado').forEach(p=>{
    var m=p.metodo||'Otro';
    metodoCounts[m]=(metodoCounts[m]||0)+1;
  });
  const metodoTotalReal=Object.values(metodoCounts).reduce((a,b)=>a+b,0);
  const metodoTotal=Math.max(1,metodoTotalReal);
  const metodoColors=['#2563EB','#06B06A','#5B8DEF','#D93B5A','#F59E0B'];
  const metodoEntries=Object.entries(metodoCounts).slice(0,5);
  let pagoOff=0;
  const pagoArcs=metodoEntries.map(([,v],i)=>{
    const p=v/metodoTotal*100;
    const a=pieSlice(p,pagoOff,metodoColors[i%metodoColors.length]);
    pagoOff+=p;
    return a;
  }).join('');

  // ── Próximas cuotas ──
  const hoy=(function(){
    var prox=_SCREDS.filter(function(c){
      if(c.estado!=='activo'||!c.fecha) return false;
      var start=parseFechaLocal(c.fecha);
      var cuotaNum=(c.pagado||0)+1;
      var vence=new Date(start.getTime()+(cuotaNum*15*24*60*60*1000));
      var diff=Math.round((vence-new Date())/(24*60*60*1000));
      return diff<=7 && diff>=-2;
    });
    return prox.length ? prox : _SCREDS.filter(c=>c.estado==='activo').slice(0,5);
  })();

  // ── Fila de operación y accesos (diseño B): mismas cuentas de siempre, solo orden y presentación ──
  const _escD = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const _svgD = (d, col) => `<svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  // en mora: los mismos créditos vigentes que la tarjeta de arriba, los más atrasados primero
  const _moraOrd = activosArr.filter(c=>c.mora>0).sort((a,b)=>(b.mora||0)-(a.mora||0));
  // métodos de mayor a menor; si son más de 4, los más chicos van juntos en "Otros"
  const _metOrd = Object.entries(metodoCounts).sort((a,b)=>b[1]-a[1]);
  const _metVer = _metOrd.length > 4 ? _metOrd.slice(0,3).concat([['Otros', _metOrd.slice(3).reduce((a,e)=>a+e[1],0)]]) : _metOrd;
  const _metCol = i => (_metOrd.length > 4 && i === 3) ? '#94A3B8' : ['#2563EB','#06B06A','#F59E0B','#8B5CF6'][i];
  const _metPct = v => metodoTotalReal > 0 ? Math.round(v/metodoTotalReal*100) : 0;
  // próximas cuotas: la más cercana primero (misma fecha estimada que ya usaba esta tarjeta)
  const _diasProx = c => { if(!c.fecha) return 999; var st=parseFechaLocal(c.fecha); var v=new Date(st.getTime()+(((c.pagado||0)+1)*15*24*60*60*1000)); return Math.round((v-new Date())/(24*60*60*1000)); };
  const _proxOrd = hoy.slice().sort((a,b)=>_diasProx(a)-_diasProx(b));
  const _proxMonto = hoy.reduce((a,c)=>a+(parseFloat(c.cuotaQ||c.cuota)||0),0);
  const _proxLbl = d => d < 0 ? (d === -1 ? 'ayer' : 'hace ' + (-d) + 'd') : d === 0 ? 'hoy' : d === 1 ? 'mañana' : 'en ' + d + 'd';
  const _moraMeses = (function(){ try{ return (typeof getMoraMensual==='function') ? (getMoraMensual()||[]) : []; }catch(e){ return []; } })();
  const _moraMax = Math.max(1, ..._moraMeses.map(x=>x.mora||0));

  // ── HTML ──
  // ─── TIPS LOCALES (sin emojis) — rotativos por día del año ───
  var TIPS_DEL_DIA = [
    '"Lo que se mide, se mejora." Revisa tu cartera vencida cada lunes a primera hora.',
    'Una moto se entrega tres veces: en el lote, en el contrato, y en la primera cuota a tiempo.',
    'El mejor cliente es el que paga puntual. Premia a los puntuales con un mensaje de "gracias" antes de pedir la siguiente cuota.',
    'No respondas WhatsApp después de las 8pm; protege tu tiempo personal. Los clientes lo respetan.',
    'El precio de la moto no es el problema. El problema es no haber explicado bien la cuota.',
    'Cobranza al día = libertad financiera. Un día de atraso es un día de tu plata trabajando para otro.',
    '"El cliente no compra una moto, compra movilidad y libertad." Vende eso, no las especificaciones.',
    'Un cliente referido vale 5 veces más que uno por publicidad. Pide referencias cuando paguen la última cuota.',
    'Si no sabes tu costo de oportunidad, todo te parece barato. Calcula cuánto te cuesta cada día de mora.',
    'Llama al cliente el día antes de su cuota, no después. Convierte el cobro en un servicio.',
    'Una factura emitida es un cliente más conectado. Pide su RIF/cédula al emitir y guarda los datos.',
    'Las primeras 3 cuotas predicen las 21 restantes. Si fallan ahí, el patrón se repite.',
    'Sorprende a tus mejores clientes con un casco gratis o una revisión. El boca a boca es tu mejor marketing.',
    'Si un cliente no contesta WhatsApp en 24h, llámalo. Si no contesta llamadas en 48h, ve al lote.',
    'Documenta todo: contratos firmados, fotos de la moto, copias de cédula. La memoria falla, los papeles no.',
    '"La calidad no es un acto, es un hábito." Aristóteles. Revisa cada moto antes de entregarla, sin excepción.',
    'El admin no es para llenarlo de datos, es para tomar decisiones más rápido. Si una pantalla no te ayuda a decidir, sobra.',
    'Un cliente con plan personalizado paga 30% más puntual que uno con plan estándar. Vale la conversación.',
    'Compite contigo, no con la competencia. Si este mes cobraste $20k, la meta del próximo es $22k.',
    'Un fiador firmado vale más que tres promesas verbales. No bajes ese requisito por presión de cerrar.',
    'Si un cliente tarda más de 1 hora en pensar la oferta, no la va a tomar. Ofrece dos opciones y deja que elija.',
    'Nadie nace sabiendo cobrar. Practica el guion de cobranza amable hasta que lo digas natural.',
    'Cada hora que un crédito está en mora cuesta tu margen del día. Cobranza temprana = ganancia real.',
    'El cliente que paga su última cuota merece una llamada de felicitación. Y un descuento si vuelve.',
    'Configura recordatorios automáticos 3 días antes de cada cuota. El olvido es enemigo del cobro.',
    'Mide tu APY real cada mes. Si bajó, algo está fallando: ya sea precio, plazo o cobranza.',
    'El sistema es tan bueno como los datos que le metes. Llena bien el perfil del cliente desde el primer contacto.',
    'No vendas crédito al primero que entra. Vende al que califica. La mora arruina más negocios que la falta de clientes.',
    '"Hay que pensar en grande, pero empezar pequeño." Cobra una cuota completa antes de pensar en 100.',
    'Cada lunes es nueva oportunidad. Empieza con la lista de morosos del viernes, no con emails.',
    'Celebra los logros chiquitos del equipo. 10 cobros perfectos en una semana merecen reconocimiento.'
  ];
  var diaDelAnio = (function(){var d=new Date();var i=new Date(d.getFullYear(),0,0);return Math.floor((d-i)/(1000*60*60*24));})();
  var tipIdx = (typeof window._tipOverride !== 'undefined' && window._tipOverride !== null) ? window._tipOverride : (diaDelAnio % TIPS_DEL_DIA.length);
  var tipHoy = TIPS_DEL_DIA[tipIdx % TIPS_DEL_DIA.length];

  // ─── CUMPLEAÑOS — empleados que cumplen este mes ───
  function _parseCumple(v){
    if(!v) return null;
    // Acepta YYYY-MM-DD, DD/MM/YYYY, DD-MM, etc.
    var s = String(v).replace(/\//g,'-');
    var m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m1) return {mes:parseInt(m1[2],10), dia:parseInt(m1[3],10)};
    var m2 = s.match(/^(\d{1,2})-(\d{1,2})(?:-\d{2,4})?/);
    if(m2) return {mes:parseInt(m2[2],10), dia:parseInt(m2[1],10)};
    return null;
  }
  var hoyM = new Date().getMonth()+1, hoyD = new Date().getDate();
  var _bdaySrc = (typeof _usersCache!=='undefined' && _usersCache && _usersCache.length) ? _usersCache : (S._wtUsers||S.usuarios||[]);
  var cumplesEsteMes = _bdaySrc.filter(function(u){
    if(!u || u.eliminado) return false;
    var c = _parseCumple(u.cumpleanos || u.fechaNacimiento || u.bday);
    return c && c.mes === hoyM;
  }).map(function(u){
    var c = _parseCumple(u.cumpleanos || u.fechaNacimiento || u.bday);
    return {nom:u.nombre||u.email||'Usuario', dia:c.dia, esHoy:c.dia===hoyD};
  }).sort(function(a,b){ return a.dia - b.dia; });
  var cumplesHoy = cumplesEsteMes.filter(function(u){return u.esHoy;});

  // Si el usuario LOGUEADO es cumpleañero hoy, disparar cotillón con SU género
  setTimeout(function(){
    try {
      var u = S.currentUser || {};
      var miCumple = _parseCumple(u.cumpleanos || u.fechaNacimiento);
      if(miCumple && miCumple.mes === hoyM && miCumple.dia === hoyD){
        if(typeof dispararCotillon === 'function' && !window._cotillonShown){
          // Anti-spam por día via localStorage (compatible con centro.js)
          var hoyKey = '_cotillonShown_'+(new Date()).getFullYear()+'-'+hoyM+'-'+hoyD;
          var yaShown = false;
          try { yaShown = !!localStorage.getItem(hoyKey); } catch(e){}
          if(!yaShown){
            window._cotillonShown = true;
            try { localStorage.setItem(hoyKey,'1'); } catch(e){}
            var nombre = u.nombre || u.email || 'Compañero/a';
            var genero = u.genero || '';
            setTimeout(function(){ dispararCotillon(nombre, false, genero); }, 600);
          }
        }
      }
    } catch(e){}
    // Pre-cargar chistes/datos/noticias en segundo plano (silencioso, usa cache si ya hay)
    if(typeof dashDailyLoad === 'function'){
      setTimeout(function(){ dashDailyLoad('chiste', false); }, 300);
      setTimeout(function(){ dashDailyLoad('dato', false); }, 600);
      setTimeout(function(){ dashDailyLoad('noticia', false); }, 900);
    }
  }, 400);

  function _initialsName(n){var p=(n||'').split(/\s+/).filter(Boolean);return ((p[0]||'')[0]||'?').toUpperCase()+((p[1]||'')[0]||'').toUpperCase();}

  return`<div class="page">

  ${pageBanner(
    'Panel principal · '+new Date().toLocaleDateString('es-VE',{weekday:'long',year:'numeric',month:'long',day:'numeric'}),
    'Hola, '+(S.currentUser&&S.currentUser.nombre?S.currentUser.nombre.split(' ')[0]:'')+'!',
    'Resumen general del negocio · cartera activa, cobranza, inventario y rendimiento',
    [
      {label:'Reportes', onclick:"nav('reportes')"},
      {label:'＋ Nueva Solicitud', onclick:'openAddCred()', primary:true}
    ]
  )}

  <!-- Cumpleaños y daily tabs viven ahora en Centro de Trabajo -->


  <style>
    .dash-tasa-card .dash-refresh:hover{transform:rotate(180deg);background:var(--p1);color:#fff!important;border-color:var(--p1)}
    .dash-tasa-card{transition:box-shadow .2s,transform .2s}
    .dash-tasa-card:hover{box-shadow:0 6px 18px rgba(0,0,0,.08)}
  </style>
  <!-- ROW 1: 6 KPI CARDS -->
  <div class="kx-row">

    <!-- CARTERA ACTIVA (protagonista) -->
    <div class="kx-hero" onclick="nav(&quot;creditos&quot;)">
      <div class="kx-top">
        <span class="kx-ico kx-ico-w"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="14" rx="3"/><path d="M16 13h2"/><path d="M5 6V5a2 2 0 0 1 2-2h9"/></svg></span>
        <span class="kx-tit">Cartera activa</span>
      </div>
      <div class="kx-nums" style="--kxk:${_kxk}">
        <div><div class="kx-big" data-kpi="cartera">${_cartEnt}<small>${_cartCts}</small></div><div class="kx-sub">Saldo pendiente de cobro</div></div>
        <div class="kx-ncred"><div class="kx-big" data-kpi="activos">${activosEnCartera}</div><div class="kx-sub">créditos</div></div>
      </div>
      <div class="kx-split"><i style="width:${(100-pctMoraCart).toFixed(2)}%;background:#fff"></i><i style="width:${pctMoraCart.toFixed(2)}%;background:#FF8BA3"></i></div>
      <div class="kx-stats">
        <div><small>Al día</small><b data-kpi="aldia">${alDia}</b><em>${_pct1(alDia, activosEnCartera)}</em></div>
        <div><small>En mora</small><b data-kpi="mora">${moraEnCartera}</b><em>${_pct1(moraEnCartera, activosEnCartera)}</em></div>
        <div><small>Cobrado total</small><b>${_pesos0(ingMes)}</b></div>
      </div>
    </div>

    <!-- COBRADO DEL MES -->
    <div class="kx-card" onclick="nav(&quot;pagos&quot;)">
      <div class="kx-top">
        <span class="kx-ico" style="background:rgba(0,168,112,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg></span>
        <span class="kx-tit">Cobrado</span>
        <span class="kx-chip" style="background:rgba(0,168,112,.12);color:var(--green)">${_mesCortoDash}</span>
      </div>
      <div class="kx-big" style="color:var(--green)" data-kpi="cobrado-mes">${_pesos0(ingMesReal)}</div>
      <div class="kx-sub">en ${_mesLargoDash}</div>
      <div class="kx-pie">
        <div class="kx-split kx-split-s"><i style="width:${pctCuotasMes.toFixed(2)}%;background:var(--green)"></i><i style="width:${(100-pctCuotasMes).toFixed(2)}%;background:#7FD9B8"></i></div>
        <div class="kx-ley"><span><i class="kx-pt" style="background:var(--green)"></i>Cuotas <b>${_pesos0(cuotasCobradasMes)}</b></span><span><i class="kx-pt" style="background:#7FD9B8"></i>Iniciales <b>${_pesos0(inicialesCobradasMes)}</b></span></div>
      </div>
    </div>

    <!-- FLUJO DE CAJA DEL MES -->
    <div class="kx-card" onclick="nav(&quot;conta&quot;)">
      <div class="kx-top">
        <span class="kx-ico" style="background:rgba(229,57,91,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16"/><path d="M3 8l4-4 4 4"/><path d="M17 20V4"/><path d="M21 16l-4 4-4-4"/></svg></span>
        <span class="kx-tit">Flujo de caja</span>
        <span class="kx-chip" style="background:rgba(229,57,91,.12);color:var(--red)">${_mesCortoDash}</span>
      </div>
      <div class="kx-big" style="color:${flujoMes>=0?'var(--green)':'var(--red)'}" data-kpi="flujo">${_pesosSigno(flujoMes)}</div>
      <div class="kx-sub">cobrado menos lo que salió en ${_mesLargoDash}</div>
      <div class="kx-pie kx-cmp">
        <div><div class="kx-r"><span>Cuotas cobradas</span><b style="color:var(--green)" data-kpi="flujo-cuotas">+${_pesos0(cuotasCobradasMes)}</b></div><div class="kx-t"><i style="width:${(cuotasCobradasMes*100/_maxFlujo).toFixed(2)}%;background:var(--green)"></i></div></div>
        <div><div class="kx-r"><span>Prestado en motos</span><b style="color:var(--amber)" data-kpi="flujo-prestado">−${_pesos0(prestadoMes)}</b></div><div class="kx-t"><i style="width:${(prestadoMes*100/_maxFlujo).toFixed(2)}%;background:var(--amber)"></i></div></div>
        ${gastosMes>0 ? `<div><div class="kx-r"><span>Otros gastos</span><b style="color:var(--red)" data-kpi="flujo-gastos">−${_pesos0(gastosMes)}</b></div><div class="kx-t"><i style="width:${(gastosMes*100/_maxFlujo).toFixed(2)}%;background:var(--red)"></i></div></div>` : ''}
      </div>
    </div>

    <!-- EN MORA -->
    <div class="kx-card" onclick="nav(&quot;cobranza&quot;)">
      <div class="kx-top">
        <span class="kx-ico" style="background:rgba(229,57,91,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/></svg></span>
        <span class="kx-tit">En mora</span>
      </div>
      <div class="kx-mora">
        <div class="kx-ring">
          <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(229,57,91,.14)" stroke-width="7"/><circle cx="32" cy="32" r="26" fill="none" stroke="var(--red)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(_circKx*pctMoraCart/100).toFixed(2)} ${_circKx.toFixed(2)}"/></svg>
          <div class="kx-rv"><b>${_pct1(moraEnCartera, activosEnCartera)}</b><small>cartera</small></div>
        </div>
        <div><div class="kx-big" style="margin:0;color:var(--red)">${moraEnCartera}</div><div class="kx-sub">créditos atrasados</div><div class="kx-sub kx-venc" data-kpi="mora-vencido">${_pesos0(moraVencido)} vencido</div></div>
      </div>
      <div class="kx-pie kx-chips">
        <span class="kx-c">Regular <b>${moraReg}</b></span><span class="kx-c">Acuerdos <b>${moraAcu}</b></span><span class="kx-c kx-c-r">Críticos <b>${moraCrit}</b></span>${moraIloc ? `<span class="kx-c">Ilocalizables <b>${moraIloc}</b></span>` : ''}
      </div>
    </div>

    <!-- TASA DEL DIA (bcv-auto.js actualiza los numeros por id) -->
    <div class="kx-card" id="dash-tasa-card">
      <div class="kx-top">
        <span class="kx-ico" style="background:rgba(232,148,10,.13)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h13"/><path d="M14 4l3 3-3 3"/><path d="M20 17H7"/><path d="M10 14l-3 3 3 3"/></svg></span>
        <span class="kx-tit">Tasa del día</span>
        <button class="kx-refresh" onclick="event.stopPropagation();bcvForzarActualizacion&&bcvForzarActualizacion()" title="Actualizar tasas">↻</button>
      </div>
      <div class="kx-tasas">
        <div class="kx-tasa"><span class="kx-l" style="background:#1E3A8A">Bs</span>BCV dólar<b id="dash-tasa-bcv">${_tfKx(window._tasaBsGlobal||0)}</b></div>
        <div class="kx-tasa"><span class="kx-l" style="background:#1D4ED8">€</span>BCV euro<b id="dash-tasa-eur">${_tfKx(window._tasaEuro||0)}</b></div>
        <div class="kx-tasa"><span class="kx-l" style="background:#111;color:#F0B90B">◆</span>Binance<b id="dash-tasa-binance">${_tfKx(window._tasaBinance||0)}</b></div>
      </div>
      <div class="kx-pie kx-brecha"><span>Brecha paralelo</span><span><b id="dash-tasa-spread">${_brKx(window._tasaBsGlobal||0, window._tasaBinance||0)}</b> vs $ · <b id="dash-tasa-spread-eur">${_brKx(window._tasaEuro||0, window._tasaBinance||0)}</b> vs €</span></div>
    </div>

  </div>

  <!-- ROW 2: Analytics charts -->
  <div class="dash-charts" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px">

    <!-- CRÉDITOS CHART — primero -->
    <div class="card">
      <div class="dash-head"><div class="dash-ch">
        <div class="ct" style="color:var(--green)">Créditos</div>
        <div class="dash-seg">
          <button id="dash-cred-d" class="on" onclick="setDashPeriodo('creditos','diario')">Día</button>
          <button id="dash-cred-q" onclick="setDashPeriodo('creditos','quincenal')">Quinc.</button>
          <button id="dash-cred-m" onclick="setDashPeriodo('creditos','mensual')">Mes</button>
        </div>
      </div>
      <div class="dash-big" id="dash-cred-big" style="color:var(--green)">—</div>
      <div class="cs dash-cs"><span id="dash-cred-sub">Últimos 30 días</span><span id="dash-cred-avg"></span></div></div>
      <div style="position:relative;height:160px;min-height:160px">
        <canvas id="dash-cred-chart" style="width:100%;height:100%"></canvas>
      </div>
    </div>

    <!-- CUOTAS COBRADAS CHART — segundo -->
    <div class="card">
      <div class="dash-head"><div class="dash-ch">
        <div class="ct" style="color:#0E9488">Cuotas cobradas</div>
        <div class="dash-seg">
          <button id="dash-cuo-d" class="on" onclick="setDashPeriodo('cuotas','diario')">Día</button>
          <button id="dash-cuo-q" onclick="setDashPeriodo('cuotas','quincenal')">Quinc.</button>
          <button id="dash-cuo-m" onclick="setDashPeriodo('cuotas','mensual')">Mes</button>
        </div>
      </div>
      <div class="dash-big" id="dash-cuo-big" style="color:#0E9488">—</div>
      <div class="cs dash-cs"><span id="dash-cuo-sub">Últimos 30 días</span><span id="dash-cuo-avg"></span></div></div>
      <div style="position:relative;height:160px;min-height:160px">
        <canvas id="dash-cuo-chart" style="width:100%;height:100%"></canvas>
      </div>
    </div>

    <!-- INGRESOS CHART — tercero -->
    <div class="card">
      <div class="dash-head"><div class="dash-ch">
        <div class="ct" style="color:var(--p1)">Ingresos</div>
        <div class="dash-seg">
          <button id="dash-ing-d" class="on" onclick="setDashPeriodo('ingresos','diario')">Día</button>
          <button id="dash-ing-q" onclick="setDashPeriodo('ingresos','quincenal')">Quinc.</button>
          <button id="dash-ing-m" onclick="setDashPeriodo('ingresos','mensual')">Mes</button>
        </div>
      </div>
      <div class="dash-big" id="dash-ing-big" style="color:var(--p1)">—</div>
      <div class="cs dash-cs"><span id="dash-ing-sub">Últimos 30 días</span><span id="dash-ing-avg"></span></div></div>
      <div style="position:relative;height:160px;min-height:160px">
        <canvas id="dash-chart" style="width:100%;height:100%"></canvas>
      </div>
    </div>

    <!-- EGRESOS CHART — cuarto -->
    <div class="card">
      <div class="dash-head"><div class="dash-ch">
        <div class="ct" style="color:var(--red)">Egresos</div>
        <div class="dash-seg">
          <button id="dash-egr-d" class="on" onclick="setDashPeriodo('egresos','diario')">Día</button>
          <button id="dash-egr-q" onclick="setDashPeriodo('egresos','quincenal')">Quinc.</button>
          <button id="dash-egr-m" onclick="setDashPeriodo('egresos','mensual')">Mes</button>
        </div>
      </div>
      <div class="dash-big" id="dash-egr-big" style="color:var(--red)">—</div>
      <div class="cs dash-cs"><span id="dash-egr-sub">Últimos 30 días</span><span id="dash-egr-avg"></span></div></div>
      <div style="position:relative;height:160px;min-height:160px">
        <canvas id="dash-egr-chart" style="width:100%;height:100%"></canvas>
      </div>
    </div>

  </div>

    <!-- ROW 2b: 5 tarjetas de operación (diseño B) -->
  <div class="dash-ops kx-ops" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;margin-bottom:18px">

    <!-- 1 · Mora por mes -->
    <div class="kx-card" onclick="nav(&quot;cobranza&quot;)">
      <div class="kx-top">
        <span class="kx-ico" style="background:rgba(229,57,91,.12)">${_svgD('<path d="M3 3v18h18"/><path d="M8 16v-4"/><path d="M13 16V8"/><path d="M18 16v-7"/>','var(--red)')}</span>
        <span class="kx-tit">Mora por mes</span>
        <span class="kx-chip" style="background:rgba(229,57,91,.12);color:var(--red)">6 meses</span>
      </div>
      <div class="kx-big" style="color:${moraEnCartera>0?'var(--red)':'var(--green)'}">${moraEnCartera>0?moraEnCartera:'✓'}</div>
      <div class="kx-sub">${moraEnCartera>0?'créditos con atraso hoy':'sin atrasos'}</div>
      ${_moraMeses.length?`<div class="kx-pie"><div class="kx-mes">${_moraMeses.map((x,i)=>`<div><em>${x.mora||0}</em><i style="height:${Math.max(3,Math.round((x.mora||0)/_moraMax*38))}px${i===_moraMeses.length-1?'':';opacity:.4'}"></i><small>${_escD(String(x.label).replace('.',''))}</small></div>`).join('')}</div></div>`:''}
    </div>

    <!-- 2 · Promedios de crédito (inicial y cuota) -->
    <div class="kx-card" onclick="nav(&quot;creditos&quot;)">
      <div class="kx-top">
        <span class="kx-ico" style="background:rgba(37,99,235,.12)">${_svgD('<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>','var(--p1)')}</span>
        <span class="kx-tit">Promedios</span>
        <span class="kx-chip" style="background:rgba(37,99,235,.12);color:var(--p1)">${credsProm.length} créd.</span>
      </div>
      <div class="kx-big" style="color:var(--p1)">${fmt(inicialProm)}</div>
      <div class="kx-sub">inicial promedio</div>
      <div class="kx-pie kx-prom">
        <div class="kx-r"><span>Cuota quincenal</span><b style="color:var(--green)">${fmt(cuotaProm)}</b></div>
        <div class="kx-r"><span>Equivalente mensual</span><b>${fmt(cuotaPromMes)}</b></div>
      </div>
    </div>

    <!-- 3 · Pagos por método -->
    <div class="kx-card" onclick="nav(&quot;pagos&quot;)">
      <div class="kx-top">
        <span class="kx-ico" style="background:rgba(37,99,235,.12)">${_svgD('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 15h4"/>','var(--p1)')}</span>
        <span class="kx-tit">Pagos por método</span>
        <span class="kx-chip" style="background:rgba(37,99,235,.12);color:var(--p1)">${_metOrd.length} métodos</span>
      </div>
      <div class="kx-big">${metodoTotalReal.toLocaleString('es-VE')}</div>
      <div class="kx-sub">pagos confirmados</div>
      <div class="kx-pie">
        ${metodoTotalReal>0?`<div class="kx-split kx-split-s">${_metVer.map((e,i)=>`<i style="width:${(e[1]/metodoTotalReal*100).toFixed(2)}%;background:${_metCol(i)}"></i>`).join('')}</div>
        <div class="kx-list kx-list-m">${_metVer.map((e,i)=>`<div class="kx-li"><i class="kx-pt" style="background:${_metCol(i)}"></i><span class="kx-nm">${_escD(e[0])}</span><b>${_metPct(e[1])}%</b></div>`).join('')}</div>`:'<div class="kx-vacio">Sin pagos confirmados</div>'}
      </div>
    </div>

    <!-- 4 · Alerta de cobranza -->
    <div class="kx-card" onclick="nav(&quot;cobranza&quot;)">
      <div class="kx-top">
        <span class="kx-ico" style="background:${moraEnCartera>0?'rgba(229,57,91,.12)':'rgba(0,168,112,.12)'}">${_svgD('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', moraEnCartera>0?'var(--red)':'var(--green)')}</span>
        <span class="kx-tit">Alerta de cobranza</span>
      </div>
      <div class="kx-big" style="color:${moraEnCartera>0?'var(--red)':'var(--green)'}">${moraEnCartera>0?moraEnCartera:'✓'}</div>
      <div class="kx-sub">${moraEnCartera>0?'requieren gestión · los más atrasados':'todos al día'}</div>
      <div class="kx-pie kx-list">
        ${_moraOrd.length?_moraOrd.slice(0,3).map(c=>`<div class="kx-li"><span class="kx-bd kx-bd-r">${c.mora}d</span><span class="kx-nm">${_escD(c.cli)}</span><b style="color:var(--red)">${fmt(c.cuotaQ||c.cuota)}</b></div>`).join(''):'<div class="kx-vacio">Sin clientes en mora</div>'}
      </div>
    </div>

    <!-- 5 · Próximas cuotas -->
    <div class="kx-card" onclick="nav(&quot;pagos&quot;)">
      <div class="kx-top">
        <span class="kx-ico" style="background:rgba(245,166,35,.15)">${_svgD('<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M16 2.5v4"/><path d="M8 2.5v4"/><path d="M3 10h18"/>','#E08E00')}</span>
        <span class="kx-tit">Próximas cuotas</span>
        <span class="kx-chip" style="background:rgba(245,166,35,.15);color:#B86E00">7 días</span>
      </div>
      <div class="kx-big">${hoy.length}</div>
      <div class="kx-sub">${_pesos0(_proxMonto)} por cobrar</div>
      <div class="kx-pie kx-list">
        ${_proxOrd.length?_proxOrd.slice(0,3).map(c=>{const d=_diasProx(c);return `<div class="kx-li"><span class="kx-bd ${d<0?'kx-bd-r':d<=1?'kx-bd-a':'kx-bd-g'}">${_proxLbl(d)}</span><span class="kx-nm">${_escD(c.cli)}</span><b>${fmt(c.cuotaQ||c.cuota)}</b></div>`;}).join(''):'<div class="kx-vacio">Sin cuotas próximas</div>'}
      </div>
    </div>

  </div>

  <!-- COBROS PROGRAMADOS (full width) — proyección de caja entrante -->
  <div class="card" style="margin-bottom:18px">
    <div class="dash-ch">
      <div class="ct" style="color:var(--p1)">Cobros programados</div>
      <div class="dash-seg">
        <button id="dash-cobrosp-d" class="on" onclick="setDashCobrospPeriodo('diario')">Día</button>
        <button id="dash-cobrosp-q" onclick="setDashCobrospPeriodo('quincenal')">Quinc.</button>
        <button id="dash-cobrosp-m" onclick="setDashCobrospPeriodo('mensual')">Mes</button>
      </div>
    </div>
    <div class="dash-big" id="dash-cobrosp-big" style="color:var(--p1)">—</div>
    <div class="cs dash-cs"><span id="dash-cobrosp-sub">Próximos 30 días</span><span id="dash-cobrosp-avg"></span></div>
    <div style="position:relative;height:200px;min-height:200px">
      <canvas id="dash-cobrosp-chart" style="width:100%;height:100%"></canvas>
    </div>
  </div>

<!-- ROW 5: accesos rápidos (diseño B) -->
  <div class="kx-quick">
    ${[
      ['Clientes',_concFiltrarClientes(S.clientes||[]).length,'registrados',"nav('clientes')",'var(--p1)','rgba(37,99,235,.12)','<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'],
      ['Motos disponibles',dispMotos,'de '+_SMOTOS.filter(m=>!m.eliminado).length.toLocaleString('es-VE')+' motos',"nav('motos');setTimeout(()=>setMTab('disponible'),100)",'var(--green)','rgba(0,168,112,.12)','<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5h6l3.5-7h3"/><path d="M15 9.5l3.5 7"/><path d="M8 9.5h4"/>'],
      ['Créditos activos',activosEnCartera,'en cartera',"nav('creditos')",'#0E9488','rgba(14,148,136,.12)','<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><path d="M8.5 13h7"/><path d="M8.5 17h4.5"/>'],
      ['Catálogo',CATALOGO.length,'modelos',"nav('plan')",'#8B5CF6','rgba(139,92,246,.12)','<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>'],
    ].map(([tit,val,sub,action,col,bg,ico])=>`
    <div class="kx-q" onclick="${action}">
      <span class="kx-ico kx-ico-l" style="background:${bg}">${_svgD(ico,col)}</span>
      <div class="kx-qt"><small>${tit}</small><div><b>${Number(val||0).toLocaleString('es-VE')}</b><span>${sub}</span></div></div>
      <svg class="kx-qa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
    </div>`).join('')}
  </div>
</div>`;
};

