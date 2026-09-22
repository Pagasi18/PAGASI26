/* Datos INVENTADOS para la prueba en navegador del campo "Cargo" (15-sep-2026).
   Tres empleados sin cargo puesto: hoy todos se ven por su rol. La prueba entra
   a Usuarios, le pone el cargo a Nataly y comprueba que cambia lo que se ve
   SIN tocar sus permisos.                                                      */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  var EMP = ['dash','centro','clientes','motos','creditos','pagos','cobranza','contratos','notif'];
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid:'u-prueba', email:'adam@pagasi.local', displayName:'Adam Prueba' },
    colecciones: {
      usuarios: {
        'u-prueba': { nombre:'Adam Prueba', email:'adam@pagasi.local', rol:'Administrador', permisos:PERMISOS, concesionarios:[] },
        'u-nataly': { nombre:'Nataly Prueba', email:'nataly@pagasi.local', rol:'Empleado', permisos:EMP, concesionarios:[] },
        'u-luis':   { nombre:'Luis Prueba',   email:'luis@pagasi.local',   rol:'Empleado', permisos:EMP, concesionarios:[] },
        'u-samanta':{ nombre:'Samanta Prueba',email:'samanta@pagasi.local',rol:'Gerente',  permisos:EMP, concesionarios:[] }
      },
      config: { plan: { factor:1.2, inicial:0.45, tasaMensual:0.05, plazo:12, apy:60, diasGracia:5 } },
      concesionarios: {}, clientes: {}, motos: {}, creditos: {},
      pagos: {}, movimientos: {}, egresos: {}, facturas: {}, cuentasPendientes: {},
      tareas: {}, recursos: {}, gps: {}
    }
  };
})();
