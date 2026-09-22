// Logica del Centro de trabajo: tareas, filtros, kanban y modales.
// Extraido de logic/clientes.js sin cambiar comportamiento.

// CENTRO DE TRABAJO — v6 rediseño completo
// ══════════════════════════════════════════
var WT_LS_KEY='pagasi_workcenter_tasks_v3';
var WT_FILTER='kanban';
var WT_LOADED=false;
var WT_NOTIFIED=false;
var _wtDragId=null;

function wtEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }

// ─── DAILY CARD para Centro de trabajo (Noticias/Tip/Chiste/Dato) ───
// Inyectar fonts de Google Fonts una sola vez
(function _injectFunFonts(){
  if(document.getElementById('wt-fun-fonts')) return;
  var link = document.createElement('link');
  link.id = 'wt-fun-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Lora:ital,wght@0,500;0,700;1,500&family=Bricolage+Grotesque:wght@600;800&display=swap';
  document.head.appendChild(link);
})();

var WT_TIPS = [
  '"Lo que se mide, se mejora." Revisa tu cartera vencida cada lunes a primera hora.',
  'Una moto se entrega tres veces: en el lote, en el contrato, y en la primera cuota a tiempo.',
  'El mejor cliente es el que paga puntual. Premia a los puntuales con un mensaje de "gracias" antes de pedir la siguiente cuota.',
  'No respondas WhatsApp después de las 8pm; protege tu tiempo personal. Los clientes lo respetan.',
  'El precio de la moto no es el problema. El problema es no haber explicado bien la cuota.',
  'Cobranza al día = libertad financiera. Un día de atraso es un día de tu plata trabajando para otro.',
  '"El cliente no compra una moto, compra movilidad y libertad." Vende eso, no las especificaciones.',
  'Un cliente referido vale 5 veces más que uno por publicidad. Pide referencias cuando paguen la última cuota.',
  'Si no sabes tu costo de oportunidad, todo te parece barato. Calcula cuánto te cuesta cada día de mora.',
  'Llama al cliente el día antes de su cuota, no después. Convierte el cobro en un servicio.',
  'Una factura emitida es un cliente más conectado. Pide su RIF/cédula al emitir y guarda los datos.',
  'Las primeras 3 cuotas predicen las 21 restantes. Si fallan ahí, el patrón se repite.',
  'Sorprende a tus mejores clientes con un casco gratis o una revisión. El boca a boca es tu mejor marketing.',
  'Si un cliente no contesta WhatsApp en 24h, llámalo. Si no contesta llamadas en 48h, ve al lote.',
  'Documenta todo: contratos firmados, fotos de la moto, copias de cédula. La memoria falla, los papeles no.',
  '"La calidad no es un acto, es un hábito." Aristóteles. Revisa cada moto antes de entregarla, sin excepción.',
  'El admin no es para llenarlo de datos, es para tomar decisiones más rápido. Si una pantalla no te ayuda a decidir, sobra.',
  'Un cliente con plan personalizado paga 30% más puntual que uno con plan estándar. Vale la conversación.',
  'Compite contigo, no con la competencia. Si este mes cobraste $20k, la meta del próximo es $22k.',
  'Un fiador firmado vale más que tres promesas verbales. No bajes ese requisito por presión de cerrar.',
  'Si un cliente tarda más de 1 hora en pensar la oferta, no la va a tomar. Ofrece dos opciones y deja que elija.',
  'Nadie nace sabiendo cobrar. Practica el guion de cobranza amable hasta que lo digas natural.',
  'Cada hora que un crédito está en mora cuesta tu margen del día. Cobranza temprana = ganancia real.',
  'El cliente que paga su última cuota merece una llamada de felicitación. Y un descuento si vuelve.',
  'Configura recordatorios automáticos 3 días antes de cada cuota. El olvido es enemigo del cobro.',
  'Mide tu APY real cada mes. Si bajó, algo está fallando: ya sea precio, plazo o cobranza.',
  'El sistema es tan bueno como los datos que le metes. Llena bien el perfil del cliente desde el primer contacto.',
  'No vendas crédito al primero que entra. Vende al que califica. La mora arruina más negocios que la falta de clientes.',
  '"Hay que pensar en grande, pero empezar pequeño." Cobra una cuota completa antes de pensar en 100.',
  'Cada lunes es nueva oportunidad. Empieza con la lista de morosos del viernes, no con emails.',
  'Celebra los logros chiquitos del equipo. 10 cobros perfectos en una semana merecen reconocimiento.',
  '"El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora." Lo mismo aplica para llamar al cliente moroso.',
  'Un cliente que protesta es un cliente que aún confía. El silencio es la verdadera señal de que se fue.',
  '"No puedes manejar lo que no mides." Peter Drucker. ¿Cuánto vendió cada vendedor el mes pasado? ¿Lo sabes de memoria?',
  'Sonríe al contestar el teléfono. Aunque no te vean, se escucha en la voz. Probado en estudios de telemarketing.',
  'La mejor hora para cobrar por WhatsApp es entre 10am y 12pm martes a jueves. Los lunes están ocupados, viernes ya gastaron la quincena.',
  'Un cliente promedio cancela 6.4 cuotas. Si recibes cobros mientras escribes cuotas, estás ganando. Si no, perdiendo.',
  'No prometas lo que no puedes cumplir. "Entrega mañana" cuando no llega, vale menos que decir "entrega en 3 días" y cumplir.',
  'El asesor que conoce su producto al detalle cierra el doble. Estudia ficha técnica de cada moto que vendes.',
  '"Si quieres ir rápido, ve solo. Si quieres llegar lejos, ve acompañado." Cobranza es equipo, no juego individual.',
  'Reúnete con tu equipo 15 minutos cada lunes. Repasen morosos, oportunidades y plan de la semana. Eso solo cambia el resultado.',
  'Un cobro a tiempo evita 3 cobros tarde. Llama el día 1, no el día 5.',
  '"Donde no hay dinero, todo se arregla con dinero. Donde hay dinero, todo se arregla con tiempo." Sé paciente con clientes nuevos.',
  'La empatía vende. Antes de presionar por la cuota, pregunta "¿cómo estás?". Cambia toda la conversación.',
  'Tu palabra es tu mayor activo. Si dijiste "te llamo el viernes a las 3", llama exactamente a esa hora.',
  'Un email con falta ortográfica cuesta credibilidad. Revisa dos veces antes de enviar mensajes a clientes.',
  '"El éxito es la suma de pequeños esfuerzos repetidos día tras día." 10 llamadas hoy son mejores que 100 mañana.',
  'Sé el primero en saludar a tus colegas en la mañana. La actitud se contagia, y tú quieres que se contagie la buena.',
  'Conoce los nombres de los hijos de tus mejores 10 clientes. Pequeño detalle, gigante diferencia.',
  'El que pierde el cliente no es siempre quien lo atendió mal. A veces es quien NO le dio seguimiento después.',
  'No discutas con un cliente molesto. Escucha. Anota. Resuelve. Las 3 en ese orden.',
  'Un "gracias" sincero vale más que tres "perfecto" automáticos. Personaliza tus mensajes.',
  '"Si lo puedes soñar, lo puedes hacer." Walt Disney. Empezó con un ratón animado, tú puedes con una flota de motos.',
  'Cada problema es una oportunidad disfrazada. Cuando un cliente reclama, ahí está tu chance de fidelizarlo de por vida.',
  'No prestes plata personal al cliente, ni siquiera "por esta vez". Mezclar plata y amistad nunca termina bien.',
  'Aprende a decir "no" con elegancia. "Entiendo tu situación, pero no podemos hacer esa excepción ahora" es perfecto.',
  '"El cliente promedio escucha 7 veces el mensaje antes de actuar." No te canses de recordarle su cuota.',
  'Un buen vendedor hace cita, no espera que llamen. Pregunta "¿prefiere viernes a las 3 o sábado a las 10?".',
  'Lleva un cuaderno de aprendizajes. Anota cada situación nueva con cliente. En 1 año tendrás tu propio manual.',
  'El silencio en la negociación es oro. Después de dar tu precio, no hables más. El primero que habla, pierde.',
  '"Tu trabajo va a llenar gran parte de tu vida. La única forma de estar verdaderamente satisfecho es hacer lo que crees es un gran trabajo." Steve Jobs.',
  'Un email se responde en 24h, un WhatsApp en 2h, una llamada al instante. Conoce las expectativas de cada canal.'
];

// ─── Chistes locales en español (fallback de JokeAPI) ──────────
var WT_CHISTES = [
  '¿Cuál es el animal más antiguo? La cebra, porque está en blanco y negro.',
  '¿Por qué los pájaros vuelan al sur en invierno? Porque está muy lejos para ir caminando.',
  '¿Qué le dice un techo a otro techo? Techo de menos.',
  '¿Cuál es la fruta más divertida? La naranja, porque siempre está partiéndose.',
  'Un programador va al supermercado, su esposa le dice: "compra leche, y si hay huevos, trae 6". Volvió con 6 cartones de leche.',
  '¿Por qué los buzos siempre se tiran de espaldas? Porque si se tiran de frente, caen en el bote.',
  'Mi mujer me dijo que dejara de actuar como flamenco, así que tuve que poner el pie en el suelo.',
  '¿Cuál es la diferencia entre un Lamborghini y una mujer enojada? Que del Lamborghini sí me puedo bajar.',
  '¿Qué hace un perro con un taladro? Taladrando.',
  'Doctor, doctor, ¿me va a doler? — Solo cuando vea la factura.',
  '¿Sabes cuántos psicólogos hacen falta para cambiar una bombilla? Solo uno, pero la bombilla tiene que querer cambiar.',
  'Mi jefe me dijo: "vístete para el trabajo que quieres, no para el que tienes". Así que ahora me visto de Batman.',
  '¿Por qué los esqueletos no pelean entre sí? Porque no tienen agallas.',
  'No confío en las escaleras. Siempre están tramando algo.',
  '¿Qué hace una abeja en el gimnasio? Zum-ba.',
  'Llamo a la compañía eléctrica y me dicen: "su factura está iluminada". Le contesto: pues yo a oscuras.',
  '¿Cómo se llama el campeón mundial de buceo japonés? Tokofondo.',
  'Mi terapeuta me dijo que el secreto para una vida feliz es el ejercicio. Le pregunté: "¿cardio?". Me dijo: "no, ignorarlo a uno".',
  '¿Qué le dice un jaguar a otro jaguar? Jaguar you?',
  'No soy vago, estoy en modo ahorro de energía.',
  'Si la vida te da limones, vende motos. Es más rentable.',
  '¿Qué le dice un semáforo a otro semáforo? No me mires que me estoy cambiando.',
  'El optimista dice: "el vaso está medio lleno". El pesimista: "medio vacío". El ingeniero: "el vaso es el doble de grande de lo necesario".',
  '¿Cómo se llama el primo gordo de Bruce Lee? Brus-quito.',
  'Mi mamá me dijo: "todo lo que quieras lo puedes lograr". Le dije: "quiero dormir". Me sacó a barrer.',
  '¿Qué hace una vaca cuando sale el sol? Sombra.',
  '¿Cuál es el último animal en entrar al Arca de Noé? El del-fin.',
  'Estoy a dieta. Comí ensalada de pollo. La ensalada era el pollo.',
  '¿Qué hace un pez? Nada.',
  'No fumo, no bebo, no salgo. Mi médula ósea está fresca para los cobros del lunes.'
];

// ─── Datos curiosos locales en español ──────────────────────────
var WT_DATOS = [
  'El motor más pequeño jamás fabricado para una motocicleta tiene apenas 0.4 cc y cabe en una mano.',
  'La primera motocicleta del mundo (1885) era de madera y solo alcanzaba 11 km/h.',
  'Las motos representan el 70% del tráfico en muchas ciudades del sudeste asiático.',
  'Los neumáticos de moto duran en promedio entre 12,000 y 25,000 km, dependiendo del estilo de manejo.',
  'Una moto típica tiene más de 2,000 piezas distintas, organizadas en 36 sistemas mecánicos.',
  'El récord de velocidad en moto es 605.7 km/h, logrado por el Top 1 Ack Attack en 2010.',
  'En Venezuela hay aproximadamente 4 millones de motos circulando.',
  'Un motor de 4 tiempos completa el ciclo de combustión cada 720° de giro del cigüeñal.',
  'Honda fabrica más motos al año que cualquier otra marca: aproximadamente 20 millones de unidades.',
  'El motociclista promedio recorre 8,000 km al año en países urbanos.',
  'Las motocicletas pueden inclinarse hasta 55° en una curva sin perder estabilidad si el motociclista lo hace correctamente.',
  'En 1907 se realizó la primera carrera Isle of Man TT, considerada hoy la más peligrosa del mundo.',
  'Una moto consume entre 3 y 5 veces menos combustible que un auto del mismo nivel de potencia.',
  'El cuerpo humano puede resistir hasta 9 G de fuerza durante una aceleración. Una MotoGP genera hasta 1.5 G al frenar.',
  'El "Wheelie" más largo registrado duró 307 km, en una sola rueda continua. Lo hizo Yasuyuki Kudo en Japón.',
  'La motocicleta más cara del mundo cuesta 11 millones de dólares: la Neiman Marcus Limited Edition Fighter.',
  'Un buen casco para moto debe absorber hasta 250 G de impacto sin transferirlos al cráneo.',
  'En Tailandia es legal viajar 4 personas en una moto, incluyendo bebés.',
  'Vietnam tiene más motos per cápita que cualquier país del mundo: 1 moto por cada 2 personas.',
  'El emoji de motocicleta 🏍 fue agregado a Unicode en 2015 como parte de la actualización 8.0.',
  'El término "biker" (motociclista) se acuñó en EE.UU. en la década de 1950, popularizado por la película The Wild One.',
  'La marca Harley-Davidson registró el sonido distintivo de sus motores como marca registrada en 1994.',
  'Las motos eléctricas modernas pueden generar el 100% de su torque desde 0 rpm, algo imposible en motores de combustión.',
  'En 2026 se espera que las motos eléctricas representen el 35% del mercado en Latinoamérica.',
  'La palabra "moto" viene del francés "motocyclette", acuñada en 1894.',
  'Una moto promedio pierde el 30% de su valor en los primeros 12 meses tras la compra.',
  'El uso del casco reduce las muertes por accidente de moto en un 42%, según la OMS.',
  'En Caracas, hay aproximadamente 1.5 motos por cada auto en circulación.',
  'El primer GPS para motocicleta fue lanzado por Garmin en 2003. Antes, los motociclistas dependían de mapas en papel.',
  'La sensación de "viento en la cara" libera dopamina y endorfinas, similar a la sensación de correr o nadar.',
  'Una moto típica de 150cc puede recorrer hasta 50 km con un litro de gasolina.',
  'Los frenos ABS reducen los accidentes en moto en un 31%, según un estudio europeo.',
  'En el siglo XIX existían motos de vapor antes que las de gasolina. Fracasaron por ser demasiado pesadas.',
  'El motor V-twin (forma de V) fue inventado por Indian Motorcycle en 1907.',
  'La cuesta más empinada subida por una moto comercial fue de 41.7% de pendiente.'
];

function _wtInitialsName(n){
  var p=(n||'').split(/\s+/).filter(Boolean);
  return ((p[0]||'')[0]||'?').toUpperCase()+((p[1]||'')[0]||'').toUpperCase();
}

function _wtParseCumple(v){
  if(!v) return null;
  var s = String(v).replace(/\//g,'-');
  var m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m1) return {mes:parseInt(m1[2],10), dia:parseInt(m1[3],10)};
  var m2 = s.match(/^(\d{1,2})-(\d{1,2})(?:-\d{2,4})?/);
  if(m2) return {mes:parseInt(m2[2],10), dia:parseInt(m2[1],10)};
  return null;
}

function wtCumplesHTML(){
  var hoyM = new Date().getMonth()+1, hoyD = new Date().getDate();
  var hoyDate = new Date(); hoyDate.setHours(0,0,0,0);

  var _bdaySrc = (typeof _usersCache!=='undefined' && _usersCache && _usersCache.length) ? _usersCache : (S._wtUsers||S.usuarios||[]);
  var cumplesEsteMes = _bdaySrc.filter(function(u){
    if(!u || u.eliminado) return false;
    var c = _wtParseCumple(u.cumpleanos || u.fechaNacimiento || u.bday);
    return c && c.mes === hoyM;
  }).map(function(u){
    var c = _wtParseCumple(u.cumpleanos || u.fechaNacimiento || u.bday);
    var diasFalt = c.dia - hoyD;
    if(diasFalt < 0) diasFalt = 365; // ya pasó este mes, ordenar al final
    return {nom:u.nombre||u.email||'Usuario', dia:c.dia, esHoy:c.dia===hoyD, diasFalt:diasFalt, yaPaso:c.dia<hoyD, genero:(u.genero||'')};
  }).sort(function(a,b){ return a.diasFalt - b.diasFalt; });
  var cumplesHoy = cumplesEsteMes.filter(function(u){return u.esHoy;});
  var mes = new Date().toLocaleDateString('es-VE',{month:'long'});
  var FONT_FUN = '"Caveat","Bricolage Grotesque",sans-serif';
  var confettiPattern = "background-image:radial-gradient(circle at 20% 20%,#FBCFE822 6px,transparent 7px),radial-gradient(circle at 80% 30%,#A7F3D022 5px,transparent 6px),radial-gradient(circle at 50% 70%,#FEF08A22 7px,transparent 8px),radial-gradient(circle at 10% 80%,#BFDBFE22 6px,transparent 7px),radial-gradient(circle at 90% 85%,#FBCFE822 5px,transparent 6px);background-size:200px 200px";

  if(cumplesEsteMes.length === 0){
    return '<div style="position:relative;padding:22px;background:linear-gradient(160deg,#FFF9F4 0%,#FDF2F8 100%);border:1px solid rgba(236,72,153,.18);border-radius:20px;height:100%;display:flex;flex-direction:column;overflow:hidden;'+confettiPattern+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;position:relative;z-index:1">'
        +'<div><div style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#BE185D">Cumpleaños</div>'
        +'<div style="font-size:22px;font-weight:800;color:var(--ink);text-transform:capitalize;margin-top:2px;font-family:'+FONT_FUN+'">'+mes+'</div></div>'
        +'<span style="background:#FCE7F3;color:#BE185D;padding:4px 11px;border-radius:50px;font-size:11px;font-weight:800;border:1px solid rgba(236,72,153,.22)">0</span>'
      +'</div>'
      +'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--ink3);position:relative;z-index:1">'
        +'<div style="font-size:48px;line-height:1;margin-bottom:14px;opacity:.42">🎂</div>'
        +'<div style="font-size:14px;line-height:1.5;font-weight:600;color:var(--ink2);max-width:240px">Este mes no hay cumpleaños registrados</div>'
        +'<div style="font-size:11.5px;line-height:1.55;margin-top:8px;color:var(--ink3);max-width:280px">Pide al equipo que llene su fecha de cumpleaños desde "Mi Perfil"</div>'
      +'</div>'
    +'</div>';
  }

  // Paletas por género: M=azul, F=rosa, sin género=neutra rosa (default)
  function _genPalette(genero){
    var g = String(genero||'').toLowerCase();
    var male = (g==='m'||g==='masculino'||g==='hombre');
    if(male) return {
      hoyBg:'linear-gradient(135deg,#DBEAFE 0%,#BFDBFE 50%,#93C5FD 100%)',
      hoyBorder:'#3B82F6', hoyAvatar:'linear-gradient(135deg,#3B82F6,#1D4ED8)',
      hoyDiaCol:'#1E3A8A', hoyBadgeBg:'#fff', hoyBadgeCol:'#1D4ED8',
      hoyShadow:'box-shadow:0 6px 18px rgba(59,130,246,.22)',
      futBg:'rgba(255,255,255,.7)', futBorder:'rgba(59,130,246,.22)',
      futAvatar:'linear-gradient(135deg,#60A5FA,#3B82F6)', futCol:'#1D4ED8'
    };
    // Femenino / sin género → rosa (default actual)
    return {
      hoyBg:'linear-gradient(135deg,#FCE7F3 0%,#FBCFE8 50%,#F9A8D4 100%)',
      hoyBorder:'#EC4899', hoyAvatar:'linear-gradient(135deg,#EC4899,#BE185D)',
      hoyDiaCol:'#831843', hoyBadgeBg:'#fff', hoyBadgeCol:'#BE185D',
      hoyShadow:'box-shadow:0 6px 18px rgba(236,72,153,.22)',
      futBg:'rgba(255,255,255,.7)', futBorder:'rgba(236,72,153,.20)',
      futAvatar:'linear-gradient(135deg,#F472B6,#A855F7)', futCol:'#BE185D'
    };
  }
  var rows = cumplesEsteMes.map(function(u){
    var bg, border, avatar, diaCol, diaTxt, badge, shadowStyle = '';
    var pal = _genPalette(u.genero);
    if(u.esHoy){
      bg = pal.hoyBg;
      border = pal.hoyBorder;
      avatar = pal.hoyAvatar;
      diaCol = pal.hoyDiaCol;
      diaTxt = 'HOY';
      badge = '<span style="background:'+pal.hoyBadgeBg+';color:'+pal.hoyBadgeCol+';padding:3px 9px;border-radius:50px;font-size:9.5px;font-weight:900;letter-spacing:.1em;animation:cakePulse 1.8s ease-in-out infinite">🎉 ¡HOY!</span>';
      shadowStyle = pal.hoyShadow;
    } else if(u.yaPaso){
      bg = '#F8FAFC';
      border = 'var(--rim)';
      avatar = 'var(--ink4)';
      diaCol = 'var(--ink3)';
      diaTxt = 'pasó';
      badge = '<span style="color:var(--ink3);font-family:var(--fd);font-weight:700;font-size:11px">día '+u.dia+'</span>';
    } else {
      bg = pal.futBg;
      border = pal.futBorder;
      avatar = pal.futAvatar;
      diaCol = pal.futCol;
      diaTxt = 'en '+u.diasFalt+'d';
      badge = '<span style="color:'+pal.futCol+';font-family:var(--fd);font-weight:800;font-size:11px">'+(u.diasFalt===1?'mañana':'en '+u.diasFalt+' días')+'</span>';
    }
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+bg+';border:1.5px solid '+border+';border-radius:12px;'+(u.esHoy?shadowStyle:'')+';transition:transform .15s">'
      +'<div style="width:36px;height:36px;border-radius:50%;background:'+avatar+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;box-shadow:0 4px 8px rgba(0,0,0,.08)">'+_wtInitialsName(u.nom)+'</div>'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:13.5px;font-weight:700;color:'+diaCol+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.2px">'+wtEsc(u.nom)+'</div>'
        +'<div style="font-size:10.5px;color:var(--ink3);font-weight:500;margin-top:1px">'+new Date(new Date().getFullYear(),hoyM-1,u.dia).toLocaleDateString('es-VE',{day:'numeric',month:'long'})+'</div>'
      +'</div>'
      +badge
    +'</div>';
  }).join('');

  return '<div style="position:relative;padding:22px;background:linear-gradient(160deg,#FFF9F4 0%,#FDF2F8 100%);border:1px solid rgba(236,72,153,.18);border-radius:20px;height:100%;display:flex;flex-direction:column;overflow:hidden;'+confettiPattern+'">'
    +'<style>@keyframes cakePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}</style>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;position:relative;z-index:1">'
      +'<div><div style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#BE185D">Cumpleaños</div>'
      +'<div style="font-size:22px;font-weight:800;color:var(--ink);text-transform:capitalize;margin-top:2px;font-family:'+FONT_FUN+'">'+mes+'</div></div>'
      +'<span style="background:#FCE7F3;color:#BE185D;padding:4px 11px;border-radius:50px;font-size:11px;font-weight:800;border:1px solid rgba(236,72,153,.22)">'+cumplesEsteMes.length+'</span>'
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px;flex:1;overflow-y:auto;position:relative;z-index:1">'+rows+'</div>'
    +(cumplesHoy.length ? (function(){
        // Determinar nombre y género para el botón manual.
        // Si el logueado es uno de los cumpleañeros, usar su género (será SU cotillón).
        // Si no, usar el del primero.
        var meEsCumple = S.currentUser && cumplesHoy.some(function(x){
          var n1=String(x.nom||'').toLowerCase().trim();
          var n2=String(S.currentUser.nombre||'').toLowerCase().trim();
          return n1===n2;
        });
        var nombreBtn, generoBtn, esTeammateBtn;
        if(meEsCumple){
          nombreBtn = S.currentUser.nombre || cumplesHoy[0].nom;
          generoBtn = S.currentUser.genero || '';
          esTeammateBtn = false;
        } else if(cumplesHoy.length === 1){
          nombreBtn = cumplesHoy[0].nom;
          generoBtn = cumplesHoy[0].genero || '';
          esTeammateBtn = true;
        } else {
          // Múltiples compañeros, ninguno soy yo → nombres concatenados
          var nombres = cumplesHoy.map(function(x){return x.nom;});
          nombreBtn = nombres.length===1 ? nombres[0]
            : (nombres.slice(0,-1).join(', ') + ' y ' + nombres[nombres.length-1]);
          generoBtn = cumplesHoy[0].genero || '';
          esTeammateBtn = true;
        }
        return '<button onclick="dispararCotillon(\''+wtEsc(nombreBtn)+'\','
          +(esTeammateBtn?'true':'false')+',\''+wtEsc(generoBtn)+'\')" '
          +'style="margin-top:14px;width:100%;background:linear-gradient(135deg,#EC4899 0%,#BE185D 100%);color:#fff;border:none;padding:13px;border-radius:13px;font-weight:800;font-size:13px;cursor:pointer;letter-spacing:.04em;box-shadow:0 8px 22px rgba(236,72,153,.42);position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:8px">🎊 Lanzar cotillón ahora</button>';
      })() : '')
  +'</div>';
}

function wtTopRowHTML(){
  return '<div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:18px;align-items:stretch">'
    + wtDailyCardHTML()
    + wtCumplesHTML()
  +'</div>';
}

function wtDailyCardHTML(){
  var hoyStr = new Date().toLocaleDateString('es-VE',{day:'numeric',month:'long'});

  // Fonts divertidos
  var FONT_CHISTE = '"Caveat",cursive';
  var FONT_DATO = '"Lora",Georgia,serif';
  var FONT_NOTICIA = '"Bricolage Grotesque","Inter",sans-serif';

  return ''
    +'<div class="wt-daily-card" style="background:#fff;border:1px solid var(--rim);border-radius:18px;overflow:hidden;box-shadow:0 4px 18px rgba(37,99,235,.05);height:100%;display:flex;flex-direction:column">'
    +'<div style="display:flex;border-bottom:1px solid var(--rim);background:var(--surf2)">'
      +'<button class="dly-tab is-active" data-tab="noticia" onclick="dashDailyTab(\'noticia\')" style="flex:1;background:transparent;border:none;font-family:inherit;font-size:12.5px;font-weight:800;color:var(--ink);padding:9px 8px;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;border-bottom:3px solid #DC2626">Noticias</button>'
      +'<button class="dly-tab" data-tab="chiste" onclick="dashDailyTab(\'chiste\')" style="flex:1;background:transparent;border:none;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--ink3);padding:9px 8px;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;border-bottom:3px solid transparent">Chiste</button>'
      +'<button class="dly-tab" data-tab="dato" onclick="dashDailyTab(\'dato\')" style="flex:1;background:transparent;border:none;font-family:inherit;font-size:12.5px;font-weight:700;color:var(--ink3);padding:9px 8px;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;border-bottom:3px solid transparent">Dato curioso</button>'
    +'</div>'
    +'<div style="padding:18px 22px 22px;min-height:140px;position:relative;flex:1">'

      // NOTICIAS — primera y única tab activa por defecto
      +'<div id="dly-tab-noticia" class="dly-content" style="display:block">'
        +'<div style="font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#DC2626;margin-bottom:8px;font-family:'+FONT_NOTICIA+'">Noticias del día · '+hoyStr+'</div>'
        +'<div id="dly-noticia-text" style="font-size:16px;line-height:1.5;color:var(--ink);font-family:'+FONT_NOTICIA+';font-weight:500">Cargando noticias…</div>'
        +'<button onclick="dashDailyLoad(\'noticia\',true)" style="position:absolute;bottom:18px;right:24px;background:#DC2626;color:#fff;border:none;padding:9px 18px;border-radius:50px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 4px 12px rgba(220,38,38,.28)">Refrescar →</button>'
      +'</div>'

      // CHISTE
      +'<div id="dly-tab-chiste" class="dly-content" style="display:none">'
        +'<div style="font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#F97316;margin-bottom:8px;font-family:'+FONT_NOTICIA+'">Chiste del día</div>'
        +'<div id="dly-chiste-text" style="font-size:30px;line-height:1.32;color:var(--ink);font-weight:600;font-family:'+FONT_CHISTE+';padding-right:140px">Cargando chiste…</div>'
        +'<button onclick="dashDailyLoad(\'chiste\',true)" style="position:absolute;bottom:18px;right:24px;background:#F97316;color:#fff;border:none;padding:9px 18px;border-radius:50px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 4px 12px rgba(249,115,22,.28)">Otro chiste →</button>'
      +'</div>'

      // DATO
      +'<div id="dly-tab-dato" class="dly-content" style="display:none">'
        +'<div style="font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#16A34A;margin-bottom:8px;font-family:'+FONT_NOTICIA+'">¿Sabías que…?</div>'
        +'<div id="dly-dato-text" style="font-size:22px;line-height:1.5;color:var(--ink);font-weight:500;font-family:'+FONT_DATO+';font-style:italic;padding-right:140px">Cargando dato…</div>'
        +'<button onclick="dashDailyLoad(\'dato\',true)" style="position:absolute;bottom:18px;right:24px;background:#16A34A;color:#fff;border:none;padding:9px 18px;border-radius:50px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 4px 12px rgba(22,163,74,.28)">Otro dato →</button>'
      +'</div>'

    +'</div>'
  +'</div>';
}

function wtToday(){ return hoyLocalISO(); }
function wtDateAdd(days){ var d=new Date(); d.setDate(d.getDate()+days); return fechaLocalISO(d); }
function wtUserName(){ return (S.currentUser&&(S.currentUser.nombre||S.currentUser.email||S.currentUser.uid))||'Administrador'; }
function wtIsMine(t){ if(isAdminUser()) return true; var me=(S.currentUser&&S.currentUser.email)||wtUserName(); var ass=String(t.asignadoEmail||t.asignadoA||'').toLowerCase(); var meL=me.toLowerCase(); return !ass||ass===meL||ass.indexOf(meL)>=0||meL.indexOf(ass)>=0; }
function wtIsMineStrict(t){ var meEmail=String((S.currentUser&&S.currentUser.email)||'').toLowerCase(); var meName=String(wtUserName()||'').toLowerCase(); var assE=String(t.asignadoEmail||'').toLowerCase(); var assN=String(t.asignadoA||'').toLowerCase(); if(!assE&&!assN) return true; if(assE&&meEmail&&assE===meEmail) return true; if(assN&&meName&&assN===meName) return true; return false; }

function wtDemoTasks(){ var me=wtUserName(); return [
  {id:'WT-DEMO-1',titulo:'Llamar leads aprobados de hoy',descripcion:'Contactar a los clientes aprobados y empujarlos a reservar la moto con inicial.',asignadoA:me,fecha:wtToday(),prioridad:'alta',estado:'pendiente',tipo:'Seguimiento',checklist:[{txt:'Revisar leads aprobados',done:true},{txt:'Enviar WhatsApp de aprobación rápida',done:false},{txt:'Agendar visita o cierre',done:false}],comentarios:[{user:'Sistema',fecha:new Date().toISOString(),txt:'Tarea sugerida para comenzar el día.'}],createdAt:new Date().toISOString()},
  {id:'WT-DEMO-2',titulo:'Validar documentos pendientes',descripcion:'Revisar cédula, referencia, contrato y soporte de inicial antes de entregar.',asignadoA:me,fecha:wtToday(),prioridad:'media',estado:'proceso',tipo:'Documentos',checklist:[{txt:'Verificar cédula',done:true},{txt:'Confirmar comprobante de inicial',done:true},{txt:'Subir contrato firmado',done:false}],comentarios:[],createdAt:new Date().toISOString()},
  {id:'WT-DEMO-3',titulo:'Cobranza preventiva',descripcion:'Clientes con cuota próxima: enviar recordatorio suave por WhatsApp.',asignadoA:me,fecha:wtDateAdd(1),prioridad:'media',estado:'pendiente',tipo:'Cobranza',checklist:[{txt:'Filtrar cuotas próximas',done:false},{txt:'Enviar mensaje de recordatorio',done:false}],comentarios:[],createdAt:new Date().toISOString()},
  {id:'WT-DEMO-4',titulo:'Cerrar entrega de moto',descripcion:'Checklist final antes de entregar una unidad financiada.',asignadoA:me,fecha:wtDateAdd(-1),prioridad:'alta',estado:'pendiente',tipo:'Entrega',checklist:[{txt:'Pago inicial confirmado',done:true},{txt:'Seguro / póliza registrado',done:false},{txt:'Fotos de entrega',done:false}],comentarios:[{user:'Sistema',fecha:new Date().toISOString(),txt:'Esta tarea aparece vencida para probar la alerta.'}],createdAt:new Date().toISOString()}
]; }

function wtLoadLocal(){ try{ S.tareas=JSON.parse(localStorage.getItem(WT_LS_KEY)||'[]')||[]; }catch(e){ S.tareas=[]; } if(!S.tareas||!S.tareas.length){ S.tareas=wtDemoTasks(); wtSaveLocal(); } }
function wtSaveLocal(){ try{ localStorage.setItem(WT_LS_KEY,JSON.stringify(S.tareas||[])); }catch(e){} }
function wtLoadRemote(){ if(WT_LOADED) return; WT_LOADED=true; wtLoadLocal(); if(typeof DB!=='undefined'&&DB.getTareas){ DB.getTareas().then(function(arr){ if(Array.isArray(arr)&&arr.length){ S.tareas=arr; wtSaveLocal(); if(S.page==='centro') nav('centro'); updateBadge(); } }).catch(function(){}); } }
function wtPersist(t){ wtSaveLocal(); if(t&&typeof DB!=='undefined'&&DB.saveTarea) DB.saveTarea(t); updateBadge(); }

function wtStats(){
  var today=wtToday();
  var mine=(S.tareas||[]).filter(function(t){ return !t.eliminado&&wtIsMine(t); });
  var active=mine.filter(function(t){ return !t.archivado; });
  return {
    hoy:active.filter(function(t){ return t.estado!=='completada'&&(t.fecha===today||!t.fecha); }).length,
    vencidas:active.filter(function(t){ return t.estado!=='completada'&&t.fecha&&t.fecha<today; }).length,
    proceso:active.filter(function(t){ return t.estado==='proceso'; }).length,
    completadas:active.filter(function(t){ return t.estado==='completada'; }).length,
    archivadas:mine.filter(function(t){ return !!t.archivado; }).length,
    total:active.length
  };
}

function wtFiltered(){
  var today=wtToday();
  return (S.tareas||[]).filter(function(t){
    if(t.eliminado||!wtIsMine(t)) return false;
    if(WT_FILTER==='archivadas') return !!t.archivado;
    if(t.archivado) return false;
    if(WT_FILTER==='hoy') return t.estado!=='completada'&&(t.fecha===today||!t.fecha);
    if(WT_FILTER==='vencidas') return t.estado!=='completada'&&t.fecha&&t.fecha<today;
    if(WT_FILTER==='proceso') return t.estado==='proceso';
    if(WT_FILTER==='completadas') return t.estado==='completada';
    return true;
  }).sort(function(a,b){
    var pa={alta:0,media:1,baja:2}[a.prioridad||'media'];
    var pb={alta:0,media:1,baja:2}[b.prioridad||'media'];
    return (a.fecha||'9999').localeCompare(b.fecha||'9999')||pa-pb;
  });
}

function wtMaybeNotify(){
  if(WT_NOTIFIED) return;
  var today=wtToday();
  var mine=(S.tareas||[]).filter(function(t){ return !t.eliminado&&!t.archivado&&wtIsMineStrict(t); });
  var hoy=mine.filter(function(t){ return t.estado!=='completada'&&(t.fecha===today||!t.fecha); }).length;
  var venc=mine.filter(function(t){ return t.estado!=='completada'&&t.fecha&&t.fecha<today; }).length;
  var total=hoy+venc;
  if(!total) return;
  WT_NOTIFIED=true;
  setTimeout(function(){ if(typeof toast==='function') toast('Tienes '+total+' tarea(s) pendientes en Centro de trabajo','info'); },350);
}

function wtPrioLabel(p){ return {alta:'Alta',media:'Media',baja:'Baja'}[p||'media']||'Media'; }
function wtHTML(){
  wtInjectStyle(); wtLoadRemote(); wtLoadUsers(); wtMaybeNotify();
  var st=wtStats(); var today=wtToday();
  var all=(S.tareas||[]).filter(function(t){ return !t.eliminado&&wtIsMine(t)&&!t.archivado; });
  var html='';
  html+=pageBanner('Centro de trabajo','Operación del equipo',
    '<b>'+st.total+'</b> activas · <b style="color:var(--red)">'+st.vencidas+'</b> vencidas · <b style="color:var(--amber)">'+st.proceso+'</b> en proceso',
    [{label:'+ Nueva tarea',onclick:'openWtTask()',primary:true}]);

  // ─── BANNER push notifications (solo si NO está activado) ────────
  if(typeof pushNotifSupported==='function' && pushNotifSupported() && pushNotifState()==='default'){
    html+='<div style="background:linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%);border:1px solid rgba(37,99,235,.20);border-radius:12px;padding:8px 14px;margin-bottom:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
      +'<div style="width:32px;height:32px;background:var(--p1);color:#fff;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'
      +'</div>'
      +'<div style="flex:1;min-width:200px"><div style="font-size:12.5px;font-weight:800;color:var(--ink);letter-spacing:-.2px">Activa notificaciones del navegador</div>'
      +'<div style="font-size:10.5px;color:var(--ink2);margin-top:1px;line-height:1.35">Te avisaremos de leads, cuotas vencidas o mora aunque no tengas el admin abierto.</div></div>'
      +'<button onclick="pushNotifRequest()" class="btn btn-p btn-sm" style="white-space:nowrap">Activar</button>'
    +'</div>';
  }

  // ─── Pre-cargar contenido del card diario (el card se renderiza al final, abajo) ──
  setTimeout(function(){
    if(typeof dashDailyLoad==='function'){
      setTimeout(function(){ dashDailyLoad('chiste', false); }, 200);
      setTimeout(function(){ dashDailyLoad('dato', false); }, 500);
      setTimeout(function(){ dashDailyLoad('noticia', false); }, 800);
    }
    // Cotillón si HOY es cumpleaños de alguien del equipo (usuario logueado o compañero)
    try {
      var _hoy = new Date();
      var _hoyKey = _hoy.getFullYear()+'-'+(_hoy.getMonth()+1)+'-'+_hoy.getDate();
      var _src = (typeof _usersCache!=='undefined' && _usersCache && _usersCache.length) ? _usersCache : (S._wtUsers||[]);
      // Incluir también al usuario logueado por si aún no está en el caché
      var _todos = _src.slice();
      if(S.currentUser && !_todos.find(function(x){return x && x.uid===S.currentUser.uid;})) _todos.push(S.currentUser);
      var cumpleHoy = _todos.filter(function(u){
        if(!u || u.eliminado) return false;
        var c = _wtParseCumple(u.cumpleanos || u.fechaNacimiento || u.bday);
        return c && c.mes === (_hoy.getMonth()+1) && c.dia === _hoy.getDate();
      });
      if(cumpleHoy.length && typeof dispararCotillon === 'function'){
        // Evitar repetir cotillón en la misma sesión Y una vez por día por usuario cumpleañero
        var lsKey = '_cotillonShown_'+_hoyKey;
        var yaShown = false;
        try { yaShown = !!localStorage.getItem(lsKey); } catch(e){}
        if(!window._cotillonShown && !yaShown){
          window._cotillonShown = true;
          try { localStorage.setItem(lsKey,'1'); } catch(e){}
          var nombres = cumpleHoy.map(function(u){return u.nombre||u.email||'Compañero/a';});
          var nombre = nombres.length === 1
            ? nombres[0]
            : (nombres.slice(0,-1).join(', ') + ' y ' + nombres[nombres.length-1]);
          var esYo = S.currentUser && cumpleHoy.some(function(u){ return u.uid === S.currentUser.uid; });
          // Determinar el género para el color de la tarjeta:
          // 1) Si el usuario logueado está entre los cumpleañeros, usar SU género (es "su" cotillón)
          // 2) Si no, y hay 1 solo cumpleañero, usar el de ese
          // 3) Si hay varios compañeros, usar el del primero
          var generoElegido = '';
          if(esYo && S.currentUser){
            generoElegido = S.currentUser.genero || '';
          } else if(cumpleHoy.length === 1){
            generoElegido = cumpleHoy[0].genero || '';
          } else if(cumpleHoy.length > 0){
            generoElegido = cumpleHoy[0].genero || '';
          }
          setTimeout(function(){ dispararCotillon(nombre, !esYo, generoElegido); }, 600);
        }
      }
    } catch(e){ console.warn('cotillon trigger:', e); }
  }, 100);
  if(st.hoy+st.vencidas>0){
    html+='<div style="background:#FFF6E5;border:1px solid #FAEEDA;border-radius:12px;padding:8px 14px;display:flex;align-items:center;gap:10px;margin-bottom:12px">'
      +'<div style="width:30px;height:30px;background:#FAEEDA;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#BA7517;flex-shrink:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></div>'
      +'<div style="flex:1"><div style="font-weight:800;font-size:13px;color:#854F0B">'+(st.hoy+st.vencidas)+' tarea(s) requieren atención · '+st.hoy+' hoy · '+st.vencidas+' vencidas</div></div>'
      +'<button class="btn btn-sm" style="background:#BA7517;color:#fff;border:none;font-weight:700;cursor:pointer" onclick="wtSetFilter(\'hoy\')">Ver</button></div>';
  }
  html+='<div class="sg" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">';
  html+=wtM6('Hoy',st.hoy,'',' #E6F1FB','#2563EB')+wtM6('Vencidas',st.vencidas,'','#FCEBEB','#E8335A')+wtM6('En proceso',st.proceso,'','#FAEEDA','#BA7517')+wtM6('Archivadas',st.archivadas,'','#E1F5EE','#00B876');
  html+='</div>';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px">';
  html+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
  [['kanban','Kanban'],['hoy','Hoy'],['vencidas','Vencidas'],['proceso','En proceso'],['completadas','Completadas'],['todas','Todas'],['archivadas','Archivadas']].forEach(function(f){
    html+='<button class="btn '+(WT_FILTER===f[0]?'btn-p':'btn-g')+' btn-sm" onclick="wtSetFilter(\''+f[0]+'\')">'+f[1]+'</button>';
  });
  html+='</div><span style="font-size:11px;color:var(--ink3);font-weight:700">'+wtEsc(isAdminUser()?'Equipo completo':'Mis tareas')+'</span></div>';
  if(WT_FILTER==='kanban'||WT_FILTER==='todas'){
    var cols=[
      {id:'pendiente',label:'Pendiente',color:'#2563EB',bg:'#E6F1FB',tc:'#185FA5',tasks:all.filter(function(t){return t.estado==='pendiente';})},
      {id:'proceso',label:'En proceso',color:'#BA7517',bg:'#FAEEDA',tc:'#854F0B',tasks:all.filter(function(t){return t.estado==='proceso';})},
      {id:'completada',label:'Completada',color:'#00B876',bg:'#E1F5EE',tc:'#0F6E56',tasks:all.filter(function(t){return t.estado==='completada';})},
    ];
    html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start">';
    cols.forEach(function(col){
      var venc=col.tasks.filter(function(t){return t.fecha&&t.fecha<today&&t.estado!=='completada';}).length;
      html+='<div style="background:var(--surf2);border-radius:12px;padding:8px;min-height:140px;transition:background .15s" ondragover="event.preventDefault();this.style.background=\'var(--gs)\'" ondragleave="this.style.background=\'\'" ondrop="wtDrop(event,\''+col.id+'\')">';
      html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
      html+='<div style="width:8px;height:8px;border-radius:50%;background:'+col.color+';flex-shrink:0"></div>';
      html+='<span style="font-size:13px;font-weight:800;color:var(--ink);flex:1">'+col.label+'</span>';
      html+='<span style="background:'+col.bg+';color:'+col.tc+';font-size:11px;font-weight:800;padding:2px 9px;border-radius:20px">'+col.tasks.length+'</span>';
      if(venc>0) html+='<span style="background:rgba(226,75,74,.12);color:#a32d2d;font-size:10px;font-weight:800;padding:2px 7px;border-radius:8px">'+venc+' venc.</span>';
      if(col.id==='completada' && col.tasks.length>0) html+='<button class="btn btn-g btn-xs" title="Eliminar todas las tareas completadas" onclick="event.stopPropagation();wtDeleteCompletadas()" style="padding:3px 7px;display:inline-flex;align-items:center;gap:4px;color:var(--red);border-color:rgba(226,75,74,.3)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>Limpiar</button>';
      html+='</div>';
      html+='<div style="height:2px;border-radius:2px;background:'+col.bg+';margin-bottom:10px"></div>';
      col.tasks.forEach(function(t){ html+=wtKanbanCard(t,today); });
      html+='<button class="btn btn-g btn-sm" style="width:100%;margin-top:4px;opacity:.6" onclick="openWtTask()">+ Agregar</button>';
      html+='</div>';
    });
    html+='</div>';
  } else {
    var rows=wtFiltered();
    if(!rows.length){
      html+='<div class="empty"><div class="e-ic">✓</div><div class="e-tt">Sin tareas en esta vista</div><button class="btn btn-p" style="margin-top:14px" onclick="openWtTask()">+ Nueva tarea</button></div>';
    } else {
      html+='<div style="display:flex;flex-direction:column;gap:8px">';
      rows.forEach(function(t){ html+=wtListCard(t,today); });
      html+='</div>';
    }
  }
  // ─── NOTICIAS + CUMPLE compactos al final ──
  html+='<div style="margin-top:16px;padding-top:14px;border-top:1px dashed var(--rim)"></div>';
  html+=wtTopRowHTML();
  return html;
}

function wtM6(label,val,icon,bg,color){
  var icons = {
    'hoy':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    'vencidas':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    'en proceso':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M21 12a9 9 0 1 1-6.2-8.5"/><path d="M21 3v6h-6"/></svg>',
    'archivadas':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>'
  };
  var svg = icons[label.toLowerCase()] || icon;
  return '<div class="stat" style="padding:10px 12px;display:flex;align-items:center;gap:10px;min-height:auto">'
    +'<div class="st-ic" style="background:'+bg+';color:'+color+';width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+svg+'</div>'
    +'<div style="display:flex;flex-direction:column;min-width:0">'
      +'<div class="st-v" style="font-size:22px;font-weight:900;line-height:1;color:var(--ink)">'+val+'</div>'
      +'<div class="st-l" style="margin:2px 0 0;font-size:11px;color:var(--ink3);font-weight:700">'+label+'</div>'
    +'</div></div>';
}

function wtKanbanCard(t,today){
  var prioBdg={alta:'b-r',media:'b-a',baja:'b-g'}[t.prioridad||'media']||'b-a';
  var borderCol={alta:'var(--red)',media:'var(--amber)',baja:'var(--green)'}[t.prioridad||'media']||'var(--amber)';
  var total=(t.checklist||[]).length,done=(t.checklist||[]).filter(function(c){return c.done;}).length,pct=total?Math.round(done/total*100):0;
  var isVenc=t.fecha&&t.fecha<today&&t.estado!=='completada';
  var comments=(t.comentarios||[]).length;
  var isDone=t.estado==='completada';
  var tid=wtEsc(t.id);
  var html='<div class="card" style="padding:10px 11px;margin-bottom:7px;cursor:pointer;user-select:none" draggable="true"'
    +' onclick="wtVerTarea(\''+tid+'\')"'
    +' ondragstart="event.stopPropagation();wtDragStart(event,\''+tid+'\')"'
    +' ondragend="document.querySelectorAll(\'[ondrop]\').forEach(function(c){c.style.background=\'\'})">';
  html+='<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px">';
  html+='<div style="font-size:13px;font-weight:700;color:var(--ink);flex:1;line-height:1.35'+(isDone?';text-decoration:line-through;opacity:.5':'')+'">'+wtEsc(t.titulo||'Sin titulo')+'</div>';
  html+='<span class="bdg '+prioBdg+'">'+wtPrioLabel(t.prioridad)+'</span>';
  html+='</div>';
  html+='<div style="font-size:11px;color:var(--ink3);margin-bottom:8px">';
  html+=wtEsc(t.asignadoA||'Sin asignar');
  if(t.fecha) html+=' · <span style="color:'+(isVenc?'var(--red)':'var(--ink3)')+'">'+wtEsc(t.fecha)+(isVenc?' !':'')+'</span>';
  html+='</div>';
  if(total>0){
    html+='<div style="background:var(--lift);border-radius:3px;height:3px;overflow:hidden;margin-bottom:4px"><div style="height:100%;width:'+pct+'%;background:var(--p1);border-radius:3px"></div></div>';
    html+='<div style="font-size:10px;color:var(--ink3);margin-bottom:8px">'+done+'/'+total+' pasos</div>';
  }
  html+='<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center" onclick="event.stopPropagation()">';
  html+='<span class="bdg b-p">'+wtEsc(t.tipo||'—')+'</span>';
  if(!t.archivado){
    html+='<button class="btn btn-g btn-xs" onclick="event.stopPropagation();openWtTask(\''+tid+'\')">Editar</button>';
    html+='<button class="btn btn-g btn-xs" onclick="event.stopPropagation();wtNextStatus(\''+tid+'\')">Avanzar</button>';
    html+='<button class="btn btn-g btn-xs" onclick="event.stopPropagation();wtArchive(\''+tid+'\')">Archivar</button>';
  } else {
    html+='<button class="btn btn-g btn-xs" onclick="event.stopPropagation();wtRestore(\''+tid+'\')">Restaurar</button>';
  }
  if(comments>0) html+='<span style="font-size:11px;color:var(--ink3);margin-left:auto">💬 '+comments+'</span>';
  html+='</div></div>';
  return html;
}

function wtListCard(t,today){
  var prioBdg={alta:'b-r',media:'b-a',baja:'b-g'}[t.prioridad||'media']||'b-a';
  var borderCol={alta:'var(--red)',media:'var(--amber)',baja:'var(--green)'}[t.prioridad||'media']||'var(--amber)';
  var isVenc=t.fecha&&t.fecha<today&&t.estado!=='completada';
  var total=(t.checklist||[]).length,done=(t.checklist||[]).filter(function(c){return c.done;}).length,pct=total?Math.round(done/total*100):0;
  var comments=(t.comentarios||[]).length;
  var tid=wtEsc(t.id);
  var statusPill=t.archivado?'<span class="bdg b-x">Archivada</span>':(t.estado==='completada'?'<span class="bdg b-g">Completada</span>':(isVenc?'<span class="bdg b-r">Vencida</span>':(t.estado==='proceso'?'<span class="bdg b-a">En proceso</span>':'<span class="bdg b-p">Pendiente</span>')));
  var act=t.archivado
    ?'<button class="btn btn-g btn-sm" onclick="event.stopPropagation();wtRestore(\''+tid+'\')">Restaurar</button>'
    :'<button class="btn btn-g btn-sm" onclick="event.stopPropagation();wtNextStatus(\''+tid+'\')">Avanzar</button><button class="btn btn-g btn-sm" onclick="event.stopPropagation();openWtTask(\''+tid+'\')">Editar</button><button class="btn btn-g btn-sm" onclick="event.stopPropagation();wtArchive(\''+tid+'\')">Archivar</button>';
  return '<div class="card" style="padding:14px;cursor:pointer" onclick="wtVerTarea(\''+tid+'\')">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-weight:700;font-size:14px;margin-bottom:4px;color:var(--ink)">'+wtEsc(t.titulo)+'</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:4px">'
    +'<span class="bdg b-p" style="margin-right:4px">'+wtEsc(t.tipo||'—')+'</span>'
    +wtEsc(t.asignadoA||'Sin asignar')
    +(t.fecha?' · <span style="color:'+(isVenc?'var(--red)':'var(--ink3)')+'">'+wtEsc(t.fecha)+(isVenc?' !':'')+'</span>':'')
    +'</div>'
    +(t.descripcion?'<div style="font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.4">'+wtEsc(t.descripcion.slice(0,120))+(t.descripcion.length>120?'...':'')+'</div>':'')
    +(total>0?'<div style="margin-top:8px"><div style="background:var(--lift);border-radius:3px;height:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--p1);border-radius:3px"></div></div><div style="font-size:10px;color:var(--ink3);margin-top:3px">'+done+'/'+total+' pasos · '+pct+'%</div></div>':'')
    +'</div>'
    +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">'
    +statusPill
    +'<span class="bdg '+prioBdg+'">'+wtPrioLabel(t.prioridad)+'</span>'
    +(comments>0?'<span style="font-size:11px;color:var(--ink3)">💬 '+comments+'</span>':'')
    +'<div style="display:flex;gap:5px;margin-top:3px">'+act+'</div>'
    +'</div></div></div>';
}

function wtDragStart(e,id){ _wtDragId=id; e.dataTransfer.effectAllowed='move'; var el=e.currentTarget; el.style.opacity='.5'; setTimeout(function(){el.style.opacity='1';},0); }
function wtDrop(e,nuevoEstado){ e.preventDefault(); e.currentTarget.style.background=''; if(!_wtDragId) return; var t=(S.tareas||[]).find(function(x){return x.id===_wtDragId;}); _wtDragId=null; if(!t||t.estado===nuevoEstado) return; t.estado=nuevoEstado; t.updatedAt=new Date().toISOString(); wtPersist(t); nav('centro'); toast('Movida a '+nuevoEstado,'ok'); }
function wtNextStatus(id){ var t=(S.tareas||[]).find(function(x){return x.id===id;}); if(!t) return; t.estado=t.estado==='pendiente'?'proceso':(t.estado==='proceso'?'completada':'pendiente'); t.updatedAt=new Date().toISOString(); wtPersist(t); nav('centro'); }
function wtArchive(id){ var t=(S.tareas||[]).find(function(x){return x.id===id;}); if(!t) return; if(!confirm('Archivar esta tarea?')) return; t.archivado=true; t.archivedAt=new Date().toISOString(); t.updatedAt=new Date().toISOString(); wtPersist(t); closeM(); nav('centro'); toast('Tarea archivada','info'); }
function wtRestore(id){ var t=(S.tareas||[]).find(function(x){return x.id===id;}); if(!t) return; t.archivado=false; t.updatedAt=new Date().toISOString(); wtPersist(t); nav('centro'); toast('Tarea restaurada','ok'); }
function wtDeleteCompletadas(){
  var done=(S.tareas||[]).filter(function(t){ return !t.eliminado && t.estado==='completada' && wtIsMine(t); });
  if(!done.length){ toast('No hay tareas completadas','info'); return; }
  if(!confirm('¿Eliminar '+done.length+' tarea(s) completada(s)? Se quitan del tablero.')) return;
  done.forEach(function(t){
    t.eliminado=true; t.updatedAt=new Date().toISOString();
    if(typeof DB!=='undefined' && DB.saveTarea) DB.saveTarea(t);
  });
  wtSaveLocal(); updateBadge(); nav('centro');
  if(typeof logActividad==='function') logActividad('Eliminó completadas','centro','tareas',done.length+' tarea(s)');
  toast(done.length+' tarea(s) completada(s) eliminada(s)','ok');
}
window.wtDeleteCompletadas = wtDeleteCompletadas;
function wtSetFilter(k){ WT_FILTER=k; nav('centro'); }
function wtLoadUsers(){
  // Use existing _usersCache if available (populated by Configuracion > Usuarios)
  if(typeof _usersCache !== 'undefined' && _usersCache.length){
    S._wtUsers = _usersCache;
    return;
  }
  if(!S._wtUsers || !S._wtUsers.length){
    S._wtUsers=[];
    if(typeof DB!=='undefined'&&DB.getUsuarios){
      DB.getUsuarios().then(function(u){
        S._wtUsers=Array.isArray(u)?u:[];
        if(typeof _usersCache!=='undefined') _usersCache=S._wtUsers;
        // Re-renderizar centro para reflejar cumpleaños del equipo si estamos ahí
        if(S.page==='centro' && typeof nav==='function'){ try { nav('centro'); } catch(e){} }
      }).catch(function(){});
    }
  }
}

// ── Estilos inyectados una sola vez ──────────────────────────
function wtInjectStyle(){
  if(document.getElementById('wt-v7-style')) return;
  var st=document.createElement('style'); st.id='wt-v7-style';
  st.textContent=[
    '.wt7-modal{max-width:920px!important;width:calc(100vw - 28px)!important;border-radius:18px!important;overflow:hidden!important;}',
    '.wt7-body{padding:0!important;overflow:auto!important;max-height:calc(92vh - 80px)!important;}',
    '.wt7-tipo-bar{display:flex;gap:0;border-bottom:1px solid var(--rim,#e8e6f5);padding:0 22px;background:var(--surf2,#f7f6ff);overflow-x:auto;}',
    '.wt7-tab{padding:10px 15px;font-size:13px;color:var(--ink3,#7b7a94);cursor:pointer;border-bottom:2.5px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:6px;flex-shrink:0;}',
    '.wt7-tab.on{color:var(--p1,#534ab7);border-bottom-color:var(--p1,#534ab7);font-weight:800;}',
    '.wt7-body-inner{display:grid;grid-template-columns:1fr 272px;background:var(--bg,#fff);}',
    '.wt7-left{padding:20px 22px;border-right:1px solid var(--rim,#e8e6f5);}',
    '.wt7-right{padding:18px 16px;background:var(--surf2,#f7f6ff);}',
    '.wt7-label{display:block;font-size:11px;font-weight:900;color:var(--ink3,#7b7a94);text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px;}',
    '.wt7-input{width:100%;height:42px;border-radius:10px;padding:0 13px;background:var(--bg,#fff);color:var(--ink,#15142b);border:1px solid var(--rim,#e8e6f5);font-size:14px;outline:none;transition:border-color .15s;}',
    '.wt7-input:focus{border-color:var(--p1,#534ab7);}',
    '.wt7-input.big{height:48px;font-size:15px;font-weight:700;}',
    '.wt7-textarea{width:100%;border-radius:10px;padding:11px 13px;background:var(--bg,#fff);color:var(--ink,#15142b);border:1px solid var(--rim,#e8e6f5);font-size:14px;outline:none;resize:vertical;line-height:1.5;transition:border-color .15s;}',
    '.wt7-textarea:focus{border-color:var(--p1,#534ab7);}',
    '.wt7-select{width:100%;height:42px;border-radius:10px;padding:0 13px;background:var(--bg,#fff);color:var(--ink,#15142b);border:1px solid var(--rim,#e8e6f5);font-size:14px;cursor:pointer;outline:none;}',
    '.wt7-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}',
    '.wt7-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}',
    '.wt7-field{margin-bottom:14px;}',
    '.wt7-prio-wrap{display:flex;gap:8px;}',
    '.wt7-prio-opt{flex:1;padding:9px 6px;border-radius:10px;text-align:center;cursor:pointer;border:1px solid var(--rim,#e8e6f5);background:var(--bg,#fff);font-size:12px;font-weight:700;color:var(--ink3,#7b7a94);}',
    '.wt7-prio-opt.alta{background:#fcebeb;border-color:#f09595;color:#791f1f;}',
    '.wt7-prio-opt.media{background:#faeeda;border-color:#fac775;color:#633806;}',
    '.wt7-prio-opt.baja{background:#eaf3de;border-color:#c0dd97;color:#27500a;}',
    '.wt7-estado-wrap{display:flex;gap:6px;}',
    '.wt7-estado-opt{flex:1;padding:8px 4px;border-radius:9px;text-align:center;cursor:pointer;border:1px solid var(--rim,#e8e6f5);background:var(--bg,#fff);font-size:12px;color:var(--ink3,#7b7a94);}',
    '.wt7-estado-opt.on{background:#eeedfe;border-color:#afa9ec;color:#3c3489;font-weight:800;}',
    '.wt7-divider{height:1px;background:var(--rim,#e8e6f5);margin:16px 0;}',
    '.wt7-ck-row{display:grid;grid-template-columns:20px 1fr 28px;gap:8px;align-items:center;margin-bottom:7px;}',
    '.wt7-ck-row input[type=checkbox]{width:17px;height:17px;accent-color:var(--p1,#534ab7);cursor:pointer;}',
    '.wt7-ck-del{width:26px;height:26px;border-radius:7px;border:1px solid var(--rim,#e8e6f5);background:transparent;color:var(--ink3,#7b7a94);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;}',
    '.wt7-ck-del:hover{background:#fee2e2;border-color:#fca5a5;color:#dc2626;}',
    '.wt7-add-ck{width:100%;background:transparent;border:1px dashed var(--rim2,#ccc);border-radius:9px;padding:8px;font-size:12px;color:var(--ink3,#7b7a94);cursor:pointer;margin-top:3px;}',
    '.wt7-pbar{height:3px;background:var(--gs,#eeedf8);border-radius:2px;overflow:hidden;margin:8px 0 3px;}',
    '.wt7-pfill{height:100%;background:var(--p1,#534ab7);border-radius:2px;}',
    '.wt7-pbtext{font-size:10px;color:var(--ink3,#7b7a94);margin-bottom:8px;}',
    '.wt7-rcard{background:var(--bg,#fff);border:1px solid var(--rim,#e8e6f5);border-radius:12px;padding:13px;margin-bottom:10px;}',
    '.wt7-rcard-head{display:flex;align-items:center;gap:9px;margin-bottom:10px;}',
    '.wt7-rcard-ico{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.wt7-rcard-title{font-size:13px;font-weight:800;color:var(--ink,#15142b);}',
    '.wt7-rcard-sub{font-size:11px;color:var(--ink3,#7b7a94);margin-top:1px;}',
    '.wt7-remind-wrap{display:flex;gap:5px;}',
    '.wt7-remind-opt{flex:1;padding:7px 3px;border-radius:8px;border:1px solid var(--rim,#e8e6f5);background:transparent;font-size:11px;color:var(--ink3,#7b7a94);cursor:pointer;text-align:center;}',
    '.wt7-remind-opt.on{background:#eeedfe;border-color:#afa9ec;color:#3c3489;font-weight:800;}',
    '.wt7-comment-empty{font-size:12px;color:var(--ink3,#7b7a94);padding:13px;text-align:center;border:1px dashed var(--rim2,#ccc);border-radius:9px;margin-bottom:9px;}',
    '.wt7-comment{background:var(--surf2,#f7f6ff);border-radius:10px;padding:10px 12px;margin-bottom:7px;}',
    '.wt7-cmeta{font-size:10.5px;color:var(--ink3,#7b7a94);font-weight:800;margin-bottom:3px;}',
    '.wt7-ctxt{font-size:13px;color:var(--ink2,#4a4760);line-height:1.45;}',
  ].join('');
  document.head.appendChild(st);
}

function wtAddCheckRow(){
  var box=$('wtchecks'); if(!box) return;
  var i=Date.now();
  var d=document.createElement('div'); d.className='wt-ck-row'; d.style.cssText='display:grid;grid-template-columns:24px 1fr 28px;gap:8px;align-items:center;margin-bottom:8px';
  d.innerHTML='<input type="checkbox" id="wtck_'+i+'" style="width:17px;height:17px;accent-color:var(--p1);cursor:pointer">'
    +'<input class="fi" id="wtcktxt_'+i+'" placeholder="Siguiente paso...">'
    +'<button type="button" style="width:26px;height:26px;border-radius:7px;border:1px solid var(--rim);background:transparent;color:var(--ink3);cursor:pointer;font-size:15px" onclick="this.closest(\'.wt-ck-row\').remove()">x</button>';
  box.appendChild(d);
  var inp=d.querySelector('.fi'); if(inp) inp.focus();
}

function openWtTask(id){
  wtLoadUsers();
  var isNew=!id;
  var t=isNew
    ?{id:'T'+Date.now(),titulo:'',descripcion:'',asignadoA:wtUserName(),asignadoEmail:(S.currentUser&&S.currentUser.email)||'',
      fecha:wtToday(),prioridad:'media',estado:'pendiente',tipo:'Operacional',recordatorio:'vencer',
      checklist:[{txt:'',done:false}],comentarios:[]}
    :((S.tareas||[]).find(function(x){return x.id===id;})||{});
  S._wtEditing=t;

  // Usuarios
  var users=S._wtUsers||[];
  var selEmail=t.asignadoEmail||(S.currentUser&&S.currentUser.email)||'';
  var selName=t.asignadoA||wtUserName();
  var userOpts='<option value="">— Sin asignar —</option>';
  if(users.length){
    users.forEach(function(u){
      var em=u.email||u.uid||''; var nm=u.nombre||u.displayName||em;
      var sel=(selEmail&&em===selEmail)||(!selEmail&&(nm===selName||nm.indexOf(selName)>=0||selName.indexOf(nm)>=0));
      userOpts+='<option value="'+wtEsc(em)+'" '+(sel?'selected':'')+'>'+wtEsc(nm)+((u.cargo||u.rol)?' · '+wtEsc(u.cargo||u.rol):'')+'</option>';
    });
  } else {
    userOpts+='<option value="'+wtEsc(selEmail||selName)+'" selected>'+wtEsc(selName)+'</option>';
    if(typeof DB!=='undefined'&&DB.getUsers){ DB.getUsers().then(function(arr){ if(Array.isArray(arr)&&arr.length) S._wtUsers=arr; }).catch(function(){}); }
  }

  // Checklist
  var ck=(t.checklist&&t.checklist.length?t.checklist:[{txt:'',done:false}]).map(function(c,i){
    return '<div style="display:grid;grid-template-columns:24px 1fr 28px;gap:8px;align-items:center;margin-bottom:8px" class="wt-ck-row">'
      +'<input type="checkbox" id="wtck_'+i+'" '+(c.done?'checked':'')+' style="width:17px;height:17px;accent-color:var(--p1);cursor:pointer">'
      +'<input class="fi" id="wtcktxt_'+i+'" value="'+wtEsc(c.txt||'')+'" placeholder="Paso...">'
      +'<button type="button" style="width:26px;height:26px;border-radius:7px;border:1px solid var(--rim);background:transparent;color:var(--ink3);cursor:pointer;font-size:15px" onclick="this.closest(\'.wt-ck-row\').remove()">×</button>'
      +'</div>';
  }).join('');
  var ckDone=(t.checklist||[]).filter(function(c){return c.done;}).length;
  var ckTotal=(t.checklist||[]).length;
  var ckPct=ckTotal?Math.round(ckDone/ckTotal*100):0;

  // Comentarios
  var comments=(t.comentarios||[]).map(function(c){
    return '<div style="background:var(--surf2);border-radius:10px;padding:10px 12px;margin-bottom:7px">'
      +'<div style="font-size:10.5px;color:var(--ink3);font-weight:800;margin-bottom:3px">'+wtEsc(c.user||'Usuario')+' · '+(typeof fmtFechaHora==='function'?fmtFechaHora(c.fecha):wtEsc((c.fecha||'').slice(0,16).replace('T',' ')))+'</div>'
      +'<div style="font-size:13px;color:var(--ink2);line-height:1.45">'+wtEsc(c.txt)+'</div>'
      +'</div>';
  }).join('')||'<div style="font-size:12px;color:var(--ink3);padding:14px;text-align:center;border:1px dashed var(--rim);border-radius:9px;margin-bottom:9px">Sin comentarios</div>';

  // Header del modal — igual al sistema
  var titleEl=$('mtt')||$('mttl'); if(titleEl) titleEl.textContent=isNew?'Nueva tarea':'Editar tarea';
  var subEl=$('msb'); if(subEl) subEl.textContent='Centro de trabajo · checklist · comentarios';
  var ic=$('mic'); if(ic){ ic.textContent='WK'; ic.style.cssText='font-family:var(--fm);font-size:10px;font-weight:700;color:var(--p1)'; }
  var modal=document.querySelector('#ov .modal')||document.querySelector('#ov [class*=modal]');
  if(modal){ modal.style.maxWidth='900px'; modal.style.width='calc(100vw - 28px)'; }
  var mbd=$('mbd'); if(mbd) mbd.style.padding='0';

  // Tabs de tipo
  var tipos=['Operacional','Cliente','Moto / credito','Cobranza','Documentos','Interno'];
  var tipoActivo=t.tipo||'Operacional';
  var tipoTabs=tipos.map(function(tp){
    var on=tp===tipoActivo;
    return '<button type="button" onclick="wtSetTipoTab(this,\''+wtEsc(tp)+'\')" data-tipo="'+wtEsc(tp)+'" style="padding:10px 15px;font-size:13px;color:'+(on?'var(--p1)':'var(--ink3)')+';cursor:pointer;border:none;border-bottom:2.5px solid '+(on?'var(--p1)':'transparent')+';white-space:nowrap;background:transparent;font-weight:'+(on?'800':'400')+'">'+wtEsc(tp)+'</button>';
  }).join('');

  // Campos contextuales
  var ctxFields='';
  if(tipoActivo==='Cliente'){
    ctxFields='<div class="fg" style="margin-bottom:14px"><label>Cliente vinculado</label><input class="fi" id="wt7-ctx-cliente" value="'+wtEsc(t.ctxCliente||'')+'" placeholder="Buscar cliente..."></div>';
  } else if(tipoActivo==='Moto / credito'){
    ctxFields='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
      +'<div class="fg"><label>Cliente</label><input class="fi" id="wt7-ctx-cliente" value="'+wtEsc(t.ctxCliente||'')+'" placeholder="Cliente..."></div>'
      +'<div class="fg"><label>Credito / moto</label><input class="fi" id="wt7-ctx-credito" value="'+wtEsc(t.ctxCredito||'')+'" placeholder="# credito o placa"></div>'
      +'</div>';
  } else if(tipoActivo==='Cobranza'){
    ctxFields='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
      +'<div class="fg"><label>Cliente en mora</label><input class="fi" id="wt7-ctx-cliente" value="'+wtEsc(t.ctxCliente||'')+'" placeholder="Cliente..."></div>'
      +'<div class="fg"><label>Monto a cobrar</label><input class="fi" id="wt7-ctx-monto" value="'+wtEsc(t.ctxMonto||'')+'" placeholder="$0.00"></div>'
      +'</div>';
  }

  $('mbd').innerHTML='<input type="hidden" id="wt7-tipo-val" value="'+wtEsc(tipoActivo)+'">'
    // Barra de tabs
    +'<div style="display:flex;gap:0;border-bottom:1px solid var(--rim);padding:0 22px;background:var(--surf2);overflow-x:auto">'+tipoTabs+'</div>'
    // Body en 2 columnas
    +'<div style="display:grid;grid-template-columns:1fr 272px">'
    // Columna izquierda
    +'<div data-wtcol="left" style="padding:20px 22px;border-right:1px solid var(--rim)">'
    +'<div class="fg" data-wtfield="titulo" style="margin-bottom:14px"><label>Que hay que hacer?</label>'
    +'<input class="fi" id="wttitulo" value="'+wtEsc(t.titulo||'')+'" placeholder="Ej: Llamar al banco, pedir documento..." style="font-size:15px;font-weight:700;padding:10px 12px"></div>'
    +'<div class="fg" data-wtfield="desc" style="margin-bottom:14px"><label>Descripcion / notas</label>'
    +'<textarea class="fta" id="wtdesc" rows="2" placeholder="Contexto, links o detalles...">'+wtEsc(t.descripcion||'')+'</textarea></div>'
    +ctxFields
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
    +'<div class="fg"><label>Asignar a</label><select class="fs" id="wtasig">'+userOpts+'</select></div>'
    +'<div class="fg"><label>Sede</label><select class="fs" id="wt7-sede">'
    +'<option value="" '+((!t.sede)?'selected':'')+'>Todas las sedes</option>'
    +'<option value="Empire" '+(t.sede==='Empire'?'selected':'')+'>Empire</option>'
    +'<option value="Toro" '+(t.sede==='Toro'?'selected':'')+'>Toro</option>'
    +'</select></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
    +'<div class="fg"><label>Fecha limite</label><input class="fi" id="wtfecha" type="date" value="'+wtEsc(t.fecha||'')+'"></div>'
    +'<div class="fg"><label>Hora (opcional)</label><input class="fi" id="wt7-hora" type="time" value="'+wtEsc(t.hora||'')+'"></div></div>'
    +'<div class="fg" style="margin-bottom:14px"><label>Prioridad</label>'
    +'<div style="display:flex;gap:8px">'
    +'<button type="button" data-prio="alta" id="wt7-prio-alta" onclick="wtSetPrio(\'alta\')" style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--rim);background:'+(t.prioridad==='alta'?'#fee2e2':'var(--surf)')+';color:'+(t.prioridad==='alta'?'#991b1b':'var(--ink3)')+';cursor:pointer;font-size:13px;font-weight:600">Alta</button>'
    +'<button type="button" data-prio="media" id="wt7-prio-media" onclick="wtSetPrio(\'media\')" style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--rim);background:'+(!t.prioridad||t.prioridad==='media'?'#fef3c7':'var(--surf)')+';color:'+(!t.prioridad||t.prioridad==='media'?'#92400e':'var(--ink3)')+';cursor:pointer;font-size:13px;font-weight:600">Media</button>'
    +'<button type="button" data-prio="baja" id="wt7-prio-baja" onclick="wtSetPrio(\'baja\')" style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--rim);background:'+(t.prioridad==='baja'?'#dcfce7':'var(--surf)')+';color:'+(t.prioridad==='baja'?'#166534':'var(--ink3)')+';cursor:pointer;font-size:13px;font-weight:600">Baja</button>'
    +'<input type="hidden" id="wt7-prio-val" value="'+wtEsc(t.prioridad||'media')+'">'
    +'</div></div>'
    +'<div class="fg" style="margin-bottom:14px"><label>Estado</label>'
    +'<div style="display:flex;gap:6px">'
    +'<button type="button" data-estado="pendiente" onclick="wtSetEstado(\'pendiente\')" style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--rim);background:'+(!t.estado||t.estado==='pendiente'?'var(--gb)':'var(--surf)')+';color:'+(!t.estado||t.estado==='pendiente'?'var(--p1)':'var(--ink3)')+';cursor:pointer;font-size:13px;font-weight:'+(!t.estado||t.estado==='pendiente'?'800':'400')+'">Pendiente</button>'
    +'<button type="button" data-estado="proceso" onclick="wtSetEstado(\'proceso\')" style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--rim);background:'+(t.estado==='proceso'?'var(--ambers)':'var(--surf)')+';color:'+(t.estado==='proceso'?'var(--amber)':'var(--ink3)')+';cursor:pointer;font-size:13px;font-weight:'+(t.estado==='proceso'?'800':'400')+'">En proceso</button>'
    +'<button type="button" data-estado="completada" onclick="wtSetEstado(\'completada\')" style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--rim);background:'+(t.estado==='completada'?'var(--greens)':'var(--surf)')+';color:'+(t.estado==='completada'?'var(--green)':'var(--ink3)')+';cursor:pointer;font-size:13px;font-weight:'+(t.estado==='completada'?'800':'400')+'">Completada</button>'
    +'<input type="hidden" id="wt7-estado-val" value="'+wtEsc(t.estado||'pendiente')+'">'
    +'</div></div>'
    +'<div style="height:1px;background:var(--rim);margin:4px 0 16px"></div>'
    +'<div class="fg"><label>Checklist de pasos</label>'
    +'<div id="wtchecks">'+ck+'</div>'
    +(ckTotal>0?'<div style="background:var(--gs);border-radius:3px;height:3px;overflow:hidden;margin:6px 0 3px"><div style="height:100%;width:'+ckPct+'%;background:var(--p1);border-radius:3px"></div></div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-bottom:8px">'+ckDone+' de '+ckTotal+' pasos · '+ckPct+'%</div>':'')
    +'<button type="button" class="btn btn-g btn-sm" style="width:100%;margin-top:4px" onclick="wtAddCheckRow()">+ Agregar paso</button>'
    +'</div>'
    +'</div>'
    // Columna derecha
    +'<div style="padding:18px 16px;background:var(--surf2)">'
    +'<div class="card" style="margin-bottom:12px">'
    +'<div style="font-size:13px;font-weight:800;color:var(--ink);margin-bottom:3px">Recordatorio</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:10px">Notifica al responsable</div>'
    +'<div style="display:flex;gap:5px">'
    +'<button type="button" data-remind="vencer" onclick="wtSetRemind(this,\'vencer\')" style="flex:1;padding:7px 3px;border-radius:8px;border:1px solid var(--rim);background:'+(!t.recordatorio||t.recordatorio==='vencer'?'var(--gb)':'var(--surf)')+';font-size:11px;color:'+(!t.recordatorio||t.recordatorio==='vencer'?'var(--p1)':'var(--ink3)')+';cursor:pointer;font-weight:'+(!t.recordatorio||t.recordatorio==='vencer'?'800':'400')+'">Al vencer</button>'
    +'<button type="button" data-remind="1dia" onclick="wtSetRemind(this,\'1dia\')" style="flex:1;padding:7px 3px;border-radius:8px;border:1px solid var(--rim);background:'+(t.recordatorio==='1dia'?'var(--gb)':'var(--surf)')+';font-size:11px;color:'+(t.recordatorio==='1dia'?'var(--p1)':'var(--ink3)')+';cursor:pointer;font-weight:'+(t.recordatorio==='1dia'?'800':'400')+'">1 dia antes</button>'
    +'<button type="button" data-remind="no" onclick="wtSetRemind(this,\'no\')" style="flex:1;padding:7px 3px;border-radius:8px;border:1px solid var(--rim);background:'+(t.recordatorio==='no'?'var(--gb)':'var(--surf)')+';font-size:11px;color:'+(t.recordatorio==='no'?'var(--p1)':'var(--ink3)')+';cursor:pointer;font-weight:'+(t.recordatorio==='no'?'800':'400')+'">Sin aviso</button>'
    +'<input type="hidden" id="wt7-remind-val" value="'+wtEsc(t.recordatorio||'vencer')+'">'
    +'</div></div>'
    +'<div class="card">'
    +'<div style="font-size:13px;font-weight:800;color:var(--ink);margin-bottom:3px">Comentarios internos</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:10px">Historial del equipo</div>'
    +'<div style="max-height:200px;overflow-y:auto;margin-bottom:10px">'+comments+'</div>'
    +'<div class="fg"><label>Agregar comentario</label>'
    +'<textarea class="fta" id="wtcomment" rows="2" placeholder="Escribe algo para el equipo..."></textarea></div>'
    +'</div>'
    +'</div>'
    +'</div>';

  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    +(!isNew&&!t.archivado?'<button class="btn" style="color:var(--red);border-color:var(--red)" onclick="wtArchive(\''+wtEsc(t.id)+'\')">Archivar</button>':'')
    +'<button class="btn btn-p" onclick="saveWtTask(\''+wtEsc(t.id)+'\')">Guardar tarea</button>';

  $('ov').style.display='flex';
  if(isNew){ setTimeout(function(){ var ti=$('wttitulo'); if(ti) ti.focus(); },80); }
}


// Helpers UI del modal
function wtSetTipoTab(el,tipo){
  // Update tabs visual
  document.querySelectorAll('[data-tipo]').forEach(function(btn){
    var on=btn.getAttribute('data-tipo')===tipo;
    btn.style.color=on?'var(--p1)':'var(--ink3)';
    btn.style.borderBottomColor=on?'var(--p1)':'transparent';
    btn.style.fontWeight=on?'800':'400';
  });
  // Update hidden input
  var h=$('wt7-tipo-val'); if(h) h.value=tipo;
  // Update ctx fields
  var ctxWrap=document.getElementById('wt7-ctx-wrap');
  var leftCol=document.querySelector('[data-wtcol="left"]');
  if(!leftCol) return;
  if(ctxWrap) ctxWrap.remove();
  if(tipo==='Cliente'||tipo==='Moto / credito'||tipo==='Cobranza'){
    var t=S._wtEditing||{};
    var wrap=document.createElement('div'); wrap.id='wt7-ctx-wrap'; wrap.style.marginBottom='14px';
    if(tipo==='Cliente'){
      wrap.innerHTML='<div class="fg"><label>Cliente vinculado</label><input class="fi" id="wt7-ctx-cliente" value="'+wtEsc(t.ctxCliente||'')+'" placeholder="Buscar cliente..."></div>';
    } else if(tipo==='Moto / credito'){
      wrap.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div class="fg"><label>Cliente</label><input class="fi" id="wt7-ctx-cliente" value="'+wtEsc(t.ctxCliente||'')+'" placeholder="Cliente..."></div>'
        +'<div class="fg"><label>Credito / moto</label><input class="fi" id="wt7-ctx-credito" value="'+wtEsc(t.ctxCredito||'')+'" placeholder="# credito o placa"></div>'
        +'</div>';
    } else {
      wrap.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +'<div class="fg"><label>Cliente en mora</label><input class="fi" id="wt7-ctx-cliente" value="'+wtEsc(t.ctxCliente||'')+'" placeholder="Cliente..."></div>'
        +'<div class="fg"><label>Monto a cobrar</label><input class="fi" id="wt7-ctx-monto" value="'+wtEsc(t.ctxMonto||'')+'" placeholder="$0.00"></div>'
        +'</div>';
    }
    // Insert after descripcion field
    var fgs=leftCol.querySelectorAll('[data-wtfield]');
    var after=fgs[1]||fgs[0];
    if(after&&after.nextSibling) leftCol.insertBefore(wrap,after.nextSibling);
    else leftCol.appendChild(wrap);
  }
}
function wtSetPrio(p){
  var h=$('wt7-prio-val'); if(h) h.value=p;
  document.querySelectorAll('[data-prio]').forEach(function(btn){
    var x=btn.getAttribute('data-prio');
    var on=x===p;
    btn.style.fontWeight=on?'700':'400';
    if(on){
      if(p==='alta'){btn.style.background='#fee2e2';btn.style.borderColor='#fca5a5';btn.style.color='#991b1b';}
      else if(p==='media'){btn.style.background='#fef3c7';btn.style.borderColor='#fcd34d';btn.style.color='#92400e';}
      else{btn.style.background='#dcfce7';btn.style.borderColor='#86efac';btn.style.color='#166534';}
    } else {
      btn.style.background='var(--surf)'; btn.style.borderColor='var(--rim)'; btn.style.color='var(--ink3)';
    }
  });
}
function wtSetEstado(e){
  var h=$('wt7-estado-val'); if(h) h.value=e;
  document.querySelectorAll('[data-estado]').forEach(function(btn){
    var on=btn.getAttribute('data-estado')===e;
    btn.style.background=on?'var(--gb)':'var(--surf)';
    btn.style.color=on?'var(--p1)':'var(--ink3)';
    btn.style.fontWeight=on?'800':'400';
    btn.style.borderColor=on?'var(--p1)':'var(--rim)';
  });
}
function wtSetRemind(el,v){
  var h=$('wt7-remind-val'); if(h) h.value=v;
  document.querySelectorAll('[data-remind]').forEach(function(btn){
    var on=btn.getAttribute('data-remind')===v;
    btn.style.background=on?'var(--gb)':'var(--surf)';
    btn.style.color=on?'var(--p1)':'var(--ink3)';
    btn.style.fontWeight=on?'800':'400';
    btn.style.borderColor=on?'var(--p1)':'var(--rim)';
  });
}

function wtVerTarea(id){
  var t=(S.tareas||[]).find(function(x){ return x.id===id; });
  if(!t) return;

  var today=wtToday();
  var isVenc=t.fecha&&t.fecha<today&&t.estado!=='completada';
  var prioBdg={alta:'b-r',media:'b-a',baja:'b-g'}[t.prioridad||'media']||'b-a';
  var borderCol={alta:'var(--red)',media:'var(--amber)',baja:'var(--green)'}[t.prioridad||'media']||'var(--amber)';
  var total=(t.checklist||[]).length;
  var done=(t.checklist||[]).filter(function(c){return c.done;}).length;
  var pct=total?Math.round(done/total*100):0;

  // Status badge
  var statusBdg;
  if(t.archivado) statusBdg='<span class="bdg b-x">Archivada</span>';
  else if(t.estado==='completada') statusBdg='<span class="bdg b-g">Completada</span>';
  else if(isVenc) statusBdg='<span class="bdg b-r">Vencida</span>';
  else if(t.estado==='proceso') statusBdg='<span class="bdg b-a">En proceso</span>';
  else statusBdg='<span class="bdg b-p">Pendiente</span>';

  // Modal header
  var ic=$('mic'); if(ic){ ic.textContent='WK'; ic.style.cssText='font-family:var(--fm);font-size:10px;font-weight:700;color:var(--p1)'; }
  var mtt=$('mtt'); if(mtt) mtt.textContent=t.titulo||'Tarea';
  var msb=$('msb'); if(msb) msb.textContent=(t.tipo||'Operacional')+' · '+(t.asignadoA||'Sin asignar');

  // Checklist
  var ckHTML='';
  if(t.checklist&&t.checklist.length){
    ckHTML='<div class="fg" style="margin-bottom:16px"><label>Checklist &middot; '+done+'/'+total+' ('+pct+'%)</label>'
      +'<div style="background:var(--lift);border-radius:3px;height:4px;overflow:hidden;margin-bottom:10px">'
        +'<div class="pf p-p" style="width:'+pct+'%"></div>'
      +'</div>';
    t.checklist.forEach(function(c,i){
      var checked=c.done?'checked':'';
      var strike=c.done?'text-decoration:line-through;opacity:.5':'';
      ckHTML+='<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--rim)">'
        +'<input type="checkbox" '+checked+' data-task-id="'+wtEsc(id)+'" data-idx="'+i+'" onchange="wtToggleCheckById(this)" style="width:16px;height:16px;accent-color:var(--p1);cursor:pointer;flex-shrink:0">'
        +'<span style="font-size:13px;color:var(--ink);'+strike+'">'+wtEsc(c.txt||'')+'</span>'
        +'</div>';
    });
    ckHTML+='</div>';
  }

  // Comentarios
  var cmHTML='';
  if(t.comentarios&&t.comentarios.length){
    cmHTML='<div class="fg" style="margin-bottom:16px"><label>Comentarios ('+t.comentarios.length+')</label>';
    t.comentarios.forEach(function(c){
      cmHTML+='<div style="background:var(--surf2);border-radius:10px;padding:10px 12px;margin-bottom:7px">'
        +'<div style="font-size:10.5px;color:var(--ink3);font-weight:800;margin-bottom:3px">'+(c.user||'—')+' &middot; '+(c.fecha||'').slice(0,10)+'</div>'
        +'<div style="font-size:13px;color:var(--ink2)">'+wtEsc(c.txt||'')+'</div>'
        +'</div>';
    });
    cmHTML+='</div>';
  }

  // Contexto
  var ctxHTML='';
  if(t.ctxCliente) ctxHTML+='<div class="fg" style="margin-bottom:10px"><label>Cliente</label><div style="font-size:13px;padding:5px 0">'+wtEsc(t.ctxCliente)+'</div></div>';
  if(t.ctxCredito) ctxHTML+='<div class="fg" style="margin-bottom:10px"><label>Crédito / Moto</label><div style="font-size:13px;padding:5px 0">'+wtEsc(t.ctxCredito)+'</div></div>';
  if(t.ctxMonto)   ctxHTML+='<div class="fg" style="margin-bottom:10px"><label>Monto</label><div style="font-size:13px;padding:5px 0">'+wtEsc(t.ctxMonto)+'</div></div>';

  $('mbd').innerHTML=
    '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding-bottom:14px;border-bottom:1px solid var(--rim);margin-bottom:16px">'
      +statusBdg
      +'<span class="bdg '+prioBdg+'">'+wtPrioLabel(t.prioridad)+'</span>'
      +'<span class="bdg b-p">'+(t.tipo||'—')+'</span>'
      +(t.sede?'<span class="bdg b-b">'+wtEsc(t.sede)+'</span>':'')
    +'</div>'
    +(t.descripcion?'<div class="fg" style="margin-bottom:16px"><label>Descripción</label>'
      +'<div style="font-size:13px;color:var(--ink2);line-height:1.6;padding:10px 12px;background:var(--surf2);border-radius:9px">'+wtEsc(t.descripcion)+'</div></div>':'')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
      +'<div class="fg"><label>Asignado a</label><div style="font-size:13px;font-weight:700;padding:5px 0">'+(t.asignadoA||'Sin asignar')+'</div></div>'
      +'<div class="fg"><label>Fecha límite</label><div style="font-size:13px;font-weight:700;color:'+(isVenc?'var(--red)':'var(--ink)')+';padding:5px 0">'+(t.fecha||'Sin fecha')+(t.hora?' &middot; '+t.hora:'')+'</div></div>'
      +'<div class="fg"><label>Creada por</label><div style="font-size:12px;color:var(--ink3);padding:5px 0">'+(t.creadaPor||'—')+'</div></div>'
      +'<div class="fg"><label>Creada el</label><div style="font-size:12px;color:var(--ink3);padding:5px 0">'+((t.createdAt||'').slice(0,10)||'—')+'</div></div>'
    +'</div>'
    +ctxHTML
    +ckHTML
    +cmHTML
    +'<div class="fg" style="margin-top:8px"><label>Agregar comentario</label>'
      +'<textarea class="fta" id="wt-view-comment" rows="2" placeholder="Escribe algo..." data-task-id="'+wtEsc(id)+'"></textarea>'
    +'</div>';

  $('mft').innerHTML=
    '<button class="btn btn-g" onclick="closeM()">Cerrar</button>'
    +(!t.archivado?'<button class="btn btn-g" data-task-id="'+wtEsc(id)+'" onclick="var tid=this.dataset.taskId;closeM();setTimeout(function(){openWtTask(tid);},50)">✏ Editar</button>':'')
    +'<button class="btn btn-p" onclick="wtAddViewComment()">Guardar comentario</button>';

  $('ov').style.display='flex';
}

function wtToggleCheckById(el){
  var taskId=el.dataset.taskId, idx=parseInt(el.dataset.idx), checked=el.checked;
  var t=(S.tareas||[]).find(function(x){ return x.id===taskId; });
  if(!t||!t.checklist||!t.checklist[idx]) return;
  t.checklist[idx].done=checked;
  t.updatedAt=new Date().toISOString();
  wtPersist(t);
  // Update progress bar
  var done=t.checklist.filter(function(c){return c.done;}).length;
  var pct=t.checklist.length?Math.round(done/t.checklist.length*100):0;
  var bar=document.querySelector('#mbd .pf');
  if(bar) bar.style.width=pct+'%';
}

function wtAddViewComment(){
  var inp=$('wt-view-comment');
  if(!inp) return;
  var taskId=inp.dataset.taskId;
  var t=(S.tareas||[]).find(function(x){ return x.id===taskId; });
  if(!t) return;
  var txt=(inp.value||'').trim();
  if(!txt){ toast('Escribe algo primero','info'); return; }
  if(!t.comentarios) t.comentarios=[];
  t.comentarios.push({txt:txt, user:wtUserName(), fecha:new Date().toISOString()});
  t.updatedAt=new Date().toISOString();
  wtPersist(t);
  toast('Comentario guardado','ok');
  wtVerTarea(taskId);
}


function saveWtTask(id){
  var old=S._wtEditing||{}; var t=Object.assign({},old);
  t.id=id||old.id||('T'+Date.now());
  t.titulo=(($('wttitulo')||{}).value||'Tarea sin título').trim();
  t.descripcion=(($('wtdesc')||{}).value)||'';
  t.tipo=($('wt7-tipo-val')||{}).value||old.tipo||'Operacional';
  t.sede=($('wt7-sede')||{}).value||'';
  t.hora=($('wt7-hora')||{}).value||'';
  t.recordatorio=($('wt7-remind-val')||{}).value||'vencer';
  // Contexto
  t.ctxCliente=($('wt7-ctx-cliente')||{}).value||'';
  t.ctxCredito=($('wt7-ctx-credito')||{}).value||'';
  t.ctxMonto=($('wt7-ctx-monto')||{}).value||'';
  var sel=$('wtasig'); var opt=sel&&sel.options?sel.options[sel.selectedIndex]:null;
  t.asignadoEmail=(sel&&sel.value)||'';
  t.asignadoA=(opt&&opt.textContent?opt.textContent.split(' · ')[0].trim():'') || t.asignadoEmail || wtUserName();
  t.fecha=(($('wtfecha')||{}).value)||'';
  t.prioridad=($('wt7-prio-val')||{}).value||'media';
  t.estado=($('wt7-estado-val')||{}).value||'pendiente';
  t.archivado=!!old.archivado;
  t.updatedAt=new Date().toISOString();
  if(!t.createdAt) t.createdAt=new Date().toISOString();
  t.creadaPor=old.creadaPor||wtUserName();
  t.checklist=[];
  var box=$('wtchecks');
  if(box){ box.querySelectorAll('.wt-ck-row').forEach(function(row){
    var inputs=row.querySelectorAll('input');
    var txt=''; var ck=false;
    inputs.forEach(function(inp){ if(inp.type==='checkbox') ck=inp.checked; else if(inp.type!=='hidden') txt=(inp.value||'').trim(); });
    if(txt) t.checklist.push({txt:txt,done:ck});
  }); }
  t.comentarios=Array.isArray(old.comentarios)?old.comentarios.slice():[];
  var cm=(($('wtcomment')||{}).value||'').trim();
  if(cm) t.comentarios.push({txt:cm,user:wtUserName(),fecha:new Date().toISOString()});
  var idx=(S.tareas||[]).findIndex(function(x){return x.id===t.id;});
  if(idx>=0) S.tareas[idx]=t; else S.tareas.push(t);
  wtPersist(t); closeM(); nav('centro'); toast('Tarea guardada y asignada a '+t.asignadoA,'ok');
}
