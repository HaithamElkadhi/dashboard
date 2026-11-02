import { dateAdd, validateRange, SHIFT_ZONES, localDateTimeToIso, zonedParts } from './shifts.js';
const active=record=>record.status!=='Annulé';
export function reportRanges(start,end) {
 validateRange(start,dateAdd(end,1),366);const ranges=[];
 for(let day=start;day<=end;){const next=dateAdd(day,Math.min(62,(Date.parse(dateAdd(end,1))-Date.parse(day))/86400000));ranges.push({start:day,end:next});day=next;}
 return ranges;
}
function pauseByDay(record,timeZone) {
 const from=Date.parse(record.start),to=Date.parse(record.end),parts=[];
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return new Map();
 for(let day=zonedParts(record.start,timeZone).date;day<=zonedParts(new Date(to-1).toISOString(),timeZone).date;day=dateAdd(day,1)){
  const lo=Date.parse(localDateTimeToIso(day,'00:00',timeZone)),hi=Date.parse(localDateTimeToIso(dateAdd(day,1),'00:00',timeZone));
  const weight=Math.max(0,Math.min(hi,to)-Math.max(lo,from))/(to-from);const exact=Math.max(0,Number(record.breakMinutes)||0)*weight;
  parts.push({day,value:Math.floor(exact),remainder:exact-Math.floor(exact)});
 }
 let remaining=Math.round(Math.max(0,Number(record.breakMinutes)||0))-parts.reduce((sum,p)=>sum+p.value,0);
 for(const part of [...parts].sort((a,b)=>b.remainder-a.remainder||a.day.localeCompare(b.day))){if(remaining<=0)break;part.value++;remaining--;}
 return new Map(parts.map(p=>[p.day,p.value]));
}
export function buildShiftReport({user,start,end,timeZone,shifts=[],absences=[]}) {
 reportRanges(start,end);
 if(!user?.id || !SHIFT_ZONES.includes(timeZone))throw new Error('Sélectionnez un collaborateur et un fuseau valide.');
 const rows=[],workedDays=new Set(),absenceDays=new Set();let grossMinutes=0,breakMinutes=0,netMinutes=0;
 const relevant=shifts.filter(s=>s.userId===user.id && active(s)),away=absences.filter(s=>s.userId===user.id && active(s));
 const pauses=new Map(relevant.map(record=>[record,pauseByDay(record,timeZone)]));
 for(let day=start;day<=end;day=dateAdd(day,1)){
  const lo=Date.parse(localDateTimeToIso(day,'00:00',timeZone)),hi=Date.parse(localDateTimeToIso(dateAdd(day,1),'00:00',timeZone));let count=0;
  for(const [kind,records] of [['shift',relevant],['absence',away]])for(const record of records){
   const originalStart=Date.parse(record.start),originalEnd=Date.parse(record.end),from=Math.max(lo,originalStart),to=Math.min(hi,originalEnd);
   if(!Number.isFinite(originalStart)||!Number.isFinite(originalEnd)||to<=from)continue;
   const duration=(to-from)/60000,allocatedBreak=kind==='shift'?Math.min(duration,pauses.get(record)?.get(day) || 0):0;
   rows.push({date:day,kind,start:new Date(from).toISOString(),end:new Date(to).toISOString(),mode:kind==='shift'?record.mode:record.type,breakMinutes:allocatedBreak,grossMinutes:duration,netMinutes:kind==='shift'?duration-allocatedBreak:0});count++;
   if(kind==='shift'){workedDays.add(day);grossMinutes+=duration;breakMinutes+=allocatedBreak;netMinutes+=duration-allocatedBreak;}else absenceDays.add(day);
  }
  if(!count)rows.push({date:day,kind:'off',breakMinutes:0,grossMinutes:0,netMinutes:0});
 }
 rows.sort((a,b)=>a.date.localeCompare(b.date)||(a.start || '').localeCompare(b.start || ''));
 return {user,start,end,timeZone,rows,totals:{plannedDays:workedDays.size,absenceDays:absenceDays.size,grossMinutes,breakMinutes,netMinutes}};
}
export function formatReportMinutes(value) {const minutes=Math.round(value || 0);return `${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')}`;}
export function reportTime(row,timeZone) {if(!row.start)return '—';const a=zonedParts(row.start,timeZone),b=zonedParts(row.end,timeZone);return `${a.time} – ${b.date>row.date?'24:00':b.time}`;}
