import test from 'node:test';

import assert from 'node:assert/strict';

import handler from '../api/_lib/recruitment.js';

import { RF, normalizeCandidate, whatsappUrl, appendRecruitmentContact } from '../src/lib/recruitment.js';

const original=globalThis.fetch;

test.afterEach(()=>{globalThis.fetch=original;});

const env={AIRTABLE_API_KEY:'test',NODE_ENV:'production',APP_ORIGIN:'https://dashboard.example'};

const req=(body,method=body?'POST':'GET',query='')=>({method,url:'/api/recruitment'+query,headers:{host:'dashboard.example',origin:'https://dashboard.example',cookie:'jeexpert_session='+'ab'.repeat(32)},body});

const res=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(value){this.body=value;},end(value){this.bytes=value;}});

function mock(role='Admin',cvUrl='https://v5.airtableusercontent.com/cv'){

 const calls=[];const record={id:'recCandidate',fields:{[RF.name]:'Test Candidate',[RF.note]:'Existing note',[RF.decision]:'STUDENT',[RF.cv]:[{id:'attCv',filename:'test.pdf',url:cvUrl}]}};

 globalThis.fetch=async(url,init={})=>{

  url=String(url);calls.push({url,...init});let body;

  if(url.includes('tblJ85bJE0loqwNvU'))body={records:[{id:'recSession',fields:{user:['recUser'],expires_at:new Date(Date.now()+60000).toISOString()}}]};

  else if(url.endsWith('/recUser'))body={id:'recUser',fields:{username:'admin',role,is_active:true}};

  else if(url.startsWith('https://v5.airtableusercontent.com'))return {ok:true,body:(async function*(){yield Buffer.from('%PDF-test');})()};

  else if(url.includes('/recCandidate'))body=init.method==='PATCH'?{...record,fields:{...record.fields,...JSON.parse(init.body).fields}}:record;

  else body={records:[record]};

  return {ok:true,json:async()=>body};

 };return calls;

}

test('recruitment is admin only, including downloads',async()=>{

 for(const role of ['Editor','View']){const calls=mock(role),response=res();await handler(req(undefined,'GET','?id=recCandidate&fileId=attCv'),response,env);assert.equal(response.code,403);assert.ok(!calls.some(c=>c.url.includes('tblnud4')));}

});

test('list hides attachment URLs and notes/decision save to exact field IDs',async()=>{

 const calls=mock();let response=res();await handler(req(),response,env);assert.equal(response.body.candidates[0].name,'Test Candidate');assert.equal(response.body.candidates[0].cv[0].url,undefined);

 response=res();await handler(req({id:'recCandidate',note:'Interview ready',decision:'INTERVIEW',expected:{note:'Existing note',decision:'STUDENT'}}),response,env);

 assert.equal(response.body.candidate.note,'Existing note');assert.equal(response.body.candidate.decision,'INTERVIEW');assert.deepEqual(JSON.parse(calls.find(c=>c.method==='PATCH').body).fields,{[RF.decision]:'INTERVIEW'});

});

test('stale updates and unknown decisions do not write',async()=>{

 const calls=mock();for(const body of [{id:'recCandidate',note:'New',decision:'ACCEPTED',expected:{note:'Old',decision:'INTERVIEW'}},{id:'recCandidate',note:'New',decision:'Hired'}]){const response=res();await handler(req(body),response,env);assert.ok([400,409].includes(response.code));}assert.ok(!calls.some(c=>c.method==='PATCH'));

});

test('CV streams only the candidate attachment and rejects foreign hosts',async()=>{

 mock();let response=res();await handler(req(undefined,'GET','?id=recCandidate&fileId=attCv'),response,env);assert.equal(response.headers['Content-Type'],'application/pdf');assert.equal(response.bytes.toString(),'%PDF-test');

 mock('Admin','https://evil.example/file');response=res();await handler(req(undefined,'GET','?id=recCandidate&fileId=attCv'),response,env);assert.equal(response.code,400);

 mock();response=res();await handler(req(undefined,'GET','?id=recCandidate&fileId=attOther'),response,env);assert.equal(response.code,404);

});

test('WhatsApp handles Tunisian and international numbers; missing values stay empty',()=>{

 assert.equal(whatsappUrl('50 511 915'),'https://wa.me/21650511915');assert.equal(whatsappUrl('0039 352 088 0880'),'https://wa.me/393520880880');assert.equal(whatsappUrl(''), '');assert.equal(normalizeCandidate({id:'recEmpty',fields:{}}).note,'');

});



test('phone corrections validate the number and check the original value before saving',async()=>{

 const calls=mock();let response=res();

 await handler(req({id:'recCandidate',note:'Existing note',decision:'STUDENT',phone:'+216 50 123 456',expected:{note:'Existing note',decision:'STUDENT',phone:''}}),response,env);

 assert.equal(response.code,200);assert.equal(JSON.parse(calls.find(c=>c.method==='PATCH').body).fields[RF.phone],'+216 50 123 456');

 for(const [phone,expectedPhone,code] of [['bad','',400],['+216 50 123 456','stale',409]]){response=res();await handler(req({id:'recCandidate',note:'Existing note',decision:'STUDENT',phone,expected:{note:'Existing note',decision:'STUDENT',phone:expectedPhone}}),response,env);assert.equal(response.code,code);}

});


test('contacts append in date order, preserve history and reject stale or invalid input',()=>{
 const current={lastContact:'2026-10-20',contactHistory:'20/10/2026 — Appel initial'};
 const values=appendRecruitmentContact(current,{date:'2026-10-18',reason:'WhatsApp\nRelance',expectedHistory:current.contactHistory},'2026-10-20');
 assert.equal(values.lastContact,'2026-10-20');assert.equal(values.contactHistory,'20/10/2026 — Appel initial\n18/10/2026 — WhatsApp Relance');
 for(const patch of [{date:'2026-10-21'},{date:'2026-02-30'},{reason:' '},{expectedHistory:'stale'}])assert.throws(()=>appendRecruitmentContact(current,{date:'2026-10-20',reason:'Appel',expectedHistory:current.contactHistory,...patch},'2026-10-20'));
});
test('contact endpoint writes only contact fields and rejects stale append',async()=>{
 const calls=mock();let response=res();
 await handler(req({action:'add-contact',id:'recCandidate',date:'2026-01-01',reason:'Appel de recrutement',expectedHistory:''}),response,env);
 assert.equal(response.code,200);assert.deepEqual(JSON.parse(calls.find(c=>c.method==='PATCH').body).fields,{[RF.lastContact]:'2026-01-01',[RF.contactHistory]:'01/01/2026 — Appel de recrutement'});
 response=res();await handler(req({action:'add-contact',id:'recCandidate',date:'2026-01-01',reason:'Appel',expectedHistory:'stale'}),response,env);assert.equal(response.code,409);
});

test('all five decisions persist independently of hidden notes; typecast enables new Airtable choices',async()=>{
 for(const decision of ['STUDENT','INTERVIEW','ACCEPTED','REJECTED','RECRUITED']){
 const calls=mock(),response=res();await handler(req({id:'recCandidate',decision,expected:{decision:'STUDENT'}}),response,env);
 assert.equal(response.code,200,JSON.stringify(response.body));assert.equal(response.body.candidate.decision,decision);
 const payload=JSON.parse(calls.find(c=>c.method==='PATCH').body);assert.deepEqual(payload.fields,{[RF.decision]:decision});assert.equal(payload.typecast,true);
 }
 assert.equal(normalizeCandidate({id:'recLegacy',fields:{[RF.decision]:'Retenue'}}).decision,'ACCEPTED');
});

test('sparse or name-keyed PATCH responses never erase the candidate profile, CV or history',async()=>{
 for(const responseFields of [{}, {'Statut candidature':'INTERVIEW'}]){
  const calls=mock();const baseline=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>init.method==='PATCH'?{ok:true,json:async()=>({id:'recCandidate',fields:responseFields})}:baseline(url,init);
  for(const body of [{id:'recCandidate',decision:'INTERVIEW',expected:{decision:'STUDENT'}},{id:'recCandidate',phone:'+216 50 123 456',expected:{phone:''}},{action:'add-contact',id:'recCandidate',date:'2026-01-01',reason:'Appel',expectedHistory:''}]){
   const response=res();await handler(req(body),response,env);assert.equal(response.code,200);const candidate=response.body.candidate;
   assert.equal(candidate.name,'Test Candidate');assert.equal(candidate.note,'Existing note');assert.equal(candidate.cv[0].id,'attCv');
   if(body.decision)assert.equal(candidate.decision,'INTERVIEW');
   if(body.phone)assert.equal(candidate.phone,body.phone);
   if(body.action)assert.equal(candidate.lastContact,'2026-01-01');
  }
 }
});

test('new and unreviewed candidatures default to NOT VIEWED without changing existing decisions',()=>{
 assert.equal(normalizeCandidate({id:'recNew',fields:{}}).decision,'NOT VIEWED');
 assert.equal(normalizeCandidate({id:'recLegacy',fields:{[RF.decision]:'À examiner'}}).decision,'NOT VIEWED');
 assert.equal(normalizeCandidate({id:'recExisting',fields:{[RF.decision]:'STUDENT'}}).decision,'STUDENT');
});
