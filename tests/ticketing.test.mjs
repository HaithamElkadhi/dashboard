import test from 'node:test';
import assert from 'node:assert/strict';
import { isTicket, selectTickets, ticketStats, ticketOverdue, tunisToday, ticketPatch } from '../src/lib/ticketing.js';
import { normalizeTask } from '../src/lib/airtable.js';
import handler from '../api/ticketing.js';

const base = { id: 'recTicket', recordKind: 'Ticket', status: 'Todo', ddl: '2026-10-03', priority: 'High', assignedTo: '', subject: 'Visa request', description: 'Full student request', linkedProspectIds: ['recStudent'] };
test('ticket selection uses Type, not Task Type; missing status remains open', () => {
  const tasks = [base, { ...base, id: 'ordinary', recordKind: 'Task', type: 'Ticket' }, { ...base, id: 'done', status: 'Done' }, { ...base, id: 'missing', status: '' }];
  assert.deepEqual(selectTickets(tasks, { view: 'open' }, '2026-10-04').map(t => t.id).sort(), ['missing', 'recTicket']);
  assert.equal(isTicket(tasks[1]), false);
  assert.deepEqual(ticketStats(tasks, '2026-10-04'), { open: 2, unassigned: 2, overdue: 2, blocked: 0 });
});
test('Tunis midnight, due today, no date and terminal statuses', () => {
  assert.equal(tunisToday(new Date('2026-10-03T23:00:00Z')), '2026-10-04');
  assert.equal(tunisToday(new Date('2026-10-03T22:59:59Z')), '2026-10-03');
  for (const t of [{ ...base, ddl: '2026-10-04' }, { ...base, ddl: '' }, { ...base, status: 'Done' }, { ...base, status: 'Archived' }]) assert.equal(ticketOverdue(t, '2026-10-04'), false);
  assert.equal(ticketOverdue(base, '2026-10-04'), true);
});
test('normalization preserves full request, subject, links and attachments independently', () => {
  const ticket = normalizeTask({ id:'recTicket', fields:{ Type:'Ticket', Objet:'Subject', Description:'Full request', 'Linked Prospect':['recStudent'], Attachment:[{id:'att1'}] } });
  assert.equal(ticket.name, 'Subject'); assert.equal(ticket.description, 'Full request'); assert.equal(ticket.status, '');
  assert.deepEqual(ticket.linkedProspectIds, ['recStudent']); assert.equal(ticket.attachments.length, 1);
  assert.equal(normalizeTask({id:'recTask',fields:{Description:'Ordinary'}}).name, 'Ordinary');
  assert.deepEqual(ticketPatch(ticket, { ...ticket, assignedTo:'Eya' }), { assignedTo:'Eya' });
});
test('filters and sort are stable across priority, search and dates', () => {
  const next = { ...base, id:'next', ddl:'2026-10-05', assignedTo:'Eya', priority:'Low' };
  assert.deepEqual(selectTickets([next, base], {view:'open'}, '2026-10-04').map(t=>t.id), ['recTicket','next']);
  assert.equal(selectTickets([next,base], {view:'all',assignedTo:'Eya',query:'visa'}, '2026-10-04').length, 1);
});

const env = { AIRTABLE_API_KEY:'test', NODE_ENV:'production', APP_ORIGIN:'https://dashboard.example' };
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const request = (extra = {}) => ({ method:'PATCH', headers:{host:'dashboard.example',origin:'https://dashboard.example',cookie:'jeexpert_session='+'cd'.repeat(32)},body:{recordId:'recTicket',input:{assignedTo:'recEya'}}, ...extra });
const response = () => ({ code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;} });
function mock(kind='Ticket', options={}) {
  const writes=[]; writes.events=[]; writes.deleted=[];
  globalThis.fetch=async(url,init={}) => {
    let body;
    if(String(url).includes('tblJ85bJE0loqwNvU')) body={records:[{id:'recSession',fields:{user:['recUser'],expires_at:new Date(Date.now()+60000).toISOString()}}]};
    else if(String(url).includes('tblYzfwb0CBFXOFsz?')) body={records:[{id:'recEya',fields:{is_active:true,username:'eya',display_name:'Eya',password_hash:'secret'}},{id:'recInactive',fields:{is_active:false,username:'disabled'}}]};
    else if(String(url).endsWith('/recEya')) body={id:'recEya',fields:{is_active:options.inactiveAssignee !== true,username:'eya',display_name:'Eya'}};
    else if(String(url).endsWith('/recUser')) body={id:'recUser',fields:{is_active:true,username:'test'}};
    else if(String(url).includes('tblphgbNKhd5xi0Zk')) {
      if (init.method === 'POST' || init.method === 'PATCH') {
        const data = JSON.parse(init.body); writes.events.push(data);
        if (options.failHistory || (options.failFinalize && init.method === 'PATCH')) return {ok:false,status:503};
        body={id:'recEvent',fields:data.fields};
      } else body={records:[]};
    }
    else if(String(url).includes('/meta/')) body={tables:[{id:'tblkmA6khmu06nmSb',fields:['Assigned To','Task Status','Priority','Task Type'].map((name,i)=>({name,options:{choices:[['Eya','Haitham'],['Todo','Done','Archived'],['Medium','High'],['Visa','Other']][i].map(name=>({name}))}}))}]};
    else if(init.method==='DELETE') { writes.deleted.push(String(url)); body={id:'recTicket',deleted:true}; }
    else if(init.method==='PATCH'||init.method==='POST'){const data=JSON.parse(init.body);writes.push(data);if(options.failTask) return {ok:false,status:400};body={id:'recTicket',fields:data.fields};}
    else body={id:'recTicket',fields:{Type:kind, 'Task Status':'Todo','Assigned To':'Haitham','Assigned User ID':'recHaitham','Assigned User Name':'Haitham (haitham)','Ticket ID':'TSK-1'}};
    return {ok:true,json:async()=>body};
  };
  return writes;
}
test('ticket endpoint refuses anonymous, untrusted origin and ordinary records', async () => {
  const writes=mock(); let res=response();await handler(request({headers:{}}),res,env);assert.equal(res.code,401);
  res=response();await handler(request({headers:{...request().headers,origin:'https://evil.example'}}),res,env);assert.equal(res.code,403);
  mock('Task');res=response();await handler(request(),res,env);assert.equal(res.code,403);assert.equal(writes.length,0);
});
test('ticket PATCH allows only changed writable fields and validates schema choices', async () => {
  const writes=mock();let res=response();await handler(request(),res,env);assert.equal(res.code,200);assert.deepEqual(writes[0],{fields:{'Assigned User ID':'recEya','Assigned User Name':'Eya (eya)'}});
  for(const input of [{assignedTo:'Unknown'},{ticketId:'forged'},{recordKind:'Task'},{ddl:'2026-02-30'}]){res=response();await handler(request({body:{recordId:'recTicket',input}}),res,env);assert.equal(res.code,400);}
  assert.equal(writes.length,1);
});
test('create requires a student and forces Ticket/Todo, preserving object and description', async () => {
  const writes=mock();const input={subject:'Subject',description:'Full request',linkedProspectIds:['recStudent'],type:'Visa',priority:'Medium',status:'Done'};
  let res=response();await handler(request({method:'POST',body:{input}}),res,env);assert.equal(res.code,201);
  assert.equal(writes[0].fields.Type,'Ticket');assert.equal(writes[0].fields['Task Status'],'Todo');assert.equal(writes[0].fields.Objet,'Subject');assert.equal(writes[0].fields.Description,'Full request');
  res=response();await handler(request({method:'POST',body:{input:{...input,linkedProspectIds:[]}}}),res,env);assert.equal(res.code,400);assert.equal(writes.length,1);
});

test('status/assignment history uses authenticated actor, actual previous values and comment', async () => {
  const writes=mock();const res=response();
  await handler(request({body:{recordId:'recTicket', input:{status:'Done',assignedTo:'recEya'},comment:'Called student',actor:'forged',expected:{status:'Todo',assignedTo:'recHaitham'}}}),res,env);
  assert.equal(res.code,200);
  const event=writes.events[0].fields;
  assert.equal(event.Actor,'test (test)');assert.equal(event['Actor User ID'],'recUser');
  assert.equal(event['Previous Status'],'Todo');assert.equal(event['New Status'],'Done');
  assert.equal(event['Previous Assignee'],'Haitham (haitham)');assert.equal(event['New Assignee'],'Eya (eya)');
  assert.equal(event.Comment,'Called student');assert.equal(event.Result,'Pending');
  assert.ok(Number.isFinite(Date.parse(event['Occurred At'])));
  assert.equal(writes.events[1].fields.Result,'Applied');
});
test('comments append as separate rows and do not overwrite Notes or ticket fields', async () => {
  const writes=mock();
  for(const comment of ['First contact','Second contact']) {const res=response();await handler(request({body:{recordId:'recTicket',input:{},comment}}),res,env);assert.equal(res.code,200);}
  assert.equal(writes.length,0);assert.equal(writes.events.length,2);
  assert.deepEqual(writes.events.map(e=>e.fields.Comment),['First contact','Second contact']);
  assert.notEqual(writes.events[0].fields['Event ID'],writes.events[1].fields['Event ID']);
  assert.equal(writes.events[0].fields.Result,'Applied');
});
test('stale ticket changes are refused before history or record mutation', async () => {
  const writes=mock();const res=response();await handler(request({body:{recordId:'recTicket',input:{status:'Done'},expected:{status:'Blocked'}}}),res,env);
  assert.equal(res.code,409);assert.equal(writes.length,0);assert.equal(writes.events.length,0);
});
test('history preparation failure blocks change; failed mutation is marked failed', async () => {
  let writes=mock('Ticket',{failHistory:true});let res=response();await handler(request(),res,env);assert.equal(res.code,503);assert.equal(writes.length,0);
  writes=mock('Ticket',{failTask:true});res=response();await handler(request(),res,env);assert.equal(res.code,503);assert.equal(writes.events.at(-1).fields.Result,'Failed');
});
test('history finalization failure returns confirmed ticket with warning instead of false rollback', async () => {
  const writes=mock('Ticket',{failFinalize:true});const res=response();await handler(request(),res,env);
  assert.equal(res.code,200);assert.equal(writes.length,1);assert.match(res.body.warning,/pending/);
});
test('delete requires confirmation, refuses ordinary tasks and preserves history snapshot', async () => {
  let writes=mock();let res=response();await handler(request({method:'DELETE',body:{recordId:'recTicket'}}),res,env);assert.equal(res.code,400);assert.equal(writes.deleted.length,0);
  res=response();await handler(request({method:'DELETE',body:{recordId:'recTicket',confirmDelete:true}}),res,env);assert.equal(res.code,200);assert.equal(writes.deleted.length,1);
  assert.equal(writes.events[0].fields['Event Type'],'Deleted');assert.equal(writes.events[0].fields['Ticket Record ID'],'recTicket');assert.equal(writes.events[0].fields['Ticket Reference'],'TSK-1');
  assert.equal(writes.events.at(-1).fields.Result,'Applied');
  writes=mock('Task');res=response();await handler(request({method:'DELETE',body:{recordId:'recTicket',confirmDelete:true}}),res,env);assert.equal(res.code,403);assert.equal(writes.deleted.length,0);
});
test('history read rejects formula injection and requires authentication', async () => {
  mock();let res=response();await handler(request({method:'GET',url:'/api/ticketing?recordId=bad%27'}),res,env);assert.equal(res.code,400);
  res=response();await handler(request({method:'GET',url:'/api/ticketing?recordId=recTicket',headers:{}}),res,env);assert.equal(res.code,401);
});

test('platform directory exposes only active users and public assignment fields', async () => {
  mock(); const res=response();
  await handler(request({method:'GET',url:'/api/ticketing?users=1'}),res,env);
  assert.equal(res.code,200);
  assert.deepEqual(res.body,{users:[{id:'recEya',username:'eya',displayName:'Eya'}]});
  const anonymous=response(); await handler(request({method:'GET',url:'/api/ticketing?users=1',headers:{}}),anonymous,env);
  assert.equal(anonymous.code,401);
});
test('assignment rejects inactive users and fixed names, clears identity on unassign', async () => {
  let writes=mock('Ticket',{inactiveAssignee:true}); let res=response();
  await handler(request(),res,env); assert.equal(res.code,400); assert.equal(writes.length,0);
  writes=mock(); res=response(); await handler(request({body:{recordId:'recTicket',input:{assignedTo:'Eya'}}}),res,env);
  assert.equal(res.code,400); assert.equal(writes.length,0);
  res=response(); await handler(request({body:{recordId:'recTicket',input:{assignedTo:''}}}),res,env);
  assert.equal(res.code,200); assert.deepEqual(writes[0].fields,{'Assigned User ID':'','Assigned User Name':''});
  assert.equal(writes.events[0].fields['New Assignee'],'');
});
test('ticket assignment uses stable account IDs while ordinary task assignment remains unchanged', () => {
  const fields={Type:'Ticket','Assigned To':'Haitham','Assigned User ID':'recEya','Assigned User Name':'Eya (eya)'};
  assert.equal(normalizeTask({id:'recTicket',fields}).assignedTo,'recEya');
  assert.equal(normalizeTask({id:'recTask',fields:{...fields,Type:'Task'}}).assignedTo,'Haitham');
  assert.equal(normalizeTask({id:'recLegacy',fields:{Type:'Ticket','Assigned To':'Haitham'}}).assignedTo,'');
});
