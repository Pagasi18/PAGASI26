/* Datos INVENTADOS para la prueba en navegador de la pantalla Créditos (14-sep-2026):
   las tarjetas cuentan la mora igual que el dashboard. Al arrancar, el app recalcula
   la mora desde la fecha y las cuotas pagadas (1 cuota cada 15 días), por eso los
   atrasos se arman con la fecha de inicio:
     CRED-901..903  hoy            -> al día
     CRED-904       hace 18 días   -> 3 días de atraso (gracia): estado activo
     CRED-905       hace 20 días   -> 5 días (gracia): estado activo
     CRED-906       hace 23 días   -> 8 días: estado MORA
     CRED-907       hace 35 días   -> 20 días: MORA
     CRED-908       hace 60 días   -> 45 días: MORA
     CRED-909       hace 85 días   -> 70 días: MORA
     CRED-910       completado (24 de 24 cuotas)
     CRED-911       cancelado
   Esperado: Activos 9 (3 al día) · En mora 6 · Completados 1 · Archivados 1 · Todos 10.  */
(function(){
  function iso(d){ var p = function(n){ return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function dias(n){ var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];

  function credito(id, n, diasAtras, estado, pagado){
    return {
      id: id, cli: 'CLIENTE PRUEBA ' + n, clienteId: 'CLI-M' + n, motoId: 'M-M' + n,
      modelo: 'SUZUKI GN 125', estado: estado, fecha: dias(-diasAtras),
      cuotaQ: 50, cuota: 100, totalCuotas: 24, plazo: 12, pagado: pagado || 0, mora: 0,
      total: 1200, fin: 1200, precio: 1100, inicial: 0, concesionarioId: 'CO-P',
      contratoFirmado: true, fechaContratoFirmado: dias(-diasAtras),
      creado: new Date(Date.now() - diasAtras * 86400000).toISOString(), creadoPor: 'Prueba',
      frecuencia: 'quincenal', pagosRegistrados: []
    };
  }
  function cliente(n){
    return { id: 'CLI-M' + n, nombre: 'CLIENTE PRUEBA ' + n, cedula: 'V-9200000' + n, tel: '0414200000' + n,
             ingreso: 400, score_indexa: 650, estado: 'activo', concesionarioId: 'CO-P' };
  }
  function moto(n){
    return { id: 'M-M' + n, modelo: 'SUZUKI GN 125', placa: 'MOR00' + n, color: 'NEGRO', estado: 'vendida',
             precio: 1100, cliente: 'CLIENTE PRUEBA ' + n, concesionarioId: 'CO-P' };
  }
  var plan = [ [901, 0, 'activo'], [902, 0, 'activo'], [903, 0, 'activo'], [904, 18, 'activo'], [905, 20, 'activo'],
               [906, 23, 'activo'], [907, 35, 'activo'], [908, 60, 'activo'], [909, 85, 'activo'],
               [910, 60, 'completado', 24], [911, 0, 'cancelado'] ];
  var creditos = {}, clientes = {}, motos = {};
  plan.forEach(function(p){
    var n = p[0] - 900;
    creditos['CRED-' + p[0]] = credito('CRED-' + p[0], n, p[1], p[2], p[3]);
    clientes['CLI-M' + n] = cliente(n);
    motos['M-M' + n] = moto(n);
  });

  window.__DATOS_PRUEBA = {
    usuarioActual: { uid: 'u-prueba', email: 'prueba@pagasi.local', displayName: 'Prueba Creditos' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre: 'Prueba Creditos', email: 'prueba@pagasi.local', rol: 'Administrador', permisos: PERMISOS, concesionarios: [] } },
      config: { plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 } },
      concesionarios: { 'CO-P': { id: 'CO-P', nombre: 'Sede Prueba' } },
      clientes: clientes, motos: motos, creditos: creditos,
      pagos: {}, movimientos: {}, egresos: {}, facturas: {}, cuentasPendientes: {},
      tareas: {}, recursos: {}, gps: {}
    }
  };
})();
