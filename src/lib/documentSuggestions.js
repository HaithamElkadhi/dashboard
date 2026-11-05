function documentName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\.(pdf|docx?|png|jpe?g|webp)$/i, '')
    .replace(/\(verifier la date d[’']expiration\)/gi, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function availableRequiredDocuments(required, existing, source = 'Academic') {
  const uploaded = new Set(existing.filter(doc => doc.source === source && doc.files?.length).map(doc => documentName(doc.name)));
  return required.filter(doc => !uploaded.has(documentName(doc.name)));
}
