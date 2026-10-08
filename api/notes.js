import { requireUser, checkOrigin, authError, sendAuthError, airtable, USERS_TABLE } from './_lib/auth.js';
import { BASE_ID, TABLES } from '../src/lib/config.js';
import { NOTES_TABLE, NOTE_STATUSES, normalizeNote } from '../src/lib/notes.js';
import ticketing from './ticketing.js';
const pending = new Map();
const id = value => /^rec[A-Za-z0-9]+$/.test(value || '');
const date = value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
export default async function handler(req, res, env = process.env) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const { user } = await requireUser(req, env);
    if (req.method === 'POST') checkOrigin(req, env);
    const request = async (path, method='GET', fields) => {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, { method, headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, ...(fields ? { body: JSON.stringify({ fields }) } : {}), signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw authError(response.status === 404 ? 404 : 503, method === 'GET' ? 'Unable to load notes.' : 'Save could not be confirmed. Refresh before retrying.');
      return response.json();
    };
    if (req.method === 'GET') {
      const records=[]; let offset;
      do { const params = new URLSearchParams({ pageSize:'100' }); if(offset)params.set('offset',offset); const page=await request(`${NOTES_TABLE}?${params}`); records.push(...page.records); offset=page.offset; } while(offset);
      return res.json({ notes: records.map(normalizeNote).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)) });
    }
    const body=req.body || {}, editing=!!body.id;
    if(Object.keys(body).some(key=>!['id','input','expected','action','actionId','type','priority'].includes(key)) || editing && !id(body.id) || !editing && body.action === 'ticket') throw authError(400,'Invalid note request.');
    const operation=(pending.get(body.id || user.id)||Promise.resolve()).catch(()=>{}).then(async()=>{
      const original=editing ? normalizeNote(await request(`${NOTES_TABLE}/${body.id}`)) : null;
      if(editing && (!body.expected || ['title','content','studentId','callDate','status','actions','updatedAt','history'].some(key=>JSON.stringify(original[key])!==JSON.stringify(body.expected[key]))))throw authError(409,'This note changed. Refresh and reopen it before saving.');
      const actor=`${user.displayName || user.username} (${user.username})`, now=new Date().toISOString();
      if(body.action==='ticket') {
        const action=original.actions.find(a=>a.id===body.actionId);
        if(!action || !/^[A-Za-z0-9-]{1,64}$/.test(action.id || '') || !original.studentId || action.done)throw authError(400,'Select an unfinished action on a student-linked note.');
        if(action.ticketId)return { note:original, ticketId:action.ticketId };
        const marker=`Note action: ${original.id}:${action.id}`;
        const params=new URLSearchParams({ filterByFormula:`AND({Type}='Ticket',{Notes}='${marker}')`,maxRecords:'2' });
        const prior=await request(`${TABLES.tasks}?${params}`);
        let ticket=prior.records?.[0], warning='';
        if(!ticket) {
          let result, code=200;
          await ticketing({ ...req, url:'/api/ticketing', body:{ input:{ subject:action.text, description:`${original.title}\n\n${original.content}\n\nAction: ${action.text}`, linkedProspectIds:[original.studentId], assignedTo:action.assignedTo || '', ddl:action.dueDate || '', type:body.type, priority:body.priority, notes:marker } } }, { setHeader(){},status(value){code=value;return this;},json(value){result=value;} },env);
          if(code>=400)throw authError(code,result?.error || 'Unable to create ticket.');
          ticket=result; warning=result.warning || '';
        }
        const actions=original.actions.map(a=>a.id===action.id ? {...a,ticketId:ticket.id}:a);
        try { const saved=await request(`${NOTES_TABLE}/${original.id}`,'PATCH',{ Actions:JSON.stringify(actions),'Updated By':actor,'Updated At':now,History:[original.history,`${now} — ${actor} — Ticket ${ticket.id} linked to action ${action.text}`].filter(Boolean).join('\n') });return { note:normalizeNote(saved),ticketId:ticket.id,warning }; }
        catch { return { note:{...original,actions},ticketId:ticket.id,warning:'Ticket created. Note link could not be confirmed; refresh and use Create ticket to recover the existing link.' }; }
      }
      if(body.action && body.action!=='save')throw authError(400,'Invalid action.');
      const input=body.input;
      if(!input || typeof input!=='object' || Object.keys(input).some(key=>!['title','content','studentId','callDate','status','actions'].includes(key)))throw authError(400,'Invalid note fields.');
      for(const key of ['title','content','studentId','callDate','status'])if(typeof input[key]!=='string')throw authError(400,'Invalid note text.');
      if(!input.title.trim() || input.title.length>200 || !input.content.trim() || input.content.length>20000 || !NOTE_STATUSES.includes(input.status) || !date(input.callDate))throw authError(400,'Title, content, valid status and date are required.');
      if(input.studentId){if(!id(input.studentId))throw authError(400,'Invalid student.');await request(`${TABLES.prospects}/${input.studentId}`);}
      if(original?.actions.some(a=>a.ticketId) && original.studentId!==input.studentId)throw authError(400,'A note with linked tickets cannot change student.');
      if(!Array.isArray(input.actions) || input.actions.length>30)throw authError(400,'Maximum 30 actions per note.');
      const seen=new Set(), assignees=new Set();
      const actions=input.actions.map(a=>{
        if(!a || Object.keys(a).some(key=>!['id','text','assignedTo','dueDate','done','ticketId'].includes(key)) || !/^[A-Za-z0-9-]{1,64}$/.test(a.id||'') || seen.has(a.id) || typeof a.text!=='string' || !a.text.trim() || a.text.length>1000 || typeof a.assignedTo!=='string' || a.assignedTo && !id(a.assignedTo) || typeof a.dueDate!=='string' || !date(a.dueDate) || typeof a.done!=='boolean')throw authError(400,'Invalid follow-up action.');
        seen.add(a.id);const old=original?.actions.find(item=>item.id===a.id);
        if((a.ticketId || '') !== (old?.ticketId || ''))throw authError(400,'Ticket links cannot be edited manually.');
        if(a.assignedTo && a.assignedTo!==old?.assignedTo)assignees.add(a.assignedTo);
        return {id:a.id,text:a.text.trim(),assignedTo:a.assignedTo,dueDate:a.dueDate,done:a.done,ticketId:old?.ticketId || ''};
      });
      if(original?.actions.some(a=>a.ticketId && !seen.has(a.id)))throw authError(400,'Actions linked to tickets cannot be removed. Mark them done instead.');
      if(input.status==='Completed' && actions.some(a=>!a.done))throw authError(400,'Complete all actions before completing this note.');
      for(const assignee of assignees){const account=await airtable(`${USERS_TABLE}/${assignee}`,{env});if(account.fields?.is_active!==true)throw authError(400,'Select an active platform user.');}
      const details=original ? ['title','content','studentId','callDate','status','actions'].filter(key=>JSON.stringify(original[key])!==JSON.stringify(key==='actions'?actions:input[key])).join(', ') : 'Created';
      if(original && !details)return {note:original};
      const history=[original?.history,`${now} — ${actor} — ${details}`].filter(Boolean).join('\n');
      if(history.length>95000)throw authError(409,'Archive the history in Airtable before saving more changes.');
      const fields={Title:input.title.trim(),Content:input.content.trim(),Student:input.studentId?[input.studentId]:[],'Call Date':input.callDate || null,Status:input.status,Actions:JSON.stringify(actions),'Updated By':actor,'Updated At':now,History:history};
      if(!editing)Object.assign(fields,{'Created By ID':user.id,'Created By':actor});
      return {note:normalizeNote(await request(`${NOTES_TABLE}${editing?'/'+body.id:''}`,editing?'PATCH':'POST',fields))};
    });
    const key=body.id || user.id;pending.set(key,operation);
    try {res.json(await operation);} finally{if(pending.get(key)===operation)pending.delete(key);}
  } catch(error){sendAuthError(res,error);}
}
