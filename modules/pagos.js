// Pagasi module: pagos

// Tipo de pago: inicial de credito, liquidacion anticipada o cuota normal.
// Solo LEE campos que el sistema ya guarda al registrar cada pago.
function _tipoPago(p){
  if(p.esInicial || p.tipoOperacion==='inicial_credito' || String(p.concepto||'').indexOf('Inicial · ')===0) return 'inicial';
  if(p.tipo==='liquidacion' || p.referencia==='LIQ-ANT') return 'liquidacion';
  return 'cuota';
}
function _tipoPagoBdg(t){
  if(t==='inicial') return '<span style="background:rgba(124,58,237,.12);color:#7C3AED;border:1px solid rgba(124,58,237,.3);font-size:9.5px;padding:2px 8px;border-radius:20px;font-weight:800;white-space:nowrap">💠 Inicial</span>';
  if(t==='liquidacion') return '<span style="background:rgba(232,152,10,.14);color:#B77400;border:1px solid rgba(232,152,10,.35);font-size:9.5px;padding:2px 8px;border-radius:20px;font-weight:800;white-space:nowrap">⚡ Liquidación</span>';
  return '<span style="background:rgba(37,99,235,.08);color:var(--p1);border:1px solid rgba(37,99,235,.2);font-size:9.5px;padding:2px 8px;border-radius:20px;font-weight:800">Cuota</span>';
}
function setPagosTipoF(t){ S.pagosTipoF=t; pgSet('pagos',1); nav('pagos'); }

// Hora en que se registro el pago (Adam, 18-sep-2026). No hay campo aparte: sale del
// numero del pago, que es el momento exacto de registro (PAG-1789736201484,
// PAG-<ms>-<azar>, P-LIQ-<ms>). Pagos viejos con otro numero no muestran hora.
function _pagoRegistro(p){
  var m = String((p&&p.id)||'').match(/(\d{13})/); if(!m) return null;
  var d = new Date(+m[1]), y = d.getFullYear();
  return (isNaN(y) || y<2024 || y>2035) ? null : d;
}
// "8:56 a. m."; si se registro otro dia distinto a la fecha del pago, lo dice: "reg. 20/9 · 8:56 a. m."
function _pagoHoraTxt(p){
  var d = _pagoRegistro(p); if(!d) return '';
  var h = d.toLocaleTimeString('es-VE',{hour:'numeric',minute:'2-digit'});
  var dia = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return dia === String(p.fecha||'').slice(0,10) ? h : 'reg. '+d.getDate()+'/'+(d.getMonth()+1)+' · '+h;
}

PG.pagos = function(){
  const allPagos = _concFiltrar(S.pagos||[]).filter(p=>!p.eliminado);
  const confs = allPagos.filter(p=>p.estado==='confirmado');
  const pends = allPagos.filter(p=>p.estado==='pendiente');
  const totalConf= confs.reduce((a,p)=>a+p.monto,0);
  const totalPend= pends.reduce((a,p)=>a+p.monto,0);

  // Mes actual
  const hoy = new Date();
  const mesKey = hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0');
  const pagosMes = confs.filter(p=>p.fecha && p.fecha.startsWith(mesKey));
  const totalMes = pagosMes.reduce((a,p)=>a+p.monto,0);
  const promMes = pagosMes.length ? totalMes/pagosMes.length : 0;

  // Por método/cuenta
  const porMetodo = {};
  confs.forEach(function(p){
    var k = p.metodo||'Sin especificar';
    if(!porMetodo[k]) porMetodo[k]={nombre:k,total:0,count:0};
    porMetodo[k].total += p.monto;
    porMetodo[k].count++;
  });
  const metodosList = Object.values(porMetodo).sort((a,b)=>b.total-a.total);
  const topMetodo = metodosList[0]||{nombre:'—',total:0};


  // Filtro por tab
  const tab = S.pagosTab||'todos';
  const pagosEliminados = S.pagos.filter(p=>p.eliminado);
  let filtered = allPagos;
  if(tab==='confirmados') filtered = confs;
  if(tab==='pendientes') filtered = pends;
  if(tab==='archivados') filtered = pagosEliminados;

  // ─── Sort pagos ───
  var _ps = S.pagosSort||{col:'fecha',dir:'desc'};
  filtered = filtered.slice().sort(function(a,b){
    var col=_ps.col, dir=_ps.dir==='asc'?1:-1;
    if(col==='fecha'){
      // mismo dia: por la hora de registro, en el mismo sentido
      var rf=(a.fecha||'').localeCompare(b.fecha||'');
      if(rf===0){ var ta=_pagoRegistro(a), tb=_pagoRegistro(b); rf=(ta?ta.getTime():0)-(tb?tb.getTime():0); }
      return dir*rf;
    }
    if(col==='monto'){return dir*(parseFloat(a.monto||0)-parseFloat(b.monto||0));}
    if(col==='cli'){return dir*((a.cli||'').toLowerCase().localeCompare((b.cli||'').toLowerCase()));}
    if(col==='cred'){return dir*((a.cred||'').localeCompare(b.cred||''));}
    if(col==='metodo'){return dir*((a.metodo||'').localeCompare(b.metodo||''));}
    if(col==='cobrador'){return dir*((a.cobrador||'').localeCompare(b.cobrador||''));}
    if(col==='estado'){return dir*((a.estado||'').localeCompare(b.estado||''));}
    if(col==='id'){return dir*((a.id||'').localeCompare(b.id||''));}
    if(col==='tipo'){return dir*(_tipoPago(a).localeCompare(_tipoPago(b)));}
    return 0;
  });

  // ─── Filtro por rango de fechas ───
  var _pDesde = S.pagosDesde||'';
  var _pHasta = S.pagosHasta||'';
  if(_pDesde) filtered = filtered.filter(function(p){ return (p.fecha||'') >= _pDesde; });
  if(_pHasta) filtered = filtered.filter(function(p){ return (p.fecha||'') <= _pHasta; });
  // ─── Buscador: cliente, crédito, cobrador, ID, método, N° referencia o monto ───
  var _pQ = String(S.pagosQ||'').toLowerCase().trim();
  if(_pQ) filtered = filtered.filter(function(p){
    return String(p.cli||'').toLowerCase().indexOf(_pQ)>-1
        || String(p.cred||'').toLowerCase().indexOf(_pQ)>-1
        || String(p.cobrador||'').toLowerCase().indexOf(_pQ)>-1
        || String(p.id||'').toLowerCase().indexOf(_pQ)>-1
        || String(p.metodo||p.cuenta||'').toLowerCase().indexOf(_pQ)>-1
        || String(p.referencia||'').toLowerCase().indexOf(_pQ)>-1
        || String(p.monto||'').indexOf(_pQ)>-1;
  });
  // ─── Filtro por tipo de pago: cuota / inicial / liquidación ───
  var _ptCuota=0,_ptIni=0,_ptLiq=0;
  filtered.forEach(function(p){ var t=_tipoPago(p); if(t==='inicial')_ptIni++; else if(t==='liquidacion')_ptLiq++; else _ptCuota++; });
  var _pTf = S.pagosTipoF||'todos';
  if(_pTf!=='todos') filtered = filtered.filter(function(p){ return _tipoPago(p)===_pTf; });

  // Cuotas próximas (mismo criterio que dashboard) — créditos activos con cuota próxima o vencida
  var _cuDesde = S.cuotasDesde||'';
  var _cuHasta = S.cuotasHasta||'';
  // Fuente canónica: el ledger de amortización (mismo que el Dashboard). Antes esto
  // (a) EXCLUÍA a los créditos con estado 'mora' y (b) calculaba el vencimiento a mano
  // con c.pagado, por lo que la lista mostraba muchos menos atrasados que el Dashboard.
  var _gracia=(typeof PLAN!=='undefined'&&PLAN.diasGracia!=null)?PLAN.diasGracia:5;
  var _hoyISO=fechaLocalISO(new Date());
  var proximasCuotas = _concFiltrar(S.creds||[]).filter(function(c){
    return c && !c.eliminado && (c.estado==='activo'||c.estado==='mora') && c.fecha;
  }).map(function(c){
    var mora=0, cuotaNum, venceStr, diff, prox=null, vencidoTotal=0, nVencidas=0, gam=null;
    var cuotaMonto=parseFloat(c.cuotaQ||c.cuota)||0;
    if(typeof CreditoLedger!=='undefined' && CreditoLedger.generarEstadoCredito){
      try{
        var est=CreditoLedger.generarEstadoCredito(c, S.pagos, {diasGracia:_gracia});
        mora=est.moraDias||0;
        prox=(est.cuotas&&est.cuotas[est.cuotasPagadas])||null;
        // Nivel del cliente: al cobrador le sirve saber a quién está llamando
        if(typeof Gamificacion!=='undefined' && Gamificacion.calcularRacha){
          try{
            var _pgc = (S.pagos||[]).filter(function(p){ return String(p.cred)===String(c.id); });
            gam = Gamificacion.calcularRacha(est, _pgc, _gracia, _hoyISO);
          }catch(e2){ gam=null; }
        }
        // Deuda realmente vencida = suma del saldo de TODAS las cuotas cuya fecha
        // de vencimiento YA PASO — estrictamente antes de hoy: la cuota que vence
        // hoy NO es mora (mora = al menos 1 dia de atraso). Descuenta pagos parciales.
        (est.cuotas||[]).forEach(function(q){
          if(q && q.saldo>0.001 && q.fechaVence && q.fechaVence < _hoyISO){
            vencidoTotal += q.saldo; nVencidas++;
          }
        });
      }catch(e){ prox=null; }
    }
    vencidoTotal=Math.round(vencidoTotal*100)/100;
    if(prox && prox.fechaVence){
      cuotaNum=prox.numero;
      venceStr=prox.fechaVence;
      var v=parseFechaLocal(venceStr);
      diff=Math.round((v-new Date())/(24*60*60*1000));
    } else {
      var start=parseFechaLocal(c.fecha);
      cuotaNum=(c.pagado||0)+1;
      var vf=new Date(start.getTime()+(cuotaNum*15*24*60*60*1000));
      diff=Math.round((vf-new Date())/(24*60*60*1000));
      venceStr=fechaLocalISO(vf);
      if(!mora) mora=parseInt(c.mora||0,10)||0;
    }
    // Lo que le falta a la proxima cuota: si el cliente ya abono algo, es MENOS que
    // la cuota entera. Antes la lista le pedia los $94 completos a quien ya habia
    // abonado $40 y su cuota todavia no vencia (Adam, 15-sep-2026).
    var proxSaldo = (prox && Number(prox.saldo) > 0.001) ? Math.round(Number(prox.saldo)*100)/100 : cuotaMonto;
    return { cred:c, cuotaNum:cuotaNum, diff:diff, venceStr:venceStr, mora:mora, vencido:vencidoTotal, nVencidas:nVencidas, cuotaMonto:cuotaMonto, proxSaldo:proxSaldo, gam:gam };
  }).filter(function(it){ return it.diff<=30 || it.mora>0; });
  // "Atrasado" = al menos 1 dia de atraso bajo CUALQUIERA de las definiciones del
  // sistema: proxima cuota ya vencida (diff<0, ledger vivo), saldo vencido real
  // (nVencidas>=1, cuotas estrictamente antes de hoy) o el campo guardado c.mora>0
  // (formula simple, la misma que cuenta el Dashboard). Lo que vence HOY no es mora.
  var _esAtrasado = function(it){ return it.diff<0 || it.nVencidas>=1 || (parseInt(it.cred.mora,10)||0)>0; };
  // Dias de atraso reales del credito (para Criticos y Mora Total)
  var _diasMora = function(it){
    var m=parseInt(it.cred.mora,10)||0;
    var d=it.diff<0?-it.diff:0;
    return Math.max(m, d, it.mora||0);
  };
  var _allCob = proximasCuotas.slice();   // todos, incluyendo los que tienen acuerdo mensual
  // ── Acuerdos de pago mensual: su propia pestana, no se mezclan con la mora ──
  var _acuList = proximasCuotas.filter(function(it){ return !!it.cred.fechaCompromiso; });
  proximasCuotas = proximasCuotas.filter(function(it){ return !it.cred.fechaCompromiso; });
  // ── Ilocalizables: nota de cobranza 'Ilocalizable' → su propia pestana ──
  var _esIloc = function(it){ return String(it.cred.cobranzaStatus||'')==='ilocalizable'; };
  var _ilocAll = proximasCuotas.filter(_esIloc);
  proximasCuotas = proximasCuotas.filter(function(it){ return !_esIloc(it); });
  // ── Criticos (+30 dias de mora): tampoco van en Mora Regular — cada credito
  // se gestiona en UNA sola pestana ──
  proximasCuotas = proximasCuotas.filter(function(it){ return _diasMora(it)<=30; });
  // Filtro por fecha de vencimiento
  if(_cuDesde) proximasCuotas = proximasCuotas.filter(function(it){ return it.venceStr >= _cuDesde; });
  if(_cuHasta) proximasCuotas = proximasCuotas.filter(function(it){ return it.venceStr <= _cuHasta; });
  // Buscador: cliente, crédito o modelo (aplica al quincenal y a Criticos/Mora Total)
  var _cuQ = String(S.cuotasQ||'').toLowerCase().trim();
  var _cuMatchQ = function(it){
    if(!_cuQ) return true;
    var c = it.cred;
    return String(c.cli||'').toLowerCase().indexOf(_cuQ)>-1
        || String(c.id||'').toLowerCase().indexOf(_cuQ)>-1
        || String(c.modelo||'').toLowerCase().indexOf(_cuQ)>-1;
  };
  if(_cuQ) proximasCuotas = proximasCuotas.filter(_cuMatchQ);
  // ── Pestanas Criticos (+30 dias de mora) y Mora Total ──
  // Salen de la lista completa (incluye los que tienen acuerdo mensual) y NO les
  // afectan los filtros de fecha ni el filtro rapido; el buscador si aplica.
  var _morTotalList = _allCob.filter(_esAtrasado).filter(_cuMatchQ);
  // Criticos: sin los de acuerdo mensual ni los ilocalizables — esos se
  // gestionan en su propia pestana; en Mora Total si aparecen (foto completa).
  var _critList = _morTotalList.filter(function(it){ return _diasMora(it)>30 && !it.cred.fechaCompromiso && !_esIloc(it); });
  var _ilocList = _ilocAll.filter(_cuMatchQ);
  var _morTotMonto = _morTotalList.reduce(function(sm,it){ return sm + (it.nVencidas>=1?it.vencido:it.proxSaldo); },0);
  var _critMonto = _critList.reduce(function(sm,it){ return sm + (it.nVencidas>=1?it.vencido:it.proxSaldo); },0);
  var _ilocMonto = _ilocList.reduce(function(sm,it){ return sm + (it.nVencidas>=1?it.vencido:it.proxSaldo); },0);
  // Filtro rápido Todos / Atrasados / Al día — con contadores del contexto actual
  var _cuBase = proximasCuotas.slice();   // snapshot ANTES del filtro rapido
  var _cuAtras = _cuBase.filter(_esAtrasado).length;
  var _cuAlDia = _cuBase.length - _cuAtras;
  // (Los gráficos de "Cobros" y "Próximas cuotas a cobrar" se movieron al módulo
  //  Finanzas para que los empleados/cobradores no vean los montos agregados.)
  var _cuF = S.cuotasFilter||'todos';
  if(_cuF==='atrasados') proximasCuotas = proximasCuotas.filter(_esAtrasado);
  else if(_cuF==='aldia') proximasCuotas = proximasCuotas.filter(function(it){ return !_esAtrasado(it); });
  // ── Pestana activa de cobranza: sustituye la lista antes del ordenamiento ──
  var _cobTab = ['acuerdos','criticos','iloc','total'].indexOf(S.cobTab)>-1 ? S.cobTab : 'quincenal';
  // Datos frescos para el exportador a Excel (cobExportAbrir los usa)
  window._cobXls = { quincenal:proximasCuotas.slice(), acuerdos:_acuList.slice(), criticos:_critList.slice(), iloc:_ilocList.slice(), total:_morTotalList.slice(), tab:_cobTab };
  if(_cobTab==='criticos') proximasCuotas = _critList.slice();
  else if(_cobTab==='iloc') proximasCuotas = _ilocList.slice();
  else if(_cobTab==='total') proximasCuotas = _morTotalList.slice();
  // Ordenamiento configurable (por defecto: más urgentes/atrasados primero)
  var _cu = S.cuotasSort||{col:'vence',dir:'asc'};
  proximasCuotas = proximasCuotas.slice().sort(function(a,b){
    var col=_cu.col, dir=_cu.dir==='asc'?1:-1;
    if(col==='cli'){return dir*((a.cred.cli||'').toLowerCase().localeCompare((b.cred.cli||'').toLowerCase()));}
    if(col==='id'){var na=parseInt(String(a.cred.id).replace(/\D/g,''),10)||0,nb=parseInt(String(b.cred.id).replace(/\D/g,''),10)||0;return dir*(na<nb?-1:na>nb?1:0);}
    if(col==='cuota'){return dir*((a.cuotaNum||0)-(b.cuotaNum||0));}
    if(col==='estado'){return dir*((a.diff||0)-(b.diff||0));}
    if(col==='monto'){var _ma=a.nVencidas>=1?a.vencido:a.proxSaldo,_mb=b.nVencidas>=1?b.vencido:b.proxSaldo;return dir*(_ma-_mb);}
    return dir*((a.diff||0)-(b.diff||0)); // 'vence'
  });

  // ── Pestanas de cobranza: Quincenal / Acuerdos / Criticos / Mora Total ──
  _acuList = _acuList.slice().sort(function(a,b){ return String(a.cred.fechaCompromiso).localeCompare(String(b.cred.fechaCompromiso)); });
  var _acuRotos = _acuList.filter(function(it){ return it.cred.fechaCompromiso < _hoyISO; }).length;
  var _acuMonto = _acuList.reduce(function(sm,it){ return sm + (it.nVencidas>=1?it.vencido:it.proxSaldo); },0);
  var _morCasos = _cuBase.filter(_esAtrasado).length;
  var _morMonto = _cuBase.reduce(function(sm,it){ return sm + (_esAtrasado(it)?(it.nVencidas>=1?it.vencido:it.proxSaldo):0); },0);
  var _moraDash = _concFiltrar(S.creds||[]).filter(function(c){ return c && !c.eliminado && (parseInt(c.mora,10)||0)>0; }).length;
  // ── Porcentajes de las pestanas (Adam, 17-sep-2026: "ponme porcentajes tambien") ──
  // Dos denominadores distintos, cada uno donde tiene sentido:
  //   · % de la CARTERA  = sobre los creditos vigentes (activo + mora), la misma
  //     regla del dashboard. Es la tasa de mora de verdad, la que se reporta.
  //   · % de la MORA     = que parte de los atrasados cae en esa pestana.
  var _carteraN = _concFiltrar(S.creds||[]).filter(function(c){
    return c && !c.eliminado && (c.estado==='activo'||c.estado==='mora');
  }).length;
  var _pctTxt = function(n, tot, dec){
    if(!tot || !n) return '';
    var v = n*100/tot;
    return (dec ? v.toFixed(1).replace('.',',') : String(Math.round(v))) + '%';
  };
  // Con el denominador a la vista: "(4% de los 52 atrasados)" se entiende solo; "(4% de la
  // mora)" no (Adam, 17-sep-2026: "si hay 2 clientes en mora como representa el 4%?").
  var _pctCartera = function(n){ var t=_pctTxt(n,_carteraN,true); return t ? ' <span style="opacity:.85">('+t+' de '+_carteraN+' cr\u00e9ditos)</span>' : ''; };
  var _pctMora    = function(n){ var t=_pctTxt(n,_moraDash,false);  return t ? ' <span style="opacity:.85">('+t+' de los '+_moraDash+' atrasados)</span>' : ''; };
  var _acuAtras = _acuList.filter(_esAtrasado).length;
  var _ilocAtras = _ilocList.filter(_esAtrasado).length;
  var _moraOtros = Math.max(0, _moraDash - _cuAtras - _acuAtras - _critList.length - _ilocAtras);
  var _concilia = _moraDash>0
    ? '<div style="font-size:10.5px;color:var(--ink3);margin:-4px 0 10px;font-weight:600">En mora total: <b>'+_moraDash+'</b>'+(_pctTxt(_moraDash,_carteraN,true)?' (<b>'+_pctTxt(_moraDash,_carteraN,true)+'</b> de la cartera, '+_carteraN+' cr\u00e9ditos)':'')+' \u00b7 en Mora Regular: <b>'+_cuAtras+'</b> ('+(_pctTxt(_cuAtras,_moraDash,false)||'0%')+') \u00b7 en Acuerdos Mensuales: <b>'+_acuAtras+'</b> ('+(_pctTxt(_acuAtras,_moraDash,false)||'0%')+') \u00b7 en Cr\u00edticos: <b>'+_critList.length+'</b> ('+(_pctTxt(_critList.length,_moraDash,false)||'0%')+') \u00b7 en Ilocalizables: <b>'+_ilocAtras+'</b> ('+(_pctTxt(_ilocAtras,_moraDash,false)||'0%')+')'
      +(_moraOtros>0?' \u00b7 <span style="color:var(--amber)">fuera por filtros de fecha/b\u00fasqueda: <b>'+_moraOtros+'</b></span>':'')+'</div>'
    : '';
  var _cobBtn = function(k, linea1, linea2){
    return '<button class="btn btn-sm '+(_cobTab===k?'btn-p':'btn-g')+'" onclick="S.cobTab=\''+k+'\';pgSet(\'cuotas\',1);nav(\'pagos\')" style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:8px 14px;line-height:1.3">'
      +'<span>'+linea1+'</span>'
      +'<span style="font-size:10px;opacity:.75;font-weight:700">'+linea2+'</span></button>';
  };
  var _cobTabs = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
    +_cobBtn('quincenal','\ud83d\udccb Mora Regular (Quincenal)', _morCasos+' en atraso'+_pctMora(_morCasos)+' \u00b7 '+fmt(_morMonto)+' vencido')
    +_cobBtn('acuerdos','\ud83d\uddd3\ufe0f Acuerdos Mensuales'+(_acuRotos?' <span style="background:var(--red);color:#fff;border-radius:20px;padding:0 7px;font-size:9.5px;font-weight:900;margin-left:4px">'+_acuRotos+'</span>':''), _acuList.length+' acuerdo'+(_acuList.length!==1?'s':'')+_pctCartera(_acuList.length)+' \u00b7 '+fmt(_acuMonto)+' acumulado')
    +_cobBtn('criticos','\ud83d\udea8 Cr\u00edticos'+(_critList.length?' <span style="background:var(--red);color:#fff;border-radius:20px;padding:0 7px;font-size:9.5px;font-weight:900;margin-left:4px">'+_critList.length+'</span>':''), 'm\u00e1s de 30 d\u00edas de mora'+_pctMora(_critList.length)+' \u00b7 '+fmt(_critMonto)+' vencido')
    +_cobBtn('iloc','\ud83d\udcf5 Ilocalizables', _ilocList.length+' marcado'+(_ilocList.length!==1?'s':'')+_pctMora(_ilocList.length)+' \u00b7 '+fmt(_ilocMonto)+' vencido')
    +_cobBtn('total','\ud83d\udcd5 Mora Total', _morTotalList.length+' en mora'+_pctCartera(_morTotalList.length)+' \u00b7 '+fmt(_morTotMonto)+' vencido')
    +'<button class="btn btn-sm btn-g" onclick="cobExportAbrir()" title="Descargar reporte en Excel o PDF" style="margin-left:auto;align-self:center;display:flex;align-items:center;gap:6px;padding:9px 16px;color:var(--green);border-color:rgba(0,184,118,.4);font-weight:800">\u2b07 Descargar</button>'
    +'</div>'+_concilia;
  // Tasa de cumplimiento historica: sobre TODOS los creditos (tambien los que
  // ya salieron del acuerdo), porque la historia no se borra al quitar el campo.
  var _prCump=0, _prRotas=0;
  (S.creds||[]).forEach(function(c){
    (Array.isArray(c.promesasLog)?c.promesasLog:[]).forEach(function(p){
      if(p.resultado==='cumplida') _prCump++;
      else if(p.resultado==='rota') _prRotas++;
    });
  });
  var _prTot=_prCump+_prRotas;
  var _acuKpis = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">'
    +'<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px 12px;text-align:center">'
      +'<div style="font-size:16px;font-weight:900">'+fmt(_acuMonto)+'</div>'
      +'<div style="font-size:9.5px;color:var(--ink3);font-weight:800;text-transform:uppercase;letter-spacing:.4px">Acumulado en acuerdos</div></div>'
    +'<div style="background:'+(_acuRotos?'rgba(232,75,75,.08)':'var(--surf2)')+';border:1px solid '+(_acuRotos?'rgba(232,75,75,.3)':'var(--rim)')+';border-radius:10px;padding:10px 12px;text-align:center">'
      +'<div style="font-size:16px;font-weight:900;color:'+(_acuRotos?'var(--red)':'var(--ink)')+'">'+_acuRotos+'</div>'
      +'<div style="font-size:9.5px;color:var(--ink3);font-weight:800;text-transform:uppercase;letter-spacing:.4px">Promesas incumplidas hoy</div></div>'
    +'<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px 12px;text-align:center">'
      +'<div style="font-size:16px;font-weight:900;color:'+(_prTot?(_prRotas/_prTot>0.3?'var(--red)':'var(--green)'):'var(--ink3)')+'">'
        +(_prTot?Math.round(_prCump/_prTot*100)+'%':'\u2014')+'</div>'
      +'<div style="font-size:9.5px;color:var(--ink3);font-weight:800;text-transform:uppercase;letter-spacing:.4px">Cumplimiento hist\u00f3rico ('+_prCump+'/'+_prTot+')</div></div>'
    +'</div>';
  var _acuHtml = (function(){
    if(!_acuList.length) return _acuKpis+'<div style="text-align:center;padding:22px 0;color:var(--ink3);font-size:12px">Sin acuerdos mensuales activos.<br><span style="font-size:11px">Se otorgan desde el detalle del cr\u00e9dito \u2014 bot\u00f3n "Acordar mensual" (solo Admin/Gerente).</span></div>';
    var filas = _acuList.map(function(it){
      var c = it.cred;
      var sem = (typeof _acuerdoSemaforo==='function') ? _acuerdoSemaforo(c.fechaCompromiso, _hoyISO) : {nivel:'verde',label:c.fechaCompromiso};
      var monto = it.nVencidas>=1 ? it.vencido : it.proxSaldo;
      var nCuo = it.nVencidas>=1 ? it.nVencidas : 1;
      var conc = ((c.concesionarioId && typeof _concGetById==='function') ? ((_concGetById(c.concesionarioId)||{}).nombre||'') : '') || c.sede || '\u2014';
      var fp = parseFechaLocal(c.fechaCompromiso);
      var fFmt = isNaN(fp.getTime()) ? c.fechaCompromiso : fp.toLocaleDateString('es-VE',{day:'2-digit',month:'short'});
      return '<tr'+(sem.nivel==='rojo'?' style="background:rgba(232,75,75,.07)"':'')+'>'
        +'<td><div class="tdm">'+(c.cli||'\u2014')+'</div><div class="tds" style="font-family:var(--fd)">'+c.id+'</div></td>'
        +'<td class="tds" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+conc+'">'+conc+'</td>'
        +'<td style="font-weight:800;font-family:var(--fd);color:'+(sem.nivel==='rojo'?'var(--red)':'var(--ink)')+'">'+fmt(monto)+' <span class="tds" style="font-weight:600">('+nCuo+' cuota'+(nCuo!==1?'s':'')+')</span></td>'
        +'<td class="tdm" style="white-space:nowrap">'+fFmt+'</td>'
        +'<td><span class="bdg '+(sem.nivel==='rojo'?'b-r':(sem.nivel==='amarillo'?'b-a':'b-g'))+'" style="white-space:nowrap">'+sem.label+'</span></td>'
        +'<td>'+((typeof _cuotaNotaSelect==='function')?_cuotaNotaSelect(c):'')+'</td>'
        +'<td><div style="display:flex;gap:4px;flex-wrap:wrap">'
          +'<button class="btn btn-p btn-xs" onclick="openAddPago(\''+c.id+'\')">\u2713 Pago</button>'
          +'<button class="btn btn-g btn-xs" onclick="acuerdoAcordar(\''+c.id+'\')" title="Reprogramar la fecha de compromiso">\u270e Fecha</button>'
          +'<button class="btn btn-g btn-xs" onclick="acuerdoQuitar(\''+c.id+'\')" title="Volver a mora quincenal">\u2715 Quitar</button>'
        +'</div></td></tr>';
    }).join('');
    return _acuKpis+'<div class="tw"><table><thead><tr><th>Cliente \u00b7 Cr\u00e9dito</th><th>Concesionario</th><th>Acumulado a pagar</th><th>Fecha promesa</th><th>Estatus</th><th>Notas</th><th>Acciones</th></tr></thead><tbody>'+filas+'</tbody></table></div>';
  })();

  return`<div class="page">

  ${pageBanner(
    'Cobranza · Cobros y pagos',
    'Cobranza',
    isEmpleadoRole()
      ? '<b>'+proximasCuotas.length+'</b> cuotas por cobrar · '+allPagos.length+' pagos registrados'
      : '<b>'+allPagos.length+'</b> pagos registrados · Cobrado total: <b>'+fmt(totalConf)+'</b> · Este mes: <b>'+fmt(totalMes)+'</b>',
    [
      {label:'↓ Exportar CSV', onclick:"exportarCSV('pagos')"},
      {label:'＋ Registrar Pago', onclick:'openAddPago()', primary:true}
    ]
  )}

  <!-- Comprobantes que subieron los clientes desde Mi Cuenta (portal) -->
  ${typeof portalComprobantesCard==='function' ? portalComprobantesCard() : ''}

  ${isEmpleadoRole() ? '' : `
  <!-- KPI cards -->
  <div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:14px">
    <div class="stat">
      <div class="st-ic" style="background:var(--greens);color:var(--green);font-size:9px;font-weight:800">✓</div>
      <div class="st-v" style="color:var(--green);font-size:26px">${fmt(totalConf)}</div>
      <div class="st-l">Cobrado confirmado <span style="opacity:.6;font-size:10px">${confs.length}</span></div>
    </div>
    <div class="stat">
      <div class="st-ic" style="background:var(--ambers);color:var(--amber);font-size:9px;font-weight:800">PND</div>
      <div class="st-v" style="color:var(--amber);font-size:26px">${fmt(totalPend)}</div>
      <div class="st-l">Pendiente por confirmar <span style="opacity:.6;font-size:10px">${pends.length}</span></div>
    </div>
    <div class="stat">
      <div class="st-ic" style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:800">MES</div>
      <div class="st-v" style="color:var(--p1);font-size:26px">${fmt(totalMes)}</div>
      <div class="st-l">Cobrado este mes <span style="opacity:.6;font-size:10px">${pagosMes.length} pagos</span></div>
    </div>
    <div class="stat">
      <div class="st-ic" style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:800">AVG</div>
      <div class="st-v" style="color:var(--p1);font-size:26px">${fmt(promMes)}</div>
      <div class="st-l">Promedio por pago (mes)</div>
    </div>
    <div class="stat">
      <div class="st-ic" style="background:var(--greens);color:var(--green);font-size:9px;font-weight:800">TOP</div>
      <div class="st-v" style="color:var(--green);font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${topMetodo.nombre || '—'}</div>
      <div class="st-l">Método más usado · ${fmt(topMetodo.total)}</div>
    </div>
  </div>
  `}

  <!-- Cuotas Próximas / Críticos / Mora Total -->
  <div class="card" style="margin-bottom:12px">
    <div class="ch" style="margin-bottom:10px">
      <div><div class="ct">${_cobTab==='criticos'?'Críticos':_cobTab==='iloc'?'Ilocalizables':_cobTab==='total'?'Mora Total':'Cuotas Próximas'}</div><div class="cs">${_cobTab==='criticos'?'Créditos con más de 30 días de atraso · peor primero':_cobTab==='iloc'?'Clientes marcados con la nota "Ilocalizable" · se agregan desde la columna Notas':_cobTab==='total'?'Todos los créditos con al menos 1 día de atraso · incluye acuerdos, críticos e ilocalizables':'Próximos 30 días + todos los atrasados · más urgentes primero'}</div></div>
      <span class="bdg ${(_cobTab==='acuerdos'?_acuList.length:proximasCuotas.length)>0?'b-a':'b-g'}">${_cobTab==='acuerdos'?_acuList.length:proximasCuotas.length}</span>
    </div>
    ${_cobTabs}
    ${_cobTab==='acuerdos' ? _acuHtml : `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <input type="text" id="cuotasQ" value="${String(S.cuotasQ||'').replace(/</g,'&lt;').replace(/"/g,'&quot;')}" placeholder="Buscar cliente, crédito o modelo..." oninput="liveSearchCuotas(this.value)" style="flex:1;min-width:190px;border:1px solid var(--rim);border-radius:8px;padding:6px 10px;font-size:12px;font-family:var(--f);background:var(--surf);color:var(--ink)">
      ${_cobTab==='quincenal' ? `<label style="font-size:11px;color:var(--ink3);font-weight:700">Vence desde:</label>
      <input type="date" value="${S.cuotasDesde||''}" onchange="S.cuotasDesde=this.value;pgSet('cuotas',1);nav('pagos')" style="border:1px solid var(--rim);border-radius:8px;padding:5px 8px;font-size:12px;font-family:var(--f);background:var(--surf);color:var(--ink)">
      <label style="font-size:11px;color:var(--ink3);font-weight:700">Hasta:</label>
      <input type="date" value="${S.cuotasHasta||''}" onchange="S.cuotasHasta=this.value;pgSet('cuotas',1);nav('pagos')" style="border:1px solid var(--rim);border-radius:8px;padding:5px 8px;font-size:12px;font-family:var(--f);background:var(--surf);color:var(--ink)">` : ''}
      ${(S.cuotasDesde||S.cuotasHasta||S.cuotasQ)?`<button class="btn btn-g btn-sm" onclick="S.cuotasDesde='';S.cuotasHasta='';S.cuotasQ='';S.cuotasFilter='todos';pgSet('cuotas',1);nav('pagos')">✕ Limpiar</button>`:''}
    </div>
    ${_cobTab==='quincenal' ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-sm ${_cuF==='todos'?'btn-p':'btn-g'}" onclick="setCuotasFilter('todos')">Todos <span style="opacity:.7;font-weight:800">${_cuAtras+_cuAlDia}</span></button>
      <button class="btn btn-sm ${_cuF==='atrasados'?'btn-p':'btn-g'}" onclick="setCuotasFilter('atrasados')">🔴 Atrasados <span style="opacity:.7;font-weight:800">${_cuAtras}</span></button>
      <button class="btn btn-sm ${_cuF==='aldia'?'btn-p':'btn-g'}" onclick="setCuotasFilter('aldia')">🟢 Al día / próximas <span style="opacity:.7;font-weight:800">${_cuAlDia}</span></button>
    </div>` : ''}
    ${proximasCuotas.length===0 ? `<div style="text-align:center;padding:20px 0;color:var(--ink3);font-size:12px">${_cobTab==='criticos'?'Sin créditos con más de 30 días de mora 🎉':_cobTab==='iloc'?'Sin clientes ilocalizables.<br><span style="font-size:11px">Para agregar uno, ponle la nota "Ilocalizable" en la columna Notas de cualquier pestaña y aparecerá aquí.</span>':_cobTab==='total'?'Sin créditos en mora 🎉':'Sin cuotas próximas ni atrasadas'}</div>` :
      `<div class="tw"><table>
      <thead><tr>
        ${_thSort(_cu,'setCuotasSort','cli','Cliente')}
        <th>Teléfono</th>
        ${_thSort(_cu,'setCuotasSort','id','Crédito')}
        ${_thSort(_cu,'setCuotasSort','cuota','Cuota N°')}
        ${_thSort(_cu,'setCuotasSort','estado','Estado')}
        ${_thSort(_cu,'setCuotasSort','vence','Vence')}
        ${_thSort(_cu,'setCuotasSort','monto','Monto')}
        <th>Concesionario</th>
        <th>Notas</th>
        <th>Gestión de cobro</th>
        <th></th>
      </tr></thead>
      <tbody>${(()=>{const _cp=pgGet('cuotas');return proximasCuotas.slice((_cp-1)*50,_cp*50).map(function(item){
        const c=item.cred, diff=item.diff;
        const col = diff<0?'var(--red)':diff<=1?'var(--amber)':'var(--green)';
        const lbl = diff<0?`${Math.abs(diff)}d de atraso`:diff===0?'Vence hoy':diff===1?'Vence mañana':`Vence en ${diff}d`;
        const badge = diff<0?'ATRASO':diff<=1?'URGENTE':'PRÓXIMO';
        const bcls = diff<0?'b-r':diff<=1?'b-a':'b-g';
        const _vd = (item.venceStr||'').split('-');
        const fechaFmt = _vd.length===3 ? new Date(+_vd[0],+_vd[1]-1,+_vd[2]).toLocaleDateString('es-VE',{weekday:'short',day:'numeric',month:'short'}) : '';
        const cl = S.clientes.find(function(x){return c.clienteId && String(x.id)===String(c.clienteId);}) || S.clientes.find(function(x){return x.nombre===c.cli && c.cli;}) || {};
        const conc = ((c.concesionarioId && typeof _concGetById==='function') ? ((_concGetById(c.concesionarioId)||{}).nombre||'') : '') || c.sede || '';
        return `<tr>
          <td class="tdm"><span onclick="verClienteDeCred('${c.id}')" title="Ver perfil del cliente (teléfono, dirección, créditos)" style="cursor:pointer;color:var(--p1);text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px">${c.cli}</span>${item.gam&&item.gam.nivel&&item.gam.nivel.cupo>0?`<div style="margin-top:3px;display:flex;align-items:center;gap:5px"><span style="font-size:9px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;padding:2px 7px;border-radius:20px;color:${item.gam.nivel.col};background:${item.gam.nivel.bg}" title="Nivel del cliente en el programa de puntos">${item.gam.nivel.nom}</span>${item.gam.racha>0?`<span style="font-size:9.5px;font-weight:700;color:var(--ink3)" title="Pagos puntuales seguidos">${item.gam.racha} al día</span>`:''}</div>`:''}${c.fechaCompromiso?`<div style="font-size:9px;font-weight:800;color:var(--p1);margin-top:3px" title="Este crédito tiene acuerdo de pago mensual">🗓️ Acuerdo: ${c.fechaCompromiso}</div>`:''}</td>
          <td class="tds" style="font-family:var(--fd);white-space:nowrap">${cl.tel||'—'}</td>
          <td class="tds" style="font-family:var(--fd)">${c.id}</td>
          <td class="tds">${item.cuotaNum}/${c.totalCuotas||c.plazo*2||24}</td>
          <td><span class="bdg ${bcls}" style="font-size:9px">${badge}</span></td>
          <td class="tds"><div style="color:${col};font-weight:700">${lbl}</div>${fechaFmt?`<div style="font-size:10px;color:var(--ink3);font-weight:600;margin-top:2px;text-transform:capitalize">${fechaFmt}</div>`:''}</td>
          <td style="font-weight:800;font-family:var(--fd);color:${item.nVencidas>=1?'var(--red)':'var(--ink)'}">${item.nVencidas>=1?fmt(item.vencido):fmt(item.proxSaldo)}${item.nVencidas>=2?`<div style="font-size:9.5px;font-weight:700;color:var(--ink3);margin-top:2px;white-space:nowrap">${item.nVencidas} cuotas vencidas · ${fmt(item.cuotaMonto)} c/u</div>`:(item.nVencidas===1?`<div style="font-size:9.5px;font-weight:600;color:var(--ink3);margin-top:2px;white-space:nowrap">1 cuota vencida</div>`:`<div style="font-size:9.5px;font-weight:600;color:var(--ink3);margin-top:2px;white-space:nowrap">${item.proxSaldo<item.cuotaMonto-0.01?`abonó ${fmt(item.cuotaMonto-item.proxSaldo)} de ${fmt(item.cuotaMonto)}`:'próxima cuota'}</div>`)}</td>
          <td class="tds" style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${conc||''}">${conc||'—'}</td>
          <td>${_cuotaNotaSelect(c)}</td>
          <td>${_gestionCobroCell(c)}</td>
          <td><div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="btn btn-p btn-xs" onclick="openAddPago('${c.id}')">Cobrar</button>
            <button class="btn btn-g btn-xs" onclick="avisarCuotaProxima('${c.id}')" title="Enviar recordatorio al cliente por WhatsApp">Avisar</button>
            <button class="btn btn-g btn-xs" onclick="llamarCliente('${c.id}')" title="Llamar al cliente">📞</button>
            ${(typeof _cobPuedeAcordar==='function'&&_cobPuedeAcordar())?`<button class="btn btn-g btn-xs" onclick="acuerdoAcordar('${c.id}')" title="Pasar a acuerdo de pago mensual con fecha de compromiso">🗓️ Acuerdo</button>`:''}
            ${diff<0?`<button class="btn btn-g btn-xs" onclick="confirmarRecuperacion('${c.id}')" title="Recuperar moto (cliente en mora)" style="color:var(--red);border-color:rgba(232,51,90,.28)">↩ Moto</button>`:''}
          </div></td>
        </tr>`;
      }).join('')})()}
      </tbody>
      </table></div>
      ${pgControls('cuotas',proximasCuotas.length,50,'pgNav')}`
    }`}
  </div>

  <!-- Filtro por fecha + buscador -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    <input type="text" id="pagosQ" value="${String(S.pagosQ||'').replace(/</g,'&lt;').replace(/"/g,'&quot;')}" placeholder="Buscar cliente, crédito, cobrador, N° referencia, monto..." oninput="liveSearchPagos(this.value)" style="flex:1;min-width:220px;border:1px solid var(--rim);border-radius:8px;padding:6px 10px;font-size:12px;font-family:var(--f);background:var(--surf);color:var(--ink)">
    <label style="font-size:11px;color:var(--ink3);font-weight:700">Desde:</label>
    <input type="date" value="${S.pagosDesde||''}" onchange="S.pagosDesde=this.value;pgSet('pagos',1);nav('pagos')" style="border:1px solid var(--rim);border-radius:8px;padding:5px 8px;font-size:12px;font-family:var(--f);background:var(--surf);color:var(--ink)">
    <label style="font-size:11px;color:var(--ink3);font-weight:700">Hasta:</label>
    <input type="date" value="${S.pagosHasta||''}" onchange="S.pagosHasta=this.value;pgSet('pagos',1);nav('pagos')" style="border:1px solid var(--rim);border-radius:8px;padding:5px 8px;font-size:12px;font-family:var(--f);background:var(--surf);color:var(--ink)">
    ${(S.pagosDesde||S.pagosHasta||S.pagosQ||(S.pagosTipoF&&S.pagosTipoF!=='todos'))?`<button class="btn btn-g btn-sm" onclick="S.pagosDesde='';S.pagosHasta='';S.pagosQ='';S.pagosTipoF='todos';pgSet('pagos',1);nav('pagos')">✕ Limpiar</button>`:''}
  </div>

  <!-- Filter tabs -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
    ${[
      ['todos','Todos',allPagos.length,'var(--ink2)'],
      ['confirmados','Confirmados',confs.length,'var(--green)'],
      ['pendientes','Pendientes',pends.length,'var(--amber)'],
      ['archivados','Archivados',pagosEliminados.length,'var(--red)'],
    ].map(function(arr){
      var k=arr[0], l=arr[1], n=arr[2], col=arr[3];
      var isActive = tab===k;
      return '<button class="btn btn-sm'+(isActive?' btn-p':' btn-g')+'" onclick="setPagosTab(\''+k+'\')" style="gap:6px'+(isActive?'':';border-left:3px solid '+col)+'">'+l+' <span style="opacity:.75;font-size:10px;font-weight:900">'+n+'</span></button>';
    }).join('')}
  </div>

  <!-- Filtro por tipo de pago -->
  ${tab!=='archivados' ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
    <span style="font-size:10.5px;color:var(--ink3);font-weight:800;text-transform:uppercase;letter-spacing:.5px">Tipo:</span>
    ${[
      ['todos','Todos',_ptCuota+_ptIni+_ptLiq],
      ['cuota','Cuotas',_ptCuota],
      ['inicial','💠 Iniciales',_ptIni],
      ['liquidacion','⚡ Liquidaciones',_ptLiq],
    ].map(function(arr){
      var k=arr[0], l=arr[1], n=arr[2];
      return '<button class="btn btn-sm'+(_pTf===k?' btn-p':' btn-g')+'" onclick="setPagosTipoF(\''+k+'\')" style="gap:6px">'+l+' <span style="opacity:.75;font-size:10px;font-weight:900">'+n+'</span></button>';
    }).join('')}
  </div>` : ''}

  <!-- Tabla / Lista -->
  ${tab==='archivados' ? `
  <div class="card">
    <div class="ch">
      <div><div class="ct" style="color:var(--red)">Pagos archivados</div><div class="cs">${pagosEliminados.length} pago${pagosEliminados.length!==1?'s':''} eliminado${pagosEliminados.length!==1?'s':''} · puedes restaurarlos si fueron eliminados por error</div></div>
    </div>
    ${pagosEliminados.length===0?`<div style="text-align:center;padding:40px 20px;color:var(--ink3)">
      <div style="font-size:13px;font-weight:700;color:var(--green)">Sin pagos archivados</div>
      <div style="font-size:11.5px;margin-top:4px">Todos los pagos registrados están activos</div>
    </div>`:`<div class="tw"><table>
    <thead><tr><th>ID</th><th>Cliente</th><th>Crédito</th><th>Fecha pago</th><th>Monto</th><th>Método</th><th>Eliminado por</th><th>Fecha eliminación</th><th>Razón</th><th>Modo</th><th></th></tr></thead>
    <tbody>${pagosEliminados.slice().sort(function(a,b){return (b.eliminadoEn||'').localeCompare(a.eliminadoEn||'');}).map(function(p){
      var fechaElim = p.eliminadoEn ? p.eliminadoEn.split('T')[0] : '—';
      var modoLbl = p.eliminadoModo==='mantener' ? 'Mantiene en amort.' : 'Eliminado completo';
      var modoCls = p.eliminadoModo==='mantener' ? 'b-a' : 'b-r';
      return '<tr style="opacity:.78">'
        +'<td class="tdm" style="font-family:var(--fd);text-decoration:line-through">'+p.id+'</td>'
        +'<td class="tdm" style="text-decoration:line-through">'+(p.cli||'—')+'</td>'
        +'<td class="tds">'+(p.cred||'—')+'</td>'
        +'<td class="tds">'+(p.fecha||'—')+'</td>'
        +'<td style="color:var(--red);font-weight:800;font-family:var(--fd);text-decoration:line-through">'+fmt(p.monto)+'</td>'
        +'<td class="tds">'+(p.metodo||'—')+'</td>'
        +'<td class="tds" style="color:var(--red);font-weight:700">'+(p.eliminadoPor||'Admin')+'</td>'
        +'<td class="tds">'+fechaElim+'</td>'
        +'<td class="tds" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(p.eliminadoRazon||'')+'">'+(p.eliminadoRazon||'Sin razón')+'</td>'
        +'<td><span class="bdg '+modoCls+'" style="font-size:9px">'+modoLbl+'</span></td>'
        +'<td><button class="btn btn-p btn-xs" onclick="restaurarPago(\''+p.id+'\')" title="Restaurar este pago">↺ Restaurar</button></td>'
        +'</tr>';
    }).join('')}
    </tbody>
    </table></div>`}
  </div>
  ` : `
  <div class="card">
    <div class="ch">
      <div><div class="ct">Registro de pagos</div><div class="cs">${filtered.length} resultado${filtered.length!==1?'s':''}</div></div>
      ${pagosEliminados.length>0?`<button class="btn btn-g btn-sm" onclick="setPagosTab('archivados')" style="">Ver archivados · ${pagosEliminados.length}</button>`:''}
    </div>
    <div class="tw"><table>
    <thead><tr>
      ${_thSort(_ps,'setPagosSort','id','ID')}
      ${_thSort(_ps,'setPagosSort','cli','Cliente')}
      ${_thSort(_ps,'setPagosSort','cred','Crédito')}
      ${_thSort(_ps,'setPagosSort','fecha','Fecha')}
      ${_thSort(_ps,'setPagosSort','monto','Monto')}
      ${_thSort(_ps,'setPagosSort','tipo','Tipo')}
      ${_thSort(_ps,'setPagosSort','metodo','Recibido en')}
      ${_thSort(_ps,'setPagosSort','cobrador','Cobrador')}
      ${_thSort(_ps,'setPagosSort','estado','Estado')}
      <th>Factura</th><th></th>
    </tr></thead>
    <tbody>${(()=>{const _pp=pgGet('pagos');return filtered.slice((_pp-1)*50,_pp*50).map(p=>{
      var fac = (S.facturas||[]).find(function(f){ return f.pagoId === p.id; });
      var facCol = '';
      if(fac){
        if(fac.anulada){
          facCol = '<span class="bdg" style="background:rgba(255,71,87,.2);color:var(--red);font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700">ANULADA</span>';
        } else {
          facCol = '<span class="bdg" style="background:rgba(0,184,118,.18);color:var(--green);font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;font-family:var(--fd)">'+fac.numero+'</span>';
        }
      } else if(p.estado==='confirmado'){
        facCol = '<span style="color:var(--ink3);font-size:10.5px">— sin factura —</span>';
      } else {
        facCol = '<span style="color:var(--ink3);font-size:10.5px">—</span>';
      }
      var _tp = _tipoPago(p);
      return `<tr style="cursor:pointer${_tp==='inicial'?';background:rgba(124,58,237,.035)':''}" onclick="abrirDetallePago('${p.id}')">
      <td class="tdm" style="font-family:var(--fd)">${p.id}</td>
      <td class="tdm">${p.cli}</td>
      <td class="tds">${p.cred}</td>
      <td class="tds" style="white-space:nowrap">${p.fecha}${(function(){var h=_pagoHoraTxt(p);return h?`<div style="font-size:9.5px;opacity:.75">${h}</div>`:'';})()}</td>
      <td style="color:var(--green);font-weight:800;font-family:var(--fd)">${fmt(p.monto)}</td>
      <td>${_tipoPagoBdg(_tp)}</td>
      <td class="tds">${p.metodo}</td>
      <td class="tds">${p.cobrador}</td>
      <td><span class="bdg ${sbg(p.estado)}">${p.estado}</span></td>
      <td>${facCol}</td>
      <td onclick="event.stopPropagation()"><div style="display:flex;gap:4px">${p.estado==='pendiente'?`<button class="btn btn-s btn-xs" onclick="confirmarPago('${p.id}')">✓</button>`:''}<button class="btn btn-p btn-xs" onclick="openEditPago('${p.id}')" title="Editar">Editar</button><button class="btn btn-d btn-xs" onclick="confirmarDelPago('${p.id}')" title="Eliminar">Eliminar</button></div></td>
    </tr>`;
    }).join('')})()}
    ${filtered.length===0?`<tr><td colspan="11" style="text-align:center;padding:30px 0;color:var(--ink3);font-size:13px">Sin pagos con este filtro</td></tr>`:''}
    </tbody>
  </table></div>
  </div>
  `}
  </div>`+(tab!=='archivados'?pgControls('pagos',filtered.length,50,'pgNav'):'');
};

// Formato compacto para etiquetas de barras ($1.2M, $55k, $320)
function _fmtK(n){
  n=Math.round(n||0); var s=n<0?'-':''; n=Math.abs(n);
  if(n>=1000000) return s+'$'+(n/1000000).toFixed(n>=10000000?0:1)+'M';
  if(n>=1000) return s+'$'+Math.round(n/1000)+'k';
  return s+'$'+n;
}

// Agrupa [{fecha:'YYYY-MM-DD', monto}] en una serie de barras según el período elegido.
// dir='past' (hacia atrás desde hoy) o 'future' (hacia adelante desde hoy).
function _pgSerie(items, mode, dir){
  items = items || [];
  var out=[]; var today=new Date(); today.setHours(0,0,0,0);
  var iso=function(d){ return (typeof fechaLocalISO==='function')?fechaLocalISO(d):d.toISOString().slice(0,10); };
  var mk=function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };
  var MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var sum=function(pred){ return items.filter(pred).reduce(function(a,x){return a+(x.monto||0);},0); };
  if(mode==='total'){ out.push({lbl:'Total', tot:items.reduce(function(a,x){return a+(x.monto||0);},0)}); return out; }
  if(mode==='diario'){
    for(var i=0;i<14;i++){ var d=new Date(today); d.setDate(d.getDate()+(dir==='future'?i:-(13-i))); var k=iso(d);
      out.push({lbl:String(d.getDate()), tot:sum(function(x){return x.fecha===k;})}); }
    return out;
  }
  if(mode==='quincenal'){
    for(var i=0;i<8;i++){ var start,end;
      if(dir==='future'){ start=new Date(today); start.setDate(start.getDate()+i*15); end=new Date(start); end.setDate(end.getDate()+14); }
      else { end=new Date(today); end.setDate(end.getDate()-(7-i)*15); start=new Date(end); start.setDate(start.getDate()-14); }
      var ks=iso(start), ke=iso(end);
      out.push({lbl:String(start.getDate()).padStart(2,'0')+'/'+String(start.getMonth()+1).padStart(2,'0'), tot:sum(function(x){return x.fecha>=ks && x.fecha<=ke;})}); }
    return out;
  }
  if(mode==='mensual'){
    for(var i=0;i<12;i++){ var d=new Date(today.getFullYear(), today.getMonth()+(dir==='future'?i:-(11-i)), 1); var k=mk(d);
      out.push({lbl:MES[d.getMonth()], tot:sum(function(x){return String(x.fecha).slice(0,7)===k;})}); }
    return out;
  }
  if(mode==='anual'){
    var years={}; items.forEach(function(x){ var y=String(x.fecha).slice(0,4); years[y]=(years[y]||0)+(x.monto||0); });
    var ykeys=Object.keys(years).sort(); if(!ykeys.length) ykeys=[String(today.getFullYear())];
    ykeys.forEach(function(y){ out.push({lbl:y, tot:years[y]||0}); });
    return out;
  }
  return out;
}

// ─── EXPORTAR COBRANZA (Excel / PDF) ───
// Usa las listas ya calculadas por la vista (window._cobXls).
var _COB_TAB_LBL = { quincenal:'Mora Regular', acuerdos:'Acuerdos Mensuales', criticos:'Criticos', iloc:'Ilocalizables', total:'Mora Total' };
function _cobXlsNum(n){ return String((Math.round((parseFloat(n)||0)*100)/100).toFixed(2)).replace('.',','); }
function _cobXlsEstado(it){
  var c=it.cred;
  if(String(c.cobranzaStatus||'')==='ilocalizable') return 'Ilocalizable';
  if(c.fechaCompromiso) return 'Acuerdo mensual';
  var dm=Math.max(parseInt(c.mora,10)||0, it.diff<0?-it.diff:0, it.mora||0);
  if(dm>30) return 'Crítico';
  var atr = it.diff<0 || it.nVencidas>=1 || (parseInt(c.mora,10)||0)>0;
  return atr ? 'Mora regular' : 'Al día';
}
function _cobExpEsAtr(it){ return it.diff<0 || it.nVencidas>=1 || (parseInt(it.cred.mora,10)||0)>0; }
// Filas del reporte. El CSV usa las 16 columnas planas; el PDF usa los
// objetos ricos (ricas) para un layout compacto.
function _cobExpFilas(items){
  var head=['Cliente','Teléfono','Crédito','Concesionario','Modelo','Cuota N°','Vence','Días de mora','Cuotas vencidas','Monto cuota','Monto vencido','Saldo pendiente','Estado','Nota de cobranza','Acuerdo mensual','Cobrador'];
  var ricas=items.map(function(it){
    var c=it.cred;
    var cl=(S.clientes||[]).find(function(x){return c.clienteId && String(x.id)===String(c.clienteId);}) || (S.clientes||[]).find(function(x){return x.nombre===c.cli && c.cli;}) || {};
    var conc=((c.concesionarioId && typeof _concGetById==='function') ? ((_concGetById(c.concesionarioId)||{}).nombre||'') : '') || c.sede || '';
    var dm=Math.max(parseInt(c.mora,10)||0, it.diff<0?-it.diff:0, it.mora||0);
    var saldo=(typeof getCreditoSaldoPendiente==='function')?(getCreditoSaldoPendiente(c)||0):null;
    var nota=_notaCobranzaOpt(c.cobranzaStatus||'').t;
    return { cli:c.cli||'', tel:cl.tel||'', credId:c.id||'', conc:conc, modelo:c.modelo||'',
      cuotaLbl:(it.cuotaNum||'')+'/'+(c.totalCuotas||((parseInt(c.plazo,10)||0)*2)||''),
      vence:it.venceStr||'', dm:dm, nVenc:it.nVencidas||0, cuotaMonto:it.cuotaMonto||0,
      vencido:it.nVencidas>=1?it.vencido:0, saldo:saldo,
      estado:_cobXlsEstado(it), nota:nota==='— Sin nota'?'':nota,
      acuerdo:c.fechaCompromiso||'', cobrador:c.cobrador||'' };
  });
  var filas=ricas.map(function(r){
    return [r.cli, r.tel, r.credId, r.conc, r.modelo, r.cuotaLbl, r.vence, r.dm, r.nVenc,
      _cobXlsNum(r.cuotaMonto), _cobXlsNum(r.vencido), r.saldo==null?'':_cobXlsNum(r.saldo),
      r.estado, r.nota, r.acuerdo, r.cobrador];
  });
  return {head:head, filas:filas, ricas:ricas};
}
// Estado de seleccion del modal (botones tipo tarjeta, no selects)
window._cobExpSel = { alc:'todas', per:'dia', fmt:'excel' };
function cobExpSel(k,v){
  window._cobExpSel[k]=v;
  document.querySelectorAll('[data-cxk]').forEach(function(b){
    var on = window._cobExpSel[b.getAttribute('data-cxk')]===b.getAttribute('data-cxv');
    b.style.background = on ? 'var(--p1)' : 'var(--surf2)';
    b.style.color = on ? '#fff' : 'var(--ink2)';
    b.style.borderColor = on ? 'var(--p1)' : 'var(--rim2)';
  });
  var r=document.getElementById('cx_rango');
  if(r) r.style.display = window._cobExpSel.per==='rango' ? 'grid' : 'none';
}
function cobExportAbrir(){
  var X=window._cobXls||{};
  var tabLbl=_COB_TAB_LBL[X.tab]||'Mora Regular';
  window._cobExpSel = { alc:'todas', per:'dia', fmt:'excel' };
  setMicon('exportar');$('mtt').textContent='Descargar reporte de cobranza';$('msb').textContent='Toca una opción de cada grupo y dale Descargar';
  $('modal-box').className='modal';
  var btn=function(k,v,txt,sub){
    var on=window._cobExpSel[k]===v;
    return '<button type="button" data-cxk="'+k+'" data-cxv="'+v+'" onclick="cobExpSel(\''+k+'\',\''+v+'\')" '
      +'style="flex:1;min-width:130px;text-align:left;cursor:pointer;border-radius:12px;padding:10px 13px;border:1.5px solid '+(on?'var(--p1)':'var(--rim2)')+';'
      +'background:'+(on?'var(--p1)':'var(--surf2)')+';color:'+(on?'#fff':'var(--ink2)')+';font-family:var(--f)">'
      +'<div style="font-size:12.5px;font-weight:800">'+txt+'</div>'
      +(sub?'<div style="font-size:10px;opacity:.8;font-weight:600;margin-top:2px">'+sub+'</div>':'')
      +'</button>';
  };
  var grupo=function(titulo){ return '<div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--ink3);margin:14px 0 7px">'+titulo+'</div>'; };
  $('mbd').innerHTML=
    grupo('1 · Qué reporte quieres')
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +btn('per','dia','📅 Del día','Vencen hoy + todas las moras del día')
    +btn('per','semana','🗓️ De la semana','Vencen lun–dom + moras')
    +btn('per','mes','📆 Del mes','Vencen este mes + moras')
    +'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
    +btn('per','todo','📚 Todo el listado','Sin filtro de fechas')
    +btn('per','rango','🔎 Rango de fechas','Vencimientos entre dos fechas')
    +'</div>'
    +'<div id="cx_rango" style="display:none;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'
    +'<div class="fg"><label>Desde</label><input class="fi" id="cx_desde" type="date"></div>'
    +'<div class="fg"><label>Hasta</label><input class="fi" id="cx_hasta" type="date"></div>'
    +'</div>'
    +grupo('2 · De dónde')
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +btn('alc','todas','🗂️ Todas las pestañas','Sin repetir créditos')
    +btn('alc','actual','📌 Solo la pestaña actual',tabLbl)
    +'</div>'
    +grupo('3 · Formato')
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +btn('fmt','excel','📊 Excel / Numbers','Archivo .csv en columnas para trabajar la data')
    +btn('fmt','pdf','📄 PDF','Hoja carta lista para imprimir o enviar')
    +'</div>';
  S.saveFn=function(){
    var sel=window._cobExpSel||{alc:'todas',per:'dia',fmt:'excel'};
    var X2=window._cobXls||{};
    var items;
    if(sel.alc==='todas'){
      var vis={}; items=[];
      ['total','acuerdos','iloc','criticos','quincenal'].forEach(function(k){
        (X2[k]||[]).forEach(function(it){ var id=it.cred&&it.cred.id; if(id&&!vis[id]){vis[id]=1;items.push(it);} });
      });
    } else {
      items=(X2[X2.tab]||[]).slice();
    }
    var hoyI=hoyLocalISO(), perLbl='Todo el listado';
    if(sel.per==='dia'){
      items=items.filter(function(it){ return (it.venceStr||'')===hoyI || _cobExpEsAtr(it); });
      perLbl='Del día '+hoyI+' · vencen hoy + moras';
    } else if(sel.per==='semana'){
      var _hd=new Date(); var _dow=(_hd.getDay()+6)%7;   // 0 = lunes
      var _lun=new Date(_hd); _lun.setDate(_hd.getDate()-_dow);
      var _dom=new Date(_lun); _dom.setDate(_lun.getDate()+6);
      var _li=fechaLocalISO(_lun), _di=fechaLocalISO(_dom);
      items=items.filter(function(it){ var v=it.venceStr||''; return (v>=_li && v<=_di) || _cobExpEsAtr(it); });
      perLbl='Semana del '+_li+' al '+_di+' · vencimientos + moras';
    } else if(sel.per==='mes'){
      var mesI=hoyI.slice(0,7);
      items=items.filter(function(it){ return String(it.venceStr||'').slice(0,7)===mesI || _cobExpEsAtr(it); });
      perLbl='Mes '+mesI+' · vencimientos + moras';
    } else if(sel.per==='rango'){
      var d=(($('cx_desde')&&$('cx_desde').value)||''), h=(($('cx_hasta')&&$('cx_hasta').value)||'');
      if(d) items=items.filter(function(it){ return (it.venceStr||'')>=d; });
      if(h) items=items.filter(function(it){ return (it.venceStr||'')<=h; });
      perLbl='Vencimientos del '+(d||'inicio')+' al '+(h||'hoy');
    }
    if(!items.length){ toast('No hay registros con ese filtro','error'); return false; }
    items=items.slice().sort(function(a,b){ return (a.diff||0)-(b.diff||0); });   // peor primero
    var data=_cobExpFilas(items);
    var alcLbl = sel.alc==='todas' ? 'Todas las pestañas' : (_COB_TAB_LBL[X2.tab]||'');
    var base='PAGASI_Cobranza_'+(sel.per==='dia'?'Del_dia':sel.per==='semana'?'Semanal':sel.per==='mes'?'Mensual':sel.per==='rango'?'Rango':'Completa')+'_'+hoyI;
    if(sel.fmt==='pdf'){
      var okPdf=_cobExpPdf(data, alcLbl, perLbl, items);
      if(!okPdf) return false;
    } else {
      // CSV real (; + coma decimal): lo abren bien Excel y Numbers, en columnas
      var campo=function(v){ v=String(v==null?'':v); return /[;"\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; };
      var csv=[data.head.map(campo).join(';')]
        .concat(data.filas.map(function(f){ return f.map(campo).join(';'); }))
        .join('\r\n');
      window._cobXlsUltimoCsv = csv;   // tambien lo usan las pruebas
      try{
        if(typeof Blob!=='undefined' && typeof URL!=='undefined' && URL.createObjectURL){
          var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
          var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=base+'.csv';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
      }catch(e){ toast('No se pudo generar el archivo','error'); return false; }
    }
    if(typeof logActividad==='function') logActividad('export_cobranza','pagos',sel.alc,{registros:items.length, periodo:sel.per, formato:sel.fmt});
    toast((sel.fmt==='pdf'?'PDF listo':'Archivo descargado')+' · '+items.length+' registro'+(items.length!==1?'s':''),'success');
    closeM(); return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">⬇ Descargar</button>';
  $('ov').style.display='flex';
}
// PDF: hoja carta horizontal con la identidad PAGASI — layout compacto de
// 10 columnas con subtitulos (el detalle completo va en el CSV)
function _cobExpPdf(data, alcLbl, perLbl, items){
  var esc=function(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var R=data.ricas||[];
  var n=R.length;
  var totVenc=R.reduce(function(a,r){ return a+(r.vencido||0); },0);
  var totSaldo=R.reduce(function(a,r){ return a+(r.saldo||0); },0);
  var enMora=R.filter(function(r){return r.dm>0;});
  var promDm=enMora.length?Math.round(enMora.reduce(function(a,r){return a+r.dm;},0)/enMora.length):0;
  var PILL={
    'Crítico':['#B91C1C','#FEE2E2'],
    'Ilocalizable':['#991B1B','#FEE2E2'],
    'Acuerdo mensual':['#7C3AED','#F3E8FF'],
    'Mora regular':['#B45309','#FFEDD5'],
    'Al día':['#00915D','#D1FAE5']
  };
  // La direccion del logo se arma desde la carpeta donde esta la pagina, no desde la
  // raiz del dominio: si el sistema se sirve bajo una subcarpeta (pagasi18.github.io/
  // PAGASI26/, por ejemplo) una ruta que empiece por "/" apunta fuera y el logo sale
  // roto en el reporte de cobranza (23-sep-2026).
  var logoUrl='';
  try{
    if(typeof location!=='undefined' && location.origin && location.origin.indexOf('http')===0)
      logoUrl = location.origin + location.pathname.replace(/[^\/]*$/,'') + 'assets/pagasi-logo.png';
  }catch(e){}
  var kpi=function(lbl,val){
    return '<div style="background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:10px;padding:7px 16px;text-align:center">'
      +'<div style="font-size:15px;font-weight:900;color:#fff;white-space:nowrap">'+val+'</div>'
      +'<div style="font-size:7.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:rgba(255,255,255,.85);margin-top:1px">'+lbl+'</div></div>';
  };
  var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte de Cobranza · PAGASI</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet">'
    +'<style>'
    +'@page{size:Letter landscape;margin:8mm} *{box-sizing:border-box} '
    +'body{font-family:Nunito,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0B0B1E;margin:0;font-size:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff} '
    +'.top{display:flex;justify-content:space-between;align-items:center;padding:2px 0 8px} '
    +'.top img{height:36px} '
    +'.top .t1{font-size:16px;font-weight:900;text-align:right} '
    +'.top .t2{font-size:9px;font-weight:700;color:#9794BB;text-align:right} '
    +'.banda{background:linear-gradient(135deg,#1E3A8A,#2563EB);border-radius:14px;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px} '
    +'.banda .bt1{font-size:13px;font-weight:900;color:#fff} .banda .bt2{font-size:9px;font-weight:700;color:rgba(255,255,255,.85);margin-top:1px} '
    +'.kpis{display:flex;gap:8px} '
    +'table{width:100%;border-collapse:separate;border-spacing:0} thead{display:table-header-group} tr{page-break-inside:avoid} '
    +'th{background:#1E3A8A;color:#fff;font-weight:800;font-size:8.2px;text-transform:uppercase;letter-spacing:.4px;padding:7px 8px;text-align:left;white-space:nowrap} '
    +'th.num{text-align:right} '
    +'th:first-child{border-radius:8px 0 0 0} th:last-child{border-radius:0 8px 0 0} '
    +'td{padding:6px 8px;border-bottom:1px solid #EEF0FA;vertical-align:middle} '
    +'tbody tr:nth-child(even){background:#F8F9FF} '
    +'.b{font-weight:800} .mut{color:#6B7194;font-weight:600} '
    +'.sub{font-size:7.8px;color:#9794BB;font-weight:700;margin-top:1px;white-space:nowrap} '
    +'.num{text-align:right;white-space:nowrap} '
    +'.dm{font-weight:900;color:#E8335A;font-size:11px;white-space:nowrap} .dm0{color:#00915D;font-weight:800} '
    +'.pill{display:inline-block;border-radius:20px;padding:2px 9px;font-size:8px;font-weight:800;white-space:nowrap} '
    +'.pie{margin-top:8px;font-size:8px;color:#9794BB;font-weight:700;display:flex;justify-content:space-between} '
    +'</style></head><body>'
    +'<div class="top">'
    +(logoUrl?'<img src="'+logoUrl+'" alt="Pagasi">':'<div style="font-size:20px;font-weight:900;color:#2563EB">Pagasi</div>')
    +'<div><div class="t1">Reporte de Cobranza</div><div class="t2">Generado el '+esc(hoyLocalISO())
      +((typeof _empCtr==='function' && _empCtr().nom) ? ' · '+esc(_empCtr().nom) : '')+'</div></div>'
    +'</div>'
    +'<div class="banda">'
    +'<div><div class="bt1">'+esc(alcLbl)+'</div><div class="bt2">'+esc(perLbl)+'</div></div>'
    +'<div class="kpis">'
    +kpi('Registros', n)
    +kpi('Monto vencido', fmt(totVenc))
    +kpi('Saldo pendiente', fmt(totSaldo))
    +kpi('Prom. días de mora', promDm+'d')
    +'</div></div>'
    +'<table><thead><tr>'
    +'<th style="width:16%">Cliente</th><th>Crédito</th><th style="width:12%">Concesionario</th><th style="width:11%">Modelo</th>'
    +'<th>Vence</th><th class="num">Días de mora</th><th class="num">Monto vencido</th><th class="num">Saldo pendiente</th>'
    +'<th style="width:15%">Estado</th><th>Cobrador</th>'
    +'</tr></thead><tbody>'
    +R.map(function(r){
      var pc=PILL[r.estado]||['#4A4870','#EEF0FA'];
      return '<tr>'
        +'<td><div class="b">'+esc(r.cli)+'</div>'+(r.tel?'<div class="sub">'+esc(r.tel)+'</div>':'')+'</td>'
        +'<td><div class="b" style="white-space:nowrap">'+esc(r.credId)+'</div><div class="sub">cuota '+esc(r.cuotaLbl)+'</div></td>'
        +'<td class="mut">'+esc(r.conc)+'</td>'
        +'<td class="mut">'+esc(r.modelo)+'</td>'
        +'<td class="mut" style="white-space:nowrap">'+esc(r.vence)+'</td>'
        +'<td class="num"><span class="'+(r.dm>0?'dm':'dm0')+'">'+(r.dm>0?r.dm+'d':'—')+'</span></td>'
        +'<td class="num">'+(r.nVenc>=1?'<div class="b" style="color:#E8335A">'+fmt(r.vencido)+'</div><div class="sub">'+r.nVenc+' cuota'+(r.nVenc!==1?'s':'')+' × '+fmt(r.cuotaMonto)+'</div>':'<div class="mut">—</div><div class="sub">próx. '+fmt(r.cuotaMonto)+'</div>')+'</td>'
        +'<td class="num b">'+(r.saldo==null?'—':fmt(r.saldo))+'</td>'
        +'<td><span class="pill" style="color:'+pc[0]+';background:'+pc[1]+'">'+esc(r.estado)+'</span>'
          +(r.nota?'<div class="sub">'+esc(r.nota)+'</div>':'')
          +(r.acuerdo?'<div class="sub">🗓️ '+esc(r.acuerdo)+'</div>':'')+'</td>'
        +'<td class="mut">'+esc(r.cobrador)+'</td>'
        +'</tr>';
    }).join('')
    +'</tbody></table>'
    +'<div class="pie"><span>PAGASI 18, C.A. — Sistema de Gestión de Crédito</span><span>'+n+' registro'+(n!==1?'s':'')+' · Documento de uso interno</span></div>'
    +'</body></html>';
  window._cobPdfUltimoHtml = html;   // tambien lo usan las pruebas
  var w=null;
  try{ w=window.open('','_blank','width=1150,height=780'); }catch(e){ w=null; }
  if(!w){ toast('El navegador bloqueó la ventana del PDF','error'); return false; }
  w.document.write(html); w.document.close();
  setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} },600);
  return true;
}


// ─── NOTAS DE COBRANZA (status del cliente en Cuotas Próximas) ───
var NOTA_COBRANZA = [
  {v:'',               t:'— Sin nota',            c:'#64748B', bg:'#F1F5F9'},
  {v:'revision',       t:'En revisión',           c:'#1D4ED8', bg:'#EFF6FF'},
  {v:'promesa',        t:'Promesa de pago',       c:'#A16207', bg:'#FEF9C3'},
  {v:'acuerdo',        t:'Acuerdo de pago',       c:'#7C3AED', bg:'#F3E8FF'},
  {v:'pago_verificar', t:'Pagó — verificar',      c:'#047857', bg:'#D1FAE5'},
  {v:'avisado',        t:'Avisado / recordado',   c:'#0369A1', bg:'#E0F2FE'},
  {v:'no_contesta',    t:'No contesta',           c:'#B45309', bg:'#FFEDD5'},
  {v:'reprogramado',   t:'Reprogramado',          c:'#0F766E', bg:'#CCFBF1'},
  {v:'gestion',        t:'En gestión de cobro',   c:'#BE185D', bg:'#FCE7F3'},
  {v:'ilocalizable',   t:'Ilocalizable',          c:'#991B1B', bg:'#FEE2E2'},
  {v:'problema',       t:'Cliente con problema',  c:'#991B1B', bg:'#FEE2E2'}
];
function _notaCobranzaOpt(v){
  for(var i=0;i<NOTA_COBRANZA.length;i++){ if(NOTA_COBRANZA[i].v===(v||'')) return NOTA_COBRANZA[i]; }
  return NOTA_COBRANZA[0];
}
function _cuotaNotaSelect(c){
  var cur = c.cobranzaStatus || '';
  var sel = _notaCobranzaOpt(cur);
  var opts = NOTA_COBRANZA.map(function(o){
    return '<option value="'+o.v+'"'+(o.v===cur?' selected':'')+'>'+o.t+'</option>';
  }).join('');
  return '<select onchange="setCuotaNota(\''+c.id+'\',this)" '
    + 'style="font-family:var(--f);font-size:10.5px;font-weight:700;border:1.5px solid '+sel.c+'40;'
    + 'background:'+sel.bg+';color:'+sel.c+';border-radius:8px;padding:5px 8px;cursor:pointer;'
    + 'max-width:160px;outline:none;-webkit-appearance:none;appearance:none">'
    + opts + '</select>';
}
window.setCuotaNota = function(credId, selEl){
  var val = selEl.value;
  var opt = _notaCobranzaOpt(val);
  // Recolorear el select en vivo
  selEl.style.background = opt.bg;
  selEl.style.color = opt.c;
  selEl.style.borderColor = opt.c + '40';
  // Actualizar en memoria
  var _prevNota = '';
  if(S && S.creds){
    for(var i=0;i<S.creds.length;i++){ if(S.creds[i].id===credId){ _prevNota = S.creds[i].cobranzaStatus||''; S.creds[i].cobranzaStatus = val; break; } }
  }
  // Persistir en Firestore
  if(typeof DB!=='undefined' && DB.updateCred){ DB.updateCred(credId, {cobranzaStatus: val}); }
  if(typeof logActividad==='function'){ logActividad('Nota de cobranza', 'pagos', credId, opt.t); }
  if(typeof toast==='function'){ toast('Nota: '+opt.t, 'success'); }
  // Entrar o salir de "Ilocalizable" cambia de pestana → re-render para que la
  // fila se mueva de una vez
  if((val==='ilocalizable' || _prevNota==='ilocalizable') && val!==_prevNota && S.page==='pagos'){
    if(val==='ilocalizable' && typeof toast==='function') toast('Movido a la pestaña 📵 Ilocalizables','info');
    if(typeof nav==='function') setTimeout(function(){ nav('pagos'); }, 350);
  }
};

// ─── GESTIÓN DE COBRO: resumen compacto por crédito (gestiones en el crédito) ───
function _gestionCobroCell(c){
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var btn = function(txt){ return '<button class="btn btn-g btn-xs" onclick="openNota(\''+c.id+'\')" title="Ver historial y registrar gestión" style="padding:3px 9px;white-space:nowrap">'+txt+'</button>'; };
  var list = (Array.isArray(c.gestiones) ? c.gestiones.slice() : []).sort(function(a,b){ return String(b.creadoEn||b.fecha||'').localeCompare(String(a.creadoEn||a.fecha||'')); });
  if(!list.length){ return '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:10.5px;color:var(--ink3)">Sin gestiones</span>'+btn('＋ Gestión')+'</div>'; }
  var empNames = Object.keys(list.reduce(function(o,n){ if(n.cobrador) o[n.cobrador]=1; return o; },{}));
  var nLlamadas = list.filter(function(n){ return /llamada/i.test(n.tipo||''); }).length;
  var u = list[0];
  var snippet = esc((u.resultado||'').trim()); if(snippet.length>34) snippet = snippet.slice(0,34)+'…';
  var when = esc(u.fecha||'')+(u.hora?' '+esc(u.hora):'');
  var full = esc((u.tipo?u.tipo+': ':'')+(u.resultado||'')+(u.proximaAccion?'  →  Próxima acción: '+u.proximaAccion:'')+(u.fechaCompromiso?'  ·  Compromiso: '+u.fechaCompromiso:''));
  var chips = empNames.slice(0,3).map(function(nm){
    var ini = nm.split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0];}).join('').toUpperCase()||'?';
    return '<span title="'+esc(nm)+'" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--gs);color:var(--p1);font-size:8.5px;font-weight:800;border:1.5px solid var(--surf);margin-left:-5px">'+ini+'</span>';
  }).join('');
  if(empNames.length>3) chips += '<span style="font-size:8.5px;color:var(--ink3);margin-left:3px">+'+(empNames.length-3)+'</span>';
  return '<div title="'+full+'" style="min-width:180px;max-width:240px;display:flex;flex-direction:column;gap:3px">'
    +'<div style="display:flex;align-items:center;gap:8px">'
      +'<div style="display:flex;padding-left:5px">'+chips+'</div>'
      +'<span style="font-size:10px;color:var(--ink2);font-weight:700;white-space:nowrap">'+list.length+' gest.'+(nLlamadas?' · '+nLlamadas+' llam.':'')+'</span>'
      +btn('Ver / ＋')
    +'</div>'
    +'<div style="font-size:10px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Últ: "'+snippet+'" · '+when+'</div>'
  +'</div>';
}
