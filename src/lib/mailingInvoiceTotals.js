export function invoiceTotals(invoices) {
 const unique=new Map();invoices.forEach((invoice,index)=>{const key=invoice.paymentId || invoice.id || `row-${index}`;if(!unique.has(key))unique.set(key,invoice);});
 const groups=new Map();
 for(const invoice of unique.values()){
  const code=String(invoice.currency || '').trim().toUpperCase(),currency=code==='DT'?'TND':code;
  const value=String(invoice.amount ?? '').replace(/\s/g,'').replace(',','.');
  const valid=/^\d{1,9}(?:\.\d{1,3})?$/.test(value),units=valid?Math.round(Number(value)*1000):null;
  const old=groups.get(currency);groups.set(currency,old===null || units===null?null:(old || 0)+units);
 }
 return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([currency,units])=>({currency,amount:units===null?'':String(units/1000)}));
}
export function invoiceSelectionVariables(invoices) {
 const totaux=invoiceTotals(invoices),descriptions=[...new Set(invoices.map(i=>i.description).filter(Boolean))],dates=invoices.map(i=>i.dueDate).filter(Boolean).sort();
 return {formule:descriptions.join(' + '),date_echeance:dates[0] || '',montant_a_payer:totaux[0]?.amount || '',devise:totaux.length===1?totaux[0].currency:'',totaux};
}
export function formatInvoiceTotals(totals) {return totals.map(item=>`${item.amount!=='' && Number.isFinite(Number(item.amount))?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:3}).format(Number(item.amount)):'À compléter'} ${item.currency || '(devise manquante)'}`).join(' + ');}
