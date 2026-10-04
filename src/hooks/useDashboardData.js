import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardData, updateProspect, deleteProspect } from '../lib/airtable.js';

export function useDashboardData() {
  // Protected data lives only in this mounted authenticated view.
  const cached = null;

  const [prospects, setProspects] = useState(cached?.prospects ?? []);
  const [schema, setSchema] = useState(cached?.schema ?? null);
  const [status, setStatus] = useState(cached ? 'ready' : 'idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);

  // Fetch fresh protected data after this view mounts.
  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { prospects, schema } = await fetchDashboardData();
      const now = new Date();
      setProspects(prospects);
      setSchema(schema);
      setLastUpdated(now);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Patch fields edited by the popup without changing unrelated values.
  const update = useCallback(
    async (recordId, input) => {
      const patch = await updateProspect(recordId, input);
      setProspects((prev) => {
        const next = prev.map((p) =>
          p.id === recordId
            ? {
                ...p,
                fullName: patch.fullName || p.fullName,
                firstName: patch.firstName,
                lastName: patch.lastName,
                situations: patch.situations,
                admissionStatus: patch.admissionStatus,
                university: patch.approvedUniversity || p.university,
                scholarshipStatus: patch.scholarshipStatus,
                visaStatus: patch.visaStatus,
                visaAppointmentDate: patch.visaAppointmentDate,
                universitalyValidation: patch.universitalyValidation,
                scholarshipFolder: patch.scholarshipFolder,
                scholarshipType: patch.scholarshipType,
                scholarshipSubmissionDate: patch.scholarshipSubmissionDate,
                scholarshipPayment: patch.scholarshipPayment,
                scholarshipDDL: patch.scholarshipDDL,
                regionAuthority: patch.regionAuthority,
                intakeRaw: patch.intakeRaw,
                intakes: patch.intakes,
                dateLead: patch.dateLead,
                dateProspect: patch.dateProspect,
                dateCandidate: patch.dateCandidate,
                dateStudent: patch.dateStudent,
                dateLost: patch.dateLost,
              }
            : p
        );
        return next;
      });
      return patch;
    },
    [schema, lastUpdated]
  );

  const remove = useCallback(
    async (recordId) => {
      await deleteProspect(recordId);
      setProspects((prev) => {
        const next = prev.filter((p) => p.id !== recordId);
        return next;
      });
    },
    [schema, lastUpdated]
  );

  // Merge already-known values into one row (no Airtable call), e.g. the
  // proposal completeness after the proposal popup saved.
  const patchLocal = useCallback(
    (recordId, partial) => {
      setProspects((prev) => {
        const next = prev.map((p) => (p.id === recordId ? { ...p, ...partial } : p));
        return next;
      });
    },
    [schema, lastUpdated]
  );

  return { prospects, schema, status, error, lastUpdated, refresh: load, update, remove, patchLocal };
}
