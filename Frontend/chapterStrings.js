/* Words for the chapter path (the locked chapter list and the "why is this locked" sheet), English and Khmer. Kept apart
   from App.jsx's STRINGS, like WARMUP_STRINGS and CHEER_STRINGS, so this part is one self-contained piece. Placeholders in
   braces ({name}, {pct}, {n}, {solved}, {total}, {pass}, {master}) are filled in by fillChapter().
   The Khmer lines are first drafts: they should be read by a native speaker before students see them. */
export const CHAPTER_STRINGS = {
  en: {
    stateLocked: "Locked",
    stateAvailable: "Start",
    stateInProgress: "In progress",
    statePassed: "Passed",
    stateMastered: "Grade A",
    pathSummary: "{n} of {total} chapters passed",
    pathNote: "Solve {pass}% of a chapter to open the next one. Reach {master}% for Grade A.",
    rowExercises: "{total} exercises",
    rowSolved: "{solved} of {total} solved",
    rowToPass: "{n} more to pass",
    rowToMaster: "Reach {master}% for Grade A",
    rowLocked: "Solve {pass}% of {name} to open",
    rowLockedMore: "{n} more to go",
    rowLockedDeeper: "Finish the chapters before it first",
    sheetTitle: "This chapter is locked",
    sheetBody: "Solve {pass}% of {name} to open it. You have solved {solved} of {total}, so {n} more to go.",
    sheetBodyDeeper: "Chapters open one at a time. Solve {pass}% of {name} first, then keep going in order.",
    sheetGo: "Go to {name}",
    sheetClose: "Not now",
  },
  km: {
    stateLocked: "ជាប់សោ",
    stateAvailable: "ចាប់ផ្តើម",
    stateInProgress: "កំពុងធ្វើ",
    statePassed: "ជាប់",
    stateMastered: "ពិន្ទុ A",
    pathSummary: "ជាប់ {n} ក្នុងចំណោម {total} ជំពូក",
    pathNote: "ដោះស្រាយ {pass}% នៃជំពូកមួយ ដើម្បីបើកជំពូកបន្ទាប់។ ឈានដល់ {master}% ដើម្បីបានពិន្ទុ A។",
    rowExercises: "{total} លំហាត់",
    rowSolved: "ដោះស្រាយបាន {solved} ក្នុងចំណោម {total}",
    rowToPass: "នៅសល់ {n} ទៀតដើម្បីជាប់",
    rowToMaster: "ឈានដល់ {master}% ដើម្បីបានពិន្ទុ A",
    rowLocked: "ដោះស្រាយ {pass}% នៃ {name} ដើម្បីបើក",
    rowLockedMore: "នៅសល់ {n} ទៀត",
    rowLockedDeeper: "បញ្ចប់ជំពូកមុនវាជាមុនសិន",
    sheetTitle: "ជំពូកនេះជាប់សោ",
    sheetBody: "ដោះស្រាយ {pass}% នៃ {name} ដើម្បីបើកជំពូកនេះ។ អ្នកបានដោះស្រាយ {solved} ក្នុងចំណោម {total} ដូច្នេះនៅសល់ {n} ទៀត។",
    sheetBodyDeeper: "ជំពូកបើកម្តងមួយៗ។ ដោះស្រាយ {pass}% នៃ {name} ជាមុនសិន បន្ទាប់មកបន្តតាមលំដាប់។",
    sheetGo: "ទៅកាន់ {name}",
    sheetClose: "មិនទាន់ទេ",
  },
};

export const chapterText = (lang, key) => (CHAPTER_STRINGS[lang] ?? CHAPTER_STRINGS.en)[key] ?? CHAPTER_STRINGS.en[key] ?? key;
export const fillChapter = (text, vars = {}) => Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), text);
