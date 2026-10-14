import studentDocuments from '../student-documents.js';

export default function handler(req, res, env) {
  const url = new URL(req.url, 'http://internal');
  url.searchParams.set('workspace', '1');
  const scopedRequest = Object.assign(Object.create(req), { url: `/api/student-documents?${url.searchParams}` });
  return studentDocuments(scopedRequest, res, env);
}
