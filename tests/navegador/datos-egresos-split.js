/* Datos INVENTADOS con la forma real del 17-sep-2026: 5 motos registradas el
   mismo dia, cada una con DOS egresos (inicial en efectivo + financiado en
   Binance) mas dos gastos de verdad. Esperado en el grafico: barra partida en
   gastos operativos (570) y compra de motos (4.000), y el globito avisando
   que no incluye 2.500 de iniciales.                                          */
(function(){
  function iso(d){ var p=function(n){return String(n).padStart(2,'0');}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  function dias(n){ var d=new Date(); d.setDate(d.getDate()+n); return iso(d); }
  var PERMISOS=['dash','centro','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  var creditos={}, clientes={}, motos={}, egresos={}, pagos={};
  var MOTOS=[[588,1723,723,1000],[589,1516,516,1000],[590,1400,700,700],[591,1650,650,1000],[592,1211,411,800]];
  MOTOS.forEach(function(m,i){
    var id='CRED-'+(594+i), motoId=m[0], precio=m[1], ini=m[2], fin=m[3];
    creditos[id]={ id:id, cli:'CLIENTE '+(594+i), clienteId:'CLI-'+id, motoId:motoId, modelo:'SUZUKI GN 125',
      estado:'activo', fecha:dias(0), precio:precio, ini:ini, fin:fin, total:fin*1.5, cuotaQ:100, cuota:200,
      totalCuotas:12, plazo:6, pagado:0, mora:0, concesionarioId:'CO-P', contratoFirmado:true, pagosRegistrados:[] };
    clientes['CLI-'+id]={id:'CLI-'+id,nombre:'CLIENTE '+(594+i),cedula:'V-1000000'+i,tel:'0414000000'+i,estado:'activo',concesionarioId:'CO-P'};
    motos[String(motoId)]={id:motoId,modelo:'SUZUKI GN 125',placa:'AA'+motoId,estado:'vendida',precio:precio,concesionarioId:'CO-P'};
    egresos[String(100+i*2)]={id:100+i*2, fecha:dias(0), monto:ini, categoria:'inventario', origenAuto:'compra_moto', motoIdRef:motoId, forma:'Efectivo', concepto:'Compra de moto (Moto #'+motoId+')', eliminado:false};
    egresos[String(101+i*2)]={id:101+i*2, fecha:dias(0), monto:fin, categoria:'inventario', origenAuto:'compra_moto', motoIdRef:motoId, forma:'Binance',  concepto:'Compra de moto (Moto #'+motoId+')', eliminado:false};
    pagos['P-'+id]={id:'P-'+id, cred:id, cli:'CLIENTE '+(594+i), fecha:dias(0), monto:ini, estado:'confirmado', metodo:'Efectivo', esInicial:true, eliminado:false};
  });
  egresos['200']={id:200, fecha:dias(0), monto:450, categoria:'sueldos',  concepto:'Sueldos', forma:'Efectivo', eliminado:false};
  egresos['201']={id:201, fecha:dias(0), monto:120, categoria:'alquiler', concepto:'Alquiler', forma:'Binance',  eliminado:false};
  egresos['202']={id:202, fecha:dias(-5), monto:300, categoria:'servicios', concepto:'Internet', forma:'Binance', eliminado:false};
  window.__DATOS_PRUEBA={
    usuarioActual:{uid:'u-prueba',email:'prueba@pagasi.local',displayName:'Prueba Egresos'},
    colecciones:{
      usuarios:{'u-prueba':{nombre:'Prueba Egresos',email:'prueba@pagasi.local',rol:'Administrador',permisos:PERMISOS,concesionarios:[]}},
      config:{plan:{factor:1.2,inicial:0.45,tasaMensual:0.05,plazo:12,apy:60,diasGracia:5}},
      concesionarios:{'CO-P':{id:'CO-P',nombre:'Sede Prueba'}},
      clientes:clientes, motos:motos, creditos:creditos, egresos:egresos, pagos:pagos,
      movimientos:{}, facturas:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
