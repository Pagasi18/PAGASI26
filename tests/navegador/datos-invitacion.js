/* Datos INVENTADOS para la prueba en navegador de la pantalla de invitación (24-nov-2026). Nadie tiene la sesión
   abierta: se entra con el link ?invite=INV-PRUEBA-1&ie=invitado%40ejemplo.com. INV-PRUEBA-1 está pendiente
   (rol Administrador), INV-PRUEBA-USADA ya se usó, y cualquier otro token no existe (anulada).
   El Firebase de prueba no crea cuentas: al pulsar «Crear mi cuenta» con una invitación buena se ve el aviso de
   que no se pudo activar; con una anulada o usada se ve que ni siquiera lo intenta.                          */
(function(){
  window.__DATOS_PRUEBA = {
    usuarioActual: null,
    colecciones: {
      usuarios: {},
      config: { plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 } },
      invitaciones: {
        'INV-PRUEBA-1': { token: 'INV-PRUEBA-1', email: 'invitado@ejemplo.com', nombre: 'invitado@ejemplo.com', rol: 'Administrador',
                          permisos: ['dash','clientes','creditos','pagos','config','users','perm_delete'], usado: false, creadoEn: '2026-11-24T14:00:00.000Z' },
        'INV-PRUEBA-USADA': { token: 'INV-PRUEBA-USADA', email: 'viejo@ejemplo.com', nombre: 'viejo@ejemplo.com', rol: 'Vendedor', permisos: ['dash'], usado: true, creadoEn: '2026-11-01T14:00:00.000Z' }
      },
      clientes: {}, motos: {}, creditos: {}, pagos: {}, movimientos: {}, egresos: {}, logs: {}
    }
  };
})();
