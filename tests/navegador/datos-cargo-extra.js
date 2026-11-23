/* Datos INVENTADOS para la prueba en navegador del «＋ Cargo extra» (23-nov-2026).
   CRED-940 imita al crédito 440 de PAGASI 18: $80 quincenales × 12 desde el 21-ago-2026,
   6 cuotas pagadas. Se le financian $34 de ACEITE en las cuotas 7 a 10 ($8,50 cada una).
   CRED-941 es un crédito normal, sin cargos, para ver que no cambia nada.                 */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','comisiones','plan','config','users','perm_delete'];
  function credito(id, n, extra){
    return Object.assign({
      id: id, cli: 'CLIENTE PRUEBA ' + n, clienteId: 'CLI-P' + n, motoId: 'M-P' + n,
      modelo: 'OWEN 200S', vin: '8Z54BRAK7TM00' + n, estado: 'activo', fecha: '2026-08-21',
      cuotaQ: 80, cuota: 160, totalCuotas: 12, plazo: 6, pagado: 6, mora: 0,
      total: 960, fin: 621, precioFinanciado: 621, precio: 1130, precioBaseReal: 1130, ini: 509, concesionarioId: 'CO-P',
      contratoFirmado: true, creado: '2026-08-21T14:10:00.000Z', creadoPor: 'Prueba', frecuencia: 'quincenal',
      pagosRegistrados: []
    }, extra || {});
  }
  function cliente(n){
    return { id: 'CLI-P' + n, nombre: 'CLIENTE PRUEBA ' + n, cedula: 'V-9000000' + n, tel: '0414000000' + n,
             ingreso: 400, estado: 'activo', concesionarioId: 'CO-P' };
  }
  function moto(n){
    return { id: 'M-P' + n, modelo: 'OWEN 200S', placa: 'PRU00' + n, color: 'NEGRO', estado: 'vendida',
             precio: 1130, cliente: 'CLIENTE PRUEBA ' + n, concesionarioId: 'CO-P' };
  }
  // 6 pagos de $80, uno por quincena (21-ago, 5-sep, 20-sep, 5-oct, 20-oct, 4-nov)
  var fechas = ['2026-08-21', '2026-09-05', '2026-09-20', '2026-10-05', '2026-10-20', '2026-11-04'];
  var pagos = {};
  ['CRED-940', 'CRED-941'].forEach(function(cr, j){
    fechas.forEach(function(f, k){
      var id = 'PAG-P' + (j + 1) + '-' + (k + 1);
      pagos[id] = { id: id, cred: cr, cli: 'CLIENTE PRUEBA ' + (j + 1), fecha: f, monto: 80, metodo: 'Efectivo',
                    cobrador: 'Prueba', estado: 'confirmado', referencia: 'P' + (k + 1), realizadoPor: 'Prueba', creadoEn: f + 'T15:00:00.000Z' };
    });
  });
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid: 'u-prueba', email: 'adam@pagasi.local', displayName: 'Adam Prueba' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre: 'Adam Prueba', email: 'adam@pagasi.local', rol: 'Administrador', permisos: PERMISOS, concesionarios: [] } },
      config: {
        plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 },
        cuentasBanc: { lista: [ { nombre: 'Efectivo', tipo: 'Caja', moneda: 'USD' } ] }
      },
      concesionarios: { 'CO-P': { id: 'CO-P', nombre: 'EMPIRE BELLO MONTE' } },
      clientes: { 'CLI-P1': cliente(1), 'CLI-P2': cliente(2) },
      motos: { 'M-P1': moto(1), 'M-P2': moto(2) },
      creditos: { 'CRED-940': credito('CRED-940', 1), 'CRED-941': credito('CRED-941', 2) },
      pagos: pagos, movimientos: {}, egresos: {}, facturas: {}, cuentasPendientes: {},
      tareas: {}, recursos: {}, gps: {}, logs: {}
    }
  };
})();
