/* Datos INVENTADOS para probar en el navegador los Libros de Compras y de Ventas (21-oct-2026). Nada real. */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid:'u-prueba', email:'adam@pagasi.local', displayName:'Adam Prueba' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre:'ADAM PRUEBA', email:'adam@pagasi.local', rol:'Administrador', permisos:PERMISOS, concesionarios:[] } },
      config: {
        empresa: { nombre:'PAGASI PRUEBA, C.A.', rif:'J-00000000-0', direccion:'AV. PRINCIPAL, CARACAS' },
        cuentasBanc: { lista: [ {nombre:'Binance 26', tipo:'Billetera digital', moneda:'USD'}, {nombre:'100% Banco 26', tipo:'Cuenta corriente', moneda:'USD'} ] },
        libros: { esSPE: true, pctRet: 0.75 }
      },
      concesionarios: { 'C1': { id:'C1', nombre:'MOTOS TORO', ciudad:'Caracas', activo:true, rif:'J-12345678-9' } },
      motos: { '5': { id:5, modelo:'OWEN 200S', concesionarioId:'C1', precioBaseReal:1350, estado:'vendida' } },
      clientes: {}, creditos: {}, pagos: {}, cuentasPendientes: {}, movimientos: {}, tareas: {}, recursos: {}, gps: {},
      egresos: {
        '1': { id:1, concepto:'PAPELERIA Y TONER', monto:116, fecha:'2026-10-03', categoria:'operativo', forma:'100% Banco 26',
               fiscal:{ proveedor:'PAPELERIA SOL, C.A.', rif:'J-11111111-1', numero:'00001234', control:'00-00001234', fecha:'2026-10-02', exento:0, base:100, alicuota:0.16 } },
        '2': { id:2, concepto:'Compra de moto · OWEN 200S', monto:750, fecha:'2026-10-20', categoria:'inventario', origenAuto:'compra_moto', motoIdRef:5, forma:'Binance 26' },
        '3': { id:3, concepto:'Compra de moto · OWEN 200S', monto:600, fecha:'2026-10-20', categoria:'inventario', origenAuto:'compra_moto', motoIdRef:5, forma:'Anticipo — MOTOS TORO' },
        '4': { id:4, concepto:'Nómina octubre', monto:900, fecha:'2026-10-15', categoria:'nomina', forma:'Binance 26' }
      },
      facturas: {
        'FAC-1': { id:'FAC-1', numero:'00000201', numeroControl:'00-00000201', fechaEmision:'2026-10-05', cliente:{ nombre:'ANA PEREZ', ci:'12345678' }, subtotal:100, iva:16, igtf:3.48, total:119.48, ivaRate:16, igtfRate:3, anulada:false },
        'FAC-2': { id:'FAC-2', numero:'00000202', numeroControl:'00-00000202', fechaEmision:'2026-10-18', cliente:{ nombre:'LUIS DIAZ', ci:'V-9876543' }, subtotal:500, iva:0, total:500, anulada:false },
        'FAC-3': { id:'FAC-3', numero:'00000203', numeroControl:'00-00000203', fechaEmision:'2026-10-20', cliente:{ nombre:'X', ci:'1' }, subtotal:80, iva:0, total:80, anulada:true }
      }
    }
  };
})();
