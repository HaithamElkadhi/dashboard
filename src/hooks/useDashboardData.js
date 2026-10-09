import { useCallback, useEffect, useState, useRef } from 'react';
import { fetchDashboardData, updateProspect, deleteProspect } from '../lib/airtable.js';
import { fetchContactActivity, mergeContactActivity } from '../lib/contactActivity.js';

export function useDashboardData() {
  // Protected data lives only in this mounted authenticated view.
  const cached = null;

  const [prospects, setProspects] = useState(cached?.prospects ?? []);
  const [schema, setSchema] = useState(cached?.schema ?? null);
  const [status, setStatus] = useState(cached ? 'ready' : 'idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(cached?.lastUpdated ?? null);
  const [activityWarnings, setActivityWarnings] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const generation = useRef(0);
  // Fetch fresh protected data after this view mounts.
  const load = useCallback(async () => {
    const current = ++generation.current;
    setStatus('loading');
    setActivityLoading(true);
    setError(null);
    try {
      const { prospects, schema } = await fetchDashboardData();
      if (current !== generation.current) return;
      const now = new Date();
      setProspects(prospects);
      setSchema(schema);
      setLastUpdated(now);
      setStatus('ready');
      try {
        const activity = await fetchContactActivity();
        if (current !== generation.current) return;
        setProspects(previous => mergeContactActivity(previous, activity.events));
        setActivityWarnings(activity.warnings);
      } catch (err) { if (current === generation.current) setActivityWarnings([err.message]); }
      finally { if (current === generation.current) setActivityLoading(false); }
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setStatus('error');
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { load(); return () => { generation.current++; }; }, [load]);

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

  return { prospects, schema, status, error, lastUpdated, activityWarnings, activityLoading, refresh: load, update, remove, patchLocal };
}
