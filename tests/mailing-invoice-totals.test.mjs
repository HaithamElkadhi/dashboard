import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceTotals,invoiceSelectionVariables,formatInvoiceTotals} from '../src/lib/mailingInvoiceTotals.js';
import {renderOnboarding,validateOnboardingVariables} from '../src/lib/mailingSystemTemplates.js';
const invoice=(paymentId,amount,currency='TND',patch={})=>({paymentId,amount,currency,description:paymentId,dueDate:'2026-11-15',...patch});
test('all selected invoices sum exactly and removing one recalculates',()=>{
 const invoices=[invoice('recA','0.1'),invoice('recB','0.2')];assert.deepEqual(invoiceTotals(invoices),[{currency:'TND',amount:'0.3'}]);assert.equal(invoiceTotals(invoices.slice(1))[0].amount,'0.2');assert.deepEqual(invoiceTotals([]),[]);
});
test('currencies stay separate; multiple PDFs for one invoice do not double count',()=>{
 const invoices=[invoice('recA','500','EUR'),invoice('recB','1200','TND'),invoice('recA','500','EUR',{invoiceAttachmentId:'attSecond'})];
 assert.deepEqual(invoiceTotals(invoices),[{currency:'EUR',amount:'500'},{currency:'TND',amount:'1200'}]);assert.equal(formatInvoiceTotals(invoiceTotals(invoices)).replace(/\s/g,''),'500EUR+1200TND');
});
test('combined descriptions and earliest due date are mapped; HTML and plain text include the currencies',()=>{
 const variables=invoiceSelectionVariables([invoice('Admission','300.5','EUR'),invoice('Visa','700','TND',{dueDate:'2026-11-10'})]);assert.equal(variables.formule,'Admission + Visa');assert.equal(variables.date_echeance,'2026-11-10');
 const rendered=renderOnboarding({variables:validateOnboardingVariables(variables)});for(const content of [rendered.text,rendered.html]){assert.ok(content.includes('300,5 EUR + 700 TND'));assert.ok(!content.includes('700 DT'));}
});
test('manual amounts default to TND and support another explicit currency',()=>{
 const variables={formule:'Admission',date_echeance:'2026-11-10',montant_a_payer:'100'};assert.ok(renderOnboarding({variables}).text.includes('100 TND'));assert.ok(renderOnboarding({variables:{...variables,devise:'EUR'}}).text.includes('100 EUR'));
 assert.throws(()=>validateOnboardingVariables({...variables,totaux:[{currency:'',amount:'100'}]}));assert.throws(()=>validateOnboardingVariables({...variables,totaux:[{currency:'EUR',amount:'0'}]}));
});
