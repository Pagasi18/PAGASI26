// Pagasi module: ai — «AI», pregúntale a los datos (21-nov-2026).
// Adam: "se podría poner un modelo como que se llame AI.. donde los administradores de la empresa
// podamos buscar que si.... a qué hora es la que más se vende.... o qué concesionario vendió más
// hoy?? o qué vendedor tuvo más ventas" — y después: "haz el módulo de AI… dale sin parar".
//
// La pregunta va al servidor con la sesión del usuario (POST /equipo { accion: 'preguntaAI' }).
// Allá Claude escoge las consultas (functions/lib/ai-consultas.js), el servidor hace las cuentas con
// los datos de las dos compañías y Claude las explica. Aquí solo se muestra: el texto (un markdown
// sencillo, siempre escapado) y los gráficos que pidió, con Chart.js como los del Dashboard.
var _ai = { mensajes: [], pidiendo: false, t0: 0, reloj: null, borrador: '', uid: null, ctl: null };
var _aiCharts = {};
var AI_SUGERENCIAS = [
  ['Ventas', ['¿A qué hora se vende más?', '¿Qué concesionario vendió más hoy?', '¿Qué vendedor tuvo más ventas este mes?', '¿Qué modelo se vende más este mes?', '¿Qué día de la semana se vende más?']],
  ['Cobranza y mora', ['¿Cuánto se cobró esta semana en cada compañía?', '¿Cómo vamos este mes contra el mes pasado?', '¿Qué concesionario tiene más mora?', '¿Quiénes son los 10 clientes con más días de atraso?', '¿Cómo se pagan las cuotas: a tiempo o tarde?']]
];
var AI_COLORES = ['#2563EB', '#14B8A6', '#F59E0B', '#7C3AED', '#16A34A', '#F97316', '#E11D48', '#0EA5E9', '#A855F7', '#84CC16', '#94A3B8'];

// La conversación sobrevive a recargar la página (solo en esta pestaña) y es de quien la hizo:
// se guarda con su usuario, se borra al cerrar sesión y otra persona en la misma pestaña no la ve.
function _aiUid(){
  try { var u = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser; if(u && u.uid) return u.uid; } catch(e){}
  return (typeof S !== 'undefined' && S.currentUser && S.currentUser.uid) || null;
}
function _aiGuardar(){ if(!_ai.uid) return; try { sessionStorage.setItem('pagasi_ai_' + _ai.uid, JSON.stringify(_ai.mensajes.slice(-40))); } catch(e){} }
function _aiCargarDe(uid){
  var l = []; try { l = JSON.parse(sessionStorage.getItem('pagasi_ai_' + uid) || '[]'); } catch(e){}
  return Array.isArray(l) ? l.filter(function(m){ return m && (m.rol === 'tu' || m.rol === 'ai'); }) : [];
}
function _aiDueno(){
  var uid = _aiUid();
  if(uid === _ai.uid) return;
  _aiCancelar(); aiGraficosFuera();
  _ai.uid = uid; _ai.mensajes = uid ? _aiCargarDe(uid) : []; _ai.borrador = '';
}
// La pregunta en curso se corta (al empezar una conversación nueva o al cerrar sesión)
function _aiCancelar(){
  var c = _ai.ctl; _ai.ctl = null;
  if(c){ c.cancelada = true; if(c.abort) try { c.abort(); } catch(e){} }
  _ai.pidiendo = false;
  if(_ai.reloj){ clearInterval(_ai.reloj); _ai.reloj = null; }
}
// Al cerrar sesión (doLogout): nada de la conversación queda en la pestaña
function aiOlvidar(){
  _aiCancelar(); aiGraficosFuera();
  _ai.mensajes = []; _ai.borrador = ''; _ai.uid = null;
  try { for(var k = sessionStorage.length - 1; k >= 0; k--){ var n = sessionStorage.key(k); if(n && n.indexOf('pagasi_ai') === 0) sessionStorage.removeItem(n); } } catch(e){}
}

function _aiUrl(){
  return (typeof _waRoot !== 'undefined' && _waRoot && _waRoot._waCfg && _waRoot._waCfg.urlEquipo)
    || (typeof WA_URL_EQUIPO !== 'undefined' ? WA_URL_EQUIPO : 'https://pagasi-webhook-5ao0p23z.ue.gateway.dev/equipo');
}
function _aiEsc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

// ── El texto de la respuesta: un markdown sencillo. TODO se escapa primero: nada de HTML de afuera ──
function _aiEnLinea(t){
  return t.replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,;:!?])/g, '$1<i>$2</i>');
}
function _aiMd(texto){
  var lineas = _aiEsc(texto).replace(/\r/g, '').split('\n'), html = '', i = 0, parrafo = [];
  var cerrarParrafo = function(){ if(parrafo.length){ html += '<p>' + _aiEnLinea(parrafo.join('<br>')) + '</p>'; parrafo = []; } };
  var celdas = function(l){ return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function(c){ return c.trim(); }); };
  while(i < lineas.length){
    var l = lineas[i], t = l.trim();
    if(!t){ cerrarParrafo(); i++; continue; }
    if(/^\|.*\|$/.test(t) && i + 1 < lineas.length && /^\|?\s*:?-{2,}/.test(lineas[i + 1].trim())){
      cerrarParrafo();
      var cab = celdas(t), filas = [];
      i += 2;
      while(i < lineas.length && /^\|.*\|$/.test(lineas[i].trim())){ filas.push(celdas(lineas[i])); i++; }
      var num = function(c){ return /^[-−]?[$]?[\d.,]+%?$/.test(c.replace(/\s/g, '')); };
      var colNum = cab.map(function(x, k){ return filas.length > 0 && filas.every(function(f){ return f[k] == null || f[k] === '' || num(f[k]); }); });
      html += '<div class="ai-tabla-w"><table class="ai-tabla"><thead><tr>' + cab.map(function(c, k){ return '<th' + (colNum[k] ? ' class="ai-num"' : '') + '>' + _aiEnLinea(c) + '</th>'; }).join('') + '</tr></thead><tbody>'
        + filas.map(function(f){ return '<tr>' + f.map(function(c){ return '<td' + (num(c) ? ' class="ai-num"' : '') + '>' + _aiEnLinea(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      continue;
    }
    if(/^#{1,4}\s+/.test(t)){ cerrarParrafo(); html += '<div class="ai-h">' + _aiEnLinea(t.replace(/^#{1,4}\s+/, '')) + '</div>'; i++; continue; }
    if(/^([-*•]|\d+[.)])\s+/.test(t)){
      cerrarParrafo();
      var ordenada = /^\d+[.)]\s+/.test(t), items = [];
      while(i < lineas.length && /^([-*•]|\d+[.)])\s+/.test(lineas[i].trim())){ items.push(lineas[i].trim().replace(/^([-*•]|\d+[.)])\s+/, '')); i++; }
      html += (ordenada ? '<ol>' : '<ul>') + items.map(function(x){ return '<li>' + _aiEnLinea(x) + '</li>'; }).join('') + (ordenada ? '</ol>' : '</ul>');
      continue;
    }
    parrafo.push(t); i++;
  }
  cerrarParrafo();
  return html;
}

// ── Lo que se ve ──
function _aiSegundos(){ return Math.max(0, Math.round((Date.now() - _ai.t0) / 1000)); }
function _aiMensajeHtml(m, i){
  if(m.rol === 'tu') return '<div class="ai-msg ai-tu" data-ai-i="' + i + '"><div class="ai-burbuja">' + _aiEsc(m.texto).replace(/\n/g, '<br>') + '</div></div>';
  if(m.error) return '<div class="ai-msg ai-ella ai-mal" data-ai-i="' + i + '"><div class="ai-avatar" aria-hidden="true">AI</div><div class="ai-cuerpo"><div class="ai-texto"><p>' + _aiEsc(m.texto) + '</p></div>'
    + (m.pregunta ? '<button type="button" class="btn btn-sm" onclick="aiReintentar(' + i + ')">Intentar otra vez</button>' : '') + '</div></div>';
  var graf = (m.graficos || []).map(function(g, k){
    var alto = g.tipo === 'barras_horizontales' ? Math.min(440, Math.max(140, g.etiquetas.length * 26 + 50)) : g.tipo === 'torta' ? 260 : 240;
    return '<div class="ai-graf"><div class="ai-graf-t">' + _aiEsc(g.titulo) + '</div><div class="ai-lienzo" style="height:' + alto + 'px"><canvas id="aic-' + i + '-' + k + '" role="img" aria-label="' + _aiEsc(g.titulo) + '"></canvas></div></div>';
  }).join('');
  var pie = [];
  if(m.consultas && m.consultas.length) pie.push('Consultó: ' + m.consultas.map(_aiEsc).join(' · '));
  if(typeof m.costo === 'number' && m.costo > 0) pie.push('costó $' + (Math.round(m.costo * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  return '<div class="ai-msg ai-ella" data-ai-i="' + i + '"><div class="ai-avatar" aria-hidden="true">AI</div><div class="ai-cuerpo"><div class="ai-texto">' + _aiMd(m.texto) + '</div>' + graf
    + '<div class="ai-pie-msg">' + (pie.length ? '<span>' + pie.join(' · ') + '</span>' : '') + '<button type="button" class="ai-copiar" onclick="aiCopiar(' + i + ', this)">Copiar</button></div></div></div>';
}
function _aiBienvenida(){
  return '<div class="ai-hola"><div class="ai-hola-ic" aria-hidden="true">AI</div><div class="ai-hola-t">¿Qué quieres saber?</div>'
    + '<div class="ai-hola-s">Pregunta como hablas. La AI busca en las ventas, la cobranza y la mora de PAGASI 18 y 26, hace las cuentas con el sistema y te lo explica.</div>'
    + AI_SUGERENCIAS.map(function(g){ return '<div class="ai-sug-g"><div class="ai-sug-t">' + g[0] + '</div><div class="ai-sugs">' + g[1].map(function(s){ return '<button type="button" class="ai-sug" onclick="aiSugerencia(this)">' + _aiEsc(s) + '</button>'; }).join('') + '</div></div>'; }).join('')
    + '</div>';
}
function _aiChatHtml(){
  if(!_ai.mensajes.length && !_ai.pidiendo) return _aiBienvenida();
  var h = _ai.mensajes.map(_aiMensajeHtml).join('');
  if(_ai.pidiendo) h += '<div class="ai-msg ai-ella ai-pensando"><div class="ai-avatar" aria-hidden="true">AI</div><div class="ai-cuerpo"><div class="ai-texto"><span class="ai-puntos" aria-hidden="true"><i></i><i></i><i></i></span> <span id="ai-pensando-txt">Pensando… ' + _aiSegundos() + ' s</span></div><div class="ai-pie-msg"><span>Consultando los datos de las dos compañías</span></div></div></div>';
  return h;
}
// modo: 'fin' (hasta abajo: al abrir y mientras piensa) o 'respuesta' (que se vea dónde empieza la respuesta nueva)
function _aiPintar(modo){
  if(typeof document === 'undefined' || typeof S === 'undefined' || S.page !== 'ai') return;
  var c = document.getElementById('ai-chat'); if(!c) return;
  c.innerHTML = _aiChatHtml();
  var b = document.getElementById('ai-enviar'); if(b){ b.disabled = !!_ai.pidiendo; b.textContent = _ai.pidiendo ? 'Pensando…' : 'Preguntar'; }
  aiGraficos();
  _aiLlevar(modo || 'fin', true);
}
// En la computadora se deja el cursor en la caja; en el teléfono no (abriría el teclado encima de la respuesta).
// preventScroll: si no, el foco cancela el desplazamiento suave y el chat se queda donde estaba.
function _aiEnfocar(){
  if(typeof document === 'undefined' || _ai.pidiendo) return;
  var fino = false; try { fino = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches); } catch(e){}
  var c = document.getElementById('ai-texto'); if(fino && c && c.focus) try { c.focus({ preventScroll: true }); } catch(e){}
}
// scroll-margin (en pagasi.css) deja libre lo que tapan la caja de escribir y la barra de abajo del teléfono
function _aiLlevar(modo, suave){
  if(typeof document === 'undefined') return;
  var chat = document.getElementById('ai-chat'); if(!chat || !chat.lastElementChild) return;
  var el = chat.lastElementChild, donde = 'end';
  if(modo === 'respuesta'){ var tus = chat.querySelectorAll('.ai-tu'); if(tus.length){ el = tus[tus.length - 1]; donde = 'start'; } }
  if(el.scrollIntoView) try { el.scrollIntoView({ block: donde, behavior: suave ? 'smooth' : 'auto' }); } catch(e){ try { el.scrollIntoView(donde === 'start'); } catch(e2){} }
}
// Para el lector de pantalla: un solo aviso por pregunta y otro con la respuesta (no toda la conversación)
function _aiAnunciar(t){ var a = typeof document !== 'undefined' && document.getElementById('ai-anuncio'); if(a) a.textContent = String(t || '').slice(0, 400); }

// ── Preguntar ──
var AI_ESPERA_MS = 130000;     // el servidor corta a los 120 s: esperar más no sirve
function aiPreguntar(texto){
  texto = String(texto == null ? '' : texto).trim();
  _aiDueno();
  if(!texto || _ai.pidiendo) return Promise.resolve();
  if(texto.length > 1000) texto = texto.slice(0, 1000);
  var user = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) || null;
  // lo anterior de la conversación (para entender «¿y ayer?»), sin los errores
  var historial = _ai.mensajes.filter(function(m){ return !m.error; }).slice(-12).map(function(m){ return { rol: m.rol, texto: String(m.texto || '').slice(0, 2000) }; });
  _ai.mensajes.push({ rol: 'tu', texto: texto, hora: Date.now() });
  _ai.borrador = '';
  var caja = typeof document !== 'undefined' && document.getElementById('ai-texto'); if(caja){ caja.value = ''; aiCrecer(caja); }
  if(!user){ _ai.mensajes.push({ rol: 'ai', error: true, texto: 'Sin sesión: vuelve a entrar al sistema.', pregunta: texto }); _aiGuardar(); _aiPintar('fin'); return Promise.resolve(); }
  var ctl = typeof AbortController !== 'undefined' ? new AbortController() : { abort: function(){} };
  var uid = _ai.uid, tarde = setTimeout(function(){ ctl.porTiempo = true; if(ctl.abort) try { ctl.abort(); } catch(e){} }, AI_ESPERA_MS);
  _ai.ctl = ctl; _ai.pidiendo = true; _ai.t0 = Date.now();
  _aiPintar('fin');
  _aiAnunciar('Pensando la respuesta…');
  if(_ai.reloj) clearInterval(_ai.reloj);
  _ai.reloj = setInterval(function(){ var e = typeof document !== 'undefined' && document.getElementById('ai-pensando-txt'); if(e) e.textContent = 'Pensando… ' + _aiSegundos() + ' s'; }, 1000);
  if(typeof logActividad === 'function') try { logActividad('ai_pregunta', 'ai', '', { pregunta: texto.slice(0, 300) }); } catch(e){}
  var llego = null;
  return Promise.resolve().then(function(){ return user.getIdToken(); }).then(function(tok){
    return fetch(_aiUrl(), { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify({ accion: 'preguntaAI', pregunta: texto, historial: historial }), signal: ctl.signal });
  }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(j){
      if(!r.ok || !j || !j.ok || typeof j.respuesta !== 'string'){
        var e = new Error((j && j.error) || (r.status === 403 ? 'No tienes acceso a la AI.' : 'No se pudo contestar esta vez. Prueba otra vez en un minuto.'));
        e.codigo = (j && j.codigo) || ('http' + r.status); throw e;
      }
      llego = { rol: 'ai', texto: j.respuesta, graficos: _aiGraficosValidos(j.graficos), consultas: Array.isArray(j.consultas) ? j.consultas.slice(0, 12).map(String) : [], costo: typeof j.costo === 'number' ? j.costo : null, hora: Date.now(), nuevo: true };
    });
  }).catch(function(e){
    var m = String(e && e.message || e);
    if(ctl.porTiempo) m = 'La respuesta tardó demasiado. Prueba otra vez o con una pregunta más concreta.';
    else if(/Failed to fetch|NetworkError|Load failed/i.test(m)) m = 'No hay conexión con el servidor. Revisa el internet y prueba otra vez.';
    llego = { rol: 'ai', error: true, texto: m, codigo: e && e.codigo || '', pregunta: texto };
  }).then(function(){
    clearTimeout(tarde);
    // Si mientras tanto empezó otra conversación o entró otra persona, esta respuesta ya no va
    if(ctl.cancelada || _ai.ctl !== ctl || _ai.uid !== uid) return;
    _ai.ctl = null; _ai.pidiendo = false;
    if(_ai.reloj){ clearInterval(_ai.reloj); _ai.reloj = null; }
    if(llego) _ai.mensajes.push(llego);
    _aiGuardar();
    _aiEnfocar();
    _aiPintar(llego && !llego.error ? 'respuesta' : 'fin');
    _aiAnunciar(llego ? (llego.error ? llego.texto : 'Respuesta lista. ' + String(llego.texto).replace(/[*_`#|]/g, '').slice(0, 300)) : '');
    _ai.mensajes.forEach(function(x){ delete x.nuevo; });
  });
}
// Lo que llega como gráfico se revisa antes de dibujarlo
function _aiGraficosValidos(l){
  return (Array.isArray(l) ? l : []).slice(0, 3).filter(function(g){
    return g && Array.isArray(g.etiquetas) && g.etiquetas.length && Array.isArray(g.series) && g.series.length
      && g.series.every(function(s){ return s && Array.isArray(s.valores) && s.valores.length === g.etiquetas.length; });
  }).map(function(g){
    return { tipo: ['barras', 'barras_horizontales', 'linea', 'torta'].indexOf(g.tipo) > -1 ? g.tipo : 'barras', titulo: String(g.titulo || '').slice(0, 80), etiquetas: g.etiquetas.slice(0, 62).map(function(e){ return String(e).slice(0, 40); }),
      series: g.series.slice(0, 3).map(function(s){ return { nombre: String(s.nombre || '').slice(0, 40), valores: s.valores.slice(0, 62).map(function(v){ return typeof v === 'number' && isFinite(v) ? v : 0; }) }; }),
      formato: ['dinero', 'numero', 'porcentaje'].indexOf(g.formato) > -1 ? g.formato : 'numero', apilado: g.apilado === true };
  });
}
function aiEnviar(ev){ if(ev && ev.preventDefault) ev.preventDefault(); var c = document.getElementById('ai-texto'); return aiPreguntar(c ? c.value : ''); }
function aiTecla(ev){ if(ev && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing){ ev.preventDefault(); aiEnviar(); } }
function aiCrecer(el){ if(!el || !el.style) return; _ai.borrador = el.value || ''; el.style.height = 'auto'; el.style.height = Math.min(160, Math.max(44, el.scrollHeight || 44)) + 'px'; }
function aiSugerencia(btn){ return aiPreguntar(btn && btn.textContent); }
function aiReintentar(i){
  var m = _ai.mensajes[i]; if(!m || !m.pregunta || _ai.pidiendo) return;
  // se quitan el error y la pregunta que lo causó, y se vuelve a preguntar
  if(_ai.mensajes[i - 1] && _ai.mensajes[i - 1].rol === 'tu') _ai.mensajes.splice(i - 1, 2); else _ai.mensajes.splice(i, 1);
  return aiPreguntar(m.pregunta);
}
function aiNueva(){
  _aiCancelar();                                   // si estaba pensando, esa pregunta se deja
  _ai.mensajes = []; _aiGuardar();
  aiGraficosFuera();
  _aiPintar('fin');
  _aiAnunciar('Conversación nueva.');
}
function aiCopiar(i, btn){
  var m = _ai.mensajes[i]; if(!m) return;
  var listo = function(){ if(btn){ btn.textContent = 'Copiado'; setTimeout(function(){ btn.textContent = 'Copiar'; }, 1500); } };
  try { navigator.clipboard.writeText(String(m.texto || '').replace(/\*\*/g, '')).then(listo, function(){}); } catch(e){}
}

// ── Los gráficos de las respuestas (Chart.js, con el globito del Dashboard) ──
function _aiValorTxt(v, f){
  if(f === 'dinero') return '$' + Math.round(+v || 0).toLocaleString('es-VE');
  if(f === 'porcentaje') return (Math.round((+v || 0) * 10) / 10).toLocaleString('es-VE') + '%';
  return (Math.round((+v || 0) * 100) / 100).toLocaleString('es-VE');
}
function _aiColorSerie(nombre, k){ var n = String(nombre || ''); if(/\b18\b/.test(n) && typeof GRUPO_COLOR !== 'undefined') return GRUPO_COLOR['18']; if(/\b26\b/.test(n) && typeof GRUPO_COLOR !== 'undefined') return GRUPO_COLOR['26']; return AI_COLORES[k % AI_COLORES.length]; }
function _aiConfig(g, sinAnimar){
  var oscuro = typeof _g2Oscuro === 'function' ? _g2Oscuro() : false, ink3 = oscuro ? '#6B6896' : '#9794BB', grid = oscuro ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.06)';
  var tip = { backgroundColor: oscuro ? '#252844' : '#fff', borderColor: oscuro ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.2)', borderWidth: 1, titleColor: oscuro ? '#E8E6FF' : '#0B0B1E', bodyColor: oscuro ? '#B0ADDB' : '#4A4870', padding: 10, boxPadding: 4, usePointStyle: true };
  var tick = function(v){ return g.formato === 'dinero' ? ((typeof _dashTick === 'function') ? _dashTick(v) : '$' + v) : g.formato === 'porcentaje' ? v + '%' : (Math.round(v * 100) / 100).toLocaleString('es-VE'); };
  if(g.tipo === 'torta'){
    var s = g.series[0], tot = s.valores.reduce(function(a, v){ return a + (+v || 0); }, 0);
    return { type: 'doughnut', data: { labels: g.etiquetas, datasets: [{ data: s.valores, backgroundColor: g.etiquetas.map(function(e, k){ return AI_COLORES[k % AI_COLORES.length]; }), borderColor: oscuro ? '#1C1F38' : '#fff', borderWidth: 2, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', animation: sinAnimar ? false : undefined,
        plugins: { legend: { position: 'right', labels: { color: ink3, font: { size: 10 }, boxWidth: 10, boxHeight: 10, usePointStyle: true } },
          tooltip: Object.assign({}, tip, { callbacks: { label: function(c){ return ' ' + c.label + ': ' + _aiValorTxt(c.raw, g.formato) + (tot > 0 ? ' (' + Math.round(c.raw * 1000 / tot) / 10 + '%)' : ''); } } }) } } };
  }
  var horiz = g.tipo === 'barras_horizontales', linea = g.tipo === 'linea';
  var ds = g.series.map(function(s, k){
    var c = _aiColorSerie(s.nombre, k);
    return linea ? { label: s.nombre, data: s.valores, borderColor: c, backgroundColor: c + '22', fill: g.series.length === 1, tension: 0.3, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2 }
      : { label: s.nombre, data: s.valores, backgroundColor: c, borderColor: 'transparent', borderWidth: 0, borderRadius: 4, borderSkipped: false, maxBarThickness: horiz ? 18 : 34 };
  });
  var ejeV = { stacked: !!g.apilado, beginAtZero: true, grid: { color: grid }, border: { display: false, dash: [4, 4] }, ticks: { color: ink3, font: { size: 9 }, maxTicksLimit: 5, callback: tick } };
  var ejeC = { stacked: !!g.apilado, grid: { display: false }, border: { display: false }, ticks: { color: ink3, font: { size: horiz ? 10 : 9 }, autoSkip: !horiz, maxRotation: 0 } };
  return { type: linea ? 'line' : 'bar', data: { labels: g.etiquetas, datasets: ds },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: horiz ? 'y' : 'x', animation: sinAnimar ? false : undefined, interaction: { mode: 'index', intersect: false, axis: horiz ? 'y' : 'x' },
      plugins: { legend: { display: g.series.length > 1, position: 'top', align: 'end', labels: { color: ink3, font: { size: 10 }, boxWidth: 10, boxHeight: 10, usePointStyle: true } },
        tooltip: Object.assign({}, tip, { callbacks: { label: function(c){ return ' ' + (g.series.length > 1 ? c.dataset.label + ': ' : '') + _aiValorTxt(c.raw, g.formato); } } }) },
      scales: horiz ? { x: ejeV, y: ejeC } : { x: ejeC, y: ejeV } } };
}
function aiGraficosFuera(){ Object.keys(_aiCharts).forEach(function(k){ try { _aiCharts[k].destroy(); } catch(e){} delete _aiCharts[k]; }); }
function aiGraficos(){
  aiGraficosFuera();
  if(typeof document === 'undefined' || typeof Chart === 'undefined') return;
  _ai.mensajes.forEach(function(m, i){
    (m.graficos || []).forEach(function(g, k){
      var id = 'aic-' + i + '-' + k, el = document.getElementById(id);
      if(!el) return;
      try { _aiCharts[id] = new Chart(el, _aiConfig(g, !m.nuevo)); } catch(e){ if(typeof console !== 'undefined' && console.warn) console.warn('AI: gráfico', e); }
    });
  });
}

PG.ai = function(){
  if(typeof hasModuleAccess === 'function' && !hasModuleAccess('ai'))
    return '<div class="page"><div class="empty" style="padding:60px 20px;text-align:center">No tienes acceso a la AI.</div></div>';
  _aiDueno();
  setTimeout(function(){
    if(S.page !== 'ai') return;
    aiGraficos();
    var c = document.getElementById('ai-texto'); if(c) aiCrecer(c);
    _aiEnfocar(); _aiLlevar('fin', false);
  }, 0);
  return '<div class="page ai">'
    + pageBanner('Pregúntale a los datos', 'AI', 'Ventas, cobranza y mora de PAGASI 18 y 26 · solo consulta, no cambia nada', [{ label: 'Nueva conversación', onclick: 'aiNueva()', primary: true }])
    + '<div class="ai-caja"><div id="ai-anuncio" class="ai-sr" role="status" aria-live="polite"></div><div id="ai-chat" class="ai-chat">' + _aiChatHtml() + '</div>'
    + '<form class="ai-entrada" onsubmit="return aiEnviar(event), false">'
    + '<textarea id="ai-texto" data-libre rows="1" maxlength="1000" placeholder="Pregunta lo que quieras de las ventas, la cobranza o la mora…" aria-label="Tu pregunta" onkeydown="aiTecla(event)" oninput="aiCrecer(this)">' + _aiEsc(_ai.borrador) + '</textarea>'
    + '<button type="submit" class="btn btn-p" id="ai-enviar"' + (_ai.pidiendo ? ' disabled' : '') + '>' + (_ai.pidiendo ? 'Pensando…' : 'Preguntar') + '</button></form>'
    + '<div class="ai-nota">Las cuentas las hace el sistema con los datos de las dos compañías y la AI las explica. Cada pregunta cuesta unos centavos. Enter para preguntar; Mayús + Enter para otra línea.</div></div>'
    + '</div>';
};
