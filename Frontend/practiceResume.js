/* Where a student was in a practice set, remembered so that leaving Practice without finishing (another tab, a reload,
   closing the browser) and coming back lands on the same question instead of the start. Tested in practiceResume.test.js.

   Only the screen position is kept here, on this device. Whether a question is done is not: that is the saved practice
   progress (the server's, in server mode), which is why a question answered correctly is never asked again. */

const keyFor = (track, userKey) => `bondus_practice_pos_${track}_${userKey ?? "local"}`;

/* `track` is "bac" (the BAC II subjects) or "uni" (the university quizzes); `userKey` is the student's id, so two
   students sharing a browser never open each other's question. Every storage call is guarded: a blocked or full
   localStorage must never stop a student from practising, it only means nothing is remembered. */
export function practiceMemory(storage, track, userKey) {
  const key = keyFor(track, userKey);
  return {
    get() {
      try {
        const value = JSON.parse(storage?.getItem(key) ?? "null");
        return value && typeof value === "object" && typeof value.exId === "string" && typeof value.subject === "string" ? value : null;
      } catch { return null; }
    },
    remember(ex) {
      try { storage?.setItem(key, JSON.stringify({ subject: ex.subject, chapter: ex.chapter ?? null, exId: ex.id })); } catch { /* nothing is remembered */ }
    },
    forget() {
      try { storage?.removeItem(key); } catch { /* nothing to forget */ }
    },
  };
}
