/* Datos INVENTADOS para la prueba en navegador del botón «Crear folleto» del Catálogo (20-nov-2026).
   BERA PRUEBA: 13 modelos en dos grupos de nombre («BERA PRUEBA» y «BERA Prueba», mismo
   concesionario), 1 oculto y 1 sin precio → folleto de 11 filas, «Tu Bera.».
   EMPIRE PRUEBA: 21 modelos → UN solo folleto, más alto (1080 × 1920), sin páginas.
   ARI PRUEBA: 3 modelos, sin marca en el nombre → «Tu moto.»; la foto del primero es de otro
   sitio sin permiso (como el almacén sin configurar): el folleto debe salir sin foto y descargarse.
   NOMBRE VIEJO: 2 modelos sin concesionario del sistema.
   Condiciones: tasa 500, inicial 40, plazos 6, 9 y 12.                                            */
(function(){
  var ADMIN=['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','catalogo','perm_delete'];
  var n=0, cat={};
  function moto(conc, sede, modelo, precio, foto, extra){
    var id=++n, m={ id:id, modelo:modelo, name:modelo, sede:sede.toLowerCase().replace(/\s+/g,'-'), sedeName:sede, precio:precio, cat:'Trabajo', cc:'150', disponible:true, orden:id, image:foto||'' };
    if(conc) m.concesionarioId=conc;
    if(extra) Object.keys(extra).forEach(function(k){ m[k]=extra[k]; });
    cat[String(id)]=m;
  }
  var F='assets/motos/';
  [['ANTIKING',1042,'leon-200.jpg'],['BR BICYCLE',495,''],['BRF 150CC',898,'rex-150.jpg'],['BRX',1238,'jaguar-150.jpg'],['GR',2100,'rk-250.jpg'],['LEON',1025,'fox.jpg']]
    .forEach(function(x){ moto('CO-BERA','BERA PRUEBA',x[0],x[1],x[2]?F+x[2]:''); });
  [['MILAN',1025,'cappucino.jpg'],['MORINI STR',6375,''],['MORINI X-CAPE',6975,'tx-250-gs.jpg'],['RUNNER',1133,'typhoon.jpg'],['SBR',958,'power.jpg']]
    .forEach(function(x){ moto('CO-BERA','BERA Prueba',x[0],x[1],x[2]?F+x[2]:''); });
  moto('CO-BERA','BERA Prueba','COBRA OCULTA',1670,F+'moka.jpg',{disponible:false});
  moto('CO-BERA','BERA Prueba','BWS SIN PRECIO',null,F+'tank.jpg');
  ['NEW HORSE 150','TX 250 GS','MATRIX 150 LITE','MATRIX 150','NEW OUTLOOK 175','OUTLOOK XL PALETA','ATLAS 200HD','OWEN 200S AMARILLO','ARSEN','FENIX','EK XPRESS II 150','EK XPRESS 200S','EK XPRESS 150 LITE','NEW OWEN II 150','OWEN 200S','RK 200','RK 250','TANK III','R3X','POWER','CAPPUCINO']
    .forEach(function(nm,i){ moto('CO-EMP','EMPIRE Prueba',nm,1100+i*95,i===0?F+'new-horse-150.jpg':(i===3?F+'matrix-150.png':'')); });
  moto('CO-ARI','ARI PRUEBA','MILAN',1365,'https://firebasestorage.googleapis.com/v0/b/prueba-sin-permiso/o/no-existe.jpg?alt=media');
  moto('CO-ARI','ARI PRUEBA','PIAGGIO VESPA GTS 310CC AÑO 2026',14420,F+'veloz-rz-200.jpg');
  moto('CO-ARI','ARI PRUEBA','KAVAK',1730,'');
  moto('','NOMBRE VIEJO','VIEJA 150',900,''); moto('','NOMBRE VIEJO','VIEJA 200',1300,'');
  cat._condiciones={apy:500,seguroPct:0,inicialMin:40,inicialMax:60,plazos:[6,9,12]};
  var como=(String(location.search).match(/como=(\w+)/)||[])[1]||'adam';
  window.__DATOS_PRUEBA={
    usuarioActual: como==='liz' ? {uid:'u-liz',email:'liz@pagasi.local',displayName:'Liz Prueba'} : {uid:'u-prueba',email:'adam@pagasi.local',displayName:'Adam Prueba'},
    colecciones:{
      usuarios:{
        'u-prueba':{nombre:'Adam Prueba',email:'adam@pagasi.local',rol:'Administrador',permisos:ADMIN,concesionarios:[]},
        'u-liz':{nombre:'Liz Prueba',email:'liz@pagasi.local',rol:'Empleado',permisos:['dash','clientes','catalogo'],concesionarios:[]}
      },
      config:{ plan:{factor:1.2,inicial:0.45,tasaMensual:0.05,plazo:12,apy:60,diasGracia:5},
        cuentasBanc:{ lista:[{nombre:'Banesco',moneda:'USD'},{nombre:'Efectivo',moneda:'USD'}] } },
      concesionarios:{'CO-BERA':{id:'CO-BERA',nombre:'BERA PRUEBA'},'CO-EMP':{id:'CO-EMP',nombre:'EMPIRE Prueba'},'CO-ARI':{id:'CO-ARI',nombre:'ARI PRUEBA'}},
      catalogo:cat,
      clientes:{}, motos:{}, creditos:{}, pagos:{}, movimientos:{},
      egresos:{}, facturas:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
