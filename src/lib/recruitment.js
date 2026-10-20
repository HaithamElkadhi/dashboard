export const RECRUITMENT_BASE = 'appVHjUwJBU3wGrOW';
export const RECRUITMENT_TABLE = 'tblnud4TgpDXiuAQx';
export const DECISIONS = ['NOT VIEWED', 'STUDENT', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'RECRUITED'];
export const RF = { lastContact:'fldqgHFnwmjLwMDzi', contactHistory:'fldWAFyrFOLrRafh2', name:'fldeREj0cZbORnrlm', lastName:'fld7zmomLskfnP7Dp', firstName:'fldHC7iokvAWLTMKZ', birthDate:'fldVdjyJZFPW4zztJ', age:'fldsRr7FH96M8771n', phone:'fldIcd2XaIeqCn9t1', governorate:'fldV7AQnWCcXZQzlT', address:'fldY8rDaZkDaCX6N4', contracts:'fldqHDKFbJP6Vjusl', mode:'fldyTd8LEB6kTKvEb', availability:'fldQj6v0wp98K63dj', salary:'fldtA54nODavPRrCo', diploma:'fldC6evht9lnYjz7r', arabic:'fldUrI492SSfVFBNw', french:'fldLPu9NyTi9fvGNg', english:'fldU5dIAOMh09jRsp', italian:'fldhwTqU8eQlDhE1x', experience:'fldVpWjOlEsF99jB7', cv:'fldD6pebciD07t0BE', consent:'fldbUqtj3POhHCTuD', decision:'fld748Qqm9HxZP4wF', received:'fldf5vVBSXpNq7n0N', note:'fldoKcYmUOfMhEvzf' };
export function normalizeCandidate(record) {
 const fields=record.fields || {}, result={id:record.id};
 for(const [key,id] of Object.entries(RF)) result[key]=fields[id] ?? (key==='contracts' || key==='cv' ? [] : '');
 result.name=result.name || [result.firstName,result.lastName].filter(Boolean).join(' ');
 result.decision=({ 'À examiner':'NOT VIEWED', 'En cours':'INTERVIEW', 'Retenue':'ACCEPTED', 'Non retenue':'REJECTED' })[result.decision] || result.decision || 'NOT VIEWED';
 result.cv=(Array.isArray(result.cv)?result.cv:[]).map(f=>({id:f.id,filename:f.filename,size:f.size,type:f.type}));
 return result;
}
export function whatsappUrl(value) {
 let digits=String(value || '').replace(/[^0-9]/g,'');
 if(digits.startsWith('00'))digits=digits.slice(2);
 if(digits.length===8)digits='216'+digits;
 return /^[1-9][0-9]{7,14}$/.test(digits) ? `https://wa.me/${digits}` : '';
}

export const recruitmentToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Tunis',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function appendRecruitmentContact(current,{date,reason,expectedHistory},today=recruitmentToday()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date || date>today || typeof reason!=='string' || !reason.trim() || reason.length>5000)throw new Error('Renseignez une date valide et un motif de contact.');
 if(typeof expectedHistory!=='string' || current.contactHistory!==expectedHistory)throw Object.assign(new Error('Historique modifié. Actualisez avant d’ajouter votre contact.'),{status:409});
 const [year,month,day]=date.split('-');
 const line=`${day}/${month}/${year} — ${reason.replace(/\s*[\r\n]+\s*/g,' ').trim()}`;
 const lines=[line,...(current.contactHistory?current.contactHistory.split('\n'):[])];
 const key=line=>{const m=line.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:'';};
 lines.sort((a,b)=>key(b).localeCompare(key(a)));
 const contactHistory=lines.join('\n');
 if(contactHistory.length>95000)throw new Error('Historique trop volumineux.');
 return {contactHistory,lastContact:current.lastContact>date?current.lastContact:date};
}
