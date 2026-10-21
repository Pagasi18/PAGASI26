/* Mayúsculas y sin tildes en todo el sistema (Adam, 21-oct-2026): lo que se escribe en un campo de texto queda en
   MAYÚSCULAS y sin tildes, mientras se escribe ("ána" → "ANA", "José María" → "JOSE MARIA"). La Ñ se queda: es una
   letra, no una tilde (PEÑA no es PENA). La diéresis sí se quita (GÜIRIA → GUIRIA).
   No se tocan los campos donde cambiar el texto lo daña: correos, claves, enlaces, usuarios de redes, buscadores,
   el chat y las instrucciones de los asistentes (ids wa-…/ig-…), mensajes, y todo lo marcado con data-libre.
   Lo que ya está guardado no cambia hasta que alguien lo edite.                                               */
(function(raiz){
  'use strict';
  function pgMayus(v){
    return String(v == null ? '' : v)
      .replace(/[ñÑ]/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'Ñ')
      .toUpperCase();
  }
  var EXCLUIR = /mail|correo|url|link|http|www|clave|pass|contrase|token|busc|b[uú]squeda|search|filtr|filter|usuario|username|c[oó]digo|instr|plantilla|mensaje|msg|invite|linkedin|instagram|facebook|tiktok|twitter|@/i;
  function aplica(el){
    if(!el || el.readOnly || el.disabled) return false;
    var tag = String(el.tagName || '').toUpperCase();
    if(tag === 'INPUT'){ if(String(el.type || 'text').toLowerCase() !== 'text') return false; }
    else if(tag !== 'TEXTAREA') return false;
    if(el.closest && el.closest('[data-libre]')) return false;
    var id = String(el.id || ''), get = function(a){ return String((el.getAttribute && el.getAttribute(a)) || ''); };
    if(/^(wa|ig)-/.test(id) || /(^|[_-])q$/i.test(id) || /Q$/.test(id)) return false;   // chat de los asistentes y buscadores (credQ, wa-q…)
    if(/email|username|password|url/i.test(get('autocomplete')) || /email|url/i.test(get('inputmode'))) return false;
    return !EXCLUIR.test(id + ' ' + get('name') + ' ' + get('placeholder'));
  }
  function normalizar(el){
    var v = el.value, n = pgMayus(v);
    if(n === v) return;
    var a = el.selectionStart, b = el.selectionEnd;
    el.value = n;
    try{ if(raiz.document && raiz.document.activeElement === el && a != null && n.length === v.length) el.setSelectionRange(a, b); }catch(e){}
  }
  function alEscribir(e){ if(e && e.isComposing) return; var el = e && e.target; if(aplica(el)) normalizar(el); }
  if(raiz.document && raiz.document.addEventListener){
    // En captura: corre ANTES del oninput/onchange del campo, así lo que guarda la pantalla ya va en mayúsculas
    raiz.document.addEventListener('input', alEscribir, true);
    raiz.document.addEventListener('compositionend', function(e){ if(aplica(e.target)) normalizar(e.target); }, true);
    raiz.document.addEventListener('change', function(e){ if(aplica(e.target)) normalizar(e.target); }, true);
  }
  raiz.pgMayus = pgMayus; raiz.pgMayusAplica = aplica; raiz.pgMayusNormalizar = normalizar;
  if(typeof module !== 'undefined' && module.exports) module.exports = { pgMayus: pgMayus, aplica: aplica, normalizar: normalizar };
})(typeof window !== 'undefined' ? window : globalThis);
