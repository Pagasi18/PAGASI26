// Todo es ficticio. Solo se carga con el Firebase en memoria del arnés de pruebas.
(function(){
  var permisos=['dash','clientes','motos','creditos','contratos','calculadora','whatsapp'];
  var rol=new URLSearchParams(location.search).get('rol')||'Empleado';
  window.__DATOS_PRUEBA={
    usuarioActual:new URLSearchParams(location.search).has('anonimo')?null:{uid:'movil-demo',email:'vendedor@example.invalid',displayName:'ANA VENTAS DEMO'},
    colecciones:{
      usuarios:{'movil-demo':{nombre:'ANA VENTAS DEMO',email:'vendedor@example.invalid',rol:rol,permisos:permisos,concesionarios:rol==='Vendedor Concesionario'?['SEDE-DEMO']:[],concesionarioId:'SEDE-DEMO'}},
      config:{
        plan:{factor:1.2,inicial:.5,tasaMensual:.05,plazo:12,apy:60,diasGracia:5},
        cuentasBanc:{lista:[{nombre:'BANCO DEMO USD',tipo:'banco',moneda:'USD'},{nombre:'EFECTIVO DEMO',tipo:'efectivo',moneda:'USD'}]},
        catalogo:{version:3,items:[{id:'CAT-DEMO',modelo:'EK XPRESS 150 LITE',marca:'Empire',precio:1400,costo:1400}]}
      },
      concesionarios:{'SEDE-DEMO':{nombre:'SEDE DE CAPACITACIÓN',ciudad:'CARACAS',activo:true}},
      clientes:{'CLI-DEMO':{nombre:'VALERIA EJEMPLO',cedula:'V-00000001',tel:'04120000001',ciudad:'CARACAS',ingreso:900,empleo:'formal',estado:'lead',concesionarioId:'SEDE-DEMO'},'CLI-LARGO':{nombre:'CLIENTE DE EJEMPLO CON APELLIDOS LARGOS PARA REVISIÓN',cedula:'V-00000004',tel:'04120000004',ciudad:'CARACAS',estado:'lead',concesionarioId:'SEDE-DEMO'}},
      motos:{'MOTO-DEMO':{modelo:'EK XPRESS 150 LITE',precio:1400,costo:1400,estado:'disponible',vin:'1TEST000000000001',color:'AZUL',concesionarioId:'SEDE-DEMO'}},
      movimientos:{'SALDO-DEMO':{tipo:'deposito',monto:10000,cuentaDestino:'BANCO DEMO USD',fecha:'2026-10-28'}},
      creditos:{},pagos:{},egresos:{},facturas:{},cuentasPendientes:{},tareas:{},recursos:{},gps:{}
    }
  };
})();
