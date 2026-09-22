// Pagasi logic: coromoto — Libro contable de la contadora.
// Replica del Excel "Sistema_Contable_PAGASI18_2026": Catalogo → Asientos →
// Mayor → Balance de Comprobacion → ESF → ER → Flujo → Indicadores → Dashboard.
// Motor de SOLO LECTURA sobre los datos de Firebase (creditos, pagos,
// movimientos, egresos). No modifica ninguna logica del app. Lo unico que
// escribe es su propia configuracion (config/coromoto): mapeos y asientos
// manuales de la contadora.
// Base en dolares; al imprimir se puede expresar en $, Bs a BCV, Bs a
// BCV-euro o a una tasa manual (conversion solo visual).

// ── Catalogo de cuentas (identico al de la contadora) ──
var CORO_CAT = [
  {c:'1113001',n:'Banco',nat:'D',g:'Activo corriente',k:'EFECTIVO'},
  {c:'1113002',n:'CAJA',nat:'D',g:'Activo corriente',k:'EFECTIVO'},
  {c:'1113003',n:'BANCO $ 1030594',nat:'D',g:'Activo corriente',k:'EFECTIVO'},
  {c:'1113004',n:'BANCOS$ 1030586',nat:'D',g:'Activo corriente',k:'EFECTIVO'},
  {c:'1113005',n:'BINANCE',nat:'D',g:'Activo corriente',k:'EFECTIVO'},
  {c:'1122001',n:'CUENTAS POR COBRAR CLIENTES',nat:'D',g:'Activo corriente',k:'CXC'},
  {c:'1129001',n:'CUENTA PUENTE LIQUIDACIÓN',nat:'D',g:'Activo corriente',k:'ANTICIPOS'},
  {c:'1211007',n:'EQUIPO DE OFICINA',nat:'D',g:'Activo no corriente',k:'PPE'},
  {c:'1211011',n:'MUEBLES Y ENSERES COSTO ORIGINAL',nat:'D',g:'Activo no corriente',k:'PPE'},
  {c:'1212007',n:'MAQUINARIAS Y EQUIPOS COSTO ORIGINAL',nat:'D',g:'Activo no corriente',k:'PPE'},
  {c:'2124001',n:'CUENTAS POR PAGAR SOCIOS',nat:'A',g:'Pasivo corriente',k:'CXP_SOCIOS'},
  {c:'3111001',n:'CAPITAL SOCIAL PAGADO',nat:'A',g:'Patrimonio',k:'CAPITAL'},
  {c:'5112001',n:'INGRESOS POR SERVICIOS',nat:'A',g:'Ingresos',k:'INGRESOS'},
  {c:'6121000',n:'COSTO POR SERVICIO',nat:'D',g:'Costo de servicios',k:'COSTOS'},
  {c:'7111006',n:'PUBLICIDAD',nat:'D',g:'Gastos de ventas',k:'GTO_VENTAS'},
  {c:'7111007',n:'SUSCRIPCIONES',nat:'D',g:'Gastos de ventas',k:'GTO_VENTAS'},
  {c:'7111010',n:'TRANSPORTE Y FLETES',nat:'D',g:'Gastos de ventas',k:'GTO_VENTAS'},
  {c:'7131001',n:'SUELDOS EMPLEADOS',nat:'D',g:'Gastos de personal',k:'GTO_PERSONAL'},
  {c:'7131005',n:'COMISION AL PERSONAL',nat:'D',g:'Gastos de personal',k:'GTO_PERSONAL'},
  {c:'7131006',n:'TRANSPORTE Y ALIMENTACION',nat:'D',g:'Gastos de personal',k:'GTO_PERSONAL'},
  {c:'7131008',n:'BENEFICIOS UNIFORMES',nat:'D',g:'Gastos de personal',k:'GTO_PERSONAL'},
  {c:'7131030',n:'VIATICOS Y GASTOS DE REPRESENTACION',nat:'D',g:'Gastos de personal',k:'GTO_PERSONAL'},
  {c:'7151001',n:'SUMINISTROS DE EQUIPOS DE OFICINA',nat:'D',g:'Gastos de administración',k:'GTO_ADMIN'},
  {c:'7151005',n:'ARTICULOS DE OFICINA',nat:'D',g:'Gastos de administración',k:'GTO_ADMIN'},
  {c:'7151013',n:'AGUA POTABLE Y REFRIGERIO',nat:'D',g:'Gastos de administración',k:'GTO_ADMIN'},
  {c:'7151016',n:'ASEO Y LIMPIEZA',nat:'D',g:'Gastos de administración',k:'GTO_ADMIN'},
  {c:'7151019',n:'VIATICOS DEDUCIBLES',nat:'D',g:'Gastos de administración',k:'GTO_ADMIN'},
  {c:'7151036',n:'GASTOS DE SISTEMAS',nat:'D',g:'Gastos de administración',k:'GTO_ADMIN'},
  {c:'7151039',n:'COMIDAS, VIAJES Y TRASLADOS',nat:'D',g:'Gastos de administración',k:'GTO_ADMIN'},
  {c:'7151046',n:'COMISIONES EMPLEADOS',nat:'D',g:'Gastos de administración',k:'GTO_ADMIN'},
  {c:'9111001',n:'COMISIONES BANCARIAS $',nat:'D',g:'Gastos financieros',k:'GTO_FIN'},
  {c:'9111002',n:'COMSIONES Y GASTOS BANCARIOS',nat:'D',g:'Gastos financieros',k:'GTO_FIN'},
  {c:'9212003',n:'GANANCIAS EN DIFERENCIAL CAMBIARIO',nat:'A',g:'Otros ingresos',k:'OTROS_ING'}
];
var CORO_CLAVES = 'EFECTIVO · CXC · ANTICIPOS · PPE · CXP_SOCIOS · CAPITAL · INGRESOS · OTROS_ING · COSTOS · GTO_VENTAS · GTO_PERSONAL · GTO_ADMIN · GTO_FIN';

// ── Configuracion propia (config/coromoto) ──
function _coroCfgBase(){
  return {
    mapCuentas:{},                 // { nombreCuentaApp: codigoContable }
    mapCategorias:{ inventario:'1129001', equipos:'6121000', operativo:'7151005', nomina:'7131001', otros:'7151039' },
    ajustes:[]                     // asientos manuales: {id, fecha, concepto, lineas:[{cod, debe, haber}]}
  };
}
function _coroCfg(){
  if(S.coromotoCfg && typeof S.coromotoCfg==='object' && S.coromotoCfg.mapCategorias) return S.coromotoCfg;
  return _coroCfgBase();
}
function _coroCargarCfg(){
  if(S.coromotoCfg!==undefined) return;
  S.coromotoCfg = null;
  if(typeof db==='undefined' || !db){ S.coromotoCfg=_coroCfgBase(); return; }
  db.collection('config').doc('coromoto').get().then(function(doc){
    var base=_coroCfgBase();
    if(doc.exists){
      var d=doc.data()||{};
      base.mapCuentas = d.mapCuentas || {};
      base.mapCategorias = Object.assign(base.mapCategorias, d.mapCategorias||{});
      base.ajustes = Array.isArray(d.ajustes)? d.ajustes : [];
    }
    S.coromotoCfg = base;
    if(S.page==='reportes' && S.reportesTab==='coromoto') nav('reportes');
  }).catch(function(){ S.coromotoCfg=_coroCfgBase(); });
}
function _coroGuardarCfg(){
  var cfg=_coroCfg();
  S.coromotoCfg = cfg;
  if(typeof db==='undefined' || !db) return Promise.resolve(false);
  return db.collection('config').doc('coromoto').set({
    mapCuentas: cfg.mapCuentas, mapCategorias: cfg.mapCategorias, ajustes: cfg.ajustes,
    actualizado: new Date().toISOString()
  }).catch(function(e){ if(typeof toast==='function') toast('No se pudo guardar la configuración de Coromoto','error'); });
}
function _coroPuedeEditar(){
  var rol=(S.currentUser&&S.currentUser.rol)||'';
  return rol==='Administrador'||rol==='admin'||rol==='Gerente';
}

// ── Mapeo de cuentas del app → codigos contables ──
function _coroNombresCuentasApp(){
  var set={}, out=[];
  (typeof _cuentasBanc!=='undefined' && _cuentasBanc ? _cuentasBanc : []).forEach(function(c){ if(c&&c.nombre&&!set[c.nombre]){set[c.nombre]=1;out.push(c.nombre);} });
  (S.movimientos||[]).forEach(function(m){
    [m.cuentaOrigen,m.cuentaDestino].forEach(function(n){ if(n&&!set[n]){set[n]=1;out.push(n);} });
  });
  return out;
}
function _coroMapaCuentas(){
  var cfg=_coroCfg(), mapa={}, usados={}, extras=[];
  var norm=function(x){ return String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); };
  var nombres=_coroNombresCuentasApp();
  nombres.forEach(function(nom){
    var cod=cfg.mapCuentas[nom];
    if(!cod){
      var nn=norm(nom);
      if(nn.indexOf('binance')>-1) cod='1113005';
      else if(nn.indexOf('1030594')>-1) cod='1113003';
      else if(nn.indexOf('1030586')>-1) cod='1113004';
      else if(nn.indexOf('efectivo')>-1||nn.indexOf('caja')>-1) cod='1113002';
      else if(nn.indexOf('100% banco')>-1||nn.indexOf('100 banco')>-1) cod='1113003';
      else if(nn.indexOf('pago movil')>-1||nn.indexOf('banco')>-1) cod='1113001';
    }
    if(cod && usados[cod] && usados[cod]!==nom) cod='';   // no compartir codigo entre dos cuentas distintas
    if(!cod){
      var num=1113006+extras.length;
      cod=String(num);
      extras.push({c:cod, n:nom.toUpperCase(), nat:'D', g:'Activo corriente', k:'EFECTIVO'});
    }
    usados[cod]=nom;
    mapa[nom]=cod;
  });
  return {mapa:mapa, extras:extras};
}
function _coroCatalogo(){
  var mc=_coroMapaCuentas();
  return CORO_CAT.concat(mc.extras);
}
function _coroCta(cod){
  var cat=_coroCatalogo();
  for(var i=0;i<cat.length;i++) if(cat[i].c===cod) return cat[i];
  return {c:cod,n:'(CUENTA '+cod+')',nat:'D',g:'—',k:'—'};
}

// ── Generacion del Libro Diario desde Firebase (montos en USD) ──
// Devuelve {lineas:[{f,doc,co,cod,debe,haber}...], avisos:{...}}
function _coroAsientos(){
  var cfg=_coroCfg();
  var mc=_coroMapaCuentas(), mapa=mc.mapa;
  var mapCta=function(nom){ return mapa[nom] || '1113001'; };
  var r2=function(x){ return Math.round((parseFloat(x)||0)*100)/100; };
  var L=[];
  var avisos={aportes:0, aportesMonto:0, retiros:0, retirosMonto:0, anulados:0, credsSinPlan:0, pagosSinMov:0, pagosSinMovMonto:0};

  // 1) Creditos otorgados — un asiento por mes (como el RESUMEN de la contadora).
  // Si el periodo NO empieza el dia 1, el mes del corte se parte en dos o tres tramos:
  // antes de 'desde', dentro, y despues de 'hasta'. Antes todo el mes iba a un solo
  // asiento fechado a fin de mes, asi que un corte a mitad de mes se llevaba el mes
  // entero de un lado: con un periodo que empieza el 15, el estado de resultados sumaba
  // tambien lo otorgado del 1 al 14 (punto 36, 22-sep-2026). Con meses completos no
  // cambia ni un numero: el asiento sigue siendo uno por mes.
  var pDesde=String(S.coroDesde||''), pHasta=String(S.coroHasta||'');
  var porMes={};
  (S.creds||[]).forEach(function(c){
    if(!c||c.eliminado) return;
    var est=String(c.estado||'');
    // Los cancelados son ventas que se anularon (duplicados, errores de carga): nunca
    // ocurrieron comercialmente, asi que no van al libro. El resto del app ya los
    // excluye; sin esto un solo credito anulado con datos malos deforma todo el ER.
    if(est==='pendiente_revision'||est==='rechazado'||est==='rechazada'||est==='cancelado') return;
    var total=r2(c.total), fin=r2(c.fin);
    if(!(total>0)){ avisos.credsSinPlan++; return; }
    if(!(fin>0)) fin=total;
    var fch=String(c.fecha||'').slice(0,10);
    var mes=fch.slice(0,7);
    if(!mes) return;
    // 'a' = antes del periodo, 'd' = dentro, 'z' = despues
    var tramo = (pDesde && fch < pDesde) ? 'a' : ((pHasta && fch > pHasta) ? 'z' : 'd');
    var clave = mes+'|'+tramo;
    if(!porMes[clave]) porMes[clave]={total:0,fin:0,carga:0,mes:mes,tramo:tramo};
    porMes[clave].total+=total; porMes[clave].fin+=fin; porMes[clave].carga+=Math.max(0,total-fin);
  });
  Object.keys(porMes).forEach(function(clave){
    var g=porMes[clave], mes=g.mes;
    // ultimo dia real del mes; para el mes en curso, hoy (nunca fechas futuras)
    var pp=mes.split('-'); var ult=new Date(parseInt(pp[0],10), parseInt(pp[1],10), 0).getDate();
    var f=mes+'-'+String(ult).padStart(2,'0');
    var hoy=hoyLocalISO();
    if(f>hoy && mes===hoy.slice(0,7)) f=hoy;
    // Cada tramo se fecha de su propio lado del corte, o el asiento caeria en el
    // periodo equivocado: el de 'antes' como mucho el dia anterior a 'desde', y el
    // de 'dentro' como mucho el dia de 'hasta'.
    if(g.tramo==='a' && pDesde){
      var _ant=new Date(pDesde+'T12:00:00'); _ant.setDate(_ant.getDate()-1);
      var _antISO=_ant.getFullYear()+'-'+String(_ant.getMonth()+1).padStart(2,'0')+'-'+String(_ant.getDate()).padStart(2,'0');
      if(f>_antISO) f=_antISO;
    } else if(g.tramo==='d' && pHasta && f>pHasta){ f=pHasta; }
    else if(g.tramo==='z' && pHasta){ var _dia1=mes+'-01'; if(f<_dia1) f=_dia1; }
    var doc='CRED/'+mes.replace('-','/');
    L.push({f:f,doc:doc,co:'PRÉSTAMOS OTORGADOS',cod:'1122001',debe:r2(g.total),haber:0});
    L.push({f:f,doc:doc,co:'PRÉSTAMOS OTORGADOS',cod:'1129001',debe:0,haber:r2(g.fin)});
    if(g.carga>0.005) L.push({f:f,doc:doc,co:'PRÉSTAMOS OTORGADOS',cod:'5112001',debe:0,haber:r2(g.carga)});
  });

  // 2) Movimientos de cuentas (la caja del app)
  var esInicial=function(m){
    if(typeof esMovimientoInicialCredito==='function') return esMovimientoInicialCredito(m);
    return m.tipoOperacion==='inicial_credito' || String(m.concepto||'').indexOf('Inicial · ')===0;
  };
  var cobros={}, inis={};
  (S.movimientos||[]).forEach(function(m){
    if(!m||m.eliminado) return;
    var con=String(m.concepto||''), id=String(m.id||''), rev=String(m.reversoDe||'');
    // La pata de caja de los egresos sale de los registros de egreso (traen categoria)
    if(con.indexOf('Egreso · ')===0) return;
    // Pares reverso: netean a cero con su original, se omiten ambos
    if(id.indexOf('MOV-REV-EG-')===0 || rev.indexOf('egreso:')===0 || rev.indexOf('compra_moto:')===0 || rev.indexOf('comision:')===0) return;
    if(con.indexOf('Reverso egreso eliminado')===0 || con.indexOf('Reverso compra de moto eliminada')===0) return;
    var monto=r2(m.monto); if(!(monto>0)) return;
    var f=String(m.fecha||'').slice(0,10); if(!f) return;
    if(m.tipo==='transferencia'){
      var doc='TRANSF/'+f.slice(0,7).replace('-','/');
      L.push({f:f,doc:doc,co:'TRANSFERENCIA · '+(con||(String(m.cuentaOrigen||'')+' → '+String(m.cuentaDestino||''))),cod:mapCta(m.cuentaDestino),debe:monto,haber:0});
      L.push({f:f,doc:doc,co:'TRANSFERENCIA · '+(con||(String(m.cuentaOrigen||'')+' → '+String(m.cuentaDestino||''))),cod:mapCta(m.cuentaOrigen),debe:0,haber:monto});
      return;
    }
    if(esInicial(m)){
      var kI=f+'|'+String(m.cuentaDestino||'');
      if(!inis[kI]) inis[kI]={f:f,cta:String(m.cuentaDestino||''),monto:0};
      inis[kI].monto+=monto;
      return;
    }
    var esCobro = !!m.conceptoPago || !!m.creditoId || !!m.conceptoCredito
      || con.indexOf('Pago cuota · ')===0 || con.indexOf('Liquidación anticipada · ')===0 || con.indexOf('Abono')===0;
    if(m.tipo==='deposito' && esCobro){
      var kC=f+'|'+String(m.cuentaDestino||'');
      if(!cobros[kC]) cobros[kC]={f:f,cta:String(m.cuentaDestino||''),monto:0};
      cobros[kC].monto+=monto;
      return;
    }
    if(m.tipo==='deposito'){
      avisos.aportes++; avisos.aportesMonto+=monto;
      var docA='MISC/'+f.slice(0,7).replace('-','/');
      L.push({f:f,doc:docA,co:'DEPÓSITO · '+(con||'Sin concepto'),cod:mapCta(m.cuentaDestino),debe:monto,haber:0});
      L.push({f:f,doc:docA,co:'DEPÓSITO · '+(con||'Sin concepto'),cod:'2124001',debe:0,haber:monto});
      return;
    }
    // retiro sin clasificar
    avisos.retiros++; avisos.retirosMonto+=monto;
    var docR='MISC/'+f.slice(0,7).replace('-','/');
    L.push({f:f,doc:docR,co:'RETIRO · '+(con||'Sin concepto'),cod:'2124001',debe:monto,haber:0});
    L.push({f:f,doc:docR,co:'RETIRO · '+(con||'Sin concepto'),cod:mapCta(m.cuentaOrigen),debe:0,haber:monto});
  });
  Object.keys(cobros).forEach(function(k){
    var g=cobros[k], m=r2(g.monto), doc='COBRO/'+g.f.replace(/-/g,'/');
    L.push({f:g.f,doc:doc,co:'REG. COBRO CUOTAS',cod:mapCta(g.cta),debe:m,haber:0});
    L.push({f:g.f,doc:doc,co:'REG. COBRO CUOTAS',cod:'1122001',debe:0,haber:m});
  });
  Object.keys(inis).forEach(function(k){
    var g=inis[k], m=r2(g.monto), doc='INICIAL/'+g.f.replace(/-/g,'/');
    L.push({f:g.f,doc:doc,co:'REG. COBRO INICIALES',cod:mapCta(g.cta),debe:m,haber:0});
    L.push({f:g.f,doc:doc,co:'REG. COBRO INICIALES',cod:'1129001',debe:0,haber:m});
  });

  // 3) Egresos (cada uno con su categoria)
  (S.egresos||[]).forEach(function(e){
    if(!e) return;
    var monto=r2(e.monto); if(!(monto>0)) return;
    var f=String(e.fecha||'').slice(0,10); if(!f) return;
    var doc='EGRESO/'+f.slice(0,7).replace('-','/')+'/'+String(e.id);
    if(e.eliminado){
      // anulado sin regresar el dinero: la plata salio igual → CxP Socios (revisable)
      if(e.eliminacionReversaCuenta===false){
        avisos.anulados++;
        L.push({f:f,doc:doc,co:'EGRESO ANULADO SIN REVERSO · '+String(e.concepto||''),cod:'2124001',debe:monto,haber:0});
        L.push({f:f,doc:doc,co:'EGRESO ANULADO SIN REVERSO · '+String(e.concepto||''),cod:mapCta(e.forma),debe:0,haber:monto});
      }
      return;
    }
    var codG=cfg.mapCategorias[e.categoria]|| '7151039';
    L.push({f:f,doc:doc,co:String(e.concepto||'Egreso'),cod:codG,debe:monto,haber:0});
    L.push({f:f,doc:doc,co:String(e.concepto||'Egreso'),cod:mapCta(e.forma),debe:0,haber:monto});
  });

  // 4) Asientos manuales de la contadora
  (cfg.ajustes||[]).forEach(function(a){
    (a.lineas||[]).forEach(function(ln){
      L.push({f:String(a.fecha||'').slice(0,10),doc:'AJUSTE/'+String(a.id||''),co:String(a.concepto||'Ajuste manual'),cod:String(ln.cod),debe:r2(ln.debe),haber:r2(ln.haber),manual:true});
    });
  });

  // Conciliacion pagos ↔ movimientos (aviso, no asiento)
  var movPagoIds={}, sumMovCobro=0;
  (S.movimientos||[]).forEach(function(m){
    if(m&&!m.eliminado&&m.conceptoPago) movPagoIds[m.conceptoPago]=1;
  });
  (S.pagos||[]).forEach(function(p){
    if(!p||p.eliminado||p.estado!=='confirmado') return;
    if(p.esInicial||p.tipoOperacion==='inicial_credito') return;
    if(!movPagoIds[p.id]){
      var con='Pago cuota · '+(p.cli||'')+' · '+(p.cred||'');
      var tiene=(S.movimientos||[]).some(function(m){return m&&!m.eliminado&&String(m.concepto||'')===con&&r2(m.monto)===r2(p.monto)&&String(m.fecha||'').slice(0,10)===String(p.fecha||'').slice(0,10);});
      if(!tiene){ avisos.pagosSinMov++; avisos.pagosSinMovMonto+=r2(p.monto); }
    }
  });

  L.sort(function(a,b){ return a.f===b.f ? String(a.doc).localeCompare(String(b.doc)) : String(a.f).localeCompare(String(b.f)); });
  return {lineas:L, avisos:avisos};
}

// ── Sumas por cuenta y por clasificacion ──
function _coroSums(lineas, desde, hasta){
  var m={};
  lineas.forEach(function(l){
    if(desde && l.f<desde) return;
    if(hasta && l.f>hasta) return;
    if(!m[l.cod]) m[l.cod]={D:0,H:0};
    m[l.cod].D+=l.debe; m[l.cod].H+=l.haber;
  });
  return m;
}
// Suma "Saldo (D−H)" de todas las cuentas de una clave (igual que SUMIFS del Excel)
function _coroClave(sums, clave){
  var s=0;
  _coroCatalogo().forEach(function(ct){
    if(ct.k===clave && sums[ct.c]) s+=sums[ct.c].D-sums[ct.c].H;
  });
  return s;
}

// ── Estados financieros (misma aritmetica del Excel) ──
function _coroESF(sums, sumsAntes){
  var K=function(k){ return _coroClave(sums,k); };
  var efectivo=K('EFECTIVO'), cxc=K('CXC'), anticipos=K('ANTICIPOS'), ppe=K('PPE');
  var actCorr=efectivo+cxc+anticipos, actNo=ppe, activo=actCorr+actNo;
  var cxp=-K('CXP_SOCIOS'), pasivo=cxp;
  var capital=-K('CAPITAL');
  var resultado=-(K('INGRESOS')+K('OTROS_ING')+K('COSTOS')+K('GTO_VENTAS')+K('GTO_PERSONAL')+K('GTO_ADMIN')+K('GTO_FIN'));
  var resultAntes=0;
  if(sumsAntes){
    var KA=function(k){ return _coroClave(sumsAntes,k); };
    resultAntes=-(KA('INGRESOS')+KA('OTROS_ING')+KA('COSTOS')+KA('GTO_VENTAS')+KA('GTO_PERSONAL')+KA('GTO_ADMIN')+KA('GTO_FIN'));
  }
  var resEjercicio=resultado-resultAntes;
  var patrimonio=capital+resultAntes+resEjercicio;
  return {efectivo:efectivo,cxc:cxc,anticipos:anticipos,actCorr:actCorr,ppe:ppe,actNo:actNo,activo:activo,
    cxp:cxp,pasivoCorr:cxp,pasivo:pasivo,capital:capital,resultAntes:resultAntes,resEjercicio:resEjercicio,
    patrimonio:patrimonio,pasivoPat:pasivo+patrimonio,cuadre:activo-(pasivo+patrimonio)};
}
function _coroER(sumsPer){
  var K=function(k){ return _coroClave(sumsPer,k); };
  var ing=-K('INGRESOS'), costo=-K('COSTOS');
  var bruta=ing+costo;
  var gv=-K('GTO_VENTAS'), gp=-K('GTO_PERSONAL'), ga=-K('GTO_ADMIN');
  var gop=gv+gp+ga, oper=bruta+gop;
  var otros=-K('OTROS_ING'), fin=-K('GTO_FIN');
  return {ing:ing,costo:costo,bruta:bruta,gv:gv,gp:gp,ga:ga,gop:gop,oper:oper,otros:otros,fin:fin,neta:oper+otros+fin};
}
function _coroFlujo(sumsPer, sumsAntes){
  var K=function(k){ return _coroClave(sumsPer,k); };
  var er=_coroER(sumsPer);
  var dCxc=-K('CXC'), dAnt=-K('ANTICIPOS');
  var op=er.neta+dCxc+dAnt;
  var inv=-K('PPE');
  var cap=-K('CAPITAL'), socios=-K('CXP_SOCIOS');
  var finTot=cap+socios;
  var efIni=sumsAntes? _coroClave(sumsAntes,'EFECTIVO') : 0;
  var varNeta=op+inv+finTot;
  return {neta:er.neta,dCxc:dCxc,dAnt:dAnt,op:op,inv:inv,cap:cap,socios:socios,fin:finTot,varNeta:varNeta,efIni:efIni,efCierre:varNeta+efIni};
}
function _coroDias(desde,hasta,lineas){
  var min=desde;
  if(!min){ lineas.forEach(function(l){ if(l.f && (!min||l.f<min)) min=l.f; }); }
  if(!min||!hasta) return 0;
  var d1=new Date(min+'T12:00:00'), d2=new Date(hasta+'T12:00:00');
  return Math.max(1, Math.round((d2-d1)/86400000));
}

// ── Formato ──
function _coroF(n){ return (parseFloat(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _coroPct(x){ return ((parseFloat(x)||0)*100).toLocaleString('es-VE',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'; }
function _coroX(x){ return (parseFloat(x)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+'x'; }
function _coroFch(f){ if(!f) return '—'; var p=String(f).slice(0,10).split('-'); return p.length===3? p[2]+'/'+p[1]+'/'+p[0] : f; }
function _coroFchLarga(f){
  if(!f) return '—';
  var meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var p=String(f).slice(0,10).split('-');
  return parseInt(p[2],10)+' de '+meses[parseInt(p[1],10)-1]+' de '+p[0];
}

// ── Estado de la vista ──
function coroTab(t){ S.coroTab=t; S.reportesTab='coromoto'; nav('reportes'); }
function coroPeriodo(){
  var d=document.getElementById('coro-desde'), h=document.getElementById('coro-hasta');
  S.coroDesde=(d&&d.value)||'';
  S.coroHasta=(h&&h.value)||'';
  S.reportesTab='coromoto'; nav('reportes');
}
function coroMayorSel(cod){ S.coroMayorCod=cod; S.coroTab='mayor'; S.reportesTab='coromoto'; nav('reportes'); }

// Contexto de calculo compartido por todas las vistas
function _coroCtx(){
  var A=_coroAsientos();
  var hasta=S.coroHasta||hoyLocalISO();
  var desde=S.coroDesde||'';
  var sums=_coroSums(A.lineas,null,hasta);                 // acumulado al cierre (ESF, BalComp, Mayor)
  var sumsPer=desde? _coroSums(A.lineas,desde,hasta):sums; // periodo (ER, Flujo, Indicadores)
  var antes=desde? _coroSums(A.lineas,null,_coroDiaAntes(desde)):null;
  var min=''; A.lineas.forEach(function(l){ if(l.f&&(!min||l.f<min)) min=l.f; });
  return {A:A,lineas:A.lineas,avisos:A.avisos,desde:desde,hasta:hasta,inicio:desde||min||hasta,
    sums:sums,sumsPer:sumsPer,antes:antes,
    esf:_coroESF(sums,antes),er:_coroER(sumsPer),flujo:_coroFlujo(sumsPer,antes),
    dias:_coroDias(desde,hasta,A.lineas)};
}
function _coroDiaAntes(iso){
  var d=new Date(iso+'T12:00:00'); d.setDate(d.getDate()-1);
  return (typeof fechaLocalISO==='function')? fechaLocalISO(d) : d.toISOString().slice(0,10);
}

// ══════════════════════════════════════════════════════════════
// TABLAS HTML — mismas estructuras del Excel. M = formateador de
// moneda (en pantalla dolares; al imprimir la moneda elegida).
// ══════════════════════════════════════════════════════════════
function _coroTblCss(){
  return 'width:100%;border-collapse:collapse;font-size:12px';
}
function _coroTh(txt,align){ return '<th style="text-align:'+(align||'left')+';padding:7px 9px;border-bottom:2px solid var(--rim);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink3);white-space:nowrap">'+txt+'</th>'; }
function _coroTd(txt,align,extra){ return '<td style="text-align:'+(align||'left')+';padding:6px 9px;border-bottom:1px solid var(--rim);'+(align==='right'?'white-space:nowrap;':'')+(extra||'')+'">'+txt+'</td>'; }
function _coroChk(ok, siMsg, noMsg){
  return '<span style="font-weight:800;color:'+(ok?'var(--green)':'var(--red)')+'">'+(ok?'✔ '+siMsg:'⚠ '+noMsg)+'</span>';
}

// ── DIARIO ──
function _coroHtmlDiario(ctx, M){
  var L=ctx.lineas.filter(function(l){ return (!ctx.desde||l.f>=ctx.desde)&&l.f<=ctx.hasta; });
  var tD=0,tH=0; L.forEach(function(l){tD+=l.debe;tH+=l.haber;});
  var dif=tD-tH;
  var rows=L.map(function(l,i){
    var ct=_coroCta(l.cod);
    return '<tr'+(l.manual?' style="background:rgba(37,99,235,.05)"':'')+'>'
      +_coroTd(String(i+1),'right')
      +_coroTd(_coroFch(l.f))
      +_coroTd('<span style="font-size:11px;color:var(--ink3)">'+l.doc+'</span>')
      +_coroTd(l.co)
      +_coroTd(l.cod)
      +_coroTd(ct.n)
      +_coroTd(l.debe? M(l.debe):'','right')
      +_coroTd(l.haber? M(l.haber):'','right')
      +'</tr>';
  }).join('');
  return '<div style="display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-bottom:12px">'
    +'<div class="stat"><div class="st-v" style="font-size:16px">'+M(tD)+'</div><div class="st-l">Total Debe</div></div>'
    +'<div class="stat"><div class="st-v" style="font-size:16px">'+M(tH)+'</div><div class="st-l">Total Haber</div></div>'
    +'<div class="stat"><div class="st-v" style="font-size:16px;color:'+(Math.abs(dif)<0.01?'var(--green)':'var(--red)')+'">'+M(dif)+'</div><div class="st-l">Diferencia</div></div>'
    +'<div class="stat"><div class="st-v" style="font-size:16px">'+L.length+'</div><div class="st-l">Líneas registradas</div></div>'
    +'</div>'
    +'<div style="margin-bottom:10px">'+_coroChk(Math.abs(dif)<0.01,'El diario está cuadrado','El diario NO cuadra — revisar')+'</div>'
    +'<div style="overflow-x:auto;max-height:560px;overflow-y:auto;border:1px solid var(--rim);border-radius:10px"><table style="'+_coroTblCss()+'"><thead><tr style="position:sticky;top:0;background:var(--surf)">'
    +_coroTh('N°','right')+_coroTh('Fecha')+_coroTh('Documento')+_coroTh('Concepto')+_coroTh('Código')+_coroTh('Nombre de la cuenta')+_coroTh('Debe','right')+_coroTh('Haber','right')
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

// ── MAYOR ──
function _coroHtmlMayor(ctx, M, codSel, esPrint){
  var cat=_coroCatalogo();
  var cod=codSel||S.coroMayorCod||'1113005';
  var ct=_coroCta(cod);
  var sign=ct.nat==='A'? -1:1;
  var L=ctx.lineas.filter(function(l){ return l.cod===cod && l.f<=ctx.hasta; });
  var saldo=0;
  var rows=L.map(function(l,i){
    saldo+=(l.debe-l.haber)*sign;
    return '<tr>'+_coroTd(String(i+1),'right')+_coroTd(_coroFch(l.f))
      +_coroTd('<span style="font-size:11px;color:var(--ink3)">'+l.doc+'</span>')+_coroTd(l.co)
      +_coroTd(l.debe? M(l.debe):'','right')+_coroTd(l.haber? M(l.haber):'','right')
      +_coroTd(M(saldo),'right','font-weight:700')+'</tr>';
  }).join('');
  var selector=esPrint? '' : '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">'
    +'<label style="font-size:12px;font-weight:700">Cuenta:</label>'
    +'<select class="fs" style="max-width:380px" onchange="coroMayorSel(this.value)">'
    +cat.map(function(x){ return '<option value="'+x.c+'"'+(x.c===cod?' selected':'')+'>'+x.c+' — '+x.n+'</option>'; }).join('')
    +'</select>'
    +'<span style="font-size:12px;color:var(--ink3)">Naturaleza: '+(ct.nat==='A'?'Acreedora':'Deudora')+'</span>'
    +'</div>';
  return selector
    +(esPrint? '<div style="font-weight:800;margin-bottom:6px">'+ct.c+' — '+ct.n+' · Naturaleza: '+(ct.nat==='A'?'Acreedora':'Deudora')+'</div>':'')
    +'<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table style="'+_coroTblCss()+'"><thead><tr>'
    +_coroTh('N°','right')+_coroTh('Fecha')+_coroTh('Documento')+_coroTh('Concepto')+_coroTh('Debe','right')+_coroTh('Haber','right')+_coroTh('Saldo','right')
    +'</tr></thead><tbody>'+(rows||'<tr>'+_coroTd('Sin movimientos en el período','left','color:var(--ink3)')+'</tr>')+'</tbody></table></div>';
}

// ── BALANCE DE COMPROBACION ──
function _coroHtmlBalComp(ctx, M){
  var cat=_coroCatalogo();
  var tD=0,tH=0;
  var rows=cat.map(function(ct){
    var s=ctx.sums[ct.c]||{D:0,H:0};
    if(!s.D&&!s.H) return '';
    tD+=s.D; tH+=s.H;
    var saldo=s.D-s.H;
    var nat=saldo*(ct.nat==='A'?-1:1);
    return '<tr>'+_coroTd(ct.c)+_coroTd(ct.n)+_coroTd(ct.g)+_coroTd(ct.k)
      +_coroTd(M(s.D),'right')+_coroTd(M(s.H),'right')
      +_coroTd(M(saldo),'right','font-weight:700')+_coroTd(M(nat),'right')+'</tr>';
  }).join('');
  return '<div style="font-size:12px;color:var(--ink3);margin-bottom:10px">Calculado con sumas sobre el Libro Diario · '+_coroChk(Math.abs(tD-tH)<0.01,'Cuadrado','Descuadrado')+'</div>'
    +'<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table style="'+_coroTblCss()+'"><thead><tr>'
    +_coroTh('Código')+_coroTh('Nombre de la cuenta')+_coroTh('Grupo del Estado Financiero')+_coroTh('Clasificación')
    +_coroTh('Debe','right')+_coroTh('Haber','right')+_coroTh('Saldo (D−H)','right')+_coroTh('Saldo por naturaleza','right')
    +'</tr></thead><tbody>'+rows
    +'<tr style="font-weight:800;background:var(--surf2)">'+_coroTd('','left')+_coroTd('TOTALES')+_coroTd('')+_coroTd('')
    +_coroTd(M(tD),'right')+_coroTd(M(tH),'right')+_coroTd(M(tD-tH),'right')+_coroTd('','right')+'</tr>'
    +'</tbody></table></div>';
}

// ── ESF ──
function _coroHtmlESF(ctx, M){
  var e=ctx.esf;
  var pct=function(x){ return e.activo? _coroPct(x/e.activo):'—'; };
  var fila=function(lbl,val,bold,indent){
    return '<tr'+(bold?' style="font-weight:800;background:var(--surf2)"':'')+'>'
      +_coroTd((indent?'&nbsp;&nbsp;&nbsp;':'')+lbl)+_coroTd(M(val),'right')+_coroTd(pct(val),'right')+'</tr>';
  };
  var extra=e.resultAntes? fila('Resultados acumulados períodos anteriores',e.resultAntes,false,true):'';
  return '<div style="font-size:12px;color:var(--ink3);margin-bottom:10px">Al '+_coroFchLarga(ctx.hasta)+'</div>'
    +'<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table style="'+_coroTblCss()+'"><thead><tr>'
    +_coroTh('ACTIVO')+_coroTh('Monto','right')+_coroTh('% del activo','right')+'</tr></thead><tbody>'
    +'<tr style="font-weight:700"><td colspan="3" style="padding:7px 9px;border-bottom:1px solid var(--rim)">Activo corriente</td></tr>'
    +fila('Efectivo y equivalentes de efectivo',e.efectivo,false,true)
    +fila('Cuentas por cobrar clientes',e.cxc,false,true)
    +fila('Cuenta puente liquidación (anticipos)',e.anticipos,false,true)
    +fila('Total activo corriente',e.actCorr,true)
    +'<tr style="font-weight:700"><td colspan="3" style="padding:7px 9px;border-bottom:1px solid var(--rim)">Activo no corriente</td></tr>'
    +fila('Propiedad, planta y equipo',e.ppe,false,true)
    +fila('Total activo no corriente',e.actNo,true)
    +fila('TOTAL ACTIVO',e.activo,true)
    +'<tr><td colspan="3" style="padding:4px"></td></tr>'
    +'<tr style="font-weight:800"><td colspan="3" style="padding:7px 9px;border-bottom:2px solid var(--rim)">PASIVO Y PATRIMONIO</td></tr>'
    +'<tr style="font-weight:700"><td colspan="3" style="padding:7px 9px;border-bottom:1px solid var(--rim)">Pasivo corriente</td></tr>'
    +fila('Cuentas por pagar socios',e.cxp,false,true)
    +fila('Total pasivo corriente',e.pasivoCorr,true)
    +fila('Pasivo no corriente',0)
    +fila('TOTAL PASIVO',e.pasivo,true)
    +'<tr style="font-weight:700"><td colspan="3" style="padding:7px 9px;border-bottom:1px solid var(--rim)">Patrimonio</td></tr>'
    +fila('Capital social pagado',e.capital,false,true)
    +extra
    +fila('Resultado del ejercicio',e.resEjercicio,false,true)
    +fila('TOTAL PATRIMONIO',e.patrimonio,true)
    +fila('TOTAL PASIVO Y PATRIMONIO',e.pasivoPat,true)
    +'</tbody></table></div>'
    +'<div style="margin-top:10px;font-size:12px">Prueba de cuadre (Activo − Pasivo − Patrimonio): <strong>'+M(e.cuadre)+'</strong> · '
    +_coroChk(Math.abs(e.cuadre)<0.01,'El estado cuadra correctamente','Revisar: existe una diferencia')+'</div>';
}

// ── ER ──
function _coroHtmlER(ctx, M){
  var r=ctx.er;
  var pct=function(x){ return r.ing? _coroPct(x/r.ing):'—'; };
  var fila=function(lbl,val,bold,indent){
    return '<tr'+(bold?' style="font-weight:800;background:var(--surf2)"':'')+'>'
      +_coroTd((indent?'&nbsp;&nbsp;&nbsp;':'')+lbl)+_coroTd(M(val),'right')+_coroTd(pct(val),'right')+'</tr>';
  };
  return '<div style="font-size:12px;color:var(--ink3);margin-bottom:10px">Del '+_coroFchLarga(ctx.inicio)+' al '+_coroFchLarga(ctx.hasta)+' · Los gastos se presentan en negativo</div>'
    +'<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table style="'+_coroTblCss()+'"><thead><tr>'
    +_coroTh('CONCEPTO')+_coroTh('Monto','right')+_coroTh('% ingresos','right')+'</tr></thead><tbody>'
    +fila('Ingresos por servicios',r.ing)
    +fila('Costo por servicio',r.costo,false,true)
    +fila('UTILIDAD BRUTA',r.bruta,true)
    +'<tr style="font-weight:700"><td colspan="3" style="padding:7px 9px;border-bottom:1px solid var(--rim)">Gastos operativos</td></tr>'
    +fila('Gastos de ventas y publicidad',r.gv,false,true)
    +fila('Gastos de personal',r.gp,false,true)
    +fila('Gastos de administración',r.ga,false,true)
    +fila('Total gastos operativos',r.gop,true)
    +fila('UTILIDAD EN OPERACIONES',r.oper,true)
    +'<tr style="font-weight:700"><td colspan="3" style="padding:7px 9px;border-bottom:1px solid var(--rim)">Otros ingresos y egresos</td></tr>'
    +fila('Ganancia en diferencial cambiario',r.otros,false,true)
    +fila('Comisiones y gastos bancarios',r.fin,false,true)
    +fila('UTILIDAD NETA DEL PERÍODO',r.neta,true)
    +'</tbody></table></div>';
}

// ── FLUJO ──
function _coroHtmlFlujo(ctx, M){
  var f=ctx.flujo;
  var fila=function(lbl,val,bold,indent){
    return '<tr'+(bold?' style="font-weight:800;background:var(--surf2)"':'')+'>'
      +_coroTd((indent?'&nbsp;&nbsp;&nbsp;':'')+lbl)+_coroTd(M(val),'right')+'</tr>';
  };
  var dif=f.efCierre-ctx.esf.efectivo;
  return '<div style="font-size:12px;color:var(--ink3);margin-bottom:10px">Método indirecto · Del '+_coroFchLarga(ctx.inicio)+' al '+_coroFchLarga(ctx.hasta)+'</div>'
    +'<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table style="'+_coroTblCss()+'"><thead><tr>'
    +_coroTh('CONCEPTO')+_coroTh('Monto','right')+'</tr></thead><tbody>'
    +'<tr style="font-weight:700"><td colspan="2" style="padding:7px 9px;border-bottom:1px solid var(--rim)">ACTIVIDADES DE OPERACIÓN</td></tr>'
    +fila('Utilidad neta del período',f.neta,false,true)
    +fila('(Aumento) disminución de cuentas por cobrar clientes',f.dCxc,false,true)
    +fila('(Aumento) disminución de cuenta puente / anticipos',f.dAnt,false,true)
    +fila('Flujo neto de actividades de operación',f.op,true)
    +'<tr style="font-weight:700"><td colspan="2" style="padding:7px 9px;border-bottom:1px solid var(--rim)">ACTIVIDADES DE INVERSIÓN</td></tr>'
    +fila('Adquisición de propiedad, planta y equipo',f.inv,false,true)
    +fila('Flujo neto de actividades de inversión',f.inv,true)
    +'<tr style="font-weight:700"><td colspan="2" style="padding:7px 9px;border-bottom:1px solid var(--rim)">ACTIVIDADES DE FINANCIAMIENTO</td></tr>'
    +fila('Aporte de capital social',f.cap,false,true)
    +fila('Aumento de cuentas por pagar socios',f.socios,false,true)
    +fila('Flujo neto de actividades de financiamiento',f.fin,true)
    +fila('VARIACIÓN NETA DEL EFECTIVO',f.varNeta,true)
    +fila('Efectivo al inicio del período',f.efIni)
    +fila('EFECTIVO AL CIERRE DEL PERÍODO',f.efCierre,true)
    +'</tbody></table></div>'
    +'<div style="margin-top:10px;font-size:12px">Prueba: efectivo del ESF '+M(ctx.esf.efectivo)+' · Diferencia: <strong>'+M(dif)+'</strong> · '
    +_coroChk(Math.abs(dif)<0.01,'El flujo concilia con el balance','Revisar: existe una diferencia')+'</div>';
}

// ── INDICADORES ──
function _coroHtmlInd(ctx, M){
  var e=ctx.esf, r=ctx.er, f=ctx.flujo;
  var dv=function(a,b){ return b? a/b:0; };
  var IND=[
    {sec:'LIQUIDEZ'},
    {n:'Razón corriente',f:'Activo corriente / Pasivo corriente',v:dv(e.actCorr,e.pasivoCorr),fmt:'x',ref:'≥ 1,50x',ok:function(v){return v>=1.5;}},
    {n:'Prueba ácida (excluye anticipos)',f:'(Act. corriente − anticipos) / Pasivo corriente',v:dv(e.actCorr-e.anticipos,e.pasivoCorr),fmt:'x',ref:'≥ 1,00x',ok:function(v){return v>=1;}},
    {n:'Razón de efectivo',f:'Efectivo / Pasivo corriente',v:dv(e.efectivo,e.pasivoCorr),fmt:'x',ref:'≥ 0,30x',ok:function(v){return v>=0.3;}},
    {n:'Capital de trabajo',f:'Activo corriente − Pasivo corriente',v:e.actCorr-e.pasivoCorr,fmt:'$',ref:'> 0',ok:function(v){return v>=0;}},
    {sec:'SOLVENCIA Y ENDEUDAMIENTO'},
    {n:'Solvencia total',f:'Activo total / Pasivo total',v:dv(e.activo,e.pasivo),fmt:'x',ref:'≥ 1,50x',ok:function(v){return v>=1.5;}},
    {n:'Endeudamiento del activo',f:'Pasivo total / Activo total',v:dv(e.pasivo,e.activo),fmt:'%',ref:'≤ 60%',ok:function(v){return v<=0.6;}},
    {n:'Apalancamiento financiero',f:'Pasivo total / Patrimonio',v:dv(e.pasivo,e.patrimonio),fmt:'x',ref:'≤ 1,50x',ok:function(v){return v<=1.5;}},
    {n:'Autonomía financiera',f:'Patrimonio / Activo total',v:dv(e.patrimonio,e.activo),fmt:'%',ref:'≥ 40%',ok:function(v){return v>=0.4;}},
    {n:'Calidad de la deuda',f:'Pasivo corriente / Pasivo total',v:dv(e.pasivoCorr,e.pasivo),fmt:'%',ref:'≤ 60%',ok:function(v){return v<=0.6;}},
    {sec:'FLUJO DE EFECTIVO'},
    {n:'Cobertura del pasivo con flujo operativo',f:'Flujo de operación / Pasivo corriente',v:dv(f.op,e.pasivoCorr),fmt:'x',ref:'≥ 0,40x',ok:function(v){return v>=0.4;}},
    {n:'Efectivo generado por cada $ de ingreso',f:'Flujo de operación / Ingresos',v:dv(f.op,r.ing),fmt:'%',ref:'≥ 10%',ok:function(v){return v>=0.1;}},
    {n:'Días promedio de cobro',f:'(CxC / Ingresos) × días del período',v:r.ing? e.cxc/r.ing*ctx.dias:0,fmt:'d',ref:'≤ 60 días',ok:function(v){return v<=60;}},
    {sec:'RENTABILIDAD'},
    {n:'Margen bruto',f:'Utilidad bruta / Ingresos',v:dv(r.bruta,r.ing),fmt:'%',ref:'≥ 30%',ok:function(v){return v>=0.3;}},
    {n:'Margen operativo',f:'Utilidad en operaciones / Ingresos',v:dv(r.oper,r.ing),fmt:'%',ref:'≥ 15%',ok:function(v){return v>=0.15;}},
    {n:'Margen neto',f:'Utilidad neta / Ingresos',v:dv(r.neta,r.ing),fmt:'%',ref:'≥ 10%',ok:function(v){return v>=0.1;}},
    {n:'ROA — Rendimiento del activo',f:'Utilidad neta / Activo total',v:dv(r.neta,e.activo),fmt:'%',ref:'≥ 8%',ok:function(v){return v>=0.08;}},
    {n:'ROE — Rendimiento del patrimonio',f:'Utilidad neta / Patrimonio',v:dv(r.neta,e.patrimonio),fmt:'%',ref:'≥ 15%',ok:function(v){return v>=0.15;}}
  ];
  var rows=IND.map(function(x){
    if(x.sec) return '<tr style="font-weight:800;background:var(--surf2)"><td colspan="5" style="padding:7px 9px;border-bottom:1px solid var(--rim)">'+x.sec+'</td></tr>';
    var val= x.fmt==='%'? _coroPct(x.v) : x.fmt==='$'? M(x.v) : x.fmt==='d'? (Math.round(x.v*10)/10).toLocaleString('es-VE')+' días' : _coroX(x.v);
    var ok=x.ok(x.v);
    return '<tr>'+_coroTd(x.n)+_coroTd('<span style="font-size:11px;color:var(--ink3)">'+x.f+'</span>')
      +_coroTd(val,'right','font-weight:700')+_coroTd(x.ref,'right')
      +_coroTd('<span style="font-weight:700;color:'+(ok?'var(--green)':'var(--amber)')+'">● '+(ok?'Favorable':'Requiere atención')+'</span>')+'</tr>';
  }).join('');
  var altRC=dv(e.actCorr-e.anticipos, e.pasivoCorr-e.anticipos);
  var altEnd=dv(e.pasivo-e.anticipos, e.activo-e.anticipos);
  return '<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table style="'+_coroTblCss()+'"><thead><tr>'
    +_coroTh('Indicador')+_coroTh('Fórmula')+_coroTh('Resultado','right')+_coroTh('Referencia','right')+_coroTh('Lectura')
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<div style="margin-top:12px;font-size:12px;color:var(--ink3)">ESCENARIO ALTERNO — reclasificando el saldo de la cuenta puente: '
    +'Razón corriente ajustada <strong>'+_coroX(altRC)+'</strong> · Endeudamiento del activo ajustado <strong>'+_coroPct(altEnd)+'</strong>. '
    +'Los valores de referencia son parámetros generales.</div>';
}

// ── DASHBOARD ──
function _coroHtmlDash(ctx, M){
  var e=ctx.esf, r=ctx.er, f=ctx.flujo;
  var card=function(lbl,val,color){
    return '<div class="stat"><div class="st-v" style="font-size:17px'+(color?';color:'+color:'')+'">'+val+'</div><div class="st-l">'+lbl+'</div></div>';
  };
  // Semaforo
  var sem=[
    ['Razón corriente',_coroX(e.pasivoCorr? e.actCorr/e.pasivoCorr:0), e.pasivoCorr? e.actCorr/e.pasivoCorr>=1.5:true],
    ['Prueba ácida',_coroX(e.pasivoCorr? (e.actCorr-e.anticipos)/e.pasivoCorr:0), e.pasivoCorr? (e.actCorr-e.anticipos)/e.pasivoCorr>=1:true],
    ['Endeudamiento del activo',_coroPct(e.activo? e.pasivo/e.activo:0), e.activo? e.pasivo/e.activo<=0.6:true],
    ['Autonomía financiera',_coroPct(e.activo? e.patrimonio/e.activo:0), e.activo? e.patrimonio/e.activo>=0.4:false],
    ['Margen neto',_coroPct(r.ing? r.neta/r.ing:0), r.ing? r.neta/r.ing>=0.1:false],
    ['Flujo operativo / Pasivo corriente',_coroX(e.pasivoCorr? f.op/e.pasivoCorr:0), e.pasivoCorr? f.op/e.pasivoCorr>=0.4:false]
  ];
  var semRows=sem.map(function(x){
    return '<tr>'+_coroTd(x[0])+_coroTd(x[1],'right','font-weight:700')
      +_coroTd('<span style="font-weight:800;color:'+(x[2]?'var(--green)':'var(--amber)')+'">● '+(x[2]?'FAVORABLE':'ATENCIÓN')+'</span>')+'</tr>';
  }).join('');
  // Composicion del gasto
  var gastos=[['Costo del servicio',-r.costo],['Personal',-r.gp],['Administración',-r.ga],['Ventas',-r.gv],['Financieros',-r.fin]];
  var gMax=Math.max.apply(null,gastos.map(function(g){return g[1];}).concat([1]));
  var gRows=gastos.map(function(g){
    var w=Math.max(2,Math.round(g[1]/gMax*100));
    return '<tr>'+_coroTd(g[0])+_coroTd(M(g[1]),'right')
      +'<td style="padding:6px 9px;border-bottom:1px solid var(--rim);width:40%"><div style="height:10px;border-radius:5px;background:var(--p1);opacity:.75;width:'+w+'%"></div></td></tr>';
  }).join('');
  // Evolucion mensual (ingresos/gastos del periodo; efectivo acumulado desde el inicio)
  var mesDesde=ctx.desde? ctx.desde.slice(0,7):'';
  var meses={}, efAcum={};
  ctx.lineas.forEach(function(l){
    if(l.f>ctx.hasta) return;
    var mes=l.f.slice(0,7); if(!mes) return;
    var ct=_coroCta(l.cod);
    if(ct.k==='EFECTIVO'){ if(!efAcum[mes]) efAcum[mes]=0; efAcum[mes]+=l.debe-l.haber; }
    if(mesDesde && mes<mesDesde) return;
    if(!meses[mes]) meses[mes]={ing:0,gto:0};
    if(ct.k==='INGRESOS') meses[mes].ing+=l.haber-l.debe;
    if(ct.k==='COSTOS'||ct.k==='GTO_VENTAS'||ct.k==='GTO_PERSONAL'||ct.k==='GTO_ADMIN'||ct.k==='GTO_FIN') meses[mes].gto+=l.debe-l.haber;
  });
  var acum=0;
  Object.keys(efAcum).sort().forEach(function(m){ if(mesDesde && m<mesDesde) acum+=efAcum[m]; });
  var mesesOrd=Object.keys(meses).concat(Object.keys(efAcum).filter(function(m){return !mesDesde||m>=mesDesde;})).filter(function(v,i,a){return a.indexOf(v)===i;}).sort();
  var mesLbl=function(m){ var n=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']; var p=m.split('-'); return n[parseInt(p[1],10)-1]+'-'+p[0].slice(2); };
  var mRows=mesesOrd.map(function(m){
    acum+=efAcum[m]||0;
    var d=meses[m]||{ing:0,gto:0};
    return '<tr>'+_coroTd(mesLbl(m))+_coroTd(M(d.ing),'right')+_coroTd(M(d.gto),'right')+_coroTd(M(acum),'right','font-weight:700')+'</tr>';
  }).join('');
  // Lectura rapida
  var lect=[
    'La empresa cerró el período con una utilidad de '+M(r.neta)+', equivalente al '+_coroPct(r.ing? r.neta/r.ing:0)+' de los ingresos.',
    'La operación '+(f.op>=0?'generó':'consumió')+' efectivo por '+M(Math.abs(f.op))+' en el período.',
    'El activo se financia en un '+_coroPct(e.activo? e.pasivo/e.activo:0)+' con pasivo y en un '+_coroPct(e.activo? e.patrimonio/e.activo:0)+' con patrimonio.',
    'La razón corriente es de '+_coroX(e.pasivoCorr? e.actCorr/e.pasivoCorr:0)+' y el capital de trabajo es de '+M(e.actCorr-e.pasivoCorr)+'.'
  ];
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px">'
    +card('ACTIVO TOTAL',M(e.activo))
    +card('PASIVO TOTAL',M(e.pasivo))
    +card('PATRIMONIO',M(e.patrimonio))
    +card('UTILIDAD NETA',M(r.neta), r.neta>=0?'var(--green)':'var(--red)')
    +card('EFECTIVO DISPONIBLE',M(e.efectivo))
    +card('CAPITAL DE TRABAJO',M(e.actCorr-e.pasivoCorr))
    +card('RAZÓN CORRIENTE',_coroX(e.pasivoCorr? e.actCorr/e.pasivoCorr:0))
    +card('FLUJO DE OPERACIÓN',M(f.op), f.op>=0?'var(--green)':'var(--red)')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">'
    +'<div style="border:1px solid var(--rim);border-radius:10px;padding:12px"><div style="font-weight:800;font-size:12px;margin-bottom:8px">SEMÁFORO DE LIQUIDEZ Y SOLVENCIA</div>'
    +'<table style="'+_coroTblCss()+'"><thead><tr>'+_coroTh('Indicador')+_coroTh('Valor','right')+_coroTh('Estado')+'</tr></thead><tbody>'+semRows+'</tbody></table></div>'
    +'<div style="border:1px solid var(--rim);border-radius:10px;padding:12px"><div style="font-weight:800;font-size:12px;margin-bottom:8px">COMPOSICIÓN DEL GASTO</div>'
    +'<table style="'+_coroTblCss()+'"><tbody>'+gRows+'</tbody></table>'
    +'<div style="font-weight:800;font-size:12px;margin:12px 0 6px">ESTRUCTURA DE FINANCIAMIENTO</div>'
    +'<table style="'+_coroTblCss()+'"><tbody>'
    +'<tr>'+_coroTd('Pasivo con socios')+_coroTd(M(e.cxp),'right')+'</tr>'
    +'<tr>'+_coroTd('Capital social')+_coroTd(M(e.capital),'right')+'</tr>'
    +'<tr>'+_coroTd('Resultados')+_coroTd(M(e.resultAntes+e.resEjercicio),'right')+'</tr>'
    +'</tbody></table>'
    +'<div style="font-weight:800;font-size:12px;margin:12px 0 6px">PUENTE DE FLUJO DE EFECTIVO</div>'
    +'<table style="'+_coroTblCss()+'"><tbody>'
    +'<tr>'+_coroTd('Operación')+_coroTd(M(f.op),'right')+'</tr>'
    +'<tr>'+_coroTd('Inversión')+_coroTd(M(f.inv),'right')+'</tr>'
    +'<tr>'+_coroTd('Financiamiento')+_coroTd(M(f.fin),'right')+'</tr>'
    +'<tr style="font-weight:800">'+_coroTd('Efectivo final')+_coroTd(M(f.efCierre),'right')+'</tr>'
    +'</tbody></table></div>'
    +'<div style="border:1px solid var(--rim);border-radius:10px;padding:12px"><div style="font-weight:800;font-size:12px;margin-bottom:8px">EVOLUCIÓN MENSUAL</div>'
    +'<table style="'+_coroTblCss()+'"><thead><tr>'+_coroTh('Mes')+_coroTh('Ingresos','right')+_coroTh('Gastos','right')+_coroTh('Efectivo','right')+'</tr></thead><tbody>'+mRows+'</tbody></table></div>'
    +'</div>'
    +'<div style="border:1px solid var(--rim);border-radius:10px;padding:12px;margin-top:14px"><div style="font-weight:800;font-size:12px;margin-bottom:8px">LECTURA RÁPIDA</div>'
    +lect.map(function(t){return '<div style="font-size:12.5px;margin-bottom:5px">• '+t+'</div>';}).join('')
    +'<div style="font-size:11.5px;color:var(--ink3);margin-top:8px">Antes de presentar formalmente estos estados, revisar los hallazgos de la pestaña Notas.</div></div>';
}

// ── CATALOGO ──
function _coroHtmlCatalogo(ctx, M){
  var mc=_coroMapaCuentas();
  var rows=_coroCatalogo().map(function(ct){
    var extra=mc.extras.some(function(x){return x.c===ct.c;});
    return '<tr'+(extra?' style="background:rgba(37,99,235,.05)"':'')+'>'+_coroTd(ct.c)+_coroTd(ct.n+(extra?' <span style="font-size:10px;color:var(--p1)">(cuenta del app)</span>':''))
      +_coroTd(ct.nat==='A'?'Acreedora':'Deudora')+_coroTd(ct.g)+_coroTd(ct.k)+'</tr>';
  }).join('');
  var mapRows=Object.keys(mc.mapa).map(function(nom){
    var ct=_coroCta(mc.mapa[nom]);
    return '<tr>'+_coroTd(nom)+_coroTd('→ '+ct.c+' — '+ct.n)+'</tr>';
  }).join('');
  return '<div style="overflow-x:auto;border:1px solid var(--rim);border-radius:10px"><table style="'+_coroTblCss()+'"><thead><tr>'
    +_coroTh('Código')+_coroTh('Nombre de la cuenta')+_coroTh('Naturaleza')+_coroTh('Grupo del Estado Financiero')+_coroTh('Clasificación (clave)')
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<div style="font-size:11.5px;color:var(--ink3);margin-top:10px">Claves válidas: '+CORO_CLAVES+'</div>'
    +'<div style="border:1px solid var(--rim);border-radius:10px;padding:12px;margin-top:14px"><div style="font-weight:800;font-size:12px;margin-bottom:8px">MAPEO DE CUENTAS DEL APP</div>'
    +'<table style="'+_coroTblCss()+'"><tbody>'+(mapRows||'<tr>'+_coroTd('Sin cuentas','left','color:var(--ink3)')+'</tr>')+'</tbody></table>'
    +(_coroPuedeEditar()? '<button class="btn btn-g btn-sm" style="margin-top:10px" onclick="coroMapeoAbrir()">✎ Editar mapeo</button>':'')+'</div>';
}

// ── NOTAS ──
function _coroHtmlNotas(ctx, M){
  var av=ctx.avisos;
  var tD=0,tH=0; ctx.lineas.forEach(function(l){ if(l.f<=ctx.hasta){tD+=l.debe;tH+=l.haber;} });
  var h=[];
  h.push({t:'Cuadre del libro diario', ok:Math.abs(tD-tH)<0.01, d:'Total Debe '+M(tD)+' vs Total Haber '+M(tH)+'.'});
  h.push({t:'Cuadre del Estado de Situación Financiera', ok:Math.abs(ctx.esf.cuadre)<0.01, d:'Diferencia: '+M(ctx.esf.cuadre)+'.'});
  h.push({t:'Conciliación del flujo de efectivo con el balance', ok:Math.abs(ctx.flujo.efCierre-ctx.esf.efectivo)<0.01, d:'Diferencia: '+M(ctx.flujo.efCierre-ctx.esf.efectivo)+'.'});
  if(av.pagosSinMov) h.push({t:'Pagos confirmados sin movimiento en cuentas', ok:false, d:av.pagosSinMov+' pago(s) por '+M(av.pagosSinMovMonto)+' no tienen movimiento de caja vinculado; el efectivo del libro puede diferir de la suma de pagos.'});
  if(av.aportes) h.push({t:'Depósitos clasificados como aportes de socios', ok:false, d:av.aportes+' depósito(s) por '+M(av.aportesMonto)+' no corresponden a cobros ni iniciales y se registraron contra Cuentas por Pagar Socios. Revisar y reclasificar con un ajuste si aplica.'});
  if(av.retiros) h.push({t:'Retiros clasificados contra Cuentas por Pagar Socios', ok:false, d:av.retiros+' retiro(s) por '+M(av.retirosMonto)+' sin categoría de gasto. Revisar y reclasificar si aplica.'});
  if(av.anulados) h.push({t:'Egresos anulados sin reverso de dinero', ok:false, d:av.anulados+' egreso(s) anulados cuyo dinero no regresó a la cuenta; quedaron contra Cuentas por Pagar Socios.'});
  if(av.credsSinPlan) h.push({t:'Créditos sin datos de plan', ok:false, d:av.credsSinPlan+' crédito(s) sin monto total; no se incluyeron en Préstamos Otorgados.'});
  if(!(_coroCfg().ajustes||[]).length) h.push({t:'Ausencia de partidas de cierre', ok:false, d:'No hay asientos manuales registrados (capital social, depreciación, ajustes). Se capturan con el botón "＋ Asiento manual" del Libro Diario.'});
  var hallazgos=h.map(function(x,i){
    return '<div style="border:1px solid var(--rim);border-radius:10px;padding:10px 12px;margin-bottom:8px">'
      +'<div style="font-weight:800;font-size:12.5px;margin-bottom:3px;color:'+(x.ok?'var(--green)':'var(--amber)')+'">'+(x.ok?'✔':'⚠')+' '+x.t+'</div>'
      +'<div style="font-size:12px;color:var(--ink2)">'+x.d+'</div></div>';
  }).join('');
  return '<div style="border:1px solid var(--rim);border-radius:10px;padding:12px;margin-bottom:14px">'
    +'<div style="font-weight:800;font-size:12px;margin-bottom:8px">CÓMO FUNCIONA ESTE LIBRO</div>'
    +'<div style="font-size:12px;color:var(--ink2);line-height:1.7">'
    +'• Cadena de cálculo: Catálogo de Cuentas → Libro Diario → Mayor → Balance de Comprobación → Estados financieros → Indicadores → Dashboard.<br>'
    +'• El Libro Diario se genera automáticamente desde los datos del sistema: créditos otorgados (un asiento por mes: cuentas por cobrar contra cuenta puente e ingresos por servicios), cobros de cuotas e iniciales (por día y por cuenta), egresos (uno a uno, según su categoría), transferencias entre cuentas y depósitos/retiros directos.<br>'
    +'• Los asientos manuales (capital social, depreciación, reclasificaciones) se capturan en el Libro Diario y se suman al resto.<br>'
    +'• Cada estado trae su propia prueba de cuadre. Si alguna aparece en ⚠, revisar antes de presentar.<br>'
    +'• Incluye TODOS los concesionarios (es el libro de la empresa completa).</div></div>'
    +'<div style="font-weight:800;font-size:12px;margin-bottom:8px">HALLAZGOS AUTOMÁTICOS</div>'+hallazgos
    +'<div style="border:1px solid var(--rim);border-radius:10px;padding:12px;margin-top:6px">'
    +'<div style="font-weight:800;font-size:12px;margin-bottom:8px">BASES DE PREPARACIÓN</div>'
    +'<div style="font-size:12px;color:var(--ink2);line-height:1.7">'
    +'• Fuente: datos en vivo de Firebase (créditos, pagos, movimientos de cuentas y egresos).<br>'
    +'• Período: del '+_coroFchLarga(ctx.inicio)+' al '+_coroFchLarga(ctx.hasta)+'.<br>'
    +'• Moneda: dólares (US$). Al imprimir puede expresarse en bolívares a la tasa BCV, BCV-euro o a una tasa manual (conversión solo de presentación).<br>'
    +'• Catálogo de cuentas y estructura: idénticos al libro de la contadora (Sistema Contable PAGASI 18).</div></div>';
}

// ══════════════════════════════════════════════════════════════
// RENDER PRINCIPAL (lo llama modules/reportes.js)
// ══════════════════════════════════════════════════════════════
function _renderCoromoto(){
  _coroCargarCfg();
  if(S.coromotoCfg===null) return '<div style="padding:30px;text-align:center;color:var(--ink3)">Cargando configuración del libro…</div>';
  var ctx=_coroCtx();
  var M=function(n){ return '$'+_coroF(n); };
  var t=S.coroTab||'dash';
  var tabs=[['dash','Dashboard'],['diario','Libro Diario'],['mayor','Mayor'],['balcomp','Bal. Comprobación'],['esf','ESF'],['er','ER'],['flujo','Flujo'],['ind','Indicadores'],['cat','Catálogo'],['notas','Notas']];
  var barra=tabs.map(function(x){
    var act=t===x[0];
    return '<button onclick="coroTab(\''+x[0]+'\')" style="background:'+(act?'var(--p1)':'var(--surf2)')+';color:'+(act?'#fff':'var(--ink2)')+';border:1px solid var(--rim);padding:7px 13px;border-radius:20px;font-size:12px;font-weight:'+(act?'800':'600')+';cursor:pointer;font-family:var(--f)">'+x[1]+'</button>';
  }).join('');
  var cuerpo =
    t==='diario' ? _coroHtmlDiario(ctx,M) :
    t==='mayor' ? _coroHtmlMayor(ctx,M) :
    t==='balcomp' ? _coroHtmlBalComp(ctx,M) :
    t==='esf' ? _coroHtmlESF(ctx,M) :
    t==='er' ? _coroHtmlER(ctx,M) :
    t==='flujo' ? _coroHtmlFlujo(ctx,M) :
    t==='ind' ? _coroHtmlInd(ctx,M) :
    t==='cat' ? _coroHtmlCatalogo(ctx,M) :
    t==='notas' ? _coroHtmlNotas(ctx,M) :
    _coroHtmlDash(ctx,M);
  var botones='<button class="btn btn-p btn-sm" onclick="coroImprimirAbrir()">🖨 Imprimir</button>';
  if(_coroPuedeEditar()){
    botones+=' <button class="btn btn-g btn-sm" onclick="coroAjusteAbrir()">＋ Asiento manual</button>'
      +' <button class="btn btn-g btn-sm" onclick="coroMapeoAbrir()">⚙ Mapeo</button>';
  }
  return '<div style="background:linear-gradient(135deg,#1E3A8A,#2563EB);border-radius:14px;padding:16px 20px;margin-bottom:14px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">'
    +'<div><div style="font-size:16px;font-weight:900">Coromoto · Libro Contable</div>'
    +'<div style="font-size:11.5px;opacity:.85">PAGASI 18, C.A. · Réplica del sistema de la contadora · Cifras en dólares (US$) · Generado en vivo desde Firebase</div></div>'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    +'<label style="font-size:11px;font-weight:700">Desde</label><input type="date" class="fi" id="coro-desde" value="'+(S.coroDesde||'')+'" onchange="coroPeriodo()" style="width:135px;padding:6px 8px">'
    +'<label style="font-size:11px;font-weight:700">Hasta</label><input type="date" class="fi" id="coro-hasta" value="'+(S.coroHasta||hoyLocalISO())+'" onchange="coroPeriodo()" style="width:135px;padding:6px 8px">'
    +botones+'</div></div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">'+barra+'</div>'
    +cuerpo;
}

// ══════════════════════════════════════════════════════════════
// MODAL: MAPEO (cuentas del app y categorias de egreso)
// ══════════════════════════════════════════════════════════════
function coroMapeoAbrir(){
  if(!_coroPuedeEditar()){ toast('Solo Administrador o Gerente','error'); return; }
  var cfg=_coroCfg(), mc=_coroMapaCuentas();
  setMicon('config');$('mtt').textContent='Coromoto · Mapeo contable';$('msb').textContent='Cómo se traducen los datos del app al catálogo de la contadora';
  $('modal-box').className='modal';
  var optsEfe=_coroCatalogo().filter(function(x){return x.k==='EFECTIVO';});
  var selCta=function(nom){
    var cur=mc.mapa[nom];
    return '<select class="fs coro-map-cta" data-nom="'+nom.replace(/"/g,'&quot;')+'">'
      +optsEfe.map(function(x){return '<option value="'+x.c+'"'+(x.c===cur?' selected':'')+'>'+x.c+' — '+x.n+'</option>';}).join('')
      +'</select>';
  };
  var deudoras=_coroCatalogo().filter(function(x){return x.nat==='D'&&x.k!=='EFECTIVO'&&x.k!=='CXC';});
  var CATS=[['inventario','Inventario / Motos'],['equipos','Equipos (GPS)'],['operativo','Oficina y servicios'],['nomina','Salarios / Nómina'],['otros','Otros']];
  var selCat=function(cat){
    var cur=cfg.mapCategorias[cat];
    return '<select class="fs coro-map-cat" data-cat="'+cat+'">'
      +deudoras.map(function(x){return '<option value="'+x.c+'"'+(x.c===cur?' selected':'')+'>'+x.c+' — '+x.n+'</option>';}).join('')
      +'</select>';
  };
  $('mbd').innerHTML='<div class="fsec">Cuentas del app → cuentas de efectivo</div>'
    +Object.keys(mc.mapa).map(function(nom){
      return '<div class="fgr" style="gap:8px;align-items:center;grid-template-columns:1fr 1.4fr;display:grid;margin-bottom:6px">'
        +'<div style="font-size:12.5px;font-weight:700">'+nom+'</div>'+selCta(nom)+'</div>';
    }).join('')
    +'<div class="fsec" style="margin-top:14px">Categorías de egreso → cuenta contable</div>'
    +CATS.map(function(c){
      return '<div class="fgr" style="gap:8px;align-items:center;grid-template-columns:1fr 1.4fr;display:grid;margin-bottom:6px">'
        +'<div style="font-size:12.5px;font-weight:700">'+c[1]+'</div>'+selCat(c[0])+'</div>';
    }).join('')
    +'<div style="font-size:11.5px;color:var(--ink3);margin-top:10px">Los cambios se aplican a todo el libro al instante (no modifican ningún dato del sistema).</div>';
  S.saveFn=function(){
    var cfg2=_coroCfg();
    document.querySelectorAll('.coro-map-cta').forEach(function(s){ cfg2.mapCuentas[s.getAttribute('data-nom')]=s.value; });
    document.querySelectorAll('.coro-map-cat').forEach(function(s){ cfg2.mapCategorias[s.getAttribute('data-cat')]=s.value; });
    S.coromotoCfg=cfg2;
    _coroGuardarCfg();
    toast('Mapeo guardado','success');closeM();S.reportesTab='coromoto';nav('reportes');return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar</button>';
  $('ov').style.display='flex';
}

// ══════════════════════════════════════════════════════════════
// MODAL: ASIENTO MANUAL
// ══════════════════════════════════════════════════════════════
function coroAjusteAbrir(){
  if(!_coroPuedeEditar()){ toast('Solo Administrador o Gerente','error'); return; }
  var cfg=_coroCfg();
  setMicon('egreso');$('mtt').textContent='Asiento manual';$('msb').textContent='Capital social, depreciación, reclasificaciones';
  $('modal-box').className='modal';
  var opts='<option value="">—</option>'+_coroCatalogo().map(function(x){return '<option value="'+x.c+'">'+x.c+' — '+x.n+'</option>';}).join('');
  var filas='';
  for(var i=0;i<4;i++){
    filas+='<div style="display:grid;grid-template-columns:2fr .8fr .8fr;gap:8px;margin-bottom:6px">'
      +'<select class="fs coro-aj-cta">'+opts+'</select>'
      +'<input class="fi coro-aj-debe" type="number" step="0.01" placeholder="Debe">'
      +'<input class="fi coro-aj-haber" type="number" step="0.01" placeholder="Haber"></div>';
  }
  var lista=(cfg.ajustes||[]).map(function(a){
    var tot=(a.lineas||[]).reduce(function(s,l){return s+(parseFloat(l.debe)||0);},0);
    return '<div style="display:flex;justify-content:space-between;align-items:center;border:1px solid var(--rim);border-radius:8px;padding:6px 10px;margin-bottom:5px;font-size:12px">'
      +'<span>'+_coroFch(a.fecha)+' · '+a.concepto+' · $'+_coroF(tot)+'</span>'
      +'<button class="btn btn-g btn-sm" onclick="coroAjusteBorrar(\''+a.id+'\')">✕</button></div>';
  }).join('');
  $('mbd').innerHTML='<div class="fgr" style="gap:8px;display:grid;grid-template-columns:1fr 2fr">'
    +'<div class="fg"><label>Fecha</label><input class="fi" id="coro-aj-fecha" type="date" value="'+hoyLocalISO()+'"></div>'
    +'<div class="fg"><label>Concepto *</label><input class="fi" id="coro-aj-conc" placeholder="Ej: Aporte de capital social"></div></div>'
    +'<div class="fsec" style="margin-top:10px">Líneas (el Debe debe igualar al Haber)</div>'+filas
    +(lista? '<div class="fsec" style="margin-top:12px">Asientos manuales registrados</div>'+lista : '');
  S.saveFn=function(){
    var conc=(($('coro-aj-conc')&&$('coro-aj-conc').value)||'').trim();
    var fecha=($('coro-aj-fecha')&&$('coro-aj-fecha').value)||hoyLocalISO();
    if(!conc){ toast('El concepto es obligatorio','error'); return false; }
    var lineas=[], td=0, th=0;
    var ctas=document.querySelectorAll('.coro-aj-cta'), debes=document.querySelectorAll('.coro-aj-debe'), habs=document.querySelectorAll('.coro-aj-haber');
    for(var i=0;i<ctas.length;i++){
      var cod=ctas[i].value, d=parseFloat(debes[i].value)||0, hh=parseFloat(habs[i].value)||0;
      if(!cod||(d<=0&&hh<=0)) continue;
      lineas.push({cod:cod,debe:d,haber:hh}); td+=d; th+=hh;
    }
    if(lineas.length<2){ toast('Un asiento necesita al menos dos líneas','error'); return false; }
    if(Math.abs(td-th)>0.005){ toast('El asiento no cuadra: Debe $'+_coroF(td)+' vs Haber $'+_coroF(th),'error'); return false; }
    var cfg2=_coroCfg();
    cfg2.ajustes.push({id:'AJ-'+Date.now(),fecha:fecha,concepto:conc,lineas:lineas,creadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin',creadoEn:new Date().toISOString()});
    S.coromotoCfg=cfg2;
    _coroGuardarCfg();
    if(typeof logActividad==='function') logActividad('coromoto_ajuste','config','coromoto',{concepto:conc,monto:td});
    toast('Asiento registrado','success');closeM();S.coroTab='diario';S.reportesTab='coromoto';nav('reportes');return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar asiento</button>';
  $('ov').style.display='flex';
}
function coroAjusteBorrar(id){
  if(!_coroPuedeEditar()) return;
  var cfg=_coroCfg();
  var a=(cfg.ajustes||[]).find(function(x){return x.id===id;});
  if(!a) return;
  if(!confirm('¿Eliminar el asiento manual "'+a.concepto+'"?')) return;
  cfg.ajustes=cfg.ajustes.filter(function(x){return x.id!==id;});
  S.coromotoCfg=cfg;
  _coroGuardarCfg();
  if(typeof logActividad==='function') logActividad('coromoto_ajuste_eliminado','config','coromoto',{concepto:a.concepto});
  toast('Asiento eliminado','info');closeM();S.reportesTab='coromoto';nav('reportes');
}

// ══════════════════════════════════════════════════════════════
// IMPRESION — con seleccion de moneda
// ══════════════════════════════════════════════════════════════
function coroImprimirAbrir(){
  setMicon('imprimir');$('mtt').textContent='Imprimir libro contable';$('msb').textContent='Elige la moneda y las secciones';
  $('modal-box').className='modal';
  var bcv=window._tasaBsGlobal||0, euro=window._tasaEuro||0;
  var radio=function(val,lbl,checked,extra){
    return '<label style="display:flex;gap:8px;align-items:center;background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:9px 12px;margin-bottom:6px;cursor:pointer">'
      +'<input type="radio" name="coro-mon" value="'+val+'"'+(checked?' checked':'')+' onchange="var m=document.getElementById(\'coro-tasa-man\');if(m)m.style.display=this.value===\'manual\'?\'block\':\'none\'">'
      +'<span style="font-size:12.5px"><strong>'+lbl+'</strong>'+(extra?'<br><span style="color:var(--ink3);font-size:11px">'+extra+'</span>':'')+'</span></label>';
  };
  var SECS=[['dash','Dashboard'],['diario','Libro Diario'],['balcomp','Balance de Comprobación'],['esf','Estado de Situación Financiera'],['er','Estado de Resultados'],['flujo','Flujo de Efectivo'],['ind','Indicadores'],['cat','Catálogo de cuentas'],['notas','Notas'],['mayor','Mayor (todas las cuentas con movimiento)']];
  $('mbd').innerHTML='<div class="fsec">Moneda</div>'
    +radio('usd','Dólares (US$)',true,'Como está en el sistema')
    +radio('bs','Bolívares a tasa BCV',false,bcv? 'Tasa actual: '+_coroF(bcv)+' Bs/$':'Sin tasa cargada')
    +radio('bseuro','Bolívares a tasa BCV-Euro',false,euro? 'Tasa actual: '+_coroF(euro)+' Bs/€→$':'Sin tasa cargada')
    +radio('manual','Bolívares a tasa manual',false,'Escribe la tasa abajo')
    +'<div class="fg" id="coro-tasa-man" style="display:none;margin-top:4px"><label>Tasa manual (Bs por $)</label><input class="fi" id="coro-tasa-man-val" type="number" step="0.0001" placeholder="Ej: 170.50"></div>'
    +'<div class="fsec" style="margin-top:12px">Secciones</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">'
    +SECS.map(function(s){
      var chk=s[0]!=='mayor'&&s[0]!=='diario';
      return '<label style="display:flex;gap:6px;align-items:center;font-size:12px;padding:4px 2px"><input type="checkbox" class="coro-sec" value="'+s[0]+'"'+(chk?' checked':'')+'> '+s[1]+'</label>';
    }).join('')+'</div>';
  S.saveFn=function(){
    var mon=(document.querySelector('input[name="coro-mon"]:checked')||{}).value||'usd';
    var tasa=1, lbl='Expresado en dólares de los Estados Unidos (US$)', sim='$';
    if(mon==='bs'){ tasa=window._tasaBsGlobal||0; lbl='Expresado en bolívares (Bs.) · Tasa BCV: '+_coroF(tasa)+' Bs/$'; sim='Bs. '; }
    if(mon==='bseuro'){ tasa=window._tasaEuro||0; lbl='Expresado en bolívares (Bs.) · Tasa BCV-Euro: '+_coroF(tasa)+' Bs/$'; sim='Bs. '; }
    if(mon==='manual'){ tasa=parseFloat(($('coro-tasa-man-val')||{}).value)||0; lbl='Expresado en bolívares (Bs.) · Tasa manual: '+_coroF(tasa)+' Bs/$'; sim='Bs. '; }
    if(mon!=='usd'&&!(tasa>0)){ toast('No hay tasa disponible para esa opción','error'); return false; }
    var secs=[]; document.querySelectorAll('.coro-sec:checked').forEach(function(c){secs.push(c.value);});
    if(!secs.length){ toast('Elige al menos una sección','error'); return false; }
    closeM();
    coroImprimirGo(secs, tasa, sim, lbl);
    return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Imprimir</button>';
  $('ov').style.display='flex';
}
function coroImprimirGo(secs, tasa, sim, lblMoneda){
  var ctx=_coroCtx();
  var M=function(n){ return sim+_coroF((parseFloat(n)||0)*tasa); };
  var TITULOS={dash:'Dashboard Financiero',diario:'Libro Diario',balcomp:'Balance de Comprobación',esf:'Estado de Situación Financiera',er:'Estado de Resultados',flujo:'Estado de Flujos de Efectivo — Método Indirecto',ind:'Indicadores Financieros',cat:'Catálogo de Cuentas',notas:'Notas y hallazgos',mayor:'Libro Mayor'};
  var cuerpoSec=function(k){
    if(k==='dash') return _coroHtmlDash(ctx,M);
    if(k==='diario') return _coroHtmlDiario(ctx,M);
    if(k==='balcomp') return _coroHtmlBalComp(ctx,M);
    if(k==='esf') return _coroHtmlESF(ctx,M);
    if(k==='er') return _coroHtmlER(ctx,M);
    if(k==='flujo') return _coroHtmlFlujo(ctx,M);
    if(k==='ind') return _coroHtmlInd(ctx,M);
    if(k==='cat') return _coroHtmlCatalogo(ctx,M);
    if(k==='notas') return _coroHtmlNotas(ctx,M);
    if(k==='mayor'){
      return _coroCatalogo().filter(function(ct){ var s=ctx.sums[ct.c]; return s&&(s.D||s.H); })
        .map(function(ct){ return '<div style="margin-bottom:18px">'+_coroHtmlMayor(ctx,M,ct.c,true)+'</div>'; }).join('');
    }
    return '';
  };
  var html=secs.map(function(k,i){
    return '<section'+(i?' style="page-break-before:always"':'')+'>'
      +'<div class="enc"><div class="emp">PAGASI 18, C.A.</div>'
      +'<div class="tit">'+TITULOS[k]+'</div>'
      +'<div class="sub">Del '+_coroFchLarga(ctx.inicio)+' al '+_coroFchLarga(ctx.hasta)+' · '+lblMoneda+'</div></div>'
      +cuerpoSec(k)+'</section>';
  }).join('');
  var w=window.open('','_blank','width=980,height=760');
  if(!w){ toast('El navegador bloqueó la ventana de impresión','error'); return; }
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Coromoto · PAGASI 18</title><style>'
    +'@page{size:Letter;margin:12mm} *{box-sizing:border-box} '
    +'body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;margin:0;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact} '
    +':root{--rim:#d8dce3;--surf:#fff;--surf2:#f1f3f7;--ink:#111;--ink2:#333;--ink3:#666;--p1:#2563EB;--green:#0a7a4b;--red:#c0392b;--amber:#b45309;--f:inherit} '
    +'.enc{border-bottom:2px solid #1E3A8A;padding-bottom:8px;margin-bottom:14px} '
    +'.emp{font-weight:900;font-size:15px;color:#1E3A8A} .tit{font-weight:800;font-size:13.5px;margin-top:2px} .sub{font-size:11px;color:#555;margin-top:2px} '
    +'table{width:100%;border-collapse:collapse} tr{page-break-inside:avoid} thead{display:table-header-group} '
    +'.stat{border:1px solid #d8dce3;border-radius:10px;padding:10px;text-align:center} .st-v{font-weight:900} .st-l{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.4px;margin-top:3px} '
    +'button{display:none} select{border:none;background:none;font-weight:700} input{display:none} '
    +'div[style*="max-height"]{max-height:none!important;overflow:visible!important} '
    +'</style></head><body>'+html+'</body></html>');
  w.document.close();
  setTimeout(function(){ try{w.focus();w.print();}catch(e){} },400);
}
