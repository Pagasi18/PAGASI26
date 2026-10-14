/* Catalogo publico: modelos, precios y formula del simulador de pagasi.io.
   Desde el 13-oct-2026 lo que manda es el modulo Catalogo del sistema (coleccion
   "catalogo" de Firestore): Liz cambia precios, seguros, fotos y disponibilidad y la web
   lo toma sola. La lista de abajo es el respaldo si la base no responde.
   Los calculos del credito real (ledger, mora) siguen aparte y no cambian. */
(function(root){
'use strict';
const BASE = [
  // Veloz, concesionario nuevo (Adam, 13-oct-2026): van primero y con la burbuja de promo
  { "id": 47, "sede": "veloz", "sedeName": "Veloz", "modelo": "RZ 200", "precio": 1390, "cat": "200cc · Clásica", "tag": "Promo", "promo": true, "orden": -30,
    "name": "RZ 200", "cc": "200cc", "type": "Clásica · Trabajo", "image": "assets/motos/veloz-rz-200.jpg", "meses": 12 },
  { "id": 48, "sede": "veloz", "sedeName": "Veloz", "modelo": "CG200 RIN DE RAYO", "precio": 1390, "cat": "200cc · Clásica", "tag": "Promo", "promo": true, "orden": -29,
    "name": "CG200 Rin de rayo", "cc": "200cc", "type": "Clásica · Trabajo", "image": "assets/motos/veloz-cg200-rayo.jpg", "meses": 12 },
  { "id": 49, "sede": "veloz", "sedeName": "Veloz", "modelo": "CG200 RIN DE PALETA", "precio": 1490, "cat": "200cc · Clásica", "tag": "Promo", "promo": true, "orden": -28,
    "name": "CG200 Rin de paleta", "cc": "200cc", "type": "Clásica · Trabajo", "image": "assets/motos/veloz-cg200-paleta.jpg", "meses": 12 },
  {
    "id": 1,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "NEW HORSE 150",
    "precio": 1320,
    "cat": "150cc · Urbana",
    "tag": "Más vendida",
    "name": "New Horse 150",
    "cc": "150cc",
    "type": "Carga · Urbana",
    "image": "assets/motos/new-horse-150.jpg",
    "meses": 12
  },
  {
    "id": 2,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "EK XPRESS 150",
    "precio": 1099,
    "cat": "150cc · Clásica",
    "tag": "",
    "name": "EK Xpress 150",
    "cc": "150cc",
    "type": "Clásica · Trabajo",
    "image": "assets/motos/ek-xpress-150.jpg",
    "meses": 12
  },
  {
    "id": 3,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "EK XPRESS II 150",
    "precio": 1126,
    "cat": "150cc · Clásica",
    "tag": "",
    "name": "EK Xpress II 150",
    "cc": "150cc",
    "type": "Café Racer · Urbana",
    "image": "assets/motos/ek-xpress-ii-150.jpg",
    "meses": 12
  },
  {
    "id": 4,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "EK XPRESS 200S",
    "precio": 1360,
    "cat": "200cc · Sport",
    "tag": "",
    "name": "EK Xpress 200S",
    "cc": "200cc",
    "type": "Deportiva · Urbana",
    "image": "assets/motos/ek-xpress-200s.jpg",
    "meses": 12
  },
  {
    "id": 5,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "EK XPRESS 150 LITE",
    "precio": 1020,
    "cat": "150cc · Lite",
    "tag": "Económica",
    "name": "EK Xpress 150 Lite",
    "cc": "150cc",
    "type": "Clásica · Económica",
    "image": "assets/motos/ek-xpress-150-lite.jpg",
    "meses": 12
  },
  {
    "id": 6,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "NEW OWEN II 150",
    "precio": 1265,
    "cat": "150cc · Urbana",
    "tag": "",
    "name": "New Owen II 150",
    "cc": "150cc",
    "type": "Custom · Clásica",
    "image": "assets/motos/new-owen-ii-150.jpg",
    "meses": 12
  },
  {
    "id": 7,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "OWEN 200S",
    "precio": 1550,
    "cat": "200cc · Sport",
    "tag": "",
    "name": "Owen 200S",
    "cc": "200cc",
    "type": "Custom · Deportiva",
    "image": "assets/motos/owen-200s.jpg",
    "meses": 12
  },
  {
    "id": 8,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "RK 200",
    "precio": 1750,
    "cat": "200cc · Trail",
    "tag": "",
    "name": "RK 200",
    "cc": "200cc",
    "type": "Deportiva · Naked",
    "image": "assets/motos/rk-200.jpg",
    "meses": 12
  },
  {
    "id": 9,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "RK 250",
    "precio": 2075,
    "cat": "250cc · Trail",
    "tag": "",
    "name": "RK 250",
    "cc": "250cc",
    "type": "Supersport · Racing",
    "image": "assets/motos/rk-250.jpg",
    "meses": 12
  },
  {
    "id": 10,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "TX 250 GS",
    "precio": 2650,
    "cat": "250cc · GS",
    "tag": "",
    "name": "TX 250 GS",
    "cc": "250cc",
    "type": "Adventure · Enduro",
    "image": "assets/motos/tx-250-gs.jpg",
    "meses": 12
  },
  {
    "id": 11,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "MATRIX 150 LITE",
    "precio": 1290,
    "cat": "150cc · Lite",
    "tag": "",
    "name": "Matrix 150 Lite",
    "cc": "150cc",
    "type": "Doble propósito",
    "image": "assets/motos/matrix-150-lite.jpg",
    "meses": 12
  },
  {
    "id": 12,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "MATRIX 150",
    "precio": 1550,
    "cat": "150cc · Urbana",
    "tag": "",
    "name": "Matrix 150",
    "cc": "150cc",
    "type": "Doble propósito",
    "image": "assets/motos/matrix-150.png",
    "meses": 12
  },
  {
    "id": 13,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "NEW OUTLOOK 175",
    "precio": 2450,
    "cat": "175cc · Touring",
    "tag": "",
    "name": "New Outlook 175",
    "cc": "175cc",
    "type": "Custom · Clásica",
    "image": "assets/motos/new-outlook-175.jpg",
    "meses": 12
  },
  {
    "id": 14,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "OUTLOOK XL PALETA",
    "precio": 4851,
    "cat": "XL · Touring",
    "tag": "Premium",
    "name": "Outlook XL Paleta",
    "cc": "175cc",
    "type": "Custom · Premium",
    "image": "assets/motos/outlook-xl-paleta.jpg",
    "meses": 12
  },
  {
    "id": 15,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "ATLAS 200HD",
    "precio": 4600,
    "cat": "200HD · Heavy Duty",
    "tag": "Premium",
    "name": "Atlas 200HD",
    "cc": "200cc",
    "type": "Carga pesada · Work",
    "image": "assets/motos/atlas-200hd.jpg",
    "meses": 12
  },
  {
    "id": 16,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "OWEN 200S AMARILLO",
    "precio": 1500,
    "cat": "200cc · Edición",
    "tag": "Edición",
    "name": "Owen 200S Amarillo",
    "cc": "200cc",
    "type": "Custom · Edición",
    "image": "assets/motos/owen-200s-amarillo.jpg",
    "meses": 12
  },
  {
    "id": 17,
    "sede": "ek",
    "sedeName": "EK Bello Monte",
    "modelo": "ARSEN",
    "precio": 1950,
    "cat": "Sport · Urbana",
    "tag": "",
    "name": "Arsen",
    "cc": "200cc",
    "type": "Naked · Deportiva",
    "image": "assets/motos/arsen.png",
    "meses": 12
  },
  {
    "id": 18,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "LECHUZA I",
    "precio": 1700,
    "cat": "Aventura",
    "tag": "",
    "name": "Lechuza I",
    "cc": "—",
    "type": "Aventura",
    "image": "assets/motos/lechuza-i.jpg",
    "meses": 12
  },
  {
    "id": 19,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "LECHUZA II",
    "precio": 1900,
    "cat": "Aventura",
    "tag": "",
    "name": "Lechuza II",
    "cc": "—",
    "type": "Aventura",
    "image": "assets/motos/lechuza-ii.jpg",
    "meses": 12
  },
  {
    "id": 20,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "CUERVO",
    "precio": 1149,
    "cat": "Urbana",
    "tag": "",
    "name": "Cuervo",
    "cc": "—",
    "type": "Urbana",
    "image": "assets/motos/cuervo.jpg",
    "meses": 12
  },
  {
    "id": 21,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "CANARIO",
    "precio": 1190,
    "cat": "Urbana",
    "tag": "",
    "name": "Canario",
    "cc": "—",
    "type": "Urbana",
    "image": "assets/motos/canario.jpg",
    "meses": 12
  },
  {
    "id": 22,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "FÉNIX 150",
    "precio": 1450,
    "cat": "150cc · Sport",
    "tag": "",
    "name": "Fénix 150",
    "cc": "150cc",
    "type": "Sport",
    "image": "assets/motos/fenix.jpg",
    "meses": 12
  },
  {
    "id": 23,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "FÉNIX 200",
    "precio": 1590,
    "cat": "200cc · Sport",
    "tag": "",
    "name": "Fénix 200",
    "cc": "200cc",
    "type": "Sport",
    "image": "assets/motos/fenix.jpg",
    "meses": 12
  },
  {
    "id": 24,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "ÁGUILA",
    "precio": 980,
    "cat": "Económica",
    "tag": "Económica",
    "name": "Águila",
    "cc": "—",
    "type": "Económica",
    "image": "assets/motos/aguila.jpg",
    "meses": 12
  },
  {
    "id": 25,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "CÓNDOR",
    "precio": 1190,
    "cat": "Urbana",
    "tag": "",
    "name": "Cóndor",
    "cc": "—",
    "type": "Urbana",
    "image": "assets/motos/condor.jpg",
    "meses": 12
  },
  {
    "id": 26,
    "sede": "boleita",
    "sedeName": "Boleita",
    "modelo": "TUCÁN II",
    "precio": 1239,
    "cat": "Urbana",
    "tag": "",
    "name": "Tucán II",
    "cc": "—",
    "type": "Urbana",
    "image": "",
    "meses": 12
  },
  {
    "id": 27,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "JAGUAR 150",
    "precio": 1090,
    "cat": "150cc · Urbana",
    "tag": "",
    "name": "Jaguar 150",
    "cc": "150cc",
    "type": "Urbana",
    "image": "assets/motos/jaguar-150.jpg",
    "meses": 12
  },
  {
    "id": 28,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "TRX150 RAYO",
    "precio": 1050,
    "cat": "150cc · Sport",
    "tag": "",
    "name": "TRX150 Rayo",
    "cc": "150cc",
    "type": "Sport",
    "image": "assets/motos/trx150-paleta.jpg",
    "meses": 12
  },
  {
    "id": 29,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "TRX150 PALETA",
    "precio": 1070,
    "cat": "150cc · Sport",
    "tag": "",
    "name": "TRX150 Paleta",
    "cc": "150cc",
    "type": "Sport",
    "image": "assets/motos/trx150-paleta.jpg",
    "meses": 12
  },
  {
    "id": 30,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "LEÓN 200",
    "precio": 1320,
    "cat": "200cc · Trail",
    "tag": "",
    "name": "León 200",
    "cc": "200cc",
    "type": "Trail",
    "image": "assets/motos/leon-200.jpg",
    "meses": 12
  },
  {
    "id": 31,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "REX 150",
    "precio": 1520,
    "cat": "150cc · Sport",
    "tag": "",
    "name": "Rex 150",
    "cc": "150cc",
    "type": "Sport",
    "image": "assets/motos/rex-150.jpg",
    "meses": 12
  },
  {
    "id": 32,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "REX 250",
    "precio": 2090,
    "cat": "250cc · Sport",
    "tag": "",
    "name": "Rex 250",
    "cc": "250cc",
    "type": "Sport",
    "image": "assets/motos/rex-250.jpg",
    "meses": 12
  },
  {
    "id": 33,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "REX 250 MT",
    "precio": 2100,
    "cat": "250cc · MT",
    "tag": "",
    "name": "Rex 250 MT",
    "cc": "250cc",
    "type": "MT · Naked",
    "image": "assets/motos/rex-250.jpg",
    "meses": 12
  },
  {
    "id": 34,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "R3X",
    "precio": 2590,
    "cat": "Sport · Premium",
    "tag": "Premium",
    "name": "R3X",
    "cc": "—",
    "type": "Sport · Premium",
    "image": "assets/motos/r3x.jpg",
    "meses": 12
  },
  {
    "id": 35,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "MOKA",
    "precio": 1295,
    "cat": "Scooter",
    "tag": "",
    "name": "Moka",
    "cc": "—",
    "type": "Scooter",
    "image": "assets/motos/moka.jpg",
    "meses": 12
  },
  {
    "id": 36,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "FOX",
    "precio": 1850,
    "cat": "Sport",
    "tag": "",
    "name": "Fox",
    "cc": "—",
    "type": "Sport",
    "image": "assets/motos/fox.jpg",
    "meses": 12
  },
  {
    "id": 37,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "POWER",
    "precio": 1880,
    "cat": "Sport · Trail",
    "tag": "",
    "name": "Power",
    "cc": "—",
    "type": "Sport · Trail",
    "image": "assets/motos/power.jpg",
    "meses": 12
  },
  {
    "id": 38,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "TANK III",
    "precio": 2500,
    "cat": "Tank · Trail",
    "tag": "",
    "name": "Tank III",
    "cc": "—",
    "type": "Tank · Trail",
    "image": "assets/motos/tank-iii.jpg",
    "meses": 12
  },
  {
    "id": 39,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "TANK",
    "precio": 1920,
    "cat": "Tank · Trail",
    "tag": "",
    "name": "Tank",
    "cc": "—",
    "type": "Tank · Trail",
    "image": "assets/motos/tank.jpg",
    "meses": 12
  },
  {
    "id": 40,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "CAPPUCINO",
    "precio": 1890,
    "cat": "Scooter Premium",
    "tag": "",
    "name": "Cappucino",
    "cc": "—",
    "type": "Scooter Premium",
    "image": "assets/motos/cappucino.jpg",
    "meses": 12
  },
  {
    "id": 41,
    "sede": "toro",
    "sedeName": "Toro Sabana Grande",
    "modelo": "TYPHOON",
    "precio": 1690,
    "cat": "Sport",
    "tag": "",
    "name": "Typhoon",
    "cc": "—",
    "type": "Sport",
    "image": "assets/motos/typhoon.jpg",
    "meses": 12
  },
  {
    "id": 42,
    "sede": "benmo",
    "sedeName": "Benmo Motos Andrés Bello",
    "modelo": "HJ150-8",
    "precio": 1520,
    "cat": "150cc · Urbana",
    "tag": "",
    "name": "HJ150-8",
    "cc": "150cc",
    "type": "Urbana",
    "image": "",
    "meses": 12
  },
  {
    "id": 43,
    "sede": "benmo",
    "sedeName": "Benmo Motos Andrés Bello",
    "modelo": "GTL 150",
    "precio": 1230,
    "cat": "150cc · Urbana",
    "tag": "",
    "name": "GTL 150",
    "cc": "150cc",
    "type": "Urbana",
    "image": "",
    "meses": 12
  },
  {
    "id": 44,
    "sede": "benmo",
    "sedeName": "Benmo Motos Andrés Bello",
    "modelo": "JB STREET 150",
    "precio": 1150,
    "cat": "150cc · Clásica",
    "tag": "Económica",
    "name": "JB Street 150",
    "cc": "150cc",
    "type": "Clásica",
    "image": "",
    "meses": 12
  },
  {
    "id": 45,
    "sede": "benmo",
    "sedeName": "Benmo Motos Andrés Bello",
    "modelo": "STREET SPORT 150",
    "precio": 1320,
    "cat": "150cc · Sport",
    "tag": "",
    "name": "Street Sport 150",
    "cc": "150cc",
    "type": "Sport",
    "image": "",
    "meses": 12
  },
  {
    "id": 46,
    "sede": "benmo",
    "sedeName": "Benmo Motos Andrés Bello",
    "modelo": "HM 150 LONCIN",
    "precio": 1110,
    "cat": "150cc · Urbana",
    "tag": "Económica",
    "name": "HM 150 Loncin",
    "cc": "150cc",
    "type": "Urbana",
    "image": "",
    "meses": 12
  }
];
// ── Condiciones publicas (Adam, 13-oct-2026) ─────────────────────────────────
// Una sola tasa para todos los plazos (600% anual efectiva desde el 15-oct; antes 777 y
// antes 650%), seguro del 4,5% del precio de contado que se paga junto con la inicial,
// inicial desde 40% y plazos de 6, 9 y 12 meses. Es el respaldo: lo que guarden en el
// documento "_condiciones" manda.
const COND_BASE = Object.freeze({ apy:600, seguroPct:0, inicialMin:40, inicialMax:60, plazos:Object.freeze([6,9,12]) });
// Firebase de la compania que sirve la pagina. preparar-clon-26.sh pone aqui el de PAGASI 26.
// La llave web de Firebase es publica por diseno: lo que protege los datos son las Reglas.
// Veloz que aun no tienen precio: en la web salen con "Pregunta el precio". Es el respaldo
// hasta que se carguen en el modulo (alli Liz les pone precio, foto o los oculta).
const BASE_PROXIMOS = [
  { id:901, sede:'veloz', sedeName:'Veloz', modelo:'DT 170', name:'DT 170', cat:'170cc · Doble propósito', cc:'170cc', type:'Doble propósito', promo:true, image:'assets/motos/veloz-dt-170.jpg' },
  { id:902, sede:'veloz', sedeName:'Veloz', modelo:'HS-300-2A LA RUTERA', name:'La Rutera · HS-300-2A', cat:'300cc · Adventure', cc:'300cc', type:'Adventure · Ruta', promo:true, image:'assets/motos/veloz-hs-300-2a-rutera.jpg' },
  { id:903, sede:'veloz', sedeName:'Veloz', modelo:'HS-300Y-8N LA AVENTURERA', name:'La Aventurera · HS-300Y-8N', cat:'300cc · Adventure', cc:'300cc', type:'Adventure · Off road', promo:true, image:'assets/motos/veloz-hs-300y-8n-aventurera.jpg' },
  { id:904, sede:'veloz', sedeName:'Veloz', modelo:'SCOOTER KEEWAY', name:'Scooter Keeway', cat:'Scooter', cc:'—', type:'Scooter', promo:true, image:'assets/motos/veloz-scooter-keeway.jpg' },
  { id:905, sede:'veloz', sedeName:'Veloz', modelo:'SCOOTER VELOZ', name:'Scooter Veloz', cat:'Scooter', cc:'—', type:'Scooter', promo:true, image:'assets/motos/veloz-scooter-veloz.jpg' }
].map(m => Object.freeze(Object.assign({ precio:null, sinPrecio:true, disponible:true, meses:12 }, m)));
const FB_PUBLICO = { projectId:'pagasi26-65ced', apiKey:'AIzaSyD6IznQjzF7Tdq7UJMXT4rSBdbCNpsmij4' };
const CLAVE_CACHE = 'pagasi_catalogo_v1';
let lista = BASE.map(m => Object.freeze(Object.assign({disponible:true}, m)));
let cond = COND_BASE, origen = 'base', cargando = null, proximosLista = BASE_PROXIMOS.slice(), proximosDeLaBase = false;

const num = (v, def) => { const n = Number(v); return Number.isFinite(n) ? n : def; };
function condValidas(c){
  c = c || {};
  const plazos = Array.isArray(c.plazos) ? c.plazos.map(Number).filter(n => Number.isInteger(n) && n > 0 && n <= 60) : [];
  const ini = num(c.inicialMin, COND_BASE.inicialMin), max = num(c.inicialMax, COND_BASE.inicialMax);
  return Object.freeze({
    apy: (num(c.apy, 0) > 0 && num(c.apy, 0) < 5000) ? num(c.apy) : COND_BASE.apy,
    seguroPct: (num(c.seguroPct, -1) >= 0 && num(c.seguroPct, -1) < 50) ? num(c.seguroPct) : COND_BASE.seguroPct,
    inicialMin: (ini > 0 && ini < 100) ? ini : COND_BASE.inicialMin,
    inicialMax: (max > 0 && max < 100 && max >= ini) ? max : Math.max(ini, COND_BASE.inicialMax),
    plazos: Object.freeze(plazos.length ? plazos.sort((a, b) => a - b) : COND_BASE.plazos.slice())
  });
}
// Sin redondear (para el Excel y el sistema). inicialPct en fraccion: 0.40 = 40%.
function calcExacto(precio, meses, inicialPct, c){
  c = c || cond;
  precio = num(precio, 0); meses = num(meses, 0) || c.plazos[c.plazos.length - 1];
  const pct = (inicialPct == null || inicialPct === '') ? c.inicialMin / 100 : num(inicialPct, c.inicialMin / 100);
  const totalCuotas = meses * 2;
  const inicial = precio * pct, financiado = Math.max(0, precio - inicial);
  const tasaQ = Math.pow(1 + c.apy / 100, 1 / 24) - 1;
  const quincenal = financiado > 0 ? (tasaQ > 0 ? financiado * tasaQ / (1 - Math.pow(1 + tasaQ, -totalCuotas)) : financiado / totalCuotas) : 0;
  const seguro = precio * c.seguroPct / 100;
  return { precio, meses, pct, totalCuotas, inicial, seguro, alFirmar: inicial + seguro, financiado, quincenal, mensual: quincenal * 2, totalEnCuotas: quincenal * totalCuotas };
}
// Sin decimales y redondeando HACIA ARRIBA, la misma regla de la calculadora de los
// vendedores (Adam, 11-sep-2026): $88.01 se ve $89. Primero los centavos, para que un resto
// de coma flotante no sume un dolar. Todo cuadra a simple vista: al firmar = inicial + seguro,
// mensual = 2 quincenas, total = cuota x numero de cuotas, inicial + financiado = precio.
const arriba = n => Math.ceil(Math.round((Number(n) || 0) * 100) / 100);
function calcPlan(precio, meses, inicialPct, c){
  const e = calcExacto(precio, meses, inicialPct, c), q = arriba(e.quincenal), ini = arriba(e.inicial), seg = arriba(e.seguro);
  return { inicial: ini, seguro: seg, alFirmar: ini + seg, financiado: Math.max(0, arriba(e.precio) - ini),
           quincenal: q, mensual: q * 2, totalEnCuotas: q * e.totalCuotas,
           meses: e.meses, totalCuotas: e.totalCuotas, pct: e.pct };
}
const normalize = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const get = id => lista.find(m => m.id === Number(id));
const plan = (id, inicialPct, meses) => { const m = get(id); return m ? calcPlan(m.precio, meses || m.meses, inicialPct) : null; };
const money = n => '$' + arriba(n).toLocaleString('en-US');

// Un documento de Firestore (formato REST) a objeto plano
function valor(v){
  if(!v || typeof v !== 'object') return null;
  if('stringValue' in v) return v.stringValue;
  if('integerValue' in v) return Number(v.integerValue);
  if('doubleValue' in v) return Number(v.doubleValue);
  if('booleanValue' in v) return !!v.booleanValue;
  if('nullValue' in v) return null;
  if('timestampValue' in v) return v.timestampValue;
  if('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(valor);
  if('mapValue' in v){ const o = {}, f = (v.mapValue && v.mapValue.fields) || {}; Object.keys(f).forEach(k => { o[k] = valor(f[k]); }); return o; }
  return null;
}
function desdeDocumentos(docs){
  const motos = [], porId = {};
  let c = null;
  (docs || []).forEach(d => {
    const id = String(d.name || '').split('/').pop(), f = valor({ mapValue: { fields: d.fields || {} } }) || {};
    if(id === '_condiciones'){ c = f; return; }
    porId[id] = f;
  });
  Object.keys(porId).forEach(k => {
    const f = porId[k], id = num(f.id, num(k, NaN)), precio = num(f.precio, 0);
    if(!Number.isInteger(id) || id <= 0 || !f.modelo) return;
    if(f.eliminado === true) return;
    const nombre = f.name || String(f.modelo).toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase());
    motos.push(Object.freeze({ id, sede: f.sede || '', sedeName: f.sedeName || '', concesionarioId: f.concesionarioId ? String(f.concesionarioId) : '', modelo: String(f.modelo), precio: precio > 0 ? precio : null, sinPrecio: !(precio > 0),
      cat: f.cat || '', tag: f.promo === true ? 'Promo' : (f.tag === 'Promo' ? '' : (f.tag || '')), promo: f.promo === true,
      name: nombre, cc: f.cc || '—', type: f.type || '', image: f.image || '',
      meses: 12, disponible: f.disponible !== false, orden: num(f.orden, id) }));
  });
  motos.sort((a, b) => (a.orden - b.orden) || (a.id - b.id));
  return { motos, cond: c };
}
// La web solo muestra los modelos disponibles
function aplicar(motos, c, desde){
  if(Array.isArray(motos) && motos.length){
    const visibles = motos.filter(m => m && m.disponible !== false).map(m => Object.isFrozen(m) ? m : Object.freeze(Object.assign({}, m)));
    const conPrecio = visibles.filter(m => !m.sinPrecio && m.precio > 0), sinPrecio = visibles.filter(m => m.sinPrecio || !(m.precio > 0));
    if(conPrecio.length) lista = conPrecio;
    // Si la base ya tiene modelos sin precio, mandan esos; si no, el respaldo (sin repetir nombres)
    proximosDeLaBase = proximosDeLaBase || motos.some(m => m && (m.sinPrecio || !(m.precio > 0)));
    if(proximosDeLaBase) proximosLista = sinPrecio;
    else { const ya = motos.map(m => normalize(m.modelo)); proximosLista = BASE_PROXIMOS.filter(p => !ya.includes(normalize(p.modelo))); }
  }
  if(c) cond = condValidas(c);
  origen = desde || origen;
}
// Lee el catalogo de la base una sola vez por pagina. Mientras tanto vale lo ultimo bueno
// guardado en este navegador, o la lista base. Nunca falla: si algo sale mal, sigue la base.
function cargar(){
  if(cargando) return cargando;
  try{
    const c = JSON.parse((root.localStorage && root.localStorage.getItem(CLAVE_CACHE)) || 'null');
    if(c && c.v === 1 && Array.isArray(c.motos) && c.motos.length) aplicar(c.motos, c.cond, 'cache');
  }catch(e){}
  if(typeof fetch !== 'function') return (cargando = Promise.resolve(api));
  const url = 'https://firestore.googleapis.com/v1/projects/' + FB_PUBLICO.projectId + '/databases/(default)/documents/catalogo?pageSize=300&key=' + FB_PUBLICO.apiKey;
  cargando = fetch(url).then(r => r.ok ? r.json() : null).then(d => {
    const r = desdeDocumentos(d && d.documents);
    if(!r.motos.length) return api;
    aplicar(r.motos, r.cond, 'firestore');
    try{ root.localStorage && root.localStorage.setItem(CLAVE_CACHE, JSON.stringify({ v:1, motos: r.motos, cond: r.cond, en: new Date().toISOString() })); }catch(e){}
    return api;
  }).catch(() => api);
  return cargando;
}
const api = Object.freeze({
  get motos(){ return lista; }, get proximos(){ return proximosLista; }, get condiciones(){ return cond; }, get origen(){ return origen; },
  base: Object.freeze(BASE.map(Object.freeze)), baseProximos: BASE_PROXIMOS, COND_BASE, FB_PUBLICO: Object.freeze(Object.assign({}, FB_PUBLICO)),
  get, plan, calcPlan, calcExacto, arriba, condValidas, normalize, money, cargar, aplicar, desdeDocumentos, valor
});
if(typeof module==='object' && module.exports) module.exports=api;
else root.PagasiCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
