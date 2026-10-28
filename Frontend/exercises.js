/* Pure helpers for the Exercises section (rules only: no React, no network; tested in exercises.test.js).

   Exercises are posted by an admin, one subject at a time, with the teacher and school they came from and
   a PDF or photos. Students browse them like the exam papers, by subject instead of year. There are no
   teacher accounts. Science track only for now. */

// Canonical subject names (the same ones FIELD_SUBJECTS uses); subjectId() of each is what the backend files them under.
export const EXERCISE_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology"];

// Files per exercise (config/bondus.php's exercises.max_attachments on the backend -- keep the two in sync).
export const MAX_EXERCISE_ATTACHMENTS = 5;

/* Only science students browse exercises for now; social science has none yet. */
export const canBrowseExercises = (profile) => profile?.field === "science";

/* Whoever the server says has the admin role (profile.role comes from GET /me). */
export const isAdmin = (profile) => profile?.role === "admin";

/* An exercise's files in the server's order, each marked "pdf" or "image". */
export function filesOf(exercise) {
  return (exercise?.attachments ?? []).map((a) => ({
    id: a.id, name: a.name, url: a.url, kind: a.mimeType === "application/pdf" ? "pdf" : "image",
  }));
}

export function fileCounts(exercise) {
  const files = filesOf(exercise);
  return { pdfs: files.filter((f) => f.kind === "pdf").length, images: files.filter((f) => f.kind === "image").length };
}
