/* Datos INVENTADOS para la prueba en navegador de "registrar un pago".
   Fechas relativas a hoy, para que los atrasos sean siempre los mismos.

   CRED-777  en gestion, 1 cuota vencida  -> paga 1 cuota, queda al dia: la nota SE QUITA
   CRED-778  en gestion, 2 cuotas vencidas -> paga 1 cuota, sigue atrasado: la nota SE QUEDA
   CRED-779  "Cliente con problema", al dia -> paga 1 cuota: la nota NUNCA se quita        */
(function(){
  function iso(d){ var p = function(n){ return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function dias(n){ var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];

  function credito(id, n, diasAtras, nota, extra){
    return Object.assign({
      id: id, cli: 'CLIENTE PRUEBA ' + n, clienteId: 'CLI-P' + n, motoId: 'M-P' + n,
      modelo: 'SUZUKI GN 125', estado: 'activo', fecha: dias(-diasAtras),
      cuotaQ: 50, cuota: 100, totalCuotas: 24, plazo: 12, pagado: 0, mora: 0,
      total: 1200, fin: 1200, precio: 1100, inicial: 0, concesionarioId: 'CO-P',
      cobranzaStatus: nota, contratoFirmado: true, fechaContratoFirmado: dias(-diasAtras),
      creado: new Date(Date.now() - diasAtras * 86400000).toISOString(), creadoPor: 'Prueba',
      frecuencia: 'quincenal', pagosRegistrados: []
    }, extra || {});
  }
  function cliente(n){
    return { id: 'CLI-P' + n, nombre: 'CLIENTE PRUEBA ' + n, cedula: 'V-9000000' + n, tel: '0414000000' + n,
             ingreso: 400, score_indexa: 650, estado: 'activo', concesionarioId: 'CO-P' };
  }
  function moto(n){
    return { id: 'M-P' + n, modelo: 'SUZUKI GN 125', placa: 'PRU00' + n, color: 'NEGRO', estado: 'vendida',
             precio: 1100, cliente: 'CLIENTE PRUEBA ' + n, concesionarioId: 'CO-P' };
  }

  window.__DATOS_PRUEBA = {
    usuarioActual: { uid: 'u-prueba', email: 'prueba@pagasi.local', displayName: 'Prueba Cobranza' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre: 'Prueba Cobranza', email: 'prueba@pagasi.local', rol: 'Administrador', permisos: PERMISOS, concesionarios: [] } },
      config: {
        plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 },
        cuentasBanc: { lista: [ { nombre: 'Binance Pagos', tipo: 'Cripto', moneda: 'USDT' }, { nombre: '100% Banco Bs', tipo: 'Corriente', moneda: 'VES' } ] },
        cobradores: { lista: ['Samanta'] }
      },
      concesionarios: { 'CO-P': { id: 'CO-P', nombre: 'Sede Prueba' } },
      clientes: { 'CLI-P1': cliente(1), 'CLI-P2': cliente(2), 'CLI-P3': cliente(3) },
      motos: { 'M-P1': moto(1), 'M-P2': moto(2), 'M-P3': moto(3) },
      creditos: {
        'CRED-777': credito('CRED-777', 1, 20, 'gestion', { mora: 5 }),
        'CRED-778': credito('CRED-778', 2, 35, 'gestion', { mora: 20, estado: 'mora' }),
        'CRED-779': credito('CRED-779', 3, 10, 'problema')
      },
      pagos: {}, movimientos: {}, egresos: {}, facturas: {}, cuentasPendientes: {},
      tareas: {}, recursos: {}, gps: {}
    }
  };
})();
