export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const safeName = value => (value || 'document').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+|[. ]+$/g, '').slice(0, 180) || 'document';

// Download the current version of each selected document, not its old versions.
export function selectedDocumentFiles(documents, keys) {
  const selected = new Set(keys), used = new Set(), files = [], missing = [];
  for (const doc of documents.filter(item => selected.has(item.key))) {
    const file = doc.files[0];
    if (!file?.url || !/^https:\/\//i.test(file.url)) { missing.push(doc.name); continue; }
    const group = doc.source === 'Scholarship' ? 'Scholarship' : 'Admission';
    const base = safeName(file.filename || doc.name);
    const dot = base.lastIndexOf('.'), stem = dot > 0 ? base.slice(0, dot) : base, ext = dot > 0 ? base.slice(dot) : '';
    let name = `${group}/${base}`, index = 2;
    while (used.has(name.toLowerCase())) name = `${group}/${stem} (${index++})${ext}`;
    used.add(name.toLowerCase()); files.push({ ...file, name });
  }
  return { files, missing };
}

export async function downloadDocumentZip(documents, keys, studentName, onProgress = () => {}) {
  const { files, missing } = selectedDocumentFiles(documents, keys);
  if (!files.length) throw new Error('The selected documents have no files to download.');
  const { zip } = await import('fflate');
  const entries = Object.create(null); let total = 0;
  for (const [index, file] of files.entries()) {
    onProgress(`Downloading ${index + 1}/${files.length}…`);
    if (total + (file.size || 0) > MAX_ARCHIVE_BYTES) throw new Error('Select fewer documents. The ZIP download is limited to 100 MB.');
    const response = await fetch(file.url, { credentials: 'omit', signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Unable to download ${file.filename || file.name}. Refresh and retry.`);
    if (total + Number(response.headers.get('content-length') || 0) > MAX_ARCHIVE_BYTES) throw new Error('Select fewer documents. The ZIP download is limited to 100 MB.');
    const bytes = new Uint8Array(await response.arrayBuffer()); total += bytes.length;
    if (total > MAX_ARCHIVE_BYTES) throw new Error('Select fewer documents. The ZIP download is limited to 100 MB.');
    entries[file.name] = bytes;
  }
  onProgress('Preparing ZIP…');
  const archive = await new Promise((resolve, reject) => zip(entries, { level: 0 }, (error, bytes) => error ? reject(error) : resolve(bytes)));
  const url = URL.createObjectURL(new Blob([archive], { type: 'application/zip' }));
  const link = document.createElement('a'); link.href = url; link.download = `${safeName(studentName)}-documents.zip`;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  return { count: files.length, missing };
}
