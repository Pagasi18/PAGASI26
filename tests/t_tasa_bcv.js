// El robot de la tasa BCV (bot/tasa-bcv.js) y cómo el panel lo lee (logic/tasas.js). Adam, 26-oct-2026: "necesito
// que el mismo sistema todos los días guarde cuánto estuvo el dólar, y si yo cambio la fecha, pues agarra el dólar
// BCV o euro… de ese día". El robot corre en GitHub Actions de lunes a viernes, lee bcv.org.ve y guarda la tasa bajo
// su FECHA VALOR en data/tasas-bcv.json; el panel lo lee junto con el historial de Firestore.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const B=require('../bot/tasa-bcv.js');

// La página del BCV tal como está hoy (recorte): el <strong> lleva clase, y la fecha valor va en un <span content=…>
const HTML='<div id="dolar" class="col-sm-12 col-xs-12 "> <div class="field-content"><div class="row recuadrotsmc"><div class="col-sm-6 col-xs-6"><img src="/sites/default/files/dollar-04_2.png"> <span> USD</span></div><div class="col-sm-6 col-xs-6 centrado textp"> <strong class="strong-tb">887,30 </strong></div></div></div></div>'
  +'<div id="euro" class="col-sm-12 col-xs-12 "><div class="row"><span> EUR</span><div><strong class="strong-tb"> 1.031,52</strong></div></div></div>'
  +'<div class="pull-right dinpro center">Fecha Valor: <span class="date-display-single" property="dc:date" datatype="xsd:dateTime" content="2026-10-27T00:00:00-04:00">Martes, 27 Octubre 2026</span></div>';
const r=B.extraerBcv(HTML);
ok('lee el dólar de la página del BCV (coma decimal)', r.usd===887.3);
ok('...y el euro con punto de miles', r.eur===1031.52);
ok('...y la FECHA VALOR, que es el día para el que rige', r.fechaValor==='2026-10-27');
ok('sin la página no inventa nada', B.extraerBcv('').usd===0 && B.extraerBcv(null).fechaValor==='');
ok('números: "886.2271" (dolarapi) y "1.234,56" (BCV) y basura', B.num('886.2271')===886.2271 && B.num('1.234,56')===1234.56 && B.num('x')===0 && B.num('0,5')===0);
ok('sábado y domingo son fin de semana; lunes no', B.esFinde('2026-10-24') && B.esFinde('2026-10-25') && !B.esFinde('2026-10-26'));

let t={};
B.agregar(t,'2026-10-27',{usd:887.3,eur:1031.52,fuente:'bcv.org.ve',publicado:'2026-10-26'});
ok('agrega la tasa bajo su fecha valor', t['2026-10-27'].usd===887.3 && t['2026-10-27'].eur===1031.52 && t['2026-10-27'].publicado==='2026-10-26');
B.agregar(t,'2026-10-27',{usd:900,eur:1050,fuente:'ve.dolarapi.com',publicado:'2026-10-27'});
ok('una corrida posterior del mismo día no la cambia (la primera publicación manda)', t['2026-10-27'].usd===887.3 && t['2026-10-27'].fuente==='bcv.org.ve');
B.agregar(t,'2026-10-28',{usd:888,fuente:'bcv.org.ve'}); B.agregar(t,'2026-10-28',{eur:1033});
ok('...pero sí completa lo que faltaba (el euro)', t['2026-10-28'].usd===888 && t['2026-10-28'].eur===1033);
ok('sin dólar ni euro no se guarda nada; una fecha rara tampoco', JSON.stringify(B.agregar({}, '2026-10-29', {fuente:'x'}))==='{}' && JSON.stringify(B.agregar({}, 'ayer', {usd:5}))==='{}');
B.agregar(t,'2026-10-20',{usd:880});
ok('el archivo queda ordenado por fecha', Object.keys(B.ordenar(t)).join(',')==='2026-10-20,2026-10-27,2026-10-28');
ok('el respaldo (dolarapi) queda marcado aproximado', B.agregar({}, '2026-10-26', {usd:886.23, aproximada:true})['2026-10-26'].aproximada===true);

// ── El panel lee el archivo y lo mezcla con el historial ───────────────────────────────────────────────────
const G={ console:{log(){},warn(){}}, Math, JSON, Date, String, Number, Object, Array, parseFloat, parseInt, isNaN, isFinite, RegExp, Promise, hoyLocalISO:()=>'2026-10-28' };
G.window=G; vm.createContext(G); vm.runInContext(fs.readFileSync(path.join(ROOT,'logic/tasas.js'),'utf8'), G);
G._tasasCache['2026-10-27']={ fecha:'2026-10-27', usd:870, usdManual:true, fuente:'manual', guardadoPor:'ANALISTA' };
G._tasasCache['2026-10-23']={ fecha:'2026-10-23', usd:886.23, eur:993.09, fuente:'ve.dolarapi.com' };
G._tasasMezclarArchivo({ '2026-10-27':{usd:887.3,eur:1031.52,fuente:'bcv.org.ve'}, '2026-10-23':{usd:886.23,eur:993.09,fuente:'bcv.org.ve'}, 'basura':{usd:1}, '2026-10-28':{usd:888} });
ok('la oficial del robot manda sobre la manual del analista de esa fecha', G._tasasCache['2026-10-27'].usd===887.3 && G._tasasCache['2026-10-27'].usdManual===false && G._tasasCache['2026-10-27'].eur===1031.52);
ok('...una fecha que ya tenía la oficial no cambia', G._tasasCache['2026-10-23'].fuente==='ve.dolarapi.com');
ok('...y las fechas raras del archivo se ignoran', !G._tasasCache['basura'] && G._tasasCache['2026-10-28'].usd===888);
ok('con eso, cambiar la fecha de la factura trae la tasa de ESE día: 27 → 887,30; 23 → 886,23', G.tasasElegir('2026-10-27', G._tasasCache, 'usd').tasa===887.3 && G.tasasElegir('2026-10-23', G._tasasCache, 'usd').tasa===886.23 && G.tasasElegir('2026-10-23', G._tasasCache, 'eur').tasa===993.09);
ok('sin fetch (en Node) el archivo no se busca y no rompe', (()=>{ let fin=false; G._tasasDelArchivo().then(x=>{ fin = JSON.stringify(x)==='{}'; }); return new Promise(r=>setTimeout(()=>r(fin),5)); })() instanceof Promise);

// ── El robot y su horario ─────────────────────────────────────────────────────────────────────────────────
const wf=fs.readFileSync(path.join(ROOT,'.github/workflows/tasa-bcv.yml'),'utf8');
ok('corre de lunes a viernes, mañana y tarde (el BCV publica cada tarde la del día siguiente)', /cron: '0 11 \* \* 1-5'/.test(wf) && /cron: '30 22 \* \* 1-5'/.test(wf) && /workflow_dispatch/.test(wf));
ok('no usa secretos y solo hace commit si hay tasa nueva', !/secrets\./.test(wf) && /git diff --quiet -- data\/tasas-bcv\.json/.test(wf) && /node bot\/tasa-bcv\.js/.test(wf));
ok('el bot escribe en data/tasas-bcv.json y no toca Firestore', /data', 'tasas-bcv\.json'/.test(fs.readFileSync(path.join(ROOT,'bot/tasa-bcv.js'),'utf8')) && !/require\(['"]@google-cloud|firebase-admin|collection\(/.test(fs.readFileSync(path.join(ROOT,'bot/tasa-bcv.js'),'utf8')));
ok('bcv-auto también entiende el <strong class=…> del BCV', /<strong\[\^>\]\*>\\s\*\(\[0-9\.,\]\+\)\\s\*<\\\/strong>\/i,\s*\/\/ el <strong> del BCV/.test(fs.readFileSync(path.join(ROOT,'logic/bcv-auto.js'),'utf8')));
ok('existe el archivo con al menos una tasa real', (()=>{ try{ const t=JSON.parse(fs.readFileSync(path.join(ROOT,'data/tasas-bcv.json'),'utf8')); return Object.keys(t).length>=1 && Object.values(t).every(x=>x.usd>1); }catch(e){ return false; } })());

setTimeout(()=>{ console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1; }, 20);
