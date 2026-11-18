/* Datos INVENTADOS para la prueba en navegador del aviso de Comisiones (17-nov-2026).
   Liz y Debora ganan comisión. Michelle tiene la comisión apagada y 4 ventas a su nombre
   (3 en la primera quincena de noviembre y 1 en la segunda). Un administrador tiene 2 ventas.
   Esperado en Comisiones → Vendedores: aviso con 6 ventas (Michelle 4, Jefe 2).
   En el corte del 1 al 15: 5 ventas (Michelle 3, Jefe 2). Al activar la comisión de Michelle,
   deja de salir en el aviso y sus ventas empiezan a generar $5 cada una.                       */
(function(){
  var PERMISOS=['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','comisiones','plan','config','users','perm_delete'];
  function cred(id, fecha, uid, nombre){
    return { id:id, cli:'CLIENTE '+id, clienteId:'CLI-'+id, modelo:'OWEN 200S', estado:'activo', fecha:fecha, precio:1400, ini:420, fin:980,
      precioFinanciado:980, total:1500, cuotaQ:125, cuota:250, totalCuotas:12, plazo:6, pagado:0, mora:0, concesionarioId:'CO-P',
      vendedorUid:uid, vendedorNombre:nombre, contratoFirmado:true, pagosRegistrados:[] };
  }
  var creditos={
    'M-901':cred('M-901','2026-11-06','u-liz','Liz Prueba'),
    'M-902':cred('M-902','2026-11-07','u-liz','Liz Prueba'),
    'M-904':cred('M-904','2026-11-07','u-debora','Debora Prueba'),
    'M-905':cred('M-905','2026-11-06','u-michelle','Michelle Prueba'),
    'M-906':cred('M-906','2026-11-10','u-michelle','Michelle Prueba'),
    'M-907':cred('M-907','2026-11-13','u-michelle','Michelle Prueba'),
    'M-908':cred('M-908','2026-11-17','u-michelle','Michelle Prueba'),
    'M-909':cred('M-909','2026-11-07','u-jefe','Jefe Prueba'),
    'M-910':cred('M-910','2026-11-07','u-jefe','Jefe Prueba')
  };
  var ACTIVA={activo:true,venta:{tipo:'fijo',valor:5},cobranza:{tipo:'fijo',valor:1}};
  window.__DATOS_PRUEBA={
    usuarioActual:{uid:'u-prueba',email:'adam@pagasi.local',displayName:'Adam Prueba'},
    colecciones:{
      usuarios:{
        'u-prueba':{nombre:'Adam Prueba',email:'adam@pagasi.local',rol:'Administrador',permisos:PERMISOS,concesionarios:[]},
        'u-liz':{nombre:'Liz Prueba',email:'liz@pagasi.local',rol:'Vendedor',permisos:['dash','clientes','creditos'],concesionarios:[],comisiones:ACTIVA},
        'u-debora':{nombre:'Debora Prueba',email:'debora@pagasi.local',rol:'Vendedor',permisos:['dash','clientes','creditos'],concesionarios:[],comisiones:ACTIVA},
        'u-michelle':{nombre:'Michelle Prueba',email:'michelle@pagasi.local',rol:'Vendedor',permisos:['dash','clientes','creditos'],concesionarios:[],comisiones:{activo:false}},
        'u-jefe':{nombre:'Jefe Prueba',email:'jefe@pagasi.local',rol:'Administrador',permisos:PERMISOS,concesionarios:[]}
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
