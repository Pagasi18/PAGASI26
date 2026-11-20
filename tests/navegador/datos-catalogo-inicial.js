/* Datos INVENTADOS para la prueba en navegador de «Condiciones del plan» (20-nov-2026):
   la casilla de la inicial mínima y el permiso «Cambiar condiciones del plan».
   Sin nada en la dirección entra Adam Prueba (administrador) y María Fernanda Prueba todavía NO
   tiene el permiso (para dárselo en Usuarios → Editar permisos). Con ?como=mf entra ella, ya con
   el permiso; con ?como=liz entra Liz Prueba, que solo tiene Catálogo web.
   Condiciones de arranque: tasa 500, seguro 0, inicial 30, plazos 6, 9 y 12.                     */
(function(){
  var ADMIN=['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','catalogo','perm_delete'];
  var GERENTE=['dash','centro','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas'];
  var como=(String(location.search).match(/como=(\w+)/)||[])[1]||'adam';
  var actual={ adam:{uid:'u-prueba',email:'adam@pagasi.local',displayName:'Adam Prueba'},
               mf:{uid:'u-mf',email:'mf@pagasi.local',displayName:'Maria Fernanda Prueba'},
               liz:{uid:'u-liz',email:'liz@pagasi.local',displayName:'Liz Prueba'} }[como];
  function moto(id, modelo, precio){ return { id:id, modelo:modelo, name:modelo, sede:'ek', sedeName:'Sede Prueba', precio:precio, cat:'Trabajo', cc:'150', disponible:true, orden:id, image:'' }; }
  window.__DATOS_PRUEBA={
    usuarioActual:actual,
    colecciones:{
      usuarios:{
        'u-prueba':{nombre:'Adam Prueba',email:'adam@pagasi.local',rol:'Administrador',permisos:ADMIN,concesionarios:[]},
        'u-mf':{nombre:'Maria Fernanda Prueba',email:'mf@pagasi.local',rol:'Gerente',cargo:'Gerente de Operaciones',permisos:(como==='mf'?GERENTE.concat(['catalogo','perm_condiciones']):GERENTE),concesionarios:[]},
        'u-liz':{nombre:'Liz Prueba',email:'liz@pagasi.local',rol:'Empleado',permisos:['dash','clientes','catalogo'],concesionarios:[]}
      },
      config:{ plan:{factor:1.2,inicial:0.45,tasaMensual:0.05,plazo:12,apy:60,diasGracia:5},
        cuentasBanc:{ lista:[{nombre:'Banesco',moneda:'USD'},{nombre:'Efectivo',moneda:'USD'}] } },
      concesionarios:{'CO-P':{id:'CO-P',nombre:'Sede Prueba'}},
      catalogo:{
        '1':moto(1,'NEW HORSE 150',1320), '2':moto(2,'OWEN 200S',2000), '3':moto(3,'AGUILA 150',1100),
        '_condiciones':{apy:500,seguroPct:0,inicialMin:30,inicialMax:60,plazos:[6,9,12]}
      },
      clientes:{}, motos:{}, creditos:{}, pagos:{}, movimientos:{},
      egresos:{}, facturas:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
