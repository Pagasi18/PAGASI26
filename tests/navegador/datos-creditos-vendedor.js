/* Datos INVENTADOS para la prueba en navegador de «qué vendedor vendió la moto» (21-nov-2026):
   la columna Vendedor del listado de créditos y la etiqueta VENDEDOR del detalle.
   M-905 es un crédito viejo sin identificador de vendedor (sale por el nombre anotado),
   M-904 no tiene vendedor (raya) y M-903 lo vendió alguien con nombre largo.              */
(function(){
  var PERMISOS=['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','comisiones','plan','config','users','perm_delete'];
  function cred(id, cli, modelo, extra){
    var c={ id:id, cli:cli, clienteId:'CLI-'+id, modelo:modelo, vin:'8Z54BRAK7TM0007'+id.slice(-2), estado:'activo', fecha:'2026-11-21', creado:'2026-11-21T14:10:00.000Z',
      precio:1432, precioBaseReal:1432, ini:645, fin:787, precioFinanciado:787, total:1494, cuotaQ:83, cuota:166, totalCuotas:18, plazo:9, pagado:0, mora:0,
      concesionarioId:'CO-P', contratoFirmado:true, pagosRegistrados:[], apy:510.9 };
    Object.keys(extra||{}).forEach(function(k){ c[k]=extra[k]; });
    return c;
  }
  window.__DATOS_PRUEBA={
    usuarioActual:{uid:'u-prueba',email:'adam@pagasi.local',displayName:'Adam Prueba'},
    colecciones:{
      usuarios:{
        'u-prueba':{nombre:'Adam Prueba',email:'adam@pagasi.local',rol:'Administrador',permisos:PERMISOS,concesionarios:[]},
        'u-heymar':{nombre:'Heymar Prueba',email:'heymar@pagasi.local',rol:'Vendedor',permisos:['dash','clientes','creditos'],concesionarios:[]},
        'u-miguel':{nombre:'Miguel Prueba',email:'miguel@pagasi.local',rol:'Empleado',permisos:['dash','clientes','creditos'],concesionarios:[]},
        'u-largo':{nombre:'Maria Alejandra De Los Angeles Prueba',email:'largo@pagasi.local',rol:'Vendedor',permisos:['dash','clientes','creditos'],concesionarios:[]}
      },
      config:{ plan:{factor:1.2,inicial:0.45,tasaMensual:0.05,plazo:12,apy:60,diasGracia:5},
        cuentasBanc:{ lista:[{nombre:'Banesco',moneda:'USD'},{nombre:'Efectivo',moneda:'USD'}] } },
      concesionarios:{'CO-P':{id:'CO-P',nombre:'EMPIRE BELLO MONTE'}},
      clientes:{}, motos:{},
      creditos:{
        'M-901':cred('M-901','JOSE MANUEL PRUEBA SANCHEZ','MATRIX 150LITE',{vendedorUid:'u-heymar',vendedorNombre:'Heymar Prueba'}),
        'M-902':cred('M-902','ANA PRUEBA','OWEN 200S',{vendedorUid:'u-miguel',vendedorNombre:'Miguel Prueba'}),
        'M-903':cred('M-903','LUIS PRUEBA','NEW HORSE 150',{vendedorUid:'u-largo',vendedorNombre:'Maria Alejandra De Los Angeles Prueba',contratoFirmado:false}),
        'M-904':cred('M-904','CARLA PRUEBA','TX 250 GS',{}),
        'M-905':cred('M-905','PEDRO PRUEBA','EK XPRESS 150',{vendedorNombre:'Miguel Prueba',estado:'completado'})
      },
      pagos:{}, movimientos:{}, egresos:{}, facturas:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
