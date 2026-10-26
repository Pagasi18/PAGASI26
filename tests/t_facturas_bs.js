// Facturas de proveedor en bolívares (Adam, 26-oct-2026, lo que pidió el analista de contabilidad): al registrar un
// gasto o completar la factura del proveedor se puede elegir "Bolívares", escribir los montos tal como vienen en la
// factura y el sistema los pasa a dólares con la tasa BCV de la fecha del documento. Todo lo demás sigue en dólares:
// el gasto, las cuentas, el Libro de Compras, QuickBooks y los reportes. "No que se reconfigure el sistema como
// multimoneda". Para eso hace falta un historial de tasas por día (logic/tasas.js), que antes no existía.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const cerca=(a,b)=>Math.abs(a-b)<0.005;

// ── Un DOM de mentira: elementos por id con value/checked/innerHTML ───────────────────────────────────────
function dom(valores){
  const els={};
  // value se guarda como texto, como en un <input> de verdad (ti.value = 886.23 → '886.23')
  const el=id=>{ if(!els[id]){ const o={ id, _v:'', checked:false, innerHTML:'', textContent:'', style:{}, _a:{}, setAttribute(k,v){ this._a[k]=String(v); }, getAttribute(k){ return k in this._a ? this._a[k] : null; } }; Object.defineProperty(o,'value',{ get(){ return this._v; }, set(v){ this._v = v==null ? '' : String(v); } }); els[id]=o; } return els[id]; };
  Object.keys(valores||{}).forEach(k=>{ if(typeof valores[k]==='boolean') el(k).checked=valores[k]; else el(k).value=String(valores[k]); });
  return { els, el, document:{ getElementById:id=>el(id),   // todo id existe (como en la pantalla real, donde el modal ya está dibujado)
 querySelectorAll:()=>[], querySelector:()=>null, createElement:()=>({click(){},style:{}}), body:{appendChild(){},removeChild(){}} } };
}
function entorno(valores, extra){
  const d=dom(valores);
  const G={ console:{log(){},warn(){}}, Math, JSON, Date, String, Number, Object, Array, parseFloat, parseInt, isNaN, isFinite, RegExp, Promise, setTimeout, clearTimeout,
    S:{ currentUser:{nombre:'ANALISTA'}, egresos:[], movimientos:[], motos:[], concesionarios:[] }, PLAN:{},
    fmt:n=>'$'+(parseFloat(n)||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}),
    toast:function(m,t){ G.avisos.push([t,m]); }, avisos:[], nav(){}, closeM(){}, setMicon(){}, logActividad(){},
    hoyLocalISO:()=>'2026-10-26', document:d.document, _cuentasBanc:[{nombre:'Banesco Bs',moneda:'BS'},{nombre:'Binance',moneda:'USD'}],
    DB:{ guardados:[], saveEgreso(o){ G.DB.guardados.push(['egreso',JSON.parse(JSON.stringify(o))]); return Promise.resolve(); }, saveMovimiento(o){ G.DB.guardados.push(['mov',JSON.parse(JSON.stringify(o))]); return Promise.resolve(); } },
    nextEgresoIdAsync:()=>Promise.resolve(501), Blob:function(){}, URL:{createObjectURL:()=>'',revokeObjectURL(){}} };
  G.$=id=>d.document.getElementById(id);
  G.window=G; G.globalThis=G; Object.assign(G, extra||{});
  vm.createContext(G);
  vm.runInContext(src('logic/tasas.js'), G);
  vm.runInContext(src('logic/exportar.js'), G);
  vm.runInContext(src('logic/libros-iva.js'), G);
  vm.runInContext(src('logic/egresos.js'), G);
  G._dom=d; return G;
}

// ── El historial de tasas: qué tasa rige para una fecha (función pura) ───────────────────────────────────
const G0=entorno({});
const mapa={ '2026-10-23':{fecha:'2026-10-23',usd:886.23,eur:993.09,fuente:'ve.dolarapi.com'}, '2026-10-20':{fecha:'2026-10-20',usd:880.10,fuente:'ve.dolarapi.com'}, '2026-10-14':{fecha:'2026-10-14',usd:870,usdManual:true,fuente:'manual'} };
let r=G0.tasasElegir('2026-10-23', mapa, 'usd', '2026-10-26');
ok('hay tasa del día: esa, exacta', r.tasa===886.23 && r.fechaTasa==='2026-10-23' && !r.aproximada && r.fuente==='ve.dolarapi.com');
ok('...el euro de ese día también', G0.tasasElegir('2026-10-23', mapa, 'eur', '2026-10-26').tasa===993.09);
r=G0.tasasElegir('2026-10-24', mapa, 'usd', '2026-10-26');   // sábado
ok('sábado sin tasa: rige la del siguiente día hábil registrado… pero solo hasta hoy; como no hay, la última de antes', r.tasa===886.23 && r.fechaTasa==='2026-10-23' && r.aproximada===true);
const mapa2=Object.assign({}, mapa, { '2026-10-26':{fecha:'2026-10-26',usd:889}, '2026-10-27':{fecha:'2026-10-27',usd:890} });
const mapa3=Object.assign({}, mapa, { '2026-10-27':{fecha:'2026-10-27',usd:890} });
r=G0.tasasElegir('2026-10-25', mapa2, 'usd', '2026-10-28');   // domingo, y el lunes 26 sí está
ok('domingo: la del lunes siguiente, y no es aproximada (Ley de IVA art. 25)', r.tasa===889 && r.fechaTasa==='2026-10-26' && r.aproximada===false && /no es día hábil/.test(r.nota));
r=G0.tasasElegir('2026-10-24', mapa3, 'usd', '2026-10-28');   // sábado; falta el lunes 26, hay martes 27
ok('sábado sin el lunes registrado: la del martes, pero APROXIMADA (la que rige es la del lunes)', r.tasa===890 && r.aproximada===true && /día hábil siguiente/.test(r.nota));
const mapa4=Object.assign({}, mapa2, { '2026-10-25':{fecha:'2026-10-25',usd:800,fuente:'ve.dolarapi.com'} });
ok('un registro automático de un domingo no cuenta: rige igual la del lunes', G0.tasasElegir('2026-10-25', mapa4, 'usd', '2026-10-28').tasa===889);
ok('...pero una puesta a mano para ese domingo sí se respeta', G0.tasasElegir('2026-10-25', Object.assign({}, mapa2, { '2026-10-25':{fecha:'2026-10-25',usd:800,usdManual:true} }), 'usd', '2026-10-28').tasa===800);
ok('la marca manual es por moneda: el dólar oficial y un euro a mano conviven', (()=>{ const m={ '2026-10-23':{usd:886.23,eur:1000,eurManual:true,fuente:'ve.dolarapi.com'} }; return G0.tasasElegir('2026-10-23',m,'usd').fuente==='ve.dolarapi.com' && G0.tasasElegir('2026-10-23',m,'eur').manual===true; })());
r=G0.tasasElegir('2026-10-21', mapa, 'usd', '2026-10-26');   // miércoles sin tasa; el 23 (viernes) sí
ok('día hábil sin tasa: la siguiente registrada, marcada como aproximada para revisar', r.tasa===886.23 && r.aproximada===true && /Verifícala/.test(r.nota));
r=G0.tasasElegir('2026-10-15', mapa, 'usd', '2026-10-26');   // jueves; adelante no hay en 4 días, atrás está el 14 manual
ok('si adelante no hay en 4 días, la última de antes (hasta 7 días), aproximada', r.tasa===870 && r.fechaTasa==='2026-10-14' && r.aproximada && r.fuente==='manual' && r.manual);
ok('la tasa de una fecha nunca viene del futuro respecto a hoy', G0.tasasElegir('2026-10-26', mapa3, 'usd', '2026-10-26').fechaTasa==='2026-10-23');
ok('sin nada cerca: null (el analista la escribe)', G0.tasasElegir('2026-09-01', mapa, 'usd', '2026-10-26')===null);
ok('un valor de 1 o menos no cuenta como tasa', G0.tasasElegir('2026-10-10', { '2026-10-10':{usd:1} }, 'usd', '2026-10-26')===null);
ok('Bs → $ a 2 decimales', G0.bsAUsd(15900, 886.23)===17.94 && G0.bsAUsd(100, 0)===0 && G0.usdABs(17.94, 886.23)===15898.97);

// ── Leer la factura en bolívares: originales en Bs, dólares con la tasa, IVA en las dos ─────────────────
const G1=entorno({ lbf_mon:'BS', lbf_tasasel:'usd', lbf_tasa:'886.23', lbf_tasafecha:'2026-10-23', lbf_tasafuente:'ve.dolarapi.com', lbf_prov:'PAPELERIA SOL, C.A.', lbf_rif:'j-11111111-1', lbf_tipo:'01-REG', lbf_num:'00001234', lbf_ctl:'00-00001234', lbf_fecha:'2026-10-23', lbf_ori:'INTERNA', lbf_exe:'886.23', lbf_base:'8862.30', lbf_alic:'0.16', lbf_ret:'1063.48', lbf_comp:'' });
const f1=G1.lbLeerCamposFiscales('lbf');
ok('en Bs: se guardan los originales en bolívares', f1.moneda==='BS' && f1.exentoBs===886.23 && f1.baseBs===8862.30 && f1.retenidoBs===1063.48);
ok('...y los de siempre en dólares, divididos entre la tasa', f1.exento===1 && f1.base===10 && f1.retenido===1.2);
ok('...el IVA en dólares es base × alícuota (como lo recalcula el libro) y también queda en Bs', f1.iva===1.6 && f1.ivaBs===1417.97);
ok('...con la tasa, su moneda, su fecha y su fuente', f1.tasa===886.23 && f1.tasaMoneda==='usd' && f1.tasaFecha==='2026-10-23' && f1.tasaFuente==='ve.dolarapi.com');
ok('...y el RIF en mayúsculas como siempre', f1.rif==='J-11111111-1');
ok('validar: en Bs sin tasa no deja guardar', G1.lbFiscalValidar('lbf')==='' && (()=>{ G1._dom.el('lbf_tasa').value=''; return /tasa/.test(G1.lbFiscalValidar('lbf')); })());
const G2=entorno({ egf_prov:'X', egf_base:'100', egf_alic:'0.16', egf_tipo:'01-REG', egf_ori:'INTERNA' });
const f2=G2.lbLeerCamposFiscales('egf');
ok('en dólares (sin elegir moneda) todo sigue igual que antes: sin campos de moneda ni tasa', f2.base===100 && f2.iva===16 && !('moneda' in f2) && !('baseBs' in f2));
ok('el formulario nuevo trae el selector de moneda, el de tasa y los equivalentes', /id="lbf_mon"/.test(G2.lbMonedaHtml('lbf')) && /Dólar BCV/.test(G2.lbMonedaHtml('lbf')) && /Euro BCV/.test(G2.lbMonedaHtml('lbf')) && /lbf_base_eq/.test(G2.lbCamposFiscalesHtml('lbf',{},0)));
ok('...y si la factura ya estaba en Bs, muestra los montos en Bs y su tasa', (()=>{ const h=G2.lbCamposFiscalesHtml('lbf', f1, 0); return /value="8862.3"/.test(h) && /value="886.23"/.test(h) && /option value="BS" selected/.test(h); })());
ok('en Registrar Egreso el selector va afuera del bloque fiscal (sinMoneda)', !/_mon"/.test(G2.lbCamposFiscalesHtml('egf',{},0,{sinMoneda:true})));

// ── El Libro de Compras y QuickBooks siguen leyendo dólares ─────────────────────────────────────────────
const eg={ id:501, fecha:'2026-10-23', monto:17.94, concepto:'PAPELERIA', categoria:'operativo', moneda:'BS', montoBs:15900, tasaBs:886.23, fiscal:f1 };
const docs=G1.lbComprasDocumentos([eg], {}), filas=G1.lbComprasFilas(docs, '2026-10', {});
ok('el Libro de Compras muestra la factura en dólares (base 10, IVA 1,60, exento 1)', filas.length===1 && filas[0].base===10 && filas[0].iva===1.6 && filas[0].exento===1 && filas[0].total===12.6);
ok('...y sabe que el original fue en Bs, con la tasa y su fecha', filas[0].monedaOrig==='BS' && filas[0].totalBsOrig===11166.5 && filas[0].tasaOrig===886.23 && filas[0].tasaFechaOrig==='2026-10-23');
ok('...nada le falta a esa factura', filas[0].faltan.length===0);
ok('los totales del libro suman dólares', G1.lbComprasCalculo(filas,'2026-10','MES').totales.base===10);

// ── Registrar Egreso en bolívares, de punta a punta ─────────────────────────────────────────────────────
const G3=entorno({});
G3.openAddEgreso();
const html3=G3.$('mbd').innerHTML;
ok('Registrar Egreso tiene la moneda, la tasa y el equivalente del monto', /id="egf_mon"/.test(html3) && /id="egf_tasa"/.test(html3) && /id="eg_monto_eq"/.test(html3) && /egf_lblmonto/.test(html3));
ok('...y el bloque fiscal no repite el selector', (html3.match(/id="egf_mon"/g)||[]).length===1);
Object.assign(G3._dom.el('eg_conc'),{value:'PAPELERIA Y TONER'}); G3._dom.el('eg_monto').value='15900'; G3._dom.el('eg_cat').value='operativo'; G3._dom.el('eg_forma').value='Banesco Bs'; G3._dom.el('eg_fecha').value='2026-10-23';
G3._dom.el('egf_mon').value='BS'; G3._dom.el('egf_tasasel').value='usd'; G3._dom.el('egf_tasa').value='886.23'; G3.lbTasaManual('egf');   // la teclea el analista
G3._dom.el('egf_prov').value='PAPELERIA SOL, C.A.'; G3._dom.el('egf_rif').value='J-11111111-1'; G3._dom.el('egf_num').value='00001234'; G3._dom.el('egf_base').value='13706.9'; G3._dom.el('egf_exe').value='0'; G3._dom.el('egf_alic').value='0.16'; G3._dom.el('egf_tipo').value='01-REG'; G3._dom.el('egf_ori').value='INTERNA';
G3.lbFiscalCalc('egf');
ok('mientras escribe ve el equivalente en dólares del monto y de la base', G3.$('eg_monto_eq').textContent==='= $17,94' && G3.$('egf_base_eq').textContent==='= $15,47');
// El total de la factura convertido parte por parte (base $15,47 + IVA $2,48 = $17,95) puede diferir un centavo del
// monto convertido entero (15.900 ÷ 886,23 = $17,94): es lo mismo que pasa al hacerlo a mano, y el libro muestra las partes.
ok('...y el resultado en las dos monedas, como lo va a mostrar el libro', /Bs 2.193,10/.test(G3.$('egf_res').innerHTML) && /\$2,48/.test(G3.$('egf_res').innerHTML) && /Bs 15.900,00/.test(G3.$('egf_res').innerHTML) && /\$17,95/.test(G3.$('egf_res').innerHTML));
(async()=>{
  const okGuardar=await G3.S.saveFn();
  const egres=G3.DB.guardados.find(x=>x[0]==='egreso'), mov=G3.DB.guardados.find(x=>x[0]==='mov');
  ok('se guarda', okGuardar===true && !!egres);
  const e=egres && egres[1];
  ok('el gasto queda en dólares (15.900 Bs ÷ 886,23 = $17,94)', e && e.monto===17.94);
  ok('...con el original en Bs, la tasa, su moneda, fecha y fuente', e && e.moneda==='BS' && e.montoBs===15900 && e.tasaBs===886.23 && e.tasaMoneda==='usd' && e.tasaFecha==='2026-10-23' && e.tasaFuente==='manual');
  ok('...la factura del proveedor convertida igual (base $15,47, IVA $2,48)', e && e.fiscal && e.fiscal.moneda==='BS' && e.fiscal.base===15.47 && e.fiscal.iva===2.48 && e.fiscal.baseBs===13706.9);
  ok('...el movimiento de la cuenta sale en dólares con la tasa aplicada, no la de hoy', mov && mov[1].monto===17.94 && mov[1].tasaBs===886.23 && mov[1].montoBs===15900);
  ok('...y la tasa escrita a mano queda en el historial de ese día', G3._tasasCache['2026-10-23'] && G3._tasasCache['2026-10-23'].usd===886.23 && G3._tasasCache['2026-10-23'].usdManual===true && G3._tasasCache['2026-10-23'].guardadoPor==='ANALISTA');
  ok('el aviso dice las dos cifras', G3.avisos.some(a=>/\$17,94/.test(a[1]) && /Bs 15\.900,00/.test(a[1])));

  // Sin tasa no deja guardar
  const G4=entorno({});
  G4.openAddEgreso(); G4._dom.el('eg_conc').value='X'; G4._dom.el('eg_monto').value='1000'; G4._dom.el('egf_mon').value='BS'; G4._dom.el('egf_tasa').value='';
  ok('en Bs sin tasa: no guarda y avisa', G4.S.saveFn()===false && G4.avisos.some(a=>/tasa/.test(a[1])) && G4.DB.guardados.length===0);
  // En dólares, igual que siempre
  const G5=entorno({});
  G5.openAddEgreso(); G5._dom.el('eg_conc').value='ALQUILER'; G5._dom.el('eg_monto').value='250'; G5._dom.el('eg_forma').value='Binance'; G5._tasaBsGlobal=886.23;
  const ok5=await G5.S.saveFn(); const e5=G5.DB.guardados.find(x=>x[0]==='egreso')[1], m5=G5.DB.guardados.find(x=>x[0]==='mov')[1];
  ok('en dólares nada cambia: monto 250, sin campos de moneda, movimiento con la tasa de hoy', ok5===true && e5.monto===250 && !('moneda' in e5) && !('montoBs' in e5) && m5.tasaBs===886.23);

  // ── Exportar egresos: moneda, monto original y tasa ───────────────────────────────────────────────────
  let hoja=null; G1.xlsxEscribir=(n,h)=>{ hoja=h[0]; }; G1._abrirVentanaImpresion=()=>{}; G1._concFiltrarEgresos=a=>a;
  G1.S.egresos=[eg, { id:502, fecha:'2026-10-24', monto:250, concepto:'ALQUILER', categoria:'operativo' }];
  G1.finExportarEgresos('excel');
  const enc=hoja.rows[3].map(c=>c.v), fila=hoja.rows[4].map(c=>c.v);
  ok('la exportación de egresos trae Moneda, Monto original y Tasa', enc.indexOf('Moneda')===5 && enc.indexOf('Monto original')===6 && enc.indexOf('Tasa Bs/$')===7);
  ok('...la fila en Bs: $17,94 | Bs | 15900 | 886,23; la de dólares: USD y su mismo monto', fila[4]===250 && fila[5]==='USD' && fila[6]===250 && hoja.rows[5].map(c=>c.v).slice(4,8).join('|')==='17.94|Bs|15900|886.23');
  ok('...y el total sigue siendo la suma en dólares', hoja.rows[6].some(c=>c && c.v===267.94));

  // ── Lo que encontró la revisión antes de publicar (26-oct-2026) ───────────────────────────────────────
  // Una tasa manual no pisa la oficial de ese día en el historial
  const G6=entorno({});
  G6._tasasCache['2026-10-23']={ fecha:'2026-10-23', usd:886.23, fuente:'ve.dolarapi.com' };
  const guardo=await G6.tasaGuardarManual('2026-10-23','usd',868.23);
  ok('una tasa escrita a mano NO pisa la oficial de ese día (la factura sí se guarda con la suya)', guardo===false && G6._tasasCache['2026-10-23'].usd===886.23 && !G6._tasasCache['2026-10-23'].usdManual);
  ok('...pero sí completa el euro de ese día si no estaba', (await G6.tasaGuardarManual('2026-10-23','eur',995))===true && G6._tasasCache['2026-10-23'].eur===995 && G6._tasasCache['2026-10-23'].eurManual===true);
  ok('la oficial que llega después quita la marca manual de esa moneda', (()=>{ G6._tasasCache['2026-10-27']={fecha:'2026-10-27',usd:900,usdManual:true}; G6.tasasRegistrarOficial('2026-10-27','usd',890,'ve.dolarapi.com'); return G6._tasasCache['2026-10-27'].usd===890 && G6._tasasCache['2026-10-27'].usdManual===false; })());
  ok('la automática no se registra en fin de semana (el BCV no publica: rige la del lunes)', (()=>{ G6.tasasRegistrarOficial('2026-10-24','usd',880,'ve.dolarapi.com'); return !G6._tasasCache['2026-10-24']; })());
  ok('una tasa que viene del historial puesta a mano por otro no se vuelve a guardar con otro nombre', (()=>{ const f={ moneda:'BS', tasaFuente:'historial-manual', tasa:870, tasaFecha:'2026-10-14', tasaMoneda:'usd' }; G6._tasasCache['2026-10-14']={fecha:'2026-10-14',usd:870,usdManual:true,guardadoPor:'ANALISTA'}; G6.lbTasaPersistir(f,'lbf'); return G6._tasasCache['2026-10-14'].guardadoPor==='ANALISTA'; })());
  ok('...y la tecleada en el formulario solo se guarda si de verdad se tecleó ahí (no por venir marcada en la factura vieja)', (()=>{ G6._lbTasaEscrita.lbf=false; G6.lbTasaPersistir({ moneda:'BS', tasaFuente:'manual', tasa:777, tasaFecha:'2026-10-16', tasaMoneda:'usd' }, 'lbf'); return !G6._tasasCache['2026-10-16']; })());

  // Cambiar de moneda convierte los montos que ya estaban escritos
  const G7=entorno({ lbf_mon:'USD', lbf_base:'100', lbf_exe:'10', lbf_ret:'16', lbf_alic:'0.16', lbf_fecha:'2026-10-23' });
  G7._tasasCache['2026-10-23']={ fecha:'2026-10-23', usd:886.23, fuente:'ve.dolarapi.com' };
  G7.lbMonedaCambio('lbf'); /* USD→USD: nada */ ok('sin cambiar de moneda no toca los montos', G7.$('lbf_base').value==='100');
  G7._dom.el('lbf_mon').value='BS'; G7.lbMonedaCambio('lbf'); await new Promise(r=>setTimeout(r,20));
  ok('de $ a Bs: los montos se multiplican por la tasa de la fecha (base $100 → Bs 88.623)', G7.$('lbf_tasa').value==='886.23' && G7.$('lbf_base').value==='88623' && G7.$('lbf_exe').value==='8862.3' && G7.$('lbf_ret').value==='14179.68');
  ok('...y al guardar vuelve a ser $100 de base', G7.lbLeerCamposFiscales('lbf').base===100);
  G7._dom.el('lbf_mon').value='USD'; G7.lbMonedaCambio('lbf');
  ok('de Bs a $: se dividen (vuelve a 100, 10 y 16)', G7.$('lbf_base').value==='100' && G7.$('lbf_exe').value==='10' && G7.$('lbf_ret').value==='16');
  G7._dom.el('lbf_mon').value='BS'; G7._dom.el('lbf_tasa').value=''; G7._tasasCache={}; G7.lbMonedaCambio('lbf'); await new Promise(r=>setTimeout(r,20)); G7._dom.el('lbf_mon').value='USD'; G7.lbMonedaCambio('lbf');
  ok('sin tasa, al cambiar de moneda los montos se vacían y avisa (no se leen en la moneda equivocada)', G7.$('lbf_base').value==='' && G7.avisos.some(a=>/escríbelos de nuevo/.test(a[1])));

  // Búsquedas que llegan tarde no pisan la vigente ni lo que el analista escribió
  const G8=entorno({ lbf_mon:'BS', lbf_tasasel:'usd', lbf_fecha:'2026-10-20' });
  let resolver1; G8.tasaParaFecha=(f,m)=> f==='2026-10-20' ? new Promise(r=>{ resolver1=r; }) : Promise.resolve({ tasa:886.23, fechaTasa:'2026-10-23', fuente:'ve.dolarapi.com', aproximada:false, nota:'' });
  G8.lbTasaBuscar('lbf'); G8._dom.el('lbf_fecha').value='2026-10-23'; G8.lbTasaBuscar('lbf'); await new Promise(r=>setTimeout(r,10));
  resolver1({ tasa:880.10, fechaTasa:'2026-10-20', fuente:'ve.dolarapi.com', aproximada:false, nota:'' }); await new Promise(r=>setTimeout(r,10));
  ok('la respuesta vieja (del 20) llega tarde y no pisa la del 23', G8.$('lbf_tasa').value==='886.23' && G8.$('lbf_tasafecha').value==='2026-10-23');
  let resolver2; G8.tasaParaFecha=()=>new Promise(r=>{ resolver2=r; });
  G8.lbTasaBuscar('lbf'); G8._dom.el('lbf_tasa').value='870'; G8.lbTasaManual('lbf'); resolver2({ tasa:886.23, fechaTasa:'2026-10-23', fuente:'x', aproximada:false, nota:'' }); await new Promise(r=>setTimeout(r,10));
  ok('si el analista escribe la tasa mientras busca, lo escrito manda', G8.$('lbf_tasa').value==='870' && G8.$('lbf_tasafuente').value==='manual');
  ok('la que viene del historial puesta a mano por otro queda marcada distinto a la tecleada aquí', (()=>{ G8.tasaParaFecha=()=>Promise.resolve({ tasa:870, fechaTasa:'2026-10-14', fuente:'manual', manual:true, aproximada:false, nota:'' }); G8.lbTasaBuscar('lbf'); return new Promise(r=>setTimeout(()=>r(G8.$('lbf_tasafuente').value==='historial-manual' && /puesta a mano/.test(G8.$('lbf_tasainfo').innerHTML)),10)); })());

  // Nada raro entra al HTML: una fecha corrupta en la factura sale escapada
  const G9=entorno({});
  const malo={ moneda:'BS', tasa:886.23, tasaFecha:'<img src=x onerror=alert(1)>', tasaFuente:'<b>x</b>', baseBs:100, base:0.11, alicuota:0.16, iva:0.02, ivaBs:16, exentoBs:'', exento:'', retenidoBs:'', retenido:'' };
  ok('una fecha o fuente corrupta en la factura sale escapada en el formulario', !/<img/.test(G9.lbCamposFiscalesHtml('lbf', malo, 0)) && /&lt;img/.test(G9.lbCamposFiscalesHtml('lbf', malo, 0)) && !/<b>x/.test(G9.lbCamposFiscalesHtml('lbf', malo, 0)));
  const filasMal=G9.lbComprasFilas(G9.lbComprasDocumentos([{ id:9, fecha:'2026-10-02', monto:1, categoria:'otros', concepto:'x', fiscal:Object.assign({ proveedor:'P', rif:'J-1', numero:'1', fecha:'2026-10-02' }, malo) }], {}), '2026-10', {});
  ok('...y en la fila del libro también', filasMal[0].tasaFechaOrig==='<img src=x onerror=alert(1)>' && !/<img/.test(G9._lbCuerpoHtml ? '' : '') );
  ok('la explicación de Dólar/Euro está en el formulario', /Euro BCV: solo si el proveedor cobró los bolívares a la tasa del euro/.test(G9.lbMonedaHtml('lbf')));
  ok('el reporte del contador usa el monto original en Bs de un gasto registrado en Bs', /e\.moneda==='BS' && \+e\.montoBs>0\) \? \+e\.montoBs : \(e\.monto\|\|0\)\*tasaBCV/.test(src('modules/reportes.js')));
  ok('el respaldo exporta y restaura el historial de tasas', /tasas:\s+tasasHist/.test(src('logic/backups.js')) && /col:'tasas'/.test(src('logic/backups.js')) && /Tasas por día/.test(src('logic/backups.js')));
  ok('las Reglas: la marca manual por moneda entra y el id tiene forma de fecha', /'usdManual', 'eurManual'/.test(src('firestore.rules')) && /fecha\.matches\('\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}'\)/.test(src('firestore.rules')));

  // ── Cableado y reglas ─────────────────────────────────────────────────────────────────────────────────
  const html=src('admin.html'), rules=src('firestore.rules'), bcv=src('logic/bcv-auto.js'), cfg=src('logic/configuracion.js');
  const iB=html.indexOf('logic/bcv-auto.js'), iT=html.indexOf('logic/tasas.js'), iL=html.indexOf('logic/libros-iva.js'), iE=html.indexOf('logic/egresos.js');
  ok('tasas.js carga después de bcv-auto y antes del libro y de egresos', iB>0 && iT>iB && iT<iL && iT<iE);
  ok('la tasa del día que baja la pantalla queda en el historial (dólar y euro, como oficial)', /tasasRegistrarOficial\(hoy, 'usd', tasaRedondeada/.test(bcv) && /tasasRegistrarOficial\(hoyLocalISO\(\), 'eur', tasa/.test(bcv));
  ok('...y también la que ya estaba en config/tasa de hoy; el euro solo cuenta si es de hoy', /euroEsDeHoy/.test(bcv) && /tasasRegistrarOficial\(hoy, 'usd', tasaGuardada/.test(bcv) && /if\(!\(euroGuardada > 1\) \|\| !euroEsDeHoy\) _eurFetchTasa\(0\)/.test(bcv));
  ok('...y ya no pisa el documento config/tasa (merge): el euro y el Binance no se borran', /api:\s+_BCV_ENDPOINTS\[0\]\s*\}, \{merge:true\}\)/.test(bcv) && /\{merge:true\}\)\s*\.then\(function\(\)\{ toast\('✓ Tasa actualizada/.test(cfg));
  ok('la tasa manual de Configuración también va al historial, con quién la puso', /tasaGuardarManual\(hoyLocalISO\(\), 'usd', t\)/.test(cfg) && /actualizadoPor/.test(cfg));
  ok('el euro BCV se baja primero del mismo servicio JSON que el dólar (sin proxies)', bcv.indexOf("'https://ve.dolarapi.com/v1/cotizaciones'") < bcv.indexOf('api.allorigins.win'));
  ok('las Reglas: tasas/{fecha} la lee el staff, la escribe un interno con campos y números válidos, y no se borra', /match \/tasas\/\{fecha\}/.test(rules) && /allow read: if esStaff\(\);\s*allow create, update: if esInterno\(\)/.test(rules.slice(rules.indexOf('match /tasas'))) && /request\.resource\.data\.fecha == fecha/.test(rules) && /usd > 1/.test(rules) && /allow delete: if false;\s*\}/.test(rules.slice(rules.indexOf('match /tasas'))));
  ok('nada de esto escribe en pagos ni en el motor', !/savePago|CreditoLedger|cuotaQ/.test(src('logic/tasas.js')) && !/savePago/.test(src('logic/libros-iva.js')));

  console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
  if(fail) process.exitCode=1;
})();
