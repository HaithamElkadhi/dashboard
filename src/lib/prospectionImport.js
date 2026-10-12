import { unzipSync, strFromU8 } from 'fflate';

export function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === delimiter || char === '\n' || char === '\r')) {
      row.push(cell); cell = '';
      if (char !== delimiter) { rows.push(row); row = []; if (char === '\r' && text[i + 1] === '\n') i++; }
    } else cell += char;
  }
  if (quoted) throw new Error('CSV invalide : guillemets non fermés.');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
}
function xml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Classeur Excel invalide.');
  return doc;
}
export async function readLeadWorkbook(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Fichier trop volumineux (5 Mo maximum).');
  if (/\.csv$/i.test(file.name)) return [{ name: 'CSV', rows: parseCsv(await file.text()) }];
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Utilisez un fichier .xlsx ou .csv. Enregistrez les anciens .xls au format .xlsx.');
  let expanded = 0;
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: entry => {
    expanded += entry.originalSize;
    if (expanded > 30 * 1024 * 1024) throw new Error('Classeur décompressé trop volumineux.');
    return /^xl\/(workbook.xml|_rels\/workbook.xml.rels|sharedStrings.xml|worksheets\/[^/]+\.xml)$/.test(entry.name);
  } });
  const get = path => { if (!files[path]) throw new Error('Classeur Excel incomplet.'); return xml(strFromU8(files[path])); };
  const shared = files['xl/sharedStrings.xml'] ? [...get('xl/sharedStrings.xml').getElementsByTagName('si')].map(item => [...item.getElementsByTagName('t')].map(node => node.textContent).join('')) : [];
  const relations = new Map([...get('xl/_rels/workbook.xml.rels').getElementsByTagName('Relationship')].map(node => [node.getAttribute('Id'), node.getAttribute('Target')]));
  return [...get('xl/workbook.xml').getElementsByTagName('sheet')].map(sheet => {
    const target = relations.get(sheet.getAttribute('r:id')) || '';
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const rows = [...get(path).getElementsByTagName('row')].map(node => {
      const cells = [];
      for (const cell of node.getElementsByTagName('c')) {
        const letters = (cell.getAttribute('r') || '').match(/^[A-Z]+/)?.[0];
        if (!letters) continue;
        let index = 0;
        for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64;
        if (index > 200) continue;
        const value = cell.getElementsByTagName('v')[0]?.textContent || '';
        const type = cell.getAttribute('t');
        cells[index - 1] = type === 's' ? shared[Number(value)] || '' : type === 'inlineStr' ? [...cell.getElementsByTagName('t')].map(t => t.textContent).join('') : value;
      }
      return cells;
    });
    return { name: sheet.getAttribute('name'), rows };
  });
}
