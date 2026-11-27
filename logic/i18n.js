// Idiomas del panel (27-nov-2026, Adam: "vuelve el sistema admin multilenguajes... el nuevo idioma inglés").
//
// El panel está escrito en español en cientos de sitios. En vez de tocar cada pantalla,
// esto traduce LO QUE SE VE: mira el texto que ya está pintado y, si el usuario tiene otro
// idioma, lo cambia por su traducción del diccionario (assets/i18n-en.js). Nada de la
// lógica, de los datos guardados ni de los cálculos pasa por aquí.
//
// Lo que NO se traduce, a propósito:
//  - Lo que escribe la gente (nombres, notas, campos de texto).
//  - Contratos, recibos, PDF y Excel: se arman en otra ventana o en un archivo, en español.
//  - Los mensajes que se le mandan al cliente.
//  - Cualquier bloque marcado con data-noi18n.
//
// El idioma vive en la ficha del usuario (usuarios/{uid}.idioma: 'es' | 'en'). Sin dato = español.
var PG_IDIOMAS = { es: 'Español', en: 'English' };
var _i18n = { idioma: 'es', dic: null, plantillas: null, ancla: null, cache: null, cargando: {}, obs: null, orig: null, pend: null };

function pgIdiomaValido(c){ return Object.prototype.hasOwnProperty.call(PG_IDIOMAS, c) ? c : 'es'; }
function pgIdiomaActual(){ return _i18n.idioma; }

// ── Traducción de un texto (función pura: la usan las pruebas) ─────────────────────────────
function _i18nNorm(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function _i18nLetras(s){ return (String(s).match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length; }
// Un dato "de número": cifra, monto, fecha, porcentaje. Las plantillas con poco texto fijo
// ("{0} de {1}") solo se aplican si lo que llenan es así, para no traducir "Juan de Dios".
function _i18nEsNumero(s){ return /^[\s$€%#.,:\/\-+()\dBsUSDx×]*\d[\s$€%#.,:\/\-+()\dBsUSDx×]*$/.test(s); }

var _I18N_VACIAS = { de:1, del:1, la:1, el:1, los:1, las:1, en:1, y:1, o:1, a:1, al:1, por:1, con:1, un:1, una:1, para:1, se:1, su:1, es:1, que:1, no:1, si:1 };

// Fechas que arma el navegador en español ("vie, 27 nov.", "noviembre de 2026").
var _I18N_MES = { enero:'January', febrero:'February', marzo:'March', abril:'April', mayo:'May', junio:'June', julio:'July', agosto:'August', septiembre:'September', setiembre:'September', octubre:'October', noviembre:'November', diciembre:'December',
  ene:'Jan', feb:'Feb', mar:'Mar', abr:'Apr', may:'May', jun:'Jun', jul:'Jul', ago:'Aug', sep:'Sep', sept:'Sep', set:'Sep', oct:'Oct', nov:'Nov', dic:'Dec' };
var _I18N_DIA = { lunes:'Monday', martes:'Tuesday', 'miércoles':'Wednesday', jueves:'Thursday', viernes:'Friday', 'sábado':'Saturday', domingo:'Sunday',
  lun:'Mon', mar:'Tue', 'mié':'Wed', mie:'Wed', jue:'Thu', vie:'Fri', 'sáb':'Sat', sab:'Sat', dom:'Sun' };
var _I18N_FECHA_RE = /^(?:[\s\d.,:\/\-·]|(?<![A-Za-zÀ-ÿ])(?:de|del|en|hoy|ayer|mañana|am|pm|a\.\s?m\.|p\.\s?m\.|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sept?|set|oct|nov|dic|lunes|martes|miércoles|jueves|viernes|sábado|domingo|lun|mié|mie|jue|vie|sáb|sab|dom)(?![A-Za-zÀ-ÿ])\.?)+$/i;
function _i18nCaja(orig, tr){          // respeta MAYÚSCULAS / minúscula inicial del original
  if(orig === orig.toUpperCase() && orig !== orig.toLowerCase()) return tr.toUpperCase();
  if(orig.charAt(0) === orig.charAt(0).toLowerCase()) return tr.charAt(0).toLowerCase() + tr.slice(1);
  return tr;
}
function _i18nFecha(t){
  if(t.length > 60 || !_I18N_FECHA_RE.test(t) || !/[a-záéíóúñ]{3,}/i.test(t)) return null;
  var hubo = false;
  var r = t.replace(/[A-Za-zÁÉÍÓÚÑáéíóúñ]+/g, function(w, pos){
    var k = w.toLowerCase(), en = null;
    if(k === 'mar') en = /^\s*[,.]/.test(t.slice(pos + w.length)) && !/\d\s*$/.test(t.slice(0, pos)) && pos === 0 && /,/.test(t) ? 'Tue' : 'Mar';
    else if(_I18N_DIA[k]) en = _I18N_DIA[k];
    else if(_I18N_MES[k]) en = _I18N_MES[k];
    else if(k === 'de' || k === 'del') return '\u0000';
    else if(k === 'en') en = 'in';
    else if(k === 'hoy') en = 'today';
    else if(k === 'ayer') en = 'yesterday';
    else if(k === 'mañana') en = 'tomorrow';
    if(en == null) return w;
    hubo = true;
    if(w === w.toUpperCase()) return en.toUpperCase();
    return (k === 'en' || k === 'hoy' || k === 'ayer' || k === 'mañana') ? _i18nCaja(w, en) : en;
  });
  if(!hubo) return null;
  return r.replace(/\u0000\s*/g, '').replace(/\s+/g, ' ').trim();
}
// Lo mismo en otra caja: "créditos" con la entrada "Créditos", "TOTAL" con "Total".
function _i18nExacto(t, prep){
  if(prep.dic.has(t)) return prep.dic.get(t);
  var c0 = t.charAt(0);
  if(c0 !== c0.toUpperCase()){
    var cap = c0.toUpperCase() + t.slice(1);
    if(prep.dic.has(cap)){ var r = prep.dic.get(cap); return r.charAt(0).toLowerCase() + r.slice(1); }
  } else if(t.length > 2 && t === t.toUpperCase() && t !== t.toLowerCase()){
    var tit = c0 + t.slice(1).toLowerCase();
    if(prep.dic.has(tit)) return prep.dic.get(tit).toUpperCase();
  }
  return null;
}

var _I18N_NEXO = { de:'of', y:'and', a:'to', al:'to', por:'per', en:'in', o:'or', con:'with', vs:'vs' };

function pgI18nPreparar(datos){
  // datos = { x: {es: en}, t: [[es con {0}, en con {0}], ...] }
  var dic = new Map(), plantillas = [], ancla = new Map();
  Object.keys((datos && datos.x) || {}).forEach(function(k){ dic.set(_i18nNorm(k), datos.x[k]); });
  ((datos && datos.t) || []).forEach(function(par){
    var es = _i18nNorm(par[0]), trozos = es.split(/\{\d+\}/), orden = (es.match(/\{\d+\}/g) || []).map(function(m){ return +m.slice(1, -1); });
    var fijo = trozos.join(' ');
    if(_i18nLetras(fijo) < 3) return;
    // Sufijo de plural: un hueco pegado al final de una palabra ("unidad{1}").
    var pegado = orden.map(function(_, i){ return /[A-Za-zÁÉÍÓÚÑáéíóúñ]$/.test(trozos[i]); });
    var re = '^' + trozos.map(function(t){ return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('(.*?)') + '$';
    // Estricta 2: lo fijo son solo palabras vacías ("{0} de {1}", "El {0}") → los huecos tienen que ser
    // números o palabras del diccionario. Estricta 1: una sola palabra fija ("Hola, {0}!", "{0} días")
    // → además se acepta algo con pinta de nombre (hasta 3 palabras, sin cifras ni puntuación).
    var llenas = (fijo.toLowerCase().match(/[a-záéíóúñ]+/g) || []).filter(function(w){ return !_I18N_VACIAS[w]; });
    var p = { re: new RegExp(re), en: par[1], orden: orden, pegado: pegado, peso: fijo.length, estricta: llenas.join('').length < 3 ? 2 : (llenas.length < 2 ? 1 : 0) };
    plantillas.push(p);
    // Ancla: la palabra fija más larga que no esté pegada a un hueco (en pantalla "contrato{1}" es
    // "contratos"); solo se prueban las plantillas cuya ancla aparece en el texto.
    var cand = [];
    trozos.forEach(function(tz, i){
      var ws = tz.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]+/g) || [];
      if(i < trozos.length - 1 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]$/.test(tz)) ws.pop();
      if(i > 0 && /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(tz)) ws.shift();
      ws.forEach(function(w){ if(w.length >= 3) cand.push(w); });
    });
    var pal = cand.sort(function(a, b){ return b.length - a.length; })[0] || '';
    if(!ancla.has(pal)) ancla.set(pal, []);
    ancla.get(pal).push(p);
  });
  ancla.forEach(function(l){ l.sort(function(a, b){ return b.peso - a.peso; }); });
  return { dic: dic, plantillas: plantillas, ancla: ancla, cache: new Map() };
}

// Devuelve la traducción o null si no hay (el texto se deja como está).
function pgI18nTexto(texto, prep, nivel){
  if(!prep) return null;
  var t = _i18nNorm(texto);
  if(!t || _i18nLetras(t) < 2) return null;
  if(prep.cache.has(t)) return prep.cache.get(t);
  var r = _i18nExacto(t, prep);
  if(r == null && (nivel || 0) < 2 && t.length <= 600){
    var vistos = {}, pals = (t.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/g) || []).concat(['']), mejor = null, mejorM = null;
    for(var i = 0; i < pals.length; i++){
      if(vistos[pals[i]]) continue; vistos[pals[i]] = 1;
      var lista = prep.ancla.get(pals[i]); if(!lista) continue;
      for(var j = 0; j < lista.length; j++){
        var p = lista[j];
        if(mejor && p.peso <= mejor.peso) break;
        var m = p.re.exec(t); if(!m) continue;
        if(p.estricta){
          var ok = true;
          for(var g = 1; g < m.length; g++){
            if(p.pegado[g - 1] && /^(|s|es)$/.test(m[g])) continue;
            if(_i18nEsNumero(m[g]) || _i18nExacto(_i18nNorm(m[g]), prep) != null) continue;
            if(p.estricta === 1 && /^[^\d.;:!?¿¡,]{1,40}$/.test(m[g]) && m[g].trim().split(/\s+/).length <= 3) continue;
            ok = false; break;
          }
          if(!ok) continue;
        }
        mejor = p; mejorM = m; break;
      }
    }
    if(mejor){
      var vals = {};
      mejor.orden.forEach(function(num, k){
        var v = mejorM[k + 1];
        if(mejor.pegado[k]) v = /^(s|es)$/.test(v) ? 's' : v;           // plural español → inglés
        else { var sub = pgI18nTexto(v, prep, 2); if(sub != null) v = sub; }   // el dato: solo si es una palabra del diccionario
        vals[num] = v;
      });
      r = mejor.en.replace(/\{(\d+)\}/g, function(_, n){ return vals[n] != null ? vals[n] : ''; });
    }
  }
  if(r == null) r = _i18nFecha(t);
  // Con números en medio ("148 créditos", "Cuota 3 de 24"): se traduce solo si TODAS las partes
  // con letras tienen traducción; así un mensaje o un nombre no queda mitad y mitad.
  if(r == null && (nivel || 0) <= 1 && t.length <= 90 && /\d/.test(t)){
    var pn = t.split(/(\$?\d[\d.,]*%?)/), todo = true, alguna = false;
    var an = pn.map(function(pz, i){
      if(i % 2 || !pz || _i18nLetras(pz) < 1) return pz;
      var ini = /^\s*/.exec(pz)[0], fin = /\s*$/.exec(pz)[0], nucleo = pz.trim();
      var sub = _I18N_NEXO[nucleo.toLowerCase()] || pgI18nTexto(nucleo, prep, 2);
      if(sub == null){ todo = false; return pz; }
      alguna = true; return ini + sub + fin;
    });
    if(todo && alguna) r = an.join('');
  }
  // Separado por "·", "—", ":", "|" o paréntesis ("Sin responder (3)", "Administrador · adam"):
  // cada parte por su cuenta; lo que no se conoce (un nombre) se deja igual.
  if(r == null && !(nivel || 0) && t.length <= 90){
    var partes = t.split(/(\s[·—–|]\s|\s-\s|:\s|\s?\(|\))/), hubo = false;
    if(partes.length > 1){
      var arm = partes.map(function(pz, i){
        if(i % 2 || !pz || _i18nLetras(pz) < 2) return pz;
        var ini = /^\s*/.exec(pz)[0], fin = /\s*$/.exec(pz)[0], sub = pgI18nTexto(pz, prep, 1);
        if(sub == null) return pz;
        hubo = true; return ini + sub + fin;
      });
      if(hubo) r = arm.join('');
    }
  }
  if(prep.cache.size > 20000) prep.cache.clear();
  prep.cache.set(t, r);
  return r;
}

// ── Pantalla ───────────────────────────────────────────────────────────────────────────────
var _I18N_ATRIB = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
function _i18nPrep(){ return _i18n.idioma === 'es' ? null : _i18n.dic; }

function _i18nSaltar(el){
  // Sube por los padres: nada dentro de un bloque marcado, de un editor o de un <script>/<style>.
  for(var n = el; n && n.nodeType === 1; n = n.parentNode){
    var tag = n.tagName;
    if(tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE' || tag === 'CANVAS' || tag === 'SVG' || tag === 'svg') return true;
    if(n.isContentEditable) return true;
    if(n.hasAttribute && n.hasAttribute('data-noi18n')) return true;
  }
  return false;
}
function _i18nNodoTexto(nodo){
  var prep = _i18nPrep(); if(!prep) return;
  var val = nodo.nodeValue; if(!val || val.length < 2) return;
  var reg = _i18n.orig.get(nodo);
  if(reg && reg.en === val) return;                     // ya está traducido
  var padre = nodo.parentNode; if(!padre || _i18nSaltar(padre)) return;
  var tr = pgI18nTexto(val, prep); if(tr == null) return;
  // Un <option> sin value usa su texto como valor: se le fija el valor en español antes de cambiarlo.
  if(padre.tagName === 'OPTION' && !padre.hasAttribute('value')) padre.setAttribute('value', padre.value);
  var ini = /^\s*/.exec(val)[0], fin = /\s*$/.exec(val)[0];
  var nuevo = ini + tr + fin;
  _i18n.orig.set(nodo, { es: val, en: nuevo });
  nodo.nodeValue = nuevo;
}
function _i18nAtributos(el){
  var prep = _i18nPrep(); if(!prep || !el.getAttribute) return;
  var reg = _i18n.orig.get(el);
  for(var i = 0; i < _I18N_ATRIB.length; i++){
    var a = _I18N_ATRIB[i], v = el.getAttribute(a); if(!v) continue;
    if(reg && reg[a] && reg[a].en === v) continue;
    var tr = pgI18nTexto(v, prep); if(tr == null) continue;
    if(!reg){ reg = {}; _i18n.orig.set(el, reg); }
    reg[a] = { es: v, en: tr };
    el.setAttribute(a, tr);
  }
  if(el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type || '') && el.value){
    if(reg && reg._v && reg._v.en === el.value) return;
    var tv = pgI18nTexto(el.value, prep);
    if(tv != null){ if(!reg){ reg = {}; _i18n.orig.set(el, reg); } reg._v = { es: el.value, en: tv }; el.value = tv; }
  }
}
function _i18nRecorrer(raiz){
  if(!raiz || !_i18nPrep()) return;
  if(raiz.nodeType === 3){ _i18nNodoTexto(raiz); return; }
  if(raiz.nodeType !== 1 || _i18nSaltar(raiz)) return;
  _i18nAtributos(raiz);
  var w = document.createTreeWalker(raiz, 1 | 4, null), n;      // elementos y textos
  while((n = w.nextNode())){
    if(n.nodeType === 3) _i18nNodoTexto(n); else _i18nAtributos(n);
  }
}
function _i18nRestaurar(){
  // Vuelta al español sin recargar: se repone lo que había.
  var w = document.createTreeWalker(document.documentElement, 1 | 4, null), n;
  while((n = w.nextNode())){
    var reg = _i18n.orig.get(n); if(!reg) continue;
    if(n.nodeType === 3){ if(n.nodeValue === reg.en) n.nodeValue = reg.es; }
    else Object.keys(reg).forEach(function(a){
      if(a === '_v'){ if(n.value === reg._v.en) n.value = reg._v.es; }
      else if(n.getAttribute(a) === reg[a].en) n.setAttribute(a, reg[a].es);
    });
    _i18n.orig.delete(n);
  }
}
function _i18nObservar(){
  if(_i18n.obs || typeof MutationObserver === 'undefined') return;
  _i18n.obs = new MutationObserver(function(muts){
    if(!_i18nPrep()) return;
    for(var i = 0; i < muts.length; i++){
      var m = muts[i];
      if(m.type === 'characterData') _i18nNodoTexto(m.target);
      else if(m.type === 'attributes') _i18nAtributos(m.target);
      else for(var j = 0; j < m.addedNodes.length; j++) _i18nRecorrer(m.addedNodes[j]);
    }
  });
  _i18n.obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: _I18N_ATRIB });
}

// El texto de un elemento tal como lo puso el sistema (en español), aunque en pantalla esté
// traducido. Para el código que compara "lo que hay" con "lo que toca" antes de repintar.
function pgTextoEs(el){
  if(!el) return '';
  if(_i18n.idioma === 'es' || !_i18n.orig || el.childNodes.length !== 1 || el.firstChild.nodeType !== 3) return el.textContent;
  var reg = _i18n.orig.get(el.firstChild);
  return (reg && reg.en === el.firstChild.nodeValue) ? reg.es : el.textContent;
}

// alert / confirm / prompt: el texto también se traduce (no pasa por la pantalla).
function _i18nDialogos(){
  if(typeof window === 'undefined' || window._i18nDlg) return;
  window._i18nDlg = true;
  ['alert', 'confirm', 'prompt'].forEach(function(f){
    var nativo = window[f]; if(typeof nativo !== 'function') return;
    window[f] = function(msg){
      var a = Array.prototype.slice.call(arguments), prep = _i18nPrep();
      if(prep && typeof msg === 'string'){ var tr = pgI18nTexto(msg, prep); if(tr != null) a[0] = tr; }
      return nativo.apply(window, a);
    };
  });
}

function _i18nCargar(idioma){
  // El diccionario pesa: solo lo baja quien lo usa. Lleva la misma versión que este archivo.
  if(_i18n.cargando[idioma]) return _i18n.cargando[idioma];
  _i18n.cargando[idioma] = new Promise(function(ok, mal){
    var listo = function(){ var d = window['PG_I18N_' + idioma.toUpperCase()]; if(d) ok(pgI18nPreparar(d)); else mal(new Error('sin diccionario')); };
    if(window['PG_I18N_' + idioma.toUpperCase()]) return listo();
    var yo = document.querySelector('script[src*="logic/i18n.js"]'), v = yo ? (/\?v=[^&"]+/.exec(yo.getAttribute('src')) || [''])[0] : '';
    var s = document.createElement('script');
    s.src = 'assets/i18n-' + idioma + '.js' + v;
    s.onload = listo;
    s.onerror = function(){ delete _i18n.cargando[idioma]; mal(new Error('no cargó')); };
    document.head.appendChild(s);
  });
  return _i18n.cargando[idioma];
}

// Pone el panel en un idioma. Devuelve una promesa que termina cuando ya está aplicado.
function pgIdiomaUsar(idioma){
  idioma = pgIdiomaValido(idioma);
  try{ localStorage.setItem('pg_idioma', idioma); }catch(e){}
  if(typeof document === 'undefined') { _i18n.idioma = idioma; return Promise.resolve(idioma); }
  if(!_i18n.orig) _i18n.orig = new WeakMap();
  if(idioma === 'es'){
    var antes = _i18n.idioma; _i18n.idioma = 'es';
    if(antes !== 'es') _i18nRestaurar();
    document.documentElement.setAttribute('lang', 'es');
    return Promise.resolve('es');
  }
  return _i18nCargar(idioma).then(function(prep){
    _i18n.dic = prep; _i18n.idioma = idioma;
    document.documentElement.setAttribute('lang', idioma);
    _i18nDialogos(); _i18nObservar();
    _i18nRecorrer(document.documentElement);
    return idioma;
  }).catch(function(){ return _i18n.idioma; });           // sin diccionario se queda en español
}

// El idioma de quien entró manda sobre lo que había guardado en este navegador.
function pgIdiomaUsuario(){
  var u = (typeof S !== 'undefined' && S.currentUser) || null;
  if(!u) return;
  pgIdiomaUsar(u.idioma || 'es');
}

// Guarda el idioma en la ficha propia y lo aplica (Configuración → Idioma).
function pgIdiomaGuardar(idioma){
  idioma = pgIdiomaValido(idioma);
  var u = (typeof S !== 'undefined' && S.currentUser) || null;
  if(!u || !u.uid || typeof DB === 'undefined'){ return pgIdiomaUsar(idioma); }
  return DB.updateUsuario(u.uid, { idioma: idioma }).then(function(ok){
    if(ok === false){ if(typeof toast === 'function') toast('No se pudo guardar el idioma', 'error'); return false; }
    u.idioma = idioma;
    return pgIdiomaUsar(idioma).then(function(){
      if(typeof toast === 'function') toast(idioma === 'en' ? 'Language saved: English' : 'Idioma guardado: Español', 'success');
      return true;
    });
  });
}

// Selector para los formularios de usuarios (invitar y editar).
function pgIdiomaSelectHTML(id, actual){
  actual = pgIdiomaValido(actual);
  return '<select class="fs" id="' + id + '" data-noi18n>' + Object.keys(PG_IDIOMAS).map(function(c){
    return '<option value="' + c + '"' + (c === actual ? ' selected' : '') + '>' + PG_IDIOMAS[c] + '</option>';
  }).join('') + '</select>';
}

// Arranque: lo último que usó este navegador, para que la pantalla de entrada ya salga en su idioma.
if(typeof document !== 'undefined'){
  (function(){
    var g = 'es'; try{ g = localStorage.getItem('pg_idioma') || 'es'; }catch(e){}
    if(pgIdiomaValido(g) !== 'es'){
      var ir = function(){ pgIdiomaUsar(g); };
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ir); else ir();
    }
  })();
}
if(typeof module !== 'undefined' && module.exports){
  module.exports = { pgI18nPreparar: pgI18nPreparar, pgI18nTexto: pgI18nTexto, pgIdiomaValido: pgIdiomaValido, PG_IDIOMAS: PG_IDIOMAS };
}
