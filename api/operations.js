import applications from './_lib/applications.js';
import admissionDocuments from './_lib/admission-documents.js';
import integration from './_lib/integration.js';
import notes from './_lib/notes.js';

export const operationHandlers = Object.freeze({ applications, 'admission-documents': admissionDocuments, integration, notes });
export default async function handler(req, res, env = process.env) {
  const url = new URL(req.url, 'http://internal');
  const route = url.searchParams.get('__route');
  if (!Object.hasOwn(operationHandlers, route)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: 'Unknown API route.' });
  }
  url.searchParams.delete('__route');
  req.url = `/api/${route}${url.search}`;
  return operationHandlers[route](req, res, env);
}
