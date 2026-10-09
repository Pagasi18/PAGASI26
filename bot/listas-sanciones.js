// Listas de sancionados para la revision de clientes (programa LC/FT, 9-oct-2026).
// PAGASI 18 es sujeto obligado por la LOCDOFT (art. 9, num. 10, lit. h: compraventa de
// vehiculos automotores terrestres) y su manual exige revisar a cada cliente contra la
// lista SDN de OFAC y la Lista Consolidada del Consejo de Seguridad de la ONU.
//
// Este robot baja las dos listas oficiales, se queda solo con PERSONAS (los clientes son
// personas naturales), normaliza los nombres y escribe data/listas-sanciones.json, que el
// panel carga cuando revisa a un cliente. Sin dependencias: lo corre GitHub Actions cada
// dia (.github/workflows/listas-sanciones.yml) y solo hace commit si las listas cambiaron.
//
//   node bot/listas-sanciones.js            (escribe data/listas-sanciones.json)
//   node bot/listas-sanciones.js --dir X    (lee SDN.CSV, ALT.CSV y consolidated.xml de X)
'use strict';
const fs = require('fs'), path = require('path');
const FUENTES = {
  sdn: 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV',
  alt: 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ALT.CSV',
  onu: 'https://scsanctions.un.org/resources/xml/en/consolidated.xml'
};
const SALIDA = path.join(__dirname, '..', 'data', 'listas-sanciones.json');

// Misma normalizacion que logic/aml.js (si cambia aqui, cambia alla)
const VACIAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y']);
function norm(s){
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/).filter(t => t.length >= 2 && !VACIAS.has(t)).join(' ');
}
// CSV de OFAC: campos entre comillas, -0- es vacio
function filasCSV(txt){
  const out = []; let fila = [], campo = '', q = false;
  for(let i = 0; i < txt.length; i++){
    const ch = txt[i];
    if(q){ if(ch === '"'){ if(txt[i+1] === '"'){ campo += '"'; i++; } else q = false; } else campo += ch; continue; }
    if(ch === '"') q = true;
    else if(ch === ','){ fila.push(campo); campo = ''; }
    else if(ch === '\n'){ fila.push(campo); out.push(fila); fila = []; campo = ''; }
    else if(ch !== '\r') campo += ch;
  }
  if(campo || fila.length){ fila.push(campo); out.push(fila); }
  return out.map(f => f.map(c => { c = c.trim(); return c === '-0-' ? '' : c; }));
}
// Numeros de cedula / documento que trae el campo de observaciones de OFAC
function documentos(txt){
  const docs = new Set(); let m;
  const re = /(?:C[eé]dula|National ID|Identification Number|Passport)\s*(?:No\.|Number)?\s*([A-Z]{0,2}[-\s]?[\d.]{5,})/gi;
  while((m = re.exec(txt))){ const d = m[1].replace(/[^\d]/g, '').replace(/^0+/, ''); if(d.length >= 6) docs.add(d); }
  return [...docs];
}
function detalle(txt){
  const dob = (txt.match(/DOB ([^;]+)/) || [])[1], nac = (txt.match(/nationality ([^;]+)/i) || [])[1];
  return [dob ? 'Nac. ' + dob.trim() : '', nac ? nac.trim() : ''].filter(Boolean).join(' · ');
}
function ofac(sdnTxt, altTxt){
  const ents = new Map();
  for(const f of filasCSV(sdnTxt)){
    if(f.length < 12 || String(f[2]).toLowerCase() !== 'individual') continue;
    ents.set(f[0], { id: 'OFAC-' + f[0], lista: 'OFAC SDN', nombre: f[1], programa: f[3], detalle: detalle(f[11] || ''), docs: documentos(f[11] || ''), alias: [] });
  }
  for(const f of filasCSV(altTxt)){ const e = ents.get(f[0]); if(e && f[3]) e.alias.push(f[3]); }
  return [...ents.values()];
}
function etiqueta(xml, tag){ const m = xml.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>')); return m ? m[1].trim() : ''; }
function todas(xml, tag){ const out = [], re = new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'g'); let m; while((m = re.exec(xml))) out.push(m[1]); return out; }
function onu(xml){
  const ent = s => s.replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return todas(xml, 'INDIVIDUAL').map(b => {
    const nombre = ent(['FIRST_NAME', 'SECOND_NAME', 'THIRD_NAME', 'FOURTH_NAME'].map(t => etiqueta(b, t)).filter(Boolean).join(' '));
    const alias = todas(b, 'INDIVIDUAL_ALIAS').map(a => ent(etiqueta(a, 'ALIAS_NAME'))).filter(Boolean);
    const docs = todas(b, 'INDIVIDUAL_DOCUMENT').map(d => etiqueta(d, 'NUMBER').replace(/[^\d]/g, '').replace(/^0+/, '')).filter(d => d.length >= 6);
    const dob = etiqueta(b, 'INDIVIDUAL_DATE_OF_BIRTH'), anio = etiqueta(dob, 'YEAR') || etiqueta(dob, 'DATE');
    const nac = todas(b, 'NATIONALITY').map(n => etiqueta(n, 'VALUE')).filter(Boolean).join(', ');
    return { id: 'ONU-' + etiqueta(b, 'REFERENCE_NUMBER'), lista: 'ONU', nombre, programa: etiqueta(b, 'UN_LIST_TYPE'),
             detalle: [anio ? 'Nac. ' + anio : '', nac].filter(Boolean).join(' · '), docs: [...new Set(docs)], alias: [...new Set(alias)] };
  }).filter(e => e.nombre);
}
// Formato compacto: [id, lista, nombre, programa, detalle, docs, [nombres normalizados]]
function compactar(e){
  const nombres = [...new Set([e.nombre, ...e.alias].map(norm).filter(n => n.split(' ').length >= 2))];
  return [e.id, e.lista, e.nombre, e.programa, e.detalle, e.docs, nombres];
}
async function bajar(url){
  const r = await fetch(url, { headers: { 'User-Agent': 'PAGASI-listas/1.0' } });
  if(!r.ok) throw new Error(url + ' respondio ' + r.status);
  return r.text();
}
async function main(){
  const i = process.argv.indexOf('--dir'), dir = i > 0 ? process.argv[i + 1] : null;
  const leer = async (k, archivo) => dir ? fs.readFileSync(path.join(dir, archivo), 'utf8') : bajar(FUENTES[k]);
  const [sdn, alt, xml] = await Promise.all([leer('sdn', 'SDN.CSV'), leer('alt', 'ALT.CSV'), leer('onu', 'consolidated.xml')]);
  const lo = ofac(sdn, alt), lu = onu(xml);
  // Un error de descarga no puede dejar la lista vacia: con menos de lo minimo, no se escribe
  if(lo.length < 1000 || lu.length < 100) throw new Error('Listas incompletas (OFAC ' + lo.length + ', ONU ' + lu.length + '): no se escribe nada');
  const e = [...lo, ...lu].map(compactar).filter(x => x[6].length).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const datos = { fuentes: { 'OFAC SDN': lo.length, 'ONU': lu.length }, fechaOnu: (xml.match(/dateGenerated="([^"]+)"/) || [])[1] || '', e };
  let anterior = null; try { anterior = JSON.parse(fs.readFileSync(SALIDA, 'utf8')); } catch(_e){}
  if(anterior && JSON.stringify(anterior.e) === JSON.stringify(e)){ console.log('Listas sin cambios (' + e.length + ' personas)'); return; }
  datos.generado = new Date().toISOString();
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, JSON.stringify(datos));
  console.log('Listas actualizadas: ' + e.length + ' personas (OFAC ' + lo.length + ', ONU ' + lu.length + ')');
}
if(require.main === module) main().catch(err => { console.error('ERROR', err.message); process.exit(1); });
module.exports = { norm, filasCSV, documentos, ofac, onu, compactar };
