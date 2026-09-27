/* Datos INVENTADOS para probar en el navegador la bandeja de solicitudes web
   (27-sep-2026): un lead que entro por pagasi.io/solicitar y un cliente del panel. */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid:'u-prueba', email:'adam@pagasi.local', displayName:'Adam Prueba' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre:'Adam Prueba', email:'adam@pagasi.local', rol:'Administrador', permisos:PERMISOS, concesionarios:[] } },
      config: {
        plan: { factor:1.2, inicial:0.45, tasaMensual:0.05, plazo:12, apy:60, diasGracia:5 },
        cuentasBanc: { lista: [ {nombre:'Binance 26', tipo:'Billetera digital', moneda:'USD'} ] }
      },
      concesionarios: { 'C1': { id:'C1', nombre:'EK BELLO MONTE', ciudad:'Caracas', activo:true } },
      clientes: {
        'WEB-12345678': { id:'WEB-12345678', nombre:'Carlos Prueba', cedula:'V-12345678', tel:'0414-1234567', wa:'0414-1234567', ciudad:'Petare, Caracas', trabajo:'delivery', ingreso:400,
          notas:'Solicitud web · Ingreso declarado: $300 a $500 · Interesado en NEW HORSE 150 ($1,320 · EK Bello Monte)',
          moto_interes_id:1, moto_interes_modelo:'NEW HORSE 150', moto_interes_precio:1320, moto_interes_sede:'EK Bello Monte',
          estado:'lead', origen:'web', creado:'2026-09-27T09:12:00.000Z', editadoEn:'2026-09-27T09:12:00.000Z', editadoPor:'Solicitud web' },
        'C-1': { id:'C-1', nombre:'Pedro Panel', cedula:'V-9999999', tel:'0424-7654321', ciudad:'Caracas', trabajo:'formal', ingreso:600, estado:'activo', creado:'2026-09-01T10:00:00.000Z' }
      },
      motos: {}, creditos: {}, pagos: {}, egresos: {}, facturas: {}, cuentasPendientes: {}, movimientos: {}, tareas: {}, recursos: {}, gps: {}
    }
  };
})();
