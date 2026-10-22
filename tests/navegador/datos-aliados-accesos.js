/* Datos INVENTADOS (22-oct-2026) para ver en el navegador los accesos al portal de aliados. Nada real. */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','config','users','concesionarios','perm_delete'];
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid:'u-prueba', email:'adam@pagasi.io', displayName:'adam' },
    colecciones: {
      usuarios: {
        'u-prueba': { nombre:'ADAM', email:'adam@pagasi.io', rol:'Administrador', permisos:PERMISOS, concesionarios:[] },
        'al-1': { uid:'al-1', nombre:'Grupo EK', grupo:'Grupo EK', usuario:'ek', email:'ek@aliados.pagasi.io', rol:'Aliado', permisos:[], concesionarios:['C-EKBM','C-EKTR'], creadoEn:'2026-10-22T12:00:00Z', creadoPor:'ADAM' }
      },
      concesionarios: {
        'C-EKBM': { id:'C-EKBM', nombre:'EMPIRE Bello Monte', ciudad:'Caracas', activo:true },
        'C-EKTR': { id:'C-EKTR', nombre:'EK Trujillo', ciudad:'Valera', activo:true },
        'C-TORO': { id:'C-TORO', nombre:'MOTOS TORO', ciudad:'Maracay', activo:true },
        'C-VELOZ': { id:'C-VELOZ', nombre:'VELOZ Pto La Cruz', ciudad:'Puerto La Cruz', activo:true }
      },
      config: {}, clientes:{}, creditos:{}, pagos:{}, motos:{}, egresos:{}, movimientos:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
