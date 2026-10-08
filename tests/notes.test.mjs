import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/notes.js';
import { NOTES_TABLE, normalizeNote, filterNotes } from '../src/lib/notes.js';
import { TICKET_FIELDS } from '../src/lib/ticketing.js';
const originalFetch=globalThis.fetch;
test.afterEach(()=>{globalThis.fetch=originalFetch;});
const env={AIRTABLE_API_KEY:'test',APP_ORIGIN:'https://dashboard.example',NODE_ENV:'production'};
const action={id:'action-1',text:'Collect passport',assignedTo:'recUser',dueDate:'2026-10-01',done:false,ticketId:''};
const input={title:'Call decision',content:'Send passport and check deadline.',studentId:'recStudent',callDate:'2026-10-01',status:'Open',actions:[action]};
const original={id:'recNote',createdTime:'2026-10-01T10:00:00Z',fields:{Title:input.title,Content:input.content,Student:['recStudent'],'Call Date':input.callDate,Status:'Open',Actions:JSON.stringify([action]),History:'Original history','Updated At':'2026-10-01T10:00:00Z'}};
function req(body={},method='POST'){return{method,url:'/api/notes',headers:{host:'dashboard.example',origin:'https://dashboard.example',cookie:'jeexpert_session='+'ac'.repeat(32)},body:{input,...body}};}
function res(){return{code:200,setHeader(){},status(c){this.code=c;return this;},json(b){this.body=b;}};}
function mock({role='Editor',active=true,ticket=false}={}){
 const writes=[];globalThis.fetch=async(url,init={})=>{let body;const path=String(url);
 if(path.includes('tblJ85bJE0loqwNvU'))body={records:[{id:'recSession',fields:{user:['recUser'],expires_at:new Date(Date.now()+60000).toISOString()}}]};
 else if(path.endsWith('/recUser'))body={id:'recUser',fields:{username:'operator',display_name:'Operator',role,is_active:active}};
 else if(['POST','PATCH'].includes(init.method)){writes.push({path,...JSON.parse(init.body)});body={id:'recNote',fields:{...(init.method==='PATCH'?original.fields:{}),...writes.at(-1).fields}};}
 else if(path.includes('/recStudent'))body={id:'recStudent',fields:{}};
 else if(path.includes('/recNote'))body=original;
 else if(ticket&&path.includes('tblkmA6khmu06nmSb'))body={records:[{id:'recExistingTicket',fields:{}}]};
 else body={records:[original]};
 return{ok:true,json:async()=>body};};return writes;
}
test('View reads notes but cannot create or convert tickets; anonymous denied',async()=>{
 const writes=mock({role:'View'});let response=res();await handler(req({},'GET'),response,env);assert.equal(response.code,200);assert.equal(response.body.notes.length,1);
 response=res();await handler(req(),response,env);assert.equal(response.code,403);assert.equal(writes.length,0);
 const request=req();request.headers.cookie='';response=res();await handler(request,response,env);assert.equal(response.code,401);
});
test('create stamps authenticated author and preserves linked student and action IDs',async()=>{
 const writes=mock();const response=res();await handler(req(),response,env);assert.equal(response.code,200);assert.equal(writes[0].fields['Created By ID'],'recUser');assert.equal(response.body.note.actions[0].id,'action-1');assert.deepEqual(writes[0].fields.Student,['recStudent']);
});
test('edits keep history and reject stale snapshots',async()=>{
 const writes=mock();let response=res();await handler(req({id:'recNote',expected:normalizeNote(original),input:{...input,content:'Changed content'}}),response,env);assert.equal(response.code,200);assert.match(response.body.note.history,/^Original history\n/);
 response=res();await handler(req({id:'recNote',expected:{...normalizeNote(original),content:'stale'}}),response,env);assert.equal(response.code,409);assert.equal(writes.length,1);
});
test('invalid dates, duplicate actions, forged ticket links and incomplete Completed notes refused',async()=>{
 const writes=mock();for(const change of [{callDate:'2026-02-31'},{status:'Completed'},{actions:[action,action]},{actions:[{...action,ticketId:'recForged'}]},{createdBy:'forged'}]){const response=res();await handler(req({input:{...input,...change}}),response,env);assert.equal(response.code,400);}assert.equal(writes.length,0);
});
test('ticket retry recovers existing marked ticket rather than creating duplicate',async()=>{
 const writes=mock({ticket:true});const response=res();await handler(req({id:'recNote',expected:normalizeNote(original),action:'ticket',actionId:'action-1',type:'Support',priority:'Medium'}),response,env);assert.equal(response.code,200);assert.equal(response.body.ticketId,'recExistingTicket');assert.equal(writes.length,1);assert.ok(writes[0].path.includes(NOTES_TABLE));assert.equal(response.body.note.actions[0].ticketId,'recExistingTicket');
});
test('filters match assigned users, text, status and overdue unfinished actions',()=>{
 const note=normalizeNote(original);const filters={query:'passport',status:'Open',studentId:'recStudent',mine:true,overdue:true};assert.equal(filterNotes([note],filters,'recUser','2026-10-08').length,1);assert.equal(filterNotes([{...note,actions:[{...action,done:true}]}],filters,'recUser','2026-10-08').length,0);
});
test('converts a saved action into a ticket with student, assignee, deadline and history',async()=>{
 const writes=mock();const baseFetch=globalThis.fetch;
 globalThis.fetch=async(url,init={})=>{
   const path=String(url);
   if(path.includes('/meta/bases/'))return {ok:true,json:async()=>({tables:[{id:'tblkmA6khmu06nmSb',fields:[{name:TICKET_FIELDS.type,options:{choices:[{name:'Support'}]}},{name:TICKET_FIELDS.priority,options:{choices:[{name:'Medium'}]}}]}]})};
   if(path.includes('tblkmA6khmu06nmSb')){
     if(init.method==='POST'){const payload=JSON.parse(init.body);writes.push({path,...payload});return {ok:true,json:async()=>({id:'recNewTicket',fields:payload.fields})};}
     return {ok:true,json:async()=>({records:[]})};
   }
   return baseFetch(url,init);
 };
 const response=res();await handler(req({id:'recNote',expected:normalizeNote(original),action:'ticket',actionId:'action-1',type:'Support',priority:'Medium'}),response,env);
 assert.equal(response.code,200);assert.equal(response.body.ticketId,'recNewTicket');
 const ticket=writes.find(w=>w.path.endsWith('tblkmA6khmu06nmSb'));
 assert.equal(ticket.fields.Type,'Ticket');assert.equal(ticket.fields[TICKET_FIELDS.assignedTo],'recUser');assert.equal(ticket.fields.DDL,action.dueDate);assert.deepEqual(ticket.fields[TICKET_FIELDS.linkedProspectIds],['recStudent']);assert.equal(response.body.note.actions[0].ticketId,'recNewTicket');assert.equal(writes.length,3);
});
