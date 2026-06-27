# EduAI Cambodia — Frontend Prototype

AI-powered learning platform for Cambodian students (Grade 9 / BAC II, university
entrance, language tests). React + Vite + Tailwind v4. Fully self-contained —
no backend, no API keys, no setup beyond installing dependencies.

## Requirements

- Node.js 20.19+ or 22.12+ (check with `node -v`) — get it at https://nodejs.org
- npm (ships with Node)

## Run it locally

```bash
npm install      # first time only
npm run dev      # start the dev server
```

Open the URL it prints (usually http://localhost:5173). You'll start on the
**registration page** — enter a name, pick **Science** or **Social Science**, and
your personalized dashboard is generated.

Other commands:

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Science / Social Science tracks

Registration sets the academic track, which decides every subject shown across the
app (`FIELD_SUBJECTS` in `src/App.jsx`):

- **Science:** Mathematics, Physics, Chemistry, Biology, Khmer Literature, History, English, French
- **Social Science:** Khmer Literature, History, Geography, Morality, Earth Science, Mathematics, English, French

Subject mastery, weak/strong tags, the daily plan, recommended lesson, browse
papers, practice sets, and the study coach all filter to the chosen track. To
extend the curriculum, edit `FIELD_SUBJECTS`, `DEFAULT_MASTERY`, and `TOPICS` at
the top of `src/App.jsx`.

## What's in the prototype

- **Registration** with track selection (Science vs Social Science)
- **Dashboard:** daily plan, grade prediction, streak, XP, level, study hours,
  subject mastery, weak/strong subjects, AI recommendations, recommended lesson,
  weekly & monthly goals, recent activity, and an **AI Learning Analytics** panel
- **Practice:** pick a subject → solve exercises that are auto-corrected with an
  explanation and the formula to use; mark each Pending / In progress / Completed,
  which feeds the dashboard's "today" stats, recent activity, and analytics
- **Browse exams, Universities** (click a school for its published sets & common
  exercises), **Languages, Progress** views
- **Study coach** — a chat that responds based on the student's track, weak spots,
  and goals (scripted demo responses; swap in a real model later)
- Light/dark mode, fully responsive (sidebar collapses to a drawer on mobile)

All data lives in the browser for the session — nothing is sent anywhere.

## Push to your GitHub account

```bash
git init
git add .
git commit -m "EduAI Cambodia frontend prototype"

# create an EMPTY repo on github.com (no README), copy its URL, then:
git remote add origin https://github.com/YOUR_USERNAME/eduai-cambodia.git
git branch -M main
git push -u origin main
```

`node_modules/` and `dist/` are git-ignored, so only source is pushed. On a fresh
clone, anyone runs `npm install` then `npm run dev`.

> Shortcut with the GitHub CLI: `gh repo create eduai-cambodia --public --source=. --push`

## Project layout

```
index.html            Vite entry
vite.config.js        React + Tailwind v4 plugins
src/
  main.jsx            mounts <App/>
  index.css           @import "tailwindcss";
  App.jsx             whole app: register flow, dashboard, coach, all views
```
