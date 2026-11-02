export const SHIFT_TABLES = Object.freeze({ shifts:'tbl9ZpRbyyoUroyu8', rules:'tblwm53MMmB2iT3Tn', absences:'tbliEQBQD6eIvoOUp' });
export const SHIFT_MODES = ['Présentiel','À distance'];
export const SHIFT_ZONES = ['Africa/Tunis','Europe/Rome'];
export const ABSENCE_TYPES = ['Congé','Indisponible'];
export const isRecordId = value => /^rec[A-Za-z0-9]+$/.test(value || '');
export function validDate(value) { return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value; }
export function dateAdd(value,days) { if(!validDate(value))throw new Error('Date invalide.');return new Date(Date.parse(value)+days*86400000).toISOString().slice(0,10); }
const formatters=new Map();
export function zonedParts(iso,zone='Africa/Tunis') {
 if(!SHIFT_ZONES.includes(zone))throw new Error('Fuseau horaire invalide.');
 if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
 const p=Object.fromEntries(formatters.get(zone).formatToParts(new Date(iso)).map(p=>[p.type,p.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};
}
const validTime=value=>typeof value==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function localDateTimeToIso(date,time,zone='Africa/Tunis') {
 if(!validDate(date)||!validTime(time)||!SHIFT_ZONES.includes(zone))throw new Error('Date, heure ou fuseau invalide.');
 const guess=Date.parse(`${date}T${time}:00Z`), offsets=new Set();
 for(const delta of [-86400000,0,86400000]){const value=guess+delta,p=zonedParts(value,zone);offsets.add(Date.parse(`${p.date}T${p.time}:00Z`)-value);}
 const matches=[...offsets].map(offset=>guess-offset).filter(value=>{const p=zonedParts(value,zone);return p.date===date && p.time===time;});
 if(matches.length!==1)throw new Error('Heure inexistante ou ambiguë lors du changement d’heure. Choisissez un autre horaire.');
 return new Date(matches[0]).toISOString();
}
function text(value,max=2000) { if(typeof value!=='string'||value.length>max)throw new Error('Texte invalide.');return value.trim(); }
function keys(input,allowed) { if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!allowed.includes(key)))throw new Error('Champs invalides.'); }
function interval(input,maxHours) {
 if(!isRecordId(input.userId))throw new Error('Utilisateur invalide.');
 for(const key of ['start','end'])if(typeof input[key]!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?Z$/.test(input[key])||!validDate(input[key].slice(0,10))||!Number.isFinite(Date.parse(input[key])))throw new Error('Horaires UTC invalides.');
 const minutes=(Date.parse(input.end)-Date.parse(input.start))/60000;
 if(minutes<=0||minutes>maxHours*60)throw new Error('La fin doit suivre le début dans la durée autorisée.');
 return {userId:input.userId,start:new Date(input.start).toISOString(),end:new Date(input.end).toISOString(),note:text(input.note || '')};
}
export function validateShift(input) {
 keys(input,['userId','start','end','breakMinutes','mode','note']);
 const value=interval(input,24),duration=(Date.parse(value.end)-Date.parse(value.start))/60000;
 if(!SHIFT_MODES.includes(input.mode)||!Number.isInteger(input.breakMinutes)||input.breakMinutes<0||input.breakMinutes>=duration)throw new Error('Mode ou pause invalide.');
 return {...value,mode:input.mode,breakMinutes:input.breakMinutes};
}
export function validateAbsence(input) {
 keys(input,['userId','start','end','type','note']);const value=interval(input,366*24);
 if(!ABSENCE_TYPES.includes(input.type))throw new Error('Type d’absence invalide.');return {...value,type:input.type};
}
export function validateRule(input) {
 keys(input,['userId','weekdays','startTime','endTime','breakMinutes','mode','timeZone','validFrom','validTo','active']);
 if(!isRecordId(input.userId)||!Array.isArray(input.weekdays)||!input.weekdays.length||new Set(input.weekdays).size!==input.weekdays.length||input.weekdays.some(d=>!Number.isInteger(d)||d<1||d>7))throw new Error('Sélectionnez un utilisateur et des jours valides.');
 if(!validTime(input.startTime)||!validTime(input.endTime)||input.startTime===input.endTime||!SHIFT_ZONES.includes(input.timeZone)||!SHIFT_MODES.includes(input.mode)||!validDate(input.validFrom)||typeof input.validTo!=='string'||input.validTo && (!validDate(input.validTo)||input.validTo<input.validFrom)||typeof input.active!=='boolean')throw new Error('Configuration horaire invalide.');
 const minutes=value=>Number(value.slice(0,2))*60+Number(value.slice(3));let duration=minutes(input.endTime)-minutes(input.startTime);if(duration<0)duration+=1440;
 if(!Number.isInteger(input.breakMinutes)||input.breakMinutes<0||input.breakMinutes>=duration)throw new Error('Pause invalide.');
 return {...input,validTo:input.validTo || '',weekdays:[...input.weekdays].sort()};
}
export function overlaps(a,b) {return a.userId===b.userId && Date.parse(a.start)<Date.parse(b.end) && Date.parse(b.start)<Date.parse(a.end);}
export function validateRange(start,end,maxDays=62) { if(!validDate(start)||!validDate(end)||start>=end||(Date.parse(end)-Date.parse(start))/86400000>maxDays)throw new Error(`Sélectionnez une période de 1 à ${maxDays} jours.`);return {start,end}; }
export function ruleOccurrences(rule,start,end) {
 validateRange(start,end);if(!rule.active)return [];const result=[];
 for(let day=start;day<end;day=dateAdd(day,1)){
  if(day<rule.validFrom || rule.validTo && day>rule.validTo || !rule.weekdays.includes(new Date(`${day}T12:00:00Z`).getUTCDay() || 7))continue;
  const input={userId:rule.userId,start:localDateTimeToIso(day,rule.startTime,rule.timeZone),end:localDateTimeToIso(rule.endTime<=rule.startTime?dateAdd(day,1):day,rule.endTime,rule.timeZone),breakMinutes:rule.breakMinutes,mode:rule.mode,note:''};
  result.push({...validateShift(input),ruleId:rule.id,sourceKey:`rule:${rule.id}:${day}`});
 }
 return result;
}
export function normalizeShift(record) { const f=record.fields || {};return {id:record.id,userId:f.User?.[0] || '',start:f.Start || '',end:f.End || '',breakMinutes:f['Break Minutes'] || 0,mode:f.Mode || '',status:f.Status || 'Planifié',note:f.Note || '',ruleId:f.Rule?.[0] || '',sourceKey:f['Source Key'] || '',revision:f.Revision || ''}; }
export function normalizeRule(record) {const f=record.fields || {};return {id:record.id,userId:f.User?.[0] || '',weekdays:(f.Weekdays || []).map(Number),startTime:f['Start Time'] || '',endTime:f['End Time'] || '',breakMinutes:f['Break Minutes'] || 0,mode:f.Mode || '',timeZone:f['Time Zone'] || 'Africa/Tunis',validFrom:f['Valid From'] || '',validTo:f['Valid To'] || '',active:f.Active===true,revision:f.Revision || ''};}
export function normalizeAbsence(record) {const f=record.fields || {};return {id:record.id,userId:f.User?.[0] || '',start:f.Start || '',end:f.End || '',type:f.Type || '',status:f.Status || 'Planifié',note:f.Note || '',revision:f.Revision || ''};}
