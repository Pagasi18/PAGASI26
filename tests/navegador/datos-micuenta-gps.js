/* Datos INVENTADOS para la prueba en navegador de "GPS en Mi cuenta" (14-sep-2026).
   Un cliente con dos creditos: CRED-9523 con el GPS activado por Pagasi (tiene
   ficha en ubicacion_cliente) y CRED-9524 sin GPS activado. El Worker queda
   bloqueado por fake-firebase: su POST aparece en __prueba.bloqueados.        */
(function(){
  function iso(d){ var p = function(n){ return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function dias(n){ var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  // Hora como la manda MiCODUS: UTC "YYYY-MM-DD HH:MM:SS"
  function utcHace(ms){ return new Date(Date.now() - ms).toISOString().replace('T', ' ').slice(0, 19); }
  function credito(id, diasAtras, extra){
    return Object.assign({
      id: id, cli: 'CLIENTE PRUEBA GPS', clienteId: 'CLI-G1', motoId: 'M-' + id,
      modelo: 'SUZUKI GN 125', placa: 'PRU523', estado: 'activo', fecha: dias(-diasAtras),
      cuotaQ: 50, cuota: 100, totalCuotas: 24, plazo: 12, pagado: 0, mora: 0,
      total: 1200, fin: 1200, precio: 1100, inicial: 0, concesionarioId: 'CO-P',
      contratoFirmado: true, fechaContratoFirmado: dias(-diasAtras),
      creado: new Date(Date.now() - diasAtras * 86400000).toISOString(), creadoPor: 'Prueba',
      frecuencia: 'quincenal', pagosRegistrados: []
    }, extra || {});
  }

  window.__DATOS_PRUEBA = {
    usuarioActual: { uid: 'cli-prueba-gps', email: null, phoneNumber: '+584140000000' },
    colecciones: {
      sesiones_cliente: { 'cli-prueba-gps': { clienteId: 'CLI-G1' } },
      clientes: { 'CLI-G1': { nombre: 'CLIENTE PRUEBA GPS', cedula: 'V-90000001', tel: '04140000000', estado: 'activo' } },
      creditos: {
        'CRED-9523': credito('CRED-9523', 10),
        'CRED-9524': credito('CRED-9524', 40, { placa: 'PRU524' })
      },
      pagos: {}, comprobantes: {},
      ubicacion_cliente: {
        'CRED-9523': { credId: 'CRED-9523', lat: 10.4806, lng: -66.9036, ultimaSenal: utcHace(95 * 60000),
                       revisado: new Date(Date.now() - 50 * 60000).toISOString(),
                       // ?sinworker=1 simula lo de hoy: config/gps sin direccion del Worker
                       workerUrl: /sinworker=1/.test(location.search) ? '' : 'https://worker-de-prueba.invalid' }
      },
      pedidos_gps: {}
    }
  };
})();
