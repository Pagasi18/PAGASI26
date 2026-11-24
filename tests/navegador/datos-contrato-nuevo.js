/* Datos INVENTADOS para la prueba en navegador del contrato nuevo (24-nov-2026): Gasto Administrativo
   + anexo «Pago exclusivo en dólares». M-900 es de antes del 24-nov (le toca el contrato de Protect);
   M-901 y M-902 son del 24-nov (les toca el nuevo; M-902 con fiador). Solo en la copia de PAGASI 26
   se ve el contrato nuevo: en la de PAGASI 18 todos salen con Protect.                              */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','comisiones','plan','config','users','perm_delete'];
  function credito(id, n, fecha, extra){
    return Object.assign({
      id: id, cli: 'CLIENTE PRUEBA ' + n, clienteId: 'CLI-P' + n, motoId: 'M-P' + n,
      modelo: 'OWEN 200S', marca: 'EMPIRE', vin: '8Z5PRUEBA000000' + n, estado: 'activo', fecha: fecha,
      cuotaQ: 97, cuota: 194, totalCuotas: 20, plazo: 10, pagado: 0, mora: 0,
      total: 1940, fin: 1000, precioFinanciado: 1000, precio: 1700, precioBaseReal: 1700, ini: 700, concesionarioId: 'CO-P',
      creado: fecha + 'T14:30:00.000Z', creadoPor: 'Prueba', frecuencia: 'quincenal', uso_moto: 'personal', pagosRegistrados: []
    }, extra || {});
  }
  function cliente(n, extra){
    return Object.assign({ id: 'CLI-P' + n, nombre: 'CLIENTE PRUEBA ' + n, cedula: 'V-9000000' + n, tel: '0414000000' + n, email: 'cliente' + n + '@ejemplo.com',
             dir: 'CALLE ' + n + ', CASA ' + n, ciudad: 'CARACAS', estado: 'MIRANDA', cargo: 'COMERCIANTE', ingreso: 600, concesionarioId: 'CO-P' }, extra || {});
  }
  function moto(n){
    return { id: 'M-P' + n, marca: 'EMPIRE', modelo: 'OWEN 200S', anio: '2026', placa: 'PRU00' + n, color: 'NEGRO', estado: 'vendida',
             serialChasis: '8Z5PRUEBA000000' + n, serialMotor: 'MOTORPRUEBA00' + n, precio: 1700, cliente: 'CLIENTE PRUEBA ' + n, concesionarioId: 'CO-P' };
  }
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid: 'u-prueba', email: 'adam@pagasi.local', displayName: 'Adam Prueba' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre: 'Adam Prueba', email: 'adam@pagasi.local', rol: 'Administrador', permisos: PERMISOS, concesionarios: [] } },
      config: {
        plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 },
        empresa: { nombre: 'PAGASI PRUEBA, C.A.', rif: 'J-00000000-0', direccion: 'AV. PRINCIPAL, CARACAS', ciudad: 'Caracas', tel: '0414-000-0000', email: 'contacto@ejemplo.com',
                   rm: 'Séptimo', rmEstado: 'Distrito Capital', rmNum: '8', rmTomo: '58-A', rmFecha: '14/07/2026',
                   bancoUsd: 'BANCO DE PRUEBA', cuentaUsd: '0000-0000-00-0000000001', cuentaBs: '0000-0000-00-0000000002', pagoMovil: '0414-000-0000', billetera: 'Binance', billeteraCuenta: 'usuario-de-prueba' },
        cuentasBanc: { lista: [ { nombre: 'Efectivo', tipo: 'Caja', moneda: 'USD' } ] }
      },
      concesionarios: { 'CO-P': { id: 'CO-P', nombre: 'CONCESIONARIO DE PRUEBA, C.A.', rif: 'J-11111111-1' } },
      clientes: { 'CLI-P1': cliente(1), 'CLI-P2': cliente(2), 'CLI-P3': cliente(3, { fiador_nom: 'FIADOR DE PRUEBA', fiador_ci: 'V-80000003', fiador_dir: 'CALLE 9, CASA 9', fiador_tel: '04160000003' }) },
      motos: { 'M-P1': moto(1), 'M-P2': moto(2), 'M-P3': moto(3) },
      creditos: {
        'M-900': credito('M-900', 1, '2026-11-20', { contratoFirmado: true, fechaContratoFirmado: '2026-11-20' }),
        'M-901': credito('M-901', 2, '2026-11-24'),
        'M-902': credito('M-902', 3, '2026-11-24')
      },
      pagos: {}, movimientos: {}, egresos: {}, facturas: {}, cuentasPendientes: {},
      tareas: {}, recursos: {}, gps: {}, logs: {}
    }
  };
})();
