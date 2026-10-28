// Pagasi module: halloween
// Adam, 28-oct-2026: "decórame el dashboard de Halloween… solo el sistema, para que los empleados disfruten un
// rato… un detalle… que empiece de una vez y se quite el 2 de noviembre".
// Un detalle, no un disfraz: un saludo con calabaza y telaraña arriba del Dashboard, un sombrero de bruja en el
// pegaso de la barra lateral, un borde naranja fino en las tarjetas y tres murciélagos que cruzan UNA sola vez por
// sesión. Los números, las gráficas y el rojo de la mora no cambian. Se enciende solo del 28-oct al 1-nov y el 2-nov
// desaparece sin que nadie haga nada. "Quitar" lo apaga en ese navegador (por si a alguien le estorba).
var HW_DESDE = '2026-10-28', HW_HASTA = '2026-11-01';

function hwActivo(){
  var hoy = (typeof hoyLocalISO === 'function') ? hoyLocalISO() : '';
  if(!hoy || hoy < HW_DESDE || hoy > HW_HASTA) return false;
  try { if(localStorage.getItem('pg_hw_off') === '1') return false; } catch(e){}
  return true;
}
function hwQuitar(){
  try { localStorage.setItem('pg_hw_off', '1'); } catch(e){}
  hwAplicar();
  if(typeof S !== 'undefined' && S.page === 'dash' && typeof nav === 'function') nav('dash');
}
// Los murciélagos vuelan una vez por sesión: el Dashboard se redibuja solo cuando cambian los datos y no
// tiene gracia que crucen cada vez (y mareaba, como el latido de Redes del 23-oct).
function _hwUnaVez(){
  try { if(sessionStorage.getItem('pg_hw_bats')) return false; sessionStorage.setItem('pg_hw_bats', '1'); return true; } catch(e){ return false; }
}
var _HW_TELARANA = '<svg class="hw-web" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="1.1">'
  + '<path d="M100 0L0 0M100 0L0 32M100 0L0 72M100 0L28 100M100 0L68 100M100 0L100 100"/>'
  + '<circle cx="100" cy="0" r="22"/><circle cx="100" cy="0" r="42"/><circle cx="100" cy="0" r="62"/><circle cx="100" cy="0" r="82"/></g></svg>';
var _HW_SOMBRERO = '<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="46" rx="29" ry="7.5" fill="#2b1846"/>'
  + '<path d="M17 46L29 9Q33 3 37 9L49 46Z" fill="#2b1846"/><path d="M19.5 41.5L46 41.5L47.5 46.5L18 46.5Z" fill="#f28c28"/>'
  + '<rect x="30" y="41" width="6" height="6" rx="1" fill="#ffd166"/></svg>';
function hwBanner(){
  if(!hwActivo()) return '';
  var bats = _hwUnaVez() ? '<div class="hw-bats" aria-hidden="true"><span>🦇</span><span>🦇</span><span>🦇</span></div>' : '';
  return bats + '<div class="hw-banner" role="note">' + _HW_TELARANA
    + '<span class="hw-cal" aria-hidden="true">🎃</span>'
    + '<div><b>Feliz Halloween, equipo</b><small>Un detalle de estos días · se quita solo el 2 de noviembre</small></div>'
    + '<button type="button" class="hw-x" onclick="hwQuitar()" title="Quitar la decoración en este navegador">Quitar</button></div>';
}
// El sombrero en el pegaso de la barra lateral (se pone o se quita según toque)
function hwAplicar(){
  var on = hwActivo();
  var logo = (typeof document !== 'undefined' && document.querySelector) ? document.querySelector('.sb-logo') : null;
  if(!logo) return on;
  var hat = logo.querySelector('.hw-hat');
  if(on && !hat){ hat = document.createElement('span'); hat.className = 'hw-hat'; hat.innerHTML = _HW_SOMBRERO; logo.appendChild(hat); }
  else if(!on && hat && hat.remove) hat.remove();
  return on;
}
// El Dashboard (el de los administradores y el de los empleados salen por la misma puerta): el saludo va justo
// adentro de .page y la clase hw-page pinta el borde de las tarjetas solo ahí (Métricas web usa las mismas tarjetas).
function hwDecorarDash(html){
  hwAplicar();
  if(!hwActivo()) return html;
  var b = hwBanner();
  return /^\s*<div class="page/.test(html)
    ? html.replace(/^(\s*<div class=")page/, function(m, p){ return p + 'page hw-page'; }).replace(/^(\s*<div class="page hw-page[^>]*>)/, function(m){ return m + b; })
    : '<div class="hw-page">' + b + '</div>' + html;
}
(function(){
  if(typeof PG === 'undefined' || typeof PG.dash !== 'function') return;
  var orig = PG.dash;
  PG.dash = function(){ return hwDecorarDash(orig.apply(this, arguments)); };
})();
if(typeof document !== 'undefined' && document.head && document.head.insertAdjacentHTML) document.head.insertAdjacentHTML('beforeend', '<style id="hw-css">'
  + '.hw-page .kx-card{border-top:3px solid #f28c28}'
  + '.hw-banner{display:flex;align-items:center;gap:12px;background:linear-gradient(90deg,#1b1033,#2a1646 60%,#3a1d5c);color:#fff;border-radius:14px;padding:10px 14px;margin:0 0 14px;position:relative;overflow:hidden}'
  + '.hw-banner .hw-cal{font-size:28px;line-height:1}.hw-banner b{display:block;font-size:14px;font-weight:800}.hw-banner small{display:block;color:#d8c9ff;font-size:11.5px;margin-top:1px}'
  + '.hw-banner .hw-x{margin-left:auto;position:relative;z-index:1;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:8px;padding:4px 10px;font:inherit;font-size:11.5px;cursor:pointer}.hw-banner .hw-x:hover{background:rgba(255,255,255,.22)}'
  + '.hw-banner .hw-web{position:absolute;right:84px;top:-2px;width:72px;height:72px;opacity:.32;pointer-events:none}'
  + '.sb-logo .hw-hat{position:absolute;left:14px;top:3px;width:26px;height:23px;transform:rotate(-16deg);pointer-events:none}.sb-logo .hw-hat svg{width:100%;height:100%;display:block}'
  + '.hw-bats{position:fixed;left:-80px;top:16%;z-index:60;pointer-events:none;font-size:22px;white-space:nowrap;animation:hw-vuelo 7s ease-in-out 1 forwards}'
  + '.hw-bats span{display:inline-block;margin-right:16px;animation:hw-aleteo .45s ease-in-out infinite alternate}.hw-bats span:nth-child(2){font-size:17px;animation-delay:.12s}.hw-bats span:nth-child(3){font-size:27px;animation-delay:.25s}'
  + '@keyframes hw-vuelo{0%{transform:translate(0,0)}45%{transform:translate(50vw,-70px)}100%{transform:translate(120vw,30px);visibility:hidden}}'
  + '@keyframes hw-aleteo{from{transform:scaleY(1) rotate(-10deg)}to{transform:scaleY(.55) rotate(10deg)}}'
  + '@media (prefers-reduced-motion:reduce){.hw-bats{display:none}}'
  + '@media (max-width:820px){.hw-banner .hw-web{display:none}}'
  + '</style>');
