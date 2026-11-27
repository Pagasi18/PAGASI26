/* Datos INVENTADOS para la prueba en navegador de la «Lista negra» (26-nov-2026), en la copia de PAGASI 26.
   Entra un administrador. En la lista hay una persona anotada a mano (V-70000001, tel. 0414-7000001) y una de
   «mala paga» automática (V-80000002). V-80000002 también está en malapagas. Para probar el freno: cargar un
   cliente con cédula V-70000001, o con una referencia de teléfono 0414-7000001.                              */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','plan','config','users','cumplimiento','listanegra','perm_delete'];
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid: 'u-prueba', email: 'adam@pagasi.local', displayName: 'Adam Prueba' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre: 'Adam Prueba', email: 'adam@pagasi.local', rol: 'Administrador', permisos: PERMISOS, concesionarios: [] } },
      config: { plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 },
                empresa: { nombre: 'PAGASI PRUEBA, C.A.', rif: 'J-00000000-0', direccion: 'AV. PRINCIPAL, CARACAS' } },
      concesionarios: { 'CO-P': { id: 'CO-P', nombre: 'CONCESIONARIO DE PRUEBA, C.A.' } },
      clientes: { 'CLI-P1': { id: 'CLI-P1', nombre: 'CLIENTE PRUEBA UNO', cedula: 'V-90000001', tel: '04140000001', estado: 'activo', concesionarioId: 'CO-P' } },
      motos: {}, creditos: {}, pagos: {}, movimientos: {}, egresos: {}, logs: {},
      listaNegra: { 'C70000001': { cedula: 'V-70000001', cedulaKey: 'C70000001', nombre: 'PERSONA ANOTADA A MANO', telefono: '0414-7000001', telKey: 'T4147000001', motivo: 'Documentos falsos', comentario: 'PRESENTO UNA CONSTANCIA DE TRABAJO FALSA', creado: '2026-11-20T14:00:00.000Z', creadoPor: 'Verificación Prueba' } },
      listaNegraAuto: { 'C80000002': { cedula: 'V-80000002', cedulaKey: 'C80000002', nombre: 'PERSONA MALA PAGA', telefono: '0412-8000002', telKey: 'T4128000002', motivo: 'Mala paga', detalle: [{ empresa: '18', credito: 'CRED-900', dias: 64, recuperada: false }], actualizado: '2026-11-26T10:20:00.000Z' } },
      listaNegraIndice: { 'M-C70000001': { t: 'manual' }, 'M-T4147000001': { t: 'manual' }, 'A-C80000002': { t: 'auto' }, 'A-T4128000002': { t: 'auto' } },
      listaNegraAvisos: {}, listaNegraPases: {},
      malapagas: { '80000002': { nombre: 'PERSONA MALA PAGA', ciudad: 'CARACAS', montoAdeudado: 350, moneda: 'USD', fechaReporte: '2026-06-01T00:00:00.000Z' } }
    }
  };
})();
