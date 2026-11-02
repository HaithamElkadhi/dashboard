import { jsPDF } from 'jspdf';
import { prepareBrand, drawBrandHeader, drawBrandFooter, brandTable, PDF_BRAND, PDF_FONT } from './pdfBrand.js';
import { formatReportMinutes, reportTime } from './shiftReport.js';
const date=value=>value.split('-').reverse().join('/');
export function shiftReportFilename(report) {const name=String(report.user.displayName || 'Collaborateur').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,80);return `JEEXPERT_Rapport_${name}_${report.start}_${report.end}.pdf`;}
export async function buildShiftReportPdf(report,options={}) {
 const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'}),brand=await prepareBrand(doc,options);
 const y=drawBrandHeader(doc,brand,{title:'RAPPORT DE PRÉSENCE',subtitle:'Planning prévisionnel · RH / Shift'});
 brandTable(doc,{startY:y,body:[['Collaborateur',report.user.displayName || report.user.id],['Période',`${date(report.start)} au ${date(report.end)} inclus`],['Fuseau horaire',report.timeZone],['Nature du rapport','Horaires planifiés. Ce document ne certifie pas la présence réelle.']],columnStyles:{0:{cellWidth:43,fontStyle:'bold'}},styles:{font:PDF_FONT,fontSize:9,cellPadding:3.5}});
 brandTable(doc,{startY:doc.lastAutoTable.finalY+7,head:[['Jours planifiés','Heures prévues','Pauses','Heures nettes','Jours d’absence']],body:[[String(report.totals.plannedDays),formatReportMinutes(report.totals.grossMinutes),formatReportMinutes(report.totals.breakMinutes),formatReportMinutes(report.totals.netMinutes),String(report.totals.absenceDays)]],styles:{font:PDF_FONT,fontSize:8,cellPadding:3},headStyles:{fillColor:PDF_BRAND.navy,textColor:[255,255,255],fontSize:8}});
 brandTable(doc,{startY:doc.lastAutoTable.finalY+7,head:[['Date','Activité','Horaires','Mode / absence','Pause','Heures nettes']],body:report.rows.map(row=>[date(row.date),row.kind==='shift'?'Shift planifié':row.kind==='absence'?'Absence':'Non planifié',reportTime(row,report.timeZone),row.mode || '—',row.kind==='shift'?formatReportMinutes(row.breakMinutes):'—',row.kind==='shift'?formatReportMinutes(row.netMinutes):'—']),styles:{font:PDF_FONT,fontSize:8,cellPadding:3},columnStyles:{0:{cellWidth:26},1:{cellWidth:30},2:{cellWidth:31},3:{cellWidth:32},4:{cellWidth:24},5:{cellWidth:31}}});
 brandTable(doc,{startY:doc.lastAutoTable.finalY+6,body:[['Lecture du rapport','Les créneaux annulés sont exclus. Les shifts de nuit sont répartis par jour. En cas de découpage d’un créneau, sa pause est répartie au prorata : son horaire exact n’est pas pointé.'],['Édition',new Intl.DateTimeFormat('fr-FR',{timeZone:report.timeZone,dateStyle:'short',timeStyle:'short'}).format(new Date())]],styles:{font:PDF_FONT,fontSize:7.5,cellPadding:3,textColor:PDF_BRAND.muted},columnStyles:{0:{cellWidth:33,fontStyle:'bold'}}});
 drawBrandFooter(doc);return doc;
}
