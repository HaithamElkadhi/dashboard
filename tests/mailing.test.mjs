import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { mailingSenders } from '../api/_lib/mailing.js';
import { validateMailInput, renderMailText, parseMailCc } from '../src/lib/mailing.js';
import { PF, FIN, TABLES } from '../src/lib/config.js';
import { ONBOARDING_TEMPLATE_ID } from '../src/lib/mailingSystemTemplates.js';
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const input = { subject: 'Bonjour {{firstName}}', body: 'Bonjour {{fullName}}, {{email}}', cc: 'copy@example.com', fromKey: 'default', attachments: [] };
const env = { AIRTABLE_API_KEY:'test', RESEND_API_KEY:'test', RESEND_FROM:'Team <team@example.com>', MAILING_ATTACHMENTS_FIELD:'fldAttachments', NODE_ENV:'production', APP_ORIGIN:'https://dashboard.example' };
function req(body={}, method='POST') { return { method, url:'/api/mailing', headers:{ host:'dashboard.example',origin:'https://dashboard.example',cookie:'jeexpert_session='+'ab'.repeat(32) }, body }; }
function res() { return { code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;} }; }
function mock(role='Editor', missing=false) {
 const calls=[];
 globalThis.fetch=async(url,init={})=>{
  url=String(url);calls.push({url,...init});let body;
  if(url.includes('tblJ85bJE0loqwNvU'))body={records:[{id:'recSession',fields:{user:['recUser'],expires_at:new Date(Date.now()+60000).toISOString()}}]};
  else if(url.endsWith('/recUser'))body={id:'recUser',fields:{username:'operator',role,is_active:true}};
  else if(url.includes('/recStudent'))body={id:'recStudent',fields:{[PF.fullName]:'Ada Lovelace',[PF.name]:'Ada',[PF.email]:'ada@example.com'}};
  else if(url.includes('api.resend.com'))body={id:'provider-id'};
  else if(url.includes('content.airtable.com'))body={};
  else if(url.endsWith('/recTemplate'))body={id:'recTemplate',fields:{Name:'Welcome',Attachments:[{id:'attFile',filename:'guide.txt',size:1,url:'https://v5.airtableusercontent.com/test'}]}};
  else if(url.includes('Mailing%20Templates')&&missing)return{ok:false,status:404,json:async()=>({})};
  else if(init.method==='POST'||init.method==='PATCH')body={id:'recTemplate',fields:JSON.parse(init.body).fields};
  else body={records:[]};
  return{ok:true,json:async()=>body};
 };return calls;
}
test('validates CC, subject and aggregate attachment size',()=>{
 assert.deepEqual(parseMailCc('a@example.com; a@example.com b@example.com'),['a@example.com','b@example.com']);
 for(const patch of [{cc:'bad'}, {subject:'bad\r\nBcc: x'}, {attachments:[{filename:'../a',content:'YQ=='}]}, {attachments:[{filename:'a',content:Buffer.alloc(2*1024*1024+1).toString('base64')}]}])assert.throws(()=>validateMailInput({...input,...patch}));
 assert.equal(renderMailText(input.body,{fullName:'Ada Lovelace',firstName:'Ada',email:'ada@example.com'}),'Bonjour Ada Lovelace, ada@example.com');
 assert.deepEqual(mailingSenders({}),[]);
});
test('sends to stored student address, renders plain text and uses provider idempotency',async()=>{
 const calls=mock(),response=res();await handler(req({action:'send',studentId:'recStudent',toEmail:'attacker@example.com',idempotencyKey:'unique-request-1234',...input}),response,env);
 assert.equal(response.code,200);assert.equal(response.body.success,true);
 const sent=calls.find(call=>call.url.includes('api.resend.com'));const payload=JSON.parse(sent.body);
 assert.deepEqual(payload.to,['ada@example.com']);assert.equal(payload.subject,'Bonjour Ada');assert.equal(payload.text,'Bonjour Ada Lovelace, ada@example.com');assert.equal(payload.html,undefined);assert.equal(sent.headers['Idempotency-Key'],'mailing-recUser-unique-request-1234');
 assert.ok(calls.some(call=>call.method==='POST'&&call.url.includes('tblh1SfFHOgW7gLPK')));
});
test('View cannot send, missing sender cannot send, missing templates table warns',async()=>{
 let calls=mock('View'),response=res();await handler(req({action:'send',studentId:'recStudent',idempotencyKey:'unique-request-1234',...input}),response,env);assert.equal(response.code,403);assert.ok(!calls.some(call=>call.url.includes('resend.com')));
 calls=mock();response=res();await handler(req({action:'send',studentId:'recStudent',idempotencyKey:'unique-request-1234',...input,fromKey:'contact'}),response,env);assert.equal(response.code,400);assert.ok(!calls.some(call=>call.url.includes('resend.com')));
 mock('Editor',true);response=res();await handler(req({},'GET'),response,env);assert.equal(response.code,200);assert.ok(response.body.templates.some(template=>template.id===ONBOARDING_TEMPLATE_ID));assert.ok(response.body.warning);assert.equal(response.body.senders.length,1);
});
test('template save preserves attachment contents and rejects malformed IDs',async()=>{
 const calls=mock(),response=res();await handler(req({action:'save-template',input:{...input,name:'Welcome',attachments:[{filename:'guide.txt',content:'YQ=='}]}}),response,env);assert.equal(response.code,200);assert.deepEqual(response.body.template.attachments[0],{id:'attFile',filename:'guide.txt',size:1,templateId:'recTemplate'});assert.equal(JSON.parse(calls.find(call=>call.url.includes('content.airtable.com')).body).file,'YQ==');
 const bad=res();await handler(req({action:'save-template',id:'bad',input:{...input,name:'Welcome'}}),bad,env);assert.equal(bad.code,400);assert.equal(calls.filter(call=>call.method==='POST').length,2);
});
test('stored files resolve server-side, hide URLs, and reject untrusted attachment hosts',async()=>{
 const calls=mock();const base=globalThis.fetch;
 globalThis.fetch=async(url,init)=>String(url).startsWith('https://v5.airtableusercontent.com/') ? new Response('a',{status:200}) : base(url,init);
 const response=res();await handler(req({action:'send',studentId:'recStudent',idempotencyKey:'stored-file-send-123',...input,attachments:[{id:'attFile',filename:'guide.txt',templateId:'recTemplate'}]}),response,env);
 assert.equal(response.code,200);assert.equal(JSON.parse(calls.find(call=>call.url.includes('api.resend.com')).body).attachments[0].content,'YQ==');
 mock();const normal=globalThis.fetch;
 globalThis.fetch=async(url,init)=>String(url).endsWith('/recTemplate') ? {ok:true,json:async()=>({id:'recTemplate',fields:{Attachments:[{id:'attFile',filename:'guide.txt',size:1,url:'https://localhost/private'}]}})} : normal(url,init);
 const rejected=res();await handler(req({action:'send',studentId:'recStudent',idempotencyKey:'stored-file-send-123',...input,attachments:[{id:'attFile',filename:'guide.txt',templateId:'recTemplate'}]}),rejected,env);assert.equal(rejected.code,400);
});
test('partial upload reports stable saved template ID',async()=>{
 mock();const normal=globalThis.fetch;globalThis.fetch=async(url,init)=>String(url).includes('content.airtable.com')?{ok:false,status:503}:normal(url,init);
 const response=res();await handler(req({action:'save-template',input:{...input,name:'Welcome',attachments:[{filename:'guide.txt',content:'YQ=='}]}}),response,env);
 assert.equal(response.code,503);assert.equal(response.body.partial,true);assert.equal(response.body.templateId,'recTemplate');
});
test('system onboarding renders canonical escaped HTML and inline logo using stored identity',async()=>{
 const calls=mock();const normal=globalThis.fetch;
 globalThis.fetch=async(url,init)=>String(url).includes('/recStudent')?{ok:true,json:async()=>({id:'recStudent',fields:{[PF.fullName]:'Ada <script>alert(1)</script>',[PF.name]:'Ada <b>',[PF.surname]:'<script>',[PF.email]:'ada@example.com'}})}:normal(url,init);
 const response=res();await handler(req({...input,action:'send',studentId:'recStudent',systemTemplateId:ONBOARDING_TEMPLATE_ID,variables:{formule:'Premium <img src=x>',date_echeance:'2026-10-30',montant_a_payer:'1200'},idempotencyKey:'system-request-1234',body:'Injected client body',subject:'Injected subject'}),response,env);
 assert.equal(response.code,200);const payload=JSON.parse(calls.find(call=>call.url.includes('api.resend.com')).body);
 assert.ok(payload.html);assert.ok(payload.text);assert.ok(!payload.html.includes('<script>'));assert.ok(!payload.html.includes('<img src=x>'));assert.ok(!payload.html.includes('Injected client body'));assert.equal(payload.subject,'Injected subject');
 assert.ok(payload.html.includes('cid:jeexpert-logo'));assert.ok(payload.attachments.some(file=>file.content_id==='jeexpert-logo'&&file.content_type==='image/png'));
});
test('system unknown ID, absent variables and immutable model save are rejected before sending',async()=>{
 const calls=mock();
 for(const patch of [{action:'send',systemTemplateId:'system-unknown'},{action:'send',systemTemplateId:ONBOARDING_TEMPLATE_ID,variables:{}},{action:'save-template',id:ONBOARDING_TEMPLATE_ID,input:{...input,name:'Overwrite'}}]) {
  const response=res();await handler(req({...input,studentId:'recStudent',idempotencyKey:'system-request-1234',...patch}),response,env);assert.equal(response.code,400);
 }
 assert.ok(!calls.some(call=>call.url.includes('api.resend.com')));
});
test('payment context includes only linked unpaid TND payments and fails closed on ownership mismatch',async()=>{
 mock();const normal=globalThis.fetch;
 const records=[{id:'recPayOne',fields:{[FIN.prospects]:['recStudent'],[FIN.currency]:'TND',[FIN.status]:'À payer',[FIN.amount]:'1200',[FIN.dueDate]:'2026-10-30'}},{id:'recPayTwo',fields:{[FIN.prospects]:['recStudent'],[FIN.currency]:'EUR',[FIN.status]:'À payer',[FIN.amount]:'300'}}];
 let mismatch=false;
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/recStudent'))return{ok:true,json:async()=>({id:'recStudent',fields:{[PF.fullName]:'Ada Lovelace',[PF.email]:'ada@example.com',[PF.paiementsLink]:['recPayOne','recPayTwo']}})};
  if(String(url).includes(TABLES.paiements))return{ok:true,json:async()=>({records:mismatch?[{...records[0],fields:{...records[0].fields,[FIN.prospects]:['recOther']}},records[1]]:records})};
  return normal(url,init);
 };
 let request=req({},'GET');request.url+='?studentId=recStudent';let response=res();await handler(request,response,env);assert.equal(response.code,200);assert.equal(response.body.student.id,'recStudent');assert.equal(response.body.payments.length,1);assert.equal(response.body.payments[0].amount,'1200');assert.equal(response.body.contextWarning,undefined);
 mismatch=true;response=res();await handler(request,response,env);assert.deepEqual(response.body.payments,[]);assert.ok(response.body.contextWarning);
});
