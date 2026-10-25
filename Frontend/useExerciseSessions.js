/* React side of one exercise attempt: fetches the student's own current submission for a given
   exercise, ticks a clock while it is running, and wraps the attempt-lifecycle API calls so each one
   updates local state from the server's own answer. Unlike useExamSessions.js (a synchronous local
   store) every action here is a network call, so this hook also tracks loading/error. */
import { useCallback, useEffect, useRef, useState } from "react";

export function useExerciseSessions({ api, exerciseId }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    if (!api?.enabled || !exerciseId) { setLoading(false); return null; }
    try {
      const res = await api.getExerciseAttempt(exerciseId);
      if (mountedRef.current) { setSubmission(res.submission); setError(null); }
      return res.submission;
    } catch (e) {
      if (mountedRef.current) setError(e);
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [api, exerciseId]);

  useEffect(() => { setLoading(true); refresh(); }, [refresh]);

  // Tick once a second while the attempt is actually running, same as useExamSessions.js.
  const running = submission?.status === "running";
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(async () => {
    const res = await api.startExerciseAttempt(exerciseId);
    if (mountedRef.current) setSubmission(res.submission);
    return res;
  }, [api, exerciseId]);

  const submit = useCallback(async () => {
    const res = await api.submitExerciseAttempt(exerciseId);
    if (mountedRef.current) setSubmission(res.submission);
    return res;
  }, [api, exerciseId]);

  const cancel = useCallback(async () => {
    const res = await api.cancelExerciseAttempt(exerciseId);
    if (mountedRef.current) setSubmission(res.submission);
    return res;
  }, [api, exerciseId]);

  // A photo upload only returns the one new photo, not the whole submission, so re-fetch it.
  const addPhoto = useCallback(async (file) => {
    const res = await api.uploadExercisePhoto(exerciseId, file);
    await refresh();
    return res;
  }, [api, exerciseId, refresh]);

  const removePhoto = useCallback(async (photoId) => {
    const res = await api.removeExercisePhoto(exerciseId, photoId);
    await refresh();
    return res;
  }, [api, exerciseId, refresh]);

  return { now, submission, loading, error, refresh, start, submit, cancel, addPhoto, removePhoto };
}
