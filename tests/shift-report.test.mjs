import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildShiftReport,reportRanges,formatReportMinutes} from '../src/lib/shiftReport.js';
import {buildShiftReportPdf} from '../src/lib/shiftReportPdf.js';
const user={id:'recA',displayName:'Amira Test'};
const shift=(patch={})=>({id:'recS',userId:user.id,start:'2026-11-02T08:00:00Z',end:'2026-11-02T16:00:00Z',breakMinutes:60,mode:'Présentiel',status:'Planifié',...patch});
const build=(patch={})=>buildShiftReport({user,start:'2026-11-02',end:'2026-11-02',timeZone:'Africa/Tunis',...patch});
test('report includes the selected person and dates only, excluding cancelled work',()=>{
 const result=build({shifts:[shift(),shift({userId:'recOther'}),shift({status:'Annulé'}),shift({start:'2026-11-03T08:00:00Z',end:'2026-11-03T16:00:00Z'})]});
 assert.equal(result.rows.length,1);assert.equal(result.totals.netMinutes,420);assert.equal(result.totals.breakMinutes,60);assert.equal(result.totals.plannedDays,1);
});
test('overnight shifts split at local midnight and prorate pauses when clipped',()=>{
 const night=shift({start:'2026-11-02T21:00:00Z',end:'2026-11-03T05:00:00Z',breakMinutes:60});
 const result=build({end:'2026-11-03',shifts:[night]});assert.equal(result.rows.length,2);assert.equal(result.rows[0].grossMinutes,120);assert.equal(result.rows[0].breakMinutes,15);assert.equal(result.totals.netMinutes,420);
 const clipped=build({shifts:[night]});assert.equal(clipped.totals.netMinutes,105);assert.equal(clipped.rows.length,1);
});
test('absences and unscheduled days are distinguished; empty periods still export',()=>{
 const result=build({end:'2026-11-03',absences:[{userId:user.id,start:'2026-11-01T23:00:00Z',end:'2026-11-02T23:00:00Z',type:'Congé'}]});
 assert.equal(result.totals.absenceDays,1);assert.deepEqual(result.rows.map(r=>r.kind),['absence','off']);assert.equal(result.totals.netMinutes,0);assert.equal(formatReportMinutes(420),'7 h 00');
});
test('export fetch ranges cover inclusive dates without overlap and respect the API limit',()=>{
 const ranges=reportRanges('2026-01-01','2026-12-31');assert.equal(ranges[0].start,'2026-01-01');assert.equal(ranges.at(-1).end,'2027-01-01');
 ranges.forEach((r,i)=>{assert.ok((Date.parse(r.end)-Date.parse(r.start))/86400000<=62);if(i)assert.equal(ranges[i-1].end,r.start);});assert.throws(()=>reportRanges('2026-11-04','2026-11-02'));assert.throws(()=>reportRanges('2025-01-01','2026-12-31'));
});
test('local day length handles Italian DST; PDF builds with embedded JEEXPERT fonts',async()=>{
 const result=build({start:'2026-10-25',end:'2026-10-25',timeZone:'Europe/Rome',absences:[{userId:user.id,start:'2026-10-24T22:00:00Z',end:'2026-10-25T23:00:00Z',type:'Congé'}]});assert.equal(result.rows[0].grossMinutes,1500);
 const assetLoader=async path=>(await readFile(new URL(`../public${path}`,import.meta.url))).toString('base64');
 const pdf=await buildShiftReportPdf(result,{assetLoader});const raw=Buffer.from(pdf.output('arraybuffer')).toString('latin1');assert.ok(raw.startsWith('%PDF-'));assert.match(raw,/Poppins/);assert.match(raw,/FontFile2/);
});

test('night shift pause rounding reconciles daily lines with totals and clipped reports',()=>{
 const night=shift({start:'2026-11-02T19:00:00Z',end:'2026-11-03T03:00:00Z',breakMinutes:15});
 const report=build({end:'2026-11-03',shifts:[night]});assert.deepEqual(report.rows.map(r=>r.breakMinutes),[8,7]);assert.equal(report.totals.breakMinutes,15);assert.equal(report.rows.reduce((sum,r)=>sum+r.netMinutes,0),465);
 assert.equal(build({shifts:[night]}).rows[0].breakMinutes,8);
});
