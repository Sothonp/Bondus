# Timed exam attempts with a photo of the work (for schools)

Date: 2026-10-24. Status: design approved by the owner in chat. Phase 1 (frontend, browser-only) built and verified in a real browser; phase 2 (backend) not started.

## Goal
Schools want to know how many minutes each student spent on each BAC II exam paper. A student presses **Start** on a paper, does it on real paper, then photographs the answer sheets and submits them in the app. The app records the time; the owner gives schools a report.

## Decisions (owner's answers)
- **School gets the data as a report first**: a spreadsheet (CSV) plus a viewer for the owner/admin. No teacher logins in v1.
- **Students link to a school with a school code** (e.g. `HS-4821`) entered once. Only students who joined with a code appear in that school's report.
- **Timer is continuous**, like a real exam: no pause. An attempt that is never submitted closes by itself after the paper's official duration + 30 minutes and is marked `expired`.
- Photos: up to 10 per attempt, shrunk on the phone (about 400 KB each), private.

## Phase 1 (this build): frontend, works without the backend
Everything runs in the browser (same pattern as the rest of the prototype) so it can be demoed today.
- `Frontend/examSessions.js`: pure rules (clock maths, status, minutes spent, CSV with spreadsheet-formula protection) and a local store with the same shape the server API will have.
- `Frontend/imageUtils.js`: picking a target size and shrinking a photo in the browser.
- `Frontend/useExamSessions.js`: React hook around the store (one running attempt, a ticking clock).
- `Frontend/ExamSessionUi.jsx`: the timer bar, photo submit sheet, result card, join-school card, school report.
- `App.jsx`: a **Start** button on each exam paper card, the timer bar on the paper page, a header chip while an attempt runs, and a **School report** page. English and Khmer strings.
- Browser-only mode keeps data on the device and photos as small thumbnails. The school code `DEMO-001` joins a labelled demo school; the report can load clearly labelled **sample data** for demonstrations.

## Phase 2 (next): backend
- Tables: `schools` (name, code), `users.school_id`, `exam_sessions`, `exam_session_photos`.
- Endpoints under `/api/v1`: start, current, add photo, submit, cancel, history, join/leave school, admin report (CSV + photos). Server clock for start and submit; expiry checked when read.
- Photos in Cloudflare R2 (S3-compatible), private, short-lived links. Admin = phone numbers in an env variable.
- The frontend switches from the local store to the API when `VITE_API_URL` is set.

## Privacy and safety
- The student sees what the school will see (name, grade, time per paper, photos) before joining, and can leave at any time; leaving removes them from the school's report altogether (their own history stays with them).
- Photos are never public. Reports hold name, grade and track, not phone numbers.
- The Khmer consent wording needs a native check. Parental consent for under-18s is for the owner and the schools to settle.

## Not in v1
Teacher logins, pause/resume, automatic marking, zip download of photos.
