/* Guards on how "come back to the question you were on" is wired into App.jsx (read as text: the app has no DOM test
   harness). The behaviour itself is covered in practiceResume.test.js and practiceFlow.test.js.
   Run with:  node --test Frontend/practiceResumeWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const count = (re) => (app.match(re) || []).length;

test("App.jsx uses the resume helpers", () => {
  assert.match(app, /import \{ practiceMemory \} from "\.\/practiceResume\.js";/);
  assert.match(app, /import \{ setIndexes, nextInSet, nextSetStart, firstOpen \} from "\.\/practiceFlow\.js";/);
});

test("the question on screen is remembered when shown, and forgotten only once the whole set is finished", () => {
  assert.match(app, /function useSetSession\(list, progress, memory = null\)/);
  assert.match(app, /const show = \(i\) => \{ memory\?\.remember\(list\[i\]\); setIdx\(i\);/);
  assert.match(app, /if \(upNext == null\) \{ memory\?\.forget\(\); setFinished\(\{ from: idx \}\); setIdx\(null\); return; \}/);
});

test("going back to the list (the breadcrumb on the question screen) is plain navigation: it does not forget the remembered position", () => {
  assert.match(app, /exit: \(\) => \{ setIdx\(null\); \},/);
  assert.doesNotMatch(app, /exit: \(\) => \{ memory\?\.forget\(\); setIdx\(null\); \},/);
});

test("coming back opens the remembered question: the session, the chapter and the subject all start from it", () => {
  // The question is looked up in the list the screen is showing, so a stale or foreign id simply finds nothing.
  assert.match(app, /const \[idx, setIdx\] = useState\(\(\) => \{ const at = memory \? list\.findIndex\(\(e\) => e\.id === memory\.get\(\)\?\.exId\) : -1; return at >= 0 \? at : null; \}\);/);
  assert.match(app, /const \[subject, setSubject\] = useState\(\(\) => \{ const s = memory\.get\(\)\?\.subject; return fieldSubjects\(p\.field, p\.foreignLanguage\)\.includes\(s\) \? s : null; \}\);/);
  assert.match(app, /const \[chapter, setChapter\] = useState\(\(\) => \{ const s = memory\.get\(\); return s\?\.subject === subject \? s\.chapter : null; \}\);/);
  assert.match(app, /const session = useSetSession\(list, practice, memory\);/);
  assert.match(app, /const session = useSetSession\(list, uniPractice, memory\);/);
});

test("both tracks keep their own memory, per student", () => {
  assert.match(app, /const memory = useMemo\(\(\) => practiceMemory\(safeStorage\(\), "bac", p\.userId\), \[p\.userId\]\);/);
  assert.match(app, /const memory = useMemo\(\(\) => practiceMemory\(safeStorage\(\), "uni", p\.userId\), \[p\.userId\]\);/);
  assert.match(app, /<PracticeSubject p=\{p\} subject=\{subject\} memory=\{memory\}/);
  assert.match(app, /<UniversityPracticeCourse course=\{course\} major=\{up\.major\} memory=\{memory\}/);
});

test("a set that is under way has a Continue button, in both the BAC II and the university lists", () => {
  assert.equal(count(/<ContinueButton list=\{list\} session=\{session\} doneN=\{doneN\} lang=\{lang\} \/>/g), 2);
  assert.match(app, /function ContinueButton\(\{ list, session, doneN, lang \}\)/);
  assert.match(app, /const at = firstOpen\(list, session\.isDone\);/);
});

test("the Continue label exists in English and Khmer", () => {
  assert.equal(count(/[\s,{]continueWhereLeft:/g), 2);
  assert.match(app, /continueWhereLeft: "Continue where you left off"/);
});
