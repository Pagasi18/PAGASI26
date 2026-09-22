/* Datos INVENTADOS para la prueba en navegador del grafico "Creditos otorgados"
   del dashboard (14-sep-2026). Hoy: CRED-801 activo y CRED-802 CANCELADO (no
   debe contar). Hace 3 dias: CRED-803 recuperado (si cuenta ese dia).          */
(function(){
  function iso(d){ var p = function(n){ return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function dias(n){ var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];

  function credito(id, n, diasAtras, estado){
    return {
      id: id, cli: 'CLIENTE PRUEBA ' + n, clienteId: 'CLI-D' + n, motoId: 'M-D' + n,
      modelo: 'SUZUKI GN 125', estado: estado, fecha: dias(-diasAtras),
      cuotaQ: 50, cuota: 100, totalCuotas: 24, plazo: 12, pagado: 0, mora: 0,
      total: 1200, fin: 1200, precio: 1100, inicial: 0, concesionarioId: 'CO-P',
      contratoFirmado: true, fechaContratoFirmado: dias(-diasAtras),
      creado: new Date(Date.now() - diasAtras * 86400000).toISOString(), creadoPor: 'Prueba',
      frecuencia: 'quincenal', pagosRegistrados: []
    };
  }
  function cliente(n){
    return { id: 'CLI-D' + n, nombre: 'CLIENTE PRUEBA ' + n, cedula: 'V-9100000' + n, tel: '0414100000' + n,
             ingreso: 400, score_indexa: 650, estado: 'activo', concesionarioId: 'CO-P' };
  }
  function moto(n){
    return { id: 'M-D' + n, modelo: 'SUZUKI GN 125', placa: 'DSH00' + n, color: 'NEGRO', estado: 'vendida',
             precio: 1100, cliente: 'CLIENTE PRUEBA ' + n, concesionarioId: 'CO-P' };
  }

  window.__DATOS_PRUEBA = {
    usuarioActual: { uid: 'u-prueba', email: 'prueba@pagasi.local', displayName: 'Prueba Dashboard' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre: 'Prueba Dashboard', email: 'prueba@pagasi.local', rol: 'Administrador', permisos: PERMISOS, concesionarios: [] } },
      config: { plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 } },
      concesionarios: { 'CO-P': { id: 'CO-P', nombre: 'Sede Prueba' } },
      clientes: { 'CLI-D1': cliente(1), 'CLI-D2': cliente(2), 'CLI-D3': cliente(3) },
      motos: { 'M-D1': moto(1), 'M-D2': moto(2), 'M-D3': moto(3) },
      creditos: {
        'CRED-801': credito('CRED-801', 1, 0, 'activo'),
        'CRED-802': credito('CRED-802', 2, 0, 'cancelado'),
        'CRED-803': credito('CRED-803', 3, 3, 'recuperado')
      },
      pagos: {}, movimientos: {}, egresos: {}, facturas: {}, cuentasPendientes: {},
      tareas: {}, recursos: {}, gps: {}
    }
  };
})();
