/* Datos INVENTADOS para la prueba en navegador de la comisión de los sábados (9-nov-2026).
   Dos vendedoras con comisión de $5; ventas el viernes 6, el sábado 7 y el sábado 31-oct (viejo).
   Esperado: Liz genera 5 + 15 + 5 = 25 (el sábado viejo queda en $5); al pagar sale un gasto de
   comisiones desde Banesco y su retiro, como siempre.                                            */
(function(){
  var PERMISOS=['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','comisiones','plan','config','users','perm_delete'];
  function cred(id, fecha, uid, nombre){
    return { id:id, cli:'CLIENTE '+id, clienteId:'CLI-'+id, modelo:'OWEN 200S', estado:'activo', fecha:fecha, precio:1400, ini:420, fin:980,
      precioFinanciado:980, total:1500, cuotaQ:125, cuota:250, totalCuotas:12, plazo:6, pagado:0, mora:0, concesionarioId:'CO-P',
      vendedorUid:uid, vendedorNombre:nombre, contratoFirmado:true, pagosRegistrados:[] };
  }
  var creditos={
    'CRED-901':cred('CRED-901','2026-11-06','u-liz','Liz Prueba'),
    'CRED-902':cred('CRED-902','2026-11-07','u-liz','Liz Prueba'),
    'CRED-903':cred('CRED-903','2026-10-31','u-liz','Liz Prueba'),
    'CRED-904':cred('CRED-904','2026-11-07','u-debora','Debora Prueba')
  };
  window.__DATOS_PRUEBA={
    usuarioActual:{uid:'u-prueba',email:'adam@pagasi.local',displayName:'Adam Prueba'},
    colecciones:{
      usuarios:{
        'u-prueba':{nombre:'Adam Prueba',email:'adam@pagasi.local',rol:'Administrador',permisos:PERMISOS,concesionarios:[]},
        'u-liz':{nombre:'Liz Prueba',email:'liz@pagasi.local',rol:'Vendedor',permisos:['dash','clientes','creditos'],concesionarios:[],
          comisiones:{activo:true,venta:{tipo:'fijo',valor:5},cobranza:{tipo:'fijo',valor:1}}},
        'u-debora':{nombre:'Debora Prueba',email:'debora@pagasi.local',rol:'Vendedor',permisos:['dash','clientes','creditos'],concesionarios:[],
          comisiones:{activo:true,venta:{tipo:'fijo',valor:5},cobranza:{tipo:'fijo',valor:1}}}
      },
      config:{ plan:{factor:1.2,inicial:0.45,tasaMensual:0.05,plazo:12,apy:60,diasGracia:5},
        cuentasBanc:{ lista:[{nombre:'Banesco',moneda:'USD'},{nombre:'Efectivo',moneda:'USD'}] } },
      concesionarios:{'CO-P':{id:'CO-P',nombre:'Sede Prueba'}},
      clientes:{}, motos:{}, creditos:creditos, pagos:{},
      movimientos:{'MOV-1':{id:'MOV-1',tipo:'deposito',monto:500,cuentaDestino:'Banesco',cuentaOrigen:null,fecha:'2026-11-01',concepto:'Saldo inicial de prueba'}},
      egresos:{}, facturas:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
