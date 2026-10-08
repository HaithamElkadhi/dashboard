import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedDocumentFiles, downloadDocumentZip } from '../src/lib/documentDownload.js';
import { unzipSync, strFromU8 } from 'fflate';
test('ZIP includes only selected latest versions and preserves duplicate filenames', () => {
  const docs = [{key:'a',source:'Academic',files:[{filename:'passport.pdf',url:'https://example.com/current'},{filename:'old.pdf',url:'https://example.com/old'}]}, {key:'b',source:'Academic',files:[{filename:'passport.pdf',url:'https://example.com/second'}]}, {key:'c',source:'Scholarship',files:[{filename:'bank.pdf',url:'https://example.com/bank'}]}];
  const {files} = selectedDocumentFiles(docs,['a','b']);
  assert.deepEqual(files.map(f=>f.name), ['Admission/passport.pdf','Admission/passport (2).pdf']);
  assert.deepEqual(files.map(f=>f.url), ['https://example.com/current','https://example.com/second']);
});
test('downloads files and produces a readable ZIP with original contents', async () => {
  const originalFetch=globalThis.fetch, originalDocument=globalThis.document, originalCreate=URL.createObjectURL, originalRevoke=URL.revokeObjectURL, originalTimeout=globalThis.setTimeout;
  let archive, clicked=false;
  globalThis.fetch=async()=>new Response('file contents');
  globalThis.document={createElement:()=>({click(){clicked=true;},remove(){}}),body:{appendChild(){}}};
  URL.createObjectURL=blob=>{archive=blob;return 'blob:test';}; URL.revokeObjectURL=()=>{};
  globalThis.setTimeout=(callback)=>{callback();return 0;};
  try {
    const result=await downloadDocumentZip([{key:'a',source:'Academic',files:[{filename:'passport.pdf',url:'https://example.com/file'}]}],['a'],'Student');
    assert.equal(result.count,1);assert.equal(clicked,true);
    const entries=unzipSync(new Uint8Array(await archive.arrayBuffer()));
    assert.equal(strFromU8(entries['Admission/passport.pdf']),'file contents');
  } finally {globalThis.fetch=originalFetch;globalThis.document=originalDocument;URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;globalThis.setTimeout=originalTimeout;}
});
test('ZIP names are safe and missing files are reported', () => {
  const result = selectedDocumentFiles([{key:'a',source:'Scholarship',files:[{filename:'../bank\\balance.pdf',url:'https://example.com/file'}]},{key:'b',name:'Requested passport',files:[]}],['a','b']);
  assert.equal(result.files[0].name,'Scholarship/_bank_balance.pdf');
  assert.deepEqual(result.missing,['Requested passport']);
});
