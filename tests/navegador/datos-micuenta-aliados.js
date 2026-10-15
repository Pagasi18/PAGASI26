/* Datos INVENTADOS para mirar Mi cuenta en un navegador de verdad con fake-firebase (15-oct-2026,
   rediseño "como el panel de aliados"). Una clienta al día: moto BERA SBR 150, 24 cuotas
   quincenales de $50, 9 pagadas a tiempo (nivel Plata), la próxima vence en 10 días.
   Con ?entrada=1 no hay sesión guardada: se ve la pantalla de entrada.                    */
(function(){
  function iso(d){ var p = function(n){ return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function dias(n){ var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  var INICIO = -140;   // la moto salió hace 140 días: la cuota 10 vence dentro de 10
  var pagos = {};
  for(var k = 1; k <= 9; k++){
    pagos['P-' + k] = { id:'P-' + k, cred:'M-012', clienteId:'CLI-A1', monto:50, fecha:dias(INICIO + 15 * k - 1), metodo:(k % 3 ? 'Pago móvil' : 'Binance'), referencia:'0001' + (240 + k), creadoEn:new Date(Date.now() + (INICIO + 15 * k - 1) * 86400000).toISOString() };
  }
  var sinSesion = /entrada=1/.test(location.search);
  window.__DATOS_PRUEBA = {
    usuarioActual: sinSesion ? null : { uid:'cli-prueba-aliados', email:null, phoneNumber:'+584141234567' },
    colecciones: {
      sesiones_cliente: { 'cli-prueba-aliados': { clienteId:'CLI-A1', via:'sms', telE164:'+584141234567' } },
      indice_clientes: { '+584141234567': { clienteId:'CLI-A1' } },
      clientes: { 'CLI-A1': { nombre:'María Pérez', cedula:'V-18.456.789', tel:'04141234567', telE164:'+584141234567', estado:'activo' } },
      creditos: {
        'M-012': { id:'M-012', cli:'María Pérez', clienteId:'CLI-A1', motoId:'MOTO-12', marca:'BERA', modelo:'SBR 150', placa:'AB123CD', estado:'activo',
                   fecha:dias(INICIO), cuotaQ:50, cuota:100, totalCuotas:24, plazo:12, pagado:450, mora:0, total:1200, fin:1200, precio:1235, inicial:494, ini:494,
                   concesionarioId:'C-BC', sede:'BERA Chacao', contratoFirmado:true, fechaContratoFirmado:dias(INICIO),
                   creado:new Date(Date.now() + INICIO * 86400000).toISOString(), creadoPor:'Prueba', frecuencia:'quincenal', pagosRegistrados:[] }
      },
      pagos: pagos, comprobantes: {}, ubicacion_cliente: {}, pedidos_gps: {}
    }
  };
})();
