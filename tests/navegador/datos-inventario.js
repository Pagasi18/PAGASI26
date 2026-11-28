/* Datos INVENTADOS para la prueba en navegador del «Inventario de oficina» (28-nov-2026).
   Por defecto entra un administrador. Con ?rol=empleado entra una empleada que SOLO tiene el permiso
   «inventario» (ve el módulo, no ve Finanzas y no puede borrar del todo); con ?rol=sin entra un vendedor
   sin ese permiso (no lo ve en el menú).
   En la base hay dos documentos, como en la de verdad después de publicar:
   · config/inventarioOficina: el de ANTES (la pestaña de Finanzas), con tres artículos sin código. Los dos
     primeros ya se trajeron; el tercero lo "agregó alguien desde una pestaña vieja" y se trae solo al abrir.
   · config/inventarioEquipos: el del módulo, con códigos, uno para reparar y uno dado de baja.
   ?ir=inventario abre esa pantalla sola al cargar, cuando el Dashboard ya terminó de pintarse (para sacar
   capturas sin tocar nada). &accion=escanear toca «Escanear» solo (para probar el lector con una cámara de
   mentira); la página no termina de cargar hasta pasados 11 s.                                              */
(function(){
  var rol = (/[?&]rol=([a-z]+)/.exec(location.search) || [])[1] || 'admin';
  var TODO = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','plan','config','users','cumplimiento','inventario','perm_delete'];
  var usuario = rol === 'empleado' ? { nombre: 'Empleada Prueba', email: 'empleada@pagasi.local', rol: 'Empleado', permisos: ['dash', 'inventario'], concesionarios: [] }
    : rol === 'sin' ? { nombre: 'Vendedor Prueba', email: 'vendedor@pagasi.local', rol: 'Vendedor', permisos: ['dash', 'clientes'], concesionarios: [] }
    : { nombre: 'Adam Prueba', email: 'adam@pagasi.local', rol: 'Administrador', permisos: TODO, concesionarios: [] };
  var escanear = /[?&]accion=escanear/.test(location.search);
  var ir = (/[?&]ir=([a-z]+)/.exec(location.search) || [])[1];
  if(escanear){ window.__espera = new Image(); window.__espera.src = '/__espera?ms=11000'; }
  if(ir){ var t = setInterval(function(){ if(typeof S !== 'undefined' && S.currentUser && typeof nav === 'function' && document.getElementById('cnt')){ clearInterval(t); setTimeout(function(){ nav(ir); if(escanear) setTimeout(function(){ invEscanear(); }, 600); }, 1500); } }, 150); }
  var V1 = { id: 'inv_1700000000001_aaaa', nombre: 'Laptop de gerencia', categoria: 'Laptop', ubicacion: 'Oficina', cantidad: 1, valorUnit: 650, fecha: '2026-03-10', estado: 'Bueno', nota: 'Serial viejo en la nota: PF-0001', creado: '2026-03-10T14:00:00.000Z' };
  var V2 = { id: 'inv_1700000000002_bbbb', nombre: 'Sillas de visitante', categoria: 'Silla', ubicacion: 'Oficina', cantidad: 6, valorUnit: 35, fecha: '2026-03-12', estado: 'Regular', nota: '', creado: '2026-03-12T14:00:00.000Z' };
  var V3 = { id: 'inv_1700000000003_cccc', nombre: 'Impresora multifuncional', categoria: 'Impresora', ubicacion: 'Oficina', cantidad: 1, valorUnit: 180, fecha: '2026-04-02', estado: 'Para reparar', nota: 'Atasca el papel', creado: '2026-04-02T14:00:00.000Z' };
  var con = function(x, cod){ var c = JSON.parse(JSON.stringify(x)); c.codigo = cod; return c; };
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid: 'u-prueba', email: usuario.email, displayName: usuario.nombre },
    colecciones: {
      usuarios: { 'u-prueba': usuario },
      config: {
        plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 },
        empresa: { nombre: 'PAGASI PRUEBA, C.A.', rif: 'J-00000000-0', direccion: 'AV. PRINCIPAL, CARACAS' },
        inventarioOficina: { actualizado: '2026-11-28T18:00:00.000Z', items: [V1, V2, V3] },
        inventarioEquipos: { actualizado: '2026-11-22T16:00:00.000Z', actualizadoPor: 'Adam Prueba', sec: 6, viejos: [V1.id, V2.id], items: [
          con(V1, 'INV-001'), con(V2, 'INV-002'),
          { id: 'inv_20261120150000000_4', codigo: 'INV-004', nombre: 'Monitor 24 pulgadas', categoria: 'Monitor', marca: 'Marca Prueba M24', serial: 'MON-PRUEBA-01', ubicacion: 'Oficina', area: 'Caja', responsable: 'Cajera Prueba', cantidad: 1, valorUnit: 120, fecha: '', estado: 'Bueno', nota: '', creado: '2026-11-20T15:00:00.000Z', creadoPor: 'Adam Prueba' },
          { id: 'inv_20261120150100000_5', codigo: 'INV-005', nombre: 'Escritorio en L', categoria: 'Escritorio', marca: '', serial: '', ubicacion: 'Concesionario: CONCESIONARIO DE PRUEBA, C.A.', area: 'Exhibición', responsable: '', cantidad: 2, valorUnit: 0, fecha: '', estado: 'Bueno', nota: '', creado: '2026-11-20T15:01:00.000Z', creadoPor: 'Adam Prueba' },
          { id: 'inv_20261120150200000_6', codigo: 'INV-006', nombre: 'Teléfono de cobranza', categoria: 'Teléfono / Celular', marca: 'Marca Prueba A10', serial: 'TEL-PRUEBA-77', ubicacion: 'Oficina', area: 'Cobranza', responsable: 'Cobrador Prueba', cantidad: 1, valorUnit: 140, fecha: '2026-09-01', estado: 'Bueno', nota: '', creado: '2026-11-20T15:02:00.000Z', creadoPor: 'Adam Prueba',
            baja: { motivo: 'Se perdió', fecha: '2026-11-22', nota: 'Se quedó en un taxi', por: 'Adam Prueba', en: '2026-11-22T16:00:00.000Z' } }
        ] }
      },
      concesionarios: { 'CO-P': { id: 'CO-P', nombre: 'CONCESIONARIO DE PRUEBA, C.A.' } },
      clientes: {}, motos: {}, creditos: {}, pagos: {}, movimientos: {}, egresos: {}, logs: {}, facturas: {}, cuentasPendientes: {}, gps: {}
    }
  };
})();
