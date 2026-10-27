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
  ['logic/tasas.js','logic/exportar.js','logic/libros-iva.js','logic/egresos.js'].forEach(f=>vm.runInContext(src(f),G));
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
  console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
})();
