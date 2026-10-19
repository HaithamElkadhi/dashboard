import autoTable from 'jspdf-autotable';

export const PDF_FONT = 'Poppins';
export const PDF_BRAND = {
  navy: [6, 40, 74], azure: [102, 198, 238], ink: [35, 56, 76],
  muted: [85, 105, 122], light: [243, 247, 250], border: [217, 227, 236],
};
let assetsPromise;
const documentBrands = new WeakMap();
const base64 = buffer => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
};
async function loadAsset(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Impossible de charger les fichiers de marque du PDF. Rechargez la page.');
  return base64(await response.arrayBuffer());
}
export async function prepareBrand(doc, { assetLoader } = {}) {
  const loader = assetLoader || loadAsset;
  const loadAssets = () => Promise.all([
    loader('/fonts/poppins/Poppins-Regular.ttf'),
    loader('/fonts/poppins/Poppins-SemiBold.ttf'),
    loader('/images/jeexpert-content/logo-pdf.png'),
  ]);
  if (!assetLoader && !assetsPromise) assetsPromise = loadAssets().catch(error => { assetsPromise = null; throw error; });
  const [regular, bold, image] = await (assetLoader ? loadAssets() : assetsPromise);
  doc.addFileToVFS('Poppins-Regular.ttf', regular);
  doc.addFileToVFS('Poppins-SemiBold.ttf', bold);
  doc.addFont('Poppins-Regular.ttf', PDF_FONT, 'normal');
  doc.addFont('Poppins-SemiBold.ttf', PDF_FONT, 'bold');
  doc.setFont(PDF_FONT, 'normal');
  doc.setLineHeightFactor(1.4);
  const data = `data:image/png;base64,${image}`;
  const { width, height } = doc.getImageProperties(data);
  const brand = { logo: { data, width, height } };
  documentBrands.set(doc, brand);
  return brand;
}
export function drawBrandHeader(doc, brand, { title, subtitle = '' }) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_BRAND.navy); doc.rect(0, 0, width, 3, 'F');
  doc.setFillColor(...PDF_BRAND.azure); doc.rect(width - 48, 0, 48, 3, 'F');
  doc.addImage(brand.logo.data, 'PNG', 18, 13, 35, 35 * brand.logo.height / brand.logo.width, 'jeexpert-logo', 'FAST');
  doc.setFont(PDF_FONT, 'bold'); doc.setFontSize(23); doc.setTextColor(...PDF_BRAND.navy);
  doc.text(title, width - 18, 25, { align: 'right' });
  doc.setFont(PDF_FONT, 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_BRAND.muted);
  doc.text(subtitle, width - 18, 33, { align: 'right' });
  doc.text('OUR EXPERTISE, YOUR FUTURE', width - 18, 42, { align: 'right' });
  doc.setDrawColor(...PDF_BRAND.border); doc.setLineWidth(0.3); doc.line(18, 56, width - 18, 56);
  return 66;
}
function continuationHeader(doc) {
  const width = doc.internal.pageSize.getWidth();
  // Reuse the embedded artwork, keeping the wordmark as an image.
  const { logo } = documentBrands.get(doc);
  doc.addImage(logo.data, 'PNG', 18, 8, 18, 18 * logo.height / logo.width, 'jeexpert-logo', 'FAST');
  doc.setFont(PDF_FONT, 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_BRAND.muted);
  doc.text('OUR EXPERTISE, YOUR FUTURE', width - 18, 19, { align: 'right' });
  doc.setDrawColor(...PDF_BRAND.border); doc.line(18, 29, width - 18, 29);
}
export function brandTable(doc, options) {
  const { willDrawPage, ...rest } = options;
  autoTable(doc, {
    theme: 'plain', margin: { left: 18, right: 18, top: 36, bottom: 27 },
    styles: { font: PDF_FONT, fontSize: 9, cellPadding: 3, textColor: PDF_BRAND.ink, overflow: 'linebreak', lineColor: PDF_BRAND.border, lineWidth: 0 },
    headStyles: { fillColor: PDF_BRAND.navy, textColor: [255,255,255], fontStyle: 'bold', cellPadding: 3.5 },
    alternateRowStyles: { fillColor: PDF_BRAND.light },
    ...rest,
    willDrawPage: data => { if (doc.internal.getCurrentPageInfo().pageNumber > 1) continuationHeader(doc); willDrawPage?.(data); },
  });
  return doc.lastAutoTable.finalY;
}
export function drawBrandFooter(doc) {
  const count = doc.getNumberOfPages(), width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page); doc.setDrawColor(...PDF_BRAND.border); doc.setLineWidth(0.3);
    doc.line(18, height - 22, width - 18, height - 22);
    doc.setFont(PDF_FONT, 'normal'); doc.setFontSize(7); doc.setTextColor(...PDF_BRAND.muted);
    doc.text('contact@jeexpert-study.com  |  +393520880880  |  www.jeexpert-study.com', 18, height - 15);
    doc.setTextColor(...PDF_BRAND.navy); doc.text(`${page} / ${count}`, width - 18, height - 15, { align: 'right' });
    doc.setFillColor(...PDF_BRAND.azure); doc.rect(18, height - 9, 9, 1.5, 'F');
  }
}
