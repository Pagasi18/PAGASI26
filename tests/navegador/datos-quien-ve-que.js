/* Datos INVENTADOS para la prueba en navegador de Usuarios → «Quién ve qué» (21-nov-2026):
   la tabla con todas las personas y todos los módulos; un toque da o quita el permiso.  */
(function(){
  var ADM = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  var EMP = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','redes','redescob','whatsapp','instagram'];
  function u(nombre, rol, cargo, permisos, extra){ var o = { nombre:nombre, email:nombre.split(' ')[0].toLowerCase()+'@pagasi.local', rol:rol, cargo:cargo||'', permisos:permisos, concesionarios:[] }; Object.keys(extra||{}).forEach(function(k){ o[k]=extra[k]; }); return o; }
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid:'u-prueba', email:'adam@pagasi.local', displayName:'Adam Prueba' },
    colecciones: {
      usuarios: {
        'u-prueba':  u('Adam Prueba', 'Administrador', '', ADM),
        'u-samanta': u('Samanta Prueba', 'Gerente', 'Gerente de Operaciones', ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','conta','cuentas','redes','redescob','whatsapp','instagram','gps']),
        'u-liz':     u('Liz Prueba', 'Empleado', 'Archivóloga', ['dash','clientes','creditos','contratos','catalogo']),
        'u-miguel':  u('Miguel Prueba', 'Empleado', 'Asesor de ventas', EMP),
        'u-nataly':  u('Nataly Prueba', 'Empleado', 'Cobranza', ['dash','clientes','pagos','cobranza','redescob','whatsapp']),
        'u-jose':    u('José Prueba', 'Contador', 'Contador', ['dash','pagos','cobranza','reportes','conta','cuentas','comisiones']),
        'u-ernesto': u('Ernesto Prueba', 'Vendedor', 'Vendedor', ['dash','clientes','creditos','motos','redes','instagram','whatsapp']),
        'u-vc':      u('Vendedor Sede Prueba', 'Vendedor Concesionario', '', ['motos','clientes','creditos']),
        'u-ana':     u('Ana Prueba', 'Empleado', 'Recepción', ['dash','clientes'], { suspendido:true }),
        'u-aliado':  u('Aliado Prueba', 'Aliado', '', []),
        'u-adm2':    u('Abraham Prueba', 'Administrador', '', []),
        'u-adm3':    u('Alejandro Prueba', 'Administrador', '', []),
        'u-coro':    u('Coromoto Prueba', 'Gerente', 'Analista Contable', ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','conta','cuentas','concesionarios','plan']),
        'u-dani':    u('Daniela Prueba', 'Gerente', 'Cobranza', ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','calculadora','reportes','conta','cuentas','plan','config','users','perm_delete']),
        'u-daimar':  u('Daimar Prueba', 'Empleado', 'Asesor Comercial', ['clientes','motos','creditos','pagos','cobranza','contratos','notif']),
        'u-debora':  u('Debora Prueba', 'Empleado', 'Asesor Comercial', ['creditos','pagos','cobranza','contratos','notif']),
        'u-edi':     u('EDIANGELA DEL VALLE PRUEBA', 'Vendedor', 'Vendedor', ['dash','clientes','motos','creditos','redes','instagram','whatsapp']),
        'u-mf':      u('María Fernanda Prueba', 'Gerente', 'Gerente de Operaciones', ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','catalogo','perm_condiciones','grupo']),
        'u-oliver':  u('Oliver Prueba', 'Vendedor', 'Vendedor', ['dash','clientes','motos','creditos','redes','instagram','whatsapp','calculadora'])
      },
      config: { plan: { factor:1.2, inicial:0.45, tasaMensual:0.05, plazo:12, apy:60, diasGracia:5 } },
      concesionarios: {}, clientes: {}, motos: {}, creditos: {},
      pagos: {}, movimientos: {}, egresos: {}, facturas: {}, cuentasPendientes: {},
      tareas: {}, recursos: {}, gps: {}, invitaciones: {}
    }
  };
})();
