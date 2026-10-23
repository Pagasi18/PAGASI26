/* Metricas de la web publica (Adam, 14-oct-2026: "quienes entran a la pagina y como es su
   comportamiento"). Anonimo: un numero al azar por navegador y otro por visita; nunca
   nombre, cedula, telefono ni nada que escriba el cliente. Una visita = un documento en
   "metricas" (Firestore de la compania que sirve la pagina), con sus eventos en una lista.
   No cuenta robots, ni pruebas en la Mac, ni al personal de PAGASI (el sistema marca el
   navegador al entrar). Si algo falla, la pagina sigue igual: medir nunca estorba. */
(function(root){
  'use strict';
  const D = root.PagasiCatalog, FB = D && D.FB_PUBLICO;
  if(!FB || typeof fetch !== 'function') return;
  const nav = root.navigator || {}, ua = String(nav.userAgent || '');
  const host = String((root.location && root.location.hostname) || '');
  let ls = null, ss = null;
  try{ ls = root.localStorage; ss = root.sessionStorage; }catch(e){}
  const leer = (s, k) => { try{ return s ? s.getItem(k) : null; }catch(e){ return null; } };
  const guardar = (s, k, v) => { try{ if(s) s.setItem(k, v); }catch(e){} };
  if(nav.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i.test(ua)) return;
  if(/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || /\.(localhost|test)$/.test(host)) return;
  if(leer(ls, 'pg_staff') === '1') return;

  const azar = n => { let s = ''; const c = 'abcdefghijklmnopqrstuvwxyz0123456789'; for(let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
  // Visitante: dura en el navegador. Visita: se renueva tras 30 minutos sin moverse.
  let vid = leer(ls, 'pg_vid'); if(!vid || !/^v[0-9a-z]{12}$/.test(vid)){ vid = 'v' + azar(12); guardar(ls, 'pg_vid', vid); }
  const ahora = Date.now(), ult = +leer(ss, 'pg_ult') || 0;
  let sid = leer(ss, 'pg_sid');
  if(!sid || !/^s[0-9a-z]{14}$/.test(sid) || ahora - ult > 30 * 60 * 1000){ sid = 's' + azar(14); guardar(ss, 'pg_sid', sid); guardar(ss, 'pg_creada', ''); }
  guardar(ss, 'pg_ult', String(ahora));

  const pagina = (String((root.location && root.location.pathname) || '/').split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const params = new URLSearchParams((root.location && root.location.search) || '');
  // De donde viene: utm_source manda; si no, el navegador de Instagram/Facebook o el referente
  function fuente(){
    const utm = (params.get('utm_source') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
    if(utm) return utm;
    if(/Instagram/i.test(ua)) return 'instagram';
    if(/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
    let ref = ''; try{ ref = new URL(root.document.referrer).hostname.toLowerCase(); }catch(e){}
    if(!ref) return 'directo';
    if(ref === host) return 'interno';
    if(/instagram\./.test(ref)) return 'instagram';
    if(/facebook\.|fb\.me/.test(ref)) return 'facebook';
    if(/whatsapp|wa\.me/.test(ref)) return 'whatsapp';
    if(/google\./.test(ref)) return 'google';
    if(/bing\.|yahoo\.|duckduckgo/.test(ref)) return 'buscador';
    if(/tiktok/.test(ref)) return 'tiktok';
    return ref.replace(/^www\./, '').slice(0, 30);
  }
  const disp = /iPad|Tablet/i.test(ua) ? 'tablet' : (/Mobi|Android|iPhone/i.test(ua) ? 'telefono' : 'computadora');
  const fecha = (() => { try{ return new Date().toLocaleDateString('en-CA', { timeZone:'America/Caracas' }); }catch(e){ return new Date().toISOString().slice(0, 10); } })();
  const hora = (() => { try{ return +new Date().toLocaleString('en-US', { timeZone:'America/Caracas', hour:'numeric', hour12:false }) % 24; }catch(e){ return new Date().getHours(); } })();

  const BASE = 'https://firestore.googleapis.com/v1/projects/' + FB.projectId + '/databases/(default)/documents';
  const DOC = 'projects/' + FB.projectId + '/databases/(default)/documents/metricas/' + sid;
  const S = v => ({ stringValue: String(v).slice(0, 60) }), I = v => ({ integerValue: String(Math.round(+v || 0)) });
  function evento(t, extra){
    const f = { t: S(t), p: S(pagina), ts: I(Date.now()) };
    if(extra && extra.m != null) f.m = I(extra.m);
    if(extra && extra.x != null) f.x = S(extra.x);
    return { mapValue: { fields: f } };
  }
  // Escrituras en fila: la primera crea la visita; las demas agregan eventos (maximo 80)
  let cola = Promise.resolve(), enviados = 0;
  function enviar(t, extra){
    if(enviados >= 80) return;
    enviados++;
    cola = cola.then(() => {
      const ev = evento(t, extra);
      const creada = leer(ss, 'pg_creada') === sid;
      const w = creada
        ? { update: { name: DOC, fields: { ultima: I(Date.now()) } }, updateMask: { fieldPaths: ['ultima'] },
            updateTransforms: [{ fieldPath: 'ev', appendMissingElements: { values: [ev] } }, { fieldPath: 'n', increment: I(1) }],
            currentDocument: { exists: true } }
        : { update: { name: DOC, fields: { vid: S(vid), fecha: S(fecha), hora: I(hora), inicio: I(Date.now()), ultima: I(Date.now()),
              fuente: S(fuente()), medio: S((params.get('utm_medium') || '').slice(0, 20)), campana: S((params.get('utm_campaign') || '').slice(0, 30)),
              disp: S(disp), entrada: S(pagina), ev: { arrayValue: { values: [ev] } }, n: I(1), v: I(1) } },
            currentDocument: { exists: false } };
      return fetch(BASE + ':commit?key=' + FB.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: [w] }), keepalive: true })
        .then(r => { if(r.ok && !creada) guardar(ss, 'pg_creada', sid); })
        .catch(() => {});
    });
  }
  const yaHecho = {};
  function unaVez(clave, t, extra){ if(yaHecho[clave]) return; yaHecho[clave] = 1; enviar(t, extra); }

  // La vista de la pagina (con la moto, si viene en la direccion)
  const moto = +(params.get('moto') || 0);
  enviar('vista', moto ? { m: moto } : null);

  // Clics que importan, sin tocar el resto del codigo
  root.document.addEventListener('click', e => {
    const a = e.target && e.target.closest ? e.target.closest('a,button') : null; if(!a) return;
    const href = String(a.getAttribute('href') || '');
    const m = (href.match(/moto=(\d+)/) || [])[1];
    if(/wa\.me|api\.whatsapp|whatsapp\.com/i.test(href)) return enviar('whatsapp', m ? { m: +m } : (/precio/i.test(decodeURIComponent(href)) ? { x: 'precio' } : null));
    if(/^solicitar\.html/i.test(href) || a.id === 'simBtn') return enviar('quiero', m ? { m: +m } : null);
    if(/simulador\.html\?moto=/i.test(href)) return enviar('ver_moto', { m: +m });
    if(a.matches && a.matches('[data-home-use],[data-catalog-use]')) return enviar('filtro', { x: a.getAttribute('data-home-use') || a.getAttribute('data-catalog-use') });
  }, true);
  // Simulador: que movio el plazo o la inicial (una vez por moto)
  root.document.addEventListener('input', e => {
    if(e.target && e.target.id === 'simPref') unaVez('sim' + (params.get('moto') || ''), 'simulo', { m: moto || null, x: 'inicial' });
  }, true);
  root.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-plazo]') : null;
    if(b) unaVez('plazo' + (params.get('moto') || ''), 'simulo', { m: moto || null, x: 'plazo ' + b.getAttribute('data-plazo') });
  }, true);
  // Solicitud: empezo a escribir, y lo que avisa request.js (parte 1 enviada, termino)
  if(pagina === 'solicitar'){
    root.document.addEventListener('input', e => { if(e.target && /^(wz_|fM)/.test(e.target.id || '')) unaVez('sol', 'solicitud_inicio'); }, true);
  }
  // Cuánto se quedó: al cerrar, cambiar de página o irse a otra app se anota una vez por página
  // (23-oct-2026, para el "tiempo en la página" del módulo Métricas web)
  let salio = false;
  root.document.addEventListener('visibilitychange', () => { if(!salio && root.document.visibilityState === 'hidden'){ salio = true; enviar('sale'); } });
  root.addEventListener('pagasi:metrica', e => { const d = (e && e.detail) || {}; if(d.t) enviar(String(d.t), { x: d.x, m: d.m }); });
  root.PagasiMetricas = Object.freeze({ enviar, sid, vid });
})(typeof window !== 'undefined' ? window : this);
