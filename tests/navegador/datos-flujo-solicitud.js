/* Datos INVENTADOS para probar en el navegador el flujo nuevo de la solicitud
   (23-sep-2026): la sede primero, la inicial una sola vez y el pago de la moto
   automatico desde el anticipo. MOTOS TORO tiene US$ 3.000 de anticipo; EMPIRE no. */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  var CA = 'Anticipos en concesionarios';
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid:'u-prueba', email:'adam@pagasi.local', displayName:'Adam Prueba' },
    colecciones: {
      usuarios: {
        'u-prueba': { nombre:'Adam Prueba', email:'adam@pagasi.local', rol:'Administrador', permisos:PERMISOS, concesionarios:[] },
        'u-mf': { nombre:'María Prueba', email:'mf@pagasi.local', rol:'Empleado', permisos:['dash','clientes','motos','creditos','pagos'], concesionarios:[] }
      },
      config: {
        plan: { factor:1.2, inicial:0.45, tasaMensual:0.05, plazo:12, apy:60, diasGracia:5 },
        cuentasBanc: { lista: [ {nombre:'Binance 26', tipo:'Billetera digital', moneda:'USD'}, {nombre:'100% Banco 26', tipo:'Cuenta corriente', moneda:'USD'} ] },
        catalogo: { version:3, items: [ {id:1, modelo:'NEW HORSE 150', marca:'Empire'}, {id:2, modelo:'LEON 200', marca:'Bera', sede:'MOTOS TORO'} ] }
      },
      concesionarios: {
        'C1': { id:'C1', nombre:'MOTOS TORO', ciudad:'Caracas', activo:true },
        'C2': { id:'C2', nombre:'EMPIRE BELLO MONTE', ciudad:'Caracas', activo:true }
      },
      clientes: {}, motos: {}, creditos: {}, pagos: {}, egresos: {}, facturas: {}, cuentasPendientes: {},
      movimientos: {
        'MOV-SALDO': { id:'MOV-SALDO', tipo:'deposito', concepto:'Saldo inicial', monto:10000, cuentaDestino:'Binance 26', fecha:'2026-09-20', hora:'09:00' },
        'MOV-ANT-1': { id:'MOV-ANT-1', tipo:'transferencia', tipoOperacion:'anticipo_concesionario', concepto:'Anticipo a MOTOS TORO', monto:3000,
                       cuentaOrigen:'Binance 26', cuentaDestino:CA, concesionarioId:'C1', fecha:'2026-09-21', hora:'10:00' }
      },
      tareas: {}, recursos: {}, gps: {}
    }
  };
})();
