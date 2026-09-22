/* Datos INVENTADOS para ver el dashboard con aspecto real (17-sep-2026):
   45 dias de operacion, 2-6 motos por dia (inicial + financiado registrados
   como egresos, como hace la oficina), cuotas cobradas y algo de mora.        */
(function(){
  function iso(d){ var p=function(n){return String(n).padStart(2,'0');}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  function dias(n){ var d=new Date(); d.setDate(d.getDate()+n); return iso(d); }
  var seed=7; function rnd(){ seed=(seed*9301+49297)%233280; return seed/233280; }
  var PERMISOS=['dash','centro','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  var creditos={}, clientes={}, motos={}, egresos={}, pagos={};
  var nC=500, nE=1000, nP=1;
  for(var d=-45; d<=0; d++){
    var motosHoy = d===0 ? 6 : (d%7===0 ? 1 : 2+Math.floor(rnd()*4));
    for(var k=0;k<motosHoy;k++){
      nC++;
      var id='CRED-'+nC, motoId=nC, precio=1100+Math.round(rnd()*1400), ini=Math.round(precio*(0.35+rnd()*0.2)), fin=precio-ini;
      var mora = (d < -20 && rnd()<0.12) ? Math.round(3+rnd()*40) : 0;
      creditos[id]={ id:id, cli:'CLIENTE '+nC, clienteId:'CLI-'+nC, motoId:motoId, modelo:'MOTO '+(k+1),
        estado: mora>5?'mora':'activo', fecha:dias(d), precio:precio, ini:ini, fin:fin, total:Math.round(fin*1.55),
        cuotaQ:Math.round(fin*1.55/12), cuota:Math.round(fin*1.55/6), totalCuotas:12, plazo:6, pagado:0, mora:mora,
        concesionarioId:'CO-P', contratoFirmado:true, pagosRegistrados:[] };
      clientes['CLI-'+nC]={id:'CLI-'+nC,nombre:'CLIENTE '+nC,cedula:'V-'+(10000000+nC),tel:'0414'+(1000000+nC),estado:'activo',concesionarioId:'CO-P'};
      motos[String(motoId)]={id:motoId,modelo:'MOTO '+(k+1),placa:'P'+motoId,estado:'vendida',precio:precio,concesionarioId:'CO-P'};
      egresos[String(nE)]={id:nE++, fecha:dias(d), monto:ini, categoria:'inventario', origenAuto:'compra_moto', motoIdRef:motoId, forma:'Efectivo', concepto:'Compra de moto', eliminado:false};
      egresos[String(nE)]={id:nE++, fecha:dias(d), monto:fin, categoria:'inventario', origenAuto:'compra_moto', motoIdRef:motoId, forma:'Binance',  concepto:'Compra de moto', eliminado:false};
      pagos['P'+(nP++)]={id:'P'+nP, cred:id, cli:'CLIENTE '+nC, fecha:dias(d), monto:ini, estado:'confirmado', metodo:'Efectivo', esInicial:true, eliminado:false};
      // cuotas cobradas cada 15 dias para los que no estan en mora
      for(var q=15; d+q<=0; q+=15){
        if(mora>0 && d+q > -10) break;
        pagos['P'+(nP++)]={id:'P'+nP, cred:id, cli:'CLIENTE '+nC, fecha:dias(d+q), monto:creditos[id].cuotaQ, estado:'confirmado', metodo:rnd()<0.6?'Binance':'Efectivo', eliminado:false};
        creditos[id].pagado++;
      }
    }
  }
  egresos['9001']={id:9001, fecha:dias(-10), monto:1800, categoria:'sueldos', concepto:'Nomina', forma:'Binance', eliminado:false};
  egresos['9002']={id:9002, fecha:dias(-2),  monto:450,  categoria:'alquiler', concepto:'Local', forma:'Binance', eliminado:false};
  window.__DATOS_PRUEBA={
    usuarioActual:{uid:'u-prueba',email:'prueba@pagasi.local',displayName:'adam'},
    colecciones:{
      usuarios:{'u-prueba':{nombre:'adam',email:'prueba@pagasi.local',rol:'Administrador',permisos:PERMISOS,concesionarios:[]}},
      config:{plan:{factor:1.2,inicial:0.45,tasaMensual:0.05,plazo:12,apy:60,diasGracia:5}},
      concesionarios:{'CO-P':{id:'CO-P',nombre:'Sede Prueba'}},
      clientes:clientes, motos:motos, creditos:creditos, egresos:egresos, pagos:pagos,
      movimientos:{}, facturas:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
