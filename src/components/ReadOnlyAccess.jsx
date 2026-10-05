import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { installReadOnlyControls } from '../lib/readOnlyControls.js';

export default function ReadOnlyAccess() {
  const { readOnly } = useAuth();
  useEffect(() => {
    if (readOnly) return installReadOnlyControls(document);
  }, [readOnly]);
  return readOnly ? <div role="status" className="border-b border-border bg-blue-50 px-4 py-2 text-sm text-navy">View access · Read only</div> : null;
}