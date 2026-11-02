// Factura de proveedor repetida (Adam, 27-oct-2026: "el sistema no filtra que la factura esté repetida… una especie de
// notificación previa de advertencia, y que la gente evite registrar dos veces la misma factura"). Avisa mientras se
// escribe y pregunta al guardar; no bloquea.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
function dom(){
  const els={};
  const el=id=>{ if(!els[id]){ const o={ id, _v:'', checked:false, innerHTML:'', textContent:'', style:{}, _a:{}, setAttribute(k,v){ this._a[k]=String(v); }, getAttribute(k){ return k in this._a ? this._a[k] : null; } }; Object.defineProperty(o,'value',{ get(){ return this._v; }, set(v){ this._v = v==null ? '' : String(v); } }); els[id]=o; } return els[id]; };
  return { els, el, document:{ getElementById:id=>el(id), querySelectorAll:()=>[], querySelector:()=>null, createElement:()=>({click(){},style:{}}), body:{appendChild(){},removeChild(){}} } };
}
function entorno(egresos){
  const d=dom();
  const G={ console:{log(){},warn(){}}, Math, JSON, Date, String, Number, Object, Array, parseFloat, parseInt, isNaN, isFinite, RegExp, Promise, setTimeout, clearTimeout,
    S:{ currentUser:{nombre:'ANALISTA'}, egresos:egresos||[], movimientos:[], motos:[], concesionarios:[] }, PLAN:{},
    fmt:n=>'$'+(parseFloat(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}),
    toast:function(m,t){ G.avisos.push([t,m]); }, avisos:[], nav(){}, closeM(){}, setMicon(){}, logActividad(){}, preguntas:[], respuesta:false,
    confirm:function(m){ G.preguntas.push(m); return G.respuesta; }, alarmas:[],
    hoyLocalISO:()=>'2026-10-27', document:d.document, _cuentasBanc:[{nombre:'Binance',moneda:'USD'}],
    DB:{ guardados:[], saveEgreso(o){ G.DB.guardados.push(['egreso',JSON.parse(JSON.stringify(o))]); return Promise.resolve(); }, saveMovimiento(o){ G.DB.guardados.push(['mov',o]); return Promise.resolve(); } },
    nextEgresoIdAsync:()=>Promise.resolve(900), Blob:function(){}, URL:{createObjectURL:()=>'',revokeObjectURL(){}} };
  G.$=id=>d.document.getElementById(id); G.window=G; vm.createContext(G);
  ['logic/categorias-egreso.js','logic/tasas.js','logic/exportar.js','logic/libros-iva.js','logic/egresos.js'].forEach(f=>vm.runInContext(src(f),G));
  G.lbAlarmaMostrar=(reps,clave)=>{ G.alarmas.push(clave); };   // la alarma de verdad necesita un navegador; aquí se anota
  G._dom=d; return G;
}
const EG=[
  { id:1, fecha:'2026-10-03', monto:116, concepto:'PAPELERIA Y TONER', categoria:'operativo', fiscal:{ proveedor:'PAPELERIA SOL, C.A.', rif:'J-11111111-1', numero:'00001234', control:'00-00001234' } },
  { id:2, fecha:'2026-10-20', monto:750, concepto:'Compra de moto · OWEN (parte 1/2)', categoria:'inventario', origenAuto:'compra_moto', motoIdRef:5, fiscal:{ proveedor:'MOTOS TORO', rif:'J-12345678-9', numero:'A-77' } },
  { id:3, fecha:'2026-10-20', monto:600, concepto:'Compra de moto · OWEN (parte 2/2)', categoria:'inventario', origenAuto:'compra_moto', motoIdRef:5, fiscal:{ proveedor:'MOTOS TORO', rif:'J-12345678-9', numero:'A-77' } },
  { id:4, fecha:'2026-10-15', monto:900, concepto:'Nómina octubre', categoria:'nomina' },
  { id:5, fecha:'2026-10-10', monto:40, concepto:'ALMUERZO', categoria:'otros', eliminado:true, fiscal:{ numero:'00001234', rif:'J-11111111-1' } },
  { id:6, fecha:'2026-10-11', monto:12, concepto:'TAXI', categoria:'otros', fiscal:{ numero:'1234', proveedor:'TAXI JUAN' } },
  { id:7, fecha:'2026-10-12', monto:30, concepto:'SIN FACTURA', categoria:'otros', fiscal:{ noAplica:true } }
];
const G=entorno(EG);
const rep=(f,o)=>G.lbFacturaRepetida(f, EG, o);
ok('mismo N° y mismo RIF: es la misma factura', rep({numero:'00001234', rif:'J-11111111-1'}).length===1 && rep({numero:'00001234', rif:'J-11111111-1'})[0].egreso.id===1 && /mismo N° y mismo proveedor/.test(rep({numero:'00001234', rif:'J-11111111-1'})[0].motivo));
ok('...aunque el N° venga sin ceros, con guiones o en minúsculas, y el RIF sin guiones', rep({numero:'1234', rif:'j111111111'}).length===1 && rep({numero:'00-001234', proveedor:'papeleria sol c.a.'}).length===1);
ok('mismo N° pero otro proveedor: no es la misma (la factura 1234 de TAXI JUAN es otra)', rep({numero:'1234', rif:'J-99999999-9'}).length===0 && rep({numero:'1234', proveedor:'OTRO'}).length===0);
ok('mismo N° y todavía sin proveedor: no avisa (el contador: solo el mismo N° del MISMO proveedor)', rep({numero:'1234'}).length===0 && rep({numero:'00001234'}).length===0);
ok('la compra de una moto no está en el libro: no cuenta como factura (la sede no la factura)', rep({numero:'A-77', rif:'J-12345678-9'}).length===0);
ok('un gasto eliminado o marcado "sin factura" no cuenta', rep({numero:'00001234', rif:'J-11111111-1'}).length===1);
ok('solo el proveedor, sin N°, NO avisa (Movistar manda una factura igual cada mes)', rep({proveedor:'PAPELERIA SOL, C.A.', rif:'J-11111111-1'}).length===0 && rep({rif:'J-11111111-1', fecha:'2026-10-03', monto:116}).length===0);
ok('mismo día y mismo monto sin N° tampoco', rep({fecha:'2026-10-15', monto:900, concepto:'Nómina octubre'}).length===0);
ok('al editar con ✎ el gasto de esa misma factura no cuenta', rep({numero:'00001234', rif:'J-11111111-1'}, {excluirIds:[1]}).length===0);
ok('con nada escrito no avisa', rep({}).length===0 && rep({numero:'', fecha:'2026-10-03'}).length===0);

// ── En el formulario ───────────────────────────────────────────────────────────────────────────────────────
ok('el bloque fiscal tiene el aviso y los campos lo disparan', /id="lbf_rep"/.test(G.lbCamposFiscalesHtml('lbf',{},0)) && (G.lbCamposFiscalesHtml('lbf',{},0).match(/lbRepetidaCheck\('lbf'\)/g)||[]).length===3);
G.openAddEgreso();
const html=G.$('mbd').innerHTML;
ok('Registrar Egreso lo muestra a la vista (no dentro del bloque plegado); solo el N°, el RIF y el proveedor lo disparan', /id="eg_rep_gasto"/.test(html) && (html.match(/lbRepetidaCheck\('egf'\)/g)||[]).length===3);
G._dom.el('egf_num').value='00001234'; G._dom.el('egf_rif').value='J-11111111-1'; G.lbRepetidaCheck('egf');
(async()=>{
  await new Promise(r=>setTimeout(r,200));
  ok('al escribir el N° y el RIF salta la alarma PAGO DUPLICADO y queda la línea roja con el gasto que ya existe', G.alarmas.length===1 && G.alarmas[0]==='1' && /PAGO DUPLICADO/.test(G.$('eg_rep_gasto').innerHTML) && /gasto #1/.test(G.$('eg_rep_gasto').innerHTML) && /\$116,00/.test(G.$('eg_rep_gasto').innerHTML) && G.$('egf_rep').innerHTML==='');
  G.lbRepetidaCheck('egf'); await new Promise(r=>setTimeout(r,200));
  ok('...la alarma no vuelve a saltar por lo mismo mientras se sigue escribiendo', G.alarmas.length===1);
  G._lbAlarmaCerrada['1']=1; G._lbAlarmaClave.egf=''; G.lbRepetidaCheck('egf'); await new Promise(r=>setTimeout(r,200));
  ok('...ni después de cerrarla, aunque se vuelva a teclear lo mismo', G.alarmas.length===1 && /PAGO DUPLICADO/.test(G.$('eg_rep_gasto').innerHTML));
  G._dom.el('egf_num').value='99'; G.lbRepetidaCheck('egf'); await new Promise(r=>setTimeout(r,200));
  ok('...y se quita cuando ya no coincide', G.$('eg_rep_gasto').innerHTML==='');
  // Guardar una repetida: pregunta; si dice que no, no guarda
  G._dom.el('eg_conc').value='PAPELERIA'; G._dom.el('eg_monto').value='116'; G._dom.el('eg_forma').value='Binance'; G._dom.el('egf_num').value='00001234'; G._dom.el('egf_rif').value='J-11111111-1'; G._dom.el('egf_prov').value='PAPELERIA SOL, C.A.';
  G.respuesta=false; const r1=G.S.saveFn();
  ok('al guardar una factura repetida pregunta, y si dice que no, no guarda', r1===false && G.preguntas.length===1 && /PAGO DUPLICADO/.test(G.preguntas[0]) && /#1/.test(G.preguntas[0]) && G.DB.guardados.length===0);
  G.respuesta=true; const r2=await G.S.saveFn();
  ok('...y si dice que sí, la guarda (avisa, no bloquea)', r2===true && G.DB.guardados.some(x=>x[0]==='egreso'));
  // Un gasto igual a otro del mismo día pero sin N° de factura: no pregunta nada (ya no es criterio)
  const G2=entorno(EG); G2.openAddEgreso(); G2._dom.el('eg_conc').value='Nómina octubre'; G2._dom.el('eg_monto').value='900'; G2._dom.el('eg_fecha').value='2026-10-15'; G2._dom.el('eg_cat').value='nomina'; G2._dom.el('eg_forma').value='Binance';
  G2.respuesta=false; const r3=await G2.S.saveFn();
  ok('un gasto igual a otro del mismo día, sin N° de factura, se guarda sin preguntar', r3===true && G2.preguntas.length===0);
  ok('elegir solo el proveedor no dispara la alarma', (()=>{ const G4=entorno(EG); G4.openAddEgreso(); G4._dom.el('egf_prov').value='PAPELERIA SOL, C.A.'; G4._dom.el('egf_rif').value='J-11111111-1'; G4.lbRepetidaCheck('egf'); return new Promise(r=>setTimeout(()=>r(G4.alarmas.length===0 && G4.$('eg_rep_gasto').innerHTML===''),200)); })());
  // El ✎ del libro no se avisa a sí mismo
  const G3=entorno(EG); G3.lbCompletar('eg:6'); await new Promise(r=>setTimeout(r,200));
  ok('abrir con ✎ una factura no la marca como repetida consigo misma', G3.$('lbf_rep').innerHTML==='' && JSON.stringify(G3._lbRepExcluir.lbf)==='[6]');
  G3._dom.el('lbf_num').value='00001234'; G3._dom.el('lbf_rif').value='J-11111111-1'; G3.lbRepetidaCheck('lbf'); await new Promise(r=>setTimeout(r,200));
  ok('...pero si le ponen el N° de otra factura ya registrada, salta la alarma', /gasto #1/.test(G3.$('lbf_rep').innerHTML) && G3.alarmas.length===1);
  ok('la alarma es roja y titila (animación), con botón para cerrar y dice PAGO DUPLICADO', /@keyframes lbAlarma/.test(src('logic/libros-iva.js')) && /#ff1e3c/.test(src('logic/libros-iva.js')) && /infinite alternate/.test(src('logic/libros-iva.js')) && /PAGO DUPLICADO/.test(src('logic/libros-iva.js')) && /onclick="lbAlarmaCerrar\(true\)"/.test(src('logic/libros-iva.js')));
  G3.respuesta=false;
  ok('...y al guardar pregunta', G3.S.saveFn()===false && G3.preguntas.length===1);
  ok('el aviso escapa lo que viene de la base', !/<img/.test(G3._lbRepTextoDe({ egreso:{ id:1, fecha:'2026-10-03', monto:1, concepto:'<img src=x onerror=alert(1)>', fiscal:{} }, motivo:'x' })));
  // ── "Guardar y registrar otro" (el contador, 27-oct-2026): guarda y deja el modal abierto y limpio ──
  const G5=entorno(EG); G5.cerrados=0; G5.abiertos=0; G5.navegados=0; G5.closeM=()=>{ G5.cerrados++; }; G5.setMicon=()=>{ G5.abiertos++; }; G5.nav=()=>{ G5.navegados++; };
  G5.openAddEgreso();
  ok('el modal tiene los dos botones: "Guardar y registrar otro" y "Guardar Egreso y Cerrar"', /onclick="_egGuardarOtro=true;saveM\(\)">Guardar y registrar otro</.test(G5.$('mft').innerHTML) && /onclick="saveM\(\)">Guardar Egreso y Cerrar</.test(G5.$('mft').innerHTML));
  G5._dom.el('eg_conc').value='TONER'; G5._dom.el('eg_monto').value='20'; G5._dom.el('eg_forma').value='Binance';
  G5._egGuardarOtro=true; const r5=await G5.S.saveFn();
  ok('"Guardar y registrar otro" guarda, refresca la lista y vuelve a armar el modal vacío en vez de cerrarlo', r5===true && G5.DB.guardados.some(x=>x[0]==='egreso' && x[1].concepto==='TONER') && G5.cerrados===0 && G5.navegados===1 && G5.abiertos===2 && G5._egGuardarOtro===false);
  G5._dom.el('eg_conc').value='PAPEL'; G5._dom.el('eg_monto').value='5';
  const r6=await G5.S.saveFn();
  ok('"Guardar Egreso y Cerrar" guarda y cierra, como siempre', r6===true && G5.cerrados===1 && G5.navegados===2 && G5.abiertos===2);
  G5._dom.el('eg_conc').value=''; G5._egGuardarOtro=true;
  ok('si la validación falla, la bandera no se queda pegada para el próximo guardado', G5.S.saveFn()===false && G5._egGuardarOtro===false);
  // ── Corregir un gasto (el contador, 2-nov-2026) ──
  const EG2=()=>[{ id:40, fecha:'2026-10-03', monto:116, concepto:'PAPELERIA', categoria:'operativo', forma:'Binance', notas:'ref-1', fiscal:{ proveedor:'PAPELERIA SOL, C.A.', rif:'J-11111111-1', numero:'00001234', base:100, alicuota:0.16 } }];
  const movDe=()=>({ id:'MOV-1', tipo:'retiro', concepto:'Egreso · PAPELERIA', monto:116, fecha:'2026-10-03', cuentaOrigen:'Binance', referencia:'ref-1' });
  const G6=entorno(EG2()); G6.S.currentUser={ nombre:'ADAM', rol:'Administrador' }; G6.isAdminUser=()=>true; G6.S.movimientos=[movDe()]; G6.cerrados=0; G6.closeM=()=>{ G6.cerrados++; };
  G6.openEditEgreso('40');
  const h6=G6.$('mbd').innerHTML;
  ok('corregir: el modal carga el gasto (concepto, monto, fecha, referencia y su factura, desplegada) y el pie dice Guardar corrección', G6.$('mtt').textContent==='Corregir Egreso #40' && /id="eg_conc" value="PAPELERIA"/.test(h6) && /id="eg_monto"[^>]*value="116"/.test(h6) && /id="eg_fecha"[^>]*value="2026-10-03"/.test(h6) && /id="eg_notas" value="ref-1"/.test(h6) && /id="egf_num" value="00001234"/.test(h6) && /<details id="eg_fiscal_box" open/.test(h6) && /Guardar corrección/.test(G6.$('mft').innerHTML) && !/registrar otro/.test(G6.$('mft').innerHTML));
  ok('...el administrador puede tocar el dinero: nada sale deshabilitado', !/disabled/.test(h6) && !/solo un administrador/.test(h6));
  G6._dom.el('eg_conc').value='PAPELERIA Y TONER'; G6._dom.el('eg_monto').value='120'; G6._dom.el('eg_fecha').value='2026-10-04'; G6._dom.el('eg_forma').value='Binance'; G6._dom.el('eg_cat').value='operativo'; G6._dom.el('eg_notas').value='ref-2';
  G6._dom.el('egf_prov').value='PAPELERIA SOL, C.A.'; G6._dom.el('egf_rif').value='J-11111111-1'; G6._dom.el('egf_num').value='00001234'; G6._dom.el('egf_base').value='100'; G6._dom.el('egf_alic').value='0.16';
  const r8=G6.S.saveFn(); const eg6=G6.S.egresos[0];
  ok('...al guardar, el gasto queda corregido con su historial (qué había antes, quién y cuándo)', r8===true && eg6.concepto==='PAPELERIA Y TONER' && eg6.monto===120 && eg6.fecha==='2026-10-04' && eg6.notas==='ref-2' && eg6.referencia==='ref-2' && eg6.historial.length===1 && eg6.historial[0].antes.monto===116 && eg6.historial[0].antes.concepto==='PAPELERIA' && eg6.editadoPor==='ADAM' && eg6.fiscal.numero==='00001234' && eg6.fiscal.base===100 && G6.DB.guardados.some(x=>x[0]==='egreso' && x[1].id===40));
  ok('...y su movimiento en Cuentas sigue al gasto: monto, fecha, concepto y referencia nuevos, enlazado por egresoId', (()=>{ const m=G6.S.movimientos[0]; return m.monto===120 && m.fecha==='2026-10-04' && m.concepto==='Egreso · PAPELERIA Y TONER' && m.referencia==='ref-2' && m.egresoId===40 && G6.DB.guardados.some(x=>x[0]==='mov' && x[1].id==='MOV-1'); })() && G6.cerrados===1);
  ok('...su propia factura no cuenta como repetida al corregir', G6.preguntas.length===0);
  const G7=entorno(EG2()); G7.S.currentUser={ nombre:'COROMOTO', rol:'Contador' }; G7.isAdminUser=()=>false; G7.S.movimientos=[movDe()]; G7.closeM=()=>{};
  G7.openEditEgreso('40'); const h7=G7.$('mbd').innerHTML;
  ok('quien no es administrador ve el aviso, y el monto, la fecha y la cuenta salen deshabilitados', /solo un administrador/.test(h7) && /id="eg_monto"[^>]*disabled/.test(h7) && /id="eg_fecha"[^>]*disabled/.test(h7) && /id="eg_forma" disabled/.test(h7));
  G7._dom.el('eg_conc').value='PAPELERIA CORREGIDA'; G7._dom.el('eg_monto').value='150'; G7._dom.el('eg_fecha').value='2026-10-09'; G7._dom.el('eg_forma').value='Zelle'; G7._dom.el('eg_cat').value='otros'; G7._dom.el('eg_notas').value='ref-3';
  G7._dom.el('egf_prov').value='PAPELERIA SOL, C.A.'; G7._dom.el('egf_rif').value='J-11111111-1'; G7._dom.el('egf_num').value='00001234'; G7._dom.el('egf_base').value='100'; G7._dom.el('egf_alic').value='0.16';
  const r9=G7.S.saveFn(); const eg7=G7.S.egresos[0], m7=G7.S.movimientos[0];
  ok('...y aunque teclee otro monto, fecha o cuenta, se guardan solo el concepto, la categoría, la referencia y la factura', r9===true && eg7.concepto==='PAPELERIA CORREGIDA' && eg7.categoria==='otros' && eg7.notas==='ref-3' && eg7.monto===116 && eg7.fecha==='2026-10-03' && eg7.forma==='Binance' && m7.monto===116 && m7.fecha==='2026-10-03' && m7.cuentaOrigen==='Binance' && m7.concepto==='Egreso · PAPELERIA CORREGIDA');
  const G8=entorno(EG); G8.openEditEgreso('2');
  ok('la compra de una moto no se corrige aquí: manda a Motocicletas', G8.avisos.some(a=>/Motocicletas/.test(a[1])) && G8.$('mtt').textContent!=='Corregir Egreso #2');
  const G9=entorno(EG2()); G9.S.currentUser={ nombre:'ADAM', rol:'Administrador' }; G9.isAdminUser=()=>true; G9.S.movimientos=[]; G9.closeM=()=>{};
  G9.openEditEgreso('40'); G9._dom.el('eg_conc').value='PAPELERIA'; G9._dom.el('eg_monto').value='130'; G9._dom.el('eg_fecha').value='2026-10-03'; G9._dom.el('eg_forma').value='Binance'; G9._dom.el('eg_cat').value='operativo';
  G9._dom.el('egf_num').value='00001234'; G9._dom.el('egf_rif').value='J-11111111-1'; G9._dom.el('egf_prov').value='PAPELERIA SOL, C.A.'; G9._dom.el('egf_base').value='100'; G9._dom.el('egf_alic').value='0.16';
  ok('si no encuentra el movimiento en Cuentas, corrige el gasto pero avisa que revisen el saldo', G9.S.saveFn()===true && G9.S.egresos[0].monto===130 && G9.avisos.some(a=>a[0]==='error' && /revisa el saldo/.test(a[1])));
  // Lo que encontró la revisión del 2-nov-2026
  const G10=entorno([{ id:50, fecha:'2026-10-05', monto:80, concepto:'Pago de comisión · PAOLA', categoria:'comisiones', origenAuto:'comision', forma:'Binance' }]); G10.openEditEgreso('50');
  ok('un pago de comisión no se corrige aquí: manda a Comisiones', G10.avisos.some(a=>/Comisiones/.test(a[1])) && G10.$('mtt').textContent!=='Corregir Egreso #50');
  const G11=entorno([{ id:51, fecha:'2026-10-05', monto:80, concepto:'VIEJO', categoria:'categoria-que-ya-no-existe', forma:'Binance' }]); G11.S.currentUser={ nombre:'COROMOTO', rol:'Contador' }; G11.isAdminUser=()=>false; G11.closeM=()=>{};
  G11.openEditEgreso('51');
  ok('una categoría que ya no está en la lista se agrega al selector, marcada, para que no cambie sola al guardar', /<option value="categoria-que-ya-no-existe" selected>/.test(G11.$('mbd').innerHTML));
  // Gasto en dólares con la factura completada en bolívares desde el Libro de Compras
  const EGH=()=>[{ id:52, fecha:'2026-10-05', monto:10, concepto:'TONER', categoria:'operativo', forma:'Binance', fiscal:{ proveedor:'X', rif:'J-1', numero:'5', moneda:'BS', tasa:886.23, tasaMoneda:'usd', tasaFecha:'2026-10-05', tasaFuente:'historial', exento:'', base:8.62, alicuota:0.16, retenido:'', exentoBs:'', baseBs:7640, retenidoBs:'', ivaBs:1222.4, iva:1.38 } }];
  const G12=entorno(EGH()); G12.S.currentUser={ nombre:'COROMOTO', rol:'Contador' }; G12.isAdminUser=()=>false; G12.closeM=()=>{}; G12.S.movimientos=[];
  G12.openEditEgreso('52');
  ok('gasto en $ con factura en Bs: el modal pinta la base en dólares (8,62), en la moneda del gasto', /id="egf_base" value="8.62"/.test(G12.$('mbd').innerHTML) && /id="egf_mon" data-prev="USD"/.test(G12.$('mbd').innerHTML));
  G12._dom.el('eg_conc').value='TONER HP'; G12._dom.el('eg_monto').value='10'; G12._dom.el('eg_fecha').value='2026-10-05'; G12._dom.el('eg_forma').value='Binance'; G12._dom.el('eg_cat').value='operativo';
  G12._dom.el('egf_prov').value='X'; G12._dom.el('egf_rif').value='J-1'; G12._dom.el('egf_num').value='5'; G12._dom.el('egf_base').value='8.62'; G12._dom.el('egf_alic').value='0.16';
  G12.S.saveFn(); const f12=G12.S.egresos[0].fiscal;
  ok('...y al corregir solo el concepto, la factura conserva sus bolívares, su tasa y su IVA tal como estaban', f12.moneda==='BS' && f12.baseBs===7640 && f12.tasa===886.23 && f12.base===8.62 && f12.iva===1.38 && f12.numero==='5' && G12.S.egresos[0].concepto==='TONER HP');
  const G13=entorno(EGH()); G13.S.currentUser={ nombre:'ADAM', rol:'Administrador' }; G13.isAdminUser=()=>true; G13.closeM=()=>{}; G13.S.movimientos=[];
  G13.openEditEgreso('52'); G13._dom.el('eg_conc').value='TONER'; G13._dom.el('eg_monto').value='10'; G13._dom.el('eg_fecha').value='2026-10-05'; G13._dom.el('eg_forma').value='Binance'; G13._dom.el('eg_cat').value='operativo';
  G13._dom.el('egf_prov').value='X'; G13._dom.el('egf_rif').value='J-1'; G13._dom.el('egf_num').value='5'; G13._dom.el('egf_base').value='9'; G13._dom.el('egf_alic').value='0.16';
  G13.S.saveFn(); const f13=G13.S.egresos[0].fiscal;
  ok('...si cambian la base, la factura queda en la moneda del gasto (dólares) con la base nueva', f13.moneda!=='BS' && f13.base===9 && f13.iva===1.44 && f13.baseBs===undefined);
  ok('el historial guarda también cómo estaba la factura', G13.S.egresos[0].historial[0].antes.fiscal.baseBs===7640);
  // Segunda ronda de la revisión: gasto en Bs con factura en Bs a otra tasa; solo la alícuota; el plural del pie
  const EGB=()=>[{ id:62, fecha:'2026-10-05', monto:10, moneda:'BS', montoBs:8862.3, tasaBs:886.23, tasaMoneda:'usd', tasaFecha:'2026-10-05', tasaFuente:'historial', concepto:'CABLES', categoria:'operativo', forma:'Binance', fiscal:{ proveedor:'X', rif:'J-1', numero:'5', moneda:'BS', tasa:870.10, tasaMoneda:'usd', tasaFecha:'2026-10-01', tasaFuente:'historial', exento:'', base:7.59, alicuota:0.16, retenido:'', exentoBs:'', baseBs:6600, retenidoBs:'', ivaBs:1056, iva:1.21 } }];
  const G14=entorno(EGB()); G14.S.currentUser={ nombre:'COROMOTO', rol:'Contador' }; G14.isAdminUser=()=>false; G14.closeM=()=>{}; G14.S.movimientos=[];
  G14.openEditEgreso('62');
  G14._dom.el('eg_conc').value='CABLES'; G14._dom.el('eg_monto').value='8862.3'; G14._dom.el('eg_fecha').value='2026-10-05'; G14._dom.el('eg_forma').value='Binance'; G14._dom.el('eg_cat').value='operativo'; G14._dom.el('egf_mon').value='BS'; G14._dom.el('egf_tasa').value='886.23';
  G14._dom.el('egf_prov').value='X'; G14._dom.el('egf_rif').value='J-1'; G14._dom.el('egf_num').value='5'; G14._dom.el('egf_ctl').value='00-5'; G14._dom.el('egf_base').value='6600'; G14._dom.el('egf_alic').value='0.16';
  G14.S.saveFn(); const f14=G14.S.egresos[0].fiscal;
  ok('gasto en Bs con factura en Bs a otra tasa: corregir el N° de control no reconvierte la factura (conserva su tasa y sus dólares)', f14.control==='00-5' && f14.tasa===870.10 && f14.tasaFecha==='2026-10-01' && f14.base===7.59 && f14.iva===1.21 && f14.baseBs===6600);
  const G15=entorno(EGH()); G15.S.currentUser={ nombre:'COROMOTO', rol:'Contador' }; G15.isAdminUser=()=>false; G15.closeM=()=>{}; G15.S.movimientos=[];
  G15.openEditEgreso('52'); G15._dom.el('eg_conc').value='TONER'; G15._dom.el('eg_monto').value='10'; G15._dom.el('eg_fecha').value='2026-10-05'; G15._dom.el('eg_forma').value='Binance'; G15._dom.el('eg_cat').value='operativo';
  G15._dom.el('egf_prov').value='X'; G15._dom.el('egf_rif').value='J-1'; G15._dom.el('egf_num').value='5'; G15._dom.el('egf_base').value='8.62'; G15._dom.el('egf_alic').value='0.08';
  G15.S.saveFn(); const f15=G15.S.egresos[0].fiscal;
  ok('cambiar solo la alícuota conserva los bolívares y la tasa, y recalcula el IVA en las dos monedas', f15.moneda==='BS' && f15.baseBs===7640 && f15.tasa===886.23 && f15.alicuota===0.08 && f15.iva===0.69 && f15.ivaBs===611.2);
  const G16=entorno([{ id:70, fecha:'2026-10-05', monto:5, concepto:'X', categoria:'otros', forma:'Binance', historial:[{en:'a',por:'A',antes:{}},{en:'b',por:'A',antes:{}},{en:'c',por:'ANA',antes:{}}], editadoPor:'ANA', editadoEn:'2026-10-20T00:00:00.000Z' }]); G16.openEditEgreso('70');
  ok('el pie dice "3 veces", no "vezces"', /Corregido 3 veces/.test(G16.$('mbd').innerHTML));
  console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
})();
