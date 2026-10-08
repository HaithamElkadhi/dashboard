import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import handler, { operationHandlers } from '../api/operations.js';
const files = dir => readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.name.startsWith('_') ? [] : entry.isDirectory() ? files(`${dir}/${entry.name}`) : entry.name.endsWith('.js') ? [`${dir}/${entry.name}`] : []);
test('Vercel API remains below the Hobby function limit', () => assert.ok(files('api').length < 12, `${files('api').length} functions; keep below 12`));
test('grouped public routes map to existing handlers', () => {
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  for(const route of Object.keys(operationHandlers))assert.ok(config.rewrites.some(r=>r.source===`/api/${route}` && r.destination===`/api/operations?__route=${route}`));
});
test('dispatcher preserves query/body and enforces existing authentication', async () => {
  for(const route of Object.keys(operationHandlers)){
    const req={method:'GET',url:`/api/operations?__route=${route}&studentId=recStudent`,headers:{},body:{test:true}};
    const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};
    await handler(req,res,{});assert.equal(res.code,401);assert.equal(req.url,`/api/${route}?studentId=recStudent`);assert.deepEqual(req.body,{test:true});
  }
});
test('dispatcher rejects unknown routes', async () => {
  const res={setHeader(){},status(code){this.code=code;return this;},json(){}};
  await handler({url:'/api/operations?__route=constructor'},res,{});assert.equal(res.code,404);
});
