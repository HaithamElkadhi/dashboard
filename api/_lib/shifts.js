import { randomUUID } from 'node:crypto';
import { airtable, USERS_TABLE, requireAdmin, checkOrigin, authError, sendAuthError, publicUser } from './auth.js';
import { SHIFT_TABLES, SHIFT_ZONES, isRecordId, validDate, validateRange, validateShift, validateRule, validateAbsence, overlaps, ruleOccurrences, normalizeShift, normalizeRule, normalizeAbsence, dateAdd, zonedParts, localDateTimeToIso } from '../../src/lib/shifts.js';
let mutationQueue=Promise.resolve();
const normalizers={shifts:normalizeShift,rules:normalizeRule,absences:normalizeAbsence};
function shiftFields(s) {return {Name:`${s.userId} · ${s.start}`,User:[s.userId],Start:s.start,End:s.end,'Break Minutes':s.breakMinutes,Mode:s.mode,Status:'Planifié',Note:s.note,Rule:s.ruleId?[s.ruleId]:[],'Source Key':s.sourceKey || '',Revision:randomUUID()};}
function absenceFields(s) {return {Name:`${s.type} · ${s.start}`,User:[s.userId],Start:s.start,End:s.end,Type:s.type,Status:'Planifié',Note:s.note,Revision:randomUUID()};}
function ruleFields(s) {return {Name:`${s.userId} · ${s.startTime}–${s.endTime}`,User:[s.userId],Weekdays:s.weekdays.map(String),'Start Time':s.startTime,'End Time':s.endTime,'Break Minutes':s.breakMinutes,Mode:s.mode,'Time Zone':s.timeZone,'Valid From':s.validFrom,'Valid To':s.validTo || null,Active:s.active,Revision:randomUUID()};}
export default async function handler(req,res,env=process.env) {
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 try {
  await requireAdmin(req,env);
  const request=(path,method='GET',body)=>airtable(path,{method,body,env});
  const list=async(table,params={})=>{
   const records=[];let offset;do{const query=new URLSearchParams({pageSize:'100',...params});if(offset)query.set('offset',offset);const page=await request(`${table}?${query}`);records.push(...page.records);offset=page.offset;}while(offset);return records;
  };
  const users=async()=>{
   const records=[];let offset;do{const params=new URLSearchParams({pageSize:'100'});for(const f of ['username','display_name','is_active','is_admin','role'])params.append('fields[]',f);if(offset)params.set('offset',offset);const page=await request(`${USERS_TABLE}?${params}`);records.push(...page.records.map(publicUser));offset=page.offset;}while(offset);return records.map(({id,displayName,isActive})=>({id,displayName,isActive}));
  };
  const all=async(kind,filter)=> (await list(SHIFT_TABLES[kind],filter?{filterByFormula:filter}:{})).map(normalizers[kind]);
  if(req.method==='GET') {
   const url=new URL(req.url,'http://internal'),start=url.searchParams.get('start'),end=url.searchParams.get('end');
   try{validateRange(start,end);}catch(e){throw authError(400,e.message);}
   // Pad dates for both supported timezones and overnight occurrences.
   const lo=`${dateAdd(start,-1)}T00:00:00.000Z`,hi=`${dateAdd(end,1)}T00:00:00.000Z`;
   const filter=`AND(IS_BEFORE({Start},'${hi}'),IS_AFTER({End},'${lo}'))`;
   const people=await users(),shifts=await all('shifts',filter),rules=await all('rules'),absences=await all('absences',filter);
   return res.json({users:people,shifts,rules,absences});
  }
  checkOrigin(req,env);
  const body=req.body || {};
  if(!body || typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','input','id','expected','start','end','sourceStart','targetStart','timeZone'].includes(k)))throw authError(400,'Requête invalide.');
  const run=async()=>{
   const people=await users();
   const active=id=>{if(!people.some(u=>u.id===id && u.isActive))throw authError(400,'Choisissez un utilisateur actif.');};
   const read=async kind=>{
    if(!isRecordId(body.id))throw authError(400,'Identifiant invalide.');
    const item=normalizers[kind](await request(`${SHIFT_TABLES[kind]}/${body.id}`));
    if(typeof body.expected!=='string'||body.expected!==item.revision)throw authError(409,'Le planning a changé. Actualisez avant de réessayer.');return item;
   };
   const conflicts=async(value,exclude='',kind='shifts')=>{
    const filter=`AND(IS_BEFORE({Start},'${value.end}'),IS_AFTER({End},'${value.start}'))`;
    const shifts=await all('shifts',filter),absences=await all('absences',filter);
    if([...shifts.filter(s=>kind!=='shifts'||s.id!==exclude),...absences.filter(s=>kind!=='absences'||s.id!==exclude)].some(s=>s.status!=='Annulé' && overlaps(value,s)))throw authError(409,'Chevauchement avec un shift ou une absence. Ajustez les horaires.');
   };
   if(['save-shift','save-rule','save-absence'].includes(body.action)){
    const kind={'save-shift':'shifts','save-rule':'rules','save-absence':'absences'}[body.action];
    let value;try{value=({shifts:validateShift,rules:validateRule,absences:validateAbsence})[kind](body.input);}catch(e){throw authError(400,e.message);}
    const old=body.id?await read(kind):null;
    if(old?.status==='Annulé')throw authError(409,'Ce créneau est annulé. Créez un nouveau créneau.');
    // Inactive users retain history, but no new assignment is permitted.
    active(value.userId);
    if(kind!=='rules')await conflicts(value,old?.id,kind);
    const fields=({shifts:shiftFields,rules:ruleFields,absences:absenceFields})[kind](value);
    if(old && kind==='shifts'){fields.Rule=old.ruleId?[old.ruleId]:[];fields['Source Key']=old.sourceKey;}
    const saved=await request(`${SHIFT_TABLES[kind]}${old?'/'+old.id:''}`,old?'PATCH':'POST',{fields});
    return {ok:true,id:saved.id};
   }
   if(['cancel-shift','cancel-absence','disable-rule'].includes(body.action)){
    const kind={'cancel-shift':'shifts','cancel-absence':'absences','disable-rule':'rules'}[body.action],old=await read(kind);
    await request(`${SHIFT_TABLES[kind]}/${old.id}`,'PATCH',{fields:{...(kind==='rules'?{Active:false}:{Status:'Annulé'}),Revision:randomUUID()}});return {ok:true};
   }
   if(['generate','duplicate-week'].includes(body.action)){
    let start,end,candidates=[];
    if(body.action==='generate'){
     try{validateRange(body.start,body.end);}catch(e){throw authError(400,e.message);}
     start=body.start;end=body.end;
     const rules=await all('rules');
     try{for(const rule of rules.filter(r=>r.active)){active(rule.userId);candidates.push(...ruleOccurrences(rule,start,end));}}catch(e){throw authError(e.status || 400,e.message);}
    } else {
     const {sourceStart,targetStart,timeZone='Africa/Tunis'}=body;
     if(!validDate(sourceStart)||!validDate(targetStart)||sourceStart===targetStart||!SHIFT_ZONES.includes(timeZone)||new Date(`${sourceStart}T12:00:00Z`).getUTCDay()!==1||new Date(`${targetStart}T12:00:00Z`).getUTCDay()!==1)throw authError(400,'Sélectionnez deux lundis distincts et un fuseau valide.');
     start=targetStart;end=dateAdd(targetStart,7);
     const source=await all('shifts',`AND(IS_BEFORE({Start},'${dateAdd(sourceStart,8)}T00:00:00Z'),IS_AFTER({End},'${dateAdd(sourceStart,-1)}T00:00:00Z'))`);
     const delta=(Date.parse(targetStart)-Date.parse(sourceStart))/86400000;
     try{for(const shift of source.filter(s=>s.status!=='Annulé')){
      const from=zonedParts(shift.start,timeZone),to=zonedParts(shift.end,timeZone);if(from.date<sourceStart||from.date>=dateAdd(sourceStart,7))continue;active(shift.userId);
      candidates.push({...validateShift({userId:shift.userId,start:localDateTimeToIso(dateAdd(from.date,delta),from.time,timeZone),end:localDateTimeToIso(dateAdd(to.date,delta),to.time,timeZone),breakMinutes:shift.breakMinutes,mode:shift.mode,note:shift.note}),sourceKey:`copy:${shift.id}:${targetStart}`});
     }}catch(e){throw authError(e.status || 400,e.message);}
    }
    if(candidates.length>200)throw authError(400,'Maximum 200 créneaux par génération. Choisissez une période plus courte.');
    const filter=`AND(IS_BEFORE({Start},'${dateAdd(end,2)}T00:00:00Z'),IS_AFTER({End},'${dateAdd(start,-1)}T00:00:00Z'))`;
    const existing=await all('shifts',filter),absences=await all('absences',filter),allShifts=await all('shifts');
    // Retain keys even when cancelled or moved, so a retry cannot recreate a cancelled occurrence.
    const keys=new Set(allShifts.map(s=>s.sourceKey).filter(Boolean)),pending=[],skipped=[];
    for(const candidate of candidates){
     if(keys.has(candidate.sourceKey)){skipped.push(candidate.sourceKey);continue;}
     if([...existing,...absences,...pending].some(s=>s.status!=='Annulé' && overlaps(candidate,s)))throw authError(409,`Conflit de planning le ${candidate.start.slice(0,10)}. Aucun créneau de cette opération n’a été ajouté.`);
     pending.push(candidate);keys.add(candidate.sourceKey);
    }
    let created=0;
    try{for(let i=0;i<pending.length;i+=10){await request(SHIFT_TABLES.shifts,'POST',{records:pending.slice(i,i+10).map(s=>({fields:shiftFields(s)}))});created+=pending.slice(i,i+10).length;}}
    catch{throw authError(503,`${created} créneaux confirmés. Actualisez puis relancez la génération pour reprendre sans recréer les occurrences déjà enregistrées.`);}
    return {ok:true,created,skipped:skipped.length};
   }
   throw authError(400,'Action inconnue.');
  };
  const result=mutationQueue.catch(()=>{}).then(run);mutationQueue=result.catch(()=>{});return res.json(await result);
 }catch(error){sendAuthError(res,error);}
}
