// 23-sep-2026, Adam: "al pagasi 18 necesito que le pongas un color azul de fondo para
// diferenciar... ya que me he confundido como 3 veces".
// Con razón: las dos copias son el MISMO código. Mismos nombres de archivo, mismo diseño
// y hasta el mismo título de pestaña. Con las dos abiertas no había forma de saber en
// cuál estabas hasta después de guardar algo en la compañía equivocada.
// La marca sale de la BASE a la que está conectado, no del repositorio ni del dominio:
// si alguien abre una copia apuntando a otra base, se ve al instante.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const app=src('assets/pagasi-app.js'), css=src('assets/pagasi.css');

// ── Corriendo de verdad, con cada base ──────────────────────────────────────
function arrancar(projectId){
  const html={ atributos:{}, setAttribute(k,v){ this.atributos[k]=v; } };
  let logo=null;
  const G={ console:{log(){},warn(){}}, String, Object,
    FIREBASE_CONFIG:{ projectId: projectId },
    document:{ documentElement: html, title:'Pagasi — Sistema de Crédito',
      addEventListener(ev,fn){ if(ev==='DOMContentLoaded') this._listo=fn; },
      querySelector(sel){ return sel==='.sb-logo' ? logo : null; },
      createElement(){ return { className:'', textContent:'' }; } },
    window:{} };
  logo={ hijos:[], appendChild(x){ this.hijos.push(x); }, querySelector(){ return this.hijos[0]||null; } };
  G.window=G; vm.createContext(G);
  vm.runInContext(app.slice(app.indexOf('var _EMPRESAS_MARCA'), app.indexOf('// ── COMO SE NUMERAN LOS CREDITOS')), G);
  if(G.document._listo) G.document._listo();
  return { marca:html.atributos['data-empresa'], titulo:G.document.title,
           rotulo: logo.hijos.length ? logo.hijos[0].textContent : '',
           clase: logo.hijos.length ? logo.hijos[0].className : '' };
}

const r18=arrancar('pagasi-v2');
ok('conectado a la base de PAGASI 18, la pantalla se marca como 18', r18.marca==='18');
ok('...la pestaña dice de quién es', r18.titulo.indexOf('PAGASI 18')===0);
ok('...y lo dice también donde se mira sin querer, bajo el logo', r18.rotulo.indexOf('PAGASI 18')===0);
ok('...con la clase que el CSS pinta', r18.clase==='sb-empresa');
ok('...y dice que es la de cobranza', /Cobranza/.test(r18.titulo) && /Cobranza/.test(r18.rotulo));

const r26=arrancar('pagasi26-65ced');
ok('conectado a la base de PAGASI 26, se marca como 26', r26.marca==='26');
ok('...y la pestaña la nombra', r26.titulo.indexOf('PAGASI 26')===0);
ok('las dos pestañas ya no se llaman igual', r18.titulo!==r26.titulo);

const rX=arrancar('otro-proyecto-cualquiera');
ok('una base desconocida no se pinta de nada', !rX.marca);
ok('...y no toca el título', rX.titulo==='Pagasi — Sistema de Crédito');

// ── El color ────────────────────────────────────────────────────────────────
ok('PAGASI 18 va sobre azul', /:root\[data-empresa="18"\] \{[\s\S]*?--bg: #DCE8FB;/.test(css));
ok('...su barra lateral también', /:root\[data-empresa="18"\] \.sb \{ background: #CFE0F9; \}/.test(css));
ok('...y en modo oscuro no se queda en blanco', /\[data-theme="dark"\]:root\[data-empresa="18"\] \{[\s\S]*?--bg: #0E1730;/.test(css));
ok('la compañía nueva se queda con el fondo de siempre', css.indexOf('[data-empresa="26"]')===-1);
ok('el rótulo bajo el logo tiene estilo propio', /\.sb-empresa \{/.test(css));
ok('...y la caja del logo lo deja caber debajo', /\.sb-logo \{[\s\S]*?flex-direction: column;/.test(css));

// ── Lo que hace que esto no mienta ──────────────────────────────────────────
ok('la marca se decide por el proyecto de Firebase, no por el dominio',
  /_EMPRESAS_MARCA\[String\(\(FIREBASE_CONFIG\|\|\{\}\)\.projectId\|\|''\)\]/.test(app));
ok('...y no se mira location.host en ningún lado de esa decisión',
  !/data-empresa[\s\S]{0,300}location\.(host|origin)/.test(app));
ok('el rótulo no se duplica si la función corre dos veces',
  /caja\.querySelector\('\.sb-empresa'\)\) return;/.test(app));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
