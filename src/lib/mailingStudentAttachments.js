import { PF, FIN } from './config.js';
const safeName = value => String(value || '').replace(/[\r\n/\\<>:"|?*]/g,' ').trim().slice(0,130) || 'Etudiant';
const safePdfName = value => `${safeName(String(value).replace(/\.pdf$/i, '')).slice(0,126)}.pdf`;
const meaningful = value => Array.isArray(value) ? value.some(meaningful) : typeof value === 'string' ? !!value.trim() : false;
export function describeProposal(studentRecord) {
  const f = studentRecord.fields || {};
  if (![PF.proposalDate,PF.selectedServices,PF.entryLevel,PF.intendedIntake,PF.primaryFieldOfStudy].some(key=>meaningful(f[key]))) return null;
  return { studentDocument:'proposal',studentId:studentRecord.id,filename:`Proposal - ${safeName(f[PF.fullName])}.pdf`,size:350000 };
}
export const isInvoicePdf = file => file && typeof file.filename === 'string' && /\.pdf$/i.test(file.filename) && (!file.type || file.type === 'application/pdf');
export function describeInvoices(paymentRecords,studentRecord) {
  return paymentRecords.filter(record=>record.fields?.[FIN.prospects]?.includes(studentRecord.id)).flatMap(record=>{
    const f=record.fields, reference=String(f[FIN.reference] || record.id).slice(0,150);
    const purpose=f[FIN.purpose];
    const common={studentDocument:'invoice',studentId:studentRecord.id,paymentId:record.id,reference,label:`Facture ${reference}`,amount:f[FIN.amount] ?? '',dueDate:f[FIN.dueDate] || '',description:Array.isArray(purpose) ? purpose.filter(Boolean).join(', ') : String(purpose || ''),currency:String(f[FIN.currency] || ''),status:String(f[FIN.status] || '')};
    const files=(Array.isArray(f[FIN.invoice])?f[FIN.invoice]:[]).filter(isInvoicePdf);
    return files.length ? files.map(file=>({...common,invoiceAttachmentId:file.id,filename:safePdfName(file.filename),size:Number(file.size)||350000})) : [{...common,filename:`Facture - ${safeName(reference)}.pdf`,size:350000}];
  });
}
