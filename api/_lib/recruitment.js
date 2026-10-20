import { requireAdmin, checkOrigin, authError, sendAuthError } from './auth.js';

import { RECRUITMENT_BASE, RECRUITMENT_TABLE, RF, DECISIONS, normalizeCandidate, whatsappUrl, appendRecruitmentContact } from '../../src/lib/recruitment.js';

const validId=value=>/^rec[A-Za-z0-9]+$/.test(value || '');

export default async function handler(req,res,env=process.env) {

 res.setHeader('Cache-Control','no-store');

 try {

  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});

  await requireAdmin(req,env);

  const request=async(path,method='GET',fields)=>{

   const response=await fetch(`https://api.airtable.com/v0/${RECRUITMENT_BASE}/${RECRUITMENT_TABLE}${path}`,{method,headers:{Authorization:`Bearer ${env.AIRTABLE_API_KEY}`,'Content-Type':'application/json'},...(fields?{body:JSON.stringify({fields,typecast:true,returnFieldsByFieldId:true})}:{}),signal:AbortSignal.timeout(20000)});

   if(!response.ok)throw authError(503,'Recrutement indisponible. Actualisez pour vérifier les données avant de réessayer.');

   return response.json();

  };

  const url=new URL(req.url,'http://internal');

  if(req.method==='GET') {

   if(url.searchParams.has('fileId')) {

    const candidateId=url.searchParams.get('id'),fileId=url.searchParams.get('fileId');

    if(!validId(candidateId)||!/^att[A-Za-z0-9]+$/.test(fileId || ''))throw authError(400,'CV invalide.');

    const record=await request(`/${candidateId}?returnFieldsByFieldId=true`);

    const file=record.fields?.[RF.cv]?.find(f=>f.id===fileId);

    if(!file)throw authError(404,'CV introuvable.');

    const remote=new URL(file.url);

    if(remote.protocol!=='https:' || remote.username || remote.password || !/^(?:[a-z0-9-]+\.)*(?:airtableusercontent\.com|dl\.airtable\.com)$/.test(remote.hostname))throw authError(400,'Adresse CV invalide.');

    const response=await fetch(remote,{redirect:'error',signal:AbortSignal.timeout(20000)});

    if(!response.ok)throw authError(503,'Téléchargement du CV impossible.');

    const chunks=[];let size=0;

    for await(const chunk of response.body){size+=chunk.length;if(size>6*1024*1024)throw authError(413,'CV trop volumineux.');chunks.push(Buffer.from(chunk));}

    const content=Buffer.concat(chunks),pdf=content.subarray(0,5).toString()==='%PDF-';

    res.setHeader('Content-Type',pdf?'application/pdf':'application/octet-stream');

    res.setHeader('X-Content-Type-Options','nosniff');

    res.setHeader('Content-Disposition',`${pdf && url.searchParams.get('download')!=='1'?'inline':'attachment'}; filename="CV"; filename*=UTF-8''${encodeURIComponent(file.filename || 'CV')}`);

    return res.end(content);

   }

   const records=[];let offset;

   do { const params=new URLSearchParams({returnFieldsByFieldId:'true',pageSize:'100'});if(offset)params.set('offset',offset);const page=await request(`?${params}`);records.push(...page.records);offset=page.offset;}while(offset);

   return res.json({candidates:records.map(normalizeCandidate).sort((a,b)=>String(b.received).localeCompare(String(a.received)))});

  }

  checkOrigin(req,env);

  const body=req.body || {};
  if(body.action==='add-contact') {
   if(Object.keys(body).some(k=>!['action','id','date','reason','expectedHistory'].includes(k)) || !validId(body.id))throw authError(400,'Contact invalide.');
   const current=normalizeCandidate(await request(`/${body.id}?returnFieldsByFieldId=true`));
   let values;try{values=appendRecruitmentContact(current,body);}catch(e){throw authError(e.status || 400,e.message);}
   await request(`/${body.id}?returnFieldsByFieldId=true`,'PATCH',{[RF.lastContact]:values.lastContact,[RF.contactHistory]:values.contactHistory});
   return res.json({candidate:{...current,...values}});
  }


  if(Object.keys(body).some(k=>!['id','note','decision','expected','phone'].includes(k)) || !validId(body.id) || body.decision!==undefined && !DECISIONS.includes(body.decision) || body.phone===undefined && body.decision===undefined)throw authError(400,'Décision invalide.');
  if(body.phone!==undefined && (typeof body.phone!=='string' || body.phone.length>50 || !whatsappUrl(body.phone)))throw authError(400,'Numéro WhatsApp invalide.');
  const current=normalizeCandidate(await request(`/${body.id}?returnFieldsByFieldId=true`));
  if(!body.expected || body.decision!==undefined && current.decision!==body.expected.decision || body.phone!==undefined && current.phone!==body.expected.phone)throw authError(409,'Cette candidature a changé. Actualisez avant de modifier.');
  const fields={...(body.decision!==undefined?{[RF.decision]:body.decision}:{}),...(body.phone!==undefined?{[RF.phone]:body.phone}:{})};
  await request(`/${body.id}?returnFieldsByFieldId=true`,'PATCH',fields);
  return res.json({candidate:{...current,...(body.decision!==undefined?{decision:body.decision}:{}),...(body.phone!==undefined?{phone:body.phone}:{})}});

 }catch(error){sendAuthError(res,error);}

}

