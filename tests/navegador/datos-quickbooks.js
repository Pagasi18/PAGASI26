/* Datos INVENTADOS para probar en el navegador la pestaña Exportar a QuickBooks (23-oct-2026). Nada real. */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid:'u-prueba', email:'adam@pagasi.local', displayName:'Adam Prueba' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre:'ADAM PRUEBA', email:'adam@pagasi.local', rol:'Administrador', permisos:PERMISOS, concesionarios:[] } },
      config: {
        empresa: { nombre:'PAGASI PRUEBA, C.A.', rif:'J-00000000-0', direccion:'AV. PRINCIPAL, CARACAS' },
        cuentasBanc: { lista: [ {nombre:'Binance 26', tipo:'Billetera digital', moneda:'USD'}, {nombre:'100% Banco 26', tipo:'Cuenta corriente', moneda:'USD'} ] }
      },
      concesionarios: { 'C1': { id:'C1', nombre:'MOTOS TORO', ciudad:'CARACAS', telefono:'0212-5550000', direccion:'AV. FRANCISCO DE MIRANDA', activo:true, rif:'J-12345678-9', createdAt:'2026-08-01T10:00:00.000Z' } },
      motos: { '5': { id:5, modelo:'OWEN 200S', concesionarioId:'C1', precioBaseReal:1350, estado:'vendida' } },
      clientes: {
        '7': { id:7, nombre:'JESUS GALARRAGA', cedula:'V-12345678', email:'jg@correo.com', tel:'0414-1111111', wa:'0424-2222222', dir:'AV. PRINCIPAL, CASA 3', ciudad:'CARACAS', estado_ubi:'DISTRITO CAPITAL', estado:'activo' },
        '9': { id:9, nombre:'MARIA PEREZ', cedula:'V-9999999', tel:'0412-3333333', wa:'0412-3333333', ciudad:'MARACAY', estado_ubi:'ARAGUA', estado:'activo' },
        '10': { id:10, nombre:'MARIA PEREZ', cedula:'V-8888888', tel:'0412-4444444', estado:'activo' }
      },
      creditos: {
        'M-154': { id:'M-154', cli:'JESUS GALARRAGA', clienteId:7, fecha:'2026-09-23', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, plazo:12, total:1272, motoId:5, modelo:'OWEN 200S' },
        'M-157': { id:'M-157', cli:'MARIA PEREZ', clienteId:9, fecha:'2026-09-10', estado:'mora', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, plazo:12, total:1272 },
        'M-158': { id:'M-158', cli:'MARIA PEREZ', clienteId:10, fecha:'2026-09-12', estado:'activo', precio:1350, ini:750, cuotaQ:53, totalCuotas:24, plazo:12, total:1272 }
      },
      pagos: {
        'PAG-INI': { id:'PAG-INI', cli:'JESUS GALARRAGA', cred:'M-154', fecha:'2026-09-23', monto:750, estado:'confirmado', esInicial:true, tipoOperacion:'inicial_credito' },
        'PAG-1': { id:'PAG-1', cli:'JESUS GALARRAGA', cred:'M-154', fecha:'2026-10-08', monto:53, estado:'confirmado', metodo:'Binance 26' },
        'PAG-2': { id:'PAG-2', cli:'JESUS GALARRAGA', cred:'M-154', fecha:'2026-10-20', monto:30, estado:'confirmado', metodo:'Binance 26' },
        'PAG-5': { id:'PAG-5', cli:'MARIA PEREZ', cred:'M-157', fecha:'2026-10-05', monto:53, estado:'confirmado', metodo:'100% Banco 26' },
        'PAG-6': { id:'PAG-6', cli:'MARIA PEREZ', cred:'M-158', fecha:'2026-10-09', monto:53, estado:'confirmado', metodo:'100% Banco 26' }
      },
      cuentasPendientes: {}, movimientos: {}, tareas: {}, recursos: {}, gps: {},
      egresos: {
        '1': { id:1, concepto:'PAPELERIA Y TONER', monto:126, fecha:'2026-10-03', categoria:'operativo', forma:'100% Banco 26',
               fiscal:{ proveedor:'PAPELERIA SOL, C.A.', rif:'J-11111111-1', numero:'00001234', control:'00-00001234', fecha:'2026-10-02', exento:10, base:100, alicuota:0.16 } },
        '2': { id:2, concepto:'Compra de moto · OWEN 200S', monto:750, fecha:'2026-10-20', categoria:'inventario', origenAuto:'compra_moto', motoIdRef:5, forma:'Binance 26' },
        '3': { id:3, concepto:'Compra de moto · OWEN 200S', monto:600, fecha:'2026-10-20', categoria:'inventario', origenAuto:'compra_moto', motoIdRef:5, forma:'Anticipo — MOTOS TORO' },
        '4': { id:4, concepto:'Nómina octubre', monto:900, fecha:'2026-10-15', categoria:'nomina', forma:'Binance 26' },
        '5': { id:5, concepto:'ALMUERZO EQUIPO', monto:40, fecha:'2026-10-16', categoria:'otros', forma:'Binance 26' }
      },
      facturas: {
        'FAC-1': { id:'FAC-1', numero:'00000202', numeroControl:'00-00000202', pagoId:'PAG-2', fechaEmision:'2026-10-21', cliente:{ nombre:'JESUS GALARRAGA', ci:'12345678' }, subtotal:25.86, iva:4.14, total:30, ivaRate:16, anulada:false }
      }
    }
  };
})();
